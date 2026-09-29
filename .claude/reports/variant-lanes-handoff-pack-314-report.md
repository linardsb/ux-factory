# Implementation Report — variants as lanes, the per-lane check, and the build package's handoff pack (#314)

**Plan**: `.claude/plans/variant-lanes-handoff-pack-314.md`   **Branch**: `feat/variant-lanes-handoff-pack-314` (worktree `../wt-314`)   **Base**: a0c03f0 → a0c03f0 (`git fetch` at report time: origin/main unmoved, so no merge)   **Status**: COMPLETE (follow-up #490 opened on the owner's approval, 2026-09-30)

## Summary

A variant is now a lane. The canvas page drafts a lane, keeps it as ONE `variant.add`, and switches the frames, the completeness check and the state diagram through one code path in `system/canvas-ops.mjs`. A lane can leave a frame out (`omit: true`). A new generator, `agent-layer/gen-build-handoff.mjs`, writes `<pkg>/build/handoff/` (flow.md, drops.md, refusals.md, lineage.json, imports/<id>.md). Every canvas write route regenerates the pack. build-checks group 49 and a new `build-handoff` drift leg gate it. The proof patch landed as written. This session added the gates, pass L, the fixture README and the docs.

## Tasks completed

- Task 0 — proof patch applied with `git apply --index` on a0c03f0 (`--check` clean). This completes 1.1–1.4, 2.1, 3.1 (code), 3.2, the store half of 4.2, 5.1–5.3 and 7.1 → `system/canvas-ops.mjs`, `agent-layer/gen-build-handoff.mjs` (CREATE), `portal/lib/canvas-store.mjs`, `portal/server.mjs`, `portal/public/canvas.{html,mjs}`, `portal/public/portal.css`, the two-lane fixture, both generated packs, `system/loc-summary.json`, three approach baselines.
- 3.1 README → `tooling/fixtures/builds/two-lane/README.md` (CREATE). The recipe was re-run into scratch and gave `ops.jsonl` and `canvas.json` byte-identical to the committed ones (`cmp`, observed).
- 4.1 → `tooling/build-checks.mjs` 35.15 plus group 35's string (UPDATE).
- 4.2 → build-checks 36.12 plus group 36's string (UPDATE).
- 4.3 → build-checks group 49 "build handoff", 49.1–49.9, and `all 49 groups pass` (UPDATE).
- 4.4 → `tooling/drift-check.mjs` `checkBuildHandoff` (UPDATE).
- 5.4 → `tooling/canvas-journey.mjs` pass L (L1–L9), the `fp-lanes` seed, header, summary line, and step 15 measuring the lane select, New lane and Write handoff pack (UPDATE).
- 6.1 → `discovery/README.md`, `.claude/references/gates.md`, `CLAUDE.md` (both 48 → 49), and a one-line comment in `system/canvas-ops.mjs` (net line count 0, `loc-summary --check` ✓) (UPDATE). The generator header's CANNOT REACH clause was widened so that all three copies (header, `group()` string, gates.md) say the same thing.
- 7.2, 7.3 run (below). 7.4 → #490, text approved by the owner before posting.

## Tests added

- **35.15**: four named refusals plus two accepted positive controls; `LANE_OVERRIDE_KEYS` and `BASE_LANE`; `laneKeys` over 5 junk inputs; `laneDoc` (a base omitted with its state and both arrows, an unknown lane, no mutation); `frameTree` layer order; `missingStates` per lane on the committed fixture; `stateDiagram` exact spine text, lane b, `a:b;c#d` → `abcd`; every lane read total over junk.
- **36.12**: `laneFlaws` with a hand-built positive control; `[]` on the fixture; `verifyBuild` `[]`; `evidenceRefs` d7 `[]`, d3 `[1, 2]`.
- **Group 49**: 49.1 import graph; 49.2 committed bytes both directions, both packages by name; 49.3 AC #1; 49.4 lineage (chain, relinked `["3","99"]`, no transcript); 49.5 drops ("No imports", spike-c 13 + 8 rows, `- none`, md byte-equal); 49.6 refusals (four kinds, empty package `- none` ×3); 49.7 determinism and no `Date`; 49.8 check-mode drift `[]`; 49.9 write-route pin (8 POST routes found by name).
- **Pass L**: 23 checks per engine.

## Proving the checks

Each mutation was applied, run and then reverted with `git checkout`; a clean `git status` was confirmed after each one (observed).

| Check | Mutation | What went red (observed) | Positive control |
|---|---|---|---|
| 35.15 refusals | delete the omit-with-other-keys throw | `35.15 omit with set: … — got NO THROW` | `{omit: true}` alone and `{set, hide, add}` accepted |
| 35.15 layer order | move `laneOv(base.id)` after `state.overrides` | `lane b's f2 reads {"hint":"x","label":"Check the name"}` and `two-lane's f3 in lane b reads "Check the name"` | lane A's f1 reads "Continue" |
| 35.15 per-lane check | `missingStates` ignores the lane (the old `variantKey` filter's effect) | `lane b of two-lane is missing undefined`, plus 49.2, 49.3 and 49.8 | lane A `["empty","partial"]` |
| 36.12 laneFlaws | `laneFlaws` returns `[]` | `36.12 laneFlaws … answered []` | hand-built `f9` doc |
| 36.12 evidenceRefs | `evidenceRefs: []` | `d7 [], d3 [] — expected [] and [1, 2]` | d3's `[1, 2]` |
| 4.2 tripwire (scratch demo) | `frame.remove`'s `lanes = []`, then fold compose → variant.add b{f1} → frame.remove f1 through `verifyBuild` | `["lane \"b\" overrides \"f1\", which the ops do not create"]` | — |
| 49.2 | append `x` to the spine's `flow.md` | `49.2 … flow.md differs from renderPack` and 49.8 | the committed packs pass |
| 49.5 | skip `drops.md` when there are no imports | 49.2 orphans (both packs), 49.5 and 49.8 | spike-c record renders |
| 49.4 | lineage drops `unresolved-decision` rows | `an unresolvable ref "99" must keep its row … got "NO ROW"` | decision 3 resolves 1 and 2 |
| 49.2 by name | `rm -rf tooling/fixtures/builds/two-lane` | `49.2 committedPackages() found ["faster-payment"]`, 49.3, 36.12 and 35.15 (9 failures) | — |
| 49.9 | `withPack(root, editMapping(` → `(editMapping(` | `49.9 ["/api/canvas/import/mapping"] write … without withPack(` | all 8 POST routes found |
| drift leg | append `x` to the spine's `flow.md` | `drift ✗  build-handoff drift: discovery/faster-payment/build/handoff/flow.md` | clean tree ✓ |
| drift leg (orphan) | `touch …/handoff/stray.md` | `drift ✗  build-handoff drift: …/stray.md (orphan)` | — |
| pass L | `renderFlow` passes `null` instead of `lane` | `✗ L4 · the flow panel has no f2 line` and `✗ L6 · lane b: the flow panel lacks f1 --> f2 …` (chromium 171/2) | L passes on the unmutated page |
| 49.6 | `renderRefusals` renders the Imports section empty | `49.6 a refusal is missing from its section` | the four-kind package |
| 49.1 | add `import "../system/device-presets.mjs";` to the generator | `49.1 gen-build-handoff.mjs imports [… "../system/device-presets.mjs"]` | the unmutated graph |
| 49.7 | the word `Date` in a generator comment | `49.7 gen-build-handoff.mjs names Date` | — |
| 49.4 prefix pin | an owner `frame.link f1 ["8"]` saved onto the committed spine (the pre-fix gate vs the fixed one) | pre-fix: 4 × 49.4; fixed: ✓ | — |

## Validation results

All observed in `../wt-314`:

- `node --check` on each of the 7 touched `.mjs` files → no output.
- `node tooling/build-checks.mjs` → `build ✓  all 49 groups pass` (final run, after docs).
- `node tooling/drift-check.mjs` → `drift-check ✓ … · replay · build-handoff · group-count`.
- `node agent-layer/gen-build-handoff.mjs --check` → `build handoff  ✓  2 packages, 8 files — no drift`.
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`.
- `git add … && node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`, after every `system/`/`agent-layer/` edit of this session.
- `node tooling/canvas-journey.mjs all` at the squashed commit 1dbc078 (the driver asserted bootSha = HEAD 1dbc078), after the 49.4–49.7 prefix fix and the docs → `chromium: 173 passed, 0 failed · firefox: 172 passed, 0 failed · webkit: 172 passed, 0 failed`. Pass L: 69 ✓ lines = 23 × 3 engines (derived from `grep -cE "^  ✓ L[1-9]"`).
- Run 1 of the same command: firefox `171 passed, 1 failed` at I12 (see Issues). Base a0c03f0 firefox in a detached worktree → `149 passed, 0 failed`.
- Portal smoke (Task 5.1's command, run after committing): `/api/health` `ok:true` with bootSha = HEAD. `POST /api/canvas/pack` → `{"files":["build/handoff/flow.md","build/handoff/drops.md","build/handoff/refusals.md","build/handoff/lineage.json"]}`. Evil origin → `403`. `git status --porcelain -- discovery/` empty (the pack was rewritten byte-identical). Own PID killed.
- Mermaid (Task 7.3; mermaid 11.17.2 and jsdom 29.1.1 in scratch, never committed):
  ```
  control refused ✓
  faster-payment/build/handoff/flow.md 0 parsed
  two-lane/build/handoff/flow.md 0 parsed
  two-lane/build/handoff/flow.md 1 parsed
  ```
  Exit 0.
- Task 1.1, 1.4 and 3.1 VALIDATE commands → four `refused:` lines then `1`; the spine's diagram exactly as the plan states; two-lane `verifyBuild` `[]`.

## Not run

- **`/piv-validate` as a skill invocation.** Its content (the CI `verify` job's build-checks, drift-check and token-lint, plus a portal smoke on a private port) was run as the individual commands above. Tracker: none.
- **Level 4 manual page walk-through, including Discard.** Pass L drives draft, keep, switch, pack and undo on three engines. Discard lane is not driven by the journey or by hand. Tracker: owner's call.
- **`update:docker` / VR.** Not re-run: the proof patch carries the regenerated approach baselines, and this session left the runtime line count unchanged (`loc-summary --check` ✓). CI's `visual` job is the check.

## Deviations from the plan

- **35.15's spine diagram and 49.4–49.7 read the spine's frozen first six lines, not its whole ledger (plan error).** As the plan wrote them (Task 4.1 "the spine's lane-A text"; Task 4.3's 49.4 and 49.5 over the spine), these checks pinned the spine's CONTENT. The owner may append to the spine through `canvas.html`, and group 36 (36.10) and the plan's own D3 promise that an owner edit stays green. They now fold `ops.slice(0, 6)` with no imports and no build transcript, as group 36 does for D7. 49.2 still compares the whole committed pack byte for byte, and `withPack` keeps that current. Positive control (observed): `saveRun` a `frame.link f1 ["8"]` onto the committed spine, then `writeBuildHandoff` → the pre-fix build-checks (HEAD's, run from a temp copy) `build ✗  4 failure(s)`, all 49.4; the fixed one `build ✓  all 49 groups pass`; then `git checkout -- discovery/faster-payment`.
- **Task 5.4's step-15 sweep.** The plan says step 15 includes "the inspector's lane buttons". Those buttons exist only during a draft, which step 15 has none of. So Set in lane, Leave out of lane, Keep and Discard are measured at 44×44 inside L3, and step 15 measures the lane select, New lane and Write handoff pack.
- **L7 is stronger than the prototype's.** It removes `build/handoff/` before pressing the button, so the button is shown to write the file rather than finding the one L5's save left behind. The cross-origin POST is also checked to write nothing.

## Assumptions carried

- A1–A4 as the plan states: sibling generator; the pack lives at `<pkg>/build/handoff/`; lane A is `null`, labelled `A (base)`; lane edits touch string `label/content/hint/placeholder` only.
- The work was done in a worktree (`../wt-314`) because the shared checkout was on another branch with a dirty tracked file.
- **The proof patch is not committed.** It is 1.75 MB, mostly binary PNG diffs, and its content IS the commit. The plan `.md` and the three `.txt` prototypes are committed. Committing the `.patch` is the owner's call.

## Additions beyond the plan

- **35.15 checks two-lane's f3.** In lane b the loading state keeps "Checking the name…", which is the plan's fixture GOTCHA, now asserted.
- **I12 in `canvas-journey.mjs` rounds `boundingBox` to 0.01 px** (see Issues). It is outside pass L but was turned red by this ticket's layout.
- **A one-line comment in `canvas-ops.mjs`** names the lane reads under "A READ IS NOT A VERB" (Task 6.1's "the pure reads section comment names the lane reads"). It replaces an empty `//` line, so the line count is unchanged.

## Issues encountered

- **I12 on firefox, a regression caused by the ticket.** The Measure fidelity button read `1374×43.999969482421875`. It reproduced on a second run, and base a0c03f0 passes. A diagnostic showed computed height `44px`, client-rect height 44, `offsetHeight` 44 and top 471.1. The button is still 44 px tall; Playwright's box arithmetic loses precision at a fractional y. Rounding to 0.01 px fixed it, and all three engines passed after. Logged under the plan's AMENDMENTS.
- **The first cut of 36.12 used `ROOT`, which group 36 shadows** (it resolved inside `discovery/faster-payment/build/`). Switched to `ROOT_DIR`; caught by its own red run.
