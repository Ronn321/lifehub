'use client';

import { useState } from 'react';
import { Link2, ChevronRight, ExternalLink, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Page {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
}

interface PageReferenceBlockProps {
  pageId: string;
  pages: Page[];
  onChange: (data: { pageId: string }) => void;
}

export function PageReferenceBlock({ pageId, pages, onChange }: PageReferenceBlockProps) {
  const [isEditing, setIsEditing] = useState(!pageId || !pages.find((p) => p.id === pageId));
  const router = useRouter();
  const linkedPage = pages.find((p) => p.id === pageId);

  if (isEditing || !linkedPage) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-3 bg-bg-surface">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-fg-muted" />
          <span className="text-xs text-fg-muted">Seite auswählen</span>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {pages.length === 0 ? (
            <p className="text-xs text-fg-muted py-2">Keine Seiten vorhanden</p>
          ) : (
            pages.map((page) => (
              <button
                key={page.id}
                onClick={() => {
                  onChange({ pageId: page.id });
                  setIsEditing(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  pageId === page.id ? 'bg-brand-50 dark:bg-brand-950' : ''
                }`}
              >
                <span>{page.icon ?? '📄'}</span>
                <span className="flex-1 truncate">{page.title}</span>
                <ChevronRight className="h-3 w-3 text-fg-muted" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-bg-surface hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-3">
        <span className="text-xl">{linkedPage.icon ?? '📄'}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{linkedPage.title}</h4>
          {linkedPage.description && (
            <p className="text-xs text-fg-muted mt-1 line-clamp-2">{linkedPage.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="text-fg-muted hover:text-brand-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Verweis ändern"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/pages?open=${linkedPage.id}`); }}
            className="text-fg-muted hover:text-brand-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Zur Seite navigieren"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
