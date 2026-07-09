import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { DishesService } from '../services/dishes.service';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('recipes/dishes')
export class DishesController {
  constructor(@Inject(DishesService) private readonly dishes: DishesService) {}

  @Post()
  @RequirePermission('recipes', 'create')
  async create(@Body() body: { title: string; titleEn?: string; description?: string; caption?: string; heroText?: string; primaryColor?: string }, @CurrentUser() user: JwtPayload) {
    return this.dishes.create(user.sub, body);
  }

  @Get()
  @RequirePermission('recipes', 'read')
  async list(@CurrentUser() user: JwtPayload) {
    return this.dishes.list(user.sub);
  }

  @Get(':id')
  @RequirePermission('recipes', 'read')
  async getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.dishes.getById(user.sub, id);
  }

  @Get(':id/recipes')
  @RequirePermission('recipes', 'read')
  async getDishWithRecipes(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.dishes.getDishWithRecipes(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('recipes', 'update')
  async update(@Param('id') id: string, @Body() body: Partial<{ title: string; titleEn?: string; description?: string; caption?: string; heroText?: string; primaryColor?: string }>, @CurrentUser() user: JwtPayload) {
    return this.dishes.update(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('recipes', 'delete')
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.dishes.delete(user.sub, id);
  }
}
