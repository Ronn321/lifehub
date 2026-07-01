import { Module } from '@nestjs/common';
import { PluginsController } from './plugins.controller.js';
import { PluginsService } from '../services/plugins.service.js';
import { PluginsRepository } from '../repositories/plugins.repository.js';

@Module({
  controllers: [PluginsController],
  providers: [PluginsService, PluginsRepository],
  exports: [PluginsService],
})
export class PluginsModule {}
