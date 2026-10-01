# PR #501 review: the inbox, one read-only "waiting on you" surface (#319)

**Head** 5b6bf9a8edddd6d3a45d57a51b4a2d303944a6ce · **Base** main @ `d1c8f3f522fe1787c123a3eb681a9056d65c0821` · first round (no earlier report) · mergeState CLEAN

## Summary

The PR adds `portal/lib/inbox.mjs`, a pure fold over every run `listBuilds` lists. It turns waiting items into rows of nine kinds, each with the one verb that clears it. It also adds `GET /api/inbox`, the `#/inbox` page, "N waiting" on the run list, a `?frame=` focus seam on the canvas and a `#/discovery/<provenance>/<slug>` route. Group 51 and canvas-journey pass W gate it.

No Critical or High issues. Two Medium and three Low. **Recommendation: approve. Nothing blocks.** F1 is recommended before merge but does not block it.

## Issues

### Medium

**F1 `tooling/build-checks.mjs:17946`, with the claim at `portal/lib/inbox.mjs:7-9`. Group 51.1 says it "greps for every fs write call", but it denylists seven sync names.**
`cpSync`, `truncateSync`, `rmdirSync`, `symlinkSync`, `openSync(f, "w")`, `createWriteStream` and the async `writeFile` all pass the regex. Separately, 51.1's specifier check accepts any `node:` module, so a `node:fs/promises` import also gets through. 51.7's before/after hash only catches a write that lands inside the fixture package. Verified by running the regex against each name: all returned false.
The same claim has three copies, so fix all three together:
- the `inbox.mjs` header, lines 7-9 ("greps for every fs write call")
- the group 51 `group()` string, `build-checks.mjs:18188` ("no fs write call in its source")
- the Group 51 paragraph, `gates.md:94` ("finds no fs write call in its source")

Fix: replace the denylist with an allowlist that pins the module's `node:` imports to exactly `node:fs {existsSync,readFileSync}` and `node:path {join}`.
**Tested, observed:** I ran it on a scratch copy of the source text, against three evasions and a control.

| Input | Today's denylist | Allowlist |
|---|---|---|
| control (the PR's source) | green | green |
| `cpSync` added to the fs import | green | **red** |
| `import { writeFile } from "node:fs/promises"` added | green | **red** |
| `import * as fs from "node:fs"` added | green | **red** |

The other option is to soften all three copies to name the seven calls actually checked.

**F2 `portal/lib/inbox.mjs:228-229`. Two roots with the same provenance and the same slug read one package twice and the other never.**
`listBuilds` returns no `dir`, so `inbox()` searches again with `roots.find(...)`, and that search returns the first root for both entries. On a synthetic two-root fixture, `counts` said 3 for `fictional/aa` while `rows` held `aa` six times, and `r2/aa` was dropped. **Unreachable today**, because `buildRoots()` passes two roots with distinct provenances.
Fix: have `listBuilds` return `dir` and use it, so there is one lookup instead of two that can disagree. Deferring this is reasonable.

### Low

**F3 `portal/lib/inbox.mjs` `byOrder` (~217-224) against header line 49 ("oldest first by `at`").** A row with a null `at` sorts before every dated row, because `""` sorts first. Ledger lines normally carry `at`, and the comparator is a valid total order (checked: both groups sort lexicographically). Document it, or sort null last.

**F4 `tooling/ratify-journey.mjs:228`.** This line hardcodes `all 51 groups pass`, and drift-check's group-count does not read it, which the PR body notes. The next group added reds R7 again. This is an existing pattern and the PR handled it correctly; noted for whoever adds group 52.

**F5 `portal/public/portal.js:3` `esc()`.** It does not escape `'`. Every attribute in `renderInbox` is double-quoted, so this cannot be exploited today. It would matter if someone later wrote a single-quoted attribute.

## Security checks (no finding)
- `verb.href` is either `/canvas.html?` built with `URLSearchParams`, or `#/discovery/<prov>/<slug>`. The slug is gated by `RUN_SLUG_RE` in `listBuilds`, and the provenance comes from two hardcoded roots.
- The `#/discovery/` route matches `(fictional|real)/[a-z0-9-]{1,48}` and `encodeURIComponent`s both values, so `../` falls through to the default route.
- `?frame=` uses `CSS.escape` for selectors and `canvas.say` (`textContent`) for text, with no `innerHTML`.
- `GET /api/inbox` sits behind the origin guard. Observed: `Origin: http://evil.example` returned 403.

## Numbers pass

| Figure (PR body / report) | Provenance | Re-observed here |
|---|---|---|
| `build ✓  all 51 groups pass` at 5b6bf9a | observed | yes, exit 0 |
| drift-check ✓ incl. `group-count`; token-lint ✓ 63 tokens | observed | yes, both |
| `/api/inbox` → 3 rows, `{"fictional/faster-payment":3}`, 0 errors; order empty, loading, partial | observed | yes, portal on an OS-assigned port, killed by PID |
| canvas-journey 227/226/226 on three engines, ratify-journey 52 assertions | observed (report) | not re-run (operator-run journeys) |
| "17 mutations … each reddening its named case" | observed (report) | table counted: rows 1-17 touch `inbox.mjs` or group 51, and the last 5 are drift-check, run-316 and pass W. The count matches. Not re-executed. |
| `run-316-ready.mjs` checks 4, 6 and 8 red for outside reasons | observed, causes stated | not re-run |

No derived figure is presented as observed. The one false sentence is F1's "every fs write call", which is a claim about what the check covers, not a figure.

## Validation (this review, PR head in a clean temp worktree)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ `all 51 groups pass`, exit 0 |
| `node tooling/drift-check.mjs` | ✅ all legs incl. `group-count`, exit 0 |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan |
| Portal smoke | ✅ `/api/health` ok, booted 5b6bf9a; `/api/inbox` as above; hostile origin 403 |
| CodeQL | CI-run on the PR |

One environment note: the first runs went red on group 41.7, `tooling/icons/node_modules` missing in a fresh worktree. A later run overlapped with a second build-checks process in the same tree and left 50.12's temporary edit to `system/device-presets.mjs` behind. Neither involves the PR. The table above is a single clean run after a `git checkout` restore.

## Done well
- The inbox is a fold, not a store. It has no op, no write path and no stored state, and each A1-A4 decision lives in one exported predicate with one fixture, so overruling one of them is a one-function edit.
- Errors are isolated per run: a malformed package lands in `errors` with its slug and line (51.8), and the page still renders. `counts` comes from the same fold, so the badge and the page cannot drift apart.
- The deviations are logged honestly. Removing the `if (hasTranscript)` wrapper so `needsLink` can actually fail (deviation 2), and using `import * as` so a renamed export reds check 3 instead of crashing all twelve checks (deviation 3), both apply the "check that cannot fail" lesson directly.

## Recommendation
**Approve. Nothing blocks.** F1 is non-blocking, because 51.7's hash covers part of the risk, but it is recommended before merge: it fixes a false sentence in three places, and the fix is tested. F2 and F3 can be deferred. This report should land in #501 beside the plan and report.

Posted as a comment: GitHub refuses an approve from the PR's own author.
