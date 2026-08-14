'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

export type Accent = 'amber' | 'blue' | 'green' | 'rose' | 'violet' | 'custom';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accent: Accent;
  customHex: string | null;
  setAccent: (accent: Accent, hex?: string | null) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

function hexToRgbTriplet(hex: string): string | null {
  const h = hex.replace('#', '').trim();
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) return null;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function applyAccent(accent: Accent, customHex: string | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Always clear inline overrides first (custom sets them, presets must not keep them)
  root.style.removeProperty('--brand-400');
  root.style.removeProperty('--brand-500');
  root.style.removeProperty('--brand-600');
  if (accent === 'custom' && customHex) {
    const rgb = hexToRgbTriplet(customHex);
    if (rgb) {
      root.removeAttribute('data-accent');
      root.style.setProperty('--brand-500', rgb);
      root.style.setProperty('--brand-400', rgb);
      root.style.setProperty('--brand-600', rgb);
    }
  } else if (accent === 'amber') {
    root.removeAttribute('data-accent');
  } else {
    root.setAttribute('data-accent', accent);
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      accent: 'amber',
      customHex: null,
      setAccent: (accent, customHex = null) => {
        applyAccent(accent, customHex);
        set({ accent, customHex });
      },
    }),
    {
      name: 'lifehub-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyAccent(state.accent, state.customHex);
        }
      },
    },
  ),
);

export function initTheme() {
  if (typeof document === 'undefined') return;
  const stored = localStorage.getItem('lifehub-theme');
  let theme: Theme = 'dark';
  let accent: Accent = 'amber';
  let customHex: string | null = null;
  if (stored) {
    try {
      const parsed = JSON.parse(stored).state ?? {};
      theme = (parsed.theme as Theme) ?? 'dark';
      accent = (parsed.accent as Accent) ?? 'amber';
      customHex = (parsed.customHex as string | null) ?? null;
    } catch {
      // ignore
    }
  }
  applyTheme(theme);
  applyAccent(accent, customHex);
}
