import { Injectable, NotFoundException } from '@nestjs/common';
import { InsuranceRepository } from '../repositories/insurance.repository.js';
import type { CreatePolicyInput, UpdatePolicyInput, AddDocumentInput } from '../dtos/insurance.dto.js';
import type { InsurancePolicyWithDocuments } from '../entities/insurance.js';

@Injectable()
export class InsuranceService {
  constructor(private readonly repo: InsuranceRepository) {}

  async listPolicies(ownerId: string) {
    return this.repo.findAllByOwner(ownerId);
  }

  async getPolicy(ownerId: string, id: string): Promise<InsurancePolicyWithDocuments> {
    const policy = await this.repo.findById(id, ownerId);
    if (!policy) throw new NotFoundException('Versicherung nicht gefunden');
    const documents = await this.repo.findDocumentsByPolicy(id);
    return { ...policy, documents };
  }

  async createPolicy(ownerId: string, input: CreatePolicyInput) {
    return this.repo.create({ ...input, ownerId });
  }

  async updatePolicy(ownerId: string, id: string, input: UpdatePolicyInput) {
    const policy = await this.repo.findById(id, ownerId);
    if (!policy) throw new NotFoundException('Versicherung nicht gefunden');
    const updated = await this.repo.update(id, ownerId, input as any);
    return updated!;
  }

  async deletePolicy(ownerId: string, id: string) {
    const policy = await this.repo.findById(id, ownerId);
    if (!policy) throw new NotFoundException('Versicherung nicht gefunden');
    await this.repo.softDelete(id, ownerId);
  }

  async addDocument(ownerId: string, policyId: string, input: AddDocumentInput) {
    const policy = await this.repo.findById(policyId, ownerId);
    if (!policy) throw new NotFoundException('Versicherung nicht gefunden');
    return this.repo.addDocument({ policyId, ...input });
  }
}
