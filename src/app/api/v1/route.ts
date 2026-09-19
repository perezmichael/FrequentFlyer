import { NextResponse } from 'next/server';
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '@/lib/site';
import { API_CACHE_HEADERS, API_CORS_HEADERS } from '@/lib/apiPayload';

/**
 * GET /api/v1 — what lives at the base of the API.
 *
 * Without this the base path 404s, which is technically correct (nothing is
 * mounted there) and a bad first impression: it's the URL listed in the
 * OpenAPI `servers` entry and on the connector submission, so it's the one a
 * reviewer or a curious developer pastes into a browser first. A 404 there
 * reads as "this is broken" rather than "endpoints hang off this".
 *
 * So it answers the question actually being asked — what is this, and where do
 * I go next — and points at the spec that describes the rest.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET() {
    return NextResponse.json(
        {
            name: `${SITE_NAME} API`,
            version: '1.0.0',
            description:
                'Curated listings for upcoming events in Los Angeles — live music, DJ nights, ' +
                'comedy, markets, screenings and readings. Every listing is approved by a human ' +
                'editor before it appears. Read-only, free to use with attribution, no key required.',
            documentation: `${SITE_URL}/docs`,
            openapi: `${SITE_URL}/api/openapi.json`,
            terms: `${SITE_URL}/terms`,
            contact: SUPPORT_EMAIL,
            endpoints: {
                'GET /api/v1/events':
                    'Upcoming events. Filters: date, from, to, neighborhood, vibe, curation, limit.',
                'GET /api/v1/events/{id}':
                    'One event in full, including the lineup and street address.',
                'GET /api/v1/neighborhoods':
                    'Valid neighborhoods and categories, with live counts.',
            },
            rate_limit: '60 requests per minute per IP.',
            coverage: 'Los Angeles County. Upcoming events only — past events are removed automatically.',
            attribution: `Event data from ${SITE_NAME} (${SITE_URL}). Please link back when citing a listing.`,
        },
        { headers: { ...API_CORS_HEADERS, ...API_CACHE_HEADERS } },
    );
}
