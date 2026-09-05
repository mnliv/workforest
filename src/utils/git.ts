import { spawnSync } from 'child_process';
import * as path from 'path';

export function runGit(args: string[], options: any = {}): { stdout?: string; stderr?: string; status?: number } {
  const result = spawnSync('git', args, {
    shell: false,
    encoding: 'utf-8',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const error = new Error(`Git command failed: git ${args.join(' ')}`);
    (error as any).status = result.status;
    (error as any).stderr = result.stderr;
    throw error;
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

export function getGitCommonDir(): string {
  return runGit(['rev-parse', '--git-common-dir']).stdout!.trim();
}

export function getRepoRoot(): string {
  return runGit(['rev-parse', '--show-toplevel']).stdout!.trim();
}

/**
 * Path of the main (primary) worktree, i.e. the checkout that owns the
 * `.git` common dir, as opposed to a linked worktree created by
 * `git worktree add`. `git worktree list` always lists this one first,
 * and its `.git` is a real directory (not a gitdir-pointer file), so its
 * path is the parent of the git common dir.
 *
 * workforest must never track or act on this path as a managed worktree.
 */
export function getMainWorktreePath(): string {
  return path.resolve(path.dirname(getGitCommonDir()));
}
