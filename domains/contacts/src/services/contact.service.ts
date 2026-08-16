import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ContactRepository } from '../repositories/contact.repository';
import type { CreateContactInput, UpdateContactInput, ContactQuery } from '../dtos/contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly repo: ContactRepository) {}

  async create(ownerId: string, input: CreateContactInput) {
    return this.repo.create({ ...input, ownerId });
  }

  async list(ownerId: string, query: ContactQuery) {
    return this.repo.list(ownerId, query.q, query.page, query.pageSize);
  }

  async get(ownerId: string, id: string) {
    const contact = await this.repo.findById(id, ownerId);
    if (!contact) throw new NotFoundException('Kontakt nicht gefunden');
    return contact;
  }

  async update(ownerId: string, id: string, input: UpdateContactInput) {
    // Ownership check first — throws 404 for unknown or foreign contacts.
    await this.get(ownerId, id);
    return this.repo.update(id, ownerId, input);
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    await this.repo.softDelete(id, ownerId);
  }
}
