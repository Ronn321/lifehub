# TECH_STACK.md

# LifeHub – Technologie-Stack (kanonisch)

Version: 1.0
Quelle der Wahrheit für alle Technologie-Entscheidungen. ARCHITECTURE.md und ROADMAP.md verweisen auf diese Datei.

---

## 1. Stack-Übersicht (TL;DR)

| Schicht | Wahl | Begründung kurz |
|---------|------|------------------|
| Frontend Framework | **Next.js 14+ (App Router)** | RSC, Streaming, Routen-Gruppen, shadcn-Ökosystem |
| Frontend Sprache | **TypeScript 5.4+ strict** | Typsicherheit, Monorepo-Konsistenz |
| UI-Library | **shadcn/ui + Radix + Tailwind** | Volle Kontrolle, kein Vendor-Lock |
| State (Client) | **Zustand** | Minimal, kein Boilerplate |
| State (Server) | **TanStack Query v5** | Cache, Retry, Optimistic Updates |
| Forms | **react-hook-form + zod** | Performant, typsicher |
| Animation | **Framer Motion** | Declarative API, Spring-Physics |
| Charts | **Recharts** (Phase 2) | React-native, gute Defaults |
| Maps | **Leaflet + OSM** | Privacy, kein API-Key |
| Globe | **Three.js + drei** | Eigene Erde, kein Cesium-Overhead |
| Backend Framework | **NestJS 10 (TypeScript)** | Modulares DDD, DI, OpenAPI out-of-the-box |
| ORM / DB-Layer | **Drizzle ORM** | SQL-nah, typsicher, leichtgewichtig |
| Auth | **JWT (RS256) + Refresh-Cookie** | Stateless, Tailscale-kompatibel |
| Google-API | **googleapis** (OAuth2/Gmail/Calendar-Client) | Google-Konto-Integration (integrations/email/calendar) |
| Scheduling | **@nestjs/schedule** (Cron) | In-Process-Cron (z.B. Google-Kalender-Sync alle 15 min) |
| Hashing | **Argon2id** | OWASP-Empfehlung |
| Vault-Krypto | **AES-256-GCM** | Authenticated Encryption |
| Datenbank | **PostgreSQL 16** | Stabil, JSONB, RLS, Full-Text |
| Cache / Queues | **Redis 7 + BullMQ** | Sessions, Jobs, Throttling |
| Suche | **Meilisearch v1.8** | Schnell, deutsch, einfach |
| Storage | **NAS Mount (lokal) + S3-Stub** | NAS-First, S3 optional |
| Reverse Proxy | **Traefik v3** | Auto-TLS, Docker-nativ |
| VPN | **Tailscale** | Zero-Config, MagicDNS |
| Container | **Docker + Docker Compose** | Standard, replizierbar |
| Logging | **Pino → Loki** | Strukturiert JSON, schnell |
| Metrics | **Prometheus + Grafana** | Industriestandard |
| Tracing | **OpenTelemetry → Tempo** | Vendor-neutral |
| Error Tracking | **Sentry (self-hosted)** | Source Maps, Performance |
| CI | **GitHub Actions** | Integration in Repo |
| Package Manager | **pnpm + workspaces** | Schnell, Monorepo |
| Linting | **ESLint + Prettier** | Standard |
| Commit-Konvention | **Conventional Commits** | Automatische Changelogs |
| Testing Backend | **Vitest + Supertest** | Schnell, ESM-nativ |
| Testing Frontend | **Vitest + Testing Library + Playwright** | E2E mit Playwright |
| Release | **Docker Images auf ghcr.io** | Self-hosted Pull |

---

## 2. Frontend

### 2.1 Next.js 14+ (App Router)

**Warum:**
- **Server Components** reduzieren JS-Bundle drastisch (Galerie mit 1000 Bildern bleibt flüssig)
- **Streaming SSR** für schnelles First-Contentful-Paint
- **Route Groups** `(auth)`, `(dashboard)`, `(admin)` für klare Layout-Trennung
- **Server Actions** für Form-Mutations ohne API-Roundtrip
- **Middleware** für Auth-Gate, Locale, Rate-Limiting
- Großes Ökosystem, langfristig stabil (Vercel-Backed)

**Version-Pin:** `^14.2.0` (App-Router stabil, React 18.3+)

**Verboten:** Pages-Router, getServerSideProps-Pattern, Client-Components ohne Notwendigkeit.

### 2.2 TypeScript 5.4+

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- Path-Aliase: `@/components`, `@/lib`, `@/domains/<name>`

### 2.3 Tailwind CSS + shadcn/ui

