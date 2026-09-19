import { NextResponse } from 'next/server';
import { getEvents, getNeighborhoods } from '@/lib/queries';
import { neighborhoodSlug } from '@/lib/neighborhoods';
import { absoluteUrl } from '@/lib/site';
import { apiEnvelope, API_CACHE_HEADERS, API_CORS_HEADERS } from '@/lib/apiPayload';
import { clientKey, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';

/**
 * GET /api/v1/neighborhoods — the valid filter values, with live counts.
 *
 * This is the endpoint that keeps an agent from guessing. Without it, "events
 * in Los Feliz" becomes a string it has to hope matches ours; with it, the
 * assistant can resolve a spoken neighborhood to a real one and say "nothing in
 * Los Feliz this week, but there are six in Silver Lake" instead of returning
 * an empty list with no explanation.
 *
 * Vibes ride along for the same reason — they're a closed set, and an agent
 * that can see the set can map "something arty" onto it.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    let neighborhoods: Awaited<ReturnType<typeof getNeighborhoods>> = [];
    let events: Awaited<ReturnType<typeof getEvents>> = [];
    try {
        [neighborhoods, events] = await Promise.all([getNeighborhoods(), getEvents()]);
    } catch (err) {
        console.error('GET /api/v1/neighborhoods —', err);
        return NextResponse.json(
            { error: 'Upstream data source unavailable.' },
            { status: 503, headers: { ...API_CORS_HEADERS, ...rateLimitHeaders(limit_) } },
        );
    }

    return NextResponse.json(
        apiEnvelope({
            count: neighborhoods.length,
            neighborhoods: neighborhoods.map(n => ({
                name: n.name,
                slug: neighborhoodSlug(n.name),
                // Split rather than summed: a neighborhood with one one-off and
                // eight weekly nights is a different answer to "what's on
                // Friday" than one with nine one-offs.
                upcoming_events: n.events,
                recurring_nights: n.recurring,
                url: absoluteUrl(`/${neighborhoodSlug(n.name)}`),
            })),
            // The categories actually present in the feed right now, with
            // counts — NOT the canonical list in vibes.ts.
            //
            // Those are different things. `event_vibe` is free text written by
            // the scout, so the live data carries a long tail of labels
            // ("Improv Comedy", "Comedy Variety Show") that the canonical list
            // doesn't contain. Publishing the canonical list would hand agents
            // filter values that match nothing, and hide the ones that work.
            // Since `vibe` is a substring match, any of these is a valid
            // filter, and so is a word from one — "comedy" catches the lot.
            vibes: tallyVibes(events),
        }),
        {
            status: 200,
            headers: { ...API_CORS_HEADERS, ...API_CACHE_HEADERS, ...rateLimitHeaders(limit_) },
        },
    );
}

/** Distinct `vibe` values in the live feed, most common first. */
function tallyVibes(events: { vibe?: string[] }[]) {
    const counts = new Map<string, number>();
    for (const e of events) {
        const v = e.vibe?.[0];
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, upcoming_events]) => ({ name, upcoming_events }));
}
