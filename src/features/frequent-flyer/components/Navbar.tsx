'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import TipsBill from '@/components/TipsBill';
import styles from './Navbar.module.css';

export default function Navbar() {
    const pathname = usePathname();
    const isGuideDetailPage = pathname.startsWith('/guides/') && pathname !== '/guides';
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinkClass = "font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline underline-offset-4 decoration-2";

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] ${isGuideDetailPage ? 'bg-[#FFFAEB]' : 'bg-transparent'}`}>
            <div className="page-container w-full flex justify-between items-center h-[100px]">
                {/* Logo and title */}
                <Link href="/" className="flex items-center gap-[16px] group no-underline">
                    <div className="h-[64px] w-[123px] relative shrink-0">
                        <Image
                            alt="Frequent Flyer Logo"
                            className="object-contain"
                            fill
                            src="/images/fflogo20.png"
                            priority
                        />
                    </div>
                    <div className="font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase whitespace-nowrap block">
                        <p className="mb-0">Frequent Flyer</p>
                        <p>Los Angeles</p>
                    </div>
                </Link>

                {/* Desktop nav — hidden below 768px via CSS module */}
                <div className={styles.desktopNav}>
                    <Link href="/" className={navLinkClass}>home</Link>
                    <Link href="/events" className={navLinkClass}>events</Link>
                    <Link href="/events2" className={navLinkClass}>events 2</Link>
                    <Link href="/map" className={navLinkClass}>map</Link>
                    <Link href="/guides" className={navLinkClass}>guides</Link>
                    <TipsBill />
                </div>

                {/* Hamburger button — hidden above 768px via CSS module */}
                <button
                    className={styles.hamburgerButton}
                    onClick={() => setIsMenuOpen(prev => !prev)}
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile dropdown — CSS module hides this above 768px */}
            {isMenuOpen && (
                <div className={styles.mobileDropdown}>
                    <Link href="/" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>home</Link>
                    <Link href="/events" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>events</Link>
                    <Link href="/events2" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>events 2</Link>
                    <Link href="/map" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>map</Link>
                    <Link href="/guides" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>guides</Link>
                    <TipsBill />
                </div>
            )}
        </nav>
    );
}
