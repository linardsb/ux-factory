# Feature: look it up, park it, and the escape hatch — the three affordances that file through the op grammar

The following plan should be complete, but its important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Three affordances that keep a discovery session moving without breaking MVP 6's honesty line, all
filing through the **four existing op verbs** — no fifth verb, no new answer kind:

- **Look it up (MVP 7).** The person asks the agent to search, or pastes a source. The agent fetches
  (`WebSearch` / `WebFetch`), shows what it found **with URLs**, and files each source actually used as
  a `file_evidence` row with `provenance: "secondary-source"`. **It does not close the turn** — the
  person's own answer still does.
- **Park it (MVP 8).** The person cannot answer yet. The question records as `open_question` with
  `source: "banked"` and the reason for parking, the cursor advances, and the not-a-form counter
  increments. Blocking is never available.
- **The escape hatch (MVP 9).** An "ask something else" input at every step. The agent answers, then
  **files the exchange**: a `record_decision` with `off_script: true` when the person made a choice,
  an `open_question` with `source: "off-script"` otherwise. Dropping is never available. Neither
  closes the turn and neither advances the cursor.

Plus the two rules the affordances make reachable: **MVP 10's domain rule** (a checkable public claim
carries a `secondary-source` row with a URL — filing a checkable fact as an `assumption` is a failure)
and **MVP 10's traceability rule**, made checkable end to end over a package.

## User Story

As the operator running a discovery session in the portal
I want to look a fact up, park a question I cannot answer, and say something the question did not ask for
So that the session goes where it needs to go and every one of those moves lands in the run package
instead of becoming an unrecorded side channel.

## Problem Statement

Today the session has exactly one move: answer the question on the table. Three frictions have no
route.

1. **A fact you do not have.** `MAIN_TOOLS = []` and `allowedTools: []` in
   `portal/lib/discovery-transport.mjs:60,169` — the agent has no fetch tool at all, and
   `fenceDecision` denies anything that is not an op tool or a fenced read tool. There is no path from
   "I do not know whether Confirmation of Payee is a real scheme" to a `secondary-source` row.
   Observed (`.claude/reports/discovery-run-0-338-report.md` AC5): **10 evidence rows filed, 0 by
   URL, and 0 of the 30 answers contained one.**
2. **A question you cannot answer yet.** The grammar can park (`open_question` / `source: banked`)
   but nothing in the drawer says so. Observed on run 0: `open_question` **0**, and F-verdict *"the
   drawer has no park control"*.
3. **Something the question did not ask for.** `runTurn` refuses anything but the cursor's question
   (`portal/lib/discovery.mjs:1011`), and `portal/server.mjs:361` hardcodes `kind: 'banked'`. The
   `off-script` answer kind exists in `appendAnswer` and has no caller. Observed: `off_script` **0**.

And one defect this ticket is the first to make reachable, **confirmed by execution** (see NOTES §The
observed supersede defect): an off-script `record_decision` naming a banked question **supersedes the
person's banked decision** — it dims in the drawer and drops out of `prd.md`'s `visible` set. That is
the case architecture §Data model calls *"the normal case (it is usually why the person went
off-script)"*.

## Solution Statement

Two new drawer controls and one new turn kind, plus four prompt rules that ride the **turn** prompt
only, plus one applier correction.

