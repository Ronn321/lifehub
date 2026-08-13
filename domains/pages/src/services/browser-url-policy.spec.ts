import { describe, expect, it } from 'vitest';
import { validateBrowserUrl } from './browser-url-policy';

describe('validateBrowserUrl', () => {
  it('accepts public http and https URLs', async () => {
    await expect(validateBrowserUrl('https://www.example.com/path?q=lifehub')).resolves.toMatchObject({
      protocol: 'https:',
      hostname: 'www.example.com',
    });
    await expect(validateBrowserUrl('http://example.com')).resolves.toMatchObject({
      protocol: 'http:',
      hostname: 'example.com',
    });
  });

  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,<script>alert(1)</script>',
    'chrome://settings',
    'http://localhost:3007/health',
    'http://127.0.0.1:5432',
    'http://192.168.1.10/admin',
    'http://10.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
  ])('rejects unsafe URL %s', async (url) => {
    await expect(validateBrowserUrl(url)).rejects.toThrow();
  });

  it('rejects credentials embedded in a URL', async () => {
    await expect(validateBrowserUrl('https://user:password@example.com')).rejects.toThrow();
  });

  it('supports an explicit hostname allowlist for controlled internal services', async () => {
    await expect(validateBrowserUrl('http://searxng:8080/search?q=lifehub', ['searxng'])).resolves.toMatchObject({
      hostname: 'searxng',
    });
    await expect(validateBrowserUrl('http://postgres:5432', ['searxng'])).rejects.toThrow();
  });
});
