import { describe, expect, it, vi, beforeEach } from 'vitest';

const { eventsList } = vi.hoisted(() => ({ eventsList: vi.fn() }));

vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn(() => ({ events: { list: eventsList } })),
  },
}));

import { CalendarSyncService } from './calendar-sync.service';
import type { CalendarsRepository } from '../repositories/calendars.repository';
import type { CalendarRepository } from '../repositories/calendar.repository';
import type { GoogleConnectionService } from '@lifehub/integrations-domain';

function makeCalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cal-1',
    name: 'Work',
    color: null,
    source: 'google',
    externalId: 'googlecal-1',
    ownerId: 'owner-1',
    syncToken: null,
    lastSyncAt: null,
    isVisible: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as Awaited<ReturnType<CalendarsRepository['findGoogleCalendars']>>[number];
}

function makeMocks() {
  const connService = {
    getGoogleClient: vi.fn().mockResolvedValue({}),
  } as unknown as GoogleConnectionService;

  const calendarsRepo = {
    findGoogleCalendars: vi.fn(),
    updateSyncToken: vi.fn(),
    touchLastSync: vi.fn(),
  } as unknown as CalendarsRepository;

  const eventRepo = {
    upsertByExternalId: vi.fn().mockResolvedValue(undefined),
    deleteGoogleEventsMissing: vi.fn(),
  } as unknown as CalendarRepository;

  const svc = new CalendarSyncService(connService, calendarsRepo, eventRepo);
  return { connService, calendarsRepo, eventRepo, svc };
}

const event = (id: string, title: string, dateTime: string) => ({
  id,
  summary: title,
  start: { dateTime },
  end: { dateTime },
});

describe('CalendarSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imports all google events and deletes missing ones (Fall A)', async () => {
    const { calendarsRepo, eventRepo, svc } = makeMocks();
    eventsList.mockResolvedValue({
      data: {
        items: [
          event('g1', 'Meeting', '2026-08-13T09:00:00+02:00'),
          event('g2', 'Lunch', '2026-08-13T12:00:00+02:00'),
          event('g3', 'Dinner', '2026-08-13T19:00:00+02:00'),
        ],
        nextSyncToken: 'nxt',
      },
    });
    const cal = makeCalRow();

    const count = await svc.syncCalendar('owner-1', cal);

    expect(count).toBe(3);
    expect(eventsList).toHaveBeenCalledTimes(1);
    expect(eventRepo.upsertByExternalId).toHaveBeenCalledTimes(3);
    // no duplicates: one upsert per external google id
    expect(eventRepo.upsertByExternalId).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ ownerId: 'owner-1', calendarId: 'cal-1', externalId: 'g1', title: 'Meeting', allDay: false, startDate: '2026-08-13T09:00:00' }),
    );
    // all three ids kept -> nothing deleted
    expect(eventRepo.deleteGoogleEventsMissing).toHaveBeenCalledWith('owner-1', 'cal-1', ['g1', 'g2', 'g3']);
    expect(calendarsRepo.updateSyncToken).toHaveBeenCalledWith('cal-1', 'nxt');
    expect(calendarsRepo.touchLastSync).toHaveBeenCalledWith('cal-1');
  });

  it('passes the stored syncToken as param and stores nextSyncToken (Fall B)', async () => {
    const { calendarsRepo, eventRepo, svc } = makeMocks();
    eventsList.mockResolvedValue({ data: { items: [], nextSyncToken: 'next-tok' } });
    const cal = makeCalRow({ syncToken: 'stored-tok' });

    const count = await svc.syncCalendar('owner-1', cal);

    expect(count).toBe(0);
    expect(eventsList).toHaveBeenCalledWith(expect.objectContaining({ syncToken: 'stored-tok' }));
    expect(calendarsRepo.updateSyncToken).toHaveBeenCalledWith('cal-1', 'next-tok');
    expect(eventRepo.deleteGoogleEventsMissing).toHaveBeenCalledWith('owner-1', 'cal-1', []);
  });

  it('calls deleteGoogleEventsMissing with an empty keepIds when nothing is returned (Fall C)', async () => {
    const { eventRepo, svc } = makeMocks();
    eventsList.mockResolvedValue({ data: { items: [], nextSyncToken: undefined } });
    const cal = makeCalRow();

    await svc.syncCalendar('owner-1', cal);

    // empty keepIds -> repo soft-deletes every google event of the calendar
    expect(eventRepo.deleteGoogleEventsMissing).toHaveBeenCalledWith('owner-1', 'cal-1', []);
  });
});
