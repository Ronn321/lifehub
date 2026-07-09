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
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {topBar && (
            <header
              className="flex items-center gap-3 px-6 flex-shrink-0 sticky top-0 z-[2]"
              style={{ height: 'var(--music-topbar-height)', background: 'var(--music-bg-base)' }}
            >
              {topBar}
            </header>
          )}
          {children}
        </div>

        {/* Right Sidebar */}
        {hasRightSidebar && (
          <aside
            className="flex-shrink-0 overflow-y-auto border-l border-[rgba(255,255,255,0.08)]"
            style={{
              width: 'var(--music-right-sidebar-width, 360px)',
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