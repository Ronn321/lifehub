'use client';

import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  currentPath: string;
  parentPath: string | null;
  sourceName: string;
  onNavigate: (path: string) => void;
}

function splitPathSegments(path: string): string[] {
  if (!path) return [];
  return path.replace(/\\/g, '/').split('/').filter(Boolean);
}

function buildFullPath(segments: string[], index: number): string {
  return '/' + segments.slice(0, index + 1).join('/');
}

export function Breadcrumb({
  currentPath,
  parentPath: _parentPath,
  sourceName,
  onNavigate,
}: BreadcrumbProps) {
  const segments = splitPathSegments(currentPath);
  const isRoot = segments.length === 0;

  return (
    <nav
      className="flex items-center gap-1 text-sm text-fg-muted min-w-0"
      aria-label="Breadcrumb"
    >
      <span className="flex items-center gap-1.5 mr-1 text-fg-muted/60 select-none">
        <button
          onClick={() => onNavigate('')}
          disabled={isRoot}
          className="rounded p-1 hover:text-fg hover:bg-bg-raised transition-colors disabled:opacity-50 disabled:pointer-events-none"
          title={sourceName}
        >
          <Home className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium">{sourceName}</span>
      </span>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const path = buildFullPath(segments, index);
        return (
          <span key={path} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            {isLast ? (
              <span
                className="text-fg font-medium truncate max-w-[200px]"
                title={segment}
              >
                {segment}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(path)}
                className="rounded px-1.5 py-0.5 hover:text-fg hover:bg-bg-raised transition-colors truncate max-w-[200px]"
                title={segment}
              >
                {segment}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
