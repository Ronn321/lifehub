'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, CloudSun, Calendar as CalendarIcon, PiggyBank, Loader2, Settings, ChevronLeft, ChevronRight, Pause, Play, Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ─── Types ─── */
interface WeatherLocation {
  name: string;
  lat: number;
  lng: number;
}

interface CalendarConfig {
  weekStart: 'monday' | 'sunday';
  showWeekNumbers: boolean;
}

interface WeatherConfig {
  locations: WeatherLocation[];
  activeLocationIndex: number;
  expanded: boolean;
}

interface MediaConfig {
  albumIds: string[];
  slideshowInterval: number;
}

type WidgetConfig = CalendarConfig | WeatherConfig | MediaConfig | Record<string, unknown>;

interface Widget {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: WidgetConfig;
}

interface DashboardLayout {
  widgets: Widget[];
}

interface Album {
  id: string;
  name: string;
}

const WIDGET_LABELS: Record<string, string> = {
  media: 'Letzte Medien',
  weather: 'Wetter',
  calendar: 'Kalender',
  savings: 'Sparziele',
};

const WIDGET_ICONS: Record<string, React.ReactNode> = {
  media: <Camera className="h-5 w-5" />,
  weather: <CloudSun className="h-5 w-5" />,
  calendar: <CalendarIcon className="h-5 w-5" />,
  savings: <PiggyBank className="h-5 w-5" />,
};

function defaultConfig(type: string): WidgetConfig {
  switch (type) {
    case 'calendar':
      return { weekStart: 'monday', showWeekNumbers: false } satisfies CalendarConfig;
    case 'weather':
      return {
        locations: [{ name: 'Frankfurt', lat: 50.11, lng: 8.68 }],
        activeLocationIndex: 0,
        expanded: false,
      } satisfies WeatherConfig;
    case 'media':
      return { albumIds: [], slideshowInterval: 5 } satisfies MediaConfig;
    default:
      return {};
  }
}

function parseConfig<T extends WidgetConfig>(widget: Widget, fallback: T): T {
  return { ...fallback, ...(widget.config as Partial<T>) } as T;
}

/* ─── WMO Weather Code Helpers ─── */
const WMO_LABELS: Record<number, string> = {
  0: 'Klar', 1: 'Überwiegend klar', 2: 'Teils bewölkt', 3: 'Bedeckt',
  45: 'Neblig', 48: 'Reifnebel', 51: 'Leichter Niesel', 53: 'Niesel', 55: 'Starker Niesel',
  61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
  71: 'Leichter Schnee', 73: 'Schnee', 75: 'Starker Schnee',
  80: 'Leichte Schauer', 81: 'Schauer', 82: 'Starke Schauer',
  95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit starkem Hagel',
};

function wmoIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫';
  if (code >= 51 && code <= 55) return '🌦';
  if (code >= 61 && code <= 65) return '🌧';
  if (code >= 71 && code <= 75) return '❄️';
  if (code >= 80 && code <= 82) return '🌦';
  if (code >= 95) return '⛈';
  return '🌡';
}

