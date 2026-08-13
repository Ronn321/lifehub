import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Inject, Param, Post, UseGuards, BadRequestException, Logger,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { ImportOrchestratorService, type ImportResult } from '../services/import/import-orchestrator.service';
import { RecipesService } from '../services/recipes.service';
import { RecipeImageService } from '../services/recipe-image.service';
import { importRecipeSchema } from '../dtos/recipes.dto';
import { z } from 'zod';

const confirmImportBodySchema = z.object({
  jobId: z.string().optional(),
  recipe: z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    ingredients: z.array(z.object({
      amount: z.string().nullable().optional(),
      unit: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      group: z.string().nullable().optional(),
      groupOrder: z.number().optional(),
    })),
    steps: z.array(z.object({
      instruction: z.string(),
      order: z.number().optional(),
    })),
    servings: z.number().nullable().optional(),
    prepTime: z.number().nullable().optional(),
    cookTime: z.number().nullable().optional(),
    totalTime: z.number().nullable().optional(),
    calories: z.number().nullable().optional(),
    sourceUrl: z.string().optional(),
    sourceType: z.string().optional(),
    imageUrls: z.array(z.string()).optional(),
  }),
});

@UseGuards(JwtGuard, PermissionGuard)
@Controller('recipes')
export class RecipesImportController {
  private readonly logger = new Logger(RecipesImportController.name);
  constructor(
    @Inject(ImportOrchestratorService)
    private readonly importer: ImportOrchestratorService,
    @Inject(RecipesService)
    private readonly recipesService: RecipesService,
    @Inject(RecipeImageService)
    private readonly imageService: RecipeImageService,
  ) {}

  @Post('import')
  @RequirePermission('recipes', 'create')
  @HttpCode(HttpStatus.ACCEPTED)
  async importFromUrl(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<ImportResult> {
    const dto = importRecipeSchema.parse(body);
    return this.importer.executeImport(
      dto.url,
      user.sub,
      dto.mode,
    );
  }

  @Get('import/:jobId')
  @RequirePermission('recipes', 'read')
  async getImportStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ status: string; jobId: string }> {
    return { status: 'draft', jobId };
  }

  @Post('import/confirm')
  @RequirePermission('recipes', 'create')
  async confirmImport(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const dto = confirmImportBodySchema.parse(body);

    if (!dto.recipe.title) {
      throw new BadRequestException('Recipe title is required');
    }
    if (!dto.recipe.ingredients || dto.recipe.ingredients.length === 0) {
      throw new BadRequestException('At least one ingredient is required');
    }
    if (!dto.recipe.steps || dto.recipe.steps.length === 0) {
      throw new BadRequestException('At least one step is required');
    }

    // Create the recipe
    const created = await this.recipesService.createRecipe(user.sub, {
      title: dto.recipe.title,
      description: dto.recipe.description ?? undefined,
      servings: dto.recipe.servings ?? 4,
      prepTime: dto.recipe.prepTime ?? undefined,
      cookTime: dto.recipe.cookTime ?? undefined,
      totalTime: dto.recipe.totalTime ?? undefined,
      calories: dto.recipe.calories ?? undefined,
      sourceType: (dto.recipe.sourceUrl && dto.recipe.sourceUrl.startsWith('http')) ? 'url' : 'manual',
      sourceUrl: dto.recipe.sourceUrl ?? undefined,
    });

    if (!created) {
      throw new BadRequestException('Failed to create recipe');
    }

    // Add ingredients with group-order encoding
    for (let i = 0; i < dto.recipe.ingredients.length; i++) {
      const ing = dto.recipe.ingredients[i]!;
      if (ing.name) {
        await this.recipesService.addIngredient(user.sub, created.id, {
          name: ing.name,
          amount: ing.amount ? parseFloat(ing.amount) : undefined as any,
          unit: ing.unit ?? undefined as any,
          order: (ing.groupOrder ?? 0) * 100 + i,
          note: ing.group ?? undefined,
        });
      }
    }

    // Add steps
    for (let i = 0; i < dto.recipe.steps.length; i++) {
      const step = dto.recipe.steps[i]!;
      if (step.instruction) {
        await this.recipesService.addStep(user.sub, created.id, {
          instruction: step.instruction,
          order: step.order ?? i,
        });
      }
    }

    // Download the first image if available
    if (dto.recipe.imageUrls && dto.recipe.imageUrls.length > 0) {
      try {
        const imagePath = await this.imageService.downloadImage(dto.recipe.imageUrls[0]!);
        if (imagePath) {
          this.logger.log(`Recipe image saved: ${imagePath}`);
          // Store image mapping in a JSON lookup file
          try {
            const { readFileSync, writeFileSync, existsSync } = await import('fs');
            const { join } = await import('path');
            const basePath = process.env.LIFEHUB_RECIPES_IMAGES_PATH ?? '/data/storage/recipes';
            const mapPath = join(basePath, '.image-map.json');
            let map: Record<string, string> = {};
            if (existsSync(mapPath)) {
              map = JSON.parse(readFileSync(mapPath, 'utf-8'));
            }
            map[created.id] = imagePath;
            writeFileSync(mapPath, JSON.stringify(map, null, 2));
          } catch (mapErr) {
            this.logger.warn(`Failed to store image mapping: ${(mapErr as Error).message}`);
          }
        }
      } catch (err) {
        this.logger.warn(`Image download failed: ${(err as Error).message}`);
      }
    }

    return created;
  }

  @Delete('import/:jobId')
  @RequirePermission('recipes', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async discardImport(
    @Param('jobId') jobId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
  }
}
