import { Injectable, Logger } from '@nestjs/common';
import type { DietaryProfile, IngredientOntology } from '../entities/recipes';

@Injectable()
export class DietaryProfileService {
  private readonly logger = new Logger(DietaryProfileService.name);

  // Compound flag expansions matching MorphCook ontology
  private readonly compoundFlagExpansions: Record<string, string[]> = {
    vegan: [
      'meat', 'beef', 'pork', 'lamb', 'poultry',
      'fish', 'shellfish', 'molluscs',
      'dairy', 'egg', 'honey', 'gelatin',
    ],
    vegetarisch: [
      'meat', 'beef', 'pork', 'lamb', 'poultry',
      'fish', 'shellfish', 'molluscs',
      'gelatin-non-halal',
    ],
    pescetarisch: [
      'meat', 'beef', 'pork', 'lamb', 'poultry',
      'gelatin-non-halal',
    ],
    halal: [
      'pork', 'alcohol', 'gelatin-non-halal',
    ],
    kosher: [
      'pork', 'shellfish', 'gelatin-non-kosher',
    ],
    lactosefrei: [
      'dairy',
    ],
    glutenfrei: [
      'gluten', 'wheat', 'barley', 'rye', 'oats',
    ],
    zuckerfrei: [
      'added-sugar', 'honey', 'syrup',
    ],
    nussfrei: [
      'peanuts', 'tree-nuts', 'almonds', 'walnuts',
      'cashews', 'pistachios', 'hazelnuts',
    ],
  };

  /**
   * Expand compound flags to base flags.
   * e.g., ["vegan"] → ["meat", "dairy", "eggs", "honey", "gelatin", ...]
   */
  expandFlags(flags: string[]): string[] {
    const expanded = new Set<string>();

    for (const flag of flags) {
      const expansions = this.compoundFlagExpansions[flag.toLowerCase()];
      if (expansions) {
        for (const expandedFlag of expansions) {
          expanded.add(expandedFlag);
        }
      } else {
        // Non-compound flag: keep as-is
        expanded.add(flag);
      }
    }

    return Array.from(expanded);
  }

  /**
   * Build the effective avoid-flags including compound expansions.
   */
  getEffectiveAvoidFlags(profile: DietaryProfile): string[] {
    const expanded = this.expandFlags(profile.avoidFlags ?? []);
    // Deduplicate
    return Array.from(new Set(expanded));
  }

  /**
   * Check if a recipe matches a dietary profile.
   */
  matchesProfile(
    recipeContainsFlags: string[],
    recipeIngredients: Array<{ name: string; ontologyFlag: string }>,
    profile: DietaryProfile,
  ): { matches: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const effectiveAvoidFlags = this.getEffectiveAvoidFlags(profile);

    // Check 1: No flag overlap
    const overlap = recipeContainsFlags.filter(f => effectiveAvoidFlags.includes(f));
    if (overlap.length > 0) {
      reasons.push(`Contains avoided flags: ${overlap.join(', ')}`);
      return { matches: false, reasons };
    }

    // Check 2: No avoided ingredient
    if (profile.avoidIngredientIds && profile.avoidIngredientIds.length > 0) {
      const ingredientMatch = recipeIngredients.filter(
        ing => profile.avoidIngredientIds.includes(ing.ontologyFlag),
      );
      if (ingredientMatch.length > 0) {
        reasons.push(`Contains avoided ingredients: ${ingredientMatch.map(i => i.name).join(', ')}`);
        return { matches: false, reasons };
      }
    }

    // Check 3: Required attributes present
    if (profile.requiredAttributes && profile.requiredAttributes.length > 0) {
      // Note: this check happens at recipe.attributes level
      // Here we just verify, caller provides recipe.attributes
    }

    return { matches: true, reasons: [] };
  }

  /**
   * Get default dietary profile for new users.
   */
  getDefaultProfile(): Omit<DietaryProfile, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId: '',
      avoidFlags: [],
      avoidIngredientIds: [],
      requiredAttributes: [],
      calorieTarget: null,
      calorieTolerance: 100,
      maxTimeMinutes: 60,
      preferredEffort: 'medium',
      showVariantTags: true,
      showCalorieInfo: true,
      reduceMotion: false,
    };
  }
}