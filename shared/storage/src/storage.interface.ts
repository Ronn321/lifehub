import { Readable } from 'node:stream';

export interface StorageService {
  /** Schreibt einen Stream unter dem relativen Key in den Domain-Namespace. Gibt den absoluten Pfad zurück. */
  put(domain: string, key: string, stream: Readable | Buffer): Promise<string>;

  /** Liest einen Pfad als Stream. */
  get(path: string): Promise<Readable>;

  /** Löscht eine Datei (idempotent). */
  delete(path: string): Promise<void>;

  /** Prüft Existenz. */
  exists(path: string): Promise<boolean>;

  /** File-Metadaten. */
  stat(path: string): Promise<{ size: number; mtime: Date }>;

  /** Generiert eine zeitlich begrenzte URL für privaten Zugriff. */
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
