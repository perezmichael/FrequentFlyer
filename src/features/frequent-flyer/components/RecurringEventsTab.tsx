'use client';

import { useMemo, useState } from 'react';
import { RecurringEvent, DAY_NAMES_SHORT } from '@/features/frequent-flyer/data/recurringEvents';
import RecurringEventCard from './RecurringEventCard';

interface RecurringEventsTabProps {
    events: RecurringEvent[];
    pillBase: string;
    pillActive: string;
    pillInactive: string;
}

export default function RecurringEventsTab({ events, pillBase, pillActive, pillInactive }: RecurringEventsTabProps) {
    // Default to current day of week
    const today = new Date().getDay();
    const [dayFilter, setDayFilter] = useState<number | null>(today);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [neighborhoodFilter, setNeighborhoodFilter] = useState<string | null>(null);

    const categories = useMemo(() => {
        const set = new Set(events.map(e => e.category));
        return Array.from(set).sort();
    }, [events]);

    const neighborhoods = useMemo(() => {
        const set = new Set(events.map(e => e.neighborhood).filter(n => n && n !== 'Unknown'));
        return Array.from(set).sort();
    }, [events]);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            if (dayFilter !== null && event.day_of_week !== dayFilter) return false;
            if (categoryFilter && event.category !== categoryFilter) return false;
            if (neighborhoodFilter && event.neighborhood !== neighborhoodFilter) return false;
            return true;
        });
    }, [events, dayFilter, categoryFilter, neighborhoodFilter]);

    return (
        <>
            {/* Filter pills */}
            <div className="flex flex-col gap-[10px] mb-[28px]">
                {/* Day-of-week pills */}
                <div className="no-scrollbar flex gap-[8px] overflow-x-auto pb-[2px]">
                    <button
                        onClick={() => setDayFilter(null)}
                        className={`${pillBase} ${dayFilter === null ? pillActive : pillInactive}`}
                    >
                        All Days
                    </button>
                    {DAY_NAMES_SHORT.map((name, i) => (
                        <button
                            key={i}
                            onClick={() => setDayFilter(dayFilter === i ? null : i)}
                            className={`${pillBase} ${dayFilter === i ? pillActive : pillInactive}`}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                {/* Category pills */}
                {categories.length > 0 && (
                    <div className="no-scrollbar flex gap-[8px] overflow-x-auto pb-[2px]">
                        <button
                            onClick={() => setCategoryFilter(null)}
                            className={`${pillBase} ${!categoryFilter ? pillActive : pillInactive}`}
                        >
                            All Types
                        </button>
                        {categories.map(c => (
                            <button
                                key={c}
                                onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
                                className={`${pillBase} ${categoryFilter === c ? pillActive : pillInactive}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}

                {/* Neighborhood pills */}
                {neighborhoods.length > 0 && (
                    <div className="no-scrollbar flex gap-[8px] overflow-x-auto pb-[2px]">
                        <button
                            onClick={() => setNeighborhoodFilter(null)}
                            className={`${pillBase} ${!neighborhoodFilter ? pillActive : pillInactive}`}
                        >
                            All Areas
                        </button>
                        {neighborhoods.map(n => (
                            <button
                                key={n}
                                onClick={() => setNeighborhoodFilter(neighborhoodFilter === n ? null : n)}
                                className={`${pillBase} ${neighborhoodFilter === n ? pillActive : pillInactive}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Count */}
            <p className="font-space-mono text-[13px] text-black/50 uppercase tracking-[-0.26px] mb-[20px]">
                {filteredEvents.length} recurring event{filteredEvents.length !== 1 ? 's' : ''}
            </p>

            {/* Grid */}
            {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[24px] gap-y-[40px]">
                    {filteredEvents.map(event => (
                        <RecurringEventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-black/40">
                    <p className="font-space-mono text-sm uppercase">No recurring events found for this filter.</p>
                </div>
            )}
        </>
    );
}
