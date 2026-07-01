'use client';

import { cn } from '@/lib/cn';
import { MIN_ROW_HEIGHT } from '@/lib/grid-utils';

interface ResizePreviewProps {
  widgetX: number;
  widgetY: number;
  previewW: number;
  previewH: number;
  columns: number;
}

export function ResizePreview({
  widgetX,
  widgetY,
  previewW,
  previewH,
  columns,
}: ResizePreviewProps) {
  const clampedW = Math.min(previewW, columns);

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-dashed border-brand-500/60',
        'bg-brand-500/10',
        'pointer-events-none z-20',
        'transition-none',
      )}
      style={{
        gridColumn: `${widgetX + 1} / span ${clampedW}`,
        gridRow: `${widgetY + 1} / span ${previewH}`,
        minHeight: `${previewH * MIN_ROW_HEIGHT}px`,
      }}
    >
      {/* Size label */}
      <div className="absolute top-2 right-2 rounded-md bg-brand-500/80 px-2 py-0.5 text-[10px] font-medium text-white shadow">
        {previewW}×{previewH}
      </div>
    </div>
  );
}
