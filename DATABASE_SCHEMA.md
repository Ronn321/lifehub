# DATABASE_SCHEMA.md

# LifeHub – Datenbankschema (kanonisch)

Version: 1.0
Quelle der Wahrheit für alle DB-Entitäten. ARCHITECTURE.md verweist auf diese Datei.

---

## 1. Übersicht

- **Engine:** PostgreSQL 16 (immer LTS, derzeit 16.x)
- **Schemata:** 1 Schema pro Bounded Context + 1 `public` Schema für Shared Layer
- **Migrations:** Drizzle ORM + versionierte SQL-Migrations
- **Charset:** UTF-8, `lc_collate = 'de_DE.UTF-8'`, `lc_ctype = 'de_DE.UTF-8'`
- **Extensions (Pflicht):**
  - `uuid-ossp` — Fallback-UUIDs (wir nutzen primär v7 aus der App)
  - `pgcrypto` — `gen_random_bytes()` für Token
  - `citext` — case-insensitive E-Mails
  - `pg_trgm` — Trigramm-Suche in Wiki/Docs
  - `btree_gin` / `btree_gist` — kombinierte Indizes

---

## 2. Topologie

```
postgres
├── public           (shared: users, groups, roles, permissions, audit, tags, sessions)
├── media            (media_files, albums, media_sources, media_tags, media_album_items)
├── travel           (trips, destinations, trip_days, trip_media_refs)
├── projects         (projects, project_files, project_notes, project_links)
├── recipes          (recipes, ingredients, steps, recipe_tags, recipe_media_refs)
├── shopping         (shopping_lists, shopping_items, shopping_recipe_refs)
├── finance          (accounts, transactions, categories, budgets, savings_goals, jars, assets)
├── insurance        (insurance_policies, insurance_documents, insurance_contacts)
├── vault            (vault_entries, vault_attachments, totp_secrets, cards)
├── documents        (documents, document_tags, document_ocr, document_refs)
├── calendar         (calendars, calendar_events, event_attendees, event_reminders, user_settings)
├── integrations     (google_connections)   — Email: keine Tabellen (Live-Proxy)
├── it_inventory     (devices, network_interfaces, device_credentials, locations)
├── jellyfin         (jellyfin_servers, jellyfin_libraries, jellyfin_items, jellyfin_watchlists, jellyfin_watchlist_items)
├── dashboard        (dashboard_layouts, widgets, widget_instances)
├── plugins          (plugins, plugin_permissions, plugin_data)
└── search           (search_queries, search_clicks) -- nur Analytics, Indizes sind extern
```

**Regel:** Jede Tabelle liegt in dem Schema ihrer Domain. Cross-Schema-Zugriffe nur über referenzielle IDs, niemals Foreign Keys.

---

## 3. Globale Konventionen

Auf **jeder** Tabelle:

| Spalte | Typ | Default | Zweck |
|--------|-----|---------|-------|
| `id` | `UUID` | `gen_random_uuid()` | Primary Key, App generiert v7 wo möglich |
| `created_at` | `TIMESTAMPTZ` | `now()` | Erstellung |
| `updated_at` | `TIMESTAMPTZ` | `now()` | letzte Änderung (Trigger) |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft Delete |
| `owner_id` | `UUID` | — | Verweis auf `public.users.id` (NOT NULL) |

Indizes (Mindest):
- `idx_<table>_owner_active` auf `(owner_id) WHERE deleted_at IS NULL`
- `idx_<table>_created_at` auf `(created_at DESC)` für Timeline-Sortierung

Trigger:
- `set_updated_at` vor UPDATE
- `audit_row` für INSERT/UPDATE/DELETE → schreibt in `public.audit_logs`

---

## 4. Schema: `public` (Shared Layer)

### 4.1 `users`

```sql
CREATE TABLE public.users (
  id              UUID PRIMARY KEY,
  email           CITEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  password_hash   TEXT NOT NULL,                  -- Argon2id
  totp_secret     TEXT,                           -- verschlüsselt (Phase V2)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE, -- Admin-Systemuser, nicht löschbar
  locale          TEXT NOT NULL DEFAULT 'de-DE',
  timezone        TEXT NOT NULL DEFAULT 'Europe/Berlin',
  theme           TEXT NOT NULL DEFAULT 'dark',   -- 'dark' | 'light' | 'system'
  brand_color     TEXT NOT NULL DEFAULT '#D97706',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX users_active_idx ON public.users(id) WHERE deleted_at IS NULL AND is_active = TRUE;
```

### 4.2 `groups` (Familien)

```sql
CREATE TABLE public.groups (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
```

### 4.3 `roles`

```sql
CREATE TABLE public.roles (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,           -- 'admin' | 'family' | 'child' | 'guest' | custom
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Standard-Rollen (Seed):

```sql
INSERT INTO public.roles (id, name, description, is_system) VALUES
  (gen_random_uuid(), 'admin',  'Vollzugriff',                 TRUE),
  (gen_random_uuid(), 'family', 'Alle Module außer User-Admin', TRUE),
  (gen_random_uuid(), 'child',  'Eingeschränkte Sicht',         TRUE),
  (gen_random_uuid(), 'guest',  'Read-only auf freigegebene Inhalte', TRUE);
