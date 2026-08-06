import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import HomeClient from '@/features/frequent-flyer/components/HomeClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getRecurringEvents, getNeighborhoods } from '@/lib/queries';
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

/** The canonical neighborhood name for a slug, or null if we don't have one. */
async function resolveNeighborhood(slug: string): Promise<string | null> {
    const known = await getNeighborhoods();
    return neighborhoodFromSlug(slug, known.map(n => n.name));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const known = await getNeighborhoods();
    const name = neighborhoodFromSlug(params.neighborhood, known.map(n => n.name));
    if (!name) return { title: 'Not found' };

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

export default async function NeighborhoodPage({ params }: Params) {
    const [events, recurringEvents, name] = await Promise.all([
        getEvents(),
        getRecurringEvents(),
        resolveNeighborhood(params.neighborhood),
    ]);

    // A neighborhood earns a page by having events in it. Anything else is a
    // typo or a stale printed link, and a 404 is the honest answer — better
    // than an empty feed that looks like the city has nothing on.
    if (!name) notFound();

    return (
        <Suspense fallback={<PageLoader />}>
            <HomeClient
                initialEvents={events}
                recurringEvents={recurringEvents}
                initialNeighborhood={name}
            />
        </Suspense>
    );
}
