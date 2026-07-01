# LifeHub Agent Execution System (AES)

Version: 1.0

---

# 1. Purpose

Dieses Dokument definiert, wie ein Coding Agent (OpenCode / Hermes / Cursor / Claude Code) LifeHub implementiert.

Es ersetzt kein Feature-Design, sondern orchestriert die Umsetzung.

---

# 2. Core Principle

> Build domains one at a time, fully vertical, never horizontal.

Das bedeutet:

❌ nicht alle APIs parallel bauen  
❌ nicht alle DB-Tabellen zuerst  
❌ nicht UI zuerst bauen  

✔ eine Domain vollständig fertigstellen  
✔ dann nächste Domain  

---

# 3. Implementation Strategy

## 3.1 Vertical Slice Architecture

Jede Domain wird vollständig implementiert:

1. Database schema
2. Domain logic
3. API layer
4. UI layer
5. Permissions
6. Tests
7. Integration

---

## 3.2 Order of Execution

### Phase 0 – Core Foundation

MUSS zuerst gebaut werden:

1. users domain
2. permissions system
3. auth system
4. storage abstraction
5. audit logging
6. base API structure

---

### Phase 1 – Data Backbone

2. media domain
3. files integration
4. dashboard

---

### Phase 2 – Core Life Modules

4. travel
5. projects
6. recipes
7. shopping

---

### Phase 3 – Sensitive Data Modules

8. finance
9. insurance
10. vault
11. documents

---

### Phase 4 – System Extensions

12. calendar
13. it_inventory
14. search

---

### Phase 5 – Media Ecosystem

15. jellyfin integration

---

### Phase 6 – Extensibility

16. plugins system

---

# 4. Agent Rules

## 4.1 No Cross-Domain Implementation

A domain must NOT:

- import another domain's internal logic
- access another domain's database tables
- bypass API boundaries

Allowed:

- referencing IDs only
- calling other domain APIs

---

## 4.2 Full Completion Rule

A domain is NOT complete until:

- DB schema implemented
- migrations created
- API implemented
- UI implemented
- permissions implemented
- tests implemented
- audit logging active

---

## 4.3 No Partial Features

Agents are forbidden to leave:

- half APIs
- unfinished UI pages
- missing permissions
- undocumented endpoints

---

## 4.4 Schema First Rule

Every domain MUST follow order:

1. domain model (entities)
2. database schema
3. repository layer
4. service layer
5. API layer
6. UI layer

---

# 5. Repository Structure

```text
lifehub/

  apps/
    frontend/
    backend/

  domains/
    users/
    media/
    travel/
    projects/
    recipes/
    shopping/
    finance/
    insurance/
    vault/
    documents/
    calendar/
    it_inventory/
    jellyfin/
    search/
    dashboard/
    plugins/

  shared/
    auth/
    permissions/
    storage/
    audit/
    events/
    utils/

  infrastructure/
    postgres/
    redis/
    docker/
    tailscale/
```

---

# 6. Domain Build Contract

Each domain MUST follow this structure:

```
domain_name/

  entities/
  services/
  repositories/
  api/
  ui/
  tests/
  migrations/
```

---

# 7. Database Execution Rules

## 7.1 Migration Order

- users schema first
- shared tables second
- media third
- finance/vault last

## 7.2 Constraints

- UUID primary keys only
- soft delete required
- timestamps mandatory
- user_id required on all entities

---

# 8. UI Execution Rules

## 8.1 UI Order

- dashboard shell
- navigation system
- users UI
- media UI
- all other domains

## 8.2 UI Standards

- Next.js App Router
- server components first
- client components only when needed
- Tailwind + shadcn

---

# 9. Integration Rules

## Allowed Integrations

- NAS filesystem
- Jellyfin API
- Google Calendar
- CalDAV
- GitHub
- YouTube embeds

## Forbidden

- direct filesystem access from frontend
- cross-domain DB queries
- bypassing API layer

---

# 10. Event System (Important)

Every domain MUST emit events:

Examples:

- MediaCreated
- TransactionCreated
- RecipeUpdated
- TripCreated

Used for:

- plugins
- notifications
- search indexing

---

# 11. Testing Rules

Each domain must include:

- unit tests (services)
- API tests (endpoints)
- permission tests
- minimal UI tests

---

# 12. Failure Handling

If agent is blocked:

1. stop
2. write missing dependency
3. implement dependency first
4. resume

Never skip steps.

---

# 13. Progress Tracking

Each domain has status:

- NOT_STARTED
- IN_PROGRESS
- IMPLEMENTED
- TESTED
- DONE

Stored in:

`/docs/DOMAIN_STATUS.md`

---

# 14. Definition of Done (Global)

System is complete when:

- all domains = DONE
- plugin system active
- search unified
- permissions consistent
- backup system tested
- NAS integration stable

---

# 15. Golden Rule

**Do not build features. Build domains.**

Each domain is a mini-product.
