# Recipes Unit Normalization

> **Vollständige Spezifikation der Einheiten-Normalisierung für die Import-Pipeline.**
> Definiert Mapping-Tabellen, Bruch-Parsing und Konvertierungsregeln.

---

## 1. Überblick

Die Unit-Normalisierung wandelt deutsche (und andere sprachspezifische) Einheiten aus importierten Rezepten in standardisierte, sprachunabhängige Einheiten um. Sie arbeitet in **Stage 5** der Import-Pipeline (siehe `recipes_import_dataflow.md`).

### Design-Prinzipien
- **Preserve, don't convert** — Einheiten werden normalisiert, nicht umgerechnet (1 EL ≠ 15 ml automatisch)
- **Deterministisch** — Gleiche Eingabe = gleiche Ausgabe
- **Erweiterbar** — Neue Einheiten einfach zur Mapping-Tabelle hinzufügen
- **Verlustfrei** — Original-Einheit wird immer gespeichert

---

## 2. Mapping-Tabelle: Deutsch → Standard

### 2.1 Volumen

| Deutsche Einheit | Abkürzung | Standard | Typ |
|---|---|---|---|
| Esslöffel | EL | tbsp | volume |
| Teelöffel | TL | tsp | volume |
| Milliliter | ml | ml | volume |
| Liter | l | l | volume |
| Zentiliter | cl | cl | volume |
| Tasse | Tasse | cup | volume |
| Becher | Becher | cup | volume |
| Glas | Glas | glass | volume |
| Schuss | Schuss | dash | volume |
| Spritzer | Spritzer | splash | volume |

### 2.2 Gewicht

| Deutsche Einheit | Abkürzung | Standard | Typ |
|---|---|---|---|
| Gramm | g | g | weight |
| Kilogramm | kg | kg | weight |
| Milligramm | mg | mg | weight |
| Pfund | Pfd | lb | weight |
| Dekagramm | dag | dag | weight |

### 2.3 Stück/Anzahl

| Deutsche Einheit | Standard | Typ |
|---|---|---|
| Stück | piece | count |
| Stk | piece | count |
| Stk. | piece | count |
| Bund | bunch | count |
| Dose | can | count |
| Dosen | can | count |
| Pck | pack | count |
| Pck. | pack | count |
| Packung | pack | count |
| Päckchen | sachet | count |
| Prise | pinch | count |
| Prisen | pinch | count |
| Zehe | clove | count |
| Zehen | clove | count |
| Scheibe | slice | count |
| Scheiben | slice | count |
| Blatt | leaf | count |
| Blätter | leaf | count |
| Paar | pair | count |
| Tropfen | drop | count |
| Messerspitze | pinch | count |
| Msp | pinch | count |
| Kopf | head | count |

### 2.4 Größe/Dimension

| Deutsche Einheit | Standard | Typ |
|---|---|---|
| cm | cm | dimension |
| mm | mm | dimension |
| Zoll | inch | dimension |

### 2.5 Sonstige

| Deutsche Einheit | Standard | Typ |
|---|---|---|
| nach Bedarf | as_needed | qualitative |
| nach Belieben | as_desired | qualitative |
| etwas | some | qualitative |
| n. B. | as_needed | qualitative |
| nach Geschmack | to_taste | qualitative |

---

## 3. Mengen-Parsing

### 3.1 Regex-Muster

```typescript
// Primäres Regex für "Menge Einheit Name"
const INGREDIENT_REGEX = /^([\d.,\/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*([a-zA-ZäöüÄÖÜß.]+)?\s+(.+)$/;

// Alternative: Menge am Ende: "Salz, 1 TL"
const REVERSED_REGEX = /^(.+?),?\s+([\d.,\/\s¼½¾⅓⅔]+)\s*([a-zA-ZäöüÄÖÜß.]+)$/;

// Nur Name (qualitative Angabe): "etwas Salz"
const QUALITATIVE_REGEX = /^(etwas|ein wenig|nach Bedarf|nach Belieben|n\.?\s*B\.?)\s+(.+)$/i;
```

### 3.2 Bruch-Parsing

