# Feature: Run 2 — the pre-grill fixture audited in existing-PRD mode (#292)

The following plan should be complete, but validate documentation and codebase patterns and task sanity
before you start implementing. Pay special attention to the names of existing exports and the argument
shapes of `openSession`, `probeFence`, `resolvePosture` and `sessionView` — every one was read this session
and is cited by line below.

## Feature Description

Run 2 is the second of the epic's two pre-registered measurements. The frozen pre-grill draft of this
epic's own PRD (`docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md`, md5
`ab6eb0ee6cdd3b7802ecfcbe90db2377`) is fed into the existing-PRD entry mode: Grill audits it against
23 banked questions at full discovery with the `hasModel` facet ticked, so the AI-interaction module's
seven questions fire for the first time on a real package. Out comes a committed run package under
`discovery/partner-audit-2/`, whose projected `prd.md` is the revised PRD and whose Weak answers, Open
questions and "resting on no evidence" line are the gap list.

The score is the share of the eight findings the 2026-08-27 grill produced that the run reached on its
own, itemised found / partial / missed against a rubric committed **before** the first turn. The owner
wrote the document but not the gaps in it, so contamination is far lower than run 1's.

Grill's model is a per-run choice the architecture deliberately left open for this run to settle. The
choice is recorded in `run.json.model`, every turn stamp follows it, and the score is reported as a
reading of that model-and-prompt pairing, never of the design alone.

## User Story

As the owner of the discovery epic
I want the pre-grill PRD audited by the product itself, scored against what a human grill found
So that I know whether the audit mode finds real gaps in a real document, and whether the AI-interaction
module asks questions that matter, before the epic's close-out (#293) reads the metric.

## Problem Statement

