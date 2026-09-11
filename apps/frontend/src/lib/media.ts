import { useAuthStore } from './auth-store';
import { api, ApiError } from './api';

export function getMediaStreamUrl(fileId: string): string {
  if (typeof window === 'undefined') return '';
  const token = useAuthStore.getState().accessToken ?? '';
  if (!token) return '';
  return `http://${window.location.hostname}:3007/api/v1/media/files/${fileId}/stream?token=${token}`;
}

export function getThumbnailUrl(fileId: string, size = 512): string {
  if (typeof window === 'undefined') return '';
  const token = useAuthStore.getState().accessToken ?? '';
  if (!token) return '';
  // v=2: forces fresh URLs so browsers don't serve the earlier immutable-cached
  // WebP thumbnails (served before the switch to universally-decodable JPEG).
  return `http://${window.location.hostname}:3007/api/v1/media/files/${fileId}/thumbnail?size=${size}&v=2&token=${token}`;
}

/* ------------------------------------------------------------------ */
/*  Gesperrte Medien (locked media / PIN + Lock-Token)                 */
/* ------------------------------------------------------------------ */

const LOCK_TOKEN_KEY = 'lifehub-lock-token';

/** Lock-Token (JWT, scope media:locked, ~15min TTL). In-Memory + sessionStorage. */
let lockTokenMemory: string | null = null;

export function getLockToken(): string | null {
  if (lockTokenMemory) return lockTokenMemory;
  if (typeof window === 'undefined') return null;
  try {
    lockTokenMemory = sessionStorage.getItem(LOCK_TOKEN_KEY);
  } catch {
    lockTokenMemory = null;
  }
  return lockTokenMemory;
}

export function setLockToken(token: string | null): void {
  lockTokenMemory = token;
  if (typeof window === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(LOCK_TOKEN_KEY, token);
    else sessionStorage.removeItem(LOCK_TOKEN_KEY);
  } catch {
    /* sessionStorage nicht verfügbar — In-Memory reicht */
  }
}

export function clearLockToken(): void {
  setLockToken(null);
}

export interface LockedListResponse {
  items: LockedMediaFile[];
  total: number;
}

export interface LockedMediaFile {
  id: string;
  filename: string;
  relativePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  gpsLat?: number;
  gpsLng?: number;
  takenAt?: string;
  createdAt: string;
  isFavorite: boolean;
  fileSize?: number;
  locked?: boolean;
}

/** Locked-Routen ohne Backend-Support (404/400) bzw. defektes Backend (500):
 * → Feature als „nicht verfügbar" behandeln (Eintrag verstecken, Hinweis zeigen),
 * niemals die Galerie crashen. */
export function isLockedFeatureUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 400 || err.status === 500);
}

export async function getLockStatus(): Promise<{ hasPin: boolean } | null> {
  try {
    return await api.get<{ hasPin: boolean }>('/media/locked/pin/status');
  } catch (err) {
    if (isLockedFeatureUnavailable(err)) return null;
    throw err;
  }
}

export async function setLockPin(pin: string, oldPin?: string): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>('/media/locked/pin', oldPin ? { pin, oldPin } : { pin });
}

/** PIN zurücksetzen (vergessene PIN): verifiziert das KONTO-Passwort (nicht die
 * PIN). Der Server löscht die PIN und entsperrt alle gesperrten Dateien. */
export async function resetLockPin(password: string): Promise<{ success: boolean; unlockedCount: number }> {
  return api.delete<{ success: boolean; unlockedCount: number }>('/media/locked/pin', { password });
}

/** PIN prüfen → Lock-Token erhalten (in Memory + sessionStorage abgelegt). */
export async function unlockMedia(pin: string): Promise<string> {
  const res = await api.post<{ lockToken: string }>('/media/locked/unlock', { pin });
  setLockToken(res.lockToken);
  return res.lockToken;
}

export async function lockFile(id: string): Promise<unknown> {
  return api.post(`/media/files/${id}/lock`);
}

export async function unlockFile(id: string): Promise<unknown> {
  const lockToken = getLockToken();
  const q = lockToken ? `?lockToken=${encodeURIComponent(lockToken)}` : '';
  return api.post(`/media/files/${id}/unlock${q}`);
}

export async function fetchLocked(limit = 50, offset = 0): Promise<LockedListResponse> {
  const lockToken = getLockToken();
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (lockToken) params.set('lockToken', lockToken);
  const res = await api.get<LockedListResponse | LockedMediaFile[]>(`/media/locked?${params.toString()}`);
  // Toleriert beide Formen: {items,total} (aktuelles Backend) oder reines Array.
  if (Array.isArray(res)) return { items: res, total: res.length };
  return { items: res.items ?? [], total: res.total ?? 0 };
}

function accessTokenQuery(): string {
  const token = useAuthStore.getState().accessToken ?? '';
  return token ? `token=${encodeURIComponent(token)}` : '';
}

/** Stream-URL für gesperrte Dateien (mit ?lockToken=, da <img>/<video> keine Header setzen können). */
export function getLockedStreamUrl(id: string, size?: number): string {
  if (typeof window === 'undefined') return '';
  const lockToken = getLockToken();
  const sizeQ = size ? `&size=${size}` : '';
  const lockQ = lockToken ? `&lockToken=${encodeURIComponent(lockToken)}` : '';
  return `http://${window.location.hostname}:3007/api/v1/media/files/${id}/stream?${accessTokenQuery()}${sizeQ}${lockQ}`;
}

/** Thumbnail-URL für gesperrte Dateien (mit ?lockToken=). */
export function getLockedThumbnailUrl(id: string, size = 512): string {
  if (typeof window === 'undefined') return '';
  const lockToken = getLockToken();
  const lockQ = lockToken ? `&lockToken=${encodeURIComponent(lockToken)}` : '';
  return `http://${window.location.hostname}:3007/api/v1/media/files/${id}/thumbnail?size=${size}&v=2&${accessTokenQuery()}${lockQ}`;
}
