import { Module, Global } from '@nestjs/common';
import { AuditContextInterceptor } from './audit-context.interceptor.js';

@Global()
@Module({
  providers: [AuditContextInterceptor],
  exports: [AuditContextInterceptor],
})
export class AuditModule {}
