import { Injectable, Logger } from '@nestjs/common';

export interface MorphCookRecipe {
  id: string;
  dish_id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  ingredients: Array<{
    ingredient_id: string;
    name: Record<string, string>;
    quantity: number;
    unit: string;
    optional: boolean;
  }>;
  steps: Array<{
    index: number;
    text: Record<string, string>;
    timer_seconds: number | null;
    image_ref: string | null;
  }>;
  contains_flags: string[];
  attributes: string[];
  calories_per_serving: number;
  servings: number;
  source_type: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MorphCookDish {
  id: string;
  name: Record<string, string>;
  hero_text: Record<string, string>;
  caption: Record<string, string>;
  primary_color: string;
  recipe_ids: string[];
}

export interface MorphCookExport {
  schema_version: number;
  exported_at: string;
  source: string;
  total_recipes: number;
  total_dishes: number;
  recipes: MorphCookRecipe[];
  dishes: MorphCookDish[];
  ontology?: {
    flags: Array<{
      key: string;
      category: string;
      name: Record<string, string>;
    }>;
    compound_flags: Record<string, string[]>;
  };
}

export interface MorphCookImportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: {
    new_recipes: number;
    updated_recipes: number;
    skipped_duplicates: number;
    failed: Array<{ recipe_id: string; reason: string }>;
    new_dishes: number;
    new_flags: number;
  };
}

@Injectable()
export class MorphCookSyncService {
  private readonly logger = new Logger(MorphCookSyncService.name);

  /**
   * Transform LifeHub recipes into MorphCook-compatible format.
   */
  toMorphCookFormat(recipes: any[], dishes: any[]): MorphCookExport {
    const morphcookRecipes: MorphCookRecipe[] = recipes.map(r => ({
      id: r.id,
      dish_id: r.dishId ?? 'unknown',
      title: { de: r.title ?? '', en: r.titleEn ?? r.title ?? '' },
      description: { de: r.description ?? '', en: r.description ?? '' },
      ingredients: (r.ingredients ?? []).map((ing: any) => ({
        ingredient_id: ing.id,
        name: { de: ing.name, en: ing.name },
        quantity: ing.amount ? parseFloat(ing.amount) : 0,
        unit: ing.unit ?? 'Stk',
        optional: false,
      })),
      steps: (r.steps ?? []).sort((a: any, b: any) => a.order - b.order).map((s: any, i: number) => ({
        index: i,
        text: { de: s.instruction, en: s.instruction },
        timer_seconds: s.timerSeconds ?? null,
        image_ref: null,
      })),
      contains_flags: r.containsFlags ?? [],
      attributes: r.attributes ?? [],
      calories_per_serving: r.calories ?? 0,
      servings: r.servings ?? 4,
      source_type: r.sourceType ?? 'manual',
      source_url: r.sourceUrl ?? null,
      created_at: r.createdAt ?? new Date().toISOString(),
      updated_at: r.updatedAt ?? new Date().toISOString(),
    }));

    const morphcookDishes: MorphCookDish[] = dishes.map(d => ({
      id: d.id,
      name: { de: d.title ?? '', en: d.titleEn ?? d.title ?? '' },
      hero_text: { de: d.heroText ?? '', en: d.heroText ?? '' },
      caption: { de: d.caption ?? '', en: d.caption ?? '' },
      primary_color: d.primaryColor ?? '#D97706',
      recipe_ids: (d.recipes ?? []).map((r: any) => r.id),
    }));

    return {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      source: 'lifehub',
      total_recipes: morphcookRecipes.length,
      total_dishes: morphcookDishes.length,
      recipes: morphcookRecipes,
      dishes: morphcookDishes,
    };
  }

  /**
   * Transform MorphCook recipe format to LifeHub format.
   */
  fromMorphCookFormat(recipe: MorphCookRecipe): {
    title: string;
    titleEn: string | null;
    description: string | null;
    containsFlags: string[];
    attributes: string[];
    servings: number;
    calories: number | null;
    sourceType: string;
    sourceUrl: string | null;
  } {
    return {
      title: recipe.title?.de ?? recipe.title?.en ?? 'Untitled',
      titleEn: recipe.title?.en ?? recipe.title?.de ?? null,
      description: recipe.description?.de ?? recipe.description?.en ?? null,
      containsFlags: recipe.contains_flags ?? [],
      attributes: recipe.attributes ?? [],
      servings: recipe.servings ?? 4,
      calories: recipe.calories_per_serving ?? null,
      sourceType: recipe.source_type ?? 'morphcook',
      sourceUrl: recipe.source_url ?? null,
    };
  }

  /**
   * Merge MorphCook import with existing data.
   */
  mergeImports(
    imports: MorphCookRecipe[],
    existingRecipeIds: Set<string>,
  ): {
    toCreate: MorphCookRecipe[];
    toUpdate: MorphCookRecipe[];
    toSkip: MorphCookRecipe[];
  } {
    const toCreate: MorphCookRecipe[] = [];
    const toUpdate: MorphCookRecipe[] = [];
    const toSkip: MorphCookRecipe[] = [];

    for (const imported of imports) {
      if (!existingRecipeIds.has(imported.id)) {
        toCreate.push(imported);
      } else {
        toSkip.push(imported);
      }
    }

    return { toCreate, toUpdate, toSkip };
  }
}