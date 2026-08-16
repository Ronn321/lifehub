import { Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DbService, dashboardLayouts, dashboardDeviceLayouts, type Db } from '@lifehub/db';
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

  // ===================== Geräte-Layouts (Phase 2.5) =====================

  async getDeviceLayout(userId: string, deviceId: string): Promise<DashboardLayout | null> {
    const [row] = await this.db
      .select()
      .from(dashboardDeviceLayouts)
      .where(and(
        eq(dashboardDeviceLayouts.userId, userId),
        eq(dashboardDeviceLayouts.deviceId, deviceId),
      ));
    return (row?.layout as unknown as DashboardLayout) ?? null;
  }

  async upsertDeviceLayout(userId: string, deviceId: string, layout: DashboardLayout): Promise<void> {
    await this.db
      .insert(dashboardDeviceLayouts)
      .values({ userId, deviceId, layout: sql`${JSON.stringify(layout)}::jsonb`, updatedAt: sql`now()` })
      .onConflictDoUpdate({
        target: [dashboardDeviceLayouts.userId, dashboardDeviceLayouts.deviceId],
        set: { layout: sql`${JSON.stringify(layout)}::jsonb`, updatedAt: sql`now()` },
      });
  }

  async deleteDeviceLayout(userId: string, deviceId: string): Promise<void> {
    await this.db
      .delete(dashboardDeviceLayouts)
      .where(and(
        eq(dashboardDeviceLayouts.userId, userId),
        eq(dashboardDeviceLayouts.deviceId, deviceId),
      ));
  }
}
