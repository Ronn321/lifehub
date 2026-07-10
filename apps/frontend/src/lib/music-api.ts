'use client';

import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@tanstack/react-query';
import type { MusicTrack } from '@/lib/music-player-store';
import { useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface JellyfinApiItem {
  Id: string;
  Name: string;
  Type: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artist?: string;
  Artists?: string[];
  ProductionYear?: number;
  Overview?: string;
  Path?: string;
  IsFolder?: boolean;
  RunTimeTicks?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  UserData?: { PlayCount?: number; IsFavorite?: boolean; PlayCountTxt?: string; Rating?: number };
  ImageTags?: { Primary?: string };

  // Extended metadata fields
  Genres?: string[];
  CommunityRating?: number;
  DateCreated?: string;       // ISO date when item was added
  PremiereDate?: string;     // ISO date for original release
  MediaType?: string;
  MediaSources?: Array<{
    Id?: string;
    Container?: string;
    Bitrate?: number;
    Path?: string;
    Protocol?: string;
  }>;
  LastPlayedDate?: string;   // ISO date
  Played?: boolean;
  ProviderIds?: Record<string, string>;
  Width?: number;
  Height?: number;
  Container?: string;
}

export interface JellyfinPlaylist {
  Id: string;
  Name: string;
  Type: string;
  Overview?: string;
  Owner?: string;
  UserId?: string;
  RunTimeTicks?: number;
  ProductionYear?: number;
  ImageTags?: { Primary?: string };
  ChildCount?: number;
  IsFavorite?: boolean;
  Genres?: string[];
  Artists?: string[];
  Items?: JellyfinApiItem[];
  CumulativeRunTimeTicks?: number;
}

export interface JellyfinServer {
  id: string;
  url: string;
  apiKey: string;
  isActive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getStreamBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3007`;
  }
  return 'http://localhost:3007';
}

export function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h} Std. ${m} Min.`;
  return `${m} Min. ${s} Sek.`;
}

export function ticksToSeconds(ticks?: number): number {
  if (!ticks) return 0;
  return Math.round(ticks / 10_000_000);
}

export function getCoverUrl(
  accessToken: string,
  serverId: string,
  itemId: string | undefined,
  width = 300,
  height = 300,
): string | undefined {
  if (!itemId || !accessToken) return undefined;
  const baseUrl = getStreamBaseUrl();
  return `${baseUrl}/api/v1/jellyfin/servers/${serverId}/items/${itemId}/image?w=${width}&h=${height}&token=${encodeURIComponent(accessToken)}`;
}

export function getStreamUrl(
  accessToken: string,
  serverId: string,
  itemId: string,
): string {
  const baseUrl = getStreamBaseUrl();
  return `${baseUrl}/api/v1/jellyfin/servers/${serverId}/items/${itemId}/stream?type=Audio&token=${encodeURIComponent(accessToken)}`;
}

export function jellyfinItemToTrack(
  item: JellyfinApiItem,
  accessToken: string,
  serverId: string,
): MusicTrack {
  // Determine quality from container/source info
  const container = item.Container ?? item.MediaSources?.[0]?.Container;
  const bitrate = item.MediaSources?.[0]?.Bitrate;
  let quality: string | undefined;
  if (container) {
    const c = container.toLowerCase();
    if (c.includes('flac')) quality = 'FLAC';
    else if (c.includes('alac')) quality = 'ALAC';
    else if (c.includes('aac')) quality = 'AAC';
    else if (c.includes('mp3')) quality = 'MP3';
    else if (c.includes('ogg') || c.includes('vorbis')) quality = 'OGG';
    else if (c.includes('wav')) quality = 'WAV';
    else if (c.includes('opus')) quality = 'Opus';
    else if (c.includes('wma')) quality = 'WMA';
    else if (c.includes('dsf') || c.includes('dff')) quality = 'DSD';
    else quality = container.toUpperCase();
  }

  return {
    id: item.Id,
    title: item.Name,
    artist: item.Artist ?? item.AlbumArtist ?? 'Unbekannt',
    artistId: item.Artists?.[0] ?? undefined,
    album: item.Album ?? '',
    albumId: item.AlbumId,
    albumArtist: item.AlbumArtist,
    duration: ticksToSeconds(item.RunTimeTicks),
    trackNumber: item.IndexNumber,
    discNumber: item.ParentIndexNumber,
    coverUrl: getCoverUrl(accessToken, serverId, item.AlbumId ?? item.Id, 300, 300),
    streamUrl: getStreamUrl(accessToken, serverId, item.Id),

    // Extended metadata
    genre: item.Genres?.[0],
    genreId: undefined,
    year: item.ProductionYear,
    rating: item.CommunityRating,
    isFavorite: item.UserData?.IsFavorite ?? false,
    quality,
    bitrate,
    dateAdded: item.DateCreated,
    lastPlayed: item.LastPlayedDate,
  };
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Get the active Jellyfin server */
export function useJellyfinServer() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: servers } = useQuery<JellyfinServer[]>({
    queryKey: ['jellyfin-servers'],
    queryFn: () => api.get<JellyfinServer[]>('/jellyfin/servers'),
    enabled: !!accessToken,
    staleTime: 30_000,
  });
  return servers?.[0] ?? null;
}

