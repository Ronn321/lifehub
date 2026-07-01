export type AccountType = 'checking' | 'savings' | 'brokerage' | 'credit' | 'cash' | 'crypto' | 'jar';
export type AssetType = 'stock' | 'etf' | 'bond' | 'crypto' | 'precious_metal';
export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface FinanceAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FinanceCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  ownerId: string;
  createdAt: string;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  date: string;
  amount: string;
  description: string;
  categoryId: string | null;
  payee: string | null;
  createdAt: string;
}

export interface FinanceBudget {
  id: string;
  categoryId: string | null;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSavingsGoal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  jarAccountId: string | null;
  deadline: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceAsset {
  id: string;
  name: string;
  type: AssetType;
  quantity: string;
  currentPrice: string;
  currency: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FinanceAssetPrice {
  id: string;
  assetId: string;
  price: string;
  date: string;
  createdAt: string;
}
