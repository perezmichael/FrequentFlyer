"""
Read events out of flyer images and file them for review.

The scout reads a venue's HTML. This reads the artwork itself, which is the
only source for the many LA events that live entirely on Instagram and never
get a web page. Flyers are designed to carry the fields legibly — "FRI AUG 7th
6:30PM-9:00PM · STORIES BOOKS & CAFE · FREE" is right there in the image.

Same discipline as the scout: copy only what the flyer states, never infer,
land everything as `pending` so a human approves before it reaches the site.

Usage:
    python import_flyers.py --dry-run     # show what it read, write nothing
    python import_flyers.py               # create pending events
    python import_flyers.py --dir ../../flyer-inbox
"""
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from google import genai
from google.genai import types

from master_scout import (
    supabase, clean_time, looks_like_image, BOT_UA,
    upsert_performers, link_performers,
)

MODEL = "gemini-2.5-flash"
DEFAULT_DIR = Path(__file__).resolve().parents[2] / "flyer-inbox"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

MIME = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
}

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def build_prompt(today: date) -> str:
    """
    A flyer is a poster, not a database row: it says "FRI AUG 7" and expects
    you to know the year. Give the model today's date so it can resolve that,
    and tell it plainly to leave blank whatever isn't printed.
    """
    # 120 days, not a year: an undated flyer resolving 11 months out is almost
    # always a year-off mistake rather than a real listing.
    horizon = today + timedelta(days=120)
    year, next_year = today.year, today.year + 1
    return f"""
You are reading a single event flyer for a Los Angeles events listing.

TODAY IS {today.isoformat()}.

Return ONLY a JSON ARRAY, no prose, no code fences. One object per DATE the
flyer advertises — most flyers give one, but a series poster listing several
dates should return one object per date:

[{{
  "title": "", "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM",
  "venue_name": "", "neighborhood": "", "price": "", "vibe": "", "description": "",
  "performers": [{{"name": "", "instagram": "@handle"}}],
  "promoter": "", "age_restriction": "",
  "confidence": "high|medium|low"
}}]

RULES
1. Copy ONLY what the flyer actually prints. If a field isn't shown, return "".
   Never infer a time from the vibe, or a price from the absence of one.
2. "title" is REQUIRED and is the single most important field. It's the largest
   or most prominent text — the name of the event or the act. Read stylised,
   hand-drawn and distorted lettering carefully; that's usually the title.
   - If the flyer names both a series and a specific act or guest, combine them:
     "Canyon Sunday Pop-Up: Nice Bite", "Milk Crate Mondays w/ Alex Santos".
   - If it lists a bill of several acts, join the headliners: "Isolate, Boy Grim".
   - Only return "" if the image genuinely has no legible headline text.
3. "date": flyers rarely print the year. When no year is printed, assume the
   CURRENT year ({year}) — use {next_year} ONLY if that date has already passed.
   A flyer saying "FRI AUG 7" read on {today} is {year}-08-07, three days away;
   it is NOT {next_year}. Do not reason from the printed weekday: flyers get
   weekdays wrong, and the day/month is the reliable part.
   Never return a date past {horizon}.
   A poster listing "AUG 02 · AUG 09 · AUG 16" is three objects, each with its
   own title reflecting that date's act where the flyer names one.
4. "start_time"/"end_time": 24-hour "HH:MM". Prefer the show time over doors;
   if only doors is given, use it and mention "Doors" in the description.
   "9PM-2AM" means start 21:00, end 02:00.
5. "price": copy it — "$10", "$13.39", "Free", "No cover", "Free with RSVP".
   Do NOT assume free because no price is printed; return "".
6. "venue_name": the venue, not the promoter or presenting collective. A flyer
   reading "MELODY LOUNGE PRESENTS ... 939 N HILL ST" has venue "Melody Lounge".
7. "vibe": a short category — Live Music, DJ Night, Comedy, Workshop, Market,
   Film Screening, Reading, Dance Party, Art Opening.
8. "description": one or two plain sentences about what happens — who's playing,
   what the format is. Only facts printed on the flyer.
9. "confidence": "low" if the flyer is hard to read or the date is ambiguous.
10. "performers": one entry per act billed, in the order printed (headliner
    first). A flyer listing four DJs is four entries, never one string with
    commas. Copy the act's name only — not the night's name. "Milk Crate
    Mondays w/ Alex Santos" is the performer Alex Santos. If the flyer names
    no act, return an EMPTY LIST rather than repeating the title.
11. "promoter": the label, collective or night presenting it — not the venue,
    not the act. "" if the flyer doesn't say.
12. "age_restriction": "21+", "18+", "All Ages" as printed. "" if absent —
    never inferred from the venue.
"""


