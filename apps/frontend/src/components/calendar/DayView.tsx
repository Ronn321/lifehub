'use client';

import { cn } from '@/lib/cn';
import {
  HOURS,
  eventSpan,
  eventsOnDay,
  formatTime,
  getEventColor,
  todayIso,
  type CalendarEvent,
  type CalendarItem,
} from '@/lib/calendar';

interface DayViewProps {
  day: string;
  events: CalendarEvent[];
  calendarsMap?: Record<string, CalendarItem> | null;
  onEventClick: (ev: CalendarEvent) => void;
  onNew: () => void;
}

const HOUR_PX = 48;

export function DayView({ day, events, calendarsMap, onEventClick, onNew }: DayViewProps) {
  const isToday = day === todayIso();
  const allDay = eventsOnDay(events, day).filter((e) => e.allDay);
  const timed = eventsOnDay(events, day).filter((e) => !e.allDay);
  const nowTop = isToday
    ? (() => {
        const n = new Date();
        return (n.getHours() + n.getMinutes() / 60) * HOUR_PX;
      })()
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-bg-surface/80 backdrop-blur-sm overflow-hidden">
        {/* All-day row */}
        {allDay.length > 0 && (
          <div className="border-b border-border">
            {allDay.map((ev) => {
              const color = getEventColor(ev, calendarsMap);
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="mx-1 mb-1 mt-1 block w-[calc(100%-0.5rem)] truncate rounded px-2 py-0.5 text-left text-xs font-medium hover:shadow-sm transition-shadow"
                  style={{ backgroundColor: `${color}1F`, borderLeft: `2px solid ${color}`, color }}
                  title={ev.title}
                >
                  {ev.title}
                </button>
              );
            })}
          </div>
        )}
        {/* Single-column time grid */}
        <div className="relative">
          <div className="relative ml-16 h-[1152px]">
            {timed.map((ev) => {
              const span = eventSpan(ev, day, HOUR_PX)!;
              const color = getEventColor(ev, calendarsMap);
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="absolute inset-x-0.5 overflow-hidden rounded-md px-2 py-1 text-left text-xs font-medium"
                  style={{ top: span.top, height: span.height, backgroundColor: color, opacity: 0.85 }}
                  title={ev.title}
                >
                  {ev.title}
                </button>
              );
            })}
            {HOURS.map((h) => (
              <div key={h} className="absolute left-0 right-0 border-t border-border/60" style={{ top: h * HOUR_PX }}>
                <span className="absolute -left-16 -top-2 w-14 text-right text-[10px] text-fg-subtle">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
            {nowTop !== null && <div className="absolute left-0 right-0 z-10 border-t-2 border-cal-500" style={{ top: nowTop }} />}
          </div>
        </div>
      </div>

      {/* Agenda des Tages */}
      <div className="rounded-xl border border-border bg-bg-surface/80 backdrop-blur-sm p-4">
        <h3 className="mb-2 text-sm font-semibold">Agenda des Tages</h3>
        {timed.length === 0 && allDay.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-fg-muted">Keine Termine an diesem Tag.</p>
            <button onClick={onNew} className="mt-3 rounded-lg bg-cal-500 px-4 py-2 text-sm font-medium text-bg hover:bg-cal-400">
              Neuer Termin
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {[...allDay, ...timed].map((ev) => {
              const color = getEventColor(ev, calendarsMap);
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg p-3 text-left hover:bg-bg-raised transition-colors"
                >
                  <div className="h-9 w-1 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-fg-muted">
                      {ev.allDay
                        ? 'Ganztägig'
                        : `${formatTime(ev.startDate)}${ev.endDate ? ' – ' + formatTime(ev.endDate) : ''}`}
                      {ev.location ? ' · ' + ev.location : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
