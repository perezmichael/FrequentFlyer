import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '@/lib/site';


export const metadata: Metadata = {
    title: 'API docs',
    description: `The free, read-only ${SITE_NAME} API — upcoming Los Angeles events as JSON, no key required.`,
};

/**
 * Public documentation for the read API.
 *
 * Two readers: a developer deciding whether to bother, and a connector reviewer
 * checking that the thing described actually exists. Both want the same page —
 * concrete endpoints, real example responses, and the limits stated plainly
 * rather than buried.
 */

const label = 'font-space-mono uppercase text-[12px] tracking-[-0.44px] text-black/50';
const h2 = `${label} mt-16 mb-4`;
const p = 'font-space-grotesk text-[16px] leading-[1.65] text-black/75 mb-4 max-w-[62ch]';
const codeInline = 'font-space-mono text-[13px] text-brand';
const pre = 'bg-ink text-flyer/90 rounded-xl p-5 overflow-x-auto text-[12px] leading-[1.55] font-space-mono whitespace-pre border border-black/40 mb-4';
const linkCls = 'text-brand underline underline-offset-2 hover:opacity-70';

/** Broad words that match well against the free-text categories in the data. */
const VIBE_EXAMPLES = [
    'music', 'comedy', 'dj', 'market', 'film', 'art',
    'theater', 'reading', 'workshop', 'community', 'trivia', 'festival',
];

const ENDPOINTS: { method: string; path: string; what: string }[] = [
    { method: 'GET', path: '/api/v1/events', what: 'Upcoming LA events, soonest first. Filter by date, neighborhood, category or curation level.' },
    { method: 'GET', path: '/api/v1/events/{id}', what: 'One event in full, including the lineup and street address.' },
    { method: 'GET', path: '/api/v1/neighborhoods', what: 'Valid neighborhoods with live counts, plus every valid category value.' },
    { method: 'GET', path: '/api/openapi.json', what: 'The OpenAPI 3.1 document describing all of the above.' },
];

const PARAMS: { name: string; type: string; what: string }[] = [
    { name: 'date', type: 'YYYY-MM-DD', what: 'Events on one specific day (LA local date).' },
    { name: 'from', type: 'YYYY-MM-DD', what: 'Earliest date, inclusive.' },
    { name: 'to', type: 'YYYY-MM-DD', what: 'Latest date, inclusive.' },
    { name: 'neighborhood', type: 'string', what: 'Name or slug — "Echo Park" and "echo-park" both work.' },
    { name: 'vibe', type: 'enum', what: 'One of the categories listed further down.' },
    { name: 'curation', type: 'enum', what: 'scraped · ff_curated · promoted' },
    { name: 'limit', type: 'integer', what: 'Max results. Default 100, cap 500.' },
];

