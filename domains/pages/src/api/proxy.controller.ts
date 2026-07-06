import { Controller, Get, Post, Query, Body, BadRequestException, Res, Headers } from '@nestjs/common';
import type { Response } from 'express';

@Controller('proxy')
export class ProxyController {
  @Get()
  async proxyGet(@Query('url') url: string, @Res() res: Response) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('Ungültige URL');
    }
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LifeHub/1.0)' },
    });
    const text = await response.text();
    await this.sendProxied(res, text, url);
  }

  @Post()
  async proxyPost(@Query('url') url: string, @Body() body: any, @Res() res: Response) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('Ungültige URL');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LifeHub/1.0)',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body || {}).toString(),
    });
    const text = await response.text();
    await this.sendProxied(res, text, url);
  }

  private async sendProxied(res: Response, text: string, originalUrl: string) {
    const base = new URL(originalUrl);
    const escapedOrigin = base.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Rewrite relative URLs + form actions to go through the proxy
    let proxied = text
      .replace(/src="\//g, `src="${base.origin}/`)
      .replace(/href="\//g, `href="${base.origin}/`)
      .replace(/src='\//g, `src='${base.origin}/`)
      .replace(/href='\//g, `href='${base.origin}/`)
      .replace(/action="\//g, `action="/api/v1/proxy?url=${base.origin}/`)
      .replace(/action='\//g, `action='/api/v1/proxy?url=${base.origin}/`);

    // Also rewrite absolute form actions pointing to the same host
    const re = new RegExp(`action=["']${escapedOrigin}(/[^"']*)["']`, 'g');
    proxied = proxied.replace(re, (match, path) =>
      `action="/api/v1/proxy?url=${base.origin}${encodeURIComponent(path)}"`);

    // Override helmet headers to allow iframe embedding
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data:; frame-ancestors *;");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(proxied);
  }
}
