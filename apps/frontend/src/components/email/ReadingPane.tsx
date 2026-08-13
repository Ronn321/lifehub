'use client';
import { cn } from '@/lib/cn';
import {
  ArrowLeft, Reply, ReplyAll, Forward, Archive, Trash2,
  CheckCheck, MailOpen, Loader2, Paperclip, Download,
} from 'lucide-react';
import type { ThreadDetail, EmailMessage, Attachment } from './types';
import { formatEmailDate, formatFileSize } from './types';

export type ComposeMode = 'reply' | 'replyAll' | 'forward';

interface ReadingPaneProps {
  thread: ThreadDetail;
  isLoading: boolean;
  onBack: () => void;
  onCompose: (mode: ComposeMode, message: EmailMessage) => void;
  onMarkRead: (unread: boolean) => void;
  onArchive: () => void;
  onTrash: () => void;
  isMutating: boolean;
  onDownloadAttachment: (message: EmailMessage, attachment: Attachment) => void;
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
  danger,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border bg-bg-surface p-2 text-fg-muted transition-colors hover:text-fg disabled:opacity-50',
        danger ? 'hover:text-danger' : 'hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

export function ReadingPane({
  thread,
  isLoading,
  onBack,
  onCompose,
  onMarkRead,
  onArchive,
  onTrash,
  isMutating,
  onDownloadAttachment,
}: ReadingPaneProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-fg-subtle">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Der Thread ist ungelesen, wenn irgendeine Nachricht das UNREAD-Label trägt.
  const isUnread = thread.messages.some((m) => m.labelIds.includes('UNREAD'));
  const latest = thread.messages[thread.messages.length - 1];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Mobile back button */}
      <div className="flex items-center gap-2 border-b border-border p-3 lg:hidden">
        <IconButton title="Zurück zur Liste" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </IconButton>
        <span className="truncate text-sm font-medium">{thread.messages[0]?.subject || '(kein Betreff)'}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <IconButton title="Antworten" onClick={() => latest && onCompose('reply', latest)}>
          <Reply className="h-4 w-4" />
        </IconButton>
        <IconButton title="Allen antworten" onClick={() => latest && onCompose('replyAll', latest)}>
          <ReplyAll className="h-4 w-4" />
        </IconButton>
        <IconButton title="Weiterleiten" onClick={() => latest && onCompose('forward', latest)}>
          <Forward className="h-4 w-4" />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-border" />
        <IconButton title="Archivieren" onClick={onArchive} disabled={isMutating}>
          <Archive className="h-4 w-4" />
        </IconButton>
        <IconButton title="In den Papierkorb" onClick={onTrash} disabled={isMutating} danger>
          <Trash2 className="h-4 w-4" />
        </IconButton>
        {isUnread ? (
          <IconButton title="Als gelesen markieren" onClick={() => onMarkRead(false)} disabled={isMutating}>
            <CheckCheck className="h-4 w-4" />
          </IconButton>
        ) : (
          <IconButton title="Als ungelesen markieren" onClick={() => onMarkRead(true)} disabled={isMutating}>
            <MailOpen className="h-4 w-4" />
          </IconButton>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold">{thread.messages[0]?.subject || '(kein Betreff)'}</h2>
          {thread.messages.map((message) => (
            <div key={message.id} className="mt-4">
              <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium text-fg">{message.from}</span>
                <span className="text-fg-subtle">{formatEmailDate(message.date)}</span>
              </div>
              <div className="text-xs text-fg-subtle">
                An: {message.to}
                {message.cc ? ` · Cc: ${message.cc}` : ''}
              </div>

              {/* Attachments */}
              {message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => onDownloadAttachment(message, att)}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-surface px-3 py-2 text-xs text-fg-muted transition-colors hover:bg-bg hover:text-fg"
                      title="Anhang herunterladen"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="max-w-[200px] truncate font-medium">{att.filename}</span>
                      <span className="text-fg-subtle">({formatFileSize(att.size)})</span>
                      <Download className="h-3.5 w-3.5 text-fg-subtle" />
                    </button>
                  ))}
                </div>
              )}

              {/* Body — sandboxed iframe; fallback to plain text */}
              {message.bodyHtml ? (
                <iframe
                  sandbox=""
                  title={message.subject}
                  className="mt-3 min-h-[300px] w-full bg-transparent"
                  srcDoc={message.bodyHtml}
                />
              ) : (
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                  {message.bodyText || message.snippet}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
