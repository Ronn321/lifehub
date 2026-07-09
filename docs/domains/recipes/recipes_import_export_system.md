# Recipes Import Export System

## Overview

Defines the system for moving recipe data in and out of the application, including external imports (Chefkoch) and offline backup/export mechanisms.

## Core Principle

> Data portability is mandatory, backend independence is absolute.

## Import Sources

**Supported v1 sources**
- Chefkoch (HTML scraping)
- Manual JSON import
- Generic recipe web pages
- *Future:* Mealie/Tandoor exports

## Import Pipeline

```
Source Input
   ↓
Raw Extraction
   ↓
Normalization
   ↓
Ingredient Mapping
   ↓
Ontology Mapping
   ↓
Validation
   ↓
Draft RecipeEntity
```

### Chefkoch Import Mode
- HTML parsing only
- no JS rendering
- deterministic selectors
- fallback heuristics for missing fields

## Import Output Types

### 1. RAW MODE
- minimal transformation
- user must fix structure

### 2. NORMALIZED MODE
- units standardized
- ingredients mapped
- steps cleaned

### 3. ENHANCED MODE (future)
- variant suggestions
- ontology inference expansion

## Export System

### Export Types
- full backup
- selected recipes
- meal plan export
- shopping list export

### Export Format

```
{
  "schema_version": 1,
  "recipes": [...],
  "dishes": [...],
  "meal_plans": [...],
  "saved": [...]
}
```

### Compression
- optional gzip export
- secondary file generated automatically

### Encryption

Optional AES-256-GCM:
- PBKDF2 key derivation
- salt + IV per export
- magic bytes "ENC"

## Merge Strategy (Import)
- by RecipeID
- newer timestamp wins (v1 safe default)
- duplicates detected via hash similarity

## Validation Layer
- schema validation
- ontology compliance
- ingredient consistency check
- orphan dish detection

## Failure Handling
- invalid file → reject with reason
- partial import → allowed with warnings
- corrupted file → abort

## UX Flow

**Import:**
1. select file / URL
2. preview parsed recipes
3. choose import mode
4. confirm

**Export:**
1. select scope
2. choose format
3. optional encryption
4. share via OS sheet
