import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, verifyAccessToken, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { MediaService } from '../services/media.service';
import { createSourceSchema, updateSourceSchema, createAlbumSchema, updateAlbumSchema, addToAlbumSchema, createTagSchema, createAndAssignTagSchema } from '../dtos/media.dto';
import type { Request } from 'express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';

const schema = {
  source: createSourceSchema,
  sourceUpdate: updateSourceSchema,
  album: createAlbumSchema,
  albumAdd: addToAlbumSchema,
};

@UseGuards(JwtGuard, PermissionGuard)
@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  // ========== SOURCES ==========
  @Post('sources')
  @RequirePermission('media', 'create')
  async createSource(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = schema.source.parse(body);
    return this.media.createSource(user.sub, dto);
  }

  @Get('sources')
  @RequirePermission('media', 'read')
  async listSources(@CurrentUser() user: JwtPayload) {
    return this.media.listSources(user.sub);
  }

  @Get('sources/:id')
  @RequirePermission('media', 'read')
  async getSource(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.getSource(user.sub, id);
  }

  @Put('sources/:id')
  @RequirePermission('media', 'update')
  async updateSource(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = schema.sourceUpdate.parse(body);
    return this.media.updateSource(user.sub, id, dto);
  }

  @Delete('sources/:id')
  @HttpCode(204)
  @RequirePermission('media', 'delete')
  async deleteSource(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.media.deleteSource(user.sub, id);
  }

  @Post('sources/:id/scan')
  @HttpCode(200)
  @RequirePermission('media', 'update')
  async scanSource(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.scanSource(user.sub, id);
  }

  // ========== FILES ==========
  @Post('sources/:id/index')
  @HttpCode(200)
  @RequirePermission('media', 'create')
  async indexSource(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.scanSource(user.sub, id);
  }

  @Get('files')
  @RequirePermission('media', 'read')
  async listFiles(
    @Query('sourceId') sourceId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @Query('favorite') favorite: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.media.listFiles(user.sub, {
      sourceId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      favorite: favorite === 'true' || favorite === '1',
    });
  }

  @Get('files/:id')
  @RequirePermission('media', 'read')
  async getFile(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.getFile(user.sub, id);
  }

  @Post('files/:id/favorite')
  @HttpCode(200)
  @RequirePermission('media', 'update')
  async toggleFavorite(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.toggleFavorite(user.sub, id);
  }

  @Delete('files/:id')
  @HttpCode(204)
  @RequirePermission('media', 'delete')
  async deleteFile(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.media.deleteFile(user.sub, id);
  }

  // ========== ALBUMS ==========
  @Post('albums')
  @RequirePermission('media', 'create')
  async createAlbum(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = schema.album.parse(body);
    return this.media.createAlbum(user.sub, dto);
  }

  @Get('albums')
  @RequirePermission('media', 'read')
  async listAlbums(@CurrentUser() user: JwtPayload) {
    return this.media.listAlbums(user.sub);
  }

  @Get('albums/:id')
  @RequirePermission('media', 'read')
  async getAlbum(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.getAlbum(user.sub, id);
  }

  @Put('albums/:id')
  @RequirePermission('media', 'update')
  async updateAlbum(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateAlbumSchema.parse(body);
    return this.media.updateAlbum(user.sub, id, dto);
  }

  @Delete('albums/:id')
  @HttpCode(204)
  @RequirePermission('media', 'delete')
  async deleteAlbum(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.media.deleteAlbum(user.sub, id);
  }

  @Post('albums/:id/items')
  @RequirePermission('media', 'update')
  async addToAlbum(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = schema.albumAdd.parse(body);
    await this.media.addToAlbum(user.sub, id, dto.mediaIds, user.sub);
    return { added: dto.mediaIds.length };
  }

  @Delete('albums/:albumId/items/:mediaId')
  @HttpCode(204)
  @RequirePermission('media', 'update')
  async removeFromAlbum(@Param('albumId') albumId: string, @Param('mediaId') mediaId: string, @CurrentUser() user: JwtPayload) {
    await this.media.removeFromAlbum(user.sub, albumId, mediaId);
  }

  @Get('albums/:id/media')
  @RequirePermission('media', 'read')
  async getAlbumMedia(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.getAlbumMedia(user.sub, id);
  }

  // ========== TAGS ==========

  @Get('tags')
  @RequirePermission('media', 'read')
  async listTags(@CurrentUser() user: JwtPayload) {
    return this.media.listTags(user.sub);
  }

  @Post('tags')
  @RequirePermission('media', 'create')
  async createTag(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createTagSchema.parse(body);
    return this.media.createTag(user.sub, dto);
  }

  @Get('files/:id/tags')
  @RequirePermission('media', 'read')
  async listFileTags(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.media.listTagsByFile(user.sub, id);
  }

  @Post('files/:id/tags')
  @RequirePermission('media', 'update')
  async assignTag(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createAndAssignTagSchema.parse(body);
    return this.media.createAndAssignTag(user.sub, id, dto);
  }

  @Delete('files/:id/tags/:tagId')
  @HttpCode(204)
  @RequirePermission('media', 'update')
  async removeTag(@Param('id') id: string, @Param('tagId') tagId: string, @CurrentUser() user: JwtPayload) {
    await this.media.removeTagFromFile(user.sub, id, tagId);
  }
}
