import { z } from 'zod';

export const createListSchema = z.object({
  title: z.string().min(1).max(255),
  color: z.string().max(7).optional(),
  store: z.string().max(255).optional(),
});
export type CreateListInput = z.infer<typeof createListSchema>;

export const updateListSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  color: z.string().max(7).optional(),
  store: z.string().max(255).optional(),
  isArchived: z.boolean().optional(),
});
export type UpdateListInput = z.infer<typeof updateListSchema>;

export const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.string().optional(),
  unit: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  ord: z.number().int().optional().default(0),
  recipeRefId: z.string().uuid().optional(),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  amount: z.string().optional(),
  unit: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  ord: z.number().int().optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
