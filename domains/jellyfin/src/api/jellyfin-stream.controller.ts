import {
  Controller, Get, Head, Inject,
  NotFoundException, Options, Param, Query, Req, Res,
} from '@nestjs/common';
import { verifyAccessToken } from '@lifehub/auth';
import { JellyfinService } from '../services/jellyfin.service';
import type { Request, Response } from 'express';
import type { OutgoingHttpHeaders } from 'http';

function corsHeaders(origin?: string, referer?: string): OutgoingHttpHeaders {
  // Try Origin header first, then Referer, fallback to '*'
  const allowed = origin ?? (referer ? new URL(referer).origin : '*');
  // When allowed is '*', we cannot use credentials
  const useWildcard = allowed === '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': useWildcard ? undefined : 'true' as any,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
}

@Controller('jellyfin')
export class JellyfinStreamController {
  constructor(@Inject(JellyfinService) private readonly jellyfin: JellyfinService) {}

  @Options('items/:id/stream')
  handlePreflight(@Req() req: Request, @Res() res: Response) {
    const headers = corsHeaders(req.headers.origin);
    res.status(204).set(headers).end();
  }

  @Options('servers/:serverId/items/:externalId/stream')
  handleExternalPreflight(@Req() req: Request, @Res() res: Response) {
    const headers = corsHeaders(req.headers.origin);
    res.status(204).set(headers).end();
  }

  @Options('servers/:serverId/items/:externalId/media-info')
  handleMediaInfoPreflight(@Req() req: Request, @Res() res: Response) {
    const headers = corsHeaders(req.headers.origin);
    res.status(204).set(headers).end();
  }

  @Options('servers/:serverId/items/:externalId/subtitles/:subtitleIndex')
  handleSubtitlePreflight(@Req() req: Request, @Res() res: Response) {
    const headers = corsHeaders(req.headers.origin);
    res.status(204).set(headers).end();
  }

  @Options('servers/:serverId/items/:externalId/image')
  handleImagePreflight(@Req() req: Request, @Res() res: Response) {
    const headers = corsHeaders(req.headers.origin);
    res.status(204).set(headers).end();
  }

