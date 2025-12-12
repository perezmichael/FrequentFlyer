'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';
import { events } from '@/features/frequent-flyer/data/events';
import { VIBES } from '@/data/vibes';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Filter States
    const [neighborhood, setNeighborhood] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [vibe, setVibe] = useState('');

    // Derived Data for Dropdowns
    const uniqueNeighborhoods = useMemo(() => Array.from(new Set(events.map(e => e.neighborhood))).sort(), []);

    // Sync state with URL params on mount/update
    useEffect(() => {
        setNeighborhood(searchParams.get('neighborhood') || '');
        setStartDate(searchParams.get('from') || '');
        setEndDate(searchParams.get('to') || '');
        setVibe(searchParams.get('vibe') || '');
    }, [searchParams]);

    // Click Outside to Close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (neighborhood) params.set('neighborhood', neighborhood);
        if (startDate) params.set('from', startDate);
        if (endDate) params.set('to', endDate);
        if (vibe) params.set('vibe', vibe);

        router.push(`/frequent-flyer?${params.toString()}`);
        setIsExpanded(false);
    };

    // Only hide main navbar logic (if this was shared, but it's isolated now)
    // if (pathname.startsWith('/frequent-flyer')) { ... } 
    // Since this IS the frequent flyer navbar, we don't need that check.

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/frequent-flyer" className={styles.logo}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/frequent-flyer-logo.png" alt="Frequent Flyer" style={{ height: '40px', objectFit: 'contain' }} />
                </Link>

                {/* Center Search / Expanded Filter */}
                <div className={styles.searchContainer} ref={searchContainerRef}>
                    <AnimatePresence mode="wait">
                        {!isExpanded ? (
                            <motion.div
                                key="collapsed"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className={styles.searchBar}
                                onClick={() => setIsExpanded(true)}
                            >
                                <div className={styles.searchLabel}>{neighborhood || 'Anywhere'}</div>
                                <div className={styles.searchLabel}>{(startDate && endDate) ? 'Selected dates' : 'Any week'}</div>
                                <div style={{ color: 'var(--secondary-foreground)' }}>{vibe || 'Any vibe'}</div>
                                <div className={styles.searchIcon}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="expanded"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className={styles.expandedSearch}
                            >
                                {/* Where: Neighborhood */}
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Where</label>
                                    <select
                                        className={styles.filterInput}
                                        value={neighborhood}
                                        onChange={(e) => setNeighborhood(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', width: '100%', outline: 'none' }}
                                    >
                                        <option value="">All Neighborhoods</option>
                                        {uniqueNeighborhoods.map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dates: From */}
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>From</label>
                                    <input
                                        type="date"
                                        className={styles.filterInput}
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                </div>

                                {/* Dates: To */}
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>To</label>
                                    <input
                                        type="date"
                                        className={styles.filterInput}
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                </div>

                                {/* Vibe */}
                                <div className={styles.filterGroup} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className={styles.filterLabel}>Vibe</label>
                                        <select
                                            className={styles.filterInput}
                                            value={vibe}
                                            onChange={(e) => setVibe(e.target.value)}
                                            style={{ background: 'transparent', border: 'none', width: '100%', outline: 'none' }}
                                        >
                                            <option value="">Any Vibe</option>
                                            {VIBES.map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.searchIcon} onClick={handleSearch} style={{ width: '48px', height: '48px', cursor: 'pointer' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* User Menu */}
                <div className={styles.userMenu}>
                    <div className={styles.profileButton}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="gray" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                </div>
            </div>
        </nav>
    );
}
