import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      // Exclude nested per-task worktree directories (e.g. wt-<task-name>/),
      // which contain full copies of src/tests/*.test.ts and would otherwise
      // be picked up and run concurrently against the shared worktree state
      // file, causing lock/race contention and spurious failures.
      '**/wt-*/**',
    ],
  },
});
