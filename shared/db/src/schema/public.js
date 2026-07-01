"use strict";
// Public-Schema Drizzle Schema (kanonisch, siehe DATABASE_SCHEMA.md §4)
//
// Enthält:
//   - users, groups, roles, permissions
//   - user_roles, role_permissions
//   - sessions, audit_logs, tags, domain_events
//
// Konventionen: jede Tabelle hat `id`, `createdAt`, `updatedAt`, `deletedAt`,
// `ownerId` wo sinnvoll. UUID als PK. TIMESTAMPTZ für Zeitstempel.
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainEvents = exports.tags = exports.auditLogs = exports.sessions = exports.rolePermissions = exports.userRoles = exports.permissions = exports.roles = exports.groups = exports.users = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
// bytea-Spalten brauchen customType in Drizzle 0.36+
const bytea = (0, pg_core_1.customType)({
    dataType() { return 'bytea'; },
});
// ===================== users =====================
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    displayName: (0, pg_core_1.text)('display_name').notNull(),
    avatarUrl: (0, pg_core_1.text)('avatar_url'),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    totpSecret: (0, pg_core_1.text)('totp_secret'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    isSystem: (0, pg_core_1.boolean)('is_system').notNull().default(false),
    locale: (0, pg_core_1.text)('locale').notNull().default('de-DE'),
    timezone: (0, pg_core_1.text)('timezone').notNull().default('Europe/Berlin'),
    theme: (0, pg_core_1.text)('theme').notNull().default('dark'),
    brandColor: (0, pg_core_1.text)('brand_color').notNull().default('#D97706'),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('users_active_idx').on(t.id).where((0, drizzle_orm_1.sql) `${t.deletedAt} IS NULL AND ${t.isActive} = true`),
]);
// ===================== groups =====================
exports.groups = (0, pg_core_1.pgTable)('groups', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
// ===================== roles =====================
exports.roles = (0, pg_core_1.pgTable)('roles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    description: (0, pg_core_1.text)('description'),
    isSystem: (0, pg_core_1.boolean)('is_system').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// ===================== permissions =====================
exports.permissions = (0, pg_core_1.pgTable)('permissions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    domain: (0, pg_core_1.text)('domain').notNull(),
    action: (0, pg_core_1.text)('action').notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('permissions_domain_action_uq').on(t.domain, t.action),
]);
// ===================== user_roles =====================
exports.userRoles = (0, pg_core_1.pgTable)('user_roles', {
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    roleId: (0, pg_core_1.uuid)('role_id').notNull().references(() => exports.roles.id, { onDelete: 'cascade' }),
    scope: (0, pg_core_1.text)('scope'),
    grantedBy: (0, pg_core_1.uuid)('granted_by').references(() => exports.users.id),
    grantedAt: (0, pg_core_1.timestamp)('granted_at', { withTimezone: true }).notNull().defaultNow(),
});
// ===================== role_permissions =====================
exports.rolePermissions = (0, pg_core_1.pgTable)('role_permissions', {
    roleId: (0, pg_core_1.uuid)('role_id').notNull().references(() => exports.roles.id, { onDelete: 'cascade' }),
    permissionId: (0, pg_core_1.uuid)('permission_id').notNull().references(() => exports.permissions.id, { onDelete: 'cascade' }),
});
// ===================== sessions =====================
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    refreshHash: (0, pg_core_1.text)('refresh_hash').notNull(),
    userAgent: (0, pg_core_1.text)('user_agent'),
    ipAddress: (0, pg_core_1.inet)('ip_address'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    revokedAt: (0, pg_core_1.timestamp)('revoked_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('sessions_user_idx').on(t.userId).where((0, drizzle_orm_1.sql) `${t.revokedAt} IS NULL`),
]);
// ===================== audit_logs =====================
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.bigint)('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: (0, pg_core_1.timestamp)('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actorId: (0, pg_core_1.uuid)('actor_id'),
    action: (0, pg_core_1.text)('action').notNull(),
    domain: (0, pg_core_1.text)('domain').notNull(),
    entityType: (0, pg_core_1.text)('entity_type'),
    entityId: (0, pg_core_1.uuid)('entity_id'),
    before: (0, pg_core_1.jsonb)('before'),
    after: (0, pg_core_1.jsonb)('after'),
    ipAddress: (0, pg_core_1.inet)('ip_address'),
    userAgent: (0, pg_core_1.text)('user_agent'),
    prevHash: bytea('prev_hash'),
    rowHash: bytea('row_hash').notNull(),
}, (t) => [
    (0, pg_core_1.index)('audit_logs_actor_idx').on(t.actorId, t.occurredAt),
    (0, pg_core_1.index)('audit_logs_entity_idx').on(t.domain, t.entityType, t.entityId, t.occurredAt),
    (0, pg_core_1.index)('audit_logs_time_idx').on(t.occurredAt),
]);
// ===================== tags =====================
exports.tags = (0, pg_core_1.pgTable)('tags', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    domain: (0, pg_core_1.text)('domain').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    color: (0, pg_core_1.text)('color'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('tags_owner_domain_name_uq').on(t.ownerId, t.domain, t.name),
]);
// ===================== domain_events (Outbox) =====================
exports.domainEvents = (0, pg_core_1.pgTable)('domain_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    occurredAt: (0, pg_core_1.timestamp)('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    eventType: (0, pg_core_1.text)('event_type').notNull(),
    aggregateId: (0, pg_core_1.uuid)('aggregate_id'),
    payload: (0, pg_core_1.jsonb)('payload').notNull(),
    publishedAt: (0, pg_core_1.timestamp)('published_at', { withTimezone: true }),
    attempts: (0, pg_core_1.text)('attempts').notNull().default('0'),
    lastError: (0, pg_core_1.text)('last_error'),
}, (t) => [
    (0, pg_core_1.index)('domain_events_unpub_idx').on(t.occurredAt).where((0, drizzle_orm_1.sql) `${t.publishedAt} IS NULL`),
]);
//# sourceMappingURL=public.js.map