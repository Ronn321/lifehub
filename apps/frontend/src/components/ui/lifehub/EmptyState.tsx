'use client';

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Centered muted placeholder for empty lists (UI_UX.md §3, §7.2).
// Never render a bare "Keine Daten" — always pass a contextual title,
// description and (when possible) an action.
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-surface px-6 py-12 text-center',
        className,
      )}
      role="status"
    >
      <Icon className="h-10 w-10 text-fg-subtle" aria-hidden="true" />
      <p className="font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
