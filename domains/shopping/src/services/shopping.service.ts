import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ShoppingRepository } from '../repositories/shopping.repository';
import type { CreateListInput, UpdateListInput, CreateItemInput, UpdateItemInput } from '../dtos/shopping.dto';

@Injectable()
export class ShoppingService {
  private readonly logger = new Logger(ShoppingService.name);

  constructor(private readonly repo: ShoppingRepository) {}

  // ========== LISTS ==========

  async createList(ownerId: string, input: CreateListInput) {
    return this.repo.createList({ ...input, ownerId });
  }

  async listLists(ownerId: string) {
    return this.repo.findListsByOwner(ownerId);
  }

  async getListWithItems(ownerId: string, id: string) {
    const list = await this.repo.findListById(id, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    const items = await this.repo.findItemsByList(id);
    return { ...list, items };
  }

  async updateList(ownerId: string, id: string, input: UpdateListInput) {
    const list = await this.repo.findListById(id, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    return this.repo.updateList(id, ownerId, input);
  }

  async deleteList(ownerId: string, id: string) {
    const list = await this.repo.findListById(id, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    await this.repo.softDeleteList(id, ownerId);
  }

  // ========== ITEMS ==========

  async addItem(ownerId: string, listId: string, input: CreateItemInput) {
    const list = await this.repo.findListById(listId, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    return this.repo.createItem({ listId, ...input });
  }

  async updateItem(ownerId: string, listId: string, itemId: string, input: UpdateItemInput) {
    const list = await this.repo.findListById(listId, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    const item = await this.repo.findItemById(itemId);
    if (!item) throw new NotFoundException('Artikel nicht gefunden');
    return this.repo.updateItem(itemId, input);
  }

  async deleteItem(ownerId: string, listId: string, itemId: string) {
    const list = await this.repo.findListById(listId, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    await this.repo.deleteItem(itemId);
  }

  async checkItem(ownerId: string, listId: string, itemId: string, checkedBy: string) {
    const list = await this.repo.findListById(listId, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    const item = await this.repo.findItemById(itemId);
    if (!item) throw new NotFoundException('Artikel nicht gefunden');
    return this.repo.updateItem(itemId, { checked: true, checkedBy });
  }

  async uncheckItem(ownerId: string, listId: string, itemId: string) {
    const list = await this.repo.findListById(listId, ownerId);
    if (!list) throw new NotFoundException('Einkaufsliste nicht gefunden');
    const item = await this.repo.findItemById(itemId);
    if (!item) throw new NotFoundException('Artikel nicht gefunden');
    return this.repo.updateItem(itemId, { checked: false, checkedBy: null });
  }
}
