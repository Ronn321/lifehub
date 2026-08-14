'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  fetchItemDetail, fetchChildren, fetchContinueWatching, fetchSimilarItems,
  toggleWatched, toggleFavorite,
  type JellyfinMediaItem, type ContinueWatchingItem,
} from '@/lib/jellyfin-media-api';
import { DetailHeader } from '@/components/jellyfin/media/DetailHeader';
import { JellyfinPageWrapper } from '@/components/jellyfin/media/JellyfinPageWrapper';
import { SeasonPicker } from '@/components/jellyfin/media/SeasonPicker';
import { EpisodeList } from '@/components/jellyfin/media/EpisodeList';
import { CastSection } from '@/components/jellyfin/media/CastSection';
import { SimilarSection } from '@/components/jellyfin/media/SimilarSection';
import { WatchlistPicker } from '@/components/jellyfin/media/WatchlistPicker';
import { ArrowLeft, Loader2, CheckCircle, Circle, Bookmark } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Deep-link query params (?season=…&episode=…) from "Continue Watching"
  const qSeason = Number(searchParams.get('season')) || null;
  const qEpisode = searchParams.get('episode') || null;

  // Context menu state: which episode was right-clicked + where.
  const [menuFor, setMenuFor] = useState<{ episode: JellyfinMediaItem; x: number; y: number } | null>(null);
  // Watchlist picker opened from the context menu (per-episode).
  const [pickerFor, setPickerFor] = useState<JellyfinMediaItem | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const externalId = params?.id as string;
  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  // Close context menu + picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
        setPickerFor(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* -------- Series Detail -------- */
  const { data: series, isLoading, error } = useQuery<JellyfinMediaItem>({
    queryKey: ['jellyfin-series-detail', externalId],
    queryFn: () => fetchItemDetail(serverId, externalId),
    enabled: hydrated && !!accessToken && !!externalId,
    staleTime: 300_000,
  });

  /* -------- Children (seasons) -------- */
  const { data: seasons, isLoading: seasonsLoading } = useQuery<any[]>({
    queryKey: ['jellyfin-series-children', externalId],
    queryFn: () => fetchChildren(serverId, externalId),
    enabled: hydrated && !!accessToken && !!externalId,
    staleTime: 300_000,
  });

  // Build season list
  const seasonList = useMemo(() => {
    if (!seasons) return [];
    return seasons
      .filter((s: any) => s.Type === 'Season')
      .map((s: any) => ({
        Id: s.Id,
        Name: s.Name ?? `Staffel ${s.IndexNumber ?? 0}`,
        IndexNumber: s.IndexNumber ?? 0,
      }))
      .sort((a: any, b: any) => a.IndexNumber - b.IndexNumber);
  }, [seasons]);

  // Find selected season's external ID
  const selectedSeasonExternalId = useMemo(() => {
    const s = seasons?.find(
      (s: any) => s.Type === 'Season' && s.IndexNumber === selectedSeason,
    );
    return s?.Id ?? null;
  }, [seasons, selectedSeason]);

  /* -------- Episodes of selected season -------- */
  const { data: episodes, isLoading: episodesLoading } = useQuery<JellyfinMediaItem[]>({
    queryKey: ['jellyfin-season-episodes', selectedSeasonExternalId],
    queryFn: () => selectedSeasonExternalId
      ? fetchChildren(serverId, selectedSeasonExternalId)
      : Promise.resolve([]),
    enabled: hydrated && !!accessToken && !!selectedSeasonExternalId,
    staleTime: 300_000,
  });

  /* -------- Continue Watching (for resume) -------- */
  const { data: continueWatching } = useQuery<ContinueWatchingItem[]>({
    queryKey: ['jellyfin-continue-watching'],
    queryFn: () => fetchContinueWatching(serverId),
    enabled: hydrated && !!accessToken,
    staleTime: 30_000,
  });

  const resumeItem = useMemo(() => {
    if (!continueWatching || !series) return null;
    return continueWatching.find(cw => cw.SeriesId === series.Id) ?? null;
  }, [continueWatching, series]);

  // Episode to highlight + scroll to (deep link param or resume item)
  const highlightedEpisodeId = qEpisode ?? resumeItem?.Id ?? undefined;

  // Auto-select season by priority: qSeason param > resume season > first non-0 season.
  // Only set when the target differs from the current selection to avoid resetting
  // a season the user picked manually.
  useEffect(() => {
    if (seasonList.length === 0) return;
    let target: number | null = null;

    // 1) URL season param (?season=…), if it matches an existing season
    if (qSeason !== null) {
      const match = seasonList.find((s: any) => s.IndexNumber === qSeason);
      if (match) target = match.IndexNumber;
    }
    // 2) Season of the resume episode
    if (target === null && resumeItem?.ParentIndexNumber != null) {
      const match = seasonList.find((s: any) => s.IndexNumber === resumeItem.ParentIndexNumber);
      if (match) target = match.IndexNumber;
    }
    // 3) Fallback: first non-0 season (skip "All Episodes"/"Specials")
    if (target === null) {
      const first = seasonList.find((s: any) => s.IndexNumber > 0) ?? seasonList[0];
      target = first?.IndexNumber ?? null;
    }

    if (target !== null && target !== selectedSeason) {
      setSelectedSeason(target);
    }
  }, [seasonList, selectedSeason, qSeason, resumeItem]);

  // Scroll the highlighted episode into view once its episodes are loaded
  useEffect(() => {
    if (!episodes || !highlightedEpisodeId) return;
    document.getElementById(`ep-${highlightedEpisodeId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [episodes, highlightedEpisodeId]);

  const resumeTicks = resumeItem?.UserData?.PlaybackPositionTicks ?? null;
  const isWatched = series?.UserData?.Played ?? false;

  /* -------- Watch State -------- */
  const qc = useQueryClient();
  const watchMut = useMutation({
    mutationFn: () => toggleWatched(serverId, externalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-series-detail', externalId] });
      qc.invalidateQueries({ queryKey: ['jellyfin-continue-watching'] });
    },
  });

  const episodeWatchMut = useMutation({
    mutationFn: (episodeId: string) => toggleWatched(serverId, episodeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-season-episodes', selectedSeasonExternalId] });
      qc.invalidateQueries({ queryKey: ['jellyfin-continue-watching'] });
      qc.invalidateQueries({ queryKey: ['jellyfin-series-detail', externalId] });
    },
  });

  const favMut = useMutation({
    mutationFn: () => toggleFavorite('', serverId, externalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-series-detail', externalId] });
    },
  });

  /* -------- Actions -------- */
  function handlePlay() {
    if (episodes && episodes.length > 0) {
      // Find first unwatched episode
      const firstUnwatched = episodes.find(e => !e.UserData?.Played);
      if (firstUnwatched) {
        router.push(`/jellyfin/watch/${firstUnwatched.Id}`);
        return;
      }
      router.push(`/jellyfin/watch/${episodes[0]!.Id}`);
    }
  }

  function handleResume() {
    if (resumeItem) {
      router.push(`/jellyfin/watch/${resumeItem.Id}`);
    }
  }

  function handleEpisodePlay(episode: JellyfinMediaItem) {
    router.push(`/jellyfin/watch/${episode.Id}`);
  }

  /* -------- Guard -------- */
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />Authentifizierung läuft …
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-[50vh] min-h-[400px] rounded-xl bg-bg-muted animate-pulse" />
        <div className="space-y-3 p-6">
          <div className="h-8 w-64 rounded bg-bg-muted animate-pulse" />
          <div className="h-4 w-96 rounded bg-bg-muted animate-pulse" />
          <div className="h-20 w-full rounded bg-bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <p className="text-danger font-medium">Fehler beim Laden der Serie</p>
          <p className="text-sm text-fg-muted">Bitte versuche es später erneut.</p>
          <button onClick={() => router.push('/jellyfin/series')}
            className="text-sm text-brand-400 hover:underline">
            Zurück zur Serienübersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <JellyfinPageWrapper>
      <div className="pb-12">
      {/* Hero header (includes back button) */}
      <DetailHeader
        item={series}
        serverId={serverId}
        onPlay={handlePlay}
        onResume={resumeTicks && resumeItem ? handleResume : undefined}
        resumePositionTicks={resumeTicks}
        isFavorite={series?.UserData?.IsFavorite ?? false}
        onToggleFavorite={() => favMut.mutate()}
      />

      {/* Watched toggle */}
      <div className="mx-auto max-w-6xl space-y-6 px-6 mt-8">
        <button
          onClick={() => watchMut.mutate()}
          disabled={watchMut.isPending}
          className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          {isWatched ? (
            <><CheckCircle className="h-4 w-4 text-green-400" /> Als gesehen markiert</>
          ) : (
            <><Circle className="h-4 w-4" /> Als gesehen markieren</>
          )}
        </button>

        {/* Overview */}
        {series.Overview && (
          <section>
            <p className="text-sm leading-relaxed text-fg-muted max-w-3xl">{series.Overview}</p>
          </section>
        )}

        {/* Season picker + Episode list */}
        <div className="flex items-center gap-4">
          <SeasonPicker
            seasons={seasonList}
            selectedIndex={selectedSeason}
            onSelect={setSelectedSeason}
          />
          <span className="text-sm text-fg-muted">
            {episodes?.length ?? 0} Episoden
          </span>
        </div>

        {episodesLoading ? (
          <div className="flex items-center gap-2 text-sm text-fg-muted py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Episoden werden geladen …
          </div>
        ) : episodes && episodes.length > 0 ? (
          <EpisodeList
            episodes={episodes}
            serverId={serverId}
            onPlay={handleEpisodePlay}
            highlightedEpisodeId={highlightedEpisodeId}
            onToggleWatched={(ep) => episodeWatchMut.mutate(ep.Id)}
            onEpisodeContextMenu={(ep, e) => {
              setPickerFor(null);
              setMenuFor({ episode: ep, x: e.clientX, y: e.clientY });
            }}
          />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-fg-muted">
            Keine Episoden in dieser Staffel gefunden.
          </div>
        )}

        {/* Cast */}
        <CastSection serverId={serverId} externalId={externalId} />

        {/* Similar */}
        <SimilarSection serverId={serverId} externalId={externalId} />
      </div>
      </div>
    </JellyfinPageWrapper>

    {/* Episode context menu */}
    {menuFor && (
      <div
        ref={contextMenuRef}
        className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-bg-surface py-1 shadow-2xl"
        style={{ left: menuFor.x, top: menuFor.y }}
        role="menu"
      >
        <button
          type="button"
          onClick={() => setPickerFor(menuFor.episode)}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-bg-muted/60"
          role="menuitem"
        >
          <Bookmark className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="flex-1">Zur Watchlist hinzufügen</span>
        </button>
        <button
          type="button"
          onClick={() => {
            episodeWatchMut.mutate(menuFor.episode.Id);
            setMenuFor(null);
            setPickerFor(null);
          }}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-bg-muted/60"
          role="menuitem"
        >
          <CheckCircle className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="flex-1">Als gesehen markieren</span>
        </button>
        {pickerFor && (
          <div className="absolute left-full top-0 ml-1 w-64">
            <WatchlistPicker serverId={serverId} item={pickerFor} />
          </div>
        )}
      </div>
    )}
    </>
  );
}
