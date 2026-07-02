import {
  Body, Controller, Delete, Get, HttpCode, Inject,
  Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { JellyfinService } from '../services/jellyfin.service';
import { createServerSchema, type CreateServerInput } from '../dtos/jellyfin.dto';

@ApiTags('jellyfin')
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionGuard)
@Controller('jellyfin')
export class JellyfinController {
  constructor(@Inject(JellyfinService) private readonly jellyfin: JellyfinService) {}

  @Post('servers')
  @RequirePermission('jellyfin', 'create')
  @ApiOperation({ summary: 'Jellyfin-Server verbinden' })
  async connectServer(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto: CreateServerInput = createServerSchema.parse(body);
    return this.jellyfin.connectServer(user.sub, dto);
  }

  @Get('default')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Hardcodierten Default-Jellyfin-Server abrufen' })
  async getDefaultServer() {
    return this.jellyfin.getDefaultServer();
  }

  @Get('servers')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Verbunde Jellyfin-Server auflisten' })
  async listServers(@CurrentUser() user: JwtPayload) {
    return this.jellyfin.listServers(user.sub);
  }

  @Delete('servers/:id')
  @HttpCode(204)
  @RequirePermission('jellyfin', 'delete')
  @ApiOperation({ summary: 'Jellyfin-Server entfernen' })
  async deleteServer(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.jellyfin.deleteServer(user.sub, id);
  }

  @Post('servers/:id/sync')
  @RequirePermission('jellyfin', 'update')
  @ApiOperation({ summary: 'Libraries und Items von Jellyfin syncen' })
  async syncServer(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jellyfin.syncServer(user.sub, id);
  }

  @Get('libraries')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Bibliotheken auflisten' })
  async listLibraries(@CurrentUser() user: JwtPayload, @Query('serverId') serverId?: string) {
    return this.jellyfin.listLibraries(user.sub, serverId);
  }

  @Get('items')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Medienelemente auflisten' })
  async listItems(@CurrentUser() user: JwtPayload, @Query('libraryId') libraryId?: string) {
    return this.jellyfin.listItems(user.sub, libraryId);
  }

  @Post('items/:id/toggle-watched')
  @RequirePermission('jellyfin', 'update')
  @ApiOperation({ summary: 'Watch-Status umschalten' })
  async toggleWatched(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jellyfin.toggleWatched(user.sub, id);
  }

  @Get('items/:id/children')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Unter-Items eines Items abrufen (Serie → Staffeln, Album → Tracks)' })
  async getChildren(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.jellyfin.getChildren(user.sub, id);
  }

  @Get('servers/:serverId/items/:externalId/children')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Unter-Items per externer Jellyfin-ID abrufen' })
  async getExternalChildren(
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jellyfin.getExternalChildren(user.sub, serverId, externalId);
  }

  @Get('artists')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Künstler aus Jellyfin abrufen' })
  async getArtists(@CurrentUser() user: JwtPayload, @Query('serverId') serverId: string) {
    return this.jellyfin.getArtists(user.sub, serverId);
  }

  @Get('albums')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Alben eines Künstlers abrufen' })
  async getAlbums(
    @CurrentUser() user: JwtPayload,
    @Query('serverId') serverId: string,
    @Query('artistId') artistId: string,
  ) {
    return this.jellyfin.getAlbums(user.sub, serverId, artistId);
  }
}
