import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { google } from 'googleapis';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { GoogleConnectionService } from '@lifehub/integrations-domain';
import { CalendarService } from '../services/calendar.service';
import { CalendarSyncService } from '../services/calendar-sync.service';
import { CalendarsRepository } from '../repositories/calendars.repository';
import { selectGoogleCalendarSchema } from '../dtos/calendar.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('calendar/google')
export class GoogleCalendarController {
  constructor(
    @Inject(GoogleConnectionService) private readonly connService: GoogleConnectionService,
    @Inject(CalendarService) private readonly calendar: CalendarService,
    @Inject(CalendarSyncService) private readonly sync: CalendarSyncService,
    @Inject(CalendarsRepository) private readonly calendarsRepo: CalendarsRepository,
  ) {}

  @Get('status')
  @RequirePermission('calendar', 'read')
  async status(@CurrentUser() user: JwtPayload) {
    const conn = await this.connService.getStatus(user.sub);
    return { ...conn, syncing: false };
  }

  @Get('calendars')
  @RequirePermission('calendar', 'read')
  async listGoogleCalendars(@CurrentUser() user: JwtPayload) {
    const client = await this.connService.getGoogleClient(user.sub);
    const gcal = google.calendar({ version: 'v3', auth: client });
    const res = await gcal.calendarList.list({ minAccessRole: 'reader' });
    const existing = await this.calendarsRepo.findGoogleCalendars(user.sub);
    const selectedIds = new Set(existing.map((c) => c.externalId));
    return (res.data.items ?? []).map((item) => ({
      id: item.id,
      summary: item.summary ?? item.id,
      color: item.backgroundColor ? `#${item.backgroundColor}` : null,
      primary: !!item.primary,
      selected: !!item.id && selectedIds.has(item.id),
    }));
  }

  @Post('calendars')
  @RequirePermission('calendar', 'update')
  async selectGoogleCalendar(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = selectGoogleCalendarSchema.parse(body);
    const cal = await this.calendar.selectGoogleCalendar(user.sub, dto);
    // immediate best-effort sync of the newly selected calendar
    try {
      await this.sync.syncUser(user.sub);
    } catch (err) {
      // best-effort; failures are logged by the sync service
      void err;
    }
    return cal;
  }

  @Delete('calendars/:id')
  @RequirePermission('calendar', 'update')
  @HttpCode(204)
  async removeCalendar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.calendar.removeCalendar(user.sub, id);
  }

  @Post('sync')
  @RequirePermission('calendar', 'update')
  async triggerSync(@CurrentUser() user: JwtPayload) {
    const res = await this.sync.syncUser(user.sub);
    return { ok: true, synced: res.synced };
  }
}
