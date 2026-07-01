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
exports.UsersService = exports.UserUpdated = exports.UserCreated = exports.UserLoggedOut = exports.UserLoggedIn = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("@lifehub/auth");
const events_1 = require("@lifehub/events");
const events_2 = require("@lifehub/events");
const users_repository_js_1 = require("../repositories/users.repository.js");
const user_js_1 = require("../entities/user.js");
// Domain-Events
exports.UserLoggedIn = (0, events_2.createEventType)('UserLoggedIn');
exports.UserLoggedOut = (0, events_2.createEventType)('UserLoggedOut');
exports.UserCreated = (0, events_2.createEventType)('UserCreated');
exports.UserUpdated = (0, events_2.createEventType)('UserUpdated');
let UsersService = class UsersService {
    repo;
    events;
    constructor(repo, events) {
        this.repo = repo;
        this.events = events;
    }
    async login(input, meta) {
        const user = await this.repo.findByEmail(input.email);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (!user.isActive)
            throw new common_1.UnauthorizedException('User is inactive');
        if (user.deletedAt)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await (0, auth_1.verifyPassword)(user.passwordHash, input.password);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const roles = (await this.repo.findRolesByUserId(user.id)).map((r) => r.name);
        const accessToken = await (0, auth_1.signAccessToken)({ sub: user.id, email: user.email, roles: roles });
        const { token: refreshToken, hash } = (0, auth_1.generateRefreshToken)();
        const expiresAt = new Date(Date.now() + auth_1.REFRESH_TTL * 1000);
        await this.repo.createSession({
            userId: user.id,
            refreshHash: hash,
            userAgent: meta?.userAgent,
            ipAddress: meta?.ipAddress,
            expiresAt,
        });
        await this.events.emit(exports.UserLoggedIn.create(user.id, { userId: user.id }));
        return { accessToken, refreshToken, user: (0, user_js_1.toPublicUser)(user), roles };
    }
    async refresh(refreshToken, meta) {
        const hash = (0, auth_1.hashRefreshToken)(refreshToken);
        const session = await this.repo.findActiveSessionByHash(hash);
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.repo.findById(session.userId);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        const roles = (await this.repo.findRolesByUserId(user.id)).map((r) => r.name);
        // Token-Rotation: altes revoke, neues erzeugen
        await this.repo.revokeSession(session.id);
        const accessToken = await (0, auth_1.signAccessToken)({ sub: user.id, email: user.email, roles });
        const { token: newRefresh, hash: newHash } = (0, auth_1.generateRefreshToken)();
        const expiresAt = new Date(Date.now() + auth_1.REFRESH_TTL * 1000);
        await this.repo.createSession({
            userId: user.id,
            refreshHash: newHash,
            userAgent: meta?.userAgent,
            ipAddress: meta?.ipAddress,
            expiresAt,
        });
        return { accessToken, refreshToken: newRefresh, user: (0, user_js_1.toPublicUser)(user), roles };
    }
    async logout(refreshToken) {
        const hash = (0, auth_1.hashRefreshToken)(refreshToken);
        const session = await this.repo.findActiveSessionByHash(hash);
        if (session && !session.revokedAt) {
            await this.repo.revokeSession(session.id);
            await this.events.emit(exports.UserLoggedOut.create(session.userId, { userId: session.userId, sessionId: session.id }));
        }
    }
    async register(input) {
        const existing = await this.repo.findByEmail(input.email);
        if (existing)
            throw new common_1.BadRequestException('Email already in use');
        const passwordHash = await (0, auth_1.hashPassword)(input.password);
        const user = await this.repo.create({
            email: input.email,
            displayName: input.displayName,
            passwordHash,
        });
        await this.events.emit(exports.UserCreated.create(user.id, { userId: user.id, email: user.email }));
        // Auto-Login nach Register
        return this.login({ email: input.email, password: input.password });
    }
    async getProfile(userId) {
        const user = await this.repo.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const roles = await this.repo.findRolesByUserId(userId);
        return { user: (0, user_js_1.toPublicUser)(user), roles };
    }
    async updateProfile(userId, input) {
        const user = await this.repo.updateProfile(userId, input);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        await this.events.emit(exports.UserUpdated.create(userId, { userId, fields: Object.keys(input) }));
        return (0, user_js_1.toPublicUser)(user);
    }
    async changePassword(userId, input) {
        const user = await this.repo.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const ok = await (0, auth_1.verifyPassword)(user.passwordHash, input.currentPassword);
        if (!ok)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        const passwordHash = await (0, auth_1.hashPassword)(input.newPassword);
        await this.repo.updatePasswordHash(userId, passwordHash);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(users_repository_js_1.UsersRepository)),
    __param(1, (0, common_1.Inject)(events_1.EventsService)),
    __metadata("design:paramtypes", [users_repository_js_1.UsersRepository,
        events_1.EventsService])
], UsersService);
//# sourceMappingURL=users.service.js.map