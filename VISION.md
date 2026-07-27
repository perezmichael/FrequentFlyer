# Why Frequent Flyer exists

Frequent Flyer is a local-events discovery app for Los Angeles. But the reason
it exists is two things at once, and keeping both in view is what keeps the
project honest.

## 1. A design-engineering showcase

This is a portfolio piece — proof of what I can do when design and engineering
aren't separate jobs handed between people, but one craft. The bar isn't "it
works," it's "it feels considered end to end":

- **A real design system, not a theme.** Cream paper, near-black ink, a single
  warm brick accent, monospace set in tight uppercase, fully-rounded pill
  controls. Editorial and zine-like on purpose. It's documented and rendered as
  a living page (`/design`) and enforced in code (`design/tokens.ts`,
  `design/patterns.ts`) — see `CLAUDE.md`.
- **A real pipeline behind it.** Python scouts scrape hand-picked LA venues,
  Gemini scores each event against a written taste manifesto (`vibedoc.md`),
  flyers get hunted and stored, and trusted venues auto-publish while everything
  else waits for review. The app looks alive because ingestion is always-on, not
  because the data is faked.
- **The details that read as intentional.** Emoji map clusters, a metro-wide
  default view, branded typographic placeholders instead of stock gradients, a
  detail sheet that's a bottom sheet on mobile and a modal on desktop. Small
  things, but they're the difference between a demo and a product.

If someone hiring for design engineering opens this repo or the live app, the
story should be obvious without me narrating it.

## 2. Being the guy who knows the events

The other half is just for me, and it's the part that makes it real.

I want to be the person who always knows what's on. Pull this up on a Sunday, or
run the scraper, and go *"wow — here are two sick events tonight."* Be the friend
who has the answer when someone asks what's happening. Even if nobody else ever
uses it, that's a win: a tool that makes me the guy who knows.

That's also the honesty check on the curation. The events it surfaces have to be
ones I'd actually be hyped to go to — vinyl listening rooms, goth nights,
grassroots art markets, the Eastside underground. If the feed ever fills up with
generic happy hours and I wouldn't screenshot it to a friend, the taste model is
off, not the code.

## The north star

Build it like a product I'm proud to show, and curate it like a scene I actually
want to be in. If both of those stay true, it works — as a portfolio piece and as
the thing that makes me the guy who knows the events.
