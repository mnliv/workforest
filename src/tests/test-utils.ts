import { execSync } from 'child_process';
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

export function runCli(args: string[], cwd: string) {
  // Get absolute path to cli.js relative to this file
  const cliPath = path.resolve(path.join(__dirname, '../../dist/cli.js'));
  const cmd = `node "${cliPath}" ${args}`;
  try {
    const stdout = execSync(cmd, { cwd: cwd, encoding: 'utf-8' });
    return { stdout, error: null, status: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout,
      stderr: e.stderr,
      error: e,
      status: e.status,
    };
  }
}
