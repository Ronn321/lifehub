'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  CloudSun,
  Calendar as CalendarIcon,
  PiggyBank,
  Loader2,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Widget, WidgetConfig } from '@/lib/grid-utils';
import type { CalendarConfig, WeatherConfig, MediaConfig, WeatherLocation } from '@/lib/grid-utils';
import { WIDGET_LABELS } from '@/lib/grid-utils';

interface Album {
  id: string;
  name: string;
}

export const WIDGET_ICONS: Record<string, React.ReactNode> = {
  media: <Camera className="h-5 w-5" />,
  weather: <CloudSun className="h-5 w-5" />,
  calendar: <CalendarIcon className="h-5 w-5" />,
  savings: <PiggyBank className="h-5 w-5" />,
};

const WMO_LABELS: Record<number, string> = {
  0: 'Klar', 1: 'Überwiegend klar', 2: 'Teils bewölkt', 3: 'Bedeckt',
  45: 'Neblig', 48: 'Reifnebel', 51: 'Leichter Niesel', 53: 'Niesel', 55: 'Starker Niesel',
  61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
  71: 'Leichter Schnee', 73: 'Schnee', 75: 'Starker Schnee',
  80: 'Leichte Schauer', 81: 'Schauer', 82: 'Starke Schauer',
  95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit starkem Hagel',
};

function wmoIcon(code: number): string {
  if (code === 0) return '\u2600\uFE0F';
  if (code <= 2) return '\uD83C\uDF24';
  if (code === 3) return '\u2601\uFE0F';
  if (code >= 45 && code <= 48) return '\uD83C\uDF2B';
  if (code >= 51 && code <= 55) return '\uD83C\uDF26';
  if (code >= 61 && code <= 65) return '\uD83C\uDF27';
  if (code >= 71 && code <= 75) return '\u2744\uFE0F';
  if (code >= 80 && code <= 82) return '\uD83C\uDF26';
  if (code >= 95) return '\u26C8';
  return '\uD83C\uDF21';
}

