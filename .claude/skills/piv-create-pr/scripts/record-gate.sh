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

# The command as a line that re-runs as written. "$@" runs it correctly, but $*
# drops the quoting, so `bash -c 'a && b'` was recorded as `bash -c a && b` —
# a line that hands only `a` to bash -c. Built BEFORE the run, so the progress
# line is quoted too and not only the record.
#
# Wrapped in single quotes rather than by `printf %q`: ${*@Q} needs bash 4.4 and
# macOS ships 3.2, and 3.2's %q corrupts a multibyte argument — it escapes the
# second and third bytes of a UTF-8 character and leaves the first raw, which put
# an invalid byte in the JSON below. Single-quote wrapping touches no byte it does
# not have to, and an embedded quote closes, escapes and reopens: '\'' .
ESC="'\\''"
shq() { local out= a e; for a in "$@"; do e=${a//\'/$ESC}; out="$out'$e' "; done; printf '%s' "${out% }"; }
# JSON string escaping by parameter expansion, for the same reason: sed and awk
# both read the locale, and neither is safe to point at an arbitrary argument.
jesc() { local s=$1; s=${s//\\/\\\\}; s=${s//\"/\\\"}; printf '%s' "$s"; }
qcmd=$(shq "$@")

log=$(mktemp)
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "recording gate at $head_short ($branch): $qcmd"
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

# a gate that is not turbo, jest or vitest prints none of the above, and the
# block came out empty. Three tries, narrowest first, because the point of the
# block is the gate's VERDICT and a blind tail is not one: a chained gate prints
# each tool's verdict long before the end, and a verbose suite can put kilobytes
# of per-case prose after it. GATE_SUMMARY_REGEX is the caller's override for a
# gate whose verdict this cannot guess; the default matches a one-word tool name
# followed by a tick or a cross, which is this repo's convention
# (`drift-check ✓ …`, `token-lint ✓ …`, `build ✓  all 34 groups pass`) without
# matching its per-group lines, which carry more words before the mark. The last
# resort is bounded to one line and one screen width, so a gate with no
# convention still says something and cannot paste a wall into a PR body.
summary=""
if [ -z "${tasks:-}${cached:-}${elapsed:-}${packages:-}" ]; then
  summary=$(strip "$log" | grep -E "${GATE_SUMMARY_REGEX:-^[^[:space:]]+[[:space:]]+(✓|✗)[[:space:]]}" | tail -10)
  [ -z "$summary" ] && summary=$(strip "$log" | grep -v '^[[:space:]]*$' | tail -1 | cut -c1-200)
fi

json="$root/.claude/last-gate.json"
mkdir -p "$root/.claude"
{
  printf '{\n'
  printf '  "head": "%s",\n' "$head_sha"
  printf '  "head_short": "%s",\n' "$head_short"
  printf '  "branch": "%s",\n' "$branch"
  printf '  "command": "%s",\n' "$(jesc "$qcmd")"
  printf '  "exit_code": %d,\n' "$rc"
  printf '  "started": "%s",\n' "$started"
  printf '  "finished": "%s",\n' "$finished"
  printf '  "tasks": "%s",\n' "${tasks:-}"
  printf '  "cached": "%s",\n' "${cached:-}"
  printf '  "elapsed": "%s",\n' "${elapsed:-}"
  printf '  "summary": [\n'
  if [ -n "${summary:-}" ]; then
    first=1
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      [ $first -eq 1 ] || printf ',\n'
      first=0
      printf '    "%s"' "$(jesc "$line")"
    done <<< "$summary"
    printf '\n'
  fi
  printf '  ],\n' 
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
  echo "\`observed\` — \`$qcmd\`, at \`$head_short\`, exit 0:"
else
  echo "**GATE RED** (exit $rc) — \`$qcmd\`, at \`$head_short\`:"
fi
echo
echo '```'
[ -n "${tasks:-}" ]   && echo "Tasks:    $tasks"
[ -n "${cached:-}" ]  && echo "Cached:   $cached"
[ -n "${elapsed:-}" ] && echo "Time:     $elapsed"
[ -n "$summary" ]     && printf '%s\n' "$summary"
echo '```'
[ -n "$packages" ] && { echo; printf '%s\n' "$packages" | sed 's/^/    /'; }

exit "$rc"
