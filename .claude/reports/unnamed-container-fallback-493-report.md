# Implementation Report — an unnamed container never outscores the structural fallback (#493)

**Plan**: `.claude/plans/unnamed-container-fallback-493.md`   **Branch**: `fix/unnamed-container-fallback-493`   **Base**: `d6859eb` → `d6859eb` (origin/main unmoved at report time; implementation commit `9e825bc`)   **Status**: COMPLETE

## Summary
`recognise()` now reads the scored outcome from the first candidate that is not an unnamed `many` container
(`import/recognise.mjs`, `pick`); the candidates list, its order, the floor and the fallback are unchanged. R2 in
the header is extended to say so. Case 40.30 proves it on a synthetic `top-bar` entry over the three committed
reads, with a vacuity guard and a named-container positive control. Group 40's detail string and `gates.md:72`
carry the same rule.

## Tasks completed
- 0 Branch → `fix/unnamed-container-fallback-493` from `origin/main` `d6859eb`, in a worktree (see Deviations)
- 1 The rule → `import/recognise.mjs` (UPDATE; the plan's `final.diff.txt` applied verbatim)
- 2 The header → `import/recognise.mjs` R2 (UPDATE; five claims appended, "THE FOUR RULES" heading kept)
- 3 Case 40.30 → `tooling/build-checks.mjs` (UPDATE; from `final.diff.txt`, before `group("import-chain"`)
- 4 Detail string → `tooling/build-checks.mjs` (UPDATE; 40.30 sentence after 40.29, "EIGHT MORE … NINE in all", 40.30 appended to the synthetic list)
- 5 `gates.md:72` → `.claude/references/gates.md` (UPDATE; "Five decisions", "Nine cases", the 40.30 sentence)
- 6 Commit `9e825bc` (three files + plan `.md`/`.html` + `-probe/` dir), then Level 4

## Tests added
Case 40.30 in build-checks group 40 (three assertions: no verdict moves; vacuity guard; positive control).
`node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed).

## Proving the checks
| Mutation | Result (observed, `node tooling/build-checks.mjs`) |
|---|---|
| none (baseline, before any edit) | `build ✓  all 51 groups pass` |
| M1: `const pick = top;` (the rule reverted, header kept) | `build import-chain ✗ 2 failure(s)`: `40.30: SYNTHETIC — adding an unnamed \`many\` container … moved 6 verdict(s) … instance ir.children[0].children[1]: stack via structural-fallback → top-bar via scored; …` and `40.30: SYNTHETIC — "Text block" reads "top-bar" via scored with top-bar at 0.5 — …` |
| M2: `!(container(c) && !named(c))` → `!container(c)` (exclude every container) | `build import-chain ✗ 7 failure(s)`: four list-builder SYNTHETIC rows (40.12, `build-checks.mjs:14281`), `40.19: the committed Figma verdict and the run disagree`, `40.19: ir.children[0] (the Figma row) reads "list-row" via scored`, and the positive control `40.30: SYNTHETIC — "Text block" renamed "Top bar" reads "stack" via structural-fallback — a NAMED container must still win` |
| restored | `build ✓  all 51 groups pass` |

Positive control for the new check is built in (the renamed "Top bar" node must read `top-bar` scored); M2 reds it.

## Validation results
- Level 1: `node --check import/recognise.mjs && node --check tooling/build-checks.mjs` → exit 0 (observed)
- Level 2 (staged): `node tooling/drift-check.mjs` → `drift-check ✓ syntax · … · group-count` (observed);
  `node tooling/token-lint.mjs` → `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed);
  `node tooling/build-checks.mjs` → `build ✓  all 51 groups pass` (observed)
- Task 4/5 greps: `40.30 (#493)` appears once in the build-checks output and once in `gates.md` (observed)
- Level 3: `node import/regen-expected.mjs` → `expected verdict ✓ … 57579 bytes`, `… 55853 bytes`;
  `node tooling/regen-import-records.mjs --check` → `import records ✓ … 4 files, 187933 bytes, no drift`;
  `git diff --exit-code import/fixtures` → no diff (observed)
- Level 4 (detached worktree of `9e825bc`, `npm ci` in `tooling/icons` + `tooling/style-dictionary`, the probe's
  two drivers): `ok: true`, ten steps `code 0`, the last `tooling/build-checks.mjs code 0 18002ms`, total 21085 ms
  (observed). The admitted entry was `top-bar`, `children: "many"`, one `title` slot. Worktree and `$TMPDIR`
  package removed after. Control (plan's run on `origin/main`, `e2e-before.txt`): step 10 code 1, 37 failures — not re-run.
- Level 5: the `piv-validate` skill was not invoked; its checks were run individually — the three CI `verify` legs above, plus a portal smoke on an OS-assigned port (59211),
  killed by its own PID: `/api/health` → `{"ok":true, … "bootSha":"9e825bc…","headSha":"9e825bc…","stale":false}` (observed)
- Re-base: `git fetch` → `origin/main` still `d6859eb`, an ancestor of HEAD, so no merge was needed and the gates
  above ran on the tree that would merge (observed).

## Not run
- The Level 4 control (step 10 red on `origin/main`) was not re-driven; the plan's committed `e2e-before.txt` is the record. M1 above is the same failure measured at the gate level.
- The visual-regression gate: no shipped page, CSS or loc-summary group is touched (`import/` and `tooling/` match no group), so no baseline can move. Left to CI.

## Deviations from the plan
- Task 0: built in a dedicated worktree (`../wt-493`, branch `fix/unnamed-container-fallback-493` from `origin/main`) instead of `git switch -c` in the shared working directory, which was on another branch with another session's uncommitted `SKILL.md` edit. Same branch name, same base; the plan files were copied in from the shared tree's untracked copies.

## Assumptions carried
- Q1 (name only, not name OR child-fit) and Q2 (no "passed over" verdict field), as recommended in the plan.
- Task 4's "add 40.30 to that list's end": placed as the last item of the synthetic list, before "· with R2 beside it", which is where the list ends in the string.

## Additions beyond the plan
None.

## Issues encountered
Post-implementation grep for stale counts (`Four decisions`, `Eight cases`, `EIGHT in all`, `SEVEN MORE`) outside plans/reports: no hit in group-40 prose; group 40's header comment carries no counts.
 The first build-checks run wrote its log to `/tmp/bc.txt` rather than the scratchpad; removed.
