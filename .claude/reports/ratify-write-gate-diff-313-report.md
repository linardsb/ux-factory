# Implementation Report — ratify: a proposal becomes a vocabulary member, every gate runs, the diff comes back (#313)

**Plan**: `.claude/plans/ratify-write-gate-diff-313.md`   **Branch**: `feature/ratify-write-gate-diff-313` (worktree `../wt-313`)   **Base**: `3b5a6c7` → `3b5a6c7` at report (`git fetch` then `git log HEAD..origin/main` empty, observed; no merge needed)   **Status**: COMPLETE

## Summary

The import view gains a Ratify form. The owner fills props, states, structure, CSS tokens, containers, prose and a licence, then previews the exact six writes and confirms. `portal/lib/ratify.mjs` refuses a dirty tree and then a stale hash. It writes the spec, CSS block, admitted-registry entry, palette line, wrapper pin and container `children`, spawns the ten-step chain, and on green appends `proposal.ratify` and stamps `elapsed.ratify`. It returns the gates and the diff, and never touches git. Admitted parts are declarative data (`system/templates.admitted.mjs`, committed empty) rendered by one interpreter in the renderer. Group 50 gates the pure half. `tooling/ratify-journey.mjs` runs the real chain in a scratch clone and renders the part on `/components` and the canvas on three engines.

## Tasks completed

- 1.1 → `system/templates.admitted.mjs` (CREATE): `ADMIT_TAGS`, `CHILDREN`, `ADMIT_CLASS_RE`, `checkAdmitted`, the marker-delimited `ADMITTED` (empty).
- 1.2 → `system/agentic-renderer.mjs` (UPDATE): `admittedTemplate`, the spread after `TEMPLATES`, `collisionsOf` / `admittedCollisions`, "twenty-six" reworded.
- 1.3 → `system/canvas-ops.mjs` (UPDATE): verb twelve `proposal.ratify`.
- 1.4 → `portal/lib/canvas-store.mjs` (UPDATE): `foldLedger` refuses an undone ratify.
- 1.5 → `system/palette.mjs` (UPDATE): one name per line.
- 1.6 → `tooling/build-checks.mjs` 21.4 `WRAPPER_PIN` / `WRAPPER_PIN_REASONS` anchors; number copies stripped from `build-checks.mjs:95`, `system/catalog.mjs`, `tooling/catalog-journey.mjs:14`, and `gates.md` (two lines).
- 1.7 → `system/components.css` (UPDATE): the append anchor.
- 1.8 → `agent-layer/gen-loc-summary.mjs` (UPDATE): `worktreeFiles` / `--worktree-files`.
- 1.9 → `tooling/build-checks.mjs` 23.2 (UPDATE): an admitted root class read as data.
- 2.1–2.2 → `portal/lib/ratify.mjs` (CREATE): `checkInput`, `specHead`, `renderSpec`, `renderCssBlock`, the four rewriters, `planRatify`, `ratifyHash`, `CHAIN`, `CLEAN_GUARD`, `spawnStep`, `previewRatify`, `runRatify`.
- 2.3 → `portal/lib/import-run.mjs` (UPDATE): `editMapping` refuses a ratified proposal; `importView` carries `status`, `component`, `ratifyPrefill`.
- 3.1 → `portal/server.mjs` (UPDATE): `POST /api/canvas/ratify/preview` and `/confirm`.
- 3.2 → `portal/public/canvas-ratify.mjs` (CREATE); `canvas-import.mjs`, `canvas.mjs`, `portal.css` (UPDATE).
- 4.1 → `tooling/build-checks.mjs` group 35 (35.1 twelve, `VALID_FOR`, the positive-control setup, `:11654` moved, 35.16).
- 4.2 → `tooling/build-checks.mjs` group 50 (50.1–50.16) and 49.9 (ten routes, preview read-only). The final line now reads `all 50 groups pass`.
- 4.3 → `tooling/ratify-journey.mjs` (CREATE).
- 4.4 → `CLAUDE.md`, `.claude/references/gates.md`, `discovery/README.md`, `docs/epics/canvas-design-import.architecture.md` (addendum 2026-09-30).
- 5.1 → `system/loc-summary.json` regenerated: runtime `files` 80 → 81, `linesApprox` 32600 → 32800 (observed, `git diff`).
- 5.2 → `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`, regenerated from the detached worktree `../wt-313-vr` at `a9e4787`.

## Tests added

- **Group 35.16** (`proposal.ratify`): a Mode 1 ratify runs first as the positive control. Then seven refusals, each matched on the words it names. `exhibitsOf` is unchanged.
- **Group 50** (16 cases): see gates.md § Group 50. Result: `build ✓  all 50 groups pass` (observed).
- **`tooling/ratify-journey.mjs all`**: 44 assertions, `ratify-journey ✓` (observed, 37 s).

## Proving the checks

