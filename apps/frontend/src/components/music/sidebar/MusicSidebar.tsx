'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PanelLeftClose, PanelLeftOpen, Mic2, Disc3 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SidebarNavButton } from './SidebarNavButton';
import { SidebarPlaylistItem } from './SidebarPlaylistItem';
import { SidebarCreateButton } from './SidebarCreateButton';
import {
  useJellyfinServer,
  useArtists,
  useRecentAlbums,
  getCoverUrl,
} from '@/lib/music-api';
import { useAuthStore } from '@/lib/auth-store';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PlaylistItemData {
  id: string;
  name: string;
  coverUrl?: string;
  songCount: number;
}

export type LibraryTab = 'playlists' | 'artists' | 'albums';

export interface MusicSidebarProps {
  /** List of playlists to display */
  playlists?: PlaylistItemData[];
  /** Active playlist id (highlighted) */
  activePlaylistId?: string | null;
  /** Called when a playlist is clicked */
  onPlaylistClick?: (id: string) => void;
  /** Called when the "Neue Playlist" button is clicked */
  onCreatePlaylist?: () => void;
  /** Currently active library tab */
  activeTab?: LibraryTab;
  /** Called when a library tab is clicked */
  onTabChange?: (tab: LibraryTab) => void;
  /** Whether the sidebar is collapsed to icon-only mode */
  collapsed?: boolean;
  /** Called when the collapse toggle button is clicked */
  onToggleCollapse?: () => void;
}

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'playlists', label: 'Playlists' },
  { key: 'artists', label: 'Künstler' },
  { key: 'albums', label: 'Alben' },
];

/* ------------------------------------------------------------------ */
/*  Music Sidebar                                                     */
/* ------------------------------------------------------------------ */
/**
 * Spotify-style left sidebar for the music domain.
 * 240px wide (expanded) or 64px icon-only (collapsed), dark elevated background.
 * Contains: toggle button, nav buttons, library header with filter tabs,
 * scrollable playlist list, and a create-playlist button at the bottom.
 */
