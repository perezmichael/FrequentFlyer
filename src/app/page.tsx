import { Suspense } from 'react';
import HomeClient from '@/features/frequent-flyer/components/HomeClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getRecurringEvents } from '@/lib/queries';

// Force dynamic rendering since we are fetching live data
export const dynamic = 'force-dynamic';

export default async function Page() {
    const [events, recurringEvents] = await Promise.all([
        getEvents(),
        getRecurringEvents(),
    ]);

    return (
        <Suspense fallback={<PageLoader />}>
            <HomeClient initialEvents={events} recurringEvents={recurringEvents} />
        </Suspense>
    );
}
