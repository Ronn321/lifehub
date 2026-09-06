import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { signLockToken, verifyLockToken } from '@lifehub/auth';
import { MediaRepository } from '../repositories/media.repository';

const scryptAsync = promisify(scryptCb);

/**
 * Gesperrte Medien: PIN-Verwaltung (scrypt-Hash, salt + timingSafeEqual)
 * und Lock-Token-Prüfung (kurzlebiger JWT, scope 'media:locked').
 */
@Injectable()
export class MediaLockService {
  constructor(@Inject(MediaRepository) private readonly repo: MediaRepository) {}

  /** PIN-Hash erzeugen. Format: scrypt$<saltHex>$<keyHex> */
  private async hashPin(pin: string): Promise<string> {
    const salt = randomBytes(16);
    const key = (await scryptAsync(pin, salt, 64)) as Buffer;
    return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
  }

  /** PIN gegen gespeicherten Hash prüfen (konstante Zeit). */
  private async verifyPin(pin: string, stored: string): Promise<boolean> {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, saltHex, keyHex] = parts;
    if (!saltHex || !keyHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    const actual = (await scryptAsync(pin, salt, expected.length)) as Buffer;
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  }

  /** Hat der Owner eine PIN gesetzt? */
  async pinStatus(ownerId: string): Promise<{ hasPin: boolean }> {
    const row = await this.repo.findLockPinByOwner(ownerId);
    return { hasPin: !!row };
  }

  /**
   * PIN setzen/ändern. Existiert bereits eine PIN, ist oldPin PFLICHT
   * und muss stimmen (sonst 403).
   */
  async setPin(ownerId: string, pin: string, oldPin?: string): Promise<{ success: true }> {
    const existing = await this.repo.findLockPinByOwner(ownerId);
    if (existing) {
      if (!oldPin) {
        throw new ForbiddenException('Bestehende PIN erforderlich (oldPin)');
      }
      const ok = await this.verifyPin(oldPin, existing.pinHash);
      if (!ok) throw new ForbiddenException('Bestehende PIN ist falsch');
    }
    await this.repo.upsertLockPin(ownerId, await this.hashPin(pin));
    return { success: true };
  }

  /**
   * PIN prüfen → Lock-Token ausstellen (JWT, scope 'media:locked', TTL 15min).
   * Falsche PIN → 403. Keine PIN gesetzt → 409 mit Hinweis.
   */
  async unlock(ownerId: string, pin: string): Promise<{ lockToken: string }> {
    const existing = await this.repo.findLockPinByOwner(ownerId);
    if (!existing) {
      throw new ConflictException('Erst eine PIN festlegen');
    }
    const ok = await this.verifyPin(pin, existing.pinHash);
    if (!ok) throw new ForbiddenException('Falsche PIN');
    return { lockToken: await signLockToken(ownerId) };
  }

  /**
   * Lock-Token validieren: Signatur + Expiry + scope-Claim + sub == ownerId.
   * Gibt true zurück, wirft nichts (Controller mappen auf 403).
   */
  async isValidLockToken(ownerId: string, token: string | undefined): Promise<boolean> {
    if (!token) return false;
    try {
      const sub = await verifyLockToken(token);
      return sub === ownerId;
    } catch {
      return false;
    }
  }

  /**
   * Lock-Token aus Query (?lockToken=) oder Authorization-Header extrahieren.
   * Der normale Bearer-Access-Token gilt NICHT als Lock-Token.
   */
  extractLockToken(queryToken: string | undefined, authHeader: string | undefined): string | undefined {
    if (queryToken) return queryToken;
    // Eigener Scheme, um Verwechslung mit dem normalen Access-Token zu vermeiden:
    // Authorization: Lock <lockToken>
    if (authHeader?.startsWith('Lock ')) return authHeader.slice('Lock '.length).trim();
    return undefined;
  }

  /** Datei sperren. Erfordert gesetzte PIN, sonst 409 mit Hinweis. */
  async lockFile(ownerId: string, fileId: string) {
    const pin = await this.repo.findLockPinByOwner(ownerId);
    if (!pin) {
      throw new ConflictException('Erst eine PIN festlegen');
    }
    const file = await this.repo.findFileById(fileId, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    return this.repo.setFileLocked(fileId, ownerId, true);
  }

  /** Datei entsperren. Erfordert gültigen Lock-Token (wird im Controller geprüft). */
  async unlockFile(ownerId: string, fileId: string) {
    const file = await this.repo.findFileById(fileId, ownerId);
    if (!file) throw new NotFoundException('Media file not found');
    return this.repo.setFileLocked(fileId, ownerId, false);
  }
}
