# Feature: the discovery op vocabulary + pure applier (`discovery/ops.mjs`), build-checks group 28, and the run-package format spec

The following plan should be complete, but validate documentation and codebase patterns and task sanity before implementing.

Pay special attention to naming of existing utils and exports. Import from the right files.

## Feature description

`discovery/ops.mjs` is the discovery epic's honesty claim made mechanical. The agent that interviews a person against the question bank can only file four things — a decision, a weak-answer flag, an open question, a piece of evidence — and it files them through an op grammar whose `record_decision` verb **has no parameter for answer text at all**. It carries `answer_ref: "a7"`; the applier resolves `a7` against `answers.jsonl`, which only the server writes. The agent therefore has no route to put words in the human's mouth, and the line "the agent judges form, never substance" (PRD MVP 6) is a property of the data model rather than a sentence in a prompt.

This ticket ships the vocabulary, the pure applier, the CI group that feeds the applier broken ops in an environment with no SDK installed, the run-package format spec (`discovery/README.md`), the md5 pin on run 2's frozen fixture, the CLAUDE.md index lines, and one stale-sentence correction in the architecture doc.

## User story

As the operator running a discovery session (and later, an auditor reading its package)
I want every filing the agent makes to pass through one grammar that refuses a fabricated answer, a second outcome for one question-turn, an unknown question, or an unlabelled source
So that the run package can be audited by diffing two files, and a decision with no evidence or no parent is visible as a flag rather than silently accepted.

## Problem statement

Nothing in the repo can hold a discovery decision, and the discovery workflow that exists (the terminal) produces prose, which cannot enforce that a decision names its evidence or its parent requirement. The architecture decided the fix (answer-by-reference, four ops, R2, refuse-vs-flag) but none of it exists as code, and until the applier exists, #284 (the spine), #290 (the PRD projection) and #318 (canvas D2) have nothing to fold over.

## Solution statement

Mirror `system/board-ops.mjs` one directory over: a frozen `OPS` list, an exact `PARAMS` table, a hand-validating `checkOp`, a pure `applyOp(state, op, ctx)` that returns a new state carrying the recorded op with its `seq`, `turn`, `flagged[]`, `closes` and `supersedes`, and an `applyOps` fold. The context (`answers`, `bank`, `turn`) is passed in, never imported, so the module has no SDK, no filesystem and no `discovery/bank.mjs` in its import graph — #282 is a parallel ticket and its export names are not this module's business. Group 28 in `tooling/build-checks.mjs` iterates `OPS`, drives every refusal by feeding a broken op, asserts both flag directions, pins the fixture's md5 with a mutation that proves the compare can fail, and states what it cannot reach (the server, the transcript writer, the real bank).

## Out of scope / non-goals

- Not included: the op **transport** (in-process SDK tool vs fenced CLI) — spike #280's verdict; the applier is transport-agnostic and takes a plain `{ op, params }` envelope.
- Not included: the answer store writer, the transcript writer, the session cursor, `run.json` emission — #284/#285. This ticket specifies the file shapes in the README; it writes no run package.
- Not included: the real bank — #282. The applier takes `ctx.bank` as data.
- Not included: the PRD projection — #290 reads what this ticket records.
- Not included: the not-a-form counter and the coverage read — #285 computes them from the records this applier emits (the fields it needs — `closes`, `op`, `turn` — are recorded here so the arithmetic is possible).
- Not changing: `system/board-ops.mjs`, any shipped page, `system/loc-summary.json` (nothing under `system/` or `agent-layer/` is added — the epic's tripwire row).
- Not changing: build-checks' stale header sentence "Twenty-three groups" (pre-existing drift, not this ticket's line).

## Feature metadata

**Feature type**: New capability
**Estimated complexity**: Medium (small surface, high assertion density — the gate is ~1/3 of the work)
**Primary systems affected**: `discovery/` (new dir), `tooling/build-checks.mjs`, `CLAUDE.md`, `.claude/references/gates.md`, `docs/epics/discovery-partner.architecture.md`
**Dependencies**: none — zero-dep Node ESM, `node:crypto` for the md5 case only

## Related work

