import { Module } from '@nestjs/common';
import { JellyfinService } from '../services/jellyfin.service';
import { JellyfinRepository } from '../repositories/jellyfin.repository';
import { JellyfinController } from './jellyfin.controller';
import { JellyfinStreamController } from './jellyfin-stream.controller';

@Module({
  providers: [JellyfinRepository, JellyfinService],
  controllers: [JellyfinController, JellyfinStreamController],
  exports: [JellyfinService],
})
export class JellyfinModule {}
