import { Controller, Get, Headers, Inject, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken } from '@lifehub/auth';
import { MediaService } from '../services/media.service';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import sharp from 'sharp';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const corsOrigins = (process.env.CORS_ORIGINS ?? '').replace(/'/g, '');
function resolveOrigin(reqOrigin: string | undefined): string {
  if (corsOrigins === '*') return '*';
  const configured = corsOrigins.split(',')[0]?.trim();
  return configured || reqOrigin || 'http://localhost:3001';
}

const CORS_HEADERS = (req: Request) => ({
  'Access-Control-Allow-Origin': resolveOrigin(req.headers.origin),
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
  'Cross-Origin-Resource-Policy': 'cross-origin',
});

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
    @Query('size') size?: string,
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

    // ?size= — downscaled still/preview via the SAME stream endpoint that is
    // verified to paint in the browser. Images -> sharp JPEG; videos -> ffmpeg frame.
    if (size) {
      const s = Math.min(Math.max(parseInt(size, 10) || 512, 64), 2048);
      try {
        let buf: Buffer;
        if (mimeType.startsWith('video/')) {
          const { stdout } = await execFileAsync('ffmpeg', [
            '-ss', '60', '-i', filePath, '-frames:v', '1',
            '-vf', `scale=${s}:-2`, '-q:v', '5', '-f', 'image2', '-v', 'error', 'pipe:1',
          ], { maxBuffer: 16 * 1024 * 1024 });
          buf = Buffer.from(stdout);
        } else {
          buf = await sharp(filePath, { failOn: 'none' })
            .rotate()
            .resize({ width: s, height: s, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        }
        res.writeHead(200, {
          ...CORS_HEADERS(req),
          'Content-Type': 'image/jpeg',
          'Content-Length': buf.length,
          'Content-Disposition': 'inline; filename="preview.jpg"',
        });
        res.end(buf);
        return;
      } catch {
        // fall back to the full stream below
      }
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        ...CORS_HEADERS(req),
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
        ...CORS_HEADERS(req),
        'Content-Type': mimeType,
        'Content-Disposition': 'inline; filename="' + filename + '"',
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize,
      });
      stream.pipe(res);
    }
  }
}
