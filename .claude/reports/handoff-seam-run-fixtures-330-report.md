# Implementation Report — commit both handoff-seam fenced runs as labelled fixtures (#330)

**Plan**: `.claude/plans/handoff-seam-run-fixtures-330.md`   **Branch**: `docs/handoff-seam-fixtures-330` (worktree `../wt-330`)   **Base**: `ea82873` (origin/main) → `ea82873` at report (`git fetch origin` re-run before commit: origin/main still `ea82873`, no merge needed)   **Status**: PARTIAL (AC #1's verbatim prompt cannot be met: the owner does not have the prompts)

## Summary

Both fenced runs from 2026-08-28 are copied byte for byte, minus their `pack/` copies, into
`docs/epics/fixtures/handoff-seam/2026-08-28-{seam,port}/`: 12 run files, `server.log` force-added past
`.gitignore`'s `*.log`. Each run has a hand-written `README.md` carrying the label, the pack commit `6f1376b` with
a restore command, the fence (set-up and limits), the prompt fallback, the timeline and a file inventory. No CI
change: drift-check's syntax leg already reaches `server.mjs` (positive control below).

## Tasks completed

- Task 1 → worktree `../wt-330` on `docs/handoff-seam-fixtures-330` off `origin/main` `ea82873`; tool `node_modules` symlinked (CREATE)
- Task 2 → 12 run files under `docs/epics/fixtures/handoff-seam/2026-08-28-{seam,port}/` (CREATE, copied)
- Task 3 → byte diff from the index, both runs empty; REDDENS observed
- Task 4 → `2026-08-28-seam/README.md`, `2026-08-28-port/README.md` (CREATE)
- Task 5 → syntax-leg positive control observed, file restored
- Task 6 → gates run, committed; `git archive HEAD` diff and the 14-file count below

## Tests added

No suite (CLAUDE.md §Testing). The checks are the file count, the byte diff, the README grep and the drift-check
positive control, below.

## Proving the checks

| Check | Mutation | Result (observed) | Positive control (observed) |
|---|---|---|---|
| File count (Task 2) | none applied this run; pre-flight omitted `git add -f server.log` | pre-flight: 11 | `git ls-files … \| wc -l` → `12` |
| Byte diff from the index (Task 3) | `printf x >>` staged seam `questions.md`, `git add` | `diff` printed `45a46 > x`, exit 1, no `SEAM-EMPTY-DIFF` | unmutated: `SEAM-EMPTY-DIFF`, `PORT-EMPTY-DIFF`; after rsync restore: `SEAM-EMPTY-DIFF-RESTORED` |
| README grep (Task 4, extended to all six headings) | deleted the label line from the port README | `MISSING real agent run, 2026-08-28, fenced to the pack, unedited in …/2026-08-28-port/README.md` | restored: no output |
| drift-check syntax leg reaches `server.mjs` (Task 5) | `echo '}' >>` server.mjs | `drift ✗  syntax error in docs/epics/fixtures/handoff-seam/2026-08-28-seam/server.mjs (node --check failed)` | after `git checkout --`: `node --check` → `restored`; full drift-check ✓ |

The diff mutation printed a line diff rather than the plan's expected `Files … differ` because both files are text;
either output is a red.

## Validation results

All observed in `../wt-330` with the 14 fixture files staged, base `ea82873`:

- `git ls-files docs/epics/fixtures/handoff-seam | wc -l` → `12` (before READMEs); `git diff --cached --stat | tail -1` → `12 files changed, 1885 insertions(+)`
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · annotated-source · loc-summary · param-count · icons · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · build-handoff · group-count`
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass`
- Portal smoke (piv-validate): `PORT=64230 node server.mjs` in `wt-330/portal` (node_modules symlinked, removed after), `curl /api/health` → `{"ok":true,…,"bootSha":"ea82873…","stale":false}`; killed by PID.
- Level 4 optional, done in scratch (not in the repo): copied `2026-08-28-seam/` out, restored `pack/` with the README's `git -C <repo> archive 6f1376b handoff/verdant` command, `diff -rq pack ~/Desktop/seam-run/pack` empty, `node server.mjs` printed a line identical to `server.log` (`diff` → `LOG-MATCH`).
- Desktop mtimes re-read 2026-10-02 (`ls -lT`): seam run files 20:48:06–20:53:32, port 20:51:43–20:53:48, both 2026-08-28.
- After commit (pre-amend `54756c1`): `git show --name-only --format= HEAD | grep -c '^docs/epics/fixtures/handoff-seam/'` → `14`; `git archive HEAD docs/epics/fixtures/handoff-seam` vs both Desktop dirs (`diff -r -x pack -x README.md`) → `SEAM-EMPTY-DIFF`, `PORT-EMPTY-DIFF`. drift-check ✓ and build-checks `all 51 groups pass` re-run on the staged tree immediately before that commit.
- Prompt search re-run 2026-10-02: paste-cache 127 entries, 0 matching either hash; 0 transcripts for either session id under `~/.claude/projects`.

## Not run

- CI verify on the PR: pending the push (`gh pr checks` after `headRefOid` matches local HEAD).

## Deviations from the plan

- README restore command uses `git -C <repo root> archive …` instead of the plan's bare `git archive 6f1376b handoff/verdant` **(plan error)**: the pathspec is relative to the working directory, so the bare form run from inside the fixture directory would not find `handoff/verdant`. The `-C` form was run in scratch and produced a `pack/` identical to the Desktop copy. Logged under the plan's AMENDMENTS.

## Assumptions carried

- Q1 answered by the owner ("i dont have prompts"): both READMEs carry the fallback. **AC #1's prompt part stays unticked**; label, fence and commit are met.
- Q2: no new `verify.yml` step.
- A1: `server.log` force-added, `.gitignore` unchanged.
- A2: Desktop copies unchanged since 20:53 on 2026-08-28 (mtimes observed).

## Additions beyond the plan

- The Task 4 grep checks all six pinned headings, not only two.
- The READMEs record the Level 4 boot result (seam) and the compile dependency on the restored pack (port).

## Issues encountered

- **Deploy surface (owner's call, not changed here).** The site deploys with `npx wrangler pages deploy .` from the repo root, and the root has no `.assetsignore` (observed: `git ls-files` shows only `worker/wrangler.jsonc`). So the agent-written `2026-08-28-seam/index.html` becomes reachable at `/docs/epics/fixtures/handoff-seam/2026-08-28-seam/` on the site's origin, with its `/pack/*` and `/api/*` fetches failing (no `pack/`, no server). `_headers` sets noindex site-wide. The rest of `docs/` is already deployed the same way. Excluding it is out of scope for #330.
