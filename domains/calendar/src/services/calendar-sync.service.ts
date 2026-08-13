import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { google, calendar_v3 } from 'googleapis';
import { GoogleConnectionService } from '@lifehub/integrations-domain';
import { CalendarsRepository, type CalendarRow } from '../repositories/calendars.repository';
import { CalendarRepository } from '../repositories/calendar.repository';
import { googleToLocal, localToOffsetIso, localDateForAllDay } from './calendar-timezone';

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private readonly connService: GoogleConnectionService,
    private readonly calendarsRepo: CalendarsRepository,
    private readonly eventRepo: CalendarRepository,
  ) {}

  /** Full sync for one user: every selected google calendar. Per-calendar errors are logged, not fatal. */
  async syncUser(ownerId: string): Promise<{ ok: boolean; synced: number }> {
    const calendars = await this.calendarsRepo.findGoogleCalendars(ownerId);
    let synced = 0;
    for (const cal of calendars) {
      try {
        const n = await this.syncCalendar(ownerId, cal);
        synced += n;
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        this.logger.warn(`Sync failed for calendar ${cal.id} (${cal.name}): ${(err as Error).message}`);
      }
    }
    return { ok: true, synced };
  }

  /** Import events of one google calendar; idempotent via externalId. */
  async syncCalendar(ownerId: string, cal: CalendarRow): Promise<number> {
    const client = await this.connService.getGoogleClient(ownerId);
    const gcal = google.calendar({ version: 'v3', auth: client });

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 90);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 365);

    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: cal.externalId ?? 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
    };
    if (cal.syncToken) params.syncToken = cal.syncToken;

    const res = await gcal.events.list(params);
    const items = res.data.items ?? [];
    const keepIds: string[] = [];

    for (const item of items) {
      if (!item.id || !item.start) continue;
      const allDay = !item.start.dateTime;
      const start = allDay ? `${item.start.date}T00:00:00` : googleToLocal(item.start.dateTime as string);
      const end =
        item.end?.dateTime
          ? googleToLocal(item.end.dateTime as string)
          : item.end?.date
            ? `${item.end.date}T00:00:00`
            : null;

      await this.eventRepo.upsertByExternalId({
        ownerId,
        calendarId: cal.id,
        externalId: item.id,
        title: item.summary ?? '(Ohne Titel)',
        startDate: start,
        endDate: end,
        allDay,
        location: item.location ?? undefined,
        description: item.description ?? undefined,
      });
      keepIds.push(item.id);
    }

    await this.eventRepo.deleteGoogleEventsMissing(ownerId, cal.id, keepIds);
    const nextToken = res.data.nextSyncToken ?? cal.syncToken;
    await this.calendarsRepo.updateSyncToken(cal.id, nextToken);
    await this.calendarsRepo.touchLastSync(cal.id);
    this.logger.log(`Sync ${cal.name}: ${items.length} events`);
    return items.length;
  }

  /**
   * Push a locally created/updated event to Google. Returns the Google event id,
   * or null when push fails (local copy is kept — offline tolerance).
   */
  async pushEvent(
    ownerId: string,
    cal: CalendarRow,
    data: { title: string; description?: string | null; location?: string | null; startDate: string; endDate?: string | null; allDay: boolean },
    existingGoogleId?: string | null,
  ): Promise<string | null> {
    try {
      const client = await this.connService.getGoogleClient(ownerId);
      const gcal = google.calendar({ version: 'v3', auth: client });
      const requestBody: calendar_v3.Schema$Event = {
        summary: data.title,
        description: data.description ?? undefined,
        location: data.location ?? undefined,
        start: data.allDay
          ? { date: localDateForAllDay(data.startDate) }
          : { dateTime: localToOffsetIso(data.startDate) },
        end: data.endDate
          ? data.allDay
            ? { date: localDateForAllDay(data.endDate) }
            : { dateTime: localToOffsetIso(data.endDate) }
          : undefined,
      };
      if (existingGoogleId) {
        const res = await gcal.events.update({
          calendarId: cal.externalId ?? 'primary',
          eventId: existingGoogleId,
          requestBody,
        });
        return res.data.id ?? existingGoogleId;
      }
      const res = await gcal.events.insert({
        calendarId: cal.externalId ?? 'primary',
        requestBody,
      });
      return res.data.id ?? null;
    } catch (err) {
      this.logger.warn(`Google push failed for calendar ${cal.id}: ${(err as Error).message}`);
      return null;
    }
  }

  /** Delete an event from Google; logs errors (local deletion proceeds regardless). */
  async deleteEvent(ownerId: string, cal: CalendarRow, googleId: string): Promise<void> {
    try {
      const client = await this.connService.getGoogleClient(ownerId);
      const gcal = google.calendar({ version: 'v3', auth: client });
      await gcal.events.delete({
        calendarId: cal.externalId ?? 'primary',
        eventId: googleId,
      });
    } catch (err) {
      this.logger.warn(`Google delete failed for calendar ${cal.id}: ${(err as Error).message}`);
    }
  }

  @Cron('*/15 * * * *')
  async scheduledSync(): Promise<void> {
    const owners = await this.calendarsRepo.findGoogleOwners();
    for (const ownerId of owners) {
      try {
        await this.syncUser(ownerId);
      } catch (err) {
        if (err instanceof UnauthorizedException) {
          this.logger.debug(`Skipping sync for ${ownerId}: no google connection`);
          continue;
        }
        this.logger.error(`Scheduled sync failed for ${ownerId}: ${(err as Error).message}`);
      }
    }
  }
}