const EXAMPLE = `{
  "source": "Frequent Flyer",
  "source_url": "${SITE_URL}",
  "city": "Los Angeles",
  "attribution": "Event data from Frequent Flyer (${SITE_URL}). Please link back when citing a listing.",
  "license": "Free to use with attribution. Not for bulk redistribution.",
  "count": 1,
  "total_matching": 6,
  "filters": { "neighborhood": "echo-park", "date": "2026-09-19", ... },
  "events": [
    {
      "id": "9f3c…",
      "title": "Dublab Presents: Night Sky",
      "description": "Ambient listening session on the patio.",
      "date": "2026-09-19",
      "start_time": "20:00",
      "starts_at": "2026-09-19T20:00:00-07:00",
      "timezone": "America/Los_Angeles",
      "venue": {
        "name": "Zebulon",
        "neighborhood": "Frogtown",
        "lat": 34.0954, "lng": -118.2265
      },
      "price": "$15",
      "sold_out": false,
      "vibe": "Music",
      "curation": "ff_curated",
      "curation_note": "Hand-picked and checked by the Frequent Flyer editor.",
      "vibe_score": 8,
      "ticket_url": "https://zebulon.la/…",
      "frequent_flyer_url": "${SITE_URL}/event/9f3c…"
    }
  ]
}`;

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-cream pt-[100px] grain-soft">
            <div className="page-container py-12 max-w-[860px]">
                <p className="stamp text-[12px] mb-5">developers &amp; agents</p>
                <h1 className="font-space-grotesk text-[44px] sm:text-[56px] leading-[0.95] font-bold text-ink mb-4">
                    the LA events <em className="font-serif italic font-medium text-brand">API.</em>
                </h1>
                <p className="font-space-grotesk text-[17px] text-black/70 max-w-[58ch] mb-3">
                    Every upcoming event on Frequent Flyer, as JSON. Free, read-only, no
                    key and no account. Built for AI assistants and connectors answering
                    &ldquo;what&apos;s happening in LA this weekend.&rdquo;
                </p>
                <p className="font-space-mono text-[13px] text-black/50 max-w-[58ch]">
                    Every listing is approved by a human before it appears — this is a
                    curated feed, not a scrape.
                </p>

                <h2 className={h2}>Quick start</h2>
                <pre className={pre}>{`curl "${SITE_URL}/api/v1/events?neighborhood=echo-park&limit=5"`}</pre>
                <p className={p}>
                    That&apos;s the whole setup. No headers, no auth. Point your agent at the{' '}
                    <a href="/api/openapi.json" className={linkCls}>OpenAPI document</a> and it
                    can build the rest itself.
                </p>

                <h2 className={h2}>Endpoints</h2>
                <div className="flex flex-col gap-4">
                    {ENDPOINTS.map(e => (
                        <div key={e.path} className="border-b border-black/5 pb-4">
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="font-space-mono text-[11px] uppercase tracking-[-0.44px] bg-ink text-cream rounded-full px-2.5 py-1">{e.method}</span>
                                <code className="font-space-mono text-[14px] text-ink">{e.path}</code>
                            </div>
                            <p className="font-space-grotesk text-[14px] text-black/60 mt-2 max-w-[60ch]">{e.what}</p>
                        </div>
                    ))}
                </div>

                <h2 className={h2}>Query parameters</h2>
                <p className={p}>
                    All optional, all on <code className={codeInline}>/api/v1/events</code>. An
                    invalid value returns <code className={codeInline}>400</code> naming the problem
                    and listing what&apos;s allowed — it never silently falls back to the
                    unfiltered feed.
                </p>
                <div className="flex flex-col gap-3">
                    {PARAMS.map(q => (
                        <div key={q.name} className="flex gap-4 items-baseline flex-wrap border-b border-black/5 pb-3">
                            <code className="font-space-mono text-[13px] text-brand w-[112px] shrink-0">{q.name}</code>
                            <span className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/40 w-[92px] shrink-0">{q.type}</span>
                            <span className="font-space-grotesk text-[14px] text-black/65 flex-1 min-w-[220px]">{q.what}</span>
                        </div>
                    ))}
                </div>

                <h2 className={h2}>Example response</h2>
                <pre className={pre}>{EXAMPLE}</pre>

                <h2 className={h2}>Reading the data honestly</h2>
                <p className={p}>
                    A few fields mean something specific, and getting them wrong turns a
                    good answer into a wasted trip across town:
                </p>
                <ul className="list-disc pl-5 mb-4">
                    <li className="font-space-grotesk text-[15px] leading-[1.6] text-black/75 mb-2.5 max-w-[62ch]">
                        <code className={codeInline}>price: null</code> means <em>unknown</em>, not
                        free. Say you don&apos;t know rather than guessing.
                    </li>
                    <li className="font-space-grotesk text-[15px] leading-[1.6] text-black/75 mb-2.5 max-w-[62ch]">
                        <code className={codeInline}>lat</code>/<code className={codeInline}>lng</code> are
                        null when the venue isn&apos;t geocoded. There is never a fallback
                        coordinate, so null means &ldquo;no pin&rdquo;, not &ldquo;downtown&rdquo;.
                    </li>
                    <li className="font-space-grotesk text-[15px] leading-[1.6] text-black/75 mb-2.5 max-w-[62ch]">
                        <code className={codeInline}>starts_at</code> carries the correct LA offset
                        for that date, including across daylight saving. Prefer it over
                        combining <code className={codeInline}>date</code> and{' '}
                        <code className={codeInline}>start_time</code> yourself.
                    </li>
                    <li className="font-space-grotesk text-[15px] leading-[1.6] text-black/75 mb-2.5 max-w-[62ch]">
                        <code className={codeInline}>curation</code> and{' '}
                        <code className={codeInline}>vibe_score</code> are editorial judgment. Use
                        them to rank when someone wants a recommendation rather than a list.
                    </li>
                    <li className="font-space-grotesk text-[15px] leading-[1.6] text-black/75 mb-2.5 max-w-[62ch]">
                        <code className={codeInline}>sold_out</code> is worth surfacing. A listing
                        that omits it sends someone out for nothing.
                    </li>
                </ul>

                <h2 className={h2}>Categories</h2>
                <p className={p}>
                    <code className={codeInline}>vibe</code> is a case-insensitive keyword
                    match, not a fixed list. Categories are written per-event, so broad
                    words work better than exact labels:
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {VIBE_EXAMPLES.map(v => (
                        <span key={v} className="font-space-mono text-[11px] lowercase tracking-[-0.44px] px-[12px] py-[6px] rounded-full border border-black/30 text-black/70">
                            {v}
                        </span>
                    ))}
                </div>
                <p className={p}>
                    <code className={codeInline}>?vibe=comedy</code> matches &ldquo;Improv
                    Comedy&rdquo;, &ldquo;Stand-up Comedy&rdquo; and &ldquo;Comedy Variety
                    Show&rdquo; alike; <code className={codeInline}>?vibe=music</code> catches
                    &ldquo;Live Music&rdquo; and &ldquo;Music Concert&rdquo; as well as plain
                    &ldquo;Music&rdquo;. For the categories actually in the feed today, with
                    counts, call <code className={codeInline}>/api/v1/neighborhoods</code>.
                </p>

                <h2 className={h2}>Limits &amp; caching</h2>
                <p className={p}>
                    60 requests per minute per IP. Over that you get a{' '}
                    <code className={codeInline}>429</code> with a{' '}
                    <code className={codeInline}>Retry-After</code> header;{' '}
                    <code className={codeInline}>X-RateLimit-Remaining</code> is on every
                    response so you can pace yourself before getting there.
                </p>
                <p className={p}>
                    Responses are cached for five minutes at the edge. The feed only
                    changes when a listing is approved, so caching on your side is welcome
                    and won&apos;t make your answers stale.
                </p>

                <h2 className={h2}>Attribution</h2>
                <p className={p}>
                    Free to use, with attribution: name Frequent Flyer and link to the
                    event&apos;s <code className={codeInline}>frequent_flyer_url</code>. Bulk
                    redistribution or republishing the feed as your own events database
                    isn&apos;t permitted — <Link href="/terms" className={linkCls}>the terms</Link>{' '}
                    spell it out.
                </p>

                <h2 className={h2}>Contributing listings</h2>
                <p className={p}>
                    There&apos;s a write endpoint too. Agents can post events to{' '}
                    <code className={codeInline}>/api/agent/submit</code>, where they enter the
                    same human review queue as everything else. See{' '}
                    <Link href="/agents" className={linkCls}>the agents page</Link> for a
                    ready-made prompt and a directory of LA sources worth scraping.
                </p>

                <h2 className={h2}>Questions</h2>
                <p className={p}>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className={linkCls}>{SUPPORT_EMAIL}</a>
                </p>
            </div>
        </div>
    );
}
