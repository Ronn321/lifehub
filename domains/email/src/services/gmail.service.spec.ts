import { describe, expect, it, vi } from 'vitest';
import { GmailService } from './gmail.service';
import type { GoogleConnectionService } from '@lifehub/integrations-domain';

function makeGmailMock() {
  const send = vi.fn();
  const labelsGet = vi.fn();
  const messagesGet = vi.fn();
  const messagesList = vi.fn();
  const threadsGet = vi.fn();
  const threadsModify = vi.fn();
  const attachmentsGet = vi.fn();

  const gmail = {
    users: {
      labels: { get: labelsGet },
      messages: {
        list: messagesList,
        get: messagesGet,
        send,
        attachments: { get: attachmentsGet },
      },
      threads: { get: threadsGet, modify: threadsModify },
    },
  };
  return { gmail, send, labelsGet, messagesGet, messagesList, threadsGet, threadsModify, attachmentsGet };
}

function makeGoogle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getStatus: vi.fn(),
    getGmail: vi.fn(),
    ...overrides,
  } as unknown as GoogleConnectionService;
}

describe('GmailService', () => {
  it('returns connected:false when there is no Google connection', async () => {
    const google = makeGoogle({ getStatus: vi.fn().mockResolvedValue({ connected: false, email: null }) });
    const svc = new GmailService(google);
    const status = await svc.getStatus('owner-1');
    expect(status).toEqual({ connected: false, email: null, unreadInbox: 0 });
    expect(google.getGmail).not.toHaveBeenCalled();
  });

  it('reports unread inbox count when connected', async () => {
    const { gmail, labelsGet } = makeGmailMock();
    labelsGet.mockResolvedValue({ data: { messagesUnread: 7 } });
    const google = makeGoogle({
      getStatus: vi.fn().mockResolvedValue({ connected: true, email: 'a@example.com' }),
      getGmail: vi.fn().mockResolvedValue(gmail),
    });
    const svc = new GmailService(google);
    const status = await svc.getStatus('owner-1');
    expect(status).toEqual({ connected: true, email: 'a@example.com', unreadInbox: 7 });
  });

  it('lists threads with parsed rows (unread + attachment + labels)', async () => {
    const { gmail, messagesList, messagesGet } = makeGmailMock();
    messagesList.mockResolvedValue({
      data: { messages: [{ id: 'm1' }, { id: 'm2' }], nextPageToken: 'tok', resultSizeEstimate: 2 },
    });
    messagesGet.mockImplementation(({ id }) =>
      Promise.resolve({
        data: {
          id,
          snippet: 'snippet',
          labelIds: id === 'm1' ? ['INBOX', 'UNREAD'] : ['INBOX'],
          payload: {
            mimeType: id === 'm1' ? 'multipart/mixed' : 'text/plain',
            headers: [
              { name: 'Subject', value: id === 'm1' ? 'S1' : 'S2' },
              { name: 'From', value: 'from@example.com' },
              { name: 'To', value: 'to@example.com' },
              { name: 'Date', value: 'Mon, 1 Jan 2026 10:00:00 +0000' },
            ],
            parts: id === 'm1' ? [{ filename: 'f.pdf', mimeType: 'application/pdf', body: { attachmentId: 'a1', size: 5 } }] : [],
          },
        },
      }),
    );
    const google = makeGoogle({ getGmail: vi.fn().mockResolvedValue(gmail) });
    const svc = new GmailService(google);
    const res = await svc.listThreads('owner-1', { labelId: 'INBOX' });

    expect(messagesList).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'in:inbox', maxResults: 50, userId: 'me' }),
    );
    expect(messagesGet).toHaveBeenCalledTimes(2);
    expect(res.threads).toHaveLength(2);
    expect(res.threads[0]!).toMatchObject({
      id: 'm1', subject: 'S1', unread: true, hasAttachment: true, labels: ['INBOX', 'UNREAD'],
    });
    expect(res.threads[1]!).toMatchObject({ id: 'm2', subject: 'S2', unread: false, hasAttachment: false });
    expect(res.nextPageToken).toBe('tok');
    expect(res.resultSizeEstimate).toBe(2);
  });

  it('maps ARCHIVE label to -in:inbox query', async () => {
    const { gmail, messagesList } = makeGmailMock();
    messagesList.mockResolvedValue({ data: { messages: [] } });
    const google = makeGoogle({ getGmail: vi.fn().mockResolvedValue(gmail) });
    const svc = new GmailService(google);
    await svc.listThreads('owner-1', { labelId: 'ARCHIVE' });
    expect(messagesList).toHaveBeenCalledWith(expect.objectContaining({ q: '-in:inbox' }));
  });

  it('sends a message with a valid base64url raw payload', async () => {
    const { gmail, send } = makeGmailMock();
    send.mockResolvedValue({ data: { id: 'sent-1' } });
    const google = makeGoogle({
      getStatus: vi.fn().mockResolvedValue({ connected: true, email: 'me@example.com' }),
      getGmail: vi.fn().mockResolvedValue(gmail),
    });
    const svc = new GmailService(google);
    const result = await svc.send('owner-1', {
      to: ['you@example.com'],
      subject: 'Hallo',
      bodyHtml: '<p>Hi</p>',
    });

    expect(result).toEqual({ id: 'sent-1' });
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0]![0];
    expect(arg.userId).toBe('me');
    const raw = arg.requestBody.raw;
    expect(typeof raw).toBe('string');
    // raw must be valid base64url that decodes back to MIME containing From/To/Subject
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    expect(decoded).toContain('From: me@example.com');
    expect(decoded).toContain('To: you@example.com');
    expect(decoded).toContain('Content-Type: text/html; charset=UTF-8');
  });

  it('throws UnauthorizedException when sending without a connection', async () => {
    const google = makeGoogle({ getStatus: vi.fn().mockResolvedValue({ connected: false, email: null }) });
    const svc = new GmailService(google);
    await expect(
      svc.send('owner-1', { to: ['x@example.com'], subject: 's', bodyHtml: '<p>y</p>' }),
    ).rejects.toThrow('Keine Google-Verbindung.');
  });

  it('passes labelIds to threads.modify', async () => {
    const { gmail, threadsModify } = makeGmailMock();
    threadsModify.mockResolvedValue({ data: {} });
    const google = makeGoogle({ getGmail: vi.fn().mockResolvedValue(gmail) });
    const svc = new GmailService(google);
    await svc.modifyThread('owner-1', 'thread-9', { addLabelIds: ['STARRED'], removeLabelIds: ['INBOX'] });

    expect(threadsModify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'thread-9',
      requestBody: { addLabelIds: ['STARRED'], removeLabelIds: ['INBOX'] },
    });
  });

  it('parses a full thread with bodyHtml, bodyText and attachments', async () => {
    const { gmail, threadsGet } = makeGmailMock();
    threadsGet.mockResolvedValue({
      data: {
        id: 'thread-1',
        messages: [
          {
            id: 'msg-1',
            snippet: 's',
            labelIds: ['INBOX'],
            payload: {
              mimeType: 'multipart/mixed',
              headers: [
                { name: 'From', value: 'a@example.com' },
                { name: 'To', value: 'b@example.com' },
                { name: 'Cc', value: 'c@example.com' },
                { name: 'Subject', value: 'Betreff' },
                { name: 'Date', value: 'Tue, 2 Feb 2026 12:00:00 +0000' },
              ],
              parts: [
                {
                  mimeType: 'text/plain',
                  body: { data: Buffer.from('Hello', 'utf8').toString('base64url') },
                },
                {
                  mimeType: 'text/html',
                  body: { data: Buffer.from('<b>Hello</b>', 'utf8').toString('base64url') },
                },
                {
                  filename: 'report.pdf',
                  mimeType: 'application/pdf',
                  body: { attachmentId: 'att-1', size: 1234 },
                },
              ],
            },
          },
        ],
      },
    });
    const google = makeGoogle({ getGmail: vi.fn().mockResolvedValue(gmail) });
    const svc = new GmailService(google);
    const thread = await svc.getThread('owner-1', 'thread-1');

    expect(thread.messages).toHaveLength(1);
    const msg = thread.messages[0]!;
    expect(msg.bodyText).toBe('Hello');
    expect(msg.bodyHtml).toBe('<b>Hello</b>');
    expect(msg.cc).toBe('c@example.com');
    expect(msg.subject).toBe('Betreff');
    expect(msg.attachments).toEqual([{ id: 'att-1', filename: 'report.pdf', mimeType: 'application/pdf', size: 1234 }]);
  });
});
