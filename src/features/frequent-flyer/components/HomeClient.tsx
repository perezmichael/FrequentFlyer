'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import EventCard from '@/features/frequent-flyer/components/EventCard';
import styles from './HomeClient.module.css';
import { Event } from '@/features/frequent-flyer/data/events';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading Map...</div>
});

interface HomeClientProps {
    initialEvents: Event[];
}

export default function HomeClient({ initialEvents }: HomeClientProps) {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    // Read Filters
    const neighborhoodFilter = searchParams.get('neighborhood');
    const vibeFilter = searchParams.get('vibe');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Filter Logic
    const filteredEvents = useMemo(() => {
        // Default to Current Week if no filters are present
        let targetFromDate: Date | null = fromDate ? new Date(fromDate) : null;
        let targetToDate: Date | null = toDate ? new Date(toDate) : null;

        // NEW: If no date filter is provided, default to "This Week" (Today -> +7 days)
        if (!fromDate && !toDate) {
            const today = new Date();
            targetFromDate = today;

            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            targetToDate = nextWeek;
        }

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

            return true;
        });
    }, [initialEvents, neighborhoodFilter, vibeFilter, fromDate, toDate]);

    const handleEventClick = (id: string) => {
        setSelectedEventId(id);
        // Optional: Scroll to map or highlight pin
    };

    const handleMarkerClick = (id: string) => {
        setSelectedEventId(id);
        const element = document.getElementById(`event-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Dynamic Header Text
    const getHeaderText = () => {
        const count = filteredEvents.length;
        const location = neighborhoodFilter || 'Los Angeles';
        return `Over ${count} events in ${location}`;
    };

    return (
        <div className={styles.main}>
            <div className={styles.splitLayout}>
                {/* Left Column: List */}
                <div className={styles.listContainer}>
                    <header className={styles.header}>
                        <h1 className={styles.title}>{getHeaderText()}</h1>
                        {/* <p className={styles.subtitle}>Discover local events happening now.</p> */}
                    </header>

                    {filteredEvents.length > 0 ? (
                        <div className={styles.grid}>
                            {filteredEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    id={`event-${event.id}`}
                                    event={event}
                                    isActive={selectedEventId === event.id}
                                    onClick={() => handleEventClick(event.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.noResults}>
                            <h3>No events found</h3>
                            <p>Try adjusting your filters to see more results.</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Map */}
                <div className={styles.mapContainer}>
                    <div className={styles.mapWrapper}>
                        <Map
                            events={filteredEvents}
                            selectedEventId={selectedEventId}
                            onMarkerClick={handleMarkerClick}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
