#!/usr/bin/env node
import { Command } from 'commander';
import { registerAllCommands } from './commands';
import { LockTimeoutError } from './utils/lock';

// Read the version from package.json at runtime rather than hardcoding it
// a second time here, where it would inevitably drift out of sync.
const pkg = require('../package.json');

const program = new Command();

program
  .name('workforest')
  .description('Manage reusable git worktrees for parallel coding sessions')
  .version(pkg.version);

registerAllCommands(program);

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof LockTimeoutError) {
    console.error(`Error: ${err.message}`);
    process.exit(3);
  }
  console.error(err);
  process.exit(1);
});
