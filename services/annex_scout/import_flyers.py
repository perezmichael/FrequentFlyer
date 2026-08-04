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

from master_scout import supabase, clean_time, looks_like_image

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
    horizon = today + timedelta(days=365)
    return f"""
You are reading a single event flyer for a Los Angeles events listing.

TODAY IS {today.isoformat()}.

Return ONLY a JSON ARRAY, no prose, no code fences. One object per DATE the
flyer advertises — most flyers give one, but a series poster listing several
dates should return one object per date:

[{{
  "title": "", "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM",
  "venue_name": "", "neighborhood": "", "price": "", "vibe": "", "description": "",
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
3. "date": flyers rarely print the year. Resolve each printed day/month to the
   NEXT occurrence on or after {today}, and never past {horizon}.
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


def valid_date(value: str, today: date) -> str | None:
    """A date must parse, and must not be in the past."""
    if not value or not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return None
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None
    if parsed < today:
        return None
    return value


def find_or_create_venue(name: str, neighborhood: str, apply: bool) -> str | None:
    """
    Match an existing venue by name before creating one — the whole venue list
    is hand-curated and a near-duplicate ("Zebulon " vs "Zebulon") would split
    a room in two on the map.
    """
    if not name:
        return None
    existing = supabase.table("venues").select("id, name").execute().data or []
    target = re.sub(r"[^a-z0-9]", "", name.lower())
    for v in existing:
        if re.sub(r"[^a-z0-9]", "", (v.get("name") or "").lower()) == target:
            return v["id"]

    if not apply:
        return "(new venue would be created)"

    # No coordinates: the flyer gives a street address at best, and a guessed
    # pin is worse than none. Geocode it later from /admin.
    created = supabase.table("venues").insert({
        "name": name,
        "neighborhood": neighborhood or "Los Angeles",
        "trust_tier": "standard",
        "metadata": {"added_from": "flyer import"},
    }).execute().data
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="read and print, write nothing")
    ap.add_argument("--dir", default=str(DEFAULT_DIR))
    args = ap.parse_args()
    apply = not args.dry_run

    inbox = Path(args.dir)
    if not inbox.is_dir():
        sys.exit(f"No such folder: {inbox}")

    files = sorted(
        p for p in inbox.iterdir()
        if p.suffix.lower() in IMAGE_SUFFIXES and not p.name.startswith(".")
    )
    if not files:
        print(f"{inbox} has no images.")
        return

    today = date.today()
    prompt = build_prompt(today)
    print(f"{'APPLY' if apply else 'DRY RUN'} — reading {len(files)} flyer(s)\n")

    created = skipped = 0
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
            venue_name = (event.get("venue_name") or "").strip()

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

            venue_id = find_or_create_venue(venue_name, event.get("neighborhood", ""), apply)

            if not apply:
                print("      → would create as pending\n")
                created += 1
                continue

            # Same slot, same venue, similar name → already known.
            dupes = supabase.table("events").select("id, event_name") \
                .eq("event_date", event_date).eq("venue_id", venue_id).execute().data or []
            norm = lambda s: re.sub(r"[^a-z0-9]", "", (s or "").lower())
            if any(norm(d.get("event_name")) == norm(title) for d in dupes):
                print("      → skipped: already in the database\n")
                skipped += 1
                continue

            flyer_url = upload_flyer(event["_bytes"], event["_mime"])
            supabase.table("events").insert({
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
                    "image_source": "flyer import",
                    "added_by": "editor",
                    "source": f"flyer image: {path.name}",
                    "vision_confidence": event.get("confidence"),
                },
            }).execute()
            print("      → created as pending\n")
            created += 1

    verb = "would be created" if not apply else "created"
    print(f"{created} event(s) {verb}, {skipped} skipped.")
    if apply and created:
        print("Review them at /admin — they're pending until you approve.")


if __name__ == "__main__":
    main()
