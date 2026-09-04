import { Command } from 'commander';
import { readState } from '../core/state';
import { isPidAlive } from '../utils/git';
import * as path from 'path';

export async function statusCommand(program: Command) {
  program
    .command('status <target>')
    .description('Show status of a worktree')
    .option('--json', 'Output as JSON')
    .action(async (target, options) => {
      const state = await readState();
      const worktree = state.worktrees.find(w => 
        w.id === target || path.resolve(w.path) === path.resolve(target)
      );

      if (!worktree) {
        console.error(`Worktree not found: ${target}`);
        process.exit(1);
      }

      const stale = worktree.status === 'in-use' && worktree.pid !== null && !isPidAlive(worktree.pid);

      if (options.json) {
        const output = { ...worktree, stale };
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log('Worktree Status:');
        console.log(`  ID: ${worktree.id}`);
        console.log(`  Path: ${worktree.path}`);
        console.log(`  Branch: ${worktree.branch}`);
        console.log(`  Base Branch: ${worktree.baseBranch}`);
        console.log(`  Status: ${worktree.status}${stale ? ' (STALE)' : ''}`);
        console.log(`  Owner: ${worktree.owner || 'None'}`);
        console.log(`  PID: ${worktree.pid || 'N/A'}`);
        console.log(`  Created At: ${worktree.createdAt}`);
        console.log(`  Last Used: ${worktree.lastUsedAt}`);
        console.log(`  Task: ${worktree.task || 'None'}`);
      }
    });
}
