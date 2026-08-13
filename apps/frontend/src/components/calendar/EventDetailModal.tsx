'use client';

import { Pencil, Trash2, X } from 'lucide-react';
import {
  formatDate,
  formatTime,
  getEventColor,
  type CalendarEvent,
  type CalendarItem,
} from '@/lib/calendar';

interface EventDetailModalProps {
  event: CalendarEvent;
  calendars: CalendarItem[];
  onClose: () => void;
  onEdit: (ev: CalendarEvent) => void;
  onDelete: (ev: CalendarEvent) => void;
}

export function EventDetailModal({ event, calendars, onClose, onEdit, onDelete }: EventDetailModalProps) {
  const calendar = calendars.find((c) => c.id === event.calendarId) ?? null;
  const color = getEventColor(event, calendars.length ? Object.fromEntries(calendars.map((c) => [c.id, c])) : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md p-5 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <h3 className="text-lg font-semibold truncate">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg" aria-label="Schließen">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            {event.allDay
              ? formatDate(event.startDate) + (event.endDate ? ` – ${formatDate(event.endDate)}` : '')
              : formatTime(event.startDate) + (event.endDate ? ` – ${formatTime(event.endDate)}` : '')}
          </p>
          {event.location && <p>📍 {event.location}</p>}
          {event.description && <p className="text-fg-muted whitespace-pre-wrap">{event.description}</p>}
          {calendar && (
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-fg-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: calendar.color ?? color }} />
                {calendar.title}
              </span>
              {event.calendarSource === 'google' && (
                <span className="text-xs text-fg-subtle">· mit Google synchronisiert</span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onEdit(event)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-bg-raised transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Bearbeiten
          </button>
          <button
            onClick={() => onDelete(event)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
