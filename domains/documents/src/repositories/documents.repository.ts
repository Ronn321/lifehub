import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { DbService, documents, type Db } from '@lifehub/db';

export class DocumentsRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async create(data: {
    id: string;
    ownerId: string;
    name: string;
    type: string;
    description?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    storagePath?: string | null;
    tags?: string[] | null;
  }) {
    const [row] = await this.db.insert(documents).values(data).returning();
    return row;
  }

  async findByOwner(ownerId: string) {
    return this.db.select().from(documents)
      .where(and(eq(documents.ownerId, ownerId), isNull(documents.deletedAt)))
      .orderBy(desc(documents.updatedAt));
  }

  async findById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId), isNull(documents.deletedAt)));
    return row ?? null;
  }

  async update(id: string, ownerId: string, data: Record<string, unknown>) {
    const [row] = await this.db.update(documents)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, ownerId: string) {
    await this.db.update(documents)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(documents.id, id), eq(documents.ownerId, ownerId)));
  }
}
