# Dashboard Grid System — Design-Dokument v1

**Autor:** mimo-v2.5-free  
**Datum:** 2026-06-19  
**Status:** Entwurf  
**Basiert auf:** `dashboard_grid_prompt.md`

---

## Inhaltsverzeichnis

1. [Komponenten-Architektur](#1-komponenten-architektur)
2. [Grid-Logik](#2-grid-logik)
3. [Drag & Drop](#3-drag--drop)
4. [Resize](#4-resize)
5. [Tailwind-Klassen](#5-tailwind-klassen)
6. [TypeScript-Interfaces](#6-typescript-interfaces)
7. [API-Integration](#7-api-integration)
8. [State-Management](#8-state-management)
9. [Edge Cases](#9-edge-cases)
10. [Phase-2-Ausgrenzungen](#10-phase-2-ausgrenzungen)

---

## 1. Komponenten-Architektur

### 1.1 Dateistruktur

```
apps/frontend/src/
├── app/(dashboard)/dashboard/
│   └── page.tsx                    ← Refactor: nur noch Orchestrator
├── components/dashboard/
│   ├── DashboardGrid.tsx           ← Grid-Container mit CSS Grid
│   ├── GridWidget.tsx              ← Widget-Wrapper (DnD + Resize + Header)
│   ├── ResizeHandle.tsx            ← Diagonales Ziehgriff-Icon
│   ├── WidgetHeader.tsx            ← Drag-Handle + Titel + Actions
│   ├── AddWidgetButton.tsx         ← Dropdown "Widget hinzufügen"
│   ├── WidgetContextMenu.tsx       ← Menü: Settings + Löschen
│   └── EmptyGridCell.tsx           ← Gestrichelte Platzhalter-Zelle
├── hooks/
│   ├── use-grid-layout.ts          ← Grid-Berechnung + Responsive
│   ├── use-drag-and-drop.ts        ← HTML5 DnD-Logik
│   ├── use-widget-resize.ts        ← Resize-Logik mit Snapping
│   └── use-dashboard-mutation.ts   ← Optimistic Layout-Update
└── lib/
    └── grid-utils.ts               ← Pure Functions: Kollision, Platzierung, Snapping
```

### 1.2 Komponenten-Übersicht

| Komponente | Props | State | Verantwortung |
|-----------|-------|-------|---------------|
| `DashboardPage` | — | Nur Auth | Orchestrierung, Laden, Header |
| `DashboardGrid` | `widgets, onLayoutChange, onWidgetAdd` | `dragState, resizeState` | CSS Grid, Drop-Zonen, Responsive |
| `GridWidget` | `widget, onDragStart, onResize, onSettings, onRemove` | `isDragging, isHovered` | Widget-Wrapper, visuelles Feedback |
| `WidgetHeader` | `widget, onDragStart, onSettings, onRemove` | — | Drag-Handle, Titel, Actions |
| `ResizeHandle` | `onResizeStart` | `isResizing` | Diagonales Ziehgriff |
| `AddWidgetButton` | `onAdd` | `isOpen` | Dropdown Widget-Typ-Auswahl |
| `EmptyGridCell` | `position, onDrop` | — | Drop-Target für neue Widgets |

### 1.3 Komponenten-Hierarchie

```
DashboardPage
├── Header (Hallo, {user} + Widget hinzufügen)
└── DashboardGrid
    ├── GridWidget (×n)
    │   ├── WidgetHeader
    │   │   ├── GripVertical (Drag-Handle)
    │   │   ├── Icon + Titel
    │   │   └── Settings + Trash2 (bei Hover)
    │   ├── Widget-Inhalt (Calendar/Weather/Media/Savings)
    │   └── ResizeHandle ( unten-rechts)
    └── EmptyGridCell (×m, für freie Plätze)
```

---

## 2. Grid-Logik

### 2.1 CSS Grid Definition

```tsx
// use-grid-layout.ts
const GRID_COLS = 6;
const CELL_GAP = 16; // gap-4 = 1rem

// Responsive Breakpoints
const BREAKPOINTS = {
  sm: 0,      // 1 Spalte  (< 480px)
  md: 480,    // 2 Spalten (< 768px)
  lg: 768,    // 4 Spalten (< 1024px)
  xl: 1024,   // 6 Spalten (≥ 1024px)
} as const;

function getColumnsForWidth(width: number): number {
  if (width >= BREAKPOINTS.xl) return 6;
  if (width >= BREAKPOINTS.lg) return 4;
  if (width >= BREAKPOINTS.md) return 2;
  return 1;
}
```

### 2.2 Grid-Container CSS

```tsx
// DashboardGrid.tsx
<div
  className="grid gap-4 w-full"
  style={{
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    // Keine feste Zeilenhöhe — Widgets bestimmen ihre Höhe über h * minHeight
  }}
>
```

### 2.3 Responsive CSS (Tailwind + Inline)

```tsx
// Grid-Container mit responsiven Spalten via CSS-Variable
const gridStyle = {
  '--grid-cols': columns,
  display: 'grid',
  gridTemplateColumns: `repeat(var(--grid-cols), 1fr)`,
  gap: `${CELL_GAP}px`,
} as React.CSSProperties;
```

**Alternative mit Tailwind-Klassen (für SSR-Kompatibilität):**

```tsx
// Nutzt dynamic classes basierend auf Breakpoint
const gridClasses = cn(
  'grid gap-4 w-full',
  columns === 1 && 'grid-cols-1',
  columns === 2 && 'grid-cols-2',
  columns === 4 && 'grid-cols-4',
  columns === 6 && 'grid-cols-6',
);
```

### 2.4 Widget-Positionierung

Jedes Widget nutzt `gridColumn` und `gridRow` für Spanning:

```tsx
style={{
  gridColumn: `${widget.x + 1} / span ${widget.w}`,
  gridRow: `${widget.y + 1} / span ${widget.h}`,
}}
```

**Beispiel:** Widget mit `x=0, y=0, w=3, h=2` → `gridColumn: "1 / span 3"`, `gridRow: "1 / span 2"`

### 2.5 Zellengröße berechnen

```tsx
// Feste Zellengröße für konsistente Proportionen
const CELL_MIN_WIDTH = 150; // px — Minimum pro Spalte
const CELL_ASPECT_RATIO = 1; // 1:1 quadratisch

function getCellHeight(containerWidth: number, columns: number): number {
  const cellWidth = (containerWidth - (columns - 1) * CELL_GAP) / columns;
  return cellWidth; // quadratisch
}

// Widget-Mindesthöhe = h * cellHeight
function getWidgetMinHeight(h: number, cellHeight: number): number {
  return h * cellHeight + (h - 1) * CELL_GAP;
}
```

### 2.6 Responsive Anpassungen

| Breakpoint | Spalten | Widget-Skalierung | Touch-Modus |
|-----------|---------|-------------------|-------------|
| ≥1024px | 6 | Volle Größe | — |
| ≥768px | 4 | Max w=4, h bleibt | — |
| ≥480px | 2 | Max w=2, h bleibt | Drag-Handle immer sichtbar |
| <480px | 1 | Max w=1, h passt sich an | Touch-DnD aktiv |

**Mobile Optimierung:** Bei ≤2 Spalten werden Widgets vertikal gestapelt. Die `w`-Eigenschaft wird auf `min(widget.w, columns)` begrenzt.

---

## 3. Drag & Drop

### 3.1 HTML5 DnD API — Event-Flow

```
WidgetHeader (Drag-Source)
    │
    ├── onDragStart → setDragState({ widgetId, startPos })
    │   └── event.dataTransfer.setData('text/plain', widgetId)
    │   └── event.dataTransfer.effectAllowed = 'move'
    │
DashboardGrid (Drop-Target)
    │
    ├── onDragOver → berechne Drop-Position
    │   └── event.preventDefault() // Erlaubt Drop
    │   └── event.dataTransfer.dropEffect = 'move'
    │   └── Visuelles Feedback: Drop-Indikator
    │
    ├── onDrop → berechne neue Widget-Position
    │   └── Finde freie Zellen an Drop-Position
    │   └── Verschiebe alle betroffenen Widgets
    │   └── onLayoutChange(newWidgets)
    │
    └── onDragEnd → cleanup
        └── setDragState(null)
```

### 3.2 State-Management für DnD

```typescript
// use-drag-and-drop.ts
interface DragState {
  widgetId: string;
  startX: number;         // Maus-Startposition (px)
  startY: number;
  currentX: number;       // Aktuelle Mausposition
  currentY: number;
  gridStartX: number;     // Widget-Startposition im Grid (Spalte)
  gridStartY: number;     // Widget-Startposition im Grid (Zeile)
  offsetCol: number;      // Offset vom Widget-Linksrand zur Maus
  offsetRow: number;      // Offset vom Widget-Oberkante zur Maus
}

type DragAction =
  | { type: 'START'; payload: DragState }
  | { type: 'MOVE'; payload: { currentX: number; currentY: number } }
  | { type: 'END' };
```

### 3.3 Drop-Position berechnen

```typescript
// grid-utils.ts
function calculateDropTarget(
  mouseX: number,
  mouseY: number,
  gridRect: DOMRect,
  columns: number,
  cellHeight: number,
): { col: number; row: number } {
  const relativeX = mouseX - gridRect.left;
  const relativeY = mouseY - gridRect.top;

  const col = Math.floor(relativeX / (gridRect.width / columns));
  const row = Math.floor(relativeY / (cellHeight + CELL_GAP));

  return {
    col: Math.max(0, Math.min(col, columns - 1)),
    row: Math.max(0, row),
  };
}
```

### 3.4 Kollisionsprüfung

```typescript
// grid-utils.ts
function checkCollision(
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  excludeId: string,
  widgets: Widget[],
): Widget[] {
  // Finde alle Widgets, die mit der neuen Position kollidieren
  return widgets.filter(w => {
    if (w.id === excludeId) return false;

    // AABB-Kollision im Grid
    const aLeft = targetX;
    const aRight = targetX + targetW;
    const aTop = targetY;
    const aBottom = targetY + targetH;

    const bLeft = w.x;
    const bRight = w.x + w.w;
    const bTop = w.y;
    const bBottom = w.y + w.h;

    return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
  });
}
```

### 3.5 Widget-Verschiebung ("Platz machen")

```typescript
// grid-utils.ts
function resolveCollision(
  draggedWidget: Widget,
  targetX: number,
  targetY: number,
  allWidgets: Widget[],
  columns: number,
): Widget[] {
  const collisions = checkCollision(targetX, targetY, draggedWidget.w, draggedWidget.h, draggedWidget.id, allWidgets);

  if (collisions.length === 0) {
    // Keine Kollision — Widget einfach verschieben
    return allWidgets.map(w =>
      w.id === draggedWidget.id ? { ...w, x: targetX, y: targetY } : w
    );
  }

  // Kollision — verschiebe kollidierende Widgets nach unten
  const result = allWidgets.map(w => {
    if (w.id === draggedWidget.id) {
      return { ...w, x: targetX, y: targetY };
    }

    if (collisions.some(c => c.id === w.id)) {
      // Verschiebe nach unten, um Platz zu machen
      const newY = targetY + draggedWidget.h;
      return { ...w, y: newY };
    }

    return w;
  });

  // Validiere: keine Widget-Overlaps im Ergebnis
  return normalizeLayout(result, columns);
}
```

### 3.6 Layout normalisieren (Lücken schließen)

```typescript
// grid-utils.ts
function normalizeLayout(widgets: Widget[], columns: number): Widget[] {
  // Sortiere nach y, dann x
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);

  const occupied: boolean[][] = []; // occupied[row][col] = true
  const result: Widget[] = [];

  for (const widget of sorted) {
    let placed = false;
    let tryY = 0;

    while (!placed) {
      // Prüfe ob Platz frei
      const canPlace = !occupiedCells(tryY, widget.x, widget.w, widget.h, occupied, columns);

      if (canPlace) {
        // Widget platzieren
        for (let r = tryY; r < tryY + widget.h; r++) {
          for (let c = widget.x; c < widget.x + widget.w; c++) {
            if (!occupied[r]) occupied[r] = [];
            occupied[r][c] = true;
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
```

### 3.7 Visuelles Feedback

**Während des Drags:**

```tsx
// DashboardGrid.tsx — Drop-Indikator
{dragState && (
  <div
    className="absolute border-2 border-dashed border-brand-500 bg-brand-500/10 rounded-xl pointer-events-none z-10 transition-all duration-100"
    style={{
      gridColumn: `${dropTarget.col + 1} / span ${draggedWidget.w}`,
      gridRow: `${dropTarget.row + 1} / span ${draggedWidget.h}`,
    }}
  />
)}
```

**Am gezogenen Widget:**

```tsx
// GridWidget.tsx
<div
  className={cn(
    'rounded-xl border bg-bg-surface p-4 flex flex-col gap-3 overflow-hidden relative group',
    'transition-all duration-200',
    isDragging && 'opacity-50 scale-95 shadow-2xl border-brand-500 z-50',
    isDropTarget && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-bg',
  )}
  draggable
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
```

### 3.8 Touch-Support (Mobile)

```typescript
// use-drag-and-drop.ts
function useTouchDrag(widget: Widget, gridRef: React.RefObject<HTMLDivElement>) {
  const [touchState, setTouchState] = useState<DragState | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    // Nur starten wenn Touch auf Drag-Handle (GripVertical-Icon)
    if (!(e.target as HTMLElement).closest('[data-drag-handle]')) return;

    e.preventDefault();
    setTouchState({
      widgetId: widget.id,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      gridStartX: widget.x,
      gridStartY: widget.y,
      offsetCol: 0,
      offsetRow: 0,
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchState) return;
    e.preventDefault();
    const touch = e.touches[0];
    setTouchState(prev => prev ? { ...prev, currentX: touch.clientX, currentY: touch.clientY } : null);
  };

  const handleTouchEnd = () => {
    if (!touchState) return;
    // Drop ausführen
    setTouchState(null);
  };

  return { touchState, handleTouchStart, handleTouchMove, handleTouchEnd };
}
```

---

## 4. Resize

### 4.1 Resize-Handle

```tsx
// ResizeHandle.tsx
'use client';

import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
  isResizing: boolean;
}

export function ResizeHandle({ onResizeStart, isResizing }: ResizeHandleProps) {
  return (
    <button
      className={cn(
        'absolute bottom-1 right-1 z-20',
        'w-6 h-6 flex items-center justify-center',
        'rounded-md cursor-se-resize',
        'text-fg-subtle opacity-0 group-hover:opacity-100',
        'hover:bg-bg-raised hover:text-fg',
        'transition-opacity duration-200',
        isResizing && 'opacity-100 text-brand-500',
      )}
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
      title="Größe ändern"
      data-resize-handle
    >
      <GripVertical className="h-4 w-4 rotate-45" />
    </button>
  );
}
```

### 4.2 Resize-Logik

```typescript
// use-widget-resize.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Widget } from '@/lib/grid-utils';

interface ResizeState {
  widgetId: string;
  startW: number;
  startH: number;
  startX: number;  // Maus-Start
  startY: number;
  currentX: number;
  currentY: number;
}

export function useWidgetResize(
  widgets: Widget[],
  onLayoutChange: (widgets: Widget[]) => void,
  columns: number,
  cellHeight: number,
) {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((widgetId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    setResizeState({
      widgetId,
      startW: widget.w,
      startH: widget.h,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    });
  }, [widgets]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!resizeState || !gridRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const gridRect = gridRef.current.getBoundingClientRect();
    const cellWidth = (gridRect.width - (columns - 1) * CELL_GAP) / columns;

    // Berechne Differenz in Grid-Einheiten
    const deltaX = clientX - resizeState.startX;
    const deltaY = clientY - resizeState.startY;

    const deltaCols = Math.round(deltaX / (cellWidth + CELL_GAP));
    const deltaRows = Math.round(deltaY / (cellHeight + CELL_GAP));

    const newW = Math.max(1, Math.min(columns, resizeState.startW + deltaCols));
    const newH = Math.max(1, Math.min(8, resizeState.startH + deltaRows)); // max 8 Zeilen

    // Snapping: Ganze Spalten/Zeilen
    const snappedW = Math.round(newW);
    const snappedH = Math.round(newH);

    // Prüfe Kollision mit anderen Widgets
    const widget = widgets.find(w => w.id === resizeState.widgetId);
    if (!widget) return;

    const hasCollision = widgets.some(w => {
      if (w.id === widget.id) return false;
      return !(
        widget.x + snappedW <= w.x ||
        w.x + w.w <= widget.x ||
        widget.y + snappedH <= w.y ||
        w.y + w.h <= widget.y
      );
    });

    if (!hasCollision) {
      onLayoutChange(
        widgets.map(w =>
          w.id === resizeState.widgetId
            ? { ...w, w: snappedW, h: snappedH }
            : w
        )
      );
    }
  }, [resizeState, widgets, columns, cellHeight, onLayoutChange]);

  const handleMouseUp = useCallback(() => {
    if (resizeState) {
      setResizeState(null);
      // Persistiere Layout
    }
  }, [resizeState]);

  useEffect(() => {
    if (resizeState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [resizeState, handleMouseMove, handleMouseUp]);

  return { resizeState, handleResizeStart, gridRef };
}
```

### 4.3 Snapping

```typescript
// grid-utils.ts
function snapToGrid(
  rawW: number,
  rawH: number,
  columns: number,
  minW = 1,
  minH = 1,
  maxW = 6,
  maxH = 8,
): { w: number; h: number } {
  return {
    w: Math.max(minW, Math.min(maxW, Math.round(rawW))),
    h: Math.max(minH, Math.min(maxH, Math.round(rawH))),
  };
}
```

### 4.4 Max-Größe begrenzen

```typescript
// Prüfe ob Widget an der rechten/unteren Grenze ist
function canResizeTo(widget: Widget, targetW: number, targetH: number, columns: number): boolean {
  // Rechte Grenze
  if (widget.x + targetW > columns) return false;
  // Untere Grenze: Prüfe ob anderes Widget im Weg
  // (wird in Kollisionsprüfung behandelt)
  return true;
}
```

---

## 5. Tailwind-Klassen

### 5.1 Grid-Container

```tsx
// DashboardGrid
className="grid gap-4 w-full relative"
// Inline style für dynamische Spaltenzahl
style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
```

### 5.2 Widget-Container (GridWidget)

```tsx
// Normaler Zustand
className={cn(
  'rounded-xl border border-border bg-bg-surface p-4',
  'flex flex-col gap-3 overflow-hidden relative group',
  'transition-all duration-200',
  // Hover-Effekte
  'hover:border-border-strong',
  // Drag-States
  isDragging && 'opacity-50 scale-95 shadow-2xl border-brand-500 z-50',
  isDropTarget && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-bg',
  // Resize-Status
  isResizing && 'ring-2 ring-brand-400',
)}
style={{
  gridColumn: `${widget.x + 1} / span ${widget.w}`,
  gridRow: `${widget.y + 1} / span ${widget.h}`,
  minHeight: getWidgetMinHeight(widget.h, cellHeight),
}}
```

### 5.3 Widget-Header

```tsx
// WidgetHeader
className={cn(
  'flex items-center gap-2 text-sm font-medium text-fg',
  'select-none', // Kein Text-Markierung beim Drag
)}
```

### 5.4 Drag-Handle

```tsx
// GripVertical Icon am Header
className={cn(
  'flex items-center justify-center',
  'w-6 h-6 rounded cursor-grab',
  'text-fg-subtle',
  'opacity-0 group-hover:opacity-100', // Nur bei Hover
  'hover:bg-bg-raised hover:text-fg',
  'active:cursor-grabbing', // Beim Klicken
  'transition-opacity duration-200',
)}
data-drag-handle  // Attribut für Touch-Filterung
```

### 5.5 Resize-Handle

```tsx
// ResizeHandle
className={cn(
  'absolute bottom-1 right-1 z-20',
  'w-6 h-6 flex items-center justify-center',
  'rounded-md cursor-se-resize',
  'text-fg-subtle opacity-0 group-hover:opacity-100',
  'hover:bg-bg-raised hover:text-fg',
  'transition-opacity duration-200',
  isResizing && 'opacity-100 text-brand-500',
)}
```

### 5.6 Settings & Delete Buttons

```tsx
// Widget-Action-Buttons (nur bei Hover)
className={cn(
  'rounded-md p-1',
  'text-fg-subtle opacity-0 group-hover:opacity-100',
  'hover:text-fg hover:bg-bg-raised',
  'transition-opacity duration-200',
)}
```

### 5.7 Drop-Indikator (Ghost-Widget)

```tsx
// Leere Grid-Zelle als Drop-Target
className={cn(
  'rounded-xl border-2 border-dashed border-border',
  'flex items-center justify-center',
  'text-fg-subtle text-xs',
  'bg-bg-surface/50',
  'transition-all duration-200',
  isOver && 'border-brand-500 bg-brand-500/10 text-brand-500',
)}
```

### 5.8 Add-Widget-Button

```tsx
// Dropdown-Trigger
className={cn(
  'rounded-md bg-brand-500 px-3 py-1.5',
  'text-sm text-white font-medium',
  'hover:bg-brand-600',
  'flex items-center gap-1.5',
  'transition-colors duration-200',
)}

// Dropdown-Menü
className={cn(
  'absolute right-0 top-full mt-2',
  'bg-bg-surface border border-border rounded-xl',
  'shadow-xl p-2 min-w-[200px]',
  'z-50',
)}
```

### 5.9 Widget-Typ-Auswahl (im Dropdown)

```tsx
// Einzelner Widget-Typ
className={cn(
  'flex items-center gap-3 w-full',
  'rounded-lg px-3 py-2',
  'text-sm text-fg',
  'hover:bg-bg-raised',
  'transition-colors duration-150',
  'cursor-pointer',
)}
```

---

## 6. TypeScript-Interfaces

### 6.1 Core Types

```typescript
// lib/grid-utils.ts

/** Erlaubte Widget-Größen */
export type WidgetSize = {
  w: number;
  h: number;
};

/** Alle erlaubten Widget-Größen-Kombinationen */
export const ALLOWED_WIDGET_SIZES: WidgetSize[] = [
  { w: 1, h: 1 },
  { w: 1, h: 2 },
  { w: 2, h: 2 },
  { w: 2, h: 3 },
  { w: 3, h: 2 },
  { w: 3, h: 3 },
  { w: 4, h: 1 },
  { w: 4, h: 2 },
  { w: 4, h: 3 },
  { w: 6, h: 1 },
  { w: 6, h: 2 },
  { w: 6, h: 3 },
  { w: 6, h: 4 },
];

/** Widget-Typ-Definition */
export type WidgetType = 'media' | 'weather' | 'calendar' | 'savings';

/** Widget mit Position und Größe */
export interface Widget {
  id: string;
  type: WidgetType;
  x: number;      // Spaltenposition (0-basiert)
  y: number;      // Zeilenposition (0-basiert)
  w: number;      // Spaltenbreite
  h: number;      // Zeilenhöhe
  config?: WidgetConfig;
}

/** Dashboard-Layout (vom Backend) */
export interface DashboardLayout {
  widgets: Widget[];
}

/** Widget-Konfiguration je Typ */
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

/** Standardgrößen pro Widget-Typ */
export const WIDGET_DEFAULT_SIZES: Record<WidgetType, WidgetSize> = {
  media: { w: 4, h: 2 },
  weather: { w: 3, h: 2 },
  calendar: { w: 3, h: 2 },
  savings: { w: 1, h: 1 },
};

/** Widget-Beschriftungen (Deutsch) */
export const WIDGET_LABELS: Record<WidgetType, string> = {
  media: 'Letzte Medien',
  weather: 'Wetter',
  calendar: 'Kalender',
  savings: 'Sparziele',
};
```

### 6.2 DnD Types

```typescript
// hooks/use-drag-and-drop.ts

export interface DragState {
  widgetId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  gridStartX: number;
  gridStartY: number;
  offsetCol: number;
  offsetRow: number;
}

export interface DropTarget {
  col: number;
  row: number;
}

export type DragAction =
  | { type: 'START'; payload: DragState }
  | { type: 'MOVE'; payload: { currentX: number; currentY: number } }
  | { type: 'END' };
```

### 6.3 Resize Types

```typescript
// hooks/use-widget-resize.ts

export interface ResizeState {
  widgetId: string;
  startW: number;
  startH: number;
  startX: number;
  startY: number;
  currentW: number;
  currentH: number;
}

export interface ResizeResult {
  w: number;
  h: number;
  isValid: boolean;
  collisionWidgets: Widget[];
}
```

### 6.4 Grid Configuration

```typescript
// lib/grid-utils.ts

export interface GridConfig {
  columns: number;
  cellGap: number;         // px
  cellMinWidth: number;    // px
  cellAspectRatio: number; // width / height
  maxRows: number;         // maximum rows
}

export const GRID_CONFIGS: Record<string, GridConfig> = {
  desktop: { columns: 6, cellGap: 16, cellMinWidth: 150, cellAspectRatio: 1, maxRows: 12 },
  tablet:  { columns: 4, cellGap: 16, cellMinWidth: 150, cellAspectRatio: 1, maxRows: 12 },
  mobile:  { columns: 2, cellGap: 16, cellMinWidth: 150, cellAspectRatio: 1, maxRows: 20 },
  small:   { columns: 1, cellGap: 16, cellMinWidth: 150, cellAspectRatio: 1, maxRows: 30 },
};
```

---

## 7. API-Integration

### 7.1 Layout laden (bestehend)

```typescript
// page.tsx (bleibt wie gehabt)
const { data: layout, isLoading, isError } = useQuery({
  queryKey: ['dashboard-layout'],
  queryKey: ['dashboard-layout'],
  queryFn: () => api.get<DashboardLayout>('/dashboard/layout'),
  staleTime: 60_000,
  enabled: !!accessToken,
});
```

### 7.2 Optimistic Updates beim Drag & Drop

```typescript
// use-dashboard-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardLayout, Widget } from '@/lib/grid-utils';

export function useDashboardMutation() {
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (layout: DashboardLayout) =>
      api.put('/dashboard/layout', layout),

    // Optimistic Update: Sofort im Cache zeigen
    onMutate: async (newLayout) => {
      await qc.cancelQueries({ queryKey: ['dashboard-layout'] });

      const previous = qc.getQueryData<DashboardLayout>(['dashboard-layout']);

      qc.setQueryData<DashboardLayout>(['dashboard-layout'], newLayout);

      return { previous };
    },

    // Bei Fehler: Rollback
    onError: (err, newLayout, context) => {
      if (context?.previous) {
        qc.setQueryData(['dashboard-layout'], context.previous);
      }
    },

    // Immer: Cache invalidieren für Konsistenz
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout'] });
    },
  });

  // Hilfsfunktionen
  const updateWidget = (updatedWidget: Widget) => {
    const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
    if (!current) return;

    const newLayout: DashboardLayout = {
      ...current,
      widgets: current.widgets.map(w =>
        w.id === updatedWidget.id ? updatedWidget : w
      ),
    };

    saveMutation.mutate(newLayout);
  };

  const moveWidget = (widgetId: string, newX: number, newY: number) => {
    const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
    if (!current) return;

    const newLayout: DashboardLayout = {
      ...current,
      widgets: current.widgets.map(w =>
        w.id === widgetId ? { ...w, x: newX, y: newY } : w
      ),
    };

    saveMutation.mutate(newLayout);
  };

  const resizeWidget = (widgetId: string, newW: number, newH: number) => {
    const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
    if (!current) return;

    const newLayout: DashboardLayout = {
      ...current,
      widgets: current.widgets.map(w =>
        w.id === widgetId ? { ...w, w: newW, h: newH } : w
      ),
    };

    saveMutation.mutate(newLayout);
  };

  const addWidget = (type: WidgetType) => {
    const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
    if (!current) return;

    const defaultSize = WIDGET_DEFAULT_SIZES[type];
    const position = findFreePosition(current.widgets, defaultSize.w, defaultSize.h, 6);

    const newWidget: Widget = {
      id: crypto.randomUUID(),
      type,
      x: position.x,
      y: position.y,
      w: defaultSize.w,
      h: defaultSize.h,
      config: defaultConfig(type),
    };

    const newLayout: DashboardLayout = {
      ...current,
      widgets: [...current.widgets, newWidget],
    };

    saveMutation.mutate(newLayout);
  };

  const removeWidget = (widgetId: string) => {
    const current = qc.getQueryData<DashboardLayout>(['dashboard-layout']);
    if (!current) return;

    const newLayout: DashboardLayout = {
      ...current,
      widgets: current.widgets.filter(w => w.id !== widgetId),
    };

    saveMutation.mutate(newLayout);
  };

  return {
    saveMutation,
    updateWidget,
    moveWidget,
    resizeWidget,
    addWidget,
    removeWidget,
  };
}
```

### 7.3 Freie Position finden

```typescript
// grid-utils.ts
function findFreePosition(
  widgets: Widget[],
  w: number,
  h: number,
  columns: number,
): { x: number; y: number } {
  // Erstelle Belegungskarte
  const occupied = new Set<string>();

  for (const widget of widgets) {
    for (let r = widget.y; r < widget.y + widget.h; r++) {
      for (let c = widget.x; c < widget.x + widget.w; c++) {
        occupied.add(`${c},${r}`);
      }
    }
  }

  // Suche erste freie Position (von oben links, zeilenweise)
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= columns - w; x++) {
      let fits = true;
      for (let r = y; r < y + h && fits; r++) {
        for (let c = x; c < x + w && fits; c++) {
          if (occupied.has(`${c},${r}`)) fits = false;
        }
      }
      if (fits) return { x, y };
    }
  }

  // Fallback: Ganz unten
  const maxY = Math.max(0, ...widgets.map(w => w.y + w.h));
  return { x: 0, y: maxY };
}
```

### 7.4 Debounced Persistence

```typescript
// Beim Drag & Drop: NICHT sofort persistieren, sondern debounced
import { debounce } from '@/lib/debounce';

const debouncedSave = debounce((layout: DashboardLayout) => {
  saveMutation.mutate(layout);
}, 500);

// Im onDrop-Handler:
const handleDrop = (newWidgets: Widget[]) => {
  qc.setQueryData(['dashboard-layout'], { widgets: newWidgets });
  debouncedSave({ widgets: newWidgets });
};
```

---

## 8. State-Management

### 8.1 State-Verteilung

| State-Typ | Speicherort | Begründung |
|-----------|-------------|------------|
| Widget-Layout (x,y,w,h) | TanStack Query Cache | Server-Quelle, geteilt |
| Widget-Config (pro Widget) | TanStack Query Cache | Server-Quelle |
| Drag-State (laufender Drag) | React useState (DashboardGrid) | Lokal, transient |
| Resize-State (laufendes Resize) | React useState (DashboardGrid) | Lokal, transient |
| Drop-Target (visueller Indikator) | React useState (DashboardGrid) | Lokal, transient |
| Settings-Panel offen | React useState (GridWidget) | Lokal pro Widget |
| Auth-State | Zustand (useAuthStore) | Global, persistent |
| Responsive Breakpoint | Custom Hook mit ResizeObserver | Lokal in DashboardGrid |

### 8.2 Hook-Verteilung

```tsx
// DashboardGrid.tsx — Zusammenführung aller Hooks
'use client';

import { useGridLayout } from '@/hooks/use-grid-layout';
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';
import { useWidgetResize } from '@/hooks/use-widget-resize';
import { useDashboardMutation } from '@/hooks/use-dashboard-mutation';

interface DashboardGridProps {
  layout: DashboardLayout;
}

export function DashboardGrid({ layout }: DashboardGridProps) {
  const { columns, cellHeight, gridRef } = useGridLayout();
  const { moveWidget, resizeWidget, addWidget, removeWidget } = useDashboardMutation();

  const {
    dragState,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  } = useDragAndDrop(layout.widgets, columns, cellHeight, moveWidget);

  const {
    resizeState,
    handleResizeStart,
  } = useWidgetResize(layout.widgets, resizeWidget, columns, cellHeight);

  return (
    <div ref={gridRef} className={gridClasses} style={gridStyle}>
      {layout.widgets.map(widget => (
        <GridWidget
          key={widget.id}
          widget={widget}
          isDragging={dragState?.widgetId === widget.id}
          isResizing={resizeState?.widgetId === widget.id}
          onDragStart={handleDragStart}
          onResizeStart={handleResizeStart}
          onSettings={() => openSettings(widget.id)}
          onRemove={() => removeWidget(widget.id)}
        />
      ))}

      {/* Drop-Indikator */}
      {dragState && dropTarget && (
        <div className="drop-indicator" style={dropIndicatorStyle} />
      )}
    </div>
  );
}
```

---

## 9. Edge Cases

### 9.1 Leeres Layout

**Verhalten:** Dashboard zeigt eine Einladung an:

```tsx
{widgets.length === 0 && (
  <div className="flex flex-col items-center justify-center h-64 text-fg-muted gap-3">
    <LayoutGrid className="h-12 w-12 opacity-30" />
    <p className="text-lg">Noch keine Widgets konfiguriert</p>
    <p className="text-sm">Füge dein erstes Widget hinzu, um loszulegen.</p>
    <button onClick={() => addWidget('weather')} className="...">
      Widget hinzufügen
    </button>
  </div>
)}
```

### 9.2 Ein Widget

**Verhalten:** Widget wird allein im Grid angezeigt, kein DnD nötig (aber verfügbar).

### 9.3 Viele Widgets (Überlauf)

**Verhalten:**
- Widgets werden zeilenweise angeordnet
- Scrollen nach unten bei mehr als ~12 Widgets
- Keine horizontale Überfüllung (max 6 Spalten)

### 9.4 Mobile (< 768px)

**Verhalten:**
- 2 Spalten (oder 1 bei < 480px)
- Widgets werden schmaler, behalten aber Seitenverhältnis
- Drag-Handle immer sichtbar (kein Hover auf Touch)
- Touch-DnD über `touchstart`, `touchmove`, `touchend`
- Resize-Handle tap-to-resize (alternativ: Modal mit Größenauswahl)

### 9.5 Browser-Kompatibilität

- HTML5 DnD: Alle modernen Browser (Chrome, Firefox, Safari, Edge)
- Touch-Events: iOS Safari, Android Chrome
- `dataTransfer.setData()`: Nur 'text/plain' (Sicherheit)
- `effectAllowed` / `dropEffect`: Korrekte Werte für visuelles Feedback

### 9.6 Kollision bei Resize

**Verhalten:** Resize wird blockiert (nicht abgeschnitten), wenn ein anderes Widget im Weg ist. Das Widget behält seine Größe.

### 9.7 Ungültige Position nach Drop

**Verhalten:** `normalizeLayout()` schließt Lücken und verschiebt Widgets nach oben, wenn möglich.

### 9.8 Schnelles Drag & Drop

**Verhalten:** Debounced Persistence (500ms) verhindert mehrfache API-Aufrufe bei schnellen Aktionen.

---

## 10. Phase-2-Ausgrenzungen

Diese Features werden **NICHT** in Phase 1 implementiert:

| Feature | Begründung | Phase |
|---------|-----------|-------|
| Minimieren/Vollbild | Optional, geringer Mehrwert | Phase 2 |
| Grid-Layout-Vorschau (Template) | Komplexe UX, nicht MVP | Phase 2 |
| Drag & Drop zwischen Spalten-Modi (2→6) | Automatisch per CSS, kein manueller Wechsel | — |
| Snap-to-Grid-Animation (fließend) | Visuell nice, aber nicht funktional | Phase 2 |
| Undo/Redo für Layout | Komplexität hoch | Phase 2 |
| Widget-Cloning | Kein Use-Case aktuell | Phase 2 |
| Multi-Select & Batch-Move | Komplexität hoch | Phase 2 |
| Keyboard-Navigation (Pfeiltasten) | Barrierefreiheit, Phase 2 | Phase 2 |
| Layout-Import/Export | Für Power-User, nicht MVP | Phase 2 |
| Animierte Grid-Übergänge | Visuell nice, Performance-Risiko | Phase 2 |

---

## Appendix A: Responsive Breakpoint-Verhalten

```
Desktop (≥1024px):     [W1][W2][W3][W4][W5][W6]  ← 6 Spalten
                       [  Widget 4×2  ][  2×2  ]
                       [1×1][1×1][1×1][  3×2  ]

Tablet (768-1023px):   [W1][W2][W3][W4]  ← 4 Spalten
                       [   Widget 4×2   ]
                       [  2×2  ][  2×2  ]

Mobile (480-767px):    [W1][W2]  ← 2 Spalten
                       [ Widget 2×2 ]
                       [1×1][1×1]

Small (<480px):        [W1]  ← 1 Spalte
                       [ Widget 1×1 ]
                       [1×1]
```

## Appendix B: Widget-Größen-Matrix

```
     ┌─────────────────────────────────────────────────┐
     │ 1×1 │ 1×2 │ 2×2 │ 2×3 │ 3×2 │ 3×3 │ 4×1 │ ...│
  w→ │  ●  │  ●  │  ●  │  ●  │  ●  │  ●  │  ●  │    │
  h  │     │     │     │     │     │     │     │    │
  ↓  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤    │
   1 │  ✓  │     │     │     │     │     │  ✓  │    │
   2 │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │ ...│
   3 │     │     │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │    │
   4 │     │     │     │     │     │     │  ✓  │    │
     └─────────────────────────────────────────────────┘

     Erlaubt: 13 Kombinationen
     Max bei 6 Spalten: w ≤ 6, h ≤ 4 (begrenzt durch Platz)
```

## Appendix C: Datei-Implementierungs-Reihenfolge

1. `lib/grid-utils.ts` — Pure Functions, keine React-Abhängigkeit
2. `hooks/use-grid-layout.ts` — Responsive Hook
3. `components/ResizeHandle.tsx` — Kleinste UI-Komponente
4. `components/WidgetHeader.tsx` — Drag-Handle + Actions
5. `components/GridWidget.tsx` — Widget-Wrapper
6. `components/EmptyGridCell.tsx` — Drop-Target
7. `hooks/use-drag-and-drop.ts` — DnD-Logik
8. `hooks/use-widget-resize.ts` — Resize-Logik
9. `hooks/use-dashboard-mutation.ts` — API-Integration
10. `components/DashboardGrid.tsx` — Orchestrator
11. `components/AddWidgetButton.tsx` — Dropdown
12. `app/(dashboard)/dashboard/page.tsx` — Refactor

---

**Ende des Design-Dokuments**
