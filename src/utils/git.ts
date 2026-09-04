import { spawnSync } from 'child_process';

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

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code === 'EPERM';
  }
}
