'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import TipsBill from '@/components/TipsBill';
import styles from './Navbar.module.css';

export default function Navbar() {
    const pathname = usePathname();
    const isGuideDetailPage = pathname.startsWith('/guides/') && pathname !== '/guides';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Give the fixed navbar a solid background once the page scrolls so content
    // sliding underneath the transparent bar doesn't collide with the logo/title.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const isSolid = isGuideDetailPage || scrolled || isMenuOpen;

    const navLinkClass = "font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline underline-offset-4 decoration-2";
    const createPillClass = "font-space-mono leading-none not-italic text-[15px] text-black tracking-[-0.64px] uppercase border border-black/40 rounded-full px-5 py-2.5 hover:bg-black hover:text-[#FFFAEB] transition-colors no-underline whitespace-nowrap";

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-colors duration-200 ${isSolid ? 'bg-[#FFFAEB] border-b border-black/5' : 'bg-transparent'}`}>
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
                    <Link href="/create" className={createPillClass}>+ create</Link>
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
                    <Link href="/create" className={`${createPillClass} self-start`} onClick={() => setIsMenuOpen(false)}>+ create</Link>
                    <TipsBill />
                </div>
            )}
        </nav>
    );
}
