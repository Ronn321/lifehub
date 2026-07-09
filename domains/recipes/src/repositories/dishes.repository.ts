import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DbService, dishes, recipes, ingredients, steps, type Db } from '@lifehub/db';

export class DishesRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async create(data: {
    ownerId: string; title: string; titleEn?: string;
    description?: string; caption?: string;
    heroText?: string; primaryColor?: string;
  }) {
    const [row] = await this.db.insert(dishes).values({
      ownerId: data.ownerId,
      title: data.title,
      titleEn: data.titleEn ?? null,
      description: data.description ?? null,
      caption: data.caption ?? null,
      heroText: data.heroText ?? null,
      primaryColor: data.primaryColor ?? null,
    }).returning();
    return row;
  }

  async findByOwner(ownerId: string) {
    return this.db.select()
      .from(dishes)
      .where(and(eq(dishes.ownerId, ownerId), isNull(dishes.deletedAt)))
      .orderBy(sql`LOWER(${dishes.title})`);
  }

  async findById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(dishes)
      .where(and(eq(dishes.id, id), eq(dishes.ownerId, ownerId), isNull(dishes.deletedAt)));
    return row ?? null;
  }

  async update(id: string, ownerId: string, data: Partial<{
    title: string; titleEn?: string; description?: string;
    caption?: string; heroText?: string; primaryColor?: string;
  }>) {
    const [row] = await this.db.update(dishes)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(dishes.id, id), eq(dishes.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, ownerId: string) {
    await this.db.update(dishes)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(dishes.id, id), eq(dishes.ownerId, ownerId)));
  }

  async findRecipesByDish(dishId: string, ownerId: string) {
    return this.db.select({
      id: recipes.id,
      title: recipes.title,
      titleEn: recipes.titleEn,
      variantLabel: recipes.variantLabel,
      effortLevel: recipes.effortLevel,
      containsFlags: recipes.containsFlags,
      attributes: recipes.attributes,
      servings: recipes.servings,
      prepTime: recipes.prepTime,
      cookTime: recipes.cookTime,
      totalTime: recipes.totalTime,
      calories: recipes.calories,
      ingredientCount: sql<number>`(
        SELECT count(*)::int FROM ${ingredients} WHERE ${ingredients.recipeId} = ${recipes.id}
      )`,
      stepCount: sql<number>`(
        SELECT count(*)::int FROM ${steps} WHERE ${steps.recipeId} = ${recipes.id}
      )`,
    }).from(recipes)
      .where(and(eq(recipes.dishId, dishId), eq(recipes.ownerId, ownerId), isNull(recipes.deletedAt)));
  }
}
