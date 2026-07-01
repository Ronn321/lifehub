import { z } from 'zod';

export const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['health', 'liability', 'car', 'home', 'life', 'legal', 'other']),
  provider: z.string().min(1).max(255),
  policyNumber: z.string().max(100).optional(),
  premium: z.string().max(50).optional(),
  interval: z.enum(['monthly', 'quarterly', 'yearly']).optional().default('monthly'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cancellationPeriodDays: z.number().int().positive().optional(),
  endsAt: z.string().optional(),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(255).optional(),
  notes: z.string().optional(),
});
export type CreatePolicyInput = z.infer<typeof createPolicySchema>;

export const updatePolicySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(['health', 'liability', 'car', 'home', 'life', 'legal', 'other']).optional(),
  provider: z.string().min(1).max(255).optional(),
  policyNumber: z.string().max(100).optional(),
  premium: z.string().max(50).optional(),
  interval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cancellationPeriodDays: z.number().int().positive().optional(),
  endsAt: z.string().optional(),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(255).optional(),
  notes: z.string().optional(),
});
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

export const addDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  documentId: z.string().optional(),
});
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
