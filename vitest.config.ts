import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // Alias "obsidian" to the test mock during test runs.
  // This ensures that any import from "obsidian" in the code under test
  // is redirected to tests/__mocks__/obsidian.ts, allowing tests to run
  // in a Node environment without the real Obsidian API.
  // This alias only applies to Vitest test runs and does not affect production builds,
  // because this config file is only loaded by Vitest.
  resolve: {
    alias: {
      'obsidian': path.resolve(__dirname, 'tests/__mocks__/obsidian.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});