def read_flyer(path: Path, prompt: str) -> list[dict]:
    """Returns one dict per date the flyer advertises; [] on any failure."""
    data = path.read_bytes()
    if not looks_like_image(data):
        print(f"  SKIP  {path.name} — not a readable image")
        return []
    if len(data) < 1500:
        print(f"  SKIP  {path.name} — {len(data)} bytes, too small")
        return []

    mime = MIME.get(path.suffix.lower(), "image/jpeg")
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_bytes(data=data, mime_type=mime),
                prompt,
            ],
        )
    except Exception as err:
        print(f"  FAIL  {path.name} — {str(err)[:90]}")
        return []

    cleaned = (response.text or "").replace("```json", "").replace("```", "").strip()
    if not cleaned:
        print(f"  FAIL  {path.name} — empty response")
        return []
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"  FAIL  {path.name} — unparseable: {cleaned[:80]}")
        return []

    # Tolerate a bare object if the model ignores the array instruction.
    entries = parsed if isinstance(parsed, list) else [parsed]
    for entry in entries:
        entry["_bytes"] = data
        entry["_mime"] = mime
        entry["_file"] = path.name
    return [e for e in entries if isinstance(e, dict)]


FAR_FUTURE_DAYS = 200


def valid_date(value: str, today: date) -> str | None:
    """
    A date must parse, must not be in the past, and must not be absurdly far
    out. An undated flyer that resolves 11 months ahead is a year-off error,
    not a listing — that happened to two of the first nine real flyers.
    """
    if not value or not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return None
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None
    if parsed < today:
        return None
    if (parsed - today).days > FAR_FUTURE_DAYS:
        return None
    return value


def venue_key(name: str) -> str:
    """
    Normalise a venue name for matching.

    "&" and "and" are the same word to a human and were not to the first
    version of this: "STORIES BOOKS & CAFE" off a flyer failed to match
    "Stories Books and Cafe" in the database and created a duplicate with no
    map pin.
    """
    key = (name or "").lower()
    key = key.replace("&", " and ")
    key = re.sub(r"[^a-z0-9]+", " ", key).strip()
    return re.sub(r"\s+", "", key)


def geocode(name: str, neighborhood: str) -> tuple[float, float] | None:
    """
    Look up coordinates so a flyer-sourced venue gets a map pin.

    Guarded by the same LA bounding box the rest of the pipeline uses: a
    geocoder handed "Melody Lounge" will happily return one in another state,
    and a confidently wrong pin is worse than none.
    """
    import time as _time
    import requests as _requests

    query = ", ".join(p for p in [name, neighborhood, "Los Angeles, CA"] if p)
    try:
        resp = _requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"format": "json", "limit": 1, "q": query},
            headers={"User-Agent": BOT_UA},
            timeout=15,
        )
        _time.sleep(1.1)  # Nominatim asks for one request per second
        results = resp.json()
    except Exception:
        return None
    if not results:
        return None
    try:
        lat, lng = float(results[0]["lat"]), float(results[0]["lon"])
    except (KeyError, ValueError, TypeError):
        return None
    if not (33.6 < lat < 34.4 and -118.9 < lng < -117.6):
        return None
    return lat, lng


