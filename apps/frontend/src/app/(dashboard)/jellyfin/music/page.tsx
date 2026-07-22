'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
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

/* ------------------------------------------------------------------ */
/*  Quick Access — horizontal cover cards                              */
/* ------------------------------------------------------------------ */

interface QuickAccessCardData {
  label: string;
  meta: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAccessCard({ label, meta, icon, onClick }: QuickAccessCardData) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg p-3 transition-all hover:bg-[var(--music-bg-hover)]"
      style={{ background: 'var(--music-bg-elevated)', width: '300px' }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--music-bg-card)]">
        {icon}
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-bold text-[var(--music-text-primary)]">{label}</p>
        <p className="truncate text-xs text-[var(--music-text-secondary)]">{meta}</p>
      </div>
    </button>
  );
}

const QUICK_ACCESS_ICONS: Record<string, React.ReactNode> = {
  Lieblingssongs: <Heart className="h-6 w-6 text-[var(--music-accent)]" />,
  'Zuletzt gehört': <Clock className="h-6 w-6 text-[var(--music-accent)]" />,
  Künstler: <Mic2 className="h-6 w-6 text-[var(--music-accent)]" />,
  Alben: <Disc3 className="h-6 w-6 text-[var(--music-accent)]" />,
  Genres: <ListMusic className="h-6 w-6 text-[var(--music-accent)]" />,
  Zufallswiedergabe: <Shuffle className="h-6 w-6 text-[var(--music-accent)]" />,
};

