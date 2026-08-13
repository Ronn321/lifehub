import { describe, expect, it } from 'vitest';
import { encryptToken, decryptToken } from '../lib/token-crypto';

const SECRET_A = 'a-very-long-random-secret-key-32-chars-minimum';
const SECRET_B = 'a-completely-different-long-secret-key-value';

describe('token-crypto', () => {
  it('roundtrips encrypt -> decrypt with the same key', () => {
    const plain = 'ya29.a0AfH6SMC9-sample-access-token-123456';
    const enc = encryptToken(plain, SECRET_A);
    expect(enc).not.toBe(plain);
    expect(decryptToken(enc, SECRET_A)).toBe(plain);
  });

  it('produces distinct ciphertexts for the same plaintext (random IV)', () => {
    const a = encryptToken('same-value', SECRET_A);
    const b = encryptToken('same-value', SECRET_A);
    expect(a).not.toBe(b);
  });

  it('throws when decrypting with the wrong key', () => {
    const enc = encryptToken('secret-token', SECRET_A);
    expect(() => decryptToken(enc, SECRET_B)).toThrow();
  });

  it('throws on a malformed payload', () => {
    expect(() => decryptToken('not-a-valid-payload', SECRET_A)).toThrow();
  });
});
