"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FinanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = exports.BudgetExceeded = exports.TransactionCreated = void 0;
const common_1 = require("@nestjs/common");
const events_1 = require("@lifehub/events");
const finance_repository_1 = require("../repositories/finance.repository");
exports.TransactionCreated = (0, events_1.createEventType)('finance.transaction.created');
exports.BudgetExceeded = (0, events_1.createEventType)('finance.budget.exceeded');
let FinanceService = FinanceService_1 = class FinanceService {
    repo;
    events;
    logger = new common_1.Logger(FinanceService_1.name);
    constructor(repo, events) {
        this.repo = repo;
        this.events = events;
    }
    async createAccount(ownerId, input) {
        return this.repo.createAccount({ ...input, ownerId, currency: input.currency ?? 'EUR', balance: input.balance ?? '0' });
    }
    async listAccounts(ownerId) {
        return this.repo.findAccountsByOwner(ownerId);
    }
    async getAccount(ownerId, id) {
        const account = await this.repo.findAccountById(id, ownerId);
        if (!account)
            throw new common_1.NotFoundException('Konto nicht gefunden');
        return account;
    }
    async updateAccount(ownerId, id, input) {
        const account = await this.repo.findAccountById(id, ownerId);
        if (!account)
            throw new common_1.NotFoundException('Konto nicht gefunden');
        return this.repo.updateAccount(id, ownerId, input);
    }
    async deleteAccount(ownerId, id) {
        const account = await this.repo.findAccountById(id, ownerId);
        if (!account)
            throw new common_1.NotFoundException('Konto nicht gefunden');
        await this.repo.softDeleteAccount(id, ownerId);
    }
    async createCategory(ownerId, input) {
        return this.repo.createCategory({ ...input, ownerId, icon: input.icon, color: input.color, parentId: input.parentId ?? null });
    }
    async listCategories(ownerId) {
        return this.repo.findCategoriesByOwner(ownerId);
    }
    async createTransaction(ownerId, input) {
        const account = await this.repo.findAccountById(input.accountId, ownerId);
        if (!account)
            throw new common_1.NotFoundException('Konto nicht gefunden');
        const transaction = await this.repo.createTransaction(input);
        if (!transaction)
            throw new Error('Transaktion konnte nicht erstellt werden');
        const amountNum = parseFloat(input.amount);
        const newBalance = (parseFloat(account.balance) + amountNum).toFixed(2);
        await this.repo.updateAccount(input.accountId, ownerId, { balance: newBalance });
        await this.events.emit(exports.TransactionCreated.create(transaction.id, {
            accountId: input.accountId,
            transactionId: transaction.id,
            amount: input.amount,
            description: input.description,
        }));
        return transaction;
    }
    async listTransactions(ownerId, accountId) {
        if (accountId) {
            const account = await this.repo.findAccountById(accountId, ownerId);
            if (!account)
                throw new common_1.NotFoundException('Konto nicht gefunden');
            return this.repo.findTransactionsByAccount(accountId);
        }
        return this.repo.findTransactionsByOwner(ownerId);
    }
    async deleteTransaction(ownerId, id) {
        const transaction = await this.repo.findTransactionById(id);
        if (!transaction)
            throw new common_1.NotFoundException('Transaktion nicht gefunden');
        const account = await this.repo.findAccountById(transaction.accountId, ownerId);
        if (!account)
            throw new common_1.NotFoundException('Konto nicht gefunden');
        const amountNum = parseFloat(transaction.amount);
        const newBalance = (parseFloat(account.balance) - amountNum).toFixed(2);
        await this.repo.updateAccount(transaction.accountId, ownerId, { balance: newBalance });
        await this.repo.deleteTransaction(id);
    }
    async createBudget(ownerId, input) {
        return this.repo.createBudget({ ...input, ownerId, categoryId: input.categoryId ?? null, endDate: input.endDate ?? null });
    }
    toDateString(d) {
        return d ?? new Date().toISOString().slice(0, 10);
    }
    async listBudgets(ownerId) {
        const budgets = await this.repo.findBudgetsByOwner(ownerId);
        const enriched = await Promise.all(budgets.map(async (budget) => {
            const end = this.toDateString(budget.endDate);
            const start = this.toDateString(budget.startDate);
            const spent = await this.repo.getSpentByCategory(ownerId, start, end);
            const spentAmount = spent
                .filter(s => budget.categoryId ? s.categoryId === budget.categoryId : s.categoryId === null)
                .reduce((sum, s) => sum + parseFloat(s.total ?? '0'), 0);
            return { ...budget, spent: spentAmount.toFixed(2) };
        }));
        return enriched;
    }
    async updateBudget(ownerId, id, input) {
        const budget = await this.repo.findBudgetById(id, ownerId);
        if (!budget)
            throw new common_1.NotFoundException('Budget nicht gefunden');
        return this.repo.updateBudget(id, ownerId, input);
    }
    async createSavingsGoal(ownerId, input) {
        return this.repo.createSavingsGoal({ ...input, ownerId, jarAccountId: input.jarAccountId ?? null, deadline: input.deadline ?? null });
    }
    async listSavingsGoals(ownerId) {
        return this.repo.findSavingsGoalsByOwner(ownerId);
    }
    async updateSavingsGoal(ownerId, id, input) {
        const goal = await this.repo.findSavingsGoalById(id, ownerId);
        if (!goal)
            throw new common_1.NotFoundException('Sparziel nicht gefunden');
        return this.repo.updateSavingsGoal(id, ownerId, input);
    }
    async contributeToGoal(ownerId, id, input) {
        const goal = await this.repo.findSavingsGoalById(id, ownerId);
        if (!goal)
            throw new common_1.NotFoundException('Sparziel nicht gefunden');
        const newAmount = (parseFloat(goal.currentAmount) + parseFloat(input.amount)).toFixed(2);
        return this.repo.updateSavingsGoal(id, ownerId, { currentAmount: newAmount });
    }
    async createAsset(ownerId, input) {
        return this.repo.createAsset({ ...input, ownerId });
    }
    async listAssets(ownerId) {
        return this.repo.findAssetsByOwner(ownerId);
    }
    async updateAsset(ownerId, id, input) {
        const asset = await this.repo.findAssetById(id, ownerId);
        if (!asset)
            throw new common_1.NotFoundException('Wertanlage nicht gefunden');
        return this.repo.updateAsset(id, ownerId, input);
    }
    async getNetWorth(ownerId) {
        const accountBalance = await this.repo.getNetWorth(ownerId);
        const assets = await this.repo.findAssetsByOwner(ownerId);
        const assetValue = assets.reduce((sum, a) => sum + (parseFloat(a.quantity) * parseFloat(a.currentPrice)), 0);
        return { accountBalance: accountBalance.toFixed(2), assetValue: assetValue.toFixed(2), netWorth: (accountBalance + assetValue).toFixed(2) };
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = FinanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [finance_repository_1.FinanceRepository,
        events_1.EventsService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map