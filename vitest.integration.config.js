import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.js'],
    setupFiles: ['./src/lib/testSupport/loadTestEnv.js'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Integration tests share and truncate one database — never run test files concurrently.
    // Also: per-file isolation (Vitest's default) gives each test file its own module
    // registry, so each file's own `getPool()` in db.js is a distinct pool — that's what
    // makes it safe for every integration file to skip closing its pool in afterAll and
    // just let the process exit close the socket. Don't flip on `--no-isolate` here for a
    // "speedup" without re-adding proper pool teardown; it would let one file's pool close
    // (or truncate) underneath another file sharing the same registry.
    fileParallelism: false,
  },
});
