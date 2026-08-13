'use client';
import { cn } from '@/lib/cn';
import { Loader2, Paperclip } from 'lucide-react';
import type { ThreadSummary } from './types';
import { formatEmailDate } from './types';

interface ThreadListProps {
  threads: ThreadSummary[];
  selectedId: string | null;
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
}

function ThreadRow({
  thread,
  active,
  onSelect,
}: {
  thread: ThreadSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors',
        active ? 'bg-brand-500/10' : thread.unread ? 'bg-bg' : 'bg-bg-surface hover:bg-bg',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            thread.unread ? 'font-semibold text-fg' : 'font-medium text-fg-muted',
          )}
        >
          {thread.from}
        </span>
        <span className="shrink-0 text-xs text-fg-subtle">
          {formatEmailDate(thread.date)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            thread.unread ? 'font-semibold text-fg' : 'text-fg-muted',
          )}
        >
          {thread.subject || '(kein Betreff)'}
        </span>
        {thread.hasAttachment && <Paperclip className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
      </div>
      <p className="truncate text-xs text-fg-subtle">{thread.snippet}</p>
    </button>
  );
}

export function ThreadList({
  threads,
  selectedId,
  isLoading,
  isError,
  hasMore,
  isLoadingMore,
  onSelect,
  onLoadMore,
}: ThreadListProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-fg-subtle">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!isLoading && isError && (
          <p className="px-4 py-8 text-center text-sm text-danger">
            E-Mails konnten nicht geladen werden.
          </p>
        )}
        {!isLoading && !isError && threads.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-subtle">Keine E-Mails vorhanden.</p>
        )}
        {!isLoading &&
          !isError &&
          threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              active={thread.id === selectedId}
              onSelect={() => onSelect(thread.id)}
            />
          ))}
      </div>
      {hasMore && (
        <div className="border-t border-border p-2">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen…
              </>
            ) : (
              'Mehr laden'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
