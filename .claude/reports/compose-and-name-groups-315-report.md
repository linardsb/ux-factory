# Implementation Report — compose-and-name: `group.define` / `group.place`, per-copy overrides, Promote (#315)

**Plan**: `.claude/plans/compose-and-name-groups-315.md`   **Branch**: `feature/compose-and-name-groups-315` (worktree `../wt-315`)
**Base**: `b99d9ac` (origin/main at start) → `b99d9ac` at report (`git fetch`; main did not move, no merge needed)   **Status**: COMPLETE, one owner step open (the container-admission ticket, below)

## Summary

The build grammar gains its last two verbs. The count is final at fourteen. `group.define` derives a named definition from parts selected on a screen. `group.place` puts a copy into a base frame, or replaces one copy's `{set, hide}` overrides. `frameTree` expands each copy before any layer runs, with ids namespaced `<copy>/<part>`, so the renderer never sees a `group` node. `groups/<id>.json` is written by `saveRun` as a projection of the ledger and checked by `verifyBuild`. Promote (`portal/lib/promote.mjs`, deterministic, no model) turns a group into a proposal. Ratify admits that proposal with provenance "composed in run X from group gN", and `flow.md` prints the composition-over-admission count. F10 (PR #485) is fixed.

## Tasks completed

- 1.1 + 1.2 → `system/canvas-ops.mjs` (UPDATE). Two verbs, `component.propose {groupId}`, `GROUP_OVERRIDE_KEYS`, `PART_SEP`, `groupInstances`, `expandGroups` inside `frameTree`, and header paragraphs. Started from the probe's `phase1.patch.txt`, then read against D1–D6. Two changes from the patch: the new functions sit above `frameTree`'s header comment rather than splitting it, and the roster comment is rewritten.
- 2.1 → `portal/lib/canvas-store.mjs` (UPDATE). Adds `GROUPS_DIR` and `groupFiles`. `loadBuild` now returns `groups` and `run`. `saveRun` writes and removes group files. `verifyBuild` compares the group files, and F10 is fixed. Header comments updated.
- 2.2 → `portal/lib/canvas-session.mjs` (UPDATE). `idProblem` refuses `/` in an id.
- 3.1 → `portal/lib/import-run.mjs` (UPDATE). `ratifyPrefill(name, decls, vocab)` is exported, and the import path's bytes are unchanged.
- 3.2 → `portal/lib/promote.mjs` (CREATE). Exports `draftFromGroup`, `promoteName`, `promoteGroup` and `promoteView`.
- 3.3 → `system/templates.admitted.mjs` (`PROVENANCE_FROM`) and `portal/lib/ratify.mjs` (UPDATE). Adds `importOrigin`/`groupOrigin` and a private `originOf`. The five sites branch on `origin.kind`. The green branch returns before the record re-stamp for a group.
- 3.4 → `portal/server.mjs` (UPDATE). Adds `POST /api/canvas/promote` (with `withPack`) and `GET /api/canvas/promote/view`.
- 4.1 → `portal/public/canvas-groups.mjs` (CREATE). Also updated: `canvas.mjs` (the fieldsets, two bus consumers, `describeOp`, `mountPromoted` at boot), `canvas.html` (`[data-groups-panel]`), `canvas-ratify.mjs:185` (`view.mode ??`) and `portal.css` (`.cv-groups`).
- 5.1 → `agent-layer/gen-build-handoff.mjs` (UPDATE). `compositionCount` is added and `flow.md` gets `## Composition over admission`. Both committed `flow.md` files were regenerated.
- 6.1 → `tooling/build-checks.mjs` group 35: 35.1 now pins fourteen verbs, `VALID_FOR` gains two entries, the positive-control setup adds `f3` and `g1`, and 35.17a–j is new.
- 6.2 → group 36: 36.13. 6.3 → group 49: 49.9 now finds eleven routes, and 49.11 is new. 6.4 → group 50: 50.2 gains three mutations plus a group positive control, and 50.17–50.19 are new. Group 47: the slash case.
- 6.5 → `tooling/canvas-journey.mjs`: `seed()` gains fp-groups, plus `seedGroups()`, `groupsPass` G1–G8 and a header paragraph.
- 6.6 → `tooling/ratify-journey.mjs`: `groupAdmission()` runs after the render proof, and the header is updated.
- 7.1 → `.claude/references/gates.md` (groups 35, 36, 47, 49 and 50) and the `group()` strings of the same five groups.
- 7.2 → the architecture addendum plus a pointer at the op list, `discovery/README.md`, and the `canvas-ops.mjs` header.
- 7.3 → `system/loc-summary.json`: runtime 32,800 → 33,100 and grand total 41,500 → 41,700 (observed, after staging).
- 7.4 → `tooling/visual-regression/baselines/approach-{neutral,saulera,verdant}.png`, regenerated with `update:docker` from a clean detached worktree at `d035423`. The other 30 snapshots matched.

