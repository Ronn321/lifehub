import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { STORAGE_SERVICE, type StorageService } from '@lifehub/storage';
import { EventsService, createEventType } from '@lifehub/events';
import { DocumentsRepository } from '../repositories/documents.repository';
import type { CreateDocumentInput, UpdateDocumentInput } from '../dtos/documents.dto';
import type { Document } from '../entities/documents';

export const DocumentCreated = createEventType<{ documentId: string; name: string; type: string }>('document.created');
export const DocumentDeleted = createEventType<{ documentId: string }>('document.deleted');

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly repo: DocumentsRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly events: EventsService,
  ) {}

  async create(
    ownerId: string,
    input: CreateDocumentInput,
    file?: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ): Promise<Document> {
    const id = randomUUID();
    let storagePath: string | null = null;
    let mimeType: string | null = file?.mimetype ?? null;
    let fileSize: number | null = file?.size ?? null;

    if (file) {
      storagePath = await this.storage.put('documents', `${ownerId}/${id}/${file.originalname}`, Readable.from(file.buffer));
    }

    const doc = await this.repo.create({
      id,
      ownerId,
      name: input.name,
      type: input.type ?? 'other',
      description: input.description ?? null,
      mimeType,
      fileSize,
      storagePath,
      tags: input.tags ?? null,
    });

    await this.events.emit(DocumentCreated.create(id, { documentId: id, name: input.name, type: input.type ?? 'other' }));
    return doc as unknown as Document;
  }

  async list(ownerId: string): Promise<Document[]> {
    const rows = await this.repo.findByOwner(ownerId);
    return rows as unknown as Document[];
  }

  async get(ownerId: string, id: string): Promise<Document> {
    const doc = await this.repo.findById(id, ownerId);
    if (!doc) throw new NotFoundException('Dokument nicht gefunden');
    return doc as unknown as Document;
  }

  async getDownloadUrl(ownerId: string, id: string): Promise<string | null> {
    const doc = await this.get(ownerId, id);
    if (!doc.storagePath) return null;
    return this.storage.signedUrl(doc.storagePath, 3600);
  }

  async download(ownerId: string, id: string): Promise<{ stream: Readable; filename: string; mimeType: string } | null> {
    const doc = await this.get(ownerId, id);
    if (!doc.storagePath) return null;
    const filename = doc.storagePath.split('/').pop() ?? doc.name;
    const stream = await this.storage.get(doc.storagePath);
    return { stream, filename, mimeType: doc.mimeType ?? 'application/octet-stream' };
  }

  async update(ownerId: string, id: string, input: UpdateDocumentInput): Promise<Document> {
    const existing = await this.repo.findById(id, ownerId);
    if (!existing) throw new NotFoundException('Dokument nicht gefunden');
    const updated = await this.repo.update(id, ownerId, input as Record<string, unknown>);
    return updated as unknown as Document;
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const doc = await this.repo.findById(id, ownerId);
    if (!doc) throw new NotFoundException('Dokument nicht gefunden');
    if (doc.storagePath) {
      await this.storage.delete(doc.storagePath).catch((err) => {
        this.logger.warn(`Storage delete failed for ${doc.storagePath}: ${err.message}`);
      });
    }
    await this.repo.softDelete(id, ownerId);
    await this.events.emit(DocumentDeleted.create(id, { documentId: id }));
  }
}
