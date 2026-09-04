# Feature: The three postures + the existing-PRD audit mode (`portal/lib/discovery-postures.mjs`)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and models. Import from the right files.

## Feature Description

`portal/lib/discovery-postures.mjs` ships one prompt (Think, plus the same prompt on Opus). After this ticket it ships **three postures** and a **second entry mode**:

- **Create PRD** — the interview posture that judges an answer against the PRD section it will render into. It imports the projection's own `SECTIONS` table, so "which section does this feed" can never drift from `discovery/prd-projection.mjs`. Pinned to `claude-sonnet-5`.
- **Grill** — the adversarial posture: the weak-answer note run as a checklist, every missing element named, a contradiction with the ledger named by seq. Its **model is a per-run parameter** (default `claude-sonnet-5`, settable to any string in `MODELS`), recorded in `run.json`, and its fingerprint follows the model.
- **The existing-PRD audit mode** — `entryMode: 'existing-prd'`. The person supplies a document at session start; the server writes it **once, verbatim** into `answers.jsonl` as a `kind: "document"` line; every audit turn judges that document against one banked question and files one of the four existing ops (answered → `record_decision` with evidence · unevidenced → `record_decision` with `[]`, flagged by the applier · dodged → `flag_weak_answer` · absent → `open_question`). The document sits in the **system prompt** (byte-stable, cached, one copy), never in the turn prompt. An audit never holds a question for a second ask. `prd.md` projected from an audit run **is** the revised PRD, and its Weak answers · Open questions · "resting on no evidence" line **is** the gap list.
- **MVP 6 and the yield contract in all three prompts.** The two new postures also carry `JUDGEMENT_RULE` (the judgement in prose before the op — Run 0's F9) and a **re-ask brief** (the first flag's `missing` list on the second ask — #366), neither of which touches Think, because Think's prompt surface is fingerprinted by two committed fixtures.

Think's strings do not change by one byte. Group 32 and group 33 compare the committed recordings to `POSTURES.think.fingerprint` and go red by name if they do.

## User Story

As the operator running discovery in the portal
I want to choose Think, Create PRD or Grill for a blank idea, and to start from an existing PRD as an audit under Grill
So that a document I already wrote gets a gap list and a revised PRD without being re-interviewed, and run 2 can be recorded under a Grill model chosen and named on that run.

## Problem Statement

`POSTURES` (`portal/lib/discovery-postures.mjs:250`) holds `think` and `think-opus`, both `buildThinkTurn`. `ENTRY_MODES` (`portal/lib/discovery.mjs:70`) is `['blank-idea']` and `openSession` refuses `existing-prd` by name with "(#286 adds the others)". Run 2 (#292) needs an entry mode that exists, a posture that attacks a document's form, and a `run.json` that records which model Grill ran on. The architecture doc (§Boundaries → "Model is a per-posture call") pins Think and Create-PRD to `claude-sonnet-5` and leaves Grill's open **on purpose**, so the code has to carry the model as a field, not a literal. The audit has no data path today: no answer line a verdict could reference (answer-by-reference is invariant 3), no rule for what a "dodged" verdict files as, and a cursor that would hold a document for a second ask it cannot give.

## Solution Statement

Extend `discovery-postures.mjs` with two builders (`buildCreatePrdTurn`, `buildGrillTurn`), the exported prompt constants they compose from (`JUDGEMENT_RULE`, `CREATE_PRD_STANCE`, `sectionBrief()`, `GRILL_STANCE`, `AUDIT_VERDICT_RULE`, `AUDIT_WRONG_IF_RULE`, `reaskBrief()`), a `MODELS` list, `MODEL_SETTABLE`, a second fixed fingerprint input set for the audit template, and `resolvePosture({ posture, model })` which returns the posture with the run's model and a fingerprint recomputed for it. Extend `discovery.mjs`'s rules layer with `ENTRY_MODES` (two), `ENTRY_POSTURES`, `RE_ASKS`, a `DEPTH_PROPOSAL` row, `appendDocument` / `documentOf` / `auditAnswerFor`, an `entryMode` input on `deriveCursor` and `runMetrics`, `document` on the view, `model` + `document` / `documentPath` on `openSession`, and an audit branch in `runTurn` that appends nothing. The transport passes `entryMode` to the builder and gains a paid `--probe-audit`. The projection renders a document-kind answer as a pointer rather than a 24 KB blockquote. The drawer gets the minimal surface the mode needs (an entry-mode select, a document field, a Grill model select), config-driven. Group 30 gains five cases, group 31 one, group 34's two-posture pin is widened, and README · gates.md · CLAUDE.md follow.

## Out of Scope / Non-Goals

- Not included: the three-button **flow** (Think → Create PRD → Grill "pressable in order"), the facet checkboxes and presets, the package view, the differing-POST 409 — **#288**. At the data level the sequence already exists: a Think session → `prd.md` (the projection **is** "create the PRD" as an artefact) → an `existing-prd` session under Grill over that `prd.md`. What this ticket adds to the drawer is only what makes the audit reachable without a terminal (D5 below), and Task 17 tells #288 exactly which three controls it no longer needs to build.
- Not included: a new op verb. The four verdicts map onto the four existing verbs (D2 below); the op-verb lock is not taken.
- Not included: a `Read` tool for the audit. The document is carried in the system prompt, the proposer's "the brief carries the package" pattern; `MAIN_TOOLS` stays `[]` and the read fence is untouched. #292's fence precondition still holds under `tools: []` (D6).
- Not included: any change to `buildThinkTurn`'s output, `systemFor`, `TOOL_DESCRIPTIONS`, `FINGERPRINT_INPUTS`, `MVP6_LINE`, `YIELD_CONTRACT`, `LADDER_BRIEF`, `PARENT_RULE`, `EVIDENCE_RULE` or `PROVENANCE_RULE`. One added key in `TOOL_DESCRIPTIONS` moves both shipped fingerprints and stales `discovery/instrument-loans-1/`, `graded-think-a` and `graded-opus-a` (group 32 case 2a, group 33 case 15).
- Not included: applying `JUDGEMENT_RULE` (Run 0 F9) or the re-ask brief (#366) to **Think**. Both need a Think fingerprint bump and three fixtures re-recorded; #366 stays open for Think by name and this plan says so in the report.
- Not included: `MAX_TURNS` (Run 0 F10 — the cap admits four tool calls per turn). The audit prompt asks for evidence rows on this question only; the cap is a separate follow-up.
- Not changing: `discovery/ops.mjs`, `discovery/bank.mjs`, `tooling/discovery-score.mjs`, `portal/record-graded-answers.mjs`, `portal/lib/discovery-proposer.mjs`.
- Not changing: any committed `run.json`, `answers.jsonl`, `transcript.jsonl` or `prd.md`. The six committed `prd.md` files must be byte-identical after this ticket (Level 3 proves it).

## Feature Metadata

**Feature Type**: New Capability (two postures, one entry mode) on an existing module.
**Estimated Complexity**: Medium-High. Each piece is small and pure; the care is in (a) leaving Think's prompt surface byte-identical while adding two prompts beside it, (b) the audit's data path through answer-by-reference without a new verb, and (c) the group 30 cases being able to fail.
**Primary Systems Affected**: `portal/lib/discovery-postures.mjs` · `portal/lib/discovery.mjs` · `portal/lib/discovery-transport.mjs` · `portal/server.mjs` · `portal/public/portal.js` + `index.html` · `discovery/prd-projection.mjs` (one resolver) · `tooling/build-checks.mjs` groups 30, 31, 34 · `discovery/README.md` · `.claude/references/gates.md` · `CLAUDE.md` (one clause).
**Dependencies**: none new. `discovery-postures.mjs` gains one import, `../../discovery/prd-projection.mjs` (node built-ins + `bank.mjs` + `ops.mjs`; no SDK, no zod, no portal import — verified in §PRE-FLIGHT; group 30 case 12 loads it in CI).
**One-pass confidence**: **10/10.** Every claim the plan leans on that could be checked without writing the feature was checked on this tree before the plan was saved (§PRE-FLIGHT, all observed): the generalised fingerprint join reproduces both shipped stamps byte-for-byte; the five gate-compared recordings carry today's stamps; the applier accepts one document ref across four turns and four verbs; the projection's import graph is clean; every gate pin the new keys would trip has been located and is named in its task (case 11's exact config-key list, case 20's drawer pins, case 16's `existing-prd` refusal, case 34.13's two-posture list). The remaining variable is a model's behaviour under the audit prompt, which is a paid observation (Task 16) with its re-run protocol stated, not a plan risk.

## PRE-FLIGHT — verified on this tree before execution (observed 2026-09-04, main after PR #365)

Each line was run, not reasoned. The implementer re-runs the first three at Task 0.

| # | Fact | How it was checked |
|---|---|---|
| P1 | `POSTURES.think.fingerprint` = `7efdde37441fbd2591ba4a7dfeecdb6b`; `POSTURES['think-opus'].fingerprint` = `cadb38117a2660c036d87e32323a8745` | `node -e` import, printed |
| P2 | The generalised join `[model, ...inputs.flatMap(i => [sys, prompt]), JSON(TOOL_DESCRIPTIONS)].join('\n \n')` over `[FINGERPRINT_INPUTS]` reproduces **both** stamps exactly | computed beside P1, `true` twice |
| P3 | The five gate-compared or stamped recordings carry today's stamps: `instrument-loans-1`, `graded-think-a`, `bracket-trace-1`, `bracket-trace-2` = `7efdde37…`; `graded-opus-a` = `cadb3811…`. `allergen-matrix-1` carries `df6fbc35…` (recorded before #347; README §The full-depth run says so; not gate-compared) and `spine-meridian-1` carries no stamp (pre-#341). Baseline is green. | read every `run.json`'s `turnStats[].postureFingerprint` |
| P4 | `buildThinkTurn({ ...FINGERPRINT_INPUTS, entryMode: 'blank-idea' })` produces byte-identical `systemPrompt` and `prompt` — an extra destructured key is inert | `node -e`, `true` |
| P5 | The real applier accepts ONE `kind: "document"` answer `a1` referenced by a `record_decision` (t1, with a `file_evidence` url), a second `record_decision` (t2, `evidence_refs: []` → `flagged: ["no-evidence"]`), a `flag_weak_answer` (t3), an `open_question` (t4) and a `file_evidence` with `ref: "a1"` + `name` — six ops, four closers, no refusal | `applyOps` over the shape in D2 |
| P6 | `discovery/prd-projection.mjs` imports only `node:fs`, `node:path`, `node:url`, `./bank.mjs`, `./ops.mjs`; exports `SECTIONS` (ladder rows `business → Problem`, `stakeholder → Target user and JTBD`, `solution → MVP`, `transition → Transition note`), `METRIC_STAGE = 7`, `NON_GOAL_QUESTIONS` | `grep ^import`, `node -e` import |
| P7 | No consumer of `POSTURES` outside `discovery.mjs` (:52, :612, :625, :706, :812), the transport (:43, :413, :430, :498 — the probes) and build-checks. `tooling/discovery-score.mjs` and `record-graded-answers.mjs` name postures by slug only. | `grep -rn POSTURES` over portal/ discovery/ tooling/ agent-layer/ |
| P8 | `tooling/build-checks.mjs:6143` pins `discoveryConfig()`'s key set EXACTLY (eleven keys) — adding `entryPostures` and `models` goes red there until Task 11 widens it. `:6145` only forbids `systemPrompt` in `postures`, so `modelSettable` is admitted. | read |
| P9 | Case 20 (`:6229-6272`) pins in `portal.js`: the provenance placeholder regex; `if (!provenance)` before the `'/api/discovery/session'` POST inside the open handler; and a 700-char window after `$('#discovery-provenance-note').textContent` holding ≥ 2 `?` and `p === 'real'`. Task 13 edits none of those three spans. | read |
| P10 | No gate pins `sessionView()`'s key set (the only view whitelist pin is 34.11 on `proposalsView`); `ENTRY_MODES` is pinned frozen (case 6) and equal to `DEPTH_PROPOSAL`'s keys (case 27) — both survive a second mode with a second row. | grep |
| P11 | `portal/public/portal.css:61` has `[hidden] { display: none !important; }` — `el.hidden` on the new rows works. | grep |
| P12 | Case 16 `:6791` asserts `refusedOpen({ entryMode: "existing-prd" })` is refused — that line must flip (Task 11). | read |

## Related Work

**Implements**: [#286](https://github.com/linardsb/ux-factory/issues/286) (deferred 2026-08-28 pending Run 0; Run 0's AC4 verdict on this ticket was "no evidence either way" — alternatives available 0 by construction — so it is built as specified).   ·   **Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) → `docs/epics/discovery-partner.architecture.md` §Boundaries & contracts ("Model is a per-posture call, not one setting" — Think and Create-PRD on `claude-sonnet-5`, Grill deliberately open), §Other eng-lead calls ("The three postures live in `portal/lib/discovery-postures.mjs`"), §Recommended approach (approach C, answer-by-reference). PRD MVP 1 (three buttons), MVP 2 (both entry modes; "an existing PRD starts at Grill; the bank runs as an audit … out comes a gap list and a revised PRD"), MVP 5 (either entry mode at any depth), MVP 6 (the posture; form never substance), MVP 13 (run 2 fires the audit). All inherited, not re-decided.

**Back-references**:

- `.claude/plans/discovery-spine-run-package-284.md` — Why: `YIELD_CONTRACT` as one exported string, spike 2's decision rule ("tighten to an explicit yield contract in the posture prompt and re-run"), the five invariants of `discovery.mjs`.
- `.claude/plans/discovery-session-rules-285.md` — Why: the rules-layer idiom (frozen tables pinned both ways, pure reads driven at 0/1/2/3/4), `deriveCursor` reading the LAST closer, and its §Out of Scope naming posture edits as fingerprint churn.
- `.claude/plans/discovery-parent-id-341.md` — Why: why the ledger goes in the TURN prompt and PARENT_RULE goes LAST; the fingerprint's purpose.
- `.claude/plans/discovery-proposals-359.md` — Why: "the brief carries the package, so the run needs no read tool" and the `PROVENANCE_RULE`-only import that 34.13 pins.
- `.claude/reports/discovery-run-0-338-report.md` — Why: F9 (the judgement in prose), F10 (the cap), the AC4 row on this ticket.

**Forward-references**:

- #288 (the UI width: the three-button flow, facets, the package view, the differing-POST refusal) — Task 17 posts what this ticket landed.
- #292 (run 2: the audit over the frozen fixture; chooses Grill's model) — Task 17 posts how the fixture reaches the agent (D6).
- #289 (look it up, park it, the escape hatch — extends all three prompts; `WebSearch`/`WebFetch` stay outside the path fence).
- #366 (the re-ask brief for Think — stays open; closed here for Grill and Create-PRD only).

---

## DECISIONS (ticket-level; the epic's are inherited above)

- **D1 — The audited document is one server-written answer line, written at `openSession`.** `{ ref: "a1", turn: null, question_id: null, kind: "document", text }`, verbatim. Invariant 3 unchanged: the agent names a ref; it never writes text. Alternative rejected: the agent reads the fixture through a fenced `Read` — no ref for a verdict to name, a 24 KB read per turn, and a widened `MAIN_TOOLS`. P5 shows the applier already accepts the chosen shape.
- **D2 — Four verdicts, four existing verbs, `wrong_if` quoted.** ANSWERED → `file_evidence`… then `record_decision` naming them · UNEVIDENCED → `record_decision` with `evidence_refs: []` (the applier flags `no-evidence`) · DODGED → `flag_weak_answer` (`missing` names each element of form the document lacks, a missing wrong-if line included) · ABSENT → `open_question` (`source: banked`). **The `wrong_if` on an audited decision is the document's own condition, quoted or closely paraphrased — never authored.** This is the ticket's own definition: the audit reports "which of its decisions carry … no wrong-if line", and an agent that writes one erases the finding. A document that states a decision with no wrong-if is DODGED. The probe (Task 8) classifies each `wrong_if` as QUOTED / PARAPHRASED / AUTHORED so the rule is observed, not assumed; AUTHORED means tighten `AUDIT_WRONG_IF_RULE` and re-probe (≤ 3 paid attempts, the proposer's protocol).
- **D3 — The document lives in the SYSTEM prompt, early, before every rule.** Byte-stable across the session (the cache holds), one copy (not thirty turn prompts), and `PARENT_RULE` keeps the recency tail #341 paid for. Group 30 case 32 pins both halves.
- **D4 — Grill's model is a field with a default and a per-run override; the fingerprint follows the override.** `POSTURES.grill.model = 'claude-sonnet-5'` (AC #5 needs every posture to name one); `resolvePosture({ posture, model })` recomputes the fingerprint on an override and refuses an override on any posture not in `MODEL_SETTABLE = ['grill']`. `run.json.model` records the effective model, as today.
- **D5 — The minimal drawer surface ships here; #288 keeps the flow.** Three config-driven controls (~70 lines): the entry-mode select, the document field (textarea + optional repo-relative path), Grill's model select. Rationale: the Switch metric is measured in the UI; without these the audit is curl-only. Task 17 posts the boundary on #288 so nothing is built twice.
- **D6 — Run 2's fixture reaches the agent as the document line, not through `Read`.** `documentPath: docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` at `openSession` reads the bytes verbatim, and `sessionView().document.md5` must read `ab6eb0ee6cdd3b7802ecfcbe90db2377` (a paste may normalise line endings; the path keeps them). The fence precondition on #292 holds trivially under `tools: []`. Task 17 posts this on #292.
- **D7 — `DEPTH_PROPOSAL['existing-prd'] = 'full-discovery'`, `ENTRY_POSTURES['existing-prd'] = ['grill']`, `ENTRY_POSTURES['blank-idea']` = all four, `RE_ASKS['existing-prd'] = false`.** MVP 5 (an existing PRD describes a product; any depth is allowed), MVP 2 (starts at Grill), MVP 1 (three stances on one product), and a document cannot answer twice.
- **D8 — `JUDGEMENT_RULE` and the re-ask brief land on the two new postures only.** F9 and #366 both want them; Think's fingerprint is stamped on five recordings (P3), so Think waits for a ticket that re-records.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `portal/lib/discovery-postures.mjs` (whole file, 275 lines) — Why: the module being extended. Header :1-42 (why constants are exported separately; ORDER IS LOAD-BEARING — `PARENT_RULE` last; `PROVENANCE_RULE` before `EVIDENCE_RULE`); the exported strings :46-80; `opVocabulary` :84; `ledgerBrief` :94-108; `TOOL_DESCRIPTIONS` :116; `systemFor` :123-165 (**do not edit**); `need` :166; `buildThinkTurn` :175-216 (the turn template :193-210 — mirror its shape); `FINGERPRINT_INPUTS` :229-239; `fingerprintOf` :240-243 (the join P2 proved you can generalise); `POSTURES` :250-275.
- `portal/lib/discovery.mjs` (whole file) — Why: the session module. Invariants :13-40; imports :47-52; `ENTRY_MODES` :70; `readAnswers` / `nextRef` :231-233; `appendAnswer` :253-264 (mirror for `appendDocument`); the rules layer :479-600 (`LADDER` :479, `DEPTH_PROPOSAL` :491, `deriveCursor` :523-536 — `held` at :534, `runMetrics` :574 with its internal `deriveCursor` call at :590); `openSession` :603-636 (the guard order and the `writeRun` literal :624-627 are source-pinned by case 16); `sessionView` :663-678; `discoveryConfig` :689-715; `runTurn` :788-822 (LOCK → GUARDS → APPEND → RUN; `:798` the text guard, `:801` the append, `:812` `posture: POSTURES[head.posture]`).
- `portal/lib/discovery-transport.mjs` :50-57 (`MAX_TURNS`, `MAIN_TOOLS`), :144-148 (`runDiscoveryTurn` and the `posture.build(...)` call the gate pins), :379-436 (`probeParenting` — the shape `--probe-audit` mirrors), :559-600 (the CLI branch).
- `portal/server.mjs` :171-180 (the session route — every parameter named, never spread), :320-350 (the turn route).
- `portal/public/portal.js` :674-700 (the drawer's state and `discoveryEls`), :701-731 (`loadDiscoveryConfig`), :747-765 (`renderDiscoveryNotes` — reads `DISCOVERY_ENTRY_MODE`; the provenance ternary at :753-757 is case 20's pinned span), :767-788 (the open handler; `if (!provenance)` at :770 is pinned to precede the POST), :790-831 (`renderDiscoverySession`), :833-860 (`renderDiscoveryRecorded` — groups ops by `answer_ref`), :1014-1066 (the turn submit handler).
- `portal/public/index.html` :159-185 (the start fieldset), :187-216 (the session block).
- `discovery/ops.mjs` :46-64 (`OPS`, `PARAMS`, `LEVELS`, `SOURCES`), :137-270 (`applyOp` — `resolveAnswer` only checks the ref exists, R2 keys on `ctx.turn`, `evidence_refs: []` is FLAGGED not refused, `wrong_if` must be non-empty). Why: D2 rests on exactly these rules; P5 ran them.
- `discovery/prd-projection.mjs` :56-60 (imports), :142-147 (`METRIC_STAGE`, `NON_GOAL_QUESTIONS`), :173-260 (`SECTIONS` — `axis: "ladder"` rows carry `from` = level and `heading`; `metrics`, `non-goals`, `hypothesis` rows), :378-385 (`answerText` / `answerBlock` — the one resolver this ticket edits), :680 (the Run line already renders `entry ${run.entryMode}`).
- `discovery/bank.mjs` :97-110 (the question entry shape), :852-930 (`DEPTHS`), :1095-1103 (`selectDepth`).
- `tooling/build-checks.mjs` :249 and :255 (the group 30 import lines — extend both), :5858-5880 (group 30's header and idiom: `threw`, `names`, `same`, `tmpRoot`), :5966-5970 (case 6 — the frozen-list loop over `ENTRY_MODES`), :5989-6040 (case 9 — the temp-root run.json idiom), :6060-6076 (case 11 — the posture pins and the key-set pin), :6078-6125 (case 16's posture half — verbatim pins and ORDER pins to mirror), :6138-6153 (case 11's config pins — **:6143 is the exact key list**), :6204-6226 (case 19 — fingerprint mutations to mirror), :6229-6272 (case 20 — the drawer pins Task 13 must not disturb), :6785-6830 (case 16 — `refusedOpen`, the guard-count and `writeRun`-literal source pins; **:6791 flips**), :6831-6837 (case 27), :6839-6870 (case 28 — `mk(name, head)` temp-root helper), :6873-6924 (case 29), :6926 (the group 30 summary string — append to it), :7048 (`PRD_RUN`), :7409-7478 (case 31.13), :7480 (group 31 summary), :8644-8663 (case 34.13 — the `["think","think-opus"]` pin you must widen).
- `discovery/README.md` §Files, §The op grammar, §File shapes (`answers.jsonl`, `run.json`), §Workflow. Why: the format spec this ticket amends.
- `.claude/references/gates.md` :49 (group 30's entry), :51 (group 31), :57 (group 34), :88-90 (the two probes — the audit probe's paragraph goes after them).
- `docs/epics/discovery-partner.architecture.md` §Boundaries & contracts (:208-278) — the model call, verbatim.
- `.claude/reports/discovery-run-0-338-report.md` :309-350 (AC4), :457-520 (F9, F10, F11).

### New Files to Create

- `.claude/reports/discovery-postures-286-report.md` — the implementation report (written by `system-execution-report` after the run).
- `.claude/plans/discovery-postures-286.html` — the build brief beside this plan (exists).

No new source file. The ticket's own scope names the module as "extend".

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `discovery/README.md` §The op grammar → "Refuse versus flag" and "R2". Why: `evidence_refs: []` records with `flagged: ["no-evidence"]` — that is the "unevidenced" verdict with no new verb; R2 keys on the TURN, so thirty ops may all name the one document ref (P5).
- `docs/epics/discovery-partner.prd.md` MVP 2, MVP 6. Why: the audit's definition ("which banked questions does this document already answer, which does it dodge, which of its decisions carry no evidence link and no wrong-if line") and the line every prompt must hold.
- `docs/epics/discovery-partner.architecture.md` §Boundaries → "Model is a per-posture call". Why: the exact wording behind AC #1 and AC #5.
- `.claude/references/gates.md` group 30 / 31 / 34 entries. Why: the gate stack you are extending and the "cannot reach" register you must keep honest.

### Patterns to Follow

**A prompt string is one exported constant, pinned verbatim** (`discovery-postures.mjs:16-20`, case 16 :6080-6084): every new rule below is `export const X = \`…\`` and the gate asserts `built.systemPrompt.includes(X)`. A tightening is a one-line diff the gate notices.

**Order inside the system prompt is load-bearing** (`discovery-postures.mjs:22-25`; case 16 :6107, :6125): `PROVENANCE_RULE[p]` before `EVIDENCE_RULE` before `PARENT_RULE`, and `PARENT_RULE` after every other rule. New stance text goes BEFORE the shared block, never after `PARENT_RULE`. The audit's document goes early (after the opening paragraph), for the same reason.

**The ledger goes in the TURN prompt, never the system prompt** (`ledgerBrief` :86-93; case 17 :6179-6182). The document is the mirror case: it is per-session, so it goes in the SYSTEM prompt and never the turn prompt.

**A fixed-input fingerprint** (`FINGERPRINT_INPUTS` :229; `fingerprintOf` :240):

```js
export function fingerprintOf({ build, model }) {
  const { systemPrompt, prompt } = build(FINGERPRINT_INPUTS);
  return createHash('md5').update([model, systemPrompt, prompt, JSON.stringify(TOOL_DESCRIPTIONS)].join('\n \n')).digest('hex');
}
```
The generalised form, **proven byte-identical for one input set (P2)**: `[model, ...inputs.flatMap((i) => { const b = build(i); return [b.systemPrompt, b.prompt]; }), JSON.stringify(TOOL_DESCRIPTIONS)].join('\n \n')`.

**A rules table is frozen and pinned both ways against the vocabulary it indexes** (`DEPTH_PROPOSAL` :488-491; case 27 :6831-6837): `ENTRY_POSTURES` and `RE_ASKS` are keyed by `ENTRY_MODES` and the gate iterates in both directions.

**A guard is a pure exported function a gate can drive** (`assertTurnWritable` :243-249; `builder.mjs:assertScenarioSlug`'s words at :77-78): `auditAnswerFor(view)` and `resolvePosture(head)` are exported and driven; `runTurn` only calls them.

**Server-written, verbatim, never rewritten** (`appendAnswer` :250-264): `appendDocument` stores `text` with no trim and no normalisation; `redact.mjs` is deliberately not applied.

**Refused by name before `mkdirSync`** (`openSession` :604-616; case 16 :6810-6818 counts guard calls from source): every new `openSession` refusal is a `bad(...)` call placed before `mkdirSync(root, …)`.

**Every route parameter named, never spread** (`server.mjs:171-180`).

**The drawer is config-driven** (`portal.js:675-682`): the entry modes, the postures per mode and the models come from `/api/discovery/config`; the client holds no second copy.

**A case that cannot fail is not a case** (epic §Every ticket carries): each new gate case has a named mutation in §TESTING STRATEGY that turns it red.

**Error messages**: plain `Error`, prefixed `discovery-postures: ` or `discovery: `, naming the offending value (`bad(...)` helper in both modules).

---

## IMPLEMENTATION PLAN

### Phase 1: The postures module

Two builders, the constants they compose from, the model list, `resolvePosture`, the audit fingerprint inputs. Think untouched byte-for-byte. Verifiable alone: `node tooling/build-checks.mjs` stays green on groups 32 and 33 (the fingerprint tripwires) before any gate case is added, and P1's two literals reproduce.

### Phase 2: The session module

**Depends on:** Phase 1 (`resolvePosture`, `MODELS`, `MODEL_SETTABLE`, the posture ids).

`ENTRY_MODES`, the two new tables, the document store, the audit cursor rule, `openSession`, `sessionView`, `discoveryConfig`, `runTurn`.

### Phase 3: The transport, the routes, the projection

**Depends on:** Phase 2.

`entryMode` into the builder, `--probe-audit`, the session route's three new named parameters, the document-kind pointer in `answerBlock`.

### Phase 4: The gate

**Depends on:** Phases 1–3. **Independent of:** Phase 5.

Case 11's key list and case 16 edited, cases 30.30–30.34 added, the group 30 summary appended, case 31.14 added, case 34.13 widened, `gates.md` updated.

### Phase 5: The drawer

**Depends on:** Phase 2 (the config payload). **Independent of:** Phase 4.

The entry-mode select, the document field, the Grill model select, the audit submit, the recorded view for a document-kind answer.

### Phase 6: Docs, validation, the two issue comments

**Depends on:** all above.

README, CLAUDE.md, the throwaway audit session, the probe, the report, the comments on #288 and #292.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — the branch and the baseline

- **IMPLEMENT**: `git fetch origin && git switch -c feat/286-postures origin/main`. #285 merged as PR #365 at 09:06 today; the local `feat/285-session-rules` is behind that merge. Three pre-existing working-tree modifications (`docs/epics/discovery-partner.architecture.md`, `docs/epics/discovery-partner.prd.md`, `.claude/skills/piv-plan-implementation/SKILL.md`) are **not this ticket's** — never stage them; stage by explicit path at commit time. Snapshot Think's surface for the byte diff Task 1 and Task 4 run: `node -e "import('./portal/lib/discovery-postures.mjs').then(m => { const b = m.buildThinkTurn(m.FINGERPRINT_INPUTS); require('fs').writeFileSync(process.env.S + '/think-before.txt', b.systemPrompt + '\n===\n' + b.prompt); console.log(m.POSTURES.think.fingerprint, m.POSTURES['think-opus'].fingerprint); })"` with `S` = the scratchpad.
- **VALIDATE**: `git log --oneline -1` shows the #365 merge or later; the two printed hashes equal P1's; `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass` (observed baseline before any edit).
- **SATISFIES**: hygiene; P1/P3 re-established on the branch.

### Task 1 — UPDATE `portal/lib/discovery-postures.mjs`: the model list, `MODEL_SETTABLE`, the generalised fingerprint

- **IMPLEMENT**:
  - `export const MODELS = Object.freeze(['claude-sonnet-5', 'claude-opus-5']);` — the two house strings every recorder and `chat.mjs` pin. Above `THINK_MODEL`.
  - `export const MODEL_SETTABLE = Object.freeze(['grill']);` — the postures whose model a run may override (architecture §Boundaries: Grill's is "deliberately left open").
  - Generalise `fingerprintOf` to `fingerprintOf({ build, model, inputs = [FINGERPRINT_INPUTS] })` with the join given in §Patterns — the exact expression P2 ran.
  - `export const AUDIT_FINGERPRINT_INPUTS = Object.freeze({ ...FINGERPRINT_INPUTS, entryMode: 'existing-prd', answer: Object.freeze({ ref: 'fp-doc', kind: 'document', text: 'A fixed document for the fingerprint.' }) })` — a fixed synthetic document the bank cannot touch.
  - `export const FINGERPRINT_INPUTS_FOR = Object.freeze({ grill: Object.freeze([FINGERPRINT_INPUTS, AUDIT_FINGERPRINT_INPUTS]) });` — which input sets a posture's fingerprint covers; absent means `[FINGERPRINT_INPUTS]`.
- **PATTERN**: `FINGERPRINT_INPUTS` :229-239 (frozen at every level); `fingerprintOf` :240-243.
- **GOTCHA**: `POSTURES.think.fingerprint` must still print `7efdde37441fbd2591ba4a7dfeecdb6b` and `think-opus` `cadb38117a2660c036d87e32323a8745` (P1). Group 32 case 2a and group 33 case 15 assert exactly that against the recordings; run the gate before moving on.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m => console.log(m.POSTURES.think.fingerprint === '7efdde37441fbd2591ba4a7dfeecdb6b', m.POSTURES['think-opus'].fingerprint === 'cadb38117a2660c036d87e32323a8745'))"` → `true true`; `node tooling/build-checks.mjs 2>&1 | grep -E "parenting|graded fixture|discovery"` — all three ✓.
- **SATISFIES**: AC #1 (the model is a field), AC #5.

### Task 2 — UPDATE `portal/lib/discovery-postures.mjs`: the shared new rules and the re-ask brief

- **IMPLEMENT** (each an `export const`, placed after `PROVENANCE_RULE` and before `opVocabulary`, with a header comment naming its ticket and why it is exported):
  - `JUDGEMENT_RULE` — Run 0 F9, for the two NEW postures only: *"Before any tool call, write your judgement as prose: one to three sentences saying what the answer names and what its form lacks, quoting the words you are judging. A turn with no judgement in prose is dirty, the same as a turn with two closing ops."*
  - `export function reaskBrief(ops, questionId)` — pure over the ledger: the `flag_weak_answer` records whose `params.question_id === questionId`; returns `''` when none, else *"This is the second ask of this question. Your earlier flag (seq N) said the answer lacked: a · b · c. Judge the NEW answer against that list; do not repeat the flag for something it now names."* Throws on a non-array ledger (mirror `ledgerBrief` :95).
- **PATTERN**: `EVIDENCE_RULE`'s header comment :66-72 (why exported; what the gate pins). `ledgerBrief` :94-108 (pure over `ops`, reads two fields).
- **GOTCHA**: `reaskBrief` reads `params.missing` — an array of strings; join with ` · `. Never read `answer.text`.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m => { console.log(m.reaskBrief([], 'x') === ''); console.log(m.reaskBrief([{ op: 'flag_weak_answer', seq: 3, params: { question_id: 'x', missing: ['a number'] } }], 'x')); })"` → `true` then a brief naming `seq 3` and `a number`.
- **SATISFIES**: AC #3 (MVP 6 held in prose the gate can read), AC #4 (the yield contract carried), #366 for the two new postures.

### Task 3 — UPDATE `portal/lib/discovery-postures.mjs`: Create PRD

- **IMPLEMENT**:
  - `import { METRIC_STAGE, NON_GOAL_QUESTIONS, SECTIONS } from '../../discovery/prd-projection.mjs';` — read the projection's own table so the section brief cannot drift from the page (P6: the import graph is clean).
  - `export const CREATE_PRD_STANCE` — *"You are interviewing INTO AN ARTEFACT. Every decision you file renders into exactly one section of the PRD projected from this run, and nothing else reaches that page — a decision the section cannot hold is a decision the PRD will not carry. Judge the answer against what its section needs, and say in your judgement which section it feeds before you file."*
  - `export function sectionBrief()` — built from `SECTIONS`: one line per `axis === 'ladder'` row as `- ${row.from} → ${row.heading}`; then `- a decision on a stage ${METRIC_STAGE} question → also Success metrics, and every decision's wrong_if is a kill criterion there`; `- a decision on ${NON_GOAL_QUESTIONS.join(' or ')} → also Non-goals`; `- every business or stakeholder wrong_if → Hypothesis`. Headed *"Where a decision renders in the PRD projected from this run:"*.
  - `export function buildCreatePrdTurn({ question, answer, turn, ledger, provenance, entryMode = 'blank-idea' })` — the same guards as `buildThinkTurn` :176-185 (call `need` the same way; refuse `entryMode === 'existing-prd'` by name: *"Create PRD is an interview posture — an existing-prd session starts at Grill (MVP 2)"*; refuse `answer.kind === 'document'`). System prompt: opening paragraph (Think's :123-126 wording adapted to "You are handed ONE banked question, ONE person's answer to it, and that question's own weak-answer note. Your job is to judge whether the answer has the FORM its PRD section asks for…") → `CREATE_PRD_STANCE` → `sectionBrief()` → `MVP6_LINE` → `JUDGEMENT_RULE` → `YIELD_CONTRACT` → the op-vocabulary block and the "what closes a turn" list and the "THERE IS NO PARAMETER FOR ANSWER TEXT" paragraph (**copy the text from `systemFor` :130-152 into the new template literal; do not refactor `systemFor`**) → `LADDER_BRIEF` → `PROVENANCE_RULE[provenance]` → `EVIDENCE_RULE` → `PARENT_RULE` → the `wrong_if` sentence → the British-English closing line. Turn prompt: Think's template :193-210 with two additions — `${reaskBrief(ledger, question.id)}` after the ledger brief, and the closing line *"Say in prose which section this feeds, then file your one op against question_id … — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above."* (the parent instruction stays LAST).
  - `const CREATE_PRD_MODEL = 'claude-sonnet-5';` and the `POSTURES['create-prd']` entry: `{ id: 'create-prd', label: 'Create PRD', model: CREATE_PRD_MODEL, build: buildCreatePrdTurn, fingerprint: fingerprintOf({ build: buildCreatePrdTurn, model: CREATE_PRD_MODEL }) }`.
- **PATTERN**: `buildThinkTurn` :175-216 — the guard order, the `need` calls, the turn-prompt shape, the comment on why the closing line ends on the parent.
- **IMPORTS**: `METRIC_STAGE, NON_GOAL_QUESTIONS, SECTIONS` from `../../discovery/prd-projection.mjs`.
- **GOTCHA**: `SECTIONS` rows are frozen; read, never mutate. `prd-projection.mjs`'s CLI guard compares `import.meta.url` to `process.argv[1]`, so importing it from the portal or the gate runs nothing.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m => { const b = m.buildCreatePrdTurn(m.FINGERPRINT_INPUTS); console.log([m.CREATE_PRD_STANCE, m.JUDGEMENT_RULE, m.YIELD_CONTRACT, m.MVP6_LINE, m.PARENT_RULE].every(s => b.systemPrompt.includes(s)), b.systemPrompt.includes('business → Problem'), b.systemPrompt.lastIndexOf(m.PARENT_RULE) > b.systemPrompt.lastIndexOf(m.EVIDENCE_RULE)); })"` → `true true true`.
- **SATISFIES**: AC #1, AC #3, AC #4, AC #5 (Create-PRD names `claude-sonnet-5`).

### Task 4 — UPDATE `portal/lib/discovery-postures.mjs`: Grill, interview and audit

- **IMPLEMENT**:
  - `export const GRILL_STANCE` — *"You are GRILLING. Run the weak-answer note as a checklist against the answer and name every element it lacks — a number, a user, an alternative, a time, a cost, a checkable source, a wrong-if condition — and any contradiction with a decision already in this run's ledger, naming that decision's seq. An answer survives only when nothing on that list is missing. You still may not say it is wrong, and you still may not supply what it lacks."*
  - `export const AUDIT_VERDICT_RULE` — the four verdicts and their ops, verbatim in the audit system prompt: *"The document is the answer to every question in this session. For THIS question reach ONE verdict and file it. ANSWERED — the document states a decision on it, gives a wrong-if condition of its own, and names something checkable behind it: file_evidence for each checkable thing (url for a link; ref naming the document with a name for a named artefact), then record_decision with evidence_refs naming those rows. UNEVIDENCED — it states a decision with a wrong-if condition of its own but names nothing checkable: record_decision with evidence_refs [] — it records flagged, which is honest. DODGED — it touches the question but lacks the form: no number, no user, no alternative, no wrong-if condition, or two places that contradict each other: flag_weak_answer, with missing naming each thing the form lacks and quoting both places when it contradicts itself. ABSENT — it does not address the question at all: open_question with source banked and a reason saying so."*
  - `export const AUDIT_WRONG_IF_RULE` — *"wrong_if on an audited decision is the document's OWN condition — quoted, or closely paraphrased from the place the document states it. Never write one the document does not state: a decision with no wrong-if condition is DODGED, not answered."*
  - `export function buildGrillTurn({ question, answer, turn, ledger, provenance, entryMode = 'blank-idea' })`:
    - Guards as Think's, plus: `entryMode` must be `'blank-idea'` or `'existing-prd'` (refuse others by name); in `existing-prd` refuse `answer.kind !== 'document'` by name (*"an audit turn's answer is the stored document"*); in `blank-idea` refuse `answer.kind === 'document'`.
    - **Interview** system prompt: opening (Think's, with "Your job is to attack the FORM of the answer") → `GRILL_STANCE` → `MVP6_LINE` → `JUDGEMENT_RULE` → `YIELD_CONTRACT` → the copied vocabulary block → `LADDER_BRIEF` → `PROVENANCE_RULE[provenance]` → `EVIDENCE_RULE` → `PARENT_RULE` → `wrong_if` sentence → closing. Turn prompt: Think's template + `${reaskBrief(ledger, question.id)}` after the ledger brief; the closing line unchanged from Think's.
    - **Audit** system prompt: opening (*"…in AUDIT mode. You are handed ONE document — a PRD someone wrote before this session — and, one turn at a time, ONE banked question with its own weak-answer note. Your job is to judge whether the DOCUMENT answers that question with the FORM the question asks for, and to record what it holds."*) → **the document block**: *"The document, stored as ${answer.ref} in the answer store — every op you file names it:"* then the text between `<<<DOCUMENT` / `DOCUMENT>>>` fences on their own lines → `GRILL_STANCE` → `MVP6_LINE` → `JUDGEMENT_RULE` → `YIELD_CONTRACT` → `AUDIT_VERDICT_RULE` → `AUDIT_WRONG_IF_RULE` → the vocabulary block → `LADDER_BRIEF` → `PROVENANCE_RULE[provenance]` → `EVIDENCE_RULE` → `PARENT_RULE` → closing. Turn prompt: *"Turn ${turn}. Audit."* → the question and the weak-answer note (Think's lines) → *"The document is in your system prompt, stored as ${answer.ref}. Find where it addresses this question, quote the place in your judgement, and reach one verdict."* → `${ledgerBrief(ledger)}` → *"File your one closing op against question_id "${question.id}" and answer_ref "${answer.ref}" — file_evidence first for anything checkable the document names ON THIS QUESTION — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above."* **The document text appears nowhere in the turn prompt.**
  - `const GRILL_DEFAULT_MODEL = 'claude-sonnet-5';` and `POSTURES.grill`: `{ id: 'grill', label: 'Grill', model: GRILL_DEFAULT_MODEL, build: buildGrillTurn, fingerprint: fingerprintOf({ build: buildGrillTurn, model: GRILL_DEFAULT_MODEL, inputs: FINGERPRINT_INPUTS_FOR.grill }) }`.
  - `export function resolvePosture({ posture, model = null })` — refuse an unknown posture by name; `const m = model ?? p.model`; refuse `m` not in `MODELS` by name; refuse `m !== p.model` when `!MODEL_SETTABLE.includes(posture)` (*"posture "think" pins claude-sonnet-5 — Think and Create-PRD are the house default (architecture §Boundaries); Think on Opus is its own posture"*); return `p` itself when `m === p.model`, else `Object.freeze({ ...p, model: m, fingerprint: fingerprintOf({ build: p.build, model: m, inputs: FINGERPRINT_INPUTS_FOR[posture] }) })` — the SAME five keys, so case 11's key-set pin holds on the resolved object too.
  - Add `entryMode` to `buildThinkTurn`'s destructuring with the one refusal `if (entryMode === 'existing-prd') throw …` (*"Think is an interview posture — an existing-prd session starts at Grill (MVP 2)"*). Output for every existing input is unchanged (P4 proved the extra key is inert; the refusal fires only on a value no existing caller passes).
  - Rewrite the module header: three postures, the audit mode, why the document is in the system prompt, `MODELS`/`MODEL_SETTABLE`/`resolvePosture`, `FINGERPRINT_INPUTS_FOR`, and the sentence "Think's strings are byte-stable; groups 32 and 33 are the tripwire".
- **PATTERN**: the `existing-prd` document block mirrors the proposer's "the brief carries the package" (`discovery-proposer.mjs:31-34`). Guards: `need` :166.
- **GOTCHA**: The fences `<<<DOCUMENT` / `DOCUMENT>>>` are prompt text, not markdown. `PARENT_RULE` stays after every other exported rule in BOTH Grill templates — case 30.31 asserts it. The document goes BEFORE the rules, so the recency tail #341 paid for is kept.
- **VALIDATE**: `node -e "import('./portal/lib/discovery-postures.mjs').then(m => { const a = m.buildGrillTurn(m.AUDIT_FINGERPRINT_INPUTS); console.log(a.systemPrompt.includes('A fixed document for the fingerprint.'), !a.prompt.includes('A fixed document'), a.systemPrompt.includes(m.AUDIT_VERDICT_RULE)); console.log(Object.keys(m.POSTURES).join(','), m.resolvePosture({ posture: 'grill', model: 'claude-opus-5' }).fingerprint !== m.POSTURES.grill.fingerprint); try { m.resolvePosture({ posture: 'think', model: 'claude-opus-5' }); } catch (e) { console.log(e.message); } })"` → `true true true`, `think,think-opus,create-prd,grill true`, a refusal naming `think`. Then the byte diff: `node -e "import('./portal/lib/discovery-postures.mjs').then(m => { const b = m.buildThinkTurn(m.FINGERPRINT_INPUTS); require('fs').writeFileSync(process.env.S + '/think-after.txt', b.systemPrompt + '\n===\n' + b.prompt); })" && diff $S/think-before.txt $S/think-after.txt && echo THINK-UNCHANGED`.
- **SATISFIES**: AC #1 (Grill's model settable and a field), AC #2 (the verdict rule), AC #3, AC #4, AC #5.

### Task 5 — UPDATE `portal/lib/discovery.mjs`: the rules-layer tables and the document store

- **IMPLEMENT**:
  - `export const ENTRY_MODES = Object.freeze(['blank-idea', 'existing-prd']);` (:70; drop the "#286 adds" comment).
  - In the rules layer (after `DEPTH_PROPOSAL` :491): `DEPTH_PROPOSAL` gains `'existing-prd': 'full-discovery'` (D7). `export const ENTRY_POSTURES = Object.freeze({ 'blank-idea': Object.freeze(['think', 'think-opus', 'create-prd', 'grill']), 'existing-prd': Object.freeze(['grill']) });` (MVP 2: an existing document starts at Grill). `export const RE_ASKS = Object.freeze({ 'blank-idea': true, 'existing-prd': false });` (a document cannot answer twice — the hold rule is off in an audit). Each with a two-line comment in the style of :481-491.
  - Import `createHash` from `node:crypto`; import `MODELS, MODEL_SETTABLE, resolvePosture` beside `POSTURES` from `./discovery-postures.mjs`.
  - After `appendAnswer` (:264): `export function appendDocument(root, text)` — refuse a non-string or blank `text` by name; refuse if `documentOf(readAnswers(root))` already exists (*"this run already holds a document (ref aN) — one document per audit run"*); write `{ ref: nextRef(answers), ts: now(), turn: null, question_id: null, kind: 'document', text }` with `appendFileSync`, verbatim, and return the record. `export const documentOf = (answers) => (Array.isArray(answers) ? answers.find((a) => a?.kind === 'document') ?? null : null);`. `export function auditAnswerFor(view)` — returns `documentOf(view.answers)` or throws by name (*"run "${slug}" is an existing-prd audit but answers.jsonl holds no document line — the package is corrupt; a session is opened with its document"*).
- **PATTERN**: `appendAnswer` :250-264 (verbatim, no trim; the comment on `redact.mjs`); `DEPTH_PROPOSAL`'s comment :487-490 ("group 30 iterates ENTRY_MODES against this table both ways").
- **GOTCHA**: `appendAnswer`'s `kind` guard stays `['banked', 'off-script']` — a document never goes through it, so a banked turn can never write one by accident.
- **VALIDATE**: `node --check portal/lib/discovery.mjs`; a scratch script over a `mkdtemp` root: `appendDocument(root, 'x')` twice → the second throws naming `a1`; `documentOf(readAnswers(root)).kind === 'document'`.
- **SATISFIES**: AC #2 (the audit's data path), invariant 3 kept (server-written only).

### Task 6 — UPDATE `portal/lib/discovery.mjs`: the audit cursor and metrics

- **IMPLEMENT**: `deriveCursor({ depth, questions, transcript, entryMode = 'blank-idea' })` — refuse an `entryMode` not in `ENTRY_MODES` by name; `held = RE_ASKS[entryMode] && LADDER.includes(depth) && last.op === 'flag_weak_answer' && asks < 2`. `runMetrics({ depth, facets = null, questions, transcript, entryMode = 'blank-idea' })` passes `entryMode` to its internal `deriveCursor` call (:590) — without this `completion.done` disagrees with the view's cursor on an audit's last question. `sessionView` (:663) passes `head.entryMode ?? 'blank-idea'` to both, and adds `document: (() => { const d = documentOf(answers); return d ? { ref: d.ref, chars: d.text.length, md5: createHash('md5').update(d.text).digest('hex') } : null; })()`.
- **PATTERN**: `deriveCursor`'s header :514-522 and its `held` line :534.
- **GOTCHA**: the default `'blank-idea'` keeps every existing caller (group 30 case 9, 28, 29) byte-identical in behaviour; the seven committed packages all carry `entryMode: "blank-idea"`. No gate pins the view's key set (P10), so `document` is free to land. The md5 is over the stored text as UTF-8, so a document loaded by path hashes to the file's own md5 (D6).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep discovery` → ✓ (cases 9/28/29 unchanged).
- **SATISFIES**: AC #2 (an audit walks every question once).

### Task 7 — UPDATE `portal/lib/discovery.mjs`: `openSession`, `discoveryConfig`, `runTurn`

- **IMPLEMENT**:
  - `openSession({ slug, provenance, entryMode, depth, facets = null, frontEnd, posture, model = null, document = null, documentPath = null, reads = [] })`. New guards, all before `mkdirSync`: `if (!ENTRY_POSTURES[entryMode].includes(posture)) bad(\`posture "${posture}" cannot open an ${entryMode} session — it admits ${ENTRY_POSTURES[entryMode].join(' · ')} (MVP 2: an existing PRD starts at Grill)\`)`; `const resolved = resolvePosture({ posture, model });` (its own refusals name the posture and the model); for `existing-prd`: exactly one of `document` / `documentPath` (refuse both, refuse neither, by name); `documentPath` resolved against `REPO_DIR`, must exist and be a file, read as UTF-8, refuse an empty file; for `blank-idea`: refuse a non-null `document` or `documentPath` by name (*"a blank-idea session takes no document"*). The `writeRun` literal records `model: resolved.model` (replace `POSTURES[posture].model` :625). After `writeRun` and the two `writeFileSync` seeds, in the create branch only: `if (entryMode === 'existing-prd') appendDocument(root, text);`. Keep the existing `Object.hasOwn(POSTURES, posture)` guard (:612) — it runs before `ENTRY_POSTURES[entryMode]` is indexed.
  - `discoveryConfig()`: `postures` entries gain `modelSettable: MODEL_SETTABLE.includes(p.id)`; add `models: MODELS`, `entryPostures: ENTRY_POSTURES`. Never the prompt body. (P8: case 11's exact key list goes red until Task 11 widens it — expected, and the order of work is why Phase 4 follows.)
  - `runTurn`: after the cursor guards, `const audit = head.entryMode === 'existing-prd';` — in audit, refuse a non-blank `text` by name (*"an audit turn takes no answer — the document is the answer"*) and `const answer = auditAnswerFor(view);` with no append; otherwise today's `:798` guard and `:801` append. `posture: resolvePosture({ posture: head.posture, model: head.model })` replaces `POSTURES[head.posture]` (:812) — a pre-#286 package's `model` equals its posture's, so the posture itself comes back by identity.
  - Header: invariant 3 gains one sentence — the audit's document is the one `kind: "document"` line, server-written at `openSession`, and every audit op names it.
- **PATTERN**: `openSession` :603-636 (guard placement); `runTurn` :788-822 (LOCK → GUARDS → APPEND → RUN, with the audit skipping APPEND).
- **GOTCHA**: case 16 counts `bad|selectDepth|declareFacets|assertRunSlug|assertProvenanceRoot|allowSetFor(` calls before `mkdirSync` — `resolvePosture(` and `appendDocument(` are not in that regex; the new case 30.33 pins them separately. `appendDocument` must sit AFTER `writeRun` (so a throw there leaves no half-package with a document but no head) and inside the create branch (a resume must not append a second document — `appendDocument`'s own one-per-run refusal is the belt).
- **VALIDATE**: `node --check portal/lib/discovery.mjs`; `node -e "import('./portal/lib/discovery.mjs').then(m => { const c = m.discoveryConfig(); console.log(c.entryModes, c.models, c.postures.map(p => p.id + ':' + p.modelSettable).join(' '), JSON.stringify(c.entryPostures)); })"`.
- **SATISFIES**: AC #1 (Grill's model settable per run and recorded), AC #2.

### Task 8 — UPDATE `portal/lib/discovery-transport.mjs`: `entryMode` to the builder, `--probe-audit`

- **IMPLEMENT**:
  - `:148`: `posture.build({ question, answer, turn, ledger: state.current.ops, provenance: head.provenance, entryMode: head.entryMode ?? 'blank-idea' })`. Case 12's two regexes (`ledger: state.current.ops`, `provenance: head.provenance`) still match — neither contains a `)` before its key.
  - Import `resolvePosture` beside `POSTURES, TOOL_DESCRIPTIONS` (:43).
  - `MAIN_TOOLS`' comment (:52-56): replace "The run-2 ticket widens this to ['Read'] so the agent can read its fixture" with "An existing-prd audit carries its document in the system prompt (#286), so run 2 needs no read tool either; the read fence stays wired for the day a run does."
  - `export async function probeAudit({ model = null } = {})` — mirror `probeParenting` :379-436: a temp root; `answers.jsonl` holding ONE document line (`ref a1, kind document`, a ~15-line synthetic PRD fragment that states one decision on `s4-appetite` **with a wrong-if sentence and a URL**, and nothing on `s4-out-of-bounds`); an empty transcript; `run.json` with `entryMode: 'existing-prd'`, `posture: 'grill'`; one `runDiscoveryTurn` on `s4-appetite` with `answer` = the document record, `head: { sessionId: null, provenance: 'fictional', entryMode: 'existing-prd' }`, `posture: resolvePosture({ posture: 'grill', model })`. **Verdict**: `ANSWERED` (closer is a `record_decision` with non-empty `evidence_refs`), `UNEVIDENCED` (a decision with `[]`), `DODGED` (`flag_weak_answer`), `ABSENT` (`open_question`), else `INCONCLUSIVE`. **The wrong_if read (D2)**: for a decision, fold case and whitespace on both sides — `QUOTED` if the `wrong_if` is a substring of the document; `PARAPHRASED` if ≥ 60% of its word tokens (length ≥ 4) occur in the document; `AUTHORED` otherwise. **The judgement read (D8)**: whether a `text` line preceded the first op. Exit 0 on ANSWERED/UNEVIDENCED with QUOTED/PARAPHRASED, or DODGED; exit 2 on ABSENT (the document does address it) or AUTHORED (name `AUDIT_WRONG_IF_RULE` as the constant to tighten); exit 3 on INCONCLUSIVE. Print the model and the resolved fingerprint.
  - The CLI branch (:559-600): add `--probe-audit [--model <string>]` to the usage line and the exclusive-flag check.
- **PATTERN**: `probeParenting` :379-436 — temp root, `finally { rmSync }`, verdict read off the streamed lines, the on-disk `denied` tools listed.
- **GOTCHA**: PAID (~$0.05-0.15). Nothing imports it; only the CLI branch reaches it. Never in CI.
- **VALIDATE**: `cd portal && node lib/discovery-transport.mjs --preflight` → every row ✓ (zero tokens); `node --check lib/discovery-transport.mjs`. The probe itself is Level 5.
- **SATISFIES**: AC #2 (the audit observed on a real turn, operator-run), D2 observed rather than assumed.

### Task 9 — UPDATE `portal/server.mjs`: the session route

- **IMPLEMENT**: `:171-180` — add `model: b.model ?? null, document: b.document ?? null, documentPath: b.documentPath ?? null` to the `openSession` call, each named. Comment: the three are #286's; `documentPath` is the operator naming a file (run 2's frozen fixture) so the stored bytes hash to the file's own md5; the fence bounds the agent, never the operator (the same reasoning as `reads`). The turn route (:320-350) needs no change: `text: body.text` is `undefined` when the drawer sends none, and `runTurn` decides by `head.entryMode`.
- **PATTERN**: the route's own "EVERY PARAMETER NAMED" comment.
- **VALIDATE**: `node --check portal/server.mjs`; portal smoke in Task 15.
- **SATISFIES**: AC #2.

### Task 10 — UPDATE `discovery/prd-projection.mjs`: a document-kind answer renders as a pointer

- **IMPLEMENT**: `answerBlock` (:382-385) — resolve the record, not only its text: `const a = answers.find(...)`; if `a?.kind === 'document'` return `` `_[the audited document — answer ${cell(ref)}, ${a.text.length} characters, verbatim in answers.jsonl]_` `` ; else today's behaviour (marker for an unresolvable ref, `blockquote(t)` otherwise). Header note under "NO LENGTH CAP" (:48): a document-kind answer is rendered as a pointer BY KIND, not by length — thirty decisions each quoting a 24 KB document is a page nobody reads, and the document is one line in `answers.jsonl` a reader can open.
- **PATTERN**: `answerText` :378-381 (total, never throws).
- **GOTCHA**: the six committed `prd.md` files hold no document-kind answer, so their bytes do not move — Level 3 proves it with `--stdout | diff`.
- **VALIDATE**: `for s in spine-meridian-1 instrument-loans-1 bracket-trace-1 bracket-trace-2 graded-think-a graded-opus-a allergen-matrix-1; do node discovery/prd-projection.mjs $s --stdout | diff -q - discovery/$s/prd.md; done` → no output.
- **SATISFIES**: AC #2 (the gap list and the revised PRD are `prd.md`).

### Task 11 — UPDATE `tooling/build-checks.mjs`: group 30 (cases 11 and 16 edited, cases 30.30–30.34, the summary)

- **IMPLEMENT**:
  - `:249` and `:255` import lines: from `discovery.mjs` add `appendDocument, auditAnswerFor, documentOf, ENTRY_POSTURES, RE_ASKS`; from `discovery-postures.mjs` add `AUDIT_FINGERPRINT_INPUTS, AUDIT_VERDICT_RULE, AUDIT_WRONG_IF_RULE, buildCreatePrdTurn, buildGrillTurn, CREATE_PRD_STANCE, FINGERPRINT_INPUTS_FOR, GRILL_STANCE, JUDGEMENT_RULE, MODELS, MODEL_SETTABLE, reaskBrief, resolvePosture, sectionBrief`. `SECTIONS`, `METRIC_STAGE`, `NON_GOAL_QUESTIONS` are already imported for group 31 — reuse the names (check the alias if any).
  - **Case 11 :6143** — the exact key list becomes `["depthProposals", "depths", "entryModes", "entryPostures", "facets", "frontEnds", "hasToken", "models", "ops", "postures", "presets", "provenances", "questions"]` (P8).
  - **Case 16 :6791** — `existing-prd` is now a VALID mode: change to `refusedOpen({ entryMode: "nope" })?.includes("entryMode")`, and add: `refusedOpen({ entryMode: "existing-prd", posture: "think", document: "x" })` names `posture` and `Grill`; `refusedOpen({ entryMode: "existing-prd", posture: "grill" })` (no document) names `document`; `refusedOpen({ entryMode: "existing-prd", posture: "grill", document: "x", documentPath: "y" })` names both; `refusedOpen({ document: "x" })` on blank-idea names `document`; `refusedOpen({ model: "gpt-9" })` names `model`; `refusedOpen({ posture: "think", model: "claude-opus-5" })` names `think` and `claude-sonnet-5`; `refusedOpen({ entryMode: "existing-prd", posture: "grill", documentPath: "docs/does-not-exist.md" })` names the path. Widen the guard-count regex to include `resolvePosture` and raise the floor to 9; pin from source that `appendDocument(` appears in `openSession`'s body AFTER `writeRun(root, {` and AFTER `if (existing) return`; pin the `writeRun` literal carries `model: resolved.model`.
  - **30.30 — the posture table.** `Object.keys(POSTURES)` is exactly `think · think-opus · create-prd · grill`; `POSTURES.think.model === "claude-sonnet-5"` and `POSTURES["create-prd"].model === "claude-sonnet-5"` (AC #5, by name); every posture's `model` is in `MODELS`; `MODELS` and `MODEL_SETTABLE` frozen by mutation; `MODEL_SETTABLE` equals `["grill"]`; `FINGERPRINT_INPUTS_FOR.grill` is `[FINGERPRINT_INPUTS, AUDIT_FINGERPRINT_INPUTS]` and `AUDIT_FINGERPRINT_INPUTS.answer.kind === "document"`; `resolvePosture({ posture: "grill" })` IS `POSTURES.grill` (identity); `resolvePosture({ posture: "grill", model: "claude-opus-5" })` has `model` opus, the same five keys, a fingerprint that differs from `POSTURES.grill.fingerprint` and equals `fingerprintOf({ build: buildGrillTurn, model: "claude-opus-5", inputs: FINGERPRINT_INPUTS_FOR.grill })`; `resolvePosture({ posture: "think", model: "claude-opus-5" })` throws naming `think` and `claude-sonnet-5`; `{ posture: "create-prd", model: "claude-opus-5" }` throws; `{ posture: "grill", model: "gpt-9" }` throws naming `MODELS`' members; five junk postures/models throw. **The one-input-set join is unchanged**: `fingerprintOf({ build: buildThinkTurn, model: POSTURES.think.model, inputs: [FINGERPRINT_INPUTS] }) === POSTURES.think.fingerprint` AND `POSTURES.think.fingerprint === "7efdde37441fbd2591ba4a7dfeecdb6b"` — the literal is deliberate here and only here: it is P1's observed value and the stamp on five recordings; a legitimate future Think edit re-records those and re-pins this line in the same PR (the comment says so).
  - **30.31 — the three prompts' shared contract.** For each of `[buildCreatePrdTurn(FINGERPRINT_INPUTS), buildGrillTurn(FINGERPRINT_INPUTS), buildGrillTurn(AUDIT_FINGERPRINT_INPUTS)]`: `YIELD_CONTRACT`, `MVP6_LINE`, `JUDGEMENT_RULE`, `LADDER_BRIEF`, `PROVENANCE_RULE.fictional`, `EVIDENCE_RULE`, `PARENT_RULE` each VERBATIM in `systemPrompt`; `PROVENANCE_RULE.real` absent; index order `PROVENANCE < EVIDENCE < PARENT`; `PARENT_RULE`'s index greater than every other rule's; `"Decisions in this run"` absent from `systemPrompt` and the ledger brief present verbatim in `prompt` (over a three-rung ledger, reuse case 17's); the turn prompt's last instruction names `parent_id` (regex from case 17 :6181); a `real` build carries `PROVENANCE_RULE.real` and the same `prompt`; the five junk builds of case 16 throw for each builder; `buildCreatePrdTurn({ ...FINGERPRINT_INPUTS, entryMode: "existing-prd" })` throws naming `Grill`; `buildThinkTurn({ ...FINGERPRINT_INPUTS, entryMode: "existing-prd" })` throws naming `Grill`; purity by double call. Create PRD specifically: `CREATE_PRD_STANCE` verbatim; for every `SECTIONS` row with `axis === "ladder"` the line `${row.from} → ${row.heading}` is in `systemPrompt`; `NON_GOAL_QUESTIONS.join(" or ")` and `stage ${METRIC_STAGE}` present; the turn prompt asks for the section in prose. Grill interview: `GRILL_STANCE` verbatim; `AUDIT_VERDICT_RULE` ABSENT. **The re-ask brief**: `reaskBrief([], "x") === ""`; over a ledger holding a `flag_weak_answer` on `FINGERPRINT_INPUTS.question.id` with `missing: ["a number", "a user"]` both builders' `prompt` carries `seq N`, `a number · a user` and "second ask", and the brief sits BEFORE the closing line; over a flag on a DIFFERENT question the brief is absent; `reaskBrief(null, "x")` throws.
  - **30.32 — the audit build.** `const a = buildGrillTurn(AUDIT_FINGERPRINT_INPUTS)`: the document text verbatim in `systemPrompt` between `<<<DOCUMENT` and `DOCUMENT>>>`; the document text ABSENT from `prompt`; `prompt` names `AUDIT_FINGERPRINT_INPUTS.answer.ref`; `AUDIT_VERDICT_RULE` and `AUDIT_WRONG_IF_RULE` verbatim, and `AUDIT_VERDICT_RULE` names all four verbs (iterate `OPS`) and the words ANSWERED · UNEVIDENCED · DODGED · ABSENT; `AUDIT_WRONG_IF_RULE` says the wrong_if is the document's own and that none means DODGED; the document block's index is LESS than `PARENT_RULE`'s; `buildGrillTurn({ ...AUDIT_FINGERPRINT_INPUTS, answer: FINGERPRINT_INPUTS.answer })` throws naming `document`; `buildGrillTurn({ ...FINGERPRINT_INPUTS, answer: AUDIT_FINGERPRINT_INPUTS.answer })` (a document on an interview) throws; `entryMode: "nope"` throws. **The audit template is inside Grill's fingerprint**: a build that appends one space to the audit `systemPrompt` only (wrap `buildGrillTurn`, branch on `a.entryMode`) moves `fingerprintOf({ build, model, inputs: FINGERPRINT_INPUTS_FOR.grill })` while `POSTURES.think.fingerprint` is unmoved; the interview template moved alone also moves it.
  - **30.33 — the session in audit mode.** Tables: `ENTRY_MODES` equals `["blank-idea", "existing-prd"]`; `Object.keys(ENTRY_POSTURES)` and `Object.keys(RE_ASKS)` each equal `ENTRY_MODES` (both ways); every `ENTRY_POSTURES` value ⊆ `Object.keys(POSTURES)`, every posture appears in `ENTRY_POSTURES["blank-idea"]`, `ENTRY_POSTURES["existing-prd"]` equals `["grill"]`; `RE_ASKS["blank-idea"] === true`, `RE_ASKS["existing-prd"] === false`; both frozen by mutation; `DEPTH_PROPOSAL["existing-prd"]` is on `LADDER` (case 27 already iterates — confirm it goes green with the new row). The document store over `tmpRoot`: `appendDocument(root, "  raw \n")` returns `{ ref: "a1", turn: null, question_id: null, kind: "document", text: "  raw \n" }` verbatim and the file line matches; a second call throws naming `a1`; blank / non-string throw; `documentOf([])` null, `documentOf(readAnswers(root)).ref === "a1"`; `auditAnswerFor({ answers: [], head: { slug: "x" } })` throws naming `document`; `auditAnswerFor({ answers: readAnswers(root), head })` returns the record. The cursor: `mk("audit", { entryMode: "existing-prd", posture: "grill", depth: "scope-check" })` (case 28's `mk`), a `flag_weak_answer` closer on question 1 → `cursor.index === 1 && ask === 1` (never held), the same transcript under a `blank-idea` head → `index 0, ask 2` (the positive control); `sessionView(auditRoot).document` is `{ ref, chars, md5 }` with `md5` equal to `createHash("md5").update(text).digest("hex")`, and `null` on a blank-idea root; `runMetrics({ ..., entryMode: "existing-prd" }).completion.settled === 1` beside `deriveCursor(...)` agreeing; `deriveCursor({ ..., entryMode: "nope" })` throws naming `entryMode`; a `run.json` with `entryMode: "existing-prd"` and `posture: "think"` still READS (disk is authoritative; `sessionView` refuses nothing) — pin that `sessionView`'s body does not call `ENTRY_POSTURES`, so a pre-existing package is never made unreadable by a table edit. Config: `discoveryConfig()` carries `models === MODELS`, `entryPostures === ENTRY_POSTURES` (by JSON), every `postures[]` entry has `modelSettable` equal to `MODEL_SETTABLE.includes(id)`, and still no `build`, no prompt text (the rubric-absence idiom of case 11).
  - **30.34 — `runTurn`'s audit branch, source-pinned** (it reaches the SDK): `runTurn`'s body (slice from `export async function runTurn(` to `\n}\n`) contains `auditAnswerFor(` and `resolvePosture({ posture: head.posture, model: head.model })`, contains `appendAnswer(` exactly once and that call is inside a branch guarded by the audit flag (assert the `appendAnswer(` index is greater than the index of `head.entryMode === 'existing-prd'`), and the text guard for the audit names "takes no answer". The transport: `posture\.build\(\{[^)]*\bentryMode:\s*head\.entryMode\b` present; `MAIN_TOOLS = Object.freeze([])` unchanged.
  - **The group 30 summary string** (:6926): append `· #286 added THE THREE POSTURES AND THE AUDIT MODE: POSTURES pinned to think · think-opus · create-prd · grill with Think and Create-PRD on claude-sonnet-5 by name and every model in MODELS, MODEL_SETTABLE = grill alone, resolvePosture returning the posture itself on its own model and a five-key copy with a RECOMPUTED fingerprint on an override, and refusing an override on a pinned posture and an unknown model by name · the one-input-set fingerprint join proven unchanged and Think's stamp pinned to the five recordings' literal · the shared contract driven over all three new builds — YIELD_CONTRACT, MVP6_LINE, JUDGEMENT_RULE, LADDER_BRIEF, the provenance rule for its own run only, EVIDENCE_RULE and PARENT_RULE each VERBATIM, PARENT_RULE last, the ledger brief in the turn prompt and absent from the system prompt, five junk builds refused, Think and Create-PRD refusing an existing-prd build naming Grill · Create PRD's section brief derived from the projection's SECTIONS rows and every ladder row present · the re-ask brief present with the first flag's seq and missing list on the second ask and absent otherwise (#366, for the two new postures) · the AUDIT build with the document VERBATIM in the system prompt, ABSENT from the turn prompt, the ref named, AUDIT_VERDICT_RULE naming all four verbs and four verdicts, AUDIT_WRONG_IF_RULE naming the document's own condition, the document before PARENT_RULE, the wrong answer kind refused both ways, and the audit template proven INSIDE Grill's fingerprint by mutation with Think's unmoved · ENTRY_MODES, ENTRY_POSTURES and RE_ASKS pinned both ways with existing-prd admitting grill alone · the document store: one verbatim kind: document line per run, a second refused naming the first, documentOf and auditAnswerFor driven · the audit cursor NEVER holding (a blank-idea head over the same transcript as the positive control), metrics agreeing, the view carrying the document's ref, length and md5, an unknown entryMode refused, sessionView pinned never to consult ENTRY_POSTURES · the config carrying models, entryPostures and modelSettable and still no prompt body · openSession's new refusals driven (a non-Grill posture on existing-prd, no document, two documents, a document on blank-idea, an unknown model, an override on Think, a missing documentPath) with appendDocument pinned from source AFTER writeRun inside the create branch and the write literal recording model: resolved.model · runTurn's audit branch source-pinned to resolve the document instead of appending, and the transport pinned to pass entryMode: head.entryMode`. Extend "What it cannot reach" with: `and whether a model reaches the verdict the audit rule names, or quotes the document's wrong-if rather than writing one — --probe-audit is that one-turn observation, paid`.
- **PATTERN**: cases 16, 17, 19, 28 (cited above). Every message names the value it got.
- **GOTCHA**: `tmpRoot` names must be unique within the group. Never write under `discovery/`. `same()` is JSON-compare; frozen objects compare by shape.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓ all 34 groups pass`; then the mutations in §TESTING STRATEGY, each restored byte-for-byte.
- **SATISFIES**: AC #5 (the gate), and AC #1–#4 as gated facts.

### Task 12 — UPDATE `tooling/build-checks.mjs`: group 31 case 31.14 and group 34 case 34.13

- **IMPLEMENT**:
  - **31.14 — a document-kind answer renders as a pointer.** Build a package from `PRD_RUN` (with `entryMode: "existing-prd"`, `posture: "grill"`) whose answers are `[{ ref: "a1", kind: "document", text: "## Injected heading\n\nA document body with a pipe | in it." }, { ref: "a2", kind: "banked", text: "a banked answer" }]` and ops through the REAL applier: one `record_decision` on `a1`, one on `a2`. Assert: the page contains `the audited document — answer a1, <n> characters`; the document's body text is ABSENT from the whole page and `## Injected heading` adds no heading (reuse `headings()`); the banked answer renders as a blockquote (positive control); the Run line reads `entry existing-prd`; determinism.
  - **34.13** (:8663): replace `["think", "think-opus"]` with `["create-prd", "grill", "think", "think-opus"]` and reword: *"POSTURES holds ${…} — #286's four; TOOL_DESCRIPTIONS still has exactly OPS' four keys, which is why the two shipped fingerprints did not move"* — and add `same(Object.keys(TOOL_DESCRIPTIONS), [...DISCOVERY_OPS])` beside it (case 18 already pins it; restating it here keeps 34.13's sentence a checked fact). Update the group 34 summary's clause "the posture import pinned to PROVENANCE_RULE ALONE with both shipped fingerprints re-derived live" → "…with all four postures present and the two RECORDED fingerprints re-derived live".
- **PATTERN**: case 31.9 (hostile answer text) :7267; case 31.12's `PRD_RUN` spread.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep -E "prd projection|proposals"` → both ✓.
- **SATISFIES**: AC #2 (the gap list renders from an audit package), AC #5.

### Task 13 — UPDATE `portal/public/index.html` + `portal/public/portal.js`: the minimal drawer surface (D5)

- **IMPLEMENT** (`index.html`): in the start fieldset's second row (:171-178) add `<label>Entry <select name="entryMode" id="discovery-entry"></select></label>` before Depth; after the row add `<label id="discovery-model-row" hidden>Grill's model <select name="model" id="discovery-model"></select></label>` and `<div id="discovery-document-row" hidden><label>The document to audit — stored verbatim, once <textarea name="document" id="discovery-document" rows="8"></textarea></label><label>…or a repo-relative path the server reads (run 2's frozen fixture) <input name="documentPath" id="discovery-document-path" autocomplete="off" placeholder="docs/epics/fixtures/…md"></label></div>`. In the session block give the answer `<label>` an `id="discovery-answer-label"`; no other new element.
- **IMPLEMENT** (`portal.js`) — **three spans are pinned by case 20 (P9) and stay byte-identical**: the provenance `innerHTML` list (:714-716), the `if (!provenance)` guard's position before the POST in the open handler (:770-776), and the provenance-note ternary (:753-757). Edit around them:
  - Delete `DISCOVERY_ENTRY_MODE` (:684); `discoveryEls()` gains `entryMode: $('#discovery-entry').value`, `model: $('#discovery-model').value || null`, `document: $('#discovery-document').value || null`, `documentPath: $('#discovery-document-path').value.trim() || null`.
  - `loadDiscoveryConfig`: populate `#discovery-entry` from `c.entryModes` (blank-idea first); `#discovery-model` from `c.models`; then call a new `renderDiscoveryEntry()`.
  - `renderDiscoveryEntry()`: the postures select holds only `c.entryPostures[mode]` (rebuilt on change, `${label} (${model})`); `#discovery-document-row.hidden = mode !== 'existing-prd'`; `#discovery-model-row.hidden = !c.postures.find((p) => p.id === posture)?.modelSettable`; `#discovery-model.value` defaults to the posture's own model; the depth preselect reads `c.depthProposals[mode]`. In `renderDiscoveryNotes`, only the DEPTH-note sentence changes: `const mode = $('#discovery-entry').value; const proposed = c.depthProposals[mode];` and the wording "Proposed for ${mode === 'existing-prd' ? 'an existing PRD' : 'a blank idea'}; Start confirms it." — the provenance ternary above it is untouched. Listeners on `#discovery-entry` and `#discovery-posture` `change`.
  - The open handler: keep `if (!provenance) …` exactly where it is; AFTER it and before the POST add the document refusal (`existing-prd` with neither field → a sentence naming the consequence); send `entryMode, model, document, documentPath` named in the body.
  - `renderDiscoverySession`: `const audit = head.entryMode === 'existing-prd'`; `$('#discovery-answer-label').hidden = audit`; the submit button text `audit ? 'Audit this question' : 'Submit answer'`; the position line appends ` · audit` in audit.
  - The submit handler (:1014-1066): in audit skip the "An answer is needed" check and send `{ slug, provenance, questionId }` with no `text`; the status line reads "Auditing the document against this question — this spends real tokens."; the finally block restores the audit label.
  - `renderDiscoveryRecorded`: a `kind === 'document'` answer renders `The audited document — ${a.text.length} characters, stored verbatim as ${a.ref}` instead of its text, and its ops list each `o.op · ${o.params?.question_id}` so thirty verdicts read by question.
- **PATTERN**: the config-driven posture select :723-724; the note pattern :747-761.
- **GOTCHA**: `[hidden] { display: none !important }` is at `portal.css:61` (P11), so `.hidden = …` on the new rows and the answer label works. 44×44: selects and inputs inherit `:197`; add `#discovery-drawer textarea { min-height: 44px }` if missing.
- **VALIDATE**: `node --check portal/public/portal.js`; `node tooling/build-checks.mjs 2>&1 | grep discovery` → ✓ (case 20's three pins still match); the portal smoke in Task 15.
- **SATISFIES**: AC #2 reachable from the UI (D5).

### Task 14 — UPDATE `discovery/README.md`, `.claude/references/gates.md`, `CLAUDE.md`

- **IMPLEMENT**:
  - README §Files: `answers.jsonl` line gains "three kinds: banked · off-script · document (an existing-prd audit's one document, written at session start)". §File shapes: a third example line `{ "ref": "a1", "ts": "…Z", "turn": null, "question_id": null, "kind": "document", "text": "…the supplied PRD, verbatim…" }`; `run.json`'s `entryMode` bullet: "`blank-idea` or `existing-prd` (#286) — the values are now a contract"; `model`: "the model the run's posture ran on — Think, Think on Opus and Create PRD pin theirs; Grill's is chosen at session start from `MODELS` and recorded here; the fingerprint follows it". New subsection **§The audit mode (existing-prd, #286)** after §The op grammar: the verdict → op table (ANSWERED · UNEVIDENCED · DODGED · ABSENT with the verb and the flag each records), the wrong-if quote rule (D2), "the document sits in the system prompt and never in a turn prompt", "an audit never holds a question", "`prd.md` from an audit run is the revised PRD; its Weak answers, Open questions and the resting-on-no-evidence line are the gap list", and `sessionView().document.md5` for run 2's freeze check (D6). §Workflow: add the audit start (pick `existing-prd`, paste the document or name its path, Grill, a model) and `cd portal && node lib/discovery-transport.mjs --probe-audit [--model claude-opus-5]   # ONE paid turn: does Grill reach a verdict the audit rule names, quote the document's wrong-if, and judge in prose first?`.
  - `gates.md` :49 (group 30): append one sentence in the entry's style naming what #286 added (the tables, the builds, the audit build inside Grill's fingerprint, the document store, the audit cursor, the openSession refusals, Think's stamp pinned to the recordings' literal) and, in the *cannot reach* clause, "whether a model reaches the verdict the audit rule names or quotes the wrong-if — `--probe-audit`". :51 (group 31): "a document-kind answer rendered as a pointer, its text off the page (#286)". :57 (group 34): "the posture pin widened to #286's four". Add a **The audit probe** paragraph after the fence probe (:90) in the same shape (what it spends, what it reads, the exit codes, when to run it).
  - `CLAUDE.md` :148 bullet, one clause after "A run is a REAL session through the portal's discovery drawer (#284)": "— a blank idea under Think, Create PRD or Grill, or an existing PRD audited under Grill (#286), whose document is the one server-written `kind: "document"` answer line".
- **PATTERN**: the #285 entries in each file (the last sentence of each group's paragraph).
- **GOTCHA**: `gates.md` line 49 is one 5.5 KB line; append, do not reflow. CLAUDE.md is an index — one clause, no invariant restated.
- **VALIDATE**: `node tooling/drift-check.mjs` → `drift-check ✓`; `grep -c "existing-prd" discovery/README.md` ≥ 4.
- **SATISFIES**: the epic's "plan, report and review in the same PR" rule; format spec kept true.

### Task 15 — the portal smoke and the throwaway audit (Level 4)

- **IMPLEMENT**: `cd portal && PORT=4799 node server.mjs &` (a private port; kill by PID, never `pkill -f`). `curl -s localhost:4799/api/health`; `curl -s localhost:4799/api/discovery/config | node -e "…"` prints four postures, two entry modes, `entryPostures`, `models`. In the browser: entry `existing-prd` → the posture select shows Grill only and the document row appears; paste a ~15-line synthetic PRD fragment (fictional; it must state one decision with a wrong-if line and a URL, and say nothing on at least one of scope-check's six); slug `audit-throwaway-286`, provenance **fictional**, depth **scope-check**, model `claude-sonnet-5`; Start → `run.json` carries `entryMode existing-prd · posture grill · model claude-sonnet-5`, `answers.jsonl` holds one `kind: "document"` line, the view's `document.md5` matches `md5 -q` of the pasted text saved to a file. Run all six audit turns (each "Audit this question"). Read `transcript.jsonl`: every turn has a `text` line BEFORE its first op (JUDGEMENT_RULE), exactly one closer per turn, every op's `answer_ref` is `a1`, the verdict spread recorded (ANSWERED/UNEVIDENCED/DODGED/ABSENT counts) and, for every `record_decision`, whether its `wrong_if` is QUOTED / PARAPHRASED / AUTHORED against the pasted text (D2). `Download PRD` → the Run line reads `entry existing-prd`, decisions carry the pointer line, no document text on the page. Then a second throwaway `posture-throwaway-286` on `blank-idea` · `create-prd` · scope-check: one turn, confirm the prose names a section. **Then `rm -rf discovery/audit-throwaway-286 discovery/posture-throwaway-286`** and `ls discovery | grep throwaway` prints nothing. Kill the portal by PID. Expected cost: ~$0.4-0.7 over seven turns (derived from Run 0's $0.03-0.07 per turn plus the cached document).
- **GOTCHA**: a throwaway is never committed and never presented as a run; it is deleted in the same sitting (`.claude/reports/discovery-session-rules-285-report.md` Level 4 did exactly this). Provenance `fictional` writes into the repo, which is why the delete is part of the task. If any `wrong_if` reads AUTHORED: tighten `AUDIT_WRONG_IF_RULE` in place, delete the throwaway, re-run (≤ 3 attempts), and record each attempt in the report.
- **VALIDATE**: the report records the counts and `git status --short discovery/` is empty of throwaways.
- **SATISFIES**: AC #2 observed; AC #3 read from the transcript's prose; D2 observed.

### Task 16 — the audit probe (Level 5, paid, operator-run)

- **IMPLEMENT**: `cd portal && node lib/discovery-transport.mjs --probe-audit` and once with `--model claude-opus-5`. Record both verdicts, the wrong-if read, the JUDGEMENT observation and the fingerprints in the report. Not in CI.
- **VALIDATE**: exit 0 on both, or the exit-2/3 reading recorded honestly with the prompt constant it points at.
- **SATISFIES**: AC #1 (Grill on two models, each recorded), AC #2.

### Task 17 — the two issue comments (at PR time, with `piv-create-pr`)

- **IMPLEMENT**: `gh issue comment 288 --body-file …` — "Landed by #286 (PR #N): the entry-mode select, the document field (textarea + repo-relative path), Grill's model select, the audit submit and the document-kind recorded view, all driven by `/api/discovery/config`'s `entryModes`, `entryPostures`, `models` and `postures[].modelSettable`. #288 keeps: the three-button FLOW in order, the facet checkboxes and presets, the package view, the differing-POST 409." `gh issue comment 292 --body-file …` — "How the fixture reaches the agent after #286: open the session with `entryMode: existing-prd`, `posture: grill`, the chosen `model`, and `documentPath: docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md`; the server stores the bytes verbatim as answer `a1` and `sessionView().document.md5` must read `ab6eb0ee6cdd3b7802ecfcbe90db2377` — that is precondition 1's re-verification, on the stored bytes. The agent has no read tool (`MAIN_TOOLS = []`), so precondition 2's fence proof holds by construction; the ledger's `denied` lines will show zero built-in calls. Grill's model is recorded in `run.json.model` and its fingerprint follows it." Both comments quote the PR number once it exists.
- **VALIDATE**: `gh issue view 288 --json comments --jq '.comments[-1].body' | head -3` shows the text.
- **SATISFIES**: D5 and D6 communicated where the next tickets will read them; nothing built twice.

---

## TESTING STRATEGY

No suite (CLAUDE.md §Testing). The gate is `tooling/build-checks.mjs`; the paid observations are the throwaway and the probe.

### Unit Tests

Group 30 cases 30.30–30.34 and the edited cases 11 and 16; group 31 case 31.14; group 34 case 34.13 — all specified in Tasks 11–12. Every assertion names the value it got.

**Mutation checks — each must go red by name, then be restored byte-for-byte, and the report records the output line:**

1. `JUDGEMENT_RULE` removed from Grill's interview system prompt → 30.31 red (`JUDGEMENT_RULE does not appear VERBATIM`).
2. The document block moved into the audit TURN prompt → 30.32 red (document present in `prompt`).
3. `RE_ASKS['existing-prd'] = true` → 30.33 red (the audit held a question).
4. `ENTRY_POSTURES['existing-prd'] = ['grill', 'think']` → 30.33 red and case 16's posture refusal red.
5. `resolvePosture` returning `p` on an override (fingerprint not recomputed) → 30.30 red.
6. `fingerprintOf`'s join reordered (`[systemPrompt, model, …]`) → 30.30's literal red AND group 32 case 2a red (`the Think prompt surface changed`) — the tripwire the whole plan leans on; prove it can fire.
7. `answerBlock` rendering a document-kind answer as a blockquote → 31.14 red (document text on the page).
8. `TOOL_DESCRIPTIONS` given a fifth key → 34.13, 30.18 and group 32 red together (the reason the audit adds no tool).
9. `discoveryConfig()` with `models` removed → case 11's key list red (P8's pin, proven live).

### Integration Tests

- Level 3: `--preflight` (zero tokens); the seven committed packages' `sessionView` unchanged (index/ask/done — the #285 report's table); the six committed `prd.md` byte-identical via `--stdout | diff`.
- Level 4: the throwaway audit (Task 15).
- Level 5: `--probe-audit` on both models (Task 16).

### Edge Cases

- A pre-#286 package (no `model` override, `entryMode: "blank-idea"`) resolves to its posture object by identity — `runTurn` stamps the same fingerprint as before.
- A `run.json` edited to `entryMode: "existing-prd"` + `posture: "think"` still READS (`sessionView` refuses nothing); `runTurn` on it throws at the builder's own guard (Think refuses `existing-prd`).
- A document containing `<<<DOCUMENT` — prompt text only; no gate concern.
- `documentPath` pointing outside the repo — accepted (the operator's trust boundary, as `reads`); pointing at a directory or a missing file — refused by name.
- The audit's last question: `completion.done` true on the view AND on `metrics` (Task 6's second `entryMode` plumbing).
- A Grill interview second ask: the brief names the first flag's `missing`; a Create-PRD second ask likewise; Think's second ask stays blind (#366 open, stated).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
for f in portal/lib/discovery-postures.mjs portal/lib/discovery.mjs portal/lib/discovery-transport.mjs portal/server.mjs portal/public/portal.js discovery/prd-projection.mjs tooling/build-checks.mjs; do node --check "$f" && echo "ok $f"; done
grep -n "^import" discovery/prd-projection.mjs | grep -c portal   # must print 0
node -e "import('./portal/lib/discovery-postures.mjs').then(m => console.log(m.POSTURES.think.fingerprint === '7efdde37441fbd2591ba4a7dfeecdb6b' && m.POSTURES['think-opus'].fingerprint === 'cadb38117a2660c036d87e32323a8745'))"   # true
```

### Level 2: The gate

```bash
node tooling/build-checks.mjs          # build ✓ all 34 groups pass
node tooling/drift-check.mjs           # drift-check ✓
node tooling/token-lint.mjs            # unchanged; CI verify runs it
```

### Level 3: The committed packages are unmoved

```bash
for s in spine-meridian-1 instrument-loans-1 bracket-trace-1 bracket-trace-2 graded-think-a graded-opus-a allergen-matrix-1; do node discovery/prd-projection.mjs $s --stdout | diff -q - discovery/$s/prd.md && echo "same $s"; done
cd portal && node lib/discovery-transport.mjs --preflight
```

### Level 4: Manual Validation

Task 15 — the portal on a private port, the config payload, the throwaway audit at scope-check, the Create-PRD turn, the PRD download, the delete.

### Level 5: Additional Validation (paid, operator-run)

Task 16 — `--probe-audit` on `claude-sonnet-5` and `claude-opus-5`.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** Each posture builds its own prompt and names its own model as a field; Grill's is settable per run (`openSession({ model })` → `run.json.model`, the fingerprint recomputed) and refused on Think and Create-PRD by name. *Gated: 30.30, case 16; observed: the throwaway's `run.json` and the two probes.*
- [ ] **AC #2** The audit mode walks a supplied document against the banked questions of the chosen depth, one verdict per question, each filed as one of the four existing ops referencing the one `kind: "document"` answer line. *Gated: 30.32, 30.33, 30.34, 31.14; observed: six audit turns on the throwaway.*
- [ ] **AC #3** MVP 6's line holds in every posture: `MVP6_LINE` verbatim in all three prompts; the audit's `wrong_if` is the document's own; Grill attacks form and may not supply. *Gated: 30.31, 30.32; read from the throwaway's prose and the probe's wrong-if classification.*
- [ ] **AC #4** `YIELD_CONTRACT` verbatim in all three prompts. *Gated: 30.31.*
- [ ] **AC #5** Posture prompts are exported builders and strings the gate reads; `build-checks` asserts every posture names a model and that Think and Create-PRD name `claude-sonnet-5`. *Gated: 30.30.*
- [ ] Think's fingerprint unchanged: `7efdde37…` and `cadb3811…` reproduce; groups 32 and 33 green with no fixture re-recorded.
- [ ] The six committed `prd.md` files byte-identical; the seven packages' views unchanged.
- [ ] README, gates.md, CLAUDE.md updated; `drift-check ✓`.
- [ ] PR body carries `Closes #286`; plan, report and review in the same PR; the two issue comments posted (Task 17).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] The nine mutation checks each observed red, then restored
- [ ] The two throwaways deleted; `git status --short discovery/` clean
- [ ] Manual testing confirms the audit runs from the drawer
- [ ] Acceptance criteria all met
- [ ] Report at `.claude/reports/discovery-postures-286-report.md` records observed vs derived vs expected on every number, and #366's Think half as still open

---

## OPEN QUESTIONS / ASSUMPTIONS

Nothing blocks execution. The recorded defaults an owner may change with a one-line edit and its gate line:

- **Create PRD as a per-turn posture** (D-none; the ticket's AC #1/#5 name it; Run 0 read "no evidence either way"). Built. Removing it later is one `POSTURES` entry and its 30.30/30.31 lines.
- **`DEPTH_PROPOSAL['existing-prd'] = 'full-discovery'`** (D7) — a table row.
- **Grill's default model `claude-sonnet-5`** (D4) — one constant; the override is the parameter the ticket asked for.
- **Grill allowed on a blank idea** (D7) — one entry in `ENTRY_POSTURES['blank-idea']`.

## NOTES (open canvas)

**Why the document is an answer line and not a `reads` file.** Two designs were weighed. (a) The agent reads the fixture with a fenced `Read` (the shape #287's fence probe rehearses and the transport's comment anticipated). (b) The server stores the document verbatim as the one `kind: "document"` answer and puts it in the system prompt. (a) has no `answer_ref` for a verdict to name — the applier's `resolveAnswer` would refuse every op, or the agent would have to file against a ref that means nothing — and it spends a `Read` tool call per turn on 24 KB. (b) is invariant 3 applied unchanged (server-written, verbatim, by reference), the proposer's already-proven "brief carries the package" shape, cache-friendly (one stable system prompt), and leaves `MAIN_TOOLS = []` so the fence proof for run 2 is trivial. P5 ran (b)'s op shape through the real applier. (b) wins on every axis; the cost is `answerBlock`'s pointer (Task 10).

**Why no fifth verb.** The three verdicts in the ticket plus the "absent" case the grammar already expresses map onto the four verbs with the applier's own refuse-vs-flag rule doing the "unevidenced" work (`evidence_refs: []` → `flagged: ["no-evidence"]`). A fifth verb would take the epic's op-verb lock and add a group 29 fixture and a group 31 section for a distinction `prd.md` already renders (Weak answers · Open questions · the no-evidence line).

**Why Think does not change.** Five recordings carry `7efdde37…` or `cadb3811…` on every `turnStats` entry (P3), and groups 32 and 33 compare three of them live. One byte in `systemFor` or the turn template re-records three fixtures (~130 paid turns for the graded pair). So F9's `JUDGEMENT_RULE` and #366's re-ask brief land on the two new postures only, and both are named as still-open for Think in the report. Task 0's snapshot and Task 4's `diff` make "unchanged" a byte fact, and 30.30 pins the literal so a drift is red before the fixtures are even read.

**Why the section brief is derived, not written.** `SECTIONS` is the projection's table and group 31 iterates `LEVELS` and `OPS` against it. A hand-written "business → Problem" list in the prompt would be a second copy that drifts the day a heading is renamed; importing the table makes the prompt follow the page, and 30.31 asserts every ladder row is on it.

**Data flow of one audit turn.**

```
drawer: "Audit this question"  →  POST /api/discovery/turn { slug, provenance, questionId }   (no text)
runTurn: lock → guards → audit? → auditAnswerFor(view) = the a1 document line   (no append)
       → transport.runDiscoveryTurn({ …, posture: resolvePosture(head), answer: a1 })
       → buildGrillTurn({ entryMode: 'existing-prd' }): system = stance + <<<DOCUMENT…>>> + rules; prompt = question + weak note + ledger brief + "file against a1"
       → query({ model: head.model, systemPrompt, prompt, tools: [], mcpServers: { discovery } })
       → the agent: text (judgement) → [file_evidence…] → ONE closer naming answer_ref a1
       → applier: refs resolve (a1 exists), R2 on the turn, [] flagged no-evidence
       → transcript.jsonl append; turnStats stamped with the RESOLVED fingerprint
       → next question (never a hold: RE_ASKS['existing-prd'] = false)
```

**Cost shape.** The document adds ~6-7k tokens to the system prompt; with resume-per-turn and the system prompt stable, turns after the first read it from cache. Expected per-turn cost close to Think's ($0.03-0.07 on Run 0) plus the cache read. The `MAX_TURNS = 6` cap admits four tool calls per turn (F10) — an ANSWERED verdict with three evidence rows fits; a fourth trips it. The audit turn prompt scopes evidence to "on this question", which is the mitigation this ticket can make without touching the cap.

**Sequencing.** Phase 4's gate cases are written against Phase 1-3's exports; write them after those phases compile, not in parallel — a case authored against a guessed export name is a case that never ran. Between Task 7 and Task 11 case 11's key list is red by design (P8); that is the one expected red in the whole run and it is named. Phase 5 is independent and can go last.

## AMENDMENTS

- 2026-09-04 (pre-execution) — the four review risks resolved before the first task: R1 (Think's fingerprint) became P1–P4 plus a byte diff and a pinned literal; R2 (the two-posture pin) became P8/P12 plus Task 11's and Task 12's named edits; R3 (the quoted wrong-if) became D2 with the probe's QUOTED/PARAPHRASED/AUTHORED read and a re-run protocol; R4 (the drawer overlap with #288) became D5 plus Task 17's boundary comments. Confidence 9 → 10 on those observations.
