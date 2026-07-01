import { Injectable, Inject, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { hashPassword, verifyPassword, signAccessToken, generateRefreshToken, hashRefreshToken, REFRESH_TTL } from '@lifehub/auth';
import { EventsService } from '@lifehub/events';
import { createEventType } from '@lifehub/events';
import { UsersRepository } from '../repositories/users.repository.js';
import type { User, PublicUser, Role } from '../entities/user.js';
import { toPublicUser } from '../entities/user.js';
import type { LoginInput, RegisterInput, UpdateUserInput, ChangePasswordInput } from '../dtos/auth.dto.js';

// Domain-Events
export const UserLoggedIn = createEventType<{ userId: string }>('UserLoggedIn');
export const UserLoggedOut = createEventType<{ userId: string; sessionId: string }>('UserLoggedOut');
export const UserCreated = createEventType<{ userId: string; email: string }>('UserCreated');
export const UserUpdated = createEventType<{ userId: string; fields: string[] }>('UserUpdated');

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
  roles: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository) private readonly repo: UsersRepository,
    @Inject(EventsService) private readonly events: EventsService,
  ) {}

  async login(input: LoginInput, meta?: { userAgent?: string; ipAddress?: string }): Promise<AuthTokens> {
    const user = await this.repo.findByEmail(input.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('User is inactive');
    if (user.deletedAt) throw new UnauthorizedException('Invalid credentials');

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const roles = (await this.repo.findRolesByUserId(user.id)).map((r) => r.name);

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, roles: roles });
    const { token: refreshToken, hash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);
    await this.repo.createSession({
      userId: user.id,
      refreshHash: hash,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt,
    });
    await this.events.emit(UserLoggedIn.create(user.id, { userId: user.id }));

    return { accessToken, refreshToken, user: toPublicUser(user), roles };
  }

  async refresh(refreshToken: string, meta?: { userAgent?: string; ipAddress?: string }): Promise<AuthTokens> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.repo.findActiveSessionByHash(hash);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.repo.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    const roles = (await this.repo.findRolesByUserId(user.id)).map((r) => r.name);

    // Token-Rotation: altes revoke, neues erzeugen
    await this.repo.revokeSession(session.id);
    const accessToken = await signAccessToken({ sub: user.id, email: user.email, roles });
    const { token: newRefresh, hash: newHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);
    await this.repo.createSession({
      userId: user.id,
      refreshHash: newHash,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt,
    });

    return { accessToken, refreshToken: newRefresh, user: toPublicUser(user), roles };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.repo.findActiveSessionByHash(hash);
    if (session && !session.revokedAt) {
      await this.repo.revokeSession(session.id);
      await this.events.emit(UserLoggedOut.create(session.userId, { userId: session.userId, sessionId: session.id }));
    }
  }

  async register(input: RegisterInput): Promise<AuthTokens> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new BadRequestException('Die E-Mail-Adresse wird bereits verwendet');

    const passwordHash = await hashPassword(input.password);
    const user = await this.repo.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });
    await this.events.emit(UserCreated.create(user.id, { userId: user.id, email: user.email }));

    // Auto-Login nach Register
    return this.login({ email: input.email, password: input.password });
  }

  async getProfile(userId: string): Promise<{ user: PublicUser; roles: Role[] }> {
    const user = await this.repo.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const roles = await this.repo.findRolesByUserId(userId);
    return { user: toPublicUser(user), roles };
  }

  async updateProfile(userId: string, input: UpdateUserInput): Promise<PublicUser> {
    const user = await this.repo.updateProfile(userId, input);
    if (!user) throw new UnauthorizedException('User not found');
    await this.events.emit(UserUpdated.create(userId, { userId, fields: Object.keys(input) }));
    return toPublicUser(user);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await hashPassword(input.newPassword);
    await this.repo.updatePasswordHash(userId, passwordHash);
  }

  // --- Admin Operations ---

  async adminCreateUser(input: { email: string; password: string; displayName: string; roleIds?: string[] }, grantedBy?: string): Promise<PublicUser> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await hashPassword(input.password);
    const user = await this.repo.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });
    await this.events.emit(UserCreated.create(user.id, { userId: user.id, email: user.email }));

    // Assign roles if provided
    if (input.roleIds && input.roleIds.length > 0) {
      for (const roleId of input.roleIds) {
        await this.repo.assignRoleToUser(user.id, roleId, grantedBy);
      }
    }

    return toPublicUser(user);
  }

  async adminUpdateUser(userId: string, input: { displayName?: string; email?: string }): Promise<PublicUser> {
    if (input.email) {
      const existing = await this.repo.findByEmail(input.email);
      if (existing && existing.id !== userId) throw new BadRequestException('Die E-Mail-Adresse wird bereits verwendet');
    }
    const user = await this.repo.adminUpdateUser(userId, input);
    if (!user) throw new NotFoundException('User not found');
    return toPublicUser(user);
  }

  async adminDeleteUser(userId: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.isSystem) throw new BadRequestException('Cannot delete system users');
    await this.repo.adminDeleteUser(userId);
  }
}
