'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import FlyerCard, { FlyerEvent } from '@/components/FlyerCard';
import TipsBill from '@/components/TipsBill';
import styles from './HomeClient.module.css';
import dynamic from 'next/dynamic';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading Map...</div>
});

import { Event } from '@/features/frequent-flyer/data/events';

interface HomeClientProps {
    initialEvents: Event[];
}

export default function HomeClient({ initialEvents }: HomeClientProps) {
    const searchParams = useSearchParams();

    // Read Filters
    const neighborhoodFilter = searchParams.get('neighborhood');
    const vibeFilter = searchParams.get('vibe');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Filter Logic (Events)
    const filteredEvents = useMemo(() => {
        // Default to Current Week if no filters are present
        let targetFromDate: Date | null = fromDate ? new Date(fromDate) : null;
        let targetToDate: Date | null = toDate ? new Date(toDate) : null;

        // If no date filter is provided, default to "This Week" (Today -> +7 days)
        /* 
        if (!fromDate && !toDate) {
            const today = new Date();
            targetFromDate = today;

            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            targetToDate = nextWeek;
        } 
        */

        return initialEvents.filter(event => {
            // Neighborhood Filter
            if (neighborhoodFilter && event.neighborhood !== neighborhoodFilter) {
                return false;
            }

            // Vibe Filter
            if (vibeFilter && !event.vibe.includes(vibeFilter)) {
                return false;
            }

            // Date Range Filter
            // Skip complex parsing for now to ensure events show up
            /*
            const eventDate = new Date(event.date); // Ensure date string is parsable

            if (targetFromDate) {
                // Reset time for fair comparison
                const from = new Date(targetFromDate);
                from.setHours(0, 0, 0, 0);
                if (eventDate < from) return false;
            }

            if (targetToDate) {
                const to = new Date(targetToDate);
                // Set to end of day for inclusive filtering
                to.setHours(23, 59, 59, 999);
                if (eventDate > to) return false;
            }
            */

            return true;
        });
    }, [initialEvents, neighborhoodFilter, vibeFilter, fromDate, toDate]);

    return (
        <div className={styles.main} style={{ paddingTop: '80px' }}>
            <div className={styles.splitLayout}>
                {/* Left Column: Events Grid */}
                <div className={styles.listContainer}>
                    <div className={styles.header}>
                        <h1 className="font-space-grotesk font-bold leading-[1.25] text-[32px] text-black tracking-[-0.96px] uppercase mb-[8px]">
                            Active Dashboard
                        </h1>
                        <p className="font-space-mono text-[14px] text-black/60 uppercase">
                            {filteredEvents.length} Upcoming Events
                        </p>
                    </div>

                    {filteredEvents.length > 0 ? (
                        <div className={styles.grid}>
                            {filteredEvents.map((event) => (
                                <FlyerCard
                                    key={event.id}
                                    image={event.image || '/nanobanana_placeholder.png'}
                                    event={event}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.noResults}>
                            No events found for this filter.
                        </div>
                    )}
                </div>

                {/* Right Column: Map */}
                <div className={styles.mapContainer}>
                    <div className={styles.mapWrapper}>
                        <Map
                            events={filteredEvents}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
