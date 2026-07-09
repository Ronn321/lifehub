'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  X,
  ChevronDown,
  Heart,
  ListMusic,
  Mic2,
  Trash2,
  Star,
  Info,
  Disc3,
  Music,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicImage } from '@/components/music/shared/MusicCard';
import { formatTime } from '@/lib/music-api';

/* ------------------------------------------------------------------ */
/*  NowPlayingView — Right Sidebar / Fullscreen / Mini Player         */
/*  Spec: spotify_now_playing_view.md                                  */
/*  5 Tabs: Album, Info, Lyrics, Queue, Empfehlungen                  */
/*  Queue: Aktueller, Nächste, History + Aktionen                     */
/* ------------------------------------------------------------------ */

type TabId = 'album' | 'info' | 'lyrics' | 'queue' | 'empfehlungen';

type NowPlayingMode = 'sidebar' | 'fullscreen' | 'mini';

interface NowPlayingViewProps {
  mode: NowPlayingMode;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'album', label: 'Album', icon: <Disc3 className="h-3.5 w-3.5" /> },
  { id: 'info', label: 'Info', icon: <Info className="h-3.5 w-3.5" /> },
  { id: 'lyrics', label: 'Lyrics', icon: <Mic2 className="h-3.5 w-3.5" /> },
  { id: 'queue', label: 'Queue', icon: <ListMusic className="h-3.5 w-3.5" /> },
  { id: 'empfehlungen', label: 'Empfehlungen', icon: <Sparkles className="h-3.5 w-3.5" /> },
];

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes?: number): string {
  if (bytes == null) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(unitIdx > 0 ? 1 : 0)} ${units[unitIdx]!}`;
}

function formatBitrate(bps?: number): string {
  if (bps == null) return '--';
  const kbps = bps / 1000;
  return `${kbps.toFixed(kbps >= 10 ? 0 : 1)} kbps`;
}

function formatSampleRate(hz?: number): string {
  if (hz == null) return '--';
  return `${(hz / 1000).toFixed(1)} kHz`;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function NowPlayingView({ mode, onClose, audioRef }: NowPlayingViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('album');

  const {
    currentTrack,
    status,
    queue,
    currentIndex,
    position,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    togglePlay,
    next,
    previous,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    playFromQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    seek,
    history,
  } = useMusicPlayerStore();

  // Don't render if no track
  if (!currentTrack && mode !== 'fullscreen') return null;

  const isFullscreen = mode === 'fullscreen';
  const isMini = mode === 'mini';

  /* ── Fullscreen Mode ── */
  if (isFullscreen) {
    return (
      <FullscreenNowPlaying
        track={currentTrack}
        status={status}
        position={position}
        duration={duration}
        onClose={onClose}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrev={previous}
        onSeek={(t) => {
          seek(t);
          if (audioRef?.current) audioRef.current.currentTime = t;
        }}
        shuffle={shuffle}
        repeatMode={repeatMode}
        onShuffle={toggleShuffle}
        onRepeat={cycleRepeat}
      />
    );
  }

  /* ── Mini Player Mode ── */
  if (isMini) {
    return <MiniPlayer track={currentTrack} onClose={onClose} />;
  }

  /* ── Sidebar Mode (320px right sidebar) ── */
  return (
    <aside
      className="flex h-full flex-col border-l border-[rgba(255,255,255,0.08)] overflow-hidden"
      style={{ width: 'var(--music-right-sidebar-width, 360px)' }}
    >
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] px-1">
        <div className="flex overflow-x-auto music-scroll" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap transition-colors"
              style={{
                color:
                  activeTab === tab.id
                    ? 'var(--music-text-primary)'
                    : 'var(--music-text-secondary)',
              }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-2 right-2 rounded-full"
                  style={{ height: '2px', background: 'var(--music-accent)' }}
                />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-2 text-[var(--music-text-secondary)] hover:text-white"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden music-scroll">
        {activeTab === 'album' && <AlbumTab track={currentTrack} />}
        {activeTab === 'info' && <InfoTab track={currentTrack} />}
        {activeTab === 'lyrics' && (
          <LyricsTab track={currentTrack} position={position} status={status} />
        )}
        {activeTab === 'queue' && (
          <QueueTab
            queue={queue}
            currentIndex={currentIndex}
            history={history}
            onPlayFromQueue={playFromQueue}
            onRemoveFromQueue={removeFromQueue}
            onReorderQueue={reorderQueue}
            onClearQueue={clearQueue}
          />
        )}
        {activeTab === 'empfehlungen' && <EmpfehlungenTab track={currentTrack} />}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Album Tab — großes Cover + Titel + Interpret + Album + Favorit + Bewertung */
/* ------------------------------------------------------------------ */

function AlbumTab({
  track,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [rating, setRating] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Large Cover — responsive to sidebar width */}
      <div
        className="w-full overflow-hidden rounded-lg shadow-2xl"
        style={{ aspectRatio: '1/1', maxWidth: '280px' }}
      >
        <MusicImage
          src={track?.coverUrl}
          alt={track?.album ?? 'Cover'}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Track Info */}
      <div className="w-full text-center">
        <p className="text-lg font-bold text-[var(--music-text-primary)] leading-tight">
          {track?.title ?? '--'}
        </p>
        <p className="mt-1 text-sm text-[var(--music-text-secondary)]">
          {track?.artist ?? 'Unbekannt'}
        </p>
        {track?.album && (
          <p className="mt-0.5 text-xs text-[var(--music-text-tertiary)]">{track.album}</p>
        )}
      </div>

      {/* Favorite + Rating */}
      <div className="flex flex-col items-center gap-2">
        {/* Favorite toggle */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{
            color: isFavorite ? 'var(--music-accent)' : 'var(--music-text-tertiary)',
          }}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-[var(--music-accent)]' : ''}`} />
          {isFavorite ? 'Favorit' : 'Als Favorit markieren'}
        </button>

        {/* Star Rating (1–5) */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star === rating ? 0 : star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className="h-4 w-4"
                style={{
                  fill: star <= rating ? 'var(--music-accent)' : 'transparent',
                  color:
                    star <= rating
                      ? 'var(--music-accent)'
                      : 'var(--music-text-tertiary)',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Info Tab — Genre, Jahr, Bitrate, Samplingrate, Codec, Dauer, Dateigröße */
/* ------------------------------------------------------------------ */

function InfoTab({
  track,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
}) {
  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Info className="mb-3 h-12 w-12 text-[var(--music-text-disabled)]" />
        <p className="text-sm font-bold text-[var(--music-text-primary)]">Keine Informationen</p>
      </div>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Genre', value: track.genre ?? '--' },
    { label: 'Jahr', value: track.year?.toString() ?? '--' },
    { label: 'Bitrate', value: formatBitrate(track.bitrate) },
    { label: 'Samplingrate', value: formatSampleRate(track.sampleRate) },
    { label: 'Codec', value: track.quality ?? '--' },
    { label: 'Dauer', value: formatTime(track.duration) },
    { label: 'Dateigröße', value: formatFileSize(track.fileSize) },
    { label: 'Album', value: track.album ?? '--' },
    { label: 'Künstler', value: track.artist ?? '--' },
  ];

  return (
    <div className="px-4 py-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--music-text-secondary)]">
        Songinformationen
      </h3>
      <div className="divide-y divide-[rgba(255,255,255,0.06)]">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-2.5">
            <span className="text-xs text-[var(--music-text-tertiary)]">{label}</span>
            <span className="text-xs font-medium text-[var(--music-text-primary)]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lyrics Tab — Sync/Unsync, aktuelle Zeile markieren, Auto-Scroll   */
/* ------------------------------------------------------------------ */

function LyricsTab({
  track,
  position,
  status,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
  position: number;
  status: string;
}) {
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const hasSynced = !!track?.lyrics && track.lyrics.length > 0;
  const hasUnsynced = !!track?.lyricsText;

  // For synced lyrics: find the active line index based on current playback position
  const activeLineIndex = useMemo(() => {
    if (!hasSynced || !track?.lyrics) return -1;
    let idx = -1;
    for (let i = 0; i < track.lyrics.length; i++) {
      const line = track.lyrics[i]!;
      if (line.time <= position) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [track?.lyrics, position, hasSynced]);

  // Auto-scroll to keep active line visible
  useEffect(() => {
    const el = activeLineRef.current;
    const container = lyricsContainerRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (
      elRect.top < containerRect.top + 60 ||
      elRect.bottom > containerRect.bottom - 20
    ) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIndex]);

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Mic2 className="mb-3 h-12 w-12 text-[var(--music-text-disabled)]" />
        <p className="text-sm font-bold text-[var(--music-text-primary)]">Kein Titel ausgewählt</p>
      </div>
    );
  }

  if (!hasSynced && !hasUnsynced) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Mic2 className="mb-3 h-12 w-12 text-[var(--music-text-disabled)]" />
        <p className="text-sm font-bold text-[var(--music-text-primary)]">Keine Lyrics verfügbar</p>
        <p className="mt-1 text-xs text-[var(--music-text-secondary)]">
          Lyrics für „{track.title}" sind nicht verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Sync/unsync badge */}
      <div className="px-4 pt-3 pb-1">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: 'var(--music-accent)',
            color: 'var(--music-bg-base)',
            opacity: 0.8,
          }}
        >
          {hasSynced ? 'Synchronisiert' : 'Nicht synchronisiert'}
        </span>
      </div>

      {/* Lyrics content */}
      <div
        ref={lyricsContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 music-scroll"
      >
        {hasSynced ? (
          /* ── Synced lyrics (timed) ── */
          <div className="space-y-4">
            {track.lyrics!.map((line, i) => (
              <div
                key={i}
                ref={i === activeLineIndex ? activeLineRef : undefined}
                className="transition-all duration-300"
                style={{
                  color:
                    i === activeLineIndex
                      ? 'var(--music-accent)'
                      : i < activeLineIndex
                      ? 'var(--music-text-tertiary)'
                      : 'var(--music-text-secondary)',
                  fontSize: i === activeLineIndex ? '1rem' : '0.875rem',
                  fontWeight: i === activeLineIndex ? 700 : 400,
                  opacity: i < activeLineIndex ? 0.4 : 1,
                  transform:
                    i === activeLineIndex ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>
        ) : (
          /* ── Unsynced lyrics (plain text) ── */
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--music-text-secondary)]">
            {track.lyricsText}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue Tab — Aktueller, Nächste, History + Aktionen                 */
/* ------------------------------------------------------------------ */

function QueueTab({
  queue,
  currentIndex,
  history,
  onPlayFromQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onClearQueue,
}: {
  queue: ReturnType<typeof useMusicPlayerStore.getState>['queue'];
  currentIndex: number;
  history: ReturnType<typeof useMusicPlayerStore.getState>['history'];
  onPlayFromQueue: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onReorderQueue: (from: number, to: number) => void;
  onClearQueue: () => void;
}) {
  const hasAny = queue.length > 0 || history.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ListMusic className="mb-3 h-12 w-12 text-[var(--music-text-disabled)]" />
        <p className="text-sm font-bold text-[var(--music-text-primary)]">Warteschlange leer</p>
        <p className="mt-1 text-xs text-[var(--music-text-secondary)]">
          Spiele Musik ab, um die Queue zu füllen.
        </p>
      </div>
    );
  }

  const nextTracks = queue.slice(currentIndex + 1);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--music-text-secondary)]">
          Warteschlange ({queue.length})
        </h3>
        <button
          onClick={onClearQueue}
          className="p-1 text-[var(--music-text-secondary)] hover:text-[var(--music-error)]"
          aria-label="Queue leeren"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* ── History (bereits gespielt, ausgegraut) ── */}
      {history.length > 0 && (
        <div className="px-2 pb-1">
          <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--music-text-tertiary)]">
            Bereits gespielt ({history.length})
          </p>
          {history.map((entry, i) => (
            <QueueItem
              key={`history-${entry.track.id}-${i}`}
              track={entry.track}
              dimmed
              onPlay={() => {}}
              onRemove={() => {}}
            />
          ))}
        </div>
      )}

      {/* ── Current Track (hervorgehoben) ── */}
      {queue[currentIndex] && (
        <div className="px-2 pb-1">
          <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--music-text-tertiary)]">
            Aktuell
          </p>
          <QueueItem
            track={queue[currentIndex]!}
            index={currentIndex}
            isActive
            onPlay={onPlayFromQueue}
            onRemove={onRemoveFromQueue}
          />
        </div>
      )}

      {/* ── Next Up ── */}
      {nextTracks.length > 0 && (
        <div className="px-2 pb-1">
          <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--music-text-tertiary)]">
            Als Nächstes ({nextTracks.length})
          </p>
          {nextTracks.map((track, i) => (
            <QueueItem
              key={`next-${track.id}-${i}`}
              track={track}
              index={currentIndex + 1 + i}
              onPlay={onPlayFromQueue}
              onRemove={onRemoveFromQueue}
              onMoveUp={
                i > 0
                  ? () => onReorderQueue(currentIndex + 1 + i, currentIndex + i)
                  : undefined
              }
              onMoveDown={
                i < nextTracks.length - 1
                  ? () => onReorderQueue(currentIndex + 1 + i, currentIndex + 2 + i)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue Item                                                         */
/* ------------------------------------------------------------------ */

interface QueueItemProps {
  track: NonNullable<ReturnType<typeof useMusicPlayerStore.getState>['currentTrack']>;
  index?: number;
  isActive?: boolean;
  dimmed?: boolean;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function QueueItem({
  track,
  index,
  isActive = false,
  dimmed = false,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
}: QueueItemProps) {
  const hasActions = !dimmed;

  return (
    <div
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--music-bg-card)]"
      style={{ opacity: dimmed ? 0.4 : 1 }}
      onDoubleClick={() => {
        if (index != null && !dimmed && !isActive) onPlay(index);
      }}
    >
      {/* Cover */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded">
        <MusicImage
          src={track.coverUrl}
          alt={track.album}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={
            'truncate text-sm ' +
            (isActive
              ? 'font-medium text-[var(--music-accent)]'
              : dimmed
              ? 'text-[var(--music-text-tertiary)]'
              : 'text-[var(--music-text-primary)]')
          }
        >
          {track.title}
        </p>
        <p className="truncate text-xs text-[var(--music-text-secondary)]">{track.artist}</p>
      </div>

      {/* Soundbar if active */}
      {isActive && (
        <div className="music-soundbar flex items-end gap-0.5">
          <span style={{ width: 3, height: 8 }} />
          <span style={{ width: 3, height: 12 }} />
          <span style={{ width: 3, height: 6 }} />
        </div>
      )}

      {/* Duration */}
      <span className="shrink-0 text-xs tabular-nums text-[var(--music-text-tertiary)]">
        {formatTime(track.duration)}
      </span>

      {/* Action buttons (visible on hover) — only for non-dimmed items */}
      {hasActions && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              className="p-0.5 text-[var(--music-text-tertiary)] hover:text-white"
              aria-label="Nach oben"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              className="p-0.5 text-[var(--music-text-tertiary)] hover:text-white"
              aria-label="Nach unten"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          )}
          {index != null && !isActive && (
            <button
              onClick={() => onPlay(index)}
              className="p-0.5 text-[var(--music-text-tertiary)] hover:text-[var(--music-accent)]"
              aria-label="Direkt abspielen"
            >
              <Play className="h-3 w-3" />
            </button>
          )}
          {index != null && (
            <button
              onClick={() => onRemove(index)}
              className="p-0.5 text-[var(--music-text-tertiary)] hover:text-[var(--music-error)]"
              aria-label="Entfernen"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empfehlungen Tab — Platzhalter für ähnliche Songs/Künstler         */
/* ------------------------------------------------------------------ */

function EmpfehlungenTab({
  track,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <Sparkles className="mb-4 h-16 w-16 text-[var(--music-text-disabled)]" />
      <p className="text-base font-bold text-[var(--music-text-primary)]">Empfehlungen</p>
      <p className="mt-2 text-xs text-[var(--music-text-secondary)] leading-relaxed max-w-[240px]">
        Ähnliche Songs und Künstler basierend auf
        <br />
        <span className="font-medium text-[var(--music-text-primary)]">
          „{track?.title ?? 'diesen Titel'}"
        </span>
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-2.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Music className="h-4 w-4 text-[var(--music-text-tertiary)]" />
          <span className="text-xs text-[var(--music-text-tertiary)]">
            Ähnliche Künstler werden bald angezeigt
          </span>
        </div>
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-2.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Sparkles className="h-4 w-4 text-[var(--music-text-tertiary)]" />
          <span className="text-xs text-[var(--music-text-tertiary)]">
            Song-Empfehlungen in Kürze verfügbar
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini Player                                                        */
/* ------------------------------------------------------------------ */

function MiniPlayer({
  track,
  onClose,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed bottom-[100px] right-4 z-50 flex w-80 items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] px-4 py-3 shadow-2xl backdrop-blur-xl"
      style={{ height: '80px' }}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded">
        <MusicImage
          src={track?.coverUrl}
          alt={track?.title ?? 'Cover'}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--music-text-primary)]">
          {track?.title ?? '--'}
        </p>
        <p className="truncate text-xs text-[var(--music-text-secondary)]">
          {track?.artist ?? ''}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-[var(--music-text-secondary)] hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fullscreen Now Playing                                             */
/* ------------------------------------------------------------------ */

function FullscreenNowPlaying({
  track,
  status,
  position,
  duration,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  shuffle,
  repeatMode,
  onShuffle,
  onRepeat,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
  status: string;
  position: number;
  duration: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (t: number) => void;
  shuffle: boolean;
  repeatMode: string;
  onShuffle: () => void;
  onRepeat: () => void;
}) {
  const isPlaying = status === 'playing';
  const progressRef = useRef<HTMLDivElement>(null);

  const handleSeek = useCallback(
    (e: React.MouseEvent) => {
      const bar = progressRef.current;
      if (!bar || duration === 0) return;
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      onSeek(Math.max(0, Math.min(1, pct)) * duration);
    },
    [duration, onSeek],
  );

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[var(--music-bg-base)]">
      {/* Blurred background */}
      {track?.coverUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${track.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px)',
            opacity: 0.3,
            transform: 'scale(1.2)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 p-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 text-white/60 hover:text-white"
        >
          <ChevronDown className="h-6 w-6" />
        </button>

        {/* Cover */}
        <div
          className="overflow-hidden rounded-lg shadow-2xl"
          style={{
            width: '400px',
            height: '400px',
            maxWidth: '60vw',
            maxHeight: '40vh',
          }}
        >
          <MusicImage
            src={track?.coverUrl}
            alt={track?.album ?? 'Cover'}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{track?.title ?? '--'}</p>
          <p className="text-lg text-[var(--music-text-secondary)]">
            {track?.artist ?? 'Unbekannt'}
          </p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="w-12 text-right text-xs tabular-nums text-[var(--music-text-secondary)]">
              {formatTime(position)}
            </span>
            <div
              ref={progressRef}
              className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-[rgba(255,255,255,0.15)]"
              onClick={handleSeek}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[var(--music-accent)]"
                style={{
                  width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="w-12 text-xs tabular-nums text-[var(--music-text-secondary)]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={onShuffle}
            className={
              shuffle
                ? 'text-[var(--music-accent)]'
                : 'text-[var(--music-text-secondary)] hover:text-white'
            }
          >
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={onPrev} className="text-white hover:text-[var(--music-text-secondary)]">
            <SkipBack className="h-7 w-7" />
          </button>
          <button
            onClick={onTogglePlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-black text-black" />
            ) : (
              <Play className="h-6 w-6 fill-black text-black" />
            )}
          </button>
          <button onClick={onNext} className="text-white hover:text-[var(--music-text-secondary)]">
            <SkipForward className="h-7 w-7" />
          </button>
          <button
            onClick={onRepeat}
            className={
              repeatMode !== 'off'
                ? 'text-[var(--music-accent)]'
                : 'text-[var(--music-text-secondary)] hover:text-white'
            }
          >
            <Repeat className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
