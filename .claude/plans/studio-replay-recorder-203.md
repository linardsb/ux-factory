# Feature: Studio 1 — the incremental-run recorder + the replay artifact (folds spike 1)

The following plan should be complete, but it is important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

**Read `## OPEN QUESTIONS / ASSUMPTIONS` and `## NOTES` before Task 1 — Phase 1 is a spike with a
decision gate, and two of the three branches change what Phases 2–4 look like.**

## Feature Description

A real, fenced, incremental Claude Agent SDK run becomes a validated, drift-checked **replay artifact**.

Today the repo can record an agent run that produces *one file in one Write* (`portal/record-composition.mjs`).
The studio (epic #202) needs something different: a run whose **steps are the build ops** — the agent
assembles a Shape Up breadboard one place, one affordance, one connection at a time, each as its own
PIV-marked tool call. A build-time generator then projects the validated raw+curated trace pair into a
small committed `replay/<slug>.json` — ordered ops `{op, atMs, phase, params, fromStep}` plus meta naming
the source trace pair, its `sessionId`, and the load-bearing honest label *"Projection of the real run
`<slug>`"*.

The artifact **is not a trace and may never read as a recording it isn't.** The trace pair is committed
alongside under the standard labels and linked from the artifact's meta; the artifact is a projection of it.

This ticket ships the recorder, the generator, the op vocabulary both share, one real run, the CI drift
check, and the checks that can fail. It ships **no view-time surface** — #209 is the replay driver.

## User Story

As **the studio's replay layer**
I want **a committed, drift-checked projection of a real incremental agent run**
So that **the canvas can play a genuine "brief in, board out" build at the run's real pacing, with every
op traceable to a real step, and no live model call at view time.**

## Problem Statement

The studio's centrepiece claim is that a *replayed real agent run* assembles the product on the canvas.
Two things stand between the repo and that claim:

1. **No recorder produces incremental build ops.** `record-composition.mjs` records a run whose implement
   phase is one `Write` of one JSON file. Projected into ops, that is a single op — a cut, not a build.
2. **No artifact format exists** for "the ops a driver plays," and inventing one by *deriving* ops from
   `draftBoard`'s committed rules would produce a plausible animation of something no agent did. The
   honesty contract forbids presenting that as a run.

Spike 1 is the open question underneath both: **does a fenced agent reliably build a board through
separate, PIV-marked tool calls whose steps project 1:1 into replay ops?** It is on the critical path —
its answer sets the data model *and* the honesty label that #209 inherits.

## Solution Statement

Four committed pieces plus one real run:

1. **`system/board-ops.mjs`** — the op vocabulary and a pure applier (`applyOp`, `applyOps`) over the
   breadboard model that `system/breadboard.mjs` already owns, reusing its exported `MAX_PLACES` /
   `MAX_AFFORDANCES` / `LABEL_MAX` caps. One definition of "what a build op is," shared by the recorder's
   CLI, the generator's reproduce check, and (later) #209's driver.
2. **`tooling/board-op.mjs`** — a thin CLI over it. **This is the agent's only build tool.** One invocation
   applies exactly one op to a board-state JSON file and prints the resulting board (ids included) — so
   the agent's next op can reference real machine-assigned ids. One Bash call = one op = one trace step.
3. **`portal/record-build.mjs`** — the fenced recorder, sibling of `record-composition.mjs`: same
   `recordRun` + `curateTrace` + `validateTrace` pipeline, same `--dry` / real split, same "one outcome
   shape" return, a tightened fence (Read → the brief only; Bash → `node tooling/board-op.mjs …` only;
   Write/Edit → denied outright), and a build-specific PIV system prompt.
4. **`agent-layer/gen-replay.mjs`** — the zero-dep generator: for each committed board file, validate its
   trace pair, project the curated trace's implement-phase op calls into ordered ops, and emit
   `replay/<slug>.json`. `--check` mode for `tooling/drift-check.mjs`, registered in `agent-layer/build.mjs`.

Plus **`tooling/build-checks.mjs` group 11**, which drives the generator's *pure* projection function over
synthetic in-memory rows and proves — by mutation — that it refuses what it claims to refuse.

## Out of Scope / Non-Goals

- **No view-time surface.** No replay driver, no canvas, no `agent.*` bus wiring, no page changes. That is
  #209 (and it waits on this ticket's spike verdict, per the epic).
- **No `narrate` / `refusal` op kinds.** The artifact carries board ops only. #209 can read the curated
  trace directly for text and denial steps — it is committed, public, and linked from the artifact's meta.
  Deciding that shape here would make #209 inherit a speculative call in the very ticket the epic says
  must report *before* #209 is planned. Recorded in Open Questions instead.
- **No changes to `system/breadboard.mjs`.** `board-ops.mjs` imports its caps and matches its model; the
  Act 3 UI is untouched.
- **No changes to the trace format, `curate-trace.mjs`, or `validate-trace.mjs`.** A build run is an
  ordinary trace; if it needs a format change, that is a finding to raise, not a silent edit.
- **No shipped-page changes ⇒ no VR baseline churn from markup.** (Baselines *do* churn if `loc-summary`'s
  runtime number moves — see the cascade in Task 12.)
- **No `param-manifest.json` entry.** Nothing here is a live-manipulable control on a shipped page. Do not
  add one; `gen-param-count` is untouched.
- **No second brief, no batch of runs.** One canned brief, recorded for real, once.
- **Not deciding the grid arrangement, screen typing, or codec v2** — #204 / #208 / #212 own those.

## Feature Metadata