  @Get('servers/:serverId/items/:externalId/media-info')
  async getMediaInfo(
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const token = this.extractToken(req);
    if (!token) { res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Missing token' }); return; }
    let sub: string;
    try { sub = (await verifyAccessToken(token)).sub; }
    catch { res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Invalid token' }); return; }

    try {
      const info = await this.jellyfin.getMediaInfo(sub, serverId, externalId);
      res.status(200).set(corsHeaders(req.headers.origin)).json(info);
    } catch (err) {
      const status = err instanceof NotFoundException ? 404 : 502;
      res.status(status).set(corsHeaders(req.headers.origin)).json({ error: (err as Error).message });
    }
  }

  @Get('servers/:serverId/items/:externalId/subtitles/:subtitleIndex')
  async getSubtitle(
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
    @Param('subtitleIndex') subtitleIndex: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const token = this.extractToken(req);
    if (!token) { res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Missing token' }); return; }
    let sub: string;
    try { sub = (await verifyAccessToken(token)).sub; }
    catch { res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Invalid token' }); return; }

    try {
      const vtt = await this.jellyfin.getSubtitle(sub, serverId, externalId, Number(subtitleIndex));
      res.status(200).set({
        ...corsHeaders(req.headers.origin),
        'Content-Type': 'text/vtt; charset=utf-8',
      }).send(vtt);
    } catch (err) {
      const status = err instanceof NotFoundException ? 404 : 502;
      res.status(status).set(corsHeaders(req.headers.origin)).json({ error: (err as Error).message });
    }
  }

  @Options('servers/:serverId/items/:externalId/hls/*')
  handleHlsPreflight(@Req() req: Request, @Res() res: Response) {
    const headers = corsHeaders(req.headers.origin);
    res.status(204).set(headers).end();
  }

  @Get('items/:id/stream')
  @Head('items/:id/stream')
  async streamItem(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const token = this.extractToken(req);
    if (!token) {
      res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Missing token' });
      return;
    }
    let sub: string;
    try {
      sub = (await verifyAccessToken(token)).sub;
    } catch {
      res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Invalid token' });
      return;
    }
    try {
      const result = await this.jellyfin.getItemStream(sub, id, req.headers.range as string);
      res.status(result.statusCode ?? 200).set({
        ...result.headers as any,
        ...corsHeaders(req.headers.origin),
      });
      if (result.stream) result.stream.pipe(res);
      else res.end();
    } catch (err) {
      const status = err instanceof NotFoundException ? 404 : 502;
      res.status(status).set(corsHeaders(req.headers.origin)).json({ error: (err as Error).message });
    }
  }

  @Get('servers/:serverId/items/:externalId/stream')
  @Head('servers/:serverId/items/:externalId/stream')
  async streamExternalItem(
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
    @Query('type') type: string,
    @Query('audioStreamIndex') audioStreamIndex: string | undefined,
    @Query('subtitleStreamIndex') subtitleStreamIndex: string | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (req.method === 'HEAD') {
      res.status(200).set({
        ...corsHeaders(req.headers.origin),
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Content-Length': '0',
      }).end();
      return;
    }

    const token = this.extractToken(req);
    if (!token) { res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Missing token' }); return; }
    let sub: string;
    try { sub = (await verifyAccessToken(token)).sub; }
    catch { res.status(401).set(corsHeaders(req.headers.origin)).json({ error: 'Invalid token' }); return; }

    const mediaType: 'Audio' | 'Video' = ['Episode', 'Movie', 'Video'].includes(type) ? 'Video' : 'Audio';

    try {
      // For Audio, proxy the stream directly (browsers need a direct audio URL, not HLS)
      if (mediaType === 'Audio') {
        const result = await this.jellyfin.getExternalItemStream(sub, serverId, externalId, req.headers.range as string);
        res.status(result.statusCode ?? 200).set({
          ...result.headers as any,
          ...corsHeaders(req.headers.origin),
        });
        if (result.stream) result.stream.pipe(res);
        else res.end();
        return;
      }

      // For Video (or unknown), use HLS
      const audioIdx = audioStreamIndex ? Number(audioStreamIndex) : undefined;
      const subtitleIdx = subtitleStreamIndex ? Number(subtitleStreamIndex) : undefined;
      const playlist = await this.jellyfin.getHlsPlaylist(sub, serverId, externalId, mediaType, audioIdx, subtitleIdx);
      const basePath = `/api/v1/jellyfin/servers/${serverId}/items/${externalId}/hls`;
      const tokenParam = `token=${encodeURIComponent(token!)}`;

      // Pass 1: Rewrite non-# lines (variant playlists, segments)
      let rewritten = playlist.replace(
        /^(?!#)(.+\.(?:m3u8|ts|aac|mp4|vtt)\b.*)$/gm,
        (match) => {
          const sep = match.includes('?') ? '&' : '?';
          return `${basePath}/${match}${sep}${tokenParam}`;
        },
      );
      // Pass 2: Rewrite URI= in #EXT-X-MEDIA lines (audio + subtitle sub-playlists)
      rewritten = rewritten.replace(
        /(URI=")([^"]+\.m3u8[^"]*)(")/gi,
        (_match, prefix: string, uri: string, suffix: string) => {
          const sep = uri.includes('?') ? '&' : '?';
          return `${prefix}${basePath}/${uri}${sep}${tokenParam}${suffix}`;
        },
      );
      res.status(200).set({
        ...corsHeaders(req.headers.origin),
        'Content-Type': 'application/vnd.apple.mpegurl',
      }).send(rewritten);
    } catch (err) {
      const status = err instanceof NotFoundException ? 404 : 502;
      res.status(status).set(corsHeaders(req.headers.origin)).json({ error: (err as Error).message });
    }
  }

  @Get('servers/:serverId/items/:externalId/image')
  async proxyImage(
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
    @Query('w') width: string,
    @Query('h') height: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const token = this.extractToken(req);
    if (!token) { res.status(401).set(corsHeaders(req.headers.origin)).end(); return; }
    let sub: string;
    try { sub = (await verifyAccessToken(token)).sub; }
    catch { res.status(401).set(corsHeaders(req.headers.origin)).end(); return; }

    try {
      const result = await this.jellyfin.proxyImage(
        sub, serverId, externalId,
        Number(width) || 300, Number(height) || 300,
      );
      res.status(result.statusCode).set({
        ...result.headers as any,
        ...corsHeaders(req.headers.origin),
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      if (result.stream) result.stream.pipe(res);
      else res.end();
    } catch (err) {
      const status = err instanceof NotFoundException ? 404 : 502;
      res.status(status).set(corsHeaders(req.headers.origin)).end();
    }
  }

  // Proxy HLS segments from Jellyfin — wildcard route
  @Get('servers/:serverId/items/:externalId/hls/*')
  @Head('servers/:serverId/items/:externalId/hls/*')
  async proxyHlsSegment(
    @Param('serverId') serverId: string,
    @Param('externalId') externalId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (req.method === 'HEAD') {
      res.status(200).set({
        ...corsHeaders(req.headers.origin),
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Content-Length': '0',
      }).end();
      return;
    }
        const urlPath = req.url;
        const hlsIndex = urlPath.indexOf('/hls/');
        const relPath = hlsIndex >= 0 ? urlPath.substring(hlsIndex + 5) : '';
        const qIdx = relPath.indexOf('?');
        const cleanPath = qIdx >= 0 ? relPath.slice(0, qIdx) : relPath;
        const rawQuery = qIdx >= 0 ? relPath.slice(qIdx + 1) : '';
        const isM3u8 = cleanPath.endsWith('.m3u8');
        const jellyfinQuery = rawQuery.split('&').filter(p => !p.startsWith('token=') && p.length > 0).filter(p => isM3u8 || !/^audiocodec=/i.test(p)).join('&');
        const segmentPath = jellyfinQuery ? `${cleanPath}?${jellyfinQuery}` : cleanPath;
        const token = this.extractToken(req);
    if (!token) { res.status(401).set(corsHeaders(req.headers.origin)).end(); return; }
    let sub: string;
    try { sub = (await verifyAccessToken(token)).sub; }
    catch { res.status(401).set(corsHeaders(req.headers.origin)).end(); return; }

    try {
      const result = await this.jellyfin.proxyHlsSegment(sub, serverId, externalId, segmentPath);
      const stream = result.stream;
      if (stream && cleanPath.endsWith('.m3u8')) {
        const text = await new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          stream.on('error', reject);
        });
        const basePath = `/api/v1/jellyfin/servers/${serverId}/items/${externalId}/hls`;
        const tokenParam = `token=${encodeURIComponent(token!)}`;
        // Pass 1: Rewrite non-# lines (variant playlists, segments)
        let rewritten = text.replace(
          /^(?!#)(.+\.(?:m3u8|ts|aac|mp4|vtt)\b.*)$/gm,
          (match) => {
            const sep = match.includes('?') ? '&' : '?';
            return `${basePath}/${match}${sep}${tokenParam}`;
          },
        );
        // Pass 2: Rewrite URI= in #EXT-X-MEDIA lines (audio + subtitle sub-playlists)
        rewritten = rewritten.replace(
          /(URI=")([^"]+\.m3u8[^"]*)(")/gi,
          (_match, prefix: string, uri: string, suffix: string) => {
            const sep = uri.includes('?') ? '&' : '?';
            return `${prefix}${basePath}/${uri}${sep}${tokenParam}${suffix}`;
          },
        );
        res.status(result.statusCode ?? 200).set({
          ...result.headers as any,
          ...corsHeaders(req.headers.origin),
          'Content-Type': 'application/vnd.apple.mpegurl',
        }).send(rewritten);
      } else {
        res.status(result.statusCode ?? 200).set({
          ...result.headers as any,
          ...corsHeaders(req.headers.origin),
        });
        if (stream) stream.pipe(res);
        else res.end();
      }
    } catch (err) {
      res.status(502).set(corsHeaders(req.headers.origin)).end();
    }
  }

  private extractToken(req: Request): string | null {
    const queryToken = (req.query as Record<string, string>).token;
    if (queryToken && typeof queryToken === 'string') return queryToken;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    return null;
  }
}
