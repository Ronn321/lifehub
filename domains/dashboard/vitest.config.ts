import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Bevorzugt .ts vor .js: in domains/dashboard/src liegen neben den .ts
    // auch (veraltete) kompilierte .js — Tests müssen die .ts-Quellen laden.
    extensions: ['.mjs', '.mts', '.ts', '.js', '.jsx', '.tsx', '.json'],
  },
  test: {
    environment: 'node',
  },
});