**Feature Type**: New Capability (+ a critical-path spike)
**Estimated Complexity**: High — the spike's outcome branches the design, and the honesty contract makes
the failure mode "ship something that reads as a recording it isn't."
**Primary Systems Affected**: `portal/` (recorder, Agent SDK side) · `agent-layer/` (generator) ·
`system/` (op vocabulary) · `tooling/` (op CLI, drift-check, build-checks) · `traces/` · new `replay/`
**Dependencies**: `@anthropic-ai/claude-agent-sdk` (already `portal/`'s sole dep — recorder side only).
Zero new deps anywhere else.

## Related Work

**Implements**: [#203](https://github.com/linardsb/ux-factory/issues/203) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) →
[`docs/epics/prototype-studio.architecture.md`](../../docs/epics/prototype-studio.architecture.md)
(§Recommended approach · §Data model → *Replay artifact* + *Recorder contract* · §Spikes 1) and
[`docs/epics/prototype-studio.prd.md`](../../docs/epics/prototype-studio.prd.md) (§7 · §Non-goals).

**Back-references** (decisions inherited, not re-opened):

- `.claude/plans/trace-recorder-player.md` — the Trace format, the record→curate→validate pipeline, and
  the PIV marker contract this run obeys unchanged.
- `.claude/plans/build-questions-breadboard.md` — the board model (`places` / `affordances` /
  `connections`) and its caps; `board-ops.mjs` mirrors it rather than re-deciding it.
- Epic #202's "Every ticket carries" preamble — the loc-summary / baseline / `Closes #N` / plan-report-review
  cascades, assumed below rather than re-argued.

**Forward-references**:

- **#209** (the replay driver) — consumes `replay/<slug>.json` and **waits on this ticket's spike verdict**,
  which the epic requires as a comment on #202 before #209 is planned.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `portal/record-composition.mjs` (all 499 lines) — **the template for the recorder.** Read in full. The
  pieces being adapted: the lazy `recordRun` import (lines 36–45, 360–362) that keeps the SDK out of the
  module graph until a run starts; `makeFence` (232–256); `PIV_COMPOSE_SYSTEM` (111–162); `buildTask`
  (171–200); `refsFor`'s absolute-for-dry / relative-for-real split (205–226); `summarize` (271–289) and
  why it returns rather than sets `process.exitCode`; the `outcome` shape (343–350); the real-run
  ship-gate order at 438–472 (validate artifact → curate → `validateTrace` → drop-on-failure); the CLI
  guard (483–499).
- `portal/lib/trace-recorder.mjs` (lines 63–140 especially) — `recordRun`'s signature, the `toolStep`
  shape written to disk (`seq`, `ts`, `phase`, `kind`, `tool`, `input`, `ok`, `response`), the
  `PIV_MARKER` scan, and the `fenceHook` that makes `canUseTool` fail-closed. **The generator reads
  exactly this shape.**
- `tooling/curate-trace.mjs` (all 86) — **critical:** `KEEP_WHOLE = new Set(['file_path', 'command'])`
  at line 17 is the single reason projecting from the *curated* trace works. `truncateInput` clips every
  other string value at 700 chars; `command` is exempt.
- `tooling/validate-trace.mjs` (all 112) — the ship-gate. Note lines 43–52 (curated must share its raw
  sibling's `sessionId`), 66–67 (null phase fails), 74–81 (the Write/Edit artifact-pairing branch — which
  a Bash-only run never enters), 87–88 (all four phases, in order).
- `traces/README.md` (all 147) — the format contract and the honesty rules. `replay/README.md` is written
  in its image.
- `system/breadboard.mjs` — lines 1–47 (the model's derivation from Singer's definitions, and
  `MAX_PLACES` / `MAX_AFFORDANCES` / `LABEL_MAX`), 107–153 (`draftBoard` and `isBoard`), 226–300 (the
  add/remove/rename/connect verbs the ops mirror, including the cap announcements), 168–175 (`nextId`).
  **Do not modify this file.**
- `agent-layer/gen-loc-summary.mjs` (all 79) — **the `gen-*` template**: `genX({ check })` returning
  `{ drifted }`, a missing file counting as drift via `catch { prior = "" }` (line 62), paths resolved
  from the module not cwd, the `pathToFileURL` standalone guard (69–79) and why the naive `file://` compare
  fails on this repo's spaced path.
- `tooling/drift-check.mjs` (lines 60–67, 145–160) — the `check<Thing>` wrapper shape and the ordered
  call list + summary string the new step joins.
- `tooling/build-checks.mjs` — lines 43–61 (the import block), `group(name, detail)` at 74, any one group
  body for the `ok(...)` idiom, and 1250–1256 (**the `all 10 groups pass` literal must become `11`**).
- `.github/workflows/verify.yml` — the `verify` job. No edit is needed (drift-check and build-checks are
  already steps), but read the ⚠ block before the Build checks step: **never add `npm ci` for `portal/`**.
- `agent-layer/build.mjs` (all 56) — import + call + `✓` log line registration.
- `scenarios/index.json` — the three existing scenarios (`verdant` · `fieldwork` · `northwind`); the brief
  is written *about* one of them, not read from it.

### New Files to Create

- `system/board-ops.mjs` (~130) — the op vocabulary + pure `applyOp` / `applyOps` over the board model.
- `tooling/board-op.mjs` (~70) — the CLI the fenced agent calls; one invocation = one op.
- `portal/record-build.mjs` (~420) — the fenced incremental recorder (Agent SDK side).
- `agent-layer/gen-replay.mjs` (~230) — the projection generator, `--check` mode, pure `projectTrace`.
- `replay/README.md` (~70) — the artifact's contract and its honesty label, in `traces/README.md`'s image.
- `replay/briefs/<slug>.md` (~25) — the one canned brief. **Human-authored input**, not agent output.
- `replay/<slug>.board.json` — the run's real output (board state), committed.
- `replay/<slug>.json` — GENERATED, committed, drift-checked.
- `traces/<slug>.raw.jsonl` + `traces/<slug>.jsonl` — the real run, committed as a pair.
- `.claude/reports/<...>.md` — the implementation report **including the spike verdict** (epic rule).

### Files to Update

- `agent-layer/build.mjs` — register `genReplay`.
- `tooling/drift-check.mjs` — `checkReplay()` + the ordered call + the summary string.
- `tooling/build-checks.mjs` — group 11 + the `all 11 groups pass` literal.
- `CLAUDE.md` — architecture-map rows for the four new modules and the `replay/` tree.
- `system/loc-summary.json` + possibly the two approach baselines (see Task 12's cascade).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Claude Agent SDK — `query()` options](https://docs.claude.com/en/api/agent-sdk/typescript#query)
  — `canUseTool`, `allowedTools`, `hooks`, `maxTurns`, `cwd`. Why: the recorder's fence and turn budget.
  **In practice `portal/lib/trace-recorder.mjs` already wraps every option this ticket needs — prefer
  reading that file over the docs, and change none of its behaviour.**
- [Shape Up ch. 4 — Breadboarding](https://basecamp.com/shapeup/1.3-chapter-04) — places / affordances /
  connections. Why: the recorder's system prompt states these definitions as *rules*, and getting them
  wrong is an honesty bug on a page whose subject is working from the method faithfully
  (`system/breadboard.mjs:6–18` makes exactly this argument).

### Patterns to Follow

**File headers** — every feature/entry-point file opens with a header citing its governing doc:

```js
// agent-layer/gen-replay.mjs — the replay artifact: a real incremental build run, projected
// (epic #202, ticket #203; architecture §Data model → Replay artifact).
```

**Boundary validation — hand-checked, throwing, path-naming** (`record-composition.mjs:81–107`,
`agent-layer/lib.mjs`). No schema library:

```js
const rel = path.relative(REPO_DIR, boardPath);
const bad = (msg) => { throw new Error(`${rel}: ${msg}`); };
if (!Array.isArray(board.places)) bad('"places" must be an array');
```

**Generator shape** (`gen-loc-summary.mjs:32–79`) — `export function genReplay({ check = false } = {})`,
returns `{ …counts, drifted: [] }`, writes only when `!check`, missing file counts as drift, paths from
the module, `pathToFileURL` standalone guard, `✓` line on success and `✗ … regenerate with: …` on drift.

**Deterministic emit** — `JSON.stringify(obj, null, 2) + "\n"`, fixed key order, no timestamps generated
at emit time (every time value is copied from the trace). The drift gate re-runs this in check mode.

**Fence shape** (`record-composition.mjs:232–256`) — `allow` / `deny` closures, a `SECRET_PATHS` regex
checked in both directions, everything not explicitly allowed denied last:

```js
return async (tool, input) => {
  if (tool === 'Bash') { … }
  if (tool === 'Read')  { … }
  return deny(`${tool} is outside the build run's fence`);
};
```

**build-checks group** (`tooling/build-checks.mjs:74`, any group body) — `ok(cond, message)` where the
message states **the consequence if it fails**, then one `group(name, detail)` line at the end.

---

## IMPLEMENTATION PLAN

### Phase 1: THE SPIKE — does an agent build a board in separate, projectable tool calls?

**This phase is Task 1 of the ticket and spike 1 of the architecture. It ends at a decision gate.
Do not start Phase 2 until the gate is passed and the verdict is posted to #202.**

Build the minimum needed to *ask the question*: the op vocabulary, the CLI, the recorder, one brief.
Then one `--dry` run (proves auth, the fence, the markers, the Write→denial), then one real run. Assess
against the stated bar below. Post the verdict.

**Tasks:** Tasks 1–6.

### Phase 2: The projection

**Depends on:** Phase 1's gate, on the **clean** branch. (On branch B the prompt is tightened and Phase 1
re-runs; on branch C this phase's data model and label change — see the decision rule.)

The generator, the artifact, its README.

**Tasks:** Tasks 7–8.

### Phase 3: Registration + the checks that can fail

**Depends on:** Phase 2.
**Independent of:** each other — Tasks 9, 10, 11 touch three different files and can be done in any order.

`build.mjs`, `drift-check.mjs`, `build-checks.mjs` group 11.

**Tasks:** Tasks 9–11.

### Phase 4: Cascades, docs, validation

**Depends on:** Phase 3 (loc-summary must count the final file set).

**Tasks:** Tasks 12–14.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom.

### 1. CREATE `system/board-ops.mjs`

- **IMPLEMENT**: The op vocabulary and a pure applier over the board model
  `{ places: [{ id, label, affordances: [{ id, label }] }], connections: [[affordanceId, placeId]] }`.
  - `export const OPS` — the op names, as a frozen list, in one place:
    `place.add` · `place.rename` · `place.remove` · `affordance.add` · `affordance.rename` ·
    `affordance.remove` · `connect` · `disconnect`.
  - `export function emptyBoard()` → `{ places: [], connections: [] }`.
  - `export function applyOp(board, op)` — **pure**: returns a NEW board, never mutates the argument
    (the generator applies the same ops twice in the reproduce check, and #209 will want snapshots).
    Validates `op.op` against `OPS` and throws naming the op; validates params per op; enforces
    `MAX_PLACES`, `MAX_AFFORDANCES` and `LABEL_MAX` **imported from `system/breadboard.mjs`** — never
    re-literalled (`breadboard.mjs:38–47` is explicit that a mirrored cap is a cap that drifts).
    Ids are assigned here, mirroring `breadboard.mjs:168–175`'s `nextId`: `p<n>` for places,
    `<placeId>a<n>` for affordances. **An op never carries an id for the thing it creates** — it
    carries only `label` (+ `placeId` for an affordance) — so the agent cannot invent ids and the
    projection cannot smuggle one in.
  - `export function applyOps(ops, board = emptyBoard())` — folds `applyOp`, rethrowing with the op's
    index in the message.
  - `export function assertBoard(board)` — the well-formedness check `--validate` and the generator both
    use: every id unique, every connection's affordance and place resolve, no place over its affordance
    cap, no label over `LABEL_MAX`, at least one place.
- **PATTERN**: `system/pattern-rules.mjs` (a pure, exported, Node-import-safe rules module) and
  `system/breadboard.mjs:151–153`'s `isBoard` for the shallow-vs-deep distinction.
- **IMPORTS**: `import { LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from "./breadboard.mjs";` — nothing else.
- **GOTCHA**: `breadboard.mjs` is already Node-import-safe (`tooling/build-checks.mjs:53` imports it, and
  build-checks runs in CI with no DOM), so this import is free. Keep `board-ops.mjs` itself DOM-free and
  side-effect-free — no self-boot, no `typeof document` block. It is imported by a CI gate, a CLI, and a
  generator before it is ever imported by a page.
- **GOTCHA**: connections are `[affordanceId, placeId]` **arrays, not objects** — and an affordance never
  stores its own target (`breadboard.mjs:20–21`: two places to write the same fact is two places for
  them to disagree). `connect` on an affordance that already has a connection **replaces** it (that is
  the re-point verb), it does not append a second.
- **VALIDATE**:
  ```bash
  node -e "import('./system/board-ops.mjs').then(m=>{let b=m.emptyBoard();
  b=m.applyOp(b,{op:'place.add',params:{label:'Worklist'}});
  b=m.applyOp(b,{op:'place.add',params:{label:'Results'}});
  b=m.applyOp(b,{op:'affordance.add',params:{placeId:'p1',label:'Search'}});
  b=m.applyOp(b,{op:'connect',params:{affordanceId:'p1a1',placeId:'p2'}});
  m.assertBoard(b);console.log(JSON.stringify(b));
  try{m.applyOp(b,{op:'nope',params:{}});console.log('✗ bad op accepted')}catch(e){console.log('✓ refused:',e.message)}})"
  ```
- **SATISFIES**: foundation for AC #2, #3, #4.

### 2. CREATE `tooling/board-op.mjs`

- **IMPLEMENT**: The agent's only build tool. Two forms:
  - `node tooling/board-op.mjs <board.json> '<op-json>'` — read the board (or start from `emptyBoard()`
    if the file does not exist), `applyOp`, write it back with `JSON.stringify(board, null, 2) + "\n"`,
    print the **whole resulting board** as JSON to stdout. The printed board is the agent's feedback
    loop: it is how it learns the machine-assigned ids for its next op.
  - `node tooling/board-op.mjs <board.json> --validate` — `assertBoard` + print
    `board ✓ <n> places · <n> affordances · <n> connections`, exit 1 with the throw's message otherwise.
    This is the agent's validate-phase command, and its real result goes in the trace.
- **PATTERN**: `tooling/curate-trace.mjs:75–86` — the standalone CLI guard, the `✓` / `✗ <message>` +
  `process.exit(1)` split.
- **IMPORTS**: `node:fs`, `node:path`, `node:url` (`pathToFileURL`), `../system/board-ops.mjs`.
- **GOTCHA**: **The board path must stay repo-relative in what the agent types**, because that string is
  recorded verbatim in the committed trace (`record-composition.mjs:166–170` made exactly this call for
  the composition path). Resolve it against `process.cwd()`, and let the recorder set cwd — repo root on a
  real run, the scratch dir on `--dry`.
- **GOTCHA**: This file writes wherever it is pointed. It is operator/agent tooling, not a server route,
  and the *fence* — not this file — is what constrains the target. Do not add path allowlisting here; it
  would duplicate the fence and drift from it.
- **GOTCHA**: Errors must exit 1 with a legible message. The agent reads stderr and is expected to correct
  itself inside the implement phase — a silent success on a bad op would put a wrong op in the trace.
- **VALIDATE**:
  ```bash
  T=$(mktemp -d); node tooling/board-op.mjs $T/b.json '{"op":"place.add","params":{"label":"Worklist"}}' \
  && node tooling/board-op.mjs $T/b.json '{"op":"affordance.add","params":{"placeId":"p1","label":"Filter"}}' \
  && node tooling/board-op.mjs $T/b.json --validate \
  && node tooling/board-op.mjs $T/b.json '{"op":"connect","params":{"affordanceId":"p1a1","placeId":"p9"}}'; \
  echo "exit=$? (want non-zero — p9 does not exist)"; rm -rf $T
  ```
- **SATISFIES**: AC #1 (the run's mechanism), AC #5 (one narrow Bash surface to fence).

### 3. CREATE `replay/briefs/<slug>.md` + choose the slug

- **IMPLEMENT**: One short canned brief — the human-authored *input* to the run (this is not agent output,
  so authoring it by hand is correct and does not touch the honesty contract). ~15–25 lines: who the
  product is for, the one job it does, two or three things a user must be able to do, one explicit no-go.
  Write it **about an existing scenario's domain** (spike 1 says "over an existing scenario"); `fieldwork`
  (field-service scheduling, B2B) has the richest fixtures and the most existing traces to sit beside.
  **Do not include a board, a place list, an affordance list, or any worked example** — the brief states
  the problem, never the answer.
- **GOTCHA**: `traces/` is a **flat global namespace** (`record-composition.mjs:401`), so the slug must be
  globally unique across every existing trace. Check: `ls traces/`. Suggested: `build-fieldwork-dispatch`.
  The same slug names `traces/<slug>.{raw.,}jsonl`, `replay/<slug>.board.json`, `replay/<slug>.json` and
  `replay/briefs/<slug>.md` — one slug, four places, and the generator's discovery depends on it.
- **VALIDATE**: `test ! -e traces/<slug>.jsonl && test ! -e traces/<slug>.raw.jsonl && echo "slug free ✓"`
  (an exact filename test — `ls | grep '^<slug>'` also matches a *longer* existing slug with the same
  prefix, which is the collision this check exists to catch), plus a read-through: does the brief name any
  place or affordance the board should contain? If yes, cut it.
- **SATISFIES**: AC #5 (no example anywhere).

### 4. CREATE `portal/record-build.mjs`

- **IMPLEMENT**: The fenced incremental recorder. Structure it as a near-parallel of
  `record-composition.mjs` — a reviewer should be able to diff them:
  - `const MODEL = 'claude-sonnet-5';` · `PIV_ORDER` · `TOOLS = ['Read', 'Bash']` (**no `Write`** —
    the agent's implement act is Bash ops, and denying Write outright is the tightest fence) ·
    `READONLY = ['Read']` · the same `SECRET_PATHS` regex.
  - `PIV_BUILD_SYSTEM` — the build-run system prompt. It must carry, as *rules and never as an example*:
    Singer's three definitions verbatim (places / affordances / connections, per
    `system/breadboard.mjs:8–13`); that a connection runs **from an affordance to a place**; the caps
    (`MAX_PLACES`, `MAX_AFFORDANCES`, `LABEL_MAX`, interpolated from `board-ops.mjs`'s imports, never
    typed as literals); the four-marker PIV contract copied verbatim from `PIV_COMPOSE_SYSTEM:132–162`
    (each marker ALONE on the first line of its OWN text block — this exact wording is what makes
    `validateTrace` pass); and **the incrementality rule, which is this run's whole point**:
    > Each place, each affordance and each connection is its own separate `node tooling/board-op.mjs`
    > call. Never batch two ops into one command. Read the board this prints back before your next op —
    > the ids in it are assigned by the tool, not by you.
  - `buildTask(refs)` — the task prompt: the brief path (the only readable file), the board path to build
    up, the exact op-JSON shapes for each of the eight verbs, the caps, and the exact validate command.
    Same "do not explore or orient first" clause as `record-composition.mjs:185–187` (and per the
    `recorder-run-positive-framing` memory, frame it positively: *name the files and walk the four
    phases*, rather than piling on prohibitions).
  - `makeFence(root, boardAbsPath, briefAbsPath)`:
    - `Write` / `Edit` → **always deny** (`'may not write files — the board is built through
      `node tooling/board-op.mjs` calls, one op at a time'`).
    - `Read` → the brief only; deny `SECRET_PATHS` first, then anything not the brief.
    - `Bash` → allow only a command matching `node tooling/board-op.mjs <the run's board path> …`, and the
      `--validate` form. Match the resolved board path, not a substring. Deny everything else.
    - default → deny.
  - `runBuild({ slug, isDry, force, onStep })` returning the same `outcome` shape (`ok`, `reason`, `paths`,
    `stats`), `summarize()` copied in spirit, `dropShipped()` adapted (drop the curated trace **and the
    board file**; keep the raw for inspection).
  - **`--force` must also remove a stale `replay/<slug>.json` at the START of the run**, beside the
    stale board file. Otherwise run #1's artifact survives run #2's failure: `dropShipped` takes the
    board away, and an artifact projected from a trace that no longer exists stays committed. (Task 7's
    two-directional discovery is the backstop that turns that state red; this is what stops it arising.)
  - The real-run ship-gate, in this order: **(a)** the board file exists and `assertBoard` passes →
    **(b)** `curateTrace` → **(c)** `validateTrace` → else `dropShipped` + `ok:false`. Mirrors
    `record-composition.mjs:438–472` exactly, including its comment about why `validateTrace` — not the
    recorder's own marker scan — is the authority.
  - The `pathToFileURL` CLI guard, `process.exitCode` not `process.exit(1)` (and the reason, at 493–495).
- **PATTERN**: `portal/record-composition.mjs` throughout. **Read it before writing a line of this.**
- **IMPORTS**: `import { REPO_DIR, HAS_TOKEN } from './lib/env.mjs';`,
  `import { curateTrace } from '../tooling/curate-trace.mjs';`,
  `import { validateTrace } from '../tooling/validate-trace.mjs';`,
  `import { assertBoard } from '../system/board-ops.mjs';`,
  `import { LABEL_MAX, MAX_AFFORDANCES, MAX_PLACES } from '../system/breadboard.mjs';`
  — and `recordRun` **lazily**: `const { recordRun } = await import('./lib/trace-recorder.mjs');` inside
  the function, after every guard. That laziness is a load-bearing invariant, not a style choice
  (`record-composition.mjs:36–45`).
- **GOTCHA**: `--dry` uses a scratch cwd (`mkdtempSync`), so its refs are **absolute** and its trace is
  never committed; a real run uses `cwd = REPO_DIR` and **repo-relative** refs so the committed trace stays
  portable with no home-dir paths in it. Both halves matter — copy the `refsFor` split at 205–226.
- **GOTCHA**: `existsSync(rawOut) && !force` → throw, per 409–410. A re-run of a slug is deliberate.
- **GOTCHA**: Clear any stale `replay/<slug>.board.json` before a real run so the ops build from empty —
  same reasoning as 411–415.
- **GOTCHA**: `maxTurns`. A composition run gets 40 for ~6 tool calls. This run makes one call *per op* —
  a 4-place board is easily 12–18 ops plus reads and corrections. **Start at 80** and report the real
  `numTurns` in the verdict; a run that dies at the cap is a cap problem, not a model problem.
- **VALIDATE**: `node --check portal/record-build.mjs` and
  `node -e "import('./portal/record-build.mjs').then(()=>console.log('imports ✓'))"` (proves the SDK is
  still lazy — this must work whether or not `portal/node_modules` exists).
- **SATISFIES**: AC #1, AC #5.

### 5. RUN the `--dry` smoke test

- **IMPLEMENT**: `node portal/record-build.mjs --slug <slug> --dry`
- **GOTCHA**: Auth is the Mac Claude CLI login, not `portal/.env` (memory: `local-agent-visual-gate-notes`).
  The recorder prints which path it took (`printAuth`, 258–262).
- **GOTCHA**: A dry run costs real tokens (~$0.10–0.25). It is the cheap proof of five things at once:
  auth works · all four PIV markers land in order · the Bash fence allows the op CLI · the Write fence
  **denies** (the run should record at least one denial if the model tries) · `assertBoard` accepts what
  the ops built.
- **VALIDATE**: the printed summary shows `phases: plan→gate→implement→validate`, `0 null-phase`, and a
  board that `assertBoard` accepted. Nothing under `traces/` or `replay/` changed:
  `git status --porcelain traces/ replay/`
- **SATISFIES**: AC #1, AC #5.

### 6. ⛔ RUN the real run — then STOP at the decision gate

- **IMPLEMENT**: `node portal/record-build.mjs --slug <slug>` → `traces/<slug>.raw.jsonl` +
  `traces/<slug>.jsonl` + `replay/<slug>.board.json`.
- **ASSESS against this bar** (state each as pass/fail — "clean" is not a matter of taste):
  1. `node tooling/validate-trace.mjs traces/<slug>.jsonl` exits 0.
  2. Phases are exactly `plan→gate→implement→validate`, and **null-phase steps = 0**.
  3. **Every Bash step in the implement phase parses to exactly one op** — no batched commands, no
     shell chaining, no op-shaped text outside a tool call. Count them:
     ```bash
     node -e "const fs=require('fs');const rows=fs.readFileSync('traces/<slug>.jsonl','utf8').trim().split('\n').map(JSON.parse);
     const b=rows.filter(r=>r.type==='step'&&r.kind==='tool'&&r.tool==='Bash'&&r.phase==='implement');
     console.log('implement Bash steps:',b.length);
     for(const s of b)console.log(s.seq, s.ok?'ok':'FAIL', s.input.command);"
     ```
     **Record this number in the verdict comment** as `N_ops = successful implement-phase Bash steps
     minus --validate calls`. The generator does not exist yet, so the 1:1 claim cannot be *closed*
     here — Task 7's validation re-checks it (`ops.length === N_ops`), and that is what actually proves
     "project 1:1 into replay ops", which is the spike's literal question.
  4. The board the ops produced has **≥3 places, ≥1 connection**, and `assertBoard` passes — a board too
     thin to be a build is a failed spike even if every mechanism worked.
  5. The board is a *reasonable* reading of the brief (this one is judgement, and it is the only one).
- **DECISION RULE** (the ticket's, unchanged):
  - **Clean** (1–4 pass) → ship the pattern → continue to Phase 2.
  - **Noisy** → tighten `PIV_BUILD_SYSTEM` / `buildTask` / the fence and **re-run with `--force`**. Never
    hand-edit the trace, the board, or an op. Budget two re-runs before escalating to branch C.
  - **Still noisy** → fall back to rules-derived ops spliced with real trace beats, **labeled `"derived"`**.
    This changes the data model *and* the honesty label — **stop and raise it with the owner before
    implementing it**, because #209 inherits both.
- **THEN**: post the verdict as a comment on **#202** — which branch was taken, the numbers from the bar,
  `numTurns`, cost, and (on branch B) what was tightened. **The epic requires this before #209 is planned;
  it is an acceptance criterion, not a courtesy.**
  ```bash
  gh issue comment 202 --body-file .claude/reports/spike-1-verdict.md
  ```
- **GOTCHA**: Do not `git add` the trace pair until the gate passes — a dropped run leaves the raw on disk
  deliberately, for reading, and it must not be committed as if it shipped.
- **VALIDATE**: `node tooling/validate-trace.mjs` (all traces) and the step-count command above.
- **SATISFIES**: AC #1, AC #6.

### 7. CREATE `agent-layer/gen-replay.mjs`

- **IMPLEMENT**: The projection generator. Two exports — a **pure** one that build-checks can drive, and
  the `gen*` entry point:
  - `export function projectTrace(rows, { slug })` — **pure, no filesystem.** Takes parsed curated JSONL
    rows, returns `{ meta, ops }`. For each `type:"step"`, `kind:"tool"`, `tool:"Bash"`, `ok:true` step
    whose `input.command` matches the op-CLI invocation, parse the op JSON out of the command and emit:
    ```json
    { "op": "place.add", "atMs": 41230, "phase": "implement", "params": { "label": "Dispatch board" }, "fromStep": 14 }
    ```
    - `atMs` = `Date.parse(step.ts) − Date.parse(meta.startedAt)`, an integer. A negative value
      **throws**, naming the `seq` — it means the trace is corrupt. Do not clamp; clamping hides it.
    - `phase` = `step.phase` verbatim.
    - `fromStep` = `step.seq` verbatim.
    - `--validate` invocations are **not ops** — skip them (they are the validate phase's real check, and
      they change no state).
    - A failed op call (`ok:false`) is **not an op** — it changed nothing. It stays visible in the trace.
    - **Refuse**, naming the step's `seq`: an op call whose JSON does not parse · an op name not in `OPS` ·
      a step with no `seq` · a step whose `seq` is not present in the rows it came from · zero ops found.
  - `export function genReplay({ check = false } = {})`:
    1. Discover **from both directions** — this is not optional:
       - every `replay/*.board.json` → its slug. **Throw naming both paths** if `traces/<slug>.jsonl`
         is missing (`agent-layer/lib.mjs`'s convention).
       - **and** every `replay/*.json` that is not a `.board.json` → **throw** if it has no
         `<slug>.board.json` sibling. Without this, an **orphaned artifact is invisible to the drift
         check**: discovery keyed only off board files never looks at it, so a stale
         `replay/<slug>.json` left behind by a failed `--force` re-run (whose `dropShipped` removed the
         board) stays committed, `--check` stays green, and AC #2 is silently unmet.
    2. `validateTrace(traces/<slug>.jsonl)` — let it throw. *This is AC #4's first half: the generator
       refuses a pair that fails the validator.*
    3. Parse the curated rows → `projectTrace`.
    4. **The reproduce check:** `applyOps(ops)` deep-equals the committed `replay/<slug>.board.json`.
       Throw naming the first differing path otherwise.
    5. Emit `replay/<slug>.json`, deterministically, with fixed key order:
       ```json
       {
         "$description": "GENERATED by agent-layer/gen-replay.mjs — do not edit. A PROJECTION of a real recorded agent run, not a recording. Regenerate: node agent-layer/gen-replay.mjs",
         "version": 1,
         "slug": "<slug>",
         "label": "Projection of the real run <slug>",
         "source": {
           "curatedTrace": "/traces/<slug>.jsonl",
           "rawTrace": "/traces/<slug>.raw.jsonl",
           "board": "/replay/<slug>.board.json",
           "brief": "/replay/briefs/<slug>.md",
           "sessionId": "…", "model": "…", "startedAt": "…", "durationMs": 0
         },
         "ops": []
       }
       ```
       Every `source` value is **copied from the curated meta**, never computed or authored.
    6. `check` mode: build the same string in memory, compare against disk, `catch { prior = "" }` so a
       **missing** artifact counts as drift. Return `{ runs, ops, drifted }`.
  - The `pathToFileURL` standalone guard: `✓` line on success, `✗ … regenerate with: node
    agent-layer/gen-replay.mjs` + exit 1 on drift.
- **PATTERN**: `agent-layer/gen-loc-summary.mjs:32–79` for the whole shape;
  `agent-layer/gen-system-graph.mjs` for a generator that reads several committed files.
- **IMPORTS**: `node:fs`, `node:path`, `node:url`, `../tooling/validate-trace.mjs` (`validateTrace`),
  `../system/board-ops.mjs` (`OPS`, `applyOps`). **Zero deps. Never reaches `portal/`.**
- **GOTCHA — the load-bearing coupling**: this works only because `tooling/curate-trace.mjs:17` has
  `KEEP_WHOLE = new Set(['file_path', 'command'])`. Every *other* string in `input` is clipped at 700
  chars by `truncateInput`. **Write this in the file's header comment.** If `command` ever leaves that
  set, the op JSON truncates mid-string and the reproduce check goes red with a confusing message.
- **GOTCHA**: Parse the op JSON with a **precise** extractor — the CLI's argv contract is
  `node tooling/board-op.mjs <path> '<json>'`, so match the path, then take the remainder, then strip one
  layer of surrounding single quotes. Do **not** regex-hunt for `{…}` inside the command; a label
  containing a brace would break it. Throw naming the `seq` when the shape does not match.
- **GOTCHA**: Emit ops in `seq` order and **assert it** — the trace is true chronology and must never be
  sorted (`traces/README.md:68–69`), but an assertion costs one line and catches a malformed trace.
- **GOTCHA**: Ops carry no ids for things they create (Task 1) — so the reproduce check is genuinely
  re-deriving the ids, not copying them.
- **VALIDATE**:
  ```bash
  node agent-layer/gen-replay.mjs && node agent-layer/gen-replay.mjs --check && head -30 replay/<slug>.json
  # the 1:1 claim the spike asked, now closable — must equal N_ops from Task 6's gate:
  node -e "console.log('ops:',require('./replay/<slug>.json').ops.length)"
  # the orphan-artifact hole must be red, not silent:
  mv replay/<slug>.board.json /tmp/ && node agent-layer/gen-replay.mjs --check; echo "exit=$? (want 1)"; mv /tmp/<slug>.board.json replay/
  ```
- **SATISFIES**: AC #2, AC #3, AC #4.

### 8. CREATE `replay/README.md`

- **IMPLEMENT**: The artifact's contract, in `traces/README.md`'s image. Must state, plainly:
  - What a replay artifact **is**: a generated projection of a committed real run.
  - What it **is not**: a trace, a recording, or anything the reader should trust *instead of* the trace.
    The trace pair is committed beside it and linked from `source`.
  - The op shape and the op vocabulary, pointing at `system/board-ops.mjs` as the definition.
  - The honesty rules: never hand-write or hand-edit an artifact, a board file, or an op; a weak run is
    fixed by a tighter prompt in `portal/record-build.mjs` + a re-run.
  - The file map (`briefs/<slug>.md` human-authored input · `<slug>.board.json` the run's real output ·
    `<slug>.json` generated) and the workflow commands.
- **PATTERN**: `traces/README.md` — same section order, same directness.
- **VALIDATE**: read it against the ticket's sentence *"The artifact is not a trace and may never read as
  a recording it isn't"* — if the README could be skimmed and leave the opposite impression, rewrite it.
- **SATISFIES**: AC #2 (the label's meaning is written down, not just emitted).

### 9. UPDATE `agent-layer/build.mjs`

- **IMPLEMENT**: `import { genReplay } from "./gen-replay.mjs";` + the call + the `✓` line, in the existing
  order and column alignment:
  ```js
  const rp = genReplay();
  console.log(`  replay          ✓  ${rp.runs} run(s) → ${rp.ops} ops (replay/)`);
  ```
- **PATTERN**: `agent-layer/build.mjs:33–40`.
- **VALIDATE**: `node --check agent-layer/build.mjs` (a full `build.mjs` run needs the sibling jobs folder
  and a ledger — do not attempt it here).
- **SATISFIES**: AC #2.

### 10. UPDATE `tooling/drift-check.mjs`

- **IMPLEMENT**: `import { genReplay } from "../agent-layer/gen-replay.mjs";`, a `checkReplay()` in the
  `checkLocSummary` mould, the call placed **after `checkTraces()`** (the traces must validate first — a
  replay artifact projected from an invalid trace is meaningless), and `· replay` appended to the summary
  string.
- **PATTERN**: `tooling/drift-check.mjs:60–67` and `145–160`.
- **GOTCHA**: `checkTraces` already validates every `traces/*.jsonl`, including the new pair, with no edit.
- **VALIDATE**:
  ```bash
  node tooling/drift-check.mjs   # ✓ … · traces · replay
  # the check must be able to fail — mutate and confirm red:
  node -e "const fs=require('fs');const p='replay/<slug>.json';const j=JSON.parse(fs.readFileSync(p));j.ops[0].params.label='TAMPERED';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
  node tooling/drift-check.mjs; echo "exit=$? (want 1)"; node agent-layer/gen-replay.mjs
  ```
- **SATISFIES**: AC #2.

### 11. UPDATE `tooling/build-checks.mjs` — group 11, the replay projection

- **IMPLEMENT**: A new group driving the **pure** `projectTrace` (+ `applyOps` / `assertBoard`) over
  **synthetic in-memory rows** — no committed trace, no SDK, no browser (case 7 does use a temp dir;
  `build-checks` already touches the filesystem via `readFileSync`). Hand-built rows are legitimate
  here: they are test input, not presented as a run. Assert, each as an `ok(...)` whose message names the
  consequence:
  1. **Happy path** — a synthetic 4-op trace projects to 4 ops, in `seq` order, each with the right
     `fromStep`, `phase` and `atMs`, and `applyOps` reproduces the expected board.
  2. **⚠ THE MUTATION THAT MAKES IT REAL** — take the same rows, corrupt **one command's label**, and
     assert the reproduce check goes red against the correct board. *If this passes green, the reproduce
     check is vacuous and the whole gate is theatre.* (Memory: `check-that-cannot-fail` — every #137 defect
     survived a green gate because the check skipped the thing it tested.)
  3. **Refusals**, one assertion each: an unparseable op JSON · an op name not in `OPS` · a step with no
     `seq` · zero ops in the whole trace. Each must throw, and the message must name the offending `seq`.
  4. **`--validate` steps are not ops**, and a failed (`ok:false`) op step is not an op.
  5. **`atMs` is real pacing** — derived from `ts − startedAt`, not an index. Assert that two steps
     3 000 ms apart in `ts` are 3 000 ms apart in `atMs`.
  6. **The label is the honest one** — `label` matches `/^Projection of the real run /` and the artifact
     carries no key claiming to be a trace or a recording.
  7. **The `KEEP_WHOLE` coupling is guarded — by running the real function, not by grepping.**
     `truncateInput` (`curate-trace.mjs:27`) and `KEEP_WHOLE` (line 17) are both module-private, so
     there is exactly one way to do this: write a synthetic raw JSONL to a temp dir containing a Bash
     step whose `input.command` is **>700 chars**, run `curateTrace(raw, out)`, read the output back,
     and assert the command returned **byte-identical**. ~8 lines. Do not assert on the constant and do
     not grep the source — memory `check-that-cannot-fail`: *mutate the source, run the function*.
- **PATTERN**: any existing group body; `group(name, detail)` at the end; the `ok(cond, msg)` idiom.
- **IMPORTS**: add `projectTrace` from `../agent-layer/gen-replay.mjs` and `OPS`/`applyOps`/`assertBoard`
  from `../system/board-ops.mjs` to the block at lines 47–61.
- **GOTCHA**: **Update the `all 10 groups pass` literal at line 1255 to `all 11 groups pass`** — and the
  header comment block at lines 1–42 that enumerates the groups.
- **GOTCHA**: build-checks **must stay pure and SDK-free** — it runs in CI where `portal/node_modules` does
  not exist. `gen-replay.mjs` imports only `node:*`, `tooling/validate-trace.mjs` and
  `system/board-ops.mjs`, so this is safe; **do not** let group 11 import `portal/record-build.mjs`.
  Prove it locally:
  ```bash
  mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
  ```
- **VALIDATE**: `node tooling/build-checks.mjs` → `all 11 groups pass`. Then **mutate the source** to prove
  the group can fail: flip one comparison in `projectTrace`'s refusal path and confirm group 11 goes red.
- **SATISFIES**: AC #3, AC #4.

### 12. REGENERATE the loc-summary cascade

- **IMPLEMENT**:
  ```bash
  git add -A                                  # gen-loc reads the INDEX blob, not the working tree
  node agent-layer/gen-loc-summary.mjs
  git diff --cached system/loc-summary.json   # what actually moved?
  ```
- **GOTCHA — which files count** (`gen-loc-summary.mjs:22–26`):
  - `system/board-ops.mjs` → the **`runtime`** group. approach.html renders the runtime number, so **if
    the rounded value moves (currently 19,400), the two approach baselines churn** and must be regenerated
    in this PR.
  - `agent-layer/gen-replay.mjs` → the `generators` group → grand total only. Per the
    `loc-summary-counts-tracked-only` memory, that fails `verify` if unregenerated but does **not** churn
    approach baselines.
  - `tooling/board-op.mjs`, `portal/record-build.mjs`, `replay/**`, `traces/**` → **counted by nothing**.
- **THEN, only if the runtime number moved**, from a **clean detached worktree under `/Users`** (the gate
  screenshots the dirty tree, and Docker cannot share `/private/tmp`):
  ```bash
  cd tooling/visual-regression && npm run update:docker
  ```
  Memory: `vr-tolerance-hides-text-changes` — a green update run is not proof a page didn't change; and
  `vr-update-skips-subperceptual` — if only a digit moved and the PNG did not rewrite, `rm` it to force.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` exits 0.
- **SATISFIES**: AC #2 (CI `verify` green).

### 13. UPDATE `CLAUDE.md` — the architecture map

- **IMPLEMENT**: Rows for the four new modules and the new tree, in the existing voice (what it is, why it
  is that way, the invariant a future reader would otherwise break):
  - `system/board-ops.mjs` under the `system/` block — the op vocabulary + pure applier; caps imported from
    `breadboard.mjs`, never re-literalled; ops carry no ids for what they create.
  - `portal/record-build.mjs` beside `record-composition.mjs` — the incremental recorder; Write denied
    outright, Bash narrowed to the one op CLI, so **a build run's `artifacts` count is 0 by design**.
  - `agent-layer/gen-replay.mjs` under `agent-layer/` — GENERATED + drift-checked; the `KEEP_WHOLE`
    coupling; the reproduce check.
  - `tooling/board-op.mjs` — the agent's only build tool; one invocation = one op = one trace step.
  - `replay/` as a top-level tree, with the "projection, not a recording" rule stated once.
  - The `tooling/build-checks.mjs` row: **10 groups → 11**, naming group 11.
  - **Where new code goes**: a bullet for "New replay run" — record with `portal/record-build.mjs`,
    project with `gen-replay.mjs`, never hand-write an op (the trace rule, extended).
- **GOTCHA**: `CLAUDE.md` says "run the surface you touched" is what "done" means — do not invent a test
  suite row.
- **VALIDATE**: read the diff; every claim must be true of the code as shipped.
- **SATISFIES**: AC #2, AC #5 (the honesty rule is written where the next agent will read it).

### 14. FULL VALIDATION + the PR

- **IMPLEMENT**: run every command in `## VALIDATION COMMANDS` below, then commit and open the PR.
- **GOTCHA**: **The PR body MUST carry `Closes #203`** — a title mentioning `(#203)` closes nothing
  (memory: `prs-dont-auto-close-tickets`; #78 sat open for a day and cost a planning pass).
- **GOTCHA**: The plan, the report (**with the spike verdict**) and the review live in the same PR —
  `.claude/plans/`, `.claude/reports/`, `.claude/code-reviews/pr-<N>-review.md`.
- **GOTCHA**: The spike verdict must ALSO be a comment on **#202** (AC #6) — the PR is not a substitute.
- **SATISFIES**: all ACs.

---

## TESTING STRATEGY

This repo has no suite, no linter and no type-check, and `CLAUDE.md` is explicit: **do not hunt for or
invent one.** "Done" = run the surface you touched. Here that means four gates, three of which already run
in CI.

### The gates this ticket adds to

- **`tooling/build-checks.mjs` group 11** — the real test layer (Task 11). Pure, in-memory, CI-run.
- **`tooling/drift-check.mjs` → `checkReplay`** — the artifact cannot drift from its trace (Task 10).
- **`tooling/validate-trace.mjs`** — already covers the new trace pair via `checkTraces`, no edit needed.

### Edge cases that must be covered by group 11

- An op JSON that does not parse · an op name outside `OPS` · a step with no `seq` · a trace with zero ops.
- A `--validate` invocation (not an op) · a failed op call, `ok:false` (not an op).
- Two steps 3 000 ms apart producing `atMs` 3 000 ms apart (real pacing, not an index).
- **The corrupted-label mutation** — the single assertion that decides whether the reproduce check is real.
- A `command` longer than 700 chars surviving curation (the `KEEP_WHOLE` coupling).

### Edge cases handled by construction, and noted so they are not re-tested

- Op ids: an op never carries an id for what it creates, so a projected op cannot smuggle a wrong id in.
- Curated/raw `sessionId` mismatch: `validateTrace:50–51` already fails a `--force` re-run that was never
  re-curated.
- A build run's `artifacts` count is 0 (Write is denied) — legal, and unlike every other committed trace.
  **Say so in the PR body**, along with the consequence: the board↔trace link is enforced by
  `gen-replay`'s reproduce check, not by the trace format.
- An **orphaned** `replay/<slug>.json` (artifact with no board sibling) — covered by Task 7's
  two-directional discovery and its validation command, not by group 11.

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check system/board-ops.mjs
node --check tooling/board-op.mjs
node --check portal/record-build.mjs
node --check agent-layer/gen-replay.mjs
node --check agent-layer/build.mjs
node -e "import('./portal/record-build.mjs').then(()=>console.log('SDK still lazy ✓'))"
```

### Level 2: The generator + the gates

```bash
node agent-layer/gen-replay.mjs
node agent-layer/gen-replay.mjs --check
node tooling/validate-trace.mjs
node tooling/build-checks.mjs            # → all 11 groups pass
node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs             # the full CI gate, locally
```

### Level 3: The SDK-free invariant (CI proves this by absence — prove it locally by absence too)

```bash
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
```

### Level 4: The checks must be able to fail — mutate, watch it go red, restore

```bash
# a) tamper with the artifact → drift-check red
node -e "const fs=require('fs');const p='replay/<slug>.json';const j=JSON.parse(fs.readFileSync(p));j.ops[0].params.label='TAMPERED';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
node tooling/drift-check.mjs; echo "exit=$? (want 1)"; node agent-layer/gen-replay.mjs

# b) tamper with the committed board → the reproduce check red
node -e "const fs=require('fs');const p='replay/<slug>.board.json';const j=JSON.parse(fs.readFileSync(p));j.places[0].label='TAMPERED';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
node agent-layer/gen-replay.mjs; echo "exit=$? (want non-zero)"; git checkout replay/<slug>.board.json

# c) flip one comparison in projectTrace's refusal path → group 11 red; restore
```

### Level 5: Manual

- Read `replay/<slug>.json` end to end. Does every op correspond to a step you can find in
  `traces/<slug>.jsonl` by its `fromStep` seq? Spot-check three.
- Read `replay/README.md` and the artifact's `label` as a stranger. Could either be mistaken for a
  recording? If yes, rewrite — that label is load-bearing.
- `git status --porcelain` — nothing generated is untracked (`CLAUDE.md`: deploy = commit the artifacts).

---

## ACCEPTANCE CRITERIA

Verbatim from #203, with how each is proven:

- [ ] **A real run is committed as a raw+curated trace pair under the standard labels;
      `node tooling/validate-trace.mjs` passes.** → Task 6; CI `drift-check → checkTraces`.
- [ ] **`replay/<slug>.json` is generated, committed, and drift-checked in CI `verify`.** → Tasks 7, 10.
- [ ] **Every op resolves to a `fromStep` present in the curated trace — asserted, not eyeballed.**
      → `projectTrace`'s refusal + build-checks group 11 case 3.
- [ ] **The generator refuses a pair that fails the validator, and refuses an op with no source step.**
      → `genReplay` step 2 (lets `validateTrace` throw) + group 11 case 3, proven by mutation.
- [ ] **Fence discipline holds: write only declared outputs, read only declared inputs, no example
      anywhere.** → Write denied outright; Read = the brief only; Bash = the one op CLI; the brief
      contains no board (Task 3); the system prompt states rules, never an example.
- [ ] **The spike verdict (and which branch was taken) is commented on #202.** → Task 6.

Plus the epic's standing per-ticket rules:

- [ ] `gen-loc-summary` regenerated; approach baselines regenerated **iff** the runtime number moved.
- [ ] No `param-manifest.json` entry (nothing here is a shipped-page control) — deliberate, not forgotten.
- [ ] PR body carries `Closes #203`; plan + report + review are in the same PR.
- [ ] Every new check was **mutated and watched go red**.

---

## COMPLETION CHECKLIST

- [ ] Tasks executed in order; Phase 1 stopped at the gate before Phase 2 began
- [ ] Spike verdict posted to #202 **before** any Phase 2 work
- [ ] All Level 1–4 validation commands pass
- [ ] `node tooling/drift-check.mjs` and `node tooling/build-checks.mjs` both green
- [ ] build-checks green with `portal/node_modules` moved away
- [ ] Every new check mutated and confirmed red, then restored
- [ ] No hand-written or hand-edited trace, board, or op — anywhere, at any point
- [ ] `CLAUDE.md` architecture map updated and true of the code as shipped
- [ ] `git status --porcelain` clean; every generated artifact committed

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes** (each would change the plan if wrong):

1. **The Bash-CLI op channel is the right mechanism.** Rejected alternatives in NOTES. The strongest
   evidence for it is `curate-trace.mjs:17` — `command` is one of only two keys exempt from truncation,
   so the op JSON survives curation intact. An MCP-tool channel would put params in `input`, which is
   clipped at 700 chars per string.
2. **A build run legitimately has `artifacts: 0` — decided, not deferred.** Write is denied, so
   `validate-trace.mjs:74–81` never fires, and **nothing in the trace format links
   `traces/<slug>.jsonl` to `replay/<slug>.board.json`.** That link is enforced instead by
   `gen-replay`'s reproduce check plus its two-directional discovery (Task 7) — deliberately, and it
   must be stated as such in `CLAUDE.md` and the PR body so `0 artifacts` is not read as a broken run.
   The alternative (un-deny Write for one final board write, restoring the format-level pairing) was
   weighed and **rejected**: it widens the fence — the agent could then write anything to that path —
   for a cosmetic gain, on the run whose whole point is fence discipline.
3. **All four PIV phases survive curation with ≥1 step.** **Verified** against the two committed
   traces closest in shape (`demo-notice`, `backlog-urgency`): every phase keeps ≥1 step, and the first
   surviving step of each is a text block (the marker line is stripped but the prose around it survives).
   So `phase` on an op is a usable act boundary for #209.
4. **`maxTurns: 80` is enough** for a 3–5-place board built one op at a time. Unverified until Task 5 —
   report the real `numTurns`.

**Questions deliberately left to #209** (do not pre-empt them here):

- **Should narration and refusal beats be ops, or read from the curated trace?** The architecture says
  the driver plays "real narration and real refusal beats," but #203's data model is board ops only, and
  the curated trace is committed, public and linked from `source` — the driver can read it directly.
  Deciding this in #203 would hand #209 a speculative inheritance in the very ticket the epic says must
  report *before* #209 is planned. **Left open on purpose. Note it in the spike verdict comment so it is
  decided with the evidence in hand.**
- Whether replay steps drive `morph()` or stay transform-only (architecture §Open questions) — a driver
  question, untouched here.

**One question for the owner, if branch C is reached:** the `"derived"` fallback changes both the data
model and the honesty label. Do not implement it unilaterally.

---

## NOTES (open canvas)

### Why the Bash-CLI op channel, and what was rejected

| | Mechanism | Verdict |
|---|---|---|
| **A** | **Bash → `node tooling/board-op.mjs <board> '<op-json>'`**, one call per op | **Chosen.** One tool call = one op = one trace step, exactly what the ticket asks for. Stays inside the fence vocabulary `record-composition.mjs` already proved (`Bash → node … only`). `command` is exempt from curation's truncation. The CLI prints the board back, so ids are machine-assigned and the agent has a real feedback loop. |
| B | In-process MCP tools (`createSdkMcpServer`) — one tool per verb | Semantically prettier (tool name *is* the op), but params land in `input`, which `truncateInput` clips at 700 chars per string; and it introduces SDK surface no recorder in this repo has used, on the critical path, inside a spike. Rejected on risk. |
| C | One `Write` per op to `ops/001.json`, `002.json`, … | Restores Write→artifact pairing, but litters the repo with numbered files and makes the fence a directory allowlist. Rejected on ugliness. |

### Why `system/board-ops.mjs` and not `tooling/`

Three consumers, three layers: the recorder's CLI (build time), the generator's reproduce check (build
time), and **#209's replay driver (view time)**. Only `system/` is reachable by all three, and only
`system/` carries the "hand-written canon, Node-import-safe" convention this module needs. The cost is the
loc cascade (Task 12) — which the epic's preamble already budgets for every ticket.

### The reproduce check, and why it needed a mutation to be worth anything

The obvious version — "apply the ops and compare to the board" — compares the producer's output against
the producer re-run, and passes unless someone hand-edited the board. That is a tamper check, not a
projection check. What makes it real is group 11 case 2: corrupt **one command's label in the synthetic
trace** and assert the reproduce check goes red against the correct board. That is the assertion that
proves the projection extracted the *right* params, not merely *some* params. If it ever passes green,
the check is theatre — and this repo has a memory named for exactly that failure
(`check-that-cannot-fail`: every #137 defect survived a green gate because the check skipped the thing it
tested).

### Sequencing risk

Phase 1 is a spike with a real cost (~$0.25/run) and a real failure branch. The plan is deliberately
written so Phase 1 **ends** rather than flows — a plan whose Phases 2–4 assume the clean branch is a plan
that gets executed straight through when the run is noisy. Two re-runs is the budget before escalating.

### Not this ticket, but noticed and worth not losing

The epic's slicing notes flag a blocker: two drafted design plans that #204 and #219 both cite are
**untracked in git** and are one `git clean` from being lost —
`.claude/plans/factory-copy-inspect-panzoom-173.md` (47 KB) and
`.claude/plans/protos-bus-toggles-device-frame-176.md` (62 KB). They are sitting as `??` in the working
tree right now. Committing them is not in this ticket's scope, but this session is the one that saw them.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