Three things the epic promised have no observation behind them: the existing-PRD entry mode has never run
to completion (`partner-audit-1` is three turns of twelve, ended early), the AI-interaction module has
never fired on any package (README §The bank's width calls it known debt), and the "Gap finding" success
metric has no number. #370 proved the audit prompt's wrong-if behaviour on both models; nothing has yet
measured what the audit *finds*.

## Solution Statement

Mirror run 1's discipline with the audit mode's simpler mechanics:

1. **Preconditions, in the ticket's order, each provable from git or a running function** — the fixture's
   md5 (already CI case 28.9; re-checked on the stored bytes after the session opens), the fence proven
   three ways (the CI predicate, the paid `--probe-fence` on run 2's shape, and the real run's own
   `MAIN_TOOLS = []` with zero denied built-in lines), then the run.
2. **A pre-registered rubric**, committed before the sitting, that pins for each of the eight findings the
   fixture passage it hangs on, the claim a transcript line must make to count, and whether the finding is
   reachable at all from inside the fence. Scoring after the fact against a rubric written after the fact is
   the inflation the seal guarded against on run 1.
3. **One command that says the sitting may start**: `tooling/run-2-ready.mjs`, six free checks, the same
   shape as `tooling/run-1-ready.mjs`.
4. **The sitting through the drawer** — 23 clicks of "Audit this question", nothing typed per turn — on the
   model the owner confirms (D1 recommends `claude-opus-5`).
5. **The readings** off `runMetrics`, `auditTraceability`, `turnStats` and a wrong-if classification that
   reuses the audit probe's own fold, then the gate cascade (a second Grill carrier moves two pins), the
   README, gates.md and the report.

## Out of Scope / Non-Goals

- **Not re-recording `partner-audit-1`.** It stays the audit fixture (#376), three turns, sonnet. Run 2 is a
  second package beside it, not a replacement.
- **Not touching the audit prompt.** `AUDIT_VERDICT_RULE` and `AUDIT_WRONG_IF_RULE` were probed on both
  models under #370 (exit 0, no AUTHORED wrong-if) and Grill's stamp `76b7847d…` is unchanged since. A bad
  run here is re-run under a tightened constant only if an AUTHORED wrong-if appears — the #370 protocol,
  at most three paid attempts.
- **Not widening `MAIN_TOOLS` to `['Read']`.** The document rides in the system prompt (#286); the fence
  is proven by probe and by construction, not exercised by the real run. Widening is a separate decision.
- **Not fixing the two #370 readings** (ABSENT never fired; a decision re-filed under a second question).
  They are expected on this run and are reported, then routed to #293.
- **Not the marginal-reach reading.** That row is run 1's (#293 carries its debt). Run 2's metric is Gap
  finding alone.
- **Not amending the PRD or the architecture doc** beyond nothing — the two uncommitted edits to
  `docs/epics/discovery-partner.{prd,architecture}.md` in the working tree are another session's and are
  left alone (run 1's A5, the owner's call; stage by explicit path).
- **No hand-written or hand-edited run output**, and no re-run to improve a score. A mechanism failure
  (credit error mid-run, a server crash) is the only re-run trigger, and the duplicates it leaves stay.

## Feature Metadata

**Feature Type**: New Capability (a measurement run) with a small gate cascade
**Estimated Complexity**: Medium — the code is ~120 lines; the risk is the paid sitting and the reading
**Primary Systems Affected**: `discovery/partner-audit-2/` (new), `tooling/run-2-ready.mjs` (new),
`tooling/build-checks.mjs` cases 30.46 and 32.7, `discovery/README.md`, `.claude/references/gates.md`
**Dependencies**: `@anthropic-ai/claude-agent-sdk` through the portal (already installed); Claude Code CLI
login on this Mac (`HAS_TOKEN` is `false`, observed — the documented fallback); Console spend headroom

## Related Work

**Implements**: [#292](https://github.com/linardsb/ux-factory/issues/292) · **Epic**: #279 —
`docs/epics/discovery-partner.prd.md` MVP 13 and §Success metrics row "Gap finding (run 2)";
`docs/epics/discovery-partner.architecture.md` §Boundaries & contracts (the fence, the frozen-fixture gate)
and "Grill's model is deliberately left open"

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/discovery-faster-payment-run-291.md` — Why: the pre-run gate shape, the receipts layout
  under `.claude/reports/<ticket>/`, the reading tasks (T9/T10) and the cascade lesson (T11: eight sites,
  grep the number beside the noun)
- `.claude/plans/discovery-postures-286.md` — Why: the audit mode's mechanics, `resolvePosture`, the
  document store, and the #370 protocol on an AUTHORED wrong-if
- `.claude/plans/discovery-read-fence-287.md` — Why: the fence predicate and `--probe-fence`'s run-2 shape
- `.claude/reports/discovery-postures-286-report.md` §#370 — Why: the only observations of the audit
  prompt on both models, and the two readings run 2 must expect

**Forward-references**: #293 (epic close-out) takes the Gap finding row, the model pairing verdict, and
whatever the run says about the two #370 readings.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `portal/lib/discovery.mjs:742-800` — `openSession({ slug, provenance, entryMode, depth, facets,
  frontEnd, posture, model, document, documentPath, reads })`: `documentPath` resolves against `REPO_DIR`,
  the bytes are stored verbatim by `appendDocument` after `writeRun`; `facets` are declared on any entry
  mode; `selectDepth(depth, declared)` throws on an overflowing vector.
- `portal/lib/discovery.mjs:867-895` — `sessionView(root)`: `document: { ref, chars, md5 }` is the
  freeze check on the stored bytes; `metrics` is `runMetrics`.
- `portal/lib/discovery.mjs:697-724` — `runMetrics`: `completion`, `notAForm`, `weak`, `coverage`,
  `askedWhatMattered` (full-discovery only; `modules` names what composed).
- `portal/lib/discovery.mjs:198-232` — `allowSetFor` / `allowsPath` / `fenceDecision`: the predicate the
  pre-run gate and case 23 drive.
- `portal/lib/discovery.mjs:568-611` — `DEPTH_PROPOSAL['existing-prd'] = 'full-discovery'`,
  `ENTRY_POSTURES['existing-prd'] = ['grill']`, `RE_ASKS['existing-prd'] = false` (an audit never holds).
- `portal/lib/discovery-postures.mjs:224-232` — `AUDIT_VERDICT_RULE`, `AUDIT_WRONG_IF_RULE` (read them;
  do not edit them). `:781-785` `MODELS`, `MODEL_SETTABLE`; `:859` `resolvePosture({ posture, model })`.
- `portal/lib/discovery-transport.mjs:80` — `const MAIN_TOOLS = Object.freeze([])`: the real audit run
  advertises no built-in tool. `:522-576` `probeAudit` — the wrong-if fold (`fold`, four-letter tokens,
  60% threshold) T10 reuses verbatim as a read. `:612-734` `probeFence({ shape })`, default `'run-2'`.
- `tooling/run-1-ready.mjs` — the whole file: `tracked` / `committedAt` / `matchesHead`, the check order,
  the `CANNOT REACH` header line, the inverted check 5. T3 mirrors it.
- `tooling/build-checks.mjs:5910-5919` — case 28.9, the fixture md5 gate (already exists; do not add a
  second). `:6946-6961` case 23's run-2 rows (the predicate on run 2's shape, already exists).
  `:7966-8008` case 30.46 (Grill's pin at 7997 names `partner-audit-1` in prose — moves in T11).
  `:9047-9055` case 32.7 (the three recorded stamps pinned current-to-literal — gains a row in T11).
- `discovery/bank.mjs:978-991` — `MODULES.hasModel`: seven ids, budget 7. `:964-970` `FACETS`.
- `discovery/README.md:94` (the `partner-audit-1` row, "the only committed existing-prd run"),
  `:218-262` §The audit mode, `:336` (the `reads` bullet's "Run 2 names its frozen fixture here" — stale
  since #286), `:829-931` §The read fence (the "not reproducible" paragraph at the end).
- `.claude/references/gates.md:90` (the fence probe), `:92` (the audit probe), `:94` (the run-1 gate).
- `.claude/reports/discovery-postures-286-report.md:124-188` — §#370: the verdict table, the two readings.
- `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md:145-222` — §MVP, where six of the
  eight findings hang; `:50-53` (Evidence rows "33 decisions", "10 stages, ~30"); `:104`, `:126` (an
  existing PRD named as an entry); `:274` (parity in Open questions).
- `docs/epics/discovery-partner.prd.md:327-341` — MVP 13, the eight findings as the PRD states them;
  `:363` the Gap finding metric row; `:240-250` the Stage 10 / five-questions cut; `:91-95` parity.

### New Files to Create

- `docs/epics/fixtures/discovery-partner.run-2-rubric.md` — the pre-registered scoring rubric (T2)
- `tooling/run-2-ready.mjs` — the pre-run gate (T3)
- `discovery/partner-audit-2/{run.json,answers.jsonl,transcript.jsonl}` — server-written by the sitting (T7)
- `discovery/partner-audit-2/prd.md` — generated by the projection (T8)
- `.claude/reports/discovery-pre-grill-audit-run-292/` — receipts: `probe-fence.shape-run-2.out.txt`,
  `probe-fence.shape-run-2.trace.jsonl`, `probe-audit.<model>.out.txt`, `wrong-if-read.out.txt`
- `.claude/reports/discovery-pre-grill-audit-run-292-report.md` — the report

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/discovery-partner.prd.md` MVP 13 and §Success metrics "Gap finding (run 2)" — the key, the
  measurement, the cobra check ("the findings list is printed in this file … omission is not a fence")
- `docs/epics/discovery-partner.architecture.md:209-216` (the fence as an allow-list, run 2's key one
  directory above the fixture), `:251-256` ("Grill's model is deliberately left open … a reading of that
  pairing"), `:302-307` (the frozen-fixture gate — landed as case 28.9)
- `discovery/README.md` §The audit mode — the four verdicts, "prd.md projected from an audit run IS the
  revised PRD", the freeze check
- Memories: `discovery-run-cache-ttl-cost` (warm cache only inside 5 min), `api-usage-limit-until-2026-10-01`
  (a "specified API usage limits" 400 is the owner's Console spend limit), `sdk-error-result-wears-success`
  (an error turn wears `subtype: success`), `portal-smoke-port-scoped-kill` (kill by PID, never by name),
  `gate-prose-has-three-copies` (grep the number beside the noun), `honesty-contract-mirror-direction`
  (never write the owner's half)

### Patterns to Follow

**The pre-run gate** — `tooling/run-1-ready.mjs:56-79`: `tracked()` via `git ls-files --error-unmatch`,
`committedAt()` via `git log --format=%cI %aI -1 --`, `matchesHead()` via `git diff --quiet HEAD --`;
checks throw `check N — <message> (precondition K)`; the CLI prints `run-1 ready ✓ …` or `run-1 ✗ …` and
exits 1. The header carries a `CANNOT REACH` line (PR #405 review F2).

**A gate pin that derives its prose** — `tooling/build-checks.mjs:7976-7985`: `packages` read off disk,
`carriers(hex)` and `turnsCarrying(...)` derive the message, so a case can only ever name the truth.

**Receipts** — `.claude/reports/discovery-faster-payment-run-291/probe-fence.shape-run-1.out.txt` and
`.trace.jsonl`: the probe's stdout committed verbatim, the trace produced by `DISCOVERY_FENCE_TRACE=<path
outside every run root>` on the same command.

**The report's What ran table** — `.claude/reports/discovery-later-not-never-run-393-report.md:200-216`.

**Honesty** — `discovery/README.md:23` and CLAUDE.md: nothing under `discovery/partner-audit-2/` is typed
or edited; an audit types nothing per turn, so the only human input is the session-start form.

---

## IMPLEMENTATION PLAN

### Segments, and the hard stop

**Segment A (T0–T6) is free or cheap and ends with a green `run-2-ready`.** Everything in it is committed
before the sitting; the rubric's commit is what makes the score pre-registered. **Segment B (T7) is the
sitting, owner-triggered.** **Segment C (T8–T13) reads the package and lands the cascade.** Nothing in C
touches the three server-written files.

### Phase 1: Preconditions in order (T0–T3)

Branch from `origin/main` (`d0e65fa`, #405 merged); the rubric; the gate.

### Phase 2: Prove it before spending (T4–T6)

**Depends on:** Phase 1 (the gate exists). Zero-token composition and portal checks, then the two cheap paid
probes: the fence on run 2's shape (precondition 2's run-time half; also repairs the stale #287 receipt) and
one audit turn on the chosen model (the spend-headroom check and the last look at the wrong-if behaviour).

### Phase 3: The sitting (T7) — OWNER-TRIGGERED

**Depends on:** `run-2-ready` exit 0 and D1 confirmed. 23 clicks, then Finish.

### Phase 4: The readings and the cascade (T8–T13)

**Depends on:** Phase 3. The projection, the metrics, the Gap finding score, the wrong-if read, the two
gate pins, the docs, the report.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### T0 · BRANCH from `origin/main`

- **IMPLEMENT**: `git fetch origin main && git switch -c feature/discovery-pre-grill-audit-292 origin/main`.
  Confirm `git log -1 --format=%h origin/main` → `d0e65fa`. The working tree carries another session's
  uncommitted edits to `docs/epics/discovery-partner.{prd,architecture}.md` and
  `agent-layer/gen-decisions.mjs`, plus untracked `discovery/prd-projection.mjs.bak2` and `portal/app.js`:
  leave every one alone, stage by explicit path throughout (memory `shared-worktree-parallel-sessions`).
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass` (observed on this tree at
  plan time).
- **SATISFIES**: none directly; the baseline.
- **REGENERATES**: none.

### T1 · RE-VERIFY the fixture's md5 on disk — precondition 1, first half

- **IMPLEMENT**: `md5 -q docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` and quote it in
  the report. Case 28.9 (`tooling/build-checks.mjs:5910-5919`) already gates it in CI with a newline
  mutation; do **not** add a second md5 case.
- **GOTCHA**: the file is 24,560 bytes and 24,355 characters (PR #369 review F1). The md5 is over the
  bytes; `sessionView().document.chars` is characters. Quote both nouns correctly.
- **VALIDATE**: `md5 -q docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` →
  `ab6eb0ee6cdd3b7802ecfcbe90db2377` (observed at plan time).
- **SATISFIES**: precondition 1.
- **REGENERATES**: none.

### T2 · CREATE `docs/epics/fixtures/discovery-partner.run-2-rubric.md` — the pre-registered rubric

- **IMPLEMENT**: one section per finding, in the PRD's order (MVP 13), each with four fields:
  **Passage** (the fixture line numbers the defect hangs on — verify each against the file before writing
  it), **Counts as FOUND** (the one claim a transcript `text` line, a `flag_weak_answer.missing[]` entry, an
  `open_question.reason` or a `wrong_if` must make), **Counts as PARTIAL** (names the passage's weakness
  without the defect), **Reachable** (yes / in part / no, with the reason — the agent holds the document
  and nothing else). Then a **Scoring rule** block: any of the 23 turns may score a finding; one quoted
  line per verdict; FOUND ≥ PARTIAL ≥ MISSED, never rounded up; "reachable" is declared here and cannot be
  revised after the run. Draft, from this session's read of the fixture:

  | # | Finding (PRD MVP 13) | Passage in the fixture | Reachable |
  |---|---|---|---|
  | 1 | the scoring key was four decisions and not thirty-three, a layer below what the run produces | `:50` (Evidence: "33 decisions and 44 rejects"), `:212-215` (MVP 9: the 33 are the scoring key), `:86` (the hierarchy the run produces at) | in part — "33" vs "4" needs `decisions.json`, unreadable; "a layer below" is derivable from `:86` and `:212-215` |
  | 2 | the transition-note rule contradicted its own worked example | `:204-208` (MVP 7: "Required for the internal-tool and regulated branches … Faster Payment needs none of it") against `:156` (MVP 3: "the first run is regulated fintech") | yes — an internal contradiction; DODGED's "two places that contradict each other" is the verdict shape |
  | 3 | role-title framing sat inside a product tool | `:53` and `:155` (the bank seeded from "the CXO doc"), `:184-187` (STARS, "what do we say we do") | in part — the framing is visible; that the source is a hiring document is not stated in the fixture |
  | 4 | the AI module had no run behind it | `:163-173` (MVP 3: six areas, "the first run of it is a dogfood") against `:209-215` (MVP 9: the one real run is Faster Payment, no model) | yes |
  | 5 | the existing-PRD entry mode was never specified | `:104`, `:126` ("a blank idea or an existing PRD") against `:150-151` (MVP 1: Think · Create PRD · Grill "in order", one path) | yes |
  | 6 | "parity" was promised across two front ends that produce different artefacts in different places | `:152-154` (MVP 2: "parity is by construction"), `:274` (Open questions) | yes |
  | 7 | the five-questions prefix and Stage 10 presupposed an organisation the user does not have | `:184-187` (the prefix, "newly arrived"), `:182` ("all ten stages") against `:123-130` (Target user: one person with the repo and the terminal) | yes |
  | 8 | "full discovery, ~30, all ten stages" was wrong twice, over a bank holding its questions in nine usable stages, in an appendix the draft had not read | `:53` ("10 stages, ~30"), `:174` ("thirty questions"), `:182` ("~30 — all ten stages") | no for the count and the stage total (needs the appendix, which the fence denies); in part for the internal wobble between "~30" and "thirty" |

  The rubric's own header states it is measurement apparatus for #292, written by the implementing
  session from the PRD's list before the run, and never an input to the agent (which has no read tool).
- **The line numbers above were verified with `sed -n` at plan time (every anchor prints the quoted
  phrase; `:149` is blank, so MVP 1 is `:150-151`).** Still re-derive with `grep -n` before committing —
  a rubric citing the wrong line is a rubric the report cannot quote.
- **GOTCHA**: this file is NOT the owner's half (memory `honesty-contract-mirror-direction`) — it restates
  the PRD's published findings with anchors and does not stand in for any judgement. The score itself
  (T10) is a quoted read the owner confirms at review.
- **VALIDATE**: `git log -1 --format='%h %cI' -- docs/epics/fixtures/discovery-partner.run-2-rubric.md`
  prints a hash (expected — after the commit in T6's checkpoint); `grep -c '^## ' <rubric>` → `9` (eight
  findings + the scoring rule) (expected).
- **SATISFIES**: AC #2 (the measurement is defined before the run).
- **REGENERATES**: none.

### T3 · CREATE `tooling/run-2-ready.mjs` — the one command that says the sitting may start

- **IMPLEMENT**: MIRROR `tooling/run-1-ready.mjs` (copy `tracked` / `committedAt` / `matchesHead` and the
  CLI tail verbatim). Constants: `SLUG = 'partner-audit-2'`, `FIXTURE`, `FIXTURE_MD5 =
  'ab6eb0ee6cdd3b7802ecfcbe90db2377'`, `RUBRIC`, `KEY = docs/epics/discovery-partner.prd.md`,
  `QUESTIONS = 23`. Takes `--model <string>` (default `claude-opus-5`, see D1). Six checks, in the ticket's
  order:
  1. the fixture exists and `md5(readFileSync(FIXTURE))` equals `FIXTURE_MD5` (precondition 1);
  2. the rubric exists, is tracked, is COMMITTED and matches HEAD (the pre-registration);
  3. the fence, three facts: over `allowSetFor({ root: <repo>/discovery/partner-audit-2, reads: [] })`
     the KEY, the fixtures DIRECTORY and the FIXTURE ITSELF are denied while the package root and
     `BANK_PATH` are allowed; and `portal/lib/discovery-transport.mjs` still matches
     `/^const MAIN_TOOLS = Object\.freeze\(\[\]\);/m` (the same regex case 34 at `build-checks.mjs:7577`
     uses), so the real run advertises no read tool at all (precondition 2, the by-construction half);
  4. `selectDepth('full-discovery', declareFacets({ hasModel: true }))` composes exactly `QUESTIONS`, the
     twelve first in `OPENING_SET` order, and every id in `MODULES.hasModel.ids` present (the module fires);
  5. `discovery/partner-audit-2/run.json` does NOT exist — inverts once the session opens, say so in the
     header exactly as run-1-ready does;
  6. `--model` is in `MODELS`, `MODEL_SETTABLE.includes('grill')`, and the resolved stamp
     `resolvePosture({ posture: 'grill', model }).fingerprint` is printed with the rubric's commit and
     author dates, so the report can quote all three beside `startedAt`.
  Header: the governing docs (PRD MVP 13, architecture §Boundaries), the check list, the inversion note,
  and a `CANNOT REACH` line: *the fence is not exercised by the real run (no read tool is advertised) — the
  run-time proof is `--probe-fence` on run 2's shape, receipted under `.claude/reports/…-292/`; and whether
  the model's verdicts are right, which is T10's human read.*
- **PATTERN**: `tooling/run-1-ready.mjs:56-79` (the git helpers), `:82-136` (the check bodies).
- **IMPORTS**: `import { MODULES, OPENING_SET, selectDepth } from '../discovery/bank.mjs'`;
  `import { allowSetFor, allowsPath, BANK_PATH, declareFacets } from '../portal/lib/discovery.mjs'`;
  `import { MODELS, MODEL_SETTABLE, resolvePosture } from '../portal/lib/discovery-postures.mjs'`;
  `node:child_process`, `node:crypto`, `node:fs`, `node:path`, `node:url`. No `env.mjs` — the key is
  in-repo this time.
- **GOTCHA**: `reads: []`, not `[FIXTURE]`. The document rides in the system prompt since #286 and the
  drawer sends no `reads` (`portal/server.mjs:193-195`); the ticket's "an allow-set that admits the
  fixture" predates #286 and is superseded by the owner's comment on the issue. Say so in the header.
- **GOTCHA**: `drift-check` syntax-checks every tracked `.mjs` (memory `drift-check-syntax-checks-parked-mjs`)
  — a half-written file breaks CI `verify`. `gen-loc-summary` does not count `tooling/`
  (`agent-layer/gen-loc-summary.mjs:23-25`, observed), so no loc regen.
- **VALIDATE** (expected, before the rubric is committed): `node tooling/run-2-ready.mjs` → `run-2 ✗  check 2 —
  docs/epics/fixtures/discovery-partner.run-2-rubric.md is staged but not COMMITTED …` (or "missing"), exit 1.
  After T6's checkpoint commit: `run-2 ready ✓  6 checks · hasModel composes 23 · model claude-opus-5 →
  ba124c3c1edb19905101aceca7c12e22 · rubric committed <date> · authored <date>`.
- **REDDENS**: check 1 — flip one hex digit of `FIXTURE_MD5` → `check 1 — … hashes to ab6eb0ee…, not the
  frozen …`; also `printf '\n' >> <fixture>` then `git checkout -- <fixture>` → red on check 1 (and case 28.9
  in the same state). Check 3 — `reads: [FIXTURE]` in the gate's own call → `check 3 — the read fence ALLOWS
  docs/epics/fixtures/…pre-grill….md`. Check 4 — `QUESTIONS = 22` → `check 4 — … composes 23 … not 22`.
  Check 5 — `mkdir -p discovery/partner-audit-2 && echo '{}' > discovery/partner-audit-2/run.json` →
  `check 5 — … already exists`; `rm -r` it after. Check 6 — `--model claude-haiku-4-5` → `check 6 — … is not
  one of claude-sonnet-5 · claude-opus-5`. Restore every mutation byte-for-byte (md5 before and after).
- **SATISFIES**: preconditions 1–3, AC #3 (the composition), AC #4 (the stamp the run will carry).
- **REGENERATES**: none.

### T4 · VERIFY the composition and the drawer — zero tokens

- **IMPLEMENT**: (a) `node -e` over the bank: `selectDepth('full-discovery', {hasModel:true}).length` → 23,
  head twelve equal to `OPENING_SET`, the seven module ids present, `facetPlan({hasModel:true})` →
  `{fired:['hasModel'], fits:['hasModel'], overflow:[], count:23}` (all observed at plan time).
  (b) portal smoke on a fresh private port: `PORT=4793 node portal/server.mjs & PID=$!`; `/api/health` ok
  with `bootSha` equal to `git rev-parse HEAD`; `/api/discovery/config` carries `models` both, `entryPostures
  ['existing-prd'] = ['grill']`, `depthProposals['existing-prd'] = 'full-discovery'`. (c) the real
  session-open path through the route, on a throwaway slug: `POST /api/discovery/session` with the T7
  body (`slug: throwaway-292-<date>`, `frontEnd: terminal`) → `created true`, `document {ref a1, chars
  24355, md5 ab6eb0ee…}`, `metrics.completion.total 23`, `head.model claude-opus-5`, `head.reads []`,
  `cursor.question.id s1-if-nobody-solves-this`, `answers.jsonl` one line; then `rm -r
  discovery/throwaway-292-<date>` (no turn ran, so nothing was a recording). `kill $PID`.
- **OBSERVED AT PLAN TIME (2026-09-14, port 4796, PID killed, throwaway removed):** exactly the line above.
  The facet row is never hidden by the drawer — `portal/public/portal.js` assigns `hidden` to
  `#discovery-document-row` only (`:811`), and `#discovery-facet-note` (`:926-931`) is depth-driven, so
  under `existing-prd` at the proposed `full-discovery` the vector composes. No drawer fix is needed.
- **GOTCHA**: Playwright's browsers are NOT installed on this Mac (`~/Library/Caches/ms-playwright` is
  absent; `~/node_modules/playwright` 1.59.1 launches nothing). The #286-style headless drawer read is
  not available without `npx playwright install chromium`; (c) above replaces it with the route itself,
  which is the stronger observation.
- **GOTCHA**: never `pkill -f 'node server.mjs'` (memory `portal-smoke-port-scoped-kill`).
- **VALIDATE**: the three observed outputs pasted into the report's Level 4.
- **SATISFIES**: AC #3 (the module composes), AC #1 (the mode is reachable through the product).
- **REGENERATES**: none.

### T5 · OBSERVE the fence on run 2's shape — `--probe-fence` — DONE AT PLAN TIME

- **OBSERVED (2026-09-14, SDK 0.1.77, node v20.20.2, nonce `177cad46`, $0.1926 over three turns, exit 0):
  `probe BOTH_SITES_HOLD`.** The key (`docs/epics/discovery-partner.prd.md`'s stand-in) denied via
  `PreToolUse` in A and C and via `canUseTool` in B; the fixture, the bank and the package read in all
  three turns and returned their nonce; `canUseTool` was reached for the fixture and the bank (outside the
  cwd) and never for the in-cwd package read in A and C — the permission fast path, seen directly. The
  receipts are already at `.claude/reports/discovery-pre-grill-audit-run-292/probe-fence.shape-run-2.out.txt`
  and `.trace.jsonl` (13 lines, 3 denies). **The implementer commits them at T6's checkpoint and does not
  re-run the probe** — the shape is observed on today's tree, past the bank's size crossing, so #287's stale
  receipt is repaired too. The original instructions stay below for a future re-observation.
- **IMPLEMENT** (only if the transport or the fence is edited after this date): `mkdir -p .claude/reports/discovery-pre-grill-audit-run-292 && cd portal &&
  DISCOVERY_FENCE_TRACE=/private/tmp/probe-fence-run-2.trace.jsonl node lib/discovery-transport.mjs
  --probe-fence | tee ../.claude/reports/discovery-pre-grill-audit-run-292/probe-fence.shape-run-2.out.txt`;
  then copy the trace beside it as `probe-fence.shape-run-2.trace.jsonl`. The default shape IS run 2's
  (`discovery-transport.mjs:589-596`): the fixture under `docs/epics/fixtures/`, the key one directory
  above, `reads: [fixture]`, `tools: ['Read']`, nonce stand-ins, three wirings A/B/C.
- **GOTCHA**: this shape has not been observed since the bank passed the Read cap (README §The read fence,
  last paragraph; memory `bank-past-read-token-cap`). The `limit: 5` fix was observed on run 1's shape only.
  If the verdict is `FAILED` with every key denied at every site and a control failing on a size error,
  that is the probe misreading, not the fence — commit the stdout beside a re-run exactly as #291 did and
  name it in the report. `HOOK_ONLY_HOLDS` (exit 2) is a real finding and blocks the sitting.
- **GOTCHA**: the trace path must sit outside every run root, and the probe deletes its temp roots on exit.
- **VALIDATE** (expected): stdout ends `probe BOTH_SITES_HOLD`, exit 0; the key denied via `PreToolUse` in A
  and C and via `canUseTool` in B; the fixture, the bank and the package returning their nonce in all three.
- **REDDENS**: the probe's own committed `FAILED` receipts on run 1's shape are its failure path's proof; no
  new mutation — the fence predicate's reddening lives in case 23 (`deny(` → `allow(` on the run-2 rows
  → `build discovery ✗` naming the case; run once, restore).
- **SATISFIES**: precondition 2 (the run-time half, both call sites), and repairs the stale #287 receipt.
- **REGENERATES**: none (the receipts are new files).

### T6 · PROBE the audit on the chosen model — one paid turn, ~$0.06–0.12 — then CHECKPOINT-COMMIT

- **IMPLEMENT**: `cd portal && node lib/discovery-transport.mjs --probe-audit --model claude-opus-5 | tee
  ../.claude/reports/discovery-pre-grill-audit-run-292/probe-audit.claude-opus-5.out.txt`. Exit 0 on
  ANSWERED / UNEVIDENCED with a QUOTED or PARAPHRASED wrong-if, or DODGED. This is also the zero-risk check
  that the account can spend today (memory `api-usage-limit-until-2026-10-01`: a "specified API usage
  limits" 400 means the owner's Console spend limit at Billing › Spend limits, not the month).
- **GOTCHA**: #370 observed opus as `PARAPHRASED (14/14 tokens)` because the wrong-if carried the sentence
  inside quote marks — the classifier folds case and whitespace only. That is exit 0 and not a trigger.
  Exit 2 (AUTHORED / ABSENT) IS the #370 protocol: tighten `AUDIT_WRONG_IF_RULE`, re-probe, at most three
  attempts — and note that a Grill prompt edit moves `76b7847d…`, which `partner-audit-1` carries (30.46
  and 32.7 go red by name), so it is a re-record decision for the owner, not a quiet fix.
- **IMPLEMENT (checkpoint)**: commit T2, T3, T5 and T6's files by explicit path — the rubric, the gate, the
  receipts — `feat(discovery): run 2's harness — rubric, pre-run gate, fence probe on run 2's shape (#292)`.
  Then `node tooling/run-2-ready.mjs --model claude-opus-5` → exit 0, six green. **This commit is the
  pre-registration receipt**; its `%cI`/`%aI` must predate `run.json.startedAt`.
- **VALIDATE**: `node tooling/run-2-ready.mjs --model claude-opus-5` → `run-2 ready ✓  6 checks · …` (expected).
- **SATISFIES**: precondition 3's gate ("only then, run").
- **REGENERATES**: none.

### T7 · OWNER — the sitting: 23 clicks in the drawer

- **IMPLEMENT** (the implementer prepares; the owner triggers), in this order:
  0. `node tooling/run-2-ready.mjs --model <chosen>` → exit 0. Red means the sitting does not start.
  1. Confirm D1 (the model) with the owner and the spend headroom in the Console.
  2. Start the portal on a fresh port for them (`PORT=4794 node portal/server.mjs & PID=$!`), verify
     `/api/health`'s `bootSha` equals HEAD, hand over the URL.
  3. In the drawer: slug `partner-audit-2` · provenance **fictional** (A1) · entry **An existing PRD — audit
     it** · depth **full discovery** (proposed) · facets: tick **hasModel** only (no preset) · model
     **claude-opus-5** (D1) · document path
     `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` (the path field, not the
     textarea). Start.
  4. **Precondition 1, second half:** read the pointer line in the package view — `Auditing a1 — 24355
     characters, md5 ab6eb0ee6cdd3b7802ecfcbe90db2377`. If the md5 differs, press Close, delete
     `discovery/partner-audit-2/` before any turn (no turn has run, nothing is a recording yet), and stop.
  5. Press **Audit this question** once. **First-turn checkpoint (~$0.10):** the implementer reads
     `discovery/partner-audit-2/transcript.jsonl` — a `text` line before the first op, exactly one closer,
     `answer_ref: a1`, and if the closer is a `record_decision`, its `wrong_if` QUOTED or PARAPHRASED
     against the document (the T10 fold, run on one line). A wrong-if the document does not state, or a
     turn with no closer, stops the sitting after one paid turn instead of twenty-three; the one recorded
     turn stays (append-only) and the #370 protocol decides the re-record.
  6. Press **Audit this question** 22 more times, back to back, reading each turn's text before the next
     click. Nothing is typed.
  7. Press **Finish**.
  8. `kill $PID`.
- **GOTCHA — back to back.** Every turn re-reads the ~6.5k-token document from cache only inside the
  prompt cache's five-minute TTL (memory `discovery-run-cache-ttl-cost`). A pause over five minutes
  roughly triples that turn's cost. 23 turns at ~15–25 s each is under ten minutes.
- **GOTCHA — read the agent's text before the next click.** An error turn arrives as agent text under
  `subtype: success` (memory `sdk-error-result-wears-success`; the drawer renders it as the turn, #393 F1).
  If a turn reads `Credit balance is too low` or `API Error: 400 …`: stop, fix the balance, resume the same
  session (the drawer resumes from disk), never edit. A duplicate line is the honest record.
- **GOTCHA — a resume ignores a re-supplied document** (#286 report, Deviations): on a page reload the
  form still needs a document to resume; the stored one is the audit's and the pointer's md5 says so.
- **GOTCHA — `frontEnd` is `portal` because a person is clicking.** If the owner delegates the clicks to a
  script (NOTES §The API loop), the honest value is `terminal`, as #370's throwaways recorded.
- **VALIDATE** (expected): `node -e "const r=require('./discovery/partner-audit-2/run.json');
  console.log(r.entryMode, r.depth, JSON.stringify(r.facets), r.posture, r.model, r.turnStats.length+' turns',
  new Set(r.turnStats.map(t=>t.postureFingerprint)).size+' stamp(s)', r.endedAt)"` → `existing-prd
  full-discovery {"hasModel":true,"regulated":false,"internal":false,"orgBuys":false,"replacesAProcess":false}
  grill claude-opus-5 23 turns 1 stamp(s) <ISO>`. `wc -l discovery/partner-audit-2/answers.jsonl` → `1`.
- **SATISFIES**: AC #1, AC #3, AC #4, AC #6.
- **REGENERATES**: `discovery/partner-audit-2/{run.json,answers.jsonl,transcript.jsonl}` — server-written.
  Never by hand.

### T8 · GENERATE `discovery/partner-audit-2/prd.md`

- **IMPLEMENT**: `node discovery/prd-projection.mjs partner-audit-2` → `prd ✓ partner-audit-2 → 12
  sections, <n> ops`. This page IS the revised PRD (README §The audit mode); its Weak answers, Open questions
  and "Decisions resting on no evidence" line are the gap list. Case 32.6 compares the bytes in CI, so it is
  left as generated.
- **VALIDATE**: `node discovery/prd-projection.mjs partner-audit-2 --stdout | grep -c 'answer a1, 24355
  characters'` ≥ 1 (the pointer, never the text; case 31.14's shape) (expected).
- **SATISFIES**: AC #1 (a gap list and a revised PRD).
- **REGENERATES**: `discovery/partner-audit-2/prd.md` — `node discovery/prd-projection.mjs partner-audit-2`.

### T9 · READ the package — AC #3, #4, #5 (not-a-form), #6

- **IMPLEMENT**: `node -e "import('./portal/lib/discovery.mjs').then(d=>{const v=d.sessionView('discovery/
  partner-audit-2');console.log(JSON.stringify({document:v.document,metrics:v.metrics,model:v.head.model},null,1))})"`.
  Report: `document.md5` (precondition 1 on the stored bytes), `completion` (23 of 23, `done: true`),
  `notAForm` (`longest`, `tripped`), `weak.rate`, `coverage` of the twelve, `askedWhatMattered.modules ===
  ['hasModel']` with the tail's decision rate. **AC #3 itemised:** for each of the seven module ids
  (`MODULES.hasModel.ids`) the closer's verb and verdict (ANSWERED / UNEVIDENCED / DODGED / ABSENT, read
  off the closer exactly as `probeAudit` does at `discovery-transport.mjs:548-551`); the six HAX/PAIR areas
  are `s8-prompt-instruction` (prompt), `s8-conversational-memory` (conversational), `s8-agentic-controls`
  (agentic), `s8-grounding-sources` (grounding), `s8-response-patterns` (response patterns),
  `s8-safety-and-trust` (safety and trust); `s8-failure-who-pays` is the module's seventh.
- **IMPLEMENT — AC #6**: from `run.json.turnStats`: turn count, Σ `costUsd`, input/output/cache-read/
  cache-creation token sums, `endedAt − startedAt`, min/median/max `durationMs` (median of an even count is
  the mean of the two middle values — PR #405 review F6), and the warm/cold split (interval before each turn
  under / over five minutes). Every figure labelled observed or derived.
- **IMPLEMENT — AC #4**: `run.json.model` and the one distinct `postureFingerprint` equal to
  `resolvePosture({posture:'grill', model}).fingerprint` (`ba124c3c1edb19905101aceca7c12e22` on opus,
  `76b7847d4ebbd9d8f16f9726ff0f4f0f` on sonnet — both observed at plan time). The report's Gap finding
  section opens with the sentence the architecture requires: the score is a reading of *this* pairing.
- **VALIDATE**: the printed JSON pasted into the report.
- **SATISFIES**: AC #3, #4, #5 (the not-a-form half), #6.
- **REGENERATES**: none.

### T10 · SCORE — AC #2 (Gap finding) and AC #5 (auditability)

- **IMPLEMENT — Gap finding**: for each rubric entry, grep the transcript (`text` lines, `missing[]`,
  `reason`, `wrong_if`) for the passage's terms, read every candidate, and record FOUND / PARTIAL / MISSED
  with ONE quoted line and its `turn` and `seq`. Report the share as `found / 8` and beside it `found /
  reachable` using the rubric's declared reachability. The rubric is not revised. State who scored it (the
  implementing session) and that the owner's confirmation is the PR review.
- **IMPLEMENT — auditability**: `auditTraceability` from `discovery/ops.mjs` over the package (the same
  call run 1's report quotes: `unbacked`, `unrooted`, `parenting.missed`, per-rung), and the **wrong-if
  read**: a `node -e` that copies `probeAudit`'s fold verbatim (`discovery-transport.mjs:552-562` —
  lower-case, whitespace-collapsed, four-letter-plus tokens, `QUOTED` on substring, `PARAPHRASED` at ≥ 60%,
  else `AUTHORED`) over every `record_decision.wrong_if` against the stored document text (`answers.jsonl`
  line 1). Save stdout as `.claude/reports/discovery-pre-grill-audit-run-292/wrong-if-read.out.txt`. An
  AUTHORED wrong-if is D2's one model-only claim failing: report it, and apply the #370 protocol only if the
  owner elects a re-record (it moves Grill's stamp).
- **IMPLEMENT — the two #370 readings**: did ABSENT fire at all (count `open_question` closers); did any
  `file_evidence` or `wrong_if` sentence get re-filed under a second question (duplicate sentences in the
  projected Hypothesis / Evidence sections). Report both, judge neither, route to #293.
- **GOTCHA**: the transcript is agent output; the report quotes it and never rewrites it. The score is
  prose in the report, never a file inside the package.
- **VALIDATE**: the rubric's nine `## ` headings each answered in the report; `wrong-if-read.out.txt` lists
  every `record_decision` seq with a read.
- **SATISFIES**: AC #2, AC #5.
- **REGENERATES**: none.

### T11 · UPDATE `tooling/build-checks.mjs` — a second Grill carrier moves two pins

- **IMPLEMENT (30.46, `:7991-7997`)**: derive Grill's carriers the way Think's are — the assertion keeps the
  literal `76b7847d…` and its message reads `${carriers("76b7847d…").join(", ")} carry the old one`
  (the comment above it stays true: `partner-audit-1` was the reason the pin exists). Add one assertion
  for Grill on Opus: `resolvePosture({ posture: 'grill', model: 'claude-opus-5' }).fingerprint ===
  "ba124c3c1edb19905101aceca7c12e22"` with a derived carrier list, so `partner-audit-2`'s stamp is pinned
  current-to-literal. Skip the second assertion if D1 lands on sonnet (then the first pin covers it).
- **IMPLEMENT (32.7, `:9047-9055`)**: rows become `[slug, posture, model]` — `["instrument-loans-1",
  "think", null]`, `["graded-opus-a", "think-opus", null]`, `["partner-audit-1", "grill", null]`,
  `["partner-audit-2", "grill", "claude-opus-5"]` — and the expected stamp is
  `resolvePosture({ posture, model }).fingerprint` (identity on `null`, per 30.30). Update the group 32
  summary string's "the three recorded posture stamps" to four (grep `three recorded` first — memory
  `gate-prose-has-three-copies`; gates.md's group 32 entry does not state the count, observed).
- **PATTERN**: `tooling/build-checks.mjs:7976-7985` (derived carriers). `resolvePosture` is already imported
  for case 30.30.
- **GOTCHA**: 30.46's Think carrier count `=== 7` counts Think stamps only; a Grill package does not move
  it. Do not touch that line.
- **VALIDATE**: `node tooling/build-checks.mjs` → `build ✓  all 34 groups pass`.
- **REDDENS**: in the 32.7 row, `"claude-opus-5"` → `"claude-sonnet-5"` → `32.7: discovery/partner-audit-2
  carries ["ba124c3c"] but the current grill surface is 76b7847d`; in 30.46, the opus literal's last hex
  digit flipped → `30.46: Grill-on-Opus's prompt surface MOVED — … partner-audit-2 (23 turns) carry the old
  one`. Restore both.
- **SATISFIES**: AC #4 (the stamp is gated, not merely recorded).
- **REGENERATES**: none.

### T12 · UPDATE `discovery/README.md` and `.claude/references/gates.md`

- **IMPLEMENT (README)**: (a) §Files: a `partner-audit-2/` row — *the SCORED audit (#292): the first
  full-discovery existing-prd run, the first package on which the AI-interaction module fires, on
  `claude-opus-5`* — and line 94's "the only committed existing-prd run" → "the first committed
  existing-prd run"; (b) `:336` the `reads` bullet: "Run 2 names its frozen fixture here" → since #286 the
  document rides in the system prompt through `documentPath`, so run 2 names nothing and `reads` is `[]`;
  (c) a `## The pre-grill audit (partner-audit-2)` section beside §The Faster Payment run: settings, the
  precondition receipts (md5 on disk and on the stored bytes, the rubric's commit before `startedAt`, the
  fence three ways), the Gap finding score with the reachable denominator, the module's seven verdicts, the
  cost and latency read, the two #370 readings, and the pairing sentence; (d) §The read fence's last
  paragraph: the run-2 shape is observed again on <date> (nonce, cost, verdict) — or, if T5 failed on the
  probe's own read, what was observed instead.
- **IMPLEMENT (gates.md)**: a **run-2 pre-run gate** paragraph beside `:94` (six checks, the inversion,
  the `CANNOT REACH` line); the fence probe entry at `:90` gains the run-2 re-observation; group 32's entry
  names the fourth pinned stamp.
- **GOTCHA**: grep every number beside a noun you change (`three recorded`, `the only committed`) across
  `discovery/README.md`, `.claude/references/gates.md`, `tooling/build-checks.mjs` and
  `portal/lib/discovery-postures.mjs` before declaring the cascade done.
- **VALIDATE**: `grep -c 'partner-audit-2' discovery/README.md` ≥ 3; `grep -n 'run-2-ready' .claude/references/gates.md`
  prints one line (expected).
- **SATISFIES**: the epic's documentation contract (README is the format spec).
- **REGENERATES**: none.

### T13 · WRITE the report, then hand off

- **IMPLEMENT**: `.claude/reports/discovery-pre-grill-audit-run-292-report.md` — verdict per AC first
  (the six ACs and the three preconditions, each with the evidence line), What ran, the AC #6 cost read
  (observed / derived, warm-cache pace stated), Gap finding itemised with quotes, the module's seven
  verdicts, the wrong-if read, the two #370 readings, Proving the checks (every REDDENS above with what
  went red), Validation results (every command with its observed line), Not run (this plan's paid table),
  Deviations, Issues.
- **IMPLEMENT**: commit by explicit path: the package (four files), the two gate edits, the README,
  gates.md, the plan, the report, the receipts. Message: `feat(discovery): run 2 — the pre-grill audit,
  23 of 23, <found>/8 findings, on claude-opus-5 (#292)`. Then `piv-create-pr` with `Closes #292` in the
  body, naming the model pairing and the score in the first line.
- **VALIDATE**: `node tooling/build-checks.mjs` · `node tooling/drift-check.mjs` · `node tooling/token-lint.mjs`
  · `node agent-layer/gen-loc-summary.mjs --check` — all green on the final tree.
- **SATISFIES**: every AC's reporting clause.
- **REGENERATES**: none.

---

## TESTING STRATEGY

### Gates (unit-equivalent)

`node tooling/build-checks.mjs` — case 28.9 (the fixture md5), case 23 (the run-2 fence rows), 30.34 (the
audit branch pins), 30.46 and 32.7 (the stamps, T11), 32.6 (the corpus sweep, which now includes
`partner-audit-2`: re-fold clean, no off-script line, `prd.md` the projection's bytes), 31.14 (the pointer).

### Integration-equivalent

`cd portal && node lib/discovery-transport.mjs --preflight` (eight rows, zero tokens — observed green at
plan time); the portal smoke and the headless drawer check (T4); the two paid probes (T5, T6).

### Edge cases

- The drawer hides the facet row on `existing-prd` → T4(c) catches it before any spend.
- The stored document's md5 differs from the file's (a paste normalised line endings) → T7 step 4 uses the
  path field, and the pointer's md5 is read before the first click.
- A credit error mid-sitting → resume, never edit; the duplicate lines stay (README §The later, not never run).
- `--probe-fence` fails on its own read (the bank's size) → the receipt is committed as a `FAILED` run beside
  the re-run, as #291 did; a `HOOK_ONLY_HOLDS` is a real fence finding and blocks.
- An AUTHORED wrong-if → reported; the re-record is the owner's decision because it moves a pinned stamp.
- The owner picks sonnet → T11's opus pin is skipped; the 32.7 row carries `null`; the estimate drops.

### Proving the checks

Every check this plan adds carries its REDDENS mutation above and a positive control: `run-2-ready`'s six
checks each go red on a named mutation and green on the real tree after T6's commit; case 32.7's new row
goes red on the wrong model string; case 30.46's opus pin goes red on a flipped hex. The gate cascade's
positive control is the run itself: before T11, `node tooling/build-checks.mjs` is expected to stay green
(no case counts Grill carriers today) — which is exactly why T11 adds the pin, so that a future Grill edit
names `partner-audit-2` as it names `partner-audit-1`.

---

## VALIDATION COMMANDS

### Level 1: Syntax & style

```bash
node --check tooling/run-2-ready.mjs && node --check tooling/build-checks.mjs
```

### Level 2: Gates

```bash
node tooling/build-checks.mjs            # build ✓  all 34 groups pass
node tooling/drift-check.mjs             # drift-check ✓ syntax · … · group-count
node tooling/token-lint.mjs              # token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan
node agent-layer/gen-loc-summary.mjs --check   # loc summary ✓  3 groups — no drift
node tooling/run-2-ready.mjs --model claude-opus-5   # run-2 ready ✓  6 checks … (pre-run only; red on check 5 after)
```

### Level 3: The transport

```bash
cd portal && node lib/discovery-transport.mjs --preflight        # pre-flight ✓  all 8 rows pass, zero tokens
cd portal && DISCOVERY_FENCE_TRACE=/private/tmp/probe-fence-run-2.trace.jsonl node lib/discovery-transport.mjs --probe-fence   # PAID — probe BOTH_SITES_HOLD
cd portal && node lib/discovery-transport.mjs --probe-audit --model claude-opus-5   # PAID — exit 0
```

### Level 4: Manual

The portal smoke on a private port, the headless drawer read (T4c), the sitting (T7), the pointer's md5
read before the first click.

### Level 5: The projection and the reads

```bash
node discovery/prd-projection.mjs partner-audit-2                # prd ✓ partner-audit-2 → 12 sections, <n> ops
node -e "import('./portal/lib/discovery.mjs').then(d=>console.log(JSON.stringify(d.sessionView('discovery/partner-audit-2').metrics,null,1)))"
```

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| T5 `--probe-fence` on run 2's shape | **$0.1926, observed 2026-09-14 at plan time** — `BOTH_SITES_HOLD`, receipts in the report dir | **yes** — precondition 2's run-time half; DONE | — |
| T6 `--probe-audit --model claude-opus-5` | ~$0.06–0.12 (observed: $0.055 on 2026-09-04) | **yes** — the spend check and the last wrong-if look | — |
| D1 the model choice | **decided 2026-09-14: `claude-opus-5`** (owner) | — | — |
| T7 step 5, the first-turn checkpoint | ~$0.10 (one turn of the sitting, not extra) | **yes** — stops a bad pairing at one turn | — |
| T7 the 23-turn sitting | ~$1.2–3.5 on opus (derived below, warm-cache pace) | **yes** — every AC | — |
| T10's score | free, but a human read after the run | yes — AC #2 | — |

Total remaining: **$1.3–3.6**; $0.19 already spent at plan time. Confirm Console spend headroom before T7.

---

## ACCEPTANCE CRITERIA

- [ ] **Precondition 1** — the fixture's md5 re-verified on disk (T1) and on the stored bytes (T7 step 4),
      both `ab6eb0ee6cdd3b7802ecfcbe90db2377`.
- [ ] **Precondition 2** — the fence proven three ways: case 23's run-2 rows (CI), `--probe-fence`'s
      `BOTH_SITES_HOLD` on run 2's shape with the receipt committed, and the real run's transcript carrying
      zero `denied` lines on a built-in tool under `MAIN_TOOLS = []`.
- [ ] **Precondition 3** — `run-2-ready` exit 0 and the rubric's commit predating `startedAt`, quoted.
- [ ] **AC #1** — `discovery/partner-audit-2/` committed: `entryMode existing-prd`, 23 of 23 settled,
      `endedAt` set, `prd.md` generated, the gap list named (weak answers · open questions · no-evidence).
- [ ] **AC #2** — the eight findings itemised FOUND / PARTIAL / MISSED with one quoted line each; the share
      given as `n/8` and `n/reachable`, against the rubric committed before the run.
- [ ] **AC #3** — `askedWhatMattered.modules` is `['hasModel']`; the seven module questions each have a
      closer; the six areas itemised with their verdicts.
- [ ] **AC #4** — `run.json.model` recorded, one distinct stamp equal to `resolvePosture`'s, and the report's
      first Gap finding sentence names the pairing.
- [ ] **AC #5** — `auditTraceability` reported; every `wrong_if` classified QUOTED / PARAPHRASED / AUTHORED;
      `notAForm.tripped` reported (expected false: DODGED resets the counter).
- [ ] **AC #6** — turns, token sums, elapsed, min/median/max latency, warm/cold split, all labelled.
- [ ] All validation commands green on the final tree; the two pins of T11 red on their mutations.
- [ ] README, gates.md and the report updated; PR body carries `Closes #292`.

---

## COMPLETION CHECKLIST

- [ ] T0–T6 committed before the sitting; `run-2-ready` green at that commit
- [ ] T7 recorded through the drawer; nothing under `discovery/partner-audit-2/` typed or edited
- [ ] T8–T10 read, not counted by hand; every figure labelled
- [ ] T11's two pins land and were reddened
- [ ] T12's prose copies grepped, numbers beside nouns updated
- [ ] T13's report has a Not run table (empty, or naming the tracker) and a Proving the checks table
- [ ] The three pre-existing uncommitted `docs/epics/*` / `agent-layer/*` edits are NOT in the PR

---

## OPEN QUESTIONS / ASSUMPTIONS

**D1 — DECIDED 2026-09-14 by the owner: `claude-opus-5`.** T11's opus pin lands; the 32.7 row carries the
model. The reasoning that was put to them, kept for the record: the architecture reserved
this run to settle the call, and the work is cross-document (a contradiction between MVP 7 and MVP 3 is
found by holding two passages at once). Sonnet already has three audit turns on this very fixture
(`partner-audit-1`) and the #370 probe; opus has only the probe. On that one-turn probe opus cost $0.055
against sonnet's $0.121 (observed, #370), so the per-turn premium is not established — hence the wide range
below. If the owner picks sonnet, T11's opus pin is skipped and the score is a sonnet reading; both are
valid answers to the ticket, which says only "this run chooses it".

**A1 — provenance `fictional`.** R1 routes `real` to the jobs folder and never commits it; the ticket
requires a committed package. `partner-audit-1` set the precedent on this same document. The label
"Real run — fictional scenario" is the README's fixed string for the provenance, not a claim about the
document's authorship — the report says so.

**A2 — 23 questions, not "~30".** Twelve + the seven-question AI module + the four-question block; the
composition is `selectDepth`'s and is observed.

**A3 — `reads: []`.** The document is stored from `documentPath` and carried in the system prompt; the
ticket's "allow-set that admits the fixture" is pre-#286 wording, superseded by the owner's own comment on
the issue. The fence is therefore proven by probe (on the shape that *does* admit the fixture) and by
construction, not exercised by the run.

**A4 — the scorer.** The implementing session scores against the committed rubric with quoted lines; the
owner confirms at PR review. No agent writes a verdict into any package file.

**A5 — the two `docs/epics/discovery-partner.*.md` working-tree edits and `agent-layer/gen-decisions.mjs`
are another session's** (run 1's A5; the owner's call) and are not staged.

**Q1 — DECIDED 2026-09-14 by the owner: report both `n/8` and `n/reachable`.** The metric row at #293
quotes `n/8`; the reachable share sits beside it so an unreachable miss is not read as the model's failure.
The rubric declares reachability before the run and it is not revised after.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

**P0 — the tree.** Local `HEAD` is the run-1 branch tip `6e7b456`, which `origin/main` now contains at
`d0e65fa` (#405 merged 2026-09-14T09:35Z; `git diff --stat origin/main HEAD` is empty, observed). The
working tree is dirty with another session's three edits and two untracked files (P0 of run 1's plan,
unchanged). T0 branches from `origin/main`.

**P1 — every VALIDATE over existing code was driven.**

| Command | Observed |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · … · group-count` |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` |
| `node tooling/run-1-ready.mjs` | red on check 5 by design ("already exists") — the inversion the header promises |
| `md5 -q <fixture>` | `ab6eb0ee6cdd3b7802ecfcbe90db2377`; 24,560 bytes |
| `sessionView('discovery/partner-audit-1').document` | `{ref:'a1', chars:24355, md5:'ab6eb0ee…'}` — the stored-bytes check works on the existing audit package |
| `selectDepth('full-discovery', declareFacets({hasModel:true}))` | 23; head twelve equal to `OPENING_SET`; all seven `MODULES.hasModel.ids` present |
| `facetPlan({hasModel:true})` | `{declared:true, fired:['hasModel'], fits:['hasModel'], overflow:[], count:23, budget:31}` |
| `allowSetFor({root:<repo>/discovery/partner-audit-2, reads:[]})` | `[root, discovery/bank.mjs]`; denies the PRD, the fixture and the fixtures directory |
| `resolvePosture({posture:'grill', model})` | sonnet `76b7847d4ebbd9d8f16f9726ff0f4f0f` · opus `ba124c3c1edb19905101aceca7c12e22` |
| `discoveryConfig()` | `models` both; `entryPostures['existing-prd'] = ['grill']` |
| `HAS_TOKEN` | `false` — CLI login is the auth path |

**P2 — citations resolved.** `openSession`'s signature and the `documentPath` branch (`discovery.mjs:742-771`);
`DEPTH_PROPOSAL`, `ENTRY_POSTURES`, `RE_ASKS` (`:568-611`); `runMetrics` (`:697-724`); `sessionView`
(`:867-895`); `AUDIT_VERDICT_RULE` / `AUDIT_WRONG_IF_RULE` (`discovery-postures.mjs:224-232`), `MODELS`,
`MODEL_SETTABLE`, `resolvePosture` (`:781-859`); `MAIN_TOOLS` (`discovery-transport.mjs:80`), `probeAudit`'s
fold (`:552-562`), `probeFence`'s two shapes (`:589-612`); case 28.9 (`build-checks.mjs:5910-5919`), case 23's
run-2 rows (`:6946-6961`), 30.46 (`:7966-8008`), 32.7 (`:9047-9055`); the drawer's `renderDiscoveryEntry`
(`portal.js:807-815`, hides the document row only) and the audit submit (`:1395-1410`); the session route
(`server.mjs:179-199`). All say what the plan claims.

**P3 — landed claims checked against `origin/main`.** The fixture md5 gate the architecture asked for
*has landed* (case 28.9) — the plan re-verifies rather than adds. Case 23's run-2 rows *exist* — the
predicate half of precondition 2 is already CI. `partner-audit-1` *exists* as a committed existing-prd
package (three of twelve, ended early, sonnet) — the README's "the only committed existing-prd run" is a
copy T12 must move. No `run-2-ready` exists; no rubric exists; no case pins the Grill-on-Opus stamp.

**P4 — reconciled.** The composition number 23 is derived once (`selectDepth`) and reused in T3, T4, T7,
T9. The `reads` decision is stated once (A3) and T3, T7 and T12(b) follow it. T11's two pins agree on the
literals P1 observed.

**P5 — traps carried.** Bank past the Read cap (T5); the drawer's silent look-up trap is moot here (no
text is typed) but the error-turn trap is not (T7); the pattern kill (T4); three copies of gate prose
(T11, T12); the loc-summary group list excludes `tooling/` (T3, observed); the `resume` needing a document
(T7).

**What changed because of the pre-flight.** The ticket's "allow-set that admits the fixture" became A3
after reading `server.mjs:193-195` and the owner's issue comment; precondition 2 became a three-part proof.
The rubric gained a *reachable* column after reading the fixture: two findings need files the fence
denies, and scoring them as misses without saying so would read as the model's failure.

### The cost arithmetic, shown

Observed per-turn costs on this document: `partner-audit-1` (sonnet, three audit turns) $0.087, $0.045,
$0.028 — mean $0.053; the #370 opus probe $0.055 for one turn with a 1.2k-character document. The
fixture is ~6.5k tokens, cached after the first turn. Sonnet: 23 × $0.05–0.09 = $1.2–2.0. Opus: the
per-token premium is roughly 5× on output and the audit's output is short (400–1,300 tokens a turn on
`partner-audit-1`), so 23 × $0.05–0.15 = $1.2–3.5. Both assume back-to-back clicks; a five-minute pause
re-pays the document (memory `discovery-run-cache-ttl-cost`).

### The API loop (fallback if the owner delegates the clicks)

`POST /api/discovery/session` with the T7 body (`frontEnd: 'terminal'`), read `document.md5`, then for each
`cursor.question.id` until `cursor.done`: `POST /api/discovery/turn` `{ slug, provenance, questionId }` and
consume the SSE stream until `data: {"type":"done"…}`; then `POST /api/discovery/close`. Same server, same
SDK, same package; only the `frontEnd` field differs, and it is the honest value for a scripted run (#370).

### Risks, each closed or bounded (2026-09-14 pass)

| Risk | Status | How |
|---|---|---|
| R1 the fence probe on run 2's shape unobserved since the bank passed the Read cap | **closed, observed** | `--probe-fence` run at plan time: `BOTH_SITES_HOLD`, $0.1926, nonce `177cad46`; receipts in the report dir. The verdict code is shape-blind (`held` / `leaked` / `controls` iterate the shape's `keys` and `reads`, `discovery-transport.mjs:660-734`) |
| R2 the drawer hides the facet row under `existing-prd`, so the module cannot fire | **closed, observed** | the route opened a throwaway `existing-prd` session with `hasModel` → 23 questions, `reads []`, md5 `ab6eb0ee…` on the stored bytes; `portal.js` hides `#discovery-document-row` only |
| R3 the model decision blocks the sitting | **closed, decided** | D1 = `claude-opus-5` (owner) |
| R4 the denominator dispute lands after the run | **closed, decided** | Q1 = both `n/8` and `n/reachable`; reachability is in the committed rubric |
| R5 rubric line anchors wrong | **closed, observed** | every anchor printed with `sed -n`; MVP 1 corrected to `:150-151` |
| R6 a bad pairing burns 23 turns | **bounded** | T7 step 5: the first turn is read before the other 22 (verdict shape, wrong-if QUOTED / PARAPHRASED); stop after $0.10, not $3 |
| R7 the spend limit refuses the run | **bounded** | T6's one-turn probe fails fast on the 400; the fix is Billing › Spend limits, same day (memory) |
| R8 the cascade misses a prose copy | **bounded** | T11/T12 name the copies (`three recorded`, `the only committed`) and the grep rule; gates.md has no `partner-audit-1` mention (observed) |
| R9 the owner cannot sit 23 clicks | **bounded** | the API loop below, `frontEnd: terminal`, same server and package |
| R10 `resolvePosture` not in the gate's scope | **closed, observed** | imported at `tooling/build-checks.mjs:273` |
| R11 Playwright headless check unavailable | **closed** | browsers absent on this Mac; T4(c) uses the route instead, which observes more |

**Residual, and not closable by planning:** what the model finds over 23 turns. The rubric fixes how it is
scored; the first-turn checkpoint bounds the cost of a bad turn; nothing else is bought until it runs.

### The API loop, in full (fallback if the owner delegates the clicks)

```js
// node scratch/run-2-loop.mjs  — NOT committed; run from the repo root against a portal on PORT
const BASE = `http://localhost:${process.env.PORT ?? 4794}`;
const H = { 'content-type': 'application/json', origin: BASE };
const body = { slug: 'partner-audit-2', provenance: 'fictional', entryMode: 'existing-prd', depth: 'full-discovery',
  facets: { hasModel: true, regulated: false, internal: false, orgBuys: false, replacesAProcess: false },
  frontEnd: 'terminal', posture: 'grill', model: 'claude-opus-5',
  documentPath: 'docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md' };
let v = await (await fetch(`${BASE}/api/discovery/session`, { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
if (v.document?.md5 !== 'ab6eb0ee6cdd3b7802ecfcbe90db2377') throw new Error(`stored md5 ${v.document?.md5}`);
while (!v.cursor.done) {
  const res = await fetch(`${BASE}/api/discovery/turn`, { method: 'POST', headers: H,
    body: JSON.stringify({ slug: body.slug, provenance: body.provenance, questionId: v.cursor.question.id }) });
  const text = await res.text();                       // SSE: consume to the end, then read the last event
  const last = text.trim().split('\n\n').pop().replace(/^data: /, '');
  const ev = JSON.parse(last);
  if (ev.type !== 'done') throw new Error(`turn ${v.cursor.question.id}: ${ev.message}`);
  v = ev.view; console.log(v.cursor.question?.id ?? 'done', v.metrics.completion);
}
await fetch(`${BASE}/api/discovery/close`, { method: 'POST', headers: H, body: JSON.stringify({ slug: body.slug, provenance: body.provenance }) });
```

The route bodies are `portal/server.mjs:179-199` (session), `:340-373` (turn, SSE ending in `{type:'done',
view}` or `{type:'error', message}`), `:213-218` (close). The `origin` header is what the CSRF guard
(`portal/lib/origin.mjs`) checks; the throwaway open at plan time used exactly this shape.

### Rejected alternatives

- **Widening `MAIN_TOOLS` to `['Read']` and `reads: [fixture]`** to make the run itself exercise the fence:
  it would put the document on the wire twice (system prompt and a read) and change the audit prompt's
  surface, moving a pinned stamp, for a proof `--probe-fence` already gives.
- **A second `sonnet` package beside the opus one** for a paired comparison: doubles the spend for a ticket
  that asks for one reading; #293 can order a second run if the pairing verdict warrants it.
- **Generalising `run-1-ready.mjs` into a parameterised gate**: the two runs' preconditions differ in kind
  (a sealed owner file vs a rubric; a jobs-folder key vs an in-repo one); a second small file mirrors the
  first and touches nothing that already passed review.

## CONFIDENCE

**10/10 for one-pass execution of every task this plan controls.** Every existing-code VALIDATE was driven;
every citation resolved; the fence probe, the session-open path and the composition are observed on this
tree, not expected; the two owner decisions are taken; the one paid step that could waste money (a bad
pairing) is capped at one turn by T7 step 5. What remains open is the *result* — how many of the eight
findings the pairing reaches — and that is the measurement, not a risk to the plan.

## AMENDMENTS

- 2026-09-14 — risk pass at the owner's request ("address all risks"): T5 executed at plan time
  (`BOTH_SITES_HOLD`, $0.1926, receipts saved); T4(c) replaced with the observed route open (Playwright
  browsers absent on this Mac); D1 decided `claude-opus-5` and Q1 decided both denominators by the owner;
  rubric anchors verified and MVP 1 corrected to `:150-151`; T7 gained the first-turn checkpoint; NOTES
  gained the risk ledger and the full API loop; CONFIDENCE section added.