def find_or_create_venue(name: str, neighborhood: str, apply: bool) -> str | None:
    """
    Match an existing venue before creating one — the venue list is
    hand-curated, and a near-duplicate splits one room into two on the map.
    """
    if not name:
        return None
    existing = supabase.table("venues").select("id, name").execute().data or []
    target = venue_key(name)

    for v in existing:
        if venue_key(v.get("name")) == target:
            return v["id"]

    # Second pass ignoring a leading "the", which flyers drop freely.
    bare = re.sub(r"^the", "", target)
    for v in existing:
        if re.sub(r"^the", "", venue_key(v.get("name"))) == bare:
            print(f"      matched existing venue \"{v['name']}\"")
            return v["id"]

    # Third pass: flyers print the full legal name where the database holds
    # what people actually call the room — "PROGRAMME SKATE AND SOUND" against
    # "Programme". Without this the importer creates a second venue for a room
    # that's already on the map, which splits its events and its pin.
    #
    # Prefix, not substring, and only for names long enough to be distinctive:
    # "bar" as a substring would match half the city.
    for v in existing:
        k = re.sub(r"^the", "", venue_key(v.get("name")))
        if len(k) >= 6 and (bare.startswith(k) or k.startswith(bare)):
            # Announced loudly because it's a guess. Everything else this
            # script does lands as pending for review; creating the wrong venue
            # link is the one thing a human won't spot in a review queue.
            print(f"      ~ FUZZY venue match: \"{name}\" → \"{v['name']}\" — check this")
            return v["id"]

    if not apply:
        print(f"      would create venue \"{name}\"")
        return "(new venue)"

    coords = geocode(name, neighborhood)
    payload = {
        "name": name,
        "neighborhood": neighborhood or "Los Angeles",
        "trust_tier": "standard",
        "metadata": {"added_from": "flyer import"},
    }
    if coords:
        payload["lat"], payload["lng"] = coords
        print(f"      created venue \"{name}\" — geocoded")
    else:
        print(f"      created venue \"{name}\" — NO PIN, needs an address")

    created = supabase.table("venues").insert(payload).execute().data
    return created[0]["id"] if created else None


def upload_flyer(data: bytes, mime: str) -> str | None:
    """Content-addressed, so the same flyer imported twice stays one object."""
    digest = hashlib.sha1(data).hexdigest()[:16]
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}.get(mime, "jpg")
    path = f"flyers/shared/{digest}.{ext}"
    try:
        supabase.storage.from_("event-flyers").upload(
            path, data, {"content-type": mime, "upsert": "true"}
        )
        return supabase.storage.from_("event-flyers").get_public_url(path)
    except Exception as err:
        print(f"      upload failed: {str(err)[:70]}")
        return None


def _tokens(s) -> set:
    """Words worth matching on. Two-letter fragments carry no signal."""
    if isinstance(s, dict):
        s = s.get("name") or ""
    return {w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(w) > 2}


# A shared word is only evidence if it's rare across the whole calendar.
#
# Measured against real data the separation is wide: generic overlaps ("Live
# Music Night" against "DJ Night") land at 0.01-0.04, while a one-word band
# name shared with a bill scores 0.5 and a real title match 1.5-2.6. 0.4 sits
# in the gap — a word appearing in two events out of ~1300 is distinctive
# enough to trust, three or four common words together are not.
#
# Erring toward CREATE on purpose. A wrong create is a duplicate that dies in
# the review queue; a wrong attach writes onto an event that may already be
# live. The score is printed on every decision so a bad call is visible in the
# dry run before anything is written.
MATCH_MIN = 0.4


def find_matching_event(title: str, performers, event_date: str):
    """
    Is this flyer for a show that's already listed?

    Returns (row, score) or (None, score). The importer's original dupe check
    needed an exact title match AND the venue to have already resolved, so it
    caught only literal re-imports — a flyer for an event the scout had found
    under a different phrasing became a second row.

    Words are weighted by how rare they are in the day's pool rather than
    counted flat. During Sound & Fury week "sound" and "fury" appear in half
    the titles and carry no information, while "diplodocus" appears once and
    decides it. Flat overlap paired a Jawbreaker documentary with an unrelated
    pre-show on those two words alone. This needs no stopword list and retunes
    itself for whatever is on that night.
    """
    rows = supabase.table("events").select(
        "id, event_name, event_date, flyer_url, metadata, venue_id, venues(name)"
    ).eq("event_date", event_date).execute().data or []
    if not rows:
        return None, 0.0

    bills = {}
    links = supabase.table("event_talent").select("event_id, talent(name)") \
        .in_("event_id", [r["id"] for r in rows]).execute().data or []
    for link in links:
        bills.setdefault(link["event_id"], []).append((link.get("talent") or {}).get("name", ""))

    docs = [
        _tokens(r["event_name"]) | {w for n in bills.get(r["id"], []) for w in _tokens(n)}
        for r in rows
    ]

    # Rarity is measured across the WHOLE upcoming calendar, not just this
    # date's handful. Scoped to one day, "night" looked rare enough to matter
    # and paired "Live Music Night" with an unrelated "DJ Night" on that single
    # word. Against a few thousand events it's correctly worth almost nothing,
    # while a band name that appears once still decides the match. Candidates
    # stay same-date; only the weighting looks wider.
    corpus = supabase.table("events").select("event_name").execute().data or []
    freq = {}
    for row in corpus:
        for w in _tokens(row.get("event_name")):
            freq[w] = freq.get(w, 0) + 1
    for d in docs:  # performer names aren't in event titles; count them too
        for w in d:
            freq.setdefault(w, 0)
            freq[w] += 1

    flyer_words = _tokens(title) | {w for p in (performers or []) for w in _tokens(p)}

    best, best_score = None, 0.0
    for row, doc in zip(rows, docs):
        shared = flyer_words & doc
        if not shared:
            continue
        score = sum(1.0 / freq[w] for w in shared)
        if score > best_score:
            best, best_score = row, score

    return (best, best_score) if best_score >= MATCH_MIN else (None, best_score)


