# Recipes Chefkoch Selectors

> **CSS-Selektoren für Chefkoch.de — versionierte Extraktions-Konfiguration.**
> Chefkoch ändert sein HTML regelmäßig. Diese Datei dokumentiert Selektoren mit Versionierung und Test-Strategie.

---

## 1. Konzept

### Versionierte Selektor-Konfiguration

Jede Chefkoch-HTML-Version bekommt einen eigenen Selektor-Satz. Beim Import wird die passende Version erkannt und die entsprechenden Selektoren angewendet.

```
ChefkochSelector_v1 (Juli 2026)
ChefkochSelector_v2 (falls HTML sich ändert)
ChefkochSelector_v3 ...
```

### Primärer Extraktionsweg: JSON-LD

**JSON-LD ist robuster als DOM-Selektoren**, da strukturierte Daten weniger oft ihr Format ändern. Die DOM-Selektoren sind Fallback für den Fall, dass JSON-LD fehlt oder unvollständig ist.

---

## 2. JSON-LD Extraktion (Primär)

### 2.1 Selektor

```javascript
// Im <head> oder <body>
const selector = 'script[type="application/ld+json"]';
```

### 2.2 Erwartete JSON-LD Struktur (Chefkoch, Stand Juli 2026)

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Blumenkohlauflauf",
  "description": "Ein leckerer Blumenkohlauflauf...",
  "recipeIngredient": [
    "1 Blumenkohl",
    "200 g Sahne",
    "100 g geriebener Käse",
    "2 Eier",
    "Salz, Pfeffer, Muskat"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "text": "Backofen auf 180°C vorheizen."
    },
    {
      "@type": "HowToStep",
      "text": "Blumenkohl in Röschen teilen und 5 Min. blanchieren."
    }
  ],
  "prepTime": "PT15M",
  "cookTime": "PT30M",
  "totalTime": "PT45M",
  "recipeYield": "4 Portionen",
  "image": "https://img.chefkoch-cdn.de/rezepte/273601104676092/bilder/...",
  "nutrition": {
    "@type": "NutritionInformation",
    "calories": "320 kcal",
    "proteinContent": "18 g",
    "fatContent": "22 g",
    "carbohydrateContent": "12 g"
  },
  "recipeCategory": "Hauptspeise",
  "recipeCuisine": "Deutsch",
  "keywords": "Auflauf, Blumenkohl, Vegetarisch, Low-Carb"
}
```

### 2.3 Extraktions-Mapping

| JSON-LD Feld | LifeHub Feld | Transformation |
|---|---|---|
| `name` | `title` | Direkt |
| `name` (EN falls vorhanden) | `titleEn` | Aus Alternativ-Sprache |
| `description` | `description` | Direkt |
| `recipeIngredient[]` | `ingredients` | Parsen per `INGREDIENT_REGEX` (siehe `recipes_unit_normalization.md`) |
| `recipeInstructions[].text` | `steps[].instruction` | Direkt |
| `prepTime` | `prepTime` | ISO 8601 → Minuten: `PT15M` → 15 |
| `cookTime` | `cookTime` | ISO 8601 → Minuten |
| `totalTime` | `totalTime` | ISO 8601 → Minuten |
| `recipeYield` | `servings` | Regex `/(\d+)/` → erste Zahl |
| `image` | `imageUrls[]` | URL(s) sammeln |
| `nutrition.calories` | `calories` | Regex `/(\d+)/` → Zahl |
| `nutrition.proteinContent` | `nutrition.protein` | Regex + Einheit entfernen |
| `nutrition.fatContent` | `nutrition.fat` | Regex + Einheit entfernen |
| `nutrition.carbohydrateContent` | `nutrition.carbs` | Regex + Einheit entfernen |
| `recipeCategory` | `categories[]` | Direkt |
| `keywords` | `tags[]` | Split bei `,` |
| `recipeCuisine` | `tags[]` | Direkt |

---

## 3. DOM-Selektoren (Fallback)

### 3.1 Version-Erkennung

```javascript
// Erkennung anhand charakteristischer Elemente
function detectChefkochVersion(document: Document): string {
  // v1 (2026): Klassisches Chefkoch-Design
  if (document.querySelector('.recipe-title') && document.querySelector('table.ingredients')) {
    return 'v1';
  }
  // v2 (2027?): Redesign? Neue Klassen?
  // if (document.querySelector('.ck-recipe-hero')) return 'v2';
  
  return 'unknown';
}
```

### 3.2 Selektoren v1 (Stand Juli 2026)

| Element | Primär-Selektor | Fallback 1 | Fallback 2 |
|---|---|---|---|
| **Titel** | `h1` | `.recipe-title` | `meta[property="og:title"]` → content |
| **Beschreibung** | `meta[name="description"]` → content | `.recipe-summary` | `meta[property="og:description"]` |
| **Zutaten-Tabelle** | `table.ingredients` | `.recipe-ingredients table` | `[class*="ingredient"] table` |
| **Zutat: Menge** | `td.amount` | `td:first-child` | `.ingredient-amount` |
| **Zutat: Einheit** | `td.unit` | `td:nth-child(2)` | `.ingredient-unit` |
| **Zutat: Name** | `td.name` | `td:nth-child(3)` | `.ingredient-name` |
| **Zutat (einzeilig)** | `.recipe-ingredients li` | `[itemprop="recipeIngredient"]` | — |
| **Schritte** | `article` | `.recipe-steps` | `[itemprop="recipeInstructions"]` |
| **Schritt (einzeln)** | `article .step` | `article p` | `[itemprop="recipeInstructions"] li` |
| **Portionen** | `.servings input` | `[data-servings]` | Text mit `/(\d+)\s*Portionen?/` |
| **Vorbereitungszeit** | `.prep-time` | `[data-time="prep"]` | Text mit `/(\d+)\s*Min\.\s*Vorbereitung/` |
| **Kochzeit** | `.cook-time` | `[data-time="cook"]` | Text mit `/(\d+)\s*Min\.\s*Kochzeit/` |
| **Gesamtzeit** | `.total-time` | `[data-time="total"]` | Text mit `/(\d+)\s*Min\.\s*Gesamt/` |
| **Schwierigkeit** | `.difficulty` | `.recipe-difficulty` | Text mit `(simpel\|normal\|pfiffig)` |
| **Bild** | `.recipe-image img` | `meta[property="og:image"]` → content | `.main-image img` |
| **Kategorie** | `.recipe-category` | `[itemprop="recipeCategory"]` | Breadcrumb letztes Element |
| **Tags** | `.recipe-tags a` | `[itemprop="keywords"]` | — |

### 3.3 Text-Extraktion pro Zutat

Für jede Zeile in der Zutaten-Tabelle:

```typescript
function extractIngredientRow(row: Element): ParsedIngredient {
  const amountEl = row.querySelector('td.amount') || row.querySelector('td:first-child');
  const unitEl = row.querySelector('td.unit') || row.querySelector('td:nth-child(2)');
  const nameEl = row.querySelector('td.name') || row.querySelector('td:nth-child(3)');

  const amount = amountEl?.textContent?.trim() ?? null;
  const unit = unitEl?.textContent?.trim() ?? null;
  const name = nameEl?.textContent?.trim() ?? '';

  // Alternativ: ganze Zeile als Text
  const fullText = row.textContent?.trim() ?? '';
  
  return {
    amount, unit, name, fullText,
    parseConfidence: name ? 0.9 : 0.5
  };
}
```

---

## 4. Beispiel: Blumenkohlauflauf

### URL
```
https://www.chefkoch.de/rezepte/273601104676092/Blumenkohlauflauf.html
```

### Erwartete Extraktion

```
Titel:        "Blumenkohlauflauf"
Beschreibung: "Ein leckerer, cremiger Blumenkohlauflauf..."
Zutaten:      8 Zutaten
Schritte:      5 Schritte
Portionen:     4
Vorbereitung:  15 Min
Kochzeit:      30 Min
Gesamtzeit:    45 Min
Kategorien:    ["Hauptspeise"]
Tags:          ["Auflauf", "Blumenkohl", "Vegetarisch"]
Bild-URL:      https://img.chefkoch-cdn.de/...
Nährwerte:     320 kcal, 18g Eiweiß, 22g Fett, 12g KH
```

---

## 5. Selektor-Test-Strategie

### 5.1 Automatisierte Tests

```typescript
describe('Chefkoch Selectors', () => {
  // Test mit gespeichertem HTML (nicht live — keine Netzwerkabhängigkeit)
  const savedHtml = loadFixture('chefkoch-blumenkohlauflauf-v1.html');
  
  it('should extract title from h1', () => {
    const title = extractTitle(savedHtml);
    expect(title).toBe('Blumenkohlauflauf');
  });
  
  it('should extract 8 ingredients', () => {
    const ingredients = extractIngredients(savedHtml);
    expect(ingredients.length).toBe(8);
    expect(ingredients[0]).toMatchObject({
      amount: '1',
      name: 'Blumenkohl'
    });
  });
  
  it('should extract 5 steps', () => {
    const steps = extractSteps(savedHtml);
    expect(steps.length).toBe(5);
  });
  
  it('should extract prep/cook time', () => {
    expect(extractPrepTime(savedHtml)).toBe(15);
    expect(extractCookTime(savedHtml)).toBe(30);
  });
  
  it('should extract nutrition from JSON-LD', () => {
    const jsonLd = extractJsonLd(savedHtml);
    expect(jsonLd.nutrition.calories).toContain('320');
  });
});
```

### 5.2 Gespeicherte HTML-Fixtures

Fixtures werden unter `domains/recipes/tests/fixtures/` gespeichert:

```
fixtures/
├── chefkoch-v1/
│   ├── blumenkohlauflauf.html
│   ├── nudelauflauf.html
│   └── pfannkuchen.html
├── chefkoch-v1/
│   ├── expected/
│   │   ├── blumenkohlauflauf.json
│   │   ├── nudelauflauf.json
│   │   └── pfannkuchen.json
│   └── README.md         # Wann/woher geladen, Chefkoch-Version
└── generic-html/
    └── ...
