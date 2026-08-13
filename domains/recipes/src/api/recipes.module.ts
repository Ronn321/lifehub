import { Module } from '@nestjs/common';
import { RecipesService } from '../services/recipes.service';
import { RecipesRepository } from '../repositories/recipes.repository';
import { RecipesController } from './recipes.controller';
import { DishesController } from './dishes.controller';
import { DishesService } from '../services/dishes.service';
import { DishesRepository } from '../repositories/dishes.repository';
import { RecipesImportController } from './recipes-import.controller';
import { ImportOrchestratorService } from '../services/import/import-orchestrator.service';
import { UrlDetectorService } from '../services/import/url-detector.service';
import { HtmlFetcherService } from '../services/import/html-fetcher.service';
import { RecipeExtractorService } from '../services/import/recipe-extractor.service';
import { IngredientParserService } from '../services/import/ingredient-parser.service';
import { MatchingService } from '../services/matching.service';
import { DietaryProfileService } from '../services/dietary-profile.service';
import { MorphCookSyncService } from '../services/morphcook-sync.service';
import { MorphCookController } from './morphcook.controller';
import { RecipeImageController } from './recipes-image.controller';
import { SearchService } from '../services/search.service';
import { RecipeImageService } from '../services/recipe-image.service';

@Module({
  providers: [
    RecipesRepository, RecipesService,
    DishesRepository, DishesService,
    ImportOrchestratorService,
    UrlDetectorService,
    HtmlFetcherService,
    RecipeExtractorService,
    IngredientParserService,
    MatchingService,
    DietaryProfileService,
    MorphCookSyncService,
    SearchService,
    RecipeImageService,
  ],
  controllers: [
    RecipesController,
    DishesController,
    RecipesImportController,
    MorphCookController,
    RecipeImageController,
  ],
  exports: [RecipesService, DishesService, ImportOrchestratorService, MatchingService, DietaryProfileService, MorphCookSyncService, SearchService],
})
export class RecipesModule {}
