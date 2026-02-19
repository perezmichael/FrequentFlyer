'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import TipsBill from '@/components/TipsBill';

export default function Navbar() {
    const pathname = usePathname();

    // Hide Navbar on Map page as it has its own overlay header
    if (pathname === '/map') {
        return null;
    }

    return (
        <nav className="absolute top-0 left-0 right-0 z-[100] bg-transparent h-[100px] flex items-center px-[40px]">
            <div className="w-full flex justify-between items-center p-0">
                {/* Logo and title */}
                <Link href="/" className="flex items-center gap-[16px] group no-underline">
                    <div className="h-[64px] w-[123px] relative shrink-0">
                        <Image
                            alt="Frequent Flyer Logo"
                            className="object-contain" // Changed to contain to fit box
                            fill
                            src="/frequent-flyer-logo.png"
                            priority
                        />
                    </div>
                    <div className="font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase whitespace-nowrap block">
                        <p className="mb-0">Frequent Flyer</p>
                        <p>Los Angeles</p>
                    </div>
                </Link>

                {/* Navigation */}
                <div className="flex gap-[32px] items-center">
                    <Link
                        href="/"
                        className="font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline underline-offset-4 decoration-2"
                    >
                        home
                    </Link>
                    <Link
                        href="/events"
                        className="font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
                    >
                        events
                    </Link>
                    <Link
                        href="/map"
                        className="font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
                    >
                        map
                    </Link>
                    <Link
                        href="/guides"
                        className="font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
                    >
                        guides
                    </Link>
                    <TipsBill />
                </div>
            </div>
        </nav>
    );
}
