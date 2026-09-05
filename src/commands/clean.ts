import { Command } from 'commander';
import { runTransaction, readState } from '../core/state';
import { runGit, getMainWorktreePath } from '../utils/git';
import * as path from 'path';
import * as fs from 'fs';
import { parseDuration } from '../utils/duration';

export async function cleanCommand(program: Command) {
  program
    .command('clean')
    .description('Clean up worktrees')
    .option('--all', 'All worktrees (requires --force)')
    .option('--older-than <duration>', 'Worktrees older than duration (e.g. 2h, 30m)')
    .option('--dry-run', 'Don\'t actually remove them')
    .option('--force', 'Required for --all')
    .action(async (options) => {
      if (options.all && !options.force) {
        console.error('Error: --all requires --force to prevent accidental deletion of in-use worktrees.');
        process.exit(2);
      }

      let thresholdMs = 0;
      if (options.olderThan) {
        thresholdMs = parseDuration(options.olderThan);
      }

      let toRemove: { path: string; id: string }[] = [];
      const removedIds = new Set<string>();
      const mainWorktreePath = getMainWorktreePath();

      await runTransaction(async (state) => {
        const now = Date.now();
        for (const w of state.worktrees) {
          // Never remove the main (primary) checkout, no matter its tracked
          // status or --all/--force, in case it was ever imported by mistake.
          if (w.path === mainWorktreePath) continue;

          let shouldRemove = false;

          if (options.all) {
            shouldRemove = true;
          } else if (w.status === 'idle') {
            shouldRemove = true;
          }

          if (shouldRemove && thresholdMs > 0) {
            const lastUsed = new Date(w.lastUsedAt).getTime();
            if (now - lastUsed < thresholdMs) {
              shouldRemove = false;
            }
          }

          if (shouldRemove) {
            toRemove.push({ path: w.path, id: w.id });
          }
        }

        // Actually perform removal if not dry-run
        if (!options.dryRun) {
          for (const item of toRemove) {
            try {
              runGit(['worktree', 'remove', '--force', item.path]);
              runGit(['worktree', 'prune']);
              removedIds.add(item.id);
            } catch (e: any) {
              console.error(`Failed to remove worktree ${item.path}: ${e.stderr || e.message}`);
            }
          }

          // Only drop entries from state that were actually removed on disk,
          // so a failed `git worktree remove` doesn't silently lose tracking.
          state.worktrees = state.worktrees.filter(w => !removedIds.has(w.id));
        }
      });

      if (options.dryRun) {
        console.log('Dry run: would remove the following worktrees:');
        toRemove.forEach(r => console.log(` - ${r.path}`));
      } else {
        console.log(`Cleaned up ${removedIds.size} worktrees.`);
      }
    });
}
