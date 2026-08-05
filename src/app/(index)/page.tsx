import { Suspense } from 'react';
import HomeClient from '@/features/frequent-flyer/components/HomeClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getRecurringEvents } from '@/lib/queries';
import type { Metadata } from 'next';

// Force dynamic rendering since we are fetching live data
export const dynamic = 'force-dynamic';

// Declared here rather than on the root layout: a canonical set on the layout
// is inherited by every child that doesn't override it, which had every event
// page announcing itself as a duplicate of this one.
export const metadata: Metadata = {
    alternates: { canonical: '/' },
};

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