/** Recently played songs */
export function useRecentlyPlayed(serverId?: string, limit = 12) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-recent', serverId, limit],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/recent?limit=${limit}`),
    enabled: !!serverId,
    staleTime: 60_000,
  });
}

/** Recent albums */
export function useRecentAlbums(serverId?: string, limit = 12) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-recent-albums', serverId, limit],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/albums/recent?limit=${limit}`),
    enabled: !!serverId,
    staleTime: 60_000,
  });
}

/** Artists */
export function useArtists(serverId?: string) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-artists', serverId],
    queryFn: () => api.get<JellyfinApiItem[]>(`/jellyfin/artists?serverId=${serverId}`),
    enabled: !!serverId,
    staleTime: 60_000,
  });
}

/** Albums by artist */
export function useAlbums(serverId?: string, artistId?: string | null) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-albums', serverId, artistId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/albums?serverId=${serverId}&artistId=${artistId}`),
    enabled: !!serverId && !!artistId,
    staleTime: 60_000,
  });
}

/** Album songs */
export function useAlbumSongs(serverId?: string, albumId?: string | null) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-album-songs', serverId, albumId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/albums/${albumId}/songs`),
    enabled: !!serverId && !!albumId,
    staleTime: 60_000,
  });
}

/** Children of an item (legacy endpoint) */
export function useItemChildren(serverId?: string, itemId?: string | null) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-children', serverId, itemId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/items/${itemId}/children`),
    enabled: !!serverId && !!itemId,
    staleTime: 60_000,
  });
}

/** Search music */
export function useMusicSearch(serverId?: string, query?: string) {
  return useQuery<{ Artists: JellyfinApiItem[]; Albums: JellyfinApiItem[]; Songs: JellyfinApiItem[] }>({
    queryKey: ['music-search', serverId, query],
    queryFn: () =>
      api.get(`/jellyfin/servers/${serverId}/search?q=${encodeURIComponent(query ?? '')}`),
    enabled: !!serverId && !!query && query.length > 1,
    staleTime: 30_000,
  });
}

/** All songs (paginated) */
export function useAllSongs(
  serverId?: string,
  params?: { sortBy?: string; sortOrder?: string; limit?: number; startIndex?: number },
) {
  const qs = new URLSearchParams();
  if (params?.sortBy) qs.set('sortBy', params.sortBy);
  if (params?.sortOrder) qs.set('sortOrder', params.sortOrder);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.startIndex) qs.set('startIndex', String(params.startIndex));

  return useQuery<{ items: JellyfinApiItem[]; totalRecordCount: number }>({
    queryKey: ['music-all-songs', serverId, qs.toString()],
    queryFn: () =>
      api.get(`/jellyfin/servers/${serverId}/songs?${qs.toString()}`),
    enabled: !!serverId,
    staleTime: 60_000,
  });
}

/** Genres */
export function useGenres(serverId?: string) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-genres', serverId],
    queryFn: () => api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/genres`),
    enabled: !!serverId,
    staleTime: 120_000,
  });
}

/** Songs by genre */
export function useGenreSongs(serverId?: string, genreId?: string | null) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-genre-songs', serverId, genreId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/genres/${genreId}/songs`),
    enabled: !!serverId && !!genreId,
    staleTime: 60_000,
  });
}

/** Top songs by artist */
export function useTopSongs(serverId?: string, artistId?: string | null, limit = 10) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-top-songs', serverId, artistId, limit],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/artists/${artistId}/top-songs?limit=${limit}`),
    enabled: !!serverId && !!artistId,
    staleTime: 60_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Playlist Hooks                                                      */
/* ------------------------------------------------------------------ */

