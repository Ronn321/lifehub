'use client';

import { useEffect, useRef } from 'react';
import {
  HOURS,
  eventSpan,
  eventsOnDay,
  formatTime,
  getEventColor,
  minutesToTimeStr,
  slotFromPoint,
  timeStrToMinutes,
  todayIso,
  type CalendarEvent,
  type CalendarItem,
  type CalendarSlot,
} from '@/lib/calendar';

interface DayViewProps {
  day: string;
  events: CalendarEvent[];
  calendarsMap?: Record<string, CalendarItem> | null;
  onEventClick: (ev: CalendarEvent) => void;
  onNew: () => void;
  selectedSlot?: CalendarSlot | null;
  onSlotSelect: (slot: CalendarSlot) => void;
  onSlotDoubleClick: (slot: CalendarSlot) => void;
}

const HOUR_PX = 48;
const SLOT_PX = 24; // 30 minutes at 48px/h
const START_HOUR = 7; // initial scroll position (07:00)

export function DayView({
  day,
  events,
  calendarsMap,
  onEventClick,
  onNew,
  selectedSlot,
  onSlotSelect,
  onSlotDoubleClick,
}: DayViewProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const isToday = day === todayIso();
  const allDay = eventsOnDay(events, day).filter((e) => e.allDay);
  const timed = eventsOnDay(events, day).filter((e) => !e.allDay);
  const nowTop = isToday
    ? (() => {
        const n = new Date();
        return (n.getHours() + n.getMinutes() / 60) * HOUR_PX;
      })()
    : null;

  // Start the time grid at 07:00 on mount and whenever the day changes.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const grid = gridRef.current;
    if (!scroller || !grid) return;
    const gridTopInScroller = grid.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTop = gridTopInScroller + START_HOUR * HOUR_PX;
  }, [day]);

  // Derive the clicked 30-minute slot from a mouse event on the day column.
  function slotFromEvent(e: React.MouseEvent<HTMLDivElement>): CalendarSlot {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const { startMinutes } = slotFromPoint(y, HOUR_PX);
    return { date: day, start: minutesToTimeStr(startMinutes) };
  }

  const slotTop = selectedSlot?.date === day ? (timeStrToMinutes(selectedSlot.start) / 60) * HOUR_PX : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-bg-surface/80 backdrop-blur-sm overflow-hidden">
        {/* Scroll container — identical height/overflow to WeekView */}
        <div ref={scrollerRef} className="overflow-auto" style={{ height: 'calc(100vh - 300px)' }}>
          {/* All-day row */}
          {allDay.length > 0 && (
            <div className="border-b border-border">
              {allDay.map((ev) => {
                const color = getEventColor(ev, calendarsMap);
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
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
          <div
            ref={gridRef}
            className="relative ml-16 h-[1152px]"
            onClick={(e) => onSlotSelect(slotFromEvent(e))}
            onDoubleClick={(e) => onSlotDoubleClick(slotFromEvent(e))}
          >
            {timed.map((ev) => {
              const span = eventSpan(ev, day, HOUR_PX)!;
              const color = getEventColor(ev, calendarsMap);
              return (
                <button
                  key={ev.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
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
            {/* Selected 30-min slot highlight */}
            {slotTop !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 rounded bg-cal-500/10 ring-1 ring-inset ring-cal-500/40"
                style={{ top: slotTop, height: SLOT_PX }}
              />
            )}
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
