import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { runGit, getRepoRoot } from '../utils/git';
import { runTransaction, readState } from '../core/state';
import { loadConfig } from '../core/config';
import { WorktreeState, WorkforestState } from '../types';

export async function acquireCommand(program: Command) {
  program
    .command('acquire')
    .description('Acquire a worktree (reuse or create)')
    .option('--task <slug>', 'Task name/slug')
    .option('--branch <name>', 'Desired branch name')
    .option('--base <branch>', 'Base branch to checkout from')
    .option('--owner <id>', 'Owner ID')
    .option('--json', 'Output full state record as JSON')
    .action(async (options) => {
      const config = loadConfig();
      const owner = options.owner || process.env.WORKFOREST_OWNER || uuidv4().substring(0, 8);
      const task = options.task || null;
      const targetBranch = options.branch;
      const baseBranch = options.base || config.defaultBaseBranch;

      let worktreeId: string | null = null;
      let worktreePath: string | null = null;
      let isNew = false;

      await runTransaction(async (state) => {
        let selectedWorktree: WorktreeState | null = null;

        // 1. Try to find an idle worktree that matches the requested branch
        if (targetBranch) {
          const matching = state.worktrees.find(w => w.status === 'idle' && w.branch === targetBranch);
          if (matching) {
            selectedWorktree = matching;
          }
        }

        // 2. If not found, find the LRU idle worktree
        if (!selectedWorktree) {
          const idleWorktrees = state.worktrees
            .filter(w => w.status === 'idle')
            .sort((a, b) => new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime());
          
          if (idleWorktrees.length > 0) {
            selectedWorktree = idleWorktrees[0];
          }
        }

        if (selectedWorktree) {
          // REUSE
          selectedWorktree.status = 'in-use';
          selectedWorktree.owner = owner;
          selectedWorktree.pid = process.pid;
          selectedWorktree.lastUsedAt = new Date().toISOString();
          selectedWorktree.task = task;

          if (targetBranch || options.base) {
            const branchToUse = targetBranch || selectedWorktree.branch;
            try {
              runGit(['-C', selectedWorktree.path, 'checkout', '-B', branchToUse, baseBranch]);
              selectedWorktree.branch = branchToUse;
            } catch (e: any) {
              throw new Error(`Failed to checkout branch in worktree: ${e.stderr || e.message}`);
            }
          }
        } else {
          // CREATE NEW
          isNew = true;
          const id = uuidv4();
          const slug = (options.task || id).replace(/[^a-zA-Z0-9_-]/g, '-');
          const wp = path.join(config.baseDir, slug);
          
          if (!fs.existsSync(config.baseDir)) {
            fs.mkdirSync(config.baseDir, { recursive: true });
          }

          try {
            runGit(['worktree', 'add', wp, '-b', targetBranch || slug, baseBranch]);
          } catch (e: any) {
             throw new Error(`Failed to create worktree: ${e.stderr || e.message}`);
          }

          const newWorktree: WorktreeState = {
            id,
            path: path.resolve(wp),
            branch: targetBranch || slug,
            baseBranch: baseBranch,
            status: 'in-use',
            owner,
            pid: process.pid,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            task,
          };
          state.worktrees.push(newWorktree);
          selectedWorktree = newWorktree;
        }

        if (selectedWorktree) {
          worktreeId = selectedWorktree.id;
          worktreePath = selectedWorktree.path;
        }
      });

      if (options.json) {
        const fullState = await readState();
        console.log(JSON.stringify(fullState, null, 2));
      } else if (worktreePath) {
        console.log(worktreePath);
      } else {
        console.error('Failed to acquire worktree');
        process.exit(1);
      }
    });
}
