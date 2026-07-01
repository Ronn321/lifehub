'use client';

import { useEffect, useState } from 'react';
import { useGridStore } from '@/stores/grid-store';
import { useGridInteraction } from '@/hooks/use-grid-interaction';
import { getResponsiveColumns, GRID_GAP } from '@/lib/grid-utils';
import type { Widget } from '@/lib/grid-utils';
import { DashboardWidget } from './dashboard-widget';
import { DropIndicator } from './drop-indicator';
import { ResizePreview } from './resize-preview';

interface DashboardGridProps {
  widgets: Widget[];
  onLayoutChange: (widgets: Widget[]) => void;
  onDelete: (id: string) => void;
  onConfigChange: (id: string, config: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function DashboardGrid({
  widgets,
  onLayoutChange,
  onDelete,
  onConfigChange,
  isSaving,
}: DashboardGridProps) {
  const columns = useGridStore((s) => s.columns);
  const setColumns = useGridStore((s) => s.setColumns);
  const dragActiveId = useGridStore((s) => s.dragActiveId);
  const resizeActiveId = useGridStore((s) => s.resizeActiveId);
  const resizeCurrent = useGridStore((s) => s.resizeCurrent);

  const [containerWidth, setContainerWidth] = useState(1024);
  const [gridCols, setGridCols] = useState(6);

  const {
    gridRef,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleResizeStart,
  } = useGridInteraction({
    widgets,
    columns: gridCols,
    onLayoutChange,
  });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const first = entries[0];
      if (!first) return;
      const width = first.contentBoxSize?.[0]?.inlineSize ?? first.contentRect.width;
      setContainerWidth(width);
      const cols = getResponsiveColumns(width);
      setGridCols(cols);
      setColumns(cols);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [gridRef, setColumns]);

  return (
    <div
      ref={gridRef}
      className="dashboard-grid relative w-full"
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: `${GRID_GAP}px`,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {dragActiveId && (
        <DropIndicator
          isOver
          w={widgets.find((w) => w.id === dragActiveId)?.w ?? 1}
          h={widgets.find((w) => w.id === dragActiveId)?.h ?? 1}
          x={0}
          y={999}
          columns={gridCols}
        />
      )}

      {/* Resize preview — snapped size while dragging handle */}
      {resizeActiveId && (() => {
        const resizingWidget = widgets.find((w) => w.id === resizeActiveId);
        if (!resizingWidget) return null;
        return (
          <ResizePreview
            widgetX={resizingWidget.x}
            widgetY={resizingWidget.y}
            previewW={resizeCurrent.w}
            previewH={resizeCurrent.h}
            columns={gridCols}
          />
        );
      })()}

      {widgets.map((widget) => (
        <DashboardWidget
          key={widget.id}
          widget={widget}
          isDragging={dragActiveId === widget.id}
          isResizing={resizeActiveId === widget.id}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onResizeStart={handleResizeStart}
          onDelete={onDelete}
          onConfigChange={onConfigChange}
        />
      ))}

      {isSaving && (
        <div className="fixed bottom-4 right-4 z-40 text-xs text-fg-muted bg-bg-surface border border-border rounded-lg px-3 py-1.5 shadow-lg animate-fade-in">
          Speichere…
        </div>
      )}
    </div>
  );
}
