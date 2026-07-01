import { NextRequest, NextResponse } from 'next/server';

interface BookmarkData {
  title: string;
  description: string;
  image: string;
  domain: string;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LifeHub/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    const html = await response.text();

    const data: BookmarkData = {
      title: extractMeta(html, 'og:title') || extractTitle(html) || new URL(url).hostname,
      description: extractMeta(html, 'og:description') || extractMeta(html, 'description') || '',
      image: extractMeta(html, 'og:image') || '',
      domain: new URL(url).hostname,
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      title: new URL(url).hostname,
      description: '',
      image: '',
      domain: new URL(url).hostname,
    });
  }
}

function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property="${name}"[^>]*content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${name}"`, 'i'),
    new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] || null;
}
