# Feature: feature proposals from a finished discovery package (#359)

The following plan should be complete, but it is important that you validate documentation, codebase
patterns and task sanity before you start implementing.

Pay special attention to the naming of existing utils, types and modules. Import from the right files.

**Read `discovery/prd-projection.mjs` in full before writing a line of `discovery/proposals.mjs`.** The new
module is that module's sibling and mirrors its two-halves shape, its refusal style and its containment
rules. Nearly every design question this plan does not answer is answered there.

---

## Feature Description

A finished discovery run package holds decisions, their evidence, their parents and their kill criteria.
`prd.md` lays them out. Nothing turns them into **candidate features**, so the owner does that step in
their head or in a terminal, which is the same gap epic #279's problem statement names one layer down:
the work happens somewhere the factory cannot read.

This ticket puts a model on that step and keeps it structurally unable to corrupt the record. A model
reads a finished package and writes **proposals** into their own file. The owner gives each one a
**verdict**. A proposal has no route into the requirement hierarchy except through the owner answering a
banked question in a session, where the existing pipeline files it from their own words.

## User Story

As the owner of a finished discovery run
I want a model to propose candidate features from what the run actually recorded, each resting on named
decisions and carrying its own kill criterion, and I want to accept, refuse or park each one
So that the step between "the run is done" and "the canvas composes screens" happens where the factory
can read it, without a model ever writing a claim into the requirement record.

## Problem Statement

`discovery/prd-projection.mjs` is a **pure fold**: every claim on the page resolves to one of five
sources (an op's own params, an answer resolved by `answer_ref`, a bank question resolved by
`question_id`, the applier's derived fields, `run.json`'s header) and nothing else has a route.
`tooling/build-checks.mjs` group 31 proves it by deleting each rung and watching every claim vanish
(case 31.7.1).

The obvious way to get candidate features — have a model read the package and write features into
`prd.md` — destroys that guarantee permanently and silently. So the proposal has to sit **beside** the
record, never in it, and it has to be structurally impossible for a proposal to become a decision
without a human act.

## Solution Statement

Two new declared files in the run package, and one pure module that owns their shapes:

- **`proposals.jsonl`** — append-only, two line types. A `proposal` line is the model's; a `verdict`
  line is the owner's, server-written on a click.
- **`proposals.md`** — a second pure projection, beside `prd.md` and never inside it, with its own
  honesty header naming who wrote each half.

`discovery/proposals.mjs` is the pure module: the two line shapes, the four refusals, the derived status
and the projection. `portal/lib/discovery-proposer.mjs` is the SDK half: one fenced Agent SDK call over
the finished package, one in-process MCP tool, its own prompt and its own fingerprint. Three portal
routes and a verdict UI in the discovery drawer.

`discovery/prd-projection.mjs` is **not edited** except to add the `export` keyword to three existing
containment helpers (see D3 below), and `discovery/ops.mjs` is not edited at all.

## Out of Scope / Non-Goals

- **Not included: any new op verb, param or applier change.** The epic's op-verb lock is not taken.
  `discovery/ops.mjs` and its group 29 fixtures are untouched.
- **Not included: any change to how the fence decides for a discovery session.** T8a adds two
  **defaulted** opts to `portal/lib/discovery.mjs` (`extraTools`, `write`) so one predicate serves two
  kinds of run. `allowsToolName` is **not** widened, no existing group-30 case changes behaviour, and
  the mirror case proves `extraTools: []` is byte-identical to the argument being absent. See D4.
