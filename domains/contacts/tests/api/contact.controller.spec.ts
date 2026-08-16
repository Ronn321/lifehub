import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { ContactController } from '../../src/api/contact.controller';
import { ContactService } from '../../src/services/contact.service';
import { JwtGuard } from '@lifehub/auth';
import { PermissionGuard } from '@lifehub/permissions';

const service = {
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

function authGuardValue(user?: { sub: string }) {
  return {
    canActivate: (ctx: { switchToHttp: () => { getRequest: () => Record<string, unknown> } }) => {
      if (!user) throw new UnauthorizedException('Missing token');
      ctx.switchToHttp().getRequest().user = user;
      return true;
    },
  };
}

async function createApp(authUser?: { sub: string }): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ContactController],
    providers: [{ provide: ContactService, useValue: service }],
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

describe('ContactController (API)', () => {
  it('returns 401 when no token is provided', async () => {
    const app = await createApp();
    await request(app.getHttpServer()).get('/api/v1/contacts').expect(401);
    await app.close();
  });

  it('POST /api/v1/contacts creates a contact', async () => {
    service.create.mockResolvedValue({ id: 'c1', name: 'Max' });
    const app = await createApp({ sub: 'owner-1' });
    const res = await request(app.getHttpServer())
      .post('/api/v1/contacts')
      .send({ name: 'Max' })
      .expect(201);
    expect(res.body.id).toBe('c1');
    expect(service.create).toHaveBeenCalledWith('owner-1', { name: 'Max' });
    await app.close();
  });

  it('GET /api/v1/contacts lists contacts with search + pagination', async () => {
    service.list.mockResolvedValue({ items: [], total: 0 });
    const app = await createApp({ sub: 'owner-1' });
    const res = await request(app.getHttpServer())
      .get('/api/v1/contacts?q=ma&page=1&pageSize=10')
      .expect(200);
    expect(service.list).toHaveBeenCalledWith('owner-1', { q: 'ma', page: 1, pageSize: 10 });
    expect(res.body).toEqual({ items: [], total: 0 });
    await app.close();
  });

  it('GET /api/v1/contacts/:id returns 404 for a foreign/unknown contact (ownership)', async () => {
    service.get.mockRejectedValue(new NotFoundException('Kontakt nicht gefunden'));
    const app = await createApp({ sub: 'owner-1' });
    await request(app.getHttpServer()).get('/api/v1/contacts/foreign-id').expect(404);
    await app.close();
  });

  it('PUT /api/v1/contacts/:id updates a contact', async () => {
    service.update.mockResolvedValue({ id: 'c1', name: 'Neu' });
    const app = await createApp({ sub: 'owner-1' });
    const res = await request(app.getHttpServer())
      .put('/api/v1/contacts/c1')
      .send({ name: 'Neu' })
      .expect(200);
    expect(res.body.name).toBe('Neu');
    expect(service.update).toHaveBeenCalledWith('owner-1', 'c1', { name: 'Neu' });
    await app.close();
  });

  it('DELETE /api/v1/contacts/:id returns 204', async () => {
    service.remove.mockResolvedValue(undefined);
    const app = await createApp({ sub: 'owner-1' });
    await request(app.getHttpServer()).delete('/api/v1/contacts/c1').expect(204);
    expect(service.remove).toHaveBeenCalledWith('owner-1', 'c1');
    await app.close();
  });
});
