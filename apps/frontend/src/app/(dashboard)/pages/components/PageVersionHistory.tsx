'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { History, RotateCcw, Loader2, X } from 'lucide-react';

interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  description: string | null;
  blocks: Array<{ type: string; content: Record<string, unknown> }>;
  changedBy: string;
  changeType: string;
  createdAt: string;
}

interface PageVersionHistoryProps {
  pageId: string;
  onClose: () => void;
}

export function PageVersionHistory({ pageId, onClose }: PageVersionHistoryProps) {
  const queryClient = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: ['page-versions', pageId],
    queryFn: () => api.get<PageVersion[]>(`/pages/${pageId}/versions`),
  });

  const restoreMutation = useMutation({
    mutationFn: (version: number) =>
      api.post(`/pages/${pageId}/versions/${version}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      queryClient.invalidateQueries({ queryKey: ['page-versions', pageId] });
      onClose();
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'created': return 'Erstellt';
      case 'updated': return 'Bearbeitet';
      case 'restored': return 'Wiederhergestellt';
      default: return type;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'updated': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'restored': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-fg flex items-center gap-2">
            <History className="h-4 w-4" /> Seiten-Versionen
          </h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
            </div>
          ) : versions && versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-bg-surface transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Version {version.version}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getChangeTypeColor(version.changeType)}`}>
                        {getChangeTypeLabel(version.changeType)}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted">{formatDate(version.createdAt)}</p>
                    <p className="text-xs text-fg-subtle mt-1">
                      {version.blocks.length} Blöcke
                    </p>
                  </div>
                  <button
                    onClick={() => restoreMutation.mutate(version.version)}
                    disabled={restoreMutation.isPending}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Wiederherstellen
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-fg-muted">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Versionen vorhanden</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
