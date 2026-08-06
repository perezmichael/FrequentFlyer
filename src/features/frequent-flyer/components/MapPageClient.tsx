'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Event } from '@/features/frequent-flyer/data/events';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';
import MapLoader from '@/components/MapLoader';
import styles from './MapPageClient.module.css';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <MapLoader />,
});

interface Venue {
    id: string;
    name: string;
    neighborhood: string;
    lat: number;
    lng: number;
    image_url?: string;
}

interface MapPageClientProps {
    initialEvents: Event[];
    guides: GuideWithItems[];
    venues: Venue[];
}

export default function MapPageClient({ initialEvents, guides, venues }: MapPageClientProps) {
    const [showEvents, setShowEvents] = useState(true);
    const [showVenues, setShowVenues] = useState(true);
    const [showGuides, setShowGuides] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Transform all data sources into "Map Items" (Events)
    const mapItems = useMemo(() => {
        let items: Event[] = [];

        if (showEvents) {
            items = [...items, ...initialEvents];
        }

        if (showVenues) {
            const venueItems: Event[] = venues.map(v => ({
                id: `venue-${v.id}`,
                title: v.name,
                date: 'Venue', // Marker label fallback usually checks vibe, but popup shows date
                location: v.neighborhood || 'Los Angeles',
                description: 'Popular Spot',
                lat: v.lat,
                lng: v.lng,
                image: v.image_url || '/placeholder.jpg',
                neighborhood: v.neighborhood || 'Unknown',
                vibe: ['Venue']
            }));
            items = [...items, ...venueItems];
        }

        if (showGuides) {
            // For guides, we could show the "Curator" or just the main guide location? 
            // Or maybe guides are just routes?
            // The requirement says "filters to show venues, events, guides".
            // Let's treat Guides as a pin at the first location of the guide?
            const guideItems: Event[] = guides.map((g): Event | null => {
                const firstItem = g.items?.[0]?.venues;
                if (!firstItem) return null;
                return {
                    id: `guide-${g.id}`,
                    title: g.title,
                    date: 'Guide',
                    location: g.neighborhood || 'Los Angeles',
                    description: g.description || '',
                    lat: firstItem.lat,
                    lng: firstItem.lng,
                    image: g.cover_image || '/placeholder.jpg',
                    neighborhood: g.neighborhood || 'Unknown',
                    vibe: ['Guide']
                };
            }).filter((i): i is Event => i !== null);
            items = [...items, ...guideItems];
        }

        // Filter out any items with invalid coordinates to prevent Map crash
        return items.filter(item =>
            item &&
            typeof item.lat === 'number' &&
            typeof item.lng === 'number' &&
            !isNaN(item.lat) &&
            !isNaN(item.lng)
        );
    }, [initialEvents, venues, guides, showEvents, showVenues, showGuides]);

    const handleMarkerClick = (id: string) => {
        setSelectedEventId(id === selectedEventId ? null : id);
    };

    return (
        <div className={styles.container}>
            {/* Header removed in favor of main Navbar */}

            {/* Filter Overlay */}
            <div className={styles.filters}>
                <button
                    className={`${styles.filterButton} ${showEvents ? styles.active : ''}`}
                    onClick={() => setShowEvents(!showEvents)}
                >
                    Events
                </button>
                <button
                    className={`${styles.filterButton} ${showVenues ? styles.active : ''}`}
                    onClick={() => setShowVenues(!showVenues)}
                >
                    Venues
                </button>
                <button
                    className={`${styles.filterButton} ${showGuides ? styles.active : ''}`}
                    onClick={() => setShowGuides(!showGuides)}
                >
                    Guides
                </button>
            </div>

            <div className={styles.mapWrapper}>
                <Map
                    events={mapItems}
                    selectedEventId={selectedEventId}
                    onMarkerClick={handleMarkerClick}
                />
            </div>
        </div>
    );
}
