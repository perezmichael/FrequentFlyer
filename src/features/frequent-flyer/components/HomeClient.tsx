'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import EventCard2 from './EventCard2';
import RecurringEventCard from './RecurringEventCard';
import EventDetailSheet from './EventDetailSheet';
import MapLoader from '@/components/MapLoader';
import styles from './HomeClient.module.css';
import FilterPillRow from './FilterPillRow';
import { Event } from '@/features/frequent-flyer/data/events';
import { RecurringEvent, DAY_NAMES_SHORT, formatRecurringSchedule } from '@/features/frequent-flyer/data/recurringEvents';

const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <MapLoader />,
});

interface HomeClientProps {
    initialEvents: Event[];
    recurringEvents?: RecurringEvent[];
}

// A unified item that can be either a one-off event or a recurring one
type UnifiedItem =
    | { kind: 'event'; data: Event; sortDay: number }
    | { kind: 'recurring'; data: RecurringEvent; sortDay: number };

// How far ahead the feed looks. Wide enough that opening the app cold shows a
// full picture of what's coming up (then filters narrow it), not just today.
const WINDOW_DAYS = 30;

// Recurring events use a different shape than one-off events. Project one into
// the Event shape so the map and the detail sheet can treat everything the same.
function recurringToEvent(re: RecurringEvent): Event {
    return {
        id: `recurring-${re.id}`,
        title: re.event_name,
        date: formatRecurringSchedule(re.day_of_week, re.start_time, re.end_time),
        location: `${re.venue_name}, ${re.neighborhood}`,
        description: re.description || re.category,
        lat: re.lat,
        lng: re.lng,
        image: re.venue_image || '/placeholder.jpg',
        neighborhood: re.neighborhood,
        vibe: [re.category],
        url: re.venue_url,
    };
}

