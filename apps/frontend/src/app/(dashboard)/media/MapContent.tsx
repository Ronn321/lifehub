'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star, MapPin, Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MediaFile {
  id: string;
  filename: string;
  relativePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  gpsLat?: number;
  gpsLng?: number;
  takenAt?: string;
  createdAt: string;
  isFavorite: boolean;
  fileSize?: number;
}

/* ------------------------------------------------------------------ */
/*  Fix Leaflet default icon issue                                    */
/* ------------------------------------------------------------------ */

// Leaflet's default marker icon images are not bundled with the import.
// We need to set them manually.
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const favoriteIcon = L.icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* ------------------------------------------------------------------ */
/*  Auto-fit map bounds                                               */
/* ------------------------------------------------------------------ */

function FitBounds({ files }: { files: MediaFile[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || files.length === 0) return;
    const geoPoints = files
      .filter((f) => f.gpsLat != null && f.gpsLng != null)
      .map((f) => L.latLng(f.gpsLat!, f.gpsLng!));
    if (geoPoints.length > 0) {
      const bounds = L.latLngBounds(geoPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      fitted.current = true;
    }
  }, [files, map]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Main MapContent Component                                         */
/* ------------------------------------------------------------------ */

export default function MapContent({
  files,
  onFavoriteToggle,
}: {
  files: MediaFile[];
  onFavoriteToggle: (fileId: string) => void;
}) {
  // Center on a reasonable default if no GPS data
  const defaultCenter: [number, number] = [51.1657, 10.4515]; // Germany

  return (
    <MapContainer
      center={defaultCenter}
      zoom={5}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds files={files} />
      {files.map((file) => {
        if (file.gpsLat == null || file.gpsLng == null) return null;
        return (
          <Marker
            key={file.id}
            position={[file.gpsLat, file.gpsLng]}
            icon={file.isFavorite ? favoriteIcon : defaultIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                {/* Thumbnail */}
                {file.thumbnailPath ? (
                  <img
                    src={file.thumbnailPath}
                    alt={file.filename}
                    className="w-full h-28 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-20 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                    Kein Vorschaubild
                  </div>
                )}

                {/* Info */}
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {file.filename}
                </p>

                <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                  {file.width && file.height && (
                    <p>
                      {file.width}×{file.height}
                    </p>
                  )}
                  {file.takenAt && (
                    <p>
                      {new Date(file.takenAt).toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                  <p className="font-mono">
                    {file.gpsLat!.toFixed(4)}, {file.gpsLng!.toFixed(4)}
                  </p>
                </div>

                {/* Favorite toggle */}
                <button
                  onClick={() => onFavoriteToggle(file.id)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-gray-200 px-2 py-1 text-xs font-medium hover:bg-gray-50 transition-colors"
                  style={{ color: file.isFavorite ? '#ef4444' : '#6b7280' }}
                >
                  <Star
                    className={`h-3 w-3 ${file.isFavorite ? 'fill-current' : ''}`}
                  />
                  {file.isFavorite ? 'Favorit' : 'Als Favorit'}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
