'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  BACKGROUND_PRESETS,
  type CalendarUserSettings,
  type CalendarView,
  type GoogleCalendarItem,
  type GoogleStatus,
  type WeekStart,
} from '@/lib/calendar';

interface CalendarSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: CalendarUserSettings | null | undefined;
  onSave: (patch: Partial<CalendarUserSettings>) => void;
}

const ACCENT_COLORS = ['#3b82f6', '#ec4899', '#22c55e', '#d97706', '#a855f7', '#ef4444', '#14b8a6'];

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Monat' },
  { value: 'week', label: 'Woche' },
  { value: 'day', label: 'Tag' },
  { value: 'agenda', label: 'Agenda' },
];

export function CalendarSettingsPanel({ open, onClose, settings, onSave }: CalendarSettingsPanelProps) {
  // Local draft synced from server settings.
  const [defaultView, setDefaultView] = useState<CalendarView>('month');
  const [weekStart, setWeekStart] = useState<WeekStart>('monday');
  const [showWeekNumbers, setShowWeekNumbers] = useState(true);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundOverlay, setBackgroundOverlay] = useState(0.85);
  const [backgroundBlur, setBackgroundBlur] = useState(12);

  useEffect(() => {
    if (!settings) return;
    setDefaultView(settings.defaultView ?? 'month');
    setWeekStart(settings.weekStart ?? 'monday');
    setShowWeekNumbers(settings.showWeekNumbers ?? true);
    setAccentColor(settings.accentColor ?? null);
    setBackgroundUrl(settings.backgroundUrl ?? null);
    setBackgroundOverlay(settings.backgroundOverlay ?? 0.85);
    setBackgroundBlur(settings.backgroundBlur ?? 12);
  }, [settings, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md p-5 mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Kalender-Einstellungen</h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg" aria-label="Schließen">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Ansicht */}
          <section>
            <h4 className="mb-2 text-sm font-medium">Ansicht</h4>
            <div className="space-y-3">
              <label className="block text-sm text-fg-muted">Standard-Ansicht</label>
              <div className="flex gap-2">
                {VIEWS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => { setDefaultView(v.value); onSave({ defaultView: v.value }); }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      defaultView === v.value ? 'bg-cal-500 text-bg' : 'border border-border hover:bg-bg-raised'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                {(['monday', 'sunday'] as const).map((d) => (
                  <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={weekStart === d}
                      onChange={() => { setWeekStart(d); onSave({ weekStart: d }); }}
                      className="accent-cal-500"
                    />
                    {d === 'monday' ? 'Montag' : 'Sonntag'}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWeekNumbers}
                  onChange={(e) => { setShowWeekNumbers(e.target.checked); onSave({ showWeekNumbers: e.target.checked }); }}
                  className="accent-cal-500"
                />
                Wochennummern anzeigen
              </label>
            </div>
          </section>

          {/* Akzentfarbe */}
          <section className="border-t border-border pt-4">
            <h4 className="mb-2 text-sm font-medium">Akzentfarbe</h4>
            <p className="mb-2 text-xs text-fg-subtle">Gilt nur für den Kalender. Ohne Auswahl wird die Hub-Farbe verwendet.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setAccentColor(null); onSave({ accentColor: null }); }}
                title="Hub-Standard"
                className={`grid h-8 w-8 place-items-center rounded-full border-2 transition-all ${
                  accentColor === null ? 'border-fg scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
              >
                <span className="text-[10px] font-bold text-white drop-shadow">★</span>
              </button>
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setAccentColor(c); onSave({ accentColor: c }); }}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    accentColor === c ? 'border-fg scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </section>

          {/* Hintergrundbild */}
          <section className="border-t border-border pt-4">
            <h4 className="mb-2 text-sm font-medium">Hintergrundbild</h4>
            <div className="mb-2 grid grid-cols-4 gap-2">
              {BACKGROUND_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setBackgroundUrl(p.url); onSave({ backgroundUrl: p.url }); }}
                  className={`rounded-lg border-2 text-[11px] font-medium transition-all ${
                    backgroundUrl === p.url ? 'border-cal-500' : 'border-border hover:border-cal-500/50'
                  }`}
                  style={p.url ? { backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  <span className="block py-3 text-center drop-shadow">{p.label}</span>
                </button>
              ))}
            </div>
            <label className="block text-sm text-fg-muted mb-1">Bild-URL</label>
            <input
              className="input-field w-full text-sm"
              placeholder="https://…"
              value={backgroundUrl ?? ''}
              onChange={(e) => { setBackgroundUrl(e.target.value || null); onSave({ backgroundUrl: e.target.value || null }); }}
            />
            <div className="mt-3">
              <label className="block text-sm text-fg-muted mb-1">
                Transparenz der Lesefläche: {Math.round(backgroundOverlay * 100)}%
              </label>
              <input
                type="range"
                min={0.5}
                max={0.95}
                step={0.05}
                value={backgroundOverlay}
                onChange={(e) => { const v = Number(e.target.value); setBackgroundOverlay(v); onSave({ backgroundOverlay: v }); }}
                className="w-full accent-cal-500"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm text-fg-muted mb-1">Weichzeichner: {backgroundBlur} px</label>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={backgroundBlur}
                onChange={(e) => { const v = Number(e.target.value); setBackgroundBlur(v); onSave({ backgroundBlur: v }); }}
                className="w-full accent-cal-500"
              />
            </div>
          </section>

          {/* Google-Kalender */}
          <section className="border-t border-border pt-4">
            <h4 className="mb-2 text-sm font-medium">Google Kalender</h4>
            <GoogleSection />
          </section>
        </div>
      </div>
    </div>
  );
}

function GoogleSection() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery<GoogleStatus>({
    queryKey: ['google-status'],
    queryFn: () => api.get<GoogleStatus>('/calendar/google/status'),
    staleTime: 60_000,
  });
  const { data: googleCalendars, isLoading } = useQuery<GoogleCalendarItem[]>({
    queryKey: ['google-calendars'],
    queryFn: () => api.get<GoogleCalendarItem[]>('/calendar/google/calendars'),
    enabled: !!status?.connected,
    staleTime: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/calendar/google/sync'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['google-status'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (cal: GoogleCalendarItem) => {
      if (cal.selected) {
        await api.delete(`/calendar/google/calendars/${encodeURIComponent(cal.id)}`);
      } else {
        await api.post('/calendar/google/calendars', {
          calendarId: cal.id,
          title: cal.summary,
          color: cal.color ?? undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-calendars'] });
    },
  });

  if (!status) {
    return <p className="text-sm text-fg-muted">Lade Google-Status…</p>;
  }

  if (!status.connected) {
    return (
      <div>
        <p className="text-sm text-fg-muted">
          Nicht verbunden. Verbinde dein Google-Konto in den Einstellungen unter „Google-Konto“, um E-Mails und Kalender zu synchronisieren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="font-medium">{status.email}</span>
      </div>
      {status.lastSyncAt && (
        <p className="text-xs text-fg-subtle">Zuletzt synchronisiert: {new Date(status.lastSyncAt).toLocaleString('de-DE')}</p>
      )}
      <button
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg-raised disabled:opacity-50 transition-colors"
      >
        {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Jetzt synchronisieren
      </button>
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-sm font-medium">Google-Kalender auswählen</p>
        {isLoading ? (
          <p className="text-sm text-fg-muted">Lade Kalender…</p>
        ) : !googleCalendars || googleCalendars.length === 0 ? (
          <p className="text-sm text-fg-muted">Keine Google-Kalender gefunden.</p>
        ) : (
          <div className="space-y-1.5">
            {googleCalendars.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.selected}
                  onChange={() => toggleMutation.mutate(c)}
                  className="accent-cal-500"
                />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color ?? '#9ca3af' }} />
                <span className="truncate">{c.summary}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
