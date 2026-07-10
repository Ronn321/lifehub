'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  Context Menu System                                                */
/*  Spec: spotify_interactions.md — Right-click context menus          */
/* ------------------------------------------------------------------ */

export interface ContextMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
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
  const menuRef = useRef<HTMLDivElement>(null);

  const showMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    // Adjust position to prevent overflow
    const adjustedX = Math.min(x, window.innerWidth - 240);
    const adjustedY = Math.min(y, window.innerHeight - items.length * 40 - 20);
    setMenu({ x: adjustedX, y: adjustedY, items });
  }, []);

  const hideMenu = useCallback(() => setMenu(null), []);

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

  return (
    <ContextMenuContext.Provider value={{ showMenu, hideMenu }}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[2000] min-w-[200px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-modal)] py-1 shadow-2xl backdrop-blur-xl"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          {menu.items.map((item, i) => (
            <div key={i}>
              {item.separator && <div className="my-1 border-t border-[rgba(255,255,255,0.1)]" />}
              <button
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
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
                <span>{item.label}</span>
              </button>
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

export function useSongContextMenu() {
  const { showMenu } = useContextMenu();

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
      if (actions.onAddToPlaylist) {
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
    [showMenu],
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
