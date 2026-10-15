# Frequent Flyer — Feature & Decision Log

Raw material for case studies and portfolio writeups: what shipped, when, and
why. Organised by theme rather than by date, because the useful question is
"how did discovery get better" and not "what happened in August."

**Period covered:** 11 Dec 2025 → 15 Oct 2026 (10 months)
**Volume:** 164 commits, 49 merged PRs, every commit carrying a written rationale.

> **On sourcing.** Every "why" below is quoted or condensed from the commit body
> that shipped it — not reconstructed after the fact. Where a decision is
> especially worth retelling, the full reasoning is in
> [Decisions worth explaining](#decisions-worth-explaining).

---

## At a glance

| Phase | When | What it was about |
|---|---|---|
| Standing it up | Dec 2025 – Feb 2026 | Routes, admin dashboard, Supabase, flyer studio, mobile |
| Finding the look | May – Jun 2026 | Design system baseline, Brick accent, token migration, canonical patterns |
| Making it alive | Jul 2026 | Trust tiers, always-on scraping, detail sheet, shareable pages |
| Earning trust | Jul – Aug 2026 | Removing invented data, real prices, real flyers, editor authority |
| Being found | Aug – Sep 2026 | SEO, structured data, neighborhood routes, public API |
| Knowing if it works | Aug – Oct 2026 | PostHog, referral tagging, cost control |
| Opening the doors | Sep – Oct 2026 | Submissions that don't get lost, submitter contact, venue handles |

---

## 1. Things removed because they lied

The thread most worth telling. On an app whose entire claim is human curation,
UI that asserts something the database can't back is the most expensive kind of
bug — and the fix is usually deletion, not implementation.

| Shipped | What went | Why |
|---|---|---|
| 2026-07-26 (`9a15af7`) | Hardcoded **4.9 rating** on every card | No reviews, no column, nothing to compute it from. 200 identical "ratings" on one page; "the repetition gives it away on the second scroll." |
| 2026-07-26 (`236431d`) | Blanket **"Free entry"** label | Worse than the fake rating: an event showing *Free entry* in-app was $26.78 on DICE. "It changes what someone does, and they find out at the door." |
| 2026-07-27 (`af01757`) | The **heart button** | No onClick, no state, no storage. Removed rather than implemented — without accounts, favourites are per-device and lost on a cache clear. |
| 2026-07-26 (`9e793b1`) | **Guessed coordinates** | 28 of 59 venues had NULL lat/lng defaulting to downtown LA, stacking 130 events on one bogus pin. Now nullable end-to-end: an un-geocoded venue is skipped, not misplaced. |
| 2026-07-26 (`9e793b1`) | **DuckDuckGo flyer fallback** | Searching "{event} {venue} flyer" pulled corporate stock art for a film screening at *Human Resources*. "With a branded typographic placeholder available, no image beats a wrong one." |
| 2026-07-26 (`5a2be1d`) | Day pills showing the **wrong day**, heading overstating scope | — |
| 2026-07-28 (`4f02287`) | **"for ai"** nav item | — |

The positive corollary shipped alongside: `metadata.image_source` records flyer
provenance, so a bogus image is traceable rather than anonymous.

---

## 2. The feed — making "what's on" legible

| Shipped | Feature | Why |
|---|---|---|
| 2026-02-22 (`a13a9e9`) | Filter pill UI + date filtering | The canonical control pattern; now `filterPill()` in `design/patterns.ts` |
| 2026-07-23 (`db00294`) | **Event detail sheet**, live map, all-events default | The "aliveness" pass — opening a listing shouldn't cost a navigation |
| 2026-07-24 (`f0e2976`) | Detail sheet opens from recurring cards and map pins | One interaction model, not three |
| 2026-07-27 (`6facb3f`) | **Collapse a series into one card**; vary repeated images | A night running every Sunday was four identical tiles |
| 2026-08-04 (`d8abe9b`) | Merge recurring nights into the timeline, rank within the day | Recurring nights were a separate second-class list |
| 2026-08-04 (`befae1e`) | **This week's picks strip** | The curated tier had no entry point |
| 2026-08-05 (`997ae20`) | **Linkable neighborhood pages**, map follows the filter | 16 routes; the filter became a URL you can send |
| 2026-08-08 (`d7714e4`) | Time-boxed collections (e.g. Sound & Fury 2026) | — |
| 2026-08-08 (`e3a6039`) | **Sink sold-out shows** below what you can still get into | Ranking by what's actionable, not by what exists |
| 2026-07-26 (`236431d`) | FF Picks filter pill | Hidden until at least one pick exists, so it can't be tapped into an empty view |
| 2026-10-15 (#52) | Venue Instagram folded into the venue row | Measured: a separate meta row pushed the share button off a 375×812 screen |

## 3. Map

| Shipped | Feature | Why |
|---|---|---|
| 2026-06-10 (`85eb7ee`) | De-blue the basemap | Default tiles fought the cream/brick palette |
| 2026-07-25 (`8c7a468`) | Representative pins + normalised dedup | — |
| 2026-07-25 (`af3cf1e`) | Intentional pins for venue vs guide markers | — |
| 2026-08-03 (`90e5f16`, `a123116`) | Formatted popup date, FF Pick in popup, stacked date/time stamp | — |
| 2026-08-08 (`246c09f`) | **Frame the cluster, not the strays** | One outlying venue zoomed the map out to uselessness |
| 2026-08-30 (`7b29444`) | Read a CARTO key | The basemap was stamping its own watermark |

> **Known constraint:** `reactStrictMode` is off — react-leaflet v4 throws
> "Map container is already initialized" under StrictMode's dev double-mount.
> Production is unaffected. (`5f57c6a`, 2026-05-30)

## 4. Curation & editorial control

The through-line: an automated pipeline must never overwrite a human's judgment.

| Shipped | Feature | Why |
|---|---|---|
| 2026-07-23 (`997868a`) | **Trust-tier auto-publish** + vibe-score gate | Trusted venues publish automatically; everything else queues for review. Also switched a blind upsert to select-then-insert, so re-scrapes stopped resetting approved events to pending |
| 2026-07-26 (`75f7064`) | FF Pick toggle + curated card treatment | — |
| 2026-08-03 (`b5686dc`) | **Editor edits outrank the scraper** | The scout rewrote title/date/time on every re-match — "fix *Music Performance*, watch it come back tomorrow." Introduced `editor_locked` + `scraped_values` so divergence stays visible |
| 2026-08-03 (`82071d7`) | One event editor shared by `/admin` and `/admin/kit` | — |
| 2026-08-09 (`e78c29f`) | Venue editor; read the address printed on the flyer | — |
| 2026-09-23 (#47) | **Move editor decisions out of the metadata blob into columns** | The blob was rebuilt on every scrape, so a lock written on a scraped event survived only until that venue was next scraped |

## 5. Supply — the scout pipeline

| Shipped | Feature | Why |
|---|---|---|
| 2026-06-18 (`49f5311`) | `/agents` — bring-your-own-scraper supply engine | — |
| 2026-07-23 (`997868a`) | Always-on freshness: daily job, page-hash change detection, today+30d window | Skip the model entirely when a venue page hasn't changed |
| 2026-07-26 (`087df10`) | Score event-detail links to win more real flyers | — |
| 2026-07-26 (`c11d69e`) | `reverify_flyers` — fix images a venue re-scrape never revisits | — |
| 2026-07-28 (`e607186`) | Move the scout from launchd to **GitHub Actions** | launchd couldn't read `~/Desktop` under macOS TCC |
| 2026-08-03 (`73d7bda`) | Extract start **and end** times | — |
| 2026-08-04 (`82dd532`) | **Read events out of flyer images** (vision import) | Many venues publish a JPEG and nothing else |
| 2026-08-07 (`3846597`) | Fail the run when every Gemini call fails | A silent all-failure run looked like "no new events" |
| 2026-08-08 (`a47d96f`) | Read robots.txt **as ourselves**, not as python-urllib | Identify the bot honestly, then honour what it's told |
| 2026-08-08 (`6d485cf`) | Normalise promoter names so they group | — |
| 2026-10-13 (#49) | Move off `gemini-2.5-flash` | Retired for new API accounts; added model fallback + retry |

## 6. Flyers & imagery

| Shipped | Feature | Why |
|---|---|---|
| 2026-07-26 (`0fafbeb`) | Stop showing one event's poster on another | — |
| 2026-07-26 (`70c4617`) | Real venue photos + recovered event flyers | — |
| 2026-07-27 (`5dfa09b`) | **Address uploads by content hash, not event id** | One flyer advertising four Sundays became four URLs of identical bytes, defeating the repeat-detection that had just shipped |
| 2026-08-04 (`3803cc2`, `129210a`) | Recursive import folders; match venues on `&` vs `and`; geocode new ones | — |
| 2026-08-05 → 09 (`f5df5e5`, `b68b9b4`, `9dfbcc7`, `578b59b`) | Attach flyers to existing events instead of duplicating; refuse orphan events; don't attach a series poster's lineup to every date; re-encode large PNGs | — |
| 2026-08-09 (`cfc7329`) | Stop the second update overwriting an editor's flyer | — |
| 2026-09-22 (#44, #45) | Store a flyer's **real media type**; sniff venue photos too | 19 of 27 venue photos were WebP or PNG labelled `image/jpeg` |
| 2026-10-14 (#50) | Serve flyers directly | Vercel's image optimiser hit its free-tier quota and started 402-ing |

## 7. Submissions — opening the doors

| Shipped | Feature | Why |
|---|---|---|
| 2026-05-30 (`e2dffa7`) | Public event creation + recurring events | — |
| 2026-09-05 (#36) | Make the flyer upload work; leave uploaded art alone | Uploaded art was being defaced by the pipeline |
| 2026-09-05 (#38) | **Treat a submitted venue as a claim, not a record** | A stranger's typo shouldn't silently become the venue of record |
| 2026-09-05 (#35) | Stop the review queue losing events and submissions | Filter-ordering bug hid submissions behind a status check |
| 2026-10-14 (#51) | Capture **who submitted** (email + Instagram) | Ten people had submitted with no way to reach any of them |
| 2026-10-15 (#52) | Ask for the ticket link and the venue's handle; auto-fetch a flyer from the ticket page | — |

## 8. Shareability & SEO

| Shipped | Feature | Why |
|---|---|---|
| 2026-07-24 (`114a064`) | **Shareable `/event/[id]` pages** with OG unfurl + share buttons | The flyer becomes the link preview when texted — the whole point of a shareable page |
| 2026-08-01 (`351d0ef`) | robots, sitemap, per-page metadata, Event structured data | — |
| 2026-08-27 (#33) | Tell machines what the database already knows | Lineup, price and timezone-correct start were in the DB and reaching no markup |
| 2026-09-23 (#46) | Canonical on every page; `/events2` says noindex | Without it, every listing declared itself a duplicate of the homepage |
| 2026-09-19 (#39, #41) | Public read API, docs, legal pages; `/api/v1` describes itself | Built for the Meta Muse connector submission |

## 9. Measurement

| Shipped | Feature | Why |
|---|---|---|
| 2026-08-04 (`304d6a6`) | Analytics, referral tagging, a scraper that identifies itself | — |
| 2026-08-07 (`0605f19`) | Record what can't be reconstructed later | — |
| 2026-08-24 (#31) | **PostHog** — answer whether anyone comes back | — |
| 2026-09-05 (#34) | Measure whether anyone narrows the feed | — |
| 2026-10-14 | `event_opened` on the detail sheet | Opening a listing renders in place — not a navigation, so page views structurally could not see it. A week reading "61 landed on /, 2 reached an event page" understated engagement by an unknown amount |

## 10. Performance & cost

| Shipped | Feature | Why |
|---|---|---|
| 2026-08-08 (`3099f9b`) | Lazy-load images | A page view cost 64MB |
| 2026-08-10 (`704f0f7`) | Serve flyers through `next/image` | — |
| 2026-08-24 (#30) | Stop re-encoding the same flyers every minute | — |
| 2026-09-20 (#42) | Scout coverage, flyer integrity, image cache | — |
| 2026-10-14 (#50) | `unoptimized: true` + downscaled device sizes | Quota exhaustion; **revert when the quota resets** |

## 11. Design system, motion & accessibility

| Shipped | Feature | Why |
|---|---|---|
| 2026-05-30 (`6222004`, `be310e4`) | Design system baseline; **Brick `#C2371B`** adopted as brand accent | Lives in its own `brand` namespace because shadcn already owns `--color-accent` for admin |
| 2026-05-30 (`0700343`, `d2debe4`) | Migrate inline hex to brand tokens; unify filter pills on one pattern | — |
| 2026-06-10 (`85eb7ee`) | Style pass: motion language, print-shop details, voice | — |
| 2026-07-26 (`b97241c`) | **Reduced-motion coverage**, touch-safe hovers, motion tokens | — |
| 2026-08-14 (`fa94274`) | Stop hover latching after tap; paint under the notch | A tapped card stayed in its inverted hover state on touch |
| 2026-07-28 (`6608ae0`) | Reveal the desktop nav at 1024px, not 768px | — |

---

## Decisions worth explaining

The six with a real tradeoff, for longer-form writeups.

**1. Deleting the rating, the price label and the heart (Jul 2026).**
Three separate commits, one principle: *UI making a claim the app doesn't
honour*. The 4.9 was invented, "Free entry" was actively wrong at the door, and
the heart did nothing. Each was cheaper to remove than to implement, and
removing them is what makes the remaining claims credible. The heart commit is
explicit that a Saved filter is "worth building deliberately, not as a retrofit
to justify a button that was already there."

**2. Editor authority over an automated pipeline (Aug–Sep 2026).**
Shipped twice. First as `metadata.editor_locked` — the scout strips locked keys
before updating. Then re-shipped as real columns, because the metadata blob was
being *rebuilt* rather than merged by every writer, so locks silently
evaporated. The second fix is the interesting one: the bug wasn't in the locking
logic, it was in the storage medium.

**3. Content-addressed flyers (Jul 2026, extended Oct 2026).**
Keying storage by sha1 of the bytes rather than by event id meant one flyer is
one object however many events cite it — which let the feed's repeat-detection
work at all. The same idea later solved a different problem: new bytes produce a
new URL, which defeats both `next/image`'s 31-day cache and Cloudflare's.

**4. No image beats a wrong image (Jul 2026).**
Killing the DuckDuckGo fallback traded coverage for integrity, and only worked
because a branded typographic placeholder already existed. The generated flyer
isn't a degraded state — it's what makes refusing a wrong image affordable.

**5. Trust tiers instead of all-or-nothing publishing (Jul 2026).**
Neither "review all 200" nor "publish everything" is workable solo. Venue-level
trust plus a quality gate makes the review queue proportional to risk.

**6. Measuring the thing page views structurally cannot see (Oct 2026).**
The detail sheet renders in place, so every listing opened from the feed counted
as nothing. The metric wasn't low — it was blind.

---

## Keeping this current

```bash
git log --reverse --date=short --format='%ad %h %s' <last-logged-hash>..HEAD
```

Then add the new entries to the right theme. Commit bodies hold the rationale —
`git log -1 --format='%b' <hash>`.

## What else exists as raw material

- **Commit bodies** — 164 of them, all written. The richest source; most of this
  document is condensed from them.
- **Session transcripts** — roughly 3,560 typed prompts across 9 sessions,
  covering **29 May 2026 onward only**. The first 5½ months have no prompt
  record. They live in `~/.claude/projects/` and are **deliberately not in this
  repo**: it's public, and they contain correspondence and personal context.
  Six features are already traced back to the prompt that triggered them in
  [PROMPT-PROVENANCE.md](./PROMPT-PROVENANCE.md); others can be matched on
  request.
- **PostHog** — live behavioural data for anything shipped after 25 Aug 2026,
  which is where outcome numbers for a case study would come from.
- **`vibedoc.md`**, **`AUDIENCE.md`**, **`VISION.md`** (uncommitted) — the
  editorial and strategic reasoning behind curation choices.
