import { Suspense } from 'react';
import HomeClient from '@/features/frequent-flyer/components/HomeClient';
import PageLoader from '@/components/PageLoader';
import { getEvents, getRecurringEvents, getCollections } from '@/lib/queries';
import { homepageJsonLd } from '@/lib/schema';
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
    const [events, recurringEvents, collections] = await Promise.all([
        getEvents(),
        getRecurringEvents(),
        getCollections(),
    ]);

    return (
        <>
            {/* "What's on in LA this weekend" is the question this page answers,
                and it's increasingly asked of an assistant rather than typed
                into a search box — AI is now the site's largest single traffic
                source. The feed renders server-side so a crawler can read it,
                but it was a megabyte of prose with nothing machine-readable in
                it. This states the same answer as data. */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd(events)) }}
            />
            <Suspense fallback={<PageLoader />}>
                <HomeClient initialEvents={events} recurringEvents={recurringEvents} collections={collections} />
            </Suspense>
        </>
    );
}
