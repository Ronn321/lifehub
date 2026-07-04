import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app.module.js';

// .env manuell laden, BEVOR NestJS startet
loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(helmet());

  app.enableCors({
    origin: process.env.CORS_ORIGINS === '*'
      ? (origin: string | undefined, callback: (err: Error | null, origin?: string | boolean) => void) => {
          callback(null, origin || true);
        }
      : (process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000']),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // OpenAPI/Swagger vorerst deaktiviert (Phase 0.5+): inkompatibel mit tsx's emitDecoratorMetadata-Handling.
  // Wird reaktiviert, sobald wir auf `nest build` (TypeScript-Compiler) umstellen.

  const port = Number(process.env.LIFEHUB_API_PORT ?? process.env.PORT ?? 3007);
  await app.listen(port, '0.0.0.0');

  // eslint-disable-next-line no-console
  console.log(`🚀 LifeHub backend listening on http://localhost:${port}`);
}

void bootstrap();
