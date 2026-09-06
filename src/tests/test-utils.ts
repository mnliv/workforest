import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function createTempGitRepo(): string {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workforest-test-'));
  execSync('git init', { cwd: repoDir });
  execSync('git config user.email "test@example.com"', { cwd: repoDir });
  execSync('git config user.name "Test User"', { cwd: repoDir });
  execSync('git commit --allow-empty -m "initial commit"', { cwd: repoDir });
  return repoDir;
}

export function runCli(args: string | string[], cwd: string, env?: NodeJS.ProcessEnv) {
  // Get absolute path to cli.js relative to this file
  const cliPath = path.resolve(path.join(__dirname, '../../dist/cli.js'));
  const argv = Array.isArray(args) ? args : args.split(' ').filter(Boolean);
  // spawnSync (rather than execSync) so stderr is captured consistently
  // whether the command succeeds or fails, not only on a thrown error.
  const result = spawnSync('node', [cliPath, ...argv], {
    cwd,
    encoding: 'utf-8',
    env: env ? { ...process.env, ...env } : process.env,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error || null,
    status: result.status,
  };
}
