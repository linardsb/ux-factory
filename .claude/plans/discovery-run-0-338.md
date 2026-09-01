# Feature: Run 0 — the owner's next real product, in the UI

> **THIS PLAN IS NOT EXECUTABLE BY AN AGENT ALONE. READ THIS BOX BEFORE ANYTHING ELSE.**
>
> The deliverable is a **real discovery session answered by the owner, in their own words, about
> their own unreleased product** — and a report on what it showed. The 30 answers are the
> measurement. An agent that writes them has fabricated the entire hypothesis test and destroyed
> the ticket's value, which is precisely what `discovery/README.md`'s honesty rules forbid: *"Never
> hand-write or hand-edit a transcript, an answer or an op — not one line."*
>
> Phase A is the agent's. **Phase B is the owner's and the agent does not touch the drawer, the
> textarea, or `answers.jsonl`.** Phase C is the agent's again, and it derives numbers from files
> and transcribes judgement the owner dictates. There is a hard stop between each.

## Feature Description

Epic #279's hypothesis names one success signal: the owner's *next real discovery session* starts in
the portal UI rather than the terminal, and reaches a generated PRD in one sitting. Nothing else in
the ticket graph produces that session — #291 is Faster Payment against a sealed scoring key, #292 is
the pre-grill fixture in audit mode. Both are pre-registered measurements against material that
already exists. This ticket is the session the hypothesis is actually waiting on.

It is deliberately **not** a measured run. There is no sealed key and no scoring fixture, so the
epic's one hard sequencing rule — *"the fence (#287) must be proved denying each run's key before that
run starts"* — does not bind it. The answerer is the person whose product it is.

