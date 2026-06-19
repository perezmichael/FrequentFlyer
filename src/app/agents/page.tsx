'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VIBES, VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';
import { navLink } from '@/features/frequent-flyer/design/patterns';

// ---- LA source directory ---------------------------------------------------
type Source = { name: string; format: string; slug: string; note: string; url: string };
type Group = { title: string; blurb: string; sources: Source[] };

const DIRECTORY: Group[] = [
    {
        title: 'Music & nightlife',
        blurb: 'Where the warehouse shows, residencies, and DJ nights live. Some ticketed, plenty free.',
        sources: [
            { name: '19hz Los Angeles', format: 'HTML', slug: '19hz', note: 'electronic / DJ / warehouse', url: 'https://19hz.info/eventlisting_LosAngeles.php' },
            { name: 'Resident Advisor LA', format: 'GraphQL', slug: 'ra', note: 'club nights, techno, house', url: 'https://ra.co/events/us/losangeles' },
            { name: 'Songkick LA', format: 'HTML', slug: 'songkick', note: 'concerts by artist/venue', url: 'https://www.songkick.com/metro-areas/17835-us-los-angeles' },
            { name: 'Bandsintown LA', format: 'API', slug: 'bandsintown', note: 'tour dates, live music', url: 'https://www.bandsintown.com/c/los-angeles-ca' },
            { name: 'The Echo / Echoplex', format: 'HTML', slug: 'theecho', note: 'Echo Park indie / DJ nights', url: 'https://www.theecho.com/' },
            { name: 'Zebulon', format: 'HTML', slug: 'zebulon', note: 'Frogtown live + listening', url: 'https://zebulon.la/' },
            { name: 'The Smell', format: 'HTML', slug: 'thesmell', note: 'all-ages DIY, DTLA', url: 'http://thesmell.org/' },
            { name: 'Teragram Ballroom', format: 'HTML', slug: 'teragram', note: 'mid-size indie / variety', url: 'https://www.teragramballroom.com/' },
        ],
    },
    {
        title: 'General & aggregators',
        blurb: '"What to do this weekend" lists. Filter hard for a real date + a real venue.',
        sources: [
            { name: 'Discover Los Angeles', format: 'HTML', slug: 'discoverla', note: 'official city events calendar', url: 'https://www.discoverlosangeles.com/events' },
            { name: 'We Like L.A.', format: 'HTML', slug: 'welikela', note: 'free + cheap weekend roundups', url: 'https://www.welikela.com/' },
            { name: 'Eventbrite LA', format: 'JS-RENDERED', slug: 'eventbrite', note: 'workshops, talks, pop-ups', url: 'https://www.eventbrite.com/d/ca--los-angeles/all-events/' },
            { name: 'Time Out LA', format: 'HTML', slug: 'timeout', note: 'editorial picks', url: 'https://www.timeout.com/los-angeles/things-to-do' },
            { name: 'LAist', format: 'HTML', slug: 'laist', note: 'local culture + events', url: 'https://laist.com/' },
            { name: 'The Scenestar', format: 'HTML', slug: 'scenestar', note: 'free shows / ticket alerts', url: 'http://www.thescenestar.com/' },
        ],
    },
    {
        title: 'Tech & creative meetups',
        blurb: 'Free pitch nights, hackathons, demo days — usually with food.',
        sources: [
            { name: 'Luma LA', format: 'JS-RENDERED', slug: 'luma', note: 'tech / AI / creative meetups', url: 'https://lu.ma/la' },
            { name: "Gary's Guide LA", format: 'HTML', slug: 'garysguide', note: 'startup / VC events', url: 'https://www.garysguide.com/events?region=losangeles' },
            { name: 'Partiful', format: 'JS-RENDERED', slug: 'partiful', note: 'social events (mostly invite)', url: 'https://partiful.com/' },
            { name: 'Meetup LA', format: 'JS-RENDERED', slug: 'meetup', note: 'hobby + community groups', url: 'https://www.meetup.com/find/?location=us--ca--Los%20Angeles' },
        ],
    },
    {
        title: 'Arts & culture',
        blurb: 'Free-admission days, openings, talks, screenings.',
        sources: [
            { name: 'The Broad', format: 'HTML', slug: 'thebroad', note: 'free general admission', url: 'https://www.thebroad.org/events' },
            { name: 'The Getty', format: 'HTML', slug: 'getty', note: 'always free', url: 'https://www.getty.edu/visit/cal/' },
            { name: 'Hammer Museum', format: 'HTML', slug: 'hammer', note: 'free programs + screenings', url: 'https://hammer.ucla.edu/programs-events' },
            { name: 'LACMA', format: 'HTML', slug: 'lacma', note: 'talks, music, free days', url: 'https://www.lacma.org/calendar' },
            { name: 'Grand Park', format: 'HTML', slug: 'grandpark', note: 'free DTLA programming', url: 'https://grandparkla.org/events' },
            { name: 'KCRW', format: 'HTML', slug: 'kcrw', note: 'curated music + culture events', url: 'https://www.kcrw.com/events' },
        ],
    },
    {
        title: 'Community & always-free',
        blurb: 'Public institutions whose programming is free by default — the bedrock.',
        sources: [
            { name: 'LA Public Library', format: 'HTML', slug: 'lapl', note: 'talks, classes, kids programs', url: 'https://www.lapl.org/whats-on/events' },
            { name: 'LA Parks & Rec', format: 'HTML', slug: 'laparks', note: 'fitness, parks, family', url: 'https://www.laparks.org/events' },
            { name: 'Grand Performances', format: 'HTML', slug: 'grandperformances', note: 'free summer concerts (DTLA)', url: 'https://grandperformances.org/' },
            { name: 'Levitt Pavilion LA', format: 'HTML', slug: 'levitt', note: 'free concerts, MacArthur Park', url: 'https://levittlosangeles.org/' },
        ],
    },
    {
        title: 'Markets & food',
        blurb: 'Free to attend even when the food costs money — weekend anchors.',
        sources: [
            { name: 'Smorgasburg LA', format: 'HTML', slug: 'smorgasburg', note: 'Sunday food + vintage market', url: 'https://www.smorgasburg.com/markets/los-angeles' },
            { name: 'Grand Central Market', format: 'HTML', slug: 'gcm', note: 'events + tastings', url: 'https://grandcentralmarket.com/events' },
            { name: 'Melrose Trading Post', format: 'HTML', slug: 'melrose', note: 'Sunday flea market', url: 'https://melrosetradingpost.org/' },
            { name: 'Off the Grid / farmers markets', format: 'HTML', slug: 'markets', note: 'rotating food markets', url: 'https://offthegrid.com/' },
        ],
    },
];

