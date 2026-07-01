import { z } from 'zod';

export const sourceTypeEnum = z.enum(['manual', 'url', 'youtube', 'pdf', 'book']);

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  sourceType: sourceTypeEnum.optional().default('manual'),
  sourceUrl: z.string().url().nullable().optional(),
  servings: z.number().int().min(1).max(50).optional().default(4),
  prepTime: z.number().int().positive().nullable().optional(),
  cookTime: z.number().int().positive().nullable().optional(),
  totalTime: z.number().int().positive().nullable().optional(),
  calories: z.number().positive().nullable().optional(),
  imageMediaId: z.string().uuid().nullable().optional(),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sourceType: sourceTypeEnum.optional(),
  sourceUrl: z.string().url().nullable().optional(),
  servings: z.number().int().min(1).max(50).optional(),
  prepTime: z.number().int().positive().nullable().optional(),
  cookTime: z.number().int().positive().nullable().optional(),
  totalTime: z.number().int().positive().nullable().optional(),
  calories: z.number().positive().nullable().optional(),
  imageMediaId: z.string().uuid().nullable().optional(),
});
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const createIngredientSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  order: z.number().int().optional().default(0),
});
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

export const createStepSchema = z.object({
  instruction: z.string().min(1),
  order: z.number().int().optional().default(0),
});
export type CreateStepInput = z.infer<typeof createStepSchema>;

export const updateServingsSchema = z.object({
  servings: z.number().int().min(1).max(50),
});
export type UpdateServingsInput = z.infer<typeof updateServingsSchema>;

export const createRecipeTagSchema = z.object({
  tagId: z.string().uuid(),
});
export type CreateRecipeTagInput = z.infer<typeof createRecipeTagSchema>;

export const createRecipeTagAndAssignSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
});
export type CreateRecipeTagAndAssignInput = z.infer<typeof createRecipeTagAndAssignSchema>;
