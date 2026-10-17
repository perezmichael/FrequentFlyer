import { Suspense } from 'react';
import GuidesPageClient from '@/features/frequent-flyer/components/GuidesPageClient';
import PageLoader from '@/components/PageLoader';
import { getGuides } from '@/lib/queries';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'LA neighbourhood guides',
    description:
        'Hand-built guides to Los Angeles by neighbourhood, starting with a day in Thai Town.',
    alternates: { canonical: '/guides' },
    openGraph: {
        title: 'LA neighbourhood guides',
        description:
            'Hand-built guides to Los Angeles by neighbourhood.',
        url: '/guides',
    },
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function GuidesPage() {
    const guides = await getGuides();

    return (
        <Suspense fallback={<PageLoader />}>
            <GuidesPageClient guides={guides} />
        </Suspense>
    );
}
