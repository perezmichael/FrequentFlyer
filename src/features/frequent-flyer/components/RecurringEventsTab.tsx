'use client';

import { useMemo, useState } from 'react';
import { RecurringEvent, DAY_NAMES_SHORT } from '@/features/frequent-flyer/data/recurringEvents';
import RecurringEventCard from './RecurringEventCard';
import FilterPillRow from './FilterPillRow';

interface RecurringEventsTabProps {
    events: RecurringEvent[];
}

export default function RecurringEventsTab({ events }: RecurringEventsTabProps) {
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
                <FilterPillRow
                    aria-label="Filter by day"
                    pills={[
                        { key: '__all', label: 'All Days', active: dayFilter === null, onClick: () => setDayFilter(null) },
                        ...DAY_NAMES_SHORT.map((name, i) => ({
                            key: String(i),
                            label: name,
                            active: dayFilter === i,
                            onClick: () => setDayFilter(dayFilter === i ? null : i),
                        })),
                    ]}
                />

                {/* Category pills */}
                {categories.length > 0 && (
                    <FilterPillRow
                        aria-label="Filter by type"
                        pills={[
                            { key: '__all', label: 'All Types', active: !categoryFilter, onClick: () => setCategoryFilter(null) },
                            ...categories.map(c => ({
                                key: c,
                                label: c,
                                active: categoryFilter === c,
                                onClick: () => setCategoryFilter(categoryFilter === c ? null : c),
                            })),
                        ]}
                    />
                )}

                {/* Neighborhood pills */}
                {neighborhoods.length > 0 && (
                    <FilterPillRow
                        aria-label="Filter by neighborhood"
                        pills={[
                            { key: '__all', label: 'All Areas', active: !neighborhoodFilter, onClick: () => setNeighborhoodFilter(null) },
                            ...neighborhoods.map(n => ({
                                key: n,
                                label: n,
                                active: neighborhoodFilter === n,
                                onClick: () => setNeighborhoodFilter(neighborhoodFilter === n ? null : n),
                            })),
                        ]}
                    />
                )}
            </div>

            {/* Count */}
            <p className="font-space-mono text-[13px] text-black/50 uppercase tracking-[-0.26px] mb-[20px]">
                {filteredEvents.length} recurring event{filteredEvents.length !== 1 ? 's' : ''}
            </p>

            {/* Grid */}
            {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[24px] gap-y-[40px] stagger-in">
                    {filteredEvents.map(event => (
                        <RecurringEventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-1">
                    <p className="font-space-mono text-sm uppercase tracking-[-0.44px] text-ink">no weeklies match.</p>
                    <p className="font-space-mono text-sm text-black/55">every night deserves a regular thing. try another filter.</p>
                </div>
            )}
        </>
    );
}
