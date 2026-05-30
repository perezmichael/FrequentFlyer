import os
import json
import time
import requests
from io import BytesIO
from playwright.sync_api import sync_playwright
from supabase import create_client, Client
from google import genai
from dotenv import load_dotenv
from datetime import datetime, timedelta

# 1. Setup
load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Load the "Soul Doc" (Manifesto)
with open('vibedoc.md', 'r') as f:
    VIBE_MANIFESTO = f.read()

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


def upload_flyer(image_url, event_id):
    """Download an image URL and upload to Supabase storage. Returns public URL or None."""
    try:
        resp = requests.get(image_url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        })
        if resp.status_code != 200 or len(resp.content) < 5000:
            # Too small = likely a tracking pixel or icon
            return None

        content_type = resp.headers.get("content-type", "")
        if "image" not in content_type and not image_url.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            return None

        path = f"flyers/{event_id}.jpg"
        supabase.storage.from_("event-flyers").upload(
            path, resp.content, {"content-type": "image/jpeg", "upsert": "true"}
        )
        return supabase.storage.from_("event-flyers").get_public_url(path)
    except Exception as e:
        print(f"   ⚠️ Flyer upload failed: {e}")
        return None


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
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
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
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
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
            return results.slice(0, 50);  // Cap at 50 links
        }""", base_url)
        return links or []
    except:
        return []

def run_master_scout():
    with open('venues.json') as f:
        venues = json.load(f)

    now = datetime.now()
    today = now.strftime("%A, %B %d, %Y")
    # Compute the current week window: Monday to Sunday
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=6)
    week_start_str = week_start.strftime("%Y-%m-%d")
    week_end_str = week_end.strftime("%Y-%m-%d")
    print(f"🚀 MASTER SCOUT START (Today is {today}, scouting {week_start_str} to {week_end_str})")

    with sync_playwright() as p:
        # Launch a "Headless" browser (no window pops up)
        # STEALTH MODE: Add args to hide the fact that we are a bot
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )

        for v in venues:
            print(f"\n🛰️  SCOUTING: {v['name']} ({v['neighborhood']})...")

            # Fresh browser context per venue — prevents one venue's navigation
            # crash from poisoning subsequent venues
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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

            RETURN ONLY A JSON LIST:
            [
              {{
                "event_name": "", "date": "YYYY-MM-DD", "talent_name": "",
                "talent_ig": "@handle", "category": "", "vibe_score": 0, "vibe_justification": "",
                "event_url": ""
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
                print(f"   🔮 Gemini found {len(events)} events.")
            except Exception as e:
                print(f"❌ Gemini Error for {v['name']}: {e}")
                try:
                    context.close()
                except:
                    pass
                continue

            # ACT (Supabase)
            venue_id = supabase.table("venues").upsert({
                "name": v['name'], "neighborhood": v['neighborhood'], "url": v['url']
            }, on_conflict="name").execute().data[0]['id']

            # Track image URLs seen for this venue to detect generic/shared images
            # (if an image appears for 2+ events, it's probably a venue logo, not an event flyer)
            venue_image_counts = {}

            for event in events:
                try:
                    # FIX: Ensure talent_name is never None
                    t_name = event.get('talent_name')
                    if not t_name or t_name == "None":
                        t_name = event['event_name']

                    talent_id = supabase.table("talent").upsert({
                        "name": t_name,
                        "instagram_handle": event.get('talent_ig', '')
                    }, on_conflict="name").execute().data[0]['id']

                    event_data = supabase.table("events").upsert({
                        "event_name": event['event_name'],
                        "event_date": event['date'],
                        "event_vibe": event['category'],
                        "venue_id": venue_id,
                        "talent_id": talent_id,
                        "status": "pending",
                        "metadata": {
                            "vibe_score": event.get('vibe_score', 0),
                            "justification": event.get('vibe_justification', '')
                        }
                    }, on_conflict="event_name, event_date, venue_id").execute().data[0]

                    event_id = event_data['id']
                    flyer_url = None
                    raw_img_url = None  # Track the source URL to detect duplicates

                    # ── Image extraction: try event-specific page first ──

                    # Find the best matching event link from the listing page
                    event_detail_url = event.get('event_url', '')
                    if not event_detail_url:
                        # Fuzzy match: find a link whose text contains the event name
                        event_name_lower = event['event_name'].lower()
                        for link in event_links:
                            if event_name_lower in link['text'].lower() or link['text'].lower() in event_name_lower:
                                event_detail_url = link['href']
                                break

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

                    # Check if this image has been seen for 2+ events from this venue
                    # If so, it's probably a generic venue logo — skip it and use image search instead
                    is_generic = False
                    if raw_img_url:
                        venue_image_counts[raw_img_url] = venue_image_counts.get(raw_img_url, 0) + 1
                        if venue_image_counts[raw_img_url] >= 2:
                            is_generic = True
                            print(f"   ⚠️ Image appears to be generic venue image (seen {venue_image_counts[raw_img_url]}x) — searching instead")

                    # If we have a non-generic image, upload it
                    if raw_img_url and not is_generic:
                        flyer_url = upload_flyer(raw_img_url, event_id)

                    # Fallback: search DuckDuckGo Images for the event
                    if not flyer_url:
                        img_url = search_event_image(event['event_name'], v['name'])
                        if img_url:
                            flyer_url = upload_flyer(img_url, event_id)

                    # Last resort: use the generic image if nothing else worked
                    if not flyer_url and raw_img_url and is_generic:
                        flyer_url = upload_flyer(raw_img_url, event_id)

                    if flyer_url:
                        supabase.table("events").update({"flyer_url": flyer_url}).eq("id", event_id).execute()
                        print(f"   ✅ Saved Event + Flyer: {event['event_name']} ({event.get('vibe_score', 0)}/10)")
                    else:
                        print(f"   ✅ Saved Event (No Flyer): {event['event_name']} ({event.get('vibe_score', 0)}/10)")
                except Exception as e:
                    print(f"   ⚠️  DB ERROR for {event['event_name']}: {e}")
                    continue

            # Close this venue's context to release resources
            try:
                context.close()
            except:
                pass

            # Cooldown to avoid API rate limits
            print("⏳ Cooldown: Waiting 10 seconds to respect API limits...")
            time.sleep(10)

        browser.close()

if __name__ == "__main__":
    run_master_scout()