```

### 5.3 Monitoring

Ein Cron-Job (täglich) testet die Selektoren gegen live URLs:

```typescript
describe('Chefkoch Live Selector Health Check', () => {
  // Diese Tests laufen täglich via CI
  const TEST_URLS = [
    'https://www.chefkoch.de/rezepte/273601104676092/Blumenkohlauflauf.html',
    'https://www.chefkoch.de/rezepte/197781083682428/Schneller-Nudelauflauf.html',
  ];
  
  for (const url of TEST_URLS) {
    it(`should still extract data from ${url}`, async () => {
      const html = await fetch(url);
      const recipe = extractFromHtml(html);
      expect(recipe.title).toBeTruthy();
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
    }, 30000); // 30s timeout
  }
});
```

---

## 6. Adapter-Konfiguration

```typescript
// recipes.import_adapters table
{
  id: 'chefkoch',
  name: 'Chefkoch.de',
  domainPatterns: [
    'chefkoch.de/rezepte/',
    'm.chefkoch.de/rezepte/'
  ],
  selectorVersion: 'v1',
  selectorConfig: {
    // JSON-LD
    jsonLd: {
      enabled: true,
      selector: 'script[type="application/ld+json"]',
      typeFilter: 'Recipe',
      fieldMapping: { /* siehe §2.3 */ }
    },
    // DOM Fallback
    dom: {
      enabled: true,
      versionDetectionSelector: '.recipe-title, table.ingredients',
      selectors: { /* siehe §3.2 */ }
    }
  },
  rateLimit: {
    maxRequestsPerHour: 100,
    delayBetweenRequestsMs: 1000
  },
  userAgent: 'LifeHub/1.0 (compatible; +https://lifehub.local)',
  isActive: true
}
```

---

> **Referenzen:**
> - `recipes_chefkoch_import_pipeline.md` — Vollständige Pipeline
> - `recipes_import_dataflow.md` — Stage 2-3 Details
> - `recipes_unit_normalization.md` — Einheiten-Parsing der Zutaten