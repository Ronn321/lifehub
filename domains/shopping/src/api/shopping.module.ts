import { Module } from '@nestjs/common';
import { ShoppingService } from '../services/shopping.service';
import { ShoppingRepository } from '../repositories/shopping.repository';
import { ShoppingController } from './shopping.controller';

@Module({
  providers: [ShoppingRepository, ShoppingService],
  controllers: [ShoppingController],
  exports: [ShoppingService],
})
export class ShoppingModule {}
