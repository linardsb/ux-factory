# Feature: Session rules — the depth ladder, the facet vector, D5 escalation and the two counters (`portal/lib/discovery.mjs`)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

The session module gets its **rules layer**. Today `openSession` records a `depth`, refuses any `branch` but `null`, and `sessionView` walks `selectDepth(head.depth)` by counting closed turns. After this ticket:

- **The facet vector** the person declares at intake lands in `run.json` beside `depth`, normalised to five booleans or `null`, and `sessionView` walks `selectDepth(head.depth, head.facets)`. `branch` stops existing — in `openSession`, `run.json`, `discoveryConfig()`, the server route, the drawer, the PRD projection's run header and the three build-checks pins that named it.
- **Depth is proposed, then confirmed.** The server proposes a depth per entry mode from a one-row table (`blank-idea` → `full-discovery`, MVP 5's "a new product"); the drawer preselects it; the person confirms or changes it; `run.json` records both `proposedDepth` and the confirmed `depth`.
- **D5 escalation gets its mechanism.** A question the agent flags weak is asked **once more** on a fresh turn (MVP 6's "pushes back once"; the README's "a revisited question on a new turn is a fresh slot"). A second closer of any kind settles it — never a third ask. At Scope check, a question weak on both asks **proposes** the rung above as a value on the view; nothing is forced and nothing in `run.json` moves.
- **The two counters, coverage and the D4 read** are one pure fold over the transcript's closers: the not-a-form streak (a decision or a weak flag resets, a parked question increments, off-script ops and `file_evidence` touch nothing), the weak-answer **rate**, twelve-set coverage computed from the ops rather than the cursor, and "Asked what mattered" (decision rate on the facet-selected tail against the twelve, `full-discovery` only).
- **Overflow is refused, never trimmed.** `openSession` calls the bank's `selectDepth(depth, facets)`, whose throw already names what fits and what does not; the session module resolves nothing on the person's behalf. The config route states each depth's **unfaceted** count and says which depth a vector moves.

All of it is pure and SDK-free; group 30 drives every value with no agent and no token.

## User Story

As the operator starting a discovery session
I want to confirm a proposed depth, declare what is true of my product as five facts, and have the session ask a weak-flagged question once more before moving on
So that the list I walk is the one my product needs inside the ~30 budget, a thin answer gets one honest second chance, and the run package can say afterwards whether the session was a conversation or a form.

## Problem Statement

`openSession({ …, branch })` (`portal/lib/discovery.mjs:474`) refuses everything but `null` with *"branch selection is #283 and is not in the spine"*. #283 has landed the facet modules and a two-argument `selectDepth`, but nothing reads a vector from `run.json`, nothing writes one, and `sessionView` (`:536`) still calls `selectDepth(head.depth)` with one argument — so every session is unfaceted and the drawer sends `branch: null` to a parameter that no longer means anything. The cursor is `closedTurns.size` (`:537–538`), so a weak flag advances past the question the same as a decision does; MVP 6's "pushes back once" has no turn to be answered in, and D5's "repeated weak answer" cannot occur. The not-a-form counter, coverage and the weak-answer rate are described in the README (`§The op grammar`, "The not-a-form counter (#285) is arithmetic over the records") and computed nowhere — Run 0's report had to derive them with a scratch script. `discoveryConfig()` reports `count: d.ids.length` for `full-discovery`, a number a declared vector moves. And the PRD projection's run header renders `branch none` from a field that is about to stop existing.

## Solution Statement

Extend `portal/lib/discovery.mjs` with a marked **rules layer**: four small tables (`LADDER`, `ESCALATES`, `DEPTH_PROPOSAL`, `COMPOSES`) and four pure functions (`declareFacets`, `deriveCursor`, `escalationFor`, `runMetrics`), each exported so group 30 drives it directly. `openSession` gains `facets` (validated by the bank, normalised, recorded) and `proposedDepth`, loses `branch`. `sessionView` walks the faceted list, derives the cursor from the **last closer** (which is what keeps every committed package reading as it did), and adds `escalation` and `metrics` to the view. `discoveryConfig()` adds `facets`, `presets`, `depthProposals` and a per-depth `composes` flag. The server route forwards `facets`; the drawer preselects the proposed depth, drops `branch`, shows "asked again" and the escalation line. The projection's run header renders the vector. Group 30 rewrites case 9 (the cursor) and case 16 (the refusals), extends case 11 (the config) and adds three cases (the tables, the re-ask and escalation, the metrics at 0/1/2/3/4). Group 31 swaps `branch` for `facets` in its run-header pin, and the three gate-compared `prd.md` fixtures are regenerated. README, `gates.md` and the drawer's copy follow.

## Out of Scope / Non-Goals

- Not included: the five checkboxes, the four preset buttons and the overflow message in the drawer — **#288**. This ticket's drawer sends no `facets`, so every session it opens is unfaceted; the server accepts a vector today so #288 is a client-only change. A pre-start "plan" route (`facetPlan` over a not-yet-declared vector) is #288's too if it wants one.
- Not included: an SDK call that proposes a depth or a facet from prose. The proposal is a pure table (Q1 below); D2 of the decision doc rejects inference over prose for the same reason.
- Not included: a mid-session depth change. Stepping up is a **new run** at the proposed depth (D3: a recorded choice is never re-decided; the fold below would also break on a list that no longer holds an already-closed question).
- Not included: rendering `metrics` in the drawer beyond the two lines named below ("asked again", the escalation line). The counters are a view field for #293's close-out and the gate.
- Not included: any change to `discovery/bank.mjs`, `discovery/ops.mjs`, `portal/lib/discovery-postures.mjs` (a prompt edit moves every posture fingerprint and stales the group 32 fixture) or `portal/lib/discovery-transport.mjs`.
- Not included: `tooling/discovery-score.mjs`. Its two `selectDepth` calls are one-argument on purpose — the graded protocol is `whole-bank`, which no vector moves.
- Not changing: the PRD's MVP 5 table wording ("plus the branch's own picks") — the uncommitted 2026-09-02 §Amendments entry records that MVP 5's table stands; the #283 report left it for the same reason.
- Not changing: any committed `answers.jsonl`, `transcript.jsonl` or `run.json`. Packages recorded before this ticket carry `branch: null` and no `facets`; they are never edited and read as the unfaceted list.
- Not changing: `whole-bank`'s behaviour. It is off the ladder — it never re-asks and never proposes — because #348's protocol pastes one sealed answer per question and a held question would make the scorer refuse a duplicate.

## Feature Metadata

**Feature Type**: Enhancement (the rules layer on an existing session module; one behaviour change — the one re-ask — deliberately made and pinned)
**Estimated Complexity**: Medium. The functions are short and pure; the care is in the cursor fold (it must read every committed package exactly as today) and in rewriting two gate cases without weakening them.
**Primary Systems Affected**: `portal/lib/discovery.mjs` · `portal/server.mjs` (two routes) · `portal/public/portal.js` + `index.html` (the drawer) · `discovery/prd-projection.mjs` (one header line) · `tooling/build-checks.mjs` groups 30 and 31 · three regenerated `discovery/*/prd.md` · `discovery/README.md` · `.claude/references/gates.md`
**Dependencies**: none new. The module stays statically SDK-free and zod-free (invariant 1); every new import is from `discovery/bank.mjs`.
**One-pass confidence**: **9.5/10.** The cursor fold was RUN against all seven committed packages before this plan was saved (a scratch script over the real transcripts; `SAME` on every package — §NOTES has the table); the one residual risk is the exact text of the group 30 summary string, which the implementer rewrites by hand.

## Related Work

**Implements**: [#285](https://github.com/linardsb/ux-factory/issues/285) (amended 2026-09-02 — plan from the amended body only; #360 folded)   ·   **Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) → `docs/epics/discovery-partner.architecture.md` §Recommended approach (approach C: the server owns cursor, depth and — now — the facet vector), §Data model R2 (the counter arithmetic), §Missing pieces; **the sub-decision `docs/epics/discovery-question-selection.architecture.md` is the spec for width** (D1b totality · D2 declared, not inferred · D3 once, in `run.json` · D4 the metric · D5 what folds from #360). PRD MVP 5 (the ladder, "the agent proposes, the human confirms", D5's rule), MVP 6 ("pushes back once"), MVP 8 (parking counts as neither), §Success metrics rows Completion · Not a form · Asked what mattered. Inherited, not re-decided.

**Back-references**:

- `.claude/plans/discovery-spine-run-package-284.md` — Why: the module's five invariants, the cursor-is-derived rule this plan keeps, and its line 67: *"A revisit on a new turn is legal in the applier (README, D5 escalation) and is #285's surface."*
- `.claude/plans/discovery-bank-width-283.md` — Why: `facetPlan`/`selectDepth(depth, facets)` semantics, the throw-on-overflow decision, and its §Out of Scope naming exactly what this ticket does (read `facets` from `run.json`, write it at `openSession`, drop `branch`, the unfaceted count, replace case 16).
- `.claude/plans/discovery-run-0-338.md` §PRE-REGISTERED READINGS — Why: the #285 counters Run 0 derived by script (weak flags, longest no-decision run, repeat weak flags per question). `runMetrics` makes those a view field so #293 reads them without a script.
- `.claude/reports/discovery-run-0-338-report.md` §AC4 #285, F9 — Why: 30/30 decisions, 0 weak flags, so the counter "cannot currently detect harm" from a Think run. Background: the counters are reported, not passed.

**Forward-references**:

- #288 (portal width) — renders `config.facets` / `config.presets`, sends `facets` on `POST /api/discovery/session`, shows `facetPlan().overflow` before Start.
- #293 (close-out) — reads `sessionView().metrics` over the wave-1 runs; "Asked what mattered" is `metrics.askedWhatMattered`.
- #286 (postures / entry modes) — adds a `DEPTH_PROPOSAL` row per entry mode it adds; group 30 fails by name until it does.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `portal/lib/discovery.mjs` (whole file, 689 lines) — Why: THE file. `:1–42` the header and five invariants (invariant 4, the derived cursor, is what `deriveCursor` keeps); `:46` the bank import to extend; `:474–503` `openSession` (the `branch` guard at `:485–486`, the `writeRun` literal at `:492–496`); `:531–551` `sessionView`; `:562–576` `discoveryConfig`; `:652–686` `runTurn` (unchanged, but read how `cursor.turn` and `cursor.question` are consumed); `:688–689` the re-exports.
- `discovery/bank.mjs` (`:796–834` `OPENING_SET`; `:852–927` `DEPTHS`; `:930–1029` `NON_FUNCTIONAL_BLOCK`, `FACETS`, `MODULES`, `PRESETS`, `FULL_DISCOVERY_BUDGET`; `:1043–1103` `normaliseFacets`, `facetPlan`, `selectDepth`) — Why: what `declareFacets` wraps and what `selectDepth` throws. Note `normaliseFacets` is NOT exported; `facetPlan(facets).declared` is the exported way to ask "is this a vector".
- `docs/epics/discovery-question-selection.architecture.md` (whole file) — Why: D1b (totality; the byte-identical wrong-if), D2 (declared at intake, agent-proposes stays on depth and escalation), D3 (once, in `run.json`, never re-decided — a wrong facet is a new run), D4 (the metric's exact definition), D5 (what folds: totality, prefix per depth, which depths branch, the unfaceted count, case 16 replaced not deleted).
- `docs/epics/discovery-partner.architecture.md` (`:153–166`, R2 and the counter arithmetic) — Why: the not-a-form rule verbatim: `record_decision` or `flag_weak_answer` resets, `open_question` increments, off-script ops do not touch it, parking counts as neither.
- `docs/epics/discovery-partner.prd.md` (`:228–243` MVP 5; `:244–251` MVP 6 "pushes back once"; `:264–272` MVP 8; `:355–368` §Success metrics) — Why: the ladder's three rungs, the D5 rule's wording, and the three metric rows this ticket computes.
- `discovery/README.md` (`:65–91` §Files, the `run.json` line at `:77`; `:159` "a fresh slot (D5 escalation)"; `:170–173` the counter paragraph; `:203–239` `run.json`'s example and bullets — `:216–219` already say what #285 does to `branch`; `:241–249` §The bank's width; `:679–688` §Workflow) — Why: every sentence that changes is listed in Task 12.
- `tooling/build-checks.mjs` group 30 (`:5858–5875` the header; `:5876–5889` helpers `threw`/`names`/`same`/`keys`/`tmpRoot`; `:5984–6009` case 9 the cursor; `:6109–6116` case 11's config pins; `:6748–6772` case 16 — the `branch` refusal at `:6758` and the eight-guard pin at `:6771` (the ticket's `:6524`/`:6537` are stale line numbers); `:6778` the `group("discovery", …)` summary string, one very long line) — Why: every pin this ticket moves, and the case style.
- `tooling/build-checks.mjs` (`:244–252` the import block from `portal/lib/discovery.mjs`; `:238` the bank import — `FACETS`, `facetPlan`, `OPENING_SET`, `PRESETS`, `selectDepth` are already imported) — Why: add the new names here.
- `tooling/build-checks.mjs` group 31 (`:6906` `PRD_RUN`'s `branch: null`; `:7228–7247` case 31.12 — the delete-key loop and the whole `**Run**` line pinned) — Why: the projection pin that names `branch`.
- `tooling/build-checks.mjs` (`:7411–7418` case 32.5; `:7847` case 33.15) — Why: `discovery/instrument-loans-1/prd.md`, `graded-think-a/prd.md` and `graded-opus-a/prd.md` are asserted byte-equal to the projection. Changing the run header means regenerating those three (Task 11).
- `discovery/prd-projection.mjs` (`:113–128` the tolerant `field()` helper and its comment; `:662–672` the run header, `branch` at `:670`) — Why: the one line that changes.
- `portal/server.mjs` (`:158–180` the config and session routes; `:173` `branch: b.branch ?? null`) — Why: EVERY PARAMETER NAMED, never a spread — keep that shape when swapping `branch` for `facets`.
- `portal/public/portal.js` (`:674–700` the drawer's state and open handler; `:699–726` `loadDiscoveryConfig` — the depth `<select>` at `:717–718`; `:742–758` `renderDiscoveryNotes`; `:760–779` the Start handler, `branch: null` at `:768`; `:783–816` `renderDiscoverySession`, the position line at `:799–800`) — Why: the four drawer edits. Group 30 case 20 (`:6192–6235`) source-pins the provenance placeholder, the `if (!provenance)` guard before the POST and the three-way provenance note — none of this ticket's edits touch those lines; verify they still hold.
- `portal/public/index.html` (`:187–191` the session block; `#discovery-attribution` at `:190`) — Why: one new `<p>` for the escalation line goes after it.
- `.claude/references/gates.md` (`:49` group 30; `:51` group 31) — Why: one sentence each.
- `discovery/graded-think-a/transcript.jsonl` — Why: 11 `flag_weak_answer` closers each followed by a closer on the NEXT question. This is the package the cursor fold must keep reading as finished (§NOTES, the by-hand check).

### New Files to Create

None. (The plan's HTML brief beside this file is untracked, like its siblings.)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

All in-repo; nothing external is needed.

- `docs/epics/discovery-question-selection.architecture.md` §D1b, §D3, §D4, §D5 — the decisions inherited here.
- `discovery/README.md` §The op grammar (R2, the fresh slot, the counter paragraph) and §File shapes (`run.json`).
- `.claude/references/gates.md` §Group 30 — what the group already claims, so the new sentence extends rather than restates.

### Patterns to Follow

**Tables iterated in both directions (build-checks.mjs:5459–5470 group 28 case 14; ops.mjs `OPS`/`PARAMS`)** — a table's keys are compared to the vocabulary they index in BOTH directions, so a new entry with no row fails by name. `DEPTH_PROPOSAL` ↔ `ENTRY_MODES`, `LADDER ∪ {whole-bank}` ↔ `DEPTHS`, `ESCALATES` ⊂ `LADDER` all follow it.

**Pinned by driving, not by belief (discovery.mjs:92–96 `assertProvenanceRoot`'s comment)** — `COMPOSES` is asserted by calling `selectDepth(d, vector)` and `selectDepth(d)` for every depth, never by reading the literal.

**Guards throw plain Errors naming the value (discovery.mjs:51 `bad`)** — `discovery: transcript op 7 closes "s4-appetite", which is not in depth "opening-set"'s list — …`.

**The un-drivable write branch is pinned from source (build-checks.mjs:6765–6772)** — `openSession`'s create branch writes a real root and stays out of CI; what it writes is asserted by a regex over the `writeRun(root, {` literal, the same way the guard order is.

**Every gate message names the got-value (build-checks.mjs:5996–5997)** — `got ${JSON.stringify({ i: c0.index, q: c0.question?.id, t: c0.turn })}`.

**Header comments cite the governing doc (discovery.mjs:1–4; bank.mjs:1–4)** — each new export's comment names the PRD MVP or decision-doc section that decides it, in one or two sentences, and the gate case that pins it.

**Drawer copy states the consequence, not the word (portal.js:742–756)** — the depth note says what changes and where the person acts.

---

## IMPLEMENTATION PLAN

### Phase 1: The rules layer in `discovery.mjs`

Tables, `declareFacets`, `deriveCursor`, `escalationFor`, `runMetrics`; `openSession` and `sessionView` and `discoveryConfig` rewired; `branch` gone. After this phase the gate is RED by design at 30.9 (a weak flag no longer advances at scope-check), 30.11 (the config key set), 30.16 (`branch: "b2b"` no longer names #283) and 31.12 (`branch none`). Do not touch the gate first.

### Phase 2: The route and the drawer

**Depends on:** Phase 1 (the config payload's new keys). `server.mjs` forwards `facets`; `portal.js` preselects the proposal, drops `branch`, shows "asked again" and the escalation line; `index.html` gains one `<p>`.

### Phase 3: Group 30 and group 31

**Depends on:** Phase 1. **Independent of:** Phase 2 (the gate never imports the drawer). Case 9 and case 16 rewritten, case 11 extended, three cases added, the summary string rewritten; 31.12 swapped to `facets`.

### Phase 4: The projection header and the three fixtures

**Depends on:** Phase 3's 31.12 edit (so the gate names the fixtures that need regenerating). One line in `prd-projection.mjs`; regenerate the three gate-compared `prd.md` files; check the other three.

### Phase 5: Docs and gates

**Independent of:** Phases 2–4. README, `gates.md`, the module header.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — UPDATE branch

- **IMPLEMENT**: `git switch -c feat/285-session-rules origin/main` (PR #364 for #359 is merged; `origin/main` is `a8db292`). Stage by explicit path throughout — `docs/epics/discovery-partner.architecture.md` and `.prd.md` carry another session's uncommitted S4 edits and must not ride along (Q4).
- **VALIDATE**: `git status --short | grep -v '^??'` shows only the two `docs/epics/` M lines, none of them yours.

### Task 1 — UPDATE `portal/lib/discovery.mjs` — the import and the tables

- **IMPLEMENT**: extend `:46` to `import { DEPTHS, FACETS, facetPlan, OPENING_SET, questionById, QUESTIONS, selectDepth } from '../../discovery/bank.mjs';`. Add a new section after `// --- run.json ---`'s `writeRun` (i.e. before `openSession`, so the tables are defined above their first use):

```js
// --- the rules layer (#285; PRD MVP 5, MVP 6, MVP 8; decision doc D1b, D3, D4, D5) ------------------

// The interview rungs in order (MVP 5's table). whole-bank is OFF the ladder: a stress test of the
// bank whose 65 sealed answers are pasted one per question (#348's protocol), so it never holds a
// question for a second ask and never proposes a step up. Group 30 pins LADDER ∪ { whole-bank } to
// the depth menu, so a fifth depth is placed here by name rather than falling on one side by default.
export const LADDER = Object.freeze(['scope-check', 'opening-set', 'full-discovery']);

// D5's rule, as a table: which rung proposes which. ONE row, because MVP 5 writes it for Scope check
// alone ("a repeated weak answer at Scope check means proposing a step up, never grinding on"). Not
// derived from LADDER, so a rung escalates only where the PRD says it does; group 30 pins each row to
// the rung immediately above its key.
export const ESCALATES = Object.freeze({ 'scope-check': 'opening-set' });

// What the server proposes per entry mode (MVP 5: the agent proposes, the human confirms). Under
// approach C the server is the sequencing side, so the proposal is a table the gate can drive and it
// costs no token. blank-idea is MVP 5's "a new product". #286 adds a row per entry mode it adds —
// group 30 iterates ENTRY_MODES against this table both ways, so a mode with no row fails by name.
export const DEPTH_PROPOSAL = Object.freeze({ 'blank-idea': 'full-discovery' });

// Which depths compose from a facet vector (D1b). Asserted by DRIVING the bank, never by reading this
// list: group 30 proves selectDepth(d, <declared vector>) differs from selectDepth(d) iff d is here.
export const COMPOSES = Object.freeze(['full-discovery']);

// PRD §Success metrics, "Not a form": never more than 3 consecutive questions with no decision and no
// weak-answer note. A target the metric reports against, not a guard that stops a session.
export const NOT_A_FORM_MAX = 3;
```

- **PATTERN**: `bank.mjs:939–1029` (frozen tables with a comment naming the pin).
- **GOTCHA**: `DEPTHS` is already imported and used by `discoveryConfig`; `questionById` and `QUESTIONS` stay.
- **VALIDATE**: `node --check portal/lib/discovery.mjs`
- **SATISFIES**: AC1 (the proposal table), AC8 (the escalation table), AC3 (`COMPOSES`)

### Task 2 — ADD `declareFacets`, `deriveCursor`, `escalationFor`, `runMetrics` to `portal/lib/discovery.mjs`

- **IMPLEMENT**: directly under the tables:

```js
// The vector as run.json records it: null for NO vector (undefined, null, {} — every package before
// #285 and every one-argument caller), else all five keys as booleans in FACETS order. So a reader
// sees five keys or null, and the consumer preset (all false, DECLARED) is distinguishable from
// "nothing declared" (D1b). Junk — an unknown key, a non-boolean — throws by the bank's own name, so
// no run.json can carry a vector the bank would not read. Own keys only, as the bank reads them.
export function declareFacets(facets) {
  const plan = facetPlan(facets);
  if (!plan.declared) return null;
  return Object.freeze(Object.fromEntries(FACETS.map((f) => [f.id, Object.hasOwn(facets, f.id) && facets[f.id] === true])));
}

const closersOf = (transcript) => transcript.filter((l) => l?.type === 'op' && l.closes === true);

// THE CURSOR — derived from the record (invariant 4), read from the LAST closer rather than counted:
// its question's position in the list, plus one unless that question is HELD for a second ask. A
// question is held when the depth is on the ladder, its last closer is a flag_weak_answer and it has
// been asked only once — MVP 6's "pushes back once", the README's "a revisited question on a new turn
// is a fresh slot". A second closer of ANY kind settles it: never a third ask. Reading from the last
// closer, not counting closers, is what keeps every package recorded before this rule consistent with
// itself — graded-think-a holds eleven weak flags the record then moved past, and each reads as
// settled because a later closer sits on a later question. The turn id counts closers, not positions,
// so a held question gets a fresh turn id and R2 keeps one closer per turn.
export function deriveCursor({ depth, questions, transcript }) {
  if (!Array.isArray(questions) || !Array.isArray(transcript)) bad('deriveCursor needs the depth\'s question list and the parsed transcript');
  const closers = closersOf(transcript);
  const turn = `t${closers.length + 1}`;
  const at = (index, ask) => ({ index, ask, question: questions[index] ?? null, turn, total: questions.length, done: index >= questions.length });
  if (!closers.length) return at(0, 1);
  const last = closers[closers.length - 1];
  const qid = last.params?.question_id ?? null;
  const pos = questions.findIndex((q) => q.id === qid);
  if (pos === -1) bad(`transcript op ${last.seq} closes "${qid}", which is not in depth "${depth}"'s list — the record and the list disagree (was run.json edited after the fact?)`);
  const asks = closers.filter((c) => c.params?.question_id === qid).length;
  const held = LADDER.includes(depth) && last.op === 'flag_weak_answer' && asks < 2;
  return held ? at(pos, 2) : at(pos + 1, 1);
}

// D5: at a rung ESCALATES names, a question flagged weak on BOTH of its asks proposes the rung above.
// A VALUE on the view, never a mutation — run.json's depth is written once (D3) and the cursor has
// already settled the question, so the session continues. The person confirms by starting a new run at
// the proposed depth, or declines by carrying on. Null everywhere else, and null while the second ask
// is still open (one flag is a pushback, not a repeat).
export function escalationFor({ depth, transcript }) {
  const to = ESCALATES[depth];
  if (!to) return null;
  const byQuestion = new Map();
  for (const c of closersOf(transcript).filter((c) => c.op === 'flag_weak_answer'))
    byQuestion.set(c.params.question_id, [...(byQuestion.get(c.params.question_id) ?? []), c]);
  const because = [...byQuestion].filter(([, cs]) => cs.length >= 2)
    .map(([questionId, cs]) => ({ questionId, turns: cs.map((c) => c.turn), seqs: cs.map((c) => c.seq) }));
  if (!because.length) return null;
  return {
    from: depth, to, because,
    how: `A scoping question weak on both asks says the problem is not yet known, and "${to}" asks it. A run's depth is recorded once: to step up, start a new run at "${to}"; to decline, carry on — nothing here forces it.`,
  };
}

const rateOf = (part, whole) => (whole ? part / whole : null);
const tally = (closers, ids) => {
  const set = new Set(ids);
  const mine = closers.filter((c) => set.has(c.params?.question_id));
  const decided = mine.filter((c) => c.op === 'record_decision').length;
  return { closed: mine.length, decided, rate: rateOf(decided, mine.length) };
};

// The two counters, coverage and the D4 read — ARITHMETIC over the closers (architecture §Data model
// R2), never judgement, so group 30 drives every value at 0/1/2/3/4. Only closers count: file_evidence
// never closes and no off-script op does, so neither can touch a number here. Reported, never passed —
// a target on a counter invites tuning the bank to it (decision doc D4).
export function runMetrics({ depth, facets = null, questions, transcript }) {
  const closers = closersOf(transcript);
  // Not a form (MVP 8): a decision or a weak-answer note resets, a parked question increments.
  let streak = 0, longest = 0;
  for (const c of closers) { streak = c.op === 'open_question' ? streak + 1 : 0; longest = Math.max(longest, streak); }
  const flagged = closers.filter((c) => c.op === 'flag_weak_answer').length;
  // Coverage of the twelve from the OPS, not the cursor: a question skipped is not a question covered.
  const asked = new Set(closers.map((c) => c.params?.question_id));
  const decided = new Set(closers.filter((c) => c.op === 'record_decision').map((c) => c.params?.question_id));
  const cursor = deriveCursor({ depth, questions, transcript });
  const twelve = new Set(OPENING_SET);
  return {
    completion: { settled: cursor.index, total: questions.length, done: cursor.done, turns: closers.length },
    notAForm: { streak, longest, max: NOT_A_FORM_MAX, tripped: longest > NOT_A_FORM_MAX },
    weak: { flagged, closed: closers.length, rate: rateOf(flagged, closers.length) },
    coverage: { asked: OPENING_SET.filter((id) => asked.has(id)).length, decided: OPENING_SET.filter((id) => decided.has(id)).length, of: OPENING_SET.length, missing: OPENING_SET.filter((id) => !asked.has(id)) },
    // D4, full-discovery only: the facet-selected tail against the twelve, plus which modules composed.
    askedWhatMattered: COMPOSES.includes(depth)
      ? { twelve: tally(closers, OPENING_SET), tail: tally(closers, questions.map((q) => q.id).filter((id) => !twelve.has(id))), modules: facetPlan(facets).fits }
      : null,
  };
}
```

- **PATTERN**: `discovery.mjs:182–205` (pure over arguments, junk refused by name, frozen returns).
- **GOTCHA**: `deriveCursor` MUST read from the last closer, not count closers. Counting would make `graded-think-a`'s cursor read 54 of 65 and `spine-meridian-1`'s re-offer question 3. §NOTES has the by-hand check.
- **GOTCHA**: `OPENING_SET` is the twelve's ORDER; `coverage.missing` keeps it.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m => console.log(Object.keys(m).filter(k => /^(LADDER|ESCALATES|DEPTH_PROPOSAL|COMPOSES|NOT_A_FORM_MAX|declareFacets|deriveCursor|escalationFor|runMetrics)$/.test(k)).length))"` prints `9`.
- **SATISFIES**: AC2 (`declareFacets` resolves through the bank), AC8 (the re-ask and the proposal), AC9 (the counter), AC10 (coverage), AC11 (the rate), AC12 (asked what mattered)

### Task 3 — UPDATE `openSession` in `portal/lib/discovery.mjs`

- **IMPLEMENT**: signature `openSession({ slug, provenance, entryMode, depth, facets = null, frontEnd, posture, reads = [] })`. Replace `:484–486` with:

```js
  const declared = declareFacets(facets);   // the bank's own throw names an unknown or non-boolean facet
  // The bank's own throw names an unknown depth — and a vector that overflows full discovery's budget,
  // naming what fits and what does not (D1a). Nothing here trims a vector to fit: the session module
  // resolves nothing on the person's behalf; #288's control is where the person does.
  selectDepth(depth, declared);
```

  and in the `writeRun` literal replace `depth, branch, reads,` with `depth, proposedDepth: DEPTH_PROPOSAL[entryMode], facets: declared, reads,`. Update the header comment above `openSession` (`:472–473`) with one sentence: *"`facets` is recorded normalised (five booleans or null) and `proposedDepth` beside the confirmed `depth` — MVP 5's agent-proposes / human-confirms, recorded rather than inferred."*
- **GOTCHA**: `DEPTH_PROPOSAL[entryMode]` is safe only after the `ENTRY_MODES` guard; keep the guard order. Every guard still precedes `mkdirSync` (case 16 pins it from source).
- **GOTCHA**: `declareFacets` before `selectDepth`, as two calls — case 16's eight-guard pin counts `declareFacets(` as the guard that replaced the `branch` one.
- **VALIDATE**: `grep -n "branch" portal/lib/discovery.mjs` prints nothing.
- **SATISFIES**: AC1 (recorded), AC2 (`branch` removed from `openSession` and `run.json`), AC7 (overflow refused, never trimmed)

### Task 4 — UPDATE `sessionView` and `discoveryConfig` in `portal/lib/discovery.mjs`

- **IMPLEMENT**: `sessionView`:

```js
export function sessionView(root) {
  const head = readRun(root);
  if (!head) bad(`no run.json under "${root}" — open the session first`);
  const answers = readAnswers(root);
  const transcript = readTranscript(root);
  const facets = head.facets ?? null;   // packages before #285 carry no field and read as the unfaceted list
  const questions = selectDepth(head.depth, facets);
  return {
    head, answers, transcript,
    cursor: deriveCursor({ depth: head.depth, questions, transcript }),
    escalation: escalationFor({ depth: head.depth, transcript }),
    metrics: runMetrics({ depth: head.depth, facets, questions, transcript }),
  };
}
```

  Rewrite its comment (`:528–530`): the cursor is derived from the LAST closer (see `deriveCursor`); a turn that did not close still re-uses its turn id. `discoveryConfig`:

```js
    depths: Object.entries(DEPTHS).map(([id, d]) => ({
      id, label: d.label, when: d.when,
      // The UNFACETED length, for every depth. Where `composes` is true a declared vector moves it
      // (D1b), and the count cannot know the vector before one exists — so the route says so rather
      // than reporting a number the confirmed vector will change.
      count: d.ids.length, composes: COMPOSES.includes(id),
    })),
    facets: FACETS,
    presets: PRESETS,
    depthProposals: DEPTH_PROPOSAL,
```

  `PRESETS` must be imported (add to the Task 1 import). Add `LADDER, ESCALATES, DEPTH_PROPOSAL, COMPOSES, NOT_A_FORM_MAX` nowhere else — they are already exported at declaration.
- **GOTCHA**: `FACETS` carries `question` and `fires` — both are for the drawer; neither is a rubric. `weakAnswer` stays stripped by `forTheBrowser`.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(m => console.log(Object.keys(m.discoveryConfig()).sort().join(',')))"` prints `depthProposals,depths,entryModes,facets,frontEnds,hasToken,ops,postures,presets,provenances,questions`.
- **SATISFIES**: AC1 (drives which ids the cursor walks), AC5 (the unfaceted count, said so), AC2 (`branch` gone from `discoveryConfig`)

### Task 5 — UPDATE `portal/server.mjs` — the session route

- **IMPLEMENT**: `:173` → `facets: b.facets ?? null, frontEnd: b.frontEnd, posture: b.posture,`. Extend the route comment: *"`facets` (#285) is the declared vector or absent; the drawer sends none until #288, so it opens unfaceted sessions; the server accepts a vector today."*
- **PATTERN**: `server.mjs:169–178` — every parameter named.
- **VALIDATE**: `grep -n "branch" portal/server.mjs` prints nothing.
- **SATISFIES**: AC2

### Task 6 — UPDATE `portal/public/portal.js` + `index.html` — the drawer

- **IMPLEMENT**:
  1. Under `const discovery = { … }` (`:683`) add `const DISCOVERY_ENTRY_MODE = 'blank-idea'; // the one entry mode the drawer ships (#286 adds the others)` and use it at the POST.
  2. `loadDiscoveryConfig` (`:717–718`): after building the depth options, `$('#discovery-depth').value = c.depthProposals[DISCOVERY_ENTRY_MODE] ?? c.depths[0].id;` with a comment: *the proposal (MVP 5: the agent proposes, the human confirms). Confirming is pressing Start; changing it is picking another option.*
  3. `renderDiscoveryNotes` (`:754–755`):
     ```js
     const d = c.depths.find((x) => x.id === $('#discovery-depth').value);
     const proposed = c.depthProposals[DISCOVERY_ENTRY_MODE];
     $('#discovery-depth-note').textContent = d
       ? `${d.count} questions${d.composes ? ' before any facet vector — a declared vector moves this count (#288)' : ''} — for ${d.when}. ${d.id === proposed ? 'Proposed for a blank idea; Start confirms it.' : `The proposal for a blank idea was ${proposed}; you are overriding it.`}`
       : '';
     ```
  4. The Start handler (`:768`): drop `branch: null`; `entryMode: DISCOVERY_ENTRY_MODE`.
  5. `renderDiscoverySession` (`:799–800`): the position line gains `${cursor.ask > 1 ? ' · asked again' : ''}` after the question count. After the attribution line add:
     ```js
     const esc$ = $('#discovery-escalation');
     esc$.textContent = s.escalation ? `Step up? ${s.escalation.how}` : '';
     esc$.hidden = !s.escalation;
     ```
  6. `index.html` after `:190`: `<p class="muted" id="discovery-escalation" aria-live="polite" hidden></p>`.
- **GOTCHA**: do not move or reword `$('#discovery-provenance').innerHTML`, `if (!provenance)` or `$('#discovery-provenance-note').textContent` — case 20 source-pins them by position and shape.
- **GOTCHA**: `hidden` on a `<p>` — check `portal.css` sets no `display` on `#discovery-escalation` or `.muted` (memory: `hidden` is defeated where CSS sets `display`). `textContent = ''` is the belt if it does.
- **VALIDATE**: `node --check` does not apply to a DOM module; `grep -n "branch" portal/public/portal.js` prints nothing, and the portal smoke in §VALIDATION Level 4 shows the note and the preselected depth.
- **SATISFIES**: AC1 (the human confirms), AC2 (`branch` gone from the drawer), AC8 (the proposal is visible)

### Task 7 — UPDATE `tooling/build-checks.mjs` — the import and case 9

- **IMPLEMENT**: add `COMPOSES, declareFacets, deriveCursor, DEPTH_PROPOSAL, ESCALATES, escalationFor, LADDER, NOT_A_FORM_MAX, runMetrics` to the `portal/lib/discovery.mjs` import (`:244–252`). Rewrite case 9 (`:5984–6009`). Keep the empty / text / non-closing / denied assertions verbatim. Replace the weak-flag assertions with the re-ask rule:

```js
  // A weak flag on a LADDER depth HOLDS the question for one fresh slot — MVP 6's "pushes back once".
  appendTranscript(cursorRoot, opLine({ record: { seq: 2, turn: "t1", op: "flag_weak_answer", params: { question_id: depthIds[0], answer_ref: "a1", missing: ["a number"] }, closes: true, flagged: [], supersedes: null } }));
  const c1 = sessionView(cursorRoot).cursor;
  ok(c1.index === 0 && c1.ask === 2 && c1.question.id === depthIds[0] && c1.turn === "t2", `case 9: a first weak flag must HOLD the question on a fresh turn (index 0, ask 2, t2) — got ${JSON.stringify({ i: c1.index, a: c1.ask, q: c1.question?.id, t: c1.turn })}`);
  // A second closer of ANY kind settles it — never a third ask. Drive all three kinds on separate roots... (the second flag here; a decision and a parked question below).
  appendTranscript(cursorRoot, opLine({ record: { seq: 3, turn: "t2", op: "flag_weak_answer", params: { question_id: depthIds[0], answer_ref: "a2", missing: ["a number"] }, closes: true, flagged: [], supersedes: null } }));
  const c2 = sessionView(cursorRoot).cursor;
  ok(c2.index === 1 && c2.ask === 1 && c2.question.id === depthIds[1] && c2.turn === "t3", `case 9: a second weak flag must SETTLE the question — got ${JSON.stringify({ i: c2.index, a: c2.ask, q: c2.question?.id, t: c2.turn })}`);
  // A decision and a parked question each advance exactly one, first time.
  appendTranscript(cursorRoot, opLine({ record: { seq: 4, turn: "t3", op: "record_decision", params: { question_id: depthIds[1], answer_ref: "a3", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: false }, closes: true, flagged: ["no-evidence"], supersedes: null } }));
  ok(sessionView(cursorRoot).cursor.index === 2, "case 9: a decision must advance exactly one");
  appendTranscript(cursorRoot, opLine({ record: { seq: 5, turn: "t4", op: "open_question", params: { source: "banked", question_id: depthIds[2], answer_ref: "a4", reason: "parked" }, closes: true, flagged: [], supersedes: null } }));
  ok(sessionView(cursorRoot).cursor.index === 3 && sessionView(cursorRoot).cursor.turn === "t5", "case 9: a parked question must advance exactly one, on the next turn id");
  // THE RECORDED-BEFORE-#285 SHAPE: a weak flag the record then moved past reads as settled, because the
  // cursor reads from the LAST closer. graded-think-a holds eleven of these; this is what keeps it done.
  appendTranscript(cursorRoot, opLine({ record: { seq: 6, turn: "t5", op: "flag_weak_answer", params: { question_id: depthIds[3], answer_ref: "a5", missing: ["x"] }, closes: true, flagged: [], supersedes: null } }));
  appendTranscript(cursorRoot, opLine({ record: { seq: 7, turn: "t6", op: "record_decision", params: { question_id: depthIds[4], answer_ref: "a6", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: false }, closes: true, flagged: ["no-evidence"], supersedes: null } }));
  const c6 = sessionView(cursorRoot).cursor;
  ok(c6.index === 5 && c6.ask === 1 && c6.turn === "t7", `case 9: a weak flag the record moved past must read as settled (index 5) — got ${JSON.stringify({ i: c6.index, a: c6.ask, t: c6.turn })}`);
  // Past the end.
  appendTranscript(cursorRoot, opLine({ record: { seq: 8, turn: "t7", op: "record_decision", params: { question_id: depthIds[5], answer_ref: "a7", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: false }, closes: true, flagged: ["no-evidence"], supersedes: null } }));
  const cEnd = sessionView(cursorRoot).cursor;
  ok(cEnd.done === true && cEnd.question === null && cEnd.index === depthIds.length, `case 9: past the end must read done with a null question — got ${JSON.stringify({ i: cEnd.index, q: cEnd.question, done: cEnd.done })}`);
  // whole-bank is OFF the ladder: a weak flag advances one, never holds (#348's one-answer-per-question protocol).
  const wbRoot = tmpRoot("cursor-wb");
  writeFileSync(join(wbRoot, "run.json"), JSON.stringify({ slug: "wb", provenance: "fictional", entryMode: "blank-idea", depth: "whole-bank", frontEnd: "portal", model: "claude-sonnet-5", posture: "think", sessionId: null, startedAt: "2026-01-01T00:00:00.000Z", endedAt: null, root: "discovery/wb", turnStats: [] }, null, 2));
  writeFileSync(join(wbRoot, "answers.jsonl"), ""); writeFileSync(join(wbRoot, "transcript.jsonl"), "");
  const wbIds = selectDepth("whole-bank").map((q) => q.id);
  appendTranscript(wbRoot, opLine({ record: { seq: 1, turn: "t1", op: "flag_weak_answer", params: { question_id: wbIds[0], answer_ref: "a1", missing: ["x"] }, closes: true, flagged: [], supersedes: null } }));
  ok(sessionView(wbRoot).cursor.index === 1 && sessionView(wbRoot).cursor.ask === 1, "case 9: whole-bank must never hold a question — a weak flag advances one");
  // A closer whose question is not in the list is refused by name (a run.json edited after the fact).
  writeFileSync(join(wbRoot, "run.json"), JSON.stringify({ ...JSON.parse(readFileSync(join(wbRoot, "run.json"), "utf8")), depth: "scope-check" }, null, 2));
  ok(names(() => sessionView(wbRoot), "op 1", "scope-check") === null, "case 9: a closer on a question outside the depth's list must be refused naming the seq and the depth");
```

  Also drop `branch: null` from the case-9 `run.json` literal (`:5989`) and add `facets: null`. Use the cursor's own `depthIds` as above (scope-check has six ids, so the sequence fits exactly). In the header comment for group 30 (`:5858–5875`), extend the list of what is drivable with *"the rules layer — the depth proposal, the facet vector's read side, the re-ask, D5's proposal and the two counters (#285)"*.
- **GOTCHA**: `names()` returns `"did not throw"` when nothing threw and `null` when every needle matched — so a refusal is asserted with `=== null`, as above.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "case 9|discovery ✓|✗"` — every case-9 line green.
- **SATISFIES**: AC8 (never a third ask; whole-bank off the ladder), AC1 (drives which ids the cursor walks)

### Task 8 — UPDATE `tooling/build-checks.mjs` — case 11 and case 16

- **IMPLEMENT**: case 11 (`:6112–6116`): the key set becomes `["depthProposals", "depths", "entryModes", "facets", "frontEnds", "hasToken", "ops", "postures", "presets", "provenances", "questions"]`. Add:

```js
  // #285: every depth carries its UNFACETED count and says whether a vector moves it — asserted by
  // DRIVING the bank, not by reading COMPOSES.
  for (const d of discoveryConfig().depths) {
    ok(d.count === DEPTHS[d.id].ids.length, `case 11: depth ${d.id} reports count ${d.count}, the literal has ${DEPTHS[d.id].ids.length} — the config states the UNFACETED count`);
    const moved = JSON.stringify(selectDepth(d.id, PRESETS[0].facets).map((q) => q.id)) !== JSON.stringify(selectDepth(d.id).map((q) => q.id));
    ok(d.composes === moved && COMPOSES.includes(d.id) === moved, `case 11: depth ${d.id} says composes ${d.composes}, but a declared vector ${moved ? "MOVES" : "does not move"} its list`);
  }
  ok(same(discoveryConfig().facets, FACETS) && same(discoveryConfig().presets, PRESETS) && same(discoveryConfig().depthProposals, DEPTH_PROPOSAL), "case 11: the config must serve the bank's FACETS and PRESETS and the session's DEPTH_PROPOSAL — the UI holds no second copy");
```

  Case 16 (`:6752–6772`): `openArgs` drops `branch: null` (do NOT add `facets` — absent is the common case). Replace `:6758` with:

```js
  // The facet vector (#285, replacing the spine's "non-null branch refused naming #283"): junk refused
  // by the BANK's name, an overflowing vector refused naming what does not fit and the whole-bank
  // escape — never trimmed. Acceptance of a good vector is a write and is pinned from source below.
  ok(refusedOpen({ facets: { marketplace: true } })?.includes("unknown facet"), "case 16: an unknown facet must be refused by the bank's name");
  ok(refusedOpen({ facets: { hasModel: "yes" } })?.includes("true or false"), "case 16: a non-boolean facet must be refused by the bank's name");
  ok(refusedOpen({ facets: [true] })?.includes("facets must be"), "case 16: a non-object vector must be refused by the bank's name");
  const over = refusedOpen({ depth: "full-discovery", facets: { hasModel: true, regulated: true, internal: true } });
  ok(over?.includes("overflows") && over.includes("internal (6)") && over.includes("whole-bank"), `case 16: an overflowing vector must be refused naming the facet that does not fit and the whole-bank escape — got ${JSON.stringify(over)}`);
  // ACCEPTANCE is asserted through declareFacets, never through openSession: a good vector on the
  // reserved slug would reach mkdirSync and write a package.
  ok(declareFacets({}) === null && declareFacets(undefined) === null && declareFacets(null) === null, "case 16: {} / undefined / null are NO vector (D1b) and open an unfaceted session");
  ok(same(declareFacets({ regulated: true }), { hasModel: false, regulated: true, internal: false, orgBuys: false, replacesAProcess: false }) && same(declareFacets(PRESETS[3].facets), PRESETS[3].facets), "case 16: a declared vector normalises to all five keys in FACETS order; the consumer preset stays DECLARED");
  ok(Object.isFrozen(declareFacets({ regulated: true })), "case 16: the recorded vector is frozen");
```

  Update the guard regex at `:6770` to `/\b(?:bad|selectDepth|declareFacets|assertRunSlug|assertProvenanceRoot|allowSetFor)\(/g` and the message at `:6771` to name `(slug, root, reads, entryMode, frontEnd, posture, facets, depth)`. Add the write-side source pin right after:

```js
  // What the create branch WRITES, pinned from source (the branch itself stays out of CI): the vector
  // normalised, the proposal beside the confirmed depth, and no `branch` anywhere in the module.
  const writeAt = openBody.indexOf("writeRun(root, {");
  const writeLit = openBody.slice(writeAt, openBody.indexOf("});", writeAt));
  ok(writeAt !== -1 && /\bfacets: declared\b/.test(writeLit) && /\bproposedDepth: DEPTH_PROPOSAL\[entryMode\]/.test(writeLit), `case 16: openSession's writeRun literal must record facets: declared and proposedDepth — got ${JSON.stringify(writeLit.slice(0, 200))}`);
  ok(!/\bbranch\b/.test(discoverySrc), "case 16: `branch` must not appear in portal/lib/discovery.mjs — it stopped existing as a parameter (decision doc D5)");
```

- **GOTCHA**: `PRESETS[0]` is Regulated (declared, one module); `PRESETS[3]` is Consumer (declared all-false). Both are declared vectors; only `{}` / `null` / `undefined` are "no vector".
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "case 11|case 16|✗"` — green, and `ls discovery/ | grep ci-refused` prints nothing.
- **SATISFIES**: AC5 (the unfaceted count), AC6 (the refusal replaced, the guard kept, eight guards), AC7 (overflow refused by name), AC2

### Task 9 — ADD group 30 cases 27–29 to `tooling/build-checks.mjs`

- **IMPLEMENT**: before the closing `rmSync(TMP, …)` of group 30:

```js
  // 30.27 — THE TABLES (#285). Each iterated against the vocabulary it indexes in BOTH directions, so
  // a fifth depth, a second entry mode or a stray row fails by name.
  ok(same([...LADDER, "whole-bank"].sort(), Object.keys(DEPTHS).sort()), `case 27: LADDER ∪ { whole-bank } is ${[...LADDER, "whole-bank"].join(",")} and the depth menu is ${Object.keys(DEPTHS).join(",")} — a new depth is placed on or off the ladder by name`);
  ok(same(Object.keys(DEPTH_PROPOSAL).sort(), [...ENTRY_MODES].sort()), `case 27: DEPTH_PROPOSAL keys ${Object.keys(DEPTH_PROPOSAL)} != ENTRY_MODES ${ENTRY_MODES} — every entry mode proposes a depth (MVP 5)`);
  for (const [mode, d] of Object.entries(DEPTH_PROPOSAL)) ok(LADDER.includes(d), `case 27: DEPTH_PROPOSAL[${mode}] = ${d} is not an interview rung — whole-bank is a stress test and is never proposed`);
  for (const [from, to] of Object.entries(ESCALATES)) ok(LADDER.indexOf(to) === LADDER.indexOf(from) + 1, `case 27: ESCALATES[${from}] = ${to} is not the rung immediately above`);
  ok(same(Object.keys(ESCALATES), ["scope-check"]), `case 27: ESCALATES has rows for ${Object.keys(ESCALATES)} — MVP 5 writes the rule for Scope check alone; a second row is a PRD amendment`);
  ok(NOT_A_FORM_MAX === 3, `case 27: NOT_A_FORM_MAX is ${NOT_A_FORM_MAX}, the PRD says 3`);
  for (const t of [LADDER, ESCALATES, DEPTH_PROPOSAL, COMPOSES]) ok(Object.isFrozen(t), "case 27: a rules table is not frozen");

  // 30.28 — THE FACETED READ SIDE and D5's PROPOSAL, over temp roots. The write side is case 16's pin.
  {
    const mk = (name, head) => { const r = tmpRoot(name); writeFileSync(join(r, "run.json"), JSON.stringify({ slug: name, provenance: "fictional", entryMode: "blank-idea", frontEnd: "portal", model: "claude-sonnet-5", posture: "think", sessionId: null, startedAt: "2026-01-01T00:00:00.000Z", endedAt: null, root: `discovery/${name}`, turnStats: [], ...head }, null, 2)); writeFileSync(join(r, "answers.jsonl"), ""); writeFileSync(join(r, "transcript.jsonl"), ""); return r; };
    const ids = (root) => { const v = sessionView(root); return selectDepth(v.head.depth, v.head.facets ?? null).map((q) => q.id); };
    // A declared vector drives the walk; absent, null and {} read as today's list; a non-composing depth ignores it.
    const faceted = mk("faceted", { depth: "full-discovery", facets: PRESETS[0].facets });
    ok(same(ids(faceted), selectDepth("full-discovery", PRESETS[0].facets).map((q) => q.id)) && sessionView(faceted).cursor.total === 22, `case 28: a faceted run.json must walk the composed list (regulated: 12 + 6 + 4 = 22) — got ${sessionView(faceted).cursor.total}`);
    for (const absent of [{}, { facets: null }]) { const r = mk(`unfaceted-${Object.keys(absent).length}`, { depth: "full-discovery", ...absent }); ok(sessionView(r).cursor.total === 30 && same(ids(r), selectDepth("full-discovery").map((q) => q.id)), "case 28: no facets field / facets: null must read as the unfaceted 30"); }
    const ignored = mk("ignored", { depth: "scope-check", facets: PRESETS[2].facets });
    ok(sessionView(ignored).cursor.total === 6, "case 28: a vector on scope-check is recorded and ignored — the literal six (D1b totality)");
    ok(threw(() => sessionView(mk("junk", { depth: "full-discovery", facets: { marketplace: true } })))?.message.includes("unknown facet"), "case 28: a run.json carrying a facet the bank does not know must throw by the bank's name");
    // The cursor at a re-ask names the second ask; the metrics see one closer.
    const sc = mk("escalate", { depth: "scope-check" });
    const six = selectDepth("scope-check").map((q) => q.id);
    const weak = (seq, turn, qid) => appendTranscript(sc, opLine({ record: { seq, turn, op: "flag_weak_answer", params: { question_id: qid, answer_ref: `a${seq}`, missing: ["x"] }, closes: true, flagged: [], supersedes: null } }));
    ok(sessionView(sc).escalation === null, "case 28: an empty scope-check proposes nothing");
    weak(1, "t1", six[0]);
    ok(sessionView(sc).escalation === null && sessionView(sc).cursor.ask === 2, "case 28: ONE weak flag is a pushback, not a repeat — no proposal while the second ask is open");
    weak(2, "t2", six[0]);
    const e = sessionView(sc).escalation;
    ok(e?.from === "scope-check" && e.to === "opening-set" && same(e.because, [{ questionId: six[0], turns: ["t1", "t2"], seqs: [1, 2] }]) && /new run/.test(e.how),
      `case 28: two weak flags on one scoping question must PROPOSE opening-set naming the question and both turns — got ${JSON.stringify(e)}`);
    ok(sessionView(sc).cursor.index === 1 && sessionView(sc).head.depth === "scope-check" && JSON.parse(readFileSync(join(sc, "run.json"), "utf8")).depth === "scope-check", "case 28: the proposal FORCES nothing — the cursor moved on and run.json's depth is untouched");
    // The same two flags on the other three depths propose nothing (ESCALATES has one row).
    for (const d of ["opening-set", "full-discovery", "whole-bank"]) {
      const r = mk(`no-esc-${d}`, { depth: d }); const q = selectDepth(d)[0].id;
      appendTranscript(r, opLine({ record: { seq: 1, turn: "t1", op: "flag_weak_answer", params: { question_id: q, answer_ref: "a1", missing: ["x"] }, closes: true, flagged: [], supersedes: null } }));
      appendTranscript(r, opLine({ record: { seq: 2, turn: "t2", op: "flag_weak_answer", params: { question_id: d === "whole-bank" ? selectDepth(d)[1].id : q, answer_ref: "a2", missing: ["x"] }, closes: true, flagged: [], supersedes: null } }));
      ok(sessionView(r).escalation === null, `case 28: ${d} must propose nothing — only ESCALATES' rows propose`);
    }
    // Purity: the same input twice, and the returned value is not the transcript's own array.
    ok(same(sessionView(sc), sessionView(sc)), "case 28: sessionView must be deterministic over one package");
  }

  // 30.29 — THE COUNTERS at 0/1/2/3/4 across every op kind, including the two that must not move them.
  {
    const qs = selectDepth("full-discovery");
    const T = [];
    const op = (seq, turn, kind, params, closes) => T.push({ type: "op", ts: "2026-01-01T00:00:00.000Z", seq, turn, op: kind, params, closes, flagged: [], supersedes: null });
    const m = () => runMetrics({ depth: "full-discovery", facets: null, questions: qs, transcript: T });
    ok(m().notAForm.streak === 0 && m().notAForm.longest === 0 && m().notAForm.tripped === false && m().weak.rate === null && m().coverage.asked === 0 && same(m().coverage.missing, [...OPENING_SET]) && m().askedWhatMattered.twelve.rate === null, `case 29: the empty run reads all zeros and null rates — got ${JSON.stringify(m())}`);
    // 1, 2, 3, 4 parked in a row: the streak climbs and trips at 4 (PRD MVP 8: parking counts as neither).
    for (let i = 0; i < 4; i += 1) {
      op(i + 1, `t${i + 1}`, "open_question", { source: "banked", question_id: qs[i].id, answer_ref: `a${i + 1}`, reason: "later" }, true);
      ok(m().notAForm.streak === i + 1 && m().notAForm.longest === i + 1 && m().notAForm.tripped === (i + 1 > NOT_A_FORM_MAX), `case 29: after ${i + 1} parked, streak ${m().notAForm.streak}, tripped ${m().notAForm.tripped}`);
    }
    // The two that must NOT move it: file_evidence (never closes) and every off-script op.
    op(5, "t5", "file_evidence", { url: "https://x.test", ref: null, name: null, provenance: "assumption", claim_ref: null }, false);
    op(6, "t5", "record_decision", { question_id: null, answer_ref: "a5", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: true }, false);
    op(7, "t5", "open_question", { source: "off-script", question_id: null, answer_ref: "a5", reason: "aside" }, false);
    ok(m().notAForm.streak === 4 && m().completion.turns === 4 && m().coverage.asked === 4, `case 29: file_evidence and off-script ops moved a counter — ${JSON.stringify(m())}`);
    // A decision resets to 0; a weak flag resets to 0; longest stays 4.
    op(8, "t5", "record_decision", { question_id: qs[4].id, answer_ref: "a5", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: false }, true);
    ok(m().notAForm.streak === 0 && m().notAForm.longest === 4, "case 29: a decision must reset the streak and keep longest");
    op(9, "t6", "open_question", { source: "banked", question_id: qs[5].id, answer_ref: "a6", reason: "later" }, true);
    op(10, "t7", "flag_weak_answer", { question_id: qs[6].id, answer_ref: "a7", missing: ["x"] }, true);
    ok(m().notAForm.streak === 0 && m().weak.flagged === 1 && m().weak.closed === 7 && Math.abs(m().weak.rate - 1 / 7) < 1e-9, `case 29: a weak flag must reset the streak and count in the RATE — ${JSON.stringify(m().weak)}`);
    // Coverage from the OPS, not the cursor: skip a question by closing the one after it.
    op(11, "t8", "record_decision", { question_id: qs[8].id, answer_ref: "a8", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: false }, true);   // qs[7] skipped
    const cov = m().coverage;
    ok(cov.asked === 8 && cov.decided === 2 && cov.of === 12 && same(cov.missing, [qs[7].id, ...qs.slice(9, 12).map((q) => q.id)]), `case 29: coverage must be read from the ops — a skipped question is not covered — got ${JSON.stringify(cov)}`);
    ok(deriveCursor({ depth: "full-discovery", questions: qs, transcript: T }).index === 9 && cov.asked === 8, "case 29: the cursor says 9 settled and coverage says 8 asked — the two reads differ, which is the point");
    // Asked what mattered: the twelve against the tail, full-discovery only.
    op(12, "t9", "record_decision", { question_id: qs[12].id, answer_ref: "a9", level: "business", parent_id: null, evidence_refs: [], wrong_if: "w", off_script: false }, true);
    op(13, "t10", "open_question", { source: "banked", question_id: qs[13].id, answer_ref: "a10", reason: "later" }, true);
    const awm = m().askedWhatMattered;
    ok(awm.twelve.closed === 8 && awm.twelve.decided === 2 && awm.tail.closed === 2 && awm.tail.decided === 1 && awm.tail.rate === 0.5 && same(awm.modules, []), `case 29: asked-what-mattered must tally the twelve and the tail separately — got ${JSON.stringify(awm)}`);
    // Over the FACETED list, with the closers that sit on the twelve only (ops 12–13 close unfaceted-tail
    // questions the regulated list does not hold, and deriveCursor would rightly refuse them).
    ok(same(runMetrics({ depth: "full-discovery", facets: PRESETS[0].facets, questions: selectDepth("full-discovery", PRESETS[0].facets), transcript: T.filter((l) => l.seq <= 11) }).askedWhatMattered.modules, ["regulated"]), "case 29: the modules that composed are reported beside the rates (D4's dropped-module read)");
    for (const d of ["scope-check", "opening-set", "whole-bank"]) ok(runMetrics({ depth: d, questions: selectDepth(d), transcript: [] }).askedWhatMattered === null, `case 29: ${d} must report asked-what-mattered as null — full-discovery only`);
    // Purity.
    const before = JSON.stringify(T); m(); ok(JSON.stringify(T) === before && same(m(), m()), "case 29: runMetrics must not touch its input and must be deterministic");
  }
```

  Then rewrite the `group("discovery", …)` summary at `:6778`: replace *"openSession's five refusals (entryMode, frontEnd, posture, depth, non-null branch) each driven"* with *"openSession's six refusals (entryMode, frontEnd, posture, depth, a junk facet by the bank's name, an overflowing vector naming what does not fit) each driven, `{}` proven to be NO vector, the write literal pinned to record `facets: declared` and `proposedDepth`, and `branch` proven absent from the module"*, and append before the *Cannot reach* sentence: *"· #285 added THE RULES LAYER: `LADDER` ∪ whole-bank pinned to the depth menu, `DEPTH_PROPOSAL` ↔ `ENTRY_MODES` both ways with every proposal an interview rung, `ESCALATES` one row pinned to the rung immediately above, `COMPOSES` proven by driving the bank, the config's per-depth UNFACETED count and `composes` flag · the cursor read from the LAST closer — a first weak flag HOLDS the question for one fresh turn, a second closer of any kind settles it, whole-bank never holds, a weak flag the record moved past reads as settled (the shape graded-think-a holds eleven times), a closer outside the list refused naming the seq · D5's proposal as a VALUE: null on one flag, present with the question and both turns on two, run.json's depth untouched, null on the three depths ESCALATES does not name · the counters at 0/1/2/3/4 with file_evidence and both off-script ops proven not to move them, the weak-answer RATE, coverage from the ops diverging from the cursor on a skipped question, and asked-what-mattered tallying the twelve and the tail with the composed modules"*. Extend the *Cannot reach* sentence with: *"whether the drawer shows the re-asked question and the proposal — portal.js touches the DOM at module scope; the portal smoke is the check."*
- **GOTCHA**: `same()` is a JSON compare; `sessionView` returns frozen sub-objects from `declareFacets` only via `head`, which is parsed JSON — fine.
- **GOTCHA**: `PRESETS[2]` is Internal tool (`internal` + `orgBuys`, two modules, fits: 12 + 6 + 6 + 4 = 28); `PRESETS[0]` Regulated composes 22. The `total === 22` literal in case 28 is that arithmetic.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`.
- **SATISFIES**: AC3 (totality read side), AC4 (the prefix is group 28's; the read side walks the composed list), AC8, AC9, AC10, AC11, AC12, AC13 (pure-function cases, no SDK)

### Task 10 — UPDATE `tooling/build-checks.mjs` group 31 — `branch` → `facets`

- **IMPLEMENT**: `:6906` `branch: null,` → `facets: null,`. In 31.12 (`:7231`) the loop `["posture", "branch", "endedAt", "model", "turnStats"]` → `["posture", "facets", "endedAt", "model", "turnStats"]`. `:7240` → `ok(doc.includes("unfaceted") && doc.includes("ended 2026-08-29T09:40:00.000Z"), "a null facets must read `unfaceted` …")`. `:7246` the `runLine` literal: `· branch none ·` → `· unfaceted ·`. Add after the Run-line assertion:

```js
    const withVector = projectPrd({ run: { ...PRD_RUN, facets: { hasModel: false, regulated: true, internal: false, orgBuys: true, replacesAProcess: false } }, answers: PRD_ANSWERS, ops: PRD_RECORDS });
    ok(withVector.includes("· facets regulated + orgBuys ·"), "a declared vector must render its ticked facets in FACETS order on the Run line");
    ok(projectPrd({ run: { ...PRD_RUN, facets: { hasModel: false, regulated: false, internal: false, orgBuys: false, replacesAProcess: false } }, answers: PRD_ANSWERS, ops: PRD_RECORDS }).includes("· facets none ticked ·"), "a declared all-false vector (the consumer preset) must read `facets none ticked`, not `unfaceted` — D1b's distinction");
    ok(projectPrd({ run: { ...PRD_RUN, branch: null }, answers: PRD_ANSWERS, ops: PRD_RECORDS }).includes("· unfaceted ·") && !projectPrd({ run: { ...PRD_RUN, branch: null }, answers: PRD_ANSWERS, ops: PRD_RECORDS }).includes("branch"), "a package recorded before #285 (branch: null, no facets) must read `unfaceted` and never `branch`");
```

- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "31\.|32\.5|33\.15|✗"` — 31 green; 32.5 and 33.15 RED naming the three `prd.md` files (expected until Task 11).
- **SATISFIES**: AC2 (`branch` gone from the projection's pin)

### Task 11 — UPDATE `discovery/prd-projection.mjs` — the run header; REGENERATE the three fixtures

- **IMPLEMENT**: above `projectPrd` (near `field()` at `:113–128`) add:

```js
// The facet vector on the run header (#285). Absent or null — every package recorded before #285, and
// every unfaceted run since — reads `unfaceted`; a declared vector reads its ticked facets in the order
// run.json stores them (FACETS order, by declareFacets), or `facets none ticked` for the consumer
// preset, which is declared and composes 16 (D1b's distinction, kept on the page).
const facetsLabel = (f) => {
  if (f === null || f === undefined || typeof f !== "object" || Array.isArray(f)) return "unfaceted";
  const on = Object.keys(f).filter((k) => f[k] === true);
  return on.length ? `facets ${on.join(" + ")}` : "facets none ticked";
};
```

  and at `:670` replace `· branch ${run.branch === null || run.branch === undefined ? "none" : field(run.branch)} ·` with `· ${facetsLabel(run.facets)} ·`. Then regenerate the three gate-compared fixtures and check the other three:

```bash
for s in instrument-loans-1 graded-think-a graded-opus-a; do node discovery/prd-projection.mjs $s --force; done
for s in allergen-matrix-1 bracket-trace-1 bracket-trace-2; do node discovery/prd-projection.mjs $s --stdout | diff - discovery/$s/prd.md; done
```

  For each of the last three, if the diff is exactly the one `**Run**` line, regenerate it too (`--force`); if anything else differs, the file was edited after generation — leave it and note it in the report.
- **GOTCHA**: `prd.md` is the one artifact meant for human editing (README) and `--force` overwrites. The three gate-compared files are provably unedited (32.5 / 33.15 assert bytes equal today). The other three are checked by diff before any overwrite.
- **GOTCHA**: `proposals.md` beside `allergen-matrix-1/prd.md` is untouched — group 34.5 proves `prd.md` is a fold over `run.json`, `answers.jsonl` and `transcript.jsonl` only.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`; `git diff --stat discovery/` shows only `prd-projection.mjs` and the regenerated `prd.md` files, each a one-line change.
- **SATISFIES**: AC2

### Task 12 — UPDATE `discovery/README.md`

- **IMPLEMENT**, each an exact edit:
  1. `:77` `run.json` line → `meta: provenance, entry mode, depth (confirmed) + proposedDepth, facets (five booleans or null), reads (the read fence's input), front end, session`.
  2. `:159` "A revisited question on a **new** turn is a fresh slot (D5 escalation)." → append: *"**#285 gives it its rule:** on the three ladder depths a `flag_weak_answer` HOLDS the question for one more turn — MVP 6's "pushes back once" — and a second closer of any kind settles it; never a third ask. `whole-bank` never holds (its 65 sealed answers are pasted one per question, #348). At Scope check a question weak on both asks makes `sessionView().escalation` name the rung above; the depth in `run.json` is written once (D3), so stepping up is a new run."*
  3. `:170–173` the counter paragraph → *"**The not-a-form counter (#285) is arithmetic over the closers** — `runMetrics` in `portal/lib/discovery.mjs`, on every `sessionView()` as `metrics`: a closing `record_decision` or `flag_weak_answer` resets it, a banked `open_question` increments it, off-script ops and `file_evidence` never close and touch nothing. `notAForm.longest > 3` trips the PRD's target; `weak.rate` is the cobra check on an agent that flags everything; `coverage` of the twelve is read from the closers, not the cursor, so a skipped question is not covered; `askedWhatMattered` (full-discovery only) is D4's decision rate on the facet-selected tail against the twelve, with the modules that composed. All reported, none passed. Group 30 drives each at 0/1/2/3/4."*
  4. `:203–239` the `run.json` example: replace `"branch": "regulated",` with `"proposedDepth": "full-discovery", "facets": { "hasModel": false, "regulated": true, "internal": false, "orgBuys": false, "replacesAProcess": false },`. Replace the `depth`/`branch` bullet (`:216–219`) with: *"`depth` is the confirmed depth and `proposedDepth` what the server proposed for the entry mode (MVP 5: the agent proposes, the human confirms — `DEPTH_PROPOSAL` in `portal/lib/discovery.mjs`); `facets` is the declared vector, normalised to `bank.mjs`'s five `FACETS` keys, or `null` when none was declared (#285). Packages recorded before #285 carry `branch: null` and neither field; they are never edited and read as the unfaceted list. A vector on a depth that does not compose is recorded and ignored (D1b)."*
  5. `:247` "What the drawer does with the value is #288; what `openSession` refuses on is #285." → *"What the drawer does with the value is #288; `openSession` (#285) refuses an overflowing vector with the bank's own message and trims nothing."*
  6. `:681` §Workflow "pick a slug, a provenance and a depth" → "pick a slug and a provenance, confirm or change the proposed depth".
- **VALIDATE**: `grep -n "branch" discovery/README.md` shows only the historical mentions (`branch: null` in the "before #285" sentence) and none describing current behaviour.
- **SATISFIES**: AC2 (format), documentation

### Task 13 — UPDATE `.claude/references/gates.md` and the module header

- **IMPLEMENT**: `gates.md:49` (group 30) — append, before its *Cannot reach*: *"#285 added the rules layer: the four tables pinned against the vocabularies they index in both directions, `COMPOSES` proven by driving the bank, the cursor read from the LAST closer with the one re-ask and whole-bank off the ladder, D5's proposal as a value on three inputs, and the counters at 0/1/2/3/4 with the two non-movers driven."* Extend its *Cannot reach* with *"whether the drawer shows the held question or the proposal (a source pin would be weak here; the portal smoke is the check)."* `gates.md:51` (group 31): after "the corrupted-ledger refusals" add *"· the run header's facet label on three shapes — `unfaceted`, `facets a + b`, `facets none ticked` — and `branch` proven off the page (#285)"*. In `portal/lib/discovery.mjs`'s header (`:1–4`), add `#285` to the ticket list and one line under the invariants: *"The rules layer (#285) — the tables and the four pure reads — sits before openSession; every one of them is driven by group 30 with no agent and no token."*
- **VALIDATE**: `node tooling/drift-check.mjs` green (the syntax step covers every tracked `.mjs`).

### Task 14 — VALIDATE end to end, then report

- **IMPLEMENT**: run §VALIDATION Levels 1–4 in order. Write `.claude/reports/discovery-session-rules-285-report.md` per `piv-implement`. PR body carries `Closes #285`.

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). "Done" = the gates in §VALIDATION and the portal smoke.

### Unit Tests

Group 30 cases 9, 11, 16, 27, 28, 29 and group 31 case 12, as written in Tasks 7–10 — every rule driven with a value the message names, every table iterated both ways, every "must not move" driven with the op that must not move it.

### Integration Tests

The portal smoke (Level 4): a throwaway fictional session opened with a declared vector through the real route, its `run.json` read back, resumed, an overflowing vector refused with the bank's message, then the package deleted. No agent turn is spent.

### Edge Cases

- A weak flag at `whole-bank` advances (off the ladder) — case 9.
- A weak flag the record then moved past (every committed package with flags) reads as settled — case 9; plus `node -e` over `discovery/graded-think-a` in Level 4.
- `facets: {}` from a client is NO vector and opens an unfaceted session — case 16 via `declareFacets`; `facets` absent on old `run.json` — case 28.
- A vector on `scope-check` is recorded and ignored — case 28.
- A closer whose question is not in the depth's list throws naming the seq — case 9.
- Zero closers → every rate `null`, never `NaN` — case 29.
- Four parked in a row trips at 4, not 3 — case 29.
- The proposal appears only once the second ask has closed weak — case 28.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check portal/lib/discovery.mjs && node --check portal/server.mjs && node --check discovery/prd-projection.mjs && node --check tooling/build-checks.mjs
grep -rn "\bbranch\b" portal/lib/discovery.mjs portal/server.mjs portal/public/portal.js discovery/prd-projection.mjs   # must print nothing
```

### Level 2: Unit Tests

```bash
node tooling/build-checks.mjs          # build ✓ all 34 groups pass
node tooling/drift-check.mjs           # green; the syntax step covers every tracked .mjs
```

### Level 3: Integration Tests

```bash
# Every committed package still reads as it did: done where it was done, same index, no throw.
node -e "
import('./portal/lib/discovery.mjs').then(async (m) => {
  const { readdirSync } = await import('node:fs');
  for (const s of readdirSync('discovery', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const v = m.sessionView('discovery/' + s);
    console.log(s.padEnd(20), v.head.depth.padEnd(15), 'index', v.cursor.index, '/', v.cursor.total, 'done', v.cursor.done, 'ask', v.cursor.ask, 'longest', v.metrics.notAForm.longest, 'weak', v.metrics.weak.flagged, 'esc', v.escalation === null ? '-' : 'PROPOSED');
  }
});"
# Expected: allergen-matrix-1 30/30 done · bracket-trace-1/-2 12/12 done · graded-opus-a 65/65 done weak 14 · graded-think-a 65/65 done weak 11 · instrument-loans-1 12/12 done · spine-meridian-1 index 3/6 not done weak 1 esc - (its one flag on t2 was moved past). ask 1 everywhere.
```

### Level 4: Manual Validation

```bash
cd portal && PORT=4799 node server.mjs &   # a private port; never kill another session's portal by name (memory: port-scoped kill only)
sleep 1; curl -s localhost:4799/api/health | head -c 200
curl -s localhost:4799/api/discovery/config | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);console.log(c.depths, c.depthProposals, c.facets.map(f=>f.id), c.presets.map(p=>p.id))})"
# A throwaway FICTIONAL session with a declared vector — the package is deleted below, never committed.
curl -s -X POST localhost:4799/api/discovery/session -H 'content-type: application/json' -d '{"slug":"throwaway-285","provenance":"fictional","entryMode":"blank-idea","depth":"full-discovery","facets":{"regulated":true},"frontEnd":"portal","posture":"think"}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const v=JSON.parse(s);console.log(v.head.facets, v.head.proposedDepth, v.head.depth, 'branch' in v.head, v.cursor.total)})"
# Expected: five booleans with regulated true · full-discovery · full-discovery · false · 22
curl -s "localhost:4799/api/discovery/session?slug=throwaway-285&provenance=fictional" | grep -o '"total":[0-9]*'     # 22 — resumed from disk
curl -s -X POST localhost:4799/api/discovery/session -H 'content-type: application/json' -d '{"slug":"throwaway-285-over","provenance":"fictional","entryMode":"blank-idea","depth":"full-discovery","facets":{"hasModel":true,"regulated":true,"internal":true},"frontEnd":"portal","posture":"think"}'
# Expected: { "error": "bank: the facet vector overflows full discovery's 30 — hasModel + regulated fit (29); internal (6) does not; drop a facet or run whole-bank" } and NO discovery/throwaway-285-over directory
rm -rf discovery/throwaway-285; ls discovery | grep throwaway   # prints nothing
kill %1
```

Then, in a browser at `http://localhost:4799`: open the Discovery drawer — the depth select opens on **Full discovery**, the note reads "30 questions before any facet vector … Proposed for a blank idea; Start confirms it."; pick Scope check — the note says the proposal was full-discovery and you are overriding it. Do not start a session.

### Level 5: Additional Validation (Optional, paid)

One throwaway fictional `scope-check` session, two turns, ~$0.10: answer question 1 with a deliberately thin one-liner ("we'll see") — the agent should flag it weak and the drawer should show **the same question, "asked again", turn t2**; answer thinly again — the drawer should show question 2 and the escalation line "Step up? …". Then `rm -rf discovery/<slug>`. This is the only check that shows the re-ask and the proposal on the real surface; nothing in it is an AC and a rubber-stamping turn (Run 0 F9) may decide instead of flag, which is a posture finding, not a defect here.

---

## ACCEPTANCE CRITERIA

- [ ] AC1 Depth: `DEPTH_PROPOSAL` per entry mode, the drawer preselects it, `run.json` records `proposedDepth` and the confirmed `depth`, `sessionView` walks `selectDepth(head.depth, head.facets)` (cases 27, 28, 16's write pin).
- [ ] AC2 The facet vector resolves through the bank (`declareFacets` wraps `facetPlan`; no module definition copied); `facets` is a `run.json` field beside `depth`, written at `openSession`; `branch` removed from `openSession`, `run.json`, `discoveryConfig()`, the route, the drawer and the projection (case 16's `\bbranch\b` pin).
- [ ] AC3 Totality — group 28 case 14 already asserts it for the bank; the read side is case 28 (absent / null / `{}` → the unfaceted 30; a vector on `scope-check` → the literal six).
- [ ] AC4 The stable prefix per depth — group 28 case 15 (unchanged); the read side inherits it.
- [ ] AC5 `discoveryConfig().depths[].count` is the unfaceted length for every depth and `composes` says which one a vector moves, proven by driving the bank (case 11).
- [ ] AC6 Case 16's `branch` refusal REPLACED by the facet rules; the guard pin still counts eight and names `facets`; the summary string no longer says "non-null branch".
- [ ] AC7 Overflow refused by the bank's message naming what does not fit; nothing trimmed (case 16; Level 4).
- [ ] AC8 A first weak flag holds the question once; a second closer settles it; at Scope check two flags on one question propose `opening-set` as a value; run.json untouched; whole-bank never holds (cases 9, 28).
- [ ] AC9 Not-a-form at 0/1/2/3/4 across every op kind, `file_evidence` and both off-script ops proven not to move it; target 3 (case 29).
- [ ] AC10 Coverage from the ops, diverging from the cursor on a skipped question (case 29).
- [ ] AC11 Weak flags as a rate (case 29).
- [ ] AC12 "Asked what mattered" on `full-discovery` only: twelve vs tail, with the composed modules (case 29).
- [ ] AC13 All of it pure-function cases in build-checks; no SDK, no network, no tokens (group 30 imports the module; CI has no `portal/node_modules`).
- [ ] `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`; `node tooling/drift-check.mjs` green; Level 3 prints the expected seven lines; Level 4 passes and leaves no throwaway directory.
- [ ] README, `gates.md` and the module header say what the code does.

---

## COMPLETION CHECKLIST

- [ ] Tasks 0–14 in order, each `VALIDATE` run immediately
- [ ] `build ✓ all 34 groups pass` (observed, named in the report)
- [ ] `drift-check ✓` (observed)
- [ ] Level 3 over the seven committed packages matches the expected line
- [ ] Level 4 smoke run on a private port; throwaway deleted; `git status` shows no `discovery/throwaway-*`
- [ ] Only the three (or six, if the diff was the one line) `prd.md` files regenerated; each a one-line diff
- [ ] `docs/epics/*.md` NOT staged (another session's S4 edits)
- [ ] Report at `.claude/reports/discovery-session-rules-285-report.md`; PR body `Closes #285`

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 — "the agent proposes" depth is a pure table, not an SDK call.** Assumed, because the ticket forbids tokens at this layer, the spine has no intake prose to infer from, and D2 rejects inference over prose. Under approach C the server is the sequencing side, so its proposal is "the agent's". If the owner wants a real one-shot proposal, that is a classifier posture — deferred in the decision doc — and this table becomes its fallback. Not blocking.
- **Q2 — the re-ask applies on all three ladder depths, not Scope check alone.** Assumed from MVP 6 ("pushes back once" is the posture, every depth) and from the AC's unqualified "never re-asks a third time". Only the *proposal* is Scope-check-only. Consequence for future fixture recordings from an answer sheet: a weak-flagged question needs a second paste (the same answer is fine; the agent judges it again and the question settles). Not blocking.
- **Q3 — the projection's run header changes from `branch none` to `unfaceted` / `facets a + b`.** Included because `run.branch` stops existing and a PRD projected from a faceted run should say which facets composed it. Cost: three regenerated fixtures (one line each). Drop Task 11 and the 31.12 edits if you would rather leave the header — then new run.json files render `unfaceted`-equivalent `branch none` forever.
- **Q4 — `docs/epics/discovery-partner.architecture.md` and `.prd.md` carry uncommitted S4 edits** (the decision doc says S4 "landed", but the tree shows them modified). This PR leaves them unstaged; whoever owns that session commits them. If nobody does, a docs-only PR after this one.
- **Q5 — `metrics` is not rendered in the drawer.** Run 0's owner answered "not sure" to wanting the counters while answering; #288 owns the drawer's width. Two lines only: "asked again" and the escalation.
- **Resolved — `hidden` on the new `<p>` works.** `portal/public/portal.css:61` carries `[hidden] { display: none !important; }` and nothing sets `display` on `.muted` (observed). `textContent = ''` stays as the belt.

## NOTES (open canvas)

**Why the cursor reads from the last closer, not a count.** Two candidates were weighed. (a) Count closers, hold one for a first weak flag: simple, but every committed package with a flag the record then moved past would read short — `graded-think-a` 54/65, `graded-opus-a` 51/65, `spine-meridian-1` offering question 3 again. (b) Read the last closer's question position, hold only if IT is a lone weak flag: every committed package reads exactly as today. OBSERVED, 2026-09-03: a scratch script implementing (b) over the real transcripts printed `SAME` for all seven (today's `closedTurns.size` against the planned index), `ask 1` everywhere:

| Package | Depth | Last closer | Reads |
|---|---|---|---|
| allergen-matrix-1 | full-discovery | `record_decision` on `s9-strength-of-evidence` (30th) | 30/30 done |
| bracket-trace-1 / -2 · instrument-loans-1 | opening-set | `record_decision` on `s8-eval` (12th) | 12/12 done |
| graded-opus-a / graded-think-a | whole-bank | `open_question` on `s9-very-disappointed` (65th) | 65/65 done; 14 / 11 flags, all moved past |
| spine-meridian-1 | scope-check | `record_decision` on `s4-out-of-bounds` (3rd) | index 3, not done; the t2 flag moved past |

The only behaviour change is at the LIVE EDGE of an unfinished package whose last closer is a first weak flag — none exists, and going forward that edge is the intended re-ask.

**Why escalation is a value and confirmation is a new run.** `scope-check`'s six ids are not a prefix of the twelve (`s7-goals-signals-metrics` and `s7-kill-state-and-date` are not in `OPENING_SET`), so a mid-run depth change would leave closers on questions the new list does not hold — `deriveCursor` would throw by design. D3 says the same for facets: recorded once, fixed by a new run. The proposal says so in its `how` text.

**Why `whole-bank` is off the ladder.** #348's protocol pastes one sealed answer per question and `assertAnswersSealed` refuses a duplicate answer line. A held question would need the same question answered twice, which the scorer would refuse — so the depth whose label says "not an interview" gets no interview rule.

**What the drawer does NOT send.** No `facets` — the five checkboxes and presets are #288. The server accepts a vector today (Level 4 proves it), so #288 is client-only. #288 will also want a pre-start way to see `facetPlan(vector)` before pressing Start; that is a route it adds (`facetPlan` is exported from the bank), not this ticket's.

**`discovery-score.mjs` left alone.** Its `selectDepth(pkg.run.depth)` is one-argument by design: the graded protocol is `whole-bank`, which no vector moves. A faceted package scored there would walk the unfaceted list — noted, not fixed; it is not a graded shape.

**Stale line numbers in the ticket.** `tooling/build-checks.mjs:6524` / `:6537` are now `:6758` / `:6771` (#287, #349, #359 grew the group). The ticket's substance is unchanged.

**Ordering of the `facets` field in run.json.** After `depth, proposedDepth`, before `reads` — the write literal's order is the file's key order and the README example mirrors it.

## AMENDMENTS

(empty at creation)