Each mutation was applied, the named case went red, and the file was restored (restoration verified by `grep -c` or `git diff --quiet`, and by a clean run afterwards).

| Case | Mutation | Red message (observed) | Positive control |
|---|---|---|---|
| 35.1 / 35.2 | Task 1.3 before 4.1 | `not the same eleven verbs`; `no VALID_FOR fixture for "proposal.ratify"`; `OPS includes proposal.ratify` | — |
| 35.16 | `mode === 2` branch → `false` | `35.16 a Mode 2 proposal: … got NO THROW` | Mode 1 ratify accepted first |
| 35.2 | drop the `VALID_FOR` entry | `no VALID_FOR fixture for "proposal.ratify"` | per-verb control |
| 21.4 | `without: 23` → `24` | `the wrapper histogram moved — 3 with / 23 without (pinned 3/24…` | green at 23 |
| 23.2 | admitted clone, registry `class` → `ds-other` | `agentic-renderer.mjs emits no root class "ds-person-row" for "person-row"` (and 50.5) | same clone restored → `all 50 groups pass` |
| 50.1 | add `import … from "./builder.mjs"` | `50.1: … imports [..."./builder.mjs"...]` | real import succeeds |
| 50.2 | add `script` to `ADMIT_TAGS` | `50.2 tag script: … got NO THROW` + the ADMIT_TAGS line | valid def accepted first |
| 50.3 | text slot via `innerHTML` | `rendered {"tag":"SPAN","text":""} with 0 img` | `domStubControl()` |
| 50.4 | `collisionsOf = () => []` | `50.4 collisionsOf named [] — ["list-row"]` | `[]` for no names |
| 50.5 | (vacuous on the empty registry) | fires on a real entry in the admitted clone (row 23.2) | — |
| 50.6 | palette appended, not sorted | `50.6 the palette does not list probe-row once, in sort order…` | deterministic plan |
| 50.7 | `head` dropped from the hash | `50.7 a HEAD change did not change the hash` | identical input → identical hash |
| 50.8 | `CSS_VALUE_RE = /./` | `50.8 a literal colour … got d[1].match is not a function` (red, through a TypeError rather than the named refusal) | — |
| 50.9 | Task 1.4 branch → `false` | `50.9 an undone line restating proposal.ratify folded — got NO THROW` | ratify ledger folds to `ratified` |
| 50.10 | the `editMapping` guard → `false` | `50.10 editMapping on a ratified proposal answered [name,…]` | — |
| 50.11 | swap chain steps 3/4 | `50.11 CHAIN is …` and `pack prefix … drift-check's checkHandoff calls …` | — |
| 50.12 | opt-in ignored (`fromWorktree.has` → `false`) | `… device-presets.mjs: before [], the opt-in naming it [], the index read [] — none, drift, none` | baseline `[]` |
| 50.13 | lock removed from `runRatify` | `50.13a …` (no busy) and `50.13b an import during a ratify answered NO REFUSAL` | green confirm appends the op |
| 50.14 | `PROSE_BAD_RE` never matches | four `50.14 … got NO THROW` | — |
| 50.15 | append instead of sorted insert | `50.15 stack's children … — probe-row once, in sort order…` | — |
| 50.16 | guard narrowed | `50.16 CLEAN_GUARD is […]` | — |

**The driver proved on bad input.** Before its first green run the journey reported red four times, each as `✗ the journey ran to the end`, exit 1, naming the step-10 cause: an unguarded 50.6 read over an admitted tree, then 50.12's index assumption (see Issues). **The real-chain red path, driven by hand** in a kept clone, with `checkInput`'s required-example rule patched off and committed there: `gatesRed true`, steps `gen-handoff:0 gen-vocabulary:1`, ledger unchanged, record byte-identical. Applying the returned revert command left `git status` at 0 lines (observed).

## Validation results

**Re-run at the final HEAD `4649b87`, clean tree** (observed): `build-checks` → `build ✓  all 50 groups pass`; `token-lint` ✓; `drift-check ✓ … group-count` (on the COMMITTED tree); `gen-loc-summary --check`, `gen-system-graph --check` and `regen-expected --check` all ✓ no drift; `ratify-journey all` → `✓ 44 assertions`, cloned from a purely committed tree (0 untracked); `/piv-validate` (the verify trio above, plus a portal smoke on a free port killed by PID) → health `bootSha`/`headSha` `4649b87`, `stale:false`, preview `nope` gives a `no-proposal` refusal, a cross-origin confirm gives 403, `canvas.html` 200. The lines below are the first pass, at `a9e4787` or the staged tree.


