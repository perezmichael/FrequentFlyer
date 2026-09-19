'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

/**
 * Renders the footer on content pages only.
 *
 * The excluded routes are full-bleed app surfaces — the split list/map home,
 * the map itself, the flyer studio, the design reference and admin — where the
 * viewport IS the interface and appending a scrolling block below it would
 * change the layout rather than sit under it.
 */
const NO_FOOTER = ['/map', '/admin', '/studio', '/design', '/events2'];

export default function FooterWrapper() {
    const pathname = usePathname();
    if (pathname === '/') return null;
    if (NO_FOOTER.some(p => pathname.startsWith(p))) return null;
    return <Footer />;
}
