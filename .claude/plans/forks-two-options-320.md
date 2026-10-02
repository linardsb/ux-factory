# Feature: options, not answers, at forks — two options of one screen, the owner picks (#320, D5)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

**Planned against `origin/main` at `2bc65de`** (read in a detached worktree; the primary tree was on
`fix/importer-reads-icon-name-449`, 392 files behind). Implement on a fresh branch off `origin/main` in its own worktree
under `/Users` (memory `shared-worktree-parallel-sessions`; the approach-baseline regen in Task 9.2 needs Docker file
sharing, memory `vr-gate-reads-working-tree`).

## Feature Description

D5 of the canvas epic's 2026-08-28 addendum: where the compose agent would otherwise pick an answer the PRD leaves open,
one turn drafts **two options of one screen** and the owner picks. The picked option lands as an ordinary accepted frame;
the other is recorded as refused and reads **`refused: not-picked`**. Both drafts stay in the ledger forever, so nothing the owner
picked is ever presented as the agent's only answer (the honesty contract).

The **fork list** — the places a fork is due — is derived, never stored: the PRD's open questions that no later decision
closed, plus any decision the owner flags as a fork when asking (the owner's call, 2026-10-02, below). It is shown on the
inbox (#319) and on the frame that resolved it.

## User Story

As the owner driving the build canvas
I want the agent to draft two options of a screen where the PRD leaves a decision open, and to pick one myself
So that an open decision is settled by me on the record, rather than silently by the agent writing a value into copy

## Problem Statement

S6 (`.claude/plans/canvas-spike-s6/README.md` Q5) observed the failure D5 exists to prevent: the agent wrote "New payees
have a first-payment limit of £1,000" into a screen for the one decision the Faster Payment PRD leaves unsettled (seq 11),
and nothing on the canvas marked it as open. Today every layer of the compose loop assumes exactly one open proposal
(`fileProposal`'s one-call rule, `appendAgentLine`'s open-proposal refusal, `composeView`'s `openProposals(ops)[0]`, the
page's single `compose.open`), so there is no way to hold two drafts of one screen side by side and pick.

## Solution Statement

- **No new op** (the count stays fourteen, architecture D5): `screen.compose` gains one optional param, `alternative:
  {turn, option, fork}`. The applier validates it exactly (one level down, `ENDPOINT_KEYS`' precedent), refuses any option
  outside `a | b` ("a third is refused by the applier", AC #1), refuses a second option of the same turn landing in the
  document, and stores it on the frame.
- **The server tags, the agent never does.** A new ask kind `{kind: "fork", fork: "<seq>"}` runs one turn whose prompt
  adds `FORK_ASK`; `fileProposal` lets that turn call `screen_compose` more than once, assigns `option` by filing order
  (a, b, then c — refused by the applier), and refuses a second option naming another screen. The tag is written on the
  transcript op line too, so the trace rule (TR5) still holds.
- **Two open proposals, only as siblings.** `appendAgentLine` admits a second open proposal exactly when it is the other
  option of the same turn and screen. `saveRun` requires a verdict on one option to answer its sibling **in the same save**:
  a pick is `accepted` + `refused`, Neither is `refused` + `refused`. `verifyBuild` checks the witness on committed
  ledgers: the sibling's verdict carries the same `at`.
- **"Not picked" is derived, not stored**: `notPickedOf(lines)` in the store answers the refused verdicts whose sibling
  was accepted. The ledger line shape does not change.
- **The fork list** is `forkList(doc, {questions, decisions, buildTx})` in `system/canvas-ops.mjs`, shaped like
  `staleFrames`: pure, total over junk, `[]`-ish for a stand-in. `loadOpenQuestions(pkgRoot)` joins `loadDecisions` in the
  store as its input. The inbox gets one new kind, `fork`, for open questions only (the owner's call).
- **The page** shows the two drafts as two cards in the compose rail, "Option A" / "Option B", with Pick A, Pick B and
  Neither; the picked frame carries a `Fork <seq> · option B` chip; a fork input plus "Ask for two options" asks the turn.

## Out of Scope / Non-Goals

- Not included: **state forks** (two `state.add`s for one state). The ticket's second fork kind ("a state whose copy or
  layout the brief leaves unsaid") cannot be derived from data; the owner replaced it with "your pick at ask"
  (2026-10-02). A state fork is a later ticket if a sitting asks for one.
- Not included: **keeping the unpicked option as a variant lane.** The ticket's "lanes A/B" and "the mechanism is variants
  as lanes (G33)" are read as the PRESENTATION — two side-by-side drafts of one screen — not as `variant.add`. D5 says the
  other option is `refused: not-picked`; a refused proposal never enters the fold, so there is nothing to keep. The owner
  can still draft a lane by hand afterwards. Named in OPEN QUESTIONS (Q2).
- Not included: a `--live-fork` paid journey leg. Whether a real model files two options is observed in #316's sitting
  (T12 step 3), the paid table's one row.
- Not changing: `LOOP`, `ESCAPE`, `ROLE`, `TURN_ASK` (a change re-opens S6 — build-checks 47.2), the tool schemas in
  `portal/lib/canvas-transport.mjs` (the agent never passes the tag), the op count, the ledger line shape, the discovery
  package (a fork turn writes only `build/`), and the inbox's existing `open-question` kind (a parked question in an OPEN
  discovery session keeps its "Resume in Discovery" row; it may now ALSO show a `fork` row — two verbs, two rows).
- Not changing: `MAX_TURNS` (4) for screen and state turns.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (six modules, one page, four build-checks groups, one journey pass, the generated-output cascade)
**Primary Systems Affected**: `system/canvas-ops.mjs`, `portal/lib/canvas-store.mjs`, `portal/lib/canvas-session.mjs`, `portal/lib/inbox.mjs`, `portal/server.mjs`, `portal/public/canvas.mjs`, `agent-layer/gen-build-handoff.mjs`, `tooling/fake-compose-agent.mjs`, `tooling/build-checks.mjs`, `tooling/canvas-journey.mjs`, `tooling/run-316-ready.mjs`
**Dependencies**: none new. Zero-dep Node ESM; the page stays vanilla.

## Related Work

**Implements**: [#320](https://github.com/linardsb/ux-factory/issues/320) · **Epic**: [#295](https://github.com/linardsb/ux-factory/issues/295), `docs/epics/canvas-design-import.architecture.md` § "Addendum 2026-08-28: the owner drives", row D5

**Back-references**:

- `.claude/plans/canvas-compose-loop-312.md` — the compose loop this extends (one proposal per turn, the fence, the trace).
- `.claude/plans/variant-lanes-handoff-pack-314.md` — lanes; read for vocabulary only (Q2: options are not lanes).
- `.claude/plans/inbox-waiting-on-you-319.md` — the inbox fold this adds one kind to.
- `.claude/plans/decision-blast-radius-318.md` — `staleFrames`, the shape `forkList` copies.
- `.claude/plans/canvas-spike-s6/README.md` — Q5 (the £1,000 observation) and "Finding: the fork list".
- `.claude/plans/faster-payment-build-run-316.md` — T10/T10b/R9 expect this ticket's fork list and a ready-check pin.

**Forward-references**:

- #316 T10b: run `forkList` on `discovery/faster-payment` → 0 derived forks (observed: its transcript has no
  `open_question`, below), so the sitting's fork comes from the owner's flag at ask time (seq 11 is the obvious one).
  #316's R9 fallback ("park a question in a Grill turn") is no longer needed.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

Line numbers are `origin/main` at `2bc65de`, each opened this session.

- `system/canvas-ops.mjs`
  - `:56-59` the #316 header paragraph — add a sibling paragraph for #320 in the same voice.
  - `:88-103` `PARAMS`, `:108-116` `OPTIONAL` — the one key each.
  - `:255-258` `ENDPOINT_KEYS` — the exact-one-level-down precedent the tag copies.
  - `:316-347` the `screen.compose` case — where the tag is validated and stored.
  - `:795-814` `staleFrames` — the shape `forkList` copies (a read, total over junk, takes op rows or loader rows).
- `portal/lib/canvas-store.mjs`
  - `:153` `STATUSES`; `:292-352` `verifyBuild` (the `fromStep` block `:304-316` is where the witness goes);
  - `:360-394` `traceFlaws`, `TOOL_PARAMS` `:362-365`, `paramsOf` `:366-369`;
  - `:456-474` `loadDecisions` — mirror it for `loadOpenQuestions`;
  - `:525-529` `openProposals` (unchanged); `:533-545` `checkVerdict`; `:555-575` `appendAgentLine`; `:586-626` `saveRun`.
- `portal/lib/canvas-session.mjs`
  - `:53-65` the prompt constants (`STATE_ASK` is the function-constant precedent for `FORK_ASK`);
  - `:70` `MAX_TURNS`; `:123-131` `turnPrompt`; `:134` `promptFingerprint`;
  - `:161-181` `REFUSAL_KINDS`, `LEDGER_KINDS` and the line constructors;
  - `:268-334` `fileProposal` (`:289` the one-per-turn rule, `:290` `want`, `:294-304` the screen branch);
  - `:340-347` `classifyComposeTurn`; `:351-378` `composeView`; `:383-401` `checkComposeRequest`;
  - `:405-411` `composeRefusal`; `:416-502` `runComposeTurn` (`:456` the tool choice, `:469` `maxTurns`, `:493-496` stats).
- `portal/lib/inbox.mjs` — `:23-34` the kinds table in the header; `:55-58` `KINDS`; `:71` `CANVAS_KEYS`; `:75-84`
  `hrefFor`; `:120-205` `rowsFor` (the `open-question` block `:185-193` is the neighbour of the new one).
- `portal/server.mjs` — `:472-489` GET `/api/canvas/run` (carries `compose: composeView(root)`); `:514-533` POST
  `/api/canvas/compose` (unchanged: it names every field and passes `ask` through).
- `portal/public/canvas.mjs` — `:185-217` `frameParts` (chips); `:221` `frameSig`; `:633-643` `lastSentence`; `:645-669`
  `proposalCard`; `:672-699` `renderCompose`; `:701-746` `askTurn`; `:763-791` `registerComposeConsumers`; `:1058-1068`
  `focusFrameFromQuery` (the `?frame=` precedent for `?fork=`); `:1117` `bus.on("*", scheduleSave)`.
- `system/action-bus.mjs:54` `TYPE_RE` (`ui.proposal-pick`, `ui.proposal-neither` fit it) and `:87` — the type's handlers
  run BEFORE `"*"`, so both verdict lines are pushed before `scheduleSave` queues its microtask.
- `agent-layer/gen-build-handoff.mjs:178-193` `renderRefusals` — the owner-verdict line gains "— refused: not-picked".
- `tooling/fake-compose-agent.mjs` — the whole file (`:14-20` the behaviour table, `composeQuery`).
- `tooling/build-checks.mjs`
  - group 35: `:11583-11600` 35.1 (the roster), `:11602-11628` 35.2 `VALID_FOR`, `:12422` 35.19 (the read precedent),
    `:12489` the group string.
  - group 36: `:12933` 36.14 (the trace rule fixture), `:12983` 36.15, `:12997` the group string.
  - group 47: `:16715-16786` the helpers (`pkgCopy`, `fullCopy`, `inline`, `STACK`, `TWO`), `:16787-16797` 47.2/47.2b,
    `:16892` 47.9, `:16983-17040` 47.12 (the verdict-refusal battery to mirror), `:17182` 47.18, `:17211` the group string.
  - group 49: `:17408` 49.1, `:17500` the refusals line assertion, `:17673` the group string.
  - group 51: `:18205-18257` helpers (`pkgCopy`, `save`, `file`, `setEnded`), `:18412-18421` the agent-proposal fixture,
    `:18422-18441` the open-question fixture (the park technique), `:18492-18494` 51.6, `:18519` 51.9, `:18532` the string.
- `tooling/canvas-journey.mjs` — `:281-300` `seed()`; `:236` `withPortal`; `:325` `openCanvas`; `:811-826`
  `seedSupersede` (mirror as `seedPark`); `:1736-1756` the compose helpers (`FAKE_COMPOSE`, `composeTx`, `askThrough`);
  `:1757-1907` `composePass` (the pass to mirror); `:988-1060` pass W (follow-the-row precedent); `:683` where
  `composePass` is called; the final `✓` summary string (~`:2102`).
- `tooling/run-316-ready.mjs:9,46,77-80` check 4.
- `.claude/references/gates.md` — groups 35, 36, 47, 49, 51 and the `canvas-journey.mjs` entry.
- `docs/epics/canvas-design-import.architecture.md:394` (row D5) and `:400-409` (the "as built" paragraphs to extend).

### New Files to Create

None. Every change extends an existing module (CLAUDE.md "Where new code goes": logic in its concern's module).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/canvas-design-import.architecture.md` § Boundaries "The compose loop is server-sequenced" and the D5 row.
- `docs/epics/canvas-design-import.prd.md:147-148` — G13 (one screen at a time) and G26 (one undo history).
- `.claude/plans/canvas-spike-s6/README.md` Q5 and "Finding: the fork list".
- `.claude/references/gates.md` — before changing any group's prose (three copies, memory `gate-prose-has-three-copies`).

### Patterns to Follow

**Exact one level down** (`system/canvas-ops.mjs:427-433`):
```js
for (const side of ["from", "to"]) {
  for (const k of Object.keys(p[side])) {
    if (!ENDPOINT_KEYS[side].includes(k)) {
      throw new Error(`connect: unknown key "${k}" on "${side}" — it takes ${ENDPOINT_KEYS[side].join(", ")}, …`);
```

**A read beside the applier** (`staleFrames`, `:795-814`): takes loader rows or op lines, never checks `type` itself,
answers `[]` for `null`, skips junk, never throws.

**A loader** (`loadDecisions`, `canvas-store.mjs:456-474`): `null` when `transcript.jsonl` is absent, else a projection of
its `type: "op"` lines through `readJsonl`.

**A line constructor** (`canvas-session.mjs:167-181`): `export const xLine = ({ turn, … }) => ({ type: "x", turn, … })`.

**Errors**: plain `Error`, message names the offending path, the decision letter in brackets — `(D5)`.

**Build-checks idiom** (group 47/51): every constructive call through `fold`/`afold`, every fixture on its own `pkgCopy`,
each `ok(cond, message)` naming what it saw. A case that adds a check carries its reddening mutation in the plan
(REDDENS) and is run against that mutation once before it is trusted (memory `check-that-cannot-fail`).

---

## IMPLEMENTATION PLAN

### Phase 1: the grammar and the read (`system/canvas-ops.mjs`)
The `alternative` param, its refusals, `forkFrame`, `forkList`. Pure; build-checks 35.20 drives it.

### Phase 2: the store (`portal/lib/canvas-store.mjs`)
**Depends on:** Phase 1 (`appendAgentLine` and `saveRun` fold through the applier).
`loadOpenQuestions`, the sibling rule, the same-save pick, `notPickedOf`, the `verifyBuild` witness, the trace rule.

### Phase 3: the session (`portal/lib/canvas-session.mjs`) + the fake
**Depends on:** Phase 2.
The fork ask, `FORK_ASK`, `FORK_MAX_TURNS`, option tagging in `fileProposal`, the not-drafted line, `composeView`'s
`options`, `forks` and `last.fork`.

### Phase 4: the readers (inbox, handoff, server, ready gate)
**Depends on:** Phases 1–3. **Independent of:** Phase 5.

### Phase 5: the page (`portal/public/canvas.mjs`)
**Depends on:** Phase 3 (the view shape). **Independent of:** Phase 4.

### Phase 6: gates — build-checks cases, the journey pass, gate prose
**Depends on:** Phases 1–5.

### Phase 7: docs and the generated cascade
**Depends on:** everything (the line count is measured on the final tree).

---

## STEP-BY-STEP TASKS

### Task 0 — SET UP the worktree

- **IMPLEMENT**: `git fetch origin && git worktree add -b feat/forks-two-options-320 ../wt-320 origin/main`; then
  `npm ci` in `portal`, `tooling/icons`, `tooling/visual-regression`, `tooling/style-dictionary`. Copy this plan and its
  brief in (they were written in the primary tree, which is on another branch):
  `cp ../ux-factory/.claude/plans/forks-two-options-320.{md,html} ../wt-320/.claude/plans/` — the PR carries plan,
  report and review (CLAUDE.md §Git). Copy the prototype too and APPLY it — it is Phases 1–3 already written and driven
  (NOTES §Prototype): `cp ../ux-factory/.claude/plans/forks-two-options-320.proto* ../wt-320/.claude/plans/ && git apply .claude/plans/forks-two-options-320.proto.patch`.
  Tasks 1.1–3.6 then read as "review against the prototype and add what it lacks" (the header comments, the
  `canvas.mjs`-side `forkFrame` import, the fake's header table); every message string in the patch is the one the
  build-checks cases below match.
- **GOTCHA**: `git apply` fails if `main` moved any of the four files since `2bc65de`. Then apply with `git apply -3` and
  resolve, or re-type the hunks — the patch is 471 lines; re-run the driver (below) either way.
- **GOTCHA**: without `tooling/icons/node_modules`, build-checks 41.7 is red for an environment reason (observed on
  `2bc65de`: `41.7: genIcons({check:true}) THREW — … Install it: cd tooling/icons && npm ci`). Not a regression.
- **VALIDATE**: `node tooling/build-checks.mjs | tail -1` → `build ✓` (observed `build ✗  1 failure(s)` before `npm ci`
  in `tooling/icons`, 50 of 51 groups ✓; every group this plan touches — canvas ops, build package, compose session,
  build handoff, inbox — ✓).
- **SATISFIES**: precondition · **REGENERATES**: none

### Task 1.1 — ADD the `alternative` param to `system/canvas-ops.mjs`

- **IMPLEMENT**:
  - `PARAMS["screen.compose"]` → `["screenId", "why", "composition", "decisionRefs", "states", "alternative"]`;
    `OPTIONAL["screen.compose"]` → `["decisionRefs", "states", "alternative"]`.
  - New exports beside `ENDPOINT_KEYS`:
    `export const ALTERNATIVE_KEYS = Object.freeze(["turn", "option", "fork"]);`
    `export const ALTERNATIVE_OPTIONS = Object.freeze(["a", "b"]);`
    and private `const TURN_RE = /^c[1-9][0-9]*$/;` (the compose turn id, `canvas-session.mjs:183`) and
    `const FORK_RE = /^[1-9][0-9]*$/;` (a transcript seq as a string, `decisionRefs`' form).
  - In the `screen.compose` case, after the `states` block and before the push, when `p.alternative !== undefined`:
    1. not a plain object → `screen.compose: "alternative" must be { turn, option, fork } — this op carried …`;
    2. each own key not in `ALTERNATIVE_KEYS` → `screen.compose: unknown key "<k>" on "alternative" — it takes turn, option, fork …`;
    3. each of the three missing → `screen.compose: alternative.<k> is required`;
    4. `turn` fails `TURN_RE` → `… alternative.turn … is not a compose turn id (c1, c2, …)`;
    5. `option` not in `ALTERNATIVE_OPTIONS` → `screen.compose: alternative.option "<o>" — a fork offers two options, a and b; a third is refused (D5)`;
    6. `fork` fails `FORK_RE` → `… alternative.fork … is not a seq (11, 17, …)`;
    7. a frame already carrying `alternative.turn === p.alternative.turn` →
       `screen.compose: fork turn <turn> already landed as <fid> (option <o>) — one option per fork turn reaches the document (D5)`.
  - Push: add `...(p.alternative && { alternative: { turn: p.alternative.turn, option: p.alternative.option, fork: p.alternative.fork } })`
    after the `states` spread.
  - Header: add a `FORKS (#320, D5).` paragraph after `DECLARED STATES (#316)` saying the tag is the server's, never the
    agent's; a/b only; one option per turn in the document; no new verb.
  - Update the `:63-67` comment only if it states the param list (it does not — leave it).
- **PATTERN**: `connect`'s endpoint loop `:427-433`; the twin refusal in `state.add` `:373-376`.
- **GOTCHA**: rule 7 is checked against `next.frames`, the FOLD — proposals never enter it. So it stops an accepted pair
  from both landing (a verdict path, a hand-built ledger), never a second PROPOSAL; the store's sibling rule (Task 2.2)
  handles proposals. Do not try to make the applier see proposals.
- **GOTCHA**: `plainData` already walks the params, so a function inside `alternative` is refused by path before any of
  this runs.
- **VALIDATE**: `node --input-type=module -e 'import { applyOp, emptyDoc } from "./system/canvas-ops.mjs"; const c = (alt) => ({ op: "screen.compose", params: { screenId: "pay", why: "w", composition: { name: "stack", children: [] }, alternative: alt } }); const d = applyOp(emptyDoc(), c({ turn: "c4", option: "a", fork: "11" })); console.log(JSON.stringify(d.frames[0].alternative)); for (const alt of [{ turn: "c4", option: "c", fork: "11" }, { turn: "c4", option: "b", fork: "11" }]) { try { applyOp(d, c(alt)); console.log("ACCEPTED", alt.option); } catch (e) { console.log(e.message.slice(0, 70)); } }'`
  (expected) `{"turn":"c4","option":"a","fork":"11"}`, then a refusal naming "a third", then one naming "already landed as f1".
- **REDDENS**: 35.20b/c in Task 6.1.
- **SATISFIES**: AC #1 (third refused by the applier; an atomic pick cannot land two)
- **REGENERATES**: `system/loc-summary.json` + the approach baselines — deferred to Task 7.2 (one regen on the final tree).

### Task 1.2 — ADD `forkFrame` and `forkList` reads to `system/canvas-ops.mjs`

- **IMPLEMENT** in the reads section after `reconfirmRefs`:
  - `export const forkFrame = (doc, ref) => (Array.isArray(doc?.frames) ? doc.frames : []).find((f) => plainObject(f) && f.baseId == null && plainObject(f.alternative) && f.alternative.fork === ref) ?? null;`
    (one rule for "this fork is picked", which the page also calls).
  - `export function forkList(doc, { questions = null, decisions = null, buildTx = [] } = {})` →
    `[{ ref, kind: "open-question" | "flagged", questionId, reason, turn, status: "open" | "picked", frameId, option }]`:
    1. For each `questions` row (loader rows `{seq, questionId, reason}`; skip one with no integer `seq`): CLOSED when
       `questionId` is a non-null string and some `decisions` row has `seq > q.seq` and the same `questionId`. Not closed
       → `{ ref: String(q.seq), kind: "open-question", questionId, reason, turn: null }`.
    2. For each `buildTx` line with `type === "turn"` and `ask?.kind === "fork"` and a string `ask.fork`: if no row has that
       `ref` yet, add `{ ref, kind: "flagged", questionId: <decisions row with seq === Number(ref)>?.questionId ?? null, reason: null, turn: line.turn }`;
       an open question flagged again keeps its `open-question` row (dedupe by ref, first wins).
    3. Each row: `const f = forkFrame(doc, ref)` → `status: f ? "picked" : "open"`, `frameId: f?.id ?? null`, `option: f?.alternative.option ?? null`.
    4. Order: open-question rows by seq, then flagged rows in turn order. Total over junk in every argument.
  - A header comment in the file's voice: "A READ, not a verb. The owner's call (2026-10-02): a fork is an open question
    no later decision closed, or any decision the owner flagged at ask time (a `fork` turn line). A stand-in has no
    questions and no decisions, so only its flags list. A pick is not a decision: a picked open question stays open in
    the PRD, and the row says picked, not closed."
- **PATTERN**: `staleFrames` `:795-814` (rows from a loader, `[]` on null, junk skipped).
- **GOTCHA**: do NOT reuse `inbox.mjs`'s `questionCleared` — its finish clause clears every question on a finished run,
  and `faster-payment` is finished (`run.json` `endedAt` 2026-09-13), which would make the list empty by construction.
- **GOTCHA**: `decisions` rows from `loadDecisions` carry `questionId` and `seq`; `ledgerView().decisions` rows carry the
  same two names. Both work; build-checks uses the loader.
- **VALIDATE**: `node --input-type=module -e 'import { forkList, emptyDoc } from "./system/canvas-ops.mjs"; console.log(JSON.stringify(forkList(emptyDoc(), { questions: [{ seq: 17, questionId: "q", reason: "r" }, { seq: 18, questionId: "z", reason: null }], decisions: [{ seq: 20, questionId: "q" }, { seq: 11, questionId: "s4" }], buildTx: [{ type: "turn", turn: "c2", ask: { kind: "fork", fork: "11" } }, { type: "turn", turn: "c3", ask: { kind: "fork", fork: "18" } }] }).map((r) => [r.ref, r.kind, r.questionId, r.status])))'`
  (expected) `[["18","open-question","z","open"],["11","flagged","s4","open"]]` — 17 closed by decision 20, 18 deduped.
- **SATISFIES**: AC #3 (the fork list), the owner's fork-kind call · **REGENERATES**: deferred to Task 7.2

### Task 2.1 — ADD `loadOpenQuestions` to `portal/lib/canvas-store.mjs`

- **IMPLEMENT** after `loadDecisions`:
  `export function loadOpenQuestions(pkgRoot)` → `null` when `transcript.jsonl` is absent; else every `type: "op"`,
  `op: "open_question"` line as `{ seq, ts: l.ts ?? null, source: l.params?.source ?? null, questionId: l.params?.question_id ?? null, reason: l.params?.reason ?? null }`.
  Header comment: "the projection's Open questions, read from the same lines `prd-projection.mjs` renders them from
  (`state.opened`, every `open_question` op)".
- **PATTERN**: `loadDecisions` `:456-474`.
- **GOTCHA**: the store's import set is pinned (36.6, 47.1: node built-ins + `canvas-ops.mjs`). Read the file with the
  module's own `readJsonl`; import nothing new.
- **VALIDATE**: `node --input-type=module -e 'import { loadOpenQuestions } from "./portal/lib/canvas-store.mjs"; for (const s of ["later-not-never-1", "partner-audit-1", "faster-payment"]) console.log(s, JSON.stringify(loadOpenQuestions("discovery/" + s)?.map((q) => q.seq)))'`
  (expected) `later-not-never-1 [17]`, `partner-audit-1 [3]`, `faster-payment []` — the seqs observed this session via
  `ledgerView(ops).openQuestions` and in each `prd.md`'s `## Open questions` headings (all three agree, below).
- **SATISFIES**: AC #3 · **REGENERATES**: none

### Task 2.2 — UPDATE `appendAgentLine`: admit exactly the sibling option

- **IMPLEMENT**: replace the `const open = openProposals(existing)[0]; if (open) throw …` block with:
  ```js
  const open = openProposals(existing);
  const alt = op === "screen.compose" && params && typeof params.alternative === "object" ? params.alternative : null;
  const sibling = (o) => alt && o.op === "screen.compose" && o.params?.alternative?.turn === alt.turn
    && o.params?.screenId === params.screenId && o.params?.alternative?.option !== alt.option;
  if (open.length && !open.every(sibling)) { /* the existing message, built from open[0] */ }
  ```
  Keep the existing message text verbatim (`… is still waiting for the owner's verdict — one open proposal at a time
  (LOOP)`): 47.12 matches `"still waiting"`. Add one clause to the comment: "…except the other option of the same fork
  turn and screen (#320, D5)".
- **GOTCHA**: the applier check that follows (`applyOp(foldLedger(existing).doc, …)`) still runs; it refuses option `c`.
  A third option therefore never reaches the sibling rule as "admitted": `fileProposal` runs `applyOp` first (`:300`) and
  files it as an agent `refused` line (status `refused` lines skip this whole block).
- **VALIDATE**: 36.16b in Task 6.2.
- **SATISFIES**: AC #1 (both proposed) · **REGENERATES**: none

### Task 2.3 — UPDATE `checkVerdict` / `saveRun`: a fork's options are answered in one save

- **IMPLEMENT** at the end of `checkVerdict(existing, batch, i)`:
  ```js
  const alt = p.params?.alternative;
  if (alt && typeof alt === "object") {
    const sibs = existing.filter((l) => l?.source === "agent" && l.status === "proposed" && l.seq !== n && l.params?.alternative?.turn === alt.turn);
    for (const s of sibs) {
      if (existing.some((l) => l?.fromStep === s.seq)) continue;           // answered earlier (cannot happen via this rule; a hand ledger)
      const v = batch.find((x) => x?.fromStep === s.seq);
      if (!v) throw new Error(`saveRun: op ${i} answers seq ${n}, option ${alt.option} of fork turn ${alt.turn} — its sibling seq ${s.seq} must be answered in the same save: a pick refuses the other, Neither refuses both (D5)`);
      if (o.status === "accepted" && v.status !== "refused") throw new Error(`saveRun: op ${i} accepts seq ${n} and the same save ${v.status} seq ${s.seq} — a fork lands one option (D5)`);
    }
  }
  ```
- **GOTCHA**: accepting both is also refused by the APPLIER inside `foldLedger([...existing, ...lines])` (Task 1.1 rule 7).
  Keep this message anyway — it names the fork and is checked before the fold.
- **GOTCHA**: undo/redo restate the accepted op, `alternative` included, as `undone` / `applied` lines with no `fromStep`
  (`canvas.mjs` adapter `:546-556`). Do NOT add a rule refusing an owner `applied` compose that carries `alternative`: a
  redo is exactly that. Task 2.5's witness covers it instead.
- **VALIDATE**: 36.16c in Task 6.2.
- **SATISFIES**: AC #1 (accepting one refuses the other atomically) · **REGENERATES**: none

### Task 2.4 — ADD `notPickedOf(lines)` to the store

- **IMPLEMENT**: `export function notPickedOf(lines)` → the seqs of owner `refused` verdict lines whose `fromStep` names a
  proposal with `params.alternative`, where some sibling proposal (same `alternative.turn`) has an `accepted` verdict.
  Ledger order. Total over junk. Comment: "NOT PICKED IS DERIVED (#320): the line shape stays
  `{seq, at, source, op, params, status, fromStep?}`; a refusal reads not-picked because its sibling was picked, and Neither
  refuses both with neither reading so."
- **VALIDATE**: 36.16e.
- **SATISFIES**: AC #1/#2 ("A reads refused: not-picked") · **REGENERATES**: none

### Task 2.5 — UPDATE `verifyBuild`: the same-save witness and the redo rule

- **IMPLEMENT** after the per-line loop (before the fold):
  1. For each owner verdict line `v` (accepted or refused) whose `fromStep` names an agent proposal `p` with
     `params.alternative`: every sibling proposal `s` (same turn) must have a verdict `w`; missing →
     `ops.jsonl line <v.seq>: answers seq <p.seq>, option <o> of fork turn <t>, but its sibling seq <s.seq> has no verdict — a fork's options are answered together (D5)`;
     `w.at !== v.at` → `… but seq <s.seq> was answered in another save (<w.at>) — a pick refuses the other in the same save (D5)`;
     `v.status === "accepted" && w.status === "accepted"` → `… both options accepted (D5)`.
  2. For each `applied` `screen.compose` line carrying `params.alternative`: an EARLIER `accepted` line with a canon-equal
     `{op, params}` must exist → else `ops.jsonl line <seq>: an owner line carries fork option <o> of <t>, which no verdict picked (D5)`.
- **PATTERN**: the `fromStep` block `:304-316` and `canon`.
- **VALIDATE**: 36.16d.
- **SATISFIES**: AC #1 (atomic, checked on committed ledgers) · **REGENERATES**: none

### Task 2.6 — UPDATE `traceFlaws`: project the tag

- **IMPLEMENT**: `TOOL_PARAMS.screen_compose` → `(a, t) => ({ screenId: a.screenId, why: a.why, composition: a.composition, decisionRefs: a.decisionRefs, states: a.states, alternative: t?.alternative })`;
  `state_add` → `(a) => …` unchanged; `paramsOf(tool, args, line)` passes `line` through; the call at `:384` becomes
  `paramsOf(t.tool, t.args, t)`. Comment: "the tag is the server's (#320), recorded on the op line beside the args".
- **GOTCHA**: forgetting this reds `verifyBuild` (TR5) on every fork package, including the journey's (C11-style
  assertions) — the advisor's F5 trap.
- **VALIDATE**: 36.16f.
- **SATISFIES**: AC #1/#2 (verifyBuild [] on a fork package) · **REGENERATES**: none

### Task 3.1 — ADD the fork ask's constants to `portal/lib/canvas-session.mjs`

- **IMPLEMENT**:
  - `export const FORK_LEAD = "This turn is a fork:";`
  - `export const FORK_ASK = ({ what }) => \`${FORK_LEAD} the PRD leaves ${what} open. Propose ONE screen in TWO options: call \\\`screen_compose\\\` twice with the same screenId, each option a different answer to that open point, each \\\`why\\\` naming the answer it takes and the reason. The owner picks one; the other is recorded as not picked.\`;`
  - `export const FORK_MAX_TURNS = 5;` with the comment "1 + two calls = 3; a refused third = 4; one spare. A fork turn
    that hits it is `failed`, never a retry."; `export const maxTurnsFor = (ask) => (ask?.kind === "fork" ? FORK_MAX_TURNS : MAX_TURNS);`
  - `promptFingerprint` adds `FORK_ASK({ what: "x" })` to its joined list (after `STATE_ASK(…)`).
  - Update the `:54-57` comment: "S6's FORK_ASK named one screen and missed its target (S6 Q5); #320's is generic and
    carries the fork. YIELD_CONTRACT does not ship."
- **GOTCHA**: `LOOP` says "call `screen_compose` once" and `FORK_ASK` says "twice" in the same prompt. Do not edit `LOOP`
  (47.2 re-opens S6). Whether a model follows the turn ask over `LOOP` is unprobed (S6 Q5) — the paid row.
- **VALIDATE**: `node --input-type=module -e 'import * as S from "./portal/lib/canvas-session.mjs"; console.log(S.promptFingerprint(), S.maxTurnsFor({ kind: "fork" }), S.maxTurnsFor({ kind: "screen" }))'`
  (observed before: `f7e7f54e5a5c5809` and no `maxTurnsFor`; observed over the prototype: `32e186e7fedd687d`, `5`, `4`).
- **SATISFIES**: AC #2 · **REGENERATES**: none (47.2b's pinned value is updated in Task 6.3)

### Task 3.2 — UPDATE `checkComposeRequest`, `turnPrompt`, `opLine`, a `notDraftedLine`, `composeRefusal`

- **IMPLEMENT**:
  - `checkComposeRequest`: a third branch `ask.kind === "fork"`: keys exactly `fork,kind`
    (`canvas-session: a fork ask carries kind and fork exactly (got …)`); `typeof ask.fork === "string" && /^[1-9][0-9]*$/.test(ask.fork)`
    else `canvas-session: a fork ask's fork must be a seq as a string ("11")`. Update the first error's wording to name
    the three shapes.
  - `turnPrompt({ doc, ask, brief, fork = null })`: when `ask.kind === "fork"` return `${s}\n\n${FORK_ASK({ what: fork.what })}`.
  - `opLine({ turn, seq, tool, args, status, alternative })` → spread `...(alternative && { alternative })`.
  - `export const notDraftedLine = ({ turn, fork, filed }) => ({ type: "not-drafted", turn, fork, filed });`
  - `composeRefusal`: `if (m.includes("a fork names one") || m.includes("is already picked")) return { kind: "fork", message: m };`
    so the route answers 200 `{refused}` (data), never the catch-all 500.
- **VALIDATE**: 47.19a in Task 6.3.
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task 3.3 — UPDATE `fileProposal`: tag options, refuse a second screen

- **IMPLEMENT**:
  - `:289` becomes `if (ctx.ask.kind !== "fork" && ctx.calls.length > 1) return refuse("one-per-turn", …)`.
  - `:290` `want` becomes `ctx.ask.kind === "state" ? STATE_TOOL : SCREEN_TOOL`.
  - In the screen branch, after the `ids` check and before `applyOp`, when `ctx.ask.kind === "fork"`:
    ```js
    ctx.filed ??= [];
    if (ctx.filed.length && params.screenId !== ctx.filed[0].screenId) return refuse("wrong-target", `a fork's two options are one screen — option a is "${ctx.filed[0].screenId}", not "${params.screenId}"`);
    params.alternative = { turn: ctx.turn, option: ALTERNATIVE_OPTIONS[ctx.filed.length] ?? String.fromCharCode(97 + ctx.filed.length), fork: ctx.ask.fork };
    ```
    After a successful `appendAgentLine`: `ctx.filed.push({ seq, screenId: params.screenId })`; the op line gets
    `alternative: params.alternative`; the answer reads `filed seq N: screen.compose "X" option b (proposed — the owner picks one)`.
  - Import `ALTERNATIVE_OPTIONS` from `canvas-ops.mjs` (same specifier — 47.1's import pin is by module, unchanged).
- **GOTCHA**: build `params.alternative` AFTER the `vocabulary`/`ids` refusals so a refused call never consumes an
  option, and BEFORE `applyOp` so the third option's `c` is refused BY THE APPLIER (an `applier` ledger refusal — AC #1's
  wording). `refuse("applier", e.message, op, params)` writes a params-less ledger line (`appendAgentLine` refused branch).
- **GOTCHA**: the order matters for AC #1: a third call with the SAME screenId reaches the applier; one with another
  screenId is `wrong-target` first. The fake's `three-options:` uses the same screenId.
- **VALIDATE**: 47.19b–e.
- **SATISFIES**: AC #1, AC #2 · **REGENERATES**: none

### Task 3.4 — UPDATE `runComposeTurn`: validate the fork, run the turn, record a fallback

- **IMPLEMENT**:
  - After the open-proposal check and the state-ask check, when `ask.kind === "fork"`:
    ```js
    const before0 = readComposeTranscript(pkgRoot);
    const decisions = loadDecisions(pkgRoot);
    const forks = forkList(doc, { questions: loadOpenQuestions(pkgRoot), decisions, buildTx: before0 });
    const row = forks.find((r) => r.ref === ask.fork);
    if (row?.status === "picked") throw new Error(`canvas-session: fork ${ask.fork} is already picked as ${row.frameId} — undo the pick to fork it again`);
    const current = decisions?.find((d) => d.id === ask.fork && !decisions.some((x) => x.supersedes === d.seq));
    if (decisions !== null && !(row?.kind === "open-question") && !current) throw new Error(`canvas-session: seq ${ask.fork} is neither an open question nor a current decision in this package's transcript — a fork names one (D5)`);
    fork = { ref: ask.fork, what: row?.kind === "open-question" ? `the question ${row.questionId ?? "off-script"} (seq ${ask.fork})` : current ? `decision seq ${ask.fork} (${current.questionId ?? "off-script"})` : `seq ${ask.fork}` };
    ```
    (stand-in: `decisions === null`, any seq accepted and named by seq.) Everything here runs before the transport loads
    and before any line is written.
  - Tool choice `:456` → `ask.kind === "state" ? STATE_TOOL : SCREEN_TOOL`; `maxTurns: maxTurnsFor(ask)`;
    `turnPrompt({ doc, ask, brief, fork })`; the stats line `maxTurns: maxTurnsFor(ask)`.
  - After `classifyComposeTurn`: if `ask.kind === "fork"` and exactly one `op` line with `status: "proposed"` this turn,
    append `notDraftedLine({ turn, fork: ask.fork, filed: "a" })` before the stats line (ticket Budget: "one proposal plus
    a recorded 'alternative not drafted' line").
  - Import `forkList`, `ALTERNATIVE_OPTIONS` from canvas-ops and `loadDecisions`, `loadOpenQuestions` from the store
    (same two specifiers as today).
- **GOTCHA**: `loadDecisions` rows carry `id` (string) and `supersedes`; "current" = no other row supersedes it.
- **GOTCHA**: `classifyComposeTurn` needs no change: ≥1 proposed → `"proposed"`.
- **VALIDATE**: 47.19b, c, f.
- **SATISFIES**: AC #2, the owner's fork-kind call · **REGENERATES**: none

### Task 3.5 — UPDATE `composeView`: options, forks, last.fork

- **IMPLEMENT**:
  - Build one `entry(o)` from today's `open` object plus `option: o.params?.alternative?.option ?? null` and
    `fork: o.params?.alternative?.fork ?? null`. `open = entry(opens[0])` (unchanged shape plus two keys);
    `options = opens.length && opens[0].params?.alternative ? opens.map(entry) : null`.
  - `forks`: `forkList(foldLedger(ops).doc, { questions: loadOpenQuestions(pkgRoot), decisions: loadDecisions(pkgRoot), buildTx: tx })`.
  - When the last turn's `ask.kind === "fork"`: `last.fork = { ref, filed, notDrafted, picked, notPicked }` where `filed`
    is the turn's proposed op-line count, `notDrafted` is a `not-drafted` line on the turn, `picked` the `option` of the
    turn's proposal that has an `accepted` verdict (else null), `notPicked` the options whose seqs are in `notPickedOf(ops)`.
  - Return `{ open, options, forks, last, turns }` — `forks` and `options` on every return path, including `turns: 0`.
- **GOTCHA**: 47.7 asserts `deep(r7.view) === deep(composeView(pk7))` — both sides gain the keys, still equal.
- **VALIDATE**: 47.19b/c/i.
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task 3.6 — UPDATE `tooling/fake-compose-agent.mjs`: a fork turn

- **IMPLEMENT**: import `FORK_LEAD`. In the `screen_compose` branch, when `opts.prompt.includes(FORK_LEAD)`:
  option A = `CHOOSE_AMOUNT` with `why: "Option A: no limit stated on the screen — …"`; option B = a clone whose
  `title` part reads `"Set a first-payment limit"` and whose `amount` part carries `hint: "First payments to a new payee are capped"`,
  `why: "Option B: the cap stated up front — …"`. Both `screenId: "choose-amount"`, `decisionRefs: ["7"]`. Brief
  `one-option:` → file A only; `three-options:` → file A, B, then A again (same screenId: the third reaches the applier).
  Update the header's behaviour table with the three fork rows.
- **GOTCHA**: B's distinguishing text is what the journey's "the diagram and the check use B" reads — keep the title
  string exactly `Set a first-payment limit`.
- **VALIDATE**: 47.19b–d.
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task 4.1 — UPDATE `portal/lib/inbox.mjs`: the `fork` kind

- **IMPLEMENT**:
  - `KINDS`: insert `"fork"` before `"open-question"` (ten kinds). Header table: a row
    `fork  an open question no decision closed and no option picked  Ask for two options`; "THE NINE KINDS" → "THE TEN KINDS".
  - `CANVAS_KEYS` → `["frame", "import", "promoted", "fork"]` (the one-of rule still holds).
  - In `rowsFor`, after the `unlinked-frame` loop:
    ```js
    const questions = loadOpenQuestions(pkg);
    for (const k of forkList(doc, { questions, decisions, buildTx: b.buildTranscript ?? [] })) {
      if (k.kind !== "open-question" || k.status !== "open") continue;   // the owner's call: derived forks only
      const at = questions?.find((q) => String(q.seq) === k.ref)?.ts ?? null;
      push("fork", `fork:${k.ref}`, at, `Open question ${k.questionId ?? "off-script"} (seq ${k.ref}) has no picked option on the canvas${k.reason ? ` — parked because: "${k.reason}"` : ""}.`, "Ask for two options", canvas({ fork: k.ref }));
    }
    ```
  - Import `forkList` (canvas-ops) and `loadOpenQuestions` (store) — 51.1 pins specifiers, which do not change.
- **GOTCHA**: a picked fork's open question STAYS in the PRD — the text says "no picked option", never "decided".
- **VALIDATE**: 51.4 fork, 51.6, 51.9 in Task 6.5.
- **SATISFIES**: "shown on the inbox" · **REGENERATES**: none

### Task 4.2 — UPDATE `agent-layer/gen-build-handoff.mjs` `renderRefusals`

- **IMPLEMENT**: compute `const np = new Set(notPickedOf(pkg.ops))` (import from the store, already imported module);
  the owner line becomes `` `- seq ${l.seq} · owner refused the proposal at seq ${l.fromStep} (${l.op})${np.has(l.seq) ? " — refused: not-picked" : ""}` ``.
- **GOTCHA**: 49.1 pins the module's specifiers (store, canvas-ops, ir) — unchanged. 49.2 compares the committed
  faster-payment and two-lane packs byte for byte: neither has a fork, so neither moves.
- **VALIDATE**: `node agent-layer/gen-build-handoff.mjs --check` (observed in 49.8: no drift); 49.14 in Task 6.4.
- **SATISFIES**: AC #2 ("A reads refused: not-picked" in the pack) · **REGENERATES**: none (no committed pack has a fork)

### Task 4.3 — UPDATE `portal/server.mjs`: nothing but a comment

- **IMPLEMENT**: no route change: GET `/api/canvas/run` already returns `compose: composeView(root)`, which now carries
  `forks` and `options`; POST `/api/canvas/compose` passes `b.ask` through `checkComposeRequest`. Add `fork` to the
  compose route's comment ("…ONE AGENT TURN (#312) — or a fork turn's two options (#320)…").
- **GOTCHA**: 47.14 pins the compose route's call text `runComposeTurn({ pkgRoot: root, base: b.base, ask: b.ask, brief: b.brief ?? null })` — do not edit that line.
- **VALIDATE**: 47.14 stays ✓.
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task 4.4 — UPDATE `tooling/run-316-ready.mjs` check 4: pin the key by name

- **IMPLEMENT**: check 4 → `(canvasOps.PARAMS['screen.compose'] ?? []).includes('alternative') ? null : '#320 has not landed: PARAMS["screen.compose"] is … with no "alternative" param (D5)'`;
  drop `SEGMENT_A_PARAMS`; header line 4 → `#320 landed: PARAMS["screen.compose"] carries "alternative" (D5, forks)`.
- **REDDENS**: rename `"alternative"` in `PARAMS` to `"alternatives"` → `run-316 ✗  check 4 — #320 has not landed …` (and
  build-checks 35.20 red too). Positive control: on the finished tree check 4 is not in the ✗ list.
- **VALIDATE**: `node tooling/run-316-ready.mjs 2>&1 | grep -c 'check 4'` → `0` (other checks may be red for their own
  reasons: check 6 needs a clean tree, 5 a 6-line spine).
- **SATISFIES**: the ticket's PR #495 F3 checkbox · **REGENERATES**: none

### Task 5.1 — UPDATE `portal/public/canvas.mjs`: ask, show, pick

- **IMPLEMENT**:
  - Import `forkFrame` from canvas-ops.
  - `renderCompose` static half: after the Ask button, a fork row —
    `label[for=cv-fork] "Fork on a question or decision (its seq)"`, `input#cv-fork[list=cv-fork-list][inputmode=numeric][maxlength=6][autocomplete=off]`,
    `datalist#cv-fork-list`, `button[data-compose-fork-ask] "Ask for two options"` → `askFork()`:
    trims the value, refuses a non-`^[1-9][0-9]*$` value as `composeNote = "A fork names a seq — e.g. 11."`, else
    `askTurn({ kind: "fork", fork })`.
  - Dynamic half: fill the datalist with `compose.forks` rows where `!forkFrame(doc, r.ref)` (value `r.ref`, label
    `r.questionId ?? "seq " + r.ref`); disable the fork button like Ask.
  - When `compose.options` is set: render `div.cv-compose-options` with one card per option — `proposalCard(o, { label: "Option " + o.option.toUpperCase() })`
    whose actions are `button[data-compose-pick="<option>"] "Pick <A|B>"` — and one `button[data-compose-neither] "Neither"`
    after them. Status: `"Pick one option, or Neither, before the next turn."`. Without `options`, today's single card.
  - `proposalCard(o, opts)` gains an optional label line and swaps its Accept/Refuse for the pick button when
    `opts.pick` is set; keep `data-compose-card` on each.
  - Bus: `ui.proposal-pick` (target `{component: "proposal", id: String(seq)}`) and `ui.proposal-neither` (target
    `{component: "fork", id: turn}`). Pick handler: find `o` in `compose.options`; pre-check `applyOp(doc, op)` (refuse → `canvas.say`, nothing pushed);
    `boxes.set(frame.id, acceptedBox(o, frame))`; `applyOwnerOp(op, { line: { status: "accepted", fromStep: o.seq } })`;
    THEN, in the same synchronous handler, `pending.push({ op: s.op, params: s.params, status: "refused", fromStep: s.seq })`
    for each sibling; `compose.open = compose.options = null`; `composeNote = "Picked option B as f3 — option A refused: not-picked."`; `renderCompose()`; `canvas.say(composeNote)`.
    Neither: push a refused line per option; note `"Neither — both options refused. Brief the next turn."`.
  - `frameParts`: when `f.alternative` → `chips.appendChild(el("span", { class: "cv-chip cv-chip-fork", "data-cv-fork": f.alternative.fork, text: \`Fork ${f.alternative.fork} · option ${f.alternative.option.toUpperCase()}\` }))`.
  - `lastSentence(last)`: before the outcome branches, `if (last.fork?.picked) return \`Picked option ${P}; option ${notPicked.join(", ")} refused: not-picked.\``;
    `if (last.fork?.notDrafted && !last.fork.picked) return "The agent drafted one option; the alternative was not drafted."`.
  - `?fork=` (in `boot`, beside `focusFrameFromQuery`): prefill `#cv-fork`, focus it, set
    `document.documentElement.dataset.cvForkFromInbox = value` after focus (the journey handle, W3's idiom).
  - Header call 6: add "A fork turn (#320) holds two sibling proposals; a pick is the accepted line plus the sibling's
    refused line, pushed in one handler so they reach one save."
- **GOTCHA**: both verdict lines MUST be pushed inside the one bus handler with no `await`: the type's handlers run before
  `"*"` (`action-bus.mjs:87`), and `scheduleSave` queues a microtask, so one flush carries both. An `await` between them
  splits the save and `saveRun` refuses the first half (Task 2.3) — the page goes broken.
- **GOTCHA**: `emit()` catches a throwing handler and STILL runs `"*"` (`action-bus.mjs:87-96`), so a pick handler that
  throws after pushing the accepted line would save half a pair, `saveRun` would refuse it, and the page goes broken. Do
  every check (`compose.options` lookup, `applyOp` pre-check) BEFORE the first push. The bus has no component allowlist
  (`:80-82` checks only that `target` is an object), so `{component: "fork"}` is safe.
- **GOTCHA**: every string from the package is `textContent` (call 4) — the `why`, the fork's question id.
- **GOTCHA**: 44×44 targets: the pick, Neither and fork buttons use `btn btn-secondary cv-btn` like the existing ones (C12).
- **GOTCHA**: do not toggle `hidden` on an element whose CSS sets `display` (memory `hidden-defeated-by-author-display`):
  build the options block conditionally, as `renderCompose` already does for the card.
- **GOTCHA**: options render in the rail, not as stage frames, so PR #499 F3 (the quadratic `staleOf` in `frameSig`) gains
  no frames — leave it and record that in the report.
- **VALIDATE**: the journey pass F (Task 6.6); `node --check portal/public/canvas.mjs`.
- **SATISFIES**: AC #2 · **REGENERATES**: none (the portal is not in the VR set)

### Task 5.2 — UPDATE `portal/public/portal.css` (only if needed)

- **IMPLEMENT**: `.cv-compose-options { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }` and
  `.cv-compose-options > * { min-width: 0; }` (memory `vr-gate-single-engine-blindspot`: grid items holding wide content).
  Token-only.
- **VALIDATE**: eyeball both cards side by side in the journey's chromium screenshot (Task 6.6 F2).
- **SATISFIES**: AC #2 ("side by side") · **REGENERATES**: none

### Task 6.1 — ADD build-checks 35.20 (canvas ops): the tag and the read

- **IMPLEMENT** after 35.19, through the group's `fold`:
  - a. compose with `{turn: "c4", option: "a", fork: "11"}` → `frames[0].alternative` deep-equal; without it no
    `alternative` key (control).
  - b. refusals, each matched on its words: option `"c"` ("a third"), an extra key `x`, a missing `fork`, turn `"t4"`,
    fork `"07"`, `alternative: "a"`; and the twin: option `b` of `c4` onto a document holding option `a` of `c4`
    ("already landed as f1"); control: option `b` of `c5` accepted.
  - c. `forkList` on literal rows: a question closed by a later decision on its id (omitted), one with an EARLIER
    decision (listed), an off-script question (`questionId: null`, never closed by a decision), a flag on a decision
    (`flagged`, `questionId` joined), a flag on an open question (deduped, stays `open-question`), a doc frame carrying
    `alternative.fork` (status `picked`, frameId, option); the stand-in (`questions: null, decisions: null`) answering its
    flags only; total over five junk shapes (`null`, `{}`, `{ questions: "x" }`, rows of `null`, a turn line with no ask).
  - d. 35.1 still passes with six keys on `screen.compose` (no id slot added).
  - Append to the group string: "#320's fork tag (35.20): …" in the existing voice, CANNOT REACH: "whether a model
    files two options (the paid sitting), and the page (canvas-journey pass F)".
- **REDDENS**: `ALTERNATIVE_OPTIONS` → `["a", "b", "c"]` → `35.20b: option "c" was accepted — a fork offers two`;
  delete rule 7 → `35.20b: option b of c4 landed beside option a`; drop the closed-by-decision clause in `forkList` →
  `35.20c: seq 17 listed, closed by decision 20`; drop the dedupe → `35.20c: seq 18 listed twice`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E '^build canvas ops'` → `✓`.
- **SATISFIES**: AC #1, AC #3 · **REGENERATES**: none

### Task 6.2 — ADD build-checks 36.16 (build package): the store

- **IMPLEMENT** after 36.15:
  - a. **AC #3, the cross-reader case**: for each committed package with open questions — `later-not-never-1`,
    `partner-audit-1`, `graded-opus-a` (assert by name that each is found) — `loadOpenQuestions` seqs ===
    `ledgerView(transcript ops).openQuestions` seqs === the `#### seq N · ` headings inside `prd.md`'s
    `## Open questions` section, and `forkList(emptyDoc(), { questions, decisions })` refs === the same list (none of the
    three closes one — observed). Then a seeded faster-payment copy (`seedSpine(..., { discovery: true })`): park
    `s1-choice-cascade` through the REAL discovery applier (51.4's `file` technique) → `forkList` lists it and
    `loadOpenQuestions` returns it; file a `record_decision` on `s1-choice-cascade` → `forkList` omits it while
    `loadOpenQuestions` (the projection's source) still lists it — the documented difference ("not closed").
    `loadOpenQuestions` on a stand-in → `null`.
  - b. `appendAgentLine` siblings on a scratch copy: option a then option b of one turn and screen → `openProposals`
    length 2; then refused each, bytes unchanged: a second option `a`, option `b` naming another screenId, a plain
    proposal, an option of another turn — each "still waiting".
  - c. `saveRun` atomic pick, bytes unchanged on each refusal: accept b alone ("must be answered in the same save"),
    refuse a alone (same), accept both ("lands one option"); then accept b + refuse a → ok, and on another copy refuse
    both (Neither) → ok.
  - d. `verifyBuild` over the picked ledger → `[]`; mutations: the sibling verdict's `at` changed ("another save"),
    the sibling verdict removed and seqs renumbered ("has no verdict"), both verdicts `accepted` (hand-built), an
    `applied` compose carrying `alternative` with no accepted twin ("no verdict picked"); and the redo control: an
    `undone` + `applied` restating the accepted op stays `[]`.
  - e. `notPickedOf` → `[a's verdict seq]` after the pick, `[]` after Neither, `[]` on the spine.
  - f. `traceFlaws`: the two proposals with transcript op lines carrying `alternative` → `[]`; strip `alternative` from
    one op line → a flaw naming its params (TR5).
- **REDDENS**: revert Task 2.2 to `openProposals(existing)[0]` → `36.16b: option b refused as still waiting`; drop the
  sibling check in `checkVerdict` → `36.16c: accept b alone was saved`; drop witness clause 1 → `36.16d: an answer in
  another save passed`; drop `t?.alternative` from `TOOL_PARAMS` → `36.16f: …` and every fork package reds; make
  `forkList` read `questionCleared`-style finish → `36.16a: the seeded park not listed on a finished copy`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E '^build build package'` → `✓`.
- **SATISFIES**: AC #1, AC #3 · **REGENERATES**: none

### Task 6.3 — UPDATE build-checks group 47 (compose session): 47.2, 47.2b, ADD 47.19

- **IMPLEMENT**:
  - 47.2: `S.FORK_ASK === undefined` → `typeof S.FORK_ASK === "function" && S.FORK_ASK({ what: "x" }) !== FORK && S.YIELD_CONTRACT === undefined`
    — message: "FORK_ASK is #320's generic ask, never S6's screen-specific string; YIELD_CONTRACT does not ship". The S6
    fingerprint line (the four constants + S6's FORK) is unchanged.
  - 47.2b: re-pin to **`32e186e7fedd687d`** (observed: `S.promptFingerprint()` over the prototype, whose `FORK_ASK` is
    Task 3.1's text byte for byte — any edit to that text, `FORK_LEAD` or the order in `promptFingerprint` moves it; then
    pin what it prints); message names #320 as the surface owner
    and keeps "unprobed by a paid run". `grep -rln f7e7f54e5a5c5809 .` (observed on `2bc65de`): `tooling/build-checks.mjs`
    and `.claude/references/gates.md` are LIVE pins → move both to the new value;
    `.claude/reports/faster-payment-build-run-316-segment-a-report.md` is a historical receipt → never edit it.
  - 47.19 (new, before 47.15):
    - a. `checkComposeRequest`: `{kind: "fork", fork: "11"}` true; extra key, `fork: "x"`, `fork: 11` each refused.
    - b. a fake fork turn on a stand-in `pkgCopy`: two proposed agent lines, `alternative` a/b, turn `c1`, fork `"11"`,
      one screenId; the stats line `maxTurns === S.FORK_MAX_TURNS`, outcome `proposed`; `composeView.options` length 2;
      the next turn refused "is waiting for your verdict".
    - c. `one-option:` → one proposed line, a `not-drafted` line `{turn: "c1", fork: "11", filed: "a"}`, `last.fork.notDrafted` true.
    - d. `three-options:` → two proposed, one agent `refused` ledger line, a transcript `refused` kind `applier` whose
      error names "a third" (AC #1's third-refused-by-the-applier, through the session).
    - e. an inline transport filing option a then another screenId → one proposed, a transcript-only `wrong-target`.
    - f. fork validation, EACH ASK ON A FRESH `fullCopy` (observed in the prototype: once a fork turn leaves options
      open, the next ask meets the open-proposal refusal BEFORE fork validation — `runComposeTurn`'s order, kept): fork `"1"` (a `file_evidence` seq) refused naming "a fork names one" with no
      transcript line written; a superseded decision (seed one supersede with the real applier) refused; a parked
      question's seq accepted; a fork already picked (after g) refused "is already picked as f3"; `composeRefusal` of
      each → `{kind: "fork"}`.
    - g. the verdict path over b's lines: `saveRun` accept b + refuse a → `composeView.last.fork` `{picked: "b", notPicked: ["a"]}`;
      `verifyBuild(loadBuild(...))` `[]` with the trace rule on.
    - h. `turnPrompt` for a fork contains `FORK_LEAD` and the `what`.
  - Update the group string (and gates.md, Task 6.7): FORK_ASK shipped as #320's, the new fingerprint, the fork turn cases.
- **REDDENS**: 47.19b — set `maxTurnsFor` to always return `MAX_TURNS` → `stats.maxTurns 4, want 5`; 47.19d — make
  `fileProposal` build `params.alternative` AFTER its own `applyOp` → the third passes that check, `appendAgentLine`'s
  inner `applyOp` throws instead, the catch-all files a transcript-only refusal with no agent ledger line →
  `47.19d: want one agent refused ledger line for the third option`; 47.19f — delete the "neither … nor" guard →
  `fork "1" ran a turn`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E '^build compose session'` → `✓`.
- **SATISFIES**: AC #1, AC #2 · **REGENERATES**: none

### Task 6.4 — ADD build-checks 49.14 (build handoff): not-picked in refusals.md

- **IMPLEMENT**: over an in-memory package (49.6's shape) with a fork pair: `renderPack`'s `refusals.md` "On the
  ledger" carries `- seq <a-verdict> · owner refused the proposal at seq <a> (screen.compose) — refused: not-picked` and a Neither
  pair's lines carry no suffix (control).
- **REDDENS**: drop the suffix in `renderRefusals` → `49.14: … refused: not-picked missing`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E '^build build handoff'` → `✓`.
- **SATISFIES**: AC #2 · **REGENERATES**: none

### Task 6.5 — UPDATE build-checks group 51 (inbox): the fork kind

- **IMPLEMENT**:
  - 51.4 `fork`: on its own `pkgCopy` (finished — the fork row does NOT depend on the session being open, unlike
    `open-question`): park `s1-choice-cascade` with `file(...)` → a `fork` row, subject `fork:<seq>`, href
    `/canvas.html?provenance=real&slug=spine&fork=<seq>`, `blocking: false`; cleared by a pick (two
    `appendAgentLine` alternatives naming that fork, then `save` accept b + refuse a), allowing the new frame's own rows;
    a second copy cleared by a later `record_decision` on the question; a stand-in copy with a flagged fork turn line
    lists NO fork row (the owner's call: derived forks only).
  - 51.6: `KINDS.length === 10`.
  - 51.9: `hrefFor({ page: "canvas", provenance: "real", slug: "x", fork: "17" })` → `/canvas.html?provenance=real&slug=x&fork=17`;
    `frame` + `fork` together refused by name.
  - The group string: "nine KINDS" → "ten", the fork fixture named.
- **REDDENS**: remove `"fork"` from `KINDS` → `51.6: kind fork has no fixture` / length 9; drop the `kind !== "open-question"`
  filter → `51.4 fork: a stand-in listed a flagged fork`.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E '^build inbox'` → `✓`.
- **SATISFIES**: "shown on the inbox" · **REGENERATES**: none

### Task 6.6 — ADD canvas-journey pass F (the fork pass)

- **IMPLEMENT**:
  - `seed()`: `seedSpine(src, path.join(DISC(), "fp-fork"))` (stand-in shape) and add `"fp-fork-q"` to the
    `{ discovery: true }` list.
  - `seedPark(slug)`, mirroring `seedSupersede` `:811-826`: one `open_question` `{source: "banked", question_id: "s1-choice-cascade", reason: "Journey fixture (#320)."}`
    through the real discovery applier, answer text "Seeded by tooling/canvas-journey.mjs (#320) — not the owner's words."; returns its seq.
  - `forkPass(base, page, t, step)` in its own `withPortal(MCP_DOWN, …, { extraEnv: { UXF_COMPOSE_TRANSPORT: FAKE_COMPOSE } })`,
    called right after `composePass` (`:683`):
    - F1 open `fp-fork` (stand-in): `#cv-fork` and `[data-compose-fork-ask]` visible; the fork button 44×44.
    - F2 type `11`, press "Ask for two options" → the ledger grew by 2: two proposed agent `screen.compose` lines, one
      screenId, `alternative.option` a and b, `fork "11"`; two `[data-compose-card]` inside `.cv-compose-options`; Ask
      and the fork button disabled; Pick A, Pick B and Neither 44×44.
    - F3 Pick B (keyboard) → the last two lines are `accepted` (fromStep = B's seq) and `refused` (fromStep = A's seq),
      owner, **same `at`**; `notPickedOf(ledger)` = `[A's verdict seq]`; `f3` on the stage renders "Set a first-payment
      limit"; its `[data-cv-fork="11"]` chip reads `Fork 11 · option B`.
    - F4 "A reads refused: not-picked": the compose status says `option A refused: not-picked`; after a reload
      `[data-compose-last]` says it; the pack's `refusals.md` (poll — `withPack` writes after the append) has A's line
      ending `— refused: not-picked`.
    - F5 "the diagram and the check use B": `[data-canvas-flow-text]` holds `f3 : choose-amount`; `[data-cv-ask-state="f3:error"]`
      exists; on disk `missingStates(fold)` lists f3 and `frameTree(fold, "f3").tree` carries B's title.
    - F6 `verifyBuild(loadBuild(fp-fork))` `[]` and the page document equals the disk fold.
    - F7 `seedPark("fp-fork-q")` → S; `#/inbox` has `[data-inbox-row="fork fork:S"]`; following it lands on
      `canvas.html?…&fork=S` with `#cv-fork` holding S (`dataset.cvForkFromInbox === S`).
    - F8 Neither on `fp-fork-q`: ask fork S → two cards → Neither → two `refused` lines, same `at`, no new frame, and the
      inbox row still present on reload.
    - `gitDiscovery()` unchanged across the pass.
  - Header: a `THE FORK PASS (#320, F1–F8)` paragraph and its CANNOT REACH ("a model — whether one files two options,
    tells them apart, or follows FORK_ASK over LOOP — the sitting's"); the final ✓ string names the pass.
- **GOTCHA**: run the journey with your own portal child (the driver does); a parallel session's `serve.mjs` is not
  involved, but kill only your own PIDs (memory `portal-smoke-port-scoped-kill`).
- **GOTCHA**: webkit: if a step throws, the leg stops there — read a per-engine count after a throw as "stopped here"
  (memory `webkit-lazy-iframe-in-scroller`).
- **VALIDATE**: `node tooling/canvas-journey.mjs all` → `0 failed` on chromium, firefox and webkit (expected; observed
  baseline on `main` from #316 T10: 212/211/211 passed, 0 failed).
- **SATISFIES**: AC #2, "shown on the inbox and on the frame" · **REGENERATES**: none

### Task 6.7 — UPDATE gate prose: three copies

- **IMPLEMENT**: for groups 35, 36, 47, 49, 51 and `canvas-journey.mjs`, edit the `group()` string, the fixture/section
  header comment AND `.claude/references/gates.md`'s paragraph together (memory `gate-prose-has-three-copies`). gates.md's
  "51 pure groups" stays 51 (no new group).
- **VALIDATE**: `grep -n '320' .claude/references/gates.md | wc -l` ≥ 6; `grep -c 'FORK_ASK and YIELD_CONTRACT unshipped' tooling/build-checks.mjs .claude/references/gates.md` → 0 each.
- **SATISFIES**: process · **REGENERATES**: none

### Task 7.1 — UPDATE docs

- **IMPLEMENT**: `docs/epics/canvas-design-import.architecture.md` — after "Re-record as built (#498…)" add
  "**D5 as built (#320, owner 2026-10-02):** a fork is an open question no later decision closed, or a decision the
  owner flags when asking (a `fork` turn line) — the ticket's second kind, a state the brief leaves unsaid, was not
  derivable and was replaced. `screen.compose` carries `alternative {turn, option a|b, fork}`, set by the server; the two
  options are sibling proposals answered in one save; not-picked is derived (`notPickedOf`), never stored; the fork turn
  allows five SDK turns. The unpicked option is refused, never kept as a lane." CLAUDE.md: no change (the map line for
  `canvas-ops.mjs` does not enumerate params).
- **VALIDATE**: `node tooling/drift-check.mjs` (CI verify's first step).
- **SATISFIES**: process · **REGENERATES**: none

### Task 7.2 — REGENERATE the cascade (last, on the committed tree)

- **IMPLEMENT**: `git add -A` the code first (memory `loc-summary-counts-tracked-only`: gen-loc reads the INDEX), then
  `node agent-layer/gen-loc-summary.mjs` and commit `system/loc-summary.json`. The runtime group is 33,143 counted lines
  today (derived: `wc -l` 33,062 + 81 files, as `split("\n")` counts one more per file), 7 below the 33,150 rounding
  edge; Task 1.1 + 1.2 add ~80 lines to `system/canvas-ops.mjs`, so `linesApprox` moves 33,100 → 33,200 (observed: the prototype measures 33,182 → 33,200; the finished file, with
  its header comments, stays at 33,200 for any total up to 33,249 — 67 more lines of headroom).
  approach.html renders that number → regenerate the approach baselines for all three packs, `rm` first (memory
  `loc-summary-baseline-cascade`: `update:docker` keeps a stale digit otherwise), from a CLEAN detached worktree under
  `/Users` (memory `vr-gate-reads-working-tree`): `rm tooling/visual-regression/baselines/approach-*.png && cd tooling/visual-regression && npm run update:docker`.
- **GOTCHA**: `--check` before staging is a false "no drift" (memory `loc-summary-counts-tracked-only`).
- **GOTCHA**: if another PR lands on `main` first and moves the runtime count, merge `main`, then regenerate; a conflict in
  `loc-summary.json` is resolved by regeneration, never by hand (memory `drift-check-mid-merge-false-positive`).
- **GOTCHA**: a local macOS `npx playwright test` reds for platform reasons (Linux baselines, memory
  `local-agent-visual-gate-notes`); trust `update:docker` and CI.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift` (after staging);
  `git status --short tooling/visual-regression/baselines | grep approach` lists the three approach PNGs.
- **SATISFIES**: CI `verify` + `visual` green · **REGENERATES**: `system/loc-summary.json`, `tooling/visual-regression/baselines/approach-neutral.png`, `approach-saulera.png`, `approach-verdant.png` (observed names)

---

## TESTING STRATEGY

No test suite: build-checks is the gate (CLAUDE.md §Testing). The journey is operator-run.

### Unit Tests
build-checks 35.20 (applier + read), 36.16 (store), 47.19 (session, fake + inline transports), 49.14 (pack), 51.4/51.6/51.9
(inbox). Every constructive call folded; every fixture on its own scratch copy; nothing tracked moves (47.15, 51.7).

### Integration Tests
canvas-journey pass F on three engines over the fake transport: the full owner gesture chain through the real handler,
fence, store and page.

### Edge Cases
- a third option (refused by the applier, an agent `refused` line); a second option naming another screen (`wrong-target`);
- one option only (the not-drafted fallback); Neither (both refused, no frame, the fork stays open);
- a pick then Cmd+Z (an `undone` line restating B's op with its tag; the fork reads open again; A keeps its verdict and
  cannot be re-picked — re-forking is a new turn);
- a redo after that undo (an `applied` compose with the tag — the witness accepts it because an earlier accepted twin exists);
- a fork on a picked fork (refused by name); a fork on a `file_evidence` seq or a superseded decision (refused);
- a stand-in (any seq accepted, named by seq; no inbox row);
- a finished discovery session (the fork row still lists — unlike `open-question`);
- an off-script open question (`questionId: null`): never closed by a decision, only by a pick.

### Proving the checks
Each REDDENS above is applied once to a scratch copy (or the working tree, then reverted with `git checkout -- <file>`),
the named case goes red with the stated message, and the unmutated tree goes green — in that order, before trusting a
green. Positive controls: 35.20a (the tag stored), 35.20b (option b of another turn accepted), 36.16c (the pick saves),
36.16d (the redo stays `[]`), 47.19g (verifyBuild `[]`), 51.4 (the row appears before it clears).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `node --check system/canvas-ops.mjs portal/lib/canvas-store.mjs portal/lib/canvas-session.mjs portal/lib/inbox.mjs portal/public/canvas.mjs tooling/fake-compose-agent.mjs tooling/canvas-journey.mjs tooling/run-316-ready.mjs agent-layer/gen-build-handoff.mjs`
- `node tooling/token-lint.mjs` (CI verify)

### Level 2: Unit Tests
- `node tooling/build-checks.mjs` → `build ✓` (51 groups)
- `node tooling/drift-check.mjs` → green (syntax-checks every tracked `.mjs`, incl. `.claude/plans` — keep parked
  fragments `.txt`, memory `drift-check-syntax-checks-parked-mjs`)
- SDK-free proof, locally: `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules`

### Level 3: Integration Tests
- `node tooling/canvas-journey.mjs all` → 0 failed on three engines
- `node tooling/run-316-ready.mjs` → check 4 absent from the ✗ list

### Level 4: Manual Validation
- Portal smoke on a private port: `cd portal && PORT=0 node server.mjs &` (note `$!`), `curl -s localhost:<port>/api/health`,
  then `kill $!` only (memory `portal-smoke-port-scoped-kill`).
- Open `/canvas.html?provenance=real&slug=<a scratch stand-in>` under `UXF_COMPOSE_TRANSPORT=tooling/fake-compose-agent.mjs`
  and look at the two option cards side by side in a real browser (the journey asserts the DOM, not the layout).

### Level 5: Additional Validation
- `cd tooling/visual-regression && npm run update:docker` from a clean worktree (Task 7.2); CI `visual` green.
- CI CodeQL: no new high/critical alert in the diff.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| A REAL fork turn — does a model file two distinct options under `FORK_ASK` while `LOOP` says "once"? (#316 T12 step 3, the owner's sitting, flagging seq 11) | ~$0.05–0.10 per turn (derived: S6's fork-turn stats line $0.04576 for ONE call, `.claude/plans/canvas-spike-s6/README.md`; a second call adds output tokens) | no | #316 (T12 step 3) |
| The pick itself in that sitting (which option, and whether Neither) | owner's hand | no | #316 — never drafted by an agent (memory `honesty-contract-mirror-direction`) |

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** Build-checks: two composes tagged as one turn's alternatives are both `proposed` (36.16b, 47.19b);
  accepting one refuses the other atomically (36.16c same-save rule, 36.16d witness, 35.20b applier twin); a third
  alternative in one turn is refused by the applier (35.20b, 47.19d).
- [ ] **AC #2** canvas-journey pass F on the stand-in: a flagged decision (seq 11) → the fork turn → two option cards →
  pick B → A reads `refused: not-picked` (page, reload, pack) → the diagram and the check use B (F1–F6), 0 failed on three engines.
- [ ] **AC #3** The fork list matches the projection's open questions on committed fixtures (36.16a: later-not-never-1,
  partner-audit-1, graded-opus-a), and omits exactly the ones a later decision closed (the seeded copy).
- [ ] The fork list shows on the inbox (51.4, F7) and on the frame (F3's chip).
- [ ] `run-316-ready` check 4 pins `"alternative"` by name (the PR #495 F3 checkbox on #320).
- [ ] PR #499 F3 checkbox: recorded as not needed — options render in the rail; no stage frames added.
- [ ] `node tooling/build-checks.mjs` ✓, `drift-check` ✓, `token-lint` ✓, CI `visual` green with the regenerated approach baselines.
- [ ] Nothing under `discovery/` changes in any committed package (47.15, the journey's `gitDiscovery`).

---

## COMPLETION CHECKLIST

- [ ] Tasks 0–7.2 in order, each VALIDATE run and its output pasted into the report
- [ ] Every REDDENS mutation applied once and seen red, then reverted
- [ ] build-checks, drift-check, token-lint green; journey 0 failed ×3
- [ ] loc-summary + approach baselines regenerated in the same PR
- [ ] Plan, report and review in the PR; body carries `Closes #320`
- [ ] Both #320 checkboxes answered in the issue — ASK the owner before editing the issue (an outward-facing change)
- [ ] `git worktree remove ../wt-plan-320` (the planning worktree) once nothing needs it

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Q1 (answered, owner 2026-10-02): what counts as a fork.** "Open questions + your pick at ask": derived forks are the
  open questions no later decision closed; the owner may flag ANY current decision when asking (recorded on the turn
  line, so the list stays derived). The inbox shows the derived ones only.
- **Q2 (answered, owner 2026-10-02): the unpicked option is refused, not kept.** "Lanes A/B" are the presentation —
  two side-by-side cards, "Option A / Option B" — never `variant.add`; D5's "the other is `refused: not-picked`".
  Naming them "options" also avoids `variant.add`'s reserved key `a`.
- **A1 (answered, owner 2026-10-02): not-picked is derived** (`notPickedOf`), never a `reason` key on the line. The
  pinned line shape and the three committed ledgers stay untouched; the same-`at` witness proves the pairing.
- **A2: the agent picks the screen.** The fork ask names the fork, not a screenId; both options must share one screenId
  (the handler refuses otherwise). The owner steers with the brief.
- **A3: "on the frame" = the frame that resolved a fork shows it** (`Fork 11 · option B`). Open forks are listed in the
  compose rail's fork input and the inbox, not as chips on unrelated frames (a frame has no data link to an open question,
  advisor F3).
- **A4: `FORK_MAX_TURNS = 5`** (derived from `MAX_TURNS`' own rule at `canvas-session.mjs:67-70`: 1 + calls, one spare).
- **A5: a model following `FORK_ASK` over `LOOP` is unprobed — a product observation, not an implementation risk.**
  Every outcome a model can produce is built and gated: two options (47.19b), one (the not-drafted line, 47.19c), three
  (the applier refusal, 47.19d), two screens (wrong-target, 47.19e), none (empty-yield, unchanged). Whatever the model
  does, the code records it correctly; the sitting only tells us WHICH outcome a real model picks.

## NOTES (open canvas)

### Risk register — each risk and what closed it

| # | Risk (first report) | Closed by | Residual |
|---|---|---|---|
| R1 | A real model may not file two options (LOOP says once) | Every model outcome is built and gated (A5); the prototype drove two, one and three options through the REAL handler, store and applier (`.proto-output.txt`) | The observation itself, in #316's sitting — not a code path this PR can get wrong |
| R2 | The runtime line count flips, so approach baselines move | Measured, not predicted: 33,182 → 33,200 with the prototype, 67 lines of headroom before 33,300 (Task 7.2); the rm + `update:docker` recipe from a clean worktree; regenerate AFTER any `main` merge | A PR landing on `main` that moves the count again: the rule is "merge main, regenerate" (Task 7.2 GOTCHA) |
| R3 | The prompt fingerprint moves | The exact value `32e186e7fedd687d` is pinned in Task 6.3 from the prototype; its two live copies named (build-checks, gates.md) and the receipt that must not move | None while Task 3.1's text is used verbatim |
| R4 | Faster Payment has no derived fork | Owner's Q1: flag a decision at ask time; the prototype ran a fork on a discovery copy flagging seq 11 (`f fork 11 → proposed`) and refused seq 1, a `file_evidence` | None |
| R5 | Existing gates break in unforeseen places | build-checks over the prototype: exactly TWO failures, both planned (47.2's `FORK_ASK` assertion and 47.2b's pin); 50 other groups ✓, 41.7 ✓ after `npm ci` | The page and journey (Phases 5–6), whose mechanics were each verified by reading: bus order `action-bus.mjs:87`, one `at` per `saveRun`, the flow-panel text `  f3 : choose-amount` (prototype) |
| R6 | The owner's two pending calls (A1, Q2) | Answered 2026-10-02: derive; refuse, not keep | None |

**Confidence: 10/10** for one-pass implementation — Phases 1–3 exist as a driven, applying patch; every message string
the new cases match was printed by that patch; the generated cascade's numbers are measured; no owner question is open.

### Prototype (2026-10-02, throwaway, in `../wt-plan-320` at `2bc65de`, then reverted)

Tasks 1.1, 1.2, 2.1–2.6, 3.1–3.6 written as specified; saved as `forks-two-options-320.proto.patch` (471 lines; `git apply
--check` ✓ on `2bc65de`). Driver `forks-two-options-320.proto-driver.txt` (copy to a scratch `.mjs`, set `R` to the
worktree root, `node` it); its output, verbatim, is `forks-two-options-320.proto-output.txt`. Highlights (observed):
- stand-in fork turn on seq 11: `["proposed",2]`, options `a`/`b` on one screenId `choose-amount`, turn `c1`; stats
  `maxTurns` 5; `view.options` `["a","b"]`; `forks` lists 11 as `flagged`; the next turn refused "is waiting for your verdict".
- saves: accept B alone, refuse A alone, accept both → each refused naming D5; accept B + refuse A → `{"count":10}`;
  f3 carries `{"turn":"c1","option":"b","fork":"11"}` and renders "Set a first-payment limit".
- `notPickedOf` → `[10]` (A's verdict); `verifyBuild` → `[]`; one verdict's `at` mutated → two D5 flaws naming
  "another save"; `last.fork` → `{"ref":"11","filed":2,"notDrafted":false,"picked":"b","notPicked":["a"]}`.
- `stateDiagram` holds `  f3 : choose-amount`; `missingStates` lists f3 missing empty, error, partial, loading.
- `one-option:` → one proposed + a `not-drafted` line, `verifyBuild` `[]`; `three-options:` → proposed, proposed, an
  agent `refused` ledger line with a transcript `refused` kind `applier` naming `alternative.option "c" — a fork offers
  two`, `verifyBuild` `[]`.
- a fork already picked → "is already picked as f3"; on a discovery copy, fork 1 → "neither an open question nor a
  current decision"; fork 11 → proposed; `composeRefusal` → `{kind: "fork"}`.
- build-checks over the prototype: `build ✗  2 failure(s)`, both in compose session — 47.2 and 47.2b, the two Task 6.3
  updates.

### Pre-flight (run this session, against `origin/main` at `2bc65de`)

1. **Drove the existing VALIDATEs.**
   - `node tooling/build-checks.mjs` → 50 of 51 groups ✓, `build icons ✗` only: `41.7: genIcons({check:true}) THREW —
     … tooling/icons/node_modules/@phosphor-icons/core/assets/regular is missing` (a fresh worktree; Task 0's `npm ci`).
     canvas ops, build package, compose session, build handoff, inbox all ✓.
   - `PARAMS["screen.compose"]` → `["screenId","why","composition","decisionRefs","states"]`; `forkList` undefined;
     `OPS.length` 14; `promptFingerprint()` `f7e7f54e5a5c5809`; `MAX_TURNS` 4; `FORK_ASK` undefined;
     `loadOpenQuestions` undefined; inbox `KINDS.length` 9; `hrefFor(frame)` `/canvas.html?provenance=real&slug=x&frame=f1`.
   - `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓  3 groups — no drift`; the runtime group counts
     33,143 lines (derived above), so Task 7.2's flip is expected, not possible.
   - Open questions per committed package (`ledgerView` vs `prd.md` headings): later-not-never-1 `[17]`/`[17]`,
     partner-audit-1 `[3]`/`[3]`, graded-opus-a 37/37 identical, graded-think-a 38/38, faster-payment `[]`/`[]`; none
     closed by a later decision on its question. **faster-payment yields 0 derived forks** — which is why Q1 went to the
     owner.
2. **Resolved every citation** listed under CONTEXT REFERENCES by opening it (line numbers above are the observed ones).
   `action-bus.mjs:87` iterates `[type, "*"]` — the ordering the atomic pick relies on.
3. **Landed claims vs `origin/main`.** Missing (grep/import): `forkList`, `forkFrame`, `loadOpenQuestions`,
   `notPickedOf`, `FORK_ASK`, `FORK_MAX_TURNS`, an `alternative` param, a `fork` inbox kind. Present: `staleFrames`,
   `reconfirmRefs`, `openProposals`, `seedSpine`, `seedSupersede`, the `UXF_COMPOSE_TRANSPORT` seam, `#498`'s re-record
   (merged `ea82873`; it re-records a decided question on a REAL-provenance run only, so it cannot park a question on
   fictional faster-payment — #316's R9 fallback was not available either way).
4. **Reconciled.** The "third refused by the applier" wording forced the order in Task 3.3 (tag before `applyOp`). The
   one-open-proposal assumption was enumerated in six places (advisor F4) and each has a task: `fileProposal` (3.3),
   `appendAgentLine` (2.2), `runComposeTurn` (unchanged: it still refuses while ANY is open — correct for siblings),
   `composeView` (3.5), the page (5.1), the inbox (unchanged: two `agent-proposal` rows, one per option, both blocking —
   acceptable, each says "Accept or refuse" and the page shows both).
5. **Concurrent work** (#316 R2's collision class): `gh pr list --state open` → no open PR touches `canvas-ops.mjs`,
   `canvas-session.mjs`, `canvas-store.mjs`, `inbox.mjs` or `portal/public/canvas.mjs` (observed 2026-10-02). Re-run it
   before Task 1.1; if one appeared, the merge order goes in AMENDMENTS.
6. **Known traps carried in**: `gate-prose-has-three-copies` (6.7), `loc-summary-baseline-cascade` and
   `loc-summary-counts-tracked-only` (7.2), `vr-gate-reads-working-tree` (0, 7.2), `drift-check-syntax-checks-parked-mjs`
   (L2), `check-that-cannot-fail` (every REDDENS), `hidden-defeated-by-author-display` (5.1),
   `portal-smoke-port-scoped-kill` (L4), `webkit-lazy-iframe-in-scroller` (6.6), `shared-worktree-parallel-sessions` (0),
   `honesty-contract-mirror-direction` (the paid table), `pr-head-lag-stale-checks` (read CI against the pushed sha).

### What changed in the plan because of pre-flight and the advisor
- Parsing `prd.md` for the fork list was dropped: the projection IS a fold over `open_question` ops, so the loader reads
  the same lines and AC #3 compares the three readers instead (advisor F1).
- `questionCleared` reuse was ruled out (its finish clause empties the list on finished runs).
- The ticket's second fork kind was replaced by the owner's flag at ask time (Q1).
- A `reason` key was replaced by a derivation plus a same-`at` witness (A1).
- `MAX_TURNS` was found to be derived for one call; the fork ask gets its own (A4) and 47.7's assertion still holds.
- The redo case killed a tempting "refuse an owner compose carrying the tag" rule (Task 2.3 GOTCHA).

### Data flow
```
owner: fork "11" ──POST /api/canvas/compose {ask:{kind:"fork",fork:"11"}}──▶ runComposeTurn
  forkList(doc, {loadOpenQuestions, loadDecisions, build tx}) → validate → turn line {ask} → FORK_ASK prompt
  agent → screen_compose ×2 → fileProposal tags {turn, option a|b, fork} → appendAgentLine (sibling rule) → 2× proposed
page: composeView.options → two cards → Pick B → [accepted B, refused A] one save → saveRun (same-save rule)
fold: B's frame carries alternative → chip, flow, missingStates · notPickedOf → A "refused: not-picked" (page, refusals.md)
inbox: forkList(open-question, open) → "fork" rows → canvas.html?fork=<seq>
```

### Rejected
- **A new op (`fork.pick`)** — the architecture pins fourteen; the pick is two existing verdicts.
- **Two agent turns, one per option** — the ticket's budget line: two validations, not two turns.
- **The agent passing the tag in the tool schema** — a model-written turn id/option is a claim to check; a server-set one
  is a fact, and the tool schema stays S6's.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. -->

- 2026-10-02 — risks closed before execution: the owner answered A1 (derive not-picked) and Q2 (refuse, not keep);
  Phases 1–3 prototyped and driven (`forks-two-options-320.proto.patch`, `.proto-driver.txt`, `.proto-output.txt`),
  build-checks over it red only at the two planned 47.2/47.2b cases; the 47.2b pin fixed at `32e186e7fedd687d` and the
  loc flip measured (33,182 → 33,200); Task 0 now applies the patch; the risk register added to NOTES; confidence 10/10.
- 2026-10-02 (implementation) — pre-flight re-run on `wt-320` at `2bc65de` (origin/main unmoved): the patch applied
  clean, every Task 1.1/1.2/2.1/3.1 VALIDATE printed its expected output, build-checks over the patch red only at
  47.2/47.2b. Plan errors found while implementing: (a) Task 5.2's `var(--space-sm)` — portal.css's spacing tokens
  are `--spacing-*`; `--spacing-xs` used, matching `.cv-compose-actions`. (b) Task 6.2's 36.16a REDDENS ("make
  forkList read questionCleared-style finish") cannot be expressed: `forkList` takes no `run.json`; the substitute
  mutation is `loadOpenQuestions` filtering a wrong op name, which reds 36.16a by name. (c) Task 6.2's checkVerdict
  REDDENS must remove the whole sibling block: removing only the `!v` throw reds 36.16c through a TypeError on
  `v.status`, not the named refusal. (d) 51.4's open-question A case: the clearing decision also clears the new fork
  row, so its `cleared` call names that row through a new `alsoClears` predicate (the existing assertion widened by
  exactly one named row). (e) Task 7.2's `git add -A` would stage other sessions' files in a shared tree; staged by
  explicit path instead.
