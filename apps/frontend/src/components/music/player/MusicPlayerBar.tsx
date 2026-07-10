'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { ContextMenuProvider, useContextMenu } from '@/components/music/shared/ContextMenu';
import type { ContextMenuItem } from '@/components/music/shared/ContextMenu';
import { PlayerLeft } from '@/components/music/player/PlayerLeft';
import { PlayerCenter } from '@/components/music/player/PlayerCenter';
import { PlayerRight } from '@/components/music/player/PlayerRight';

/* ------------------------------------------------------------------ */
/*  MusicPlayerBar v3 — 90px persistent player bar                    */
/*                                                                     */
/*  Composition: PlayerLeft (30%) | PlayerCenter (40%) | PlayerRight   */
/*  (30%)                                                             */
/* ------------------------------------------------------------------ */

interface MusicPlayerBarProps {
  /** Ref for the underlying <audio> element (controlled by parent) */
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  /** Called when the expand button is clicked (sidebar/queue toggle) */
  onExpandToggle?: () => void;
  /** Whether the now-playing sidebar is currently open */
  isExpanded?: boolean;
  /** Called when the like button is clicked */
  onLikeToggle?: (trackId: string) => void;
  /** Whether the current track is liked */
  isLiked?: boolean;
  /** Called when the queue badge is clicked */
  onQueueToggle?: () => void;
  /** Queue item count badge */
  queueCount?: number;
  /** Called when the lyrics button is clicked */
  onLyricsToggle?: () => void;
  /** Whether the lyrics overlay is currently visible */
  isLyricsVisible?: boolean;
  /** Called when a playback device is selected */
  onDeviceSelect?: (deviceId: string) => void;
  /** Available devices for playback */
  availableDevices?: Array<{ id: string; name: string; isActive: boolean }>;
  /** Called when retry after error is requested */
  onRetry?: () => void;
  /** Current error message (null when no error) */
  errorMessage?: string | null;
}

