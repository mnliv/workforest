---
name: workforest
description: Use when starting parallel/isolated coding-agent work in git worktrees, or when asked to create, reuse, list, release, or clean up worktrees. Also use this to install the `workforest`/`wf` CLI itself if it isn't on PATH yet — the end user should never need to install it manually.
---

# Workforest (wf)

`workforest` (alias `wf`) is a CLI tool designed for managing git worktrees during parallel/isolated coding-agent sessions. It prevents multiple agents from colliding on the same worktree by tracking idle vs. in-use states and enables safe reuse and cleanup of worktree environments.

## Setup (check first, every time this skill is used)

```bash
command -v workforest || command -v wf
```

If neither is found, read `references/install.md` and install it yourself —
do not ask the end user to.

Then always run:

```bash
workforest skill install --provider claude
```

(`--provider claude` is already the default — Claude Code is the only
supported provider right now — but pass it explicitly so this keeps working
unchanged if other providers are added later.)

This resyncs this locally-installed copy of the skill against whatever
`workforest` version is actually installed — it's a no-op if already
current, so it's safe (and required) to run every time. This is what keeps
the skill from silently going stale after `npm update -g @mnliv/workforest`:
the skill content ships bundled inside the CLI package itself, so updating
the CLI is what makes newer skill content available, and `skill install` is
what actually syncs your local copy to it. You never need to manually
`git pull` or re-clone anything for this.

Once both checks pass, skip straight to the commands below.

## Command Reference

| Command | Description |
| :--- | :--- |
| `workforest init [--base-dir <dir>] [--default-base <branch>] [--force]` | One-time setup per-repo; writes `workforest.config.json`. |
| `workforest acquire [--task <slug>] [--branch <name>] [--base <branch>] [--owner <id>] [--json]` | Reuses an idle worktree (preferring the requested branch, else LRU) or creates a new one. Prints the absolute path to stdout. |
| `workforest release <path-or-id> [--reset] [--owner <id>]` | Marks worktree as idle. `--reset` cleans untracked files; `--owner` guards release. |
| `workforest list [--json] [--status idle\|in-use]` | Lists managed worktrees. |
| `workforest status <path-or-id> [--json]` | Shows full detail for a specific worktree. |
| `workforest clean [--older-than <duration>] [--all] [--force] [--dry-run]` | Removes idle worktrees (`--all` also includes in-use ones). `--force` is required to remove *anything*, idle-only or `--all` alike; `--dry-run` previews without it. |
| `workforest prune` | Reconciles tracked state with `git worktree list`. |

**Exit Codes:**
- `0`: Success
- `1`: General/runtime error
- `2`: Usage error
- `3`: Lock-acquisition timeout (another workforest process is holding the state lock — retry after a short delay)

## Agent Lifecycle Example

1. **Acquire**: `path=$(workforest acquire --task my-feature --owner <session_id>)`
2. **Work**: `cd $path && <do work>`
3. **Release**: `workforest release $path --owner <session_id> --reset`

## Guidance Notes

- **Ownership**: Always pass a stable `--owner` ID (e.g., your session ID) to ensure you only release worktrees you currently hold.
- **Task Slugs**: Use short kebab-case slugs for the `--task` flag.
- **Reacquiring the same branch**: `--base` only takes effect when a new branch is being created, or an idle worktree is being switched onto a *different* branch than it's currently on. Reacquiring a worktree already on the requested branch never resets it, even with `--base` passed — so it's always safe to pass `--base` defensively without risk of discarding prior commits.
- **Fallback**: Only fall back to manual `git worktree add`/`remove` if installing the CLI (see Setup above) genuinely isn't possible in this environment (e.g. no npm/network access at all) — not just because the first install attempt hit a fixable error.
- **Safety**: Never execute `workforest clean --force` (with or without `--all`) without explicit instruction. Plain `clean --force` already destroys *every* idle worktree in one shot, no age filter needed — `--all` isn't what makes it dangerous, it only widens the blast radius to in-use worktrees from other sessions too. When you do need to clean up, run `clean --dry-run` first and confirm the list looks right.
- **Partial cleanup**: `clean` won't force-delete a branch with commits that aren't merged into its base — the worktree still goes, and the summary line names any branch that survived, so check the output (or `git branch`) rather than assuming a clean run means the branch is gone too.
- **Staleness**: There's no automatic "abandoned" indicator — `list`/`status` won't ever flag a worktree as stale. Judge from `owner`/`task`/`lastUsedAt` yourself before treating one as available; when in doubt, ask rather than assume it's free to reuse or clean.
- **Locking**: Exit code `3` indicates a lock is held by another process; retry after a short delay.