**Implements**: [#281](https://github.com/linardsb/ux-factory/issues/281) · **Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) → `docs/epics/discovery-partner.architecture.md` (decided 2026-08-27; §Data model, §Boundaries & contracts, §Other eng-lead calls are inherited, not re-decided)

**Back-references** (decisions this inherits):

- `docs/epics/discovery-partner.architecture.md` §Recommended approach — answer-by-reference; §Data model — the op table, R2 keyed on the turn, refuse-vs-flag, the four throws, the run package layout, R1 provenance root; §Other eng-lead calls — the fixture md5 case, "build-checks grows one group".
- `docs/epics/discovery-partner.prd.md` MVP 6, 8, 9, 10; Success metrics "Auditability", "Not a form".
- Issue #281 comment 2026-08-28 (canvas epic #295, D2/#318): supersede rule — landed here (Task 2).
- `system/board-ops.mjs` — the vocabulary + applier precedent. `tooling/build-checks.mjs` group 11 — the gate precedent.

**Forward-references** (append as they are created):

- #284 spine plan — writes `answers.jsonl` / `transcript.jsonl` in the shape README §Files pins; calls `applyOp` per turn.
- #290 projection plan — folds `transcript.jsonl` `op` lines; reads `flagged`, `supersedes`, `seq`.
- #318 (canvas D2) — pins a decision as `{ question_id, seq }`.

---

## CONTEXT REFERENCES

### Relevant codebase files — READ THESE BEFORE IMPLEMENTING

- `system/board-ops.mjs` (whole file, 320 lines) — Why: the shape to mirror exactly. Lines 34–56 `OPS` + `PARAMS`; 82–97 `checkOp` (exact params: unknown key throws, missing key throws); 101–177 `applyOp` pure-by-clone with a `switch` and an unreachable `default`; 180–189 `applyOps` fold rethrowing with the index. Copy the *discipline*, not the board logic.
- `tooling/build-checks.mjs` lines 1–135 (header list — add entry 28), 136–176 (imports — add the `discovery/ops.mjs` import and `createHash`), 178–193 (`ok` / `group` helpers), 1844–2146 (group 11 — synthetic in-memory fixtures, a `threw()` helper, refusal cases each asserting the message names the op/seq, the corrupted-label mutation at 2080–2090 that "decides whether case 1 is real"), 4990–5105 (group 27 + the verdict block — the final "all 27 groups pass" string).
- `agent-layer/gen-loc-summary.mjs` lines 20–25 — Why: the three regexes that prove `discovery/` is counted by nothing. Cite the line in the module header.
- `traces/README.md` — Why: the typed-line JSONL style (`type`, `seq`, `ts`, a `denied` step at "A fence denial") the transcript mirrors, and the honesty-rules block the README mirrors.
- `replay/README.md` lines 1–60 and `scenarios/README.md` lines 1–45 — Why: README register: "Spec for epic #N, ticket #N · architecture §X", a Files tree, honesty rules in bold, file shapes with JSON examples.
- `docs/epics/discovery-partner.architecture.md` lines 116–206 (§Data model) — Why: the op table, R2, refuse-vs-flag, the four throws, the run-package tree, R1. Lines 277–282 — the stale sentence to correct. Lines 298–305 — the md5 case.
- `.claude/references/gates.md` lines 7–15 — Why: the gate index; add group 28's line and bump the count.
- `CLAUDE.md` lines 102–103 (map: `replay/` … `handoff/`), 108 (`build-checks.mjs 27 PURE groups`), 145 (`**New replay run**` bullet — the register for the new `**New discovery run**` / op-verb bullet).
- `tooling/drift-check.mjs` lines 29–40 — Why: every tracked `.mjs` is `node --check`ed in CI; `discovery/ops.mjs` is covered automatically, nothing to register.

### New files to create

- `discovery/ops.mjs` — the vocabulary, enums, `checkOp`, `applyOp`, `applyOps`, `emptyRun` (~230–300 lines with header).
- `discovery/README.md` — the run-package format spec (~150–200 lines).
- `.claude/reports/discovery-ops-applier-281-report.md` — written by `piv-implement`; must record the manual mutation run (Task 6).

### Relevant documentation

- `docs/epics/discovery-partner.architecture.md` §Data model — the source of every rule below. Read it before the module header is written; the header cites it.
- `docs/research/requirements-hierarchy.md` — the BABOK ladder (business ← stakeholder ← solution ← transition) that `LEVELS` encodes in order.
- Node `node:crypto` `createHash("md5")` — the md5 case. No external docs needed; Node 20 (local) and 24 (CI) both carry it.

### Patterns to follow

**Vocabulary + exact params (board-ops.mjs:34–56):**

```js
export const OPS = Object.freeze(["record_decision", "flag_weak_answer", "open_question", "file_evidence"]);
export const PARAMS = Object.freeze({
  record_decision: ["question_id", "answer_ref", "level", "parent_id", "evidence_refs", "wrong_if", "off_script"],
  flag_weak_answer: ["question_id", "answer_ref", "missing"],
  open_question: ["source", "question_id", "answer_ref", "reason"],
  file_evidence: ["url", "ref", "provenance", "claim_ref"],
});
```

`PARAMS` is **exported** here (board-ops keeps its private) so group 28 can assert `Object.keys(PARAMS)` equals `OPS` in both directions — the "a verb with no PARAMS entry fails loudly" AC.

**Error style (project rule + board-ops):** plain `Error`, message starts with the op name and names the offending field or value: `` `${op.op}: "${k}" is required` ``, `` `record_decision: answer_ref "a9" does not resolve — answers.jsonl holds a1…a8` ``. No error classes.

**Purity (board-ops.mjs:101):** never mutate the argument; return a new state. `applyOps` rethrows with the index: `` `op ${i} (${op?.op ?? "?"}): ${e.message}` ``.

**Gate voice (group 11):** every check RUNS the function; a refusal is asserted with `threw(() => …)` and the message matched against the op/field it must name; a positive control precedes each refusal so a broken fixture cannot make a refusal pass for the wrong reason; the group ends with a `group("discovery ops", "…")` sentence listing what was proven AND what the group cannot reach.

**Header register (board-ops.mjs:1–31):** file path, one-line what, the governing citations, the invariants a future editor must keep, numbered.

---

## IMPLEMENTATION PLAN

### Phase 1 — the module

`discovery/ops.mjs`: enums, `PARAMS`, `checkOp`, `applyOp`, `applyOps`, `emptyRun`. No imports. Node-import-safe.

### Phase 2 — the gate

**Depends on:** Phase 1.
Group 28 in `tooling/build-checks.mjs`: the import, the header entry, the group body, the verdict count. Includes the md5 case.

### Phase 3 — the spec and the index

**Independent of:** Phase 2 (different files; can run in parallel with it once Phase 1's shapes are fixed).
`discovery/README.md`, CLAUDE.md, gates.md, the architecture-doc sentence.

### Phase 4 — validation and the mutation record

**Depends on:** Phases 1–3.
Run the gate, run it with `portal/node_modules` moved aside, run drift-check, perform the manual source mutation and record it in the report.

---

## THE DESIGN (fixed here so the tasks are mechanical)

### State and context

```js
// state — the run's op ledger, nothing else. Pure value; applyOp returns a new one.
{ ops: [record, …] }                       // emptyRun() → { ops: [] }

// ctx — passed in by the caller (the server, the gate, the projection). NEVER imported.
{ answers: [{ ref: "a1", … }, …],          // parsed answers.jsonl lines; only `ref` is read
  bank:    [{ id: "q1", … }, …],           // the bank's question list; only `id` is read
  turn:    "t7" | null }                    // the server's current banked-question turn id

// record — what applyOp appends. The transcript writer (#284) adds `type: "op"` and `ts`.
{ seq: 3,                                   // 1-based, strictly increasing, THE address of this op
  turn: "t7" | null,
  op: "record_decision", params: { …exact… },
  closes: true | false,                     // R2: did this op close its turn
  flagged: [] | ["no-evidence"] | ["orphan"] | ["no-evidence", "orphan"],
  supersedes: null | <seq> }                // record_decision only; the earlier decision on the same question_id
```

`ctx.answers` is an **array of objects carrying `ref`** and `ctx.bank` an **array of objects carrying `id`** — one shape each, chosen to match what `answers.jsonl` parses to and what `system/build-questions.mjs`'s `QUESTIONS` looks like (which #282 mirrors). The applier builds a `Set` of each on every call; the cost is nothing at this scale and it keeps the module stateless.

### Addressing

Every recorded op is addressed by its `seq`. `parent_id`, `evidence_refs[]` and `claim_ref` are **integers naming an earlier op's `seq`** — one id space, nothing to prefix, nothing the agent can invent (a `seq` it has not seen does not resolve). This is what the canvas ticket's `{ question_id, seq }` pin needs.

### Enums (exported, frozen)

```js
export const LEVELS = Object.freeze(["business", "stakeholder", "solution", "transition"]); // ladder order
export const PROVENANCE = Object.freeze(["real-interview", "secondary-source", "assumption", "fictional-scenario"]);
export const SOURCES = Object.freeze(["banked", "off-script"]);
export const FLAGS = Object.freeze(["no-evidence", "orphan"]);
```

### Per-op rules (`checkOp` = envelope + exact params; the switch = semantics)

Envelope: `{ op, params }` only — an unknown envelope key throws (board-ops' #226 lesson, applied at the applier since there is no separate grammar layer here). `op` must be in `OPS`. `params` must be an object. Unknown param key throws; a param that is `undefined` (absent) throws naming the op and the key — **absent is refused**.

| Op | Validation, in order | `closes` | `flagged` |
|---|---|---|---|
| `record_decision` | `answer_ref` resolves in `ctx.answers` (throw 1) · `level ∈ LEVELS` · `off_script` boolean · `question_id` null **or** in `ctx.bank` (throw 3) · `off_script: false` ⇒ `question_id` non-null (a banked decision names its question) · `wrong_if` non-empty string · `evidence_refs` array; each entry an integer `seq` of an earlier `file_evidence` record (else throw naming the ref) · `parent_id` null or the `seq` of an earlier `record_decision` whose `level` is exactly one rung above (`business` ⇒ `parent_id` must be null; a non-null parent on a business decision throws) · closing ⇒ `ctx.turn` non-empty string and not already closed (throw 2) | `!off_script` | `evidence_refs.length === 0` ⇒ `no-evidence`; `parent_id === null && level !== "business"` ⇒ `orphan` |
| `flag_weak_answer` | `question_id` non-null and in bank · `answer_ref` resolves · `missing` non-empty array of non-empty strings · turn open (throw 2) | always | `[]` |
| `open_question` | `source ∈ SOURCES` · `question_id` null or in bank; `source: banked` ⇒ non-null · `answer_ref` resolves · `reason` non-empty string · `source: banked` ⇒ turn open | `source === "banked"` | `[]` |
| `file_evidence` | exactly one of `url` / `ref` non-null: `url` a string starting `http://` or `https://`, `ref` resolves in `ctx.answers` (a pasted source is human input) · `provenance ∈ PROVENANCE` (throw 4) · `claim_ref` null or the `seq` of an earlier `record_decision` | never | `[]` |

**Turn rule (R2).** A closing op requires `ctx.turn` to be a non-empty string (`"<op>: no banked turn is open — a closing op needs the server's turn id"`) and throws if any earlier record has `closes && turn === ctx.turn` (`"<op>: turn "t7" is already closed by op 5 — one closing op per banked-question turn (R2)"`). Non-closing ops record `ctx.turn` as given (null allowed) and never consult the closed set.

**Supersede rule (#281 comment 2 / canvas #318).** A `record_decision` with a non-null `question_id` sets `supersedes` to the `seq` of the latest earlier `record_decision` with the same `question_id`, else null. Both records stay; nothing is removed. A superseding decision on a turn that is already closed can only arrive as `off_script: true` (R2 refuses the alternative), which is exactly the escape-hatch case the architecture names.

**Not checked here, on purpose:** whether the turn's question matches `question_id` (the server owns the cursor), the text of anything (form, never substance), and forward references (a decision cannot cite evidence filed after it; that is the ordering the "file evidence first, then decide" loop produces, and `evidence_refs: []` + the flag is the honest escape).

### The transcript `op` line, `answers.jsonl`, `run.json` (README §File shapes)

```jsonl
// answers.jsonl — server-written only, verbatim, never rewritten
{ "ref": "a7", "ts": "…Z", "turn": "t7", "question_id": "q12", "kind": "banked", "text": "…what the human typed…" }
{ "ref": "a8", "ts": "…Z", "turn": "t7", "question_id": null, "kind": "off-script", "text": "…" }

// transcript.jsonl — append-only; three line types
{ "type": "text",   "ts": "…Z", "turn": "t7", "text": "…what the agent said…" }
{ "type": "op",     "ts": "…Z", "seq": 3, "turn": "t7", "op": "record_decision", "params": { … }, "closes": true, "flagged": ["no-evidence"], "supersedes": null }
{ "type": "denied", "ts": "…Z", "turn": "t7", "tool": "Read", "input": { "file_path": "…" }, "error": "…the fence's message…" }
```

```json
// run.json
{ "slug": "faster-payment-run-1", "provenance": "fictional", "label": "Real run — fictional scenario",
  "entryMode": "blank-idea", "depth": "full-discovery", "branch": "regulated",
  "frontEnd": "portal", "model": "claude-sonnet-5", "sessionId": "…",
  "startedAt": "…Z", "endedAt": null, "root": "discovery/faster-payment-run-1" }
```

`frontEnd` is how the Switch metric is measured (`portal` | `terminal`). `provenance` decides the root (R1): `fictional` → `discovery/<slug>/` in-repo; `real` → `<JOBS_DIR>/_discovery/<slug>/`, same shape, never committed. The enum values for `entryMode`/`depth`/`branch` are pinned by #285/#282; the README lists today's names and says who owns them.

---

## STEP-BY-STEP TASKS

### Task 1 — CREATE `discovery/ops.mjs` (skeleton: header, enums, `PARAMS`, `checkOp`)

- **IMPLEMENT**: Header (register of `board-ops.mjs:1–31`): path; "the discovery op vocabulary and a pure applier over the run's op ledger (epic #279, ticket #281; architecture §Data model)"; why `discovery/` and not `system/` citing `agent-layer/gen-loc-summary.mjs:22–24`; the invariants a future editor keeps: (1) **no parameter carries answer text** — `answer_ref` resolves against `ctx.answers`, which only the server writes; (2) **the four verbs move together** with their `PARAMS` entry, their switch case and their group-28 fixture, under the epic's op-verb lock; (3) **absent is refused, empty is flagged**; (4) **R2 keys on the turn**; (5) **refs are `seq`s** and the applier assigns them; (6) no SDK, no fs, no bank import — context is passed in. Then `OPS`, `PARAMS`, `LEVELS`, `PROVENANCE`, `SOURCES`, `FLAGS` (all `Object.freeze`), `emptyRun`, and `checkOp(op)` returning `params` after: envelope exact (`op`, `params` only), `op ∈ OPS`, params an object, unknown key throws naming the allowed list, `undefined` value throws `` `${op.op}: "${k}" is required (absent is refused; empty is recorded and flagged)` ``.
- **PATTERN**: `system/board-ops.mjs:34–97`.
- **IMPORTS**: none.
- **GOTCHA**: `Object.freeze` on `PARAMS` freezes the object, not the inner arrays — freeze each array too, or group 28's "frozen by mutation" case will pass for the wrong reason. `JSON.parse` output can carry `__proto__` as an own key; `Object.keys` sees it, so the unknown-key loop already refuses it (group 11 case 10 covers this shape).
- **VALIDATE**: `node -e "import('./discovery/ops.mjs').then(m => { console.log(m.OPS, Object.keys(m.PARAMS)); })"` prints four verbs both times.
- **SATISFIES**: AC 1 (shape mirrors board-ops; no SDK in the graph).

### Task 2 — ADD `applyOp` and `applyOps` to `discovery/ops.mjs`

- **IMPLEMENT**: `applyOp(state, op, ctx)`: assert `state.ops` is an array and `ctx` carries arrays `answers` and `bank` (throw naming the missing one); `const p = checkOp(op)`; build `refs = new Set(ctx.answers.map(a => a.ref))`, `bankIds = new Set(ctx.bank.map(q => q.id))`; helpers `resolveAnswer(ref, op)` (throw 1: `` `${op}: answer_ref "${ref}" does not resolve — answers.jsonl holds ${[…refs].join(", ") || "nothing"}` ``), `checkQuestion(id, op)` (null passes; non-string or not in bank → throw 3 naming the id), `earlier(seq, wantOp, field, op)` (integer, `1 ≤ seq ≤ state.ops.length`, and `state.ops[seq-1].op === wantOp`, else throw naming field and seq), `closeTurn(op)` (throw if `typeof ctx.turn !== "string" || !ctx.turn`; throw 2 if `state.ops.some(r => r.closes && r.turn === ctx.turn)`, naming the closing op's seq). The `switch` implements the table above verbatim, computing `closes`, `flagged`, `supersedes`; `default:` throws (unreachable — checkOp threw first, same comment as board-ops). Return `{ ops: [...state.ops, { seq: state.ops.length + 1, turn: ctx.turn ?? null, op: op.op, params: { ...p, evidence_refs: p.evidence_refs ? [...p.evidence_refs] : undefined }, closes, flagged, supersedes }] }` — copy the params (arrays included) so a caller mutating its op afterwards cannot reach the ledger; strip the `evidence_refs: undefined` on non-decision ops (build the params copy per op inside the case rather than with a generic spread, to keep the record's key set exact). `applyOps(items, ctx, state = emptyRun())`: `items` is an array of `{ op, params, turn }`; fold `applyOp(acc, { op, params }, { ...ctx, turn })`, rethrowing `` `op ${i} (${item?.op ?? "?"}): ${e.message}` ``.
- **PATTERN**: `system/board-ops.mjs:101–189`.
- **GOTCHA**: `p.evidence_refs` must be validated as an array **before** `.length` is read for the flag, and each entry must be an integer (`Number.isInteger`) — a string `"3"` must throw, not coerce; a duplicate `seq` in `evidence_refs` is legal and not this ticket's concern. `parent_id`'s level check reads `state.ops[seq-1].params.level` and compares `LEVELS.indexOf(parent.level) === LEVELS.indexOf(p.level) - 1`. The supersede scan uses the **latest** earlier match (`findLast`, Node ≥ 18).
- **VALIDATE**: one-liner in the scratchpad: apply `file_evidence` (url, secondary-source, claim_ref null) then `record_decision` (level business, parent null, evidence_refs [1], off_script false, turn "t1") and print the state — `closes: true, flagged: [], supersedes: null, seq: 2`. Then re-apply the same decision on turn "t1" and confirm the R2 throw names `op 2`.
- **SATISFIES**: AC 2 (the four throws are reachable), AC 3 (flags), comment 2 (supersede).

### Task 3 — UPDATE `tooling/build-checks.mjs` — group 28

- **IMPLEMENT**:
  1. Header list: append `//  28 discovery ops  the discovery applier (discovery/ops.mjs): OPS iterated against PARAMS and a VALID_FOR fixture per verb, the four named throws each driven by a broken op, both flag directions, R2 on the turn, the supersede rule, totality over junk, and the run-2 fixture's md5 pinned with the mutation that proves the compare can fail (#281)`.
  2. Imports: `import { createHash } from "node:crypto";` beside the `node:fs` line; `import { applyOp, applyOps, emptyRun, FLAGS, LEVELS, OPS as DISCOVERY_OPS, PARAMS as DISCOVERY_PARAMS, PROVENANCE, SOURCES } from "../discovery/ops.mjs";` — aliased because `OPS` is already `board-ops.mjs`'s at line 152.
  3. Group body, after group 27 and before `// --- the verdict`, opened with the boundary statement (groups 9/11/13's voice): what it proves (the applier's every rule, over synthetic in-memory answers and a stub bank — legitimate test input, nothing presented as a run) and what it cannot reach (the server writing `answers.jsonl`, the transcript writer, the real bank — #284's and #282's gates). Cases:
     - **28.1 the roster, both directions**: `Object.keys(DISCOVERY_PARAMS)` equals `DISCOVERY_OPS` as sets and counts; `Object.isFrozen` on `OPS`, `PARAMS`, every `PARAMS[verb]`, `LEVELS`, `PROVENANCE`, `SOURCES`, `FLAGS`; a `VALID_FOR` table keyed by verb with one minimal valid `{ op, params, turn }` per verb, and `for (const verb of DISCOVERY_OPS) ok(VALID_FOR[verb], …)` — the BOARD_FOR idiom, so a fifth verb with no fixture fails loudly. Then every fixture applied in a fresh fold and asserted to record with `op === verb`, `seq` increasing 1..n, `closes` matching the table (`record_decision` off_script:false → true; `flag_weak_answer` → true; `open_question` banked → true; `file_evidence` → false).
     - **28.2 the positive control before every refusal**: the happy fold from 28.1 applied twice from `emptyRun()` deep-equals itself (determinism) and `state.ops` on the input is untouched (purity, proven by mutating the returned record's `params` and re-reading the input).
     - **28.3 the four named throws, each by a broken op**: (1) `answer_ref: "a99"` — message names `a99`; (2) a second `flag_weak_answer` on the same turn after a `record_decision` closed it — message names `turn` and the closing `seq`; (3) `record_decision` with `question_id: "q-not-in-bank"` — names the id; **and** the null twin accepted with `off_script: true`; (4) `file_evidence` with `provenance: "vibes"` — names the label and lists the four.
     - **28.4 the further refusals**, each by a broken op: absent field (`delete params.evidence_refs`) throws naming the field; unknown param throws; unknown envelope key throws; `evidence_refs: ["3"]` (a string) throws; `evidence_refs: [99]` throws naming 99; `parent_id` naming a `file_evidence` seq throws; `parent_id` two rungs up (solution → business) throws; business with a non-null parent throws; `off_script: false` with `question_id: null` throws; `open_question` banked with null throws; `file_evidence` with both `url` and `ref` null, and with both set, throws; `missing: []` throws; a closing op with `turn: null` throws; `applyOps` rethrows with `op 2 (record_decision):` prefix.
     - **28.5 both flag directions**: `evidence_refs: []` records with `flagged` containing `no-evidence` and **no throw**; `evidence_refs: [1]` records with `flagged` not containing it; `parent_id: null` at `stakeholder` records `orphan`; at `business` records no `orphan`; `parent_id: <seq of a business decision>` at `stakeholder` records no `orphan`; every flag value ∈ `FLAGS`.
     - **28.6 R2 on the TURN, not the question**: after a decision closes turn `t1` for `q1`, an `off_script: true` decision on `q1` on the same `ctx.turn` is **accepted**, `closes: false`, and `supersedes` names the first decision's `seq`; `file_evidence` ×3 on a closed turn accepted; a banked `open_question` on a NEW turn `t2` for the same `q1` accepted (`closes: true`).
     - **28.7 the not-a-form arithmetic is possible from the record**: derive from a fold of [decision, open_question banked, open_question banked, flag_weak_answer] the counter (reset on decision/flag, +1 on banked open_question, ignore off-script) using only `record.op`, `record.closes` and `record.params.off_script`/`params.source` — asserts the fields #285 needs are present, without owning #285's function.
     - **28.8 totality over junk**: `applyOp` over `[null, 1, "x", [], {}, { op: "record_decision" }, { op: 7 }]` and junk `ctx` (`{}`, `{ answers: null }`) — every one throws a plain `Error` whose message is non-empty (never a `TypeError` from inside the switch).
     - **28.9 the frozen fixture**: `createHash("md5").update(readFileSync(join(ROOT, "docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md"))).digest("hex") === "ab6eb0ee6cdd3b7802ecfcbe90db2377"`; **and the mutation**: the same hash over the bytes plus one trailing `"\n"` must differ — the compare can go red.
     - `group("discovery ops", "…")` — the sentence names every case above and ends with the boundary: "the server that writes answers.jsonl, the transcript writer and the real bank are #284's and #282's, and this group cannot reach them".
  4. The verdict string: `"\nbuild ✓  all 28 groups pass"`.
- **PATTERN**: group 11 (`tooling/build-checks.mjs:1844–2146`) for `threw`, refusal-message matching and the mutation comment; `BOARD_FOR` (lines 213–220) for the per-verb fixture table.
- **GOTCHA**: The group body is a block `{ … }` at top level with `await` allowed (group 4 uses top-level await) — none needed here. `ROOT` is defined at line 176. Do not read anything under `discovery/<slug>/` — none exists and none may be hand-made. Keep the fixture bank ids visibly synthetic (`q1`, `q2`) and the answers `a1…a4`.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build discovery ops ✓ …` and `build ✓  all 28 groups pass`.
- **SATISFIES**: AC 2, AC 3, AC 4, comment 1 (md5).

### Task 4 — CREATE `discovery/README.md`

- **IMPLEMENT**: Title `# Discovery — run packages, the op grammar, the bank`. Opening block in the register of `replay/README.md:1–30`: "Spec for epic #279, ticket #281 · architecture §Data model (the op table, R2, refuse-vs-flag, the run package) + §Boundaries". What a run package is; that nothing here is played by a live model at view time (the portal is local; nothing shipped reads `discovery/`). **Honesty rules (hard)**: `answers.jsonl` is written only by the server and only on submit, verbatim, never rewritten; `transcript.jsonl` is append-only and every `op` line is what the applier recorded — never hand-written, never hand-edited (the trace rule, extended); the agent's turn text is captured as `text` lines because MVP 6's "may not say an answer is wrong" is only falsifiable from prose; a fence denial is a `denied` line — the receipt is kept; `run.json` states provenance, and the root follows it (R1). **Files** tree: `bank.mjs` (#282) · `ops.mjs` · `README.md` · `prd-projection.mjs` (#290) · `<slug>/run.json · answers.jsonl · transcript.jsonl · prd.md`. **The op grammar**: the four-op table (verb · carries · closes?), the addressing rule (`seq`), the refuse-vs-flag rule, the R2 rule with the off-script cases, the supersede rule, the ladder, what the applier does NOT judge. **File shapes**: the three JSONL line types and `run.json` exactly as in THE DESIGN above, with `frontEnd` explained as the Switch metric's measurement and the enum ownership stated (`depth`/`branch` values are #282/#285's; `entryMode` is #286's). **Workflow**: "no recorder exists yet — #284 adds it; until then this directory holds the grammar and the spec only". Cross-link `traces/README.md` for the typed-line style.
- **PATTERN**: `replay/README.md` (structure), `traces/README.md` (line-schema register).
- **GOTCHA**: C2 — no slop; run the text past `~/.claude/skills/_shared/slop-blacklist.md` mentally (no "robust", "comprehensive", "seamless", "leverage"). C3 — no job titles anywhere.
- **VALIDATE**: `grep -c '' discovery/README.md` ≥ 120; `grep -nE 'robust|comprehensive|seamless|leverage|utili[sz]e' discovery/README.md` prints nothing.
- **SATISFIES**: AC 5.

### Task 5 — UPDATE `CLAUDE.md`, `.claude/references/gates.md`, `docs/epics/discovery-partner.architecture.md`

- **IMPLEMENT**:
  - `CLAUDE.md` map, after line 102 (`replay/ …`): two lines in the same column alignment —
    `discovery/                    the discovery half (epic #279): ops.mjs = the FOUR-verb op grammar + pure applier (answer-by-reference; no SDK) · README.md = the run-package format`
    `discovery/<slug>/             committed FICTIONAL run packages — run.json · answers.jsonl (server-written only) · transcript.jsonl (text · op · denied) · prd.md`
  - `CLAUDE.md` line 108: `27 PURE groups` → `28 PURE groups`.
  - `CLAUDE.md` "Where new code goes", after the `**New replay run**` bullet (line 145): one bullet `**New discovery op verb or run** → a verb is a `discovery/ops.mjs` edit (`OPS`, its `PARAMS` entry, the switch case and its build-checks group 28 fixture, together, under the epic's op-verb lock — no other ticket adds one concurrently). A run is a REAL session (the recorder is #284): `answers.jsonl` is server-written and verbatim, `transcript.jsonl` is append-only, and neither is ever hand-written or hand-edited — a bad run is re-run. Provenance decides the root: fictional → `discovery/<slug>/`; real → `<JOBS_DIR>/_discovery/<slug>/`, never committed. Format → `discovery/README.md`.` — target 400–650 tokens across all three edits; measure with `wc -w` (≈1.3 tokens/word).
  - `.claude/references/gates.md` line 11: `27 pure groups` → `28 pure groups`; add one line after the group 8 paragraph: `**Group 28 — discovery ops** (`discovery/ops.mjs`): every refusal driven by a broken op, both flag directions, R2 keyed on the turn, the supersede rule, and the run-2 fixture's md5 with the mutation that proves it can fail. SDK-free like group 8 and for the same reason. Cannot reach: the server's answer store, the transcript writer, the real bank.`
  - `docs/epics/discovery-partner.architecture.md` line ~280: replace `The bank and the ops are shared definitions and go to `system/`;` with `The bank and the ops are shared definitions and go to `discovery/` (§Data model — the loc-summary tripwire);` — one sentence, nothing else.
- **PATTERN**: the existing map lines' column (30 chars to the description).
- **GOTCHA**: CLAUDE.md is an index, not a spec — no rule text that the README already carries beyond the one-line pointers above. The architecture doc is a decided record; touch only the stale clause.
- **VALIDATE**: `git diff --stat CLAUDE.md .claude/references/gates.md docs/epics/discovery-partner.architecture.md` shows three files, the architecture doc `+1 −1`; `grep -n "system/\`;" docs/epics/discovery-partner.architecture.md` on the §Other eng-lead calls line prints nothing.
- **SATISFIES**: AC 6, AC 7.

### Task 6 — validation runs + the manual mutation record

- **IMPLEMENT**: run every command in VALIDATION COMMANDS. Then the ticket's own rule: mutate the source and watch the gate go red, **three times**, restoring after each: (a) in `applyOp`, comment out the R2 `closeTurn` check → group 28 red naming case 28.3(2); (b) change `PROVENANCE` to five labels → 28.3(4) red; (c) append `"\n"` to the fixture file (do NOT commit) → 28.9 red; restore with `git checkout -- docs/epics/fixtures/…` and re-confirm `md5 -q` prints `ab6eb0ee…`. Record all three in the report with the exact red line each produced.
- **VALIDATE**: the report at `.claude/reports/discovery-ops-applier-281-report.md` carries a "Mutation record" section with three entries and the final green run.
- **SATISFIES**: AC 4 ("Mutate the source, watch it go red, record that in the report").

---

## TESTING STRATEGY

There is no test suite (CLAUDE.md §Testing); the gate IS the test. Group 28 is the unit layer: every rule driven directly, every refusal by a broken op with the message matched, a positive control before each refusal, a mutation for the check that could otherwise be vacuous (md5).

### Edge cases the gate must cover

- `question_id: null` on `record_decision` is legal **only** with `off_script: true`; on `open_question` only with `source: "off-script"`.
- `evidence_refs: []` vs absent vs `["1"]` vs `[99]` — four different outcomes (flag · throw · throw · throw).
- `parent_id` at `business` (must be null, no orphan flag) vs `stakeholder` null (orphan) vs wrong-rung (throw).
- A closed turn accepts off-script and evidence ops, refuses a second closing op, and a new turn on the same question is fine.
- `ctx.turn: null` with a closing op — throw; with `file_evidence` — recorded with `turn: null`.
- `applyOp` never mutates `state` or `op` (mutate the returned record and re-read the inputs).
- Junk in → plain `Error` out, never a `TypeError`.

### What the gate cannot reach (stated in the group sentence)

The server writing `answers.jsonl`, the SSE turn loop, the transcript writer, the real bank's ids, the fence. Those are #284, #285, #287 and #282's gates.

---

## VALIDATION COMMANDS

### Level 1 — syntax

```bash
node --check discovery/ops.mjs && node --check tooling/build-checks.mjs
node -e "import('./discovery/ops.mjs').then(m => console.log(m.OPS.length, 'verbs'))"
```

### Level 2 — the gate

```bash
node tooling/build-checks.mjs                      # build discovery ops ✓ … · build ✓  all 28 groups pass
```

### Level 3 — the SDK-free proof (what CI actually runs)

```bash
mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules
node tooling/drift-check.mjs                       # syntax step covers discovery/ops.mjs; loc-summary must report NO drift (discovery/ is uncounted)
node agent-layer/gen-loc-summary.mjs --check       # "no drift" — proves the placement claim
```

### Level 4 — manual

```bash
md5 -q docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md   # ab6eb0ee6cdd3b7802ecfcbe90db2377
git status --short                                  # no system/ or agent-layer/ file touched; no discovery/<slug>/ created
wc -w CLAUDE.md                                     # delta vs 2761 words ≈ 300–500 words (≈400–650 tokens)
```

### Level 5 — the mutation runs (Task 6)

Three source mutations, each red, each restored, each recorded in the report.

---

## ACCEPTANCE CRITERIA (from #281, mapped)

- [ ] AC 1 `discovery/ops.mjs` mirrors board-ops' shape (`OPS`, `PARAMS`, switch); no SDK in its import graph — proven by Level 3.
- [ ] AC 2 the four throws each asserted by feeding a broken op (28.3).
- [ ] AC 3 empty-but-present `evidence_refs` / `parent_id` flagged, both directions (28.5).
- [ ] AC 4 group 28 iterates `OPS` (28.1); source mutated, red observed, recorded (Task 6).
- [ ] AC 5 `discovery/README.md` specifies `run.json` (incl. `frontEnd`), `answers.jsonl`, `transcript.jsonl` (`text` · `op` · `denied`), `prd.md`.
- [ ] AC 6 CLAUDE.md gains the run-package lines + map entries within budget.
- [ ] AC 7 the architecture doc's stale `system/` sentence corrected.
- [ ] Comment 1: fixture md5 pinned with a mutation (28.9).
- [ ] Comment 2: supersede rule landed (`supersedes` on the record; 28.6).
- [ ] `build ✓  all 28 groups pass` locally, with and without `portal/node_modules`; CI `verify` green on the PR.
- [ ] PR body carries `Closes #281`; plan, report and review in the same PR.

## COMPLETION CHECKLIST

- [ ] Tasks 1–6 in order, each validation run at the time.
- [ ] No file added under `system/` or `agent-layer/` (`git status`).
- [ ] No `discovery/<slug>/` directory exists.
- [ ] `gen-loc-summary.mjs --check` reports no drift.
- [ ] Report written with the mutation record.
- [ ] Branch `feat/281-discovery-ops`, one commit: `discovery: the four-verb op grammar + pure applier, group 28, the run-package spec (#279 §Data model, #281)`.

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — `wrong_if` is an agent-authored string.** The architecture table lists `wrong_if` as a param; `reason` and `missing[]` are strings the agent writes too, so agent prose in ops is by design (form-judgement text). The one field that could be read as substance is `wrong_if`. Assumed: a non-empty string, auditable from the `text` lines. If the owner wants it human-authored, it becomes a second answer ref — a one-line `PARAMS` change plus one resolve call, and #284 asks a follow-up question. Flagging, not blocking.
- **Q2 — parent rung is exactly one above.** PRD MVP 10 says solution names its stakeholder, stakeholder names its business; assumed transition names solution. If a solution decision may cite a business parent directly, relax `=== index − 1` to `< index`. One line.
- **Q3 — refs are integer `seq`s.** Chosen over prefixed ids (`e3`) for one id space and the canvas `{ question_id, seq }` pin. #290 and #318 inherit this; if either wants prefixed ids, the applier is the single place to change.
- **Q4 — dangling `evidence_refs` / `parent_id` / `claim_ref` throw** rather than flag. The architecture names four throws "worth naming", not an exhaustive list; a fabricated citation passing silently would make "the pack can never quietly hold an unbacked decision" false. The no-deadlock property survives because `[]` + flag is always available.
- **A1** — `ctx.bank` is an array of `{ id }` objects; #282's export is assumed to be that shape (it mirrors `build-questions.mjs`'s `QUESTIONS`). If #282 exports a Map, the caller passes `[...bank.values()]`.
- **A2** — `ctx.turn` is an opaque server string; the applier never checks it against `question_id`.
- **A3** — `run.json` enum values for `depth`/`branch`/`entryMode` are named in the README as today's names and marked as owned by #282/#285/#286.
- **A4** — Spike #280's verdict is not posted yet (epic #279 has no comments). Nothing here depends on it: the applier takes `{ op, params }` from whichever transport wins.
- **A5** — Group number 28 is claimed at merge order; if #271 or another ticket lands first, renumber on rebase (the epic's rule).

## NOTES (open canvas)

**Why the state is only `{ ops }`.** An earlier sketch kept a `closedTurns` set beside the ledger. Two records of one fact drift; deriving "closed" from `ops.some(r => r.closes && r.turn === t)` costs a linear scan over a list that will never exceed a few hundred entries and cannot disagree with the ledger.

**Why `PARAMS` is exported here and not in board-ops.** Board-ops' gate (group 11) proves coverage by driving every verb through the CLI grammar. There is no grammar layer here (transport is #280's), so the gate needs the table itself to assert `OPS ↔ PARAMS` both ways. Exporting a frozen object costs nothing and closes the "a verb with no PARAMS entry" AC literally.

**Why the applier copies `params` into the record.** The transcript line is the audit surface; if it aliased the caller's object, a later mutation of the op the agent sent (or the tool's argument object) would rewrite history without a write.

**The supersede rule and R2 compose without a special case.** A superseding decision on an already-closed turn can only be `off_script: true` (R2 refuses the other), and that is precisely the escape-hatch case the architecture describes as "usually why the person went off-script". A superseding decision on a *new* turn for a revisited question (D5 escalation) closes that new turn. No extra verb, no extra field beyond `supersedes`.

**The md5 case is two lines and closes a real hole.** `grep -rn ab6eb0ee tooling agent-layer .github` returns nothing today (observed). The mutation (hash of bytes + `"\n"` ≠ constant) is what makes it a check rather than a constant comparison that can never fail.

**Data-flow sketch.**

```
human types ──► server writes answers.jsonl {ref:a7,…}   (only writer)
agent turn ──► emits {op, params}  ──► applyOp(state, op, {answers, bank, turn})
                                          │ throws: bad ref · closed turn · unknown q · bad provenance · …
                                          ▼
                                   new state.ops[+1] = {seq, turn, op, params, closes, flagged, supersedes}
                                          ▼
                              transcript.jsonl  {type:"op", ts, …record}   (#284 writes)
                                          ▼
                              prd-projection.mjs folds ops → prd.md       (#290)
```

## AMENDMENTS

(none yet)
