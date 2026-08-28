#!/usr/bin/env bash
# record-gate.sh — run the validation gate and record its result against a commit.
#
# The gate line is the single most-copied figure in this loop, and the one that
# has gone wrong most often: a count from an earlier run pasted next to a delta
# from a later one, a duration that drifted between the report and the handoff
# note, a suite total that a rebase invalidated. Auditing prose after the fact
# does not fix that. This removes the opportunity: the numbers are captured by
# the run itself, stamped with the commit they describe, and the PR body renders
# them instead of restating them.
#
#   record-gate.sh <gate command...>
#   record-gate.sh pnpm turbo run typecheck lint test build --force
#
# Writes .claude/last-gate.json at the repo root and prints a ready-to-paste
# Validation block. Exits with the gate's own exit code, so a red gate cannot
# quietly produce a green-looking record.

set -uo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $(basename "$0") <gate command...>" >&2
  exit 2
fi

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "not a git repo" >&2; exit 2; }
head_sha=$(git rev-parse HEAD)
head_short=$(git rev-parse --short HEAD)
branch=$(git branch --show-current)

if [ -n "$(git status --porcelain)" ]; then
  echo "WARNING: working tree is dirty. The record will name $head_short, but the run" >&2
  echo "         covers uncommitted changes that commit does not contain." >&2
fi

log=$(mktemp)
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "recording gate at $head_short ($branch): $*"
"$@" 2>&1 | tee "$log"
rc=${PIPESTATUS[0]}
finished=$(date -u +%Y-%m-%dT%H:%M:%SZ)

strip() { sed 's/\x1b\[[0-9;]*m//g' "$1"; }

# turbo's own summary
tasks=$(strip "$log" | grep -oE '[0-9]+ successful, [0-9]+ total' | tail -1)
cached=$(strip "$log" | grep -oE '[0-9]+ cached, [0-9]+ total' | tail -1)
elapsed=$(strip "$log" | grep -E '^[[:space:]]*Time:' | tail -1 | sed 's/.*Time:[[:space:]]*//' | tr -d ' ')

# per-package counts. jest prints "Tests: N passed, N total"; vitest prints
# "Tests  N passed (N)". Both are captured with the package prefix turbo adds.
packages=$(strip "$log" | grep -E ':(test|test:[a-z]+): *(Tests:|Tests +[0-9]|Test Suites:|Test Files)' \
  | sed 's/^ *//' | sed 's/  */ /g' | sort -u)

json="$root/.claude/last-gate.json"
mkdir -p "$root/.claude"
{
  printf '{\n'
  printf '  "head": "%s",\n' "$head_sha"
  printf '  "head_short": "%s",\n' "$head_short"
  printf '  "branch": "%s",\n' "$branch"
  printf '  "command": "%s",\n' "$(printf '%s ' "$@" | sed 's/ $//; s/"/\\"/g')"
  printf '  "exit_code": %d,\n' "$rc"
  printf '  "started": "%s",\n' "$started"
  printf '  "finished": "%s",\n' "$finished"
  printf '  "tasks": "%s",\n' "${tasks:-}"
  printf '  "cached": "%s",\n' "${cached:-}"
  printf '  "elapsed": "%s",\n' "${elapsed:-}"
  printf '  "packages": [\n'
  printf '%s' "$packages" | awk 'NF{gsub(/"/,"\\\""); printf "    \"%s\",\n", $0}' | sed '$ s/,$//'
  printf '  ]\n'
  printf '}\n'
} > "$json"

echo
echo "wrote $json"
echo
echo "--- Validation block (paste verbatim; do not retype the numbers) ---"
echo
if [ "$rc" -eq 0 ]; then
  echo "\`observed\` — \`$*\`, at \`$head_short\`, exit 0:"
else
  echo "**GATE RED** (exit $rc) — \`$*\`, at \`$head_short\`:"
fi
echo
echo '```'
[ -n "${tasks:-}" ]   && echo "Tasks:    $tasks"
[ -n "${cached:-}" ]  && echo "Cached:   $cached"
[ -n "${elapsed:-}" ] && echo "Time:     $elapsed"
echo '```'
[ -n "$packages" ] && { echo; printf '%s\n' "$packages" | sed 's/^/    /'; }

exit "$rc"
