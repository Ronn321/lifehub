import { Module } from '@nestjs/common';
import { SearchService } from '../services/search.service.js';
import { SearchController } from './search.controller.js';
import { SearchRepository } from '../repositories/search.repository.js';

@Module({
  providers: [SearchRepository, SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
