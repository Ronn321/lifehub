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
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@lifehub/db");
// Plain class (no @Injectable — see DbService rationale).
// Registered via factory provider in UsersModule.
let UsersRepository = class UsersRepository {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    get db() {
        return this.dbService.db;
    }
    async findById(id) {
        const rows = await this.db
            .select()
            .from(db_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.users.id, id), (0, drizzle_orm_1.isNull)(db_1.users.deletedAt)))
            .limit(1);
        return rows[0] ?? null;
    }
    async findByEmail(email) {
        const rows = await this.db
            .select()
            .from(db_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `lower(${db_1.users.email}) = lower(${email})`, (0, drizzle_orm_1.isNull)(db_1.users.deletedAt)))
            .limit(1);
        return rows[0] ?? null;
    }
    async findRolesByUserId(userId) {
        return this.db
            .select({
            id: db_1.roles.id,
            name: db_1.roles.name,
            description: db_1.roles.description,
            isSystem: db_1.roles.isSystem,
        })
            .from(db_1.userRoles)
            .innerJoin(db_1.roles, (0, drizzle_orm_1.eq)(db_1.userRoles.roleId, db_1.roles.id))
            .where((0, drizzle_orm_1.eq)(db_1.userRoles.userId, userId));
    }
    async create(input) {
        const [row] = await this.db
            .insert(db_1.users)
            .values({
            email: input.email,
            displayName: input.displayName,
            passwordHash: input.passwordHash,
        })
            .returning();
        return row;
    }
    async updateLastLogin(id) {
        await this.db
            .update(db_1.users)
            .set({ lastLoginAt: new Date(), updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(db_1.users.id, id));
    }
    async updateProfile(id, patch) {
        const [row] = await this.db
            .update(db_1.users)
            .set({ ...patch, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.users.id, id), (0, drizzle_orm_1.isNull)(db_1.users.deletedAt)))
            .returning();
        return row ?? null;
    }
    async updatePasswordHash(id, passwordHash) {
        await this.db
            .update(db_1.users)
            .set({ passwordHash, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(db_1.users.id, id));
    }
    // --- Sessions ---
    async createSession(input) {
        const [row] = await this.db
            .insert(db_1.sessions)
            .values({
            id: crypto.randomUUID(),
            userId: input.userId,
            refreshHash: input.refreshHash,
            userAgent: input.userAgent ?? null,
            ipAddress: input.ipAddress ?? null,
            expiresAt: input.expiresAt,
        })
            .returning({ id: db_1.sessions.id });
        return row ?? { id: '' };
    }
    async findActiveSessionByHash(refreshHash) {
        const rows = await this.db
            .select({
            id: db_1.sessions.id,
            userId: db_1.sessions.userId,
            expiresAt: db_1.sessions.expiresAt,
            revokedAt: db_1.sessions.revokedAt,
        })
            .from(db_1.sessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.sessions.refreshHash, refreshHash), (0, drizzle_orm_1.isNull)(db_1.sessions.revokedAt)))
            .limit(1);
        return rows[0] ?? null;
    }
    async revokeSession(id) {
        await this.db
            .update(db_1.sessions)
            .set({ revokedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(db_1.sessions.id, id));
    }
    // --- Admin ---
    async listAll() {
        const rows = await this.db
            .select({
            id: db_1.users.id,
            email: db_1.users.email,
            displayName: db_1.users.displayName,
            avatarUrl: db_1.users.avatarUrl,
            isActive: db_1.users.isActive,
            isSystem: db_1.users.isSystem,
            locale: db_1.users.locale,
            timezone: db_1.users.timezone,
            theme: db_1.users.theme,
            brandColor: db_1.users.brandColor,
            lastLoginAt: db_1.users.lastLoginAt,
            createdAt: db_1.users.createdAt,
            updatedAt: db_1.users.updatedAt,
            deletedAt: db_1.users.deletedAt,
        })
            .from(db_1.users)
            .where((0, drizzle_orm_1.isNull)(db_1.users.deletedAt))
            .orderBy(db_1.users.createdAt);
        const result = [];
        for (const row of rows) {
            const r = row;
            const rls = await this.findRolesByUserId(r.id);
            result.push({ ...r, roles: rls });
        }
        return result;
    }
    async setActive(id, isActive) {
        await this.db
            .update(db_1.users)
            .set({ isActive, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(db_1.users.id, id));
    }
    // =================== Roles ===================
    async findAllRoles() {
        return this.db
            .select()
            .from(db_1.roles)
            .orderBy(db_1.roles.name);
    }
    async findRoleById(id) {
        const rows = await this.db
            .select()
            .from(db_1.roles)
            .where((0, drizzle_orm_1.eq)(db_1.roles.id, id))
            .limit(1);
        return rows[0] ?? null;
    }
    async createRole(input) {
        const [row] = await this.db
            .insert(db_1.roles)
            .values({
            name: input.name,
            description: input.description ?? null,
            isSystem: input.isSystem ?? false,
        })
            .returning();
        return row;
    }
    async updateRole(id, patch) {
        const updateData = { updatedAt: new Date() };
        if (patch.name !== undefined)
            updateData.name = patch.name;
        if (patch.description !== undefined)
            updateData.description = patch.description;
        const [row] = await this.db
            .update(db_1.roles)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(db_1.roles.id, id))
            .returning();
        return row ?? null;
    }
    async deleteRole(id) {
        await this.db.delete(db_1.roles).where((0, drizzle_orm_1.eq)(db_1.roles.id, id));
    }
    // =================== User-Role Assignment ===================
    async assignRoleToUser(userId, roleId, grantedBy) {
        await this.db
            .insert(db_1.userRoles)
            .values({
            userId,
            roleId,
            grantedBy: grantedBy ?? null,
        })
            .onConflictDoNothing();
    }
    async removeRoleFromUser(userId, roleId) {
        await this.db
            .delete(db_1.userRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(db_1.userRoles.roleId, roleId)));
    }
    // =================== Permissions ===================
    async findAllPermissions() {
        return this.db
            .select()
            .from(db_1.permissions)
            .orderBy(db_1.permissions.domain, db_1.permissions.action);
    }
    async findPermissionsByRoleId(roleId) {
        return this.db
            .select({
            id: db_1.permissions.id,
            domain: db_1.permissions.domain,
            action: db_1.permissions.action,
        })
            .from(db_1.rolePermissions)
            .innerJoin(db_1.permissions, (0, drizzle_orm_1.eq)(db_1.rolePermissions.permissionId, db_1.permissions.id))
            .where((0, drizzle_orm_1.eq)(db_1.rolePermissions.roleId, roleId))
            .orderBy(db_1.permissions.domain, db_1.permissions.action);
    }
    async assignPermissionToRole(roleId, permissionId) {
        await this.db
            .insert(db_1.rolePermissions)
            .values({ roleId, permissionId })
            .onConflictDoNothing();
    }
    async removePermissionFromRole(roleId, permissionId) {
        await this.db
            .delete(db_1.rolePermissions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.rolePermissions.roleId, roleId), (0, drizzle_orm_1.eq)(db_1.rolePermissions.permissionId, permissionId)));
    }
    async setRolePermissions(roleId, permissionIds) {
        // Replace all permissions for this role
        await this.db.transaction(async (tx) => {
            await tx.delete(db_1.rolePermissions).where((0, drizzle_orm_1.eq)(db_1.rolePermissions.roleId, roleId));
            if (permissionIds.length > 0) {
                await tx.insert(db_1.rolePermissions).values(permissionIds.map((pid) => ({ roleId, permissionId: pid })));
            }
        });
    }
    // =================== Admin User Management ===================
    async adminUpdateUser(id, patch) {
        const updateData = { updatedAt: new Date() };
        if (patch.displayName !== undefined)
            updateData.displayName = patch.displayName;
        if (patch.email !== undefined)
            updateData.email = patch.email;
        const [row] = await this.db
            .update(db_1.users)
            .set(updateData)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.users.id, id), (0, drizzle_orm_1.isNull)(db_1.users.deletedAt)))
            .returning();
        return row ?? null;
    }
    async adminDeleteUser(id) {
        await this.db
            .update(db_1.users)
            .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(db_1.users.id, id));
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    __param(0, (0, common_1.Inject)(db_1.DbService)),
    __metadata("design:paramtypes", [db_1.DbService])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map