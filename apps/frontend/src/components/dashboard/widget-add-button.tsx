'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { WidgetType } from '@/lib/grid-utils';
import { WIDGET_LABELS } from '@/lib/grid-utils';
import { WIDGET_ICONS } from './widget-content';

const ADDABLE_TYPES: { type: WidgetType; description: string }[] = [
  { type: 'media', description: 'Foto-Diashow aus Alben' },
  { type: 'weather', description: 'Aktuelles Wetter + Vorhersage' },
  { type: 'calendar', description: 'Monatskalender' },
  { type: 'savings', description: 'Sparziele-Übersicht (Demo)' },
];

interface WidgetAddButtonProps {
  onAdd: (type: WidgetType) => void;
  visible?: boolean;
}

export function WidgetAddButton({ onAdd, visible = true }: WidgetAddButtonProps) {
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  return (
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
          {ADDABLE_TYPES.map(({ type, description }) => (
            <button
              key={type}
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5',
                'text-sm text-fg hover:bg-bg-raised',
                'transition-colors duration-100',
              )}
            >
              {WIDGET_ICONS[type]}
              <div className="flex flex-col items-start">
                <span>{WIDGET_LABELS[type]}</span>
                <span className="text-xs text-fg-subtle">{description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
