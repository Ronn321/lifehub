// src/lib/dashboard-profiles.ts
import type { ClientMode } from './client-mode';
import type { Widget, WidgetType } from './grid-utils';
import { DEFAULT_SIZES, normalizeLayout } from './grid-utils';

export interface WidgetSize { w: number; h: number }

export interface DashboardProfile {
  mode: Exclude<ClientMode, 'browser'>;
  columns: number;
  minSizes: Record<WidgetType, WidgetSize>;
  defaultLayout: Widget[];
}

function make(id: string, type: WidgetType, x: number, y: number, w: number, h: number): Widget {
  return { id, type, x, y, w, h };
}

export const PROFILES: Record<Exclude<ClientMode, 'browser'>, DashboardProfile> = {
  phone: {
    mode: 'phone',
    columns: 2,
    minSizes: {
      media: { w: 2, h: 2 },
      weather: { w: 2, h: 1 },
      calendar: { w: 2, h: 2 },
      savings: { w: 2, h: 1 },
    },
    defaultLayout: [
      make('d-weather', 'weather', 0, 0, 2, 1),
      make('d-calendar', 'calendar', 0, 1, 2, 2),
      make('d-media', 'media', 0, 3, 2, 2),
    ],
  },
  tablet: {
    mode: 'tablet',
    columns: 4,
    minSizes: {
      media: { w: 4, h: 2 },
      weather: { w: 2, h: 2 },
      calendar: { w: 2, h: 2 },
      savings: { w: 2, h: 2 },
    },
    defaultLayout: [
      make('d-media', 'media', 0, 0, 4, 2),
      make('d-weather', 'weather', 0, 2, 2, 2),
      make('d-calendar', 'calendar', 2, 2, 2, 2),
    ],
  },
  tv: {
    mode: 'tv',
    columns: 4,
    minSizes: {
      media: { w: 4, h: 2 },
      weather: { w: 2, h: 2 },
      calendar: { w: 2, h: 2 },
      savings: { w: 2, h: 1 },
    },
    defaultLayout: [
      make('d-media', 'media', 0, 0, 4, 2),
      make('d-weather', 'weather', 0, 2, 2, 2),
      make('d-calendar', 'calendar', 2, 2, 2, 2),
    ],
  },
  desktop: {
    mode: 'desktop',
    columns: 4,
    minSizes: {
      media: { w: 4, h: 2 },
      weather: { w: 2, h: 2 },
      calendar: { w: 2, h: 2 },
      savings: { w: 2, h: 2 },
    },
    defaultLayout: [
      make('d-media', 'media', 0, 0, 4, 2),
      make('d-weather', 'weather', 0, 2, 2, 2),
      make('d-calendar', 'calendar', 2, 2, 2, 2),
    ],
  },
};

export function getProfile(mode: ClientMode): DashboardProfile | null {
  return mode === 'browser' ? null : PROFILES[mode];
}

// Klemmt ein Widget auf die Profil-Regeln: Mindestgröße, Spaltenmaximum, x im Raster.
export function clampWidgetToProfile(widget: Widget, profile: DashboardProfile): Widget {
  const min = profile.minSizes[widget.type] ?? { w: 1, h: 1 };
  const w = Math.min(Math.max(widget.w, min.w), profile.columns);
  const h = Math.max(widget.h, min.h);
  const x = Math.max(0, Math.min(widget.x, profile.columns - w));
  return { ...widget, w, h, x };
}

// Klemmt alle Widgets und kompaktiert kollisionsfrei in die Profil-Spalten.
export function normalizeForProfile(widgets: Widget[], profile: DashboardProfile): Widget[] {
  return normalizeLayout(widgets.map((w) => clampWidgetToProfile(w, profile)), profile.columns);
}

// Standardgröße beim Hinzufügen: Profil-Mindestgröße bzw. Desktop-DEFAULT_SIZES.
export function defaultWidgetSizeForProfile(
  profile: DashboardProfile | null,
  type: WidgetType,
): WidgetSize {
  return profile ? { ...profile.minSizes[type] } : { ...DEFAULT_SIZES[type] };
}
