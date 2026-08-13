import { describe, expect, it, vi } from 'vitest';
import { CalendarSettingsRepository } from '../repositories/calendar-settings.repository';
import type { Db } from '@lifehub/db';

vi.mock('@lifehub/db', () => ({
  DbService: class DbService {},
  calendarUserSettings: { ownerId: {} },
  Db: {},
}));

/** Minimal fake DbService exposing a stub `db` (drizzle client). */
function makeRepo(db: Partial<Record<keyof Db, unknown>>) {
  return new CalendarSettingsRepository({ db } as never);
}

describe('CalendarSettingsRepository', () => {
  it('returns defaults when no row exists', async () => {
    const db = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    };
    const repo = makeRepo(db);

    const settings = await repo.getSettings('owner-1');

    expect(settings).toEqual({
      ownerId: 'owner-1',
      accentColor: null,
      backgroundUrl: null,
      backgroundOverlay: 0.85,
      backgroundBlur: 12,
      defaultView: 'month',
      weekStart: 'monday',
      showWeekNumbers: true,
    });
  });

  it('returns the stored row mapped to CalendarUserSettings', async () => {
    const stored = {
      accentColor: '#ff0000',
      backgroundUrl: null,
      backgroundOverlay: 0.9,
      backgroundBlur: 8,
      defaultView: 'week',
      weekStart: 'sunday',
      showWeekNumbers: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const db = {
      select: () => ({ from: () => ({ where: () => Promise.resolve([stored]) }) }),
    };
    const repo = makeRepo(db);

    const settings = await repo.getSettings('owner-1');

    expect(settings.ownerId).toBe('owner-1');
    expect(settings.accentColor).toBe('#ff0000');
    expect(settings.defaultView).toBe('week');
    expect(settings.weekStart).toBe('sunday');
    expect(settings.showWeekNumbers).toBe(false);
  });

  it('updateSettings returns the set fields', async () => {
    const returned = {
      accentColor: '#00ff00',
      backgroundUrl: null,
      backgroundOverlay: 0.85,
      backgroundBlur: 12,
      defaultView: 'month',
      weekStart: 'monday',
      showWeekNumbers: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const returningSpy = async () => [returned];
    const db = {
      insert: () => ({
        values: () => ({ onConflictDoUpdate: () => ({ returning: returningSpy }) }),
      }),
    };
    const repo = makeRepo(db);

    const result = await repo.updateSettings('owner-1', { accentColor: '#00ff00' });

    expect(result.ownerId).toBe('owner-1');
    expect(result.accentColor).toBe('#00ff00');
    expect(result.showWeekNumbers).toBe(true);
  });
});
