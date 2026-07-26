"""
Give every venue a real photo (venues.image_url).

Two things need this. Recurring nights (Happy Hour, Trivia) have no per-event
flyer by nature, so they render as placeholders — all 29 of them. And one-off
events whose flyer couldn't be verified fall back to a placeholder too.

A photo of the venue where the event actually happens is honest and relevant —
unlike the stock art the old image-search fallback produced — so it's a better
last resort than a typographic card, while the card remains the floor when a
venue has no usable image either.

Usage:
    python fetch_venue_images.py            # dry run
    python fetch_venue_images.py --apply
    python fetch_venue_images.py --apply --all   # refresh even existing ones
"""
import sys

import requests
from playwright.sync_api import sync_playwright

from master_scout import supabase, extract_best_image, looks_like_image

APPLY = "--apply" in sys.argv
ALL = "--all" in sys.argv


def upload_venue_image(image_url, venue_id, referer=None):
    """Store a venue photo under venues/{id}.jpg. Returns public URL or None."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        }
        if referer:
            headers["Referer"] = referer
        resp = requests.get(image_url, timeout=15, headers=headers)
        if resp.status_code != 200:
            return None
        data = resp.content
        if len(data) < 1500 or not looks_like_image(data):
            return None
        path = f"venues/{venue_id}.jpg"
        supabase.storage.from_("event-flyers").upload(
            path, data, {"content-type": "image/jpeg", "upsert": "true"}
        )
        return supabase.storage.from_("event-flyers").get_public_url(path)
    except Exception as err:
        print(f"      upload failed: {str(err)[:60]}")
        return None


def main():
    venues = supabase.table("venues").select("id, name, url, image_url").execute().data
    targets = [
        v for v in venues
        if v.get("url") and str(v["url"]).startswith("http")
        and (ALL or not v.get("image_url"))
    ]
    print(f"{'APPLY' if APPLY else 'DRY RUN'} — {len(targets)} venue(s) needing a photo\n")

    got = missed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            user_agent=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()

        for v in targets:
            try:
                page.goto(v["url"], wait_until="domcontentloaded", timeout=25000)
                page.evaluate("window.scrollTo(0, 400)")
                page.wait_for_timeout(800)
                raw = extract_best_image(page)
            except Exception as err:
                print(f"  ⚠️  {v['name'][:34]}: visit failed ({str(err)[:34]})")
                missed += 1
                continue

            if not raw:
                print(f"  ⚠️  {v['name'][:34]}: no usable image on site")
                missed += 1
                continue

            if APPLY:
                url = upload_venue_image(raw, v["id"], referer=page.url)
                if url:
                    supabase.table("venues").update({"image_url": url}).eq("id", v["id"]).execute()
                    print(f"  ✅ {v['name'][:34]}")
                    got += 1
                else:
                    print(f"  ⚠️  {v['name'][:34]}: image rejected")
                    missed += 1
            else:
                print(f"  ✅ would set photo for {v['name'][:34]}")
                got += 1

        browser.close()

    print(f"\nphotos set: {got}   no image found: {missed}")
    if not APPLY:
        print("re-run with --apply to write")


if __name__ == "__main__":
    main()
