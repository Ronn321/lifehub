import { Injectable, Logger } from '@nestjs/common';
import { UrlDetectorService } from './url-detector.service';
import { HtmlFetcherService } from './html-fetcher.service';
import { RecipeExtractorService, RawRecipeDTO, RawIngredient } from './recipe-extractor.service';
import { IngredientParserService } from './ingredient-parser.service';

export type ImportJobStatus =
  | 'pending' | 'fetching' | 'parsing' | 'normalizing'
  | 'mapping' | 'draft' | 'confirmed' | 'failed';

export interface ImportResult {
  jobId: string;
  status: ImportJobStatus;
  recipe?: RawRecipeDTO;
  errors?: string[];
  warnings?: string[];
}

@Injectable()
export class ImportOrchestratorService {
  private readonly logger = new Logger(ImportOrchestratorService.name);

  constructor(
    private readonly urlDetector: UrlDetectorService,
    private readonly htmlFetcher: HtmlFetcherService,
    private readonly recipeExtractor: RecipeExtractorService,
    private readonly ingredientParser: IngredientParserService,
  ) {}

  async executeImport(
    url: string,
    ownerId: string,
    mode: 'raw' | 'normalized' | 'enhanced' = 'normalized',
  ): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const detection = this.urlDetector.detect(url);
      this.logger.log(`Import from ${detection.sourceType}: ${url}`);

      const fetchResult = await this.htmlFetcher.fetch(detection.validatedUrl);
      const rawRecipe = await this.recipeExtractor.extract(
        fetchResult.html,
        detection.validatedUrl,
        detection.sourceType,
      );

      if (!rawRecipe.title || rawRecipe.title === 'Untitled Recipe') {
        errors.push('Could not extract recipe title');
      }
      if (rawRecipe.ingredients.length === 0) {
        errors.push('No ingredients could be extracted');
      }
      if (rawRecipe.steps.length === 0) {
        errors.push('No cooking steps could be extracted');
      }

      if (errors.length > 0) {
        return { jobId: this.generateJobId(), status: 'failed', errors, warnings };
      }

      const normalized = this.applyBasicNormalization(rawRecipe, warnings);

      return {
        jobId: this.generateJobId(),
        status: 'draft',
        recipe: normalized,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(message);
      return { jobId: this.generateJobId(), status: 'failed', errors, warnings };
    }
  }

  private applyBasicNormalization(recipe: RawRecipeDTO, warnings: string[]): RawRecipeDTO {
    // Deduplicate ingredients per-group (same ingredient in different groups is OK)
    const groups = new Map<number, Map<string, RawIngredient>>();
    const ungrouped: RawIngredient[] = [];
    
    for (const ing of recipe.ingredients) {
      const parsed = this.ingredientParser.parse(ing.rawText);
      const nameKey = (parsed.name ?? parsed.rawText).toLowerCase().trim();
      const key = `${nameKey}|${parsed.amount ?? ''}`;
      const entry: RawIngredient = {
        rawText: parsed.rawText,
        amount: parsed.amount,
        unit: parsed.unit,
        name: parsed.name,
        group: ing.group,
        groupOrder: ing.groupOrder,
      };
      
      if (ing.groupOrder != null && ing.group !== null) {
        // Grouped ingredient — dedup within group only
        if (!groups.has(ing.groupOrder)) {
          groups.set(ing.groupOrder, new Map());
        }
        const groupMap = groups.get(ing.groupOrder)!;
        if (!groupMap.has(key)) {
          groupMap.set(key, entry);
        } else {
          warnings.push(`Duplicate ingredient removed: "${parsed.rawText}"`);
        }
      } else {
        // Ungrouped — global dedup (name + amount)
        const exists = ungrouped.some(u => {
          const ukey = `${(u.name ?? u.rawText).toLowerCase().trim()}|${u.amount ?? ''}`;
          return ukey === key;
        });
        if (!exists) {
          ungrouped.push(entry);
        } else {
          warnings.push(`Duplicate ingredient removed: "${parsed.rawText}"`);
        }
      }
    }
    
    // Flatten back: ungrouped first, then grouped by groupOrder
    const deduplicated: RawIngredient[] = [...ungrouped];
    for (const [_, groupMap] of [...groups.entries()].sort(([a], [b]) => a - b)) {
      deduplicated.push(...groupMap.values());
    }
    
    return {
      ...recipe,
      title: recipe.title.trim(),
      description: recipe.description?.trim() ?? null,
      ingredients: deduplicated,
    };
  }

  private generateJobId(): string {
    return crypto.randomUUID();
  }
}