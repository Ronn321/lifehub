import { Module } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardController } from './dashboard.controller';

@Module({
  providers: [DashboardRepository, DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
