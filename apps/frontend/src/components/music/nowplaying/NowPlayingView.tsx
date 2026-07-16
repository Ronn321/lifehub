'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Music2,
  Trash2,
  Star,
  Disc3,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicImage } from '@/components/music/shared/MusicCard';
import { formatTime } from '@/lib/music-api';
import { LyricsOverlay } from '@/components/music/player/LyricsOverlay';
import { extractDominantColor, rgbToCss } from '@/lib/color-extraction';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

/* ------------------------------------------------------------------ */
/*  NowPlayingView — Right Sidebar / Fullscreen / Mini Player         */
/*  Spec: spotify_now_playing_view.md                                  */
/*  3 Tabs: Now Playing, Lyrics, Queue                                 */
/*  Queue: Aktueller, Nächste, History + Aktionen                     */
/* ------------------------------------------------------------------ */

type TabId = 'nowplaying' | 'lyrics' | 'queue';

type NowPlayingMode = 'sidebar' | 'fullscreen' | 'mini';

interface NowPlayingViewProps {
  mode: NowPlayingMode;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'nowplaying', label: 'Now Playing', icon: <Disc3 className="h-3.5 w-3.5" /> },
  { id: 'lyrics', label: 'Lyrics', icon: <Music2 className="h-3.5 w-3.5" /> },
  { id: 'queue', label: 'Queue', icon: <ListMusic className="h-3.5 w-3.5" /> },
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
  const [activeTab, setActiveTab] = useState<TabId>('nowplaying');
  const [sidebarGradientColor, setSidebarGradientColor] = useState('#1e1e1e');

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

  // Extract dominant color from current track cover for sidebar gradient
  useEffect(() => {
    if (!currentTrack?.coverUrl) return;
    extractDominantColor(currentTrack.coverUrl)
      .then((rgb) => setSidebarGradientColor(rgbToCss(rgb)))
      .catch(() => setSidebarGradientColor('#1e1e1e'));
  }, [currentTrack?.coverUrl]);

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
      style={{
        width: 'var(--music-right-sidebar-width, 360px)',
        background: `linear-gradient(to bottom, ${sidebarGradientColor} 0%, transparent 50%, var(--music-bg-base) 100%)`,
        transition: 'background 500ms ease-out',
      }}
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
        {activeTab === 'nowplaying' && <NowPlayingTab track={currentTrack} />}
        {activeTab === 'lyrics' && <LyricsOverlay variant="inline" />}
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
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Now Playing Tab — merged album/info/inhalt + playback controls     */
/* ------------------------------------------------------------------ */

