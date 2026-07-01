import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, asc } from 'drizzle-orm';
import { DbService, pages, pageBlocks, type Db } from '@lifehub/db';

export class PagesRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // ========== PAGES ==========

  async createPage(data: {
    ownerId: string;
    title: string;
    parentId?: string | null;
    icon?: string | null;
    coverMediaId?: string | null;
    description?: string | null;
    sortOrder?: number;
  }) {
    const [row] = await this.db.insert(pages).values({
      ownerId: data.ownerId,
      title: data.title,
      parentId: data.parentId ?? null,
      icon: data.icon ?? null,
      coverMediaId: data.coverMediaId ?? null,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
    }).returning();
    return row;
  }

  async findPagesByOwner(ownerId: string) {
    return this.db.select().from(pages)
      .where(and(eq(pages.ownerId, ownerId), isNull(pages.deletedAt)))
      .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
  }

  async findPageById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(pages)
      .where(and(eq(pages.id, id), eq(pages.ownerId, ownerId), isNull(pages.deletedAt)));
    return row ?? null;
  }

  async updatePage(id: string, ownerId: string, data: {
    title?: string;
    parentId?: string | null;
    icon?: string | null;
    coverMediaId?: string | null;
    description?: string | null;
    sortOrder?: number;
  }) {
    const [row] = await this.db.update(pages)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(pages.id, id), eq(pages.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDeletePage(id: string, ownerId: string) {
    await this.db.update(pages)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(pages.id, id), eq(pages.ownerId, ownerId)));
  }

  // ========== PAGE BLOCKS ==========

  async createBlock(data: {
    pageId: string;
    type: string;
    content?: Record<string, unknown>;
    sortOrder?: number;
  }) {
    const [row] = await this.db.insert(pageBlocks).values({
      pageId: data.pageId,
      type: data.type,
      content: (data.content ?? {}) as typeof pageBlocks.$inferInsert.content,
      sortOrder: data.sortOrder ?? 0,
    }).returning();
    return row;
  }

  async findBlocksByPage(pageId: string) {
    return this.db.select().from(pageBlocks)
      .where(eq(pageBlocks.pageId, pageId))
      .orderBy(asc(pageBlocks.sortOrder), asc(pageBlocks.createdAt));
  }

  async findBlockById(id: string) {
    const [row] = await this.db.select().from(pageBlocks)
      .where(eq(pageBlocks.id, id));
    return row ?? null;
  }

  async updateBlock(id: string, data: Partial<{
    type: string;
    content: Record<string, unknown>;
    sortOrder: number;
  }>) {
    const [row] = await this.db.update(pageBlocks)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(pageBlocks.id, id))
      .returning();
    return row ?? null;
  }

  async deleteBlock(id: string) {
    await this.db.delete(pageBlocks).where(eq(pageBlocks.id, id));
  }

  async updateBlockSortOrder(id: string, sortOrder: number) {
    await this.db.update(pageBlocks)
      .set({ sortOrder, updatedAt: sql`now()` })
      .where(eq(pageBlocks.id, id));
  }
}
