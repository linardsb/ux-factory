# PR #385 review — the drawer's Start status keys on openSession's created flag (#383)

**Head** `3d79282` · **Base** `main` @ `a8e8b19` · fresh-eyes pass by the code-reviewer agent over the full changed files, numbers pass and validation by the reviewing session.

## Summary

The fix is correct and the gate now runs the path it used to pin from source. `openSession` returns `created: true` only from its create path and `created: false` only from the resume path; `sessionView` stays flagless; the two callers (the POST route and the new gate case) pass the return through with no whitelist to break. The drawer's resume line reads `cursor.index` / `cursor.total`, which `deriveCursor` yields on every shape including a closed session and whole-bank. Two Low findings, both prose or hygiene.

## Issues

### Low

- **F1** `portal/lib/discovery.mjs:696-697` — the new header sentence says "the GET, turn and close routes return the plain view". Close does not: `closeSession` is `mutateHead`, which returns the bare head (run.json's shape, no cursor or answers), and the route serves that. The claim is new in this PR even though the behaviour is not. Fix: say the GET and turn routes return the plain view and close returns the head alone. Case 44's `sessionView` message carries the same three-route phrase; align it.
- **F2** `tooling/build-checks.mjs:7656` — case 44's `tmpRoot("jobs-383")` lands under the group's `TMP`, but the group's one `rmSync(TMP, …)` sits at line 7323, before case 44 (and before case 39's `ledger-view` root, which already leaked). Every run leaves `$TMPDIR/g30-discovery-*/jobs-383/_discovery/…` behind: OS temp only, never `discovery/` or the jobs folder, so no honesty-contract breach. Fix: move the one `rmSync` to the group's true end, after case 44.

No Medium, High or Critical issues.

## Numbers pass

| Figure (PR body / report) | Provenance | Re-derived by the reviewer |
|---|---|---|
| `build ✓ all 34 groups pass` at `3d79282` | observed, `record-gate.sh` | re-run at head: same line, exit 0 |
| `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan` | observed | re-run at head: identical |
| `drift-check ✓ …` after `git add` | observed | re-run at head on the committed tree: green |
| child run `{true,1,1}` · `{false,1,1}` · `{true,0,0}` | observed (case 44) | case 44 green at head; M1 mutation at head → 2 case-44 lines red, exit 1 |
| smoke cursor `0 of 6`; browser `0 of 30` | observed | `selectDepth('scope-check').length` = 6, `selectDepth('full-discovery').length` = 30 (derived from the bank at head) |
| four mutations red (report table) | observed pre-commit on identical content | M1 re-run at the commit head, red |
| "three green runs on the fixed tree" | observed | not re-derived; a count of the author's runs, head-independent |

Nothing derived sits under an observed label. The browser observation names its commands and its server; the report's "0 of 30 rather than 0 of 6" note explains the one figure a re-derivation would otherwise trip on.

## Guarantees pass

First review round; `baseRefOid` `a8e8b19` equals the base the branch was cut from. Not triggered.

## Validation

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass`, exit 0 (observed at `3d79282`) |
| `node tooling/drift-check.mjs` | green, all thirteen checks (observed at `3d79282`) |
| `node tooling/token-lint.mjs` | green (observed at `3d79282`) |
| Portal boot + two POSTs + one GET, private port, scratch `JOBS_DIR` | `created: true` then `false`; GET view flagless (observed by the author at this content; reviewer verified the route passes the view through unchanged) |

## What is good

- The gate runs the create/resume path instead of grepping it, and the child-process shape keeps group 30's header rule true by construction: every root is a temp directory.
- `JOBS_DIR` override is airtight: `env.mjs` reads `process.env.JOBS_DIR ||` the default at import time and backfills from `.env` only for unset vars, so the child's env spread wins.
- The diff is surgical: six files, the two returns, one status line, one gate case and its prose. No `branch` reintroduced (case 16 holds), no new dependency, British English throughout.
- The report's red proofs name the exact message each mutation produced, and the M4 re-anchor is written down rather than hidden.

## Recommendation

**Approve** once F1 and F2 land: both are one-line prose or hygiene fixes with no bearing on correctness. Posted as a comment rather than an approval, since the repo is solo and the author cannot approve their own PR.
