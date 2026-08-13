'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Hub-wide accent color personalization.
 *
 * This store is additive to the existing jellyfin `theme-store` (data-accent) system:
 * it lets the calendar/hub set a brand accent via CSS variables on <html>. The
 * `cal-*` variables optionally override just the calendar accent on top of brand-*.
 */

export const ACCENT_PRESETS = [
  { key: 'amber', label: 'Amber (Hub)', light: { 500: '221 107 32', 400: '237 137 54', 600: '192 86 33' }, dark: { 500: '217 119 6', 400: '148 101 42', 600: '245 158 11' } },
  { key: 'blue', label: 'Blau', light: { 500: '37 99 235', 400: '59 130 246', 600: '29 78 216' }, dark: { 500: '59 130 246', 400: '96 165 250', 600: '37 99 235' } },
  { key: 'green', label: 'Grün', light: { 500: '22 163 74', 400: '34 197 94', 600: '21 128 61' }, dark: { 500: '34 197 94', 400: '74 222 128', 600: '22 163 74' } },
  { key: 'rose', label: 'Rosé', light: { 500: '225 29 72', 400: '251 113 133', 600: '190 18 60' }, dark: { 500: '244 63 94', 400: '251 113 133', 600: '225 29 72' } },
  { key: 'violet', label: 'Violett', light: { 500: '124 58 237', 400: '139 92 246', 600: '109 40 217' }, dark: { 500: '139 92 246', 400: '167 139 250', 600: '124 58 237' } },
] as const;

export type AccentKey = typeof ACCENT_PRESETS[number]['key'];
export type AccentChoice = AccentKey | 'custom';

interface AccentState {
  accent: AccentChoice;
  customHex: string | null;
  setAccent: (a: AccentChoice, hex?: string | null) => void;
}

export const useAccentStore = create<AccentState>()(
  persist(
    (set) => ({
      accent: 'amber',
      customHex: null,
      setAccent: (accent, customHex = null) => set({ accent, customHex }),
    }),
    { name: 'lifehub-accent' },
  ),
);

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * Applies the current accent to the `--brand-400/500/600` CSS variables on <html>.
 * Custom colors set all three steps to the same value; presets pick light/dark
 * triplets based on the current `.dark` class. Non-accent steps (50-300, 700-900)
 * keep their CSS palette defaults.
 */
export function applyAccent(accent: AccentChoice, customHex: string | null) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  if (accent === 'custom' && customHex) {
    const rgb = hexToRgbTriplet(customHex);
    root.style.setProperty('--brand-500', rgb);
    root.style.setProperty('--brand-400', rgb); // simplified custom scale
    root.style.setProperty('--brand-600', rgb);
  } else {
    const p = ACCENT_PRESETS.find((x) => x.key === accent) ?? ACCENT_PRESETS[0];
    const s = isDark ? p.dark : p.light;
    root.style.setProperty('--brand-500', s[500]);
    root.style.setProperty('--brand-400', s[400]);
    root.style.setProperty('--brand-600', s[600]);
  }
}

/**
 * Layout hook: keeps the accent CSS variables in sync with the store and with
 * theme changes. Watches the `.dark` class on <html> via a MutationObserver so a
 * light/dark switch re-applies the correct palette without a full page reload.
 */
export function useAccentSync() {
  const accent = useAccentStore((s) => s.accent);
  const customHex = useAccentStore((s) => s.customHex);

  useEffect(() => {
    applyAccent(accent, customHex);
    const root = document.documentElement;
    const observer = new MutationObserver(() => applyAccent(accent, customHex));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [accent, customHex]);
}

/** Renders nothing; mount once in the root layout to enable accent sync. */
export function AccentSync() {
  useAccentSync();
  return null;
}
