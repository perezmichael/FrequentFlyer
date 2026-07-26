"""
Re-verify flyers for events the venue re-scrape never revisited.

Why this exists: master_scout re-derives events from each venue's listing page,
and Gemini returns a different subset every run — so events already in the DB
often go untouched, keeping images of unknown provenance. That includes flyers
left behind by the old DuckDuckGo image-search fallback (the "Human Resources
Survey" stock art on "Stanya Kahn Survey of Films", etc.).

This walks the events directly instead of re-deriving them: for each event with
an unverified image, visit its own source_url and extract the real flyer. If the
image can't be verified, clear it so the branded placeholder shows — a wrong
flyer is worse than none.

Pages are fetched once per source_url and reused, since a series (e.g. a film
run) shares one page across many dated rows.

Usage:
    python reverify_flyers.py            # dry run
    python reverify_flyers.py --apply    # write changes
    python reverify_flyers.py --apply --all   # re-verify every upcoming event
"""
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright

from master_scout import (
    supabase, extract_best_image, upload_flyer, extract_event_links, best_event_link,
)

APPLY = "--apply" in sys.argv
ALL = "--all" in sys.argv
# Events with no source_url can't be verified either way. Clearing them is the
# safe call for brand trust (a wrong flyer is worse than none), but it converts
# them to placeholders — so it's opt-out rather than automatic.
KEEP_UNVERIFIABLE = "--keep-unverifiable" in sys.argv


def main():
    today = datetime.now(ZoneInfo("America/Los_Angeles")).strftime("%Y-%m-%d")
    events = supabase.table("events").select(
        "id, event_name, flyer_url, source_url, metadata, venues(name, url)"
    ).eq("status", "approved").gte("event_date", today).execute().data

    if ALL:
        targets = events
    else:
        # Only events whose image provenance was never recorded.
        targets = [e for e in events if "image_source" not in (e.get("metadata") or {})]

    print(f"{'APPLY' if APPLY else 'DRY RUN'} — {len(targets)} event(s) to re-verify\n")

    fixed = cleared = kept = failed = 0
    page_cache = {}  # source_url -> extracted image url (or None)
    link_cache = {}  # venue url -> [links] scraped once per venue

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            user_agent=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            timezone_id="America/Los_Angeles",
        )
        page = context.new_page()

        for e in targets:
            name = (e["event_name"] or "")[:44]
            src = e.get("source_url")

            # No stored event page? Try to resolve one from the venue's listing
            # so we can recover a real flyer instead of falling back to
            # clearing. Also backfills source_url, which powers the app's
            # "Event page & tickets" link.
            if not src or not src.startswith("http"):
                venue = e.get("venues") or {}
                resolved = _resolve_from_venue(page, venue.get("url"), e["event_name"], link_cache)
                if resolved:
                    src = resolved
                    if APPLY:
                        supabase.table("events").update(
                            {"source_url": resolved}
                        ).eq("id", e["id"]).execute()
                    print(f"  🔗 resolved event page for: {name}")

            if not src or not src.startswith("http"):
                if KEEP_UNVERIFIABLE:
                    kept += 1
                    continue
                # Nothing to verify against — drop the unverifiable image.
                print(f"  🧹 no source_url, clearing image: {name}")
                if APPLY and e.get("flyer_url"):
                    _write(e, None, None)
                cleared += 1
                continue

            if src in page_cache:
                raw = page_cache[src]
            else:
                try:
                    page.goto(src, wait_until="domcontentloaded", timeout=20000)
                    page.evaluate("window.scrollTo(0, 300)")
                    page.wait_for_timeout(700)
                    raw = extract_best_image(page)
                except Exception as err:
                    print(f"  ⚠️  visit failed ({str(err)[:40]}): {name}")
                    raw = None
                    failed += 1
                page_cache[src] = raw

            if raw:
                if APPLY:
                    url = upload_flyer(raw, e["id"])
                    if url:
                        _write(e, url, "event_page")
                        print(f"  ✅ real flyer from event page: {name}")
                        fixed += 1
                    else:
                        _write(e, None, None)
                        print(f"  🧹 upload failed, cleared: {name}")
                        cleared += 1
                else:
                    print(f"  ✅ would replace with page image: {name}")
                    fixed += 1
            else:
                print(f"  🧹 no image on its page, clearing: {name}")
                if APPLY and e.get("flyer_url"):
                    _write(e, None, None)
                cleared += 1

        browser.close()

    print(f"\nreplaced with real flyer: {fixed}")
    print(f"cleared (unverifiable):   {cleared}")
    print(f"left alone (--keep):      {kept}")
    print(f"page visits failed:       {failed}")
    if not APPLY:
        print("\nre-run with --apply to write these changes")


def _resolve_from_venue(page, venue_url, event_name, link_cache):
    """Scrape the venue's listing links once, then score them for this event."""
    if not venue_url or not venue_url.startswith("http"):
        return None
    if venue_url not in link_cache:
        try:
            page.goto(venue_url, wait_until="domcontentloaded", timeout=25000)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(1200)
            link_cache[venue_url] = extract_event_links(page, venue_url)
        except Exception:
            link_cache[venue_url] = []
    return best_event_link(event_name, link_cache[venue_url])


def _write(event, flyer_url, image_source):
    """Update flyer + provenance, preserving the rest of metadata."""
    md = dict(event.get("metadata") or {})
    md["image_source"] = image_source
    supabase.table("events").update(
        {"flyer_url": flyer_url, "metadata": md}
    ).eq("id", event["id"]).execute()


if __name__ == "__main__":
    main()
