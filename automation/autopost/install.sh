#!/bin/bash
# Install / remove the daily devcol autopost LaunchAgent on macOS.
#   ./install.sh            install (runs daily at 10:17 local time; a missed run fires after wake)
#   ./install.sh 21:43      install with another time
#   ./install.sh --uninstall
set -euo pipefail
LABEL=net.devcol.autopost
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
HOME_DIR="${DEVCOL_AUTOPOST_HOME:-$HOME/.devcol-autopost}"

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"; echo "removed $LABEL (clones in $HOME_DIR left in place)"; exit 0
fi

TIME="${1:-10:17}"; H=$((10#${TIME%%:*})); M=$((10#${TIME##*:}))
CLAUDE_BIN="$(command -v claude || true)"
[ -n "$CLAUDE_BIN" ] || { echo "claude CLI not found on PATH. Install Claude Code and run 'claude' once to log in."; exit 1; }
command -v npm >/dev/null || { echo "npm not found. Install Node.js (e.g. 'brew install node')."; exit 1; }
git ls-remote https://github.com/devcol-main/pseudo HEAD >/dev/null || { echo "git can't read devcol-main/pseudo. Log in to GitHub for git (e.g. 'gh auth login' or a credential helper)."; exit 1; }

mkdir -p "$HOME_DIR" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs/devcol-autopost"
# Run a copy, so the job doesn't depend on this working copy's branch.
cp "$(cd "$(dirname "$0")" && pwd)/run.sh" "$HOME_DIR/run.sh"; chmod +x "$HOME_DIR/run.sh"
printf 'CLAUDE_BIN=%q\nexport PATH=%q:"$PATH"\n' "$CLAUDE_BIN" "$(dirname "$(command -v npm)")" > "$HOME_DIR/env"

cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$HOME_DIR/run.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>$H</integer><key>Minute</key><integer>$M</integer></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/devcol-autopost/launchd.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/devcol-autopost/launchd.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
printf 'installed %s: daily at %02d:%02d\n' "$LABEL" "$H" "$M"
echo "run now:   launchctl kickstart gui/$(id -u)/$LABEL"
echo "logs:      ~/Library/Logs/devcol-autopost/"
