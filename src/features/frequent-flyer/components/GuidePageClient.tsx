'use client';

import { useRouter } from 'next/navigation';
import GuideDetail from './GuideDetail';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';

interface GuidePageClientProps {
    guide: GuideWithItems;
}

export default function GuidePageClient({ guide }: GuidePageClientProps) {
    const router = useRouter();

    const handleBack = () => {
        router.push('/guides');
    };

    return (
        <div className="min-h-screen bg-cream">
            <GuideDetail guide={guide} onBack={handleBack} />
        </div>
    );
}
