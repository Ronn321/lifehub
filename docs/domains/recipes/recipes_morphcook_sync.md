# Recipes MorphCook Sync

> **Sync-Strategie LifeHub ↔ MorphCook.**
> Definiert API-Endpunkte, Datenformat, Import/Export-Flows und die Integration der existierenden MorphCook-Rezepte.

---

## 1. Überblick

MorphCook ist eine separate, offline-first Flutter-App (iOS + Android). LifeHub dient als **Backend** und **Kuratierungssystem**, das Rezepte an MorphCook liefert.

### 1.1 Beziehung

| Aspekt | LifeHub | MorphCook |
|---|---|---|
| **Rolle** | Source of Truth, Management, Import | Mobile Consumption |
| **Storage** | PostgreSQL | Hive (lokal) |
| **Netzwerk** | Server-seitig (NAS via Tailscale) | Offline-first, optionaler Sync |
| **Sync-Richtung** | LifeHub → MorphCook (primär) | MorphCook → LifeHub (optional) |
| **Sync-Frequenz** | On-Demand, manuell initiiert | On-Demand, manuell initiiert |

### 1.2 Architekturprinzip

MorphCook bleibt **offline-first**. Sync ist ein **nutzer-initiierter, manueller Prozess** — kein automatischer Hintergrund-Sync. Das verhindert Konflikte und erhält die Offline-Garantie.

```
LifeHub (NAS)                        MorphCook (Phone)
─────────────                        ─────────────────
POST /import/morphcook  ◄──────────  Export JSON
GET  /export/morphcook  ──────────►  Import JSON → Hive
```

---

## 2. Export-Endpunkt (LifeHub → MorphCook)

### 2.1 `GET /api/v1/recipes/export/morphcook`

Liefert alle Rezepte + Dishes + Ontology im MorphCook-kompatiblen JSON-Format.

**Query-Parameter:**
| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `since` | ISO 8601 | — | Nur Rezepte, die seit diesem Zeitpunkt geändert wurden |
| `dish_ids` | UUID[] | — | Nur Rezepte für bestimmte Dishes |
| `language` | string | `de` | Primärsprache (`de` \| `en`) |
| `include_ontology` | boolean | `true` | Ontology-Flags mitliefern |
| `include_ingredient_tree` | boolean | `true` | Ingredient-Ontology mitliefern |

**Antwortformat (MorphCook-kompatibel):**

```json
{
  "schema_version": 1,
  "exported_at": "2026-07-16T20:00:00Z",
  "source": "lifehub",
  "total_recipes": 42,
  "total_dishes": 15,
  
  "recipes": [
    {
      "id": "uuid",
      "dish_id": "uuid",
      "title": { "de": "Blumenkohlauflauf", "en": "Cauliflower Casserole" },
      "description": { "de": "Ein leckerer...", "en": "A delicious..." },
      "ingredients": [
        {
          "ingredient_id": "uuid",
          "name": { "de": "Blumenkohl", "en": "Cauliflower" },
          "quantity": 1.0,
          "unit": "Stk",
          "optional": false
        },
        {
          "ingredient_id": "uuid",
          "name": { "de": "Sahne", "en": "Cream" },
          "quantity": 200,
          "unit": "ml",
          "optional": false
        }
      ],
      "steps": [
        {
          "index": 0,
          "text": { "de": "Backofen auf 180°C vorheizen.", "en": "Preheat oven to 180°C." },
          "timer_seconds": null,
          "image_ref": null
        },
        {
          "index": 1,
          "text": { "de": "Blumenkohl in Röschen teilen.", "en": "Cut cauliflower into florets." },
          "timer_seconds": 300,
          "image_ref": null
        }
      ],
      "contains_flags": ["dairy", "gluten"],
      "attributes": ["effort:easy", "time_bucket:≤60"],
      "calories_per_serving": 320,
      "servings": 4,
      "source_type": "url",
      "source_url": "https://www.chefkoch.de/rezepte/273601104676092/Blumenkohlauflauf.html",
      "created_at": "2026-07-15T10:30:00Z",
      "updated_at": "2026-07-16T08:00:00Z"
    }
  ],
  
  "dishes": [
    {
      "id": "uuid",
      "name": { "de": "Auflauf", "en": "Casserole" },
      "hero_text": { "de": "Ofenfrisch und cremig", "en": "Oven-fresh and creamy" },
      "caption": { "de": "Perfekt für kalte Tage", "en": "Perfect for cold days" },
      "primary_color": "#D97706",
      "recipe_ids": ["uuid-blumenkohl", "uuid-nudel"]
    }
  ],
  
  "ontology": {
    "flags": [
      { "key": "dairy", "category": "contains_flag", "name": { "de": "Milchprodukte", "en": "Dairy" } },
      { "key": "gluten", "category": "contains_flag", "name": { "de": "Gluten", "en": "Gluten" } },
      { "key": "vegan", "category": "compound", "name": { "de": "Vegan", "en": "Vegan" }, "expands_to": ["meat", "dairy", "eggs", "honey"] }
    ],
    "compound_flags": {
      "vegan": ["meat", "dairy", "eggs", "honey", "gelatin"],
      "vegetarisch": ["meat", "fish", "gelatin-non-halal"],
      "halal": ["pork", "alcohol", "gelatin-non-halal"],
      "lactosefrei": ["dairy"]
    }
  },
  
  "ingredient_tree": {
    "id": "root",
    "name": { "de": "Lebensmittel", "en": "Food" },
    "children": [
      {
        "id": "uuid-dairy",
        "name": { "de": "Milchprodukte", "en": "Dairy" },
        "ontology_tags": ["dairy"],
        "children": [
          { "id": "uuid-cheese", "name": { "de": "Käse", "en": "Cheese" }, "default_unit": "g", "children": [] }
        ]
      }
    ]
  }
}
```

