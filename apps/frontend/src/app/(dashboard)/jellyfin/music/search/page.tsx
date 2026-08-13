'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search as SearchIcon, X, Clock } from 'lucide-react';
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
import { MusicCard, MusicCardGrid } from '@/components/music/shared/MusicCard';
import { SongRowSkeleton } from '@/components/music/shared/SongRowSkeleton';
import { SongRow, TracklistHeader, MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';
import { useSearchHistory } from '@/components/music/search/useSearchHistory';

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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showAllArtists, setShowAllArtists] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filter, setFilter] = useState<'alle' | 'musik' | 'alben' | 'künstler'>('alle');

  /* ── Search History ── */

  const { getHistory, addEntry, removeEntry, clearHistory } = useSearchHistory();
  const history = getHistory();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim().length > 1) {
        addEntry(query.trim());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, addEntry]);

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

  /* ── Autocomplete suggestions ── */

  const suggestions = useMemo(() => {
    const list: { label: string; type: 'history' | 'result' }[] = [];
    if (query.length < 1) return list;
    const q = query.toLowerCase();
    for (const entry of history) {
      if (list.length >= 5) break;
      if (entry.query.toLowerCase().includes(q)) {
        list.push({ label: entry.query, type: 'history' });
      }
    }
    if (searchResults) {
      const seen = new Set(list.map((s) => s.label.toLowerCase()));
      const candidates = [
        ...(searchResults.Artists || []).map((a) => ({ label: a.Name, type: 'result' as const })),
        ...(searchResults.Albums || []).map((a) => ({ label: a.Name, type: 'result' as const })),
        ...(searchResults.Songs || []).map((s) => ({ label: s.Name, type: 'result' as const })),
      ];
      for (const c of candidates) {
        if (list.length >= 5) break;
        if (!seen.has(c.label.toLowerCase()) && c.label.toLowerCase().includes(q)) {
          list.push(c);
          seen.add(c.label.toLowerCase());
        }
      }
    }
    return list;
  }, [query, history, searchResults]);

  const showAutocomplete = isInputFocused && query.length >= 1 && suggestions.length > 0;

  useEffect(() => { setSelectedIndex(-1); }, [suggestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          const sel = suggestions[selectedIndex]!;
          setQuery(sel.label);
          setDebouncedQuery(sel.label);
          setIsInputFocused(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsInputFocused(false);
        break;
    }
  };

  const hasNoResults = hasQuery && !searchLoading && searchResults &&
    (!searchResults.Artists || searchResults.Artists.length === 0) &&
    (!searchResults.Albums || searchResults.Albums.length === 0) &&
    (!searchResults.Songs || searchResults.Songs.length === 0);

  /* ── Render ── */

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFilter('alle');
                  setShowAllArtists(false);
                  setShowAllAlbums(false);
                  setShowAllSongs(false);
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                onKeyDown={handleKeyDown}
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

              {/* ── Autocomplete Dropdown ── */}
              {showAutocomplete && (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)] shadow-2xl"
                  style={{ background: 'var(--music-bg-elevated)' }}
                >
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={`${suggestion.type}-${suggestion.label}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQuery(suggestion.label);
                        setDebouncedQuery(suggestion.label);
                        setIsInputFocused(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        idx === selectedIndex ? 'bg-[var(--music-bg-hover)]' : ''
                      }`}
                      style={{ color: 'var(--music-text-primary)' }}
                    >
                      {suggestion.type === 'history' ? (
                        <Clock className="h-4 w-4 shrink-0" style={{ color: 'var(--music-text-secondary)' }} />
                      ) : (
                        <SearchIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--music-text-secondary)' }} />
                      )}
                      <span className="truncate">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ================================================================ */}
            {/*  Filter Tabs                                                    */}
            {/* ================================================================ */}

            {hasQuery && (
              <div className="flex flex-wrap gap-2">
                {(['alle', 'musik', 'alben', 'künstler'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
                    style={{
                      background: filter === f ? '#ffffff' : '#2A2A2A',
                      color: filter === f ? '#000000' : '#ffffff',
                    }}
                  >
                    {f === 'alle' ? 'Alle' : f === 'musik' ? 'Musik' : f === 'alben' ? 'Alben' : 'Künstler'}
                  </button>
                ))}
              </div>
            )}

            {/* ================================================================ */}
            {/*  Loading                                                       */}
            {/* ================================================================ */}

            {searchLoading && <SongRowSkeleton rows={8} />}

            {/* ================================================================ */}
            {/*  Search History — shown when input focused and empty             */}
            {/* ================================================================ */}

            {isInputFocused && !query && history.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: 'var(--music-text-primary)' }}
                  >
                    Zuletzt gesucht
                  </h2>
                  <button
                    onClick={() => {
                      clearHistory();
                      setIsInputFocused(false);
                    }}
                    className="text-xs font-bold uppercase tracking-wide transition-colors hover:underline"
                    style={{ color: 'var(--music-accent)' }}
                  >
                    Verlauf löschen
                  </button>
                </div>
                <div className="space-y-1">
                  {history.map((entry) => (
                    <div
                      key={`${entry.query}-${entry.timestamp}`}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--music-bg-card)]"
                    >
                      <Clock
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: 'var(--music-text-secondary)' }}
                      />
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQuery(entry.query);
                          setDebouncedQuery(entry.query);
                          setIsInputFocused(false);
                        }}
                        className="flex-1 truncate text-left text-sm font-medium transition-colors"
                        style={{ color: 'var(--music-text-primary)' }}
                      >
                        {entry.query}
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeEntry(entry.query);
                        }}
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full opacity-0 transition-all hover:bg-[var(--music-bg-hover)] group-hover:opacity-100"
                        aria-label={`„${entry.query}“ aus Verlauf entfernen`}
                      >
                        <X
                          className="h-3 w-3"
                          style={{ color: 'var(--music-text-secondary)' }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                {topResult && filter === 'alle' && (
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
                {searchResults.Artists && searchResults.Artists.length > 0 && (filter === 'alle' || filter === 'künstler') && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2
                        className="text-xl font-bold"
                        style={{ color: 'var(--music-text-primary)' }}
                      >
                        Künstler
                      </h2>
                      {searchResults.Artists.length > 4 && (
                        <button
                          onClick={() => setShowAllArtists(!showAllArtists)}
                          className="text-xs font-bold uppercase tracking-wide transition-colors hover:underline"
                          style={{ color: 'var(--music-accent)' }}
                        >
                          {showAllArtists ? 'Weniger anzeigen' : 'Alle anzeigen'}
                        </button>
                      )}
                    </div>
                    <MusicCardGrid>
                      {searchResults.Artists.slice(0, showAllArtists ? undefined : 4).map((artist) => (
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
                {searchResults.Albums && searchResults.Albums.length > 0 && (filter === 'alle' || filter === 'alben') && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2
                        className="text-xl font-bold"
                        style={{ color: 'var(--music-text-primary)' }}
                      >
                        Alben
                      </h2>
                      {searchResults.Albums.length > 4 && (
                        <button
                          onClick={() => setShowAllAlbums(!showAllAlbums)}
                          className="text-xs font-bold uppercase tracking-wide transition-colors hover:underline"
                          style={{ color: 'var(--music-accent)' }}
                        >
                          {showAllAlbums ? 'Weniger anzeigen' : 'Alle anzeigen'}
                        </button>
                      )}
                    </div>
                    <MusicCardGrid>
                      {searchResults.Albums.slice(0, showAllAlbums ? undefined : 4).map((album) => (
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
                {searchResults.Songs && searchResults.Songs.length > 0 && (filter === 'alle' || filter === 'musik') && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2
                        className="text-xl font-bold"
                        style={{ color: 'var(--music-text-primary)' }}
                      >
                        Songs
                      </h2>
                      <div className="flex items-center gap-3">
                        {searchResults.Songs.length > 4 && (
                          <button
                            onClick={() => setShowAllSongs(!showAllSongs)}
                            className="text-xs font-bold uppercase tracking-wide transition-colors hover:underline"
                            style={{ color: 'var(--music-accent)' }}
                          >
                            {showAllSongs ? 'Weniger anzeigen' : 'Alle anzeigen'}
                          </button>
                        )}
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
                    </div>

                    <TracklistHeader showAlbum />

                    {searchResults.Songs.slice(0, showAllSongs ? undefined : 4).map((item, idx) => {
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
