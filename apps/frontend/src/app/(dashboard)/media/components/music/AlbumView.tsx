'use client';

import { usePlayerStore, type PlayerFileInfo } from '@/lib/player-store';
import { getMediaStreamUrl } from '@/lib/media';
import { Play, Disc3, Clock } from 'lucide-react';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

interface AlbumViewProps {
  artist: string;
  albumName: string;
  tracks: PlayerFileInfo[];
  coverFileId?: string;
  year?: number;
}

export function AlbumView({ artist, albumName, tracks, coverFileId, year }: AlbumViewProps) {
  const play = usePlayerStore((s) => s.play);

  const coverUrl = coverFileId ? getMediaStreamUrl(coverFileId) : null;

  function handlePlayAll() {
    const first = tracks[0];
    if (first) {
      play(first, tracks);
    }
  }

  function handlePlayTrack(track: PlayerFileInfo) {
    play(track, tracks);
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-5">
        <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg-raised">
          {coverUrl ? (
            <img src={coverUrl} alt={albumName} className="h-full w-full rounded-xl object-cover" />
          ) : (
            <Disc3 className="h-14 w-14 text-fg-muted/50" />
          )}
        </div>
        <div className="flex flex-col justify-end gap-1">
          <p className="text-sm text-fg-muted">Album</p>
          <h1 className="text-2xl font-bold text-fg">{albumName}</h1>
          <p className="text-fg-muted">
            {artist}
            {year && year > 0 ? ` · ${year}` : ''}
          </p>
          <p className="text-xs text-fg-subtle">{tracks.length} {tracks.length === 1 ? 'Track' : 'Tracks'}</p>
          <button
            onClick={handlePlayAll}
            className="mt-2 flex w-fit items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-400"
          >
            <Play className="h-4 w-4 fill-current" />
            Alle abspielen
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center gap-4 border-b border-border bg-bg-surface px-4 py-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">Titel</span>
          <span className="flex w-16 items-center justify-end gap-1">
            <Clock className="h-3 w-3" />
          </span>
        </div>
        {tracks
          .sort((a, b) => a.trackNumber - b.trackNumber)
          .map((track, i) => (
            <button
              key={track.id}
              onClick={() => handlePlayTrack(track)}
              className="flex w-full items-center gap-4 px-4 py-2.5 text-left transition-colors hover:bg-bg-raised"
            >
              <span className="w-8 text-center text-sm text-fg-muted">{track.trackNumber > 0 ? track.trackNumber : i + 1}</span>
              <span className="flex-1 truncate text-sm text-fg">{titleFromFilename(track.filename)}</span>
              <span className="w-16 text-right text-xs tabular-nums text-fg-muted">{formatDuration(track.duration)}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
