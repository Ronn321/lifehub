export type InsuranceCategory = 'health' | 'liability' | 'car' | 'home' | 'life' | 'legal' | 'other';
export type InsuranceInterval = 'monthly' | 'quarterly' | 'yearly';

export interface InsurancePolicy {
  id: string;
  name: string;
  category: InsuranceCategory;
  provider: string;
  policyNumber: string | null;
  premium: string | null;
  interval: InsuranceInterval;
  startDate: string | null;
  endDate: string | null;
  cancellationPeriodDays: number | null;
  endsAt: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface InsuranceDocument {
  id: string;
  policyId: string;
  name: string;
  documentId: string | null;
  createdAt: string;
}

export interface InsurancePolicyWithDocuments extends InsurancePolicy {
  documents: InsuranceDocument[];
}
