import { Module } from '@nestjs/common';
import { MediaService } from '../services/media.service';
import { MediaRepository } from '../repositories/media.repository';
import { MediaThumbnailService } from '../services/media-thumbnail.service';
import { MediaLockService } from '../services/media-lock.service';
import { MediaController } from './media.controller';
import { MediaStreamController } from './media-stream.controller';
import { MediaThumbnailController } from './media-thumbnail.controller';

@Module({
  providers: [MediaRepository, MediaService, MediaThumbnailService, MediaLockService],
  controllers: [MediaController, MediaStreamController, MediaThumbnailController],
  exports: [MediaService],
})
export class MediaModule {}
