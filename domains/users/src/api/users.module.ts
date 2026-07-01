import { Module } from '@nestjs/common';
import { UsersService } from '../services/users.service.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { AuthController, UsersController } from './users.controller.js';
import { RolesController } from './roles.controller.js';

@Module({
  providers: [UsersRepository, UsersService],
  controllers: [AuthController, UsersController, RolesController],
  exports: [UsersService],
})
export class UsersModule {}
