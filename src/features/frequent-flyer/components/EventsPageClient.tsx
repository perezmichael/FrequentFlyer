'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Event } from '@/features/frequent-flyer/data/events';
import { RecurringEvent } from '@/features/frequent-flyer/data/recurringEvents';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import { DATE_PRESETS, getDatePresetRange, toLocalMidnight } from '@/features/frequent-flyer/data/datePresets';
import { filterPill } from '@/features/frequent-flyer/design/patterns';
import RecurringEventsTab from './RecurringEventsTab';
import FilterPillRow from './FilterPillRow';
import FlyerWallTile from './FlyerWallTile';
import EventDetailSheet from './EventDetailSheet';

/* Masonry columns for the flyer wall, at Tailwind's sm/lg/2xl. Four holds
   until 2xl so each flyer stays big enough to read. */
function columnsFor(width: number): number {
    if (width >= 1536) return 5;
    if (width >= 1024) return 4;
    if (width >= 640) return 3;
    return 2;
}

function useColumnCount(): number {
    const [count, setCount] = useState(4);
    useEffect(() => {
        const update = () => setCount(columnsFor(window.innerWidth));
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return count;
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

    // Derive unique options from the live dataset
    const neighborhoods = useMemo(() => {
        const set = new Set(initialEvents.map(e => e.neighborhood).filter(Boolean));
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

            return true;
        });
    }, [initialEvents, tab, datePreset, neighborhoodFilter, todayMidnight]);

    /* One tile per flyer. A poster made for a run of dates ("every Friday in
     * October") would otherwise fill a row with the same image, so later dates
     * are dropped from the wall — the first date's tile stands for the run. A
     * venue photo reused by different events is a different case — those are
     * separate events that happen to share stock art — so they keep their
     * tiles and fall back to the generated flyer, the same rule the home feed
     * uses. */
    const tiles = useMemo(() => {
        const out: { event: Event; forcePlaceholder: boolean }[] = [];
        const seenFlyers = new Set<string>();
        const seenPhotos = new Set<string>();
        for (const event of filteredEvents) {
            const real = hasRealImage(event.image);
            if (real && event.imageIsFlyer) {
                if (seenFlyers.has(event.image!)) continue;
                seenFlyers.add(event.image!);
            }
            const forcePlaceholder = real && !event.imageIsFlyer && seenPhotos.has(event.image!);
            if (real && !event.imageIsFlyer) seenPhotos.add(event.image!);
            out.push({ event, forcePlaceholder });
        }
        return out;
    }, [filteredEvents]);

    const [detailEvent, setDetailEvent] = useState<Event | null>(null);

    /* Tiles are dealt across the columns like cards (0,1,2,3 · 4,5,6,7 …)
     * rather than filling column one first, which is what CSS `columns` does.
     * That keeps the wall reading in date order left to right — with CSS
     * columns the first column would be tonight and the last one next month. */
    const columnCount = useColumnCount();
    const columns = useMemo(() => {
        const cols: typeof tiles[] = Array.from({ length: columnCount }, () => []);
        tiles.forEach((tile, i) => cols[i % columnCount].push(tile));
        return cols;
    }, [tiles, columnCount]);

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

    const isDateActive = (value: string) =>
        value === 'all' ? !searchParams.get('date') : datePreset === value;

    return (
        <div className="bg-cream relative min-h-screen w-full font-sans pt-[100px] md:pt-[160px]">
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
                    <RecurringEventsTab events={recurringEvents} />
                )}

                {/* Filters — Upcoming only. One row: when first, then where.
                    The area list is long, so it's a select rather than a third
                    row of pills; vibe tags are too inconsistent in the data
                    ("Arts", "Art & Cultural", "Art/Community") to filter on. */}
                {tab !== 'archive' && tab !== 'regulars' && (
                    <div className="flex flex-wrap items-center gap-[8px] mb-[20px]">
                        <FilterPillRow
                            aria-label="Filter by date"
                            pills={DATE_PRESETS.map(p => ({
                                key: p.value,
                                label: p.label,
                                active: isDateActive(p.value),
                                onClick: () => setParam('date', p.value === 'all' ? null : p.value),
                            }))}
                        />
                        {neighborhoods.length > 0 && (
                            <label className="relative inline-flex">
                                <span className="sr-only">Filter by neighborhood</span>
                                <select
                                    value={neighborhoodFilter ?? ''}
                                    onChange={e => setParam('neighborhood', e.target.value || null)}
                                    className={`${filterPill(Boolean(neighborhoodFilter))} appearance-none pr-[28px]`}
                                >
                                    <option value="">All areas</option>
                                    {neighborhoods.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <span aria-hidden className={`pointer-events-none absolute right-[11px] top-1/2 -translate-y-1/2 text-[9px] ${neighborhoodFilter ? 'text-cream' : 'text-black'}`}>▾</span>
                            </label>
                        )}
                    </div>
                )}

                {tab !== 'regulars' && (
                    <p className="font-space-grotesk font-normal leading-[1.25] text-[14px] text-black/50 tracking-[-0.64px] mb-[24px]">
                        {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Flyers Grid — only for Upcoming/Archive */}
            {tab !== 'regulars' && (
                <div className="page-container pb-[80px]">
                    {filteredEvents.length > 0 ? (
                        <div className="flex items-start gap-[16px] md:gap-[32px] w-full">
                            {columns.map((col, c) => (
                                <div key={c} className="flex-1 min-w-0 flex flex-col gap-[28px] md:gap-[36px]">
                                    {col.map(({ event, forcePlaceholder }) => (
                                        <FlyerWallTile
                                            key={event.id}
                                            event={event}
                                            forcePlaceholder={forcePlaceholder}
                                            onOpen={setDetailEvent}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="min-h-[400px] flex flex-col items-center justify-center gap-2 text-center">
                            <p className="font-space-mono uppercase tracking-[-0.44px] text-ink">nothing here yet. criminal.</p>
                            <p className="font-space-mono text-sm text-black/55">loosen a filter — or go make the thing worth posting.</p>
                        </div>
                    )}
                </div>
            )}

            <EventDetailSheet event={detailEvent} onClose={() => setDetailEvent(null)} />
        </div>
    );
}