/* ─── Settings Panel ─── */
function SettingsPanel({
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

/* ─── Calendar Settings ─── */
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
        <legend className="text-sm font-medium text-fg mb-2"> Wochenstart </legend>
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

/* ─── Weather Settings ─── */
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

/* ─── Media Settings ─── */
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

/* ─── Calendar Widget ─── */
function CalendarWidget({ config }: { config: CalendarConfig }) {
  const today = new Date();
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const weekStartsSunday = config.weekStart === 'sunday';
  const days = weekStartsSunday
    ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const adjustedFirst = weekStartsSunday ? firstDay : (firstDay === 0 ? 6 : firstDay - 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const blanks = Array.from({ length: adjustedFirst }).fill(null);
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const grid = [...blanks, ...dates] as (number | null)[];

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const weekNumbers: number[] = [];
  if (config.showWeekNumbers) {
    let cellsSinceLastWeek = 0;
    grid.forEach((d, i) => {
      if (d !== null) {
        if (cellsSinceLastWeek === 0) {
          const date = new Date(today.getFullYear(), today.getMonth(), d);
          const wn = getWeekNumber(date);
          weekNumbers[i] = wn;
        }
        cellsSinceLastWeek++;
        if (cellsSinceLastWeek >= 7) cellsSinceLastWeek = 0;
      } else {
        cellsSinceLastWeek = 0;
      }
    });
  }

  const cols = config.showWeekNumbers ? 'grid-cols-[2rem_repeat(7,_1fr)]' : 'grid-cols-7';

  return (
    <div className="text-xs">
      <div className="font-medium text-center mb-1">{months[today.getMonth()]} {today.getFullYear()}</div>
      <div className={cn('grid text-center text-fg-muted mb-0.5', cols)}>
        {config.showWeekNumbers && <div className="py-0.5 text-[10px] text-fg-subtle">KW</div>}
        {days.map((d) => <div key={d} className="py-0.5">{d}</div>)}
      </div>
      <div className={cn('grid text-center', cols)}>
        {grid.map((d, i) => (
          <div key={i} className="flex items-center justify-center">
            {config.showWeekNumbers && weekNumbers[i] !== undefined && (
              <span className="text-[10px] text-fg-subtle mr-1">{weekNumbers[i]}</span>
            )}
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
    </div>
  );
}

/* ─── Weather Widget ─── */
function WeatherWidget({ config, onConfigChange }: { config: WeatherConfig; onConfigChange: (c: WeatherConfig) => void }) {
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

/* ─── Media Widget ─── */
function MediaWidget({ config }: { config: MediaConfig }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalMs = config.slideshowInterval * 1000;

  const albumQuery = config.albumIds.length > 0
    ? `albumIds=${config.albumIds.join(',')}`
    : '';

  const { data: files, isLoading } = useQuery({
    queryKey: ['dashboard-media', config.albumIds],
    queryFn: () => api.get<{ id: string; filename: string; thumbnailPath?: string; url?: string }[]>(
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

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative flex-1 rounded-md overflow-hidden bg-bg-raised" style={{ aspectRatio: '16/9' }}>
        {current?.thumbnailPath || current?.url ? (
          <img
            src={current.thumbnailPath ?? current.url}
            alt={current.filename}
            className="w-full h-full object-cover"
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

/* ─── Savings Widget (Stub) ─── */
function SavingsWidget() {
  return (
    <div className="flex flex-col gap-2 items-center justify-center h-full text-fg-muted">
      <PiggyBank className="h-8 w-8 opacity-30" />
      <p className="text-xs">Sparziele in Phase 2</p>
    </div>
  );
}

/* ─── Widget Settings Router ─── */
function WidgetSettingsContent({
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

/* ─── Widget Renderer ─── */
function WidgetRenderer({
  widget,
  onSaveWidget,
}: {
  widget: Widget;
  onSaveWidget: (w: Widget) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cfg = parseConfig(widget, defaultConfig(widget.type) as never);

  const content = (() => {
    switch (widget.type) {
      case 'weather':
        return <WeatherWidget config={cfg as WeatherConfig} onConfigChange={(c) => onSaveWidget({ ...widget, config: c })} />;
      case 'media':
        return <MediaWidget config={cfg as MediaConfig} />;
      case 'calendar':
        return <CalendarWidget config={cfg as CalendarConfig} />;
      case 'savings':
        return <SavingsWidget />;
      default:
        return <div className="text-sm text-fg-muted">Unbekanntes Widget</div>;
    }
  })();

  const handleConfigChange = (newConfig: WidgetConfig) => {
    onSaveWidget({ ...widget, config: newConfig });
    setSettingsOpen(false);
  };

  return (
    <div
      className="rounded-xl border border-border bg-bg-surface p-4 flex flex-col gap-3 overflow-hidden relative group"
      style={{
        gridColumn: `span ${widget.w}`,
        gridRow: `span ${widget.h}`,
        minHeight: widget.h * 120 + 'px',
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <div className="flex items-center gap-2 flex-1">
          {WIDGET_ICONS[widget.type]}
          <span>{WIDGET_LABELS[widget.type] || widget.type}</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-md p-1 text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-fg hover:bg-bg-raised transition-opacity"
          title="Widget-Einstellungen"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {content}
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={`${WIDGET_LABELS[widget.type] || widget.type} — Einstellungen`}
      >
        <WidgetSettingsContent widget={widget} config={cfg} onConfigChange={handleConfigChange} />
      </SettingsPanel>
    </div>
  );
}

/* ─── Main Dashboard Page ─── */
export default function DashboardPage() {
  const router = useRouter();
  const { user, roles, clear, accessToken } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken) router.push('/login');
  }, [accessToken, router]);

  const { data: layout, isLoading, isError } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: () => api.get<DashboardLayout>('/dashboard/layout'),
    staleTime: 60_000,
    enabled: !!accessToken,
  });

  const saveMutation = useMutation({
    mutationFn: (l: DashboardLayout) => api.put('/dashboard/layout', l),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout'] });
    },
  });

  const handleSaveWidget = useCallback((updatedWidget: Widget) => {
    if (!layout) return;
    const next: DashboardLayout = {
      ...layout,
      widgets: layout.widgets.map((w) => (w.id === updatedWidget.id ? updatedWidget : w)),
    };
    qc.setQueryData(['dashboard-layout'], next);
    saveMutation.mutate(next);
  }, [layout, qc, saveMutation]);

  const handleLogout = useCallback(() => {
    clear();
    router.push('/login');
  }, [clear, router]);

  if (!user) return null;

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
  } as React.CSSProperties;

  const widgets = layout?.widgets ?? [];

  return (
    <main className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Hallo, {user.displayName} 👋</h1>
          <p className="text-sm text-fg-muted">{roles.join(' · ')}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMutation.isPending && <span className="text-xs text-fg-muted animate-pulse">Speichere…</span>}
          <button
            onClick={handleLogout}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm hover:bg-bg-raised"
          >
            Abmelden
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin opacity-40" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-3">
          <p className="text-lg">Layout konnte nicht geladen werden</p>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['dashboard-layout'] })}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
          >
            Erneut versuchen
          </button>
        </div>
      ) : widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-3">
          <p className="text-lg">Noch keine Widgets konfiguriert</p>
          <button
            onClick={async () => {
              const res = await api.post<DashboardLayout>('/dashboard/layout/reset');
              qc.setQueryData(['dashboard-layout'], res);
            }}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
          >
            Standard-Layout laden
          </button>
        </div>
      ) : (
        <div style={gridStyle}>
          {widgets.map((w) => (
            <WidgetRenderer key={w.id} widget={w} onSaveWidget={handleSaveWidget} />
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-fg-muted">
        Widgets anordnen per Drag & Drop in Phase 2
      </div>
    </main>
  );
}
