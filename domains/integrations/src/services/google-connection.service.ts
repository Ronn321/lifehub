import { Inject, Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { gmail_v1 } from 'googleapis';
import { randomBytes } from 'node:crypto';
import { GoogleConnectionRepository } from '../repositories/google-connection.repository';
import { encryptToken, decryptToken } from '../lib/token-crypto';
import type { GoogleConnectionStatus } from '../entities/integration';

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
];

const DEV_KEY_FALLBACK = 'dev-key-do-not-use-prod';

/**
 * PUBLIC INTERFACE for other domains (DOX domains/AGENTS.md §3.4).
 * Calendar and email domains import this service to obtain authenticated
 * Google API clients (Gmail / Calendar) for a given LifeHub owner.
 */
@Injectable()
export class GoogleConnectionService {
  private readonly logger = new Logger(GoogleConnectionService.name);

  constructor(
    @Inject(GoogleConnectionRepository) private readonly connRepo: GoogleConnectionRepository,
    private readonly config: ConfigService,
  ) {}

  private get secret(): string {
    return this.config.get<string>('GOOGLE_TOKEN_ENCRYPTION_KEY') ?? DEV_KEY_FALLBACK;
  }

  private get clientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID') ?? '';
  }

  private get clientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
  }

  private get redirectUri(): string {
    return this.config.get<string>('GOOGLE_REDIRECT_URI') ?? '';
  }

  private clientFor(redirectUri?: string): OAuth2Client {
    return new OAuth2Client(this.clientId, this.clientSecret, redirectUri ?? this.redirectUri);
  }

  async getStatus(ownerId: string): Promise<GoogleConnectionStatus> {
    const conn = await this.connRepo.findByOwner(ownerId);
    if (!conn) {
      return { connected: false, email: null, grantedScopes: [], lastSyncAt: null };
    }
    return {
      connected: true,
      email: conn.googleEmail,
      grantedScopes: conn.grantedScopes ?? [],
      lastSyncAt: conn.lastSyncAt ? conn.lastSyncAt.toISOString() : null,
    };
  }

  async buildAuthUrl(ownerId: string): Promise<string> {
    const client = this.clientFor();
    const state = Buffer.from(JSON.stringify({ u: ownerId, r: randomBytes(8).toString('hex') })).toString('base64url');
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state,
    });
  }

  async handleCallback(code: string, state: string): Promise<{ redirect: string }> {
    let ownerId: string;
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as { u?: string };
      if (!parsed.u) throw new Error('missing owner id in state');
      ownerId = parsed.u;
    } catch {
      throw new BadRequestException('Ungültiger OAuth-State.');
    }

    const client = this.clientFor();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Verbindung erneut herstellen — Zugriff in Google-Kontoeinstellungen entfernen und neu verbinden.',
      );
    }

    const email = await this.fetchEmail(tokens.access_token, tokens.id_token);
    await this.connRepo.upsert(ownerId, {
      googleEmail: email,
      accessTokenEnc: encryptToken(tokens.access_token!, this.secret),
      refreshTokenEnc: encryptToken(tokens.refresh_token, this.secret),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      grantedScopes: GOOGLE_SCOPES,
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    return { redirect: `${frontendUrl}/settings?google=connected` };
  }

  async disconnect(ownerId: string): Promise<void> {
    await this.connRepo.disconnect(ownerId);
  }

  /**
   * PUBLIC for other domains: returns an OAuth2Client with valid access token
   * (auto-refreshes and persists new access tokens encrypted).
   */
  async getGoogleClient(ownerId: string): Promise<OAuth2Client> {
    const conn = await this.connRepo.findByOwner(ownerId);
    if (!conn) {
      throw new UnauthorizedException('Keine Google-Verbindung.');
    }
    const client = this.clientFor();
    client.setCredentials({
      access_token: decryptToken(conn.accessTokenEnc, this.secret),
      refresh_token: decryptToken(conn.refreshTokenEnc, this.secret),
    });
    client.on('tokens', (tokens: { access_token?: string | null; expiry_date?: number | null }) => {
      if (tokens.access_token) {
        void this.connRepo.upsert(ownerId, {
          googleEmail: conn.googleEmail,
          accessTokenEnc: encryptToken(tokens.access_token, this.secret),
          refreshTokenEnc: conn.refreshTokenEnc,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          grantedScopes: conn.grantedScopes ?? GOOGLE_SCOPES,
        });
      }
    });
    return client;
  }

  /**
   * PUBLIC for other domains: returns a ready Gmail client for the owner.
   */
  async getGmail(ownerId: string): Promise<gmail_v1.Gmail> {
    const client = await this.getGoogleClient(ownerId);
    // googleapis v144 typisiert Gmail als "v1"; v3 läuft runtime korrekt.
    return google.gmail({ version: 'v3' as 'v1', auth: client });
  }

  private async fetchEmail(
    accessToken: string | null | undefined,
    idToken?: string | null,
  ): Promise<string> {
    if (!accessToken && !idToken) {
      throw new BadRequestException('Kein Access-Token erhalten.');
    }
    try {
      if (accessToken) {
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { email?: string };
          if (data.email) return data.email;
        }
      }
      // userinfo fehlgeschlagen/ohne email → id_token-payload decodieren (JWT-Teil 2)
      if (idToken) {
        const email = this.decodeIdTokenEmail(idToken);
        if (email) return email;
      }
      throw new Error('no email derivable');
    } catch (err) {
      this.logger.warn(`email resolution failed, rethrowing: ${(err as Error).message}`);
      throw new BadRequestException('Google-E-Mail konnte nicht ermittelt werden.');
    }
  }

  /** Decodes the payload segment of an id_token JWT and returns its `email` claim. */
  private decodeIdTokenEmail(idToken: string): string | null {
    try {
      const parts = idToken.split('.');
      const payloadB64 = parts[1];
      if (!payloadB64) return null;
      const payload = JSON.parse(
        Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
      ) as { email?: string };
      return payload.email ?? null;
    } catch {
      return null;
    }
  }
}
