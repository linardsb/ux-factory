# Feature: a committed existing-prd run package — the audit mode gets a fixture (#376)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing.

Pay special attention to the names of existing helpers and constants. Every **module symbol** this plan's
gate work needs is already imported into `tooling/build-checks.mjs` — see §Patterns to follow. That
covers imports only. The one-line helpers (`threw`, `same`, `keys`) are **block-scoped and re-declared
inside each group's own block** — `keys` exists once, at `tooling/build-checks.mjs:6040`, inside group
30's block, and is invisible to a new block after group 34. Group 35 declares its own.

## Feature Description

Every committed run package under `discovery/` is `entryMode: "blank-idea"`. #286 landed the
existing-PRD audit mode — a document supplied at session start, stored once as the run's one
`kind: "document"` answer line, judged against one banked question per turn under Grill — and #288
landed the drawer surfaces that render it. Neither has a committed package behind it.

This ticket records **one real Grill audit through the portal's discovery drawer over a
purpose-authored fictional PRD**, commits it as `discovery/kiln-hours-1/`, and adds the gate work that
package makes possible: a new `build-checks` group 35 over it, and a two-line widening of case 28.10's
committed cross-reader block so it folds a package that actually carries `flag_weak_answer` and
`open_question` ops.

**The run is the deliverable, and it cannot be hand-written.** `answers.jsonl` is server-written and
verbatim, `transcript.jsonl` is append-only, and neither is ever hand-written or hand-edited
(`CLAUDE.md`, `discovery/README.md` §Honesty rules). A bad run is fixed by re-authoring the document
or tightening one prompt constant and re-running — never by an edit.

## User Story

As the operator of the discovery half
I want one real audit run committed as a fixture
So that the gate can read what the Grill audit prompt actually produces against a real document, and
the two verbs no committed package has ever carried stop being compared zero-against-zero.

## Problem Statement

Three things have no committed evidence behind them, and a fourth has never been run at all.

1. **Case 28.10's committed cross-reader block folds one package, `instrument-loans-1`, whose ledger is
   `record_decision 12 · flag_weak_answer 0 · open_question 0 · file_evidence 3`.** Two of its four
   per-verb assertions compare zero against zero. `ledgerView` could stop counting either verb and that
   block would stay green.
   *(Observed: `node discovery/prd-projection.mjs instrument-loans-1 --stdout | grep '^\*\*Ledger\*\*'`.)*
   **What this is not**: a claim that the build stays green. Group 29's own synthetic happy-fold case
   (`tooling/build-checks.mjs:5892`, iterating `DISCOVERY_OPS` against records the applier built from a
   `weak()` op) already reddens on that mutation, with `28.10: counts.flag_weak_answer is 0, the ledger
   holds 1`. The gap is narrower and it is real: the **committed-package cross-reader path** — the one
   that compares `ledgerView` against `prd-projection`'s rendered Ledger line on ops a session actually
   recorded — cannot see the mutation on either verb, and that is the half this ticket buys.
2. **Group 31's document-kind row (31.14) is driven from an inline hand-authored fixture**, never from
   a real recording. That fixture is correct and must be **kept** — see the Non-goals.
3. **The drawer's three audit surfaces have no package to open**, so they can only be seen during a
   live run. They can never get a gate: `portal.js` touches the DOM at module scope, so group 30's
   drawer half is a source pin and the portal smoke is the only run (group 29's own closing sentence).
4. **`node discovery/prd-projection.mjs <slug>` has never been run over a package holding a
   document-kind answer.** Every audit PRD to date came out of the drawer's read-only `Download PRD`
   route. This is not a defect — the CLI tolerates one, driven and confirmed in pre-flight — but it is
   an untested path.

## Solution Statement

Record one Grill audit at `scope-check` depth (six questions) through the drawer, over a fictional PRD
fragment **authored in this plan** to differentiate all four audit verdicts, keep the package, project
its `prd.md`, and commit all four files as `discovery/kiln-hours-1/`.

Then:

- **Widen case 28.10's committed block** to loop over `["instrument-loans-1", "kiln-hours-1"]` — a small
  diff that fixes problem 1 **asymmetrically, and the plan says so rather than claiming both halves**:
  - `flag_weak_answer` coverage is **guaranteed**, because group 35's own floor (35.7) refuses a package
    that carries none. After this ticket, a `ledgerView` that stops counting that verb goes red by name.
  - `open_question` coverage is **conditional on the model**. §THE DOCUMENT is authored to make ABSENT
    likely, but #370's six-turn audit filed DODGED on the one question its document was silent about, so
    the gate reports `open_question` and never asserts it. If the recorded package folds
    `open_question 0`, that comparison stays zero-against-zero for both packages and **that half of
    problem 1 remains open** — a follow-up ticket, not a silent tick.
- **Add group 35, "the audit fixture"**, shaped like group 32: the package read from disk, its op lines
  re-folded through the real applier, a Grill freshness tripwire, the audit-specific structural claims
  (exactly one document line, every op naming it, the cursor never held), a non-vacuity floor on the
  verdict spread, and `prd.md` byte-equal to the projection.
- **Write the re-record procedure into `discovery/README.md`**, mirroring §The parenting fixture.

## Out of Scope / Non-Goals

- **Not replacing group 31's inline 31.14 fixture.** Group 31 deliberately never imports the filesystem
  half, and 31.14 needs hand-authored hostile text (`"## Injected heading\n\nA document body with a
  pipe | in it."`) plus a banked-answer positive control that no recording produces. Group 32's header
  states the rule: "Group 31's fixture is hand-authored ops and must never look like a run, so it lives
  in this file. This one IS a run … and hand-authoring it would be the honesty violation
  `discovery/README.md` forbids." Both fixtures stay.
- **Not adding a per-seq `visible`/`latest` assertion from this package.** An audit can never supersede:
  `RE_ASKS['existing-prd']` is `false` (`portal/lib/discovery.mjs:567`), so a document is never asked
  twice and no second `record_decision` ever lands on one `question_id`. The synthetic superseding
  fixture inside 28.10 stays the only home for that half, permanently.
- **Not asserting that `open_question` fired.** ABSENT is the model's judgement. #370's six-turn audit
  filed DODGED on the one question its document was silent about. Group 35 **reports** the spread and
  floors only what a real audit cannot fail to produce.
- **Not changing the op grammar.** Four verdicts, four existing verbs; the op-verb lock is not taken.
- **Not touching `portal/lib/discovery.mjs`, `discovery-postures.mjs`, `discovery-transport.mjs`,
  `portal.js` or `discovery/ops.mjs`.** No production code changes in this ticket at all — only a
  committed package, `build-checks`, and docs.
- **Not closing #375.** Its steps 1 and 3 are throwaways and remain #375's. Phase 5 here is an optional
  add-on that would discharge #375 step 2; see the GOTCHA on it.
- **Not writing the build brief HTML.** This session may write only this file.

## Feature Metadata

**Feature Type**: New Capability (a committed fixture) + Enhancement (gate coverage)
**Estimated Complexity**: Medium — the code is small; the paid recording is the risk
**Primary Systems Affected**: `discovery/` (a new package), `tooling/build-checks.mjs` (a new group +
one widened block), `discovery/README.md`, `.claude/references/gates.md`, `CLAUDE.md`
**Dependencies**: none new. `build-checks` already imports every symbol group 35 needs.

## Related Work

**Implements**: #376 · **Epic**: #279 (`docs/epics/discovery-partner.prd.md` +
`docs/epics/discovery-partner.architecture.md`)

**Back-references**:

- `.claude/plans/discovery-parent-id-341.md` — Why: **the pattern this plan copies**. A pre-registered
  answer sheet in the plan, a real drawer recording, a fixture group on disk with a freshness
  tripwire. Its §PRE-REGISTERED ANSWER SHEET is the precedent for §THE DOCUMENT below.
- `.claude/plans/discovery-postures-286.md` + `.claude/reports/discovery-postures-286-report.md` —
  Why: the audit mode itself, and the only observed audit run (#370's six turns, the cost baseline).
- `.claude/plans/discovery-portal-width-288.md` + its report — Why: the drawer surfaces this package
  lets an operator open for free, and the observation that `openSession` spends no tokens.
- `.claude/plans/discovery-prd-projection-290.md` — Why: `projectPrd` and the pointer rendering.

**Forward-references**:

- #375 (the #288 owed observation) — Phase 5 here would discharge its step 2. See §OPEN QUESTIONS.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `discovery/README.md` (lines 19–64 §Honesty rules, 65–106 §Files, 177–220 §The audit mode, 221–240
  §File shapes, 433–506 §The parenting fixture, 739–770 §Workflow) — Why: the contract, the exact
  document-line shape, and the re-record procedure §The audit fixture must mirror.
- `tooling/build-checks.mjs:5925–5972` — Why: case 28.10's synthetic block, its vacuity guard, and the
  **committed block at 5964–5972** that Task 7 widens. Read both halves before editing either.
- `tooling/build-checks.mjs:8125–8221` — Why: **group 32 in full.** Group 35 mirrors its structure:
  header comment (what it proves / what it cannot), a can-it-fail control, `existsSync` fail-by-name,
  the re-fold, the fingerprint tripwire, the claim, the projection compare, then the `group()` line.
- `tooling/build-checks.mjs:236–275` — Why: **the import block.** Everything group 35 needs is already
  there. Do not add an import (see §Patterns to follow).
- `tooling/build-checks.mjs:299–311` — Why: `ok()` **accumulates**, it does not abort; `group()` prints
  every collected failure and clears. So one mutation can produce several messages in one group.
- `portal/lib/discovery.mjs:274–292` — Why: `appendDocument`, `documentOf`, `auditAnswerFor` — the
  document line's exact shape and the one-per-run refusal.
- `portal/lib/discovery.mjs:693–748` — Why: `openSession`, including the entry-mode branch (703–722),
  the write literal (734–738, which records **no** `documentPath`) and the `appendDocument` call on the
  create path only (746).
- `portal/lib/discovery.mjs:524, 529–532, 567` — Why: `DEPTH_PROPOSAL` (full-discovery for **both**
  entry modes — the depth must be stepped down at Start), `ENTRY_POSTURES['existing-prd'] === ['grill']`,
  `RE_ASKS['existing-prd'] === false`.
- `portal/lib/discovery-postures.mjs:527–556` and `612–626` — Why: `FINGERPRINT_INPUTS`,
  `AUDIT_FINGERPRINT_INPUTS`, `FINGERPRINT_INPUTS_FOR`, `fingerprintOf` and **`resolvePosture`**. The
  stamp is model-aware; group 35 must derive it, not hardcode it. See the pre-flight finding.
- `portal/lib/discovery-transport.mjs:218` — Why: `postureFingerprint: posture.fingerprint` — the
  turnStats stamp, read off the resolved posture and never recomputed.
- `discovery/prd-projection.mjs:726–753` — Why: `readPackage` validates transcript **line types** only;
  answers pass through as `.map((l) => l.value)` with no kind whitelist, which is why the CLI tolerates
  a document-kind answer. `writePrd` (756–766) refuses to overwrite without `--force`.
- `discovery/ops.mjs:129–172` — Why: `ledgerView` — the fold both 28.10 and group 35 read. Line 134
  (`counts[r.op] += 1;`) is the reddening site for Task 7.
- `portal/public/index.html:159–229` — Why: the drawer's controls by id, for the operator steps:
  `#discovery-slug`, `#discovery-provenance`, `#discovery-entry`, `#discovery-depth`,
  `#discovery-flow`, `#discovery-model`, `#discovery-document`, `#discovery-open`.
- `portal/public/portal.js:996, 1050, 1073` — Why: the three audit surfaces the zero-token open in
  Task 3 observes.
- `.claude/references/gates.md:5, 11, 53` — Why: line 11 carries the group count; line 53 is the
  §Group 32 entry Task 10 mirrors; line 5's group list is already non-exhaustive.

### New Files to Create

- `discovery/kiln-hours-1/run.json` — **written by the server** at Start. Never by hand.
- `discovery/kiln-hours-1/answers.jsonl` — **written by the server** at Start, one `kind: "document"`
  line. Never by hand.
- `discovery/kiln-hours-1/transcript.jsonl` — **written by the server**, append-only. Never by hand.
- `discovery/kiln-hours-1/prd.md` — **generated** by `node discovery/prd-projection.mjs kiln-hours-1`.

### Files to Change

