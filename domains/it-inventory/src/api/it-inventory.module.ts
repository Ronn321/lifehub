import { Module } from '@nestjs/common';
import { ItInventoryService } from '../services/it-inventory.service';
import { ItInventoryRepository } from '../repositories/it-inventory.repository';
import { ItInventoryController } from './it-inventory.controller';

@Module({
  providers: [ItInventoryRepository, ItInventoryService],
  controllers: [ItInventoryController],
  exports: [ItInventoryService],
})
export class ItInventoryModule {}
