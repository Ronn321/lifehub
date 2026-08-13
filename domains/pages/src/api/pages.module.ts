import { Module } from '@nestjs/common';
import { PagesService } from '../services/pages.service';
import { PagesRepository } from '../repositories/pages.repository';
import { PagesController } from './pages.controller';
import { ProxyController } from './proxy.controller';
import { BrowserController } from './browser.controller';
import { BrowserRendererService } from '../services/browser-renderer.service';

@Module({
  providers: [PagesRepository, PagesService, BrowserRendererService],
  controllers: [PagesController, ProxyController, BrowserController],
  exports: [PagesService],
})
export class PagesModule {}
