'use client';

import {
  Folder,
  FileText,
  Loader2,
  AlertCircle,
  Video,
  FolderOpen,
} from 'lucide-react';
import { getMediaStreamUrl } from '@/lib/media';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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

interface FolderGridProps {
  folders: BrowseFolderItem[];
  files: MediaFile[];
  onFolderClick: (path: string) => void;
  onFileClick?: (file: MediaFile) => void;
  isLoading: boolean;
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function isVideo(mimeType?: string): boolean {
  return !!mimeType?.startsWith('video/');
}

function isImage(mimeType?: string): boolean {
  return !!mimeType?.startsWith('image/');
}

/* ------------------------------------------------------------------ */
/*  FolderGrid                                                        */
/* ------------------------------------------------------------------ */

export function FolderGrid({
  folders,
  files,
  onFolderClick,
  onFileClick,
  isLoading,
  error,
}: FolderGridProps) {
  /* Loading */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Lade Ordner …
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Fehler beim Laden des Ordners</p>
          <p className="text-sm text-danger/80 mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  /* Empty */
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted">
        <FolderOpen className="h-10 w-10 mb-3 opacity-40" />
        <p className="font-medium">Keine Dateien</p>
        <p className="text-sm mt-1">
          Dieser Ordner enthält keine Dateien oder Unterordner.
        </p>
      </div>
    );
  }

  /* Grid */
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {/* Folders */}
      {folders.map((folder) => (
        <button
          key={folder.path}
          onClick={() => onFolderClick(folder.path)}
          className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-bg-surface p-4 hover:border-brand-500/50 hover:bg-bg-raised transition-colors text-center"
        >
          <Folder className="h-10 w-10 text-brand-500 group-hover:text-brand-400 transition-colors" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{folder.name}</p>
            <p className="text-xs text-fg-muted">
              {folder.itemCount} Date{folder.itemCount !== 1 ? 'ien' : 'i'}
            </p>
          </div>
        </button>
      ))}

      {/* Files */}
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => onFileClick?.(file)}
          className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-bg-surface hover:border-brand-500/50 transition-colors"
        >
          {isImage(file.mimeType) ? (
            <img
              src={getMediaStreamUrl(file.id)}
              alt={file.filename}
              className="h-full w-full object-cover"
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
            />
          ) : isVideo(file.mimeType) && file.thumbnailPath ? (
            <>
              <img
                src={file.thumbnailPath}
                alt={file.filename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-black/50 p-2">
                  <Video className="h-5 w-5 text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-bg-raised">
              {isVideo(file.mimeType) ? (
                <Video className="h-10 w-10 opacity-30" />
              ) : (
                <FileText className="h-10 w-10 opacity-30" />
              )}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="text-[10px] text-white truncate">{file.filename}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
