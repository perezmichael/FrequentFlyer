import Navbar from '@/features/frequent-flyer/components/Navbar';
import { Suspense } from 'react';

export default function FrequentFlyerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ minHeight: '100vh', background: '#fff' }}>
            <Suspense fallback={<div style={{ height: '80px' }} />}>
                <Navbar />
            </Suspense>
            <main style={{ paddingTop: '80px' }}>
                {children}
            </main>
        </div>
    );
}