- Tailwind 3.4+, JIT-Compiler an
- shadcn/ui-Komponenten werden **kopiert** (nicht installiert) → voller Code-Besitz
- Custom Variants pro Domain (z.B. `<Button variant="danger-ghost">`)
- CSS-Variables für Theming, keine Tailwind-Dark-Klasse

### 2.4 TanStack Query v5

- Default-Stale-Time 60s
- `placeholderData: keepPrevious` für Listen
- Invalidation pro Domain über zentrale `queryKeys.ts`
- Devtools nur in `NODE_ENV=development`

### 2.5 Form + Validation

- `react-hook-form` 7+ für Forms
- `zod` 3+ für Schemas (geteilt mit Backend!)
- `@hookform/resolvers` für Integration
- Beispiel-Schema liegt in `domains/<name>/dtos/`, wird **gleich** vom Backend importiert

### 2.6 State Management

- **Server-State** → TanStack Query (Single Source of Truth)
- **Client-State (lokal)** → `useState` / `useReducer`
- **Client-State (global)** → Zustand (1 Store pro Domain, nie 1 monolithischer)
- **URL-State** → `useSearchParams` (Filter, Pagination, Tabs)

**Verboten:** Redux, MobX, Recoil.

### 2.7 Animation

- Framer Motion 11+
- `LazyMotion` für Code-Splitting
- `prefers-reduced-motion` respektieren via `useReducedMotion`

### 2.8 Karten / Globe

- **Leaflet 1.9+** mit `react-leaflet` 4+ für 2D-Maps
  - Tiles: OpenStreetMap (Privacy, kein Key), optional Stadia Maps (Phase 4)
  - Marker-Cluster via `react-leaflet-cluster`
  - Routing: OSRM public API (Phase 4)
- **Three.js 0.165+** mit `@react-three/fiber` + `@react-three/drei` für 3D-Globe
  - Eigene Textur der Erde (low-res ~1 MB)
  - Punkte als InstancedMesh für Performance

### 2.9 Bildverarbeitung

- `sharp` 0.33+ im Backend für Thumbnail-Generierung
- `blurhash` für Placeholder
- WebP + AVIF Outputs
- `<Image>` von Next.js mit Custom-Loader für NAS-Signed-URLs

---

## 3. Backend

### 3.1 NestJS 10 (TypeScript)

**Warum NestJS und nicht FastAPI:**

| Kriterium | NestJS | FastAPI |
|-----------|--------|---------|
| Sprache | TypeScript | Python |
| Shared Types mit FE | ✅ nativ | ❌ via OpenAPI-Generierung |
| DDD-Modul-Pattern | ✅ eingebaut | ⚠️ selbst strukturieren |
| OpenAPI | ✅ Swagger-Module | ✅ eingebaut |
| Guards / Interceptors | ✅ DI-nativ | ⚠️ Dependencies |
| Async I/O | ✅ (Node) | ✅ (uvloop) |
| Performance | ⚠️ etwas langsamer | ✅ schneller |
| ML-Integration (V3 KI) | ⚠️ via Python-Service | ✅ nativ |
| Type-Safety | ✅ TS | ⚠️ mypy |

**Entscheidung:** NestJS, weil:
1. **Eine Sprache** im Repo (TS) → weniger Context-Switch, geteilte DTOs/Zod-Schemas
2. **Modulares DDD** ist in NestJS Idiomatik
3. **OpenAPI + Swagger-UI** out-of-the-box
4. ML-Workloads (Phase 3+) laufen in dediziertem Python-Worker (z.B. face-recognition), nicht im Hauptbackend

**Module-Setup:**

```ts
@Module({
  imports: [TypeOrmModule.forFeature([...]) /* oder Drizzle */],
  controllers: [MediaController],
  providers: [MediaService, MediaRepository],
  exports: [MediaService],
})
export class MediaModule {}
```

Jeder Bounded Context ist ein NestJS-Modul, registriert in `app.module.ts`.

### 3.2 Drizzle ORM

**Warum:**
- **TypeScript-first**, SQL-nah
- Sehr leichtgewichtig (~10 KB Runtime)
- Migrationen als plain SQL kontrollierbar
- Performance auf PG-Niveau

**Alternativen verworfen:**
- **Prisma** — zu opinionated, Generated Client zu groß, Performance-Overhead
- **TypeORM** — Decorators-Hölle, historisch instabil
- **Kysely** — gut, aber Drizzle-Ökosystem ist größer

### 3.3 Auth & Sicherheit

