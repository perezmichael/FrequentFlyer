'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/features/frequent-flyer/components/Navbar';

export default function NavbarWrapper() {
    const pathname = usePathname();
    if (pathname.startsWith('/admin')) return null;
    return <Navbar />;
}
