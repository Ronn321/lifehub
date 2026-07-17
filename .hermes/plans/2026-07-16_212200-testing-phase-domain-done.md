# Testing Phase: Domains IMPLEMENTED → DONE

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Bring all 16 LifeHub domains from `IMPLEMENTED` to `DONE` status by adding comprehensive tests (unit, API, permission), event emission, and audit logging.

**Architecture:** Monorepo with `domains/<name>/` (NestJS backend logic), `apps/backend/` (NestJS HTTP server), `apps/frontend/` (Next.js UI). Vitest for testing, `@nestjs/testing` + `supertest` for integration tests, `@testing-library/react` for component tests.

**Tech Stack:** Vitest v2.1, @nestjs/testing, supertest, @testing-library/react, Drizzle ORM (mocked), Zod (for DTO validation testing), NestJS (Module/Service DI testing pattern).

---

## Current Context

### Projekt-Zustand (16/16 Domains IMPLEMENTED)

| Phase | Domains | Status |
|-------|---------|--------|
| Core Foundation | users, auth, permissions, storage, audit, events | DONE / IMPLEMENTED |
| Data Core | media, dashboard | IMPLEMENTED |
| Life Modules | travel, projects, recipes, shopping | IMPLEMENTED |
| Sensitive | finance, insurance, vault, documents | IMPLEMENTED |
| System | calendar, it_inventory, search, jellyfin, pages, plugins | IMPLEMENTED |

### Relevante Dateien

**Test-Infrastruktur:**
- `apps/backend/package.json` — vitest v2.1, @nestjs/testing, supertest, @types/supertest vorhanden
- `apps/frontend/package.json` — vitest v2.1, @testing-library/react v16 vorhanden
- `apps/backend/tsconfig.json` — exclude: `**/*.spec.ts` (Tests werden ausgechlossen)
- **KEINE** vitest.config.* Datei existiert
- **KEINE** Test-Dateien existieren im gesamten Projekt

**Domain-Struktur (Beispiel Shopping):**
- `domains/shopping/src/entities/shopping.ts` — ShoppingList, ShoppingItem, ShoppingListWithItems
- `domains/shopping/src/dtos/shopping.dto.ts` — 6 Zod-Schemas (create/update list & item)
- `domains/shopping/src/repositories/shopping.repository.ts` — 9 DB-Methoden (Drizzle)
- `domains/shopping/src/services/shopping.service.ts` — Business-Logic, 7 Methoden, NotFoundException
- `domains/shopping/src/api/shopping.controller.ts` — 12 Endpoints, JwtGuard + PermissionGuard
- `domains/shopping/src/api/shopping.module.ts` — NestJS Module

**Verwandte Master-Dokumente:**
- `docs/DOMAIN_STATUS.md` — Live-Status, Ziel: DONE
- `docs/GLOBAL_RULES.md` — RBAC, Audit, Events
- `docs/AGENT_EXECUTION_SYSTEM.md` §14 — Definition of Done pro Domain
- `features/shopping.feature.md` — Feature-Spec
- `features/shopping.AGENTS.md` — Domain-DOX

### Annahmen

- Vitest-Konfiguration muss für Backend-Domains separat erstellt werden (jede Domain hat eigenes tsconfig + package.json)
- Drizzle-Mocking: Repository-Tests brauchen eine In-Memory-DB oder gemockte `Db`-Instanz
- NestJS-DI: Service-Tests nutzen `Test.createTestingModule()` mit gemockten Repositories
- API-Tests: Nutzen `supertest` + `@nestjs/testing` mit komplettem NestJS-Modul
- Permission-Tests: Prüfen 4 Rollen × alle Endpoints einer Domain

### Risiken

1. **Drizzle-Mocking**: `drizzle-orm` hat keine native In-Memory-DB. Repository-Tests brauchen entweder `pg-mem` oder vollständiges Mocking per `vi.mock()`
2. **NestJS-Module**: Service-Tests importieren oft viele Shared-Module (auth, permissions, audit, events). Kann zu komplexen Test-Modulen führen
3. **DB-Abhängigkeit**: API-Tests brauchen entweder eine Test-PostgreSQL oder vollständiges Mocking auf Repository-Ebene
4. **Aufwand**: 16 Domains × ~20 Tests = ~320 Tests. Realistisch: 3-5 Subagent-Tage

