import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { runTransaction } from '../core/state';
import { runGit } from '../utils/git';

export async function releaseCommand(program: Command) {
  program
    .command('release <target>')
    .description('Release a worktree (mark as idle)')
    .option('--reset', 'Reset the worktree to a pristine state')
    .option('--owner <id>', 'Release only if owner matches')
    .action(async (target, options) => {
      let found = false;
      let errorMsg = '';

      await runTransaction(async (state) => {
        const worktree = state.worktrees.find(w => 
          w.id === target || path.resolve(w.path) === path.resolve(target)
        );

        if (!worktree) {
          errorMsg = `Worktree not found: ${target}`;
          return;
        }

        found = true;

        if (options.owner && worktree.owner !== options.owner) {
          errorMsg = `Owner mismatch: worktree is owned by ${worktree.owner}, not ${options.owner}`;
          return;
        }

        // Reset if requested
        if (options.reset) {
          try {
            runGit(['-C', worktree.path, 'reset', '--hard', worktree.baseBranch]);
            runGit(['-C', worktree.path, 'clean', '-fdx']);
          } catch (e: any) {
            errorMsg = `Failed to reset worktree: ${e.stderr || e.message}`;
            return;
          }
        }

        worktree.status = 'idle';
        worktree.owner = null;
        worktree.pid = null;
        worktree.lastUsedAt = new Date().toISOString();
      });

      if (errorMsg) {
        console.error(`Error: ${errorMsg}`);
        process.exit(1);
      }

      if (!found) {
        // This should not be reachable because errorMsg would have been set
        console.error(`Error: Worktree not found: ${target}`);
        process.exit(1);
      }

      console.log(`Worktree ${target} released.`);
    });
}
