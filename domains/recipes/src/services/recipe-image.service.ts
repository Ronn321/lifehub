import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@lifehub/db';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

@Injectable()
export class RecipeImageService {
  private readonly logger = new Logger(RecipeImageService.name);

  private getImagePath(): string {
    return process.env.LIFEHUB_RECIPES_IMAGES_PATH ?? '/data/storage/recipes';
  }

  /**
   * Downloads a recipe image from a URL and stores it locally.
   * Returns the relative file path on success, null on failure.
   */
  async downloadImage(imageUrl: string): Promise<string | null> {
    try {
      const url = imageUrl.trim();
      if (!url.startsWith('http')) return null;

      const basePath = this.getImagePath();
      if (!existsSync(basePath)) {
        mkdirSync(basePath, { recursive: true });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LifeHub/1.0 (recipe-importer)',
          'Accept': 'image/webp,image/jpeg,image/png,*/*',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to download image: ${url} (HTTP ${response.status})`);
        return null;
      }

      const contentType = response.headers.get('content-type') ?? '';
      const ext = this.getExtension(contentType, url);
      const hash = createHash('md5').update(url).digest('hex').substring(0, 12);
      const filename = `${hash}${ext}`;
      const filepath = join(basePath, filename);

      // Already downloaded?
      if (existsSync(filepath)) {
        this.logger.debug(`Image already cached: ${filename}`);
        return filename;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(filepath, buffer);
      this.logger.log(`Downloaded recipe image: ${filename} (${buffer.length} bytes)`);
      return filename;
    } catch (err) {
      this.logger.warn(`Image download failed for ${imageUrl}: ${(err as Error).message}`);
      return null;
    }
  }

  private getExtension(contentType: string, url: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
    };
    for (const [mime, ext] of Object.entries(map)) {
      if (contentType.includes(mime)) return ext;
    }
    // Fallback from URL extension
    const urlMatch = url.match(/\.(jpe?g|png|webp|gif|avif)(\?|$)/i);
    if (urlMatch) return `.${urlMatch[1]!.toLowerCase()}`;
    return '.jpg';
  }
}
