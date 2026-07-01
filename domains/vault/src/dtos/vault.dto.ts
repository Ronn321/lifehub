import { z } from 'zod';

export const createVaultEntrySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['login', 'note', 'card', 'identity', 'ssh']).optional().default('login'),
  username: z.string().max(255).optional(),
  encryptedPassword: z.string().optional(),
  url: z.string().max(2048).optional(),
  notes: z.string().optional(),
  totpSecret: z.string().optional(),
  cardLast4: z.string().length(4).optional(),
  cardBrand: z.string().max(50).optional(),
  keyVersion: z.number().int().optional().default(1),
});
export type CreateVaultEntryInput = z.infer<typeof createVaultEntrySchema>;

export const updateVaultEntrySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['login', 'note', 'card', 'identity', 'ssh']).optional(),
  username: z.string().max(255).optional(),
  encryptedPassword: z.string().optional(),
  url: z.string().max(2048).optional(),
  notes: z.string().optional(),
  totpSecret: z.string().optional(),
  cardLast4: z.string().length(4).optional(),
  cardBrand: z.string().max(50).optional(),
  keyVersion: z.number().int().optional(),
});
export type UpdateVaultEntryInput = z.infer<typeof updateVaultEntrySchema>;
