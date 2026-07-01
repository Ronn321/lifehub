import { Module } from '@nestjs/common';
import { TravelService } from '../services/travel.service';
import { TravelRepository } from '../repositories/travel.repository';
import { TravelController } from './travel.controller';

@Module({
  providers: [TravelRepository, TravelService],
  controllers: [TravelController],
  exports: [TravelService],
})
export class TravelModule {}
