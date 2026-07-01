# Dashboard Grid System — Finaler Implementierungsplan

> **Synthese aus:** `ds_v1.md` + `mimo_v1.md` + beidseitiger Kritik  
> **Datum:** 2026-06-19  
> **Stack:** Next.js 14, Tailwind CSS 3, TypeScript strict — **KEINE neuen npm-Pakete**

---

## Kern-Entscheidungen (konsolidiert)

| Entscheidung | Aus DS | Aus Mimo | Begründung der Kritik |
|-------------|--------|---------|----------------------|
| **State-Management** | ✅ Zustand-Store | — | useState verursacht 60fps Re-Render-Storm |
| **CSS Responsive** | ✅ `@container` Queries | — | CSS-only, kein JS ResizeObserver nötig |
| **Algorithmen** | — | ✅ `normalizeLayout()` | Schließt Lücken — DS fehlt das |
| **WidgetConfig-Typen** | — | ✅ `CalendarConfig` etc. | Statt `Record<string, unknown>` |
| **DragAction Pattern** | — | ✅ Discriminated Union | `START`/`MOVE`/`END` — typsicher |
| **Snapping** | ✅ `snapToAllowedSize()` | — | Mimo definiert Liste, nutzt sie nicht |
| **Touch-Integration** | ✅ Ein Hook für beides | — | Mimo hat parallele Touch-Hooks |
| **Implementierungs-Reihenfolge** | — | ✅ Bottom-up von pure functions | Besserer Abhängigkeitsgraph |
| **Debounce** | — | ✅ Custom 3-Zeiler | Kein `throttle-debounce` aus DevTools |

## Bugfixes (vor Implementierung zu beachten)

| Bug | Quelle | Fix |
|-----|--------|-----|
| Duplicate `queryKey` in useQuery | Mimo §7.1 | Zweite Zeile löschen |
| `touchmove` → `handleEnd` | DS §5.2 | Korrigieren zu `handleMove` |
| `canResizeTo()` dead code | Mimo §4.4 | Entweder verwenden oder löschen — **löschen** |
| `ALLOWED_WIDGET_SIZES` nicht durchgesetzt | Mimo §4.2 | `snapToAllowedSize()` in Resize-Flow integrieren |
| `throttle-debounce` als Abhängigkeit | DS §8.3 | Custom 3-Zeilen-Debounce nutzen |

---

## Datei-Struktur (12 neue/geänderte Dateien)

```
apps/frontend/src/
├── app/(dashboard)/dashboard/
│   └── page.tsx                         ← Refactor: Orchestrator (≈80 Zeilen)
├── components/dashboard/
│   ├── dashboard-grid.tsx               ← Grid-Container
│   ├── dashboard-widget.tsx             ← Widget-Wrapper
│   ├── widget-header.tsx                ← Drag-Handle + Titel + Actions
│   ├── widget-resize-handle.tsx         ← Resize-Ziehgriff
│   ├── widget-add-button.tsx            ← "Widget hinzufügen" Dropdown
│   └── drop-indicator.tsx               ← Drag Ghost + Leer-Indikator
├── hooks/
│   ├── use-dashboard-layout.ts          ← TanStack Query Wrapper + Mutations
│   └── use-grid-interaction.ts          ← DnD + Resize + Touch (ein Hook)
├── lib/
│   └── grid-utils.ts                    ← Pure Functions: Kollision, Snapping, Normalize
├── stores/
│   └── grid-store.ts                    ← Zustand: DragState + ResizeState
└── app/globals.css                      ← Add: .dashboard-grid, @container Queries, Animationen
```

---

## Typen (`grid-utils.ts` — Pure Functions, keine React-Importe)

