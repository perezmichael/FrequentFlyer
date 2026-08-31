'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Event, formatEventDateParts } from '@/features/frequent-flyer/data/events';
import SmartImage from '@/components/SmartImage';
import L from 'leaflet';
import { useEffect, useState, useMemo, useRef } from 'react';

// Fix for default marker icon in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/** An event known to have real coordinates — safe to plot. */
type PlacedEvent = Event & { lat: number; lng: number };

const isPlaced = (e: Event): e is PlacedEvent =>
    Number.isFinite(e.lat) && Number.isFinite(e.lng);

interface MapProps {
    events?: Event[]; // Optional now
    selectedEventId?: string | null;
    onMarkerClick?: (id: string) => void;
    // Open the full event detail sheet (from the popup's "View details").
    onEventOpen?: (event: Event) => void;
    // New prop for Guide Routes
    route?: {
        coordinates: [number, number][];
        color?: string;
    };
    // Changes whenever the map's container visibility changes (e.g. mobile tab
    // switch) so the map can recalc its size and load tiles.
    resizeSignal?: string | number;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        // Guard against events with missing/NaN coordinates — flyTo throws
        // "Invalid LatLng object: (NaN, NaN)" and takes the whole map down.
        if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
        map.flyTo(center, 13, { duration: 1.5 });
    }, [center, map]);
    return null;
}

/**
 * Keep the viewport on whatever pins are currently showing.
 *
 * MapContainer's `center`/`zoom` are read once, when Leaflet initialises — a
 * later change is ignored. So filtering the feed to Echo Park recomputed the
 * centroid and nothing moved: you were left looking at the middle of LA with
 * the pins somewhere off-screen, and had to pan to find them.
 *
 * Fires on the SET of pins rather than on every render. That distinction
 * matters: selecting an event doesn't change the set, so this never yanks the
 * map back out of the flyTo that MapUpdater just did.
 */
/**
 * The pins worth framing around, ignoring strays.
 *
 * Every pin still renders — this only decides where the camera sits. A
 * collection can legitimately include a show 40 miles out (Sound & Fury runs
 * kickoffs in Pomona and Fullerton), and fitting to those stretched the
 * viewport from Santa Monica to San Clemente and shrank the actual LA cluster
 * to a thumbnail. The distant ones are still there; you just have to zoom out
 * to see them, which is the right trade for a map of an LA night.
 *
 * Scale-relative rather than a hardcoded LA box, so this keeps working if the
 * app ever covers a second city: it asks "how far is this pin compared to a
 * typical one" instead of "is this pin inside Los Angeles".
 */
function framingPoints(points: [number, number][]): [number, number][] {
    if (points.length < 5) return points;

    const median = (xs: number[]) => {
        const s = [...xs].sort((a, b) => a - b);
        return s[Math.floor(s.length / 2)];
    };
    const cLat = median(points.map(p => p[0]));
    const cLng = median(points.map(p => p[1]));
    // Longitude degrees shrink with latitude; without this correction an
    // east-west spread reads as larger than it is.
    const k = Math.cos((cLat * Math.PI) / 180);
    const dist = points.map(([lat, lng]) => Math.hypot(lat - cLat, (lng - cLng) * k));

    const typical = median(dist) || 0;
    // Four times a typical distance is comfortably outside the metro spread
    // but well inside a different county.
    const cutoff = typical * 4;
    const kept = points.filter((_, i) => dist[i] <= cutoff);

    // If that would discard a quarter of the pins, this isn't a few strays —
    // the set really is spread out, and cropping it would hide the story.
    return kept.length >= Math.max(3, points.length * 0.75) ? kept : points;
}

