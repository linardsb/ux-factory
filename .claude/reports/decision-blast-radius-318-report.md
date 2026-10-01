# Implementation Report — decisions have blast radius: stale frames until the owner re-confirms (#318, D2)

**Plan**: `.claude/plans/decision-blast-radius-318.md`   **Branch**: `feat/decision-blast-radius-318` (worktree `../wt-318`)   **Base**: 694ab91 → 694ab91 at report (`origin/main` re-fetched, unmoved)   **Status**: COMPLETE (AC #2's drawer step not met as worded; follow-up #498)

## Summary
`staleFrames(doc, transcript)` and `reconfirmRefs(frame, rows)` in `system/canvas-ops.mjs` derive which frames pin a
superseded (stale) or unknown (dangling) decision seq. The canvas page shows it on the frame (a dashed chip plus a
keyboard-reachable Re-confirm that emits the existing `ui.frame-link`), on the decision card, in the flow panel's
list and in the inspector's checkbox labels. The handoff pack's `lineage.json` gains `seq`, `stale` and `latest`, and
`flow.md` gains a "Decisions changed since linked" section. No op was added and nothing is stored.

## Tasks completed
- 1.1 `staleFrames` + `reconfirmRefs`, the plan's block verbatim → `system/canvas-ops.mjs` (UPDATE)
- 2.1 `loadDecisions` rows carry `seq` and `supersedes` → `portal/lib/canvas-store.mjs` (UPDATE)
- 3.1 lineage `seq`/`stale`/`latest` + frame `stale` (own or via base), `LINEAGE_DESCRIPTION`, flow.md section → `agent-layer/gen-build-handoff.mjs` (UPDATE); packs regenerated → `discovery/faster-payment/build/handoff/{flow.md,lineage.json}`, `tooling/fixtures/builds/two-lane/build/handoff/{flow.md,lineage.json}`
- 4.1 chip, Re-confirm, `frameSig`, card line, flow list, inspector label, delegated click → `portal/public/canvas.mjs` (UPDATE)
- 4.2 `.cv-chip-stale`, `.cv-reconfirm-btn` → `portal/public/portal.css` (UPDATE)
- 5.1 / 5.2 / 5.3 cases 35.19, 36.15, 49.13 + their `group()` clauses and block-header "cannot reach" lines → `tooling/build-checks.mjs` (UPDATE)
- 6.1 pass B (B1–B7), `seedSupersede`, `fp-stale` seed, header paragraph → `tooling/canvas-journey.mjs` (UPDATE)
- 7.1 loc measured; `system/loc-summary.json` regenerated (see Deviations)
- 8.1 → `.claude/references/gates.md` (groups 35, 36, 49, canvas-journey)
- 8.2 → `discovery/README.md` §Supersede, `docs/epics/canvas-design-import.architecture.md` (D2 as built)
- 9.1 follow-up ticket created on the owner's OK → #498

## Tests added
- **35.19** (group 35, canvas ops): the real discovery applier over faster-payment + two banked answers to seq 7's question (S1 = 31, S2 = 32, derived from `state.ops.length`). Asserts (a) the chain, (b) 7 stale → 32, (c) 32 not flagged (positive control), (d) 31 → head 32, (e) `"99"`, `"1"`, `"07"`, `""`, `7` dangling and kept, (f) cross-reader vs `ledgerView` over a frame pinning every decision, with the vacuity guard read off the fixture, (g) stand-in `[]` and totality over junk and a 2-cycle, (h) `reconfirmRefs` re-pins, dedupes, keeps a dangling ref.
- **36.15** (group 36, build package): every faster-payment row has integer `seq` = id and `supersedes: null`; a temp package's second line reads `supersedes: 1`.
- **49.13** (group 49, build handoff): (a) control on the spine, (b) one real-applier supersede → decision 7 `stale: true, latest: "31"`, f1 and f2 (via) stale, flow.md line, (c) dangling `"99"`, (d) stand-in "Not checked", (e) the committed two-lane pack's "Not checked".
- **canvas-journey pass B** (B1–B7), 21 assertions per engine.

Results: `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass` (observed). Pass B: 63/63 B assertions across chromium, firefox, webkit (observed, `grep -c ' ✓ B'` on the `all` run).

## Proving the checks
All runs observed. Build-checks mutations were applied by a scripted driver and restored after each run.

**The first driver gave a false pass.** It read only stdout, and build-checks prints failures to stderr, so all ten
mutations reported 0 reds. Its `(h)` mutation also left the parentheses unbalanced. The driver was re-proved on one
manual mutation, which reddened 35.19 on stderr. It was then fixed to read both streams, and `(h)` was re-run with
balanced parentheses.

| Mutation | Case that went red (first message) |
|---|---|
| (b) `after.set(...)` → `known.add(d.seq)` (no successor map) | `35.19 a frame pinned to 7 must read stale (latest 32) — got []` (+ middle-of-chain, cross-reader seq 7 and 31) |
| (c) flag every known ref stale | `35.19 control — a frame pinned to the latest (32) was flagged` (+ cross-reader on seqs 3, 4, 6, …) |
| (d) `head(seq)` → `after.get(seq)` | `35.19 a frame pinned to 7 must read stale (latest 32) — got …"latest":"31"` + both `reconfirmRefs` cases. Not the plan's expected `the middle of a chain…` message: pinning 31, the successor IS the head, so (d)'s own assertion cannot redden under this mutation. (b) is what catches it, and the case is kept as the chain-middle positive. |
| (e) `Number(ref)` without the regex | `35.19 "07" must be dangling`, `35.19 7 must be dangling` |
| (e) drop the `op` filter | `35.19 "1" (a file_evidence seq) must be dangling — got []` |
| (f) ignore `supersedes` (mirror rule) | `35.19 cross-reader: seq 7 reads current in staleFrames and latest false in ledgerView` |
| (h) drop the `Set` | `35.19 reconfirmRefs on 7, 8, 32 must answer ["32","8"] — got ["32","8","32"]` |
| 36.15: delete `supersedes` from the row | `36.15 loadDecisions must carry seq and supersedes (null on faster-payment, 1 on the control)` |
| 49.13: skip the via-base step | `49.13 f2 (via f1) must read stale — got false` |
| 49.13: drop the flow.md stale lines | `49.13 flow.md must name decision 7 changed since linked` (+ 49.13 (c)) |
| Journey: `staleOf` returns `[]` (chromium) | `B2 · f1 shows Decision 7 changed since linked — now 31` (+ B3–B5) |
| Journey: re-confirm emits only the head (chromium) | `B3 · ledger line 8 is frame.link {f1, [31, 8, 10]}` — got `["31"]` |
| Journey: stale stored on re-confirm, not derived (chromium) | `B5 · f1 again shows Decision 7 changed since linked — now 31` (only red) |

The third journey mutation was first modelled wrongly. It filtered the rows before computing the refs, which
reddened B3. It was re-modelled to store the flag after the emit, and that reddens B5 alone, as the plan names.

Positive controls: 35.19 (c), 49.13 (a), 36.15's temp package (`supersedes: 1`), journey B1.

## Validation results
- `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass` (observed; baseline before any edit also `all 50 groups pass` after `tooling/icons` + `portal` `npm ci`)
- `node tooling/drift-check.mjs` → `drift-check ✓  syntax · token-css · … · build-handoff · group-count` (observed; first run red on missing `tooling/style-dictionary/node_modules`, green after `npm ci` there)
- `node tooling/token-lint.mjs` → `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed)
- `node agent-layer/gen-build-handoff.mjs --check` → `build handoff ✓  2 packages, 8 files — no drift` (observed)
- `node agent-layer/gen-loc-summary.mjs --check` (after staging) → `loc summary ✓  3 groups — no drift` (observed)
- Loc one-liner after staging → `81 33142` (observed; matches the plan's derived figure)
- `node tooling/canvas-journey.mjs all` → chromium 209/0, firefox 208/1, webkit 208/0 (observed). The firefox failure is `I10 · an unpaired fake bridge … — threw page.goto: NS_BINDING_ABORTED` in the import pass, which this change does not touch. `node tooling/canvas-journey.mjs firefox` was green on two re-runs on the branch (observed). The failure did not reproduce, and it was not run on base.
- Portal smoke on an OS-assigned port: `/api/health` → `ok:true, bootSha = headSha = 694ab91, stale:false`; `/api/canvas/run?provenance=fictional&slug=faster-payment` → 20 decisions, d7 `seq 7 supersedes null`, `count 6` (zero saves on load); the served `canvas.mjs` carries `data-cv-reconfirm` (this tree). Killed by `$!` (observed).

## Not run
- Level 4's in-browser look at the spine (`canvas.html?provenance=fictional&slug=faster-payment`) by eye. This was covered by the API read above and by journey step 2's zero-save assertion. Owner's call.
- CI CodeQL (Level 5): it runs on the PR.
- The paid drawer re-record (the plan's paid table): tracked by #498.

## Deviations from the plan
- **(plan error) 7.1 expected no `loc-summary.json` change.** The runtime group stays at 33,100 (exact count 33,142, as derived). But the generators group (`agent-layer/`) moved 3,400 → 3,500 and the total 41,800 → 41,900, because `gen-build-handoff.mjs` grew. `system/loc-summary.json` was regenerated and staged. `approach.html:291` renders only the runtime group, so no approach VR baseline moves.
- **3.1: `renderFlow`'s transcript is filtered to `type === "op"` lines**, the same input `renderLineage` gives `staleFrames`. The plan said to pass it straight through. Filtering both the same way means `flow.md` and `lineage.json` cannot disagree on a line with `op` but no `type`. On committed data the output is identical (no drift either way, observed).
- **5.1 (d)'s red message.** See Proving the checks: the planned mutation reddens (b)'s and (h)'s messages, not (d)'s.

## Assumptions carried
- A1–A4 as the plan states them: the pin stays a seq string; a state is stale via its base in `lineage.json` only; a link to a superseded seq stays legal; one Re-confirm re-pins every stale ref of a frame in one `frame.link`.
- The re-confirm click listener sits in `registerConsumers`, beside the `ui.frame-link` consumer. The plan offered this or `registerComposeConsumers`.
- Work was done in a worktree, because the primary checkout was on another session's branch (`fix/importer-reads-icon-name-449`).

## Additions beyond the plan
- `reconfirmRefs` also asserted to keep a dangling ref (35.19 (h), second clause). The plan's (h) text names this; it is listed here because it is a separate assertion.

## Issues encountered
- Fresh-worktree installs needed beyond Step 0: `tooling/visual-regression` (journey I12 needs `@playwright/test` for `measure-render`) and `tooling/style-dictionary` (drift-check). Without them I12 had 3 fails and drift-check was red, both for environmental reasons.
- Follow-up ticket for 9.1: #498 (created after the owner chose to ship #318 as is).
