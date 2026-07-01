# ARCHITECTURE.md

# LifeHub – Technische Architektur & Domain-Driven Design

Version: 1.0
Status: verbindlich für OpenCode / Hermes / Cursor Implementierung

---

## 1. Architektur-Leitlinien

LifeHub folgt diesen nicht verhandelbaren Leitlinien:

- **Domain Driven Design (DDD)** — jede Domain ist ein eigenständiger Bounded Context mit eigener Sprache, eigenem Modell, eigener Persistenz.
- **Modular Monolith (Phase 0–3)** — ein Deployable, klar getrennte Module, keine Microservices zu Beginn.
- **Plugin-ready (Phase 4+)** — Domains und Plugins kommunizieren ausschließlich über dokumentierte Schnittstellen.
- **API First** — Jede Domain exponiert eine versionierte REST API mit OpenAPI-Spec.
- **NAS-First Storage** — Binärdaten leben niemals in der DB, immer im NAS-Filesystem.
- **Tailscale-First Access** — primärer Zugriffsweg ist das private Tailscale-Netz, sekundär LAN.
- **Security by Default** — RBAC + Audit + 2FA + Vault-Encryption sind Pflicht, nicht optional.

---

## 2. High-Level Architektur

```
┌──────────────────────────────────────────────────────────────────┐
│                         Tailscale / LAN                          │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Reverse Proxy (Traefik)                    │
│                  HTTPS + Auto-TLS + Auth-Gate                     │
└──────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Frontend   │        │   Backend    │        │   Jellyfin   │
│  Next.js 14  │◀──────▶│   NestJS     │◀──────▶│   (extern)   │
│  App Router  │  REST  │  Modular     │  API   │   optional   │
│  shadcn/UI   │        │  Monolith    │        │              │
└──────────────┘        └──────────────┘        └──────────────┘
                                │
        ┌──────────┬────────────┼────────────┬──────────┐
        ▼          ▼            ▼            ▼          ▼
   ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐
   │Postgres│ │ Redis  │ │ S3 / NAS │ │ Search │ │  Audit   │
   │  16    │ │ Cache  │ │  Mounts  │ │ Meili  │ │   Log    │
   └────────┘ └────────┘ └──────────┘ └────────┘ └──────────┘
```

---

## 3. Technologie-Entscheidungen

### 3.1 Frontend
- **Next.js 14+ (App Router)** — Server Components first, RSC für Lesepfade
- **TypeScript strict mode**
- **Tailwind CSS** + **shadcn/ui** + **Radix Primitives**
- **TanStack Query** — Server-State & Cache
- **Zustand** — leichter Client-State (nicht Redux)
- **Framer Motion** — Animationen
- **react-hook-form + zod** — Forms + Validation
- **Leaflet** — Karten (2D)
- **CesiumJS oder Three.js** — Globe

### 3.2 Backend
- **NestJS (TypeScript)** — gewählt, weil:
  - gleiche Sprache wie Frontend → weniger Context-Switch
  - modulare Architektur nähelt DDD-Bounded-Contexts 1:1
  - eingebaute Dependency Injection
  - OpenAPI out-of-the-box
  - Guards für RBAC, Interceptors für Audit
- **FastAPI (Python) wird verworfen** — heterogener Stack, doppelter Tooling-Overhead.

### 3.3 Datenbank
- **PostgreSQL 16**
- **UUID v7** als Primary Keys (sortierbar + sicher)
- **Row-Level Security** für Multi-Tenant-Isolation
- **Soft Delete** (`deleted_at`) auf allen Entitäten

### 3.4 Cache & Queues
- **Redis 7** — Sessions, Rate Limits, BullMQ Queues
- **BullMQ** — Job-Queues für Thumbnail-Generierung, EXIF-Extraktion, OCR, Jellyfin-Sync

### 3.5 Suche
- **Meilisearch** — global, schnell, deutsche Stopwords out-of-the-box
- separate Indizes pro Domain (`media`, `recipes`, `projects`, `documents`)

### 3.6 Object Storage / Files
- **NAS Mount** als primärer Storage (SMB oder NFS Mount im Container)
- kein S3 zwingend, aber `MinIO`-Adapter vorbereitet (Phase 5)

---

## 4. Repository-Layout (verbindlich)

