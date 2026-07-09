# Recipes Sync NAS Strategy

## Overview

Defines the future-compatible file-based synchronization strategy between mobile apps and a central NAS (LifeHub ecosystem). v1 remains offline-only, but all structures are designed for eventual sync.

## Core Principle

> Sync is file exchange, not a live connection.

No runtime API, no backend service in v1.

## System Model

```
Mobile App
   ↓ export/import
File Layer (JSON snapshots)
   ↓
NAS Storage (LifeHub Recipes Store)
   ↓ future sync daemon
```

## NAS Structure (Future)

```
/recipes/
 ├── recipes.bundle.json
 ├── dishes.bundle.json
 ├── ingredients.bundle.json
 ├── index.bundle.json
 ├── deltas/
 │     ├── 2026-01.json
 │     ├── 2026-02.json
```

## Sync Modes

### 1. Export (Mobile → NAS)
- full snapshot
- compressed optional
- encrypted optional (AES-256-GCM)

### 2. Import (NAS → Mobile)
- merge or replace mode
- schema validation required
- deduplication by ID

### 3. Delta Sync (Future)
- incremental updates
- timestamp-based diffing

## Conflict Strategy

Since v1 has no multi-user editing:
- last-write-wins (future-safe placeholder)
- no merge conflicts expected in v1

## Versioning

```
schema_version: Int
```

**Rules:**
- backward compatible parsing required
- migrations handled at import time

## Encryption Model

Optional:
- AES-256-GCM
- PBKDF2 key derivation
- per-export salt + IV
- Detection: magic bytes `ENC`

## Compression
- gzip optional
- always applied to secondary export file
- reduces size 70–90%

## Sync Triggers (Future)
- manual export
- scheduled export (user-defined)
- NAS pull sync (daemon-based, later LifeHub)

## Data Integrity

Validation checks:
- schema compliance
- missing ID detection
- ingredient consistency
- ontology validation

## Offline Guarantee

> Even with broken sync: app remains fully functional.

- local DB is source of truth
- NAS is always optional mirror

## Design Constraint

> NAS is an optimization layer, never a dependency.

## Extension Path

Future LifeHub integration will add:
- sync daemon service
- partial updates
- multi-device merge
- recipe collaboration (post-v1)

No structural changes required to mobile schema.
