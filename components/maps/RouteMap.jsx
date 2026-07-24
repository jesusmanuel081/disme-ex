'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;

const STATUS_COLORS = {
  pending: '#D97706',
  arrived: '#2563EB',
  delivered: '#059669',
};

function createIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// Center of Chihuahua state
const CHIHUAHUA_CENTER = [28.6353, -106.0889];

export default function RouteMap({ stops = [], routeLines = [] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-text-muted text-sm">
        Cargando mapa...
      </div>
    );
  }

  return (
    <MapContainer
      center={CHIHUAHUA_CENTER}
      zoom={7}
      style={{ width: '100%', height: '100%' }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {stops.map((stop, idx) => (
        <Marker
          key={stop.id || idx}
          position={[stop.lat, stop.lng]}
          icon={createIcon(STATUS_COLORS[stop.status] || '#6B7280')}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{stop.customer_name || `Parada ${idx + 1}`}</p>
              <p className="text-gray-500">Estado: {stop.status}</p>
              {stop.notes && <p className="text-gray-500">{stop.notes}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {routeLines.map((line, idx) => (
        <Polyline
          key={idx}
          positions={line.positions}
          pathOptions={{ color: '#2563EB', weight: 3, dashArray: '8 4' }}
        />
      ))}
    </MapContainer>
  );
}
