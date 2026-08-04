# Implementation Report — Studio 1: the incremental-run recorder + the replay artifact

**Plan**: `.claude/plans/studio-replay-recorder-203.md`
**Branch**: `feature/studio-replay-recorder-203`
**Status**: COMPLETE

## Summary

A real, fenced, incremental Claude Agent SDK run now becomes a validated, drift-checked replay
artifact. The agent's only build tool is a CLI that applies exactly one op and prints the board
back, so one Bash call is one op is one trace step; a zero-dep generator projects the committed
curated trace into `replay/<slug>.json` and proves the projection by re-applying its own ops and
demanding they rebuild the committed board. **Spike 1 came out clean on the first real run**
(branch A) — the verdict, with every number, is `.claude/reports/spike-1-verdict.md`, and it is
what #202 needs before #209 is planned. No view-time surface ships here.

## Tasks completed

- 1 · the op vocabulary + pure applier → `system/board-ops.mjs` (CREATE)
- 2 · the agent's only build tool → `tooling/board-op.mjs` (CREATE)
- 3 · the canned brief + slug → `replay/briefs/build-fieldwork-dispatch.md` (CREATE)
- 4 · the fenced incremental recorder → `portal/record-build.mjs` (CREATE)
- 5 · the `--dry` smoke test → run; found and fixed one prompt defect (below)
- 6 · **the real run + the decision gate** → `traces/build-fieldwork-dispatch.{raw.,}jsonl` +
      `replay/build-fieldwork-dispatch.board.json` (CREATE) · verdict written
- 7 · the projection generator → `agent-layer/gen-replay.mjs` (CREATE) +
      `replay/build-fieldwork-dispatch.json` (GENERATED)
- 8 · the artifact's contract → `replay/README.md` (CREATE)
- 9 · registration → `agent-layer/build.mjs` (UPDATE)
- 10 · the drift gate → `tooling/drift-check.mjs` (UPDATE — `checkReplay`, after `checkTraces`)
- 11 · group 11 → `tooling/build-checks.mjs` (UPDATE — group + header block + `all 11 groups pass`)
- 12 · the loc cascade → `system/loc-summary.json` (REGENERATED) + the two approach VR baselines (twice — main moved mid-ticket)
- 13 · the architecture map → `CLAUDE.md` (UPDATE)
- 14 · full validation + PR

## Tests added

`tooling/build-checks.mjs` **group 11** — the pure `projectTrace` driven over synthetic in-memory
rows (no committed trace, no SDK, no browser). Seven cases, 22 assertions:

1. happy path — 4 op calls → 4 ops, seq order, right `fromStep`/`phase`/params, `applyOps`
   reproduces the expected board, `assertBoard` accepts it
2. **the corrupted-label mutation** — one command's label corrupted; the reproduce check must go
   red against the correct board. This is the assertion that makes case 1 a projection check
   rather than a tamper check
3. five refusals, each naming its `seq` — unparseable op JSON · an op outside `OPS` · a step with
   no `seq` · zero ops · seqs out of order
4. a `--validate` call and a failed (`ok:false`) call are not ops
5. `atMs` is real pacing — two steps 3 000 ms apart are 3 000 ms apart in the artifact
6. the honest label (`/^Projection of the real run /`) and no trace-owned keys on the artifact
7. **the `KEEP_WHOLE` coupling proven by running `curateTrace`** over an 855-char command in a temp
   dir and asserting it comes back byte-identical — not by grepping for the constant (both it and
   `truncateInput` are module-private)

## Validation results

| Gate | Result |
|---|---|
| `node --check` on all five new/changed `.mjs` | pass |
| `import('./portal/record-build.mjs')` (SDK still lazy) | pass |
| `node agent-layer/gen-replay.mjs` / `--check` | pass — 1 run → 18 ops, no drift |
| `node tooling/validate-trace.mjs` | pass — all traces, new pair included |
| `node tooling/build-checks.mjs` | **all 11 groups pass** |
| build-checks with `portal/node_modules` moved away | **all 11 groups pass** (SDK-free holds) |
| `node tooling/drift-check.mjs` | pass — `… · traces · replay` |
| `node agent-layer/gen-loc-summary.mjs --check` | pass after regen |
| VR baselines | regenerated twice — see "main moved mid-ticket" below |
| CI on PR #224 | `verify` pass · `visual` pass · mergeStateStatus **CLEAN** |

**Every new check was mutated and watched go red, then restored** — four source mutations, each
producing a specific failure message, plus three artifact/board tampers:

| Mutation | Went red as |
|---|---|
| `gen-replay`: stop refusing a step with no `seq` | group 11 case 3 |
| `gen-replay`: project failed (`ok:false`) calls | group 11 case 4 (2 assertions) |
| `gen-replay`: `atMs` from an index instead of `ts − startedAt` | group 11 case 5 (2 assertions) |
| `curate-trace`: drop `command` from `KEEP_WHOLE` | group 11 case 7 — "came back 700 chars" |
| tamper `replay/<slug>.json` | `drift-check` / `--check` red |
| tamper `replay/<slug>.board.json` | reproduce check red, naming `.places[0].label` |
| move the board away (orphaned artifact) | `--check` red via two-directional discovery |