```typescript
const FRACTION_MAP: Record<string, number> = {
  '½': 0.5,  '⅓': 1/3,  '⅔': 2/3,
  '¼': 0.25, '¾': 0.75,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1/6, '⅚': 5/6,
};

function parseFraction(input: string): number | null {
  // Unicode Bruch direkt
  if (FRACTION_MAP[input]) return FRACTION_MAP[input];

  // "1/2" → 0.5
  const fractionMatch = input.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);

  // "1½" → 1.5 (gemischte Zahl)
  const mixedMatch = input.match(/^(\d+)([¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])$/);
  if (mixedMatch) return parseInt(mixedMatch[1]) + (FRACTION_MAP[mixedMatch[2]] ?? 0);

  // Einfache Dezimalzahl
  if (/^\d+([.,]\d+)?$/.test(input.replace(',', '.'))) {
    return parseFloat(input.replace(',', '.'));
  }

  return null;
}
```

### 3.3 Beispiele

| Eingabe | Menge | Einheit | Name |
|---|---|---|---|
| `2 EL Olivenöl` | 2 | tbsp | Olivenöl |
| `1½ TL Salz` | 1.5 | tsp | Salz |
| `¼ l Milch` | 0.25 | l | Milch |
| `500 g Hackfleisch` | 500 | g | Hackfleisch |
| `1-2 Zehen Knoblauch` | 1.5 | clove | Knoblauch |
| `etwas Pfeffer` | null | as_needed | Pfeffer |
| `Salz, 1 TL` | 1 | tsp | Salz |
| `3 Stk Eier` | 3 | piece | Eier |
| `1 Pck. Backpulver` | 1 | pack | Backpulver |
| `n. B. Muskat` | null | as_needed | Muskat |

---

## 4. Bereichs-Parsing

Wenn Mengen als Bereich angegeben sind:

```
"1-2 Zehen Knoblauch" →
  amount: 1.5       // Mittelwert
  amountMin: 1       // Untergrenze
  amountMax: 2       // Obergrenze
  amountType: "range"
```

```
"2-3 EL Olivenöl" →
  amount: 2.5
  amountMin: 2
  amountMax: 3
  amountType: "range"
```

---

## 5. Normalisierungs-Pipeline

```
Eingabe: rawText = "2 EL Olivenöl"
     │
     ▼
1. Trim + Normalize Whitespace
     │  "2 EL Olivenöl"
     ▼
2. Unicode-Normalisierung (NFC)
     │
     ▼
3. Regex-Matching gegen INGREDIENT_REGEX
     │  Match: [full="2 EL Olivenöl", amount="2", unit="EL", name="Olivenöl"]
     ▼
4. Menge parsen (parseFraction)
     │  "2" → 2
     ▼
5. Einheit mappen (UNIT_MAP)
     │  "EL" → "tbsp"
     ▼
6. Name normalisieren (trim, lowercase, remove trailing punctuation)
     │  "Olivenöl" → "olivenöl"
     ▼
Ausgabe: { amount: 2, unit: "tbsp", name: "olivenöl", originalUnit: "EL", rawText: "2 EL Olivenöl" }
```

---

## 6. Kantenfälle

### 6.1 Keine Einheit

```
"500 Hackfleisch" → amount: 500, unit: null, name: "Hackfleisch"
```
Heuristik: Wenn die Menge > 100 → wahrscheinlich Gramm. User muss ggf. korrigieren.

### 6.2 Zwei Einheiten

```
"1 EL + 1 TL Zucker" → als zwei separate Ingredients behandeln
```

### 6.3 Klammern

```
"1 kg Kartoffeln (mehligkochend)" → name: "Kartoffeln", note: "mehligkochend"
```

### 6.4 Optional

```
"1 Bund Petersilie (optional)" → name: "Petersilie", optional: true
```

---

## 7. Datenstruktur

```typescript
interface ParsedIngredient {
  amount: number | null;
  amountMin?: number;
  amountMax?: number;
  amountType: 'exact' | 'range' | 'qualitative' | 'unknown';
  unit: string | null;           // Standardized unit
  originalUnit: string | null;   // Original unit text
  name: string;
  note: string | null;
  optional: boolean;
  rawText: string;               // Original text for debugging
  parseConfidence: number;       // 0.0–1.0
}
```

---

## 8. Mapping-Erweiterbarkeit

Neue Einheiten werden als Konfiguration hinzugefügt:

