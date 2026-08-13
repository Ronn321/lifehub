import { createHmac, timingSafeEqual } from 'node:crypto';

export function createRendererToken(sessionId, key, ttlSeconds = 300, now = Math.floor(Date.now() / 1000)) {
  const expiresAt = now + ttlSeconds;
  const payload = `${sessionId}.${expiresAt}`;
  const signature = createHmac('sha256', key).update(payload).digest('hex');
  return { token: `${expiresAt}.${signature}`, expiresAt };
}

export function verifyRendererToken(sessionId, token, key, now = Math.floor(Date.now() / 1000)) {
  const [expires, signature] = String(token || '').split('.', 2);
  const expiresAt = Number(expires);
  if (!expiresAt || expiresAt <= now || !/^[a-f0-9]{64}$/i.test(signature || '')) return false;

  const expected = createHmac('sha256', key).update(`${sessionId}.${expiresAt}`).digest('hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
