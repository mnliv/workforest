import { Command } from 'commander';
import { runTransaction, readState } from '../core/state';
import { runGit } from '../utils/git';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../core/config';

export async function pruneCommand(program: Command) {
  program
    .command('prune')
    .description('Reconcile state with actual git worktrees')
    .action(async () => {
    const config = loadConfig();
    await runTransaction(async (state) => {
        // 1. Get actual git worktrees via porcelain
        const result = runGit(['worktree', 'list', '--porcelain']);
        const lines = result.stdout!.split('\n');
        
        const actualWorktreePaths = new Set<string>();
        let currentPath: string | null = null;

        for (const line of lines) {
          if (line.startsWith('worktree ')) {
            currentPath = path.resolve(line.substring(9));
            if (currentPath) actualWorktreePaths.add(currentPath);
          }
        }

        // 2. Remove state entries for worktrees that don't exist
        state.worktrees = state.worktrees.filter(w => actualWorktreePaths.has(w.path));

        // 3. Add missing worktrees from git as idle
        // Note: We don't know their branch from porcelain easily without more parsing
        // but we can try to get it.
        for (const worktreePath of actualWorktreePaths) {
          const isAlreadyInState = state.worktrees.some(w => w.path === worktreePath);
          if (!isAlreadyInState) {
            // Try to get branch from git
            let branch = 'unknown';
            try {
              // git -C <path> rev-parse --abbrev-ref HEAD
              const branchRes = runGit(['-C', worktreePath, 'rev-parse', '--abbrev-ref', 'HEAD']);
              branch = branchRes.stdout!.trim();
            } catch (e) {
              // fallback
            }
            
            state.worktrees.push({
              id: `import-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              path: worktreePath,
              branch: branch,
              baseBranch: branch !== 'unknown' ? branch : config.defaultBaseBranch,
              status: 'idle',
              owner: null,
              pid: null,
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
              task: null
            });
          }
        }

        // 4. Prune git worktree internal metadata
        runGit(['worktree', 'prune']);
      });

      console.log('Pruning complete.');
    });
}
