# Implementation Report — Session rules: the depth ladder, the facet vector, D5 escalation and the two counters (#285)

**Plan**: `.claude/plans/discovery-session-rules-285.md`   **Branch**: `feat/285-session-rules` (from `origin/main` a8db292)   **Status**: COMPLETE

## Summary

`portal/lib/discovery.mjs` gained its rules layer: four frozen tables (`LADDER`, `ESCALATES`, `DEPTH_PROPOSAL`, `COMPOSES`) plus `NOT_A_FORM_MAX`, and four pure reads (`declareFacets`, `deriveCursor`, `escalationFor`, `runMetrics`). `openSession` records a normalised facet vector and `proposedDepth`, refuses an overflowing vector with the bank's own message, and `branch` no longer exists anywhere in the module, the route, the drawer or the projection. `sessionView` walks `selectDepth(head.depth, head.facets)`, derives the cursor from the LAST closer (a first weak flag on a ladder depth holds the question for one fresh turn; a second closer of any kind settles it; whole-bank never holds), and carries `escalation` and `metrics`. Every committed package reads exactly as it did before.

## Tasks completed

- Task 0 branch → `feat/285-session-rules` cut from `origin/main`
- Task 1 import + tables → `portal/lib/discovery.mjs` (UPDATE)
- Task 2 the four pure reads → `portal/lib/discovery.mjs` (UPDATE)
- Task 3 `openSession`: `facets` in, `branch` out, `proposedDepth` written → `portal/lib/discovery.mjs` (UPDATE)
- Task 4 `sessionView` + `discoveryConfig` (`composes`, `facets`, `presets`, `depthProposals`) → `portal/lib/discovery.mjs` (UPDATE)
- Task 5 the session route forwards `facets` → `portal/server.mjs` (UPDATE)
- Task 6 the drawer: proposal preselected, note states it, `branch` dropped, "asked again", the escalation line → `portal/public/portal.js`, `portal/public/index.html` (UPDATE)
- Task 7 import + case 9 rewritten (the re-ask, whole-bank off the ladder, the moved-past shape, the out-of-list refusal) → `tooling/build-checks.mjs` (UPDATE)
- Task 8 case 11 extended (key set, unfaceted count, `composes` by driving the bank), case 16 rewritten (facet refusals, `declareFacets` acceptance, the write-literal pin, `branch` absent) → `tooling/build-checks.mjs` (UPDATE)
- Task 9 cases 30.27 (the tables), 30.28 (the faceted read side + D5's proposal), 30.29 (the counters at 0/1/2/3/4); summary string rewritten → `tooling/build-checks.mjs` (UPDATE)
- Task 10 group 31: `facets: null` in `PRD_RUN`, 31.12 swapped to `facets`, three label shapes asserted → `tooling/build-checks.mjs` (UPDATE)
- Task 11 `facetsLabel` on the run header; six `prd.md` fixtures regenerated → `discovery/prd-projection.mjs`, `discovery/*/prd.md` (UPDATE)
- Task 12 README: run.json line, the re-ask rule, the counter paragraph, the example, the `depth`/`proposedDepth`/`facets` bullet, the width paragraph, §Workflow → `discovery/README.md` (UPDATE)
- Task 13 `gates.md` groups 30 and 31; the module header → `.claude/references/gates.md`, `portal/lib/discovery.mjs` (UPDATE)

## Tests added

No suite (CLAUDE.md §Testing). Gate cases, all in `tooling/build-checks.mjs`:

- 30.9 rewritten: first weak flag holds (index 0, ask 2, t2); second flag settles; a decision and a parked question each advance one; a weak flag the record moved past reads as settled; past the end; whole-bank never holds; a closer outside the depth's list refused naming the seq and the depth.
- 30.11 extended: eleven config keys; every depth's `count` equals the literal's length; `composes` equals "a declared vector MOVES the list" by driving `selectDepth` both ways; `facets`/`presets`/`depthProposals` served from the one copy.
- 30.16 rewritten: unknown facet, non-boolean facet, non-object vector each refused by the bank's name; overflow refused naming `internal (6)` and `whole-bank`; `{}`/`undefined`/`null` are NO vector; a partial vector normalises to five keys in FACETS order; the consumer preset stays declared; frozen; eight guards before `mkdirSync` with `declareFacets` counted; the `writeRun` literal records `facets: declared` and `proposedDepth`; `\bbranch\b` absent from the module.
- 30.27 new: `LADDER ∪ {whole-bank}` = `DEPTHS`; `DEPTH_PROPOSAL` ↔ `ENTRY_MODES` both ways, every proposal a rung; `ESCALATES` rows pinned to the rung immediately above and to `["scope-check"]` alone; `NOT_A_FORM_MAX === 3`; all four tables frozen.
- 30.28 new: a faceted `run.json` walks the composed 22; absent / `null` read as the unfaceted 30; a vector on scope-check ignored (six); a junk facet in `run.json` throws by the bank's name; one flag → no proposal, ask 2; two flags → proposal naming the question, both turns and seqs, `how` says "new run"; cursor moved on and `run.json` untouched; the other three depths propose nothing; determinism.
- 30.29 new: all zeros and null rates on the empty run; the streak at 1/2/3/4 tripping at 4; `file_evidence` and both off-script ops move nothing; a decision resets and keeps longest; a weak flag resets and counts in the rate (1/7); coverage from the ops diverging from the cursor on a skipped question (8 asked, cursor 9); asked-what-mattered tallying the twelve and the tail with the composed modules (`[]` unfaceted, `["regulated"]` faceted); null on the three other depths; purity.
- 31.12: `facets` in the delete loop; `unfaceted` on the Run line; `facets regulated + orgBuys`; `facets none ticked`; a pre-#285 `branch: null` package reads `unfaceted` and never `branch`.

**Mutation checks (observed, each restored byte-for-byte after):** `asks < 2 → asks < 1` (no hold ever) → `build discovery ✗ 2 failure(s)`; a second `ESCALATES` row → `build discovery ✗ 2 failure(s)`; `facetsLabel` returning `branch none` → `prd projection ✗ 3`, `parenting ✗ 1`, `graded fixture ✗ 2`.

## Validation results

- Level 1: `node --check` on the four files ✓; `grep -rn "\bbranch\b"` over `discovery.mjs`, `server.mjs`, `portal.js`, `prd-projection.mjs` prints nothing (observed).
- Level 2: `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass` (observed). `node tooling/drift-check.mjs` → `drift-check ✓` (observed; left no tracked file dirty).
- Level 3 (observed), every committed package: allergen-matrix-1 30/30 done · bracket-trace-1 and -2 12/12 done · graded-opus-a 65/65 done, weak 14 · graded-think-a 65/65 done, weak 11 · instrument-loans-1 12/12 done · spine-meridian-1 index 3/6 not done, weak 1, no escalation. `ask 1` on all seven. Matches the plan's §NOTES table.
- Level 4 (observed, port 4799): `/api/health` ok; config serves four depths with `composes` true on full-discovery only, `depthProposals {"blank-idea":"full-discovery"}`, five facet ids, four preset ids. A throwaway fictional session with `{ regulated: true }` recorded five booleans, `proposedDepth` and `depth` both `full-discovery`, no `branch` key, `cursor.total` 22, `escalation` null, five metric keys; `run.json` on disk carries `proposedDepth` and `facets` after `depth`, before `reads`. Resume from disk → 22. The overflowing vector → `{ "error": "bank: the facet vector overflows full discovery's 30 — hasModel + regulated fit (29); internal (6) does not; drop a facet or run whole-bank" }` and no `discovery/throwaway-285-over` directory. Throwaway removed; `ls discovery | grep throwaway` prints nothing; port freed by PID.
- Drawer (observed, headless Chromium via Playwright in place of the plan's manual browser step): the depth select opens on `full-discovery`; the note reads "30 questions before any facet vector — a declared vector moves this count (#288) — for a new product. Proposed for a blank idea; Start confirms it."; picking Scope check reads "6 questions — for a feature or change to something that exists. The proposal for a blank idea was full-discovery; you are overriding it."; `#discovery-escalation` is hidden with computed `display: none`; no page errors.
- Level 5 (paid, optional): not run.

## Deviations from the plan

- **Three comments reworded to satisfy the `\bbranch\b` pin and the plan's Level 1 grep**, none of them about the parameter: `discovery.mjs` "IT never reaches the branch" → "the deny path"; `prd-projection.mjs` "renderDecision's … branch is deliberate" → "path"; `portal.js` "THREE branches, not two" → "THREE arms, not two" (case 20's note pin counts `?` and matches `p === 'real'`, both untouched).
- **Group 30 summary string:** beyond the plan's two substitutions, "one closer advancing exactly one" became "a decision and a parked question each advancing exactly one", because a first weak flag no longer advances and the sentence would have been false.
- **Case 16's source-pin message** "re-pin before trusting the six refusals above" → "the refusals above" (the count is no longer six).
- **All six `prd.md` files regenerated**, not three: the diff on allergen-matrix-1, bracket-trace-1 and bracket-trace-2 was exactly the one `**Run**` line each (checked with `--stdout | diff` before any `--force`), which is the case the plan said to regenerate.
- **README counter paragraph** keeps the plan's replacement text and appends the still-true "Group 29 asserts the fields that arithmetic needs are on every record" sentence rather than dropping it.
- **Task 0's validate** expected only the two `docs/epics/` M lines; a third pre-existing modification, `.claude/skills/piv-plan-implementation/SKILL.md`, is also in the tree. None of the three are mine; stage by explicit path at commit.

## Issues encountered

None. The gate went green on the first full run after all phases; the three mutation checks above are what show the new cases can fail.
