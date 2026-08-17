// src/lib/dashboard-local-storage.ts
import type { ClientMode } from './client-mode';
import type { DashboardLayout, Widget, WidgetType } from './grid-utils';
import type { DashboardProfile } from './dashboard-profiles';

const PREFIX = 'lifehub:dashboard:';

export function layoutKey(mode: Exclude<ClientMode, 'browser'>): string {
  return `${PREFIX}${mode}`;
}

function isValidWidget(v: unknown): v is Widget {
  if (typeof v !== 'object' || v === null) return false;
  const w = v as Record<string, unknown>;
  return (
    typeof w.id === 'string' &&
    ['media', 'weather', 'calendar', 'savings'].includes(w.type as string) &&
    typeof w.x === 'number' && typeof w.y === 'number' &&
    typeof w.w === 'number' && typeof w.h === 'number'
  );
}

export function readLocalLayout(mode: Exclude<ClientMode, 'browser'>): DashboardLayout | null {
  try {
    const raw = window.localStorage.getItem(layoutKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { widgets?: unknown };
    if (!parsed || !Array.isArray(parsed.widgets)) return null;
    const widgets = parsed.widgets.filter(isValidWidget);
    return widgets.length > 0 ? { widgets } : null;
  } catch {
    return null;
  }
}

export function writeLocalLayout(mode: Exclude<ClientMode, 'browser'>, layout: DashboardLayout): void {
  window.localStorage.setItem(layoutKey(mode), JSON.stringify(layout));
}

export function seedLocalLayout(
  mode: Exclude<ClientMode, 'browser'>,
  profile: DashboardProfile,
): DashboardLayout {
  const layout = { widgets: profile.defaultLayout.map((w) => ({ ...w })) };
  writeLocalLayout(mode, layout);
  return layout;
}

export function clearLocalLayout(mode: Exclude<ClientMode, 'browser'>): void {
  window.localStorage.removeItem(layoutKey(mode));
}

// Phase 2.5 — Entscheidet das initiale Layout eines Geräts beim App-Start
// (Reinstall-Recovery): der lokale Cache hat Vorrang; sonst das vom Backend
// geladene Layout, sofern es Widgets enthält; sonst null (Aufrufer seedet
// Profil-Defaults).
export function pickInitialLayout(
  local: DashboardLayout | null,
  remote: DashboardLayout | null,
): DashboardLayout | null {
  if (local) return local;
  return remote && remote.widgets.length > 0 ? remote : null;
}
