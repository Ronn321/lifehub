import { Injectable, Logger } from '@nestjs/common';

// ===================== RAW DTOs =====================

export interface RawIngredient {
  rawText: string;
  amount: string | null;
  unit: string | null;
  name: string | null;
  group: string | null;
  groupOrder: number;
}

export interface RawStep {
  order: number;
  instruction: string;
  timerSeconds: number | null;
}

export interface NutritionInfo {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

export interface RawRecipeDTO {
  title: string;
  description: string | null;
  ingredients: RawIngredient[];
  steps: RawStep[];
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calories: number | null;
  nutrition: NutritionInfo | null;
  imageUrls: string[];
  categories: string[];
  tags: string[];
  sourceType: string;
  sourceUrl: string;
}

// ===================== JSON-LD TYPES =====================

interface JsonLdRecipe {
  '@type': string;
  name?: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: JsonLdStep[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string;
  image?: string | string[];
  nutrition?: JsonLdNutrition;
  recipeCategory?: string | string[];
  keywords?: string;
  recipeCuisine?: string | string[];
}

interface JsonLdStep {
  '@type': string;
  text?: string;
  name?: string;
  url?: string;
}

interface JsonLdNutrition {
  '@type': string;
  calories?: string;
  proteinContent?: string;
  fatContent?: string;
  carbohydrateContent?: string;
}

@Injectable()
export class RecipeExtractorService {
  private readonly logger = new Logger(RecipeExtractorService.name);

  async extract(html: string, sourceUrl: string, sourceType: string): Promise<RawRecipeDTO> {
    // Versuche zuerst JSON-LD Extraktion
    const jsonLdResult = this.extractFromJsonLd(html);
    if (jsonLdResult) {
      jsonLdResult.sourceUrl = sourceUrl;
      jsonLdResult.sourceType = sourceType;
      // Try to enrich with Nuxt ingredient groups (Chefkoch SPA)
      this.enrichWithNuxtIngredientGroups(html, jsonLdResult);
      // Apply section groups from HTML header positions
      this.applyIngredientGroupsFromHtml(html, jsonLdResult.ingredients);
      return jsonLdResult;
    }

    this.logger.warn('No JSON-LD recipe found, falling back to DOM extraction');
    const domResult = this.extractFromDom(html);
    domResult.sourceUrl = sourceUrl;
    domResult.sourceType = sourceType;
    return domResult;
  }

  // ===================== JSON-LD EXTRACTION =====================

  private extractFromJsonLd(html: string): RawRecipeDTO | null {
    // Find all JSON-LD script tags
    const jsonLdRegex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const raw = match[1]!.trim();
        const parsed = JSON.parse(raw);

        // Handle @graph arrays
        const recipes: JsonLdRecipe[] = Array.isArray(parsed)
          ? parsed
          : parsed['@graph'] ?? [parsed];

        for (const item of recipes) {
          if (this.isRecipeJsonLd(item)) {
            return this.transformJsonLdToRaw(item);
          }
        }
      } catch {
        // Skip malformed JSON-LD blocks
        continue;
      }
    }

    return null;
  }

  private isRecipeJsonLd(item: JsonLdRecipe): boolean {
    const type = item['@type'];
    if (Array.isArray(type)) {
      return type.includes('Recipe');
    }
    return type === 'Recipe';
  }

