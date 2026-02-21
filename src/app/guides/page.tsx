import { Suspense } from 'react';
import GuidesPageClient from '@/features/frequent-flyer/components/GuidesPageClient';
import { supabase } from '@/lib/supabase';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';

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
        <Suspense fallback={<div>Loading guides...</div>}>
            <GuidesPageClient guides={guides} />
        </Suspense>
    );
}
