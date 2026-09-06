import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MediaService } from '../../src/services/media.service';
import { MediaLockService } from '../../src/services/media-lock.service';

const OWNER = '11111111-1111-4111-8111-111111111111';
const FILE_ID = '22222222-2222-4222-8222-222222222222';
const TAG_ID = '33333333-3333-4333-8333-333333333333';

const baseFile = {
  id: FILE_ID,
  ownerId: OWNER,
  sourceId: 's1',
  filename: 'img.jpg',
  relativePath: 'img.jpg',
  mimeType: 'image/jpeg',
  locked: false,
  deletedAt: null,
};

function makeMediaService(repo: Record<string, unknown>) {
  return new MediaService(repo as never);
}

function makeLockService(repo: Record<string, unknown>) {
  return new MediaLockService(repo as never);
}

describe('MediaService.listFiles — Filter + Count-Parität', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let svc: MediaService;

  beforeEach(() => {
    repo = {
      findFilesByOwner: vi.fn().mockResolvedValue([]),
      countFilesByOwner: vi.fn().mockResolvedValue(0),
    };
    svc = makeMediaService(repo);
  });

  it('reicht tagId/hasGps/type an Liste UND Count weiter (konsistente Totals)', async () => {
    const opts = { tagId: TAG_ID, hasGps: true, type: 'image' as const, limit: 10, offset: 5 };
    await svc.listFiles(OWNER, opts);
    expect(repo.findFilesByOwner).toHaveBeenCalledWith(OWNER, opts);
    // Entscheidend: count bekommt DIESELBEN Filter (kein (sourceId, favorite)-Drift mehr)
    expect(repo.countFilesByOwner).toHaveBeenCalledWith(OWNER, opts);
  });

  it('gibt {items, total} zurück', async () => {
    repo.findFilesByOwner.mockResolvedValue([baseFile]);
    repo.countFilesByOwner.mockResolvedValue(1);
    await expect(svc.listFiles(OWNER, {})).resolves.toEqual({ items: [baseFile], total: 1 });
  });
});