def enrich_event(row: dict, event: dict, flyer_url, apply: bool) -> list:
    """
    Fill in what the flyer knows and the listing didn't.

    Only ever fills blanks. A venue's own page and a hand correction both
    outrank a poster, and editor_locked fields are never touched — that's the
    whole point of recording them. Returns the field names that changed.
    """
    meta = dict(row.get("metadata") or {})
    locked = set(meta.get("editor_locked") or [])
    filled = []

    def fill(key, value):
        value = (value or "").strip()
        if not value or key in locked:
            return
        if str(meta.get(key) or "").strip():
            return
        meta[key] = value
        filled.append(key)

    fill("price", event.get("price"))
    fill("age_restriction", event.get("age_restriction"))
    fill("promoter", event.get("promoter"))
    fill("description", event.get("description"))

    update = {}
    # Never replace existing artwork: the scout takes it from the event's own
    # page, which beats a screenshot off Instagram.
    if flyer_url and not row.get("flyer_url"):
        update["flyer_url"] = flyer_url
        meta.setdefault("image_source", "flyer import")
        filled.append("flyer")

    if filled:
        update["metadata"] = meta
    if update and apply:
        supabase.table("events").update(update).eq("id", row["id"]).execute()

    # Performers are additive — a flyer often names support acts the venue's
    # listing left off. link_performers is idempotent.
    ids = upsert_performers(event.get("performers"))
    if ids:
        if apply:
            link_performers(row["id"], ids)
        filled.append(f"{len(ids)} performer(s)")

    return filled


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="read and print, write nothing")
    ap.add_argument("--dir", default=str(DEFAULT_DIR))
    # A venue posting its own night has no reason to name itself, so the flyer
    # often omits the one field the listing can't do without. Supplying it here
    # beats hand-editing afterwards, and beats letting the model guess.
    ap.add_argument("--venue", default="",
                    help='venue for flyers that don\'t name one, e.g. --venue "Melody Lounge"')
    args = ap.parse_args()
    apply = not args.dry_run

    inbox = Path(args.dir)
    if not inbox.is_dir():
        sys.exit(f"No such folder: {inbox}")

    # Recursive: a downloader extension drops a folder per collection, and
    # requiring a flat directory just means moving files around by hand.
    files = sorted(
        p for p in inbox.rglob("*")
        if p.is_file()
        and p.suffix.lower() in IMAGE_SUFFIXES
        and not p.name.startswith(".")
    )
    if not files:
        print(f"{inbox} has no images.")
        return

    today = date.today()
    prompt = build_prompt(today)
    folders = {p.parent for p in files}
    where = "" if len(folders) <= 1 else f" across {len(folders)} folders"
    print(f"{'APPLY' if apply else 'DRY RUN'} — reading {len(files)} flyer(s){where}\n")

    created = skipped = attached = 0
    for path in files:
        entries = read_flyer(path, prompt)
        if not entries:
            continue
        if len(entries) > 1:
            print(f"  {path.name} — series poster, {len(entries)} dates")

        for event in entries:
            title = (event.get("title") or "").strip()
            event_date = valid_date((event.get("date") or "").strip(), today)
            start = clean_time(event.get("start_time"))
            end = clean_time(event.get("end_time"))
            # --venue fills in only what the flyer left blank; a flyer that
            # names its own venue is still believed over the flag.
            venue_name = (event.get("venue_name") or "").strip() or args.venue.strip()

            flag = "" if event.get("confidence") == "high" else f"  [{event.get('confidence')} confidence]"
            print(f"  {path.name}{flag}")
            print(f"      {title or '(no title)'}")
            print(f"      {event_date or '(NO DATE)'}  {start or '--:--'}{'-' + end if end else ''}  "
                  f"{venue_name or '(no venue)'}  {event.get('price') or '(no price)'}")

            # A listing with no title or no date can't be published or deduped.
            if not title or not event_date:
                print("      → skipped: needs a title and a date\n")
                skipped += 1
                continue

            # Is this already listed? Checked BEFORE touching venues, so a
            # flyer for a known show can't create a duplicate venue on its way
            # to creating a duplicate event.
            match, score = find_matching_event(title, event.get("performers"), event_date)
            if match:
                where = ((match.get("venues") or {}).get("name")) or "?"
                print(f"      → ATTACH to \"{match['event_name'][:42]}\" @ {where}  (score {score:.1f})")
                flyer_url = upload_flyer(event["_bytes"], event["_mime"]) if apply else None
                filled = enrich_event(match, event, flyer_url, apply)
                verb = "filled" if apply else "would fill"
                print(f"        {verb}: {', '.join(filled) if filled else 'nothing new — already complete'}\n")
                attached += 1
                continue

            venue_id = find_or_create_venue(venue_name, event.get("neighborhood", ""), apply)

            # An event with no venue is an orphan: no location on the card, no
            # pin on the map, and nothing for the next import to match against.
            # Better to refuse it and say why than to file it and forget.
            if not venue_id:
                print('      → skipped: no venue on the flyer. '
                      'Re-run with --venue "Name" if you know it.\n')
                skipped += 1
                continue

            if not apply:
                print(f"      → would CREATE as pending (best match scored {score:.1f}, below {MATCH_MIN})\n")
                created += 1
                continue

            flyer_url = upload_flyer(event["_bytes"], event["_mime"])
            inserted = supabase.table("events").insert({
                "event_name": title,
                "event_date": event_date,
                "start_time": start,
                "end_time": end,
                "event_vibe": (event.get("vibe") or "Event").strip(),
                "venue_id": venue_id,
                "flyer_url": flyer_url,
                "status": "pending",          # never live without a human
                "curation_level": "scraped",
                "metadata": {
                    "description": (event.get("description") or "").strip(),
                    "price": (event.get("price") or "").strip(),
                    # Same normalisation as the scout — see clean_promoter there
                    # for why this is a string and not its own table.
                    "promoter": re.sub(
                        r"\s*(presents?|pres\.?|presented\s+by)\s*$", "",
                        re.sub(r"\s+", " ", (event.get("promoter") or "")).strip(),
                        flags=re.I,
                    ).strip(" -–—:·,")[:120],
                    "age_restriction": (event.get("age_restriction") or "").strip(),
                    # Kept on the row as well as in event_talent: a flyer import
                    # lands as pending, and if it's rejected the join rows go
                    # with it — this preserves what the flyer actually said.
                    "performers_raw": event.get("performers") or [],
                    "image_source": "flyer import",
                    "added_by": "editor",
                    "source": f"flyer image: {path.name}",
                    "vision_confidence": event.get("confidence"),
                },
            }).execute()

            # A new event gets its bill recorded the same way the scout does,
            # so "which performer played most often" counts flyer imports too.
            # metadata.performers_raw keeps what the flyer said even if the
            # event is later rejected and the join rows go with it.
            new_id = (inserted.data or [{}])[0].get("id")
            acts = upsert_performers(event.get("performers"))
            if new_id and acts:
                link_performers(new_id, acts)
            print(f"      → created as pending"
                  f"{f' with {len(acts)} performer(s)' if acts else ''}\n")
            created += 1

    verb = "would be" if not apply else ""
    print(f"{attached} attached to existing events, {created} new event(s) {verb} created, {skipped} skipped.")
    if apply and created:
        print("The new ones are pending — review at /admin before they go live.")
    if apply and attached:
        print("Attached flyers went onto events that were ALREADY approved, so those are live now.")


if __name__ == "__main__":
    main()
