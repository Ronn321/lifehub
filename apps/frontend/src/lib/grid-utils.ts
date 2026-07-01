export type WidgetType = 'media' | 'calendar' | 'weather' | 'savings';

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: WidgetConfig;
}

export interface DashboardLayout {
  widgets: Widget[];
}

export type WidgetConfig =
  | CalendarConfig
  | WeatherConfig
  | MediaConfig
  | Record<string, unknown>;

export interface CalendarConfig {
  weekStart: 'monday' | 'sunday';
  showWeekNumbers: boolean;
}

export interface WeatherLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface WeatherConfig {
  locations: WeatherLocation[];
  activeLocationIndex: number;
  expanded: boolean;
}

export interface MediaConfig {
  albumIds: string[];
  slideshowInterval: number;
}

export const ALLOWED_SIZES: [number, number][] = [
  [1, 1], [1, 2], [2, 2], [2, 3], [3, 2], [3, 3],
  [4, 1], [4, 2], [4, 3], [6, 1], [6, 2], [6, 3], [6, 4],
];

export const GRID_GAP = 16;
export const MIN_ROW_HEIGHT = 120;

export const DEFAULT_SIZES: Record<WidgetType, { w: number; h: number }> = {
  media: { w: 4, h: 2 },
  weather: { w: 3, h: 2 },
  calendar: { w: 3, h: 2 },
  savings: { w: 1, h: 1 },
};

export const WIDGET_LABELS: Record<WidgetType, string> = {
  media: 'Letzte Medien',
  weather: 'Wetter',
  calendar: 'Kalender',
  savings: 'Sparziele',
};

export type DragAction =
  | { type: 'START'; widgetId: string; startX: number; startY: number }
  | { type: 'MOVE'; currentX: number; currentY: number }
  | { type: 'END' };

export function snapToAllowedSize(w: number, h: number): { w: number; h: number } {
  let best = { w: 1, h: 1 };
  let bestDist = Infinity;
  for (const [aw, ah] of ALLOWED_SIZES) {
    const dist = Math.abs(aw - w) + Math.abs(ah - h);
    if (dist < bestDist) {
      bestDist = dist;
      best = { w: aw, h: ah };
    }
  }
  return best;
}

export function checkCollision(target: Widget, candidates: Widget[]): Widget[] {
  return candidates.filter(c => {
    if (c.id === target.id) return false;
    return !(
      target.x + target.w <= c.x ||
      c.x + c.w <= target.x ||
      target.y + target.h <= c.y ||
      c.y + c.h <= target.y
    );
  });
}

export function findFreePosition(
  widgets: Widget[],
  w: number,
  h: number,
  cols: number,
): { x: number; y: number } {
  const occupied = new Set<string>();
  for (const widget of widgets) {
    for (let dx = 0; dx < widget.w; dx++) {
      for (let dy = 0; dy < widget.h; dy++) {
        occupied.add(`${widget.x + dx},${widget.y + dy}`);
      }
    }
  }
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= cols - w; x++) {
      let free = true;
      for (let dx = 0; dx < w && free; dx++) {
        for (let dy = 0; dy < h && free; dy++) {
          if (occupied.has(`${x + dx},${y + dy}`)) free = false;
        }
      }
      if (free) return { x, y };
    }
  }
  const maxY = Math.max(0, ...widgets.map(ww => ww.y + ww.h));
  return { x: 0, y: maxY };
}

export function resolveCollision(
  draggedId: string,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  allWidgets: Widget[],
  cols: number,
): Widget[] {
  const others = allWidgets.filter(w => w.id !== draggedId);
  const collisions = checkCollision(
    { id: draggedId, type: 'media' as WidgetType, x: targetX, y: targetY, w: targetW, h: targetH },
    others,
  );
  if (collisions.length === 0) {
    return normalizeLayout(
      allWidgets.map(w => (w.id === draggedId ? { ...w, x: targetX, y: targetY } : w)),
      cols,
    );
  }
  const pushed = allWidgets.map(w => {
    if (w.id === draggedId) return { ...w, x: targetX, y: targetY };
    if (collisions.some(c => c.id === w.id)) {
      return { ...w, y: targetY + targetH };
    }
    return w;
  });
  return normalizeLayout(pushed, cols);
}

export function normalizeLayout(widgets: Widget[], cols: number): Widget[] {
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  const occupied: boolean[][] = [];
  const result: Widget[] = [];

  for (const widget of sorted) {
    let placed = false;
    let tryY = 0;
    while (!placed) {
      let canPlace = true;
      for (let dy = 0; dy < widget.h && canPlace; dy++) {
        for (let dx = 0; dx < widget.w; dx++) {
          const row = tryY + dy;
          if (!occupied[row]) occupied[row] = [];
          if (widget.x + dx < cols && occupied[row][widget.x + dx]) {
            canPlace = false;
          }
        }
      }
      if (canPlace) {
        for (let dy = 0; dy < widget.h; dy++) {
          const row = tryY + dy;
          if (!occupied[row]) occupied[row] = [];
          for (let dx = 0; dx < widget.w; dx++) {
            if (widget.x + dx < cols) {
              occupied[row][widget.x + dx] = true;
            }
          }
        }
        result.push({ ...widget, y: tryY });
        placed = true;
      } else {
        tryY++;
      }
    }
  }
  return result;
}

export function getResponsiveColumns(width: number): number {
  if (width >= 1024) return 6;
  if (width >= 768) return 4;
  if (width >= 480) return 2;
  return 1;
}

export function defaultConfig(type: WidgetType): WidgetConfig {
  switch (type) {
    case 'calendar':
      return { weekStart: 'monday', showWeekNumbers: false };
    case 'weather':
      return {
        locations: [{ name: 'Frankfurt', lat: 50.11, lng: 8.68 }],
        activeLocationIndex: 0,
        expanded: false,
      };
    case 'media':
      return { albumIds: [], slideshowInterval: 5 };
    default:
      return {};
  }
}
