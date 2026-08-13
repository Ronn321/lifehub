import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { getDb, type Db } from '@lifehub/db';

export interface SystemSettings {
  [key: string]: unknown;
}

const DEFAULT_SETTINGS: Record<string, unknown> = {
  'general.brand_name': 'LifeHub',
  'general.timezone': 'Europe/Berlin',
  'paths.photos': process.env.LIFEHUB_PHOTOS_PATH ?? '/mnt/media/photos',
  'paths.videos': process.env.LIFEHUB_VIDEOS_PATH ?? '/mnt/media/videos',
  'paths.documents': process.env.LIFEHUB_DOCUMENTS_PATH ?? '/mnt/documents',
  'paths.projects': process.env.LIFEHUB_PROJECTS_PATH ?? '/mnt/projects',
  'paths.data': process.env.LIFEHUB_DATA_PATH ?? '/data',
  'paths.storage': process.env.STORAGE_BASE_PATH ?? '/data/storage',
  'paths.thumbnails': '/mnt/media/thumbnails',
  'paths.vault': '/mnt/vault-blobs',
  'paths.recipes_images': process.env.LIFEHUB_RECIPES_IMAGES_PATH ?? '/data/storage/recipes',
  'network.frontend_port': Number(process.env.FRONTEND_PORT ?? 3001),
  'network.backend_port': Number(process.env.LIFEHUB_API_PORT ?? 3007),
};

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private db: Db;

  constructor() {
    this.db = getDb();
  }

  async ensureTable(): Promise<void> {
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS public.system_settings (
        key   TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async getAll(): Promise<SystemSettings> {
    await this.ensureTable();
    const rows = await this.db.execute<{ key: string; value: unknown }>(
      sql`SELECT key, value FROM public.system_settings`
    );
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async get(key: string): Promise<unknown> {
    await this.ensureTable();
    const rows = await this.db.execute<{ key: string; value: unknown }>(
      sql`SELECT key, value FROM public.system_settings WHERE key = ${key}`
    );
    if (rows.length > 0 && rows[0]?.value !== undefined) return rows[0].value;
    return DEFAULT_SETTINGS[key] ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.ensureTable();
    await this.db.execute(sql`
      INSERT INTO public.system_settings (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE
      SET value = ${JSON.stringify(value)}::jsonb, updated_at = now()
    `);
    this.logger.log(`Setting updated: ${key}`);
  }

  async setMultiple(settings: Record<string, unknown>): Promise<void> {
    await this.ensureTable();
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, value);
    }
  }

  async getPaths(): Promise<SystemSettings> {
    const all = await this.getAll();
    const paths: SystemSettings = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith('paths.')) {
        paths[key.replace('paths.', '')] = value;
      }
    }
    return paths;
  }
}
