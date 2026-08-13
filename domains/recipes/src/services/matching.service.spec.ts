import { MatchingService, RecipeMatchable, MatchingProfile } from './matching.service';

describe('MatchingService', () => {
  let service: MatchingService;
  let profile: MatchingProfile;

  beforeEach(() => {
    service = new MatchingService();
    profile = {
      avoidFlags: ['dairy', 'gluten'],
      avoidIngredientNames: [],
      requiredAttributes: ['halal-compatible'],
      maxTimeMinutes: 60,
      calorieTarget: 500,
      calorieTolerance: 100,
      preferredEffort: 'easy',
    };
  });

  const baseRecipe: RecipeMatchable = {
    containsFlags: ['egg', 'soy'],
    attributes: ['halal-compatible', 'effort-easy'],
    totalTime: 30,
    calories: 480,
    effortLevel: 'easy',
  };

  describe('isVisible', () => {
    it('should return true for a perfectly matching recipe', () => {
      expect(service.isVisible(baseRecipe, profile)).toBe(true);
    });

    it('should reject recipe with avoided flag (dairy)', () => {
      expect(service.isVisible({ ...baseRecipe, containsFlags: ['dairy', 'egg'] }, profile)).toBe(false);
    });

    it('should reject recipe missing required attribute', () => {
      expect(service.isVisible({ ...baseRecipe, attributes: ['effort-easy'] }, profile)).toBe(false);
    });

    it('should reject recipe exceeding max time', () => {
      expect(service.isVisible({ ...baseRecipe, totalTime: 90 }, profile)).toBe(false);
    });

    it('should reject recipe outside calorie tolerance', () => {
      expect(service.isVisible({ ...baseRecipe, calories: 650 }, profile)).toBe(false);
    });

    it('should accept recipe within calorie tolerance', () => {
      expect(service.isVisible({ ...baseRecipe, calories: 520 }, profile)).toBe(true);
    });

    it('should handle null containsFlags', () => {
      expect(service.isVisible({ ...baseRecipe, containsFlags: null }, profile)).toBe(true);
    });

    it('should accept any recipe when profile has no filters', () => {
      const emptyProfile: MatchingProfile = {
        avoidFlags: [],
        avoidIngredientNames: [],
        requiredAttributes: [],
        maxTimeMinutes: Number.MAX_SAFE_INTEGER,
        calorieTarget: null,
        calorieTolerance: 0,
        preferredEffort: 'medium',
      };
      expect(service.isVisible(baseRecipe, emptyProfile)).toBe(true);
    });

    it('should handle edge case: empty arrays', () => {
      const emptyProfile: MatchingProfile = {
        avoidFlags: [], avoidIngredientNames: [], requiredAttributes: [],
        maxTimeMinutes: 60, calorieTarget: null, calorieTolerance: 0,
        preferredEffort: 'medium',
      };
      expect(service.isVisible({ ...baseRecipe, containsFlags: [], attributes: [] }, emptyProfile)).toBe(true);
    });
  });

  describe('score', () => {
    it('should give bonus for exact effort match', () => {
      const exact = { ...baseRecipe, effortLevel: 'easy' };
      const mismatch = { ...baseRecipe, effortLevel: 'hard' };
      expect(service.score(exact, profile)).toBeGreaterThan(service.score(mismatch, profile));
    });

    it('should give bonus for adjacent effort level', () => {
      const adjacent = { ...baseRecipe, effortLevel: 'medium' };
      const far = { ...baseRecipe, effortLevel: 'hard' };
      expect(service.score(adjacent, profile)).toBeGreaterThan(service.score(far, profile));
    });

    it('should handle null effortLevel', () => {
      expect(service.score({ ...baseRecipe, effortLevel: null }, profile)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findBestVariant', () => {
    it('should return null when no recipes match', () => {
      const recipes: RecipeMatchable[] = [
        { containsFlags: ['dairy'], attributes: [], totalTime: 30, calories: 500, effortLevel: 'easy' },
      ];
      expect(service.findBestVariant(recipes, profile)).toBeNull();
    });

    it('should return the highest scoring recipe', () => {
      const good: RecipeMatchable = { containsFlags: ['egg'], attributes: ['halal-compatible'], totalTime: 30, calories: 500, effortLevel: 'easy' };
      const better: RecipeMatchable = { containsFlags: ['egg'], attributes: ['halal-compatible', 'effort-easy'], totalTime: 15, calories: 490, effortLevel: 'easy' };
      expect(service.findBestVariant([good, better], profile)).toBe(better);
    });
  });
});