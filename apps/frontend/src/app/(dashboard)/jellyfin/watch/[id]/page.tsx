'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { VideoPlayer } from '@/components/jellyfin/VideoPlayer';
import {
  fetchItemDetail, fetchChildren, getStreamUrl, getMediaInfoUrl,
  type JellyfinMediaItem,
} from '@/lib/jellyfin-media-api';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const externalId = params?.id as string;
  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  /* -------- Item Detail -------- */
  const { data: item, isLoading } = useQuery<JellyfinMediaItem>({
    queryKey: ['jellyfin-watch-item', externalId],
    queryFn: () => fetchItemDetail(serverId, externalId),
    enabled: hydrated && !!accessToken && !!externalId,
    staleTime: 300_000,
  });

  /* -------- Series context (if episode) -------- */
  const isEpisode = item?.Type === 'Episode';
  const seriesId = item?.SeriesId;

  // Fetch siblings (other episodes in same season) if episode
  const { data: siblings } = useQuery<JellyfinMediaItem[]>({
    queryKey: ['jellyfin-watch-siblings', seriesId, item?.SeasonId],
    queryFn: async () => {
      if (!item?.SeasonId) return [];
      return fetchChildren(serverId, item.SeasonId);
    },
    enabled: hydrated && !!accessToken && isEpisode && !!item?.SeasonId,
    staleTime: 300_000,
  });

  // Find prev/next episode
  const { prevEpisode, nextEpisode } = useMemo(() => {
    if (!siblings || !item) return { prevEpisode: null, nextEpisode: null };
    const sorted = [...siblings].sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));
    const currentIdx = sorted.findIndex(s => s.Id === item.Id);
    return {
      prevEpisode: currentIdx > 0 ? sorted[currentIdx - 1] : null,
      nextEpisode: currentIdx >= 0 && currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null,
    };
  }, [siblings, item]);

  const title = isEpisode
    ? `${item?.SeriesName ?? ''} – ${item?.Name ?? ''}`
    : item?.Name ?? '';

  /* -------- Guard -------- */
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white/60">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />Authentifizierung läuft …
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white/60">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white/60 gap-4">
        <p className="text-lg">Medium nicht gefunden</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-brand-400 hover:underline"
        >
          Zurück
        </button>
      </div>
    );
  }

  const streamUrl = getStreamUrl(serverId, externalId, item.Type);
  const mediaInfoUrl = getMediaInfoUrl(serverId, externalId);

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-sm text-white/80 truncate max-w-md">
            <span className="font-medium">{title}</span>
          </div>
        </div>

        {/* Episode navigation */}
        {isEpisode && (
          <div className="flex items-center gap-2">
            {prevEpisode && (
              <button
                onClick={() => router.push(`/jellyfin/watch/${prevEpisode.Id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {prevEpisode.Name}
              </button>
            )}
            {nextEpisode && (
              <button
                onClick={() => router.push(`/jellyfin/watch/${nextEpisode.Id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              >
                {nextEpisode.Name}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Player */}
      <div className="flex-1 flex items-center justify-center">
        {playerError ? (
          <div className="text-center text-white/60 space-y-3">
            <p className="text-lg font-medium">Wiedergabefehler</p>
            <p className="text-sm">{playerError}</p>
            <button
              onClick={() => { setPlayerError(null); }}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <div className="w-full h-full max-h-screen">
            <VideoPlayer
              streamUrl={streamUrl}
              mediaInfoUrl={mediaInfoUrl}
              title={title}
              onError={(msg) => setPlayerError(msg)}
            />
          </div>
        )}
      </div>

      {/* Episode info bar */}
      {isEpisode && item.Overview && (
        <div className="border-t border-white/10 bg-black/80 px-6 py-3">
          <p className="text-xs text-white/50 line-clamp-2 max-w-3xl">
            {item.Overview}
          </p>
        </div>
      )}
    </div>
  );
}