function CrossFadeCover({ src, alt }: { src?: string; alt: string }) {
  const [prevSrc, setPrevSrc] = useState<string | undefined>();
  const [fading, setFading] = useState(false);
  const stableRef = useRef<string | undefined>();

  useEffect(() => {
    if (!src) return;
    const old = stableRef.current;
    stableRef.current = src;

    if (old && old !== src) {
      setPrevSrc(old);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFading(true);
        });
      });
      const timer = setTimeout(() => {
        setPrevSrc(undefined);
        setFading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [src]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg shadow-2xl"
      style={{ aspectRatio: '1/1', maxWidth: '280px' }}
    >
      {prevSrc && (
        <div
          className="absolute inset-0"
          style={{
            opacity: fading ? 0 : 1,
            transition: 'opacity 300ms ease-in-out',
          }}
        >
          <MusicImage src={prevSrc} alt={alt} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="absolute inset-0">
        <MusicImage src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function NowPlayingTab({
  track,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
}) {
  const { status, togglePlay, next, previous } = useMusicPlayerStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [rating, setRating] = useState(0);
  const isPlaying = status === 'playing';

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Disc3 className="mb-3 h-12 w-12 text-[var(--music-text-disabled)]" />
        <p className="text-sm font-bold text-[var(--music-text-primary)]">Kein Titel ausgewählt</p>
      </div>
    );
  }

  const infoRows: { label: string; value: string }[] = [
    { label: 'Genre', value: track.genre ?? '--' },
    { label: 'Jahr', value: track.year?.toString() ?? '--' },
    { label: 'Bitrate', value: formatBitrate(track.bitrate) },
    { label: 'Samplingrate', value: formatSampleRate(track.sampleRate) },
    { label: 'Codec', value: track.quality ?? '--' },
    { label: 'Dauer', value: formatTime(track.duration) },
    { label: 'Dateigröße', value: formatFileSize(track.fileSize) },
  ];

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Large Cover with cross-fade */}
      <CrossFadeCover src={track.coverUrl} alt={track.album ?? 'Cover'} />

      {/* Track Info */}
      <div className="w-full text-center">
        <p className="text-lg font-bold text-[var(--music-text-primary)] leading-tight">
          {track.title ?? '--'}
        </p>
        <p className="mt-1 text-sm text-[var(--music-text-secondary)]">
          {track.artist ?? 'Unbekannt'}
        </p>
        {track.album && (
          <p className="mt-0.5 text-xs text-[var(--music-text-tertiary)]">{track.album}</p>
        )}
      </div>

      {/* Favorite + Rating */}
      <div className="flex flex-col items-center gap-2">
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

      {/* Playback Controls — Play/Pause 32px circle, Prev/Next 20px */}
      <div className="flex items-center gap-4">
        <button
          onClick={previous}
          className="flex items-center justify-center text-[var(--music-text-secondary)] hover:text-white transition-colors"
          style={{ width: '20px', height: '20px' }}
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          onClick={togglePlay}
          className="flex items-center justify-center rounded-full"
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--music-accent)',
            color: 'var(--music-bg-base)',
          }}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={next}
          className="flex items-center justify-center text-[var(--music-text-secondary)] hover:text-white transition-colors"
          style={{ width: '20px', height: '20px' }}
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      {/* Technical Info */}
      <div className="w-full">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--music-text-secondary)]">
          Songinformationen
        </h3>
        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-xs text-[var(--music-text-tertiary)]">{label}</span>
              <span className="text-xs font-medium text-[var(--music-text-primary)]">{value}</span>
            </div>
          ))}
        </div>
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
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

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
  const nextIndices = nextTracks.map((_, i) => currentIndex + 1 + i);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderQueue(Number(active.id), Number(over.id));
  }

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={nextIndices}
              strategy={verticalListSortingStrategy}
            >
              {nextTracks.map((track, i) => {
                const globalIndex = currentIndex + 1 + i;
                return (
                  <SortableQueueItem
                    key={`next-${track.id}-${i}`}
                    id={globalIndex}
                    track={track}
                    index={globalIndex}
                    onPlay={onPlayFromQueue}
                    onRemove={onRemoveFromQueue}
                    onMoveUp={
                      i > 0
                        ? () => onReorderQueue(globalIndex, globalIndex - 1)
                        : undefined
                    }
                    onMoveDown={
                      i < nextTracks.length - 1
                        ? () => onReorderQueue(globalIndex, globalIndex + 1)
                        : undefined
                    }
                  />
                );
              })}
            </SortableContext>
            <DragOverlay>
              {activeId != null && queue[activeId] ? (
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-[var(--music-bg-elevated)] shadow-xl opacity-90">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded">
                    <MusicImage
                      src={queue[activeId].coverUrl}
                      alt={queue[activeId].album ?? 'Cover'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--music-text-primary)]">
                      {queue[activeId].title}
                    </p>
                    <p className="truncate text-xs text-[var(--music-text-secondary)]">
                      {queue[activeId].artist}
                    </p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable Queue Item — drag & drop wrapper                          */
/* ------------------------------------------------------------------ */

interface SortableQueueItemProps extends QueueItemProps {
  id: number;
}

function SortableQueueItem({ id, ...itemProps }: SortableQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition: `${transition}`,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <QueueItem {...itemProps} />
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
    <div className="fixed inset-0 z-[var(--music-z-dialog)] flex flex-col bg-[var(--music-bg-base)]">
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
