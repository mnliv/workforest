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
    .option('--all', 'All worktrees, including in-use ones (requires --force)')
    .option('--older-than <duration>', 'Worktrees older than duration (e.g. 2h, 30m)')
    .option('--dry-run', 'Don\'t actually remove them; just show what would be removed')
    .option('--force', 'Required to actually remove anything (not needed with --dry-run)')
    .action(async (options) => {
      if (!options.dryRun && !options.force) {
        console.error('Error: --force is required to remove worktrees. Use --dry-run to preview without it.');
        process.exit(2);
      }

      let thresholdMs = 0;
      if (options.olderThan) {
        try {
          thresholdMs = parseDuration(options.olderThan);
        } catch (e: any) {
          console.error(`Error: ${e.message}`);
          process.exit(2);
        }
      }

      let toRemove: { path: string; id: string; branch: string; baseBranch: string }[] = [];
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
            toRemove.push({ path: w.path, id: w.id, branch: w.branch, baseBranch: w.baseBranch });
          }
        }

        // Actually perform removal if not dry-run
        if (!options.dryRun) {
          for (const item of toRemove) {
            try {
              // Deliberately not passing --force to git here: a worktree with
              // real uncommitted changes should make git refuse and leave it
              // alone, not get silently wiped just because it was idle.
              runGit(['worktree', 'remove', item.path]);
              runGit(['worktree', 'prune']);
              removedIds.add(item.id);

              // Best-effort: delete the branch too, but only when it's
              // fully merged into its own baseBranch (an ancestor of it) —
              // never force-delete a branch that might hold commits not
              // reachable anywhere else. Silently leave it otherwise.
              if (item.branch && item.branch !== item.baseBranch) {
                try {
                  runGit(['merge-base', '--is-ancestor', item.branch, item.baseBranch]);
                  runGit(['branch', '-d', item.branch]);
                } catch (e: any) {
                  // Not merged, doesn't exist, or in use elsewhere — leave it.
                }
              }
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
