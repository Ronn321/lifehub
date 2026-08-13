'use client';

// Shared calendar date utilities, types and color helpers.
// Used by the calendar views, dialogs, settings panel and page orchestrator.
// UI text stays German; code comments stay English.

import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export type WeekStart = 'monday' | 'sunday';

export interface CalendarEvent {
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
  calendarId?: string | null;
  ownerId: string;
}

export interface CalendarUserSettings {
  accentColor: string | null; // hex, null = Hub brand accent
  backgroundUrl: string | null;
  backgroundOverlay: number; // 0.5 .. 0.95
  backgroundBlur: number; // 0 .. 24 px
  defaultView: CalendarView;
  weekStart: WeekStart;
  showWeekNumbers: boolean;
}

export interface CalendarItem {
  id: string;
  title: string;
  color: string | null;
  source: string;
  isVisible: boolean;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  color: string | null;
  primary: boolean;
  selected: boolean;
}

export interface GoogleStatus {
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
}

export interface DayCell {
  day: number | null;
  date: string;
}

export interface WeekDay {
  date: string;
  dayNum: number;
  label: string;
}

// ─── Constants ─────────────────────────────────────────────────────────

export const HOURS = Array.from({ length: 24 }, (_, h) => h);

export const CATEGORY_COLORS: Record<string, string> = {
  birthday: '#ec4899',
  holiday: '#22c55e',
  appointment: '#f59e0b',
  reminder: '#a855f7',
  task: '#78716c',
};

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  birthday: 'Geburtstag',
  holiday: 'Urlaub',
  appointment: 'Termin',
  reminder: 'Erinnerung',
  task: 'Aufgabe',
};

/** Background image presets for the settings panel. */
export const BACKGROUND_PRESETS: { key: string; label: string; url: string | null }[] = [
  { key: 'none', label: 'Keines', url: null },
  {
    key: 'soft',
    label: 'Sanft',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80',
  },
  {
    key: 'night',
    label: 'Nacht',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
  },
  {
    key: 'forest',
    label: 'Wald',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80',
  },
];

// ─── Date helpers (local-timezone safe) ─────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date as a local 'YYYY-MM-DD' string (no UTC offset pitfalls). */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a 'YYYY-MM-DD' string as a local midnight Date. */
export function parseLocal(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Today's date as local 'YYYY-MM-DD'. */
export function todayIso(): string {
  return toIso(new Date());
}

/** Add n days to an 'YYYY-MM-DD' string (negative n goes backwards). */
export function addDays(iso: string, n: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Shift a 'YYYY-MM' string by delta months, clamping the day. */
export function shiftMonth(monthStr: string, delta: number): string {
  const [ys, ms] = monthStr.split('-');
  const d = new Date(Number(ys), Number(ms) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** ISO week number (Monday-based). */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** Weeks of a month as 7-cell rows, padded with nulls and empty dates. */
export function getMonthWeeks(
  year: number,
  monthIndex: number,
  weekStart: WeekStart,
): { wn: number; days: DayCell[] }[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = first.getDay();
  const offset = weekStart === 'sunday' ? startOffset : startOffset === 0 ? 6 : startOffset - 1;

  const weeks: { wn: number; days: DayCell[] }[] = [];
  let currentWeek: DayCell[] = [];
  for (let i = 0; i < offset; i++) currentWeek.push({ day: null, date: '' });

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    currentWeek.push({ day: dayNum, date: toIso(new Date(year, monthIndex, dayNum)) });
    if (currentWeek.length === 7) {
      const firstReal = currentWeek.find((c) => c.day !== null);
      const wn = firstReal ? getWeekNumber(new Date(year, monthIndex, firstReal.day!)) : 0;
      weeks.push({ wn, days: currentWeek });
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ day: null, date: '' });
    const firstReal = currentWeek.find((c) => c.day !== null);
    const wn = firstReal ? getWeekNumber(new Date(year, monthIndex, firstReal.day!)) : 0;
    weeks.push({ wn, days: currentWeek });
  }
  return weeks;
}

/** The 7 days (with weekday labels) of the week containing isoDate. */
export function getWeekDays(isoDate: string, weekStart: WeekStart): WeekDay[] {
  const d = parseLocal(isoDate);
  const dow = d.getDay();
  const offset = weekStart === 'sunday' ? dow : dow === 0 ? 6 : dow - 1;
  const start = addDays(isoDate, -offset);
  const fmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, dayNum: parseLocal(date).getDate(), label: fmt.format(parseLocal(date)) };
  });
}