describe('MediaService Tags — Reuse + PUT-Assign', () => {
  it('createAndAssignTag: nutzt existierenden Tag (kein Unique-Verstoß)', async () => {
    const existingTag = { id: TAG_ID, ownerId: OWNER, domain: 'media', name: 'Urlaub' };
    const repo = {
      findFileById: vi.fn().mockResolvedValue(baseFile),
      findTagByOwnerDomainName: vi.fn().mockResolvedValue(existingTag),
      createTag: vi.fn(),
      assignTagToFile: vi.fn().mockResolvedValue(undefined),
    };
    const svc = makeMediaService(repo);
    const result = await svc.createAndAssignTag(OWNER, FILE_ID, { name: 'Urlaub' });
    expect(result).toEqual(existingTag);
    expect(repo.createTag).not.toHaveBeenCalled();
    expect(repo.findTagByOwnerDomainName).toHaveBeenCalledWith(OWNER, 'media', 'Urlaub');
    expect(repo.assignTagToFile).toHaveBeenCalledWith(FILE_ID, TAG_ID);
  });

  it('createAndAssignTag: legt Tag an, wenn keiner existiert', async () => {
    const fresh = { id: TAG_ID, ownerId: OWNER, domain: 'media', name: 'Neu' };
    const repo = {
      findFileById: vi.fn().mockResolvedValue(baseFile),
      findTagByOwnerDomainName: vi.fn().mockResolvedValue(null),
      createTag: vi.fn().mockResolvedValue(fresh),
      assignTagToFile: vi.fn().mockResolvedValue(undefined),
    };
    const svc = makeMediaService(repo);
    await expect(svc.createAndAssignTag(OWNER, FILE_ID, { name: 'Neu' })).resolves.toEqual(fresh);
    expect(repo.createTag).toHaveBeenCalledWith({ ownerId: OWNER, domain: 'media', name: 'Neu' });
  });

  it('assignExistingTag: gibt {tagId, tagName, tagColor} zurück, idempotent', async () => {
    const tag = { id: TAG_ID, name: 'Urlaub', color: '#fff' };
    const repo = {
      findFileById: vi.fn().mockResolvedValue(baseFile),
      findTagById: vi.fn().mockResolvedValue(tag),
      assignTagToFile: vi.fn().mockResolvedValue(undefined),
    };
    const svc = makeMediaService(repo);
    await expect(svc.assignExistingTag(OWNER, FILE_ID, TAG_ID)).resolves.toEqual({
      tagId: TAG_ID,
      tagName: 'Urlaub',
      tagColor: '#fff',
    });
    expect(repo.findTagById).toHaveBeenCalledWith(TAG_ID, OWNER);
  });

  it('assignExistingTag: 404 bei fremdem/fehlendem Tag', async () => {
    const repo = {
      findFileById: vi.fn().mockResolvedValue(baseFile),
      findTagById: vi.fn().mockResolvedValue(null),
      assignTagToFile: vi.fn(),
    };
    const svc = makeMediaService(repo);
    await expect(svc.assignExistingTag(OWNER, FILE_ID, TAG_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.assignTagToFile).not.toHaveBeenCalled();
  });
});

describe('MediaLockService — PIN-Flow', () => {
  const PIN = '1234';

  it('pinStatus: false ohne PIN, true mit PIN', async () => {
    await expect(makeLockService({ findLockPinByOwner: vi.fn().mockResolvedValue(null) }).pinStatus(OWNER))
      .resolves.toEqual({ hasPin: false });
    await expect(
      makeLockService({ findLockPinByOwner: vi.fn().mockResolvedValue({ pinHash: 'x' }) }).pinStatus(OWNER),
    ).resolves.toEqual({ hasPin: true });
  });

  it('setPin: Erst-PIN ohne oldPin', async () => {
    const repo = {
      findLockPinByOwner: vi.fn().mockResolvedValue(null),
      upsertLockPin: vi.fn().mockResolvedValue({}),
    };
    await expect(makeLockService(repo).setPin(OWNER, PIN)).resolves.toEqual({ success: true });
    const stored: string = repo.upsertLockPin.mock.calls[0][1];
    expect(stored).toMatch(/^scrypt\$/);
    expect(stored).not.toContain(PIN);
  });

  it('setPin: Änderung verlangt oldPin (403 ohne / bei falscher PIN)', async () => {
    const svc0 = makeLockService({
      findLockPinByOwner: vi.fn().mockResolvedValue({ pinHash: 'scrypt$00$00' }),
      upsertLockPin: vi.fn(),
    });
    await expect(svc0.setPin(OWNER, '5678')).rejects.toMatchObject({ status: 403 });

    // Echte Runde: PIN setzen, dann mit korrekter/falscher oldPin ändern
    const store: { hash: string } = { hash: '' };
    const repo = {
      findLockPinByOwner: vi.fn().mockImplementation(() => Promise.resolve(store.hash ? { pinHash: store.hash } : null)),
      upsertLockPin: vi.fn().mockImplementation((_o: string, h: string) => {
        store.hash = h;
        return Promise.resolve({});
      }),
    };
    const svc = makeLockService(repo);
    await svc.setPin(OWNER, PIN);
    await expect(svc.setPin(OWNER, '5678', 'falsch')).rejects.toMatchObject({ status: 403 });
    await expect(svc.setPin(OWNER, '5678', PIN)).resolves.toEqual({ success: true });
  });

  it('lockFile: 409 ohne gesetzte PIN', async () => {
    const svc = makeLockService({ findLockPinByOwner: vi.fn().mockResolvedValue(null) });
    await expect(svc.lockFile(OWNER, FILE_ID)).rejects.toMatchObject({ status: 409 });
  });

  it('lockFile: sperrt bei gesetzter PIN', async () => {
    const repo = {
      findLockPinByOwner: vi.fn().mockResolvedValue({ pinHash: 'x' }),
      findFileById: vi.fn().mockResolvedValue(baseFile),
      setFileLocked: vi.fn().mockResolvedValue({ ...baseFile, locked: true }),
    };
    await makeLockService(repo).lockFile(OWNER, FILE_ID);
    expect(repo.setFileLocked).toHaveBeenCalledWith(FILE_ID, OWNER, true);
  });

  it('unlockFile: entsperrt (Token-Prüfung liegt im Controller)', async () => {
    const repo = {
      findFileById: vi.fn().mockResolvedValue({ ...baseFile, locked: true }),
      setFileLocked: vi.fn().mockResolvedValue({ ...baseFile, locked: false }),
    };
    await makeLockService(repo).unlockFile(OWNER, FILE_ID);
    expect(repo.setFileLocked).toHaveBeenCalledWith(FILE_ID, OWNER, false);
  });

  it('extractLockToken: Query gewinnt, sonst "Lock "-Scheme (kein Bearer)', async () => {
    const svc = makeLockService({});
    expect(svc.extractLockToken('q', 'Lock h')).toBe('q');
    expect(svc.extractLockToken(undefined, 'Lock abc')).toBe('abc');
    expect(svc.extractLockToken(undefined, 'Bearer xyz')).toBeUndefined();
    expect(svc.extractLockToken(undefined, undefined)).toBeUndefined();
  });

  it('isValidLockToken: false ohne Token', async () => {
    await expect(makeLockService({}).isValidLockToken(OWNER, undefined)).resolves.toBe(false);
  });
});
