# Feature: The run package → PRD projection (`discovery/prd-projection.mjs`) — a pure fold over the ops (#290)

The following plan should be complete, but it is important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files —
`discovery/ops.mjs` and `discovery/bank.mjs` only; **never** `portal/lib/*`.

## Feature Description

A discovery run leaves three files on disk: `run.json` (the header), `answers.jsonl` (everything the human
typed, server-written and verbatim) and `transcript.jsonl` (append-only `text` · `op` · `denied` lines). This
ticket adds the fourth: `prd.md`, **projected** from the `op` lines into the house PRD shape — problem ·
evidence · hypothesis · users · MVP · metrics · non-goals · open questions — plus a transition note and a
rendered requirement hierarchy, and then edited by the human.

The load-bearing property is not the markdown. It is that the projection is a **pure fold over the ops and
nothing else**, so a generated PRD can never carry a claim the ops do not. Everything in the output resolves
to one of five sources: an op's own params (`wrong_if`, `reason`, `missing[]`, `level`, `provenance`, `url`),
an answer resolved by `answer_ref` (the human's own verbatim words), a bank question resolved by
`question_id` (a definition, not a claim), the applier's derived fields (`seq`, `flagged`, `supersedes`), or
`run.json`'s header. Nothing else has a route to the page.

This is the artefact handed to `plan-architecture` next, and it is what makes a discovery session worth
having.

## User Story

As the owner running a discovery session in the portal
I want the run package folded into a PRD in the house shape, with every section traceable to a filed op
So that I leave a session with an editable PRD instead of a directory of JSONL, and nobody has to trust that
its claims came from the run — the projection structurally cannot invent one.

## Problem Statement

After #281 (the op grammar), #282 (the bank) and #284 (the spine), a run package holds decisions, flags,
parked questions and evidence rows in `transcript.jsonl` — machine-readable, auditable, and unreadable as a
product document. The epic's hypothesis ends at "a generated PRD whose every decision carries an evidence
link and a kill criterion"; without the projection the run stops one step short of the artefact the whole
session exists to produce, and the "Completion" metric (*run 1 reaches a generated PRD in one sitting*) has
nothing to measure.

The alternative — a human or an agent writing the PRD from the package — reintroduces exactly the gap the
epic set out to close: prose that cannot be shown to have come from the ops.

## Solution Statement

One new module, `discovery/prd-projection.mjs`, in two halves, mirroring `agent-layer/gen-replay.mjs`:

1. **A pure core.** `projectPrd({ run, answers, ops })` → a markdown string. No filesystem, no clock, no
   network, no SDK. Same input, byte-identical output. This is the half `tooling/build-checks.mjs` group 31
   drives over an in-memory fixture.
2. **A thin filesystem shell.** `readPackage(root)` reads the three files; `writePrd(root, opts)` writes
   `prd.md` and **refuses to overwrite an existing one unless `--force`**, because the human edits it. A
   standalone CLI guard runs both: `node discovery/prd-projection.mjs <slug> [--stdout] [--force]`.

The section map is a frozen `SECTIONS` table — one row per PRD section naming its **axis** (which property of
the records selects it) and the reason. Two axes only:

- **the ladder axis** — `business` → Problem, `stakeholder` → Target user and JTBD, `solution` → MVP,
  `transition` → Transition note. A decision renders in **exactly one** place: its ladder section.
- **the op-kind axis** — `file_evidence` → Evidence, `open_question` → Open questions,
  `flag_weak_answer` → Weak answers.

Everything else (Hypothesis, Success metrics, Non-goals) **cross-references decisions by `seq`** rather than
re-rendering them, so nothing appears twice and every section still traces to ops.

## Out of Scope / Non-Goals

- **Not included: a `prd.md` committed into `discovery/spine-meridian-1/`.** Manual validation runs the CLI
  against that package with `--stdout` only. It is a three-question scope-check with no business or
  stakeholder decisions in it, so it projects as mostly TBD, and it is outside this ticket's named files.
- **Not included: an on-disk fixture package.** The gate fixture is **inline in `tooling/build-checks.mjs`**.
  A `discovery/<slug>/`-shaped directory holding a typed `transcript.jsonl` is precisely what
  `discovery/README.md` forbids ("never hand-write a transcript, an answer or an op — not one line"), and an
  on-disk fixture is the thing that could later be mistaken for, or copied into, a real run package.
- **Not included: a drift-check entry.** `prd.md` is generated **and then edited by the human**, so it is the
  one generated artifact deliberately outside `tooling/drift-check.mjs`. Do not add it there.
- **Not included: the not-a-form counter or opening-set coverage.** Those are #285's, and group 29 already
  proves the arithmetic is derivable from the records.
- **Not included: the existing-PRD audit mode's output shape** (#286), the escape-hatch affordances (#289),
  the read fence (#287), or any portal UI. The projection is a Node module with a CLI; **no page and no
  portal route reads it in this ticket.**
- **Not included: a fifth op verb, or any edit to `OPS` / `PARAMS` / the applier switch.** The epic's op-verb
  lock stands. If the projection wants something the ops do not carry, the answer is "it does not appear".
- **Not changing:** `discovery/ops.mjs`, `discovery/bank.mjs`, `portal/lib/discovery*.mjs`, any committed run
  package, any shipped page, any generated artifact, any VR baseline.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (pure logic + a large gate; no new dependency, no UI, no network)
**Primary Systems Affected**: `discovery/` (new module) · `tooling/build-checks.mjs` (group 31) ·
`discovery/README.md` · `docs/epics/discovery-partner.architecture.md` · `CLAUDE.md` (one index line)
**Dependencies**: none. Zero-dep Node ESM. Imports `discovery/ops.mjs`, `discovery/bank.mjs`, and
`node:fs` / `node:path` / `node:url` in the shell half only.

## Related Work

**Implements**: [#290](https://github.com/linardsb/ux-factory/issues/290) · **Epic**:
[#279](https://github.com/linardsb/ux-factory/issues/279), `docs/epics/discovery-partner.architecture.md`
(+ `docs/epics/discovery-partner.prd.md` MVP 10, 11)

**Back-references**

- `.claude/plans/discovery-ops-applier-281.md` — the op grammar and the applier this folds over; group 29 is
  the gate idiom to mirror.
- `.claude/plans/discovery-spine-run-package-284.md` — the run package on disk, `run.json`'s fields, the
  transcript line shapes, group 30's structure.
- `.claude/plans/discovery-bank-282.md` — `questionById`, the entry shape, and the rule that ids are stable.

**Forward-references**

- #291 / #292 (runs 1 and 2) consume this — the "Completion" metric is *the PRD is generated*.
- #285 owns the not-a-form counter and coverage; #288 may later surface `prd.md` in the portal.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `discovery/ops.mjs` (whole file, 226 lines) — the op vocabulary, the record shape, the six invariants.
  **The record's exact fields are `{ seq, turn, op, params, closes, flagged, supersedes }`.** Exports you
  need: `OPS`, `PARAMS`, `LEVELS`, `PROVENANCE`, `SOURCES`, `FLAGS`. You do **not** need `applyOp` /
  `applyOps` in the projection — see GOTCHA "do not re-fold".
- `discovery/README.md` (whole file, 193 lines) — the run-package format, the honesty rules, the file shapes
  (`answers.jsonl`, `transcript.jsonl`, `run.json`), the op table, refuse-vs-flag, R2, supersede. **This file
  is the contract; the module conforms to it, not the other way round.**
- `discovery/bank.mjs` lines 1–110 (the header's editorial rules + the entry shape) and the `questionById`
  selector near line 779 — the entry shape is
  `{ id, stage, text, attribution, label, provenanceNote?, weakAnswer, note? }` and `questionById` is
  **total** (returns `null`, never throws).
- `agent-layer/gen-replay.mjs` lines 1–60 and the last 30 lines — **the pattern to mirror**: a pure
  projection function the gate drives over synthetic rows, a filesystem shell around it, paths resolved from
  the module (not `cwd`), and the `pathToFileURL` standalone guard (this repo's path contains a space — a
  naive `file://${argv[1]}` comparison never matches).
- `tooling/build-checks.mjs` lines 1–30 (the header's exception list), lines 190–215 (the discovery
  imports), lines 5290–5360 (group 29's fixture idiom: `threw` / `msg` / `names` / `same`, the `VALID_FOR`
  roster fixture, and `applyDiscoveryOps(HAPPY, ctx())`), and lines 5640–5824 (group 30's structure and its
  closing `group("discovery", …)` line naming what it cannot reach).
- `tooling/build-checks.mjs` the file's last 8 lines — `console.log("\nbuild ✓  all 30 groups pass")`. **This
  string must become 31.**
- `discovery/spine-meridian-1/{run.json,answers.jsonl,transcript.jsonl}` — the only real package that exists.
  Read all three: they are what the CLI must parse. Note `branch: null`, `posture: "think"`, and that the
  transcript holds a `denied` line the projection must skip.
- `docs/epics/discovery-partner.architecture.md` §Data model (lines 116–207, especially the last bullet:
  *"The generated PRD is a pure fold over the ops … Placement at slicing"*) and §Open questions (lines
  347–366, the *"Where the PRD projection lives"* line **this ticket closes**).
- `docs/epics/discovery-partner.prd.md` MVP 10 (the three rules) and MVP 11 (the generated PRD).
- `.claude/skills/plan-create-prd/SKILL.md` lines 99–140 — **the house PRD shape**, section by section, and
  the anti-fluff rule (*unknown → write "TBD — needs validation"*) this projection reuses verbatim for empty
  sections, plus the `Architecture: _TBD — see plan-architecture_` cross-link placeholder at the bottom.
- `docs/research/requirements-hierarchy.md` lines 12–18 — what a transition requirement **is** (data
  migration, training materials, support setup, business continuity). One sentence of it belongs in the
  transition note's n/a line so a reader knows what was not elicited.

### New Files to Create

- `discovery/prd-projection.mjs` — the pure projection + its filesystem shell + the CLI guard (~380–520
  lines including the header).

### Files to Update

- `tooling/build-checks.mjs` — the header index (`31 prd projection`), the import line, **group 31**, and the
  `all 30 groups pass` → `31`.
- `discovery/README.md` — the `prd.md` bullet in the honesty block, the Files block's one-line description,
  a **PRD projection** section (the section table + the CLI), and the Workflow block's command list.
- `docs/epics/discovery-partner.architecture.md` — close §Open questions' *"Where the PRD projection lives"*
  (keep the line, mark it `[x]` with the answer and the reason) and replace §Data model's *"Placement at
  slicing"* with the decided path.
- `CLAUDE.md` — the architecture map's `discovery/` line gains `prd-projection.mjs`. **Beyond the ticket's
  estimate on purpose**: the map is an index of what each file *is*, and a new tracked module in `discovery/`
  with no entry makes it stale. One clause, no invariant restated.

### Relevant Documentation

- No external library documentation is needed — zero dependencies.
- [CommonMark: fenced code / tables](https://spec.commonmark.org/0.31.2/#tables-extension) — only relevant
  fact: a `|` inside a table cell must be escaped as `\|`, which is why arbitrary human text renders as
  blockquotes and never as table cells (see GOTCHA "hostile answer text").

### Patterns to Follow

**Module header = the specification** (CLAUDE.md §Ground rules). Open with what/why + the governing doc, and
state the placement reasoning the ticket demands:

```js
// discovery/prd-projection.mjs — the run package projected into the house PRD shape: a PURE FOLD over
// the transcript's op lines (epic #279, ticket #290; architecture §Data model → "The generated PRD is a
// pure fold over the ops"; the house shape is .claude/skills/plan-create-prd/SKILL.md).
//
// It lives here and not in agent-layer/, and the reason is measurable rather than aesthetic:
// agent-layer/gen-loc-summary.mjs counts ^agent-layer/[^/]+\.mjs$ into system/loc-summary.json, which
// approach.html renders at view time and whose VR baselines would then churn — the tripwire the epic's
// standing rules name. discovery/ matches no loc group. (This closes the architecture doc's open
// question "Where the PRD projection lives".)
```

**The pure core / filesystem shell split** (`agent-layer/gen-replay.mjs:44`):

```js
// PURE — no filesystem and no clock, so tooling/build-checks.mjs can drive it over an in-memory package.
export function projectPrd({ run, answers, ops }) { … }
```

**Throws name the offending value** (`discovery/ops.mjs`, `agent-layer/lib.mjs`) — plain `Error`, no
taxonomy, no wrapping:

```js
throw new Error(`prd-projection: op line ${i} carries seq ${JSON.stringify(line.seq)} — seqs are 1-based and strictly increasing`);
```

**Frozen table + gate iteration** (`system/board-ops.mjs`'s `OPS`/`PARAMS`, group 29's `VALID_FOR`): a table a
consumer edits in one place, and a gate that iterates it so a new entry with no fixture fails **by name**
rather than being silently skipped.

**Standalone guard** (`agent-layer/gen-replay.mjs`, last 8 lines) — `pathToFileURL`, not
`` `file://${argv[1]}` ``.

**Totality** — every selector answers over junk rather than throwing, except at the boundary where a
corrupted package is refused by name.

---

## MODULE CONTRACT — the exact exports, decided here so no task invents a name

```js
// discovery/prd-projection.mjs

/** The section map. One row per PRD section. FROZEN at both levels. */
export const SECTIONS;      // [{ id, heading, axis, from, why, empty }]  — see the table below

/** The whole projection, PURE. Returns a markdown string ending in exactly one "\n". */
export function projectPrd({ run, answers, ops });

/** Refuse a corrupted op ledger by name. PURE. Returns the op lines, unchanged, as a new array. */
export function checkOpLines(lines);

/** fs. Reads run.json + answers.jsonl + transcript.jsonl. Returns { run, answers, ops }. */
export function readPackage(root);

/** fs. Projects and writes <root>/prd.md. Refuses to overwrite unless force. Returns { path, bytes, wrote }. */
export function writePrd(root, { force = false } = {});
```

`SECTIONS`, in output order — **this table is the answer to AC #2 and #3, and group 31 iterates it**:

| `id` | `heading` | `axis` | `from` | Why |
|---|---|---|---|---|
| `problem` | Problem | `ladder` | `business` decisions | the "what and why" rung |
| `evidence` | Evidence | `op-kind` | `file_evidence` | every row with its provenance label and the claim it backs |
| `hypothesis` | Hypothesis | `cross-ref` | `wrong_if` of business + stakeholder decisions | the falsifiers, by `seq`; never re-rendered |
| `users` | Target user and JTBD | `ladder` | `stakeholder` decisions | "what a user can do" |
| `mvp` | MVP | `ladder` | `solution` decisions | functional + non-functional |
| `metrics` | Success metrics | `cross-ref` | decisions whose question is stage 7, plus every `wrong_if` as a kill criterion | measurement is a stage, not a rung |
| `non-goals` | Non-goals | `cross-ref` | decisions on `s3-deliberately-not-doing` and `s4-out-of-bounds` | the two banked questions that ask what is excluded |
| `open-questions` | Open questions | `op-kind` | `open_question` | MVP 8's parked questions + MVP 9's off-script ones |
| `weak-answers` | Weak answers | `op-kind` | `flag_weak_answer` | `missing[]` needs a visible home or it is dropped |
| `transition` | Transition note | `ladder` | `transition` decisions | the pack's seventh artefact; explicit n/a otherwise |
| `hierarchy` | Requirement hierarchy | `derived` | every decision's `level` + `parent_id` | AC #3 — the ladder rendered, orphans marked |

Every row carries two more fields the table above elides for width:

- **`why`** — a real sentence. The table is documentation as well as a dispatch map.
- **`empty`** — **the exact string this section renders when its selection is empty.** Declared per row, not
  inferred by the gate. For ten rows it is `tbd("<why the run recorded nothing>")`; for `transition` it is
  the `**n/a**` paragraph (AC #4 makes that a different renderer on purpose). Declaring it on the row is what
  keeps the gate's vanishing-claim loop (31.7.1) free of a `transition` special case — and what keeps a
  future rung with its own bespoke empty state from re-introducing one.

**The three coverage rules group 31 asserts over this table:**

1. Every value in `LEVELS` appears as exactly one `ladder` row's `from`. A fifth rung fails by name.
2. Every verb in `OPS` is claimed by exactly one row — `record_decision` by the `ladder` rows collectively,
   the other three by their `op-kind` row. A fifth verb with no home fails by name.
3. Every `FLAGS` member is rendered inline on the record that carries it.

---

## IMPLEMENTATION PLAN

### Phase 1: The pure core

Everything with no filesystem in it: `SECTIONS`, `checkOpLines`, the resolvers (`answer_ref` → text,
`question_id` → bank entry, `seq` → record), the per-section renderers, and `projectPrd`.

### Phase 2: The filesystem shell + CLI

**Depends on:** Phase 1. `readPackage`, `writePrd` with its refuse-to-overwrite rule, and the standalone
guard with `--stdout` / `--force`.

### Phase 3: The gate — group 31

**Depends on:** Phase 1 (it drives the pure core; it never touches Phase 2's filesystem half).

The fixture, the happy projection, the coverage rules over `SECTIONS`, determinism and purity, the
**vanishing-claim mutations** (AC #6), the bank-exclusion assertions, hostile answer text, and totality.

### Phase 4: Docs — the four files

**Independent of Phase 3** (no code dependency; can be written in parallel, but land in the same commit).

`discovery/README.md`, the architecture doc's two edits, `CLAUDE.md`'s index line.

### Phase 5: Manual validation + the PR

`--stdout` against the real spine package, the full gate, the plan/report/review trio, `Closes #290`.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently testable.

### 0. PRE-FLIGHT — re-verify what this plan assumes about the tree (R15)

- **IMPLEMENT**: before writing a line. Parallel sessions share this worktree and the owner merges fast, so
  every fact below can have moved since the plan was written (2026-08-29):

```bash
git fetch origin main && git log --oneline -1 origin/main       # note the head; branch from THIS
gh pr list --state open --json number,headRefName               # any PR touching build-checks?
tail -3 tooling/build-checks.mjs                                # "all N groups pass" — the AUTHORITATIVE count
grep -n 'prd-projection\|"prd projection"\|31\.1 ' tooling/build-checks.mjs   # must be EMPTY
```

- **GOTCHA**: if a sibling PR already claims group 31, **renumber to the next free integer** everywhere —
  the header index, the case labels (`31.x` → `32.x`), the `group()` name and the verdict count. The
  collision is mechanical, but a silent duplicate is not: two groups numbered 31 makes a failure
  unattributable. Note the renumber in the report. If `main` moved, branch from the new head, not from the
  plan's assumed one.
- **GOTCHA (do not count `group(` calls)**: they are indented inside their block scopes and a
  `grep -c 'group("'` under-counts badly — it answers 12 against 30 real groups. **The `all N groups pass`
  line is the only authoritative count.** Counting the calls is exactly the kind of false signal the
  pre-flight exists to avoid.
- **VALIDATE**: the grep returns nothing, and `tail -3` reads `all 30 groups pass` (so 31 is the next).
- **SATISFIES**: risk register R15

### 1. CREATE `discovery/prd-projection.mjs` — the header, the imports and `SECTIONS`

- **IMPLEMENT**: The module header (the block quoted in *Patterns to Follow*, extended with: the pure-core /
  shell split and why; **why the bank import is not a violation** — `ops.mjs` invariant 6 names "the
  projection" as a caller that supplies the bank, and a question's *text* is a definition, not a claim about
  the product; **which bank fields are carried** — `id`, `text`, `attribution`, `stage`, `label` — and which
  are **excluded on purpose**: `weakAnswer` (the agent's rubric), `note` and `provenanceNote` (research
  commentary about the question, not about this product); **why `prd.md` is outside `drift-check`** — the
  human edits it, which is also why `writePrd` refuses to overwrite without `--force`). Then the imports and
  the frozen `SECTIONS` table exactly as specified in MODULE CONTRACT, each row carrying `{ id, heading,
  axis, from, why, empty }`, `Object.freeze`d at both levels. **`empty` is the declared empty-state string
  for that section** — `tbd(…)` for ten rows, the `**n/a**` paragraph for `transition`. A renderer that finds
  nothing to render returns its row's `empty`, and nothing else.
- **PATTERN**: header shape → `discovery/ops.mjs:1-30`; frozen-at-both-levels → `discovery/ops.mjs:40-48`
  (`Object.freeze` is shallow, so freeze each row too).
- **IMPORTS**: `import { FLAGS, LEVELS, OPS, PARAMS, PROVENANCE, SOURCES } from "./ops.mjs";` and
  `import { questionById } from "./bank.mjs";`. `node:fs` / `node:path` / `node:url` come in task 8.
- **GOTCHA**: **Never import anything under `portal/`.** `discovery/` modules sit below the portal, and
  `build-checks` must load this in an environment with no `portal/node_modules`.
- **VALIDATE**: `node -e "import('./discovery/prd-projection.mjs').then(m=>{const s=m.SECTIONS; console.log(s.length, s.map(r=>r.id).join(',')); s.push({}); }).catch(e=>{console.log('frozen ✓', e.message)})"`
- **SATISFIES**: AC #1, AC #2

### 2. ADD to `discovery/prd-projection.mjs` — `checkOpLines`, the corruption guard

- **IMPLEMENT**: `export function checkOpLines(lines)` — PURE, total, returns a **new** array of the same
  objects (no clone needed; nothing mutates them). Refusals, each a plain `Error` naming the index and the
  offending value:
  - `lines` not an array → throw.
  - a line that is not a plain object → throw naming the index.
  - `line.op` not in `OPS` → throw naming the op and listing `OPS`.
  - `Object.keys(line.params)` not exactly `PARAMS[line.op]` (same members; order need not match) → throw
    naming the op and the difference.
  - `line.seq` not an integer ≥ 1, or not strictly greater than the previous line's `seq` → throw naming the
    index and both seqs.
  - `line.flagged` not an array, or holding a member outside `FLAGS` → throw naming it.
  - `line.closes` not a boolean; `line.supersedes` neither `null` nor an integer → throw.
  - `record_decision`: `params.level` not in `LEVELS` → throw. `open_question`: `params.source` not in
    `SOURCES` → throw. `file_evidence`: `params.provenance` not in `PROVENANCE` → throw.
- **PATTERN**: the refusal style and message shape → `discovery/ops.mjs:checkOp` (lines ~76–96).
- **GOTCHA (R8)**: **Do not re-fold with `applyOps`.** `applyOps` refuses an item carrying `seq` / `closes` /
  `flagged` by design, and a re-derivation that disagreed with a committed package would throw on valid
  history. The recorded op lines are authoritative; this guard only catches a corrupted file.
- **VALIDATE**: `node -e "import('./discovery/prd-projection.mjs').then(m=>{const good=[{seq:1,turn:'t1',op:'file_evidence',params:{url:'https://a.test',ref:null,provenance:'assumption',claim_ref:null},closes:false,flagged:[],supersedes:null}]; console.log('good', m.checkOpLines(good).length); try{m.checkOpLines([{...good[0],seq:0}])}catch(e){console.log('bad seq ✓', e.message)}})"`
- **SATISFIES**: AC #1

### 3. ADD to `discovery/prd-projection.mjs` — the resolvers and the markdown helpers

- **IMPLEMENT**, all PURE and all total:
  - `const answerText = (answers, ref) => …` — returns the answer's `text`, or `null` if `ref` does not
    resolve. **A `null` renders as an explicit `_[answer a7 is not in answers.jsonl]_` marker, never as
    silence** — a projection that quietly dropped an unresolvable ref would hide a corrupted package.
  - `const questionFor = (id) => …` — `questionById(id)` narrowed to `{ id, text, attribution, stage,
    label }`, or `null` for `null` / an unknown id. **Never returns `weakAnswer`, `note` or
    `provenanceNote`.**
  - `const blockquote = (text) => …` — prefixes every line with `> `, collapses a trailing newline, and
    answers `> _[no text]_` for an empty string. **This is how all arbitrary human text reaches the page.**
  - `const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ")` — for table cells only
    (URLs, labels, seqs).
  - ``const tbd = (why) => `_TBD — ${why}._` `` — the house anti-fluff idiom from
    `plan-create-prd/SKILL.md:29`. Every empty section uses it, and the `why` names what the run did not
    record (e.g. `"the run recorded no business-level decision"`).
- **GOTCHA (hostile answer text — R7)**: a verbatim answer may contain `|`, a leading `#`, a leading `-`, or a
  fenced code block. Blockquotes make all of it inert — a `#` inside a `> ` line is not a heading and a
  fence inside a blockquote cannot escape it. **No human text ever enters a table cell.**
- **GOTCHA (never truncate — R3)**: there is **no length cap on an answer, a `wrong_if`, a `reason` or a
  `missing[]` entry**. `answers.jsonl` is verbatim by contract (`discovery/README.md`, honesty rules), and a
  truncated verbatim answer is a quietly altered one — the same class of failure as an edited transcript. A
  long PRD is the human's to trim in the edit pass. (`portal/lib/discovery.mjs`'s `TURN_EVENT_TEXT_MAX` caps
  the **SSE wire**, not the package; do not copy it here.)
- **VALIDATE**: covered by group 31 case 31.9 (hostile text). Spot-check:
  `node -e "import('./discovery/prd-projection.mjs').then(m=>console.log(typeof m.projectPrd))"`
- **SATISFIES**: AC #1, AC #5

### 4. ADD to `discovery/prd-projection.mjs` — the decision index and the supersede rule

- **IMPLEMENT**: from the checked op lines, build once:
  - `decisions` — every `record_decision` line, in `seq` order.
  - `latestByQuestion` — for each non-null `question_id`, the decision with the **highest `seq`**. Every
    other decision on that question is **replaced**. Decisions with `question_id: null` (off-script, MVP 9)
    are each their own and are never replaced.
  - `replacedBy` — a `Map<seq, seq>` so a replaced decision can name what replaced it.
  - `evidenceBySeq`, `decisionBySeq` — plain `Map`s for `evidence_refs[]` / `parent_id` / `claim_ref`
    resolution.
  - `rendered` — the set of decision seqs a ladder section will render: every latest decision, **plus** every
    replaced one (replaced decisions render inside their replacement's block as a "Replaced:" line, not as
    their own entry). Nothing is removed — `discovery/README.md` §Supersede: *"Both records stay; nothing is
    removed."*
- **PATTERN**: the applier already computes `supersedes` per record; this is the read side of the same rule.
  `discovery/ops.mjs:~200` (`findLast` on `question_id`).
- **GOTCHA**: an **off-script** decision on a banked question **does** supersede the banked one — the applier
  computes `supersedes` regardless of `off_script`. Key the index on `question_id` only, never on
  `off_script`.
- **VALIDATE**: group 31 case 31.6 drives a supersede pair and asserts both the latest rendering and the
  replaced one being named.
- **SATISFIES**: AC #2

### 5. ADD to `discovery/prd-projection.mjs` — `renderDecision`, the one block every ladder section uses

- **IMPLEMENT**: one decision → a markdown block. Exactly this shape, and **flags render inline on the
  record they belong to** (AC #2's "carried through rather than dropped"):

```markdown
#### seq 3 · `s4-out-of-bounds` — solution
> Out of bounds: no hardware or moisture sensors, ever. …            ← the human's answer, verbatim (a3)
*Question:* "What is out of bounds?" — Shape Up, out of bounds · OBSERVED (stage 4)
*Wrong if:* Work goes into hardware/moisture sensors, …
*Parent:* none · ⚠ **orphan** — a solution decision naming no stakeholder requirement
*Evidence:* none · ⚠ **no-evidence**
*Replaces:* seq 1 (kept in the ops)
*Filed:* off-script                                                   ← only when off_script is true
```

- Rules: `Parent:` renders `seq N (<level>)` when `parent_id` is non-null; `⚠ **orphan**` appears **only**
  when `flagged` holds `"orphan"` — read the flag, never re-derive it. `Evidence:` lists each
  `evidence_refs` entry as `seq N — <provenance> — <url or answer ref>`; `⚠ **no-evidence**` likewise comes
  from `flagged`. A `business` decision's `Parent:` reads `none — a business decision has no parent`, with no
  warning.
- **GOTCHA (R2)**: read `flagged` from the record. Re-deriving the flags here would create a second copy of the
  applier's rule that can drift — and group 29 already proves the applier's version.
- **VALIDATE**: group 31 cases 31.4 and 31.5.
- **SATISFIES**: AC #2, AC #3

### 6. ADD to `discovery/prd-projection.mjs` — the eleven section renderers

- **IMPLEMENT**, one function per `SECTIONS` row, each returning the section's body (the renderer does not
  write its own `## ` heading — `projectPrd` does, from `SECTIONS`):
  - **Problem / Target user and JTBD / MVP** — `renderDecision` over that rung's latest decisions, in `seq`
    order. Empty → `tbd("the run recorded no <rung>-level decision")`.
  - **Evidence** — a table: `| seq | Source | Provenance | Backs |`. Source is the `url` (as a markdown link)
    or `answer <ref>` when `ref` is set. Backs is `seq N` (`claim_ref`) or `—`. Below the table, one line per
    provenance label present, counted. Empty → `tbd("the run filed no evidence")`. **Then, always:** a
    *"Decisions resting on no evidence"* line listing the seqs of every decision `flagged` `no-evidence`, or
    "none".
  - **Hypothesis** — **reads `business` + `stakeholder` decisions only** (latest per question). It does
    **not** fall back to every decision — a falsifier for a screen-level choice is not a hypothesis about the
    product, and Success metrics' second table already carries every `wrong_if`. The two sections read
    deliberately different sets; do not smooth that over. One line per decision:
    `- **We'll know we're WRONG if** <wrong_if> — seq N`. Then, verbatim, the house reminder:
    `_The "We believe … will cause … resulting in" half is the human's to write: the ops carry falsifiers, not a belief statement._`
    Empty → `tbd("the run recorded no business- or stakeholder-level decision to falsify")`.
  - **Success metrics** — a table `| seq | Question | Kill criterion |` over **every** decision whose
    question's `stage === 7`, then a second table of **every** decision's `wrong_if` as a kill criterion,
    keyed by seq (**every** — this is the set Hypothesis deliberately does not read). No decision block is re-rendered. Empty → `tbd(…)` naming stage 7 by its label
    ("Measurement and kill criteria").
  - **Non-goals** — cross-references to decisions on `s3-deliberately-not-doing` and `s4-out-of-bounds`
    (`NON_GOAL_QUESTIONS`, a frozen const beside `SECTIONS`): `- seq N — <question text> (see MVP)`. Empty →
    `tbd("the run answered neither of the bank's two exclusion questions (s3-deliberately-not-doing, s4-out-of-bounds)")`.
  - **Open questions** — one block per `open_question` record: source (`banked` / `off-script`), the
    question (or *off-script*), the human's answer as a blockquote, and `*Parked because:* <reason>`. Empty →
    `tbd("the run parked no question")`.
  - **Weak answers** — one block per `flag_weak_answer`: the question, the answer as a blockquote, and
    `*Missing:*` as a bullet list of `missing[]`. Empty → `tbd("the run flagged no weak answer")`.
  - **Transition note** — `renderDecision` over `transition` decisions. When there are none, its row's
    declared `empty` — the **explicit n/a with its derived reason**, verbatim:
    `**n/a** — the run recorded no transition-level decision, so no organisational change was elicited. Transition requirements are implementation needs — data migration, training materials, support setup, business continuity (docs/research/requirements-hierarchy.md). Mark this section n/a with a reason, or run the questions that would elicit them.`
  - **Requirement hierarchy** — an indented tree over `LEVELS` order: each rung's latest decisions, each
    naming its parent's seq, orphans marked `⚠ orphan`. Then a counts line: `business N · stakeholder N ·
    solution N · transition N · orphans N`. Empty → `tbd("the run recorded no decision")`.
- **GOTCHA (R9)**: `stage === 7` and the two non-goal ids are **judgement calls pinned in one place**. Put
  `METRIC_STAGE = 7` and `NON_GOAL_QUESTIONS = Object.freeze(["s3-deliberately-not-doing", "s4-out-of-bounds"])`
  as named consts next to `SECTIONS`, and let group 31 assert each id **resolves through `questionById`** —
  so a bank rename fails loudly here instead of silently emptying a section.
- **VALIDATE**: group 31 cases 31.4–31.8.
- **SATISFIES**: AC #2, AC #3, AC #4

### 7. ADD to `discovery/prd-projection.mjs` — `projectPrd`, the whole page

- **IMPLEMENT**: `export function projectPrd({ run, answers, ops })` — PURE.
  1. Validate the three inputs by hand at the boundary and throw naming what is wrong (`run` a plain object
     with a non-empty `slug`; `answers` an array; `ops` an array). Then `checkOpLines(ops)`.
  2. **The honesty header**, first thing on the page, and the one line that is not derived from a record:

```markdown
# <slug> — PRD, projected from a discovery run

> **Projected, not authored.** Every claim below folds one run package —
> [`<root>`](<relative link>): `run.json`, `answers.jsonl`, and the `op` lines of `transcript.jsonl` — and
> nothing else. Generated by `discovery/prd-projection.mjs` (epic #279, #290). A claim the ops do not carry
> cannot appear here. **Edit freely: nothing regenerates this file, and re-running the projection refuses to
> overwrite it.**
```

  3. **The run line**, from `run.json` only: provenance + `label`, entry mode, depth, branch (`none` when
     null), front end, model, posture, `startedAt`, `endedAt` (or `open`), and a turn count from
     `turnStats.length`.
  4. **The ledger line**: total ops, a count per verb, and totals per `FLAGS` member.
  5. The eleven sections, `## <heading>` from `SECTIONS` in table order.
  6. The house cross-link placeholder, verbatim: `Architecture: _TBD — see plan-architecture_`.
  7. Return the string, ending in exactly one `\n`.
- **GOTCHA (determinism — R5)**: **no clock anywhere.** No `new Date()`, no `Date.now()`, no "generated at". Every
  date on the page comes from `run.json`. The link target is `run.root` (relative for a fictional run;
  printed as-is for a real one, whose root is outside this repo). Ordering is by `seq` or by `SECTIONS` order
  — **never by `Object.keys` iteration** — so the output cannot shift under a different Node.
- **GOTCHA (`run.json` is not a closed shape — R6)**: the real `spine-meridian-1/run.json` carries a `posture`
  field that `discovery/README.md`'s documented shape does not list, and `branch` / `endedAt` /
  `sessionId` are legitimately `null`. **Read every header field defensively and render an absent or null
  one as `—`.** The string `undefined` must never appear on the page: interpolating a missing field is the
  single most likely way this module ships a visible bug. (Group 30 case 11 asserts the same thing about the
  built posture prompt — mirror it.)
- **VALIDATE**:
  `node discovery/prd-projection.mjs spine-meridian-1 --stdout | head -40`
- **SATISFIES**: AC #1, AC #5

### 8. ADD to `discovery/prd-projection.mjs` — the filesystem shell and the CLI

- **IMPLEMENT**:
  - `const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")` — paths resolve from the module,
    never `cwd`.
  - `export function readPackage(root)` — reads `run.json` (JSON.parse, throw naming the path on a parse
    failure), `answers.jsonl` and `transcript.jsonl` (one `JSON.parse` per non-blank line, throwing with the
    **file and line number** on a bad line), then filters the transcript to `type === "op"` lines and strips
    `type` and `ts` so what reaches `projectPrd` is the applier's record shape. **An absent `answers.jsonl`
    or `transcript.jsonl` reads as `[]`; an absent `run.json` throws naming the path.**
  - `export function writePrd(root, { force = false } = {})` — `readPackage` → `projectPrd` → refuse if
    `prd.md` exists and `!force`, with a message naming the path **and telling the operator that the file is
    hand-edited and `--force` discards those edits**. Returns `{ path, bytes, wrote }`.
  - The standalone guard: `node discovery/prd-projection.mjs <slug> [--stdout] [--force] [--root <dir>]`.
    `<slug>` resolves to `join(ROOT, "discovery", slug)`; `--root` overrides it whole (a real run's package
    lives under `JOBS_DIR`, outside this repo). `--stdout` prints and writes nothing. Print
    `prd ✓  <slug> → <n> sections, <m> ops (discovery/<slug>/prd.md)`; on failure
    `prd ✗  <message>` and `process.exit(1)`.
- **PATTERN**: `agent-layer/gen-replay.mjs`'s last 20 lines — the `pathToFileURL` comparison, the `✓`/`✗`
  lines, `process.exit(1)`.
- **GOTCHA**: this repo's path contains a space. Use
  `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`, never
  `` `file://${process.argv[1]}` ``.
- **VALIDATE**:
  `node discovery/prd-projection.mjs spine-meridian-1 --stdout | wc -l` (expect > 40) and
  `node discovery/prd-projection.mjs no-such-slug ; echo "exit=$?"` (expect `prd ✗ …` naming the path,
  `exit=1`).
- **SATISFIES**: AC #1, AC #5

### 9. UPDATE `tooling/build-checks.mjs` — the header index and the import

- **IMPLEMENT**: after the `30 discovery` block in the header index, add:

```
//  31 prd projection the run package → PRD fold (discovery/prd-projection.mjs): SECTIONS iterated
//                    against LEVELS and OPS in both directions, the happy projection over a fixture
//                    package built by running the REAL applier, byte-identical determinism, the
//                    vanishing-claim mutations (delete an op, watch its section empty), the bank's
//                    rubric and research notes proven ABSENT, hostile answer text kept inert, and the
//                    corrupted-ledger refusals each driven (#290)
```
  Then the import, beside the existing discovery ones (~line 201):
  `import { checkOpLines, NON_GOAL_QUESTIONS, projectPrd, SECTIONS } from "../discovery/prd-projection.mjs";`
  with a one-line comment saying it is a zero-portal-dependency module in `discovery/`.
- **GOTCHA**: `readPackage` / `writePrd` are **not** imported. Group 31 never touches the filesystem — the
  fixture is in memory. (Group 30's temp-root idiom exists because a session writes; a projection does not.)
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -3`
- **SATISFIES**: AC #6

### 10. ADD `tooling/build-checks.mjs` — group 31's fixture

- **IMPLEMENT**: a new block after group 30's closing `group("discovery", …)` line, opening with the local
  helpers group 29 uses (`threw`, `msg`, `names`, `same`) — **redeclare them inside the block**; each group
  is its own scope.

  The fixture, **and the labelling the ticket requires**:

```js
// --- group 31: the PRD projection (#290) -----------------------------------------------------------
// THE FIXTURE IS A GATE FIXTURE, NOT A RUN. Nothing produces a full-width run package until #289
// lands, so this group drives a HAND-AUTHORED one: the ops, the answers and the run header below are
// written by hand for this gate. It is NOT run output, it must never be presented as one, and it must
// never be copied into a run package — discovery/README.md forbids a hand-written answer, transcript
// or op, and that rule is why this fixture lives INLINE here rather than as a discovery/<slug>/
// directory on disk that could later be mistaken for a real package.
//
// Only the ops, the answers and run.json are hand-written. The RECORDS are produced by running the
// real applier over them, so seq / closes / flagged / supersedes are discovery/ops.mjs's output and
// this group cannot drift from the applier's flagging rules.
```

  Then:
  - `PRD_ANSWERS` — 9 entries `{ ref: "a1"…"a9", text }`, using plausible prose for a fictional product.
    **One answer must contain hostile markdown**: a `|`, a line starting `# `, a line starting `- `, and a
    fenced code block.
  - `PRD_OPS` — hand-authored `{ op, params, turn }` items using **real bank ids** so `questionById`
    resolves, covering, in order: a `file_evidence` with a `url` and `secondary-source`; a `business`
    `record_decision` citing it; a `file_evidence` with a `ref` and `assumption`; a `stakeholder` decision
    parented to the business one; a `solution` decision parented to the stakeholder one; a **`solution`
    decision with `parent_id: null` and `evidence_refs: []`** (both flags at once); a `transition` decision
    parented to a solution one; a `flag_weak_answer`; an `open_question` with `source: "banked"`; an
    `open_question` with `source: "off-script"` and `question_id: null`; and a **second decision on an
    already-decided `question_id`, filed `off_script: true` on a later turn** (the supersede pair, R2-legal
    because off-script ops never close). Include `s3-deliberately-not-doing`, `s4-out-of-bounds` and at least
    one stage-7 question among the ids so the cross-ref sections have content.
  - `PRD_RUN` — a `run.json` literal with `"label": "Gate fixture — hand-authored for build-checks group 31, not a run"`,
    `slug: "gate-fixture"`, `root: "discovery/gate-fixture"`.
  - `const PRD_RECORDS = applyDiscoveryOps(PRD_OPS, { answers: PRD_ANSWERS, bank: BANK }).ops;`
  - `const project = (ops = PRD_RECORDS) => projectPrd({ run: PRD_RUN, answers: PRD_ANSWERS, ops });`
- **PATTERN**: group 29's `ANSWERS` / `BANK` / `ctx` / `VALID_FOR` fixture block (build-checks ~5300–5335).
- **GOTCHA**: `BANK` is the already-imported `QUESTIONS as BANK`. `applyOps`'s ctx wants
  `{ answers, bank, turn }` and each item carries its own `turn`; pass `turn` per item, not in ctx.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "prd projection"`
- **SATISFIES**: AC #6

### 11. ADD `tooling/build-checks.mjs` — group 31 cases 31.1–31.3: the table, the coverage, the positive control

- **IMPLEMENT**:
  - **31.1 the table.** `SECTIONS` frozen at both levels **by mutation** (a `push` refused and the length
    re-read; a write into a row refused and the value re-read). Every row has exactly the keys
    `id, heading, axis, from, why, empty`; ids unique; `axis` ∈ `{ladder, op-kind, cross-ref, derived}`;
    every `why` a non-empty sentence > 20 chars; **every `empty` a non-empty string, and the eleven `empty`
    strings all distinct** — a copy-pasted empty state would make 31.7.1 pass for the wrong reason.
  - **31.2 the coverage rules, both directions.**
    - every member of `LEVELS` is exactly one `ladder` row's `from`, and every `ladder` row's `from` is in
      `LEVELS` — a fifth rung, or a row naming a rung that does not exist, fails **by name**;
    - every verb in `OPS` is claimed: `record_decision` by the `ladder` rows, and each of the other three by
      exactly one `op-kind` row — **a fifth verb with no home fails by name** (the `VALID_FOR` idiom);
    - `NON_GOAL_QUESTIONS` has two entries and **each one resolves through `questionById`** (a bank rename
      goes red here, not silently);
    - `METRIC_STAGE` names a stage the bank actually holds (`STAGES.some(s => s.n === METRIC_STAGE)`).
  - **31.3 the positive control.** `project()` returns a non-empty string ending in exactly one `\n`, opens
    with `# gate-fixture — PRD, projected from a discovery run`, and carries **one `## ` heading per
    `SECTIONS` row, in table order** (assert the extracted heading list equals
    `SECTIONS.map(r => r.heading)`). Every refusal below means nothing unless this passes first.
- **PATTERN**: frozen-by-mutation → group 29's 28.1; positive-control-first → group 29's 28.2 comment.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "prd projection"`
- **SATISFIES**: AC #1, AC #2, AC #3

### 12. ADD `tooling/build-checks.mjs` — cases 31.4–31.6: the content, the flags, the hierarchy, supersede

- **IMPLEMENT**:
  - **31.4 every op reaches the page.** For each record in `PRD_RECORDS`, assert the projection carries its
    distinguishing string — a decision's `wrong_if`, a flag's `missing[0]`, an open question's `reason`, an
    evidence row's `url`. **Iterate the records**, so an op kind with no renderer fails by name rather than
    being skipped. Also: every `answer_ref` used resolves — the string `is not in answers.jsonl` must **not**
    appear.
  - **31.5 the flags render inline, not only as counts.** The fixture's both-flags decision: assert the
    output holds `orphan` and `no-evidence` **within the same decision block** (slice the output between that
    decision's `#### seq N` heading and the next `#### `, and assert both inside the slice). Assert every
    `FLAGS` member appears at least once. Then the **mutation**: re-project with that decision's `flagged`
    set to `[]` and assert both markers are gone from its block — proving the flags are **read from the
    record**, not re-derived.
  - **31.6 the hierarchy and supersede.** The Requirement hierarchy section names every `LEVELS` rung
    present, each child naming its parent's `seq`, and the orphan marked. The supersede pair: the **later**
    decision renders as a block and the **earlier** one is named as replaced (`Replaces: seq N`), and the
    earlier one does **not** get its own `#### seq` block. Assert both seqs appear somewhere (nothing is
    removed).
- **PATTERN**: the "proven by MUTATION rather than by construction" rule — the epic's central gate rule; see
  group 29's flag cases and `.claude/references/gates.md`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "prd projection"`
- **SATISFIES**: AC #2, AC #3

### 13. ADD `tooling/build-checks.mjs` — case 31.7: **the vanishing claim** (AC #6, the ticket's headline)

- **IMPLEMENT**: three mutations, each proving a claim cannot appear without its op.
  1. **Section by section.** For each `ladder` row — **all four, `transition` included** — re-project with
     that rung's decisions removed from the records and assert (a) the section body is **that row's declared
     `empty` string**, and (b) every one of those decisions' `wrong_if` strings is **absent from the whole
     document**. Asserting against the row's own `empty` rather than against a `TBD`-shaped string is what
     lets `transition`'s `**n/a**` paragraph go through the same loop: no special case here, and a future
     rung with a bespoke empty state is covered the day it lands.
  2. **The empty run.** `projectPrd({ run: PRD_RUN, answers: PRD_ANSWERS, ops: [] })` must still produce
     every `SECTIONS` heading, and must contain **none** of the fixture's claim strings — every `wrong_if`,
     every `reason`, every `missing[0]`, every evidence `url`. This is the strongest form of *"a claim not in
     the ops cannot appear"*: with no ops, no claim survives, even though every answer is still present in
     `answers`. **Also assert no answer text appears** — an answer reaches the page only through an op that
     references it.
  3. **The transition note, both directions** (AC #4). With the transition decision present, its `wrong_if`
     appears under `## Transition note` and the string `**n/a**` does not. With it removed, `**n/a**` appears
     with the reason naming `transition-level decision`, and the `wrong_if` is gone from the document.
- **GOTCHA**: assert against the **whole document**, not the section slice — a claim leaking into a different
  section is the failure this case exists to catch.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "prd projection"`
- **SATISFIES**: AC #4, AC #6

### 14. ADD `tooling/build-checks.mjs` — cases 31.8–31.11: exclusions, hostile text, determinism, totality

- **IMPLEMENT**:
  - **31.8 the bank's excluded fields.** For every question id the fixture uses, assert the projection
    contains **neither** that entry's `weakAnswer` **nor** its `note` **nor** its `provenanceNote` (skipping
    absent optionals), and that the literal keys `weakAnswer` / `provenanceNote` never appear. Then the
    positive control: the entry's `text`, `attribution` and `label` **do** appear, so the assertion is
    proving an exclusion rather than passing because the bank was never read. (Mirrors group 30 case 11's
    "the rubric never reaches the browser".)
  - **31.9 hostile answer text.** The fixture's hostile answer: assert the heading list is still exactly
    `SECTIONS.map(r => r.heading)` (a `# ` inside the answer became no heading), that every line of that
    answer in the output starts with `> `, and that a `|` in a **table** section did not add a column —
    project with the hostile text also as an evidence `url`-adjacent label and assert the Evidence table's
    row still splits into the same number of cells.
  - **31.10 determinism and purity.** Two calls with the same input are **byte-identical** (`===`, not deep
    equality). Assert no ISO-date-shaped string outside those in `PRD_RUN` appears in the output (regex
    `/\d{4}-\d{2}-\d{2}T/g`, every match must be a substring of `JSON.stringify(PRD_RUN)`) — the clock is
    the determinism trap. Then purity: `JSON.stringify` of `PRD_RUN`, `PRD_ANSWERS` and `PRD_RECORDS` before
    and after a projection must be unchanged.
  - **31.11 the refusals and totality.** `checkOpLines` driven by a **broken line** per rule — a `seq` of
    `0`, a repeated `seq`, a decreasing `seq`, an unknown `op`, a missing param key, an extra param key, a
    `level` outside `LEVELS`, a `provenance` outside `PROVENANCE`, a `source` outside `SOURCES`, a `flagged`
    holding `"smuggled"`, a non-boolean `closes` — each matched with `names()` against the value it must
    name. **Plus the two line types `readPackage` is supposed to have filtered out**: a real `text` line and
    a real `denied` line (copy their exact shapes from `discovery/README.md` §File shapes) must each be
    refused by name rather than folded — the fold's last line of defence if the filter is ever loosened. Then `projectPrd` over ~10 junk inputs (`null`, `{}`, `{ run: null }`, `{ run: {}, answers: null }`,
    `{ run: { slug: "" } }`, …), each a plain `Error`. Finally the **unresolvable ref**: a record whose
    `answer_ref` is not in `answers` projects with the explicit
    `_[answer aN is not in answers.jsonl]_` marker rather than silence.
  - **31.12 the run header is not a closed shape.** Project with `PRD_RUN` stripped of `posture`, then of
    `branch`, then of `endedAt`, then of `model`, then of `turnStats` — each time the projection must still
    produce every heading, and **`/\bundefined\b/` must not match anywhere in the output**. Then the
    positive control: the unstripped `PRD_RUN`'s `slug`, `label`, `entryMode`, `depth` and `frontEnd` all
    appear on the page, so the assertion is proving tolerance rather than passing because the header is never
    rendered. Finally assert `**undefined**` never appears for the **full** fixture either — the same
    one-line guard, on the happy path.
- **PATTERN**: `REFUSALS`-array-of-cases → group 29 (~line 5400); totality-over-junk → every group; the
  `undefined`-never-appears assertion → group 30 case 11 (`!built.systemPrompt.includes("undefined")`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "prd projection"`
- **SATISFIES**: AC #1, AC #2, AC #5

### 15. ADD `tooling/build-checks.mjs` — the closing `group()` line and the verdict count

- **IMPLEMENT**: close the block with `group("prd projection", \`…\`)`, written in the house style: a `·`-
  separated list of what was proven — the table frozen by mutation with eleven distinct declared empty
  states, `SECTIONS` iterated against `LEVELS` and `OPS` in both directions, every op's claim asserted
  present, the flags proven READ rather than re-derived by blanking `flagged`, the vanishing-claim mutations
  per rung plus the empty-run projection carrying no claim and no answer, the bank's three excluded fields
  with their positive control, hostile markdown kept inert, byte-identical determinism with the ISO-date
  regex, the run header tolerant of five missing fields with `undefined` never on the page, and every
  `checkOpLines` refusal driven by a broken line including a `text` and a `denied` one — ending with **what
  this group cannot reach**: *"the filesystem half (`readPackage`, `writePrd`, its refuse-to-overwrite rule
  and the CLI) — that is task 19's `mktemp -d` run, and this group is in-memory on purpose; and a projection
  of a FULL-WIDTH run package, which does not exist until #289 lands, so the fixture is hand-authored and
  labelled as such."*
  Then change the file's last log line: `all 30 groups pass` → `all 31 groups pass`.
- **GOTCHA**: the group name is padded to 14 (`name.padEnd(14)`); `"prd projection"` is exactly 14. Do not
  rename it longer without checking the alignment.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -4` — expect `build prd projection ✓` and
  `build ✓  all 31 groups pass`.
- **SATISFIES**: AC #6

### 16. UPDATE `discovery/README.md` — the format spec catches up

- **IMPLEMENT**, four edits, no invariant restated twice:
  1. The honesty block's `prd.md` bullet — extend to: *"`prd.md` is a **pure fold over the `op` lines**
     (#290) — `discovery/prd-projection.mjs`. It says it was projected from a run and links the package, so
     a PRD can never carry a claim the ops do not. It is then **edited by the human**, which is why it is the
     one generated artifact outside `tooling/drift-check.mjs` and why re-running the projection **refuses to
     overwrite an existing `prd.md`** without `--force`."*
  2. The Files block — `prd-projection.mjs   transcript op lines → prd.md, a pure fold (#290)`.
  3. A new **`## The PRD projection`** section after `## File shapes`: the `SECTIONS` table (id · heading ·
     axis · from), the two rendering rules (**a decision renders once, in its ladder section; the
     cross-ref sections name it by `seq`**; **flags render inline on the record that carries them**), the
     supersede read (latest shown, replaced named, nothing removed), the transition note's two states, and
     the fields the projection takes from the bank versus the three it excludes.
  4. The Workflow block's command list — add
     `node discovery/prd-projection.mjs <slug> [--stdout] [--force]   # the run package → prd.md (#290)`
     and note that group 31 drives the pure half.
- **GOTCHA**: the README is the contract; keep its existing voice and its `·`-separated density. Do not
  duplicate the module header's placement reasoning — link to it.
- **VALIDATE**: `grep -n "prd-projection\|#290" discovery/README.md` (expect ≥ 4 hits) and re-read the file
  once for a claim that is now stated in two places.
- **SATISFIES**: AC #5

### 17. UPDATE `docs/epics/discovery-partner.architecture.md` — close the open question

- **IMPLEMENT**, two edits:
  1. §Open questions — turn the line into a **closed** one, keeping the line rather than deleting it:
     `- [x] **Where the PRD projection lives** — closed by #290: `discovery/prd-projection.mjs`. Not `agent-layer/gen-*.mjs`: `gen-loc-summary.mjs` counts `^agent-layer/[^/]+\.mjs$`, so a file there changes `system/loc-summary.json`, changes the number `approach.html` renders and churns approach's VR baselines — the tripwire §For slicing names. `discovery/` matches no loc group. It earns its own module: a pure `projectPrd` the gate drives plus a thin filesystem shell, the same split `gen-replay.mjs` uses.`
  2. §Data model, the last bullet — replace *"Placement at slicing; the constraint is that…"* with
     *"`discovery/prd-projection.mjs` (#290); the constraint is that…"*, leaving the constraint sentence
     untouched.
- **GOTCHA**: this is a decisions ledger. **Amend, never rewrite.** Do not touch any other line.
- **VALIDATE**: `grep -n "PRD projection" docs/epics/discovery-partner.architecture.md`
- **SATISFIES**: AC #5, and the ticket's "mark the architecture doc's open question closed in the same PR"

### 18. UPDATE `CLAUDE.md` — one index clause

- **IMPLEMENT**: in the architecture map's `discovery/` line, after `ops.mjs` and `bank.mjs`, add
  `· prd-projection.mjs: the run package → prd.md, a pure fold over the ops (no clock, no SDK)`.
- **GOTCHA**: the map is an **index**, not a specification. One clause saying what the file *is*. Do not
  restate the placement reasoning, the section table, or the overwrite rule — those live in the module header
  and `discovery/README.md`.
- **VALIDATE**: `grep -n "prd-projection" CLAUDE.md`
- **SATISFIES**: repo convention (CLAUDE.md §Ground rules)

### 19. RUN the manual validation

- **IMPLEMENT**: run, in order, and paste the output into the report:
  1. `node tooling/build-checks.mjs` — expect 31 green groups.
  2. `node discovery/prd-projection.mjs spine-meridian-1 --stdout` — read the whole thing. It is a
     three-question scope-check: two `solution` decisions (`s4-appetite` seq 1, `s4-out-of-bounds` seq 3)
     and one `flag_weak_answer` (seq 2), no evidence, no parents. So the expected output is exactly:
     **Problem · Target user and JTBD · Evidence · Hypothesis · Open questions → `TBD`** (no business or
     stakeholder decision, no evidence row, no parked question); **Transition note → `**n/a**`** with its
     reason; **MVP → two decision blocks**, each carrying `⚠ orphan` and `⚠ no-evidence`; **Weak answers →
     one block** with three `missing[]` bullets; **Non-goals → one cross-reference to seq 3**
     (`s4-out-of-bounds` is one of the two exclusion questions — *not* TBD); **Success metrics → an empty
     stage-7 table and a two-row kill-criteria table** (seq 1 and seq 3's `wrong_if`); **Requirement
     hierarchy → `business 0 · stakeholder 0 · solution 2 · transition 0 · orphans 2`**.
     **If any of that is not true, the projection is wrong, not the package.**
  3. `node discovery/prd-projection.mjs spine-meridian-1 --stdout | diff - <(node discovery/prd-projection.mjs spine-meridian-1 --stdout)` — empty (determinism against a real package, not just the fixture).
  4. `node discovery/prd-projection.mjs no-such-slug; echo "exit=$?"` — `prd ✗` naming the path, `exit=1`.
  5. **The write path, on a throwaway copy — the only place `writePrd` is ever exercised.** Group 31 is
     in-memory by design, so if this step is skipped the destructive path ships untested:

```bash
TMP=$(mktemp -d) && cp discovery/spine-meridian-1/*.json* "$TMP"/
node discovery/prd-projection.mjs --root "$TMP"            # writes → prd ✓ … , exit 0
node discovery/prd-projection.mjs --root "$TMP"            # REFUSES → prd ✗ naming the path, exit 1
printf '\n<!-- a human edit -->\n' >> "$TMP/prd.md"
node discovery/prd-projection.mjs --root "$TMP" --force     # overwrites → prd ✓ , the edit is gone
grep -c 'a human edit' "$TMP/prd.md"                        # 0 — --force really discards
diff "$TMP/prd.md" <(node discovery/prd-projection.mjs spine-meridian-1 --stdout)   # empty
rm -rf "$TMP"
```

     Read the **refusal message**: it must name the path, say the file is hand-edited, and say `--force`
     discards those edits. That sentence is the documentation most operators will ever read.
  6. `node tooling/drift-check.mjs` — green, and **nothing new listed**; the projection adds no drift-checked
     artifact.
  7. `cd portal && node -e "import('./lib/discovery.mjs').then(()=>console.log('portal graph still loads'))"`
     — a sanity check that nothing in `discovery/` was broken for its other readers.
  8. `git status --short` — the only changed paths are the six this ticket names. **Nothing under
     `discovery/spine-meridian-1/`, nothing under `/tmp`.**
- **GOTCHA**: **do not commit a `prd.md` into `discovery/spine-meridian-1/`.** `--stdout` for the real
  package, `mktemp -d` for the write path. Committing one adds a file outside the ticket's named scope, and
  the package is #284's evidence. (The copy's `run.json` still carries `root: "discovery/spine-meridian-1"`,
  so the written PRD links the real package — expected, and why the `diff` in step 5 comes back empty.)
- **VALIDATE**: all eight steps, output pasted into `.claude/reports/`.
- **SATISFIES**: AC #1, AC #5, risk register R5, R13, R14

### 20. COMMIT and open the PR

- **IMPLEMENT**: branch `feat/290-prd-projection` off current `main` (`git fetch origin main` first — main
  moved at PR #339). One atomic commit:
  `feat(discovery): the run package → PRD projection — a pure fold over the ops, group 31 green (#290)`.
  Stage by **explicit path** (parallel sessions share this worktree): `discovery/prd-projection.mjs`,
  `tooling/build-checks.mjs`, `discovery/README.md`, `docs/epics/discovery-partner.architecture.md`,
  `CLAUDE.md`, `.claude/plans/discovery-prd-projection-290.md`,
  `.claude/reports/discovery-prd-projection-290-report.md`. PR body **must carry `Closes #290`**.
- **GOTCHA**: a PR title mentioning `(#290)` closes nothing. The trailer goes in the **body**.
- **VALIDATE**: `gh pr view --json body -q .body | grep "Closes #290"`
- **SATISFIES**: the epic's standing rules

---

## RISK REGISTER

Every risk carries a **guard**, the **task that implements it**, and the **gate case that proves the guard
can fail**. A risk with no proving case is marked `manual` and says why the gate cannot reach it — the
epic's central rule is *the check must be able to fail*, and a guard nothing exercises is a comment.

### Correctness — the honesty claim itself

**R1 · A claim reaches the PRD that no op carries.** *The ticket's entire point; a single leak makes the
artefact worthless and the failure is invisible on a green build.*
→ **Guard:** the fold's only inputs are op params, `answer_ref`-resolved text, `question_id`-resolved bank
fields, the applier's derived fields, and `run.json`. No other value has a route.
→ **Task 7** · **Case 31.7** — three mutations: per-rung deletion asserting the `wrong_if` is gone from the
**whole document**; the empty-ops projection carrying **no claim and no answer** even though every answer is
still passed in; the transition note both directions.

**R2 · The projection re-derives a flag and drifts from the applier.** *Two records of one rule always
disagree eventually, and here the disagreement is an unbacked decision printed as if backed.*
→ **Guard:** `no-evidence` / `orphan` are **read from the record's `flagged`**, never recomputed.
→ **Task 5** · **Case 31.5** — blank one record's `flagged` and assert both markers vanish from that
decision's block. A re-deriving implementation still prints them and goes red.

**R3 · A verbatim answer is truncated or altered on its way to the page.** *`answers.jsonl` is verbatim by
contract; a silently shortened answer is the same class of failure as an edited transcript.*
→ **Guard:** **no length cap anywhere** in the projection. `TURN_EVENT_TEXT_MAX` caps the SSE wire, not the
package — do not copy it here.
→ **Task 3** · **Case 31.4** — every op's distinguishing string asserted present in full.

**R4 · The bank's rubric or research commentary leaks into the PRD.** *`weakAnswer` is the agent's scoring
key and `note` / `provenanceNote` are commentary about the question, not claims about this product.*
→ **Guard:** `questionFor` narrows to `{ id, text, attribution, stage, label }` and returns nothing else.
→ **Task 3** · **Case 31.8** — the three fields asserted absent, **with a positive control** (`text`,
`attribution`, `label` present) so the assertion cannot pass because the bank was never read.

### Determinism and output integrity

**R5 · A clock creeps in.** *Kills AC #1 outright and turns every regeneration into a diff.*
→ **Guard:** no `new Date()`, no `Date.now()`, no "generated at". Every date comes from `run.json`. Ordering
is by `seq` or `SECTIONS` order, never `Object.keys`.
→ **Task 7** · **Case 31.10** — byte-identity by `===`, plus an ISO-date regex asserting every match is a
substring of `JSON.stringify(PRD_RUN)`. **Second prover: task 19 steps 3 and 5** — a `diff` of two `--stdout`
runs, and a `diff` of the written file against `--stdout`, both against a **real package on disk** rather
than the in-memory fixture. Task 19 lists R5 for that reason.

**R6 · `undefined` on the page.** *`run.json` is not a closed shape — the real spine package carries a
`posture` field the README does not document, and `branch` / `endedAt` / `sessionId` are legitimately null.
Interpolating a missing field is the likeliest visible bug this module can ship.*
→ **Guard:** every header field read defensively; absent or null renders `—`.
→ **Task 7** · **Case 31.12** — project with five fields stripped in turn, asserting `/\bundefined\b/` never
matches, with a positive control that the header is actually rendered.

**R7 · A verbatim answer breaks the markdown.** *Human text is arbitrary: a `|`, a leading `#`, a leading
`-`, a fenced block.*
→ **Guard:** all human text renders as **blockquotes**, which make every one of those inert. Tables carry only
URLs, labels and seqs, with `|` escaped.
→ **Task 3** · **Case 31.9** — a hostile answer in the fixture; the heading list must still equal
`SECTIONS.map(r => r.heading)` and the Evidence table must keep its column count.

**R8 · A corrupted or mis-filtered op ledger folds silently.** *A `text` or `denied` line reaching the fold,
or an out-of-order `seq`, would produce a plausible PRD from a broken package.*
→ **Guard:** `checkOpLines` refuses by name — seq monotonicity, the verb roster, exact `PARAMS` keys, every
enum, and the two non-op line types.
→ **Task 2** · **Case 31.11** — eleven broken lines plus a real `text` line and a real `denied` line, each
matched with `names()`. **Do not re-fold with `applyOps`** — it refuses records carrying `seq`/`closes`/
`flagged` by design, so a re-derivation would throw on valid history.

### Coupling and drift

**R9 · A section silently empties after a bank edit.** *`METRIC_STAGE` and the two exclusion question ids are
the only string couplings to `bank.mjs`, and a rename would empty a section with no error.*
→ **Guard:** both pinned as named consts beside `SECTIONS`; the bank's own rule ("ids are hand-chosen and
stable") is what makes the coupling safe in the first place.
→ **Task 6** · **Case 31.2** — each id must resolve through `questionById`, and `METRIC_STAGE` must name a
stage `STAGES` holds.

**R10 · A fifth op verb or a fifth rung lands with no renderer.** *A silent drop is the worst failure mode an
honesty artefact has.*
→ **Guard:** `SECTIONS` is iterated against `OPS` and `LEVELS` **in both directions** (the `VALID_FOR` idiom
from group 29).
→ **Task 1** · **Case 31.2** — a verb or rung with no home fails **by name**. The epic's op-verb lock keeps
#290 from adding one concurrently.

**R11 · A new section's empty state gets special-cased inside the gate.** *`transition` renders `**n/a**`,
not `TBD`; a loop that hard-codes "TBD" goes red on a correct implementation, and the usual fix is an `if`
that hides the next one.*
→ **Guard:** `empty` is a **declared field on the `SECTIONS` row**, and the eleven strings must be distinct.
→ **Task 1** · **Cases 31.1 + 31.7.1** — 31.7.1 asserts against the row's own `empty`, so the loop has no
branch and a future bespoke empty state is covered the day it lands.

**R12 · An invariant ends up stated in two places.** *CLAUDE.md is an index, `discovery/README.md` is the
contract, the module header is the specification — a copy in two of them drifts.*
→ **Guard:** placement reasoning lives in the module header only; the section table and the overwrite rule
live in the README only; CLAUDE.md gets one clause saying what the file *is*.
→ **Tasks 16, 17, 18** · `manual` — no gate can see prose duplication. Task 16's VALIDATE step is an explicit
re-read for exactly this.

### Operational

**R13 · `prd.md` clobbers a human's edits.** *The artefact is generated **then edited**; it is deliberately
outside `drift-check` for that reason, so nothing else protects it.*
→ **Guard:** `writePrd` refuses when the file exists unless `--force`, and the refusal message names the
path, says the file is hand-edited, and says `--force` discards those edits.
→ **Task 8** · **Task 19 step 5** (`manual` for the gate — group 31 is in-memory on purpose): write, refuse,
hand-edit, `--force`, and `grep -c` proving the edit is gone. **If step 5 is skipped, the module's only
destructive path ships untested.**

**R14 · A `prd.md` gets committed into `discovery/spine-meridian-1/`.** *Outside the ticket's named files,
and that package is #284's evidence.*
→ **Guard:** `--stdout` for the real package; the write path runs against a `mktemp -d` copy.
→ **Task 19 steps 2 and 8** — `git status --short` must show only the six named paths.

**R15 · Group 31 is already taken, or `main` moved.** *Parallel sessions share this worktree and the owner
merges fast; two groups numbered 31 makes a failure unattributable.*
→ **Guard:** re-verify before writing, and renumber mechanically if taken.
→ **Task 0** — the pre-flight, run first, with the greps that decide it.

**A note on `--force`.** It is the only destructive path in the module, and its refusal message is the
documentation most operators will ever read. Make it name the path, say the file is hand-edited, and say
`--force` discards those edits.

---

## TESTING STRATEGY

This repo has **no test suite, no linter and no type-check** — do not hunt for or invent one (CLAUDE.md
§Ground rules). "Done" = the gate ran.

### Unit-equivalent: `build-checks` group 31

The pure core is driven over an in-memory fixture package. Every assertion follows the epic's central rule —
**the check must be able to fail**: a refusal is proven by feeding a broken input, a flag by mutating the
record, an exclusion by a positive control beside it, and the honesty claim by **deleting an op and watching
its claim vanish from the whole document**.

### Integration-equivalent: the CLI against the one real package

`discovery/spine-meridian-1/` is the only run package that exists. The `--stdout` run is the only place the
filesystem half, the JSONL parsing, the `denied`-line skipping and the real `run.json` shape are exercised —
group 31 deliberately cannot reach them, and the closing `group()` line says so.

### Edge Cases (each has a numbered case above)

- an op ledger with **zero** ops (case 31.7.2) — every heading present, no claim anywhere;
- a decision superseded by an **off-script** one on a later turn (31.6);
- both flags on one decision, and the flags proven read-not-derived (31.5);
- an `answer_ref` that does not resolve — an explicit marker, never silence (31.11);
- hostile markdown inside a verbatim answer — `|`, `#`, `-`, a fence (31.9);
- a `transition` rung present and absent (31.7.3);
- a corrupted ledger: out-of-order, duplicate, zero and non-integer `seq`s; an unknown verb; wrong param keys;
  every enum outside its list (31.11);
- a `run.json` with `branch: null` and `endedAt: null` — the real spine package (task 19).

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check discovery/prd-projection.mjs
node --check tooling/build-checks.mjs
```

### Level 2: The gate (this is the repo's main gate — CI runs it)

```bash
node tooling/build-checks.mjs          # expect: build prd projection ✓  … / build ✓  all 31 groups pass
```

### Level 3: Drift + the neighbours

```bash
node tooling/drift-check.mjs           # green, and nothing new listed
node -e "import('./discovery/ops.mjs').then(()=>console.log('ops ✓'))"
node -e "import('./discovery/bank.mjs').then(()=>console.log('bank ✓'))"
```

### Level 4: Manual — the CLI against the real package

```bash
node discovery/prd-projection.mjs spine-meridian-1 --stdout
node discovery/prd-projection.mjs spine-meridian-1 --stdout \
  | diff - <(node discovery/prd-projection.mjs spine-meridian-1 --stdout)   # empty
node discovery/prd-projection.mjs no-such-slug; echo "exit=$?"              # prd ✗ …, exit=1
git status --short discovery/spine-meridian-1/                              # EMPTY — no prd.md committed
```

### Level 5: Not applicable

No visual-regression run (no shipped page changes), no journey driver (no portal surface), no
`gen-loc-summary` regen (`discovery/` matches no loc group), no `param-manifest` entry (the portal is not a
shipped page), no `gen-handoff` (no token work).

---

## ACCEPTANCE CRITERIA

Traced from the ticket, one line each.

- [ ] **AC #1 — pure and deterministic.** `projectPrd` has no filesystem, no clock, no network, no SDK. Two
      projections of the same package are byte-identical (31.10), and no ISO date outside `run.json` appears.
- [ ] **AC #2 — every section traces to ops.** Decisions render with their evidence links and wrong-if lines;
      parked questions become Open questions; evidence rows carry their provenance labels; `no-evidence` and
      `orphan` render **inline on the record** (31.4, 31.5), read from `flagged` rather than re-derived.
- [ ] **AC #3 — the hierarchy is visible.** business ← stakeholder ← solution ← transition, each naming its
      parent's `seq`, orphans marked (31.6), with the counts line.
- [ ] **AC #4 — the transition note.** Present when the run recorded a `transition` decision; an explicit
      `**n/a**` with a derived reason otherwise. Both directions driven (31.7.3).
- [ ] **AC #5 — the honesty surface.** The generated PRD says it was projected from a run and links the
      package, and says re-running refuses to overwrite it.
- [ ] **AC #6 — the gate.** `build-checks` group 31: a fixture package in, an expected PRD out, and **a claim
      not in the ops cannot appear** — asserted by deleting an op and watching its claim vanish from the
      whole document (31.7), plus the empty-run projection carrying none of the fixture's claims and none of
      its answers.
- [ ] The architecture doc's *"Where the PRD projection lives"* open question is **closed in this PR**, with
      the loc-summary reasoning recorded in the module header.
- [ ] **The write path is exercised.** Task 19 step 5's `mktemp -d` run: write → refuse → hand-edit →
      `--force` → the edit is gone, and the result diffs clean against `--stdout` (R13).
- [ ] **`undefined` never appears in a projected PRD**, with five `run.json` fields stripped in turn (R6).
- [ ] **Nothing is truncated** — no length cap on an answer, a `wrong_if`, a `reason` or a `missing[]` entry
      (R3).
- [ ] Every risk in the RISK REGISTER is either closed by its named gate case, or marked `manual` with the
      manual step actually run and pasted into the report (R12, R13).
- [ ] `node tooling/build-checks.mjs` prints `all 31 groups pass`.
- [ ] No shipped page, generated artifact or VR baseline changes.
- [ ] `discovery/spine-meridian-1/` gains **no** `prd.md`; `git status --short` shows only the six named
      paths.

---

## COMPLETION CHECKLIST

- [ ] Task 0's pre-flight run **first** — `main` fetched, group 31 confirmed free, `prd-projection` grep empty
- [ ] Tasks 1–20 done in order, each validated as it landed
- [ ] Every RISK REGISTER row walked: R1–R11 closed by their gate case, R12–R15 by their manual step
- [ ] Task 19's eight steps run, **including step 5's write / refuse / `--force` cycle**
- [ ] `node tooling/build-checks.mjs` → 31 groups green
- [ ] `node tooling/drift-check.mjs` → green, nothing new
- [ ] The `--stdout` run against `spine-meridian-1` read end to end and pasted into the report
- [ ] `discovery/README.md`, the architecture doc and `CLAUDE.md` updated; no invariant stated twice
- [ ] The fixture is labelled a gate fixture **in the file**, and lives inline (no on-disk package)
- [ ] Plan, report and review in the same PR; body carries `Closes #290`
- [ ] `git status --short discovery/` shows no new run-package file

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes** (each acted on, none blocking):

- **A1 — the transition note is a *section* of `prd.md`, not a seventh file.** The PRD calls it "the pack's
  seventh artefact" against D9's six, but D9 lives in the owner's uncommitted thinking doc, and the ticket's
  own *Files touched* list names no new package file. A section satisfies both halves of AC #4 and keeps the
  ticket inside its named files. If the owner wants a separate `transition.md`, it is a small follow-up over
  the same fold.
- **A2 — importing `discovery/bank.mjs` is designed, not a violation of "reads the package and nothing
  else".** `ops.mjs` invariant 6 names "the projection" as a caller that supplies the bank, and
  `discovery/README.md`'s Files block already lists `prd-projection.mjs` beside it. A question's *text* is a
  definition; the claim is the human's answer and the agent's filing. The three fields that *would* be
  commentary — `weakAnswer`, `note`, `provenanceNote` — are excluded and their absence is gated (31.8).
- **A3 — the two "cross-ref" selections are judgement calls, pinned in one place.** Success metrics keys on
  `stage === 7` ("Measurement and kill criteria"); Non-goals keys on the two banked exclusion questions
  (`s3-deliberately-not-doing`, `s4-out-of-bounds`). Both are named consts beside `SECTIONS` and both are
  asserted to resolve through `questionById`, so a bank rename fails loudly instead of silently emptying a
  section. The bank's own rule ("ids are hand-chosen and stable … a C2 rewording must not move a key") is
  what makes this safe.
- **A4 — the gate fixture is inline, not on disk.** The ticket permits a hand-authored fixture package; this
  plan makes it in-memory so no file that looks like a run package ever exists. Only the ops, the answers and
  the run header are hand-written — the **records** come from running the real applier.
- **A5 — group 31.** Groups 28/29/30 are taken (bank / discovery ops / discovery session). No other PR is
  open, so 31 is free. If a sibling session claims it first, renumber — the collision is mechanical.

**Questions that would change the plan if answered differently** (none blocking; state the assumption and
proceed):

- **Q1 — should `prd.md` for `spine-meridian-1` be committed?** This plan says no (`--stdout` only): it is
  outside the ticket's named files and would project as mostly TBD. If the owner wants the artefact visible
  as evidence, it is one command and one line in the commit.
- **Q2 — should the `## Hypothesis` section attempt the "We believe … will cause … resulting in" sentence?**
  This plan says no — the ops carry falsifiers (`wrong_if`), not a belief statement, and synthesising one
  would be exactly the invented claim AC #6 forbids. The section lists the falsifiers and says the belief
  half is the human's to write.

**Noted, not fixed** (pre-existing, out of scope): group 29's internal case comments are numbered `28.x`
from when #281 claimed group 28 before #282 landed; `ops.mjs`'s header correctly says group 29, and
build-checks' header index is correct. Renumbering those comments is a tidy-up for whoever next edits that
group. Likewise `build-checks.mjs:4` still says "Twenty-three groups".

## NOTES (open canvas)

**Why a fold and not a writer agent.** The obvious alternative — hand the package to the Agent SDK and ask
for a PRD — is what the epic exists to replace. An agent would produce better prose and would be structurally
unable to prove that any sentence came from the run. The whole value of the discovery half is that a
stakeholder can audit a decision without trusting the author; a generative step at the last mile throws that
away at the exact point it matters. The fold is worse writing and a real guarantee, and the human's edit pass
is where the prose gets fixed.

**The one axis question I kept re-opening.** Sections could key on the **bank stage** (nine stages, close to
the source's own structure) or on the **BABOK rung** (four levels, already in every op). Stage-keying maps
more naturally onto Problem/Evidence/Market, but it needs a nine-row hand-authored mapping that is pure
opinion, and it renders a decision twice whenever a stage and a rung both claim it. Rung-keying is already
load-bearing in the data (AC #3 demands the hierarchy be visible anyway), needs no invented mapping for the
four core sections, and has an obvious dedup rule. So: **rungs render, stages cross-reference.** The two
stage/id-keyed sections that remain (Success metrics, Non-goals) name decisions by `seq` and never re-render
them, which is why the table carries an explicit `axis` column — the mapping is a judgement call and it
should be readable as one.

**Sequencing.** Phases 1 → 2 → 3 are strictly ordered (the gate imports the pure core). Phase 4 (docs) has no
code dependency and can be written while Phase 3 runs. There is no parallel-worktree win here — it is one
module, one gate group and four doc edits, and the gate is where two-thirds of the effort sits, exactly as
the epic's "gate rigor rides along" rule expects.

## AMENDMENTS

- (none yet)
