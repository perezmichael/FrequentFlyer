'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import FlyerCard from '@/components/FlyerCard';
import { Event } from '@/features/frequent-flyer/data/events';
import { RecurringEvent } from '@/features/frequent-flyer/data/recurringEvents';
import RecurringEventsTab from './RecurringEventsTab';

const DATE_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'This Weekend', value: 'weekend' },
    { label: 'This Week', value: 'week' },
    { label: 'All', value: 'all' },
] as const;

function getDatePresetRange(preset: string): { from: Date; to: Date } | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'today') {
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: today, to: end };
    }

    if (preset === 'weekend') {
        const day = today.getDay(); // 0=Sun, 1=Mon … 5=Fri, 6=Sat
        // If we're already in the weekend (Fri/Sat/Sun) anchor on this Friday,
        // otherwise jump to the next Friday.
        let fri: Date;
        if (day === 6) {
            fri = new Date(today);
            fri.setDate(today.getDate() - 1); // yesterday was Friday
        } else if (day === 0) {
            fri = new Date(today);
            fri.setDate(today.getDate() - 2); // two days ago was Friday
        } else {
            // Mon(1)–Fri(5): 0 days ahead when day===5, otherwise 5-day ahead
            fri = new Date(today);
            fri.setDate(today.getDate() + (5 - day));
        }
        const sun = new Date(fri);
        sun.setDate(fri.getDate() + 2);
        sun.setHours(23, 59, 59, 999);
        // If part of the weekend is already past, start from today
        const from = fri < today ? today : fri;
        return { from, to: sun };
    }

    if (preset === 'week') {
        const end = new Date(today);
        end.setDate(today.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        return { from: today, to: end };
    }

    return null; // 'all' — no additional constraint beyond upcoming
}

