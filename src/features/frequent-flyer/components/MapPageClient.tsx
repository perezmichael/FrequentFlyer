'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Event } from '@/features/frequent-flyer/data/events';
import { DATE_PRESETS, getDatePresetRange, toLocalMidnight } from '@/features/frequent-flyer/data/datePresets';
import MapLoader from '@/components/MapLoader';
import FilterPillRow from './FilterPillRow';
import EventDetailSheet from './EventDetailSheet';
import styles from './MapPageClient.module.css';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <MapLoader />,
});

/* The map answers "what's on near me?", so it opens on tonight rather than
 * the whole month — 230 pins at once read as noise. `?date=all` widens it. */
const DEFAULT_PRESET = 'today';

interface MapPageClientProps {
    initialEvents: Event[];
}

/**
 * Full-screen map of upcoming events. Events only: venue and guide pins were
 * here too, but neither is filled in enough yet to be worth a tap, and mixing
 * them in made it hard to see what's actually happening. Tapping a pin opens
 * its popup; the popup opens the same EventDetailSheet as the home feed.
 */
export default function MapPageClient({ initialEvents }: MapPageClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const datePreset = searchParams.get('date') || DEFAULT_PRESET;

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [detailEvent, setDetailEvent] = useState<Event | null>(null);

    const mapEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const range = getDatePresetRange(datePreset);

        return initialEvents.filter(event => {
            // Invalid coordinates crash Leaflet.
            if (typeof event.lat !== 'number' || typeof event.lng !== 'number' || isNaN(event.lat) || isNaN(event.lng)) return false;
            const day = toLocalMidnight(event.date);
            if (day < today) return false;
            if (range && (day < range.from || day > range.to)) return false;
            return true;
        });
    }, [initialEvents, datePreset]);

    function setDate(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value === DEFAULT_PRESET) params.delete('date');
        else params.set('date', value);
        const qs = params.toString();
        setSelectedEventId(null);
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    }

    const handleMarkerClick = (id: string) => {
        setSelectedEventId(id === selectedEventId ? null : id);
    };

    return (
        <div className={styles.container}>
            {/* Date filter overlay */}
            <div className={styles.filters}>
                <FilterPillRow
                    aria-label="Filter by date"
                    pills={DATE_PRESETS.map(p => ({
                        key: p.value,
                        label: p.value === 'today' ? 'Tonight' : p.label,
                        active: datePreset === p.value,
                        onClick: () => setDate(p.value),
                    }))}
                />
                <span className={styles.count}>
                    {mapEvents.length} event{mapEvents.length !== 1 ? 's' : ''}
                </span>
            </div>

            {mapEvents.length === 0 && (
                <div className={styles.empty}>
                    <p className="font-space-mono uppercase text-[13px] tracking-[-0.44px] text-ink">nothing pinned {datePreset === 'today' ? 'tonight' : 'yet'}.</p>
                    {datePreset !== 'weekend' && datePreset !== 'all' && (
                        <button type="button" onClick={() => setDate('weekend')} className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-brand hover:underline underline-offset-4">
                            see this weekend →
                        </button>
                    )}
                </div>
            )}

            <div className={styles.mapWrapper}>
                <Map
                    events={mapEvents}
                    selectedEventId={selectedEventId}
                    onMarkerClick={handleMarkerClick}
                    onEventOpen={setDetailEvent}
                />
            </div>

            <EventDetailSheet event={detailEvent} onClose={() => setDetailEvent(null)} />
        </div>
    );
}
