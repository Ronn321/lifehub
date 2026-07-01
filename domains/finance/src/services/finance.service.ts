import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventsService, createEventType } from '@lifehub/events';
import { FinanceRepository } from '../repositories/finance.repository';
import type { CreateAccountInput, UpdateAccountInput } from '../dtos/finance.dto';
import type { CreateCategoryInput, CreateTransactionInput } from '../dtos/finance.dto';
import type { CreateBudgetInput, UpdateBudgetInput, CreateSavingsGoalInput, UpdateSavingsGoalInput, ContributeInput } from '../dtos/finance.dto';
import type { CreateAssetInput, UpdateAssetInput } from '../dtos/finance.dto';

export const TransactionCreated = createEventType<{ accountId: string; transactionId: string; amount: string; description: string }>('finance.transaction.created');
export const BudgetExceeded = createEventType<{ budgetId: string; categoryId: string | null; amount: string; spent: string }>('finance.budget.exceeded');

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  constructor(
    private readonly repo: FinanceRepository,
    private readonly events: EventsService,
  ) {}

  async createAccount(ownerId: string, input: CreateAccountInput) {
    return this.repo.createAccount({ ...input, ownerId, currency: input.currency ?? 'EUR', balance: input.balance ?? '0' });
  }

  async listAccounts(ownerId: string) {
    return this.repo.findAccountsByOwner(ownerId);
  }

  async getAccount(ownerId: string, id: string) {
    const account = await this.repo.findAccountById(id, ownerId);
    if (!account) throw new NotFoundException('Konto nicht gefunden');
    return account;
  }

  async updateAccount(ownerId: string, id: string, input: UpdateAccountInput) {
    const account = await this.repo.findAccountById(id, ownerId);
    if (!account) throw new NotFoundException('Konto nicht gefunden');
    return this.repo.updateAccount(id, ownerId, input as Record<string, unknown>);
  }

  async deleteAccount(ownerId: string, id: string) {
    const account = await this.repo.findAccountById(id, ownerId);
    if (!account) throw new NotFoundException('Konto nicht gefunden');
    await this.repo.softDeleteAccount(id, ownerId);
  }

  async createCategory(ownerId: string, input: CreateCategoryInput) {
    return this.repo.createCategory({ ...input, ownerId, icon: input.icon, color: input.color, parentId: input.parentId ?? null });
  }

  async listCategories(ownerId: string) {
    return this.repo.findCategoriesByOwner(ownerId);
  }

  async createTransaction(ownerId: string, input: CreateTransactionInput) {
    const account = await this.repo.findAccountById(input.accountId, ownerId);
    if (!account) throw new NotFoundException('Konto nicht gefunden');
    const transaction = await this.repo.createTransaction(input);
    if (!transaction) throw new Error('Transaktion konnte nicht erstellt werden');
    const amountNum = parseFloat(input.amount);
    const newBalance = (parseFloat(account.balance) + amountNum).toFixed(2);
    await this.repo.updateAccount(input.accountId, ownerId, { balance: newBalance });
    await this.events.emit(TransactionCreated.create(transaction.id, {
      accountId: input.accountId,
      transactionId: transaction.id,
      amount: input.amount,
      description: input.description,
    }));
    return transaction;
  }

  async listTransactions(ownerId: string, accountId?: string) {
    if (accountId) {
      const account = await this.repo.findAccountById(accountId, ownerId);
      if (!account) throw new NotFoundException('Konto nicht gefunden');
      return this.repo.findTransactionsByAccount(accountId);
    }
    return this.repo.findTransactionsByOwner(ownerId);
  }

  async deleteTransaction(ownerId: string, id: string) {
    const transaction = await this.repo.findTransactionById(id);
    if (!transaction) throw new NotFoundException('Transaktion nicht gefunden');
    const account = await this.repo.findAccountById(transaction.accountId, ownerId);
    if (!account) throw new NotFoundException('Konto nicht gefunden');
    const amountNum = parseFloat(transaction.amount);
    const newBalance = (parseFloat(account.balance) - amountNum).toFixed(2);
    await this.repo.updateAccount(transaction.accountId, ownerId, { balance: newBalance });
    await this.repo.deleteTransaction(id);
  }

  async createBudget(ownerId: string, input: CreateBudgetInput) {
    return this.repo.createBudget({ ...input, ownerId, categoryId: input.categoryId ?? null, endDate: input.endDate ?? null });
  }

  private toDateString(d: string | null | undefined): string {
    return d ?? new Date().toISOString().slice(0, 10);
  }

  async listBudgets(ownerId: string) {
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

  async updateBudget(ownerId: string, id: string, input: UpdateBudgetInput) {
    const budget = await this.repo.findBudgetById(id, ownerId);
    if (!budget) throw new NotFoundException('Budget nicht gefunden');
    return this.repo.updateBudget(id, ownerId, input as Record<string, unknown>);
  }

  async createSavingsGoal(ownerId: string, input: CreateSavingsGoalInput) {
    return this.repo.createSavingsGoal({ ...input, ownerId, jarAccountId: input.jarAccountId ?? null, deadline: input.deadline ?? null });
  }

  async listSavingsGoals(ownerId: string) {
    return this.repo.findSavingsGoalsByOwner(ownerId);
  }

  async updateSavingsGoal(ownerId: string, id: string, input: UpdateSavingsGoalInput) {
    const goal = await this.repo.findSavingsGoalById(id, ownerId);
    if (!goal) throw new NotFoundException('Sparziel nicht gefunden');
    return this.repo.updateSavingsGoal(id, ownerId, input as Record<string, unknown>);
  }

  async contributeToGoal(ownerId: string, id: string, input: ContributeInput) {
    const goal = await this.repo.findSavingsGoalById(id, ownerId);
    if (!goal) throw new NotFoundException('Sparziel nicht gefunden');
    const newAmount = (parseFloat(goal.currentAmount) + parseFloat(input.amount)).toFixed(2);
    return this.repo.updateSavingsGoal(id, ownerId, { currentAmount: newAmount });
  }

  async createAsset(ownerId: string, input: CreateAssetInput) {
    return this.repo.createAsset({ ...input, ownerId });
  }

  async listAssets(ownerId: string) {
    return this.repo.findAssetsByOwner(ownerId);
  }

  async updateAsset(ownerId: string, id: string, input: UpdateAssetInput) {
    const asset = await this.repo.findAssetById(id, ownerId);
    if (!asset) throw new NotFoundException('Wertanlage nicht gefunden');
    return this.repo.updateAsset(id, ownerId, input as Record<string, unknown>);
  }

  async getNetWorth(ownerId: string) {
    const accountBalance = await this.repo.getNetWorth(ownerId);
    const assets = await this.repo.findAssetsByOwner(ownerId);
    const assetValue = assets.reduce((sum, a) => sum + (parseFloat(a.quantity) * parseFloat(a.currentPrice)), 0);
    return { accountBalance: accountBalance.toFixed(2), assetValue: assetValue.toFixed(2), netWorth: (accountBalance + assetValue).toFixed(2) };
  }
}
