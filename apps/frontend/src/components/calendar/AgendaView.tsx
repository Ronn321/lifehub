'use client';

import { cn } from '@/lib/cn';
import {
  formatTime,
  getEventColor,
  todayIso,
  type CalendarEvent,
  type CalendarItem,
} from '@/lib/calendar';

interface AgendaViewProps {
  events: CalendarEvent[];
  calendarsMap?: Record<string, CalendarItem> | null;
  onEventClick: (ev: CalendarEvent) => void;
  onNew: () => void;
}

export function AgendaView({ events, calendarsMap, onEventClick, onNew }: AgendaViewProps) {
  const today = todayIso();
  const upcoming = (events ?? [])
    .filter((e) => e.startDate.slice(0, 10) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const grouped = new Map<string, CalendarEvent[]>();
  for (const ev of upcoming) {
    const day = ev.startDate.slice(0, 10);
    grouped.set(day, [...(grouped.get(day) ?? []), ev]);
  }

  if (grouped.size === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-surface/80 py-20 text-center">
        <p className="text-fg-muted">Keine anstehenden Termine.</p>
        <button onClick={onNew} className="mt-3 rounded-lg bg-cal-500 px-4 py-2 text-sm font-medium text-bg hover:bg-cal-400">
          Termin anlegen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([day, evs]) => (
        <div key={day}>
          <h3
            className={cn(
              'mb-2 text-sm font-semibold',
              day === today && 'text-cal-500',
            )}
          >
            {new Date(`${day}T12:00:00`).toLocaleDateString('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          <div className="space-y-1.5">
            {evs.map((ev) => {
              const color = getEventColor(ev, calendarsMap);
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-surface/80 p-3 text-left hover:bg-bg-raised transition-colors"
                >
                  <div className="h-9 w-1 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-fg-muted">
                      {ev.allDay ? 'Ganztägig' : `${formatTime(ev.startDate)}${ev.endDate ? ' – ' + formatTime(ev.endDate) : ''}`}
                      {ev.location ? ' · ' + ev.location : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
