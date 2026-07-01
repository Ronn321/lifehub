import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc, asc } from 'drizzle-orm';
import { DbService, trips, destinations, tripDays, tripMediaRefs, type Db } from '@lifehub/db';

export class TravelRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // ========== TRIPS ==========
  async createTrip(data: {
    ownerId: string; title: string; description?: string;
    startDate: string; endDate: string; coverMediaId?: string; status?: string;
  }) {
    const [row] = await this.db.insert(trips).values({
      ownerId: data.ownerId, title: data.title,
      description: data.description ?? null, startDate: data.startDate,
      endDate: data.endDate, coverMediaId: data.coverMediaId ?? null,
      status: data.status ?? 'planned',
    }).returning();
    return row;
  }

  async findTripsByOwner(ownerId: string) {
    return this.db.select().from(trips)
      .where(and(eq(trips.ownerId, ownerId), isNull(trips.deletedAt)))
      .orderBy(desc(trips.startDate));
  }

  async findTripById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(trips)
      .where(and(eq(trips.id, id), eq(trips.ownerId, ownerId), isNull(trips.deletedAt)));
    return row ?? null;
  }

  async updateTrip(id: string, ownerId: string, data: Partial<{
    title: string; description: string | null; startDate: string; endDate: string;
    coverMediaId: string | null; status: string;
  }>) {
    const [row] = await this.db.update(trips)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(trips.id, id), eq(trips.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDeleteTrip(id: string, ownerId: string) {
    await this.db.update(trips)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(trips.id, id), eq(trips.ownerId, ownerId)));
  }

  // ========== DESTINATIONS ==========
  async createDestination(data: {
    tripId: string; name: string; lat?: string; lng?: string; ord?: number;
  }) {
    const [row] = await this.db.insert(destinations).values({
      tripId: data.tripId, name: data.name,
      lat: data.lat ?? null, lng: data.lng ?? null,
      ord: data.ord ?? 0,
    }).returning();
    return row;
  }

  async findDestinationsByTrip(tripId: string) {
    return this.db.select().from(destinations)
      .where(eq(destinations.tripId, tripId))
      .orderBy(asc(destinations.ord));
  }

  async countDestinationsByTrip(tripId: string) {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(destinations)
      .where(eq(destinations.tripId, tripId));
    return Number(result?.count ?? 0);
  }

  async deleteDestination(id: string, tripId: string) {
    await this.db.delete(destinations)
      .where(and(eq(destinations.id, id), eq(destinations.tripId, tripId)));
  }

  // ========== TRIP DAYS ==========
  async createTripDay(data: { tripId: string; date: string; title?: string; notes?: string; ord?: number }) {
    const [row] = await this.db.insert(tripDays).values({
      tripId: data.tripId, date: data.date,
      title: data.title ?? null, notes: data.notes ?? null,
      ord: data.ord ?? 0,
    }).returning();
    return row;
  }

  async findDaysByTrip(tripId: string) {
    return this.db.select().from(tripDays)
      .where(eq(tripDays.tripId, tripId))
      .orderBy(asc(tripDays.date));
  }

  async countDaysByTrip(tripId: string) {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(tripDays)
      .where(eq(tripDays.tripId, tripId));
    return Number(result?.count ?? 0);
  }

  async deleteTripDay(id: string, tripId: string) {
    await this.db.delete(tripDays)
      .where(and(eq(tripDays.id, id), eq(tripDays.tripId, tripId)));
  }

  // ========== MEDIA REFS ==========
  async addMediaRef(data: {
    tripId: string; mediaId: string; dayId?: string | null; caption?: string; ord?: number;
  }) {
    const [row] = await this.db.insert(tripMediaRefs).values({
      tripId: data.tripId, mediaId: data.mediaId,
      dayId: data.dayId ?? null, caption: data.caption ?? null,
      ord: data.ord ?? 0,
    }).returning();
    return row;
  }

  async findMediaRefsByTrip(tripId: string) {
    return this.db.select().from(tripMediaRefs)
      .where(eq(tripMediaRefs.tripId, tripId))
      .orderBy(asc(tripMediaRefs.ord));
  }

  async countMediaRefsByTrip(tripId: string) {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(tripMediaRefs)
      .where(eq(tripMediaRefs.tripId, tripId));
    return Number(result?.count ?? 0);
  }

  async findMediaRefsByDay(dayId: string) {
    return this.db.select().from(tripMediaRefs)
      .where(eq(tripMediaRefs.dayId, dayId))
      .orderBy(asc(tripMediaRefs.ord));
  }
}