---

## Proposed Approach

### Domain-Priorisierung (nach Komplexität aufsteigend)

| Batch | Domains | Grund |
|-------|---------|-------|
| **Phase 1** (Template) | **shopping** | Simpelste Domain: 2 Entities, 1 Service, klare CRUD-Logik |
| **Phase 2** | projects, insurance, documents | 3-4 Entities, einfache CRUD + Sub-Entities (notes, links, documents) |
| **Phase 3** | travel, recipes, calendar, it_inventory | Mehr Entities, komplexere Business-Logik |
| **Phase 4** | finance, media, dashboard, search | Komplexe Domains mit mehreren Services |
| **Phase 5** | vault, jellyfin, pages, plugins | Sonderfälle (Verschlüsselung, externe API, großes UI) |

### Test-Typen pro Domain

Jede Domain bekommt:

1. **Unit-Tests für Service** (`tests/unit/<service>.spec.ts`)
   - Mocked Repository → testet Business-Logik
   - Testet: Erfolgsfälle, NotFound-Fälle, Berechtigungen
   
2. **Unit-Tests für DTOs** (`tests/unit/<dto>.spec.ts`)
   - Zod-Schema-Validierung
   - Testet: gültige Eingaben, ungültige Eingaben, Grenzfälle

3. **API-Tests** (`tests/api/<controller>.spec.ts`)
   - Supertest + NestJS TestingModule
   - Testet: HTTP-Status, Response-Body, Error-Handling

4. **Permission-Tests** (`tests/permissions/<domain>.spec.ts`)
   - 4 Rollen × alle Endpoints (Matrix-Test)
   - Testet: 200/201/204 vs 401/403

### Domain-Service-Mocking-Strategy

```
Repository-Mock (vi.mock):
  → ersetzt @lifehub/db komplett
  → jede Methode gibt kontrollierte Daten zurück
  → kein DB-Zugriff nötig

NestJS TestingModule:
  → echte Service-Instanz
  → gemocktes Repository (useValue)
  → echte Shared-Module (auth, permissions) oder gemockt
```

---

## Step-by-Step Plan

### Phase 1: Test-Infrastruktur + Shopping Domain (Template)

#### Task 1.1: Vitest-Konfiguration für Backend-Domains erstellen

**Objective:** Zentrale Vitest-Konfiguration für Domain-Tests, die `vi.mock()` für `@lifehub/db` und Pfad-Aliase unterstützt.

**Files:**
- Create: `vitest.workspace.ts` (Root)
- Create: `domains/shopping/vitest.config.ts`
- Modify: `domains/shopping/package.json` (test script)

**Step 1: Root vitest.workspace.ts erstellen**

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'domains/*/vitest.config.ts',
]);
```

**Step 2: Shopping vitest.config.ts erstellen**

```typescript
// domains/shopping/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.spec.ts'],
    root: path.resolve(__dirname),
  },
  resolve: {
    alias: {
      '@lifehub/db': path.resolve(__dirname, '../../shared/db/src'),
      '@lifehub/auth': path.resolve(__dirname, '../../shared/auth/src'),
      '@lifehub/permissions': path.resolve(__dirname, '../../shared/permissions/src'),
    },
  },
});
```

**Step 3: package.json test script aktualisieren**

In `domains/shopping/package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Verification:**
```bash
cd domains/shopping && npx vitest run --config vitest.config.ts
```
Expected: No test files yet (zero tests, but config loads without error)

---

#### Task 1.2: DTOs testen (Shopping)

**Objective:** Zod-Schema-Validierung für Shopping-DTOs testen.

**Files:**
- Create: `domains/shopping/src/tests/unit/shopping.dto.spec.ts`

**Contents:**

