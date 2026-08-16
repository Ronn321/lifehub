import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { DashboardController } from '../../src/api/dashboard.controller';
import { DashboardService } from '../../src/services/dashboard.service';
import { JwtGuard } from '@lifehub/auth';
import { PermissionGuard } from '@lifehub/permissions';

const service = {
  getLayout: vi.fn(),
  saveLayout: vi.fn(),
  resetLayout: vi.fn(),
  getDeviceLayout: vi.fn(),
  saveDeviceLayout: vi.fn(),
  resetDeviceLayout: vi.fn(),
};

function authGuardValue(user?: { sub: string }) {
  return {
    canActivate: async (ctx: { switchToHttp: () => { getRequest: () => Record<string, unknown> } }) => {
      if (!user) throw new UnauthorizedException('Missing token');
      ctx.switchToHttp().getRequest().user = user;
      return true;
    },
  };
}

async function createApp(authUser?: { sub: string }): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [DashboardController],
    providers: [{ provide: DashboardService, useValue: service }],
  })
    .overrideGuard(JwtGuard)
    .useValue(authGuardValue(authUser))
    .overrideGuard(PermissionGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardController (API) — Geräte-Layouts (Phase 2.5)', () => {
  const layout = {
    widgets: [{ id: 'w1', type: 'weather', x: 0, y: 0, w: 1, h: 1 }],
  };

  it('liefert 401 ohne Token', async () => {
    const app = await createApp();
    await request(app.getHttpServer()).get('/api/v1/dashboard/layout/device/phone-livingroom').expect(401);
    await app.close();
  });

  it('GET /api/v1/dashboard/layout/device/:deviceId liefert 200 mit Layout', async () => {
    service.getDeviceLayout.mockResolvedValue(layout);
    const app = await createApp({ sub: 'user-1' });
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/layout/device/phone-livingroom')
      .expect(200);
    expect(service.getDeviceLayout).toHaveBeenCalledWith('user-1', 'phone-livingroom');
    expect(res.body).toEqual(layout);
    await app.close();
  });

  it('GET /api/v1/dashboard/layout/device/:deviceId liefert 404, wenn kein Layout existiert', async () => {
    service.getDeviceLayout.mockResolvedValue(null);
    const app = await createApp({ sub: 'user-1' });
    await request(app.getHttpServer()).get('/api/v1/dashboard/layout/device/unknown').expect(404);
    await app.close();
  });

  it('GET .../device/:deviceId lehnt eine ungültige deviceId mit 400 ab', async () => {
    const app = await createApp({ sub: 'user-1' });
    await request(app.getHttpServer()).get('/api/v1/dashboard/layout/device/bad%20id').expect(400);
    await app.close();
  });

  it('PUT /api/v1/dashboard/layout/device/:deviceId speichert ein Geräte-Layout', async () => {
    service.saveDeviceLayout.mockResolvedValue(layout);
    const app = await createApp({ sub: 'user-1' });
    const res = await request(app.getHttpServer())
      .put('/api/v1/dashboard/layout/device/phone-livingroom')
      .send(layout)
      .expect(200);
    expect(service.saveDeviceLayout).toHaveBeenCalledWith('user-1', 'phone-livingroom', layout);
    expect(res.body).toEqual(layout);
    await app.close();
  });

  it('POST /api/v1/dashboard/layout/device/:deviceId/reset setzt das Geräte-Layout zurück', async () => {
    service.resetDeviceLayout.mockResolvedValue(layout);
    const app = await createApp({ sub: 'user-1' });
    const res = await request(app.getHttpServer())
      .post('/api/v1/dashboard/layout/device/phone-livingroom/reset')
      .expect(200);
    expect(service.resetDeviceLayout).toHaveBeenCalledWith('user-1', 'phone-livingroom');
    expect(res.body).toEqual(layout);
    await app.close();
  });
});
