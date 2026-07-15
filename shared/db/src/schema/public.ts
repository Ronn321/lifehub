// Public-Schema Drizzle Schema (kanonisch, siehe DATABASE_SCHEMA.md §4)
//
// Enthält:
//   - users, groups, roles, permissions
//   - user_roles, role_permissions
//   - sessions, audit_logs, tags, domain_events
//
// Konventionen: jede Tabelle hat `id`, `createdAt`, `updatedAt`, `deletedAt`,
// `ownerId` wo sinnvoll. UUID als PK. TIMESTAMPTZ für Zeitstempel.

import { sql, relations } from 'drizzle-orm';
import {
  pgTable, uuid, text, timestamp, boolean, jsonb, inet, bigint, char, customType, integer, numeric, date as dateCol,
  index, uniqueIndex,
} from 'drizzle-orm/pg-core';

// bytea-Spalten brauchen customType in Drizzle 0.36+
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() { return 'bytea'; },
});

// ===================== users =====================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  isActive: boolean('is_active').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  locale: text('locale').notNull().default('de-DE'),
  timezone: text('timezone').notNull().default('Europe/Berlin'),
  theme: text('theme').notNull().default('dark'),
  brandColor: text('brand_color').notNull().default('#D97706'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('users_active_idx').on(t.id).where(sql`${t.deletedAt} IS NULL AND ${t.isActive} = true`),
]);

// ===================== groups =====================
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ===================== roles =====================
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== permissions =====================
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: text('domain').notNull(),
  action: text('action').notNull(),
}, (t) => [
  uniqueIndex('permissions_domain_action_uq').on(t.domain, t.action),
]);

// ===================== user_roles =====================
export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  scope: text('scope'),
  grantedBy: uuid('granted_by').references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== role_permissions =====================
export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
});

// ===================== sessions =====================
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshHash: text('refresh_hash').notNull(),
  userAgent: text('user_agent'),
  ipAddress: inet('ip_address'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sessions_user_idx').on(t.userId).where(sql`${t.revokedAt} IS NULL`),
]);

// ===================== audit_logs =====================
export const auditLogs = pgTable('audit_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  domain: text('domain').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  prevHash: bytea('prev_hash'),
  rowHash: bytea('row_hash').notNull(),
}, (t) => [
  index('audit_logs_actor_idx').on(t.actorId, t.occurredAt),
  index('audit_logs_entity_idx').on(t.domain, t.entityType, t.entityId, t.occurredAt),
  index('audit_logs_time_idx').on(t.occurredAt),
]);

// ===================== tags =====================
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  domain: text('domain').notNull(),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('tags_owner_domain_name_uq').on(t.ownerId, t.domain, t.name),
]);

// ===================== domain_events (Outbox) =====================
export const domainEvents = pgTable('domain_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  eventType: text('event_type').notNull(),
  aggregateId: uuid('aggregate_id'),
  payload: jsonb('payload').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  attempts: text('attempts').notNull().default('0'),
  lastError: text('last_error'),
}, (t) => [
  index('domain_events_unpub_idx').on(t.occurredAt).where(sql`${t.publishedAt} IS NULL`),
]);

// ===================== media_sources (Phase 1) =====================
export const mediaSources = pgTable('media_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  type: text('type').notNull().default('local'), // nas_path, windows_path, s3, upload_temp
  path: text('path').notNull(),                   // absoluter Pfad (z.B. /mnt/media/photos oder C:\Users\...)
  isActive: boolean('is_active').notNull().default(true),
  autoIndex: boolean('auto_index').notNull().default(false),
  lastIndexedAt: timestamp('last_indexed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('media_sources_owner_idx').on(t.ownerId, t.isActive),
]);

