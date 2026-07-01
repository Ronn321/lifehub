import { Controller, Get, Headers, Inject, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken } from '@lifehub/auth';
import { MediaService } from '../services/media.service';
import type { Request, Response } from 'express';
import * as fs from 'fs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:3001',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

/**
 * Unguarded controller for media streaming.
 * Auth via ?token= query param (since `<video>`/`<img>` tags can't set Authorization header).
 * Supports HTTP Range requests required by `<video>` elements.
 * Manual CORS headers because `@Res()` bypasses NestJS pipeline.
 */
@Controller('media')
export class MediaStreamController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get('files/:id/stream')
  async streamFile(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
    @Query('token') token?: string,
  ) {
    // Auth from query token
    if (!token) throw new UnauthorizedException('Missing token parameter');
    let payload: { sub: string; email: string; roles: string[] };
    try {
      payload = await verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { filePath, mimeType, filename, fileSize } = await this.media.getFileStreamInfo(payload.sub, id);

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        ...CORS_HEADERS,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Content-Disposition': 'inline; filename="' + filename + '"',
      });
      stream.pipe(res);
    } else {
      const stream = fs.createReadStream(filePath);
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type': mimeType,
        'Content-Disposition': 'inline; filename="' + filename + '"',
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize,
      });
      stream.pipe(res);
    }
  }
}