| Komponente | Bibliothek | Zweck |
|------------|------------|-------|
| Password Hashing | `argon2` (Node) | Argon2id |
| JWT Sign/Verify | `jose` | RS256 |
| Cookie-Management | `cookie` + Helmet-Set | HttpOnly, SameSite=Strict |
| CSRF | `csrf-csrf` | Double-Submit-Cookie |
| TOTP | `otplib` | RFC 6238 |
| WebAuthn / Passkeys | `@simplewebauthn/server` | Phase 3 |
| Rate Limiting | `@nestjs/throttler` + Redis-Store | pro IP + User |
| Vault-Krypto | Node `crypto.createCipheriv('aes-256-gcm')` | Authenticated Encryption |

### 3.4 File-Upload

- `@nestjs/platform-express` + `multer` für Multipart
- Chunked-Upload (10 MB Chunks) für große Videos
- Direkter Stream in Storage (kein Disk-Hop)
- Virus-Scan-Hook (Phase 4 via ClamAV)

### 3.5 Worker / Queues

- **BullMQ** für:
  - Thumbnail-Generierung
  - EXIF-Extraktion
  - OCR (Tesseract)
  - Jellyfin-Sync
  - E-Mail-Versand
  - Webhook-Dispatch
- Worker läuft als separater Container (`worker`)

### 3.6 Google-API (googleapis) & Scheduling (@nestjs/schedule)

Für die Google-Konto-Integration (`integrations`, `email`, `calendar`):

- **`googleapis`** — offizielle Google-API-Client-Bibliothek:
  - `OAuth2Client` (`google-auth-library`) für den OAuth2-Flow (auth-url, code-exchange, Token-Refresh, `tokens`-Event)
  - `google.gmail({ version: 'v3' })` — Gmail-Live-Proxy (email-Domain)
  - `google.calendar({ version: 'v3' })` — Google-Kalender-Sync (calendar-Domain)
- **`@nestjs/schedule`** — In-Process-Cron via `@Cron()`-Decorator (kein separater Worker nötig): Google-Kalender-Sync alle 15 min (`*/15 * * * *`).
- **OAuth-Token-Krypto:** Access-/Refresh-Tokens AES-256-GCM via `lib/token-crypto.ts` (in `integrations`-Domain), Key aus `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- **Env:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`.
- **Zeitzonen:** naive lokale Timestamps (Europe/Berlin); Konversionen zentral in `calendar-timezone.ts`.

---

## 4. Datenbank

### 4.1 PostgreSQL 16

**Warum:**
- 16 ist die aktuelle LTS-Linie (bis 2028)
- Volle JSONB-Unterstützung
- Row-Level-Security für Multi-Tenant
- `pg_trgm`, `citext`, `pgcrypto` Extensions
- Stabile Replikation (Phase 3+ Read-Replica)
- Riesiges Tooling-Ökosystem

**Konfiguration (`postgresql.conf` Highlights):**

```ini
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 64MB
maintenance_work_mem = 256MB
wal_compression = on
max_connections = 100
log_min_duration_statement = 500
```

### 4.2 Connection Pooling

- **PgBouncer** in `transaction`-Mode (Phase 2+)
- App-Pool: 10 Connections pro Service
- Vorher: Direkt-Connection pro Service

---

## 5. Cache & Suche

### 5.1 Redis 7

- **Sitzungen / Rate-Limits** — `INCR` + `EXPIRE`
- **BullMQ-Queues** — als Backend
- **Cache-Layer** — `GET /api/v1/dashboard` Resultat 60s gecacht
- **Pub/Sub** — für WebSocket-Notifications (Phase 1+)

**Verboten:** Redis als Primary-Storage. Nur Cache/Queue.

### 5.2 Meilisearch v1.8

- Ein Index pro Domain: `media`, `recipes`, `projects`, `documents`, `wiki_pages`, `jellyfin_items`
- Konfiguration pro Index:
  - `searchableAttributes`: priorisiert
  - `filterableAttributes`: `owner_id`, `kind`, `tags`
  - `sortableAttributes`: `taken_at`, `created_at`
- German Stopwords aktiv
- Indexer-Worker konsumiert `domain_events`-Stream
- API-Key nur via `MEILI_MASTER_KEY` + per-Index `tenantToken` (Phase 3)

---

## 6. Storage

### 6.1 NAS-Mount (Phase 0+)

- SMB- oder NFS-Mount des NAS in alle relevanten Container
- Pfade siehe `ARCHITECTURE.md` §9
- Pro Domain eigene Subdirs
- `LocalDiskStorage`-Implementation des `StorageService`-Interface

