import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, createWriteStream, promises as fsp } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHmac } from 'node:crypto';
import type { StorageService } from './storage.interface.js';

/**
 * LocalDisk-Storage-Adapter.
 * Basis-Verzeichnis aus STORAGE_BASE_PATH (Default: ./storage).
 * In Production wird das NAS-Mount in diesen Pfad gemountet.
 */
@Injectable()
export class LocalDiskStorage implements StorageService {
  private readonly logger = new Logger(LocalDiskStorage.name);
  private readonly base = resolve(process.env.STORAGE_BASE_PATH ?? './storage');
  private readonly signingSecret = process.env.STORAGE_SIGNING_SECRET ?? 'dev-only-change-me';

  private resolveKey(domain: string, key: string): string {
    // verhindert path-traversal: keine "..", keine absoluten Keys
    if (key.includes('..') || key.startsWith('/')) {
      throw new Error(`Invalid key: ${key}`);
    }
    return join(this.base, domain, key);
  }

  async put(domain: string, key: string, data: Readable | Buffer): Promise<string> {
    const full = this.resolveKey(domain, key);
    await fsp.mkdir(dirname(full), { recursive: true });
    if (Buffer.isBuffer(data)) {
      await fsp.writeFile(full, data);
    } else {
      await pipeline(data, createWriteStream(full));
    }
    this.logger.debug(`put: ${full}`);
    return full;
  }

  async get(path: string): Promise<Readable> {
    return createReadStream(path);
  }

  async delete(path: string): Promise<void> {
    await fsp.rm(path, { force: true });
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fsp.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<{ size: number; mtime: Date }> {
    const s = await fsp.stat(path);
    return { size: s.size, mtime: s.mtime };
  }

  async signedUrl(path: string, expiresInSeconds: number): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = createHmac('sha256', this.signingSecret)
      .update(`${path}:${exp}`)
      .digest('hex')
      .slice(0, 32);
    return `/api/v1/storage/stream?path=${encodeURIComponent(path)}&exp=${exp}&sig=${sig}`;
  }
}
