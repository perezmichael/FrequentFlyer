import type { Metadata } from 'next';
import Link from 'next/link';
import { createPill, navLink } from '@/features/frequent-flyer/design/patterns';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/site';

/**
 * Still a placeholder, so it's kept out of the index — thin content competing
 * for the site's own queries helps nobody. The canonical stays because the
 * trailing-slash twin exists either way.
 */
export const metadata: Metadata = {
    title: 'Tips',
    alternates: { canonical: '/tips' },
    robots: { index: false, follow: true },
};

export default function TipsPage() {
    return (
        <div className="bg-cream min-h-screen w-full flex flex-col items-center justify-center gap-[16px] px-6 pt-[100px] text-center grain-soft">
            <p className="stamp text-[12px]">tips · coming soon</p>
            <h1 className="font-space-grotesk text-[44px] leading-none font-bold text-ink">
                thanks for flying with us
            </h1>
            <p className="font-space-mono text-[14px] text-black/55 max-w-[440px]">
                Frequent Flyer pulls LA&apos;s best nights off the
                telephone poles and into one place. We appreciate you being here.
                A way to leave a tip is on its way.
            </p>
            <p className="font-space-mono text-[14px] text-black/55 max-w-[440px]">
                Until then, the best support is free: follow along and send this to
                a friend who never knows what&apos;s happening this weekend.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-[24px] mt-[8px]">
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={createPill}>
                    @{INSTAGRAM_HANDLE} ↗
                </a>
                <Link href="/" className={navLink}>
                    back to the flyers
                </Link>
            </div>
        </div>
    );
}
