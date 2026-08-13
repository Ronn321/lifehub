'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

export type Accent = 'amber' | 'blue' | 'green' | 'rose' | 'violet';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accent: Accent;
  setAccent: (accent: Accent) => void;
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

function applyAccent(accent: Accent) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (accent === 'amber') {
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
      setAccent: (accent) => {
        applyAccent(accent);
        set({ accent });
      },
    }),
    {
      name: 'lifehub-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyAccent(state.accent);
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
  if (stored) {
    try {
      const parsed = JSON.parse(stored).state ?? {};
      theme = (parsed.theme as Theme) ?? 'dark';
      accent = (parsed.accent as Accent) ?? 'amber';
    } catch {
      // ignore
    }
  }
  applyTheme(theme);
  applyAccent(accent);
}
