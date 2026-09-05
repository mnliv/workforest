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

  it('should not discard commits when re-acquiring the same branch with --base', async () => {
    const wtPath = runCli('acquire --branch persist-me', repoDir).stdout.trim();

    execSync('touch keep.txt && git add keep.txt && git commit -m "must survive"', { cwd: wtPath });

    const releaseResult = runCli(`release ${wtPath}`, repoDir);
    expect(releaseResult.status).toBe(0);

    // Reacquiring the same branch while also passing --base (e.g. an agent
    // that always specifies a base defensively) must NOT force-reset the
    // branch and wipe the commit made above.
    const reacquireResult = runCli('acquire --branch persist-me --base main', repoDir);
    expect(reacquireResult.status).toBe(0);
    expect(reacquireResult.stdout.trim()).toBe(wtPath);

    expect(fs.existsSync(path.join(wtPath, 'keep.txt'))).toBe(true);
    const log = execSync('git log --oneline', { cwd: wtPath, encoding: 'utf-8' });
    expect(log).toContain('must survive');
  });

  it('should never track or remove the main worktree via prune/clean', async () => {
    const pruneResult = runCli('prune', repoDir);
    expect(pruneResult.status).toBe(0);

    const stateResult = runCli('list --json', repoDir);
    const state = JSON.parse(stateResult.stdout);
    expect(state.some((w: any) => path.resolve(w.path) === path.resolve(repoDir))).toBe(false);

    const cleanResult = runCli('clean --all --force --dry-run', repoDir);
    expect(cleanResult.status).toBe(0);
    const mainRepoLine = `- ${fs.realpathSync(repoDir)}`;
    expect(cleanResult.stdout.split('\n').map((l: string) => l.trim())).not.toContain(mainRepoLine);

    // The main checkout must still be intact and usable.
    expect(fs.existsSync(path.join(repoDir, '.git'))).toBe(true);
  });

  it('should require --force to actually remove idle worktrees, but not for --dry-run', async () => {
    const wtPath = runCli('acquire --task clean-check-a', repoDir).stdout.trim();
    runCli(`release ${wtPath}`, repoDir);

    // Bare `clean` must refuse rather than silently wiping idle worktrees.
    const bareResult = runCli('clean', repoDir);
    expect(bareResult.status).toBe(2);
    expect(fs.existsSync(wtPath)).toBe(true);

    // --dry-run previews without needing --force.
    const dryRunResult = runCli('clean --dry-run', repoDir);
    expect(dryRunResult.status).toBe(0);
    expect(dryRunResult.stdout).toContain(wtPath);
    expect(fs.existsSync(wtPath)).toBe(true);

    // --force actually removes it.
    const forceResult = runCli('clean --force', repoDir);
    expect(forceResult.status).toBe(0);
    expect(fs.existsSync(wtPath)).toBe(false);
  });

  it('should not destroy an idle worktree with uncommitted changes, even with --force', async () => {
    const wtPath = runCli('acquire --task clean-check-b', repoDir).stdout.trim();
    execSync('echo dirty > untracked.txt', { cwd: wtPath, shell: '/bin/bash' });
    runCli(`release ${wtPath}`, repoDir); // no --reset: uncommitted state is kept on purpose

    const result = runCli('clean --force', repoDir);
    expect(result.status).toBe(0);

    // git itself refuses to remove a dirty worktree without --force at the
    // git level, which clean deliberately never passes; the worktree and its
    // untracked file must survive, and it must still be tracked in state.
    expect(fs.existsSync(path.join(wtPath, 'untracked.txt'))).toBe(true);
    const stateResult = runCli('list --json', repoDir);
    const state = JSON.parse(stateResult.stdout);
    expect(state.some((w: any) => w.path === wtPath)).toBe(true);
  });
});
