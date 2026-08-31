# Feature: The agent fills `parent_id` — parenting becomes a lookup, and a recorded run proves it (#341)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing.

Pay special attention to naming of existing exports. `discovery/ops.mjs`, `discovery/bank.mjs`,
`portal/lib/discovery.mjs`, `portal/lib/discovery-postures.mjs`, `portal/lib/discovery-transport.mjs`
and `discovery/prd-projection.mjs` are ALL LANDED — import from them, never re-derive them.

> **Phase 4 is a REAL agent run and spends tokens (~$0.60 per attempt, derived from the rehearsal's
> $1.488 / 30 turns).** It records a fictional run package into `discovery/instrument-loans-1/` through
> the portal's own drawer. `discovery/README.md`'s honesty rules bind it in full: the server writes
> `answers.jsonl`, the applier writes every `op` line, and **nothing in the package is ever hand-written
> or hand-edited**. A run that comes back wrong is deleted and re-run under a tighter prompt. The
> answers are pre-registered in this plan (§PRE-REGISTERED ANSWER SHEET) and the report must say they
> were written by the agent at plan time, the way `.claude/reports/discovery-spine-run-package-284-report.md`
> D3 says it for `spine-meridian-1`.

## Feature Description

In the full-depth rehearsal (`<JOBS_DIR>/_discovery/my-product-name`, 30 turns) every one of the 29
`record_decision` ops passed `parent_id: null`. Re-reading that ledger with the audit this plan
specifies (observed today): **18 decisions were filed while a valid parent sat in the ledger and named
none; 1 (seq 5) had no possible parent and is an honest orphan.** The agent tried five times, named a
sibling or a grandparent every time, and after each refusal fell back to null.

The ticket names two causes (a permissive prompt; one structural bank-order case). Reading the code
sharpens the first: **the agent is never shown the ledger.** `buildThinkTurn` (`portal/lib/discovery-postures.mjs:82`)
puts the question, the weak-answer note and the one answer in the turn prompt, and nothing else. The
system prompt says "names a parent one rung above, by the seq of an earlier decision in this run" but
the only place the agent has ever seen a seq is its own resumed session history, where the tool result
reads `filed seq 6: record_decision (turn closed) flagged no-evidence, orphan` — **no level**. So
parenting is recall across a 30-turn resumed conversation of what rung it filed seq 6 at. The
transcript shows the recall failing: at t8 the agent wrote *"worth anchoring under a stakeholder
decision later"* and at t11 *"the natural parent once the ladder allows it"* — two and five turns after
it had filed seq 6 at `stakeholder`.

This ticket does three things:

1. **Makes parenting a lookup.** The turn prompt carries a `ledgerBrief` — this run's decisions by
   rung, and the parent candidates for each rung the agent might file at. The system prompt's
   permission becomes an instruction (`PARENT_RULE`, exported like `YIELD_CONTRACT` so a tightening is
   a one-line diff group 30 pins).
2. **Makes the refusal a correction.** The applier's wrong-rung message names the seqs at the
   required rung (or says there are none, and to pass null), so a retry has something to retry with.
3. **Adds the check that can fail.** A pure `auditParenting(ops)` read, proven on synthetic ledgers
   to detect a miss, applied by a new build-checks group 32 to a committed **real** `opening-set` run
   whose op lines are re-folded through the real applier. The gate states out loud that it observes
   one recorded run and cannot see a later prompt regression until someone re-records.

## User Story

As the owner running a discovery session in the portal
I want each decision the agent files to name the decision one rung above it whenever one exists
So that the projected PRD's Requirement hierarchy is a ladder rather than four unrelated lists, and
an orphan marker means "nothing above it yet" and never "the agent did not look".

## Problem Statement

`discovery/ops.mjs` accepts a correct parent, refuses a wrong-rung one, and flags a null one. `discovery/prd-projection.mjs`
renders the ladder. `tooling/build-checks.mjs` groups 29 and 31 prove both — over fixtures that
already carry `parent_id`. Group 30 pins the prompt as strings. **No gate observes what the agent
chooses to send against a real ledger**, and in the one full run so far it chose null 18 times out of
18 eligible. The applier, the projection and the tests are correct and the feature is inert in practice
— the shape `[[check-that-cannot-fail]]` names.

## Solution Statement

- `discovery/ops.mjs` gains two pure reads — `parentCandidates(ops, level)` and `auditParenting(ops)`
  — and its wrong-rung refusal names the candidates. Group 29 drives both directions.
- `portal/lib/discovery-postures.mjs` gains `PARENT_RULE` (exported, pinned verbatim by group 30) and
  `ledgerBrief(ops)`; `buildThinkTurn` takes a required `ledger` and renders the brief into the **turn
  prompt** (never the system prompt, which stays byte-stable across the session so its cache holds),
  ending on a recency line that names `parent_id` last. The tool descriptions move here as
  `TOOL_DESCRIPTIONS` (they are prompt text the agent reads at call time; SDK-free, so group 30 can pin
  them) and `record_decision`'s says where `parent_id` comes from. `portal/lib/discovery-transport.mjs`
  passes `state.current.ops`.
