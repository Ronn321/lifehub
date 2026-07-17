import { Injectable } from '@nestjs/common';
import { URL } from 'url';

export type SourceType = 'chefkoch' | 'generic_html' | 'morphcook';

export interface UrlDetectionResult {
  sourceType: SourceType;
  validatedUrl: string;
  originalUrl: string;
}

@Injectable()
export class UrlDetectorService {
  private readonly sourcePatterns: Array<{
    type: SourceType;
    patterns: RegExp[];
  }> = [
    {
      type: 'chefkoch',
      patterns: [
        /chefkoch\.de\/rezepte\//i,
        /m\.chefkoch\.de\/rezepte\//i,
      ],
    },
    {
      type: 'morphcook',
      patterns: [
        /morphcook\./i,
      ],
    },
  ];

  detect(url: string): UrlDetectionResult {
    // Validate URL format
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP(S) URLs are supported');
      }
    } catch (err) {
      throw new InvalidUrlError(`Invalid URL: ${url}`, {
        originalUrl: url,
        cause: (err as Error).message,
      });
    }

    // Detect source type
    const host = parsed.hostname + parsed.pathname;
    for (const source of this.sourcePatterns) {
      for (const pattern of source.patterns) {
        if (pattern.test(host)) {
          return {
            sourceType: source.type,
            validatedUrl: url,
            originalUrl: url,
          };
        }
      }
    }

    // Default: generic HTML
    return {
      sourceType: 'generic_html',
      validatedUrl: url,
      originalUrl: url,
    };
  }
}

export class InvalidUrlError extends Error {
  constructor(
    message: string,
    public readonly details: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}