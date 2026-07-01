import { Module } from '@nestjs/common';
import { CalendarService } from '../services/calendar.service';
import { CalendarRepository } from '../repositories/calendar.repository';
import { CalendarController } from './calendar.controller';

@Module({
  providers: [CalendarRepository, CalendarService],
  controllers: [CalendarController],
  exports: [CalendarService],
})
export class CalendarModule {}
