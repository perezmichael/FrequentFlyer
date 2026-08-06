import type { MetadataRoute } from 'next';
import { getEvents, getGuides, getNeighborhoods } from '@/lib/queries';
import { absoluteUrl } from '@/lib/site';
import { neighborhoodSlug } from '@/lib/neighborhoods';

// Rendered per request. The queries behind it use cache: 'no-store', so Next
// can't prerender this at build time — it tried, logged a "Dynamic server
// usage" error, and fell back to dynamic anyway. Saying so up front keeps the
// build log clean and matches what actually ships.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
        { url: absoluteUrl('/events'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: absoluteUrl('/map'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        { url: absoluteUrl('/guides'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: absoluteUrl('/create'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
        { url: absoluteUrl('/tips'), lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
        { url: absoluteUrl('/agents'), lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    ];

    // A failure here would drop every dynamic URL from the sitemap, so degrade
    // to the static routes rather than throwing and serving nothing.
    let events: Awaited<ReturnType<typeof getEvents>> = [];
    let guides: Awaited<ReturnType<typeof getGuides>> = [];
    let neighborhoods: Awaited<ReturnType<typeof getNeighborhoods>> = [];
    try {
        [events, guides, neighborhoods] = await Promise.all([
            getEvents(), getGuides(), getNeighborhoods(),
        ]);
    } catch (err) {
        console.error('sitemap: falling back to static routes only —', err);
        return staticRoutes;
    }

    // Ranked just under the home page: these are the durable pages. An event
    // page is deleted from the feed the day after it happens, but "things to do
    // in echo park" is a query someone types every week of the year.
    const neighborhoodRoutes: MetadataRoute.Sitemap = neighborhoods.map(n => ({
        url: absoluteUrl(`/${neighborhoodSlug(n.name)}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.9,
    }));

    const eventRoutes: MetadataRoute.Sitemap = events.map(e => ({
        url: absoluteUrl(`/event/${e.id}`),
        lastModified: now,
        // A dated event's page stops changing once it's published, and the
        // event itself expires from the feed shortly after.
        changeFrequency: 'weekly',
        priority: 0.6,
    }));

    const guideRoutes: MetadataRoute.Sitemap = guides.map(g => ({
        url: absoluteUrl(`/guides/${g.slug}`),
        lastModified: now,
        changeFrequency: 'monthly',
        // Guides are the evergreen pages — they outlive any single listing.
        priority: 0.7,
    }));

    return [...staticRoutes, ...neighborhoodRoutes, ...guideRoutes, ...eventRoutes];
}
