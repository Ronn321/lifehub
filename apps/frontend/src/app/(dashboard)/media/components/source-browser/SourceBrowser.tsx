'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Breadcrumb } from './Breadcrumb';
import { FolderGrid } from './FolderGrid';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MediaSource {
  id: string;
  name: string;
  type: 'nas_path' | 'windows_path' | 'upload_temp';
  path: string;
  createdAt: string;
}

interface BrowseFolderItem {
  name: string;
  path: string;
  itemCount: number;
}

interface MediaFile {
  id: string;
  filename: string;
  relativePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  takenAt?: string;
  isFavorite: boolean;
}

interface BrowseResult {
  folders: BrowseFolderItem[];
  files: MediaFile[];
  parentPath: string | null;
}

/* ------------------------------------------------------------------ */
/*  SourceBrowser                                                     */
/* ------------------------------------------------------------------ */

export function SourceBrowser() {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');

  /* Fetch available sources for dropdown */
  const {
    data: sources,
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useQuery<MediaSource[]>({
    queryKey: ['media-sources'],
    queryFn: () => api.get<MediaSource[]>('/media/sources'),
    staleTime: 30_000,
  });

  /* Fetch browse results for selected source + path */
  const browseQuery = useQuery<BrowseResult>({
    queryKey: ['browse', selectedSourceId, currentPath],
    queryFn: () => {
      const params = new URLSearchParams();
      if (currentPath) params.set('path', currentPath);
      return api.get<BrowseResult>(
        `/media/sources/${selectedSourceId}/browse?${params.toString()}`,
      );
    },
    enabled: !!selectedSourceId,
    staleTime: 10_000,
  });

  const selectedSource = sources?.find((s) => s.id === selectedSourceId);
  const sourceName = selectedSource?.name ?? 'Quelle';

  /* Handlers */
  function handleSourceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedSourceId(e.target.value);
    setCurrentPath('');
  }

  function handleFolderClick(path: string) {
    setCurrentPath(path);
  }

  function handleNavigate(path: string) {
    setCurrentPath(path);
  }

  /* Render */
  return (
    <div className="space-y-4">
      {/* Source Dropdown */}
      <div className="flex items-center gap-3">
        <select
          value={selectedSourceId}
          onChange={handleSourceChange}
          className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          <option value="">Quelle auswählen</option>
          {sources?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {selectedSourceId && browseQuery.isFetching && (
          <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
        )}
      </div>

      {/* Sources Loading Error */}
      {sourcesError && !sourcesLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Fehler beim Laden der Quellen</p>
            <p className="text-sm text-danger/80 mt-1">
              {(sourcesError as Error).message}
            </p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {selectedSourceId && browseQuery.data && (
        <Breadcrumb
          currentPath={currentPath}
          parentPath={browseQuery.data.parentPath}
          sourceName={sourceName}
          onNavigate={handleNavigate}
        />
      )}

      {/* Browse Content */}
      {selectedSourceId ? (
        <FolderGrid
          folders={browseQuery.data?.folders ?? []}
          files={browseQuery.data?.files ?? []}
          onFolderClick={handleFolderClick}
          isLoading={browseQuery.isLoading}
          error={browseQuery.error as Error | null}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-fg-muted">
          <FolderOpen className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Wähle eine Quelle</p>
          <p className="text-sm mt-1">
            Wähle eine Medienquelle aus, um deren Ordner zu durchsuchen.
          </p>
        </div>
      )}
    </div>
  );
}
