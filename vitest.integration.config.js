import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.js'],
    setupFiles: ['./src/lib/testSupport/loadTestEnv.js'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Integration tests share and truncate one database — never run test files concurrently.
    fileParallelism: false,
  },
});
