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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("@lifehub/auth");
const permissions_1 = require("@lifehub/permissions");
const finance_service_1 = require("../services/finance.service");
const finance_dto_1 = require("../dtos/finance.dto");
let FinanceController = class FinanceController {
    finance;
    constructor(finance) {
        this.finance = finance;
    }
    async getNetWorth(user) {
        return this.finance.getNetWorth(user.sub);
    }
    async createAccount(body, user) {
        const dto = finance_dto_1.createAccountSchema.parse(body);
        return this.finance.createAccount(user.sub, dto);
    }
    async listAccounts(user) {
        return this.finance.listAccounts(user.sub);
    }
    async getAccount(id, user) {
        return this.finance.getAccount(user.sub, id);
    }
    async updateAccount(id, body, user) {
        const dto = finance_dto_1.updateAccountSchema.parse(body);
        return this.finance.updateAccount(user.sub, id, dto);
    }
    async deleteAccount(id, user) {
        await this.finance.deleteAccount(user.sub, id);
    }
    async createCategory(body, user) {
        const dto = finance_dto_1.createCategorySchema.parse(body);
        return this.finance.createCategory(user.sub, dto);
    }
    async listCategories(user) {
        return this.finance.listCategories(user.sub);
    }
    async createTransaction(body, user) {
        const dto = finance_dto_1.createTransactionSchema.parse(body);
        return this.finance.createTransaction(user.sub, dto);
    }
    async listTransactions(accountId, user) {
        return this.finance.listTransactions(user.sub, accountId);
    }
    async deleteTransaction(id, user) {
        await this.finance.deleteTransaction(user.sub, id);
    }
    async createBudget(body, user) {
        const dto = finance_dto_1.createBudgetSchema.parse(body);
        return this.finance.createBudget(user.sub, dto);
    }
    async listBudgets(user) {
        return this.finance.listBudgets(user.sub);
    }
    async updateBudget(id, body, user) {
        const dto = finance_dto_1.updateBudgetSchema.parse(body);
        return this.finance.updateBudget(user.sub, id, dto);
    }
    async createSavingsGoal(body, user) {
        const dto = finance_dto_1.createSavingsGoalSchema.parse(body);
        return this.finance.createSavingsGoal(user.sub, dto);
    }
    async listSavingsGoals(user) {
        return this.finance.listSavingsGoals(user.sub);
    }
    async updateSavingsGoal(id, body, user) {
        const dto = finance_dto_1.updateSavingsGoalSchema.parse(body);
        return this.finance.updateSavingsGoal(user.sub, id, dto);
    }
    async contributeToGoal(id, body, user) {
        const dto = finance_dto_1.contributeSchema.parse(body);
        return this.finance.contributeToGoal(user.sub, id, dto);
    }
    async createAsset(body, user) {
        const dto = finance_dto_1.createAssetSchema.parse(body);
        return this.finance.createAsset(user.sub, dto);
    }
    async listAssets(user) {
        return this.finance.listAssets(user.sub);
    }
    async updateAsset(id, body, user) {
        const dto = finance_dto_1.updateAssetSchema.parse(body);
        return this.finance.updateAsset(user.sub, id, dto);
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('net-worth'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getNetWorth", null);
__decorate([
    (0, common_1.Post)('accounts'),
    (0, permissions_1.RequirePermission)('finance', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createAccount", null);
__decorate([
    (0, common_1.Get)('accounts'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listAccounts", null);
__decorate([
    (0, common_1.Get)('accounts/:id'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getAccount", null);
__decorate([
    (0, common_1.Put)('accounts/:id'),
    (0, permissions_1.RequirePermission)('finance', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateAccount", null);
__decorate([
    (0, common_1.Delete)('accounts/:id'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('finance', 'delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, permissions_1.RequirePermission)('finance', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, permissions_1.RequirePermission)('finance', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listTransactions", null);
__decorate([
    (0, common_1.Delete)('transactions/:id'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('finance', 'delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteTransaction", null);
__decorate([
    (0, common_1.Post)('budgets'),
    (0, permissions_1.RequirePermission)('finance', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createBudget", null);
__decorate([
    (0, common_1.Get)('budgets'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listBudgets", null);
__decorate([
    (0, common_1.Put)('budgets/:id'),
    (0, permissions_1.RequirePermission)('finance', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateBudget", null);
__decorate([
    (0, common_1.Post)('savings-goals'),
    (0, permissions_1.RequirePermission)('finance', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createSavingsGoal", null);
__decorate([
    (0, common_1.Get)('savings-goals'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listSavingsGoals", null);
__decorate([
    (0, common_1.Put)('savings-goals/:id'),
    (0, permissions_1.RequirePermission)('finance', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateSavingsGoal", null);
__decorate([
    (0, common_1.Post)('savings-goals/:id/contribute'),
    (0, permissions_1.RequirePermission)('finance', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "contributeToGoal", null);
__decorate([
    (0, common_1.Post)('assets'),
    (0, permissions_1.RequirePermission)('finance', 'create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "createAsset", null);
__decorate([
    (0, common_1.Get)('assets'),
    (0, permissions_1.RequirePermission)('finance', 'read'),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "listAssets", null);
__decorate([
    (0, common_1.Put)('assets/:id'),
    (0, permissions_1.RequirePermission)('finance', 'update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "updateAsset", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.UseGuards)(auth_1.JwtGuard, permissions_1.PermissionGuard),
    (0, common_1.Controller)('finance'),
    __param(0, (0, common_1.Inject)(finance_service_1.FinanceService)),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map