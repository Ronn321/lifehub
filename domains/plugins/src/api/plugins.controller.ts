import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req,
} from '@nestjs/common';
import { JwtGuard } from '@lifehub/auth';
import { PluginsService } from '../services/plugins.service.js';
import { installPluginSchema, updatePluginSchema } from '../dtos/plugins.dto.js';
import type { Plugin } from '../entities/plugins.js';

@Controller('plugins')
@UseGuards(JwtGuard)
export class PluginsController {
  constructor(private readonly service: PluginsService) {}

  @Get()
  async findAll(@Req() req: { user: { sub: string } }): Promise<Plugin[]> {
    return this.service.findAll(req.user.sub);
  }

  @Post()
  async install(
    @Body() body: unknown,
    @Req() req: { user: { sub: string } },
  ): Promise<Plugin> {
    const input = installPluginSchema.parse(body);
    return this.service.install(req.user.sub, input);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { user: { sub: string } },
  ): Promise<Plugin> {
    const input = updatePluginSchema.parse(body);
    return this.service.update(id, req.user.sub, input);
  }

  @Delete(':id')
  async uninstall(
    @Param('id') id: string,
    @Req() req: { user: { sub: string } },
  ): Promise<{ success: true }> {
    await this.service.uninstall(id, req.user.sub);
    return { success: true };
  }

  @Post(':id/toggle')
  async toggle(
    @Param('id') id: string,
    @Req() req: { user: { sub: string } },
  ): Promise<Plugin> {
    return this.service.toggle(id, req.user.sub);
  }
}
