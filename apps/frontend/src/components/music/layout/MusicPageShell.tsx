'use client';

import React from 'react';
import { MusicAppShell } from '@/components/music/layout/MusicAppShell';
import { NowPlayingView } from '@/components/music/nowplaying/NowPlayingView';
import { ContextMenuProvider } from '@/components/music/shared/ContextMenu';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicSidebarProps } from '@/components/music/sidebar/MusicSidebar';

interface MusicPageShellProps {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  stickyTitle?: string;
  sidebarProps?: Partial<MusicSidebarProps>;
  className?: string;
}

export function MusicPageShell({
  children,
  topBar,
  stickyTitle,
  sidebarProps = {},
  className,
}: MusicPageShellProps) {
  const isExpanded = useMusicPlayerStore((s) => s.isExpanded);
  const toggleExpanded = useMusicPlayerStore((s) => s.toggleExpanded);
  
  // Debug: log state changes
  React.useEffect(() => {
    console.log('MusicPageShell isExpanded:', isExpanded);
  }, [isExpanded]);

  return (
    <ContextMenuProvider>
      <MusicAppShell
        sidebarProps={sidebarProps}
        className={className}
        topBar={topBar}
        stickyTitle={stickyTitle}
        rightSidebar={
          isExpanded
            ? <NowPlayingView mode="sidebar" onClose={toggleExpanded} />
            : undefined
        }
      >
        {children}
      </MusicAppShell>
    </ContextMenuProvider>
  );
}