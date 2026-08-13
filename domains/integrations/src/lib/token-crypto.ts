import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

/** Derives a 32-byte AES key from the configured secret via sha256. */
function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext token with AES-256-GCM.
 * Output format: `<iv>.<tag>.<ciphertext>` where each part is base64url encoded.
 */
export function encryptToken(plain: string, secret: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, keyFromSecret(secret), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

/**
 * Decrypts a token previously produced by encryptToken.
 * Throws if the payload is malformed or the key/tag mismatch.
 */
export function decryptToken(payload: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted token payload');
  }
  const decipher = createDecipheriv(
    ALGO,
    keyFromSecret(secret),
    Buffer.from(ivB64, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
