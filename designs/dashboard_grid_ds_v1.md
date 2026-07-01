# Dashboard Grid System — Design Document v1

> Based on: `designs/dashboard_grid_prompt.md`  
> Framework: Next.js 14 App Router + Tailwind CSS 3 + HTML5 Drag & Drop API  
> Zero new npm packages — only existing stack (shadcn/ui, TanStack Query, Zustand, lucide-react, clsx/twMerge)

---

## Table of Contents

1. [Component Architecture](#1-component-architecture)
2. [TypeScript Interfaces](#2-typescript-interfaces)
3. [Grid Logic & CSS](#3-grid-logic--css)
4. [Drag & Drop Implementation](#4-drag--drop-implementation)
5. [Resize Implementation](#5-resize-implementation)
6. [Exact Tailwind Classes Per Component](#6-exact-tailwind-classes-per-component)
7. [Custom CSS Additions (globals.css)](#7-custom-css-additions-globalscss)
8. [API Integration](#8-api-integration)
9. [State Management](#9-state-management)
10. [Widget Add Menu](#10-widget-add-menu)
11. [Edge Cases](#11-edge-cases)
12. [What NOT to Implement (Phase 2)](#12-what-not-to-implement-phase-2)
13. [File Manifest](#13-file-manifest)

---

## 1. Component Architecture

### 1.1 Component Tree

```
DashboardPage (page.tsx — Refactored)
├── DashboardHeader
│   └── AddWidgetButton → AddWidgetDropdown
├── DashboardGrid
│   ├── DashboardDropIndicator (empty-cell ghost)
│   └── DashboardWidget[] (each)
│       ├── WidgetDragHandle (GripVertical)
│       ├── WidgetHeader (icon, title, settings, delete)
│       ├── WidgetContent (type-specific renderer)
│       └── WidgetResizeHandle (diagonal grabber)
└── SettingsPanel (existing, unchanged)
```

### 1.2 File Layout

All new files go into `apps/frontend/src/app/(dashboard)/dashboard/`:

```
dashboard/
├── page.tsx                           ← refactored: slim orchestrator
├── components/
│   ├── dashboard-grid.tsx             ← Grid container + DnD + Resize orchestration
│   ├── dashboard-widget.tsx           ← Single widget wrapper (header + content + handles)
│   ├── widget-drag-handle.tsx         ← GripVertical drag activator
│   ├── widget-resize-handle.tsx       ← Bottom-right resize grabber
│   ├── widget-add-button.tsx          ← "Widget hinzufügen" button + dropdown
│   ├── widget-settings-router.tsx     ← Extracted from old WidgetSettingsContent
│   └── drop-indicator.tsx             ← Dashed empty-slot placeholder
├── hooks/
│   ├── use-dashboard-layout.ts        ← TanStack Query + Mutation wrapper
│   ├── use-drag-to-reorder.ts         ← HTML5 DnD logic (reusable hook)
│   └── use-resize-observer.ts         ← CSS ResizeObserver + snap logic
├── types.ts                           ← All TS interfaces & constants
└── grid-store.ts                      ← Zustand store for transient DnD/Resize state
```

### 1.3 Props & Contracts

```typescript
// dashboard-grid.tsx
interface DashboardGridProps {
  widgets: DashboardWidget[];
  onLayoutChange: (widgets: DashboardWidget[]) => void;
  isSaving: boolean;
}

// dashboard-widget.tsx
interface DashboardWidgetProps {
  widget: DashboardWidget;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  onSettingsOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onConfigChange: (id: string, config: WidgetConfig) => void;
}

// widget-resize-handle.tsx
interface WidgetResizeHandleProps {
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

// widget-add-button.tsx
interface AddWidgetButtonProps {
  onAdd: (type: WidgetType) => void;
  availableTypes: WidgetType[];
}
```

---

## 2. TypeScript Interfaces

### 2.1 Types File (`types.ts`)

```typescript
// ─── Domain Types (mirrored from backend) ───

export type WidgetType = 'media' | 'calendar' | 'weather' | 'savings' | 'tasks' | 'finance' | 'projects';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
}

// ─── Grid Constants ───

/** All allowed widget size combinations: [w, h] */
export const ALLOWED_SIZES: [number, number][] = [
  [1, 1], [1, 2],
  [2, 2], [2, 3],
  [3, 2], [3, 3],
  [4, 1], [4, 2], [4, 3],
  [6, 1], [6, 2], [6, 3], [6, 4],
];

export const GRID_COLUMNS = { DESKTOP: 6, TABLET: 4, MOBILE: 2, SMALL_MOBILE: 1 } as const;
export const GRID_GAP = 16; // px, corresponds to gap-4
export const MIN_WIDGET_HEIGHT = 120; // px per row
export const ASPECT_RATIO = 1; // 1:1 cell ratio (adjustable)

export const DEFAULT_SIZES: Record<WidgetType, { w: number; h: number }> = {
  media:     { w: 4, h: 2 },
  weather:   { w: 3, h: 2 },
  calendar:  { w: 3, h: 2 },
  savings:   { w: 1, h: 1 },
  tasks:     { w: 2, h: 2 },
  finance:   { w: 3, h: 2 },
  projects:  { w: 4, h: 2 },
};

export const WIDGET_LABELS: Record<WidgetType, string> = {
  media:     'Letzte Medien',
  weather:   'Wetter',
  calendar:  'Kalender',
  savings:   'Sparziele',
  tasks:     'Aufgaben',
  finance:   'Finanzen',
  projects:  'Projekte',
};

// ─── Grid State Types (transient — not persisted) ───

export interface DragState {
  activeId: string | null;
  overId: string | null;
  /** Grid coordinates of current drag position (for visual) */
  currentX: number;
  currentY: number;
}

export interface ResizeState {
  activeId: string | null;
  /** Current width/height while dragging resize handle */
  currentW: number;
  currentH: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}

// ─── Snapped Size ───

export interface SnappedSize {
  w: number;
  h: number;
}
```

---

## 3. Grid Logic & CSS

### 3.1 Responsive Breakpoints

| Breakpoint | Min Width | Columns | Tailwind Prefix |
|-----------|-----------|---------|----------------|
| small mobile | 0px | 1 | `max-sm:` (default) |
| mobile | 480px | 2 | `sm:` |
| tablet | 768px | 4 | `md:` |
| desktop | 1024px | 6 | `lg:` |

Implemented via CSS Grid with custom properties:

```css
/* In globals.css */
@layer components {
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 16px;
    padding: 0;
    container-type: inline-size;
  }

  @container (min-width: 480px) {
    .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @container (min-width: 768px) {
    .dashboard-grid { grid-template-columns: repeat(4, 1fr); }
  }
  @container (min-width: 1024px) {
    .dashboard-grid { grid-template-columns: repeat(6, 1fr); }
  }
}
```

**Why `@container` instead of media queries:** Container queries respond to the actual available width of the dashboard area (which may differ from viewport due to sidebar). This makes the grid robust when sidebar is collapsed or when embedded elsewhere. Fallback: the CSS also has `@media` as a secondary guard.

### 3.2 Widget Cell Positioning

Widgets are placed explicitly via `grid-column` and `grid-row`:

```tsx
function getWidgetStyle(w: DashboardWidget): React.CSSProperties {
  return {
    gridColumn: `${w.x + 1} / span ${w.w}`,
    gridRow: `${w.y + 1} / span ${w.h}`,
    minHeight: `${w.h * MIN_WIDGET_HEIGHT}px`,
  };
}
```

Rationale for explicit `x`/`y` (not auto-flow): Users can leave gaps in the grid. Items must stay at their persisted position. Auto-placement would collapse gaps.

### 3.3 Column Calculations Per Widget

```typescript
function getCSSColumns(cols: number, widgetColumns: number, breakpoint: number): number {
  // Clamp: widget cannot span more than available columns
  return Math.min(widgetColumns, breakpoint);
}
```

### 3.4 Grid Style (React inline for dynamic column count)

```tsx
const gridRef = useRef<HTMLDivElement>(null);
const [containerCols, setContainerCols] = useState(6);

// Update on resize via ResizeObserver
useEffect(() => {
  if (!gridRef.current) return;
  const observer = new ResizeObserver(([entry]) => {
    const width = entry.contentBoxSize[0].inlineSize;
    if (width >= 1024) setContainerCols(6);
    else if (width >= 768) setContainerCols(4);
    else if (width >= 480) setContainerCols(2);
    else setContainerCols(1);
  });
  observer.observe(gridRef.current);
  return () => observer.disconnect();
}, []);
```

---

## 4. Drag & Drop Implementation

### 4.1 Strategy: HTML5 Native Drag & Drop + Visual Offset

We use the native HTML5 Drag & Drop API with a **visual-only drag ghost** approach:

1. `onDragStart`: Set `dataTransfer` with widget ID. Set `opacity-30` on source. Calculate drag offset.
2. `onDragOver`: Prevent default (allow drop). Determine which widget position the cursor is over.
3. `onDrop`: Reorder widgets in the `widgets[]` array — target widget shifts to make room.
4. After drop: persist via `PUT /dashboard/layout`.

### 4.2 Drop Zone Detection (Hit Testing)

We do NOT use native `dropzone` attribute. Instead, each widget is a drop target. We track cursor position relative to the grid to find which cell the item was dropped on.

**Algorithm for reorder on drop:**

```typescript
interface BoundingBox { x: number; y: number; w: number; h: number; }

function findDropTarget(
  cursorX: number,
  cursorY: number,
  widgets: DashboardWidget[],
  containerCols: number,
  cellWidth: number,
  cellHeight: number,
): { targetId: string | null; insertX: number; insertY: number } {
  const gridX = Math.floor(cursorX / cellWidth);
  const gridY = Math.floor(cursorY / cellHeight);

  // Check if position is occupied
  for (const w of widgets) {
    if (gridX >= w.x && gridX < w.x + w.w && gridY >= w.y && gridY < w.y + w.h) {
      return { targetId: w.id, insertX: gridX, insertY: gridY };
    }
  }
  return { targetId: null, insertX: gridX, insertY: gridY };
}
```

### 4.3 Shift Logic („Platz machen")

When a widget is dropped, we shift other widgets to make room. Algorithm:

```typescript
function findFreePosition(
  widgets: DashboardWidget[],
  w: number,
  h: number,
  cols: number,
): { x: number; y: number } | null {
  const occupied = new Set<string>();

  const key = (x: number, y: number) => `${x},${y}`;

  // Mark occupied cells
  for (const widget of widgets) {
    for (let dx = 0; dx < widget.w; dx++) {
      for (let dy = 0; dy < widget.h; dy++) {
        occupied.add(key(widget.x + dx, widget.y + dy));
      }
    }
  }

  // Find first free spot (scan left-to-right, top-to-bottom)
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= cols - w; x++) {
      let free = true;
      for (let dx = 0; dx < w && free; dx++) {
        for (let dy = 0; dy < h && free; dy++) {
          if (occupied.has(key(x + dx, y + dy))) free = false;
        }
      }
      if (free) return { x, y };
    }
  }
  return null;
}
```

**Reordering (move widget A to position of widget B, push B down):**

```typescript
function moveWidget(
  widgets: DashboardWidget[],
  movedId: string,
  targetX: number,
  targetY: number,
  cols: number,
): DashboardWidget[] {
  const moved = widgets.find(w => w.id === movedId)!;
  const others = widgets.filter(w => w.id !== movedId);

  // Calculate new y based on pushing
  let newY = targetY;
  // Ensure we don't overlap with existing widgets after removal
  const tempWidgets = others.map(w => ({ ...w }));
  // Place moved widget at target
  const placed = { ...moved, x: targetX, y: targetY };

  // Check for overlaps — push overlapping widgets down
  let needsAnotherPass = true;
  while (needsAnotherPass) {
    needsAnotherPass = false;
    for (let i = 0; i < tempWidgets.length; i++) {
      const a = tempWidgets[i];
      if (rectsOverlap(placed, a)) {
        tempWidgets[i] = { ...a, y: placed.y + placed.h };
        needsAnotherPass = true;
      }
    }
  }

  return [placed, ...tempWidgets];
}

function rectsOverlap(a: DashboardWidget, b: DashboardWidget): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}
```

### 4.4 Drag Visual Feedback

- **Source widget**: `opacity-30 transition-opacity duration-150` (during drag)
- **Drag ghost**: HTML5 creates an automatic ghost — we enhance it:
  ```tsx
  onDragStart={(e) => {
    const el = e.currentTarget;
    // Clone element for ghost — native already does this but let's style it
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widget.id);
    // Slight rotation for "lifted" feel
    el.style.transform = 'rotate(1deg) scale(1.02)';
  }}
  onDragEnd={(e) => {
    e.currentTarget.style.transform = '';
  }}
  ```
- **Drop target indicator**: Dashed border on hovered widget → `border-dashed border-brand-500/50`

### 4.5 Touch Support for Mobile

HTML5 Drag & Drop does NOT work on mobile Safari/Chrome. For touch devices, we implement a **touch-based drag polyfill** using `touchstart`/`touchmove`/`touchend`:

```typescript
// In use-drag-to-reorder.ts
function useDragToReorder(
  gridRef: RefObject<HTMLDivElement>,
  widgets: DashboardWidget[],
  onReorder: (widgets: DashboardWidget[]) => void,
  containerCols: number,
) {
  const touchDrag = useRef<{
    id: string;
    startX: number;
    startY: number;
    ghost: HTMLElement | null;
  } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent, widgetId: string) => {
    const touch = e.touches[0];
    const ghost = (e.currentTarget as HTMLElement).cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.width = '200px';
    ghost.style.opacity = '0.8';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.transform = 'rotate(2deg) scale(1.05)';
    document.body.appendChild(ghost);

    touchDrag.current = {
      id: widgetId,
      startX: touch.clientX,
      startY: touch.clientY,
      ghost,
    };

    // Position ghost
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ghost.style.left = `${touch.clientX - rect.width / 2}px`;
    ghost.style.top = `${touch.clientY - rect.height / 2}px`;
  }, []);

  // ... touchmove: move ghost + detect drop zone
  // ... touchend: commit reorder + remove ghost
}
```

The touch drag is integrated into the hook so both mouse (HTML5) and touch work transparently from the consumer's perspective.

---

## 5. Resize Implementation

### 5.1 Resize Handle

Bottom-right corner, diagonally oriented. Uses CSS `resize: none` (we manage resize ourselves via mouse/touch events).

```tsx
function WidgetResizeHandle({ onResizeStart }: WidgetResizeHandleProps) {
  return (
    <div
      className="
        absolute bottom-0 right-0 z-20
        w-4 h-4
        cursor-se-resize
        opacity-0 group-hover/widget:opacity-100
        transition-opacity duration-150
        flex items-center justify-center
      "
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
    >
      {/* Diagonal grip icon — pure CSS */}
      <svg width="10" height="10" viewBox="0 0 10 10" className="text-fg-muted">
        <line x1="3" y1="10" x2="10" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="10" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9" y1="10" x2="10" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
```

### 5.2 Resize Logic (Snapping to Grid)

```typescript
function useWidgetResize(
  gridRef: RefObject<HTMLDivElement>,
  widgets: DashboardWidget[],
  onResize: (widgetId: string, w: number, h: number) => void,
  containerCols: number,
) {
  const resizeState = useRef<ResizeState | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, widgetId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const widget = widgets.find(w => w.id === widgetId);
      if (!widget) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      resizeState.current = {
        activeId: widgetId,
        currentW: widget.w,
        currentH: widget.h,
        startX: clientX,
        startY: clientY,
        startW: widget.w,
        startH: widget.h,
      };

      // Bind global move/end listeners
      const handleMove = (me: MouseEvent | TouchEvent) => {
        // ... calculate delta, snap to grid
      };
      const handleEnd = () => {
        // ... commit resize
        // ... remove listeners
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleEnd);
      window.addEventListener('touchend', handleEnd);
    },
    [widgets, onResize, containerCols],
  );

  return { handleResizeStart };
}
```

### 5.3 Snap Calculation

```typescript
function snapToGrid(
  clientX: number,
  clientY: number,
  startClientX: number,
  startClientY: number,
  startW: number,
  startH: number,
  cellWidth: number,
  cellHeight: number,
  containerCols: number,
): SnappedSize {
  const deltaX = clientX - startClientX;
  const deltaY = clientY - startClientY;

  let newW = Math.round(startW + deltaX / cellWidth);
  let newH = Math.round(startH + deltaY / cellHeight);

  // Clamp to allowed sizes
  newW = Math.max(1, Math.min(containerCols, newW));
  newH = Math.max(1, Math.min(4, newH));

  // Snap to nearest allowed size combination
  return snapToAllowedSize(newW, newH);
}

function snapToAllowedSize(w: number, h: number): SnappedSize {
  // Find closest allowed size by Manhattan distance
  let best: SnappedSize = { w: 1, h: 1 };
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
```

### 5.4 Resize Cursor

During resize, a `cursor-se-resize` is shown on the handle. While actively resizing, we set `cursor-se-resize` on `document.body` to prevent flickering:

```typescript
// On resize start:
document.body.style.cursor = 'se-resize';
document.body.style.userSelect = 'none';

// On resize end:
document.body.style.cursor = '';
document.body.style.userSelect = '';
```

---

## 6. Exact Tailwind Classes Per Component

### 6.1 DashboardGrid (Container)

```tsx
<div
  ref={gridRef}
  className="
    dashboard-grid
    relative w-full
  "
  style={{
    gridTemplateColumns: `repeat(${containerCols}, 1fr)`,
    gap: '16px',
  }}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
```

### 6.2 DashboardWidget (Single Widget Card)

```tsx
<div
  className={cn(
    'group/widget relative rounded-xl border',
    'bg-bg-surface border-border',
    'flex flex-col overflow-hidden',
    'transition-all duration-200 ease-in-out',
    isDragging && 'opacity-30 scale-[1.02] rotate-[1deg] shadow-2xl',
  )}
  style={getWidgetStyle(widget)}
  draggable
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragOver={handleDragOver}
>
```

### 6.3 WidgetHeader

```tsx
<div className="flex items-center gap-2 px-4 pt-3 pb-0 shrink-0">
  {/* Drag Handle — visible on hover */}
  <button
    className={cn(
      'drag-handle cursor-grab active:cursor-grabbing',
      'rounded p-0.5 text-fg-subtle',
      'opacity-0 group-hover/widget:opacity-100',
      'hover:text-fg hover:bg-bg-raised',
      'transition-opacity duration-150',
      'touch-none', // prevents scroll interference on mobile
    )}
    onMouseDown={handleDragHandleMouseDown}
  >
    <GripVertical className="h-4 w-4" />
  </button>

  {/* Icon + Title */}
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <span className="shrink-0">{WIDGET_ICONS[widget.type]}</span>
    <span className="text-sm font-medium text-fg truncate">
      {WIDGET_LABELS[widget.type] || widget.type}
    </span>
  </div>

  {/* Settings */}
  <button
    onClick={() => onSettingsOpen(widget.id)}
    className={cn(
      'rounded-md p-1 text-fg-subtle',
      'opacity-0 group-hover/widget:opacity-100',
      'hover:text-fg hover:bg-bg-raised',
      'transition-opacity duration-150',
    )}
  >
    <Settings className="h-4 w-4" />
  </button>

  {/* Delete */}
  <button
    onClick={() => onDelete(widget.id)}
    className={cn(
      'rounded-md p-1 text-fg-subtle',
      'opacity-0 group-hover/widget:opacity-100',
      'hover:text-danger hover:bg-danger/10',
      'transition-opacity duration-150',
    )}
  >
    <Trash2 className="h-4 w-4" />
  </button>
</div>
```

### 6.4 WidgetContent Area

```tsx
<div className="flex-1 min-h-0 px-4 pb-4 pt-2">
  {content}
</div>
```

### 6.5 DropIndicator (Empty Slot)

```tsx
<div
  className={cn(
    'rounded-xl border-2 border-dashed',
    'border-border bg-bg-raised/30',
    'flex items-center justify-center',
    'text-xs text-fg-subtle',
    'transition-colors duration-150',
    isOver && 'border-brand-500/50 bg-brand-500/5',
  )}
  style={{
    gridColumn: `span ${placeholderW}`,
    gridRow: `span ${placeholderH}`,
    minHeight: `${placeholderH * 120}px`,
  }}
>
  <span>Widget hier ablegen</span>
</div>
```

### 6.6 AddWidgetButton

```tsx
<div className="relative">
  <button
    onClick={() => setOpen(!open)}
    className={cn(
      'flex items-center gap-1.5',
      'rounded-lg px-3 py-1.5 text-sm font-medium',
      'bg-brand-500 text-white',
      'hover:bg-brand-600',
      'transition-colors duration-150',
    )}
  >
    <Plus className="h-4 w-4" />
    Widget hinzufügen
  </button>

  {open && (
    <div
      className={cn(
        'absolute right-0 top-full mt-2 z-50',
        'w-56 rounded-xl border',
        'bg-bg-surface border-border',
        'shadow-2xl overflow-hidden',
        'animate-fade-in',
      )}
    >
      {/* Available widget types list */}
      {availableTypes.map((type) => (
        <button
          key={type}
          onClick={() => { onAdd(type); setOpen(false); }}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5',
            'text-sm text-fg hover:bg-bg-raised',
            'transition-colors duration-100',
          )}
        >
          {WIDGET_ICONS[type]}
          <span>{WIDGET_LABELS[type]}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

### 6.7 Resize Handle

```tsx
<div
  className={cn(
    'absolute bottom-0 right-0 z-20',
    'w-5 h-5',
    'cursor-se-resize',
    'opacity-0 group-hover/widget:opacity-100',
    'transition-opacity duration-150',
    'flex items-end justify-end pr-0.5 pb-0.5',
    'touch-none',
  )}
  onMouseDown={onResizeStart}
  onTouchStart={onResizeStart}
>
  {/* CSS diagonal lines */}
  <svg width="12" height="12" viewBox="0 0 12 12" className="text-fg-muted" aria-hidden="true">
    <line x1="4" y1="12" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="7" y1="12" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="10" y1="12" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
</div>
```

---

## 7. Custom CSS Additions (globals.css)

Add to `apps/frontend/src/app/globals.css`:

```css
/* ─── Dashboard Grid ─── */
@layer components {
  .dashboard-grid {
    display: grid;
    gap: 16px;
    container-type: inline-size;
    container-name: dashboard;
  }

  /* Drag & Drop */
  .drag-handle {
    touch-action: none;
  }

  .dragging {
    opacity: 0.3;
    transform: scale(1.02) rotate(1deg);
    transition: opacity 150ms ease, transform 150ms ease;
  }

  .drop-target {
    border-color: rgb(217 119 6 / 0.5); /* brand-500/50 */
    background-color: rgb(217 119 6 / 0.05);
  }

  /* Resize handle hover area */
  .resize-handle {
    touch-action: none;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
  }

  /* Animations */
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fade-in 150ms ease-out;
  }

  /* Slide-up for settings panel */
  .animate-slide-up {
    animation: slide-up 200ms ease-out;
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Widget transition */
  .widget-enter {
    animation: widget-enter 200ms ease-out;
  }

  @keyframes widget-enter {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
}

/* ─── Grid Container Queries ─── */
@container dashboard (min-width: 480px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@container dashboard (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr) !important;
  }
}

@container dashboard (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(6, 1fr) !important;
  }
}
```

---

## 8. API Integration

### 8.1 Hook: `useDashboardLayout`

```typescript
// hooks/use-dashboard-layout.ts
export function useDashboardLayout() {
  const qc = useQueryClient();
  const accessToken = useAuthStore(s => s.accessToken);

  const {
    data: layout,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: () => api.get<DashboardLayout>('/dashboard/layout'),
    staleTime: 60_000,
    enabled: !!accessToken,
  });

  const saveMutation = useMutation({
    mutationFn: (l: DashboardLayout) => api.put('/dashboard/layout', l),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout'] });
    },
    // Errors bubble up — no global toast for now
  });

  // Optimistic update helper
  const optimisticSave = useCallback(
    (nextWidgets: DashboardWidget[]) => {
      qc.setQueryData<DashboardLayout>(['dashboard-layout'], { widgets: nextWidgets });
      saveMutation.mutate({ widgets: nextWidgets });
    },
    [qc, saveMutation],
  );

  return {
    widgets: layout?.widgets ?? [],
    isLoading,
    isError,
    isSaving: saveMutation.isPending,
    optimisticSave,
    retry: () => qc.invalidateQueries({ queryKey: ['dashboard-layout'] }),
  };
}
```

### 8.2 Optimistic Update Strategy

All DnD and resize operations write to the local cache **immediately**, then fire the API in the background:

```
User drops widget → optimisticSave(newWidgets) → onSuccess: invalidate refetch
                                                     → onError: rollback to previous state
```

**Rollback on error:**

```typescript
const previousLayout = useRef<DashboardLayout | null>(null);

const saveMutation = useMutation({
  mutationFn: (l: DashboardLayout) => api.put('/dashboard/layout', l),
  onMutate: async (newLayout) => {
    previousLayout.current = qc.getQueryData(['dashboard-layout']) ?? null;
    qc.setQueryData(['dashboard-layout'], newLayout);
    return { previousLayout: previousLayout.current };
  },
  onError: (_err, _newLayout, context) => {
    if (context?.previousLayout) {
      qc.setQueryData(['dashboard-layout'], context.previousLayout);
    }
  },
  onSettled: () => {
    qc.invalidateQueries({ queryKey: ['dashboard-layout'] });
  },
});
```

### 8.3 Debounced Save

For resize (continuous mouse move), we debounce the API call:

```typescript
import { debounce } from 'throttle-debounce'; // already in dep tree via TanStack Query

const debouncedSave = useRef(
  debounce(300, (widgets: DashboardWidget[]) => {
    saveMutation.mutate({ widgets });
  })
).current;
```

Note: `throttle-debounce` is a dependency of TanStack Query's devtools. If not available, a simple 3-line debounce utility is used instead:

```typescript
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
```

---

## 9. State Management

### 9.1 State Ownership

| Concern | Location | Rationale |
|---------|----------|-----------|
| Widget list (persisted) | TanStack Query cache | Server state, needs cache sync |
| Drag active/inactive | Zustand store `grid-store.ts` | Transient UI state, no serialization |
| Resize active/inactive | Zustand store `grid-store.ts` | Transient UI state, no serialization |
| Drag ghost position | Zustand store | Updated at 60fps, not appropriate in React state |
| Widget settings panels | Local `useState` in each `DashboardWidget` | Scoped, not shared |
| Add widget dropdown open | Local `useState` in `AddWidgetButton` | Ephemeral UI state |

### 9.2 Zustand Grid Store

```typescript
// grid-store.ts
import { create } from 'zustand';

interface GridState {
  // Drag
  dragActiveId: string | null;
  dragOverId: string | null;
  // Resize
  resizeActiveId: string | null;
  resizeW: number;
  resizeH: number;

  // Actions
  setDragActive: (id: string | null) => void;
  setDragOver: (id: string | null) => void;
  setResizeActive: (id: string | null, w?: number, h?: number) => void;
  clearDrag: () => void;
  clearResize: () => void;
}

export const useGridStore = create<GridState>((set) => ({
  dragActiveId: null,
  dragOverId: null,
  resizeActiveId: null,
  resizeW: 1,
  resizeH: 1,

  setDragActive: (id) => set({ dragActiveId: id }),
  setDragOver: (id) => set({ dragOverId: id }),
  setResizeActive: (id, w, h) => set({ resizeActiveId: id, resizeW: w, resizeH: h }),
  clearDrag: () => set({ dragActiveId: null, dragOverId: null }),
  clearResize: () => set({ resizeActiveId: null }),
}));
```

---

## 10. Widget Add Menu

### 10.1 Logic

```typescript
function handleAddWidget(type: WidgetType) {
  const defaultSize = DEFAULT_SIZES[type];
  const pos = findFreePosition(widgets, defaultSize.w, defaultSize.h, containerCols);

  if (!pos) return; // Grid full — option: show toast

  const newWidget: DashboardWidget = {
    id: crypto.randomUUID(),
    type,
    x: pos.x,
    y: pos.y,
    w: defaultSize.w,
    h: defaultSize.h,
    config: defaultConfig(type),
  };

  optimisticSave([...widgets, newWidget]);
}
```

### 10.2 Available Widget Types (for Add Menu)

Derived from the union type. Filtered to exclude types that would have no content yet:

```typescript
const ADDABLE_TYPES: { type: WidgetType; icon: React.ReactNode; description: string }[] = [
  { type: 'media',    icon: <Camera />,     description: 'Foto-Diashow aus Alben' },
  { type: 'weather',  icon: <CloudSun />,    description: 'Aktuelles Wetter + Vorhersage' },
  { type: 'calendar', icon: <Calendar />,    description: 'Monatskalender' },
  { type: 'savings',  icon: <PiggyBank />,   description: 'Sparziele-Übersicht (Demo)' },
];
```

---

## 11. Edge Cases

### 11.1 Leeres Layout

```
Widgets: []
→ Show "Noch keine Widgets konfiguriert" + "Standard-Layout laden" button
→ Also show "Widget hinzufügen" button so user can build from scratch
```

### 11.2 Ein Widget

- Widget spans the available columns (up to its `w`)
- On mobile (1 col), widget is reduced to 1 column (content adapts)
- Drag & resize still works normally

### 11.3 Viele Widgets / Overflow

- Grid auto-expands rows as needed (CSS Grid auto-rows)
- Page scrolls vertically
- No pagination in Phase 1

### 11.4 Grid voll (kein Platz für neues Widget)

```typescript
if (!pos) {
  // Show toast: "Kein Platz für dieses Widget. Entferne zuerst ein anderes."
  return;
}
```

### 11.5 Mobile / Touch

- **Drag**: Touch event polyfill (see §4.5). On `touchstart`, clone widget as fixed ghost, follow finger on `touchmove`, commit on `touchend`.
- **Resize**: `touchstart`/`touchmove`/`touchend` on resize handle, same logic as mouse.
- **Column count**: 2 cols (≥480px), 1 col (<480px).
- Widgets stack vertically. A widget with `w: 6` becomes `w: 2` (or `w: 1`), content reflows.

### 11.6 Drag auf leeres Feld (nicht über Widget)

If drop position doesn't overlap any existing widget:
- Move dragged widget to that position
- If position was empty, place it there (no push needed)

### 11.7 Widget außerhalb Grid ablegen (Fensterrand)

- `onDragEnd` fires without `onDrop` → cancel, widget stays at original position
- Zustand `clearDrag()` called

### 11.8 Resize über Grid-Grenzen hinaus

- Clamped: `w` max = `containerCols`, `h` max = 4 (or dynamically `max(4, ...)`)
- Resize cursor stays within grid bounds

### 11.9 API-Fehler bei Save

- Optimistic update rolls back (see §8.2)
- Widget positions revert to last saved state
- No data loss

### 11.10 Schnelle aufeinanderfolgende Drags (gestottertes DnD)

- Ignore `dragStart` if `resizeActiveId` is set (and vice versa)
- Zustand store prevents concurrent operations

### 11.11 Widget-ID-Kollision

- `crypto.randomUUID()` (Web Crypto API, available in all modern browsers)
- Fallback for older browsers: `'w-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)`

---

## 12. What NOT to Implement (Phase 2)

The following features are explicitly **excluded** from this design:

| Feature | Reason | Future Phase |
|---------|--------|-------------|
| Widget minimize / collapse | Not requested, UI complexity | Phase 2 |
| Full-screen widget | Not requested | Phase 2 |
| Widget type change (swap media→weather) | Rarely used | Phase 2 |
| Grid row/column gap config | Theme, not layout | Phase 2 |
| Drag between multiple dashboards (tabs) | Not in current spec | Phase 2 |
| Undo/redo for layout changes | Requires command pattern | Phase 2 |
| Auto-save (vs. save-on-drop) | Current spec saves on each drop/resize | Phase 2 |
| Widget import/export | Not requested | Phase 2 |
| Drag overlay animation (Framer Motion) | No new deps — CSS transitions only | Phase 2 |
| Keyboard reordering (arrow keys) | Screen reader support | Phase 2 |
| Collaboration (multi-user grid) | Single-user app | Phase 2 |
| Widget library / marketplace | Plugin-system dependent | Phase 2+ |
| Resize constraints per widget type | Currently all sizes allowed for all types | Phase 2 |
| Non-grid (free-form) positioning | CSS Grid is the chosen paradigm | Never |

---

## 13. File Manifest

### New Files (7)

| # | Path | Lines (est.) | Purpose |
|---|------|--------------|---------|
| 1 | `apps/frontend/src/app/(dashboard)/dashboard/components/dashboard-grid.tsx` | ~180 | Grid container with DnD + Resize orchestration |
| 2 | `apps/frontend/src/app/(dashboard)/dashboard/components/dashboard-widget.tsx` | ~120 | Single widget wrapper |
| 3 | `apps/frontend/src/app/(dashboard)/dashboard/components/widget-resize-handle.tsx` | ~40 | Resize handle component |
| 4 | `apps/frontend/src/app/(dashboard)/dashboard/components/widget-add-button.tsx` | ~80 | Add widget button + dropdown |
| 5 | `apps/frontend/src/app/(dashboard)/dashboard/components/drop-indicator.tsx` | ~30 | Empty slot indicator |
| 6 | `apps/frontend/src/app/(dashboard)/dashboard/hooks/use-dashboard-layout.ts` | ~60 | Query + Mutation + optimistic update |
| 7 | `apps/frontend/src/app/(dashboard)/dashboard/types.ts` | ~100 | All interfaces + constants |

### Deleted / Inlined

- `widget-drag-handle.tsx` — inlined into `dashboard-widget.tsx` header (too trivial for own file)
- `widget-settings-router.tsx` — stays in page.tsx or moved to own file if >50 lines
- `hooks/use-drag-to-reorder.ts` — too coupled to grid state; logic lives in `dashboard-grid.tsx`
- `hooks/use-resize-observer.ts` — use standard `ResizeObserver` inline in grid component

### Changed Files (2)

| # | Path | Change |
|---|------|--------|
| 1 | `apps/frontend/src/app/(dashboard)/dashboard/page.tsx` | Extract grid + DnD/resize logic to sub-components. Slim to ~50 lines (orchestrator only). |
| 2 | `apps/frontend/src/app/globals.css` | Add `@layer components` block with `.dashboard-grid`, `.drag-handle`, `.resize-handle`, keyframe animations, `@container` queries |

### Zustand Store (1)

| # | Path | Purpose |
|---|------|---------|
| 1 | `apps/frontend/src/app/(dashboard)/dashboard/grid-store.ts` | Transient DnD/resize UI state |

---

## Appendix A: Page.tsx Refactoring Plan

**Current**: 834 lines, monolithic. Grid + all widgets + all settings inline.

**Target**: ~150 lines, orchestrator only.

```typescript
// page.tsx (refactored)
'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useDashboardLayout } from './hooks/use-dashboard-layout';
import { DashboardGrid } from './components/dashboard-grid';
import { AddWidgetButton } from './components/widget-add-button';
import { useCallback } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, roles, accessToken, clear } = useAuthStore();
  const { widgets, isLoading, isError, isSaving, optimisticSave, retry } = useDashboardLayout();

  if (!accessToken) { router.push('/login'); return null; }
  if (!user) return null;

  return (
    <main className="min-h-screen p-6">
      <DashboardHeader
        user={user}
        roles={roles}
        isSaving={isSaving}
        onLogout={() => { clear(); router.push('/login'); }}
      >
        <AddWidgetButton
          onAdd={(type) => {
            /* ... find position, create widget, optimisticSave */
          }}
          availableTypes={['media', 'weather', 'calendar', 'savings']}
        />
      </DashboardHeader>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={retry} />
      ) : widgets.length === 0 ? (
        <EmptyState onReset={/* ... */} />
      ) : (
        <DashboardGrid
          widgets={widgets}
          onLayoutChange={optimisticSave}
          isSaving={isSaving}
        />
      )}

      <Footer />
    </main>
  );
}
```

**Extracted sections** become inline mini-components or grow into own files when they exceed ~30 lines.

---

*End of Design Document v1*  
*Status: Entwurf, bereit für Implementierung*
