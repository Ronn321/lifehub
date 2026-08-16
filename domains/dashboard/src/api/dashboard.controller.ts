import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Post, Param, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { DashboardService } from '../services/dashboard.service';
import { layoutSchema, deviceIdSchema } from '../dtos/dashboard.dto';
import { ZodError } from 'zod';

function parseDeviceId(raw: string): string {
  const parsed = deviceIdSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestException('Ungültige Geräte-ID');
  return parsed.data;
}

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly svc: DashboardService) {}

  @Get('layout')
  @RequirePermission('dashboard', 'read')
  @ApiOperation({ summary: 'Get dashboard widget layout for current user' })
  async getLayout(@CurrentUser() user: JwtPayload) {
    return this.svc.getLayout(user.sub);
  }

  @Put('layout')
  @HttpCode(200)
  @RequirePermission('dashboard', 'update')
  @ApiOperation({ summary: 'Save dashboard widget layout' })
  async saveLayout(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    let parsed;
    try {
      parsed = layoutSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) throw new BadRequestException(e.errors);
      throw e;
    }
    return this.svc.saveLayout(user.sub, parsed);
  }

  @Post('layout/reset')
  @HttpCode(200)
  @RequirePermission('dashboard', 'update')
  @ApiOperation({ summary: 'Reset dashboard layout to defaults' })
  async resetLayout(@CurrentUser() user: JwtPayload) {
    return this.svc.resetLayout(user.sub);
  }

  // ===================== Geräte-Layouts (Phase 2.5) =====================

  @Get('layout/device/:deviceId')
  @RequirePermission('dashboard', 'read')
  @ApiOperation({ summary: 'Get dashboard widget layout for a device (user+deviceId)' })
  async getDeviceLayout(@CurrentUser() user: JwtPayload, @Param('deviceId') deviceId: string) {
    const id = parseDeviceId(deviceId);
    const layout = await this.svc.getDeviceLayout(user.sub, id);
    if (!layout) throw new NotFoundException('Geräte-Layout nicht gefunden');
    return layout;
  }

  @Put('layout/device/:deviceId')
  @HttpCode(200)
  @RequirePermission('dashboard', 'update')
  @ApiOperation({ summary: 'Save dashboard widget layout for a device' })
  async saveDeviceLayout(@CurrentUser() user: JwtPayload, @Param('deviceId') deviceId: string, @Body() body: unknown) {
    const id = parseDeviceId(deviceId);
    return this.svc.saveDeviceLayout(user.sub, id, body);
  }

  @Post('layout/device/:deviceId/reset')
  @HttpCode(200)
  @RequirePermission('dashboard', 'update')
  @ApiOperation({ summary: 'Reset dashboard layout for a device to defaults' })
  async resetDeviceLayout(@CurrentUser() user: JwtPayload, @Param('deviceId') deviceId: string) {
    const id = parseDeviceId(deviceId);
    return this.svc.resetDeviceLayout(user.sub, id);
  }
}
