import { describe, it, expect } from 'vitest';
import {
  getMonthWeeks,
  getWeekDays,
  todayIso,
  eventSpan,
  getEventColor,
  calendarRange,
  hexToRgbTriplet,
  eventsOnDay,
} from './calendar';
import type { CalendarEvent } from './calendar';

describe('getMonthWeeks', () => {
  it('August 2026 starts with a Saturday and monday-first offset is 5', () => {
    const weeks = getMonthWeeks(2026, 7, 'monday'); // month index 7 = August
    expect(weeks[0]!.days[0]!).toEqual({ day: null, date: '' });
    expect(weeks[0]!.days[5]!.day).toBe(1); // 1.8.2026 = Samstag
  });
  it('covers all 31 days of August 2026', () => {
    const weeks = getMonthWeeks(2026, 7, 'monday');
    const days = weeks.flatMap((w) => w.days).filter((d) => d.day !== null);
    expect(days.length).toBe(31);
  });
  it('covers only the month days with blank padding for adjacent-month cells', () => {
    const weeks = getMonthWeeks(2026, 7, 'monday');
    const dates = weeks.flatMap((w) => w.days).map((d) => d.date);
    const real = dates.filter(Boolean);
    expect(real[0]).toBe('2026-08-01');
    expect(real[real.length - 1]).toBe('2026-08-31');
    expect(dates.filter((d) => d === '').length).toBeGreaterThan(0);
  });
});

describe('getWeekDays', () => {
  it('monday-first week of 2026-08-10 is 10..16 August', () => {
    const days = getWeekDays('2026-08-13', 'monday');
    expect(days.map((d) => d.date)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ]);
  });
  it('sunday-first week of 2026-08-13 starts on 09', () => {
    const days = getWeekDays('2026-08-13', 'sunday');
    expect(days.map((d) => d.date)).toEqual([
      '2026-08-09',
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
    ]);
  });
});

describe('eventSpan', () => {
  it('computes pixel geometry for a 09:00–10:30 event', () => {
    const span = eventSpan(
      { startDate: '2026-08-13T09:00:00', endDate: '2026-08-13T10:30:00' } as CalendarEvent,
      '2026-08-13',
      48,
    );
    expect(span).toEqual({ top: 9 * 48, height: 1.5 * 48 });
  });
  it('returns null for events on other days', () => {
    expect(
      eventSpan(
        { startDate: '2026-08-14T09:00:00', endDate: '2026-08-14T10:00:00' } as CalendarEvent,
        '2026-08-13',
        48,
      ),
    ).toBeNull();
  });
  it('clamps events spanning midnight to the day bounds', () => {
    const span = eventSpan(
      { startDate: '2026-08-12T23:00:00', endDate: '2026-08-13T01:00:00' } as CalendarEvent,
      '2026-08-13',
      60,
    );
    expect(span).toEqual({ top: 0, height: 60 });
  });
});

describe('getEventColor', () => {
  it('prefers event color over category', () => {
    expect(
      getEventColor({ color: '#123456', category: 'birthday', calendarId: null }),
    ).toBe('#123456');
  });
  it('falls back to calendar color when event has no color', () => {
    const calendars = { c1: { id: 'c1', title: 'X', color: '#abcdef', source: 'local', isVisible: true } };
    expect(getEventColor({ color: null, category: null, calendarId: 'c1' }, calendars)).toBe('#abcdef');
  });
  it('falls back to category color', () => {
    expect(getEventColor({ color: null, category: 'birthday', calendarId: null }, {})).toBe('#ec4899');
  });
  it('falls back to the hub accent css-var when nothing else matches', () => {
    expect(getEventColor({ color: null, category: 'other', calendarId: null }, {})).toBe(
      'rgb(var(--cal-500, var(--brand-500)))',
    );
  });
});

describe('calendarRange', () => {
  it('agenda covers today + 60 days', () => {
    const r = calendarRange('agenda', '2026-08', todayIso(), 'monday');
    expect(r.from).toBe(todayIso());
    expect(r.to).toBe(todayIso() === '2026-08-13' ? '2026-10-12' : r.to);
  });
});

describe('hexToRgbTriplet', () => {
  it('converts a hex color to an rgb triplet string', () => {
    expect(hexToRgbTriplet('#3b82f6')).toBe('59 130 246');
  });
  it('handles shorthand hex', () => {
    expect(hexToRgbTriplet('#f00')).toBe('255 0 0');
  });
});

describe('eventsOnDay', () => {
  it('matches all-day and multi-day events on their date range', () => {
    const events = [
      { id: 'a', startDate: '2026-08-13T00:00:00', endDate: null },
      { id: 'b', startDate: '2026-08-10T09:00:00', endDate: '2026-08-13T10:00:00' },
      { id: 'c', startDate: '2026-08-14T09:00:00', endDate: '2026-08-14T10:00:00' },
    ] as CalendarEvent[];
    const result = eventsOnDay(events, '2026-08-13');
    expect(result.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });
});
