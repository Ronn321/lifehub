import { z } from 'zod';

export const sourceTypeEnum = z.enum(['manual', 'url', 'youtube', 'pdf', 'book']);

export const nutritionSchema = z.object({
  calories: z.number().positive().nullable().optional(),
  protein: z.number().positive().nullable().optional(),
  fat: z.number().positive().nullable().optional(),
  carbs: z.number().positive().nullable().optional(),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(255),
  titleEn: z.string().optional(),
  description: z.string().optional(),
  dishId: z.string().uuid().nullable().optional(),
  containsFlags: z.array(z.string()).optional(),
  attributes: z.array(z.string()).optional(),
  variantLabel: z.string().optional(),
  effortLevel: z.string().optional(),
  sourceType: sourceTypeEnum.optional().default('manual'),
  sourceUrl: z.string().url().nullable().optional(),
  servings: z.number().int().min(1).max(50).optional().default(4),
  prepTime: z.number().int().positive().nullable().optional(),
  cookTime: z.number().int().positive().nullable().optional(),
  totalTime: z.number().int().positive().nullable().optional(),
  calories: z.number().positive().nullable().optional(),
  nutrition: nutritionSchema.nullable().optional(),
  imageMediaId: z.string().uuid().nullable().optional(),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  titleEn: z.string().optional(),
  description: z.string().optional(),
  dishId: z.string().uuid().nullable().optional(),
  containsFlags: z.array(z.string()).optional(),
  attributes: z.array(z.string()).optional(),
  variantLabel: z.string().optional(),
  effortLevel: z.string().optional(),
  sourceType: sourceTypeEnum.optional(),
  sourceUrl: z.string().url().nullable().optional(),
  servings: z.number().int().min(1).max(50).optional(),
  prepTime: z.number().int().positive().nullable().optional(),
  cookTime: z.number().int().positive().nullable().optional(),
  totalTime: z.number().int().positive().nullable().optional(),
  calories: z.number().positive().nullable().optional(),
  nutrition: nutritionSchema.nullable().optional(),
  imageMediaId: z.string().uuid().nullable().optional(),
});
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const createRecipeWithDishSchema = createRecipeSchema.extend({
  dishTitle: z.string().min(1).optional(),
});
export type CreateRecipeWithDishInput = z.infer<typeof createRecipeWithDishSchema>;

export const createIngredientSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  note: z.string().nullable().optional(),
  order: z.number().int().optional().default(0),
});
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

export const createStepSchema = z.object({
  instruction: z.string().min(1),
  order: z.number().int().optional().default(0),
  timerSeconds: z.number().int().positive().nullable().optional(),
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

// ===================== IMPORT DTOs =====================

export const importJobStatusEnum = z.enum([
  'pending', 'fetching', 'parsing', 'normalizing',
  'mapping', 'draft', 'confirmed', 'failed',
]);

export const importRecipeSchema = z.object({
  url: z.string().url(),
  mode: z.enum(['raw', 'normalized', 'enhanced']).optional().default('normalized'),
  autoConfirm: z.boolean().optional().default(false),
});
export type ImportRecipeInput = z.infer<typeof importRecipeSchema>;

export const confirmImportSchema = z.object({
  dishId: z.string().uuid().nullable().optional(),
  dishTitle: z.string().min(1).optional(),
  servings: z.number().int().min(1).max(50).optional(),
});
export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;

// ===================== DIETARY PROFILE DTOs =====================

export const dietaryProfileSchema = z.object({
  avoidFlags: z.array(z.string()).optional().default([]),
  avoidIngredientIds: z.array(z.string()).optional().default([]),
  requiredAttributes: z.array(z.string()).optional().default([]),
  calorieTarget: z.number().int().positive().nullable().optional(),
  calorieTolerance: z.number().int().min(0).optional().default(100),
  maxTimeMinutes: z.number().int().positive().nullable().optional(),
  preferredEffort: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  showVariantTags: z.boolean().optional().default(true),
  showCalorieInfo: z.boolean().optional().default(true),
  reduceMotion: z.boolean().optional().default(false),
});
export type DietaryProfileInput = z.infer<typeof dietaryProfileSchema>;

// ===================== ONTOLOGY DTOs =====================

export const ontologyFlagSchema = z.object({
  key: z.string().min(1).max(100),
  category: z.enum(['contains_flag', 'attribute', 'technique', 'compound']),
  nameDe: z.string().min(1).max(255),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  isCompound: z.boolean().optional().default(false),
});
export type OntologyFlagInput = z.infer<typeof ontologyFlagSchema>;

// ===================== SEARCH DTOs =====================

export const searchRecipesSchema = z.object({
  query: z.string().min(1).max(255),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(20),
  avoidFlags: z.array(z.string()).optional(),
  requiredAttributes: z.array(z.string()).optional(),
  maxTimeMinutes: z.number().int().positive().nullable().optional(),
  calorieTarget: z.number().int().positive().nullable().optional(),
  calorieTolerance: z.number().int().min(0).optional().default(100),
  preferredEffort: z.enum(['easy', 'medium', 'hard']).optional(),
});
export type SearchRecipesInput = z.infer<typeof searchRecipesSchema>;

// ===================== MATCHING DTOs =====================

export const matchRecipeSchema = z.object({
  dishId: z.string().uuid(),
  avoidFlags: z.array(z.string()).optional().default([]),
  avoidIngredientIds: z.array(z.string()).optional().default([]),
  requiredAttributes: z.array(z.string()).optional().default([]),
  calorieTarget: z.number().int().positive().nullable().optional(),
  maxTimeMinutes: z.number().int().positive().nullable().optional(),
  preferredEffort: z.enum(['easy', 'medium', 'hard']).optional(),
});
export type MatchRecipeInput = z.infer<typeof matchRecipeSchema>;

// ===================== MORPHCOOK SYNC DTOs =====================

export const morphcookImportSchema = z.object({
  recipes: z.array(z.any()),
  dishes: z.array(z.any()).optional(),
  mode: z.enum(['merge', 'replace']).optional().default('merge'),
  dryRun: z.boolean().optional().default(false),
});
export type MorphcookImportInput = z.infer<typeof morphcookImportSchema>;