```

### 4.4 `permissions`

```sql
CREATE TABLE public.permissions (
  id      UUID PRIMARY KEY,
  domain  TEXT NOT NULL,            -- 'media' | 'finance' | 'vault' | ...
  action  TEXT NOT NULL,            -- 'read' | 'create' | 'update' | 'delete' | 'share' | 'admin'
  UNIQUE (domain, action)
);
```

Vollständige Seed-Liste:

```sql
-- 16 Domains × 6 Actions = 96 Permissions
INSERT INTO public.permissions (domain, action) VALUES
  -- users
  ('users','read'),('users','create'),('users','update'),('users','delete'),('users','share'),('users','admin'),
  -- media
  ('media','read'),('media','create'),('media','update'),('media','delete'),('media','share'),('media','admin'),
  -- ... (alle Domains gleich)
  ('travel','read'),('travel','create'),('travel','update'),('travel','delete'),('travel','share'),('travel','admin'),
  ('projects','read'),('projects','create'),('projects','update'),('projects','delete'),('projects','share'),('projects','admin'),
  ('recipes','read'),('recipes','create'),('recipes','update'),('recipes','delete'),('recipes','share'),('recipes','admin'),
  ('shopping','read'),('shopping','create'),('shopping','update'),('shopping','delete'),('shopping','share'),('shopping','admin'),
  ('finance','read'),('finance','create'),('finance','update'),('finance','delete'),('finance','share'),('finance','admin'),
  ('insurance','read'),('insurance','create'),('insurance','update'),('insurance','delete'),('insurance','share'),('insurance','admin'),
  ('vault','read'),('vault','create'),('vault','update'),('vault','delete'),('vault','share'),('vault','admin'),
  ('documents','read'),('documents','create'),('documents','update'),('documents','delete'),('documents','share'),('documents','admin'),
  ('calendar','read'),('calendar','create'),('calendar','update'),('calendar','delete'),('calendar','share'),('calendar','admin'),
  ('it_inventory','read'),('it_inventory','create'),('it_inventory','update'),('it_inventory','delete'),('it_inventory','share'),('it_inventory','admin'),
  ('jellyfin','read'),('jellyfin','create'),('jellyfin','update'),('jellyfin','delete'),('jellyfin','share'),('jellyfin','admin'),
  ('search','read'),('search','create'),('search','update'),('search','delete'),('search','share'),('search','admin'),
  ('dashboard','read'),('dashboard','create'),('dashboard','update'),('dashboard','delete'),('dashboard','share'),('dashboard','admin'),
  ('plugins','read'),('plugins','create'),('plugins','update'),('plugins','delete'),('plugins','share'),('plugins','admin'),
  ('email','read'),('email','create'),('email','update'),('email','delete'),('email','share'),('email','admin'),
  ('integrations','read'),('integrations','create'),('integrations','update'),('integrations','delete'),('integrations','share'),('integrations','admin');
```

> 18 Domains × 6 Aktionen = 108 Permissions (inkl. `email`, `integrations`).

### 4.5 `user_roles`

```sql
CREATE TABLE public.user_roles (
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id  UUID NOT NULL REFERENCES public.roles(id)  ON DELETE CASCADE,
  scope    TEXT,                            -- optional: pro Domain einschränken
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id, COALESCE(scope, ''))
);
```

### 4.6 `role_permissions`

```sql
CREATE TABLE public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id)       ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

Standard-Mapping (Seed, Beispiel):

```sql
-- admin: alle
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin';

-- child: keine finance/vault/insurance
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'child'
  AND p.domain NOT IN ('finance', 'vault', 'insurance', 'it_inventory', 'users', 'plugins');
```

### 4.7 `sessions` (Refresh-Token-Tracking)

```sql
CREATE TABLE public.sessions (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_hash  TEXT NOT NULL,           -- SHA-256 vom Refresh-Token
  user_agent    TEXT,
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON public.sessions(user_id) WHERE revoked_at IS NULL;
```

### 4.8 `audit_logs` (append-only, HMAC-Chain)

```sql
CREATE TABLE public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    UUID REFERENCES public.users(id),
  action      TEXT NOT NULL,          -- 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | ...
  domain      TEXT NOT NULL,
  entity_type TEXT,                   -- 'media.media_files' etc.
  entity_id   UUID,
  before      JSONB,                  -- Snapshot vorher
  after       JSONB,                  -- Snapshot nachher
  ip_address  INET,
  user_agent  TEXT,
  prev_hash   BYTEA,                  -- HMAC der vorigen Zeile
  row_hash    BYTEA NOT NULL          -- HMAC über alle Felder + prev_hash
);

CREATE INDEX audit_logs_actor_idx   ON public.audit_logs(actor_id, occurred_at DESC);
CREATE INDEX audit_logs_entity_idx  ON public.audit_logs(domain, entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_logs_time_idx    ON public.audit_logs(occurred_at DESC);
```

