import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DishesRepository } from '../repositories/dishes.repository';

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(private readonly repo: DishesRepository) {}

  async create(ownerId: string, input: {
    title: string; titleEn?: string; description?: string;
    caption?: string; heroText?: string; primaryColor?: string;
  }) {
    return this.repo.create({ ...input, ownerId });
  }

  async list(ownerId: string) {
    return this.repo.findByOwner(ownerId);
  }

  async getById(ownerId: string, id: string) {
    const dish = await this.repo.findById(id, ownerId);
    if (!dish) throw new NotFoundException('Gericht nicht gefunden');
    return dish;
  }

  async getDishWithRecipes(ownerId: string, id: string) {
    const dish = await this.repo.findById(id, ownerId);
    if (!dish) throw new NotFoundException('Gericht nicht gefunden');
    const recipes = await this.repo.findRecipesByDish(id, ownerId);
    return { ...dish, recipes };
  }

  async update(ownerId: string, id: string, input: Partial<{
    title: string; titleEn?: string; description?: string;
    caption?: string; heroText?: string; primaryColor?: string;
  }>) {
    const dish = await this.repo.findById(id, ownerId);
    if (!dish) throw new NotFoundException('Gericht nicht gefunden');
    return this.repo.update(id, ownerId, input);
  }

  async delete(ownerId: string, id: string) {
    const dish = await this.repo.findById(id, ownerId);
    if (!dish) throw new NotFoundException('Gericht nicht gefunden');
    await this.repo.softDelete(id, ownerId);
  }
}
