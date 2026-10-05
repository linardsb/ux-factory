# PR #531 review: the import reads Brilliant through `read({ paths })` (#530)

**Head** e2c4a41 · **Base** main @ `82054e0` · round 1 (no earlier review, so no guarantees pass) · reviewer: fresh-context session + `code-reviewer` agent

## Verdict

**Approve, with one Medium finding to fix before merge.** There are no Critical or High findings. Every gate is green. The PR does what it claims: both live reads moved off the retired `lookup`, the capture set was re-captured whole, and the converter's `lh(auto,…)` throw is fixed. The deviations in the report and the plan's AMENDMENTS are documented, so none of them is a finding.

## Findings

### F1 (Medium): no gate checks the arguments sent to `read`
- **Where:** `portal/lib/import-run.mjs`, the two `s.call("read", …)` sites, and `tooling/fake-brilliant-bridge.mjs:53-58`.
- **What happens:** If the import stopped scoping its reads to the canvas, every gate would still pass. The fake bridge picks its reply from `args.ids` and `args.format` only and never reads `paths`. `build-checks` asserts `params.arguments` only for `export`.
- **Mutation, observed:** I deleted `paths: [s.canvasId]` from both calls and ran `node tooling/build-checks.mjs`. The result was `build ✓ all 52 groups pass`. canvas-journey runs against the same fake, so it cannot catch this either.
- **Why it matters:** this is the one behaviour the PR changed in `import-run.mjs`. Brilliant documents `paths` as "Omit with a filter to search every canvas", so without it Browse and Import would read the wrong scope. Only the operator-run `--live-brilliant` leg reaches the real bridge.
- **Fix:** assert the sent arguments in 43.12 and 43.13:
  - Import: `toolCalls(log, "read")[i].params.arguments` deep-equals `{paths:[CANVAS], ids:[…], format:"blueprint", expandInstances:true}`.
  - Browse: it deep-equals `{paths:[CANVAS], format:"summary"}`.
  - Then repeat the mutation above and confirm it goes red.

### F2 (Low): `parsePage` does not check `matchCount`
- **Where:** `portal/lib/brilliant-mcp.mjs`, `parsePage`'s return.
- **What happens:** `returnedCount` is checked against the element count, but `matchCount` is passed through unchecked.
- **Observed by the agent:** a fence with no `matchCount` returns `total: undefined`, and a fence with `"x"` returns `total: "x"`. That value reaches the Browse entry at `import-run.mjs:702`.
- **Fix:** throw unless `Number.isInteger(v.matchCount) && v.matchCount >= v.returnedCount`. This matches how the function already refuses a bad `returnedCount`.

### F3 (Low): the "other `lh(auto…)` still throws" half is not asserted
- **Where:** `import/brilliant.mjs:513`, and the 40.28 text.
- **Behaviour is correct (observed by the agent):**
  - Read as null: `lh(auto,1.21)`, `lh(auto, 1.21)`.
  - Throw: `lh(auto)`, `lh(auto,)`, `lh(auto,.5)`, `lh(auto,-1)`, `lh(auto,1e3)`, `lh(auto,1,5)`.
  - The anchored `^\d+(\.\d+)?$` ran a 1M-digit input in 3 ms, so it carries no ReDoS risk.
- **Gap:** 40.28 tests only the accept side. The report's R8a/R8b mutations go red only by removing or changing the accept branch. Nothing would go red if the rule were widened to accept everything.
- **Fix:** add one SYNTHETIC `lh(auto)` line that must throw.

### F4 (Low): the evidence for "top-level only" is not in the committed capture
- **Where:** the comment in `brilliant-mcp.mjs` `parsePage`: "A summary over the path is top-level only today (read-page.json)".
- **Problem:** the scratch canvas has two top-level elements and no children. `read-page.json` therefore reads the same whether summary is top-level only or lists every element, so it cannot show the claim.
- **The claim itself holds (observed):** the evidence is the probe's untracked `raw/07-read.json` and `raw/08-read.json`. There, `Ecommerce 2` reports `childCount 8` and none of its 8 children are listed. The plan already records this as A2.
- **Fix:** point the comment at the plan's A2 instead of the capture.

### F5 (Low): `parseRead` is strict about the shape around the fence
- **Where:** `FENCE_RE`.
- **Fails closed, which is fine:** CRLF line endings and any text after the closing fence both throw, with the first 80 characters quoted.
- **Accepted:** a body containing a bare ```` ``` ```` line passes as one fence.
- No capture pins any of these shapes, so this needs a header note at most.

### Not a finding: the transient build-checks red
- What was seen:
  - The agent's first `build-checks` run and my first `run-316-ready` run each showed one `build import run ✗`.
  - Mine said "the group moved a tracked path … `system/device-presets.mjs`".
- Cause:
  - Both runs overlapped another `build-checks` process in the same worktree.
  - Groups mutate tracked files temporarily, so two overlapping runs see each other's edits.
- Re-runs:
  - Run alone, it passes. I re-ran once and the agent re-ran 9 times, all green (observed).
- Not a PR defect.

## Validation

| Gate | Result (observed, worktree at e2c4a41) |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 52 groups pass. The first run went red only because `tooling/icons` was not installed in the fresh worktree; `npm ci` fixed it. |
| `node tooling/drift-check.mjs` | ✅ all 15 legs, after `npm ci` in `tooling/style-dictionary` |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ 3 groups, no drift |
| `node tooling/run-316-ready.mjs` | ✅ 12 checks, run alone |
| Portal smoke, private port, killed by PID | ✅ `/api/health` returned `ok:true` with `bootSha` = `headSha` = e2c4a41 |
| CI | `verify` ✅ · `audit` ✅ · CodeQL ✅ · `codeql` job and `visual` job pending when read |
| canvas-journey ×3 and `--live-brilliant` | not re-run. The PR body reports 259/258/258 and 9/0. |

## Numbers pass

| Figure | Source | Status |
|---|---|---|
| 52 groups | my build-checks run | observed |
| 12 checks | my run-316-ready run | observed |
| 15 captures, 17-row README table | `ls` and `grep -c` on the fixture directory | observed |
| 23 tool names | `tools-list.json` `names` | observed |
| `matchCount` 4, 8-child frame not expanded, `depth:0` byte-identical | probe raw 07 and 08 | observed |
| chromium 259/0, firefox 258/0, webkit 258/0 · live 9/0 | the report and PR body | the author's observation; not re-derived here |
| R1–R11 mutation table | the report | the author's observation. I re-derived R9 and R10 by reading the code, and they match. |

The PR body labels its figures `observed` and qualifies the live leg's timing ("ran before the last two small fixes"). That is accurate, and the qualifier is stated.

## What is done well
- The capture set was replaced whole and verbatim from one paired session, rather than patched. The retired tool's real reply is kept as `lookup-retired.json` and is the gate for AC #4.
- `lookup` is refused twice: the client fence denies it before any bytes are sent (43.2), and `parseRead` refuses its redirect if one arrives.
- The fake now answers `lookup` with Brilliant's real redirect, not -32601, so a regression meets what Brilliant actually returns.
- R9 was caught by the author's own mutation run and tightened. The first `films:` assertion could not fail, and the report says so.
- The `lh` regex was rewritten to remove the overlapping quantifiers, not argued safe, and the report says CodeQL was not run locally.

## Recommendation
Approve once F1 is fixed. F1 is a small gate addition plus a re-run of the mutation above. F2–F5 can go in the same push or be deferred. Next: `piv-fix-review-findings` on this file.
