import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CalendarRepository } from '../repositories/calendar.repository';
import type { CreateCalendarEventInput, UpdateCalendarEventInput } from '../dtos/calendar.dto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly repo: CalendarRepository) {}

  async createEvent(ownerId: string, input: CreateCalendarEventInput) {
    return this.repo.createEvent({ ...input, ownerId });
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
    return this.repo.updateEvent(id, ownerId, input);
  }

  async deleteEvent(ownerId: string, id: string) {
    const event = await this.repo.findEventById(id, ownerId);
    if (!event) throw new NotFoundException('Event not found');
    await this.repo.softDeleteEvent(id, ownerId);
  }
}