const QUICK_ACCESS_CARDS = [
  { label: 'Lieblingssongs', icon: QUICK_ACCESS_ICONS['Lieblingssongs'], meta: 'Deine Favoriten' },
  { label: 'Zuletzt gehört', icon: QUICK_ACCESS_ICONS['Zuletzt gehört'], meta: 'Kürzlich gehört' },
  { label: 'Künstler', icon: QUICK_ACCESS_ICONS['Künstler'], meta: 'Alle Künstler' },
  { label: 'Alben', icon: QUICK_ACCESS_ICONS['Alben'], meta: 'Alle Alben' },
  { label: 'Genres', icon: QUICK_ACCESS_ICONS['Genres'], meta: 'Alle Genres' },
  { label: 'Zufallswiedergabe', icon: QUICK_ACCESS_ICONS['Zufallswiedergabe'], meta: 'Überraschung' },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MusicPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const server = useJellyfinServer();
  const { data: recentTracks, isLoading: recentLoading, error: recentError } = useRecentlyPlayed(server?.id, 12);
  const { data: newAlbums, isLoading: albumsLoading, error: albumsError } = useRecentAlbums(server?.id, 12);
  const { data: artists, isLoading: artistsLoading, error: artistsError } = useArtists(server?.id);
  const { data: favoriteAlbums, isLoading: favAlbumsLoading, error: favAlbumsError } = useRecentAlbums(server?.id, 12);
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
    QUICK_ACCESS_CARDS.map((card) => {
      const onClickMap: Record<string, () => void> = {
        Lieblingssongs: () => router.push('/jellyfin/music/tracks'),
        'Zuletzt gehört': () => scrollToSection('section-recent'),
        Künstler: () => router.push('/jellyfin/music/artists'),
        Alben: () => router.push('/jellyfin/music/albums'),
        Genres: () => router.push('/jellyfin/music/genres'),
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

          {/* Quick Access — horizontal scroll row */}
          <MusicSection title="Schnellzugriff">
            <MusicScrollRow>
              {buildCards().map((card) => (
                <div key={card.label} className="w-[300px] shrink-0">
                  <QuickAccessCard {...card} />
                </div>
              ))}
            </MusicScrollRow>
          </MusicSection>

          {/* Weiter hören — Continue Listening */}
          <section>
            <MusicSection title="Weiter hören" showAllHref="/jellyfin/music/tracks">
              {recentLoading ? <MusicSkeleton count={6} />
              : !recentTracks || recentTracks.length === 0 ? null
              : <MusicScrollRow>{recentTracks.map((item: any) => (
                  <div key={`continue-${item.Id}`} className="w-44 shrink-0">
                    <MusicCard title={item.Name} subtitle={item.Artist ?? item.AlbumArtist ?? item.Album}
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.AlbumId ?? item.Id, 160, 160)}
                      onClick={() => recentTracks && handlePlayRecent(recentTracks, recentTracks.indexOf(item))}
                      onDoubleClick={() => recentTracks && handlePlayRecent(recentTracks, recentTracks.indexOf(item))}
                      onPlay={() => recentTracks && handlePlayRecent(recentTracks, recentTracks.indexOf(item))} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>

          {/* Zuletzt gehört */}
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
                      onDoubleClick={() => recentTracks && handlePlayRecent(recentTracks, recentTracks.indexOf(item))}
                      onPlay={() => recentTracks && handlePlayRecent(recentTracks, recentTracks.indexOf(item))} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>

          {/* Neu in deiner Bibliothek */}
          <section>
            <MusicSection title="Neu in deiner Bibliothek" showAllHref="/jellyfin/music/albums">
              {albumsLoading ? <MusicSkeleton count={6} />
              : albumsError ? <MusicEmptyState title="Fehler beim Laden" description="Die neuen Alben konnten nicht geladen werden." />
              : !newAlbums || newAlbums.length === 0 ? <MusicEmptyState title="Keine neuen Alben" description="Neue Alben erscheinen hier, sobald sie deiner Bibliothek hinzugefügt werden." />
              : <MusicScrollRow>{newAlbums.map((item: any) => (
                  <div key={item.Id} className="w-44 shrink-0">
                    <MusicCard title={item.Name} subtitle={item.AlbumArtist}
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.Id, 160, 160)}
                      onClick={() => router.push(`/jellyfin/music/album/${item.Id}`)}
                      onDoubleClick={() => router.push(`/jellyfin/music/album/${item.Id}`)} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>

          {/* Lieblingsalben */}
          <section>
            <MusicSection title="Lieblingsalben" showAllHref="/jellyfin/music/albums">
              {favAlbumsLoading ? <MusicSkeleton count={6} />
              : favAlbumsError ? <MusicEmptyState title="Fehler beim Laden" description="Die Alben konnten nicht geladen werden." />
              : !favoriteAlbums || favoriteAlbums.length === 0 ? <MusicEmptyState title="Keine Alben" description="Sobald deine Mediathek Alben enthält, erscheinen sie hier." />
              : <MusicScrollRow>{favoriteAlbums.map((item: any) => (
                  <div key={item.Id} className="w-44 shrink-0">
                    <MusicCard title={item.Name} subtitle={item.AlbumArtist}
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.Id, 160, 160)}
                      onClick={() => router.push(`/jellyfin/music/album/${item.Id}`)}
                      onDoubleClick={() => router.push(`/jellyfin/music/album/${item.Id}`)} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>

          {/* Entdecken */}
          <section>
            <MusicSection title="Entdecken" showAllHref="/jellyfin/music/albums">
              {favAlbumsLoading ? <MusicSkeleton count={6} />
              : favAlbumsError ? <MusicEmptyState title="Fehler beim Laden" description="Die Alben konnten nicht geladen werden." />
              : !favoriteAlbums || favoriteAlbums.length === 0 ? <MusicEmptyState title="Nichts zu entdecken" description="Sobald deine Mediathek Alben enthält, erscheinen sie hier." />
              : <MusicScrollRow>{favoriteAlbums.map((item: any) => (
                  <div key={item.Id} className="w-44 shrink-0">
                    <MusicCard title={item.Name} subtitle={item.AlbumArtist}
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.Id, 160, 160)}
                      onClick={() => router.push(`/jellyfin/music/album/${item.Id}`)}
                      onDoubleClick={() => router.push(`/jellyfin/music/album/${item.Id}`)} />
                  </div>
                ))}</MusicScrollRow>}
            </MusicSection>
          </section>

          {/* Künstler durchstöbern */}
          <section>
            <MusicSection title="Künstler durchstöbern" showAllHref="/jellyfin/music/artists">
              {artistsLoading ? <MusicSkeleton count={6} />
              : artistsError ? <MusicEmptyState title="Fehler beim Laden" description="Die Künstler konnten nicht geladen werden." />
              : !artists || artists.length === 0 ? <MusicEmptyState title="Keine Künstler" description="Sobald deine Mediathek Musik enthält, erscheinen hier die Künstler." />
              : <MusicScrollRow>{artists.slice(0, 12).map((item: any) => (
                  <div key={item.Id} className="w-44 shrink-0">
                    <MusicCard title={item.Name} rounded
                      coverUrl={getCoverUrl(accessToken!, server!.id, item.Id, 160, 160)}
                      onClick={() => router.push(`/jellyfin/music/artist/${item.Id}`)}
                      onDoubleClick={() => router.push(`/jellyfin/music/artist/${item.Id}`)} />
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
