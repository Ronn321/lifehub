import { Module } from '@nestjs/common';
import { FinanceService } from '../services/finance.service';
import { FinanceRepository } from '../repositories/finance.repository';
import { FinanceController } from './finance.controller';

@Module({
  providers: [FinanceRepository, FinanceService],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
