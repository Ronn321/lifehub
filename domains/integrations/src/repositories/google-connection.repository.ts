import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DbService, googleConnections, type Db } from '@lifehub/db';

export interface UpsertConnectionData {
  googleEmail: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date | null;
  grantedScopes: string[];
}

/** Raw DB row of integrations.google_connections (timestamps as Date). */
export interface GoogleConnectionRow {
  id: string;
  ownerId: string;
  googleEmail: string;
  displayName: string | null;
  avatarUrl: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date | null;
  grantedScopes: string[];
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class GoogleConnectionRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async findByOwner(ownerId: string): Promise<GoogleConnectionRow | null> {
    const [row] = await this.db.select().from(googleConnections)
      .where(and(eq(googleConnections.ownerId, ownerId), isNull(googleConnections.deletedAt)));
    return row ?? null;
  }

  async upsert(ownerId: string, data: UpsertConnectionData): Promise<GoogleConnectionRow> {
    const existing = await this.findByOwner(ownerId);
    if (existing) {
      const [row] = await this.db.update(googleConnections)
        .set({
          googleEmail: data.googleEmail,
          displayName: data.displayName ?? null,
          avatarUrl: data.avatarUrl ?? null,
          accessTokenEnc: data.accessTokenEnc,
          refreshTokenEnc: data.refreshTokenEnc,
          tokenExpiresAt: data.tokenExpiresAt,
          grantedScopes: data.grantedScopes,
          deletedAt: null,
          updatedAt: sql`now()`,
        })
        .where(eq(googleConnections.id, existing.id))
        .returning();
      if (!row) {
        throw new Error('Failed to update Google connection');
      }
      return row;
    }
    const [row] = await this.db.insert(googleConnections)
      .values({
        ownerId,
        googleEmail: data.googleEmail,
        displayName: data.displayName ?? null,
        avatarUrl: data.avatarUrl ?? null,
        accessTokenEnc: data.accessTokenEnc,
        refreshTokenEnc: data.refreshTokenEnc,
        tokenExpiresAt: data.tokenExpiresAt,
        grantedScopes: data.grantedScopes,
      })
      .returning();
    if (!row) {
      throw new Error('Failed to create Google connection');
    }
    return row;
  }

  async disconnect(ownerId: string): Promise<void> {
    await this.db.update(googleConnections)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(googleConnections.ownerId, ownerId), isNull(googleConnections.deletedAt)));
  }

  async updateLastSyncAt(ownerId: string, at: Date = new Date()): Promise<void> {
    await this.db.update(googleConnections)
      .set({ lastSyncAt: at, updatedAt: sql`now()` })
      .where(and(eq(googleConnections.ownerId, ownerId), isNull(googleConnections.deletedAt)));
  }
}
