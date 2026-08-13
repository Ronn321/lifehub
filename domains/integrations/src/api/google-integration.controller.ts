import { Controller, Get, Delete, Query, UseGuards, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { GoogleConnectionService } from '../services/google-connection.service';

// NOTE: No class-level guards — the /callback route is hit by Google without a JWT.
// Guards are applied per-route on the authenticated endpoints only.
@Controller('integrations/google')
export class GoogleIntegrationController {
  constructor(private readonly googleConnections: GoogleConnectionService) {}

  @Get('auth-url')
  @UseGuards(JwtGuard, PermissionGuard)
  @RequirePermission('integrations', 'update')
  async authUrl(@CurrentUser() user: JwtPayload) {
    return { url: await this.googleConnections.buildAuthUrl(user.sub) };
  }

  @Get('callback')
  @HttpCode(302)
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const { redirect } = await this.googleConnections.handleCallback(code, state);
    res.redirect(redirect);
  }

  @Get('status')
  @UseGuards(JwtGuard, PermissionGuard)
  @RequirePermission('integrations', 'read')
  async status(@CurrentUser() user: JwtPayload) {
    return this.googleConnections.getStatus(user.sub);
  }

  @Delete('connection')
  @UseGuards(JwtGuard, PermissionGuard)
  @HttpCode(204)
  @RequirePermission('integrations', 'update')
  async disconnect(@CurrentUser() user: JwtPayload) {
    await this.googleConnections.disconnect(user.sub);
  }
}
