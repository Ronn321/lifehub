import { Injectable, Logger } from '@nestjs/common';

export interface ParsedIngredient {
  rawText: string;
  amount: string | null;
  unit: string | null;
  name: string | null;
  note: string | null;
  parseConfidence: number;
}

@Injectable()
export class IngredientParserService {
  private readonly logger = new Logger(IngredientParserService.name);

  // Known German units (can include parenthetical suffixes like (e), (s), (n))
  private readonly knownUnits = new Set([
    'g', 'gramm', 'kg', 'kilo', 'mg',
    'ml', 'l', 'liter', 'cl',
    'el', 'esslöffel',
    'tl', 'teelöffel',
    'stück', 'stk', 'stk.',
    'bund', 'dose', 'dosen',
    'pck', 'packung', 'päckchen',
    'prise', 'msp', 'messerspitze',
    'zehe', 'zehen',
    'scheibe', 'scheiben',
    'blatt', 'blätter',
    'tropfen',
    'paar',
    'cm', 'mm',
    'dose', 'dosen',
  ]);

  parse(rawText: string): ParsedIngredient {
    const text = rawText.trim();
    if (!text) {
      return { rawText: text, amount: null, unit: null, name: null, note: null, parseConfidence: 0 };
    }

    // ===== QUALITATIVE INGREDIENTS =====
    // "etwas Salz und Pfeffer", "evtl. Koriandergrün", "n. B. Muskat"
    const qualMatch = text.match(/^(etwas|evtl\.?|nach\s+Bedarf|nach\s+Belieben|n\.?\s*B\.?|bei\s+Bedarf)\s+(.+)$/i);
    if (qualMatch) {
      return {
        rawText: text,
        amount: null,
        unit: qualMatch[1]!.trim(),
        name: this.normalizeName(qualMatch[2]!),
        note: null,
        parseConfidence: 0.9,
      };
    }

    // ===== QUANTITY + NAME =====
    // Try to extract amount first
    const amountMatch = text.match(/^(\d+(?:[.,\/]\d+)?)\s+(.+)$/);
    if (!amountMatch) {
      // No number at start — just a name
      return {
        rawText: text,
        amount: null,
        unit: null,
        name: this.normalizeName(text),
        note: null,
        parseConfidence: 0.7,
      };
    }

    const amount = this.normalizeAmount(amountMatch[1]!);
    const rest = amountMatch[2]!.trim();

    // ===== CHECK FOR KNOWN UNIT =====
    // Split rest into words and check if first word(s) is a known unit
    const words = rest.split(/\s+/);
    let unit: string | null = null;
    let namePart = rest;

    if (words.length >= 1) {
      const firstWord = words[0]!.toLowerCase().replace(/[.()]$/, '');
      // Check for parenthetical unit variants: "Stück(e)", "Scheibe(n)", "Lachsfilet(s)"
      const baseWord = firstWord.replace(/\([a-z]+\)$/i, '');

      if (this.knownUnits.has(firstWord) || this.knownUnits.has(baseWord)) {
        unit = words[0]!;
        namePart = words.slice(1).join(' ');
      } else {
        // The first word might be an adjective like "m.-große", "kleine", "große"
        // In that case, no unit
        unit = null;
        namePart = rest;
      }
    }

    // ===== SPLIT NAME + NOTE =====
    // Only extract note if it's a real preparation note (not a German plural suffix)
    let name = namePart;
    let note: string | null = null;
    const noteMatch = namePart.match(/^(.+?)\s*\((.+?)\)\s*$/);
    if (noteMatch) {
      const potentialNote = noteMatch[2]!.trim();
      // Skip short German plural suffixes: (s), (e), (n), (en), (es), (er)
      const germanPluralSuffixes = /^(s|e|n|en|es|er)$/i;
      if (!germanPluralSuffixes.test(potentialNote)) {
        name = noteMatch[1]!.trim();
        note = potentialNote;
      }
      // Otherwise keep the original name with parentheses intact
    }

    return {
      rawText: text,
      amount,
      unit: unit ? this.normalizeUnit(unit) : null,
      name: this.normalizeName(name),
      note,
      parseConfidence: amount ? 0.9 : 0.6,
    };
  }

  isDuplicate(a: ParsedIngredient, b: ParsedIngredient): boolean {
    // Case-insensitive name comparison
    const nameA = (a.name ?? a.rawText).toLowerCase().trim();
    const nameB = (b.name ?? b.rawText).toLowerCase().trim();
    return nameA === nameB && a.amount === b.amount;
  }

  private normalizeAmount(amount: string): string {
    // Unicode fractions
    const fractionMap: Record<string, string> = {
      '½': '0.5', '¼': '0.25', '¾': '0.75',
      '⅓': '0.333', '⅔': '0.667',
      '⅛': '0.125', '⅜': '0.375', '⅝': '0.625', '⅞': '0.875',
    };

    for (const [key, value] of Object.entries(fractionMap)) {
      if (amount.includes(key)) {
        const intPart = amount.replace(key, '');
        const int = intPart ? parseInt(intPart, 10) : 0;
        return String(int + parseFloat(value));
      }
    }

    const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      return String(parseInt(fractionMatch[1]!, 10) / parseInt(fractionMatch[2]!, 10));
    }

    return amount.replace(',', '.');
  }

  private normalizeUnit(unit: string): string {
    const map: Record<string, string> = {
      'EL': 'tbsp', 'Esslöffel': 'tbsp',
      'TL': 'tsp', 'Teelöffel': 'tsp',
      'ml': 'ml', 'l': 'l', 'cl': 'cl',
      'g': 'g', 'kg': 'kg', 'mg': 'mg',
      'Stück': 'piece', 'Stück(e)': 'piece', 'Stk': 'piece',
      'Bund': 'bunch', 'Dose': 'can',
      'Pck': 'pack', 'Pck.': 'pack', 'Packung': 'pack',
      'Prise': 'pinch',
      'Zehe': 'clove', 'Zehen': 'clove',
      'Scheibe': 'slice', 'Scheiben': 'slice',
      'Blatt': 'leaf', 'Blätter': 'leaf',
    };
    const clean = unit.replace(/[.()]/g, '').trim();
    return map[clean] ?? clean;
  }

  private normalizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
}