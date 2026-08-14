import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { MediaRepository } from '../repositories/media.repository';
import type { CreateSourceInput, UpdateSourceInput, CreateAlbumInput } from '../dtos/media.dto';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as exifr from 'exifr';
import sharp from 'sharp';
import type { Dirent } from 'fs';
import { createReadStream } from 'fs';

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

const EXTENSION_MIME: Record<string, string> = {
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

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly repo: MediaRepository) {}

  // ========== SOURCES ==========
  async createSource(ownerId: string, input: CreateSourceInput) {
    return this.repo.createSource({ ...input, ownerId });
  }

  async listSources(ownerId: string) {
    return this.repo.findSourcesByOwner(ownerId);
  }

  async getSource(ownerId: string, id: string) {
    const source = await this.repo.findSourceById(id, ownerId);
    if (!source) throw new NotFoundException('Media source not found');
    return source;
  }

  async updateSource(ownerId: string, id: string, input: UpdateSourceInput) {
    const source = await this.repo.findSourceById(id, ownerId);
    if (!source) throw new NotFoundException('Media source not found');
    return this.repo.updateSource(id, ownerId, input);
  }

  async deleteSource(ownerId: string, id: string) {
    const source = await this.repo.findSourceById(id, ownerId);
    if (!source) throw new NotFoundException('Media source not found');
    await this.repo.deleteSource(id, ownerId);
  }

  // ========== FILES ==========
  async listFiles(ownerId: string, options?: { sourceId?: string; limit?: number; offset?: number }) {
    const [items, total] = await Promise.all([
      this.repo.findFilesByOwner(ownerId, options),
      this.repo.countFilesByOwner(ownerId, options?.sourceId),
    ]);
    return { items, total };
  }

  async getFile(ownerId: string, id: string) {
    const file = await this.repo.findFileById(id, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    return file;
  }

  async toggleFavorite(ownerId: string, id: string) {
    return this.repo.toggleFavorite(id, ownerId);
  }

  async deleteFile(ownerId: string, id: string) {
    const file = await this.repo.findFileById(id, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    await this.repo.deleteFile(id, ownerId);
  }

  async getFileStream(ownerId: string, id: string) {
    const file = await this.repo.findFileById(id, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    const source = await this.repo.findSourceById(file.sourceId, ownerId);
    if (!source) throw new NotFoundException('Source not found for file');
    const fullPath = path.join(source.path, file.relativePath);
    if (!fs.existsSync(fullPath)) throw new NotFoundException('File not found on disk');
    return {
      stream: createReadStream(fullPath),
      mimeType: file.mimeType,
      filename: file.filename,
    };
  }

  async getFileStreamInfo(ownerId: string, id: string) {
    const file = await this.repo.findFileById(id, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    const source = await this.repo.findSourceById(file.sourceId, ownerId);
    if (!source) throw new NotFoundException('Source not found for file');
    const fullPath = path.join(source.path, file.relativePath);
    if (!fs.existsSync(fullPath)) throw new NotFoundException('File not found on disk');
    const stats = fs.statSync(fullPath);
    return {
      filePath: fullPath,
      mimeType: file.mimeType,
      filename: file.filename,
      fileSize: stats.size,
    };
  }

  // ========== ALBUMS ==========
  async createAlbum(ownerId: string, input: CreateAlbumInput) {
    return this.repo.createAlbum({ ...input, ownerId });
  }

  async listAlbums(ownerId: string) {
    return this.repo.findAlbumsByOwner(ownerId);
  }

  async getAlbum(ownerId: string, id: string) {
    const album = await this.repo.findAlbumById(id, ownerId);
    if (!album) throw new NotFoundException('Album not found');
    return album;
  }

  async updateAlbum(ownerId: string, id: string, input: { name?: string; description?: string; type?: string }) {
    const album = await this.repo.findAlbumById(id, ownerId);
    if (!album) throw new NotFoundException('Album not found');
    return this.repo.updateAlbum(id, ownerId, input);
  }

  async deleteAlbum(ownerId: string, id: string) {
    const album = await this.repo.findAlbumById(id, ownerId);
    if (!album) throw new NotFoundException('Album not found');
    await this.repo.deleteAlbum(id, ownerId);
  }

  async addToAlbum(ownerId: string, albumId: string, mediaIds: string[], userId: string) {
    const album = await this.repo.findAlbumById(albumId, ownerId);
    if (!album) throw new NotFoundException('Album not found');
    for (const mediaId of mediaIds) {
      await this.repo.addMediaToAlbum(albumId, mediaId, userId);
    }
  }

  async removeFromAlbum(ownerId: string, albumId: string, mediaId: string) {
    const album = await this.repo.findAlbumById(albumId, ownerId);
    if (!album) throw new NotFoundException('Album not found');
    await this.repo.removeMediaFromAlbum(albumId, mediaId);
  }

  async getAlbumMedia(ownerId: string, albumId: string) {
    const album = await this.repo.findAlbumById(albumId, ownerId);
    if (!album) throw new NotFoundException('Album not found');
    return this.repo.findAlbumMedia(albumId);
  }

  // ========== TAGS ==========

  async listTags(ownerId: string) {
    return this.repo.findTagsByOwnerAndDomain(ownerId, 'media');
  }

  async createTag(ownerId: string, input: { name: string; color?: string }) {
    return this.repo.createTag({ ownerId, domain: 'media', ...input });
  }

  async assignTagToFile(ownerId: string, fileId: string, tagId: string) {
    const file = await this.repo.findFileById(fileId, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    await this.repo.assignTagToFile(fileId, tagId);
    return { success: true };
  }

  async removeTagFromFile(ownerId: string, fileId: string, tagId: string) {
    const file = await this.repo.findFileById(fileId, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    await this.repo.removeTagFromFile(fileId, tagId);
    return { success: true };
  }

  async listTagsByFile(ownerId: string, fileId: string) {
    const file = await this.repo.findFileById(fileId, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    return this.repo.findTagsByFile(fileId);
  }

  async createAndAssignTag(ownerId: string, fileId: string, input: { name: string; color?: string }) {
    const file = await this.repo.findFileById(fileId, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    const tag = await this.repo.createTag({ ownerId, domain: 'media', ...input });
    if (!tag) throw new Error('Tag konnte nicht erstellt werden');
    await this.repo.assignTagToFile(fileId, tag.id);
    return tag;
  }

  // ========== SCAN ==========

  /**
   * Scan a media source directory recursively, extract metadata,
   * generate thumbnails, and persist file records.
   */
  async scanSource(ownerId: string, sourceId: string) {
    const source = await this.repo.findSourceById(sourceId, ownerId);
    if (!source) throw new NotFoundException('Media source not found');
    if (!source.isActive) throw new BadRequestException('Media source is inactive');

    const sourcePath = source.path;
    this.logger.log(`Starting scan of source "${source.name}" at ${sourcePath}`);

    // Verify the source path exists
    try {
      await fsp.access(sourcePath);
    } catch {
      throw new BadRequestException(`Source path is not accessible: ${sourcePath}`);
    }

    // Walk directory and collect media files
    const discovered: string[] = [];
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

        let width: number | undefined;
        let height: number | undefined;
        let exifRaw: Record<string, unknown> | undefined;
        let gpsLat: string | undefined;
        let gpsLng: string | undefined;
        let takenAt: string | undefined;
        let thumbnailPath: string | undefined;

        // EXIF extraction (images only)
        if (IMAGE_EXTENSIONS.has(ext)) {
          try {
            exifRaw = await exifr.parse(filePath, true) as Record<string, unknown> | undefined;
            if (exifRaw) {
              // GPS
              try {
                const gps = await exifr.gps(filePath);
                if (gps) {
                  gpsLat = gps.latitude?.toString();
                  gpsLng = gps.longitude?.toString();
                }
              } catch { /* GPS not available */ }

              // Date taken
              takenAt = (
                exifRaw.DateTimeOriginal as string
                ?? exifRaw.CreateDate as string
                ?? exifRaw.ModifyDate as string
                ?? undefined
              );
            }
          } catch {
            /* EXIF parse failed — proceed without */
          }

          // Dimensions + thumbnail via sharp
          try {
            const metadata = await sharp(filePath).metadata();
            width = metadata.width;
            height = metadata.height;

            // Thumbnail as base64 data URL — maximum quality, Retina-ready
            const thumbBuf = await sharp(filePath)
              .resize(1920, null, { withoutEnlargement: true, fit: 'inside' })
              .jpeg({ quality: 100 })
              .toBuffer();
            thumbnailPath = `data:image/jpeg;base64,${thumbBuf.toString('base64')}`;
          } catch {
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
      } catch (err) {
        result.errors++;
        this.logger.warn(
          `Failed to index ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Update the source's lastIndexedAt timestamp
    await this.repo.updateSourceLastIndexed(sourceId, ownerId);

    this.logger.log(
      `Scan finished for source "${source.name}": ` +
      `${result.added} added, ${result.skipped} skipped, ${result.errors} errors`,
    );

    return result;
  }

  /**
   * Recursively walk a directory up to MAX_SCAN_DEPTH and collect media file paths.
   */
  private async walkDirectory(
    rootPath: string,
    dirPath: string,
    depth: number,
    results: string[],
  ): Promise<void> {
    if (depth > MAX_SCAN_DEPTH) return;

    let entries: Dirent[];
    try {
      entries = await fsp.readdir(dirPath, { withFileTypes: true }) as unknown as Dirent[];
    } catch {
      return; // Skip unreadable directories
    }

    for (const entry of entries) {
      // Skip hidden entries
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.walkDirectory(rootPath, fullPath, depth + 1, results);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (MEDIA_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }
}
