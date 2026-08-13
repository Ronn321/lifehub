import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { RecipesService } from '../services/recipes.service';
import { SearchService } from '../services/search.service';
import { createRecipeSchema, updateRecipeSchema, createIngredientSchema, createStepSchema, updateServingsSchema, createRecipeTagAndAssignSchema, searchRecipesSchema } from '../dtos/recipes.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('recipes')
export class RecipesController {
  constructor(
    @Inject(RecipesService) private readonly recipes: RecipesService,
    @Inject(SearchService) private readonly searchService: SearchService,
  ) {}

  @Post()
  @RequirePermission('recipes', 'create')
  async create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createRecipeSchema.parse(body);
    return this.recipes.createRecipe(user.sub, dto);
  }

  @Get()
  @RequirePermission('recipes', 'read')
  async list(@CurrentUser() user: JwtPayload) {
    return this.recipes.listRecipes(user.sub);
  }

  @Get(':id')
  @RequirePermission('recipes', 'read')
  async getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.recipes.getRecipeWithDetails(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('recipes', 'update')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateRecipeSchema.parse(body);
    return this.recipes.updateRecipe(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('recipes', 'delete')
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.recipes.deleteRecipe(user.sub, id);
  }

  @Post(':id/ingredients')
  @RequirePermission('recipes', 'update')
  async addIngredient(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createIngredientSchema.parse(body);
    return this.recipes.addIngredient(user.sub, id, dto);
  }

  @Delete(':id/ingredients/:ingredientId')
  @HttpCode(204)
  @RequirePermission('recipes', 'update')
  async deleteIngredient(@Param('id') id: string, @Param('ingredientId') ingredientId: string, @CurrentUser() user: JwtPayload) {
    await this.recipes.deleteIngredient(user.sub, id, ingredientId);
  }

  @Post(':id/steps')
  @RequirePermission('recipes', 'update')
  async addStep(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createStepSchema.parse(body);
    return this.recipes.addStep(user.sub, id, dto);
  }

  @Delete(':id/steps/:stepId')
  @HttpCode(204)
  @RequirePermission('recipes', 'update')
  async deleteStep(@Param('id') id: string, @Param('stepId') stepId: string, @CurrentUser() user: JwtPayload) {
    await this.recipes.deleteStep(user.sub, id, stepId);
  }

  @Put(':id/servings')
  @RequirePermission('recipes', 'update')
  async updateServings(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateServingsSchema.parse(body);
    return this.recipes.updateServings(user.sub, id, dto);
  }

  // ========== TAGS ==========

  @Get('tags')
  @RequirePermission('recipes', 'read')
  async listTags(@CurrentUser() user: JwtPayload) {
    return this.recipes.listRecipeTags(user.sub);
  }

  @Get(':id/tags')
  @RequirePermission('recipes', 'read')
  async listRecipeTags(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.recipes.listTagsByRecipe(user.sub, id);
  }

  @Post(':id/tags')
  @RequirePermission('recipes', 'update')
  async assignTag(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createRecipeTagAndAssignSchema.parse(body);
    return this.recipes.createAndAssignRecipeTag(user.sub, id, dto);
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(204)
  @RequirePermission('recipes', 'update')
  async removeTag(@Param('id') id: string, @Param('tagId') tagId: string, @CurrentUser() user: JwtPayload) {
    await this.recipes.removeTagFromRecipe(user.sub, id, tagId);
  }

  // ========== SEARCH ==========

  @Post('search')
  @RequirePermission('recipes', 'read')
  async search(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = searchRecipesSchema.parse(body);
    return this.searchService.search({
      query: dto.query,
      page: dto.page,
      pageSize: dto.pageSize,
      avoidFlags: dto.avoidFlags,
      requiredAttributes: dto.requiredAttributes,
      maxTimeMinutes: dto.maxTimeMinutes ?? undefined,
      calorieTarget: dto.calorieTarget ?? undefined,
      calorieTolerance: dto.calorieTolerance ?? undefined,
      preferredEffort: dto.preferredEffort as any,
    }, user.sub);
  }
}
