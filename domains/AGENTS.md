# domains/AGENTS.md

# LifeHub — `domains/` Code Root DOX Contract

Version: 1.0
Parent: `../AGENTS.md` (MUSS vorher gelesen werden)

---

## 1. Purpose

Dieser Ordner enthält die **16 Bounded Contexts** (Domain-Driven Design) des LifeHub-Systems. Jede Domain ist ein **vertikaler Slice** mit eigener Business-Logik, eigener DB-Persistenz (eigenes PG-Schema), eigener API und eigenem UI-Modul.

`domains/` ist die **einzige** Quelle für Domain-Logik. `apps/` ruft nur Services aus `domains/` auf.

## 2. Ownership

`domains/AGENTS.md` regelt:

- Die einheitliche Ordnerstruktur pro Domain (siehe `docs/CODE_GENERATION_TEMPLATES.md` §1)
- Wie Domain-Code geschrieben wird (Entities, DTOs, Repositories, Services)
- Wie Cross-Domain-Kommunikation aussieht (nur via IDs/APIs)
- Wann eine Domain als „fertig" gilt (Definition of Done pro Domain)

## 3. Local Contracts

### 3.1 Eine Domain lebt in `domains/<name>/`

```
domains/<name>/
├── entities/         # TS-Interfaces / Klassen (Pure Domain)
├── dtos/             # zod-Schemas + NestJS-DTOs
├── repositories/     # Drizzle-Zugriff (DB-Layer)
├── services/         # Business-Logic (framework-agnostisch)
├── api/              # Controller + Module (NestJS)
├── events/           # Domain-Event-Definitionen
├── tests/
│   ├── unit/         # Service-Tests
│   ├── api/          # Endpoint-Tests (Supertest)
│   └── permissions/  # RBAC-Matrix-Tests
├── migrations/       # Drizzle-SQL-Migrations
└── README.md         # Domain-spezifische Doku
```

### 3.2 Pro Domain gibt es eine `AGENTS.md`?

**Optional.** Nur sinnvoll, wenn:

- die Domain sehr groß wird (z.B. `users/` mit Sub-Bereichen OAuth, WebAuthn)
- ein eigenes Sub-Modul entsteht (z.B. `vault/totp/`)

Für die meisten 16 Domains reicht `features/<name>.AGENTS.md` im Spec-Ordner + diese `domains/AGENTS.md` als Code-Konvention.

### 3.3 Pflicht-Reads pro Domain (Code-Änderung)

Siehe `features/<name>.AGENTS.md` §3 „Dependencies".

### 3.4 Cross-Domain-Regel (verbindlich)

Eine Domain darf **niemals**:

- direkten DB-Zugriff auf eine andere Domain (anderes Schema) haben
- internen Service einer anderen Domain importieren
- API-Grenzen umgehen

Erlaubt:

- ID-Referenzen (`media_id`, `user_id`, `recipe_id`)
- Aufruf der Public-API einer anderen Domain via HTTP oder via direktem Service-Import **nur**, wenn das Service-Interface explizit als „public für andere Domains" markiert ist
- Domain-Events konsumieren (via `shared/events/`)

## 4. Work Guidance

### 4.1 Reihenfolge für neue Domain (Vertical Slice)

1. **Entity-Modell** in `entities/` (Pure TS, keine Framework-Abhängigkeit)
2. **DB-Schema** in `migrations/` + Drizzle-Definition in `shared/db/schema/<name>.ts`
3. **Repository** in `repositories/` (Drizzle-Queries mit `ownerId` + `deletedAt IS NULL`)
4. **Service** in `services/` (Business-Logic, ruft Repository, emittiert Events)
5. **API-Controller** in `api/` (NestJS, mit `JwtGuard` + `PermissionGuard`)
6. **Domain-Module** in `api/<name>.module.ts`
7. **Unit-Tests** in `tests/unit/`
8. **API-Tests** in `tests/api/`
9. **Permission-Tests** in `tests/permissions/`
10. **Event-Definitionen** in `events/`
11. **AppModule-Integration** in `apps/backend/src/app.module.ts`
12. **Frontend-Page** in `apps/frontend/app/(dashboard)/<name>/`
13. **`docs/DOMAIN_STATUS.md`** Status auf `DONE`
14. **DOX-Pass**: ggf. neue Sub-AGENTS.md, Root-Index updaten

### 4.2 Naming-Konventionen

- Datei: `<entity>.ts` (singular, lowercase, snake-case optional)
- Service-Class: `<Entity>Service` (PascalCase, singular)
- Controller-Class: `<Entity>Controller`
- Module-Class: `<Entity>Module`
- API-Endpoint: `/api/v1/<resources>` (plural)
- Event-Type: `<Entity><PastTense>` (z.B. `MediaCreated`, `TransactionAdded`)

### 4.3 TypeScript-Konventionen

- **Strict mode** (siehe `tsconfig.base.json`)
- `interface` für Entities, `class` für Services (Dependency Injection via Constructor)
- `readonly` für Felder, die nach Konstruktion nicht mehr ändern
- DTOs mit zod-Schemas, Typ via `z.infer<typeof schema>`

### 4.4 Was NICHT in `domains/` schreiben?

- HTTP-spezifischer Code (Controller schon, aber `Response`, `Headers` etc. bleiben im Controller, nicht im Service)
- Framework-Config (`main.ts`, `app.module.ts`)
- DB-Verbindungs-Setup
- Logger-Setup
- Globale Guards/Interceptors (gehören in `shared/`)

## 5. Verification

Pro Domain:
- [ ] Drizzle-Migration läuft idempotent (`pnpm db:migrate`)
- [ ] Unit-Tests ≥ 70 % Coverage
- [ ] API-Tests grün (Supertest)
- [ ] Permission-Tests grün: 4 Rollen × alle Endpoints Matrix
- [ ] Audit-Trigger auf allen Mutationen aktiv (manuell verifiziert)
- [ ] Domain-Events emittiert
- [ ] Keine Cross-Schema-FK-Constraints in Drizzle-Definition
- [ ] `docs/DOMAIN_STATUS.md` Status korrekt

Globale Phase 0 Verification:
- [ ] Alle 5 Core-Foundation-Domains (`users`, `auth`, `permissions`, `storage`, `audit`) DONE
- [ ] Login funktioniert End-to-End
- [ ] Audit-Log zeigt Login/Logout/CRUD-Aktionen
- [ ] Permission-Matrix-Tests grün für alle 4 Rollen

## 6. Child DOX Index

Aktuell **5 Domains** implementiert:

| Pfad | Owns | Wann lesen |
|------|------|------------|
| `users/AGENTS.md` | users-Domain (Identity, RBAC, Auth-Vorbereitung) | `domains/users/`-Datei-Änderung |
| `media/` | media-Domain (Photos, Videos, Alben, Streaming) | `domains/media/`-Datei-Änderung |
| `travel/` | travel-Domain (Trips, Destinations, TripDays, Media-Mapping) | `domains/travel/`-Datei-Änderung |
| `dashboard/` | dashboard-Domain (Widgets, Layout) | `domains/dashboard/`-Datei-Änderung |
| `shopping/` | shopping-Domain (Einkaufslisten, Items, Check/Uncheck) | `domains/shopping/`-Datei-Änderung |
| `finance/` | finance-Domain (Konten, Transaktionen, Budgets, Sparziele, Wertanlagen) | `domains/finance/`-Datei-Änderung |

Wenn weitere Domains implementiert werden und groß werden (z.B. `media/` mit Sub-Bereichen OCR, EXIF, Globe), bekommen **sie** jeweils eine `AGENTS.md` und werden hier indexiert.
