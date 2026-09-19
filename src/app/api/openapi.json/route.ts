import { NextResponse } from 'next/server';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import { API_CORS_HEADERS } from '@/lib/apiPayload';

/**
 * GET /api/openapi.json — the machine-readable description of the read API.
 *
 * This is the entry point an agent platform asks for: given this document and
 * nothing else, a client can construct valid calls without a human writing an
 * integration. It's served from code rather than kept as a static file so the
 * vibe enum can't drift from `vibes.ts` — a spec that lists a category we no
 * longer have is worse than no spec, because it gets trusted.
 *
 * The `description` strings are load-bearing. They are the only instructions a
 * model gets about when to reach for an endpoint, so they say what the data is
 * good for and where it stops, rather than restating the field name.
 */
export const runtime = 'nodejs';
// A static document — nothing per-request, nothing from the database.
export const revalidate = 3600;

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET() {
    const spec = {
        openapi: '3.1.0',
        info: {
            title: `${SITE_NAME} API`,
            version: '1.0.0',
            description:
                "Curated listings for events happening in Los Angeles: live music, DJ nights, " +
                "markets, screenings, readings, workshops and community events. Every listing is " +
                "approved by a human editor before it appears. Coverage is Los Angeles County only, " +
                "and only events that have not yet happened — past events are removed automatically. " +
                "Read-only and free to use with attribution; no account or API key is required.",
            contact: { name: SITE_NAME, url: SITE_URL },
            license: { name: 'Free to use with attribution', url: `${SITE_URL}/terms` },
        },
        servers: [{ url: `${SITE_URL}/api/v1`, description: 'Production' }],
        paths: {
            '/events': {
                get: {
                    operationId: 'listEvents',
                    summary: 'Find upcoming events in Los Angeles',
                    description:
                        "Returns upcoming LA events, soonest first. Use this for questions like " +
                        "'what's happening this weekend', 'any live music in Echo Park on Friday', " +
                        "or 'find something to do Wednesday'. Results are already filtered to events " +
                        "that have not yet taken place, so no date filter is needed for 'what's on now'. " +
                        "Call /neighborhoods first if you need to resolve a spoken place name to a " +
                        "valid `neighborhood` value.",
                    parameters: [
                        {
                            name: 'date', in: 'query', required: false,
                            schema: { type: 'string', format: 'date', examples: ['2026-09-19'] },
                            description: 'Events on this exact day (YYYY-MM-DD, Los Angeles local date).',
                        },
                        {
                            name: 'from', in: 'query', required: false,
                            schema: { type: 'string', format: 'date' },
                            description: 'Earliest date, inclusive. Combine with `to` for a weekend or a week.',
                        },
                        {
                            name: 'to', in: 'query', required: false,
                            schema: { type: 'string', format: 'date' },
                            description: 'Latest date, inclusive.',
                        },
                        {
                            name: 'neighborhood', in: 'query', required: false,
                            schema: { type: 'string', examples: ['Echo Park', 'echo-park'] },
                            description:
                                'Restrict to one LA neighborhood. Accepts the display name or the slug. ' +
                                'Get the valid values from /neighborhoods.',
                        },
                        {
                            name: 'vibe', in: 'query', required: false,
                            schema: { type: 'string', examples: ['comedy', 'music', 'market'] },
                            description:
                                'Case-insensitive keyword match against the event category. ' +
                                'Categories are free text, so a broad word works better than an ' +
                                'exact label: "comedy" matches "Improv Comedy", "Stand-up Comedy" ' +
                                'and "Comedy Variety Show" alike, and "music" matches "Live Music" ' +
                                'and "Music Concert". Call /neighborhoods for the categories ' +
                                'currently in the feed, with counts.',
                        },
                        {
                            name: 'curation', in: 'query', required: false,
                            schema: { type: 'string', enum: ['scraped', 'ff_curated', 'promoted'] },
                            description:
                                "How much human judgment stands behind the listing. Use 'ff_curated' " +
                                "when the user wants recommendations rather than an exhaustive list.",
                        },
                        {
                            name: 'limit', in: 'query', required: false,
                            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
                            description: 'Maximum events to return.',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Matching events.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/EventList' } } },
                        },
                        400: { description: 'A filter value was not valid. The body names the problem and lists allowed values.' },
                        429: { description: 'Rate limit exceeded (60 requests per minute). Retry after the seconds given in Retry-After.' },
                        503: { description: 'The upstream data source is temporarily unavailable.' },
                    },
                },
            },
            '/events/{id}': {
                get: {
                    operationId: 'getEvent',
                    summary: 'Get one event in full',
                    description:
                        'Full detail for a single event, including the lineup (`performers`) and the ' +
                        'street address, which the list endpoint omits. Use it when the user asks who ' +
                        'is playing or exactly where a venue is.',
                    parameters: [{
                        name: 'id', in: 'path', required: true,
                        schema: { type: 'string' },
                        description: 'The event id, as returned by /events.',
                    }],
                    responses: {
                        200: {
                            description: 'The event.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/EventDetail' } } },
                        },
                        404: { description: 'No such event, or it has already taken place.' },
                        429: { description: 'Rate limit exceeded.' },
                    },
                },
            },
            '/neighborhoods': {
                get: {
                    operationId: 'listNeighborhoods',
                    summary: 'List valid neighborhoods and event categories',
                    description:
                        'The LA neighborhoods currently carrying events, with counts, plus the complete ' +
                        'set of valid `vibe` values. Call this to turn a place name a user said into a ' +
                        'filter value, and to tell "nothing on there" apart from "that is not a ' +
                        'neighborhood we cover".',
                    responses: {
                        200: {
                            description: 'Neighborhoods and categories.',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/NeighborhoodList' } } },
                        },
                        429: { description: 'Rate limit exceeded.' },
                    },
                },
            },
        },
        components: {
            schemas: {
                Envelope: {
                    type: 'object',
                    properties: {
                        source: { type: 'string', description: 'Always "Frequent Flyer". Cite this as the source.' },
                        source_url: { type: 'string', format: 'uri' },
                        city: { type: 'string' },
                        attribution: { type: 'string', description: 'The attribution line to show alongside any listing you surface.' },
                        license: { type: 'string' },
                        count: { type: 'integer', description: 'Events in this response.' },
                    },
                },
                Event: {
                    type: 'object',
                    required: ['id', 'title', 'date', 'frequent_flyer_url'],
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: ['string', 'null'], description: 'Listing copy. Null when the source gave none — do not invent one.' },
                        date: { type: 'string', format: 'date', description: 'Los Angeles local date.' },
                        start_time: { type: ['string', 'null'], description: 'Local start, "HH:MM". Null when the source did not state one.' },
                        end_time: { type: ['string', 'null'] },
                        starts_at: { type: ['string', 'null'], format: 'date-time', description: 'Start as a full ISO timestamp with the correct Los Angeles offset for that date. Prefer this for any time arithmetic.' },
                        ends_at: { type: ['string', 'null'], format: 'date-time' },
                        timezone: { type: 'string' },
                        venue: {
                            type: 'object',
                            properties: {
                                name: { type: ['string', 'null'] },
                                neighborhood: { type: ['string', 'null'] },
                                address: { type: ['string', 'null'], description: 'Only populated on the single-event endpoint.' },
                                lat: { type: ['number', 'null'], description: 'Null when the venue is not geocoded. Never a fallback coordinate.' },
                                lng: { type: ['number', 'null'] },
                            },
                        },
                        price: { type: ['string', 'null'], description: 'Exactly as the venue states it ("$15", "Free with RSVP"). Null means unknown — do not report it as free.' },
                        sold_out: { type: 'boolean' },
                        vibe: { type: ['string', 'null'], description: 'Free-text category, e.g. "Music", "Improv Comedy", "Markets & Flea Markets".' },
                        performers: { type: ['array', 'null'], items: { type: 'string' }, description: 'The bill, headliner first. Only on the single-event endpoint.' },
                        collection: { type: ['string', 'null'], description: 'A festival week or art walk this event belongs to.' },
                        curation: { type: 'string', enum: ['scraped', 'ff_curated', 'promoted'] },
                        curation_note: { type: 'string', description: 'Plain-language explanation of the curation level, safe to quote.' },
                        vibe_score: { type: ['integer', 'null'], minimum: 1, maximum: 10, description: "The editor's 1-10 rating. Use it to rank when the user wants a recommendation." },
                        ticket_url: { type: ['string', 'null'], format: 'uri', description: "The venue's or promoter's own page, for tickets or RSVP." },
                        flyer_url: { type: ['string', 'null'], format: 'uri', description: "The event's own artwork, when it has any." },
                        frequent_flyer_url: { type: 'string', format: 'uri', description: 'The canonical Frequent Flyer page. Link here when citing this event.' },
                    },
                },
                EventList: {
                    allOf: [
                        { $ref: '#/components/schemas/Envelope' },
                        {
                            type: 'object',
                            properties: {
                                total_matching: { type: 'integer', description: 'Matches before `limit` was applied.' },
                                filters: { type: 'object', description: 'The filters as interpreted, echoed back.' },
                                events: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
                            },
                        },
                    ],
                },
                EventDetail: {
                    allOf: [
                        { $ref: '#/components/schemas/Envelope' },
                        { type: 'object', properties: { event: { $ref: '#/components/schemas/Event' } } },
                    ],
                },
                NeighborhoodList: {
                    allOf: [
                        { $ref: '#/components/schemas/Envelope' },
                        {
                            type: 'object',
                            properties: {
                                neighborhoods: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            slug: { type: 'string' },
                                            upcoming_events: { type: 'integer' },
                                            recurring_nights: { type: 'integer' },
                                            url: { type: 'string', format: 'uri' },
                                        },
                                    },
                                },
                                vibes: {
                                    type: 'array',
                                    description: 'Categories present in the feed right now, most common first. Any of these — or a word from one — is a valid `vibe` filter.',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            upcoming_events: { type: 'integer' },
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
            },
        },
    };

    return NextResponse.json(spec, {
        headers: {
            ...API_CORS_HEADERS,
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
