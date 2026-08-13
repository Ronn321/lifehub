import { Controller, Get, Post, Body, Inject, UseGuards, Query } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { MorphCookSyncService } from '../services/morphcook-sync.service';
import { RecipesService } from '../services/recipes.service';
import { morphcookImportSchema } from '../dtos/recipes.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('recipes')
export class MorphCookController {
  constructor(
    @Inject(MorphCookSyncService) private readonly syncService: MorphCookSyncService,
    @Inject(RecipesService) private readonly recipesService: RecipesService,
  ) {}

  @Get('export/morphcook')
  @RequirePermission('recipes', 'read')
  async exportForMorphCook(@CurrentUser() user: JwtPayload, @Query('since') since?: string) {
    const recipes = await this.recipesService.listRecipes(user.sub);
    // Include dishes for the export
    // For now, return recipes in MorphCook format without dish details
    return this.syncService.toMorphCookFormat(recipes, []);
  }

  @Post('import/morphcook')
  @RequirePermission('recipes', 'create')
  async importFromMorphCook(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = morphcookImportSchema.parse(body);
    const imported: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ recipe_id: string; reason: string }> = [];

    for (const morphRecipe of dto.recipes) {
      try {
        const recipeData = this.syncService.fromMorphCookFormat(morphRecipe);
        const created = await this.recipesService.createRecipe(user.sub, {
          title: recipeData.title,
          titleEn: recipeData.titleEn ?? undefined,
          description: recipeData.description ?? undefined,
          servings: recipeData.servings,
          calories: recipeData.calories ?? undefined,
          sourceType: recipeData.sourceType as any,
          sourceUrl: recipeData.sourceUrl ?? undefined,
          containsFlags: recipeData.containsFlags,
          attributes: recipeData.attributes,
        });
        if (created) imported.push(created.id);
      } catch (err) {
        errors.push({
          recipe_id: morphRecipe.id,
          reason: (err as Error).message,
        });
      }
    }

    return {
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        new_recipes: imported.length,
        updated_recipes: 0,
        skipped_duplicates: skipped.length,
        failed: errors,
        new_dishes: 0,
        new_flags: 0,
      },
    };
  }
}