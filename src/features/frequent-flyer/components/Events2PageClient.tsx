'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import EventCard2 from './EventCard2';
import styles from './Events2PageClient.module.css';
import { Event } from '@/features/frequent-flyer/data/events';

const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading Map...</div>,
});

interface Events2PageClientProps {
    events: Event[];
}

export default function Events2PageClient({ events }: Events2PageClientProps) {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const handleEventClick = (id: string) => {
        setSelectedEventId(id);
    };

    const handleMarkerClick = (id: string) => {
        setSelectedEventId(id);
        if (id) {
            const element = document.getElementById(`event2-${id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <div className={styles.main}>
            <div className={styles.splitLayout}>
                {/* Left: Event card list */}
                <div className={styles.listContainer}>
                    <header className={styles.header}>
                        <h1 className={styles.title}>
                            Over {events.length} events in Los Angeles
                        </h1>
                    </header>

                    {events.length > 0 ? (
                        <div className={styles.grid}>
                            {events.map((event) => (
                                <EventCard2
                                    key={event.id}
                                    id={`event2-${event.id}`}
                                    event={event}
                                    isActive={selectedEventId === event.id}
                                    onClick={() => handleEventClick(event.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.noResults}>
                            <h3>No events found</h3>
                            <p>Check back soon for upcoming events.</p>
                        </div>
                    )}
                </div>

                {/* Right: Map with clickable markers + flyer popups */}
                <div className={styles.mapContainer}>
                    <div className={styles.mapWrapper}>
                        <Map
                            events={events}
                            selectedEventId={selectedEventId}
                            onMarkerClick={handleMarkerClick}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
