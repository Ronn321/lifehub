import { Module } from '@nestjs/common';
import { IntegrationsModule } from '@lifehub/integrations-domain';
import { CalendarService } from '../services/calendar.service';
import { CalendarSyncService } from '../services/calendar-sync.service';
import { CalendarRepository } from '../repositories/calendar.repository';
import { CalendarsRepository } from '../repositories/calendars.repository';
import { CalendarSettingsRepository } from '../repositories/calendar-settings.repository';
import { CalendarController } from './calendar.controller';
import { CalendarSettingsController } from './calendar-settings.controller';
import { CalendarsController } from './calendars.controller';
import { GoogleCalendarController } from './google-calendar.controller';

@Module({
  imports: [IntegrationsModule],
  providers: [
    CalendarRepository,
    CalendarsRepository,
    CalendarSettingsRepository,
    CalendarService,
    CalendarSyncService,
  ],
  controllers: [
    CalendarController,
    CalendarSettingsController,
    CalendarsController,
    GoogleCalendarController,
  ],
  exports: [CalendarService, CalendarSyncService],
})
export class CalendarModule {}
