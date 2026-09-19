import { NextResponse } from 'next/server';
import { getEventById } from '@/lib/queries';
import {
    toPublicEvent,
    apiEnvelope,
    API_CACHE_HEADERS,
    API_CORS_HEADERS,
} from '@/lib/apiPayload';
import { clientKey, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';

/**
 * GET /api/v1/events/:id — one event in full.
 *
 * Worth a separate endpoint rather than making callers filter the feed: this is
 * the only place `performers` and the street address are loaded, because the
 * feed renders hundreds of cards and doesn't join for a lineup it won't show.
 * An agent answering "who's playing" needs exactly that.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } },
) {
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

    let event;
    try {
        event = await getEventById(params.id);
    } catch (err) {
        console.error(`GET /api/v1/events/${params.id} —`, err);
        return NextResponse.json(
            { error: 'Upstream data source unavailable.' },
            { status: 503, headers: { ...API_CORS_HEADERS, ...rateLimitHeaders(limit_) } },
        );
    }

    if (!event) {
        // Past events fall out of the feed automatically, so a 404 here often
        // means "it already happened" rather than "it never existed". Saying so
        // stops an agent reporting a real event as bogus.
        return NextResponse.json(
            { error: 'No such event. It may have already taken place — past events are removed from the feed.' },
            { status: 404, headers: { ...API_CORS_HEADERS, ...rateLimitHeaders(limit_) } },
        );
    }

    return NextResponse.json(
        apiEnvelope({ count: 1, event: toPublicEvent(event) }),
        {
            status: 200,
            headers: { ...API_CORS_HEADERS, ...API_CACHE_HEADERS, ...rateLimitHeaders(limit_) },
        },
    );
}
