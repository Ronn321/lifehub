-- Finance Domain: Migration 001 (idempotent)
CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'checking',
  currency char(3) NOT NULL DEFAULT 'EUR',
  balance numeric(18,2) NOT NULL DEFAULT 0,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS finance_accounts_owner_idx ON finance_accounts(owner_id, deleted_at);

CREATE TABLE IF NOT EXISTS finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  color text,
  parent_id uuid REFERENCES finance_categories(id),
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_categories_owner_idx ON finance_categories(owner_id);
CREATE INDEX IF NOT EXISTS finance_categories_parent_idx ON finance_categories(parent_id);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric(18,2) NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES finance_categories(id),
  payee text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_transactions_account_idx ON finance_transactions(account_id, date);
CREATE INDEX IF NOT EXISTS finance_transactions_category_idx ON finance_transactions(category_id);

CREATE TABLE IF NOT EXISTS finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES finance_categories(id),
  amount numeric(18,2) NOT NULL,
  period text NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_budgets_owner_idx ON finance_budgets(owner_id);

CREATE TABLE IF NOT EXISTS finance_savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_amount numeric(18,2) NOT NULL,
  current_amount numeric(18,2) NOT NULL DEFAULT 0,
  jar_account_id uuid REFERENCES finance_accounts(id),
  deadline date,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_savings_goals_owner_idx ON finance_savings_goals(owner_id);

CREATE TABLE IF NOT EXISTS finance_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  quantity numeric(18,6) NOT NULL DEFAULT 0,
  current_price numeric(18,6) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS finance_assets_owner_idx ON finance_assets(owner_id, deleted_at);

CREATE TABLE IF NOT EXISTS finance_asset_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES finance_assets(id) ON DELETE CASCADE,
  price numeric(18,6) NOT NULL,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_asset_prices_asset_idx ON finance_asset_prices(asset_id, date);
