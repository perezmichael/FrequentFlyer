"""
One-off cleanup for duplicate event rows.

Venues list the same event under title variants ("IN THE CAFE: Sean Kennerly
reads…" vs "Sean Kennerly reads…"), and the scout used to match on an exact
name, so each variant became its own row — duplicate cards in the feed.
master_scout.py now dedupes on a normalized name; this script cleans up the
rows created before that fix.

Nothing is deleted. The redundant row is set to status='rejected', so it drops
out of the feed and can be restored by flipping the status back.

Usage:
    python dedupe_events.py            # dry run, prints what it would do
    python dedupe_events.py --apply    # actually update statuses
"""
import os
import sys
from collections import defaultdict

from dotenv import load_dotenv
from supabase import create_client

from master_scout import same_event_name

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

APPLY = "--apply" in sys.argv


def keep_score(row):
    """
    Higher is better. Prefer the row that is already live and has the most
    complete data; tie-break toward the shorter (cleaner) title, which is
    usually the one without a venue-section prefix.
    """
    md = row.get("metadata") or {}
    return (
        row.get("status") == "approved",
        bool(row.get("flyer_url")),
        bool(md.get("description")),
        bool(row.get("source_url")),
        -len(row.get("event_name") or ""),
    )


def main():
    rows = supabase.table("events").select(
        "id, event_name, event_date, venue_id, status, flyer_url, source_url, metadata"
    ).execute().data
    venues = {v["id"]: v["name"] for v in supabase.table("venues").select("id, name").execute().data}

    # Group by the slot a duplicate would share: same venue, same date.
    slots = defaultdict(list)
    for r in rows:
        slots[(r["venue_id"], r["event_date"])].append(r)

    to_reject = []
    for (venue_id, date), group in slots.items():
        if len(group) < 2:
            continue
        # Cluster titles that denote the same event.
        clusters = []
        for row in group:
            for cluster in clusters:
                if same_event_name(cluster[0]["event_name"], row["event_name"]):
                    cluster.append(row)
                    break
            else:
                clusters.append([row])

        for cluster in clusters:
            if len(cluster) < 2:
                continue
            cluster.sort(key=keep_score, reverse=True)
            keeper, dupes = cluster[0], cluster[1:]
            print(f"\n{venues.get(venue_id, '?')} — {date}")
            print(f"  KEEP   {keeper['status']:8} {keeper['event_name'][:60]!r}")
            for d in dupes:
                print(f"  REJECT {d['status']:8} {d['event_name'][:60]!r}")
                if d["status"] != "rejected":
                    to_reject.append(d["id"])

    print(f"\n{'APPLYING' if APPLY else 'DRY RUN'} — {len(to_reject)} row(s) to mark rejected")
    if APPLY and to_reject:
        for event_id in to_reject:
            supabase.table("events").update({"status": "rejected"}).eq("id", event_id).execute()
        print("done")
    elif not APPLY:
        print("re-run with --apply to make these changes")


if __name__ == "__main__":
    main()
