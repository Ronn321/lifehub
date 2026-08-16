import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DashboardService } from '../../src/services/dashboard.service';

const layout = {
  widgets: [{ id: 'w1', type: 'weather', x: 0, y: 0, w: 1, h: 1 }],
};

function makeService(repo: Record<string, unknown>) {
  return new DashboardService(repo as never);
}

describe('DashboardService — Geräte-Layouts (Phase 2.5)', () => {
  const userId = 'user-1';
  const deviceId = 'phone-livingroom-1';

  describe('getDeviceLayout', () => {
    it('gibt das gespeicherte Geräte-Layout zurück', async () => {
      const repo = { getDeviceLayout: vi.fn().mockResolvedValue(layout) };
      const svc = makeService(repo);
      await expect(svc.getDeviceLayout(userId, deviceId)).resolves.toEqual(layout);
      expect(repo.getDeviceLayout).toHaveBeenCalledWith(userId, deviceId);
    });

    it('gibt null zurück, wenn kein Layout existiert (404-Fall)', async () => {
      const repo = { getDeviceLayout: vi.fn().mockResolvedValue(null) };
      const svc = makeService(repo);
      await expect(svc.getDeviceLayout(userId, deviceId)).resolves.toBeNull();
    });

    it('wirft InternalServerError bei Repository-Fehler', async () => {
      const repo = { getDeviceLayout: vi.fn().mockRejectedValue(new Error('db down')) };
      const svc = makeService(repo);
      await expect(svc.getDeviceLayout(userId, deviceId)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('saveDeviceLayout', () => {
    it('validiert und persistiert ein gültiges Layout (Upsert)', async () => {
      const repo = { upsertDeviceLayout: vi.fn().mockResolvedValue(undefined) };
      const svc = makeService(repo);
      const result = await svc.saveDeviceLayout(userId, deviceId, layout);
      expect(repo.upsertDeviceLayout).toHaveBeenCalledWith(userId, deviceId, layout);
      expect(result).toEqual(layout);
    });

    it('lehnt ein ungültiges Layout mit BadRequest ab (gleiche Validierung wie bestehendes PUT)', async () => {
      const repo = { upsertDeviceLayout: vi.fn() };
      const svc = makeService(repo);
      await expect(
        svc.saveDeviceLayout(userId, deviceId, { widgets: [{ id: 'x' }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.upsertDeviceLayout).not.toHaveBeenCalled();
    });

    it('wirft InternalServerError bei Repository-Fehler', async () => {
      const repo = { upsertDeviceLayout: vi.fn().mockRejectedValue(new Error('db down')) };
      const svc = makeService(repo);
      await expect(svc.saveDeviceLayout(userId, deviceId, layout)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('resetDeviceLayout', () => {
    it('löscht das persistierte Geräte-Layout und gibt Default-Widgets zurück', async () => {
      const repo = { deleteDeviceLayout: vi.fn().mockResolvedValue(undefined) };
      const svc = makeService(repo);
      const result = await svc.resetDeviceLayout(userId, deviceId);
      expect(repo.deleteDeviceLayout).toHaveBeenCalledWith(userId, deviceId);
      expect(result.widgets.length).toBeGreaterThan(0);
    });

    it('wirft InternalServerError bei Repository-Fehler', async () => {
      const repo = { deleteDeviceLayout: vi.fn().mockRejectedValue(new Error('db down')) };
      const svc = makeService(repo);
      await expect(svc.resetDeviceLayout(userId, deviceId)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