`row_hash = HMAC-SHA256(secret, occurred_at || actor_id || action || domain || entity_id || before || after || prev_hash)` — macht Logs tamper-evident.

### 4.9 `tags` (geteiltes Tagging)

```sql
CREATE TABLE public.tags (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  domain      TEXT NOT NULL,                   -- auf welche Domain sich der Tag bezieht
  name        TEXT NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, domain, name)
);
```

### 4.10 `domain_events` (Outbox-Pattern)

```sql
CREATE TABLE public.domain_events (
  id           UUID PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type   TEXT NOT NULL,                  -- 'MediaCreated', 'TransactionAdded', ...
  aggregate_id UUID,
  payload      JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT
);
CREATE INDEX domain_events_unpub_idx ON public.domain_events(occurred_at) WHERE published_at IS NULL;
```

---

## 5. Schema: `media`

```sql
CREATE SCHEMA media;

CREATE TABLE media.media_sources (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  kind        TEXT NOT NULL,                -- 'local_upload' | 'smb' | 'nfs' | 's3'
  name        TEXT NOT NULL,
  base_path   TEXT NOT NULL,                -- z.B. '/mnt/media/photos'
  config      JSONB,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  last_index_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE media.albums (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  title       TEXT NOT NULL,
  description TEXT,
  cover_media_id UUID,
  kind        TEXT NOT NULL DEFAULT 'generic',  -- 'generic' | 'trip' | 'event' | 'person'
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE media.media_files (
  id           UUID PRIMARY KEY,
  owner_id     UUID NOT NULL REFERENCES public.users(id),
  source_id    UUID,
  album_id     UUID,
  storage_path TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  width        INT,
  height       INT,
  duration_s   INT,
  taken_at     TIMESTAMPTZ,
  gps_lat      NUMERIC(9,6),
  gps_lon      NUMERIC(9,6),
  exif         JSONB,
  thumb_paths  JSONB,                          -- { 'sm': '...', 'md': '...', 'lg': '...' }
  blurhash     TEXT,
  perceptual_hash TEXT,                        -- für Duplikaterkennung
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX media_files_owner_idx     ON media.media_files(owner_id)        WHERE deleted_at IS NULL;
CREATE INDEX media_files_taken_at_idx   ON media.media_files(taken_at DESC)   WHERE deleted_at IS NULL;
CREATE INDEX media_files_gps_idx        ON media.media_files(gps_lat, gps_lon) WHERE deleted_at IS NULL;
CREATE INDEX media_files_album_idx      ON media.media_files(album_id)        WHERE deleted_at IS NULL;
CREATE INDEX media_files_phash_idx      ON media.media_files(perceptual_hash) WHERE deleted_at IS NULL;

CREATE TABLE media.media_tags (
  media_id UUID NOT NULL REFERENCES media.media_files(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES public.tags(id)        ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);
```

---

## 6. Schema: `travel`

```sql
CREATE SCHEMA travel;

CREATE TABLE travel.trips (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  title       TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  cover_media_id UUID,
  status      TEXT NOT NULL DEFAULT 'planned',  -- 'planned' | 'active' | 'completed'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE travel.destinations (
  id          UUID PRIMARY KEY,
  trip_id     UUID NOT NULL REFERENCES travel.trips(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  lat         NUMERIC(9,6) NOT NULL,
  lon         NUMERIC(9,6) NOT NULL,
  arrival_at  TIMESTAMPTZ,
  departure_at TIMESTAMPTZ,
  notes       TEXT,
  ord         INT NOT NULL DEFAULT 0
);

CREATE TABLE travel.trip_days (
  id          UUID PRIMARY KEY,
  trip_id     UUID NOT NULL REFERENCES travel.trips(id) ON DELETE CASCADE,
  day_date    DATE NOT NULL,
  title       TEXT,
  notes       TEXT,
  UNIQUE (trip_id, day_date)
);

CREATE TABLE travel.trip_media_refs (
  trip_id   UUID NOT NULL REFERENCES travel.trips(id)        ON DELETE CASCADE,
  media_id  UUID NOT NULL REFERENCES media.media_files(id)  ON DELETE CASCADE,
  day_id    UUID REFERENCES travel.trip_days(id) ON DELETE SET NULL,
  ord       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (trip_id, media_id)
);
```

---

## 7. Schema: `projects`

```sql
CREATE SCHEMA projects;

CREATE TABLE projects.projects (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,                          -- '3d_print' | 'arduino' | 'raspi' | 'code' | 'electronics' | 'diy'
  description TEXT,
  cover_media_id UUID,
  status      TEXT NOT NULL DEFAULT 'planning',       -- 'planning' | 'building' | 'done' | 'archived'
  github_repo TEXT,
  started_at  DATE,
  finished_at DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE projects.project_files (
  id           UUID PRIMARY KEY,
  project_id   UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  owner_id     UUID NOT NULL REFERENCES public.users(id),
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'other',          -- 'stl' | 'gcode' | 'code' | 'image' | 'doc' | 'other'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE projects.project_notes (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  title       TEXT,
  body_md     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects.project_links (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,           -- 'youtube' | 'github' | 'web' | 'shop'
  url         TEXT NOT NULL,
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Schema: `recipes`

```sql
CREATE SCHEMA recipes;