  private transformJsonLdToRaw(item: JsonLdRecipe): RawRecipeDTO {
    // Parse times: PT15M → 15
    const parseIsoDuration = (iso: string | undefined): number | null => {
      if (!iso) return null;
      const m = iso.match(/PT?(?:(\d+)H)?(?:(\d+)M)?/);
      if (!m) return null;
      const hours = parseInt(m[1] ?? '0', 10);
      const minutes = parseInt(m[2] ?? '0', 10);
      return hours * 60 + minutes;
    };

    // Parse servings: "4 Portionen" → 4
    const parseServings = (yield_: string | undefined): number | null => {
      if (!yield_) return null;
      const m = yield_.match(/(\d+)/);
      return m ? parseInt(m[1]!, 10) : null;
    };

    // Parse nutrition string: "320 kcal" → 320
    const parseNutritionValue = (value: string | undefined): number | null => {
      if (!value) return null;
      const m = value.match(/(\d+(?:[.,]\d+)?)/);
      return m ? parseFloat(m[1]!.replace(',', '.')) : null;
    };

    // Parse ingredients from raw strings
    let ingredients: RawIngredient[] = [];
    if (Array.isArray(item.recipeIngredient)) {
      for (const ing of item.recipeIngredient) {
        const clean = ing.trim().toLowerCase();
        if (clean) {
          ingredients.push({
            rawText: ing.trim(),
            amount: null,
            unit: null,
            name: ing.trim(),
            group: null,
            groupOrder: 0,
          });
        }
      }
    }

    // Deduplicate: skip if grouped (groups preserve context), dedup with warning if flat
    if (!ingredients.some(i => i.group !== null)) {
      const seen = new Set<string>();
      ingredients = ingredients.filter(i => {
        const key = i.name?.toLowerCase() ?? '';
        if (seen.has(key)) {
          this.logger.warn(`Duplicate ingredient removed: "${i.rawText}"`);
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    // Parse steps — handle Chefkoch HowToSection format
    const steps: RawStep[] = [];
    if (Array.isArray(item.recipeInstructions)) {
      const rawStepTexts: string[] = [];

      // Recursively extract text from instructions (handles HowToSection wrappers)
      const extractInstructionText = (instruction: any) => {
        if (typeof instruction === 'string' && instruction.trim().length > 10) {
          rawStepTexts.push(instruction.trim());
        } else if (instruction && typeof instruction === 'object') {
          // HowToSection: has itemListElement with nested HowToStep items
          if (Array.isArray(instruction.itemListElement)) {
            for (const step of instruction.itemListElement) {
              extractInstructionText(step);
            }
          }
          // HowToStep or general: has text property
          if (typeof instruction.text === 'string' && instruction.text.trim().length > 10) {
            rawStepTexts.push(instruction.text.trim());
          }
          // Fallback: has name but not a section
          else if (typeof instruction.name === 'string' && instruction['@type'] !== 'HowToSection') {
            rawStepTexts.push(instruction.name.trim());
          }
        }
      };

      for (const instruction of item.recipeInstructions) {
        extractInstructionText(instruction);
      }

      // Filter duplicates and blank entries
      const unique = rawStepTexts.filter((t, i, arr) =>
        t.length > 10 && arr.indexOf(t) === i
      );

      unique.forEach((text, index) => {
        steps.push({ order: index, instruction: text, timerSeconds: null });
      });
    }

    // Parse images
    const imageUrls: string[] = [];
    if (typeof item.image === 'string') {
      imageUrls.push(item.image);
    } else if (Array.isArray(item.image)) {
      for (const img of item.image) {
        if (typeof img === 'string') imageUrls.push(img);
      }
    }

    // Parse categories
    const categories: string[] = [];
    if (typeof item.recipeCategory === 'string') {
      categories.push(item.recipeCategory);
    } else if (Array.isArray(item.recipeCategory)) {
      categories.push(...item.recipeCategory);
    }

    // Parse tags from keywords
    const tags: string[] = [];
    if (item.keywords) {
      tags.push(...item.keywords.split(',').map(k => k.trim()).filter(Boolean));
    }

    // Parse cuisine
    if (typeof item.recipeCuisine === 'string') {
      tags.push(`cuisine:${item.recipeCuisine}`);
    } else if (Array.isArray(item.recipeCuisine)) {
      for (const c of item.recipeCuisine) {
        if (typeof c === 'string') tags.push(`cuisine:${c}`);
      }
    }

    return {
      title: item.name ?? 'Untitled Recipe',
      description: item.description ?? null,
      ingredients,
      steps,
      servings: parseServings(item.recipeYield),
      prepTime: parseIsoDuration(item.prepTime),
      cookTime: parseIsoDuration(item.cookTime),
      totalTime: parseIsoDuration(item.totalTime),
      calories: item.nutrition ? parseNutritionValue(item.nutrition.calories) : null,
      nutrition: item.nutrition ? {
        calories: parseNutritionValue(item.nutrition.calories),
        protein: parseNutritionValue(item.nutrition.proteinContent),
        fat: parseNutritionValue(item.nutrition.fatContent),
        carbs: parseNutritionValue(item.nutrition.carbohydrateContent),
      } : null,
      imageUrls,
      categories,
      tags,
      sourceType: 'json-ld',
      sourceUrl: '',
    };
  }

  /**
   * Chefkoch SPA (Nuxt) stores ingredient groups in a JSON payload inside script tags.
   * Look for "originalIngredientGroups": [{"header":"...","ingredients":[...]},...]
   * If found, apply the groups to the already-extracted flat ingredient list.
   */
  private enrichWithNuxtIngredientGroups(html: string, recipe: RawRecipeDTO): void {
    // Find all application/json script tags (Nuxt payload)
    const scriptRegex = /<script[^>]*type="application\/json"[^>]*id="__NEXT_DATA__"?[^>]*>([\s\S]*?)<\/script>/gi;
    // Also try spark-config script tags used by Chefkoch
    const sparkRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
    
    const extractGroups = (regex: RegExp): Array<{header: string; ingredients: string[]}> | null => {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(html)) !== null) {
        try {
          const data = JSON.parse(match[1]!);
          // Walk the object tree to find originalIngredientGroups
          const found = this.findIngredientGroups(data);
          if (found && found.length > 0) return found;
        } catch { continue; }
      }
      return null;
    };
    
    const groups = extractGroups(sparkRegex) ?? extractGroups(scriptRegex);
    if (!groups || groups.length === 0) return;
    
    this.logger.log(`Found ${groups.length} Nuxt ingredient groups: ${groups.map(g => g.header).join(', ')}`);
    
    // Build a lookup: lowercase ingredient text → group info
    const ingredientGroupMap = new Map<string, {group: string; groupOrder: number}>();
    groups.forEach((g, groupOrder) => {
      for (const ing of g.ingredients) {
        const key = ing.toLowerCase().trim();
        if (!ingredientGroupMap.has(key)) {
          ingredientGroupMap.set(key, { group: g.header, groupOrder });
        }
      }
    });
    
    // Apply groups to existing ingredients
    for (const ing of recipe.ingredients) {
      const key = (ing.rawText ?? '').toLowerCase().trim();
      const groupInfo = ingredientGroupMap.get(key);
      if (groupInfo) {
        ing.group = groupInfo.group;
        ing.groupOrder = groupInfo.groupOrder;
      }
    }
  }

  /**
   * Recursively search an object for "originalIngredientGroups" array.
   */
  private findIngredientGroups(obj: any): Array<{header: string; ingredients: string[]}> | null {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = this.findIngredientGroups(item);
        if (result) return result;
      }
      return null;
    }
    // Direct match
    if (obj.originalIngredientGroups && Array.isArray(obj.originalIngredientGroups)) {
      return obj.originalIngredientGroups;
    }
    // Recurse into object values
    for (const v of Object.values(obj)) {
      const result = this.findIngredientGroups(v);
      if (result) return result;
    }
    return null;
  }