/** Hook holding a 'YYYY-MM' month string, initialised to the current month. */
export function useCurrentMonth(): [string, (m: string) => void] {
  return useState(todayIso().slice(0, 7));
}

// ─── Formatting ─────────────────────────────────────────────────────────

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDayLong(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Convert an ISO datetime into a value usable by <input type="datetime-local">. */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Event geometry & color ─────────────────────────────────────────────

/** Pixel span of a timed event within a day column. */
export function eventSpan(
  ev: Pick<CalendarEvent, 'startDate' | 'endDate'>,
  dayIso: string,
  hourPx: number,
): { top: number; height: number } | null {
  const dayStart = parseLocal(dayIso);
  const dayEnd = new Date(`${dayIso}T23:59:59`);
  const start = new Date(ev.startDate);
  const end = ev.endDate ? new Date(ev.endDate) : new Date(ev.startDate);
  if (end < dayStart || start > dayEnd) return null;
  const clampedStart = start < dayStart ? dayStart : start;
  const clampedEnd = end > dayEnd ? dayEnd : end;
  const minutesOfDay = (x: Date) => x.getHours() * 60 + x.getMinutes() + x.getSeconds() / 60;
  const top = (minutesOfDay(clampedStart) / 60) * hourPx;
  const height = Math.max(((minutesOfDay(clampedEnd) - minutesOfDay(clampedStart)) / 60) * hourPx, 20);
  return { top, height };
}

/**
 * Resolve an event's display color with fallback chain:
 * event.color → calendar.color → category color → hub accent (cal-500).
 */
export function getEventColor(
  ev: Pick<CalendarEvent, 'color' | 'category' | 'calendarId'>,
  calendarsMap?: Record<string, CalendarItem> | null,
): string {
  if (ev.color) return ev.color;
  if (calendarsMap && ev.calendarId) {
    const cal = calendarsMap[ev.calendarId];
    if (cal?.color) return cal.color;
  }
  if (ev.category && CATEGORY_COLORS[ev.category]) return CATEGORY_COLORS[ev.category]!;
  return 'rgb(var(--cal-500, var(--brand-500)))';
}

/** Style background + left border for a Google-style chip, handling hex vs css-var colors. */
export function chipStyle(color: string): { backgroundColor: string; borderLeft: string } {
  if (color.startsWith('#')) {
    return { backgroundColor: `${color}1F`, borderLeft: `2px solid ${color}` };
  }
  // CSS variable form (brand/cal accent): cannot append an alpha suffix.
  return { backgroundColor: color, borderLeft: `2px solid ${color}` };
}

/** Convert a '#rrggbb' hex string into an 'r g b' CSS-triplet string. */
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Events whose date range overlaps the given day. */
export function eventsOnDay(events: CalendarEvent[] | undefined, dateStr: string): CalendarEvent[] {
  return (events ?? []).filter((e) => {
    const s = e.startDate.slice(0, 10);
    const en = e.endDate ? e.endDate.slice(0, 10) : s;
    return dateStr >= s && dateStr <= en;
  });
}

/** Build the date range to fetch for a given view. */
export function calendarRange(
  view: CalendarView,
  monthStr: string,
  selectedDay: string,
  weekStart: WeekStart,
): { from: string; to: string } {
  if (view === 'month') {
    const [ys, ms] = monthStr.split('-');
    const cells = getMonthWeeks(Number(ys), Number(ms) - 1, weekStart)
      .flatMap((w) => w.days)
      .filter((d) => d.date);
    return { from: cells[0]?.date ?? selectedDay, to: cells[cells.length - 1]?.date ?? selectedDay };
  }
  if (view === 'week') {
    const days = getWeekDays(selectedDay, weekStart);
    return { from: days[0]!.date, to: days[6]!.date };
  }
  if (view === 'day') return { from: selectedDay, to: selectedDay };
  return { from: todayIso(), to: addDays(todayIso(), 60) };
}
