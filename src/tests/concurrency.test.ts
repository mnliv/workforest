import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTempGitRepo, runCli } from './test-utils';

describe('Concurrency and Stale Locks', () => {
  const getStatePath = (repoDir: string) => path.join(repoDir, '.git', 'workforest', 'state.json');

  it('should not allow duplicate worktree assignments during concurrent acquires', async () => {
    const repoDir = createTempGitRepo();
    const numConcurrent = 5;
    const taskNameBase = 'task-';

    // We run multiple acquire commands concurrently.
    const promises = Array.from({ length: numConcurrent }).map((_, i) => 
      runCli(['acquire', '--task', `${taskNameBase}${i}`], repoDir)
    );
    
    const results = await Promise.all(promises);
    
    // Check if any failed
    for (const res of results) {
      if (res.status !== 0) {
        throw new Error(`CLI failed with status ${res.status}: ${res.stderr}`);
      }
    }

    const statePath = getStatePath(repoDir);
    expect(fs.existsSync(statePath)).toBe(true);
    
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(state.worktrees.length).toBe(numConcurrent);

    // Check for duplicates in worktree paths (to ensure they are unique)
    const paths = state.worktrees.map((w: any) => w.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(numConcurrent);
  });

  it('should proceed past a stale lock', async () => {
    const repoDir = createTempGitRepo();
    const stateDir = path.join(repoDir, '.git', 'workforest');
    const statePath = path.join(stateDir, 'state.json');
    const lockPath = statePath + '.lock';

    // Ensure directory exists
    fs.mkdirSync(stateDir, { recursive: true });
    
    // Create a stale lock
    fs.mkdirSync(lockPath);
    // Set mtime to 1 hour ago
    const pastDate = new Date(Date.now() - 3600000);
    fs.utimesSync(lockPath, pastDate, pastDate);

    // Run acquire. It should see the stale lock, remove it, and then succeed.
    const result = runCli(['acquire', '--task', 'stale-task'], repoDir);
    expect(result.status).toBe(0);
  });

  it('should exit with code 3 when a fresh (non-stale) lock is held for the full timeout', async () => {
    const repoDir = createTempGitRepo();
    const stateDir = path.join(repoDir, '.git', 'workforest');
    const lockPath = path.join(stateDir, 'state.json.lock');

    fs.mkdirSync(stateDir, { recursive: true });
    // A freshly-created lock (mtime ~now) is never treated as stale, so the
    // command below must block for the whole timeout and fail with the
    // dedicated lock-timeout exit code documented in the README, not the
    // generic runtime-error code.
    fs.mkdirSync(lockPath);

    const result = runCli(['acquire', '--task', 'blocked-task'], repoDir);
    expect(result.status).toBe(3);
  }, 10000);
});
