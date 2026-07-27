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

    # Newsletter from the same data — more events than the carousel can hold,
    # since an email isn't capped at 10 slides.
    title, subtitle, html = build_newsletter(by_night, today, end, rng)
    with open(f"{out}/newsletter.html", "w") as fh:
        fh.write(html)

    print(f"\n{len(slides)} slides + caption.txt + newsletter.html -> {out}")
    print("\n" + caption)

    push_to_beehiiv(title, subtitle, html)


def build_newsletter(by_night, today, end, rng):
    """Night-by-night HTML for the email, in the existing newsletter format."""
    top = []
    for night in sorted(by_night):
        for e in by_night[night][:1]:
            top.append(e["event_name"].split(",")[0].split(":")[0].strip())
    subtitle = ", ".join(top[:3]) if top else "This week in LA"
    title = f"Things to do This Week in LA: {rng}"

    parts = [f"<p>Seven nights. Here's where we'd be.</p>"]
    for night in sorted(by_night):
        day = datetime.strptime(night, "%Y-%m-%d").strftime("%A %-m/%-d")
        parts.append(f"<h2>{day}</h2>")
        for e in by_night[night][:3]:
            v = e.get("venues") or {}
            desc = ((e.get("metadata") or {}).get("description") or "").strip()
            link = e.get("source_url") or ""
            name = _esc(e["event_name"])
            name_html = f'<a href="{_esc(link)}">{name}</a>' if link.startswith("http") else name
            where = f"{_esc(v.get('name', ''))} · {_esc(v.get('neighborhood', ''))}"
            parts.append(f"<p><strong>{name_html}</strong><br><em>{where}</em>"
                         + (f"<br>{_esc(desc)}" if desc else "") + "</p>")

    parts.append('<hr><p>Full listings, map, and everything we couldn\'t fit — '
                 '<a href="https://frequentflyerla.com">frequentflyerla.com</a></p>')
    return title, subtitle, "\n".join(parts)


def _esc(s):
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def push_to_beehiiv(title, subtitle, html):
    """
    Create a DRAFT post in beehiiv, if credentials are configured.

    Never publishes — status is always 'draft', so the issue still needs a
    human to review and send.

    Heads up: beehiiv documents post creation as beta and Enterprise-only, so
    this may 403 on lower plans. That's fine — newsletter.html is written
    either way and can be pasted straight into the beehiiv editor.
    """
    key = os.getenv("BEEHIIV_API_KEY")
    pub = os.getenv("BEEHIIV_PUBLICATION_ID")
    if not key or not pub:
        print("\n(beehiiv: set BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID in .env "
              "to auto-create a draft; newsletter.html is ready to paste meanwhile)")
        return

    try:
        resp = requests.post(
            f"https://api.beehiiv.com/v2/publications/{pub}/posts",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "title": title,
                "subtitle": subtitle,
                "body_content": html,
                "status": "draft",
            },
            timeout=30,
        )
    except Exception as err:
        print(f"\nbeehiiv: request failed ({str(err)[:70]}) — paste newsletter.html instead")
        return

    if resp.status_code in (200, 201, 202):
        print("\nbeehiiv: draft created — review and send from the dashboard")
    elif resp.status_code in (401, 403):
        print(f"\nbeehiiv: {resp.status_code} — API key rejected, or post creation isn't "
              "available on this plan (it's Enterprise-only). Paste newsletter.html instead.")
    else:
        print(f"\nbeehiiv: {resp.status_code} {resp.text[:140]} — paste newsletter.html instead")


if __name__ == "__main__":
    main()