- **The prompt-surface fingerprint.** `POSTURES.think.fingerprint` is an md5 over everything the agent
  reads — the system prompt, the turn template and brief format (built over fixed synthetic inputs),
  the tool descriptions, the model. The transport stamps it on every `turnStats` entry. Group 32
  asserts the committed fixture's every turn carries the CURRENT fingerprint, so **a prompt change
  turns the gate red by name until the fixture is re-recorded** — the drift-check idiom (group 28.9's
  md5, `gen-replay`'s check) applied to a behavioural recording.
- **The parenting probe** — `cd portal && node lib/discovery-transport.mjs --probe-parenting`: one paid
  turn (~$0.05) over a temp root holding a three-rung ledger built by the real applier, asking a
  solution-eligible question through the REAL `runDiscoveryTurn`, and reporting PARENTED / MISSED /
  INCONCLUSIVE from the transcript. It is the pre-flight's paid sibling: run before the fixture and after
  any prompt edit, it observes the fixed behaviour for one turn before twelve are spent.
- A new build-checks **group 32** reads `discovery/instrument-loans-1/` — a real `opening-set` run
  recorded in Phase 4 — re-folds its ops through the real applier, and asserts `auditParenting` reports
  `missed: []` with `eligible.length ≥ 1` (non-vacuous), after first proving on a synthetic ledger that
  the audit detects a miss. It also projects the package and asserts the hierarchy renders at least one
  `parent: seq N` line, and checks the fingerprint on all twelve turns.
- **The fixture is recorded on a fresh port** (`PORT=4748`): `env.mjs` reads `PORT`, `origin.mjs` is
  parameterised on it, the SPA uses relative URLs — so no stale process can be serving the drawer
  (#338 F2) and no parallel session's server is touched.
- Docs: `discovery/README.md` (refusal wording, the fixture, the Workflow line), `.claude/references/gates.md`
  (group 32 entry), `CLAUDE.md` ("31 PURE groups" → 32, twice), build-checks header + verdict line.

## Out of Scope / Non-Goals

- **Not reordering the bank.** Cause B (position 5 `s2-riskiest-assumption` precedes the first
  stakeholder-eligible question at 6) stays. The fixture will show it as one `structural` orphan, which
  is the honest record. The issue says leave it; #283 re-tunes the depth lists when the branches land.
- **Not judging level choice.** Whether `s4-appetite` is a `solution` or a `business` decision is the
  agent's read of form and the human's read of substance. The audit asks only: given the level you
  chose, did you name a parent when one existed at the rung above?
- **Not judging which valid parent.** The applier accepts any decision exactly one rung above; the
  audit checks non-null. Whether seq 7 semantically belongs under seq 6 or seq 10 is substance (MVP 6).
- **Not a live gate in CI.** CI has no SDK and no token. Group 32 observes a committed recording and
  its fingerprint; the live observation is the operator-run probe (one paid turn), listed in `gates.md`
  beside the journey drivers. The limitation that remains — model drift under an unchanged prompt — is
  stated in the ✓ line.
- **Not a `/api/health` commit stamp** (#338 F2's candidate ticket). The fresh-port recording makes it
  unnecessary for this ticket.
- **Not changing the tool-result text** in `discovery-transport.mjs:110` (`filed seq N: …`). Adding
  the level there was considered and rejected: the brief is the one view of the ledger, and two views
  of one fact drift (`discovery/ops.mjs`'s own `emptyRun()` reasoning).
- **Not #285's counters, #286's postures, #287's fence, #289's evidence path.** F6 (no evidence
  filed) from the rehearsal is a separate finding on #279 and is not touched here.
- **Not a portal route for the projection** (#338 F1) and **not the provenance default** (#338 F3).
- **Not touching `discovery/spine-meridian-1/`** or the real rehearsal package. The rehearsal is read
  locally as an oracle for the audit's numbers and is never committed (R1).

## Feature Metadata

**Feature Type**: Bug fix (prompt + refusal wording) + new gate group + one recorded fixture run
**Estimated Complexity**: Medium — the code is small and pure; the risk is the recorded run
**Primary Systems Affected**: `discovery/ops.mjs` · `portal/lib/discovery-postures.mjs` (constants,
brief, tool descriptions, fingerprint) · `portal/lib/discovery-transport.mjs` (the ledger argument, the
fingerprint on `turnStats`, the probe) · `tooling/build-checks.mjs` (groups 29, 30, new 32, header,
verdict) · `discovery/README.md` · `.claude/references/gates.md` · `CLAUDE.md` ·
`discovery/instrument-loans-1/` (new, recorded)
**Dependencies**: none new. Phase 4 needs the portal's installed deps and the Mac CLI login the SDK
already authenticates through (#338 A3: `HAS_TOKEN` false, turn still runs).

## Related Work

**Implements**: [#341](https://github.com/linardsb/ux-factory/issues/341) · **Epic**: #279 —
`docs/epics/discovery-partner.architecture.md` (§Data model: the op table, refuse-vs-flag; §Boundaries:
honesty surfaces). Inherited, not re-decided: the in-process tool transport (spike 1), resume-per-turn,
answer-by-reference, `discovery/` placement, the op-verb lock (no verb is added here), group numbers
claimed in merge order.

**Back-references**:

- `.claude/plans/discovery-ops-applier-281.md` — the applier and group 29 this extends
- `.claude/plans/discovery-spine-run-package-284.md` — the posture, the transport, group 30, the
  "three constants exported separately" pattern `PARENT_RULE` follows
- `.claude/plans/discovery-prd-projection-290.md` — `readPackage`, `projectPrd`, group 31
- `.claude/plans/discovery-run-0-338.md` + `.claude/reports/discovery-run-0-338-report.md` — F5 is
  this ticket; F2 (stale portal) is the trap Phase 4 must avoid; D1 (agent-browser through the real
  drawer) is the sanctioned way to drive a fixture run
- `.claude/reports/discovery-spine-run-package-284-report.md` D3 — precedent for agent-written
  fictional answers, disclosed

**Forward-references**: (none yet — a Stop hook or server-side parent suggestion only if Phase 4's
retry budget is exhausted, see §OPEN QUESTIONS)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `discovery/ops.mjs` (whole file, 226 lines) — Why: the applier. Lines 54 (`LEVELS`), 144–149 (the
  parent check and the refusal you are rewording), 213 (`applyOps`). Header invariant 6: **no imports
  at all** — the new reads must be import-free too.
- `portal/lib/discovery-postures.mjs` (whole file, 118 lines) — Why: lines 17 (imports from ops.mjs),
  21–33 (the three exported constants and WHY they are exported separately — `PARENT_RULE` follows
  this exactly), 36–73 (`SYSTEM`; line 65 is the paragraph `PARENT_RULE` replaces), 82–108
  (`buildThinkTurn` and the `need()` guard idiom), 95–106 (the turn prompt template).
- `portal/lib/discovery-transport.mjs` lines 96–125 and 166–170 — Why: `state.current` is the folded
  ledger (`buildOpServer` refuses anything else); line 168 is the one call to `posture.build` you
  extend. Do not touch the pre-flight.
- `portal/lib/discovery.mjs` lines 372–420 — Why: `stateFromTranscript` and `runTurn` show where
  `state.current` comes from (a fold of the transcript's op lines through the real applier).
- `tooling/build-checks.mjs` lines 1–60 and 122–145 (header + the group list you append 32 to),
  200–225 (the import block — add `parentCandidates`, `auditParenting`, `ledgerBrief`, `PARENT_RULE`,
  `readPackage`), 5296–5550 (group 29: the `threw`/`names`/`same` helpers, `dec()`/`ev()` factories,
  `happy` fixture, the `REFUSALS` battery at 5403 and its `>= 27` floor at 5434, 28.5 flag cases at
  5445), 5552–5826 (group 30: case 11/16 at 5722–5748, the junk-build loop at 5737, the closing
  `group("discovery", …)` at 5825), 5828–5960 (group 31's header comment on why ITS fixture is inline
  — group 32's header must say why its fixture is on disk), 6371–6382 (the last `group(…)` call and
  the verdict line).
- `discovery/prd-projection.mjs` lines 259–345 (`checkOpLines`), 588–625 (`renderHierarchy` — the
  `parent: seq N` line at 598–600 and the counts line at 605), 695–718 (`readPackage` returns
  `{ run, answers, ops }` with `type`/`ts` stripped from op lines), 630 (`projectPrd(pkg)`).
- `discovery/README.md` lines 44–55 (Files tree), 97–110 (the refusal list, bullet at 104), 227–245
  (Workflow + the commands block at 238).
- `.claude/references/gates.md` lines 45–51 (the group 28–31 entries; add 32 after 51 in the same
  shape, with a *Cannot reach* italic tail).
- `discovery/spine-meridian-1/` (3 files) — Why: the only committed real fictional package; read its
  `transcript.jsonl` to see the shape group 32 will read, and the t3 `denied` line — the agent named
  a sibling there too (`solution` parent 1, a `solution`).
- `.claude/reports/discovery-run-0-338-report.md` §"The full-depth rehearsal" and F2, F5 — Why: the
  numbers, the stale-portal trap, the agent-browser precedent.

### New Files to Create

- `discovery/instrument-loans-1/run.json` · `answers.jsonl` · `transcript.jsonl` — **recorded by the
  server in Phase 4, never written by hand**
- `discovery/instrument-loans-1/prd.md` — **generated** by `node discovery/prd-projection.mjs instrument-loans-1`
  in Phase 4, committed unedited (the README says a human edits it afterwards; for a gate fixture leave
  it as projected and say so in the report)
- `.claude/reports/discovery-parent-id-341-report.md` — the implementation report (same PR)
- `.claude/code-reviews/pr-<N>-review.md` — the review (same PR)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/discovery-partner.architecture.md` §Data model (lines ~140–175) — the op table and
  the refuse-vs-flag rule; this ticket changes a refusal's WORDING, never its condition
- `docs/research/requirements-hierarchy.md` — the BABOK ladder the parent rule encodes
- `discovery/README.md` §Honesty rules, §Addressing, §Refuse versus flag, §Workflow
- `.claude/references/gates.md` — read before adding group 32; the entry style and the "cannot reach"
  discipline
- No external library documentation is needed. The Agent SDK surface is unchanged.

### Patterns to Follow

**Exported constant pinned verbatim (postures):**

```js
// portal/lib/discovery-postures.mjs:21
export const YIELD_CONTRACT = `Judge this one answer. …`;
// …and in SYSTEM:  ${YIELD_CONTRACT}
// …and in group 30 case 16:
ok(built.systemPrompt.includes(YIELD_CONTRACT), "case 16: YIELD_CONTRACT does not appear VERBATIM …");
```

**Refusal messages name the op, the field and the value** (`discovery/ops.mjs:147–148`):

```js
throw new Error(`${name}: parent_id ${p.parent_id} is a ${parent.params.level} decision — a ${p.level} decision's parent sits one rung above, at ${LEVELS[…]}`);
```

**Group case idiom — drive the refusal with a broken input and match the message on what it must
name** (`tooling/build-checks.mjs:5403–5433`):

```js
["a parent two rungs up", () => applyDiscoveryOp(happy, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t9")), ["parent_id 2", "business", "solution", "stakeholder"]],
```

**A check must be able to fail** — prove the detector on a mutation before applying it to the real
thing (group 28.9's md5 + one-newline mutation; group 11's corrupted-label mutation). Group 32 proves
`auditParenting` reports a miss on a synthetic ledger BEFORE asserting `missed: []` on the fixture.

**Guard idiom in postures** (`discovery-postures.mjs:76–79`): `need(value, what)` throws a plain
Error naming the field; `buildThinkTurn` throws rather than building a prompt with a hole.

**Every group's ✓ line ends with what it cannot reach** (group 30's closing `group(…)`).

**Comments state WHY, cite the ticket, and name the invariant** — match the density of the files you
edit; a bare one-liner reads as foreign in these modules.

---

## IMPLEMENTATION PLAN

### Phase 1: The applier's two reads and the correcting refusal (`discovery/ops.mjs` + group 29)

No SDK, no filesystem — CI-testable in full. Validated against the rehearsal package as an oracle
(local only; the package is never committed).

### Phase 2: The prompt surface — `PARENT_RULE`, `ledgerBrief`, `TOOL_DESCRIPTIONS`, the fingerprint, the `ledger` argument, the probe (postures + transport + group 30)

**Depends on:** Phase 1 (`ledgerBrief` calls `parentCandidates`). Ends with the probe run once
(~$0.05) — the first observation of the fixed behaviour, before anything is committed.

### Phase 3: Group 32's scaffold, the docs, the renumber

**Depends on:** Phase 1 (imports `auditParenting`). **Independent of:** Phase 2.
Group 32 goes RED here by name ("no run package at discovery/instrument-loans-1") — that red run is
the proof it can fail, and it is recorded in the report.

### Phase 4: Record the fixture — a REAL `opening-set` run through the drawer

**Depends on:** Phases 1–3 all committed locally, `node tooling/build-checks.mjs` red ONLY on
group 32's missing-package assertion, and the probe PARENTED twice in a row. Spends tokens. Has a
decision rule and a retry budget; iteration happens on the $0.05 probe, not the $0.60 fixture.

### Phase 5: Report, review, PR

**Depends on:** Phase 4 green.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — UPDATE branch

- **IMPLEMENT**: `git fetch origin && git switch -c fix/341-parent-id origin/main`. Confirm
  `git log -1 --oneline` shows `4992172` or later. Confirm no other open PR claims group 32:
  `gh pr list --state open` (observed today: none open).
- **GOTCHA**: shared worktree, parallel sessions ([[shared-worktree-parallel-sessions]]) — verify the
  branch immediately before every commit; stage by explicit path. The untracked `*.txt`, `*.jpeg`,
  `assets/*.png` and `.claude/plans/*.html` files in the tree are not this ticket's; never `git add -A`.
- **VALIDATE**: `git branch --show-current` → `fix/341-parent-id`
- **SATISFIES**: process

### Task 1 — ADD `parentCandidates(ops, level)` to `discovery/ops.mjs`

- **IMPLEMENT**: below `FLAGS` (line 57) and above `emptyRun`, an exported pure function:

  ```js
  // The seqs a decision at `level` may name as its parent: every earlier record_decision exactly
  // one rung above it. [] for business (nothing above it) and for a rung nobody has filed at yet.
  // Exported because two callers need the SAME answer (#341): the applier's wrong-rung refusal names
  // these seqs so a retry has something to retry with, and the posture's turn prompt lists them per
  // rung so the agent's parent is a LOOKUP over what this run holds rather than a recollection from a
  // resumed session — the rehearsal filed null on 18 of 18 eligible decisions because the ledger was
  // never in front of it. Total over junk: a level off the ladder is a throw, never [] (a silent []
  // would read as "no candidates" and license a null).
  export function parentCandidates(ops, level) {
    if (!Array.isArray(ops)) throw new Error("parentCandidates: ops must be the ledger's records array");
    if (!LEVELS.includes(level)) throw new Error(`parentCandidates: level "${level}" is not on the ladder — ${LEVELS.join(" · ")}`);
    if (level === LEVELS[0]) return [];
    const above = LEVELS[LEVELS.indexOf(level) - 1];
    return ops.filter((r) => r?.op === "record_decision" && r.params?.level === above).map((r) => r.seq);
  }
  ```
- **PATTERN**: `LEVELS` at `ops.mjs:54`; the `r?.` tolerance the applier already uses over `ctx.answers`.
- **IMPORTS**: none — invariant 6.
- **GOTCHA**: superseded decisions ARE candidates: the applier accepts any earlier decision at the
  rung above, and the candidate list must equal the acceptance set or the brief will lie by omission.
- **VALIDATE**: `node -e 'import("./discovery/ops.mjs").then(m=>{const s=m.applyOps([{op:"record_decision",params:{question_id:null,answer_ref:"a1",level:"business",parent_id:null,evidence_refs:[],wrong_if:"w",off_script:true},turn:null}],{answers:[{ref:"a1"}],bank:[]});console.log(m.parentCandidates(s.ops,"stakeholder"),m.parentCandidates(s.ops,"solution"),m.parentCandidates(s.ops,"business"))})'`
  → `[ 1 ] [] []`
- **SATISFIES**: AC2, AC3

### Task 2 — ADD `auditParenting(ops)` to `discovery/ops.mjs`

- **IMPLEMENT**: directly below `parentCandidates`:

  ```js
  // The parenting audit — a pure read over a ledger, the way the not-a-form counter is arithmetic
  // over the records (#285). For every non-business decision: did the rung above hold a decision
  // WHEN THIS ONE WAS FILED, and did it name one? `eligible` had candidates; `missed` ⊂ eligible
  // passed null (the agent did not look); `structural` had none and passed null (the honest orphan —
  // the bank serves a solution-eligible question before the first stakeholder one, #341 cause B).
  // A business decision never appears in any list. This is the read build-checks group 32 makes over
  // the committed fixture run, and the read that turned the rehearsal's "19 orphans" into 18 missed
  // + 1 structural.
  export function auditParenting(ops) {
    if (!Array.isArray(ops)) throw new Error("auditParenting: ops must be the ledger's records array");
    const eligible = [], missed = [], structural = [];
    ops.forEach((r, i) => {
      if (r?.op !== "record_decision" || r.params?.level === LEVELS[0]) return;
      const candidates = parentCandidates(ops.slice(0, i), r.params.level);
      if (candidates.length) { eligible.push(r.seq); if (r.params.parent_id === null) missed.push(r.seq); }
      else if (r.params.parent_id === null) structural.push(r.seq);
    });
    return { eligible, missed, structural };
  }
  ```
- **GOTCHA**: `ops.slice(0, i)` — candidates at the moment of filing, not the final ledger. A
  decision filed before the first stakeholder one is `structural` even if a stakeholder decision lands
  later. That is exactly the distinction the issue draws for seq 5.
- **VALIDATE** (the oracle — numbers observed today over the rehearsal package, never committed):
  `node -e 'import("./discovery/ops.mjs").then(m=>{const fs=require("fs");const ops=fs.readFileSync(process.env.HOME+"/Desktop/Linards_current/Linards jobs folder/_discovery/my-product-name/transcript.jsonl","utf8").split("\n").filter(Boolean).map(JSON.parse).filter(l=>l.type==="op");console.log(JSON.stringify(m.auditParenting(ops)))})'`
  → `{"eligible":[6,7,8,9,10,11,12,15,17,20,21,22,23,24,26,28,29,30],"missed":[6,7,8,9,10,11,12,15,17,20,21,22,23,24,26,28,29,30],"structural":[5]}`
  (18 · 18 · 1). If `JOBS_DIR` is set, use it in place of the literal path.
- **SATISFIES**: AC3, AC4

### Task 3 — UPDATE the wrong-rung refusal in `discovery/ops.mjs:147–148` to name the candidates

- **IMPLEMENT**: replace the single throw with:

  ```js
  if (LEVELS.indexOf(parent.params.level) !== LEVELS.indexOf(p.level) - 1) {
    const above = LEVELS[LEVELS.indexOf(p.level) - 1];
    const candidates = parentCandidates(state.ops, p.level);
    // The refusal is a CORRECTION, not only a verdict (#341): the rehearsal's agent was told the
    // rung five times and re-filed null five times, because a rung is not a seq. Name the seqs.
    throw new Error(`${name}: parent_id ${p.parent_id} is a ${parent.params.level} decision — a ${p.level} decision's parent sits one rung above, at ${above}. ${candidates.length
      ? `This run's ${above} decisions are seq ${candidates.join(", ")} — re-file naming one of them`
      : `This run holds no ${above} decision yet — re-file with parent_id null`}`);
  }
  ```
- **GOTCHA**: the existing group 29 needles for "a parent two rungs up" (`"parent_id 2"`, `"business"`,
  `"solution"`, `"stakeholder"`) must still match — they do, the prefix is unchanged. The
  business-with-a-parent refusal on line 145 is NOT changed (a business decision has no candidates by
  definition and the message already says `must be null`).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep "discovery ops"` → ✓
- **SATISFIES**: AC2

### Task 4 — UPDATE `discovery/ops.mjs` header (lines 1–36)

- **IMPLEMENT**: one sentence after the six invariants: "Two pure reads over a ledger sit beside the
  applier — `parentCandidates` and `auditParenting` (#341) — because the refusal, the prompt and the
  gate must all answer 'who could this decision's parent be?' identically."
- **VALIDATE**: `node --check discovery/ops.mjs`
- **SATISFIES**: ground rule "invariants live in the file that owns them"

### Task 5 — ADD group 29 cases for the two reads and the correcting refusal (`tooling/build-checks.mjs` ~5445, before 28.5)

- **IMPLEMENT**: a new block `// 28.5a — parentCandidates and auditParenting (#341) …` using the
  existing `happy` (business at seq 2, on t1), `dec()`, `ctx()`, `same`, `names`, `threw`:
  - `same(parentCandidates(happy.ops, "stakeholder"), [2])`; `same(parentCandidates(happy.ops, "solution"), [])`;
    `same(parentCandidates(happy.ops, "business"), [])`; `same(parentCandidates([], "stakeholder"), [])`.
  - `threw(() => parentCandidates(happy.ops, "vibes"))` and `threw(() => parentCandidates(null, "solution"))`
    each a plain Error naming the value (use `names`).
  - Build `withStake = applyDiscoveryOp(happy, dec({ level: "stakeholder", parent_id: 2, question_id: "q2" }), ctx("t9"))`
    (seq 5). Then:
    - refusal WITH candidates: `names(() => applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t10")), "parent_id 2", "business", "stakeholder", "seq 5", "re-file") === null`
    - refusal WITHOUT candidates: `names(() => applyDiscoveryOp(happy, dec({ level: "solution", parent_id: 2, question_id: "q2" }), ctx("t9")), "parent_id 2", "no stakeholder decision yet", "null") === null`
  - `auditParenting`, all three lists, on applier-shaped records:
    - `same(auditParenting(happy.ops), { eligible: [], missed: [], structural: [] })` (one business decision, nothing to parent)
    - `same(auditParenting(withStake.ops), { eligible: [5], missed: [], structural: [] })`
    - a MISS: `missedRun = applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: null, question_id: "q2" }), ctx("t10"))` → `same(auditParenting(missedRun.ops), { eligible: [5, 6], missed: [6], structural: [] })`
    - a PARENTED one: `parented = applyDiscoveryOp(withStake, dec({ level: "solution", parent_id: 5, question_id: "q2" }), ctx("t10"))` → `missed: []`, `eligible: [5, 6]`
    - a STRUCTURAL one: `orphanFirst = applyDiscoveryOp(s1, dec({ level: "solution", parent_id: null }), ctx("t1"))` (no stakeholder exists) → `same(auditParenting(orphanFirst.ops), { eligible: [], missed: [], structural: [2] })`
    - the moment-of-filing rule: `later = applyDiscoveryOp(orphanFirst, dec({ level: "stakeholder", parent_id: null, question_id: "q2" }), ctx("t2"))`
      (seq 3, itself structural — no business decision exists in this ledger) → `same(auditParenting(later.ops), { eligible: [], missed: [], structural: [2, 3] })`:
      seq 2 stays `structural`, it does not become `missed` retroactively. Then
      `applyDiscoveryOp(later, dec({ level: "solution", parent_id: null, question_id: "q2" }), ctx("t3"))` → seq 4 IS `missed` (seq 3 existed when it filed): `{ eligible: [4], missed: [4], structural: [2, 3] }`.
    - junk: `threw(() => auditParenting(null))`, `auditParenting([])` → three empty lists.
  - Append to the `group("discovery ops", …)` detail string: `· parentCandidates by rung with the two junk throws, the wrong-rung refusal naming this run's candidate seqs (or "no … decision yet — re-file with parent_id null"), and auditParenting's three lists driven on applier-shaped records — a miss detected, a parent accepted, the structural orphan kept structural after a later stakeholder lands (#341)`.
- **PATTERN**: `tooling/build-checks.mjs:5445–5455` (28.5's `flagOf` shape) and `5403` (needles).
- **IMPORTS**: add `auditParenting, parentCandidates` to the `../discovery/ops.mjs` import at line 209.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build discovery ops ✓` and `all 31 groups pass`
  (still 31 at this point). Then the mutation: temporarily change `ops.slice(0, i)` to `ops` in
  `auditParenting`, re-run, confirm the moment-of-filing case goes red by name, revert.
- **SATISFIES**: AC2, AC3, "the check must be able to fail"

### Task 6 — ADD `PARENT_RULE` and `ledgerBrief` to `portal/lib/discovery-postures.mjs`

- **IMPLEMENT**:
  1. Import: `import { LEVELS, OPS, PARAMS, parentCandidates } from '../../discovery/ops.mjs';`
  2. After `LADDER_BRIEF` (line 33), the fourth exported constant with its own comment in the style
     of the three above (cite #341, say it is pinned verbatim by group 30 case 16):

     ```js
     export const PARENT_RULE = `A business decision has no parent (parent_id null). Every other decision names a parent: the seq of the decision ONE RUNG ABOVE it that it serves — stakeholder under business, solution under stakeholder, transition under solution. parent_id is not "a related decision": a decision at the same rung is a sibling and is refused. The turn prompt lists this run's decisions by rung and the parent candidates for the rung you are filing at — read the parent from that list; do not recall it. Pass null ONLY when that list says the rung above holds nothing yet; it records with an "orphan" flag, which is honest. If a filing is refused naming the rung, re-file once with a seq from that rung's candidate line, or null if the line says none.`;
     ```
  3. In `SYSTEM`, replace the paragraph at lines 65–67 ("A business decision has no parent … inventing
     a parent.") with `${PARENT_RULE}`. Nothing else in `SYSTEM` changes.
  4. Below `opVocabulary`, the brief:

     ```js
     // The ledger as the agent must see it before it files (#341): every decision so far by rung, then
     // the parent candidates per rung. Rendered into the TURN prompt and never the system prompt — the
     // system prompt is byte-stable across a session so its cache holds; the ledger changes every turn.
     // A decision is named by its seq and its question_id (an off-script one says so), which is what a
     // seq needs to be recognisable; the substance stays in the resumed session. Pure over the applier's
     // records; the candidate line is parentCandidates', so it can never disagree with the refusal.
     export function ledgerBrief(ops) {
       if (!Array.isArray(ops)) throw new Error("discovery-postures: ledgerBrief needs the ledger's records array");
       const decisions = ops.filter((r) => r?.op === 'record_decision');
       if (decisions.length === 0)
         return 'Decisions in this run so far: none. A stakeholder, solution or transition decision filed now has no parent candidate — pass parent_id null.';
       const byRung = LEVELS.map((level) => {
         const at = decisions.filter((r) => r.params.level === level);
         return `${level}: ${at.length ? at.map((r) => `seq ${r.seq} (${r.params.question_id ?? 'off-script'})`).join(' · ') : 'none'}`;
       });
       const candidates = LEVELS.slice(1).map((level) => {
         const c = parentCandidates(ops, level);
         const above = LEVELS[LEVELS.indexOf(level) - 1];
         return `filing at ${level} → parent_id ${c.length ? `one of ${c.join(', ')}` : `null (no ${above} decision yet)`}`;
       });
       return `Decisions in this run so far, by rung:\n${byRung.join('\n')}\n\nParent candidates:\n${candidates.join('\n')}`;
     }
     ```
  5. **Move the tool descriptions here.** From `discovery-transport.mjs:~88` (`const DESCRIPTIONS`) to
     an exported frozen `TOOL_DESCRIPTIONS` in postures, keyed by op, with a comment: they are prompt
     text the agent reads at call time, so they live with the other prompt text where group 30 can pin
     them and the fingerprint can cover them. `record_decision`'s description gains one sentence:
     `parent_id is the seq of the decision one rung above, taken from the turn prompt's "Parent candidates" line; null only when that line says none.`
     The other three are moved verbatim.
  6. **The fingerprint.** `import { createHash } from 'node:crypto';` (a Node built-in — group 30's
     source pin forbids the SDK, zod, the DOM and the transport, nothing else). Fixed synthetic inputs
     that never touch the bank (a bank edit must not move the fingerprint):

     ```js
     // What the agent READS, hashed, so a recording can say which prompt it was made under (#341).
     // Built over FIXED synthetic inputs — a question object that is not in the bank, one answer, a
     // three-rung ledger — so the hash moves when the system prompt, the turn template, the brief's
     // format, a tool description or the model moves, and for nothing else. Group 32 compares the
     // committed fixture's per-turn fingerprint to this one: a prompt edit makes the recording stale BY
     // NAME rather than leaving a green gate over a run the current prompt never produced.
     const FINGERPRINT_INPUTS = Object.freeze({
       question: Object.freeze({ id: 'fp-question', stage: 0, attribution: 'FIXED', text: 'A fixed question for the fingerprint.', weakAnswer: 'A fixed weak-answer note.' }),
       answer: Object.freeze({ ref: 'fp1', text: 'A fixed answer.' }),
       turn: 'fp',
       ledger: Object.freeze([
         Object.freeze({ seq: 1, op: 'record_decision', params: Object.freeze({ level: 'business', question_id: 'fp-b' }) }),
         Object.freeze({ seq: 2, op: 'record_decision', params: Object.freeze({ level: 'stakeholder', question_id: 'fp-s' }) }),
         Object.freeze({ seq: 3, op: 'record_decision', params: Object.freeze({ level: 'solution', question_id: null }) }),
       ]),
     });
     export function fingerprintOf({ build, model }) {
       const { systemPrompt, prompt } = build(FINGERPRINT_INPUTS);
       return createHash('md5').update([model, systemPrompt, prompt, JSON.stringify(TOOL_DESCRIPTIONS)].join('\n \n')).digest('hex');
     }
     ```
     Then `POSTURES.think` gains `fingerprint: fingerprintOf({ build: buildThinkTurn, model: 'claude-sonnet-5' })`
     (define `POSTURES` after `fingerprintOf`; the model string appears twice in the literal — read it
     once into a `const THINK_MODEL` and use it in both places).
- **GOTCHA**: `question.label` in the bank is the provenance label (`OBSERVED` / `DERIVED`), not a
  title — use `question_id`, which is already descriptive (`s5-pain-budget-same-person`). Do not
  import the bank here.
- **GOTCHA**: `LEVELS` must be imported from ops.mjs, not re-declared — group 29 pins the ladder
  there and a second copy drifts.
- **GOTCHA**: `ledgerBrief` reads `r.params.level` and `r.params.question_id` only — the fingerprint's
  synthetic ledger carries exactly those, so keep the brief to those two fields or update both.
- **VALIDATE**: `node --check portal/lib/discovery-postures.mjs`; `node -e 'import("./portal/lib/discovery-postures.mjs").then(m=>{console.log(m.ledgerBrief([]));console.log(m.POSTURES.think.fingerprint, m.fingerprintOf(m.POSTURES.think)===m.POSTURES.think.fingerprint)})'`
  prints the empty-ledger sentence, a 32-hex fingerprint and `true`.
- **SATISFIES**: AC1, AC7

### Task 7 — UPDATE `buildThinkTurn` to take and render `ledger` (`discovery-postures.mjs:82–108`)

- **IMPLEMENT**: signature `buildThinkTurn({ question, answer, turn, ledger })`; a guard after the
  `need(turn, 'turn')` line: `if (!Array.isArray(ledger)) throw new Error('discovery-postures: ledger must be the run\'s op records array ([] on the first turn) — a turn prompt built without it makes parenting a recollection again (#341)');`.
  In the prompt template, insert after the answer block and before `Judge it, then file…`:

  ```
  ${ledgerBrief(ledger)}

  ```
  and change the closing line to end on the parent (recency — the last instruction is the one a model
  is most likely to act on):
  `Judge it, then file your one op against question_id "${question.id}" and answer_ref "${answer.ref}" — and, if that op is a record_decision below business, take parent_id from the "Parent candidates" line above.`
  Update the function's comment to say the ledger is in the turn prompt, not the system prompt, and why.
- **GOTCHA**: `[]` is legal (turn 1). `undefined` is a throw — a caller that forgets the ledger must
  fail loudly rather than quietly regress to the rehearsal's behaviour.
- **GOTCHA**: the fingerprint's inputs (Task 6) pass through this function — a template change here
  moves `POSTURES.think.fingerprint`, which is the point.
- **VALIDATE**: `node -e 'import("./portal/lib/discovery-postures.mjs").then(async m=>{const {questionById}=await import("./discovery/bank.mjs");const b=m.buildThinkTurn({question:questionById("s4-appetite"),answer:{ref:"a7",text:"Two weeks."},turn:"t7",ledger:[{seq:1,op:"record_decision",params:{level:"business",question_id:"s1-if-nobody-solves-this"}},{seq:6,op:"record_decision",params:{level:"stakeholder",question_id:"s5-pain-budget-same-person"}}]});console.log(b.prompt);console.log("--- system has brief?",b.systemPrompt.includes("Decisions in this run"))})'`
  → the prompt shows both rungs and `filing at solution → parent_id one of 6`; the system-prompt check prints `false`.
- **SATISFIES**: AC1

### Task 8 — UPDATE `portal/lib/discovery-transport.mjs` — the ledger argument, the descriptions import, the fingerprint on `turnStats`

- **IMPLEMENT**:
  1. Line 168: `const { systemPrompt, prompt } = posture.build({ question, answer, turn, ledger: state.current.ops });`
     with a one-line comment: `// The folded ledger goes INTO the prompt (#341) — the same holder buildOpServer folds onto, so the brief and the applier read one ledger.`
  2. Delete the local `const DESCRIPTIONS = {…}` (~line 88); `import { POSTURES, TOOL_DESCRIPTIONS } from './discovery-postures.mjs';`
     and use `TOOL_DESCRIPTIONS[op]` in `buildOpServer`'s `tool(op, …)` call (keep the
     `?? \`File a ${op} op.\`` fallback).
  3. In the `result` branch's `stats` object, add `postureFingerprint: posture.fingerprint,` with the
     comment `// Which prompt surface this turn ran under (#341) — build-checks group 32 compares it to the current one, so a prompt edit makes the fixture stale by name.`
- **GOTCHA**: `state` is the holder `{ current }`; `buildOpServer` already refuses a bare run. Pass
  `state.current.ops`, not `state.ops`.
- **GOTCHA**: `posture.fingerprint` is read off the posture object passed in — do not import
  `fingerprintOf` here and recompute; one record of one fact.
- **VALIDATE**: `cd portal && node --check lib/discovery-transport.mjs && node lib/discovery-transport.mjs --preflight`
  → `pre-flight ✓  all 8 rows pass, zero tokens` (the pre-flight builds the server from the moved
  descriptions, so PF1/PF2 now also prove the move; it does not build a prompt — Task 8b is that proof).
- **SATISFIES**: AC1, AC7

### Task 8b — ADD the parenting probe to `portal/lib/discovery-transport.mjs` (`--probe-parenting`)

- **IMPLEMENT**: `export async function probeParenting()` beside `preflightTransport`, plus the CLI
  branch. The pre-flight's licence, extended by one paid turn: a `mkdtemp` root, deleted after, never a
  run package, never presented as one.

  ```js
  // The pre-flight's PAID sibling (#341): ONE real turn that observes whether the agent, shown a ledger
  // with a candidate at every rung, names a parent. It exists because the spine's defect survived every
  // pure gate — the applier, the projection and the prompt strings were all correct and the agent still
  // filed null 18 times — so the one thing worth observing before a twelve-turn fixture is spent is the
  // agent's own choice, once, for ~$0.05. Run it before recording the fixture and after ANY edit to the
  // prompt surface; group 32's fingerprint tells you when that is.
  //
  // The temp root holds four STUB answers and a three-rung ledger the REAL applier built (business →
  // stakeholder → solution), written through appendTranscript so the on-disk transcript and the holder
  // agree — exactly what buildOpServer's handler does. It is deleted on exit and is not a run.
  export async function probeParenting() {
    // 1. temp root; answers.jsonl with a1..a4 — a4 is the appetite answer the probe turn judges:
    //    "Two weeks of one developer, fixed before scope. If it does not fit we ship the handover only."
    // 2. state = { current: emptyRun() }; for each of three ops (business q s1-if-nobody-solves-this a1 t1 ·
    //    stakeholder parent 1 q s5-pain-budget-same-person a2 t2 · solution parent 2 q s4-rabbit-holes a3 t3):
    //    state.current = applyOp(state.current, op, { answers, bank: QUESTIONS, turn }); appendTranscript(root, opLine({ record }))
    // 3. const lines = []; await runDiscoveryTurn({ root, head: { sessionId: null }, question: questionById('s4-appetite'),
    //    answer: { ref: 'a4', text }, turn: 't4', posture: POSTURES.think, state, onLine: (l) => lines.push(l) })
    // 4. verdict from lines (turn t4): const closer = lines.find((l) => l.type === 'op' && l.closes);
    //    - closer.op === 'record_decision' && level !== 'business' && parent_id !== null && parentCandidates(before, level).includes(parent_id) → PARENTED
    //    - closer.op === 'record_decision' && level !== 'business' && parent_id === null → MISSED
    //    - anything else (business, flag_weak_answer, open_question, no closer) → INCONCLUSIVE
    //    corrections = lines.filter((l) => l.type === 'denied' && /parent_id/.test(l.error)).length
    // 5. rmSync(root, { recursive: true, force: true }); return { verdict, closer, corrections, text: agent text lines, stats }
  }
  ```
  CLI: `--probe-parenting` prints the verdict, the filed op's level and parent, the corrections count,
  the agent's prose, `costUsd`/`durationMs` from stats, and the fingerprint it ran under
  (`POSTURES.think.fingerprint`); exits 0 PARENTED · 2 MISSED · 3 INCONCLUSIVE. Update the usage line
  to list both flags.
- **PATTERN**: `preflightTransport` (`discovery-transport.mjs:~200–330`) for the temp root, the stub
  answers and the exit codes; `runTurn` in `discovery.mjs` for the exact `runDiscoveryTurn` call shape.
- **IMPORTS**: `questionById` from `../../discovery/bank.mjs` (add to the existing bank import);
  `applyOp, emptyRun, parentCandidates` from ops.mjs (`applyOp` is already imported); `opLine,
  appendTranscript` are already imported from discovery.mjs.
- **GOTCHA**: `head: { sessionId: null }` — `resume: undefined`, a fresh SDK session each probe. Never
  pass a real run's head.
- **GOTCHA**: the probe spends tokens. It is not called by build-checks, the pre-flight or any import —
  only the CLI branch reaches it. Say so in its comment.
- **GOTCHA**: `s4-appetite` was filed `solution` in both recorded runs; if the agent files it
  `business`, the verdict is INCONCLUSIVE, not a failure — re-run once. The three-rung ledger means a
  candidate exists whatever non-business level it picks, so a non-business decision is always conclusive.
- **VALIDATE**: `cd portal && node lib/discovery-transport.mjs --probe-parenting` → `PARENTED`, exit 0
  (observed, ~$0.05). Record the output in the report. If MISSED: the prompt did not hold at one turn —
  tighten `PARENT_RULE` (only that string), re-run. This is where iteration happens; see Task 15's rule.
- **SATISFIES**: AC8, and the first observation for AC4

### Task 9 — UPDATE group 30 for `PARENT_RULE`, `ledgerBrief` and the `ledger` argument (`tooling/build-checks.mjs` ~5722–5748)

- **IMPLEMENT**:
  - Import `ledgerBrief, PARENT_RULE` at line 220.
  - Case 11's `built` (line 5726): add `ledger: []`. Add to the junk loop at 5737 a build WITHOUT
    `ledger` and one with `ledger: "x"` — both must throw.
  - Case 16: `ok(built.systemPrompt.includes(PARENT_RULE), …VERBATIM…)`; add `PARENT_RULE` to the
    `> 40` length loop; `ok(/one rung above/i.test(PARENT_RULE) && /re-file/i.test(PARENT_RULE) && /null only when/i.test(PARENT_RULE), "case 16: PARENT_RULE must instruct (one rung above · re-file on refusal · null ONLY when nothing above) — a permission is what the rehearsal ran on")`.
  - New case 17 — the brief:
    - `ledgerBrief([])` includes `none` and `pass parent_id null`.
    - Build a synthetic ledger through the REAL applier (import `applyDiscoveryOps` is already
      there): business seq 1 on `s1-if-nobody-solves-this`, stakeholder seq 2 parent 1 on
      `s5-pain-budget-same-person`, solution seq 3 parent 2 on `s4-appetite` (answers `a1..a3`, bank =
      `BANK`, turns t1..t3). Assert the brief contains `business: seq 1 (s1-if-nobody-solves-this)`,
      `stakeholder: seq 2 (s5-pain-budget-same-person)`, `solution: seq 3 (s4-appetite)`,
      `transition: none`, `filing at stakeholder → parent_id one of 1`, `filing at solution → parent_id one of 2`,
      `filing at transition → parent_id one of 3`.
    - Over the two-decision ledger (drop seq 3): `filing at transition → parent_id null (no solution decision yet)`.
    - The built turn prompt with that ledger `includes(ledgerBrief(ledger))` VERBATIM, and
      `!built.systemPrompt.includes('Decisions in this run')` — the brief is in the turn prompt, never
      the system prompt (cache stability).
    - An off-script decision (`question_id: null`) renders as `(off-script)`.
    - `threw(() => ledgerBrief(null))`.
  - Case 17 also pins the recency line: `built.prompt` matches `/take parent_id from the "Parent candidates" line/`
    and that phrase sits AFTER the brief (`indexOf` order) — the last instruction names the parent.
  - New case 18 — `TOOL_DESCRIPTIONS`: frozen by mutation; keys `same` OPS in order; every value a
    non-empty string; `record_decision`'s matches `/parent_id[^.]*one rung above/` and `/candidates/`
    and `/null only when/i`; none of the four contains `undefined`.
  - New case 19 — the fingerprint: `POSTURES.think.fingerprint` matches `/^[0-9a-f]{32}$/`;
    `fingerprintOf(POSTURES.think) === POSTURES.think.fingerprint` (deterministic);
    sensitivity BY MUTATION — each of these differs from it:
    `fingerprintOf({ ...POSTURES.think, model: 'other-model' })`;
    `fingerprintOf({ model: POSTURES.think.model, build: (a) => { const b = buildThinkTurn(a); return { ...b, systemPrompt: b.systemPrompt + ' ' }; } })`;
    `fingerprintOf({ model: POSTURES.think.model, build: (a) => { const b = buildThinkTurn(a); return { ...b, prompt: b.prompt.replace('Parent candidates', 'Parent options') }; } })`.
    The bank is NOT in it: `fingerprintOf` over a `build` that ignores its question and returns the
    fixed strings for two different `question.text` values gives the same hash — assert by calling
    `buildThinkTurn` with the fingerprint inputs' question text altered and confirming the hash the
    module exports did not use it (i.e. `POSTURES.think.fingerprint` equals a hash recomputed from
    `buildThinkTurn(FINGERPRINT_INPUTS)` — export `FINGERPRINT_INPUTS` frozen for this case).
  - Case 12 (source pin) grows two pins over `portal/lib/discovery-transport.mjs` — read as TEXT, never
    imported (the same method as the existing case): `/posture\.build\(\{[^)]*\bledger:\s*state\.current\.ops\b/`
    must match (the ledger reaches the prompt), and `/^\s*const DESCRIPTIONS\b/m` must NOT match while
    `/^\s*import\b[^\n]*\bTOOL_DESCRIPTIONS\b[^\n]*discovery-postures/m` must (one copy of the tool
    text, the pinned one). Also `/postureFingerprint:\s*posture\.fingerprint/` must match (the stamp is
    read off the posture, not recomputed).
  - Append to the `group("discovery", …)` detail: `· PARENT_RULE pinned verbatim and asserted to INSTRUCT (one rung above, re-file on refusal, null only when nothing above) · ledgerBrief over an empty ledger, a three-rung applier-built ledger and an off-script decision, present VERBATIM in the turn prompt and ABSENT from the system prompt, the recency line naming parent_id LAST, with a build lacking the ledger refused · TOOL_DESCRIPTIONS frozen, keyed as OPS, record_decision's naming the candidate line · the posture fingerprint deterministic and MOVED by mutation of the model, the system prompt and the turn template, and pinned to fixed inputs the bank cannot touch · the transport pinned from source to pass the ledger, import the one copy of the tool text and stamp the fingerprint off the posture (#341)`.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build discovery ✓`, `all 31 groups pass`.
  Mutations, each reverted after: delete the `${PARENT_RULE}` line from `SYSTEM` → case 16 red by
  name; change one character of `TOOL_DESCRIPTIONS.record_decision` → case 19's stored fingerprint
  still equals the recomputed one (correct — both move together) but Task 10's fixture check would go
  red once a fixture exists; change `ledger: state.current.ops` to `ledger: []` in the transport → case
  12 red by name.
- **SATISFIES**: AC1, AC5, AC7

### Task 10 — ADD group 32's scaffold: the audit's mutation control + the fixture assertions (`tooling/build-checks.mjs`, after group 31's closing `group(…)` at 6371, before `// --- the verdict`)

- **IMPLEMENT**: `// --- 32 · the parenting fixture (#341) ---…` with a header comment stating:
  WHY this fixture is ON DISK where group 31's is inline (group 31's is hand-authored ops and must
  never look like a run; this one IS a run, recorded through the drawer, and hand-authoring it would be
  the honesty violation); WHAT it proves (the agent named a parent every time one existed, in one
  recorded `opening-set` session); WHAT it cannot (a later prompt regression, until re-recorded); and
  the re-record procedure pointer (`discovery/README.md §The parenting fixture`).

  ```js
  {
    const FIXTURE_SLUG = "instrument-loans-1";
    const root = join(ROOT, "discovery", FIXTURE_SLUG);
    // 32.1 — the detector can fail: the audit over applier-shaped synthetic records, a miss reported
    // before the fixture is trusted (group 11 / 28.9's mutation idiom). Reuse Task 5's shapes via a
    // tiny local fold — answers a1..a3, bank [{id:"q1"},{id:"q2"}], turns t1..t3.
    …assert missed: [3] on a solution filed null after a stakeholder; missed: [] once parent named…
    // 32.2 — the package exists and describes itself as the fixture. FAILS BY NAME when absent — never
    // skips: a skipped fixture is the check that cannot fail.
    ok(existsSync(join(root, "run.json")), `no run package at discovery/${FIXTURE_SLUG} — record it through the drawer per .claude/plans/discovery-parent-id-341.md Phase 4; this group never skips`);
    const pkg = existsSync(join(root, "run.json")) ? readPackage(root) : null;
    if (pkg) {
      ok(pkg.run.slug === FIXTURE_SLUG && pkg.run.provenance === "fictional" && pkg.run.root === `discovery/${FIXTURE_SLUG}` && pkg.run.depth === "opening-set" && pkg.run.frontEnd === "portal" && typeof pkg.run.endedAt === "string", …);
      // 32.2a — THE FRESHNESS TRIPWIRE. Every turn ran under the CURRENT prompt surface, or the
      // recording proves nothing about the prompt in the tree. Twelve turns, twelve stamps, one hash.
      const stamps = (pkg.run.turnStats ?? []).map((t) => t.postureFingerprint);
      ok(stamps.length === selectDepth("opening-set").length, `the fixture carries ${stamps.length} turnStats entries for a ${selectDepth("opening-set").length}-question depth — a turn is missing or the run was not finished`);
      ok(stamps.every((s) => s === POSTURES.think.fingerprint), `the Think prompt surface changed since the fixture was recorded (fixture ${[...new Set(stamps)].map((s) => String(s).slice(0, 8)).join(", ")} vs current ${POSTURES.think.fingerprint.slice(0, 8)}) — run the probe, then re-record it (discovery/README.md §The parenting fixture)`);
      // 32.3 — the ledger is the applier's, not a hand's: re-fold { op, params, turn } through the REAL
      // applier over the package's own answers and the REAL bank, and compare seq/closes/flagged/
      // supersedes/params record by record with the committed op lines (the README's drift detector).
      const refold = applyDiscoveryOps(pkg.ops.map(({ op, params, turn }) => ({ op, params, turn })), { answers: pkg.answers, bank: BANK }).ops;
      ok(same(refold, pkg.ops), "the committed op lines are not what the applier produces over the committed answers — a line was edited by hand, or the applier changed under the fixture");
      // 32.4 — the claim. Non-vacuous first, then zero misses, then every eligible parent in its
      // candidate set at the moment of filing.
      const audit = auditParenting(pkg.ops);
      ok(audit.eligible.length >= 1, `the fixture exercises no parenting at all (eligible 0) — every decision was business or filed before anything above it existed; re-record`);
      ok(audit.missed.length === 0, `${audit.missed.length} decision(s) filed null while a valid parent existed: seq ${audit.missed.join(", ")} — the prompt did not hold; tighten PARENT_RULE and re-record`);
      for (const seq of audit.eligible) { const i = pkg.ops.findIndex((r) => r.seq === seq); const rec = pkg.ops[i]; ok(parentCandidates(pkg.ops.slice(0, i), rec.params.level).includes(rec.params.parent_id), `seq ${seq} names parent ${rec.params.parent_id}, not one of its candidates`); }
      ok(pkg.ops.filter((r) => r.op === "record_decision").length >= 6, …at least half the twelve turns filed a decision — a run of weak-answer flags proves nothing about parenting…);
      // 32.5 — the ladder renders as a ladder from a REAL run: the projection's hierarchy section
      // carries at least one "parent: seq N" line, and prd.md exists beside the package.
      const md = projectPrd(pkg);
      ok(/parent: seq \d+/.test(md), "the projected Requirement hierarchy has no parented decision");
      ok(existsSync(join(root, "prd.md")), `discovery/${FIXTURE_SLUG}/prd.md is missing — generate it with node discovery/prd-projection.mjs ${FIXTURE_SLUG}`);
      // The denied lines are the receipt of any in-turn correction; count them for the ✓ line.
      const corrections = readTranscript(root).filter((l) => l.type === "denied" && /parent_id/.test(l.error ?? "")).length;
      group("parenting", `auditParenting proven to DETECT a miss on synthetic applier-shaped records before the fixture is trusted · discovery/${FIXTURE_SLUG} read as a package (fictional, opening-set, ended), its ${pkg.ops.length} op lines RE-FOLDED through the real applier and matched record by record · all ${stamps.length} turns stamped with the CURRENT prompt-surface fingerprint ${POSTURES.think.fingerprint.slice(0, 8)}, so a prompt edit makes this recording stale BY NAME · ${audit.eligible.length} decisions eligible for a parent, ${audit.missed.length} missed, ${audit.structural.length} structural orphan(s) (seq ${audit.structural.join(", ") || "none"}), every named parent in its candidate set at the moment of filing, ${corrections} in-turn parent correction(s) receipted as denied lines · the projected hierarchy carrying a real parent: seq line, prd.md present. What it cannot reach: the model's behaviour under an UNCHANGED prompt on a later date, or under a newer SDK — one recorded session; the operator-run probe (discovery-transport.mjs --probe-parenting) is the one-turn re-observation for that`);
    } else {
      group("parenting", "");   // unreachable: the ok() above already recorded the failure
    }
  }
  ```
  Use the exact helper names group 31 defines (`threw`, `same`) — redeclare locally inside the block
  as every group does. `readTranscript` is already imported from discovery.mjs; `existsSync`, `join`
  are already imported.
- **IMPORTS**: add `readPackage` to the `../discovery/prd-projection.mjs` import at line 224 and
  UPDATE its comment (it currently says readPackage is deliberately NOT imported — now: "group 31
  stays in memory; group 32 imports readPackage because its subject IS the on-disk package").
- **UPDATE** header: line 4 `Thirty-one groups` → `Thirty-two groups`; append a `//  32 parenting …`
  entry after the `31` entry (~line 145) in the list's style; verdict line 6381 → `all 32 groups pass`.
- **GOTCHA**: `group()` prints ✗ when `failed.length` is non-zero, so the "absent package" path must
  reach a `group(…)` call — do not `return` out of the block. The `else` branch is fine.
- **GOTCHA**: `same(refold, pkg.ops)` — `readPackage` strips only `type` and `ts`; the applier record
  key set is `seq, turn, op, params, closes, flagged, supersedes` in that order (`opLine` writes them
  in that order too, `discovery.mjs:~205`). If key order differs, compare field by field rather than
  by JSON.
- **VALIDATE**: `node tooling/build-checks.mjs` → **exactly one red group**, `build parenting ✗` naming
  `no run package at discovery/instrument-loans-1`; every other group ✓; exit 1. Record this output in
  the report — it is the proof the group can fail.
- **SATISFIES**: AC3, AC4, AC5

### Task 11 — UPDATE `discovery/README.md`

- **IMPLEMENT**:
  - Files tree (line ~52): under `<slug>/`, add
    `instrument-loans-1/    the PARENTING FIXTURE — a real opening-set run build-checks group 32 reads (#341)`.
  - Refusal bullet (line 104): `- a \`parent_id\` that is not a decision exactly one rung above — the refusal names this run's seqs at the required rung, or says there are none yet and to pass null (#341); …`
  - §run.json (lines ~155–175): add `postureFingerprint` to the `turnStats` example and a bullet:
    *each turn carries the md5 of the prompt surface it ran under (system prompt, turn template, tool
    descriptions, model — `POSTURES.<id>.fingerprint`); build-checks group 32 compares the fixture's to
    the current one, so a prompt edit makes the recording stale by name.*
  - A new short section before `## Workflow`: `## The parenting fixture` — what
    `discovery/instrument-loans-1/` is (a real `opening-set` run, fictional product, agent-written
    answers disclosed in the report), what group 32 asserts, the fingerprint tripwire, the limit (one
    recorded session; model drift under an unchanged prompt is the probe's to re-observe), and the
    re-record procedure: edit the prompt surface → `cd portal && node lib/discovery-transport.mjs --probe-parenting`
    until PARENTED twice → `rm -rf discovery/instrument-loans-1` → `PORT=4748 npm start` → drive the
    drawer with the pre-registered sheet (`.claude/plans/discovery-parent-id-341.md`) →
    `node discovery/prd-projection.mjs instrument-loans-1` → `node tooling/build-checks.mjs`.
    State that the answers are pre-registered so they cannot be tuned to the agent's behaviour after
    the fact, and that every prompt edit costs one re-record (~$0.60) — the price of a recording that
    proves the prompt in the tree.
  - Commands block (line 238): extend the build-checks comment: `… group 31 the projection, group 32 the parenting fixture`;
    add `cd portal && node lib/discovery-transport.mjs --probe-parenting   # ONE paid turn: does the agent name a parent when the ledger shows one? run after any prompt edit`.
- **VALIDATE**: `node tooling/drift-check.mjs` (README is not generated; this is the general gate) ✓
- **SATISFIES**: AC6

### Task 12 — UPDATE `.claude/references/gates.md` and `CLAUDE.md`

- **IMPLEMENT**: gates.md after line 51: `**Group 32 — the parenting fixture** (#341, \`discovery/instrument-loans-1/\`): …` in the group-31 entry's shape — the audit's mutation control, the re-fold, the fingerprint tripwire, the parent claim — ending with the italic *Cannot reach: the model's behaviour under an unchanged prompt on a later date, or under a newer SDK — one recorded session. The probe below is the re-observation.* Then, in gates.md's operator-run section (beside the journey drivers), one entry: `**The parenting probe** — \`cd portal && node lib/discovery-transport.mjs --probe-parenting\`: one paid turn over a temp root with a three-rung applier-built ledger; PARENTED / MISSED / INCONCLUSIVE from the transcript. Run before recording the fixture and after any prompt edit (group 32's fingerprint says when). Spends ~$0.05; never in CI.` Extend the group 29 entry (line 47) with `· parentCandidates and auditParenting, the wrong-rung refusal naming the candidate seqs (#341)` and the group 30 line (line 49, still "#284's debt") with one clause naming what #341 added there (the pins in Task 9) — do not write up the rest of group 30; that stays #284's debt and the line should still say so. CLAUDE.md lines 110 and 177: `31` → `32`.
- **VALIDATE**: `grep -n "31 PURE\|31 groups" CLAUDE.md .claude/references/gates.md tooling/build-checks.mjs` → no hits (the historical mentions in `.claude/reports/` and `.claude/plans/` stay).
- **SATISFIES**: AC6

### Task 13 — COMMIT Phases 1–3 (before spending tokens)

- **IMPLEMENT**: `git add discovery/ops.mjs portal/lib/discovery-postures.mjs portal/lib/discovery-transport.mjs tooling/build-checks.mjs discovery/README.md .claude/references/gates.md CLAUDE.md .claude/plans/discovery-parent-id-341.md` → one commit: `fix(discovery): parenting is a lookup — the ledger in the turn prompt, a correcting refusal, group 32 red until the fixture is recorded (#341)`.
- **GOTCHA**: build-checks is deliberately red on group 32 at this commit. Say so in the message body.
  Do not push yet.
- **VALIDATE**: `git status --short` shows nothing staged that is not in the list above.
- **SATISFIES**: process

### Task 14 — Phase 4 · the probe gate, then a portal on a FRESH port

- **IMPLEMENT**:
  1. `cd portal && node lib/discovery-transport.mjs --preflight` → 8/8 (zero tokens).
  2. **The probe gate:** `node lib/discovery-transport.mjs --probe-parenting` twice. Both PARENTED →
     proceed. Any MISSED → tighten `PARENT_RULE` only, re-probe (each probe ~$0.05; cap the loop at six
     probes, then apply Task 15's stop rule). INCONCLUSIVE → re-run that probe once. Record every
     verdict, the agent's prose and the cost in the report.
  3. `lsof -nP -i :4748 | grep LISTEN` → nothing (the port is unused by convention; if held, pick 4749
     and use it consistently below). **Do not kill anything on 4747** — a parallel session may own it.
  4. `cd portal && PORT=4748 npm start` (background) → `curl -s localhost:4748/api/health` → `ok: true`.
     This process was started AFTER every edit, from this tree, and nothing else serves this port — the
     stale-portal race (#338 F2) cannot occur by construction. `env.mjs` reads `PORT`; `origin.mjs`
     builds the allow-list from it; the SPA fetches relative URLs.
  5. `ls discovery/instrument-loans-1 2>/dev/null` → must not exist.
- **VALIDATE**: health ok on 4748; `lsof -nP -i :4748` shows exactly one PID, yours.
- **SATISFIES**: AC4 (the fixture must come from the fixed code), AC8

### Task 15 — Phase 4 · record the fixture through the drawer (REAL RUN, ~$0.60)

- **IMPLEMENT**: drive the real drawer at `http://localhost:4748` with `agent-browser` (the #338 D1
  precedent — the real form controls, the real routes, the real origin guard). The owner may do this
  by hand instead; either way the answers come from §PRE-REGISTERED ANSWER SHEET, pasted verbatim.
  1. Click `#btn-discovery`; `#discovery-slug` = `instrument-loans-1`; `#discovery-provenance` =
     `fictional`; `#discovery-depth` = `opening-set`; `#discovery-posture` = `think`; click
     `#discovery-start`. Confirm `#discovery-position` reads `instrument-loans-1 · Opening set · question 1 of 12 · turn t1`.
  2. For each of the 12 answers, in order: confirm `#discovery-question` shows the expected question
     text (the sheet lists each question's id), paste the answer into `#discovery-answer`, click
     `#discovery-submit`, wait until `#discovery-submit` is re-enabled and `#discovery-recorded` shows
     the new op (a turn is 7–22 s; the rehearsal's max was 21.9 s). If the cursor does not advance
     (the agent yielded without closing), re-submit the same answer on the same turn — R2 permits it.
  3. Click `#discovery-finish`. Confirm `discovery/instrument-loans-1/run.json` has a non-null
     `endedAt` and `turnStats.length === 12`.
  4. `node discovery/prd-projection.mjs instrument-loans-1` → writes `prd.md`.
  5. `node tooling/build-checks.mjs`.
- **DECISION RULE** (pre-registered, do not move it after reading the output):
  - `build parenting ✓` with `eligible ≥ 1` and `missed 0` → **keep**. Go to Task 16.
  - `missed > 0` → the prompt held for one turn (the probe) and not for twelve. Record the transcript's
    `denied` lines and the missed seqs in the report. Tighten **`PARENT_RULE` only** (one string, the
    spike-2 discipline), re-run the probe until PARENTED twice, `rm -rf discovery/instrument-loans-1`,
    repeat from step 1. **Maximum two fixture attempts after the first** (three in all) — the probe
    loop is where iteration is meant to happen, at a twelfth of the price.
  - `eligible 0` (every decision `business`, or every non-business one filed before anything above
    it) → the sheet did not elicit a ladder; this is not a prompt failure. Record it, delete, re-run
    once with the SAME sheet (level choice varies run to run); if still 0, stop and report — the
    ladder needs a wider depth, which is a plan amendment, not a mid-run edit.
  - Three fixture attempts with `missed > 0`, or six probes without two consecutive PARENTED → **stop**.
    Commit the code (Phases 1–3) with group 32 present and red, write the report with every
    transcript's evidence, and open the PR as a draft naming the next move (a `Stop` hook refusing a
    null parent when candidates exist — the architecture doc's spike-2 fallback shape — or the server
    computing `parent_id` from the brief when exactly one candidate exists). That is a re-plan, not a
    silent widening.
- **GOTCHA**: never edit any file under `discovery/instrument-loans-1/`. Never re-run a slug without
  deleting the directory first (openSession RESUMES an existing run.json). Never set provenance to
  `real` — the package must be committed.
- **GOTCHA**: watch `#discovery-log` for `denied` events mid-turn — a `record_decision` denied with
  `parent_id` in the error followed by a filed op with a non-null parent is the correction path
  working; keep it (it is the receipt). A `Bash` denial is the fence working (F4) and is fine.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 32 groups pass`; `git status --short`
  shows `discovery/instrument-loans-1/` (4 files) and nothing under any `_discovery` path.
- **SATISFIES**: AC3, AC4

### Task 16 — VALIDATE the whole surface

- **IMPLEMENT**: run every command in §VALIDATION COMMANDS. Read `discovery/instrument-loans-1/prd.md`
  §Requirement hierarchy by eye and quote its counts line in the report.
- **VALIDATE**: all green; the hierarchy shows `parent: seq N` on every eligible decision and
  `⚠ orphan` only on the structural one(s).
- **SATISFIES**: AC1–AC6

### Task 17 — CREATE `.claude/reports/discovery-parent-id-341-report.md`

- **IMPLEMENT**: the house report shape (see `.claude/reports/discovery-run-0-338-report.md`):
  summary · tasks · the red run of group 32 before the fixture (verbatim ✗ line) · the fixture run's
  numbers (attempts, `eligible`/`missed`/`structural`, denied lines by tool, cost from `turnStats`,
  per-turn latency) · **a disclosure paragraph: the twelve answers were written by the agent at plan
  time and pre-registered in the plan; they are fictional; the package is not the owner's authored
  discovery** (the #284 D3 precedent) · deviations · what the gate cannot reach.
- **VALIDATE**: every number labelled observed / derived / expected.
- **SATISFIES**: process

### Task 18 — COMMIT the fixture + report, push, PR

- **IMPLEMENT**: `git add discovery/instrument-loans-1 .claude/reports/discovery-parent-id-341-report.md tooling/build-checks.mjs` (if group 32's text changed) → commit
  `fix(discovery): the parenting fixture — a real opening-set run with every eligible parent named, group 32 green (#341)`.
  Then `/piv-create-pr`; the PR body MUST carry `Closes #341`. Then `/piv-review-pr` → `.claude/code-reviews/pr-<N>-review.md` in the same PR.
- **GOTCHA**: [[owner-merges-fast-verify-landed]] — check `gh pr view --json commits` before building
  on a "merged" state.
- **VALIDATE**: `gh pr view --json body | grep "Closes #341"`; CI `verify` green (drift-check, token-lint,
  `node --check` over every tracked .mjs — group 32 has no parked .mjs).
- **SATISFIES**: process

---

## PRE-REGISTERED ANSWER SHEET (Phase 4 — paste verbatim, in this order)

Fictional product: **an instrument-loan register for a secondary-school music department.** 140
loaned instruments, 600 pupils, a music coordinator (Priya), a school business manager (Tom), a head
of department, and hourly-paid peripatetic teachers. Every name and number is invented. Written by the
planning agent on 2026-08-31 so the run cannot be tuned to the agent's behaviour afterwards; the
report discloses this (#284 D3 precedent).

The expected rung in brackets is the sheet-writer's expectation, not an instruction to the agent —
the audit is conditional on whatever level the agent chooses.

1. **`s1-if-nobody-solves-this`** [business]
   Every term the music coordinator, Priya, spends about two days chasing 140 loaned instruments across 600 pupils. Last year 11 instruments were written off as lost, £4,200 at replacement cost, and two Year 9 pupils gave up their instrument because a repair went unnoticed for a term. If nobody solves it the same £4,200 and the same two days a term go every year, and the two pupils are the ones nobody counts.

2. **`s1-how-addressed-today`** [business]
   A paper loan book in the music office and a spreadsheet Priya rebuilds from it every September. Three shortcomings: the book is only updated when someone is physically in the office, so swaps between pupils go unrecorded; the spreadsheet is a copy, so it is wrong by half-term; and the school business manager only sees the write-off list in July, when the money is already gone.

3. **`s6-process-as-it-runs`** [business]
   The documented process: the pupil signs the loan book, a parent signs a consent slip, the instrument goes home. What actually happens: peripatetic teachers hand instruments over in the corridor with no signature because the office is locked; pupils swap cases when a string breaks; the consent slip comes back weeks later or never; and at the end of the year Priya walks every music room with a clipboard for a day and a half, reconciling the book against what is on the shelves.

4. **`s1-what-would-have-to-be-true`** [business]
   Peripatetic teachers would have to be able to record a handover in under thirty seconds on their own phone, or they will keep doing it in the corridor. Parents would have to see the instrument on their child's existing school record without logging into anything new. And Tom, the business manager, would have to get the write-off number monthly rather than in July. The first is the bet: we do not know that a visiting teacher paid by the hour will do it.

5. **`s2-riskiest-assumption`** [solution — expected structural orphan: no stakeholder decision exists yet]
   Three things have to be true: a handover can be recorded from a phone in a corridor, the school's existing parent app can show a read-only record, and Priya will trust the record over her clipboard. The riskiest is the first. The peripatetic teachers are not school staff, they are paid by the hour, and they have no reason to adopt anything. If they do not record handovers the register is wrong on day one and everything downstream is decoration. We will test it alone, with two teachers for two weeks, before building anything else.

6. **`s5-pain-budget-same-person`** [stakeholder — expected parent: a business seq]
   Three people, not one. The pain is Priya's, the music coordinator, who loses the two days and takes the blame for the losses. The budget is Tom's, the school business manager, who signs off the £4,200 write-off each year and has said he would sign off a tool under £1,500 a year. The person who must not be embarrassed is the head of department, who reports the losses to the governors every July. They are not the same person, and Tom has never seen the loan book.

7. **`s4-appetite`** [solution — expected parent: seq of answer 6]
   A small batch: two weeks of one developer, and the appetite is fixed before the scope. If the corridor handover cannot be built inside two weeks we ship the handover and the reconciliation list only, and the parent view waits for a later batch. We do not redesign the parent app; the record is a read-only page inside it.

8. **`s4-rabbit-holes`** [solution]
   New technical work we have never done: none, it is a list and a signature. An assumption about how the parts fit: that the parent app can embed a read-only page, which nobody has checked, so that is settled now — if it cannot, the parent gets a termly email instead. A design solution we could not come up with ourselves: no. A hard decision to settle in advance: a handover recorded by a peripatetic teacher counts without a pupil signature, and Priya can reverse it within seven days.

9. **`s4-out-of-bounds`** [solution]
   Out of bounds: no payments or fines through the tool, no instrument booking or timetabling, no condition photos, no integration with the county music service's own stock system, and no messaging between teachers and parents. If any of these is asked for mid-build it goes on a note for next term and does not change the scope.

10. **`s6-accountable-when-wrong`** [stakeholder — expected parent: a business seq]
    Today Priya is accountable for every loss because the loan book is hers, even when the handover happened in a corridor she never saw. The design changes that: the person who records the handover is named on the record, so a loss traces to the last recorded handover, and the head of department signs the termly loss report instead of Priya. That is a deliberate shift of accountability, and the head of department has agreed to it in writing.

11. **`s7-what-would-make-us-stop`** [solution or business]
    If by the end of the spring term fewer than 70% of handovers are recorded on the day they happen, the peripatetic teachers have not adopted it and we stop and go back to the paper book. The number is read from the tool's own timestamps against Priya's end-of-term count, so it is a result that can actually occur and be observed.

12. **`s8-eval`** [solution or business]
    There is no model in this product and we are not adding one, so there is no eval to own. If a model is ever proposed, for instance to flag likely losses, the eval set is the last three years of loan records with their known outcomes, Priya owns it, and it does not ship below 95% on that set.

---

## TESTING STRATEGY

No suite, no linter, no type-check (CLAUDE.md §Testing). "Done" = the gates below ran.

### Unit-level (build-checks, CI, SDK-free)

- **Group 29** — `parentCandidates` both branches and two junk throws; the correcting refusal with
  and without candidates; `auditParenting`'s three lists on applier-shaped records, including the
  moment-of-filing rule.
- **Group 30** — `PARENT_RULE` verbatim and instructive; `ledgerBrief` empty / three-rung / off-script;
  the brief in the turn prompt and absent from the system prompt; the recency line last; a build
  without `ledger` refused; `TOOL_DESCRIPTIONS` frozen and pinned; the fingerprint deterministic, moved
  by mutation of model / system prompt / template, blind to the bank; the transport pinned from source
  (ledger passed, one copy of the tool text, stamp read off the posture).
- **Group 32** — the audit proven to detect a miss BEFORE the fixture is trusted; the fixture
  re-folded through the real applier; all twelve turns stamped with the current fingerprint;
  `eligible ≥ 1`, `missed 0`, every parent in its candidate set; the projected hierarchy carrying a
  real `parent: seq` line.

### Integration-level (operator-run)

- `cd portal && node lib/discovery-transport.mjs --preflight` — zero tokens, 8 rows.
- `cd portal && node lib/discovery-transport.mjs --probe-parenting` — ONE paid turn; the first and the
  cheapest observation of the agent's choice; twice PARENTED before Phase 4.
- The Phase 4 run itself — twelve turns; the recording group 32 reads.
- `node discovery/prd-projection.mjs instrument-loans-1` — the ladder rendered from a real run.

### Edge Cases

- Turn 1: `ledger: []` → the brief says none / pass null; the agent files business with null.
- Position 5 (`s2-riskiest-assumption`) filed `solution` before any stakeholder decision → the brief
  says `filing at solution → parent_id null (no stakeholder decision yet)`; the audit lists it as
  `structural`; the projection marks `⚠ orphan`. Honest, and expected.
- A refusal mid-turn (agent names a sibling) → the message now names the candidate seqs; `MAX_TURNS = 6`
  leaves room for one correction; the `denied` line is kept.
- Superseded decision as a candidate — accepted by the applier, listed by the brief, same set.
- A decision with `question_id: null` (off-script) in the brief → `(off-script)`.
- Group 32 with the package absent → red BY NAME, never skipped.
- Group 32 with a hand-edited op line → the re-fold mismatch goes red naming the drift.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax

```bash
node --check discovery/ops.mjs && node --check portal/lib/discovery-postures.mjs && node --check portal/lib/discovery-transport.mjs && node --check tooling/build-checks.mjs
```

### Level 2: The pure gates (CI)

```bash
node tooling/build-checks.mjs            # after Phase 3: exactly ONE red — group 32 naming the missing package
                                         # after Phase 4: build ✓  all 32 groups pass
node tooling/drift-check.mjs             # ✓ (nothing generated changes; prd.md is outside drift-check by design)
```

### Level 3: The transport (zero tokens) and the probe (one paid turn)

```bash
cd portal && node lib/discovery-transport.mjs --preflight          # pre-flight ✓  all 8 rows pass
cd portal && node lib/discovery-transport.mjs --probe-parenting    # PARENTED, exit 0 — ~$0.05; twice before Phase 4
```

### Level 4: The oracle (local, never committed)

```bash
# the audit reproduces the rehearsal's numbers exactly — 18 eligible, 18 missed, structural [5]
node -e 'import("./discovery/ops.mjs").then(m=>{const fs=require("fs");const ops=fs.readFileSync((process.env.JOBS_DIR||process.env.HOME+"/Desktop/Linards_current/Linards jobs folder")+"/_discovery/my-product-name/transcript.jsonl","utf8").split("\n").filter(Boolean).map(JSON.parse).filter(l=>l.type==="op");console.log(JSON.stringify(m.auditParenting(ops)))})'
```

### Level 5: Manual

- Read the built turn prompt for a three-rung ledger (Task 7's one-liner) — it must read as a lookup
  table, not prose.
- After Phase 4: `sed -n '/## Requirement hierarchy/,/^## /p' discovery/instrument-loans-1/prd.md` —
  every non-structural decision names `parent: seq N`.
- `git status --short | grep -c _discovery` → `0`.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** — The Think turn prompt carries this run's decisions by rung and the parent candidates
      per rung (`ledgerBrief`), in the TURN prompt and not the system prompt; `buildThinkTurn` refuses
      a build without `ledger`. `PARENT_RULE` replaces the permissive paragraph, is exported and pinned
      verbatim by group 30, and instructs: one rung above · null only when nothing above · re-file on
      a refusal.
- [ ] **AC2** — The applier's wrong-rung refusal names this run's seqs at the required rung, or says
      there are none yet and to pass null. Group 29 drives both branches.
- [ ] **AC3** — `auditParenting(ops)` exists in `discovery/ops.mjs`, is pure, returns
      `{ eligible, missed, structural }` at the moment of filing, and reproduces the rehearsal's
      18 · 18 · [5] locally. Group 29 drives its three lists; group 32 proves it detects a miss before
      trusting the fixture.
- [ ] **AC4** — `discovery/instrument-loans-1/` is a committed real `opening-set` run recorded through
      the drawer with the pre-registered sheet, never hand-edited (proved by re-folding through the
      real applier), with `eligible ≥ 1` and `missed 0`, plus its generated `prd.md`.
- [ ] **AC5** — build-checks has 32 groups; group 32 fails BY NAME when the package is absent or a
      parent was missed; its ✓ line and `gates.md` state that it observes one recorded run.
- [ ] **AC6** — `discovery/README.md`, `.claude/references/gates.md`, `CLAUDE.md` and the build-checks
      header carry the change; no stale "31 groups" outside historical reports/plans.
- [ ] **AC7** — `POSTURES.think.fingerprint` covers the system prompt, the turn template and brief
      format, `TOOL_DESCRIPTIONS` and the model, is deterministic, moves under mutation of each (group
      30), never reads the bank, and is stamped on every `turnStats` entry; group 32 goes red by name
      when the fixture's stamps differ from the current fingerprint.
- [ ] **AC8** — `node lib/discovery-transport.mjs --probe-parenting` exists, spends one turn over a temp
      root it deletes, and reported PARENTED twice before the fixture was recorded (quoted in the report).
- [ ] Cause B untouched; `spine-meridian-1` untouched; nothing under `_discovery` committed; nothing
      on port 4747 killed.
- [ ] Plan, report and review in the same PR; PR body carries `Closes #341`.

---

## COMPLETION CHECKLIST

- [ ] Tasks 0–18 in order, each VALIDATE run
- [ ] Group 32 observed RED by name before the fixture existed (quoted in the report)
- [ ] Probe PARENTED twice in a row before the fixture was recorded (verdicts + cost quoted)
- [ ] The fixture's twelve `turnStats` stamps equal `POSTURES.think.fingerprint` (group 32 ✓ line quotes the prefix)
- [ ] `build ✓  all 32 groups pass` · `drift-check ✓` · pre-flight 8/8 (observed, named in the report)
- [ ] The oracle one-liner printed 18 · 18 · [5]
- [ ] Phase 4 attempts, cost and the decision rule's outcome recorded
- [ ] The disclosure paragraph (agent-written fictional answers) in the report
- [ ] `git status` clean of `_discovery`; only the listed paths staged

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — depth of the fixture: `opening-set` (12), not the issue's `scope-check` (6).** Proceeding on
this assumption. `scope-check` is `s4-appetite · s4-rabbit-holes · s4-out-of-bounds · s7-goals-signals-metrics · s7-kill-state-and-date · s7-what-would-make-us-stop`.
In both recorded runs the agent filed the Stage 4 trio as `solution` and the Stage 7 kill question as
`business`; nothing in those six elicits a `stakeholder` decision, so no `solution` decision could ever
have a valid parent and the assertion would be vacuous by construction — the check that cannot fail.
`opening-set` puts `s5-pain-budget-same-person` (stakeholder in the rehearsal) at position 6 and
`s6-accountable-when-wrong` (stakeholder) at 10, ahead of five solution-eligible questions. Cost
difference: ~$0.30. **Say if scope-check is wanted anyway; the fixture then proves only "no false
parent", not parenting.**

**Q2 — who drives the fixture run.** Default: the implementing agent through the real drawer with
`agent-browser` (#338 Phase A D1 precedent), pasting the pre-registered sheet. The owner may prefer to
paste by hand (twelve pastes, ~5 minutes of waiting). Either is honest; the report says which.

**A1 — the answers are agent-written fictional text**, pre-registered here and disclosed in the report
(#284 D3 precedent, and the rehearsal's own answers were written the same way at the owner's request).
The honesty rule forbids agent text *presented as* a human answer; the package label
`Real run — fictional scenario` and the report's disclosure keep the presentation true.

**A2 — the ledger brief does not change level choice**, only parenting. If Phase 4 shows the agent
filing everything `business` (eligible 0), that is a different finding and stops the run per the
decision rule.

**A3 — `MAX_TURNS = 6` is enough** for judge → file → one refusal → re-file. Unchanged. If Phase 4's
transcripts show a turn ending on a refusal with no re-file, raise it to 8 in the same PR and say why.

**A4 — group 32 is claimed as the next number.** No open PR appends a group today (observed). Renumber
on rebase if one lands first (epic rule).

**A5 — the fingerprint's price is accepted.** Every edit to the prompt surface — a comma in
`MVP6_LINE`, a reworded tool description, a model change — makes group 32 red until the fixture is
re-recorded (~$0.60, ~4 minutes). That is the honest cost of a recording that proves the prompt in the
tree, and the probe ($0.05) is the cheap first read before paying it. If the owner finds the cadence
too heavy, the fingerprint can be narrowed to `PARENT_RULE` + the brief format + `record_decision`'s
description; the plan recommends the whole surface, because the rehearsal's defect was not in the
parent paragraph alone but in what the agent could see.

**A6 — the probe's verdict on `s4-appetite` is conclusive when the level is non-business.** Both
recorded runs filed it `solution`; a `business` filing is INCONCLUSIVE and re-run once, never counted
as a pass or a fail.

## NOTES (open canvas)

**Why the brief is the fix and the prompt wording alone is not.** The ticket's cause A says the null
permission "is being read as standing permission". True, but the transcript shows something stronger:
the agent's model of the ledger was *wrong*, not lazy — it believed no stakeholder decision existed at
t7, t8 and t11 while seq 6 sat at `stakeholder`. No instruction fixes a belief the agent has no data
to correct. The brief hands it the data; `PARENT_RULE` tells it what to do with it; the refusal
repeats the candidates when it still slips. Three layers, one source (`parentCandidates`).

**Why `parentCandidates` lives in ops.mjs and not postures.** The refusal (ops.mjs) and the brief
(postures) must list the same seqs or the agent is corrected towards a set the brief did not show.
One function, two callers. ops.mjs stays import-free; postures already imports from it.

**Rejected: adding the level to the tool result** (`filed seq 6: record_decision at stakeholder`).
Cheap and harmless, but it creates a second, resumed-session view of the ledger beside the brief, and
the repo's rule is one record of one fact. If the brief ever proves insufficient, this is the next
cheapest lever.

**Rejected: a `Stop` hook refusing a null parent when candidates exist.** Mechanical enforcement of a
prompt promise — the architecture doc names it as spike 2's *fallback*, not its first move. It is the
pre-registered escalation if Phase 4's three attempts fail, not a change to make in advance of
evidence.

**Rejected: server-side `parent_id` when exactly one candidate exists.** It would make a correct
ladder without the agent ever choosing — and the epic's hypothesis is about what the agent judges.
Also the pre-registered escalation, not the first move.

**Rejected: reordering the bank** (cause B). One decision in thirty; the honest orphan is the right
record; #283 owns the depth lists.

**The risk register, and what closes each.**

| Risk | Before | Now |
|---|---|---|
| R1 — the agent still parents wrongly with the ledger in front of it | first observed in the $0.60 fixture run | first observed in a $0.05 probe (Task 8b), twice, before any fixture is recorded; the tool description and the recency line add two more places the instruction lands; iteration happens on the probe, the fixture confirms |
| R2 — a stale portal serves old code during the recording (#338 F2) | PID start-time forensics, killing a process a parallel session may own | a fresh `PORT=4748` process started after every edit; nothing on 4747 touched; the origin guard is parameterised so nothing else changes |
| R3 — group 32 observes one recording; a prompt regression stays green | stated as a limit | the fingerprint on every `turnStats` entry: any change to what the agent reads makes the fixture stale BY NAME in CI; the transport's ledger wiring is pinned from source; the probe is the one-turn re-observation. What remains is model drift under an unchanged prompt, and the ✓ line says so |
| R4 — the fixture is vacuous (no eligible decision) | — | `eligible ≥ 1` asserted; the sheet's q6 and q10 are stakeholder-shaped by construction; `opening-set` chosen over `scope-check` for exactly this |
| R5 — a hand-edited or applier-drifted op line passes | — | every committed op line re-folded through the real applier and compared record by record |

**The gate's honest limit, restated.** Group 32 observes a recording made under a named prompt
surface. What it cannot see is the model changing its behaviour under that same surface — a model
update, an SDK change in how tool results are presented. The probe is the cheap re-observation for
that, and `gates.md` lists it beside the other operator-run gates. A token-spending gate in CI is not
available (no SDK, no token) and would not be deterministic if it were.

**Cost and time (derived).** Rehearsal: $1.488 / 30 turns ≈ $0.05 per turn; median 10.1 s per turn.
Fixture: 12 turns ≈ $0.60 and ~2–4 minutes of agent time per attempt; three attempts ≈ $1.80 worst case.

**Data-flow sketch.**

```
transcript.jsonl ──fold (applyOps)──▶ state.current.ops ──┬──▶ ledgerBrief() ──▶ turn prompt ──▶ agent
                                                          │                                       │
                                                          └──▶ applyOp() refusal names             │ record_decision(parent_id)
                                                               parentCandidates() ◀───────────────┘
committed fixture ──readPackage──▶ ops ──▶ auditParenting() ──▶ group 32: eligible ≥ 1, missed 0
```

## AMENDMENTS

<!-- append-only; newest at the bottom -->
