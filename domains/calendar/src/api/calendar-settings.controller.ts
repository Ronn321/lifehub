import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { CalendarService } from '../services/calendar.service';
import { updateCalendarSettingsSchema } from '../dtos/calendar.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('calendar/settings')
export class CalendarSettingsController {
  constructor(@Inject(CalendarService) private readonly calendar: CalendarService) {}

  @Get()
  @RequirePermission('calendar', 'read')
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.calendar.getSettings(user.sub);
  }

  @Put()
  @RequirePermission('calendar', 'update')
  async updateSettings(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateCalendarSettingsSchema.parse(body);
    return this.calendar.updateSettings(user.sub, dto);
  }
}
