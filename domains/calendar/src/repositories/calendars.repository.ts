import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { DbService, calendars, type Db } from '@lifehub/db';

/**
 * Row of the calendars table. `syncToken`, `lastSyncAt` and `isVisible` were
 * added by migration 0019 (not in the shared/db drizzle schema), so they are
 * read/written via raw SQL fragments here.
 */
export interface CalendarRow {
  id: string;
  name: string;
  color: string | null;
  source: string;
  externalId: string | null;
  ownerId: string;
  syncToken: string | null;
  lastSyncAt: Date | null;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const SELECT_COLS = {
  id: calendars.id,
  name: calendars.name,
  color: calendars.color,
  source: calendars.source,
  externalId: calendars.externalId,
  ownerId: calendars.ownerId,
  syncToken: sql`sync_token`.as('syncToken'),
  lastSyncAt: sql`last_sync_at`.as('lastSyncAt'),
  isVisible: sql`is_visible`.as('isVisible'),
  createdAt: calendars.createdAt,
  updatedAt: calendars.updatedAt,
  deletedAt: calendars.deletedAt,
} as const;

/**
 * Raw select/returning row: the migration-0019 columns are read via raw SQL
 * fragments, so drizzle types them as `unknown`. This maps them to the real
 * DB values (text / timestamptz / boolean).
 */
interface RawCalendarRow {
  id: string;
  name: string;
  color: string | null;
  source: string;
  externalId: string | null;
  ownerId: string;
  syncToken: unknown;
  lastSyncAt: unknown;
  isVisible: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function mapCalendarRow(r: RawCalendarRow): CalendarRow {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    source: r.source,
    externalId: r.externalId,
    ownerId: r.ownerId,
    syncToken: (r.syncToken as string | null) ?? null,
    lastSyncAt: r.lastSyncAt ? (r.lastSyncAt as Date) : null,
    isVisible: r.isVisible as boolean,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  };
}

export class CalendarsRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async findByOwner(ownerId: string): Promise<CalendarRow[]> {
    const rows = await this.db.select(SELECT_COLS).from(calendars)
      .where(and(eq(calendars.ownerId, ownerId), isNull(calendars.deletedAt)))
      .orderBy(calendars.name);
    return rows.map(mapCalendarRow);
  }

  async findById(ownerId: string, id: string): Promise<CalendarRow | null> {
    const [row] = await this.db.select(SELECT_COLS).from(calendars)
      .where(and(eq(calendars.id, id), eq(calendars.ownerId, ownerId), isNull(calendars.deletedAt)));
    return row ? mapCalendarRow(row) : null;
  }

  async findGoogleCalendars(ownerId: string): Promise<CalendarRow[]> {
    const rows = await this.db.select(SELECT_COLS).from(calendars)
      .where(and(
        eq(calendars.ownerId, ownerId),
        eq(calendars.source, 'google'),
        isNull(calendars.deletedAt),
      ))
      .orderBy(calendars.name);
    return rows.map(mapCalendarRow);
  }

  async ensureLocalDefault(ownerId: string): Promise<CalendarRow> {
    const [existing] = await this.db.select(SELECT_COLS).from(calendars)
      .where(and(eq(calendars.ownerId, ownerId), eq(calendars.source, 'local'), isNull(calendars.deletedAt)))
      .limit(1);
    if (existing) return mapCalendarRow(existing);
    const [row] = await this.db.insert(calendars).values({
      ownerId,
      name: 'Mein Kalender',
      color: '#d97706',
      source: 'local',
    }).returning({
      id: calendars.id,
      name: calendars.name,
      color: calendars.color,
      source: calendars.source,
      externalId: calendars.externalId,
      ownerId: calendars.ownerId,
      syncToken: sql`sync_token`.as('syncToken'),
      lastSyncAt: sql`last_sync_at`.as('lastSyncAt'),
      isVisible: sql`is_visible`.as('isVisible'),
      createdAt: calendars.createdAt,
      updatedAt: calendars.updatedAt,
      deletedAt: calendars.deletedAt,
    });
    if (!row) throw new Error('Failed to create local calendar');
    return mapCalendarRow(row);
  }

  async upsertBySource(
    ownerId: string,
    source: string,
    externalId: string,
    data: { title: string; color?: string },
  ): Promise<CalendarRow> {
    const [row] = await this.db.insert(calendars)
      .values({
        ownerId,
        name: data.title,
        color: data.color ?? null,
        source,
        externalId,
      })
      .onConflictDoUpdate({
        target: [calendars.ownerId, calendars.source, calendars.externalId],
        targetWhere: isNull(calendars.deletedAt),
        set: {
          name: data.title,
          color: data.color ?? null,
          deletedAt: null,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: calendars.id,
        name: calendars.name,
        color: calendars.color,
        source: calendars.source,
        externalId: calendars.externalId,
        ownerId: calendars.ownerId,
        syncToken: sql`sync_token`.as('syncToken'),
        lastSyncAt: sql`last_sync_at`.as('lastSyncAt'),
        isVisible: sql`is_visible`.as('isVisible'),
        createdAt: calendars.createdAt,
        updatedAt: calendars.updatedAt,
        deletedAt: calendars.deletedAt,
      });
    if (!row) throw new Error('Failed to upsert google calendar');
    return mapCalendarRow(row);
  }

  async setVisible(id: string, ownerId: string, isVisible: boolean): Promise<void> {
    await this.db.execute(sql`UPDATE calendars SET is_visible = ${isVisible}, updated_at = now() WHERE id = ${id} AND owner_id = ${ownerId}`);
  }

  async updateSyncToken(id: string, token: string | null): Promise<void> {
    await this.db.execute(sql`UPDATE calendars SET sync_token = ${token}, updated_at = now() WHERE id = ${id}`);
  }

  async touchLastSync(id: string, at: Date = new Date()): Promise<void> {
    await this.db.execute(sql`UPDATE calendars SET last_sync_at = ${at}, updated_at = now() WHERE id = ${id}`);
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.db.update(calendars)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(calendars.id, id), eq(calendars.ownerId, ownerId)));
  }

  /** DISTINCT owners that have at least one selected google calendar (for cron). */
  async findGoogleOwners(): Promise<string[]> {
    const rows = await this.db.selectDistinct({ ownerId: calendars.ownerId }).from(calendars)
      .where(and(eq(calendars.source, 'google'), isNull(calendars.deletedAt)));
    return rows.map((r) => r.ownerId);
  }
}