## Tests added

All cases are in build-checks (`node tooling/build-checks.mjs` → `build ✓  all 50 groups pass`, observed):

- **35.17a–j** cover:
  - define → g1, placed twice → g1-1 and g1-2;
  - a redefine that both copies follow;
  - one copy's override;
  - the redefine blocker, with its control;
  - 22 refusals by name;
  - flags, including states and arrows that address a copy's part;
  - the real `validateComposition`, including a list-row copy placed in a stack;
  - #475's frozen-original refusal on both verbs, with a Mode 1 control;
  - `component.propose {groupId}` with 5 refusals;
  - reads that are total over junk, and purity.
- **36.13** covers the `groups/` projection, a hand-edited file, an orphan, a missing file, an `{ops, canvas}`-only caller, AC #4's exact changed-file list and git status, the undo that removes the file, and F10 (one control and two positives).
- **47.10** covers a slash in an id on the agent path.
- **49.9** finds eleven routes. **49.11** checks `compositionCount` exactly, the `flow.md` lines, and the committed zero.
- **50.2** adds three origin mutations plus a group positive control.
- **50.17** pins `promote.mjs`'s specifiers and checks it is SDK-free.
- **50.18** covers the exact file list, `source.json` byte-equal to `groups/g1.json`, the drafted-by lines, the propose line, `already-promoted`, `no-group`, `busy`, `card` → `card-2`, `promoteView`, and AC #4.
- **50.19** covers D8's Usage line verbatim, the CSS header, the provenance passing `checkAdmitted`, the pin reason, and that the hash moves when the group changes.

Journeys:

- `canvas-journey` G1–G8, through the real portal and page on three engines.
- `ratify-journey`'s group admission: `journey-header` is promoted through the route, then previewed and confirmed. All 10 chain steps exit 0, D8's Usage line appears verbatim, the registry provenance is `from: "group"`, and no import record changed.

## Proving the checks

Every row below was observed: the mutation was applied, the gate was run, and the file was restored. The driver scripts are in the session scratchpad and are not committed. After every row, `build-checks` was green again.

