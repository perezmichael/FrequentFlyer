'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Event } from '@/features/frequent-flyer/data/events';
import L from 'leaflet';
import { useEffect, useState, useMemo } from 'react';

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

// Extract just the emoji from a vibe label like "🎶 Music" → "🎶"
const getVibeEmoji = (vibe: string): string => {
    const label = VIBES[vibe] || '';
    return label.split(' ')[0] || '📍';
};

// Single event at a location — small emoji dot
const createSingleIcon = (vibes: string[]) => {
    const emoji = getVibeEmoji(vibes[0]);
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
            background: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            font-size: 14px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            border: 1.5px solid rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
        ">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

// Multiple events at the same location — count badge
const createClusterIcon = (count: number) => {
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
            background: #111;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 13px;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Space Grotesk', sans-serif;
        ">${count}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
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

import { hasRealImage, getVibePlaceholder } from '@/features/frequent-flyer/data/vibePlaceholders';

// Popup that supports cycling through multiple events at the same venue
function EventPopup({
    group,
    index,
    onIndexChange,
    onClose,
}: {
    group: Event[];
    index: number;
    onIndexChange: (i: number) => void;
    onClose: () => void;
}) {
    const map = useMap();
    const event = group[index];
    const total = group.length;
    const [positionClass, setPositionClass] = useState('');
    const showImage = hasRealImage(event.image);
    const placeholder = getVibePlaceholder(event.vibe?.[0]);

    useEffect(() => {
        if (!event) return;
        const containerPoint = map.latLngToContainerPoint([event.lat, event.lng]);
        const mapHeight = map.getSize().y;
        setPositionClass(containerPoint.y < mapHeight / 2 ? 'popup-below' : '');
    }, [event, map]);

    return (
        <Popup
            position={[event.lat, event.lng]}
            className={positionClass}
            autoPan={true}
            autoPanPadding={[50, 50]}
            eventHandlers={{ remove: onClose }}
        >
            <div className="w-[250px] font-space-grotesk font-sans">
                {/* Image or gradient placeholder */}
                <div className="relative w-full rounded-t-2xl overflow-hidden leading-[0]" style={{ aspectRatio: '4/3' }}>
                    {showImage ? (
                        <img
                            src={event.image}
                            alt={event.title}
                            className="w-full h-full object-cover block"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex flex-col items-center justify-center gap-1"
                            style={{ background: placeholder.bg }}
                        >
                            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{placeholder.emoji}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
                                {event.vibe?.[0] || 'Event'}
                            </span>
                        </div>
                    )}

                    {/* Cycle controls — only shown when multiple events at this venue */}
                    {total > 1 && (
                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + total) % total); }}
                                className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white', letterSpacing: '0.05em' }}>
                                {index + 1} of {total}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % total); }}
                                className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Event info */}
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
    const [activeGroup, setActiveGroup] = useState<Event[] | null>(null);
    const [activeGroupIndex, setActiveGroupIndex] = useState(0);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    // Group events by venue location to avoid overlapping markers
    const locationGroups = useMemo(() => {
        const groups: Record<string, Event[]> = {};
        for (const event of events) {
            const key = `${event.lat.toFixed(4)},${event.lng.toFixed(4)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
        }
        return Object.values(groups);
    }, [events]);

    const handleMarkerClick = (group: Event[]) => {
        setActiveGroup(group);
        setActiveGroupIndex(0);
        onMarkerClick && onMarkerClick(group[0].id);
    };

    const handleCycleIndex = (i: number) => {
        setActiveGroupIndex(i);
        if (activeGroup) onMarkerClick && onMarkerClick(activeGroup[i].id);
    };

    // Determine center: 1. Selected Event, 2. First Event, 3. Default LA
    const center: [number, number] = selectedEvent
        ? [selectedEvent.lat, selectedEvent.lng]
        : (events.length > 0 ? [events[0].lat, events[0].lng] : [34.0782, -118.2606]);

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

                {/* One marker per unique venue location */}
                {locationGroups.map((group) => {
                    const first = group[0];
                    const icon = group.length === 1
                        ? createSingleIcon(first.vibe)
                        : createClusterIcon(group.length);
                    return (
                        <Marker
                            key={`${first.lat},${first.lng}`}
                            position={[first.lat, first.lng]}
                            icon={icon}
                            eventHandlers={{
                                click: () => handleMarkerClick(group),
                            }}
                        />
                    );
                })}

                {/* Popup with cycling support for grouped venues */}
                {activeGroup && (
                    <EventPopup
                        group={activeGroup}
                        index={activeGroupIndex}
                        onIndexChange={handleCycleIndex}
                        onClose={() => {
                            setActiveGroup(null);
                            onMarkerClick && onMarkerClick('');
                        }}
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
