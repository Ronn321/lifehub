import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc, sum } from 'drizzle-orm';
import { DbService, financeAccounts, financeCategories, financeTransactions, financeBudgets, financeSavingsGoals, financeAssets, financeAssetPrices, type Db } from '@lifehub/db';

export class FinanceRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async createAccount(data: { ownerId: string; name: string; type: string; currency: string; balance: string }) {
    const [row] = await this.db.insert(financeAccounts).values(data).returning();
    return row;
  }

  async findAccountsByOwner(ownerId: string) {
    return this.db.select().from(financeAccounts)
      .where(and(eq(financeAccounts.ownerId, ownerId), isNull(financeAccounts.deletedAt)))
      .orderBy(desc(financeAccounts.createdAt));
  }

  async findAccountById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(financeAccounts)
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.ownerId, ownerId), isNull(financeAccounts.deletedAt)));
    return row ?? null;
  }

  async updateAccount(id: string, ownerId: string, data: Record<string, unknown>) {
    const [row] = await this.db.update(financeAccounts)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDeleteAccount(id: string, ownerId: string) {
    await this.db.update(financeAccounts)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.ownerId, ownerId)));
  }

  async createCategory(data: { ownerId: string; name: string; icon?: string; color?: string; parentId?: string | null }) {
    const [row] = await this.db.insert(financeCategories).values(data).returning();
    return row;
  }

  async findCategoriesByOwner(ownerId: string) {
    return this.db.select().from(financeCategories)
      .where(eq(financeCategories.ownerId, ownerId))
      .orderBy(financeCategories.name);
  }

  async createTransaction(data: { accountId: string; date: string; amount: string; description: string; categoryId?: string | null; payee?: string }) {
    const [row] = await this.db.insert(financeTransactions).values(data).returning();
    return row;
  }

  async findTransactionsByAccount(accountId: string) {
    return this.db.select().from(financeTransactions)
      .where(eq(financeTransactions.accountId, accountId))
      .orderBy(desc(financeTransactions.date));
  }

  async findTransactionsByOwner(ownerId: string) {
    return this.db.select({
      id: financeTransactions.id,
      accountId: financeTransactions.accountId,
      date: financeTransactions.date,
      amount: financeTransactions.amount,
      description: financeTransactions.description,
      categoryId: financeTransactions.categoryId,
      payee: financeTransactions.payee,
      createdAt: financeTransactions.createdAt,
      accountName: financeAccounts.name,
    })
      .from(financeTransactions)
      .innerJoin(financeAccounts, eq(financeTransactions.accountId, financeAccounts.id))
      .where(and(eq(financeAccounts.ownerId, ownerId), isNull(financeAccounts.deletedAt)))
      .orderBy(desc(financeTransactions.date));
  }

  async findTransactionById(id: string) {
    const [row] = await this.db.select().from(financeTransactions).where(eq(financeTransactions.id, id));
    return row ?? null;
  }

  async deleteTransaction(id: string) {
    await this.db.delete(financeTransactions).where(eq(financeTransactions.id, id));
  }

  async createBudget(data: { ownerId: string; categoryId?: string | null; amount: string; period: string; startDate: string; endDate?: string | null }) {
    const [row] = await this.db.insert(financeBudgets).values(data).returning();
    return row;
  }

  async findBudgetsByOwner(ownerId: string) {
    return this.db.select().from(financeBudgets)
      .where(eq(financeBudgets.ownerId, ownerId))
      .orderBy(financeBudgets.startDate);
  }

  async findBudgetById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(financeBudgets)
      .where(and(eq(financeBudgets.id, id), eq(financeBudgets.ownerId, ownerId)));
    return row ?? null;
  }

  async updateBudget(id: string, ownerId: string, data: Record<string, unknown>) {
    const [row] = await this.db.update(financeBudgets)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(financeBudgets.id, id), eq(financeBudgets.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async getSpentByCategory(ownerId: string, startDate: string, endDate: string) {
    const rows = await this.db.select({
      categoryId: financeTransactions.categoryId,
      total: sum(financeTransactions.amount),
    })
      .from(financeTransactions)
      .innerJoin(financeAccounts, eq(financeTransactions.accountId, financeAccounts.id))
      .where(
        and(
          eq(financeAccounts.ownerId, ownerId),
          sql`${financeTransactions.date} >= ${startDate}`,
          sql`${financeTransactions.date} < ${endDate}`,
        )
      )
      .groupBy(financeTransactions.categoryId);
    return rows;
  }

  async createSavingsGoal(data: { ownerId: string; name: string; targetAmount: string; currentAmount: string; jarAccountId?: string | null; deadline?: string | null }) {
    const [row] = await this.db.insert(financeSavingsGoals).values(data).returning();
    return row;
  }

  async findSavingsGoalsByOwner(ownerId: string) {
    return this.db.select().from(financeSavingsGoals)
      .where(eq(financeSavingsGoals.ownerId, ownerId))
      .orderBy(desc(financeSavingsGoals.createdAt));
  }

  async findSavingsGoalById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(financeSavingsGoals)
      .where(and(eq(financeSavingsGoals.id, id), eq(financeSavingsGoals.ownerId, ownerId)));
    return row ?? null;
  }

  async updateSavingsGoal(id: string, ownerId: string, data: Record<string, unknown>) {
    const [row] = await this.db.update(financeSavingsGoals)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(financeSavingsGoals.id, id), eq(financeSavingsGoals.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async createAsset(data: { ownerId: string; name: string; type: string; quantity: string; currentPrice: string; currency: string }) {
    const [row] = await this.db.insert(financeAssets).values(data).returning();
    return row;
  }

  async findAssetsByOwner(ownerId: string) {
    return this.db.select().from(financeAssets)
      .where(and(eq(financeAssets.ownerId, ownerId), isNull(financeAssets.deletedAt)))
      .orderBy(financeAssets.name);
  }

  async findAssetById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(financeAssets)
      .where(and(eq(financeAssets.id, id), eq(financeAssets.ownerId, ownerId), isNull(financeAssets.deletedAt)));
    return row ?? null;
  }

  async updateAsset(id: string, ownerId: string, data: Record<string, unknown>) {
    const [row] = await this.db.update(financeAssets)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(financeAssets.id, id), eq(financeAssets.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async getNetWorth(ownerId: string) {
    const accounts = await this.findAccountsByOwner(ownerId);
    return accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
  }
}
