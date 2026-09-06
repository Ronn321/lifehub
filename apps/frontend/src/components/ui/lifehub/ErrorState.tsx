'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

// Route-level failure view backing the error.tsx boundaries (UI-014).
// Renders error.message when present and offers a retry action.
export function ErrorState({
  title = 'Seite konnte nicht geladen werden',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/30 bg-danger/10 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      </span>
      <p className="font-medium text-fg">{title}</p>
      {message && <p className="max-w-md text-sm text-fg-muted">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 min-h-[44px] rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
