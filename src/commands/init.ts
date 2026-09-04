import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { getRepoRoot } from '../utils/git';
import { getDefaultConfig } from '../core/config';

export async function initCommand(program: Command) {
  program
    .command('init')
    .description('Initialize workforest configuration')
    .option('--base-dir <dir>', 'Set the base directory for worktrees')
    .option('--default-base <branch>', 'Set the default base branch')
    .option('--force', 'Overwrite existing config')
    .action(async (options) => {
      const repoRoot = getRepoRoot();
      const configPath = path.join(repoRoot, 'workforest.config.json');

      if (fs.existsSync(configPath) && !options.force) {
        console.error('Error: Configuration file already exists. Use --force to overwrite.');
        process.exit(2);
      }

      const defaults = getDefaultConfig(repoRoot);
      const config = {
        baseDir: options.baseDir ? path.resolve(repoRoot, options.baseDir) : defaults.baseDir,
        defaultBaseBranch: options.defaultBase || defaults.defaultBaseBranch,
        idleTTL: defaults.idleTTL,
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Initialized configuration at ${configPath}`);
    });
}
