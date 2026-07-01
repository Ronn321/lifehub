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
exports.UsersController = exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const auth_1 = require("@lifehub/auth");
const permissions_1 = require("@lifehub/permissions");
const auth_dto_js_1 = require("../dtos/auth.dto.js");
const users_service_js_1 = require("../services/users.service.js");
let AuthController = class AuthController {
    users;
    constructor(users) {
        this.users = users;
    }
    async login(body, req) {
        const dto = auth_dto_js_1.loginSchema.parse(body);
        return this.users.login(dto, this.metaFromReq(req));
    }
    async register(body, req) {
        const dto = auth_dto_js_1.registerSchema.parse(body);
        return this.users.register(dto);
    }
    async refresh(body, req) {
        const dto = auth_dto_js_1.refreshSchema.parse(body);
        return this.users.refresh(dto.refreshToken, this.metaFromReq(req));
    }
    async logout(body) {
        const dto = auth_dto_js_1.refreshSchema.parse(body);
        await this.users.logout(dto.refreshToken);
    }
    metaFromReq(req) {
        return {
            userAgent: req.headers['user-agent'] ?? undefined,
            ipAddress: (req.ip ?? req.socket.remoteAddress ?? undefined),
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 1000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Login with email + password, returns access + refresh tokens' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(201),
    (0, throttler_1.Throttle)({ default: { limit: 2, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user (rate-limited)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Exchange a refresh token for a new access + refresh pair' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke the current refresh token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __param(0, (0, common_1.Inject)(users_service_js_1.UsersService)),
    __metadata("design:paramtypes", [users_service_js_1.UsersService])
], AuthController);
let UsersController = class UsersController {
    users;
    constructor(users) {
        this.users = users;
    }
    async me(user) {
        return this.users.getProfile(user.sub);
    }
    async updateMe(user, body) {
        const dto = auth_dto_js_1.updateUserSchema.parse(body);
        return this.users.updateProfile(user.sub, dto);
    }
    async changePassword(user, body) {
        const dto = auth_dto_js_1.changePasswordSchema.parse(body);
        await this.users.changePassword(user.sub, dto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, permissions_1.RequirePermission)('users', 'read'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile + roles' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.Put)('me'),
    (0, permissions_1.RequirePermission)('users', 'update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('me/password'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('users', 'update'),
    (0, swagger_1.ApiOperation)({ summary: 'Change current user password' }),
    __param(0, (0, auth_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_1.JwtGuard, permissions_1.PermissionGuard),
    (0, common_1.Controller)('users'),
    __param(0, (0, common_1.Inject)(users_service_js_1.UsersService)),
    __metadata("design:paramtypes", [users_service_js_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map