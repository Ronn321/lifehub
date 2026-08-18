'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { getMediaStreamUrl } from '@/lib/media';
import type { Widget, WidgetConfig } from '@/lib/grid-utils';
import type { CalendarConfig, WeatherConfig, MediaConfig, WeatherLocation } from '@/lib/grid-utils';
import { WIDGET_LABELS } from '@/lib/grid-utils';
import { formatTime, getEventColor, type CalendarEvent, type CalendarItem } from '@/lib/calendar';
import { EventDialog } from '@/components/calendar/EventDialog';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';

interface Album {
  id: string;
  name: string;
}

interface MediaFile {
  id: string;
  filename: string;
  thumbnailPath?: string;
  mimeType?: string;
  url?: string;
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
            className="text-sm rounded-md bg-[var(--lh-accent)] px-3 py-1 text-white hover:bg-[var(--lh-accent-90)]"
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
                className="accent-[var(--lh-accent)]"
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
          className="accent-[var(--lh-accent)]"
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; lat: number; lng: number; admin1?: string; country: string }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchCity = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=de&format=json`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results.map((r: { name: string; latitude: number; longitude: number; admin1?: string; country: string }) => ({
          name: r.name,
          lat: r.latitude,
          lng: r.longitude,
          admin1: r.admin1,
          country: r.country,
        })));
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const addLocation = (loc: { name: string; lat: number; lng: number }) => {
    if (config.locations.some((l) => Math.abs(l.lat - loc.lat) < 0.01 && Math.abs(l.lng - loc.lng) < 0.01)) return;
    const newLocations = [...config.locations, loc];
    // The newly added location becomes active immediately
    onChange({ ...config, locations: newLocations, activeLocationIndex: newLocations.length - 1 });
    setQuery('');
    setResults(null);
    setSearched(false);
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
        {config.locations.length === 0 && (
          <p className="text-xs text-fg-muted">Keine Orte gespeichert</p>
        )}
        {config.locations.map((loc, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2">
            <span className="text-sm text-fg truncate">{loc.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {i !== config.activeLocationIndex && (
                <button
                  onClick={() => onChange({ ...config, activeLocationIndex: i })}
                  className="text-xs rounded bg-[var(--lh-accent-10)] text-[var(--lh-accent)] px-2 py-0.5 hover:bg-[var(--lh-accent-20)]"
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
        <p className="text-sm font-medium text-fg">Stadt suchen</p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setResults(null); setSearched(false); }}
            onKeyDown={(e) => e.key === 'Enter' && searchCity()}
            placeholder="Stadtname (z.B. Berlin)"
            className="flex-1 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-[var(--lh-accent)]"
          />
          <button
            onClick={searchCity}
            disabled={searching || !query.trim()}
            className="flex items-center gap-1 text-sm rounded-md bg-[var(--lh-accent)] px-3 py-1.5 text-white hover:bg-[var(--lh-accent-90)] disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Suchen
          </button>
        </div>

        {searched && results !== null && results.length === 0 && (
          <p className="text-xs text-fg-muted">Keine Ergebnisse gefunden</p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-fg-muted">Ergebnisse:</p>
            {results.map((r) => (
              <button
                key={`${r.lat}-${r.lng}`}
                onClick={() => addLocation(r)}
                className="w-full flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg hover:bg-bg-raised"
              >
                <span>{r.name}{r.admin1 ? `, ${r.admin1}` : ''}</span>
                <span className="text-xs text-fg-subtle">{r.country}</span>
              </button>
            ))}
          </div>
        )}
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
                className="accent-[var(--lh-accent)]"
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
          className="w-full accent-[var(--lh-accent)]"
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
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoForDay = (day: number) => `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(day)}`;

  // ── Events for the current month ──
  const qc = useQueryClient();
  const monthStart = isoForDay(1);
  const monthEnd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(daysInMonth)}`;
  const { data: events } = useQuery<CalendarEvent[]>({
    queryKey: ['dashboard-calendar-events', monthStart],
    queryFn: () => api.get<CalendarEvent[]>(`/calendar/events?from=${monthStart}&to=${monthEnd}`),
    staleTime: 30_000,
  });
  const { data: calendars } = useQuery<CalendarItem[]>({
    queryKey: ['dashboard-calendars'],
    queryFn: () => api.get<CalendarItem[]>('/calendar/calendars'),
    staleTime: 60_000,
  });
  const calendarsMap = (calendars ?? []).reduce<Record<string, CalendarItem>>((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const eventsOnDay = (iso: string): CalendarEvent[] =>
    (events ?? []).filter((e) => {
      const s = e.startDate.slice(0, 10);
      const en = e.endDate ? e.endDate.slice(0, 10) : s;
      return iso >= s && iso <= en;
    });

  // ── Interactions: hover agenda + context menus ──
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [createDay, setCreateDay] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openHover = (day: number) => {
    const iso = isoForDay(day);
    const el = document.getElementById(`dash-cal-${iso}`);
    const rect = el?.getBoundingClientRect();
    if (rect) setHoverPos({ x: rect.right + 10, y: rect.top - 4 });
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoverDay(iso);
  };
  const closeHoverSoon = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverDay(null), 180);
  };
  const cancelHoverClose = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-calendar-events'] });
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      setDetailEvent(null);
    },
  });
  const refreshEvents = () => {
    qc.invalidateQueries({ queryKey: ['dashboard-calendar-events'] });
    qc.invalidateQueries({ queryKey: ['calendar-events'] });
  };

  const hoverEvents = hoverDay ? eventsOnDay(hoverDay) : [];
  const hoverTitle = hoverDay
    ? new Date(`${hoverDay}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

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
                  <div
                    id={`dash-cal-${isoForDay(d)}`}
                    className="relative flex items-center justify-center"
                    onMouseEnter={() => openHover(d)}
                    onMouseLeave={closeHoverSoon}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCreateDay(isoForDay(d));
                    }}
                  >
                    <span
                      className={cn(
                        'relative inline-flex items-center justify-center w-6 h-6 rounded',
                        d === today.getDate() ? 'bg-[var(--lh-accent)] text-white font-medium' : 'hover:bg-bg-raised',
                      )}
                    >
                      {d}
                      {eventsOnDay(isoForDay(d)).length > 0 && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--lh-accent)]" />
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Hover agenda — fixed positioned next to the day, with pointer arrow */}
      {hoverDay && hoverPos && (
        <div
          className="fixed z-50 w-60 rounded-lg border border-border bg-bg-surface shadow-xl p-2 space-y-1 animate-fade-in"
          style={{ left: hoverPos.x, top: hoverPos.y }}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={closeHoverSoon}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute -left-1 top-3 h-2 w-2 rotate-45 border-l border-t border-border bg-bg-surface" />
          <p className="px-1.5 pb-1 text-[11px] font-semibold text-fg-muted border-b border-border">{hoverTitle}</p>
          {hoverEvents.length === 0 ? (
            <p className="px-1.5 py-1.5 text-xs text-fg-muted">Keine Termine</p>
          ) : (
            hoverEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDetailEvent(ev); }}
                className="w-full flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-bg-raised"
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: getEventColor(ev, calendarsMap) }} />
                <span className="text-fg-muted shrink-0">{ev.allDay ? 'Ganztags' : formatTime(ev.startDate)}</span>
                <span className="truncate text-fg">{ev.title}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Right-click on a day → create event (no navigation) */}
      {createDay && (
        <EventDialog
          open
          onClose={() => setCreateDay(null)}
          onSuccess={() => { refreshEvents(); setCreateDay(null); }}
          prefillDate={createDay}
          calendars={calendars ?? []}
        />
      )}

      {/* Edit existing event */}
      {editEvent && (
        <EventDialog
          open
          onClose={() => setEditEvent(null)}
          onSuccess={() => { refreshEvents(); setEditEvent(null); }}
          editEvent={editEvent}
          calendars={calendars ?? []}
        />
      )}

      {/* Event detail (click / right-click in the hover agenda) */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          calendars={calendars ?? []}
          onClose={() => setDetailEvent(null)}
          onEdit={(ev) => { setDetailEvent(null); setEditEvent(ev); }}
          onDelete={(ev) => deleteMutation.mutate(ev.id)}
        />
      )}
    </div>
  );
}

// ─── Weather Widget ───

export function WeatherWidget({ config, onConfigChange }: { config: WeatherConfig; onConfigChange: (c: WeatherConfig) => void }) {
  const activeLocation = config.locations[config.activeLocationIndex] ?? config.locations[0];

  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ['weather-current', activeLocation?.lat, activeLocation?.lng],
    queryFn: async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${activeLocation?.lat}&longitude=${activeLocation?.lng}&current_weather=true&timezone=auto`,
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
        `https://api.open-meteo.com/v1/forecast?latitude=${activeLocation?.lat}&longitude=${activeLocation?.lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=5`,
      );
      if (!res.ok) throw new Error('Weather forecast API failed');
      return res.json();
    },
    staleTime: 300_000,
    retry: 1,
    enabled: !!activeLocation && config.expanded,
  });

  if (!activeLocation) return <div className="text-sm text-fg-muted">Kein Standort ausgewählt</div>;

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
              ? 'bg-[var(--lh-accent-10)] border-[var(--lh-accent-30)] text-[var(--lh-accent)]'
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

  const { data: files, isLoading } = useQuery({
    queryKey: ['dashboard-media', config.albumIds],
    queryFn: async (): Promise<MediaFile[]> => {
      // No album selected -> list the most recent files globally.
      if (config.albumIds.length === 0) {
        const res = await api.get<{ items: MediaFile[]; total: number }>('/media/files?limit=50');
        return res.items ?? [];
      }
      // Album selected -> fetch each album and merge its files.
      // The album endpoint returns [{ file, sortOrder }], so map to file.
      // allSettled: a deleted album id in the stored config must not fail the whole widget.
      const results = await Promise.allSettled(
        config.albumIds.map((id) =>
          api.get<{ file: MediaFile; sortOrder: number }[]>(`/media/albums/${id}/media`),
        ),
      );
      return results
        .filter((r): r is PromiseFulfilledResult<{ file: MediaFile; sortOrder: number }[]> => r.status === 'fulfilled')
        .flatMap((r) => r.value.map((entry) => entry.file));
    },
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
  const imgSrc = current.id ? getMediaStreamUrl(current.id) : null;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative flex-1 rounded-md overflow-hidden bg-bg-raised" style={{ aspectRatio: '16/9' }}>
        {imgSrc ? (
          isVideo ? (
            <video
              src={imgSrc}
              muted
              autoPlay
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={imgSrc}
              alt={current.filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )
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
