import { Module, Global } from '@nestjs/common';
import { PermissionGuard } from './permission.guard.js';

@Global()
@Module({
  providers: [PermissionGuard],
  exports: [PermissionGuard],
})
export class PermissionsModule {}
