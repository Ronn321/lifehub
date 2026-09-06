-- Migration 0027: Ghost-Domain-Tabellen (documents, insurance, vault, it-inventory, search, plugins)
-- Diese Tabellen waren in shared/db/src/schema/public.ts definiert, wurden aber
-- nie migriert. Die Module documents, insurance, vault, search, it-inventory und
-- plugins sind im Backend verdrahtet, ihre Repositories fragen diese Tabellen ab —
-- ohne diese Migration liefern alle ihre Endpunkte HTTP 500
-- (relation "..." does not exist).
-- Schema-Quelle: shared/db/src/schema/public.ts (§ documents … plugin_data)
-- Bereits existierende Tabellen (it_devices via 0003, plugins via 0004,
-- search_queries via 0005) werden hier NICHT erneut angelegt.

-- ===================== documents =====================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  description text,
  mime_type text,
  file_size integer,
  storage_path text,
  tags jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id, deleted_at);

CREATE OR REPLACE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== document_tags =====================
CREATE TABLE IF NOT EXISTS document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_tags_document_idx ON document_tags(document_id);

-- ===================== document_refs =====================
CREATE TABLE IF NOT EXISTS document_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ref_type text NOT NULL,
  ref_id text,
  ref_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_refs_document_idx ON document_refs(document_id);

-- ===================== insurance_policies =====================
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  provider text NOT NULL,
  policy_number text,
  premium text,
  interval text NOT NULL DEFAULT 'monthly',
  start_date timestamptz,
  end_date timestamptz,
  cancellation_period_days integer,
  ends_at timestamptz,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS insurance_policies_owner_idx ON insurance_policies(owner_id, deleted_at);

CREATE OR REPLACE TRIGGER insurance_policies_updated_at
  BEFORE UPDATE ON insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== insurance_documents =====================
CREATE TABLE IF NOT EXISTS insurance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS insurance_documents_policy_idx ON insurance_documents(policy_id);

-- ===================== vault_entries =====================
CREATE TABLE IF NOT EXISTS vault_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'login',
  username text,
  encrypted_password text,
  url text,
  notes text,
  totp_secret text,
  card_last4 text,
  card_brand text,
  key_version integer NOT NULL DEFAULT 1,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS vault_entries_owner_idx ON vault_entries(owner_id, deleted_at);

CREATE OR REPLACE TRIGGER vault_entries_updated_at
  BEFORE UPDATE ON vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== vault_attachments =====================
CREATE TABLE IF NOT EXISTS vault_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text,
  mime_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_attachments_entry_idx ON vault_attachments(entry_id);

-- ===================== vault_cards =====================
CREATE TABLE IF NOT EXISTS vault_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  card_number_enc text,
  expiry_month integer,
  expiry_year integer,
  card_holder_name text,
  issuer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_cards_entry_idx ON vault_cards(entry_id);

-- ===================== vault_totp_secrets =====================
CREATE TABLE IF NOT EXISTS vault_totp_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  secret text NOT NULL,
  issuer text,
  label text,
  algorithm text NOT NULL DEFAULT 'SHA1',
  digits integer NOT NULL DEFAULT 6,
  period integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_totp_secrets_entry_idx ON vault_totp_secrets(entry_id);

-- ===================== it_locations =====================
CREATE TABLE IF NOT EXISTS it_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS it_locations_owner_idx ON it_locations(owner_id);

CREATE OR REPLACE TRIGGER it_locations_updated_at
  BEFORE UPDATE ON it_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== it_network_interfaces =====================
CREATE TABLE IF NOT EXISTS it_network_interfaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES it_devices(id) ON DELETE CASCADE,
  name text NOT NULL,
  mac_address text,
  ip_address text,
  subnet text,
  gateway text,
  dns_servers text,
  type text NOT NULL DEFAULT 'ethernet',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS it_network_interfaces_device_idx ON it_network_interfaces(device_id);

-- ===================== it_device_credentials =====================
CREATE TABLE IF NOT EXISTS it_device_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES it_devices(id) ON DELETE CASCADE,
  username text NOT NULL,
  encrypted_password text,
  ssh_key_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS it_device_credentials_device_idx ON it_device_credentials(device_id);

CREATE OR REPLACE TRIGGER it_device_credentials_updated_at
  BEFORE UPDATE ON it_device_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== search_clicks =====================
CREATE TABLE IF NOT EXISTS search_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid REFERENCES search_queries(id),
  user_id uuid NOT NULL REFERENCES users(id),
  domain text NOT NULL,
  result_id text NOT NULL,
  result_title text,
  position integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_clicks_user_idx ON search_clicks(user_id);
CREATE INDEX IF NOT EXISTS search_clicks_query_idx ON search_clicks(query_id);

-- ===================== plugin_permissions =====================
CREATE TABLE IF NOT EXISTS plugin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id uuid NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  domain text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plugin_permissions_plugin_idx ON plugin_permissions(plugin_id);

-- ===================== plugin_data =====================
CREATE TABLE IF NOT EXISTS plugin_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id uuid NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS plugin_data_plugin_key_uq ON plugin_data(plugin_id, key);

CREATE OR REPLACE TRIGGER plugin_data_updated_at
  BEFORE UPDATE ON plugin_data
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
