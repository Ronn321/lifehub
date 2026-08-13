import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { RecipesRepository } from '../repositories/recipes.repository';
import type { CreateRecipeInput, UpdateRecipeInput, CreateIngredientInput, CreateStepInput, UpdateServingsInput } from '../dtos/recipes.dto';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(private readonly repo: RecipesRepository) {}

  async createRecipe(ownerId: string, input: CreateRecipeInput) {
    return this.repo.createRecipe({ ...input, ownerId });
  }

  async listRecipes(ownerId: string) {
    return this.repo.findRecipesByOwner(ownerId);
  }

  async getRecipeWithDetails(ownerId: string, id: string) {
    const recipe = await this.repo.findRecipeById(id, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    const [ingredientList, stepList, tagList] = await Promise.all([
      this.repo.findIngredientsByRecipe(id),
      this.repo.findStepsByRecipe(id),
      this.repo.findTagsByRecipe(id),
    ]);
    return { ...recipe, ingredients: ingredientList, steps: stepList, tags: tagList };
  }

  async updateRecipe(ownerId: string, id: string, input: UpdateRecipeInput) {
    const recipe = await this.repo.findRecipeById(id, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    return this.repo.updateRecipe(id, ownerId, input);
  }

  async deleteRecipe(ownerId: string, id: string) {
    const recipe = await this.repo.findRecipeById(id, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    await this.repo.softDeleteRecipe(id, ownerId);
  }

  async addIngredient(ownerId: string, recipeId: string, input: CreateIngredientInput) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    return this.repo.createIngredient({
      recipeId, name: input.name,
      amount: input.amount != null ? String(input.amount) : null,
      unit: input.unit ?? null, order: input.order,
      note: input.note ?? null,
    });
  }

  async deleteIngredient(ownerId: string, recipeId: string, ingredientId: string) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    await this.repo.deleteIngredient(ingredientId);
  }

  async addStep(ownerId: string, recipeId: string, input: CreateStepInput) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    return this.repo.createStep({ recipeId, ...input });
  }

  async deleteStep(ownerId: string, recipeId: string, stepId: string) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    await this.repo.deleteStep(stepId);
  }

  // ========== TAGS ==========

  async listRecipeTags(ownerId: string) {
    return this.repo.findTagsByOwnerAndDomain(ownerId, 'recipe');
  }

  async listTagsByRecipe(ownerId: string, recipeId: string) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    return this.repo.findTagsByRecipeWithDetails(recipeId);
  }

  async createAndAssignRecipeTag(ownerId: string, recipeId: string, input: { name: string; color?: string }) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    const tag = await this.repo.createTag({ ownerId, domain: 'recipe', ...input });
    if (!tag) throw new Error('Tag konnte nicht erstellt werden');
    await this.repo.addTag({ recipeId, tagId: tag.id });
    return tag;
  }

  async removeTagFromRecipe(ownerId: string, recipeId: string, tagId: string) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    await this.repo.removeTagByRecipeAndTagId(recipeId, tagId);
    return { success: true };
  }

  async updateServings(ownerId: string, recipeId: string, input: UpdateServingsInput) {
    const recipe = await this.repo.findRecipeById(recipeId, ownerId);
    if (!recipe) throw new NotFoundException('Rezept nicht gefunden');
    const factor = input.servings / (recipe.servings ?? 1);
    await this.repo.updateRecipe(recipeId, ownerId, { servings: input.servings });
    const ingredientList = await this.repo.findIngredientsByRecipe(recipeId);
    const updatedRecipe = await this.repo.findRecipeById(recipeId, ownerId);
    const updatedIngredients = ingredientList.map((i) => {
      if (i.amount != null) {
        const numAmount = parseFloat(i.amount);
        return { ...i, amount: !isNaN(numAmount) ? String(Math.round(numAmount * factor * 100) / 100) : i.amount };
      }
      return i;
    });
    return { ...updatedRecipe, ingredients: updatedIngredients };
  }
}
