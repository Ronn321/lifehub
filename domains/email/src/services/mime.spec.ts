import { describe, expect, it, vi } from 'vitest';
import { buildMimeMessage, buildReplyMime, encodeHeaderValue } from './mime';

describe('encodeHeaderValue', () => {
  it('keeps plain ASCII unchanged', () => {
    expect(encodeHeaderValue('Hallo Welt')).toBe('Hallo Welt');
  });

  it('RFC2047-encodes non-ASCII subjects', () => {
    const enc = encodeHeaderValue('Grüße');
    expect(enc).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
  });
});

describe('buildMimeMessage', () => {
  it('emits the core headers and a base64 body', () => {
    const raw = buildMimeMessage({
      from: 'me@example.com',
      to: [{ email: 'you@example.com' }],
      cc: [{ email: 'cc@example.com' }],
      subject: 'Betreff',
      bodyHtml: '<p>Hi</p>',
    });
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    expect(decoded).toContain('From: me@example.com');
    expect(decoded).toContain('To: you@example.com');
    expect(decoded).toContain('Cc: cc@example.com');
    expect(decoded).toContain('Subject: Betreff');
    expect(decoded).toContain('MIME-Version: 1.0');
    expect(decoded).toContain('Content-Type: text/html; charset=UTF-8');
    expect(decoded).toContain('Content-Transfer-Encoding: base64');
    // body is base64-encoded HTML
    expect(decoded).toContain(Buffer.from('<p>Hi</p>', 'utf8').toString('base64'));
  });

  it('RFC2047-encodes non-ASCII subjects in the header', () => {
    const raw = buildMimeMessage({
      from: 'me@example.com',
      to: [{ email: 'you@example.com' }],
      subject: 'Grüße',
      bodyHtml: 'x',
    });
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    expect(decoded).toContain('=?UTF-8?B?');
  });
});

describe('buildReplyMime', () => {
  it('adds In-Reply-To and References headers', () => {
    const raw = buildReplyMime({
      from: 'me@example.com',
      to: [{ email: 'orig@example.com' }],
      subject: 'AW: Hallo',
      bodyHtml: '<p>Antwort</p>',
      inReplyTo: '<abc@mail.gmail.com>',
      references: '<abc@mail.gmail.com>',
    });
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    expect(decoded).toContain('In-Reply-To: <abc@mail.gmail.com>');
    expect(decoded).toContain('References: <abc@mail.gmail.com>');
    expect(decoded).toContain('Subject: AW: Hallo');
  });
});