---

## 3. Import-Endpunkt (MorphCook → LifeHub)

### 3.1 `POST /api/v1/recipes/import/morphcook`

Nimmt MorphCook-JSON entgegen und importiert Rezepte in LifeHub.

**Request-Body:**
```json
{
  "recipes": [ /* MorphCook-Format, siehe oben */ ],
  "dishes": [ /* MorphCook-Format */ ],
  "mode": "merge" | "replace",
  "dry_run": false
}
```

**Response:**
```json
{
  "imported": 42,
  "skipped": 3,
  "errors": 1,
  "details": {
    "new_recipes": 40,
    "updated_recipes": 2,
    "skipped_duplicates": 3,
    "failed": [
      {
        "recipe_id": "uuid",
        "reason": "Missing required field: title",
        "stage": "validation"
      }
    ],
    "new_dishes": 5,
    "new_flags": 3
  }
}
```

### 3.2 Deduplizierungslogik

```typescript
function isDuplicate(imported: MorphCookRecipe, existing: RecipeEntity): boolean {
  // Gleiche ID = gleiches Rezept (Update)
  if (imported.id === existing.id) return true;
  
  // Gleiches Dish + gleicher Titel + gleiche Variante = Duplikat
  if (imported.dish_id === existing.dishId &&
      imported.title.de === existing.title &&
      arraysEqual(imported.contains_flags.sort(), existing.containsFlags.sort())) {
    return true;
  }
  
  return false;
}
```

### 3.3 Merge-Strategie

| Mode | Verhalten |
|---|---|
| `merge` | Neue Rezepte hinzufügen. Bestehende per ID aktualisieren (neuere `updated_at` gewinnt). |
| `replace` | Alle bestehenden Rezepte des Users löschen. Komplett neu importieren. |

---

## 4. Erstübernahme existierender MorphCook-Rezepte

### 4.1 Ausgangslage

MorphCook hat bereits Rezepte in `assets/` (gebündelt). Diese müssen nach LifeHub übernommen werden.

### 4.2 Ablauf

```
1. MorphCook-Repo: regenerate_all_recipes.py ausführen
   → assets/recipes.json (alle Rezepte im MorphCook-Format)

2. Transformations-Script (LifeHub):
   node scripts/import-morphcook.js \
     --input ../MorphCook/assets/recipes.json \
     --output lifehub-import.json \
     --owner-id <admin-user-uuid>

3. POST /api/v1/recipes/import/morphcook
   Body: lifehub-import.json
   Mode: merge
   Dry-Run: true (erst prüfen, dann importieren)
```

### 4.3 Transformationsregeln

MorphCook-Rezepte haben ein etwas anderes Format als LifeHub. Das Script transformiert:

