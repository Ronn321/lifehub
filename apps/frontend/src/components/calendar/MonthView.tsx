'use client';

import { cn } from '@/lib/cn';
import {
  chipStyle,
  eventsOnDay,
  formatTime,
  getEventColor,
  todayIso,
  type CalendarEvent,
  type CalendarItem,
  type DayCell,
  type WeekStart,
} from '@/lib/calendar';

interface MonthViewProps {
  weeks: { wn: number; days: DayCell[] }[];
  events: CalendarEvent[];
  weekStart: WeekStart;
  showWeekNumbers: boolean;
  calendarsMap?: Record<string, CalendarItem> | null;
  onEventClick: (ev: CalendarEvent) => void;
  onCellClick: (date: string) => void;
  onCellDoubleClick: (date: string) => void;
}

const SUNDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MAX_CHIPS = 3;

export function MonthView({
  weeks,
  events,
  weekStart,
  showWeekNumbers,
  calendarsMap,
  onEventClick,
  onCellClick,
  onCellDoubleClick,
}: MonthViewProps) {
  const labels = weekStart === 'sunday' ? SUNDAY_LABELS : MONDAY_LABELS;
  const today = todayIso();
  const cols = showWeekNumbers ? 'grid-cols-[2.5rem_repeat(7,_1fr)]' : 'grid-cols-7';

  return (
    <div className="rounded-xl border border-border bg-bg-surface/80 backdrop-blur-sm overflow-hidden">
      <div className={cn('grid border-b border-border text-center text-sm font-medium text-fg-muted', cols)}>
        {showWeekNumbers && <div className="py-2 text-[10px] text-fg-subtle">KW</div>}
        {labels.map((l) => (
          <div key={l} className="py-2">
            {l}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className={cn('grid border-b border-border last:border-b-0', cols)}>
          {showWeekNumbers && (
            <div className="flex items-center justify-center border-r border-border">
              <span className="text-[11px] text-fg-subtle">{week.wn}</span>
            </div>
          )}
          {week.days.map((cell, di) => {
            if (cell.day === null) {
              return <div key={di} className="min-h-[92px] bg-bg-raised/30" />;
            }
            const dayEvents = eventsOnDay(events, cell.date);
            const visible = dayEvents.slice(0, MAX_CHIPS);
            const extra = dayEvents.length - visible.length;
            const isToday = cell.date === today;
            return (
              <div
                key={di}
                onDoubleClick={() => onCellDoubleClick(cell.date)}
                onClick={() => onCellClick(cell.date)}
                className="min-h-[92px] cursor-pointer border-l border-border first:border-l-0 p-1 align-top hover:bg-bg-raised/50 transition-colors"
              >
                <div className="flex justify-center">
                  <span
                    className={cn(
                      'grid h-7 w-7 place-items-center rounded-full text-sm font-medium',
                      isToday && 'bg-cal-500 text-bg font-bold',
                    )}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {visible.map((ev) => {
                    const color = getEventColor(ev, calendarsMap);
                    const style = chipStyle(color);
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(ev);
                        }}
                        className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight hover:shadow-sm transition-shadow"
                        style={{ backgroundColor: style.backgroundColor, borderLeft: style.borderLeft, color }}
                        title={ev.title}
                      >
                        {!ev.allDay && <span className="font-normal opacity-70">{formatTime(ev.startDate)} </span>}
                        {ev.title}
                      </button>
                    );
                  })}
                  {extra > 0 && (
                    <div className="px-1.5 text-[11px] text-fg-muted font-medium">
                      +{extra} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
