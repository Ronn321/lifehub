# shared/AGENTS.md

# LifeHub — `shared/` Code Root DOX Contract

Version: 1.0
Parent: `../AGENTS.md` (MUSS vorher gelesen werden)

---

## 1. Purpose

Dieser Ordner enthält **querschnittliche Bausteine**, die von mehreren Domains und beiden Apps genutzt werden:

- `shared/auth/` — JWT, Argon2, Auth-Guards
- `shared/permissions/` — RBAC-Engine, Permission-Guards, Decorators
- `shared/storage/` — NAS-Storage-Interface + LocalDisk-Adapter
- `shared/audit/` — Audit-Logger, HMAC-Chain-Validation
- `shared/events/` — Domain-Event-Bus (BullMQ)
- `shared/utils/` — generic Helpers (Date, Money, ID-Generation)
- `shared/db/` — Drizzle-Setup, DB-Client, gemeinsame Schemas

`shared/` darf **keine Domain-spezifische Logik** enthalten. Wenn ein Modul nur von **einer** Domain gebraucht wird, gehört es in `domains/<name>/`.

## 2. Ownership

`shared/AGENTS.md` regelt:

- Welche Bausteine in `shared/` leben dürfen
- Wie Module aus `shared/` von `domains/` und `apps/` importiert werden
- Versionierung der Public-Interfaces (jede Änderung ist Breaking)

## 3. Local Contracts

### 3.1 Modul-Layout

```
shared/<name>/
├── <name>.service.ts         # Haupt-Service
├── <name>.types.ts           # TS-Types/Interfaces
├── <name>.guards.ts          # NestJS-Guards (optional)
├── <name>.decorators.ts      # NestJS-Decorators (optional)
├── <name>.tests.ts          # Tests
└── README.md                # Nutzungs-Doku
```

### 3.2 Was in `shared/` leben darf

- **DB-Verbindung** (`shared/db/`) — Drizzle-Client, Migration-Runner
- **Auth-Primitive** (`shared/auth/`) — JWT-Sign/Verify, Argon2-Wrapper
- **Permission-Engine** (`shared/permissions/`) — `hasPermission(role, domain, action)`, `PermissionGuard`, `@RequirePermission` Decorator
- **Storage-Interface** (`shared/storage/`) — `StorageService` Interface + `LocalDiskStorage`
- **Event-Bus** (`shared/events/`) — `events.emit()`, `events.on()`
- **Audit-Logger** (`shared/audit/`) — Audit-Log-Writer
- **Tag-System** (`shared/tags/`) — Tag-Entity, Tag-API (Phase 2+)
- **Notification-Service** (`shared/notifications/`) — Email/Push (Phase 3+)
- **Utils** (`shared/utils/`) — `generateUuidV7()`, `formatMoney()`, etc.

### 3.3 Was NICHT in `shared/` leben darf

- Domain-Business-Logic → `domains/<name>/services/`
- Domain-Entities → `domains/<name>/entities/`
- Domain-Repositories → `domains/<name>/repositories/`
- Domain-spezifische DTOs → `domains/<name>/dtos/`
- HTTP-Controller, Module
- App-spezifische Config

## 4. Work Guidance

### 4.1 Public-API-Stabilität

Alles, was aus `shared/` exportiert wird, ist **öffentliche API** für alle Domains. Breaking Changes erfordern:

1. ADR in `docs/adr/NNNN-<title>.md` (Phase 2+, sobald ADRs eingeführt)
2. Migration aller Aufrufer
3. Vorher: `git grep` für Imports des geänderten Symbols

### 4.2 Tests für `shared/`

`shared/`-Module sind sicherheitskritisch (auth, permissions, audit). Daher:

- Unit-Tests **Pflicht** für jeden `shared/<name>/`
- Mindestens 90 % Coverage auf `shared/auth/`, `shared/permissions/`, `shared/audit/`
- Security-spezifische Tests (Argon2-Parameter, JWT-Key-Stärke, HMAC-Kette)

### 4.3 Wann `shared/`-Code ändern?

Nur wenn:

- ein neuer Baustein hinzukommt, der von **mehreren** Domains gebraucht wird
- ein bestehender Baustein einen Fehler hat (mit Tests, die den Fehler reproduzieren)
- ein bestehender Baustein erweitert wird (additive Erweiterung bevorzugt)

## 5. Verification

- [ ] alle `shared/<name>/`-Module haben Unit-Tests
- [ ] mind. 90 % Coverage auf `shared/auth/`, `shared/permissions/`, `shared/audit/`
- [ ] Public-API ist explizit dokumentiert (TS-Exports + README)
- [ ] keine zirkulären Imports
- [ ] keine Domain-Logik in `shared/`

## 6. Child DOX Index

Aktuell implementierte Module (Phase 0):

| Pfad | Owns | Wann lesen |
|------|------|------------|
| `auth/` | JWT, Argon2id, JwtGuard, CurrentUser Decorator | Auth-Flow-Änderung |
| `permissions/` | Permission-Engine, PermissionGuard, `@RequirePermission`, `hasPermission` | RBAC-Änderung |
| `db/` | Drizzle-Client, Migration-Runner, Public-Schema | DB-Änderung, neue Migration |
| `audit/` | Audit-Logger, Trigger-Helper | Audit-Änderung |
| `events/` | Event-Bus (BullMQ), Event-Definitionen | Domain-Event-Änderung |
| `storage/` | StorageService-Interface, LocalDiskStorage | Storage-Adapter-Änderung |

Zukünftige Module (`shared/tags/`, `shared/notifications/`, `shared/utils/`) bekommen **jeweils** eine README und werden hier ergänzt.
