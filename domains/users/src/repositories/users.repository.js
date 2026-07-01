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
    db;
    constructor(db) {
        this.db = db;
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
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    __param(0, (0, common_1.Inject)(db_1.DB_TOKEN)),
    __metadata("design:paramtypes", [Object])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map