import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DbService } from '@lifehub/db';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly db: DbService) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const dbOk = await this.db.ping().catch(() => false);
    return {
      status: dbOk ? 'ready' : 'degraded',
      checks: { database: dbOk },
      timestamp: new Date().toISOString(),
    };
  }
}
