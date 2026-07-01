import {
  Body, Controller, Delete, Get, HttpCode, Inject,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { PagesService } from '../services/pages.service';
import {
  createPageSchema, updatePageSchema,
  createBlockSchema, updateBlockSchema,
  reorderBlocksSchema,
} from '../dtos/pages.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('pages')
export class PagesController {
  constructor(@Inject(PagesService) private readonly pages: PagesService) {}

  @Post()
  @RequirePermission('pages', 'create')
  async createPage(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createPageSchema.parse(body);
    return this.pages.createPage(user.sub, dto);
  }

  @Get()
  @RequirePermission('pages', 'read')
  async listPages(@CurrentUser() user: JwtPayload) {
    return this.pages.listPages(user.sub);
  }

  @Get(':id')
  @RequirePermission('pages', 'read')
  async getPage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getPageWithBlocks(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('pages', 'update')
  async updatePage(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updatePageSchema.parse(body);
    return this.pages.updatePage(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('pages', 'delete')
  async deletePage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deletePage(user.sub, id);
  }

  @Post(':id/blocks')
  @RequirePermission('pages', 'update')
  async addBlock(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createBlockSchema.parse(body);
    return this.pages.addBlock(user.sub, id, dto);
  }

  @Put(':id/blocks/reorder')
  @HttpCode(200)
  @RequirePermission('pages', 'update')
  async reorderBlocks(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = reorderBlocksSchema.parse(body);
    return this.pages.reorderBlocks(user.sub, id, dto);
  }

  @Put(':id/blocks/:blockId')
  @RequirePermission('pages', 'update')
  async updateBlock(
    @Param('id') id: string, @Param('blockId') blockId: string,
    @Body() body: unknown, @CurrentUser() user: JwtPayload,
  ) {
    const dto = updateBlockSchema.parse(body);
    return this.pages.updateBlock(user.sub, id, blockId, dto);
  }

  @Delete(':id/blocks/:blockId')
  @HttpCode(204)
  @RequirePermission('pages', 'update')
  async deleteBlock(@Param('id') id: string, @Param('blockId') blockId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deleteBlock(user.sub, id, blockId);
  }
}
