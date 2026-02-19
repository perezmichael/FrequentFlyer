'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Event } from '@/features/frequent-flyer/data/events';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';
import styles from './MapPageClient.module.css';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading Map...</div>
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
            const guideItems: Event[] = guides.map(g => {
                const firstItem = g.items?.[0]?.venues;
                if (!firstItem) return null;
                return {
                    id: `guide-${g.id}`,
                    title: g.title,
                    date: 'Guide',
                    location: g.neighborhood,
                    description: g.description,
                    lat: firstItem.lat,
                    lng: firstItem.lng,
                    image: g.cover_image,
                    neighborhood: g.neighborhood,
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
            {/* Prototype Header */}
            <div className="absolute top-0 left-0 right-0 z-[1000] bg-white shadow-md">
                <div className="flex items-center justify-between px-[48px] py-[24px]">
                    <Link
                        href="/"
                        className="font-space-grotesk font-bold leading-[1.25] not-italic text-[32px] text-black tracking-[-0.96px] uppercase"
                    >
                        Flyer Board
                    </Link>
                    <Link
                        href="/"
                        className="font-space-mono leading-[1.25] not-italic text-[14px] text-black tracking-[-0.56px] uppercase hover:underline"
                    >
                        ← Back to Events
                    </Link>
                </div>
            </div>

            {/* Filter Overlay - Shifted down or styled slightly different to not overlap header? 
                Actually the header covers top. Filters should be relative or absolute below.
                MapPageClient.module.css positioning is likely relative to container.
            */}
            <div className={styles.filters} style={{ top: '100px' }}>
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

            <div className={styles.mapWrapper} style={{ paddingTop: '88px' }}>
                <Map
                    events={mapItems}
                    selectedEventId={selectedEventId}
                    onMarkerClick={handleMarkerClick}
                />
            </div>
        </div>
    );
}
