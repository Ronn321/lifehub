import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CalendarRepository } from '../repositories/calendar.repository';
import { CalendarsRepository } from '../repositories/calendars.repository';
import { CalendarSettingsRepository } from '../repositories/calendar-settings.repository';
import { CalendarSyncService } from './calendar-sync.service';
import { dateToLocalNaive } from './calendar-timezone';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  UpdateCalendarSettingsInput,
} from '../dtos/calendar.dto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly repo: CalendarRepository,
    private readonly calendarsRepo: CalendarsRepository,
    private readonly settingsRepo: CalendarSettingsRepository,
    private readonly sync: CalendarSyncService,
  ) {}

  async createEvent(ownerId: string, input: CreateCalendarEventInput) {
    const cal = input.calendarId
      ? await this.calendarsRepo.findById(ownerId, input.calendarId)
      : null;
    if (input.calendarId && !cal) throw new NotFoundException('Kalender nicht gefunden.');

    const local = await this.repo.createEvent({ ...input, ownerId });
    if (!local) throw new InternalServerErrorException('Termin konnte nicht gespeichert werden.');
    if (cal && cal.source === 'google') {
      const googleId = await this.sync.pushEvent(ownerId, cal, {
        title: local.title,
        description: local.description,
        location: local.location,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        allDay: input.allDay ?? false,
      });
      if (googleId) {
        await this.repo.setExternalId(local.id, ownerId, googleId);
      }
    }
    return local;
  }

  async listEvents(ownerId: string, from: string, to: string) {
    return this.repo.findEventsInRange(ownerId, from, to);
  }

  async getEvent(ownerId: string, id: string) {
    const event = await this.repo.findEventById(id, ownerId);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async updateEvent(ownerId: string, id: string, input: UpdateCalendarEventInput) {
    const event = await this.repo.findEventById(id, ownerId);
    if (!event) throw new NotFoundException('Event not found');

    const local = await this.repo.updateEvent(id, ownerId, input);
    if (event.calendarSource === 'google' && event.externalId) {
      const cal = event.calendarId
        ? await this.calendarsRepo.findById(ownerId, event.calendarId)
        : null;
      if (cal && cal.source === 'google') {
        const end = local?.endDate ?? event.endDate;
        await this.sync.pushEvent(ownerId, cal, {
          title: local?.title ?? event.title,
          description: local?.description ?? event.description,
          location: local?.location ?? event.location,
          startDate: input.startDate ?? dateToLocalNaive(local?.startDate ?? event.startDate),
          endDate: input.endDate !== undefined
            ? input.endDate
            : end
              ? dateToLocalNaive(end)
              : null,
          allDay: local?.allDay ?? event.allDay,
        }, event.externalId);
      }
    }
    return local;
  }

  async deleteEvent(ownerId: string, id: string) {
    const event = await this.repo.findEventById(id, ownerId);
    if (!event) throw new NotFoundException('Event not found');

    if (event.calendarSource === 'google' && event.externalId) {
      const cal = event.calendarId
        ? await this.calendarsRepo.findById(ownerId, event.calendarId)
        : null;
      if (cal && cal.source === 'google') {
        await this.sync.deleteEvent(ownerId, cal, event.externalId);
      }
    }
    await this.repo.softDeleteEvent(id, ownerId);
  }

  // ---- settings ----
  getSettings(ownerId: string) {
    return this.settingsRepo.getSettings(ownerId);
  }

  updateSettings(ownerId: string, input: UpdateCalendarSettingsInput) {
    return this.settingsRepo.updateSettings(ownerId, input);
  }

  // ---- calendars ----
  async listCalendars(ownerId: string) {
    await this.calendarsRepo.ensureLocalDefault(ownerId);
    const rows = await this.calendarsRepo.findByOwner(ownerId);
    return rows.map((r) => ({
      id: r.id,
      title: r.name,
      color: r.color,
      source: r.source,
      externalId: r.externalId,
      isVisible: r.isVisible,
      lastSyncAt: r.lastSyncAt ? r.lastSyncAt.toISOString() : null,
    }));
  }

  async setCalendarVisible(ownerId: string, id: string, isVisible: boolean) {
    const cal = await this.calendarsRepo.findById(ownerId, id);
    if (!cal) throw new NotFoundException('Kalender nicht gefunden.');
    await this.calendarsRepo.setVisible(id, ownerId, isVisible);
    return { id, isVisible };
  }

  async selectGoogleCalendar(ownerId: string, input: { calendarId: string; title: string; color?: string }) {
    return this.calendarsRepo.upsertBySource(ownerId, 'google', input.calendarId, {
      title: input.title,
      color: input.color,
    });
  }

  async removeCalendar(ownerId: string, id: string) {
    const cal = await this.calendarsRepo.findById(ownerId, id);
    if (!cal) throw new NotFoundException('Kalender nicht gefunden.');
    await this.calendarsRepo.softDelete(id, ownerId);
    await this.repo.softDeleteEventsByCalendar(ownerId, id);
  }

  // ---- google ----
  syncUser(ownerId: string) {
    return this.sync.syncUser(ownerId);
  }
}
