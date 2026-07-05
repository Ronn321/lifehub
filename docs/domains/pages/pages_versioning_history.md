# Pages Versioning & History System

## Overview
The versioning system tracks changes at page and block level, enabling undo, audit trails, and historical restoration.

---

## Core Concept

Every modification creates a version snapshot:

- page-level versioning
- block-level diff tracking
- optional full snapshot storage

---

## Version Model

### Table: page_versions

| Field | Type |
|------|------|
| id | UUID |
| page_id | UUID |
| version_number | int |
| snapshot | JSONB |
| created_at | timestamp |
| created_by | UUID |

---

## Block History

Each block maintains:

- creation event
- update events
- deletion event (soft delete)

---

## Versioning Strategy

### 1. Snapshot-Based
- full page state stored per version

### 2. Diff-Based (future optimization)
- only changes stored
- reconstruct via patching

---

## Undo/Redo System

- session-based stack
- block-level undo support
- page-level rollback

---

## Restore Mechanism

- restore page to any version
- creates new version instead of overwriting
- preserves history lineage

---

## Audit Trail

Tracks:

- user actions
- timestamps
- changed fields
- before/after state

---

## Constraints

- immutable version entries
- no deletion of history
- system versions protected

---

## Storage Optimization

- compression of snapshots
- pruning strategy (optional future)
- hybrid diff/snapshot model

---

## Future Enhancements

- visual timeline history
- AI change summarization
- semantic diff (content-aware)
- collaborative version branching
