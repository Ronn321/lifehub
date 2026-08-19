// Client mode bootstrap: the mobile app passes its device profile via ?client=
// on first load; the web app persists it and switches the TV CSS class.
import { create } from 'zustand';

export type ClientMode = 'browser' | 'phone' | 'tablet' | 'tv' | 'desktop';
export const CLIENT_KEY = 'lifehub:client';

// Geräte-ID (Phase 2.5): kommt vom WebView als ?device= und wird für die
// Backend-Persistenz des Geräte-Layouts (Reinstall-Recovery) genutzt.
export const DEVICE_KEY = 'lifehub:device';
const DEVICE_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

// App-weiter, reaktiver Zugriff auf den aktiven Client-Modus.
export const useClientModeStore = create<{ mode: ClientMode }>(() => ({ mode: 'browser' }));

export function setClientMode(mode: ClientMode): void {
  useClientModeStore.setState({ mode });
}

// Parse the ?client= query parameter; anything unknown falls back to 'browser'.
// Desktop: window.lifehub.isDesktop (Electron preload) → 'desktop' (LifeHub-Desktop PLAN.md §6.2)
export function resolveClientMode(search: string): ClientMode {
  if (typeof window !== 'undefined' && (window as unknown as { lifehub?: { isDesktop: boolean } }).lifehub?.isDesktop) return 'desktop'
  const mode = new URLSearchParams(search).get('client');
  return mode === 'phone' || mode === 'tablet' || mode === 'tv' ? mode : 'browser';
}

// Parse the ?device= query parameter; invalid/absent → null. Gleiche
// Validierung wie Backend (deviceIdSchema): ^[A-Za-z0-9._-]{1,128}$.
export function resolveDeviceId(search: string): string | null {
  const deviceId = new URLSearchParams(search).get('device');
  return deviceId && DEVICE_ID_RE.test(deviceId) ? deviceId : null;
}

// Gespeicherte Geräte-ID lesen (null, wenn nie gesetzt / im Browser-Pfad).
export function getStoredDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(DEVICE_KEY);
}

// Persist the resolved mode and flip the TV class when applicable.
export function applyClientMode(mode: ClientMode): void {
  if (mode === 'browser') return;
  window.localStorage.setItem(CLIENT_KEY, mode);
  if (mode === 'tv') document.documentElement.classList.add('lifehub-tv');
  if (mode === 'desktop') document.documentElement.classList.add('lifehub-desktop');
}

// One-shot bootstrap for the boot path (client-only; call inside useEffect).
// Checks the query param, persists it, then restores a stored mode. Persistiert
// zusätzlich eine gültige ?device= Geräte-ID unter DEVICE_KEY.
export function initClientMode(): ClientMode {
  // Electron Desktop: Preload setzt window.lifehub.isDesktop → sofort desktop
  if (typeof window !== 'undefined' && (window as unknown as { lifehub?: { isDesktop: boolean } }).lifehub?.isDesktop) {
    document.documentElement.classList.add('lifehub-desktop');
    setClientMode('desktop');
    return 'desktop';
  }
  const fromQuery = resolveClientMode(window.location.search);
  if (fromQuery !== 'browser') applyClientMode(fromQuery);
  const stored = window.localStorage.getItem(CLIENT_KEY) as ClientMode | null;
  if (stored === 'tv') document.documentElement.classList.add('lifehub-tv');
  if (stored === 'desktop') document.documentElement.classList.add('lifehub-desktop');
  const resolved = fromQuery !== 'browser' ? fromQuery : stored === null ? 'browser' : stored;
  setClientMode(resolved);
  const deviceFromQuery = resolveDeviceId(window.location.search);
  if (deviceFromQuery) window.localStorage.setItem(DEVICE_KEY, deviceFromQuery);
  return resolved;
}
