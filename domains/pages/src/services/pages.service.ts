import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { EventsService, createEventType } from '@lifehub/events';
import { PagesRepository } from '../repositories/pages.repository';
import type {
  CreatePageInput, UpdatePageInput, CreateBlockInput, UpdateBlockInput, ReorderBlocksInput,
  CreateRelationInput, CreateTemplateInput, UpdateTemplateInput,
  CreateResearchSessionInput, UpdateResearchSessionInput,
  CreateResearchSourceInput, CreateResearchCollectionInput,
  PagePermissionOverrideInput,
} from '../dtos/pages.dto';

export const PageCreated = createEventType<{ pageId: string; title: string }>('page.created');
export const PageUpdated = createEventType<{ pageId: string; title: string }>('page.updated');
export const PageDeleted = createEventType<{ pageId: string }>('page.deleted');
export const BlockCreated = createEventType<{ blockId: string; pageId: string; type: string }>('block.created');
export const BlockUpdated = createEventType<{ blockId: string; pageId: string }>('block.updated');
export const BlockDeleted = createEventType<{ blockId: string; pageId: string }>('block.deleted');
export const TemplateCreated = createEventType<{ templateId: string; name: string }>('template.created');
export const RelationCreated = createEventType<{ relationId: string; sourcePageId: string; targetPageId: string }>('relation.created');

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    private readonly repo: PagesRepository,
    @Inject(EventsService) private readonly events: EventsService,
  ) {}

  // ========== PAGES ==========

  async createPage(ownerId: string, input: CreatePageInput) {
    let templateBlocks: Array<{ type: string; content: Record<string, unknown>; sortOrder: number }> | undefined;

    // Auto-generate slug from title if not provided
    let slug = input.slug;
    if (!slug) {
      slug = this.slugify(input.title);
      let attempt = 0;
      while (await this.repo.slugExists(slug, ownerId)) {
        attempt++;
        slug = `${this.slugify(input.title)}-${attempt}`;
      }
    } else if (await this.repo.slugExists(slug, ownerId)) {
      throw new Error('Dieser Seiten-Name (Slug) wird bereits verwendet');
    }

    if (input.templateId) {
      const template = await this.repo.findTemplateById(input.templateId);
      if (template) {
        templateBlocks = template.blocks as Array<{ type: string; content: Record<string, unknown>; sortOrder: number }>;
      }
    }

    const page = await this.repo.createPage({ ...input, ownerId, slug });
    if (!page) throw new Error('Seite konnte nicht angelegt werden');

    if (templateBlocks) {
      for (const block of templateBlocks) {
        await this.repo.createBlock({
          pageId: page.id,
          type: block.type,
          content: block.content,
          sortOrder: block.sortOrder,
        });
      }
    }

    await this.events.emit(PageCreated.create(page.id, { pageId: page.id, title: page.title }));
    return page;
  }

  async listPages(ownerId: string) {
    const flatPages = await this.repo.findPagesByOwner(ownerId);
    return this.buildTree(flatPages);
  }

  async getPageChildren(ownerId: string, id: string) {
    const page = await this.repo.findPageById(id, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    return this.repo.findPageChildren(id, ownerId);
  }

  async getPageWithBlocks(ownerId: string, id: string) {
    const page = await this.repo.findPageById(id, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const blocks = await this.repo.findBlocksByPage(id);
    const relations = await this.repo.findRelationsByPage(id);
    return { ...page, blocks, relations };
  }

  async updatePage(ownerId: string, id: string, input: UpdatePageInput) {
    const page = await this.repo.findPageById(id, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');

    // Create page version before update
    const blocks = await this.repo.findBlocksByPage(id);
    const latestVersion = await this.repo.getLatestPageVersion(id);
    await this.repo.createPageVersion({
      pageId: id,
      version: latestVersion + 1,
      title: page.title,
      description: page.description ?? undefined,
      icon: page.icon ?? undefined,
      coverMediaId: page.coverMediaId ?? undefined,
      blocks: blocks as any,
      changedBy: ownerId,
      changeType: 'updated',
    });

    const updated = await this.repo.updatePage(id, ownerId, input);
    await this.events.emit(PageUpdated.create(id, { pageId: id, title: page.title }));
    return updated;
  }

  async deletePage(ownerId: string, id: string) {
    const page = await this.repo.findPageById(id, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    await this.repo.softDeletePage(id, ownerId);
    await this.events.emit(PageDeleted.create(id, { pageId: id }));
  }

  async getPageVersions(ownerId: string, pageId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    return this.repo.findPageVersions(pageId);
  }

  async restorePageVersion(ownerId: string, pageId: string, version: number) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');

    const pageVersion = await this.repo.findPageVersion(pageId, version);
    if (!pageVersion) throw new NotFoundException('Version nicht gefunden');

    // Restore blocks from version
    const blocks = pageVersion.blocks as Array<{ type: string; content: Record<string, unknown>; sortOrder: number }>;
    const currentBlocks = await this.repo.findBlocksByPage(pageId);

    // Archive current blocks
    for (const block of currentBlocks) {
      await this.repo.updateBlock(block.id, { status: 'archived' });
    }

    // Create new blocks from version
    for (const block of blocks) {
      await this.repo.createBlock({
        pageId,
        type: block.type,
        content: block.content,
        sortOrder: block.sortOrder,
      });
    }

    return this.repo.findPageById(pageId, ownerId);
  }

  // ========== BLOCKS ==========

  async addBlock(ownerId: string, pageId: string, input: CreateBlockInput) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');

    const block = await this.repo.createBlock({ pageId, ...input });
    if (!block) throw new Error('Block konnte nicht erstellt werden');

    // Create initial version (fire-and-forget, don't block on error)
    try {
      await this.repo.createBlockVersion({
        blockId: block.id,
        version: 1,
        content: input.content ?? {},
        layout: input.layout,
        metadata: input.metadata,
        changedBy: ownerId,
        changeType: 'created',
      });
    } catch (err) {
      this.logger.warn(`Failed to create initial block version for ${block.id}: ${err}`);
    }

    await this.events.emit(BlockCreated.create(block.id, { blockId: block.id, pageId, type: input.type }));
    return block;
  }

  async updateBlock(ownerId: string, pageId: string, blockId: string, input: UpdateBlockInput) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const block = await this.repo.findBlockById(blockId);
    if (!block) throw new NotFoundException('Block nicht gefunden');

    // Create version before update
    const latestVersion = await this.repo.getLatestBlockVersion(blockId);
    await this.repo.createBlockVersion({
      blockId,
      version: latestVersion + 1,
      content: input.content ?? (block!.content as Record<string, unknown>),
      layout: input.layout ?? (block!.layout as Record<string, unknown>),
      metadata: input.metadata ?? (block!.metadata as Record<string, unknown>),
      changedBy: ownerId,
      changeType: 'updated',
    });

    // Update block version counter
    const updated = await this.repo.updateBlock(blockId, {
      ...input,
    });

    await this.events.emit(BlockUpdated.create(blockId, { blockId, pageId }));
    return updated;
  }

  async deleteBlock(ownerId: string, pageId: string, blockId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    await this.repo.deleteBlock(blockId);
    await this.events.emit(BlockDeleted.create(blockId, { blockId, pageId }));
  }

  async reorderBlocks(ownerId: string, pageId: string, input: ReorderBlocksInput) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    for (const block of input.blocks) {
      await this.repo.updateBlockSortOrder(block.id, block.sortOrder);
    }
  }

  async getBlockVersions(ownerId: string, pageId: string, blockId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    return this.repo.findBlockVersions(blockId);
  }

  async restoreBlockVersion(ownerId: string, pageId: string, blockId: string, version: number) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');

    const blockVersion = await this.repo.findBlockVersion(blockId, version);
    if (!blockVersion) throw new NotFoundException('Version nicht gefunden');

    // Restore block content from version
    const updated = await this.repo.updateBlock(blockId, {
      content: blockVersion.content as Record<string, unknown>,
      layout: blockVersion.layout as Record<string, unknown>,
      metadata: blockVersion.metadata as Record<string, unknown>,
    });

    // Create new version entry for the restore
    const latestVersion = await this.repo.getLatestBlockVersion(blockId);
    await this.repo.createBlockVersion({
      blockId,
      version: latestVersion + 1,
      content: blockVersion.content as Record<string, unknown>,
      layout: blockVersion.layout as Record<string, unknown>,
      metadata: blockVersion.metadata as Record<string, unknown>,
      changedBy: ownerId,
      changeType: 'restored',
    });

    return updated;
  }

  // ========== PAGE RELATIONS ==========

  async createRelation(ownerId: string, sourcePageId: string, input: CreateRelationInput) {
    const sourcePage = await this.repo.findPageById(sourcePageId, ownerId);
    if (!sourcePage) throw new NotFoundException('Quellseite nicht gefunden');

    const targetPage = await this.repo.findPageById(input.targetPageId, ownerId);
    if (!targetPage) throw new NotFoundException('Zielseite nicht gefunden');

    const relation = await this.repo.createRelation({
      sourcePageId,
      targetPageId: input.targetPageId,
      relationType: input.relationType,
      label: input.label,
      metadata: input.metadata,
      createdBy: ownerId,
    });

    await this.events.emit(RelationCreated.create(relation!.id, {
      relationId: relation!.id,
      sourcePageId,
      targetPageId: input.targetPageId,
    }));

    return relation;
  }

  async getRelations(ownerId: string, pageId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    return this.repo.findRelationsByPage(pageId);
  }

  async deleteRelation(ownerId: string, relationId: string) {
    await this.repo.deleteRelation(relationId);
  }

  // ========== PAGE TEMPLATES ==========

  async createTemplate(ownerId: string, input: CreateTemplateInput) {
    const template = await this.repo.createTemplate({ ...input, ownerId });
    await this.events.emit(TemplateCreated.create(template!.id, { templateId: template!.id, name: template!.name }));
    return template;
  }

  async listTemplates(domain?: string) {
    return this.repo.findTemplates(domain);
  }

  async getTemplate(id: string) {
    const template = await this.repo.findTemplateById(id);
    if (!template) throw new NotFoundException('Template nicht gefunden');
    return template;
  }

  async updateTemplate(id: string, input: UpdateTemplateInput) {
    const template = await this.repo.findTemplateById(id);
    if (!template) throw new NotFoundException('Template nicht gefunden');
    return this.repo.updateTemplate(id, input);
  }

  async deleteTemplate(id: string) {
    const template = await this.repo.findTemplateById(id);
    if (!template) throw new NotFoundException('Template nicht gefunden');
    await this.repo.deleteTemplate(id);
  }

  // ========== RESEARCH WORKSPACE ==========

  async createResearchSession(ownerId: string, input: CreateResearchSessionInput) {
    const page = await this.repo.findPageById(input.pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    return this.repo.createResearchSession(input);
  }

  async getResearchSessions(ownerId: string, pageId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    return this.repo.findResearchSessionsByPage(pageId);
  }

  async getResearchSession(ownerId: string, sessionId: string) {
    const session = await this.repo.findResearchSessionById(sessionId);
    if (!session) throw new NotFoundException('Session nicht gefunden');
    return session;
  }

  async updateResearchSession(ownerId: string, sessionId: string, input: UpdateResearchSessionInput) {
    const session = await this.repo.findResearchSessionById(sessionId);
    if (!session) throw new NotFoundException('Session nicht gefunden');
    return this.repo.updateResearchSession(sessionId, input);
  }

  async deleteResearchSession(ownerId: string, sessionId: string) {
    const session = await this.repo.findResearchSessionById(sessionId);
    if (!session) throw new NotFoundException('Session nicht gefunden');
    await this.repo.deleteResearchSession(sessionId);
  }

  // ========== RESEARCH SOURCES ==========

  async addResearchSource(ownerId: string, input: CreateResearchSourceInput) {
    return this.repo.createResearchSource(input);
  }

  async getResearchSources(ownerId: string, sessionId: string) {
    return this.repo.findResearchSourcesBySession(sessionId);
  }

  async deleteResearchSource(ownerId: string, sourceId: string) {
    await this.repo.deleteResearchSource(sourceId);
  }

  async togglePinSource(ownerId: string, sourceId: string, isPinned: boolean) {
    await this.repo.togglePinSource(sourceId, isPinned);
  }

  // ========== RESEARCH COLLECTIONS ==========

  async createResearchCollection(ownerId: string, input: CreateResearchCollectionInput) {
    return this.repo.createResearchCollection(input);
  }

  async getResearchCollections(ownerId: string, sessionId: string) {
    return this.repo.findResearchCollectionsBySession(sessionId);
  }

  async updateResearchCollection(ownerId: string, collectionId: string, data: Partial<{
    name: string;
    description: string;
    sourceIds: string[];
  }>) {
    return this.repo.updateResearchCollection(collectionId, data);
  }

  async deleteResearchCollection(ownerId: string, collectionId: string) {
    await this.repo.deleteResearchCollection(collectionId);
  }

  // ========== HELPERS ==========

  private buildTree(flatPages: Array<Record<string, unknown>>) {
    const map = new Map<string, Record<string, unknown>>();
    const roots: Array<Record<string, unknown>> = [];

    for (const page of flatPages) {
      map.set(page.id as string, { ...page, children: [] });
    }

    for (const page of flatPages) {
      const node = map.get(page.id as string)!;
      if (page.parentId && map.has(page.parentId as string)) {
        (map.get(page.parentId as string)!.children as Array<Record<string, unknown>>).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /** Convert a title to an URL-safe slug */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[ä]/g, 'ae').replace(/[ö]/g, 'oe').replace(/[ü]/g, 'ue').replace(/[ß]/g, 'ss')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'page';
  }

  // ========== PAGE PINS ==========

  async getPinnedPages(userId: string) {
    return this.repo.findPinnedPages(userId);
  }

  async addPin(userId: string, pageId: string) {
    return this.repo.addPagePin(userId, pageId);
  }

  async removePin(userId: string, pageId: string) {
    return this.repo.removePagePin(userId, pageId);
  }

  async isPinned(userId: string, pageId: string): Promise<boolean> {
    return this.repo.isPagePinned(userId, pageId);
  }

  // ========== PAGE BY SLUG ==========

  async getPageBySlug(ownerId: string, slug: string) {
    const page = await this.repo.findPageBySlug(slug, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const blocks = await this.repo.findBlocksByPage(page.id);
    const relations = await this.repo.findRelationsByPage(page.id);
    return { ...page, blocks, relations };
  }

  // ========== SEARCH ==========

  async searchPages(ownerId: string, query: string) {
    if (!query || query.trim().length === 0) return [];
    const pages = await this.repo.searchPages(ownerId, query.trim());
    const results = await Promise.all(
      pages.map(async (page) => {
        const blocks = await this.repo.findBlocksByPage(page.id);
        return { ...page, blocks };
      }),
    );
    return results;
  }

  // ========== MOVE PAGE ==========

  async movePage(ownerId: string, pageId: string, newParentId: string | null) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');

    // If newParentId is set, verify target page exists and belongs to owner
    if (newParentId) {
      const target = await this.repo.findPageById(newParentId, ownerId);
      if (!target) throw new NotFoundException('Ziel-Seite nicht gefunden');

      // Prevent circular reference: page cannot be moved into its own descendant
      const descendantIds = await this.repo.findDescendantIds(pageId, ownerId);
      if (descendantIds.includes(newParentId)) {
        throw new BadRequestException('Seite kann nicht in eine eigene Unterseite verschoben werden');
      }
    }

    const updated = await this.repo.updatePageParent(pageId, ownerId, newParentId);
    await this.events.emit(PageUpdated.create(pageId, { pageId, title: page.title }));
    return updated;
  }

  // ========== PAGE PERMISSION OVERRIDES ==========

  async getPagePermissions(ownerId: string, pageId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const metadata = (page.metadata as Record<string, unknown>) ?? {};
    return (metadata.permissions as Array<Record<string, unknown>>) ?? [];
  }

  async updatePagePermissions(ownerId: string, pageId: string, overrides: Array<{
    subjectType: 'user' | 'role';
    subjectId: string;
    permission: 'read' | 'write' | 'admin';
  }>) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const metadata = { ...((page.metadata as Record<string, unknown>) ?? {}), permissions: overrides };
    await this.repo.updatePage(pageId, ownerId, { metadata });
    return overrides;
  }

  // ========== BROWSER TABS ==========

  async getBrowserTabs(sessionId: string) {
    return this.repo.findBrowserTabsBySession(sessionId);
  }

  async createBrowserTab(sessionId: string, data: { url?: string; title?: string }) {
    const tabs = await this.repo.findBrowserTabsBySession(sessionId);
    // First tab becomes active automatically
    const isFirst = tabs.length === 0;
    return this.repo.createBrowserTab({
      sessionId,
      url: data.url,
      title: data.title,
      isActive: isFirst,
      sortOrder: tabs.length,
    });
  }

  async updateBrowserTab(tabId: string, data: { url?: string; title?: string; isActive?: boolean }) {
    return this.repo.updateBrowserTab(tabId, data);
  }

  async deleteBrowserTab(tabId: string) {
    await this.repo.deleteBrowserTab(tabId);
  }

  async setActiveBrowserTab(sessionId: string, tabId: string) {
    await this.repo.setActiveBrowserTab(sessionId, tabId);
  }

  // ========== BROWSER SESSIONS ==========

  async getOrCreateBrowserSession(ownerId: string, blockId: string, startUrl?: string) {
    const existing = await this.repo.findBrowserSessionByBlock(blockId, ownerId);
    if (existing) return existing;
    const created = await this.repo.createBrowserSession({ blockId, ownerId, startUrl });
    if (!created) throw new Error('Browser-Session konnte nicht erstellt werden');
    return created;
  }

  async getBrowserSession(ownerId: string, blockId: string) {
    return this.repo.findBrowserSessionByBlock(blockId, ownerId);
  }

  async updateBrowserSession(ownerId: string, sessionId: string, data: Partial<{
    startUrl: string;
    settings: Record<string, unknown>;
  }>) {
    const session = await this.repo.findBrowserSessionById(sessionId);
    if (!session) throw new NotFoundException('Browser-Session nicht gefunden');
    return this.repo.updateBrowserSession(sessionId, data);
  }

  async findPageBySlug(ownerId: string, slug: string) {
    return this.repo.findPageBySlug(slug, ownerId);
  }

  // ========== IMPORT / EXPORT ==========

  /**
   * Export a page as structured JSON including blocks and relations.
   */
  async exportPageJson(ownerId: string, pageId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const blocks = await this.repo.findBlocksByPage(pageId);
    const relations = await this.repo.findRelationsByPage(pageId);
    return { page, blocks, relations };
  }

  /**
   * Export a page as simplified Markdown.
   * Iterates blocks, converting text blocks to paragraphs,
   * headings to # ## ###, etc.
   */
  async exportPageMarkdown(ownerId: string, pageId: string): Promise<string> {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const blocks = await this.repo.findBlocksByPage(pageId);

    const lines: string[] = [];

    // Title as H1
    lines.push(`# ${page.title}`);
    if (page.description) {
      lines.push('');
      lines.push(page.description);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const block of blocks) {
      const content = block.content as Record<string, unknown> ?? {};
      const text = (content.text as string) ?? '';

      switch (block.type) {
        case 'heading': {
          const level = (content.level as number) ?? 1;
          const safeLevel = Math.min(Math.max(level, 1), 6);
          lines.push(`${'#'.repeat(safeLevel)} ${text}`);
          break;
        }
        case 'text':
          lines.push(text);
          lines.push('');
          break;
        case 'quote':
          lines.push(`> ${text.replace(/\n/g, '\n> ')}`);
          lines.push('');
          break;
        case 'code': {
          const language = (content.language as string) ?? '';
          lines.push('```' + language);
          lines.push(text);
          lines.push('```');
          break;
        }
        case 'todo': {
          const checked = !!(content.checked ?? false);
          lines.push(`- [${checked ? 'x' : ' '}] ${text}`);
          break;
        }
        case 'divider':
          lines.push('---');
          break;
        case 'callout':
          lines.push(`> **${(content.calloutType as string) ?? 'info'}:** ${text}`);
          lines.push('');
          break;
        case 'image': {
          const src = (content.src as string) ?? '';
          const alt = (content.alt as string) ?? '';
          if (src) lines.push(`![${alt}](${src})`);
          break;
        }
        case 'bookmark': {
          const url = (content.url as string) ?? '';
          const title = (content.title as string) ?? url;
          if (url) lines.push(`[${title}](${url})`);
          break;
        }
        case 'link': {
          const url = (content.url as string) ?? '';
          lines.push(`[${text}](${url})`);
          break;
        }
        case 'table': {
          const rows = (content.rows as string[][]) ?? [];
          for (const row of rows) {
            lines.push('| ' + row.join(' | ') + ' |');
          }
          if (rows.length > 1) {
            // Add header separator after first row
            const sep = rows[0]?.map(() => '---').join(' | ');
            lines.splice(lines.length - rows.length, 0, '| ' + sep + ' |');
          }
          break;
        }
        case 'checklist': {
          const items = (content.items as Array<{ text: string; checked: boolean }>) ?? [];
          for (const item of items) {
            lines.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`);
          }
          break;
        }
        case 'file-list':
        case 'file': {
          const name = (content.name as string) ?? '';
          const url = (content.url as string) ?? '';
          if (name) lines.push(`- 📄 ${name}${url ? ` (${url})` : ''}`);
          break;
        }
        default:
          // Generic fallback for unknown block types
          if (text) {
            lines.push(text);
            lines.push('');
          }
          break;
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Import a page from exported JSON data.
   * Creates a new page with blocks and relations.
   */
  async importPage(ownerId: string, data: {
    title: string;
    slug?: string;
    icon?: string;
    coverMediaId?: string;
    description?: string;
    parentId?: string;
    tags?: string[];
    sortOrder?: number;
    blocks?: Array<{
      type: string;
      content?: Record<string, unknown>;
      layout?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      sortOrder?: number;
    }>;
    relations?: Array<{
      targetPageId: string;
      relationType: string;
      label?: string;
      metadata?: Record<string, unknown>;
    }>;
  }) {
    // Auto-generate slug from title if not provided
    let slug = data.slug;
    if (!slug) {
      slug = this.slugify(data.title);
      let attempt = 0;
      while (await this.repo.slugExists(slug, ownerId)) {
        attempt++;
        slug = `${this.slugify(data.title)}-${attempt}`;
      }
    } else if (await this.repo.slugExists(slug, ownerId)) {
      throw new Error('Dieser Seiten-Name (Slug) wird bereits verwendet');
    }

    // Create the page
    const page = await this.repo.createPage({
      ownerId,
      title: data.title,
      slug,
      parentId: data.parentId ?? null,
      icon: data.icon ?? null,
      coverMediaId: data.coverMediaId ?? null,
      description: data.description ?? null,
      tags: data.tags ?? [],
      sortOrder: data.sortOrder ?? 0,
    });
    if (!page) throw new Error('Seite konnte nicht angelegt werden');

    // Create blocks
    const createdBlocks: Array<Record<string, unknown>> = [];
    for (const block of data.blocks ?? []) {
      const created = await this.repo.createBlock({
        pageId: page.id,
        type: block.type,
        content: block.content ?? {},
        layout: block.layout,
        metadata: block.metadata,
        sortOrder: block.sortOrder ?? 0,
      });
      if (created) createdBlocks.push(created);
    }

    // Create relations (ignore missing target pages silently)
    for (const relation of data.relations ?? []) {
      try {
        // Verify target page exists for this owner
        const targetPage = await this.repo.findPageById(relation.targetPageId, ownerId);
        if (targetPage) {
          await this.repo.createRelation({
            sourcePageId: page.id,
            targetPageId: relation.targetPageId,
            relationType: relation.relationType,
            label: relation.label,
            metadata: relation.metadata as Record<string, unknown> | undefined,
            createdBy: ownerId,
          });
        }
      } catch {
        // Silently skip relations to non-existent pages
      }
    }

    await this.events.emit(PageCreated.create(page.id, { pageId: page.id, title: page.title }));
    return { ...page, blocks: createdBlocks };
  }
}
