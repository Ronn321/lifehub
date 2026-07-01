import { Module } from '@nestjs/common';
import { InsuranceService } from '../services/insurance.service.js';
import { InsuranceRepository } from '../repositories/insurance.repository.js';
import { InsuranceController } from './insurance.controller.js';

@Module({
  providers: [InsuranceRepository, InsuranceService],
  controllers: [InsuranceController],
  exports: [InsuranceService],
})
export class InsuranceModule {}
