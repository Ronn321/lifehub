'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useGridStore } from '@/stores/grid-store';
import {
  snapToAllowedSize,
  resolveCollision,
  normalizeLayout,
  GRID_GAP,
  MIN_ROW_HEIGHT,
} from '@/lib/grid-utils';
import type { Widget } from '@/lib/grid-utils';

interface DragInfo {
  id: string;
  origX: number;
  origY: number;
  startClientX: number;
  startClientY: number;
  dropX: number;
  dropY: number;
}

interface ResizeInfo {
  id: string;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  currentW: number;
  currentH: number;
}

interface UseGridInteractionOptions {
  widgets: Widget[];
  columns: number;
  onLayoutChange: (widgets: Widget[]) => void;
}

export function useGridInteraction(options: UseGridInteractionOptions) {
  const { widgets, columns, onLayoutChange } = options;
  const gridRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<DragInfo | null>(null);
  const resizeInfo = useRef<ResizeInfo | null>(null);

  const setDragActive = useGridStore((s) => s.setDragActive);
  const setDragOver = useGridStore((s) => s.setDragOver);
  const setResizeActive = useGridStore((s) => s.setResizeActive);
  const clearAll = useGridStore((s) => s.clearAll);
  const storeColumns = useGridStore((s) => s.columns);

  const pixelToGrid = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const cellWidth = (rect.width - (columns - 1) * GRID_GAP) / columns;
      const cellStep = MIN_ROW_HEIGHT + GRID_GAP;
      const col = Math.floor(relX / (cellWidth + GRID_GAP));
      const row = Math.floor(relY / cellStep);
      return {
        x: Math.max(0, Math.min(col, columns - 1)),
        y: Math.max(0, row),
      };
    },
    [columns],
  );

  // ─── HTML5 Drag & Drop ───

  const handleDragStart = useCallback(
    (e: React.DragEvent, widget: Widget) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', widget.id);
      (e.currentTarget as HTMLElement).classList.add('dragging');
      dragInfo.current = {
        id: widget.id,
        origX: widget.x,
        origY: widget.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
        dropX: widget.x,
        dropY: widget.y,
      };
      setDragActive(widget.id);
    },
    [setDragActive],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragInfo.current) return;
      e.dataTransfer.dropEffect = 'move';

      const pos = pixelToGrid(e.clientX, e.clientY);
      dragInfo.current.dropX = pos.x;
      dragInfo.current.dropY = pos.y;

      const over = widgets.find(
        (w) =>
          w.id !== dragInfo.current!.id &&
          pos.x >= w.x &&
          pos.x < w.x + w.w &&
          pos.y >= w.y &&
          pos.y < w.y + w.h,
      );
      setDragOver(over?.id ?? null);
    },
    [pixelToGrid, widgets, setDragOver],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragInfo.current) return;

      const dragged = widgets.find((w) => w.id === dragInfo.current!.id);
      if (!dragged) {
        dragInfo.current = null;
        clearAll();
        return;
      }

      const pos = pixelToGrid(e.clientX, e.clientY);
      const resolved = resolveCollision(
        dragged.id,
        pos.x,
        pos.y,
        dragged.w,
        dragged.h,
        widgets,
        columns,
      );
      onLayoutChange(resolved);
      dragInfo.current = null;
      clearAll();

      (e.currentTarget as HTMLElement)
        .querySelector('.dragging')
        ?.classList.remove('dragging');
    },
    [pixelToGrid, widgets, columns, onLayoutChange, clearAll],
  );

  const handleDragEnd = useCallback(() => {
    dragInfo.current = null;
    clearAll();
    document.querySelectorAll('.dragging').forEach((el) => {
      el.classList.remove('dragging');
    });
  }, [clearAll]);

  // ─── Touch Drag & Drop ───

  const touchGhost = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, widget: Widget) => {
      if (!(e.target as HTMLElement).closest('[data-drag-handle]')) return;
      e.preventDefault();

      const touch = e.touches[0];
      if (!touch) return;
      const el = e.currentTarget as HTMLElement;
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.style.position = 'fixed';
      ghost.style.width = `${el.offsetWidth}px`;
      ghost.style.opacity = '0.85';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '9999';
      ghost.style.transform = 'rotate(1deg) scale(1.02)';
      ghost.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      ghost.style.borderRadius = '0.75rem';
      document.body.appendChild(ghost);
      touchGhost.current = ghost;

      dragInfo.current = {
        id: widget.id,
        origX: widget.x,
        origY: widget.y,
        startClientX: touch.clientX,
        startClientY: touch.clientY,
        dropX: widget.x,
        dropY: widget.y,
      };
      setDragActive(widget.id);
    },
    [setDragActive],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragInfo.current || !touchGhost.current) return;
      e.preventDefault();

      const touch = e.touches[0];
      if (!touch || !touchGhost.current) return;
      touchGhost.current.style.left = `${touch.clientX - touchGhost.current.offsetWidth / 2}px`;
      touchGhost.current.style.top = `${touch.clientY - touchGhost.current.offsetHeight / 2}px`;

      const pos = pixelToGrid(touch.clientX, touch.clientY);
      dragInfo.current.dropX = pos.x;
      dragInfo.current.dropY = pos.y;

      const over = widgets.find(
        (w) =>
          w.id !== dragInfo.current!.id &&
          pos.x >= w.x &&
          pos.x < w.x + w.w &&
          pos.y >= w.y &&
          pos.y < w.y + w.h,
      );
      setDragOver(over?.id ?? null);
    },
    [pixelToGrid, widgets, setDragOver],
  );

  const handleTouchEnd = useCallback(() => {
    if (!dragInfo.current) return;

    const dragged = widgets.find((w) => w.id === dragInfo.current!.id);
    if (dragged) {
      const pos = {
        x: dragInfo.current.dropX,
        y: dragInfo.current.dropY,
      };
      const resolved = resolveCollision(
        dragged.id,
        pos.x,
        pos.y,
        dragged.w,
        dragged.h,
        widgets,
        columns,
      );
      onLayoutChange(resolved);
    }

    if (touchGhost.current) {
      document.body.removeChild(touchGhost.current);
      touchGhost.current = null;
    }
    dragInfo.current = null;
    clearAll();
  }, [widgets, columns, onLayoutChange, clearAll]);

  useEffect(() => {
    if (dragInfo.current) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [handleTouchMove, handleTouchEnd, dragInfo.current]);

  // ─── Resize (Mouse + Touch) ───

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, widgetId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const widget = widgets.find((w) => w.id === widgetId);
      if (!widget) return;

      let clientX: number;
      let clientY: number;
      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      resizeInfo.current = {
        id: widgetId,
        startX: clientX,
        startY: clientY,
        startW: widget.w,
        startH: widget.h,
        currentW: widget.w,
        currentH: widget.h,
      };
      setResizeActive(widgetId, { w: widget.w, h: widget.h });
      document.body.style.cursor = 'se-resize';
      document.body.style.userSelect = 'none';

      const rect = gridRef.current?.getBoundingClientRect();
      const cellWidth = rect ? (rect.width - (columns - 1) * GRID_GAP) / columns : 150;
      const cellStep = MIN_ROW_HEIGHT + GRID_GAP;

      const handleMove = (me: MouseEvent | TouchEvent) => {
        let mx: number;
        let my: number;
        if ('touches' in me) {
          const touch = me.touches[0];
          if (!touch) return;
          mx = touch.clientX;
          my = touch.clientY;
        } else {
          mx = me.clientX;
          my = me.clientY;
        }
        if (!resizeInfo.current) return;

        const deltaX = mx - resizeInfo.current.startX;
        const deltaY = my - resizeInfo.current.startY;

        let newW = Math.round(resizeInfo.current.startW + deltaX / cellWidth);
        let newH = Math.round(resizeInfo.current.startH + deltaY / cellStep);

        newW = Math.max(1, Math.min(storeColumns, newW));
        newH = Math.max(1, Math.min(4, newH));

        const snapped = snapToAllowedSize(newW, newH);
        resizeInfo.current.currentW = snapped.w;
        resizeInfo.current.currentH = snapped.h;
        setResizeActive(widgetId, snapped);
      };

      const handleEnd = () => {
        if (resizeInfo.current) {
          const { id, currentW, currentH } = resizeInfo.current;

          const clamped = snapToAllowedSize(
            Math.max(1, Math.min(storeColumns, currentW)),
            Math.max(1, Math.min(4, currentH)),
          );

          const updated = widgets.map((w) =>
            w.id === id ? { ...w, w: clamped.w, h: clamped.h } : w,
          );
          const normalized = normalizeLayout(updated, columns);
          onLayoutChange(normalized);
        }
        resizeInfo.current = null;
        setResizeActive(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    },
    [widgets, columns, storeColumns, onLayoutChange, setResizeActive],
  );

  return {
    gridRef,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleResizeStart,
    dragInfo,
    resizeInfo,
  };
}
