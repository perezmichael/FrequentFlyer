'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Event } from '@/features/frequent-flyer/data/events';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix for default marker icon in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
    events?: Event[]; // Optional now
    selectedEventId?: string | null;
    onMarkerClick?: (id: string) => void;
    // New prop for Guide Routes
    route?: {
        coordinates: [number, number][];
        color?: string;
    };
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 13, { duration: 1.5 });
    }, [center, map]);
    return null;
}

function RouteUpdater({ coordinates }: { coordinates: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (coordinates.length > 0) {
            const bounds = L.latLngBounds(coordinates);
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
    }, [coordinates, map]);
    return null;
}

// Custom Zoom & Fullscreen Controls
function CustomControls({ isFullscreen, onToggleFullscreen }: { isFullscreen: boolean, onToggleFullscreen: () => void }) {
    const map = useMap();

    // Position classes based on fullscreen state
    const positionClass = isFullscreen ? 'top-6 right-6' : 'top-6 right-6';

    return (
        <div className={`absolute ${positionClass} flex flex-col gap-2 z-[1000]`}>
            <button
                className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:translate-y-0 text-gray-800"
                onClick={() => map.zoomIn()}
                title="Zoom In"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button
                className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:translate-y-0 text-gray-800"
                onClick={() => map.zoomOut()}
                title="Zoom Out"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button
                className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:translate-y-0 text-gray-800"
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
import { VIBES } from '@/features/frequent-flyer/data/vibes';

// Custom Price/Pill Icon
const createCustomIcon = (vibes: string[]) => {
    // Get the first vibe that has a mapping, or default to the first vibe or "Event"
    const primaryVibe = vibes[0];
    const label = VIBES[primaryVibe] || primaryVibe || "Free";

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
            <div className="w-[250px] font-space-grotesk font-sans">
                <div className="relative w-full h-auto rounded-t-2xl overflow-hidden leading-[0]">
                    <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-auto block"
                    />
                    <button className="absolute top-3 right-12 bg-transparent border-none cursor-pointer text-white z-10 p-0 drop-shadow-md">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                </div>
                <div className="p-4">
                    <div className="text-base font-semibold mb-1 text-gray-900 leading-tight">{event.title}</div>
                    <div className="text-sm text-gray-500 mb-2">{event.location}</div>
                    <div className="mt-2 flex flex-col gap-1">
                        <div className="font-semibold text-gray-900 text-base">Free</div>
                        <div className="text-xs text-gray-500">{event.date}</div>
                    </div>
                </div>
            </div>
        </Popup>
    );
}

export default function Map({ events = [], selectedEventId, onMarkerClick, route }: MapProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    // Determine center: 1. Selected Event, 2. First Event, 3. Default LA
    // If we have a route, we rely on RouteUpdater to fit bounds, but need initial center.
    const center: [number, number] = selectedEvent
        ? [selectedEvent.lat, selectedEvent.lng]
        : (events.length > 0 ? [events[0].lat, events[0].lng] : [34.0782, -118.2606]); // Default to LA (Echo Park)

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div
            className={`relative w-full h-full ${isFullscreen ? 'fixed !top-0 !left-0 !w-[100vw] !h-[100vh] z-[9999] rounded-none' : ''}`}
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

                {/* Event Logic (Events Mode) */}
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

                {/* Route Logic (Guides Mode) */}
                {route && route.coordinates.length > 0 && (
                    <>
                        <Polyline
                            positions={route.coordinates}
                            pathOptions={{ color: route.color || '#3b82f6', weight: 4, opacity: 0.8 }}
                        />
                        <RouteUpdater coordinates={route.coordinates} />
                        {/* Render Simple Dots for Route Points if no events are passed (optional enhancement) */}
                        {route.coordinates.map((coord, idx) => (
                            <Marker
                                key={`route-${idx}`}
                                position={coord}
                                icon={L.divIcon({
                                    className: 'route-dot',
                                    html: `<div style="background: ${route.color || '#3b82f6'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
                                    iconSize: [12, 12]
                                })}
                            />
                        ))}
                    </>
                )}
            </MapContainer>
        </div>
    );
}
