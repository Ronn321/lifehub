import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { FinanceService } from '../services/finance.service';
import {
  createAccountSchema, updateAccountSchema,
  createCategorySchema,
  createTransactionSchema,
  createBudgetSchema, updateBudgetSchema,
  createSavingsGoalSchema, updateSavingsGoalSchema, contributeSchema,
  createAssetSchema, updateAssetSchema,
} from '../dtos/finance.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('finance')
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly finance: FinanceService) {}

  @Get('net-worth')
  @RequirePermission('finance', 'read')
  async getNetWorth(@CurrentUser() user: JwtPayload) {
    return this.finance.getNetWorth(user.sub);
  }

  @Post('accounts')
  @RequirePermission('finance', 'create')
  async createAccount(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createAccountSchema.parse(body);
    return this.finance.createAccount(user.sub, dto);
  }

  @Get('accounts')
  @RequirePermission('finance', 'read')
  async listAccounts(@CurrentUser() user: JwtPayload) {
    return this.finance.listAccounts(user.sub);
  }

  @Get('accounts/:id')
  @RequirePermission('finance', 'read')
  async getAccount(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.finance.getAccount(user.sub, id);
  }

  @Put('accounts/:id')
  @RequirePermission('finance', 'update')
  async updateAccount(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateAccountSchema.parse(body);
    return this.finance.updateAccount(user.sub, id, dto);
  }

  @Delete('accounts/:id')
  @HttpCode(204)
  @RequirePermission('finance', 'delete')
  async deleteAccount(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.finance.deleteAccount(user.sub, id);
  }

  @Post('categories')
  @RequirePermission('finance', 'create')
  async createCategory(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createCategorySchema.parse(body);
    return this.finance.createCategory(user.sub, dto);
  }

  @Get('categories')
  @RequirePermission('finance', 'read')
  async listCategories(@CurrentUser() user: JwtPayload) {
    return this.finance.listCategories(user.sub);
  }

  @Post('transactions')
  @RequirePermission('finance', 'create')
  async createTransaction(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createTransactionSchema.parse(body);
    return this.finance.createTransaction(user.sub, dto);
  }

  @Get('transactions')
  @RequirePermission('finance', 'read')
  async listTransactions(@Query('accountId') accountId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.finance.listTransactions(user.sub, accountId);
  }

  @Delete('transactions/:id')
  @HttpCode(204)
  @RequirePermission('finance', 'delete')
  async deleteTransaction(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.finance.deleteTransaction(user.sub, id);
  }

  @Post('budgets')
  @RequirePermission('finance', 'create')
  async createBudget(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createBudgetSchema.parse(body);
    return this.finance.createBudget(user.sub, dto);
  }

  @Get('budgets')
  @RequirePermission('finance', 'read')
  async listBudgets(@CurrentUser() user: JwtPayload) {
    return this.finance.listBudgets(user.sub);
  }

  @Put('budgets/:id')
  @RequirePermission('finance', 'update')
  async updateBudget(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateBudgetSchema.parse(body);
    return this.finance.updateBudget(user.sub, id, dto);
  }

  @Post('savings-goals')
  @RequirePermission('finance', 'create')
  async createSavingsGoal(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createSavingsGoalSchema.parse(body);
    return this.finance.createSavingsGoal(user.sub, dto);
  }

  @Get('savings-goals')
  @RequirePermission('finance', 'read')
  async listSavingsGoals(@CurrentUser() user: JwtPayload) {
    return this.finance.listSavingsGoals(user.sub);
  }

  @Put('savings-goals/:id')
  @RequirePermission('finance', 'update')
  async updateSavingsGoal(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateSavingsGoalSchema.parse(body);
    return this.finance.updateSavingsGoal(user.sub, id, dto);
  }

  @Post('savings-goals/:id/contribute')
  @RequirePermission('finance', 'update')
  async contributeToGoal(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = contributeSchema.parse(body);
    return this.finance.contributeToGoal(user.sub, id, dto);
  }

  @Post('assets')
  @RequirePermission('finance', 'create')
  async createAsset(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createAssetSchema.parse(body);
    return this.finance.createAsset(user.sub, dto);
  }

  @Get('assets')
  @RequirePermission('finance', 'read')
  async listAssets(@CurrentUser() user: JwtPayload) {
    return this.finance.listAssets(user.sub);
  }

  @Put('assets/:id')
  @RequirePermission('finance', 'update')
  async updateAsset(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateAssetSchema.parse(body);
    return this.finance.updateAsset(user.sub, id, dto);
  }
}
