import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { DbService, itDevices, type Db } from '@lifehub/db';

export class ItInventoryRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async create(data: {
    ownerId: string;
    name: string;
    type: string;
    ipAddress?: string | null;
    macAddress?: string | null;
    hostname?: string | null;
    os?: string | null;
    location?: string | null;
    notes?: string | null;
  }) {
    const [row] = await this.db.insert(itDevices).values({
      ownerId: data.ownerId,
      name: data.name,
      type: data.type,
      ipAddress: data.ipAddress || null,
      macAddress: data.macAddress || null,
      hostname: data.hostname || null,
      os: data.os || null,
      location: data.location || null,
      notes: data.notes || null,
    }).returning();
    return row;
  }

  async findAllByOwner(ownerId: string) {
    return this.db.select().from(itDevices)
      .where(and(eq(itDevices.ownerId, ownerId), isNull(itDevices.deletedAt)))
      .orderBy(desc(itDevices.updatedAt));
  }

  async findById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(itDevices)
      .where(and(eq(itDevices.id, id), eq(itDevices.ownerId, ownerId), isNull(itDevices.deletedAt)));
    return row ?? null;
  }

  async update(id: string, ownerId: string, data: {
    name?: string;
    type?: string;
    ipAddress?: string | null;
    macAddress?: string | null;
    hostname?: string | null;
    os?: string | null;
    location?: string | null;
    notes?: string | null;
  }) {
    const setData: Record<string, unknown> = { ...data, updatedAt: sql`now()` };
    Object.keys(setData).forEach(k => {
      if (setData[k] === '') setData[k] = null;
    });
    const [row] = await this.db.update(itDevices)
      .set(setData)
      .where(and(eq(itDevices.id, id), eq(itDevices.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, ownerId: string) {
    await this.db.update(itDevices)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(itDevices.id, id), eq(itDevices.ownerId, ownerId)));
  }
}
