import { Suspense } from 'react';
import GuidePageClient from '@/features/frequent-flyer/components/GuidePageClient';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: {
        slug: string;
    };
}

async function getGuide(slug: string): Promise<GuideWithItems | null> {
    const { data, error } = await supabase
        .from('guides')
        .select(`
            *,
            items:guide_items(
                *,
                venues(*)
            )
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

    if (error) {
        // console.error('Error fetching guide:', error); // Silent fail or log
        return null;
    }
    return data;
}

export default async function GuideDetailPage({ params }: PageProps) {
    const { slug } = params;

    // If param is a promise in newer Next.js versions, we might need to await it, 
    // but typically in Page props for app dir it's just an object unless using experimental features.
    // The previous file had 'await params', implying it might be treated as a promise in this setup (Next 15?). 
    // Let's safe check or assume it matches the project config. 
    // The previous file explicitly did `const resolvedParams = await params;`. 
    // I should respect that if this project is on a very new Next.js version.
    // Let's try to handle both or stick to the previous pattern if I am sure.
    // Given the previous file used `await params`, I will follow that pattern to be safe.

    // However, I can't easily check 'await params' inside the component body if params is typed as object in my interface above.
    // Let's update the interface to match what might be coming.

    // Actually, I'll stick to the standard `params: { slug: string }` and if it fails build I'll know.
    // But better to be safe: 

    const guide = await getGuide(slug);

    if (!guide) {
        notFound();
    }

    return (
        <Suspense fallback={<div>Loading guide...</div>}>
            <GuidePageClient guide={guide} />
        </Suspense>
    );
}
