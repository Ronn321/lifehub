import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsService } from '../services/documents.service';
import { DocumentsRepository } from '../repositories/documents.repository';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  ],
  providers: [DocumentsRepository, DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