- `tooling/build-checks.mjs` — case 28.10's committed block widened; group 35 added; the ✓ count line.
- `discovery/README.md` — the package listed under §Files; a new §The audit fixture (#376).
- `.claude/references/gates.md` — the group count on line 11; a new **Group 35** entry.
- `CLAUDE.md` — the group count on lines 110 and 178.

### Relevant Documentation

- `discovery/README.md` §The audit mode (#286) — the four-verdict table, the wrong-if rule, and
  "an audit never holds a question". This is the specification group 35 gates.
- `docs/epics/discovery-partner.prd.md` MVP 2 (an existing PRD starts at Grill) and MVP 5 (any depth).
- `.claude/references/gates.md` §`tooling/build-checks.mjs` — the convention every group follows: state
  the boundary you cannot reach and name the gate that owns the other side.

### Patterns to Follow

**No new imports.** Verified against `tooling/build-checks.mjs:236–275` this session. Group 35 needs
`readPackage`, `projectPrd`, `SECTIONS`, `applyDiscoveryOps`, `ledgerView`, `selectDepth`, `documentOf`,
`auditAnswerFor`, `resolvePosture`, `MODELS`, `ENTRY_POSTURES`, `RE_ASKS` and `BANK` — **every one is
already imported.** Task 7's widening additionally uses `DISCOVERY_OPS`, `FLAGS`, `existsSync`, `join`
and `ROOT`, all already in scope in group 29's file position.

**The block-scoped helpers are a different thing, and they are NOT imports.** `threw`, `same`, `names`
and `keys` are re-declared inside each group's own block — the file's convention, observed this session:
`grep -n 'const threw = (fn)' tooling/build-checks.mjs` → `1992, 5562, 6032, 7559, 8146, 8665`, and
`grep -n 'const keys = ' tooling/build-checks.mjs` → **one hit, 6040**, inside group 30's block (which
runs from its opening brace to `group("discovery", …)` at 7541 — the reason case 33's key-set pin at
:7244 can call it). A group 35 that uses `keys` without declaring it throws `ReferenceError` at load and
takes the whole gate down. Declare it.

**A fixture group's shape** (mirror `tooling/build-checks.mjs:8125–8221`):

```js
// --- 35 · the audit fixture (#376) ----------------------------------------------------------------
// <what it proves> … <what it cannot> … <re-record procedure: discovery/README.md §The audit fixture>
{
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const keys = (o) => Object.keys(o).sort().join(",");   // block-scoped, like every other group's
  const AUDIT_SLUG = "kiln-hours-1";
  const root = join(ROOT, "discovery", AUDIT_SLUG);
  ok(existsSync(join(root, "run.json")), `no run package at discovery/${AUDIT_SLUG} — record it through the drawer per .claude/plans/discovery-audit-fixture-376.md Phase 3; this group never skips`);
  const pkg = existsSync(join(root, "run.json")) ? readPackage(root) : null;
  if (pkg) {
    /* … cases … */
    group("audit fixture", `…`);
  } else {
    group("audit fixture", "");   // unreachable on the ✓ path: the ok() above already recorded it
  }
}
```

**Never skip, always fail by name.** Group 32's `existsSync` is a hard `ok()`, not a `pending` list.
Groups 33 and 34 use a `pending` list because their recordings land in a **later** ticket; this PR
commits its package, so group 35 takes group 32's stricter form.

**Every number in a `group()` ✓ line is derived from the package**, never typed. `pkg.ops.length`,
`doc.text.length`, `closers.length` — read them, print them.

**Reddening proof without git.** Copy the file aside, mutate, run, restore:

```bash
cp <file> /private/tmp/claude-501/.../scratchpad/<name>.bak
# … mutate <file> …
node tooling/build-checks.mjs 2>&1 | grep '<expected message fragment>'
cp /private/tmp/claude-501/.../scratchpad/<name>.bak <file>
```

Never commit a mutated package or a mutated source file.

**A mutation of `run.json` or `answers.jsonl` carries an md5 receipt, and the receipt is not optional.**
Those two are server-written and the honesty contract forbids editing them (`CLAUDE.md`,
`discovery/README.md` §Honesty rules). A gate proof still has to reach them, and it has to reach them
**in place**: group 35 reads `join(ROOT, "discovery", AUDIT_SLUG)`, so a throwaway copy elsewhere is not
what the gate opens, and a whole-repo copy outside the worktree cannot run `build-checks` at all — the
gate shells out to git at `tooling/build-checks.mjs:5395` and a non-repo copy dies there (driven this
session: `fatal: not a git repository`). So the mutation is temporary, in place, and the hashes are the
receipt that it was undone:

```bash
md5 -q discovery/kiln-hours-1/run.json discovery/kiln-hours-1/answers.jsonl   # BEFORE
# … copy aside, mutate, run the grep, restore …
md5 -q discovery/kiln-hours-1/run.json discovery/kiln-hours-1/answers.jsonl   # AFTER — must be identical
```

`md5 -q` with two paths prints **two bare hashes, one per line, in argument order and with no filenames** —
`run.json` first, `answers.jsonl` second. Keep that order in the report, or a mismatched pair reads as the
wrong file. *(Observed against the committed package:
`md5 -q discovery/instrument-loans-1/run.json discovery/instrument-loans-1/answers.jsonl` →
`0496779eb43cad206fc616205026cea9` then `16aa68c623d93176d442197b15c8ef42`.)*

`git status --short discovery/` cannot stand in for this. Until the package is committed it is untracked,
and git collapses an untracked directory to a single `?? discovery/kiln-hours-1/` line with no per-file
content signal — so a botched restore is invisible there, and costs the paid recording to recover. Paste
both hash pairs into the report.

---

## THE DOCUMENT (Phase 3 — paste verbatim into the drawer's textarea)

Fictional product: **a firing register for the Bellrope Lane community pottery studio.** 90 members,
two electric kilns, one gas kiln, one technician. Every name and number is invented. Written by the
planning agent on 2026-09-07, before the run, so the recording cannot be tuned to what the agent did.

**This document is OPERATOR INPUT, not agent output.** The honesty contract binds what is presented as
agent output — `answers.jsonl`'s provenance, transcripts, ops. A hand-authored input sheet driven
through the drawer is the established pattern (`discovery/README.md` §The parenting fixture:
`instrument-loans-1`'s twelve answers "were fixed before the prompt edit and re-supplied through the
drawer verbatim").

It is authored to make the six `scope-check` questions land differently. The expected verdict in
brackets is **the author's expectation, not an instruction to the agent** — the run records whatever
the agent actually files.

- `s4-appetite` — [ANSWERED] a fixed appetite, its own wrong-if, and a countable source
- `s4-rabbit-holes` — [ABSENT] the document says nothing technical anywhere: no integration, no import,
  no assumption about how parts fit, no unknown to settle. This is the deliberate silence, chosen
  because it is the one topic in the six with no neighbour in the text.
- `s4-out-of-bounds` — [UNEVIDENCED] a clear no-go list with a wrong-if of its own and nothing checkable
- `s7-goals-signals-metrics` — [DODGED] metrics named first, no goal and no signal (the bank's own
  weak-answer note for this question)
- `s7-kill-state-and-date` — [DODGED] a state with no date (the bank's note: "a review is not a
  criterion", and Duke's point is the date)
- `s7-what-would-make-us-stop` — [ANSWERED] a result that can actually occur, with a source

It carries a `## ` heading and a `|` pipe **on purpose**, so the committed package exercises the
projection's containment on real bytes rather than only on 31.14's synthetic string.

Paste the contents of the block below into `#discovery-document`, without the fence lines. The exact
bytes do not matter to any gate — nothing in this plan compares an md5 against a literal, and every
figure group 35 asserts is derived from `doc.text.length` on disk — so a trailing-newline difference is
harmless.

```
## Kiln Hours — a firing register for the Bellrope Lane pottery studio

Bellrope Lane is a community pottery studio with 90 members, two electric kilns and one gas kiln. Members leave finished work on a shelf with a paper tag; the technician, Nadia, loads whatever fits and fires when a kiln is full. Nobody except Nadia knows when a piece will be fired, so members ask her in person, one at a time, all week.

**Appetite.** A small batch: two weeks of one developer, fixed before the scope. If the member-facing half cannot be built in two weeks we ship Nadia's own log and the member view waits for a later batch. We would not rebuild the membership records to accommodate it. This is wrong if the studio's own firing book shows fewer than two loads a week, because below that a register is bookkeeping for a problem nobody has — the book is the A4 volume in the studio office, one per kiln, and the twelve months to March count 118 electric loads and 9 gas | an average of 2.4 a week.

**Out of bounds.** No payments, no glaze or clay stock, no kiln maintenance records, and no messaging between members. None of these is negotiable during the batch: if one is asked for it goes on a note for the next one. This is wrong if a member cannot find out whose work is in a load without asking another member directly.

**Measurement.** We will report loads per week, the share of members who open the register in a month, and the number of tags left unclaimed after a firing.

**Where we need to be.** The register has to become the only place a member looks to find out when their work will be fired.

**What would make us stop.** If Nadia is still writing in the paper book, the register has replaced nothing and we stop. Her book is the source: a firing cycle with no entry in it is the result we are looking for.
```

---

## IMPLEMENTATION PLAN

### Phase 1: Baseline and zero-token proof

Establish that the tree is green and that the mechanism works before any money is spent. There is
**no `--dry` for a discovery session** — see the GOTCHA on Task 2.

### Phase 2: The paid de-risk

**Depends on:** Phase 1.

One paid probe turn (`--probe-audit`) before the recording, so a prompt regression costs about $0.12
rather than $0.34. (Both figures and the commands that produced them are in §Paid and owner-only steps.)

### Phase 3: The recording

**Depends on:** Phase 2. **Owner's hand and owner's money.**

The drawer, six turns, Finish, kept.

### Phase 4: The gate work

**Depends on:** Phase 3 — group 35 fails by name until the package is on disk, by design.

### Phase 5 (OPTIONAL): the #375 pairing

**Independent of:** Phase 4. Can run in the same drawer session as Phase 3 at no extra cost for step 3
and ~$0.03–0.07 for step 1. Skip it and #375 stays open, undamaged.

---

## STEP-BY-STEP TASKS

### 1. VERIFY the baseline

- **IMPLEMENT**: confirm the tree is green and no existing-prd package exists, so every claim below has
  a stated starting point.
- **PATTERN**: none — this is orientation.
- **GOTCHA**: run `build-checks` from the repo root. Case 28.10's committed block calls
  `readPackage("discovery/instrument-loans-1")` with a **relative** path (`build-checks.mjs:5965`),
  which resolves against `process.cwd()`. Group 32 uses `join(ROOT, …)`. Do not "fix" this — it is
  pre-existing and out of scope.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-376 && node tooling/build-checks.mjs 2>&1 | tail -1`
  → observed this session: `build ✓  all 34 groups pass`
- **VALIDATE**: `grep -l '"entryMode": "existing-prd"' discovery/*/run.json; echo exit=$?`
  → observed this session: no output, `exit=1`
- **SATISFIES**: precondition for AC #1
- **REGENERATES**: none

### 2. RUN the transport preflight — the zero-token substitute for a dry run

- **IMPLEMENT**: `cd portal && node lib/discovery-transport.mjs --preflight`. Eight rows PF1–PF8 driven
  against the real in-process MCP server over a temp root: the advertised tool names equal `OPS`, every
  required array and enum matches `PARAMS` by name, order and member, an evidence row and a decision
  file with the right `seq`/`closes`/`flagged`, and four refusals each landing as `isError` rather than
  a throw.
- **PATTERN**: `portal/lib/discovery-transport.mjs:665–670` — the CLI reads exactly four flags.
- **GOTCHA**: **the ticket's phrasing "prove the mechanism with a `--dry` run" is a correction, not a
  skipped step.** There is no `--dry` path for a discovery session or the drawer. `--dry` exists only
  for a **proposal** run (`portal/lib/discovery-proposer.mjs:356`). The transport's four branches are
  `--preflight` (zero tokens), `--probe-parenting` (1 paid turn), `--probe-fence` (3 paid turns) and
  `--probe-audit` (1 paid turn). `--preflight` plus Task 3's zero-token drawer open is the substitute,
  and between them they cover the grammar, the transport wiring and the session/disk half.
- **GOTCHA**: `--preflight` proves the grammar and the wiring, **never the model's judgement**. That is
  what `--probe-audit` costs a paid turn to observe. Do not read a green preflight as a green run.
- **GOTCHA**: needs `portal/node_modules`. `cd portal && npm install` first if absent.
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-376/portal && node lib/discovery-transport.mjs --preflight` (expected: eight PF rows, all pass, "zero tokens")
- **SATISFIES**: AC #7
- **REGENERATES**: none

### 3. OBSERVE the audit surfaces for free — a throwaway open, then delete

- **IMPLEMENT**: start the portal on a private port, open a **throwaway** slug in existing-prd mode with
  §THE DOCUMENT pasted in, observe the three audit surfaces render, then delete the package. This costs
  nothing: `openSession` is pure disk (the #288 report: "Package deleted; `discovery/` is clean. **No
  token spent** — `openSession` is pure disk").
- **PATTERN**: `.claude/reports/discovery-portal-width-288-report.md:139–148` — the same observation,
  already done once at 145 characters.
- **IMPORTS**: none.
- Steps, by control id (`portal/public/index.html:159–229`):
  1. `cd portal && PORT=4749 npm start`, open `http://localhost:4749`
  2. `#discovery-slug` → `audit-smoke-376`; `#discovery-provenance` → **fictional**
  3. `#discovery-entry` → **existing PRD**. Watch `#discovery-flow` collapse to Grill alone and
     `#discovery-document-row` appear.
  4. `#discovery-depth` → **scope-check**. It will be proposed as **full discovery** —
     `DEPTH_PROPOSAL` is `full-discovery` for *both* entry modes (`portal/lib/discovery.mjs:524`).
     Stepping it down here is the whole difference between $0.34 and about $1.68.
  5. `#discovery-model` → `claude-sonnet-5`
  6. `#discovery-document` → paste §THE DOCUMENT. Leave `#discovery-document-path` empty.
  7. `#discovery-open`
  8. Observe and record, for the report:
     - the position line: `audit-smoke-376 · Scope check · question 1 of 6 · turn t1 · audit of a1
       (N characters, md5 ………)` (`portal.js:996`)
     - the answer list row: `the audited document · a1 · every question` (`portal.js:1050`)
     - the package view: `Auditing a1 — N characters, md5 ………` then `Nothing filed yet — the package
       holds 1 answer(s) and no ops.` (`portal.js:1073`)
     - `#discovery-answer-label` hidden and the submit reading `Audit this question`
  9. **Do not submit a turn.** Stop the server **by PID** and delete the package.
- **GOTCHA**: **kill servers by PID or port only.** Never `pkill -f 'node server.mjs'` — it kills
  sibling sessions' recorders (memory: *Portal smoke: port-scoped kill*). Expect stale portals on
  nearby ports; pick a port nothing is on.
- **GOTCHA**: a slug is never re-opened without deleting first — `openSession` **resumes** an existing
  `run.json` and returns it untouched. Delete before any re-run, here and in Task 5.
- **VALIDATE**: `ls discovery/` → the throwaway is gone; `git status --short discovery/` → empty
- **VALIDATE**: `grep -c '"kind":"document"' discovery/audit-smoke-376/answers.jsonl` → `1` **while it
  exists**, before deletion
- **SATISFIES**: AC #6
- **REGENERATES**: none

### 4. RUN `--probe-audit` — one paid turn, the cheap de-risk

- **IMPLEMENT**: `cd portal && node lib/discovery-transport.mjs --probe-audit`. One paid turn over a
  temp root with a fixed synthetic document, reporting the verdict reached, whether the `wrong_if` was
  QUOTED / PARAPHRASED / AUTHORED, whether judgement came in prose before the first op, and the cost.
- **PATTERN**: `portal/lib/discovery-transport.mjs:483–537` (`probeAudit`) and 676–690 (its printout).
- **GOTCHA**: `AUTHORED` is the failure that matters — the audit exists to report which decisions carry
  no wrong-if, and an agent that writes one erases the finding. `AUDIT_WRONG_IF_RULE` in
  `portal/lib/discovery-postures.mjs` is then the only string to tighten. #370 ran this probe and needed
  no re-run, and Grill's prompt surface has not moved since: `POSTURES.grill.fingerprint` is
  `76b7847d4ebbd9d8f16f9726ff0f4f0f`, the same stamp #370's turns carry.
  *(Observed: `node -e "import('./portal/lib/discovery-postures.mjs').then(m=>console.log(m.POSTURES.grill.fingerprint))"`.)*
- **GOTCHA**: an SDK result can be `subtype: "success"` **and** `is_error: true` with the CLI's error
  text as the assistant message (memory: *SDK error result wears success*). If the probe's `turn error:`
  line appears, or a `Credit balance` / usage-limit message shows up as agent prose, stop — do not go on
  to Task 5.
- **GOTCHA**: **the probe's exit code is not a verdict list, and a `wrong_if` line does not always exist.**
  Read `portal/lib/discovery-transport.mjs:533–534` before writing the result up.
  `wrongIf` is computed **only** when the closer is a `record_decision` (`:517`), so on `probe DODGED`
  (`flag_weak_answer`, `:512`) there is no `wrong_if` at all and the printout omits the line entirely
  (`:683`). The three exits are: **0** on ANSWERED or UNEVIDENCED with a non-AUTHORED `wrong_if`, or on
  DODGED unconditionally; **2** on ABSENT, or on an AUTHORED `wrong_if`; **3** on INCONCLUSIVE (no closer
  filed). So ABSENT is inside the four verdicts and still exits 2 — do not read "a verdict inside the
  four" as "exit 0".
- **VALIDATE**: `cd /Users/Berzins/Desktop/Linards_current/wt-376/portal && node lib/discovery-transport.mjs --probe-audit; echo exit=$?`
  (expected: `exit=0` — that is `probe ANSWERED`, `probe UNEVIDENCED` or `probe DODGED`; and **when the
  closer is a `record_decision`**, i.e. on ANSWERED or UNEVIDENCED, a `wrong_if` read of QUOTED or
  PARAPHRASED. On DODGED there is no `wrong_if` line and its absence is correct, not a miss)
- **SATISFIES**: AC #7
- **REGENERATES**: none

### 5. RECORD the run through the drawer — PAID, OWNER'S HAND

- **IMPLEMENT**: the same drawer flow as Task 3, with slug `kiln-hours-1`, then six `Audit this
  question` turns, then **Finish**. Keep the package.
- **PATTERN**: `discovery/README.md` §Workflow — "An audit starts the same way with the entry set to an
  existing PRD … Nothing is typed per turn."
- Settings, exactly:

  | Control | Value | Why |
  |---|---|---|
  | `#discovery-slug` | `kiln-hours-1` | free — `grep -rn kiln .` returns nothing |
  | `#discovery-provenance` | fictional | R1: fictional → `discovery/<slug>/`, committed |
  | `#discovery-entry` | existing PRD | the mode with no fixture |
  | `#discovery-depth` | **scope-check** | six questions, the observed $0.34 shape |
  | `#discovery-flow` | Grill (the only step offered) | `ENTRY_POSTURES['existing-prd'] === ['grill']` |
  | `#discovery-model` | `claude-sonnet-5` | the default; `POSTURES.grill.fingerprint` stamps every turn |
  | `#discovery-document` | §THE DOCUMENT, pasted | operator input; stored verbatim as `a1` |
  | `#discovery-document-path` | empty | leaving it empty is what makes the paste the document |

- Then: press **Audit this question** six times, watching the package view after each. Press **Finish**
  when `Every question in this depth has been answered.` appears — `endedAt` must be set.
- **GOTCHA**: **do not paste into `documentPath`.** `documentPath` exists for run 2's committed frozen
  fixture, where the stored bytes must hash to a file's own md5. Here `answers.jsonl` **is** the
  canonical copy, and a second committed copy would drift with nothing gating it. Also:
  `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` is a **trap** for this ticket
  twice over — it is this repo's own PRD (not a fictional scenario, so not committable under R1's
  provenance rule) and it is #292 run 2's scoring input whose key lives one directory above it
  (`discovery/README.md` §The read fence). It is 24560 bytes; auditing it would also cost far more per
  turn.
- **GOTCHA**: `run.json` records **no** `documentPath` field. The write literal
  (`portal/lib/discovery.mjs:734–738`) carries slug · provenance · label · entryMode · depth ·
  proposedDepth · facets · reads · frontEnd · model · posture · sessionId · startedAt · endedAt · root ·
  turnStats and nothing else. **The document's origin survives only in this plan and the PR report** —
  name §THE DOCUMENT in both.
- **GOTCHA**: `frontEnd` must be `portal`. The drawer hardcodes it (`portal.js:959`). #370's audit ran
  `frontEnd: terminal` through the API and would not have qualified as a drawer package — it reads as a
  non-UI session in the Switch metric.
- **GOTCHA**: the depth proposal is **full discovery**. Step it down at Start or the run is about $1.68.
- **GOTCHA**: **the re-run ceiling is two paid attempts.** If the spread misses `flag_weak_answer`
  entirely (see Task 8's floor), the levers in order are: (1) **re-author §THE DOCUMENT** — it is
  operator input, so authoring is free and it is the first lever; (2) tighten **one** constant,
  `AUDIT_VERDICT_RULE` or `AUDIT_WRONG_IF_RULE` in `portal/lib/discovery-postures.mjs`, and re-probe.
  Either edit **moves `POSTURES.grill.fingerprint`**, which stales nothing today (no committed package
  runs under Grill) but must land **before** the kept recording. Before any re-run:
  `rm -rf discovery/kiln-hours-1`. Never edit the package.
- **GOTCHA**: a package recorded on a server started **without** `DISCOVERY_FENCE_TRACE` writes no trace
  file; that is the default and is correct here. Do not arm it — #349's tool-name gate means a run
  recorded now writes no built-in `denied` lines at all, and zero denied lines is the expected shape.
- **VALIDATE** *(expected — the package does not exist until this task runs)*:
  `python3 -c "import json;r=json.load(open('discovery/kiln-hours-1/run.json'));print(r['entryMode'],r['posture'],r['depth'],r['frontEnd'],r['model'],r['endedAt'],len({t['turn'] for t in r['turnStats']}),len(r['turnStats']))"`
  → expected `existing-prd grill scope-check portal claude-sonnet-5 <ISO> 6 6`. *(The line's quoting was
  driven this session against `discovery/instrument-loans-1/run.json` — it prints
  `blank-idea think opening-set portal claude-sonnet-5 2026-09-01T10:16:48.687Z 12 12`, `exit=0`.)*
  **Count DISTINCT turns,
  not entries** — `recordTurnStats` appends one entry per submit (`portal/lib/discovery.mjs:804–805`,
  called at `:1039`), so a re-submit on a turn the agent yielded without closing adds a second entry for
  the same turn id and the two numbers diverge legitimately. 32.2a says exactly this in its own comment
  (`tooling/build-checks.mjs:8173–8174`). The distinct count is the one that must read 6; the entry count
  is reported.
- **VALIDATE** *(expected)*: `python3 -c "
import json,collections
c=collections.Counter(o['op'] for o in map(json.loads,open('discovery/kiln-hours-1/transcript.jsonl')) if o['type']=='op')
print(dict(c))"` → expected all four verbs present; the author's expectation is
  `record_decision 3 · flag_weak_answer 2 · open_question 1 · file_evidence >= 2`
- **VALIDATE** *(expected)*: `wc -l discovery/kiln-hours-1/answers.jsonl` → `1`
- **SATISFIES**: AC #1, AC #2
- **REGENERATES**: none — nothing under `discovery/` is counted by `gen-loc-summary` (see Task 6).

### 6. PROJECT `prd.md` — the first CLI run over a document-kind package

- **IMPLEMENT**: `node discovery/prd-projection.mjs kiln-hours-1`
- **PATTERN**: `discovery/README.md` §The parenting fixture, re-record step 5.
- **GOTCHA**: this is the **first** time the projection CLI runs over a package holding a document-kind
  answer. Every audit PRD to date came out of the drawer's read-only `Download PRD` route
  (`portal/server.mjs:227–238`). It is **not** a defect: `readPackage` validates transcript line types
  (`TRANSCRIPT_TYPES`, `prd-projection.mjs:727`) and answers pass through as `.map((l) => l.value)`
  (line 736) with no kind whitelist. Driven this session on a synthetic three-op document package:
  `exit=0`, the pointer rendered three times as
  `_[the audited document — answer a1, 105 characters, verbatim in answers.jsonl]_`, the Ledger line
  read `record_decision 1 · flag_weak_answer 1 · open_question 1`, and
  `grep -c "Injected heading\|A fictional PRD fragment"` returned `0`.
- **GOTCHA**: `writePrd` **refuses to overwrite** an existing `prd.md` without `--force`, because the
  file is generated and then hand-edited. First run: no flag. A re-record: `rm -rf` the package first,
  so there is nothing to overwrite.
- **GOTCHA**: **do not hand-edit this `prd.md`.** Group 35 asserts it is byte-equal to the projection
  (mirroring 32.5). `prd.md` sits deliberately outside `tooling/drift-check.mjs`, so this gate is its
  only protection.
- **VALIDATE** *(expected)*: `node discovery/prd-projection.mjs kiln-hours-1 --stdout | grep '^\*\*Run\*\*'`
  → expected to contain `· entry existing-prd ·` and `· posture grill ·`
- **VALIDATE** *(expected)*: `node discovery/prd-projection.mjs kiln-hours-1 --stdout | grep -c 'the audited document — answer a1'`
  → expected `>= 1`
- **VALIDATE** *(expected)*: `node discovery/prd-projection.mjs kiln-hours-1 --stdout | grep -c '^## '`
  → expected `11` (the `SECTIONS` count — no heading came from the document; observed
  `node -e "import('./discovery/prd-projection.mjs').then(m=>console.log(m.SECTIONS.length))"` → `11`)
- **SATISFIES**: AC #3
- **REGENERATES**: `discovery/kiln-hours-1/prd.md` — `node discovery/prd-projection.mjs kiln-hours-1`.
  Nothing else. `gen-loc-summary`'s three regexes are `^system/(wc/)?[^/]+\.(css|mjs|js)$`,
  `^(?:[^/]+|proto/[^/]+)\.html$` and `^agent-layer/[^/]+\.mjs$` (`agent-layer/gen-loc-summary.mjs:22–26`),
  so nothing under `discovery/` moves `loc-summary.json` or the two `approach.html` VR baselines.

### 7. WIDEN case 28.10's committed block to two packages

- **IMPLEMENT**: in `tooling/build-checks.mjs`, wrap the committed block (currently 5964–5972) in a loop
  over the two slugs. Minimal diff — keep the relative `readPackage` path exactly as it is:

```js
    // The same comparison over COMMITTED packages, so the mirror is checked against real recorded ops.
    // TWO packages, and the second is why (#376): instrument-loans-1 folds flag_weak_answer 0 and
    // open_question 0, so two of the four per-verb assertions compare zero against zero and ledgerView
    // could stop counting either verb with this block still green. kiln-hours-1 is an existing-prd
    // AUDIT, whose four verdicts reach all four verbs. It cannot contribute the per-seq half above —
    // RE_ASKS['existing-prd'] is false, so an audit never supersedes.
    // GUARDED like group 32's fixture read: readPackage THROWS on a missing run.json, and an uncaught
    // throw here crashes the whole run with a stack trace instead of failing by name — and takes out
    // every group after this one. The guard therefore tests run.json, exactly as group 32's does at
    // :8165, because a half-deleted package is a DIRECTORY with no run.json in it. The re-record
    // procedure deletes the package before re-running it.
    for (const slug of ["instrument-loans-1", "kiln-hours-1"]) {
      const dir = `discovery/${slug}`;
      const present = existsSync(join(ROOT, dir, "run.json"));
      ok(present, `28.10: no run package at ${dir} — re-record it (discovery/README.md §The audit fixture); this case never skips silently`);
      if (!present) continue;
      const pkg = readPackage(dir);
      const lv = ledgerView(pkg.ops);
      const line = projectPrd(pkg).split("\n").find((l) => l.startsWith("**Ledger**")) ?? "";
      ok(lv.total === pkg.ops.length, `28.10: ledgerView folded ${lv.total} of ${slug}'s ${pkg.ops.length} ops`);
      for (const verb of DISCOVERY_OPS) ok(line.includes(`${verb} ${lv.counts[verb]}`), `28.10: ${slug} — the readers disagree on ${verb} (${JSON.stringify(line)})`);
      for (const f of FLAGS) ok(line.includes(`${f} ${lv.flags[f]}`), `28.10: ${slug} — the readers disagree on ${f} (${JSON.stringify(line)})`);
    }
```

- **PATTERN**: the existing block at `tooling/build-checks.mjs:5964–5972` — same three assertions, same
  message prefixes, only the fixed slug becomes the loop variable. The `existsSync` guard mirrors group
  32's at `:8165` — which tests `join(root, "run.json")`, **the file, not the directory** (read this
  session) — and the relative `readPackage(dir)` call stays as it is, because that is the existing
  behaviour and this is not the ticket that changes it.
- **GOTCHA**: **the guard is load-bearing, not defensive padding, and it must test `run.json`.**
  `readPackage` throws on a missing `run.json` (`discovery/prd-projection.mjs:733`; driven this session —
  `readPackage("discovery/kiln-hours-1")` → `prd-projection: no run.json at discovery/kiln-hours-1/run.json
  — that is not a run package`), and `ok()` does not catch. An unguarded loop crashes `build-checks` with
  a stack trace instead of a named failure, and every group after group 29 stops running. A guard on the
  **directory** is not a guard at all for the sharp case: a directory that exists with no `run.json` —
  a half-deleted package, an interrupted `rm -rf`, a re-record stopped between steps — passes the
  directory test, reaches `readPackage`, and produces the exact stack-trace crash the guard was written
  to prevent. Test the file. Three windows where this fires: Task 7 executed before Task 5, **step 2 of
  the re-record procedure in Task 10** (which deletes the package before steps 3–5 put it back), and a
  deletion that only got half-way. All three are real; guard for all three.
- **GOTCHA**: the guard is `join(ROOT, …)`-based while `readPackage(dir)` stays **cwd-relative** — they
  agree only when `build-checks` runs from the repo root, which is Task 1's stated precondition. That
  asymmetry is pre-existing (`build-checks.mjs:5966`) and this ticket deliberately declines to change it;
  it is named here so a reviewer does not have to ask.
- **GOTCHA**: **the two stranded-gate pointers are deliberate and they differ on purpose.** During Task
  10's re-record step 2 both this guard and group 35's fire at once. This one names
  `discovery/README.md §The audit fixture` — the procedure, which is what someone mid-re-record needs and
  which survives after the plan is archived. Group 35's names this plan's Phase 3, because that is the
  first recording. Group 32 does exactly the same split: its `ok()` at `:8165` names
  `.claude/plans/discovery-parent-id-341.md Phase 4` while its header comment names
  `discovery/README.md §The parenting fixture`. Do not "unify" them.
- **GOTCHA**: **the issue mis-describes this block, and the plan corrects it.** #376's body calls it "the
  committed cross-reader block" as though it carried the per-seq `visible`/`latest` assertion. It does
  not — it checks `total`, per-verb counts and per-flag counts only. The per-seq loop lives in the
  synthetic block above (5953–5960) behind the vacuity guard at 5961. Commit `7056441` ("case 28.10 is a
  per-seq assertion, not a block count") landed **after** the PR #372 review that spawned the issue, so
  the issue's wording is one commit behind its own repo. Do not add a per-seq loop here — an audit can
  never supersede.
- **GOTCHA**: case 28.10 lives **inside group 29** (`the discovery applier`; header at line 5552,
  `group()` call at 6008). The `28.` prefix is legacy numbering. Do not go hunting in group 28.
- **GOTCHA**: also extend group 29's `group()` detail string (line 6008) where it says "and again on the
  committed instrument-loans-1 package" — name both packages and say why the second is there.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | grep '^build discovery ops'` (expected `✓`)
- **REDDENS**: **this is the mutation that proves the widening's value, not merely that a check exists.**
  In `discovery/ops.mjs:134`, change

  ```js
  counts[r.op] += 1;
  ```

  to

  ```js
  if (r.op !== "flag_weak_answer") counts[r.op] += 1;
  ```

  Then:
  - **On HEAD (before this task):** run `node tooling/build-checks.mjs 2>&1 | grep '28.10: instrument-loans-1'`
    → **no match.** The mirror is broken and 28.10's committed block does not notice, because both
    readers say `flag_weak_answer 0`. That absence *is* the gap.
    **The build is RED on HEAD regardless**, and the plan says so rather than claiming otherwise: group
    29's synthetic happy-fold case at `tooling/build-checks.mjs:5892` catches the mutation and prints
    `28.10: counts.flag_weak_answer is 0, the ledger holds 1`. The demonstration is about **which line is
    absent**, never about the exit code — grep for the slug-named line, do not read `tail -1`.
  - **After this task:** run `node tooling/build-checks.mjs 2>&1 | grep '28.10: kiln-hours-1'`
    → matches `28.10: kiln-hours-1 — the readers disagree on flag_weak_answer (…)`.

  Expect **collateral failures** in the same group — group 29's happy-fold and purity cases read
  `counts` too, and `ok()` accumulates rather than aborting (`build-checks.mjs:299–303`). That is
  expected and does not weaken the demonstration: the proof is the presence or absence of the
  `28.10: <slug> — the readers disagree on flag_weak_answer` line specifically. Grep for it; do not read
  the failure count.

  Restore `discovery/ops.mjs` from the scratchpad copy afterwards and re-run to green.
- **REDDENS (the guard)**: drive it **twice**, because the two absences are different shapes and only the
  second one distinguishes a file guard from a directory guard.
  1. *Wholly absent.* `mv discovery/kiln-hours-1 /private/tmp/.../scratchpad/kiln-hours-1`, then
     `node tooling/build-checks.mjs 2>&1 | grep '28.10: no run package'` → matches
     `28.10: no run package at discovery/kiln-hours-1 — re-record it …`. Move it back.
  2. *Half-deleted — the case a directory guard misses.* Move it aside as above and then
     `mkdir -p discovery/kiln-hours-1` (an empty directory, no `run.json`). Same grep, same match.
     `rmdir discovery/kiln-hours-1` and move the package back. A guard on the directory passes here,
     reaches `readPackage`, and ends the run in a stack trace instead.

  **Check both halves on each**: the named message, and that `node tooling/build-checks.mjs 2>&1 | tail -1`
  still prints a `build ✗`/`build ✓` summary at all — a stack trace prints neither, and groups 30 to 34
  never run.
- **SATISFIES**: AC #4
- **REGENERATES**: none

### 8. ADD group 35 — the audit fixture

- **IMPLEMENT**: two edits in `tooling/build-checks.mjs`.

  **(i) Widen the `readPackage` import comment at `:272`**, which currently reads "`readPackage` is
  imported for group 32 alone, because its subject IS the on-disk package (#341)." Group 35 is the second
  reader, so the comment is false the moment this group lands. A one-word edit — "for groups 32 and 35" —
  with `(#341, #376)` on the reference. No gate catches a rotted comment; it is in IMPLEMENT so it is not
  skipped.

  **(ii) A new group**, mirroring group 32's shape (`tooling/build-checks.mjs:8125–8221`).
  **Placement: after group 34's closing brace at `:9397`, and BEFORE the `// --- the verdict` marker at
  `:9399`.** Do not aim at the summary line: `console.log("\nbuild ✓  all 34 groups pass")` at `:9406`
  sits **inside** the standalone-run guard (`if (process.argv[1] && import.meta.url === …)`, `:9401–9407`),
  so a group placed after it would be inside that guard and never run in CI. It is also not the last
  statement in the file — the guard's closing brace at `:9407` is. And there is no
  `group("build proposals", …)` call to place after: the printed `build ` prefix is added inside
  `group()` itself (`:306` and `:311`), and the call at `:9396` reads `group("proposals", …)`.

  Cases, in order:

  **35.1 — the package exists and describes itself as an audit.** Hard `ok(existsSync(join(root,
  "run.json")))` naming this plan's Phase 3; never skips. Then `run.slug === AUDIT_SLUG`,
  `run.provenance === "fictional"`, `run.root === "discovery/" + AUDIT_SLUG`,
  `run.entryMode === "existing-prd"`, `run.posture === "grill"`, `run.frontEnd === "portal"`,
  `MODELS.includes(run.model)`, `typeof run.endedAt === "string"`, and
  `ENTRY_POSTURES[run.entryMode].includes(run.posture)` — so the package is checked against the
  **contract**, not against a typed literal.

  **35.2 — EXACTLY ONE document line, with `appendDocument`'s exact shape.** From
  `readPackage(root).answers`: exactly one entry with `kind === "document"`; its `ref === "a1"`;
  `turn === null && question_id === null`; its key set sorted equals
  `kind,question_id,ref,text,ts,turn` (case 33's own pin, `build-checks.mjs:7244`); `documentOf(answers)`
  returns it; `auditAnswerFor({ answers, head: run })` returns it. Also
  `answers.length === 1` — an audit appends nothing per turn.

  **35.3 — every op names the document, and nothing else.** For every record in `pkg.ops` that carries
  an `answer_ref` param, it equals the document's ref. (`file_evidence` carries none by `PARAMS` — the
  #370 observation.) The README's contract sentence: "an existing-prd package holds exactly one
  `kind: "document"` answer line and its ops all name it."

  **35.4 — the ledger is the applier's, not a hand's.** Re-fold `pkg.ops.map(({ op, params, turn }) =>
  ({ op, params, turn }))` through `applyDiscoveryOps` over `pkg.answers` and the real `BANK`, and
  compare record by record. Mirror of 32.3 — copy its message wording.

  **35.5 — THE FRESHNESS TRIPWIRE, model-aware.** Derive the expected stamp:

  ```js
  const want = resolvePosture({ posture: run.posture, model: run.model }).fingerprint;
  ```

  Then every `run.turnStats[i].postureFingerprint === want`, with a message naming both hashes and
  pointing at `discovery/README.md` §The audit fixture.

  **35.6 — THE CURSOR NEVER HELD.** `RE_ASKS[run.entryMode] === false` (so the case states its own
  premise), then over the closers (`pkg.ops.filter((r) => r.closes === true)`):
  their `params.question_id`s are **distinct**, and are a **prefix in order** of
  `selectDepth(run.depth).map((q) => q.id)`. Also `closers.length >= 3` — a floor, so the run says
  something. The turn half is a **prefix in order too, never an equality**: the distinct turn ids in
  `run.turnStats` (`[...new Set(turnStats.map((t) => t.turn))]`) are `t1…tN` in order, and
  `N >= closers.length`, with the delta `N - closers.length` **reported in the ✓ line, never asserted**.
- **GOTCHA on 35.6**: **do not re-couple the two counts the `closers.length >= 3` floor was chosen to
  decouple.** `applyOp` sets `closes` per verb — `!p.off_script` for `record_decision`
  (`discovery/ops.mjs:273`), `true` for `flag_weak_answer` (`:293`), `p.source === "banked"` for
  `open_question` (`:304`) — so an off-script op closes nothing while `recordTurnStats` still appends an
  entry for that turn (`portal/lib/discovery.mjs:804–805`, called at `:1039`). A turn the agent yielded
  on without filing a closer therefore leaves distinct turns **one ahead of** closers, and #341's
  operator steps document exactly that shape as expected
  (`.claude/plans/discovery-parent-id-341.md:802` — "If the cursor does not advance (the agent yielded
  without closing), re-submit the same answer on the same turn — R2 permits it"). Press Finish after such
  a turn without re-submitting and an equality assertion goes red on an honest recording the floor was
  written to admit. Closers can never exceed distinct turns (a turn closes at most once, R2), so
  `>=` is the true relation. Group 32's 32.2a avoids the same trap from the other side by comparing
  against `selectDepth("opening-set")`'s own turn list rather than against its closers
  (`tooling/build-checks.mjs:8171–8179`).

  **35.7 — THE VERDICT SPREAD, floored not pinned.** `new Set(closers.map((r) => r.op)).size >= 2` — at
  least two distinct closing verbs, which is the non-vacuity claim and exactly what
  `instrument-loans-1` structurally cannot reach; and
  `ledgerView(pkg.ops).counts.flag_weak_answer >= 1` — the verb 28.10 compares zero-against-zero today.
  `open_question` and `file_evidence` are **reported in the ✓ line and never asserted** (see the
  GOTCHA).

  **35.8 — `prd.md` IS the projection, and the document is off the page.**
  `existsSync(join(root, "prd.md"))` naming the regenerate command;
  `readFileSync(prd.md, "utf8") === projectPrd(pkg)`, with the projection call **`threw`-guarded** the way
  32.5 does it (`tooling/build-checks.mjs:8209–8210`), so a package that will not project fails by name
  rather than crashing the group — that is what `threw` is declared for; the pointer present as
  `the audited document — answer ${doc.ref}, ${doc.text.length} characters` with the length **derived**;
  `!md.includes(doc.text)`; and the `^## ` heading list equal to `SECTIONS.map((r) => r.heading)`, which
  is non-vacuous because §THE DOCUMENT carries a `## ` heading of its own.

  **35.9 — the `group()` ✓ line**, every figure derived: the slug, model, depth, the **distinct** turn
  count beside the `turnStats` entry count and the closer count (so a re-submit and a non-closing turn are
  both visible rather than hidden behind one number), the four per-verb counts, the two flag counts, the
  document's character count, the fingerprint's first 8 hex, and a **What it cannot reach** sentence
  (below).

- **PATTERN**: `tooling/build-checks.mjs:8125–8221` for structure; `:7244` for the document key-set pin;
  `:8165` for the fail-by-name and `:8171–8179` for the fingerprint wording.
- **IMPORTS**: **none.** The cases above use exactly `readPackage`, `projectPrd`, `SECTIONS`,
  `applyDiscoveryOps`, `ledgerView`, `selectDepth`, `documentOf`, `auditAnswerFor`, `resolvePosture`,
  `MODELS`, `ENTRY_POSTURES`, `RE_ASKS` and `BANK` — every one already imported at
  `tooling/build-checks.mjs:236–275`, verified this session. Adding an import would be a mistake, not an
  omission. **"No new imports" does NOT mean "no new declarations."** `threw`, `same` and `keys` are
  block-scoped one-liners re-declared inside each group's own block — the file's convention, and `keys`
  in particular exists **once**, at `:6040`, inside group 30's block, so 35.2's key-set pin would throw
  `ReferenceError` at load if group 35 leaned on it. Declare all three at the top of group 35's block, as
  the §Patterns sketch does. **Note what is deliberately NOT used:** `deriveCursor` and `readTranscript` are imported for
  group 30 and are *not* needed here — 35.6 reads the closers straight off `pkg.ops` (`readPackage`
  strips only `type` and `ts`, so `closes`, `flagged`, `seq` and `supersedes` all survive) and states its
  premise as `RE_ASKS[run.entryMode] === false`. A `deriveCursor` call here would add nothing and read as
  a second source of truth for a fact the record already carries.
- **GOTCHA**: **the fingerprint is model-aware and is not a document hash.** Settled by driving it this
  session: `AUDIT_FINGERPRINT_INPUTS` carries a **synthetic** document
  (`{"ref":"fp-doc","kind":"document","text":"A fixed document for the fingerprint."}`,
  `discovery-postures.mjs:541–545`), so a run's own document can never move the stamp — which is what
  makes the tripwire a prompt hash rather than a document hash. But `resolvePosture` **recomputes** the
  hash on a model override (`:625`): observed `grill` on `claude-sonnet-5` →
  `76b7847d4ebbd9d8f16f9726ff0f4f0f`, on `claude-opus-5` → `ba124c3c1edb19905101aceca7c12e22`. So 35.5
  must derive from `run.model`. Hardcoding `POSTURES.grill.fingerprint` would go red the moment anyone
  records an audit on Opus.
- **GOTCHA**: **`open_question` is reported, never asserted.** #370's six-turn audit hit ANSWERED 2 ·
  DODGED 4 with UNEVIDENCED and ABSENT never firing — on `s7-kill-state-and-date`, the one question its
  document was silent on, the model filed DODGED, reading the six-week appetite as touching it. §THE
  DOCUMENT is authored to make ABSENT likelier (its silence is `s4-rabbit-holes`, the one topic with no
  neighbour in the text), but authoring is not a guarantee and a gate that asserts it is a bet on the
  model. Floor what a real audit cannot fail to produce; print the rest.
- **GOTCHA**: **`closers.length >= 3`, not `=== 6`.** A `t1…t6` pin would additionally prove the depth
  was completed, but it goes red on an honest partial — and a partial package is committed precedent
  (`spine-meridian-1` is `scope-check` with 3 `turnStats` entries, `endedAt` set and no `prd.md` at all).
  The floor plus the prefix-in-order assertion still pins the audit's structural claim (never holds,
  never skips); completeness is reported in the ✓ line, not gated. If the run does complete all six —
  which AC #2 asks for — the assertion holds trivially and the ✓ line says so.
- **GOTCHA**: group 35 must stay **SDK-free**, like groups 8, 29, 30, 33 and 34: CI has no
  `portal/node_modules`. `portal/lib/discovery.mjs` and `discovery-postures.mjs` are statically SDK-free
  (the SDK lives in `discovery-transport.mjs`, lazily imported inside `runTurn`), which is why
  `build-checks` may import them at all. Never import `discovery-transport.mjs`.
- **GOTCHA**: the ✓ line's **What it cannot reach** sentence is a house convention
  (`.claude/references/gates.md:5`). For group 35: it observes **one** recorded session, so it cannot
  reach the model's behaviour under an unchanged prompt on a later date or under a newer SDK
  (`--probe-audit` is that one-turn re-observation, paid); it cannot reach whether the **drawer** renders
  what it is handed (`portal.js` touches the DOM at module scope — the source pins in group 30 and the
  portal smoke are the only checks); and it cannot reach the per-seq `visible`/`latest` half, because
  `RE_ASKS['existing-prd']` is false and an audit never supersedes — the synthetic fixture inside 28.10
  is that assertion's permanent home.
- **VALIDATE** *(expected — depends on the package Task 5 records)*:
  `node tooling/build-checks.mjs 2>&1 | grep '^build audit fixture'` → expected `✓` with the ✓ line's
  derived figures
- **VALIDATE** *(expected)*: `node tooling/build-checks.mjs 2>&1 | tail -1` → expected
  `build ✓  all 35 groups pass`
- **REDDENS**: three mutations, none depending on the run's counts. Copy the target aside, mutate,
  `node tooling/build-checks.mjs 2>&1 | grep '<fragment>'`, restore.

  | # | Mutation | Expected failure fragment |
  |---|---|---|
  | a | `discovery/kiln-hours-1/run.json`: `"entryMode": "existing-prd"` → `"blank-idea"` | `35.1: run.json does not describe the audit fixture` (naming `entryMode`) |
  | b | `discovery/kiln-hours-1/answers.jsonl`: append a second `{"ref":"a2",…,"kind":"document",…}` line | `35.2: … holds 2 document line(s)` — an audit holds exactly one |
  | c | `portal/lib/discovery-postures.mjs`: change one character inside `AUDIT_VERDICT_RULE` | `35.5: the Grill prompt surface changed since the fixture was recorded (fixture 76b7847d vs current ………)` |

  **Mutations (a) and (b) touch the two server-written files, and they are the reason the md5 receipt in
  §Patterns exists.** `run.json` and `answers.jsonl` are written only by the server and the honesty
  contract forbids editing them (`CLAUDE.md`, `discovery/README.md` §Honesty rules). This is a **gate
  proof on a temporary in-place mutation, not an edit to the package** — the distinction is that the file
  goes back byte-identical and the hashes prove it. It cannot be done on a throwaway copy: group 35 reads
  `join(ROOT, "discovery", AUDIT_SLUG)`, so a copy elsewhere is not what the gate opens, and a whole-repo
  copy outside the worktree cannot run `build-checks` at all (`tooling/build-checks.mjs:5395` shells out
  to git; driven this session on a copy → `fatal: not a git repository`). So:

  - **VALIDATE (a) and (b), mandatory, and it is the receipt**: run
    `md5 -q discovery/kiln-hours-1/run.json discovery/kiln-hours-1/answers.jsonl` **before** the first
    mutation and again **after** the last restore, and assert the two pairs are identical. Paste both
    into the report. `git status --short discovery/` proves nothing here — the package is untracked until
    the commit, and git collapses an untracked directory to one `??` line with no per-file content
    signal, so a botched restore is invisible there and costs the paid recording to recover.

  Mutation **c** is also the positive control for the tripwire's *value*: it must move the stamp, and it
  must **not** be movable by editing the committed document — confirm the second half by checking that
  `AUDIT_FINGERPRINT_INPUTS.answer.text` is the synthetic string, never the package's.
  A fourth, optional: temporarily rename `discovery/kiln-hours-1` and confirm 35.1's absent-package
  message fires rather than the group silently skipping.
- **SATISFIES**: AC #4, AC #5
- **REGENERATES**: none

### 9. UPDATE the group count — four places, one number

- **IMPLEMENT**: `34` → `35` in:
  - `tooling/build-checks.mjs:9406` — `console.log("\nbuild ✓  all 34 groups pass");` (a **bare string**;
    there is no registry — `grep -c "^  group(\|^group(" ` returns 33 and `grep -c "  group(\""` returns
    35, which is the tell that the count is hand-maintained)
  - `CLAUDE.md:110` — `build-checks.mjs            34 PURE groups, in CI`
  - `CLAUDE.md:178` — `build-checks' 34 groups`
  - `.claude/references/gates.md:11` — `## tooling/build-checks.mjs — 34 pure groups, in CI`
- **GOTCHA**: `gates.md:5` lists which groups carry the "cannot reach" sentence — "Groups 9, 11, 13, 16,
  18, 19, 23, 24, 25, 26, 27, 28 and 34". That list is **already non-exhaustive**: groups 30, 31, 32 and
  33 each carry the sentence and none is listed. So adding 35 there is **optional**; either choice is
  defensible, and neither is a defect. Do not "fix" the whole list in this PR.
- **VALIDATE**: `grep -rn "34 groups\|34 PURE\|34 pure" CLAUDE.md .claude/references/gates.md tooling/build-checks.mjs; echo exit=$?`
  → expected no matches, `exit=1`
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` (expected `build ✓  all 35 groups pass`)
- **SATISFIES**: AC #5
- **REGENERATES**: none — `CLAUDE.md` and `.claude/references/` are hand-maintained.

### 10. DOCUMENT the fixture and its re-record procedure

- **IMPLEMENT**:
  1. `discovery/README.md` §Files — add a line to the package list, in the existing style:
     `kiln-hours-1/          the AUDIT FIXTURE — the only committed existing-prd run, scope-check under Grill (#376)`
  2. `discovery/README.md` — a new `## The audit fixture (#376)` section after §The parenting fixture,
     mirroring its shape: what the package is, that §THE DOCUMENT in
     `.claude/plans/discovery-audit-fixture-376.md` is its source and `run.json` records no
     `documentPath` so the plan is the only record of that; what group 35 asserts; the fingerprint
     tripwire and **its price**; and the re-record procedure:

     ```
     1. cd portal && node lib/discovery-transport.mjs --probe-audit   — one paid turn (~$0.12).
        Read the EXIT CODE, not the verdict name. exit 0 is ANSWERED, UNEVIDENCED or DODGED and needs
        no lever. exit 2 is either an AUTHORED wrong_if — AUDIT_WRONG_IF_RULE is the string to tighten —
        or a verdict of ABSENT, which is inside the four and still exits 2: that is the probe's own
        synthetic document being read as silent, and the lever is AUDIT_VERDICT_RULE. exit 3 is
        INCONCLUSIVE, no closer filed at all, and AUDIT_VERDICT_RULE is the lever there too.
     2. rm -rf discovery/kiln-hours-1   — a slug is never re-run without deleting first.
     3. cd portal && PORT=4749 npm start   — a fresh port; kill it by PID afterwards.
     4. Drive the drawer with the document in the plan: slug kiln-hours-1, fictional, entry existing PRD,
        depth scope-check (the drawer PROPOSES full discovery — step it down), Grill, claude-sonnet-5;
        six turns; press Finish.
     5. node discovery/prd-projection.mjs kiln-hours-1, then node tooling/build-checks.mjs.

     Between steps 2 and 5 the gate is RED and says so by name — case 28.10 and group 35 each report
     "no run package at discovery/kiln-hours-1". That is the procedure working, not a break.
     ```
  3. `.claude/references/gates.md` — a new **Group 35 — the audit fixture** entry after Group 34's,
     in the same voice, ending with the "Cannot reach" italic sentence from Task 8's GOTCHA.
- **PATTERN**: `discovery/README.md:433–506` (§The parenting fixture) — copy its structure, including the
  honest cost paragraph and the "what it cannot" limit. `.claude/references/gates.md:53` for the entry.
- **GOTCHA**: **the honesty contract runs both ways.** Write the mechanism and the observed figures; do
  not write the owner's half — no verdict on whether the run was good, no invented reason. Every figure
  names the command that produced it.
- **GOTCHA**: **no blockquotes or leading spaces on anything the owner will paste.** The re-record steps
  go in a fenced block or as plain numbered lines.
- **VALIDATE**: `grep -n "kiln-hours-1" discovery/README.md .claude/references/gates.md | head`
  (expected: at least three hits — the §Files line, the new section, the gates entry)
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -1` (expected `build ✓  all 35 groups pass` —
  a README edit changes no gate, but CI `verify` `node --check`s every tracked `.mjs`)
- **SATISFIES**: AC #8
- **REGENERATES**: none

### 11 (OPTIONAL). CLOSE #375's step 2 in the same drawer session

- **IMPLEMENT**: only if the owner wants #375 discharged here. While the portal is up for Task 5:
  1. **#375 step 1** — a **throwaway** blank-idea slug with a facet preset pressed, Start, **one paid
     turn** (~$0.03–0.07). Observe the package view render the ledger fold without a manual reload, and
     the flow note read the recorded step. **Delete the package.**
  2. **#375 step 2** — already discharged by Task 5: the audit run's package view refreshing after each
     of the six turns *is* the observation, on a package that is **kept**.
  3. **#375 step 3** — reload mid-run, re-press Start with a different depth, confirm the drawer shows
     `Refused: …` naming the recorded vector and that `discovery.session` is not clobbered. **Zero
     tokens** — `openSession` is pure disk and the 409 refuses before anything is written.
  4. Write all three observations into `.claude/reports/discovery-portal-width-288-report.md`, replacing
     the block at line 205 that begins "**A live paid turn was not run.**"
- **GOTCHA**: **opposite disciplines, easy to conflate.** #375's step-1 and step-3 packages are
  throwaways to **delete**; this ticket's `kiln-hours-1` is **kept and committed**. Confirm
  `git status --short discovery/` shows only `kiln-hours-1` before committing anything.
- **GOTCHA**: if this task is skipped, #375 stays open and undamaged — nothing here breaks it. Say so in
  the PR report rather than leaving it ambiguous.
- **VALIDATE** *(expected)*: `git status --short discovery/` → only `discovery/kiln-hours-1/` files
- **SATISFIES**: AC #9 (optional)
- **REGENERATES**: none

---

## TESTING STRATEGY

There is no test suite, no linter and no type-check in this repo (`CLAUDE.md` §Ground rules). "Done"
means: the gate you touched runs, and the surface you touched was driven.

### Unit-equivalent

`node tooling/build-checks.mjs` — 35 pure groups. Groups 29 (the applier, which owns case 28.10) and 35
(the audit fixture) are the two this ticket moves.

### Integration-equivalent

- `cd portal && node lib/discovery-transport.mjs --preflight` — eight rows, zero tokens, the grammar and
  the transport wiring against the real in-process MCP server.
- `node discovery/prd-projection.mjs kiln-hours-1 --stdout` — the filesystem half group 31 deliberately
  does not import, driven over a document-kind package for the first time.
- The drawer itself, driven by hand: `portal.js` touches the DOM at module scope, so no gate can reach
  it and the portal smoke is the only run.

### Edge cases

- A package with **two** document lines — mutation (b) in Task 8; the server refuses one at write time
  (`appendDocument`'s one-per-run refusal) but a corrupted file must fail the gate too.
- A **partial** run (fewer than six turns) — the floor at 3 admits it; the ✓ line reports it. Precedent:
  `spine-meridian-1`.
- A turn the agent **yielded on without closing**, with Finish pressed after it — distinct turns then sit
  one ahead of the closers. 35.6's prefix-and-`>=` shape admits it and the ✓ line reports the delta; an
  equality would have reddened an honest recording (`discovery/ops.mjs:273, 293, 304` for `closes` per
  verb; `.claude/plans/discovery-parent-id-341.md:802` for the operator's re-submit).
- A **re-submit on the same turn** — `turnStats` then holds more entries than there are distinct turns.
  Every count that must hold is over distinct turns; entries are reported
  (`tooling/build-checks.mjs:8173–8174`).
- A run recorded on **Opus** — 35.5 derives the stamp from `run.model`, so it holds.
- An **empty** verdict spread (one verb only) — 35.7's `>= 2` refuses it; that is the re-run trigger and
  the ceiling in Task 5's GOTCHA governs what happens next.

### Proving the checks

Every check this plan adds carries its reddening mutation:

| Check | Mutation | Depends on run counts? |
|---|---|---|
| 28.10 widening | `discovery/ops.mjs:134` stops counting `flag_weak_answer` | no |
| 35.1 | `run.json`'s `entryMode` → `blank-idea` | no |
| 35.2 | append a second document line to `answers.jsonl` | no |
| 35.5 | one character inside `AUDIT_VERDICT_RULE` | no |
| 35.1 (absence) | rename `discovery/kiln-hours-1` | no |
| 28.10's guard (whole) | move `discovery/kiln-hours-1` aside | no |
| 28.10's guard (half) | move it aside, leave an empty `discovery/kiln-hours-1/` behind — the shape a directory guard misses | no |

Mutations on `run.json` and `answers.jsonl` are temporary, in place, and carry the `md5 -q` before/after
pair as their receipt (§Patterns, Task 8's VALIDATE). Restoring them is part of the check, not tidying
after it.

The 28.10 mutation is the one worth running twice — on HEAD and after the widening — because the
difference between the two runs *is* the coverage this ticket buys. A check that passes because it never
reached the thing it tested is this repo's largest class of process-review finding, by a wide margin.

---

## VALIDATION COMMANDS

Run from `/Users/Berzins/Desktop/Linards_current/wt-376` unless a command says `cd portal`.

### Level 1: Syntax

```bash
node --check tooling/build-checks.mjs
```

(CI `verify` `node --check`s every tracked `.mjs`, including files under `.claude/plans/` — memory:
*drift-check syntax-checks parked .mjs*. This plan is `.md`, so it is not in that set.)

### Level 2: The gate

```bash
node tooling/build-checks.mjs                                  # expected: build ✓  all 35 groups pass
node tooling/build-checks.mjs 2>&1 | grep '^build discovery ops'
node tooling/build-checks.mjs 2>&1 | grep '^build audit fixture'
```

### Level 3: The package and its projection

```bash
python3 -c "import json;r=json.load(open('discovery/kiln-hours-1/run.json'));print(r['entryMode'],r['posture'],r['depth'],r['frontEnd'],r['model'],r['endedAt'],len({t['turn'] for t in r['turnStats']}),len(r['turnStats']))"   # distinct turns, then entries
md5 -q discovery/kiln-hours-1/run.json discovery/kiln-hours-1/answers.jsonl   # the restore receipt, before and after Task 8's mutations
python3 -c "
import json,collections
print(dict(collections.Counter(o['op'] for o in map(json.loads,open('discovery/kiln-hours-1/transcript.jsonl')) if o['type']=='op')))"
wc -l discovery/kiln-hours-1/answers.jsonl                     # expected: 1
node discovery/prd-projection.mjs kiln-hours-1 --stdout | grep '^\*\*Run\*\*\|^\*\*Ledger\*\*'
diff <(node discovery/prd-projection.mjs kiln-hours-1 --stdout) discovery/kiln-hours-1/prd.md && echo "prd.md is the projection"
```

### Level 4: Manual validation (the drawer)

The three audit surfaces, observed in a real browser at `http://localhost:4749`:

1. the position line's `audit of a1 (N characters, md5 ………)` clause
2. the answer list's `the audited document · a1 · every question` pointer row
3. the package view's `Auditing a1 — N characters, md5 ………` line

plus the answer label hidden and the submit reading `Audit this question`, and the package view's counts
moving after each turn without a manual reload.

Stop the server **by PID**: `lsof -ti :4749 | xargs kill`. Never `pkill -f 'node server.mjs'`.

### Level 5: Not applicable

No VR gate, no drift-check, no `gen-handoff`, no `gen-loc-summary` — see §Traps that do not apply.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Task 4 — `--probe-audit`, one paid turn | **~$0.12** on `claude-sonnet-5` (observed: `$0.121 · 17.8 s · 4 SDK turns`, and `$0.055` on `claude-opus-5`, at `.claude/reports/discovery-postures-286-report.md:132–137`, from `node lib/discovery-transport.mjs --probe-audit`). This is the audit probe's OWN recorded cost, not #341's parenting probe | no — a de-risk, not a deliverable | note it in the report as skipped; Task 5 then carries the whole risk |
| **Task 5 — the recording through the drawer, six paid turns, OWNER'S HAND** | **~$0.34** (derived: **$0.337 over six banked turns = $0.0562 per turn** — #370's six-turn Grill audit on a 1187-character document, the sum of `costUsd` over the six `turnStats` entries, recorded at `.claude/reports/discovery-postures-286-report.md:165–166`, which also names 117.9 s and 14 SDK turns. Divide by the six banked turns, **never by the 14 SDK turns**. #370's run was a throwaway on a private port, deleted after, so there is no `run.json` to name — the report is the only record) | **YES — the package IS the deliverable; there is no #376 without it** | the ticket stays open and nothing lands. Do not commit a gate whose fixture does not exist. |
| Task 5 re-run, if the spread misses the floor | ~$0.34, **ceiling two paid attempts total** | yes | re-author §THE DOCUMENT first (free); a prompt tightening is the second lever and moves Grill's fingerprint |
| Task 5 escalation — a second `--probe-audit` after a prompt tightening | ~$0.12 (same row-1 source) | no | folded into the Task 5 re-run's two-attempt ceiling; skipping it means the re-run carries the prompt risk unobserved |
| Task 11 step 1 — #375's blank-idea turn (OPTIONAL) | ~$0.03–0.07 | no | #375 stays open |

Owner-only regardless of cost: the decision in §OPEN QUESTIONS Q1 (which document), Q2 (depth), and any
verdict on whether the recorded spread is good enough to keep. **This session must not write the owner's
half** — the honesty contract runs both ways.

Everything else in this plan is free: `--preflight` is zero tokens, and `openSession` is pure disk, so
Task 3's whole drawer observation costs nothing.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — `discovery/kiln-hours-1/` exists with `run.json` reading `entryMode: "existing-prd"`,
      `posture: "grill"`, `provenance: "fictional"`, `frontEnd: "portal"` and a non-null `endedAt`.
      `grep -l '"entryMode": "existing-prd"' discovery/*/run.json` returns it.
- [ ] **AC #2** — the run is REAL and recorded through the drawer: `answers.jsonl` holds exactly one
      server-written `kind: "document"` line, `transcript.jsonl` is the server's append-only record, and
      neither was hand-written or hand-edited. Six `scope-check` turns, Finish pressed.
- [ ] **AC #3** — `discovery/kiln-hours-1/prd.md` is `node discovery/prd-projection.mjs kiln-hours-1`'s
      bytes; the document renders as a pointer and its text and its `## ` heading are absent from the page.
- [ ] **AC #4** — case 28.10's committed block folds **both** packages behind an `existsSync` guard on
      `run.json`, and the reddening mutation on `ledgerView` is driven **twice**, with the claim stated as
      the presence or absence of one line rather than as an exit code: on HEAD there is **no
      `28.10: instrument-loans-1` line** (the build is red anyway, via group 29's synthetic case at
      `build-checks.mjs:5892` — that is expected and is recorded, not hidden); after the widening the line
      `28.10: kiln-hours-1 — the readers disagree on flag_weak_answer` **is** present. The guard's own
      REDDENS is driven in both shapes (the package moved aside, and moved aside with an empty directory
      left behind → a named failure and a `build ✗` summary line, not a stack trace).
      **The report states the `open_question` outcome either way**, in these words or their equivalent:
      *"the audit package folds `open_question` N; at N = 0 the `open_question` comparison in 28.10
      remains zero-against-zero for both packages and that half of problem 1 stays open."* Ticking this
      AC does **not** claim both verb gaps closed.
- [ ] **AC #5** — `build-checks` group 35 reads the package from disk, fails by name when it is absent,
      and passes: `build ✓  all 35 groups pass`. Its three reddening mutations are each driven and
      restored, and for the two that touch `run.json` and `answers.jsonl` the
      `md5 -q discovery/kiln-hours-1/run.json discovery/kiln-hours-1/answers.jsonl` pair taken before the
      first mutation is re-taken after the last restore and recorded as identical in the report.
- [ ] **AC #6** — the drawer's three audit surfaces observed rendering off disk, recorded in the report
      with the observed character count and md5.
- [ ] **AC #7** — `--preflight` green, and `--probe-audit` **exiting 0** — that is ANSWERED, UNEVIDENCED
      or DODGED — **and, when the closer is a `record_decision`** (ANSWERED or UNEVIDENCED), a `wrong_if`
      read of QUOTED or PARAPHRASED. On DODGED there is no `wrong_if` at all
      (`portal/lib/discovery-transport.mjs:517`, printed only under `if (r.wrongIf)` at `:683`) and the
      AC is met without one. ABSENT and an AUTHORED `wrong_if` both exit 2 and do **not** meet it. Both
      runs recorded in the report with their costs.
- [ ] **AC #8** — `discovery/README.md` §The audit fixture and `.claude/references/gates.md` Group 35
      both written, naming §THE DOCUMENT in this plan as the document's only record of origin.
- [ ] **AC #9 (OPTIONAL)** — #375's three observations written into
      `.claude/reports/discovery-portal-width-288-report.md`, replacing its "A live paid turn was not
      run" block; #375's throwaway packages deleted.
- [ ] The PR body carries `Closes #376` (and `Closes #375` only if AC #9 is met). A title mentioning
      `(#376)` closes nothing.
- [ ] The plan, the report and the review all ride in the same PR
      (`.claude/plans/discovery-audit-fixture-376.md`, `.claude/reports/discovery-audit-fixture-376-report.md`,
      `.claude/code-reviews/pr-<N>-review.md`).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order — the gate work **after** the package is on disk
- [ ] Each task's VALIDATE run and its output recorded in the report
- [ ] Every REDDENS driven, its message observed, and the mutated file restored
- [ ] `node tooling/build-checks.mjs` → `build ✓  all 35 groups pass`
- [ ] `git status --short discovery/` shows `kiln-hours-1` and nothing else
- [ ] `run.json` and `answers.jsonl` were never authored, never edited to change what the run says, and
      were **restored byte-identical after Task 8's temporary gate mutations, md5 re-checked** — the two
      `md5 -q` pairs pasted into the report. `prd.md` is generated and regenerable; every other file under
      `discovery/kiln-hours-1/` is the server's
- [ ] The report's **Not run** section carries a tracker for every paid row not run
- [ ] Every figure in the report names the command that produced it

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 (owner) — which document?** This plan **decides**: a purpose-authored fictional PRD, §THE DOCUMENT.
It is the only option that can be shaped to land the two verbs the gate is missing, and it is legitimate
operator input under the same rule as `instrument-loans-1`'s pre-registered answer sheet.
The alternative considered and rejected: auditing a committed fictional `prd.md` — most cheaply
`instrument-loans-1/prd.md` at 17292 bytes (`wc -c`) — which is elegant (the projection's own output
audited) but has an unpredictable verdict spread and costs more per turn. `allergen-matrix-1/prd.md` at
61956 bytes is roughly 15k tokens in the system prompt on **every** turn, unobserved and dear. The
`graded-*` projections are fixture runs excluded from the metric reads, so auditing them would be odd.
`docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` is a trap — see Task 5's GOTCHA.
**If the owner prefers a committed `prd.md` as the subject, only §THE DOCUMENT and Task 5's table
change; every other task stands.**

**Q2 (owner) — depth and completeness?** This plan decides: a **complete `scope-check`**, six questions,
about $0.34. That is the one audit shape whose cost is directly **observed** (#370), and it gives the
gate a full closer set and a meaningful gap list. A 2–3 turn partial at ~$0.11–0.17 is committed
precedent (`spine-meridian-1`), and group 35's floor of 3 admits it without any code change — so the
owner can stop early at Task 5 and the gate still passes.

**Q3 (owner) — the fingerprint tripwire?** This plan decides **yes** (35.5), and states the price
plainly: any edit to `AUDIT_VERDICT_RULE`, `AUDIT_WRONG_IF_RULE`, `GRILL_STANCE`, the shared rules or
Grill's turn template moves `POSTURES.grill.fingerprint` and makes this recording stale **by name**,
costing about $0.34 plus a probe to re-record. That is the same bargain group 32 already took, and it is
the only thing that makes a recording evidence about the prompt **in the tree** rather than about a
prompt that once existed. If the owner would rather not pay it, delete 35.5 alone — every other case
stands and the group stays worth having.

**Q4 (owner) — one run for #375 and #376, or two?** Task 11 is written as optional and costs
~$0.03–0.07 extra. If #375 should stay a pure observation of its own, skip it; nothing breaks.

**Assumptions this plan makes:**

- Grill's prompt surface has not moved since #370: `POSTURES.grill.fingerprint` is
  `76b7847d4ebbd9d8f16f9726ff0f4f0f` and #370's six turns carry `76b7847d…`. Verified this session by
  driving the module. If it has moved by the time Task 5 runs, `--probe-audit` (Task 4) is what says so.
- The API spend limit that blocked #370 was the owner's own Console limit and was raised on 2026-09-04.
  This is not gated on 2026-10-01. A 400 naming "specified API usage limits" is that self-set limit; a
  tier cap arrives as a 429 instead.
- Nothing in CI enumerates `discovery/` — every gate names its slugs. Verified:
  `grep -rn readdirSync tooling/*.mjs agent-layer/*.mjs portal/lib/*.mjs | grep -i discov` returns
  nothing, `exit=1`. So the new package changes no gate on its own and cannot break one; naming it in
  `build-checks` is a deliberate edit. 33.14's tracked-source sweep matches `graded-(think|opus)-[abc]`
  only, so a non-`graded-` slug named in `build-checks` is clean.

---

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

Everything below was driven in
`/Users/Berzins/Desktop/Linards_current/wt-376` at `31a46e8` (merge of PR #377), branch `feat/376-plan`.

**1. Every VALIDATE that touches existing code, driven.**

| Command | Observed |
|---|---|
| `node tooling/build-checks.mjs 2>&1 \| tail -1` | `build ✓  all 34 groups pass` |
| `grep -l '"entryMode": "existing-prd"' discovery/*/run.json; echo exit=$?` | no output, `exit=1` |
| `node discovery/prd-projection.mjs instrument-loans-1 --stdout \| grep '^\*\*Ledger\*\*'` | `15 op(s): record_decision 12 · flag_weak_answer 0 · open_question 0 · file_evidence 3 · flags: no-evidence 10 · orphan 0` |
| `python3` Counter over `instrument-loans-1/transcript.jsonl` | `{'file_evidence': 3, 'record_decision': 12}` |
| `node -e "…selectDepth(d).length…"` for the four depths | `scope-check 6 · opening-set 12 · full-discovery 30 · whole-bank 65` |
| `node -e "…SECTIONS.length…"` | `11` |
| `node -e "…resolvePosture…"` | `grill`/default → `76b7847d4ebbd9d8f16f9726ff0f4f0f`; `grill`/`claude-opus-5` → `ba124c3c1edb19905101aceca7c12e22` |
| `grep -rn readdirSync tooling/*.mjs agent-layer/*.mjs portal/lib/*.mjs \| grep -i discov` | nothing, `exit=1` |
| `for d in discovery/*/; do … run.json …` | all seven `blank-idea`, all `portal`; `spine-meridian-1` is `scope-check` with 3 turnStats and `endedAt` set |
| `for f in discovery/*/prd.md; do echo "$f $(wc -c < $f)"` | 61956 / 16947 / 17234 / 92112 / 75508 / 17292; `spine-meridian-1` has none |
| `md5 -q docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md; wc -c` | `ab6eb0ee6cdd3b7802ecfcbe90db2377`, 24560 bytes |
| `grep -rn "kiln" .` | nothing — the slug is free |

**2. The projection CLI over a document-kind package, driven end to end.** A synthetic package was built
in the scratchpad by running the **real applier** (`applyOps`, not a hand-written ledger) over one
document answer with three closing ops (`record_decision`, `flag_weak_answer`, `open_question`), then:

```
node discovery/prd-projection.mjs --root <scratch>/auditpkg376 --stdout   →   exit=0
**Run** — `audit-scratch` · … · entry existing-prd · … · posture grill · … · 0 turn(s)
**Ledger** … 3 op(s): record_decision 1 · flag_weak_answer 1 · open_question 1 · file_evidence 0 · flags: no-evidence 1 · orphan 0
_[the audited document — answer a1, 105 characters, verbatim in answers.jsonl]_        ×3
grep -c "Injected heading\|A fictional PRD fragment"  →  0
grep -c '^## '  →  11
```

So the CLI tolerates a document-kind answer, renders the pointer and keeps the text and its injected
heading off the page. **This is a fact for the plan, not a defect** — and it is the fourth uncovered
surface the issue does not name.

**3. Landed / missing claims checked against the tree.**

- *Missing, confirmed:* no committed `existing-prd` package (grep, `exit=1`); no `readdirSync` over
  `discovery/`; no plan in `.claude/plans/` yet carries a "Paid and owner-only" table
  (`grep -arln "Paid and owner-only" .claude/plans/` → nothing), so this plan is among the template's
  first users, as briefed.
- *Present, confirmed:* every symbol group 35 needs is already imported at `build-checks.mjs:236–275` —
  so "add an import" would have been a wrong task. `readPackage` is imported "for group 32 alone"
  per its own comment at `build-checks.mjs:272`; group 35 is the second reader, so that comment is false
  the moment the group lands. **It is now step (i) of Task 8's IMPLEMENT**, not a note here — no gate can
  see a rotted comment, so a line that lives only in NOTES gets skipped.
- *Present, confirmed, and NOT an import:* the one-line helpers. `grep -n 'const keys = ' tooling/build-checks.mjs`
  returns a single hit, `6040`, inside group 30's block. Group 35 is a new block and must declare its own
  `threw` / `same` / `keys`, per the file's convention
  (`grep -n 'const threw = (fn)'` → `1992, 5562, 6032, 7559, 8146, 8665`).
- *Present, confirmed:* the drawer carries **both** `#discovery-document` and
  `#discovery-document-path` (`portal/public/index.html:218–225`), so the paste route needs no change.

**4. Task/GOTCHA reconciliation.** Three conflicts were found and resolved in the plan:

- The brief said "prove the mechanism with a `--dry` run". **There is no `--dry` for a discovery
  session** — `discovery-transport.mjs:665–670` reads exactly `--preflight`, `--probe-parenting`,
  `--probe-fence`, `--probe-audit`, and `--dry` belongs to `discovery-proposer.mjs`. Task 2 states the
  correction explicitly and substitutes `--preflight` + Task 3's zero-token drawer open.
- The plan first intended `documentPath` to a scratch file so the md5 would be derivable. **Dropped.**
  Nothing needs a plan-derived md5, a paste's trailing newline would make one a trap rather than a
  receipt, and `answers.jsonl` is already the canonical copy. Every gate figure derives from
  `doc.text.length` on disk.
- The plan first intended 35.5 to assert `POSTURES.grill.fingerprint` directly. **Dropped** after
  driving `resolvePosture`: the stamp is recomputed on a model override, so 35.5 derives from
  `run.model`. `AUDIT_FINGERPRINT_INPUTS` carries a **synthetic** document, so the run's own document
  can never move the stamp — which is exactly what makes the tripwire meaningful.

**5. Known traps carried.** Every one below is written into the task it applies to.

- A fingerprint change stales committed recordings **by name** → Task 8's GOTCHA and Q3.
- `openSession` **resumes** an existing `run.json`; a slug is never re-run without `rm -rf` first →
  Tasks 3, 5, and the README procedure.
- Kill servers **by PID/port only** — never `pkill -f 'node server.mjs'`, which kills sibling sessions'
  recorders → Tasks 3, 5, Level 4.
- An SDK result can wear `subtype: "success"` with `is_error: true` → Task 4.
- CI `verify` `node --check`s every tracked `.mjs`, including `.claude/plans/` → Level 1 (this plan is
  `.md`, so it is outside that set).
- The drawer **proposes full discovery** for an existing PRD → Tasks 3 and 5, twice.
- `ok()` accumulates rather than aborting, so one mutation yields several messages → Task 7's REDDENS.

**6. Adversarial pre-flight against this plan — ten findings, all ten re-derived against the tree, all
ten answered.** Six were medium and none survives. Every claim below was checked in this worktree at
`31a46e8` before the plan was changed for it.

| # | The finding | Checked how | What changed |
|---|---|---|---|
| F1 | 35.2's `keys` helper is block-scoped to group 30, so group 35 as sketched throws `ReferenceError` — which also falsifies the opening claim that everything is "already in scope" | `grep -n 'const keys = ' tooling/build-checks.mjs` → one hit, `6040`, inside group 30's block (which runs to `group("discovery", …)` at `7541`, the reason case 33's pin at `:7244` can call it). `grep -n 'const threw = (fn)'` → `1992, 5562, 6032, 7559, 8146, 8665` — the file re-declares per group | **Holds.** `keys` added to the §Patterns sketch; the opening sentence now says "every module symbol" and names the helpers as block-scoped; the clause repeated in Task 8's IMPORTS, where an implementer reading "none" would otherwise skip the declaration |
| F2 | Task 7's guard tests the DIRECTORY, so a directory with no `run.json` crashes the gate — the failure the GOTCHA says it prevents. The claim that it mirrors group 32's guard is false | Read `tooling/build-checks.mjs:8165` — group 32's guard is `existsSync(join(root, "run.json"))`, the file. Drove `readPackage("discovery/kiln-hours-1")` → `prd-projection: no run.json at discovery/kiln-hours-1/run.json — that is not a run package` (`discovery/prd-projection.mjs:733`), and `ok()` does not catch | **Holds.** The guard is now `existsSync(join(ROOT, dir, "run.json"))`, computed once into `const present`; the PATTERN line says which half of `:8165` it mirrors; a second REDDENS drives the half-deleted shape; the ROOT-joined-vs-cwd-relative asymmetry is named |
| F3 | AC #4 requires the `ledgerView` mutation to be "green on HEAD"; on HEAD the build is RED | Read `tooling/build-checks.mjs:5883–5892` — group 29's synthetic fold builds records from a `weak()` op (`:5578`) and iterates `DISCOVERY_OPS`, so `counts.flag_weak_answer 0` against `1` reddens it. `ledgerView`'s `total` is `list.length` (`discovery/ops.mjs:145`), independent of `counts`, so the committed block's `total` assertion still passes | **Holds.** AC #4 restated as the presence or absence of one named line, with the red build recorded rather than hidden; one sentence added to §Problem Statement 1 naming `:5892` and narrowing the gap to the committed-package cross-reader path; the same clause added to Task 7's REDDENS |
| F4 | 35.6 re-couples distinct turns to `closers.length`, which the floor was chosen to decouple; an honest run whose last turn yielded without closing goes red | Read `discovery/ops.mjs:273, 293, 304` — `closes` is per verb and an off-script op closes nothing — and `portal/lib/discovery.mjs:804–805`, called at `:1039`, which appends a `turnStats` entry per submit regardless. `.claude/plans/discovery-parent-id-341.md:802` documents the re-submit. 32.2a's own comment says the count is of distinct turns, not entries (`tooling/build-checks.mjs:8173–8174`) | **Holds.** 35.6 now asserts a prefix in order and `N >= closers.length` with the delta reported; a GOTCHA states the mechanism; 35.9's ✓ line carries distinct turns, entries and closers separately; Task 5's VALIDATE and Level 3 count distinct turns; two Edge-case rows added |
| F5 | AC #7 is unsatisfiable on a `probe DODGED`, which Task 4's own VALIDATE accepts at exit 0 | Read `portal/lib/discovery-transport.mjs:511–517` (`wrongIf` computed for `record_decision` only), `:533–534` (`pass` includes DODGED unconditionally; ABSENT and an AUTHORED wrong-if exit 2; no closer exits 3) and `:683` (the line prints only under `if (r.wrongIf)`) | **Holds, and reaches further than the finding.** ABSENT is inside the four and still exits **2**, so "a verdict inside the four with exit 0" would have been unsatisfiable too. AC #7 is now written to the exit-0 set with the `wrong_if` requirement conditional on the closer; Task 4 gains a GOTCHA with the three exits; Task 10's re-record step 1 now reads the exit code and names a lever for exit 2 and exit 3 |
| F6 | Task 8's REDDENS (a) and (b) hand-edit the two server-written files with no byte-level restore check, while the completion checklist asserts neither was opened | Read `discovery/README.md` §Honesty rules (both files) and the checklist line. Confirmed git collapses an untracked directory to one `??` line, so a botched restore is invisible there. Confirmed the mutation cannot move off-tree: group 35 reads `join(ROOT, "discovery", AUDIT_SLUG)`, and a whole-repo copy dies at `tooling/build-checks.mjs:5395` (`fatal: not a git repository`, driven this session) | **Holds.** §Patterns gains an md5 receipt block stating that the mutation is a temporary in-place gate proof and why a throwaway copy is not available; Task 8 carries a mandatory `md5 -q` before/after VALIDATE; the checklist line now reads "restored byte-identical, md5 re-checked"; AC #5 requires both pairs in the report |
| F7 | Task 8's placement misnames group 34's call and misdescribes the summary line's position | `grep -n 'group("proposals"'` → **9396**, not the 9401 the finding cites; `}` at `9397`, `// --- the verdict` at `9399`, the standalone guard `9401–9407` with the summary at `9406`. The `build ` prefix is added inside `group()` at `:306` and `:311` | **Holds** (the substance; the finding's own line numbers were off by five, corrected here). Placement is now "after group 34's closing brace at `:9397`, before the `// --- the verdict` marker at `:9399`", with the guard's extent stated and the "last statement in the file" clause dropped |
| F8 | The paid table has no row for the re-probe Task 5's escalation prescribes | Read Task 5's GOTCHA lever (2) and `portal/lib/discovery-transport.mjs:670` — "the parenting and audit probes spend ONE paid turn each" | **Holds.** Row added, folded into the two-attempt ceiling |
| F9 | Both paid figures come from weaker sources than the tree already holds, and neither names its source | `.claude/reports/discovery-postures-286-report.md:132–137` records the audit probe's own cost (`$0.121` Sonnet, `$0.055` Opus); `:165–166` records `$0.337` as "the sum of `costUsd` over the six `turnStats` entries" beside 117.9 s and 14 SDK turns | **Holds.** The Task 4 row now cites the audit probe's own observed cost instead of #341's parenting probe, and Phase 2 and Task 10 move with it; the Task 5 row reads "$0.337 over six banked turns = $0.0562 per turn", says not to divide by 14, and records that #370's run was a deleted throwaway so no `run.json` is nameable |
| F10 | The `readPackage` comment edit is named only in NOTES, so it will be skipped | `tooling/build-checks.mjs:272` — "is imported for group 32 alone, because its subject IS the on-disk package (#341)." No task listed it; no VALIDATE could catch it | **Holds.** It is now step (i) of Task 8's IMPLEMENT, and the NOTES entry points at the task rather than carrying the work |

Nothing was rejected. Two of the findings' own citations drifted and are corrected above: F7's line numbers
(9396/9397/9399, not 9401/9403) and F5's (`:512` for DODGED and `:533` for `pass`, not `:513`/`:532`).
Group 32's `else { group("parenting", ""); }` branch was checked at `tooling/build-checks.mjs:8218–8220`
and **is** present with the same comment, so the §Patterns sketch's `else` is a faithful mirror, not an
improvisation. Group 32's stated extent was tightened from `8125–8223` to `8125–8221`, its actual closing
brace.

### Traps that do NOT apply, and why

Stated so the implementer does not go looking:

- **`gen-loc-summary` / the two `approach.html` VR baselines** — the three group regexes are
  `^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$` and `^agent-layer/[^/]+\.mjs$`
  (`agent-layer/gen-loc-summary.mjs:22–26`). `discovery/` matches none, and nothing here adds a tracked
  file under `system/`, the repo root or `agent-layer/`. **No baseline cascade.**
- **`gen-handoff`** — that chain fires on a `system/tokens.source.json` change. This ticket touches no
  token.
- **The visual gate** — Linux-baseline, fails locally on macOS, and the portal is not in #271's VR page
  set at all (architecture §Boundaries). Not run, not relevant.
- **`drift-check`** — never run by this ticket (it writes `handoff/`), and `prd.md` is deliberately the
  one generated artifact outside it. The mid-merge false-positive trap therefore cannot apply.
- **`param-manifest` / `param-count`** — no new live-manipulable control on a shipped page.

### Why a new group rather than extending group 32

Group 32's header says what it is: "the parenting fixture (#341)", and its subject is what the agent
chose about `parent_id` against a real ledger. An audit fixture's subject is a different claim under a
different posture with a different fingerprint. Groups 33 and 34 each took a number for the same reason.
The cost is four hand-maintained `34 → 35` edits (Task 9) and one new `gates.md` entry — mechanical, and
the precedent is two tickets old.

### What this ticket does NOT close, honestly

- The per-seq `visible`/`latest` assertion still rests on one synthetic fixture, permanently. An audit
  cannot supersede.
- The drawer's rendering still has no gate and cannot get one. What the committed package buys is a
  **repeatable zero-token operator observation**: resume the slug and the three audit surfaces render
  off disk, for free, forever.
- Whether Grill reaches the right verdict **tomorrow**, under an unchanged prompt or a newer SDK, is
  `--probe-audit`'s to re-observe. Group 35 observes one session.

### The build brief

The skill's hand-off step asks for a `.html` build brief beside the plan. **Not written** — this session
may write only `.claude/plans/discovery-audit-fixture-376.md`. If the owner wants one, it is a
five-minute follow-up against this plan's §Feature Description, §THE DOCUMENT and the phase list.

## AMENDMENTS

- (none yet)
