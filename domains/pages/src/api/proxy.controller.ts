import { Controller, Get, Post, Query, Body, BadRequestException, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtGuard } from '@lifehub/auth';
import { PermissionGuard, RequirePermission } from '@lifehub/permissions';
import { getAllowedInternalBrowserHosts, validateBrowserUrl } from '../services/browser-url-policy';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('proxy')
export class ProxyController {
  @Get()
  @RequirePermission('pages', 'read')
  async proxyGet(@Query('url') url: string, @Res() res: Response) {
    const target = await validateBrowserUrl(url, getAllowedInternalBrowserHosts());
    const response = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LifeHub/1.0)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new BadRequestException('Zielseite konnte nicht geladen werden');
    const text = await response.text();
    this.sendProxied(res, text, target);
  }

  @Post()
  @RequirePermission('pages', 'update')
  async proxyPost(@Query('url') url: string, @Body() body: Record<string, unknown>, @Res() res: Response) {
    const target = await validateBrowserUrl(url, getAllowedInternalBrowserHosts());
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LifeHub/1.0)',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body as Record<string, string>).toString(),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new BadRequestException('Zielseite konnte nicht geladen werden');
    const text = await response.text();
    this.sendProxied(res, text, target);
  }

  private sendProxied(res: Response, text: string, originalUrl: URL) {
    const base = originalUrl.origin;
    const proxied = text
      .replace(/src="\//g, `src="${base}/`)
      .replace(/href="\//g, `href="${base}/`)
      .replace(/src='\//g, `src='${base}/`)
      .replace(/href='\//g, `href='${base}/`);

    res.setHeader('Content-Security-Policy', "default-src 'self' https: http: data:; frame-ancestors 'self';");
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(proxied);
  }
}
