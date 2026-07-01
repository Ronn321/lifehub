import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { execFile } from 'child_process';
import { JellyfinRepository } from '../repositories/jellyfin.repository';
import type { JellyfinServer, JellyfinLibrary, JellyfinItem, MediaStreamInfo } from '../entities/jellyfin';
import type { CreateServerInput } from '../dtos/jellyfin.dto';

@Injectable()
export class JellyfinService {
  // In-memory subtitle cache: key = "itemId:subtitleIndex" → VTT text
  private subtitleCache = new Map<string, string>();

  constructor(
    @Inject(JellyfinRepository) private readonly repo: JellyfinRepository,
  ) {}

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
  async listItems(ownerId: string, libraryId?: string): Promise<JellyfinItem[]> {
    if (libraryId) {
      const items = await this.repo.findItemsByLibrary(libraryId);
      return items.filter((i) => i.ownerId === ownerId);
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
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');

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

    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');

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
  async getItemStream(ownerId: string, itemId: string, rangeHeader?: string) {
    const item = await this.repo.findItemById(itemId);
    if (!item || item.ownerId !== ownerId) throw new NotFoundException('Item nicht gefunden');
    const library = await this.repo.findLibraryById(item.libraryId);
    if (!library) throw new NotFoundException('Bibliothek nicht gefunden');
    const server = await this.repo.findServerById(library.serverId);
    if (!server) throw new NotFoundException('Server nicht gefunden');

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
    const server = await this.repo.findServerById(library.serverId);
    if (!server) throw new NotFoundException('Server nicht gefunden');
    return this.fetchJellyfinChildren(server, item.externalId);
  }

  async getExternalChildren(ownerId: string, serverId: string, externalId: string): Promise<any[]> {
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');
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
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');
    const data = await this.fetchFromJellyfin(server, '/Artists/AlbumArtists');
    return data.Items ?? [];
  }

  async getAlbums(ownerId: string, serverId: string, artistId: string): Promise<any[]> {
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');
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
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');

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
  ) {
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');

    const baseUrl = server.url.replace(/\/$/, '');
    const imageUrl = `${baseUrl}/Items/${externalId}/Images/Primary?fillHeight=${height}&fillWidth=${width}&quality=90`;
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
    const server = await this.repo.findServerById(serverId);
    if (!server || server.ownerId !== ownerId) throw new NotFoundException('Server nicht gefunden');

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
