import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, notInArray } from 'drizzle-orm';
import { DbService, calendarEvents, type Db } from '@lifehub/db';

export class CalendarRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async createEvent(data: {
    ownerId: string; title: string; description?: string;
    startDate: string; endDate?: string | null; allDay?: boolean;
    location?: string; color?: string; category?: string;
    calendarSource?: string; externalId?: string; calendarId?: string;
  }) {
    const [row] = await this.db.insert(calendarEvents).values({
      ownerId: data.ownerId, title: data.title,
      description: data.description ?? null, startDate: sql`${data.startDate}::timestamptz`,
      endDate: data.endDate ? sql`${data.endDate}::timestamptz` : null,
      allDay: data.allDay ?? false,
      location: data.location ?? null, color: data.color ?? null,
      category: data.category ?? null,
      calendarSource: data.calendarSource ?? 'local',
      externalId: data.externalId ?? null,
      calendarId: data.calendarId ?? null,
    }).returning();
    return row;
  }

  async findEventsInRange(ownerId: string, from: string, to: string) {
    const fromTs = sql`${from}::timestamptz`;
    const toTs = sql`${to}::timestamptz + interval '1 day' - interval '1 second'`;
    return this.db.select().from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.ownerId, ownerId),
          isNull(calendarEvents.deletedAt),
          sql`${calendarEvents.startDate} >= ${fromTs}`,
          sql`${calendarEvents.startDate} <= ${toTs}`,
        ),
      )
      .orderBy(calendarEvents.startDate);
  }

  async findEventById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, id),
          eq(calendarEvents.ownerId, ownerId),
          isNull(calendarEvents.deletedAt),
        ),
      );
    return row ?? null;
  }

  async findEventByExternalId(ownerId: string, externalId: string) {
    const [row] = await this.db.select().from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.ownerId, ownerId),
          eq(calendarEvents.externalId, externalId),
          isNull(calendarEvents.deletedAt),
        ),
      );
    return row ?? null;
  }

  async updateEvent(id: string, ownerId: string, data: Partial<{
    title: string; description: string | null; startDate: string;
    endDate: string | null; allDay: boolean; location: string | null;
    color: string | null; category: string | null; calendarId: string | null;
  }>) {
    const setData: Record<string, unknown> = { updatedAt: sql`now()` };
    if (data.title !== undefined) setData.title = data.title;
    if (data.description !== undefined) setData.description = data.description;
    if (data.startDate !== undefined) setData.startDate = sql`${data.startDate}::timestamptz`;
    if (data.endDate !== undefined) setData.endDate = data.endDate !== null ? sql`${data.endDate}::timestamptz` : null;
    if (data.allDay !== undefined) setData.allDay = data.allDay;
    if (data.location !== undefined) setData.location = data.location;
    if (data.color !== undefined) setData.color = data.color;
    if (data.category !== undefined) setData.category = data.category;
    if (data.calendarId !== undefined) setData.calendarId = data.calendarId;

    const [row] = await this.db.update(calendarEvents)
      .set(setData)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async setExternalId(id: string, ownerId: string, externalId: string) {
    const [row] = await this.db.update(calendarEvents)
      .set({ externalId, calendarSource: 'google', updatedAt: sql`now()` })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async upsertByExternalId(data: {
    ownerId: string; calendarId: string | null; externalId: string; title: string;
    startDate: string; endDate: string | null; allDay: boolean;
    location?: string; description?: string; color?: string;
  }) {
    const existing = await this.findEventByExternalId(data.ownerId, data.externalId);
    if (existing) {
      return this.updateEvent(existing.id, data.ownerId, {
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        allDay: data.allDay,
        location: data.location ?? null,
        description: data.description ?? null,
        color: data.color ?? null,
      });
    }
    const [row] = await this.db.insert(calendarEvents).values({
      ownerId: data.ownerId,
      calendarId: data.calendarId,
      title: data.title,
      description: data.description ?? null,
      startDate: sql`${data.startDate}::timestamptz`,
      endDate: data.endDate ? sql`${data.endDate}::timestamptz` : null,
      allDay: data.allDay,
      location: data.location ?? null,
      color: data.color ?? null,
      category: null,
      calendarSource: 'google',
      externalId: data.externalId,
    }).returning();
    return row;
  }

  async deleteGoogleEventsMissing(ownerId: string, calendarId: string, keepExternalIds: string[]) {
    if (keepExternalIds.length === 0) {
      // soft-delete every google event of this calendar
      await this.db.update(calendarEvents)
        .set({ deletedAt: sql`now()` })
        .where(
          and(
            eq(calendarEvents.ownerId, ownerId),
            eq(calendarEvents.calendarId, calendarId),
            eq(calendarEvents.calendarSource, 'google'),
            isNull(calendarEvents.deletedAt),
          ),
        );
      return;
    }
    await this.db.update(calendarEvents)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          eq(calendarEvents.ownerId, ownerId),
          eq(calendarEvents.calendarId, calendarId),
          eq(calendarEvents.calendarSource, 'google'),
          isNull(calendarEvents.deletedAt),
          notInArray(calendarEvents.externalId, keepExternalIds),
        ),
      );
  }

  async softDeleteEvent(id: string, ownerId: string) {
    await this.db.update(calendarEvents)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.ownerId, ownerId)));
  }

  async softDeleteEventsByCalendar(ownerId: string, calendarId: string) {
    await this.db.update(calendarEvents)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          eq(calendarEvents.ownerId, ownerId),
          eq(calendarEvents.calendarId, calendarId),
          isNull(calendarEvents.deletedAt),
        ),
      );
  }
}
