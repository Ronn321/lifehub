import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, asc, desc } from 'drizzle-orm';
import { DbService, pages, pageBlocks, blockVersions, pageVersions, pageRelations, pageTemplates, researchSessions, researchSources, researchCollections, type Db } from '@lifehub/db';
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

  async findPagesByOwner(ownerId: string) {
    return this.db.select().from(pages)
      .where(and(eq(pages.ownerId, ownerId), isNull(pages.deletedAt)))
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
}
