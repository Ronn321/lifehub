'use client';

import { cn } from '@/lib/cn';
import {
  HOURS,
  eventSpan,
  eventsOnDay,
  getEventColor,
  todayIso,
  type CalendarEvent,
  type CalendarItem,
  type WeekDay,
} from '@/lib/calendar';

interface WeekViewProps {
  days: WeekDay[];
  events: CalendarEvent[];
  calendarsMap?: Record<string, CalendarItem> | null;
  onEventClick: (ev: CalendarEvent) => void;
}

const HOUR_PX = 48;

function nowLineTop(): number {
  const n = new Date();
  return (n.getHours() + n.getMinutes() / 60) * HOUR_PX;
}

export function WeekView({ days, events, calendarsMap, onEventClick }: WeekViewProps) {
  const today = todayIso();
  const allDayOn = (date: string) => eventsOnDay(events, date).filter((e) => e.allDay);
  const timedOn = (date: string) => eventsOnDay(events, date).filter((e) => !e.allDay);

  return (
    <div className="rounded-xl border border-border bg-bg-surface/80 backdrop-blur-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-border">
        <div />
        {days.map((d) => {
          const isToday = d.date === today;
          return (
            <div key={d.date} className={cn('py-2 text-center text-sm font-medium', isToday && 'text-cal-500')}>
              {d.label}
              <span
                className={cn(
                  'mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full text-lg',
                  isToday ? 'bg-cal-500 text-bg' : '',
                )}
              >
                {d.dayNum}
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-auto" style={{ height: 'calc(100vh - 300px)' }}>
        {/* All-day row */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-border">
          <div className="py-1 pr-2 text-right text-[10px] text-fg-subtle">Ganztägig</div>
          {days.map((d) => (
            <div key={d.date} className="min-h-6 border-l border-border p-0.5">
              {allDayOn(d.date).map((ev) => {
                const color = getEventColor(ev, calendarsMap);
                return (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="mb-0.5 block w-full truncate rounded px-1 text-left text-[11px] font-medium leading-tight hover:shadow-sm transition-shadow"
                    style={{ backgroundColor: `${color}1F`, borderLeft: `2px solid ${color}`, color }}
                    title={ev.title}
                  >
                    {ev.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-[3.5rem_repeat(7,1fr)]">
          {days.map((d) => (
            <div key={d.date} className="relative h-[1152px] border-l border-border">
              {timedOn(d.date).map((ev) => {
                const span = eventSpan(ev, d.date, HOUR_PX)!;
                const color = getEventColor(ev, calendarsMap);
                return (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="absolute inset-x-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium"
                    style={{ top: span.top, height: span.height, backgroundColor: color, opacity: 0.85 }}
                    title={ev.title}
                  >
                    {ev.title}
                  </button>
                );
              })}
            </div>
          ))}
          {/* Hour lines + labels */}
          {HOURS.map((h) => (
            <div key={h} className="absolute left-0 right-0 border-t border-border/60" style={{ top: h * HOUR_PX }}>
              <span className="absolute -top-2 left-1 text-[10px] text-fg-subtle">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
          {/* Now line */}
          <div
            className="absolute left-0 right-0 z-10 border-t-2 border-cal-500"
            style={{ top: nowLineTop() }}
          />
        </div>
      </div>
    </div>
  );
}
