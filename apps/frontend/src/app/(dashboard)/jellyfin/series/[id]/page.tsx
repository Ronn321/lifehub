'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
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
import { ArrowLeft, Loader2, CheckCircle, Circle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  const externalId = params?.id as string;
  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

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

  // Auto-select first non-0 season (skip "All Episodes"/"Specials")
  useEffect(() => {
    if (seasonList.length > 0 && selectedSeason === 1) {
      const first = seasonList.find((s: any) => s.IndexNumber > 0) ?? seasonList[0];
      setSelectedSeason(first?.IndexNumber ?? 1);
    }
  }, [seasonList, selectedSeason]);

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
            onToggleWatched={(ep) => episodeWatchMut.mutate(ep.Id)}
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
  );
}