function buildPrompt(origin: string): string {
    return `You're contributing to Frequent Flyer — a curated map of Los Angeles events at frequentflyer.la. Insert event listings by POSTing JSON to our agent endpoint. Submissions land in a moderation queue and go live once approved, so accuracy matters more than volume.

# Endpoint
POST ${origin}/api/agent/submit
Content-Type: application/json
No API key required — the server writes with its own credentials. Just POST.

# Body
Send { "events": [ ... ] } with up to 50 events per request. Each event:
  title          REQUIRED. Plain text, ≤200 chars. Decode HTML entities. No date prefix.
  date           REQUIRED. "YYYY-MM-DD". Must be today or later — skip past events.
  start_time     "HH:MM" 24h, optional.
  end_time       "HH:MM" 24h, optional.
  vibe           one of the allowed vibes below (exact match). Defaults to "Community" if unknown.
  description    ≤400 chars, plain text. Strip HTML, decode entities.
  venue_name     the venue/place name, e.g. "Zebulon". Use "TBA" only if truly unknown.
  neighborhood   LA neighborhood, e.g. "Frogtown", "Echo Park", "DTLA".
  lat, lng       floats. LA box only: lat 33.6–34.5, lng -118.95 to -117.6. Outside that, OMIT both — the event still lists, just without a map pin. Never fabricate a pin.
  source_url     REQUIRED. The event's page URL. This is the dedup key.
  posted_by      short slug crediting your agent + source, e.g. "claude-19hz".

# Allowed vibes (use one, exact match)
${VIBE_KEYS.join(', ')}

# Hard rules
1. Always include source_url — it's how we dedupe. The server also rejects dups.
2. Only future events (date >= today).
3. LA only. If you can't resolve a real venue/street to coordinates inside the LA box, omit lat/lng. A guessed pin is worse than no pin.
4. Decode HTML entities (named &amp; and numeric &#8217;).
5. Pick the closest vibe from the list; don't invent new ones.
6. Don't post the same event twice — the server dedupes by source_url, but check your own batch too.

# Geocoding (free, no key)
GET https://nominatim.openstreetmap.org/search?q=<address>+Los+Angeles,+CA&format=json&limit=1
Header: User-Agent: <your-agent-name>/1.0   (required). Sleep >= 1.1s between calls.

# Example
{
  "events": [
    {
      "title": "All-Vinyl Disco Night",
      "date": "2026-07-12",
      "start_time": "21:00",
      "end_time": "02:00",
      "vibe": "Nightlife",
      "description": "Local selectors, strictly wax, no requests.",
      "venue_name": "Zebulon",
      "neighborhood": "Frogtown",
      "lat": 34.1066,
      "lng": -118.2363,
      "source_url": "https://zebulon.la/events/disco-night",
      "posted_by": "claude-zebulon"
    }
  ]
}

# When done
Report how many you inserted vs skipped (the response returns { inserted, skipped, duplicates, errors }).`;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                navigator.clipboard?.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                });
            }}
            className="font-space-mono uppercase text-[12px] tracking-[-0.44px] bg-brand text-cream rounded-full px-5 py-2 hover:opacity-85 transition-[opacity,transform] duration-150 active:scale-95"
        >
            {copied ? 'copied ✓' : 'copy prompt'}
        </button>
    );
}

const label = 'font-space-mono uppercase text-[12px] tracking-[-0.44px] text-black/50';

