'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Pencil, X, Settings,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  location: string | null;
  color: string | null;
  category: string | null;
  calendarSource: string;
  ownerId: string;
}

interface CalendarSettings {
  weekStart: 'monday' | 'sunday';
  showWeekNumbers: boolean;
}

const DAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAYS_SHORT_MONDAY = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const defaultSettings: CalendarSettings = {
  weekStart: 'monday',
  showWeekNumbers: true,
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function useCurrentMonth() {
  const now = new Date();
  return useState(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
}

function getMonthDays(year: number, month: number, weekStartsSunday: boolean) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const adjustedOffset = weekStartsSunday ? startOffset : (startOffset === 0 ? 6 : startOffset - 1);
  const daysInMonth = lastDay.getDate();

  const weeks: { wn: number; days: { day: number | null; date: string }[] }[] = [];
  let currentWeek: { day: number | null; date: string }[] = [];

  for (let i = 0; i < adjustedOffset; i++) {
    currentWeek.push({ day: null, date: '' });
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const d = new Date(year, month, dayNum);
    const dateStr = d.toISOString().slice(0, 10);
    currentWeek.push({ day: dayNum, date: dateStr });

    if (currentWeek.length === 7) {
      const firstReal = currentWeek.find(c => c.day !== null);
      const wn = firstReal ? getWeekNumber(new Date(year, month, firstReal.day!)) : 0;
      weeks.push({ wn, days: currentWeek });
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ day: null, date: '' });
    const firstReal = currentWeek.find(c => c.day !== null);
    const wn = firstReal ? getWeekNumber(new Date(year, month, firstReal.day!)) : 0;
    weeks.push({ wn, days: currentWeek });
  }

  return weeks;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

const CATEGORY_COLORS: Record<string, string> = {
  default: 'bg-blue-500',
  birthday: 'bg-pink-500',
  holiday: 'bg-green-500',
  appointment: 'bg-amber-500',
  reminder: 'bg-purple-500',
  task: 'bg-zinc-500',
};

function getEventColor(event: CalendarEvent) {
  if (event.color) return event.color;
  return CATEGORY_COLORS[event.category || 'default'] || CATEGORY_COLORS.default;
}

/* ─── Settings Panel ─── */
function CalendarSettingsPanel({ open, onClose, settings, onChange }: {
  open: boolean;
  onClose: () => void;
  settings: CalendarSettings;
  onChange: (s: CalendarSettings) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm p-5 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Kalender-Einstellungen</h3>
          <button onClick={onClose} className="rounded-md bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-700">Fertig</button>
        </div>
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium mb-2">Wochenstart</legend>
            <div className="flex gap-3">
              {(['monday', 'sunday'] as const).map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="ws" checked={settings.weekStart === day}
                    onChange={() => onChange({ ...settings, weekStart: day })} className="accent-amber-500" />
                  {day === 'monday' ? 'Montag' : 'Sonntag'}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={settings.showWeekNumbers}
              onChange={(e) => onChange({ ...settings, showWeekNumbers: e.target.checked })} className="accent-amber-500" />
            Wochennummern anzeigen
          </label>
        </div>
      </div>
    </div>
  );
}

/* ─── Day Event List Popover ─── */
function DayEventPopover({ date, events, onClose, onEdit, onDelete, onNew }: {
  date: string;
  events: CalendarEvent[];
  onClose: () => void;
  onEdit: (e: CalendarEvent) => void;
  onDelete: (e: CalendarEvent) => void;
  onNew: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold">{new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-3 space-y-2">
          {events.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">Keine Termine an diesem Tag.</p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getEventColor(ev) }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ev.title}</p>
                <p className="text-xs text-zinc-500">
                  {ev.allDay ? 'Ganztägig' : `${formatTime(ev.startDate)}${ev.endDate ? ` – ${formatTime(ev.endDate)}` : ''}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(ev)} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => onDelete(ev)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button onClick={onNew} className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" /> Neuer Termin
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Event Dialog (Create / Edit) ─── */
function EventDialog({
  open, onClose, onSuccess, editEvent, prefillDate,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void; editEvent?: CalendarEvent | null; prefillDate?: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description || '');
      setStartDate(toDatetimeLocal(editEvent.startDate));
      setEndDate(editEvent.endDate ? toDatetimeLocal(editEvent.endDate) : '');
      setAllDay(editEvent.allDay);
      setLocation(editEvent.location || '');
      setColor(editEvent.color || '');
      setCategory(editEvent.category || '');
    } else {
      setTitle(''); setDescription(''); setStartDate(prefillDate ? prefillDate + 'T09:00' : ''); setEndDate('');
      setAllDay(false); setLocation(''); setColor(''); setCategory('');
    }
    setError('');
  }, [editEvent, open, prefillDate]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        title,
        description: description || undefined,
        startDate: allDay ? startDate.slice(0, 10) + 'T00:00:00' : startDate + ':00',
        endDate: endDate ? (allDay ? endDate.slice(0, 10) + 'T23:59:00' : endDate + ':00') : undefined,
        allDay,
        location: location || undefined,
        color: color || undefined,
        category: category || undefined,
      };
      if (editEvent) {
        return api.put<CalendarEvent>(`/calendar/events/${editEvent.id}`, body);
      }
      return api.post<CalendarEvent>('/calendar/events', body);
    },
    onSuccess: () => {
      setTitle(''); setDescription(''); setStartDate(''); setEndDate('');
      setAllDay(false); setLocation(''); setColor(''); setCategory('');
      setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{editEvent ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Titel *</label>
            <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="z.B. Zahnarzt" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Beschreibung</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px] resize-y" placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded border-zinc-300 dark:border-zinc-700" />
            <label htmlFor="allDay" className="text-sm">Ganztägig</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Start *</label>
              <input type={allDay ? 'date' : 'datetime-local'} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Ende</label>
              <input type={allDay ? 'date' : 'datetime-local'} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Ort</label>
            <input className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Optional" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Kategorie</label>
              <select className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Keine</option>
                <option value="birthday">Geburtstag</option>
                <option value="holiday">Urlaub</option>
                <option value="appointment">Termin</option>
                <option value="reminder">Erinnerung</option>
                <option value="task">Aufgabe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Farbe</label>
              <div className="flex gap-1.5 mt-2">
                {['#3b82f6', '#ec4899', '#22c55e', '#d97706', '#a855f7', '#ef4444', '#14b8a6', '#78716c'].map((c) => (
                  <button key={c} onClick={() => setColor(color === c ? '' : c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white ring-2 ring-amber-500' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => mutation.mutate()} disabled={!title || !startDate || mutation.isPending}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editEvent ? 'Speichern' : 'Termin anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Event Detail Popover ─── */
function EventPopover({
  event, position, onClose, onEdit, onDelete,
}: {
  event: CalendarEvent; position: { x: number; y: number };
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 min-w-[260px] max-w-sm"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getEventColor(event) }} />
          <h3 className="font-semibold truncate">{event.title}</h3>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">&times;</button>
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        <p>{event.allDay ? formatDate(event.startDate) + (event.endDate ? ` – ${formatDate(event.endDate)}` : '') : formatTime(event.startDate) + (event.endDate ? ` – ${formatTime(event.endDate)}` : '')}</p>
        {event.location && <p>📍 {event.location}</p>}
        {event.description && <p className="text-zinc-500">{event.description}</p>}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><Pencil className="h-3.5 w-3.5" /> Bearbeiten</button>
        <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"><Trash2 className="h-3.5 w-3.5" /> Löschen</button>
      </div>
    </div>
  );
}

function CalendarInner() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [monthStr, setMonthStr] = useCurrentMonth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [prefillDate, setPrefillDate] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<CalendarSettings>(defaultSettings);
  const [dayPopoverDate, setDayPopoverDate] = useState<string | null>(null);

  const year = parseInt(monthStr.split('-')[0] || '0');
  const month = parseInt(monthStr.split('-')[1] || '1') - 1;

  // Read month from URL param (when navigated from dashboard widget)
  useEffect(() => {
    const m = searchParams.get('month');
    if (m && /^\d{4}-\d{2}$/.test(m)) {
      setMonthStr(m);
    }
  }, [searchParams, setMonthStr]);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('calendar-settings');
      if (saved) setSettings(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save settings
  const updateSettings = useCallback((s: CalendarSettings) => {
    setSettings(s);
    localStorage.setItem('calendar-settings', JSON.stringify(s));
  }, []);

  const monthWeeks = useMemo(() => getMonthDays(year, month, settings.weekStart === 'sunday'), [year, month, settings.weekStart]);
  const allCells = monthWeeks.flatMap(w => w.days);
  const firstDate = allCells.find((c) => c.day === 1)?.date || '';
  const lastDay = [...allCells].reverse().find((c) => c.day !== null)?.date || firstDate;

  const { data: events, isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', monthStr],
    queryFn: () => api.get<CalendarEvent[]>(`/calendar/events?from=${firstDate}&to=${lastDay}`),
    enabled: !!accessToken && !!firstDate,
  });

  useEffect(() => {
    if (!accessToken) router.push('/login');
  }, [accessToken, router]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setSelectedEvent(null);
      setDayPopoverDate(null);
    },
  });

  function prevMonth() {
    const d = new Date(year, month - 1, 1);
    setMonthStr(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }

  function nextMonth() {
    const d = new Date(year, month + 1, 1);
    setMonthStr(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }

  function today() {
    const now = new Date();
    setMonthStr(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
  }

  function eventsForDate(dateStr: string) {
    return (events || []).filter((e) => {
      const eStart = e.startDate.slice(0, 10);
      const eEnd = e.endDate ? e.endDate.slice(0, 10) : eStart;
      return dateStr >= eStart && dateStr <= eEnd;
    });
  }

  const weekStartsSunday = settings.weekStart === 'sunday';
  const dayLabels = weekStartsSunday ? DAYS_SHORT : DAYS_SHORT_MONDAY;
  const cols = settings.showWeekNumbers ? 'grid-cols-[2.5rem_repeat(7,_1fr)]' : 'grid-cols-7';

  const monthName = new Date(year, month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().slice(0, 10);

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  );
}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kalender</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Deine Termine und Ereignisse
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings className="h-4 w-4" /> Einstellungen
          </button>
          <button
            onClick={() => { setEditEvent(null); setPrefillDate(''); setDialogOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Neuer Termin
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">{monthName}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button onClick={today} className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          Heute
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Fehler beim Laden der Termine.</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['calendar-events'] })} className="mt-2 text-sm text-amber-600 hover:underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Calendar Grid */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
            {/* Day headers */}
            <div className={cn('grid border-b border-zinc-200 dark:border-zinc-800', cols)}>
              {settings.showWeekNumbers && <div className="px-1 py-2.5 text-center text-[10px] font-medium text-zinc-400">KW</div>}
              {dayLabels.map((d) => (
                <div key={d} className="px-2 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">{d}</div>
              ))}
            </div>

            {/* Grid cells */}
            <div>
              {monthWeeks.map((week, wi) => (
                <div key={wi} className={cn('grid', cols)}>
                  {settings.showWeekNumbers && (
                    <div className="flex items-start justify-center pt-2 text-[10px] font-medium text-zinc-400">{week.wn}</div>
                  )}
                  {week.days.map((cell, di) => {
                    if (!cell.day) {
                      return <div key={di} className="min-h-[100px] bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-r border-zinc-200 dark:border-zinc-800" />;
                    }
                    const cellEvents = eventsForDate(cell.date);
                    const isToday = cell.date === todayStr;

                    return (
                      <div
                        key={di}
                        className="min-h-[100px] p-1.5 border-b border-r border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer relative group"
                        onClick={() => {
                          // Single click: show day events popover
                          setDayPopoverDate(cell.date);
                          setPrefillDate(cell.date);
                        }}
                        onDoubleClick={() => {
                          // Double click: open event editor with this date pre-filled
                          setDayPopoverDate(null);
                          setEditEvent(null);
                          setPrefillDate(cell.date);
                          setDialogOpen(true);
                        }}
                      >
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm mb-1 ${
                          isToday ? 'bg-amber-600 text-white font-bold' : 'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {cell.day}
                        </div>
                        <div className="space-y-0.5">
                          {cellEvents.slice(0, 3).map((ev) => (
                            <button
                              key={ev.id}
                              className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded text-[11px] leading-tight truncate transition-opacity hover:opacity-80"
                              style={{ backgroundColor: getEventColor(ev) + '22', color: getEventColor(ev) }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setSelectedEvent(selectedEvent?.id === ev.id ? null : ev);
                                setPopoverPos({ x: Math.min(rect.left, window.innerWidth - 300), y: rect.bottom + 4 });
                              }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getEventColor(ev) }} />
                              <span className="truncate">
                                {!ev.allDay && formatTime(ev.startDate) + ' '}
                                {ev.title}
                              </span>
                            </button>
                          ))}
                          {cellEvents.length > 3 && (
                            <p className="text-[10px] text-zinc-400 pl-1">
                              +{cellEvents.length - 3} weitere
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Day Event Popover */}
      {dayPopoverDate && (
        <DayEventPopover
          date={dayPopoverDate}
          events={eventsForDate(dayPopoverDate)}
          onClose={() => setDayPopoverDate(null)}
          onEdit={(ev) => {
            setEditEvent(ev);
            setDayPopoverDate(null);
            setDialogOpen(true);
          }}
          onDelete={(ev) => {
            if (window.confirm('Wirklich löschen?')) deleteMutation.mutate(ev.id);
          }}
          onNew={() => {
            setEditEvent(null);
            setDayPopoverDate(null);
            setDialogOpen(true);
          }}
        />
      )}

      {/* Event Detail Popover */}
      {selectedEvent && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSelectedEvent(null)} />
          <EventPopover
            event={selectedEvent}
            position={popoverPos}
            onClose={() => setSelectedEvent(null)}
            onEdit={() => {
              setEditEvent(selectedEvent);
              setSelectedEvent(null);
              setDialogOpen(true);
            }}
            onDelete={() => {
              if (window.confirm('Wirklich löschen?')) deleteMutation.mutate(selectedEvent.id);
            }}
          />
        </>
      )}

      {/* Create/Edit Dialog */}
      <EventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditEvent(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['calendar-events'] })}
        editEvent={editEvent}
        prefillDate={prefillDate}
      />

      {/* Settings Panel */}
      <CalendarSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>}>
      <CalendarInner />
    </Suspense>
  );
}
