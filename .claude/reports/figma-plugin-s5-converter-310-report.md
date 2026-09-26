# Implementation Report — S5 + the Figma house plugin + `import/figma.mjs` (#310)

**Plan**: `.claude/plans/figma-plugin-s5-converter-310.md`   **Branch**: `feat/figma-plugin-s5-310` (worktree `../wt-310`)
**Base**: `dbe582b` → `81fb555` (origin/main unchanged at `dbe582b` when re-fetched before this report; `git merge origin/main` → "Already up to date")
**Status**: COMPLETE — S5 branch 1

## Summary
Three commits, in the order the ticket requires.
- **`0307940`** (before the owner's run): the house plugin, runbook § C, the `GROUPS` export, and gate cases 40.25/40.26.
- **`b9a2ed8`**: the owner ran the plugin in Figma desktop. The export and census are committed verbatim. The decision table read **branch 1**, and the verdict is posted on #295.
- **`81fb555`**: `import/figma.mjs` converts the export into the same IR `recognise` reads. The export is also a byte-identical fixture with a generated verdict, and group 40 grows 40.19–40.24.

## Tasks completed
- Task 0: worktree `../wt-310` from `origin/main` `dbe582b`
- A1–A3, A2b → `tooling/figma/plugin/{manifest.json,code.js,ui.html}` (CREATE)
- A4 → `docs/figma-runbook.md` (UPDATE, additions only)
- A5: the owner's run (Build S5 fixture → Export selection → Download to `~/Downloads`, copied and `cmp`'d)
- A6 → `.claude/plans/canvas-spike-s5/raw/{spike-list-row.export.json,census.txt}` (CREATE, verbatim)
- A7 → `.claude/plans/canvas-spike-s5/README.md` (CREATE) and the #295 comment https://github.com/linardsb/ux-factory/issues/295#issuecomment-5845492097
- B1 → `import/brilliant.mjs` (`export const sizeDrops`, same line)
- B2 → `import/ir.mjs` (`hidden-layer` → read-then-dropped)
- B3 → `agent-layer/gen-loc-summary.mjs` (`export const GROUPS`, same line)
- B4 + B5 → `import/figma.mjs` (CREATE; F1–F11 and O4 in the header)
- B6 → `import/fixtures/figma/spike-list-row.{export,expected}.json` (CREATE); `import/regen-expected.mjs` (UPDATE, a frozen `FIXTURES` list)
- C1 → `tooling/build-checks.mjs`: 40.19–40.26, 40.7 names `figma.mjs`, 40.9 freezes the four figma tables, 40.25's control reaches the figma fixture
- D1 → `CLAUDE.md` (the `import/` map, `fixtures/figma/`, the `tooling/figma/plugin/` line, the spec bullet, the fixture rule)
- D2 → gates.md, the group string and the group header: the Figma chain sentence, the two cannot-reach clauses (a newer Figma; a real designer's binding), and the "bound on every layout slot" phrase rewritten
- D3 → the PR body (next step: `piv-create-pr`)

## Tests added
| Case | What it drives |
|---|---|
| 40.19 | S5's export through figma → ir → recognise, twice from busted instances, against the committed verdict. Provenance is pinned: `tool` figma, 0 unresolved, `bound` false, 8 ids. Six nodes are asserted by path. |
| 40.20 | Eight refusals by name: two committed token files, the Brilliant blueprint, REST, foreign format, version 2, empty selection, a non-string. The positive control runs first. |
| 40.21 | `code.js` in `node:vm` against a fake `figma` with no write methods. The format tie, the set name and `mixed` → `"mixed"` are asserted. The builder failing at `variables` is the positive control. |
| 40.22 | SYNTHETIC: a variant instance gets `component.name` from the set, plus a name-match on that field. |
| 40.23 | SYNTHETIC F3, both ways: an unbound zero pad or gap is absent; `[0,8,0,8]` keeps four sides; a bound `spacing/none` gives `no-token`; main-axis MIN, CENTER and SPACE_BETWEEN. |
| 40.24 | SYNTHETIC O4: row, column, scatter, a single child, a declared layout kept, and an inferred row → `stack` fallback. |
| 40.25 | Every tracked `import/fixtures/` file is `.txt/.json/.png/.md/.css`. |
| 40.26 | No tracked path under `import/` or `tooling/figma/plugin/` is in a loc-summary group. |

## Proving the checks
| Case | Mutation | Observed failure line (abridged) |
|---|---|---|
| 40.19 | `refOf`: `split("/").join(".")` → `join("-")` | `40.19: the committed Figma verdict and the run disagree — …spike-list-row.expected.json is stale…` |
| 40.20 | the token-export branch disabled (`&& false`) | `40.20: the committed …scales-dtcg.json was not refused naming "token export" — got: … "format" is undefined…` (and tokens-studio) |
| 40.21 | `code.js` `FORMAT` → `"ux-factory/figma-export-v0"` | `40.21: the plugin writes format "ux-factory/figma-export-v0" and import/figma.mjs reads "ux-factory/figma-export" …` |
| 40.22 | `component.name` from `main.name` only | `40.22: SYNTHETIC: a variant instance converted to component {"name":"state=active",…}` + the name-match line |
| 40.23 | the unbound all-zero check removed | `40.23: SYNTHETIC: an unbound all-zero pad and gap read pad [{"value":0,"ref":null},…] …` |
| 40.24 | `INFER_TOLERANCE` 5 → 0 | `40.24: SYNTHETIC: three children on one row (y within 3px) inferred null …` (+ column, + fallback) |
| 40.25 | `touch import/fixtures/figma/x.mjs && git add -N` | `40.25: import/fixtures/figma/x.mjs is not a data fixture (.mjs) …` |
| 40.26 | `factoryPaths.push("system/figma-plugin.js")` | `40.26: system/figma-plugin.js matches the loc-summary group(s) runtime …` |
| 40.26 vacuity | `git rm --cached tooling/figma/plugin/code.js` | `40.26: tooling/figma/plugin/code.js is not in the index (saw 27 paths) …` |

Each mutation was applied alone and reverted, and `git diff --quiet` was clean after each (observed). The plan's own
40.19 mutation (`ALIGN_OF.CENTER → "start"`) reddened **40.23**, not 40.19. That is logged as a plan error below.

## Validation results (all observed, on `81fb555`, which is the merged tree)
- `node tooling/build-checks.mjs` → `build ✓  all 42 groups pass`
- `node import/regen-expected.mjs --check` → two ✓ lines: Brilliant `57579 bytes` (unchanged from before the refactor), Figma `55853 bytes`
- `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · … · group-count`
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`
- `node --check` over `import/figma.mjs`, `tooling/figma/plugin/code.js` and `import/regen-expected.mjs` → ok
- runbook additions-only → `0` removed lines; `cmp` raw export vs fixture → identical
- D2 VALIDATE `git grep "40.19\|house plugin"` over gates.md + build-checks → 12 lines. D1 VALIDATE → 4 lines. "bound on every layout slot" → only in historical plan files.
- The census: `nodes 8 | auto-layout nodes 3`; `aliases 29 | resolved to a name 29` (`census.txt:1,3`)

## Not run
- CodeQL: runs on the PR only.
- Copy in the plugin window: Download worked, so Copy was never exercised (README Q5).
- Build's closing message was not reported by the owner. The census shows all 23 recipe bindings present (derived), so the README records it as not reported.

## Deviations from the plan
- **Task 0**: a worktree instead of `git switch -c` in the shared primary tree.
- **40.25 walks `git ls-files`**, not a recursive `readdirSync`, which returns directory entries (plan error, AMENDMENTS).
- **Gate prose for 40.25/40.26 landed in commit 1** rather than waiting for D2. The 40.8 comment and "module-private regexes" were corrected because B3 made them false (plan error).
- **40.19's mutation is the ref separator**, because the plan's `ALIGN_OF` mutation reddens 40.23 and not 40.19 (plan error, observed).
- **The builder records each failed binding and keeps going** rather than stopping at the first throw. The census catches any binding that did not take.
- **The owner saved to `~/Downloads`**, and I copied the file into `raw/` and checked it with `cmp`. The plan's step 4 named the destination path directly, but `.claude/` is hidden in the save dialog.
- **An icon never carries a layout.** Its size stays on `style.size`, where R4 reads the glyph box. The plan's F4 did not say what happens when an icon wrapper has auto-layout.
- **F4 icon detection uses leaf descendants** (containers of glyph paths count), not "every descendant", because a Phosphor glyph can nest a group.
- **O4 applies F3 to an inferred gap**: a zero median gives no gap, not `tok(0, null)`.

## Assumptions carried
- Q1 (F3) shipped as written, with no owner objection. Q2: the icon name is the layer name, read verbatim.
- `code.js` stays at ES2017 with no top-level `await`. The Figma sandbox accepted it (observed: the owner's run).
- `bound` is expected false on branch 1 (R5). The branch is decided by `unresolved === 0`.

## Additions beyond the plan
- `dump()` records a throwing property getter as `{unreadable}`. The UI names the download after the selection.
- `readExport` also refuses an export whose `variables` is not an object. The plugin always writes one, so a missing map means a malformed file.
- The README carries a geometry check (chevron 8.73 × 16) and a cross-source table (Brilliant vs Figma, node by node).

## Issues encountered
- A fresh worktree needs `npm ci` in `tooling/icons` (group 41) and `tooling/style-dictionary` (drift-check).
- The name `figIr` already exists in 40.6's scope. The new cases use `s5`-prefixed names.

## Findings for the owner
- **The Figma root reads `list`, not `list-row`.** Figma's root is auto-layout, so `list` adds `kind-fit` on the layout to its name match (0.7 against 0.575). Brilliant's root line has no `al()`. This is recorded, and no weight moved. Whether an auto-layout row component should read as a list is the owner's read (README § Cross-source).
- **Paint bindings appear twice**, at the node level and the paint level, with one id. Text bindings are one-entry arrays. The converter reads the node level first.
