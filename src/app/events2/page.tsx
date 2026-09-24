import { Suspense } from 'react';
import Events2PageClient from '@/features/frequent-flyer/components/Events2PageClient';
import { events } from '@/features/frequent-flyer/data/events';
import PageLoader from '@/components/PageLoader';
import type { Metadata } from 'next';

/**
 * Kept on purpose as a static UI reference, which makes it a deliberate
 * duplicate of /events — and Google reported it as a duplicate with no
 * canonical.
 *
 * `noindex` rather than a canonical: the content here is frozen sample data,
 * not another view of the live feed, so pointing Google at /events would claim
 * an equivalence that isn't true. Note this only works because robots.txt no
 * longer disallows the route — a page the crawler is forbidden to fetch is a
 * page whose noindex it can never read.
 */
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function Events2Page() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Events2PageClient events={events} />
        </Suspense>
    );
}
