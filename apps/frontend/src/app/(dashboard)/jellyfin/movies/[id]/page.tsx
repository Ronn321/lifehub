'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  fetchItemDetail, fetchContinueWatching, fetchItemPeople, fetchSimilarItems,
  getImageUrl, formatRuntime, formatYear,
  toggleWatched, toggleFavorite,
  type JellyfinMediaItem, type ContinueWatchingItem,
} from '@/lib/jellyfin-media-api';
import { DetailHeader } from '@/components/jellyfin/media/DetailHeader';
import { JellyfinPageWrapper } from '@/components/jellyfin/media/JellyfinPageWrapper';
import { CastSection } from '@/components/jellyfin/media/CastSection';
import { SimilarSection } from '@/components/jellyfin/media/SimilarSection';
import { ArrowLeft, Loader2, Info, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const externalId = params?.id as string;
  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  /* -------- Detail -------- */
  const { data: item, isLoading, error } = useQuery<JellyfinMediaItem>({
    queryKey: ['jellyfin-movie-detail', externalId],
    queryFn: () => fetchItemDetail(serverId, externalId),
    enabled: hydrated && !!accessToken && !!externalId,
    staleTime: 300_000,
  });

  /* -------- Continue Watching (for resume position) -------- */
  const { data: continueWatching } = useQuery<ContinueWatchingItem[]>({
    queryKey: ['jellyfin-continue-watching'],
    queryFn: () => fetchContinueWatching(serverId),
    enabled: hydrated && !!accessToken,
    staleTime: 30_000,
  });

  const resumeItem = useMemo(() => {
    if (!continueWatching || !item) return null;
    return continueWatching.find(cw => cw.Id === item.Id) ?? null;
  }, [continueWatching, item]);

  const resumeTicks = resumeItem?.UserData?.PlaybackPositionTicks ?? null;
  const isWatched = item?.UserData?.Played ?? false;

  /* -------- Watch State -------- */
  const qc = useQueryClient();
  const watchMut = useMutation({
    mutationFn: () => toggleWatched(serverId, externalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-movie-detail', externalId] });
      qc.invalidateQueries({ queryKey: ['jellyfin-continue-watching'] });
    },
  });

  const favMut = useMutation({
    mutationFn: () => toggleFavorite('', serverId, externalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-movie-detail', externalId] });
    },
  });

  /* -------- Actions -------- */
  function handlePlay() {
    router.push(`/jellyfin/watch/${externalId}`);
  }

  function handleResume() {
    router.push(`/jellyfin/watch/${externalId}`);
  }

  /* -------- Guard -------- */
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Authentifizierung läuft …
      </div>
    );
  }

  /* -------- Loading -------- */
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

  /* -------- Error -------- */
  if (error || !item) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <p className="text-danger font-medium">Fehler beim Laden des Films</p>
          <p className="text-sm text-fg-muted">Bitte versuche es später erneut.</p>
          <button
            onClick={() => router.push('/jellyfin/movies')}
            className="text-sm text-brand-400 hover:underline"
          >
            Zurück zur Filmübersicht
          </button>
        </div>
      </div>
    );
  }

  /* -------- Overview -------- */
  const overview = item.Overview ?? '';
  const genres = item.Genres ?? [];
  const studios = (item as any).Studios as { Name?: string; Id?: string }[] | undefined;

  return (
    <JellyfinPageWrapper>
      <div className="pb-12">
      {/* Hero header (includes back button) */}
      <DetailHeader
        item={item}
        serverId={serverId}
        onPlay={handlePlay}
        onResume={resumeTicks ? handleResume : undefined}
        resumePositionTicks={resumeTicks}
        isFavorite={item?.UserData?.IsFavorite ?? false}
        onToggleFavorite={() => favMut.mutate()}
      />

      {/* Watched toggle */}
      <div className="mx-auto max-w-6xl space-y-8 px-6 mt-8">
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
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl space-y-8 px-6 mt-8">
        {/* Overview */}
        {overview && (
          <section>
            <p className="text-sm leading-relaxed text-fg-muted max-w-3xl">
              {overview}
            </p>
          </section>
        )}

        {/* Technical info toggle */}
        <button
          onClick={() => setShowMoreInfo(!showMoreInfo)}
          className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
          {showMoreInfo ? 'Weniger anzeigen' : 'Technische Details anzeigen'}
        </button>

        {showMoreInfo && (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
            {studios && studios.length > 0 && (
              <div>
                <p className="text-xs text-fg-muted mb-0.5">Studio</p>
                <p className="font-medium">{studios.map(s => s.Name).join(', ')}</p>
              </div>
            )}
            {item.OfficialRating && (
              <div>
                <p className="text-xs text-fg-muted mb-0.5">Altersfreigabe</p>
                <p className="font-medium">{item.OfficialRating}</p>
              </div>
            )}
            {item.CommunityRating && (
              <div>
                <p className="text-xs text-fg-muted mb-0.5">Bewertung</p>
                <p className="font-medium">★ {item.CommunityRating.toFixed(1)}</p>
              </div>
            )}
            {item.ProductionYear && (
              <div>
                <p className="text-xs text-fg-muted mb-0.5">Erscheinungsjahr</p>
                <p className="font-medium">{item.ProductionYear}</p>
              </div>
            )}
            {item.RunTimeTicks && (
              <div>
                <p className="text-xs text-fg-muted mb-0.5">Laufzeit</p>
                <p className="font-medium">{formatRuntime(item.RunTimeTicks)}</p>
              </div>
            )}
          </section>
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
