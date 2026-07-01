import { Body, Controller, Get, HttpCode, Inject, Post, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { DashboardService } from '../services/dashboard.service';
import { layoutSchema } from '../dtos/dashboard.dto';
import { ZodError } from 'zod';

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
}
