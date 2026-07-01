import { Injectable, Inject } from '@nestjs/common';
import { DbService, DB_TOKEN } from '@lifehub/db';
import { plugins } from '@lifehub/db';
import { eq, and, isNull, asc } from 'drizzle-orm';
import type { Plugin } from '../entities/plugins.js';

@Injectable()
export class PluginsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbService) {}

  async findAll(ownerId: string): Promise<Plugin[]> {
    return this.db.db
      .select()
      .from(plugins)
      .where(and(eq(plugins.ownerId, ownerId), isNull(plugins.deletedAt)))
      .orderBy(asc(plugins.name));
  }

  async findById(id: string, ownerId: string): Promise<Plugin | null> {
    const rows = await this.db.db
      .select()
      .from(plugins)
      .where(and(eq(plugins.id, id), eq(plugins.ownerId, ownerId), isNull(plugins.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: {
    name: string;
    version: string;
    description?: string | null;
    author?: string | null;
    homepage?: string | null;
    ownerId: string;
  }): Promise<Plugin> {
    const rows = await this.db.db
      .insert(plugins)
      .values({
        name: data.name,
        version: data.version,
        description: data.description ?? null,
        author: data.author ?? null,
        homepage: data.homepage ?? null,
        ownerId: data.ownerId,
      })
      .returning();
    return rows[0]!;
  }

  async update(
    id: string,
    ownerId: string,
    data: { enabled?: boolean; settings?: Record<string, unknown> },
  ): Promise<Plugin | null> {
    const rows = await this.db.db
      .update(plugins)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(plugins.id, id), eq(plugins.ownerId, ownerId)))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string, ownerId: string): Promise<Plugin | null> {
    const rows = await this.db.db
      .update(plugins)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(plugins.id, id), eq(plugins.ownerId, ownerId)))
      .returning();
    return rows[0] ?? null;
  }
}
