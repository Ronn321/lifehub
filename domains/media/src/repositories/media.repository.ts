import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc, asc } from 'drizzle-orm';
import { DbService, mediaSources, mediaFiles, albums, albumItems, mediaTags, tags, type Db } from '@lifehub/db';

export class MediaRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // ========== SOURCES ==========
  async createSource(data: {
    ownerId: string; name: string; type: string; path: string; autoIndex?: boolean;
  }) {
    const [row] = await this.db.insert(mediaSources).values({
      ownerId: data.ownerId,
      name: data.name,
      type: data.type,
      path: data.path,
      autoIndex: data.autoIndex ?? false,
    }).returning();
    return row;
  }

  async findSourcesByOwner(ownerId: string) {
    return this.db.select().from(mediaSources)
      .where(and(eq(mediaSources.ownerId, ownerId), isNull(mediaSources.deletedAt)))
      .orderBy(desc(mediaSources.createdAt));
  }

  async findSourceById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(mediaSources)
      .where(and(eq(mediaSources.id, id), eq(mediaSources.ownerId, ownerId), isNull(mediaSources.deletedAt)));
    return row ?? null;
  }

  async updateSource(id: string, ownerId: string, data: Partial<{ name: string; path: string; isActive: boolean; autoIndex: boolean }>) {
    const [row] = await this.db.update(mediaSources)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(mediaSources.id, id), eq(mediaSources.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async deleteSource(id: string, ownerId: string) {
    await this.db.update(mediaSources)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(mediaSources.id, id), eq(mediaSources.ownerId, ownerId)));
  }

  // ========== FILES ==========
  async createFile(data: {
    ownerId: string; sourceId: string; filename: string; relativePath: string;
    mimeType: string; fileSize?: number; width?: number; height?: number;
    duration?: number; exifData?: unknown; gpsLat?: string; gpsLng?: string;
    takenAt?: string; thumbnailPath?: string;
  }) {
    const [row] = await this.db.insert(mediaFiles).values({
      ownerId: data.ownerId, sourceId: data.sourceId, filename: data.filename,
      relativePath: data.relativePath, mimeType: data.mimeType,
      fileSize: data.fileSize ?? null, width: data.width ?? null, height: data.height ?? null,
      duration: data.duration ?? null, exifData: data.exifData as any ?? null,
      gpsLat: data.gpsLat ?? null, gpsLng: data.gpsLng ?? null,
      takenAt: data.takenAt ? new Date(data.takenAt) : null,
      thumbnailPath: data.thumbnailPath ?? null,
    }).returning();
    return row;
  }

  /** Check if a file already exists for a given source + relative path */
  async findFileBySourceAndPath(sourceId: string, relativePath: string): Promise<typeof mediaFiles.$inferSelect | null> {
    const [row] = await this.db.select().from(mediaFiles)
      .where(and(
        eq(mediaFiles.sourceId, sourceId),
        eq(mediaFiles.relativePath, relativePath),
        isNull(mediaFiles.deletedAt),
      ));
    return row ?? null;
  }

  async findFilesByOwner(ownerId: string, options?: { sourceId?: string; limit?: number; offset?: number }) {
    const conditions = [eq(mediaFiles.ownerId, ownerId), isNull(mediaFiles.deletedAt)];
    if (options?.sourceId) conditions.push(eq(mediaFiles.sourceId, options.sourceId));
    return this.db.select().from(mediaFiles)
      .where(and(...conditions))
      .orderBy(desc(mediaFiles.takenAt ?? mediaFiles.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
  }

  async findFileById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(mediaFiles)
      .where(and(eq(mediaFiles.id, id), eq(mediaFiles.ownerId, ownerId), isNull(mediaFiles.deletedAt)));
    return row ?? null;
  }

  /** Update the source's lastIndexedAt timestamp */
  async updateSourceLastIndexed(id: string, ownerId: string) {
    await this.db.update(mediaSources)
      .set({ lastIndexedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(mediaSources.id, id), eq(mediaSources.ownerId, ownerId)));
  }

  async toggleFavorite(id: string, ownerId: string) {
    const file = await this.findFileById(id, ownerId);
    if (!file) return null;
    const [row] = await this.db.update(mediaFiles)
      .set({ isFavorite: !file.isFavorite, updatedAt: sql`now()` })
      .where(eq(mediaFiles.id, id))
      .returning();
    return row;
  }

  async deleteFile(id: string, ownerId: string) {
    await this.db.update(mediaFiles)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(mediaFiles.id, id), eq(mediaFiles.ownerId, ownerId)));
  }

  // ========== ALBUMS ==========
  async createAlbum(data: { ownerId: string; name: string; description?: string; type?: string }) {
    const [row] = await this.db.insert(albums).values({
      ownerId: data.ownerId, name: data.name,
      description: data.description ?? null, type: data.type ?? 'standard',
    }).returning();
    return row;
  }

  async findAlbumsByOwner(ownerId: string) {
    return this.db.select().from(albums)
      .where(and(eq(albums.ownerId, ownerId), isNull(albums.deletedAt)))
      .orderBy(desc(albums.updatedAt));
  }

  async findAlbumById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(albums)
      .where(and(eq(albums.id, id), eq(albums.ownerId, ownerId), isNull(albums.deletedAt)));
    return row ?? null;
  }

  async updateAlbum(id: string, ownerId: string, data: { name?: string; description?: string; type?: string }) {
    const [row] = await this.db.update(albums)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(albums.id, id), eq(albums.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async deleteAlbum(id: string, ownerId: string) {
    await this.db.update(albums)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(albums.id, id), eq(albums.ownerId, ownerId)));
  }

  async addMediaToAlbum(albumId: string, mediaId: string, addedBy: string) {
    await this.db.insert(albumItems).values({ albumId, mediaId, addedBy }).onConflictDoNothing();
  }

  async removeMediaFromAlbum(albumId: string, mediaId: string) {
    await this.db.delete(albumItems)
      .where(and(eq(albumItems.albumId, albumId), eq(albumItems.mediaId, mediaId)));
  }

  async findAlbumMedia(albumId: string) {
    return this.db.select({
      file: mediaFiles,
      sortOrder: albumItems.sortOrder,
    }).from(albumItems)
      .innerJoin(mediaFiles, eq(albumItems.mediaId, mediaFiles.id))
      .where(eq(albumItems.albumId, albumId))
      .orderBy(albumItems.sortOrder);
  }

  // ========== TAGS ==========

  async createTag(data: { ownerId: string; domain: string; name: string; color?: string }) {
    const [row] = await this.db.insert(tags).values(data).returning();
    return row;
  }

  async findTagsByOwnerAndDomain(ownerId: string, domain: string) {
    return this.db.select().from(tags)
      .where(and(eq(tags.ownerId, ownerId), eq(tags.domain, domain)))
      .orderBy(asc(tags.name));
  }

  async assignTagToFile(mediaId: string, tagId: string) {
    await this.db.insert(mediaTags).values({ mediaId, tagId }).onConflictDoNothing();
  }

  async removeTagFromFile(mediaId: string, tagId: string) {
    await this.db.delete(mediaTags)
      .where(and(eq(mediaTags.mediaId, mediaId), eq(mediaTags.tagId, tagId)));
  }

  async findTagsByFile(mediaId: string) {
    return this.db.select({
      tagId: tags.id,
      tagName: tags.name,
      tagColor: tags.color,
    }).from(mediaTags)
      .innerJoin(tags, eq(mediaTags.tagId, tags.id))
      .where(eq(mediaTags.mediaId, mediaId))
      .orderBy(asc(tags.name));
  }
}
