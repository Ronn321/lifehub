import { Inject } from '@nestjs/common';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { DbService, jellyfinServers, jellyfinLibraries, jellyfinItems, jellyfinWatchlists, jellyfinWatchlistItems, type Db } from '@lifehub/db';
import type { JellyfinServer, JellyfinLibrary, JellyfinItem } from '../entities/jellyfin';

export class JellyfinRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // =================== Servers ===================
  async findServersByOwner(ownerId: string): Promise<JellyfinServer[]> {
    return this.db
      .select()
      .from(jellyfinServers)
      .where(eq(jellyfinServers.ownerId, ownerId))
      .orderBy(jellyfinServers.createdAt) as unknown as JellyfinServer[];
  }

  async findServerById(id: string): Promise<JellyfinServer | null> {
    const rows = await this.db
      .select()
      .from(jellyfinServers)
      .where(eq(jellyfinServers.id, id))
      .limit(1);
    return (rows[0] as unknown as JellyfinServer) ?? null;
  }

  async createServer(input: { url: string; apiKey: string; ownerId: string }): Promise<JellyfinServer> {
    const [row] = await this.db
      .insert(jellyfinServers)
      .values(input)
      .returning();
    return row as unknown as JellyfinServer;
  }

  async deleteServer(id: string): Promise<void> {
    await this.db.delete(jellyfinServers).where(eq(jellyfinServers.id, id));
  }

  async touchServer(id: string): Promise<void> {
    await this.db
      .update(jellyfinServers)
      .set({ updatedAt: new Date() })
      .where(eq(jellyfinServers.id, id));
  }

  // =================== Libraries ===================
  async findLibrariesByServer(serverId: string): Promise<JellyfinLibrary[]> {
    return this.db
      .select()
      .from(jellyfinLibraries)
      .where(eq(jellyfinLibraries.serverId, serverId))
      .orderBy(jellyfinLibraries.name) as unknown as JellyfinLibrary[];
  }

  async findLibraryById(id: string): Promise<JellyfinLibrary | null> {
    const rows = await this.db
      .select()
      .from(jellyfinLibraries)
      .where(eq(jellyfinLibraries.id, id))
      .limit(1);
    return (rows[0] as unknown as JellyfinLibrary) ?? null;
  }

  async findLibrariesByOwner(ownerId: string): Promise<JellyfinLibrary[]> {
    return this.db
      .select()
      .from(jellyfinLibraries)
      .where(eq(jellyfinLibraries.ownerId, ownerId))
      .orderBy(jellyfinLibraries.createdAt) as unknown as JellyfinLibrary[];
  }

  async upsertLibrary(input: { serverId: string; externalId: string | null; name: string; type: string | null; ownerId: string }): Promise<JellyfinLibrary> {
    const existing = await this.db
      .select()
      .from(jellyfinLibraries)
      .where(and(
        eq(jellyfinLibraries.serverId, input.serverId),
        eq(jellyfinLibraries.externalId, input.externalId ?? ''),
      ))
      .limit(1);

    const found = existing[0];
    if (found) {
      const [row] = await this.db
        .update(jellyfinLibraries)
        .set({ name: input.name, type: input.type })
        .where(eq(jellyfinLibraries.id, found.id))
        .returning();
      return row as unknown as JellyfinLibrary;
    }

    const [row] = await this.db
      .insert(jellyfinLibraries)
      .values(input)
      .returning();
    return row as unknown as JellyfinLibrary;
  }

  async deleteLibrariesByServer(serverId: string): Promise<void> {
    await this.db.delete(jellyfinLibraries).where(eq(jellyfinLibraries.serverId, serverId));
  }

  // =================== Items ===================
  async findItemsByLibrary(libraryId: string): Promise<JellyfinItem[]> {
    return this.db
      .select()
      .from(jellyfinItems)
      .where(eq(jellyfinItems.libraryId, libraryId))
      .orderBy(jellyfinItems.name) as unknown as JellyfinItem[];
  }

  async findItemsByOwner(ownerId: string): Promise<JellyfinItem[]> {
    return this.db
      .select()
      .from(jellyfinItems)
      .where(eq(jellyfinItems.ownerId, ownerId))
      .orderBy(jellyfinItems.createdAt) as unknown as JellyfinItem[];
  }

  async upsertItem(input: { libraryId: string; externalId: string | null; name: string; type: string; path: string | null; ownerId: string }): Promise<JellyfinItem> {
    const existing = await this.db
      .select()
      .from(jellyfinItems)
      .where(and(
        eq(jellyfinItems.libraryId, input.libraryId),
        eq(jellyfinItems.externalId, input.externalId ?? ''),
      ))
      .limit(1);

    const found = existing[0];
    if (found) {
      const [row] = await this.db
        .update(jellyfinItems)
        .set({ name: input.name, type: input.type, path: input.path, updatedAt: new Date() })
        .where(eq(jellyfinItems.id, found.id))
        .returning();
      return row as unknown as JellyfinItem;
    }

    const [row] = await this.db
      .insert(jellyfinItems)
      .values(input)
      .returning();
    return row as unknown as JellyfinItem;
  }

  async deleteItemsByLibrary(libraryId: string): Promise<void> {
    await this.db.delete(jellyfinItems).where(eq(jellyfinItems.libraryId, libraryId));
  }

  async findItemById(id: string): Promise<JellyfinItem | null> {
    const rows = await this.db
      .select()
      .from(jellyfinItems)
      .where(eq(jellyfinItems.id, id))
      .limit(1);
    return (rows[0] as unknown as JellyfinItem) ?? null;
  }

  async toggleWatched(id: string): Promise<JellyfinItem | null> {
    const item = await this.findItemById(id);
    if (!item) return null;
    const [row] = await this.db
      .update(jellyfinItems)
      .set({ watched: !item.watched, updatedAt: new Date() })
      .where(eq(jellyfinItems.id, id))
      .returning();
    return row as unknown as JellyfinItem;
  }

  // =================== Watchlists ===================
  async listWatchlists(ownerId: string): Promise<any[]> {
    return this.db
      .select()
      .from(jellyfinWatchlists)
      .where(eq(jellyfinWatchlists.ownerId, ownerId))
      .orderBy(asc(jellyfinWatchlists.position), asc(jellyfinWatchlists.createdAt));
  }

  async findWatchlistById(id: string): Promise<any | null> {
    const rows = await this.db
      .select()
      .from(jellyfinWatchlists)
      .where(eq(jellyfinWatchlists.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async createWatchlist(ownerId: string, name: string): Promise<any> {
    const [row] = await this.db
      .insert(jellyfinWatchlists)
      .values({ ownerId, name, position: 0 })
      .returning();
    return row as unknown as any;
  }

  async renameWatchlist(id: string, name: string): Promise<any | null> {
    const rows = await this.db
      .update(jellyfinWatchlists)
      .set({ name, updatedAt: new Date() })
      .where(eq(jellyfinWatchlists.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async deleteWatchlist(id: string): Promise<void> {
    await this.db.delete(jellyfinWatchlists).where(eq(jellyfinWatchlists.id, id));
  }

  async doCountWatchlistItemsByOwner(ownerId: string): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        watchlistId: jellyfinWatchlists.id,
        total: count(),
      })
      .from(jellyfinWatchlistItems)
      .innerJoin(jellyfinWatchlists, eq(jellyfinWatchlistItems.watchlistId, jellyfinWatchlists.id))
      .where(eq(jellyfinWatchlists.ownerId, ownerId))
      .groupBy(jellyfinWatchlists.id);

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.watchlistId, Number(row.total));
    }
    return map;
  }

  async listWatchlistItems(watchlistId: string): Promise<any[]> {
    return this.db
      .select()
      .from(jellyfinWatchlistItems)
      .where(eq(jellyfinWatchlistItems.watchlistId, watchlistId))
      .orderBy(asc(jellyfinWatchlistItems.addedAt));
  }

  async addWatchlistItem(watchlistId: string, externalItemId: string, itemType: string, name: string): Promise<any | null> {
    const rows = await this.db
      .insert(jellyfinWatchlistItems)
      .values({ watchlistId, externalItemId, itemType, name })
      .onConflictDoNothing({
        target: [jellyfinWatchlistItems.watchlistId, jellyfinWatchlistItems.externalItemId],
      })
      .returning();
    return rows[0] ?? null;
  }

  async removeWatchlistItem(watchlistId: string, externalItemId: string): Promise<void> {
    await this.db
      .delete(jellyfinWatchlistItems)
      .where(and(
        eq(jellyfinWatchlistItems.watchlistId, watchlistId),
        eq(jellyfinWatchlistItems.externalItemId, externalItemId),
      ));
  }

  async findWatchlistItem(watchlistId: string, externalItemId: string): Promise<any | null> {
    const rows = await this.db
      .select()
      .from(jellyfinWatchlistItems)
      .where(and(
        eq(jellyfinWatchlistItems.watchlistId, watchlistId),
        eq(jellyfinWatchlistItems.externalItemId, externalItemId),
      ))
      .limit(1);
    return rows[0] ?? null;
  }

  async findWatchlistMemberships(
    ownerId: string,
    externalItemId: string,
  ): Promise<Array<{
    list: { id: string; name: string; ownerId: string; position: number; createdAt: Date; updatedAt: Date };
    item: { externalItemId: string; itemType: string; name: string };
  }>> {
    const items = await this.db
      .select()
      .from(jellyfinWatchlistItems)
      .where(eq(jellyfinWatchlistItems.externalItemId, externalItemId));

    if (items.length === 0) return [];

    const watchlistIds = [...new Set(items.map((i) => i.watchlistId))];
    const lists = await this.db
      .select()
      .from(jellyfinWatchlists)
      .where(and(
        eq(jellyfinWatchlists.ownerId, ownerId),
        inArray(jellyfinWatchlists.id, watchlistIds),
      ));

    const listById = new Map(lists.map((l) => [l.id, l]));

    return items
      .filter((item) => listById.has(item.watchlistId))
      .map((item) => {
        const list = listById.get(item.watchlistId)!;
        return {
          list: {
            id: list.id,
            name: list.name,
            ownerId: list.ownerId,
            position: list.position,
            createdAt: list.createdAt,
            updatedAt: list.updatedAt,
          },
          item: {
            externalItemId: item.externalItemId,
            itemType: item.itemType,
            name: item.name,
          },
        };
      });
  }
}
