'use client';
import { useState, Suspense } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2, PlugZap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { FolderSidebar } from '@/components/email/FolderSidebar';
import { ThreadList } from '@/components/email/ThreadList';
import { ReadingPane, type ComposeMode } from '@/components/email/ReadingPane';
import {
  ComposeDialog,
  type ComposeSubmitPayload,
} from '@/components/email/ComposeDialog';
import { FOLDERS, type FolderKey, type ThreadListResponse, type ThreadDetail, type EmailMessage, type Attachment } from '@/components/email/types';

interface EmailStatus {
  connected: boolean;
  email: string | null;
  unreadInbox: number;
}

interface ModifyPayload {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

function EmailApp() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [selectedLabel, setSelectedLabel] = useState<FolderKey>('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{
    open: boolean;
    mode: ComposeMode | 'compose';
    original: EmailMessage | null;
    threadId: string | null;
  }>({ open: false, mode: 'compose', original: null, threadId: null });
  const [composeError, setComposeError] = useState<string | null>(null);

  const labelId = FOLDERS.find((f) => f.key === selectedLabel)?.labelId ?? 'INBOX';

  const { data: status } = useQuery<EmailStatus>({
    queryKey: ['email', 'status'],
    queryFn: () => api.get<EmailStatus>('/email/status'),
    refetchInterval: 60000,
    enabled: !!accessToken,
  });

  const connected = !!status?.connected;

  const {
    data: threadsData,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery<ThreadListResponse>({
    queryKey: ['email', 'threads', selectedLabel],
    queryFn: ({ pageParam }) =>
      api.get<ThreadListResponse>(
        `/email/threads?labelId=${labelId}&pageToken=${pageParam ?? ''}&maxResults=50`,
      ),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    enabled: !!accessToken && connected,
  });

  const threads = threadsData?.pages.flatMap((p) => p.threads) ?? [];

  const { data: threadDetail, isLoading: threadLoading } = useQuery<ThreadDetail>({
    queryKey: ['email', 'thread', selectedThreadId],
    queryFn: () => api.get<ThreadDetail>(`/email/threads/${selectedThreadId}`),
    enabled: !!accessToken && !!selectedThreadId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['email', 'threads'] });
    queryClient.invalidateQueries({ queryKey: ['email', 'status'] });
    if (selectedThreadId) {
      queryClient.invalidateQueries({ queryKey: ['email', 'thread', selectedThreadId] });
    }
  };

  const modifyMutation = useMutation({
    mutationFn: (payload: ModifyPayload) =>
      api.post(`/email/threads/${selectedThreadId}/modify`, payload),
    onSuccess: () => {
      invalidateAll();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: ComposeSubmitPayload) => {
      if (payload.mode === 'reply' || payload.mode === 'replyAll') {
        const messageId = compose.original?.id;
        if (!messageId || !compose.threadId) throw new Error('Ungültiger Antwortkontext.');
        return api.post(`/email/reply/${compose.threadId}`, {
          messageId,
          bodyHtml: payload.bodyHtml,
          replyAll: payload.mode === 'replyAll',
        });
      }
      if (payload.mode === 'forward') {
        const messageId = compose.original?.id;
        if (!messageId) throw new Error('Ungültiger Weiterleitungs-Kontext.');
        return api.post(`/email/forward/${messageId}`, {
          to: payload.to.join(', '),
          bodyHtml: payload.bodyHtml,
        });
      }
      return api.post('/email/send', {
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        bodyHtml: payload.bodyHtml,
      });
    },
    onSuccess: () => {
      setCompose((c) => ({ ...c, open: false }));
      setComposeError(null);
      invalidateAll();
    },
    onError: (err) => {
      setComposeError(err instanceof Error ? err.message : 'Senden fehlgeschlagen.');
    },
  });

  const handleSelectLabel = (key: FolderKey) => {
    setSelectedLabel(key);
    setSelectedThreadId(null);
  };

  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
  };

  const openCompose = (mode: ComposeMode | 'compose', message?: EmailMessage) => {
    setComposeError(null);
    setCompose({
      open: true,
      mode,
      original: message ?? null,
      threadId: message ? selectedThreadId : null,
    });
  };

  const handleDownloadAttachment = async (message: EmailMessage, attachment: Attachment) => {
    try {
      await api.download(`/email/messages/${message.id}/attachments/${attachment.id}`);
    } catch (err) {
      // surface as noop; the api client already throws a German message
      console.error(err);
    }
  };

  const handleModify = (payload: ModifyPayload) => {
    if (!selectedThreadId) return;
    modifyMutation.mutate(payload);
  };

  const handleMarkRead = (unread: boolean) => {
    if (unread) handleModify({ addLabelIds: ['UNREAD'] });
    else handleModify({ removeLabelIds: ['UNREAD'] });
  };

  const handleArchive = () => {
    handleModify({ removeLabelIds: ['INBOX', 'UNREAD'] });
  };

  const handleTrash = () => {
    handleModify({ addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] });
  };

  // ─── Nicht verbunden ───
  if (!!accessToken && status && !connected) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
            <PlugZap className="h-6 w-6 text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold">Kein Google-Konto verbunden</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Verbinden Sie Ihr Google-Konto, um E-Mails zu lesen und zu senden.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            In den Einstellungen verbinden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden lg:h-[calc(100vh-4rem)]">
      <div className="flex h-full min-h-0 flex-1 flex-col lg:flex-row">
        <FolderSidebar
          selectedLabel={selectedLabel}
          onSelect={handleSelectLabel}
          unreadInbox={status?.unreadInbox ?? 0}
          onCompose={() => openCompose('compose')}
        />

        {/* Thread list — full width on mobile, 340px column on desktop */}
        <div className={selectedThreadId ? 'hidden lg:block lg:w-[340px] lg:shrink-0' : 'w-full lg:w-[340px] lg:shrink-0'}>
          <ThreadList
            threads={threads}
            selectedId={selectedThreadId}
            isLoading={isLoading}
            isError={isError}
            hasMore={!!hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onSelect={handleSelectThread}
            onLoadMore={() => fetchNextPage()}
          />
        </div>

        {/* Reading pane — detail view on mobile, flex column on desktop */}
        {selectedThreadId ? (
          <div className="min-h-0 min-w-0 flex-1 lg:block">
            <ReadingPane
              thread={threadDetail ?? ({ id: selectedThreadId, messages: [] } as ThreadDetail)}
              isLoading={threadLoading}
              onBack={() => setSelectedThreadId(null)}
              onCompose={(mode: ComposeMode, message: EmailMessage) => openCompose(mode, message)}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onTrash={handleTrash}
              isMutating={modifyMutation.isPending}
              onDownloadAttachment={handleDownloadAttachment}
            />
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center border-l border-border text-fg-subtle lg:flex">
            Wählen Sie eine E-Mail aus.
          </div>
        )}
      </div>

      <ComposeDialog
        open={compose.open}
        mode={compose.mode}
        original={compose.original}
        threadId={compose.threadId}
        isPending={sendMutation.isPending}
        error={composeError}
        onClose={() => {
          if (!sendMutation.isPending) setCompose((c) => ({ ...c, open: false }));
        }}
        onSubmit={(payload) => sendMutation.mutate(payload)}
      />
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      }
    >
      <EmailApp />
    </Suspense>
  );
}
