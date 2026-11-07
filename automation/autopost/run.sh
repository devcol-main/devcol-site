#!/bin/bash
# devcol.net autopost: turn new PSEUDO / TumbleTeams notes into scheduled DevLog posts.
#
#   run.sh prepare   sync the clones; prints SKIP if today already succeeded (used by the Claude app task)
#   run.sh finish    build check, push, mark today done                     (used by the Claude app task)
#   run.sh [--force] prepare + headless `claude -p` + finish in one go      (launchd / by hand)
#
# Everything happens in dedicated clones under $DEVCOL_AUTOPOST_HOME, so your working copies are never touched.
set -uo pipefail

HOME_DIR="${DEVCOL_AUTOPOST_HOME:-$HOME/.devcol-autopost}"
SRC="$HOME_DIR/src"
SITE="$HOME_DIR/devcol-site"
LOG_DIR="$HOME/Library/Logs/devcol-autopost"
DONE="$HOME_DIR/last-success"
BEFORE_FILE="$HOME_DIR/before-sha"
mkdir -p "$SRC" "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y-%m-%d).log"
TODAY=$(TZ=Asia/Seoul date +%F)
MODE="${1:-all}"; FORCE=0
[ "$MODE" = "--force" ] && { MODE=all; FORCE=1; }

# launchd and app tasks start with a short PATH; add the usual tool locations.
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -f "$HOME_DIR/env" ] && . "$HOME_DIR/env"

log() { echo "$*"; echo "[$(date '+%F %T')] $MODE: $*" >>"$LOG"; }
notify() { osascript -e "display notification \"$1\" with title \"devcol autopost\"" >/dev/null 2>&1 || true; }
fail() { log "FAIL: $1"; notify "Failed: $1"; exit 1; }

prepare() {
  if [ $FORCE = 0 ] && [ "$(cat "$DONE" 2>/dev/null)" = "$TODAY" ]; then
    log "SKIP: already ran today ($TODAY)"; return 10
  fi
  for r in pseudo tumbleteams; do
    if [ -d "$SRC/$r/.git" ]; then git -C "$SRC/$r" fetch -q origin main || fail "fetch $r"
    else git clone -q --filter=blob:none --no-checkout "https://github.com/devcol-main/$r" "$SRC/$r" || fail "clone $r"; fi
  done
  if [ -d "$SITE/.git" ]; then
    git -C "$SITE" fetch -q origin main || fail "fetch site"
    git -C "$SITE" checkout -q main && git -C "$SITE" reset -q --hard origin/main && git -C "$SITE" clean -qfd || fail "reset site"
  else
    git clone -q https://github.com/devcol-main/devcol-site "$SITE" || fail "clone site"
  fi
  (cd "$SITE" && npm ci --silent --no-audit --no-fund) >>"$LOG" 2>&1 || fail "npm ci"
  [ -f "$SITE/automation/autopost/prompt.md" ] || fail "automation/autopost/prompt.md missing on main"
  git -C "$SITE" rev-parse HEAD > "$BEFORE_FILE"
  log "READY: site at $(git -C "$SITE" log --oneline -1), DEVCOL_SRC=$SRC, today=$TODAY"
}

finish() {
  cd "$SITE" || fail "cd site"
  local before; before=$(cat "$BEFORE_FILE" 2>/dev/null) || fail "run prepare first"
  if [ "$(git rev-parse HEAD)" = "$before" ]; then
    [ -z "$(git status --porcelain)" ] || fail "uncommitted changes left behind"
    echo "$TODAY" > "$DONE"; log "DONE: nothing new"; return 0
  fi
  [ -z "$(git status --porcelain)" ] || fail "uncommitted changes left behind"
  npm run docs:build >>"$LOG" 2>&1 || fail "docs:build failed; nothing pushed"
  git push -q origin main || fail "push"
  local n; n=$(git diff --name-only --diff-filter=A "$before" HEAD -- docs/blog | wc -l | tr -d ' ')
  echo "$TODAY" > "$DONE"
  log "DONE: pushed $n new post(s): $(git log --format=%s -1)"
  notify "Queued $n new post(s)"
}

LOCK="$HOME_DIR/.lock"
case "$MODE" in
  prepare) prepare; rc=$?; [ $rc = 10 ] && exit 0; exit $rc ;;
  finish)  finish ;;
  all)
    mkdir "$LOCK" 2>/dev/null || { log "another run is active"; exit 0; }
    trap 'rmdir "$LOCK"' EXIT
    prepare; rc=$?; [ $rc = 10 ] && exit 0; [ $rc = 0 ] || exit $rc
    CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || true)}"
    [ -n "$CLAUDE_BIN" ] && [ -x "$CLAUDE_BIN" ] || fail "claude CLI not found"
    cd "$SITE" || fail "cd site"
    PROMPT="$(cat automation/autopost/prompt.md)

DEVCOL_SRC=$SRC
Today (Asia/Seoul): $TODAY"
    DEVCOL_SRC="$SRC" "$CLAUDE_BIN" -p "$PROMPT" --permission-mode acceptEdits \
      --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "Bash(git:*)" "Bash(npm run:*)" "Bash(node scripts/schedule.mjs:*)" "Bash(node scripts/cover.mjs:*)" "Bash(ls:*)" "Bash(date:*)" "Bash(TZ=Asia/Seoul date:*)" \
      --disallowedTools "Bash(git push:*)" "Bash(git reset:*)" "WebFetch" "WebSearch" >>"$LOG" 2>&1 \
      || fail "claude run exited with an error"
    finish ;;
  *) echo "usage: run.sh [prepare|finish|--force]"; exit 2 ;;
esac
