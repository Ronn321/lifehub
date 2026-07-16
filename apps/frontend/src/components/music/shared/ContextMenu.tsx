'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { usePlaylists, useAddToPlaylist } from '@/lib/music-api';
import type { JellyfinPlaylist } from '@/lib/music-api';

/* ------------------------------------------------------------------ */
/*  Toast (simple inline implementation)                                */
/* ------------------------------------------------------------------ */

function toast(message: string) {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '9999',
    backgroundColor: '#22c55e',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  });
  // Start invisible then fade in
  el.style.opacity = '0';
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 300ms';
    el.style.opacity = '1';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

/* ------------------------------------------------------------------ */
/*  Context Menu System                                                */
/*  Spec: spotify_interactions.md — Right-click context menus          */
/* ------------------------------------------------------------------ */

export interface ContextMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuContextValue {
  showMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) return { showMenu: () => {}, hideMenu: () => {} };
  return ctx;
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const showMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    // Adjust position to prevent overflow
    const adjustedX = Math.min(x, window.innerWidth - 240);
    const adjustedY = Math.min(y, window.innerHeight - items.length * 40 - 20);
    setMenu({ x: adjustedX, y: adjustedY, items });
    setSubmenuIndex(null);
  }, []);

  const hideMenu = useCallback(() => {
    setMenu(null);
    setSubmenuIndex(null);
  }, []);

  // Close on outside click or escape
  useEffect(() => {
    if (!menu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideMenu();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menu, hideMenu]);

  // Reset submenu when menu changes (e.g. after click closes submenu)
  useEffect(() => {
    if (!menu) setSubmenuIndex(null);
  }, [menu]);

  // Reset item refs array when items change
  useEffect(() => {
    if (menu) {
      itemRefs.current = itemRefs.current.slice(0, menu.items.length);
    }
  }, [menu]);

  const handleItemMouseEnter = useCallback((index: number, hasSubmenu: boolean) => {
    if (hasSubmenu) {
      if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
      setSubmenuIndex(index);
    }
  }, []);

  const handleItemMouseLeave = useCallback((hasSubmenu: boolean) => {
    if (hasSubmenu) {
      submenuTimerRef.current = setTimeout(() => setSubmenuIndex(null), 200);
    }
  }, []);

  const handleSubmenuMouseEnter = useCallback(() => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
  }, []);

  const handleSubmenuMouseLeave = useCallback(() => {
    setSubmenuIndex(null);
  }, []);

  return (
    <ContextMenuContext.Provider value={{ showMenu, hideMenu }}>
      {children}
      <style>{`
        @keyframes context-menu-fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes submenu-fade-in {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[var(--music-z-context-menu)] min-w-[200px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-modal)] py-1 shadow-2xl backdrop-blur-xl"
          style={{ left: menu.x, top: menu.y, animation: 'context-menu-fade-in 150ms ease-out' }}
          role="menu"
        >
          {menu.items.map((item, i) => (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="relative"
              onMouseEnter={() => handleItemMouseEnter(i, !!item.submenu)}
              onMouseLeave={() => handleItemMouseLeave(!!item.submenu)}
            >
              {item.separator && <div className="my-1 border-t border-[rgba(255,255,255,0.1)]" />}
              <button
                onClick={() => {
                  if (!item.disabled && !item.submenu) {
                    item.onClick?.();
                    hideMenu();
                  }
                }}
                disabled={item.disabled}
                className={
                  'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ' +
                  (item.disabled
                    ? 'cursor-default text-[var(--music-text-disabled)]'
                    : item.danger
                      ? 'text-[var(--music-error)] hover:bg-[rgba(233,20,41,0.1)]'
                      : 'text-[var(--music-text-primary)] hover:bg-[var(--music-bg-hover)]')
                }
                role="menuitem"
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                <span className="flex-1">{item.label}</span>
                {item.submenu && <ChevronRight className="h-4 w-4 text-[var(--music-text-secondary)]" />}
              </button>

              {/* Submenu */}
              {submenuIndex === i && item.submenu && (
                <div
                  className="absolute left-full top-0 z-[calc(var(--music-z-context-menu)+1)] min-w-[180px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-modal)] py-1 shadow-2xl backdrop-blur-xl ml-1"
                  style={{ animation: 'submenu-fade-in 120ms ease-out' }}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                  role="menu"
                >
                  {item.submenu.map((subItem, j) => (
                    <button
                      key={j}
                      onClick={() => {
                        if (!subItem.disabled) {
                          subItem.onClick?.();
                          hideMenu();
                        }
                      }}
                      disabled={subItem.disabled}
                      className={
                        'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ' +
                        (subItem.disabled
                          ? 'cursor-default text-[var(--music-text-disabled)]'
                          : subItem.danger
                            ? 'text-[var(--music-error)] hover:bg-[rgba(233,20,41,0.1)]'
                            : 'text-[var(--music-text-primary)] hover:bg-[var(--music-bg-hover)]')
                      }
                      role="menuitem"
                    >
                      {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                      <span>{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook: useSongContextMenu                                           */
/*  Returns onContextMenu handler for songs                            */
/* ------------------------------------------------------------------ */

export function useSongContextMenu(options?: { serverId?: string }) {
  const { showMenu } = useContextMenu();
  const { data: playlists } = usePlaylists(options?.serverId);
  const addToPlaylistApi = useAddToPlaylist();

  const addToPlaylistFn = useCallback(
    async (playlistId: string, songIds: string[]) => {
      if (!options?.serverId) return;
      await addToPlaylistApi(options.serverId, playlistId, songIds);
    },
    [options?.serverId, addToPlaylistApi],
  );

  return useCallback(
    (
      e: React.MouseEvent,
      actions: {
        onPlay?: () => void;
        onAddToQueue?: () => void;
        onAddToQueueNext?: () => void;
        onAddToPlaylist?: () => void;
        onToggleFavorite?: () => void;
        onShowInfo?: () => void;
        onGoToArtist?: () => void;
        onGoToAlbum?: () => void;
        isFavorite?: boolean;
        songId?: string;
      },
    ) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [];

      if (actions.onPlay) {
        items.push({ label: 'Abspielen', onClick: actions.onPlay });
      }
      if (actions.onAddToQueue) {
        items.push({ label: 'Zur Warteschlange hinzufügen', onClick: actions.onAddToQueue });
      }
      if (actions.onAddToQueueNext) {
        items.push({ label: 'Als Nächstes abspielen', onClick: actions.onAddToQueueNext });
      }

      // Build "Zur Playlist hinzufügen" — submenu when playlists are loaded, else simple callback
      if (actions.songId && playlists && playlists.length > 0 && options?.serverId) {
        items.push({
          label: 'Zur Playlist hinzufügen',
          separator: true,
          submenu: playlists.map((p: JellyfinPlaylist) => ({
            label: p.Name,
            onClick: async () => {
              await addToPlaylistFn(p.Id, [actions.songId!]);
              toast(`Song zu „${p.Name}" hinzugefügt`);
            },
          })),
        });
      } else if (actions.onAddToPlaylist) {
        items.push({
          label: 'Zur Playlist hinzufügen',
          onClick: actions.onAddToPlaylist,
          separator: true,
        });
      }

      if (actions.onToggleFavorite) {
        items.push({
          label: actions.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen',
          onClick: actions.onToggleFavorite,
        });
      }
      if (actions.onShowInfo) {
        items.push({
          label: 'Informationen anzeigen',
          onClick: actions.onShowInfo,
          separator: true,
        });
      }
      if (actions.onGoToArtist) {
        items.push({ label: 'Zum Künstler gehen', onClick: actions.onGoToArtist });
      }
      if (actions.onGoToAlbum) {
        items.push({ label: 'Zum Album gehen', onClick: actions.onGoToAlbum });
      }

      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu, playlists, options?.serverId, addToPlaylistFn],
  );
}

/* ------------------------------------------------------------------ */
/*  Global Keyboard Shortcuts                                          */
/*  Spec: spotify_player.md + spotify_interactions.md                  */
/* ------------------------------------------------------------------ */

export function useGlobalKeyboardShortcuts(
  shortcuts: {
    onPlayPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onSearch?: () => void;
    onVolumeUp?: () => void;
    onVolumeDown?: () => void;
    onMute?: () => void;
    onFullscreen?: () => void;
  },
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          shortcuts.onPlayPause?.();
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            shortcuts.onNext?.();
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            shortcuts.onPrev?.();
          }
          break;
        case '+':
        case '=':
          shortcuts.onVolumeUp?.();
          break;
        case '-':
          shortcuts.onVolumeDown?.();
          break;
        case 'm':
        case 'M':
          shortcuts.onMute?.();
          break;
        case 'f':
        case 'F':
          shortcuts.onFullscreen?.();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
