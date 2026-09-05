import { Command } from 'commander';
import { readState } from '../core/state';

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

        const colWidths = {
          path: 40,
          branch: 15,
          status: 10,
          owner: 15,
          lastUsed: 25
        };

        const header = [
          'PATH'.padEnd(colWidths.path),
          'BRANCH'.padEnd(colWidths.branch),
          'STATUS'.padEnd(colWidths.status),
          'OWNER'.padEnd(colWidths.owner),
          'LAST USED'.padEnd(colWidths.lastUsed)
        ].join(' ');
        console.log(header);
        console.log('-'.repeat(header.length));

        for (const w of worktrees) {
          const pathCol = w.path.length > colWidths.path - 3
            ? w.path.substring(0, colWidths.path - 3) + '...'
            : w.path;

          const row = [
            pathCol.padEnd(colWidths.path),
            w.branch.padEnd(colWidths.branch),
            w.status.padEnd(colWidths.status),
            (w.owner || '-').padEnd(colWidths.owner),
            w.lastUsedAt.padEnd(colWidths.lastUsed)
          ].join(' ');
          console.log(row);
        }
      }
    });
}
