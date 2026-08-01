import { Suspense } from 'react';
import GuidesPageClient from '@/features/frequent-flyer/components/GuidesPageClient';
import PageLoader from '@/components/PageLoader';
import { supabase } from '@/lib/supabase';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'LA neighbourhood guides',
    description:
        'Hand-built guides to Los Angeles by neighbourhood and mood — hidden jazz bars, a day in Thai Town, Silver Lake nights, Eastside brews.',
    alternates: { canonical: '/guides' },
    openGraph: {
        title: 'LA neighbourhood guides',
        description:
            'Hand-built guides to Los Angeles by neighbourhood and mood.',
        url: '/guides',
    },
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getGuides(): Promise<GuideWithItems[]> {
    const { data, error } = await supabase
        .from('guides')
        .select(`
            *,
            items:guide_items(
                *,
                venues(*)
            )
        `);

    if (error) {
        console.error('Error fetching guides:', error);
        return [];
    }
    return data || [];
}

export default async function GuidesPage() {
    const guides = await getGuides();

    return (
        <Suspense fallback={<PageLoader />}>
            <GuidesPageClient guides={guides} />
        </Suspense>
    );
}
