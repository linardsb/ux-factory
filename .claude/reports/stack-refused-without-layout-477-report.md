# Implementation Report — a composition missing a required prop is not emitted, `stack` included (#477)

**Plan**: `.claude/plans/stack-refused-without-layout-477.md`   **Branch**: `fix/stack-refused-without-layout-477` (worktree `../wt-477`)   **Base**: `c68a4ff` → `c68a4ff` (origin/main re-fetched before reporting; unmoved, no merge needed)   **Status**: COMPLETE

## Summary
`build()`'s closing check in `import/recognise.mjs` now reads the required prop's VALUE (`out.props?.[p] == null`)
instead of testing the key, so a layout-less node the owner maps to `stack` returns `null` with its rows rather than
a composition the renderer refuses. A refused composition now files one `no-vocabulary-slot` row per child it had
built (slot `<path>.children`, value the child's name). Two build-checks cases hold it: 40.29 (sweep of 144
node × builder pairs, positive control, the issue's named pair) and 43.14 (the real `applyMapping` through
`runPipeline`).

## Tasks completed
- Task 0 setup → worktree `../wt-477` off `origin/main` (primary tree is on another ticket's branch with a sibling's dirty file); `npm ci` in `tooling/icons` and `portal`
- Task 1 case 40.29 → `tooling/build-checks.mjs` (UPDATE)
- Task 2 case 43.14 → `tooling/build-checks.mjs` (UPDATE)
- Task 3 the rule and the rows → `import/recognise.mjs` (UPDATE)
- Task 4 stale comments (`stackShape`, `BUILDERS.list` header, `build()` header) → `import/recognise.mjs` (UPDATE)
- Task 5 gate prose → `.claude/references/gates.md` (group 40 and group 43 paragraphs), `tooling/build-checks.mjs` (group 40 section header, `group("import-chain", …)`, `group("import run", …)`) (UPDATE)
- Task 6 full gate stack → below

## Tests added
- 40.29 — sweep over both committed spike C reads × every `BUILDERS` name (24 nodes × 6 builders = 144 pairs, observed by a one-off count script), positive control, named pair `ir.children[0]` → `stack`.
- 43.14 — `M.runPipeline` with `mapping.parts["ir.children[0]"] = { map: "stack" }` over `spike-c-instance.blueprint.txt`.
Both green after Task 3 (`node tooling/build-checks.mjs` exit 0, observed).

## Proving the checks

| Mutation | Where | Red (observed, `node tooling/build-checks.mjs`) |
|---|---|---|
| M1 unfixed line (cases added before Task 3) | `recognise.mjs` closing check, key test | `40.29: build() emitted 16 mapped composition(s) the renderer refuses …`; `40.29: ir.children[0] (the person row, no layout) mapped to stack built {"children":[…`; `43.14: the owner's map of the layout-less person row to stack gave compositions [{"children":[…` |
| M2 `if (missing.length) {` → `if (true) {` | same | exit 1, 21 failures in three groups (full run, no filter): `import-chain ✗ 14` — the two 40.29 lines (`no laid-out node mapped to stack was emitted (0 emitted in all) …`; the named pair `built null with rows [no-vocabulary-slot:layout, unfillable-required-prop:stack.direction, literal-size:size.w, no-vocabulary-slot:ir.children[0].children[0], no-vocabulary-slot:ir.children[0].children[2]] and took [] …`) plus 12 pre-existing group 40 cases that need something emitted; `import-record ✗ 4` (42.11 ×2, 42.14 ×2); `import run ✗ 3` (43.7 ×3, starting `remapping the root to stack gave undefined (was null)`) |
| M3 `for (const kid of out.children ?? [])` → `for (const kid of [])` | row loop | only `40.29: ir.children[0] (the person row, no layout) mapped to stack built null with rows [no-vocabulary-slot:layout, unfillable-required-prop:stack.direction, literal-size:size.w, …` |

Positive controls: 40.29's laid-out-`stack`-emits assertion (reds on M2); the fixed tree (exit 0). File restored from a
copy after each mutation; `git diff --stat` afterwards showed only the intended changes.

