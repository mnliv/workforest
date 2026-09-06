import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createTempGitRepo, runCli } from './test-utils';

// skill install writes to --target, which we always pass explicitly here —
// never rely on the default (~/.claude/skills/workforest) in a test, or it
// would write into the real developer/CI machine's home directory.
describe('workforest skill install', () => {
  let repoDir: string;
  let targetDir: string;

  beforeAll(() => {
    repoDir = createTempGitRepo();
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workforest-skill-target-'));
  });

  afterAll(() => {
    fs.rmSync(targetDir, { recursive: true, force: true });
  });

  it('installs the bundled skill content to --target', () => {
    const result = runCli(`skill install --provider claude --target ${targetDir}`, repoDir);
    expect(result.status).toBe(0);

    expect(fs.existsSync(path.join(targetDir, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.workforest-cli-version'))).toBe(true);
  });

  it('is a no-op on a second install with a matching version stamp', () => {
    const result = runCli(`skill install --provider claude --target ${targetDir}`, repoDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('already up to date');
  });

  it('reinstalls when --force is passed even if already up to date', () => {
    const result = runCli(`skill install --provider claude --target ${targetDir} --force`, repoDir);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('already up to date');
    expect(result.stdout).toContain('Installed');
  });

  it('resyncs when the version stamp is stale, without needing --force', () => {
    fs.writeFileSync(path.join(targetDir, '.workforest-cli-version'), '0.0.1\n');

    const result = runCli(`skill install --provider claude --target ${targetDir}`, repoDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Installed');

    const stamp = fs.readFileSync(path.join(targetDir, '.workforest-cli-version'), 'utf-8').trim();
    expect(stamp).not.toBe('0.0.1');
  });

  it('rejects an unsupported --provider as a usage error', () => {
    const result = runCli(`skill install --provider cursor --target ${targetDir}`, repoDir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('unsupported provider');
  });

  it('replaces a symlinked target without touching what it points to', () => {
    const realClone = fs.mkdtempSync(path.join(os.tmpdir(), 'workforest-skill-clone-'));
    fs.writeFileSync(path.join(realClone, 'USER_MARKER.md'), 'user-owned content');

    const symlinkTarget = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'workforest-skill-symlink-')), 'workforest');
    fs.symlinkSync(realClone, symlinkTarget);

    const result = runCli(`skill install --provider claude --target ${symlinkTarget}`, repoDir);
    expect(result.status).toBe(0);

    // The clone the symlink pointed to must survive untouched.
    expect(fs.existsSync(path.join(realClone, 'USER_MARKER.md'))).toBe(true);
    // The target path itself is now a real directory with the bundled skill.
    expect(fs.lstatSync(symlinkTarget).isSymbolicLink()).toBe(false);
    expect(fs.existsSync(path.join(symlinkTarget, 'SKILL.md'))).toBe(true);

    fs.rmSync(realClone, { recursive: true, force: true });
    fs.rmSync(path.dirname(symlinkTarget), { recursive: true, force: true });
  });
});

describe('passive skill staleness notice', () => {
  let repoDir: string;
  let fakeHome: string;

  beforeAll(() => {
    repoDir = createTempGitRepo();
    fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'workforest-fake-home-'));
  });

  afterAll(() => {
    fs.rmSync(fakeHome, { recursive: true, force: true });
  });

  const defaultTarget = () => path.join(fakeHome, '.claude', 'skills', 'workforest');

  it('says nothing when the skill was never installed', () => {
    const result = runCli('init --force', repoDir, { HOME: fakeHome });
    expect(result.status).toBe(0);
    expect(result.stderr || '').not.toContain('workforest skill installed');
  });

  it('warns on an unrelated command when the installed skill is behind the running CLI', () => {
    runCli('skill install --provider claude', repoDir, { HOME: fakeHome });
    fs.writeFileSync(path.join(defaultTarget(), '.workforest-cli-version'), '0.0.1\n');

    const result = runCli('init --force', repoDir, { HOME: fakeHome });
    expect(result.status).toBe(0);
    expect(result.stderr).toContain(defaultTarget());
    expect(result.stderr).toContain('v0.0.1');
    expect(result.stderr).toContain('workforest skill install --provider claude');
  });

  it('does not show the notice during `skill install` itself', () => {
    // Stamp is still stale from the previous test at this point.
    const result = runCli('skill install --provider claude', repoDir, { HOME: fakeHome });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('is behind this CLI');
    expect(result.stderr || '').not.toContain('is behind this CLI');
  });

  it('says nothing once resynced', () => {
    const result = runCli('init --force', repoDir, { HOME: fakeHome });
    expect(result.status).toBe(0);
    expect(result.stderr || '').not.toContain('is behind this CLI');
  });
});
