import { useEffect, useRef } from "react";
import { Link } from "react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const venues = [
  {
    name: "The Blue Note",
    type: "Venue",
    position: [34.0522, -118.2437] as [number, number],
    event: "Midnight Montrose",
  },
  {
    name: "Rooftop Garden",
    type: "Venue",
    position: [34.0407, -118.2468] as [number, number],
    event: "Sunset Sessions",
  },
  {
    name: "The Warehouse",
    type: "Venue",
    position: [34.0489, -118.2512] as [number, number],
    event: "Urban Grind",
  },
  {
    name: "Modern Arts Gallery",
    type: "Gallery",
    position: [34.0405, -118.2695] as [number, number],
    event: "Gallery Opening",
  },
  {
    name: "Echo Park Venue",
    type: "Venue",
    position: [34.0780, -118.2607] as [number, number],
    event: "Indie Rock Night",
  },
  {
    name: "Grand Park",
    type: "Park",
    position: [34.0560, -118.2467] as [number, number],
    event: "Farmers Market",
  },
];

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map
    const map = L.map(mapRef.current).setView([34.0522, -118.2437], 12);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add markers
    venues.forEach((venue) => {
      const marker = L.marker(venue.position as [number, number]).addTo(map);
      marker.bindPopup(`
        <div style="padding: 8px;">
          <h3 style="font-family: 'Space Grotesk', sans-serif; font-weight: bold; font-size: 16px; margin-bottom: 4px;">
            ${venue.name}
          </h3>
          <p style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; color: #666; margin-bottom: 4px;">
            ${venue.type}
          </p>
          <p style="font-family: 'Space Grotesk', sans-serif; font-size: 14px; margin: 0;">
            ${venue.event}
          </p>
        </div>
      `);
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white shadow-md">
        <div className="flex items-center justify-between px-[48px] py-[24px]">
          <Link
            to="/"
            className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[1.25] not-italic text-[32px] text-black tracking-[-0.96px] uppercase"
          >
            Flyer Board
          </Link>
          <Link
            to="/"
            className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[14px] text-black tracking-[-0.56px] uppercase hover:underline"
          >
            ← Back to Events
          </Link>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="absolute inset-0 pt-[88px]" />
    </div>
  );
}
