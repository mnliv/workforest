# Contributing

Thanks for considering a contribution to `workforest`.

## How to propose a change

1. Fork the repo (or, if you've been added as a collaborator, branch directly).
2. Make your change on a branch, not `main`.
3. Open a pull request against `main`.

`main` is protected: every change lands through a reviewed pull request, and
only the maintainer ([@mnliv](https://github.com/mnliv)) can approve and
merge one — see [CODEOWNERS](.github/CODEOWNERS). You're welcome to open a
PR from anywhere; you don't need write access to this repo to do that.

## Working on the code

```bash
npm install
npm run build   # compiles src/ -> dist/
npm test        # runs the vitest suite
```

A few things that'll make review faster:

- Add or update a test in `src/tests/` for any behavior change — the suite
  is the actual spec of how commands are expected to behave, and several
  past bugs here were only caught because a test pinned the exact scenario.
- Match the existing code's style rather than introducing a new one (plain
  `Command` handlers per file, `runGit`/`runTransaction` for state and git
  access, exit code 2 for usage errors, exit code 3 reserved for lock
  timeouts).
- If you're changing command behavior, update
  [`skill/workforest/SKILL.md`](skill/workforest/SKILL.md) in the same PR if
  it describes that behavior — it's the CLI's own agent-facing docs, bundled
  into the published package and installed via `workforest skill install`.
  A behavior change without a matching doc update is worse than no change
  at all, since it leaves an agent following stale guidance. `SKILL.md`
  matters more than most docs here because an agent acts on it directly —
  verify any claim you add against the real, installed CLI, not against
  memory of how a command used to behave; several past corrections here
  existed only because someone actually tested a claim and found it no
  longer held. Anything only needed occasionally (a one-time setup step, a
  detailed troubleshooting path) belongs under `skill/workforest/references/`
  instead, not in `SKILL.md` itself, since `SKILL.md` loads into context on
  every single invocation of the skill.
- Never make `clean`, `release`, or `prune` more permissive by default
  without a very good reason — several past bugs in this project were
  exactly that kind of destructive-by-default behavior (see the commit
  history around `--force` requirements).

## Reporting a bug

Open an issue with the command you ran, what you expected, and what
actually happened. Exact reproduction steps (ideally against a throwaway
git repo) are the single most useful thing you can include.