- **`kind: "off-script"` through the existing `runTurn` seam, carrying an `intent` discriminator (`look-up` | `aside`) that is RECORDED on the answer line, not only passed to the prompt.** The submitted text stores as an off-script answer line (`question_id: null`, `kind: "off-script"`, the open banked turn's id, `intent` as declared); nothing closes, so the cursor does not move and the banked question stays on the table. Recording the intent is what makes AC1 and AC3 pin separately in the RECORD rather than only in the prompt: a look-up's correct filing may be evidence rows or, when nothing usable was found, nothing at all, so any rule keyed on `kind` alone would report MVP 7's happy path as an MVP 9 failure.
- **AC3 enforced in the applier, in three rules keyed on the answer the op names.** A closing op may not rest on an off-script answer; a decision or open question naming one must carry the off-script form; one off-script answer may not carry both a decision and an open question; and a closing op is refused while an `intent: "aside"` answer on this turn has no filing. Nothing off-script gains the power to close, no verb is added, and the compliant filing is never gated, so no session can deadlock. The guard is on ADVANCING, never on LEAVING — `closeSession` is deliberately not gated, so a stubborn agent can stall a turn but can never make a package unfinishable.
- **`park: true`** on an ordinary banked turn: one paragraph in the turn prompt telling the agent the
  person is parking, and the person's reason stored as the answer verbatim.
- **`WebSearch` / `WebFetch` allowed BY NAME, never by path** — through `fenceDecision`'s existing
  `extraTools` seam (#359) and the query's own `tools`, on an off-script turn only. They never enter
  `READ_TOOLS`, so #287's assertion holds untouched.
- **Every new prompt string rides the TURN prompt**, conditionally, so `systemFor` and every posture's
  `fingerprint` stay byte-identical and the SDK's session cache still holds. The new surface gets its
  **own** stamp (`AFFORDANCE_FINGERPRINT`) recorded beside `postureFingerprint`.
- **An off-script decision never supersedes and is never superseded** — the applier, `ledgerView` and
  `prd-projection`'s `visible` set moved together, plus the two docs that state the rule.
- **`auditTraceability(ops)`** — a pure read (not a verb) that walks every decision to its root, so
  "every solution names its stakeholder, every stakeholder names its business" is checkable over a
  whole package rather than record by record.

## Out of Scope / Non-Goals

- **Not included: a new committed run package.** No `discovery/<slug>/` is created or edited. Runs are
  REAL or they do not exist (CLAUDE.md §New discovery op verb or run), and this ticket's ACs are
  provable over synthetic ops and source pins. The one run-time observation is a paid probe (Phase 7).
- **Not included: re-recording any fixture.** `discovery/instrument-loans-1`, `graded-think-a` (65
  turns), `graded-opus-a` (65 turns), `bracket-trace-1/-2`, `spine-meridian-1`, `allergen-matrix-1`
  all stay as recorded. Every design call below exists to keep them green.
- **Not included: a fifth op verb, a fifth posture, or a new `TOOL_DESCRIPTIONS` key.** 34.13 states
  that one added key to `TOOL_DESCRIPTIONS` moves both shipped posture fingerprints.
- **Not included: the domain rule in Think's SYSTEM prompt.** Think's system prompt is byte-frozen;
  `DOMAIN_RULE` reaches Think through the affordance turn prompt only. Named as a gap, the same shape
  `reaskBrief` took for #366.
- **Not included: judging which off-script form an exchange deserved.** The applier enforces that
  exactly one of the two is filed and that the form matches the answer's own server-written `kind`;
  whether the agent picked the right one is substance, and MVP 6 forbids the applier from reading it.
  #348's graded fixture or a human read is the only route there.
- **Not included: a gate that scores "a checkable fact filed as an assumption".** That is a semantic
  judgement. It belongs to #348's graded fixture or a human read; this ticket ships the prompt rule and
  the route that makes compliance possible, and says so.
- **Not changing:** the four verbs, `PARAMS`, `TOOL_SCHEMA`, `READ_TOOLS`, `POSTURES`' five-key shape,
  `systemFor`, `FINGERPRINT_INPUTS`, `FINGERPRINT_INPUTS_FOR`, `NOT_A_FORM_MAX`, the cursor rule, or
  any committed package byte.
- **Not included: off-script or park in an `existing-prd` audit.** The document is the answer to every
  question; there is no person answering. Refused by name (`RE_ASKS` is the precedent).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (~900–1300 lines across 9 files; **two** applier corrections — the
supersede rule with three readers moving together, and the four off-script refusals that enforce AC3 —
plus two new pure reads and one paid probe)
**Primary Systems Affected**: `discovery/ops.mjs` · `discovery/prd-projection.mjs` ·
`portal/lib/discovery-postures.mjs` · `portal/lib/discovery.mjs` ·
`portal/lib/discovery-transport.mjs` · `portal/server.mjs` · `portal/public/{index.html,portal.js}` ·
`tooling/build-checks.mjs` · `discovery/README.md`
**Dependencies**: none new. `@anthropic-ai/claude-agent-sdk` and `zod` already in `portal/`.

## Related Work

**Implements**: [#289](https://github.com/linardsb/ux-factory/issues/289) · **Epic**:
[#279](https://github.com/linardsb/ux-factory/issues/279), `docs/epics/discovery-partner.architecture.md`
+ `docs/epics/discovery-partner.prd.md` (MVP 7, 8, 9, 10)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/discovery-ops-applier-281.md` — the four verbs, R2, refuse-vs-flag, the six invariants
- `.claude/plans/discovery-spine-run-package-284.md` — `runTurn`, the answer store, the transcript, the drawer
- `.claude/plans/discovery-session-rules-285.md` — `deriveCursor`, `runMetrics`, the not-a-form counter (AC2 asserts against it, never re-implements it)
- `.claude/plans/discovery-postures-286.md` — the turn-prompt-conditional precedent (`entryMode`), `JUDGEMENT_RULE` reaching only the two new postures, `FINGERPRINT_INPUTS_FOR`
- `.claude/plans/discovery-read-fence-287.md` — `fenceDecision`, `allowSetFor`, `READ_TOOLS`, the two call sites, `--probe-fence`
- `.claude/plans/discovery-portal-width-288.md` — `ledgerView`, the drawer's package view
- `.claude/plans/discovery-prd-projection-290.md` — `SECTIONS`, `indexOps`, `visible`, `renderHierarchy`
- `.claude/plans/discovery-parent-id-341.md` — `parentCandidates`, `auditParenting`, `ledgerBrief`, the fingerprint tripwire
- `.claude/plans/discovery-proposals-359.md` — `fenceDecision`'s `extraTools` / `write` parameters, the seam this ticket reuses
- `.claude/reports/discovery-run-0-338-report.md` — F6, F9, **F10** (the `MAX_TURNS` arithmetic), **F11** (23 unbacked decisions — the number the evidence route is measured against)

**Forward-references** (plans that extend or supersede this — append as follow-ups get created):

- (none yet) — a Think **system-prompt** re-record ticket is the expected successor (see OPEN QUESTIONS Q1)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `discovery/ops.mjs` (whole file, 358 lines) — Why: the six invariants, and **invariant 4** is the
  sentence this whole ticket rests on: *"Off-script ops and file_evidence never close a turn, which is
  what makes MVP 9's escape hatch expressible."* Also the header's *"A PURE READ IS NOT A VERB"*
  paragraph, which is what lets `auditTraceability` land here without taking the op-verb lock.
- `discovery/ops.mjs:277-280` — Why: `record_decision`'s `supersedes` computation, the defect Phase 1 fixes.
- `discovery/ops.mjs:138-142` — Why: `ledgerView`'s `latestByQuestion`, the second reader of the same rule.
- `discovery/ops.mjs:84-112` — Why: `parentCandidates` + `auditParenting`, which `auditTraceability` **composes** rather than parallels.
- `discovery/prd-projection.mjs:419-452` — Why: `indexOps`, the third reader; its comment currently
  states the defect as intentional (*"an off-script decision on a banked question does supersede the
  banked one"*) and must be rewritten with the rest.
- `discovery/prd-projection.mjs:177-266` — Why: `SECTIONS`; `open-questions` already declares MVP 8 and MVP 9 as its `from`.
- `discovery/prd-projection.mjs:624-643` — Why: `renderHierarchy`, where orphans already render from the record's own flag (half of AC6).
- `portal/lib/discovery-postures.mjs` (whole file, 626 lines) — Why: **the byte-stability contract is
  in the header and it is the hardest constraint in this ticket.** Read the paragraphs "THINK'S
  STRINGS ARE BYTE-STABLE", "ORDER INSIDE THE SYSTEM PROMPT IS LOAD-BEARING", and "THE FINGERPRINT
  COVERS EVERY TEMPLATE A POSTURE HAS".
- `portal/lib/discovery-postures.mjs:261-289` (`buildThinkTurn`) — Why: the pattern to mirror. #286's
  `entryMode === 'existing-prd'` throw is the precedent: a branch that fires on a value no existing
  caller passes leaves every existing build byte-identical.
- `portal/lib/discovery-postures.mjs:166-182` (`ledgerBrief`) — Why: Task 8 widens it, and the reason
  it stays byte-identical is that `FINGERPRINT_INPUTS.ledger` holds three `record_decision` records
  and no `file_evidence`.
- `portal/lib/discovery-postures.mjs:557-596` (`FINGERPRINT_INPUTS`, `fingerprintOf`, `FINGERPRINT_INPUTS_FOR`) — Why: what must not move, and the shape `AFFORDANCE_FINGERPRINT` copies.
- `portal/lib/discovery.mjs:118-137` (`TOOL_SCHEMA`) · `:168-232` (the read fence) — Why: `READ_TOOLS`'
  own comment already names this ticket: *"so `WebSearch` / `WebFetch` — MVP 7's look-it-up path, a
  separate fence that stays open — can never be closed by a path rule."* `fenceDecision`'s `extraTools`
  is the seam.
- `portal/lib/discovery.mjs:257-283` (`appendAnswer`, `appendDocument`) — Why: `kind` is already
  `banked | off-script`; the off-script branch has no caller yet.
- `portal/lib/discovery.mjs:588-676` (`deriveCursor`, `runMetrics`) — Why: AC2 and AC4 assert against
  these; **they are not re-implemented.** `closersOf` is why an off-script op cannot move the cursor
  or the counter.
- `portal/lib/discovery.mjs:938-976` (`turnEvent`) — Why: the whitelist projects neither `off_script`
  nor `source`, so an off-script op logs identically to a banked one in the drawer. Task 15 widens it.
- `portal/lib/discovery.mjs:1002-1043` (`runTurn`) — Why: the `questionId !== cursor.question.id`
  guard refuses an off-script turn as written; the lock → guards → append → run ordering is the whole
  function and must survive.
- `portal/lib/discovery-transport.mjs:52-61` — Why: `MAX_TURNS = 6` and `MAIN_TOOLS = []`, both of
  which Phase 3 makes turn-kind-aware. Run 0 F10 derived the cap admits `MAX_TURNS − 2` = **four** tool calls.
- `portal/lib/discovery-transport.mjs:147-200` (`runDiscoveryTurn`) — Why: where `posture.build`, the
  fence object and the `query()` options are wired.
- `portal/lib/discovery-transport.mjs:541-600` (`probeFence`) — Why: the shape Phase 7's `--probe-affordance` copies (temp root, nonce, counters wrapping the sites from outside, roots deleted on exit).
- `portal/server.mjs:340-384` (`/api/discovery/turn`) — Why: EVERY PARAMETER NAMED, never a spread; the SSE refusal shape.
- `portal/public/portal.js:1266-1320` (the submit handler) · `:975-1020` (`renderDiscoverySession`) — Why: the two places new controls wire in.
- `portal/public/index.html:233-257` — Why: the session block's markup, where the two buttons and the off-script textarea land.
- `tooling/build-checks.mjs:5552-6010` (group 29) — Why: the `VALID_FOR` idiom, `threw`/`msg`/`names`/`same` helpers, the synthetic `ANSWERS`/`BANK`.
- `tooling/build-checks.mjs:6011-7543` (group 30) — Why: 42 existing cases; this ticket adds **30.43 onward**. Case 11 (the five-key posture pin), case 16 (the six verbatim rule strings), case 19 (fingerprint determinism), case 30 (Think's literal stamp).
- `tooling/build-checks.mjs:8125-8223` (group 32) — Why: 32.2a is the freshness tripwire that goes red on a Think prompt edit. It reads **distinct** turn ids, so an off-script turn sharing `tN` would not break it.
- `tooling/build-checks.mjs:8224-8649` (group 33) — Why: 33.15 stamps `graded-think-a` (65 turns) and `graded-opus-a` (65 turns) against `POSTURES[posture].fingerprint`.
- `discovery/README.md:107-176` (§The op grammar) · `:221-300` (§File shapes) · `:340-350` (§Supersede) — Why: the format spec this ticket amends. §Supersede's *"an off-script decision names no question, so nothing can supersede it"* is the sentence Phase 1 makes true.
- `docs/epics/discovery-partner.architecture.md:117-176` (§Data model) · `:208-240` (§Boundaries) — Why: the inherited decisions. **Do not re-decide them.**
- `docs/epics/discovery-partner.prd.md:255-300` (MVP 6–10) — Why: the exact wording of the three affordances and the three rules.
- `.claude/references/gates.md` — Why: which gate proves what, before trusting a green run.

### New Files to Create

None. Every change lands in an existing file. (A new module here would be a second home for rules the
existing headers already own — see CLAUDE.md §Ground rules, *"invariants live in the file that owns
them"*.)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `.claude/reports/discovery-run-0-338-report.md`, F10 and F11 —
  - Specific sections: F10 (`numTurns` is tool calls + 1 on every one of thirty turns; `MAX_TURNS = 6`
    admits four tool calls) and F11 (23 of 30 decisions rest on nothing; *"#289's evidence path needs
    a non-URL form for `blank-idea` runs, and the '23 unbacked' line is the number it should be
    measured against"*).
  - Why: F10 sizes `AFFORDANCE_MAX_TURNS`; F11 is the number the look-it-up route is judged against.
- [Claude Agent SDK — `tools` / `allowedTools` / `canUseTool`](https://docs.claude.com/en/docs/claude-code/sdk)
  - Specific section: tool permissioning.
  - Why: `tools: []` disables all built-ins; naming `['WebSearch','WebFetch']` re-enables exactly those two for that one `query()`.
- `docs/research/requirements-hierarchy.md` (in repo)
  - Specific section: the requirements levels.
  - Why: AC6's ladder is BABOK's, and `LEVELS` is already that ladder in order.

### Patterns to Follow

**A conditional that fires on a value no existing caller passes** (`portal/lib/discovery-postures.mjs:265`):

```js
// #286: the one refusal Think gained. It fires on a value no existing caller passes, so every
// existing input still builds byte-identical output (group 30 case 30 pins the stamp).
if (entryMode === 'existing-prd') throw new Error('discovery-postures: Think is an interview posture — …');
```

**A rule string exported separately so a tightening is a one-line diff the gate notices** (`:110-118`):

```js
export const EVIDENCE_RULE = `When the answer NAMES something that could be checked — …`;
```

**A pure read beside the applier, driven by the gate** (`discovery/ops.mjs:100-112`):

```js
export function auditParenting(ops) {
  if (!Array.isArray(ops)) throw new Error("auditParenting: ops must be the ledger's records array");
  …
  return { eligible, missed, structural };
}
```

**Errors:** plain `Error`, message naming the offending op/field/value. `discovery.mjs` uses
`const bad = (msg) => { throw new Error(\`discovery: ${msg}\`); }`; `ops.mjs` prefixes with the op name;
`discovery-postures.mjs` prefixes `discovery-postures: `.

**Route shape** (`portal/server.mjs`): every parameter named, never `{ ...body }`; SSE refusals are
`send({ type: 'error', message })`, never the catch-all's `{ error }`.

**Gate shape** (`tooling/build-checks.mjs`): `ok(condition, message)`; every refusal driven behind a
**positive control**; the message matched against the op/field/value it must name. A new roster entry
with no fixture must fail **by name** rather than be skipped (the `VALID_FOR` / `BOARD_FOR` idiom).

---

## IMPLEMENTATION PLAN

### Phase 1: The applier — the supersede correction, the AC3 refusals, and the two pure reads

**Independent of:** Phases 2–4 for its GATES. **Depends on Phase 3 for its EFFECT** — Task 1a's closer
guard fires on `a.intent === "aside"`, and until Task 12 writes that field `appendAnswer` produces
off-script lines with no `intent` key, so the guard matches nothing and **silently never fires.** Group
29 drives it green over synthetic answers that carry the field, which is exactly the shape
[[check-that-cannot-fail]] names. **Task 1a and Task 12 ship in the same PR**; a worktree may develop
Phase 1 alone but must not merge it alone. Touches only `discovery/ops.mjs`, `discovery/prd-projection.mjs`, `discovery/README.md` and group
29/31 cases. Can run in a parallel worktree.

The one place this ticket touches the op grammar's switch, so it **takes the epic's op-verb lock** —
confirm no other open ticket is editing `discovery/ops.mjs`, `PARAMS` or a posture prompt string
concurrently before starting.

**Tasks:**

- Correct `supersedes` so an off-script decision never supersedes and is never superseded, in all
  three readers together.
- **The four AC3 refusals (Task 1a):** a closing op may not rest on an off-script answer; a decision or
  open question naming one must carry the off-script form; one off-script answer files a decision or an
  open question, never both; and a closing op is refused while an `intent: "aside"` answer on this turn
  has no filing. Two of these fix a live defect — at `HEAD` all three closing forms naming an
  off-script ref record `closes: true` (observed).
- Add `auditTraceability(ops)` — the transitive walk to `business`, plus the evidence half.
- Add `auditExchanges(answers, ops)` and name an unfiled exchange in `prd.md`, conditionally.
- Amend the two docs that state the rules.

### Phase 2: The prompt surface

**Independent of:** Phase 1. **Blocks:** Phase 3.

Four new rule strings, `pendingBrief`, three new turn-prompt conditionals and one new fingerprint.
Nothing here touches `systemFor`, `FINGERPRINT_INPUTS`, `FINGERPRINT_INPUTS_FOR` or
`TOOL_DESCRIPTIONS` — the two Think stamps are measured unmoved, not argued.

**Tasks:**

- `PARK_RULE`, `LOOK_IT_UP_RULE`, `ESCAPE_HATCH_RULE`, `DOMAIN_RULE` as separately exported constants.
- A `park` branch in all four builders' TURN prompt; an `affordance` branch producing the off-script
  turn prompt.
- `DOMAIN_RULE` additionally into the two #286 postures' system prompts (not locked).
- `ledgerBrief` gains a conditional evidence line; `pendingBrief` makes the closer guard compliable.
- `AFFORDANCE_FINGERPRINT` over its own frozen input sets.

### Phase 3: The session module and the transport

**Depends on:** Phase 2 (the builders' new signature).

**Tasks:**

- `FETCH_TOOLS`, the off-script/park guards, `runTurn`'s new parameters, `turnEvent`'s widening.
- `AFFORDANCE_MAX_TURNS`, the per-turn `tools` / `extraTools` / `mainTools` wiring, the affordance stamp.

### Phase 4: The route and the drawer

**Depends on:** Phase 3.

**Tasks:**

- `/api/discovery/turn` carries `kind`, `intent` and `park`, each named.
- Three controls in the drawer: **Park it**, **Look it up**, **Ask something else**; the off-script
  textarea; the post-turn status line that says what was filed.

### Phase 5: The gates

**Depends on:** Phases 1–4.

**Tasks:**

- Group 29: the supersede correction and `auditTraceability`, both driven to red first.
- Group 30: the new rule strings, the byte-identity proofs, the guards, the fence widening, the constants.
- Group 31: the projection over an off-script ledger.
- Group 32: the two existing stamps re-derived live, unmoved.

### Phase 6: Docs and validation

**Depends on:** Phase 5.

### Phase 7: The one paid probe

**Depends on:** Phase 6. Operator-run, not CI.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

Use information-dense keywords for clarity:

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase

---

### Task 0 · VERIFY the baseline is green and the lock is free

- **IMPLEMENT**: Run the gate before touching anything, and confirm the op-verb lock is free.
- **PATTERN**: CLAUDE.md §Testing — "done = run the surface you touched".
- **GOTCHA**: A red baseline makes every later run unreadable. Also confirm the branch: parallel
  sessions share this worktree ([[shared-worktree-parallel-sessions]]).
- **VALIDATE**: `node tooling/build-checks.mjs && node tooling/drift-check.mjs && git branch --show-current && gh issue list --state open --search "ops.mjs OR posture OR op-verb"`
- **SATISFIES**: precondition for every AC.

---

### Task 1 · UPDATE `discovery/ops.mjs` — an off-script decision never supersedes

- **IMPLEMENT**: In `applyOp`'s `record_decision` case, gate the supersede computation on
  `off_script` as well as `question_id`:

  ```js
  // MVP 9 (#289). A supersede is the LATEST ANSWER to a banked question replacing an earlier one.
  // An off-script decision is not an answer to the question on the table — architecture §Data model:
  // an off-script exchange "attaches to the run without consuming a turn's slot and without advancing
  // the cursor". It may still NAME the question it touched (the normal case: naming it is usually why
  // the person went off-script), and naming is not answering. So it never supersedes, and — because
  // the later banked decision's findLast must not stop on it either — it is never superseded.
  if (p.question_id !== null && !p.off_script) {
    const prior = state.ops.findLast((r) => r.op === "record_decision"
      && r.params.question_id === p.question_id && r.params.off_script === false);
    supersedes = prior ? prior.seq : null;
  }
  ```
- **PATTERN**: the switch case at `discovery/ops.mjs:277-280`; the invariant-4 sentence in the header.
- **IMPORTS**: none.
- **GOTCHA**: **The two conditions do one job each, and the second is the one nobody guesses.**
  `!p.off_script` on the guard says *an off-script decision never supersedes anything.*
  `r.params.off_script === false` inside `findLast` says *a banked decision never names an off-script
  record as the thing it replaced* — it looks past it to the previous banked answer. Observed at
  `HEAD` on the re-ask sequence (flag on `q1` → off-script decision on `q1` → banked decision on `q1`'s
  second ask): the third record files `supersedes: 2`, naming the **aside**. After the fix it files
  `null`, because the only earlier record on `q1` is a `flag_weak_answer`, not a decision. Drive that
  exact sequence in Task 19 — it is correct-by-accident until it is pinned.
- **GOTCHA**: Update invariant 4's paragraph in the file header to state the supersede half — the
  header is the specification (CLAUDE.md §Ground rules), and a rule stated only in a switch case is a
  rule the next editor deletes.
- **VALIDATE**: `node -e "import('./discovery/ops.mjs').then(({applyOps})=>{const ctx={answers:[{ref:'a1'},{ref:'a2'}],bank:[{id:'q1'}],turn:null};const d=(o)=>({op:'record_decision',turn:'t1',params:{question_id:'q1',answer_ref:'a1',level:'business',parent_id:null,evidence_refs:[],wrong_if:'x',off_script:false,...o}});const s=applyOps([d({}),d({off_script:true,answer_ref:'a2'}),d({})],ctx);console.log(JSON.stringify(s.ops.map(r=>({seq:r.seq,off:r.params.off_script,sup:r.supersedes}))))})"` → expect `sup` `null`, `null`, `1` (the third banked one skips the off-script record and names seq 1).
- **SATISFIES**: AC #4 (the escape hatch attaches rather than replaces) — the precondition for it.

### Task 1a · UPDATE `discovery/ops.mjs` — the three off-script refusals

- **IMPLEMENT**: (a) beside the existing `refs` Set at `:216`, add `const answerOf = (ref) => ctx.answers.find((a) => a?.ref === ref) ?? null;`. (b) In `flag_weak_answer`, throw when `answerOf(p.answer_ref)?.kind === "off-script"`. In `record_decision`, require `off_script: true` in that case; in `open_question`, require `source: "off-script"`. (c) In the same two cases, refuse a second SETTLING op on one off-script ref when the other form already names it, naming the earlier seq the way R2 does. (d) In `closeTurn` at `:239-243`, beside R2's own check, refuse while any answer with `kind: "off-script"`, `intent: "aside"` and `turn === ctx.turn` is named by no settling op in `state.ops`.
- **PATTERN**: R2's own refusal at `:241-242` for the message shape (name the offending seq, state the rule, cite the invariant); `parentCandidates`' refusal for the correction-not-only-a-verdict discipline.
- **IMPORTS**: none. `kind` and `intent` already ride `ctx.answers`, which `buildOpServer`'s `ctx()` builds from `readAnswers(root)` — whole records — so invariant 6 holds and CI still drives the file with no `portal/node_modules`.
- **GOTCHA**: **Keep `refs` a Set.** Throw 1's message interpolates `[...refs].map(String).join(", ")`, and case 28.8 drives an answer store holding `Symbol("a1")`. A `ref → record` Map makes that a TypeError and reds a case written for exactly this trap (PR #324 review F1). The `?.` in `answerOf` matters for the same reason: 28.8 also drives `answers: [null]`.
- **GOTCHA**: **Layer the settle-once rule on `kind === "off-script"`, never on "the same ref carries both".** In an `existing-prd` audit every op names the one `kind: "document"` answer line, and the README's verdict table maps ANSWERED to `record_decision` and ABSENT to `open_question` — so any audit reaching both verdicts files exactly that pair. All seven committed packages are `blank-idea`, so an unscoped rule would pass every gate and break on the first audit run after this ticket. Drive the document pair as an accepted control.
- **GOTCHA**: **The closer guard is scoped to `intent: "aside"`.** `LOOK_IT_UP_RULE` tells the agent to file no closing op and, when it found nothing usable, to file nothing at all, so a look-up exchange with no settling op is the designed outcome. A guard keyed on `kind` alone would refuse the banked closer after every compliant look-up.
- **GOTCHA**: **No deadlock, and the proof is the acceptance half of the gate case.** The compliant filing is non-closing, so `closeTurn` never sees it; the kind gate requires exactly that form and the settle-once rule permits it at count 0. A legal next op therefore always exists. State the proof in the header beside invariant 4, and pin it with the case that asserts the SAME closer is accepted once the filing lands.
- **GOTCHA**: This also refuses a **banked** `open_question` naming an off-script ref, which is the park path. That is correct — a park's `answer_ref` is the person's park reason, not an aside — but it is a behaviour change on the banked path and needs its own case and its own sentence, not a line under "strengthens invariant 4".
- **GOTCHA**: Extend invariant 4's paragraph in the file header with both halves: off-script ops never close, AND closing ops never rest on an off-script answer. The header is the specification (CLAUDE.md §Ground rules).
- **VALIDATE**: `node -e "import('./discovery/ops.mjs').then(({applyOp,emptyRun})=>{const A=[{ref:'a1',kind:'banked',turn:'t1'},{ref:'a2',kind:'off-script',intent:'aside',turn:'t1'}];const c={answers:A,bank:[{id:'q1'}],turn:'t1'};const t=(l,f)=>{try{f();console.log('ACCEPTED '+l)}catch(e){console.log('refused  '+l)}};t('weak on a2',()=>applyOp(emptyRun(),{op:'flag_weak_answer',params:{question_id:'q1',answer_ref:'a2',missing:['x']}},c));t('closer with a2 unfiled',()=>applyOp(emptyRun(),{op:'record_decision',params:{question_id:'q1',answer_ref:'a1',level:'business',parent_id:null,evidence_refs:[],wrong_if:'w',off_script:false}},c))})"` → both refused.
- **SATISFIES**: AC #3, AC #4.

### Task 2 · UPDATE `discovery/ops.mjs` — `ledgerView`'s `latestByQuestion` mirrors it

- **IMPLEMENT**: In `ledgerView`, exclude off-script decisions from `latestByQuestion`, and make the
  `latest` flag read `true` for every off-script decision (each is its own visible row):

  ```js
  for (const d of decisionsRaw) {
    const q = d.params?.question_id ?? null;
    if (q !== null && d.params?.off_script !== true) latestByQuestion.set(q, d.seq);
  }
  …
  latest: p.off_script === true || qid === null || latestByQuestion.get(qid) === r.seq,
  ```
- **PATTERN**: `ledgerView`'s own rule comment — *"`latest` mirrors the projection's `visible` set exactly"*.
- **GOTCHA**: `supersededBy` is built from the record's own `supersedes`, so it needs no change once
  Task 1 lands — but assert that in Task 20 rather than assuming it.
- **GOTCHA**: `ledgerView` is TOTAL OVER JUNK, so it reads `p.off_script !== true` (not `=== false`):
  a malformed record is not treated as banked. `prd-projection.mjs` (Task 3) reads
  `d.params.off_script === true` instead, because `checkOpLines` has already refused a corrupted
  ledger before the fold runs. **The asymmetry is deliberate and the comment must say so**, or a
  reviewer reads two mirrors of one rule as drift.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "applier|discovery"`
- **SATISFIES**: AC #4.

### Task 3 · UPDATE `discovery/prd-projection.mjs` — `indexOps`' `visible` mirrors it, and the comment is rewritten

- **IMPLEMENT**: In `indexOps`, skip off-script decisions when building `latestByQuestion`, and keep
  every off-script decision in `visible` (the existing `qid === null ||` clause covers only the
  null-question half):

  ```js
  for (const d of decisions) if (d.params.question_id !== null && d.params.off_script !== true) latestByQuestion.set(d.params.question_id, d);
  const visible = decisions.filter((d) => {
    const qid = d.params.question_id;
    return qid === null || d.params.off_script === true || latestByQuestion.get(qid)?.seq === d.seq;
  });
  ```
- **PATTERN**: `discovery/prd-projection.mjs:419-441`.
- **GOTCHA**: The comment block at `:419-426` currently states the OLD behaviour as deliberate — *"It
  keys on question_id ONLY, never on off_script: an off-script decision on a banked question does
  supersede the banked one"*. **Rewrite it**, citing #289 and the run-0 fact that no committed package
  holds an off-script op, so nothing on disk changes.
- **GOTCHA**: Verify no committed `prd.md` moves: `graded-*`, `instrument-loans-1`, `spine-meridian-1`,
  `bracket-trace-*` hold **zero** off-script ops (verified: `grep off_script.*true discovery/*/transcript.jsonl` finds none).
- **VALIDATE**: `for d in discovery/*/; do [ -f "$d/prd.md" ] && node discovery/prd-projection.mjs --root "$d" --stdout | diff -q - "$d/prd.md" && echo "$d unchanged"; done`
- **SATISFIES**: AC #4.

### Task 4 · ADD `auditTraceability(ops)` to `discovery/ops.mjs`

- **IMPLEMENT**: A pure read beside `auditParenting`, **composing** it rather than paralleling it.
  Returns the two flag sets and the transitive walk:

  ```js
  // THE TRACEABILITY RULE, checkable over a WHOLE package (#289; PRD MVP 10, first rule). The
  // per-record halves already exist — `orphan` when a non-business decision names no parent,
  // `no-evidence` when it names no evidence — and they are flagged IDENTICALLY, which is the second
  // half of the rule. What no read reaches today is the chain: a solution whose stakeholder parent is
  // itself an orphan is unrooted even though neither record is flagged twice. So every decision walks
  // UP through parent_id to a business decision or to nothing, and `unrooted` names the ones that do
  // not arrive. Composes auditParenting rather than re-deriving it — two answers to "who could this
  // decision's parent be" is the drift this file's header forbids. Total over junk, like ledgerView:
  // a view that throws takes the reader down over a record the applier already accepted.
  export function auditTraceability(ops) { … }
  ```

  Shape: `{ parenting, rooted, unrooted, unbacked, byLevel }` where
  - `parenting` is `auditParenting(ops)` verbatim,
  - `rooted` / `unrooted` are arrays of `seq` (a business decision is rooted by definition),
  - `unbacked` is every decision seq carrying `no-evidence`,
  - `byLevel` is `{ business: {decisions, orphans, unbacked}, … }` keyed by every entry of `LEVELS`,
    always present (a rung nobody filed at reads 0, the same rule `ledgerView`'s `counts` follows).
- **PATTERN**: `auditParenting` (`discovery/ops.mjs:100-112`) for the shape and the `ops.slice(0, i)`
  discipline; `ledgerView`'s "keyed by the roster ALWAYS" rule for `byLevel`.
- **GOTCHA**: **Cycle safety.** `parent_id` names an *earlier* seq, so a cycle is impossible through
  the applier — but this read is TOTAL over junk, so bound the walk (a `seen` set, or `LEVELS.length`
  steps) and treat a non-terminating walk as `unrooted` rather than hanging the drawer.
- **GOTCHA**: A pure read is **not a verb** — do not touch `OPS`, `PARAMS` or the switch for it, and
  say so in the doc comment (the header's own sentence).
- **VALIDATE**: `node -e "import('./discovery/ops.mjs').then(m=>console.log(typeof m.auditTraceability))"` → `function`
- **SATISFIES**: AC #6.

### Task 4a · ADD `auditExchanges(answers, ops)` to `discovery/ops.mjs` and read it in `sessionView`

- **IMPLEMENT**: A pure read beside `ledgerView`, taking both arrays as arguments. It partitions the off-script answer lines: an `intent: "aside"` line is `settled` when a `record_decision{off_script: true}` or an `open_question{source: "off-script"}` names its ref, `unfiled` otherwise; an `intent: "look-up"` line goes to `lookups` with **no verdict**, and the doc comment says why. Then `portal/lib/discovery.mjs`'s `sessionView` gains `exchanges: auditExchanges(answers, opLines)`.
- **PATTERN**: `ledgerView` (`discovery/ops.mjs:129`) — total over junk, every array copied, the drawer renders it and derives nothing of its own.
- **GOTCHA**: A pure read is **not a verb**: it takes no op-verb lock and may not add, rename or reinterpret anything in `OPS`, `PARAMS` or the switch. Say so in the doc comment, as `ledgerView`'s own header does.
- **GOTCHA**: `file_evidence` is **not** a filing for AC3's purposes. MVP 9 names two ops in both branches, and a url-sourced evidence row carries `ref: null` and names no answer at all. Excluding it is deliberate and needs its own case, or a later editor counts it and quietly widens the AC.
- **GOTCHA**: The drawer's status line must read the OPEN TURN's exchanges, not the package-wide `unfiled` list. Mid-session an aside on the turn in flight is legitimately unfiled, and a package-wide read would say "unaccounted-for" about a turn that is simply still open — less accurate than the SSE count it replaces. `exchanges` rows carry `turn`, so scope the render explicitly.
- **GOTCHA**: Nothing pins `sessionView`'s key set (34.11 pins `proposalsView`'s; there is no equivalent), so adding a key breaks no gate — verify that before relying on it.
- **VALIDATE**: `node -e "import('./discovery/ops.mjs').then(m=>console.log(typeof m.auditExchanges))"` → `function`
- **SATISFIES**: AC #3.

### Task 4b · UPDATE `discovery/prd-projection.mjs` — an unfiled exchange is named on the page

- **IMPLEMENT**: In `renderOpenQuestions` (`:591`), append a block naming every unfiled aside — its ref, its turn, and the person's own words through the existing `answerBlock` path — **conditional on there being one**. When `state.opened` is empty and an unfiled aside exists, push the open-questions row's own declared `empty` string first and the block after it. Extend that SECTIONS row's `why` to state that the block is selected by the ABSENCE of an op and that its `empty` still renders.
- **PATTERN**: `renderEvidence` (`:521-545`) — its "Decisions resting on no evidence" line is appended whether or not the table rendered, and the evidence row's `why` already carves exactly that exception.
- **GOTCHA**: **The block must be conditional, and that is the whole guard.** An always-printed line would rewrite all six committed `prd.md` files. The compensation is that the zero is stated in CI (Task 24's sweep) rather than on the page, and the code comment and the README must say so, or a reader infers that silence means checked.
- **GOTCHA**: **The predicate is narrow on purpose — `kind: "off-script"` AND `intent: "aside"`.** Group 31's `PRD_ANSWERS` carry no `kind`, so no fixture answer is ever eligible and case 31.7.2 ("an answer reaches the page only through an op that references it") stays green untouched. A predicate widened to "any answer no op names" reds ten assertions in that case and puts every answer of an empty run on the page. Do not widen it.
- **GOTCHA**: The module header names five sources a claim can reach the page by, of which #2 is "an answer resolved by `answer_ref`". An unfiled exchange is precisely an answer no `answer_ref` resolves, so the header gains a sixth: an off-script exchange the document names as unfiled. The header is the specification; amend it rather than letting it go false.
- **VALIDATE**: `for d in discovery/*/; do [ -f "$d/prd.md" ] && node discovery/prd-projection.mjs --root "$d" --stdout | diff -q - "$d/prd.md" && echo "$d unchanged"; done`
- **SATISFIES**: AC #3.

### Task 5 · UPDATE `discovery/README.md` §Supersede and §The op grammar

- **IMPLEMENT**: (a) §Supersede's "Two counted sets" paragraph — replace *"an off-script decision names
  no question, so nothing can supersede it"* with the rule as implemented: an off-script decision may
  name the question it touched, and **never** supersedes or is superseded, because naming is not
  answering. (b) §The op grammar — extend the escape-hatch paragraph (`:157-158`) with the same
  sentence and cite #289. (c) §File shapes — an off-script answer line example
  (`question_id: null, kind: "off-script"`, sharing the open banked turn's id) and the two intents.
- **IMPLEMENT**: (d) §File shapes — the off-script answer-line example gains `"intent": "aside"`, with the sentence that `intent` is written on off-script lines only and is absent on banked and document lines, so every line recorded before #289 reads unchanged. (e) §The op grammar — the four new refusals, each stated as a rule: a closing op may not rest on an off-script answer; a decision or open question naming one must carry the off-script form; one off-script answer files a decision or an open question, never both; and a turn cannot be closed while an aside on it has no filing. Add the sentence that the guard is on advancing and never on leaving — a session can always be finished, and an unfiled exchange is then named in `prd.md` rather than blocking the exit.
- **PATTERN**: the README's existing voice — a rule, then why, then what it forbids.
- **GOTCHA**: `discovery/README.md` is the format spec `portal/lib/discovery.mjs`'s header says it
  conforms to. It is missing from the ticket's files-touched list; it is not optional.
- **VALIDATE**: `grep -n "off-script" discovery/README.md | head -20` and read the three edited passages.
- **SATISFIES**: AC #3, AC #4.

---

### Task 6 · ADD the four rule constants to `portal/lib/discovery-postures.mjs`

- **IMPLEMENT**: Four separately exported frozen strings, beside `EVIDENCE_RULE` and `PARENT_RULE`,
  each with a doc comment saying which MVP it implements and why it is exported separately (a
  tightening is a one-line diff the gate notices):

  ```js
  export const PARK_RULE = `The person is PARKING this question: they cannot answer it yet and have given their reason. File open_question with source "banked", question_id this question, answer_ref their stored answer, and reason stating why it is not answerable yet — in their terms, not yours. That closes the turn and the session moves on. Do not record a decision, do not flag the answer weak, and do not ask them to try again: blocking on an unanswerable question is not available here.`;

  export const LOOK_IT_UP_RULE = `The person has asked you to look something up, or has pasted a source. Search or fetch, then say in prose what you found and give the URL of every source you used. For each source you actually used, file file_evidence with url set to that URL, ref null, name null, provenance "secondary-source" and claim_ref null. You may quote or summarise a source, attributed to it. YOU MAY NOT ANSWER THE QUESTION ON THE TABLE — quoting a source is not a finding, and the person writes their own answer. File no closing op: this turn does not close, and the question stays on the table. If you found nothing usable, say so and file nothing.`;

  export const ESCAPE_HATCH_RULE = `The person has said something the question on the table did not ask for. Answer them, then FILE THE EXCHANGE — dropping it is never available. If the exchange ends in them making a choice, file record_decision with off_script true, the same wrong_if condition and evidence_refs a banked decision would carry, and question_id naming the banked question it touched, or null when it touched none. Otherwise file open_question with source "off-script", the same question_id rule, and a reason saying what is still open. Exactly one of the two. Neither closes the turn: the question on the table is still unanswered and the cursor does not move.`;

  export const DOMAIN_RULE = `The product may be invented; the domain is not. A claim that is checkable and public — that a scheme exists, that a regulation applies, that a payment cannot be recalled — must carry a file_evidence row with a URL and provenance "secondary-source", and looking it up is how it gets one. A claim about the SHAPE of this product — what it should do, who it is for, what it is worth — carries provenance "assumption" beside a wrong_if condition, and that is the expected result. Filing a checkable public fact as an assumption is a failure.`;
  ```
- **PATTERN**: `EVIDENCE_RULE` at `:110-118` and its doc comment's reasoning.
- **GOTCHA**: **Do not append any of these to `systemFor`.** That function's output is hashed into
  `POSTURES.think.fingerprint`, which seven recordings carry — including two 65-turn graded packages.
  `systemFor` serves Think and Think-on-Opus **only**.
- **GOTCHA — THE ONE DELIBERATE STAMP MOVE.** `DOMAIN_RULE` additionally goes into the **system**
  prompts of `buildCreatePrdTurn` and `buildGrillTurn` (both templates), placed before `sharedTail`
  and never after `PARENT_RULE`. That **moves `POSTURES['create-prd'].fingerprint` and
  `POSTURES.grill.fingerprint`**, and it is meant to. It costs nothing on disk: all seven committed
  packages run `think` or `think-opus` (verified — `grep '"posture"' discovery/*/run.json`), so no
  recording goes stale under groups 32 or 33. This is #286's own move repeated: `JUDGEMENT_RULE` went
  into exactly these two system prompts for exactly this reason. **Verify the disk fact before
  editing**, and record the two pre-#289 hex values in the PR body so the move is visible rather than
  smuggled. The other three rules ride the turn prompt only, on all four postures.
- **GOTCHA**: British English throughout; the postures file already sets that register in
  `INTERVIEW_CLOSE`.
- **IMPLEMENT (fifth item)**: `pendingBrief(answers, ops)`, a pure exported function beside `reaskBrief`, returning `''` when no `intent: "aside"` answer is unfiled and otherwise the unfiled refs with the person's verbatim text, under one sentence naming the two ops that discharge them.
- **PATTERN**: `reaskBrief` (`:189-195`) exactly — pure over its arguments, `''` when there is nothing to say, so a build without it is byte-identical.
- **GOTCHA**: This is what makes the closer guard COMPLIABLE rather than merely enforceable. Under `tools: []` the agent has no route to `answers.jsonl`, so after a server restart it would otherwise author a `reason` for an exchange it cannot read — the mirror-direction failure the honesty contract forbids. The person's own text is already what the turn prompt carries (`answer.text`), so this is existing practice, not a new class of input.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m=>console.log(['PARK_RULE','LOOK_IT_UP_RULE','ESCAPE_HATCH_RULE','DOMAIN_RULE'].map(k=>k+': '+(typeof m[k]==='string'&&m[k].length>0)).join('\n')))"`
- **SATISFIES**: AC #1, AC #2, AC #3.

### Task 7 · ADD the `park` and `affordance` branches to all four turn builders

- **IMPLEMENT**: Widen every builder's argument object with `park = false` and
  `affordance = null` (`null` | `'look-up'` | `'aside'`), and branch **in the turn prompt only**:

  - `park === true` → append `PARK_RULE` as its own paragraph before the closing "file your one op"
    line, and change that closing line to name `open_question`.
  - `affordance !== null` → build a DIFFERENT turn prompt: the banked question is named as *context,
    still unanswered*, the off-script input is quoted by its ref, and the rule for the intent
    (`LOOK_IT_UP_RULE` or `ESCAPE_HATCH_RULE`) plus `DOMAIN_RULE` are appended, ending on the
    ledger brief and the parent line (recency — `PARENT_RULE`'s tail is what #341 paid for).
  - Refuse the combination `park && affordance` by name; refuse `affordance` with
    `entryMode === 'existing-prd'` by name; refuse an unknown `affordance` value by name.

  Extract the shared affordance turn-prompt body into ONE helper both new branches use, mirroring how
  `sharedVocabulary`/`sharedTail` serve the two #286 builders — but **copy, never share, with
  `buildThinkTurn`'s existing lines**: a refactor through one helper would be a Think edit wearing a
  tidy-up (the file says so at `:325-327`).
- **PATTERN**: `buildThinkTurn`'s `entryMode === 'existing-prd'` throw (`:266`) — a branch on a value
  no existing caller passes.
- **IMPORTS**: none new.
- **GOTCHA**: **THE BYTE-IDENTITY RULE.** With `park` false and `affordance` null every builder must
  produce exactly the bytes it produces today. Do not add a trailing newline, do not reorder, do not
  render an empty paragraph. Group 30 case 30 pins Think's stamp as a literal and will catch it — but
  Task 21 asserts the four builds directly so the failure names the builder, not the hash.
- **GOTCHA**: An affordance turn has **no `question.weakAnswer` to judge against** — the person is not
  answering. Do not render the weak-answer note on an affordance turn: it is the rubric, and on a turn
  with no answer to judge it is noise the agent may act on.
- **GOTCHA**: `commonGuards` requires `question`, `answer`, `turn`, `ledger`, `provenance`. An
  affordance turn has all five (the `answer` is the off-script input line). Keep the guards.
- **IMPLEMENT (addition)**: Widen every builder with `answers = []` and interpolate `pendingBrief(answers, ledger)` into the TURN prompt with `reaskBrief`'s exact idiom, `${x ? `\n${x}\n` : ''}`. `runDiscoveryTurn` passes the answers array it already reads.
- **GOTCHA**: **Measured, not argued.** `FINGERPRINT_INPUTS` carries `question`, `answer`, `turn`, `provenance` and `ledger` and no `answers` key, so the default `[]` renders `''` and the template `A\n${''}\nB` emits today's bytes. Patched against a scratch copy, `POSTURES.think.fingerprint` reads `7efdde37441fbd2591ba4a7dfeecdb6b` and `POSTURES['think-opus'].fingerprint` reads `cadb38117a2660c036d87e32323a8745` — both byte-identical to `HEAD`. Run case 30.43 before writing anything else and confirm the same two hex values.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m=>{const i=m.FINGERPRINT_INPUTS;for(const [k,b] of [['think',m.buildThinkTurn],['create-prd',m.buildCreatePrdTurn],['grill',m.buildGrillTurn]]){const a=b(i);const c=b({...i,park:false,affordance:null});console.log(k, a.systemPrompt===c.systemPrompt && a.prompt===c.prompt)}})"` → three `true`
- **SATISFIES**: AC #1, AC #2, AC #3.

### Task 8 · ADD the conditional evidence line to `ledgerBrief`

- **IMPLEMENT**: After the parent-candidates block, append **only when the ledger holds at least one
  `file_evidence` record**, a line naming each row's seq, its provenance and its url/name:

  ```
  Evidence filed in this run: seq 4 (secondary-source, https://…) · seq 7 (real-interview, the Q3 rota export)
  ```

  Render **nothing** — not an empty heading, not "none" — when there is no evidence.
- **PATTERN**: `ledgerBrief` at `portal/lib/discovery-postures.mjs:166-182`; its own comment names the
  fields it reads and says *"widen both or neither"* about `FINGERPRINT_INPUTS`' synthetic ledger.
- **GOTCHA**: **This is the reason the "render nothing" rule is load-bearing.** `FINGERPRINT_INPUTS.ledger`
  holds three `record_decision` records and **no** `file_evidence`, so an absent-when-empty line leaves
  the fingerprint input's output byte-identical and every stamp unmoved. An "Evidence filed in this
  run: none" line would move all four.
- **GOTCHA**: `ledgerBrief`'s comment says it reads *exactly two fields* and that
  `FINGERPRINT_INPUTS`' ledger carries exactly those. Update that comment: it now reads
  `params.provenance`, `params.url` and `params.name` too, and the synthetic ledger deliberately holds
  no evidence record so the widening cannot move the hash. Say **why** rather than just widening.
- **GOTCHA**: Why this is worth doing at all: without it a later banked turn can only name a look-it-up
  evidence seq **from recollection across a resumed session** — the exact failure #341 paid a recording
  to discover.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m=>{const before=m.POSTURES.think.fingerprint;console.log('brief on fp ledger unchanged:', !m.ledgerBrief(m.FINGERPRINT_INPUTS.ledger).includes('Evidence'))})"`
- **SATISFIES**: AC #1.

### Task 9 · ADD `AFFORDANCE_FINGERPRINT` and its frozen input sets

- **IMPLEMENT**: Two frozen input sets — one park, one affordance — over the same synthetic question,
  answer, ledger and provenance `FINGERPRINT_INPUTS` uses, and a stamp **per posture**:

  ```js
  export const AFFORDANCE_FINGERPRINT = Object.freeze(Object.fromEntries(
    Object.entries(POSTURES).map(([id, p]) => [id, fingerprintOf({
      build: p.build, model: p.model,
      inputs: [PARK_FINGERPRINT_INPUTS, AFFORDANCE_FINGERPRINT_INPUTS],
    })]),
  ));
  ```

  Export `PARK_FINGERPRINT_INPUTS`, `AFFORDANCE_FINGERPRINT_INPUTS` and `AFFORDANCE_FINGERPRINT`.
- **PATTERN**: `AUDIT_FINGERPRINT_INPUTS` (`:568-573`) and `fingerprintOf` (`:588-591`).
- **GOTCHA**: **Do NOT add these input sets to `FINGERPRINT_INPUTS_FOR`.** That map is what
  `fingerprintOf` reads when computing a **posture's** stamp; widening it there moves
  `POSTURES.think.fingerprint` and makes seven recordings (including two 65-turn ones) stale under
  groups 32 and 33. The affordance surface is its own stamp because a banked turn's prompt is
  genuinely byte-identical — that statement is true and this design is what keeps it true.
- **GOTCHA**: **Do NOT add a sixth key to a `POSTURES` entry.** Case 11's message is explicit: *"a
  per-posture option sits OUTSIDE fingerprintOf's hash, so widen the hash (and this pin) or do not add
  it."* `AFFORDANCE_FINGERPRINT` is a module constant, not a posture key.
- **GOTCHA — WHY IT IS A MAP AND NOT ONE HASH.** The affordance **turn** prompt is one shared body,
  but the **system** prompt is the posture's own, and Task 6 puts `DOMAIN_RULE` into two of the four.
  So `buildThinkTurn(AFFORDANCE_FINGERPRINT_INPUTS)` and
  `buildCreatePrdTurn(AFFORDANCE_FINGERPRINT_INPUTS)` genuinely differ, and a single hash derived from
  Think would cover neither of the other two. One entry per posture, keyed by `POSTURES`' own keys, so
  a fifth posture appears here as a missing key rather than as silence.
- **GOTCHA**: The transport stamps `AFFORDANCE_FINGERPRINT[head.posture]` (Task 13), so `run.json`
  records which affordance surface the turn actually ran under.
- **GOTCHA**: **The fixed unfiled aside carries SYNTHETIC text, and both new input sets are frozen at
  every level** — `AUDIT_FINGERPRINT_INPUTS` is the shape to copy. `FINGERPRINT_INPUTS.answer.text` is
  the literal `'A fixed answer.'` for exactly this reason: an input set is a permanent committed
  literal, and one seeded from anything resembling a real answer would bake a person's words into the
  module forever. `pendingBrief` renders the person's verbatim text at run time, which is existing
  practice (`answer.text` already rides the turn prompt) — but the FIXTURE must never.
- **GOTCHA**: `pendingBrief`'s text goes **into** `AFFORDANCE_FINGERPRINT`'s frozen input set, with a fixed unfiled aside among its inputs so the rendered brief is actually covered. It is prompt text the agent reads and acts on, and it is the one string that can be retuned toward judging substance — "the person chose, so file a decision" — which is the server making MVP 6's call through the agent's mouth. Left uncovered, that edit lands with every recorded package still green and every stamp still asserting a prompt surface the turn did not run under. No committed package carries an `affordanceFingerprint` at all, so covering it costs nothing on disk.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m=>console.log(/^[0-9a-f]{32}$/.test(m.AFFORDANCE_FINGERPRINT), m.POSTURES.think.fingerprint))"` — and diff the second value against `git show HEAD:portal/lib/discovery-postures.mjs`'s computed stamp.
- **SATISFIES**: AC #1, AC #3 (the honesty half — the new surface is stamped).

---

### Task 10 · ADD `FETCH_TOOLS` to `portal/lib/discovery.mjs`

- **IMPLEMENT**: Beside `READ_TOOLS`:

  ```js
  // MVP 7's look-it-up path (#289). A SEPARATE FENCE THAT STAYS OPEN — architecture §Boundaries:
  // "WebSearch / WebFetch are a separate fence and stay open … no path allow-list touches it. What
  // holds the honesty line there is the op grammar, not the fence." So they are allowed BY NAME,
  // through fenceDecision's extraTools seam (#359), and they are deliberately NOT in READ_TOOLS: a
  // path rule cannot reach a URL, and adding them there would make #287's assertion false. They reach
  // a query() only on an off-script turn — a banked turn advertises nothing, as today.
  export const FETCH_TOOLS = Object.freeze(['WebSearch', 'WebFetch']);
  ```
- **PATTERN**: `READ_TOOLS` at `:177` and its own comment, which already names this ticket's path.
- **GOTCHA**: `allowsToolName` stays **unwidened** — case 14 drives it exhaustively as the statement
  *"the discovery SESSION's vocabulary is the four op verbs"*, and that statement stays true. The
  widening is `extraTools`, per call.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>console.log(m.FETCH_TOOLS, Object.keys(m.READ_TOOLS)))"` → `['WebSearch','WebFetch']` and `['Read','Grep','Glob']`
- **SATISFIES**: AC #1, AC #5.

### Task 11 · ADD the affordance guards to `portal/lib/discovery.mjs`

- **IMPLEMENT**: Three exported pure guards, so group 30 can drive them in CI without an SDK:

  ```js
  export const AFFORDANCES = Object.freeze(['look-up', 'aside']);
  export function assertAffordance(head, cursor, intent) { … }  // refuses by name
  export function assertParkable(head, cursor) { … }
  ```

  Each refuses, naming the offending value, when: the session is closed (`head.endedAt`); the cursor is
  done (there is no step to be beside); the entry mode is `existing-prd`; the intent is not in
  `AFFORDANCES`.
- **PATTERN**: `assertTurnWritable` (`:244-252`) — pure over its arguments, exported so the gate drives
  it in both directions; `bad()` for the message prefix.
- **GOTCHA**: MVP 9 says "at every step". `cursor.done` and `endedAt` are the two states with no step;
  refusing there is deliberate and the message says so, so the refusal reads as a rule rather than a bug.
- **VALIDATE**: drive both directions in Task 22; here just `node -e "import('./portal/lib/discovery.mjs').then(m=>console.log(m.AFFORDANCES))"`
- **SATISFIES**: AC #3.

### Task 12 · UPDATE `runTurn` — the off-script and park paths

- **IMPLEMENT**: Widen the signature to
  `runTurn({ slug, provenance, questionId, kind = 'banked', intent = null, park = false, text, onLine })`
  and branch **inside the existing lock → guards → append → run ordering**, changing nothing about it:

  - **IMPLEMENT (revised sub-bullet)**: `kind === 'off-script'`: skip the `questionId !== cursor.question.id` guard; run `assertAffordance(head, cursor, intent)`; append the answer with `kind: 'off-script'`, `questionId: null`, the cursor's **open turn id** and `intent` as declared; pass `affordance: intent` to the transport. `appendAnswer` gains an `intent` parameter and writes the key **on off-script lines only**, refusing by name an off-script line with no valid intent and a banked line carrying one.
- **GOTCHA**: **`intent` is a new field on an existing kind, not a new kind.** `appendAnswer`'s own `['banked', 'off-script']` guard stays a proper subset of the three kinds — build-checks case 33 drives it refusing `kind: "document"`, and `appendDocument` holds the one-document refusal — so do not wire that list to a three-value roster. Omitting the key on banked and document lines keeps every line recorded before #289 byte-identical in shape, so no existing reader widens.
- **GOTCHA**: **This task and Task 1a ship together.** Writing `intent` without the refusals leaves the
  record discriminated and unguarded; writing the refusals without `intent` leaves a guard that matches
  nothing and passes every gate. Neither half is separately shippable, and the failure mode of the
  second is silent.
- **GOTCHA**: Without the recorded intent, no reader over `(answers, ops)` can tell a look-up from an aside, and every rule that enforces AC3 either deadlocks MVP 7's happy path or reports it as a failure. This sub-bullet is the precondition for Task 1a, Task 4a and Task 4b.
  - `park === true`: run `assertParkable(head, cursor)`; the ordinary banked append; pass `park: true`.
  - `park && kind === 'off-script'` → refuse by name.
- **PATTERN**: `runTurn` at `:1002-1043` — its header comment IS the ordering rule; extend it rather
  than restructuring.
- **GOTCHA**: The off-script answer line **shares the open banked turn's id**. `assertTurnWritable`
  passes because nothing closed it, and the later banked answer lands on the same `tN`. That is the
  design: the exchange happened *during* that turn. `deriveCursor` counts closers, so nothing moves.
- **GOTCHA**: **More than one `answers.jsonl` line may now carry the same `turn` id** — an off-script
  line, then the banked answer that closes it. `assertTurnWritable` only refuses a *closed* turn, so
  nothing else guards it and nothing needs to: the exchange happened during that turn. Any reader that
  assumed one answer line per turn (`.claude/reports/`, an ad-hoc script) must be corrected, and
  `discovery/README.md` §File shapes says so after Task 5.
- **GOTCHA**: `recordTurnStats` now appends **more than one entry per turn id**. Group 32's 32.2a reads
  `[...new Set(turnStats.map(t => t.turn))]` (distinct), so it is safe — verify that before relying on it.
- **GOTCHA**: An off-script turn still takes `withDiscoveryRunLock`. Two concurrent turns would append
  to the same append-only files.
- **VALIDATE**: `cd portal && node -e "import('./lib/discovery.mjs').then(m=>console.log(m.runTurn.length))"` plus the portal smoke in Task 26.
- **SATISFIES**: AC #1, AC #2, AC #3, AC #4.

### Task 13 · UPDATE `portal/lib/discovery-transport.mjs` — the affordance turn

- **IMPLEMENT**: (a) `AFFORDANCE_MAX_TURNS = 12` beside `MAX_TURNS`, with the arithmetic in its
  comment; (b) `runDiscoveryTurn` takes `affordance = null` and `park = false`, passes both to
  `posture.build`, and on an affordance turn uses `AFFORDANCE_MAX_TURNS`, `tools: [...FETCH_TOOLS]`,
  `mainTools: [...FETCH_TOOLS]` and `extraTools: [...FETCH_TOOLS]` on the ONE fence object handed to
  both sites; (c) `stats.affordanceFingerprint = AFFORDANCE_FINGERPRINT[head.posture]` on park and affordance turns,
  beside the unchanged `postureFingerprint`.
- **PATTERN**: the `fence` object at `:158` handed to both `fenceCanUseTool` and `fenceHooks` from one
  variable (34.12 pins that shape); `stats` at `:210-226`.
- **GOTCHA**: **`MAX_TURNS = 6` admits four tool calls, and F10's stated REASON for that is wrong.**
  The number is right; the mechanism is not. `num_turns` counts **user** messages — the initial prompt,
  plus one `tool_result` per MAIN-SESSION tool call. The agent's closing message is never counted, and
  the CLI's warmup denials (built-ins, in subagents) are not either. Verified over every committed
  package: `numTurns === 1 + ops + main-session (mcp__) denials` on **all 199 turns, zero exceptions**
  (observed). F10 read the +1 as the closing confirmation, and its own data refutes that — run 0's
  turn 16 made five calls, read `numTurns: 6`, and carries **no text line at all**; on the closing-message
  reading it would read 5.
- **GOTCHA**: **A REFUSED op consumes a slot exactly as a filed one does** — it is a `tool_result`
  either way. So an in-turn correction after an applier refusal costs budget, and a look-it-up turn is
  1 search + N fetches + N `file_evidence` + 1 filing + any correction. That is the arithmetic
  `AFFORDANCE_MAX_TURNS = 12` (ten calls) must cover. Do not raise the banked cap.
- **GOTCHA**: **Raising the cap can never buy a turn after the agent has spoken.** The SDK's loop
  returns as soon as an assistant message contains no `tool_use` block; `maxTurns` is only an upper
  bound on the other side. So once the agent produces its closing text having filed nothing, nothing
  inside that `query()` recovers it — which is precisely why AC3 is enforced by refusing the NEXT
  closer (Task 1a) rather than by any in-turn recovery.
- **GOTCHA**: `MAX_TURNS` and the SDK preset sit **outside** `fingerprintOf`'s hash (the postures
  header says so), so this moves no stamp — **and no gate can see it either.** It needs its own group
  30 pin (Task 24).
- **GOTCHA**: `mainTools` is the fence's **record gate**: a denial of a tool in that list is recorded
  as the agent's. Widening it to `FETCH_TOOLS` on an affordance turn means a CLI warmup agent's
  `WebSearch` would be recorded as the agent's — the same false-receipt class `fenceSite`'s comment
  already names for `Read`. State it in the comment; the probe (Task 27) is where it would show.
- **GOTCHA**: `allowedTools: []` stays as it is, so `canUseTool` is still consulted for everything.
- **VALIDATE**: `cd portal && node lib/discovery-transport.mjs --preflight` → zero tokens, passes.
- **SATISFIES**: AC #1, AC #5.

### Task 14 · UPDATE `turnEvent` — project `offScript` and `source`

- **IMPLEMENT**: Add `offScript: line.params?.off_script === true` and
  `source: line.params?.source ?? null` to the `op` branch of `turnEvent`'s whitelist.
- **PATTERN**: `turnEvent` at `portal/lib/discovery.mjs:954-976` — a WHITELIST, never a blacklist, and
  its comment says why `wrong_if`/`missing`/`reason` are deliberately absent (the surface reads the
  package after the turn; streaming prose would put a second, divergent copy on the wire). These two
  are **flags, not prose**, which is the distinction that makes them projectable.
- **GOTCHA**: Without this the drawer's log shows `filed record_decision` identically for a banked
  decision and an escape-hatch one — the exact ambiguity AC #3 exists to remove.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>console.log(m.turnEvent({type:'op',op:'record_decision',params:{off_script:true,source:null}})))"`
- **SATISFIES**: AC #3.

---

### Task 15 · UPDATE `/api/discovery/turn` in `portal/server.mjs`

- **IMPLEMENT**: Name three more parameters — `kind: body.kind ?? 'banked'`, `intent: body.intent ?? null`,
  `park: body.park === true` — replacing the hardcoded `kind: 'banked'`. Extend the route's comment
  with why each is named individually.
- **PATTERN**: the route at `:340-384`; its comment's rule *"EVERY PARAMETER NAMED, never `{ ...body }`
  … it binds harder here: runTurn's parameters reach an append-only file the honesty contract forbids
  anyone to clean up."*
- **GOTCHA**: The origin guard (`origin.mjs`) runs before routing and needs no change.
- **GOTCHA**: A refusal after the SSE headers are written is `send({ type: 'error', message })`, never
  the catch-all's `{ error }` — unchanged.
- **VALIDATE**: Task 26's smoke, plus `node --check portal/server.mjs`.
- **SATISFIES**: AC #1, AC #2, AC #3.

### Task 16 · ADD the three controls to `portal/public/index.html`

- **IMPLEMENT**: Inside `#discovery-session`, after the answer label:
  - a **Park it** button (`#discovery-park`) beside `#discovery-submit`;
  - an off-script block (`#discovery-offscript-row`) holding a labelled `textarea`
    (`#discovery-offscript`) and two buttons — **Look it up** (`#discovery-lookup`) and
    **Ask something else** (`#discovery-aside`).
- **PATTERN**: `portal/public/index.html:241-256`; the existing `portal-form-actions` row and
  `.muted` note idiom.
- **GOTCHA**: 44×44 minimum targets (PRD Q4). **The portal has no a11y gate** — architecture
  §Boundaries states this plainly, so it is honoured by review, before #271 and after it.
- **GOTCHA**: `portal.css` carries an unscoped `[hidden]{display:none!important}`, so `hidden` works —
  but prefer `disabled` over `hidden` for a control that exists and is not yet reachable, matching the
  `#discovery-propose` reasoning already in `renderDiscoverySession`.
- **VALIDATE**: open `http://localhost:4747`, open the drawer, confirm the three controls render.
- **SATISFIES**: AC #1, AC #2, AC #3.

### Task 17 · WIRE the three controls in `portal/public/portal.js`

- **IMPLEMENT**: One shared `runDiscoveryTurn(body, label)` helper holding the SSE read loop the
  submit handler already has, called by four places (submit, park, look-up, aside) with different
  bodies. Then:
  - **Park it** → `{ slug, provenance, questionId, park: true, text }`, where `text` is the answer
    textarea's content; refuse an empty one in the drawer with prose ("A park records your reason —
    the reason is the record").
  - **Look it up** → `{ slug, provenance, kind: 'off-script', intent: 'look-up', text }` from
    `#discovery-offscript`.
  - **Ask something else** → the same with `intent: 'aside'`.
  - Gate all four on `discovery.running`; disable all four while in flight.
  - After an off-script turn, **do not clear the answer textarea** — the banked question is still open
    and the person may have been mid-answer.
  - The post-turn status line **says what was filed**: count the `op` events seen on the stream and
    render e.g. `Looked it up — 2 evidence row(s) filed. The question is still on the table.` or, when
    the stream carried no op, `Nothing was filed for that exchange — say it again, or answer the
    question on the table.`
- **PATTERN**: the submit handler at `portal/public/portal.js:1266-1320`; `discovery.running`;
  re-reading from disk after the stream rather than trusting its last word.
- **GOTCHA**: **The status line reports; it does not enforce.** AC #3 is enforced in the applier (Task 1a): a turn cannot be closed while an aside on it has no filing, and an aside's filing must be one of the two off-script forms and never both. So this line reads `session.exchanges` for the OPEN TURN after the stream — a disk read, not a count of `op` events — and says which refs were filed and which were not. Do not tell the person to "answer the question on the table" while an aside is unfiled: that is now the action the applier refuses, and a surface pointing at a refused action is a surface showing a claim the ops do not hold. Say instead that the exchange has not been filed yet and the turn will not close until it is.
- **GOTCHA**: The closer guard's refusal reaches the drawer on its own, before this line runs: an
  applier refusal surfaces on `PostToolUseFailure` → `deniedLine` → `turnEvent`'s `denied` branch, so
  the log already shows `refused: mcp__discovery__record_decision — …`. Check that reads legibly on the
  running page; if it does not, this status line is the only place the person learns why the turn did
  not close.
- **GOTCHA**: Do not fork the SSE parser — extract, do not copy. Two parsers drift.
- **VALIDATE**: Task 26's smoke.
- **SATISFIES**: AC #1, AC #2, AC #3.

### Task 18 · UPDATE `renderDiscoverySession` and `renderPackageView`

- **IMPLEMENT**: (a) enable/disable the three new controls from the same `answerable` value
  `#discovery-submit` reads, and hide the off-script row on an audit (`entryMode === 'existing-prd'`);
  (b) in `renderPackageView`'s Decisions block, an off-script row already prints `off_script` — add
  the reciprocal note that it neither supersedes nor is superseded, so the drawer states the rule
  Phase 1 implements; (c) in the Open questions block, print `source` (already rendered) and make the
  banked/off-script distinction legible.
- **PATTERN**: `renderDiscoverySession` at `:975-1020`; `renderPackageView` at `:1063-1120`.
- **GOTCHA**: `renderPackageView`'s whole contract is that **every number, marker and flag is READ from
  `session.ledger`** — do not compute anything new in the browser. If the drawer needs a fact the view
  does not carry, widen `ledgerView` (Phase 1) instead.
- **VALIDATE**: Task 26's smoke.
- **SATISFIES**: AC #4.

---

### Task 19 · ADD group 29 cases — the supersede correction, driven to red first

- **IMPLEMENT**: Beside the existing `dec`/`weak`/`openq`/`ev` fixtures:
  - `29.x` an off-script decision on a banked question records `supersedes: null` **and** the banked
    decision it follows keeps `latest: true` in `ledgerView`;
  - a later **banked** decision on that question supersedes the earlier **banked** one, skipping the
    off-script record — the `findLast` half;
  - **the re-ask sequence**, which is correct by accident until pinned: `flag_weak_answer` on `q1` →
    off-script decision on `q1` → banked decision on `q1`'s second ask. At `HEAD` the third record files
    `supersedes: 2`, naming the aside (observed); after the fix it files `null`;
  - an off-script decision with `question_id: null` is unchanged;
  - the **mutation control**: with the `!p.off_script` guard removed the first case fails, so the case
    can go red ([[check-that-cannot-fail]] — mutate the source, run the function, don't grep it);
  - `ledgerView`'s `supersededBy` map agrees with every record's own `supersedes` over the fixture.
- **PATTERN**: group 29's positive-control-first discipline and the `same()` helper.
- **GOTCHA**: **Every #338 defect survived a green gate the same way: the check skipped the thing it
  tested.** Assert the *values*, not the shape.
- **IMPLEMENT (addition)**: An `ANSWERS_OS` fixture carrying kinds and intents (`a1` banked, `a2` off-script/aside, `a3` off-script/look-up, `a4` document), then: **the kind gate** — three refusals each matched on its message naming the ref and "off-script", with four positive controls (the same ops on `a1` still close, on `a4` still close, an entry with no `kind` key at all is inert, and an off-script decision on `a2` is accepted); **settle-once** — a decision then an open question on `a2` throws naming seq 1, the mirror order throws too, a SECOND off-script decision on `a2` is accepted, and a `record_decision` on `a4` followed by an `open_question` on `a4` across two turns is ACCEPTED (the #286 audit pair); **the closer guard, both ways** — with `a2` unfiled a banked closer throws naming `a2`, and after the filing lands the SAME closer is accepted; url-only `file_evidence` does not discharge it; an `intent: "look-up"` answer never triggers it, filed or not; **the detector** — `auditExchanges` reports `{unfiled: ['a2'], lookups: ['a3']}` before the filing and `unfiled: []` after.
- **GOTCHA**: The acceptance halves are not decoration. "The same closer is accepted once the filing lands" is what proves the NO-DEADLOCK property, and it is the half that goes red under the mutation that gates every op rather than only closers. Every case gets a mutation control ([[check-that-cannot-fail]]).
- **GOTCHA**: The look-up control is the case that stops a later editor collapsing the two intents. It must assert the banked closer is accepted after a look-up that filed **nothing at all**, which is `LOOK_IT_UP_RULE`'s own "found nothing usable" branch.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep applier`
- **SATISFIES**: AC #3, AC #4.

### Task 20 · ADD group 29 cases — `auditTraceability`

- **IMPLEMENT**: Over synthetic applier-produced records: a fully rooted chain
  (business → stakeholder → solution → transition) reads `unrooted: []`; a solution whose stakeholder
  parent is itself an orphan reads that solution in `unrooted` **while neither record carries a second
  flag**; `unbacked` equals the set carrying `no-evidence`; `byLevel` is keyed by every entry of
  `LEVELS` even where a rung holds nothing; `parenting` is byte-equal to `auditParenting(ops)` on the
  same input; junk (a non-array, a null item, a record with no params) returns the empty shape rather
  than throwing; a hand-made cyclic `parent_id` terminates.
- **PATTERN**: the `auditParenting` cases at `tooling/build-checks.mjs:8140-8161` (group 32's synthetic
  proof-of-detection before the fixture is trusted) — mirror that discipline: **prove it detects**
  before you trust it over a package.
- **GOTCHA**: The "orphan flagged exactly as no-evidence" half of AC #6 is a **comparison over the two
  existing flags**, not new machinery: assert both appear in `FLAGS`, both are counted by `ledgerView`
  over the whole ledger, and both render in `prd.md` (Task 23).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep applier`
- **SATISFIES**: AC #6.

### Task 21 · ADD group 30 cases — the byte-identity proofs and the new stamp

- **IMPLEMENT**: From case **30.43**:
  - **30.43** For all four postures: `build(FINGERPRINT_INPUTS)` is byte-equal to
    `build({ ...FINGERPRINT_INPUTS, park: false, affordance: null })`, on both `systemPrompt` and
    `prompt`. The failure message names the builder.
  - **30.44** Two claims, and only one of them is "nothing moved". `POSTURES.think.fingerprint` and
    `POSTURES['think-opus'].fingerprint` are pinned to **literal hex strings** — a live re-derivation
    (`POSTURES.x.fingerprint === fingerprintOf(POSTURES.x)`) is a tautology over the current tree and
    cannot detect the move it exists to detect. `POSTURES['create-prd'].fingerprint` and
    `POSTURES.grill.fingerprint` are pinned to their **new** literals, with the case's message stating
    that they moved deliberately for `DOMAIN_RULE` and that no committed package runs either posture.
    `FINGERPRINT_INPUTS_FOR` still holds **only** `grill`.
  - **30.45** Every `POSTURES` entry still carries **exactly five keys** (case 11's rule, restated
    because this ticket is the one that would have added a sixth).
  - **30.46** `TOOL_DESCRIPTIONS` is still keyed exactly `OPS` — no `WebSearch` entry (34.13's rule).
  - **30.47** `AFFORDANCE_FINGERPRINT` is keyed by exactly `Object.keys(POSTURES)`; every value is a
    32-hex md5, reproduces deterministically, **moves** on one trailing space added to the shared
    affordance body, and **differs** from that posture's own stamp. `think` and `create-prd` entries
    **differ from each other**, which is the case that proves the map is not one hash wearing four keys.
  - **30.48** The four new rule constants are pinned **verbatim** (case 16's idiom) and each is
    asserted to appear in the built affordance/park prompt and to be **absent** from every
    non-affordance, non-park build.
  - **30.49** `ledgerBrief(FINGERPRINT_INPUTS.ledger)` contains no evidence line; a ledger with one
    `file_evidence` record produces one naming its seq, provenance and url.
  - **30.50** The refusal battery on the builders: `park && affordance`, an unknown `affordance`,
    `affordance` with `entryMode: 'existing-prd'` — each named in the message.
- **PATTERN**: group 30's existing cases 16, 19, 30; `names(fn, ...needles)` for refusals.
- **GOTCHA**: 30.43 is the case that makes the whole design safe. Write it **first** and watch it go
  red by deliberately adding a space to a builder, then remove the space.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep session`
- **SATISFIES**: every AC's precondition; AC #5 partly (30.46).

### Task 22 · ADD group 30 cases — the guards, the fence widening, the constants

- **IMPLEMENT**:
  - **30.51** `assertAffordance` / `assertParkable` driven in **both** directions over every refusal
    branch (closed session, `cursor.done`, `existing-prd`, unknown intent) plus the accepting control.
  - **30.52** **`READ_TOOLS`' key set is still exactly `Read · Grep · Glob`** — `WebSearch` and
    `WebFetch` are **not** in it, so #287's path allow-list is untouched. Assert both directions:
    `FETCH_TOOLS` ∩ `Object.keys(READ_TOOLS)` is empty, and neither fetch tool is decided by
    `allowsPath`.
  - **30.53** `fenceDecision(allowSet, 'WebSearch', {}, [])` **denies** (a banked turn) and
    `fenceDecision(allowSet, 'WebSearch', {}, FETCH_TOOLS)` **allows** (an affordance turn) — the two
    readings that make "per-call widening" a fact rather than a claim. `Write`, `Edit` and `Bash` stay
    denied even with `extraTools: FETCH_TOOLS`.
  - **30.54** `allowsToolName` is **unwidened**: it still answers true for exactly the four op tool
    names (case 14's statement stays true).
  - **30.55** `turnEvent` projects `offScript` and `source` and still projects **no** prose
    (`wrong_if`, `missing`, `reason` absent) — the whitelist re-pinned by key set.
  - **30.56** Source pins on the transport, read as TEXT (CI has no `portal/node_modules`):
    `AFFORDANCE_MAX_TURNS` present with a value > `MAX_TURNS`; `MAX_TURNS` still `6`; the affordance
    branch names `FETCH_TOOLS` for **all three** of `tools`, `mainTools` and `extraTools`; the ONE
    `fence` object still handed to both call sites from the same variable; `strictMcpConfig` still
    inside the query's own block.
  - **30.57** Source pin on the route: `/api/discovery/turn` names `body.kind`, `body.intent` and
    `body.park` individually and **never** spreads the body.
- **PATTERN**: group 34's decommented-source route pins (`tooling/build-checks.mjs:9280-9320`) — *"read
  DECOMMENTED so prose cannot stand in for a guard"*, and every source pin carries a mutation that
  proves the pin can match.
- **GOTCHA**: A source pin that would pass against the **comment** rather than the code is the check
  that cannot fail. Decomment before matching, and include the mutation control.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep session`
- **SATISFIES**: AC #4, AC #5.

### Task 23 · ADD group 31 cases — the projection over an off-script ledger

- **IMPLEMENT**: Over a synthetic package holding a banked decision on `q1`, an off-script decision
  naming `q1`, an off-script `open_question`, and a `secondary-source` evidence row:
  - both decisions appear in `visible` and **both render** (the banked one is not dimmed, the
    off-script one is its own row);
  - the off-script `open_question` renders in **Open questions** beside a banked parked one, and the
    section's `from` already declares both (`SECTIONS`' `open-questions` row);
  - `renderHierarchy`'s counts and the `orphans N` line agree with `auditTraceability`'s
    `parenting.missed` + `structural` — **one number, two readers**;
  - the `secondary-source` row renders in **Evidence** with its URL;
  - the injection battery's existing census still classifies every string field (a new field would
    otherwise slip through unclassified).
- **PATTERN**: group 31's section-home iteration (31.2 iterates the verbs against `SECTIONS`).
- **GOTCHA**: Every committed `prd.md` must stay byte-identical. Assert it in the same case, not only
  in Task 3's ad-hoc check.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "projection|prd"`
- **SATISFIES**: AC #4, AC #6.

### Task 24 · ADD group 32 case — the two recorded stamps, unmoved

- **IMPLEMENT**: A case asserting `POSTURES.think.fingerprint` and `POSTURES['think-opus'].fingerprint`
  each equal the **literal hex string** the fixtures carry, read from
  `discovery/instrument-loans-1/run.json`'s `turnStats[0].postureFingerprint` and
  `discovery/graded-opus-a/run.json`'s — so a future edit that moves a stamp fails here naming **which
  recording** goes stale and what it costs to re-record.
- **PATTERN**: 32.2a's freshness tripwire and its message, which already names the re-record procedure.
- **GOTCHA**: This is belt over 32.2a and 33.15, not a replacement: those compare fixture-to-current;
  this pins current-to-literal so the diff is visible in the source, where a reviewer sees it.
- **IMPLEMENT (addition)**: Over every `discovery/*/run.json`, `auditExchanges(pkg.answers, pkg.ops)` reads the empty shape, and the whole package re-folds clean through `applyOps` under the new refusals (verified at planning time: 30 · 12 · 15 · 100 · 79 · 15 · 3 ops, all seven green).
- **GOTCHA**: **Label it as what it is.** All seven packages hold 199 answer lines, every one `kind: "banked"`, and zero off-script ops — so the sweep is vacuous today. It is a REGRESSION GUARD, not proof the detector works; the proof is Task 19's synthetic red/green pair. Declare the COUNT ITSELF in the ✓ line, not the constant's name, so the vacuity moves visibly the day the first off-script package lands so the vacuity is a number that moves in both directions, or this is the exact shape [[check-that-cannot-fail]] names.
- **GOTCHA**: `tooling/discovery-score.mjs` scores one closing op **per turn** and `assertAnswersSealed`
  compares the stored answers to the sealed key byte for byte, so a package carrying off-script answer
  lines would not score. It only ever runs over the two graded whole-bank fixtures, which hold none —
  true today and worth stating, because Task 24's sweep leans on that scorer's vocabulary.
- **GOTCHA**: The sweep observes committed FICTIONAL exhibits only. A real-provenance run lives under `JOBS_DIR` and is never committed (R1), so no CI group ever sees one. State that in the message.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "parenting|graded"`
- **SATISFIES**: the no-re-record non-goal.

---

### Task 25 · UPDATE the docs

- **IMPLEMENT**: (a) `discovery/README.md` — §Workflow gains the three controls; §File shapes gains the
  off-script answer example; §The op grammar gains the affordance table (which control → which verb →
  closes?); §Supersede carries Task 5's correction. (b) `CLAUDE.md`'s architecture-map `discovery/`
  line and the **New discovery op verb or run** bullet — the affordances file through the existing
  verbs and add none, and off-script/park are drawer controls, never a file anyone types.
- **PATTERN**: CLAUDE.md §Ground rules — the map is an INDEX; do not restate an invariant that lives
  in a file header.
- **GOTCHA**: Keep the map line to what the file **is**. The rules belong in
  `discovery/ops.mjs`'s and `discovery-postures.mjs`'s headers.
- **VALIDATE**: `node tooling/drift-check.mjs`
- **SATISFIES**: AC #3, AC #4.

### Task 26 · VALIDATE the whole surface

- **IMPLEMENT**: Run the gate stack and a portal smoke.
- **GOTCHA**: **Port-scoped kill only.** Never `pkill -f 'node server.mjs'` — it kills sibling
  sessions' recorders ([[portal-smoke-port-scoped-kill]]). Expect stale portals on nearby ports.
- **GOTCHA**: This is a portal + `discovery/` + gate change. It renders **no shipped page**, so the
  visual-regression baselines are untouched — but confirm `git status` shows no `tooling/visual-regression/**` churn before committing.
- **VALIDATE**:
  ```
  node tooling/build-checks.mjs
  node tooling/drift-check.mjs
  node --check portal/server.mjs && node --check portal/public/portal.js
  cd portal && node lib/discovery-transport.mjs --preflight
  cd portal && PORT=4757 node server.mjs & sleep 2; curl -s localhost:4757/api/health; curl -s localhost:4757/api/discovery/config | head -c 200; kill %1
  ```
- **SATISFIES**: all ACs' validation half.

### Task 27 · RUN the one paid probe — `--probe-affordance` (OPERATOR STEP)

- **IMPLEMENT**: A fourth probe in `portal/lib/discovery-transport.mjs`, mirroring `probeFence`'s
  shape (temp root, nonce, counters wrapping both sites from the outside, roots deleted on exit), that
  runs **one** affordance turn asking the agent to look up a named public fact and file it, over a
  synthetic package. It observes the three things no CI group can reach:
  1. Does `WebSearch` **execute** under subscription auth with `tools: [...FETCH_TOOLS]`?
  2. Does the fence still **deny** `Bash` / `Write` on the same turn (the widening is by name, not a hole)?
  3. Does the agent file a `file_evidence` row with a URL and `secondary-source`, and **not** close the turn?
- **PATTERN**: `probeFence` at `:541-660`; its header states the cost and that nothing imports it.
- **GOTCHA**: **PAID.** Budget ~$0.05–0.20 for one turn (run 0: median $0.055/turn, and this turn
  makes more tool calls). Run `--preflight` first. The owner's Console spend limit is the constraint
  ([[api-usage-limit-until-2026-10-01]]).
- **GOTCHA**: The probe writes to a temp root and **never** to `discovery/<slug>/`. Nothing it produces
  is committed as a run.
- **GOTCHA**: Record the observation in the ticket's report as **observed**, with the counts. If
  `WebSearch` does not execute under subscription auth, that is a finding, not a failure — AC #1's
  mechanism half becomes "the prompt and the fence are wired; execution unobserved", stated plainly.
- **VALIDATE**: `cd portal && node lib/discovery-transport.mjs --probe-affordance`
- **SATISFIES**: AC #1 (the run-time half), AC #5 (the run-time half).

---

## TESTING STRATEGY

This repo has **no test suite, no linter and no type-checker** (CLAUDE.md §Testing). "Done" means the
gates ran. Do not hunt for or invent a suite.

### Unit Tests

`tooling/build-checks.mjs` **is** the unit layer: pure groups, in CI, no SDK, no `portal/node_modules`.
Every new assertion goes into groups 29, 30, 31 and 32 — never into a new group, because the group
count is asserted in the verdict line (`all 34 groups pass`).

Discipline, from [[check-that-cannot-fail]]: **every #338 defect survived a green gate the same way —
the check skipped the thing it tested.** For each new case, mutate the source, run the function, and
watch the case go red before you trust it green. Tasks 19 and 21 name their mutation controls
explicitly; do the same for the rest.

### Integration Tests

- `--preflight` (zero tokens): the real op server built from the real `TOOL_SCHEMA`, `tools/list` and
  `tools/call` driven in-process.
- The portal smoke (Task 26): boots, `/api/health` answers, `/api/discovery/config` serves the bank.
- The manual drawer walk (Task 26): open a fictional session, park a question, look something up, ask
  something else, and read the package view.

### Edge Cases

- An off-script turn while the banked turn is already closed → the cursor has moved; the exchange
  attaches to the **next** open turn. Assert `assertTurnWritable` still passes.
- An off-script turn on the **first** question, before any answer exists → the ledger brief is empty
  and `parentCandidates` is `[]`; the agent must file `parent_id: null`, which flags `orphan` honestly.
- A look-up turn that files **nothing** (nothing usable found) → legal; the status line says so.
- An aside turn that files nothing → **a prompt failure**, visible in the status line, not an applier
  refusal. Named as the enforcement gap in Task 17.
- Two off-script turns on one banked turn → both legal, both attach, cursor unmoved.
- A park on the second ask of a held question → `deriveCursor`'s `asks < 2` rule already settles it;
  the park closes and the cursor moves.
- Four parks in a row → `runMetrics.notAForm.longest` is 4 and `tripped` is true against
  `NOT_A_FORM_MAX = 3`. **Asserted against #285's counter, never re-implemented.**
- An off-script decision naming a question the bank does not hold → the applier's existing throw 3.
- `park: true` with an empty answer → `appendAnswer`'s existing non-empty guard.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```
node --check portal/server.mjs
node --check portal/lib/discovery.mjs
node --check portal/lib/discovery-postures.mjs
node --check portal/lib/discovery-transport.mjs
node --check discovery/ops.mjs
node --check discovery/prd-projection.mjs
node --check portal/public/portal.js
```

(CI's `verify` job runs `node --check` over **every** tracked `.mjs`, including `.claude/plans` —
[[drift-check-syntax-checks-parked-mjs]]. Park any fragment as `.txt`.)

### Level 2: Unit Tests

```
node tooling/build-checks.mjs           # must print: build ✓  all 34 groups pass
node tooling/drift-check.mjs            # all twelve checks green
```

### Level 3: Integration Tests

```
cd portal && node lib/discovery-transport.mjs --preflight
cd portal && PORT=4757 node server.mjs &   # then curl /api/health and /api/discovery/config; kill by PID
for d in discovery/*/; do [ -f "$d/prd.md" ] && node discovery/prd-projection.mjs --root "$d" --stdout | diff -q - "$d/prd.md"; done
```

### Level 4: Manual Validation

1. `cd portal && npm start` → `http://localhost:4747`, open the discovery drawer.
2. Open a **fictional** session (`slug: affordance-check-289`, `scope-check`, Think) — then **delete
   the package directory afterwards**: it is a mechanism check, not a run, and nothing hand-driven is
   committed as evidence.
3. Press **Park it** with a reason → confirm `open_question` / `source: banked` in the package view,
   the cursor advanced, and the not-a-form streak read 1.
4. Press **Look it up** with "is Confirmation of Payee a real UK scheme?" → confirm URLs in the log,
   `file_evidence` rows with `secondary-source`, the turn **not** closed, and the same question still
   on the table.
5. Press **Ask something else** with a statement that ends in a choice → confirm a `record_decision`
   with `off_script: true` and a `wrong_if`, the turn not closed, the cursor unmoved, and the banked
   decision on that question (if any) **still marked latest**.
6. Confirm the status line names what was filed in each case.

### Level 5: Additional Validation (Optional)

```
cd portal && node lib/discovery-transport.mjs --probe-affordance   # PAID, ~$0.05–0.20 — Task 27
cd portal && node lib/discovery-transport.mjs --probe-fence        # PAID, ~$0.2–0.5 — only if the fence wiring is doubted
```

---

## ACCEPTANCE CRITERIA

Verbatim from the ticket, each mapped to the tasks that satisfy it.

- [ ] **AC1** A look-it-up turn produces `file_evidence` rows with URLs and `provenance: secondary-source`,
      and does **not** close the turn — the person's own answer still does.
      *(Tasks 6, 7, 10, 12, 13, 17, 21, 22, 27)*
- [ ] **AC2** Parking records `open_question` with `source: banked` and a reason, advances the cursor,
      and increments the not-a-form counter (**asserted against #285's counter, not re-implemented**).
      *(Tasks 6, 7, 11, 12, 17, 21)*
- [ ] **AC3** An off-script exchange the person declared as an **aside** files exactly one of the two off-script ops — a `record_decision` with `off_script: true` or an `open_question` with `source: "off-script"` — and the applier refuses to close the turn while one has none. Asserted both ways (unfiled refuses the closer by name, filed accepts the same closer), including with `question_id: null`, and with the look-up control proving MVP 7's evidence-only and file-nothing branches are never gated. A look-up exchange is **not** in scope: `LOOK_IT_UP_RULE` makes filing nothing its correct outcome. *(Tasks 1a, 4a, 4b, 6, 7, 12, 14, 17, 19, 23, 24)*
- [ ] **AC4** Off-script ops never close a turn and never advance the cursor — asserted, because keying
      the rule on `question_id` would refuse the whole path. *(Tasks 1–3, 12, 19, 23)*
- [ ] **AC5** `WebSearch` / `WebFetch` remain outside the path allow-list (#287's assertion holds after
      this ticket). *(Tasks 10, 13, 22)*
- [ ] **AC6** The traceability rule is checkable over a package: every solution-level decision names the
      stakeholder requirement it serves, every stakeholder requirement names its business requirement,
      and an orphan at any level is **flagged** exactly as a decision with no evidence link is.
      *(Tasks 4, 20, 23)*
- [ ] All validation commands pass with zero errors; `build ✓ all 34 groups pass`.
- [ ] No committed run package byte changes; every `prd.md` re-projects identically.
- [ ] `POSTURES.think.fingerprint` and `POSTURES['think-opus'].fingerprint` are **unmoved** (pinned to
      literals); `create-prd` and `grill` moved **deliberately** for `DOMAIN_RULE`, and no committed
      package runs either posture. **No fixture is re-recorded.**
- [ ] Code follows project conventions (vanilla, zero-dep, hand-validated boundaries, no schema library).
- [ ] `discovery/README.md` and `CLAUDE.md` carry the format change.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] `node tooling/build-checks.mjs` green · `node tooling/drift-check.mjs` green
- [ ] Portal boots and `/api/health` answers on a private port
- [ ] Manual drawer walk done for all three affordances, and the check package deleted
- [ ] The paid probe run and its numbers recorded as **observed** (or its absence stated)
- [ ] Acceptance criteria all met, or the gap named explicitly in the report
- [ ] Plan, report and review in the same PR; PR body carries `Closes #289`

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes** (each would change the plan if wrong):

- **A1** Think's system prompt must not move, because seven recordings carry its stamp and two of them
  are 65 turns. If the owner is willing to spend the re-record, the design simplifies considerably —
  the rules move into `systemFor` and `AFFORDANCE_FINGERPRINT` disappears. **Proceeding on A1.**
- **A2** The off-script answer line carries `question_id: null` (per `discovery/README.md:227`'s own
  example) and ties to context through the shared open turn id, not through the question id.
- **A3** `AFFORDANCE_MAX_TURNS = 12` (ten tool calls). Derived from run 0's F10 arithmetic
  (`numTurns` = tool calls + 1), not measured. Task 27's probe is the first observation.
- **A4** Two controls beat one classifier: the person says whether they are looking something up or
  saying something else, so AC1 and AC3 pin separately. A single "ask" box asking the agent to infer
  intent would make both ACs unpinnable.
- **A5** Off-script and park are refused in an `existing-prd` audit. `RE_ASKS` is the precedent.

**Q1 — Think's system prompt and `DOMAIN_RULE`.** `DOMAIN_RULE` lands in Create-PRD's and Grill's
system prompts (Task 6) and moves those two stamps, which costs nothing because no committed package
runs them. It reaches **Think** only through the affordance turn prompt, so a Think *banked* turn is
never told the rule — closing that means re-recording `instrument-loans-1`, `graded-think-a` and
`graded-opus-a`. That is the same gap `JUDGEMENT_RULE` (#338 F9) and `reaskBrief` (#366) already
carry, and it is carried the same way. **Recommendation: file the re-record ticket, do not fold it
here.** Flag at the point of impact rather than blocking.

**Q2 — should the supersede correction be its own ticket?** It is an applier switch edit and therefore
takes the epic's op-verb lock. It is here because #289 is the ticket that makes the path reachable and
because no committed package changes. If the lock is contended, split Phase 1 out and land it first;
Phases 2–4 do not depend on it.

**Q3 — is a look-it-up turn allowed to file evidence naming a `claim_ref`?** Not yet: no decision
exists at look-up time, so `claim_ref` is null and the *later* banked decision names the evidence seq
through `evidence_refs`. Stated in `LOOK_IT_UP_RULE`. If a run shows the agent wanting the reverse
link, that is a `PARAMS` question and a different ticket.

**Q4 — F11's number.** Run 0 left 23 of 30 decisions unbacked and named that as the number the
evidence route should be measured against. **This ticket ships the route, not the measurement**: no
run happens here, so nothing moves that number. The first run after this ticket is where it is read.
Say so in the report rather than implying the route improved it.

---

## NOTES (open canvas)

### The observed supersede defect

Confirmed by execution against `discovery/ops.mjs` at `HEAD`, not inferred:

```
$ node -e "…applyOps([banked q1, off-script q1])…"
[{seq:1, closes:true,  supersedes:null, off:false},
 {seq:2, closes:false, supersedes:1,    off:true }]
view: [{seq:1, latest:false, supersededBy:2}, {seq:2, latest:true}]
```

So an off-script decision naming a banked question replaces the person's banked decision: it dims in
the drawer's package view and drops out of `prd.md`'s `visible` set. `prd-projection.mjs:419-426`
documents this as intentional; `discovery/README.md:345-346` states the opposite premise on the
assumption that an off-script decision names no question. Architecture §Data model says naming the
question is *"the normal case (it is usually why the person went off-script)"* — so the assumption is
the wrong half, and the fix is the one Phase 1 makes.

**Nothing on disk changes.** `grep off_script.*true discovery/*/transcript.jsonl` finds none across all
seven committed packages, and the two `open_question` sources on disk are 75 × `banked`, 0 ×
`off-script`. That is why this correction is cheap **now** and expensive after the first run that
exercises the path.

### Why every new string rides the turn prompt

Three constraints point the same way, and only the third is obvious:

1. **Cost.** Seven recordings carry `POSTURES.think.fingerprint`; two are 65 turns. Moving it makes
   groups 32 and 33 red until they are re-recorded, at roughly $6–7 and — worse — at the cost of
   #348's sealed-key protocol, whose blind authoring cannot be repeated.
2. **The cache.** The system prompt is byte-stable across a session *so its cache holds*: run 0's cache
   read grew 3.8k → 125k over thirty turns. A different system prompt on one mid-session turn is a
   cache-creation event every time it fires.
3. **Truth.** A Think banked turn's prompt genuinely does not change. Saying so with an unmoved stamp
   is the honest record; moving it for text a banked turn never sees would make seven recordings stale
   for a change they did not experience.

The one exception is `DOMAIN_RULE` in Create-PRD's and Grill's **system** prompts, which does move
those two stamps — and there constraint 1 does not apply, because nothing on disk was recorded under
either posture. Constraint 3 points the same way: their banked prompts genuinely *do* change.

The honesty gap that leaves — no posture stamp covers the affordance text — closes with
`AFFORDANCE_FINGERPRINT`, its own stamp over its own frozen inputs, recorded beside
`postureFingerprint` on the turns that used it.

### What AC3 enforces, and where it stops

The first draft of this plan conceded that the applier could not enforce AC3. That was true of an applier that reads only `ref` off `ctx.answers`. It is not true once the person's declared intent is recorded on the answer line, because the applier then holds the two facts the rule needs: which answer an op rests on, and whether that answer was an aside.

Four rules follow, all in `discovery/ops.mjs`, none of them a verb. A closing op may not rest on an off-script answer, and a decision or open question naming one must carry the off-script form — that is the wrong-kind case, and it is a live defect fix as well as a check: at `HEAD` a `flag_weak_answer` naming an off-script ref records `closes: true` and settles the banked question with the person's aside. One off-script answer may not carry both a decision and an open question — that is the contradictory-pair case, keyed on `kind` so the #286 audit path, where every op names the one document line, is untouched. And a closing op is refused while an `intent: "aside"` answer on this turn has no filing — that is the zero case, the one the concession was about.

Nothing deadlocks, and the reason is structural: the compliant filing does not close, so the guard never sees it. Nothing is server-written either — the applier writes nothing, it REFUSES, and the refusal reaches the agent as an `isError` result it corrects in its own words, with the person's verbatim text in front of it through `pendingBrief`. The guard is on ADVANCING, never on LEAVING: `closeSession` is deliberately not gated, so a stubborn agent can stall a turn but can never make a package unfinishable, which is what keeps MVP 8's "blocking is not available" true.

What remains outside the applier is the tail — an exchange after which no turn is ever closed, because the person finished or walked away. There is no later op to refuse, so it is recorded instead: `auditExchanges` names it in the drawer live and `prd.md` names it permanently. And what no layer reaches is substance: whether the form the agent chose was the right one for what the person actually said. MVP 6 forbids the applier from judging that, and it stays #348's graded fixture or a human read.

### House precedent — the design is not new, only newly applied

A precedent sweep over every place this repo already faces "a real agent run was supposed to produce X
and produced nothing" settles three questions the design would otherwise have to guess at.

**There is no bounded retry inside a run, anywhere in this repo, and that is deliberate.** The house
correction mechanism is an `isError` tool result the model acts on in the same turn — stated as an
invariant in `portal/lib/discovery-transport.mjs:17-18`: *"A REFUSAL IS AN `isError` RESULT, NEVER A
THROW. The agent receives the applier's message verbatim and corrects inside the same turn. Throw only
for a bug in this file."* The closer guard is exactly that shape one rule further in, which is why the
retry alternative is rejected below rather than merely costed. The only bounds that exist sit outside
a run: one re-invocation for a malformed reply (`portal/record-graded-answers.mjs:298-306`), the one
re-ask in `deriveCursor`, and the operator's three paid attempts, which are prose and never code.

**"The artefact states its own gaps" is the most systematically gated pattern in the repo**, which is
what puts Task 4b on solid ground. Every `SECTIONS` row declares its own `empty` string, build-checks
asserts all eleven are non-empty and DISTINCT (`tooling/build-checks.mjs:7698,7703`), and 31.7.1
deletes each rung in turn and proves each section falls back to its own. `renderEvidence`'s "Decisions
resting on no evidence" line is appended whether or not the table rendered, and the row's `why` carves
that exception in writing. `TRANSITION_NA` goes furthest — an explicit **n/a** that names what was not
elicited and tells the reader what to do about it. An unfiled exchange named on the page is that idiom,
not a new one.

**Discard-and-re-run is the standing correction**, written in five places across `CLAUDE.md` and
`discovery/README.md`. The in-code half is never enforcement: it is making the failed state loud
(`dropShipped` leaves the raw trace where the drift gate goes red on it) and printing the instruction
at the point of failure.

**And the failure this ticket enforces against is already measured.** `tooling/discovery-score.mjs`
carries two columns for it — `no_close_filed` ("the turn filed ops but none of them closed it") and
`no_close_silent` ("the turn filed nothing at all") — with no target set, reported rather than gated.
The observed rate is **0 of 199** — every `turnStats` entry across all seven committed packages filed
at least one op, and none closed nothing (observed). Across the two graded whole-bank packages alone it
is 0 of 130. So the compliance risk the closer guard carries is
small and evidenced, not assumed — and the scorer already holds the column that would show it moving.

### What no layer reaches

Three things survive every layer. The first is substance: whether the form the agent chose is the right one for what the person said. An open_question filed on an exchange where the person plainly chose, or a record_decision whose wrong_if they never implied, both pass every rule here — the applier counts references and reads server-written fields, it never reads the text, and MVP 6 is the reason it must not. There is also a pressure gradient worth naming rather than hiding: the cheaper op to author is the open question (one prose field, no level, no parent, no wrong_if), so the closer guard pushes marginally toward parking an exchange that was actually a decision. Only #348's graded-fixture protocol or a human read reaches that, and it is stated here rather than left for a reviewer to find: the guard buys the zero case at the price of a mild incentive to park. The second is the tail: an exchange after which no turn is ever closed, because the person clicked Finish or walked away. Layer 3 has no trigger there, and gating Finish would make a package with a non-compliant agent permanently unfinishable, which MVP 8 forbids — so the tail is recorded and named in the drawer and in prd.md, never refused. That is a genuinely weaker guarantee than the other three, and it is the one place the honest word is "detected", not "enforced". The third is a hand-edited package: checkOpLines deliberately does not re-fold, so a valid-shaped op line pasted in by hand still projects, exactly the limit group 32 already states about itself. Git history and the honesty contract are the only guards there, as they already are for a valid-to-valid param edit. And one run-time fact no CI group can reach: whether a live agent complies rather than stalling. The record can never hold an unfiled aside past a closer, but a stubborn agent can leave a turn unclosed, and the only observation of that is Phase 7's paid probe.

### Alternatives weighed and rejected

| Option | Why rejected |
|---|---|
| A fifth op verb (`park`, `off_script_note`) | The architecture explicitly forbids it: *"MVP 8's parked question and MVP 9's off-script filing are **not** their own ops."* Fewer verbs, same coverage, one place to change. |
| The **server** files the park op (no agent turn, free, deterministic) | An op line does not record who filed it, so a server-written op would be indistinguishable from an agent's in `transcript.jsonl` — the honesty contract's mirror problem. Also no `text` line and no `turnStats` entry. ~$0.05 is the right price for that. |
| One "ask anything" box, agent infers intent | Makes AC1 and AC3 unpinnable — a failed look-up and a failed aside would be the same event. Two controls cost one button. |
| Rules in `systemFor`, re-record the fixtures | ~$6–7 plus the loss of #348's sealed-key protocol, for text a banked turn never reads. |
| Widen `FINGERPRINT_INPUTS_FOR` for every posture | Same cost as above, arrived at sideways. |
| A sixth key on each `POSTURES` entry | Case 11's message forbids it by name. |
| `WebSearch`/`WebFetch` in `READ_TOOLS` | Would make AC5 false. A path rule cannot reach a URL; `extraTools` is the seam #359 already built. |
| Raise `MAX_TURNS` for every turn | A banked turn does not need ten calls, and a wider cap on every turn is a wider blast radius for a runaway agent inside one answer. Architecture §Boundaries sizes it per turn deliberately. |
| A bounded retry: a second `query()` re-prompting the agent that filed nothing | Three independent reasons, any one sufficient. **The record cannot express it:** `turnEvent`'s whitelist has exactly three line types — `text`, `op`, `denied` — and none can say "the server re-prompted here", so a retried op would be indistinguishable from an unprompted one, which the transport's own receipt principle forbids. **The prompt contract says stop:** `YIELD_CONTRACT` ends *"Then stop: no further tool call, no further question"*, so a retry re-prompts an agent that has just complied, and the op it files answers a prompt the turn's `postureFingerprint` does not name. **And the repo refuses the shape elsewhere in writing** — `discovery/README.md`: a bad proposal run is re-run *"never by a second run beside the first"*. **This repo also has no bounded retry inside a run at all,** The correction mechanism is an `isError` result the model acts on in the same turn (`discovery-transport.mjs:17-18`), and the closer guard is that mechanism applied one rule further in — same authorship position, no extra round-trip, no second paid `query()`, and reachable by CI where an SDK retry path is not. |
| A `Stop` hook that blocks the agent's stop until the aside is filed | It is a real SDK hook and it would fire at the right moment — but `tooling/build-checks.mjs` case 26 asserts `fenceHooks` registers **exactly** `PreToolUse` and `PostToolUseFailure`, so a third event is a gate edit, and the hook path is one no CI group can drive. The SDK session is resumed per turn (`resume: head.sessionId`), so an unfiled aside is still in the model's own context on the next turn. The closer guard plus `pendingBrief` therefore recovers it with essentially the same authorship position, at no extra round-trip, through a path the applier already owns. The hook would buy a marginally better moment on an SDK path no gate can reach and this repo has never observed. |
| `closeSession` refuses while an exchange is unfiled | It makes a package with a non-compliant agent permanently unfinishable — `endedAt` never set, and the proposals route gates on `endedAt` — with the person's only recourse being to keep buying turns. MVP 8 forbids it. The gate is on advancing, never on leaving, and the tail is named in `prd.md` instead. |

### The shape of a session after this ticket

```
turn t7  ─ the banked question is on the table
   ├─ off-script (look-up)   → file_evidence ×2 (secondary-source, URLs)   [does not close]
   ├─ off-script (aside)     → record_decision off_script:true + wrong_if  [does not close]
   └─ banked answer          → record_decision, evidence_refs [4,5]        [CLOSES → t8]

   or

   └─ park                   → open_question source:banked + reason        [CLOSES → t8, streak+1]
```

Three answer lines, one turn id, one closer. `deriveCursor` counts closers, so the cursor moves once.
`runMetrics` counts closers, so only the park touches the not-a-form counter. `turnStats` gains three
entries for `t7`; group 32 reads **distinct** turn ids, so the fixture assertion is unaffected.

### Traps that have bitten this repo and apply here

- [[check-that-cannot-fail]] — mutate the source, run the function, don't grep it. Every new gate case
  gets a mutation control.
- [[drift-check-syntax-checks-parked-mjs]] — CI `node --check`s every tracked `.mjs` including
  `.claude/plans`. Park fragments as `.txt`.
- [[portal-smoke-port-scoped-kill]] — PID/port kill only; never `pkill -f 'node server.mjs'`.
- [[shared-worktree-parallel-sessions]] — verify the branch immediately before committing; stage by
  explicit path.
- [[sdk-error-result-wears-success]] — a result can be `subtype: "success"` **and** `is_error: true`.
  If the probe writes a recorder-shaped path, check `is_error`.
- [[prs-dont-auto-close-tickets]] — `Closes #289` in the PR **body**, not the title.
- [[copy-never-indented]] — nothing the owner will paste goes in a blockquote.

### Confidence

**9.5/10** for one-pass success on Phases 1–6. The AC3 enforcement design was prototyped against a
scratch copy of `discovery/ops.mjs` at planning time and every load-bearing claim was driven rather
than argued: the closer guard refuses an unfiled aside and accepts the same closer once the filing
lands (**no deadlock**, because the compliant filing does not close and so never reaches the guard); a
look-up alone never gates; an aside on another turn never gates; a legacy answers fixture with no
`kind` key is inert; and all seven committed packages re-fold **byte-identical** (30 · 12 · 15 · 100 ·
79 · 15 · 3 ops). `POSTURES.think.fingerprint` reads `7efdde37441fbd2591ba4a7dfeecdb6b` and
`POSTURES['think-opus'].fingerprint` reads `cadb38117a2660c036d87e32323a8745` at `HEAD`; Task 21 pins
both literals. The design's one hard constraint (no stamp moves) is
proved by a single runnable assertion (Task 21, case 30.43) that the implementer runs before writing
anything else, and every other change lands on a seam that already exists and is already commented:
`appendAnswer`'s `off-script` kind, `runTurn`'s `kind` parameter, `fenceDecision`'s `extraTools`,
`READ_TOOLS`' own comment naming MVP 7. The residual half-point is Phase 7: whether `WebSearch`
executes under subscription auth with `tools: [...FETCH_TOOLS]` is unobserved, and it is a run-time
fact no CI group can reach.

---

## AMENDMENTS

<!-- Append-only. Newest at the bottom. -->

- 2026-09-09 — **AC3 stops being a concession.** The first draft said the applier could not enforce
  "an off-script exchange files something in every case" and settled for a prompt rule plus a drawer
  status line. The owner rejected that. Five independent designs were produced and each adversarially
  judged twice; three survived. The result is four applier refusals keyed on the answer an op names,
  made possible by one missing field — the person's declared `intent`, recorded on the off-script
  answer line rather than passed to the prompt and thrown away. Added: Task 1a (the three off-script
  refusals and the closer guard), Task 4a (`auditExchanges`), Task 4b (the unfiled exchange named in
  `prd.md`), `pendingBrief` in Tasks 6 and 7, the AC3 battery in Task 19 and the corpus sweep in
  Task 24. AC3 is restated to scope the demand to asides, because `LOOK_IT_UP_RULE` makes filing
  nothing a look-up's correct outcome and a rule keyed on `kind` alone would refuse MVP 7's happy path.
- 2026-09-09 — **F10's `numTurns` attribution corrected.** Run 0's report reads the +1 in "tool calls
  + 1" as the agent's closing message. The mechanism is otherwise: `num_turns` counts USER messages —
  the initial prompt plus one `tool_result` per main-session tool call — and the closing assistant
  message is never counted, nor are the CLI's warmup denials. Verified as
  `numTurns === 1 + ops + main-session (mcp__) denials` over **all 199 committed turns, zero
  exceptions**. F10's own turn 16 refutes its stated reason: five calls, `numTurns: 6`, no text line.
  The four-tool-call figure at `MAX_TURNS = 6` is unchanged; what changes is that a REFUSED op costs a
  slot too, and that raising the cap can never buy a turn after the agent has spoken — the SDK's loop
  ends on a no-tool assistant message. That last fact is why AC3 is enforced by refusing the next
  closer rather than by any in-turn recovery. *Re-scope: the correction belongs on #279 as an
  amendment to run 0's report.*
- 2026-09-09 — **A second live defect found while designing the above, reproduced at `HEAD`.** A
  closing op naming an off-script answer records `closes: true` — verified for `flag_weak_answer`, a
  banked `open_question` and a banked `record_decision`. So the moment #289 makes off-script answers
  reachable, an aside can consume the banked question's R2 slot, advance the cursor, and be printed in
  `prd.md` as the person's answer to a question they never answered. Task 1a fixes it. Invariant 4 was
  a parameter the agent asserted; it becomes a property of the server-written answer store.
