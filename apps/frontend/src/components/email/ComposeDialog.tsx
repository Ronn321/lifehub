'use client';
import { useState, useEffect } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import type { EmailMessage } from './types';
import { buildQuotedHtml, parseRecipients } from './types';

export type ComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward';

export interface ComposeSubmitPayload {
  mode: ComposeMode;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
}

interface ComposeDialogProps {
  open: boolean;
  mode: ComposeMode | null;
  original?: EmailMessage | null; // context for reply / forward
  threadId?: string | null;
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: ComposeSubmitPayload) => void;
}

const MODE_TITLES: Record<ComposeMode, string> = {
  compose: 'Neue Nachricht',
  reply: 'Antworten',
  replyAll: 'Allen antworten',
  forward: 'Weiterleiten',
};

function subjectPrefix(subject: string, mode: ComposeMode): string {
  if (!subject) return '';
  if (mode === 'reply' || mode === 'replyAll') {
    return subject.toLowerCase().startsWith('aw:') || subject.toLowerCase().startsWith('re:')
      ? subject
      : `AW: ${subject}`;
  }
  if (mode === 'forward') {
    return subject.toLowerCase().startsWith('wg:') || subject.toLowerCase().startsWith('fwd:')
      ? subject
      : `WG: ${subject}`;
  }
  return subject;
}

export function ComposeDialog({
  open,
  mode,
  original,
  threadId,
  isPending,
  error,
  onClose,
  onSubmit,
}: ComposeDialogProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Reset form whenever the dialog opens with a new context.
  useEffect(() => {
    if (!open) return;
    if (mode === 'compose') {
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
    } else if (original) {
      const recipients = mode === 'reply' ? [original.from] : [];
      setTo(recipients.join(', '));
      setCc(mode === 'replyAll' ? (original.cc || '') : '');
      setBcc('');
      setSubject(subjectPrefix(original.subject, mode as ComposeMode));
      setBody(mode === 'forward' ? `\n\n--- Ursprüngliche Nachricht ---\n${buildQuotedHtml(original)}` : `\n${buildQuotedHtml(original)}`);
    }
    setShowCc(mode === 'replyAll');
    setShowBcc(false);
  }, [open, mode, original]);

  if (!open || !mode) return null;

  const recipients = parseRecipients(to);
  const ccList = showCc ? parseRecipients(cc) : [];
  const bccList = showBcc ? parseRecipients(bcc) : [];

  const canSubmit =
    !isPending &&
    recipients.length > 0 &&
    (mode === 'forward' ? true : subject.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      mode,
      to: recipients,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject: subject.trim(),
      bodyHtml: body,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{MODE_TITLES[mode]}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-fg-muted transition-colors hover:bg-bg hover:text-fg"
            title="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            <Field label="An">
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="empfaenger@beispiel.de, weitere@beispiel.de"
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:border-brand-500/50 focus:outline-none"
              />
            </Field>
            <div className="flex gap-2">
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="text-xs text-fg-subtle hover:text-brand-500">
                  + Cc
                </button>
              )}
              {!showBcc && (
                <button onClick={() => setShowBcc(true)} className="text-xs text-fg-subtle hover:text-brand-500">
                  + Bcc
                </button>
              )}
            </div>
            {showCc && (
              <Field label="Cc">
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@beispiel.de"
                  className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:border-brand-500/50 focus:outline-none"
                />
              </Field>
            )}
            {showBcc && (
              <Field label="Bcc">
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@beispiel.de"
                  className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:border-brand-500/50 focus:outline-none"
                />
              </Field>
            )}
            <Field label="Betreff">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff"
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:border-brand-500/50 focus:outline-none"
              />
            </Field>
            <Field label="Nachricht">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="Ihre Nachricht…"
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:border-brand-500/50 focus:outline-none resize-y font-mono"
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-border bg-bg-surface px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-bg hover:text-fg disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Senden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
