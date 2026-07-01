import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { SearchService } from '../services/search.service.js';
import { searchQuerySchema, type SearchQuery } from '../dtos/search.dto.js';

@UseGuards(JwtGuard)
@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly search: SearchService) {}

  @Get()
  async query(@Query() query: unknown, @CurrentUser() user: JwtPayload) {
    const dto = searchQuerySchema.parse(query) satisfies SearchQuery;
    return this.search.search(user.sub, dto);
  }
}
