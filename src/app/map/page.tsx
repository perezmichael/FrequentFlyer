import { Suspense } from 'react';
import MapPageClient from '@/features/frequent-flyer/components/MapPageClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getVenues, getGuides } from '@/lib/queries';

// Force dynamic rendering since we are fetching live data
export const dynamic = 'force-dynamic';

export default async function MapPage() {
    const [events, venues, guides] = await Promise.all([
        getEvents(),
        getVenues(),
        getGuides()
    ]);

    return (
        <Suspense fallback={<PageLoader />}>
            <MapPageClient initialEvents={events} venues={venues} guides={guides} />
        </Suspense>
    );
}
