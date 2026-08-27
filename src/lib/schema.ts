/**
 * Schema.org JSON-LD builders.
 *
 * These exist because AI assistants are now the site's largest single source of
 * traffic — more than social — and unlike a person they can't infer anything
 * from layout. A crawler that fetches this page without running JavaScript sees
 * whatever the markup states outright and nothing else.
 *
 * The event pages already carried a valid Event block, but it was answering
 * fewer questions than the database could: no price, no lineup, and a date with
 * no time on it, so "what time does it start" and "how much" were unanswerable
 * from data we'd already collected. That's what this fills in.
 *
 * Everything here degrades rather than guesses. A missing field is omitted; it
 * is never defaulted to a plausible value, because a confidently wrong price or
 * a city-centroid pin in structured data is worse than silence — it gets quoted
 * back to someone as fact.
 */
import { absoluteUrl } from '@/lib/site';
import type { Event } from '@/features/frequent-flyer/data/events';

/**
 * The UTC offset for Los Angeles on a given date, as "-07:00" / "-08:00".
 *
 * Hardcoding one or the other is wrong for half the year, and a naive
 * "2026-08-29T15:00" with no offset is ambiguous — a consumer is free to read
 * it as its own local time, which moves a 3pm show by up to a day. Derived per
 * date so DST transitions are handled rather than approximated.
 */
function losAngelesOffset(dateISO: string): string {
    try {
        // Midday UTC lands mid-morning in LA — safely inside the date, and away
        // from the 2am DST boundary either side of it.
        const at = new Date(`${dateISO}T20:00:00Z`);
        const name = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            timeZoneName: 'longOffset',
        })
            .formatToParts(at)
            .find(p => p.type === 'timeZoneName')?.value;
        const offset = (name || '').replace('GMT', '').trim();
        return /^[+-]\d{2}:\d{2}$/.test(offset) ? offset : '-08:00';
    } catch {
        return '-08:00';
    }
}

/** "2026-08-29" + "15:00:00" → "2026-08-29T15:00:00-07:00". Date alone if no time. */
function isoDateTime(date: string, time?: string | null): string {
    if (!date) return '';
    if (!time) return date;
    const hhmmss = time.length === 5 ? `${time}:00` : time;
    return `${date}T${hhmmss}${losAngelesOffset(date)}`;
}

/**
 * A price string as printed by the venue → a schema.org Offer, or null.
 *
 * The strings are whatever the flyer said: "Free", "$26.25", "From$7.42",
 * "No cover". Anything this can't read confidently returns null and the offer
 * is omitted — the listing already refuses to claim a price it doesn't know,
 * and the markup should hold the same line.
 */
export function parsePrice(raw?: string | null): { price: number; priceCurrency: string } | null {
    if (!raw) return null;
    const s = raw.trim().toLowerCase().replace(/[!.]+$/, '');

    /* Free only when the whole string says free, not merely when it starts
       that way. "FREE admission if it's your birthday week" is conditional, and
       a prefix match asserted price 0 for everyone — structured data is quoted
       back as fact, so a condition dropped is a lie told confidently. Anything
       qualified falls through and gets no offer at all. */
    if (/^(free|free entry|free admission|no cover|no charge)$/.test(s)) {
        return { price: 0, priceCurrency: 'USD' };
    }

    // "$26.25", "From$7.42", "$5 PER PLAYER" — the first figure is the entry
    // price. Ranges resolve to their low end, which is what "from" means.
    const match = raw.match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    if (match) return { price: parseFloat(match[1]), priceCurrency: 'USD' };
    return null;
}

type EventSchemaOptions = {
    /** Bill order, headliner first. Only the detail page loads these. */
    performers?: string[];
    /** Street address, where the venue has one on file. */
    streetAddress?: string | null;
    /** Whether `image` is real artwork rather than a generated placeholder. */
    hasImage?: boolean;
};

export function eventJsonLd(event: Event, opts: EventSchemaOptions = {}): Record<string, unknown> {
    const { performers = [], streetAddress, hasImage } = opts;

    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        startDate: isoDateTime(event.date, event.startTime),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: absoluteUrl(`/event/${event.id}`),
        location: {
            '@type': 'Place',
            name: event.location,
            address: {
                '@type': 'PostalAddress',
                ...(streetAddress ? { streetAddress } : {}),
                addressLocality: event.neighborhood || 'Los Angeles',
                addressRegion: 'CA',
                addressCountry: 'US',
            },
            // Omitted for un-geocoded venues rather than defaulted to a city
            // centroid — a wrong pin in structured data is a wrong pin in Google.
            ...(Number.isFinite(event.lat) && Number.isFinite(event.lng)
                ? { geo: { '@type': 'GeoCoordinates', latitude: event.lat, longitude: event.lng } }
                : {}),
        },
    };

    if (event.endTime) schema.endDate = isoDateTime(event.date, event.endTime);
    if (hasImage) schema.image = [event.image];
    if (event.description?.trim()) schema.description = event.description;

    /* The lineup. This is the field that makes "is Indigo De Souza playing in
       LA this weekend" answerable — the bill was already in the database and
       simply wasn't reaching the markup.

       PerformingGroup rather than Person or MusicGroup: the talent table holds
       bands, DJs and comedians without distinguishing them, and picking wrongly
       states something false. PerformingGroup is the honest supertype. */
    if (performers.length) {
        schema.performer = performers.map(name => ({ '@type': 'PerformingGroup', name }));
    }

    const offer = parsePrice(event.price);
    if (offer) {
        schema.offers = {
            '@type': 'Offer',
            ...offer,
            availability: 'https://schema.org/InStock',
            url: event.url || absoluteUrl(`/event/${event.id}`),
        };
    }

    return schema;
}

/**
 * The homepage as a machine-readable list.
 *
 * "What's happening in LA this weekend" is the question this site exists to
 * answer, and the homepage is what an assistant fetches to answer it — but it
 * shipped no structured data at all, leaving a megabyte of prose to be parsed.
 *
 * Capped and near-dated on purpose: the feed carries 300+ approved events and
 * serialising all of them would add more weight than the answer is worth.
 */
export function homepageJsonLd(events: Event[], limit = 40): Record<string, unknown> {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
    const horizon = new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10);

    const soon = events
        .filter(e => e.date >= today && e.date <= horizon)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, limit);

    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: "What's happening in Los Angeles this week",
        numberOfItems: soon.length,
        itemListElement: soon.map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Event',
                name: e.title,
                startDate: isoDateTime(e.date, e.startTime),
                url: absoluteUrl(`/event/${e.id}`),
                location: { '@type': 'Place', name: e.location },
            },
        })),
    };
}
