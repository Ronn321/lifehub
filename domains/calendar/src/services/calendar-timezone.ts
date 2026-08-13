// Europe/Berlin timezone conversion helpers for the Google Calendar sync.
// The backend stores local naive timestamps (YYYY-MM-DDTHH:mm:00) and converts
// to/from Google's offset-based ISO strings, always in Europe/Berlin.

const TZ = 'Europe/Berlin';

/** Seconds offset from UTC for a given instant in Europe/Berlin (DST-aware). */
function berlinOffsetSec(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = tz.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2]!, 10) * 3600 + parseInt(m[3]!, 10) * 60);
}

/**
 * Google (offset ISO, e.g. 2026-08-13T09:00:00+02:00) -> naive local
 * (YYYY-MM-DDTHH:mm:00) in Europe/Berlin. NOT UTC-based.
 */
export function googleToLocal(isoOffset: string): string {
  const d = new Date(isoOffset);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Naive local (YYYY-MM-DDTHH:mm:00, interpreted as Europe/Berlin) -> offset ISO
 * (YYYY-MM-DDTHH:mm:00+02:00 / +01:00 depending on DST). The naive value is
 * treated as Berlin wall-clock time; the offset is derived by resolving it.
 */
export function localToOffsetIso(s: string): string {
  const asUtc = new Date(`${s}Z`); // first guess: naive as UTC
  // Iterate to converge on the correct DST offset (naive -> instant -> offset).
  let inst = asUtc;
  for (let i = 0; i < 3; i++) {
    const off = berlinOffsetSec(inst);
    inst = new Date(asUtc.getTime() - off * 1000);
  }
  const off = berlinOffsetSec(inst);
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `${s}${sign}${hh}:${mm}`;
}

/**
 * Format a naive Berlin local timestamp as a Google date (all-day) YYYY-MM-DD.
 */
export function localDateForAllDay(naive: string): string {
  return naive.slice(0, 10);
}

/**
 * Format an absolute Date (instant) as naive Berlin local YYYY-MM-DDTHH:mm:00.
 */
export function dateToLocalNaive(d: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}
