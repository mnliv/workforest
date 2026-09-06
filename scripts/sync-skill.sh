#!/usr/bin/env bash
# Vendors the current workforest-skill content into skill/workforest/ in
# this repo, so it ships bundled inside the @mnliv/workforest npm package
# (see src/commands/skill.ts). Run this manually before a release whenever
# workforest-skill's content has changed, review the diff, and commit it
# as part of (or just before) the version bump.
#
# By default pulls from the public GitHub repo; override with
# WORKFOREST_SKILL_REPO to point at a local clone during development, e.g.:
#   WORKFOREST_SKILL_REPO=../workforest-skill ./scripts/sync-skill.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_SOURCE="${WORKFOREST_SKILL_REPO:-https://github.com/mnliv/workforest-skill.git}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Fetching skill content from: $SKILL_SOURCE"
git clone --depth 1 --quiet "$SKILL_SOURCE" "$TMP_DIR"

rm -rf "$REPO_ROOT/skill/workforest"
mkdir -p "$REPO_ROOT/skill"
cp -r "$TMP_DIR/skills/workforest" "$REPO_ROOT/skill/workforest"

echo "Synced into $REPO_ROOT/skill/workforest"
echo "Review the diff (git diff skill/), then commit it as part of the release."