export function MusicSidebar({
  playlists = [],
  activePlaylistId = null,
  onPlaylistClick,
  onCreatePlaylist,
  activeTab = 'playlists',
  onTabChange,
  collapsed = false,
  onToggleCollapse,
}: MusicSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();
  const { data: artists } = useArtists(server?.id);
  const { data: albums } = useRecentAlbums(server?.id, 20);
  // Manage tab state locally as fallback when no onTabChange from parent
  const [localTab, setLocalTab] = useState<LibraryTab>(activeTab);
  const effectiveTab = onTabChange ? activeTab : localTab;
  const handleTabClick = (tab: LibraryTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setLocalTab(tab);
    }
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden transition-[width] duration-[250ms] ease-in-out',
      )}
      style={{
        width: collapsed
          ? 'var(--music-sidebar-collapsed-width)'
          : 'var(--music-sidebar-width)',
        background: 'var(--music-bg-elevated)',
      }}
    >
      {/* ── Toggle Collapse Button ── */}
      <div className={cn('flex items-center px-3 pt-6 pb-2', collapsed && 'justify-center')}>
        <button
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center justify-center rounded-md transition-colors',
            'text-[var(--music-text-tertiary)] hover:text-[var(--music-text-primary)] hover:bg-[var(--music-bg-card)]',
            collapsed ? 'h-8 w-8' : 'h-8 w-8',
          )}
          title={collapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Navigation Buttons ── */}
      <nav className={cn('flex flex-col gap-1 px-3 pb-4', collapsed ? '' : 'pt-0')}>
        <SidebarNavButton
          icon={Home}
          label="Home"
          href="/jellyfin/music"
          active={pathname === '/jellyfin/music'}
          collapsed={collapsed}
        />
        <SidebarNavButton
          icon={Search}
          label="Suche"
          href="/jellyfin/music/search"
          active={pathname.startsWith('/jellyfin/music/search')}
          collapsed={collapsed}
        />
      </nav>

      {/* ── Library Header + Filter Tabs ── */}
      {!collapsed && (
        <div className="flex flex-col gap-2 px-3 pb-2">
          <h2
            className="px-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--music-text-secondary)' }}
          >
            Bibliothek
          </h2>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  effectiveTab === tab.key
                    ? 'bg-[var(--music-text-primary)] text-[var(--music-bg-base)]'
                    : 'bg-[var(--music-bg-card)] text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search field (L-008) */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--music-text-tertiary)]" />
            <input
              placeholder="Filtern..."
              className="w-full rounded-md bg-[var(--music-bg-card)] py-1.5 pl-7 pr-3 text-xs text-[var(--music-text-primary)] placeholder-[var(--music-text-tertiary)] outline-none border-none"
            />
          </div>

          {/* Sort dropdown (L-007) */}
          <select
            className="w-full rounded-md bg-[var(--music-bg-card)] py-1.5 px-2 text-xs text-[var(--music-text-secondary)] outline-none border-none"
            defaultValue="Zuletzt"
          >
            <option value="Zuletzt">Zuletzt</option>
            <option value="Alphabetisch">Alphabetisch</option>
            <option value="Kürzlich gespielt">Kürzlich gespielt</option>
          </select>
        </div>
      )}

      {/* ── Scrollable Content (Playlists / Artists / Albums) ── */}
      <div className="flex-1 overflow-y-auto px-3 music-scroll">
        {effectiveTab === 'playlists' && (
          <>
            {playlists.length === 0 && (
              <p
                className="px-2 py-4 text-xs text-center"
                style={{ color: 'var(--music-text-tertiary)' }}
              >
                {collapsed ? '—' : 'Keine Playlists'}
              </p>
            )}
            {playlists.map((pl) => (
              <SidebarPlaylistItem
                key={pl.id}
                name={pl.name}
                id={pl.id}
                coverUrl={pl.coverUrl}
                songCount={pl.songCount}
                active={pl.id === activePlaylistId}
                onClick={onPlaylistClick}
                collapsed={collapsed}
              />
            ))}
          </>
        )}

        {effectiveTab === 'artists' && (
          <>
            {!artists || artists.length === 0 ? (
              <p
                className="px-2 py-4 text-xs text-center"
                style={{ color: 'var(--music-text-tertiary)' }}
              >
                {collapsed ? '—' : 'Keine Künstler'}
              </p>
            ) : (
              artists.map((item) => (
                <button
                  key={item.Id}
                  onClick={() => router.push(`/jellyfin/music/artist/${item.Id}`)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    collapsed ? 'justify-center h-10' : 'h-10',
                    'text-[var(--music-text-secondary)] hover:bg-[var(--music-bg-card)] hover:text-[var(--music-text-primary)]',
                  )}
                  title={item.Name}
                >
                  {/* Round cover / fallback — 32x32 */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--music-bg-card)]">
                    {accessToken && server ? (
                      <img
                        src={getCoverUrl(accessToken, server.id, item.Id, 32, 32)}
                        alt={item.Name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Mic2 className="h-4 w-4 text-[var(--music-text-tertiary)]" />
                    )}
                  </div>
                  {!collapsed && <span className="flex-1 truncate">{item.Name}</span>}
                </button>
              ))
            )}
          </>
        )}

        {effectiveTab === 'albums' && (
          <>
            {!albums || albums.length === 0 ? (
              <p
                className="px-2 py-4 text-xs text-center"
                style={{ color: 'var(--music-text-tertiary)' }}
              >
                {collapsed ? '—' : 'Keine Alben'}
              </p>
            ) : (
              albums.map((item) => (
                <button
                  key={item.Id}
                  onClick={() => router.push(`/jellyfin/music/album/${item.Id}`)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    collapsed ? 'justify-center h-10' : 'h-10',
                    'text-[var(--music-text-secondary)] hover:bg-[var(--music-bg-card)] hover:text-[var(--music-text-primary)]',
                  )}
                  title={item.Name}
                >
                  {/* Square cover / fallback — 32x32 */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--music-bg-card)]">
                    {accessToken && server ? (
                      <img
                        src={getCoverUrl(accessToken, server.id, item.Id, 32, 32)}
                        alt={item.Name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Disc3 className="h-4 w-4 text-[var(--music-text-tertiary)]" />
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.Name}</span>
                      {item.AlbumArtist && (
                        <span className="hidden text-[10px] text-[var(--music-text-tertiary)] group-hover:inline truncate max-w-[70px] ml-1">
                          {item.AlbumArtist}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))
            )}
          </>
        )}
      </div>

      {/* ── Create Playlist Button (always visible) ── */}
      {onCreatePlaylist && (
        <SidebarCreateButton onClick={onCreatePlaylist} collapsed={collapsed} />
      )}
    </aside>
  );
}
