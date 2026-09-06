import { Controller, ForbiddenException, Get, Inject, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken, verifyLockToken } from '@lifehub/auth';
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
    @Query('lockToken') lockToken: string | undefined,
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

    // Gesperrte Dateien brauchen zusätzlich einen gültigen Lock-Token
    // (?lockToken= oder Authorization: Lock <token>) → sonst 403.
    if (await this.thumbs.isLocked(payload.sub, id)) {
      const header = req.headers.authorization;
      const candidate = lockToken ?? (header?.startsWith('Lock ') ? header.slice(5).trim() : undefined);
      let ok = false;
      if (candidate) {
        try {
          ok = (await verifyLockToken(candidate)) === payload.sub;
        } catch {
          ok = false;
        }
      }
      if (!ok) throw new ForbiddenException('Gesperrte Datei: gültiger Lock-Token erforderlich');
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
