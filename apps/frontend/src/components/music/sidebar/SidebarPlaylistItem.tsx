'use client';

import { cn } from '@/lib/cn';
import { Music, ListMusic } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface SidebarPlaylistItemProps {
  name: string;
  id: string;
  /** Optional cover image URL for the playlist */
  coverUrl?: string;
  songCount: number;
  /** Whether this playlist is currently active/selected */
  active?: boolean;
  onClick?: (id: string) => void;
  collapsed?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Sidebar Playlist Item                                             */
/* ------------------------------------------------------------------ */
/**
 * A single playlist row in the sidebar.
 * Shows a 32x32 cover image (or fallback icon), the playlist name,
 * and a song count on hover.
 */
export function SidebarPlaylistItem({
  name,
  id,
  coverUrl,
  songCount,
  active = false,
  onClick,
  collapsed = false,
}: SidebarPlaylistItemProps) {
  return (
    <button
      onClick={() => onClick?.(id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
        collapsed ? 'justify-center h-10' : 'h-10',
        active
          ? 'bg-[var(--music-bg-card)] text-[var(--music-text-primary)]'
          : 'text-[var(--music-text-secondary)] hover:bg-[var(--music-bg-card)] hover:text-[var(--music-text-primary)]',
      )}
      title={`${name} — ${songCount} Titel`}
    >
      {/* Cover / Fallback icon — 32x32 */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--music-bg-card)]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <ListMusic className="h-4 w-4 text-[var(--music-text-tertiary)]" />
        )}
      </div>

      {!collapsed && (
        <>
          {/* Name */}
          <span className="flex-1 truncate">{name}</span>

          {/* Song count — visible on hover */}
          <span className="hidden text-xs text-[var(--music-text-tertiary)] group-hover:inline tabular-nums">
            {songCount}
          </span>
        </>
      )}
    </button>
  );
}
