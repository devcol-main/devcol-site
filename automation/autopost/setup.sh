#!/bin/bash
# One-time Mac setup for devcol autopost, run by a Claude desktop app scheduled task (see README.md).
#   ./setup.sh             create ~/.devcol-autopost (clones, run.sh, permissions for the task)
#   ./setup.sh --launchd   also add a launchd job (10:17 daily, needs the claude CLI) — only if you don't use the app task
#   ./setup.sh --remove-launchd
set -euo pipefail
HOME_DIR="${DEVCOL_AUTOPOST_HOME:-$HOME/.devcol-autopost}"
LABEL=net.devcol.autopost; PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ "${1:-}" = "--remove-launchd" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true; rm -f "$PLIST"; echo "launchd job removed"; exit 0
fi

command -v npm >/dev/null || { echo "npm not found. Install Node.js (e.g. 'brew install node')."; exit 1; }
git ls-remote https://github.com/devcol-main/pseudo HEAD >/dev/null || { echo "git can't read devcol-main/pseudo. Set up GitHub auth for git (e.g. 'gh auth login')."; exit 1; }

mkdir -p "$HOME_DIR"
cp "$HERE/run.sh" "$HOME_DIR/run.sh"; chmod +x "$HOME_DIR/run.sh"
printf 'export PATH=%q:"$PATH"\n' "$(dirname "$(command -v npm)")" > "$HOME_DIR/env"
[ -n "$(command -v claude || true)" ] && printf 'CLAUDE_BIN=%q\n' "$(command -v claude)" >> "$HOME_DIR/env"

rm -f "$HOME_DIR/last-success"
echo "cloning (first time can take a few minutes)..."
"$HOME_DIR/run.sh" prepare || { echo "prepare failed; see ~/Library/Logs/devcol-autopost/"; exit 1; }
SITE="$HOME_DIR/devcol-site"

# Permissions for the app task, in the dedicated clone only (kept out of git and out of `git clean`).
mkdir -p "$SITE/.claude"
cat > "$SITE/.claude/settings.local.json" <<JSON
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Glob", "Grep",
      "Bash(bash ~/.devcol-autopost/run.sh prepare)",
      "Bash(bash ~/.devcol-autopost/run.sh finish)",
      "Bash(git -C:*)", "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)",
      "Bash(git add:*)", "Bash(git commit:*)",
      "Bash(npm run:*)", "Bash(node scripts/schedule.mjs:*)",
      "Bash(ls:*)", "Bash(TZ=Asia/Seoul date:*)"
    ],
    "deny": ["Bash(git push:*)", "Bash(git reset:*)", "WebFetch", "WebSearch"]
  }
}
JSON
grep -qx '.claude/settings.local.json' "$SITE/.git/info/exclude" 2>/dev/null || echo '.claude/settings.local.json' >> "$SITE/.git/info/exclude"

if [ "${1:-}" = "--launchd" ]; then
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$HOME_DIR/run.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>17</integer></dict>
</dict></plist>
PL
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"; echo "launchd job installed (10:17 daily)"
fi

echo "ready: $SITE"
echo "Next: in the Claude desktop app, create the scheduled task described in automation/autopost/README.md (folder: $SITE)."
