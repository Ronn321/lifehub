import { HttpException, HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { gmail_v1 } from 'googleapis';
import { GoogleConnectionService } from '@lifehub/integrations-domain';
import {
  buildMimeMessage,
  buildReplyMime,
  encodeHeaderValue,
} from './mime';
import type {
  EmailStatus,
  EmailThreadSummary,
  EmailMessage,
  EmailAttachment,
} from '../entities/email';
import type { SendEmailInput, ReplyInput, ForwardInput, ModifyThreadInput } from '../dtos/email.dto';

interface GmailHeader {
  name?: string | null;
  value?: string | null;
}

interface GmailPart {
  body?: { attachmentId?: string | null; data?: string | null; size?: number | null } | null;
  filename?: string | null;
  headers?: GmailHeader[] | null;
  mimeType?: string | null;
  parts?: GmailPart[] | null;
}

function headerValue(headers: GmailHeader[] | null | undefined, name: string): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

function decodeBody(data: string | null | undefined): string {
  if (!data) return '';
  return Buffer.from(data, 'base64url').toString('utf8');
}

/** Recursively extracts the first matching body part + collects attachments. */
function walkParts(
  part: GmailPart | null | undefined,
  bodyHtml: { v: string },
  bodyText: { v: string },
  attachments: EmailAttachment[],
): void {
  if (!part) return;
  const mime = part.mimeType ?? '';
  if (mime === 'text/html' && !bodyHtml.v) {
    bodyHtml.v = decodeBody(part.body?.data);
  } else if (mime === 'text/plain' && !bodyText.v) {
    bodyText.v = decodeBody(part.body?.data);
  }
  if (part.filename && part.body?.attachmentId && part.body.size != null) {
    attachments.push({
      id: part.body.attachmentId,
      filename: part.filename,
      mimeType: mime,
      size: part.body.size,
    });
  }
  if (part.parts) {
    for (const child of part.parts) {
      walkParts(child, bodyHtml, bodyText, attachments);
    }
  }
}

/** Builds a Gmail search query for a labelId + optional user query. */
export function buildQuery(labelId: string, q?: string): string {
  const parts: string[] = [];
  if (q) parts.push(`(${q})`);
  // Normalisiere Label (case-insensitive, getrimmt)
  const id = (labelId ?? 'INBOX').trim().toUpperCase();
  switch (id) {
    case 'UNREAD':
      // Ungelesene im Posteingang — entspricht mobilem Ordner „Ungelesen“
      parts.push('in:inbox is:unread');
      break;
    case 'STARRED':
      parts.push('is:starred');
      break;
    case 'SENT':
      parts.push('in:sent');
      break;
    case 'TRASH':
      parts.push('in:trash');
      break;
    case 'ARCHIVE':
      parts.push('-in:inbox');
      break;
    case 'INBOX':
      parts.push('in:inbox');
      break;
    default:
      // Unbekannte Labels (z. B. CATEGORY_UPDATES) als Gmail-Label-Query
      // Falls id wie `CATEGORY_...` oder `Label_...` aussieht, nutze label:
      if (id.startsWith('CATEGORY_') || id.startsWith('LABEL_') || id.includes('/')) {
        parts.push(`label:${labelId}`);
      } else if (id.startsWith('IN:') || id.startsWith('IS:') || id.startsWith('LABEL:')) {
        parts.push(labelId as string);
      } else {
        // Fallback: behandle als Label-Name
        // Für Gmail-Benutzerlabels: label:"My Label"
        // Wir versuchen label:ID und fallback zu in:inbox bei Fehlern im Caller
        parts.push(`label:${labelId}`);
      }
      break;
  }
  return parts.join(' ');
}

function mapGmailError(e: unknown): never {
  // Gaxios/Google-APIs wirft Objekte mit `code` (HTTP-Status) und `errors[]` / `message`
  const anyErr = e as Record<string, unknown>;
  const code = typeof anyErr?.code === 'number' ? (anyErr.code as number) : undefined;
  const status = typeof anyErr?.status === 'number' ? (anyErr.status as number) : code;
  const msgRaw = (anyErr?.message as string) || (anyErr?.response as Record<string, unknown>)?.data as string || '';
  const msg = typeof msgRaw === 'string' ? msgRaw : JSON.stringify(msgRaw ?? '');

  // 401/403 → Google-Token ungültig/abgelaufen → 401 für Client (Sitzung neu anmelden)
  if (status === 401 || status === 403) {
    throw new UnauthorizedException(
      'Google-Verbindung abgelaufen — bitte in den Einstellungen neu verbinden.',
    );
  }
  // 429 / 5xx → temporärer Gmail-Fehler → 502 Bad Gateway statt 500
  if (status === 429 || (status !== undefined && status >= 500)) {
    throw new HttpException(
      `Gmail vorübergehend nicht erreichbar (HTTP ${status})${msg ? `: ${msg.slice(0, 200)}` : ''}`,
      HttpStatus.BAD_GATEWAY,
    );
  }
  // Sonstige → 502 mit Details, aber nie blank 500
  const detail = msg ? `: ${msg.slice(0, 300)}` : '';
  throw new HttpException(
    `Gmail-Fehler${status ? ` (HTTP ${status})` : ''}${detail}`,
    HttpStatus.BAD_GATEWAY,
  );
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  constructor(@Inject(GoogleConnectionService) private readonly google: GoogleConnectionService) {}

  private async getGmailOrThrow(ownerId: string): Promise<gmail_v1.Gmail> {
    return this.google.getGmail(ownerId);
  }

  async getStatus(ownerId: string): Promise<EmailStatus> {
    const conn = await this.google.getStatus(ownerId);
    if (!conn.connected) {
      return { connected: false, email: null, unreadInbox: 0 };
    }
    try {
      const gmail = await this.getGmailOrThrow(ownerId);
      const res = await gmail.users.labels.get({ userId: 'me', id: 'INBOX' });
      return {
        connected: true,
        email: conn.email,
        unreadInbox: res.data.messagesUnread ?? 0,
      };
    } catch (e) {
      this.logger.warn(`getStatus failed for ${ownerId}: ${(e as Error).message}`);
      // Bei Gmail-Fehler nicht 500 werfen — Status als getrennt melden mit Warnung
      // aber auch als 502, damit Frontend unterscheiden kann
      if ((e as Record<string, unknown>)?.code === 401 || (e as Record<string, unknown>)?.status === 401) {
        throw new UnauthorizedException('Google-Verbindung abgelaufen — bitte neu verbinden.');
      }
      // Für alle anderen Gmail-Fehler: wirf sauberen 502 statt 500
      throw mapGmailError(e);
    }
  }

  async listThreads(
    ownerId: string,
    options: { labelId?: string; pageToken?: string; maxResults?: number; q?: string },
  ): Promise<{ threads: EmailThreadSummary[]; nextPageToken: string | null; resultSizeEstimate: number }> {
    const labelId = options.labelId ?? 'INBOX';
    const maxResults = Math.min(Math.max(options.maxResults ?? 50, 1), 100);
    let gmail: gmail_v1.Gmail;
    try {
      gmail = await this.getGmailOrThrow(ownerId);
    } catch (e) {
      // Keine Google-Verbindung → 401 (Client zeigt „Sitzung abgelaufen / neu verbinden“)
      throw e;
    }

    let list: gmail_v1.Schema$ListMessagesResponse;
    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: buildQuery(labelId, options.q),
        pageToken: options.pageToken || undefined,
        maxResults,
      });
      list = res.data;
    } catch (e) {
      this.logger.warn(`listThreads query failed (labelId=${labelId} q=${options.q ?? ''}): ${(e as Error).message}`);
      throw mapGmailError(e);
    }
    const ids = (list.messages ?? []).map((m) => m.id).filter((id): id is string => !!id);

    const threads: EmailThreadSummary[] = [];
    for (const id of ids) {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date'],
        });
        const payload = msg.data.payload as GmailPart | undefined;
        const headers = payload?.headers ?? [];
        const labels = msg.data.labelIds ?? [];
        const hasAttachment =
          payload?.mimeType?.startsWith('multipart/mixed') ||
          payload?.parts?.some((p) => p.filename) ||
          false;
        threads.push({
          id: msg.data.id ?? id,
          historyId: msg.data.historyId ?? undefined,
          subject: headerValue(headers, 'Subject'),
          from: headerValue(headers, 'From'),
          to: headerValue(headers, 'To'),
          date: headerValue(headers, 'Date') || null,
          snippet: msg.data.snippet ?? '',
          unread: labels.includes('UNREAD'),
          hasAttachment,
          labels,
        });
      } catch (e) {
        this.logger.warn(`messages.get metadata failed for ${id}: ${(e as Error).message}`);
        // Einzelne defekte Nachricht überspringen statt ganze Liste mit 500 abzubrechen
        continue;
      }
    }

    return {
      threads,
      nextPageToken: list.nextPageToken ?? null,
      resultSizeEstimate: list.resultSizeEstimate ?? 0,
    };
  }

  async getThread(ownerId: string, threadId: string): Promise<{ id: string; messages: EmailMessage[] }> {
    const gmail = await this.getGmailOrThrow(ownerId);
    try {
      const res = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
      const messages = (res.data.messages ?? []).map((m) => this.parseMessage(m));
      return { id: threadId, messages };
    } catch (e) {
      this.logger.warn(`getThread ${threadId} failed: ${(e as Error).message}`);
      throw mapGmailError(e);
    }
  }

  private parseMessage(msg: gmail_v1.Schema$Message): EmailMessage {
    const payload = msg.payload as GmailPart | undefined;
    const headers = payload?.headers ?? [];
    const bodyHtml = { v: '' };
    const bodyText = { v: '' };
    const attachments: EmailAttachment[] = [];
    // Top-level payload: also descend into its own body if it's a direct text part.
    walkParts(payload, bodyHtml, bodyText, attachments);
    // If the top-level payload itself is text/html or text/plain (non-multipart), walkParts handles it.

    return {
      id: msg.id ?? '',
      from: headerValue(headers, 'From'),
      to: headerValue(headers, 'To'),
      cc: headerValue(headers, 'Cc') || undefined,
      subject: headerValue(headers, 'Subject'),
      date: headerValue(headers, 'Date') || null,
      bodyHtml: bodyHtml.v,
      bodyText: bodyText.v,
      snippet: msg.snippet ?? '',
      labelIds: msg.labelIds ?? [],
      attachments,
    };
  }

  async send(ownerId: string, input: SendEmailInput): Promise<{ id: string }> {
    const conn = await this.google.getStatus(ownerId);
    if (!conn.connected || !conn.email) {
      throw new UnauthorizedException('Keine Google-Verbindung.');
    }
    const gmail = await this.getGmailOrThrow(ownerId);
    const raw = buildMimeMessage({
      from: conn.email,
      to: input.to.map((email) => ({ email })),
      cc: (input.cc ?? []).map((email) => ({ email })),
      bcc: (input.bcc ?? []).map((email) => ({ email })),
      subject: input.subject,
      bodyHtml: input.bodyHtml,
    });
    try {
      const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
      return { id: res.data.id ?? '' };
    } catch (e) {
      this.logger.warn(`send failed: ${(e as Error).message}`);
      throw mapGmailError(e);
    }
  }

  async reply(
    ownerId: string,
    threadId: string,
    input: ReplyInput,
  ): Promise<{ id: string }> {
    const conn = await this.google.getStatus(ownerId);
    if (!conn.connected || !conn.email) {
      throw new UnauthorizedException('Keine Google-Verbindung.');
    }
    const gmail = await this.getGmailOrThrow(ownerId);
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: input.messageId,
      format: 'metadata',
      metadataHeaders: ['Message-Id', 'From', 'To', 'Cc', 'Subject', 'References', 'Date'],
    });
    const oh = original.data.payload?.headers ?? [];
    const messageId = headerValue(oh, 'Message-Id');
    const references = (headerValue(oh, 'References') || '')
      .split(/\s+/)
      .filter(Boolean)
      .concat(messageId ? [messageId] : [])
      .join(' ');
    const subjectRaw = headerValue(oh, 'Subject');
    const subject = subjectRaw && !/^AW:/i.test(subjectRaw) && !/^Re:/i.test(subjectRaw)
      ? `AW: ${subjectRaw}`
      : subjectRaw;

    const myAddress = conn.email.toLowerCase();
    const originalFrom = headerValue(oh, 'From');
    const originalTo = headerValue(oh, 'To');
    const originalCc = headerValue(oh, 'Cc');

    // Recipient resolution.
    let toAddrs: string[] = [];
    if (input.replyAll) {
      const candidates = [
        ...parseAddresses(originalFrom),
        ...parseAddresses(originalTo),
        ...parseAddresses(originalCc),
      ];
      const seen = new Set<string>();
      for (const addr of candidates) {
        const lower = addr.toLowerCase();
        if (lower === myAddress) continue;
        if (!seen.has(lower)) {
          seen.add(lower);
          toAddrs.push(addr);
        }
      }
    } else {
      const fromAddrs = parseAddresses(originalFrom).filter((a) => a.toLowerCase() !== myAddress);
      toAddrs = fromAddrs.length > 0 ? fromAddrs : parseAddresses(originalTo);
    }
    if (toAddrs.length === 0) {
      throw new UnauthorizedException('Kein gültiger Empfänger für die Antwort.');
    }

    const originalText = decodeBody(original.data.payload?.body?.data) || '';
    const quoteBody = originalText
      ? `<blockquote style="border-left:2px solid #ccc;margin:0;padding:0 1em">${escapeHtml(originalText)}</blockquote>`
      : '';
    const dateStr = headerValue(oh, 'Date');
    const quoted = `<p></p><blockquote style="border-left:2px solid #ccc;margin:0;padding:0 1em">Am ${dateStr || 'unbekannt'} schrieb ${escapeHtml(originalFrom)}:<br/><br/>${quoteBody}</blockquote>`;

    const bodyHtml = `${input.bodyHtml}${quoted}`;
    const raw = buildReplyMime({
      from: conn.email,
      to: toAddrs.map((email) => ({ email })),
      subject,
      bodyHtml,
      inReplyTo: messageId,
      references,
    });
    try {
      const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId } });
      return { id: res.data.id ?? '' };
    } catch (e) {
      this.logger.warn(`reply failed: ${(e as Error).message}`);
      throw mapGmailError(e);
    }
  }

  async forward(
    ownerId: string,
    messageId: string,
    input: ForwardInput,
  ): Promise<{ id: string }> {
    const conn = await this.google.getStatus(ownerId);
    if (!conn.connected || !conn.email) {
      throw new UnauthorizedException('Keine Google-Verbindung.');
    }
    const gmail = await this.getGmailOrThrow(ownerId);
    let original: gmail_v1.Schema$Message;
    try {
      const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
      original = res.data;
    } catch (e) {
      this.logger.warn(`forward get original failed: ${(e as Error).message}`);
      throw mapGmailError(e);
    }
    const parsed = this.parseMessage(original);
    const headers = original.payload?.headers ?? [];
    const subject = parsed.subject.startsWith('WG:') ? parsed.subject : `WG: ${parsed.subject}`;
    const forwardedHeader = [
      '<p>---------- Weitergeleitete Nachricht ----------</p>',
      `<p>Von: ${escapeHtml(parsed.from)}</p>`,
      `<p>Gesendet: ${escapeHtml(parsed.date ?? '')}</p>`,
      `<p>An: ${escapeHtml(parsed.to)}</p>`,
      `<p>Betreff: ${escapeHtml(parsed.subject)}</p>`,
      `<blockquote>${parsed.bodyHtml || escapeHtml(parsed.bodyText)}</blockquote>`,
    ].join('');

    const bodyHtml = `${input.bodyHtml}${forwardedHeader}`;
    const raw = buildMimeMessage({
      from: conn.email,
      to: input.to.map((email) => ({ email })),
      subject,
      bodyHtml,
    });
    void headers;
    try {
      const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
      return { id: res.data.id ?? '' };
    } catch (e) {
      this.logger.warn(`forward failed: ${(e as Error).message}`);
      throw mapGmailError(e);
    }
  }

  async modifyThread(
    ownerId: string,
    threadId: string,
    input: ModifyThreadInput,
  ): Promise<{ id: string }> {
    const gmail = await this.getGmailOrThrow(ownerId);
    try {
      await gmail.users.threads.modify({
        userId: 'me',
        id: threadId,
        requestBody: {
          addLabelIds: input.addLabelIds ?? [],
          removeLabelIds: input.removeLabelIds ?? [],
        },
      });
      return { id: threadId };
    } catch (e) {
      this.logger.warn(`modifyThread ${threadId} failed: ${(e as Error).message}`);
      throw mapGmailError(e);
    }
  }

  async getAttachment(
    ownerId: string,
    messageId: string,
    attachmentId: string,
  ): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    const gmail = await this.getGmailOrThrow(ownerId);
    try {
      const res = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });
      return {
        data: Buffer.from(res.data.data ?? '', 'base64url'),
        filename: 'attachment',
        mimeType: 'application/octet-stream',
      };
    } catch (e) {
      this.logger.warn(`getAttachment failed: ${(e as Error).message}`);
      throw mapGmailError(e);
    }
  }
}

function parseAddresses(value: string): string[] {
  const raw = value || '';
  // Handle both "Name <email>" and plain email lists, comma separated.
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const m = part.match(/<([^>]+)>/);
    if (m) {
      out.push(m[1] ?? '');
    } else if (part.includes('@')) {
      out.push(part);
    }
  }
  return out.filter(Boolean);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { encodeHeaderValue };