export default function AgentsPage() {
    // Start with a stable fallback so server and client first-render match
    // (avoids a hydration mismatch on the prompt text), then swap in the real
    // origin after mount so the copied prompt targets the right host.
    const [origin, setOrigin] = useState('https://frequentflyer.la');
    useEffect(() => setOrigin(window.location.origin), []);
    const prompt = buildPrompt(origin);

    return (
        <div className="min-h-screen bg-cream pt-[100px] grain-soft">
            <div className="page-container py-12 max-w-[860px]">
                {/* Hero */}
                <p className="stamp text-[12px] mb-5">for ai agents</p>
                <h1 className="font-space-grotesk text-[44px] sm:text-[56px] leading-[0.95] font-bold text-ink mb-4">
                    point your agent <em className="font-serif italic font-medium text-brand">at LA.</em>
                </h1>
                <p className="font-space-grotesk text-[17px] text-black/70 max-w-[560px] mb-3">
                    Frequent Flyer is an open map of Los Angeles events. AI assistants can help fill it —
                    hand the prompt below to your agent, point it at a source, and it&apos;ll start posting
                    listings to the map.
                </p>
                <p className="font-space-mono text-[13px] text-black/50 max-w-[560px]">
                    Everything an agent posts lands in our review queue first, so the map stays curated —
                    no open database, no exposed keys.
                </p>

                {/* How it works */}
                <h2 className={`${label} mt-14 mb-5`}>How it works</h2>
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                    {[
                        ['01', 'Copy', 'Hit copy on the prompt below.'],
                        ['02', 'Paste', 'Drop it into Claude, ChatGPT, Cursor, Gemini — anything with web access.'],
                        ['03', 'Ask', 'Tell it what to scrape: “find free DJ nights on 19hz this weekend.”'],
                        ['04', 'Review', 'New listings hit the queue; approve them and they’re on the map.'],
                    ].map(([n, t, d]) => (
                        <li key={n} className="flex gap-3">
                            <span className="font-space-mono text-brand text-[14px] shrink-0">{n}</span>
                            <span>
                                <span className="font-space-mono uppercase text-[13px] tracking-[-0.44px] text-ink">{t}</span>
                                <span className="block font-space-grotesk text-[14px] text-black/60 mt-0.5">{d}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                {/* The prompt */}
                <div className="mt-14 flex items-center justify-between mb-3">
                    <h2 className={label}>The prompt</h2>
                    <CopyButton text={prompt} />
                </div>
                <pre className="bg-ink text-flyer/90 rounded-xl p-5 overflow-x-auto text-[12px] leading-[1.55] font-space-mono whitespace-pre-wrap border border-black/40">
{prompt}
                </pre>

                {/* Source directory */}
                <h2 className={`${label} mt-16 mb-2`}>LA source directory</h2>
                <p className="font-space-grotesk text-[14px] text-black/60 mb-7 max-w-[600px]">
                    The places worth scraping for LA events. Each notes its format and a suggested{' '}
                    <code className="font-space-mono text-[12px] text-brand">posted_by</code> slug so listings credit their source.
                    Resident Advisor and Eventbrite are already covered by our own scrapers — point your agent at the rest.
                </p>
                <div className="flex flex-col gap-9">
                    {DIRECTORY.map((g) => (
                        <div key={g.title}>
                            <h3 className="font-space-grotesk font-bold text-[18px] text-ink">{g.title}</h3>
                            <p className="font-space-grotesk text-[13px] text-black/55 mb-3">{g.blurb}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {g.sources.map((s) => (
                                    <a key={s.slug} href={s.url} target="_blank" rel="noreferrer"
                                        className="lift block border border-black/15 hover:border-black/40 rounded-lg bg-cream px-3.5 py-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-space-grotesk font-bold text-[14px] text-ink truncate">{s.name}</span>
                                            <span className="font-space-mono text-[9px] uppercase tracking-[-0.4px] text-black/40 border border-black/20 rounded px-1.5 py-0.5 shrink-0">{s.format}</span>
                                        </div>
                                        <div className="font-space-grotesk text-[12px] text-black/55 mt-0.5">{s.note}</div>
                                        <div className="font-space-mono text-[11px] text-brand mt-1">posted_by: {s.slug}</div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Vibe guide */}
                <h2 className={`${label} mt-16 mb-3`}>Vibes</h2>
                <p className="font-space-grotesk text-[14px] text-black/60 mb-4 max-w-[600px]">
                    Each listing gets one <code className="font-space-mono text-[12px] text-brand">vibe</code> — it drives the marker
                    and the card styling. Pick the closest match.
                </p>
                <div className="flex flex-wrap gap-2">
                    {VIBE_KEYS.map((k) => (
                        <span key={k} className="font-space-mono text-[11px] uppercase tracking-[-0.44px] border border-black/25 rounded-full px-3 py-1 text-ink">
                            {VIBES[k]}
                        </span>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-black/10 flex items-center justify-between">
                    <Link href="/map" className={navLink}>← back to the map</Link>
                    <Link href="/create" className={navLink}>post one yourself →</Link>
                </div>
            </div>
        </div>
    );
}
