# Frequent Flyer

Local events discovery for Los Angeles — browse what's happening this week on a
split list/map view, see recurring nights, read venue guides, and create events
with a flyer studio.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS v4
(CSS-based, no `tailwind.config`) · Supabase (Postgres + storage) · react-leaflet
for maps · fabric.js for the flyer canvas.

## Project layout

- `src/app/**` — routes (`/`, `/events`, `/map`, `/guides`, `/create`, `/tips`,
  `/admin`, `/design`). Server Components fetch data; client behavior lives in
  `*Client.tsx` components.
- `src/features/frequent-flyer/**` — the main product: `components/`, `data/`,
  and `design/` (the design system source — see below).
- `src/features/admin/**` — admin tooling. **This is the only area that uses the
  shadcn primitives in `src/components/ui/*`** (and therefore the oklch tokens in
  `globals.css`). Leave those alone.
- `src/components/**` — a few genuinely shared components (Navbar wrapper, Map,
  loaders, FlyerCard) plus `ui/` (shadcn, admin-only).

---

# Design DNA

**This is the source of truth for how Frequent Flyer looks. Build new UI to it.**
The living, rendered version is the **`/design`** page — open it to see every
token and pattern as it actually ships. The code source is
`src/features/frequent-flyer/design/` (`tokens.ts` + `patterns.ts`).

## The look in one line

Cream paper, near-black ink, a single purple accent, monospace type set in
UPPERCASE with tight negative letter-spacing, and fully-rounded "pill" controls
with hairline borders. Editorial, zine-like, high-contrast.

## Colors (brand tokens)

Defined in `src/app/globals.css` (`--ff-*`) and exposed as Tailwind utilities.

| Token   | Hex       | Utility       | Use |
|---------|-----------|---------------|-----|
| Cream   | `#FFFAEB` | `bg-cream`    | App background; inverse text on dark fills |
| Ink     | `#1a1a1a` | `text-ink`    | Primary text & solid (black) fills |
| Accent  | `#5d39ac` | `text-accent` | Links, active/secondary states |
| Flyer   | `#efede1` | `text-flyer`  | Text on dark flyer artwork |

Borders are ink at low opacity: `border-black/40` (strong / pill outline),
`border-black/30` (inactive control), `border-black/5` (section divider).

> The `oklch(...)` `--primary`/`--secondary`/etc. tokens in `globals.css` are the
> shadcn scaffold — they power `src/components/ui/*` for the **admin** area only.
> Don't use them for product UI; use the brand tokens above.

## Type

- **Space Mono** (`font-space-mono`) — UI, nav, labels, pills. Usually `uppercase`
  with tight tracking (`tracking-[-0.64px]` for labels, `-0.44px` for small pills).
- **Space Grotesk** (`font-space-grotesk`) — flyer headings & display.
- **EB Garamond** (`font-serif`) — editorial / serif accents.

Sizes in use range `text-[11px]` (filter pills) → `text-[16px]` (nav/body) →
`text-[32px]`/`text-[64px]` (titles/hero). See `TYPE_SCALE` in `tokens.ts`.

## Canonical patterns — import, don't re-type

From `@/features/frequent-flyer/design/patterns`:

| Export | What it is |
|--------|------------|
| `navLink` | Top-nav text link (uppercase mono, underline on hover) |
| `createPill` | Primary CTA pill — outline that inverts to black-on-cream on hover |
| `filterPill(active: boolean)` | Small day/neighborhood filter pill (active = solid black, inactive = outlined) |
| `filterPillBase` / `filterPillActive` / `filterPillInactive` | The parts, if you need them separately |

```tsx
import { navLink, createPill, filterPill } from '@/features/frequent-flyer/design/patterns';

<Link href="/events" className={navLink}>events</Link>
<Link href="/create" className={createPill}>+ create</Link>
<button className={filterPill(isActive)}>Friday</button>
```

## Rules of thumb

- **Reuse before reinvent.** If a nav link / CTA / filter pill already exists in
  `patterns.ts`, import it. Add a new export there when you create a primitive
  that will repeat — don't inline a one-off variant.
- **Use brand tokens, not raw hex.** Prefer `bg-cream` / `text-ink` / `text-accent`
  over `bg-[#FFFAEB]` in new code. (Existing inline hex is being migrated.)
- **Labels are UPPERCASE mono with negative tracking.** That tightness is the
  signature — don't drop it on new controls.
- **Pills, not rectangles, for controls.** Fully rounded, hairline ink border;
  the selected state is solid black with cream text.
- **Don't touch the shadcn scaffold** (`src/components/ui/*`, oklch tokens) unless
  you're working on `/admin`.
- **When you change a token, update both** `globals.css` and `design/tokens.ts`,
  then eyeball `/design` to confirm.

## Known constraints

- `reactStrictMode` is **off** (`next.config.mjs`) — react-leaflet v4 throws
  "Map container is already initialized" under StrictMode's dev double-mount.
  Production is unaffected.
- Tailwind v4 arbitrary values (e.g. `bg-[#FFFAEB]`) work in `className`, but a
  few JIT arbitrary utilities (notably `z-[...]`) haven't generated reliably in
  this setup — use an inline `style` for those edge cases.
- `/events2` is intentionally kept with static data as a UI reference. Don't
  remove it.
