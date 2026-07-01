import { Injectable, Inject, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DEFAULT_WIDGETS } from '../dtos/dashboard.dto';
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
}
