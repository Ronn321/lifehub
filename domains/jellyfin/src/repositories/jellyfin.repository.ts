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
}
