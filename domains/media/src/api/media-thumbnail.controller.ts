import { Controller, Get, Inject, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken } from '@lifehub/auth';
import type { Response, Request } from 'express';
import { createReadStream } from 'fs';
import { MediaThumbnailService } from '../services/media-thumbnail.service';

/**
 * Unguarded-by-decorator controller for media thumbnail delivery.
 * Auth via `?token=` query param (like the stream endpoint) because thumbnails
 * are loaded by plain `<img>` tags, which cannot send an Authorization header.
 */
@Controller('media')
export class MediaThumbnailController {
  constructor(@Inject(MediaThumbnailService) private readonly thumbs: MediaThumbnailService) {}

  @Get('files/:id/thumbnail')
  async thumbnail(
    @Param('id') id: string,
    @Query('size') size: string | undefined,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Token-based auth (mirrors the stream endpoint)
    const authToken = token ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    if (!authToken) throw new UnauthorizedException('Missing token parameter');
    let payload: { sub: string; email: string; roles: string[] };
    try {
      payload = await verifyAccessToken(authToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Parse + clamp requested size to a sane range (64..1024), default 512.
    const s = Math.min(Math.max(parseInt(size ?? '512', 10) || 512, 64), 1024);

    const thumb = await this.thumbs.getThumbnail(payload.sub, id, s);

    // Long-lived immutable cache: thumbnails are content-addressed per file+size.
    res.setHeader('Content-Type', thumb.mimeType);
    res.setHeader('Content-Length', thumb.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    createReadStream(thumb.path).pipe(res);
  }
}
