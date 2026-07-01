import { Module } from '@nestjs/common';
import { MediaService } from '../services/media.service';
import { MediaRepository } from '../repositories/media.repository';
import { MediaController } from './media.controller';
import { MediaStreamController } from './media-stream.controller';

@Module({
  providers: [MediaRepository, MediaService],
  controllers: [MediaController, MediaStreamController],
  exports: [MediaService],
})
export class MediaModule {}