| # | Mutation | Case that went red (first message) | Positive control |
|---|---|---|---|
| M1 | `OPS` back to twelve | 90 failures; 35.1 "…are not the same fourteen verbs" | 35.2's loop: every verb's minimal op accepted |
| M2 | D4 step 3 (namespacing) removed | 8 failures, including "35.17a f2's tree does not hold the expanded copy g1-1/header" | 35.17a on the unmutated applier |
| M3 | redefine blocker disabled | 1 failure: "35.17d redefining g1 without header while g1-2 overrides it: NO THROW" | 35.17d control: the same redefine with no override is accepted |
| M4 | `refuseFrozen` removed from `group.define` | 1 failure: "35.17h group.define over a frozen original: NO THROW" | 35.17h: a Mode 1 name is accepted |
| M5 | D4 step 2 (`resolve`) dropped | 4 failures across 35.17c and f, including "a dangling copy override was not flagged with its copy: []" | 35.17c: f2 still reads Home |
| M6 | `idProblem` slash check removed | 1 failure: "47.10: an id with a slash gave 1 ops lines … refusal undefined" | 47.10: the root-only composition is filed |
| M7 | `saveRun`'s `rmSync` of underived files removed | 1 failure: "36.13 after undoing the define, groups/g1.json is STILL there" | 36.13: the define writes g1.json and verifies clean |
| M8 | F10 reverted to the old regex | 1 failure: "36.13 F10 control — a state override on a part called x was named as a position" | 36.13: a top-level `x` and a `params.y` are still named |
| M9 | an unratified proposal counted as admitted | 2 failures: "49.11 compositionCount is {…total:3…}" | 49.11's exact expected object |
| M10 | `## Composition over admission` dropped from `renderFlow` | 4 failures: 49.2 on both committed `flow.md` files, and 49.11 | 49.2 on the regenerated packs |
| M11 | promote also writes `mapping.json` | 1 failure: "50.18 the proposal dir holds [block.css, mapping.json, …]" | 50.18's exact list |
| M12 | D8's `provenanceLine` branch reverted | 2 failures: "50.19 … imported from an unknown tool …" | 50.6's import-path bytes are unchanged |
| M13 | `checkAdmitted` back to import-only | 11 failures, the first "50.2 positive control (#315) — a def admitted from group g1 was refused" | 50.2's import def is accepted |
| M14 | promote route without `withPack(` | 1 failure: "49.9 ["/api/canvas/promote"] write into a build package without withPack(" | 49.9 finds all eleven routes |
| M15 | promote's already-promoted check removed | 2 failures: "50.18 a second promote of g1 answered {}" (the applier then throws after the files are written) | 50.18's first promote |
| J1 | `saveRun`'s groups write removed | canvas-journey chromium: G2 "build/groups/g1.json exists" red, plus G5 and G6 | G1–G8 green on three engines |
| J2 | promote skips `source.json` | canvas-journey chromium: G5 red. The route answered 500 because `promoteView` throws on the missing file, and G8 caught the console 500. It reds through the throw, not through the deep-equal line. | G5 green unmutated |
| R1 | D8's `renderSpec` branch reverted | ratify-journey chromium red, but EARLIER than planned: chain step 10 (build-checks in the clone) runs 50.19, so person-row's own confirm reds before the group section is reached. The group section's Usage assertion is therefore shadowed by 50.19 and was not seen to fire on its own. It is kept because it is the only assertion that reads the spec a real chain wrote. | ratify-journey 52/52 unmutated |

**Driver proof.** The mutation drivers report failures by parsing build-checks' own `    · ` lines and the journeys' `✗` lines. Each driver was seen to report a failure on every mutated tree, and none on the restored tree.

**Ratify byte-identity (Task 3.3).** The probe's `digest.mjs.txt` was run with `ORIG=1` in a detached worktree at `origin/main` and again on this branch. The plan hash was `3f0e4a12…` on both sides, and the diff of the two outputs was empty: the six write shas, the def and the pin were identical (observed). The hash differs from the probe's `66eaf7e1…` because the HEAD differs. Identity between the two runs is the claim.

## Validation results

- `node -e '…OPS.length, PARAMS…'` → `14 14` (observed; `12 12` before).
- `node -e '…promote.mjs exports…'` → `draftFromGroup promoteGroup promoteName promoteView` (observed).
- `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass` (observed, on the committed tree `d035423`).
- `node tooling/drift-check.mjs` → `✓` on all 15 legs (observed, after staging).
- `node tooling/token-lint.mjs` → `63 contract tokens · 0 undeclared · 0 orphan` (observed).
- `node agent-layer/gen-build-handoff.mjs --check` → drift on both packs before regeneration, then `2 packages, 8 files — no drift` after (observed).
- `node agent-layer/gen-loc-summary.mjs --check` after staging → `no drift` (observed).
- `node --check` on every touched `.mjs` → silent (observed).
- Portal smoke on port 4931, killed by its own PID (observed):
  - `/api/health` → `ok`, `headSha` equal to this worktree's HEAD, `stale:false`;
  - `GET /api/canvas/promote/view` for an absent name → a named error;
  - `POST /api/canvas/promote` with a stale base → 409, and nothing written.
