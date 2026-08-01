import { Suspense } from 'react';
import EventsPageClient from '@/features/frequent-flyer/components/EventsPageClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getRecurringEvents } from '@/lib/queries';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Events this week in Los Angeles',
    description:
        "Every show, DJ night, reading and pop-up we're tracking across LA — browse by day and neighbourhood, or find a recurring night to become a regular at.",
    alternates: { canonical: '/events' },
    openGraph: {
        title: 'Events this week in Los Angeles',
        description:
            "Every show, DJ night, reading and pop-up we're tracking across LA, browsable by day and neighbourhood.",
        url: '/events',
    },
};

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
