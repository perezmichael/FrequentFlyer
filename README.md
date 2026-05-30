# FrequentFlyer

Curated local events discovery for LA's Eastside — Echo Park, Silver Lake, Highland Park, DTLA, Koreatown, and beyond.

A Python scraping pipeline finds events at local venues each week, a human curator approves them via an admin dashboard, and the public site surfaces them as a browsable grid + interactive map.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v4 |
| UI | shadcn/ui, Radix UI, Framer Motion |
| Map | Leaflet + react-leaflet |
| Canvas editor | Fabric.js |
| AI | Google Gemini 2.5 Flash |
| Database / Storage | Supabase (PostgreSQL + Storage) |
| Scraper | Python, Playwright, BeautifulSoup |

---

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Homepage (split grid + map)
│   │   ├── events/             # Full events listing with filters
│   │   ├── map/                # Full-screen map view
│   │   ├── guides/             # Neighborhood walking guides
│   │   ├── admin/              # Admin dashboard (protected)
│   │   └── admin/studio/       # Creator Studio (flyer canvas editor)
│   ├── features/
│   │   ├── frequent-flyer/     # Public-facing components + types
│   │   └── admin/              # Admin components
│   ├── components/             # Shared UI components
│   └── lib/
│       ├── queries.ts          # All Supabase data fetching
│       ├── supabase.ts         # Supabase client (server-only)
│       └── gemini.ts           # Gemini AI client
└── services/
    └── annex_scout/            # Python scraping pipeline
        ├── master_scout.py     # Main scraper (runs weekly)
        ├── ff_curator.py       # Generates weekly production menu
        ├── venues.json         # Venue list with URLs + neighborhoods
        └── vibedoc.md          # Editorial manifesto (AI system prompt)
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create `.env.local` in the project root:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_google_gemini_api_key
ADMIN_SECRET=your_chosen_admin_password
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Admin Dashboard

The admin dashboard lives at `/admin`. It is password-protected — use the `ADMIN_SECRET` value from your `.env.local`.

From the dashboard you can:
- **Approve / reject** scraped events before they go live
- **Edit** event name, date, vibe category
- **Upload** a flyer image manually
- Access the **Creator Studio** to design event flyers with a Fabric.js canvas and AI-generated vibe styles

---

## Scraper (annex_scout)

The scraper visits 9 Eastside venue websites using headless Chromium, extracts event text, and uses Gemini AI to parse and score events against the editorial manifesto (`vibedoc.md`). Scraped events land in Supabase with `status = 'pending'` for human review.

### Setup

```bash
cd services/annex_scout
pip install playwright google-genai supabase python-dotenv requests
playwright install chromium
```

Create `services/annex_scout/.env`:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### Run

```bash
cd services/annex_scout
python master_scout.py
```

The scraper automatically computes the current Monday–Sunday date window. Run it at the start of each week to populate fresh events.

### Add a new venue

Edit `venues.json` and add an entry:

```json
{
  "name": "Venue Name",
  "neighborhood": "Echo Park",
  "url": "https://venuename.com/events"
}
```

### Generate the weekly production menu

```bash
python ff_curator.py
```

Outputs a curated shortlist of the week's highest-scored events to a text file.

---

## Database (Supabase)

Key tables:

| Table | Purpose |
|-------|---------|
| `events` | Scraped + manually created events (`status`: pending / approved / rejected) |
| `venues` | Venue directory with name, neighborhood, lat/lng, URL |
| `talent` | Artists/performers linked to events |
| `guides` | Curated neighborhood walking guides |
| `guide_items` | Individual stops within a guide, linked to venues |

Storage bucket: `event-flyers` — public bucket for flyer images uploaded by the scraper or admin.

---

## Deployment

The Next.js app deploys to Vercel. Set the same environment variables from `.env.local` in your Vercel project settings.

The scraper runs locally (or on a cron job / scheduled server). It is not part of the Next.js deployment.