CREATE TABLE recipes.recipes (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  cover_media_id UUID,
  source_type   TEXT,                 -- 'manual' | 'url' | 'youtube' | 'pdf' | 'book'
  source_url    TEXT,
  source_label  TEXT,                 -- z.B. 'Omas Kochbuch, S.42'
  youtube_url   TEXT,
  servings      INT,
  prep_minutes  INT,
  cook_minutes  INT,
  nutrition     JSONB,                -- kcal, protein, fat, carbs
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE recipes.ingredients (
  id          UUID PRIMARY KEY,
  recipe_id   UUID NOT NULL REFERENCES recipes.recipes(id) ON DELETE CASCADE,
  ord         INT NOT NULL,
  quantity    NUMERIC(10,3),
  unit        TEXT,
  name        TEXT NOT NULL,
  note        TEXT
);

CREATE TABLE recipes.steps (
  id          UUID PRIMARY KEY,
  recipe_id   UUID NOT NULL REFERENCES recipes.recipes(id) ON DELETE CASCADE,
  ord         INT NOT NULL,
  body_md     TEXT NOT NULL,
  timer_seconds INT
);

CREATE TABLE recipes.recipe_tags (
  recipe_id UUID NOT NULL REFERENCES recipes.recipes(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES public.tags(id)        ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
```

---

## 9. Schema: `shopping`

```sql
CREATE SCHEMA shopping;

CREATE TABLE shopping.shopping_lists (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  title       TEXT NOT NULL,
  color       TEXT,
  store       TEXT,
  archived    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE shopping.shopping_items (
  id          UUID PRIMARY KEY,
  list_id     UUID NOT NULL REFERENCES shopping.shopping_lists(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  title       TEXT NOT NULL,
  quantity    NUMERIC(10,3),
  unit        TEXT,
  category    TEXT,                   -- 'produce' | 'dairy' | 'meat' | 'pantry' | ...
  checked     BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by  UUID REFERENCES public.users(id),
  checked_at  TIMESTAMPTZ,
  ord         INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shopping_items_list_idx ON shopping.shopping_items(list_id, ord);
```

---

## 10. Schema: `finance`

```sql
CREATE SCHEMA finance;

CREATE TABLE finance.accounts (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,                       -- 'checking' | 'savings' | 'brokerage' | 'credit' | 'cash' | 'crypto' | 'jar'
  currency    CHAR(3) NOT NULL DEFAULT 'EUR',
  iban        TEXT,
  institution TEXT,
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
  color       TEXT,
  icon        TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE finance.categories (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES finance.categories(id),
  icon        TEXT,
  color       TEXT,
  kind        TEXT NOT NULL DEFAULT 'expense'       -- 'expense' | 'income' | 'transfer'
);

CREATE TABLE finance.transactions (
  id           UUID PRIMARY KEY,
  owner_id     UUID NOT NULL REFERENCES public.users(id),
  account_id   UUID NOT NULL REFERENCES finance.accounts(id),
  category_id  UUID REFERENCES finance.categories(id),
  amount       NUMERIC(18,2) NOT NULL,              -- negativ = Ausgabe, positiv = Einnahme
  currency     CHAR(3) NOT NULL DEFAULT 'EUR',
  description  TEXT,
  payee        TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL,
  import_hash  TEXT,                                -- für Re-Import-Erkennung
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX transactions_account_time_idx ON finance.transactions(account_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX transactions_category_time_idx ON finance.transactions(category_id, occurred_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE finance.budgets (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  name        TEXT NOT NULL,
  category_id UUID REFERENCES finance.categories(id),
  period      TEXT NOT NULL DEFAULT 'monthly',      -- 'monthly' | 'yearly'
  amount      NUMERIC(18,2) NOT NULL,
  starts_on   DATE NOT NULL,
  ends_on     DATE
);

CREATE TABLE finance.savings_goals (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  name        TEXT NOT NULL,
  target_amount NUMERIC(18,2) NOT NULL,
  current_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  target_date DATE,
  jar_account_id UUID REFERENCES finance.accounts(id),   -- optional Spartopf
  color       TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE finance.assets (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  account_id  UUID REFERENCES finance.accounts(id),
  symbol      TEXT NOT NULL,                        -- 'AAPL', 'IWDA.AS', 'BTC'
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,                        -- 'stock' | 'etf' | 'bond' | 'crypto' | 'metal' | 'fund'
  quantity    NUMERIC(18,8) NOT NULL,
  cost_basis  NUMERIC(18,2),
  currency    CHAR(3) NOT NULL DEFAULT 'EUR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE finance.asset_prices (
  id          UUID PRIMARY KEY,
  asset_id    UUID NOT NULL REFERENCES finance.assets(id) ON DELETE CASCADE,
  price       NUMERIC(18,4) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'EUR',
  as_of       DATE NOT NULL,
  source      TEXT,                                 -- 'manual' | 'csv' | 'api'
  UNIQUE (asset_id, as_of)
);
```

---

## 11. Schema: `insurance`

```sql
CREATE SCHEMA insurance;

CREATE TABLE insurance.insurance_policies (
  id              UUID PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES public.users(id),
  category        TEXT NOT NULL,                    -- 'health' | 'liability' | 'car' | 'home' | 'life' | 'legal' | 'other'
  provider        TEXT NOT NULL,
  policy_number   TEXT NOT NULL,
  description     TEXT,
  premium_amount  NUMERIC(18,2) NOT NULL,
  premium_interval TEXT NOT NULL DEFAULT 'yearly',  -- 'monthly' | 'quarterly' | 'yearly'
  currency        CHAR(3) NOT NULL DEFAULT 'EUR',
  coverage_amount NUMERIC(18,2),
  starts_on       DATE NOT NULL,
  ends_on         DATE,
  cancellation_period_days INT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE insurance.insurance_documents (
  id           UUID PRIMARY KEY,
  policy_id    UUID NOT NULL REFERENCES insurance.insurance_policies(id) ON DELETE CASCADE,
  owner_id     UUID NOT NULL REFERENCES public.users(id),
  storage_path TEXT NOT NULL,
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  kind         TEXT,                                 -- 'contract' | 'invoice' | 'letter' | 'other'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
```

---

## 12. Schema: `vault`

```sql
CREATE SCHEMA vault;

-- Ciphertext-Speicherung. KEIN Klartext auf Server.
CREATE TABLE vault.vault_entries (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  folder        TEXT NOT NULL DEFAULT 'general',
  type          TEXT NOT NULL,                       -- 'login' | 'note' | 'card' | 'identity' | 'ssh'
  name          TEXT NOT NULL,                       -- Klartext, dient nur als Anzeige & Suche
  ciphertext    BYTEA NOT NULL,                       -- AES-256-GCM verschlüsselter JSON
  nonce         BYTEA NOT NULL,                       -- 12 Byte GCM-Nonce
  aad           BYTEA,                                -- Additional Authenticated Data (entry_id)
  key_version   INT NOT NULL DEFAULT 1,               -- für Schlüssel-Rotation
  search_blurb  TEXT,                                 -- kurze Klartext-Repräsentation für Suche
  favorite      BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE vault.totp_secrets (
  id            UUID PRIMARY KEY,
  vault_entry_id UUID NOT NULL REFERENCES vault.vault_entries(id) ON DELETE CASCADE,
  ciphertext    BYTEA NOT NULL,                       -- verschlüsselter Secret
  nonce         BYTEA NOT NULL,
  digits        INT NOT NULL DEFAULT 6,
  period        INT NOT NULL DEFAULT 30,
  algorithm     TEXT NOT NULL DEFAULT 'SHA1',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vault.cards (
  id            UUID PRIMARY KEY,
  vault_entry_id UUID NOT NULL REFERENCES vault.vault_entries(id) ON DELETE CASCADE,
  card_brand    TEXT,                                 -- 'visa' | 'mastercard' | ...
  last4         TEXT,                                 -- Klartext (für Anzeige), Rest verschlüsselt im entry
  exp_month     INT,
  exp_year      INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vault.attachments (
  id            UUID PRIMARY KEY,
  vault_entry_id UUID NOT NULL REFERENCES vault.vault_entries(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,                        -- bereits verschlüsselt geschrieben
  filename_enc  BYTEA NOT NULL,                       -- verschlüsselter Dateiname
  mime_type     TEXT,
  size_bytes    BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Sicherheits-Notiz Vault:** Der Master-Key wird **niemals** serverseitig gespeichert. Pro Login leitet die App den Schlüssel via Argon2 aus User-Passwort + serverseitigem Salt ab. `ciphertext` und `nonce` werden bei `key_version`-Rotation re-verschlüsselt (Re-Wrap).

---

## 13. Schema: `documents`

```sql
CREATE SCHEMA documents;

CREATE TABLE documents.documents (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  title         TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  filename      TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  ocr_text      TEXT,                                  -- Volltext aus OCR
  ocr_status    TEXT NOT NULL DEFAULT 'pending',        -- 'pending' | 'processing' | 'done' | 'failed'
  ocr_at        TIMESTAMPTZ,
  expires_at    DATE,                                  -- z.B. Garantie
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX documents_ocr_trgm_idx ON documents.documents USING gin (ocr_text gin_trgm_ops);

CREATE TABLE documents.document_tags (
  document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES public.tags(id)        ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE documents.document_refs (
  id            UUID PRIMARY KEY,
  document_id   UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
  ref_domain    TEXT NOT NULL,                        -- 'finance.transactions' | 'insurance.insurance_policies' | ...
  ref_id        UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, ref_domain, ref_id)
);
```

---

## 14. Schema: `calendar`

```sql
CREATE SCHEMA calendar;

CREATE TABLE calendar.calendars (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  name          TEXT NOT NULL,                            -- Titel des Kalenders (Spalte heißt `name`)
  color         TEXT,
  source        TEXT NOT NULL DEFAULT 'local',        -- 'local' | 'google' | 'caldav' | 'ics'
  external_id   TEXT,                                -- Google-Kalender-ID (für Re-Sync)
  sync_token    TEXT,                                -- Google nextSyncToken (inkrementeller Sync)  [Migration 0019]
  last_sync_at  TIMESTAMPTZ,                          -- [Migration 0019]
  is_visible    BOOLEAN NOT NULL DEFAULT TRUE,        -- [Migration 0019]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
-- Idempotenter Upsert pro User+Quelle+Google-Kalender:  [Migration 0018]
CREATE UNIQUE INDEX calendars_source_unique
  ON calendar.calendars (owner_id, source, external_id) WHERE deleted_at IS NULL;

CREATE TABLE calendar.events (
  id            UUID PRIMARY KEY,
  calendar_id   UUID REFERENCES calendar.calendars(id) ON DELETE SET NULL,  -- Multi-Kalender [Migration 0018]
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  title         TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  all_day       BOOLEAN NOT NULL DEFAULT FALSE,
  rrule         TEXT,                                 -- RFC 5545 (Follow-up)
  external_uid  TEXT,                                 -- Google-Event-ID für Re-Sync-Idempotenz
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (calendar_id, external_uid)
);
CREATE INDEX events_time_idx ON calendar.events(calendar_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX calendar_events_calendar_idx ON calendar.events (calendar_id);   -- [Migration 0018]

CREATE TABLE calendar.event_attendees (
  event_id  UUID NOT NULL REFERENCES calendar.events(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.users(id),
  status    TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'accepted' | 'declined'
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE calendar.event_reminders (
  id          UUID PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES calendar.events(id) ON DELETE CASCADE,
  minutes_before INT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'email'           -- 'email' | 'push'
);

-- Calendar-Personalisierung (User-Settings, pro User 1:1).  [Migration 0018]
CREATE TABLE calendar.user_settings (
  owner_id            uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  accent_color        text,                           -- NULL = Hub-Brand-Akzent
  background_url      text,                           -- Hintergrundbild-URL der Kalender-Seite
  background_overlay  real NOT NULL DEFAULT 0.85,     -- Lesbarkeits-Overlay-Opacity (0.5..0.95)
  background_blur     integer NOT NULL DEFAULT 12,    -- CSS blur px (0..24)
  default_view        text NOT NULL DEFAULT 'month',  -- 'month' | 'week' | 'day' | 'agenda'
  week_start          text NOT NULL DEFAULT 'monday', -- 'monday' | 'sunday'
  show_week_numbers   boolean NOT NULL DEFAULT TRUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

> **Hinweis zur tatsächlichen Implementierung:** Die Calendar-Tabellen liegen im **public-Schema** (`shared/db/src/schema/public.ts`), nicht als eigenes `calendar`-Schema. Die Tabellennamen sind `calendars`, `calendar_events`, `event_attendees`, `event_reminders`, `user_settings` (ohne Schema-Präfix). Die Spalte heißt **`name`** (nicht `title`). Die Migrationen `0017_calendar.sql` (Basis), `0018_google_integrations.sql` (user_settings, calendar_id auf events, unique index) und `0019_calendar_sync_columns.sql` (sync_token/last_sync_at/is_visible) bilden den Ist-Zustand ab.

---

## 14a. Schema: `integrations`

Google-Konto-Verbindungen (OAuth2). Eigentümer ist der LifeHub-User. Tokens werden **AES-256-GCM verschlüsselt** gespeichert (Key via `GOOGLE_TOKEN_ENCRYPTION_KEY`).

```sql
CREATE SCHEMA IF NOT EXISTS integrations;

CREATE TABLE integrations.google_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  google_email      text NOT NULL,
  display_name      text,
  avatar_url        text,
  access_token_enc  text NOT NULL,                   -- AES-256-GCM verschlüsselt
  refresh_token_enc text NOT NULL,                   -- AES-256-GCM verschlüsselt
  token_expires_at  timestamptz,
  granted_scopes    text[] NOT NULL DEFAULT '{}',
  last_sync_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE INDEX google_connections_owner_idx
  ON integrations.google_connections (owner_id) WHERE deleted_at IS NULL;
```

Drizzle-Definition: `shared/db/src/schema/public.ts` via `integrationsSchema = pgSchema('integrations')`, Tabelle `googleConnections`.

**Email-Domain:** **keine eigenen Tabellen** — Live-Proxy auf Gmail über `integrations.google_connections`. (Siehe `features/email.feature.md`.)

---

## 15. Schema: `it_inventory`

```sql
CREATE SCHEMA it_inventory;

CREATE TABLE it_inventory.locations (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  name        TEXT NOT NULL,                          -- 'Büro', 'Wohnzimmer', 'Keller'
  parent_id   UUID REFERENCES it_inventory.locations(id),
  icon        TEXT
);

CREATE TABLE it_inventory.devices (
  id              UUID PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES public.users(id),
  location_id     UUID REFERENCES it_inventory.locations(id),
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL,                       -- 'pc' | 'nas' | 'router' | 'switch' | 'ap' | 'printer' | 'server' | 'iot' | 'phone' | 'other'
  manufacturer    TEXT,
  model           TEXT,
  serial_number   TEXT,
  mac_address     MACADDR,
  ip_address      INET,
  hostname        TEXT,
  os              TEXT,
  os_version      TEXT,
  firmware        TEXT,
  purchase_date   DATE,
  warranty_until  DATE,
  notes           TEXT,
  cover_media_id  UUID,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE it_inventory.network_interfaces (
  id            UUID PRIMARY KEY,
  device_id     UUID NOT NULL REFERENCES it_inventory.devices(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  mac_address   MACADDR,
  ipv4          INET,
  ipv6          INET,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  speed_mbps    INT
);

CREATE TABLE it_inventory.device_credentials (
  id             UUID PRIMARY KEY,
  device_id      UUID NOT NULL REFERENCES it_inventory.devices(id) ON DELETE CASCADE,
  vault_entry_id UUID NOT NULL REFERENCES vault.vault_entries(id) ON DELETE RESTRICT,
  purpose        TEXT,                                -- 'admin' | 'wifi' | 'ssh' | 'other'
  UNIQUE (device_id, vault_entry_id)
);
```

---

## 16. Schema: `jellyfin`

```sql
CREATE SCHEMA jellyfin;

CREATE TABLE jellyfin.jellyfin_servers (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  name          TEXT NOT NULL,
  base_url      TEXT NOT NULL,
  api_key       TEXT NOT NULL,                        -- verschlüsselt at rest
  user_id       UUID NOT NULL REFERENCES public.users(id),
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE jellyfin.jellyfin_libraries (
  id            UUID PRIMARY KEY,
  server_id     UUID NOT NULL REFERENCES jellyfin.jellyfin_servers(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL,                        -- 'movies' | 'shows' | 'music' | 'mixed'
  item_count    INT NOT NULL DEFAULT 0,
  UNIQUE (server_id, external_id)
);

CREATE TABLE jellyfin.jellyfin_items (
  id            UUID PRIMARY KEY,
  library_id    UUID NOT NULL REFERENCES jellyfin.jellyfin_libraries(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  kind          TEXT NOT NULL,                        -- 'movie' | 'episode' | 'series' | 'season' | 'track' | 'album'
  parent_id     UUID REFERENCES jellyfin.jellyfin_items(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  sort_title    TEXT,
  overview      TEXT,
  year          INT,
  runtime_min   INT,
  rating        NUMERIC(4,1),
  genres        TEXT[],
  poster_url    TEXT,
  backdrop_url  TEXT,
  trailer_url   TEXT,
  added_at      TIMESTAMPTZ,
  premiered_at  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (library_id, external_id)
);
CREATE INDEX jellyfin_items_title_idx ON jellyfin.jellyfin_items USING gin (to_tsvector('simple', title));

CREATE TABLE jellyfin.jellyfin_watchstate (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.users(id),
  item_id     UUID NOT NULL REFERENCES jellyfin.jellyfin_items(id) ON DELETE CASCADE,
  position_s  INT NOT NULL DEFAULT 0,
  duration_s  INT,
  played      BOOLEAN NOT NULL DEFAULT FALSE,
  played_at   TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

-- Benutzerdefinierte Watchlists (LifeHub-eigen; implementiert in public-Schema, Migration 0018)
CREATE TABLE jellyfin.jellyfin_watchlists (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jellyfin.jellyfin_watchlist_items (
  id               UUID PRIMARY KEY,
  watchlist_id     UUID NOT NULL REFERENCES jellyfin.jellyfin_watchlists(id) ON DELETE CASCADE,
  external_item_id TEXT NOT NULL,                    -- Jellyfin-Item-ID
  item_type        TEXT NOT NULL,                    -- 'Movie' | 'Series' | …
  name             TEXT NOT NULL,                    -- Titel-Snapshot
  position         INT NOT NULL DEFAULT 0,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (watchlist_id, external_item_id)
);
```

---

## 17. Schema: `dashboard`

```sql
CREATE SCHEMA dashboard;

CREATE TABLE dashboard.dashboard_layouts (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'default',
  layout      JSONB NOT NULL,                        -- { cols, rows, widgets: [{id, x, y, w, h, config}] }
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dashboard.widgets (
  id          TEXT PRIMARY KEY,                      -- 'media.recent' | 'finance.networth' | 'calendar.upcoming' | ...
  domain      TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  default_size TEXT NOT NULL DEFAULT 'md',           -- 'sm' | 'md' | 'lg' | 'xl'
  config_schema JSONB                                -- JSON-Schema für Widget-Config
);
```

---

## 18. Schema: `plugins`

```sql
CREATE SCHEMA plugins;

CREATE TABLE plugins.plugins (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES public.users(id),
  manifest      JSONB NOT NULL,                       -- kompletter Plugin-Manifest
  status        TEXT NOT NULL DEFAULT 'installed',   -- 'installed' | 'enabled' | 'disabled' | 'error'
  version       TEXT NOT NULL,
  installed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plugins.plugin_permissions (
  plugin_id  UUID NOT NULL REFERENCES plugins.plugins(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,                          -- 'media.read' | 'network.call' | ...
  granted    BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (plugin_id, permission)
);

CREATE TABLE plugins.plugin_data (
  id          UUID PRIMARY KEY,
  plugin_id   UUID NOT NULL REFERENCES plugins.plugins(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plugin_id, owner_id, key)
);
```

---

## 19. Trigger & Funktionen

### 19.1 `set_updated_at`

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auf jede Tabelle mit updated_at:
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 19.2 `audit_row`

```sql
CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
  v_domain TEXT;
  v_entity TEXT;
  v_prev BYTEA;
  v_hash BYTEA;
BEGIN
  -- actor und domain aus application_name / settings lesen,
  -- die pro Transaktion per SET LOCAL gesetzt werden
  BEGIN
    v_actor := current_setting('app.actor_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  v_domain := current_setting('app.domain', true);
  v_entity := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;

  SELECT row_hash INTO v_prev
  FROM public.audit_logs
  ORDER BY id DESC
  LIMIT 1;

  v_hash := digest(
    coalesce(v_prev, '\x'::bytea)
    || extract(epoch from now())::bytea
    || coalesce(v_actor::text, '')::bytea
    || TG_OP::bytea
    || v_domain::bytea
    || v_entity::bytea
    || coalesce((CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)::text, '')::bytea,
    'sha256'
  );

  INSERT INTO public.audit_logs (actor_id, action, domain, entity_type, entity_id, before, after, prev_hash, row_hash)
  VALUES (
    v_actor,
    lower(TG_OP),
    v_domain,
    v_entity,
    coalesce((CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END)::text, '')::UUID,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    v_prev,
    v_hash
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Beispiel pro Tabelle:
CREATE TRIGGER trg_media_files_audit
AFTER INSERT OR UPDATE OR DELETE ON media.media_files
FOR EACH ROW EXECUTE FUNCTION public.audit_row();
```

Die App setzt pro Transaktion:

```sql
SET LOCAL app.actor_id = '00000000-...';
SET LOCAL app.domain   = 'media';
```

---

## 20. Migration-Strategie

### 20.1 Tooling

- **Drizzle ORM** für TypeScript-Typen + Query-Builder
- Migrations als plain SQL im Verzeichnis `infrastructure/postgres/migrations/NNNN_name.sql`
- `infrastructure/postgres/migrate.ts` runner

### 20.2 Regeln

- Migrationen sind **append-only**, niemals ändern nach Commit
- Jede Migration ist in einer Transaktion
- Jede Migration hat `BEGIN; ... COMMIT;` (außer `CREATE INDEX CONCURRENTLY`)
- Down-Migrations existieren nicht — Rollback via neue Migration
- Naming: `0001_init_users.sql`, `0002_init_media.sql`, …

### 20.3 Reihenfolge

1. Extensions (`uuid-ossp`, `pgcrypto`, `citext`, `pg_trgm`)
2. `public`-Schema (users, groups, roles, permissions, sessions, audit, tags, events)
3. `media` (wegen Travel/Projekte/Recipes, die darauf referenzieren)
4. `travel`, `projects`, `recipes`, `shopping`
5. `finance`, `insurance`, `vault`, `documents`
6. `calendar`, `it_inventory`, `jellyfin`
7. `dashboard`, `plugins`

---

## 21. Seed-Daten

Initial-Seed (in `infrastructure/postgres/seed.sql`):

- 4 Standardrollen (admin/family/child/guest)
- 96 Permissions
- Role-Permission-Mapping
- 1 System-User (`is_system=TRUE`, unsichtbar)
- Standard-Tag-Kategorien pro Domain (optional)
- Demo-Wetter-Location (Plugin-Default)

---

## 22. Performance-Hinweise

- Alle Reads filtern `WHERE deleted_at IS NULL` (Partial Index)
- Cursor-Pagination, kein OFFSET
- `pg_trgm` für Wiki/Doc-Suche statt `ILIKE '%foo%'`
- `EXPLAIN ANALYZE` Pflicht für jede Query > 50 ms in Dev
- Connection-Pooling via PgBouncer (in `docker-compose.yml`, Phase 2+)

---

## 23. Backup & Restore

```bash
# Dump
pg_dump -Fc -d lifehub -f backup_$(date +%F).dump

# Restore
pg_restore -d lifehub_new backup_2026-06-14.dump

# Täglich via cron im Backup-Container:
0 3 * * * pg_dump -Fc -d lifehub > /backups/db_$(date +\%F).dump
```

Vault-Daten sind AES-256 verschlüsselt — sie können gefahrlos in Dumps enthalten sein.

---

## 24. DoD Schema

Schema ist „fertig", wenn:

- Alle Tabellen in ARCHITECTURE.md referenziert haben ein DDL in dieser Datei
- Migrations laufen idempotent (`IF NOT EXISTS`)
- Audit-Trigger auf 100% der Mutationen
- Indizes für alle Foreign-Lookups + Timeline-Sortierungen
- Soft Delete + Owner-Spalte auf 100% der Entitäten
- Seed reproduzierbar (`pnpm db:reset` setzt DB in definierten Zustand)
