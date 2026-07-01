import {
  Body, Controller, Delete, Get, HttpCode, Inject,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { ShoppingService } from '../services/shopping.service';
import {
  createListSchema, updateListSchema,
  createItemSchema, updateItemSchema,
} from '../dtos/shopping.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('shopping-lists')
export class ShoppingController {
  constructor(@Inject(ShoppingService) private readonly shopping: ShoppingService) {}

  @Post()
  @RequirePermission('shopping', 'create')
  async createList(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createListSchema.parse(body);
    return this.shopping.createList(user.sub, dto);
  }

  @Get()
  @RequirePermission('shopping', 'read')
  async listLists(@CurrentUser() user: JwtPayload) {
    return this.shopping.listLists(user.sub);
  }

  @Get(':id')
  @RequirePermission('shopping', 'read')
  async getList(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.shopping.getListWithItems(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('shopping', 'update')
  async updateList(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateListSchema.parse(body);
    return this.shopping.updateList(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('shopping', 'delete')
  async deleteList(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.shopping.deleteList(user.sub, id);
  }

  @Post(':id/items')
  @RequirePermission('shopping', 'update')
  async addItem(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createItemSchema.parse(body);
    return this.shopping.addItem(user.sub, id, dto);
  }

  @Put(':id/items/:itemId')
  @RequirePermission('shopping', 'update')
  async updateItem(
    @Param('id') id: string, @Param('itemId') itemId: string,
    @Body() body: unknown, @CurrentUser() user: JwtPayload,
  ) {
    const dto = updateItemSchema.parse(body);
    return this.shopping.updateItem(user.sub, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(204)
  @RequirePermission('shopping', 'update')
  async deleteItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: JwtPayload) {
    await this.shopping.deleteItem(user.sub, id, itemId);
  }

  @Post(':id/items/:itemId/check')
  @HttpCode(200)
  @RequirePermission('shopping', 'update')
  async checkItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: JwtPayload) {
    return this.shopping.checkItem(user.sub, id, itemId, user.email);
  }

  @Post(':id/items/:itemId/uncheck')
  @HttpCode(200)
  @RequirePermission('shopping', 'update')
  async uncheckItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: JwtPayload) {
    return this.shopping.uncheckItem(user.sub, id, itemId);
  }
}
