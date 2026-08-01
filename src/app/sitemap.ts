import type { MetadataRoute } from 'next';
import { getEvents, getGuides } from '@/lib/queries';
import { absoluteUrl } from '@/lib/site';

// Rebuilt hourly. Events expire and the scout adds new ones daily, so a
// statically generated sitemap would go stale within a day.
export const revalidate = 3600;

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
    try {
        [events, guides] = await Promise.all([getEvents(), getGuides()]);
    } catch (err) {
        console.error('sitemap: falling back to static routes only —', err);
        return staticRoutes;
    }

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

    return [...staticRoutes, ...guideRoutes, ...eventRoutes];
}
