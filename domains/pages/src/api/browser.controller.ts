import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, JwtGuard, type JwtPayload } from '@lifehub/auth';
import { PermissionGuard, RequirePermission } from '@lifehub/permissions';
import { PagesService } from '../services/pages.service';
import { BrowserRendererService } from '../services/browser-renderer.service';
import { getAllowedInternalBrowserHosts, validateBrowserUrl } from '../services/browser-url-policy';

const CHROME_URL = process.env.BROWSER_RENDERER_URL ?? 'http://chrome:3000';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('browser')
export class BrowserController {
  constructor(
    private readonly pages: PagesService,
    private readonly renderer: BrowserRendererService,
  ) {}

  @Post('sessions/:sessionId/stream')
  @RequirePermission('pages', 'read')
  async createStream(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const session = await this.pages.getBrowserSessionForOwner(user.sub, sessionId);
    const tabs = await this.pages.getBrowserTabsForSession(user.sub, session.id);
    await this.renderer.startSession(session.id, session.startUrl, tabs.map((tab) => ({ url: tab.url, title: tab.title ?? undefined })));
    return {
      sessionId: session.id,
      streamPath: `/session/${session.id}/webrtc`,
      ...this.renderer.createStreamToken(session.id),
    };
  }

  @Get('sessions/:sessionId/downloads')
  @RequirePermission('pages', 'read')
  async listDownloads(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    const session = await this.pages.getBrowserSessionForOwner(user.sub, sessionId);
    return this.renderer.listDownloads(session.id);
  }

  @Get('sessions/:sessionId/downloads/:filename')
  @RequirePermission('pages', 'read')
  async getDownload(
    @Param('sessionId') sessionId: string,
    @Param('filename') filename: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const session = await this.pages.getBrowserSessionForOwner(user.sub, sessionId);
    const download = await this.renderer.getDownload(session.id, filename);
    res.setHeader('Content-Type', download.contentType);
    res.setHeader('Content-Disposition', download.contentDisposition);
    res.send(download.body);
  }

  /** Legacy HTML proxy kept for existing saved blocks during migration. */
  @Get('proxy')
  @RequirePermission('pages', 'read')
  async proxyGet(@Query('url') url: string, @Res() res: Response) {
    const target = await validateBrowserUrl(url, getAllowedInternalBrowserHosts());
    const chromeRes = await this.renderLegacy(target.href);
    const html = await chromeRes.text();
    this.sendLegacyHtml(res, html, target);
  }

  @Post('proxy')
  @RequirePermission('pages', 'update')
  async proxyPost(@Query('url') url: string, @Body() body: Record<string, unknown>, @Res() res: Response) {
    const target = await validateBrowserUrl(url, getAllowedInternalBrowserHosts());
    const chromeRes = await this.renderLegacy(target.href, body);
    const html = await chromeRes.text();
    this.sendLegacyHtml(res, html, target);
  }

  @Get('screenshot')
  @RequirePermission('pages', 'read')
  async screenshot(@Query('url') url: string, @Res() res: Response) {
    const target = await validateBrowserUrl(url, getAllowedInternalBrowserHosts());
    const chromeRes = await fetch(`${CHROME_URL}/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LifeHub-Renderer-Key': process.env.BROWSER_RENDERER_KEY ?? '',
      },
      body: JSON.stringify({ url: target.href }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!chromeRes.ok) throw new ServiceUnavailableException('Screenshot konnte nicht erstellt werden');
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from(await chromeRes.arrayBuffer()));
  }

  private async renderLegacy(url: string, body?: Record<string, unknown>) {
    const response = await fetch(`${CHROME_URL}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LifeHub-Renderer-Key': process.env.BROWSER_RENDERER_KEY ?? '',
      },
      body: JSON.stringify({
        url,
        method: body ? 'POST' : 'GET',
        postData: body ? new URLSearchParams(body as Record<string, string>).toString() : null,
        waitTimeout: 30_000,
      }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) throw new ServiceUnavailableException('Browser-Renderer konnte die Seite nicht laden');
    return response;
  }

  private sendLegacyHtml(res: Response, html: string, target: URL) {
    const base = target.origin;
    const proxied = html
      .replace(/src="\//g, `src="${base}/`)
      .replace(/href="\//g, `href="${base}/`)
      .replace(/src='\//g, `src='${base}/`)
      .replace(/href='\//g, `href='${base}/`);

    res.setHeader('Content-Security-Policy', "default-src 'self' https: http: data: blob:; frame-ancestors 'self';");
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(proxied);
  }
}
