import { Command } from 'commander';
import { initCommand } from './init';
import { acquireCommand } from './acquire';
import { releaseCommand } from './release';
import { listCommand } from './list';
import { statusCommand } from './status';
import { cleanCommand } from './clean';
import { pruneCommand } from './prune';

export function registerAllCommands(program: Command) {
  initCommand(program);
  acquireCommand(program);
  releaseCommand(program);
  listCommand(program);
  statusCommand(program);
  cleanCommand(program);
  pruneCommand(program);
}
