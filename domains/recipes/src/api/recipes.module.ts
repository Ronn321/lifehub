import { Module } from '@nestjs/common';
import { RecipesService } from '../services/recipes.service';
import { RecipesRepository } from '../repositories/recipes.repository';
import { RecipesController } from './recipes.controller';

@Module({
  providers: [RecipesRepository, RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}
