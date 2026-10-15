# Prompt provenance — the ask, and what shipped

Six features where the original framing did the real work, paired with the
commit that shipped the same day. Companion to [FEATURE-LOG.md](./FEATURE-LOG.md).

Prompts are **verbatim**, typos included — tidy them for publication if you want,
but the unedited version is the honest artifact.

> **Source and its limits.** Mined from local Claude Code session transcripts,
> which begin **29 May 2026**. Work before that date has no prompt record; the
> commit bodies are the only account of it. The transcripts themselves stay out
> of this repo — it's public and they carry correspondence and personal context.

---

## 1. Coverage is not the same as framing

**8 Aug 2026** → `246c09f` *fix(map): frame the cluster, not the strays*

> include pomona and fullerton but dont center the map around them stick to the LA area

**Why the framing worked.** One sentence separating two things that look like
one problem: *which venues belong in the data* and *where the camera sits*. The
obvious readings — drop the far venues, or add an LA bounding box — were both
wrong, and the prompt rules out the first explicitly.

**What shipped.** Sound & Fury legitimately ran kickoffs 40 miles out, and
fitting the viewport to them stretched the map from Santa Monica to San
Clemente, shrinking the actual LA cluster to a thumbnail. Every pin still
renders; only framing changed. Implemented *scale-relative* rather than as a
hardcoded LA box — it asks how far a pin is versus a typical one, not whether
it's inside Los Angeles, so it survives a second city. Pins beyond 4× the median
distance from the median centre are excluded from framing, and the crop is
abandoned entirely if it would drop more than a quarter of them.

---

## 2. Asking what to do, not what to build

**27 Jul 2026** → `af01757` *fix(ui): remove the heart button, which never did anything*

> anothe r thing we have hearts / favorite but i dont think it odes anything what should we do thta

**Why the framing worked.** "What should we do" rather than "make the heart
work." A directive would have produced a favourites system; the open question
left room for the answer to be *delete it*.

**What shipped.** The heart had no onClick, no state, no storage — no
localStorage anywhere in the app, no accounts to hang favourites on. Removed
rather than implemented: without accounts, saved events are per-device and lost
on a cache clear, and "a local Saved filter is worth building deliberately, not
as a retrofit to justify a button that was already there." Sharing, which does
work, already covers wanting to keep an event.

This is one of three in the same fortnight — with the hardcoded 4.9 rating and
the blanket "Free entry" label — where the fix was deletion. See *Things removed
because they lied* in the feature log.

---

## 3. Naming the failure mode in the same breath as the feature

**4 Aug 2026** → `befae1e` *feat(feed): this week's picks strip, and tidy scraped prices*

> I'm wondering if now that we have sweet FF picks if the app should actually default load to show them. What do you think about that? Is that a risk if nothing is there in that filter? Give me honest opinion

**Why the framing worked.** The empty-state risk is usually found in QA, or by a
user on a quiet week. Here it arrived attached to the feature request, which
changed the answer: the question stopped being *should picks be the default* and
became *what happens on a week with no picks*.

**What shipped.** The instinct was right and the risk was real — **22 of the
next 31 days had no pick at all**, so defaulting the feed to picks would have
shown an empty app. Instead: a strip above the feed with up to six from the
coming week. It hides itself entirely when a filter is active or a quiet week
leaves nothing curated, so it degrades to nothing rather than to an empty shelf.
Scoped to seven days because picks are a this-week idea — "six across the days
ahead is a stronger claim than nineteen spanning a fortnight."

---

## 4. A coverage number treated as a brand problem

**26 Jul 2026** → `70c4617` *feat: real imagery everywhere — venue photos + recovered event flyers*

> how many real images are pulled vs placeholders? I feel like if iits a lot of placeholders it really wouldnt capture the "Frequetn Flyer" brand

**Why the framing worked.** Asking for the ratio is the right diagnostic. The
insight is the second clause: a placeholder rate isn't a data-quality stat, it's
a brand failure on an app called *Frequent Flyer* whose whole look is a wall of
flyers. That reframing is what made it worth engineering time.

