'use client';

import { cn } from '@/lib/cn';
import { MIN_ROW_HEIGHT } from '@/lib/grid-utils';

interface DropIndicatorProps {
  isOver: boolean;
  w: number;
  h: number;
  x: number;
  y: number;
  columns: number;
}

export function DropIndicator({ isOver, w, h, x, y, columns }: DropIndicatorProps) {
  const clampedW = Math.min(w, columns);

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-dashed transition-colors duration-150 pointer-events-none z-10',
        isOver
          ? 'border-brand-500/50 bg-brand-500/5'
          : 'border-border bg-bg-raised/30',
      )}
      style={{
        gridColumn: `${x + 1} / span ${clampedW}`,
        gridRow: `${y + 1} / span ${h}`,
        minHeight: `${h * MIN_ROW_HEIGHT}px`,
      }}
    >
      <div className="flex items-center justify-center h-full text-xs text-fg-subtle">
        {isOver && <span>Widget hier ablegen</span>}
      </div>
    </div>
  );
}
