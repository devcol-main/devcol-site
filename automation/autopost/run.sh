#!/bin/bash
# devcol.net autopost: turn new PSEUDO / TumbleTeams notes into scheduled DevLog posts.
# Runs from launchd (see install.sh) or by hand: ./run.sh
# Works in its own clones under $DEVCOL_AUTOPOST_HOME, so your working copies are never touched.
set -uo pipefail

HOME_DIR="${DEVCOL_AUTOPOST_HOME:-$HOME/.devcol-autopost}"
SRC="$HOME_DIR/src"
SITE="$HOME_DIR/devcol-site"
LOG_DIR="$HOME/Library/Logs/devcol-autopost"
mkdir -p "$SRC" "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y-%m-%d_%H%M).log"
exec >>"$LOG" 2>&1

# launchd starts with a bare PATH; add the usual tool locations.
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -f "$HOME_DIR/env" ] && . "$HOME_DIR/env"   # written by install.sh (CLAUDE_BIN, NODE path)

notify() { osascript -e "display notification \"$1\" with title \"devcol autopost\"" >/dev/null 2>&1 || true; }
fail() { echo "FAIL: $1"; notify "Failed: $1 (log: $LOG)"; exit 1; }

echo "=== $(date '+%F %T') start"
LOCK="$HOME_DIR/.lock"
mkdir "$LOCK" 2>/dev/null || { echo "another run is active, exiting"; exit 0; }
trap 'rmdir "$LOCK"' EXIT

CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || true)}"
[ -n "$CLAUDE_BIN" ] && [ -x "$CLAUDE_BIN" ] || fail "claude CLI not found"
command -v npm >/dev/null || fail "npm not found"

# 1. Source repos: blobless, no checkout; posts read them with `git show origin/main:<path>`.
for r in pseudo tumbleteams; do
  if [ -d "$SRC/$r/.git" ]; then
    git -C "$SRC/$r" fetch -q origin main || fail "fetch $r"
  else
    git clone -q --filter=blob:none --no-checkout "https://github.com/devcol-main/$r" "$SRC/$r" || fail "clone $r"
  fi
done

# 2. Site repo: dedicated clone, reset to origin/main every run.
if [ -d "$SITE/.git" ]; then
  git -C "$SITE" fetch -q origin main || fail "fetch site"
  git -C "$SITE" checkout -q main && git -C "$SITE" reset -q --hard origin/main && git -C "$SITE" clean -qfd || fail "reset site"
else
  git clone -q https://github.com/devcol-main/devcol-site "$SITE" || fail "clone site"
fi
cd "$SITE" || fail "cd site"
npm ci --silent --no-audit --no-fund || fail "npm ci"
[ -f automation/autopost/prompt.md ] || fail "automation/autopost/prompt.md missing on main"
BEFORE=$(git rev-parse HEAD)

# 3. Let Claude write, schedule, wire and commit (no push).
PROMPT="$(cat automation/autopost/prompt.md)

DEVCOL_SRC=$SRC
Today (Asia/Seoul): $(TZ=Asia/Seoul date +%F)"
DEVCOL_SRC="$SRC" "$CLAUDE_BIN" -p "$PROMPT" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "Bash(git:*)" "Bash(npm run:*)" "Bash(node scripts/schedule.mjs:*)" "Bash(ls:*)" "Bash(date:*)" "Bash(TZ=Asia/Seoul date:*)" \
  --disallowedTools "Bash(git push:*)" "Bash(git reset:*)" "WebFetch" "WebSearch" \
  || fail "claude run exited with an error"

# 4. Gate: only push new commits that build.
if [ "$(git rev-parse HEAD)" = "$BEFORE" ]; then
  echo "no new commits"; echo "=== $(date '+%F %T') done (nothing new)"; exit 0
fi
[ -z "$(git status --porcelain)" ] || fail "uncommitted changes left behind"
npm run docs:build >/dev/null || fail "docs:build failed; nothing pushed"
git push -q origin main || fail "push"
N=$(git diff --name-only --diff-filter=A "$BEFORE" HEAD -- docs/blog | wc -l | tr -d ' ')
echo "pushed $N new post(s): $(git log --format=%s -1)"
notify "Queued $N new post(s)"
echo "=== $(date '+%F %T') done"
