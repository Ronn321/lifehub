import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, asc, desc } from 'drizzle-orm';
import { DbService, pages, pageBlocks, blockVersions, pageVersions, pageRelations, pageTemplates, researchSessions, researchSources, researchCollections, pagePins, browserTabs, browserSessions, browserBookmarks, type Db } from '@lifehub/db';
import type { PageBlock } from '../entities/pages';

export class PagesRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // ========== PAGES ==========

  async createPage(data: {
    ownerId: string;
    title: string;
    slug?: string | null;
    parentId?: string | null;
    icon?: string | null;
    coverMediaId?: string | null;
    description?: string | null;
    templateId?: string | null;
    tags?: string[];
    sortOrder?: number;
  }) {
    const [row] = await this.db.insert(pages).values({
      ownerId: data.ownerId,
      title: data.title,
      slug: data.slug ?? null,
      parentId: data.parentId ?? null,
      icon: data.icon ?? null,
      coverMediaId: data.coverMediaId ?? null,
      description: data.description ?? null,
      templateId: data.templateId ?? null,
      tags: data.tags ?? [],
      sortOrder: data.sortOrder ?? 0,
    }).returning();
    return row;
  }

  async findPageBySlug(slug: string, ownerId: string) {
    const [row] = await this.db
      .select()
      .from(pages)
      .where(and(eq(pages.slug, slug), eq(pages.ownerId, ownerId), isNull(pages.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async slugExists(slug: string, ownerId: string, excludeId?: string): Promise<boolean> {
    let query = sql`SELECT id FROM pages WHERE slug = ${slug} AND owner_id = ${ownerId} AND deleted_at IS NULL`;
    if (excludeId) {
      query = sql`${query} AND id != ${excludeId}`;
    }
    query = sql`${query} LIMIT 1`;
    const [row] = await this.db.execute(query);
    return !!row;
  }

  async findPagesByOwner(ownerId: string) {
    return this.db.select().from(pages)
      .where(and(eq(pages.ownerId, ownerId), isNull(pages.deletedAt)))
      .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
  }

  async findPageChildren(pageId: string, ownerId: string) {
    return this.db.select().from(pages)
      .where(and(
        eq(pages.parentId, pageId),
        eq(pages.ownerId, ownerId),
        isNull(pages.deletedAt),
      ))
      .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
  }

  async findPageById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(pages)
      .where(and(eq(pages.id, id), eq(pages.ownerId, ownerId), isNull(pages.deletedAt)));
    return row ?? null;
  }

  async updatePage(id: string, ownerId: string, data: {
    title?: string;
    parentId?: string | null;
    icon?: string | null;
    coverMediaId?: string | null;
    description?: string | null;
    status?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    sortOrder?: number;
  }) {
    const [row] = await this.db.update(pages)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(pages.id, id), eq(pages.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDeletePage(id: string, ownerId: string) {
    await this.db.update(pages)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(pages.id, id), eq(pages.ownerId, ownerId)));
  }

  async updatePageParent(id: string, ownerId: string, parentId: string | null) {
    const [row] = await this.db.update(pages)
      .set({ parentId, updatedAt: sql`now()` })
      .where(and(eq(pages.id, id), eq(pages.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  // ========== PAGE BLOCKS ==========

  async createBlock(data: {
    pageId: string;
    type: string;
    content?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    sortOrder?: number;
  }) {
    const [row] = await this.db.insert(pageBlocks).values({
      pageId: data.pageId,
      type: data.type,
      content: (data.content ?? {}) as typeof pageBlocks.$inferInsert.content,
      layout: data.layout as typeof pageBlocks.$inferInsert.layout ?? null,
      metadata: data.metadata as typeof pageBlocks.$inferInsert.metadata ?? null,
      sortOrder: data.sortOrder ?? 0,
    }).returning();
    return row;
  }

  async findBlocksByPage(pageId: string) {
    return this.db.select().from(pageBlocks)
      .where(and(eq(pageBlocks.pageId, pageId), isNull(pageBlocks.deletedAt)))
      .orderBy(asc(pageBlocks.sortOrder), asc(pageBlocks.createdAt));
  }

  async findBlockById(id: string) {
    const [row] = await this.db.select().from(pageBlocks)
      .where(eq(pageBlocks.id, id));
    return row ?? null;
  }

  async updateBlock(id: string, data: Partial<{
    type: string;
    content: Record<string, unknown>;
    layout: Record<string, unknown>;
    metadata: Record<string, unknown>;
    permissions: Record<string, unknown>;
    status: string;
    sortOrder: number;
  }>) {
    const [row] = await this.db.update(pageBlocks)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(pageBlocks.id, id))
      .returning();
    return row ?? null;
  }

  async deleteBlock(id: string) {
    await this.db.update(pageBlocks)
      .set({ deletedAt: sql`now()`, status: 'archived' })
      .where(eq(pageBlocks.id, id));
  }

  async updateBlockSortOrder(id: string, sortOrder: number) {
    await this.db.update(pageBlocks)
      .set({ sortOrder, updatedAt: sql`now()` })
      .where(eq(pageBlocks.id, id));
  }

  // ========== BLOCK VERSIONS ==========

  async createBlockVersion(data: {
    blockId: string;
    version: number;
    content: Record<string, unknown>;
    layout?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    changedBy: string;
    changeType: string;
  }) {
    const [row] = await this.db.insert(blockVersions).values({
      blockId: data.blockId,
      version: data.version,
      content: data.content as typeof blockVersions.$inferInsert.content,
      layout: data.layout as typeof blockVersions.$inferInsert.layout ?? null,
      metadata: data.metadata as typeof blockVersions.$inferInsert.metadata ?? null,
      changedBy: data.changedBy,
      changeType: data.changeType,
    }).returning();
    return row;
  }

  async findBlockVersions(blockId: string) {
    return this.db.select().from(blockVersions)
      .where(eq(blockVersions.blockId, blockId))
      .orderBy(desc(blockVersions.version));
  }

  async findBlockVersion(blockId: string, version: number) {
    const [row] = await this.db.select().from(blockVersions)
      .where(and(eq(blockVersions.blockId, blockId), eq(blockVersions.version, version)));
    return row ?? null;
  }

  // ========== PAGE VERSIONS ==========

  async createPageVersion(data: {
    pageId: string;
    version: number;
    title: string;
    description?: string;
    icon?: string;
    coverMediaId?: string;
    blocks: PageBlock[];
    changedBy: string;
    changeType: string;
  }) {
    const [row] = await this.db.insert(pageVersions).values({
      pageId: data.pageId,
      version: data.version,
      title: data.title,
      description: data.description ?? null,
      icon: data.icon ?? null,
      coverMediaId: data.coverMediaId ?? null,
      blocks: data.blocks as typeof pageVersions.$inferInsert.blocks,
      changedBy: data.changedBy,
      changeType: data.changeType,
    }).returning();
    return row;
  }

  async findPageVersions(pageId: string) {
    return this.db.select().from(pageVersions)
      .where(eq(pageVersions.pageId, pageId))
      .orderBy(desc(pageVersions.version));
  }

  async findPageVersion(pageId: string, version: number) {
    const [row] = await this.db.select().from(pageVersions)
      .where(and(eq(pageVersions.pageId, pageId), eq(pageVersions.version, version)));
    return row ?? null;
  }

  async getLatestPageVersion(pageId: string): Promise<number> {
    const [row] = await this.db.select({ maxVersion: sql<number>`max(${pageVersions.version})` })
      .from(pageVersions)
      .where(eq(pageVersions.pageId, pageId));
    return row?.maxVersion ?? 0;
  }

  async getLatestBlockVersion(blockId: string): Promise<number> {
    const [row] = await this.db.select({ maxVersion: sql<number>`max(${blockVersions.version})` })
      .from(blockVersions)
      .where(eq(blockVersions.blockId, blockId));
    return row?.maxVersion ?? 0;
  }

  // ========== PAGE RELATIONS ==========

  async createRelation(data: {
    sourcePageId: string;
    targetPageId: string;
    relationType: string;
    label?: string;
    metadata?: Record<string, unknown>;
    createdBy: string;
  }) {
    const [row] = await this.db.insert(pageRelations).values({
      sourcePageId: data.sourcePageId,
      targetPageId: data.targetPageId,
      relationType: data.relationType,
      label: data.label ?? null,
      metadata: data.metadata as typeof pageRelations.$inferInsert.metadata ?? null,
      createdBy: data.createdBy,
    }).returning();
    return row;
  }

  async findRelationsByPage(pageId: string) {
    return this.db.select().from(pageRelations)
      .where(sql`${pageRelations.sourcePageId} = ${pageId} OR ${pageRelations.targetPageId} = ${pageId}`);
  }

  async deleteRelation(id: string) {
    await this.db.delete(pageRelations).where(eq(pageRelations.id, id));
  }

  // ========== PAGE TEMPLATES ==========

  async createTemplate(data: {
    name: string;
    description?: string;
    icon?: string;
    domain?: string;
    blocks?: Array<{ type: string; content: Record<string, unknown>; sortOrder: number }>;
    metadata?: Record<string, unknown>;
    ownerId?: string;
  }) {
    const [row] = await this.db.insert(pageTemplates).values({
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? null,
      domain: data.domain ?? null,
      blocks: (data.blocks ?? []) as typeof pageTemplates.$inferInsert.blocks,
      metadata: data.metadata as typeof pageTemplates.$inferInsert.metadata ?? null,
      ownerId: data.ownerId ?? null,
    }).returning();
    return row;
  }

  async findTemplates(domain?: string) {
    const conditions = [isNull(pageTemplates.deletedAt)];
    if (domain) conditions.push(eq(pageTemplates.domain, domain));
    return this.db.select().from(pageTemplates)
      .where(and(...conditions))
      .orderBy(asc(pageTemplates.name));
  }

  async findTemplateById(id: string) {
    const [row] = await this.db.select().from(pageTemplates)
      .where(and(eq(pageTemplates.id, id), isNull(pageTemplates.deletedAt)));
    return row ?? null;
  }

  async updateTemplate(id: string, data: Partial<{
    name: string;
    description: string;
    icon: string;
    domain: string;
    blocks: Array<{ type: string; content: Record<string, unknown>; sortOrder: number }>;
    metadata: Record<string, unknown>;
  }>) {
    const [row] = await this.db.update(pageTemplates)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(pageTemplates.id, id))
      .returning();
    return row ?? null;
  }

  async deleteTemplate(id: string) {
    await this.db.update(pageTemplates)
      .set({ deletedAt: sql`now()` })
      .where(eq(pageTemplates.id, id));
  }

  // ========== RESEARCH SESSIONS ==========

  async createResearchSession(data: {
    pageId: string;
    blockId?: string;
    name: string;
    notes?: string;
    tags?: string[];
  }) {
    const [row] = await this.db.insert(researchSessions).values({
      pageId: data.pageId,
      blockId: data.blockId ?? null,
      name: data.name,
      notes: data.notes ?? null,
      tags: data.tags ?? [],
    }).returning();
    return row;
  }

  async findResearchSessionsByPage(pageId: string) {
    return this.db.select().from(researchSessions)
      .where(and(eq(researchSessions.pageId, pageId), isNull(researchSessions.deletedAt)))
      .orderBy(desc(researchSessions.updatedAt));
  }

  async findResearchSessionById(id: string) {
    const [row] = await this.db.select().from(researchSessions)
      .where(and(eq(researchSessions.id, id), isNull(researchSessions.deletedAt)));
    return row ?? null;
  }

  async updateResearchSession(id: string, data: Partial<{
    name: string;
    mode: string;
    notes: string;
    tags: string[];
    searchHistory: string[];
    pinnedSources: string[];
  }>) {
    const [row] = await this.db.update(researchSessions)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(researchSessions.id, id))
      .returning();
    return row ?? null;
  }

  async deleteResearchSession(id: string) {
    await this.db.update(researchSessions)
      .set({ deletedAt: sql`now()` })
      .where(eq(researchSessions.id, id));
  }

  // ========== RESEARCH SOURCES ==========

  async createResearchSource(data: {
    sessionId: string;
    type: string;
    url?: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    const [row] = await this.db.insert(researchSources).values({
      sessionId: data.sessionId,
      type: data.type,
      url: data.url ?? null,
      title: data.title ?? null,
      description: data.description ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      metadata: data.metadata as typeof researchSources.$inferInsert.metadata ?? null,
    }).returning();
    return row;
  }

  async findResearchSourcesBySession(sessionId: string) {
    return this.db.select().from(researchSources)
      .where(eq(researchSources.sessionId, sessionId))
      .orderBy(desc(researchSources.createdAt));
  }

  async deleteResearchSource(id: string) {
    await this.db.delete(researchSources).where(eq(researchSources.id, id));
  }

  async togglePinSource(id: string, isPinned: boolean) {
    await this.db.update(researchSources)
      .set({ isPinned })
      .where(eq(researchSources.id, id));
  }

  // ========== RESEARCH COLLECTIONS ==========

  async createResearchCollection(data: {
    sessionId: string;
    name: string;
    description?: string;
    sourceIds?: string[];
  }) {
    const [row] = await this.db.insert(researchCollections).values({
      sessionId: data.sessionId,
      name: data.name,
      description: data.description ?? null,
      sourceIds: data.sourceIds ?? [],
    }).returning();
    return row;
  }

  async findResearchCollectionsBySession(sessionId: string) {
    return this.db.select().from(researchCollections)
      .where(eq(researchCollections.sessionId, sessionId))
      .orderBy(asc(researchCollections.name));
  }

  async updateResearchCollection(id: string, data: Partial<{
    name: string;
    description: string;
    sourceIds: string[];
  }>) {
    const [row] = await this.db.update(researchCollections)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(researchCollections.id, id))
      .returning();
    return row ?? null;
  }

  async deleteResearchCollection(id: string) {
    await this.db.delete(researchCollections).where(eq(researchCollections.id, id));
  }

  // ========== SEARCH ==========

  async searchPages(ownerId: string, query: string) {
    const pattern = `%${query}%`;
    return this.db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.ownerId, ownerId),
          isNull(pages.deletedAt),
          sql`(
            ${pages.title} ILIKE ${pattern}
            OR EXISTS (
              SELECT 1 FROM ${pageBlocks}
              WHERE ${pageBlocks.pageId} = ${pages.id}
                AND ${pageBlocks.deletedAt} IS NULL
                AND ${pageBlocks.content}->>'text' ILIKE ${pattern}
            )
          )`,
        ),
      )
      .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
  }

  /**
   * Recursively find all descendant page IDs to prevent circular references on move.
   */
  async findDescendantIds(pageId: string, ownerId: string): Promise<string[]> {
    const children = await this.db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.parentId, pageId), eq(pages.ownerId, ownerId), isNull(pages.deletedAt)));
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      const grandchildIds = await this.findDescendantIds(child.id, ownerId);
      ids.push(...grandchildIds);
    }
    return ids;
  }

  // ========== PAGE PINS ==========

  async addPagePin(userId: string, pageId: string, sortOrder?: number) {
    const [row] = await this.db.insert(pagePins).values({
      userId,
      pageId,
      sortOrder: sortOrder ?? 0,
    }).onConflictDoNothing().returning();
    return row ?? null;
  }

  async removePagePin(userId: string, pageId: string) {
    await this.db.delete(pagePins)
      .where(and(eq(pagePins.userId, userId), eq(pagePins.pageId, pageId)));
  }

  async findPinnedPages(userId: string) {
    return this.db.select({
      pageId: pagePins.pageId,
      sortOrder: pagePins.sortOrder,
      title: pages.title,
      slug: pages.slug,
      icon: pages.icon,
      description: pages.description,
    }).from(pagePins)
      .innerJoin(pages, eq(pagePins.pageId, pages.id))
      .where(and(eq(pagePins.userId, userId), isNull(pages.deletedAt)))
      .orderBy(asc(pagePins.sortOrder));
  }

  async isPagePinned(userId: string, pageId: string): Promise<boolean> {
    const [row] = await this.db.select({ id: pagePins.id }).from(pagePins)
      .where(and(eq(pagePins.userId, userId), eq(pagePins.pageId, pageId)))
      .limit(1);
    return !!row;
  }

  async reorderPagePins(userId: string, items: Array<{ pageId: string; sortOrder: number }>) {
    for (const item of items) {
      await this.db.update(pagePins)
        .set({ sortOrder: item.sortOrder })
        .where(and(eq(pagePins.userId, userId), eq(pagePins.pageId, item.pageId)));
    }
  }

  // ========== BROWSER TABS ==========

  async createBrowserTab(data: {
    sessionId: string;
    url?: string;
    title?: string;
    favicon?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const [row] = await this.db.insert(browserTabs).values({
      sessionId: data.sessionId,
      url: data.url ?? 'about:blank',
      title: data.title ?? null,
      favicon: data.favicon ?? null,
      isActive: data.isActive ?? false,
      sortOrder: data.sortOrder ?? 0,
    }).returning();
    return row;
  }

  async findBrowserTabsBySession(sessionId: string) {
    return this.db.select().from(browserTabs)
      .where(eq(browserTabs.sessionId, sessionId))
      .orderBy(asc(browserTabs.sortOrder));
  }

  async updateBrowserTab(id: string, data: Partial<{
    url: string;
    title: string;
    favicon: string;
    isActive: boolean;
    sortOrder: number;
  }>) {
    const [row] = await this.db.update(browserTabs)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(browserTabs.id, id))
      .returning();
    return row ?? null;
  }

  async deleteBrowserTab(id: string) {
    await this.db.delete(browserTabs).where(eq(browserTabs.id, id));
  }

  async setActiveBrowserTab(sessionId: string, tabId: string) {
    // Deactivate all tabs in session
    await this.db.update(browserTabs)
      .set({ isActive: false })
      .where(eq(browserTabs.sessionId, sessionId));
    // Activate the selected tab
    await this.db.update(browserTabs)
      .set({ isActive: true })
      .where(eq(browserTabs.id, tabId));
  }

  // ========== BROWSER SESSIONS ==========

  async createBrowserSession(data: {
    blockId: string;
    ownerId: string;
    startUrl?: string;
    settings?: Record<string, unknown>;
  }) {
    const [row] = await this.db.insert(browserSessions).values({
      blockId: data.blockId,
      ownerId: data.ownerId,
      startUrl: data.startUrl ?? '',
      settings: (data.settings ?? { zoom: 1.0, darkMode: false }) as typeof browserSessions.$inferInsert.settings,
    }).returning();
    return row;
  }

  async findBrowserSessionByBlock(blockId: string, ownerId: string) {
    const [row] = await this.db.select().from(browserSessions)
      .where(and(eq(browserSessions.blockId, blockId), eq(browserSessions.ownerId, ownerId)));
    return row ?? null;
  }

  async findBrowserSessionById(id: string) {
    const [row] = await this.db.select().from(browserSessions)
      .where(eq(browserSessions.id, id));
    return row ?? null;
  }

  async updateBrowserSession(id: string, data: Partial<{
    startUrl: string;
    settings: Record<string, unknown>;
  }>) {
    const [row] = await this.db.update(browserSessions)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(browserSessions.id, id))
      .returning();
    return row ?? null;
  }

  async findBrowserTabsByBrowserSession(browserSessionId: string) {
    return this.db.select().from(browserTabs)
      .where(eq(browserTabs.browserSessionId as any, browserSessionId))
      .orderBy(asc(browserTabs.sortOrder));
  }

  // ========== BROWSER BOOKMARKS ==========

  async createBrowserBookmark(data: {
    sessionId: string;
    url: string;
    title?: string;
    faviconUrl?: string;
    folder?: string;
  }) {
    const [row] = await this.db.insert(browserBookmarks).values({
      sessionId: data.sessionId,
      url: data.url,
      title: data.title ?? null,
      faviconUrl: data.faviconUrl ?? null,
      folder: data.folder ?? '',
    }).returning();
    return row;
  }

  async findBrowserBookmarks(sessionId: string) {
    return this.db.select().from(browserBookmarks)
      .where(eq(browserBookmarks.sessionId, sessionId))
      .orderBy(asc(browserBookmarks.sortOrder));
  }

  async deleteBrowserBookmark(id: string) {
    await this.db.delete(browserBookmarks).where(eq(browserBookmarks.id, id));
  }
}
