import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/queries';
import { neighborhoodSlug } from '@/lib/neighborhoods';
import {
    toPublicEvent,
    apiEnvelope,
    API_CACHE_HEADERS,
    API_CORS_HEADERS,
} from '@/lib/apiPayload';
import { clientKey, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';

/**
 * GET /api/v1/events — the public read feed.
 *
 * The outbound half of the agent surface that /api/agent/submit already
 * provides inbound. Everything here is already-approved, already-public data:
 * the same listings the site renders, in a shape a machine can use without
 * parsing HTML.
 *
 * On filtering: every filter is applied in memory after one `getEvents()` call
 * rather than pushed into Postgres. That looks wasteful and isn't — the feed is
 * a few hundred rows, the response is CDN-cached, and doing it this way means
 * every filter combination shares a single database query instead of each one
 * opening a new connection. The database cost is flat in request volume.
 */

// The Supabase client sets `cache: 'no-store'` on every fetch, so Next can't
// statically render this. Caching happens at the CDN via Cache-Control instead
// (see API_CACHE_HEADERS) — which is the layer that actually absorbs agent
// traffic anyway.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: Request) {
    const limit_ = rateLimit(clientKey(request));
    if (!limit_.ok) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. This API allows 60 requests per minute.' },
            {
                status: 429,
                headers: {
                    ...API_CORS_HEADERS,
                    ...rateLimitHeaders(limit_),
                    'Retry-After': String(limit_.retryAfter),
                },
            },
        );
    }

    const headers = { ...API_CORS_HEADERS, ...API_CACHE_HEADERS, ...rateLimitHeaders(limit_) };
    const { searchParams } = new URL(request.url);

    // --- Read and validate filters -----------------------------------------
    // An unparseable filter is rejected rather than ignored. Silently returning
    // the unfiltered feed would let an agent report "nothing on Friday" as
    // "here is everything", which is worse than an error it can correct.
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    for (const [name, value] of [['date', date], ['from', from], ['to', to]] as const) {
        if (value && !DATE_RE.test(value)) {
            return NextResponse.json(
                { error: `Invalid \`${name}\` — expected YYYY-MM-DD, got "${value}".` },
                { status: 400, headers: { ...API_CORS_HEADERS, ...rateLimitHeaders(limit_) } },
            );
        }
    }

    /**
     * `vibe` is a keyword match, not an enum, and that is deliberate.
     *
     * `event_vibe` is written by the scout as free text, so the live data holds
     * well over a hundred distinct labels — "Comedy", "Improv Comedy",
     * "Stand-up Comedy / Charity", "Comedy Variety Show" — against the 21
     * canonical names in vibes.ts. Validating against that list would 400 on
     * "Comedy" while dozens of comedy events sit in the feed, and an exact
     * match on "Music" would silently drop "Live Music" and "Music Concert".
     *
     * A case-insensitive substring match is the shape the data actually has:
     * `?vibe=comedy` finds all of them. Left as a match rather than normalised
     * at read time because collapsing those labels is a content decision, not
     * an API one.
     */
    const vibe = searchParams.get('vibe');

    const curation = searchParams.get('curation');
    const CURATIONS = ['scraped', 'ff_curated', 'promoted'];
    if (curation && !CURATIONS.includes(curation)) {
        return NextResponse.json(
            { error: `Unknown \`curation\` "${curation}".`, allowed: CURATIONS },
            { status: 400, headers: { ...API_CORS_HEADERS, ...rateLimitHeaders(limit_) } },
        );
    }

    // Accepts either the display name ("Echo Park") or the URL slug
    // ("echo-park"), because an agent that read a neighborhood off one of our
    // own pages will have the slug.
    const neighborhood = searchParams.get('neighborhood');
    const wantedHood = neighborhood ? neighborhoodSlug(neighborhood) : null;

    const rawLimit = Number(searchParams.get('limit'));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
        : DEFAULT_LIMIT;

    // --- Fetch and filter ---------------------------------------------------
    let events;
    try {
        events = await getEvents();
    } catch (err) {
        console.error('GET /api/v1/events —', err);
        return NextResponse.json(
            { error: 'Upstream data source unavailable.' },
            { status: 503, headers: { ...API_CORS_HEADERS, ...rateLimitHeaders(limit_) } },
        );
    }

    const filtered = events.filter(e => {
        if (date && e.date !== date) return false;
        if (from && e.date < from) return false;
        if (to && e.date > to) return false;
        if (vibe && !e.vibe?.some(v => v.toLowerCase().includes(vibe.toLowerCase()))) return false;
        if (curation && (e.curationLevel || 'scraped') !== curation) return false;
        if (wantedHood && neighborhoodSlug(e.neighborhood) !== wantedHood) return false;
        return true;
    });

    const page = filtered.slice(0, limit);

    return NextResponse.json(
        apiEnvelope({
            count: page.length,
            total_matching: filtered.length,
            // Echoed back so a consumer can tell "no events match" apart from
            // "my filter was interpreted differently than I meant".
            filters: {
                date: date ?? null,
                from: from ?? null,
                to: to ?? null,
                neighborhood: neighborhood ?? null,
                vibe: vibe ?? null,
                curation: curation ?? null,
                limit,
            },
            events: page.map(toPublicEvent),
        }),
        { status: 200, headers },
    );
}
