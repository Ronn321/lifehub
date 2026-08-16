import { Injectable, Inject, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DEFAULT_WIDGETS, layoutSchema } from '../dtos/dashboard.dto';
import type { DashboardLayout, DashboardWidget } from '../entities/dashboard';

@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  private generateDefaultWidgets(): DashboardWidget[] {
    return DEFAULT_WIDGETS.map((w, i) => ({
      id: `widget-${w.type}`,
      type: w.type,
      x: (i % 2) * w.w,
      y: Math.floor(i / 2) * 2,
      w: w.w,
      h: w.h,
    }));
  }

  async getLayout(userId: string): Promise<DashboardLayout> {
    try {
      const saved = await this.repo.getLayout(userId);
      if (saved) return saved;
      return { widgets: this.generateDefaultWidgets() };
    } catch {
      throw new InternalServerErrorException('Layout konnte nicht geladen werden');
    }
  }

  async saveLayout(userId: string, layout: DashboardLayout): Promise<DashboardLayout> {
    try {
      await this.repo.upsertLayout(userId, layout);
      return layout;
    } catch {
      throw new InternalServerErrorException('Layout konnte nicht gespeichert werden');
    }
  }

  async resetLayout(userId: string): Promise<DashboardLayout> {
    const layout: DashboardLayout = { widgets: this.generateDefaultWidgets() };
    try {
      await this.repo.upsertLayout(userId, layout);
      return layout;
    } catch {
      throw new InternalServerErrorException('Layout konnte nicht zurückgesetzt werden');
    }
  }

  // ===================== Geräte-Layouts (Phase 2.5) =====================

  // 404-Fall: gibt null zurück (kein Eintrag für user+device). Controller
  // übersetzt das in ein NotFoundException.
  async getDeviceLayout(userId: string, deviceId: string): Promise<DashboardLayout | null> {
    try {
      return await this.repo.getDeviceLayout(userId, deviceId);
    } catch {
      throw new InternalServerErrorException('Geräte-Layout konnte nicht geladen werden');
    }
  }

  // Validiert das Layout mit der selben Funktion wie das bestehende PUT
  // (layoutSchema) und persistiert es als Upsert.
  async saveDeviceLayout(userId: string, deviceId: string, layout: unknown): Promise<DashboardLayout> {
    const parsed = layoutSchema.safeParse(layout);
    if (!parsed.success) throw new BadRequestException(parsed.error.errors);
    try {
      await this.repo.upsertDeviceLayout(userId, deviceId, parsed.data);
      return parsed.data;
    } catch {
      throw new InternalServerErrorException('Geräte-Layout konnte nicht gespeichert werden');
    }
  }

  // Entfernt das persistierte Geräte-Layout → nächster GET liefert 404 und
  // das Gerät seedet wieder Profil-Defaults (Reinstall-Recovery).
  async resetDeviceLayout(userId: string, deviceId: string): Promise<DashboardLayout> {
    const layout: DashboardLayout = { widgets: this.generateDefaultWidgets() };
    try {
      await this.repo.deleteDeviceLayout(userId, deviceId);
      return layout;
    } catch {
      throw new InternalServerErrorException('Geräte-Layout konnte nicht zurückgesetzt werden');
    }
  }
}
