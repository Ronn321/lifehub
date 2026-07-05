'use client';

import { useMemo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ─── Types ─── */

interface Page {
  id: string;
  title: string;
  parentId: string | null;
  icon: string | null;
  children?: Page[];
}

interface BreadcrumbItem {
  id: string | null;
  title: string;
  icon: string | null;
}

/* ─── Props ─── */

interface BreadcrumbsProps {
  currentPageId: string | null;
  allPages: Page[];
  onNavigate: (pageId: string | null) => void;
  className?: string;
}

/* ─── Helper ─── */

function buildBreadcrumbChain(
  pageId: string | null,
  allPages: Page[],
): BreadcrumbItem[] {
  if (!pageId) return [];

  const map = new Map<string, Page>();
  const flatten = (pages: Page[]) => {
    for (const p of pages) {
      map.set(p.id, p);
      if (p.children) flatten(p.children);
    }
  };
  flatten(allPages);

  // Walk up from the given page to root, collecting ancestors
  const ancestors: BreadcrumbItem[] = [];
  let current: Page | undefined = map.get(pageId);
  while (current) {
    ancestors.unshift({ id: current.id, title: current.title, icon: current.icon });
    if (current.parentId) {
      current = map.get(current.parentId);
    } else {
      break;
    }
  }
  return ancestors;
}

/* ─── Component ─── */

export function Breadcrumbs({
  currentPageId,
  allPages,
  onNavigate,
  className,
}: BreadcrumbsProps) {
  const crumbs = useMemo(
    () => buildBreadcrumbChain(currentPageId, allPages),
    [currentPageId, allPages],
  );

  return (
    <nav className={cn('flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 flex-wrap', className)}>
      {/* Root */}
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Seiten</span>
      </button>

      {crumbs.map((crumb, idx) => (
        <span key={crumb.id ?? `crumb-${idx}`} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" />
          <button
            onClick={() => onNavigate(crumb.id)}
            className={cn(
              'hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors truncate max-w-[120px] sm:max-w-[180px]',
              idx === crumbs.length - 1
                ? 'text-zinc-800 dark:text-zinc-200 font-medium'
                : 'text-zinc-500 dark:text-zinc-400',
            )}
          >
            {crumb.icon && <span className="mr-1">{crumb.icon}</span>}
            {crumb.title}
          </button>
        </span>
      ))}
    </nav>
  );
}
