import { Module } from '@nestjs/common';
import { PagesService } from '../services/pages.service';
import { PagesRepository } from '../repositories/pages.repository';
import { PagesController } from './pages.controller';

@Module({
  providers: [PagesRepository, PagesService],
  controllers: [PagesController],
  exports: [PagesService],
})
export class PagesModule {}
