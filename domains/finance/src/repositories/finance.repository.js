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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@lifehub/db");
let FinanceRepository = class FinanceRepository {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    get db() {
        return this.dbService.db;
    }
    async createAccount(data) {
        const [row] = await this.db.insert(db_1.financeAccounts).values(data).returning();
        return row;
    }
    async findAccountsByOwner(ownerId) {
        return this.db.select().from(db_1.financeAccounts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAccounts.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.financeAccounts.deletedAt)))
            .orderBy((0, drizzle_orm_1.desc)(db_1.financeAccounts.createdAt));
    }
    async findAccountById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.financeAccounts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAccounts.id, id), (0, drizzle_orm_1.eq)(db_1.financeAccounts.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.financeAccounts.deletedAt)));
        return row ?? null;
    }
    async updateAccount(id, ownerId, data) {
        const [row] = await this.db.update(db_1.financeAccounts)
            .set({ ...data, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAccounts.id, id), (0, drizzle_orm_1.eq)(db_1.financeAccounts.ownerId, ownerId)))
            .returning();
        return row ?? null;
    }
    async softDeleteAccount(id, ownerId) {
        await this.db.update(db_1.financeAccounts)
            .set({ deletedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAccounts.id, id), (0, drizzle_orm_1.eq)(db_1.financeAccounts.ownerId, ownerId)));
    }
    async createCategory(data) {
        const [row] = await this.db.insert(db_1.financeCategories).values(data).returning();
        return row;
    }
    async findCategoriesByOwner(ownerId) {
        return this.db.select().from(db_1.financeCategories)
            .where((0, drizzle_orm_1.eq)(db_1.financeCategories.ownerId, ownerId))
            .orderBy(db_1.financeCategories.name);
    }
    async createTransaction(data) {
        const [row] = await this.db.insert(db_1.financeTransactions).values(data).returning();
        return row;
    }
    async findTransactionsByAccount(accountId) {
        return this.db.select().from(db_1.financeTransactions)
            .where((0, drizzle_orm_1.eq)(db_1.financeTransactions.accountId, accountId))
            .orderBy((0, drizzle_orm_1.desc)(db_1.financeTransactions.date));
    }
    async findTransactionsByOwner(ownerId) {
        return this.db.select({
            id: db_1.financeTransactions.id,
            accountId: db_1.financeTransactions.accountId,
            date: db_1.financeTransactions.date,
            amount: db_1.financeTransactions.amount,
            description: db_1.financeTransactions.description,
            categoryId: db_1.financeTransactions.categoryId,
            payee: db_1.financeTransactions.payee,
            createdAt: db_1.financeTransactions.createdAt,
            accountName: db_1.financeAccounts.name,
        })
            .from(db_1.financeTransactions)
            .innerJoin(db_1.financeAccounts, (0, drizzle_orm_1.eq)(db_1.financeTransactions.accountId, db_1.financeAccounts.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAccounts.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.financeAccounts.deletedAt)))
            .orderBy((0, drizzle_orm_1.desc)(db_1.financeTransactions.date));
    }
    async findTransactionById(id) {
        const [row] = await this.db.select().from(db_1.financeTransactions).where((0, drizzle_orm_1.eq)(db_1.financeTransactions.id, id));
        return row ?? null;
    }
    async deleteTransaction(id) {
        await this.db.delete(db_1.financeTransactions).where((0, drizzle_orm_1.eq)(db_1.financeTransactions.id, id));
    }
    async createBudget(data) {
        const [row] = await this.db.insert(db_1.financeBudgets).values(data).returning();
        return row;
    }
    async findBudgetsByOwner(ownerId) {
        return this.db.select().from(db_1.financeBudgets)
            .where((0, drizzle_orm_1.eq)(db_1.financeBudgets.ownerId, ownerId))
            .orderBy(db_1.financeBudgets.startDate);
    }
    async findBudgetById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.financeBudgets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeBudgets.id, id), (0, drizzle_orm_1.eq)(db_1.financeBudgets.ownerId, ownerId)));
        return row ?? null;
    }
    async updateBudget(id, ownerId, data) {
        const [row] = await this.db.update(db_1.financeBudgets)
            .set({ ...data, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeBudgets.id, id), (0, drizzle_orm_1.eq)(db_1.financeBudgets.ownerId, ownerId)))
            .returning();
        return row ?? null;
    }
    async getSpentByCategory(ownerId, startDate, endDate) {
        const rows = await this.db.select({
            categoryId: db_1.financeTransactions.categoryId,
            total: (0, drizzle_orm_1.sum)(db_1.financeTransactions.amount),
        })
            .from(db_1.financeTransactions)
            .innerJoin(db_1.financeAccounts, (0, drizzle_orm_1.eq)(db_1.financeTransactions.accountId, db_1.financeAccounts.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAccounts.ownerId, ownerId), (0, drizzle_orm_1.sql) `${db_1.financeTransactions.date} >= ${startDate}`, (0, drizzle_orm_1.sql) `${db_1.financeTransactions.date} < ${endDate}`))
            .groupBy(db_1.financeTransactions.categoryId);
        return rows;
    }
    async createSavingsGoal(data) {
        const [row] = await this.db.insert(db_1.financeSavingsGoals).values(data).returning();
        return row;
    }
    async findSavingsGoalsByOwner(ownerId) {
        return this.db.select().from(db_1.financeSavingsGoals)
            .where((0, drizzle_orm_1.eq)(db_1.financeSavingsGoals.ownerId, ownerId))
            .orderBy((0, drizzle_orm_1.desc)(db_1.financeSavingsGoals.createdAt));
    }
    async findSavingsGoalById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.financeSavingsGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeSavingsGoals.id, id), (0, drizzle_orm_1.eq)(db_1.financeSavingsGoals.ownerId, ownerId)));
        return row ?? null;
    }
    async updateSavingsGoal(id, ownerId, data) {
        const [row] = await this.db.update(db_1.financeSavingsGoals)
            .set({ ...data, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeSavingsGoals.id, id), (0, drizzle_orm_1.eq)(db_1.financeSavingsGoals.ownerId, ownerId)))
            .returning();
        return row ?? null;
    }
    async createAsset(data) {
        const [row] = await this.db.insert(db_1.financeAssets).values(data).returning();
        return row;
    }
    async findAssetsByOwner(ownerId) {
        return this.db.select().from(db_1.financeAssets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAssets.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.financeAssets.deletedAt)))
            .orderBy(db_1.financeAssets.name);
    }
    async findAssetById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.financeAssets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAssets.id, id), (0, drizzle_orm_1.eq)(db_1.financeAssets.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.financeAssets.deletedAt)));
        return row ?? null;
    }
    async updateAsset(id, ownerId, data) {
        const [row] = await this.db.update(db_1.financeAssets)
            .set({ ...data, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.financeAssets.id, id), (0, drizzle_orm_1.eq)(db_1.financeAssets.ownerId, ownerId)))
            .returning();
        return row ?? null;
    }
    async getNetWorth(ownerId) {
        const accounts = await this.findAccountsByOwner(ownerId);
        return accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
    }
};
exports.FinanceRepository = FinanceRepository;
exports.FinanceRepository = FinanceRepository = __decorate([
    __param(0, (0, common_1.Inject)(db_1.DbService)),
    __metadata("design:paramtypes", [db_1.DbService])
], FinanceRepository);
//# sourceMappingURL=finance.repository.js.map