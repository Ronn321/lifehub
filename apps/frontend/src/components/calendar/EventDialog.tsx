'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Info, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toDatetimeLocal, type CalendarEvent, type CalendarItem } from '@/lib/calendar';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editEvent?: CalendarEvent | null;
  prefillDate?: string;
  calendars: CalendarItem[];
}

const COLOR_SWATCHES = ['#3b82f6', '#ec4899', '#22c55e', '#d97706', '#a855f7', '#ef4444', '#14b8a6', '#78716c'];

interface DialogForm {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string;
  color: string;
  category: string;
  calendarId: string;
}

const emptyForm: DialogForm = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  allDay: false,
  location: '',
  color: '',
  category: '',
  calendarId: '',
};

/**
 * Add one hour to a 'YYYY-MM-DDTHH:mm' string (local time), returning the
 * same 'YYYY-MM-DDTHH:mm' shape. Used to default the end time on new events.
 */
function addHourLocal(dt: string): string {
  const d = new Date(`${dt}:00`);
  d.setHours(d.getHours() + 1);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

export function EventDialog({ open, onClose, onSuccess, editEvent, prefillDate, calendars }: EventDialogProps) {
  const [form, setForm] = useState<DialogForm>(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setForm({
        title: editEvent.title,
        description: editEvent.description || '',
        startDate: toDatetimeLocal(editEvent.startDate),
        endDate: editEvent.endDate ? toDatetimeLocal(editEvent.endDate) : '',
        allDay: editEvent.allDay,
        location: editEvent.location || '',
        color: editEvent.color || '',
        category: editEvent.category || '',
        calendarId: editEvent.calendarId || '',
      });
    } else {
      // prefillDate is either 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'.
      if (prefillDate) {
        if (prefillDate.includes('T')) {
          // Exact time given → start at that time, end +1h.
          setForm({ ...emptyForm, startDate: prefillDate, endDate: addHourLocal(prefillDate) });
        } else {
          // Date only → default to 09:00.
          setForm({ ...emptyForm, startDate: `${prefillDate}T09:00` });
        }
      } else {
        setForm(emptyForm);
      }
    }
    setError('');
  }, [open, editEvent, prefillDate]);

  const set = <K extends keyof DialogForm>(key: K, value: DialogForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectedCalendar = calendars.find((c) => c.id === form.calendarId) ?? null;
  const defaultColor = selectedCalendar?.color ?? '';
  const effectiveColor = form.color || defaultColor;

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        startDate: form.allDay ? `${form.startDate.slice(0, 10)}T00:00:00` : `${form.startDate}:00`,
        endDate: form.endDate
          ? form.allDay
            ? `${form.endDate.slice(0, 10)}T23:59:00`
            : `${form.endDate}:00`
          : undefined,
        allDay: form.allDay,
        location: form.location || undefined,
        color: form.color || undefined,
        category: form.category || undefined,
        calendarId: form.calendarId || undefined,
      };
      if (editEvent) {
        return api.put<CalendarEvent>(`/calendar/events/${editEvent.id}`, body);
      }
      return api.post<CalendarEvent>('/calendar/events', body);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setError('');
      onSuccess();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{editEvent ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg" aria-label="Schließen">
            <X className="h-5 w-5" />
          </button>
        </div>

        {editEvent?.calendarSource === 'google' && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Dieser Termin wird mit Google Kalender synchronisiert.</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-fg-muted mb-1">Titel *</label>
            <input
              className="input-field w-full"
              placeholder="z.B. Zahnarzt"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-fg-muted mb-1">Kalender</label>
            <select
              className="input-field w-full text-sm"
              value={form.calendarId}
              onChange={(e) => set('calendarId', e.target.value)}
            >
              <option value="">Mein Kalender</option>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={form.allDay}
              onChange={(e) => set('allDay', e.target.checked)}
              className="accent-cal-500"
            />
            <label htmlFor="allDay" className="text-sm">
              Ganztägig
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-fg-muted mb-1">Start *</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                className="input-field w-full text-sm"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-fg-muted mb-1">Ende</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                className="input-field w-full text-sm"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-fg-muted mb-1">Ort</label>
            <input
              className="input-field w-full"
              placeholder="Optional"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-fg-muted mb-1">Beschreibung</label>
            <textarea
              className="input-field w-full min-h-[60px] resize-y"
              placeholder="Optional"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-fg-muted mb-1">Kategorie</label>
              <select
                className="input-field w-full text-sm"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Keine</option>
                <option value="birthday">Geburtstag</option>
                <option value="holiday">Urlaub</option>
                <option value="appointment">Termin</option>
                <option value="reminder">Erinnerung</option>
                <option value="task">Aufgabe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-fg-muted mb-1">Farbe</label>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => set('color', form.color === c ? '' : c)}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      effectiveColor === c ? 'border-fg ring-2 ring-cal-500' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <p className="mt-1 text-[11px] text-fg-subtle">
                {defaultColor ? 'Kalenderfarbe als Standard aktiv' : 'Ohne Auswahl: Kalenderfarbe'}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-bg-raised transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!form.title || !form.startDate || mutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-cal-500 px-4 py-2 text-sm font-medium text-bg hover:bg-cal-400 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editEvent ? 'Speichern' : 'Termin anlegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
