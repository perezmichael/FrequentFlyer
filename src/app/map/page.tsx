import { Suspense } from 'react';
import MapPageClient from '@/features/frequent-flyer/components/MapPageClient';
import PageLoader from '@/components/PageLoader';
import { getEvents } from '@/lib/queries';
import type { Metadata } from 'next';

/**
 * `skipTrailingSlashRedirect` is on for the PostHog proxy, so /map and /map/
 * both return 200 with identical content. Without a canonical, Google sees two
 * URLs and no instruction — which is precisely the "Duplicate without
 * user-selected canonical" it reported.
 */
export const metadata: Metadata = {
    title: 'Map of what’s on in Los Angeles',
    description:
        'Every event we’re tracking across LA, pinned. See what’s happening near you tonight, this weekend or this week.',
    alternates: { canonical: '/map' },
    openGraph: { title: 'Map of what’s on in Los Angeles', url: '/map' },
};

// Force dynamic rendering since we are fetching live data
export const dynamic = 'force-dynamic';

export default async function MapPage() {
    const events = await getEvents();

    return (
        <Suspense fallback={<PageLoader />}>
            <MapPageClient initialEvents={events} />
        </Suspense>
    );
}
