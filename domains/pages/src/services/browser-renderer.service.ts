import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

interface RendererRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

export interface BrowserDownload {
  filename: string;
  size: number;
  status: 'in_progress' | 'complete' | 'too_large';
  updatedAt: string;
}

@Injectable()
export class BrowserRendererService {
  private readonly logger = new Logger(BrowserRendererService.name);
  private readonly rendererUrl = process.env.BROWSER_RENDERER_URL ?? 'http://chrome:3000';
  private readonly rendererKey = process.env.BROWSER_RENDERER_KEY ?? '';

  private async request<T>(path: string, options: RendererRequestOptions = {}): Promise<T> {
    if (!this.rendererKey) {
      throw new ServiceUnavailableException('Browser-Renderer ist nicht konfiguriert');
    }

    try {
      const response = await fetch(`${this.rendererUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-LifeHub-Renderer-Key': this.rendererKey,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        this.logger.warn(`Browser renderer returned ${response.status} for ${path}`);
        throw new ServiceUnavailableException('Browser-Renderer konnte die Anfrage nicht verarbeiten');
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`Browser renderer unavailable for ${path}`);
      throw new ServiceUnavailableException('Browser-Renderer ist nicht erreichbar');
    }
  }

  async startSession(sessionId: string, startUrl?: string, tabs: Array<{ url?: string; title?: string }> = []) {
    return this.request<{ sessionId: string; status: string; tabs: unknown[] }>(
      `/sessions/${sessionId}/start`,
      { method: 'POST', body: { startUrl: startUrl || undefined, tabs } },
    );
  }

  async listDownloads(sessionId: string) {
    return this.request<BrowserDownload[]>(`/sessions/${sessionId}/downloads`);
  }

  async getDownload(sessionId: string, filename: string) {
    if (!this.rendererKey) throw new ServiceUnavailableException('Browser-Renderer ist nicht konfiguriert');
    try {
      const response = await fetch(`${this.rendererUrl}/sessions/${encodeURIComponent(sessionId)}/downloads/${encodeURIComponent(filename)}`, {
        headers: { 'X-LifeHub-Renderer-Key': this.rendererKey },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new ServiceUnavailableException('Download konnte nicht geladen werden');
      return {
        body: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') ?? 'application/octet-stream',
        contentDisposition: response.headers.get('content-disposition') ?? `attachment; filename="${filename.replace(/["\r\n]/g, '')}"`,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Download konnte nicht geladen werden');
    }
  }

  createStreamToken(sessionId: string, ttlSeconds = 86_400) {
    if (!this.rendererKey) {
      throw new ServiceUnavailableException('Browser-Renderer ist nicht konfiguriert');
    }
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${sessionId}.${expiresAt}`;
    const signature = createHmac('sha256', this.rendererKey).update(payload).digest('hex');
    return { token: `${expiresAt}.${signature}`, expiresAt };
  }

  static verifyStreamToken(sessionId: string, token: string, key: string, now = Math.floor(Date.now() / 1000)) {
    const [expires, signature] = token.split('.', 2);
    const expiresAt = Number(expires);
    if (!expiresAt || !signature || expiresAt <= now || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = createHmac('sha256', key).update(`${sessionId}.${expiresAt}`).digest('hex');
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }
}
