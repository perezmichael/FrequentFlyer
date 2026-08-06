# Audience capture — parked, not abandoned

**Status:** deliberately not built (Aug 2026). Revisit when the triggers below are met.

The goal is an audience we own rather than rent: a list that survives an
Instagram algorithm change, and that a sponsor can be shown. Email, phone, and
app profiles are three instruments for that one goal. We're not building any of
them yet, and the reason is specific enough to be worth writing down — so this
gets reconsidered on evidence rather than re-argued from scratch.

---

## What we already know, from actually trying it

A Beehiiv newsletter ran for ~5 months with the link in the Instagram bio.

| | |
|---|---|
| Subscribers gained | ~30 |
| Rate | ~1.5 / week |
| Cost | 3–4 hrs/week of writing, on top of the post |
| Outcome | Abandoned |

**The diagnosis matters more than the number.** The obvious read is "writing it
was too expensive," and that's true — but it isn't what killed it. Even at zero
production cost, 1.5 subscribers a week is ~78 after a year, which is not an
asset anyone would pay for.

The binding constraint was **acquisition**, and it's structural:

```
Aug 2026 post:  481 reach → 24 profile visits → 1 external link tap
Newsletter:     5 months of bio link → ~30 subscribers
```

Those two numbers agree. **The Instagram bio link is a bad acquisition
channel** — it's a three-step ask (see post → visit profile → tap bio → type
email) and almost nobody finishes it. Automating the newsletter's production
would have produced a *cheap* dead newsletter instead of an expensive one.

Corollary worth remembering: the same week, the **paid** ad got 8 link clicks
on 100 views. A link *in the creative* converts roughly two orders of magnitude
better than a link in the bio. Any future capture push should ride that path,
not the bio.

---

## The other reason to wait: there's no reason to sign up

Neither reference company got where they are on a list.

- **TBPN** — no meaningful email business. Attention lives on the platforms and
  is monetized directly through sponsors.
- **The Infatuation** — the asset was ~12 years of search real estate and an
  editorially-judged restaurant database. That's what Chase bought in 2021; you
  can't plug a follower count into a Sapphire Reserve dining benefit. Email was
  a layer added on top of scale, not the thing that created it.

So the current bet is that the **durable owned asset is the site's search
footprint** (`/venue/[slug]`, guides), which compounds at zero weekly cost,
rather than a list that costs hours every week forever.

Capture becomes worth building when the app does something that *needs to know
who you are* — not before.

---

## The unanswered question

> *"The app might need a reason for people to create a profile."*

Right, and this is the actual blocker. Identity has to follow a reason, never
precede it. **"Make an account to browse" would kill a discovery product** —
the whole value is that you can pull it up cold and get an answer.

Candidate reasons, honestly ranked:

### Strong — genuinely impossible without identity

1. **Reminders for what you saved.** Saving an event is worthless if you forget
   it. *"Tonight, 8pm: the thing you saved at Zebulon"* is real value, and it
   cannot exist anonymously. This is the strongest case, and it's where a phone
   number earns its keep rather than being greedy.
2. **Follow a venue or a recurring night.** *"Tell me when General Lee's posts
   something new."* Ongoing, personal, needs an address to send to.
3. **Save a weekend itinerary.** Ties directly to the founding goal — *"can I
   pull it up myself and find an itinerary for the weekend."* If the app builds
   itineraries, a profile is what keeps one.

### Weak — don't build these as the reason

- **Social features / friends / "who else is going."** Needs network effects we
  don't have. An RSVP list showing zero people is worse than no RSVP list.
- **Personalization.** Needs a volume of behavioral data we're nowhere near.
- **Bookmarking alone.** The browser and Instagram already do this. Not a
  reason on its own — only valuable once reminders sit on top of it.

**The sequencing this implies:** build reminders first, and let the identity
capture be the thing standing between someone and a reminder they want. That
inverts the usual failure, where a signup wall stands between someone and the
content.

---

## Spec, for whenever this happens

Kept so the design decisions don't have to be re-derived.

### Placement rules — non-negotiable

- **No modal, no popup, no overlay.** Not on load, not on scroll, not on exit
  intent.
- A slim band **spanning a feed row** (not occupying a card slot, so it never
  displaces an event), below the fold, after ~8–10 cards — the ask comes after
  someone has seen what this is.
- A second, quieter copy in the footer.
- **Dismissible, and it stays dismissed** (`localStorage`).
- Disappears entirely once subscribed.
- Built from existing design tokens — `border-black/40` hairline, uppercase
  Space Mono with the negative tracking, `createPill` for submit. It should read
  as page furniture, like the filter pills, not as an ad someone bolted on.

One field. Email only. Every extra field costs conversion; segment later.

### Data

```sql
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now(),
  source text,                           -- 'feed' | 'footer' | 'instagram' | 'ad'
  status text default 'active',          -- active | unsubscribed | bounced
  unsubscribe_token uuid default gen_random_uuid()
);
```

**This table must not be publicly readable.** The events tables are public-read
by design; a table of email addresses cannot be. Writes go through a server
action on the service role; no select path is exposed to the client. This is the
one place where getting it wrong is a real problem rather than a bug.

`/agents` already attracts bot traffic — a honeypot field and per-IP rate
limiting ship with the endpoint, not after it.

Behaviour: inline confirmation, no redirect. A duplicate says "you're already on
the list" rather than erroring.

### Sending, if it ever happens

- **Resend**, triggered from the existing GitHub Actions cron. The template
  renders from `weekPicks` — the same data behind the picks strip and the
  carousel. The send must cost ~zero marginal effort or it dies like the last
  one did.
- **A working unsubscribe link ships with the first send, not later.** US
  commercial email also legally requires a physical postal address in the
  footer — for a solo operator that usually means a PO box. Know this before
  starting, it's a real constraint.
- Keep the list in our own Supabase. If open rates and a public archive are ever
  needed for a media kit, export to Beehiiv then — portable because we own it.
  Starting on a hosted platform means renting the list from day one, which is
  the exact dependency this whole idea exists to avoid.

### Phone numbers — higher value, higher bar

SMS engagement dramatically beats email, which is what makes it attractive for
the reminder use case. But it's more intrusive and more regulated: **TCPA
requires express written consent** for marketing texts, with clear disclosure at
the point of capture and working opt-out handling. A transactional reminder for
something the user explicitly saved is a much safer footing than a weekly
marketing blast — another argument for reminders being the entry point.

---

## Triggers — revisit when any of these is true

- **The site gets real traffic.** At ~15 weekly visitors to `/`, even a 5%
  capture rate is under one signup a week. Somewhere north of ~500 weekly
  visitors the math stops being a rounding error.
- **A reminder feature exists**, or is next up — then capture is a dependency
  rather than a standalone ask.
- **A better acquisition path opens up** — a direct link in ad creative or in a
  carousel slide, rather than the bio.
- **A sponsor conversation gets specific.** If someone asks "what's your
  audience," a list becomes worth having on its own terms.

Until then: **not building this is the decision, and it's an informed one.**