  // ===================== DOM EXTRACTION (FALLBACK) =====================

  private extractFromDom(html: string): RawRecipeDTO {
    // Simple regex-based DOM extraction for Chefkoch-style pages
    // In production, use cheerio for proper DOM parsing

    const title = this.extractTitle(html);
    const groupedIngredients = this.extractGroupedIngredientsFromDom(html);
    const steps = this.extractStepsFromDom(html);
    const prepTime = this.extractTime(html, /(\d+)\s*Min\.?\s*Vorbereitung/i);
    const cookTime = this.extractTime(html, /(\d+)\s*Min\.?\s*Kochzeit/i);
    const totalTime = this.extractTime(html, /(\d+)\s*Min\.?\s*Gesamtzeit/i);
    const servings = this.extractServings(html);
    const description = this.extractMetaContent(html, 'description');
    const imageUrl = this.extractMetaContent(html, 'og:image');

    const ingredients: RawIngredient[] = [];
    groupedIngredients.forEach((group, groupOrder) => {
      for (const ingText of group.ingredients) {
        ingredients.push({
          rawText: ingText,
          amount: null,
          unit: null,
          name: ingText,
          group: group.group || null,
          groupOrder,
        });
      }
    });

    return {
      title,
      description,
      ingredients,
      steps: steps.map((s, i) => ({
        order: i,
        instruction: s,
        timerSeconds: null,
      })),
      servings,
      prepTime,
      cookTime,
      totalTime,
      calories: null,
      nutrition: null,
      imageUrls: imageUrl ? [imageUrl] : [],
      categories: [],
      tags: [],
      sourceType: 'dom',
      sourceUrl: '',
    };
  }

