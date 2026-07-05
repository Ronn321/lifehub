'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/cn';
import { MusicSidebar } from '@/components/music/sidebar/MusicSidebar';
import type { MusicSidebarProps } from '@/components/music/sidebar/MusicSidebar';

import '@/app/(dashboard)/jellyfin/music/music-theme.css';

interface MusicAppShellProps {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  sidebarProps?: Partial<MusicSidebarProps>;
  className?: string;
}

export function MusicAppShell({
  children,
  topBar,
  rightSidebar,
  sidebarProps = {},
  className,
}: MusicAppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasRightSidebar = !!rightSidebar;
  const sidebarW = collapsed ? 'var(--music-sidebar-collapsed-width)' : 'var(--music-sidebar-width)';

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
        className="flex-shrink-0 overflow-hidden transition-all duration-200 ease-in-out sticky top-0 self-start"
        style={{ width: sidebarW }}
      >
        <MusicSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          {...sidebarProps}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {topBar && (
            <header
              className="flex items-center gap-3 px-6 flex-shrink-0"
              style={{ height: 'var(--music-topbar-height)', background: 'var(--music-bg-base)' }}
            >
              {topBar}
            </header>
          )}
          {children}
        </div>
        {hasRightSidebar && (
          <aside
            className="flex-shrink-0 overflow-y-auto"
            style={{
              width: 'var(--music-right-sidebar-width, 320px)',
              background: 'var(--music-bg-elevated)',
            }}
          >
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}