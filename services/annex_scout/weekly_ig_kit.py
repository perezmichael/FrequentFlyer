"""
Build the week's Instagram roundup: flyers numbered in carousel order, plus a
caption, dropped in a dated folder.

Mirrors how the @frequentflyerla roundups already read — one carousel for the
week, caption naming the date range and each night's pick.

Curation rules, in order:
  * one pick per night, highest vibe score first (the manifesto score from
    vibedoc.md is the taste signal)
  * only events with real artwork — no placeholders in a carousel
  * every slide must be a DIFFERENT picture. Venue hero images repeat across a
    venue's events, and three identical slides reads as broken
  * spread the venues: cap how many slides one venue can take, so a prolific
    venue doesn't become the whole week

Nothing is posted anywhere — this prepares files for a human to upload.

Usage:
    python weekly_ig_kit.py            # next 7 days
    python weekly_ig_kit.py --days 14
"""
import hashlib
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests

from master_scout import supabase

LA = ZoneInfo("America/Los_Angeles")
MIN_IMAGE_BYTES = 40_000      # below this it's a thumbnail/logo, not a flyer
MAX_SLIDES = 10               # classic carousel length
MAX_PER_VENUE = 3

days = 7
if "--days" in sys.argv:
    days = int(sys.argv[sys.argv.index("--days") + 1])


def vibe(e):
    return (e.get("metadata") or {}).get("vibe_score", 0) or 0


def main():
    today = datetime.now(LA).date()
    end = today + timedelta(days=days - 1)

    rows = supabase.table("events").select(
        "event_name, event_date, flyer_url, source_url, metadata, venues(name, neighborhood)"
    ).eq("status", "approved").gte("event_date", str(today)).lte(
        "event_date", str(end)
    ).execute().data

    by_night = defaultdict(list)
    for r in rows:
        if r.get("flyer_url"):
            by_night[r["event_date"]].append(r)
    for night in by_night:
        by_night[night].sort(key=lambda r: -vibe(r))

    out = os.path.expanduser(f"~/ff-ig-week-{today}")
    os.makedirs(out, exist_ok=True)

    seen_images = {}
    venue_count = defaultdict(int)
    slides = []

    used = set()

    def try_take(e, enforce_venue_cap=True):
        """Download and accept an event as a slide if it passes every filter."""
        key = (e["event_name"], e["event_date"])
        if key in used:
            return False
        venue = (e.get("venues") or {}).get("name") or "?"
        if enforce_venue_cap and venue_count[venue] >= MAX_PER_VENUE:
            return False
        try:
            data = requests.get(e["flyer_url"], timeout=20).content
        except Exception:
            return False
        if len(data) < MIN_IMAGE_BYTES:
            return False
        digest = hashlib.sha256(data).hexdigest()[:16]
        if digest in seen_images:
            return False  # same picture as a slide we already have
        seen_images[digest] = e["event_name"]
        venue_count[venue] += 1
        used.add(key)
        slides.append((e, data))
        return True

    # Pass 1 — cover every night. Walk that night's candidates until one
    # sticks, so a night isn't lost just because its top pick reuses an image
    # another slide already claimed.
    for night in sorted(by_night):
        for e in by_night[night]:
            if try_take(e):
                break

    # Pass 2 — fill the remaining slots with the best of what's left.
    for e in sorted((r for rs in by_night.values() for r in rs), key=lambda r: -vibe(r)):
        if len(slides) >= MAX_SLIDES:
            break
        try_take(e)

    slides.sort(key=lambda s: (s[0]["event_date"], -vibe(s[0])))

    lines = []
    for i, (e, data) in enumerate(slides, 1):
        v = e.get("venues") or {}
        safe = "".join(c if c.isalnum() or c == " " else "" for c in e["event_name"])[:40].strip()
        with open(f"{out}/{i:02}_{safe.replace(' ', '_')}.jpg", "wb") as fh:
            fh.write(data)
        day = datetime.strptime(e["event_date"], "%Y-%m-%d").strftime("%a").upper()
        lines.append(f"{day} — {e['event_name']} @ {v.get('name', '')}")
        print(f"  slide {i:02}  {vibe(e):2}/10  {e['event_date'][5:]}  "
              f"{e['event_name'][:38]:40} {v.get('name', '')[:20]:22} {len(data)//1024:5}KB")

    rng = f"{today.strftime('%b %-d')} – {end.strftime('%b %-d')}"
    caption = (
        f"A fire line up for the week. {rng}\n\n"
        + "\n".join(lines)
        + "\n\nall of it + more at frequentflyerla.com"
    )
    with open(f"{out}/caption.txt", "w") as fh:
        fh.write(caption)

    print(f"\n{len(slides)} slides + caption.txt -> {out}")
    print("\n" + caption)


if __name__ == "__main__":
    main()
