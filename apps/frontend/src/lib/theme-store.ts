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

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim();
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) return null;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB mix of a base triple toward another triple (`amount` 0–1 weight of `toward`). */
function mixTriplet(
  base: [number, number, number],
  toward: [number, number, number],
  amount: number,
): string {
  const m = (b: number, t: number) => Math.round(b + (t - b) * amount);
  return `${m(base[0], toward[0])} ${m(base[1], toward[1])} ${m(base[2], toward[2])}`;
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(l1: number, l2: number): number {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** UI-002 brand-fg: white vs near-black (#09090B) — whichever contrasts more with the 500 step. */
function pickBrandFg(base: [number, number, number]): string {
  const l = relLuminance(base);
  const white = contrastRatio(l, 1);
  const nearBlack = contrastRatio(l, relLuminance([9, 9, 11]));
  return white > nearBlack ? '255 255 255' : '9 9 11';
}

const BRAND_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

const MIX_WHITE: [number, number, number] = [255, 255, 255];
const MIX_BLACK: [number, number, number] = [0, 0, 0];

/**
 * UI-005: derive the full custom 50–900 scale from the base hex.
 * Dark mode follows the dark-first direction of the preset blocks (50 darkest);
 * light mode follows the UI_UX.md light direction (50 near-white).
 */
function customScale(
  base: [number, number, number],
  isDark: boolean,
): Record<(typeof BRAND_STEPS)[number], string> {
  const steps: Array<[string, [number, number, number], number]> = isDark
    ? [
        ['50', MIX_BLACK, 0.82],
        ['100', MIX_BLACK, 0.7],
        ['200', MIX_BLACK, 0.55],
        ['300', MIX_BLACK, 0.4],
        ['400', MIX_BLACK, 0.22],
        ['500', MIX_BLACK, 0],
        ['600', MIX_WHITE, 0.15],
        ['700', MIX_WHITE, 0.3],
        ['800', MIX_WHITE, 0.45],
        ['900', MIX_WHITE, 0.6],
      ]
    : [
        ['50', MIX_WHITE, 0.9],
        ['100', MIX_WHITE, 0.8],
        ['200', MIX_WHITE, 0.65],
        ['300', MIX_WHITE, 0.45],
        ['400', MIX_WHITE, 0.25],
        ['500', MIX_BLACK, 0],
        ['600', MIX_BLACK, 0.12],
        ['700', MIX_BLACK, 0.28],
        ['800', MIX_BLACK, 0.42],
        ['900', MIX_BLACK, 0.55],
      ];
  const out = {} as Record<(typeof BRAND_STEPS)[number], string>;
  for (const [step, toward, amount] of steps) {
    out[step as (typeof BRAND_STEPS)[number]] =
      amount === 0 ? `${base[0]} ${base[1]} ${base[2]}` : mixTriplet(base, toward, amount);
  }
  return out;
}

/** 500-step hex per preset × mode — keeps --lh-accent working for all presets. */
function presetLhAccent(accent: Exclude<Accent, 'custom'>, isDark: boolean): string {
  if (accent === 'amber') return isDark ? '#D97706' : '#DD6B20';
  if (accent === 'blue') return '#3B82F6';
  if (accent === 'green') return '#22C55E';
  if (accent === 'rose') return '#F43F5E';
  return '#8B5CF6'; // violet
}

function clearBrandOverrides(root: HTMLElement) {
  for (const s of BRAND_STEPS) root.style.removeProperty(`--brand-${s}`);
  root.style.removeProperty('--brand-fg');
}

function normalizeHex(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const to2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to2(rgb[0])}${to2(rgb[1])}${to2(rgb[2])}`.toUpperCase();
}

function applyAccent(accent: Accent, customHex: string | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  // Always clear inline overrides first (custom sets them, presets must not keep them)
  clearBrandOverrides(root);
  if (accent === 'custom') {
    const base = customHex ? hexToRgb(customHex) : null;
    if (!base) {
      // Missing/invalid hex: fall back to the base amber scale, no stale overrides.
      root.removeAttribute('data-accent');
      root.style.removeProperty('--lh-accent');
      return;
    }
    root.setAttribute('data-accent', 'custom');
    const scale = customScale(base, isDark);
    for (const s of BRAND_STEPS) root.style.setProperty(`--brand-${s}`, scale[s]);
    root.style.setProperty('--brand-fg', pickBrandFg(base));
    const normalized = customHex ? normalizeHex(customHex) : null;
    if (normalized) root.style.setProperty('--lh-accent', normalized);
  } else if (accent === 'amber') {
    root.removeAttribute('data-accent');
    root.style.setProperty('--lh-accent', presetLhAccent('amber', isDark));
  } else {
    root.setAttribute('data-accent', accent);
    root.style.setProperty('--lh-accent', presetLhAccent(accent, isDark));
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
