# Feature: Portal UI width — three ordered posture buttons, the facet vector, the package view, the differing-resume 409 (#288)

The following plan should be complete, but it is important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing exports and tables. Import from the right files — `discovery/bank.mjs`
holds the data and the three selectors, `discovery/ops.mjs` holds the op grammar and its pure reads,
`portal/lib/discovery.mjs` holds the session rules and the config payload, and `portal/lib/discovery-postures.mjs`
holds the prompts. Nothing in the browser holds a second copy of any of them.

## Feature Description

The discovery drawer at `portal/public/index.html` + `portal.js` already runs a full session: a slug, a
provenance, an entry mode, a depth, a posture, a document for an audit, one question at a time over SSE, the
recorded turns, the PRD download, the proposals and their verdicts. Four things are missing before it is the
thing a person would choose over the terminal:

1. **The three postures are a `<select>`, not three buttons pressable in order.** The PRD's MVP 1 names three
   buttons — Think · Create PRD · Grill — and the flow between them. Today the flow is invisible.
2. **The facet vector has no control.** `discovery/bank.mjs` shipped `FACETS`, `MODULES`, `PRESETS`,
   `facetPlan` and a facet-composing `selectDepth` in #283; `openSession` has taken `facets` since #285; the
   config route already serves `facets` and `presets`. The drawer sends none, so every session opens
   unfaceted and the bank's width is unreachable from the UI. `bank.mjs`'s own comment on `selectDepth` says
   it: *"#288 shows it, #285 refuses on it."*
3. **There is no package view.** The drawer shows the turns it recorded (`renderDiscoveryRecorded`) but not
   what the package now HOLDS — the decisions with their level and parent, the open questions, the evidence
   ledger with its provenance labels, and the `no-evidence` / `orphan` flags.
