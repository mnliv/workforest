# Installing workforest

Only needed the first time `command -v workforest || command -v wf` finds
neither on `PATH` in this environment. Do this yourself — don't ask the end
user to install it manually.

```bash
npm install -g @mnliv/workforest
```

Requires Node.js >= 18.

If it fails with an `EACCES`/permission error, npm's global prefix isn't
user-writable. Retry rather than giving up:
- macOS/Linux: `sudo npm install -g @mnliv/workforest`
- Windows: re-run the terminal as Administrator, then retry the same command.

Verify it worked before proceeding to the actual task:

```bash
workforest --version
```

Only fall back to manual `git worktree add`/`remove` commands if installing
genuinely isn't possible in this environment (e.g. no npm/network access at
all) — not just because the first attempt hit a fixable error like the one
above.

Once installed, it stays installed — no need to repeat any of this on future
invocations in the same environment; the `command -v` check alone is enough.
