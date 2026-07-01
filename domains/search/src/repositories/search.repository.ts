import { Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService, searchQueries, type Db } from '@lifehub/db';
import type { SearchResult, SearchDomain } from '../entities/search.js';

type RawRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
};

export class SearchRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async searchAll(ownerId: string, query: string, limit: number): Promise<SearchResult[]> {
    const pattern = `%${query}%`;
    const queries: Promise<SearchResult[]>[] = [
      this.searchMedia(ownerId, pattern),
      this.searchRecipes(ownerId, pattern),
      this.searchProjects(ownerId, pattern),
      this.searchInsurance(ownerId, pattern),
      this.searchVault(ownerId, pattern),
      this.searchTravel(ownerId, pattern),
      this.searchFinance(ownerId, pattern),
    ];

    const nested = await Promise.all(queries);
    const all: SearchResult[] = [];
    for (const results of nested) {
      all.push(...results);
    }
    return all.slice(0, limit);
  }

  async searchByDomain(ownerId: string, query: string, domain: SearchDomain, limit: number): Promise<SearchResult[]> {
    const pattern = `%${query}%`;
    const fn = this.domainSearchers[domain];
    if (!fn) return [];
    return (await fn.call(this, ownerId, pattern)).slice(0, limit);
  }

  async logQuery(query: string, domainFilter: string | null, resultCount: number, userId: string): Promise<void> {
    await this.db.insert(searchQueries).values({
      query,
      domainFilter,
      resultCount,
      userId,
    });
  }

  private domainSearchers: Record<string, (ownerId: string, pattern: string) => Promise<SearchResult[]>> = {
    media: this.searchMedia,
    recipes: this.searchRecipes,
    projects: this.searchProjects,
    insurance: this.searchInsurance,
    vault: this.searchVault,
    travel: this.searchTravel,
    finance: this.searchFinance,
  };

  private async searchMedia(ownerId: string, pattern: string): Promise<SearchResult[]> {
    const rows = await this.db.execute<RawRow>(sql`
      SELECT id, filename AS title, description, thumbnail_path AS thumbnail_url
      FROM media_files
      WHERE owner_id = ${ownerId}
        AND deleted_at IS NULL
        AND (filename ILIKE ${pattern} OR description ILIKE ${pattern})
      LIMIT 20
    `);
    return rows.map((r) => ({
      domain: 'media' as SearchDomain,
      id: r.id,
      title: r.title,
      description: r.description,
      url: `/media?file=${r.id}`,
      thumbnailUrl: r.thumbnail_url,
      matchField: r.title.toLowerCase().includes(pattern.replace(/%/g, '').toLowerCase()) ? 'filename' : 'description',
      matchSnippet: null,
    }));
  }

  private async searchRecipes(ownerId: string, pattern: string): Promise<SearchResult[]> {
    const rows = await this.db.execute<RawRow>(sql`
      SELECT id, title, description, NULL AS thumbnail_url
      FROM recipes
      WHERE owner_id = ${ownerId}
        AND deleted_at IS NULL
        AND (title ILIKE ${pattern} OR description ILIKE ${pattern})
      LIMIT 20
    `);
    return rows.map((r) => ({
      domain: 'recipes' as SearchDomain,
      id: r.id,
      title: r.title,
      description: r.description,
      url: `/recipes?id=${r.id}`,
      thumbnailUrl: null,
      matchField: null,
      matchSnippet: null,
    }));
  }

  private async searchProjects(ownerId: string, pattern: string): Promise<SearchResult[]> {
    const rows = await this.db.execute<RawRow>(sql`
      SELECT id, title, description, NULL AS thumbnail_url
      FROM projects
      WHERE owner_id = ${ownerId}
        AND deleted_at IS NULL
        AND (title ILIKE ${pattern} OR description ILIKE ${pattern})
      LIMIT 20
    `);
    return rows.map((r) => ({
      domain: 'projects' as SearchDomain,
      id: r.id,
      title: r.title,
      description: r.description,
      url: `/projects?id=${r.id}`,
      thumbnailUrl: null,
      matchField: null,
      matchSnippet: null,
    }));
  }

  private async searchInsurance(ownerId: string, pattern: string): Promise<SearchResult[]> {
    const rows = await this.db.execute<RawRow>(sql`
      SELECT id, name AS title, provider AS description, NULL AS thumbnail_url
      FROM insurance_policies
      WHERE owner_id = ${ownerId}
        AND deleted_at IS NULL
        AND name ILIKE ${pattern}
      LIMIT 20
    `);
    return rows.map((r) => ({
      domain: 'insurance' as SearchDomain,
      id: r.id,
      title: r.title,
      description: r.description,
      url: `/insurance?id=${r.id}`,
      thumbnailUrl: null,
      matchField: 'name',
      matchSnippet: null,
    }));
  }

  private async searchVault(ownerId: string, pattern: string): Promise<SearchResult[]> {
    const rows = await this.db.execute<RawRow>(sql`
      SELECT id, name AS title, url AS description, NULL AS thumbnail_url
      FROM vault_entries
      WHERE owner_id = ${ownerId}
        AND deleted_at IS NULL
        AND name ILIKE ${pattern}
      LIMIT 20
    `);
    return rows.map((r) => ({
      domain: 'vault' as SearchDomain,
      id: r.id,
      title: r.title,
      description: r.description,
      url: `/vault?id=${r.id}`,
      thumbnailUrl: null,
      matchField: 'name',
      matchSnippet: null,
    }));
  }

  private async searchTravel(ownerId: string, pattern: string): Promise<SearchResult[]> {
    const rows = await this.db.execute<RawRow>(sql`
      SELECT id, title, description, NULL AS thumbnail_url
      FROM trips
      WHERE owner_id = ${ownerId}
        AND deleted_at IS NULL
        AND (title ILIKE ${pattern} OR description ILIKE ${pattern})
      LIMIT 20
    `);
    return rows.map((r) => ({
      domain: 'travel' as SearchDomain,
      id: r.id,
      title: r.title,
      description: r.description,
      url: `/travel?id=${r.id}`,
      thumbnailUrl: null,
      matchField: null,
      matchSnippet: null,
    }));
  }

  private async searchFinance(ownerId: string, pattern: string): Promise<SearchResult[]> {
    const rows = await this.db.execute<RawRow>(sql`
      SELECT id, name AS title, NULL AS description, NULL AS thumbnail_url
      FROM finance_accounts
      WHERE owner_id = ${ownerId}
        AND deleted_at IS NULL
        AND name ILIKE ${pattern}
      LIMIT 20
    `);
    return rows.map((r) => ({
      domain: 'finance' as SearchDomain,
      id: r.id,
      title: r.title,
      description: null,
      url: `/finance?account=${r.id}`,
      thumbnailUrl: null,
      matchField: 'name',
      matchSnippet: null,
    }));
  }
}
