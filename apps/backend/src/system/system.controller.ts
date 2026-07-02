import { Controller, Get, Put, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SystemService } from './system.service.js';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('settings')
  async getSettings() {
    return this.systemService.getAll();
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Body() body: Record<string, unknown>) {
    await this.systemService.setMultiple(body);
    return this.systemService.getAll();
  }

  @Get('paths')
  async getPaths() {
    return this.systemService.getPaths();
  }

  @Put('paths')
  @HttpCode(HttpStatus.OK)
  async updatePaths(@Body() body: Record<string, unknown>) {
    const pathSettings: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      pathSettings[`paths.${key}`] = value;
    }
    await this.systemService.setMultiple(pathSettings);
    return this.systemService.getPaths();
  }

  @Get('health')
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
