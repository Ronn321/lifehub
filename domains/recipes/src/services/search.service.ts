import { Injectable } from '@nestjs/common';
import { RecipesRepository } from '../repositories/recipes.repository';
import { MatchingService, type MatchingProfile } from './matching.service';
import type { Recipe } from '../entities/recipes';

export interface SearchParams {
  query: string;
  page: number;
  pageSize: number;
  profile?: MatchingProfile;
  avoidFlags?: string[];
  requiredAttributes?: string[];
  maxTimeMinutes?: number;
  calorieTarget?: number;
  calorieTolerance?: number;
  preferredEffort?: 'easy' | 'medium' | 'hard';
}

export interface SearchResult {
  recipes: Recipe[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly recipesRepo: RecipesRepository,
    private readonly matchingService: MatchingService,
  ) {}

  async search(params: SearchParams, ownerId: string): Promise<SearchResult> {
    // Get all recipes (paginated)
    const allRecipes = await this.recipesRepo.findRecipesByOwner(ownerId);

    // Apply text search filter
    let filtered = allRecipes;
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(r => {
        const matchesTitle = r.title.toLowerCase().includes(query);
        const matchesDescription = (r.description ?? '').toLowerCase().includes(query);
        const matchesDish = (r.dishTitle ?? '').toLowerCase().includes(query);
        return matchesTitle || matchesDescription || matchesDish;
      });
    }

    // Build matching profile from search filters
    if (params.avoidFlags || params.requiredAttributes || params.maxTimeMinutes) {
      const profile: MatchingProfile = {
        avoidFlags: params.avoidFlags ?? [],
        avoidIngredientNames: [],
        requiredAttributes: params.requiredAttributes ?? [],
        maxTimeMinutes: params.maxTimeMinutes ?? Number.MAX_SAFE_INTEGER,
        calorieTarget: params.calorieTarget ?? null,
        calorieTolerance: params.calorieTolerance ?? 100,
        preferredEffort: params.preferredEffort ?? 'medium',
      };

      // Apply matching engine filter
      filtered = filtered.filter(r => this.matchingService.isVisible(r, profile));

      // Score and sort
      filtered.sort((a, b) => {
        const scoreA = this.matchingService.score(a, profile);
        const scoreB = this.matchingService.score(b, profile);
        return scoreB - scoreA; // Higher score first
      });
    }

    // Paginate
    const total = filtered.length;
    const startIndex = (params.page - 1) * params.pageSize;
    const paged = filtered.slice(startIndex, startIndex + params.pageSize);

    return {
      recipes: paged,
      total,
      page: params.page,
      pageSize: params.pageSize,
      hasMore: startIndex + params.pageSize < total,
    };
  }
}