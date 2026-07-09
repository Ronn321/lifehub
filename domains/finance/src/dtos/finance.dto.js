"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssetSchema = exports.createAssetSchema = exports.contributeSchema = exports.updateSavingsGoalSchema = exports.createSavingsGoalSchema = exports.updateBudgetSchema = exports.createBudgetSchema = exports.createTransactionSchema = exports.createCategorySchema = exports.updateAccountSchema = exports.createAccountSchema = exports.budgetPeriodEnum = exports.assetTypeEnum = exports.accountTypeEnum = void 0;
const zod_1 = require("zod");
exports.accountTypeEnum = zod_1.z.enum(['checking', 'savings', 'brokerage', 'credit', 'cash', 'crypto', 'jar']);
exports.assetTypeEnum = zod_1.z.enum(['stock', 'etf', 'bond', 'crypto', 'precious_metal']);
exports.budgetPeriodEnum = zod_1.z.enum(['weekly', 'monthly', 'quarterly', 'yearly']);
exports.createAccountSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    type: exports.accountTypeEnum.optional().default('checking'),
    currency: zod_1.z.string().length(3).optional().default('EUR'),
    balance: zod_1.z.string().optional().default('0'),
});
exports.updateAccountSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    type: exports.accountTypeEnum.optional(),
    currency: zod_1.z.string().length(3).optional(),
});
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    icon: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    parentId: zod_1.z.string().uuid().nullable().optional(),
});
exports.createTransactionSchema = zod_1.z.object({
    accountId: zod_1.z.string().uuid(),
    date: zod_1.z.string(),
    amount: zod_1.z.string(),
    description: zod_1.z.string().min(1).max(500),
    categoryId: zod_1.z.string().uuid().nullable().optional(),
    payee: zod_1.z.string().max(255).optional(),
});
exports.createBudgetSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid().nullable().optional(),
    amount: zod_1.z.string(),
    period: exports.budgetPeriodEnum.optional().default('monthly'),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string().nullable().optional(),
});
exports.updateBudgetSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid().nullable().optional(),
    amount: zod_1.z.string().optional(),
    period: exports.budgetPeriodEnum.optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().nullable().optional(),
});
exports.createSavingsGoalSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    targetAmount: zod_1.z.string(),
    currentAmount: zod_1.z.string().optional().default('0'),
    jarAccountId: zod_1.z.string().uuid().nullable().optional(),
    deadline: zod_1.z.string().nullable().optional(),
});
exports.updateSavingsGoalSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    targetAmount: zod_1.z.string().optional(),
    jarAccountId: zod_1.z.string().uuid().nullable().optional(),
    deadline: zod_1.z.string().nullable().optional(),
});
exports.contributeSchema = zod_1.z.object({
    amount: zod_1.z.string(),
});
exports.createAssetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    type: exports.assetTypeEnum,
    quantity: zod_1.z.string().optional().default('0'),
    currentPrice: zod_1.z.string().optional().default('0'),
    currency: zod_1.z.string().length(3).optional().default('EUR'),
});
exports.updateAssetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    quantity: zod_1.z.string().optional(),
    currentPrice: zod_1.z.string().optional(),
});
//# sourceMappingURL=finance.dto.js.map