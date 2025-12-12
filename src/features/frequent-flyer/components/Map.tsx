'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Event } from '@/features/frequent-flyer/data/events';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import styles from './Map.module.css';

// Fix for default marker icon in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
    events: Event[];
    selectedEventId?: string | null;
    onMarkerClick?: (id: string) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 13, { duration: 1.5 });
    }, [center, map]);
    return null;
}

// Custom Zoom & Fullscreen Controls
function CustomControls({ isFullscreen, onToggleFullscreen }: { isFullscreen: boolean, onToggleFullscreen: () => void }) {
    const map = useMap();

    return (
        <div className={styles.controls}>
            <button
                className={styles.controlButton}
                onClick={() => map.zoomIn()}
                title="Zoom In"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button
                className={styles.controlButton}
                onClick={() => map.zoomOut()}
                title="Zoom Out"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button
                className={styles.controlButton}
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
                {isFullscreen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                    </svg>
                )}
            </button>
        </div>
    );
}

// Vibe to Emoji Mapping
const VIBE_ICONS: Record<string, string> = {
    "Music": "🎶 Music",
    "Markets & Flea Markets": "🛍️ Markets",
    "Food & Drink": "🍹 Food & Drink",
    "Wellness": "🧘 Wellness",
    "Art & Cultural": "🎨 Art",
    "Workshops & Classes": "🛠️ Workshops",
    "Community": "🌳 Community",
    "Charity & Benefit": "💛 Charity",
    "Holiday & Seasonal": "🎉 Holiday",
    "Film Screenings & Movie Nights": "🎥 Film",
    "Nightlife": "🌙 Nightlife",
    "Sports": "🏃 Sports",
    "Educational": "📚 Educational",
    "Kids & Family": "🧸 Family",
    "Pop-Up": "🏗️ Pop-Up",
    "Cultural Celebrations": "🏮 Culture",
    "Gaming": "🎮 Gaming",
    "Networking": "🤝 Networking",
    "Outdoor Adventures": "🏞️ Outdoor",
    "Book Clubs & Literary": "📖 Books",
    "Improv & Comedy": "🎭 Comedy"
};

// Custom Price/Pill Icon
const createCustomIcon = (vibes: string[]) => {
    // Get the first vibe that has a mapping, or default to the first vibe or "Event"
    const primaryVibe = vibes[0];
    const label = VIBE_ICONS[primaryVibe] || primaryVibe || "Free";

    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
            background: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: 1px solid rgba(0,0,0,0.1);
            white-space: nowrap;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: black;
        ">
            ${label}
        </div>`,
        iconSize: [100, 24], // Increased width to fit text
        iconAnchor: [50, 12],
    });
};

// Component to handle map resizing when layout changes
function MapResizer({ isFullscreen }: { isFullscreen: boolean }) {
    const map = useMap();

    useEffect(() => {
        // Wait for CSS transition/render to finish
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map, isFullscreen]);

    return null;
}

// Standalone Popup Component
function EventPopup({ event, onClose }: { event: Event, onClose: () => void }) {
    const map = useMap();
    const [positionClass, setPositionClass] = useState('');

    useEffect(() => {
        if (!event) return;

        const containerPoint = map.latLngToContainerPoint([event.lat, event.lng]);
        const mapHeight = map.getSize().y;

        // If in top half, open below
        if (containerPoint.y < mapHeight / 2) {
            setPositionClass('popup-below');
        } else {
            setPositionClass('');
        }
    }, [event, map]);

    return (
        <Popup
            position={[event.lat, event.lng]}
            className={positionClass}
            autoPan={true} // Enable autoPan for extra safety, but our positioning should handle most cases
            autoPanPadding={[50, 50]}
            eventHandlers={{
                remove: onClose
            }}
        >
            <div className={styles.popupCard}>
                <div className={styles.popupImageContainer}>
                    <img
                        src={event.image}
                        alt={event.title}
                        className={styles.popupImage}
                    />
                    <button className={styles.heartButton}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                </div>
                <div className={styles.popupContent}>
                    <div className={styles.popupTitle}>{event.title}</div>
                    <div className={styles.popupSubtitle}>{event.location}</div>
                    <div className={styles.popupFooter}>
                        <div className={styles.popupPrice}>Free</div>
                        <div className={styles.popupMeta}>{event.date}</div>
                    </div>
                </div>
            </div>
        </Popup>
    );
}

export default function Map({ events, selectedEventId, onMarkerClick }: MapProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const center: [number, number] = selectedEvent
        ? [selectedEvent.lat, selectedEvent.lng]
        : [34.0782, -118.2606]; // Default to LA (Echo Park)

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div
            className={`${isFullscreen ? styles.fullscreenContainer : ''} ${styles.mapScope}`}
            style={{ height: '100%', width: '100%', position: 'relative' }}
        >
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%', borderRadius: isFullscreen ? '0' : '16px' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                <MapResizer isFullscreen={isFullscreen} />
                <CustomControls isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />

                {selectedEvent && <MapUpdater center={[selectedEvent.lat, selectedEvent.lng]} />}

                {/* Render Markers without nested Popups */}
                {events.map((event) => (
                    <Marker
                        key={event.id}
                        position={[event.lat, event.lng]}
                        icon={createCustomIcon(event.vibe)}
                        eventHandlers={{
                            click: () => onMarkerClick && onMarkerClick(event.id),
                        }}
                    />
                ))}

                {/* Render Standalone Popup if an event is selected */}
                {selectedEvent && (
                    <EventPopup
                        event={selectedEvent}
                        onClose={() => onMarkerClick && onMarkerClick('')} // Close by clearing selection
                    />
                )}
            </MapContainer>
        </div>
    );
}
