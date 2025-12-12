'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/features/mx-guide/data/mx-places';
import styles from './MxGuide.module.css';
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

interface GuideMapProps {
    places: Place[];
    selectedPlaceId: string | null;
    onPlaceClick: (id: string) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 15, {
            duration: 1.5
        });
    }, [center, map]);
    return null;
}

export default function GuideMap({ places, selectedPlaceId, onPlaceClick }: GuideMapProps) {
    const selectedPlace = places.find(p => p.id === selectedPlaceId);
    // Mexico City center
    const defaultCenter: [number, number] = [19.4326, -99.1332];

    const center = selectedPlace
        ? [selectedPlace.lat, selectedPlace.lng] as [number, number]
        : defaultCenter;

    const getMarkerIcon = (category: Place['category']) => {
        return L.divIcon({
            className: `${styles.marker} ${styles[`marker-${category}`]}`,
            html: '', // Required for simple divIcon styling
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
        });
    };

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%', background: '#F5F5F5' }} // Light gray background
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {selectedPlace && <MapUpdater center={[selectedPlace.lat, selectedPlace.lng]} />}

            {places.map((place) => (
                <Marker
                    key={place.id}
                    position={[place.lat, place.lng]}
                    icon={getMarkerIcon(place.category)}
                    eventHandlers={{
                        click: () => onPlaceClick(place.id),
                    }}
                >
                    <Popup className="custom-popup">
                        <div className="flex flex-col gap-2 min-w-[200px] text-neutral-800">
                            <img
                                src={place.image}
                                alt={place.name}
                                className={styles.popupImage}
                            />
                            <div>
                                <h3 className="font-bold text-lg">{place.name}</h3>
                                <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">{place.category}</div>
                                <p className="text-sm text-neutral-600 line-clamp-2">{place.description}</p>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
