import { Injectable, Inject } from '@nestjs/common';
import { SearchRepository } from '../repositories/search.repository.js';
import type { SearchQuery } from '../dtos/search.dto.js';
import type { SearchResult, SearchResults, SearchDomain } from '../entities/search.js';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SearchRepository) private readonly repo: SearchRepository,
  ) {}

  async search(ownerId: string, input: SearchQuery): Promise<SearchResults> {
    const { q, domain, limit } = input;
    const typedDomain = domain as SearchDomain | undefined;

    const results = typedDomain
      ? await this.repo.searchByDomain(ownerId, q, typedDomain, limit)
      : await this.repo.searchAll(ownerId, q, limit);

    const grouped = this.groupResults(results);

    await this.repo.logQuery(q, domain ?? null, results.length, ownerId);

    return {
      query: q,
      totalResults: results.length,
      results,
      grouped,
    };
  }

  private groupResults(results: SearchResult[]): Partial<Record<SearchDomain, SearchResult[]>> {
    const grouped: Partial<Record<SearchDomain, SearchResult[]>> = {};
    for (const item of results) {
      if (!grouped[item.domain]) {
        grouped[item.domain] = [];
      }
      grouped[item.domain]!.push(item);
    }
    return grouped;
  }
}
