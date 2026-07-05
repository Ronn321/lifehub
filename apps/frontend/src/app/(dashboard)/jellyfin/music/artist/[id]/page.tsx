'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Play, ArrowLeft, Verified } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useTopSongs,
  useAlbums,
  getCoverUrl,
  jellyfinItemToTrack,
  usePlayTracks,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicAppShell } from '@/components/music/layout/MusicAppShell';
import { SongRow, TracklistHeader } from '@/components/music/shared/SongRow';
import { MusicCard, MusicCardGrid, MusicImage, MusicLoader, MusicSection } from '@/components/music/shared/MusicCard';
import { useRouter } from 'next/navigation';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

/* ------------------------------------------------------------------ */
/*  Artist Detail Page                                                 */
/* ------------------------------------------------------------------ */

export default function ArtistDetailPage() {
  const params = useParams();
  const artistId = params.id as string;
  const router = useRouter();

  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  const { data: topSongs, isLoading: songsLoading } = useTopSongs(server?.id, artistId, 10);
  const { data: albums, isLoading: albumsLoading } = useAlbums(server?.id, artistId);
  const playTracks = usePlayTracks();

  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);

  if (!accessToken || !server) {
    return (
      <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
        <div className="flex-1 overflow-y-auto music-scroll">
          <MusicAppShell sidebarProps={{ activeTab: 'artists' }}>
            <MusicLoader />
          </MusicAppShell>
        </div>
        <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
          <MusicPlayerWrapper />
        </div>
      </div>
    );
  }

  const isLoading = songsLoading || albumsLoading;
  const artistName = topSongs?.[0]?.AlbumArtist
    ?? topSongs?.[0]?.Artist
    ?? albums?.[0]?.AlbumArtist
    ?? albums?.[0]?.Artist
    ?? 'Künstler';
  const artistCover = getCoverUrl(accessToken, server.id, artistId, 400, 400);

  const handlePlayTop = () => {
    if (topSongs && topSongs.length > 0) {
      playTracks(topSongs, 0, server.id);
    }
  };

  const handlePlaySong = (index: number) => {
    if (topSongs) {
      playTracks(topSongs, index, server.id);
    }
  };

  const handlePlayAlbum = (albumId: string) => {
    router.push(`/jellyfin/music/album/${albumId}`);
  };

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
        <MusicAppShell
          sidebarProps={{ activeTab: 'artists' }}
          topBar={
            <Link
              href="/jellyfin/music"
              className="flex items-center gap-2 text-sm text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Musik
            </Link>
          }
        
        >
          <div className="music-fade-in space-y-8">
        {/* ── Artist Header ── */}
        <div className="flex flex-col items-center gap-4 pt-8 pb-4">
          <div className="h-[232px] w-[232px] overflow-hidden rounded-full shadow-xl">
            <MusicImage
              src={artistCover}
              alt={artistName}
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[var(--music-bg-card)]">
                  <span className="text-5xl font-bold text-[var(--music-text-disabled)] opacity-40">
                    {artistName.charAt(0).toUpperCase()}
                  </span>
                </div>
              }
            />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <h1 className="text-[28px] font-bold text-[var(--music-text-primary)]">
                {artistName}
              </h1>
              <Verified className="h-6 w-6 text-[var(--music-accent)]" />
            </div>
            <span className="text-sm text-[var(--music-text-secondary)]">
              Künstler
              {albums && <>, {albums.length} Alben</>}
            </span>
          </div>

          {/* Play All Button */}
          {topSongs && topSongs.length > 0 && (
            <button
              onClick={handlePlayTop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--music-accent)] text-black shadow-lg transition-all hover:scale-105 hover:bg-[var(--music-accent-hover)]"
              aria-label="Top-Songs abspielen"
            >
              <Play className="h-5 w-5 fill-black" />
            </button>
          )}
        </div>

        {/* ── Top Songs Section ── */}
        {topSongs && topSongs.length > 0 && (
          <MusicSection title="Top-Songs">
            <TracklistHeader showAlbum />
            <div>
              {topSongs.map((item, index) => {
                const track = jellyfinItemToTrack(item, accessToken, server.id);
                return (
                  <SongRow
                    key={item.Id}
                    index={index}
                    track={track}
                    isPlaying={currentTrack?.id === item.Id}
                    onPlay={() => handlePlaySong(index)}
                    showAlbum
                    showCover
                  />
                );
              })}
            </div>
          </MusicSection>
        )}

        {/* ── Loading State ── */}
        {isLoading && <MusicLoader />}

        {/* ── Discography Section ── */}
        {albums && albums.length > 0 && (
          <MusicSection title="Diskografie">
            <MusicCardGrid>
              {albums.map((album) => {
                const albumCover = getCoverUrl(accessToken, server.id, album.Id, 300, 300);
                const subtitle = [
                  album.ProductionYear ? String(album.ProductionYear) : null,
                  'Album',
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <MusicCard
                    key={album.Id}
                    title={album.Name}
                    subtitle={subtitle}
                    coverUrl={albumCover}
                    onClick={() => router.push(`/jellyfin/music/album/${album.Id}`)}
                  />
                );
              })}
            </MusicCardGrid>
          </MusicSection>
        )}

        {/* ── Empty State ── */}
        {!isLoading && (!topSongs || topSongs.length === 0) && (!albums || albums.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-medium text-[var(--music-text-secondary)]">
              Keine Inhalte gefunden
            </p>
            <p className="mt-1 text-sm text-[var(--music-text-tertiary)]">
              Für diesen Künstler wurden noch keine Songs oder Alben gefunden.
            </p>
          </div>
        )}
          </div>
        </MusicAppShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}