export default function HomeClient({ initialEvents, recurringEvents = [] }: HomeClientProps) {
    const today = new Date().getDay(); // 0=Sun
    // Default to All so a cold open shows everything upcoming, not just today.
    const [dayFilter, setDayFilter] = useState<number | null>(null);
    const [neighborhoodFilter, setNeighborhoodFilter] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [detailEvent, setDetailEvent] = useState<Event | null>(null);
    const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

    // Build the unified list: upcoming one-off events + recurring events by day
    const unifiedItems = useMemo(() => {
        const items: UnifiedItem[] = [];

        // One-off events in a rolling window from today. getEvents already drops
        // anything before today, so this just caps how far ahead we show.
        const windowStart = new Date();
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowStart.getDate() + WINDOW_DAYS);
        windowEnd.setHours(23, 59, 59, 999);

        for (const event of initialEvents) {
            // Parse as LOCAL midnight. `new Date('2026-07-27')` is parsed as
            // UTC, which in LA lands on the 26th at 5pm — so every event
            // bucketed one weekday early and the day pills showed the wrong
            // day's events. The cards were right because formatEventDateTime
            // already appends T00:00:00; this now matches it.
            const eventDate = new Date(`${event.date}T00:00:00`);
            if (eventDate >= windowStart && eventDate <= windowEnd) {
                items.push({ kind: 'event', data: event, sortDay: eventDate.getDay() });
            }
        }

        // Recurring events — each maps to its day_of_week
        for (const re of recurringEvents) {
            items.push({ kind: 'recurring', data: re, sortDay: re.day_of_week });
        }

        return items;
    }, [initialEvents, recurringEvents]);

    // Filter by day + neighborhood
    const filteredItems = useMemo(() => {
        return unifiedItems.filter(item => {
            if (dayFilter !== null && item.sortDay !== dayFilter) return false;

            const neighborhood = item.kind === 'event'
                ? item.data.neighborhood
                : item.data.neighborhood;
            if (neighborhoodFilter && neighborhood !== neighborhoodFilter) return false;

            return true;
        });
    }, [unifiedItems, dayFilter, neighborhoodFilter]);

    // Derive neighborhoods from all items
    const neighborhoods = useMemo(() => {
        const set = new Set<string>();
        for (const item of unifiedItems) {
            const n = item.kind === 'event' ? item.data.neighborhood : item.data.neighborhood;
            if (n && n !== 'Unknown') set.add(n);
        }
        return Array.from(set).sort();
    }, [unifiedItems]);

    // Convert filtered items to Event[] shape for the Map
    const mapEvents: Event[] = useMemo(() => {
        return filteredItems.map(item =>
            item.kind === 'event' ? item.data : recurringToEvent(item.data)
        );
    }, [filteredItems]);

    const handleMarkerClick = (id: string) => {
        setSelectedEventId(id);
        const element = document.getElementById(`home-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div className={styles.main}>
            {/* Mobile tab bar */}
            <div className={styles.tabBar}>
                <button
                    className={`${styles.tabButton} ${mobileTab === 'list' ? styles.tabActive : ''}`}
                    onClick={() => setMobileTab('list')}
                >
                    Events
                </button>
                <button
                    className={`${styles.tabButton} ${mobileTab === 'map' ? styles.tabActive : ''}`}
                    onClick={() => setMobileTab('map')}
                >
                    Map
                </button>
            </div>

            <div className={styles.splitLayout}>
                {/* Left: Unified event list */}
                <div className={`${styles.listContainer} ${mobileTab !== 'list' ? styles.hiddenMobile : ''}`}>
                    <header className={styles.header}>
                        <h1 className={`${styles.title} font-space-grotesk`}>
                            What&apos;s happening
                        </h1>

                        {/* Says what's actually on screen. The heading used to
                            claim "this week" while the feed showed a rolling
                            month, and a day filter means every Monday in that
                            month — not just the next one. */}
                        <p className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-black/55 mt-[6px]">
                            <span className="text-ink font-bold">{filteredItems.length}</span>
                            {filteredItems.length === 1 ? ' event' : ' events'}
                            {dayFilter !== null ? ` · ${DAY_NAMES_SHORT[dayFilter]}s` : ` · next ${WINDOW_DAYS} days`}
                            {neighborhoodFilter ? ` · ${neighborhoodFilter}` : ' · across LA'}
                        </p>

                        {/* Day-of-week pills */}
                        <FilterPillRow
                            className="mt-[12px]"
                            aria-label="Filter by day"
                            pills={[
                                { key: '__all', label: 'All', active: dayFilter === null, onClick: () => setDayFilter(null) },
                                ...DAY_NAMES_SHORT.map((name, i) => ({
                                    key: String(i),
                                    label: i === today ? `${name} ·` : name,
                                    active: dayFilter === i,
                                    emphasize: i === today,
                                    onClick: () => setDayFilter(dayFilter === i ? null : i),
                                })),
                            ]}
                        />

                        {/* Neighborhood pills */}
                        {neighborhoods.length > 0 && (
                            <FilterPillRow
                                className="mt-[8px]"
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
                    </header>

                    {filteredItems.length > 0 ? (
                        <div className={`${styles.grid} stagger-in`}>
                            {filteredItems.map((item) => {
                                if (item.kind === 'event') {
                                    const event = item.data;
                                    return (
                                        <EventCard2
                                            key={event.id}
                                            id={`home-${event.id}`}
                                            event={event}
                                            isActive={selectedEventId === event.id}
                                            onClick={() => setDetailEvent(event)}
                                        />
                                    );
                                } else {
                                    const re = item.data;
                                    const mapId = `recurring-${re.id}`;
                                    return (
                                        <RecurringEventCard
                                            key={mapId}
                                            id={`home-${mapId}`}
                                            event={re}
                                            onClick={() => setDetailEvent(recurringToEvent(re))}
                                        />
                                    );
                                }
                            })}
                        </div>
                    ) : (
                        <div className={styles.noResults}>
                            <h3 className="font-space-mono uppercase tracking-[-0.44px]">nothing on this filter. criminal.</h3>
                            <p className="font-space-mono text-sm text-black/55 mt-1">try another day — or be the one who posts something.</p>
                        </div>
                    )}
                </div>

                {/* Right: Map */}
                <div className={`${styles.mapContainer} ${mobileTab !== 'map' ? styles.hiddenMobile : ''}`}>
                    <div className={styles.mapWrapper}>
                        <Map
                            events={mapEvents}
                            selectedEventId={selectedEventId}
                            onMarkerClick={handleMarkerClick}
                            onEventOpen={setDetailEvent}
                            resizeSignal={mobileTab}
                        />
                    </div>
                </div>
            </div>

            <EventDetailSheet event={detailEvent} onClose={() => setDetailEvent(null)} />
        </div>
    );
}