## Validation results
- `node --check import/recognise.mjs && node --check tooling/build-checks.mjs` — clean (observed)
- `node tooling/build-checks.mjs` — exit 0, `build ✓  all 46 groups pass`; `import-chain`, `import-record`, `import run`, `import suggest` each ✓ (observed; baseline on unmodified `c68a4ff` also exit 0)
- Task 3 repro via `runPipeline` — `[null]`, rows `no-vocabulary-slot layout`, `unfillable-required-prop stack.direction`, `no-vocabulary-slot ir.children[0].children stack`, `… icon` (observed)
- `node import/regen-expected.mjs && node tooling/regen-import-records.mjs && git status --short` — only the three edited files plus the plan (observed): AC 8, no committed output moved
- `node agent-layer/gen-loc-summary.mjs --check` — `loc summary ✓  3 groups — no drift` (observed)
- `node tooling/drift-check.mjs` — exit 0, all legs ✓ (observed, after `npm ci` in `tooling/style-dictionary`; the first run failed on the missing dependency, a setup gap in the fresh worktree)
- `node tooling/token-lint.mjs` — `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed)
- Portal smoke — `PORT=0 node server.mjs`, port 57800 read from `lsof` on the PID, `/api/health` → `{"ok":true,…,"stale":false}`, killed by PID (observed)

### Record-path probe (beyond the gates)
43.14 stops at `runPipeline`. The owner's real path continues through `editMapping` → the writer → `checkRecord` →
`projectRecord`, and no committed record carries the new `<path>.children` rows. A one-off probe (scratchpad
`probe477.mjs`, not committed) copies `discovery/faster-payment` to a temp dir, `runImport`s the spike C blueprint as
a drop, then `editMapping({ path: "ir.children[0]", map: "stack" })`, and reads the written record back:

- Fixed tree (observed): 4 rows — `no-vocabulary-slot layout`, `unfillable-required-prop stack.direction`,
  `no-vocabulary-slot ir.children[0].children stack`, `… icon`, all class `read-but-never-emitted`; `checkRecord` ok;
  the markdown carries `stack.direction` and both "… was built and is not emitted" reasons.
- Probe proven on the unfixed `recognise.mjs` (`git show HEAD:…`, observed): 2 rows, both reason strings `false`.
  A first version checked the markdown for `ir.children[0].children`, which also matched deeper paths on the unfixed
  tree; it was replaced by the reason text before the figures above were taken.

## Not run
- Level 4's optional manual walk in the import view (map the person row to `stack` in the browser) — owner's call; the same path is driven by 43.14 (`runPipeline`) and, through the writer, by the record-path probe above. `drift-check` re-runs after `piv-commit`, since its loc-summary leg reads tracked content only.
- CodeQL and the visual-regression job — CI-only; no shipped page changed.

## Deviations from the plan
- Task 0 `(plan error)`: the plan installs only `tooling/icons` deps; `drift-check` also needs
  `tooling/style-dictionary` and the smoke needs `portal`. Amendment logged in the plan (2026-09-28).
- Task 0: worked in a worktree (`../wt-477`) instead of `git switch -c` in the primary tree, which was on `fix/importer-reads-icon-name-449` with another session's dirty file. The skill's shared-tree rule.

## Assumptions carried
- The plan's two stated assumptions: R1's rows are authorised behaviour; no up-front refusal in `applyMapping`.
- Group 40's section header comment does not enumerate cases, so only its "cannot reach … group 3" clause was edited (Task 5 said "if it enumerates cases").

## Additions beyond the plan
- `npm ci` in `portal` and `tooling/style-dictionary` (see the plan-error deviation).
- The record-path probe above — to cover the path 43.14 does not reach; not committed as a gate case.
- Copied the plan's `.html` companion into the branch beside the `.md` (main tracks 21 `.html` plans).

## Issues encountered
- `drift-check`'s first run failed on the missing `tooling/style-dictionary` dependencies (setup, logged as a plan error).