- **Not included: any edit to either shipped posture's prompt text**, to `TOOL_DESCRIPTIONS`, to
  `FINGERPRINT_INPUTS` or to `fingerprintOf`. `POSTURES.think.fingerprint` and
  `POSTURES['think-opus'].fingerprint` must not move (AC #5). See D2 for the trap.
- **Not included: any change to `prd-projection.mjs`'s output**, its `SECTIONS`, its renderers or its
  refusals. The only edit is three `export` keywords (D3), proven byte-neutral over all six committed
  `prd.md` files.
- **Not included: a route from `accepted` into the requirement hierarchy.** There is no verb, no
  migration and no import path. `accepted` records that the owner liked it, nothing more.
- **Not included: `#319`'s inbox**, the canvas, `screen.compose`, or anything on the build half. This
  ticket produces the queue #319 will later read; it does not build the surface.
- **Not included: a second proposal run per package.** A package that already carries proposal lines
  refuses a fresh run without an explicit force (D5).
- **Not included: an Opus-vs-Sonnet comparison for proposing.** #348 measured *judging*, and that number
  does not transfer. The plan runs one model, names it in the report, and says the question is open.
- **Not changing:** `answers.jsonl` (server-written, verbatim, and this ticket writes nothing to it),
  `transcript.jsonl` (this ticket appends no line of any type to it), or `run.json` (this ticket writes
  no field, including `turnStats` — see R1 below, this is what protects AC #4).
- **Not changing:** `tooling/drift-check.mjs`. `proposals.md` is drift-guarded by group 34 case 34.11
  instead, the way group 33 case 15 guards each graded package's `prd.md`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (six surfaces, a paid real run, and one guarantee that must be shown
byte-identical rather than argued)
**Primary Systems Affected**: `discovery/` (the pure half) · `portal/lib/discovery.mjs` (two defaulted
fence opts) · `portal/lib/discovery-proposer.mjs` (the SDK half) · `portal/server.mjs` (three routes) ·
`portal/public/` (the verdict UI) · `tooling/build-checks.mjs` (group 34 + six group-30 cases) ·
`discovery/README.md`
**Dependencies**: `@anthropic-ai/claude-agent-sdk` and `zod` — both already in `portal/package.json`,
neither new. No new dependency of any kind.

## Related Work

**Implements**: [#359](https://github.com/linardsb/ux-factory/issues/359) · **Epic**:
[#295](https://github.com/linardsb/ux-factory/issues/295), architecture doc
`docs/epics/canvas-design-import.architecture.md` §Addendum 2026-08-28

**Back-references** (plans and decisions this builds on or inherits from):

- `docs/epics/canvas-design-import.architecture.md:378-400` — §Addendum 2026-08-28, "the owner drives".
  The principle inherited verbatim: *the owner initiates and admits; the agent drafts inside fences.*
  D5 (#320) supplies the `proposed` / `accepted` / `refused` vocabulary; D1 (#319) names "agent
  proposals awaiting a verdict" as an inbox queue.
- `docs/epics/discovery-partner.architecture.md` — §Data model (the op table, R2, refuse-vs-flag, the
  run package), §Boundaries & contracts (the honesty surfaces, the read fence).
- `discovery/README.md` — the run-package contract. This ticket adds a §Feature proposals section and
  two rows to §Files.
- `.claude/plans/discovery-prd-projection-290.html` — #290's plan, for the fold this one mirrors.

**Forward-references**: #319 (the inbox — will read `foldProposals` as a queue).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

| File | Lines | Why |
|---|---|---|
| `discovery/prd-projection.mjs` | **all 768** | **The module to mirror.** Its header (1-56) states the two-halves split, the load-bearing property, the no-clock and no-truncation rules. `fold`/`cell`/`blockquote` at 87/91/96 are the containment primitives. `SECTIONS` at 156-244 is the declared-`empty`-per-row table. `checkOpLines` at 259-352 is the refusal style to copy verbatim in tone. `projectPrd` at 641-680 is the page assembly. `readPackage` at 706-729 and `writePrd` at 731-743 are the filesystem shell. |
| `discovery/ops.mjs` | 1-110 | The six invariants in the header — especially 1 (no parameter carries answer text) and 5 (refs are `seq`s and the applier assigns them). `OPS` 46, `PARAMS` 52, `LEVELS` 61, `FLAGS` 64. **Do not edit this file.** |
| `discovery/README.md` | 65-90 (§Files), 160-226 (§File shapes), 516-596 (§The read fence, §Workflow) | The contract this ticket extends. §File shapes is the exact style the two new line shapes must be documented in. |
| `portal/lib/discovery.mjs` | 44-49, 65-110, 164-220, 222-300, 437-510, 557-571 | `resolveRunRoot` 85, `assertProvenanceRoot` 97, `assertRunSlug` 78, `allowSetFor` 182, `allowsPath` 195, `fenceDecision` 211, `READ_TOOLS` 170, `BANK_PATH` 164, `nextRef` 224 (the id-allocator pattern), `appendTranscript` 261 (the append-only discipline), `readRun` 439, `withDiscoveryRunLock` 565, `turnEvent` 589 (the SSE whitelist pattern). |
| `portal/lib/discovery-transport.mjs` | 33-80, 86-129, 144-220 | `zodFor` 65-80 (the type-code → zod table), `buildOpServer` 86-129 (the `tool()` shape, `state` holder, the `{ isError: true }` result), the `query()` options object 154-175 (`strictMcpConfig: true` at 170 is load-bearing), the message loop 181-217. **`MAX_TURNS = 6` at :50 and `MAIN_TOOLS = Object.freeze([])` at :57.** |
| `portal/lib/discovery-postures.mjs` | 1-45, 79-93, 113-175, 220-268 | `PROVENANCE_RULE` 79 (import it, do not copy it), `TOOL_DESCRIPTIONS` 116, `fingerprintOf` 240, `POSTURES` 250. **Read 220-243 twice** — `fingerprintOf` hashes `JSON.stringify(TOOL_DESCRIPTIONS)`, which is the trap in D2. |
| `portal/server.mjs` | **all 276** | The route dispatch. `/api/discovery/prd` at 201-212 is the exact shape to mirror for a read route; `/api/discovery/turn` at 213-244 for an SSE route; `/api/discovery/close` at 187-192 for a JSON POST. **Every parameter named, never `{ ...body }`** (224-226). |
| `portal/public/portal.js` | 674-963 | The discovery drawer. `renderDiscoveryRecorded` 811-836 is the list-rendering pattern; `discoveryLog` 838-844 the SSE log; the `#discovery-prd` handler 906-930 the fetch-refusal-as-prose pattern; the form submit 847-904 the SSE reader loop. `esc()` is the escaper — find it near the top of the file. |
| `portal/public/index.html` | 145-213 | The drawer's markup. The verdict UI mounts inside `#discovery-session`, after `#discovery-recorded`. |
| `tooling/build-checks.mjs` | 140-175 (header list), 255-280 (`ok`/`group`), 6705-7252 (group 31), 7779-7787 (the verdict) | The harness. `ok(condition, message)` 269, `group(name, detail)` 274. Group 31's helpers at 6720-6760 — **`same`, `esc`, `fold`, `present`, `headings`, `sectionBody`, `blockOf`** — and the injection battery at 7180-7250 are what case 34.9 re-runs. |
| `tooling/build-checks.mjs` | 7353-7778 (group 33) | Case 33.15 at the very end is the pattern for gating on a committed package's existence and asserting `prd.md` equals the projection's bytes. |
| `discovery/allergen-matrix-1/` | `run.json`, `transcript.jsonl` (105 lines, 30 op lines), `prd.md` (402 lines) | The real run's subject. Full-depth, fictional, closed (`endedAt` set), 30 recorded ops. |
| `.claude/references/gates.md` | 11, and the group rows | The gate stack doc. Heading says "33 pure groups"; a group-34 row goes after group 33's. |
| `CLAUDE.md` | the architecture map's `discovery/` line and `tooling/` line | `build-checks.mjs` is described as "33 PURE groups"; the `discovery/` map line lists `bank.mjs · ops.mjs · prd-projection.mjs · README.md` and needs `proposals.mjs`. Also the "New discovery op verb or run" bullet under §Where new code goes. |

### New Files to Create

- `discovery/proposals.mjs` — **pure.** The two line shapes, the four refusals, the derived status, the
  `proposals.md` fold, and a thin filesystem shell. No SDK, no zod, no clock, no network. ~420 lines.
- `portal/lib/discovery-proposer.mjs` — the SDK half. One fenced `query()`, one in-process MCP tool, its
  own prompt constants, its own fence, its own fingerprint. ~300 lines.
- `.claude/reports/discovery-proposals-359-report.md` — the run report: which model, the cost, the turn
  count, every refusal the run hit, and the verdict distribution.

### Files to Modify

- `discovery/prd-projection.mjs` — **three characters of change**: add `export` to `fold` (:87), `cell`
  (:91) and `blockquote` (:96). Nothing else. Proven byte-neutral by the six-package hash compare.
- `portal/lib/discovery.mjs` — **T8a: two defaulted opts, `extraTools` and `write`**, so the proposal
  run reuses the one fence instead of duplicating it. `mainTools` is the precedent; no existing
  group-30 case changes behaviour. **Read the header at :1-43 and `fenceSite` at :313-362 before
  touching it** — this is the module group 30 drives most exhaustively.
- `portal/server.mjs` — three routes.
- `portal/public/portal.js` + `portal/public/index.html` + `portal/public/portal.css` — the verdict UI.
- `tooling/build-checks.mjs` — group 34, six new cases in **group 30**, the header list entry, and the
  count in all six places it lives.
- `discovery/README.md` — §Files rows, a §Feature proposals section, §Workflow commands.
- `CLAUDE.md` — the `discovery/` map line, the `tooling/` "33 PURE groups" count, and a §Where new code
  goes bullet.
- `.claude/references/gates.md` — the heading count and a group-34 row.
- `discovery/allergen-matrix-1/proposals.jsonl` + `proposals.md` — the recorded run's output, committed.

### Relevant Documentation

- [Claude Agent SDK — in-process MCP tools](https://docs.claude.com/en/api/agent-sdk/typescript#tool)
  — `tool(name, description, rawZodShape, handler)` and `createSdkMcpServer({ name, version, tools })`.
  Why: the proposer declares one tool the same way `buildOpServer` declares four.
  **The repo's own usage at `portal/lib/discovery-transport.mjs:86-129` is the authoritative example;
  prefer it over the docs where they differ.**
- [Claude Agent SDK — `canUseTool` and hooks](https://docs.claude.com/en/api/agent-sdk/typescript#options)
  — `PermissionResult` is `{ behavior: 'allow', updatedInput }` or `{ behavior: 'deny', message }`; a
  `PreToolUse` hook denies with
  `{ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason } }`.
  Why: the proposer wires both sites itself (D4).
- [CommonMark — ATX headings](https://spec.commonmark.org/0.31.2/#atx-headings) — up to three leading
  spaces are tolerated; the line ending is LF, a CR not followed by LF, or CRLF. Why: this is the exact
  reasoning behind `fold`'s `[\r\n]` character class and group 31's three-EOL battery, and case 34.9
  re-runs it against the new fold.
- `docs/research/requirements-hierarchy.md` — the BABOK ladder. Why: `rests_on` names decisions on that
  ladder, and the projection renders each one's rung.

### Patterns to Follow

**Module header = the specification** (CLAUDE.md §Ground rules). Both new modules open with a header
citing the governing doc and stating the invariants they own. `discovery/proposals.mjs`'s header must
state: the four refusals, the two-halves split, the no-clock rule, why the id is server-assigned, why
`proposals.md` is regenerated rather than refuse-to-overwrite, and why the module imports nothing from
`portal/`.

**Errors** — a plain `Error` whose message names the offending value, prefixed with the module name:

```js
// discovery/prd-projection.mjs:260
const bad = (msg) => { throw new Error(`prd-projection: ${msg}`); };   // ← proposals.mjs: `proposals: ${msg}`
// portal/lib/discovery.mjs:51
const bad = (msg) => { throw new Error(`discovery: ${msg}`); };
```

**Absent vs empty vs junk** (`discovery/ops.mjs` invariant 3): a *missing* field throws naming the op and
the field; an *empty* one is flagged. **This ticket inverts that for proposals on purpose** — refusals 1
and 2 refuse an empty `rests_on` and an empty `wrong_if`, because a session must not deadlock but a
proposal resting on nothing has no reason to exist. Say so in the header.

**The id allocator** — mirror `nextRef`:

```js
// portal/lib/discovery.mjs:224
export const nextRef = (answers) => `a${(Array.isArray(answers) ? answers.length : 0) + 1}`;
```

but **count from the max existing id, not the length**, because `proposals.jsonl` interleaves two line
types and a length-based counter would collide after the first verdict.

**Containment** — the two routes text takes onto the page, from `prd-projection.mjs`:

```js
// :87 — for AGENT-AUTHORED values that reach the page as markdown STRUCTURE. 1:1, never a trim.
const fold = (s) => String(s).replace(/[\r\n]/g, " ");
// :91 — table cells only, on top of the fold.
const cell = (s) => fold(s).replace(/\|/g, "\\|");
// :96 — how ALL arbitrary prose reaches the page: a leading `#` inside `> ` is not a heading.
const blockquote = (text) => { /* splits on LINE_ENDING, `> ` prefix, `>` for a blank line */ };
```

**A whitelisted projection, never an inline shape in the route** — `turnEvent`
(`portal/lib/discovery.mjs:589`) and `stepEvent` (`portal/lib/builder.mjs`). The route holds no shape
opinion; the projection is exported and the gate drives it.

**Every route parameter named** (`portal/server.mjs:224-226`): never `{ ...body }` on a route a
cross-origin page can POST to.

**Guard order on every discovery route** — `resolveRunRoot({ provenance, slug })` then
`assertProvenanceRoot(provenance, root)`, exactly as at `portal/server.mjs:181-182`, `189-190`, `204-205`.

**Build-checks style**: build fixtures inline, drive the real function, and **prove each refusal can go
red by mutation** — the repo's own rule, and the one every #137 defect broke
(`.claude/references/gates.md`). Match a refusal against the value it must name:

```js
const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
const names = (fn, ...needles) => { /* returns null on success, a description on failure */ };
ok(names(() => f(bad), "rests_on", "seq") === null, "...");
```

---

## IMPLEMENTATION PLAN

### Phase 1 — the pure module and its gate

The whole of `discovery/proposals.mjs` plus build-checks group 34, driven over synthetic fixtures. No
portal, no SDK, no tokens. This phase alone satisfies AC #1, #2, #3 and #4, and it is the phase that must
be right before a penny is spent.

**Tasks:** the three `export` keywords in `prd-projection.mjs` with the six-package byte proof · the
constants, the two line-shape checkers, the four refusals, the derived status, the fold, the filesystem
shell · group 34 with the injection battery re-run and the `prd.md`-unchanged proof.

### Phase 2 — the fence widening, then the SDK half

**Depends on:** Phase 1 (the proposer calls `checkProposalLines` before it appends anything).

Two tasks, in order. **T8a first**: `portal/lib/discovery.mjs` gains two defaulted opts so there is one
fence rather than two, with six new group-30 cases driving them both ways. **Then T9**:
`portal/lib/discovery-proposer.mjs` — the prompt, the package brief, the one MCP tool, the reused
fence, its own fingerprint, and a `--dry` preflight that spends nothing.

### Phase 3 — the portal surface

**Depends on:** Phase 2 (the propose route calls the runner).
**Independent of:** the verdict route's UI half, which only needs Phase 1's fold — but they land in one
PR, so sequence them.

Three routes in `portal/server.mjs`, the verdict UI in `portal.js` + `index.html` + `portal.css`.

### Phase 4 — the real run and the verdicts

**Depends on:** Phase 3. **Spends real tokens.**

One recorded proposal run over `discovery/allergen-matrix-1/`, then a verdict on every proposal through
the drawer, then the report. Never hand-written, never hand-edited; a bad run is re-run.

### Phase 5 — docs and the gate count

**Depends on:** Phases 1-4 (the README's numbers and the report's figures come from the real run).

`discovery/README.md`, `CLAUDE.md`, `.claude/references/gates.md`, the report.

---

## STEP-BY-STEP TASKS

### T0 · RECORD the baseline that AC #4 and AC #5 are measured against

- **IMPLEMENT**: before touching anything, capture the two baselines this ticket must not move. Paste
  the output into the PR body.
- **VALIDATE**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  shasum -a 256 discovery/*/prd.md
  for d in discovery/*/; do [ -f "$d/run.json" ] && printf "%-22s %s\n" "$(basename $d)" \
    "$(node discovery/prd-projection.mjs --root $d --stdout | shasum -a 256 | cut -c1-16)"; done
  node -e "import('./portal/lib/discovery-postures.mjs').then(m=>console.log('think',m.POSTURES.think.fingerprint,'\nthink-opus',m.POSTURES['think-opus'].fingerprint))"
  node tooling/build-checks.mjs | tail -3
  ```
- **GOTCHA**: the observed baseline on `main` at planning time (2026-09-03) — the projections and the
  committed files agree, so **the committed `prd.md` files are the projections' bytes**:

  | package | `prd.md` sha256 (first 16) |
  |---|---|
  | allergen-matrix-1 | `096643ee607a250c` |
  | bracket-trace-1 | `bda06c6fc7765b41` |
  | bracket-trace-2 | `7e9454aee381bbb3` |
  | graded-opus-a | `303b0907a2a37feb` |
  | graded-think-a | `b9bd322df0781ee9` |
  | instrument-loans-1 | `854edc1c47e3450b` |
  | spine-meridian-1 | projection `71e5b099c42c9397`, no committed `prd.md` |

  `POSTURES.think.fingerprint` is `df6fbc35a5d91537dc417288b67c123e` (read it off any
  `run.json`'s `turnStats[].postureFingerprint`; `discovery/allergen-matrix-1/run.json` carries it).
  Re-derive `think-opus`'s from the command above rather than trusting this line.
- **SATISFIES**: AC #4, AC #5 (the measurement they are checked against).

---

### T1 · UPDATE `discovery/prd-projection.mjs` — export the three containment helpers

- **IMPLEMENT**: add the `export` keyword to exactly three declarations, and nothing else:
  ```js
  export const fold = (s) => String(s).replace(/[\r\n]/g, " ");            // was :87
  export const cell = (s) => fold(s).replace(/\|/g, "\\|");                // was :91
  export const blockquote = (text) => { … };                               // was :96
  ```
  Extend each one's existing comment by one sentence naming `discovery/proposals.mjs` as the second
  consumer: the CRLF logic in `fold` and the bare-CR logic in `blockquote` are each a hole this repo
  already found once, and a second **production** copy would let one be fixed while the other stays
  broken.
- **GOTCHA — this does not, and must not, remove the gate's own copies.** `tooling/build-checks.mjs`
  declares a *local* `fold` at :6732 and a local `esc` at :6731, with the comment "Mirrors the module's
  fold EXACTLY … A one-space copy here would build a match set the page never contains." That
  duplication is deliberate: **the assertion side has to mirror independently or it proves nothing.**
  Group 34 declares its own local copies for the same reason (T8). The export removes the duplicate in
  *production*, not in the gate.
- **PATTERN**: `discovery/prd-projection.mjs:69-108` — the helper block, and its header at :80-89 which
  documents exactly why `fold` uses a character class rather than `/\r\n|\r|\n/`.
- **GOTCHA**: `LINE_ENDING` (:86) is used by `blockquote`; leave it module-private — `proposals.mjs`
  needs the functions, not the regex. **Do not** move, reorder or reformat these declarations: they sit
  above `SECTIONS` on purpose (the temporal-dead-zone comment at :66-68).
- **VALIDATE**: the discriminating check — `export` must change zero bytes of output:
  ```bash
  for d in discovery/*/; do [ -f "$d/run.json" ] && printf "%-22s %s\n" "$(basename $d)" \
    "$(node discovery/prd-projection.mjs --root $d --stdout | shasum -a 256 | cut -c1-16)"; done
  # every line must equal T0's table
  shasum -a 256 discovery/*/prd.md   # unchanged
  node tooling/build-checks.mjs      # group 31 still green
  ```
- **SATISFIES**: AC #3 (one copy of the containment, so the battery tests the real thing).

---

### T2 · CREATE `discovery/proposals.mjs` — the constants and the two line shapes

- **IMPLEMENT**: the module header first (it is the specification), then:
  ```js
  import { questionById } from "./bank.mjs";
  import { LEVELS, OPS, PARAMS } from "./ops.mjs";
  import { blockquote, cell, fold } from "./prd-projection.mjs";

  export const VERDICTS = Object.freeze(["accepted", "refused", "parked"]);
  // "proposed" is the ABSENCE of a verdict and is never written to a line — see foldProposals.
  export const STATUSES = Object.freeze(["proposed", ...VERDICTS]);
  export const LINE_TYPES = Object.freeze(["proposal", "verdict"]);
  // Exact key sets, the way ops.mjs PARAMS is exact: an unknown key is refused by name.
  export const PROPOSAL_KEYS = Object.freeze(["type","ts","id","title","why","rests_on","wrong_if","model","fingerprint"]);
  export const VERDICT_KEYS  = Object.freeze(["type","ts","proposal_id","verdict","reason"]);
  // The model's half — what the MCP tool takes. The other five keys are the server's, the way an
  // op's seq/closes/flagged are the applier's (ops.mjs invariant 5).
  export const PROPOSED_BY_MODEL = Object.freeze(["title","why","rests_on","wrong_if"]);
  export const PROPOSAL_ID_RE = /^p[1-9][0-9]*$/;
  export const MAX_PROPOSALS = 8;
  ```
  Then `nextProposalId(lines)`: the max `id` across every `proposal` line, plus one, as `p<n>`.
  **Counted from the ids, never from the array length** — the file interleaves two line types.
- **PATTERN**: `discovery/ops.mjs:46-64` for the frozen-vocabulary style; `prd-projection.mjs:125-131`
  for exporting a judgement call as a named const so a rename fails loudly.
- **IMPORTS**: no `node:fs` above the filesystem shell's own section; no SDK; no zod; nothing from
  `portal/`. State that in the header — group 34 source-pins it.
- **GOTCHA**: `bank.mjs` is imported for the same reason `prd-projection.mjs` imports it (its header,
  :24-31): a question's **text is a definition, not a claim**, and the projection renders the question a
  rested-on decision answered. Carry the same five fields (`id`, `text`, `attribution`, `stage`,
  `label`) and exclude `weakAnswer`, `note` and `provenanceNote` — case 34.10 asserts all three absent
  with a positive control.
- **VALIDATE**: `node -e "import('./discovery/proposals.mjs').then(m=>console.log(Object.keys(m)))"`
- **SATISFIES**: AC #1.

---

### T3 · ADD the four refusals to `discovery/proposals.mjs`

- **IMPLEMENT**: `checkProposalLines(lines, ops)` — pure, total, refuses by name. Mirror
  `checkOpLines`'s structure exactly: a first pass over shapes, a second pass over cross-references.

  **The four refusals, each with its own message:**

  1. **A proposal that names no decision is REFUSED.** `rests_on` must be a non-empty array of 1-based
     integers, each of which resolves to a `record_decision` in `ops`. Three distinct throws:
     ```
     proposals: proposal "p3" carries rests_on [] — a proposal names at least one record_decision seq
       it rests on. A decision with no evidence is recorded and flagged because a session must not
       deadlock; a proposal resting on nothing has no reason to exist (refusal 1).
     proposals: proposal "p3" rests on seq 9, which this run's ledger does not carry — rests_on names
       a record_decision the model was shown (refusal 1).
     proposals: proposal "p3" rests on seq 4, which is a file_evidence, not a record_decision — a
       proposal rests on decisions (refusal 1).
     ```
     **A dangling seq is REFUSED here, unlike `checkOpLines`'s tolerated dangling `parent_id`.** Say
     why in a comment: `checkOpLines` never re-derives history over a possibly-corrupted ledger, but a
     proposal run reads a *finished* package and every seq it names was in the brief it was given.
  2. **A proposal with no `wrong_if` is REFUSED.** Non-empty string after `trim()`; absent, `null`,
     non-string or blank each throw naming `wrong_if`:
     ```
     proposals: proposal "p3" carries wrong_if <value> — an option with no kill criterion is a wish,
       and every other claim in this system carries one (refusal 2).
     ```
  3. **A proposal can never become a `record_decision`.** This one is *structural*, not a runtime check,
     and it is asserted three ways in group 34 (case 34.4). In the module, express it as two exported
     predicates the gate drives and one comment paragraph:
     ```js
     // There is no verb, no migration and no route. Asserted by 34.4: LINE_TYPES and OPS are
     // disjoint; a proposal line fed to ops.mjs's applyOps THROWS; and no field of a proposal
     // appears in PARAMS.record_decision. `accepted` records that the owner liked it. If the owner
     // wants it in the requirement hierarchy they answer a banked question in a session and the
     // EXISTING pipeline files it from their own words — which is what keeps answers.jsonl's
     // invariant intact: no op parameter carries text the human did not write (refusal 3).
     export const OPS_DISJOINT = Object.freeze(LINE_TYPES.filter((t) => OPS.includes(t)));  // must be []
     ```
     Also refuse a `proposal` line that carries any key in `PARAMS.record_decision` — the exact-key-set
     check already does this, but name refusal 3 in that message so a future editor sees the reason.
  4. **A proposal never appears in `prd.md`.** Also structural: this module is never imported by
     `prd-projection.mjs`, and `readPackage` reads three files, not five. Asserted by case 34.5 as a
     byte compare, and by a source pin that `prd-projection.mjs` does not name `proposals`.

  Beyond the four, the ordinary shape refusals (each on its own message, each naming the value): an
  unknown `type`; an exact key set per type; `id` matching `PROPOSAL_ID_RE`; ids strictly increasing and
  never repeated; `title` a non-empty string; `why` a non-empty string; `model` and `fingerprint`
  non-empty strings; `ts` a string; a `verdict` line whose `proposal_id` names no proposal; a `verdict`
  outside `VERDICTS`; a blank `reason`.
- **PATTERN**: `discovery/prd-projection.mjs:259-352` — read it line by line. The `crossRef` helper at
  :312-319 is the shape for refusal 1's kind check. The two-pass split at :306-310 is why.
- **GOTCHA**: **total, never throwing on junk it was not asked about.** `checkProposalLines` is the one
  boundary that refuses; every selector below it answers over junk rather than throwing
  (`prd-projection.mjs:355-357`). And it returns `[...lines]` — a copy, so a caller cannot alias the
  checked array.
- **VALIDATE**: covered by T8's group 34; until then
  `node -e "import('./discovery/proposals.mjs').then(m=>{try{m.checkProposalLines([{type:'proposal',ts:'',id:'p1',title:'t',why:'w',rests_on:[],wrong_if:'x',model:'m',fingerprint:'f'}],[])}catch(e){console.log(e.message)}})"`
  must print a message naming `rests_on` and `refusal 1`.
- **SATISFIES**: AC #2.

---

### T4 · ADD the derived status to `discovery/proposals.mjs`

- **IMPLEMENT**:
  ```js
  // DERIVED, never stored — the way discovery.mjs invariant 4 derives the cursor and ops.mjs derives
  // "closed". Two records of one fact drift. The LAST verdict line for an id wins, and every verdict
  // is kept: the owner changing their mind is part of the record, exactly as a superseded decision is.
  export function foldProposals(lines) → [{ proposal, status, verdicts: [...], seq: <ordinal> }]
  export function statusOf(id, lines) → one of STATUSES
  export function statusCounts(lines) → { proposed: n, accepted: n, refused: n, parked: n }
  ```
  `foldProposals` returns proposals in **file order**, each with every verdict line that names it, also
  in file order, and the derived status. It calls no clock and reads no filesystem.
- **PATTERN**: `portal/lib/discovery.mjs:517-519` (the cursor derived from closed turns) and
  `discovery/prd-projection.mjs:402-437` (`indexOps` — the one place the ledger is indexed).
- **GOTCHA**: `foldProposals` must **copy** the verdict arrays it hands out, never alias the input — the
  same trap `opLine` has and group 30 case 13 catches by mutating the returned record and re-reading.
- **VALIDATE**: covered by case 34.6.
- **SATISFIES**: AC #1.

---

### T5 · ADD the `proposals.md` projection to `discovery/proposals.mjs`

- **IMPLEMENT**: `PROPOSAL_SECTIONS` — one row per section, in output order, each with a **declared
  `empty` string**, frozen at both levels:

  | id | heading | axis | `empty` (distinct per row) |
  |---|---|---|---|
  | `proposed` | `Awaiting a verdict` | status | "no proposal is awaiting a verdict" |
  | `accepted` | `Accepted` | status | "the owner accepted none of them" |
  | `refused` | `Refused` | status | "the owner refused none of them" |
  | `parked` | `Parked` | status | "the owner parked none of them" |
  | `rested-on` | `The decisions these rest on` | cross-ref | "no proposal names a decision (which the refusals make unreachable)" |

  Then `projectProposals({ run, ops, proposals })` → a markdown string ending in exactly one `\n`.
  **Pure: no filesystem, no clock, no network, no SDK.** Every date comes from `run.json` or a line's own
  `ts`; ordering is by id or by `PROPOSAL_SECTIONS` order, never by `Object.keys`.

  **The honesty header** — the one paragraph not derived from a record. It must say, in this order:
  who wrote each half (the model wrote every `title`, `why`, `rests_on` and `wrong_if`; the owner wrote
  every verdict and its reason; the ids, timestamps, model and fingerprint are the server's); that these
  are **options, never truth**; that `prd.md` does not carry them and never will; that an `accepted`
  proposal is **not** a decision and has no route into the requirement hierarchy except the owner
  answering a banked question in a session; and that the file is **regenerated on every verdict**, so a
  hand edit is lost — the opposite of `prd.md`'s rule, and the reason must be stated.

  **Each proposal renders under a heading the fold owns, never model text:**
  ```
  #### p3 — accepted
  **Title:** <fold(title)>
  *Rests on:* seq 7 (stakeholder · `s2-who-for`) · seq 12 (solution · off-script)
  *Wrong if:* <fold(wrong_if)>
  *Proposed by:* <fold(model)> · prompt surface `<fold(fingerprint)>` · <field(ts)>
  *Verdict:* **accepted** — <fold(reason)>   ← one line per verdict, in file order

  > <blockquote(why)>
  ```
  A `verdict` that superseded an earlier one renders both, the earlier marked `(superseded by the
  verdict of <ts>)` — marking, never dropping, the rule `prd-projection.mjs:38-46` states.

  A run line and a ledger line at the top, mirroring `projectPrd:657-662`:
  ```
  **Run** — `<slug>` · <provenance> (<label>) · depth <depth> · ended <endedAt> · package [`<root>`](./)
  **Proposals** — N: proposed n · accepted n · refused n · parked n
  ```
- **PATTERN**: `discovery/prd-projection.mjs:156-244` (`SECTIONS`), `:623-635` (`RENDERERS`),
  `:641-680` (`projectPrd`). Copy the assembly loop's shape: a renderer answers `null` when its
  selection is empty and the row's declared `empty` is substituted.
- **GOTCHA (the containment rule, and it is the AC):** **nothing model-authored ever reaches column 0
  as structure.**
  - `title`, `wrong_if`, `model`, `fingerprint` and a verdict's `reason` go through **`fold`** and are
    always preceded on their line by a literal (`**Title:** `, `*Wrong if:* `, …), so a folded `## X`
    is not at line start and is not ATX.
  - `why` goes through **`blockquote`** — it is prose and may legitimately be multi-paragraph.
  - anything in a table goes through **`cell`**.
  - the `####` heading carries **only** the id and the derived status, and **both are validated,
    never folded**: `checkProposalLines` refuses an `id` that does not match `PROPOSAL_ID_RE` and a
    `verdict` outside `VERDICTS`, so neither can carry a payload as far as a renderer. That is
    deliberate and it is what lets the heading be the one line on the page with no containment
    applied. A bank question's `text` in the rested-on line goes through `cell`.
  Case 34.9 injects the three-EOL payload into every string-ish field and asserts the heading list is
  unchanged, nothing opened a line, **and the text is still present** — a fold contains a claim, it
  never deletes one. `id`, `proposal_id`, `verdict` and `type` land in that case's **refusal** column,
  not its fold column; see T8's census.
- **VALIDATE**: covered by cases 34.7-34.9.
- **SATISFIES**: AC #3.

---

### T6 · ADD the filesystem shell + CLI to `discovery/proposals.mjs`

- **IMPLEMENT**, below a `// The filesystem shell. Nothing below decides what the page says.` divider:
  ```js
  export function readProposalPackage(root)   // run.json + transcript op lines + proposals.jsonl
  export function writeProposalsMd(root)      // ALWAYS overwrites — see below
  ```
  `readProposalPackage` **calls `readPackage(root)`** for `run` + `answers` + `ops` — one reader, one
  refusal set, and it already throws on a transcript line outside the three types.

  For `proposals.jsonl` it needs **its own line-numbered reader**, because `prd-projection.mjs`'s
  `readJsonl` is module-private (`:688`) and every message it raises is prefixed `prd-projection:`,
  which would send an operator to the wrong module. **Do not add a fourth export** — copy the ten-line
  reader (`:688-700`) into `proposals.mjs` with a `proposals:` prefix. Blank lines skipped, the 1-based
  file line number carried, an absent file reading as `[]`.

  `writeProposalsMd` **always overwrites, and this is the deliberate difference from `writePrd`.**
  `prd.md` refuses without `--force` because it is generated and then hand-edited; `proposals.md` is
  regenerated on every verdict, so a refusal would break the feature. State the difference in the
  function's comment and in the honesty header, and add the drift guard (case 34.11) rather than the
  refusal.

  CLI guard, mirroring `prd-projection.mjs:745-768` exactly (including `pathToFileURL` — this repo's
  path contains a space):
  ```
  node discovery/proposals.mjs <slug> [--stdout]
  node discovery/proposals.mjs --root <dir> [--stdout]
  ```
- **PATTERN**: `discovery/prd-projection.mjs:684-768`.
- **GOTCHA**: `readPackage` **throws** on a transcript line whose `type` is outside
  `["text","op","denied"]` (`:718-720`). `proposals.jsonl` gets the same treatment for its own two
  types — a `.filter(type === "proposal")` would silently drop a well-formed line whose type read
  `"proposalx"`, and a missing proposal that nothing reports is the worst failure an honesty artefact
  has.
- **VALIDATE**:
  ```bash
  node discovery/proposals.mjs --root discovery/allergen-matrix-1 --stdout | head -30
  ```
  (before the real run this prints the header plus five empty sections — that is the expected output
  and is worth eyeballing.)
- **SATISFIES**: AC #1, AC #3.

---

### T7 · UPDATE `tooling/build-checks.mjs` — register group 34

- **IMPLEMENT**: **there is no runner and no registry.** A group is a bare `{ … }` block at module
  scope, executed top-to-bottom by `node`, ending in one `group(name, detail)` call. Adding one means
  the edits below and nothing else.

  **The count lives in SIX places and NOTHING asserts it.** A group 34 that forgets a bump still exits
  0 with a green run and a line that says 33 — the [[check-that-cannot-fail]] shape. Do all six:

  | # | File:line | Edit |
  |---|---|---|
  | 1 | `tooling/build-checks.mjs:4` | `Thirty-three groups` → `Thirty-four groups` |
  | 2 | `tooling/build-checks.mjs:174` | a `//  34 proposals …` entry after group 33's (ends :173), before the bare `//` at :174. Column format: `//  NN <name ~16 cols> <prose>`, continuations indented to col 21 |
  | 3 | `tooling/build-checks.mjs:176-250` | the import — see the GOTCHA below |
  | 4 | `tooling/build-checks.mjs:7778` | the group body, after group 33's closing `}` at :7777 and before `// --- the verdict ---` at :7779. Header style `// --- 34 · feature proposals (#359) ---` (the majority style; group 31's `// --- group 31: …` is the outlier — do not copy it) |
  | 5 | `tooling/build-checks.mjs:7786` | `all 33 groups pass` → `all 34 groups pass` |
  | 6 | `.claude/references/gates.md:11` · `:5` · `CLAUDE.md:110` · `:177` | see T15 |

  Note `grep -c 'group("'` returns **34 for 33 groups** — group 32 calls `group()` twice (an
  `if (pkg)` branch at :7348 and an unreachable `else` at :7350), so a grep-based count is not a check.
- **PATTERN**: `ok(condition, message)` at :269 **records and returns; it never throws.**
  `group(name, detail)` at :274 drains the buffer, printing `✗` with one `·` line per failure, or `✓`
  with the detail. `failures` accumulates for the verdict at :7783.
  Helpers (`threw`, `msg`, `names`, `same`) are **re-declared per block**, never hoisted — group 33
  suffixes its own (`threw33`, `same33`) to avoid a file-scope collision. Group 34 opens its own block,
  so plain names are fine.
  The `✓` detail is a **specification, not a label**: a prose paragraph naming what was proven, with
  counts interpolated from the fixtures (`${REFUSALS.length}`, never a typed number), ending in an
  explicit **"What it cannot reach:"** clause naming the gate that owns the other side. `gates.md:5`
  lists which groups carry that sentence — add 34 to the roster.

  **Group 34's clause names three things it cannot reach.** (1) Whether the SDK half behaves at all:
  CI has no `portal/node_modules`, so case 34.12 is a source pin over text, not a run — the
  proposer's `--dry` preflight is the substitute, and Phase 4's run is the observation. (2) Whether a
  fence deny actually **stops** a call at run time: `--probe-fence` is that standard, and after T8a it
  covers the proposal run too, because there is one predicate at the same two sites — point at it
  rather than claiming a gap that no longer exists. (3) Whether the model's proposals are any
  **good**: a human read of the verdict distribution, and the ticket sets no target.
- **GOTCHA — `ok()` does not throw, so execution continues past a failure.** An unguarded dereference
  after a failed `.find()` or a `null`-returning `sectionBody()` throws **before** `group()` runs, and
  the whole gate then reports nothing instead of one named failure (the rule stated at
  `tooling/build-checks.mjs:6943-6945`). That is why `String(x)`, `x?.y` and `?? ""` coercion is
  everywhere in groups 31-33. Write group 34 the same way.
- **GOTCHA — build-checks runs in CI with **no** `portal/node_modules`.** Keep group 34's imports to
  `discovery/` only: `proposals.mjs`, `ops.mjs`, `bank.mjs`, `prd-projection.mjs`. **Do not add a
  fourth entry to the "THREE NAMED EXCEPTIONS" block at :14-25** — group 34 needs nothing from
  `portal/`, and case 34.12 reads `portal/lib/discovery-proposer.mjs` as **text**
  (`readFileSync` + `decomment` + regex), the way group 33 reads `portal/record-graded-answers.mjs`
  at :7576. Importing it would pull the SDK into CI and take the whole job down.
- **GOTCHA — aliasing is mandatory, not stylistic.** The file already resolves five collisions; reuse
  the existing aliases and never re-import a colliding name:
  `QUESTIONS as BANK` · `OPS as DISCOVERY_OPS` · `PARAMS as DISCOVERY_PARAMS` ·
  `applyOp as applyDiscoveryOp` / `applyOps as applyDiscoveryOps` ·
  `assertRunSlug as assertDiscoverySlug`. `PROPOSAL_SECTIONS` is named that way (rather than
  `SECTIONS`) precisely to avoid a sixth. `ROOT` (:263) and `VOCAB` (:264) are module-level and
  already available.
- **VALIDATE**: `node tooling/build-checks.mjs | tail -3` prints `all 34 groups pass`. Then prove the
  no-portal-deps claim the way `gates.md:15` names it:
  ```bash
  mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
  ```
- **SATISFIES**: AC #1.

---

### T8 · ADD group 34's cases

- **IMPLEMENT**: build the fixture first, then the cases. Reuse group 31's helpers by copying them into
  the group's own scope (`threw`, `msg`, `names`, `same`, `esc`, `fold`, `present`, `headings`,
  `sectionBody`, `tooling/build-checks.mjs:6720-6760`) — every group in this file keeps its own copies.
  Number the case comments **34.x**: group 29's comments read `28.x` for historical reasons and that
  off-by-one is a wart, not a convention — do not copy it.

  `names(fn, ...needles)` is the refusal idiom and it is called twice per assertion, once for the
  predicate and once for the message. Verbose, and consistent across groups 29, 31 and 32:
  ```js
  ok(names(fn, "rests_on", "refusal 1") === null, `empty rests_on: ${names(fn, "rests_on", "refusal 1")}`);
  ```

  **The fixture — the governing convention: hand-author the OPS, let the applier produce the
  RECORDS.** Never hand-write a record; `seq`, `closes`, `flagged` and `supersedes` are
  `discovery/ops.mjs`'s output, so the group cannot drift from the applier's flagging rules:
  ```js
  const RECORDS = applyDiscoveryOps(HAND_AUTHORED_OPS, { answers: FIXTURE_ANSWERS, bank: BANK }).ops;
  ```
  Mirror `tooling/build-checks.mjs:6833` and the compact example at `:7282-7287`. The ledger needs at
  least two `record_decision`s at different rungs, one `file_evidence` and one `flag_weak_answer` — so
  refusal 1's wrong-kind branch has a real `file_evidence` seq and a real `flag_weak_answer` seq to
  name. The proposal and verdict lines themselves are hand-authored, because *they* are the subject
  under test (the exception group 33 case 33.5 makes for the same reason).

  **The fixture stays INLINE in `build-checks.mjs`, never as a `discovery/<slug>/` directory.** Group
  31's header states why (:6706-6711): `discovery/README.md` forbids a hand-written answer, transcript
  or op, and an on-disk hand-authored package could later be mistaken for a real one.

  **The cases:**

  - **34.1 — the tables.** `VERDICTS`, `STATUSES`, `LINE_TYPES`, `PROPOSAL_KEYS`, `VERDICT_KEYS`,
    `PROPOSED_BY_MODEL`, `PROPOSAL_SECTIONS` each **frozen by mutation** (attempt a push, re-read the
    length). `PROPOSAL_SECTIONS` frozen at **both** levels, an exact key set per row, and **five
    distinct `empty` strings** — a copy-pasted one would make 34.8 pass for the wrong reason
    (`:6847-6865` is the model).
  - **34.2 — coverage, both directions.** Every `STATUSES` entry has a `PROPOSAL_SECTIONS` home and
    every status row names a real status. A sixth status with no home fails **by name**
    (`:6867-6890` is the model — this is 31.2's rule applied to this fold).
  - **34.3 — the positive control, first.** The fixture projects to one `## ` heading per row in table
    order, with the honesty header present and every field of the run line rendered. **Every refusal
    below means nothing unless this passes** (`:6891-6901`).
  - **34.4 — REFUSAL 3, three ways** (a proposal can never become a decision):
    a. `LINE_TYPES` and `OPS` are disjoint, and no `PROPOSAL_KEYS` entry is a key of
       `PARAMS.record_decision`;
    b. **executed, not grepped** — a real `proposal` line fed to `applyOps([line], ctx)` and to
       `applyOp(emptyRun(), line, ctx)` **throws**, and the message names the op envelope. This is the
       repo's own rule ([[check-that-cannot-fail]]): mutate the source, run the function;
    c. a **source pin** on `discovery/proposals.mjs`'s text: it does not import `applyOp` or `applyOps`,
       and no exported name matches `/record_decision|applyOp/`.
  - **34.5 — REFUSAL 4, byte-identical** (a proposal never appears in `prd.md`):
    a. project the fixture's `prd.md` with `projectPrd`, add proposal lines to the package, project
       again — **byte-identical**. Then add verdict lines and project a third time — still identical;
    b. a **source pin**: `discovery/prd-projection.mjs`'s text contains no occurrence of `proposals`
       (case-insensitive), and `readPackage` reads exactly three filenames;
    c. the mutation that turns it red: temporarily concatenate a proposal's `title` into the projected
       string and assert the compare fails — proving the compare can go red.
  - **34.6 — REFUSAL 1 and REFUSAL 2, each on its message, each with the mutation that turns it red.**
    Empty `rests_on`; a dangling seq; a seq that is a `file_evidence`; a seq that is a
    `flag_weak_answer`; `wrong_if` absent, `null`, `""`, `"   "` and a non-string. Each matched with
    `names(fn, "rests_on", "refusal 1")` / `names(fn, "wrong_if", "refusal 2")`. **The positive
    control**: the same proposal with one valid `rests_on` and one non-blank `wrong_if` is **accepted**,
    so the refusal cannot be passing because everything is refused.
  - **34.7 — the derived status.** No verdict → `proposed`. One verdict → that verdict. Three verdicts
    → the last, with **all three kept** in the returned array in file order. `statusCounts` sums to the
    proposal count. **Purity**: mutate `foldProposals`'s return and re-read the input; call it twice and
    deep-compare. **Aliasing**: mutate a returned `verdicts` array and re-read the input lines.
  - **34.8 — the vanishing claim, this fold's version.** Delete each proposal in turn and assert its
    `title`, `why` and `wrong_if` are gone from the **whole document**, its section falling back to its
    own declared `empty`. Delete every proposal and assert every heading survives with no claim.
  - **34.9 — THE INJECTION BATTERY, re-run on this fold.** Copy group 31 case 34.13's machinery
    verbatim (`tooling/build-checks.mjs:7180-7250`):
    ```js
    const EOLS = [["LF", "\n"], ["CR", "\r"], ["CRLF", "\r\n"]];
    const smuggle = (eol) => `${eol}${eol}## Smuggled section${eol}${eol}#### p99 · a smuggled block${eol}${eol}- a claim no proposal carries`;
    const STRUCTURE = ["## Smuggled section", "#### p99", "- a claim no proposal carries"];
    const opened = (md) => md.split(/\r\n|\r|\n/).filter((l) => STRUCTURE.some((x) => l.replace(/^ {1,3}/, "").startsWith(x)));
    ```
    Declare **local** `fold` and `esc` copies inside the group, mirroring the module's exactly — the
    assertion side must mirror independently or the match set is built blind (`:6728-6734`'s reasoning).

    Inject the payload into **every string field of every proposal line** (`type`, `ts`, `id`, `title`,
    `why`, `wrong_if`, `model`, `fingerprint`), **every string field of every verdict line** (`type`,
    `ts`, `proposal_id`, `verdict`, `reason`) and **every string field of `run.json`**, over all three
    line endings. Assert three ways, exactly as 31.13 does: the heading list unchanged;
    `opened(md).length === 0`; and the payload **still present** — a fold contains a claim, it never
    deletes one. A refusal by name counts as containment; a crash does **not** (assert
    `e.constructor === Error` and the message starts `proposals: `).

    **DO NOT copy 31.13's `folded >= 25 && refused >= 10` floors — they are wrong for this shape and
    would fail on the first run.** 31.13's refusals come from three closed-set enum params
    (`level`, `source`, `provenance`); this shape has a different surface entirely. Field by field:

    | field | on this line type | injecting it |
    |---|---|---|
    | `type` | both | **refused** — outside `LINE_TYPES` |
    | `id` | proposal | **refused** — fails `PROPOSAL_ID_RE` |
    | `proposal_id` | verdict | **refused** — names no proposal |
    | `verdict` | verdict | **refused** — outside `VERDICTS` |
    | `ts`, `title`, `wrong_if`, `model`, `fingerprint`, `reason` | — | **folded** |
    | `why` | proposal | **contained by `blockquote`** — count it in the fold column |

    So a proposal line contributes 2 refusals and 6 folds; a verdict line contributes 3 refusals and
    2 folds. With the recommended fixture (3 proposals, 4 verdicts — one proposal carrying two so the
    supersede-marking path is exercised) that is **18 refusals and 26 folds**, plus `run.json`'s nine
    string fields driven separately as 31.13 does. Treat those numbers as a sanity check on your
    fixture, **never as the assertion.**

    **The assertion iterates the KEY LISTS, so it cannot go stale and a new field cannot slip
    through** — this is 31.13's real intent, expressed the way the repo's roster-completeness idiom
    does it (`VALID_FOR` in group 29, `DISTINCT` in group 31), and it is strictly stronger than any
    floor:
    ```js
    // Every field is CLASSIFIED by the run, never by a hand-written list: each string field of each
    // line lands in exactly one column, and the two columns must together account for every one.
    const stringKeys = (line) => (line.type === "proposal" ? PROPOSAL_KEYS : VERDICT_KEYS)
      .filter((k) => typeof line[k] === "string");
    const expected = PROPOSAL_LINES.reduce((n, l) => n + stringKeys(l).length, 0);
    ok(folded + refused === expected, `${folded} folded + ${refused} refused of ${expected} string fields — this case ITERATES PROPOSAL_KEYS and VERDICT_KEYS, so a field added to either must be driven here`);
    ok(folded > 0 && refused > 0, `neither column may be empty — folded ${folded}, refused ${refused}; if refused is 0 the validators are not running, and if folded is 0 nothing reached a renderer`);
    ```
    Two guards that stop the census passing vacuously, both worth writing:
    - **the key lists cover the fixture**: for every line, `Object.keys(line)` equals its type's key
      list — otherwise a field present in the data but missing from `PROPOSAL_KEYS` is never driven
      *and* never counted, and `folded + refused === expected` still balances;
    - **`expected` is non-trivial**: `ok(expected >= 20, …)`, so a fixture accidentally reduced to one
      line cannot make the whole case pass.

    Also drive the `|` route: a `title` carrying pipes must not add a column to the rested-on table.
  - **34.10 — the bank's excluded fields.** Over every question the fixture's rested-on decisions name,
    assert `weakAnswer`, `note` and `provenanceNote` are **absent** from the page, with `text`,
    `attribution` and `label` **present** as the positive control (`:7025-7042` is the model).
  - **34.11 — determinism, purity, and the committed artefact.** Two projections byte-identical. Every
    ISO date on the page is one `run.json` or a line already carried — **no clock** (:7057-7067's loop).
    `projectProposals` does not mutate its input (JSON compare). And, gated on existence the way case
    33.15 does: if `discovery/allergen-matrix-1/proposals.jsonl` exists, its `proposals.md` **equals
    the projection's bytes**, and the group's ✓ line says `pending: the recorded run` until it does.
  - **34.12 — the SDK half, source-pinned** (`readFileSync` + `decomment` + regex; **never imported**,
    it reaches the SDK). Over `portal/lib/discovery-proposer.mjs`, with a positive control per regex
    so a pin cannot pass because it never matched:

    **It must NOT contain** — this half is what protects AC #4 and AC #5:
    `recordTurnStats` · `writeRun` · `mutateHead` · `closeSession` · `appendTranscript` ·
    `appendAnswer` · `allowsToolName` · `TOOL_DESCRIPTIONS` · `fingerprintOf` · `FINGERPRINT_INPUTS` ·
    `POSTURES`. A proposer importing `recordTurnStats` moves `run.json`, and a `turnStats` entry
    changes `projectPrd`'s "N turn(s)".

    **It must contain**: `fenceHooks` and `fenceCanUseTool`, imported and wired to **both** sites from
    **one** fence object (case 12's rule, `:6290` — *"a second copy of the fence is a second fence"*),
    with `write:` present in that object so refusals stream instead of landing in the transcript;
    `strictMcpConfig: true`, scoped to the query's own block (case 12's PR #354 F2 lesson — a
    file-wide match stayed green with the real turn pointed elsewhere); an MCP server name that is
    **not** `MCP_SERVER`; exactly one `tool(` call; `tools:` and `mainTools:` reading **one** frozen
    record, as case 12 pins for the transport; a `checkProposalLines` call **before** the append; the
    zod shape exactly `PROPOSED_BY_MODEL`; and `is_error` read on the result.
  - **34.13 — the fingerprints cannot move *through this ticket's code*.** Do **not** hardcode either
    fingerprint as a hex literal here: group 32 case 32.2a and group 33 case 33.15 already compare a
    recording's stamps against the **live** `POSTURES[...].fingerprint`, so a legitimate future prompt
    edit is meant to fail *there*, by name, and a hex literal in group 34 would block it for no reason.
    Assert the **cause** instead, as a source pin over `discovery-proposer.mjs`'s text: it imports
    `PROVENANCE_RULE` from `discovery-postures.mjs` and **nothing else** — not `TOOL_DESCRIPTIONS`,
    not `fingerprintOf`, not `FINGERPRINT_INPUTS`, not `POSTURES` — with a positive control proving the
    regex can match. AC #5's actual proof is T0's baseline against T16's re-read, in the shell.
- **VALIDATE**: `node tooling/build-checks.mjs` — `all 34 groups pass`. Then **prove each new case can go
  red**: break one thing at a time in `proposals.mjs`, re-run, confirm the named failure, revert.
- **SATISFIES**: AC #1, #2, #3, #4, #5.

---

### T8a · UPDATE `portal/lib/discovery.mjs` — ONE fence, two callers

> **This task replaces the "the proposer builds its own fence" design.** Group 30 case 12 already
> forbids exactly that, in a gated assertion (`tooling/build-checks.mjs:6290`):
> ```js
> ok(!/canUseTool:\s*async/.test(transportSrc) && !/^\s*import\b[^\n]*\ballowsToolName\b/m.test(transportSrc),
>    "case 12: the transport still carries an inline canUseTool or imports allowsToolName — a second copy of the fence is a second fence");
> ```
> A duplicate predicate in the proposer would be a second fence with no run-time proof — the residual
> risk R3. Parameterising instead means one predicate, two call sites, and the **existing**
> `--probe-fence` evidence covers the proposer too.

- **IMPLEMENT**: four small edits, every one defaulting to today's behaviour so no existing group-30
  case changes. **`mainTools` is the precedent** — it is exactly this shape, added the same way, and
  driven in both directions by case 25.

  1. **`fenceDecision`** (:211) takes an optional fourth argument:
     ```js
     export function fenceDecision(allowSet, tool, input, extraTools = []) {
       if (allowsToolName(tool) || (Array.isArray(extraTools) && extraTools.includes(tool)))
         return { allow: true, reason: `${tool} is one of this run's tools` };
       …unchanged…
     }
     ```
     **No arity pin exists on it** — case 30.24 (`:6520-6561`) calls it with three arguments
     throughout, so a defaulted fourth is invisible to every existing case. (Contrast `drawFor`, whose
     arity *is* pinned at 2 by case 33.1 — do not assume this one is.)
  2. **`fenceSite`** (:313) takes two more opts, both defaulted. **Stamp `ts` BEFORE the branch**, not
     inside `appendTranscript`, or the two callers hand `onLine` two different shapes:
     ```js
     function fenceSite({ root, turn, onLine, allowSet = null, mainTools = [], extraTools = [], write = null }) {
       // `ts` is stamped HERE rather than left to appendTranscript, because `write` bypasses it and a
       // streamed line with no ts would be a second shape on the same wire. appendTranscript's own
       // `line.ts ?? now()` (:263) then finds one already present and is a no-op — one shape, one clock.
       const record = (line) => {
         const stamped = { ...line, ts: line.ts ?? new Date().toISOString() };
         try { const written = write ? write(stamped) : appendTranscript(root, stamped); onLine?.(written); }
         catch (e) { process.stderr.write(`discovery: hook error (non-fatal): ${e.message}\n`); }
       };
     ```
     `decide` passes `extraTools` through to `fenceDecision`, and the trace guard
     `if (!allowsToolName(tool))` (:353) becomes the same extended check — a run's **own** tool is
     never traced, whichever list it comes from.

     **`isRecorded` (:344) is deliberately left alone, and here is why.** It reads
     `isMcpToolName(tool) || mainTools.includes(tool)`, and `mcp__proposals__propose` already satisfies
     the prefix check — so a denial of the proposal tool is recorded (here: streamed) with no edit.
     That is the intended path, not an accident, **but it rests on the tool carrying an `mcp__`
     prefix**. Assert that rather than assume it: a group-30 case pinning
     `isMcpToolName(PROPOSER_TOOL_NAME) === true`, so a future rename that drops the prefix fails by
     name instead of silently making the proposal run's refusals invisible.
  3. **`fenceHooks`** (:409): `PostToolUseFailure`'s record gate
     `if (allowsToolName(input.tool_name))` (:431) becomes the extended check, so a *proposal* tool's
     schema-layer or handler refusal is recorded (here: streamed) exactly as an op tool's is.
  4. **The header comment at :378** currently reads ``​`opts` is `{ allowSet, mainTools }` `` — update it
     to name all four and say what `write` is for: a caller whose refusals do not belong in
     `transcript.jsonl`.
- **PATTERN**: `mainTools`, end to end — added to `fenceSite`'s destructuring (:313), read by
  `isRecorded` (:344), documented in the header (:305-312), and driven **both ways** by group 30 case
  25 (`:6608-6618`: `mainTools: []` denies-and-does-not-record while an `mcp__` denial still records).
  Copy that shape exactly for the two new opts.
- **ADD to group 30** (six cases, in case 25's block since it already drives both sites over a temp
  root):
  - `extraTools: []` is **byte-identical to today** — the mirror case. Every input of case 25's
    twelve-input battery gives the same decision and the same reason with the argument absent, with
    `[]`, and with `undefined`.
  - `extraTools: ['mcp__proposals__propose']` **allows that name and only it**: the op tools still
    pass, `mcp__proposals__other` is denied, `mcp__other__propose` is denied, and `Write` / `Edit` /
    `Bash` stay denied by name whatever path they carry.
  - `extraTools` junk (`null`, `'x'`, `7`, `{}`) **denies rather than throwing** — `fenceDecision`'s
    own fail-closed rule (:196-197's discipline).
  - `write` receives the line and **`appendTranscript` is not called**: drive `fenceHooks` over a temp
    root with a `write` that pushes to an array, deny a `Read` outside the set, then assert the array
    holds one line **and `readTranscript(root).length === 0`**. The positive control is the same
    denial with `write: null`, which must land in the transcript.
  - **the two callers hand `onLine` the same shape**: the line a `write` caller streams and the line a
    transcript caller streams carry the **same key set**, `ts` included. Assert it by comparing
    `Object.keys()` of both, so the stamp-before-the-branch rule cannot be undone by a later edit
    without a named failure.
  - `isMcpToolName('mcp__proposals__propose') === true` — the prefix `isRecorded` rests on, pinned so a
    rename that drops it fails here rather than making a proposal run's refusals invisible.
- **GOTCHA**: **do not widen `allowsToolName` itself.** It is driven exhaustively by case 14
  (`:6305-6309`, four allowed and eighteen refused, "built by mapping OPS") and is the statement *the
  discovery session's vocabulary is the four op verbs*. That statement stays true; `extraTools` is a
  per-call widening the caller opts into, which is why it lives on `fenceDecision` and not on the set.
- **GOTCHA**: this is not the op-verb lock. No `OPS` entry, no `PARAMS` entry, no applier change, no
  posture prompt edit. Say so in the PR body so a reviewer does not read it as one.
- **VALIDATE**:
  ```bash
  node tooling/build-checks.mjs            # group 30 green, including the six new cases
  mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
  ```
- **SATISFIES**: AC #6 (the run can call its tool at all), and closes R3.

---

### T9 · CREATE `portal/lib/discovery-proposer.mjs` — the SDK half

- **IMPLEMENT**: header first, stating the four things this module must never do (write `run.json`,
  append to `transcript.jsonl` or `answers.jsonl`, touch `TOOL_DESCRIPTIONS`, or reuse the session's
  MCP server name). Then:

  ```js
  import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
  import { z } from 'zod';
  import { questionById } from '../../discovery/bank.mjs';
  import { LEVELS } from '../../discovery/ops.mjs';
  import { checkProposalLines, MAX_PROPOSALS, nextProposalId, PROPOSED_BY_MODEL } from '../../discovery/proposals.mjs';
  import { allowsPath, allowSetFor, READ_TOOLS } from './discovery.mjs';
  import { PROVENANCE_RULE } from './discovery-postures.mjs';
  ```

  **The prompt.** Its own constants, exported separately so a tightening is a one-line diff the gate
  notices (`discovery-postures.mjs:16-20`'s reasoning):
  - `PROPOSAL_CONTRACT` — one call, at most `MAX_PROPOSALS` proposals, one `propose` call each, then
    stop.
  - `OPTIONS_NOT_TRUTH` — these are candidates the owner will accept, refuse or park; the model is not
    deciding anything and must not write as if it were.
  - `RESTS_ON_RULE` — every proposal names at least one decision **seq from the ledger below**; do not
    recall a seq, read it from the brief; a proposal you cannot ground in a decision is not proposed at
    all.
  - `WRONG_IF_RULE` — every proposal carries a kill criterion: the observation that would make this
    feature the wrong thing to build.
  - `PROVENANCE_RULE[provenance]` — imported, not copied (#347).

  **The package brief.** `buildProposalRun({ run, ops, answers })` → `{ systemPrompt, prompt }`. The
  brief is a **projection of the ledger**, built server-side, carrying per decision: `seq`, `level`,
  the bank question's `text` (or `off-script`), the human's verbatim answer resolved by `answer_ref`,
  `wrong_if`, `parent_id`, and its `flagged` array; plus the filed evidence rows and the open
  questions. **This is why the run needs no `Read` tool** — everything it may see is in the prompt, the
  way a session turn's ledger brief is (`discovery-postures.mjs:94-111`).

  **The tool.** One, on its own server:
  ```js
  export const PROPOSER_MCP_SERVER = 'proposals';   // NOT discovery's — see the fence below
  export const PROPOSE_TOOL = 'propose';
  ```
  Its zod shape is exactly `PROPOSED_BY_MODEL`: `title` `z.string()`, `why` `z.string()`,
  `rests_on` `z.array(z.number().int())`, `wrong_if` `z.string()`. The handler assigns `id`
  (`nextProposalId`), `ts`, `type`, `model` and `fingerprint`, runs `checkProposalLines` over
  `[...existing, line]` **before** appending, appends on success, and returns
  `{ isError: true, content: [...] }` with the refusal's message on failure — the agent corrects inside
  the same turn (`discovery-transport.mjs:122-124`). It refuses past `MAX_PROPOSALS` by name.

  **The fence — reuse it, never re-implement it** (T8a is what makes this possible):
  ```js
  const PROPOSER_TOOL_NAME = `mcp__${PROPOSER_MCP_SERVER}__${PROPOSE_TOOL}`;
  const fence = {
    allowSet: allowSetFor({ root, reads: [] }),   // UNCHANGED — the ticket's own words
    mainTools: PROPOSER_MAIN_TOOLS,               // Object.freeze([]) — one record with the query's `tools`
    extraTools: [PROPOSER_TOOL_NAME],             // this run's own vocabulary, one name
    write: (line) => line,                        // stream only: nothing lands in transcript.jsonl
  };
  // The SAME two sites the session uses — one predicate, and --probe-fence's evidence covers both.
  canUseTool: fenceCanUseTool(root, PROPOSAL_TURN, onLine, fence),
  hooks: fenceHooks(root, PROPOSAL_TURN, onLine, fence),
  ```
  `PROPOSAL_TURN` is a fixed literal (`'proposal'`) — a proposal run has no turn sequence, and the
  value only ever reaches a streamed line and the fence trace. **Import `fenceHooks` and
  `fenceCanUseTool`, and never `allowsToolName`**: case 34.12 pins that, mirroring case 12's rule for
  the transport (`tooling/build-checks.mjs:6290` — *"a second copy of the fence is a second fence"*).

  **The run.** `runProposalRun({ root, run, ops, answers, model, dry, onLine })`:
  ```js
  const q = query({ prompt, options: {
    cwd: root, model, maxTurns: MAX_TURNS, systemPrompt,
    tools: [],                 // no built-ins; the brief carries the package
    allowedTools: [],          // nothing pre-approved, so canUseTool is consulted
    mcpServers: { [PROPOSER_MCP_SERVER]: server },
    strictMcpConfig: true,     // the repo's .mcp.json never joins this run's surface (#352)
    canUseTool, hooks,
  } });
  ```
  No `resume` — this is one call, not a resumed session. `MAX_TURNS = 12` (enough for eight tool calls
  plus prose; comment the arithmetic).

  **`ok` reads `is_error`**: `const ok = msg.subtype === 'success' && msg.is_error !== true;`. The
  session transport does not do this and that is a known gap; do not "fix" it here — note it in the
  report. Returns `{ proposals: [...], stats: { model, fingerprint, numTurns, durationMs, costUsd, ok },
  refusals: [...] }`. **The stats are returned to the caller and streamed; they are written to no file
  in the package.**

  **`--dry`**: builds the prompt and the server, runs the preflight rows, prints the brief, and spends
  nothing. Mirror `discovery-transport.mjs`'s `--preflight` (`:233-358`) — reach the server's request
  handlers and assert the advertised tool's `required` array equals `PROPOSED_BY_MODEL` by name **and**
  order.

  **The fingerprint.** Its own, over its own fixed inputs, so it moves when this prompt moves and never
  when the session's does:
  ```js
  export const PROPOSER_FINGERPRINT_INPUTS = Object.freeze({ /* a fixed run, ledger and provenance */ });
  export const PROPOSER_FINGERPRINT = createHash('md5').update([MODEL, systemPrompt, prompt, JSON.stringify(PROPOSE_DESCRIPTION)].join('\n \n')).digest('hex');
  ```
  **`createHash` from `node:crypto` only** — do not import anything from `discovery-postures.mjs`
  except `PROVENANCE_RULE`.
- **PATTERN**: `portal/lib/discovery-transport.mjs` end to end. `zodFor` (:65-80) — you need only four
  of its type codes, so declare the shape directly rather than importing `TOOL_SCHEMA`.
- **GOTCHA — the two that will silently break an AC:**
  1. **Never import `recordTurnStats`, `writeRun` or `closeSession`.** `projectPrd` renders
     `run.turnStats.length` as "N turn(s)" and `run.model`/`run.posture` on its Run line
     (`prd-projection.mjs:661`), so **one `turnStats` entry breaks AC #4.** The proposal's `model` and
     `fingerprint` ride on each proposal line instead — that is why the ticket puts them there.
  2. **Never touch `discovery-postures.mjs`'s `TOOL_DESCRIPTIONS`.** `fingerprintOf` hashes
     `JSON.stringify(TOOL_DESCRIPTIONS)` (`:240-243`), so one added key moves **both** shipped
     fingerprints and makes `discovery/instrument-loans-1/` stale under group 32 — AC #5, gone.
- **VALIDATE**:
  ```bash
  cd portal && node lib/discovery-proposer.mjs --dry --slug allergen-matrix-1 --provenance fictional
  # every preflight row pass, the brief printed, zero tokens
  git status --short discovery/allergen-matrix-1/   # nothing modified
  ```
- **SATISFIES**: AC #4, AC #5, AC #6.

---

### T10 · UPDATE `portal/server.mjs` — three routes

- **IMPLEMENT**, after `/api/discovery/prd` (:212) and before `/api/discovery/turn`:

  1. **`GET /api/discovery/proposals`** — `resolveRunRoot` + `assertProvenanceRoot`, then
     `json(res, 200, proposalsView(root))`. `proposalsView` is a **new exported whitelist projection**
     in `discovery/proposals.mjs` (pure, gate-driven), returning `{ head: {slug, provenance, endedAt,
     root}, proposals: foldProposals(...), decisions: [{seq, level, question_id, question, wrong_if}] }`.
     The route holds no shape opinion of its own — `turnEvent`'s rule
     (`portal/lib/discovery.mjs:582-586`).
  2. **`POST /api/discovery/propose`** — SSE, mirroring `/api/discovery/turn` (:213-244) line for line:
     the `open` flag, the `send` helper, the try/catch that emits `{ type: 'error' }` on the stream
     rather than a JSON body. **Every parameter named.** Wraps the run in `withDiscoveryRunLock`.
     Guards, in order: `resolveRunRoot` → `assertProvenanceRoot` → the package exists → **`head.endedAt`
     is set** (a *finished* package; refuse an open one by name) → `proposals.jsonl` is absent or empty
     unless `body.force === true` (D5).
  3. **`POST /api/discovery/verdict`** — plain JSON. Guards, then append the verdict line, then
     `writeProposalsMd(root)`, then return `proposalsView(root)`. **Server-written on a click**: the
     server assigns `type` and `ts`; the client sends `proposalId`, `verdict` and `reason` only.
- **PATTERN**: `portal/server.mjs:187-244`. Copy the comment discipline — each route's comment says what
  the route may and may not do.
- **GOTCHA**: `writePrd` is deliberately **not** imported by `server.mjs` (:193-200). Keep it that way,
  and add the mirror comment on the propose route: it writes `proposals.jsonl` and `proposals.md` and
  **nothing else in the package**.
- **VALIDATE**:
  ```bash
  cd portal && PORT=4791 npm start &          # a private port — never pkill -f 'node server.mjs'
  sleep 3
  curl -s 'http://127.0.0.1:4791/api/health' | head -c 200
  curl -s 'http://127.0.0.1:4791/api/discovery/proposals?slug=allergen-matrix-1&provenance=fictional'
  curl -s -X POST 'http://127.0.0.1:4791/api/discovery/verdict' -H 'content-type: application/json' \
    -d '{"slug":"allergen-matrix-1","provenance":"fictional","proposalId":"p99","verdict":"accepted","reason":"x"}'
  # must refuse by name: p99 is not a proposal in this package
  kill %1
  ```
- **SATISFIES**: AC #7.

---

### T11 · UPDATE `portal/public/` — the verdict UI

- **IMPLEMENT**:
  - `index.html`: inside `#discovery-session`, after `#discovery-recorded` (:206), a
    `<div id="discovery-proposals"></div>` and two buttons in the existing actions row —
    `#discovery-propose` ("Propose features") and `#discovery-proposals-md` ("Download proposals").
  - `portal.js`, in the discovery block: `loadProposals()`, `renderProposals()`, the propose handler
    (SSE reader loop copied from the form submit at :847-904), and a delegated click handler for the
    verdict buttons. Each proposal renders its id, status, title, `rests_on` seqs, `wrong_if`, `why`,
    and three buttons plus a reason input. **Every string through `esc()`.**
  - After any verdict, **re-read from disk** (`await loadProposals()`) rather than trusting the local
    copy — the package is the state (:900-901's rule).
  - `portal.css`: a `.discovery-proposal` block mirroring `.discovery-recorded-turn`'s existing styles.
- **PATTERN**: `portal/public/portal.js:811-836` (`renderDiscoveryRecorded`) and `:906-930` (the PRD
  download, including the fetch-refusal-as-readable-prose pattern).
- **GOTCHA**: `el.hidden = true` is a no-op wherever a CSS rule sets `display`
  ([[hidden-defeated-by-author-display]]). If the proposals block is toggled, assert both directions on
  the running page rather than trusting `hidden`.
- **GOTCHA**: a verdict button must be disabled while a request is in flight, the way
  `#discovery-submit` is — a double click would append two verdict lines to an append-only file.
- **VALIDATE**: open `http://localhost:4791`, open the Discovery drawer, resume
  `allergen-matrix-1` / `fictional`, and confirm the proposals block renders and a verdict lands.
  **Confirm nothing else in the package moved**: `git status --short discovery/allergen-matrix-1/`
  must list `proposals.jsonl` and `proposals.md` and **nothing else**.
- **SATISFIES**: AC #7.

---

### T12 · RECORD the real proposal run (spends tokens)

- **IMPLEMENT**: restart the portal so it boots from the tree (the drawer's build stamp says whether it
  is stale — `portal.js:731-741`). Run `--dry` once. Then run it for real through the drawer over
  `discovery/allergen-matrix-1/` (fictional, full-depth, 30 recorded ops, `endedAt` set).
- **GOTCHA — the honesty contract, hard**: never hand-write and never hand-edit a proposal line. **A bad
  run is fixed by a tighter prompt constant and a re-run, never an edit.**

- **THE RE-RUN PROTOCOL.** A model run is the one thing a plan cannot guarantee, so decide the rules
  **before** spending, not while looking at output you would rather keep.

  **What a good run is** — five conditions, and every one is countable rather than a judgement:
  1. at least three proposals filed (the refusals already guarantee each carries a resolvable
     `rests_on` and a non-blank `wrong_if` — a filed proposal cannot lack either);
  2. the refusal count is **not** greater than the filed count — a run refused more often than it
     succeeded is a prompt problem, not a stochastic one;
  3. no proposal's `why` asserts the proposal as settled ("we will build…", "the product needs…")
     rather than as an option. This is a **read**, and it is the only one;
  4. the run's `ok` is true — remember `ok` here reads `is_error`, which the session transport does
     not (see [[sdk-error-result-wears-success]]);
  5. **the proposals rest on more than one decision between them** — `new Set(all rests_on seqs).size
     >= 2`. Conditions 1-4 all pass on a run whose every proposal rests on the same single decision,
     which is formally clean and substantively useless: it means the model read one rung and stopped.
     This is a **countable** condition, not a read, so it belongs in the list rather than in the
     owner's judgement. Tighten `RESTS_ON_RULE` if it fails. Deliberately *not* a condition: how the
     seqs are distributed across the ladder, or whether the model picked the interesting decisions —
     both are the verdict distribution's job, and the ticket sets no target for it.

  **What to tighten, by failure mode.** One constant, edited **in place**, never appended:

  | What the run did | Tighten |
  |---|---|
  | filed nothing at all | `PROPOSAL_CONTRACT` — the count instruction |
  | kept getting refused on `rests_on` | `RESTS_ON_RULE` — "read the seq from the ledger below; do not recall it" |
  | kept getting refused on `wrong_if` | `WRONG_IF_RULE` |
  | wrote proposals as decisions | `OPTIONS_NOT_TRUTH` |
  | ran past `MAX_PROPOSALS` and kept trying | `PROPOSAL_CONTRACT` |

  **Order is load-bearing, and #341 bought that with a paid recording.**
  `portal/lib/discovery-postures.mjs:21-24`: the last instruction is the one a model is most likely to
  act on, which is why `EVIDENCE_RULE` was **inserted before** `PARENT_RULE` rather than appended after
  it, and why group 30 asserts that ordering. Put the proposer's most-violated rule **last**, and make
  a tightening an edit in place — appending a new rule silently takes the tail away from whatever held
  it.

  **The stopping rule: at most three paid attempts.** Run `--dry` before every one. If the third
  still fails a condition above, **stop.** Commit nothing into the package, and report the three
  transcripts and what was tightened between them. "The prompt could not be tightened into a clean run
  in three attempts" is an honest result and a better one than a fourth spend. It does not block the
  PR: Phase 1's gate is the load-bearing half and AC #6 is then reported as not met, with the evidence.

  **Never re-run for a nicer verdict distribution.** Conditions 1-4 are about the run's *form*, which
  is the agent's. The verdicts are the owner's and are the reading. A run whose proposals are all
  refused passes every condition above and is committed as it stands.
- **GOTCHA — declare the ceiling before starting.** Expect roughly one discovery turn's cost per
  proposal; the committed session turns on this package ran $0.03-0.10 each on Sonnet
  (`discovery/allergen-matrix-1/run.json`, observed). **Do not write a figure you have not observed** —
  the report carries the number the run actually printed, per [[discovery-cost-baselines]].
- **VALIDATE**:
  ```bash
  node discovery/proposals.mjs allergen-matrix-1 --stdout | head -60
  node tooling/build-checks.mjs | tail -3        # 34.11 flips from pending to green
  shasum -a 256 discovery/allergen-matrix-1/prd.md          # MUST equal T0's 096643ee…
  node discovery/prd-projection.mjs --root discovery/allergen-matrix-1 --stdout | shasum -a 256
  git diff --stat discovery/allergen-matrix-1/   # only the two new files
  ```
- **SATISFIES**: AC #4, AC #6.

---

### T13 · GIVE every proposal a verdict, through the portal

- **IMPLEMENT**: in the drawer, give **every** proposal from T12's run a verdict with a real reason.
- **GOTCHA**: **the verdict distribution is the reading — no target is set.** A run whose proposals are
  all refused is an honest result and the report says so plainly. Do not re-run to get a nicer spread;
  that would be tuning the evidence.
- **VALIDATE**:
  ```bash
  node -e "const {readProposalPackage,statusCounts}=await import('./discovery/proposals.mjs');const p=readProposalPackage('discovery/allergen-matrix-1');console.log(statusCounts(p.proposals))" --input-type=module
  # every proposal has a status other than "proposed"
  node tooling/build-checks.mjs   # 34.11: proposals.md equals the projection's bytes
  ```
- **SATISFIES**: AC #7.

---

### T14 · UPDATE `discovery/README.md`

- **IMPLEMENT**:
  - §Files (:65-89): two rows in the tree — `proposals.jsonl` ("append-only, two line types:
    proposal (the model's) · verdict (the owner's, server-written on a click); written only by a
    proposal run and the verdict route") and `proposals.md` ("GENERATED by the proposal fold and
    REGENERATED on every verdict — unlike prd.md, never hand-edited"). Add the sentence the ticket
    asks for: **a run package is three files during a session and five after a proposal run**, and say
    which act writes which.
  - A new **§Feature proposals (#359)** section after §The PRD projection, carrying: the two line
    shapes in §File shapes' exact style; the four refusals, each with its reason; the derived-status
    rule; the server-assigned-id rule; the regenerate-not-refuse rule and why it differs from `prd.md`;
    the fence — **the same predicate at the same two sites a session runs under**, widened by one tool
    name and given a recorder that streams instead of writing, with `allowSetFor({ root, reads: [] })`
    unchanged and no built-in tools, because the brief carries the package; and the honest caveat that
    #348 measured *judging*, not *proposing*, so the model choice is unsettled — with the model this
    run actually used named.
  - **§The read fence (#287)** (:516-550): one sentence naming `extraTools` and `write`, so the
    section that says "one predicate, two call sites, failing closed" still describes what is there.
    That section is the fence's specification; leaving it narrow is how a reader comes to believe a
    proposal run has its own fence.
  - §Workflow (:574-595): the three new commands (`--dry`, the fold's CLI, the drawer path).
- **VALIDATE**: `node --check` is not applicable to markdown; read it back and confirm every claim in
  it is one the code enforces. **Do not write a claim the gate does not check.**
- **SATISFIES**: AC #8.

---

### T15 · UPDATE `CLAUDE.md` and `.claude/references/gates.md`

- **IMPLEMENT**:
  - `CLAUDE.md` architecture map, the `discovery/` line: add
    `proposals.mjs: the proposal shapes, the four refusals, the derived status and the proposals.md fold — pure, never imported by prd-projection.mjs`,
    and add `proposals.jsonl · proposals.md` to the `discovery/<slug>/` line.
  - `CLAUDE.md:110` (the `tooling/` map line): `build-checks.mjs   33 PURE groups` → `34 PURE groups`;
    and `CLAUDE.md:177` (the `gates.md` on-demand-context line): `build-checks' 33 groups` → `34`.
  - `CLAUDE.md` §Where new code goes: a bullet — **New discovery proposal run** → a REAL run through
    the portal's proposal control; `proposals.jsonl` is server-written and append-only; never
    hand-written, never hand-edited; a bad run is re-run with a tighter prompt constant. And extend the
    existing "New discovery op verb or run" bullet with one clause: a proposal is **not** an op and has
    no route into the op grammar.
  - `.claude/references/gates.md:11`: heading `— 33 pure groups, in CI` → `34`.
  - `.claude/references/gates.md:5`: add `34` to the roster listing which groups carry a "what it
    cannot reach" sentence (`Groups 9, 11, 13, 16, 18, 19, 23, 24, 25, 26, 27 and 28 each carry that
    sentence`). Group 34 does carry one, so it belongs in that list.
  - `.claude/references/gates.md`: a **Group 34** paragraph after group 33's, in the same style — what
    it drives, and what it **cannot reach**: whether the model's proposals are any *good* (a human read
    of the verdict distribution, and the ticket sets no target); whether a fence deny stops a call at
    run time (`--probe-fence`'s standard, which after T8a covers the proposal run too — one predicate,
    the same two sites); and whether the SDK half behaves at all, since CI has no
    `portal/node_modules` and case 34.12 is a source pin over text, not a run.
  - `.claude/references/gates.md`, **group 30's paragraph**: extend it to name `extraTools` and
    `write` — one fence serving two kinds of run, with `extraTools: []` proven byte-identical to
    today and `write` proven to keep a proposal run's refusals out of `transcript.jsonl`. A widened
    gate whose doc still describes the narrow one is how a reviewer comes to trust the wrong thing.
- **VALIDATE**:
  ```bash
  grep -rn '33 PURE\|33 pure\|all 33 groups\|Thirty-three\|33 groups' CLAUDE.md .claude/references/gates.md tooling/build-checks.mjs
  # must return nothing
  ```
- **SATISFIES**: AC #8.

---

### T16 · WRITE the report and run the full gate

- **IMPLEMENT**: `.claude/reports/discovery-proposals-359-report.md` — the model the run used, the
  observed cost and turn count, **every refusal the run hit with its message**, the proposal count, the
  verdict distribution stated plainly, and the open question (#348's number does not transfer to
  proposing; a comparison would be its own ticket).
- **GOTCHA**: refusals are streamed and counted, never persisted (D6). **The report is the only place
  they are kept**, so it must carry them verbatim.
- **VALIDATE**: the full pre-PR gate, in this order:
  ```bash
  node tooling/build-checks.mjs                       # all 34 groups pass
  node tooling/drift-check.mjs                        # no drift
  node tooling/token-lint.mjs                         # unaffected, run anyway
  git add -A && node agent-layer/gen-loc-summary.mjs --check   # AFTER git add — it reads tracked content
  cd portal && PORT=4791 npm start & sleep 3 && curl -s localhost:4791/api/health && kill %1
  shasum -a 256 discovery/*/prd.md                    # every line equals T0's table
  ```
- **SATISFIES**: every AC.

---

## TESTING STRATEGY

This repo has **no test suite, no linter and no type-check** (CLAUDE.md §Ground rules) — do not hunt for
one or invent one. "Done" means the gate ran.

### The pure layer — build-checks group 34

Everything in `discovery/proposals.mjs` is driven in CI with no `portal/node_modules`, over synthetic
fixtures built by running the **real applier**. Every refusal is matched against the value it must name.
Every case has a **positive control** so it cannot pass because everything is refused, and a **mutation**
that turns it red.

### The SDK layer

Not driven in CI — no SDK, no token, and a token-spending gate would not be deterministic. Four
substitutes, all standard in this repo:
- **The fence is not in this layer at all.** After T8a the proposal run uses the same predicate at the
  same two call sites the session does, so group 30 cases 24 and 25 drive it in CI and
  `--probe-fence`'s paid observation covers it. That is the whole point of parameterising rather than
  duplicating: the part hardest to test moved out of the untestable layer.
- **Source pins** (case 34.12): the proposer read as text, asserted **not** to import the eleven names
  that would move `run.json`, `transcript.jsonl` or a posture fingerprint, and asserted **to** import
  the fence and wire both sites from one object. Every regex carries a positive control.
- **`--dry`**: the preflight rows over the real MCP server, spending nothing, asserting the advertised
  tool's `required` array by name and order — `discovery-transport.mjs`'s `--preflight` (:233-358) is
  the shape.
- **Phase 4's run is the observation**, and its five pass conditions are written down in T12 before
  anything is spent.

### The guarantee

AC #4 is proven three ways and none of them is an argument:
1. group 34 case 34.5 — `projectPrd` byte-identical with and without proposal lines, in memory, with a
   mutation that makes the compare fail;
2. T12's shell compare — the committed `prd.md`'s sha256 before and after the real run;
3. case 34.12's source pin — the proposer imports nothing that writes `run.json`.

### Edge cases that must be driven

- A proposal whose `rests_on` names a `file_evidence`, a `flag_weak_answer`, a seq the ledger lacks, and
  seq `0` / a negative / a float / a string.
- `wrong_if` as `""`, `"   "`, `null`, `undefined`, a number and an array.
- Two proposals claiming the same `id`; ids out of order; an id that is not `p<n>`.
- A verdict naming no proposal; three verdicts on one proposal; a verdict with a blank reason.
- The three CommonMark line endings in every string field of both line types **and** `run.json`.
- A `|` in a `title` reaching the rested-on table.
- An empty `proposals.jsonl` and an absent one (both read as `[]`).
- A `proposals.jsonl` line whose `type` is `"proposalx"` — **refused**, never filtered away.
- The whole ledger empty: `projectProposals` renders every heading and no claim.

---

## VALIDATION COMMANDS

### Level 1 — syntax

```bash
node --check discovery/proposals.mjs
node --check portal/lib/discovery-proposer.mjs
node --check tooling/build-checks.mjs
```
CI's `verify` job `node --check`s every tracked `.mjs`, including files under `.claude/plans/`
([[drift-check-syntax-checks-parked-mjs]]) — park any fragment as `.txt`.

### Level 2 — the gate

```bash
node tooling/build-checks.mjs        # must print: build ✓  all 34 groups pass
node tooling/drift-check.mjs
node tooling/token-lint.mjs
git add -A && node agent-layer/gen-loc-summary.mjs --check
```

### Level 3 — the guarantee

```bash
shasum -a 256 discovery/*/prd.md
for d in discovery/*/; do [ -f "$d/run.json" ] && printf "%-22s %s\n" "$(basename $d)" \
  "$(node discovery/prd-projection.mjs --root $d --stdout | shasum -a 256 | cut -c1-16)"; done
node -e "import('./portal/lib/discovery-postures.mjs').then(m=>console.log(m.POSTURES.think.fingerprint, m.POSTURES['think-opus'].fingerprint))"
```
Every line must equal T0's baseline.

### Level 4 — manual, on the running portal

```bash
cd portal && PORT=4791 npm start &
```
Port-scoped, and **never `pkill -f 'node server.mjs'`** — that kills sibling sessions' recorders
([[portal-smoke-port-scoped-kill]]). Then: the drawer resumes `allergen-matrix-1`, the proposals block
renders, a verdict lands and re-reads from disk, and
`git status --short discovery/allergen-matrix-1/` lists exactly two changed files.

### Level 5 — not applicable, and stated so nobody spends the run

- **No visual-regression run.** The portal is never deployed and no shipped page changes, so no
  committed baseline can move.
- **No `param-manifest.json` / `gen-param-count.mjs` regeneration.** No live-manipulable control on a
  shipped page is added.
- **No `gen-handoff.mjs` regeneration.** No token and no spec changes.
- **`gen-loc-summary.mjs` is unaffected by the new source files** — its three groups match
  `system/`, root+`proto/` HTML and `agent-layer/` only (`agent-layer/gen-loc-summary.mjs:22-27`);
  `discovery/`, `portal/` and `tooling/` match none. Run `--check` anyway, after `git add`.

---

## ACCEPTANCE CRITERIA

Taken verbatim from issue #359, each mapped to the task and the case that proves it.

- [ ] **AC #1** — `proposals.jsonl`'s two line shapes and the derived status are a **pure module**,
      gateable in CI with no `portal/node_modules`, driven over a synthetic ledger in a new
      build-checks group. → T2, T4, T7, T8 (34.1, 34.2, 34.3, 34.7)
- [ ] **AC #2** — **all four refusals driven**, each on its message, with the mutation that turns each
      red. → T3, T8 (34.4, 34.5, 34.6)
- [ ] **AC #3** — `proposals.md` is a **pure, byte-deterministic fold** with its own honesty header; a
      hostile string in a proposal's `title` or `why` cannot add a heading (group 31's injection
      battery, re-run on this fold). → T1, T5, T8 (34.8, 34.9, 34.11)
- [ ] **AC #4** — **`prd.md` is byte-identical before and after a proposal run** over a committed
      fixture. **Observed, not argued.** → T0, T8 (34.5, 34.12), T12
- [ ] **AC #5** — **neither `POSTURES.think.fingerprint` nor `POSTURES['think-opus'].fingerprint`
      moves.** Group 32 stays green and `discovery/instrument-loans-1/` is not re-recorded. → T9's two
      gotchas, T8 (34.13)
- [ ] **AC #6** — **one REAL recorded proposal run** over a committed package
      (`discovery/allergen-matrix-1/`), proposals committed, every one carrying a `rests_on` and a
      `wrong_if`. Never hand-written, never hand-edited; a bad run is re-run. → T8a (the run can call
      its tool at all), T9, and T12's five pass conditions + three-attempt stopping rule
- [ ] **AC #7** — the owner gives **a verdict to every proposal** through the portal, verdicts
      committed. The verdict distribution **is** the reading — no target. A run whose proposals are all
      refused is an honest result and is reported as one. → T10, T11, T13
- [ ] **AC #8** — `discovery/README.md` declares the two new files, which act writes each, and the four
      refusals. → T14, T15

---

## COMPLETION CHECKLIST

- [ ] T0's baseline captured and pasted into the PR body
- [ ] All eighteen tasks (T0-T16, plus T8a) completed in order, each validation run where it is named
- [ ] `node tooling/build-checks.mjs` → `all 34 groups pass`
- [ ] Each new group-34 case proven able to go **red** by mutation, one at a time
- [ ] **T8a's mirror case green**: `extraTools: []` byte-identical to the argument being absent, in
      decision and reason, across case 25's whole battery
- [ ] Build-checks green with `portal/node_modules` moved aside
- [ ] **T12's stopping rule honoured**: at most three paid attempts, `--dry` before each, and the
      report names what was tightened between them
- [ ] `node tooling/drift-check.mjs` clean · `node tooling/token-lint.mjs` clean
- [ ] `gen-loc-summary.mjs --check` clean, run **after** `git add`
- [ ] Every `discovery/*/prd.md` sha256 equals T0's table
- [ ] Both posture fingerprints equal T0's values
- [ ] Portal boots on a private port and `/api/health` answers
- [ ] `git status --short discovery/allergen-matrix-1/` lists exactly `proposals.jsonl` and
      `proposals.md`
- [ ] Report written with the observed cost, the model, the refusals and the verdict distribution
- [ ] PR body carries **`Closes #359`** — a title mentioning `(#359)` closes nothing
      ([[prs-dont-auto-close-tickets]])
- [ ] The plan, the report and the review all land in this PR (CLAUDE.md §Ground rules)

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — the model.** The plan assumes `claude-opus-5`, which the ticket recommends. #348 measured whether
Opus *judges* better than Sonnet; proposing is a different task and that number does not transfer.
**Proceeding on Opus and naming it in the report**, with the comparison left open as its own ticket. If
the owner wants Sonnet, it is a one-const change in `discovery-proposer.mjs` and the report names that
instead — nothing else in the plan moves.

**Q2 — where a refused proposal's receipt lives.** The honesty contract keeps refusal receipts (a
`denied` line is "the governance story, not something to hide"), but the ticket pins `proposals.jsonl`
at **two** line types. **Proceeding with two**: a refusal is streamed to the operator, returned to the
model so it can correct inside the same turn, counted, and recorded **verbatim in the PR report**. If
the owner wants a third `refused-write` line type, it is a `LINE_TYPES` entry plus a case in 34.1 and a
row in the README — small, and better decided after seeing what the real run's refusals look like.

**Q3 — a second proposal run on the same package.** The plan **refuses** one without an explicit force,
mirroring `writePrd`'s refuse-to-overwrite. The alternative — appending a second run's proposals to the
same file — is expressible (ids continue from the max) but makes "which run proposed this" a fold over
`fingerprint`, which nothing renders yet. Refusing is the smaller commitment and is reversible.

**A1 — the brief carries the package, so the run needs no `Read` tool.** Everything the model may see is
in the prompt, exactly as a session turn's ledger brief is. This is what lets `allowSetFor({ root,
reads: [] })` stay literally unchanged and `tools: []` stay closed.

**A2 — `allergen-matrix-1` is the subject.** It is the only committed full-depth run (30 of 30 answered,
`endedAt` set). If the run needs re-running, `--force` re-runs on the same package rather than moving to
a different one, so the artefact stays comparable.

**A3 — `proposals.md` is regenerated, not hand-edited.** This is the one place the plan deliberately
diverges from `prd.md`'s rule, because a verdict changes the page and a refuse-to-overwrite would break
the feature. The compensating guard is case 34.11's byte compare.

---

## NOTES (open canvas)

### D1 — why `discovery/proposals.mjs` and not an extension of `prd-projection.mjs`

Refusal 4 is the ticket. Putting the proposal fold inside `prd-projection.mjs` would make "a proposal
never appears in `prd.md`" a discipline rather than a structure, and one shared `readPackage` away from
being false. Two modules, one importing three containment helpers from the other in one direction only,
makes the separation checkable: case 34.5's source pin asserts `prd-projection.mjs` never names
`proposals`, and the import graph has no cycle.

### D2 — why the proposal run is its own module, not a third posture

This is the decisive constraint and it is worth stating plainly:

```js
// portal/lib/discovery-postures.mjs:240-243
export function fingerprintOf({ build, model }) {
  const { systemPrompt, prompt } = build(FINGERPRINT_INPUTS);
  return createHash('md5').update([model, systemPrompt, prompt, JSON.stringify(TOOL_DESCRIPTIONS)].join('\n \n')).digest('hex');
}
```

`TOOL_DESCRIPTIONS` is a module-level frozen object and **both** shipped postures hash
`JSON.stringify` of it. A proposal tool description added there moves `POSTURES.think.fingerprint` and
`POSTURES['think-opus'].fingerprint` together, which makes `discovery/instrument-loans-1/` stale under
group 32 and fails AC #5. Two further reasons back the same call: group 30 pins the posture key set, so
a third entry with a different shape goes red; and `discoveryConfig()` maps `Object.values(POSTURES)`
into the drawer's **session** posture picker, where a proposal posture does not belong.

### D3 — why three `export` keywords instead of a copy, and what that does *not* buy

`fold`'s `[\r\n]` character class and `blockquote`'s `LINE_ENDING` split are each a hole this repo
already found and closed once — `prd-projection.mjs:80-89` and `:97-101` document both. A second
**production** copy lets one be fixed while the other stays broken, and `proposals.md` would then be
rendered by a different function from the one the battery has already hardened.

What it does **not** buy is "one copy everywhere". `tooling/build-checks.mjs:6731-6734` declares its
own local `fold` and `esc`, deliberately — *"Mirrors the module's fold EXACTLY. A one-space copy here
would build a match set the page never contains."* The assertion side has to mirror independently or
it proves nothing, so group 34 declares local copies too. Production gets one implementation; the gate
keeps its own mirror on purpose.

The change is byte-neutral by construction, and the six-package hash compare in T1 is the
discriminating check that proves it.

### D4 — why the fence is parameterised, not duplicated

Two hard blockers stop the proposer using `fenceHooks` as it stands, both in
`portal/lib/discovery.mjs`:

```js
const ALLOWED_TOOL_NAMES = new Set(OPS.map(toolNameFor));         // :148 — the four op tools, and only those
export function allowsToolName(name) { return typeof name === 'string' && ALLOWED_TOOL_NAMES.has(name); }
```
`mcp__proposals__propose` is not in that set, so `fenceDecision` would **deny the proposal run's own
tool** and the run could not work. And:
```js
const record = (line) => { try { const written = appendTranscript(root, line); onLine?.(written); } … };   // :314
```
`fenceSite`'s recorder writes into **`transcript.jsonl`** — the session's file, which this ticket must
not touch.

**An earlier draft of this plan answered both by duplicating the predicate in the proposer. That was
wrong, and the repo already says so in a gated assertion** (`tooling/build-checks.mjs:6290`):
*"the transport still carries an inline `canUseTool` or imports `allowsToolName` — a second copy of
the fence is a second fence."* A duplicate would also be a fence with **no run-time proof**: whether a
deny actually stops a call is a fact no CI group can see, and `--probe-fence`'s three paid turns would
be evidence about the *other* copy.

So T8a parameterises instead — `extraTools` and `write`, both defaulted, both driven in group 30. One
predicate, two call sites, and the existing probe's evidence covers the proposal run as well.
`mainTools` is the precedent for the shape and case 25 is the precedent for the cases. `allowsToolName`
is deliberately **not** widened: case 14 drives it exhaustively as the statement *the discovery
session's vocabulary is the four op verbs*, and that statement stays true.

**What is still unproven at run time, and how each half is answered.** The deny side is the same
predicate at the same two sites `--probe-fence` already observed holding alone (`BOTH_SITES_HOLD`,
2026-09-01). The allow side — does `mcp__proposals__propose` actually reach its handler — is answered
by **Phase 4's run itself**: had the fence denied it, the run would produce zero proposals, and the
committed `proposals.jsonl` is the receipt that it did not.

### D5 — `run.json` is what breaks byte-identity, not `transcript.jsonl`

Worth spelling out, because the intuition points the wrong way. `readPackage` filters the transcript to
`type === "op"` (`prd-projection.mjs:717-726`), so a stray `text` or `denied` line would be *harmless*
to `prd.md`. What is **not** harmless is `run.json`: `projectPrd:661` renders

```
… · model ${field(run.model)} · posture ${field(run.posture)} · ended … · ${run.turnStats.length} turn(s)
```

so a single `recordTurnStats` call changes the Run line and fails AC #4. That is why the proposal run
writes **nothing** to `run.json` and why `model` and `fingerprint` ride on each proposal line instead.
Case 34.12's source pin is the guard.

### D6 — what the plan trades away, honestly

- **The run's cost is not in the package.** It is in the report and in the SSE stream only. The
  alternative — a `proposalStats` field on `run.json` — is exactly what AC #4 forbids. If a durable cost
  record is wanted later, it belongs on a proposal line or in a sixth file, not on the head.
- **A refused proposal leaves no committed receipt.** Q2 above. The report carries them.
- **The fence module gains two parameters it did not need before.** T8a edits
  `portal/lib/discovery.mjs`, which group 30 drives more exhaustively than anything else in the repo.
  That is the cost. It is the right trade against the alternative — a duplicate predicate in the
  proposer — because the alternative is the thing case 12 already refuses on the transport (*"a second
  copy of the fence is a second fence"*) and because a duplicate would carry no run-time evidence at
  all. Both opts default to today's behaviour, and the mirror case (`extraTools: []` byte-identical to
  the argument being absent) is what makes that claim checkable rather than asserted.
- **The proposal run has no probe of its own.** `--probe-fence` observes the session's wiring; the
  proposer's wiring is the same two functions with different opts, so the *predicate* is covered and
  the *wiring* is a source pin plus Phase 4's run. A dedicated three-turn probe for the proposer would
  cost roughly what `--probe-fence` cost ($0.398, observed 2026-09-01) and is not proposed here. If a
  later ticket widens the proposal run's `reads` beyond `[]`, that is the moment to buy one.

### Sequencing

#348 is **closed** and there are **no open PRs** (observed 2026-09-03), so nothing competes for the
portal's single run lock. The branch is `feat/283-bank-width` at planning time — **start this ticket
from a fresh branch off `main`**, and check `origin/main` first: sibling sessions continue
agent-opened branches pre-merge ([[owner-merges-fast-verify-landed]]).

### The three risks the first draft carried, and how each was closed

Recorded because a plan that quietly drops its own risks teaches nobody, and because the second one
changed the design.

**R1 — group 34's injection battery would copy floor counts that are wrong for this shape.**
31.13 asserts `folded >= 25 && refused >= 10`, and those ten refusals come from three closed-set enum
params (`level`, `source`, `provenance`) that a proposal line does not have. Copied, the case is red on
day one. **Closed** by replacing the floors with a census that iterates `PROPOSAL_KEYS` and
`VERDICT_KEYS`, plus two guards that stop it balancing vacuously. Strictly stronger than a floor: a
field added to either list must be classified or the case fails by name.

**R2 — Phase 4's run might need re-running, with no rule for when to stop.**
"Tighten and re-run" is not a protocol; it is what someone says before spending a fourth time on a run
they have already decided to keep. **Closed** by writing the rules down before any money is spent: five
countable pass conditions — including the one that catches a formally clean but useless run, where
every proposal rests on the same single decision — a table mapping each failure mode to the one
constant it tightens, the
edit-in-place rule the prompt ordering demands, and **a hard stop at three paid attempts** with "the
prompt could not be tightened into a clean run" as a reportable result. And the explicit converse:
never re-run for a nicer verdict distribution, because that is tuning the evidence.

**R3 — the proposer's fence was a second implementation with no run-time proof.**
This one changed the design. The first draft had the proposer declaring its own tool-name gate and
recorder, reusing only the pure predicate. Group 30 case 12 already refuses exactly that on the
transport (`tooling/build-checks.mjs:6290` — *"a second copy of the fence is a second fence"*), and a
duplicate would have put the least testable part of the ticket in the layer CI cannot reach.
**Closed** by T8a: two defaulted opts on `portal/lib/discovery.mjs`, `mainTools` as the precedent for
the shape and case 25 as the precedent for the cases. One predicate, two call sites, and
`--probe-fence`'s existing paid observation now covers the proposal run as well.

### Where a reviewer should look hardest

1. **Case 34.5's mutation.** If the "prd.md is unchanged" compare cannot be made to fail, it is testing
   nothing — the exact failure mode every #137 defect shared ([[check-that-cannot-fail]]).
2. **Case 34.9's census.** 31.13 asserts `folded >= 25 && refused >= 10` so a new param must be
   driven; those numbers come from three closed-set enums this shape does not have, and copying them
   is a red gate on day one. T8 replaces them with `folded + refused === expected`, derived from the
   fixture's own string fields. If a reviewer sees a hardcoded floor there, it was copied.
3. **Case 34.12's import pin.** It is the only thing standing between a future edit and a silently
   broken AC #4, and every regex in it needs a positive control — a pin that never matched passes
   forever.
4. **T8a's mirror case.** `extraTools: []` must be proven **byte-identical** to the argument being
   absent, across case 25's whole battery in decision *and* reason. Without it, "no existing group-30
   case changes behaviour" is a claim rather than a result, and the fence is the one place in this
   ticket where a silent widening would matter.
5. **T12's stopping rule.** Three paid attempts, then stop and report. If the PR shows a fourth, the
   protocol was abandoned mid-run — which is exactly when a bad run gets kept because it was expensive.

---

## AMENDMENTS

_(none — created 2026-09-03)_