```typescript
// recipes.unit_mappings table (or config file)
interface UnitMapping {
  id: string;
  sourceUnit: string;      // "EL", "EL.", "Essloeffel"
  sourceLang: string;      // "de"
  targetUnit: string;      // "tbsp"
  unitType: string;        // "volume" | "weight" | "count" | "dimension" | "qualitative"
  isActive: boolean;
}
```

Vor jedem Import wird die Mapping-Tabelle geladen (gecached).

---

## 9. Testfälle

```typescript
describe('Unit Normalization', () => {
  // Volume
  it('EL → tbsp', () => normalizeUnit('EL') === 'tbsp');
  it('Esslöffel → tbsp', () => normalizeUnit('Esslöffel') === 'tbsp');
  it('TL → tsp', () => normalizeUnit('TL') === 'tsp');
  it('Teelöffel → tsp', () => normalizeUnit('Teelöffel') === 'tsp');
  it('ml → ml', () => normalizeUnit('ml') === 'ml');
  it('l → l', () => normalizeUnit('l') === 'l');

  // Weight
  it('g → g', () => normalizeUnit('g') === 'g');
  it('kg → kg', () => normalizeUnit('kg') === 'kg');
  it('Gramm → g', () => normalizeUnit('Gramm') === 'g');

  // Count
  it('Stück → piece', () => normalizeUnit('Stück') === 'piece');
  it('Stk → piece', () => normalizeUnit('Stk') === 'piece');
  it('Bund → bunch', () => normalizeUnit('Bund') === 'bunch');
  it('Dose → can', () => normalizeUnit('Dose') === 'can');
  it('Prise → pinch', () => normalizeUnit('Prise') === 'pinch');
  it('Zehe → clove', () => normalizeUnit('Zehe') === 'clove');
  it('Scheibe → slice', () => normalizeUnit('Scheibe') === 'slice');

  // Qualitative
  it('etwas → as_needed', () => normalizeUnit('etwas') === 'as_needed');
  it('n. B. → as_needed', () => normalizeUnit('n. B.') === 'as_needed');

  // Unknown (preserved)
  it('Tasse → cup', () => normalizeUnit('Tasse') === 'cup');
  it('unknown_unit → unknown_unit', () => normalizeUnit('unbekannt') === 'unbekannt');
});

describe('Fraction Parsing', () => {
  it('"½" → 0.5', () => parseFraction('½') === 0.5);
  it('"1½" → 1.5', () => parseFraction('1½') === 1.5);
  it('"1/2" → 0.5', () => parseFraction('1/2') === 0.5);
  it('"1/4" → 0.25', () => parseFraction('1/4') === 0.25);
  it('"1.5" → 1.5', () => parseFraction('1.5') === 1.5);
  it('"1,5" → 1.5', () => parseFraction('1,5') === 1.5);
});

describe('Full Ingredient Parsing', () => {
  it('"2 EL Olivenöl"', () => {
    const r = parseIngredient('2 EL Olivenöl');
    expect(r.amount).toBe(2);
    expect(r.unit).toBe('tbsp');
    expect(r.name).toBe('olivenöl');
  });

  it('"1½ TL Salz"', () => {
    const r = parseIngredient('1½ TL Salz');
    expect(r.amount).toBe(1.5);
    expect(r.unit).toBe('tsp');
    expect(r.name).toBe('salz');
  });

  it('"500 g Hackfleisch"', () => {
    const r = parseIngredient('500 g Hackfleisch');
    expect(r.amount).toBe(500);
    expect(r.unit).toBe('g');
    expect(r.name).toBe('hackfleisch');
  });

  it('"etwas Pfeffer"', () => {
    const r = parseIngredient('etwas Pfeffer');
    expect(r.amount).toBeNull();
    expect(r.unit).toBe('as_needed');
    expect(r.name).toBe('pfeffer');
  });

  it('"1-2 Zehen Knoblauch"', () => {
    const r = parseIngredient('1-2 Zehen Knoblauch');
    expect(r.amountType).toBe('range');
    expect(r.amount).toBe(1.5);
    expect(r.amountMin).toBe(1);
    expect(r.amountMax).toBe(2);
  });
});
```

---

> **Referenzen:**
> - `recipes_import_dataflow.md` — Stage 5 (Normalisierung)
> - `recipes_import_error_handling.md` — Fehlerbehandlung bei Parse-Fehlern