4. **A resume silently ignores a differing POST** (PR #365 review F6). Opening an existing slug with another
   depth or vector returns the disk state with no signal. Once #288 adds the facet checkboxes there are two
   more ways to produce that mismatch, so the 409 lands here.

## User Story

As the owner running a discovery session at a laptop
I want the three postures as ordered buttons, the five facts about my product as checkboxes with the four
presets, and a live view of what the package now holds
So that I can see which stance I am in, shape the bank to the product in front of me, and read the decisions,
open questions, evidence and flags as they accumulate — without opening a JSONL or a terminal.

## Problem Statement

The drawer can run a session but cannot show one. The posture is a dropdown that says nothing about the
Think → Create PRD → Grill order the PRD builds the epic around. The bank's five facet modules — 31 questions
of real width, built and gated in #283 — have no control, so the only session anyone can start from the UI is
the unfaceted thirty. And the run package, the artefact the whole epic exists to produce, is legible only as
a list of turns: a reader cannot answer "how many decisions have no evidence" or "which decisions are
orphans" without reading `transcript.jsonl` by hand.

## Solution Statement

Four changes, all reading from the config route or the session view so the browser holds no second copy of a
rule:

- **A · the three-button flow.** A `POSTURE_FLOW` table beside `ENTRY_POSTURES` in `portal/lib/discovery.mjs`,
  served on `/api/discovery/config`. Three ordered steps, each naming its posture(s); the drawer renders one
  button per step the entry mode admits, in that order, numbered. `think-opus` rides on the Think step as a
  variant checkbox (it is the same prompt on another model — the comparison, not a fourth stance).
- **B · the facet vector.** Five checkboxes labelled with `FACETS[i].question`, four preset buttons setting
  all five from `PRESETS[i].facets`, and an overflow message read from a **precomputed 32-row plan table**
  served on the config — never composed in the browser. The vector POSTs as `facets`, which `openSession`
  already takes and records.
- **C · the package view.** One new pure fold, `ledgerView(ops)`, exported from `discovery/ops.mjs` beside
  `parentCandidates` and `auditParenting`; `sessionView` carries its result as `ledger`; the drawer renders
  it. The fold is the gate's surface, so the view cannot show a claim the ops do not hold.
- **D · the 409.** One pure `resumeMismatch(head, posted)` exported from `portal/lib/discovery.mjs`; the
  session POST route calls it on `openSession`'s return and answers 409 naming the recorded depth and vector.

## Out of Scope / Non-Goals

- **Not included: the "ask something else" input (the escape hatch's surface).** The ticket body lists it;
  the owner's 2026-09-04 scoping comment on #288 omits it, and **#288's own acceptance criteria do not
  mention it** — there is no AC it satisfies. It has no route to POST to until #289 builds the off-script
  turn, so landing the input now would be a dead control. See **Q1** — if the owner wants it in #288, it is
  a one-phase addition (Phase 6) and the plan says how.
- **Not included: a mid-run posture switch.** `run.json` records ONE posture and `runTurn` resolves it from
  `head.posture`; `turnStats` stamps that posture's fingerprint on every turn, and groups 32/33 compare those
  stamps live. Three postures across one run would make a package's fingerprint history unreadable. "Pressable
  in order" is a FLOW ACROSS RUNS — Think, then Create PRD, then Grill (or Grill directly, on an existing PRD)
  — and the flow band says so.
- **Not included: an escape-hatch route, a park control, a look-it-up control.** All three are #289's.
- **Not changing: `discovery/bank.mjs`.** Every facet, module, preset and budget it holds is #283's and is
  read as-is. No new question, no new module, no budget change.
- **Not changing: `discovery/prd-projection.mjs`.** The package view is a SECOND reader of the same ops, not
  a re-cut of the PRD fold. `indexOps` stays private to the projection.
- **Not changing: the postures' prompts.** `portal/lib/discovery-postures.mjs` is untouched. A byte moved
  there re-stales the graded fixtures (groups 32/33) and is a different ticket.
- **No shipped-page changes.** No VR baseline regen, no footer site-index entry, no `param-manifest.json`
  entry, no `loc-summary` churn from `system/` — the portal is not a shipped page and `agent-layer/gen-loc-summary.mjs`
  does not count `portal/`. **Do not run the visual gate for this ticket.**
- **No new gate over the portal.** The 44×44 commitment is honoured by REVIEW, recorded in the PR report
  with the reason no gate covers it (architecture §Boundaries — the portal is not in #271's VR page set).

## Feature Metadata

**Feature Type**: Enhancement (the last width slice on an already-shipped drawer)
**Estimated Complexity**: Medium — high surface, low algorithmic risk; every rule already exists as a tested
pure function, and this ticket wires controls to them.
**Primary Systems Affected**: `portal/public/index.html` · `portal/public/portal.js` · `portal/public/portal.css` ·
`portal/lib/discovery.mjs` (three tables + one pure predicate + config payload + `sessionView`) ·
`portal/server.mjs` (the session POST's 409) · `discovery/ops.mjs` (one pure read) ·
`tooling/build-checks.mjs` (groups 29 and 30)
**Dependencies**: none new. Zero-dep Node ESM; the browser half is vanilla, no framework, no bundler.

## Related Work

**Implements**: [#288](https://github.com/linardsb/ux-factory/issues/288) · **Epic**:
[#279](https://github.com/linardsb/ux-factory/issues/279) → `docs/epics/discovery-partner.architecture.md`
(§Other eng-lead calls "Portal UI", §Boundaries "The portal has no a11y gate") +
`docs/epics/discovery-question-selection.architecture.md` (D1, D1a, D1b, D2, D3 — the facet control's whole
specification) + `docs/epics/discovery-partner.prd.md` MVP 1, 2, 5, 10.

**Back-references** (plans this builds on; read the Related Work / Notes of each before deviating):

- `.claude/plans/discovery-spine-run-package-284.md` — the drawer, the session routes, the SSE turn, the
  recorded block. Everything this ticket edits was built there.
- `.claude/plans/discovery-session-rules-285.md` — the depth ladder, `DEPTH_PROPOSAL`, `ESCALATES`, `COMPOSES`,
  `declareFacets`, the escalation value, the two counters. `openSession` learned `facets` here.
- `.claude/plans/discovery-bank-width-283.md` — `FACETS`, `MODULES`, `PRESETS`, `facetPlan`, the composing
  `selectDepth`, `FULL_DISCOVERY_BUDGET`. The control this ticket builds is that plan's stated consumer.
- `.claude/plans/discovery-postures-286.md` — the entry-mode select, the document field, Grill's model select,
  `ENTRY_POSTURES`, `MODEL_SETTABLE`, the audit submit. The posture select this ticket replaces is its.
- `.claude/plans/discovery-prd-projection-290.md` — `SECTIONS`, `indexOps`, `readPackage`. The package view
  mirrors its supersede rule and deliberately does not import it.
- `.claude/plans/discovery-proposals-359.md` — `proposalsView`, the drawer's proposals block. The precedent
  for "an exported whitelist the route serves and the drawer renders with no shape opinion".

**Forward-references**:

- #289 — look it up, park it, the escape hatch. Owns the "ask something else" input's route and filing rules;
  the input's SURFACE is deferred to it here (Q1).
- #291/#292 — the two real runs. They are what the facet control exists to make runnable.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

**The rules layer (server-side; every one of these is already tested and none of them changes shape):**

- `discovery/bank.mjs:938-1026` — `FACETS` (five, in firing order, each with `question` and `fires`),
  `MODULES` (label + budget + ids per facet; budgets 7·6·6·6·6), `PRESETS` (four, each carrying **all five
  keys** so one object sets five checkboxes). Why: these are the control's entire content. Read the comment
  at 938: *"`question` is what the person is asked at intake (#288 renders it beside a checkbox)."*
- `discovery/bank.mjs:1030` — `FULL_DISCOVERY_BUDGET = 30`. Why: the overflow arithmetic.
- `discovery/bank.mjs:1046-1062` — `normaliseFacets`. Why: `{}` and a missing key are NOT the same input as
  a declared all-false vector. The consumer preset is the declared all-false vector.
- `discovery/bank.mjs:1073-1085` — `facetPlan(facets)` → `{ declared, fired, fits, overflow, count, budget }`.
  **Greedy in `FACETS` order; `fits` is not necessarily a prefix of `fired`.** Why: the overflow message is
  this value, and the browser must never recompute it.
- `discovery/bank.mjs:1095-1102` — `selectDepth(depth, facets)`. Why: it THROWS on overflow naming what fits
  and what does not; that throw is #285's refusal and stays the server's last word.
- `discovery/ops.mjs:46-64` — `OPS`, `PARAMS`, `LEVELS`, `PROVENANCE`, `SOURCES`, `FLAGS`. Why: the package
  view's columns are exactly these.
- `discovery/ops.mjs:38-104` — the header's six invariants + `parentCandidates` / `auditParenting`. Why: the
  new `ledgerView` sits beside them and must match their shape — pure, no imports, total over junk.
- `discovery/prd-projection.mjs:427-452` — `indexOps`, and specifically the `supersededBy` reverse map and
  the "visible = latest per banked question, plus every off-script decision" rule, with the comment on why
  nothing is dropped. Why: `ledgerView` must reach the SAME answer or the drawer and `prd.md` will disagree
  about the same package. **Do not import it — mirror the rule and let the gate compare both.**

**The session module:**

- `portal/lib/discovery.mjs:505-545` — `LADDER`, `ESCALATES`, `DEPTH_PROPOSAL`, `ENTRY_POSTURES`, `RE_ASKS`,
  `COMPOSES`, `NOT_A_FORM_MAX`. Why: `POSTURE_FLOW` goes here, in the same shape, with the same both-ways
  gate treatment.
- `portal/lib/discovery.mjs:552-556` — `declareFacets`. Why: `resumeMismatch` normalises the posted vector
  through it before comparing, so `{}` → null and a five-key preset do not false-positive against each other.
- `portal/lib/discovery.mjs:663-724` — `openSession`. Why: every guard, the `if (existing) return sessionView(root)`
  resume branch, the write literal. **Nothing in this function changes.** Read the comment block above it.
- `portal/lib/discovery.mjs:747-767` — `sessionView`. Why: `ledger` is added here, as one more derived field
  beside `cursor`, `escalation`, `metrics` and `document`.
- `portal/lib/discovery.mjs:780-806` — `discoveryConfig()`. Why: three keys are added (`postureFlow`,
  `modules`, `facetPlans`). Read the comment at 774 on `forTheBrowser` — **the weak-answer note never
  reaches the browser and nothing added here may carry it.**
- `portal/lib/discovery.mjs:314-317` — `opLine`. Why: the transcript op-line shape `ledgerView` folds
  (`seq`, `turn`, `op`, `params`, `closes`, `flagged`, `supersedes`).

**The route layer:**

- `portal/server.mjs:158-203` — the discovery config / session POST / session GET / close routes. Why: the
  409 lands in the session POST. Note the "EVERY PARAMETER NAMED, never a spread" rule in the comment at 167
  and its cross-reference to `/api/build/run`.
- `portal/server.mjs:301-318` — the verdict route's `json(res, 400, { error: … })` refusals. Why: this is the
  precedent for a status other than the catch-all — **the boundary has no error taxonomy** (`server.mjs:381`
  is a flat `json(res, 500, { error: e.message })`), so a 409 is written in the route, never thrown.

**The drawer:**

- `portal/public/index.html:145-246` — the whole discovery drawer. Why: the posture `<select>` at 181-183 is
  replaced; the facet fieldset and the package-view mount are added.
- `portal/public/portal.js:674-745` — `discoveryEls`, the drawer open handler, `loadDiscoveryConfig`,
  `renderDiscoveryBuild`. Why: `discoveryEls` grows `facets` and its posture read changes source.
- `portal/public/portal.js:756-804` — `renderDiscoveryEntry`, `renderDiscoveryModel`, `renderDiscoveryNotes`
  and the three change listeners. Why: the posture half of `renderDiscoveryEntry` is rewritten; the depth
  note grows the faceted count.
- `portal/public/portal.js:806-833` — the Start handler. Why: it POSTs `facets` and renders a 409 as prose.
- `portal/public/portal.js:835-881` — `renderDiscoverySession`. Why: it calls the new `renderPackageView`
  and disables the flow buttons once a session is open.
- `portal/public/portal.js:883-929` — `renderDiscoveryRecorded`. Why: the package view is its sibling and
  mirrors its escaping discipline — **every string through `esc()`**.
- `portal/public/portal.css:183-231` — the drawer's styles, including the 44×44 block at 194-197 and the
  comment stating no gate covers it. Why: the new controls extend that block.

**The gate:**

- `tooling/build-checks.mjs:5858` — group 29's headline (`discovery ops`). Why: `ledgerView`'s cases go here.
- `tooling/build-checks.mjs:5862-6300` — group 30's preamble and its `threw` / `names` / `same` helpers, plus
  the SDK-free-by-absence invariant. Why: the config, `POSTURE_FLOW`, `resumeMismatch` and `sessionView.ledger`
  cases go here. **Highest existing case number in group 30 is 34; new cases start at 35.**
- `tooling/build-checks.mjs:6232-6265` — case 20, the provenance source-pin over `portal/public/portal.js`.
  Why: this is the ONLY shape a drawer assertion can take (portal.js touches the DOM at module scope, so it
  cannot be imported) and the new drawer pins copy it. **Case 20's three pinned spans must stay untouched.**
- `.claude/references/gates.md` — which gate proves what, and the convention that every gate states what it
  cannot reach. Why: the group headlines this ticket extends must carry that sentence.

### New Files to Create

**None.** Every change is an edit. (If Phase 6 / Q1 is taken, still none.)

### Relevant Documentation

- `docs/epics/discovery-question-selection.architecture.md` §D1, §D1a, §D1b, §D2, §D3 — the facet model, the
  budget-and-overflow rule, which depths compose, "the person decides at intake, no inference", and "once, at
  session start, recorded in run.json". Why: this document IS the facet control's specification; do not
  re-derive any of it.
- `docs/epics/discovery-partner.architecture.md` §Other eng-lead calls → "Portal UI" and "Routes follow the
  `/api/build/*` shape" · §Boundaries → "The portal has no a11y gate, and #271 will not give it one". Why:
  the config-is-the-single-source rule and the 44×44-by-review rule.
- `docs/epics/discovery-partner.prd.md` MVP 1 (three buttons), MVP 2 (two ways in), MVP 5 (the depth ladder,
  the agent proposes / the human confirms), MVP 10 (the run package's three rules). Why: the ACs quote these.
- `discovery/README.md` §run.json, §File shapes, §Supersede. Why: the package view renders the file shapes;
  §Supersede is why a superseded decision is MARKED, never dropped.
- `CLAUDE.md` §Where new code goes → "Portal UI feature" and "Portal API endpoint"; §Ground rules → types
  ("no schema library — validate by hand at the boundary and throw"), errors ("no error taxonomy, no
  wrapping"), git ("a PR body MUST carry a `Closes #N` trailer"; the plan, report and review in the same PR).
- `.claude/references/frontend-component-best-practices.md` — UI work. Read before writing the render
  functions.

### Patterns to Follow

**A config-served table the gate iterates both ways** (`portal/lib/discovery.mjs:529`):

```js
// Which postures may open which entry mode (#286; MVP 1, MVP 2). … Group 30
// iterates this table against ENTRY_MODES and POSTURES in both directions.
export const ENTRY_POSTURES = Object.freeze({
  'blank-idea': Object.freeze(['think', 'think-opus', 'create-prd', 'grill']),
  'existing-prd': Object.freeze(['grill']),
});
```

`POSTURE_FLOW` is written exactly like this — frozen at both levels, with the sentence naming what the gate
proves, so a fifth posture with no flow row fails by name rather than falling off a menu silently.

**A pure exported fold the route serves and the browser renders** (`portal/lib/discovery.mjs:841` `turnEvent`,
`discovery/proposals.mjs` `proposalsView`, `portal/lib/builder.mjs` `stepEvent`): the shape opinion lives in
one exported function the gate can call; the route and the render function hold none. `ledgerView` follows it.

**A pure read beside the applier** (`discovery/ops.mjs`, `parentCandidates` / `auditParenting`): no imports,
total over junk, copies every array it returns. The header's stated reason — *"the refusal, the prompt and the
gate must all answer … identically"* — is the same reason `ledgerView` lives there rather than in the drawer.

**Copy, never alias** (`portal/lib/discovery.mjs:848-852`, group 30 case 13):

```js
// COPIED, never aliased: a projection that handed out the transcript line's own array would let
// a consumer rewrite a committed record without a write (group 30 case 13).
flagged: Array.isArray(line.flagged) ? [...line.flagged] : [],
```

**Escaping in the drawer** (`portal/public/portal.js:894-914`): every interpolated string goes through
`esc()`, including ids and labels that came from the config. No exception for "our own data".

**`hidden` is not enough where CSS sets `display`** (memory: `hidden` defeated by author display;
`portal.css:58`): the `.btn` is `display:inline-flex`, so `el.hidden = true` on a button is a silent no-op.
The existing code disables rather than hides for exactly this reason (`portal.js:876-877`). Do the same.

**Error style** (`agent-layer/lib.mjs`, `portal/lib/discovery.mjs:bad`): plain `Error`s naming the offending
value. Never a wrapper class, never a code.

---

## IMPLEMENTATION PLAN

### Phase 1: The rules layer — `POSTURE_FLOW`, `resumeMismatch`, `ledgerView`

The three pure additions. Nothing renders yet; everything below depends on these, and each is a function the
gate can call directly.

**Tasks:**

- `ledgerView(ops)` in `discovery/ops.mjs`, beside `parentCandidates` / `auditParenting`.
- `POSTURE_FLOW` in `portal/lib/discovery.mjs`, beside `ENTRY_POSTURES`.
- `resumeMismatch(head, posted)` in `portal/lib/discovery.mjs`, beside `openSession`.

### Phase 2: The config and view surface

**Depends on:** Phase 1.

Serve what the drawer will read, so the browser holds no second copy of any rule.

**Tasks:**

- `discoveryConfig()` grows `postureFlow`, `modules` and `facetPlans` (the precomputed 32-row table).
- `sessionView()` grows `ledger`.
- The session POST route answers 409 on a mismatch.

### Phase 3: The three-button flow

**Depends on:** Phase 2 (reads `config.postureFlow`).
**Independent of:** Phase 4 — different DOM, different handlers. Sequential is fine; parallel is available.

**Tasks:**

- The HTML: the posture `<select>` becomes an ordered button row plus the Think-on-Opus variant checkbox.
- `renderDiscoveryEntry` renders the flow from `config.postureFlow` filtered by `config.entryPostures[mode]`.
- `discoveryEls().posture` reads the selected step, not a `<select>`.
- `renderDiscoverySession` disables the flow once a session is open and shows which step this run is on.

### Phase 4: The facet vector

**Depends on:** Phase 2 (reads `config.facets`, `config.presets`, `config.modules`, `config.facetPlans`).

**Tasks:**

- The HTML: a five-checkbox fieldset, four preset buttons, a plan note.
- `renderFacets` / `renderFacetPlan` — the plan note is a table LOOKUP, never a computation.
- `discoveryEls().facets` builds the five-key object; the Start handler POSTs it.
- The depth note reports the faceted count where the depth composes and says so where it does not.

### Phase 5: The package view

**Depends on:** Phase 2 (reads `session.ledger`).
**Independent of:** Phases 3 and 4.

**Tasks:**

- The HTML: one mount beside `#discovery-recorded`.
- `renderPackageView` — decisions (level · parent · evidence · wrong-if · flags · superseded), open questions,
  the evidence ledger with provenance labels, and the flag totals. The audited document's `md5` where present.
- Styles for the four blocks, mirroring `.discovery-recorded-turn`.

### Phase 6 (CONDITIONAL — only if Q1 is answered "build it"): the escape-hatch input

Not planned in detail because it has no route. If taken: one `<textarea id="discovery-aside">` + a
`#discovery-ask` button inside `#discovery-session`, disabled with the note "the filing rules are #289's", and
one 44×44 case. Do NOT wire it to `/api/discovery/turn` — that route's `questionId` is a banked id and an
off-script POST to it would file against the wrong question.

### Phase 7: The gate

**Depends on:** Phases 1–5.

**Tasks:**

- Group 29 gains `ledgerView`'s cases and its headline sentence.
- Group 30 gains cases 35+ for `POSTURE_FLOW`, `resumeMismatch`, the three config keys, `sessionView.ledger`,
  the route's 409, and the drawer source pins.
- Both groups' "What it cannot reach" sentences updated.

### Phase 8: Validation and the 44×44 review sweep

**Depends on:** Phase 7.

**Tasks:**

- `node tooling/build-checks.mjs` green.
- `node tooling/drift-check.mjs` and token-lint (the CI `verify` job's other two legs) — run even though this
  is portal-only; the memory `piv-skills-python-tuned` says run them, never skip as n/a.
- The portal smoke: boot on a private port, `/api/health`, a real session end to end under the neutral shell.
- The 44×44 sweep by measurement in a real browser, recorded in the PR report.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Each task is atomic and independently testable.

---

### CREATE `ledgerView` in `discovery/ops.mjs`

- **IMPLEMENT**: a pure, import-free, total fold over an op ledger — the array of applier-shaped records
  (`{ seq, turn, op, params, closes, flagged, supersedes }`). Place it directly after `auditParenting`, before
  `emptyRun`. Signature `ledgerView(ops)`. Returns:

  ```js
  {
    total: <number>,                       // ops.length
    counts: { record_decision, flag_weak_answer, open_question, file_evidence },   // keyed by OPS, always all four
    flags:  { "no-evidence": n, orphan: n },                                       // keyed by FLAGS, always both
    decisions: [{ seq, turn, questionId, answerRef, level, parentId, evidenceRefs, wrongIf, offScript,
                  flagged, supersedes, supersededBy, latest }],
    weak:      [{ seq, turn, questionId, answerRef, missing }],
    openQuestions: [{ seq, turn, source, questionId, answerRef, reason }],
    evidence:  [{ seq, turn, url, ref, name, provenance, claimRef }],
  }
  ```

  Rules, each of which the gate asserts:
  - **`counts` is keyed by `OPS` and `flags` by `FLAGS`, always** — a verb with zero records reads `0`, never
    absent, so a fifth verb added later shows up as a missing key rather than as a silently absent row.
  - **`flags` counts over the WHOLE ledger**, superseded records included — `prd-projection.mjs:436-448`'s
    stated reason: three surfaces already count that way, and a fourth counting differently gives a reader
    two numbers for one fact.
  - **`latest`** is true for every off-script decision (`questionId === null`) and for the latest decision per
    banked `questionId`; false otherwise. Mirrors `indexOps`'s `visible` set exactly.
  - **`supersededBy`** is the reverse of `supersedes` — the seq that replaced this one, or `null`. Nothing is
    dropped (README §Supersede).
  - **Every array is COPIED** — `flagged`, `evidenceRefs`, `missing`. The group 30 case 13 alias trap.
  - **Total over junk**: a non-array argument, a null item, an item with no `params`, an unknown `op` — return
    the empty shape / skip the item rather than throwing. This is a VIEW, and a view that throws takes the
    whole drawer down over a record the applier already accepted. (Contrast `applyOp`, which throws by design.)
- **PATTERN**: `discovery/ops.mjs:93-104` (`auditParenting` — a pure read over `ops`, returning three arrays)
  and `discovery/prd-projection.mjs:427-452` (`indexOps` — the visible/supersede rules being mirrored).
- **IMPORTS**: none. `discovery/ops.mjs` has zero import lines and group 29 pins that.
- **GOTCHA**: do NOT import `discovery/prd-projection.mjs` here — it imports `bank.mjs`, and `ops.mjs`'s
  import-free invariant is what lets group 29 load in CI with no `portal/node_modules`. Mirror the rule; the
  gate compares both against one fixture.
- **GOTCHA**: `params.off_script` is a `record_decision` param (`PARAMS`), distinct from `questionId === null`.
  Carry both; do not derive one from the other.
- **VALIDATE**: `node -e "import('./discovery/ops.mjs').then(m=>{const s=m.applyOps(m.emptyRun(),[{op:'record_decision',params:{question_id:'s1-premortem',answer_ref:'a1',level:'business',parent_id:null,evidence_refs:[],wrong_if:'x',off_script:false}}],{answers:[{ref:'a1'}],bank:[{id:'s1-premortem'}],turn:'t1'});const v=m.ledgerView(s.ops);console.log(JSON.stringify(v.counts),JSON.stringify(v.flags),v.decisions[0].latest)})"`
  → `{"record_decision":1,"flag_weak_answer":0,"open_question":0,"file_evidence":0} {"no-evidence":1,"orphan":0} true`
- **SATISFIES**: AC #4.

---

### UPDATE `discovery/ops.mjs` — the header

- **IMPLEMENT**: extend the "Two pure reads over a ledger sit beside the applier" paragraph to three, naming
  `ledgerView` and its consumer (`sessionView` → the drawer's package view, #288) and its rule: it mirrors
  `prd-projection.mjs`'s visible/supersede rules rather than importing them, and the gate compares the two.
- **PATTERN**: the existing paragraph at `discovery/ops.mjs:38-41`.
- **GOTCHA**: **do not** touch invariants 1–6 or the OPS/PARAMS lists. A pure read is not a verb and does not
  take the epic's op-verb lock — say so in the header sentence so a future editor does not think it did.
- **VALIDATE**: `node --check discovery/ops.mjs && grep -c "ledgerView" discovery/ops.mjs` → ≥ 3
- **SATISFIES**: AC #4 (documentation half).

---

### ADD `POSTURE_FLOW` to `portal/lib/discovery.mjs`

- **IMPLEMENT**: place it immediately after `ENTRY_POSTURES` (line 532). Three ordered steps; each step names
  its `postures` array, where the FIRST entry is the step's default and any further entry is a variant:

  ```js
  // MVP 1's three buttons, in the order they are pressed. A STEP is a stance; a POSTURE is a prompt, and
  // Think has two — the same buildThinkTurn under two models, which is a comparison rather than a fourth
  // stance, so it rides its own step as a variant. The first entry of `postures` is the step's default.
  // "Pressable in order" is a flow ACROSS RUNS: run.json records ONE posture and runTurn resolves it from
  // head.posture, so a step is chosen at session start and stands for the session. Group 30 iterates this
  // table against POSTURES and ENTRY_POSTURES in both directions, so a fifth posture with no step, or a
  // step naming a posture POSTURES does not hold, fails by name rather than falling off a menu.
  export const POSTURE_FLOW = Object.freeze([
    Object.freeze({ step: 'think',      label: 'Think',      order: 1, postures: Object.freeze(['think', 'think-opus']),
                    what: 'Interview a blank idea against the bank. Answers first; the shape comes later.' }),
    Object.freeze({ step: 'create-prd', label: 'Create PRD', order: 2, postures: Object.freeze(['create-prd']),
                    what: 'Judge each answer against the PRD section it will render into.' }),
    Object.freeze({ step: 'grill',      label: 'Grill',      order: 3, postures: Object.freeze(['grill']),
                    what: 'Run the weak-answer note as a checklist — and the one stance an existing PRD opens at.' }),
  ]);

  // The variant models a step offers beyond its default, keyed by step. Rendered as a checkbox on the step's
  // own button row so the second posture is reachable without a fourth button (MVP 1 says three).
  export const POSTURE_VARIANT_LABEL = Object.freeze({ 'think-opus': 'on Opus — the same prompt, the other model' });
  ```

- **PATTERN**: `portal/lib/discovery.mjs:529` (`ENTRY_POSTURES`) — frozen at both levels, with the sentence
  naming what the gate proves.
- **IMPORTS**: none new; `POSTURES` is already imported at line 55.
- **GOTCHA**: the `what` strings are UI copy and fall under **C2 (no AI slop)**. Run them past
  `~/.claude/skills/_shared/slop-blacklist.md` before committing — and **C3 (no job titles)**: no role or
  seniority word anywhere in this file's new strings.
- **GOTCHA**: `order` is redundant with array position by design — the gate asserts they agree, so a
  reordering that forgets one fails rather than silently renumbering the buttons.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>{const flat=m.POSTURE_FLOW.flatMap(s=>s.postures);console.log(flat.length, flat.every(p=>Object.hasOwn(m.POSTURES??{},p)) || 'check via config')})"`
  — or simply `node tooling/build-checks.mjs 2>&1 | grep -i discovery` once Phase 7 lands.
- **SATISFIES**: AC #1, AC #6.

---

### ADD `resumeMismatch` to `portal/lib/discovery.mjs`

- **IMPLEMENT**: place it immediately after `openSession` (after line 724), before `mutateHead`.

  ```js
  // PR #365 review F6, made reachable by #288's facet control. DISK IS AUTHORITATIVE and stays so — this
  // does not change what a resume returns, it refuses to return it SILENTLY. Opening an existing slug with
  // another depth or vector answered the disk state with no signal: observed, a scope-check + { orgBuys }
  // POST over a full-discovery + { regulated } run answered 22 questions of somebody else's session.
  //
  // Compares NORMALISED forms, so {} / null / undefined all read as "no vector" and a five-key preset does
  // not false-positive against the same vector spelled with fewer keys. Returns null when the POST agrees
  // with the record (which is always the case on a CREATE, where the head was written FROM the posted
  // values), else the message the route sends as a 409.
  //
  // The route calls it on openSession's RETURN, so every one of openSession's guards has already refused
  // junk by name: declareFacets cannot throw here through the route. Called directly with a junk vector it
  // throws the bank's own error, which is the honest answer and what group 30 drives.
  export function resumeMismatch(head, posted) {
    if (!head || typeof head !== 'object') return null;
    const wantDepth = posted?.depth ?? null;
    const wantFacets = declareFacets(posted?.facets ?? null);
    const hasDepth = head.depth ?? null;
    const hasFacets = head.facets ?? null;
    const sameFacets = JSON.stringify(hasFacets) === JSON.stringify(wantFacets);
    if (hasDepth === wantDepth && sameFacets) return null;
    return `run "${head.slug}" is already on disk at depth "${hasDepth}" with ${facetsPhrase(hasFacets)}; this request asked for depth "${wantDepth}" with ${facetsPhrase(wantFacets)}. A resume returns the recorded session — disk is authoritative and #284's design keeps it that way — so nothing was changed. Open the recorded session by posting its depth and vector, or start a new slug.`;
  }
  ```

  Plus a module-private `facetsPhrase(v)` → `'no facet vector'` when null, else the ticked ids joined, or
  `'a declared vector with nothing ticked'` when all five are false (the consumer preset — distinguishable
  from null by D1b, and the message must say which).

- **PATTERN**: the pure-predicate-plus-route-status shape at `portal/server.mjs:311-315`.
- **IMPORTS**: `declareFacets` is defined in this module (line 552). Nothing new.
- **GOTCHA**: **`JSON.stringify` over the two objects is safe only because `declareFacets` returns keys in
  `FACETS` order both times**, and `head.facets` was written by `declareFacets`. Do not compare raw POST
  bodies. If you prefer a key-by-key compare, write one — but do not compare `Object.keys().length`, which
  passes for a vector with a duplicate spelling.
- **GOTCHA**: do NOT add `entryMode`, `posture` or `model` to the comparison. The owner's comment names depth
  and vector; a posture mismatch on a resume is a real question but not this ticket's — see **Q2**.
- **GOTCHA**: keep it TOTAL over a junk `head` (return null) — `sessionView` never hands one over, but a
  route that grew a different caller must not take the drawer down.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>{console.log(m.resumeMismatch({slug:'x',depth:'full-discovery',facets:null},{depth:'full-discovery',facets:{}}));console.log(m.resumeMismatch({slug:'x',depth:'full-discovery',facets:null},{depth:'scope-check',facets:null})?.slice(0,60))})"`
  → `null` then a string starting `run "x" is already on disk at depth "full-discovery"`
- **SATISFIES**: AC #1 (the entry mode is chosen once and recorded — this is what makes "once" enforceable),
  and the owner's 2026-09-03 comment on #288.

---

### UPDATE `discoveryConfig()` in `portal/lib/discovery.mjs`

- **IMPLEMENT**: three new keys. Nothing existing changes shape.

  ```js
  postureFlow: POSTURE_FLOW,
  postureVariantLabels: POSTURE_VARIANT_LABEL,
  // Each facet's module, so the overflow message can NAME what does not fit rather than printing an id.
  modules: Object.fromEntries(FACETS.map((f) => [f.id, { label: MODULES[f.id].label, budget: MODULES[f.id].budget }])),
  // Every vector's plan, PRECOMPUTED — 32 rows, keyed by the five booleans in FACETS order as a bit string
  // ("00000" … "11111"), plus "" for NO vector. The drawer's overflow message is a LOOKUP: composing it in
  // the browser would be a second copy of D1a's greedy walk, which is exactly what AC #6 forbids. facetPlan
  // is pure and takes no depth, so this table is static — it is built once at module scope, not per request.
  facetPlans: FACET_PLANS,
  ```

  With, at module scope near the other tables:

  ```js
  // The 32 vectors + the undeclared case, folded once. facetPlan's own return, verbatim, so group 30 can
  // compare every row by DRIVING facetPlan rather than by reading this table.
  export const facetKey = (v) => (v === null ? '' : FACETS.map((f) => (v[f.id] ? '1' : '0')).join(''));
  const FACET_PLANS = Object.freeze(Object.fromEntries([
    ['', facetPlan(null)],
    ...Array.from({ length: 32 }, (_, n) => {
      const v = Object.fromEntries(FACETS.map((f, i) => [f.id, Boolean((n >> i) & 1)]));
      return [facetKey(v), facetPlan(v)];
    }),
  ]));
  ```

- **PATTERN**: `portal/lib/discovery.mjs:780-806` — every key a straight read off a frozen table, no
  computation in the route. And `builder.mjs:42`'s one-definition-many-readers precedent.
- **IMPORTS**: add `FACETS`, `MODULES`, `facetPlan` to the existing `discovery/bank.mjs` import if not already
  there (`FACETS` and `facetPlan` are; check `MODULES`).
- **GOTCHA**: the bit order MUST be `FACETS` order and the SAME function must build the key on both sides.
  Export `facetKey` so the drawer imports nothing and the gate can drive both directions. (The drawer cannot
  import it — it is a browser file — so the drawer hand-writes the same join. **That is a second copy: keep it
  to one line, and have group 30 source-pin the drawer's join against `FACETS`' order.**)
- **GOTCHA**: 33 rows × ~6 fields is ~4 KB of JSON. Fine on a 127.0.0.1 route. Do not paginate it.
- **GOTCHA**: `forTheBrowser` strips `weakAnswer`, `note` and `provenanceNote` from questions. **Nothing added
  here may reintroduce them** — `MODULES` carries ids, not question objects, so it is clean; assert it.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m=>{const c=m.discoveryConfig();console.log(Object.keys(c.facetPlans).length, c.facetPlans['00000'].count, c.facetPlans[''].count, c.facetPlans['11111'].overflow.length, JSON.stringify(c.modules.hasModel))})"`
  → `33 16 30 3 {"label":"AI interaction","budget":7}`
- **SATISFIES**: AC #6.

---

### UPDATE `sessionView()` in `portal/lib/discovery.mjs`

- **IMPLEMENT**: one derived field. The op lines come from the transcript the same way `closersOf` reads them.

  ```js
  // AC #4 — what the package HOLDS, folded from the op ledger and nothing else. ledgerView is
  // discovery/ops.mjs's exported pure read, so the drawer holds no shape opinion and the gate can reach
  // the fold without a browser. The transcript's op lines carry the applier's record verbatim (opLine),
  // so this is the same input prd-projection.mjs's readPackage builds — one package, two readers, and
  // group 30 compares them on one fixture rather than trusting they agree.
  ledger: ledgerView(transcript.filter((l) => l?.type === 'op').map(({ type, ts, ...rec }) => rec)),
  ```

- **PATTERN**: the `cursor` / `escalation` / `metrics` / `document` fields already on this return; and
  `prd-projection.mjs:readPackage`'s `delete rec.type; delete rec.ts;` strip.
- **IMPORTS**: add `ledgerView` to the existing `discovery/ops.mjs` import in `portal/lib/discovery.mjs`.
- **GOTCHA**: `readPackage` REFUSES a transcript line whose `type` is outside the three (its stated reason: a
  filter would silently drop a well-formed record). `sessionView` filters instead, because it is a live view
  over a file being appended to and a throw would take the drawer down mid-session. **Say so in the comment**
  — the two behaviours differ on purpose and a reader must not "fix" one to match the other.
- **VALIDATE**: run the portal smoke below and `curl -s "http://127.0.0.1:<port>/api/discovery/session?slug=instrument-loans-1&provenance=fictional" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const v=JSON.parse(s);console.log(v.ledger.counts, v.ledger.flags, v.ledger.decisions.length)})"`
- **SATISFIES**: AC #4.

---

### UPDATE the session POST route in `portal/server.mjs`

- **IMPLEMENT**: the 409, written in the route (no error taxonomy at the boundary).

  ```js
  if (p === '/api/discovery/session' && req.method === 'POST') {
    const b = await readBody(req);
    const view = openSession({ /* …every parameter named, unchanged… */ });
    // A RESUME that asked for something else (PR #365 review F6). openSession returned the disk state —
    // disk is authoritative and stays so — and this is where that stops being silent. Never fires on a
    // create: the head was written FROM these values, so resumeMismatch reads null by construction.
    // Written here rather than thrown, because the boundary has no error taxonomy (CLAUDE.md §Ground rules)
    // and `bad()` would land as a 500 that reads like a server fault.
    const mismatch = resumeMismatch(view.head, { depth: b.depth, facets: b.facets ?? null });
    if (mismatch) return json(res, 409, { error: mismatch });
    return json(res, 200, view);
  }
  ```

- **PATTERN**: `portal/server.mjs:311-315` (the verdict route's explicit 400s) — a status other than the
  catch-all is written in the route with the message inline.
- **IMPORTS**: add `resumeMismatch` to the existing `./lib/discovery.mjs` import at `server.mjs:16`
  (alphabetical: after `runTurn`? the list is alphabetical — insert between `resolveRunRoot` and `runTurn`).
- **GOTCHA**: order matters. `openSession` runs FIRST so its guards refuse junk with their own messages (a
  junk depth is the bank's throw → 500, exactly as today); the 409 is only ever reached with a valid POST
  against an existing head. **Do not** move the check before `openSession` — you would need a second
  `resolveRunRoot` + `assertProvenanceRoot` pair and a junk depth would come back as a confusing 409.
- **GOTCHA**: a 409 leaves the package untouched. `openSession` already returned the disk state, and no write
  happened on the resume path.
- **VALIDATE**: with the portal up and `discovery/instrument-loans-1` on disk:
  `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:<port>/api/discovery/session -H 'content-type: application/json' -d '{"slug":"instrument-loans-1","provenance":"fictional","entryMode":"blank-idea","depth":"scope-check","frontEnd":"portal","posture":"think"}'`
  → `409`; the same POST with `"depth":"opening-set"` (its recorded depth) → `200`.
- **SATISFIES**: AC #1, the owner's 2026-09-03 comment.

---

### UPDATE `portal/public/index.html` — the flow buttons replace the posture select

- **IMPLEMENT**: replace the `<label>Posture <select …></label>` block (lines 181-183) with an ordered button
  row plus the variant checkbox row. Buttons carry `type="button"` (they live inside `#discovery-form`, whose
  submit is the answer) and `data-step`:

  ```html
  <!-- MVP 1's three buttons, in order, from /api/discovery/config's postureFlow. The step is the run's
       posture and is recorded once in run.json; "pressable in order" is a flow ACROSS RUNS — Think, then
       Create PRD, then Grill — and an existing PRD opens at Grill alone (#286's entryPostures). -->
  <fieldset class="discovery-flow" id="discovery-flow-row">
    <legend>The stance for this run</legend>
    <div class="discovery-flow-steps" id="discovery-flow"></div>
    <p class="muted" id="discovery-flow-note"></p>
    <div id="discovery-variant-row" hidden>
      <label class="discovery-check">
        <input type="checkbox" id="discovery-variant" /> <span id="discovery-variant-label"></span>
      </label>
    </div>
  </fieldset>
  ```

- **PATTERN**: the `#discovery-model-row` block at 186-190 — a row the render function shows or hides from
  the config, never from a hardcoded rule.
- **GOTCHA**: keep the `Entry` and `Depth` selects in their existing `.portal-form-row`; only the posture
  label leaves it. The row then holds two controls, which is fine.
- **GOTCHA**: `hidden` on `#discovery-variant-row` works (it is a `div`, no author `display`), but on a `.btn`
  it does not — `portal.css:58`. Flow buttons are DISABLED, never hidden.
- **VALIDATE**: `node -e "const s=require('fs').readFileSync('portal/public/index.html','utf8');console.log(!/id=\"discovery-posture\"/.test(s), /id=\"discovery-flow\"/.test(s))"` → `true true`
- **SATISFIES**: AC #1.

---

### UPDATE `portal/public/portal.js` — render the flow

- **IMPLEMENT**: three changes in the `renderDiscoveryEntry` neighbourhood.

  1. **`renderDiscoveryFlow()`** — reads `c.postureFlow`, filters each step's `postures` against
     `c.entryPostures[mode]`, drops a step with nothing admitted, and renders the survivors in `order` with a
     `${row.order}. ${row.label}` face, the `what` line under the row, and `aria-pressed` on the selected one.
     Selection lives in one module-scope variable (`discovery.step`), defaulted to the first admitted step.
  2. **The variant.** When the selected step's `postures` has a second entry and the entry mode admits it,
     show `#discovery-variant-row` with `c.postureVariantLabels[postures[1]]`; otherwise hide it and clear
     the checkbox. `discoveryEls().posture` = the variant's second posture when ticked, else `postures[0]`.
  3. **`renderDiscoveryEntry`** calls `renderDiscoveryFlow()` where it used to rebuild the select, and
     `renderDiscoveryModel()` reads the posture from `discoveryEls().posture` rather than from the select.

- **PATTERN**: `renderDiscoveryEntry` at `portal.js:756-771` — every list read from the config, none held here.
  And `renderProposals`'s delegated `click` listener (`portal.js:1012`) for the button row's handler:
  ONE listener on `#discovery-flow` using `e.target.closest('button[data-step]')`, not one per button.
- **GOTCHA**: `esc()` every label, `what` string and step id — they come off the wire.
- **GOTCHA**: the existing `$('#discovery-posture').addEventListener('change', renderDiscoveryModel)` at
  line 804 must go — the element no longer exists and `$()` on a missing id will throw at module scope,
  taking the whole portal SPA down. Delete the line; do not leave it guarded.
- **GOTCHA**: `renderDiscoveryModel` reads `$('#discovery-posture').value` at line 775. Change it to the new
  source in the SAME edit, or the Grill model row stops appearing.
- **VALIDATE**: portal smoke — open the drawer, switch Entry to "An existing PRD"; exactly one button
  (Grill) renders, enabled; switch back and three render with Think selected and its variant checkbox shown.
- **SATISFIES**: AC #1, AC #6.

---

### UPDATE `portal/public/portal.js` — disable the flow once a session is open

- **IMPLEMENT**: in `renderDiscoverySession`, disable every flow button, the variant checkbox, the depth
  select, the entry select and the facet controls, and set `#discovery-flow-note` to name the recorded step
  and posture off `s.head.posture` — the disk's answer, not the form's. The existing
  `$('#discovery-start').disabled = true` in the Start handler already disables the whole fieldset; verify
  the new fieldset is INSIDE `#discovery-start` (it is, if placed as specified) and that
  `.discovery-start[disabled]` (`portal.css:189`) still reads as intended.
- **PATTERN**: `portal.js:829` (`$('#discovery-start').disabled = true`) and `portal.css:189`.
- **GOTCHA**: `<fieldset disabled>` disables descendants natively — but the opacity rule at `portal.css:189`
  keyed on `.discovery-start[disabled]` only fires on the OUTER fieldset. A nested fieldset inherits the
  disable, not the opacity. Either nest inside `#discovery-start` (preferred, no CSS change) or add the
  selector; do not do both.
- **VALIDATE**: portal smoke — start a session, then confirm the flow buttons and facet checkboxes are
  non-interactive and the note names the recorded posture.
- **SATISFIES**: AC #1 ("chosen once and recorded").

---

### UPDATE `portal/public/index.html` — the facet fieldset

- **IMPLEMENT**: after the depth note (line 184), before the model row:

  ```html
  <!-- D1/D2: five facts about the product, ticked by the person at intake — never inferred. The four
       presets are a starting point, not a cell (MVP 4 as amended 2026-09-02). Only full discovery
       composes from the vector (D1b); the note below says what the vector does at the chosen depth. -->
  <fieldset class="discovery-facets" id="discovery-facets-row">
    <legend>What is true about this product</legend>
    <div class="discovery-presets" id="discovery-presets"></div>
    <div class="discovery-checks" id="discovery-facets"></div>
    <p class="muted" id="discovery-facet-note" aria-live="polite"></p>
  </fieldset>
  ```

- **PATTERN**: `.discovery-start`'s fieldset + legend at 159-161.
- **GOTCHA**: the checkbox rows are generated, not hand-written — `FACETS[i].question` is the label and
  `fires` is the note, both from the config (the bank's comment at `bank.mjs:938` says so explicitly).
- **VALIDATE**: `grep -c 'discovery-facets\|discovery-presets\|discovery-facet-note' portal/public/index.html` → `4`
- **SATISFIES**: AC #6, epic amendment 2026-09-02.

---

### UPDATE `portal/public/portal.js` — the facet controls

- **IMPLEMENT**:

  1. **`renderFacetControls()`**, called from `loadDiscoveryConfig` after the other selects are built.
     Renders four preset buttons from `c.presets` (`data-preset="<id>"`) and five checkbox rows from
     `c.facets` (`data-facet="<id>"`), each row `<label class="discovery-check"><input type="checkbox"
     data-facet="…"> <span>${esc(f.question)}</span></label>` with `<span class="muted">${esc(f.fires)}</span>`.
  2. **`discoveryEls().facets`** — `Object.fromEntries(config.facets.map(f => [f.id, $(`input[data-facet="${f.id}"]`).checked]))`,
     or **`null` when the person has ticked nothing AND pressed no preset**. That distinction is D1b's and it
     matters: `{}` is no vector (today's unfaceted thirty), a declared all-false vector is the consumer preset
     (twelve + block = 16). Track it with one module-scope boolean `discovery.vectorDeclared`, set true by a
     preset press or any checkbox change, and surfaced in the note so the person can SEE which state they are
     in. Add a "clear — run unfaceted" control that sets it false.
  3. **`renderFacetPlan()`** — a LOOKUP: `const plan = c.facetPlans[facetKeyOf(vector)]` where `facetKeyOf`
     is the one-line join `c.facets.map(f => vector?.[f.id] ? '1' : '0').join('')` (`''` when the vector is
     null). Message, **and the branch order is load-bearing**:
     - **FIRST — `!c.depths.find(d => d.id === depth).composes`** → "This depth runs its own fixed list;
       the vector is recorded in `run.json` and does not change which questions are asked (D1b). Only full
       discovery composes." **Render NO count in this branch.**
     - `plan.declared === false` → "No vector declared — full discovery runs its unfaceted 30."
     - `plan.overflow.length === 0` → "`${plan.count}` of `${plan.budget}` — the twelve, ${fits named via
       `c.modules[id].label`}, and the non-functional block."
     - else → "`${fits}` fit (`${plan.count}` of `${plan.budget}`); `${overflow named with their budgets}`
       does not. Untick one, or run `whole-bank`. **Nothing is truncated and the session will not start
       until you choose** (D1a)."
  4. Delegated `click` on `#discovery-presets` → set all five checkboxes from `c.presets[i].facets`, set
     `vectorDeclared = true`, re-render. Delegated `change` on `#discovery-facets` → `vectorDeclared = true`,
     re-render. Both also call `renderDiscoveryNotes()` so the depth note's count follows.
  5. **The Start handler** POSTs `facets` (the object, or null) and refuses BEFORE the POST when
     **`composes && plan.overflow.length > 0`** with the plan's own message — the server's `selectDepth`
     throw is the belt.

- **PATTERN**: `renderProposals`'s delegated click + `data-*` attributes (`portal.js:1012-1032`); the config
  reads in `loadDiscoveryConfig` (`portal.js:715-735`).
- **GOTCHA**: **do not** compute the greedy walk in the browser. If you find yourself writing a loop over
  budgets, stop — the table is on the config for exactly that reason (AC #6).
- **GOTCHA (the trap this control is most likely to fall into)**: **`facetPlan` is depth-blind.**
  `bank.mjs:1069-1071` warns #288 by name — *"facetPlan takes no depth, so a scope-check or a fuller-picture
  session must not read `count` as its own length."* Every row in `facetPlans` describes FULL DISCOVERY. So
  `plan.count` may only ever be rendered where `depths[depth].composes` is true, and the client's overflow
  refusal must be gated on `composes` too — `selectDepth` only throws on overflow when
  `depth === 'full-discovery'` (`bank.mjs:1098`), so an unconditional client refusal would reject a legal
  scope-check session with three facets ticked that the server would happily open. `whole-bank` is the depth
  where this bites hardest: it is in the menu, it does not compose, and it is the one a person is most likely
  to tick facets against expecting them to matter.
- **GOTCHA**: `esc()` the facet questions and module labels.
- **GOTCHA**: the depth note at `portal.js:797` already mentions `d.composes` and "#288". Update its wording
  so it reports the FACETED count when a vector is declared and the depth composes; keep the
  proposed-vs-overridden sentence intact (it is #285's AC).
- **VALIDATE**: portal smoke — tick `hasModel` + `regulated` + `internal`; the note names the two that fit
  and the one that does not, with its budget, and Start refuses with the same sentence.
- **SATISFIES**: AC #2 (the depth choice, now with the vector beside it), AC #6, epic amendment 2026-09-02.

---

### UPDATE `portal/public/index.html` — the package-view mount

- **IMPLEMENT**: one `<div id="discovery-package"></div>` between `#discovery-recorded` and
  `#discovery-proposals` (lines 235-238), with a comment naming AC #4.
- **VALIDATE**: `grep -c 'id="discovery-package"' portal/public/index.html` → `1`
- **SATISFIES**: AC #4.

---

### CREATE `renderPackageView` in `portal/public/portal.js`

- **IMPLEMENT**: place it directly after `renderDiscoveryRecorded` and call it from `renderDiscoverySession`.
  Renders **only** `discovery.session.ledger` plus `discovery.session.document` — nothing else. Four blocks:

  1. **A header line** — `${total} op(s)` with the four counts and both flag totals, read from
     `ledger.counts` / `ledger.flags` and never recounted client-side.
  2. **Decisions**, in seq order: `seq · question id (or "off-script") · level`, the parent as
     `parent: seq N` or `no parent`, `evidence: seq …` or `none`, the wrong-if line, the flags as chips
     (`no-evidence`, `orphan`), and a superseded marker (`superseded by seq N`) rather than a removal. Rows
     where `latest === false` render dimmed with the marker.
  3. **Open questions**: `seq · source · question id · reason`.
  4. **The evidence ledger**: `seq · provenance · url or ref · name · claim: seq N`, with the provenance as
     a labelled chip so `assumption` and `secondary-source` are visibly different (MVP 10).

  Plus, when `session.document` is present, one line: "auditing `${ref}` — `${chars}` characters, md5
  `${md5.slice(0,8)}`. **A resume ignores a document in the POST body; this md5 says which one the audit
  actually runs on.**" (the owner's 2026-09-04 comment).

  Empty ledger → one honest sentence, not an empty container: "Nothing filed yet — the package holds
  `${answers.length}` answer(s) and no ops."

- **PATTERN**: `renderDiscoveryRecorded` (`portal.js:883-929`) — one template string, `esc()` on every
  interpolation, `.map().join('')` for rows.
- **GOTCHA**: **no derivation.** Do not recount flags, do not recompute `latest`, do not re-resolve a parent
  chain. Every number and marker is read from `ledger`. This is AC #4's literal wording — *"it can never show
  a claim the ops do not hold"* — and the reason `ledgerView` exists server-side at all.
- **GOTCHA**: `wrong_if` and `reason` are model-authored prose and can be long. `white-space: pre-wrap;
  overflow-wrap: anywhere; min-width: 0` per `.discovery-recorded-answer` (`portal.css:205-207`), or the
  drawer blows out — memory `VR gate single-engine blindspot`, same failure class.
- **VALIDATE**: portal smoke — resume `discovery/instrument-loans-1` and confirm the counts match
  `node -e "import('./discovery/prd-projection.mjs').then(async m=>{const p=m.readPackage('discovery/instrument-loans-1');console.log(p.ops.length, p.ops.filter(o=>o.op==='record_decision').length)})"`.
- **SATISFIES**: AC #4.

---

### UPDATE `portal/public/portal.css` — the new blocks and the 44×44 sweep

- **IMPLEMENT**: append to the `#284` discovery block (after line 231):

  - `.discovery-flow-steps` — a flex row, `gap: var(--spacing-sm)`, wrapping. Buttons are `.btn`, so the
    existing `#discovery-drawer .btn { min-height: 44px }` already covers height; **add `min-width: 44px`**,
    which the existing rule does not set.
  - `.discovery-check` — **the label is the target**: `display:flex; align-items:center; gap:var(--spacing-sm);
    min-height:44px; cursor:pointer`. A native checkbox is ~13px; sizing the input alone leaves a
    sub-target. Also `.discovery-check input { width: 22px; height: 22px; }` so the box itself is visible,
    with the 44px hit area coming from the label.
  - `.discovery-presets` — a flex row of `.btn`s, same coverage.
  - `.discovery-package`, `.discovery-package-row`, `.discovery-chip` — mirroring `.discovery-recorded-turn`
    (`portal.css:199-211`): a bordered block, `pre-wrap` prose, `min-width: 0`.
  - Extend the 44×44 comment at 194-196 to name the new controls and repeat the reason (the portal is not in
    #271's VR page set, so review is the check).

- **PATTERN**: `portal.css:183-231`, especially the 44×44 comment block at 194-197.
- **GOTCHA**: tokens only where the portal already uses them (`var(--spacing-*)`, `var(--color-*)`). The
  portal links the neutral shell; a literal hex here is the same bug it is in `components.css`.
- **GOTCHA**: `#discovery-drawer select, #discovery-drawer input { min-height: 44px }` (line 197) will also
  hit the facet checkboxes and make them 44px tall boxes. **Scope the checkbox out**: either
  `#discovery-drawer input:not([type="checkbox"])` or an explicit `.discovery-check input { min-height: 0 }`
  after it. Decide once and comment which.
- **VALIDATE**: in a real browser at 1280×800 and at 390×844,
  `[...document.querySelectorAll('#discovery-drawer button, #discovery-drawer input, #discovery-drawer select, #discovery-drawer .discovery-check')].map(e=>{const r=e.getBoundingClientRect();return [e.id||e.className||e.type, Math.round(r.width), Math.round(r.height)]}).filter(([,w,h])=>w<44||h<44)`
  → `[]`. Paste the result into the PR report.
- **SATISFIES**: AC #5.

---

### UPDATE `tooling/build-checks.mjs` — group 29 gains `ledgerView`

- **IMPLEMENT**: new cases in the `discovery ops` group, and its headline extended. Assert:
  - `counts` keyed by `OPS` (all four present at zero on an empty ledger) and `flags` keyed by `FLAGS`.
  - A four-op happy fold's counts, flags and array lengths against the applier's own output.
  - `latest` — a second decision on the same banked question makes the first `latest:false` and carries
    `supersededBy` naming the second's seq; an off-script decision is always `latest:true`; **nothing is
    dropped** (both records present).
  - Flags counted over the WHOLE ledger, superseded records included — drive the case where a superseded
    record carries `no-evidence` and the replacement does not, and assert the total is 1.
  - **The cross-reader agreement**: fold `discovery/instrument-loans-1`'s committed ops through BOTH
    `ledgerView` and the projection's own numbers (`projectPrd`'s Ledger line is text — compare against
    `readPackage(root).ops` counted directly), and assert the decision/flag totals agree. This is the case
    that catches the mirrored rule drifting from `indexOps`.
  - **Purity**: two calls deep-equal; mutating the return's `flagged` / `evidenceRefs` and re-reading the
    input leaves it unchanged (the group 30 case 13 alias trap).
  - **Totality**: `null`, `undefined`, `42`, `'x'`, `[null]`, `[{}]`, `[{op:'nope',params:{}}]` — each
    returns the empty-or-skipped shape, never throws.
- **PATTERN**: group 29's existing `REFUSALS` battery and its `same()` / `threw()` helpers.
- **GOTCHA**: this group runs with **no `portal/node_modules`**. Import `discovery/ops.mjs` and
  `discovery/prd-projection.mjs` only — both are import-free or built-in-only. Do not reach `portal/lib/`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -A2 "discovery ops"`
- **SATISFIES**: AC #4.

---

### UPDATE `tooling/build-checks.mjs` — group 30, cases 35+

- **IMPLEMENT**: the highest existing case in group 30 is **34**; start at 35.

  - **case 35 — `POSTURE_FLOW` both ways.** Every posture in `POSTURES` appears in exactly one step; every
    posture named by a step is in `POSTURES`; every step's postures are a subset of the union of
    `ENTRY_POSTURES`' values; `order` equals `index + 1`; frozen at both levels by MUTATION (push refused,
    length re-read). Three steps, matching MVP 1's three names. `POSTURE_VARIANT_LABEL` keyed only by
    postures that are a step's second-or-later entry.
  - **case 36 — the C3 sweep over the new strings.** `POSTURE_FLOW`'s labels and `what` text carry no title
    term (reuse the bank group's existing title-term list and its positive control).
  - **case 37 — `resumeMismatch`.** Null when depth and normalised vector agree, including `{}` vs `null` vs
    `undefined` all reading as no-vector, and a five-key preset vs the same vector re-spelled. Non-null and
    NAMING the recorded depth on a depth mismatch, the recorded vector on a vector mismatch, and both on
    both. **The create case**: build a head with `openSession`'s own write literal shape from a posted set and
    assert null — that is the "never fires on a create" claim. Total over a junk head (null). Junk facets
    throw the BANK's error (drive it, match the message).
  - **case 38 — the config's three new keys.** `postureFlow` identical to `POSTURE_FLOW`; `modules` keyed by
    `FACETS`' ids with each `label`/`budget` equal to `MODULES[id]`'s; `facetPlans` **33 rows**, and every
    row compared by DRIVING `facetPlan` over the vector its key encodes — including the `''` row against
    `facetPlan(null)`. Assert the key encoding is `FACETS` order by checking one asymmetric vector
    (`{hasModel:true}` → `'10000'`, not `'00001'`). Assert no `weakAnswer` / `note` / `provenanceNote`
    anywhere in the serialised config (extend the existing case that does this rather than writing a second).
  - **case 39 — `sessionView.ledger`.** Over a TEMP root: write a run.json, an answers.jsonl and a
    transcript.jsonl by hand, call `sessionView`, and assert `ledger` equals `ledgerView` over the same op
    lines with `type`/`ts` stripped. Assert a `text` and a `denied` line contribute nothing.
  - **case 40 — the route's 409, source-pinned.** `portal/server.mjs`'s session POST branch calls
    `resumeMismatch` AFTER `openSession` (match the order in the source text), answers `409`, and the
    boundary catch-all at the end is still the flat `json(res, 500, { error: e.message })` with no status
    taxonomy added.
  - **case 41 — the drawer, source-pinned** (`portal/public/portal.js`, the ONLY shape available — portal.js
    touches the DOM at module scope; copy case 20's approach and **leave case 20's three spans untouched**):
    - `#discovery-posture` is gone and `renderDiscoveryFlow` is present.
    - The facet key join in the drawer maps over `config.facets` (not a literal id list) — assert the source
      contains no hardcoded facet id string.
    - No greedy-walk loop: assert the drawer reads `facetPlans[` and contains no `budget` arithmetic.
    - The Start handler POSTs `facets` and refuses on `overflow.length` before the POST — **gated on
      `composes`**, matching `selectDepth`'s own condition. Pin that the `composes` guard appears in BOTH the
      plan-note render and the Start refusal; a client refusal wider than `bank.mjs:1098`'s is a legal session
      the drawer will not open.
    - The plan note's `composes` branch is FIRST — pin that no `plan.count` interpolation appears before it,
      because `facetPlan` is depth-blind (`bank.mjs:1069-1071`) and a scope-check session must never be told
      it is 16 questions long.
    - `renderPackageView` reads `ledger.counts` / `ledger.flags` and contains no `.filter(` over
      `ledger.decisions` for a count (the "no derivation" rule, as a text pin).
  - **case 42 — `portal.css`, source-pinned.** `.discovery-check` carries `min-height: 44px`; the
    `input:not([type="checkbox"])` (or the explicit override) exists so the 44px input rule does not swell
    the checkboxes; `.discovery-flow-steps .btn` (or the drawer `.btn` rule) carries `min-width: 44px`.
- **IMPLEMENT (the headline)**: extend group 30's description string with a `· #288 added THE WIDTH: …`
  clause naming what is proven, and extend its **"What it cannot reach"** tail with: *the drawer's rendered
  geometry — the 44×44 commitment is measured in a browser and recorded in the PR report, because the portal
  is not in #271's VR page set; and whether a person can answer a facet box without having done the discovery
  (D2's wrong-if), which only a real intake shows.*
- **PATTERN**: case 20 (`build-checks.mjs:6232-6265`) for the source pins; case 33 for a config-key pin.
- **GOTCHA**: group 30 must stay SDK-free and load with no `portal/node_modules`. The new cases import
  `portal/lib/discovery.mjs` (already imported) and read `portal/public/*` as TEXT.
- **VALIDATE**: `node tooling/build-checks.mjs` — all groups green; the discovery group's line names the new
  clause.
- **SATISFIES**: AC #1, #4, #6 (the gate half of each).

---

### UPDATE `.claude/references/gates.md`

- **IMPLEMENT**: extend group 29's and group 30's entries with one sentence each naming the new coverage and
  its stated boundary. **Do not** add a new group; the count stays 34.
- **GOTCHA**: `CLAUDE.md`'s architecture map says "34 PURE groups" — unchanged, so `CLAUDE.md` is NOT edited
  by this ticket. Verify that before touching it.
- **VALIDATE**: `grep -n "34 PURE groups" CLAUDE.md` → still one hit, unchanged.
- **SATISFIES**: the repo's own gate-documentation convention.

---

### RUN the validation suite

- **IMPLEMENT**: the four commands in **VALIDATION COMMANDS** below, in order, and record each result.
- **VALIDATE**: all green; the browser measurement returns `[]`.
- **SATISFIES**: AC #7, AC #5.

---

## TESTING STRATEGY

There is no test suite, no linter and no type-check in this repo (`CLAUDE.md` §Ground rules — *"don't hunt
for or invent one"*). "Done" means the gate ran and the surface you touched runs.

### Unit-equivalent — `tooling/build-checks.mjs`

Groups 29 and 30 are the unit tests. Every pure function added here is driven, not grepped — the repo's own
rule from the memory `the check that cannot fail`: **mutate the source; run the function.** For each new
assertion, prove it can go red: break the thing it checks, watch the case fail, restore.

### Integration-equivalent — the portal smoke

Boot the portal on a private port and run a real session end to end. This is the ONLY check that reaches the
drawer, because `portal.js` touches the DOM at module scope and no CI group can import it.

### Edge Cases

| Case | Expected |
|---|---|
| Entry = existing PRD | one flow button (Grill), enabled; the other two absent, not disabled-but-present |
| Three facets ticked | the note names the two that fit and the one that does not, with its budget; Start refuses before the POST |
| No facet ticked, no preset pressed | `facets: null` on the wire — the unfaceted thirty, and the note says so |
| Consumer preset pressed | a DECLARED all-five-false vector (16 questions), visibly different from the line above |
| Depth = scope-check with a vector | the vector is recorded and the note says it does not change this depth's list (D1b) — **and no count is rendered**, because `facetPlan` describes full discovery only |
| Depth = scope-check with THREE facets ticked | **200, not a refusal** — `selectDepth` only throws on overflow at full discovery, so the client refusal must be gated on `composes` |
| Depth = `whole-bank` with a vector | same as scope-check: recorded, no count, no overflow message. The depth most likely to be ticked against by mistake |
| Resume with a differing depth | 409, naming the recorded depth and vector; the package untouched |
| Resume with the SAME depth and vector | 200, the disk state, exactly as today |
| Create (no existing run) | 200 always — `resumeMismatch` is null by construction; assert this in the gate |
| Empty ledger | the package view says what the package holds (answers, no ops), not an empty box |
| A superseded decision | present, marked `superseded by seq N`, dimmed — never removed |
| An audit resume with a document in the POST | the stored document's md5 is shown and the note says the POST's was ignored |
| A `text` or `denied` transcript line | contributes nothing to `ledger`; `readPackage` would REFUSE an unknown type but `sessionView` filters — the comment must say why they differ |
| Reload mid-session | everything comes back from disk; no client-side accumulation anywhere |

---

## VALIDATION COMMANDS

Execute every command. Record the actual output in the PR report — a claim with no run behind it is not a
result.

### Level 1: Syntax

```bash
node --check discovery/ops.mjs
node --check portal/lib/discovery.mjs
node --check portal/server.mjs
node --check portal/public/portal.js
node --check tooling/build-checks.mjs
```

(There is no linter and no type-check. `node --check` on every edited `.mjs` is the equivalent, and CI's
`verify` job runs it over every tracked `.mjs` — memory `drift-check syntax-checks parked .mjs`.)

### Level 2: The CI gate

```bash
node tooling/build-checks.mjs
node tooling/drift-check.mjs
node tooling/token-lint.mjs
```

All three are the `verify` job's legs. Run all three even though this is portal-only (memory
`piv-skills-python-tuned` — the owner's call, 2026-09-03: never skip as n/a).

### Level 3: The portal smoke

```bash
cd portal && npm install --silent
PORT=4791 npm start &          # a private port — never pkill -f 'node server.mjs' (memory: it kills
                               # sibling sessions' recorders). Kill by PID or port only.
sleep 2
curl -s http://127.0.0.1:4791/api/health
curl -s http://127.0.0.1:4791/api/discovery/config | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);console.log('flow',c.postureFlow.length,'plans',Object.keys(c.facetPlans).length,'modules',Object.keys(c.modules).length)})"
# the 409:
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:4791/api/discovery/session \
  -H 'content-type: application/json' \
  -d '{"slug":"instrument-loans-1","provenance":"fictional","entryMode":"blank-idea","depth":"scope-check","frontEnd":"portal","posture":"think"}'
# the ledger:
curl -s "http://127.0.0.1:4791/api/discovery/session?slug=instrument-loans-1&provenance=fictional" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const v=JSON.parse(s);console.log(v.ledger.counts,v.ledger.flags)})"
```

Expect: `flow 3 plans 33 modules 5`, `409`, and counts matching the committed package.

### Level 4: Manual validation, in a real browser

1. `open http://127.0.0.1:4791` → Discovery. Three numbered buttons render, Think selected, its Opus variant
   checkbox visible.
2. Switch Entry to "An existing PRD" → one button (Grill), the document field shown, the variant row hidden.
3. Tick `hasModel` + `regulated` + `internal` → the note names the two that fit and the one that does not.
4. Press each preset in turn → five checkboxes move together; the note follows.
5. Start a NEW fictional slug at `scope-check` with no vector, answer one question, and confirm the package
   view fills as the ops land. **This spends real tokens — one turn is enough.**
6. Reload the page mid-session, resume the same slug at the SAME depth → 200; then try a different depth →
   the 409 message renders as prose in the drawer.
7. **The 44×44 measurement**, both viewports, with the snippet from the CSS task. Paste the `[]` into the PR
   report with the viewport sizes and the browser.

### Level 5: What NOT to run

- **Not** the visual-regression gate. The portal is not in the VR page set and no shipped page changed;
  running it churns nothing and proves nothing.
- **Not** the journey drivers. None of them opens the portal.

---

## ACCEPTANCE CRITERIA

Traced to #288's own list, in its order.

- [ ] **AC #1** — The three buttons run the three postures; the entry mode is chosen once and recorded in
      `run.json`. *(Phases 3, 1D — the flow buttons + the 409 that makes "once" enforceable.)*
- [ ] **AC #2** — Depth choice at session start, proposed by the agent and confirmed by the human, before
      question one. *(Landed in #285; **verify it still holds** after the facet control changes the depth
      note — the "Proposed for …; Start confirms it" sentence must survive verbatim.)*
- [ ] **AC #3** — The one-question surface streams a turn over SSE and shows the question, its attribution,
      the answer box, the pushback and what was recorded. *(Landed in #284/#286; **verify** it survives the
      flow-button edit — the submit handler and `renderDiscoverySession` are both touched.)*
- [ ] **AC #4** — The package view reads the run package and **nothing else**. *(Phase 5, backed by
      `ledgerView` + the group-29 cross-reader case.)*
- [ ] **AC #5** — Every interactive target is 44×44 or larger, checked by review and recorded in the PR
      report with the reason no gate covers it. *(Phase 8, Level 4 step 7.)*
- [ ] **AC #6** — The config route is the single source of the bank and the depth/branch options; the UI
      holds no second copy. *(Phases 2–4, backed by group-30 cases 38 and 41.)*
- [ ] **AC #7** — Portal boots, `/api/health` answers, a session runs end to end under the neutral shell.
      *(Level 3 + Level 4.)*

Plus the repo's standing bars:

- [ ] `node tooling/build-checks.mjs` green, with every new case proven able to go red.
- [ ] No shipped-page change; no VR baseline regen; no `param-manifest.json` entry; no `loc-summary` drift.
- [ ] C2 (no AI slop) run over every new UI string and every new comment; C3 (no job titles) over the same.
- [ ] The PR body carries `Closes #288`; the plan, the report and the review are in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's validation ran and passed at the time it was written
- [ ] Levels 1–4 all executed, outputs recorded
- [ ] Every new gate case proven able to fail (break it, see red, restore)
- [ ] The 44×44 measurement pasted into the PR report with viewport and browser named
- [ ] Manual browser pass confirms the flow, the facets, the overflow refusal, the 409 and the package view
- [ ] Acceptance criteria all met, including the two inherited ones re-verified
- [ ] `.claude/reports/discovery-portal-width-288-report.md` written

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — the "ask something else" input.** #288's body lists it as landing ("the escape hatch's surface; its
filing rules are #289's job"). The owner's 2026-09-04 scoping comment omits it, and **#288's own ACs never
mention it** — there is no criterion it satisfies. It also has no route: `/api/discovery/turn` takes a banked
`questionId`, and posting off-script text to it would file against the wrong question.
**Recommendation: defer to #289**, which owns the off-script turn and the filing rules together. Phase 6
above is the one-phase addition if the owner disagrees. *This is the one question that changes the shipped
surface; everything else below changes only detail.*

**Q2 — should the 409 also fire on a differing `posture`, `model` or `entryMode`?** The owner's comment names
"another depth or vector" and this plan implements exactly that. A posture mismatch on a resume is the same
class of silent-wrong (the run continues under the recorded posture, not the requested one), and `entryMode`
is worse — a blank-idea POST over an audit run would show an answer box the server will refuse.
**Recommendation: add `entryMode` and `posture` to the comparison** (one more line each, same message
shape). Held out of the tasks above because the ticket names two fields, and widening a refusal is the
owner's call. Say the word and it is a two-line change plus one gate case.

**Q3 — the Think-on-Opus variant's placement.** MVP 1 says three buttons; `POSTURES` holds four. This plan
puts `think-opus` as a checkbox on the Think step, because it is the same prompt on another model — a
comparison, not a fourth stance (the module header says exactly that). The alternative is four buttons,
which reads more plainly but breaks the AC's "three buttons" wording. **Assumption: the checkbox.**

**A1 — posture is per-run and stays so.** Verified: `run.json` records one `posture` (README §run.json:277-279),
`runTurn` resolves it from `head.posture` (`discovery.mjs:919`), and `turnStats` stamps that posture's
fingerprint on every turn with groups 32/33 comparing the stamps live. "Pressable in order" is therefore a
flow across runs. If the owner meant a mid-run switch, this plan is wrong at the root and the ticket needs
re-scoping — flag before Phase 1.

**A2 — the 32-row plan table is served rather than computed.** `facetPlan` is pure and takes no depth, so
every row is static. The alternative (a `GET /api/discovery/plan?facets=…` per checkbox tick) is a round trip
per interaction for the same answer.

**A3 — `ledgerView` lives in `discovery/ops.mjs`, not the drawer and not `prd-projection.mjs`.** This exceeds
#288's stated file list (`portal.js` · `portal.css` · `server.mjs` config surface only) and the plan says so
deliberately. The reason is AC #4's wording: a fold written inline in `portal.js` is a claim-generating
surface no gate can reach, and the repo's own precedent — `turnEvent`, `stepEvent`, `proposalsView` — is an
exported pure fold the route serves. Adding a fifth op verb would take the epic's op-verb lock; **a pure read
does not**, and the header sentence says so.

**A4 — group 29 and group 30 both grow; the group COUNT stays 34.** So `CLAUDE.md`'s architecture map is
untouched. Verify before editing it.

**A5 — the drawer holds exactly one derived line**: the facet bit-key join. It is one `.map().join('')` over
`config.facets`, and group-30 case 41 source-pins that it maps the config rather than a literal list. Any
second derivation in the browser is a bug against AC #6.

---

## NOTES (open canvas)

### What is already landed, so you do not rebuild it

Read this before writing a line — roughly two thirds of #288's body describes surface that shipped in the
dependencies.

| #288 body says | State | Where |
|---|---|---|
| Both ways in — blank idea → Think, existing PRD → Grill | **landed (#286)** | `entryModes` + `entryPostures` on the config; `renderDiscoveryEntry` |
| The depth choice at session start, agent proposes / human confirms | **landed (#285)** | `DEPTH_PROPOSAL`; the depth note's "Proposed for …; Start confirms it" |
| The one-question surface over SSE with attribution, answer box, pushback, what was recorded | **landed (#284, #286)** | `renderDiscoverySession`, the `submit` handler, `renderDiscoveryRecorded` |
| Three buttons — Think · Create PRD · Grill, pressable in order | **NOT landed** — a `<select>` | this ticket, Phase 3 |
| The facet checkboxes and presets | **NOT landed** — the config serves them, the drawer ignores them | this ticket, Phase 4 |
| A running package view | **NOT landed** | this ticket, Phase 5 |
| The differing-POST 409 | **NOT landed** (PR #365 F6) | this ticket, Phase 1D + 2 |
| The "ask something else" input | **deferred** | Q1 → #289 |

### Alternatives weighed and rejected

**Mid-run posture switching (three buttons that change the stance of the SAME run).** Rejected: `turnStats`
stamps a posture fingerprint per turn and groups 32/33 compare those stamps live against committed fixtures.
A package whose turns ran under three fingerprints would make the graded fixtures' claim ("this recording ran
under prompt surface X") unstatable. The three-runs reading also composes with what already exists: Think's
run → Download PRD → open a NEW run at `existing-prd` with that PRD as the document → Grill audits it. That
chain is #286 + #290 already working; the flow band just makes it visible.

**Computing the overflow in the browser.** Rejected on AC #6 — it is a second copy of D1a's greedy walk, and
`facetPlan`'s own comment warns that `fits` is not necessarily a prefix of `fired`, which is precisely the
kind of subtlety a reimplementation gets wrong.

**A `GET /api/discovery/plan` route.** Rejected: a round trip per checkbox tick for a static answer. 33 rows
is 4 KB.

**Reusing `indexOps` by exporting it from `prd-projection.mjs`.** Rejected: it is shaped for the markdown
fold (it returns Maps, and `visible` is a projection concern). Mirroring the rule and having the gate compare
both readers on one committed fixture is the honest version — and it is what catches a drift, which importing
would hide by construction.

**Deriving the package view's counts in `renderPackageView`.** Rejected explicitly by AC #4's wording. The
counts come off the fold or they are a claim the ops did not make.

### Sequencing and risk

The riskiest edit is the posture `<select>` removal, because `portal.js` binds listeners at module scope: a
`$('#discovery-posture')` left behind throws on load and takes the entire portal SPA down — not just the
drawer. Three call sites (`discoveryEls`, `renderDiscoveryEntry`, `renderDiscoveryModel`) plus one listener
(line 804). Do all four in one edit and reload the page before moving on.

Second riskiest: the 44px input rule already in `portal.css` will swell the new checkboxes into 44px-tall
boxes. It looks broken rather than failing, so it is easy to ship. The CSS task names the fix.

Phases 3, 4 and 5 touch different DOM and different handlers — they can run in parallel worktrees if you want
them to. Phase 7's gate cases cannot start until all three land, because case 41's source pins read the
finished `portal.js`.

### The honesty line this ticket must not cross

The package view renders the ops. It does not summarise them, does not infer a parent chain, does not
recompute a flag. Every one of those would be the drawer authoring a claim, and the whole epic rests on the
opposite: the record is the truth and the surface is a reader of it. When a rendering decision is ambiguous,
the tiebreak is "which version can be wrong about the package?" — and pick the other one.

---

## AMENDMENTS

<!-- Append-only. Newest at the bottom. -->
