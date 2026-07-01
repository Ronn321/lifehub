import { Module } from '@nestjs/common';
import { VaultService } from '../services/vault.service.js';
import { VaultRepository } from '../repositories/vault.repository.js';
import { VaultController } from './vault.controller.js';

@Module({
  providers: [VaultRepository, VaultService],
  controllers: [VaultController],
  exports: [VaultService],
})
export class VaultModule {}
