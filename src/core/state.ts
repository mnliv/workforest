import * as fs from 'fs';
import * as path from 'path';
import { getGitCommonDir } from '../utils/git';
import { withLock } from '../utils/lock';
import { WorkforestState } from '../types';

const STATE_FILE_NAME = 'state.json';

export async function getStatePath(): Promise<string> {
  const commonDir = getGitCommonDir();
  const workforestDir = path.join(commonDir, 'workforest');
  if (!fs.existsSync(workforestDir)) {
    fs.mkdirSync(workforestDir, { recursive: true });
  }
  return path.join(workforestDir, STATE_FILE_NAME);
}

export async function readState(): Promise<WorkforestState> {
  const statePath = await getStatePath();
  if (!fs.existsSync(statePath)) {
    return { version: 1, worktrees: [] };
  }
  const content = fs.readFileSync(statePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    return { version: 1, worktrees: [] };
  }
}

async function writeStateInternal(state: WorkforestState, statePath: string): Promise<void> {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export async function runTransaction(action: (state: WorkforestState) => Promise<void>): Promise<void> {
  const statePath = await getStatePath();
  const lockPath = statePath + '.lock';
  
  await withLock(lockPath, async () => {
    const state = await readState();
    await action(state);
    await writeStateInternal(state, statePath);
  });
}