## Deviations from the plan

1. **One shared command parser instead of two.** The plan had the fence doing path matching
   (Task 4) and the projector carrying a separate "precise extractor" (Task 7). They are now one
   exported `parseOpCommand` in `system/board-ops.mjs`, called by both. **Why:** with two parsers
   the run can succeed while producing a command the extractor cannot read — you find out after
   the money is spent. With one, an unparseable command is denied mid-run and the agent corrects
   itself inside the implement phase, so every Bash step that reaches a committed trace is
   provably projectable. It fired for real (the run's third denial). This is strictly less code
   than the plan's two extractors, and group 11's refusal cases stay meaningful because synthetic
   rows can still carry unparseable commands.
2. **`connect` refuses an affordance leading to its own place.** Not in the plan's Task 1 list.
   `system/breadboard.mjs:352` refuses exactly this in the Act 3 UI, and `board-ops.mjs` mirrors
   its verbs; a rule enforced in one of the two would be a rule that drifts. `assertBoard` checks
   the same thing, plus "one connection per affordance".
3. **Ops validate their params exactly, not minimally.** An unknown param key throws. The plan
   required that an op never carry an id for what it creates; rejecting unknown keys is how that
   is enforced rather than merely intended.
4. **The prompt fix after the `--dry` run** (Task 5 → Task 6). The dry run put one step before the
   `[[piv:plan]]` marker because the prompt said "Do not explore or orient first" — a prohibition,
   which the `recorder-run-positive-framing` memory records as the thing that primes exactly that.
   Both prompts were reframed positively; the real run was clean. Documented in the verdict.
5. **Task 6's verdict was written after Task 7, not before it.** The plan sequenced the #202
   comment before Phase 2. Running the generator first is what turns the spike's literal question
   ("steps that project 1:1 into replay ops") from a hand count into a closed claim —
   `ops.length === N_ops === 18` is in the verdict because the generator existed when it was
   written. The epic's actual constraint (the verdict lands before #209 is planned) is unaffected.
6. **`git add` by explicit path, not `git add -A`** in Task 12. The working tree carries two
   untracked plan files belonging to other tickets (#173, #176 — the plan's own NOTES flags them);
   `-A` would have scooped them into this PR. They remain untracked and out of scope.

## main moved mid-ticket (and how it was resolved)

PR #201 (`factory-uplift-173`) merged while this branch was open and touched the same two
generated things: `system/loc-summary.json` (it added `bus-toggles.mjs` and `device-frame.mjs` to
the runtime group) and both approach VR baselines. The PR went `CONFLICTING`.

Resolved by **regeneration, never by picking a side** (memory:
`drift-check-mid-merge-false-positive`):

- `CLAUDE.md` — both sides were additive rows in the same block; all three kept.
- `system/loc-summary.json` — regenerated from the merged index, not hand-resolved. Final:
  **runtime 64 files / 20,400 lines**, total 28,300 (it was 61/19,400 before this ticket, and
  19,700 before the merge).
- the two approach PNGs — regenerated from a clean detached worktree at the merge commit. Both
  times the PNGs had to be **removed first**: `update:docker` rewrites nothing when the only
  change is a few digits, which sits inside the gate's 100-pixel tolerance (memory:
  `vr-update-skips-subperceptual`).
- The two untracked plans this ticket deliberately left alone (#173/#176) turned out to be
  **committed by #201** and byte-identical to the local copies, which is what blocked the merge.
  Verified identical, then removed. They are no longer at risk.

Post-merge, both gates were re-run on the clean tree: `build-checks` all 11 groups, `drift-check`
through `replay`. CI agrees.

## Issues encountered

- **A dropped run leaves `drift-check` red, by design.** `checkTraces` validates `*.raw.jsonl` too,
  so a failed run's raw trace — deliberately left on disk for inspection — turns the repo's gate
  red until it is moved out of `traces/`. The recorder now prints that consequence and the path on
  every drop path. Not hit on this ticket (the run was clean first time), but it is the next
  operator's trap.
- **The `--dry` run cost ~$0.447**, roughly double the plan's $0.10–0.25 estimate; the real run
  cost ~$0.379. Recorded in the verdict for #209's budgeting.
- **Docker was not running** for the baseline regen (colima's VM was up but its daemon
  unreachable); `colima restart` recovered it.
- The plan's Task 7 sketch resolved a `rawPath` it never used; the raw sibling is already checked
  by `validateTrace`'s own pairing rule, so the generator does not open it and says so.

## Notes not in scope, but seen

The plan's NOTES flags two untracked drafted plans that #204 and #219 cite —
`.claude/plans/factory-copy-inspect-panzoom-173.md` and
`.claude/plans/protos-bus-toggles-device-frame-176.md` — as one `git clean` from being lost. They
are still untracked. Committing them is not this ticket's scope and this PR deliberately does not
sweep them in, but they remain at risk.
