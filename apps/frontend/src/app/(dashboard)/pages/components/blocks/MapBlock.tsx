'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';

interface MapBlockProps {
  lat: number;
  lng: number;
  zoom: number;
  markerTitle: string;
  onChange: (data: { lat: number; lng: number; zoom: number; markerTitle: string }) => void;
}

export function MapBlock({ lat, lng, zoom, markerTitle, onChange }: MapBlockProps) {
  const [isEditing, setIsEditing] = useState(!lat && !lng);
  const [editLat, setEditLat] = useState(lat.toString());
  const [editLng, setEditLng] = useState(lng.toString());
  const [editTitle, setEditTitle] = useState(markerTitle);

  const handleSave = () => {
    const parsedLat = parseFloat(editLat);
    const parsedLng = parseFloat(editLng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return;
    onChange({ lat: parsedLat, lng: parsedLng, zoom, markerTitle: editTitle });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            value={editLat}
            onChange={(e) => setEditLat(e.target.value)}
            placeholder="Breitengrad"
            step="any"
            className="flex-1 px-3 py-2 rounded border border-border bg-bg text-sm"
          />
          <input
            type="number"
            value={editLng}
            onChange={(e) => setEditLng(e.target.value)}
            placeholder="Längengrad"
            step="any"
            className="flex-1 px-3 py-2 rounded border border-border bg-bg text-sm"
          />
        </div>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Marker-Titel (optional)"
          className="w-full px-3 py-2 rounded border border-border bg-bg text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm"
          >
            Speichern
          </button>
          {(lat || lng) && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded text-sm text-fg-muted hover:text-fg"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="rounded-lg overflow-hidden border border-border group relative">
      <iframe
        src={mapUrl}
        className="w-full h-64"
        title={markerTitle || 'Karte'}
      />
      {markerTitle && (
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {markerTitle}
        </div>
      )}
      <button
        onClick={() => setIsEditing(true)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-black/50 text-white text-xs transition-opacity"
      >
        Bearbeiten
      </button>
    </div>
  );
}
