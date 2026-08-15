'use client';

import { X, Plus, Trash2, ChevronUp, ChevronDown, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Widget, WidgetType } from '@/lib/grid-utils';
import { WIDGET_LABELS, cycleWidgetSize } from '@/lib/grid-utils';
import type { DashboardProfile } from '@/lib/dashboard-profiles';
import { WIDGET_ICONS } from './widget-content';

const ADDABLE_TYPES: WidgetType[] = ['media', 'weather', 'calendar', 'savings'];

interface WidgetEditorDialogProps {
  open: boolean;
  onClose: () => void;
  widgets: Widget[];
  profile: DashboardProfile | null;
  onReorder: (widgets: Widget[]) => void;
  onDelete: (id: string) => void;
  onSetSize: (id: string, w: number, h: number) => void;
  onAdd: (type: WidgetType) => void;
  onReset: () => void;
}

function move(arr: Widget[], from: number, to: number): Widget[] {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as Widget);
  return next;
}

export function WidgetEditorDialog({
  open, onClose, widgets, profile, onReorder, onDelete, onSetSize, onAdd, onReset,
}: WidgetEditorDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={cn(
          'flex max-h-[85vh] w-[min(90vw,720px)] flex-col gap-2 rounded-2xl border',
          'bg-bg-surface border-border p-6 shadow-2xl overflow-hidden',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Widgets verwalten</h2>
          <button onClick={onClose} aria-label="Schließen"
            className="rounded-lg border border-border-strong px-2 py-1.5 hover:bg-bg-raised">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {widgets.map((w, i) => (
            <div key={w.id} className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5">
              {WIDGET_ICONS[w.type]}
              <span className="flex-1 text-sm font-medium">{WIDGET_LABELS[w.type]}</span>
              <span className="text-xs text-fg-muted">
                {w.w}×{w.h}
              </span>
              <button
                onClick={() => {
                  if (!profile) return;
                  const next = cycleWidgetSize({ w: w.w, h: w.h }, profile, w.type);
                  onSetSize(w.id, next.w, next.h);
                }}
                aria-label="Größe ändern"
                className="rounded-lg border border-border-strong px-2 py-1.5 hover:bg-bg-raised"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onReorder(move(widgets, i, i - 1))}
                disabled={i === 0}
                aria-label="Nach oben"
                className="rounded-lg border border-border-strong px-2 py-1.5 hover:bg-bg-raised disabled:opacity-40"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => onReorder(move(widgets, i, i + 1))}
                disabled={i === widgets.length - 1}
                aria-label="Nach unten"
                className="rounded-lg border border-border-strong px-2 py-1.5 hover:bg-bg-raised disabled:opacity-40"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(w.id)}
                aria-label="Entfernen"
                className="rounded-lg border border-border-strong px-2 py-1.5 text-red-500 hover:bg-bg-raised"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ADDABLE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onAdd(t)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              {WIDGET_LABELS[t]}
            </button>
          ))}
          <button
            onClick={onReset}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-sm hover:bg-bg-raised"
          >
            <RotateCcw className="h-4 w-4" />
            Standard-Layout
          </button>
        </div>
      </div>
    </div>
  );
}
