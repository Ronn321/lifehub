import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { DbModule } from '@lifehub/db';
import { AuthModule } from '@lifehub/auth';
import { PermissionsModule } from '@lifehub/permissions';
import { AuditModule } from '@lifehub/audit';
import { StorageModule } from '@lifehub/storage';
import { EventsModule } from '@lifehub/events';
import { HealthController } from './health/health.controller.js';
import { UsersModule } from '@lifehub/users-domain';
import { MediaModule } from '@lifehub/media-domain';
import { DashboardModule } from '@lifehub/dashboard-domain';
import { TravelModule } from '@lifehub/travel-domain';
import { ProjectsModule } from '@lifehub/projects-domain';
import { RecipesModule } from '@lifehub/recipes-domain';
import { ShoppingModule } from '@lifehub/shopping-domain';
import { FinanceModule } from '@lifehub/finance-domain';
import { PagesModule } from '@lifehub/pages-domain';
import { JellyfinModule } from '@lifehub/jellyfin-domain';
import { SystemModule } from './system/system.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.passwordHash',
            '*.token',
            '*.secret',
            '*.ciphertext',
            '*.refreshToken',
          ],
          remove: true,
        },
        // Synchronous stdout-Logging → KEIN thread-stream-Worker → kompatibel mit gebundletem Build
        // (Pino's thread-stream sucht sonst "lib/worker.js" relativ zum Bundle-CWD)
        // Phase 0.5+: für Production-Grade-Logging zurück auf pino-pretty/sonic-boom umstellen.
      },
    }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60_000, limit: 100 },
    ]),

    DbModule,
    AuthModule,
    PermissionsModule,
    AuditModule,
    StorageModule,
    EventsModule,
    UsersModule,
    MediaModule,
    DashboardModule,
    TravelModule,
    ProjectsModule,
    RecipesModule,
    ShoppingModule,
    FinanceModule,
    PagesModule,
    JellyfinModule,
    SystemModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
