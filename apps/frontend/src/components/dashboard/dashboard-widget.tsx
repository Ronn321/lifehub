'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { MIN_ROW_HEIGHT, defaultConfig } from '@/lib/grid-utils';
import type { Widget, WidgetConfig } from '@/lib/grid-utils';
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
  onDragStart: (e: React.DragEvent, widget: Widget) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, widgetId: string) => void;
  onDelete: (id: string) => void;
  onConfigChange: (id: string, config: Record<string, unknown>) => void;
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
}: DashboardWidgetProps) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cfg = parseConfig(widget, defaultConfig(widget.type) as never);

  const handleSettingsOpen = () => setSettingsOpen(true);

  const handleConfigChange = (newConfig: WidgetConfig) => {
    onConfigChange(widget.id, newConfig as Record<string, unknown>);
    setSettingsOpen(false);
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

  const clampedW = Math.min(widget.w, 6);
  const clampedX = Math.min(widget.x, 6 - clampedW);

  return (
    <div
      className={cn(
        'group/widget relative rounded-xl border',
        'bg-bg-surface border-border',
        'flex flex-col overflow-hidden',
        'transition-all duration-200 ease-in-out',
        isDragging && 'opacity-30 scale-[1.02] rotate-[1deg] shadow-2xl',
        isResizing && 'ring-2 ring-brand-400',
      )}
      style={{
        gridColumn: `${clampedX + 1} / span ${clampedW}`,
        gridRow: `${widget.y + 1} / span ${widget.h}`,
        minHeight: `${widget.h * MIN_ROW_HEIGHT}px`,
      }}
      draggable
      onDragStart={(e) => onDragStart(e, widget)}
      onDragEnd={onDragEnd}
    >
      <WidgetHeader
        widget={widget}
        icon={WIDGET_ICONS[widget.type]}
        onSettingsOpen={handleSettingsOpen}
        onDelete={onDelete}
      />

      <div className="flex-1 min-h-0 px-4 pb-4 pt-2">
        {content}
      </div>

      <WidgetResizeHandle
        onResizeStart={(e) => onResizeStart(e, widget.id)}
        isResizing={isResizing}
      />

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
