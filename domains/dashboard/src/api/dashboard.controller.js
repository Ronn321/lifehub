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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_1 = require("@lifehub/auth");
const permissions_1 = require("@lifehub/permissions");
const dashboard_service_1 = require("../services/dashboard.service");
const dashboard_dto_1 = require("../dtos/dashboard.dto");
const zod_1 = require("zod");
let DashboardController = class DashboardController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async getLayout(user) {
        return this.svc.getLayout(user.sub);
    }
    async saveLayout(user, body) {
        let parsed;
        try {
            parsed = dashboard_dto_1.layoutSchema.parse(body);
        }
        catch (e) {
            if (e instanceof zod_1.ZodError)
                throw new common_1.BadRequestException(e.errors);
            throw e;
        }
        return this.svc.saveLayout(user.sub, parsed);
    }
    async resetLayout(user) {
        return this.svc.resetLayout(user.sub);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('layout'),
    (0, permissions_1.RequirePermission)('dashboard', 'read'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard widget layout for current user' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getLayout", null);
__decorate([
    (0, common_1.Put)('layout'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('dashboard', 'update'),
    (0, swagger_1.ApiOperation)({ summary: 'Save dashboard widget layout' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "saveLayout", null);
__decorate([
    (0, common_1.Post)('layout/reset'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('dashboard', 'update'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset dashboard layout to defaults' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "resetLayout", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_1.JwtGuard, permissions_1.PermissionGuard),
    (0, common_1.Controller)('dashboard'),
    __param(0, (0, common_1.Inject)(dashboard_service_1.DashboardService)),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map