```typescript
import { describe, it, expect } from 'vitest';
import {
  createListSchema,
  updateListSchema,
  createItemSchema,
  updateItemSchema,
} from '../../dtos/shopping.dto';

describe('Shopping DTOs', () => {
  describe('createListSchema', () => {
    it('accepts valid input', () => {
      const result = createListSchema.parse({ title: 'Einkaufen' });
      expect(result.title).toBe('Einkaufen');
    });

    it('rejects empty title', () => {
      expect(() => createListSchema.parse({ title: '' })).toThrow();
    });

    it('accepts optional color and store', () => {
      const result = createListSchema.parse({
        title: 'Test', color: '#ff0000', store: 'Aldi',
      });
      expect(result.color).toBe('#ff0000');
      expect(result.store).toBe('Aldi');
    });
  });

  describe('createItemSchema', () => {
    it('accepts valid input (minimal)', () => {
      const result = createItemSchema.parse({ name: 'Milch' });
      expect(result.name).toBe('Milch');
    });

    it('accepts valid input (full)', () => {
      const result = createItemSchema.parse({
        name: 'Milch', amount: '2', unit: 'Liter', category: 'Milchprodukte',
      });
      expect(result.amount).toBe('2');
    });
  });

  describe('updateListSchema', () => {
    it('accepts partial update', () => {
      const result = updateListSchema.parse({ title: 'Neuer Titel' });
      expect(result.title).toBe('Neuer Titel');
    });

    it('accepts empty object', () => {
      const result = updateListSchema.parse({});
      expect(result).toEqual({});
    });
  });
});
```

**Verification:**
```bash
cd domains/shopping && npx vitest run src/tests/unit/shopping.dto.spec.ts -t "Shopping DTOs"
```
Expected: 5 passed

---

#### Task 1.3: ShoppingService Unit-Tests

**Objective:** Business-Logik des ShoppingService testen mit gemocktem Repository.

**Files:**
- Create: `domains/shopping/src/tests/unit/shopping.service.spec.ts`
- Create: `domains/shopping/src/tests/mocks/repository.mock.ts`

**Step 1: Repository Mock erstellen**

```typescript
// mocks/repository.mock.ts
import { vi } from 'vitest';

export function createMockShoppingRepo() {
  return {
    createList: vi.fn(),
    findListsByOwner: vi.fn(),
    findListById: vi.fn(),
    updateList: vi.fn(),
    softDeleteList: vi.fn(),
    createItem: vi.fn(),
    findItemsByList: vi.fn(),
    findItemById: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  };
}
```

**Step 2: Service Test erstellen**

```typescript
// unit/shopping.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ShoppingService } from '../../services/shopping.service';
import { ShoppingRepository } from '../../repositories/shopping.repository';
import { createMockShoppingRepo } from '../mocks/repository.mock';
import { NotFoundException } from '@nestjs/common';

describe('ShoppingService', () => {
  let service: ShoppingService;
  let mockRepo: ReturnType<typeof createMockShoppingRepo>;

  beforeEach(async () => {
    mockRepo = createMockShoppingRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingService,
        { provide: ShoppingRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get<ShoppingService>(ShoppingService);
  });

  describe('createList', () => {
    it('creates a shopping list', async () => {
      mockRepo.createList.mockResolvedValue({ id: '1', title: 'Test', ownerId: 'u1' });
      const result = await service.createList('u1', { title: 'Test' });
      expect(result.title).toBe('Test');
      expect(mockRepo.createList).toHaveBeenCalledWith({ title: 'Test', ownerId: 'u1' });
    });
  });

  describe('getListWithItems', () => {
    it('returns list with items', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1', title: 'Liste' });
      mockRepo.findItemsByList.mockResolvedValue([{ id: '1', name: 'Milch' }]);
      const result = await service.getListWithItems('u1', '1');
      expect(result.title).toBe('Liste');
      expect(result.items).toHaveLength(1);
    });

    it('throws NotFoundException for missing list', async () => {
      mockRepo.findListById.mockResolvedValue(null);
      await expect(service.getListWithItems('u1', '999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteList', () => {
    it('soft-deletes list', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1' });
      await service.deleteList('u1', '1');
      expect(mockRepo.softDeleteList).toHaveBeenCalledWith('1', 'u1');
    });

    it('throws for non-existent list', async () => {
      mockRepo.findListById.mockResolvedValue(null);
      await expect(service.deleteList('u1', '999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkItem / uncheckItem', () => {
    it('checks an item', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1' });
      mockRepo.findItemById.mockResolvedValue({ id: '1' });
      await service.checkItem('u1', '1', '1', 'u1');
      expect(mockRepo.updateItem).toHaveBeenCalledWith('1', { checked: true, checkedBy: 'u1' });
    });

    it('unchecks an item', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1' });
      mockRepo.findItemById.mockResolvedValue({ id: '1' });
      await service.uncheckItem('u1', '1', '1');
      expect(mockRepo.updateItem).toHaveBeenCalledWith('1', { checked: false, checkedBy: null });
    });
  });

  describe('addItem', () => {
    it('adds item to existing list', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1' });
      await service.addItem('u1', '1', { name: 'Brot' });
      expect(mockRepo.createItem).toHaveBeenCalledWith({ listId: '1', name: 'Brot' });
    });
  });
});
```

