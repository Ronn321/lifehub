'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Music, Disc3, ChevronLeft, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { getMediaStreamUrl } from '@/lib/media';
import { usePlayerStore } from '@/lib/player-store';
import { AlbumView } from './AlbumView';
import type { PlayerFileInfo } from '@/lib/player-store';

interface ArtistInfo {
  name: string;
  albumCount: number;
  trackCount: number;
}

interface AlbumInfo {
  name: string;
  artist: string;
  year: number;
  coverFileId?: string;
  trackCount: number;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 text-fg-muted">
      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      <span>Laden …</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-medium">Fehler beim Laden</p>
        <p className="mt-1 text-sm text-danger/80">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-sm underline hover:no-underline">
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted">
      <Icon className="mb-3 h-12 w-12 opacity-30" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-center text-sm">{description}</p>
    </div>
  );
}

export function MusicLibrary() {
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const play = usePlayerStore((s) => s.play);

  const artistsQuery = useQuery<ArtistInfo[]>({
    queryKey: ['media-music-artists'],
    queryFn: () => api.get('/media/music/artists'),
    staleTime: 60_000,
  });

  const albumsQuery = useQuery<AlbumInfo[]>({
    queryKey: ['media-music-albums', selectedArtist],
    queryFn: () => api.get(`/media/music/albums?artist=${encodeURIComponent(selectedArtist!)}`),
    staleTime: 60_000,
    enabled: !!selectedArtist,
  });

  const tracksQuery = useQuery<PlayerFileInfo[]>({
    queryKey: ['media-music-tracks', selectedArtist, selectedAlbum],
    queryFn: () =>
      api.get(
        `/media/music/tracks?artist=${encodeURIComponent(selectedArtist!)}&album=${encodeURIComponent(selectedAlbum!)}`,
      ),
    staleTime: 60_000,
    enabled: !!selectedArtist && !!selectedAlbum,
  });

  const selectedAlbumInfo =
    selectedArtist && selectedAlbum
      ? albumsQuery.data?.find((a) => a.name === selectedAlbum) ?? null
      : null;

  if (!selectedArtist) {
    if (artistsQuery.isLoading) return <LoadingState />;
    if (artistsQuery.error)
      return <ErrorState message={(artistsQuery.error as Error).message} onRetry={() => artistsQuery.refetch()} />;
    if (!artistsQuery.data || artistsQuery.data.length === 0)
      return <EmptyState icon={Music} title="Keine Interpreten gefunden" description="Es wurden noch keine Audio-Dateien indexiert." />;

    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-fg">Interpreten</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {artistsQuery.data.map((artist) => (
            <button
              key={artist.name}
              onClick={() => setSelectedArtist(artist.name)}
              className="group rounded-lg border border-border bg-bg-surface p-4 text-left transition-colors hover:border-brand-500/30 hover:bg-bg-raised"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-bg-raised group-hover:bg-bg">
                <Music className="h-7 w-7 text-fg-muted" />
              </div>
              <p className="truncate font-medium text-fg">{artist.name}</p>
              <p className="text-xs text-fg-muted">
                {artist.albumCount} {artist.albumCount === 1 ? 'Album' : 'Alben'} · {artist.trackCount}{' '}
                {artist.trackCount === 1 ? 'Track' : 'Tracks'}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedAlbum) {
    if (albumsQuery.isLoading) return <LoadingState />;
    if (albumsQuery.error)
      return (
        <div>
          <BackButton onClick={() => setSelectedArtist(null)} label="Alle Interpreten" />
          <ErrorState message={(albumsQuery.error as Error).message} onRetry={() => albumsQuery.refetch()} />
        </div>
      );
    if (!albumsQuery.data || albumsQuery.data.length === 0)
      return (
        <div>
          <BackButton onClick={() => setSelectedArtist(null)} label="Alle Interpreten" />
          <EmptyState icon={Disc3} title="Keine Alben gefunden" description={`Keine Alben von „${selectedArtist}" gefunden.`} />
        </div>
      );

    return (
      <div>
        <BackButton onClick={() => setSelectedArtist(null)} label="Alle Interpreten" />
        <h2 className="mb-4 text-lg font-semibold text-fg">Alben von {selectedArtist}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albumsQuery.data.map((album) => (
            <button
              key={album.name}
              onClick={() => setSelectedAlbum(album.name)}
              className="group rounded-lg border border-border bg-bg-surface p-4 text-left transition-colors hover:border-brand-500/30 hover:bg-bg-raised"
            >
              <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-bg-raised group-hover:bg-bg">
                {album.coverFileId ? (
                  <img
                    src={getMediaStreamUrl(album.coverFileId)}
                    alt={album.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Music className="h-8 w-8 text-fg-muted" />
                )}
              </div>
              <p className="truncate font-medium text-fg">{album.name}</p>
              <p className="text-xs text-fg-muted">
                {album.year > 0 ? album.year : 'Unbekannt'} · {album.trackCount}{' '}
                {album.trackCount === 1 ? 'Track' : 'Tracks'}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (tracksQuery.isLoading) return <LoadingState />;
  if (tracksQuery.error)
    return (
      <div>
        <BackButton onClick={() => setSelectedAlbum(null)} label="Alle Alben" />
        <ErrorState message={(tracksQuery.error as Error).message} onRetry={() => tracksQuery.refetch()} />
      </div>
    );
  if (!tracksQuery.data || tracksQuery.data.length === 0)
    return (
      <div>
        <BackButton onClick={() => setSelectedAlbum(null)} label="Alle Alben" />
        <EmptyState icon={Disc3} title="Keine Tracks gefunden" description={`Keine Tracks in „${selectedAlbum}" gefunden.`} />
      </div>
    );

  const tracks = tracksQuery.data;

  return (
    <div>
      <BackButton onClick={() => setSelectedAlbum(null)} label="Alle Alben" />
      <AlbumView
        artist={selectedArtist}
        albumName={selectedAlbum}
        tracks={tracks}
        coverFileId={selectedAlbumInfo?.coverFileId}
        year={selectedAlbumInfo?.year}
      />
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
