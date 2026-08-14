# LifeHub Development Setup

## Prerequisites

- Node.js >= 20 (use `corepack enable` to get pnpm)
- pnpm 9.x
- Docker + Docker Compose
- Git

## First-time setup

```bash
# From the repo root
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start Postgres + Redis + Meilisearch
docker compose up -d postgres redis meilisearch

# Run database migrations
pnpm db:migrate

# Seed roles + permissions
pnpm db:seed

# Start backend + frontend in parallel
pnpm dev
```

Backend: http://localhost:3007
Frontend: http://localhost:3001
Postgres: localhost:5432
Meilisearch: localhost:7700

## Default test user

After `pnpm db:seed`, a test admin user is created:
- Email: `admin@lifehub.local`
- Password: `admin12345`

**Change this immediately for any non-dev environment!**

## Phase 0 Status

Currently implemented:
- [x] `users` domain (Phase 0)
- [x] Auth (JWT RS256 + Argon2id)
- [x] RBAC (4 roles × 96 permissions)
- [x] Audit logging (HMAC chain trigger)
- [x] Docker dev stack

## Mobile Apps

Natives App-Client-Projekt (Flutter, WebView-Shell) für Android / Google TV / iOS —
Code lebt im separaten Repo `D:\LifeHub-Mobile`. Stufe 1: Die App lädt das LifeHub-
Webfrontend als WebView; das Web bleibt Single Source of Truth. Das Webfrontend stellt
dafür eine Sidebar-Filterung (`lifehub:sidebar:hidden`), einen Client-/TV-Modus
(`?client=…`, `lifehub-tv` CSS) und einen D-Pad-Fokus-Helper (`window.lifehubTvFocus/Click`)
bereit.

**Details, Build-Befehle, RAM-Prozedur und Geräte-Installation:** siehe
[`docs/MOBILE_APPS.md`](docs/MOBILE_APPS.md) und die `README.md` in `D:\LifeHub-Mobile`.
