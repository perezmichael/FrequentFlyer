import { Suspense } from 'react';
import EventsPageClient from '@/features/frequent-flyer/components/EventsPageClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getRecurringEvents } from '@/lib/queries';

// Force dynamic rendering since we are fetching live data
export const dynamic = 'force-dynamic';

export default async function EventsPage() {
    const [events, recurringEvents] = await Promise.all([
        getEvents(),
        getRecurringEvents(),
    ]);

    return (
        <Suspense fallback={<PageLoader />}>
            <EventsPageClient initialEvents={events} recurringEvents={recurringEvents} />
        </Suspense>
    );
}