**What shipped.** Clearing unverifiable flyers the week before had been right
for trust but pushed placeholders to **30% of the feed**. Three fixes brought
real imagery back without guessing: gate uploads on image magic bytes rather
than content-type and drop the size floor from 5000 to 1500 bytes (the old floor
had silently rejected 17 pieces of well-compressed real artwork); send a Referer,
since some venue CDNs refuse hotlinks; and backfill `source_url` from the venue's
listing. Events sourced from their own event page went **19% → 79%**.

---

## 5. Spotting a data risk that compounds

**5 Sep 2026** → `093c35a` (#38) *feat(venues): treat a submitted venue as a claim, not a record*

> Im a little worried about letting people add their own addresses for new venues that I might not have. Then it will be saved with a wrong address for the next person. Any solution for this

**Why the framing worked.** "For the next person" is the whole insight. A single
wrong address is a small bug; a wrong address *offered to every subsequent
submitter as an existing venue* is a compounding one. Identifying it as a
propagation problem rather than a validation problem pointed straight at the
fix.

**What shipped.** It was already happening — `submitEvent` wrote directly into
the canonical venues table and `getVenuesForCreate()` handed every row back
unfiltered, so a venue literally named "new" had been sitting in the picker
since a test submission. Venues created by the public form now carry
`metadata.verified = false`: the row still exists, because the event has to
point at something, but it's kept out of the picker until a person promotes it
in `/admin/venues`. Notably, the gate shipped *before* the address field —
"adding an address field to that path would have made the same unreviewed write
one field wronger."

---

## 6. Real user testing, shipped the same day

**25 Jul 2026** → `aef5bc3` *fix: user-feedback pass — mobile map, sheet handle, real descriptions*

> Awesome, i've been showing the app to some users and got some feedback.
>
> 1. Map feature is a little buggy for andrioid users mobile
> 2. when you click an event in mobile it has the ios grab bar in the slide up sheet but it doesnt do anything
> 3. some of the descriptions seem ai generated instead of pulled from the event is that normal?
> 4. when you click the map on mobile i think it should fill to the edge under the tabs events/maps instead of having the rounded rectangle on desktop, does that make sense
>
> look through and try to identify each of these issues before fixing them

**Why the framing worked.** Observed symptoms, not diagnoses — and the closing
instruction ("identify each of these issues before fixing them") refused a
symptom-level patch. Item 3 is the standout: *"seem ai generated"* was a hunch
about provenance, not a complaint about quality, and the hunch was exactly right.

**What shipped, per item:**

1. **Android map jank** — a `ResizeObserver` called `invalidateSize()` on every
   container resize, and the mobile height used `100dvh`, which tracks Android
   Chrome's collapsing URL bar. Scrolling resized the map continuously,
   re-laying out and refetching tiles mid-gesture. Debounced the observer and
   switched to `100svh`.
2. **The decorative grab handle** — "decorative, which read as broken." It now
   drags: tracks the pointer 1:1, springs back under threshold, dismisses past
   110px or on a flick. The gesture is tracked on `window` rather than the
   40×26px handle, so it can't freeze mid-drag.
3. **"Descriptions seem AI generated"** — they *were* AI commentary.
   `getEvents` mapped `description ← metadata.justification`, which is the
   scout's internal vibe-score rationale ("aligns with the Niche & Alternative
   pillar"). The scout now extracts a real listing description from the venue's
   own page.
4. **Map flush to the edge** under the events/maps tabs on mobile.

---

## Using these

For a writeup, 1, 3 and 5 are the strongest — each shows a product instinct that
changed what got built, and each has a number attached (Santa Monica to San
Clemente; 22 of 31 days; a venue named "new" in the picker). 2 and 6 are the
best evidence of judgment about *process*: asking what to do rather than what to
build, and refusing a symptom-level fix.

More traces are available — the extraction covers 186 substantive prompts across
the whole 29 May – 15 Oct window, so other features can be matched on request.
