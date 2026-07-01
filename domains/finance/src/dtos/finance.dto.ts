import { z } from 'zod';

export const accountTypeEnum = z.enum(['checking', 'savings', 'brokerage', 'credit', 'cash', 'crypto', 'jar']);
export const assetTypeEnum = z.enum(['stock', 'etf', 'bond', 'crypto', 'precious_metal']);
export const budgetPeriodEnum = z.enum(['weekly', 'monthly', 'quarterly', 'yearly']);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  type: accountTypeEnum.optional().default('checking'),
  currency: z.string().length(3).optional().default('EUR'),
  balance: z.string().optional().default('0'),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: accountTypeEnum.optional(),
  currency: z.string().length(3).optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  date: z.string(),
  amount: z.string(),
  description: z.string().min(1).max(500),
  categoryId: z.string().uuid().nullable().optional(),
  payee: z.string().max(255).optional(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  amount: z.string(),
  period: budgetPeriodEnum.optional().default('monthly'),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  amount: z.string().optional(),
  period: budgetPeriodEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
});
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1).max(255),
  targetAmount: z.string(),
  currentAmount: z.string().optional().default('0'),
  jarAccountId: z.string().uuid().nullable().optional(),
  deadline: z.string().nullable().optional(),
});
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;

export const updateSavingsGoalSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  targetAmount: z.string().optional(),
  jarAccountId: z.string().uuid().nullable().optional(),
  deadline: z.string().nullable().optional(),
});
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;

export const contributeSchema = z.object({
  amount: z.string(),
});
export type ContributeInput = z.infer<typeof contributeSchema>;

export const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  type: assetTypeEnum,
  quantity: z.string().optional().default('0'),
  currentPrice: z.string().optional().default('0'),
  currency: z.string().length(3).optional().default('EUR'),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  quantity: z.string().optional(),
  currentPrice: z.string().optional(),
});
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
