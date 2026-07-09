'use client';

import { api } from './api';

/* ------------------------------------------------------------------ */
/*  Types (from Jellyfin API)                                         */
/* ------------------------------------------------------------------ */

export interface JellyfinMediaItem {
  Id: string;
  Name: string;
  Type: 'Movie' | 'Series' | 'Episode' | 'Season';
  Overview?: string | null;
  ProductionYear?: number | null;
  RunTimeTicks?: number | null;
  Genres?: string[];
  Providers?: { [key: string]: string };
  CommunityRating?: number | null;
  CriticRating?: number | null;
  OfficialRating?: string | null;
  ParentId?: string | null;
  Path?: string | null;
  DateCreated?: string;
  IndexNumber?: number | null;
  ParentIndexNumber?: number | null;
  SeriesName?: string | null;
  SeriesId?: string | null;
  SeasonId?: string | null;
  People?: JellyfinPerson[];
  MediaSources?: any[];
  MediaStreams?: any[];
  ImageTags?: { Primary?: string };
  UserData?: {
    PlaybackPositionTicks: number;
    Played: boolean;
    LastPlayedDate: string;
  };
}

export interface JellyfinPerson {
  Id: string;
  Name: string;
  Role?: string;
  Type: 'Actor' | 'Director' | 'Writer' | 'Producer' | string;
  PrimaryImageTag?: string;
}

export interface ContinueWatchingItem extends JellyfinMediaItem {
  UserData?: {
    PlaybackPositionTicks: number;
    Played: boolean;
    LastPlayedDate: string;
  };
}

export interface SearchResults {
  Movies: JellyfinMediaItem[];
  Series: JellyfinMediaItem[];
  Episodes: JellyfinMediaItem[];
  Collections: JellyfinMediaItem[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

export function getImageUrl(serverId: string, itemId: string, width = 300, height = 450): string {
  const base = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3007`
    : 'http://localhost:3007';
  const token = typeof window !== 'undefined' ? getAccessToken() : '';
  return `${base}/api/v1/jellyfin/servers/${serverId}/items/${itemId}/image?w=${width}&h=${height}&token=${token}`;
}

export function getBackdropUrl(serverId: string, itemId: string): string {
  const base = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3007`
    : 'http://localhost:3007';
  const token = typeof window !== 'undefined' ? getAccessToken() : '';
  return `${base}/api/v1/jellyfin/servers/${serverId}/items/${itemId}/image?w=1920&h=1080&type=Backdrop&token=${token}`;
}

export function getStreamUrl(serverId: string, itemId: string, type: string): string {
  const base = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3007`
    : 'http://localhost:3007';
  const token = typeof window !== 'undefined' ? getAccessToken() : '';
  return `${base}/api/v1/jellyfin/servers/${serverId}/items/${itemId}/stream?type=${type}&token=${token}`;
}

export function getMediaInfoUrl(serverId: string, itemId: string): string {
  const base = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3007`
    : 'http://localhost:3007';
  const token = typeof window !== 'undefined' ? getAccessToken() : '';
  return `${base}/api/v1/jellyfin/servers/${serverId}/items/${itemId}/media-info?token=${token}`;
}

function getAccessToken(): string {
  try {
    const raw = localStorage.getItem('lifehub-auth');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? '';
  } catch { return ''; }
}

export function formatRuntime(ticks: number | null | undefined): string {
  if (!ticks) return '';
  const totalMinutes = Math.floor(ticks / 600000000); // 10_000_000 ticks per ms * 60000 ms per min
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins}min`;
}

export function formatYear(item: JellyfinMediaItem): string {
  return item.ProductionYear ? String(item.ProductionYear) : '';
}

/* ------------------------------------------------------------------ */
/*  API Functions                                                     */
/* ------------------------------------------------------------------ */

function getDefaultServerId(): string {
  return 'default';
}

export async function fetchItemDetail(serverId: string, externalId: string): Promise<JellyfinMediaItem> {
  return api.get<JellyfinMediaItem>(`/jellyfin/servers/${serverId}/items/${externalId}/detail`);
}

export async function fetchContinueWatching(serverId: string, limit = 20): Promise<ContinueWatchingItem[]> {
  return api.get<ContinueWatchingItem[]>(`/jellyfin/servers/${serverId}/continue-watching?limit=${limit}`);
}

export async function fetchSimilarItems(serverId: string, externalId: string, limit = 12): Promise<JellyfinMediaItem[]> {
  return api.get<JellyfinMediaItem[]>(`/jellyfin/servers/${serverId}/items/${externalId}/similar?limit=${limit}`);
}

export async function fetchItemPeople(serverId: string, externalId: string): Promise<JellyfinPerson[]> {
  return api.get<JellyfinPerson[]>(`/jellyfin/servers/${serverId}/items/${externalId}/people`);
}

export async function searchMedia(serverId: string, query: string, limit = 30): Promise<SearchResults> {
  return api.get<SearchResults>(`/jellyfin/servers/${serverId}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function fetchChildren(serverId: string, externalId: string): Promise<JellyfinMediaItem[]> {
  return api.get<JellyfinMediaItem[]>(`/jellyfin/servers/${serverId}/items/${externalId}/children`);
}

export async function toggleWatched(itemId: string): Promise<{ watched: boolean }> {
  return api.post<{ watched: boolean }>(`/jellyfin/items/${itemId}/toggle-watched`);
}

export async function toggleFavorite(ownerId: string, serverId: string, externalId: string): Promise<{ isFavorite: boolean }> {
  return api.post<{ isFavorite: boolean }>(`/jellyfin/servers/${serverId}/items/${externalId}/favorite`);
}
