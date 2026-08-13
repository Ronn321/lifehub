import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // integrations-domain has no dist/; point vitest at its TS source.
      '@lifehub/integrations-domain': fileURLToPath(new URL('../integrations/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});
