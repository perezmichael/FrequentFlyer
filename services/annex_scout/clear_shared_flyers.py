"""
Clear flyers that are the same picture across several events at one venue.

Per-event extraction can't see reuse — each event looks fine alone. But when
ten events at The Elysian all carry the Superbloom Mondays poster, nine of them
are advertising the wrong night. That's worse than no image: a venue photo is
merely generic, whereas another event's poster is actively misleading.

Cleared events fall back to the venue photo, then to the branded typographic
card. Nothing is deleted — only flyer_url is nulled, and the reason is recorded
in metadata.image_source so it's traceable.

Usage:
    python clear_shared_flyers.py            # dry run
    python clear_shared_flyers.py --apply
"""
import hashlib
import sys
from collections import defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

from master_scout import supabase

APPLY = "--apply" in sys.argv
# 2+ events sharing a picture already means it isn't a per-event flyer.
SHARED_THRESHOLD = 2


def main():
    today = datetime.now(ZoneInfo("America/Los_Angeles")).strftime("%Y-%m-%d")
    rows = supabase.table("events").select(
        "id, event_name, event_date, flyer_url, metadata, venue_id, venues(name)"
    ).eq("status", "approved").gte("event_date", today).execute().data

    by_venue = defaultdict(lambda: defaultdict(list))
    cache = {}
    for r in rows:
        if not r.get("flyer_url"):
            continue
        url = r["flyer_url"]
        if url not in cache:
            try:
                cache[url] = hashlib.sha256(
                    requests.get(url, timeout=20).content
                ).hexdigest()[:16]
            except Exception:
                cache[url] = None
        digest = cache[url]
        if digest:
            by_venue[r["venue_id"]][digest].append(r)

    cleared = 0
    for venue_id, groups in by_venue.items():
        for digest, events in groups.items():
            if len(events) < SHARED_THRESHOLD:
                continue
            venue = (events[0].get("venues") or {}).get("name", "?")
            print(f"\n{venue}: one image on {len(events)} events — clearing")
            for e in events:
                print(f"   {e['event_date']}  {e['event_name'][:46]}")
                if APPLY:
                    md = dict(e.get("metadata") or {})
                    md["image_source"] = "shared_cleared"
                    md["image_hash"] = digest
                    supabase.table("events").update(
                        {"flyer_url": None, "metadata": md}
                    ).eq("id", e["id"]).execute()
                cleared += 1

    print(f"\n{'CLEARED' if APPLY else 'WOULD CLEAR'}: {cleared} event(s)")
    if not APPLY:
        print("re-run with --apply to write")


if __name__ == "__main__":
    main()