export function SettingsPanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div
        ref={ref}
        className="bg-bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 animate-slide-up max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-fg">{title}</h3>
          <button
            onClick={onClose}
            className="text-sm rounded-md bg-brand-500 px-3 py-1 text-white hover:bg-brand-600"
          >
            Fertig
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CalendarSettings({
  config,
  onChange,
}: {
  config: CalendarConfig;
  onChange: (c: CalendarConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-fg mb-2">Wochenstart</legend>
        <div className="flex gap-3">
          {(['monday', 'sunday'] as const).map((day) => (
            <label key={day} className="flex items-center gap-1.5 text-sm text-fg cursor-pointer">
              <input
                type="radio"
                name="weekStart"
                checked={config.weekStart === day}
                onChange={() => onChange({ ...config, weekStart: day })}
                className="accent-brand-500"
              />
              {day === 'monday' ? 'Montag' : 'Sonntag'}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
        <input
          type="checkbox"
          checked={config.showWeekNumbers}
          onChange={(e) => onChange({ ...config, showWeekNumbers: e.target.checked })}
          className="accent-brand-500"
        />
        Wochennummern anzeigen
      </label>
    </div>
  );
}

function WeatherSettings({
  config,
  onChange,
}: {
  config: WeatherConfig;
  onChange: (c: WeatherConfig) => void;
}) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const addLocation = () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!name.trim() || isNaN(parsedLat) || isNaN(parsedLng)) return;
    const newLocations = [...config.locations, { name: name.trim(), lat: parsedLat, lng: parsedLng }];
    onChange({ ...config, locations: newLocations });
    setName('');
    setLat('');
    setLng('');
  };

  const removeLocation = (index: number) => {
    const newLocations = config.locations.filter((_, i) => i !== index);
    const newActive = Math.min(config.activeLocationIndex, newLocations.length - 1);
    onChange({ ...config, locations: newLocations, activeLocationIndex: newActive });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">Gespeicherte Orte</p>
        {config.locations.map((loc, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2">
            <span className="text-sm text-fg truncate">{loc.name}</span>
            <div className="flex items-center gap-1">
              {i !== config.activeLocationIndex && (
                <button
                  onClick={() => onChange({ ...config, activeLocationIndex: i })}
                  className="text-xs rounded bg-brand-500/10 text-brand-500 px-2 py-0.5 hover:bg-brand-500/20"
                >
                  Aktivieren
                </button>
              )}
              {i === config.activeLocationIndex && (
                <span className="text-xs text-success font-medium">Aktiv</span>
              )}
              <button
                onClick={() => removeLocation(i)}
                className="text-danger hover:bg-danger/10 rounded p-1"
                title="Entfernen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-sm font-medium text-fg">Ort hinzufügen</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (z.B. Berlin)"
          className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand-500"
        />
        <div className="flex gap-2">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Breitengrad"
            type="number"
            step="any"
            className="w-1/2 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand-500"
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Längengrad"
            type="number"
            step="any"
            className="w-1/2 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={addLocation}
          className="flex items-center gap-1 text-sm rounded-md bg-brand-500 px-3 py-1.5 text-white hover:bg-brand-600"
        >
          <Plus className="h-3.5 w-3.5" /> Hinzufügen
        </button>
      </div>
    </div>
  );
}

function MediaSettings({
  config,
  onChange,
}: {
  config: MediaConfig;
  onChange: (c: MediaConfig) => void;
}) {
  const { data: albums } = useQuery({
    queryKey: ['albums'],
    queryFn: () => api.get<Album[]>('/media/albums'),
    staleTime: 60_000,
  });

  const toggleAlbum = (albumId: string) => {
    const current = config.albumIds;
    const next = current.includes(albumId)
      ? current.filter((id) => id !== albumId)
      : [...current, albumId];
    onChange({ ...config, albumIds: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">Alben auswählen</p>
        {!albums ? (
          <p className="text-xs text-fg-muted">Lade Alben…</p>
        ) : albums.length === 0 ? (
          <p className="text-xs text-fg-muted">Keine Alben vorhanden</p>
        ) : (
          albums.map((album) => (
            <label key={album.id} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={config.albumIds.includes(album.id)}
                onChange={() => toggleAlbum(album.id)}
                className="accent-brand-500"
              />
              {album.name}
            </label>
          ))
        )}
        {config.albumIds.length === 0 && (
          <p className="text-xs text-fg-subtle">(Alle Medien werden angezeigt)</p>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-sm font-medium text-fg">Diashow-Intervall: {config.slideshowInterval}s</p>
        <input
          type="range"
          min={3}
          max={30}
          step={1}
          value={config.slideshowInterval}
          onChange={(e) => onChange({ ...config, slideshowInterval: Number(e.target.value) })}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-fg-subtle">
          <span>3s</span>
          <span>30s</span>
        </div>
      </div>
    </div>
  );
}

export function WidgetSettingsContent({
  widget,
  config,
  onConfigChange,
}: {
  widget: Widget;
  config: WidgetConfig;
  onConfigChange: (c: WidgetConfig) => void;
}) {
  switch (widget.type) {
    case 'calendar':
      return <CalendarSettings config={config as CalendarConfig} onChange={onConfigChange} />;
    case 'weather':
      return <WeatherSettings config={config as WeatherConfig} onChange={onConfigChange} />;
    case 'media':
      return <MediaSettings config={config as MediaConfig} onChange={onConfigChange} />;
    default:
      return <p className="text-sm text-fg-muted">Keine Einstellungen verfügbar</p>;
  }
}

// ─── Calendar Widget ───

export function CalendarWidget({ config, onNavigate }: { config: CalendarConfig; onNavigate?: () => void }) {
  const today = new Date();
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const weekStartsSunday = config.weekStart === 'sunday';
  const dayLabels = weekStartsSunday
    ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const adjustedFirst = weekStartsSunday ? firstDay : (firstDay === 0 ? 6 : firstDay - 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const weeks: { wn: number; days: (number | null)[] }[] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < adjustedFirst; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      const firstReal = currentWeek.find(d => d !== null);
      const wn = firstReal ? getWeekNumber(new Date(today.getFullYear(), today.getMonth(), firstReal)) : 0;
      weeks.push({ wn, days: currentWeek });
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    const firstReal = currentWeek.find(d => d !== null);
    const wn = firstReal ? getWeekNumber(new Date(today.getFullYear(), today.getMonth(), firstReal)) : 0;
    weeks.push({ wn, days: currentWeek });
  }

  const cols = config.showWeekNumbers ? 'grid-cols-[2rem_repeat(7,_1fr)]' : 'grid-cols-7';

  return (
    <div className="text-xs cursor-pointer" onClick={onNavigate}>
      <div className="font-medium text-center mb-1">{months[today.getMonth()]} {today.getFullYear()}</div>
      <div className={cn('grid text-center text-fg-muted mb-0.5', cols)}>
        {config.showWeekNumbers && <div className="py-0.5 text-[10px] text-fg-subtle">KW</div>}
        {dayLabels.map((d) => <div key={d} className="py-0.5">{d}</div>)}
      </div>
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className={cn('grid text-center', cols)}>
            {config.showWeekNumbers && (
              <div className="flex items-center justify-center">
                <span className="text-[10px] text-fg-subtle">{week.wn}</span>
              </div>
            )}
            {week.days.map((d, di) => (
              <div key={di} className="flex items-center justify-center">
                {d !== null && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded',
                      d === today.getDate() ? 'bg-brand-500 text-white font-medium' : '',
                    )}
                  >
                    {d}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Weather Widget ───

export function WeatherWidget({ config, onConfigChange }: { config: WeatherConfig; onConfigChange: (c: WeatherConfig) => void }) {
  const activeLocation = config.locations[config.activeLocationIndex] ?? config.locations[0];
  if (!activeLocation) return <div className="text-sm text-fg-muted">Kein Standort ausgewählt</div>;

  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ['weather-current', activeLocation.lat, activeLocation.lng],
    queryFn: async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${activeLocation.lat}&longitude=${activeLocation.lng}&current_weather=true&timezone=auto`,
      );
      if (!res.ok) throw new Error('Weather API failed');
      return res.json();
    },
    staleTime: 300_000,
    retry: 1,
    enabled: !!activeLocation,
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['weather-forecast', activeLocation?.lat, activeLocation?.lng],
    queryFn: async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${activeLocation.lat}&longitude=${activeLocation.lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=5`,
      );
      if (!res.ok) throw new Error('Weather forecast API failed');
      return res.json();
    },
    staleTime: 300_000,
    retry: 1,
    enabled: !!activeLocation && config.expanded,
  });

  if (currentLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin opacity-40" /></div>;
  if (!current) return <div className="text-sm text-fg-muted">Wetter nicht verfügbar</div>;

  const w = current.current_weather;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-fg-muted">{activeLocation?.name ?? 'Unbekannt'}</span>
        <button
          onClick={() => onConfigChange({ ...config, expanded: !config.expanded })}
          className={cn(
            'text-xs rounded-md px-2 py-0.5 border transition-colors',
            config.expanded
              ? 'bg-brand-500/10 border-brand-500/30 text-brand-500'
              : 'border-border text-fg-muted hover:text-fg',
          )}
        >
          {config.expanded ? 'Weniger' : 'Vergrössern'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold">{w.temperature}°</span>
        <span className="text-xs text-fg-muted">Wind: {w.windspeed} km/h</span>
      </div>

      {config.expanded && (
        <div className="border-t border-border pt-2 mt-1">
          <p className="text-xs font-medium text-fg-muted mb-1.5">5-Tage-Vorhersage</p>
          {forecastLoading ? (
            <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin opacity-40" /></div>
          ) : forecast?.daily ? (
            <div className="space-y-1">
              {forecast.daily.time.map((date: string, i: number) => {
                const dayName = new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' });
                const code = forecast.daily.weathercode[i];
                return (
                  <div key={date} className="flex items-center justify-between text-xs">
                    <span className="w-8 text-fg-muted">{dayName}</span>
                    <span className="text-base">{wmoIcon(code)}</span>
                    <span className="text-fg-muted">
                      {Math.round(forecast.daily.temperature_2m_min[i])}° / {Math.round(forecast.daily.temperature_2m_max[i])}°
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Media Widget ───

export function MediaWidget({ config }: { config: MediaConfig }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalMs = config.slideshowInterval * 1000;

  const albumQuery = config.albumIds.length > 0
    ? `albumIds=${config.albumIds.join(',')}`
    : '';

  const { data: files, isLoading } = useQuery({
    queryKey: ['dashboard-media', config.albumIds],
    queryFn: () => api.get<{ id: string; filename: string; thumbnailPath?: string; mimeType?: string; url?: string }[]>(
      `/media/files${albumQuery ? '?' + albumQuery : '?limit=50'}`,
    ),
    staleTime: 30_000,
  });

  const total = files?.length ?? 0;

  useEffect(() => {
    if (paused || total === 0) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, total, intervalMs]);

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin opacity-40" /></div>;
  if (!files || total === 0) return <div className="text-sm text-fg-muted">Keine Medien</div>;

  const current = files[currentIndex];
  if (!current) return <div className="text-sm text-fg-muted">Keine Medien</div>;

  const isVideo = current.mimeType?.startsWith('video/');
  const imgSrc = current.thumbnailPath || (current.id
    ? `http://${window.location.hostname}:3007/api/v1/media/files/${current.id}/stream?token=${typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('lifehub-auth') || '{}')?.state?.accessToken ?? '') : ''}`
    : null);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative flex-1 rounded-md overflow-hidden bg-bg-raised" style={{ aspectRatio: '16/9' }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={current.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-muted text-xs">
            {current?.filename ?? 'Kein Bild'}
          </div>
        )}

        {total > 1 && (
          <>
            <button
              onClick={() => { setPaused(true); setCurrentIndex((prev) => (prev - 1 + total) % total); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setPaused(true); setCurrentIndex((prev) => (prev + 1) % total); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-fg-muted truncate max-w-[70%]">
          {current?.filename ?? ''}
        </span>
        {total > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPaused(!paused)}
              className="rounded p-0.5 text-fg-muted hover:text-fg"
              title={paused ? 'Weiter' : 'Pause'}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <span className="text-[10px] text-fg-subtle">
              {currentIndex + 1}/{total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Savings Widget (Stub) ───

export function SavingsWidget() {
  return (
    <div className="flex flex-col gap-2 items-center justify-center h-full text-fg-muted">
      <PiggyBank className="h-8 w-8 opacity-30" />
      <p className="text-xs">Sparziele in Phase 2</p>
    </div>
  );
}
