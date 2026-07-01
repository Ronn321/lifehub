import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { UsersRepository } from '../repositories/users.repository.js';
import { UsersService } from '../services/users.service.js';
import { z } from 'zod';

const adminCreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(100).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});
@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionGuard)
@Controller()
export class RolesController {
  constructor(
    @Inject(UsersRepository) private readonly repo: UsersRepository,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  // ============== Roles ==============

  @Get('roles')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'List all roles' })
  async listRoles() {
    return this.repo.findAllRoles();
  }

  @Get('roles/:id')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Get a single role by ID' })
  async getRole(@Param('id') id: string) {
    const role = await this.repo.findRoleById(id);
    if (!role) return { message: 'Role not found', statusCode: 404 };
    return role;
  }

  @Post('roles')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Create a new custom role' })
  async createRole(@Body() body: unknown) {
    const dto = createRoleSchema.parse(body);
    return this.repo.createRole({ name: dto.name.trim(), description: dto.description });
  }

  @Put('roles/:id')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Update a role (name or description)' })
  async updateRole(@Param('id') id: string, @Body() body: unknown) {
    const role = await this.repo.findRoleById(id);
    if (!role) return { message: 'Role not found', statusCode: 404 };
    const dto = updateRoleSchema.parse(body);
    if (role.isSystem && dto.name && dto.name !== role.name) {
      return { message: 'Cannot rename system roles', statusCode: 400 };
    }
    return this.repo.updateRole(id, { name: dto.name, description: dto.description });
  }

  @Delete('roles/:id')
  @HttpCode(204)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Delete a custom role (system roles cannot be deleted)' })
  async deleteRole(@Param('id') id: string) {
    const role = await this.repo.findRoleById(id);
    if (!role) return { message: 'Role not found', statusCode: 404 };
    if (role.isSystem) return { message: 'Cannot delete system roles', statusCode: 400 };
    await this.repo.deleteRole(id);
  }

  // ============== Permissions ==============

  @Get('permissions')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'List all available permissions' })
  async listPermissions() {
    return this.repo.findAllPermissions();
  }

  @Get('roles/:id/permissions')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Get permissions assigned to a role' })
  async getRolePermissions(@Param('id') id: string) {
    return this.repo.findPermissionsByRoleId(id);
  }

  @Put('roles/:id/permissions')
  @HttpCode(200)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Replace all permissions for a role' })
  async setRolePermissions(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const role = await this.repo.findRoleById(id);
    if (!role) return { message: 'Role not found', statusCode: 404 };
    const dto = setRolePermissionsSchema.parse(body);
    await this.repo.setRolePermissions(id, dto.permissionIds);
    return this.repo.findPermissionsByRoleId(id);
  }

  // ============== User Role Assignment ==============

  @Get('users/:userId/roles')
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Get roles assigned to a user' })
  async getUserRoles(@Param('userId') userId: string) {
    return this.repo.findRolesByUserId(userId);
  }

  @Post('users/:userId/roles/:roleId')
  @HttpCode(200)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignRoleToUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.repo.assignRoleToUser(userId, roleId, user.sub);
    return this.repo.findRolesByUserId(userId);
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(200)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Remove a role from a user' })
  async removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.repo.removeRoleFromUser(userId, roleId);
    return this.repo.findRolesByUserId(userId);
  }

  // ============== Admin User Management ==============

  @Post('users/admin-create')
  @HttpCode(201)
  @RequirePermission('users', 'admin')
  @ApiOperation({ summary: 'Create a user as admin (with optional role assignment)' })
  async adminCreateUser(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = adminCreateUserSchema.parse(body);
    return this.users.adminCreateUser(
      {
        email: dto.email.trim(),
        password: dto.password,
        displayName: dto.displayName?.trim() || (dto.email.split('@')[0] ?? ''),
        roleIds: dto.roleIds,
      },
      user.sub,
    );
  }
}
