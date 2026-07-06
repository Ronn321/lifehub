import { Module } from '@nestjs/common';
import { PagesService } from '../services/pages.service';
import { PagesRepository } from '../repositories/pages.repository';
import { PagesController } from './pages.controller';
import { ProxyController } from './proxy.controller';

@Module({
  providers: [PagesRepository, PagesService],
  controllers: [PagesController, ProxyController],
  exports: [PagesService],
})
export class PagesModule {}
