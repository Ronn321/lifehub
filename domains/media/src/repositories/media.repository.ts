import { Inject } from '@nestjs/common';
import { and, eq, isNotNull, isNull, sql, desc, asc, like, type SQL } from 'drizzle-orm';
import { DbService, mediaSources, mediaFiles, albums, albumItems, mediaTags, mediaLockPins, tags, type Db } from '@lifehub/db';

export interface FileListFilters {
  sourceId?: string;
  favorite?: boolean;
  /** Nur Dateien mit diesem Tag (media_tags-Join) */
  tagId?: string;
  /** hasGps=true → nur Dateien mit gps_lat UND gps_lng gesetzt */
  hasGps?: boolean;
  /** MIME-Präfix-Filter: 'image' → image/%, 'video' → video/% */
  type?: 'image' | 'video';
  /**
   * Locked-Handling: Standard-Listings schließen locked=true IMMER aus.
   * Nur `includeLocked: true` (GET /media/locked, mit gültigem Lock-Token)
   * listet gesperrte Dateien.
   */
  includeLocked?: boolean;
  limit?: number;
  offset?: number;
}

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

  /** Gemeinsame WHERE-Bedingungen für Dateien-Listings (Liste + Count bleiben konsistent). */
  private fileListConditions(ownerId: string, options?: FileListFilters): SQL[] {
    const conditions: SQL[] = [eq(mediaFiles.ownerId, ownerId), isNull(mediaFiles.deletedAt)];
    if (options?.sourceId) conditions.push(eq(mediaFiles.sourceId, options.sourceId));
    if (options?.favorite) conditions.push(eq(mediaFiles.isFavorite, true));
    // Locked-Exclusion: Standard immer raus; nur includeLocked listet sie.
    if (!options?.includeLocked) conditions.push(eq(mediaFiles.locked, false));
    if (options?.hasGps) conditions.push(isNotNull(mediaFiles.gpsLat), isNotNull(mediaFiles.gpsLng));
    if (options?.type === 'image') conditions.push(like(mediaFiles.mimeType, 'image/%'));
    else if (options?.type === 'video') conditions.push(like(mediaFiles.mimeType, 'video/%'));
    return conditions;
  }

  /** Gemeinsame Spaltenauswahl für Dateien-Listings. */
  private static readonly fileListColumns = {
    id: mediaFiles.id,
    ownerId: mediaFiles.ownerId,
    sourceId: mediaFiles.sourceId,
    filename: mediaFiles.filename,
    relativePath: mediaFiles.relativePath,
    mimeType: mediaFiles.mimeType,
    fileSize: mediaFiles.fileSize,
    width: mediaFiles.width,
    height: mediaFiles.height,
    duration: mediaFiles.duration,
    gpsLat: mediaFiles.gpsLat,
    gpsLng: mediaFiles.gpsLng,
    takenAt: mediaFiles.takenAt,
    createdAt: mediaFiles.createdAt,
    updatedAt: mediaFiles.updatedAt,
    deletedAt: mediaFiles.deletedAt,
    isFavorite: mediaFiles.isFavorite,
    locked: mediaFiles.locked,
  };

  async findFilesByOwner(ownerId: string, options?: FileListFilters) {
    const conditions = this.fileListConditions(ownerId, options);
    if (options?.tagId) {
      // tagId-Filter via media_tags-Join (inner: nur getaggte Dateien)
      return this.db.select(MediaRepository.fileListColumns).from(mediaFiles)
        .innerJoin(mediaTags, and(eq(mediaTags.mediaId, mediaFiles.id), eq(mediaTags.tagId, options.tagId)))
        .where(and(...conditions))
        .orderBy(desc(mediaFiles.takenAt ?? mediaFiles.createdAt))
        .limit(options?.limit ?? 50)
        .offset(options?.offset ?? 0);
    }
    return this.db.select(MediaRepository.fileListColumns).from(mediaFiles)
      .where(and(...conditions))
      .orderBy(desc(mediaFiles.takenAt ?? mediaFiles.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
  }

  /** Total file count for pagination (gleiche Filter wie findFilesByOwner). */
  async countFilesByOwner(ownerId: string, options?: FileListFilters): Promise<number>;
  async countFilesByOwner(ownerId: string, sourceId?: string, favorite?: boolean): Promise<number>;
  async countFilesByOwner(
    ownerId: string,
    optionsOrSourceId?: FileListFilters | string,
    favorite?: boolean,
  ): Promise<number> {
    // Rückwärtskompatibel: alte Signatur (ownerId, sourceId?, favorite?) bleibt gültig.
    const options: FileListFilters = typeof optionsOrSourceId === 'string'
      ? { sourceId: optionsOrSourceId, favorite }
      : (optionsOrSourceId ?? {});
    const conditions = this.fileListConditions(ownerId, options);
    const where = and(...conditions);
    if (options.tagId) {
      // tagId-Filter via media_tags-Join (inner: nur getaggte Dateien)
      const [row] = await this.db.select({ count: sql<number>`count(*)::int` }).from(mediaFiles)
        .innerJoin(
          mediaTags,
          and(eq(mediaTags.mediaId, mediaFiles.id), eq(mediaTags.tagId, options.tagId)),
        )
        .where(where);
      return row?.count ?? 0;
    }
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaFiles)
      .where(where);
    return row?.count ?? 0;
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

  /** Backfill a generated thumbnail (e.g. ffmpeg frame for videos). */
  async updateFileThumbnail(id: string, thumbnailPath: string) {
    await this.db.update(mediaFiles)
      .set({ thumbnailPath, updatedAt: sql`now()` })
      .where(eq(mediaFiles.id, id));
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
      file: {
        id: mediaFiles.id,
        ownerId: mediaFiles.ownerId,
        sourceId: mediaFiles.sourceId,
        filename: mediaFiles.filename,
        relativePath: mediaFiles.relativePath,
        mimeType: mediaFiles.mimeType,
        fileSize: mediaFiles.fileSize,
        width: mediaFiles.width,
        height: mediaFiles.height,
        duration: mediaFiles.duration,
        gpsLat: mediaFiles.gpsLat,
        gpsLng: mediaFiles.gpsLng,
        takenAt: mediaFiles.takenAt,
        createdAt: mediaFiles.createdAt,
        updatedAt: mediaFiles.updatedAt,
        deletedAt: mediaFiles.deletedAt,
        isFavorite: mediaFiles.isFavorite,
        locked: mediaFiles.locked,
      },
      sortOrder: albumItems.sortOrder,
    }).from(albumItems)
      .innerJoin(mediaFiles, eq(albumItems.mediaId, mediaFiles.id))
      // Gesperrte Medien erscheinen nicht im Album-Listing (nur via GET /media/locked).
      .where(and(eq(albumItems.albumId, albumId), eq(mediaFiles.locked, false), isNull(mediaFiles.deletedAt)))
      .orderBy(albumItems.sortOrder);
  }

  /** Nur gesperrte Dateien des Owners (GET /media/locked — braucht Lock-Token). */
  async findLockedFilesByOwner(ownerId: string, options?: { limit?: number; offset?: number }) {
    const conditions = [
      eq(mediaFiles.ownerId, ownerId),
      isNull(mediaFiles.deletedAt),
      eq(mediaFiles.locked, true),
    ];
    const [items, total] = await Promise.all([
      this.db.select(MediaRepository.fileListColumns).from(mediaFiles)
        .where(and(...conditions))
        .orderBy(desc(mediaFiles.takenAt ?? mediaFiles.createdAt))
        .limit(options?.limit ?? 50)
        .offset(options?.offset ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(mediaFiles)
        .where(and(...conditions)).then((rows) => rows[0]?.count ?? 0),
    ]);
    return { items, total };
  }

  async setFileLocked(id: string, ownerId: string, locked: boolean) {
    const [row] = await this.db.update(mediaFiles)
      .set({ locked, updatedAt: sql`now()` })
      .where(and(eq(mediaFiles.id, id), eq(mediaFiles.ownerId, ownerId), isNull(mediaFiles.deletedAt)))
      .returning();
    return row ?? null;
  }

  // ========== LOCK-PIN ==========

  async findLockPinByOwner(ownerId: string) {
    const [row] = await this.db.select().from(mediaLockPins)
      .where(eq(mediaLockPins.ownerId, ownerId));
    return row ?? null;
  }

  async upsertLockPin(ownerId: string, pinHash: string) {
    const [row] = await this.db.insert(mediaLockPins)
      .values({ ownerId, pinHash, updatedAt: sql`now()` })
      .onConflictDoUpdate({ target: mediaLockPins.ownerId, set: { pinHash, updatedAt: sql`now()` } })
      .returning();
    return row;
  }

  /** Tag-Lookup für Wiederverwendung (owner+domain+name ist unique). */
  async findTagByOwnerDomainName(ownerId: string, domain: string, name: string) {
    const [row] = await this.db.select().from(tags)
      .where(and(eq(tags.ownerId, ownerId), eq(tags.domain, domain), eq(tags.name, name)));
    return row ?? null;
  }

  async findTagById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(tags)
      .where(and(eq(tags.id, id), eq(tags.ownerId, ownerId)));
    return row ?? null;
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
