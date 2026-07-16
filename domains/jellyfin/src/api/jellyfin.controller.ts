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
  @ApiOperation({ summary: 'Hardcodierten Default-Jellyfin-Server abrufen (keine Permission nötig)' })
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
  @ApiOperation({ summary: 'Medienelemente auflisten (optional mit refresh=true für Live-Daten von Jellyfin)' })
  async listItems(
    @CurrentUser() user: JwtPayload,
    @Query('libraryId') libraryId?: string,
    @Query('libraryType') libraryType?: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.jellyfin.listItems(user.sub, libraryId, libraryType, refresh === 'true');
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

  // =================== Music v0.2 API Endpoints ===================

  @Get('servers/:serverId/genres')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Musik-Genres aus Jellyfin abrufen' })
  async getGenres(@CurrentUser() user: JwtPayload, @Param('serverId') serverId: string) {
    return this.jellyfin.getGenres(user.sub, serverId);
  }

  @Get('servers/:serverId/genres/:genreId/songs')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Songs eines Genres abrufen' })
  async getGenreSongs(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('genreId') genreId: string,
  ) {
    return this.jellyfin.getSongsByGenre(user.sub, serverId, genreId);
  }

  @Get('servers/:serverId/search')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Musik-Suche (Artists, Albums, Songs kategorisiert)' })
  async searchMusic(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Query('q') query: string,
  ) {
    return this.jellyfin.searchMusic(user.sub, serverId, query);
  }

  @Get('servers/:serverId/recent')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Zuletzt gespielte Songs' })
  async getRecentlyPlayed(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Query('limit') limit?: string,
  ) {
    return this.jellyfin.getRecentlyPlayed(user.sub, serverId, limit ? parseInt(limit, 10) : 12);
  }

  @Get('servers/:serverId/favorites')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Lieblingssongs (Favoriten)' })
  async getFavoriteSongs(@CurrentUser() user: JwtPayload, @Param('serverId') serverId: string) {
    return this.jellyfin.getFavoriteSongs(user.sub, serverId);
  }

  @Get('servers/:serverId/songs')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Alle Songs (paginiert, sortierbar)' })
  async getAllSongs(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('limit') limit?: string,
    @Query('startIndex') startIndex?: string,
  ) {
    return this.jellyfin.getAllSongs(user.sub, serverId, {
      sortBy,
      sortOrder,
      limit: limit ? parseInt(limit, 10) : undefined,
      startIndex: startIndex ? parseInt(startIndex, 10) : undefined,
    });
  }

  @Get('servers/:serverId/albums/recent')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Neu hinzugefügte Alben' })
  async getRecentAlbums(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Query('limit') limit?: string,
  ) {
    return this.jellyfin.getRecentAlbums(user.sub, serverId, limit ? parseInt(limit, 10) : 12);
  }

  @Get('servers/:serverId/albums/:albumId/songs')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Songs eines Albums' })
  async getAlbumSongs(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('albumId') albumId: string,
  ) {
    return this.jellyfin.getAlbumSongs(user.sub, serverId, albumId);
  }

  @Get('servers/:serverId/artists/:artistId/top-songs')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Top-Songs eines Künstlers' })
  async getTopSongs(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('artistId') artistId: string,
    @Query('limit') limit?: string,
  ) {
    return this.jellyfin.getTopSongs(user.sub, serverId, artistId, limit ? parseInt(limit, 10) : 10);
  }

  // =================== Playlist Endpoints ===================

  @Get('servers/:serverId/playlists')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Alle Playlists abrufen' })
  async getPlaylists(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
  ) {
    return this.jellyfin.getPlaylists(user.sub, serverId);
  }

  @Get('servers/:serverId/playlists/:playlistId')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Einzelne Playlist abrufen' })
  async getPlaylist(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('playlistId') playlistId: string,
  ) {
    return this.jellyfin.getPlaylist(user.sub, serverId, playlistId);
  }

  @Get('servers/:serverId/playlists/:playlistId/items')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Songs einer Playlist abrufen' })
  async getPlaylistItems(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('playlistId') playlistId: string,
  ) {
    return this.jellyfin.getPlaylistItems(user.sub, serverId, playlistId);
  }

  @Post('servers/:serverId/playlists')
  @RequirePermission('jellyfin', 'create')
  @ApiOperation({ summary: 'Neue Playlist erstellen' })
  async createPlaylist(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Body() body: { name: string; songIds?: string[] },
  ) {
    return this.jellyfin.createPlaylist(user.sub, serverId, body.name, body.songIds);
  }

  // =================== Media v0.3 API Endpoints (Netflix-style) ===================

  @Get('servers/:serverId/items/:externalId/detail')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Detail-Informationen zu einem Film/Serie aus Jellyfin abrufen' })
  async getItemDetail(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.jellyfin.getItemDetail(user.sub, serverId, externalId);
  }

  @Get('servers/:serverId/continue-watching')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Weiterschauen-Liste (unfertige Medien)' })
  async getContinueWatching(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Query('limit') limit?: string,
  ) {
    return this.jellyfin.getContinueWatching(user.sub, serverId, limit ? parseInt(limit, 10) : 20);
  }

  @Get('servers/:serverId/items/:externalId/similar')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Ähnliche Filme/Serien empfehlen' })
  async getSimilarItems(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
    @Query('limit') limit?: string,
  ) {
    return this.jellyfin.getSimilarItems(user.sub, serverId, externalId, 'Movie,Series', limit ? parseInt(limit, 10) : 12);
  }

  @Get('servers/:serverId/items/:externalId/people')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Cast & Crew eines Films/Serie abrufen' })
  async getItemPeople(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.jellyfin.getItemPeople(user.sub, serverId, externalId);
  }

  @Get('servers/:serverId/search-media')
  @RequirePermission('jellyfin', 'read')
  @ApiOperation({ summary: 'Filme/Serien/Episoden durchsuchen' })
  async searchMedia(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.jellyfin.searchMedia(user.sub, serverId, query, limit ? parseInt(limit, 10) : 30);
  }

  @Post('servers/:serverId/items/:externalId/favorite')
  @RequirePermission('jellyfin', 'update')
  @ApiOperation({ summary: 'Favoriten-Status umschalten (Jellyfin)' })
  async toggleFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.jellyfin.toggleFavorite(user.sub, serverId, externalId);
  }

  // =================== Playback Reporting ===================

  @Post('servers/:serverId/sessions/playing')
  @RequirePermission('jellyfin', 'update')
  @ApiOperation({ summary: 'Playback-Start an Jellyfin melden' })
  async reportPlaybackStart(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Body() body: { itemId: string; positionTicks: number },
  ) {
    await this.jellyfin.reportPlaybackStart(user.sub, serverId, body.itemId, body.positionTicks);
  }

  @Post('servers/:serverId/sessions/progress')
  @RequirePermission('jellyfin', 'update')
  @ApiOperation({ summary: 'Playback-Fortschritt an Jellyfin melden' })
  async reportPlaybackProgress(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Body() body: { itemId: string; positionTicks: number; isPaused: boolean },
  ) {
    await this.jellyfin.reportPlaybackProgress(user.sub, serverId, body.itemId, body.positionTicks, body.isPaused);
  }

  @Post('servers/:serverId/sessions/stopped')
  @RequirePermission('jellyfin', 'update')
  @ApiOperation({ summary: 'Playback-Stopp an Jellyfin melden' })
  async reportPlaybackStop(
    @CurrentUser() user: JwtPayload,
    @Param('serverId') serverId: string,
    @Body() body: { itemId: string; positionTicks: number },
  ) {
    await this.jellyfin.reportPlaybackStop(user.sub, serverId, body.itemId, body.positionTicks);
  }
}
