import { describe, expect, it } from 'vitest';
import { createRendererToken, verifyRendererToken } from './auth.js';

describe('browser renderer stream tokens', () => {
  it('creates a token that can be verified for the same session', () => {
    const issued = createRendererToken('session-1', 'test-key', 300, 1_700_000_000);

    expect(verifyRendererToken('session-1', issued.token, 'test-key', 1_700_000_001)).toBe(true);
    expect(verifyRendererToken('session-2', issued.token, 'test-key', 1_700_000_001)).toBe(false);
  });

  it('rejects expired, malformed and wrongly signed tokens', () => {
    const issued = createRendererToken('session-1', 'test-key', 1, 1_700_000_000);

    expect(verifyRendererToken('session-1', issued.token, 'test-key', 1_700_000_001)).toBe(false);
    expect(verifyRendererToken('session-1', issued.token, 'test-key', 1_700_000_002)).toBe(false);
    expect(verifyRendererToken('session-1', 'not-a-token', 'test-key', 1_700_000_001)).toBe(false);
    expect(verifyRendererToken('session-1', issued.token, 'wrong-key', 1_700_000_001)).toBe(false);
  });
});
