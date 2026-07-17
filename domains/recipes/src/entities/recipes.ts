export type SourceType = 'manual' | 'url' | 'youtube' | 'pdf' | 'book';

export interface Nutrition {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

export interface Recipe {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  dishId: string | null;
  containsFlags: string[] | null;
  attributes: string[] | null;
  variantLabel: string | null;
  effortLevel: string | null;
  sourceType: SourceType;
  sourceUrl: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calories: number | null;
  nutrition: Nutrition | null;
  imageMediaId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Ingredient {
  id: string;
  recipeId: string;
  name: string;
  amount: string | null;
  unit: string | null;
  note: string | null;
  order: number;
  createdAt: string;
}

export interface Step {
  id: string;
  recipeId: string;
  instruction: string;
  order: number;
  timerSeconds: number | null;
  createdAt: string;
}

export interface RecipeTag {
  id: string;
  recipeId: string;
  tagId: string;
  createdAt: string;
}

// ===================== NEW ENTITIES =====================

export interface IngredientOntology {
  id: string;
  parentId: string | null;
  nameDe: string;
  nameEn: string | null;
  ontologyTags: string[] | null;
  defaultUnit: string | null;
  createdAt: string;
}

export interface OntologyFlag {
  id: string;
  key: string;
  category: string;
  nameDe: string;
  nameEn: string | null;
  description: string | null;
  isCompound: boolean;
  createdAt: string;
}

export interface ImportJob {
  id: string;
  ownerId: string;
  sourceUrl: string;
  status: ImportJobStatus;
  sourceType: string;
  rawHtml: string | null;
  extractedDto: Record<string, unknown> | null;
  normalizedDto: Record<string, unknown> | null;
  draftRecipeId: string | null;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ImportJobStatus =
  | 'pending'
  | 'fetching'
  | 'parsing'
  | 'normalizing'
  | 'mapping'
  | 'draft'
  | 'confirmed'
  | 'failed';

export interface ImportHistory {
  id: string;
  ownerId: string;
  sourceUrl: string;
  sourceType: string;
  recipeId: string;
  success: boolean;
  durationMs: number | null;
  createdAt: string;
}

export interface DietaryProfile {
  id: string;
  userId: string;
  avoidFlags: string[];
  avoidIngredientIds: string[];
  requiredAttributes: string[];
  calorieTarget: number | null;
  calorieTolerance: number;
  maxTimeMinutes: number | null;
  preferredEffort: 'easy' | 'medium' | 'hard';
  showVariantTags: boolean;
  showCalorieInfo: boolean;
  reduceMotion: boolean;
  createdAt: string;
  updatedAt: string;
}