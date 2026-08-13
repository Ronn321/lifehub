// Shared types for the LifeHub email UI, strictly against the /email API contract.
export interface EmailStatus {
  connected: boolean;
  email: string | null;
  unreadInbox: number;
}

export interface ThreadSummary {
  id: string;
  historyId?: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  unread: boolean;
  hasAttachment: boolean;
  labels: string[];
}

export interface ThreadListResponse {
  threads: ThreadSummary[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  bodyHtml: string;
  bodyText: string;
  snippet: string;
  labelIds: string[];
  attachments: Attachment[];
}

export interface ThreadDetail {
  id: string;
  messages: EmailMessage[];
}

export type FolderKey = 'inbox' | 'sent' | 'trash' | 'archive';

export interface Folder {
  key: FolderKey;
  label: string;
  labelId: string; // sent to the backend as `labelId` query param
}

export const FOLDERS: Folder[] = [
  { key: 'inbox', label: 'Posteingang', labelId: 'INBOX' },
  { key: 'sent', label: 'Gesendet', labelId: 'SENT' },
  { key: 'trash', label: 'Papierkorb', labelId: 'TRASH' },
  { key: 'archive', label: 'Archiv', labelId: 'ARCHIVE' },
];

export function parseRecipients(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Builds a quoted HTML block from the original message, used for replies / forwards. */
export function buildQuotedHtml(original: EmailMessage): string {
  const dateStr = original.date ? new Date(original.date).toLocaleString('de-DE') : '';
  const body = original.bodyText || original.bodyHtml || '';
  const text = body.replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n');
  const escaped = escapeHtml(text || original.snippet || '');
  return `<br><br><blockquote style="border-left:2px solid #ccc;margin:8px 0 0;padding:0 0 0 12px;color:#666;">`
    + `<div>Am ${escapeHtml(dateStr)} schrieb ${escapeHtml(original.from)}:</div><br>`
    + `<div style="white-space:pre-wrap;">${escaped}</div>`
    + `</blockquote>`;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatEmailDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFileSize(size: number): string {
  if (!size && size !== 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
