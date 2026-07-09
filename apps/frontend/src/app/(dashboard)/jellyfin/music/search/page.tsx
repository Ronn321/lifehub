'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import {
  useJellyfinServer,
  useMusicSearch,
  useGenres,
  usePlayTracks,
  getCoverUrl,
  jellyfinItemToTrack,
} from '@/lib/music-api';
import { useAuthStore } from '@/lib/auth-store';
import type { JellyfinApiItem } from '@/lib/music-api';
import { MusicCard, MusicCardGrid, MusicLoader } from '@/components/music/shared/MusicCard';
import { SongRow, TracklistHeader, MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

/* ------------------------------------------------------------------ */
/*  Genre Card Hue Helper                                             */
/* ------------------------------------------------------------------ */

function genreHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

/* ------------------------------------------------------------------ */
/*  Top Result Subtitle Helper                                        */
/* ------------------------------------------------------------------ */

function topResultSubtitle(item: JellyfinApiItem): string {
  if (item.Type === 'MusicArtist') return 'Künstler';
  if (item.Type === 'MusicAlbum') return item.AlbumArtist ?? item.Artist ?? 'Album';
  return item.Artist ?? item.AlbumArtist ?? 'Künstler';
}

/* ------------------------------------------------------------------ */
/*  Search Page                                                       */
/* ------------------------------------------------------------------ */

export default function MusicSearchPage() {
  const server = useJellyfinServer();
  const accessToken = useAuthStore((s) => s.accessToken);
  const playTracks = usePlayTracks();
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);

  /* ── State ── */

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Queries ── */

  const { data: searchResults, isLoading: searchLoading } = useMusicSearch(
    server?.id,
    debouncedQuery,
  );
  const { data: genres, isLoading: genresLoading } = useGenres(server?.id);

  const hasQuery = debouncedQuery.length > 1;
  const showGenres = !hasQuery;

  /* ── Top Result ── */

  const topResult = hasQuery && searchResults
    ? (searchResults.Artists?.[0] ?? searchResults.Albums?.[0] ?? searchResults.Songs?.[0])
    : null;

  /* ── Play handlers ── */

  const playSong = useCallback(
    (item: JellyfinApiItem) => {
      if (!server?.id || !accessToken) return;
      const songs = searchResults?.Songs ?? [];
      const idx = songs.findIndex((s) => s.Id === item.Id);
      playTracks(idx >= 0 ? songs : [item], Math.max(0, idx), server.id);
    },
    [server?.id, accessToken, searchResults, playTracks],
  );

  const playAllSongs = useCallback(() => {
    if (!server?.id || !accessToken || !searchResults?.Songs?.length) return;
    playTracks(searchResults.Songs, 0, server.id);
  }, [server?.id, accessToken, searchResults, playTracks]);

  const hasNoResults = hasQuery && !searchLoading && searchResults &&
    (!searchResults.Artists || searchResults.Artists.length === 0) &&
    (!searchResults.Albums || searchResults.Albums.length === 0) &&
    (!searchResults.Songs || searchResults.Songs.length === 0);

  /* ── Render ── */

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
        <MusicPageShell sidebarProps={{}} className="music-fade-in">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* ================================================================ */}
            {/*  Search Input                                                    */}
            {/* ================================================================ */}

            <div className="relative" style={{ maxWidth: '480px' }}>
              <SearchIcon
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: 'var(--music-text-secondary)' }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Was möchtest du wiedergeben?"
                autoFocus
                className="w-full rounded-full border-none py-3 pl-12 pr-12 text-sm font-medium outline-none transition-all placeholder:text-[var(--music-text-tertiary)]"
                style={{
                  background: 'var(--music-bg-card)',
                  color: 'var(--music-text-primary)',
                }}
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setDebouncedQuery(''); }}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-[var(--music-bg-hover)]"
                  aria-label="Suche löschen"
                >
                  <X className="h-4 w-4" style={{ color: 'var(--music-text-secondary)' }} />
                </button>
              )}
            </div>

            {/* ================================================================ */}
            {/*  Loading                                                       */}
            {/* ================================================================ */}

            {searchLoading && <MusicLoader />}

            {/* ================================================================ */}
            {/*  Empty State — Browse Genres                                    */}
            {/* ================================================================ */}

            {showGenres && !genresLoading && genres && genres.length > 0 && (
              <section className="space-y-4">
                <h2
                  className="text-xl font-bold"
                  style={{ color: 'var(--music-text-primary)' }}
                >
                  Stöbere nach Genre
                </h2>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
                >
                  {genres.map((genre) => {
                    const hue = genreHue(genre.Name);
                    return (
                      <button
                        key={genre.Id}
                        className="group relative flex aspect-video items-end rounded-lg p-4 text-left font-bold transition-all hover:scale-[1.02] hover:shadow-lg"
                        style={{
                          background: `hsl(${hue}, 45%, 25%)`,
                          color: '#fff',
                        }}
                      >
                        <span className="text-base leading-tight drop-shadow-md">
                          {genre.Name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ================================================================ */}
            {/*  Search Results                                                 */}
            {/* ================================================================ */}

            {hasQuery && searchResults && !searchLoading && (
              <>
                {/* ─── Top Result ─── */}
                {topResult && (
                  <section className="space-y-3">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: 'var(--music-text-primary)' }}
                    >
                      Top-Ergebnis
                    </h2>
                    <div className="max-w-xs">
                      <MusicCard
                        title={topResult.Name}
                        subtitle={topResultSubtitle(topResult)}
                        coverUrl={getCoverUrl(
                          accessToken ?? '',
                          server?.id ?? '',
                          topResult.Type === 'MusicArtist'
                            ? topResult.Id
                            : (topResult.AlbumId ?? topResult.Id),
                        )}
                        onClick={
                          topResult.Type !== 'MusicArtist' && topResult.Type !== 'MusicAlbum'
                            ? () => playSong(topResult)
                            : undefined
                        }
                        onPlay={
                          topResult.Type !== 'MusicArtist' && topResult.Type !== 'MusicAlbum'
                            ? () => playSong(topResult)
                            : undefined
                        }
                        rounded={topResult.Type === 'MusicArtist'}
                      />
                    </div>
                  </section>
                )}

                {/* ─── Artists ─── */}
                {searchResults.Artists && searchResults.Artists.length > 0 && (
                  <section className="space-y-3">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: 'var(--music-text-primary)' }}
                    >
                      Künstler
                    </h2>
                    <MusicCardGrid>
                      {searchResults.Artists.slice(0, 10).map((artist) => (
                        <MusicCard
                          key={artist.Id}
                          title={artist.Name}
                          subtitle="Künstler"
                          coverUrl={getCoverUrl(accessToken ?? '', server?.id ?? '', artist.Id)}
                          rounded
                        />
                      ))}
                    </MusicCardGrid>
                  </section>
                )}

                {/* ─── Albums ─── */}
                {searchResults.Albums && searchResults.Albums.length > 0 && (
                  <section className="space-y-3">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: 'var(--music-text-primary)' }}
                    >
                      Alben
                    </h2>
                    <MusicCardGrid>
                      {searchResults.Albums.slice(0, 10).map((album) => (
                        <MusicCard
                          key={album.Id}
                          title={album.Name}
                          subtitle={album.AlbumArtist ?? album.Artist ?? ''}
                          coverUrl={getCoverUrl(accessToken ?? '', server?.id ?? '', album.Id)}
                        />
                      ))}
                    </MusicCardGrid>
                  </section>
                )}

                {/* ─── Songs ─── */}
                {searchResults.Songs && searchResults.Songs.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2
                        className="text-xl font-bold"
                        style={{ color: 'var(--music-text-primary)' }}
                      >
                        Songs
                      </h2>
                      <button
                        onClick={playAllSongs}
                        className="rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wide transition-all hover:opacity-80"
                        style={{
                          background: 'var(--music-accent)',
                          color: '#000',
                        }}
                      >
                        Alle abspielen
                      </button>
                    </div>

                    <TracklistHeader showAlbum />

                    {searchResults.Songs.slice(0, 50).map((item, idx) => {
                      const track = jellyfinItemToTrack(item, accessToken ?? '', server?.id ?? '');
                      const isPlaying = currentTrack?.id === item.Id;
                      return (
                        <SongRow
                          key={item.Id}
                          index={idx}
                          track={track}
                          isPlaying={isPlaying}
                          onPlay={() => playSong(item)}
                          showAlbum
                        />
                      );
                    })}
                  </section>
                )}

                {/* ─── No Results ─── */}
                {hasNoResults && (
                  <MusicEmptyState
                    title={`Keine Ergebnisse für „${debouncedQuery}"`}
                    description="Versuche einen anderen Suchbegriff."
                  />
                )}
              </>
            )}
          </div>
        </MusicPageShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}
