import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { createTempGitRepo, runCli } from './test-utils';

describe('Workforest Integration Tests', () => {
  let repoDir: string;
  let configPath: string;
  let worktreesDir: string;

  beforeAll(() => {
    repoDir = createTempGitRepo();
    configPath = path.join(repoDir, 'workforest.config.json');
    worktreesDir = path.join(path.dirname(repoDir), path.basename(repoDir) + '-worktrees');
  });

  afterAll(() => {
    // Clean up the created worktrees directory if it exists
    if (fs.existsSync(worktreesDir)) {
      fs.rmSync(worktreesDir, { recursive: true, force: true });
    }
  });

  it('should initialize config', async () => {
    const result = runCli('init', repoDir);
    expect(result.status).toBe(0);
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.defaultBaseBranch).toBe('main');
  });

  it('should acquire a new worktree', async () => {
    const result = runCli('acquire --task task1', repoDir);
    expect(result.status).toBe(0);
    const worktreePath = result.stdout.trim();
    expect(fs.existsSync(worktreePath)).toBe(true);

    const stateResult = runCli('list --json', repoDir);
    expect(stateResult.status).toBe(0);
    const state = JSON.parse(stateResult.stdout);
    expect(state.length).toBeGreaterThanOrEqual(1);
    expect(state.find((w: any) => w.task === 'task1')).toBeDefined();
  });

  it('should reuse an idle worktree', async () => {
    const stateResult = runCli('list --json', repoDir);
    expect(stateResult.status).toBe(0);
    const state = JSON.parse(stateResult.stdout);
    const wtPath = state[0].path;
    
    const releaseResult = runCli(`release ${wtPath}`, repoDir);
    expect(releaseResult.status).toBe(0);

    const acquireResult = runCli('acquire --task task1', repoDir);
    expect(acquireResult.status).toBe(0);
    expect(acquireResult.stdout.trim()).toBe(wtPath);
  });

  it('should acquire a new worktree for a different task/branch', async () => {
    const result = runCli('acquire --task task2 --branch feature/task2', repoDir);
    expect(result.status).toBe(0);
    const wt2Path = result.stdout.trim();
    expect(fs.existsSync(wt2Path)).toBe(true);

    const stateResult = runCli('list --json', repoDir);
    const state = JSON.parse(stateResult.stdout);
    expect(state.some((w: any) => w.task === 'task2')).toBe(true);
  });

  it('should release worktree and reset it', async () => {
    const stateResult = runCli('list --json', repoDir);
    const state = JSON.parse(stateResult.stdout);
    const wtPath = state.find((w: any) => w.task === 'task2').path;

    execSync(`touch ${path.join(wtPath, 'dummy.txt')}`, { cwd: wtPath });
    
    const result = runCli(`release ${wtPath} --reset`, repoDir);
    expect(result.status).toBe(0);

    expect(fs.existsSync(path.join(wtPath, 'dummy.txt'))).toBe(false);
    
    const stateResult2 = runCli('list --json', repoDir);
    const state2 = JSON.parse(stateResult2.stdout);
    expect(state2.find((w: any) => w.path === wtPath).status).toBe('idle');
  });
});
