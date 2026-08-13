'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { Play, Clock, CheckCircle, Circle } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { getImageUrl, formatRuntime } from '@/lib/jellyfin-media-api';

/* ------------------------------------------------------------------ */
/*  EpisodeList                                                        */
/* ------------------------------------------------------------------ */

interface EpisodeListProps {
  episodes: JellyfinMediaItem[];
  serverId: string;
  onPlay?: (episode: JellyfinMediaItem) => void;
  onToggleWatched?: (episode: JellyfinMediaItem) => void;
  className?: string;
}

export function EpisodeList({ episodes, serverId, onPlay, onToggleWatched, className }: EpisodeListProps) {
  const sorted = [...episodes].sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));

  return (
    <div className={cn('space-y-1', className)}>
      {sorted.map((episode) => {
        const progress = episode.UserData?.PlaybackPositionTicks && episode.RunTimeTicks
          ? Math.round((episode.UserData.PlaybackPositionTicks / episode.RunTimeTicks) * 100)
          : 0;
        const watched = episode.UserData?.Played ?? false;

        return (
          <div
            key={episode.Id}
            className={cn(
              'group flex gap-4 rounded-xl border border-border bg-bg-surface p-3 transition-all',
              'hover:border-brand-500/30 hover:bg-brand-500/5 cursor-pointer',
            )}
            onClick={() => onPlay?.(episode)}
          >
            {/* Thumbnail */}
            <div className="relative w-[120px] shrink-0 overflow-hidden rounded-lg aspect-video bg-black/40">
              <img
                src={getImageUrl(serverId, episode.Id, 240, 135)}
                alt={episode.Name}
                className="h-full w-full object-cover"
                loading="lazy"
                crossOrigin="anonymous"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/40">
                <Play className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/60">
                  <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {episode.IndexNumber && <span className="text-fg-muted mr-1.5">{episode.IndexNumber}.</span>}
                    {episode.Name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onToggleWatched ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleWatched(episode); }}
                      aria-label={watched ? 'Als ungesehen markieren' : 'Als gesehen markieren'}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-muted/60 transition-colors"
                    >
                      {watched
                        ? <CheckCircle className="h-5 w-5 text-green-400" />
                        : <Circle className="h-5 w-5 text-fg-muted/50 hover:text-fg" />}
                    </button>
                  ) : watched ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-fg-muted/30" />
                  )}
                  {episode.RunTimeTicks && (
                    <span className="flex items-center gap-1 text-xs text-fg-muted">
                      <Clock className="h-3 w-3" />
                      {formatRuntime(episode.RunTimeTicks)}
                    </span>
                  )}
                </div>
              </div>
              {episode.Overview && (
                <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed">
                  {episode.Overview}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
