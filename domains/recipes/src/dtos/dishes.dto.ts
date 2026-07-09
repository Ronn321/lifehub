import { z } from 'zod';

export const createDishSchema = z.object({
  title: z.string().min(1).max(255),
  titleEn: z.string().max(255).nullable().optional(),
  description: z.string().optional(),
  caption: z.string().optional(),
  heroText: z.string().optional(),
  primaryColor: z.string().max(20).optional(),
  imageMediaId: z.string().uuid().nullable().optional(),
});
export type CreateDishInput = z.infer<typeof createDishSchema>;

export const updateDishSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  titleEn: z.string().max(255).nullable().optional(),
  description: z.string().optional(),
  caption: z.string().optional(),
  heroText: z.string().optional(),
  primaryColor: z.string().max(20).optional(),
  imageMediaId: z.string().uuid().nullable().optional(),
});
export type UpdateDishInput = z.infer<typeof updateDishSchema>;

export const createDishAndAssignSchema = z.object({
  title: z.string().min(1).max(255),
  titleEn: z.string().max(255).nullable().optional(),
  description: z.string().optional(),
  caption: z.string().optional(),
  heroText: z.string().optional(),
  primaryColor: z.string().max(20).optional(),
  imageMediaId: z.string().uuid().nullable().optional(),
  recipeIds: z.array(z.string().uuid()).optional(),
});
export type CreateDishAndAssignInput = z.infer<typeof createDishAndAssignSchema>;
