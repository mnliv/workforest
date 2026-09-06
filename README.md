# Workforest

`workforest` (or `wf`) is a CLI tool designed to manage reusable git worktrees for parallel coding sessions. It helps prevent multiple coding-agent sessions from colliding by managing worktrees and tracking which ones are idle or in-use.

## Installation

```bash
npm install -g @mnliv/workforest
```

This installs both the `workforest` and `wf` binaries.

## Using with a Coding Agent

For an agent (e.g. Claude Code) to manage worktrees with `workforest` on
your behalf — acquiring, releasing, and cleaning them up as it works,
without you running any of the commands below by hand — install the
bundled skill:

```bash
workforest skill install --provider claude
```

`--provider claude` is currently the default and only supported provider;
pass it explicitly so this keeps working unchanged if others are added
later. This installs to `~/.claude/skills/workforest` by default (pass
`--target <dir>` for a project-scoped install instead); see
[workforest-skill](https://github.com/mnliv/workforest-skill) for what the
skill actually does and its content's source of truth.

Because the skill content ships bundled inside this package, updating the
CLI (`npm update -g @mnliv/workforest`) is what makes newer skill content
available — re-running `skill install` (a no-op if already current) syncs
your local copy to it. The skill's own setup step does this automatically
every time it's used, so you shouldn't need to think about this after the
first install.

## Lifecycle

The typical lifecycle of a worktree is:
1. **Acquire**: Use `workforest acquire` to get a worktree. It will either reuse an idle one or create a new one.
2. **Work**: Use the worktree for your task.
3. **Release**: Use `workforest release` to mark it as idle and make it available for others. Optionally use `--reset` to leave it in a clean state.

## Commands

### `init`
Initializes the `workforest.config.json` in the main repository root.
```bash
workforest init
workforest init --base-dir ../my-worktrees --default-base main
workforest init --force
```

### `acquire`
Acquire a worktree. It tries to reuse an idle worktree (preferring the one on the requested branch, otherwise the least recently used). If no idle worktree is available, it creates a new one.
```bash
# Acquire an idle worktree for a task
workforest acquire --task my-task

# Acquire a worktree on a specific branch
workforest acquire --branch feature/new-feature

# Acquire and output the acquired worktree's record as JSON
workforest acquire --json
```

`--base` only takes effect when a new branch is being created or an idle
worktree is being switched onto a *different* branch than it's currently on.
Reacquiring a worktree that's already on the requested branch never resets
it, even if `--base` is also passed — this avoids silently discarding
commits made on it since it was branched.

### `release`
Marks a worktree as idle, making it available for reuse.
```bash
# Release by path or ID
workforest release <path_or_id>

# Reset the worktree to a pristine state (removes uncommitted changes and untracked files)
workforest release <path_or_id> --reset

# Release only if you are the owner
workforest release <path_or_id> --owner my-id
```

### `list`
Lists all managed worktrees.
```bash
workforest list
workforest list --json
workforest list --status idle
workforest list --status in-use
```

### `status`
Shows detailed information for a specific worktree.
```bash
workforest status <path_or_id>
workforest status <path_or_id> --json
```

### `clean`
Removes worktrees. `--force` is required to actually remove anything (bare
`workforest clean` refuses and does nothing); `--dry-run` previews without
needing `--force`. A worktree with real uncommitted or untracked changes is
left alone even with `--force` — git itself refuses the removal rather than
silently discarding that work. After a worktree is removed, its branch is
also deleted, but only if it's fully merged into its own base branch;
otherwise the branch (and whatever commits are only reachable from it) is
left alone — and reported: the output names any surviving branch, since
"Cleaned up N worktrees" alone wouldn't tell you one didn't fully go away.
```bash
# Preview what would be removed
workforest clean --dry-run

# Remove all idle worktrees
workforest clean --force

# Remove idle worktrees older than 2 hours
workforest clean --older-than 2h --force

# Remove all worktrees (including in-use ones, still REQUIRES --force)
workforest clean --all --force
```

### `prune`
Reconciles the state with the actual git worktrees on disk. Removes entries from state for worktrees that no longer exist.
```bash
workforest prune
```

### `skill install`
Installs (or resyncs) the agent skill bundled inside this package, so a
coding agent can drive `workforest` itself. See
[Using with a Coding Agent](#using-with-a-coding-agent) above.
```bash
workforest skill install --provider claude
workforest skill install --provider claude --target ./.claude/skills/workforest
workforest skill install --provider claude --force
```
`--provider` currently only accepts `claude` (the default); any other value
is a usage error. Safe to run repeatedly — it's a no-op once the installed
copy already matches the running CLI's version.

## Configuration

A `workforest.config.json` file in the main repository root:

```json
{
  "baseDir": "../my-worktrees",
  "defaultBaseBranch": "main",
  "idleTTL": "24h"
}
```

- `baseDir`: The directory where worktrees are created. Defaults to `../<repo-name>-worktrees` relative to the repo root.
- `defaultBaseBranch`: The branch to use when creating new worktrees. Defaults to `main`.
- `idleTTL`: The duration after which an idle worktree is considered old (not used for `clean --older-than`). Defaults to `24h`.

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General/Runtime Error |
| 2 | Usage Error (bad args/missing required) |
| 3 | Lock Acquisition Timeout (another workforest process is holding the state lock) |

## Windows Caveats
- The tool uses Node.js's `fs.mkdirSync` for atomic locking, which works on Windows.
- Git commands are executed using `spawnSync` for cross-platform compatibility.
- Worktree paths should be handled carefully if they contain special characters.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). `main` is protected — changes land
through a reviewed pull request, and only the maintainer can merge one.

## License

MIT © Minh Nhan
