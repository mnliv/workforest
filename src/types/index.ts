export type WorktreeStatus = 'idle' | 'in-use';

export interface WorktreeState {
  id: string;
  path: string;
  branch: string;
  baseBranch: string;
  status: WorktreeStatus;
  owner: string | null;
  pid: number | null;
  createdAt: string;
  lastUsedAt: string;
  task: string | null;
}

export interface WorkforestState {
  version: number;
  worktrees: WorktreeState[];
}

export interface WorkforestConfig {
  baseDir: string;
  defaultBaseBranch: string;
  idleTTL: string;
}

export interface CommandOutput {
  path?: string;
  state?: WorkforestState;
  error?: string;
}