  /**
   * After JSON-LD extraction, scan HTML for ingredient section headers
   * like "Zutaten für das Fleisch und die Marinade:" and "Zutaten für die Sauce:"
   * then apply group metadata to the flat ingredient list by position in the HTML.
   */
  private applyIngredientGroupsFromHtml(html: string, ingredients: RawIngredient[]): void {
    // Find section header positions in the HTML
    const sectionRegex = /Zutaten\s*(?:für|für die|für das)\s*([^:]+):/gi;
    const sections: Array<{ name: string; index: number }> = [];
    let match: RegExpExecArray | null;
    
    while ((match = sectionRegex.exec(html)) !== null) {
      sections.push({
        name: match[1]!.trim(),
        index: match.index,
      });
    }
    
    if (sections.length < 2) return; // Single group = no change needed
    
    // Estimate ingredient count per section by scanning HTML between headers
    // Count <tr> rows or ingredient units between each section header
    for (let s = 0; s < sections.length; s++) {
      const start = sections[s]!.index;
      const end = s + 1 < sections.length ? sections[s + 1]!.index : html.length;
      const sectionHtml = html.slice(start, end);
      
      // Count ingredient rows (tr tags with amounts like <td>500 g</td> or similar)
      const rows = sectionHtml.match(/<tr[^>]*>/g);
      const ingredientCount = rows ? rows.length : 0;
      
      if (ingredientCount <= 0) continue;
      
      // Find the next N ungrouped ingredients and assign them
      let applied = 0;
      for (let i = 0; i < ingredients.length && applied < ingredientCount; i++) {
        if (!ingredients[i]!.group && ingredients[i]!.name) {
          ingredients[i]!.group = sections[s]!.name;
          ingredients[i]!.groupOrder = s;
          applied++;
        }
      }
    }
  }

  private extractTitle(html: string): string {
    // Try h1 first, then og:title, then title tag
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) return this.stripHtml(h1Match[1]!).trim();

    const ogMatch = html.match(/<meta\s+property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
    if (ogMatch && ogMatch[1]) return ogMatch[1];

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      const t = this.stripHtml(titleMatch[1]!).trim();
      // Remove site name suffix like " | Chefkoch.de"
      return t.replace(/\s*\|.*$/, '').trim();
    }

