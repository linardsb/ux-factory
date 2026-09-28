# PR #478 review — build() reads a required prop's value, and a refused composition names what it built (#477)

**Head** c7babd4 · **Base** main @ `c68a4ff6e550fab0ebd7cdef591bbd72a553d502` · first round (no prior report, guarantees pass skipped) · reviewed in a clean worktree plus the `code-reviewer` agent

## Verdict: approve, with one medium finding to fix or defer by choice

The fix is correct and targeted. `build()`'s closing check (`import/recognise.mjs:635`) now reads the required prop's value, so a layout-less node the owner maps to `stack` returns `null` with its rows instead of `{direction: null}`, which the renderer refuses. `propsFor` only writes non-null values (`recognise.mjs:447`), so `stack.direction`, written directly by `BUILDERS.stack`, is the only required prop that can arrive as null. The value check therefore refuses nothing that was legitimately emitted before. The regenerated fixtures moved no committed file, which confirms this.

## Issues

**F1 (medium) `import/recognise.mjs:641-644` — the rows for lost children do not say which child was lost.** Every row has the slot `${verdict.path}.children` with no index, and every other drop site in `build()` indexes by source child (`.children[${i}]`, lines 601/607/619). With a `list` of three `list-row`s (always refused, since `list.empty` has no slot in any design read), the record gets three identical rows: same kind, slot, value and reason (the code-reviewer agent reproduced this against 40.12's synthetic list). No row is lost and `checkRecord` accepts it, but a reader cannot tell which row went missing. That is weaker than the PR's own promise that the refusal "names what it built".
*Fix, corrected from the agent's suggestion:* indexing `out.children` by position is **wrong**. `out.children` is `kept`, which only holds the children that survived, so its index is not the source index. In the named pair, the kept `stack` and `icon` sit at source positions other than 0 and 1, and `children[0]` is itself a refused not-allowed child. Carry the source path instead: push `cv.path` alongside each kept child (a parallel array in both the container loop and `BUILDERS.list`), then write `slot: path`. Tighten 40.12 or 40.29 to assert the slots are distinct, so the fix can fail.

**F2 (low) `import/recognise.mjs:635` — the value check depends on an unwritten rule.** The check assumes `propsFor` never writes a null value, and that any builder setting a required prop directly (as `stack` does for `direction`) means null to be read as "unfilled". That holds today, but no comment states it, so a future builder that sets a required prop itself could be refused without anyone noticing. Fix: add one line to the `build()` comment.

**F3 (low) `tooling/build-checks.mjs` 43.14** — the real `applyMapping` → `runPipeline` path asserts the `layout` and `stack.direction` rows but not the new child-loss rows. Only 40.29, which copies the mapping, asserts those. The report's M3 mutation (reds only 40.29) confirms it. That is enough coverage for now. It is noted so the gap is on record.

## Numbers pass

| Figure | Where | Provenance | Checked |
|---|---|---|---|
| 144 pairs = 24 nodes × 6 builders | body, report, 40.29 | observed | Reproduced by a separate count script: `pairs: 144`, builders `stack, text, list-row, status-chip, icon, list`. 24 = 144 ÷ 6 (derived) |
| 16 of 144 emitted and refused on the unfixed check, all `stack` on layout-less nodes | body, report M1 | observed | Reproduced by swapping `origin/main`'s `recognise.mjs` into the worktree: `refused: 16`, all 16 `stack layout=false`. File restored, tree clean |
| 4 rows vs 2 rows on the record path | body, report | observed (uncommitted probe) | Not re-run. Consistent with the 40.29 named-pair assertion (2 original rows + `stack` + `icon`) |
| 21 failures under M2 | report | observed | Not re-run. It supports a mutation claim and nothing downstream depends on it |
| `all 46 groups pass` | body | observed | Reproduced (below) |
| `import-run.mjs:179-180` / `:180` line refs | 40.29 comment, `stackShape` comment | — | Correct: 179 is the `BUILDERS` guard, 180 is the `Object.assign` |

No figure is labelled "observed" without a run that produced it.

## Validation (observed, clean worktree at c7babd4, fresh `npm ci` ×4)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | exit 0, `build ✓  all 46 groups pass` |
| `node tooling/drift-check.mjs` | exit 0, every leg ✓ |
| `node agent-layer/gen-loc-summary.mjs --check` | `3 groups — no drift` |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| Portal smoke | not re-run. The PR's `/api/health` run is the author's. No portal file changed |

## What is done well

- The fix goes in the one check every builder passes through, instead of adding a special case to `BUILDERS.stack` or `applyMapping`. The plan records that choice.
- A child built and then lost with its refused parent now leaves a row. Before this PR it left the record without any trace, which broke the `ir.mjs` invariant 4 contract (every loss is recorded). The agent confirmed that no child is reported twice: a child that fails its own check is never added to `kept`.
- The gates were mutation-tested in three directions (unfixed, refuse-all, rows removed). The agent separately confirmed that 40.29 and 43.14 both fail on `origin/main`'s code.

## Recommendation

Mergeable as it stands. F1 is worth fixing in this PR, since it is the PR's own stated guarantee, and the fix is small. F2 and F3 can be deferred.
