import Link from 'next/link';
import { navLink } from '@/features/frequent-flyer/design/patterns';

export default function NotFound() {
    return (
        <div className="bg-cream min-h-screen w-full flex flex-col items-center justify-center gap-[16px] px-6 text-center grain-soft">
            <p className="stamp text-[12px]">404</p>
            <h1 className="font-space-grotesk text-[44px] leading-none font-bold text-ink">
                this page moved on
            </h1>
            <p className="font-space-mono text-[14px] text-black/55 max-w-[420px]">
                like all the best parties, it&apos;s not at this address anymore.
            </p>
            <Link href="/" className={navLink}>
                back to the flyers
            </Link>
        </div>
    );
}
