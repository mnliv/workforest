#!/usr/bin/env node
import { Command } from 'commander';
import { registerAllCommands } from './commands';

const program = new Command();

program
  .name('workforest')
  .description('Manage reusable git worktrees for parallel coding sessions')
  .version('1.0.0');

registerAllCommands(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
