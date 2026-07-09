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
exports.jellyfinItems = exports.jellyfinLibraries = exports.jellyfinServers = exports.researchSources = exports.researchSessions = exports.pageTemplates = exports.pageRelations = exports.pageVersions = exports.blockVersions = exports.pageBlocks = exports.browserTabs = exports.pagePins = exports.pages = exports.financeAssetPrices = exports.financeAssets = exports.financeSavingsGoals = exports.financeBudgets = exports.financeTransactions = exports.financeCategories = exports.financeAccounts = exports.shoppingItems = exports.shoppingLists = exports.recipeTags = exports.steps = exports.ingredients = exports.recipes = exports.projectLinks = exports.projectNotes = exports.projectFiles = exports.projects = exports.dashboardLayouts = exports.tripMediaRefs = exports.tripDays = exports.destinations = exports.trips = exports.mediaTags = exports.albumItems = exports.albums = exports.mediaFiles = exports.mediaSources = exports.domainEvents = exports.tags = exports.auditLogs = exports.sessions = exports.rolePermissions = exports.userRoles = exports.permissions = exports.roles = exports.groups = exports.users = void 0;
exports.researchCollections = void 0;
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
// ===================== media_sources (Phase 1) =====================
exports.mediaSources = (0, pg_core_1.pgTable)('media_sources', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, pg_core_1.text)('type').notNull().default('local'), // nas_path, windows_path, s3, upload_temp
    path: (0, pg_core_1.text)('path').notNull(), // absoluter Pfad (z.B. /mnt/media/photos oder C:\Users\...)
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    autoIndex: (0, pg_core_1.boolean)('auto_index').notNull().default(false),
    lastIndexedAt: (0, pg_core_1.timestamp)('last_indexed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('media_sources_owner_idx').on(t.ownerId, t.isActive),
]);
// ===================== media_files (Phase 1) =====================
exports.mediaFiles = (0, pg_core_1.pgTable)('media_files', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    sourceId: (0, pg_core_1.uuid)('source_id').notNull().references(() => exports.mediaSources.id),
    filename: (0, pg_core_1.text)('filename').notNull(),
    relativePath: (0, pg_core_1.text)('relative_path').notNull(), // Pfad relativ zur Source
    mimeType: (0, pg_core_1.text)('mime_type').notNull(),
    fileSize: (0, pg_core_1.bigint)('file_size', { mode: 'number' }),
    width: (0, pg_core_1.bigint)('width', { mode: 'number' }),
    height: (0, pg_core_1.bigint)('height', { mode: 'number' }),
    duration: (0, pg_core_1.bigint)('duration', { mode: 'number' }), // für Videos (Sekunden * 1000)
    exifData: (0, pg_core_1.jsonb)('exif_data'),
    gpsLat: (0, pg_core_1.text)('gps_lat'),
    gpsLng: (0, pg_core_1.text)('gps_lng'),
    takenAt: (0, pg_core_1.timestamp)('taken_at', { withTimezone: true }),
    thumbnailPath: (0, pg_core_1.text)('thumbnail_path'), // Pfad zum generierten Thumbnail
    blurHash: (0, pg_core_1.text)('blur_hash'), // BlurHash für Lazy-Loading
    isFavorite: (0, pg_core_1.boolean)('is_favorite').notNull().default(false),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('media_files_source_idx').on(t.sourceId, t.relativePath),
    (0, pg_core_1.index)('media_files_taken_idx').on(t.takenAt),
    (0, pg_core_1.index)('media_files_gps_idx').on(t.gpsLat, t.gpsLng),
    (0, pg_core_1.index)('media_files_owner_idx').on(t.ownerId, t.deletedAt),
]);
// ===================== albums (Phase 1) =====================
exports.albums = (0, pg_core_1.pgTable)('albums', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, pg_core_1.text)('type').notNull().default('standard'), // standard, travel, event, timeline
    coverMediaId: (0, pg_core_1.uuid)('cover_media_id').references(() => exports.mediaFiles.id),
    isShared: (0, pg_core_1.boolean)('is_shared').notNull().default(false),
    sortOrder: (0, pg_core_1.bigint)('sort_order', { mode: 'number' }).notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('albums_owner_idx').on(t.ownerId, t.deletedAt),
]);
// ===================== album_items (Phase 1) =====================
exports.albumItems = (0, pg_core_1.pgTable)('album_items', {
    albumId: (0, pg_core_1.uuid)('album_id').notNull().references(() => exports.albums.id, { onDelete: 'cascade' }),
    mediaId: (0, pg_core_1.uuid)('media_id').notNull().references(() => exports.mediaFiles.id, { onDelete: 'cascade' }),
    sortOrder: (0, pg_core_1.bigint)('sort_order', { mode: 'number' }).notNull().default(0),
    addedBy: (0, pg_core_1.uuid)('added_by').references(() => exports.users.id),
    addedAt: (0, pg_core_1.timestamp)('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('album_items_uq').on(t.albumId, t.mediaId),
    (0, pg_core_1.index)('album_items_album_idx').on(t.albumId),
]);
// ===================== media_tags (Phase 1) =====================
exports.mediaTags = (0, pg_core_1.pgTable)('media_tags', {
    mediaId: (0, pg_core_1.uuid)('media_id').notNull().references(() => exports.mediaFiles.id, { onDelete: 'cascade' }),
    tagId: (0, pg_core_1.uuid)('tag_id').notNull().references(() => exports.tags.id, { onDelete: 'cascade' }),
    addedAt: (0, pg_core_1.timestamp)('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('media_tags_uq').on(t.mediaId, t.tagId),
]);
// ===================== trips (Phase 2) =====================
exports.trips = (0, pg_core_1.pgTable)('trips', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, pg_core_1.text)('status').notNull().default('planned'),
    coverMediaId: (0, pg_core_1.uuid)('cover_media_id'),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('trips_owner_idx').on(t.ownerId, t.deletedAt),
    (0, pg_core_1.index)('trips_date_idx').on(t.startDate, t.endDate),
]);
// ===================== destinations (Phase 2) =====================
exports.destinations = (0, pg_core_1.pgTable)('destinations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tripId: (0, pg_core_1.uuid)('trip_id').notNull().references(() => exports.trips.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    lat: (0, pg_core_1.numeric)('lat'),
    lng: (0, pg_core_1.numeric)('lng'),
    ord: (0, pg_core_1.integer)('ord').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('destinations_trip_idx').on(t.tripId, t.ord),
]);
// ===================== trip_days (Phase 2) =====================
exports.tripDays = (0, pg_core_1.pgTable)('trip_days', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tripId: (0, pg_core_1.uuid)('trip_id').notNull().references(() => exports.trips.id, { onDelete: 'cascade' }),
    date: (0, pg_core_1.date)('date').notNull(),
    title: (0, pg_core_1.text)('title'),
    notes: (0, pg_core_1.text)('notes'),
    ord: (0, pg_core_1.integer)('ord').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('trip_days_uq').on(t.tripId, t.date),
    (0, pg_core_1.index)('trip_days_trip_idx').on(t.tripId, t.date),
]);
// ===================== trip_media_refs (Phase 2) =====================
exports.tripMediaRefs = (0, pg_core_1.pgTable)('trip_media_refs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tripId: (0, pg_core_1.uuid)('trip_id').notNull().references(() => exports.trips.id, { onDelete: 'cascade' }),
    dayId: (0, pg_core_1.uuid)('day_id').references(() => exports.tripDays.id),
    mediaId: (0, pg_core_1.uuid)('media_id').notNull(),
    caption: (0, pg_core_1.text)('caption'),
    ord: (0, pg_core_1.integer)('ord').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('trip_media_refs_trip_idx').on(t.tripId),
    (0, pg_core_1.index)('trip_media_refs_day_idx').on(t.dayId),
]);
// ===================== dashboard_layouts =====================
exports.dashboardLayouts = (0, pg_core_1.pgTable)('dashboard_layouts', {
    userId: (0, pg_core_1.uuid)('user_id').primaryKey().notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    layout: (0, pg_core_1.jsonb)('layout').notNull().default({ widgets: [] }),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// ===================== projects =====================
exports.projects = (0, pg_core_1.pgTable)('projects', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, pg_core_1.text)('type').notNull().default('planning'),
    status: (0, pg_core_1.text)('status').notNull().default('3d_print'),
    coverMediaId: (0, pg_core_1.uuid)('cover_media_id'),
    githubUrl: (0, pg_core_1.text)('github_url'),
    youtubeUrl: (0, pg_core_1.text)('youtube_url'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('projects_owner_idx').on(t.ownerId, t.deletedAt),
]);
// ===================== project_files =====================
exports.projectFiles = (0, pg_core_1.pgTable)('project_files', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    projectId: (0, pg_core_1.uuid)('project_id').notNull().references(() => exports.projects.id, { onDelete: 'cascade' }),
    filename: (0, pg_core_1.text)('filename').notNull(),
    mimeType: (0, pg_core_1.text)('mime_type'),
    fileSize: (0, pg_core_1.integer)('file_size'),
    storagePath: (0, pg_core_1.text)('storage_path'),
    kind: (0, pg_core_1.text)('kind').notNull().default('other'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('project_files_project_idx').on(t.projectId),
]);
// ===================== project_notes =====================
exports.projectNotes = (0, pg_core_1.pgTable)('project_notes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    projectId: (0, pg_core_1.uuid)('project_id').notNull().references(() => exports.projects.id, { onDelete: 'cascade' }),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('project_notes_project_idx').on(t.projectId),
]);
// ===================== project_links =====================
exports.projectLinks = (0, pg_core_1.pgTable)('project_links', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    projectId: (0, pg_core_1.uuid)('project_id').notNull().references(() => exports.projects.id, { onDelete: 'cascade' }),
    url: (0, pg_core_1.text)('url').notNull(),
    label: (0, pg_core_1.text)('label'),
    type: (0, pg_core_1.text)('type').notNull().default('other'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('project_links_project_idx').on(t.projectId),
]);
// ===================== recipes =====================
exports.recipes = (0, pg_core_1.pgTable)('recipes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    sourceType: (0, pg_core_1.text)('source_type').notNull().default('manual'),
    sourceUrl: (0, pg_core_1.text)('source_url'),
    servings: (0, pg_core_1.integer)('servings').notNull().default(4),
    prepTime: (0, pg_core_1.integer)('prep_time'),
    cookTime: (0, pg_core_1.integer)('cook_time'),
    totalTime: (0, pg_core_1.integer)('total_time'),
    calories: (0, pg_core_1.integer)('calories'),
    imageMediaId: (0, pg_core_1.uuid)('image_media_id'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('recipes_owner_idx').on(t.ownerId, t.deletedAt),
]);
// ===================== ingredients =====================
exports.ingredients = (0, pg_core_1.pgTable)('ingredients', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    recipeId: (0, pg_core_1.uuid)('recipe_id').notNull().references(() => exports.recipes.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    amount: (0, pg_core_1.text)('amount'),
    unit: (0, pg_core_1.text)('unit'),
    ord: (0, pg_core_1.integer)('ord').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('ingredients_recipe_idx').on(t.recipeId, t.ord),
]);
// ===================== steps =====================
exports.steps = (0, pg_core_1.pgTable)('steps', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    recipeId: (0, pg_core_1.uuid)('recipe_id').notNull().references(() => exports.recipes.id, { onDelete: 'cascade' }),
    instruction: (0, pg_core_1.text)('instruction').notNull(),
    ord: (0, pg_core_1.integer)('ord').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('steps_recipe_idx').on(t.recipeId, t.ord),
]);
// ===================== recipe_tags =====================
exports.recipeTags = (0, pg_core_1.pgTable)('recipe_tags', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    recipeId: (0, pg_core_1.uuid)('recipe_id').notNull().references(() => exports.recipes.id, { onDelete: 'cascade' }),
    tagId: (0, pg_core_1.uuid)('tag_id').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('recipe_tags_recipe_idx').on(t.recipeId),
    (0, pg_core_1.index)('recipe_tags_tag_idx').on(t.tagId),
]);
// ===================== shopping_lists =====================
exports.shoppingLists = (0, pg_core_1.pgTable)('shopping_lists', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)('title').notNull(),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    color: (0, pg_core_1.text)('color'),
    store: (0, pg_core_1.text)('store'),
    isArchived: (0, pg_core_1.boolean)('is_archived').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('shopping_lists_owner_idx').on(t.ownerId, t.deletedAt),
]);
// ===================== shopping_items =====================
exports.shoppingItems = (0, pg_core_1.pgTable)('shopping_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    listId: (0, pg_core_1.uuid)('list_id').notNull().references(() => exports.shoppingLists.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    amount: (0, pg_core_1.text)('amount'),
    unit: (0, pg_core_1.text)('unit'),
    category: (0, pg_core_1.text)('category'),
    checked: (0, pg_core_1.boolean)('checked').notNull().default(false),
    checkedBy: (0, pg_core_1.text)('checked_by'),
    ord: (0, pg_core_1.integer)('ord').notNull().default(0),
    recipeRefId: (0, pg_core_1.uuid)('recipe_ref_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('shopping_items_list_idx').on(t.listId, t.ord),
]);
// ===================== finance_accounts =====================
exports.financeAccounts = (0, pg_core_1.pgTable)('finance_accounts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, pg_core_1.text)('type').notNull().default('checking'),
    currency: (0, pg_core_1.char)('currency', { length: 3 }).notNull().default('EUR'),
    balance: (0, pg_core_1.numeric)('balance', { precision: 18, scale: 2 }).notNull().default('0'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('finance_accounts_owner_idx').on(t.ownerId, t.deletedAt),
]);
// ===================== finance_categories =====================
exports.financeCategories = (0, pg_core_1.pgTable)('finance_categories', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    icon: (0, pg_core_1.text)('icon'),
    color: (0, pg_core_1.text)('color'),
    parentId: (0, pg_core_1.uuid)('parent_id').references(() => exports.financeCategories.id),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('finance_categories_owner_idx').on(t.ownerId),
    (0, pg_core_1.index)('finance_categories_parent_idx').on(t.parentId),
]);
// ===================== finance_transactions =====================
exports.financeTransactions = (0, pg_core_1.pgTable)('finance_transactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    accountId: (0, pg_core_1.uuid)('account_id').notNull().references(() => exports.financeAccounts.id, { onDelete: 'cascade' }),
    date: (0, pg_core_1.date)('date').notNull(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 18, scale: 2 }).notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    categoryId: (0, pg_core_1.uuid)('category_id').references(() => exports.financeCategories.id),
    payee: (0, pg_core_1.text)('payee'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('finance_transactions_account_idx').on(t.accountId, t.date),
    (0, pg_core_1.index)('finance_transactions_category_idx').on(t.categoryId),
]);
// ===================== finance_budgets =====================
exports.financeBudgets = (0, pg_core_1.pgTable)('finance_budgets', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    categoryId: (0, pg_core_1.uuid)('category_id').references(() => exports.financeCategories.id),
    amount: (0, pg_core_1.numeric)('amount', { precision: 18, scale: 2 }).notNull(),
    period: (0, pg_core_1.text)('period').notNull().default('monthly'),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('finance_budgets_owner_idx').on(t.ownerId),
]);
// ===================== finance_savings_goals =====================
exports.financeSavingsGoals = (0, pg_core_1.pgTable)('finance_savings_goals', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    targetAmount: (0, pg_core_1.numeric)('target_amount', { precision: 18, scale: 2 }).notNull(),
    currentAmount: (0, pg_core_1.numeric)('current_amount', { precision: 18, scale: 2 }).notNull().default('0'),
    jarAccountId: (0, pg_core_1.uuid)('jar_account_id').references(() => exports.financeAccounts.id),
    deadline: (0, pg_core_1.date)('deadline'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('finance_savings_goals_owner_idx').on(t.ownerId),
]);
// ===================== finance_assets =====================
exports.financeAssets = (0, pg_core_1.pgTable)('finance_assets', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    quantity: (0, pg_core_1.numeric)('quantity', { precision: 18, scale: 6 }).notNull().default('0'),
    currentPrice: (0, pg_core_1.numeric)('current_price', { precision: 18, scale: 6 }).notNull().default('0'),
    currency: (0, pg_core_1.char)('currency', { length: 3 }).notNull().default('EUR'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('finance_assets_owner_idx').on(t.ownerId, t.deletedAt),
]);
// ===================== finance_asset_prices =====================
exports.financeAssetPrices = (0, pg_core_1.pgTable)('finance_asset_prices', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    assetId: (0, pg_core_1.uuid)('asset_id').notNull().references(() => exports.financeAssets.id, { onDelete: 'cascade' }),
    price: (0, pg_core_1.numeric)('price', { precision: 18, scale: 6 }).notNull(),
    date: (0, pg_core_1.date)('date').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('finance_asset_prices_asset_idx').on(t.assetId, t.date),
]);
// ===================== pages =====================
exports.pages = (0, pg_core_1.pgTable)('pages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)('title').notNull(),
    slug: (0, pg_core_1.text)('slug'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    parentId: (0, pg_core_1.uuid)('parent_id'),
    icon: (0, pg_core_1.text)('icon'),
    coverMediaId: (0, pg_core_1.uuid)('cover_media_id'),
    description: (0, pg_core_1.text)('description'),
    templateId: (0, pg_core_1.uuid)('template_id'),
    status: (0, pg_core_1.text)('status').notNull().default('published'),
    tags: (0, pg_core_1.jsonb)('tags').notNull().default('[]'),
    metadata: (0, pg_core_1.jsonb)('metadata').notNull().default('{}'),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('pages_owner_idx').on(t.ownerId, t.deletedAt),
    (0, pg_core_1.index)('pages_parent_idx').on(t.parentId),
    (0, pg_core_1.index)('pages_status_idx').on(t.ownerId, t.status),
    (0, pg_core_1.index)('pages_slug_owner_idx').on(t.ownerId, t.slug),
]);
// ===================== page_pins =====================
exports.pagePins = (0, pg_core_1.pgTable)('page_pins', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id),
    pageId: (0, pg_core_1.uuid)('page_id').notNull().references(() => exports.pages.id, { onDelete: 'cascade' }),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('page_pins_user_page_uq').on(t.userId, t.pageId),
    (0, pg_core_1.index)('page_pins_user_idx').on(t.userId, t.sortOrder),
]);
// ===================== browser_tabs =====================
exports.browserTabs = (0, pg_core_1.pgTable)('browser_tabs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull().references(() => exports.researchSessions.id, { onDelete: 'cascade' }),
    url: (0, pg_core_1.text)('url').notNull().default('about:blank'),
    title: (0, pg_core_1.text)('title'),
    favicon: (0, pg_core_1.text)('favicon'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(false),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('browser_tabs_session_idx').on(t.sessionId, t.sortOrder),
]);
// ===================== page_blocks =====================
exports.pageBlocks = (0, pg_core_1.pgTable)('page_blocks', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    pageId: (0, pg_core_1.uuid)('page_id').notNull().references(() => exports.pages.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    content: (0, pg_core_1.jsonb)('content').notNull().default('{}'),
    layout: (0, pg_core_1.jsonb)('layout'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    permissions: (0, pg_core_1.jsonb)('permissions'),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    status: (0, pg_core_1.text)('status').notNull().default('active'),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('page_blocks_page_idx').on(t.pageId, t.sortOrder),
    (0, pg_core_1.index)('page_blocks_status_idx').on(t.pageId, t.status),
]);
// ===================== block_versions =====================
exports.blockVersions = (0, pg_core_1.pgTable)('block_versions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    blockId: (0, pg_core_1.uuid)('block_id').notNull().references(() => exports.pageBlocks.id, { onDelete: 'cascade' }),
    version: (0, pg_core_1.integer)('version').notNull(),
    content: (0, pg_core_1.jsonb)('content').notNull(),
    layout: (0, pg_core_1.jsonb)('layout'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    changedBy: (0, pg_core_1.uuid)('changed_by').notNull().references(() => exports.users.id),
    changeType: (0, pg_core_1.text)('change_type').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('block_versions_block_idx').on(t.blockId, t.version),
]);
// ===================== page_versions =====================
exports.pageVersions = (0, pg_core_1.pgTable)('page_versions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    pageId: (0, pg_core_1.uuid)('page_id').notNull().references(() => exports.pages.id, { onDelete: 'cascade' }),
    version: (0, pg_core_1.integer)('version').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    icon: (0, pg_core_1.text)('icon'),
    coverMediaId: (0, pg_core_1.uuid)('cover_media_id'),
    blocks: (0, pg_core_1.jsonb)('blocks').notNull(),
    changedBy: (0, pg_core_1.uuid)('changed_by').notNull().references(() => exports.users.id),
    changeType: (0, pg_core_1.text)('change_type').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('page_versions_page_idx').on(t.pageId, t.version),
]);
// ===================== page_relations =====================
exports.pageRelations = (0, pg_core_1.pgTable)('page_relations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sourcePageId: (0, pg_core_1.uuid)('source_page_id').notNull().references(() => exports.pages.id, { onDelete: 'cascade' }),
    targetPageId: (0, pg_core_1.uuid)('target_page_id').notNull().references(() => exports.pages.id, { onDelete: 'cascade' }),
    relationType: (0, pg_core_1.text)('relation_type').notNull().default('reference'),
    label: (0, pg_core_1.text)('label'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull().references(() => exports.users.id),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('page_relations_uq').on(t.sourcePageId, t.targetPageId, t.relationType),
    (0, pg_core_1.index)('page_relations_source_idx').on(t.sourcePageId),
    (0, pg_core_1.index)('page_relations_target_idx').on(t.targetPageId),
]);
// ===================== page_templates =====================
exports.pageTemplates = (0, pg_core_1.pgTable)('page_templates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    icon: (0, pg_core_1.text)('icon'),
    domain: (0, pg_core_1.text)('domain'),
    blocks: (0, pg_core_1.jsonb)('blocks').notNull().default('[]'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    isSystem: (0, pg_core_1.boolean)('is_system').notNull().default(false),
    ownerId: (0, pg_core_1.uuid)('owner_id').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('page_templates_domain_idx').on(t.domain),
    (0, pg_core_1.index)('page_templates_owner_idx').on(t.ownerId),
]);
// ===================== research_sessions =====================
exports.researchSessions = (0, pg_core_1.pgTable)('research_sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    pageId: (0, pg_core_1.uuid)('page_id').notNull().references(() => exports.pages.id, { onDelete: 'cascade' }),
    blockId: (0, pg_core_1.uuid)('block_id').references(() => exports.pageBlocks.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    mode: (0, pg_core_1.text)('mode').notNull().default('active'),
    searchHistory: (0, pg_core_1.jsonb)('search_history').notNull().default('[]'),
    pinnedSources: (0, pg_core_1.jsonb)('pinned_sources').notNull().default('[]'),
    notes: (0, pg_core_1.text)('notes'),
    tags: (0, pg_core_1.jsonb)('tags').notNull().default('[]'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('research_sessions_page_idx').on(t.pageId),
    (0, pg_core_1.index)('research_sessions_block_idx').on(t.blockId),
]);
// ===================== research_sources =====================
exports.researchSources = (0, pg_core_1.pgTable)('research_sources', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull().references(() => exports.researchSessions.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    url: (0, pg_core_1.text)('url'),
    title: (0, pg_core_1.text)('title'),
    description: (0, pg_core_1.text)('description'),
    thumbnailUrl: (0, pg_core_1.text)('thumbnail_url'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    isPinned: (0, pg_core_1.boolean)('is_pinned').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('research_sources_session_idx').on(t.sessionId),
    (0, pg_core_1.index)('research_sources_type_idx').on(t.sessionId, t.type),
]);
// ===================== jellyfin_servers =====================
exports.jellyfinServers = (0, pg_core_1.pgTable)('jellyfin_servers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    url: (0, pg_core_1.text)('url').notNull(),
    apiKey: (0, pg_core_1.text)('api_key').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('jellyfin_servers_owner_idx').on(t.ownerId),
]);
// ===================== jellyfin_libraries =====================
exports.jellyfinLibraries = (0, pg_core_1.pgTable)('jellyfin_libraries', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    serverId: (0, pg_core_1.uuid)('server_id').notNull().references(() => exports.jellyfinServers.id, { onDelete: 'cascade' }),
    externalId: (0, pg_core_1.text)('external_id'),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, pg_core_1.text)('type'),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('jellyfin_libraries_server_idx').on(t.serverId),
    (0, pg_core_1.index)('jellyfin_libraries_owner_idx').on(t.ownerId),
    (0, pg_core_1.uniqueIndex)('jellyfin_libraries_server_ext_uq').on(t.serverId, t.externalId),
]);
// ===================== jellyfin_items =====================
exports.jellyfinItems = (0, pg_core_1.pgTable)('jellyfin_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    libraryId: (0, pg_core_1.uuid)('library_id').notNull().references(() => exports.jellyfinLibraries.id, { onDelete: 'cascade' }),
    externalId: (0, pg_core_1.text)('external_id'),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    path: (0, pg_core_1.text)('path'),
    watched: (0, pg_core_1.boolean)('watched').notNull().default(false),
    ownerId: (0, pg_core_1.uuid)('owner_id').notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('jellyfin_items_library_idx').on(t.libraryId),
    (0, pg_core_1.index)('jellyfin_items_owner_idx').on(t.ownerId),
    (0, pg_core_1.uniqueIndex)('jellyfin_items_library_ext_uq').on(t.libraryId, t.externalId),
]);
// ===================== research_collections =====================
exports.researchCollections = (0, pg_core_1.pgTable)('research_collections', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull().references(() => exports.researchSessions.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    sourceIds: (0, pg_core_1.jsonb)('source_ids').notNull().default('[]'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('research_collections_session_idx').on(t.sessionId),
]);
//# sourceMappingURL=public.js.map