// ===================== media_files (Phase 1) =====================
export const mediaFiles = pgTable('media_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  sourceId: uuid('source_id').notNull().references(() => mediaSources.id),
  filename: text('filename').notNull(),
  relativePath: text('relative_path').notNull(),      // Pfad relativ zur Source
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }),
  width: bigint('width', { mode: 'number' }),
  height: bigint('height', { mode: 'number' }),
  duration: bigint('duration', { mode: 'number' }),    // für Videos (Sekunden * 1000)
  exifData: jsonb('exif_data'),
  gpsLat: text('gps_lat'),
  gpsLng: text('gps_lng'),
  takenAt: timestamp('taken_at', { withTimezone: true }),
  thumbnailPath: text('thumbnail_path'),               // Pfad zum generierten Thumbnail
  blurHash: text('blur_hash'),                          // BlurHash für Lazy-Loading
  isFavorite: boolean('is_favorite').notNull().default(false),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('media_files_source_idx').on(t.sourceId, t.relativePath),
  index('media_files_taken_idx').on(t.takenAt),
  index('media_files_gps_idx').on(t.gpsLat, t.gpsLng),
  index('media_files_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== albums (Phase 1) =====================
export const albums = pgTable('albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default('standard'), // standard, travel, event, timeline
  coverMediaId: uuid('cover_media_id').references(() => mediaFiles.id),
  isShared: boolean('is_shared').notNull().default(false),
  sortOrder: bigint('sort_order', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('albums_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== album_items (Phase 1) =====================
export const albumItems = pgTable('album_items', {
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  mediaId: uuid('media_id').notNull().references(() => mediaFiles.id, { onDelete: 'cascade' }),
  sortOrder: bigint('sort_order', { mode: 'number' }).notNull().default(0),
  addedBy: uuid('added_by').references(() => users.id),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('album_items_uq').on(t.albumId, t.mediaId),
  index('album_items_album_idx').on(t.albumId),
]);

// ===================== media_tags (Phase 1) =====================
export const mediaTags = pgTable('media_tags', {
  mediaId: uuid('media_id').notNull().references(() => mediaFiles.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('media_tags_uq').on(t.mediaId, t.tagId),
]);

// ===================== trips (Phase 2) =====================
export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('planned'),
  coverMediaId: uuid('cover_media_id'),
  startDate: dateCol('start_date').notNull(),
  endDate: dateCol('end_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('trips_owner_idx').on(t.ownerId, t.deletedAt),
  index('trips_date_idx').on(t.startDate, t.endDate),
]);

// ===================== destinations (Phase 2) =====================
export const destinations = pgTable('destinations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  lat: numeric('lat'),
  lng: numeric('lng'),
  ord: integer('ord').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('destinations_trip_idx').on(t.tripId, t.ord),
]);

// ===================== trip_days (Phase 2) =====================
export const tripDays = pgTable('trip_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  date: dateCol('date').notNull(),
  title: text('title'),
  notes: text('notes'),
  ord: integer('ord').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('trip_days_uq').on(t.tripId, t.date),
  index('trip_days_trip_idx').on(t.tripId, t.date),
]);

// ===================== trip_media_refs (Phase 2) =====================
export const tripMediaRefs = pgTable('trip_media_refs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  dayId: uuid('day_id').references(() => tripDays.id),
  mediaId: uuid('media_id').notNull(),
  caption: text('caption'),
  ord: integer('ord').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('trip_media_refs_trip_idx').on(t.tripId),
  index('trip_media_refs_day_idx').on(t.dayId),
]);

// ===================== dashboard_layouts =====================
export const dashboardLayouts = pgTable('dashboard_layouts', {
  userId: uuid('user_id').primaryKey().notNull().references(() => users.id, { onDelete: 'cascade' }),
  layout: jsonb('layout').notNull().default({ widgets: [] }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===================== projects =====================
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('planning'),
  status: text('status').notNull().default('3d_print'),
  coverMediaId: uuid('cover_media_id'),
  githubUrl: text('github_url'),
  youtubeUrl: text('youtube_url'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('projects_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== project_files =====================
export const projectFiles = pgTable('project_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  storagePath: text('storage_path'),
  kind: text('kind').notNull().default('other'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('project_files_project_idx').on(t.projectId),
]);

// ===================== project_notes =====================
export const projectNotes = pgTable('project_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('project_notes_project_idx').on(t.projectId),
]);

// ===================== project_links =====================
export const projectLinks = pgTable('project_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  label: text('label'),
  type: text('type').notNull().default('other'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('project_links_project_idx').on(t.projectId),
]);

// ===================== dishes =====================
export const dishes = pgTable('dishes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  titleEn: text('title_en'),
  description: text('description'),
  caption: text('caption'),
  heroText: text('hero_text'),
  primaryColor: text('primary_color'),
  imageMediaId: uuid('image_media_id'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('dishes_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== recipes =====================
export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  titleEn: text('title_en'),
  description: text('description'),
  dishId: uuid('dish_id').references(() => dishes.id),
  containsFlags: text('contains_flags').array(),
  attributes: text('attributes').array(),
  variantLabel: text('variant_label'),
  effortLevel: text('effort_level'),
  sourceType: text('source_type').notNull().default('manual'),
  sourceUrl: text('source_url'),
  servings: integer('servings').notNull().default(4),
  prepTime: integer('prep_time'),
  cookTime: integer('cook_time'),
  totalTime: integer('total_time'),
  calories: integer('calories'),
  imageMediaId: uuid('image_media_id'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('recipes_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== ingredients =====================
export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: text('amount'),
  unit: text('unit'),
  ord: integer('ord').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ingredients_recipe_idx').on(t.recipeId, t.ord),
]);

// ===================== steps =====================
export const steps = pgTable('steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  instruction: text('instruction').notNull(),
  ord: integer('ord').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('steps_recipe_idx').on(t.recipeId, t.ord),
]);

// ===================== recipe_tags =====================
export const recipeTags = pgTable('recipe_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('recipe_tags_recipe_idx').on(t.recipeId),
  index('recipe_tags_tag_idx').on(t.tagId),
]);

// ===================== shopping_lists =====================
export const shoppingLists = pgTable('shopping_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  color: text('color'),
  store: text('store'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('shopping_lists_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== shopping_items =====================
export const shoppingItems = pgTable('shopping_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id').notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: text('amount'),
  unit: text('unit'),
  category: text('category'),
  checked: boolean('checked').notNull().default(false),
  checkedBy: text('checked_by'),
  ord: integer('ord').notNull().default(0),
  recipeRefId: uuid('recipe_ref_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('shopping_items_list_idx').on(t.listId, t.ord),
]);

// ===================== finance_accounts =====================
export const financeAccounts = pgTable('finance_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull().default('checking'),
  currency: char('currency', { length: 3 }).notNull().default('EUR'),
  balance: numeric('balance', { precision: 18, scale: 2 }).notNull().default('0'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('finance_accounts_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== finance_categories =====================
export const financeCategories = pgTable('finance_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  parentId: uuid('parent_id').references((): any => financeCategories.id),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('finance_categories_owner_idx').on(t.ownerId),
  index('finance_categories_parent_idx').on(t.parentId),
]);

// ===================== finance_transactions =====================
export const financeTransactions = pgTable('finance_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => financeAccounts.id, { onDelete: 'cascade' }),
  date: dateCol('date').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  description: text('description').notNull(),
  categoryId: uuid('category_id').references(() => financeCategories.id),
  payee: text('payee'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('finance_transactions_account_idx').on(t.accountId, t.date),
  index('finance_transactions_category_idx').on(t.categoryId),
]);

// ===================== finance_budgets =====================
export const financeBudgets = pgTable('finance_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => financeCategories.id),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  period: text('period').notNull().default('monthly'),
  startDate: dateCol('start_date').notNull(),
  endDate: dateCol('end_date'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('finance_budgets_owner_idx').on(t.ownerId),
]);

// ===================== finance_savings_goals =====================
export const financeSavingsGoals = pgTable('finance_savings_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  targetAmount: numeric('target_amount', { precision: 18, scale: 2 }).notNull(),
  currentAmount: numeric('current_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  jarAccountId: uuid('jar_account_id').references(() => financeAccounts.id),
  deadline: dateCol('deadline'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('finance_savings_goals_owner_idx').on(t.ownerId),
]);

// ===================== finance_assets =====================
export const financeAssets = pgTable('finance_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 6 }).notNull().default('0'),
  currentPrice: numeric('current_price', { precision: 18, scale: 6 }).notNull().default('0'),
  currency: char('currency', { length: 3 }).notNull().default('EUR'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('finance_assets_owner_idx').on(t.ownerId, t.deletedAt),
]);

// ===================== finance_asset_prices =====================
export const financeAssetPrices = pgTable('finance_asset_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => financeAssets.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 18, scale: 6 }).notNull(),
  date: dateCol('date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('finance_asset_prices_asset_idx').on(t.assetId, t.date),
]);

// ===================== pages =====================
export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  parentId: uuid('parent_id'),
  icon: text('icon'),
  coverMediaId: uuid('cover_media_id'),
  description: text('description'),
  templateId: uuid('template_id'),
  status: text('status').notNull().default('published'),
  tags: jsonb('tags').notNull().default('[]'),
  metadata: jsonb('metadata').notNull().default('{}'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('pages_owner_idx').on(t.ownerId, t.deletedAt),
  index('pages_parent_idx').on(t.parentId),
  index('pages_status_idx').on(t.ownerId, t.status),
  index('pages_slug_owner_idx').on(t.ownerId, t.slug),
]);

// ===================== page_pins =====================
export const pagePins = pgTable('page_pins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('page_pins_user_page_uq').on(t.userId, t.pageId),
  index('page_pins_user_idx').on(t.userId, t.sortOrder),
]);

// ===================== browser_sessions =====================
export const browserSessions = pgTable('browser_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockId: uuid('block_id').notNull().references(() => pageBlocks.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  startUrl: text('start_url').notNull().default(''),
  settings: jsonb('settings').notNull().default('{"zoom":1.0,"darkMode":false}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('browser_sessions_block_idx').on(t.blockId),
  index('browser_sessions_owner_idx').on(t.ownerId),
]);

// ===================== browser_tabs =====================
export const browserTabs = pgTable('browser_tabs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => researchSessions.id, { onDelete: 'cascade' }),
  browserSessionId: uuid('browser_session_id').references(() => browserSessions.id, { onDelete: 'cascade' }),
  url: text('url').notNull().default('about:blank'),
  title: text('title'),
  favicon: text('favicon'),
  isActive: boolean('is_active').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('browser_tabs_session_idx').on(t.sessionId, t.sortOrder),
]);

// ===================== page_blocks =====================
export const pageBlocks = pgTable('page_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  content: jsonb('content').notNull().default('{}'),
  layout: jsonb('layout'),
  metadata: jsonb('metadata'),
  permissions: jsonb('permissions'),
  version: integer('version').notNull().default(1),
  status: text('status').notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('page_blocks_page_idx').on(t.pageId, t.sortOrder),
  index('page_blocks_status_idx').on(t.pageId, t.status),
]);

// ===================== block_versions =====================
export const blockVersions = pgTable('block_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockId: uuid('block_id').notNull().references(() => pageBlocks.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  content: jsonb('content').notNull(),
  layout: jsonb('layout'),
  metadata: jsonb('metadata'),
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  changeType: text('change_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('block_versions_block_idx').on(t.blockId, t.version),
]);

// ===================== page_versions =====================
export const pageVersions = pgTable('page_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  coverMediaId: uuid('cover_media_id'),
  blocks: jsonb('blocks').notNull(),
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  changeType: text('change_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('page_versions_page_idx').on(t.pageId, t.version),
]);

// ===================== page_relations =====================
export const pageRelations = pgTable('page_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourcePageId: uuid('source_page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  targetPageId: uuid('target_page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull().default('reference'),
  label: text('label'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
}, (t) => [
  uniqueIndex('page_relations_uq').on(t.sourcePageId, t.targetPageId, t.relationType),
  index('page_relations_source_idx').on(t.sourcePageId),
  index('page_relations_target_idx').on(t.targetPageId),
]);

// ===================== page_templates =====================
export const pageTemplates = pgTable('page_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  domain: text('domain'),
  blocks: jsonb('blocks').notNull().default('[]'),
  metadata: jsonb('metadata'),
  isSystem: boolean('is_system').notNull().default(false),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('page_templates_domain_idx').on(t.domain),
  index('page_templates_owner_idx').on(t.ownerId),
]);

// ===================== research_sessions =====================
export const researchSessions = pgTable('research_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  blockId: uuid('block_id').references(() => pageBlocks.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mode: text('mode').notNull().default('active'),
  searchHistory: jsonb('search_history').notNull().default('[]'),
  pinnedSources: jsonb('pinned_sources').notNull().default('[]'),
  notes: text('notes'),
  tags: jsonb('tags').notNull().default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('research_sessions_page_idx').on(t.pageId),
  index('research_sessions_block_idx').on(t.blockId),
]);

// ===================== research_sources =====================
export const researchSources = pgTable('research_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => researchSessions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  url: text('url'),
  title: text('title'),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  metadata: jsonb('metadata'),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('research_sources_session_idx').on(t.sessionId),
  index('research_sources_type_idx').on(t.sessionId, t.type),
]);

// ===================== jellyfin_servers =====================
export const jellyfinServers = pgTable('jellyfin_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  apiKey: text('api_key').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('jellyfin_servers_owner_idx').on(t.ownerId),
]);

// ===================== jellyfin_libraries =====================
export const jellyfinLibraries = pgTable('jellyfin_libraries', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').notNull().references(() => jellyfinServers.id, { onDelete: 'cascade' }),
  externalId: text('external_id'),
  name: text('name').notNull(),
  type: text('type'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('jellyfin_libraries_server_idx').on(t.serverId),
  index('jellyfin_libraries_owner_idx').on(t.ownerId),
  uniqueIndex('jellyfin_libraries_server_ext_uq').on(t.serverId, t.externalId),
]);

// ===================== jellyfin_items =====================
export const jellyfinItems = pgTable('jellyfin_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  libraryId: uuid('library_id').notNull().references(() => jellyfinLibraries.id, { onDelete: 'cascade' }),
  externalId: text('external_id'),
  name: text('name').notNull(),
  type: text('type').notNull(),
  path: text('path'),
  watched: boolean('watched').notNull().default(false),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('jellyfin_items_library_idx').on(t.libraryId),
  index('jellyfin_items_owner_idx').on(t.ownerId),
  uniqueIndex('jellyfin_items_library_ext_uq').on(t.libraryId, t.externalId),
]);

// ===================== research_collections =====================
export const researchCollections = pgTable('research_collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => researchSessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sourceIds: jsonb('source_ids').notNull().default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('research_collections_session_idx').on(t.sessionId),
]);

// ===================== page_permissions =====================
export const pagePermissions = pgTable('page_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  subjectType: text('subject_type').notNull(),
  subjectId: uuid('subject_id').notNull(),
  permission: text('permission').notNull(),
  grantedBy: uuid('granted_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('page_permissions_page_idx').on(t.pageId),
  uniqueIndex('page_permissions_uq').on(t.pageId, t.subjectType, t.subjectId),
]);

// ===================== database_pages =====================
export const databasePages = pgTable('database_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }).unique(),
  schema: jsonb('schema').notNull().default('{}'),
  viewConfig: jsonb('view_config').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
