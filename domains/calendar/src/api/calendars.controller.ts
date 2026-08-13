import { Body, Controller, Get, Inject, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { CalendarService } from '../services/calendar.service';
import { updateCalendarVisibilitySchema } from '../dtos/calendar.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('calendar/calendars')
export class CalendarsController {
  constructor(@Inject(CalendarService) private readonly calendar: CalendarService) {}

  @Get()
  @RequirePermission('calendar', 'read')
  async listCalendars(@CurrentUser() user: JwtPayload) {
    return this.calendar.listCalendars(user.sub);
  }

  @Patch(':id')
  @RequirePermission('calendar', 'update')
  async setVisible(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateCalendarVisibilitySchema.parse(body);
    return this.calendar.setCalendarVisible(user.sub, id, dto.isVisible);
  }
}
