// Client mode bootstrap: the mobile app passes its device profile via ?client=
// on first load; the web app persists it and switches the TV CSS class.
import { create } from 'zustand';

export type ClientMode = 'browser' | 'phone' | 'tablet' | 'tv';
export const CLIENT_KEY = 'lifehub:client';

// App-weiter, reaktiver Zugriff auf den aktiven Client-Modus.
export const useClientModeStore = create<{ mode: ClientMode }>(() => ({ mode: 'browser' }));

export function setClientMode(mode: ClientMode): void {
  useClientModeStore.setState({ mode });
}

// Parse the ?client= query parameter; anything unknown falls back to 'browser'.
export function resolveClientMode(search: string): ClientMode {
  const mode = new URLSearchParams(search).get('client');
  return mode === 'phone' || mode === 'tablet' || mode === 'tv' ? mode : 'browser';
}

// Persist the resolved mode and flip the TV class when applicable.
export function applyClientMode(mode: ClientMode): void {
  if (mode === 'browser') return;
  window.localStorage.setItem(CLIENT_KEY, mode);
  if (mode === 'tv') document.documentElement.classList.add('lifehub-tv');
}

// One-shot bootstrap for the boot path (client-only; call inside useEffect).
// Checks the query param, persists it, then restores a stored mode.
export function initClientMode(): ClientMode {
  const fromQuery = resolveClientMode(window.location.search);
  if (fromQuery !== 'browser') applyClientMode(fromQuery);
  const stored = window.localStorage.getItem(CLIENT_KEY) as ClientMode | null;
  if (stored === 'tv') document.documentElement.classList.add('lifehub-tv');
  const resolved = fromQuery !== 'browser' ? fromQuery : stored === null ? 'browser' : stored;
  setClientMode(resolved);
  return resolved;
}