```typescript
// Widget-Typen
export type WidgetType = 'media' | 'calendar' | 'weather' | 'savings';

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;  // 0-basierte Spalte
  y: number;  // 0-basierte Zeile
  w: number;  // Spaltenbreite
  h: number;  // Zeilenhöhe
  config?: WidgetConfig;
}

// Typsichere Widget-Konfigurationen
export type WidgetConfig = CalendarConfig | WeatherConfig | MediaConfig | Record<string, unknown>;

export interface CalendarConfig {
  weekStart: 'monday' | 'sunday';
  showWeekNumbers: boolean;
}

export interface WeatherConfig {
  locations: WeatherLocation[];
  activeLocationIndex: number;
  expanded: boolean;
}

export interface WeatherLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface MediaConfig {
  albumIds: string[];
  slideshowInterval: number;
}

// Grid-Konstanten
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
  media: 'Letzte Medien', weather: 'Wetter', calendar: 'Kalender', savings: 'Sparziele',
};

// Discriminated Union (von Mimo, optimiert)
export type DragAction =
  | { type: 'START'; widgetId: string; startX: number; startY: number }
  | { type: 'MOVE'; currentX: number; currentY: number }
  | { type: 'END' };

// Snapping
export function snapToAllowedSize(w: number, h: number): { w: number; h: number } { /* Manhattan-Distanz */ }

// Kollision
export function checkCollision(target: Widget, candidates: Widget[]): Widget[];
export function findFreePosition(widgets: Widget[], w: number, h: number, cols: number): { x: number; y: number };
export function normalizeLayout(widgets: Widget[], cols: number): Widget[];  // Lücken schließen
export function getResponsiveColumns(width: number): number;  // 1/2/4/6
```

---

## Zustand-Store (`grid-store.ts`)

```typescript
interface GridStore {
  dragActiveId: string | null;
  dragOverId: string | null;
  dragOffset: { x: number; y: number };
  resizeActiveId: string | null;
  resizeCurrent: { w: number; h: number };
  columns: number;  // Responsive, via ResizeObserver aktualisiert

  setDragActive: (id: string | null, offset?: { x: number; y: number }) => void;
  setDragOver: (id: string | null) => void;
  setResizeActive: (id: string | null, size?: { w: number; h: number }) => void;
  setColumns: (n: number) => void;
  clearAll: () => void;
}
```

---

## CSS-Erweiterungen (`globals.css`)

```css
@layer components {
  .dashboard-grid {
    display: grid;
    gap: 16px;
    container-type: inline-size;
    container-name: dashboard-grid;
  }

  /* Container Queries — reagieren auf Sidebar-Zustand */
  @container dashboard-grid (min-width: 480px) {
    .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @container dashboard-grid (min-width: 768px) {
    .dashboard-grid { grid-template-columns: repeat(4, 1fr); }
  }
  @container dashboard-grid (min-width: 1024px) {
    .dashboard-grid { grid-template-columns: repeat(6, 1fr); }
  }

  /* Default: 1 Spalte */
  .dashboard-grid { grid-template-columns: repeat(1, 1fr); }

  /* Widget-Enter Animation */
  @keyframes widget-enter {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .widget-enter { animation: widget-enter 200ms ease-out; }
}
```

---

## Komponenten-Kontrakte

### `dashboard-grid.tsx`
```
Props: { widgets: Widget[]; onLayoutChange: (w: Widget[]) => void; isSaving: boolean }
Rendert: grid-Container + GridWidget[] + DropIndicator
Integriert: useGridInteraction() Hook (DnD + Resize + Touch)
```

### `dashboard-widget.tsx`
```
Props: { widget: Widget; isDragging: boolean; isResizing: boolean; cellHeight: number;
        onDragStart: (id) => void; onResizeStart: (id, e) => void;
        onSettings: (id) => void; onDelete: (id) => void; onConfigChange: (id, config) => void }
Rendert: Widget-Karte (Header + Content + ResizeHandle)
Hover-Actions: opacity-0 group-hover:opacity-100
```

### `widget-header.tsx`
```
Rendert: GripVertical (Drag-Handle) + Icon + Titel + Settings-Button + Delete-Button
Drag-Handle: opacity-0 group-hover/widget:opacity-100, data-drag-handle-Attribut
```

### `widget-resize-handle.tsx`
```
Rendert: Absolute bottom-right, cursor-se-resize, opacity-0 group-hover:opacity-100
Icon: Custom SVG (3 diagonale Linien von DS) — präziser als rotierter GripVertical
```

