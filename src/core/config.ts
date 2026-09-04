import * as fs from 'fs';
import * as path from 'path';
import { getRepoRoot } from '../utils/git';
import { WorkforestConfig } from '../types';

const CONFIG_FILE_NAME = 'workforest.config.json';

export function getDefaultConfig(repoRoot: string): WorkforestConfig {
  const repoName = path.basename(repoRoot);
  return {
    baseDir: path.join(repoRoot, '..', `${repoName}-worktrees`),
    defaultBaseBranch: 'main',
    idleTTL: '24h',
  };
}

export function loadConfig(): WorkforestConfig {
  try {
    // We need to find the repo root to resolve baseDir correctly.
    // But we can also try to find workforest.config.json in CWD or parents.
    // The prompt says "at the main repo root".
    const repoRoot = getRepoRoot();
    const configPath = path.join(repoRoot, CONFIG_FILE_NAME);
    const defaults = getDefaultConfig(repoRoot);

    if (!fs.existsSync(configPath)) {
      return defaults;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content);

    return {
      baseDir: userConfig.baseDir ? path.resolve(repoRoot, userConfig.baseDir) : defaults.baseDir,
      defaultBaseBranch: userConfig.defaultBaseBranch || defaults.defaultBaseBranch,
      idleTTL: userConfig.idleTTL || defaults.idleTTL,
    };
  } catch (e) {
    return getDefaultConfig(getRepoRoot());
  }
}
