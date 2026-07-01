# apps/AGENTS.md

# LifeHub — `apps/` Code Root DOX Contract

Version: 1.0
Parent: `../AGENTS.md` (MUSS vorher gelesen werden)

---

## 1. Purpose

Dieser Ordner enthält die **Deployables** des LifeHub-Stacks:

- `apps/backend/` — NestJS-Server (HTTP API + Worker)
- `apps/frontend/` — Next.js-Web-UI

Domain-Logik (Bounded Contexts) lebt **nicht** hier, sondern in `domains/<name>/`. `apps/` orchestriert nur.

## 2. Ownership

`apps/AGENTS.md` regelt:

- Konventionen, die **beide** Apps teilen (TS-Strict, ESLint, Logging-Format, Error-Format)
- Pflicht-Verweise pro App auf die zuständigen Master-Specs
- Wann eine Datei in `apps/` editiert werden darf vs. wann sie in `domains/` oder `shared/` gehört

## 3. Local Contracts

### 3.1 Backend (`apps/backend/`)

| Aspekt | Konvention | Quelle |
|--------|-----------|--------|
| Framework | NestJS 10 | `TECH_STACK.md` §3.1 |
| Sprache | TypeScript 5.6 strict | `tsconfig.base.json` |
| ORM | Drizzle | `TECH_STACK.md` §3.2, `DATABASE_SCHEMA.md` |
| Auth | JWT RS256 + Argon2id | `TECH_STACK.md` §3.3, `ARCHITECTURE.md` §8 |
| Port | 3007 (HTTP), Worker separat | `.env` (`LIFEHUB_API_PORT`) |
| API-Versionierung | `/api/v1/...` | `docs/GLOBAL_RULES.md` |
| OpenAPI | `/api/docs` | `ARCHITECTURE.md` §7.3 |
| Error-Format | RFC 7807 Problem Details | `TECH_STACK.md` §9.1 |
| Logging | Pino, JSON, structured | `TECH_STACK.md` §11 |

Pflicht-Reads vor Backend-Änderungen:
- `../../features/users.AGENTS.md` (für Auth-Änderungen)
- `../../docs/GLOBAL_RULES.md`
- `../../DATABASE_SCHEMA.md`
- `../../ARCHITECTURE.md` §4.1, §7, §8

### 3.2 Frontend (`apps/frontend/`)

| Aspekt | Konvention | Quelle |
|--------|-----------|--------|
| Framework | Next.js 14+ (App Router) | `TECH_STACK.md` §2.1 |
| Sprache | TypeScript 5.6 strict | `tsconfig.base.json` |
| UI | shadcn/ui + Tailwind | `TECH_STACK.md` §2.3, `UI_UX.md` |
| State | TanStack Query + Zustand | `TECH_STACK.md` §2.4, §2.6 |
| Forms | react-hook-form + zod | `TECH_STACK.md` §2.5 |
| Port | 3001 | `.env.example` |
| Theme | dark default, brand-amber | `UI_UX.md` §2.1, §8 |
| Icons | Lucide | `UI_UX.md` §3.1 |

Pflicht-Reads vor Frontend-Änderungen:
- `../../UI_UX.md`
- `../../docs/CODE_GENERATION_TEMPLATES.md` (für Pages, Mutations)
- Die zuständige Domain-`AGENTS.md` (z.B. `../../features/users.AGENTS.md`)

## 4. Work Guidance

### 4.1 Was in `apps/` schreiben?

- `main.ts`, `app.module.ts`, Controller-Skeletons
- HTTP-Handler, die Services aus `domains/` aufrufen
- Module-Composition (welche Domain-Module werden importiert)
- Next.js Pages und Layouts
- UI-Komponenten, die Domain-Daten anzeigen
- Config (`.env`, `nest-cli.json`, `next.config.js`)

### 4.2 Was NICHT in `apps/` schreiben?

- **Domain-Business-Logic** → `domains/<name>/services/`
- **DB-Queries** → `domains/<name>/repositories/`
- **Entities/DTOs** → `domains/<name>/entities/`, `domains/<name>/dtos/`
- **Auth-Guards, Permission-Guards** → `shared/auth/`, `shared/permissions/`
- **Storage-Adapter** → `shared/storage/`
- **Audit-Logger** → `shared/audit/`
- **Wiederverwendbare UI** → `apps/frontend/components/ui/` (shadcn-generiert)

### 4.3 Reihenfolge für neue Domain X

1. `domains/<x>/` anlegen (siehe `domains/AGENTS.md`)
2. Service, Repository, Entity in `domains/<x>/` schreiben
3. **Erst dann** Controller in `apps/backend/src/<x>/<x>.controller.ts` anlegen
4. `apps/backend/src/app.module.ts` um `<x>Module` erweitern
5. Frontend-Page in `apps/frontend/app/(dashboard)/<x>/page.tsx` anlegen
6. `docs/DOMAIN_STATUS.md` Status setzen

## 5. Verification

Pro App:
- [ ] `pnpm --filter @lifehub/backend typecheck` grün
- [ ] `pnpm --filter @lifehub/backend lint` grün
- [ ] `pnpm --filter @lifehub/backend test` grün (für Phase 0: Auth-Tests)
- [ ] `pnpm --filter @lifehub/frontend typecheck` grün
- [ ] `pnpm --filter @lifehub/frontend lint` grün
- [ ] `pnpm --filter @lifehub/frontend build` grün
- [ ] Backend antwortet `200 OK` auf `GET /api/v1/health`
- [ ] Frontend rendert auf `http://localhost:3001`

End-to-End:
- [ ] `docker compose up -d` startet alle Services healthy
- [ ] `pnpm db:migrate` läuft idempotent
- [ ] `pnpm db:seed` legt Test-User an
- [ ] Login-Flow: Email + Password → JWT-Token → Dashboard erreichbar

## 6. Child DOX Index

| Pfad | Owns | Wann lesen |
|------|------|------------|
| `backend/AGENTS.md` | NestJS-Konventionen, Module-Layout, OpenAPI, Tests | Backend-Datei-Änderung |
| `frontend/AGENTS.md` | Next.js-App-Router, RSC/Client-Patterns, shadcn, Tests | Frontend-Datei-Änderung |

Wenn weitere Apps dazukommen (z.B. Worker-only-Image, Mobile später), bekommen **sie** jeweils eine `AGENTS.md` und werden hier indexiert.
