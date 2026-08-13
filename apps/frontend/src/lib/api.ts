// Minimal API-Client: native fetch + JSON, typed via zod
import { z } from 'zod';

const API_BASE = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3007/api/v1`
  : 'http://backend:3007/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('lifehub-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    const msg =
      body && typeof body === 'object' && 'message' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).message)
        : `HTTP ${status}`;
    super(msg);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...init,
  });
  if (res.status === 401 && token) {
    // Try refresh token
    try {
      const raw = localStorage.getItem('lifehub-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        const refreshToken = parsed?.state?.refreshToken;
        if (refreshToken) {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const authData = await refreshRes.json();
            const store = JSON.parse(localStorage.getItem('lifehub-auth') || '{}');
            store.state = { ...store.state, accessToken: authData.accessToken, refreshToken: authData.refreshToken };
            localStorage.setItem('lifehub-auth', JSON.stringify(store));
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${authData.accessToken}`;
            const retry = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers, ...init });
            if (!retry.ok) {
              let body: unknown = null;
              try { body = await retry.json(); } catch { /* ignore */ }
              throw new ApiError(retry.status, body);
            }
            if (retry.status === 204) return undefined as T;
            return (await retry.json()) as T;
          }
        }
      }
    } catch { /* refresh failed, redirect to login below */ }
    // Redirect to login on 401
    if (typeof window !== 'undefined') {
      const store = JSON.parse(localStorage.getItem('lifehub-auth') || '{}');
      store.state = { ...store.state, accessToken: null, refreshToken: null };
      localStorage.setItem('lifehub-auth', JSON.stringify(store));
      window.location.href = '/login';
    }
    throw new ApiError(401, { message: 'Session abgelaufen. Bitte neu einloggen.' });
  }
  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function downloadFile(path: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers });
  if (!response.ok) throw new ApiError(response.status, { message: 'Download konnte nicht geladen werden.' });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '';
  anchor.click();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  download: (path: string) => downloadFile(path),
  upload: <T>(path: string, formData: FormData) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        let body: unknown = null;
        try { body = await res.json(); } catch { /* ignore */ }
        throw new ApiError(res.status, body);
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    });
  },
};

// Auth-spezifische Schemas (geteilt mit Backend via OpenAPI später)
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    isActive: z.boolean(),
    locale: z.string(),
    timezone: z.string(),
    theme: z.enum(['dark', 'light', 'system']),
    brandColor: z.string(),
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  roles: z.array(z.string()),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