Its second deliverable is the **judgement on the five deferred tickets** (#283, #285, #286, #287,
#289): for each, did running without it hurt, and where. Those five were deferred rather than built
on reasoning, and this run is the evidence that decides them.

## User Story

As the owner, starting my own next real product,
I want to hold the whole discovery session in the portal — the bank asking, the agent judging form,
the ops filing — and come out with a generated PRD,
So that the epic's hypothesis is answered by a real session rather than by a fixture, and the five
deferred tickets are decided by what the run showed rather than by argument.

## Problem Statement

The discovery half is built (#281 ops, #282 bank, #284 spine, #290 projection) and has never carried a
real product. Every artifact in `discovery/` is fictional (`spine-meridian-1`) or an in-memory gate
fixture. The epic's WRONG condition — *"the owner reaches for `/think` in the terminal for that next
real product anyway"* — is unmeasured, and so is the 30-question read that #284's spine could only
extrapolate from one question. The five deferred tickets are each a bet that their absence would not
hurt; none of those bets has been tested.

## Solution Statement

Run one real, unbranched `full-discovery` session in the portal's discovery drawer — `blank-idea`
entry, Think posture, `provenance: real` so the package lands in `<JOBS_DIR>/_discovery/<slug>/` and is
never committed — then project it to `prd.md` with `discovery/prd-projection.mjs --root <dir>`, and
write one report to `.claude/reports/discovery-run-0-338-report.md` carrying the AC3 verdict, the AC4
judgement on the five, and the AC5 numbers derived from named fields in the package.

The AC4 counters and the AC5 derivations are **pre-registered in this plan, before the sitting**, so
the judgement is a reading of the package rather than a recollection of the afternoon.

## Out of Scope / Non-Goals

- **Not building anything.** No code change is in scope. If the run shows the spine needs something,
  that is a report finding and a follow-up ticket, not an edit made mid-run.
- **Not adding a portal route for the projection.** #290 shipped CLI-only and its PR says so
  explicitly (*"no portal route or page reads the projection in this ticket"*). Adding one here
  would mean run 0 no longer measures the thing as built. See F1 in NOTES.
- **Not building any of the five deferred tickets.** Running without them *is* the measurement.
  #283 (branches), #285 (session rules), #286 (other postures), #287 (the read fence), #289 (the
  escape hatch) stay unbuilt for this run.
- **Not committing the package.** Provenance is `real` (R1). `run.json`, `answers.jsonl`,
  `transcript.jsonl` and `prd.md` never enter this repo. AC6.
- **Not a pre-registered run.** No sealed key, no scoring fixture, no fence proof beforehand.
- **Not a replacement for #291/#292.** Those still run on their own preconditions.
- **Not changing the terminal.** `~/.claude/skills/think/` is untouched (epic C1). It is the control.

## Feature Metadata

**Feature Type**: Operational run + report (no code change)
**Estimated Complexity**: Low mechanically, High in discipline — the failure mode is an agent
answering the questions, not a bug
**Primary Systems Affected**: `portal/` (run only, unchanged) · `discovery/prd-projection.mjs` (run
only, unchanged) · `<JOBS_DIR>/_discovery/<slug>/` (written, never committed) ·
`.claude/reports/` (one new file)
**Dependencies**: `@anthropic-ai/claude-agent-sdk` (already installed in `portal/`), an authenticated
Claude CLI login on this machine, a real product to scope

## Related Work

**Implements**: [#338](https://github.com/linardsb/ux-factory/issues/338) ·
**Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279) ·
`docs/epics/discovery-partner.prd.md` + `docs/epics/discovery-partner.architecture.md`

**Back-references**

- `.claude/plans/discovery-spine-run-package-284.md` — the session, the answer store, the transcript
  writer, the drawer. Precondition, merged (PR #339).
- `.claude/plans/discovery-prd-projection-290.md` — the run package → `prd.md` fold. Precondition,
  merged (PR #340).
- `.claude/plans/discovery-bank-282.md` — the 65-question bank and the depth selectors.
- `.claude/plans/discovery-ops-applier-281.md` — the four-verb grammar and the pure applier.

**Forward-references**

- (none yet — #291 and #292 are siblings on their own preconditions, not descendants of this)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE PHASE A

- `discovery/README.md` (whole file, ~16 KB) — Why: the format contract and the **honesty rules**.
  The three that bind this ticket: `answers.jsonl` is server-written only and verbatim;
  `transcript.jsonl` is append-only and never hand-edited; **R1 — provenance decides the root**, so
  `real` lands in `<JOBS_DIR>/_discovery/<slug>/` and is never committed.
- `portal/lib/discovery.mjs` (lines 1–40 header; `openSession` at 220; `sessionView` at 275;
  `recordTurnStats` at 267; `closeSession` at 254) — Why: the four invariants, the run.json shape
  every AC5 number comes from, and the derived cursor.
- `portal/lib/discovery-transport.mjs` (lines 60–130 the op server + descriptions; 167–228 the query
  options and the `result`-message stats capture; 235+ the zero-token preflight) — Why: the exact
  `turnStats` fields, and the fact that `tools: []` / `allowedTools: []` leave the agent with **no
  built-in tools at all** — which is the whole of the #287 and #289 judgements.
- `portal/lib/discovery-postures.mjs` (`SYSTEM`, `YIELD_CONTRACT`, `MVP6_LINE`, `LADDER_BRIEF`,
  `buildThinkTurn` at 82, `POSTURES` at 111) — Why: Think is the only posture; the weak-answer note
  goes to the agent and never to the browser.
- `discovery/bank.mjs` (`DEPTHS` at 732, `selectDepth` at 790) — Why: `full-discovery` is
  **30 questions, verified unique and non-null** (observed: `len 30 unique 30 nulls 0`).
- `discovery/ops.mjs` (the four verbs, R2, refuse-vs-flag, supersede) — Why: what a closing op is,
  and therefore what "answered" and "abandoned" mean at the op layer.
- `discovery/prd-projection.mjs` (header lines 1–55; CLI guard at 732) — Why: the CLI is
  `node discovery/prd-projection.mjs <slug>` for fictional, **`--root <dir>` for a real run**, plus
  `--stdout` and the `--force` refusal.
- `portal/public/index.html` (lines 145–208) and `portal/public/portal.js` (lines 674–830) — Why:
  the drawer's exact controls, so the operator steps below name real ids.
- `discovery/spine-meridian-1/` — Why: the only existing package; the shape to expect on disk.

### New Files to Create

- `.claude/reports/discovery-run-0-338-report.md` — the one committed artifact. AC3 verdict, AC4
  judgement on the five, AC5 numbers, AC6 attestation.
- `<JOBS_DIR>/_discovery/<slug>/` — the run package. **Written by the portal, never committed.**
  (`JOBS_DIR` observed: `/Users/Berzins/Desktop/Linards_current/Linards jobs folder`)

### Relevant Documentation

- `docs/epics/discovery-partner.prd.md` — §Hypothesis (the RIGHT/WRONG conditions AC3 answers),
  §MVP 5 (the depth ladder), §MVP 6 (the posture — form never substance), §MVP 7–9 (look it up, park
  it, the escape hatch — the three #289 defers), §Constraints C1–C3.
- `docs/epics/discovery-partner.architecture.md` — §Data model, §Boundaries & contracts.
- `CLAUDE.md` §Where new code goes → "New discovery op verb or run": *"A run is a REAL session through
  the portal's discovery drawer (#284) … neither is ever hand-written or hand-edited — a bad run is
  re-run. Provenance decides the root: fictional → `discovery/<slug>/`; real →
  `<JOBS_DIR>/_discovery/<slug>/`, never committed."*
- `.claude/references/gates.md` — what each gate can and cannot reach. No gate covers this ticket;
  the honesty attestation in Phase C is the substitute.

### Patterns to Follow

**Report shape** — mirror `.claude/reports/discovery-spine-run-package-284-report.md` and
`discovery-prd-projection-290-report.md`: observed-vs-derived labelling on every number, a
deviations list, and the validation table.

**Provenance labelling** — the honesty contract. Every number in the report says where it came from:
*observed* (read from a named file field), *derived* (show the arithmetic), *dictated* (the owner's
words, transcribed).

**Never claim a gate that did not run.** `tooling/build-checks.mjs` does not test a run package on
disk. Say so rather than implying coverage.

---

## IMPLEMENTATION PLAN

### Phase A — Prepare the mechanism (agent)

Prove the chain works end to end **before** the owner sits down, because a mid-sitting failure costs
the sitting. Nothing in this phase touches the owner's product.

**Tasks:** confirm the tree is on merged main · zero-token preflight · one real throwaway turn to
prove `costUsd` populates under CLI-login auth · prove the projection runs against a `real` root ·
delete the throwaway · pre-register the AC4/AC5 sheet.

### Phase B — The sitting (OWNER ONLY — HARD STOP)

**Depends on:** Phase A green.

The owner opens the drawer, starts the run, answers 30 questions, finishes. **The agent does not
type an answer, does not click a control, and does not touch any file under the run root.** If the
owner asks the agent something mid-sitting, the agent answers in chat and the exchange is noted for
the #289 counter — it does not become an answer.

### Phase C — Derive, judge, report (agent + owner dictation)

**Depends on:** Phase B finished (`run.json` has a non-null `endedAt`).

**Tasks:** project the PRD · derive the AC5 numbers from named fields · derive the AC4 counters ·
transcribe the owner's AC3 verdict and AC4 judgement in their words · run the three publication-safety
checks · write the report · open the PR.

**Independent of:** nothing. Strictly sequential — each phase reads the previous one's output.

---

## STEP-BY-STEP TASKS

### PHASE A — agent

### VERIFY the tree and pin `$JOBS_DIR`

- **IMPLEMENT**: confirm both preconditions are on the working tree, and **export `JOBS_DIR` in the
  shell**. `portal/lib/env.mjs` defaults it inside Node, but every command below uses it in bash where
  it is empty — an unexported `$JOBS_DIR` silently resolves paths to `/_discovery/...`.
- **VALIDATE**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  export JOBS_DIR="/Users/Berzins/Desktop/Linards_current/Linards jobs folder"   # observed 2026-08-30
  test -d "$JOBS_DIR" && echo "JOBS_DIR ok" || echo "JOBS_DIR WRONG — stop"
  git fetch origin && git log --oneline -1 origin/main
  git branch --show-current
  ls discovery/prd-projection.mjs portal/lib/discovery.mjs portal/lib/discovery-transport.mjs
  ```
- **GOTCHA**: the path contains a space. Quote `"$JOBS_DIR/..."` everywhere; an unquoted expansion
  splits into two arguments and fails in a way that reads like a missing directory.
- **GOTCHA**: PR #340 merged 2026-08-30; if the working branch is still `feat/290-prd-projection`,
  start run 0 from a fresh branch off `origin/main` (`git switch -c chore/338-run-0 origin/main`).
  Parallel sessions share this worktree — verify the branch immediately before any commit.
- **SATISFIES**: preconditions.

### PREFLIGHT the op transport (zero tokens, zero cost)

- **IMPLEMENT**: run the built-in preflight — it builds the real MCP server from the real schema over
  a temp root and calls the tools/list and tools/call handlers directly, with no `query()`, no model
  and no spend.
- **VALIDATE**:
  ```bash
  cd portal && npm install && node lib/discovery-transport.mjs --preflight; echo "exit=$?"
  ```
- **GOTCHA**: run from `portal/`, not the repo root — the usage line says so.
- **SATISFIES**: AC1 (the mechanism is sound before the sitting).

### START the portal and confirm the drawer

- **IMPLEMENT**: boot the local workbench and confirm `/api/discovery/config` answers with the
  depths, provenances and postures the drawer renders.
- **VALIDATE**:
  ```bash
  cd portal && npm start &            # http://localhost:4747
  curl -s localhost:4747/api/health
  curl -s localhost:4747/api/discovery/config | head -c 600
  ```
- **GOTCHA**: `HAS_TOKEN` is **false** (observed — `portal/.env` carries no
  `CLAUDE_CODE_OAUTH_TOKEN`), so the drawer prints an advisory token line. It is **advisory only**,
  not a gate: the SDK authenticates via the Mac CLI login. The next task is what proves that.
- **SATISFIES**: AC1.

### REHEARSE one real turn, labelled and thrown away

- **IMPLEMENT**: in the drawer, start a run with slug **`preflight-throwaway-338`**, provenance
  **`real`**, depth **`scope-check`**, posture **Think**. Answer **one** question with obvious
  mechanism-stub text (e.g. *"mechanism rehearsal for #338 — not a real answer"*). Finish.
  Provenance `real` keeps it out of the repo, so there is no cleanup to forget.
- **PATTERN**: the same click path Phase B uses, at 1/30 the cost.
- **VALIDATE**:
  ```bash
  D="$JOBS_DIR/_discovery/preflight-throwaway-338"    # default: ".../Linards jobs folder/_discovery/..."
  cat "$D/run.json" | python3 -m json.tool | sed -n '1,40p'
  node -e 'const r=require(process.argv[1]);const s=r.turnStats||[];console.log("turnStats",s.length,JSON.stringify(s[0]))' "$D/run.json"
  ```
  **Look for**: `turnStats[0].costUsd` and `.durationMs` **non-null**, `ok: true`.
- **GOTCHA — pre-registered fallback**: if `costUsd` comes back `null` under CLI-login auth, AC5's
  cost number is unavailable. Do **not** stop the run for it. Report the four token counts
  (`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheCreationTokens`) instead and record
  "cost unavailable under CLI-login auth" as a named report finding. Decide this **now**, not
  after the sitting.
- **SATISFIES**: AC5 (proves the numbers will exist).

### PROVE the projection runs against a real root

- **IMPLEMENT**: run the fold over the throwaway package via `--root`, to `--stdout` so nothing is
  written.
- **VALIDATE**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  node discovery/prd-projection.mjs --root "$JOBS_DIR/_discovery/preflight-throwaway-338" --stdout | head -40
  ```
- **GOTCHA**: a **real** package needs `--root <dir>`; the bare `<slug>` form resolves only to
  `discovery/<slug>/` in the repo. Getting this wrong at the end of a 30-question sitting is the
  avoidable failure this task exists to prevent.
- **SATISFIES**: AC2.

### SMOKE-TEST the AC5 derivation script

- **IMPLEMENT**: run Phase C's derivation script against `discovery/spine-meridian-1/` — a package
  with a known oracle — so the script is proven before it is needed at the end of a 30-question
  sitting. It is fictional, so pass the path directly rather than `--root`.
- **VALIDATE**: paste the script from Phase C's DERIVE THE AC5 NUMBERS task, with the path
  `discovery/spine-meridian-1`. **Expect exactly**: `answered_decision: 2`, `weak_flagged: 1`,
  `flagged_orphan: 2`, `denied_lines: 1`, `banked_turns_closed: 3`, `sdk_num_turns_total: 7`,
  `cost_usd_total: 0.1011`. Anything else means the script or the package shape changed.
- **GOTCHA**: `banked_turns_closed: 3` against `sdk_num_turns_total: 7` on a three-question package is
  the conflation trap made visible. If the two ever come back equal, one of them is being read wrong.
- **SATISFIES**: AC5.

### DELETE the throwaway

- **IMPLEMENT**: remove the rehearsal package so it can never be mistaken for run 0.
- **VALIDATE**:
  ```bash
  rm -rf "$JOBS_DIR/_discovery/preflight-throwaway-338"
  ls "$JOBS_DIR/_discovery/" 2>/dev/null    # empty, or holds no 338 rehearsal
  ```
- **SATISFIES**: AC6 (nothing ambiguous on disk).

### PRE-REGISTER the AC4 and AC5 sheet

- **IMPLEMENT**: copy the two tables below (§PRE-REGISTERED READINGS) into a scratch file, or leave
  them here and read them in Phase C. **They are fixed before the sitting.** A counter invented
  after the run is opinion wearing a number.
- **VALIDATE**: the sheet names, for every AC5 figure, the file and field it is read from; and for
  every AC4 ticket, what observation would count as "it hurt".
- **SATISFIES**: AC4, AC5.

---

### PHASE B — OWNER ONLY. THE AGENT STOPS HERE.

### RUN the session

The owner, at `http://localhost:4747`:

1. Click **Discovery** (`#btn-discovery`).
2. **Run slug** (`#discovery-slug`) — the operator's choice, `^[a-z0-9-]{1,48}$`. It names the
   package directory and `traces/` is a flat namespace, so make it globally unique.
3. **Provenance** (`#discovery-provenance`) → **`real`**. The note under it must read *"the package
   is written to the jobs folder"*. If it says `discovery/<slug>/`, stop — that is `fictional` and
   would commit the owner's product into a public repo.
4. **Depth** (`#discovery-depth`) → **Full discovery** (30 questions).
5. **Posture** (`#discovery-posture`) → **Think** (the only one; #286 is deferred).
6. **Start or resume** (`#discovery-open`).
7. Answer each question in `#discovery-answer`, **Submit answer** (`#discovery-submit`). The agent
   judges the answer against that question's weak-answer note, pushes back at most once, files at
   most one closing op, and yields. Watch `#discovery-recorded` for what was filed.
8. Repeat to 30. A reload loses nothing — disk is authoritative and the cursor is derived.
9. **Finish** (`#discovery-finish`) — this writes `endedAt` and is what makes the wall-clock number
   exist. **Do not close the drawer without pressing it.**

**While answering, keep a running note of five things** (these are the AC4 evidence and they are not
recoverable from the package):

- **#283** — any question that read as wrong for this product type; any quality attribute
  (performance budget, availability, accessibility target, security boundary) you wanted to record
  and had no question for.
- **#285** — any moment the depth felt wrong (too deep, too shallow) and you wanted to change it.
- **#286** — any moment you wanted Create PRD or Grill instead of Think.
- **#287** — any moment you wanted the agent to look something up.
- **#289** — any moment you could not answer and wanted to park it; any URL you wanted filed as
  evidence; anything off-script you wanted to say and had no input for.

**Also note the AC3 fact honestly**: did you start here, or did you open a terminal first? A WRONG
verdict is a finding, not a failure — the epic says so, and recording it accurately is the entire
value of this run.

---

### PHASE C — agent, with owner dictation

### PROJECT the PRD

- **IMPLEMENT**: fold the transcript into `prd.md` inside the run root.
- **VALIDATE**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  R="$JOBS_DIR/_discovery/<slug>"
  node discovery/prd-projection.mjs --root "$R" --stdout | head -60     # eyeball first
  node discovery/prd-projection.mjs --root "$R"                          # then write
  wc -l "$R/prd.md"
  ```
- **GOTCHA**: `writePrd` **refuses to overwrite** an existing `prd.md` without `--force`, and
  `--force` discards hand edits. Write once, before the owner edits it.
- **SATISFIES**: AC2.

### DERIVE the AC5 numbers

- **IMPLEMENT**: read every figure from the named field. Nothing is estimated.
- **VALIDATE**: run this and paste the output into the report as *observed*. **This exact script was
  run against `discovery/spine-meridian-1/` on 2026-08-30 and reproduced PR #340's manual-check oracle
  (`solution 2 · orphans 2`) exactly** — so a failure here is the package, not the script:
  ```bash
  node - "$JOBS_DIR/_discovery/<slug>" <<'EOF'
  const fs=require('fs'),p=require('path');const R=process.argv[2];
  const run=JSON.parse(fs.readFileSync(p.join(R,'run.json'),'utf8'));
  const jl=f=>fs.readFileSync(p.join(R,f),'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
  const ans=jl('answers.jsonl'), tx=jl('transcript.jsonl');
  const ops=tx.filter(l=>l.type==='op'), closers=ops.filter(o=>o.closes);
  const by=v=>closers.filter(o=>o.op===v).length;
  const st=run.turnStats||[], ms=st.map(s=>s.durationMs).filter(n=>n!=null).sort((a,b)=>a-b);
  const sum=a=>a.reduce((x,y)=>x+y,0);
  const costs=st.map(s=>s.costUsd).filter(n=>n!=null);
  const TOTAL=30;   // selectDepth('full-discovery').length
  console.log(JSON.stringify({
    answers: ans.length,
    depth_total: TOTAL,
    banked_turns_closed: closers.length,
    unreached: TOTAL - closers.length,
    answered_decision: by('record_decision'),
    weak_flagged: by('flag_weak_answer'),
    abandoned_open_question: by('open_question'),
    evidence_filed: ops.filter(o=>o.op==='file_evidence').length,
    off_script_ops: ops.filter(o=>o.params&&o.params.off_script===true).length,
    flagged_no_evidence: ops.filter(o=>(o.flagged||[]).includes('no-evidence')).length,
    flagged_orphan: ops.filter(o=>(o.flagged||[]).includes('orphan')).length,
    denied_lines: tx.filter(l=>l.type==='denied').length,
    text_lines: tx.filter(l=>l.type==='text').length,
    sdk_num_turns_total: sum(st.map(s=>s.numTurns||0)),
    latency_ms: {min:ms[0], median:ms[(ms.length-1)>>1], max:ms[ms.length-1], total:sum(ms)},
    cost_usd_total: costs.length===st.length ? Number(sum(costs).toFixed(4)) : null,
    cost_usd_missing_turns: st.length-costs.length,
    tokens: {in:sum(st.map(s=>s.inputTokens||0)), out:sum(st.map(s=>s.outputTokens||0)),
             cache_read:sum(st.map(s=>s.cacheReadTokens||0)), cache_create:sum(st.map(s=>s.cacheCreationTokens||0))},
    startedAt: run.startedAt, endedAt: run.endedAt,
    wallclock_min: run.endedAt ? Math.round((Date.parse(run.endedAt)-Date.parse(run.startedAt))/60000) : null,
  },null,2));
  EOF
  ```
- **FIELD SHAPES** (observed from `discovery/spine-meridian-1/transcript.jsonl`, 2026-08-30): `seq`,
  `closes`, `flagged`, `supersedes` and `turn` are **top-level** on an `op` line; `off_script`,
  `question_id`, `evidence_refs` and `wrong_if` are **inside `params`**. The script reads them there.
- **GOTCHA — two different turn numbers, never conflate them.** `banked_turns_closed` (max 30) is
  the person's questions. `sdk_num_turns_total` is the model's internal turns across all sittings.
  Report both, labelled.
- **GOTCHA — wall-clock includes the owner's thinking time between questions.** That is the honest
  "one sitting" number and the report says so; `latency_ms.total` is the agent's share of it.
- **SATISFIES**: AC5.

### DERIVE the AC4 counters

- **IMPLEMENT**: fill §PRE-REGISTERED READINGS table 2 from the package, then pair each machine
  counter with the owner's dictated note from Phase B.
- **VALIDATE**: every one of the five tickets gets a verdict — **hurt / did not hurt / no evidence
  either way** — and "no evidence either way" is an allowed and honest answer.
- **SATISFIES**: AC4.

### TRANSCRIBE the AC3 verdict

- **IMPLEMENT**: ask the owner directly, and write **their words**, not a paraphrase: did this
  session start in the UI, or was `/think` reached for anyway?
- **GOTCHA**: this is the hypothesis. A hedged or agent-authored sentence here voids the run's
  purpose. If the answer is WRONG, record WRONG.
- **SATISFIES**: AC3.

### RUN the three publication-safety checks

- **IMPLEMENT**: the repo is public and the product is unreleased. Prove the report leaks nothing.
- **VALIDATE**:
  ```bash
  cd /Users/Berzins/Desktop/Linards_current/ux-factory
  # 1. nothing from the package is staged or present in the repo
  git status --short | grep -E "^..(discovery/|.*_discovery)" && echo "LEAK" || echo "clean"
  ls discovery/            # bank.mjs ops.mjs prd-projection.mjs README.md spine-meridian-1 — nothing new

  # 2. no verbatim answer span reaches the report
  node - "$JOBS_DIR/_discovery/<slug>" .claude/reports/discovery-run-0-338-report.md <<'EOF'
  const fs=require('fs'),p=require('path');const [R,REP]=process.argv.slice(2);
  const rep=fs.readFileSync(REP,'utf8');
  const ans=fs.readFileSync(p.join(R,'answers.jsonl'),'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
  let hits=0;
  for(const a of ans){const w=(a.text||'').split(/\s+/);
    for(let i=0;i+8<=w.length;i++){const s=w.slice(i,i+8).join(' ');
      if(s.length>25&&rep.includes(s)){console.log('LEAK',a.ref,JSON.stringify(s));hits++;break;}}}
  console.log(hits?`${hits} answer(s) leak verbatim`:'no verbatim answer span in the report');
  EOF

  # 3. the owner names what the report may say about the product
  ```
- **GOTCHA**: check 3 is a **human sign-off, not a command**. Before writing the report, ask the
  owner one question: *may the report name the product, its domain, both, or neither?* Default to
  **neither** — the report can carry every number and the whole judgement while calling it "the
  product". Nothing in AC1–AC5 needs the name.
- **SATISFIES**: AC6.

### WRITE the report

- **IMPLEMENT**: `.claude/reports/discovery-run-0-338-report.md`. Sections in this order:
  1. **What ran** — slug, depth, posture, entry mode, provenance, model, date. No product name
     unless the owner signed it off.
  2. **AC3 — the hypothesis, answered** — the owner's own words, quoted. RIGHT or WRONG, stated
     plainly in the first line.
  3. **AC4 — the judgement on the five** — one subsection per ticket: the pre-registered counter,
     its value, the owner's note, the verdict.
  4. **AC5 — the numbers** — the derivation script's output, labelled *observed* / *derived*, with
     the two turn numbers distinguished and the wall-clock caveat stated.
  5. **Findings** — F1 (the projection is CLI-only) and anything the run surfaced. Each marked
     *re-scope* (belongs on #279 as an amendment) or *follow-up ticket*.
  6. **AC6 attestation** — the three checks and their results.
- **PATTERN**: `.claude/reports/discovery-spine-run-package-284-report.md`.
- **GOTCHA**: house style — British English, sentence case, no emoji, no AI slop
  (`~/.claude/skills/_shared/slop-blacklist.md`; epic C2), no job titles (epic C3).
- **SATISFIES**: AC3, AC4, AC5, AC6.

### OPEN the PR

- **IMPLEMENT**: branch, commit the plan + report + this plan's HTML brief, push, open the PR.
- **VALIDATE**:
  ```bash
  git branch --show-current                       # a 338 branch, not another session's
  git add .claude/plans/discovery-run-0-338.md .claude/plans/discovery-run-0-338.html \
          .claude/reports/discovery-run-0-338-report.md
  git status --short                               # exactly those three paths
  ```
- **GOTCHA**: the PR body **must** carry a `Closes #338` trailer — a title mentioning `(#338)`
  closes nothing. Stage by explicit path; parallel sessions share this worktree.
- **SATISFIES**: the ticket's close.

---

## PRE-REGISTERED READINGS

**Fixed before the sitting. Do not add a counter afterwards.**

### Table 1 — AC5, every number and the field it comes from

| Number | Source | Kind |
|---|---|---|
| Questions in the depth | `selectDepth('full-discovery').length` = **30** (observed 2026-08-30) | observed |
| Answers stored | `answers.jsonl` line count | observed |
| Banked-question turns closed | `transcript.jsonl` `op` lines with `closes: true` | observed |
| — answered (decision filed) | of those, `op === 'record_decision'` | derived |
| — weak-flagged | of those, `op === 'flag_weak_answer'` | derived |
| — **abandoned** | of those, `op === 'open_question'` (`source: 'banked'`) | derived |
| — **unreached** | `30 − banked_turns_closed` — questions the sitting never got to. **Distinct from abandoned**: a session that stops at 22 reports 8 unreached and 0 abandoned, and reporting only the latter would make a short sitting look cleaner than it was | derived |
| Evidence filed | `op === 'file_evidence'` (never closes) | observed |
| Decisions with no evidence | `flagged` contains `no-evidence` | observed |
| Orphan decisions | `flagged` contains `orphan` | observed |
| Denied tool calls | `transcript.jsonl` lines with `type: 'denied'` | observed |
| SDK turns (model-internal) | `Σ run.json turnStats[].numTurns` | derived |
| Per-turn latency | `run.json turnStats[].durationMs` — min / median / max / Σ | derived |
| Total cost | `Σ run.json turnStats[].costUsd`; **null in any turn ⇒ report tokens instead** | derived |
| Tokens | `Σ turnStats[].{input,output,cacheRead,cacheCreation}Tokens` | derived |
| Wall-clock | `endedAt − startedAt` — **includes the owner's thinking time**; state it | derived |

### Table 2 — AC4, what would count as "it hurt"

| Ticket | Machine counter (from the package) | Owner's note (from Phase B) | Verdict |
|---|---|---|---|
| **#283** bank width | Questions asking for a quality attribute: **structurally 0** — the non-functional block is #283's and is not in `bank.mjs`. Also: `off_script` ops as a proxy for wanting one. | Questions that read wrong for this product type; quality attributes wanted with no question for them | hurt / did not / no evidence |
| **#285** session rules | `flag_weak_answer` count; longest run of consecutive closed turns with no `record_decision` (the PRD's "not a form" counter); repeat weak flags on one `question_id` | Any moment the depth felt wrong and a step up or down was wanted | hurt / did not / no evidence |
| **#286** postures | Think is the only posture — 0 alternatives available by construction | Any moment Create PRD or Grill was wanted mid-session; whether `blank-idea` framing held for 30 questions | hurt / did not / no evidence |
| **#287** the read fence | `denied` line count. **Expect 0** — `tools: []` + `allowedTools: []` leave nothing to deny, so the fence has no work in this run | Any moment the agent was wanted to check something | hurt / did not / no evidence |
| **#289** look it up / park it / escape hatch | `open_question` op count (the verb exists and the agent can choose it, but **the drawer has no park button** — `#discovery-answer` is the only input); `file_evidence` count | Moments unanswerable with no route to park; URLs wanted in the ledger; off-script things with no input | hurt / did not / no evidence |

---

## TESTING STRATEGY

There is no suite here and none should be invented. The run *is* the test. What replaces a test
suite is the pre-registration above plus three checks that can actually fail:

### The mechanism check (Phase A)
`--preflight` exercises the real tool schema at zero cost; the one throwaway turn proves the SDK
authenticates and populates `turnStats`; `--stdout --root` proves the projection reads a real root.
Each has a named failure and a named fallback.

### The honesty check (Phase C)
The verbatim-span scan is the one check that can catch the report leaking the owner's product. It
compares every 8-word window of every answer against the finished report, and it fails loudly.

### Edge cases

- **The session is interrupted.** Disk is authoritative and the cursor is derived — reopen the same
  slug and it resumes. Do not start a second slug.
- **A turn does not close.** The agent yielded without filing; the cursor stays and the next submit
  re-uses the same question on the same turn id. This is legal under R2 and is not a bug.
- **`costUsd` is null.** Pre-registered fallback: report the token counts, name the cause, do not
  stop.
- **`endedAt` is null.** Finish was never pressed; the wall-clock number does not exist. Say so
  rather than computing from file mtimes.
- **The owner cannot answer a question.** There is no park button (#289 deferred). Answering
  honestly that it is unanswerable is what gives the agent a route to `open_question` — and that
  friction is exactly the #289 evidence.
- **The run reveals the bank asks the wrong questions, or the op grammar cannot express something.**
  That is a **re-scope finding** and belongs on #279 as an amendment (the ticket's own Notes say
  so) — not a code change in this PR.

---

## VALIDATION COMMANDS

### Level 1 — mechanism (Phase A, before the sitting)
```bash
cd portal && npm install && node lib/discovery-transport.mjs --preflight; echo "exit=$?"
cd portal && npm start &
curl -s localhost:4747/api/health
curl -s localhost:4747/api/discovery/config | head -c 400
```

### Level 2 — the throwaway turn (Phase A)
```bash
node -e 'const r=require(process.argv[1]);const s=r.turnStats||[];console.log(s.length,JSON.stringify(s[0]))' \
  "$JOBS_DIR/_discovery/preflight-throwaway-338/run.json"
node discovery/prd-projection.mjs --root "$JOBS_DIR/_discovery/preflight-throwaway-338" --stdout | head -20
rm -rf "$JOBS_DIR/_discovery/preflight-throwaway-338"
```

### Level 3 — the run package (Phase C)
```bash
R="$JOBS_DIR/_discovery/<slug>"
test -s "$R/run.json" && test -s "$R/answers.jsonl" && test -s "$R/transcript.jsonl" && echo "package ok"
node -e 'const r=require(process.argv[1]);console.log({depth:r.depth,posture:r.posture,entryMode:r.entryMode,provenance:r.provenance,branch:r.branch,frontEnd:r.frontEnd,startedAt:r.startedAt,endedAt:r.endedAt})' "$R/run.json"
node discovery/prd-projection.mjs --root "$R" && wc -l "$R/prd.md"
```
Expect: `depth: "full-discovery"`, `posture: "think"`, `entryMode: "blank-idea"`,
`provenance: "real"`, `branch: null`, `frontEnd: "portal"`, `endedAt` non-null.

### Level 4 — publication safety (Phase C, blocking)
The three checks in the RUN THE THREE PUBLICATION-SAFETY CHECKS task. All three must pass before the
report is committed.

### Level 5 — the repo is unharmed
```bash
node tooling/build-checks.mjs | tail -3     # expect: all 31 groups pass
node tooling/drift-check.mjs                # expect: green
git status --short                          # expect: only the three .claude/ paths
```
No code changed, so both should be green untouched. Running them proves the run left no residue.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** A real discovery session, started and finished in the portal UI, on the owner's own
      next product. Depth `full-discovery`, unbranched (`branch: null`), `blank-idea` entry, Think
      posture. **Verified from `run.json`, not from memory.**
- [ ] **AC2** The session ends in a generated `prd.md` in one sitting — #290's fold, run with
      `--root` against the real package.
- [ ] **AC3** The hypothesis answered in the owner's own words, quoted: did this session start in
      the UI, or was `/think` reached for anyway? Recorded either way; WRONG is a finding.
- [ ] **AC4** A verdict on each of #283, #285, #286, #287, #289 — hurt / did not hurt / no evidence
      either way — each pairing its pre-registered counter with the owner's note.
- [ ] **AC5** Questions answered, abandoned, banked turns, SDK turns, per-turn latency, total cost
      (or the token fallback), wall-clock. Every figure naming its source field.
- [ ] **AC6** Nothing from the package is committed. `git status --short` clean of `discovery/` and
      any `_discovery` path; the verbatim-span scan finds nothing; the owner has signed off on what
      the report may name.
- [ ] The report exists at `.claude/reports/discovery-run-0-338-report.md`.
- [ ] The PR body carries `Closes #338`.

---

## COMPLETION CHECKLIST

- [ ] Phase A green — preflight passed, one throwaway turn proved `turnStats`, `--root --stdout`
      proved the projection, throwaway deleted
- [ ] The AC4/AC5 sheet was fixed **before** the sitting
- [ ] The owner ran the sitting; the agent typed no answer and touched no package file
- [ ] Finish was pressed — `endedAt` is non-null
- [ ] `prd.md` generated with `--root`, once, without `--force`
- [ ] AC5 numbers derived by the script, pasted as observed
- [ ] AC4 verdicts recorded for all five, "no evidence either way" allowed
- [ ] AC3 verdict in the owner's own quoted words
- [ ] All three publication-safety checks pass
- [ ] `build-checks` 31/31 and `drift-check` green
- [ ] Report written in house style; PR opened with `Closes #338`

---

## OPEN QUESTIONS / ASSUMPTIONS

**A1 — The product is the operator's input.** This plan does not name it and does not need to. The
protocol is identical whatever it is. The slug is the owner's choice, `^[a-z0-9-]{1,48}$`, globally
unique.

**A2 — The report names nothing about the product by default.** Every AC is satisfiable while
calling it "the product". Q1 below is the sign-off that can widen this; the default if unanswered is
the narrow one.

**A3 — CLI-login auth populates `turnStats`.** `HAS_TOKEN` is false (observed), so the SDK
authenticates via the Mac CLI login. **Partly observed already**: `spine-meridian-1` was recorded on
2026-08-29 on this machine with non-null `costUsd` on all three turns, so the mechanism has worked
here before. Phase A's throwaway turn re-confirms it *today* — auth can lapse — and the token fallback
stays pre-registered.

**A4 — One sitting means one calendar sitting, interruptions allowed.** Disk is authoritative and
sessions resume, so a break does not void AC2. The report states the wall-clock span honestly and
notes any break rather than pretending to continuous time.

**A5 — Running the projection from the CLI does not break AC1.** AC1 governs the *session*; AC2
names #290's fold, whose only interface is the CLI. See F1.

**Q1 — for the owner, before the report is written: may the report name the product, its domain,
both, or neither?** Default: neither.

**Q2 — not an open option. Run 30 regardless.** AC1 pins `full-discovery`, so the depth is not a
choice at the sitting. If 30 turns out to be the wrong depth for this product, **that is the finding**
— a #285 observation of the first order — and it gets recorded in the note, not corrected by switching
to `opening-set` mid-run. Changing the depth would void AC1 and leave the run measuring nothing.

---

## NOTES (open canvas)

### F1 — the projection is CLI-only, and that is a finding rather than a defect

AC1 wants the session started and finished in the UI. AC2 wants a generated `prd.md`. #290 shipped
the fold **CLI-only**, and its PR says so in as many words: *"no portal route or page reads the
projection in this ticket."* So the honest description of the chain is: the *session* is entirely in
the UI, and one command afterwards produces the PRD.

Two ways to read this, and the plan takes the first:

1. **Take the plain reading.** AC1 is about the session; the drawer does open → answer → finish.
   One command after it is not "the owner reached for the terminal instead". Log
   *"a UI-only operator cannot get their PRD"* as a named report finding and a candidate follow-up
   ticket.
2. **Build a portal route first.** Rejected. The ticket is a run ticket with no code in scope, and
   adding a route means run 0 measures a thing that did not exist when the epic's other runs were
   planned. It also violates the epic's own logic: the run is supposed to reveal what is missing,
   not have the gap patched before it can be observed.

The finding is genuinely useful. The epic's secondary user — an invited guest with no terminal —
cannot complete the workflow at all today. That is a real gap in the guest epic's preconditions and
run 0 is the first place it becomes visible rather than theoretical.

### Why the AC4 counters are pre-registered

AC4 is the ticket's second deliverable and the one most likely to come out as an opinion formed
after a long afternoon. Five tickets were deferred *on reasoning*; deciding them on a recollection
of the same afternoon would be the same mistake twice. Fixing the counters beforehand means the
judgement is a reading of a package, and where the package says nothing, "no evidence either way" is
an available and honest verdict — which is itself the finding that the deferral was safe.

### The one number most likely to be misreported

`numTurns`. The SDK's `result` message reports the *model's* internal turns for that one exchange;
the person's turns are closed banked-question turns, capped at 30. They are different numbers with
similar names, and conflating them would report "the session took 47 turns" when the person answered
30 questions. The derivation script emits both under distinct keys for exactly this reason.

### What no gate here can reach

`tooling/build-checks.mjs` groups 29–31 drive `ops.mjs`, `bank.mjs` and `prd-projection.mjs` over
in-memory fixtures. **Nothing in the gate stack reads a run package on disk**, by design — group 31's
fixture is inline precisely because `discovery/README.md` forbids a hand-written package and a
directory on disk could be mistaken for a real one. So no gate can tell you this run happened, that
it was answered by a human, or that the report is honest about it. The three publication-safety
checks and the pre-registration are what stand in for a gate, and the report should say that in
plain words rather than listing 31 green groups as if they covered it.

### Cost expectation, and why it is not a plan input

30 turns of `claude-sonnet-5` with a small system prompt and one answer each, resumed on one session
id so the context accumulates. **Observed anchor** (`discovery/spine-meridian-1/run.json`, 3 turns, 2026-08-29): `$0.1011` total,
~`$0.034` per turn, with `cache_read` climbing 5,472 → 16,631 across the three. Extrapolating that
curve, **expect roughly $1.50–3.00** for 30 turns. The real figure is AC5's job and there is no budget
to defend here. It is stated only so a wildly different number in Phase A's
throwaway is recognisable as a signal rather than accepted quietly.

---

## AMENDMENTS

_(empty at creation)_
