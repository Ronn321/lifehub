import { describe, expect, it } from 'vitest';
import { googleToLocal, localToOffsetIso } from './calendar-timezone';

describe('calendar-timezone', () => {
  describe('googleToLocal (offset ISO -> naive Berlin local)', () => {
    it('converts summer offset +02:00 to the same wall-clock time', () => {
      expect(googleToLocal('2026-08-13T09:00:00+02:00')).toBe('2026-08-13T09:00:00');
    });

    it('converts winter offset +01:00 to the same wall-clock time', () => {
      expect(googleToLocal('2026-01-13T09:00:00+01:00')).toBe('2026-01-13T09:00:00');
    });

    it('converts a UTC instant to Berlin local (adds +02:00 in summer)', () => {
      expect(googleToLocal('2026-08-13T07:00:00Z')).toBe('2026-08-13T09:00:00');
    });
  });

  describe('localToOffsetIso (naive Berlin -> offset ISO)', () => {
    it('appends +02:00 in summer (DST)', () => {
      expect(localToOffsetIso('2026-08-13T09:00:00')).toMatch(/\+02:00$/);
    });

    it('appends +01:00 in winter', () => {
      expect(localToOffsetIso('2026-01-13T09:00:00')).toMatch(/\+01:00$/);
    });
  });

  describe('roundtrip', () => {
    it('survives summer and winter roundtrips', () => {
      const summer = '2026-08-13T09:00:00';
      const winter = '2026-01-13T09:00:00';
      expect(googleToLocal(localToOffsetIso(summer))).toBe(summer);
      expect(googleToLocal(localToOffsetIso(winter))).toBe(winter);
    });
  });
});
