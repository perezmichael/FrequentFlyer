# Roadmap

Written 2026-08-01, after an assessment against two goals:

1. **An MVP worth linking from Instagram** — accurate, automatically scraped
   data, curatable through the week, good on desktop and mobile, on a real
   domain with SEO.
2. **I can plan my own weekend from it.** If it doesn't work for me, it doesn't
   work for anyone.

**Where we landed:** goal 2 fails outright — 1 of 27 events this weekend had a
start time. Goal 1 is close; the design and data-integrity foundations are
solid, but "automatic" isn't true yet and the domain isn't cut over.

Items are ordered. Anything marked **[you]** needs an account or a password I
don't have.

---

## P0 — Blocks goal 2

### 1. Extract start and end times in the scout

**The single highest-leverage fix.** Only 7% of scraped events have a start
time, because the Gemini prompt never asks for one. Its JSON schema is:

```
event_name, date, talent_name, talent_ig, category,
vibe_score, vibe_justification, description, price, event_url
```

- **Where:** `services/annex_scout/master_scout.py`, the prompt at ~line 775
  and the row insert that follows.
- **Do:** add `start_time` and `end_time` as `"HH:MM"` 24-hour fields. Apply
  the same rule as `price` — copy only what the text states, return `""`
  rather than guessing. A door time and a show time are different; prefer the
  show time and note the door in the description.
- **Validate:** reject anything that isn't `HH:MM`, and treat `00:00`–`04:00`
  as belonging to the same night, not the small hours of the previous day.
- **Verify:** re-scrape one venue, then check a weekend's coverage climbs from
  ~4% toward the 80%+ that venue pages actually publish.

### 2. Turn the scheduled scout on **[you]**

The workflow exists at `.github/workflows/scout.yml` and runs daily at 17:00
UTC, but no secrets are set, so nothing has run unattended since 2026-07-23.

Add under **Settings → Secrets and variables → Actions**:
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`.

A preflight step fails in seconds if any are missing. Trigger a manual run from
the Actions tab to confirm before trusting the schedule.

> The repo is public and the service key bypasses row-level security. Standard
> practice, but rotate the key in Supabase once this works — the current one
> has lived in a laptop `.env` for a while.

### 3. Backfill times on existing events

Once (1) ships, re-scrape with `FF_FORCE_RESCRAPE=1` so the ~200 existing rows
pick up times. The page-hash check would otherwise skip every unchanged venue.

---

## P1 — Blocks goal 1

### 4. Domain cutover **[you]** + push the SEO work

These are coupled and neither means much alone. The SEO foundation is committed
(`351d0ef`) but unpushed, and it advertises `frequentflyer.la`, which doesn't
resolve yet.

- Point the domain at Vercel in GoDaddy; add it in the Vercel project.
- If the cutover slips, set `NEXT_PUBLIC_SITE_URL=https://frequent-flyer.vercel.app`
  in Vercel as a stopgap so the sitemap stops advertising a dead host.
- Then submit `/sitemap.xml` in Google Search Console, which is also where the
  `Event` structured data gets validated.
- Consider `letter.` as a subdomain for beehiiv.

### 5. Recover flyers where a real one exists

42 of 210 upcoming events (20%) have no flyer; 31 of those reach the branded
typographic card. It's concentrated, and only part of it is fixable:

| Source | Count | Action |
|---|---|---|
| Eventbrite | 14 | Fetch `og:image` from the event page — easy, and includes every Village Well row |
| Regent + Elysian | 10 | Both publish event art; the scout isn't catching it. Likely a real extraction bug for those page shapes |
| Instagram (Cafe Tondo) | 15 | **Leave.** Instagram blocks scraping; the branded card is the honest answer permanently |

Recovering the first two takes the gap from 20% to ~9%. Reuse the
content-hash upload from `scripts/upload-flyers.mjs` so one image shared by
several events stays one object.

**Do not hide flyerless events.** It would drop a fifth of the inventory,
including headline shows, and comprehensiveness is the promise.

### 6. Stop publishing junk titles

One upcoming event has a completely empty title; 21 have titles that say
nothing — "Music Performance" ×4, "DJ's" ×4, "Live Music Showcase", "Chess".

- Reject empty titles at scrape time outright.
- For generic ones, prefer the talent name when the scraper has it
  ("Johnny Dynamite" beats "Live Music"), otherwise fall back to
  `"<Vibe> at <Venue>"` so the card at least locates itself.
- Clean the existing 22 in one pass.

### 7. Mark FF Picks every week **[you]**

Zero picks this weekend; two in the entire database. If taste is the
differentiator, it isn't visible. The toggle is in `/admin`, and the front page
already has a `★ FF PICKS` filter waiting for them.

---

## P2 — Product direction: "be a local somewhere"

The strongest thread from the Google Trends data: people are searching for
*recurring, participatory, non-dating* ways to meet people. The app's
`recurring_events` data is the right shape for that, and it's underused.

### 8. Venue pages — `/venue/[slug]`

The missing page. A venue's standing nights plus its upcoming one-offs, so
Village Well reads as "Open Mic every second Friday, Board Game Night every
third" rather than as scattered listings.

This is simultaneously the product expression of becoming a regular *and* the
page that ranks for "village well culver city events". Feed it from the
existing venue + events + recurring_events joins.

### 9. Analytics — and the case it makes to venues