| MorphCook | LifeHub |
|---|---|
| `title: Map<Lang, String>` | `title: string` (primär DE), `titleEn: string` (EN) |
| `ingredients[].quantity: Float` | `amount: string` |
| `steps[].text: Map<Lang, String>` | `instruction: string` (primär DE) |
| `steps[].timer_seconds` | `timer_seconds` via `steps.meta` (JSONB) oder neues Feld |
| `dish_id` (extern) | `dishId` (LifeHub-UUID, neu generiert oder gemappt) |
| `contains_flags[]` | `containsFlags[]` |
| `attributes[]` | `attributes[]` |

---

## 5. MorphCook-App-Anpassungen (grob)

Für die LifeHub-Integration benötigt MorphCook folgende Erweiterungen:

### 5.1 Neue Features

| Feature | Beschreibung |
|---|---|
| **Sync-Button** | In Settings: "Mit LifeHub synchronisieren" |
| **LifeHub-URL-Konfiguration** | Eingabefeld für die LifeHub-URL (Tailscale-Adresse) |
| **API-Client** | HTTP-Client für `GET /export/morphcook` und `POST /import/morphcook` |
| **Merge-Logik** | Lokale Rezepte mit LifeHub-Rezepten mergen (per ID + `updated_at`) |
| **Import-Fortschritt** | Ladebalken während des Sync |
| **Konflikt-Anzeige** | Bei Duplikaten: User wählt lokale oder LifeHub-Version |

### 5.2 Neue Dependencies

```yaml
# pubspec.yaml
dependencies:
  http: ^1.2.0       # HTTP-Client (nur für Sync, nicht im Normalbetrieb)
  path_provider: ^2.1 # Für Datei-Export
```

### 5.3 Architektur-Erweiterung

```
MorphCook (bestehend)
├── lib/
│   ├── models/          # unverändert
│   ├── services/
│   │   ├── matching.dart     # unverändert
│   │   ├── storage.dart      # unverändert (Hive)
│   │   ├── sync_service.dart # NEU: LifeHub-Sync
│   │   └── api_client.dart   # NEU: HTTP-Client
│   ├── screens/
│   │   └── sync_screen.dart  # NEU: Sync-UI
│   └── ...
```

### 5.4 Sync-Flow in MorphCook

```dart
class SyncService {
  Future<SyncResult> syncWithLifeHub(String lifeHubUrl) async {
    // 1. Prüfe Konnektivität
    final ping = await apiClient.ping(lifeHubUrl);
    if (!ping.ok) throw SyncError('LifeHub nicht erreichbar');
    
    // 2. Lokales last_sync_at laden
    final lastSync = preferences.getLastSyncAt();
    
    // 3. LifeHub-Rezepte abrufen (inkrementell)
    final response = await apiClient.get(
      '$lifeHubUrl/api/v1/recipes/export/morphcook',
      queryParams: {'since': lastSync?.toIso8601String()}
    );
    
    // 4. Mergen: Neue/aktualisierte Rezepte in Hive speichern
    int imported = 0, updated = 0, skipped = 0;
    for (final recipe in response.recipes) {
      final existing = await storage.findRecipeById(recipe.id);
      if (existing == null) {
        await storage.saveRecipe(recipe.toEntity());
        imported++;
      } else if (recipe.updatedAt.isAfter(existing.updatedAt)) {
        await storage.updateRecipe(recipe.toEntity());
        updated++;
      } else {
        skipped++;
      }
    }
    
    // 5. Dishes + Ontology aktualisieren
    await storage.saveDishes(response.dishes);
    await storage.saveOntology(response.ontology);
    
    // 6. Zeitstempel speichern
    await preferences.setLastSyncAt(DateTime.now());
    
    return SyncResult(imported: imported, updated: updated, skipped: skipped);
  }
}
```

---

## 6. Sicherheit

### 6.1 Authentifizierung

MorphCook muss sich bei LifeHub authentifizieren:
- **Option A:** API-Key (einfach, für v1 ausreichend). User generiert Key in LifeHub → trägt ihn in MorphCook ein.
- **Option B (Zukunft):** JWT-Token nach Login (wenn LifeHub-Account-System in MorphCook integriert wird)

### 6.2 Transport
- Tailscale stellt verschlüsselte Verbindung sicher (WireGuard)
- HTTPS via Traefik (optional, da Tailscale bereits verschlüsselt)

---

> **Referenzen:**
> - `recipes_lifehub_architecture.md` — Gesamtarchitektur
> - `MorphCook/SPEC.md` — MorphCook-Spezifikation
> - `recipes_import_dataflow.md` — Import-Pipeline