### 6.2 S3-Stub (Phase 5+)

- `S3Storage`-Implementation hinter demselben Interface
- MinIO lokal für Tests
- Optional AWS S3 / Hetzner Object Storage für Offsite

**Verboten:** Binary-Blob in Postgres (`bytea`).

### 6.3 Storage-Interface

```ts
export interface StorageService {
  put(domain: string, key: string, stream: Readable): Promise<string>;
  get(path: string): Promise<Readable>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ size: number; mtime: Date }>;
  signedUrl(path: string, expiresIn: number): Promise<string>;
}
```

Default-Implementierung: `LocalDiskStorage` (Mount)
Stub: `S3Storage` (Phase 5)

---

## 7. Infrastruktur

### 7.1 Traefik v3

- **Auto-Discovery** via Docker-Labels
- **Let's Encrypt** über DNS-Challenge (Cloudflare) — funktioniert mit Tailscale
- **Middlewares:** Rate-Limit, Compression, Security-Headers
- **Dashboard** nur via Tailscale-IP erreichbar

### 7.2 Tailscale

- **Sidecar-Container** mit `tailscale/tailscale:latest`
- `TS_AUTHKEY` aus `.env` (einmalig)
- MagicDNS aktiv → `lifehub.ts.net`
- Tailscale-Funnel optional (Phase 5) für Freigabe an Verwandte

### 7.3 Docker / Compose

- Multi-Stage-Builds für Frontend & Backend
- Images auf `ghcr.io/<user>/lifehub-<service>`
- `docker-compose.yml` (dev) + `docker-compose.prod.yml` (NAS)
- `restart: unless-stopped`
- `healthcheck` pro Service

**Beispiel-Service:**

```yaml
services:
  backend:
    image: ghcr.io/robert/lifehub-backend:latest
    restart: unless-stopped
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://lifehub:${DB_PASS}@postgres:5432/lifehub
      - REDIS_URL=redis://redis:6379
    volumes:
      - /mnt/nas/lifehub/photos:/mnt/media/photos:rw
      - /mnt/nas/lifehub/thumbnails:/mnt/media/thumbnails:rw
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://localhost:3007/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.lifehub-api.rule=Host(`lifehub.ts.net`) && PathPrefix(`/api`)"
      - "traefik.http.routers.lifehub-api.tls=true"
      - "traefik.http.routers.lifehub-api.tls.certresolver=letsencrypt"
```

### 7.4 Observability (Phase 2+)

- **Pino** strukturiert JSON → `loki`
- **Prometheus** scrape `/metrics` aller Services
- **Grafana** Dashboards (CPU, RAM, Disk, Request-Latenz, Queue-Länge)
- **OpenTelemetry** Node-SDK → `tempo`
- **Sentry self-hosted** für Errors + Performance
- **Alerting** via Grafana → Signal/Telegram

---

## 8. Dev-Tooling

### 8.1 pnpm + Workspaces

- `pnpm@9+` mit `workspace.yaml`
- Workspaces: `apps/frontend`, `apps/backend`, `domains/*`, `shared/*`
- `pnpm install` installiert alles
- `pnpm -r build` baut alles
- `pnpm --filter backend test` einzelnes Workspace

### 8.2 Linting & Formatting

- **ESLint 9** mit `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-tailwindcss`
- **Prettier 3** mit import-sort
- `lint-staged` + `husky` pre-commit
- CI: `pnpm lint && pnpm typecheck`

### 8.3 Testing

| Ebene | Tool | Wo |
|-------|------|-----|
| Unit (Backend) | Vitest | `domains/*/tests/unit/` |
| API (Backend) | Vitest + Supertest | `domains/*/tests/api/` |
| Permission | Vitest | `domains/*/tests/permissions/` |
| Unit (Frontend) | Vitest + Testing Library | `apps/frontend/tests/` |
| E2E | Playwright | `apps/frontend/e2e/` |
| Visual | Chromatic (optional) | shadcn-Storybook |

Coverage-Ziel: 70% Lines pro Domain, 90% auf `shared/permissions`.

### 8.4 CI (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16, env: { POSTGRES_PASSWORD: test } }
      redis:    { image: redis:7 }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
      - run: pnpm -r lint
      - run: pnpm -r test
      - run: pnpm --filter backend build
      - run: pnpm --filter frontend build
