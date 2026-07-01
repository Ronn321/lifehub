# GLOBAL_RULES.md

## Identity Rules

- everything is user-scoped unless explicitly shared
- all data belongs to a user or family group

---

## Permission Model

RBAC:

- admin
- family
- child
- guest

plus custom roles per domain

---

## Data Ownership Rule

Each entity belongs to exactly one domain.

Example:
- media owns photos
- travel references photos
- finance owns transactions
- documents owns PDFs

---

## File Handling

- uploads go to storage service
- DB stores metadata only
- no binary blobs in database

---

## Security Rule

- vault data must never be readable by other domains
- encryption handled at domain level

---

## Event Rule

All changes emit domain events:

- MediaCreated
- TransactionAdded
- ProjectUpdated

used later for plugins + automation

---

## Extension Rule

New features must be implemented as:

- new domain OR
- plugin OR
- extension of shared layer only
