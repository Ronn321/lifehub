# Recipes Import Error Handling

> **Vollständige Fehlerbehandlungs-Spezifikation für die Import-Pipeline.**
> Definiert Fehlerklassen, Retry-Strategien, Fallback-Ketten und User-Feedback.

---

## 1. Fehler-Hierarchie

```
ImportPipelineError (abstract base)
├── StageError (abstract)
│   ├── UrlDetectionError
│   │   ├── InvalidUrlError
│   │   └── UnknownSourceError
│   ├── FetchError
│   │   ├── FetchTimeoutError
│   │   ├── HttpError(status: number)
│   │   ├── TooManyRedirectsError
│   │   └── EncodingError
│   ├── ExtractionError
│   │   ├── JsonParseError
│   │   ├── NoRecipeJsonLdError
│   │   ├── SelectorNotFoundError
│   │   └── EmptyExtractionError
│   ├── NormalizationError
│   │   ├── UnparseableIngredientError
│   │   └── UnitMappingError
│   ├── OntologyMappingError
│   │   ├── LowConfidenceMatchError
│   │   └── FlagInconsistencyError
│   └── ValidationError
│       └── ValidationRejectedError
├── QueueError
│   ├── JobCreationError
│   └── JobTimeoutError
└── PersistenceError
    ├── DatabaseError
    └── DuplicateImportError
```

---

## 2. Fehlerklassen-Definition

### 2.1 Basis

```typescript
abstract class ImportPipelineError extends Error {
  constructor(
    message: string,
    public readonly stage: string,
    public readonly recoverable: boolean,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ImportPipelineError';
  }

  toResponse(): ImportErrorResponse {
    return {
      error: this.name,
      stage: this.stage,
      message: this.message,
      recoverable: this.recoverable,
      details: this.details,
    };
  }
}
```

### 2.2 Stage-spezifische Fehler

| Fehler | Stage | HTTP | Recoverable | Bedeutung |
|---|---|---|---|---|
| `InvalidUrlError` | 0 | 400 | Nein | URL ist nicht valide (kein HTTP/HTTPS) |
| `UnknownSourceError` | 0 | 422 | Ja¹ | Quelle nicht erkennbar → Fallback zu GenericHtmlAdapter |
| `FetchTimeoutError` | 1 | 504 | Ja (3) | Server antwortet nicht innerhalb 15s |
| `HttpError(404)` | 1 | 404 | Nein | URL existiert nicht |
| `HttpError(429)` | 1 | 429 | Ja (3) | Rate-limit der Quelle → warten und retry |
| `HttpError(5xx)` | 1 | 502 | Ja (3) | Server-Fehler der Quelle |
| `TooManyRedirectsError` | 1 | 502 | Nein | >5 Redirect-Hops |
| `EncodingError` | 1 | 500 | Nein | HTML kann nicht als UTF-8 dekodiert werden |
| `JsonParseError` | 2 | — | Ja² | JSON-LD nicht parsebar → fallback |
| `NoRecipeJsonLdError` | 2 | — | Ja² | Kein Recipe in JSON-LD → fallback |
| `SelectorNotFoundError` | 3 | — | Ja³ | Primärer CSS-Selektor nicht gefunden → Alternativen |
| `EmptyExtractionError` | 3 | 422 | Nein | Keine Daten extrahierbar |
| `UnparseableIngredientError` | 5 | — | Ja⁴ | Einzelne Zutat nicht parsebar → Roh-Text speichern |
| `LowConfidenceMatchError` | 6 | — | Ja⁴ | Ingredient-Match < 50% → Warning, trotzdem speichern |
| `FlagInconsistencyError` | 7 | — | Ja⁴ | Flag-Widerspruch (z.B. vegan + dairy) → Warning |
| `ValidationRejectedError` | 8 | 422 | Nein | Pflichtfelder fehlen → Import nicht möglich |

Legende:
- ¹ Ja — Fallback zu anderem Adapter
- ² Ja — Fallback zu DOM-Extraktion (Stage 3)
- ³ Ja — Fallback zu alternativem Selektor
- ⁴ Ja — Partial-Import (Warnung, Daten trotzdem speichern)

---

## 3. Retry-Strategie

### 3.1 Konfiguration

