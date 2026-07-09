import { Module } from '@nestjs/common';
import { RecipesService } from '../services/recipes.service';
import { RecipesRepository } from '../repositories/recipes.repository';
import { RecipesController } from './recipes.controller';
import { DishesController } from './dishes.controller';
import { DishesService } from '../services/dishes.service';
import { DishesRepository } from '../repositories/dishes.repository';

@Module({
  providers: [RecipesRepository, RecipesService, DishesRepository, DishesService],
  controllers: [DishesController, RecipesController],
  exports: [RecipesService, DishesService],
})
export class RecipesModule {}
