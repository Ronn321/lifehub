-- Migration 0026: Shopping + Finance Domain-Tabellen
-- Diese Tabellen waren in shared/db/src/schema/public.ts definiert
-- (shoppingLists, shoppingItems, financeAccounts, financeCategories,
--  financeTransactions, financeBudgets, financeSavingsGoals,
--  financeAssets, financeAssetPrices), wurden aber nie migriert —
-- alle Finance-Endpunkte und die Shopping-Liste lieferten live HTTP 500
-- (relation "finance_accounts"/"shopping_lists" does not exist).
-- Schema-Quelle: shared/db/src/schema/public.ts (§ shopping_lists … finance_asset_prices)

-- ===================== shopping_lists =====================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users(id),
  color text,
  store text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS shopping_lists_owner_idx ON shopping_lists(owner_id, deleted_at);

CREATE OR REPLACE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== shopping_items =====================
CREATE TABLE IF NOT EXISTS shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount text,
  unit text,
  category text,
  checked boolean NOT NULL DEFAULT false,
  checked_by text,
  ord integer NOT NULL DEFAULT 0,
  recipe_ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shopping_items_list_idx ON shopping_items(list_id, ord);

-- ===================== finance_accounts =====================
CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'checking',
  currency char(3) NOT NULL DEFAULT 'EUR',
  balance numeric(18, 2) NOT NULL DEFAULT '0',
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS finance_accounts_owner_idx ON finance_accounts(owner_id, deleted_at);

CREATE OR REPLACE TRIGGER finance_accounts_updated_at
  BEFORE UPDATE ON finance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== finance_categories =====================
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

-- ===================== finance_transactions =====================
CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric(18, 2) NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES finance_categories(id),
  payee text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_transactions_account_idx ON finance_transactions(account_id, date);
CREATE INDEX IF NOT EXISTS finance_transactions_category_idx ON finance_transactions(category_id);

-- ===================== finance_budgets =====================
CREATE TABLE IF NOT EXISTS finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES finance_categories(id),
  amount numeric(18, 2) NOT NULL,
  period text NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_budgets_owner_idx ON finance_budgets(owner_id);

CREATE OR REPLACE TRIGGER finance_budgets_updated_at
  BEFORE UPDATE ON finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== finance_savings_goals =====================
CREATE TABLE IF NOT EXISTS finance_savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_amount numeric(18, 2) NOT NULL,
  current_amount numeric(18, 2) NOT NULL DEFAULT '0',
  jar_account_id uuid REFERENCES finance_accounts(id),
  deadline date,
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_savings_goals_owner_idx ON finance_savings_goals(owner_id);

CREATE OR REPLACE TRIGGER finance_savings_goals_updated_at
  BEFORE UPDATE ON finance_savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== finance_assets =====================
CREATE TABLE IF NOT EXISTS finance_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  quantity numeric(18, 6) NOT NULL DEFAULT '0',
  current_price numeric(18, 6) NOT NULL DEFAULT '0',
  currency char(3) NOT NULL DEFAULT 'EUR',
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS finance_assets_owner_idx ON finance_assets(owner_id, deleted_at);

CREATE OR REPLACE TRIGGER finance_assets_updated_at
  BEFORE UPDATE ON finance_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================== finance_asset_prices =====================
CREATE TABLE IF NOT EXISTS finance_asset_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES finance_assets(id) ON DELETE CASCADE,
  price numeric(18, 6) NOT NULL,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_asset_prices_asset_idx ON finance_asset_prices(asset_id, date);
