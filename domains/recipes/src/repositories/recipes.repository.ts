import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc, asc } from 'drizzle-orm';
import { DbService, recipes, ingredients, steps, recipeTags, tags, dishes, type Db } from '@lifehub/db';

export class RecipesRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // ========== RECIPES ==========

  async createRecipe(data: {
    ownerId: string; title: string; titleEn?: string;
    description?: string; dishId?: string | null;
    containsFlags?: string[]; attributes?: string[];
    variantLabel?: string; effortLevel?: string;
    sourceType?: string; sourceUrl?: string | null;
    servings?: number; prepTime?: number | null; cookTime?: number | null;
    totalTime?: number | null; calories?: number | null; imageMediaId?: string | null;
  }) {
    const [row] = await this.db.insert(recipes).values({
      ownerId: data.ownerId, title: data.title,
      titleEn: data.titleEn ?? null,
      description: data.description ?? null,
      dishId: data.dishId ?? null,
      containsFlags: data.containsFlags ?? null,
      attributes: data.attributes ?? null,
      variantLabel: data.variantLabel ?? null,
      effortLevel: data.effortLevel ?? null,
      sourceType: data.sourceType ?? 'manual',
      sourceUrl: data.sourceUrl ?? null,
      servings: data.servings ?? 4,
      prepTime: data.prepTime ?? null,
      cookTime: data.cookTime ?? null,
      totalTime: data.totalTime ?? null,
      calories: data.calories ?? null,
      imageMediaId: data.imageMediaId ?? null,
    }).returning();
    return row;
  }

  async findRecipesByOwner(ownerId: string) {
    return this.db.select({
      id: recipes.id,
      title: recipes.title,
      titleEn: recipes.titleEn,
      description: recipes.description,
      dishId: recipes.dishId,
      dishTitle: sql<string>`COALESCE(${dishes.title}, '')`,
      containsFlags: recipes.containsFlags,
      attributes: recipes.attributes,
      variantLabel: recipes.variantLabel,
      effortLevel: recipes.effortLevel,
      sourceType: recipes.sourceType,
      sourceUrl: recipes.sourceUrl,
      servings: recipes.servings,
      prepTime: recipes.prepTime,
      cookTime: recipes.cookTime,
      totalTime: recipes.totalTime,
      calories: recipes.calories,
      nutrition: sql<{ calories: number | null; protein: number | null; fat: number | null; carbs: number | null } | null>`NULL`,
      imageMediaId: recipes.imageMediaId,
      ownerId: recipes.ownerId,
      createdAt: recipes.createdAt,
      updatedAt: recipes.updatedAt,
      deletedAt: recipes.deletedAt,
      ingredientCount: sql<number>`(
        SELECT count(*)::int FROM ${ingredients} WHERE ${ingredients.recipeId} = ${recipes.id}
      )`,
      stepCount: sql<number>`(
        SELECT count(*)::int FROM ${steps} WHERE ${steps.recipeId} = ${recipes.id}
      )`,
    }).from(recipes)
      .leftJoin(dishes, eq(recipes.dishId, dishes.id))
      .where(and(eq(recipes.ownerId, ownerId), isNull(recipes.deletedAt)))
      .orderBy(desc(recipes.createdAt));
  }

  async findRecipeById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.ownerId, ownerId), isNull(recipes.deletedAt)));
    return row ?? null;
  }

  async updateRecipe(id: string, ownerId: string, data: Partial<{
    title: string; description: string | null;
    sourceType: string; sourceUrl: string | null;
    servings: number; prepTime: number | null; cookTime: number | null;
    totalTime: number | null; calories: number | null; imageMediaId: string | null;
  }>) {
    const [row] = await this.db.update(recipes)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(recipes.id, id), eq(recipes.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDeleteRecipe(id: string, ownerId: string) {
    await this.db.update(recipes)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(recipes.id, id), eq(recipes.ownerId, ownerId)));
  }

  // ========== INGREDIENTS ==========

  async createIngredient(data: {
    recipeId: string; name: string; amount?: string | null;
    unit?: string | null; order?: number; note?: string | null;
  }) {
    const [row] = await this.db.insert(ingredients).values({
      recipeId: data.recipeId, name: data.name,
      amount: data.amount ?? null, unit: data.unit ?? null,
      ord: data.order ?? 0, note: data.note ?? null,
    }).returning();
    return row;
  }

  async findIngredientsByRecipe(recipeId: string) {
    return this.db.select({
      id: ingredients.id,
      recipeId: ingredients.recipeId,
      name: ingredients.name,
      amount: ingredients.amount,
      unit: ingredients.unit,
      order: ingredients.ord,
      note: ingredients.note,
      createdAt: ingredients.createdAt,
    }).from(ingredients)
      .where(eq(ingredients.recipeId, recipeId))
      .orderBy(asc(ingredients.ord));
  }

  async updateIngredient(id: string, data: Partial<{
    name: string; amount: string | null; unit: string | null; ord: number;
  }>) {
    const [row] = await this.db.update(ingredients)
      .set(data)
      .where(eq(ingredients.id, id))
      .returning();
    return row ?? null;
  }

  async deleteIngredient(id: string) {
    await this.db.delete(ingredients).where(eq(ingredients.id, id));
  }

  async deleteIngredientsByRecipe(recipeId: string) {
    await this.db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
  }

  // ========== STEPS ==========

  async createStep(data: { recipeId: string; instruction: string; order?: number }) {
    const [row] = await this.db.insert(steps).values({
      recipeId: data.recipeId, instruction: data.instruction,
      ord: data.order ?? 0,
    }).returning();
    return row;
  }

  async findStepsByRecipe(recipeId: string) {
    return this.db.select().from(steps)
      .where(eq(steps.recipeId, recipeId))
      .orderBy(asc(steps.ord));
  }

  async updateStep(id: string, data: Partial<{
    instruction: string; ord: number;
  }>) {
    const [row] = await this.db.update(steps)
      .set(data)
      .where(eq(steps.id, id))
      .returning();
    return row ?? null;
  }

  async deleteStep(id: string) {
    await this.db.delete(steps).where(eq(steps.id, id));
  }

  async deleteStepsByRecipe(recipeId: string) {
    await this.db.delete(steps).where(eq(steps.recipeId, recipeId));
  }

  // ========== TAGS ==========

  async addTag(data: { recipeId: string; tagId: string }) {
    const [row] = await this.db.insert(recipeTags).values(data).returning();
    return row;
  }

  async findTagsByRecipe(recipeId: string) {
    return this.db.select().from(recipeTags)
      .where(eq(recipeTags.recipeId, recipeId));
  }

  async removeTag(id: string) {
    await this.db.delete(recipeTags).where(eq(recipeTags.id, id));
  }

  async removeTagsByRecipe(recipeId: string) {
    await this.db.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId));
  }

  // ========== TAG MANAGEMENT ==========

  async createTag(data: { ownerId: string; domain: string; name: string; color?: string }) {
    const [row] = await this.db.insert(tags).values(data).returning();
    return row;
  }

  async findTagsByOwnerAndDomain(ownerId: string, domain: string) {
    return this.db.select().from(tags)
      .where(and(eq(tags.ownerId, ownerId), eq(tags.domain, domain)))
      .orderBy(asc(tags.name));
  }

  async findTagsByRecipeWithDetails(recipeId: string) {
    return this.db.select({
      tagId: tags.id,
      tagName: tags.name,
      tagColor: tags.color,
    }).from(recipeTags)
      .innerJoin(tags, eq(recipeTags.tagId, tags.id))
      .where(eq(recipeTags.recipeId, recipeId))
      .orderBy(asc(tags.name));
  }

  async removeTagByRecipeAndTagId(recipeId: string, tagId: string) {
    await this.db.delete(recipeTags)
      .where(and(eq(recipeTags.recipeId, recipeId), eq(recipeTags.tagId, tagId)));
  }
}