    return 'Untitled Recipe';
  }

  /**
   * Extract grouped ingredients from the DOM.
   * Finds section headers like "Zutaten für das Fleisch und die Marinade:"
   * and groups ingredients under each section.
   */
  private extractGroupedIngredientsFromDom(html: string): Array<{ group: string; ingredients: string[] }> {
    const groups: Array<{ group: string; ingredients: string[] }> = [];

    // Find section headers: "Zutaten für die Sauce:", "Zutaten für das Fleisch:"
    const sectionRegex = /Zutaten\s*(?:für|für die|für das)\s*([^:]+):/gi;
    let match: RegExpExecArray | null;
    const sectionMatches: Array<{ groupName: string; index: number; endIndex: number }> = [];

    while ((match = sectionRegex.exec(html)) !== null) {
      sectionMatches.push({
        groupName: match[1]!.trim(),
        index: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    if (sectionMatches.length === 0) {
      // No sections found — fallback to flat extraction
      const ingredients = this.extractIngredientsFromDom(html);
      groups.push({ group: '', ingredients });
      return groups;
    }

    // For each section, extract ingredients between this header and the next
    for (let i = 0; i < sectionMatches.length; i++) {
      const current = sectionMatches[i]!;
      const next = sectionMatches[i + 1];

      // Section content starts after the header, ends before the next header (or end of HTML)
      const sectionStart = current.endIndex;
      const sectionEnd = next ? next.index : html.length;
      const sectionHtml = html.substring(sectionStart, sectionEnd);

      const ingredients = this.extractIngredientRows(sectionHtml);
      groups.push({ group: current.groupName, ingredients });
    }

    return groups;
  }

  /**
   * Extract ingredient text rows from a section HTML fragment.
   * Tries <tr> rows, then ingredient-class divs, then <br>-splitting as fallback.
   */
  private extractIngredientRows(html: string): string[] {
    const results: string[] = [];

    // Try <tr> rows (common in Chefkoch ingredient tables)
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (rows) {
      for (const row of rows) {
        const text = this.stripHtml(row).trim();
        if (text && text.length > 1) results.push(text);
      }
      if (results.length > 0) return results;
    }

    // Try div elements with class containing "ingredient"
    const divPattern = /<div[^>]*class="[^"]*ingredient[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let divMatch: RegExpExecArray | null;
    while ((divMatch = divPattern.exec(html)) !== null) {
      const text = this.stripHtml(divMatch[1]!).trim();
      if (text && text.length > 1) results.push(text);
    }
    if (results.length > 0) return results;

    // Fallback: split by <br> tags
    const brSplit = html.split(/<br\s*\/?>/gi);
    if (brSplit.length > 1) {
      for (const part of brSplit) {
        const text = this.stripHtml(part).trim();
        if (text && text.length > 1) results.push(text);
      }
      return results;
    }

    // Last resort: strip HTML and split by newlines
    const text = this.stripHtml(html);
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 1) results.push(trimmed);
    }

    return results;
  }

  /**
   * Flat ingredient extraction — kept as fallback when no section headers are found.
   */
  private extractIngredientsFromDom(html: string): string[] {
    const results: string[] = [];

    // Try table.ingredients
    const tableMatch = html.match(/<table[^>]*class=["'][^"']*ingredients[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const rows = tableMatch[1]!.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      if (rows) {
        for (const row of rows) {
          const text = this.stripHtml(row).trim();
          if (text) results.push(text);
        }
      }
      if (results.length > 0) return results;
    }

    // Try JSON-LD ingredient as fallback
    return results;
  }

  private extractStepsFromDom(html: string): string[] {
    const results: string[] = [];

    // Try article
    const articleMatch = html.match(/<article[^>]*data-type=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      const ps = articleMatch[1]!.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (ps) {
        for (const p of ps) {
          const text = this.stripHtml(p).trim();
          if (text) results.push(text);
        }
      }
      if (results.length > 0) return results;
    }

    return results;
  }

  private extractTime(html: string, regex: RegExp): number | null {
    const m = html.match(regex);
    return m ? parseInt(m[1]!, 10) : null;
  }

  private extractServings(html: string): number | null {
    const m = html.match(/(\d+)\s*Portionen?/i);
    return m ? parseInt(m[1]!, 10) : null;
  }

  private extractMetaContent(html: string, property: string): string | null {
    const m = html.match(
      new RegExp(`<meta\\s+(?:name|property)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
    );
    return m ? m[1] ?? null : null;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
