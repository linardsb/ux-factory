# Implementation Report — Run 1's harness (#316, Segment A)

**Plan**: `.claude/plans/faster-payment-build-run-316.md` (T1–T9)   **Branch**: `feature/faster-payment-build-run-316`
(worktree `../wt-316`)   **Base**: b2017a7 → b2017a7 at report (`git fetch` + `git log HEAD..origin/main` empty, so no
merge was needed)   **Commit**: 57b1f7f   **Status**: COMPLETE for Segment A; T10–T18 (WAIT, the owner's sitting,
Segment B) are not this PR's.

This is PR A under the plan's A1. The owner asked for "segment A as its own PR" in the invocation, so A1 is
confirmed. The PR body says `Refs #316`, never `Closes`.

## Summary

Five things were built. `screen.compose` can now declare states beyond the five-state floor, and `missingStates`
requires them. The handoff pack classifies each part as imported, admitted, composed or vocabulary. `verifyBuild`
enforces a trace rule: every agent line must trace to the compose transcript with the params its tool call's args
project to, and a committed turn's stats must name the `sdk` transport or be a crashed turn's. It refuses the `fake`
and `inline` transports and a ledger that disagrees with its transcript; it does not prove provenance, because a
transcript hand-written to match is not detectable (PR #495 review F1, A4). Every fixture and driver now seeds from the six-line spine instead of copying the committed
package whole. `tooling/run-316-ready.mjs` is the pre-sitting gate. The plan's done-condition (T8) was re-run: the
probe's grown package leaves only the intended `fake`-transport reds.

## Tasks completed

- T1 → `system/canvas-ops.mjs` (UPDATE): `states` in PARAMS + OPTIONAL, `STATE_KEY_RE`, compose refusals, state.add
  accepts a declared key on its base, `missingStates` requires declared states, header paragraph.
- T2 → `portal/lib/canvas-session.mjs`, `portal/lib/canvas-transport.mjs` (UPDATE): the state-ask shape check,
  `fileProposal` carries `states`, the tool description, `states: z.array(z.string()).optional()`, observation 7;
  47.2b re-pinned to `f7e7f54e5a5c5809` with the "unprobed by a paid run" provenance in all three prose copies.
- T3 → `agent-layer/gen-build-handoff.mjs`, `portal/public/canvas.mjs` (UPDATE): floor wording in the pack and the
  flow panel; "States declared: …" on the proposal card (`data-compose-states`, textContent).
- T4 → `tooling/build-checks.mjs` (UPDATE): 35.18 (N1–N6 + two controls), 47.18a/b; prose in the group strings and
  `gates.md` (canvas ops, compose session).
- T5 → `agent-layer/gen-build-handoff.mjs` (UPDATE): `partProvenance(doc)`, `partsByProvenance` + per-frame `parts`
  in `lineage.json`, the "Parts by provenance" line in `flow.md`; 49.12; prose.
- T6 → `portal/lib/canvas-store.mjs` (UPDATE): `loadBuild` returns `buildTranscript`, `traceFlaws` (TR1–TR4),
  `verifyBuild` runs it; build-checks `packageFlaws`/`checkPackage` add the turn checks; 36.14; prose.
- T7 → `portal/lib/canvas-store.mjs` `seedSpine` + `SPINE_LENGTH`; every copy site in build-checks (groups 36, 43,
  46, 47, 50), `tooling/canvas-journey.mjs` `seed()`, `tooling/ratify-journey.mjs`, the preflight; 49.11 re-pointed;
  36.3 guard; the null-guards in groups 43 and 50.
- T8 → the grown-package re-probe; result in the plan's NOTES §T8 result; the fixed grower committed as
  `.claude/plans/faster-payment-build-run-316-probe/scratch-grow-t8.mjs.txt`.
- T9 → `tooling/run-316-ready.mjs` (CREATE), its `gates.md` entry, the local CI verify job, the journeys.
- Regenerated: `discovery/faster-payment/build/handoff/{flow.md,lineage.json}`,
  `tooling/fixtures/builds/two-lane/build/handoff/{flow.md,lineage.json}` (`node agent-layer/gen-build-handoff.mjs`).

## Tests added

No test suite exists. build-checks is the gate.
- 35.18: declared states. The control is that a compose with no `states` stores no `states` key. N1 through N6.
- 47.18a and 47.18b: a declared state goes through the real session, via the inline transport.
- 36.14: the trace rule over an in-memory spine plus two agent turns. Two positive controls, then thirteen
  mutations.
- 49.12: `partProvenance` over an in-memory package, total over five junk documents.
- 49.11: now asserts the zero count on the spine's six lines. It also asserts that the committed `flow.md` prints the
  count its own fold derives.

All pass: `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass` (observed at 57b1f7f).

## Proving the checks

Every row was driven by `mutate.py` from the scratchpad: it replaces the text, runs the command, greps, then
restores the file. The first version of that helper **lied**: it captured stdout only, while build-checks prints
its failures to stderr, so every row read "NO HIT". Before trusting any row, I fixed it to merge stderr and
re-proved it with a no-op mutation, which came out green.

| Mutation | Went red (observed) | Positive control |
|---|---|---|
| `missingStates` back to the floor alone | 35.18 N1 "listed [...] — expected close-match" | a compose with no `states` stores no key; `states: []` stores none |
| `state.add` accepts any `STATE_KEY_RE` key | 35.18 N2 ×2 "NO THROW" | close-match accepted on the declaring base |
| `STATE_KEY_RE = /.+/` | 35.18 N3 ×3 (Close_Match, one letter, 25 chars) | — |
| `base.states ? base.states.filter` (unguarded) | 35.18 N4 ×2 "filter is not a function" | — |
| session keeps the floor-only ask check | 47.18a (the state turn never filed) | 47.18b's compose files |
| `fileProposal` drops `states` | 47.18b "want params.states" | — |
| `partProvenance` base-only walk | 49.12 override-added part `null` + lineage + flow | the vocabulary row |
| ratified component renamed in the fixture | 49.12 ×5 → `vocabulary` | — |
| the pr1 `proposal.ratify` deleted from the fixture | 49.12 → `vocabulary` | — |
| `recordId` test swapped for `groupId` | 49.12 imported↔admitted swapped | — |
| a `group.place` removed from the fixture | 49.12 composed rows, def-part row `null` | — |
| committed `lineage.json` hand-edited | 49.2 "differs from renderPack" | — |
| `verifyBuild` never calls `traceFlaws` | 36.14 ×9 "got []" | spine + sdk turn + crashed turn → `[]`; owner-only spine with no transcript → `[]` |
| TR4 disabled | 36.14 "no refused line" | — |
| 36.14's thirteen in-memory mutations (op deleted / duplicated / status / seq→3 ×2 / tool / owner→agent / refused dropped / transcript null / `fake` / `inline` / init dropped / stats dropped) | each names its flaw (all green on the real code; the two code mutations above prove they can fail) | as above |
| ready: prd.md appended, `TOOLS` + `"create"`, `tooling/icons/node_modules` renamed | checks 1, 7, 9 (and 11, from the prd byte change, group 32.6) | clean committed tree: only 2–4 red |
| ready: fence predicate `allow: true` | check 11 "compose session ✗ 10 failure(s)" | — |
| ready: `portal/node_modules` renamed | checks 9 and 10 | — |
| ready: the grown tmpdir worktree | checks 5 (17 lines), 6 (dirty), 12 (a `/private/var` path) | — |
| ready: `ANTHROPIC_API_KEY` exported (this shell, as found) | check 8 | `env -u ANTHROPIC_API_KEY` → green |
| ready: today's tree | checks 2, 3, 4 (#318–#320 absent) | — |

## Validation results

- `node tooling/build-checks.mjs` → `build ✓  all 50 groups pass` (observed, 57b1f7f, icons installed).
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · token-css · … · loc-summary · … · build-handoff · group-count` (observed).
- `node tooling/token-lint.mjs` → `token-lint ✓ 63 contract tokens · 0 undeclared · 0 orphan` (observed).
- `node agent-layer/gen-loc-summary.mjs --check` after staging → `✓ 3 groups — no drift` (observed). The runtime
  figure did not move, so the approach ×3 VR regen did not apply. The runtime count is 33,111 lines against the
  33,150 rounding edge (derived: 33,030 worktree lines + 81 files, the generator's `split("\n").length`).
- `cd portal && node lib/canvas-transport.mjs --preflight` → `preflight ✓ 8/8`. PF1 now reads
  `properties [composition,decisionRefs,screenId,states,why]` (observed).
- Portal smoke: `PORT=4833 node server.mjs`, `/api/health` → `{"ok":true,…,"bootSha":"57b1f7f…"}`. The edited
  `canvas.mjs` is served with `data-compose-states` (observed). The process was killed by its own PID.
- `node tooling/canvas-journey.mjs all` → chromium 188/0 · firefox 187/0 · webkit 187/0 (observed).
- `node tooling/ratify-journey.mjs all` → `✓ 52 assertions — R1–R12 through the page on chromium, then /components#person-row and the canvas on chromium, firefox, webkit` (observed)
- `BASE=http://127.0.0.1:4831 node tooling/studio-journey.mjs all` (serve.mjs on a private 4831, a `curl` of
  `system/canvas-ops.mjs` confirming it served this tree) → chromium 559/0 · firefox 549/0 · webkit 549/0, `studio-journey ✓` (observed; serve killed by its own PID after the run)
- The trace rule and `packageFlaws`' turn checks over the only REAL SDK run on disk,
  `.claude/plans/canvas-compose-loop-312/raw/live-1/` (#312's paid live compose): `traceFlaws(ops, transcript)` → `[]`
  over its 12-line ledger (agent seqs 7, 9, 11), and each of their turns c1, c2 and c4 has a `turn` line, an `init`
  with a string `sessionId` (c2 and c4 were resumed) and `stats.transport` `"sdk"` (observed; the real path stamps it
  at `portal/lib/canvas-transport.mjs:102`). So the gate accepts what a real run writes, not only a hand-stamped copy.
- `env -u ANTHROPIC_API_KEY node tooling/run-316-ready.mjs` on the clean commit → red on checks 2, 3 and 4 only
  (observed), which is the plan's expected state for today.
- T8 (grown copy, dd1b982 = Segment A before T9): see the plan's NOTES §T8 result. With `fake` transport, build-checks
  shows only the four intended `checkPackage` reds, both with the proposal open and after it closed. Stamped `sdk`:
  build-checks 50/50, `canvas-journey chromium` 188/0, `ratify-journey chromium` 44, preflight 8/8 (all observed).

## Not run

- **T10–T18**: the WAIT, the owner's sitting, and Segment B. They are out of scope for PR A (owner's call, A1),
  tracked by #316 staying open.
- **No journey drives the "States declared" line on the proposal card.** The fake agent never declares `states`, and
  no journey asserts the line. It is verified by reading the source and by the portal serving it. The sitting's
  first CoP turn is its first observation (R6).
- **The offer to comment on #318, #319 and #320** ("rebase over PR A; re-pin 47.2b; re-run the ready script") is not
  posted. The plan makes it the owner's yes.
- **`gh pr checks`** runs after the PR opens (`piv-create-pr`).

## Deviations from the plan

- **`partProvenance` lives in `agent-layer/gen-build-handoff.mjs`, beside `compositionCount`, not in
  `system/canvas-ops.mjs`.** The plan put it beside `groupInstances`. Two reasons: the pack generator is its only
  reader (compositionCount is the precedent), and the runtime line count had about 38 lines of rounding headroom left
  after T1 (derived above). Putting it in `canvas-ops.mjs` would have flipped the approach figure, which forces the
  approach ×3 VR baseline regen, for code the page never loads. 49.12 imports it from the generator.
- **An absent `build/transcript.jsonl` is `null`, not `undefined`.** `loadBuild` returns `null` for a missing file,
  and `verifyBuild` flags every agent line when it gets `null`. It skips the rule only when the caller never passed
  the key (`undefined`), the same convention `groups` uses. The plan used `undefined` for both "file absent" and
  "not passed", so a hand-built `{ops, canvas}` carrying agent lines would have gone red. Deleting the transcript
  still cannot hide an agent line: 36.14's "transcript deleted" row is red on it.
- **`run-316-ready.mjs` runs every check and prints every ✗, then exits 1.** `run-1-ready.mjs` throws on the first
  failure, and the plan said to mirror it. Checks 2–4 are red by design until #318–#320 land, so a first-failure gate
  would have left checks 5–12 impossible to drive today.
- **`partProvenance` rows carry `<instanceId>/<partId>` for a copy's parts, and `via.lane` for a lane's `add`
  parts.** The plan named neither. `frameTree` uses the same `<copy>/<part>` naming, so a row points at a part that
  actually renders, and two copies of one group on one frame no longer produce indistinguishable rows.
- **(plan error) T8's worktree under `os.tmpdir()` does not satisfy the fake's cwd guard.** The guard also refuses
  any path inside its own repo, so the scratch tree needed the probe's `PROBE_ALLOW` bypass again. It was applied
  there only and never committed.
- **(plan error) T7's list missed 36.8 and 36.10.** Both took `n0` from the committed ledger while writing to the
  seeded copy. T8 crashed 36.8 (`JSON.parse` of an empty tail). Both now read the seed's own length.
- **(plan error) T2 said the preflight proves the schema lists `states`.** PF1 only checked `required`. PF1 now also
  pins the property list.
- All four plan errors are logged in the plan's AMENDMENTS.
- **This report is named `…-segment-a-report.md`, not `<plan-slug>-report.md`.** The plan's T18 writes
  `.claude/reports/faster-payment-build-run-316-report.md` as the run report in PR B, and this report must not take
  that path.

## Assumptions carried

- A1: two PRs, owner-confirmed by the invocation. A2: `states` optional at the tool. A3: declared states are
  required. A4: "hand-written" provenance is not derivable, and the generator's header says so.
- The spine is the first six lines (`SPINE_LENGTH = 6`), matching group 36's prefix pin.
- `seedSpine` with `{discovery: true}` wherever the old code copied the whole package, so `loadDecisions` answers the
  same way it did. It is used without that option for group 47's and canvas-journey's stand-in shapes.

## Additions beyond the plan

- 36.14. The plan's T6 REDDENS table needed a home that runs in CI; without one the trace rule is vacuous on a
  committed package with no agent line.
- PF1 pins the screen tool's property list, which makes T2's claim about the preflight true.
- A `gates.md` entry for `run-316-ready.mjs`, beside run-1's and run-2's.
- A null-guard on group 43's `ledger()`. The probe's patch had it; the plan listed only group 50's.
- `scratch-grow-t8.mjs.txt`, the fixed grower, so T8 can be reproduced.

## Issues encountered

- The mutation helper's false "NO HIT" (above). It was caught because no mutation went red. It was fixed and
  re-proved before any row counted.
- canvas-journey G2 (`build/groups/g1.json exists`) failed once on the grown copy and passed on the re-run. This is
  a race already in the driver: `waitLines` returns when `ops.jsonl` has the line, but `saveRun` writes
  `groups/g1.json` after that. `fp-groups` is seeded the same as before this change. Not fixed here (out of scope);
  worth a one-line wait in the driver.
- This shell exports `ANTHROPIC_API_KEY`. Ready check 8 reds on it. `subscriptionEnv` strips it from the SDK child
  anyway, but the sitting shell should unset it (`env -u` or a fresh shell).
- canvas-journey's firefox and webkit legs count 187 assertions to chromium's 188. The difference is the
  chromium-only narrow-viewport popover step (`tooling/canvas-journey.mjs:454`), which this change does not touch.
  All three legs had 0 failed.
