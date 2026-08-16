import { Inject } from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import { DbService, contacts, type Db } from '@lifehub/db';

export interface ContactWriteData {
  ownerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  color?: string | null;
}

export class ContactRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async create(data: ContactWriteData) {
    const [row] = await this.db.insert(contacts).values({
      ownerId: data.ownerId,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      notes: data.notes ?? null,
      color: data.color ?? null,
    }).returning();
    return row;
  }

  async findById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId), isNull(contacts.deletedAt)));
    return row ?? null;
  }

  async list(ownerId: string, q?: string, page = 1, pageSize = 50) {
    const conditions: SQL[] = [eq(contacts.ownerId, ownerId), isNull(contacts.deletedAt)];
    const trimmed = q?.trim();
    if (trimmed) {
      const like = `%${trimmed}%`;
      const search = or(
        ilike(contacts.name, like),
        ilike(contacts.email, like),
        ilike(contacts.phone, like),
      );
      if (search) conditions.push(search);
    }
    const where = and(...conditions);

    const rows = await this.db.select({ total: count() }).from(contacts).where(where);
    const total = rows[0]?.total ?? 0;
    const items = await this.db.select().from(contacts)
      .where(where)
      .orderBy(desc(contacts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items, total: Number(total) };
  }

  async update(id: string, ownerId: string, data: Partial<ContactWriteData>) {
    const [row] = await this.db.update(contacts)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, ownerId: string) {
    await this.db.update(contacts)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)));
  }
}
