# Recipes Chefkoch Import Pipeline

> **Chefkoch-spezifische Import-Pipeline.**
> Diese Datei gibt einen Überblick. Detaillierte Spezifikationen in den referenzierten Docs.

---

## Core Principle

> External recipes are transformed, never copied.

---

## Pipeline-Architektur

Die 9-stufige Pipeline läuft asynchron via BullMQ im NestJS-Backend:

```
URL Input → URL Detection → HTML Fetch → JSON-LD/HTML Extraction
  → Structuring → Normalization → Ingredient Mapping
  → Ontology Mapping → Validation → Draft Persistence
```

**Vollständiger Datenfluss:** `recipes_import_dataflow.md`
**Fehlerbehandlung:** `recipes_import_error_handling.md`
**Queue-Konfiguration:** `recipes_import_queue.md`
**Chefkoch-Selektoren:** `recipes_chefkoch_selectors.md`
**Einheiten-Normalisierung:** `recipes_unit_normalization.md`

---

## Unterstützte Quellen

- Chefkoch-Rezept-URLs (z.B. `https://www.chefkoch.de/rezepte/273601104676092/Blumenkohlauflauf.html`)
- Erkannt via `IRecipeUrlDetector` (Pattern: `chefkoch.de/rezepte/`)

---

## Extraktions-Strategie

1. **Primär: JSON-LD** (`application/ld+json` im HTML) — robuster, strukturiert, Schema.org Recipe
2. **Fallback: DOM-Parsing** mit versionierten CSS-Selektoren

Siehe `recipes_chefkoch_selectors.md` für vollständige Selektoren pro HTML-Version.

---

## Pipeline-Stufen (Übersicht)

| Stufe | Beschreibung | Detail-Doc |
|---|---|---|
| 0: URL Detection | Validiert URL, erkennt Quelle, wählt Adapter | `recipes_import_dataflow.md` §0 |
| 1: HTML Fetch | HTTP GET mit Redirect-Handling, Retry 3× | `recipes_import_dataflow.md` §1 |
| 2: JSON-LD Extraktion | Primärer Extraktionsweg | `recipes_chefkoch_selectors.md` |
| 3: DOM Extraktion | Fallback mit CSS-Selektoren | `recipes_chefkoch_selectors.md` |
| 4: Raw Structuring | Rohdaten → `RawRecipeDTO` | `recipes_import_dataflow.md` §4 |
| 5: Normalization | Einheiten, Brüche, Whitespace | `recipes_unit_normalization.md` |
| 6: Ingredient Mapping | Zutaten → Ontology-Tree | `recipes_ingredient_system.md` |
| 7: Ontology Mapping | contains_flags, attributes, technique_tags | `recipes_ontology_extension_model.md` |
| 8: Validation | Pflichtfelder, Konsistenz, Warnings | `recipes_import_dataflow.md` §8 |
| 9: Draft Persistence | Speicherung in `import_jobs`, User-Review | `recipes_import_dataflow.md` §9 |

---

## Normalisierung

- **Einheiten:** EL→tbsp, TL→tsp, Brüche parsen (1½→1.5). Siehe `recipes_unit_normalization.md`
- **Zutaten:** Synonym-Mapping (Tomatenmark→Tomatenmark), Hierarchie-Matching. Siehe `recipes_ingredient_system.md`
- **Ontology-Flags:** Aus Zutaten ableiten (Parmesan→dairy). Compound-Expansion. Siehe `recipes_ontology_extension_model.md`

---

## Import-Modi

| Modus | Beschreibung |
|---|---|
| `RAW` | Minimale Transformation. Original-Struktur erhalten. |
| `NORMALIZED` | Einheiten standardisiert, Zutaten gemappt, Schritte bereinigt. |
| `ENHANCED` (future) | Varianten-Vorschläge, Ontology-Expansion. |

---

## Validierung

Siehe `recipes_import_dataflow.md` §8 und `recipes_import_error_handling.md`:

**❌ REJECT (Import nicht möglich):**
- Kein Titel
- Keine Zutaten
- Keine Schritte

**⚠️ WARNING (Import mit Einschränkungen):**
- Keine Portionen
- Keine Nährwerte
- Low-Confidence Zutaten-Matches
- Flag-Inkonsistenzen (z.B. vegan+dairy)

---

## Asynchrone Verarbeitung

- `POST /api/v1/recipes/import` → HTTP 202 + `jobId`
- BullMQ Worker verarbeitet Pipeline (max 3 parallel)
- Frontend pollt `GET /api/v1/recipes/import/:jobId`
- Status: `pending → fetching → parsing → normalizing → mapping → draft`
- Draft → User-Review → Confirm (Rezept gespeichert) / Discard

---

## Architektur-Entscheidungen

1. **JSON-LD vor DOM-Parsing** — strukturierte Daten sind stabiler als HTML-Selektoren bei Chefkoch-Redesigns
2. **Adapter-Registry** — neue Quellen via Plugin-Interface, kein Core-Code-Change
3. **Queue-basiert** — verhindert Blockierung des Request-Threads, skalierbar, Rate-Limiting möglich
4. **Draft-System** — User muss Import prüfen und bestätigen, keine blinde Übernahme
5. **Versionierte Selektoren** — Chefkoch-HTML-Änderungen werden durch versionierte Selektoren + automatisierte Tests erkannt

---

## Design Constraint

> Import is a pipeline, not a feature.

---

> **Referenzen:**
> - `recipes_lifehub_architecture.md` — Gesamtarchitektur im LifeHub-Kontext
> - `recipes_import_dataflow.md` — Detaillierter Datenfluss aller 9 Stufen
> - `recipes_chefkoch_selectors.md` — CSS-Selektoren + JSON-LD Mapping
> - `recipes_import_error_handling.md` — Fehlerklassen, Retry, Fallback-Ketten
> - `recipes_unit_normalization.md` — Deutsche Einheiten → Standard
> - `recipes_external_import_adapters.md` — Adapter-Interfaces