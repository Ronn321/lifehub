'use client';

import { Plus } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface SidebarCreateButtonProps {
  onClick: () => void;
  collapsed?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Sidebar Create Button                                             */
/* ------------------------------------------------------------------ */
/**
 * Full-width button at the bottom of the music sidebar.
 * Renders a "+ Playlist erstellen" label.
 * Separated from the playlist list by a top border.
 */
export function SidebarCreateButton({ onClick, collapsed = false }: SidebarCreateButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex h-12 w-full items-center gap-3 px-2 text-sm font-medium',
        collapsed ? 'justify-center' : '',
        'border-t border-[var(--music-bg-card)]',
        'text-[var(--music-text-secondary)]',
        'hover:text-[var(--music-text-primary)] transition-colors',
      ].join(' ')}
      title={collapsed ? 'Playlist erstellen' : undefined}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[var(--music-bg-card)]">
        <Plus className="h-4 w-4" />
      </div>
      {!collapsed && <span>Playlist erstellen</span>}
    </button>
  );
}
