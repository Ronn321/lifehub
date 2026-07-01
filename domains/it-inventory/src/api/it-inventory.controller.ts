import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { ItInventoryService } from '../services/it-inventory.service';
import { createDeviceSchema, updateDeviceSchema } from '../dtos/it-inventory.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('it/devices')
export class ItInventoryController {
  constructor(private readonly service: ItInventoryService) {}

  @Post()
  @RequirePermission('it_inventory', 'create')
  async create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createDeviceSchema.parse(body);
    return this.service.create(user.sub, dto);
  }

  @Get()
  @RequirePermission('it_inventory', 'read')
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.sub);
  }

  @Get(':id')
  @RequirePermission('it_inventory', 'read')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('it_inventory', 'update')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateDeviceSchema.parse(body);
    return this.service.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('it_inventory', 'delete')
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.service.delete(user.sub, id);
  }
}
