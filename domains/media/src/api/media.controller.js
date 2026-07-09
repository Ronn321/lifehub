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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("@lifehub/auth");
const permissions_1 = require("@lifehub/permissions");
const media_service_1 = require("../services/media.service");
const media_dto_1 = require("../dtos/media.dto");
const schema = {
    source: media_dto_1.createSourceSchema,
    sourceUpdate: media_dto_1.updateSourceSchema,
    album: media_dto_1.createAlbumSchema,
    albumAdd: media_dto_1.addToAlbumSchema,
};
let MediaController = class MediaController {
    media;
    constructor(media) {
        this.media = media;
    }
    // ========== SOURCES ==========
    async createSource(body, user) {
        const dto = schema.source.parse(body);
        return this.media.createSource(user.sub, dto);
    }
    async listSources(user) {
        return this.media.listSources(user.sub);
    }
    async getSource(id, user) {
        return this.media.getSource(user.sub, id);
    }
    async updateSource(id, body, user) {
        const dto = schema.sourceUpdate.parse(body);
        return this.media.updateSource(user.sub, id, dto);
    }
    async deleteSource(id, user) {
        await this.media.deleteSource(user.sub, id);
    }
    async scanSource(id, user) {
        return this.media.scanSource(user.sub, id);
    }
    // ========== FILES ==========
    async indexSource(id, user) {
        return this.media.scanSource(user.sub, id);
    }
    async listFiles(sourceId, limit, offset, user) {
        return this.media.listFiles(user.sub, {
            sourceId,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
    }
    async getFile(id, user) {
        return this.media.getFile(user.sub, id);
    }
    async toggleFavorite(id, user) {
        return this.media.toggleFavorite(user.sub, id);
    }
    async deleteFile(id, user) {
        await this.media.deleteFile(user.sub, id);
    }
    // ========== ALBUMS ==========
    async createAlbum(body, user) {
        const dto = schema.album.parse(body);
        return this.media.createAlbum(user.sub, dto);
    }
    async listAlbums(user) {
        return this.media.listAlbums(user.sub);
    }
    async getAlbum(id, user) {
        return this.media.getAlbum(user.sub, id);
    }
    async updateAlbum(id, body, user) {
        const dto = media_dto_1.updateAlbumSchema.parse(body);
        return this.media.updateAlbum(user.sub, id, dto);
    }
    async deleteAlbum(id, user) {
        await this.media.deleteAlbum(user.sub, id);
    }
    async addToAlbum(id, body, user) {
        const dto = schema.albumAdd.parse(body);
        await this.media.addToAlbum(user.sub, id, dto.mediaIds, user.sub);
        return { added: dto.mediaIds.length };
    }
    async removeFromAlbum(albumId, mediaId, user) {
        await this.media.removeFromAlbum(user.sub, albumId, mediaId);
    }
    async getAlbumMedia(id, user) {
        return this.media.getAlbumMedia(user.sub, id);
    }
    // ========== TAGS ==========
    async listTags(user) {
        return this.media.listTags(user.sub);
    }
    async createTag(body, user) {
        const dto = media_dto_1.createTagSchema.parse(body);
        return this.media.createTag(user.sub, dto);
    }
    async listFileTags(id, user) {
        return this.media.listTagsByFile(user.sub, id);
    }
    async assignTag(id, body, user) {
        const dto = media_dto_1.createAndAssignTagSchema.parse(body);
        return this.media.createAndAssignTag(user.sub, id, dto);
    }
    async removeTag(id, tagId, user) {
        await this.media.removeTagFromFile(user.sub, id, tagId);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('sources'),
    (0, permissions_1.RequirePermission)('media', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "createSource", null);
__decorate([
    (0, common_1.Get)('sources'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "listSources", null);
__decorate([
    (0, common_1.Get)('sources/:id'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getSource", null);
__decorate([
    (0, common_1.Put)('sources/:id'),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "updateSource", null);
__decorate([
    (0, common_1.Delete)('sources/:id'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('media', 'delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteSource", null);
__decorate([
    (0, common_1.Post)('sources/:id/scan'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "scanSource", null);
__decorate([
    (0, common_1.Post)('sources/:id/index'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('media', 'create'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "indexSource", null);
__decorate([
    (0, common_1.Get)('files'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, common_1.Query)('sourceId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __param(3, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "listFiles", null);
__decorate([
    (0, common_1.Get)('files/:id'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getFile", null);
__decorate([
    (0, common_1.Post)('files/:id/favorite'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "toggleFavorite", null);
__decorate([
    (0, common_1.Delete)('files/:id'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('media', 'delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteFile", null);
__decorate([
    (0, common_1.Post)('albums'),
    (0, permissions_1.RequirePermission)('media', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "createAlbum", null);
__decorate([
    (0, common_1.Get)('albums'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "listAlbums", null);
__decorate([
    (0, common_1.Get)('albums/:id'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getAlbum", null);
__decorate([
    (0, common_1.Put)('albums/:id'),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "updateAlbum", null);
__decorate([
    (0, common_1.Delete)('albums/:id'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('media', 'delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteAlbum", null);
__decorate([
    (0, common_1.Post)('albums/:id/items'),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "addToAlbum", null);
__decorate([
    (0, common_1.Delete)('albums/:albumId/items/:mediaId'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('albumId')),
    __param(1, (0, common_1.Param)('mediaId')),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "removeFromAlbum", null);
__decorate([
    (0, common_1.Get)('albums/:id/media'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getAlbumMedia", null);
__decorate([
    (0, common_1.Get)('tags'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "listTags", null);
__decorate([
    (0, common_1.Post)('tags'),
    (0, permissions_1.RequirePermission)('media', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "createTag", null);
__decorate([
    (0, common_1.Get)('files/:id/tags'),
    (0, permissions_1.RequirePermission)('media', 'read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "listFileTags", null);
__decorate([
    (0, common_1.Post)('files/:id/tags'),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "assignTag", null);
__decorate([
    (0, common_1.Delete)('files/:id/tags/:tagId'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('media', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('tagId')),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "removeTag", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.UseGuards)(auth_1.JwtGuard, permissions_1.PermissionGuard),
    (0, common_1.Controller)('media'),
    __param(0, (0, common_1.Inject)(media_service_1.MediaService)),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map