export function MusicPlayerBar({
  audioRef,
  onExpandToggle,
  isExpanded = false,
  onLikeToggle,
  isLiked = false,
  onQueueToggle,
  queueCount = 0,
  onLyricsToggle,
  isLyricsVisible = false,
  onDeviceSelect,
  availableDevices = [],
  onRetry,
  errorMessage,
}: MusicPlayerBarProps) {
  /* ── Zustand state ── */

  const {
    currentTrack,
    status,
    position,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    addToQueue,
    clearQueue,
  } = useMusicPlayerStore();

  const isLoading = status === 'loading';
  const isPlaying = status === 'playing';
  const hasTrack = currentTrack !== null;

  /* ── Volume state (local mirror for immediate slider feedback) ── */

  const [localVolume, setLocalVolume] = useState(volume);

  // Sync local volume with store volume
  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const handleVolumeChange = useCallback(
    (v: number) => {
      setLocalVolume(v);
      setVolume(v);
      // Update audio element volume
      if (audioRef?.current) {
        audioRef.current.volume = v;
        audioRef.current.muted = isMuted;
      }
    },
    [setVolume, audioRef, isMuted],
  );

  const handleToggleMute = useCallback(() => {
    toggleMute();
    if (audioRef?.current) {
      audioRef.current.muted = !isMuted;
    }
  }, [toggleMute, audioRef, isMuted]);

  /* ── Fullscreen handler ── */

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  /* ── Progress seek handler ── */

  const handleSeek = useCallback(
    (pos: number) => {
      seek(pos);
      if (audioRef?.current) {
        audioRef.current.currentTime = pos;
      }
    },
    [seek, audioRef],
  );

  /* ── Context Menu: use useContextMenu ── */

  const { showMenu } = useContextMenu();

  /* Helper: format seconds to m:ss */
  const formatPos = (s: number): string => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /* ── Context Menu: AlbumCover ── */

  const handleCoverContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!currentTrack) return;
      e.preventDefault();
      const items: ContextMenuItem[] = [
        { label: 'Zum Album öffnen', onClick: () => alert('Zum Album – noch nicht implementiert') },
        { label: 'Now Playing öffnen', onClick: () => onExpandToggle?.() },
        { label: 'Teilen', onClick: () => alert('Teilen – noch nicht implementiert') },
      ];
      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu, currentTrack, onExpandToggle],
  );

  /* ── Context Menu: Songtitel ── */

  const handleTitleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!currentTrack) return;
      e.preventDefault();
      const items: ContextMenuItem[] = [
        { label: 'Songinfo', onClick: () => alert('Songinfo – noch nicht implementiert') },
        { label: 'Zum Album', onClick: () => alert('Zum Album – noch nicht implementiert') },
        { label: 'Zum Künstler', onClick: () => alert('Zum Künstler – noch nicht implementiert') },
        { label: 'Zur Playlist hinzufügen', onClick: () => alert('Zur Playlist hinzufügen – noch nicht implementiert') },
        { label: 'Zur Queue', onClick: () => addToQueue(currentTrack), separator: true },
      ];
      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu, currentTrack, addToQueue],
  );

  /* ── Context Menu: Interpret ── */

  const handleArtistContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!currentTrack) return;
      e.preventDefault();
      const items: ContextMenuItem[] = [
        { label: 'Künstlerseite öffnen', onClick: () => alert('Künstlerseite – noch nicht implementiert') },
      ];
      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu, currentTrack],
  );

  /* ── Context Menu: Timeline ── */

  const handleTimelineContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        { label: 'Starten', onClick: () => handleSeek(0) },
        {
          label: 'Position kopieren',
          onClick: () => {
            const timeStr = formatPos(position);
            navigator.clipboard.writeText(timeStr).catch(() => {});
          },
        },
      ];
      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu, position, handleSeek],
  );

  /* ── Context Menu: Queue ── */

  const handleQueueContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        { label: 'Leeren', onClick: () => clearQueue() },
        { label: 'Speichern', onClick: () => alert('Warteschlange speichern – noch nicht implementiert') },
        { label: 'Shufflen', onClick: () => toggleShuffle() },
      ];
      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu, clearQueue, toggleShuffle],
  );

  /* ── Context Menu: Lyrics ── */

  const handleLyricsContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        { label: 'Schließen', onClick: () => onLyricsToggle?.() },
      ];
      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu, onLyricsToggle],
  );

  /* ── Context Menu: Devices ── */

  const handleDeviceContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const items: ContextMenuItem[] = [
        { label: 'Geräte aktualisieren', onClick: () => alert('Geräte aktualisieren – noch nicht implementiert') },
      ];
      showMenu(e.clientX, e.clientY, items);
    },
    [showMenu],
  );

  /* ── Keyboard shortcuts ── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          if (hasTrack) togglePlay();
          break;
        }
        case 'ArrowLeft': {
          if (e.shiftKey) {
            e.preventDefault();
            if (hasTrack) handleSeek(position - 10);
          } else {
            e.preventDefault();
            previous();
          }
          break;
        }
        case 'ArrowRight': {
          if (e.shiftKey) {
            e.preventDefault();
            if (hasTrack) handleSeek(position + 10);
          } else {
            e.preventDefault();
            next();
          }
          break;
        }
        case 'Equal':
        case 'NumpadAdd': {
          e.preventDefault();
          const newVol = Math.min(1, localVolume + 0.1);
          handleVolumeChange(newVol);
          break;
        }
        case 'Minus':
        case 'NumpadSubtract': {
          e.preventDefault();
          const newVol = Math.max(0, localVolume - 0.1);
          handleVolumeChange(newVol);
          break;
        }
        case 'KeyM': {
          e.preventDefault();
          handleToggleMute();
          break;
        }
        case 'KeyS': {
          e.preventDefault();
          toggleShuffle();
          break;
        }
        case 'KeyR': {
          e.preventDefault();
          cycleRepeat();
          break;
        }
        case 'KeyF': {
          e.preventDefault();
          handleFullscreen();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasTrack, togglePlay, previous, next, localVolume, handleVolumeChange, handleToggleMute, toggleShuffle, cycleRepeat, handleFullscreen, handleSeek, position]);

  /* ── Render ── */

  return (
    <ContextMenuProvider>
      <div
        className="w-full relative"
        style={{
          height: 'var(--music-player-bar-height, 90px)',
          background: 'var(--music-bg-elevated)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex items-center h-full px-4 max-w-screen-2xl mx-auto gap-2">
          {/* ── LEFT (30%) — Cover + Track Info + Actions ── */}
          <PlayerLeft
            currentTrack={currentTrack}
            hasTrack={hasTrack}
            isLiked={isLiked}
            onLikeToggle={onLikeToggle}
            onExpandToggle={onExpandToggle}
            isExpanded={isExpanded}
            onCoverContextMenu={handleCoverContextMenu}
            onTitleContextMenu={handleTitleContextMenu}
            onArtistContextMenu={handleArtistContextMenu}
          />

          {/* ── CENTER (40%, max 600px) — Controls + Timeline ── */}
          <PlayerCenter
            shuffle={shuffle}
            isPlaying={isPlaying}
            isLoading={isLoading}
            repeatMode={repeatMode}
            position={position}
            duration={duration}
            onToggleShuffle={toggleShuffle}
            onPrevious={previous}
            onTogglePlay={togglePlay}
            onNext={next}
            onCycleRepeat={cycleRepeat}
            onSeek={handleSeek}
            onTimelineContextMenu={handleTimelineContextMenu}
          />

          {/* ── RIGHT (30%) — Lyrics, Queue, Volume, Device, Fullscreen ── */}
          <PlayerRight
            onLyricsToggle={onLyricsToggle}
            isLyricsVisible={isLyricsVisible}
            onQueueToggle={onQueueToggle}
            queueCount={queueCount}
            volume={localVolume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onDeviceSelect={onDeviceSelect}
            availableDevices={availableDevices}
            onFullscreenClick={handleFullscreen}
            onQueueContextMenu={handleQueueContextMenu}
            onLyricsContextMenu={handleLyricsContextMenu}
            onDeviceContextMenu={handleDeviceContextMenu}
          />
        </div>

        {/* ── Error Overlay ── */}
        {status === 'error' && errorMessage && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-3 px-4 z-10"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-3 max-w-2xl w-full">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-400">Wiedergabefehler</p>
                <p className="text-xs text-[var(--music-text-secondary)] truncate mt-0.5">
                  {errorMessage}
                </p>
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-[var(--music-accent)] hover:bg-[var(--music-accent-hover)] text-black whitespace-nowrap"
                >
                  Erneut versuchen
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ContextMenuProvider>
  );
}
