-- Migration 0013: Remaining Domain Tables
-- Adds tables for: insurance, vault, documents, calendar, it_inventory, search, plugins

-- ===================== INSURANCE =====================

CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  provider TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  description TEXT,
  premium TEXT,
  interval TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE,
  end_date DATE,
  cancellation_period_days INT,
  ends_at TIMESTAMPTZ,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS insurance_policies_owner_idx ON insurance_policies(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS insurance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS insurance_documents_policy_idx ON insurance_documents(policy_id);

-- ===================== VAULT =====================

CREATE TABLE IF NOT EXISTS vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  folder TEXT NOT NULL DEFAULT 'general',
  type TEXT NOT NULL DEFAULT 'login',
  name TEXT NOT NULL,
  ciphertext BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  aad BYTEA,
  key_version INT NOT NULL DEFAULT 1,
  search_blurb TEXT,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS vault_entries_owner_idx ON vault_entries(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS vault_totp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_entry_id UUID NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  ciphertext BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  digits INT NOT NULL DEFAULT 6,
  period INT NOT NULL DEFAULT 30,
  algorithm TEXT NOT NULL DEFAULT 'SHA1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_totp_entry_idx ON vault_totp_secrets(vault_entry_id);

CREATE TABLE IF NOT EXISTS vault_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_entry_id UUID NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  card_brand TEXT,
  last4 TEXT,
  exp_month INT,
  exp_year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_cards_entry_idx ON vault_cards(vault_entry_id);

CREATE TABLE IF NOT EXISTS vault_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_entry_id UUID NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename_enc BYTEA NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_attachments_entry_idx ON vault_attachments(vault_entry_id);

-- ===================== DOCUMENTS =====================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  ocr_text TEXT,
  ocr_status TEXT NOT NULL DEFAULT 'pending',
  ocr_at TIMESTAMPTZ,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS document_tags (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE IF NOT EXISTS document_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ref_domain TEXT NOT NULL,
  ref_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, ref_domain, ref_id)
);

-- ===================== CALENDAR =====================

CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  color TEXT,
  source TEXT NOT NULL DEFAULT 'local',
  source_url TEXT,
  sync_token TEXT,
  last_sync_at TIMESTAMPTZ,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS calendars_owner_idx ON calendars(owner_id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  location TEXT,
  color TEXT,
  category TEXT,
  calendar_source TEXT NOT NULL DEFAULT 'local',
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS calendar_events_time_idx ON calendar_events(owner_id, start_date) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  minutes_before INT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email'
);
CREATE INDEX IF NOT EXISTS event_reminders_event_idx ON event_reminders(event_id);

-- ===================== IT_INVENTORY =====================

CREATE TABLE IF NOT EXISTS it_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES it_locations(id),
  icon TEXT
);
CREATE INDEX IF NOT EXISTS it_locations_owner_idx ON it_locations(owner_id);

CREATE TABLE IF NOT EXISTS it_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  location_id UUID REFERENCES it_locations(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  mac_address TEXT,
  ip_address TEXT,
  hostname TEXT,
  os TEXT,
  os_version TEXT,
  firmware TEXT,
  purchase_date DATE,
  warranty_until DATE,
  notes TEXT,
  cover_media_id UUID,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS it_devices_owner_idx ON it_devices(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS it_network_interfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES it_devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mac_address TEXT,
  ipv4 TEXT,
  ipv6 TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  speed_mbps INT
);
CREATE INDEX IF NOT EXISTS it_network_interfaces_device_idx ON it_network_interfaces(device_id);

CREATE TABLE IF NOT EXISTS it_device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES it_devices(id) ON DELETE CASCADE,
  vault_entry_id UUID NOT NULL REFERENCES vault_entries(id) ON DELETE RESTRICT,
  purpose TEXT
);
CREATE INDEX IF NOT EXISTS it_device_credentials_device_idx ON it_device_credentials(device_id);

-- ===================== SEARCH =====================

CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  query TEXT NOT NULL,
  results_count INT,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_queries_owner_idx ON search_queries(owner_id);

CREATE TABLE IF NOT EXISTS search_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
  result_id UUID,
  result_type TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_clicks_query_idx ON search_clicks(query_id);

-- ===================== PLUGINS =====================

CREATE TABLE IF NOT EXISTS plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  description TEXT,
  author TEXT,
  homepage TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  permissions JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS plugins_owner_idx ON plugins(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS plugin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  action TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS plugin_permissions_plugin_idx ON plugin_permissions(plugin_id);

CREATE TABLE IF NOT EXISTS plugin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  UNIQUE (plugin_id, key)
);
CREATE INDEX IF NOT EXISTS plugin_data_plugin_idx ON plugin_data(plugin_id);