- `node --check` on the three new files → ok (observed).
- `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass` (observed, on the staged tree and at `a9e4787`).
- `node tooling/token-lint.mjs` → `✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed).
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · … · group-count` (observed; the first run was red on `gates.md: says 49 groups`, fixed).
- `node agent-layer/gen-loc-summary.mjs --check` → `✓ 3 groups — no drift` (observed, after `git add`).
- `node agent-layer/gen-vocabulary.mjs` after Task 1.2 → `26 components`, `handoff/` unchanged (observed).
- `node tooling/ratify-journey.mjs all` → `ratify-journey ✓  44 assertions` (observed).
- `node tooling/canvas-journey.mjs all` → chromium 173, firefox 172, webkit 172 passed, 0 failed (observed).
- `BASE=<private port> node tooling/catalog-journey.mjs all` → `catalog-journey ✓  all assertions passed on chromium, firefox, webkit` (observed; the served `palette.mjs` was first curl-checked as this tree's).
- Portal smoke on a free port at `a9e4787`: `/api/health` gives `bootSha`/`headSha` `a9e4787…`, `stale:false`. Preview for `nope` answers `{"refused":{"kind":"no-proposal",…"nope"…}}`, preview for `../x` answers `400 name "../x" is not a component name`, and `/canvas-ratify.mjs` answers 200 (observed). Killed by PID.
- `rm approach-{neutral,saulera,verdant}.png && npm run update:docker` from the clean detached worktree `../wt-313-vr` at `a9e4787` → `33 passed (1.0m)`, and `git status` shows exactly the three approach PNGs (observed). The CI `visual` job is the confirmation.

## Not run

- **CodeQL**: leg 1 runs on the PR (`gh pr checks`). The optional local bundle run was skipped. Tracker: the PR's checks.
- **The CI `visual` job** confirming the approach ×3 baselines. Tracker: `gh pr checks` on the PR (compare `headRefOid` to the local HEAD first; a lone approach "two consecutive stable screenshots" failure is the countUp flake).
- **A first real ratify on `main`** and its `/components` ×3 regen are the owner's (plan § Paid and owner-only steps). The follow-up ticket is listed under Deviations.

## Deviations from the plan

- **Chain step 10 carries `--loc-worktree-files`, and 40.8 reads it (plan error).** Without it, an admission whose added lines cross a 100-line rounding boundary reds 40.8, which reads the index. No flag means the index, as before.
- **Group 50's planning fixture admits `probe-row` with relative expectations (plan error).** 50.6, 50.13 and 50.15 as planned used `person-row` and the literal `3/23 → 3/24`. They crash or red once any real admission is committed, and the journey's own step 10 is exactly that case.
- **50.12 mutates `system/device-presets.mjs`, not `palette.mjs` (plan error).** It layers on the same `--loc-worktree-files` list, because the planned form is false inside ratify's chain.
- **`ratifySection(view, { api, reload, provenance, slug, base })`**, not `{ api, showRefusal, reload }`. canvas-import's `showRefusal` routes its action to the import panel, so the ratify module renders its own refusals. All four are logged under the plan's AMENDMENTS.
- **CSS rule values in the form are token names** (`--spacing-sm`, space-separated), with a datalist, instead of a single token select. `readForm` wraps each in `var()`. This keeps a multi-token prefill such as `padding` from being truncated silently.

- **The "first real admission" follow-up ticket was not opened before the PR,** as the plan's § Paid and owner-only steps asks. Opening a GitHub issue is outward-facing, so it is put to the owner.
- **`revertOf` emits allowlisted paths unquoted** (`/^[A-Za-z0-9._/-]+$/`) and lists anything else under a by-hand line, instead of shell-escaping with `.replace`. This follows Task 2.1's no-`.replace`-sanitising rule; 50.13b pins the output.

## Assumptions carried

- A1 `ds-` default prefix; A2 `children: "many"` ⇔ `childrenCardinality: "many"` plus `allowedChildren`; A3 an admission moves only the histogram's `without`.
- Every state needs a non-empty note: the `## States` section renders one line per state.
- `attribution` left blank keeps the record's existing `provenance.attribution`.

## Additions beyond the plan

- **`spawnStep`'s tail keeps every `build X ✗` and `    · ` failure line**, up to 40, ahead of the last 20 lines. Without it, a red `build-checks` step showed only passing group lines, and the owner could not read the cause. This was found while debugging the journey.
- **`ratify-journey` has `RATIFY_JOURNEY_KEEP=1`**, which keeps the scratch clone for a post-mortem. The red-gate case above used it.
- **`gates.md` § build-checks heading 49 → 50.** `drift-check`'s group-count guard required it.

## Issues encountered

- **An unguarded throw in group 50 (`L2[n0].at`, then `regMod.ADMITTED[…]`)** killed the whole process instead of naming a failure. The no-lock mutation and the journey's first runs exposed it; both reads are now guarded.
- **The ratify journey failed at step 10 four times** before the relative-fixture and 50.12 fixes. Each was a real defect in the gate, not in ratify.
- **A consequence to record** (advisor): a ratify over a FICTIONAL package (under `discovery/`) always refuses `dirty` until its import is committed, because D5's guard covers `discovery/`. It is stated in `ratify.mjs`'s header and the architecture addendum.
