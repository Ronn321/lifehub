import { z } from 'zod';

export const documentTypeEnum = z.enum(['contract', 'receipt', 'manual', 'official', 'other']);

export const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  type: documentTypeEnum.optional().default('other'),
  description: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: documentTypeEnum.optional(),
  description: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).nullable().optional(),
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
