import {
  Body, Controller, Delete, Get, HttpCode, Inject, Param,
  Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { CalendarService } from '../services/calendar.service';
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  queryCalendarEventsSchema,
} from '../dtos/calendar.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('calendar/events')
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendar: CalendarService) {}

  @Get()
  @RequirePermission('calendar', 'read')
  async listEvents(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = queryCalendarEventsSchema.parse({ from, to });
    return this.calendar.listEvents(user.sub, dto.from, dto.to);
  }

  @Post()
  @RequirePermission('calendar', 'create')
  async createEvent(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createCalendarEventSchema.parse(body);
    return this.calendar.createEvent(user.sub, dto);
  }

  @Put(':id')
  @RequirePermission('calendar', 'update')
  async updateEvent(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = updateCalendarEventSchema.parse(body);
    return this.calendar.updateEvent(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('calendar', 'delete')
  async deleteEvent(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.calendar.deleteEvent(user.sub, id);
  }
}
