import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ItInventoryRepository } from '../repositories/it-inventory.repository';
import type { CreateDeviceInput, UpdateDeviceInput } from '../dtos/it-inventory.dto';

@Injectable()
export class ItInventoryService {
  private readonly logger = new Logger(ItInventoryService.name);

  constructor(private readonly repo: ItInventoryRepository) {}

  async create(ownerId: string, input: CreateDeviceInput) {
    return this.repo.create({ ...input, ownerId });
  }

  async findAll(ownerId: string) {
    return this.repo.findAllByOwner(ownerId);
  }

  async findOne(ownerId: string, id: string) {
    const device = await this.repo.findById(id, ownerId);
    if (!device) throw new NotFoundException('Gerät nicht gefunden');
    return device;
  }

  async update(ownerId: string, id: string, input: UpdateDeviceInput) {
    const device = await this.repo.findById(id, ownerId);
    if (!device) throw new NotFoundException('Gerät nicht gefunden');
    return this.repo.update(id, ownerId, input);
  }

  async delete(ownerId: string, id: string) {
    const device = await this.repo.findById(id, ownerId);
    if (!device) throw new NotFoundException('Gerät nicht gefunden');
    await this.repo.softDelete(id, ownerId);
  }
}