```

---

## 9. API-Standards

### 9.1 REST + OpenAPI

- Versionierung: `/api/v1/...`
- OpenAPI-Spec wird aus NestJS-Decorators generiert
- Generierter TS-Client für Frontend (`openapi-typescript`)
- Swagger-UI auf `/api/docs` (nur intern erreichbar)

### 9.2 Konventionen

- Plural Nouns: `/api/v1/media`, `/api/v1/recipes`
- HTTP-Verben: GET/POST/PUT/PATCH/DELETE
- Cursor-Pagination: `?cursor=...&limit=50`
- Filter: `?filter[kind]=photo`
- Sort: `?sort=-taken_at`
- Errors: RFC 7807 Problem Details

### 9.3 Webhooks

- Outgoing Webhooks pro Domain
- HMAC-SHA256-Signatur im Header `X-LifeHub-Signature`
- Retry mit Exponential Backoff (BullMQ)
- Dead-Letter-Queue nach 5 Fehlversuchen

---

## 10. Lizenz- & Kosten-Übersicht

| Komponente | Lizenz | Kosten |
|------------|--------|--------|
| Next.js | MIT | 0 € |
| React | MIT | 0 € |
| NestJS | MIT | 0 € |
| TypeScript | Apache-2.0 | 0 € |
| Tailwind | MIT | 0 € |
| shadcn/ui | MIT | 0 € |
| PostgreSQL | PostgreSQL | 0 € |
| Redis | RSALv2/SSPLv1 (Source-Available, self-host kostenlos) | 0 € |
| Meilisearch | MIT | 0 € |
| Traefik | MIT | 0 € |
| Tailscale | Open-Source-Client, SaaS free für bis 100 Devices | 0 € |
| Docker | Apache-2.0 | 0 € |
| OpenStreetMap | ODbL | 0 € |
| Three.js | MIT | 0 € |
| Leaflet | BSD-2-Clause | 0 € |
| Argon2 | MIT/CC0 | 0 € |
| **Gesamt (Software)** | — | **0 €** |
| **Domains (optional)** | — | 10–15 €/Jahr |
| **Tailscale (100 Devices)** | — | 0 € |
| **Let's Encrypt** | — | 0 € |
| **Strom NAS (~30W Dauerlast)** | — | ~80 €/Jahr |
| **Externe Audits Vault (V2, optional)** | — | 5.000–15.000 € einmalig |

**Bottom Line:** LifeHub ist als reines Hobby-Projekt mit 0 € Software-Kosten betreibbar, sofern das NAS bereits vorhanden ist.

---

## 11. Verbotene Technologien

Folgende Technologien sind **explizit verboten** und dürfen nicht ohne RFC+ADR in den Stack aufgenommen werden:

| Technologie | Grund |
|-------------|-------|
| MongoDB | Wir brauchen ACID + Relations, Postgres reicht |
| Firebase | Vendor-Lock, kein Self-Host |
| Supabase | Prima Service, aber wir wollen OSS-only Self-Host |
| Google Maps | Privacy, Kosten |
| AWS S3 als Default | Vendor-Lock, NAS-First |
| Cloudflare (Pflicht) | Optional als DNS-Provider für LE-Challenge, sonst nicht |
| Redux | Zu viel Boilerplate, Zustand reicht |
| jQuery | Hallo, es ist 2026 |
| Vite ohne Next.js | SSR + Streaming brauchen Framework |
| FastAPI in MVP | Heterogener Stack, NestJS reicht |
| GraphQL in MVP | Overhead, REST + TanStack Query ist einfacher |
| Webpack | Next.js nutzt Turbopack / Webpack intern, kein direkter Kontakt |
| Yarn / npm | pnpm ist Standard |
| Drizzle `relations` API für Cross-Schema | DRIED-spezifisch, wir nutzen manuelle Joins per ID |

ADR (Architecture Decision Records) werden in `docs/adr/NNNN-title.md` abgelegt, sobald eine Stack-Entscheidung revidiert werden soll.

---

## 12. Upgrade-Strategie

- **Postgres-Major-Upgrades** jährlich (16 → 17 → 18) — `pg_upgrade` mit Downtime-Fenster
- **Node.js** aktuell halten (LTS), 2× jährlich Evaluierung
- **Next.js** Major-Upgrades (14 → 15 → 16) sobald App-Router stabil bleibt
- **Dependencies** via Renovate / Dependabot wöchentlich
- **Breaking Changes** in eigenem Branch + Migrations-Guide

---

## 13. Versionierung der LifeHub-Software

- **Semver** (`MAJOR.MINOR.PATCH`)
- MAJOR: Breaking API- oder DB-Changes
- MINOR: Neue Domain oder Feature
- PATCH: Bugfixes
- Docker-Images mit Git-SHA-Tag + `latest`
- Changelog via `release-please` (Conventional Commits)
