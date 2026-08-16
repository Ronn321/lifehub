import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ContactService } from '../../src/services/contact.service';

const baseContact = {
  id: 'c1',
  ownerId: 'owner-1',
  name: 'Max Mustermann',
  email: null,
  phone: null,
  notes: null,
  color: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

function makeService(repo: Record<string, unknown>) {
  return new ContactService(repo as never);
}

describe('ContactService', () => {
  const ownerId = 'owner-1';

  describe('create', () => {
    it('delegates to the repository with ownerId', async () => {
      const repo = { create: vi.fn().mockResolvedValue(baseContact) };
      const svc = makeService(repo);
      const result = await svc.create(ownerId, { name: 'Max Mustermann' });
      expect(repo.create).toHaveBeenCalledWith({ name: 'Max Mustermann', ownerId });
      expect(result).toEqual(baseContact);
    });
  });

  describe('get', () => {
    it('returns the contact when it belongs to the owner', async () => {
      const repo = { findById: vi.fn().mockResolvedValue(baseContact) };
      const svc = makeService(repo);
      await expect(svc.get(ownerId, 'c1')).resolves.toEqual(baseContact);
      expect(repo.findById).toHaveBeenCalledWith('c1', ownerId);
    });

    it('throws NotFound when the contact is missing or belongs to another user', async () => {
      const repo = { findById: vi.fn().mockResolvedValue(null) };
      const svc = makeService(repo);
      await expect(svc.get(ownerId, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    it('forwards query params to the repository', async () => {
      const repo = { list: vi.fn().mockResolvedValue({ items: [], total: 0 }) };
      const svc = makeService(repo);
      const result = await svc.list(ownerId, { q: 'max', page: 2, pageSize: 20 });
      expect(repo.list).toHaveBeenCalledWith(ownerId, 'max', 2, 20);
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('update', () => {
    it('throws NotFound for a foreign/unknown contact and never touches the repository update', async () => {
      const repo = { findById: vi.fn().mockResolvedValue(null), update: vi.fn() };
      const svc = makeService(repo);
      await expect(svc.update(ownerId, 'foreign', { name: 'Neu' })).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('updates the contact when the owner matches', async () => {
      const repo = {
        findById: vi.fn().mockResolvedValue(baseContact),
        update: vi.fn().mockResolvedValue({ ...baseContact, name: 'Neu' }),
      };
      const svc = makeService(repo);
      const result = await svc.update(ownerId, 'c1', { name: 'Neu' });
      expect(repo.update).toHaveBeenCalledWith('c1', ownerId, { name: 'Neu' });
      expect(result.name).toBe('Neu');
    });
  });

  describe('remove', () => {
    it('soft-deletes the contact when the owner matches', async () => {
      const repo = {
        findById: vi.fn().mockResolvedValue(baseContact),
        softDelete: vi.fn().mockResolvedValue(undefined),
      };
      const svc = makeService(repo);
      await svc.remove(ownerId, 'c1');
      expect(repo.softDelete).toHaveBeenCalledWith('c1', ownerId);
    });

    it('throws NotFound for a foreign/unknown contact', async () => {
      const repo = { findById: vi.fn().mockResolvedValue(null), softDelete: vi.fn() };
      const svc = makeService(repo);
      await expect(svc.remove(ownerId, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
