import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Same pattern as cli.ts: read the CLI's own version at runtime rather than
// hardcoding it a second time.
const pkg = require('../../package.json');

const VERSION_STAMP_FILE = '.workforest-cli-version';

// Coding-agent providers this command knows how to install the skill for.
// Each provider owns its own default install path convention. Only Claude
// Code is supported today; the map exists so adding another provider later
// (e.g. Cursor) is a new entry here, not a rewrite of this command.
const PROVIDER_DEFAULT_TARGETS: Record<string, () => string> = {
  claude: () => path.join(os.homedir(), '.claude', 'skills', 'workforest'),
};

/**
 * The skill content bundled inside this npm package, edited directly at
 * skill/workforest/ in this repo (not a separate one) so it's always
 * version-consistent with the CLI it ships with. Resolved relative to the
 * compiled dist/ location.
 */
function getBundledSkillDir(): string {
  return path.resolve(__dirname, '../../skill/workforest');
}

export async function skillCommand(program: Command) {
  const skill = program
    .command('skill')
    .description('Manage the workforest agent skill installation');

  skill
    .command('install')
    .description('Install or resync the bundled workforest skill for a coding agent (default target: ~/.claude/skills/workforest)')
    .option('--provider <name>', `Coding agent to install for (supported: ${Object.keys(PROVIDER_DEFAULT_TARGETS).join(', ')})`, 'claude')
    .option('--target <dir>', "Install location (overrides the provider's default)")
    .option('--force', 'Reinstall even if the target is already up to date')
    .action((options) => {
      const provider = options.provider as string;
      const providerDefault = PROVIDER_DEFAULT_TARGETS[provider];
      if (!providerDefault) {
        console.error(`Error: unsupported provider '${provider}'. Supported providers: ${Object.keys(PROVIDER_DEFAULT_TARGETS).join(', ')}.`);
        process.exit(2);
      }

      const bundledDir = getBundledSkillDir();
      if (!fs.existsSync(bundledDir)) {
        console.error(`Error: no bundled skill content found at ${bundledDir}. This workforest install may be corrupted or was built incorrectly.`);
        process.exit(1);
      }

      const target = options.target ? path.resolve(options.target) : providerDefault();
      const stampPath = path.join(target, VERSION_STAMP_FILE);

      if (!options.force && fs.existsSync(stampPath)) {
        const installedVersion = fs.readFileSync(stampPath, 'utf-8').trim();
        if (installedVersion === pkg.version) {
          console.log(`Skill already up to date (v${pkg.version}) at ${target}.`);
          return;
        }
      }

      // If the target is a symlink (e.g. someone manually pointed it at a
      // clone of this repo, or a development checkout, instead of using
      // this command), remove only the symlink itself — never recurse into
      // whatever it points to, so we don't accidentally wipe their content.
      try {
        const lst = fs.lstatSync(target);
        if (lst.isSymbolicLink()) {
          fs.unlinkSync(target);
        } else {
          fs.rmSync(target, { recursive: true, force: true });
        }
      } catch (e: any) {
        if (e.code !== 'ENOENT') throw e;
      }

      fs.mkdirSync(target, { recursive: true });
      fs.cpSync(bundledDir, target, { recursive: true });
      fs.writeFileSync(stampPath, `${pkg.version}\n`);

      console.log(`Installed workforest skill (v${pkg.version}) for ${provider} to ${target}.`);
    });
}
