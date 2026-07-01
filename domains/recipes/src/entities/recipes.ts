export type SourceType = 'manual' | 'url' | 'youtube' | 'pdf' | 'book';

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  sourceType: SourceType;
  sourceUrl: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calories: number | null;
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
  order: number;
  createdAt: string;
}

export interface Step {
  id: string;
  recipeId: string;
  instruction: string;
  order: number;
  createdAt: string;
}

export interface RecipeTag {
  id: string;
  recipeId: string;
  tagId: string;
  createdAt: string;
}
