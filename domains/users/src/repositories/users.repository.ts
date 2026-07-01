import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DbService, users, userRoles, roles, permissions, rolePermissions, sessions, type Db } from '@lifehub/db';
import type { User, Role } from '../entities/user';

// Plain class (no @Injectable — see DbService rationale).
// Registered via factory provider in UsersModule.
export class UsersRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return (rows[0] as unknown as User) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(sql`lower(${users.email}) = lower(${email})`, isNull(users.deletedAt)))
      .limit(1);
    return (rows[0] as unknown as User) ?? null;
  }

  async findRolesByUserId(userId: string): Promise<Role[]> {
    return this.db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId)) as unknown as Role[];
  }

  async create(input: { email: string; displayName: string; passwordHash: string }): Promise<User> {
    const [row] = await this.db
      .insert(users)
      .values({
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
      })
      .returning();
    return row as unknown as User;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateProfile(id: string, patch: Partial<Pick<User, 'displayName' | 'avatarUrl' | 'theme' | 'brandColor' | 'locale' | 'timezone'>>): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return (row as unknown as User) ?? null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // --- Sessions ---

  async createSession(input: { userId: string; refreshHash: string; userAgent?: string; ipAddress?: string; expiresAt: Date }): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        userId: input.userId,
        refreshHash: input.refreshHash,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        expiresAt: input.expiresAt,
      })
      .returning({ id: sessions.id });
    return row ?? { id: '' };
  }

  async findActiveSessionByHash(refreshHash: string): Promise<{ id: string; userId: string; expiresAt: Date; revokedAt: Date | null } | null> {
    const rows = await this.db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt,
      })
      .from(sessions)
      .where(and(eq(sessions.refreshHash, refreshHash), isNull(sessions.revokedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async revokeSession(id: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  // --- Admin ---

  async listAll(): Promise<Array<Omit<User, 'passwordHash' | 'totpSecret'> & { roles: Role[] }>> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        isSystem: users.isSystem,
        locale: users.locale,
        timezone: users.timezone,
        theme: users.theme,
        brandColor: users.brandColor,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(users.createdAt);
    const result: Array<Omit<User, 'passwordHash' | 'totpSecret'> & { roles: Role[] }> = [];
    for (const row of rows) {
      const r = row as unknown as Omit<User, 'passwordHash' | 'totpSecret'>;
      const rls = await this.findRolesByUserId(r.id);
      result.push({ ...r, roles: rls });
    }
    return result;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // =================== Roles ===================

  async findAllRoles(): Promise<Role[]> {
    return this.db
      .select()
      .from(roles)
      .orderBy(roles.name) as unknown as Role[];
  }

  async findRoleById(id: string): Promise<Role | null> {
    const rows = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);
    return (rows[0] as unknown as Role) ?? null;
  }

  async createRole(input: { name: string; description?: string; isSystem?: boolean }): Promise<Role> {
    const [row] = await this.db
      .insert(roles)
      .values({
        name: input.name,
        description: input.description ?? null,
        isSystem: input.isSystem ?? false,
      })
      .returning();
    return row as unknown as Role;
  }

  async updateRole(id: string, patch: { name?: string; description?: string }): Promise<Role | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.description !== undefined) updateData.description = patch.description;
    const [row] = await this.db
      .update(roles)
      .set(updateData as any)
      .where(eq(roles.id, id))
      .returning();
    return (row as unknown as Role) ?? null;
  }

  async deleteRole(id: string): Promise<void> {
    await this.db.delete(roles).where(eq(roles.id, id));
  }

  // =================== User-Role Assignment ===================

  async assignRoleToUser(userId: string, roleId: string, grantedBy?: string): Promise<void> {
    await this.db
      .insert(userRoles)
      .values({
        userId,
        roleId,
        grantedBy: grantedBy ?? null,
      })
      .onConflictDoNothing();
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }

  // =================== Permissions ===================

  async findAllPermissions(): Promise<{ id: string; domain: string; action: string }[]> {
    return this.db
      .select()
      .from(permissions)
      .orderBy(permissions.domain, permissions.action) as unknown as { id: string; domain: string; action: string }[];
  }

  async findPermissionsByRoleId(roleId: string): Promise<{ id: string; domain: string; action: string }[]> {
    return this.db
      .select({
        id: permissions.id,
        domain: permissions.domain,
        action: permissions.action,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
      .orderBy(permissions.domain, permissions.action) as unknown as { id: string; domain: string; action: string }[];
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await this.db
      .insert(rolePermissions)
      .values({ roleId, permissionId })
      .onConflictDoNothing();
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Replace all permissions for this role
    await this.db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      if (permissionIds.length > 0) {
        await tx.insert(rolePermissions).values(
          permissionIds.map((pid) => ({ roleId, permissionId: pid }))
        );
      }
    });
  }

  // =================== Admin User Management ===================

  async adminUpdateUser(id: string, patch: { displayName?: string; email?: string }): Promise<User | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.displayName !== undefined) updateData.displayName = patch.displayName;
    if (patch.email !== undefined) updateData.email = patch.email;
    const [row] = await this.db
      .update(users)
      .set(updateData as any)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return (row as unknown as User) ?? null;
  }

  async adminDeleteUser(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }
}
