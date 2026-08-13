'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Monitor,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { SleepTimerButton } from '@/components/music/player/SleepTimerButton';

/* ------------------------------------------------------------------ */
/*  VolumeControl — icon toggle + 100px slider                         */
/* ------------------------------------------------------------------ */

function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
}) {
  const effectiveVolume = isMuted ? 0 : volume;
  const [isHovered, setIsHovered] = useState(false);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? -0.05 : 0.05;
      const newVol = Math.max(0, Math.min(1, volume + step));
      onVolumeChange(newVol);
    },
    [volume, onVolumeChange],
  );

  return (
    <div
      className="flex items-center gap-1.5"
      onWheel={handleWheel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onToggleMute}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
        aria-label={isMuted ? 'Stummschaltung aufheben' : 'Stummschalten'}
        title="Stummschalten"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={effectiveVolume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className={`volume-slider transition-all duration-200 ${isHovered ? 'w-28' : 'w-16'}`}
        style={{ '--fill': `${effectiveVolume * 100}%` } as React.CSSProperties}
        aria-label="Lautstärke"
        title="Lautstärke"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DeviceDropdown — popup for selecting playback device               */
/* ------------------------------------------------------------------ */

function DeviceDropdown({
  availableDevices,
  onDeviceSelect,
  onClose,
}: {
  availableDevices: Array<{ id: string; name: string; isActive: boolean }>;
  onDeviceSelect: (deviceId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute bottom-full right-0 mb-2 min-w-[180px] rounded-lg shadow-xl border overflow-hidden"
      style={{
        background: 'var(--music-bg-elevated)',
        borderColor: 'var(--music-border)',
      }}
    >
      <div
        className="px-3 py-2 text-xs font-semibold text-[var(--music-text-tertiary)] uppercase tracking-wider border-b"
        style={{ borderColor: 'var(--music-border-weak)' }}
      >
        Geräte
      </div>
      <div className="py-1">
        {availableDevices.length > 0 ? (
          availableDevices.map((device) => (
            <button
              key={device.id}
              onClick={() => {
                onDeviceSelect(device.id);
                onClose();
              }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors',
                device.isActive
                  ? 'text-[var(--music-accent)]'
                  : 'text-[var(--music-text-primary)] hover:bg-white/5',
              )}
            >
              <Monitor
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  device.isActive && 'text-[var(--music-accent)]',
                )}
              />
              <span className="truncate">{device.name}</span>
              {device.isActive && (
                <span className="ml-auto text-[10px] text-[var(--music-accent)]">Aktiv</span>
              )}
            </button>
          ))
        ) : (
          <div className="px-3 py-3 text-sm text-[var(--music-text-secondary)]">
            Keine Geräte gefunden
          </div>
        )}
      </div>
      <div
        className="px-3 py-2 border-t text-xs text-[var(--music-text-tertiary)]"
        style={{ borderColor: 'var(--music-border-weak)' }}
      >
        <button
          onClick={() => {
            onDeviceSelect('this-device');
            onClose();
          }}
          className="w-full text-left hover:text-[var(--music-text-primary)] transition-colors"
        >
          Dieses Gerät verwenden
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PlayerRight — Lyrics, Queue, Volume, Device, Fullscreen           */
/* ------------------------------------------------------------------ */

interface PlayerRightProps {
  onLyricsToggle?: () => void;
  isLyricsVisible?: boolean;
  onQueueToggle?: () => void;
  queueCount?: number;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onDeviceSelect?: (deviceId: string) => void;
  availableDevices?: Array<{ id: string; name: string; isActive: boolean }>;
  onFullscreenClick?: () => void;
  /** Context menu handlers */
  onQueueContextMenu?: (e: React.MouseEvent) => void;
  onLyricsContextMenu?: (e: React.MouseEvent) => void;
  onDeviceContextMenu?: (e: React.MouseEvent) => void;
}

export function PlayerRight({
  onLyricsToggle,
  isLyricsVisible = false,
  onQueueToggle,
  queueCount = 0,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  onDeviceSelect,
  availableDevices = [],
  onFullscreenClick,
  onLyricsContextMenu,
  onQueueContextMenu,
  onDeviceContextMenu,
}: PlayerRightProps) {
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  /* ── Close device dropdown on outside click ── */
  useEffect(() => {
    if (!isDeviceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        deviceDropdownRef.current &&
        !deviceDropdownRef.current.contains(e.target as Node)
      ) {
        setIsDeviceDropdownOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDeviceDropdownOpen]);

  return (
    <div className="flex items-center gap-1.5 min-w-0 w-[30%] max-w-[360px] shrink-0 justify-end">
      {/* ── Lyrics ── */}
      {onLyricsToggle && (
        <button
          onClick={onLyricsToggle}
          onContextMenu={onLyricsContextMenu}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
            isLyricsVisible
              ? 'text-[var(--music-accent)]'
              : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
          )}
          aria-label={isLyricsVisible ? 'Songtexte ausblenden' : 'Songtexte anzeigen'}
          title="Songtexte"
        >
          <Mic2 className="h-4 w-4" />
        </button>
      )}

      {/* ── Queue Badge ── */}
      {onQueueToggle && (
        <button
          onClick={onQueueToggle}
          onContextMenu={onQueueContextMenu}
          className="relative flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
          aria-label="Warteschlange"
          title="Warteschlange"
        >
          <ListMusic className="h-4 w-4" />
          {queueCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-[var(--music-accent)] text-[9px] font-bold text-black leading-none">
              {queueCount > 99 ? '99+' : queueCount}
            </span>
          )}
        </button>
      )}

      {/* ── Sleep Timer ── */}
      <SleepTimerButton />

      {/* ── Volume ── */}
      <VolumeControl
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
      />

      {/* ── Device Selection ── */}
      {onDeviceSelect && (
        <div className="relative" ref={deviceDropdownRef}>
          <button
            onClick={() => setIsDeviceDropdownOpen((prev) => !prev)}
            onContextMenu={onDeviceContextMenu}
            className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            aria-label="Gerät auswählen"
            title="Gerät auswählen"
          >
            <Monitor className="h-4 w-4" />
          </button>

          {isDeviceDropdownOpen && (
            <DeviceDropdown
              availableDevices={availableDevices}
              onDeviceSelect={onDeviceSelect}
              onClose={() => setIsDeviceDropdownOpen(false)}
            />
          )}
        </div>
      )}

      {/* ── Mini-Player ── */}
      <button
        onClick={() => useMusicPlayerStore.getState().toggleMiniPlayer()}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
        aria-label="Mini-Player"
        title="Mini-Player"
      >
        <Minimize2 className="h-4 w-4" />
      </button>

      {/* ── Fullscreen ── */}
      <button
        onClick={onFullscreenClick}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
        aria-label="Vollbild"
        title="Vollbild"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}
