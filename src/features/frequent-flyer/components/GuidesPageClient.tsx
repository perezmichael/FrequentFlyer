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
        <div className="min-h-screen bg-[#FFFAEB]" style={{ paddingTop: '160px' }}>
            {/* Header */}
            <div className="page-container" style={{ paddingBottom: '32px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: '48px', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '-1.44px', color: '#000' }}>
                    Los Angeles Guides
                </h1>
                <p style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '18px', color: 'rgba(0,0,0,0.7)', marginTop: '12px' }}>
                    Curated neighborhood guides and insider tips for exploring LA
                </p>
            </div>

            {/* Guides Grid */}
            <div className="page-container" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
                <GuidesGrid guides={guides} onSelectGuide={handleSelectGuide} />
            </div>
        </div>
    );
}
