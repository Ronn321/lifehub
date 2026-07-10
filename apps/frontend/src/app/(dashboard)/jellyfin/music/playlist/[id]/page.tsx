'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  usePlaylist,
  usePlaylistItems,
  getPlaylistCoverUrl,
  usePlayTracks,
} from '@/lib/music-api';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';
import { PlaylistHeader } from '@/components/music/playlist/PlaylistHeader';
import { PlaylistSongTable } from '@/components/music/playlist/PlaylistSongTable';
import { MusicLoader } from '@/components/music/shared/MusicCard';

/* ------------------------------------------------------------------ */
/*  Playlist Detail Page                                               */
/* ------------------------------------------------------------------ */

export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = params.id as string;

  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  const { data: playlist, isLoading: playlistLoading } = usePlaylist(server?.id, playlistId);
  const { data: items, isLoading: itemsLoading } = usePlaylistItems(server?.id, playlistId);
  const playTracks = usePlayTracks();

  const isLoading = playlistLoading || itemsLoading;
  const songs = items ?? [];

  if (!accessToken || !server) {
    return (
      <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
        <div className="flex-1 overflow-y-auto music-scroll">
          <MusicPageShell sidebarProps={{ activeTab: 'playlists' }}>
            <MusicLoader />
          </MusicPageShell>
        </div>
        <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
          <MusicPlayerWrapper />
        </div>
      </div>
    );
  }

  const coverUrl = getPlaylistCoverUrl(accessToken, server.id, playlistId, 400, 400);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playTracks(songs, 0, server.id);
    }
  };

  const handleShuffle = () => {
    if (songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      playTracks(songs, randomIndex, server.id);
    }
  };

  const handlePlayTrack = (index: number) => {
    playTracks(songs, index, server.id);
  };

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
        <MusicPageShell
          sidebarProps={{ activeTab: 'playlists' }}
          stickyTitle={playlist?.Name}
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
          <div className="music-fade-in">
            {/* ── Playlist Header ── */}
            <PlaylistHeader
              playlist={playlist}
              songCount={songs.length}
              coverUrl={coverUrl}
              accessToken={accessToken}
              serverId={server.id}
              isLoading={isLoading}
              onPlayAll={handlePlayAll}
              onShuffle={handleShuffle}
            />

            {/* ── Playlist Song Table ── */}
            <PlaylistSongTable
              items={songs}
              accessToken={accessToken}
              serverId={server.id}
              playlistId={playlistId}
              isLoading={isLoading}
              onPlayTrack={handlePlayTrack}
              onPlayAll={handlePlayAll}
            />
          </div>
        </MusicPageShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}