```
lifehub/
├── apps/
│   ├── frontend/                # Next.js
│   │   ├── app/                 # App Router Routes
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── media/
│   │   │   │   ├── travel/
│   │   │   │   ├── projects/
│   │   │   │   ├── recipes/
│   │   │   │   ├── shopping/
│   │   │   │   ├── finance/
│   │   │   │   ├── insurance/
│   │   │   │   ├── vault/
│   │   │   │   ├── documents/
│   │   │   │   ├── calendar/
│   │   │   │   ├── it-inventory/
│   │   │   │   └── jellyfin/
│   │   │   └── (admin)/
│   │   ├── components/          # shadcn-Wrapper
│   │   ├── lib/                 # api-client, auth, utils
│   │   └── styles/
│   └── backend/                 # NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   └── shared/          # global services
│       └── test/
│
├── domains/                     # Bounded Contexts
│   ├── users/
│   ├── media/
│   ├── travel/
│   ├── projects/
│   ├── recipes/
│   ├── shopping/
│   ├── finance/
│   ├── insurance/
│   ├── vault/
│   ├── documents/
│   ├── calendar/
│   ├── it-inventory/
│   ├── jellyfin/
│   ├── search/
│   ├── dashboard/
│   └── plugins/
│
├── shared/                      # Cross-cutting
│   ├── auth/
│   ├── permissions/             # RBAC Engine
│   ├── storage/                 # NAS / S3 Abstraktion
│   ├── audit/                   # Audit Logger
│   ├── events/                  # Domain Event Bus
│   ├── tagging/
│   └── notifications/
│
├── infrastructure/
│   ├── docker/                  # Dockerfile
│   ├── postgres/                # init.sql, migrations
│   ├── redis/
│   ├── traefik/                 # Reverse Proxy
│   └── tailscale/               # Tailscale sidecar
│
├── docs/                        # alle .md Specs
├── features/                    # Domain Feature Specs
├── PLAN.md
├── ARCHITECTURE.md
├── UI_UX.md
├── ROADMAP.md
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

### 4.1 Domain-Build-Contract (jede Domain folgt exakt diesem Muster)

```
domains/<name>/
├── entities/        # TypeScript Interfaces / Klassen
├── dtos/            # zod Schemas + NestJS DTOs
├── repositories/    # DB-Zugriff, nur Drizzle/Prisma Repos
├── services/        # Business Logic, Framework-agnostisch
├── api/             # Controller, Routes, Guards
├── events/          # Domain Events (emittiert + konsumiert)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── migrations/      # SQL oder Drizzle Migrations
```

---

## 5. Bounded Contexts (DDD)

Jeder Bounded Context hat:

- **eigene Sprache (Ubiquitous Language)**
- **eigene Aggregate**
- **eigene Repositories**
- **eigene API**
- **eigene Permission-Sets**
- **eigene Events**

### 5.1 Aggregate Roots pro Domain

| Domain | Aggregate Roots |
|--------|-----------------|
| users | User, Group, Role, Permission |
| media | MediaFile, Album, MediaSource, Tag |
| travel | Trip, Destination, TripDay |
| projects | Project, ProjectFile, ProjectNote |
| recipes | Recipe, Ingredient, Step, MealPlan |
| shopping | ShoppingList, ShoppingItem |
| finance | Account, Transaction, Budget, SavingsGoal, Asset |
| insurance | InsurancePolicy, InsuranceDocument |
| vault | VaultEntry, TOTPSecret, Card |
| documents | Document, DocumentTag, DocumentOCR |
| calendar | Event, Calendar |
| it_inventory | Device, NetworkInterface, DeviceCredential |
| jellyfin | JellyfinLibrary, JellyfinItem |
| search | SearchIndex (technisch, kein AR im klassischen Sinn) |
| dashboard | DashboardLayout, Widget |
| plugins | Plugin, PluginPermission |

---

## 6. Datenbankmodell (Übersicht)

### 6.1 Schema-Topologie

Ein Postgres-Schema pro Bounded Context:

```
public (shared)         — users, groups, roles, permissions, audit_logs, tags
schema_media            — media_files, albums, media_sources, media_tags
schema_travel           — trips, destinations, trip_days
schema_projects         — projects, project_files, project_notes
schema_recipes          — recipes, ingredients, steps
schema_shopping         — shopping_lists, shopping_items
schema_finance          — accounts, transactions, budgets, savings_goals, assets
schema_insurance        — insurance_policies, insurance_documents
schema_vault            — vault_entries, totp_secrets, cards
schema_documents        — documents, document_tags, document_ocr
schema_calendar         — events, calendars
schema_it_inventory     — devices, network_interfaces, device_credentials
schema_jellyfin         — jellyfin_libraries, jellyfin_items
schema_dashboard        — dashboard_layouts, widgets
schema_plugins          — plugins, plugin_permissions
```

### 6.2 Konventionen

- **Primary Key**: `id UUID` (v7)
- **Zeitstempel**: `created_at`, `updated_at`, `deleted_at` (TIMESTAMPTZ)
- **Owner**: `owner_id UUID NOT NULL` auf allen Entitäten
- **Audit**: Trigger schreibt in `public.audit_logs` bei INSERT/UPDATE/DELETE
- **Soft Delete**: `deleted_at IS NULL` in allen Read-Repos
- **Referenzen zwischen Schemata**: nur über `*_id UUID`, niemals Foreign-Key-Constraint über Schema-Grenzen

### 6.3 Beispiel: `media` Schema

```sql
CREATE SCHEMA media;

