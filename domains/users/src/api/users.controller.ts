import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { loginSchema, registerSchema, refreshSchema, updateUserSchema, changePasswordSchema, type LoginInput, type RegisterInput, type RefreshInput, type UpdateUserInput, type ChangePasswordInput } from '../dtos/auth.dto.js';
import { UsersService } from '../services/users.service.js';
import { UsersRepository } from '../repositories/users.repository.js';
import type { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 1000 } })
  @ApiOperation({ summary: 'Login with email + password, returns access + refresh tokens' })
  async login(@Body() body: unknown, @Req() req: Request) {
    const dto: LoginInput = loginSchema.parse(body);
    return this.users.login(dto, this.metaFromReq(req));
  }

  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user (rate-limited)' })
  async register(@Body() body: unknown, @Req() req: Request) {
    const dto: RegisterInput = registerSchema.parse(body);
    return this.users.register(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access + refresh pair' })
  async refresh(@Body() body: unknown, @Req() req: Request) {
    const dto: RefreshInput = refreshSchema.parse(body);
    return this.users.refresh(dto.refreshToken, this.metaFromReq(req));
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  async logout(@Body() body: unknown) {
    const dto: RefreshInput = refreshSchema.parse(body);
    await this.users.logout(dto.refreshToken);
  }

  private metaFromReq(req: Request) {
    return {
      userAgent: (req.headers['user-agent'] as string) ?? undefined,
      ipAddress: (req.ip ?? req.socket.remoteAddress ?? undefined) as string | undefined,
    };
  }
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(UsersRepository) private readonly repo: UsersRepository,
  ) {}

  // ---------- Self-Service ----------

  @Get('me')
  @RequirePermission('users', 'read')
  @ApiOperation({ summary: 'Get current user profile + roles' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.users.getProfile(user.sub);
  }

  @Put('me')
  @RequirePermission('users', 'update')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto: UpdateUserInput = updateUserSchema.parse(body);
    return this.users.updateProfile(user.sub, dto);
  }

  @Post('me/password')
  @HttpCode(204)
  @RequirePermission('users', 'update')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto: ChangePasswordInput = changePasswordSchema.parse(body);
    await this.users.changePassword(user.sub, dto);
  }

  // ---------- Admin ----------

  @Get()
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  async listAll() {
    return this.repo.listAll();
  }

  @Get(':id')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async getById(@Param('id') id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Post(':id/disable')
  @HttpCode(204)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Disable a user (admin only)' })
  async disableUser(@Param('id') id: string) {
    await this.repo.setActive(id, false);
  }

  @Post(':id/enable')
  @HttpCode(204)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Enable a user (admin only)' })
  async enableUser(@Param('id') id: string) {
    await this.repo.setActive(id, true);
  }

  @Put(':id')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Update user profile (admin only)' })
  async adminUpdateUser(@Param('id') id: string, @Body() body: { displayName?: string; email?: string }) {
    return this.users.adminUpdateUser(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Soft-delete a user (admin only)' })
  async adminDeleteUser(@Param('id') id: string) {
    await this.users.adminDeleteUser(id);
  }
}
