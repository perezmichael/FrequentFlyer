'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import EventCard from '@/features/frequent-flyer/components/EventCard';
import FilterBar from '@/components/FilterBar';
import { events } from '@/features/frequent-flyer/data/events';
import styles from './page.module.css';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading Map...</div>
});

export default function FrequentFlyer() {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Filter States
    const [search, setSearch] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [date, setDate] = useState('');
    const [vibe, setVibe] = useState('');

    // Extract unique neighborhoods and vibes for dropdowns
    const neighborhoods = useMemo(() =>
        Array.from(new Set(events.map(e => e.neighborhood))).sort(),
        []);

    const vibes = useMemo(() =>
        Array.from(new Set(events.flatMap(e => e.vibe))).sort(),
        []);

    // Filter Logic
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                event.description.toLowerCase().includes(search.toLowerCase());
            const matchesNeighborhood = neighborhood ? event.neighborhood === neighborhood : true;
            const matchesVibe = vibe ? event.vibe.includes(vibe) : true;

            let matchesDate = true;
            if (date) {
                // Create a date object from the selected filter date (YYYY-MM-DD)
                // We use 'T00:00:00' to ensure it's treated as local time, not UTC
                const filterDate = new Date(`${date}T00:00:00`);

                // Parse the event date string (e.g., "Wed Nov 26, 4:00 PM - 2:00 AM")
                // We extract "Nov 26" and add the current year
                const dateParts = event.date.split(',');
                if (dateParts.length >= 2) {
                    // " Wed Nov 26" -> "Nov 26"
                    const monthDay = dateParts[1].trim().split(' ').slice(0, 2).join(' ');
                    const currentYear = new Date().getFullYear();
                    const eventDate = new Date(`${monthDay}, ${currentYear}`);

                    // Compare month and date
                    matchesDate = filterDate.getMonth() === eventDate.getMonth() &&
                        filterDate.getDate() === eventDate.getDate();
                }
            }

            return matchesSearch && matchesNeighborhood && matchesVibe && matchesDate;
        });
    }, [search, neighborhood, vibe, date]);

    const handleEventClick = (id: string) => {
        setSelectedEventId(id);
        const element = document.getElementById(`event-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleMarkerClick = (id: string) => {
        setSelectedEventId(id);
        const element = document.getElementById(`event-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.listContainer}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Frequent Flyer</h1>
                    <p className={styles.subtitle}>Discover local events happening now.</p>
                </header>

                <FilterBar
                    search={search}
                    onSearchChange={setSearch}
                    neighborhood={neighborhood}
                    onNeighborhoodChange={setNeighborhood}
                    date={date}
                    onDateChange={setDate}
                    vibe={vibe}
                    onVibeChange={setVibe}
                    neighborhoods={neighborhoods}
                    vibes={vibes}
                />

                <div className={styles.list}>
                    {filteredEvents.length > 0 ? (
                        filteredEvents.map((event) => (
                            <EventCard
                                key={event.id}
                                id={`event-${event.id}`}
                                event={event}
                                isActive={selectedEventId === event.id}
                                onClick={() => handleEventClick(event.id)}
                            />
                        ))
                    ) : (
                        <div className={styles.noResults}>
                            No events found matching your filters.
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.mapContainer}>
                <Map
                    events={filteredEvents}
                    selectedEventId={selectedEventId}
                    onMarkerClick={handleMarkerClick}
                />
            </div>
        </div>
    );
}
