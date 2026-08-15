'use client';

import { GripVertical, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { WIDGET_LABELS } from '@/lib/grid-utils';
import type { Widget } from '@/lib/grid-utils';

interface WidgetHeaderProps {
  widget: Widget;
  icon: React.ReactNode;
  onSettingsOpen: (id: string) => void;
  onDelete: (id: string) => void;
  showDelete?: boolean;
}

export function WidgetHeader({ widget, icon, onSettingsOpen, onDelete, showDelete = true }: WidgetHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-0 shrink-0">
      <button
        className={cn(
          'drag-handle cursor-grab active:cursor-grabbing',
          'rounded p-0.5 text-fg-subtle',
          'opacity-0 group-hover/widget:opacity-100',
          'hover:text-fg hover:bg-bg-raised',
          'transition-opacity duration-150',
          'touch-none',
        )}
        data-drag-handle
        title="Zum Verschieben ziehen"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-medium text-fg truncate">
          {WIDGET_LABELS[widget.type] ?? widget.type}
        </span>
      </div>

      <button
        onClick={() => onSettingsOpen(widget.id)}
        className={cn(
          'rounded-md p-1 text-fg-subtle',
          'opacity-0 group-hover/widget:opacity-100',
          'hover:text-fg hover:bg-bg-raised',
          'transition-opacity duration-150',
        )}
        title="Widget-Einstellungen"
      >
        <Settings className="h-4 w-4" />
      </button>

      {showDelete && (
        <button
          onClick={() => onDelete(widget.id)}
          className={cn(
            'rounded-md p-1 text-fg-subtle',
            'opacity-0 group-hover/widget:opacity-100',
            'hover:text-danger hover:bg-danger/10',
            'transition-opacity duration-150',
          )}
          title="Widget entfernen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
