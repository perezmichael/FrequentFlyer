'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GuidesGrid from './GuidesGrid';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';

interface GuidesPageClientProps {
    guides: GuideWithItems[];
}

export default function GuidesPageClient({ guides }: GuidesPageClientProps) {
    const router = useRouter();

    const handleSelectGuide = (guide: GuideWithItems) => {
        router.push(`/guides/${guide.slug}`);
    };

    return (
        <div className="min-h-screen bg-[#FFFAEB]">
            {/* Header */}
            <div className="px-[48px]  pt-[100px] pb-[32px] border-b border-black/10">
                <h1 className="font-space-grotesk font-bold leading-[1.2] text-[48px] text-black tracking-[-1.44px] uppercase">
                    Los Angeles Guides
                </h1>
                <p className="font-space-grotesk font-normal text-[18px] text-black/70 mt-[12px]">
                    Curated neighborhood guides and insider tips for exploring LA
                </p>
            </div>

            {/* Guides Grid */}
            <div className="px-[48px] py-[48px]">
                <GuidesGrid guides={guides} onSelectGuide={handleSelectGuide} />
            </div>
        </div>
    );
}
