"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@lifehub/db");
let MediaRepository = class MediaRepository {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    get db() {
        return this.dbService.db;
    }
    // ========== SOURCES ==========
    async createSource(data) {
        const [row] = await this.db.insert(db_1.mediaSources).values({
            ownerId: data.ownerId,
            name: data.name,
            type: data.type,
            path: data.path,
            autoIndex: data.autoIndex ?? false,
        }).returning();
        return row;
    }
    async findSourcesByOwner(ownerId) {
        return this.db.select().from(db_1.mediaSources)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaSources.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.mediaSources.deletedAt)))
            .orderBy((0, drizzle_orm_1.desc)(db_1.mediaSources.createdAt));
    }
    async findSourceById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.mediaSources)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaSources.id, id), (0, drizzle_orm_1.eq)(db_1.mediaSources.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.mediaSources.deletedAt)));
        return row ?? null;
    }
    async updateSource(id, ownerId, data) {
        const [row] = await this.db.update(db_1.mediaSources)
            .set({ ...data, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaSources.id, id), (0, drizzle_orm_1.eq)(db_1.mediaSources.ownerId, ownerId)))
            .returning();
        return row ?? null;
    }
    async deleteSource(id, ownerId) {
        await this.db.update(db_1.mediaSources)
            .set({ deletedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaSources.id, id), (0, drizzle_orm_1.eq)(db_1.mediaSources.ownerId, ownerId)));
    }
    // ========== FILES ==========
    async createFile(data) {
        const [row] = await this.db.insert(db_1.mediaFiles).values({
            ownerId: data.ownerId, sourceId: data.sourceId, filename: data.filename,
            relativePath: data.relativePath, mimeType: data.mimeType,
            fileSize: data.fileSize ?? null, width: data.width ?? null, height: data.height ?? null,
            duration: data.duration ?? null, exifData: data.exifData ?? null,
            gpsLat: data.gpsLat ?? null, gpsLng: data.gpsLng ?? null,
            takenAt: data.takenAt ? new Date(data.takenAt) : null,
            thumbnailPath: data.thumbnailPath ?? null,
        }).returning();
        return row;
    }
    /** Check if a file already exists for a given source + relative path */
    async findFileBySourceAndPath(sourceId, relativePath) {
        const [row] = await this.db.select().from(db_1.mediaFiles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaFiles.sourceId, sourceId), (0, drizzle_orm_1.eq)(db_1.mediaFiles.relativePath, relativePath), (0, drizzle_orm_1.isNull)(db_1.mediaFiles.deletedAt)));
        return row ?? null;
    }
    async findFilesByOwner(ownerId, options) {
        const conditions = [(0, drizzle_orm_1.eq)(db_1.mediaFiles.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.mediaFiles.deletedAt)];
        if (options?.sourceId)
            conditions.push((0, drizzle_orm_1.eq)(db_1.mediaFiles.sourceId, options.sourceId));
        return this.db.select().from(db_1.mediaFiles)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(db_1.mediaFiles.takenAt ?? db_1.mediaFiles.createdAt))
            .limit(options?.limit ?? 50)
            .offset(options?.offset ?? 0);
    }
    async findFileById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.mediaFiles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaFiles.id, id), (0, drizzle_orm_1.eq)(db_1.mediaFiles.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.mediaFiles.deletedAt)));
        return row ?? null;
    }
    /** Update the source's lastIndexedAt timestamp */
    async updateSourceLastIndexed(id, ownerId) {
        await this.db.update(db_1.mediaSources)
            .set({ lastIndexedAt: (0, drizzle_orm_1.sql) `now()`, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaSources.id, id), (0, drizzle_orm_1.eq)(db_1.mediaSources.ownerId, ownerId)));
    }
    async toggleFavorite(id, ownerId) {
        const file = await this.findFileById(id, ownerId);
        if (!file)
            return null;
        const [row] = await this.db.update(db_1.mediaFiles)
            .set({ isFavorite: !file.isFavorite, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.eq)(db_1.mediaFiles.id, id))
            .returning();
        return row;
    }
    async deleteFile(id, ownerId) {
        await this.db.update(db_1.mediaFiles)
            .set({ deletedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaFiles.id, id), (0, drizzle_orm_1.eq)(db_1.mediaFiles.ownerId, ownerId)));
    }
    // ========== ALBUMS ==========
    async createAlbum(data) {
        const [row] = await this.db.insert(db_1.albums).values({
            ownerId: data.ownerId, name: data.name,
            description: data.description ?? null, type: data.type ?? 'standard',
        }).returning();
        return row;
    }
    async findAlbumsByOwner(ownerId) {
        return this.db.select().from(db_1.albums)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.albums.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.albums.deletedAt)))
            .orderBy((0, drizzle_orm_1.desc)(db_1.albums.updatedAt));
    }
    async findAlbumById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.albums)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.albums.id, id), (0, drizzle_orm_1.eq)(db_1.albums.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.albums.deletedAt)));
        return row ?? null;
    }
    async updateAlbum(id, ownerId, data) {
        const [row] = await this.db.update(db_1.albums)
            .set({ ...data, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.albums.id, id), (0, drizzle_orm_1.eq)(db_1.albums.ownerId, ownerId)))
            .returning();
        return row ?? null;
    }
    async deleteAlbum(id, ownerId) {
        await this.db.update(db_1.albums)
            .set({ deletedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.albums.id, id), (0, drizzle_orm_1.eq)(db_1.albums.ownerId, ownerId)));
    }
    async addMediaToAlbum(albumId, mediaId, addedBy) {
        await this.db.insert(db_1.albumItems).values({ albumId, mediaId, addedBy }).onConflictDoNothing();
    }
    async removeMediaFromAlbum(albumId, mediaId) {
        await this.db.delete(db_1.albumItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.albumItems.albumId, albumId), (0, drizzle_orm_1.eq)(db_1.albumItems.mediaId, mediaId)));
    }
    async findAlbumMedia(albumId) {
        return this.db.select({
            file: db_1.mediaFiles,
            sortOrder: db_1.albumItems.sortOrder,
        }).from(db_1.albumItems)
            .innerJoin(db_1.mediaFiles, (0, drizzle_orm_1.eq)(db_1.albumItems.mediaId, db_1.mediaFiles.id))
            .where((0, drizzle_orm_1.eq)(db_1.albumItems.albumId, albumId))
            .orderBy(db_1.albumItems.sortOrder);
    }
    // ========== TAGS ==========
    async createTag(data) {
        const [row] = await this.db.insert(db_1.tags).values(data).returning();
        return row;
    }
    async findTagsByOwnerAndDomain(ownerId, domain) {
        return this.db.select().from(db_1.tags)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.tags.ownerId, ownerId), (0, drizzle_orm_1.eq)(db_1.tags.domain, domain)))
            .orderBy((0, drizzle_orm_1.asc)(db_1.tags.name));
    }
    async assignTagToFile(mediaId, tagId) {
        await this.db.insert(db_1.mediaTags).values({ mediaId, tagId }).onConflictDoNothing();
    }
    async removeTagFromFile(mediaId, tagId) {
        await this.db.delete(db_1.mediaTags)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.mediaTags.mediaId, mediaId), (0, drizzle_orm_1.eq)(db_1.mediaTags.tagId, tagId)));
    }
    async findTagsByFile(mediaId) {
        return this.db.select({
            tagId: db_1.tags.id,
            tagName: db_1.tags.name,
            tagColor: db_1.tags.color,
        }).from(db_1.mediaTags)
            .innerJoin(db_1.tags, (0, drizzle_orm_1.eq)(db_1.mediaTags.tagId, db_1.tags.id))
            .where((0, drizzle_orm_1.eq)(db_1.mediaTags.mediaId, mediaId))
            .orderBy((0, drizzle_orm_1.asc)(db_1.tags.name));
    }
};
exports.MediaRepository = MediaRepository;
exports.MediaRepository = MediaRepository = __decorate([
    __param(0, (0, common_1.Inject)(db_1.DbService)),
    __metadata("design:paramtypes", [db_1.DbService])
], MediaRepository);
//# sourceMappingURL=media.repository.js.map