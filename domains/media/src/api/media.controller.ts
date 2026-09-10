import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Param, Post, Put, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, verifyAccessToken, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { MediaService } from '../services/media.service';
import { MediaLockService } from '../services/media-lock.service';
import { createSourceSchema, updateSourceSchema, createAlbumSchema, updateAlbumSchema, addToAlbumSchema, createTagSchema, createAndAssignTagSchema, assignTagSchema, lockPinSchema, unlockSchema, resetPinSchema } from '../dtos/media.dto';
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
  constructor(
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(MediaLockService) private readonly locks: MediaLockService,
  ) {}

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
    @Query('tagId') tagId: string | undefined,
    @Query('hasGps') hasGps: string | undefined,
    @Query('type') type: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    // type strikt validieren: nur 'image'/'video', sonst 400 statt stiller Voll-Liste.
    if (type !== undefined && type !== 'image' && type !== 'video') {
      throw new BadRequestException("Query param 'type' must be 'image' or 'video'");
    }
    return this.media.listFiles(user.sub, {
      sourceId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      favorite: favorite === 'true' || favorite === '1',
      tagId,
      hasGps: hasGps === 'true' || hasGps === '1',
      type: type as 'image' | 'video' | undefined,
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

  @Put('files/:id/tags')
  @RequirePermission('media', 'update')
  async assignExistingTag(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = assignTagSchema.parse(body);
    return this.media.assignExistingTag(user.sub, id, dto.tagId);
  }

  @Delete('files/:id/tags/:tagId')
  @HttpCode(204)
  @RequirePermission('media', 'update')
  async removeTag(@Param('id') id: string, @Param('tagId') tagId: string, @CurrentUser() user: JwtPayload) {
    await this.media.removeTagFromFile(user.sub, id, tagId);
  }

  // ========== GESPERRTE MEDIEN ==========
  // PIN + Lock-Token-Flow (Details siehe Report):
  // 1) PUT /media/locked/pin {pin} → PIN setzen
  // 2) POST /media/files/:id/lock → Datei sperren
  // 3) POST /media/locked/unlock {pin} → {lockToken} (15min, scope media:locked)
  // 4) GET /media/locked?lockToken=… / Stream / Thumbnail mit lockToken

  @Get('locked/pin/status')
  @RequirePermission('media', 'read')
  async lockPinStatus(@CurrentUser() user: JwtPayload) {
    return this.locks.pinStatus(user.sub);
  }

  @Put('locked/pin')
  @RequirePermission('media', 'update')
  async setLockPin(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = lockPinSchema.parse(body);
    return this.locks.setPin(user.sub, dto.pin, dto.oldPin);
  }

  // PIN-Reset bei vergessener PIN: authentifiziert per Account-Passwort
  // (NICHT per alter PIN). Löscht die PIN und entsperrt alle gesperrten
  // Dateien des Owners (voller Zugriff wird wiederhergestellt).
  // Altausgestellte Lock-Token (15min TTL) verfallen wirkungslos — ohne PIN
  // ist kein Lock-Token mehr für irgendeine Aktion erforderlich.
  @Delete('locked/pin')
  @HttpCode(200)
  @RequirePermission('media', 'update')
  async resetLockPin(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = resetPinSchema.parse(body);
    return this.locks.resetPin(user.sub, dto.password);
  }

  @Post('locked/unlock')
  @HttpCode(200)
  @RequirePermission('media', 'read')
  async unlockLocked(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = unlockSchema.parse(body);
    return this.locks.unlock(user.sub, dto.pin);
  }

  @Get('locked')
  @RequirePermission('media', 'read')
  async listLocked(
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @Query('lockToken') lockToken: string | undefined,
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
  ) {
    const token = this.locks.extractLockToken(lockToken, req.headers.authorization);
    if (!(await this.locks.isValidLockToken(user.sub, token))) {
      throw new ForbiddenException('Gültiger Lock-Token erforderlich (POST /media/locked/unlock)');
    }
    return this.media.listLockedFiles(user.sub, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Post('files/:id/lock')
  @HttpCode(200)
  @RequirePermission('media', 'update')
  async lockFile(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.locks.lockFile(user.sub, id);
  }

  @Post('files/:id/unlock')
  @HttpCode(200)
  @RequirePermission('media', 'update')
  async unlockFile(
    @Param('id') id: string,
    @Query('lockToken') lockToken: string | undefined,
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
  ) {
    const token = this.locks.extractLockToken(lockToken, req.headers.authorization);
    if (!(await this.locks.isValidLockToken(user.sub, token))) {
      throw new ForbiddenException('Gültiger Lock-Token erforderlich (POST /media/locked/unlock)');
    }
    return this.locks.unlockFile(user.sub, id);
  }
}
