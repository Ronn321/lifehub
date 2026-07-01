import { Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DbService, dashboardLayouts, type Db } from '@lifehub/db';
import type { DashboardLayout } from '../entities/dashboard';

export class DashboardRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async getLayout(userId: string): Promise<DashboardLayout | null> {
    const [row] = await this.db
      .select()
      .from(dashboardLayouts)
      .where(eq(dashboardLayouts.userId, userId));
    return (row?.layout as unknown as DashboardLayout) ?? null;
  }

  async upsertLayout(userId: string, layout: DashboardLayout): Promise<void> {
    await this.db
      .insert(dashboardLayouts)
      .values({ userId, layout: sql`${JSON.stringify(layout)}::jsonb`, updatedAt: sql`now()` })
      .onConflictDoUpdate({
        target: dashboardLayouts.userId,
        set: { layout: sql`${JSON.stringify(layout)}::jsonb`, updatedAt: sql`now()` },
      });
  }
}
