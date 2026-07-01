import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { EventsService, createEventType } from '@lifehub/events';
import { PagesRepository } from '../repositories/pages.repository';
import type { CreatePageInput, UpdatePageInput, CreateBlockInput, UpdateBlockInput, ReorderBlocksInput } from '../dtos/pages.dto';

export const PageCreated = createEventType<{ pageId: string; title: string }>('page.created');
export const PageUpdated = createEventType<{ pageId: string; title: string }>('page.updated');
export const PageDeleted = createEventType<{ pageId: string }>('page.deleted');

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    private readonly repo: PagesRepository,
    @Inject(EventsService) private readonly events: EventsService,
  ) {}

  // ========== PAGES ==========

  async createPage(ownerId: string, input: CreatePageInput) {
    const page = await this.repo.createPage({ ...input, ownerId });
    if (!page) throw new Error('Seite konnte nicht angelegt werden');
    await this.events.emit(PageCreated.create(page.id, { pageId: page.id, title: page.title }));
    return page;
  }

  async listPages(ownerId: string) {
    const flatPages = await this.repo.findPagesByOwner(ownerId);
    return this.buildTree(flatPages);
  }

  async getPageWithBlocks(ownerId: string, id: string) {
    const page = await this.repo.findPageById(id, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const blocks = await this.repo.findBlocksByPage(id);
    return { ...page, blocks };
  }

  async updatePage(ownerId: string, id: string, input: UpdatePageInput) {
    const page = await this.repo.findPageById(id, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
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

  // ========== BLOCKS ==========

  async addBlock(ownerId: string, pageId: string, input: CreateBlockInput) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    return this.repo.createBlock({ pageId, ...input });
  }

  async updateBlock(ownerId: string, pageId: string, blockId: string, input: UpdateBlockInput) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    const block = await this.repo.findBlockById(blockId);
    if (!block) throw new NotFoundException('Block nicht gefunden');
    return this.repo.updateBlock(blockId, input);
  }

  async deleteBlock(ownerId: string, pageId: string, blockId: string) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    await this.repo.deleteBlock(blockId);
  }

  async reorderBlocks(ownerId: string, pageId: string, input: ReorderBlocksInput) {
    const page = await this.repo.findPageById(pageId, ownerId);
    if (!page) throw new NotFoundException('Seite nicht gefunden');
    for (const block of input.blocks) {
      await this.repo.updateBlockSortOrder(block.id, block.sortOrder);
    }
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
}
