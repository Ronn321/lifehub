'use client';

import { cn } from '@/lib/cn';

interface WidgetResizeHandleProps {
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
  isResizing: boolean;
}

export function WidgetResizeHandle({ onResizeStart, isResizing }: WidgetResizeHandleProps) {
  return (
    <div
      className={cn(
        'absolute bottom-0 right-0 z-20',
        'w-7 h-7',
        'cursor-se-resize',
        'opacity-40 hover:opacity-100',
        'transition-opacity duration-150',
        'flex items-end justify-end',
        'rounded-tl-md',
        'bg-fg-muted/10 hover:bg-fg-muted/20',
        'touch-none',
        isResizing && 'opacity-100',
      )}
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-fg-muted mr-0.5 mb-0.5" aria-hidden="true">
        <line x1="4" y1="14" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="14" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="14" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