// Normalise any ISO date string to local midnight for safe day-level comparisons
function toLocalMidnight(dateStr: string): Date {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface Props {
    initialEvents: Event[];
    recurringEvents?: RecurringEvent[];
}

export default function EventsPageClient({ initialEvents, recurringEvents = [] }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const tab = searchParams.get('tab') || 'upcoming';
    const datePreset = searchParams.get('date') || 'all';
    const neighborhoodFilter = searchParams.get('neighborhood');
    const vibeFilter = searchParams.get('vibe');

    // Derive unique options from the live dataset
    const neighborhoods = useMemo(() => {
        const set = new Set(initialEvents.map(e => e.neighborhood).filter(Boolean));
        return Array.from(set).sort();
    }, [initialEvents]);

    const vibes = useMemo(() => {
        const set = new Set(initialEvents.flatMap(e => e.vibe || []));
        return Array.from(set).sort();
    }, [initialEvents]);

    const todayMidnight = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const filteredEvents = useMemo(() => {
        const dateRange = (tab !== 'archive' && datePreset !== 'all')
            ? getDatePresetRange(datePreset)
            : null;

        return initialEvents.filter(event => {
            const eventDate = toLocalMidnight(event.date);

            // Temporal tab split
            if (tab === 'archive') {
                if (eventDate >= todayMidnight) return false;
            } else {
                if (eventDate < todayMidnight) return false;
            }

            // Date preset (upcoming only)
            if (dateRange) {
                if (eventDate < dateRange.from || eventDate > dateRange.to) return false;
            }

            // Neighborhood
            if (neighborhoodFilter && event.neighborhood !== neighborhoodFilter) return false;

            // Vibe
            if (vibeFilter && !event.vibe?.includes(vibeFilter)) return false;

            return true;
        });
    }, [initialEvents, tab, datePreset, neighborhoodFilter, vibeFilter, todayMidnight]);

    function setParam(key: string, value: string | null) {
        const params = new URLSearchParams(searchParams.toString());
        if (value === null) {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    }

    const pillBase =
        'font-space-mono text-[12px] uppercase tracking-[-0.48px] px-[14px] py-[7px] rounded-full border transition-colors whitespace-nowrap cursor-pointer';
    const pillActive = 'bg-black text-[#FFFAEB] border-black';
    const pillInactive = 'bg-transparent text-black border-black/30 hover:border-black';

    const isDateActive = (value: string) =>
        value === 'all' ? !searchParams.get('date') : datePreset === value;

    return (
        <div className="bg-[#FFFAEB] relative min-h-screen w-full font-sans pt-[100px] md:pt-[160px]">
            <div className="page-container">

                {/* Upcoming / Regulars / Archive tabs */}
                <div className="flex gap-[16px] mb-[24px]">
                    <button
                        onClick={() => setParam('tab', null)}
                        className={`font-space-mono leading-[1.25] not-italic text-[16px] tracking-[-0.64px] uppercase ${tab !== 'archive' && tab !== 'regulars' ? 'underline decoration-solid text-black' : 'text-brand hover:text-black transition-colors'}`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setParam('tab', 'regulars')}
                        className={`font-space-mono leading-[1.25] not-italic text-[16px] tracking-[-0.64px] uppercase ${tab === 'regulars' ? 'underline decoration-solid text-black' : 'text-brand hover:text-black transition-colors'}`}
                    >
                        Regulars
                    </button>
                    <button
                        onClick={() => setParam('tab', 'archive')}
                        className={`font-space-mono leading-[1.25] not-italic text-[16px] tracking-[-0.64px] uppercase ${tab === 'archive' ? 'underline decoration-solid text-black' : 'text-brand hover:text-black transition-colors'}`}
                    >
                        Archive
                    </button>
                </div>

                {/* Regulars tab content */}
                {tab === 'regulars' && (
                    <RecurringEventsTab
                        events={recurringEvents}
                        pillBase={pillBase}
                        pillActive={pillActive}
                        pillInactive={pillInactive}
                    />
                )}

                {/* Filter pills — Upcoming only */}
                {tab !== 'archive' && tab !== 'regulars' && (
                    <div className="flex flex-col gap-[10px] mb-[28px]">

                        {/* Date presets */}
                        <div className="no-scrollbar flex gap-[8px] overflow-x-auto pb-[2px]">
                            {DATE_PRESETS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setParam('date', p.value === 'all' ? null : p.value)}
                                    className={`${pillBase} ${isDateActive(p.value) ? pillActive : pillInactive}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Neighborhood pills */}
                        {neighborhoods.length > 0 && (
                            <div className="no-scrollbar flex gap-[8px] overflow-x-auto pb-[2px]">
                                <button
                                    onClick={() => setParam('neighborhood', null)}
                                    className={`${pillBase} ${!neighborhoodFilter ? pillActive : pillInactive}`}
                                >
                                    All Areas
                                </button>
                                {neighborhoods.map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setParam('neighborhood', neighborhoodFilter === n ? null : n)}
                                        className={`${pillBase} ${neighborhoodFilter === n ? pillActive : pillInactive}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Vibe pills */}
                        {vibes.length > 0 && (
                            <div className="no-scrollbar flex gap-[8px] overflow-x-auto pb-[2px]">
                                <button
                                    onClick={() => setParam('vibe', null)}
                                    className={`${pillBase} ${!vibeFilter ? pillActive : pillInactive}`}
                                >
                                    All Vibes
                                </button>
                                {vibes.map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setParam('vibe', vibeFilter === v ? null : v)}
                                        className={`${pillBase} ${vibeFilter === v ? pillActive : pillInactive}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab !== 'regulars' && (
                    <p className="font-space-grotesk font-normal leading-[1.25] text-[14px] text-black/50 tracking-[-0.64px] mb-[24px]">
                        {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} · tap or hover a flyer for details
                    </p>
                )}
            </div>

            {/* Flyers Grid — only for Upcoming/Archive */}
            {tab !== 'regulars' && (
                <div className="page-container pb-[80px]">
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
                        <div className="min-h-[400px] flex items-center justify-center font-['Space_Mono'] text-brand">
                            No events found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
