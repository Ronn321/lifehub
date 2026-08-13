import { Injectable } from '@nestjs/common';

export interface RecipeMatchable {
  title?: string;
  containsFlags: string[] | null;
  attributes: string[] | null;
  totalTime: number | null;
  calories: number | null;
  effortLevel: string | null;
}

export interface MatchingProfile {
  avoidFlags: string[];
  avoidIngredientNames: string[];
  requiredAttributes: string[];
  maxTimeMinutes: number;
  calorieTarget: number | null;
  calorieTolerance: number;
  preferredEffort: 'easy' | 'medium' | 'hard';
}

export interface MatchScore {
  recipeId: string;
  score: number;
  isVisible: boolean;
  reasons: string[];
}

@Injectable()
export class MatchingService {
  /**
   * Determines if a recipe is visible for a given profile.
   * Pure deterministic function — no side effects.
   */
  isVisible(recipe: RecipeMatchable, profile: MatchingProfile): boolean {
    const reasons: string[] = [];

    // 1. Avoid flags: recipe.contains ∩ profile.avoidFlags = ∅
    const recipeFlags = recipe.containsFlags ?? [];
    const flagOverlap = recipeFlags.filter(f => profile.avoidFlags.includes(f));
    if (flagOverlap.length > 0) {
      reasons.push(`Contains avoided flags: ${flagOverlap.join(', ')}`);
      return false;
    }

    // 2. Avoid ingredients: profile.avoidIngredientNames ∩ recipe.ingredientNames = ∅
    // Note: ingredient names need to be resolved from recipe.ingredients
    // This is a simplified check — full implementation needs ingredient resolution

    // 3. Required attributes: profile.requiredAttributes ⊆ recipe.attributes
    const recipeAttrs = recipe.attributes ?? [];
    const missingAttrs = profile.requiredAttributes.filter(
      attr => !recipeAttrs.includes(attr),
    );
    if (missingAttrs.length > 0) {
      reasons.push(`Missing required attributes: ${missingAttrs.join(', ')}`);
      return false;
    }

    // 4. Time limit
    const totalTime = recipe.totalTime ?? Infinity;
    if (totalTime > profile.maxTimeMinutes) {
      reasons.push(`Total time ${totalTime}min exceeds limit ${profile.maxTimeMinutes}min`);
      return false;
    }

    // 5. Calorie target
    if (profile.calorieTarget !== null) {
      const recipeCalories = recipe.calories ?? profile.calorieTarget;
      const diff = Math.abs(recipeCalories - profile.calorieTarget);
      if (diff > profile.calorieTolerance) {
        reasons.push(`Calories ${recipeCalories} outside tolerance ±${profile.calorieTolerance}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Scores a visible recipe for ranking.
   * Higher score = better match.
   */
  score(recipe: RecipeMatchable, profile: MatchingProfile): number {
    let score = 0;
    const recipeAttrs = recipe.attributes ?? [];

    // Attribute match: +10 per matching required attribute
    const matchingAttrs = profile.requiredAttributes.filter(
      attr => recipeAttrs.includes(attr),
    );
    score += matchingAttrs.length * 10;

    // Effort alignment
    const recipeEffort = recipe.effortLevel ?? 'medium';
    if (recipeEffort === profile.preferredEffort) {
      score += 20; // Exact match
    } else if (this.isAdjacentEffort(recipeEffort, profile.preferredEffort)) {
      score += 10; // Adjacent level
    }

    // Time closeness: max(0, 20 - |dt|/5)
    const totalTime = recipe.totalTime ?? profile.maxTimeMinutes;
    const timeDiff = Math.abs(totalTime - profile.maxTimeMinutes);
    score += Math.max(0, 20 - timeDiff / 5);

    // Calorie closeness: max(0, 20 - |dc|/100)
    if (profile.calorieTarget !== null) {
      const recipeCalories = recipe.calories ?? profile.calorieTarget;
      const calDiff = Math.abs(recipeCalories - profile.calorieTarget);
      score += Math.max(0, 20 - calDiff / 100);
    }

    return Math.round(score);
  }

  /**
   * Find the best variant for a dish given a profile.
   */
  findBestVariant(recipes: RecipeMatchable[], profile: MatchingProfile): RecipeMatchable | null {
    const visible = recipes.filter(r => this.isVisible(r, profile));
    if (visible.length === 0) return null;

    return visible.reduce((best, current) => {
      const bestScore = this.score(best, profile);
      const currentScore = this.score(current, profile);
      return currentScore > bestScore ? current : best;
    });
  }

  private isAdjacentEffort(a: string, b: string): boolean {
    const levels = ['easy', 'medium', 'hard'];
    const ai = levels.indexOf(a);
    const bi = levels.indexOf(b);
    if (ai === -1 || bi === -1) return false;
    return Math.abs(ai - bi) === 1;
  }
}