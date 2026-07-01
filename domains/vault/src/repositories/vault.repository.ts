import { Inject } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DbService, vaultEntries, type Db } from '@lifehub/db';
import type { VaultEntry } from '../entities/vault.js';

export class VaultRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async findAllByOwner(ownerId: string): Promise<VaultEntry[]> {
    return this.db
      .select()
      .from(vaultEntries)
      .where(and(eq(vaultEntries.ownerId, ownerId), isNull(vaultEntries.deletedAt)))
      .orderBy(vaultEntries.name) as unknown as VaultEntry[];
  }

  async findById(id: string, ownerId: string): Promise<VaultEntry | null> {
    const [row] = await this.db
      .select()
      .from(vaultEntries)
      .where(and(eq(vaultEntries.id, id), eq(vaultEntries.ownerId, ownerId), isNull(vaultEntries.deletedAt)))
      .limit(1);
    return (row as unknown as VaultEntry) ?? null;
  }

  async create(data: {
    name: string; type?: string; ownerId: string;
    username?: string | null; encryptedPassword?: string | null;
    url?: string | null; notes?: string | null;
    totpSecret?: string | null; cardLast4?: string | null;
    cardBrand?: string | null; keyVersion?: number;
  }): Promise<VaultEntry> {
    const [row] = await this.db
      .insert(vaultEntries)
      .values({
        name: data.name,
        type: data.type ?? 'login',
        username: data.username ?? null,
        encryptedPassword: data.encryptedPassword ?? null,
        url: data.url ?? null,
        notes: data.notes ?? null,
        totpSecret: data.totpSecret ?? null,
        cardLast4: data.cardLast4 ?? null,
        cardBrand: data.cardBrand ?? null,
        keyVersion: data.keyVersion ?? 1,
        ownerId: data.ownerId,
      } as any)
      .returning();
    return row as unknown as VaultEntry;
  }

  async update(id: string, ownerId: string, data: Partial<VaultEntry>): Promise<VaultEntry | null> {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    const fields: (keyof VaultEntry)[] = [
      'name', 'type', 'username', 'encryptedPassword', 'url', 'notes',
      'totpSecret', 'cardLast4', 'cardBrand', 'keyVersion',
    ];
    for (const f of fields) {
      if (f in data) values[f] = data[f];
    }
    const [row] = await this.db
      .update(vaultEntries)
      .set(values as any)
      .where(and(eq(vaultEntries.id, id), eq(vaultEntries.ownerId, ownerId)))
      .returning();
    return (row as unknown as VaultEntry) ?? null;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.db
      .update(vaultEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() } as any)
      .where(and(eq(vaultEntries.id, id), eq(vaultEntries.ownerId, ownerId)));
  }
}