```typescript
interface RetryConfig {
  maxAttempts: number;       // 3
  backoffStrategy: 'exponential' | 'fixed' | 'linear';
  initialDelayMs: number;    // 1000
  multiplier: number;         // 3 (for exponential: 1s, 3s, 9s)
  maxDelayMs: number;        // 30000
  retryableStatuses: number[]; // [408, 429, 500, 502, 503, 504]
}
```

### 3.2 Retry-Logik

```
function shouldRetry(error, attempt): boolean {
  if (attempt >= maxAttempts) return false;
  if (error instanceof HttpError && !retryableStatuses.includes(error.status)) return false;
  if (error instanceof InvalidUrlError) return false;
  if (error instanceof ValidationRejectedError) return false;
  return error.recoverable;
}

function getDelay(attempt): number {
  // Exponential backoff: 1s, 3s, 9s
  return Math.min(initialDelayMs * Math.pow(multiplier, attempt - 1), maxDelayMs);
}
```

### 3.3 Pro-Stufe-Retry-Tabelle

| Stufe | Max Retries | Backoff | Spezielle Regeln |
|---|---|---|---|
| 0 (URL) | 0 | — | URL muss korrigiert werden |
| 1 (Fetch) | 3 | 1s, 3s, 9s | Nur bei 5xx + 429. 404 = sofort fail |
| 2 (JSON-LD) | 0 | — | Geht direkt zu Stage 3 Fallback |
| 3 (DOM) | 0 | — | Selektoren-Konfiguration prüfen |
| 4 (Struct) | 0 | — | Reine Transformation |
| 5 (Normalize) | 0 | — | Partial-Erfolg möglich |
| 6 (Ontology) | 0 | — | Partial-Erfolg möglich |
| 7 (Flags) | 0 | — | Partial-Erfolg möglich |
| 8 (Validate) | 0 | — | Validation muss bestehen |
| 9 (Persist) | 3 | 1s, 3s, 9s | DB-Transient-Errors |

---

## 4. Fallback-Ketten

### 4.1 Extraktion (Stages 2–3)

```
1. Versuche JSON-LD Extraktion
   ├── Erfolg → Stage 4
   └── Fehlschlag → 2
2. Versuche DOM-Extraktion mit Primär-Selektoren
   ├── Erfolg → Stage 4
   └── Fehlschlag → 3
3. Versuche DOM-Extraktion mit Fallback-Selektoren
   ├── Erfolg → Stage 4
   └── Fehlschlag → EmptyExtractionError
```

### 4.2 Zutaten-Parsing (Stage 5)

```
Für jede Zutat:
1. Versuche Regex-Parsing: /^([\d¼½¾⅓⅔,.]+)\s*([^\d\s]+)\s+(.+)$/
   ├── Erfolg → amount, unit, name extrahiert
   └── Fehlschlag → 2
2. Versuche: Ganzer Text als name, rest null
   ├── name nicht leer → Partial-Match (low confidence)
   └── name leer → Überspringe Zutat
```

### 4.3 Ontology-Mapping (Stage 6)

```
Für jede Zutat:
1. Exakte Übereinstimmung in ingredient_ontology
   ├── Gefunden → confidence: 1.0
   └── Nicht gefunden → 2
2. Synonym-Mapping (separate Tabelle)
   ├── Gefunden → confidence: 0.9
   └── Nicht gefunden → 3
3. Fuzzy-Match (Levenshtein ≤ 2)
   ├── Gefunden → confidence: 0.7
   └── Nicht gefunden → 4
4. Substring-Match in ingredient_ontology
   ├── Gefunden → confidence: 0.5
   └── Nicht gefunden → 5
5. Fallback: "unknown" ingredient, confidence: 0.0
```

---

## 5. User-Feedback

### 5.1 Frontend-Fehlertypen

| Typ | UX | Beispiel |
|---|---|---|
| **Blocking Error** | Roter Alert. Aktion nicht möglich. | "URL existiert nicht (404)" |
| **Recoverable Error** | Gelber Alert mit Retry-Button. | "Server antwortet nicht. Erneut versuchen?" |
| **Warning** | Blaue Info-Box. Import erfolgreich, aber... | "3 Zutaten konnten nicht zugeordnet werden" |
| **Progress** | Fortschrittsbalken mit Stage-Name. | "Zutaten werden analysiert..." |

### 5.2 Import-Draft-Warnings

Wenn der Import teilweise erfolgreich ist (Warnings):

