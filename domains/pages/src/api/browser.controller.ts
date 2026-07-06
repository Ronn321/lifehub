import { Controller, Get, Query, Post, Body, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';

const CHROME_URL = 'http://chrome:3000';

@Controller('browser')
export class BrowserController {
  @Get('proxy')
  async proxyGet(@Query('url') url: string, @Res() res: Response) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('Ungültige URL');
    }

    // Use browserless Chrome to render the page (including JS)
    const chromeRes = await fetch(`${CHROME_URL}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.BROWSERLESS_TOKEN
          ? { 'Authorization': `Bearer ${process.env.BROWSERLESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        url,
        waitTimeout: 30000,
        waitFor: 'domcontentloaded',
        rejectResourceTypes: ['image', 'media', 'font', 'stylesheet'],
      }),
    });

    const html = await chromeRes.text();

    // Rewrite relative URLs
    const base = new URL(url);
    let proxied = html
      .replace(/src="\//g, `src="${base.origin}/`)
      .replace(/href="\//g, `href="${base.origin}/`)
      .replace(/src='\//g, `src='${base.origin}/`)
      .replace(/href='\//g, `href='${base.origin}/`)
      .replace(/action="\//g, `action="/api/v1/browser/proxy?url=${base.origin}/`)
      .replace(/action='\//g, `action='/api/v1/browser/proxy?url=${base.origin}/`);

    // Allow iframe embedding
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; frame-ancestors *;");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(proxied);
  }

  @Post('proxy')
  async proxyPost(@Query('url') url: string, @Body() body: any, @Res() res: Response) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('Ungültige URL');
    }

    // Use browserless to render with POST
    const chromeRes = await fetch(`${CHROME_URL}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.BROWSERLESS_TOKEN
          ? { 'Authorization': `Bearer ${process.env.BROWSERLESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        url,
        method: 'POST',
        postData: new URLSearchParams(body || {}).toString(),
        waitTimeout: 30000,
        waitFor: 'domcontentloaded',
        rejectResourceTypes: ['image', 'media', 'font', 'stylesheet'],
      }),
    });

    const html = await chromeRes.text();
    const base = new URL(url);
    let proxied = html
      .replace(/src="\//g, `src="${base.origin}/`)
      .replace(/href="\//g, `href="${base.origin}/`)
      .replace(/src='\//g, `src='${base.origin}/`)
      .replace(/href='\//g, `href='${base.origin}/`)
      .replace(/action="\//g, `action="/api/v1/browser/proxy?url=${base.origin}/`)
      .replace(/action='\//g, `action='/api/v1/browser/proxy?url=${base.origin}/`);

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; frame-ancestors *;");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(proxied);
  }

  @Get('screenshot')
  async screenshot(@Query('url') url: string, @Res() res: Response) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('Ungültige URL');
    }

    const chromeRes = await fetch(`${CHROME_URL}/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.BROWSERLESS_TOKEN
          ? { 'Authorization': `Bearer ${process.env.BROWSERLESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        url,
        waitTimeout: 30000,
        viewport: { width: 1280, height: 720 },
      }),
    });

    const buffer = Buffer.from(await chromeRes.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }
}
