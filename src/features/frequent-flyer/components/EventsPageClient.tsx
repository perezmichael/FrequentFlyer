'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import FlyerCard, { FlyerEvent } from '@/components/FlyerCard';
import TipsBill from '@/components/TipsBill';
import { Event } from '@/features/frequent-flyer/data/events';

interface HomeClientProps {
    initialEvents: Event[];
}

export default function EventsPageClient({ initialEvents }: HomeClientProps) {
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
        <div className="bg-[#FFFAEB] relative min-h-screen w-full font-sans" style={{ paddingTop: '160px' }}>
            {/* Tabs / Filter Status */}
            <div className="page-container">
                <div className="flex gap-[16px]">
                    <p className="decoration-solid font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] underline uppercase cursor-pointer">
                        Upcoming
                    </p>
                    <p className="font-space-mono leading-[1.25] not-italic text-[#5d39ac] text-[16px] tracking-[-0.64px] uppercase cursor-pointer hover:text-black transition-colors">
                        archive
                    </p>
                </div>
                <p className="font-space-grotesk font-normal leading-[1.25] text-[16px] text-black tracking-[-0.64px] mt-[21px]">
                    *Hover over a flyer for details
                </p>
            </div>

            {/* Flyers Grid */}
            <div className="page-container mt-[24px] pb-[80px]">
                {filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[32px] w-full">
                        {filteredEvents.map((event) => (
                            <FlyerCard
                                key={event.id}
                                image={event.image || '/nanobanana_placeholder.png'}
                                event={event}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="min-h-[400px] flex items-center justify-center font-['Space_Mono'] text-[#5d39ac]">
                        No events found for this filter.
                    </div>
                )}
            </div>
        </div>
    );
}