/** All playlists */
export function usePlaylists(serverId?: string) {
  return useQuery<JellyfinPlaylist[]>({
    queryKey: ['music-playlists', serverId],
    queryFn: () =>
      api.get<JellyfinPlaylist[]>(`/jellyfin/servers/${serverId}/playlists`),
    enabled: !!serverId,
    staleTime: 60_000,
  });
}

/** Single playlist */
export function usePlaylist(serverId?: string, playlistId?: string | null) {
  return useQuery<JellyfinPlaylist>({
    queryKey: ['music-playlist', serverId, playlistId],
    queryFn: () =>
      api.get<JellyfinPlaylist>(`/jellyfin/servers/${serverId}/playlists/${playlistId}`),
    enabled: !!serverId && !!playlistId,
    staleTime: 60_000,
  });
}

/** Playlist items (songs) */
export function usePlaylistItems(serverId?: string, playlistId?: string | null) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-playlist-items', serverId, playlistId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/playlists/${playlistId}/items`),
    enabled: !!serverId && !!playlistId,
    staleTime: 60_000,
  });
}

/** Get cover URL for a playlist (uses playlist's own image) */
export function getPlaylistCoverUrl(
  accessToken: string,
  serverId: string,
  playlistId: string | undefined,
  width = 232,
  height = 232,
): string | undefined {
  if (!playlistId || !accessToken) return undefined;
  const baseUrl = getStreamBaseUrl();
  return `${baseUrl}/api/v1/jellyfin/servers/${serverId}/items/${playlistId}/image?w=${width}&h=${height}&token=${encodeURIComponent(accessToken)}`;
}

/* ------------------------------------------------------------------ */
/*  Favorites API Hooks                                                */
/* ------------------------------------------------------------------ */

/** Fetch favorite songs from Jellyfin */
export function useFavoriteSongs(serverId?: string) {
  return useQuery<JellyfinApiItem[]>({
    queryKey: ['music-favorites', serverId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(`/jellyfin/servers/${serverId}/favorites`),
    enabled: !!serverId,
    staleTime: 60_000,
  });
}

/** Toggle favorite status for a track on Jellyfin */
export function useToggleFavorite() {
  return useCallback(
    async (serverId: string, externalId: string): Promise<{ isFavorite: boolean }> => {
      return api.post<{ isFavorite: boolean }>(
        `/jellyfin/servers/${serverId}/items/${externalId}/favorite`,
      );
    },
    [],
  );
}

/* ------------------------------------------------------------------ */
/*  Playback Reporting Hooks                                           */
/* ------------------------------------------------------------------ */

/** Report playback start to Jellyfin */
export function useReportPlaybackStart() {
  return useCallback(
    async (serverId: string, itemId: string, positionTicks: number): Promise<void> => {
      await api.post(`/jellyfin/servers/${serverId}/sessions/playing`, {
        itemId,
        positionTicks,
      });
    },
    [],
  );
}

/** Report playback progress to Jellyfin */
export function useReportPlaybackProgress() {
  return useCallback(
    async (serverId: string, itemId: string, positionTicks: number, isPaused: boolean): Promise<void> => {
      await api.post(`/jellyfin/servers/${serverId}/sessions/progress`, {
        itemId,
        positionTicks,
        isPaused,
      });
    },
    [],
  );
}

/** Report playback stop to Jellyfin */
export function useReportPlaybackStop() {
  return useCallback(
    async (serverId: string, itemId: string, positionTicks: number): Promise<void> => {
      await api.post(`/jellyfin/servers/${serverId}/sessions/stopped`, {
        itemId,
        positionTicks,
      });
    },
    [],
  );
}

/* ------------------------------------------------------------------ */
/*  Play helper                                                        */
/* ------------------------------------------------------------------ */

/** Convert Jellyfin items to tracks and play them */
export function usePlayTracks() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const playTrack = useMusicPlayerStoreForPlay();

  return useCallback(
    (items: JellyfinApiItem[], startIndex: number, serverId: string) => {
      if (!accessToken) return;
      const tracks = items.map((item) => jellyfinItemToTrack(item, accessToken, serverId));
      const track = tracks[startIndex] ?? tracks[0];
      if (track) {
        playTrack(track, tracks);
      }
    },
    [accessToken, playTrack],
  );
}

// Import lazily to avoid circular deps
import { useMusicPlayerStore } from '@/lib/music-player-store';
function useMusicPlayerStoreForPlay() {
  return useMusicPlayerStore((s) => s.playTrack);
}
