import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import HomeClient from '@/features/frequent-flyer/components/HomeClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getRecurringEvents, getNeighborhoods, getCollections } from '@/lib/queries';
import { neighborhoodFromSlug, neighborhoodSlug } from '@/lib/neighborhoods';
import { SITE_NAME } from '@/lib/site';

/**
 * A neighborhood's own page — /echo-park, /culver-city.
 *
 * Two jobs, and they happen to want the same thing:
 *
 * 1. A link short enough to print. The neighborhood filter was local state, so
 *    there was no URL you could put on a flyer or hand to someone that opened
 *    on their area — everyone landed on the whole city and had to find
 *    themselves on the map.
 * 2. Durable search surface. Event pages expire by design, which makes them
 *    poor SEO; a neighborhood page persists and is what "things to do in echo
 *    park" actually wants.
 *
 * This sits at the root so the URL stays short. Next resolves static segments
 * before dynamic ones, so /events, /map, /guides and friends are unaffected —
 * but it does mean this catches every unmatched path, hence the strict
 * allowlist below. Without it, /pricing would quietly render the full feed.
 */

// The queries underneath use cache: 'no-store', same as the home page.
export const dynamic = 'force-dynamic';

type Params = { params: { neighborhood: string } };

/**
 * What a root slug refers to.
 *
 * The same segment serves neighborhoods and collections because they want the
 * identical page: a scoped list beside a map of exactly those pins. A festival
 * week is a neighborhood-shaped question ("what's on, and where is it") that
 * happens to be bounded by a theme instead of a boundary, so /sound-and-fury
 * gets the whole split layout for free rather than a second page type.
 *
 * Neighborhoods are checked first: they're permanent, collections come and go,
 * and a collection slug colliding with a neighborhood should lose.
 */
type Resolved =
    | { kind: 'neighborhood'; name: string }
    | { kind: 'collection'; slug: string; label: string; count: number }
    | null;

async function resolveSlug(slug: string): Promise<Resolved> {
    const [hoods, collections] = await Promise.all([getNeighborhoods(), getCollections()]);

    const name = neighborhoodFromSlug(slug, hoods.map(n => n.name));
    if (name) return { kind: 'neighborhood', name };

    const c = collections.find(x => x.slug === neighborhoodSlug(slug));
    if (c) return { kind: 'collection', slug: c.slug, label: c.label, count: c.count };

    return null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const resolved = await resolveSlug(params.neighborhood);
    if (!resolved) return { title: 'Not found' };

    if (resolved.kind === 'collection') {
        const description =
            `${resolved.count} events in ${resolved.label}, mapped across Los Angeles. ` +
            `Curated by ${SITE_NAME}.`;
        return {
            title: `${resolved.label} — every show, mapped`,
            description,
            alternates: { canonical: `/${resolved.slug}` },
            openGraph: {
                title: `${resolved.label} · ${SITE_NAME}`,
                description,
                url: `/${resolved.slug}`,
                type: 'website',
            },
        };
    }

    const known = await getNeighborhoods();
    const name = resolved.name;
    const summary = known.find(n => n.name === name);
    const total = (summary?.events ?? 0) + (summary?.recurring ?? 0);

    // Counts, not adjectives. "Updated daily" would be a claim about the scout's
    // schedule that this page can't verify; a number it just counted is safe.
    const description = total > 0
        ? `${total} upcoming events in ${name}, Los Angeles — live music, comedy, markets and pop-ups, on a map. Curated by ${SITE_NAME}.`
        : `Events in ${name}, Los Angeles. Curated by ${SITE_NAME}.`;

    return {
        title: `Things to do in ${name}`,
        description,
        // Always the normalised slug, so /Echo-Park and /echo-park don't
        // compete with each other as duplicates.
        alternates: { canonical: `/${neighborhoodSlug(name)}` },
        openGraph: {
            title: `Things to do in ${name} · ${SITE_NAME}`,
            description,
            url: `/${neighborhoodSlug(name)}`,
            type: 'website',
        },
    };
}

export default async function ScopedFeedPage({ params }: Params) {
    const [events, recurringEvents, collections, resolved] = await Promise.all([
        getEvents(),
        getRecurringEvents(),
        getCollections(),
        resolveSlug(params.neighborhood),
    ]);

    // A neighborhood earns a page by having events in it; a collection earns
    // one by still having something upcoming. Anything else is a typo or a
    // stale printed link, and a 404 is the honest answer — better than an empty
    // feed that looks like the city has nothing on.
    if (!resolved) notFound();

    return (
        <Suspense fallback={<PageLoader />}>
            <HomeClient
                initialEvents={events}
                recurringEvents={recurringEvents}
                collections={collections}
                initialNeighborhood={resolved.kind === 'neighborhood' ? resolved.name : undefined}
                initialCollection={resolved.kind === 'collection' ? resolved.slug : undefined}
            />
        </Suspense>
    );
}
