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
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_1 = require("@lifehub/auth");
const permissions_1 = require("@lifehub/permissions");
const users_repository_js_1 = require("../repositories/users.repository.js");
const users_service_js_1 = require("../services/users.service.js");
const zod_1 = require("zod");
const adminCreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(255),
    password: zod_1.z.string().min(8).max(200),
    displayName: zod_1.z.string().min(1).max(100).optional(),
    roleIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
const createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
});
const updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
});
const setRolePermissionsSchema = zod_1.z.object({
    permissionIds: zod_1.z.array(zod_1.z.string().uuid()),
});
let RolesController = class RolesController {
    repo;
    users;
    constructor(repo, users) {
        this.repo = repo;
        this.users = users;
    }
    // ============== Roles ==============
    async listRoles() {
        return this.repo.findAllRoles();
    }
    async getRole(id) {
        const role = await this.repo.findRoleById(id);
        if (!role)
            return { message: 'Role not found', statusCode: 404 };
        return role;
    }
    async createRole(body) {
        const dto = createRoleSchema.parse(body);
        return this.repo.createRole({ name: dto.name.trim(), description: dto.description });
    }
    async updateRole(id, body) {
        const role = await this.repo.findRoleById(id);
        if (!role)
            return { message: 'Role not found', statusCode: 404 };
        const dto = updateRoleSchema.parse(body);
        if (role.isSystem && dto.name && dto.name !== role.name) {
            return { message: 'Cannot rename system roles', statusCode: 400 };
        }
        return this.repo.updateRole(id, { name: dto.name, description: dto.description });
    }
    async deleteRole(id) {
        const role = await this.repo.findRoleById(id);
        if (!role)
            return { message: 'Role not found', statusCode: 404 };
        if (role.isSystem)
            return { message: 'Cannot delete system roles', statusCode: 400 };
        await this.repo.deleteRole(id);
    }
    // ============== Permissions ==============
    async listPermissions() {
        return this.repo.findAllPermissions();
    }
    async getRolePermissions(id) {
        return this.repo.findPermissionsByRoleId(id);
    }
    async setRolePermissions(id, body) {
        const role = await this.repo.findRoleById(id);
        if (!role)
            return { message: 'Role not found', statusCode: 404 };
        const dto = setRolePermissionsSchema.parse(body);
        await this.repo.setRolePermissions(id, dto.permissionIds);
        return this.repo.findPermissionsByRoleId(id);
    }
    // ============== User Role Assignment ==============
    async getUserRoles(userId) {
        return this.repo.findRolesByUserId(userId);
    }
    async assignRoleToUser(userId, roleId, user) {
        await this.repo.assignRoleToUser(userId, roleId, user.sub);
        return this.repo.findRolesByUserId(userId);
    }
    async removeRoleFromUser(userId, roleId) {
        await this.repo.removeRoleFromUser(userId, roleId);
        return this.repo.findRolesByUserId(userId);
    }
    // ============== Admin User Management ==============
    async adminCreateUser(body, user) {
        const dto = adminCreateUserSchema.parse(body);
        return this.users.adminCreateUser({
            email: dto.email.trim(),
            password: dto.password,
            displayName: dto.displayName?.trim() || (dto.email.split('@')[0] ?? ''),
            roleIds: dto.roleIds,
        }, user.sub);
    }
};
exports.RolesController = RolesController;
__decorate([
    (0, common_1.Get)('roles'),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List all roles' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "listRoles", null);
__decorate([
    (0, common_1.Get)('roles/:id'),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single role by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "getRole", null);
__decorate([
    (0, common_1.Post)('roles'),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new custom role' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "createRole", null);
__decorate([
    (0, common_1.Put)('roles/:id'),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a role (name or description)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)('roles/:id'),
    (0, common_1.HttpCode)(204),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a custom role (system roles cannot be deleted)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "deleteRole", null);
__decorate([
    (0, common_1.Get)('permissions'),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List all available permissions' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "listPermissions", null);
__decorate([
    (0, common_1.Get)('roles/:id/permissions'),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get permissions assigned to a role' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "getRolePermissions", null);
__decorate([
    (0, common_1.Put)('roles/:id/permissions'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Replace all permissions for a role' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "setRolePermissions", null);
__decorate([
    (0, common_1.Get)('users/:userId/roles'),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get roles assigned to a user' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "getUserRoles", null);
__decorate([
    (0, common_1.Post)('users/:userId/roles/:roleId'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a role to a user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('roleId')),
    __param(2, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "assignRoleToUser", null);
__decorate([
    (0, common_1.Delete)('users/:userId/roles/:roleId'),
    (0, common_1.HttpCode)(200),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a role from a user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('roleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "removeRoleFromUser", null);
__decorate([
    (0, common_1.Post)('users/admin-create'),
    (0, common_1.HttpCode)(201),
    (0, permissions_1.RequirePermission)('users', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a user as admin (with optional role assignment)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "adminCreateUser", null);
exports.RolesController = RolesController = __decorate([
    (0, swagger_1.ApiTags)('roles'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_1.JwtGuard, permissions_1.PermissionGuard),
    (0, common_1.Controller)(),
    __param(0, (0, common_1.Inject)(users_repository_js_1.UsersRepository)),
    __param(1, (0, common_1.Inject)(users_service_js_1.UsersService)),
    __metadata("design:paramtypes", [users_repository_js_1.UsersRepository,
        users_service_js_1.UsersService])
], RolesController);
//# sourceMappingURL=roles.controller.js.map