Goal: be able to tell Village Well or The Elysian how much traffic Frequent
Flyer sent them.

**The persuasive metric is outbound clicks, not pageviews.** A venue can't
verify your dashboard, and won't be impressed by impressions. Two halves:

- **Tag outbound links.** Append
  `?utm_source=frequentflyer&utm_medium=referral` to every "Event page &
  tickets" link. The venue then sees *frequentflyer* in **their own** analytics.
  Third-party-verifiable beats a screenshot of yours, and it costs one helper
  function.
- **Log the click yourself.** A `link_clicks` table in Supabase —
  `event_id`, `venue_id`, `clicked_at`, coarse referrer. You own the data and
  it joins straight to venues, so "we sent Zebulon 340 clicks in August" is one
  query. Fire it from the existing outbound link handler.

For traffic *shape* (how many visitors, roughly where from), add Vercel Web
Analytics or Plausible — a script tag, no cookie banner needed for the
privacy-preserving ones.

**Constraints worth honouring:** log no personal data, keep geo at
city-level, and add a short privacy note before shipping any of it. Precise
visitor location is neither needed for this pitch nor worth the liability.

**Sequencing:** this only becomes meaningful once there's traffic. Build it
after the domain and SEO, not before — but tag the outbound links early, since
that data can't be reconstructed retroactively.

### 10. Venue addresses **[you]**

Honeys (Hollywood), Canyon (Echo Park) and Rediscover Glendale have no
coordinates — their flyers printed no address and coordinates are never
guessed. Send addresses and they get geocoded and pinned.

### 11. Run the UAT list **[you]**

`~/ff-uat-2026-07-26.md`, written and never run. Report item numbers.

---

## P3 — Cleanup

- **Carousel kit finishing touches:** the date-line display font (currently
  Space Grotesk standing in for the Figma face — send the name), and a cover
  slide, either from your artwork or typographic in the FF system.
- **Give `/agents` a home.** It was pulled from the nav and nothing links to it
  now, so it's URL-only and will rot unnoticed. Footer, or the foot of
  `/guides`.
- **Retire the launchd plists** in `services/annex_scout/` once Actions is
  confirmed, so there aren't two schedulers documented.
- **Monthly recurrence.** `recurring_events` only stores `day_of_week`, so
  "second Friday" can't be expressed — Village Well's Open Mic and Board Game
  Night are loaded as dated rows instead. Fine for now; revisit if monthly
  cadences become common.
- **`curation_level` has no value for hand-added events.** The check constraint
  allows only `scraped` / `ff_curated` / `promoted`, so editor-entered events
  are stored as `scraped` with the truth in `metadata.added_by`. Add `manual`
  to the constraint if that bothers you.

---

## P3 — Expanding to other cities

**Recommendation: stay in LA until it's undeniable.** Both goals point at depth,
and a weak second city actively damages the first — "the guy who knows the
events" doesn't survive being visibly wrong about San Francisco. But the
LA-isms are worth pulling into config now: it's about half a day, it makes the
code cleaner regardless, and it keeps the option open for free.

### Already city-agnostic

More than expected. **Neighbourhoods are derived from data, not hardcoded** —
the filter pills build themselves from whatever is in the database
(`HomeClient.tsx`, `EventsPageClient.tsx`, `RecurringEventsTab.tsx`). The map
centres on data. The schema has no LA columns. Series collapsing, flyer
handling, dedup, the SEO layer and the carousel kit are all generic.

### What is LA-bound

| Thing | Where |
|---|---|
| `LA_BOX` bounding box | `src/app/api/agent/submit/route.ts:25`, mirrored in the `/agents` prompt |
| ~41 copy strings | 15 files — "Los Angeles", "ACROSS LA" |
| Venue list | `services/annex_scout/venues.json` |
| Taste manifesto | `services/annex_scout/vibedoc.md` — explicitly "The Soul of the Eastside" |
| Source directory | `src/app/agents/page.tsx` — 19hz LA, RA LA, Songkick LA |
| Brand lockup, guides | Navbar, `GeneratedFlyer`, guide content |

**Do:** extract a `src/lib/city.ts` alongside `site.ts` holding name, bounding
box, default centre, source directory and manifesto pointer. Template the copy
strings off it.

### The actual constraint is people, not code

The pipeline is portable; the value isn't. What makes this good is that someone
who goes out in Echo Park picked those 41 venues and wrote a manifesto naming
vinyl-only sets and hand-drawn flyers. That document *is* the product, and it
can't be written for a city you don't live in — a cloned instance would be
Eventbrite with better typography, competing on completeness, which is exactly
where it loses.

The version that works is **one local curator per city**, each owning their own
`venues.json` and `vibedoc.md`. That means those become per-city database
records rather than repo files — a genuinely different product (a platform for
curators) than one person's curated map.

**The signal to expand is someone in another city asking to run it** — that's
demand rather than speculation, and it solves the curator problem in the same
move, because the person asking is the person with the taste.

---

## Reference: state as of 2026-08-01

- 210 upcoming approved events, 41 venues, 4 guides
- Flyer coverage 80%; start-time coverage 7% on scraped rows
- Feed collapses series: 246 raw listings → ~143 cards
- Scout last ran unattended 2026-07-23; everything since was manual
- Live at `frequent-flyer.vercel.app`; `frequentflyer.la` not yet cut over
