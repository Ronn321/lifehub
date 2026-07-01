import { Module, Global } from '@nestjs/common';
import { JwtGuard } from './jwt.guard.js';

@Global()
@Module({
  providers: [JwtGuard],
  exports: [JwtGuard],
})
export class AuthModule {}