### `widget-add-button.tsx`
```
Props: { onAdd: (type: WidgetType) => void; containerCols: number }
Dropdown: "Widget hinzufügen" Button → Liste mit Icon + Name pro Widget-Typ
Bei Klick: findFreePosition() → Widget erstellen → onLayoutChange()
```

### `drop-indicator.tsx`
```
Props: { isOver: boolean; w: number; h: number; x: number; y: number }
Rendert: Gestrichelte Border, semi-transparent, nur sichtbar während aktiven Drags
```

---

## API-Integration (`use-dashboard-layout.ts`)

```typescript
// Optimistic Updates mit Rollback
const saveMutation = useMutation({
  mutationFn: (layout: DashboardLayout) => api.put('/dashboard/layout', layout),
  onMutate: async (newLayout) => {
    await qc.cancelQueries({ queryKey: ['dashboard-layout'] });
    const prev = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
    qc.setQueryData(['dashboard-layout'], newLayout);
    return { prev };
  },
  onError: (err, vars, ctx) => {
    if (ctx?.prev) qc.setQueryData(['dashboard-layout'], ctx.prev);
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ['dashboard-layout'] }),
});

// Debounced Save (3-Zeilen-Implementierung, kein throttle-debounce)
const debouncedSave = useRef(debounce(300, (layout: DashboardLayout) => {
  saveMutation.mutate(layout);
})).current;

// Actions
const moveWidget = (id, newX, newY, newWidgets) → optimisticSave
const resizeWidget = (id, newW, newH) → debouncedSave  // gedrosselt für stufenloses Ziehen
const addWidget = (type) → findFreePosition → optimisticSave
const deleteWidget = (id) → optimisticSave
```

---

## Implementierungs-Reihenfolge (Bottom-up)

1. **`lib/grid-utils.ts`** — Pure Functions, testbar ohne React
2. **`stores/grid-store.ts`** — Zustand-Store
3. **`hooks/use-dashboard-layout.ts`** — API Wrapper
4. **`hooks/use-grid-interaction.ts`** — DnD + Resize + Touch (Ein Hook)
5. **`components/dashboard/drop-indicator.tsx`** — Kleinste UI
6. **`components/dashboard/widget-resize-handle.tsx`** — Ziehgriff
7. **`components/dashboard/widget-header.tsx`** — Header mit Actions
8. **`components/dashboard/widget-add-button.tsx`** — Dropdown
9. **`components/dashboard/dashboard-widget.tsx`** — Widget-Wrapper
10. **`components/dashboard/dashboard-grid.tsx`** — Grid-Container
11. **`app/globals.css`** — CSS-Erweiterungen
12. **`app/(dashboard)/dashboard/page.tsx`** — Refactor (Orchestrator)

---

## Was NICHT implementiert wird (Phase 2)

| Feature | Grund |
|---------|-------|
| Widget minimieren / Vollbild | Nicht im MVP-Scope |
| Undo/Redo | Komplexität (Command-Pattern nötig) |
| Widget-Typ-Änderung | Selten genutzt |
| Keyboard-Navigation | Phase 2 Barrierefreiheit |
| Grid-Animation (Framer Motion) | Keine neuen npm-Pakete |
| Multi-User-Kollaboration | Single-User-App |
| Widget-Export/Import | Kein Use-Case |
| `!important` in CSS | Code-Smell — spezifischere Selektoren |

---

## Verifikations-Checkliste

- [ ] `pnpm --filter @lifehub/frontend typecheck` — keine TS-Fehler
- [ ] `pnpm --filter @lifehub/frontend build` — Next.js Build erfolgreich
- [ ] Frontend lädt Dashboard-Seite (HTTP 200)
- [ ] Widgets werden im Grid korrekt gerendert (Position, Größe)
- [ ] Drag & Drop funktioniert (Desktop + Touch Mobile)
- [ ] Resize funktioniert (Snapping an erlaubte Größen)
- [ ] Widget hinzufügen/löschen funktioniert
- [ ] Layout wird persistiert (Reload → identische Anordnung)
- [ ] Responsive Breakpoints (≥1024: 6 Spalten, ≥768: 4, ≥480: 2, <480: 1)
- [ ] Dark Mode korrekt
- [ ] Keine neuen npm-Pakete in package.json
