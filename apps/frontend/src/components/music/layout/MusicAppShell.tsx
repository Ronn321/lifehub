'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/cn';
import { MusicSidebar } from '@/components/music/sidebar/MusicSidebar';
import { useStickyHeader } from '@/components/music/shared/useStickyHeader';
import { useJellyfinLayout } from '@/lib/jellyfin-layout-store';
import type { MusicSidebarProps } from '@/components/music/sidebar/MusicSidebar';

import '@/app/(dashboard)/jellyfin/music/music-theme.css';

interface MusicAppShellProps {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  stickyTitle?: string;
  rightSidebar?: React.ReactNode;
  sidebarProps?: Partial<MusicSidebarProps>;
  className?: string;
}

export function MusicAppShell({
  children,
  topBar,
  stickyTitle,
  rightSidebar,
  sidebarProps = {},
  className,
}: MusicAppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasRightSidebar = !!rightSidebar;
  const sidebarW = collapsed ? 'var(--music-sidebar-collapsed-width)' : 'var(--music-sidebar-width)';
  // Sidebar collapse style from persisted store (settings → Darstellung)
  const sidebarStyle = useJellyfinLayout((s) => s.sidebarStyle);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { isScrolled } = useStickyHeader(scrollRef);

  return (
    <div
      className={cn('flex', className)}
      style={{
        background: 'var(--music-bg-base)',
        color: 'var(--music-text-primary)',
        minHeight: '100%',
      }}
    >
      {/* Music Sidebar */}
      <div
        className={cn(
          'relative flex-shrink-0 transition-all duration-200 ease-in-out sticky top-0 self-start',
          collapsed && sidebarStyle === 'classic' ? 'overflow-visible' : 'overflow-hidden',
        )}
        style={{ width: sidebarW }}
      >
        <MusicSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          toggleStyle={sidebarStyle}
          onCreatePlaylist={() => {}}
          {...sidebarProps}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 flex flex-col min-w-0 overflow-y-auto"
        >
          {topBar && (
            <header
              className={cn(
                'flex items-center gap-3 px-6 flex-shrink-0 sticky top-0',
                'transition-all duration-200 ease-out',
              )}
              style={{
                height: 'var(--music-topbar-height)',
                background: isScrolled ? 'color-mix(in srgb, var(--music-bg-base) 80%, transparent)' : 'transparent',
                backdropFilter: isScrolled ? 'blur(12px)' : 'none',
                WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
                zIndex: 'var(--music-z-sticky)',
              }}
            >
              {topBar}
              {stickyTitle && (
                <span
                  className={cn(
                    'text-sm font-semibold text-[var(--music-text-primary)] truncate transition-opacity duration-200',
                    isScrolled ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  {stickyTitle}
                </span>
              )}
            </header>
          )}
          {children}
        </div>

        {/* Right Sidebar */}
        <aside
          className={`flex-shrink-0 overflow-hidden border-l border-[var(--music-border-weak)] transition-[width] duration-200 ease-out`}
          style={{
            width: hasRightSidebar ? 'var(--music-right-sidebar-width, 320px)' : '0px',
            background: 'var(--music-bg-elevated)',
          }}
        >
          {rightSidebar}
        </aside>
      </div>
    </div>
  );
}
