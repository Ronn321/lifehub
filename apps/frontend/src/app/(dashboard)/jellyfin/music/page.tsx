'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Clock, Mic2, Disc3, ListMusic, Shuffle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useRecentlyPlayed,
  useRecentAlbums,
  useArtists,
  usePlayTracks,
  getCoverUrl,
} from '@/lib/music-api';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicCard, MusicScrollRow, MusicSection, MusicSkeleton } from '@/components/music/shared/MusicCard';
import { MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Guten Morgen';
  if (h >= 12 && h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

interface QuickAccessCardData {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function QuickAccessCard({ label, icon, color, onClick }: QuickAccessCardData) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 overflow-hidden rounded-lg p-4 transition-all hover:brightness-110 active:brightness-90"
      style={{ background: color }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/20">
        {icon}
      </div>
      <span className="text-sm font-bold leading-tight text-white">{label}</span>
    </button>
  );
}

const QUICK_ACCESS_ICONS: Record<string, React.ReactNode> = {
  Lieblingssongs: <Heart className="h-6 w-6 text-white" />,
  'Zuletzt gehört': <Clock className="h-6 w-6 text-white" />,
  Künstler: <Mic2 className="h-6 w-6 text-white" />,
  Alben: <Disc3 className="h-6 w-6 text-white" />,
  Playlists: <ListMusic className="h-6 w-6 text-white" />,
  Zufallswiedergabe: <Shuffle className="h-6 w-6 text-white" />,
};
const QUICK_ACCESS_COLORS: Record<string, string> = {
  Lieblingssongs: '#e11d48', 'Zuletzt gehört': '#059669', Künstler: '#8b5cf6',
  Alben: '#d97706', Playlists: '#2563eb', Zufallswiedergabe: '#7c3aed',
};
const QUICK_ACCESS_CARDS = [
  { label: 'Lieblingssongs', icon: QUICK_ACCESS_ICONS['Lieblingssongs'], color: QUICK_ACCESS_COLORS['Lieblingssongs'] },
  { label: 'Zuletzt gehört', icon: QUICK_ACCESS_ICONS['Zuletzt gehört'], color: QUICK_ACCESS_COLORS['Zuletzt gehört'] },
  { label: 'Künstler', icon: QUICK_ACCESS_ICONS['Künstler'], color: QUICK_ACCESS_COLORS['Künstler'] },
  { label: 'Alben', icon: QUICK_ACCESS_ICONS['Alben'], color: QUICK_ACCESS_COLORS['Alben'] },
  { label: 'Playlists', icon: QUICK_ACCESS_ICONS['Playlists'], color: QUICK_ACCESS_COLORS['Playlists'] },
  { label: 'Zufallswiedergabe', icon: QUICK_ACCESS_ICONS['Zufallswiedergabe'], color: QUICK_ACCESS_COLORS['Zufallswiedergabe'] },
];

export default function MusicPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const server = useJellyfinServer();
  const { data: recentTracks, isLoading: recentLoading, error: recentError } = useRecentlyPlayed(server?.id, 12);
  const { data: newAlbums, isLoading: albumsLoading, error: albumsError } = useRecentAlbums(server?.id, 12);
  const { data: artists, isLoading: artistsLoading, error: artistsError } = useArtists(server?.id);
  const playTracks = usePlayTracks();
  const displayName = user?.displayName ?? 'Robert';
  const greeting = getGreeting();

  const handlePlayRecent = (items: typeof recentTracks, index: number) => {
    if (!server || !items) return;
    playTracks(items, index, server.id);
  };
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const buildCards = () =>
    (QUICK_ACCESS_CARDS as any[]).map((card) => {
      const onClickMap: Record<string, () => void> = {
        Lieblingssongs: () => router.push('/jellyfin/music/tracks'),
        'Zuletzt gehört': () => scrollToSection('section-recent'),
        Künstler: () => router.push('/jellyfin/music/artists'),
        Alben: () => router.push('/jellyfin/music/albums'),
        Playlists: () => router.push('/jellyfin/music/playlists'),
        Zufallswiedergabe: () => {
          if (server && recentTracks && recentTracks.length > 0) {
            const randomIdx = Math.floor(Math.random() * recentTracks.length);
            handlePlayRecent(recentTracks, randomIdx);
          }
        },
      };
      return { ...card, onClick: onClickMap[card.label] ?? (() => {}) };
    });

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden music-scroll">
        <MusicPageShell sidebarProps={{}}>
          <div className="space-y-6">
            <h1 className="text-[28px] font-bold leading-tight" style={{ color: 'var(--music-text-primary)' }}>
            {greeting}, {displayName}
          </h1>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {buildCards().map((card) => (
              <QuickAccessCard key={card.label} {...card} />
            ))}
          </div>
          <section id="section-recent">
            <MusicSection title="Zuletzt gehört" showAllHref="/jellyfin/music/tracks">
              {recentLoading ? <MusicSkeleton count={6} />
              : recentError ? <MusicEmptyState title="Fehler beim Laden" description="Die kürzlich gehörten Titel konnten nicht geladen werden." />
              : !recentTracks || recentTracks.length === 0 ? <MusicEmptyState title="Noch nichts gehört" description="Beginne Musik zu hören, um deine Geschichte aufzubauen." />
              : <MusicScrollRow>{recentTracks.map((item: any) => (
                  <div key={item.Id} className="w-44 shrink-0">
                    <MusicCard title={item.Name} subtitle={item.Artist ?? item.AlbumArtist ?? item.Album}
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.AlbumId ?? item.Id, 160, 160)}
                      onClick={() => recentTracks && handlePlayRecent(recentTracks, recentTracks.indexOf(item))}
                      onPlay={() => recentTracks && handlePlayRecent(recentTracks, recentTracks.indexOf(item))} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>
          <section>
            <MusicSection title="Neu in deiner Bibliothek" showAllHref="/jellyfin/music/albums">
              {albumsLoading ? <MusicSkeleton count={6} />
              : albumsError ? <MusicEmptyState title="Fehler beim Laden" description="Die neuen Alben konnten nicht geladen werden." />
              : !newAlbums || newAlbums.length === 0 ? <MusicEmptyState title="Keine neuen Alben" description="Neue Alben erscheinen hier, sobald sie deiner Bibliothek hinzugefügt werden." />
              : <MusicScrollRow>{newAlbums.map((item: any) => (
                  <div key={item.Id} className="w-44 shrink-0">
                    <MusicCard title={item.Name} subtitle={item.AlbumArtist}
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.Id, 160, 160)}
                      onClick={() => router.push(`/jellyfin/music/album/${item.Id}`)} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>
          <section>
            <MusicSection title="Künstler durchstöbern" showAllHref="/jellyfin/music/artists">
              {artistsLoading ? <MusicSkeleton count={6} />
              : artistsError ? <MusicEmptyState title="Fehler beim Laden" description="Die Künstler konnten nicht geladen werden." />
              : !artists || artists.length === 0 ? <MusicEmptyState title="Keine Künstler" description="Sobald deine Mediathek Musik enthält, erscheinen hier die Künstler." />
              : <MusicScrollRow>{artists.slice(0, 12).map((item: any) => (
                  <div key={item.Id} className="w-44 shrink-0">
                    <MusicCard title={item.Name} rounded
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.Id, 160, 160)}
                      onClick={() => router.push(`/jellyfin/music/artist/${item.Id}`)} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>
        </div>
      </MusicPageShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}