**Verification:**
```bash
cd domains/shopping && npx vitest run src/tests/unit/ -t "ShoppingService"
```
Expected: 7+ passed

---

#### Task 1.4: ShoppingController API-Tests

**Objective:** HTTP-Endpoints des Shopping-Controllers testen (supertest + NestJS TestingModule).

**Files:**
- Create: `domains/shopping/src/tests/api/shopping.controller.spec.ts`

**Contents:**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ShoppingController } from '../../api/shopping.controller';
import { ShoppingService } from '../../services/shopping.service';
import { createMockShoppingRepo } from '../mocks/repository.mock';
import { ShoppingRepository } from '../../repositories/shopping.repository';

// Shared-Guard-Mocks
const mockJwtGuard = { canActivate: () => true };
const mockPermissionGuard = { canActivate: () => true };
const mockCurrentUser = { sub: 'user-1', email: 'test@test.com' };

describe('ShoppingController (API)', () => {
  let app: INestApplication;
  let mockRepo: ReturnType<typeof createMockShoppingRepo>;

  beforeAll(async () => {
    mockRepo = createMockShoppingRepo();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingController],
      providers: [
        ShoppingService,
        { provide: ShoppingRepository, useValue: mockRepo },
      ],
    })
      .overrideGuard(JwtGuard).useValue(mockJwtGuard)
      .overrideGuard(PermissionGuard).useValue(mockPermissionGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /shopping/lists', () => {
    it('creates a list', async () => {
      mockRepo.createList.mockResolvedValue({ id: '1', title: 'Test', ownerId: 'u1' });
      const res = await request(app.getHttpServer())
        .post('/shopping/lists')
        .send({ title: 'Test' })
        .expect(201);
      expect(res.body.title).toBe('Test');
    });

    it('returns 400 for invalid input', async () => {
      await request(app.getHttpServer())
        .post('/shopping/lists')
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('GET /shopping/lists', () => {
    it('returns all lists', async () => {
      mockRepo.findListsByOwner.mockResolvedValue([{ id: '1', title: 'Liste' }]);
      const res = await request(app.getHttpServer())
        .get('/shopping/lists')
        .expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /shopping/lists/:id', () => {
    it('returns list with items', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1' });
      mockRepo.findItemsByList.mockResolvedValue([]);
      const res = await request(app.getHttpServer())
        .get('/shopping/lists/1')
        .expect(200);
      expect(res.body.id).toBe('1');
    });

    it('returns 404 for missing list', async () => {
      mockRepo.findListById.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get('/shopping/lists/999')
        .expect(404);
    });
  });

  describe('PUT /shopping/lists/:id', () => {
    it('updates list', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1' });
      mockRepo.updateList.mockResolvedValue({ id: '1', title: 'Updated' });
      const res = await request(app.getHttpServer())
        .put('/shopping/lists/1')
        .send({ title: 'Updated' })
        .expect(200);
      expect(res.body.title).toBe('Updated');
    });
  });

  describe('DELETE /shopping/lists/:id', () => {
    it('deletes list (204)', async () => {
      mockRepo.findListById.mockResolvedValue({ id: '1' });
      await request(app.getHttpServer())
        .delete('/shopping/lists/1')
        .expect(204);
    });
  });
});
```

**Verification:**
```bash
cd domains/shopping && npx vitest run src/tests/api/ -t "ShoppingController"
```
Expected: 8+ passed

---

#### Task 1.5: Permission-Tests (Shopping)

**Objective:** RBAC-Matrix: 4 Rollen × alle Endpoints.

**Files:**
- Create: `domains/shopping/src/tests/permissions/shopping.permissions.spec.ts`

Muss folgende Rollen testen:
- admin (all)
- family (read/write)
- member (read)
- guest (none)

Jeder Endpoint wird mit jeder Rolle getestet → erwartet 200/201/204 vs 401/403.

**Verification:** Matrix-Test mit 4 Rollen × ~10 Endpoints = 40 Testfälle

---

#### Task 1.6: Shopping Domain — Commit

```bash
git add domains/shopping/src/tests/ vitest.workspace.ts
git commit -m "test(shopping): add unit, API, and permission tests (Phase 1 template)"
```

---

### Phase 2: Simple Domains (projects, insurance, documents)

Jede Domain bekommt das gleiche Test-Muster wie Shopping:

- `tests/mocks/repository.mock.ts` — Repository Mock Factory
- `tests/unit/<domain>.service.spec.ts` — Service Unit Tests
- `tests/unit/<domain>.dto.spec.ts` — DTO Validation Tests
- `tests/api/<domain>.controller.spec.ts` — API Integration Tests
- `tests/permissions/<domain>.permissions.spec.ts` — RBAC Matrix Tests
- `vitest.config.ts` — Domain-spezifische Vitest-Config

### Phase 3-5: Remaining Domains

Gleiches Schema. Komplexere Domains (finance, media, vault) brauchen evtl. mehrere Service-Test-Dateien.

### Phase 6: Event + Audit Wiring

Pro Domain prüfen:
- Domain-Events werden bei CREATE/UPDATE/DELETE emittiert
- Audit-Logs werden geschrieben (HMAC-Chain)
- Tests für Event-Emission in Service-Tests

### Phase 7: DOMAIN_STATUS.md → DONE

Nach bestandenen Tests: Status auf DONE setzen.

---

## Verification (nach allen Phasen)

```bash
# Alle Domain-Tests
npx vitest run --workspace

# Backend-Typecheck
pnpm --filter @lifehub/backend typecheck

# Frontend-Typecheck  
pnpm --filter @lifehub/frontend typecheck

# DOMAIN_STATUS.md prüfen
cat docs/DOMAIN_STATUS.md | grep -E "^\|.*\| (DONE|TESTED) \|"
```
Expected: ALL domains DONE or TESTED

---

## Risks, Tradeoffs, Open Questions

### Open Questions

1. **Drizzle-Mocking**: Reicht `vi.mock('@lifehub/db')` oder brauchen wir `pg-mem` für Repository-Tests? **Entscheidung:** Repository-Tests in Phase 1 ausklammern (nur Service-Tests), dann evaluieren.

2. **Permission-Guard-Mocking**: Die JwtGuard + PermissionGuard Mock-Strategie muss pro Domain reproduzierbar sein. Vorschlag: Shared Test-Helper-Modul.

3. **Frontend-Tests**: Testing-Library + Vitest sind vorhanden, aber Frontend-Tests erfordern DOM-Umgebung (`jsdom` oder `happy-dom`). Phase 2+.

4. **Test-Coverage-Ziel**: Mindestens 70% für Service-Layer, 50% für Controller. Min-Coverage in vitest.config einstellen.

### Tradeoffs

- **Repository Mocking vs echte DB**: Mocking ist schneller und isolierter, aber deckt keine SQL-Fehler ab. Hybrid-Ansatz: Unit-Tests mit Mock + einzelne Integration-Tests mit echte DB.
- **Pro Domain einzeln vs parallel**: Sequenziell (Phase 1→2→3) ist langsamer aber konsistenter. Subagents können parallel an verschiedenen Domains arbeiten.

### Nächste Schritte nach Plan

1. Phase 1 (Shopping) als Template implementieren → reviewen
2. Template in AGENTS.md oder CODE_GENERATION_TEMPLATES.md festhalten
3. Phasen 2-7 parallel mit Subagents abarbeiten
