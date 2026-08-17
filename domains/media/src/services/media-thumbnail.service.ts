import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { MediaRepository } from '../repositories/media.repository';

const execFileAsync = promisify(execFile);

/** Root directory under which generated thumbnails are cached. */
const THUMB_CACHE_ROOT = '/data/storage/thumbs';

@Injectable()
export class MediaThumbnailService {
  private readonly logger = new Logger(MediaThumbnailService.name);

  constructor(@Inject(MediaRepository) private readonly repo: MediaRepository) {}

  /**
   * Return (or lazily generate + cache) a thumbnail for a media file.
   * Images are cached as WebP, videos as JPEG. A cache hit returns immediately;
   * otherwise the thumbnail is produced from the source file on disk.
   */
  async getThumbnail(
    ownerId: string,
    fileId: string,
    size = 512,
  ): Promise<{ path: string; mimeType: string; size: number }> {
    const file = await this.repo.findFileById(fileId, ownerId);
    if (!file) throw new NotFoundException('Media file not found');

    const isVideo = file.mimeType.startsWith('video/');
    const ext = isVideo ? 'jpg' : 'webp';
    const cachedMimeType = isVideo ? 'image/jpeg' : 'image/webp';
    const cached = join(THUMB_CACHE_ROOT, `${fileId}_${size}.${ext}`);

    // Cache hit — return the existing thumbnail immediately.
    if (existsSync(cached)) {
      const cachedStats = await stat(cached);
      return { path: cached, mimeType: cachedMimeType, size: cachedStats.size };
    }

    // Ensure the cache directory exists before generating.
    mkdirSync(THUMB_CACHE_ROOT, { recursive: true });

    const source = await this.repo.findSourceById(file.sourceId, ownerId);
    if (!source) throw new NotFoundException('Source not found for file');

    const fullPath = join(source.path, file.relativePath);
    if (!existsSync(fullPath)) throw new NotFoundException('File not found on disk');

    if (isVideo) {
      await this.generateVideoThumb(fullPath, cached, size, file.duration);
    } else {
      await this.generateImageThumb(fullPath, cached, size);
    }

    const generatedStats = await stat(cached);
    return { path: cached, mimeType: cachedMimeType, size: generatedStats.size };
  }

  /**
   * Generate a WebP thumbnail from an image using sharp.
   * Fails non-fatally on malformed input via `failOn: 'none'`.
   */
  private async generateImageThumb(
    src: string,
    dest: string,
    size: number,
  ): Promise<void> {
    try {
      await sharp(src, { failOn: 'none' })
        .rotate()
        .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(dest);
    } catch (err) {
      this.logger.warn(`Thumbnail generation failed for ${src}: ${err instanceof Error ? err.message : String(err)}`);
      throw new NotFoundException('Thumbnail could not be generated');
    }
  }

  /**
   * Extract a single frame near the middle of the video via ffmpeg and cache it
   * as a JPEG thumbnail. Uses the file duration (seconds * 1000) to pick the
   * middle frame; falls back to 60s when duration is unknown. No ffprobe call.
   */
  private async generateVideoThumb(
    src: string,
    dest: string,
    size: number,
    duration: number | null,
  ): Promise<void> {
    let at = 60;
    if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
      at = duration / 2;
    }

    try {
      await execFileAsync('ffmpeg', [
        '-ss', String(at),
        '-i', src,
        '-frames:v', '1',
        '-vf', `scale=${size}:-2`,
        '-q:v', '5',
        '-y', dest,
      ]);
    } catch (err) {
      this.logger.warn(`Video thumbnail generation failed for ${src}: ${err instanceof Error ? err.message : String(err)}`);
      throw new NotFoundException('Thumbnail could not be generated');
    }
  }
}
