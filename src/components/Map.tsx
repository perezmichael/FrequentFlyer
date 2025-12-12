'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Event } from '@/features/frequent-flyer/data/events';
import L from 'leaflet';
import { useEffect } from 'react';

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
    selectedEventId: string | null;
    onMarkerClick: (id: string) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 14);
    }, [center, map]);
    return null;
}

export default function Map({ events, selectedEventId, onMarkerClick }: MapProps) {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    const center: [number, number] = selectedEvent
        ? [selectedEvent.lat, selectedEvent.lng]
        : [34.0782, -118.2606]; // Default to LA (Echo Park)

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {selectedEvent && <MapUpdater center={[selectedEvent.lat, selectedEvent.lng]} />}

            {events.map((event) => (
                <Marker
                    key={event.id}
                    position={[event.lat, event.lng]}
                    eventHandlers={{
                        click: () => onMarkerClick(event.id),
                    }}
                >
                    <Popup>
                        <div style={{ minWidth: '200px' }}>
                            <img
                                src={event.image}
                                alt={event.title}
                                style={{
                                    width: '100%',
                                    height: '120px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    marginBottom: '8px'
                                }}
                            />
                            <strong>{event.title}</strong><br />
                            {event.location}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
