# Feature: the replay driver over the `agent.*` bus + take-over handoff (#209)

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.
**Every module named below is hand-written canon with a load-bearing header comment. Read the
header before you edit the file — several of them explicitly name this ticket and tell you what
call they already made on your behalf.**

## Feature Description

`/factory` currently mounts the studio with a board that was *drafted from default answers* and
placed in one synchronous loop. This ticket makes the canvas **perform a real recorded agent run
before the visitor's eyes**: `system/replay-driver.mjs` plays the committed
`replay/build-fieldwork-dispatch.json` artifact op by op over `system/action-bus.mjs`'s
reserved-but-unused `agent.*` half, at the run's real pacing shape, interleaved with the run's real
narration and its real fence refusals read from the committed curated trace — then hands the wheel
to the visitor the moment they touch the canvas.

This is the first thing in the repo that exercises `agent.*` for real. Everything it needs already
exists and is already gated: the ops (`system/board-ops.mjs`, #203), the artifact (#203), the canvas
(#204), the one `ui.move` consumer and its `getVerbs()` seam (#205), the orchestrator (#206), the
compile beat and its `getCompile()` seam (#207). **The driver adds a second author on the canvas and
must not add a second mover** — `studio-verbs.mjs`'s header, `studio-compile.mjs`'s call 3 and
`studio.mjs`'s header all say so in those words.

## User Story

As a **hiring manager with 5–15 minutes**
I want to **watch a real recorded agent run assemble a product's board on the canvas, and then grab
the wheel myself without being asked to choose a mode**
So that **I experience "brief in, product out, by a real method" instead of reading a claim about it.**

## Problem Statement

The epic's thesis is that the portfolio becomes the tool it describes. Today `/factory` shows a board
that simply *is there* on arrival — nothing on the page shows the method producing it, and the
committed real runs live in a separate tabbed trace player that reads as documentation. The
evaluator still has to trust that an agent did anything. Meanwhile the action bus's whole contract
("adding a modality is a new `source`, not a new bus") is documented and, for the `agent.*`
direction, demonstrated nowhere.

## Solution Statement

A view-time driver that:

1. fetches the two committed files (`replay/<slug>.json` and `traces/<slug>.jsonl`), merges them by
   `seq` into one ordered **beat list** — ops, narration, refusals — and plays it;
2. emits **only** `agent.build-op` and `agent.note` with `source: "agent"`, applying each op through
   `board-ops.mjs`'s pure `applyOp` in a **single consumer**, then reflecting the resulting board
   onto the canvas through `canvas.place()` alone;
3. autoplays to completion on arrival — the settled finished canvas is the new `/factory` pixel
   baseline, behind a `finally`-set `[data-replay]` handle;
4. carries visible Pause / Step / Seek / Skip-to-end controls (WCAG 2.2.2), each announced through
   the canvas's one live region;
5. pauses and hands over on the **first canvas interaction** — no mode UI, no state machine — and
   fires one static-literal virtual route from that handover's success path only;
6. shows the run's real meta verbatim with a working link to `/traces/<slug>.jsonl`, and visibly
   shifts provenance from "the run's work" to "the run's work, with your edits on top".

## Out of Scope / Non-Goals

- **Not included:** driving the compile beat from the replay. `getCompile()` exists and #207 says the
  driver takes it over "through the same handle rather than re-implementing the swap" — but the
  ticket's ACs never mention compiling, and the at-rest baseline is the *finished board*, not a
  compiled canvas. The beat stays the reader's button. (Defer to #210/#212.)
- **Not included:** `morph()` / view-transition names anywhere in the driver. The architecture leaves
  "do replay steps drive morph()?" open; #171's regression and #190's unfixed hazard-A false
  positives make naming anything here a decision to take *after* #190. `vt-verify` asserts zero
  `::view-transition-*` pseudos for this page and stays true.
- **Not included:** a second replay artifact, a brief picker, or any recorder work. One committed
  slug, named once as a constant.
- **Not included:** export / keep rail / share routes — that is #210.
- **Not changing:** `system/action-bus.mjs`. Editing it means the design has gone wrong
  (`studio-verbs.mjs:17-18`). Same for `system/board-ops.mjs`'s vocabulary — a new verb is a #203
  edit, not a driver special case.
- **Not changing:** `studio.html` (the raw harness) or `/build`. The designed surface is `/factory`.
- **Not changing:** the single-mover invariant. The driver never calls `applySlot`, never writes
  `data-col`/`data-row` on an existing wrapper, and never emits `ui.move`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `system/replay-driver.mjs` (new) · `system/studio.mjs` ·
`system/studio.css` · `system/analytics.mjs` · `factory.html` · `tooling/build-checks.mjs` ·
`tooling/studio-journey.mjs` · `tooling/visual-regression/visual.spec.mjs` ·
`system/param-manifest.json` + generated counts · factory + approach baselines
**Dependencies**: none new. Zero runtime deps (shipped pages are vanilla — hard constraint).

## Related Work

**Implements**: [#209](https://github.com/linardsb/ux-factory/issues/209) · **Epic**:
[#202](https://github.com/linardsb/ux-factory/issues/202) ·
[docs/epics/prototype-studio.architecture.md](../../docs/epics/prototype-studio.architecture.md)

**Back-references**:

- `.claude/plans/studio-canvas-stage-204.md` — the stage, `place()`, the zoom table, the seam idiom
- `.claude/plans/studio-canvas-manipulation-205.md` — the one `ui.move` consumer + `getVerbs()`
- `.claude/plans/studio-route-surgery-orchestrator-206.md` — the orchestrator this file plugs into
- `.claude/plans/studio-compile-beat-207.md` — the beat's teardown discipline and determinism rules
- #203's spike-1 verdict comment on epic #202 — **branch A, clean.** The ops are real, the label is
  `Projection of the real run <slug>`, and no "derived" fallback framing is inherited.

**Forward-references**: (none yet — #210 grows the keep rail beside this; #213 folds the journey
driver and INP instrumentation; #216 re-points home at this surface.)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `system/action-bus.mjs` (whole file, ~90 lines) — **the header IS the contract documentation.**
  `TYPE_RE = /^(ui|agent)\.[a-z][a-z-]*$/`, `SOURCES` includes `"agent"`. A throwing handler is
  caught into `console.error` (lines 70-77) — so a refusal must never throw, it must reach the live
  region. Do not edit this file.
- `system/board-ops.mjs` (lines 1-60 header, `applyOp` :102, `applyOps` :180, `assertBoard` :192) —
  the pure applier. **Ids are assigned here**; an op never carries an id for the thing it creates.
  `applyOp` returns a NEW board every time.
- `replay/README.md` (whole file) — the honesty contract for the artifact. The `label` wording is
  load-bearing; the artifact is a *projection*, never a recording.
- `replay/build-fieldwork-dispatch.json` — 18 ops, `atMs` 45981 → ~121000, `source.{curatedTrace,
  rawTrace, board, brief, sessionId, model, startedAt, durationMs}`, `fromStep` per op.
- `replay/build-fieldwork-dispatch.board.json` — 4 places · 7 affordances · 7 connections. **The
  driver's finished board must equal this file exactly.**
- `traces/build-fieldwork-dispatch.jsonl` — 33 lines: a `meta` line, 31 `step` lines
  (`{seq, ts, phase, kind, text|tool, input, ok, denied, error}`), a `result` line. **7 `kind:"text"`
  narration steps and 3 `denied:true` fence refusals** — these are the "real narration and real
  refusal beats" the ticket names.
- `system/trace-player.mjs` (`parseTrace` :26-46, header strip :118-124) — **import `parseTrace`,
  do not re-parse JSONL.** Its header-strip is the precedent for rendering `meta.label` verbatim.
- `system/studio.mjs` (whole file, 411 lines) — the orchestrator. `arrangeBoard` :74-88,
  `buildSummary` :91-103, `placeBlock` :~240, `renderSummary`, `mountStudio` :~350 with the
  `initGlossary`-outside-the-try rule and the `finally` handle. **This is where the driver mounts.**
- `system/studio-canvas.mjs` (`place()` :296-334, `say` :137, `armMoveHandles` :280, the handle
  object :336) — `place()` is **idempotent and re-labels**; there is no `remove()` on the handle.
- `system/studio-verbs.mjs` (header :10-56, the ONE consumer :366-396, `getVerbs` :236) — read the
  four numbered calls. Note :390-391: *"an injected move CAN stack two components on one cell… #209's
  replay only ever plays back slots a real gesture produced."*
- `system/studio-compile.mjs` (header :1-52, `mountCompile` :203, teardown :266-275, handle :558-580)
  — the `destroy()` ordering and the `destroyed` flag re-read before every DOM touch after an await.
  **Copy that discipline for the driver's own teardown.**
- `system/analytics.mjs` (whole file, 295 lines) — `flipTo` :185-216, `onVirtualRoute` :181,
  `RESTORE_DELAY_MS`, and the three comment blocks explaining the overlapping-flip rules.
- `tooling/build-checks.mjs` (group 10 :1313-1468 — the exact stub/mutation shape to extend; the
  group header block :20-58; `group()` :103) — **your new assertions go inside group 10**, per AC #8.
- `tooling/studio-journey.mjs` (`factoryPass` :1200-1330 — the assertions that will go stale; the
  compile pass :1334-1440 with its `requests` log; the summary line :1685).
- `tooling/visual-regression/visual.spec.mjs` (:54-62 the factory page entry and its `waitReady`
  comment; :136-139 the waitReady loop, which accepts an array).
- `factory.html` (:182-250 the studio shell markup, :389-408 the script tags).
- `system/studio.css` (whole file, 531 lines) — where the replay chrome's classes go. Note
  `build-checks` group 12 pins this sheet's `MAX_COLS`/`MAX_ROWS`/`ZOOM_LEVELS` mirror exhaustively;
  **do not disturb those blocks.**
- `system/param-manifest.json` (`$description` counting rules + the 17 `/factory` entries).

### New Files to Create

- `system/replay-driver.mjs` — the driver. Pure layer (`buildBeats`, `paceBeats`, `applyBeat`,
  `describeRun`) + `mountReplay(canvas, {...})`. Node-import safe, no self-boot.

### Relevant Documentation

- [WCAG 2.2 SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
  — Why: the autoplaying replay is moving content that starts automatically and lasts > 5 s, so a
  mechanism to pause it is a Level A requirement, not a nicety. The controls must be *findable*
  (visible, in the tab order), which is why they are real `<button>`s with visible text.
- [WCAG 2.2 SC 2.3.3 Animation from Interactions (AAA) / `prefers-reduced-motion`](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
  — Why: the reduced-motion branch jumps to the end state while keeping manual stepping.
- [MDN: `aria-live` politeness and rapid updates](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live)
  — Why: the announcement policy below (autoplay announces acts, manual stepping announces steps).
- No external library docs apply. **Vanilla shipped pages is a hard constraint** — no framework, no
  bundler, no runtime deps, no live LLM calls at view time.

### Patterns to Follow

**File header** — every feature/entry-point file opens citing its governing doc. Copy the shape of
`system/studio-compile.mjs:1-52`: what the file is, the epic/ticket/architecture section, the plan
path, then the numbered load-bearing calls a future editor must not re-argue.

**The pure/mount split** — every studio module carries it, and `build-checks` drives the pure half
under Node:

```js
// ---- the pure layer ----------------------------------------------------------------------------
// Plain data in, plain data out, so build-checks group 10 drives it in CI with no browser — the
// same split studio-canvas.mjs:34-73, studio-verbs.mjs:60-235 and studio-compile.mjs:63-178 carry.
export function buildBeats(artifact, trace) { /* … */ }
```

**The seam, never a window global** (`studio-canvas.mjs:91-95`, `studio-verbs.mjs:230-236`,
`studio-compile.mjs:182-188`):

```js
let live = null;
export const getReplay = () => live;
```

**The `finally`-set readiness handle** (`studio-canvas.mjs:361-364`, `studio-verbs.mjs:780-784`,
`device-frame.mjs:195-199`) — set on **every** path including early returns and throws, so a gate
fails on the missing thing instead of deadlocking to timeout.

**Element building — never markup from a string.** `build-checks` group 7 bans every
markup-from-string sink across these modules and counts inline-style writes. Copy the local `el()`
helper verbatim (`studio-canvas.mjs:80-89`) rather than importing one — every canon module does.

**Boundary validation throws a plain `Error` naming what is missing** (`studio-verbs.mjs:243-249`).

**Refusals reach the live region, never a throw** (`studio-verbs.mjs:363-371`) — because
`action-bus.mjs:70-77` swallows handler throws into `console.error`, which hides the refusal from the
reader *and* trips `studio-journey`'s no-page-errors contract.

**Analytics tracker shape** (`analytics.mjs:226-244`) — a module-level `const PATH = "/…"` literal, a
private `let …Fired`, a guarded flip, and a comment saying which success path calls it and why not
the settled-state flag.

---

## IMPLEMENTATION PLAN

### Phase 1: The pure layer + the artifact join

`buildBeats` / `paceBeats` / `applyBeat` / `describeRun` — plain data in, plain data out, no DOM.
This is the half `build-checks` can drive, so it is written first and gated first.

**Tasks:** merge artifact ops with trace steps by `seq`; compute the pacing schedule; apply one beat
to a board; format the run's meta.

### Phase 2: The mount — chrome, playback, the bus

**Depends on:** Phase 1.

The control row, the meta chrome, the `agent.*` emitter, the single consumer, the canvas reflection,
the reduced-motion branch, the `finally` handle, `destroy()`.

### Phase 3: Take-over + analytics

**Depends on:** Phase 2.

Capture-phase interaction detection, the provenance shift, the one-shot virtual route.

### Phase 4: Orchestrator integration + page

**Depends on:** Phase 2.

`studio.mjs` stops placing a drafted board unconditionally; `factory.html` gains the chrome mount
node and the lead copy; `studio.css` gains the chrome block.

### Phase 5: Gates

**Depends on:** Phases 1–4.

`build-checks` group 10 grows; a new pure group for the driver; `studio-journey` grows a replay pass
and its stale `/factory` assertions are corrected; `vt-verify` and the VR spec updated.

### Phase 6: Generated artifacts + baselines

**Depends on:** Phase 5 (never regenerate a baseline from a tree whose gates are red).

`param-manifest` + `gen-param-count`, `gen-loc-summary`, then **factory ×2 and approach ×2**
baselines from a clean detached worktree under `/Users`.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently checkable.

### 0. PRE-FLIGHT — five cheap checks before any code is written

Each of these takes seconds and each closes a risk that would otherwise be discovered mid-task.

- **IMPLEMENT**:
  1. **Baseline collision.** `gh issue view 210 --json state` and `gh pr list --state open`. At
     planning time #210 was **OPEN and unstarted with zero open PRs**, so this branch owns factory's
     baselines. If that has changed, **stop and sequence with the owner** — the epic's
     baseline-collision rule is not advisory.
  2. **The board seam still exists.** `node -e "import('./system/studio.mjs').then(m=>console.log(typeof m.getStudio))"` — `studio-journey`'s `/factory` assertions read the board through it (`:1218-1221`), and task 6 must keep what it returns true.
  3. **`parseTrace` is Node-safe.** `node -e "import('./system/trace-player.mjs').then(m=>console.log(Object.keys(m)))"` → `[ 'parseTrace', 'renderTracePlayer' ]`. Verified at planning time; re-check costs nothing.
  4. **The committed pair still reproduces.** `node agent-layer/gen-replay.mjs --check` — if the
     artifact has drifted from its trace, everything downstream is built on sand.
  5. **Green baseline.** `node tooling/build-checks.mjs` (15 ✓, exit 0) so any red later is yours.
- **VALIDATE**: all five commands succeed.
- **SATISFIES**: de-risks tasks 6, 11 and 16.

### 1. CREATE `system/replay-driver.mjs` — header + the pure layer

- **IMPLEMENT**: the file header (governing doc, epic/ticket, plan path) followed by the numbered
  load-bearing calls, then the pure exports:

  - `REPLAY_SLUG = "build-fieldwork-dispatch"`, `ARTIFACT_URL`, `TRACE_URL` — module-level literals.
  - `PLAYBACK_MS = 14000` — the total wall-clock budget for one autoplay. **This constant is the
    ONE reversibility seam for Open Question 1, and it is why the pacing decision is cheap rather
    than load-bearing.** `paceBeats` derives the scale from it, `describeRun` derives the on-screen
    compression sentence from that scale, and no other number anywhere is written by hand. Setting
    `PLAYBACK_MS = null` must mean *"play the real gaps"* — `paceBeats` then returns `scale === 1`
    and `describeRun` emits the wall-clock sentence instead. **Implement that branch now, not
    later**: it costs about six lines, it makes the alternative a one-constant change plus the VR
    `waitReady` timeout, and it means the product call in Open Question 1 can be reversed after the
    owner sees it running rather than re-planned.
  - `buildBeats(artifact, trace)` → `{ beats, meta, error }`. `beats` is an ordered array of
    `{ seq, kind, phase, op?, params?, text?, tool?, atMs }` built by walking the trace's steps in
    `seq` order and, for each, deciding:
      - the step's `seq` is some op's `fromStep` → `kind: "op"`, carrying that op's `op`/`params`/`atMs`;
      - `step.kind === "text"` → `kind: "note"`, `text: step.text`;
      - `step.kind === "tool" && step.denied` → `kind: "refusal"`, carrying `step.tool` and
        `step.error`;
      - anything else (a successful non-op tool call — the brief `Read`, the `--validate` run) →
        **skipped**, and the count of skipped steps is returned so the surface can state it rather
        than silently dropping steps.
    `atMs` for a non-op beat is derived from `Date.parse(step.ts) - Date.parse(meta.startedAt)` —
    which is exactly how `gen-replay` computes an op's `atMs` (see `replay/README.md`). Compute it,
    don't invent an index.
  - `paceBeats(beats, budgetMs)` → the same beats with a `delayMs` field: **the real gaps,
    proportionally.** `scale = budgetMs / (last.atMs - first.atMs)`; each beat's `delayMs` is its
    predecessor gap × `scale`, the first beat's is 0. Returns `{ beats, scale, realMs }` so the
    chrome can state the compression factor from computed numbers rather than a hand-written claim.
  - `applyBeat(board, beat)` → `{ board, changed }`. For `kind: "op"` it calls `applyOp(board, {op,
    params})` and returns the NEW board plus what changed (`{ kind: "place-added", placeId }` etc.),
    derived by DIFFING the before/after boards — not by re-implementing each op's effect, which
    would be a second opinion about `board-ops.mjs`'s semantics. For other kinds it returns the board
    unchanged.
  - `describeRun(artifact, meta, pacing)` → the plain-data chrome model: `{ label, model,
    startedAt, durationMs, sessionId, tracePath, briefPath, opCount, noteCount, refusalCount,
    scale }`. **Every value copied from the committed files, none computed as a claim.**
- **PATTERN**: `system/studio-compile.mjs:63-178` (pure layer over committed rules, totality by
  contract, "every number counted, none invented"); `system/studio.mjs:74-103`.
- **IMPORTS**: `import { applyOp, emptyBoard } from "./board-ops.mjs";` and
  `import { parseTrace } from "./trace-player.mjs";` — verified Node-import safe at planning time.
  Nothing else in the pure layer.
- **GOTCHA**: **Totality by contract.** A null artifact, a trace with no `meta`, a `fromStep` that
  resolves to nothing, junk in either file → return `{ beats: [], error: "<what was wrong>" }` and
  **never throw**. Both `studio.mjs:78-88` and `studio-compile.mjs:88` make the same call for the
  same reason: a bad fetch must not crash the page before the canvas exists.
- **GOTCHA**: **determinism.** No `Date.now()`, no counter, no random value reaches any returned
  string. `durationMs` and `startedAt` are *copied* from the committed meta and only ever formatted.
- **VALIDATE**: `node -e "import('./system/replay-driver.mjs').then(m=>console.log(Object.keys(m)))"`
- **SATISFIES**: AC #1, AC #2

### 2. UPDATE `tooling/build-checks.mjs` — a new group for the driver's pure layer

- **IMPLEMENT**: group **16 · replay-driver**, placed after group 15, and add its line to the group
  index block at the top of the file (:20-58). Drive the pure layer over the **REAL committed
  files** read with `readFileSync` (`replay/build-fieldwork-dispatch.json`,
  `traces/build-fieldwork-dispatch.jsonl`) plus synthetic junk:
  1. `buildBeats` over the real pair produces **18 op beats** — asserted against
     `artifact.ops.length`, not against a literal 18 — **7 note beats and 3 refusal beats**, again
     counted from the trace rather than typed.
  2. **The reproduce claim, restated at view time:** `beats.filter(kind==="op").reduce(applyBeat,
     emptyBoard())` deep-equals `replay/build-fieldwork-dispatch.board.json` **exactly**. This is
     the whole reason the driver can be trusted; `gen-replay` proves it at build time and this proves
     the *driver's* applier reaches the same board.
  3. **The mutation that decides whether case 2 is real** (group 11's discipline, `.claude` memory
     "the check that cannot fail"): corrupt one op's `params.label` in an in-memory copy and assert
     the deep-compare goes RED. Without this the comparison could be vacuously true.
  4. `paceBeats` — `delayMs` is real pacing, not an index: assert the *ratios* between consecutive
     delays match the ratios between consecutive `atMs` (within float tolerance), assert the sum is
     `budgetMs` within 1 ms, and assert `scale !== 1` for the real run (it is ~10.9×) so the chrome's
     compression claim is about a number that was computed.
  5. Determinism: `JSON.stringify(buildBeats(a, t))` from two independent parses is byte-identical.
  6. Totality: 8 junk inputs (`null`, `{}`, `{ops:null}`, a trace with no meta line, an op whose
     `fromStep` matches nothing, a trace whose `seq`s go backwards, `undefined`, a string) each
     return `{ beats: [] }` with a non-empty `error` and **never throw**.
  7. `describeRun` copies `label`, `model`, `sessionId`, `startedAt`, `durationMs` **verbatim** from
     the artifact's `source` and the trace's `meta` — asserted by identity against the parsed files,
     not by re-typing the strings.
- **PATTERN**: group 11 (:1470+) is the closest analogue — a pure projector driven over real and
  synthetic rows with an explicit mutation case. Group 15 (:2528) is the closest in shape.
- **GOTCHA**: the deep-compare must be the file's **hand-written recursive canonical stringify**, not
  `JSON.stringify(v, keys)` — group 13's header records that an array in stringify's second position
  is a *replacer*, which made every comparison vacuous until a mutation sweep caught it. Reuse the
  helper that already exists in this file.
- **VALIDATE**: `node tooling/build-checks.mjs` (16 ✓ lines, exit 0)
- **SATISFIES**: AC #1, AC #2

### 3. UPDATE `system/replay-driver.mjs` — the mount: chrome, controls, playback

- **IMPLEMENT**: `mountReplay(canvas, { board: onBoard, bus, root, onTakeOver })` returning
  `{ play, pause, step, seekTo, skipToEnd, destroy, get state(), get board() }`, plus
  `export const getReplay = () => live;`.

  Structure, in this order:
  1. **Boundary validation** — throw a plain `Error` naming what is missing if `canvas.stage`,
     `canvas.place`, `canvas.say` or `bus.emit`/`bus.on` are absent.
  2. **The chrome**, built element by element into the node `factory.html` provides
     (`[data-replay-chrome]`), inserted before the canvas scroller like `studio-verbs.mjs:345` and
     `studio-compile.mjs:232-234` do:
     - the honesty line: `meta.label` **verbatim** ("Real run, curated for length") + the artifact's
       `label` **verbatim** ("Projection of the real run build-fieldwork-dispatch"). Neither is
       paraphrased — `replay/README.md` says that wording is the artifact saying what it is.
     - the run's real meta: model · started · duration · session id.
     - a real `<a href="/traces/build-fieldwork-dispatch.jsonl">` to the curated trace, and one to
       `/replay/briefs/build-fieldwork-dispatch.md`. Paths come from `artifact.source`, so the link
       cannot drift from the artifact.
     - the **pacing sentence**, built from `paceBeats`'s computed `scale` and `realMs`: e.g.
       *"The run took 2 min 11 s. Played here at 10.9× so the gaps between steps stay the run's own,
       proportionally."* **Never claim wall-clock realism** — see Open Question 1.
     - a `[data-provenance]` line, initially "the run's work".
  3. **The controls** — real `<button>`s with visible text, plus one `<input type="range">` for seek:
     `Pause` / `Resume` (one button, label swaps), `Step`, `Skip to end`, and the range whose
     `max` is `beats.length` and whose `aria-label` names the step count. Every verb announces
     through `canvas.say` — **no second live region** (`studio-canvas.mjs:130-133` argues why).
  4. **The bus emitter.** One beat = one emit:
     ```js
     bus.emit({ type: "agent.build-op", source: "agent",
                target: { id: beat.targetId, label: beat.label },
                params: { op: beat.op, ...beat.params, seq: beat.seq } });
     ```
     and `type: "agent.note"` for narration/refusal beats. **`target.component` is omitted** — a
     board place is not a library component, and `studio-verbs.mjs:437-448` (#232) is explicit that
     `component` is the vocabulary shape and never a display string.
  5. **THE ONE CONSUMER**, `bus.on("agent.build-op", …)` — the only place the board changes and the
     only place the canvas is written. It calls `applyBeat`, then reflects:
     - `place-added` → build the block via the **`placeBlock` exported from `studio.mjs`** (see task
       6) and `canvas.place(block, { col, row: 1, name: place.label })`, `col` = the place's index+1,
       capped at `MAX_COLS` exactly as `arrangeBoard` does.
     - `place-renamed` / `affordance-*` → re-render that place's block and `canvas.place(existingWrapper,
       { col, row, name })` — `place()` is **idempotent and re-labels** (:299-325), so this moves
       nothing and fixes the handle's accessible name.
     - `place-removed` → `wrapper.remove()`. (`canvas` exposes no `remove()`; removing the wrapper
       node directly is correct and is what `studio-compile.mjs`'s SURPLUS branch already does.)
     - `connect` / `disconnect` → **no canvas node changes**; the board changed and the summary panel
       and the announcement carry it.
     A beat naming something not on the canvas → `canvas.say("Refused: …")` and return with the DOM
     untouched. **Never throw** (`studio-verbs.mjs:363-365`).
  6. **The scheduler.** A single `setTimeout` chain (not `setInterval`, not rAF — the gaps are
     hundreds of ms and a timer that skips a beat is worse than one that runs late). One pending
     timer id, cleared on pause/step/seek/destroy. After the last beat, call `settle()`.
  7. **`settle()`** — sets `[data-replay="settled"]` on the shell, announces the completion sentence
     once, calls `onBoard(finalBoard)` so the orchestrator can re-render the summary panel and hand
     the beat its board, and enables the compile button's precondition. Wrapped so it runs **exactly
     once**.
  8. **Reduced motion** — `matchMedia("(prefers-reduced-motion: reduce)").matches` at mount →
     **apply every beat synchronously**, no timers, then `settle()`. Stepping and seeking stay
     available (they are manual, so they are not "animation from interaction"). The Pause button is
     hidden in this branch (nothing is playing) — but Step/Seek/Skip stay.
  9. **`destroy()`** — copy `studio-compile.mjs:562-579`'s **ordering**: the `destroyed` flag first,
     then `ac.abort()` (which detaches listeners *and* rejects the in-flight fetches), then clear the
     timer, then remove the chrome nodes and the `data-replay*` attributes. Every `await` in the
     fetch path re-reads `destroyed` before touching the DOM.
  10. **`finally`** — `shell?.setAttribute("data-replay", <state>)` on **every** path: `"settled"`
      on completion, `"unavailable"` when a fetch or parse failed (with an honest card, never a
      console error — `studio-journey`'s no-page-errors contract is a real assertion), `"ready"` when
      the driver mounted but declined to run.
- **PATTERN**: `studio-compile.mjs:203-580` end to end — it is the closest structural sibling
  (control row before the scroller, state attribute, lazy fetch, `AbortController`, `destroyed` flag,
  `finally` handle, seam export).
- **IMPORTS**: `import { applyOp, emptyBoard } from "./board-ops.mjs";`,
  `import { MAX_COLS, clampSlot } from "./studio-canvas.mjs";`,
  `import { parseTrace } from "./trace-player.mjs";` (verify it is Node-import safe first — if
  `trace-player.mjs` touches the DOM at module scope, parse the JSONL locally instead and say why).
- **GOTCHA**: the fetches are **root-absolute** URLs (`/replay/…`, `/traces/…`), like every dynamic
  fetch in `studio.mjs:~190-230`. Static imports at the top stay relative because Node resolves those.
- **GOTCHA**: **zero inline styles, zero markup from a string** — this file joins `build-checks`
  group 7's `MODULES` list in task 12, with no exception argued.
- **GOTCHA**: `place()` announces on every call ("X in column N, row 1"). During autoplay that is 4
  announcements the reader did not initiate. **Accepted trade, recorded in the header:** the
  sentences are truthful, the region is `polite` so a screen reader coalesces, and the alternative —
  a suppression flag on `canvas.say` — would be an edit to `studio-canvas.mjs` that #204 deliberately
  did not have. The driver therefore adds only **act-transition and completion** sentences while
  autoplaying, and announces **per beat** only when the reader pressed Step or moved Seek.
- **VALIDATE**: `node -e "import('./system/replay-driver.mjs').then(()=>console.log('node-safe ✓'))"`
- **SATISFIES**: AC #1, AC #4, AC #5, AC #6

### 4. UPDATE `system/analytics.mjs` — the take-over route

- **IMPLEMENT**: at the end of the file, in a new `/factory` (epic #202) section:
  ```js
  const FACTORY_TOOK_OVER_PATH = "/factory/took-over";
  let tookOverFired = false;
  export function trackFactoryTookOver() {
    if (tookOverFired) return;
    tookOverFired = true;
    flipTo(FACTORY_TOOK_OVER_PATH);
  }
  ```
  With a comment recording: (a) it is called from `replay-driver.mjs`'s **handover success path
  only** — never from a settled-state flag, never from a slot, because the spine's analytics slot
  fires after the effect whether it succeeded or fell through (#75, and the recorded memory); (b) it
  uses **`flipTo`, not the simple `trackFactoryBuilt` shape**, because `/factory` carries the
  appearance dock (which writes `location.hash`) and #206's hash-routed inspector panels, so both the
  live-hash restore and the overlapping-flip protection are reachable here — and #210 is about to add
  two more routes to the same page, which is exactly the overlap case D exists for; (c) the literal
  is the entire payload — no slug, no seq, no board.
- **PATTERN**: `analytics.mjs:226-244` (`trackBuildPattern` / `trackBuildShared`).
- **GOTCHA**: do NOT reuse another event's `fired` flag — every event owns its guard, or whichever
  fires first suppresses the other (:64-67).
- **VALIDATE**: `node tooling/build-checks.mjs` (group 10 still green before you extend it)
- **SATISFIES**: AC #3, AC #8

### 5. UPDATE `system/replay-driver.mjs` — take-over + provenance

- **IMPLEMENT**: the handover.
  - Listen in the **capture phase** on the canvas viewport for `pointerdown` and `keydown`:
    ```js
    canvas.viewport.addEventListener("pointerdown", onTouch, { capture: true, signal });
    canvas.viewport.addEventListener("keydown", onTouch, { capture: true, signal });
    ```
    **Not by subscribing to `ui.move` on the bus** — and this is the load-bearing call: a gesture is a
    *preview*, and `studio-verbs.mjs` emits its one `ui.move` at the **drop**. Waiting for the bus
    would let the visitor drag a node while the replay is still placing others underneath them.
  - `onTouch` ignores events originating inside the driver's own chrome (its controls are canvas
    chrome, not canvas interaction — pressing Pause is not taking over).
  - It runs **exactly once** per page life, then removes itself. Body:
    1. if playing, `pause()` — and announce *"Replay paused — the canvas is yours."*;
    2. set `[data-provenance="visitor"]` and swap the chrome sentence to name both authors;
    3. `trackFactoryTookOver()` — **from this line, and only this line**;
    4. call the optional `onTakeOver` callback.
  - **It does not run when there was no run to take over**: if `[data-replay]` settled as
    `"unavailable"` (no artifact, failed fetch), the handover — and therefore the route — never
    fires. A visitor moving blocks on a canvas the replay never built has taken nothing over, and
    firing there would make the metric a lie. If the replay **completed**, the handover still runs:
    grabbing the wheel over the run's finished work is exactly the metric.
- **PATTERN**: `studio-verbs.mjs:733-736` (a document-level listener scoped to exactly one state) and
  `bus-toggles.mjs`'s consumer discipline.
- **GOTCHA**: capture-phase `keydown` on the viewport will see Tab and arrow keys used merely to
  *reach* a control. Decide and record: **Tab alone is not take-over** (it is navigation) — filter it,
  along with modifier-only keys. Everything else (Enter, Space, arrows, any pointer press on the
  stage) is.
- **VALIDATE**: manual, then `tooling/studio-journey.mjs` in task 11.
- **SATISFIES**: AC #3, AC #6

### 6. UPDATE `system/studio.mjs` — the orchestrator gives the canvas to the replay

- **IMPLEMENT**:
  - `export function placeBlock(entry)` — promote the existing module-private `placeBlock` to an
    export so the driver renders identical blocks. **Do not copy it into the driver**: "what a place
    looks like before it compiles is this file's sentence" (its own comment).
  - In `mountStudio`, after the canvas mounts and **before** the placement loop: if the build store
    carries no board of its own (`!isBoard(stored.board)` — always true on `/factory` today, since
    the store is in-memory), **skip the synchronous placement loop entirely** and let
    `mountReplay` build the canvas instead. If the store *does* carry a board (a future restore
    path), place it as today and mount the driver in a declined state — the visitor's own build is
    never overwritten by a replay.
  - Order of mounts stays: `place`(none) → `mountCanvasVerbs` → `mountCompile` → `mountReplay`.
    The verbs mount on an **empty** stage now; `createHistory`'s initial snapshot is `{}` and every
    node the replay places afterwards is a **post-mount placement**, which is precisely the case
    #230's `adopt` closes (`studio-verbs.mjs:181-202`, and the two call sites at :382 and :467). This
    is why nothing new is needed here — but **verify it on the running page**, because it is now the
    normal case rather than an edge one.
  - Pass the driver `onBoard(finalBoard)`, which at settle must do **three** things:
    1. re-run `buildSummary(finalBoard, answers)` and `renderSummary(...)`;
    2. recompute `arrangeBoard(finalBoard)`;
    3. **update the exported `live` object's `board`, `summary` and `arranged` fields.** This is not
       bookkeeping — `tooling/studio-journey.mjs:1218-1226` reads all three off the running page
       through `getStudio()` and asserts `slotCount === arranged === places`. Leave them at their
       mount-time values and that assertion goes red for a page that is actually correct.
  - **The compile beat gets a `getBoard` seam, decided rather than left as an either/or.**
    `mountCompile` destructures `board` at call time but reads it at **exactly one line**
    (`studio-compile.mjs:471`, inside `compile()`). So:
    ```js
    // studio-compile.mjs:203  — signature gains one optional field
    export function mountCompile(canvas, { board, getBoard, answers, bus, onState } = {}) {
    // studio-compile.mjs:471
    const result = compileSteps(typeof getBoard === "function" ? getBoard() : board, answers);
    ```
    Two lines, documented in both headers. **The rejected alternative was mounting the beat after
    settle**, and it is rejected for a concrete reason: `tooling/vt-verify.mjs:407` waits on
    `[data-studio-compile="ready"]` with a 20 s timeout, so deferring that handle behind a 14 s
    playback leaves a 6 s margin on a gate that runs on three engines. Keeping every mount and every
    `finally` handle at load — exactly where they are today — costs two lines and removes that
    fragility entirely.
  - Extend the `live` object with `replay`.
- **PATTERN**: the existing mount ordering comments at :~380-400 explain exactly why each mount
  follows the previous one — extend that reasoning, don't replace it.
- **GOTCHA**: `initGlossary(root)` stays **outside** the try/finally. The header has a full paragraph
  on why; a future reader's instinct is to tidy it inward.
- **GOTCHA**: `/factory`'s at-rest board **changes** from `draftBoard(DEFAULT_ANSWERS)` (3 places,
  dashboard) to the replay's board (**4 places · 7 affordances · 7 connections**). Verified: it still
  names `dashboard` (rule 1, from the answers) and `compileSteps` returns `state: "rendered"` with
  **4 slots → 4 metric-tiles**, so the compile beat's 1:1 branch still holds and no truncation
  occurs (4 < `MAX_COLS` 12). The "This build" panel's numbers all change — that is the point.
- **VALIDATE**: `node tooling/build-checks.mjs` (group 14 `studio` must stay green — `arrangeBoard`
  and `buildSummary` are untouched)
- **SATISFIES**: AC #1, AC #7

### 7. UPDATE `factory.html` — the chrome mount + honest lead copy

- **IMPLEMENT**:
  - a `<div data-replay-chrome></div>` inside `.stu-canvas-col`, above `[data-studio-canvas]`, with a
    comment in the shell's existing style explaining that `replay-driver.mjs` fills it and that it is
    empty in the markup because the driver appends (the `[data-studio-canvas]` precedent at :215-218).
  - a `<noscript>` sentence covering the replay, beside the existing one.
  - rewrite the `.beat-lead` paragraph: it currently opens *"Each block is one place a person can
    be…"* and describes a board that is simply there. It must now say the run assembled it, name the
    run, and say the canvas becomes the reader's the moment they touch it. **This is an at-rest copy
    change and it churns the baselines** — it is in scope for this ticket, not a follow-up.
  - add `<script type="module" src="/system/replay-driver.mjs"></script>`? **No** — the driver has no
    self-boot; `studio.mjs` imports and mounts it, like `studio-compile.mjs`. Do not add a tag.
- **GOTCHA**: the shell's comment block at :182-186 names `[data-studio="ready"]` as *"the
  visual-regression gate's one wait handle for this page"*. That sentence stops being true in task
  10 — update it here, in the same PR.
- **VALIDATE**: `npx serve .` → open `/factory.html`, watch the replay run to completion
- **SATISFIES**: AC #1, AC #6

### 8. UPDATE `system/studio.css` — the replay chrome block

- **IMPLEMENT**: `.stu-replay*` classes for the chrome, the control row, the seek range and the
  provenance line. Token-only — a literal here is a bug (`.claude/references/token-system.md`).
  Place the block beside the `.stu-compile*` block #207 added, with a header comment naming the
  ticket.
- **GOTCHA**: this file's `MAX_COLS`/`MAX_ROWS`/`ZOOM_LEVELS` mirror blocks are pinned **exhaustively
  and in both directions** by `build-checks` group 12. Do not touch them; do not add a rule that
  looks like one of them.
- **GOTCHA**: the chrome is in `studio.css`, **not** `components.css` — the ticket's file estimate
  says `components.css`, but #206 moved every studio class into `studio.css` and this chrome reaches
  no other page. Recorded as a deliberate divergence from the ticket's estimate.
- **VALIDATE**: `node tooling/build-checks.mjs` (group 12 green)
- **SATISFIES**: AC #4

### 9. UPDATE `tooling/build-checks.mjs` group 10 — the take-over route's contract

- **IMPLEMENT**: extend group 10 (do **not** create a group 17 — AC #8 says *"the analytics contract
  group in build-checks grows"*):
  - `trackFactoryTookOver` is exported and is a function.
  - a scenario on a **`/factory.html` URL carrying a hash** (`#shape` — a real deep link this page
    supports): the pushed path is exactly `"/factory/took-over"`, matches `/^\/factory\/[a-z-]+$/`,
    carries no query and no hash, and the URL — hash included — is restored **verbatim**.
  - fires **once**: called twice, one push.
  - the **overlap** case, both orderings, against `trackBuildPattern` — because `/factory` will carry
    three routes after #210 and the overlapping-flip trap is exactly what `flipTo` exists for.
  - update the `group("analytics", …)` detail string to name the third path.
- **PATTERN**: cases A–E at :1371-1461, verbatim in shape (the `stub()`/`moveTo()` helpers already
  exist; add scenarios, don't rewrite the harness).
- **GOTCHA**: each scenario needs its **own** `?g10x` import key, or it inherits the previous one's
  spent fire-once state (:1371-1374).
- **GOTCHA**: this group proves the **predicate**, not the wiring — that
  `trackFactoryTookOver()` sits on the handover success path is a running-page fact and belongs to
  `studio-journey`. Say so in the group's comment, like groups 9, 10, 11 and 13 already do.
- **VALIDATE**: `node tooling/build-checks.mjs`
- **SATISFIES**: AC #3, AC #8

### 10. UPDATE `tooling/visual-regression/visual.spec.mjs` — the settled handle

- **IMPLEMENT**: the `factory` page entry's `waitReady` becomes
  `['[data-studio="ready"]', '[data-replay="settled"]']` (the loop already accepts an array, :136-139).
  Extend the comment at :54-58 to say why: the at-rest state is now **autoplay-to-completion**, and
  `[data-studio="ready"]` fires at mount — long before the canvas holds anything.
- **GOTCHA**: **not `waitVisible`.** The replay starts at load with no IntersectionObserver gate, so
  `waitVisible` would drag it into the bounded re-measure loop for nothing — the same call the
  existing comment makes for `[data-studio="ready"]`.
- **GOTCHA**: the gate captures under **no-preference**, not reduced motion (recorded memory) — so
  the baseline sits through the full `PLAYBACK_MS` per shot (4 shots: factory × neutral/saulera, and
  the same for any pack). Budget `PLAYBACK_MS` accordingly; 14 s is the recommended ceiling.
- **VALIDATE**: deferred to task 13.
- **SATISFIES**: AC #7

### 11. UPDATE `tooling/studio-journey.mjs` — the replay pass, and the stale assertions

- **IMPLEMENT**:
  - **Fix what this ticket breaks — and the audit is already done, so this is mechanical.**
    `factoryPass` (:1200-1330) was written non-vacuously: it reads the board off the running page
    through `getStudio()` rather than asserting literals. That is why the damage is small and why
    task 6 step 3 is mandatory. Exactly this much changes:

    | Line | What it does | What it needs |
    |---|---|---|
    | :1211-1213 | waits on the three mount handles | **add** `await p.waitForSelector('[data-replay="settled"]', { timeout: 30000 })` after them — every assertion below is about the settled canvas |
    | :1218-1226 | reads `s.board.places` / `s.arranged` / `s.summary.patternId`, asserts `slotCount === arranged === places` | **survives unchanged** *if and only if* task 6 step 3 updates all three at settle |
    | :1224 | the label says "the DRAFTED board" | reword to name the replay's board — the assertion is right, the sentence stops being |
    | :1227-1228 | non-vacuity guard (`slotCount > 0`) | survives, and becomes more valuable |
    | :1277-1309 | keyboard move + the #232 `target.component` assertions on the first slot | **survives unchanged**, and now runs against a **post-mount, replay-placed** node — which is #230's case for free (see the Notes) |
    | :1232-1272, :1313-1325 | panels, arrow keys, style attribute, Act 0 | untouched by this ticket |

    Everything else in the pass is untouched. If any row above needs more than the change named,
    **stop** — it means `live.board`/`live.arranged` are not being kept true, which is the bug, not
    the assertion.
  - **The timeouts move together with `PLAYBACK_MS`.** `factoryPass`, `compilePass` and
    `vt-verify` all use 20 s waits. At `PLAYBACK_MS = 14000` the first `.stx-slot` appears at ~4.8 s
    and settle at ~14 s (computed from the real `atMs` span, 1363 → ~131000). Raising `PLAYBACK_MS`
    past ~16 s means raising those timeouts in the same PR — say so in the constant's comment.
  - **A new replay pass**, in the discipline `studio-journey` already holds — assertions phrased as
    *resulting DOM*, never "an action was emitted", which would pass with no consumer at all:
    1. **Determinism (AC #2), the gate requirement:** two independent loads → `stage.outerHTML` is
       **byte-identical**. #207's compile pass already makes this exact assertion for its beat; copy
       its shape.
    2. The settled board on the page matches `replay/build-fieldwork-dispatch.board.json` — 4
       wrappers, their `data-stx-name`s in board order, columns 1–4, row 1.
    3. `agent.*` and only `agent.*`: collect bus actions through the existing bus-capture seam and
       assert **every** action emitted before the first visitor interaction has a type starting
       `agent.` and `source === "agent"`. This is the AC's "emitting only `agent.*`".
    4. **Pause / Step / Seek by keyboard, each announced** (AC #4): focus each control, activate it
       from the keyboard, and assert the live region's text changed *and* the beat count advanced by
       the expected amount. Count announcements **per path** — the existing pass's lesson at #205 was
       that a naive once-per-gesture count sends an implementer to delete real feedback.
    5. **Take-over** (AC #3): on a **fresh page mid-replay**, one pointer press on a stage wrapper →
       the replay is paused (beat count stops advancing over 1 s), `[data-provenance="visitor"]`, and
       the address bar visits `/factory/took-over` **exactly once**. Assert the route by watching
       `history.pushState` through an init script, the way the analytics group's stub does — and
       assert the real URL comes back.
    6. **Take-over is one-shot**: a second interaction pushes nothing more.
    7. **Reduced motion** (AC #5): `reducedMotion: "reduce"` context → the settled board is present
       **immediately** (no timer chain), `[data-replay="settled"]` is set, and Step still works.
    8. The trace link resolves: `fetch('/traces/build-fieldwork-dispatch.jsonl')` from the page
       returns 200 (the existing `/build` journey checks its three links in the same way).
    9. No page errors and no console errors throughout — the existing contract.
  - Update the summary line at :1685.
- **PATTERN**: the whole file; specifically the three-source proof (:1290-1310) and the compile pass's
  request log and byte-identical-stage assertions (:1334-1440).
- **GOTCHA**: this driver is **operator-run, not in CI** — like `build-journey`, `vt-verify` and
  `proto-journey`. Run: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs all`.
- **GOTCHA**: mid-replay assertions race a 14 s playback. Use the seek control to park the replay at a
  known beat rather than sleeping, so the test is about state and not about timing.
- **VALIDATE**: `node tooling/studio-journey.mjs all` (all three engines green)
- **SATISFIES**: AC #1, #2, #3, #4, #5, #6

### 12. UPDATE `tooling/build-checks.mjs` group 7 — the new module joins the vetting invariant

- **IMPLEMENT**: add `system/replay-driver.mjs` to group 7's `MODULES` list, so its **zero inline
  style writes** and **no markup-from-string** are gated with no exception argued — the property
  `studio-canvas.mjs`'s call 3 exists to protect. Update the group's detail string.
- **VALIDATE**: `node tooling/build-checks.mjs`
- **SATISFIES**: AC #7 (indirectly — it is what keeps the baseline honest)

### 13. UPDATE `tooling/vt-verify.mjs` — /factory's expected transition count

- **IMPLEMENT**: `/factory`'s **load** now runs a 14-second timer chain writing to the stage.
  1. **Fix the race first — this is a real break, not a cosmetic one.** `vt-verify.mjs:289-290` and
     `:407-421` wait on `[data-studio-canvas="ready"]` / `[data-studio-compile="ready"]` and then
     immediately query `[data-studio-canvas] .stx-slot` and count `.ds-metric-tile`. Both handles
     now fire at **mount**, roughly 4.8 s before the first slot exists and 14 s before the board is
     complete. **Add `await …waitForSelector('[data-replay="settled"]', { timeout: 30000 })` to
     every `/factory` section before any slot or tile query**, and raise those sections' 20 s
     timeouts to 30 s. Without this, `vt-verify`'s compile section clicks "Compile the board" on a
     half-built canvas and its tile count is nondeterministic.
  2. Then assert the count is **zero** `::view-transition-*` pseudos across the whole replay (the
     driver names nothing and calls no `morph()`) — the same claim #207 made for the compile beat,
     but sampled **during** playback rather than only at rest, because a boot that opens zero
     transitions at rest tells you nothing about a beat chain that runs afterwards.
- **GOTCHA**: `vt-stack-audit` is **not** adopted as a gate here — hazard A still false-positives on
  2 of 7 IA pages and #190 is unfixed. Record that, don't wire it.
- **VALIDATE**: `node tooling/vt-verify.mjs all`
- **SATISFIES**: AC #7

### 14. UPDATE `system/param-manifest.json` + regenerate the counts

- **IMPLEMENT**: `/factory` entries for the new controls, following the file's counting rules
  (a row of related buttons counts as one control — see the existing
  `"system graph zoom controls (in / out / reset = one row)"` entry):
  - `{ "page": "/factory", "selector": ".stu-replay-controls button", "label": "replay transport (pause / step / skip = one row)", "note": "#209" }`
  - `{ "page": "/factory", "selector": ".stu-replay-seek", "label": "replay seek slider", "note": "#209" }`
- **VALIDATE**: `node agent-layer/gen-param-count.mjs && node agent-layer/gen-param-count.mjs --check`
- **SATISFIES**: the epic's standing per-ticket rule

### 15. REGENERATE `system/loc-summary.json`

- **IMPLEMENT**: `system/replay-driver.mjs` is a **new tracked source file**, so `approach.html`'s
  rendered numbers move. **`git add` the new file first** — `gen-loc-summary` reads git-tracked
  content, so a `--check` before staging is a false "no drift" (recorded memory).
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-loc-summary.mjs --check`
- **SATISFIES**: the epic's standing per-ticket rule

### 16. REGENERATE the baselines — factory ×2 AND approach ×2

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker`, from a **clean detached
  worktree under `/Users`** (the gate screenshots the dirty tree, and Docker cannot share
  `/private/tmp` — recorded memory). Four PNGs move: factory under neutral + saulera (the new at-rest
  canvas, the chrome, the new lead copy) and approach under both (the loc-summary numbers).
- **GOTCHA**: the epic's **baseline-collision rule** — do not run this concurrently with #210 or with
  any chrome ticket. If `main` moved, **merge `main` first, then re-run** `update:docker` before
  review (recorded memory: reviews validate the pre-merge tree).
- **GOTCHA**: `update:docker` will not rewrite a baseline whose only change is sub-perceptual — if a
  PNG you expected to move didn't, `rm` it and re-run (recorded memory).
- **VALIDATE**: `npm run test` in `tooling/visual-regression` (green), then `git status` shows
  exactly the four expected PNGs.
- **SATISFIES**: AC #7

### 17. Update the architecture map in `CLAUDE.md`

- **IMPLEMENT**: a `system/replay-driver.mjs` entry in the architecture map, in the house voice —
  what it is, the two committed files it joins, the `agent.*`-only rule, the take-over gradient, the
  pacing compression and why it is stated rather than hidden, and the one thing a future editor must
  not do (add a second mover). Also update the `system/studio.mjs`, `tooling/studio-journey.mjs` and
  `tooling/build-checks.mjs` entries where this ticket changed what they say.
- **VALIDATE**: read it back against `rules-check-drift`'s standard — is every sentence still true?
- **SATISFIES**: repo convention

---

## TESTING STRATEGY

There is **no test suite, no linter and no type-check in this repo** — don't hunt for one. "Done" =
run the surface you touched (CLAUDE.md). The gates below are the real ones.

### Unit-equivalent (CI, `node tooling/build-checks.mjs`)

Group 16 (new) drives the driver's pure layer over the **real committed artifact and trace** plus
synthetic junk. Group 10 (extended) drives the analytics predicate. Groups 7, 12, 14, 15 must stay
green — they cover files this ticket touches.

**The check must be able to fail.** Group 16's case 3 is the mutation that decides whether case 2 is
real; every #137 defect survived a green gate the same way — the check skipped the thing it tested.
Before declaring a group done, **mutate the source and watch it go red**.

### Integration-equivalent (operator-run)

`node tooling/studio-journey.mjs all` — the only thing that can see a running page. It is the sole
proof of: the single-consumer invariant, `agent.*`-only emission, the announcements, determinism of
the settled DOM, the take-over route firing from the success path, and the reduced-motion branch.

`node tooling/vt-verify.mjs all` — zero view transitions during playback.

`cd tooling/visual-regression && npm run test` — the pixel gate on the new at-rest state.

### Edge Cases (each needs a named check)

- The artifact fetch 404s → `[data-replay="unavailable"]`, an honest card, **no console error**, and
  the take-over route never fires.
- The trace fetch 404s but the artifact loads → ops still play, narration/refusal beats are absent,
  and the surface **states** that rather than silently showing a shorter run.
- An op whose `fromStep` resolves to no trace step → skipped, counted, stated.
- A visitor presses Step while autoplay is running → autoplay pauses (Step implies pause), one beat
  advances, one announcement.
- Seek backwards → the board is rebuilt from `emptyBoard()` up to that beat (**not** un-applied — ops
  have no inverse and `applyOps` is pure, so replaying the prefix is both simpler and provably the
  same board). The canvas is rebuilt to match; wrapper ids re-mint, which is fine because the visitor
  has not taken over yet — **assert this in the journey**, because a seek after take-over would
  destroy the visitor's arrangement. **Decide: seek is disabled once take-over has happened.**
- `destroy()` mid-playback → no further DOM writes, timer cleared, fetches aborted
  (`studio-compile.mjs`'s #236 lesson, driven by `studio-journey` at :1524-1621).
- Reduced motion + take-over → the handover still runs and the route still fires.

---

## VALIDATION COMMANDS

Execute every command. Zero regressions.

### Level 1: Syntax & node-import safety

```bash
node -e "import('./system/replay-driver.mjs').then(m=>console.log('exports:',Object.keys(m).join(' ')))"
node -e "import('./system/studio.mjs').then(()=>console.log('studio node-safe ✓'))"
node -e "import('./system/analytics.mjs').then(()=>console.log('analytics node-safe ✓'))"
```

### Level 2: The committed unit gate

```bash
node tooling/build-checks.mjs          # 16 ✓ lines, exit 0
```

Prove the SDK-free invariant locally (CI proves it by absence):

```bash
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
```

### Level 3: Drift + generated artifacts

```bash
node agent-layer/gen-replay.mjs --check
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-loc-summary.mjs --check
node tooling/drift-check.mjs
node tooling/validate-trace.mjs
```

### Level 4: Running-page gates (operator-run, all three engines)

```bash
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/vt-verify.mjs all
node tooling/build-journey.mjs all      # /build must be unaffected — it shares the store and the codec
```

### Level 5: Pixel gate + manual

```bash
cd tooling/visual-regression && npm run test
```

Manual, in a real browser (the gate's bundled Chromium has missed a real Safari/Chrome-stable bug
before — recorded memory):

1. `npx serve .` → `/factory.html`. The replay runs on arrival, narration and refusal beats appear,
   the board finishes as 4 places.
2. Press Pause mid-run, then Step three times, then Skip to end. Each announces.
3. Reload; drag a block **while the replay is running**. It pauses, provenance shifts, the address bar
   flashes `/factory/took-over` and comes back.
4. Reload with reduced motion on (macOS System Settings → Accessibility → Display → Reduce motion).
   The board is there immediately; Step still works.
5. Press **Compile the board** after the replay settles — 4 metric-tiles, one per place.
6. Tab through the whole canvas column with a screen reader on. No dead tab stop, no dangling IDREF.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — the driver plays `replay/build-fieldwork-dispatch.json` end to end, emitting only
      `agent.*`, and the finished canvas matches the run's real outcome (equals
      `replay/build-fieldwork-dispatch.board.json`).
- [ ] AC #2 — playing the same artifact twice produces a byte-identical settled DOM.
- [ ] AC #3 — the first canvas interaction pauses the replay and hands over; `/factory/took-over`
      fires exactly once, from the success path.
- [ ] AC #4 — pause / step / seek all work by keyboard, each announced.
- [ ] AC #5 — reduced motion jumps to the end state, manual stepping available, ready handle set.
- [ ] AC #6 — the replay chrome shows the run's real meta and a working link to
      `/traces/build-fieldwork-dispatch.jsonl`; provenance visibly shifts on take-over.
- [ ] AC #7 — factory baselines regenerated for the autoplay-completed at-rest.
- [ ] AC #8 — `build-checks` group 10 covers the new route: static literal path, no payload, fires
      once, real URL restored verbatim.
- [ ] `system/action-bus.mjs` and `system/board-ops.mjs` are **unedited**.
- [ ] Zero inline-style writes and zero markup-from-string in the new module (group 7).
- [ ] `param-manifest` + `param-count` + `loc-summary` regenerated; approach baselines moved.
- [ ] PR body carries `Closes #209`; plan, report and review committed in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's validation passed immediately
- [ ] All Level 1–5 commands executed
- [ ] Every new gate **mutated and watched go red** before being trusted
- [ ] `git status` shows exactly the expected files, including exactly four baseline PNGs
- [ ] `.claude/reports/` execution report + `.claude/code-reviews/pr-<N>-review.md` in the same PR
- [ ] Epic #202's ticket checkbox for #209 ticked

---

## OPEN QUESTIONS / ASSUMPTIONS

**These three are decisions this plan makes on the ticket's behalf. Object now if any is wrong —
each changes real work.**

### 1. Pacing is *proportional*, not wall-clock — and the compression is stated on screen

The ticket says "at the run's **real pacing**". The run is **131 seconds**, with ops spanning
`atMs` 45981 → ~121000. Autoplay-to-completion at literal wall-clock pacing means a visitor waits
two minutes before the canvas is finished, and the pixel gate waits two minutes **per shot** (four
shots). Neither is shippable.

**Decision:** preserve the gap **ratios** exactly — the shape of the pacing is genuinely the run's,
and the model's long pause before its first op is visible as a long pause — and scale the whole
playback into a `PLAYBACK_MS = 14000` budget (~10.9×). The chrome **states the factor and the real
duration**, computed from the committed numbers, never hand-written. The claim on screen becomes
*"the gaps between steps are the run's own, proportionally"* — which is true — instead of *"this is
how long it took"* — which would not be.

**This decision is cheap to reverse, deliberately.** Task 1 builds the wall-clock branch at the same
time as the compressed one: `PLAYBACK_MS = null` means "play the real gaps", `paceBeats` returns
`scale === 1`, and `describeRun` emits the wall-clock sentence. Switching is then **one constant plus
the VR/journey timeouts** — not a re-plan. So the owner can judge it running rather than in the
abstract, which is the right way round for a product call about how something *feels*.

*If literal wall-clock pacing is chosen*, the follow-on is bounded and known: the four pixel-gate
shots each wait ~131 s (≈9 min added to the gate), and the `waitReady` timeout in task 10 plus the
20 s waits in tasks 11 and 13 must all rise past that. Autoplay-to-completion survives as the at-rest
call either way — only the gate's patience changes.

### 2. Narration and refusal beats are read from the **curated trace**, not added as ops

Spike 1's verdict left this open *deliberately*: *"Should narration and refusal beats be ops, or read
from the curated trace? … It is decided with this evidence in hand, not before it."* The evidence it
handed over: the run carries **7 narration steps and 3 denials** that are not ops.

**Decision: read them from the trace.** Reasons, in order of weight:
1. #203's data model is board ops only, and an op has an *applier*. Narration has no board effect, so
   making it an op would put a beat in `board-ops.mjs`'s vocabulary that `applyOp` must no-op on —
   which weakens the reproduce check's meaning (*"applying the projected ops rebuilds the board
   exactly"*).
2. The curated trace is **already committed, already public, already validated**
   (`tooling/validate-trace.mjs`) and **already named in the artifact's `source`**. The driver
   quoting it directly means the chrome shows the run's own words rather than a generator's copy of
   them — which is the same argument `replay/README.md` makes for why the trace is the truth and the
   artifact is a convenience.
3. It requires **no change to `gen-replay.mjs`, no re-run and no re-projection** — the ops file stays
   byte-identical and its drift check stays green.

Cost, stated: the driver fetches two files instead of one, and a trace fetch that fails degrades to
ops-only — which task 11's edge-case check makes visible rather than silent.

### 3. `/factory`'s at-rest board becomes the **replay's** board

This is what "at-rest = autoplay-to-completion" means, and it is a bigger visible change than the
ticket's file list suggests. `/factory` today shows `draftBoard(DEFAULT_ANSWERS)` — 3 places,
dashboard. After this ticket it shows the fieldwork-dispatch run's board — **4 places, 7 affordances,
7 connections**. The "This build" panel's every number changes, and so does the compile beat's input.

**Verified before planning** (`node`, against the committed files): the new board still names
`dashboard` (rule 1, from the answers — the hub override does not fire), `compileSteps` returns
`state: "rendered"` with **4 slots → 4 metric-tiles**, and 4 < `MAX_COLS` so nothing truncates. The
compile beat's 1:1 branch — the only one the shipped page can reach — still holds.

**Assumption:** the visitor's own board (a future `?b=` restore on `/factory`) must never be
overwritten by a replay. Task 6 guards it, but no code path reaches that guard today, so it is
untested by construction. Recorded rather than hidden.

### Smaller assumptions

- **Seek is disabled after take-over.** Rebuilding the board from a prefix would destroy the
  visitor's arrangement. The alternative — seeking with the visitor's edits preserved — is a merge
  problem this ticket does not need to solve.
- **Tab alone is not take-over.** A keyboard reader Tabbing toward the Pause button has not grabbed
  the wheel; firing the metric there would inflate it.
- **The compile beat is not driven by the replay**, despite `studio-compile.mjs:186-188` anticipating
  it. See Non-Goals.
- **`parseTrace` is imported from `trace-player.mjs`.** Verified at planning time — that module
  imports cleanly under Node and exports `{ parseTrace, renderTracePlayer }`, so it is safe in the
  pure layer as well as the mount. Do not re-parse JSONL by hand.

---

## NOTES (open canvas)

### Why a second consumer is safe, and where it would stop being safe

`studio-verbs.mjs`'s header states the invariant as *"there is exactly one mover"* — one consumer of
`ui.move`. The replay adds a consumer of `agent.build-op`, which is a different thing entirely: it
changes the **board** and calls `place()` for **new** nodes. It never moves an existing wrapper.

The line not to cross is written at `studio-verbs.mjs:390-391`:

> *"an injected move CAN stack two components on one cell. That is the caller's business, and #209's
> replay only ever plays back slots a real gesture produced."*

The replay in this ticket plays back **no slots at all** — the artifact carries no arrangement (that
is #208's codec field, and this run predates any gesture). Columns come from board order, exactly as
`arrangeBoard` derives them. So the stacking hazard is not reached. **If a future replay artifact
ever carries positions, that sentence becomes the thing to re-read.**

### The `#230` case is now the normal case — and it is already covered, twice

`createHistory`'s initial snapshot used to be the real arrangement, because `studio.mjs` placed
everything before mounting the verbs. With the replay, the verbs mount on an **empty** stage and
every node arrives post-mount. It was an *edge* case; it is now the *only* case.

**Two mechanisms already handle it, and both were verified at planning time rather than assumed:**

1. **The history** — #230's `adopt` (`studio-verbs.mjs:181-202`) fills missing ids in **every**
   entry, and it is called from **both** call sites: at pick-up (`:467`, because a gesture previews
   before it commits) and in the consumer (`:382`, for a source with no gesture behind it). They
   compose precisely because `adopt` fills missing ids only. Nothing new is needed.
2. **The move handles** — #231's `armMoveHandles` (`studio-canvas.mjs:278-287`) is **forward-acting**:
   it sets an `armed` flag, and `place()` (`:313-315`) arms every handle it creates afterwards. So
   the verbs mounting before any node exists hands out no dead tab stop and no dangling IDREF. Again
   nothing new.

**Free coverage, and this is the part worth noticing:** `studio-journey.mjs:1277-1309` already
performs a keyboard move on `/factory`'s first slot. After this ticket that node is replay-placed,
so the existing assertions become a #230 regression test at no cost. Task 11 adds the **pointer**
path against a replay-placed node, because that is the load-bearing one — an injected move passes
against the broken design and did, 88/88, until a second node gave the consumer's call site its own
detector.

### The announcement policy, and why it is not obvious

Three sources want to speak into `canvas.say`'s single `polite` region during a 14-second autoplay:
`place()`'s built-in "X in column N, row 1", the driver's beat narration, and the verbs' move
sentences. Left alone that is ~25 announcements the reader never asked for.

The policy: **`place()` keeps its sentence** (it is true and #204 owns it), the driver adds only
**act-transition and completion** sentences while autoplaying, and it announces **per beat** only
when the reader drove the step. The rejected alternative — a quiet flag threaded into
`canvas.say` — is an edit to `studio-canvas.mjs` that #204 deliberately did not make, and it would
give every future caller a way to move something silently.

### What this ticket cannot prove, and who proves it

Following groups 9, 10, 11 and 13's discipline of **stating the boundary rather than implying
coverage**:

| Claim | Proven by | Not provable by |
|---|---|---|
| the pure join, the reproduce, the pacing ratios | `build-checks` group 16 (CI) | — |
| the route's path, payload, fire-once, restore | `build-checks` group 10 (CI) | — |
| that `trackFactoryTookOver` sits on the **handover success path** | `studio-journey` (running page) | build-checks — a predicate cannot see its call site |
| `agent.*`-only emission, the single consumer, determinism of the settled DOM | `studio-journey` | build-checks — no DOM |
| zero view transitions **during** playback | `vt-verify` | the pixel gate — it never interacts, and `update:docker` re-baselines this class of bug |
| the at-rest pixels | the VR gate | the journey drivers |

### Sequencing risk, and the protocol that closes it

Task 16 (baselines) must be **last**, and it must not run concurrently with #210 — the epic's
baseline-collision rule is explicit that two PRs regenerating the same PNGs from different trees
*silently re-baseline each other's regressions*. This is not a merge conflict; it is worse, because
it is silent and green.

**Checked at planning time: #210 is OPEN and unstarted, and there are zero open PRs on the repo.**
So this branch owns factory's baselines today. The protocol, in order:

1. Task 0 re-checks `gh issue view 210 --json state` and `gh pr list --state open`. Anything in
   flight → sequence with the owner before writing code, not after.
2. Baselines are regenerated **once**, at task 16, after every gate is green — never speculatively
   mid-implementation.
3. Immediately before requesting review: `gh pr view <N> --json mergeStateStatus`. If `main` moved,
   **merge `main` first, then re-run `update:docker`** — a review validates the pre-merge tree, and
   a baseline regenerated from a stale tree is exactly the silent failure above.
4. If #210 lands first, step 3 is mandatory rather than conditional.

### Why the risk list is shorter than it looks

Four of this ticket's five risks turned out to be **already handled by the tickets that anticipated
it**, and that is worth stating rather than re-discovering:

| Risk | Closed by | Verified how |
|---|---|---|
| post-mount placement breaks undo | #230's `adopt`, called from both sites | read `studio-verbs.mjs:181-202, 382, 467` |
| verbs mounting before any node → dead tab stops | #231's forward-acting `armMoveHandles` | read `studio-canvas.mjs:278-287, 313-315` |
| the compile beat needs a board it doesn't have yet | a 2-line `getBoard` seam at the one line that reads it | `board` used only at `studio-compile.mjs:471` |
| `studio-journey`'s `/factory` assertions go stale | they read the page's own seam, not literals | audited line by line, table in task 11 |

What is genuinely new, and therefore where the care belongs: the **`agent.*` consumer**, the
**take-over discriminator**, and the **timing** every existing gate now has to wait through.

### One-pass confidence: 9.5/10

What earns it: every seam this ticket plugs into was built by a ticket that named #209 explicitly and
pre-made its call (#204's `place()`, #205's single consumer and `getVerbs()`, #206's orchestrator,
#207's `getCompile()` and teardown discipline, #230's `adopt`, #231's forward-acting arm). The three
product-level decisions are made and justified above rather than left to the implementer, the one
that is genuinely a matter of taste (pacing) is built reversible by a single constant, and the four
gate breakages this ticket causes are enumerated with line numbers instead of left to be discovered.

The remaining half-point is honest and is not removable by more planning: **the take-over
discriminator is a judgement about human intent** — which keystrokes and presses mean "I am grabbing
the wheel" versus "I am reaching for a control". Tab is excluded, the driver's own chrome is
excluded, and everything else counts; that is a defensible line, but it is the one thing here that
can only really be judged by using the page. Expect one round of adjustment after the first hallway
look, and treat that as the design working rather than the plan failing.

## AMENDMENTS

- 2026-08-05 — hardening pass before implementation, in response to the risk review. Added task 0
  (five pre-flight checks); made `PLAYBACK_MS` an explicit reversibility seam with the wall-clock
  branch built up front; replaced task 6's mount-order either/or with the decided two-line `getBoard`
  seam (rejecting mount-after-settle on the measured `vt-verify` 20 s margin); replaced task 11's
  "assertions will go stale" with a line-by-line audit table showing they survive if `live.board` /
  `live.arranged` are updated at settle; added the `vt-verify` slot/tile **race** as a real break to
  fix rather than a cosmetic edit; recorded that #230 and #231 already cover the post-mount case and
  that `studio-journey:1277-1309` becomes free regression coverage; added the baseline-collision
  protocol with #210's checked state. No scope change.
