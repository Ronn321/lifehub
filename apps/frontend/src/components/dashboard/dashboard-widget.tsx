'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { MIN_ROW_HEIGHT, defaultConfig } from '@/lib/grid-utils';
import type { Widget, WidgetConfig } from '@/lib/grid-utils';
import { clampWidgetToProfile } from '@/lib/dashboard-profiles';
import type { DashboardProfile } from '@/lib/dashboard-profiles';
import {
  WIDGET_ICONS,
  CalendarWidget,
  WeatherWidget,
  MediaWidget,
  SavingsWidget,
  SettingsPanel,
  WidgetSettingsContent,
} from './widget-content';
import { WidgetHeader } from './widget-header';
import { WidgetResizeHandle } from './widget-resize-handle';

interface DashboardWidgetProps {
  widget: Widget;
  isDragging: boolean;
  isResizing: boolean;
  onDragStart: ((e: React.DragEvent, widget: Widget) => void) | undefined;
  onDragEnd: ((e: React.DragEvent) => void) | undefined;
  onResizeStart: ((e: React.MouseEvent | React.TouchEvent, widgetId: string) => void) | undefined;
  onDelete: (id: string) => void;
  onConfigChange: (id: string, config: Record<string, unknown>) => void;
  editMode: boolean;
  profile: DashboardProfile | null;
  columns: number;
}

function parseConfig<T extends WidgetConfig>(widget: Widget, fallback: T): T {
  return { ...fallback, ...(widget.config as Partial<T>) } as T;
}

export function DashboardWidget({
  widget,
  isDragging,
  isResizing,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onDelete,
  onConfigChange,
  editMode,
  profile,
  columns,
}: DashboardWidgetProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cfg = parseConfig(widget, defaultConfig(widget.type) as never);

  const handleSettingsOpen = () => setSettingsOpen(true);

  const handleConfigChange = (newConfig: WidgetConfig) => {
    // Keep the settings panel open — it closes only via "Fertig" or outside click
    onConfigChange(widget.id, newConfig as Record<string, unknown>);
  };

  const content = (() => {
    switch (widget.type) {
      case 'weather':
        return (
          <WeatherWidget
            config={cfg as import('@/lib/grid-utils').WeatherConfig}
            onConfigChange={(c) => onConfigChange(widget.id, c as unknown as Record<string, unknown>)}
          />
        );
      case 'media':
        return <MediaWidget config={cfg as import('@/lib/grid-utils').MediaConfig} />;
      case 'calendar':
        return <CalendarWidget config={cfg as import('@/lib/grid-utils').CalendarConfig} onNavigate={() => router.push('/calendar')} />;
      case 'savings':
        return <SavingsWidget />;
      default:
        return <div className="text-sm text-fg-muted">Unbekanntes Widget</div>;
    }
  })();

  // Rendering klemmt auf Profil-Regeln (Mindestgrößen, Spaltenmaximum, x-Rand).
  const clamped = profile ? clampWidgetToProfile(widget, profile) : widget;
  const w = Math.min(clamped.w, columns);
  const x = Math.min(clamped.x, columns - w);
  const h = clamped.h;

  return (
    <div
      className={cn(
        'group/widget relative rounded-xl border',
        'bg-bg-surface border-border',
        'flex flex-col overflow-hidden',
        'transition-all duration-200 ease-in-out',
        isDragging && 'opacity-30 scale-[1.02] rotate-[1deg] shadow-2xl',
        isResizing && 'ring-2 ring-[var(--lh-accent)]',
      )}
      style={{
        gridColumn: `${x + 1} / span ${w}`,
        gridRow: `${widget.y + 1} / span ${h}`,
        minHeight: `${h * MIN_ROW_HEIGHT}px`,
      }}
      draggable={editMode}
      onDragStart={editMode && onDragStart ? (e) => onDragStart(e, widget) : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
    >
      <WidgetHeader
        widget={widget}
        icon={WIDGET_ICONS[widget.type]}
        onSettingsOpen={handleSettingsOpen}
        onDelete={onDelete}
        showDelete={editMode}
      />

      <div className="flex-1 min-h-0 px-4 pb-4 pt-2">
        {content}
      </div>

      {editMode && (
        <WidgetResizeHandle
          onResizeStart={(e) => onResizeStart?.(e, widget.id)}
          isResizing={isResizing}
        />
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={`${widget.type.charAt(0).toUpperCase() + widget.type.slice(1)} — Einstellungen`}
      >
        <WidgetSettingsContent
          widget={widget}
          config={cfg}
          onConfigChange={handleConfigChange}
        />
      </SettingsPanel>
    </div>
  );
}
