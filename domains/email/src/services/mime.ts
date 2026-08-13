// MIME message builder for Gmail `raw` payloads.

export interface MimeRecipient {
  name?: string;
  address: string;
}

export interface MimeAddress {
  email: string;
}

export interface MimeSendInput {
  from: string;
  to: MimeAddress[];
  cc?: MimeAddress[];
  bcc?: MimeAddress[];
  subject: string;
  bodyHtml: string;
  /** Optional MIME headers for replies (In-Reply-To, References). */
  extraHeaders?: Record<string, string>;
}

const CRLF = '\r\n';

/** Encodes a header value in RFC 2047 UTF-8 when it contains non-ASCII characters. */
export function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/[\u0080-\uffff]/.test(value)) {
    const b64 = Buffer.from(value, 'utf8').toString('base64');
    return `=?UTF-8?B?${b64}?=`;
  }
  return value;
}

function addressList(addrs: MimeAddress[] | undefined): string {
  if (!addrs || addrs.length === 0) return '';
  return addrs.map((a) => encodeHeaderValue(a.email)).join(', ');
}

function header(name: string, value: string): string {
  return `${name}: ${value}${CRLF}`;
}

/** Builds a base64url-encoded MIME message ready for gmail.users.messages.send. */
export function buildMimeMessage(input: MimeSendInput): string {
  const headers = [
    header('From', encodeHeaderValue(input.from)),
    header('To', addressList(input.to)),
  ];
  if (input.cc && input.cc.length > 0) headers.push(header('Cc', addressList(input.cc)));
  if (input.bcc && input.bcc.length > 0) headers.push(header('Bcc', addressList(input.bcc)));
  headers.push(header('Subject', encodeHeaderValue(input.subject)));
  headers.push(header('MIME-Version', '1.0'));
  headers.push(header('Content-Type', 'text/html; charset=UTF-8'));
  headers.push(header('Content-Transfer-Encoding', 'base64'));
  if (input.extraHeaders) {
    for (const [k, v] of Object.entries(input.extraHeaders)) {
      headers.push(header(k, encodeHeaderValue(v)));
    }
  }

  const bodyB64 = Buffer.from(input.bodyHtml, 'utf8').toString('base64');
  const mime = headers.join('') + CRLF + bodyB64;
  return Buffer.from(mime, 'utf8').toString('base64url');
}

export interface MimeReplyInput {
  from: string;
  to: MimeAddress[];
  cc?: MimeAddress[];
  subject: string;
  bodyHtml: string;
  inReplyTo: string;
  references: string;
}

/** Builds a MIME message with In-Reply-To + References headers (for replies). */
export function buildReplyMime(input: MimeReplyInput): string {
  return buildMimeMessage({
    ...input,
    extraHeaders: {
      'In-Reply-To': input.inReplyTo,
      References: input.references,
    },
  });
}