- `node tooling/canvas-journey.mjs all` (observed):
  - chromium 188/0 and firefox 187/0, measured on the tree before the docs edits (the code was unchanged apart from comments);
  - webkit 186/1 in that run. The one failure was the leg's own `git status -- discovery/` guard, which caught my `discovery/README.md` edit made during the run;
  - re-run on the committed tree: webkit 187/0.
- `node tooling/ratify-journey.mjs all` → `ratify-journey ✓  52 assertions`, including the group admission's 10/10 chain steps (observed).
- `update:docker` → 33 passed. `git status` in that worktree listed exactly the three approach PNGs (observed).

## Not run

- **CI `visual` and CodeQL** — these run on the PR, not locally. Tracker: the PR's checks.
- **Level 4 manual click-through in `npm start`.** The canvas-journey groups pass drives the same page and routes on three engines, but no human clicked it. Tracker: owner's call.
- **Paid table row 2, the container-admission ticket** — not opened. The plan requires the owner to approve the issue text first. A draft is below; tracker: owner's call.

## Deviations from the plan

1. **(plan error)** The plan asks for the draft's "first line" on each of the three files, but `template.txt` is JSON, so its first line is `{`. 50.18 asserts the parsed `note` for that file instead. Logged in the plan's AMENDMENTS.
2. **(plan error)** canvas-journey step 14 (from #306) counted every inspector checkbox on the stand-in. G2's group checkboxes appear on every frame, so the count now excludes `[data-group-part]`. Logged in AMENDMENTS.
3. **(plan error)** Task 6.6 admits `app-header` in the ratify journey, but that would red chain step 10 in the clone, because 50.18 and 50.19 use `app-header` as a fixture name and guard that it is not in the vocabulary. The journey admits `journey-header` instead. D8's strings are asserted with that name substituted. Logged in AMENDMENTS.
4. The probe patch's `frameTree` placement split `frameTree`'s header comment from the function. The two new functions were moved above the comment.
5. The group early-return in `runRatify`'s green branch sits directly after `appended = true`, before the unused `proposedAt` and `ms` lines, rather than after them as in the probe patch.
6. G8 measures five controls: the part-checkbox label, Save group, Place copy, Promote, and Set on this copy.

## Assumptions carried

- A1–A5 are honoured as stated in the plan. A definition is not converted in place, re-capture is the only edit path, `provenance.record` holds `g1`, the proposal name is the group's name with a collision suffix, and a promoted group stays a group.
- The plan's `promote.mjs` import list named `sortKeys` and `isProposalName`; neither was needed. 50.17 pins the imports as built: canvas-store, import-run and env.

## Additions beyond the plan

- `portal.css` gains a `.cv-groups` block (the rail panel), cloned from `.cv-compose`. Without it the panel had no styling.
- `groupAdmission()` in ratify-journey commits the person-row admission inside the clone first. Without that commit the clean-tree guard refuses the second ratify.

## Issues encountered

- **Environment:** the fresh worktree needed `npm ci` in `portal/`, `tooling/icons`, `tooling/style-dictionary` and `tooling/visual-regression`. canvas-journey's I12 failed until `tooling/visual-regression` was installed. This was environment, not code.

### Draft: the container-admission ticket (for the owner's approval; not opened)

Title: `import: an admitted container with a text slot outscores the matcher's stack fallback (groups 40/43/46)`

Body: When a new vocabulary component with `children: "many"` and a text slot is admitted (for example, a promoted `app-header` group; proven in #315's probe), it becomes a scored candidate for the committed "Text block" fixture in `import/recognise.mjs`. Ratify's chain step 10 then fails 37 checks across three groups:

- group 40 reads `app-header` via scored where the `stack` structural fallback is expected;
- group 43.16's replays build nothing;
- group 46's committed Jev requests no longer match `questionsFor`.

The cause is the matcher, not the admission's origin, so any admission of that shape triggers it. There are two minimum fixes: a rule that an admitted container never outscores the structural fallback, or groups 40 and 46 reading the vocabulary instead of literal pins. Re-recording group 46's Jev pins is a paid run. Evidence: `.claude/plans/compose-and-name-groups-315-probe/ratify-promote-results.md` §4b.
