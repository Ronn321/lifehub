import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc, asc } from 'drizzle-orm';
import { DbService, shoppingLists, shoppingItems, type Db } from '@lifehub/db';

export class ShoppingRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // ========== LISTS ==========

  async createList(data: {
    ownerId: string;
    title: string;
    color?: string | null;
    store?: string | null;
  }) {
    const [row] = await this.db.insert(shoppingLists).values({
      ownerId: data.ownerId,
      title: data.title,
      color: data.color ?? null,
      store: data.store ?? null,
    }).returning();
    return row;
  }

  async findListsByOwner(ownerId: string) {
    return this.db.select({
      id: shoppingLists.id,
      title: shoppingLists.title,
      ownerId: shoppingLists.ownerId,
      color: shoppingLists.color,
      store: shoppingLists.store,
      isArchived: shoppingLists.isArchived,
      createdAt: shoppingLists.createdAt,
      updatedAt: shoppingLists.updatedAt,
      deletedAt: shoppingLists.deletedAt,
      itemCount: sql<number>`(
        SELECT count(*)::int FROM ${shoppingItems} WHERE ${shoppingItems.listId} = ${shoppingLists.id}
      )`,
      checkedCount: sql<number>`(
        SELECT count(*)::int FROM ${shoppingItems} WHERE ${shoppingItems.listId} = ${shoppingLists.id} AND ${shoppingItems.checked} = true
      )`,
    }).from(shoppingLists)
      .where(and(eq(shoppingLists.ownerId, ownerId), isNull(shoppingLists.deletedAt)))
      .orderBy(desc(shoppingLists.updatedAt));
  }

  async findListById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.ownerId, ownerId), isNull(shoppingLists.deletedAt)));
    return row ?? null;
  }

  async updateList(id: string, ownerId: string, data: {
    title?: string;
    color?: string | null;
    store?: string | null;
    isArchived?: boolean;
  }) {
    const [row] = await this.db.update(shoppingLists)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDeleteList(id: string, ownerId: string) {
    await this.db.update(shoppingLists)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.ownerId, ownerId)));
  }

  // ========== ITEMS ==========

  async createItem(data: {
    listId: string;
    name: string;
    amount?: string | null;
    unit?: string | null;
    category?: string | null;
    ord?: number;
    recipeRefId?: string | null;
  }) {
    const [row] = await this.db.insert(shoppingItems).values({
      listId: data.listId,
      name: data.name,
      amount: data.amount ?? null,
      unit: data.unit ?? null,
      category: data.category ?? null,
      ord: data.ord ?? 0,
      recipeRefId: data.recipeRefId ?? null,
    }).returning();
    return row;
  }

  async findItemsByList(listId: string) {
    return this.db.select().from(shoppingItems)
      .where(eq(shoppingItems.listId, listId))
      .orderBy(asc(shoppingItems.ord), asc(shoppingItems.createdAt));
  }

  async findItemById(id: string) {
    const [row] = await this.db.select().from(shoppingItems)
      .where(eq(shoppingItems.id, id));
    return row ?? null;
  }

  async updateItem(id: string, data: Partial<{
    name: string;
    amount: string | null;
    unit: string | null;
    category: string | null;
    checked: boolean;
    checkedBy: string | null;
    ord: number;
  }>) {
    const [row] = await this.db.update(shoppingItems)
      .set(data)
      .where(eq(shoppingItems.id, id))
      .returning();
    return row ?? null;
  }

  async deleteItem(id: string) {
    await this.db.delete(shoppingItems).where(eq(shoppingItems.id, id));
  }
}
