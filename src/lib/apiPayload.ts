/**
 * The public shape of a Frequent Flyer event.
 *
 * This is a deliberate translation, not a dump of the internal `Event`. An
 * agent answering "what's on in Echo Park Friday" will read this object and
 * throw away the page, so anything that only exists in the layout — the flyer,
 * the map, the typography, the fact that a person chose this — has to survive
 * as a field or it doesn't survive at all.
 *
 * Two consequences shape what's here:
 *
 *  1. `curation` and `vibe_score` lead rather than hide. They're the reason an
 *     answer sourced from Frequent Flyer beats one sourced from a raw
 *     aggregator, and an agent can only weigh them if it can see them.
 *  2. Every event carries `frequent_flyer_url` and the envelope carries
 *     attribution, so citing the source is the path of least resistance rather
 *     than something a well-behaved client has to go out of its way to do.
 *
 * Fields are snake_case to match `/api/agent/submit`, so the ingestion and
 * read halves of the public surface read as one API.
 */
import type { Event } from '@/features/frequent-flyer/data/events';
import { absoluteUrl, SITE_NAME, SITE_URL } from '@/lib/site';
import { isoDateTime } from '@/lib/schema';

/** How much human judgment stands behind a listing. */
const CURATION_NOTES: Record<string, string> = {
    promoted: 'Featured by the Frequent Flyer editor.',
    ff_curated: 'Hand-picked and checked by the Frequent Flyer editor.',
    scraped: 'Automatically collected from a public source, then approved by a human before listing.',
};

export type PublicEvent = ReturnType<typeof toPublicEvent>;

/**
 * "22:30:00" -> "22:30". Postgres returns `time` with seconds; no event in
 * this dataset starts at a meaningful :30 second, and publishing the extra
 * precision implies one. `starts_at` carries the exact timestamp either way.
 */
function hhmm(t?: string | null): string | null {
    if (!t) return null;
    const m = /^(\d{2}):(\d{2})/.exec(t);
    return m ? `${m[1]}:${m[2]}` : t;
}

export function toPublicEvent(e: Event) {
    const curation = e.curationLevel || 'scraped';

    return {
        id: e.id,
        title: e.title,
        // `description` here is the public listing copy. The scout's internal
        // vibe rationale lives in metadata.justification and is never exposed —
        // it's commentary *about* the event, and reads as AI filler if quoted.
        description: e.description === 'No description available' ? null : e.description,

        // Date and the local-time string are what a person reads; starts_at is
        // what a machine should compute with. All three, because an agent that
        // has to reconstruct an offset will get it wrong twice a year.
        date: e.date,
        start_time: hhmm(e.startTime),
        end_time: hhmm(e.endTime),
        starts_at: e.startTime ? isoDateTime(e.date, e.startTime) : null,
        ends_at: e.endTime ? isoDateTime(e.date, e.endTime) : null,
        timezone: 'America/Los_Angeles',

        venue: {
            name: e.location.split(',')[0]?.trim() || null,
            neighborhood: e.neighborhood === 'Unknown' ? null : e.neighborhood,
            address: e.venueAddress ?? null,
            // Never a fallback coordinate: an un-geocoded venue reports null so
            // a consumer can omit it, rather than sending someone downtown.
            lat: e.lat,
            lng: e.lng,
        },

        // The price string exactly as the venue states it ("$15", "Free with
        // RSVP"). Null when unknown — a guessed price gets quoted as fact.
        price: e.price ?? null,
        sold_out: e.soldOut === true,

        vibe: e.vibe?.[0] ?? null,
        performers: e.performers?.length ? e.performers : null,
        collection: e.collectionLabel || e.collection || null,

        curation,
        curation_note: CURATION_NOTES[curation] ?? CURATION_NOTES.scraped,
        /** 1–10 editorial score. Orders events within a day; null if unscored. */
        vibe_score: e.vibeScore ?? null,

        /** Where to buy or RSVP — the venue's or promoter's own page. */
        ticket_url: e.url ?? null,
        flyer_url: e.imageIsFlyer ? e.image : null,
        /** The canonical Frequent Flyer page for this event. */
        frequent_flyer_url: absoluteUrl(`/event/${e.id}`),
    };
}

/**
 * The response envelope.
 *
 * Attribution sits in the body rather than only in the docs because that's the
 * copy an assistant actually has in front of it when it composes an answer.
 */
export function apiEnvelope<T>(payload: { count: number; events?: T; [k: string]: unknown }) {
    return {
        source: SITE_NAME,
        source_url: SITE_URL,
        city: 'Los Angeles',
        attribution: `Event data from ${SITE_NAME} (${SITE_URL}). Please link back when citing a listing.`,
        license: 'Free to use with attribution. Not for bulk redistribution.',
        ...payload,
    };
}

/**
 * Cache policy for the public read endpoints.
 *
 * The feed only changes when something is approved in /admin, so a short
 * shared-cache window costs nothing in freshness and decouples the database
 * from request volume entirely: Supabase sees at most a handful of queries an
 * hour no matter how many agents are asking. `stale-while-revalidate` means a
 * cache miss after the window still serves instantly and refreshes behind the
 * request, so a cold minute never becomes a slow response.
 */
export const API_CACHE_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
} as const;

/** CORS — the read API is public, so any origin may call it. */
export const API_CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
} as const;
