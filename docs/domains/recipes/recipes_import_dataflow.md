# Recipes Import Dataflow

> **Vollständige Datenfluss-Spezifikation der Import-Pipeline für externe Rezepte.**
> Detailgrad: Implementierungsbereit.

---

## 1. Gesamtüberblick

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IMPORT PIPELINE — DATA FLOW                       │
└─────────────────────────────────────────────────────────────────────────┘

USER INPUT (URL)
     │
     ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 0: URL DETECTION & VALIDATION                                  │
│──────────────────────────────────────────────────────────────────────│
│ Input:  url: string                                                  │
│ Output: SourceType, AdapterKey, validatedUrl: string                │
│                                                                      │
│ Steps:                                                               │
│ 1. Validate URL format (RFC 3986)                                    │
│ 2. Match against source patterns:                                    │
│    - chefkoch.de → ChefkochAdapter                                   │
│    - lecker.de → LeckerAdapter (future)                              │
│    - general → GenericHtmlAdapter                                    │
│ 3. Return AdapterKey + validatedUrl                                  │
│                                                                      │
│ Errors: InvalidUrlError, UnknownSourceError                          │
└──────────────┬───────────────────────────────────────────────────────┘
               │ AdapterKey, validatedUrl
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 1: HTML FETCH                                                  │
│──────────────────────────────────────────────────────────────────────│
│ Input:  validatedUrl: string, adapterConfig: AdapterConfig           │
│ Output: html: string, finalUrl: string, statusCode: int,             │
│         headers: HttpHeaders, fetchDurationMs: int                   │
│                                                                      │
│ Steps:                                                               │
│ 1. Resolve DNS (Node.js built-in)                                    │
│ 2. HTTP GET with config:                                             │
│    - Timeout: 15s                                                    │
│    - User-Agent: LifeHub/1.0 (compatible; +https://lifehub.local)    │
│    - Accept: text/html,application/xhtml+xml                         │
│    - Accept-Language: de-DE,de;q=0.9,en;q=0.8                       │
│    - Accept-Encoding: gzip, deflate                                  │
│ 3. Follow redirects (max 5 hops)                                     │
│    - Track redirect chain in finalUrl                                │
│ 4. Check status (2xx = success, 4xx/5xx = error)                    │
│ 5. Detect encoding from Content-Type header                          │
│ 6. Decode body to UTF-8                                              │
│ 7. Return html string + metadata                                     │
│                                                                      │
│ Retry: 3 attempts with exponential backoff (1s, 3s, 9s)             │
│ Errors: FetchTimeoutError, HttpError(4xx/5xx),                      │
│         TooManyRedirectsError, EncodingError                         │
└──────────────┬───────────────────────────────────────────────────────┘
               │ html: string (UTF-8)
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 2: JSON-LD EXTRACTION (PRIMARY PATH)                           │
│──────────────────────────────────────────────────────────────────────│
│ Input:  html: string                                                 │
│ Output: jsonLdRecipe: JsonLdRecipe \| null                           │
│                                                                      │
│ Steps:                                                               │
│ 1. Parse HTML (cheerio or jsdom)                                     │
│ 2. Query: script[type="application/ld+json"]                         │
│ 3. For each script tag found:                                        │
│    a. Parse JSON content                                             │
│    b. Check @type contains "Recipe"                                  │
│    c. If found → extract and return                                  │
│ 4. If no Recipe found → return null (triggers DOM fallback)          │
│                                                                      │
│ Extracted fields from JSON-LD:                                       │
│ - name        → title                                                │
│ - description → description                                          │
│ - recipeIngredient[] → ingredients (raw string array)               │
│ - recipeInstructions[] → steps (HowToStep objects)                   │
│ - prepTime, cookTime, totalTime → times (ISO 8601)                  │
│ - recipeYield → servings                                             │
│ - image       → imageUrl(s)                                          │
│ - nutrition   → nutrition (calories, protein, fat, carbs)           │
│ - recipeCategory → categories                                        │
│ - keywords    → tags                                                 │
│ - recipeCuisine → cuisine                                            │
│                                                                      │
│ Errors: JsonParseError, NoRecipeJsonLdError                          │
└──────────────┬───────────────────────────────────────────────────────┘
               │ jsonLdRecipe OR null (→ fallback to STAGE 3)
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 3: DOM EXTRACTION (FALLBACK PATH)                              │
│──────────────────────────────────────────────────────────────────────│
│ Input:  html: string, adapterSelectorConfig: SelectorConfig          │
│ Output: domRecipe: DomRecipe OR null                                 │
│                                                                      │
│ Steps:                                                               │
│ 1. Parse HTML (cheerio)                                              │
│ 2. Apply source-specific CSS selectors (see SelectorConfig):         │
│    - title:    h1 or .recipe-title                                   │
│    - ingredients: table.ingredients tr                               │
│    - steps:     article or .recipe-steps                             │
│    - times:     .recipe-times or meta tags                           │
│    - servings:  .servings input or text                              │
│    - image:     .recipe-image img or meta[property="og:image"]       │
│ 3. Extract text content from each element                            │
│ 4. Structure into DomRecipe                                          │
│                                                                      │
│ Errors: SelectorNotFoundError, EmptyExtractionError                  │
└──────────────┬───────────────────────────────────────────────────────┘
               │ RawRecipeDTO (from JSON-LD OR DOM)
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 4: RAW DATA STRUCTURING                                       │
│──────────────────────────────────────────────────────────────────────│
│ Input:  jsonLdRecipe OR domRecipe                                     │
│ Output: rawRecipeDto: RawRecipeDTO                                   │
│                                                                      │
│ RawRecipeDTO:                                                         │
│ ┌──────────────────────────────────────────────────────────────┐    │
│ │ title: string                     // Originaltitel            │    │
│ │ description: string | null        // Beschreibung             │    │
│ │ ingredients: RawIngredient[]      // Roh-Zutaten              │    │
│ │   ├── rawText: string             // "2 EL Olivenöl"          │    │
│ │   ├── amount: string | null       // "2"                      │    │
│ │   ├── unit: string | null         // "EL"                     │    │
│ │   └── name: string | null         // "Olivenöl"               │    │
│ │ steps: RawStep[]                  // Roh-Schritte              │    │
│ │   ├── order: number                                           │    │
│ │   └── instruction: string                                     │    │
│ │ servings: number | null           // Portionen                 │    │
│ │ prepTime: number | null           // Minuten                   │    │
│ │ cookTime: number | null           // Minuten                   │    │
│ │ totalTime: number | null          // Minuten                   │    │
│ │ calories: number | null           // kcal pro Portion          │    │
│ │ nutrition: Nutrition | null       // Nährwerte                 │    │
│ │ imageUrls: string[]               // Bild-URLs                 │    │
│ │ categories: string[]              // Kategorien                │    │
│ │ tags: string[]                    // Tags                      │    │
│ │ sourceType: 'chefkoch' | ...     // Quelle                    │    │
│ │ sourceUrl: string                 // Original-URL              │    │
│ └──────────────────────────────────────────────────────────────┘    │
└──────────────┬───────────────────────────────────────────────────────┘
               │ rawRecipeDto: RawRecipeDTO
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 5: INGREDIENT PARSING & NORMALIZATION                         │
│──────────────────────────────────────────────────────────────────────│
│ Input:  rawRecipeDto.ingredients                                     │
│ Output: parsedIngredients: ParsedIngredient[]                        │
│                                                                      │
│ Steps per raw ingredient text:                                       │
│ 1. Tokenize: "2 EL Olivenöl" → [amount, unit, name]                 │
│    Regex: /^([\d¼½¾⅓⅔,.]+)\s*([^\d\s]+)\s+(.+)$/                   │
│ 2. Normalize amount:                                                 │
│    - Parse fractions: ½ → 0.5, ¼ → 0.25, 1½ → 1.5                  │
│    - Parse ranges: "1-2" → {amount:1.5, range:true}                 │
│    - Parse text amounts: "etwas" → {amount:null, qualitative:true}  │
│ 3. Normalize unit:                                                   │
│    - Map to standard: EL → tbsp, TL → tsp, Prise → pinch            │
│    - Preserve if unknown: "Dose" → "Dose"                           │
│ 4. Normalize name:                                                   │
│    - Trim whitespace                                                 │
│    - Remove trailing ")", "*", "(", etc.                            │
│    - Lowercase                                                       │
│    - Remove quantity from name: "2 Eier" → name="Eier"              │
│                                                                      │
│ Errors: UnparseableIngredientError (partial extraction allowed)     │
└──────────────┬───────────────────────────────────────────────────────┘
               │ parsedIngredients: ParsedIngredient[]
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 6: INGREDIENT ONTOLOGY MAPPING                                │
│──────────────────────────────────────────────────────────────────────│
│ Input:  parsedIngredients: ParsedIngredient[]                        │
│ Output: mappedIngredients: MappedIngredient[]                        │
│                                                                      │
│ Steps per ingredient:                                                │
│ 1. Synonym lookup in ingredient_ontology table:                     │
│    "Tomatenmark" → canonical: "Tomatenmark" ✓                       │
│    "Tomaten Mark" → canonical: "Tomatenmark"                        │
│    "Crème fraîche" → canonical: "Crème fraîche"                     │
│ 2. If no match:                                                      │
│    - Try fuzzy match (Levenshtein distance ≤ 2)                     │
│    - Try partial match (substring)                                   │
│    - Fallback: create "unknown" entry with original name            │
│ 3. Look up ontology_tags from ingredient_ontology:                  │
│    "Parmesan" → ontology_tags: ['dairy', 'cheese', 'italian']      │
│ 4. Assign ingredient_id (UUID from ontology or new temp UUID)       │
│                                                                      │
│ MappedIngredient:                                                     │
│ ┌──────────────────────────────────────────────────────────────┐    │
│ │ ingredientId: string       // UUID from ontology (or temp)   │    │
│ │ name: string               // Canonical name                 │    │
│ │ amount: number | null      // Normalized quantity             │    │
│ │ unit: string               // Standardized unit               │    │
│ │ ontologyTags: string[]     // From ingredient_ontology        │    │
│ │ matchConfidence: float     // 0.0–1.0                        │    │
│ │ originalText: string       // For debugging                   │    │
│ └──────────────────────────────────────────────────────────────┘    │
└──────────────┬───────────────────────────────────────────────────────┘
               │ mappedIngredients: MappedIngredient[]
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 7: ONTOLOGY FLAG ASSIGNMENT                                   │
│──────────────────────────────────────────────────────────────────────│
│ Input:  mappedIngredients: MappedIngredient[],                       │
│         rawRecipeDto.categories, rawRecipeDto.tags                   │
│ Output: containsFlags: string[], attributes: string[],              │
│         techniqueTags: string[]                                      │
│                                                                      │
│ Steps:                                                               │
│ 1. Aggregate ontology_tags from all mapped ingredients:             │
│    - Collect unique tags → containsFlags candidates                 │
│ 2. Apply category heuristics:                                        │
│    - "vegan" in categories → compound expand to containsFlags       │
│    - "vegetarisch" → implies no meat/fish                            │
│ 3. Apply tag heuristics:                                             │
│    - Tags like "gesund", "low-carb" → attributes                    │
│ 4. Detect technique from step instructions:                         │
│    - "backen" → technique:bake                                       │
│    - "braten" → technique:fry                                        │
│ 5. Cross-check consistency:                                          │
│    - If containsFlags includes 'dairy' but 'vegan' in tags          │
│      → flag as warning                                               │
│ 6. Resolve compound flags:                                           │
│    - 'vegan' → expand to base flags (meat,dairy,eggs,honey)         │
│    - 'vegetarisch' → excludes meat,fish                              │
│                                                                      │
│ Errors: FlagInconsistencyWarning (non-blocking)                     │
└──────────────┬───────────────────────────────────────────────────────┘
               │ containsFlags, attributes, techniqueTags
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 8: VALIDATION                                                  │
│──────────────────────────────────────────────────────────────────────│
│ Input:  NormalizedRecipeDTO (aggregated from all stages)             │
│ Output: ValidationResult { valid: boolean, errors[], warnings[] }   │
│                                                                      │
│ Rules:                                                               │
│ REQUIRED (→ REJECT if missing):                                      │
│ - title must be non-empty                                           │
│ - ingredients.length ≥ 1                                            │
│ - steps.length ≥ 1                                                  │
│                                                                      │
│ WARNING (→ allow import with warning):                               │
│ - servings is null                                                  │
│ - totalTime is null                                                 │
│ - description is null                                                │
│ - imageUrls is empty                                                │
│ - nutrition is null                                                  │
│ - ingredient matchConfidence < 0.5 for any ingredient              │
│ - containsFlags is empty                                             │
│                                                                      │
│ CONSISTENCY (→ WARNING):                                             │
│ - vegan flag + containsFlags includes animal products               │
│ - totalTime < prepTime + cookTime                                    │
│ - ingredient names look like amounts ("2 EL" in name)              │
│                                                                      │
│ Errors: ValidationRejectedError (for REJECT-level issues)           │
└──────────────┬───────────────────────────────────────────────────────┘
               │ ValidationResult (valid=true)
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 9: DRAFT PERSISTENCE                                           │
│──────────────────────────────────────────────────────────────────────│
│ Input:  NormalizedRecipeDTO, ValidationResult                        │
│ Output: importJob: ImportJob                                         │
│                                                                      │
│ Steps:                                                               │
│ 1. Insert into recipes.import_jobs:                                  │
│    - status = 'draft'                                                │
│    - extracted_dto = rawRecipeDto as JSONB                           │
│    - normalized_dto = complete NormalizedRecipeDTO as JSONB          │
│ 2. Create draft RecipeEntity (status=draft or no entry in recipes)   │
│ 3. Return importJob.id to caller (for status polling)                │
│ 4. Insert into recipes.import_history on confirmation                 │
│                                                                      │
│ Errors: DatabaseError                                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Asynchrone Verarbeitung (BullMQ)

```
POST /api/v1/recipes/import { url }
     │
     ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Controller                                                            │
│ - Validate input (Zod)                                               │
│ - Create import_jobs row (status='pending')                          │
│ - Enqueue BullMQ job: { jobId, url, ownerId }                        │
│ - Return HTTP 202 + { jobId }                                        │
└──────────────┬───────────────────────────────────────────────────────┘
               │ enqueue
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ BullMQ Queue: "recipes-import"                                        │
│                                                                       │
│ Job Data:                                                             │
│ {                                                                     │
│   jobId: string,           // import_jobs.id                         │
│   url: string,                                                       │
│   ownerId: string,                                                   │
│   options: {                                                         │
│     mode: 'raw' | 'normalized' | 'enhanced',                        │
│     autoConfirm: boolean,                                            │
│     maxRetries: number     // default: 3                             │
│   }                                                                  │
│ }                                                                     │
│                                                                       │
│ Worker Config:                                                        │
│ - Concurrency: 3 (max 3 parallel imports)                            │
│ - Rate Limit: 100 per hour per user (RateLimiter)                    │
│ - Timeout: 30s per job                                                │
│ - Retry: 3 attempts, backoff: 1s, 5s, 25s                            │
│ - Remove on complete: keep 7 days                                    │
│ - Remove on fail: keep 30 days                                        │
└──────────────┬───────────────────────────────────────────────────────┘
               │ process
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Worker (Import Worker Service)                                        │
│                                                                       │
│ 1. Load job from import_jobs table                                   │
│ 2. Update status → 'fetching'                                        │
│ 3. Execute Stages 0-8 synchronously                                  │
│ 4. Update status → 'draft' + store normalized_dto                    │
│ 5. OR: Update status → 'failed' + error_message                      │
│ 6. Emit DomainEvent: ImportJobCompleted / ImportJobFailed            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Polling Flow

```
User enters URL
     │
     ▼
POST /api/v1/recipes/import { url }
     │
     ▼ HTTP 202 { jobId }
     │
     ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Frontend: Poll Loop                                                   │
│                                                                       │
│ state = "pending"                                                     │
│ while state is 'pending'|'fetching'|'parsing'|'normalizing'|'mapping'│
│   wait 500ms                                                          │
│   GET /api/v1/recipes/import/{jobId}                                  │
│   state = response.status                                             │
│   update progress bar                                                 │
│                                                                       │
│ if state == 'draft':                                                   │
│   show recipe preview                                                 │
│   user reviews                                                        │
│   user confirms → POST /api/v1/recipes/import/{jobId}/confirm         │
│   user rejects  → DELETE /api/v1/recipes/import/{jobId}              │
│                                                                       │
│ if state == 'failed':                                                  │
│   show error message                                                  │
│   offer retry or manual edit                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Fehler-Handling Matrix

| Fehler | Stufe | Wiederherstellbar? | Aktion |
|---|---|---|---|
| InvalidUrlError | 0 | Nein | HTTP 400. User muss URL korrigieren. |
| UnknownSourceError | 0 | Nein | HTTP 422. Fallback zu GenericHtmlAdapter. |
| FetchTimeoutError | 1 | Ja (3 retries) | Retry. Nach 3x: HTTP 502. |
| HttpError(404) | 1 | Nein | HTTP 404. URL existiert nicht. |
| HttpError(5xx) | 1 | Ja (3 retries) | Retry. Nach 3x: HTTP 502. |
| TooManyRedirectsError | 1 | Nein | HTTP 502. Redirect-Schleife. |
| EncodingError | 1 | Nein | HTTP 500. Nicht-dekodierbares HTML. |
| JsonParseError | 2 | Ja (→ DOM fallback) | Log warning, continue to Stage 3. |
| NoRecipeJsonLdError | 2 | Ja (→ DOM fallback) | Continue to Stage 3. |
| SelectorNotFoundError | 3 | Nein | Fallback zu anderen Selektoren. |
| EmptyExtractionError | 3 | Nein | HTTP 422. Keine Daten extrahierbar. |
| UnparseableIngredientError | 5 | Ja (partial) | Speichere Roh-Text, flag as low confidence. |
| LowConfidenceMatch | 6 | Ja (partial) | Flag ingredient for manual review. |
| FlagInconsistencyWarning | 7 | Ja (non-blocking) | Log warning, continue. |
| ValidationRejectedError | 8 | Nein | HTTP 422. Draft nicht erstellbar. |

---

> **Referenzen:**
> - `recipes_chefkoch_import_pipeline.md` — Chefkoch-spezifische Pipeline
> - `recipes_import_error_handling.md` — Detaillierte Fehlerbehandlung
> - `recipes_import_queue.md` — BullMQ-Konfiguration