```json
{
  "jobId": "uuid",
  "status": "draft",
  "warnings": [
    {
      "type": "low_confidence_ingredient",
      "ingredient": "Muskatnuss, frisch gerieben",
      "suggestedMatch": "Muskatnuss",
      "confidence": 0.5
    },
    {
      "type": "flag_inconsistency",
      "message": "Kategorie 'vegan' widerspricht containsFlag 'dairy'",
      "suggestion": "Prüfe, ob Parmesan durch vegane Alternative ersetzt werden kann"
    }
  ],
  "draft": { /* NormalizedRecipeDTO */ }
}
```

### 5.3 UI-Komponenten für Fehler

```
┌──────────────────────────────────────────────────────┐
│  ⚠️ Import mit Warnungen                              │
│                                                      │
│  ✓ 12 Zutaten erkannt                                │
│  ✓ 5 Schritte extrahiert                             │
│  ⚠️ 1 Zutat unsicher: "Muskatnuss" → prüfen          │
│  ⚠️ 1 Flag-Widerspruch: vegan + dairy                │
│                                                      │
│  [Prüfen & Bearbeiten]  [Trotzdem importieren]       │
└──────────────────────────────────────────────────────┘
```

---

## 6. Logging & Monitoring

### 6.1 Log-Level

| Level | Wann |
|---|---|
| `error` | Blocking Fehler. Import abgebrochen. |
| `warn` | Warnung. Import mit Einschränkungen erfolgreich. |
| `info` | Stage-Wechsel (fetching → parsing → etc) |
| `debug` | Detail-Output pro Zutat, Selektoren-Match, etc. |
| `verbose` | Raw HTML Chunks, JSON-LD Content |

### 6.2 Metriken (via Domain-Events)

| Event | Enthält |
|---|---|
| `ImportJobStarted` | `{ jobId, sourceType, url, ownerId }` |
| `ImportStageCompleted` | `{ jobId, stage, durationMs, warnings }` |
| `ImportJobCompleted` | `{ jobId, recipeId, totalDurationMs, warnings }` |
| `ImportJobFailed` | `{ jobId, error, stage, attemptsUsed }` |

---

## 7. Queue-Error-Recovery

Siehe `recipes_import_queue.md` für die vollständige Queue-Spezifikation.

**Dead Letter Queue (DLQ):**
- Jobs, die 3× fehlschlagen → DLQ
- DLQ-Jobs können manuell retried werden
- DLQ-Jobs werden nach 30 Tagen gelöscht

**Stale Jobs:**
- Jobs, die länger als 5 Minuten in 'fetching'/'parsing' hängen → als 'failed' markiert
- Timeout-Watchdog prüft alle 60 Sekunden

---

## 8. Testbarkeit

### Unit-Tests pro Fehlerfall

```typescript
describe('Import Error Handling', () => {
  describe('Stage 0: URL Detection', () => {
    it('should throw InvalidUrlError for non-http URL');
    it('should throw UnknownSourceError for unknown domain');
    it('should return GenericHtmlAdapter for fallback');
  });

  describe('Stage 1: HTML Fetch', () => {
    it('should retry 3x on 503');
    it('should fail immediately on 404');
    it('should handle redirect chain');
    it('should timeout after 15s');
  });

  describe('Stage 2: JSON-LD', () => {
    it('should fallback to DOM when no recipe found');
    it('should handle malformed JSON');
  });

  describe('Stage 5: Normalization', () => {
    it('should parse simple ingredient "2 EL Olivenöl"');
    it('should handle fraction "1½ TL Salz"');
    it('should return raw text when unparseable');
  });

  describe('Stage 6: Ontology Mapping', () => {
    it('should match exact ingredient name');
    it('should fuzzy-match "Tomatenmark" vs "Tomaten Mark"');
    it('should return unknown with confidence 0.0');
  });
});
```

### Integration-Tests

```typescript
describe('Full Import Pipeline E2E', () => {
  it('should import a valid Chefkoch URL');
  it('should handle a 404 URL gracefully');
  it('should handle a page without recipe content');
  it('should generate warnings for partial matches');
  it('should reject empty extraction');
  it('should complete within timeout');
});
```

---

> **Referenzen:**
> - `recipes_import_dataflow.md` — Datenfluss-Diagramm
> - `recipes_import_queue.md` — Queue-Konfiguration
> - `recipes_unit_normalization.md` — Normalisierung-Details