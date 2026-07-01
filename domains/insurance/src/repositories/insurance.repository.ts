import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DbService, insurancePolicies, insuranceDocuments, type Db } from '@lifehub/db';
import type { InsurancePolicy, InsuranceDocument } from '../entities/insurance.js';

export class InsuranceRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async findAllByOwner(ownerId: string): Promise<InsurancePolicy[]> {
    return this.db
      .select()
      .from(insurancePolicies)
      .where(and(eq(insurancePolicies.ownerId, ownerId), isNull(insurancePolicies.deletedAt)))
      .orderBy(insurancePolicies.name) as unknown as InsurancePolicy[];
  }

  async findById(id: string, ownerId: string): Promise<InsurancePolicy | null> {
    const [row] = await this.db
      .select()
      .from(insurancePolicies)
      .where(and(eq(insurancePolicies.id, id), eq(insurancePolicies.ownerId, ownerId), isNull(insurancePolicies.deletedAt)))
      .limit(1);
    return (row as unknown as InsurancePolicy) ?? null;
  }

  async findDocumentsByPolicy(policyId: string): Promise<InsuranceDocument[]> {
    return this.db
      .select()
      .from(insuranceDocuments)
      .where(eq(insuranceDocuments.policyId, policyId))
      .orderBy(insuranceDocuments.createdAt) as unknown as InsuranceDocument[];
  }

  async create(data: {
    name: string; category: string; provider: string; ownerId: string;
    policyNumber?: string | null; premium?: string | null; interval?: string;
    startDate?: string | null; endDate?: string | null; cancellationPeriodDays?: number | null;
    endsAt?: string | null; contactName?: string | null; contactPhone?: string | null;
    contactEmail?: string | null; notes?: string | null;
  }): Promise<InsurancePolicy> {
    const [row] = await this.db
      .insert(insurancePolicies)
      .values({
        name: data.name,
        category: data.category,
        provider: data.provider,
        policyNumber: data.policyNumber ?? null,
        premium: data.premium ?? null,
        interval: data.interval ?? 'monthly',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        cancellationPeriodDays: data.cancellationPeriodDays ?? null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        contactName: data.contactName ?? null,
        contactPhone: data.contactPhone ?? null,
        contactEmail: data.contactEmail ?? null,
        notes: data.notes ?? null,
        ownerId: data.ownerId,
      } as any)
      .returning();
    return row as unknown as InsurancePolicy;
  }

  async update(id: string, ownerId: string, data: Partial<InsurancePolicy>): Promise<InsurancePolicy | null> {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    const directFields: (keyof InsurancePolicy)[] = [
      'name', 'category', 'provider', 'premium', 'interval',
      'cancellationPeriodDays', 'contactName', 'contactPhone',
      'contactEmail', 'notes',
    ];
    for (const f of directFields) {
      if (f in data) values[f] = data[f];
    }
    if ('policyNumber' in data) values['policyNumber'] = data.policyNumber;
    if ('startDate' in data) values['startDate'] = data.startDate ? new Date(data.startDate) : null;
    if ('endDate' in data) values['endDate'] = data.endDate ? new Date(data.endDate) : null;
    if ('endsAt' in data) values['endsAt'] = data.endsAt ? new Date(data.endsAt) : null;
    const [row] = await this.db
      .update(insurancePolicies)
      .set(values as any)
      .where(and(eq(insurancePolicies.id, id), eq(insurancePolicies.ownerId, ownerId)))
      .returning();
    return (row as unknown as InsurancePolicy) ?? null;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.db
      .update(insurancePolicies)
      .set({ deletedAt: new Date(), updatedAt: new Date() } as any)
      .where(and(eq(insurancePolicies.id, id), eq(insurancePolicies.ownerId, ownerId)));
  }

  async addDocument(data: {
    policyId: string; name: string; documentId?: string | null;
  }): Promise<InsuranceDocument> {
    const [row] = await this.db
      .insert(insuranceDocuments)
      .values({
        policyId: data.policyId,
        name: data.name,
        documentId: data.documentId ?? null,
      } as any)
      .returning();
    return row as unknown as InsuranceDocument;
  }
}
