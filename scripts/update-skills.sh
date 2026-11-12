#!/usr/bin/env bash
# Re-install the two writing skills from upstream into this repo's .claude/.
#   humanizer  <- github.com/blader/humanizer      (.claude/skills/humanizer)
#   im-not-ai  <- github.com/epoko77-ai/im-not-ai  (.claude/skills/humanize-*, .claude/agents/*)
# Installed commits are recorded in .claude/skills/UPSTREAM.lock.
# Prints "changed" or "unchanged" on the last line.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/.claude/skills/UPSTREAM.lock"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone -q --depth 1 https://github.com/blader/humanizer "$TMP/humanizer"
git clone -q --depth 1 https://github.com/epoko77-ai/im-not-ai "$TMP/im-not-ai"
H_SHA="$(git -C "$TMP/humanizer" rev-parse HEAD)"
K_SHA="$(git -C "$TMP/im-not-ai" rev-parse HEAD)"

NEW_LOCK="humanizer $H_SHA
im-not-ai $K_SHA"
if [ -f "$LOCK" ] && [ "$(cat "$LOCK")" = "$NEW_LOCK" ]; then
  echo "unchanged"; exit 0
fi

# humanizer: a single SKILL.md
rm -rf "$ROOT/.claude/skills/humanizer"
mkdir -p "$ROOT/.claude/skills/humanizer"
cp "$TMP/humanizer/SKILL.md" "$TMP/humanizer/LICENSE" "$ROOT/.claude/skills/humanizer/"

# im-not-ai: remove the previous copy, then run its own installer in copy mode
rm -rf "$ROOT"/.claude/skills/humanize-korean "$ROOT"/.claude/skills/humanize \
       "$ROOT"/.claude/skills/humanize-scan "$ROOT"/.claude/skills/humanize-redo
rm -f "$ROOT"/.claude/agents/humanize-*.md "$ROOT"/.claude/agents/korean-ai-tell-taxonomist.md
CLAUDE_HOME="$ROOT/.claude" CODEX_HOME="$TMP/no-codex" \
  bash "$TMP/im-not-ai/install.sh" --copy --claude-only >/dev/null
cp "$TMP/im-not-ai/LICENSE" "$ROOT/.claude/skills/humanize-korean/"
rm -rf "$ROOT/.claude/backups"
find "$ROOT/.claude" -name __pycache__ -type d -prune -exec rm -rf {} +

# smoke test: the Korean scoring script must still run on a sample
SMOKE="$TMP/smoke/_workspace/run"
mkdir -p "$SMOKE"
printf '이는 단순한 버그가 아니라 시스템 전반에 걸친 문제였다. 결론적으로, 많은 것을 배울 수 있었다.\n' > "$SMOKE/01_input.txt"
(cd "$TMP/smoke" && python3 "$ROOT/.claude/skills/humanize-korean/scripts/prepare_monolith_input.py" \
   --run-dir _workspace/run --genre 블로그 >/dev/null)
grep -q route_hint "$SMOKE/00_metrics.json"
test -s "$ROOT/.claude/skills/humanizer/SKILL.md"

printf '%s\n' "$NEW_LOCK" > "$LOCK"
echo "changed"
