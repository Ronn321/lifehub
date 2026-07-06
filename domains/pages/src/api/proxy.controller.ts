import { Controller, Get, Query, BadRequestException } from '@nestjs/common';

@Controller('proxy')
export class ProxyController {
  @Get()
  async proxyWebPage(@Query('url') url: string) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('Ungültige URL');
    }
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LifeHub/1.0)',
      },
    });
    const text = await response.text();
    const base = new URL(url);
    const proxied = text
      .replace(/src="\//g, `src="${base.origin}/`)
      .replace(/href="\//g, `href="${base.origin}/`)
      .replace(/src='\//g, `src='${base.origin}/`)
      .replace(/href='\//g, `href='${base.origin}/`);
    return proxied;
  }
}
