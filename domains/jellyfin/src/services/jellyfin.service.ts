import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { execFile } from 'child_process';
import { JellyfinRepository } from '../repositories/jellyfin.repository';
import type { JellyfinServer, JellyfinLibrary, JellyfinItem, MediaStreamInfo } from '../entities/jellyfin';
import type { CreateServerInput } from '../dtos/jellyfin.dto';

@Injectable()
export class JellyfinService {
  private subtitleCache = new Map<string, string>();

  private readonly defaultUrl = process.env.JELLYFIN_URL || 'http://192.168.31.35:8096';
  private readonly defaultApiKey = process.env.JELLYFIN_API_KEY || '0fde01a7adda4a40a3281c1cd3af1c5d';

  constructor(
    @Inject(JellyfinRepository) private readonly repo: JellyfinRepository,
  ) {}

  private async findServerOrFallback(serverId: string, ownerId?: string): Promise<JellyfinServer> {
    // Handle "default" serverId gracefully — skip DB lookup
    if (serverId !== 'default') {
      const server = await this.repo.findServerById(serverId);
      if (server && (!ownerId || server.ownerId === ownerId)) return server;
    }
    return {
      id: 'default',
      url: this.defaultUrl,
      apiKey: this.defaultApiKey,
      isActive: true,
      ownerId: ownerId ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getDefaultServer(): Promise<{ url: string; apiKey: string; id: string }> {
    return { url: this.defaultUrl, apiKey: this.defaultApiKey, id: 'default' };
  }

  // =================== Servers ===================
  async listServers(ownerId: string): Promise<JellyfinServer[]> {
    return this.repo.findServersByOwner(ownerId);
  }

  async connectServer(ownerId: string, input: CreateServerInput): Promise<JellyfinServer> {
    const servers = await this.repo.findServersByOwner(ownerId);
    if (servers.length >= 10) {
      throw new BadRequestException('Maximal 10 Jellyfin-Server erlaubt');
    }
    return this.repo.createServer({ ...input, ownerId });
  }

  async deleteServer(ownerId: string, id: string): Promise<void> {
    const server = await this.repo.findServerById(id);
    if (!server || server.ownerId !== ownerId) {
      throw new NotFoundException('Server nicht gefunden');
    }
    await this.repo.deleteServer(id);
  }

  // =================== Sync ===================
  async syncServer(ownerId: string, serverId: string): Promise<{ libraries: number; items: number }> {
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) {
      throw new NotFoundException('Server nicht gefunden');
    }

    const libraries = await this.fetchLibrariesFromJellyfin(server);
    let totalItems = 0;

    for (const lib of libraries) {
      const saved = await this.repo.upsertLibrary({
        serverId: server.id,
        externalId: lib.externalId,
        name: lib.name,
        type: lib.type,
        ownerId,
      });

      const items = await this.fetchItemsFromJellyfin(server, lib.externalId!);
      for (const item of items) {
        await this.repo.upsertItem({
          libraryId: saved.id,
          externalId: item.externalId,
          name: item.name,
          type: item.type,
          path: item.path ?? null,
          ownerId,
        });
        totalItems++;
      }
    }

    // Touch updated_at on server so frontend sees new sync timestamp
    await this.repo.touchServer(serverId);

    return { libraries: libraries.length, items: totalItems };
  }

  // =================== Libraries ===================
  async listLibraries(ownerId: string, serverId?: string): Promise<(JellyfinLibrary & { server?: JellyfinServer })[]> {
    let libraries: JellyfinLibrary[];
    if (serverId) {
      const server = await this.repo.findServerById(serverId);
      if (!server || server.ownerId !== ownerId) {
        throw new NotFoundException('Server nicht gefunden');
      }
      libraries = await this.repo.findLibrariesByServer(serverId);
    } else {
      libraries = await this.repo.findLibrariesByOwner(ownerId);
    }
    const servers = await this.repo.findServersByOwner(ownerId);
    const serverMap = new Map(servers.map((s) => [s.id, s]));
    return libraries.map((lib) => ({
      ...lib,
      server: serverMap.get(lib.serverId),
    }));
  }

  // =================== Items ===================
  async listItems(ownerId: string, libraryId?: string, libraryType?: string, refresh?: boolean): Promise<JellyfinItem[] | any[]> {
    // If refresh=true, fetch from Jellyfin directly with rich metadata
    if (refresh && libraryId) {
      const library = await this.repo.findLibraryById(libraryId);
      if (!library) throw new NotFoundException('Bibliothek nicht gefunden');
      const server = await this.findServerOrFallback(library.serverId, ownerId);
      return this.browseJellyfinLibrary(server, library.externalId!, ownerId, library.type);
    }
    // If libraryId is given, filter by library directly
    if (libraryId) {
      const items = await this.repo.findItemsByLibrary(libraryId);
      return items.filter((i) => i.ownerId === ownerId);
    }
    // If libraryType is given, filter items whose parent library has that type
    if (libraryType) {
      const libraries = await this.repo.findLibrariesByOwner(ownerId);
      const matchingLibIds = libraries
        .filter((l) => l.type?.toLowerCase() === libraryType.toLowerCase())
        .map((l) => l.id);
      if (matchingLibIds.length === 0) return [];
      const allItems = await this.repo.findItemsByOwner(ownerId);
      return allItems.filter((i) => matchingLibIds.includes(i.libraryId));
    }
    return this.repo.findItemsByOwner(ownerId);
  }

  async toggleWatched(ownerId: string, itemId: string): Promise<JellyfinItem> {
    const item = await this.repo.findItemById(itemId);
    if (!item || item.ownerId !== ownerId) {
      throw new NotFoundException('Medienelement nicht gefunden');
    }
    const updated = await this.repo.toggleWatched(itemId);
    if (!updated) throw new NotFoundException('Medienelement nicht gefunden');
    return updated;
  }

  // =================== Media Info ===================
  async getMediaInfo(
    ownerId: string,
    serverId: string,
    externalId: string,
  ): Promise<{ mediaSourceId: string; streams: MediaStreamInfo[] }> {
    const server = await this.findServerOrFallback(serverId, ownerId);

    const baseUrl = server.url.replace(/\/$/, '');
    const authHeaders = { 'Authorization': `MediaBrowser Token=${server.apiKey}` };

    const userId = await this.getJellyfinUserId(server);
    const infoRes = await fetch(`${baseUrl}/Items/${externalId}/PlaybackInfo`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserId: userId }),
    });
    if (!infoRes.ok) throw new Error(`PlaybackInfo failed: ${infoRes.status}`);

    const infoData: any = await infoRes.json();
    const mediaSource = infoData?.MediaSources?.[0];
    if (!mediaSource) throw new Error('No MediaSource found');

    const mediaSourceId: string = mediaSource.Id;
    const rawStreams: any[] = mediaSource.MediaStreams ?? [];

    const streams: MediaStreamInfo[] = rawStreams.map((s: any) => ({
      type: s.Type as 'Video' | 'Audio' | 'Subtitle',
      index: s.Index,
      codec: s.Codec,
      language: s.Language ?? null,
      title: s.Title ?? null,
      isDefault: s.IsDefault ?? false,
      isForced: s.IsForced ?? false,
      width: s.Width ?? null,
      height: s.Height ?? null,
      bitrate: s.Bitrate ?? null,
      deliveryMethod: s.DeliveryMethod ?? null,
      deliveryUrl: s.DeliveryUrl ?? null,
    }));

    return { mediaSourceId, streams };
  }

  // =================== Subtitle Extraction ===================
  async getSubtitle(
    ownerId: string,
    serverId: string,
    externalId: string,
    subtitleIndex: number,
  ): Promise<string> {
    const cacheKey = `${externalId}:${subtitleIndex}`;
    const cached = this.subtitleCache.get(cacheKey);
    if (cached) return cached;

    const server = await this.findServerOrFallback(serverId, ownerId);

    const baseUrl = server.url.replace(/\/$/, '');
    const authHeaders = { 'Authorization': `MediaBrowser Token=${server.apiKey}` };

    const userId = await this.getJellyfinUserId(server);
    const infoRes = await fetch(`${baseUrl}/Items/${externalId}/PlaybackInfo`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserId: userId }),
    });
    if (!infoRes.ok) throw new Error(`PlaybackInfo failed: ${infoRes.status}`);
    const infoData: any = await infoRes.json();
    const mediaSourceId = infoData?.MediaSources?.[0]?.Id;
    if (!mediaSourceId) throw new Error('No MediaSource');

    // Build Jellyfin static stream URL for FFmpeg to read from
    const streamUrl = `${baseUrl}/Videos/${externalId}/stream?static=true&MediaSourceId=${mediaSourceId}&api_key=${server.apiKey}`;

    // Extract subtitle with FFmpeg via HTTP stream → WebVTT
    // Use absolute stream index (0:3 for this item) instead of 0:s:N
    const vtt = await new Promise<string>((resolve, reject) => {
      const args = [
        '-hide_banner', '-loglevel', 'error',
        '-analyzeduration', '10000000',
        '-probesize', '10000000',
        '-i', streamUrl,
        '-map', `0:${subtitleIndex}`,
        '-f', 'webvtt',
        'pipe:1',
      ];
      const child = execFile('ffmpeg', args, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 180_000,
      }, (error, stdout, _stderr) => {
        if (error) {
          reject(new Error(`FFmpeg subtitle extraction failed: ${error.message}`));
          return;
        }
        resolve(stdout);
      });
      child.on('error', reject);
    });

    this.subtitleCache.set(cacheKey, vtt);
    return vtt;
  }

  // =================== Streaming ===================

  async getExternalItemStream(
    ownerId: string,
    serverId: string,
    externalId: string,
    rangeHeader?: string,
  ) {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const baseUrl = server.url.replace(/\/$/, '');

    const authHeaders: Record<string, string> = {
      'Authorization': `MediaBrowser Token=${server.apiKey}`,
    };
    if (rangeHeader) authHeaders['Range'] = rangeHeader;

    // Get playback info first for MediaSourceId
    const userId = await this.getJellyfinUserId(server);
    const infoUrl = `${baseUrl}/Items/${externalId}/PlaybackInfo`;
    const infoRes = await fetch(infoUrl, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserId: userId }),
    });
    if (!infoRes.ok) {
      throw new Error(`Jellyfin playback info error: ${infoRes.status} ${infoRes.statusText}`);
    }
    const infoData: any = await infoRes.json();
    const mediaSourceId = infoData?.MediaSources?.[0]?.Id;
    if (!mediaSourceId) {
      throw new Error('No MediaSource found for this item');
    }

    // Direct audio streaming URL — use mp3 container for broad browser support
    const streamUrl = `${baseUrl}/Audio/${externalId}/stream?static=true&MediaSourceId=${mediaSourceId}&Container=mp3`;

    const fetchHeaders: Record<string, string> = {
      'Authorization': `MediaBrowser Token=${server.apiKey}`,
    };
    if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

    const jellyfinRes = await fetch(streamUrl, { headers: fetchHeaders, redirect: 'follow' });

    if (!jellyfinRes.ok && jellyfinRes.status !== 206) {
      throw new Error(`Jellyfin stream error: ${jellyfinRes.status} ${jellyfinRes.statusText}`);
    }

    const mimeType = jellyfinRes.headers.get('content-type') ?? 'audio/mpeg';

    const stream = jellyfinRes.body ? Readable.fromWeb(jellyfinRes.body as any) : null;

    const responseHeaders: Record<string, string> = {};
    jellyfinRes.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      stream,
      mimeType,
      statusCode: jellyfinRes.status,
      headers: responseHeaders,
    };
  }

  async getItemStream(ownerId: string, itemId: string, rangeHeader?: string) {
    const item = await this.repo.findItemById(itemId);
    if (!item || item.ownerId !== ownerId) throw new NotFoundException('Item nicht gefunden');
    const library = await this.repo.findLibraryById(item.libraryId);
    if (!library) throw new NotFoundException('Bibliothek nicht gefunden');
    const server = await this.findServerOrFallback(library.serverId, ownerId);

    const baseUrl = server.url.replace(/\/$/, '');

    const mediaType = item.type.toLowerCase();
    const isVideo = ['movie', 'episode', 'series', 'video'].includes(mediaType);

    const authHeaders: Record<string, string> = {
      'Authorization': `MediaBrowser Token=${server.apiKey}`,
    };
    if (rangeHeader) authHeaders['Range'] = rangeHeader;

    // Get playback info first for MediaSourceId
    const userId = await this.getJellyfinUserId(server);
    const infoUrl = `${baseUrl}/Items/${item.externalId}/PlaybackInfo`;
    const infoRes = await fetch(infoUrl, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserId: userId }),
    });
    if (!infoRes.ok) {
      throw new Error(`Jellyfin playback info error: ${infoRes.status} ${infoRes.statusText}`);
    }
    const infoData: any = await infoRes.json();
    const mediaSourceId = infoData?.MediaSources?.[0]?.Id;
    if (!mediaSourceId) {
      throw new Error('No MediaSource found for this item');
    }

    const streamUrl = `${baseUrl}/${isVideo ? 'Videos' : 'Audio'}/${item.externalId}/stream?static=true&MediaSourceId=${mediaSourceId}&Container=mp4`;

    const fetchHeaders: Record<string, string> = {
      'Authorization': `MediaBrowser Token=${server.apiKey}`,
    };
    if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

    const jellyfinRes = await fetch(streamUrl, { headers: fetchHeaders, redirect: 'follow' });

    if (!jellyfinRes.ok && jellyfinRes.status !== 206) {
      throw new Error(`Jellyfin stream error: ${jellyfinRes.status} ${jellyfinRes.statusText}`);
    }

    const mimeType = jellyfinRes.headers.get('content-type') ?? this.getMimeTypeForItem(item.type);
    const ext = this.getExtension(mimeType);
    const filename = `${item.name}${ext}`;

    const stream = jellyfinRes.body ? Readable.fromWeb(jellyfinRes.body as any) : null;

    const responseHeaders: Record<string, string> = {};
    jellyfinRes.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      stream,
      mimeType,
      filename,
      statusCode: jellyfinRes.status,
      headers: responseHeaders,
    };
  }

  private getMimeTypeForItem(type: string): string {
    const map: Record<string, string> = {
      movie: 'video/mp4',
      episode: 'video/mp4',
      series: 'video/mp4',
      music: 'audio/mpeg',
      audio: 'audio/mpeg',
      photo: 'image/jpeg',
    };
    return map[type] ?? 'video/mp4';
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'video/mp4': '.mp4',
      'video/x-matroska': '.mkv',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/flac': '.flac',
      'audio/ogg': '.ogg',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return map[mimeType] ?? '.mp4';
  }

  // =================== Children / Artists / Albums (Live via Jellyfin API) ===================

  async getChildren(ownerId: string, itemId: string): Promise<any[]> {
    const item = await this.repo.findItemById(itemId);
    if (!item || item.ownerId !== ownerId) throw new NotFoundException('Item nicht gefunden');
    if (!item.externalId) throw new BadRequestException('Item hat keine Jellyfin-ID');
    const library = await this.repo.findLibraryById(item.libraryId);
    if (!library) throw new NotFoundException('Bibliothek nicht gefunden');
    const server = await this.findServerOrFallback(library.serverId, ownerId);
    return this.fetchJellyfinChildren(server, item.externalId);
  }

  async getExternalChildren(ownerId: string, serverId: string, externalId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    return this.fetchJellyfinChildren(server, externalId);
  }

  private async fetchJellyfinChildren(server: JellyfinServer, parentExternalId: string): Promise<any[]> {
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?ParentId=${parentExternalId}&Fields=Path,PrimaryImageAspectRatio,Overview,ProductionYear`,
    );
    return data.Items ?? [];
  }

  async getArtists(ownerId: string, serverId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const data = await this.fetchFromJellyfin(server, '/Artists/AlbumArtists?Fields=Overview,PrimaryImageAspectRatio');
    return data.Items ?? [];
  }

  async getAlbums(ownerId: string, serverId: string, artistId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?IncludeItemTypes=MusicAlbum&ArtistIds=${artistId}&Recursive=true&Fields=Path,PrimaryImageAspectRatio,Overview,ProductionYear&SortBy=ProductionYear,SortName&SortOrder=Descending,Ascending`,
    );
    return data.Items ?? [];
  }

  async getHlsPlaylist(
    ownerId: string,
    serverId: string,
    externalId: string,
    mediaType: 'Audio' | 'Video',
    audioStreamIndex?: number,
    subtitleStreamIndex?: number,
  ): Promise<string> {
    const server = await this.findServerOrFallback(serverId, ownerId);

    const baseUrl = server.url.replace(/\/$/, '');
    const authHeaders = { 'Authorization': `MediaBrowser Token=${server.apiKey}` };

    // Get MediaSourceId from PlaybackInfo
    const userId = await this.getJellyfinUserId(server);
    const infoRes = await fetch(`${baseUrl}/Items/${externalId}/PlaybackInfo`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserId: userId }),
    });
    if (!infoRes.ok) throw new Error(`PlaybackInfo failed: ${infoRes.status}`);
    const infoData: any = await infoRes.json();
    const mediaSourceId = infoData?.MediaSources?.[0]?.Id;
    if (!mediaSourceId) throw new Error('No MediaSource');

    // Fetch HLS playlist from Jellyfin — force H.264 for browser compatibility
    const params = new URLSearchParams({ MediaSourceId: mediaSourceId });
    if (mediaType === 'Video') params.set('VideoCodec', 'h264');
    if (audioStreamIndex !== undefined) params.set('AudioStreamIndex', String(audioStreamIndex));
    if (subtitleStreamIndex !== undefined) params.set('SubtitleStreamIndex', String(subtitleStreamIndex));
    const hlsUrl = `${baseUrl}/${mediaType === 'Video' ? 'Videos' : 'Audio'}/${externalId}/master.m3u8?${params.toString()}`;
    const hlsRes = await fetch(hlsUrl, { headers: authHeaders });
    if (!hlsRes.ok) throw new Error(`HLS fetch failed: ${hlsRes.status}`);
    return hlsRes.text();
  }

  async proxyImage(
    ownerId: string,
    serverId: string,
    externalId: string,
    width: number,
    height: number,
    imageType: string = 'Primary',
  ) {
    const server = await this.findServerOrFallback(serverId, ownerId);

    const baseUrl = server.url.replace(/\/$/, '');
    const userId = await this.getJellyfinUserId(server);
    const imageUrl = `${baseUrl}/Items/${externalId}/Images/${imageType}?width=${width}&height=${height}&quality=90&UserId=${userId}`;
    const res = await fetch(imageUrl, {
      headers: { 'Authorization': `MediaBrowser Token=${server.apiKey}` },
    });
    if (!res.ok) throw new NotFoundException('Bild nicht gefunden');

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { stream: res.body ? Readable.fromWeb(res.body as any) : null, statusCode: res.status, headers };
  }

  async proxyHlsSegment(
    ownerId: string,
    serverId: string,
    externalId: string,
    segmentPath: string,
  ) {
    const server = await this.findServerOrFallback(serverId, ownerId);

    const baseUrl = server.url.replace(/\/$/, '');
    const segmentUrl = `${baseUrl}/Videos/${externalId}/${segmentPath}`;
    const res = await fetch(segmentUrl, {
      headers: { 'Authorization': `MediaBrowser Token=${server.apiKey}` },
    });
    if (!res.ok) throw new Error(`Segment fetch failed: ${res.status}`);

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { stream: res.body ? Readable.fromWeb(res.body as any) : null, statusCode: res.status, headers };
  }

  // =================== Jellyfin API Helpers ===================
  private async fetchFromJellyfin(server: JellyfinServer, path: string): Promise<any> {
    const url = `${server.url.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `MediaBrowser Token=${server.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Jellyfin API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  private async fetchLibrariesFromJellyfin(server: JellyfinServer): Promise<{ externalId: string; name: string; type: string | null }[]> {
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(server, `/Users/${userId}/Views`);
    const items = data.Items ?? data ?? [];
    return items
      .filter((item: any) => item.CollectionType)
      .map((item: any) => ({
        externalId: item.Id,
        name: item.Name,
        type: item.CollectionType ?? null,
      }));
  }

  private async fetchItemsFromJellyfin(server: JellyfinServer, libraryId: string): Promise<{ externalId: string; name: string; type: string; path: string | null }[]> {
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(server, `/Users/${userId}/Items?ParentId=${libraryId}&Fields=Path`);
    const items = data.Items ?? data ?? [];
    return items.map((item: any) => ({
      externalId: item.Id,
      name: item.Name,
      type: item.Type?.toLowerCase() ?? 'unknown',
      path: item.Path ?? null,
    }));
  }

  // =================== Music v0.2 API Extensions ===================

  async getGenres(ownerId: string, serverId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    // Genres are stored at the Artist level in Jellyfin, not on individual audio tracks.
    // Query AlbumArtists with Genre field and extract unique genres.
    const data = await this.fetchFromJellyfin(
      server,
      `/Artists/AlbumArtists?UserId=${userId}&Fields=Genres&Limit=500`,
    );
    const artists: any[] = data.Items ?? [];
    const genreSet = new Set<string>();
    for (const artist of artists) {
      for (const genre of artist.Genres ?? []) {
        genreSet.add(genre);
      }
    }
    const genres = Array.from(genreSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ Name: name, Id: name }));
    return genres;
  }

  async searchMusic(ownerId: string, serverId: string, query: string): Promise<{
    Artists: any[];
    Albums: any[];
    Songs: any[];
  }> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const searchTerm = encodeURIComponent(query);

    const res = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?searchTerm=${searchTerm}&Recursive=true&IncludeItemTypes=Audio,MusicAlbum,MusicArtist&Fields=BasicSyncs,AudioInfo,PrimaryImageAspectRatio&Limit=30`,
    );
    const items: any[] = res.Items ?? [];

    return {
      Artists: items.filter((i) => i.Type === 'MusicArtist'),
      Albums: items.filter((i) => i.Type === 'MusicAlbum'),
      Songs: items.filter((i) => i.Type === 'Audio'),
    };
  }

  async getRecentlyPlayed(ownerId: string, serverId: string, limit = 12): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?SortBy=DatePlayed&SortOrder=Descending&IncludeItemTypes=Audio&Limit=${limit}&Recursive=true&Fields=AudioInfo,PrimaryImageAspectRatio`,
    );
    return data.Items ?? [];
  }

  async getFavoriteSongs(ownerId: string, serverId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?Filters=IsFavorite&IncludeItemTypes=Audio&Recursive=true&Fields=AudioInfo,PrimaryImageAspectRatio`,
    );
    return data.Items ?? [];
  }

  async getAllSongs(
    ownerId: string,
    serverId: string,
    params: { sortBy?: string; sortOrder?: string; limit?: number; startIndex?: number },
  ): Promise<{ items: any[]; totalRecordCount: number }> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const sortBy = params.sortBy ?? 'SortName';
    const sortOrder = params.sortOrder ?? 'Ascending';
    const limit = params.limit ?? 100;
    const startIndex = params.startIndex ?? 0;
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?IncludeItemTypes=Audio&Recursive=true&SortBy=${sortBy}&SortOrder=${sortOrder}&Limit=${limit}&StartIndex=${startIndex}&Fields=AudioInfo,PrimaryImageAspectRatio`,
    );
    return {
      items: data.Items ?? [],
      totalRecordCount: data.TotalRecordCount ?? 0,
    };
  }

  async getRecentAlbums(ownerId: string, serverId: string, limit = 12): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=MusicAlbum&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio`,
    );
    return data.Items ?? [];
  }

  async getAlbumSongs(ownerId: string, serverId: string, albumId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?ParentId=${albumId}&IncludeItemTypes=Audio&SortBy=IndexNumber&Fields=AudioInfo,PrimaryImageAspectRatio`,
    );
    return data.Items ?? [];
  }

  async getSongsByGenre(ownerId: string, serverId: string, genreId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?IncludeItemTypes=Audio&GenreIds=${genreId}&Recursive=true&SortBy=SortName&SortOrder=Ascending&Fields=AudioInfo,PrimaryImageAspectRatio`,
    );
    return data.Items ?? [];
  }

  async getTopSongs(ownerId: string, serverId: string, artistId: string, limit = 10): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?ArtistIds=${artistId}&IncludeItemTypes=Audio&Recursive=true&SortBy=PlayCount&SortOrder=Descending&Limit=${limit}&Fields=AudioInfo,PrimaryImageAspectRatio`,
    );
    return data.Items ?? [];
  }

  // =================== Playlist Endpoints ===================

  async getPlaylists(ownerId: string, serverId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?IncludeItemTypes=Playlist&Recursive=true&Fields=PrimaryImageAspectRatio,Overview,ChildCount,RunTimeTicks,CumulativeRunTimeTicks`,
    );
    return data.Items ?? [];
  }

  async getPlaylist(ownerId: string, serverId: string, playlistId: string): Promise<any> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    return this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items/${playlistId}?Fields=PrimaryImageAspectRatio,Overview,ChildCount,RunTimeTicks,CumulativeRunTimeTicks`,
    );
  }

  async getPlaylistItems(ownerId: string, serverId: string, playlistId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?ParentId=${playlistId}&Recursive=true&IncludeItemTypes=Audio&Fields=AudioInfo,PrimaryImageAspectRatio`,
    );
    return data.Items ?? [];
  }

  // =================== Media v0.3 API Extensions (Netflix-style Movies & Series) ===================

  async getItemDetail(ownerId: string, serverId: string, externalId: string): Promise<any> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    return this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items/${externalId}?Fields=Path,Overview,ProductionYear,Genres,People,Studios,ProviderIds,CommunityRating,VoteCount,RunTimeTicks,OfficialRating,ProductionLocations,Tags,MediaSources,MediaStreams,ParentId,DateCreated,Chapters,CriticRating`,
    );
  }

  async getContinueWatching(ownerId: string, serverId: string, limit = 20): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?ResumeItem=resume&Limit=${limit}&Recursive=true&Fields=PrimaryImageAspectRatio,Overview,Path,ProductionYear,RunTimeTicks&ImageTypeLimit=1&IncludeItemTypes=Movie,Series,Episode`,
    );
    return data.Items ?? [];
  }

  async getSimilarItems(ownerId: string, serverId: string, externalId: string, includeTypes = 'Movie,Series', limit = 12): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const data = await this.fetchFromJellyfin(
      server,
      `/Items/${externalId}/Similar?UserId=${await this.getJellyfinUserId(server)}&Limit=${limit}&Fields=PrimaryImageAspectRatio,Overview,ProductionYear,RunTimeTicks&IncludeItemTypes=${includeTypes}`,
    );
    return data.Items ?? [];
  }

  async getItemPeople(ownerId: string, serverId: string, externalId: string): Promise<any[]> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const data = await this.fetchFromJellyfin(
      server,
      `/Items/${externalId}/People`,
    );
    return data.Items ?? [];
  }

  async searchMedia(ownerId: string, serverId: string, query: string, limit = 30): Promise<{ Movies: any[]; Series: any[]; Episodes: any[]; Collections: any[] }> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const searchTerm = encodeURIComponent(query);
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?searchTerm=${searchTerm}&Recursive=true&IncludeItemTypes=Movie,Series,Episode,BoxSet&Fields=PrimaryImageAspectRatio,Overview,ProductionYear,RunTimeTicks&Limit=${limit}`,
    );
    const items: any[] = data.Items ?? [];
    return {
      Movies: items.filter((i) => i.Type === 'Movie'),
      Series: items.filter((i) => i.Type === 'Series'),
      Episodes: items.filter((i) => i.Type === 'Episode'),
      Collections: items.filter((i) => i.Type === 'BoxSet'),
    };
  }

  // =================== Library Browse (live from Jellyfin with rich fields) ===================

  private async browseJellyfinLibrary(server: JellyfinServer, libraryExternalId: string, ownerId: string, libraryType?: string | null): Promise<any[]> {
    const userId = await this.getJellyfinUserId(server);
    const includeTypes = libraryType === 'movies' ? 'Movie' : libraryType === 'tvshows' ? 'Series' : 'Movie,Series';
    const data = await this.fetchFromJellyfin(
      server,
      `/Users/${userId}/Items?ParentId=${libraryExternalId}&Recursive=true&IncludeItemTypes=${includeTypes}&Fields=PrimaryImageAspectRatio,Overview,ProductionYear,Genres,Path,RunTimeTicks,CommunityRating,OfficialRating&SortBy=SortName&SortOrder=Ascending`,
    );
    return data.Items ?? [];
  }

  async toggleFavorite(ownerId: string, serverId: string, externalId: string): Promise<{ isFavorite: boolean }> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const userId = await this.getJellyfinUserId(server);
    const baseUrl = server.url.replace(/\/$/, '');
    const authHeaders = { 'Authorization': `MediaBrowser Token=${server.apiKey}` };

    // Check current favorite state
    const currentItem = await this.fetchFromJellyfin(server, `/Users/${userId}/Items/${externalId}?Fields=UserData`);
    const isCurrentlyFavorite = currentItem?.UserData?.IsFavorite ?? false;

    if (isCurrentlyFavorite) {
      // Remove favorite
      const res = await fetch(`${baseUrl}/Users/${userId}/FavoriteItems/${externalId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Favorite removal failed: ${res.status}`);
      return { isFavorite: false };
    } else {
      // Add favorite
      const res = await fetch(`${baseUrl}/Users/${userId}/FavoriteItems/${externalId}`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Favorite add failed: ${res.status}`);
      return { isFavorite: true };
    }
  }

  // =================== Playback Reporting ===================

  async reportPlaybackStart(
    ownerId: string,
    serverId: string,
    itemId: string,
    positionTicks: number,
  ): Promise<void> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const baseUrl = server.url.replace(/\/$/, '');
    const authHeaders = { 'Authorization': `MediaBrowser Token=${server.apiKey}` };

    const res = await fetch(`${baseUrl}/Sessions/Playing`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }),
    });
    if (!res.ok) throw new Error(`Playback start report failed: ${res.status}`);
  }

  async reportPlaybackProgress(
    ownerId: string,
    serverId: string,
    itemId: string,
    positionTicks: number,
    isPaused: boolean,
  ): Promise<void> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const baseUrl = server.url.replace(/\/$/, '');
    const authHeaders = { 'Authorization': `MediaBrowser Token=${server.apiKey}` };

    const res = await fetch(`${baseUrl}/Sessions/Playing/Progress`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks, IsPaused: isPaused }),
    });
    if (!res.ok) throw new Error(`Playback progress report failed: ${res.status}`);
  }

  async reportPlaybackStop(
    ownerId: string,
    serverId: string,
    itemId: string,
    positionTicks: number,
  ): Promise<void> {
    const server = await this.findServerOrFallback(serverId, ownerId);
    const baseUrl = server.url.replace(/\/$/, '');
    const authHeaders = { 'Authorization': `MediaBrowser Token=${server.apiKey}` };

    const res = await fetch(`${baseUrl}/Sessions/Playing/Stopped`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ItemId: itemId, PositionTicks: positionTicks }),
    });
    if (!res.ok) throw new Error(`Playback stop report failed: ${res.status}`);
  }

  private cachedUserId: string | null = null;
  private async getJellyfinUserId(server: JellyfinServer): Promise<string> {
    if (this.cachedUserId) return this.cachedUserId;
    const data = await this.fetchFromJellyfin(server, '/Users');
    if (Array.isArray(data) && data.length > 0) {
      const uid = data[0].Id;
      if (typeof uid === 'string' && uid.length > 0) {
        this.cachedUserId = uid;
        return uid;
      }
    }
    throw new Error('No Jellyfin user found');
  }
}
