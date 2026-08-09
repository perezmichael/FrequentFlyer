import os
import re
import json
import time
import hashlib
import requests
from io import BytesIO
from playwright.sync_api import sync_playwright
from supabase import create_client, Client
from google import genai
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

# 1. Setup
load_dotenv()
def _env(name):
    """
    Read an env var, tolerating quotes and stray whitespace.

    .env.local stores values quoted and python-dotenv strips those, so a value
    copied by hand into CI arrives still wrapped in quotes. That surfaced as
    supabase's opaque "Invalid URL" rather than anything naming the variable.
    """
    raw = (os.getenv(name) or "").strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        raw = raw[1:-1].strip()
    return raw


SUPABASE_URL = _env("SUPABASE_URL")
SUPABASE_SERVICE_KEY = _env("SUPABASE_SERVICE_KEY")
if not SUPABASE_URL.startswith("http"):
    raise SystemExit(
        f"SUPABASE_URL is missing or malformed (got {len(SUPABASE_URL)} chars). "
        "It should look like https://<project>.supabase.co — check the secret "
        "wasn't stored with surrounding quotes."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Load the "Soul Doc" (Manifesto)
with open('vibedoc.md', 'r') as f:
    VIBE_MANIFESTO = f.read()

# ── Auto-publish policy ──
# Events from venues with trust_tier='trusted' (see db/schema_trust_tiers.sql)
# skip manual review IF they clear the quality gate below. Everything else
# stays 'pending' for the /admin queue. Re-scrapes never touch the status of
# an event that already exists.
AUTO_PUBLISH_MIN_VIBE = float(os.getenv("FF_AUTO_PUBLISH_MIN_VIBE", "6"))

# ── Change detection ──
# Each venue page's text is hashed (salted with the scout week window, so a
# new week forces a re-scrape even if the page didn't change) and stored in
# venues.page_hash (db/schema_scout_state.sql). On a match we skip the Gemini
# call and all event processing for that venue. Set FF_FORCE_RESCRAPE=1 to
# bypass, e.g. after changing vibedoc.md or the extraction prompt.
FORCE_RESCRAPE = os.getenv("FF_FORCE_RESCRAPE", "") not in ("", "0", "false")

# Cleanup switch: rewrite flyer_url even when no image is found, clearing
# stale/bogus flyers (e.g. those left by the removed image-search fallback).
REFRESH_FLYERS = os.getenv("FF_REFRESH_FLYERS", "") not in ("", "0", "false")


def normalize_event_name(name):
    """
    Collapse a title to a comparable core so listing variants of the SAME event
    match: venue section prefixes ("IN THE CAFE:"), smart vs straight quotes,
    punctuation and spacing all fall away.
    """
    import re
    s = (name or '').lower()
    # Venue section prefixes: "IN THE CAFE:", "in the lounge -", "MAIN ROOM:"
    s = re.sub(r'^\s*(in the\s+)?[a-z][a-z ]{1,18}\s*[:\-–—]\s+', '', s)
    s = re.sub(r'[^a-z0-9]+', '', s)
    return s


# Words that carry no identity on their own — two events sharing only these
# are not the same event ("DJ Night" vs "DJ Night 2", "Bolero Night" vs "Jazz
# Night"). Tokens of 1-2 chars are dropped before this is consulted.
GENERIC_TITLE_WORDS = {
    'night', 'nights', 'party', 'show', 'shows', 'showcase', 'live', 'music',
    'event', 'events', 'presents', 'presented', 'featuring', 'feat', 'free',
    'los', 'angeles', 'and', 'the', 'with', 'set', 'sets', 'day', 'weekend',
}


def same_event_name(a, b):
    """
    True when two titles denote the same event at the same venue+date.

    Three ways to match, in order of confidence:
      1. Identical after normalization.
      2. One is a prefixed/suffixed variant of the other ("IN THE CAFE: X").
      3. Their meaningful words overlap heavily AND share something
         distinctive. This catches headliner-only variants ("Mr. Dinkles" vs
         "Mr. Dinkles, Beautiful Freaks, and Dizz Brew") and reworded titles
         ("Memoir of a Hyena Reading" vs "Sean Kennerly reads from 'Memoir of
         a Hyena'"), which containment alone missed — the short one fell under
         the length floor, and the reworded one wasn't a substring.
    """
    na, nb = normalize_event_name(a), normalize_event_name(b)
    if not na or not nb:
        return False
    if na == nb:
        return True

    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    if len(shorter) >= 12 and shorter in longer:
        return True

    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    shared = ta & tb
    # Require a distinctive shared word, so generic pairings don't collapse.
    if not (shared - GENERIC_TITLE_WORDS):
        return False
    # Measured against the shorter title: a support-act list shouldn't dilute
    # the match just by being long.
    return len(shared) / min(len(ta), len(tb)) >= 0.6


def _words(s):
    """Normalize to space-separated alphanumeric words."""
    import re
    return re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()


def _tokens(s):
    """Meaningful tokens for overlap scoring (drop 1-2 char noise)."""
    return {t for t in _words(s).split() if len(t) > 2}


def best_event_link(event_name, links):
    """
    Pick the listing-page link that points at THIS event's own page.

    Why the scoring: reaching the event's detail page is what yields a real
    per-event flyer. When we can't resolve it we fall back to the listing
    page's image, which is usually the venue's hero photo — so every event at
    that venue ends up with the same picture.

    Deliberately conservative: following the WRONG event page produces a
    confidently wrong flyer, the same failure mode as the removed image
    search. Below the threshold we return None and take the honest venue photo.
    """
    import re
    name_words = _words(event_name)
    name_tokens = _tokens(event_name)
    if not name_tokens:
        return None

    eventish = re.compile(r'/(events?|shows?|calendar|tickets?|e)/', re.I)
    best, best_score = None, 0.0

    for link in links:
        href = link.get('href') or ''
        if not href.startswith('http'):
            continue
        text_words = _words(link.get('text'))
        # Venues very often put the title in the URL slug, which is cleaner
        # than link text (no dates/prices/"buy tickets" wrapped around it).
        slug_words = _words(re.sub(r'^https?://[^/]+', '', href))

        if text_words and text_words == name_words:
            score = 1.0
        elif len(name_words) >= 12 and name_words in text_words:
            score = 0.9
        elif len(text_words) >= 12 and text_words in name_words:
            score = 0.85
        else:
            text_overlap = len(name_tokens & _tokens(text_words)) / len(name_tokens)
            slug_overlap = len(name_tokens & _tokens(slug_words)) / len(name_tokens)
            score = max(text_overlap, slug_overlap) * 0.8

        if eventish.search(href):
            score += 0.05

        if score > best_score:
            best, best_score = href, score

    return best if best_score >= 0.55 else None


def mark_venue_scouted(venue_id, page_hash):
    """Record scout state; tolerate a DB that's missing the Phase 2 columns."""
    try:
        supabase.table("venues").update({
            "page_hash": page_hash,
            "last_scouted_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", venue_id).execute()
    except Exception as e:
        print(f"   ⚠️  Could not save page hash (run db/schema_scout_state.sql?): {e}")


# Instagram paths that are the platform's own, not a venue's account.
_IG_RESERVED = {
    'p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'about',
    'developer', 'legal', 'privacy', 'directory', 'direct', 'challenge',
}


def capture_venue_instagram(venue_id, page):
    """
    Read a venue's Instagram handle off its own site and store it once.

    Only fills a blank — never overwrites, since a hand-corrected handle
    should outrank whatever link happens to sit in a footer. Silent on
    failure: a missing social link is not a scrape error.
    """
    if not venue_id:
        return
    try:
        current = supabase.table("venues").select("instagram_handle") \
            .eq("id", venue_id).single().execute().data
        if current and (current.get("instagram_handle") or "").strip():
            return

        hrefs = page.eval_on_selector_all(
            "a[href*='instagram.com']", "els => els.map(e => e.href)"
        ) or []
        for href in hrefs:
            m = re.search(r"instagram\.com/([A-Za-z0-9._]+)", href)
            if not m:
                continue
            handle = m.group(1).strip('.')
            # Skip /p/<postid> and friends, and the too-short junk that
            # trailing slashes produce.
            if handle.lower() in _IG_RESERVED or len(handle) < 3:
                continue
            supabase.table("venues").update(
                {"instagram_handle": f"@{handle}"}
            ).eq("id", venue_id).execute()
            print(f"   📷 Instagram: @{handle}")
            return
    except Exception:
        # Deliberately swallowed — this is a bonus field, not the job.
        pass


def clean_promoter(name):
    """
    Normalise a presenting org so the same one groups across events.

    Stored as a string rather than its own table on purpose: only ~4% of events
    name a presenter and the most frequent appears five times, so a table and a
    foreign key would be infrastructure ahead of the data. But the grouping
    problem is real — "Diamond Family Records Presents" and "Diamond Family
    Records" are one org — and it's the same failure that made the talent table
    unusable. Stripping the verb at write time is enough to GROUP BY on.

    Revisit the table when a promoter clears ~20 events; the strings convert.
    """
    s = re.sub(r"\s+", " ", (name or "")).strip()
    if not s:
        return ""
    # "X Presents" / "X presented by" / "X pres." → "X"
    s = re.sub(r"\s*(presents?|pres\.?|presented\s+by)\s*$", "", s, flags=re.I)
    return s.strip(" -–—:·,").strip()[:120]


def upsert_performers(performers):
    """
    Turn the prompt's performers list into talent rows. Returns ids in bill
    order (headliner first), or [] when the page named nobody.

    Returning [] is a real answer. The previous version fell back to the event
    title whenever no act was found, which filed "Trivia Night" and "Comedians
    Cinema Club" as performers and made the artist history untrustworthy.
    """
    if not isinstance(performers, list):
        return []

    ids = []
    for p in performers:
        # Tolerate a bare string if the model ignores the object shape.
        name = (p if isinstance(p, str) else (p or {}).get('name') or '').strip()
        # Guard against the old failure mode coming back as one long string.
        if not name or len(name) > 120:
            continue
        handle = '' if isinstance(p, str) else ((p or {}).get('instagram') or '').strip()
        try:
            row = supabase.table("talent").upsert(
                {"name": name, "instagram_handle": handle},
                on_conflict="name",
            ).execute().data[0]
            ids.append(row['id'])
        except Exception as e:
            print(f"      ⚠️  talent upsert failed for {name!r}: {str(e)[:70]}")
    return ids


def link_performers(event_id, talent_ids):
    """
    Attach a bill to an event. Idempotent — the scout re-reads the same page
    for weeks, so this must not accumulate duplicate rows (the unique
    constraint on (event_id, talent_id) is the backstop).
    """
    if not event_id or not talent_ids:
        return
    rows = [
        {"event_id": event_id, "talent_id": tid, "bill_order": i}
        for i, tid in enumerate(talent_ids)
    ]
    try:
        supabase.table("event_talent").upsert(
            rows, on_conflict="event_id,talent_id"
        ).execute()
    except Exception as e:
        # A missing event_talent table (migration not run yet) must not take
        # down the whole scrape — the events themselves still land.
        print(f"      ⚠️  event_talent link failed: {str(e)[:70]}")


def should_auto_publish(venue_trust, event):
    """Quality gate for skipping manual review. Returns (bool, reason)."""
    if venue_trust != 'trusted':
        return False, "venue not trusted"
    if not event.get('event_name') or not event.get('date'):
        return False, "missing name/date"
    if not event.get('category'):
        return False, "no category (vibe placeholder needs one)"
    vibe_score = event.get('vibe_score', 0) or 0
    if vibe_score < AUTO_PUBLISH_MIN_VIBE:
        return False, f"vibe {vibe_score} < {AUTO_PUBLISH_MIN_VIBE:g}"
    return True, "ok"

# ── Image helpers ──

def clean_image_url(url, page_url):
    """Normalise a relative or protocol-relative URL to absolute."""
    if not url:
        return None
    url = url.strip().strip('"').strip("'")
    if url.startswith("data:"):
        return None
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        parts = page_url.split("/")
        return f"{parts[0]}//{parts[2]}{url}"
    if not url.startswith("http"):
        # Relative path
        base = page_url.rsplit("/", 1)[0]
        return f"{base}/{url}"
    return url


def looks_like_image(data):
    """
    Sniff magic bytes. More reliable than content-type/extension (many CDNs
    serve images as octet-stream or from extensionless URLs), which lets us use
    a low size floor without letting junk through.
    """
    return (
        data[:3] == b'\xff\xd8\xff'                        # JPEG
        or data[:8] == b'\x89PNG\r\n\x1a\n'                # PNG
        or data[:6] in (b'GIF87a', b'GIF89a')              # GIF
        or (data[:4] == b'RIFF' and data[8:12] == b'WEBP')  # WEBP
    )


def upload_flyer(image_url, event_id, referer=None):
    """
    Download an image URL and upload it to Supabase storage.

    Always returns a (public_url, sha256_digest) pair — (None, None) on any
    failure. Two early returns used to hand back a bare None, and the caller
    unpacks two values, so a rejected image raised "cannot unpack non-iterable
    NoneType object" and took the whole event down with it. That accounted for
    98 of 110 errors in one backfill run.
    """
    try:
        headers = {
            "User-Agent": BOT_UA,
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        }
        # Some venue CDNs reject hotlinks without a same-origin referer.
        if referer:
            headers["Referer"] = referer

        resp = requests.get(image_url, timeout=15, headers=headers)
        if resp.status_code != 200:
            return None, None

        data = resp.content
        # 1500 bytes still excludes tracking pixels and tiny icons, but keeps
        # well-compressed real flyers. The old 5000-byte floor was silently
        # discarding legitimate artwork.
        if len(data) < 1500 or not looks_like_image(data):
            return None, None

        path = f"flyers/{event_id}.jpg"
        supabase.storage.from_("event-flyers").upload(
            path, data, {"content-type": "image/jpeg", "upsert": "true"}
        )
        # Digest of the actual bytes: lets callers spot the SAME picture reused
        # across events (a venue hero masquerading as a per-event flyer), which
        # per-event extraction can't see on its own.
        digest = hashlib.sha256(data).hexdigest()[:16]
        return supabase.storage.from_("event-flyers").get_public_url(path), digest
    except Exception as e:
        print(f"   ⚠️ Flyer upload failed: {e}")
        return None, None


def search_event_image(event_name, venue_name):
    """
    Search DuckDuckGo Images for an event flyer as a last-resort fallback.
    Returns image URL string or None.
    """
    query = f"{event_name} {venue_name} flyer"
    print(f"   🔎 Searching images for: {query}")

    try:
        # Step 1: Get the DuckDuckGo search token (vqd)
        token_resp = requests.get(
            "https://duckduckgo.com/",
            params={"q": query},
            headers={"User-Agent": BOT_UA},
            timeout=10,
        )
        # Extract vqd token from the page
        import re
        vqd_match = re.search(r'vqd=["\']([^"\']+)', token_resp.text)
        if not vqd_match:
            # Try alternate pattern
            vqd_match = re.search(r'vqd=(\d+-\d+)', token_resp.text)
        if not vqd_match:
            print(f"   ⚠️ Could not get DuckDuckGo search token")
            return None

        vqd = vqd_match.group(1)

        # Step 2: Query the image search API
        img_resp = requests.get(
            "https://duckduckgo.com/i.js",
            params={
                "l": "us-en",
                "o": "json",
                "q": query,
                "vqd": vqd,
                "f": ",,,,,",
                "p": "1",
            },
            headers={
                "User-Agent": BOT_UA,
                "Referer": "https://duckduckgo.com/",
            },
            timeout=10,
        )

        if img_resp.status_code != 200:
            return None

        results = img_resp.json().get("results", [])

        # Pick the first result with a reasonable image
        for result in results[:5]:
            img_url = result.get("image", "")
            width = result.get("width", 0)
            height = result.get("height", 0)

            # Skip tiny images and SVGs
            if not img_url or width < 200 or height < 200:
                continue
            if img_url.endswith(".svg") or "logo" in img_url.lower():
                continue

            print(f"   🔎 Found image via search")
            return img_url

    except Exception as e:
        print(f"   ⚠️ Image search failed: {e}")

    return None


def extract_best_image(page):
    """
    Try multiple strategies to find the best event image on the current page.
    Returns image URL string or None.
    """
    # Strategy 1: JSON-LD structured data (most reliable — sites like Eventbrite, DICE, etc.)
    try:
        json_ld_image = page.evaluate("""() => {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const data = JSON.parse(script.textContent);
                    // Handle arrays of schemas
                    const items = Array.isArray(data) ? data : [data];
                    for (const item of items) {
                        if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent') {
                            const img = item.image;
                            if (typeof img === 'string') return img;
                            if (Array.isArray(img) && img.length) return typeof img[0] === 'string' ? img[0] : img[0].url;
                            if (img && img.url) return img.url;
                        }
                    }
                } catch(e) {}
            }
            return null;
        }""")
        if json_ld_image:
            print(f"   🖼️  Found JSON-LD image")
            return clean_image_url(json_ld_image, page.url)
    except:
        pass

    # Strategy 2: og:image / twitter:image meta tags
    try:
        og_image = page.evaluate("""() => {
            const selectors = [
                'meta[property="og:image"]',
                'meta[property="og:image:secure_url"]',
                'meta[name="twitter:image"]',
                'meta[name="twitter:image:src"]',
            ];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) {
                    const content = el.getAttribute('content');
                    if (content && (content.startsWith('http') || content.startsWith('/'))) return content;
                }
            }
            return null;
        }""")
        if og_image:
            print(f"   🖼️  Found og:image")
            return clean_image_url(og_image, page.url)
    except:
        pass

    # Strategy 3: <picture> / srcset — get highest resolution source
    try:
        picture_image = page.evaluate("""() => {
            // Check <picture> elements first
            const pictures = document.querySelectorAll('picture source, img[srcset]');
            let best = null, bestW = 0;
            for (const el of pictures) {
                const srcset = el.getAttribute('srcset') || '';
                const parts = srcset.split(',');
                for (const part of parts) {
                    const [url, descriptor] = part.trim().split(/\\s+/);
                    const w = parseInt(descriptor) || 0;
                    if (w > bestW && w >= 400) { bestW = w; best = url; }
                }
            }
            return best;
        }""")
        if picture_image:
            print(f"   🖼️  Found srcset image ({picture_image[:60]}...)")
            return clean_image_url(picture_image, page.url)
    except:
        pass

    # Strategy 4: CSS background-images on large elements
    try:
        bg_image = page.evaluate("""() => {
            const nodes = document.querySelectorAll('div, section, a, span, figure');
            for (const node of nodes) {
                const style = window.getComputedStyle(node);
                const bg = style.backgroundImage;
                if (bg && bg !== 'none' && bg.startsWith('url(')) {
                    const rect = node.getBoundingClientRect();
                    if (rect.width > 250 && rect.height > 150) {
                        // Extract URL from url("...") or url('...')
                        return bg.replace(/^url\\(['"]?/, '').replace(/['"]?\\)$/, '');
                    }
                }
            }
            return null;
        }""")
        if bg_image:
            print(f"   🖼️  Found background-image")
            return clean_image_url(bg_image, page.url)
    except:
        pass

    # Strategy 5: Common event-page image selectors
    selectors = [
        ".eventlist-column-thumbnail img",  # Squarespace
        ".dice_event-image img",            # DICE
        ".event-image img",
        ".event-hero img",
        ".show-image img",
        "article img",
        ".post-thumbnail img",
        "img[src*='event']",
        "img[src*='flyer']",
        "img[src*='poster']",
        "img[data-src]",                    # Lazy-loaded
        "img[src*='upload']",
        "img[src*='images']",
    ]
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el:
                url = el.get_attribute("data-src") or el.get_attribute("srcset") or el.get_attribute("src")
                if url:
                    # If srcset, take the first entry
                    if " " in url and "," in url:
                        url = url.split(",")[0].strip().split(" ")[0]
                    cleaned = clean_image_url(url, page.url)
                    if cleaned:
                        print(f"   🖼️  Found image via selector: {sel}")
                        return cleaned
        except:
            continue

    # Strategy 6: Largest visible image on the page
    try:
        largest = page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            let best = null, bestArea = 0;
            for (const img of imgs) {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                const area = w * h;
                const src = img.src || img.dataset.src || '';
                // Skip tiny images, SVGs, tracking pixels, icons
                if (area > bestArea && w > 200 && h > 150
                    && !src.includes('logo') && !src.includes('icon')
                    && !src.includes('avatar') && !src.includes('favicon')
                    && !src.endsWith('.svg') && !src.startsWith('data:')) {
                    bestArea = area;
                    best = src;
                }
            }
            return best;
        }""")
        if largest:
            print(f"   🖼️  Found largest image fallback")
            return clean_image_url(largest, page.url)
    except:
        pass

    return None


# ---------------------------------------------------------------------------
# Being a good guest
#
# The scout reads public listings and links back, but it was announcing itself
# as an anonymous Chrome install. If the plan is to walk into a venue and say
# "we send you traffic", the bot should be recognisable in their logs as us,
# with a URL that explains what it is and how to be removed.
# ---------------------------------------------------------------------------
BOT_UA = (
    "FrequentFlyerBot/1.0 (+https://frequentflyerla.com/agents; "
    "LA events listings; contact via the site)"
)

# Playwright still needs a browser engine string — venue sites break without
# one — so identify ourselves on the end of a real UA rather than replacing it.
BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 " + BOT_UA
)

_robots_cache = {}


def robots_allows(url):
    """
    True when a venue's robots.txt permits fetching this URL.

    Cached per host, and fails OPEN: an unreachable or malformed robots.txt
    shouldn't silently empty the calendar. A venue that wants us gone can say
    so and be believed on the next run.
    """
    from urllib.parse import urlparse
    from urllib.robotparser import RobotFileParser

    try:
        parts = urlparse(url)
        if not parts.scheme.startswith("http"):
            return True
        host = f"{parts.scheme}://{parts.netloc}"
    except Exception:
        return True

    if host not in _robots_cache:
        parser = RobotFileParser()
        parser.set_url(f"{host}/robots.txt")
        try:
            # Fetch with OUR user agent, not RobotFileParser.read()'s default.
            #
            # read() uses urllib's "Python-urllib/x.y", which plenty of sites
            # behind bot protection answer with 403 — and RobotFileParser reads
            # a 403 on robots.txt as disallow_all, per the RFC. The result was
            # the scout skipping venues whose robots.txt actually permits it,
            # having never managed to read the file. thebellwetherla.com and
            # programmehq.com both allow us and both were being skipped.
            #
            # A 403 to THIS request is different and still respected: a site
            # that refuses an identified, contactable crawler is saying
            # something, and it gets believed.
            resp = requests.get(
                f"{host}/robots.txt",
                headers={"User-Agent": BOT_UA},
                timeout=10,
                allow_redirects=True,
            )
            if resp.status_code in (401, 403):
                parser.disallow_all = True
            elif resp.status_code >= 400:
                # No robots.txt at all — the default is permission.
                parser.allow_all = True
            else:
                parser.parse(resp.text.splitlines())
            _robots_cache[host] = parser
        except Exception:
            _robots_cache[host] = None  # unreachable — treat as permissive

    parser = _robots_cache[host]
    if parser is None:
        return True
    try:
        return parser.can_fetch(BOT_UA, url)
    except Exception:
        return True


def clean_time(value):
    """
    Normalise a model-supplied time to "HH:MM:SS", or None.

    Gemini returns "8:30 PM", "20:30", "8PM", "" and occasionally prose. A bad
    time is worse than none — it sends someone to a door at the wrong hour — so
    anything that doesn't parse cleanly is dropped rather than salvaged.
    """
    if not value:
        return None
    text = str(value).strip().lower().replace(".", "")
    if not text or text in ("hh:mm", "tbd", "n/a", "none"):
        return None

    m = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$", text)
    if not m:
        return None
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    meridiem = m.group(3)

    if meridiem:
        if hour < 1 or hour > 12:
            return None
        if meridiem == "pm" and hour != 12:
            hour += 12
        if meridiem == "am" and hour == 12:
            hour = 0
    elif hour > 23:
        return None

    if minute > 59:
        return None
    return f"{hour:02d}:{minute:02d}:00"


def distill_event_text(raw_text, limit=30000):
    """
    Shrink scraped body text to the portion most likely to contain event
    listings. Venues like The Elysian dump a huge nav/footer that pushes real
    event content past the Gemini input window when we naively slice [:15000].

    Strategy:
      1. Split into lines.
      2. Score each line by how "event-like" it looks (contains dates, times,
         prices, or event keywords).
      3. Find the densest scoring region and return that region + surrounding
         context, up to `limit` chars.
      4. If nothing scores, fall back to raw_text[:limit].
    """
    import re

    if not raw_text:
        return ""

    if len(raw_text) <= limit:
        return raw_text

    lines = raw_text.split("\n")

    # Regex patterns that strongly suggest an event listing line
    date_re = re.compile(
        r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|"
        r"january|february|march|april|june|july|august|september|"
        r"october|november|december|mon|tue|wed|thu|fri|sat|sun|"
        r"monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|"
        r"\b\d{1,2}/\d{1,2}(/\d{2,4})?\b|"
        r"\b\d{4}-\d{2}-\d{2}\b",
        re.IGNORECASE,
    )
    time_re = re.compile(r"\b\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)\b|\bdoors\b", re.IGNORECASE)
    price_re = re.compile(r"\$\d+|free\b|tickets?\b|rsvp\b", re.IGNORECASE)

    # Score each line
    scores = []
    for line in lines:
        s = 0
        if date_re.search(line):
            s += 3
        if time_re.search(line):
            s += 2
        if price_re.search(line):
            s += 1
        scores.append(s)

    # If total score is very low, just truncate normally
    total = sum(scores)
    if total < 10:
        return raw_text[:limit]

    # Find the highest-density window of lines. Use a simple cumulative
    # approach: pick the line with the highest score and expand outward
    # until we hit the char limit.
    best_idx = max(range(len(scores)), key=lambda i: scores[i])

    out_lines = [lines[best_idx]]
    out_len = len(lines[best_idx])
    left, right = best_idx - 1, best_idx + 1

    # Expand both directions, preferring the side with higher next-line score
    while out_len < limit and (left >= 0 or right < len(lines)):
        left_score = scores[left] if left >= 0 else -1
        right_score = scores[right] if right < len(lines) else -1

        if right_score >= left_score and right < len(lines):
            line = lines[right]
            if out_len + len(line) + 1 > limit:
                break
            out_lines.append(line)
            out_len += len(line) + 1
            right += 1
        elif left >= 0:
            line = lines[left]
            if out_len + len(line) + 1 > limit:
                break
            out_lines.insert(0, line)
            out_len += len(line) + 1
            left -= 1
        else:
            break

    return "\n".join(out_lines)


def extract_event_links(page, base_url):
    """
    Extract all event detail page links from a venue listing page.
    Returns a list of {text, href} dicts.
    """
    try:
        links = page.evaluate("""(baseUrl) => {
            const anchors = document.querySelectorAll('a[href]');
            const results = [];
            const seen = new Set();
            for (const a of anchors) {
                const href = a.href;
                const text = (a.textContent || '').trim().substring(0, 200);
                // Skip nav links, social media, external sites (except ticketing)
                if (!href || seen.has(href)) continue;
                if (href.includes('#') && !href.includes('/')) continue;
                if (href.includes('facebook.com') || href.includes('twitter.com')
                    || href.includes('instagram.com') || href.includes('mailto:')) continue;
                // Keep links that look like event detail pages
                const path = href.replace(baseUrl, '');
                if (path.includes('event') || path.includes('show') || path.includes('ticket')
                    || path.includes('calendar') || path.includes('/e/')
                    || (text.length > 5 && text.length < 200)) {
                    seen.add(href);
                    results.push({text: text.substring(0, 100), href: href});
                }
            }
            return results.slice(0, 200);  // Busy calendars push real event links past a small cap
        }""", base_url)
        return links or []
    except:
        return []

def run_master_scout():
    with open('venues.json') as f:
        venues = json.load(f)

    # Did this run actually do anything? Every Gemini failure is caught per
    # venue so one bad page can't kill the pass — which also means a run where
    # EVERY call fails still exits 0 and shows green. That happened: a quoted
    # API key in the GitHub secret meant three days of "successful" runs that
    # scraped nothing, and nobody noticed because the checkmark said fine.
    gemini_ok = 0
    gemini_failed = 0

    # FF_ONLY_VENUE=<substring> narrows a run to one venue — for testing a
    # prompt change without a 40-venue, 20-minute pass.
    only = os.getenv("FF_ONLY_VENUE", "").strip().lower()
    if only:
        venues = [v for v in venues if only in v["name"].lower()]
        print(f"FF_ONLY_VENUE={only!r} → {len(venues)} venue(s)")

    now = datetime.now()
    today = now.strftime("%A, %B %d, %Y")
    # Scout window: today through +N days (default 30). Wider than one week so a
    # cold open of the app shows a full upcoming picture; the UI caps how far
    # ahead it actually lists.
    SCOUT_WINDOW_DAYS = int(os.getenv("FF_SCOUT_WINDOW_DAYS", "30"))
    week_start = now
    week_end = now + timedelta(days=SCOUT_WINDOW_DAYS)
    week_start_str = week_start.strftime("%Y-%m-%d")
    week_end_str = week_end.strftime("%Y-%m-%d")
    # Stable weekly salt for the page-hash (ISO year-week) so change detection
    # skips unchanged pages within a week instead of refiring every day as the
    # rolling window shifts.
    week_key = now.strftime("%G-W%V")
    print(f"🚀 MASTER SCOUT START (Today is {today}, scouting {week_start_str} to {week_end_str})")

    with sync_playwright() as p:
        # Launch a "Headless" browser (no window pops up)
        # STEALTH MODE: Add args to hide the fact that we are a bot
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )

        for v in venues:
            # Some entries exist only to carry coordinates (venues with no
            # working events page — see venues.json). Skip them instead of
            # attempting goto(None) on every run.
            if not v.get('url'):
                print(f"\n⏭️  {v['name']}: no events URL, coords-only entry — skipping scrape.")
                continue

            # Ask before entering. A venue that disallows crawling gets
            # skipped rather than scraped politely-but-anyway.
            if not robots_allows(v['url']):
                print(f"\n🚫 {v['name']}: robots.txt disallows this path — skipping.")
                continue

            print(f"\n🛰️  SCOUTING: {v['name']} ({v['neighborhood']})...")

            # Fresh browser context per venue — prevents one venue's navigation
            # crash from poisoning subsequent venues
            context = browser.new_context(
                user_agent=BROWSER_UA,
                viewport={"width": 1280, "height": 800},
                locale="en-US",
                timezone_id="America/Los_Angeles"
            )
            page = context.new_page()

            try:
                # 1. Go to URL
                page.goto(v['url'], wait_until="domcontentloaded", timeout=60000)

                # 1.5. SCROLL to trigger lazy-loading widgets (Critical for DICE/Gold-Diggers)
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
                page.evaluate("window.scrollTo(0, 500)")

                # 2. Wait for common event markers — expanded set covering more SPAs
                try:
                    page.wait_for_selector(
                        ".dice-event, .dice_event-title, .event-list, #events, .event-card, "
                        ".cl-view-month, .event, .show, .show-list, [class*='Event'], "
                        "[class*='event-'], [data-testid*='event'], article",
                        timeout=12000
                    )
                except:
                    # If no event markers appear, wait longer — some JS-heavy calendars
                    # (like The Echo) take a while to render
                    print(f"⚠️  Timeout waiting for selector on {v['name']}, giving extra time...")
                    time.sleep(8)
                    # One more scroll to trigger any remaining lazy content
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    time.sleep(2)

                # 3. Grab the visible text
                raw_text = page.inner_text("body")
                print(f"   📄 Extracted {len(raw_text)} chars of text.")

                # If text is suspiciously short, the page didn't render — try a networkidle wait
                if len(raw_text) < 500:
                    print(f"   ⚠️  Page text is short, waiting for networkidle...")
                    try:
                        page.wait_for_load_state("networkidle", timeout=10000)
                        time.sleep(2)
                        raw_text = page.inner_text("body")
                        print(f"   📄 After networkidle: {len(raw_text)} chars.")
                    except:
                        pass
            except Exception as e:
                print(f"⚠️  Browse failed for {v['name']}: {e}")
                try:
                    context.close()
                except:
                    pass
                continue

            # Guard: if the page had almost no content, don't bother calling Gemini.
            # This prevents crashes like the Treehouse case (1 char of text).
            if len(raw_text.strip()) < 100:
                print(f"   ⏭️  Skipping {v['name']} — only {len(raw_text.strip())} chars of usable text.")
                try:
                    context.close()
                except:
                    pass
                continue

            # Venue row up-front: we need its stored page_hash (change
            # detection) and trust_tier (auto-publish) before spending a
            # Gemini call. trust_tier is intentionally NOT in this payload —
            # the tier lives in the DB (set via db/schema_trust_tiers.sql or
            # the dashboard) and must survive re-scrapes.
            venue_payload = {
                "name": v['name'], "neighborhood": v['neighborhood'], "url": v['url']
            }
            # Carry coordinates through from venues.json. Without this the DB
            # kept lat/lng NULL for venues the scout created, and the frontend
            # fell back to a downtown default — every such venue's events piled
            # onto one DTLA pin. Only send real values; never invent them.
            if v.get('lat') is not None and v.get('lng') is not None:
                venue_payload["lat"] = v['lat']
                venue_payload["lng"] = v['lng']

            venue_row = supabase.table("venues").upsert(
                venue_payload, on_conflict="name"
            ).execute().data[0]
            venue_id = venue_row['id']
            venue_trust = venue_row.get('trust_tier', 'standard')

            # Venue Instagram handle, from links already on the page — an href,
            # not a judgment, so no Gemini call. Runs before the page-hash skip
            # below on purpose: an unchanged page still has the handle, and
            # every venue in the DB was missing one.
            capture_venue_instagram(venue_id, page)

            page_hash = hashlib.sha256(
                f"{week_key}:{raw_text}".encode("utf-8", "replace")
            ).hexdigest()
            if not FORCE_RESCRAPE and venue_row.get('page_hash') == page_hash:
                print(f"   💤 Unchanged since last scout — skipping Gemini for {v['name']}.")
                mark_venue_scouted(venue_id, page_hash)
                try:
                    context.close()
                except:
                    pass
                continue

            # Grab event links from the listing page BEFORE we extract text
            # These let us visit individual event pages for better images
            event_links = extract_event_links(page, v['url'])
            print(f"   🔗 Found {len(event_links)} event links on listing page.")

            # Also extract the listing page's HTML for image hints
            listing_page_url = page.url

            # THINK (Using your vibedoc.md as the System Prompt)
            print(f"🧠  CURATING: Comparing against FF Manifesto...")

            # Distill raw_text to the event-dense portion. For pages like The
            # Elysian (58k chars of nav/footer boilerplate), a naive [:15000]
            # slice misses the actual event listings. distill_event_text
            # locates the region with the most date/time/price signals.
            distilled = distill_event_text(raw_text, limit=30000)
            if distilled != raw_text:
                print(f"   ✂️  Distilled {len(raw_text)} → {len(distilled)} chars")

            prompt = f"""
            {VIBE_MANIFESTO}

            TASK: Extract EVERY event from the provided text that falls between {week_start_str} and {week_end_str} (inclusive).
            CURRENT DATE: {today}
            VENUE: {v['name']}

            RULES:
            1. Use YYYY-MM-DD. ONLY include events from {week_start_str} to {week_end_str}. Ignore others.
            2. Split multi-day events into separate entries.
            3. SCORING: Use the Aesthetic Pillars in the Manifesto above to score 1-10.
            4. If you can identify a link to the event's detail page from the text, include it as "event_url".
            5. "description" is what the PUBLIC sees, so write it like a listing, not like analysis:
               - 1-2 short sentences describing what actually happens at the event
                 (who's playing, what's on offer, the format).
               - Use ONLY facts present in the TEXT below. Condense the venue's own
                 words; do not invent details.
               - NEVER mention the Manifesto, aesthetic pillars, vibes, scoring, or
                 how well it fits anything. No phrases like "aligns with", "fits the
                 pillar", "this event embodies".
               - If the text says nothing about what the event is, return "".
            6. "vibe_justification" is the opposite: it is INTERNAL only. Put your
               scoring rationale there, never in "description".
            7. "start_time" / "end_time" are 24-hour "HH:MM", copied from the TEXT.
               - Prefer the SHOW/set time over the DOORS time. If the text gives
                 only doors, use it and say "Doors 7:30" in the description.
               - Times after midnight belong to the night that started the
                 evening before: "10PM-2AM" is start 22:00, end 02:00.
               - ONLY state a time the text actually gives. Do NOT guess from
                 the venue's opening hours. If the text doesn't say, return "".
            8. "price" is what it costs to get in, copied from the TEXT — e.g.
               "$15", "$20-25", "Free", "Free with RSVP", "Sliding scale".
               - ONLY state a price the text actually gives. Do NOT guess, and
                 do NOT assume free just because no price is listed: most of
                 these events ticket at the door or through DICE.
               - If the text doesn't say, return "" and the app will stay quiet
                 about it rather than claim it's free.

            9. "performers" is a LIST, one entry per act on the bill, in the
               order the page bills them (headliner first). A night with four
               comedians is four entries — not one string with commas in it.
               - Copy the act's name only. Not the show title, not the series.
                 "ROOMIES with Dylan Adler, Sam Morrison & Kylie Vincent" is
                 three performers; "ROOMIES" is the show, not a person.
               - "instagram" only if the page actually prints a handle.
               - If the page names no act at all, return an EMPTY LIST. Do not
                 fall back to the event title: a show called "Trivia Night" has
                 no performer, and inventing one poisons the artist history.

            10. "promoter" is the collective, label or night presenting the
                show, when the page names one — "Diamond Family Records
                Presents", "Lauretta Records Presents". This is NOT the venue
                and NOT the act. Return "" if the page doesn't say.

            11. "age_restriction" copied as printed: "21+", "18+", "All Ages".
                Return "" if the page doesn't state it. Never infer it from the
                venue being a bar.

            RETURN ONLY A JSON LIST:
            [
              {{
                "event_name": "", "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM",
                "performers": [{{"name": "", "instagram": "@handle"}}],
                "promoter": "", "age_restriction": "",
                "category": "", "vibe_score": 0,
                "vibe_justification": "", "description": "", "price": "", "event_url": ""
              }}
            ]

            TEXT: {distilled}
            """

            try:
                response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                cleaned = response.text.replace('```json', '').replace('```', '').strip()
                if not cleaned:
                    print(f"   ⚠️  Empty response from Gemini for {v['name']}")
                    try:
                        context.close()
                    except:
                        pass
                    continue
                events = json.loads(cleaned)
                gemini_ok += 1
                print(f"   🔮 Gemini found {len(events)} events.")
            except Exception as e:
                gemini_failed += 1
                print(f"❌ Gemini Error for {v['name']}: {e}")
                try:
                    context.close()
                except:
                    pass
                continue

            # ACT (Supabase)
            # Track image URLs seen for this venue to detect generic/shared images
            # (if an image appears for 2+ events, it's probably a venue logo, not an event flyer)
            venue_image_counts = {}
            db_errors = 0

            for event in events:
                try:
                    # A blank title used to still get written as a pending row.
                    # The Smell and Gold-Diggers produced 8 of them — untitled
                    # cards nobody could review or publish. Nothing downstream
                    # can rescue an event with no name, so drop it here.
                    if not (event.get('event_name') or '').strip():
                        print(f"   ⏭️  Skipping an event with no title at {v['name']}.")
                        continue

                    # One row per act, in bill order. This used to be a single
                    # talent_name, and when a page listed four comedians Gemini
                    # returned them comma-joined into one string — 497 of ~1000
                    # talent rows look like that, which makes "who played most
                    # often" unanswerable. It also used to fall back to the
                    # EVENT TITLE when no act was named, filing "Trivia Night"
                    # as a performer.
                    talent_ids = upsert_performers(event.get('performers'))

                    # Select-then-insert instead of a blind upsert: the old
                    # upsert wrote status='pending' on every run, which reset
                    # manually-approved events back to the review queue each
                    # time a venue was re-scraped.
                    event_payload = {
                        "event_name": event['event_name'],
                        "event_date": event['date'],
                        "event_vibe": event['category'],
                        # Times as printed by the venue (rule 7). None when the
                        # page didn't say — the UI shows the date alone rather
                        # than inventing an hour.
                        "start_time": clean_time(event.get('start_time')),
                        "end_time": clean_time(event.get('end_time')),
                        "venue_id": venue_id,
                        # Kept pointing at the headliner so anything still
                        # reading the single FK keeps working; event_talent is
                        # the real record of who's on the bill.
                        "talent_id": talent_ids[0] if talent_ids else None,
                        "metadata": {
                            "vibe_score": event.get('vibe_score', 0),
                            # Internal scoring rationale — never shown to users.
                            "justification": event.get('vibe_justification', ''),
                            # Public-facing listing copy (see prompt rule 5).
                            "description": (event.get('description') or '').strip(),
                            # Door price as printed by the venue (rule 7).
                            # Empty means unknown — the UI stays silent rather
                            # than claiming free, which it used to do for every
                            # event including $26 ticketed shows.
                            "price": (event.get('price') or '').strip(),
                            # Who's presenting — a label or collective, not the
                            # venue. Promoters move between rooms, so they're
                            # the entity that actually maps a scene.
                            "promoter": clean_promoter(event.get('promoter')),
                            # "21+" / "All Ages" as printed. Blank means the
                            # page didn't say; never inferred from the venue.
                            "age_restriction": (event.get('age_restriction') or '').strip(),
                        }
                    }

                    # Match on a NORMALIZED name, not an exact one. The same
                    # event gets listed under title variants across runs
                    # ("IN THE CAFE: Sean Kennerly reads…" vs "Sean Kennerly
                    # reads…", curly vs straight quotes), and exact matching
                    # inserted each variant as a separate row — duplicate cards
                    # in the feed.
                    same_slot = supabase.table("events").select("id, status, event_name, metadata") \
                        .eq("event_date", event['date']) \
                        .eq("venue_id", venue_id).execute().data
                    existing = [r for r in same_slot
                                if same_event_name(r.get('event_name'), event['event_name'])]

                    prior_meta = (existing[0].get('metadata') or {}) if existing else {}
                    locked = prior_meta.get('editor_locked') or []

                    if existing:
                        is_new = False
                        event_id = existing[0]['id']
                        # Refresh scraped fields; leave status/curation alone.
                        # An editor's correction outranks the venue's page.
                        # Without this, a title or time fixed by hand is
                        # replaced by the next run and the admin editor
                        # becomes a treadmill.
                        payload = {k: v for k, v in event_payload.items() if k not in locked}
                        if 'metadata' in payload and locked:
                            # Don't let a refreshed metadata blob drop the lock
                            # list or the stored originals.
                            prior = existing[0].get('metadata') or {}
                            payload['metadata'] = {
                                **payload['metadata'],
                                'editor_locked': locked,
                                **({'scraped_values': prior['scraped_values']}
                                   if 'scraped_values' in prior else {}),
                            }
                            for key in locked:
                                if key in ('description', 'price'):
                                    payload['metadata'][key] = prior.get(key, payload['metadata'].get(key))
                        if locked:
                            print(f"   🔒 Keeping editor values for: {', '.join(locked)}")
                        supabase.table("events").update(payload).eq("id", event_id).execute()
                    else:
                        is_new = True
                        event_payload["status"] = "pending"
                        event_payload["curation_level"] = "scraped"
                        event_id = supabase.table("events").insert(event_payload).execute().data[0]['id']

                    # Attach the bill on both paths — a refreshed event may have
                    # gained support acts since the last scrape.
                    link_performers(event_id, talent_ids)

                    flyer_url = None
                    raw_img_url = None  # Track the source URL to detect duplicates

                    # ── Image extraction: try event-specific page first ──

                    # Find the best matching event link from the listing page
                    # Gemini's event_url is a guess, not a fact — on venues with
                    # a dominant recurring show it hands back that show's URL
                    # for every event (The Elysian: 10 different events all
                    # pointed at /shows/superbloom, so all 10 displayed the
                    # Superbloom poster). Only accept it if the URL actually
                    # looks like this event; otherwise score the real links.
                    event_detail_url = event.get('event_url', '')
                    if event_detail_url and event_detail_url.startswith('http'):
                        if not best_event_link(event['event_name'], [{'text': '', 'href': event_detail_url}]):
                            event_detail_url = ''
                    if not event_detail_url or not event_detail_url.startswith('http'):
                        # Score every listing link on normalized title + URL slug
                        # instead of the old raw substring test, which missed
                        # whenever punctuation/dates differed and could latch
                        # onto the wrong link on a short match.
                        event_detail_url = best_event_link(event['event_name'], event_links) or ''

                    # Navigate to event detail page if we have a URL
                    if event_detail_url and event_detail_url.startswith("http"):
                        try:
                            print(f"   🔍 Visiting event page: {event_detail_url[:80]}...")
                            page.goto(event_detail_url, wait_until="domcontentloaded", timeout=15000)
                            time.sleep(1)
                            page.evaluate("window.scrollTo(0, 300)")
                            time.sleep(0.5)

                            raw_img_url = extract_best_image(page)

                            # Navigate back to listing page for next event
                            page.goto(listing_page_url, wait_until="domcontentloaded", timeout=15000)
                            time.sleep(1)
                        except Exception as nav_err:
                            print(f"   ⚠️ Event page navigation failed: {nav_err}")
                            try:
                                page.goto(listing_page_url, wait_until="domcontentloaded", timeout=15000)
                            except:
                                pass

                    # Fallback: try the listing page itself
                    if not raw_img_url:
                        raw_img_url = extract_best_image(page)

                    # An image repeated across events at one venue is a venue
                    # logo / hero, not this event's flyer. Track it but still
                    # use it — a real venue photo beats no image, and the UI
                    # falls back to a branded flyer anyway.
                    is_generic = False
                    if raw_img_url:
                        venue_image_counts[raw_img_url] = venue_image_counts.get(raw_img_url, 0) + 1
                        if venue_image_counts[raw_img_url] >= 2:
                            is_generic = True

                    # NOTE: there used to be a DuckDuckGo image-search fallback
                    # here ("{event_name} {venue_name} flyer"). It was actively
                    # harmful: "Stanya Kahn Survey of Films" at "Human
                    # Resources" matched corporate "Human Resources Survey"
                    # stock art, and "CINEMA LAND" got a generic film-club
                    # template. A wrong flyer misinforms and reads as careless,
                    # and we now render an on-brand typographic placeholder when
                    # there's no image — so no image is strictly better than a
                    # guessed one. Only use images found ON the venue/event page.
                    if raw_img_url:
                        flyer_url, flyer_digest = upload_flyer(raw_img_url, event_id, referer=page.url)
                        image_source = 'venue_shared' if is_generic else 'event_page'
                    else:
                        flyer_digest = None
                        image_source = None

                    # ── Final update: flyer + event link + auto-publish decision ──
                    final_update = {}
                    if 'flyer_url' in locked:
                        # An editor replaced this image by hand. The scout picks
                        # the best thing it can find on a page; a human picked
                        # the right thing. Never overwrite that.
                        print("   🔒 Keeping the editor's flyer")
                    elif flyer_url:
                        final_update["flyer_url"] = flyer_url
                    elif REFRESH_FLYERS and 'flyer_url' not in locked:
                        # Cleanup mode: actively clear a stored flyer when this
                        # run can't find a legitimate one, so images left behind
                        # by the old image-search fallback get purged and the
                        # branded placeholder takes over. Off by default — a
                        # transient scrape failure shouldn't wipe good flyers.
                        final_update["flyer_url"] = None

                    # Record where the image came from, so bogus flyers are
                    # traceable next time instead of being indistinguishable.
                    event_payload["metadata"]["image_source"] = image_source
                    if flyer_digest:
                        event_payload["metadata"]["image_hash"] = flyer_digest
                    final_meta = {**event_payload["metadata"]}
                    if locked:
                        final_meta['editor_locked'] = locked
                        if 'scraped_values' in prior_meta:
                            final_meta['scraped_values'] = prior_meta['scraped_values']
                        # Locked metadata keys keep the editor's value.
                        for key in locked:
                            if key in prior_meta:
                                final_meta[key] = prior_meta[key]
                    final_update["metadata"] = final_meta
                    if event_detail_url and event_detail_url.startswith("http"):
                        # The resolved per-event page (Gemini's event_url or the
                        # fuzzy-matched listing link) — shown as "link to the
                        # event" in the app and used as a dedup aid.
                        final_update["source_url"] = event_detail_url

                    vibe_score = event.get('vibe_score', 0)
                    flyer_note = "+ Flyer" if flyer_url else "(No Flyer)"
                    if is_new:
                        publish, reason = should_auto_publish(venue_trust, event)
                        if publish:
                            final_update.update({
                                "status": "approved",
                                "auto_published": True,
                                "published_at": datetime.now(timezone.utc).isoformat(),
                            })
                            print(f"   🚀 AUTO-PUBLISHED {flyer_note}: {event['event_name']} ({vibe_score}/10)")
                        else:
                            print(f"   📥 Queued for review [{reason}] {flyer_note}: {event['event_name']} ({vibe_score}/10)")
                    else:
                        print(f"   ✅ Refreshed {flyer_note}: {event['event_name']} ({vibe_score}/10) — status untouched")

                    if final_update:
                        supabase.table("events").update(final_update).eq("id", event_id).execute()
                except Exception as e:
                    print(f"   ⚠️  DB ERROR for {event['event_name']}: {e}")
                    db_errors += 1
                    continue

            # Save the page hash only after a clean run — if any event write
            # failed, leave the old hash so the next run retries this venue.
            if db_errors == 0:
                mark_venue_scouted(venue_id, page_hash)
            else:
                print(f"   ⚠️  {db_errors} DB error(s) — not saving page hash, venue will retry next run.")

            # Close this venue's context to release resources
            try:
                context.close()
            except:
                pass

            # Cooldown to avoid API rate limits
            print("⏳ Cooldown: Waiting 10 seconds to respect API limits...")
            time.sleep(10)

        browser.close()

    # Always summarise, so a glance at the log answers "did this do anything?"
    print(f"\n📊 Gemini: {gemini_ok} ok, {gemini_failed} failed")

    # A green checkmark should mean the scout worked. One flaky page is normal
    # and stays green; every single call failing is a systemic problem — a bad
    # key, a quota, a retired model — and the run must go red so it gets seen.
    # Deliberately not a percentage threshold: partial failure is ordinary for
    # a scraper reading 40 sites it doesn't control.
    if gemini_failed > 0 and gemini_ok == 0:
        raise SystemExit(
            f"every Gemini call failed ({gemini_failed}/{gemini_failed}) — "
            "the run scraped nothing. Check GEMINI_API_KEY in Actions secrets "
            "(./scripts/copy-secret.sh GEMINI_API_KEY --push)."
        )

if __name__ == "__main__":
    run_master_scout()