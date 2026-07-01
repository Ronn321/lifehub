import { Injectable, NotFoundException } from '@nestjs/common';
import { VaultRepository } from '../repositories/vault.repository.js';
import type { CreateVaultEntryInput, UpdateVaultEntryInput } from '../dtos/vault.dto.js';

@Injectable()
export class VaultService {
  constructor(private readonly repo: VaultRepository) {}

  async listEntries(ownerId: string) {
    return this.repo.findAllByOwner(ownerId);
  }

  async getEntry(ownerId: string, id: string) {
    const entry = await this.repo.findById(id, ownerId);
    if (!entry) throw new NotFoundException('Eintrag nicht gefunden');
    return entry;
  }

  async createEntry(ownerId: string, input: CreateVaultEntryInput) {
    return this.repo.create({ ...input, ownerId });
  }

  async updateEntry(ownerId: string, id: string, input: UpdateVaultEntryInput) {
    const entry = await this.repo.findById(id, ownerId);
    if (!entry) throw new NotFoundException('Eintrag nicht gefunden');
    const updated = await this.repo.update(id, ownerId, input as any);
    return updated!;
  }

  async deleteEntry(ownerId: string, id: string) {
    const entry = await this.repo.findById(id, ownerId);
    if (!entry) throw new NotFoundException('Eintrag nicht gefunden');
    await this.repo.softDelete(id, ownerId);
  }

  async generateTotp(ownerId: string, id: string): Promise<{ code: string; period: number }> {
    const entry = await this.repo.findById(id, ownerId);
    if (!entry) throw new NotFoundException('Eintrag nicht gefunden');
    if (!entry.totpSecret) throw new NotFoundException('Kein TOTP-Secret hinterlegt');

    const { authenticator } = await import('otplib');
    const code = authenticator.generate(entry.totpSecret);
    return { code, period: 30 };
  }
}
