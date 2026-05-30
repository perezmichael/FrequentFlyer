'use client';

import { useState, useMemo } from 'react';
import { RecurringEvent, DAY_NAMES_SHORT } from '@/features/frequent-flyer/data/recurringEvents';
import AdminRecurringEventCard from './AdminRecurringEventCard';
import { Button } from '@/components/ui/button';

interface AdminRecurringEventListProps {
    events: (RecurringEvent & { status: string })[];
}

export default function AdminRecurringEventList({ events }: AdminRecurringEventListProps) {
    const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [dayFilter, setDayFilter] = useState<number | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [areaFilter, setAreaFilter] = useState<string | null>(null);

    const areas = useMemo(() => {
        const set = new Set(events.map(e => e.neighborhood).filter(n => n && n !== 'Unknown'));
        return Array.from(set).sort();
    }, [events]);

    const categories = useMemo(() => {
        const set = new Set(events.map(e => e.category));
        return Array.from(set).sort();
    }, [events]);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            if (event.status !== statusFilter) return false;
            if (dayFilter !== null && event.day_of_week !== dayFilter) return false;
            if (categoryFilter && event.category !== categoryFilter) return false;
            if (areaFilter && event.neighborhood !== areaFilter) return false;
            return true;
        });
    }, [events, statusFilter, dayFilter, categoryFilter, areaFilter]);

    const pillBase =
        'font-space-mono text-[12px] uppercase tracking-[-0.48px] px-[14px] py-[7px] rounded-full border transition-colors whitespace-nowrap cursor-pointer';
    const pillActive = 'bg-black text-[#FFFAEB] border-black';
    const pillInactive = 'bg-transparent text-black border-black/30 hover:border-black';

    return (
        <div className="space-y-6">
            {/* Status tabs */}
            <div className="flex gap-2 p-1 bg-muted w-fit rounded-lg">
                {(['pending', 'approved', 'rejected'] as const).map(status => (
                    <Button
                        key={status}
                        variant={statusFilter === status ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                        className="capitalize"
                    >
                        {status}
                        <span className="ml-2 bg-primary-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
                            {events.filter(e => e.status === status).length}
                        </span>
                    </Button>
                ))}
            </div>

            {/* Filter pills */}
            <div className="flex flex-col gap-[10px]">
                {/* Day-of-week pills */}
                <div className="flex gap-[8px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: 'none' }}>
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
                    <div className="flex gap-[8px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: 'none' }}>
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

                {/* Area pills */}
                {areas.length > 0 && (
                    <div className="flex gap-[8px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: 'none' }}>
                        <button
                            onClick={() => setAreaFilter(null)}
                            className={`${pillBase} ${!areaFilter ? pillActive : pillInactive}`}
                        >
                            All Areas
                        </button>
                        {areas.map(a => (
                            <button
                                key={a}
                                onClick={() => setAreaFilter(areaFilter === a ? null : a)}
                                className={`${pillBase} ${areaFilter === a ? pillActive : pillInactive}`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Result count */}
            <p className="text-sm text-muted-foreground">
                {filteredEvents.length} recurring event{filteredEvents.length !== 1 ? 's' : ''}
            </p>

            {/* Event grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEvents.map(event => (
                    <AdminRecurringEventCard key={event.id} event={event} />
                ))}
            </div>

            {filteredEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                    <p>No {statusFilter} recurring events found.</p>
                </div>
            )}
        </div>
    );
}
