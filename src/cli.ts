#!/usr/bin/env node
import { Command } from 'commander';
import { registerAllCommands } from './commands';
import { LockTimeoutError } from './utils/lock';

const program = new Command();

program
  .name('workforest')
  .description('Manage reusable git worktrees for parallel coding sessions')
  .version('1.0.0');

registerAllCommands(program);

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof LockTimeoutError) {
    console.error(`Error: ${err.message}`);
    process.exit(3);
  }
  console.error(err);
  process.exit(1);
});
