import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    // .ts VOR .js auflösen: im Repo liegen veraltete getrackte .js-Artefakte
    // neben den .ts-Quellen (Stand 2026-07-05); ohne diese Reihenfolge würden
    // Imports wie '../../src/services/media.service' auf das stale .js zeigen.
    extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'],
  },
});
