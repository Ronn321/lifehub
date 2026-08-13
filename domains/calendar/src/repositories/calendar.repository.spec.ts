import { describe, expect, it, vi } from 'vitest';
import { CalendarRepository } from './calendar.repository';
import { calendarEvents } from '@lifehub/db';

vi.mock('@lifehub/db', () => ({
  DbService: class DbService {},
  calendarEvents: { externalId: {}, ownerId: {}, calendarId: {}, calendarSource: {}, deletedAt: {} },
  Db: {},
}));

function makeRepo(db: { update?: unknown } = {}) {
  return new CalendarRepository({ db } as never);
}

describe('CalendarRepository.deleteGoogleEventsMissing', () => {
  it('soft-deletes every google event of the calendar when keepIds is empty (Fall C)', async () => {
    const whereSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn().mockReturnValue({ where: whereSpy });
    const updateSpy = vi.fn().mockReturnValue({ set: setSpy });
    const repo = makeRepo({ update: updateSpy });

    await repo.deleteGoogleEventsMissing('owner-1', 'cal-1', []);

    expect(updateSpy).toHaveBeenCalledWith(calendarEvents);
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.anything() }));
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it('does not go through the empty-keepIds branch when ids are provided', async () => {
    // In the non-empty branch drizzle uses `notInArray`; we only assert the
    // call reaches the update chain exactly once for the provided calendar.
    const whereSpy = vi.fn().mockResolvedValue(undefined);
    const setSpy = vi.fn().mockReturnValue({ where: whereSpy });
    const updateSpy = vi.fn().mockReturnValue({ set: setSpy });
    const repo = makeRepo({ update: updateSpy });

    await repo.deleteGoogleEventsMissing('owner-1', 'cal-1', ['a', 'b']);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });
});
