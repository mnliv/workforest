import { Command } from 'commander';
import { readState } from '../core/state';
import { WorktreeState } from '../types';

export async function listCommand(program: Command) {
  program
    .command('list')
    .description('List all worktrees')
    .option('--json', 'Output as JSON')
    .option('--status <status>', 'Filter by status (idle|in-use)')
    .action(async (options) => {
      const state = await readState();
      let worktrees = state.worktrees;

      if (options.status) {
        worktrees = worktrees.filter(w => w.status === options.status);
      }

      if (options.json) {
        console.log(JSON.stringify(worktrees, null, 2));
      } else {
        if (worktrees.length === 0) {
          console.log('No worktrees found.');
          return;
        }

        console.log('%-40s %-15s %-10s %-15s %-20s', 'PATH', 'BRANCH', 'STATUS', 'OWNER', 'LAST USED');
        console.log('-'.repeat(100));
        for (const w of worktrees) {
          console.log('%-40s %-15s %-10s %-15s %-20s', 
            w.path.substring(0, 38) + (w.path.length > 38 ? '...' : ''),
            w.branch,
            w.status,
            w.owner || '-',
            w.lastUsedAt
          );
        }
      }
    });
}
