import { Injectable, Logger } from '@nestjs/common';

export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  fetchDurationMs: number;
}

@Injectable()
export class HtmlFetcherService {
  private readonly logger = new Logger(HtmlFetcherService.name);
  private readonly maxRetries = 3;
  private readonly timeoutMs = 15000;
  private readonly userAgent = 'LifeHub/1.0 (compatible; +https://lifehub.local)';

  async fetch(url: string): Promise<FetchResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.fetchWithRetry(url);
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`Fetch attempt ${attempt}/${this.maxRetries} failed: ${(err as Error).message}`);

        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(3, attempt - 1), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new FetchError(
      `Failed to fetch ${url} after ${this.maxRetries} attempts`,
      lastError!.message,
    );
  }

  private async fetchWithRetry(url: string): Promise<FetchResult> {
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
        },
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpError(404, `URL not found: ${url}`);
        }
        if (response.status === 429) {
          throw new HttpError(429, `Rate limited: ${url}`);
        }
        if (response.status >= 500) {
          throw new HttpError(response.status, `Server error: ${url}`);
        }
        throw new HttpError(response.status, `HTTP ${response.status}: ${url}`);
      }

      const html = await response.text();

      return {
        html,
        finalUrl: response.url,
        statusCode: response.status,
        fetchDurationMs: duration,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export class FetchError extends Error {
  constructor(
    message: string,
    readonly causeDetails: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export class HttpError extends Error {
  override readonly cause: Error;
  constructor(
    readonly httpStatus: number,
    message: string,
    cause?: Error,
  ) {
    super(message);
    this.name = 'HttpError';
    this.cause = cause ?? new Error(message);
  }
}