CREATE TABLE media.media_files (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL,
  source_id   UUID,                        -- media.media_sources.id
  album_id    UUID,                        -- media.albums.id
  storage_path TEXT NOT NULL,              -- relativer NAS-Pfad
  mime_type   TEXT NOT NULL,
  size_bytes  BIGINT NOT NULL,
  width       INT,
  height      INT,
  duration_s  INT,
  taken_at    TIMESTAMPTZ,                 -- EXIF DateTimeOriginal
  gps_lat     NUMERIC(9,6),
  gps_lon     NUMERIC(9,6),
  exif        JSONB,                       -- restliche EXIF-Daten
  thumb_path  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX media_files_owner_idx ON media.media_files(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX media_files_taken_at_idx ON media.media_files(taken_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX media_files_gps_idx ON media.media_files(gps_lat, gps_lon) WHERE deleted_at IS NULL;
```

### 6.4 Beispiel: `finance` Schema

```sql
CREATE SCHEMA finance;

CREATE TABLE finance.accounts (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,  -- 'checking' | 'savings' | 'brokerage' | 'credit' | 'cash'
  currency    CHAR(3) NOT NULL DEFAULT 'EUR',
  iban        TEXT,
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE finance.transactions (
  id           UUID PRIMARY KEY,
  owner_id     UUID NOT NULL,
  account_id   UUID NOT NULL,        -- finance.accounts.id
  category_id  UUID,
  amount       NUMERIC(18,2) NOT NULL,
  currency     CHAR(3) NOT NULL DEFAULT 'EUR',
  description  TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE finance.assets (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL,
  account_id  UUID,                  -- optional, falls im Depot
  symbol      TEXT NOT NULL,         -- z.B. 'AAPL', 'IWDA.AS'
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,         -- 'stock' | 'etf' | 'bond' | 'crypto' | 'metal'
  quantity    NUMERIC(18,8) NOT NULL,
  cost_basis  NUMERIC(18,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
```

---

## 7. API-Architektur

### 7.1 Konventionen

- **Versionierung**: `/api/v1/...`
- **Authentifizierung**: Bearer JWT (15 min Access) + Refresh Token (7 Tage, HttpOnly Cookie)
- **Content-Type**: `application/json` (multipart nur für Uploads)
- **Pagination**: Cursor-basiert (`?cursor=...&limit=50`)
- **Filter**: `?filter[status]=active`
- **Sortierung**: `?sort=-created_at`
- **Errors**: RFC 7807 Problem Details

### 7.2 Beispiel Endpoints (Phase 1)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/users
POST   /api/v1/users                    (admin)
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id                (soft, admin)

POST   /api/v1/media/upload             (multipart)
GET    /api/v1/media
GET    /api/v1/media/:id
DELETE /api/v1/media/:id
GET    /api/v1/media/timeline?from=&to=
GET    /api/v1/media/map?bbox=&zoom=
POST   /api/v1/albums
POST   /api/v1/albums/:id/items

GET    /api/v1/dashboard/layout
PUT    /api/v1/dashboard/layout
```

### 7.3 OpenAPI

- Eine Spec pro Domain: `apps/backend/openapi/<domain>.yaml`
- Aggregierte Spec: `apps/backend/openapi/openapi.yaml`
- Generierte Clients: `apps/frontend/lib/api/<domain>/` via `openapi-typescript`

---

## 8. Auth & RBAC

### 8.1 Auth-Flow

```
Client                  Backend                 Postgres/Redis
  │                        │                          │
  │  POST /auth/login      │                          │
  ├───────────────────────▶│  Argon2 verify           │
  │                        ├─────────────────────────▶│
  │                        │◀────── user row ─────────┤
  │                        │                          │
  │  { accessToken,        │  generate JWT (RS256)    │
  │    refreshToken }      │  set refresh-cookie      │
  │◀───────────────────────┤                          │
```

### 8.2 RBAC-Modell

Rollen:

- `admin` — alles
- `family` — alle Module außer User-Verwaltung
- `child` — eingeschränkte Sicht (kein Vault, kein Finance)
- `guest` — read-only auf freigegebene Inhalte

Zusätzlich pro Domain eigene Permissions:

```ts
type Permission = `${Domain}.${Action}`;
type Action = 'read' | 'create' | 'update' | 'delete' | 'share' | 'admin';
// Beispiele:
// "media.read"
// "finance.create"
// "vault.read"
// "it_inventory.update"
```

Policies werden im Backend durch NestJS Guards erzwungen:

```ts
@UseGuards(JwtGuard, PermissionGuard)
@RequirePermission('media.create')
@Post('upload')
async upload(@Req() req, @Body() dto) { ... }
```

---

## 9. NAS-Mount-Konzept

### 9.1 Mount-Pfade (Empfehlung)

```
/mnt/lifehub/
├── photos/         # media (read/write durch Backend)
├── videos/         # media
├── audio/          # media
├── documents/      # documents
├── projects/       # projects (3D-Druck-STLs etc.)
├── recipes/        # recipes (Bilder, PDFs)
├── vault-blobs/    # vault (verschlüsselte Anhänge)
├── thumbnails/     # generierte Vorschaubilder
├── tmp/            # Upload-Staging
└── backups/        # nächtliche Snapshots
```

### 9.2 Container-Mount

In `docker-compose.yml`:

```yaml
services:
  backend:
    volumes:
      - /mnt/nas/lifehub/photos:/mnt/media/photos:rw
      - /mnt/nas/lifehub/videos:/mnt/media/videos:rw
      - /mnt/nas/lifehub/thumbnails:/mnt/media/thumbnails:rw
      - /mnt/nas/lifehub/documents:/mnt/documents:rw
      - /mnt/nas/lifehub/projects:/mnt/projects:rw
```

### 9.3 Storage-Abstraktion

`shared/storage/` stellt ein Interface bereit:

```ts
interface StorageService {
  put(domain: string, key: string, stream: ReadableStream): Promise<string>;
  get(path: string): Promise<ReadableStream>;
  delete(path: string): Promise<void>;
  signedUrl(path: string, expiresIn: number): Promise<string>;
  stat(path: string): Promise<{ size: number; mtime: Date }>;
}
```

Default-Implementierung: `LocalDiskStorage` (NAS-Mount)
Optional-Implementierung: `S3Storage` (MinIO/AWS) — für Phase 5 vorbereitet.

---

## 10. Event-Bus

Domain-Events werden über einen internen Event-Bus emittiert und asynchron verarbeitet.

Beispiele:

```ts
// emittiert in media.service.ts
events.emit('MediaCreated', { mediaId, ownerId, takenAt });
events.emit('MediaDeleted', { mediaId, ownerId });

// emittiert in finance.service.ts
events.emit('TransactionCreated', { transactionId, accountId, amount });
events.emit('BudgetExceeded', { budgetId, ownerId });

// emittiert in jellyfin.service.ts
events.emit('LibrarySynced', { libraryId, itemCount });
```

Konsumenten:

- `search-indexer` — indiziert/aktualisiert Meilisearch
- `notification-service` — E-Mail/Push (Phase 3+)
- `audit-service` — schreibt in `audit_logs`
- `plugin-runtime` — Hooks für Plugins (Phase 5)

Implementierung: BullMQ-Queues (Redis-backed), damit Retries + Dead-Letter-Queue out-of-the-box.

---

## 11. Docker-Architektur

### 11.1 Services

```yaml
# docker-compose.yml (Auszug)
services:
  traefik:
    image: traefik:v3
    ports: ["443:443", "80:80"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./infrastructure/traefik:/etc/traefik

  tailscale:
    image: tailscale/tailscale:latest
    cap_add: [NET_ADMIN]
    environment:
      - TS_AUTHKEY=${TAILSCALE_AUTHKEY}
    volumes:
      - tailscale-data:/var/lib/tailscale

  frontend:
    build: ./apps/frontend
    labels:
      - "traefik.http.routers.lifehub.rule=Host(`lifehub.ts.net`)"
      - "traefik.http.routers.lifehub.tls=true"
      - "traefik.http.routers.lifehub.tls.certresolver=letsencrypt"

  backend:
    build: ./apps/backend
    environment:
      - DATABASE_URL=postgresql://lifehub:${DB_PASSWORD}@postgres:5432/lifehub
      - REDIS_URL=redis://redis:6379
      - JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private
      - JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  meilisearch:
    image: getmeili/meilisearch:v1.8
    volumes:
      - meilidata:/meili_data
    environment:
      - MEILI_MASTER_KEY=${MEILI_KEY}

  worker:
    build: ./apps/backend
    command: node dist/worker.js     # BullMQ Worker
    depends_on: [postgres, redis]

  jellyfin:                          # optional
    image: jellyfin/jellyfin:latest
    volumes:
      - /mnt/nas/media:/media:ro
```

### 11.2 Backup-Strategie

- **Postgres**: `pg_dump` täglich 03:00, 7 Tage lokal + wöchentlich offsite
- **Files**: `restic` inkrementell, nächtlich, NAS-übergreifend
- **Vault-Blobs**: sind bereits verschlüsselt, doppelte Backups sinnvoll
- **Konfiguration**: Git-crypt für Secrets, `docker-compose.yml` in Git

---

## 12. Sicherheitsarchitektur

| Aspekt | Lösung |
|--------|--------|
| Passwörter | Argon2id (memory=64MB, iterations=3) |
| Vault-Daten | AES-256-GCM, Schlüssel aus User-Passwort abgeleitet (Argon2 KDF) |
| JWT | RS256, 15 min Access, 7 d Refresh, Refresh-Rotation |
| 2FA | TOTP (RFC 6238), Backup-Codes |
| Passkeys | WebAuthn (Phase 4) |
| Transport | HTTPS (Traefik + Let's Encrypt) |
| Netzwerk-Zugriff | Tailscale als primärer Pfad, optional `tailscale-only` Mode |
| Audit | Append-only `audit_logs` mit HMAC-Chain |
| Rate Limiting | Redis-basiert, 100 req/min Standard |
| CSRF | Double-Submit-Cookie Pattern |
| Headers | HSTS, CSP, X-Frame-Options DENY, Referrer-Policy strict-origin |

---

## 13. Performance-Überlegungen

- **Bilder**: WebP/AVIF-Generierung on-the-fly, srcset für responsive
- **Videos**: HLS-Streaming (Phase 4 via Jellyfin), Thumbnail-Pre-Roll
- **Listen**: Cursor-Pagination, nie Offset-Pagination
- **Suche**: Debounced (300ms), Result-Cache in Redis
- **DB**: Read-Replica in Phase 3 wenn Finance-Traffic wächst
- **Caching**: TanStack Query stale-while-revalidate, 60s default

---

## 14. Observability (Phase 3+)

- **Logs**: Pino (strukturiert JSON) → Loki
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry, Tempo
- **Error Tracking**: Sentry (self-hosted)

---

## 15. Migrationsstrategie

1. Phase 0 — Foundation: Repo-Struktur, Docker, Auth, Users, RBAC
2. Phase 1 — Data Backbone: Media + Dashboard
3. Phase 2 — Life Modules: Travel, Projects, Recipes, Shopping
4. Phase 3 — Sensitive: Finance, Insurance, Vault, Documents
5. Phase 4 — Extensions: Calendar, IT-Inventory, Search
6. Phase 5 — Media Ecosystem: Jellyfin-Integration
7. Phase 6 — Extensibility: Plugin-System

Detaillierte Schritte siehe **ROADMAP.md**.

---

## 16. Architektur-DoD

Architektur ist korrekt umgesetzt, wenn:

- Jede Domain hat eigene Ordnerstruktur gemäß Build-Contract
- Keine Cross-Schema FK-Constraints
- OpenAPI-Spec für jede Domain generiert
- Docker-Setup startet mit `docker compose up` ohne manuelle Schritte
- Audit-Trigger auf allen Mutationen aktiv
- RBAC-Guards erzwungen, dokumentiert, getestet
- Storage-Interface implementiert, lokales NAS getestet
- Event-Bus hat mindestens 3 emittierende Domains live
