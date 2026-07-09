"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const media_repository_1 = require("../repositories/media.repository");
const fs = __importStar(require("fs"));
const fsp = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const exifr = __importStar(require("exifr"));
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = require("fs");
const MEDIA_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'tif',
    'raw', 'cr2', 'nef', 'arw', 'dng',
    'mp4', 'mov', 'avi', 'mkv', 'webm',
    'mp3', 'wav', 'flac', 'aac', 'ogg',
    'pdf',
]);
/** Subset that can be processed with sharp (images) */
const IMAGE_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'avif',
]);
const EXTENSION_MIME = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
    tiff: 'image/tiff', tif: 'image/tiff',
    raw: 'image/x-raw', cr2: 'image/x-canon-cr2', nef: 'image/x-nikon-nef',
    arw: 'image/x-sony-arw', dng: 'image/x-adobe-dng',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
    aac: 'audio/aac', ogg: 'audio/ogg',
    pdf: 'application/pdf',
};
const MAX_SCAN_DEPTH = 3;
let MediaService = MediaService_1 = class MediaService {
    repo;
    logger = new common_1.Logger(MediaService_1.name);
    constructor(repo) {
        this.repo = repo;
    }
    // ========== SOURCES ==========
    async createSource(ownerId, input) {
        return this.repo.createSource({ ...input, ownerId });
    }
    async listSources(ownerId) {
        return this.repo.findSourcesByOwner(ownerId);
    }
    async getSource(ownerId, id) {
        const source = await this.repo.findSourceById(id, ownerId);
        if (!source)
            throw new common_1.NotFoundException('Media source not found');
        return source;
    }
    async updateSource(ownerId, id, input) {
        const source = await this.repo.findSourceById(id, ownerId);
        if (!source)
            throw new common_1.NotFoundException('Media source not found');
        return this.repo.updateSource(id, ownerId, input);
    }
    async deleteSource(ownerId, id) {
        const source = await this.repo.findSourceById(id, ownerId);
        if (!source)
            throw new common_1.NotFoundException('Media source not found');
        await this.repo.deleteSource(id, ownerId);
    }
    // ========== FILES ==========
    async listFiles(ownerId, options) {
        return this.repo.findFilesByOwner(ownerId, options);
    }
    async getFile(ownerId, id) {
        const file = await this.repo.findFileById(id, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        return file;
    }
    async toggleFavorite(ownerId, id) {
        return this.repo.toggleFavorite(id, ownerId);
    }
    async deleteFile(ownerId, id) {
        const file = await this.repo.findFileById(id, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        await this.repo.deleteFile(id, ownerId);
    }
    async getFileStream(ownerId, id) {
        const file = await this.repo.findFileById(id, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        const source = await this.repo.findSourceById(file.sourceId, ownerId);
        if (!source)
            throw new common_1.NotFoundException('Source not found for file');
        const fullPath = path.join(source.path, file.relativePath);
        if (!fs.existsSync(fullPath))
            throw new common_1.NotFoundException('File not found on disk');
        return {
            stream: (0, fs_1.createReadStream)(fullPath),
            mimeType: file.mimeType,
            filename: file.filename,
        };
    }
    async getFileStreamInfo(ownerId, id) {
        const file = await this.repo.findFileById(id, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        const source = await this.repo.findSourceById(file.sourceId, ownerId);
        if (!source)
            throw new common_1.NotFoundException('Source not found for file');
        const fullPath = path.join(source.path, file.relativePath);
        if (!fs.existsSync(fullPath))
            throw new common_1.NotFoundException('File not found on disk');
        const stats = fs.statSync(fullPath);
        return {
            filePath: fullPath,
            mimeType: file.mimeType,
            filename: file.filename,
            fileSize: stats.size,
        };
    }
    // ========== ALBUMS ==========
    async createAlbum(ownerId, input) {
        return this.repo.createAlbum({ ...input, ownerId });
    }
    async listAlbums(ownerId) {
        return this.repo.findAlbumsByOwner(ownerId);
    }
    async getAlbum(ownerId, id) {
        const album = await this.repo.findAlbumById(id, ownerId);
        if (!album)
            throw new common_1.NotFoundException('Album not found');
        return album;
    }
    async updateAlbum(ownerId, id, input) {
        const album = await this.repo.findAlbumById(id, ownerId);
        if (!album)
            throw new common_1.NotFoundException('Album not found');
        return this.repo.updateAlbum(id, ownerId, input);
    }
    async deleteAlbum(ownerId, id) {
        const album = await this.repo.findAlbumById(id, ownerId);
        if (!album)
            throw new common_1.NotFoundException('Album not found');
        await this.repo.deleteAlbum(id, ownerId);
    }
    async addToAlbum(ownerId, albumId, mediaIds, userId) {
        const album = await this.repo.findAlbumById(albumId, ownerId);
        if (!album)
            throw new common_1.NotFoundException('Album not found');
        for (const mediaId of mediaIds) {
            await this.repo.addMediaToAlbum(albumId, mediaId, userId);
        }
    }
    async removeFromAlbum(ownerId, albumId, mediaId) {
        const album = await this.repo.findAlbumById(albumId, ownerId);
        if (!album)
            throw new common_1.NotFoundException('Album not found');
        await this.repo.removeMediaFromAlbum(albumId, mediaId);
    }
    async getAlbumMedia(ownerId, albumId) {
        const album = await this.repo.findAlbumById(albumId, ownerId);
        if (!album)
            throw new common_1.NotFoundException('Album not found');
        return this.repo.findAlbumMedia(albumId);
    }
    // ========== TAGS ==========
    async listTags(ownerId) {
        return this.repo.findTagsByOwnerAndDomain(ownerId, 'media');
    }
    async createTag(ownerId, input) {
        return this.repo.createTag({ ownerId, domain: 'media', ...input });
    }
    async assignTagToFile(ownerId, fileId, tagId) {
        const file = await this.repo.findFileById(fileId, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        await this.repo.assignTagToFile(fileId, tagId);
        return { success: true };
    }
    async removeTagFromFile(ownerId, fileId, tagId) {
        const file = await this.repo.findFileById(fileId, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        await this.repo.removeTagFromFile(fileId, tagId);
        return { success: true };
    }
    async listTagsByFile(ownerId, fileId) {
        const file = await this.repo.findFileById(fileId, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        return this.repo.findTagsByFile(fileId);
    }
    async createAndAssignTag(ownerId, fileId, input) {
        const file = await this.repo.findFileById(fileId, ownerId);
        if (!file)
            throw new common_1.NotFoundException('Media file not found');
        const tag = await this.repo.createTag({ ownerId, domain: 'media', ...input });
        if (!tag)
            throw new Error('Tag konnte nicht erstellt werden');
        await this.repo.assignTagToFile(fileId, tag.id);
        return tag;
    }
    // ========== SCAN ==========
    /**
     * Scan a media source directory recursively, extract metadata,
     * generate thumbnails, and persist file records.
     */
    async scanSource(ownerId, sourceId) {
        const source = await this.repo.findSourceById(sourceId, ownerId);
        if (!source)
            throw new common_1.NotFoundException('Media source not found');
        if (!source.isActive)
            throw new common_1.BadRequestException('Media source is inactive');
        const sourcePath = source.path;
        this.logger.log(`Starting scan of source "${source.name}" at ${sourcePath}`);
        // Verify the source path exists
        try {
            await fsp.access(sourcePath);
        }
        catch {
            throw new common_1.BadRequestException(`Source path is not accessible: ${sourcePath}`);
        }
        // Walk directory and collect media files
        const discovered = [];
        await this.walkDirectory(sourcePath, sourcePath, 0, discovered);
        this.logger.log(`Found ${discovered.length} media files in "${source.name}"`);
        const result = { scanned: 0, added: 0, skipped: 0, errors: 0 };
        for (const filePath of discovered) {
            result.scanned++;
            const relativePath = path.relative(sourcePath, filePath);
            const filename = path.basename(filePath);
            const ext = path.extname(filePath).slice(1).toLowerCase();
            const mimeType = EXTENSION_MIME[ext] ?? 'application/octet-stream';
            try {
                // Check for duplicate (sourceId + relativePath)
                const existing = await this.repo.findFileBySourceAndPath(sourceId, relativePath);
                if (existing) {
                    result.skipped++;
                    continue;
                }
                const stats = await fsp.stat(filePath).catch(() => null);
                if (!stats) {
                    result.errors++;
                    continue;
                }
                let width;
                let height;
                let exifRaw;
                let gpsLat;
                let gpsLng;
                let takenAt;
                let thumbnailPath;
                // EXIF extraction (images only)
                if (IMAGE_EXTENSIONS.has(ext)) {
                    try {
                        exifRaw = await exifr.parse(filePath, true);
                        if (exifRaw) {
                            // GPS
                            try {
                                const gps = await exifr.gps(filePath);
                                if (gps) {
                                    gpsLat = gps.latitude?.toString();
                                    gpsLng = gps.longitude?.toString();
                                }
                            }
                            catch { /* GPS not available */ }
                            // Date taken
                            takenAt = (exifRaw.DateTimeOriginal
                                ?? exifRaw.CreateDate
                                ?? exifRaw.ModifyDate
                                ?? undefined);
                        }
                    }
                    catch {
                        /* EXIF parse failed — proceed without */
                    }
                    // Dimensions + thumbnail via sharp
                    try {
                        const metadata = await (0, sharp_1.default)(filePath).metadata();
                        width = metadata.width;
                        height = metadata.height;
                        // Thumbnail as base64 data URL — maximum quality, Retina-ready
                        const thumbBuf = await (0, sharp_1.default)(filePath)
                            .resize(1920, null, { withoutEnlargement: true, fit: 'inside' })
                            .jpeg({ quality: 100 })
                            .toBuffer();
                        thumbnailPath = `data:image/jpeg;base64,${thumbBuf.toString('base64')}`;
                    }
                    catch {
                        /* Sharp processing failed — store file without image metadata */
                    }
                }
                await this.repo.createFile({
                    ownerId,
                    sourceId,
                    filename,
                    relativePath,
                    mimeType,
                    fileSize: stats.size,
                    width,
                    height,
                    exifData: exifRaw,
                    gpsLat,
                    gpsLng,
                    takenAt: takenAt ?? undefined,
                    thumbnailPath,
                });
                result.added++;
            }
            catch (err) {
                result.errors++;
                this.logger.warn(`Failed to index ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        // Update the source's lastIndexedAt timestamp
        await this.repo.updateSourceLastIndexed(sourceId, ownerId);
        this.logger.log(`Scan finished for source "${source.name}": ` +
            `${result.added} added, ${result.skipped} skipped, ${result.errors} errors`);
        return result;
    }
    /**
     * Recursively walk a directory up to MAX_SCAN_DEPTH and collect media file paths.
     */
    async walkDirectory(rootPath, dirPath, depth, results) {
        if (depth > MAX_SCAN_DEPTH)
            return;
        let entries;
        try {
            entries = await fsp.readdir(dirPath, { withFileTypes: true });
        }
        catch {
            return; // Skip unreadable directories
        }
        for (const entry of entries) {
            // Skip hidden entries
            if (entry.name.startsWith('.'))
                continue;
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                await this.walkDirectory(rootPath, fullPath, depth + 1, results);
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name).slice(1).toLowerCase();
                if (MEDIA_EXTENSIONS.has(ext)) {
                    results.push(fullPath);
                }
            }
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [media_repository_1.MediaRepository])
], MediaService);
//# sourceMappingURL=media.service.js.map