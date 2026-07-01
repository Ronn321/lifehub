-- 0001_init_public_schema.sql
-- Public-Schema: users, groups, roles, permissions, sessions, audit, tags, events
-- (kanonisch: DATABASE_SCHEMA.md §4)

-- =============================================================
-- TRIGGER FUNCTIONS (vor Tabellen, die sie nutzen)
-- =============================================================

-- set_updated_at: aktualisiert updated_at bei jedem UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- audit_row: schreibt in public.audit_logs mit HMAC-Chain
-- Die App setzt pro Transaktion via SET LOCAL:
--   SET LOCAL app.actor_id = '...';
--   SET LOCAL app.domain   = 'media';
CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_domain TEXT;
  v_entity TEXT;
  v_prev BYTEA;
  v_hash BYTEA;
  v_seed TEXT;
BEGIN
  BEGIN
    v_actor := NULLIF(current_setting('app.actor_id', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  v_domain := COALESCE(NULLIF(current_setting('app.domain', true), ''), 'system');
  v_entity := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;

  SELECT row_hash INTO v_prev
  FROM public.audit_logs
  ORDER BY id DESC
  LIMIT 1;

  v_seed := coalesce(v_actor::text, '') || '|' || TG_OP || '|' || v_domain || '|' || v_entity || '|' ||
            coalesce((CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD)::text ELSE to_jsonb(NEW)::text END), '') || '|' ||
            coalesce(encode(v_prev, 'hex'), '');

  v_hash := digest(v_seed, 'sha256');

  INSERT INTO public.audit_logs (actor_id, action, domain, entity_type, entity_id, before, after, prev_hash, row_hash)
  VALUES (
    v_actor,
    lower(TG_OP),
    v_domain,
    v_entity,
    (CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    v_prev,
    v_hash
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- TABLES
-- =============================================================

-- USERS
CREATE TABLE public.users (
  id              UUID PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  password_hash   TEXT NOT NULL,
  totp_secret     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  locale          TEXT NOT NULL DEFAULT 'de-DE',
  timezone        TEXT NOT NULL DEFAULT 'Europe/Berlin',
  theme           TEXT NOT NULL DEFAULT 'dark',
  brand_color     TEXT NOT NULL DEFAULT '#D97706',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX users_active_idx ON public.users(id) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_users_audit AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- GROUPS (kein Audit-Trigger, da Gruppen via User-Modell laufen)
CREATE TABLE public.groups (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ROLES
CREATE TABLE public.roles (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PERMISSIONS
CREATE TABLE public.permissions (
  id      UUID PRIMARY KEY,
  domain  TEXT NOT NULL,
  action  TEXT NOT NULL,
  UNIQUE (domain, action)
);

-- USER_ROLES
CREATE TABLE public.user_roles (
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES public.roles(id)  ON DELETE CASCADE,
  scope      TEXT NOT NULL DEFAULT '',
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id, scope)
);

-- ROLE_PERMISSIONS
CREATE TABLE public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id)       ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- SESSIONS
CREATE TABLE public.sessions (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_hash  TEXT NOT NULL,
  user_agent    TEXT,
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON public.sessions(user_id) WHERE revoked_at IS NULL;

-- AUDIT_LOGS
CREATE TABLE public.audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     UUID,
  action       TEXT NOT NULL,
  domain       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  before       JSONB,
  after        JSONB,
  ip_address   INET,
  user_agent   TEXT,
  prev_hash    BYTEA,
  row_hash     BYTEA NOT NULL
);

CREATE INDEX audit_logs_actor_idx  ON public.audit_logs(actor_id, occurred_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(domain, entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_logs_time_idx   ON public.audit_logs(occurred_at DESC);

-- TAGS
CREATE TABLE public.tags (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES public.users(id),
  domain      TEXT NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, domain, name)
);

-- DOMAIN_EVENTS (Outbox)
CREATE TABLE public.domain_events (
  id            UUID PRIMARY KEY,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type    TEXT NOT NULL,
  aggregate_id  UUID,
  payload       JSONB NOT NULL,
  published_at  TIMESTAMPTZ,
  attempts      INT NOT NULL DEFAULT 0,
  last_error    TEXT
);
CREATE INDEX domain_events_unpub_idx ON public.domain_events(occurred_at) WHERE published_at IS NULL;