function FitBounds({ points }: { points: [number, number][] }) {
    const map = useMap();
    const firstFit = useRef(true);

    // Rounded and sorted so an identical set of venues in a different order
    // doesn't read as a change and re-fly the map for nothing.
    const signature = points
        .map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`)
        .sort()
        .join('|');

    useEffect(() => {
        if (!signature) return;
        const coords = signature.split('|').map(p => p.split(',').map(Number) as [number, number]);
        const bounds = L.latLngBounds(framingPoints(coords));

        let cancelled = false;
        let tries = 0;

        const fit = () => {
            if (cancelled) return;
            // The split-layout container starts at 0×0 while CSS settles (see
            // MapResizer). Fitting against a zero-size viewport can't compute a
            // sensible zoom — it bottoms out at maxZoom and parks you on a
            // random street with every pin off-screen. Wait for real dimensions
            // rather than fitting to nothing.
            const size = map.getSize();
            if ((size.x < 50 || size.y < 50) && tries++ < 20) {
                setTimeout(fit, 50);
                return;
            }
            map.flyToBounds(bounds, {
                padding: [48, 48],
                // Without a cap, a neighborhood with one venue zooms to rooftop
                // level — technically correct, useless for getting your bearings.
                maxZoom: 14,
                // The first fit is the initial view, so it shouldn't animate in
                // from the default centroid; later ones are a filter change and
                // reading as movement is the point.
                duration: firstFit.current ? 0 : 0.8,
            });
            firstFit.current = false;
        };

        fit();
        return () => { cancelled = true; };
    }, [signature, map]);

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
                className="w-8 h-8 bg-cream border border-black/40 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:bg-black hover:text-cream hover:shadow-md active:translate-y-0 text-ink"
                onClick={() => map.zoomIn()}
                title="Zoom In"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button
                className="w-8 h-8 bg-cream border border-black/40 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:bg-black hover:text-cream hover:shadow-md active:translate-y-0 text-ink"
                onClick={() => map.zoomOut()}
                title="Zoom Out"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <button
                className="w-8 h-8 bg-cream border border-black/40 rounded-lg flex items-center justify-center cursor-pointer shadow-sm transition-all hover:bg-black hover:text-cream hover:shadow-md active:translate-y-0 text-ink"
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
import { resolveVibeEmoji, representativeEmoji } from '@/features/frequent-flyer/data/vibeEmoji';

// The scout writes free-text categories ("Music (DJ Set)", "Standup Comedy"),
// so exact lookups miss and everything became a generic 📍. resolveVibeEmoji
// falls back to keyword matching — see data/vibeEmoji.ts.
const getVibeEmoji = (vibe: string): string => resolveVibeEmoji(vibe);

// Single event at a location — small emoji dot
const createSingleIcon = (vibes: string[]) => {
    const emoji = getVibeEmoji(vibes[0]);
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
            background: #FFFAEB;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            font-size: 14px;
            box-shadow: 0 3px 8px rgba(26,26,26,0.3);
            border: 1.5px solid rgba(26,26,26,0.55);
            display: flex;
            align-items: center;
            justify-content: center;
        ">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

// Multiple events at the same location — representative emoji + count badge
const createClusterIcon = (count: number, emoji: string) => {
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="position: relative; width: 38px; height: 38px;">
            <div style="
                background: #FFFAEB;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                font-size: 16px;
                box-shadow: 0 3px 10px rgba(26,26,26,0.35);
                border: 1.5px solid rgba(26,26,26,0.55);
                display: flex;
                align-items: center;
                justify-content: center;
            ">${emoji}</div>
            <div style="
                position: absolute;
                top: -5px;
                right: -5px;
                background: #1a1a1a;
                color: #FFFAEB;
                min-width: 17px;
                height: 17px;
                border-radius: 9px;
                padding: 0 4px;
                font-size: 10px;
                font-weight: 700;
                font-family: 'Space Mono', monospace;
                box-shadow: 0 1px 4px rgba(26,26,26,0.4);
                border: 1.5px solid #FFFAEB;
                display: flex;
                align-items: center;
                justify-content: center;
            ">${count}</div>
        </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
    });
};

// Component to handle map resizing when layout changes
function MapResizer({ isFullscreen, resizeSignal }: { isFullscreen: boolean; resizeSignal?: string | number }) {
    const map = useMap();

    // Observe the actual container size. On mount the split-layout container is
    // often still 0×0 (or grows 0→full as CSS settles), which left Leaflet
    // thinking it was tiny and never fetching tiles for the real viewport —
    // hence the grey/cream gaps. Recalc on real size changes so tiles fill.
    //
    // Debounced and de-duped on purpose: on Android Chrome the URL bar
    // collapses/expands while scrolling, which resizes this container
    // repeatedly mid-gesture. Calling invalidateSize() on every one of those
    // (it re-lays out panes and refetches tiles) made the map stutter and
    // flash. Coalesce the burst into a single call once the size settles.
    useEffect(() => {
        const container = map.getContainer();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let lastW = 0;
        let lastH = 0;

        const ro = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect) return;
            const w = Math.round(rect.width);
            const h = Math.round(rect.height);
            if (w === lastW && h === lastH) return;
            lastW = w;
            lastH = h;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => map.invalidateSize(), 120);
        });

        ro.observe(container);
        const kick = setTimeout(() => map.invalidateSize(), 100);
        return () => {
            ro.disconnect();
            if (timer) clearTimeout(timer);
            clearTimeout(kick);
        };
    }, [map]);

    // Also react to explicit signals (mobile tab switch, fullscreen toggle),
    // which change visibility without necessarily resizing the container.
    useEffect(() => {
        const timer = setTimeout(() => map.invalidateSize(), 120);
        return () => clearTimeout(timer);
    }, [map, isFullscreen, resizeSignal]);

    return null;
}

import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import GeneratedFlyer from './GeneratedFlyer';

// Popup that supports cycling through multiple events at the same venue
function EventPopup({
    group,
    index,
    onIndexChange,
    onClose,
    onEventOpen,
}: {
    group: PlacedEvent[];
    index: number;
    onIndexChange: (i: number) => void;
    onClose: () => void;
    onEventOpen?: (event: Event) => void;
}) {
    const map = useMap();
    const event = group[index];
    const total = group.length;
    const [positionClass, setPositionClass] = useState('');
    const showImage = hasRealImage(event.image);

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
                        /* The popup is a fixed 250px wide, so it never needs
                           more than that — one of the clearest wins here. */
                        <SmartImage
                            src={event.image}
                            alt={event.title}
                            className="block"
                            sizes="250px"
                        />
                    ) : (
                        <GeneratedFlyer title={event.title} vibe={event.vibe?.[0]} neighborhood={event.neighborhood} />
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

                {/* Event info — click to open the full detail sheet */}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEventOpen && onEventOpen(event); }}
                    className="w-full text-left block p-4 bg-cream cursor-pointer transition-colors hover:bg-black/[0.04]"
                >
                    <div className="text-base font-bold mb-1 text-ink leading-tight font-space-grotesk">{event.title}</div>
                    <div className="text-sm text-black/55 mb-3 font-space-mono">{event.location}</div>
                    {/* The pick stamp belongs anywhere an event appears — it's
                        the one editorial claim the app makes, and it was
                        missing from the map. */}
                    {event.curationLevel === 'ff_curated' && (
                        <div className="mb-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-brand px-2 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[-0.44px] text-brand">
                                ★ FF Pick
                            </span>
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                        {/* Date and time stack deliberately. Run together they
                            wrapped mid-time in this narrow stamp — "WED, AUG 5
                            · 6" above a lone "PM". */}
                        <span className="stamp text-[11px] leading-[1.35] text-center">
                            {(() => {
                                const { date, time } = formatEventDateParts(event.date, event.startTime, event.endTime);
                                return time ? <>{date}<br />{time}</> : date;
                            })()}
                        </span>
                        <span className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-brand flex items-center gap-1 whitespace-nowrap">
                            View details
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </span>
                    </div>
                </button>
            </div>
        </Popup>
    );
}

export default function Map({ events = [], selectedEventId, onMarkerClick, onEventOpen, route, resizeSignal }: MapProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeGroup, setActiveGroup] = useState<PlacedEvent[] | null>(null);
    const [activeGroupIndex, setActiveGroupIndex] = useState(0);

    // Only a geolocated selection can drive the map center.
    const selectedEventRaw = events.find(e => e.id === selectedEventId);
    const selectedEvent = selectedEventRaw && isPlaced(selectedEventRaw) ? selectedEventRaw : undefined;

    // Group events by venue location to avoid overlapping markers
    const locationGroups = useMemo(() => {
        const groups: Record<string, PlacedEvent[]> = {};
        for (const event of events) {
            if (!isPlaced(event)) continue;
            const key = `${event.lat.toFixed(4)},${event.lng.toFixed(4)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
        }
        return Object.values(groups);
    }, [events]);

    // LA is spread out, so open on a metro-wide view centered on the middle of
    // all pins rather than a fixed downtown point. One pin per venue → centroid
    // of the venues, not of every event, so a busy venue doesn't drag it.
    const centroid: [number, number] = useMemo(() => {
        if (locationGroups.length === 0) return [34.05, -118.29];
        const pts = locationGroups.map(g => g[0]);
        const lat = pts.reduce((s, e) => s + e.lat, 0) / pts.length;
        const lng = pts.reduce((s, e) => s + e.lng, 0) / pts.length;
        return [lat, lng];
    }, [locationGroups]);

    const handleMarkerClick = (group: PlacedEvent[]) => {
        setActiveGroup(group);
        setActiveGroupIndex(0);
        onMarkerClick && onMarkerClick(group[0].id);
    };

    const handleCycleIndex = (i: number) => {
        setActiveGroupIndex(i);
        if (activeGroup) onMarkerClick && onMarkerClick(activeGroup[i].id);
    };

    // Determine center: selected event, else the metro-wide centroid.
    const center: [number, number] = selectedEvent
        ? [selectedEvent.lat, selectedEvent.lng]
        : centroid;
    // Open zoomed out enough to show the LA spread; tighten for a single venue
    // or when an event is selected.
    const initialZoom = selectedEvent ? 13 : (locationGroups.length > 1 ? 11 : 13);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div
            className={`relative w-full h-full ${isFullscreen ? 'fixed !top-0 !left-0 !w-[100vw] !h-[100vh] z-[9999] rounded-none' : ''}`}
            // Pass the wrapper's radius down: border-radius doesn't inherit on
            // its own, so without this the map's `inherit` would resolve against
            // this div (0) instead of the page's map wrapper.
            style={{ borderRadius: isFullscreen ? 0 : 'inherit' }}
        >
            <MapContainer
                center={center}
                zoom={initialZoom}
                // Radius follows the wrapper (inherit) so each page decides:
                // rounded card on desktop, full-bleed square on mobile.
                style={{ height: '100%', width: '100%', borderRadius: isFullscreen ? '0' : 'inherit' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    /* CARTO moved their basemaps behind a key and now stamps
                       "API KEY REQUIRED" across anonymous tiles. They still
                       serve — this is the nag phase — but that won't last.
                       Without a key set, behaviour is exactly as it is today.
                       Attribution above is a condition of the free tier and
                       must stay. */
                    url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${
                        process.env.NEXT_PUBLIC_CARTO_KEY
                            ? `?key=${process.env.NEXT_PUBLIC_CARTO_KEY}`
                            : ''
                    }`}
                />

                <MapResizer isFullscreen={isFullscreen} resizeSignal={resizeSignal} />
                <CustomControls isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />

                {/* Event Logic (Events Mode) */}
                {selectedEvent && <MapUpdater center={[selectedEvent.lat, selectedEvent.lng]} />}

                {/* Follow the filtered set. Skipped in guides mode, where
                    RouteUpdater owns the viewport and two components fighting
                    over it would fly the map twice. */}
                {!route && <FitBounds points={locationGroups.map(g => [g[0].lat, g[0].lng])} />}

                {/* One marker per unique venue location */}
                {locationGroups.map((group) => {
                    const first = group[0];
                    const icon = group.length === 1
                        ? createSingleIcon(first.vibe)
                        : createClusterIcon(group.length, representativeEmoji(group.map(e => e.vibe?.[0])));
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
                        onEventOpen={onEventOpen}
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
                            pathOptions={{ color: route.color || '#C2371B', weight: 4, opacity: 0.8 }}
                        />
                        <RouteUpdater coordinates={route.coordinates} />
                        {/* Render Simple Dots for Route Points if no events are passed (optional enhancement) */}
                        {route.coordinates.map((coord, idx) => (
                            <Marker
                                key={`route-${idx}`}
                                position={coord}
                                icon={L.divIcon({
                                    className: 'route-dot',
                                    html: `<div style="background: ${route.color || '#C2371B'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
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
