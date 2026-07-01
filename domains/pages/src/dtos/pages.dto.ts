import { z } from 'zod';

export const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
  icon: z.string().max(50).optional(),
  coverMediaId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().optional().default(0),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

const blockContentSchema: z.ZodType<Record<string, unknown>> = z.record(z.unknown());

const blockTypes = [
  'heading', 'text', 'image', 'gallery', 'file-list', 'divider',
  'todo', 'toggle', 'callout', 'quote', 'code',
  'bookmark', 'table', 'page-reference',
] as const;

export const createBlockSchema = z.object({
  type: z.enum(blockTypes),
  content: blockContentSchema.optional().default({}),
  sortOrder: z.number().int().optional().default(0),
});
export type CreateBlockInput = z.infer<typeof createBlockSchema>;

export const updateBlockSchema = z.object({
  type: z.enum(blockTypes).optional(),
  content: blockContentSchema.optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;

export const reorderBlocksSchema = z.object({
  blocks: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int(),
  })),
});
export type ReorderBlocksInput = z.infer<typeof reorderBlocksSchema>;
