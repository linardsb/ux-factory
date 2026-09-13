# Feature: Run 1 — Faster Payment, blank-idea mode, full depth, regulated preset (#291)

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **This is a RUN ticket, not a code ticket.** Most of its acceptance criteria are bought with a paid
> session that only the owner can sit through. The plan is three segments with a hard stop between
> them. Do not execute it top to bottom as one pass — read §Segments before §Step-by-step tasks.

---

## Feature Description

Epic #279 built a discovery half: a question bank, an op grammar, a fenced agent, a portal drawer and a
PRD projection. Nine packages are committed, and every one of them is a mechanism exhibit — the subject
was invented by the operator on the day, and nothing scores the output against anything.

Run 1 is the measured run. Its subject is fixed by the PRD before the session opens
(*"Meridian needs to let a customer pay someone they've never paid"*), it runs the **regulated** facet
preset at **full depth** (22 questions — observed, see §Pre-flight), and afterwards the four published
Faster Payment decisions `m-005`…`m-008` are used as a scoring key, **the other way up**: not "did the
run reach these screens" but "did the run produce business and stakeholder requirements that these four
turn out to serve".

Two readings come out of one sitting:

- **Independent reach** — 4/4 of `m-005`…`m-008` trace to a requirement the run produced, and ≥1 run
  kill criterion matches a published `would_measure`. This is the target.
- **Marginal reach** — the diff between the run's parents and a **sealed pre-registration** the owner
  writes and commits beforehand. No target. The owner wrote the key and answers the bank, so the
  trace-up number is an upper bound; this row is the part memory cannot inflate.

## User Story

As the owner validating epic #279's hypothesis
I want one discovery session run against a pre-registered subject and scored against a key I wrote before the epic existed
So that "the bank produces auditable requirements" is a measured result rather than an impression

## Problem Statement

Every committed discovery package proves the mechanism works and none proves the output is worth
anything. `later-not-never-1` (#393, recorded 2026-09-12) answered 31 of 31 questions about a fictional
builders' merchant the operator invented that morning — there was nothing to score it against, and
nothing about the run could have come out wrong. The epic's §Success metrics table has four rows
(Independent reach, Marginal reach, Auditability, Not a form) that no committed package can fill in, and
#293 (epic close-out) cannot be written until one can.

## Solution Statement

Run the session the epic pre-registered, in the order the epic pre-registered it, and report both
readings honestly including a short one.

1. **Segment A (agent, unpaid + one paid probe).** Commit the one-sentence input. Extend `probeFence()`
   to a run-1-shaped temp tree so precondition 3 has a run-time receipt rather than an argument. Prove
   the drawer composes 22 for the regulated preset with zero tokens.
2. **HARD STOP (owner).** The owner writes and commits the sealed pre-registration, then drafts 22
   answers offline, then sits the session.
3. **Segment B (agent, unpaid).** Take the two readings, move the eight fingerprint-count sites 6 → 7,
   write the run's §section in `discovery/README.md`, write the report, run the gates.

## Out of Scope / Non-Goals

- **Not run 2.** The existing-PRD audit mode and the AI-interaction module are #292. The regulated preset
  declares `hasModel: false`, so the AI module does not fire here and that is correct.
- **Not the epic close-out.** #293 reads the metric row by row and answers the hypothesis. This ticket
  produces the numbers; it does not write the verdict. **A sub-4/4 independent reach is a finding that
  routes to #293, not a reason to re-run** — re-running for a better number is exactly the cobra the
  sealed pre-registration exists to guard.
- **Not a prompt retune.** The honesty rule ("a bad run is fixed by a tighter posture prompt and a
  re-run") governs *mechanism* failures — the agent supplying content, a closer not filing, a fence
  leak. It does not govern a disappointing score. A posture edit also moves Think's fingerprint and
  stales six committed recordings (observed: 6 carriers, §Pre-flight), which is a separate ticket.
- **Not a shipped-page change.** Epic §Non-goals: no public IA surface, and therefore **no VR baseline
  churn** — do not run `update:docker`.
- **Not agent-drafted answers.** `discovery/README.md:23` is unqualified. See T7's GOTCHA.
- **Not changing the bank, the ops grammar, the projection or the drawer.** All five dependencies are
  CLOSED (observed: #283 #287 #288 #289 #290). If the run needs a code change to finish, that is a
  finding for the report, not an edit mid-sitting.
- **Not a `-1` slug suffix.** AC #1 names `discovery/faster-payment/`. The other packages carry `-1`
  by convention; the AC wins. `assertRunSlug('faster-payment')` passes (observed).

## Feature Metadata

**Feature Type**: New Capability (a recorded artefact + the harness that makes it measurable)
**Estimated Complexity**: Medium — the code is small; the sequencing is the risk
**Primary Systems Affected**: `discovery/` (a new package) · `portal/lib/discovery-transport.mjs` (the probe) · `tooling/build-checks.mjs` (the carrier count + a run-1 fence case) · `docs/epics/fixtures/` (input + sealed file)
**Dependencies**: none new. `@anthropic-ai/claude-agent-sdk@0.1.77`, `zod@4.4.3` already installed (observed via `--preflight`)

## Related Work

**Implements**: [#291](https://github.com/linardsb/ux-factory/issues/291) · **Epic**: [#279](https://github.com/linardsb/ux-factory/issues/279), architecture at `docs/epics/discovery-partner.architecture.md`, intent at `docs/epics/discovery-partner.prd.md` (both **uncommitted at plan time** — see §Pre-flight P0)

**Back-references**:

- `.claude/plans/discovery-later-not-never-392.md` + `.claude/reports/discovery-later-not-never-run-393-report.md` — the closest precedent. The cost finding, the credit-exhaustion scar and the eight-site cascade all come from it.
- `.claude/plans/discovery-read-fence-287.md` + `.claude/reports/discovery-read-fence-287/` — the fence probe this ticket parameterises, and its committed `BOTH_SITES_HOLD` stdout.
- `.claude/plans/discovery-bank-width-283.md` — the facet modules and presets the regulated vector selects.
- `.claude/plans/discovery-run-0-338.md` + report — run 0, the owner's real product; `:232` records that `my-product-name` "satisfies no acceptance criterion", which is why it is not precedent for anything here.

**Forward-references**:

- `#292` — run 2 (existing-PRD mode, the AI module fires). Inherits this ticket's probe parameterisation.
- `#293` — epic close-out. Consumes this ticket's two readings.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `portal/lib/discovery-transport.mjs` (lines 585–700, `probeFence`) — Why: the function T2 parameterises. Note the temp tree is hardcoded run-2-shaped (`docs/epics/fixtures/…` + the key one directory above), `held()`/`leaked()`/`controls()` each assume **one** key, and `controls()` special-cases `BANK_PATH` because the real bank carries no nonce.
- `portal/lib/discovery-transport.mjs` (lines 817–826, the standalone block) — Why: the `--probe-*` flag dispatch T2 adds to. Exactly one flag must be set or it exits 2.
- `portal/lib/discovery.mjs` (`allowSetFor`, `allowsPath`, `fenceHooks`, `fenceCanUseTool`, `fenceDecision`) — Why: the predicate under test. `allowsPath` returns `{allow, reason}`, **not** a boolean.
- `portal/lib/discovery.mjs:742` (`openSession`) — Why: the session contract. A blank-idea session takes **no document**; `reads: []` is what makes the allow-set `[root, bank]`.
- `portal/lib/discovery.mjs:689–720` (`runMetrics`) — Why: `coverage`, `notAForm` and `askedWhatMattered` are computed by the system and surfaced on `sessionView`. AC #4, #6 and the "Asked what mattered" row are read off this, never counted by hand.
- `tooling/build-checks.mjs:6905–6945` (fence case 23) — Why: already drives run 1's *shape* over invented `/jobs` paths, including `_portfolio/decisions.json` and `_portfolio/pre-registration.sealed.md`. T3 adds the **real** committed sealed path beside it.
- `tooling/build-checks.mjs:7959–7975` (case 30.46, `holding`/`carriers`) — Why: the derived carrier count. `=== 6` today; run 1 makes it 7.
- `tooling/build-checks.mjs:9004–9027` (case 32.6, the corpus sweep) — Why: iterates every `discovery/*/` with a `run.json`. Asserts `sweptPackages >= 7`, `sweptExchanges === 0 && sweptOffScript === 0`, re-folds every package through the applier, and compares every `prd.md` to the projection's bytes. Run 1 enters this sweep.
- `discovery/prd-projection.mjs:185–188` (`TRANSITION_NA`) and `:291–295` (the `transition` SECTIONS row) — Why: AC #7. The projection already renders an explicit n/a; what it cannot supply is the product-specific reason.
- `discovery/README.md:65–108` (§Files) and `:602–638` (§The later, not never run) — Why: the two places T10 edits, and the shape of the section to mirror.
- `discovery/README.md:767–835` (§The read fence) — Why: the write-up T2's probe extension amends.
- `discovery/bank.mjs:964–1051` (`FACETS`, `MODULES`, `PRESETS`) — Why: the regulated vector and what it fires.
- `.claude/reports/discovery-later-not-never-run-393-report.md` — Why: the report shape to mirror, and the cost table to derive from.

### New Files to Create

- `docs/epics/fixtures/faster-payment-input.md` — the one-sentence input, committed before anything else (precondition 1).
- `docs/epics/fixtures/faster-payment-pre-registration.sealed.md` — **the owner writes this**, committed before the run (precondition 2). Denied by the fence (observed).
- `.claude/reports/discovery-faster-payment-run-291/probe-fence.shape-run-1.out.txt` — the probe's stdout.
- `.claude/reports/discovery-faster-payment-run-291/probe-fence.shape-run-1.trace.jsonl` — the fence trace.
- `.claude/reports/discovery-faster-payment-run-291/probe-affordance.out.txt` — the look-it-up observation (T3c).
- `tooling/run-1-ready.mjs` — the six-check pre-run gate (T3b); the one command that says the sitting may start.
- `discovery/faster-payment/{run.json,answers.jsonl,transcript.jsonl,prd.md}` — **written by the server and the projection only**, never by hand.
- `.claude/reports/discovery-faster-payment-run-291-report.md` — the report.

### Relevant Documentation

- `docs/epics/discovery-partner.prd.md` §MVP 12, §Success metrics — Why: the four metric rows this run fills in, and the cobra guard on each.
- `docs/epics/discovery-partner.architecture.md` §Boundaries & contracts (lines ~208–240) — Why: the fence is an allow-list run at two sites; `tools: []` on real runs; the subscription-window consequence that belongs in the run-1 reading.
- `docs/epics/discovery-question-selection.architecture.md` — Why: the facet vector replaced the four buckets; the regulated preset is a starting point the person adjusts.
- `docs/research/requirements-hierarchy.md` — Why: business ← stakeholder ← solution ← transition. The trace-up score is an assertion about this ladder.
- `.claude/references/gates.md:49` (group 30) — Why: one of the eight cascade sites, and the statement of what the fence gate cannot reach.

### Patterns to Follow

**A run is recorded, never authored.** `discovery/README.md:23` — *"Nothing agent-written is ever
presented as a human answer."* Unqualified, and no committed package's record says otherwise.

**A probe is a paid observation with a printed verdict and a committed receipt.** `probeFence` returns
`{verdict, nonce, key, fixture, turns, cost}`; the standalone block prints every denied line with its
`via`, and `#287` committed both the passing and the failing run side by side — *"a probe that mis-reads
its own evidence is a finding too"*.

**A count in prose is a count that rots.** #393's report: grep the phrase, then grep the **number beside
the noun**, then read each hit's context. Two of the nine hits for "six recordings" in this tree are
about a different six (see §Pre-flight P4).

**`allowsPath` returns an object.**

```js
const set = allowSetFor({ root, reads: [] });           // { root, paths: [root, BANK_PATH] }, frozen
allowsPath(set, p);                                     // { allow: true|false, reason: "<names path and set>" }
const allow = (s, p) => allowsPath(s, p).allow === true; // build-checks case 23's own helper
```

---

## IMPLEMENTATION PLAN

### Segments, and the hard stop

| Segment | Who | Paid | Tasks | Gate before moving on |
|---|---|---|---|---|
| **A — the harness** | agent | two probes, ~$0.45–0.60 | T1–T5 | `BOTH_SITES_HOLD` · look-it-up files a URL · `build-checks` ✓ · `run-1-ready.mjs` red only on the sealed file |
| **STOP — the run** | **owner only** | ~$1.4–1.9 | T6, T7 | `run-1-ready.mjs` green, then 22 of 22 answered and closed |
| **B — the readings** | agent | no | T8–T13 | all four gates ✓ |

**One command separates them.** `node tooling/run-1-ready.mjs` (T3b) asserts all four preconditions
mechanically. Segment A is finished when it is red on exactly one check — the sealed file, which is the
owner's to write. The sitting starts when it is green. Nothing else is a go/no-go signal.

Segment A commits **before** the sitting. That is not a preference: `build-checks` case 33.15's comment
states the same rule for the graded fixture (*"Phase A commits before Phase C spends a penny"*), and it
is what keeps a failed sitting from also losing the harness work.

### Phase 1: Preconditions in order (T1–T3c)

The epic calls this a one-way door: *"out of order and the metric is unrecoverable."* The input and the
sealed file must be committed before the run, or neither reading means anything.

**Tasks:** commit the one-sentence input · extend the fence probe to run 1's shape · add the real sealed
path to build-checks case 23 · **write the pre-run gate that asserts all four preconditions** · observe
that look-it-up actually files a URL.

### Phase 2: Prove it before spending (T4–T5)

**Depends on:** Phase 1.

Run 1 is the **first faceted run through the drawer** (observed: every committed package carries
`facets: null`). `selectDepth(depth, facets)` has never composed a live session. Prove it for free.

**Tasks:** zero-token config check for the regulated preset · portal smoke on a private port.

### Phase 3: The sitting (T6–T7) — OWNER ONLY

**Depends on:** Phase 2, and on Segment A being committed.

**Tasks:** the owner writes and commits the sealed pre-registration · the owner drafts 22 answers offline
· the owner sits the session.

### Phase 4: The readings and the cascade (T8–T13)

**Depends on:** Phase 3.
**Independent of:** each other, apart from T13 which reads T8–T11.

**Tasks:** generate the PRD · take the two readings · move the eight count sites · widen the corpus sweep
if the run went off-script · write the README section · write the report · run every gate.

---

## STEP-BY-STEP TASKS

### T1 · CREATE `docs/epics/fixtures/faster-payment-input.md`

- **IMPLEMENT**: the one-sentence input, verbatim from `docs/epics/discovery-partner.prd.md:309`, with a
  short header saying what it is and what is deliberately absent from it. The sentence is
  `Meridian needs to let a customer pay someone they've never paid` — **no screens, no Confirmation of
  Payee, no scam stop**. Anything beyond one framing paragraph is leakage.
- **PATTERN**: `docs/epics/fixtures/discovery-partner.prd.pre-grill-2026-08-27.md` — a committed,
  date-stamped fixture that a run is measured against.
- **GOTCHA**: the file goes in `docs/epics/fixtures/`, **not** under `discovery/faster-payment/`. A file
  under the run root is inside the allow-set and the run could read it (observed:
  `allowsPath(set, root + '/anything')` → `{allow: true}`). The input is harmless to read, but
  `discovery/README.md:65` states a package is **three files during a session**, and 32.6 would then be
  sweeping a shape the contract does not describe.
- **GOTCHA**: memory `copy-never-indented` — no blockquote, no leading spaces on the sentence. The owner
  pastes it.
- **VALIDATE** (expected): `test -f docs/epics/fixtures/faster-payment-input.md && grep -c "never paid" docs/epics/fixtures/faster-payment-input.md` → `1`
- **SATISFIES**: precondition 1
- **REGENERATES**: none. `gen-loc-summary` counts only `system/*.{css,mjs,js}`, root+`proto/*.html` and `agent-layer/*.mjs` (observed at `agent-layer/gen-loc-summary.mjs:22-27`) — a `.md` under `docs/` matches no group.

### T2 · UPDATE `portal/lib/discovery-transport.mjs` — parameterise `probeFence` by shape

- **IMPLEMENT**: give `probeFence` a `{ shape = 'run-2' }` option. `run-2` builds today's tree
  unchanged. `run-1` builds a temp tree with **two** keys outside the root and **two** positive controls
  inside the allow-set:

  | Target | Path in the temp tree | Expected |
  |---|---|---|
  | key 1 | `_portfolio/decisions.json` | DENIED at both sites |
  | key 2 | `_portfolio/pre-registration.sealed.md` | DENIED at both sites |
  | control 1 | `run-<id>/answers.jsonl` (the package) | allowed, nonce returned |
  | control 2 | `BANK_PATH` (the real bank) | allowed, no nonce |

  `reads: []` for the run-1 shape — that is what run 1's real `run.json` carries, and it is what makes
  the allow-set exactly `[root, BANK_PATH]` (observed).
- **IMPLEMENT**: widen `held()` and `leaked()` from one key to a **list** of keys, and widen `controls()`
  to the shape's own control list. Keep the verdict vocabulary unchanged: `BOTH_SITES_HOLD` requires
  *every* key held at *every* site plus *every* control returning its nonce.
- **IMPLEMENT**: add `--probe-fence-run-1` to the standalone block's flag set and to the
  `filter(Boolean).length !== 1` guard and the usage string.
- **PATTERN**: `portal/lib/discovery-transport.mjs:600-700` — the existing `probeFence`, including the
  `realpathSync(mkdtempSync(...))` call (macOS `/var` is a symlink to `/private/var` and `allowsPath` is
  symlink-blind) and the `rmSync` in `finally`.
- **IMPORTS**: none new. `allowSetFor`, `fenceHooks`, `fenceCanUseTool`, `BANK_PATH`, `readTranscript`
  are already imported at `:40-43`.
- **GOTCHA — never point the probe at the real key.** Both key files are **nonce stand-ins**, written
  into the temp tree. Reading the real `_portfolio/decisions.json` would put `m-005`…`m-008` into a
  transcript the owner reads, which is the contamination the sealed pre-registration exists to bound.
- **GOTCHA**: the nonce is checked on the **whole** tool result, not a print-length slice. #287's first
  probe run reported `FAILED` on exactly that and is committed beside the passing one. Do not
  reintroduce a `.slice()` before the `includes(nonce)` check.
- **GOTCHA**: the existing `_portfolio` naming in build-checks case 23 uses an invented `/jobs` root. The
  probe's temp tree is its own root; do not try to mirror `JOBS_DIR`.
- **VALIDATE (free, run this FIRST)**: `node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 34 groups pass`. Group 30's transport source pins are **scoped to the real turn's own `query()` block** precisely because `--probe-fence` already carries a second `cwd: root` (PR #354 review F2, stated in group 30's own line). A third `query()` block is the shape that breaks a scoped pin, and finding that out for free beats finding it out after the probe has spent $0.40.
- **VALIDATE** (paid, ~$0.40): `cd portal && DISCOVERY_FENCE_TRACE=../.claude/reports/discovery-faster-payment-run-291/probe-fence.shape-run-1.trace.jsonl node lib/discovery-transport.mjs --probe-fence-run-1 | tee ../.claude/reports/discovery-faster-payment-run-291/probe-fence.shape-run-1.out.txt` → last line `probe BOTH_SITES_HOLD`, exit 0
- **REDDENS**: replace the run-1 shape's `allowSetFor({ root, reads: [] })` with
  `allowSetFor({ root, reads: [keyPath] })`. The probe must report `FAILED` and print the key's first
  line (`KEY-<nonce>`) as an allowed read — omission is not a fence, and this is the mutation that says
  so. (This mirrors build-checks group 33's committed "widened-reads mutation" for the author fence.)
- **SATISFIES**: precondition 3
- **REGENERATES**: none (`portal/` is in no loc group).

### T3 · UPDATE `tooling/build-checks.mjs` case 23 — the real sealed path

- **IMPLEMENT**: beside the two existing `/jobs`-rooted denials at `:6923-6924`, add a case over the
  **real** run-1 shape: `allowSetFor({ root: join(ROOT, "discovery", "faster-payment"), reads: [] })`,
  asserting `deny(…, join(ROOT, "docs/epics/fixtures/faster-payment-pre-registration.sealed.md"))` and
  `deny(…, join(ROOT, "docs/epics/fixtures/faster-payment-input.md"))`, with
  `allow(…, join(ROOT, "discovery/faster-payment/answers.jsonl"))` and `allow(…, BANK_PATH)` as the
  positive controls.
- **PATTERN**: `tooling/build-checks.mjs:6908-6930` — the same `allow`/`deny` helpers, in the same block.
- **GOTCHA**: this block is **PURE — no fs** (its own comment, `:6905-6906`). Use `join(ROOT, …)` to
  build paths; do **not** `existsSync` them. The sealed file does not exist until the owner writes it,
  and a case that skipped when it was absent would be a check that cannot fail.
- **GOTCHA**: the old assertions stay. `/jobs/_portfolio/pre-registration.sealed.md` is the
  architecture doc's named location and the arithmetic is still worth pinning; the new case is the
  location this run actually uses.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 34 groups pass`
- **REDDENS**: change the new `deny(` to `allow(` for the sealed path. Expect
  `case 23: run 1 must NOT read the sealed pre-registration` (or the message you give it) in the failure
  list, and the group line red.
- **SATISFIES**: precondition 3
- **REGENERATES**: none (`tooling/` is in no loc group).

### T3b · CREATE `tooling/run-1-ready.mjs` — the one command that says the sitting may start

- **IMPLEMENT**: a zero-dependency Node ESM script that asserts every precondition mechanically and
  exits non-zero naming the first one that fails. Six checks, in the epic's own order:

  1. `docs/epics/fixtures/faster-payment-input.md` exists **and is tracked** (`git ls-files --error-unmatch`).
  2. `docs/epics/fixtures/faster-payment-pre-registration.sealed.md` exists **and is tracked**, and is non-empty.
  3. Over the REAL run-1 allow-set — `allowSetFor({ root: <repo>/discovery/faster-payment, reads: [] })` —
     `allowsPath` **denies** the sealed file, the input file and `<JOBS_DIR>/_portfolio/decisions.json`,
     and **allows** the package root and `BANK_PATH`. This is F1 made mechanical: a sealed file moved
     under the run root fails here by name instead of silently voiding precondition 3.
  4. `selectDepth('full-discovery', PRESETS.regulated.facets).length === 22`, and `OPENING_SET` is a
     prefix of it.
  5. `discovery/faster-payment/run.json` does **not** exist — the sitting has not already started.
  6. Print the sealed file's commit ISO timestamp, so the report can quote it beside `startedAt`.
- **PATTERN**: `tooling/validate-trace.mjs` — a standalone zero-dep checker that prints a `✓` line and
  exits 1 naming the offending path. Match its output shape.
- **GOTCHA**: `JOBS_DIR` comes from `portal/lib/env.mjs`, not from a literal. Import it rather than
  hardcoding the sibling path — the plan's own observed value is one machine's.
- **GOTCHA**: check 5 inverts after the sitting. The script is a **pre**-run gate; say so in its header
  and in its failure message, so a post-run reader is not confused by it going red.
- **VALIDATE** (expected, before T6): `node tooling/run-1-ready.mjs` → exits 1 on check 2, naming the
  absent sealed file. **After T6**: exits 0 with `run-1 ready ✓  6 checks · sealed committed <ISO>`.
- **REDDENS**: move the sealed file to `discovery/faster-payment/sealed.md` and re-run. Check 3 must
  fail naming it — that path returns `{allow: true}` (observed, §Pre-flight P2), and a gate that could
  not see it would be the check that cannot fail.
- **SATISFIES**: preconditions 1, 2, 3, 4 — the ordering itself
- **REGENERATES**: none (`tooling/` is in no loc group)

### T3c · OBSERVE that look-it-up actually files a URL — one paid turn, ~$0.05–0.20

- **IMPLEMENT**: nothing to write. Run the existing affordance probe and commit its stdout.
- **WHY THIS IS IN SEGMENT A**: AC #5 needs a `secondary-source` URL on every checkable domain claim,
  and the **only** mechanism that files one is look-it-up during a turn (MVP 7). Nothing in CI can reach
  it — group 30's line says so. This probe answers the three questions that matter before the sitting
  (from `discovery-transport.mjs:704-707`): does `WebSearch` execute under this machine's auth; does the
  fence still deny `Bash` and `Write` on the same turn; **does the agent file `file_evidence` with a URL
  and provenance `secondary-source`, without closing the turn**.
- **VALIDATE** (paid, ~$0.05–0.20): `cd portal && node lib/discovery-transport.mjs --probe-affordance | tee ../.claude/reports/discovery-faster-payment-run-291/probe-affordance.out.txt`
- **GOTCHA**: a `NO_FETCH_OBSERVED` verdict is a **finding, not a failure** — the probe's own header says
  so. If it fires, AC #5 becomes unreachable by the look-it-up route and the owner needs to know that
  before spending $1.90, not after. That is the whole reason this task sits before the hard stop.
- **SATISFIES**: AC #5's mechanism
- **REGENERATES**: none

### T4 · VERIFY the regulated preset composes 22 — zero tokens

- **IMPLEMENT**: nothing. Run the check and paste the output into the report.
- **VALIDATE** (observed at plan time):

  ```
  node -e "import('./portal/lib/discovery.mjs').then(d=>{const c=d.discoveryConfig();
    console.log(c.facets.map(f=>f.id).join(','));
    console.log(JSON.stringify(c.facetPlans['01000']));});"
  ```

  → `hasModel,regulated,internal,orgBuys,replacesAProcess`
  → `{"declared":true,"fired":["regulated"],"fits":["regulated"],"overflow":[],"count":22,"budget":31}`
- **GOTCHA**: `config.depths` reports `full-discovery: 31` — that is the **unfaceted** count and it is
  correct. 22 comes from `facetPlans`, which is depth-blind by design. Do not "fix" the 31.
- **GOTCHA**: the facet key is `01000` because `FACETS` order is
  `hasModel, regulated, internal, orgBuys, replacesAProcess` (observed). The drawer derives this key
  itself (`facetKeyOf`, `portal/public/portal.js:738`) and hardcodes no facet id; do not hardcode one here either.
- **SATISFIES**: AC #1 (the run can be opened at all), AC #4 (the twelve are the head of the 22)
- **REGENERATES**: none

### T5 · VERIFY the portal boots and the transport pre-flights — zero tokens

- **VALIDATE** (observed at plan time): `cd portal && node lib/discovery-transport.mjs --preflight | tail -2` → `pre-flight ✓  all 8 rows pass, zero tokens`
- **VALIDATE**: start the portal on a **private port**, hit `/api/health` (confirm `bootSha == headSha`)
  and `/api/discovery/config`, then stop it **by PID**.
- **GOTCHA**: memory `portal-smoke-port-scoped-kill` — **never** `pkill -f 'node server.mjs'`. Sibling
  sessions' recorders die with it. PID or port only, and expect stale portals on nearby ports.
- **GOTCHA**: memory `stale-serve-wrong-tree` — a portal another session left running serves **their**
  tree. Check `bootSha` against `git rev-parse HEAD` before trusting anything it says.
- **SATISFIES**: AC #1
- **REGENERATES**: none

---

> ## ⛔ HARD STOP — everything below T5 is the owner's
>
> Segment A commits here. T6 and T7 spend money and require the owner's own hand. An implementing agent
> **stops**, reports what Segment A proved, and hands over.

---

### T6 · OWNER — write and commit the sealed pre-registration

- **IMPLEMENT** (owner): `docs/epics/fixtures/faster-payment-pre-registration.sealed.md`. For each of
  `m-005`…`m-008`, the **business or stakeholder requirement the owner would name as its parent,
  unaided**, written before the session opens. Four entries, one line of reasoning each is enough.
- **GOTCHA — an agent must not write one word of this file.** Memory
  `honesty-contract-mirror-direction`: the honesty contract runs both ways, and the owner's half
  (verdicts, reasons, the unaided answer) is never written for them. An agent-drafted sealed file makes
  the Marginal reach row measure the agent against itself, which is the one number the whole apparatus
  exists to protect.
- **GOTCHA**: it must be committed **before** the session's first turn. Git history is the receipt that
  it predates the run — that is the entire reason this file is in the repo rather than in the jobs
  folder, which is not a git repo (observed: `fatal: not a git repository`).
- **VALIDATE** (expected): `git log --format=%cI -1 -- docs/epics/fixtures/faster-payment-pre-registration.sealed.md` is **earlier** than `discovery/faster-payment/run.json`'s `startedAt`.
- **SATISFIES**: precondition 2, AC #3
- **REGENERATES**: none

### T7 · OWNER — draft 22 answers offline, then sit the session

- **IMPLEMENT** (owner), in this order:
  0. `node tooling/run-1-ready.mjs` → must exit **0**. If it is red, the sitting does not start.
  1. Confirm the spend headroom in the Console **before** opening the drawer.
  2. Open `/api/discovery/config` (or the drawer) and read the 22 questions. **Draft all 22 answers in a
     text file first.**
  3. Open the drawer: slug `faster-payment` · provenance **fictional** · entry mode **blank idea** ·
     depth **full discovery** · preset **Regulated** · posture **Think** (`claude-sonnet-5`) · front end
     **portal**. Start.
  4. Paste the drafted answers back to back, one per turn.
  5. Press **Finish** when actually finished.
- **GOTCHA — the answers are the owner's words, all 22.** `discovery/README.md:23` is unqualified and no
  committed package carries agent-drafted answers. #393 put exactly this choice to the owner before
  spending anything and they chose to write all 31 themselves; the rule stands unamended.
- **GOTCHA — draft first, paste back to back.** Memory `discovery-run-cache-ttl-cost`, observed on #393:
  turns answered within 5 minutes of the previous one cost **$0.063**; turns after a longer gap cost
  **$0.184** and re-pay for the whole system prompt. Five slow turns were $0.61 of #393's $2.61. This is
  the single lever on this ticket's cost.
- **GOTCHA — read the agent's text before resubmitting.** Memory `sdk-error-result-wears-success`: the
  SDK returns credit exhaustion as `subtype: "success"` with `is_error: true`, so the drawer renders
  `Credit balance is too low` as the agent's turn. #393 resubmitted the same answer twice before reading
  it, and `answers.jsonl` carries three byte-identical lines permanently. If it happens again:
  **stop, fix the balance, resume — do not edit the files.** The duplicates are the honest record.
- **GOTCHA — use look-it-up on the three checkable domain facts, DURING the sitting.** AC #5 requires a
  `secondary-source` **URL** on every checkable public claim. Confirmation of Payee, APP scam
  reimbursement and Faster Payment irrevocability are all three. The only mechanism that files a
  `file_evidence` row with a URL is the look-it-up affordance (MVP 7), and it only exists during a turn —
  writing the URLs in from memory afterwards is the AC #5 failure, not the fix. When an answer states one
  of those facts, ask the agent to look it up **on that turn**.
- **GOTCHA — look-it-up turns the corpus sweep red, and that is expected.** `build-checks` case 32.6 sums
  `ex.settled + ex.unfiled + ex.lookups` and asserts the total is 0 across the corpus (observed today: 9
  packages, 290 ops, 234 answers, 0). A lookup counts. So satisfying AC #5 makes T12 fire — it is a
  planned consequence, not an accident, and the gate's own message says to widen rather than delete.
- **GOTCHA**: `HAS_TOKEN` is `false` (observed), so the session authenticates through the Claude Code
  CLI's own login on this Mac. That is the documented fallback (architecture §Boundaries), not a fault.
- **VALIDATE** (expected): `node -e "const r=require('./discovery/faster-payment/run.json'); console.log(r.depth, JSON.stringify(r.facets), r.posture, (r.turnStats||[]).length+' turns', r.endedAt)"` → `full-discovery {"hasModel":false,"regulated":true,...} think 22 turns <an ISO string>`
- **SATISFIES**: AC #1, AC #4, AC #6, AC #8
- **REGENERATES**: `discovery/faster-payment/{run.json,answers.jsonl,transcript.jsonl}` — written by the server. Never by hand.

---

### T8 · GENERATE `discovery/faster-payment/prd.md`

- **IMPLEMENT**: run the projection. It is a pure fold over the ops.
- **VALIDATE**: `node discovery/prd-projection.mjs faster-payment` → `prd ✓ faster-payment → 12 sections, <n> ops`
- **GOTCHA**: `prd.md` is the projection's bytes and case 32.6 compares them on every CI run. The human
  may edit it afterwards **only** if that comparison is then expected to fail — today no committed
  package has diverged, so leave it as generated.
- **SATISFIES**: AC #1 (a generated PRD in one sitting)
- **REGENERATES**: `discovery/faster-payment/prd.md` — `node discovery/prd-projection.mjs faster-payment`

### T9 · READ the metrics off the package — AC #4, #6, #7, #8

- **IMPLEMENT**: read `runMetrics` rather than counting by hand. `sessionView(root).metrics` carries
  `coverage` (asked/decided/of/missing over `OPENING_SET`), `notAForm` (`streak`, `longest`, `max`,
  `tripped`) and `askedWhatMattered`.
- **IMPLEMENT**: derive the subscription-window reading from `run.json.turnStats`: turn count, Σ
  `costUsd`, `endedAt − startedAt`, and min/median/max `durationMs`. Add the warm/cold split #393's
  report introduced (interval before the turn, under vs over 5 minutes).
- **IMPLEMENT — AC #7, the transition note. Two different things share this name; report both.** See D1.
  - **MVP 10's transition note** — *"required when the product changes how an organisation works, and
    markable n/a with a reason otherwise"*. The session's answer to that is the **`replacesAProcess`
    facet**, ticked false at intake and recorded in `run.json`.
    `docs/epics/discovery-question-selection.architecture.md:53-56` states this outright: the facet is
    the question MVP 10 required and nothing asked. **This is what AC #7 reads, and it passes**, with
    the product-specific reason (a new consumer flow replacing no process) written in the report.
  - **The projection's `## Transition note` section** — renders decisions the agent filed at the
    `transition` **rung** of the BABOK ladder, or `TRANSITION_NA` when there are none
    (`discovery/README.md:413`). Report what it actually rendered as a **separate observation**. If it
    is populated — which both committed full-depth runs were, from `s2-riskiest-assumption`, a question
    that **is** in run 1's 22 — that is a level-discipline finding for #293, not an AC #7 failure and
    not something to hand-edit. 32.6 compares `prd.md` to the projection's bytes, so an edit would go
    red anyway.
- **PATTERN**: `.claude/reports/discovery-later-not-never-run-393-report.md` §What ran — the table shape.
- **GOTCHA**: AC #6 is *"never more than 3 consecutive questions with no decision and no weak-answer
  note"*. `notAForm.max` is 3 and `notAForm.tripped` is `longest > max`. Report `longest` and `tripped`,
  not a hand count.
- **VALIDATE**: `node -e "import('./portal/lib/discovery.mjs').then(d=>console.log(JSON.stringify(d.sessionView('discovery/faster-payment').metrics,null,1)))"`
- **SATISFIES**: AC #4, #6, #7, #8
- **REGENERATES**: none

### T10 · TAKE the two readings — AC #2, #3, #5

- **IMPLEMENT — Independent reach (AC #2).** Open `<JOBS_DIR>/_portfolio/decisions.json`, take
  `faster-payment`'s `m-005`…`m-008`, and for each one ask: **does a business- or stakeholder-level
  decision this run produced serve it?** Name the run's `seq` and level for each of the four, quote the
  run's own wording, and score 4/4 or less. Then check whether ≥1 run kill criterion (`wrong_if`)
  matches a published `would_measure`.
- **IMPLEMENT — Marginal reach (AC #3).** Diff the run's business/stakeholder parents against the sealed
  file. Report **what the run reached that the sealed answer did not**, and what the sealed answer had
  that the run missed. **No target, no pass/fail.**
- **IMPLEMENT — Auditability (AC #5).** Over the package: every decision has an `evidence_refs` and a
  `wrong_if`; every `file_evidence` row has a provenance label; **every checkable domain claim carries a
  `secondary-source` URL**. Confirmation of Payee, APP reimbursement and Faster Payment irrevocability
  are checkable public facts — one of them filed as `assumption` is a **failure**, reported as such.
  `ledgerView(ops)` and `auditTraceability(ops)` in `discovery/ops.mjs` do the structural half.
- **GOTCHA — this reading happens AFTER the run, never before.** Do not open `decisions.json` in a
  session that will also draft anything the owner reads before the sitting.
- **GOTCHA — a short score is a finding.** If independent reach comes in under 4/4, write the number,
  write which of the four missed and why, and route it to #293. Re-running the session for a better
  number defeats the pre-registration.
- **VALIDATE**: `node -e "const d=require('<JOBS_DIR>/_portfolio/decisions.json'); console.log(d.decisions.filter(x=>x.prototype==='faster-payment'||/^m-00[5-8]$/.test(x.id)).map(x=>x.id).join(' '))"` → `m-005 m-006 m-007 m-008` (adjust the filter to the file's actual shape; read it before writing the expression)
- **SATISFIES**: AC #2, #3, #5
- **REGENERATES**: none

### T11 · UPDATE the eight fingerprint-count sites, 6 → 7

- **IMPLEMENT**: run 1 records on `think`, so it becomes the seventh package carrying Think's stamps.
  Move the number at every one of these (all observed at plan time):

  | # | Site | What carries the count |
  |---|---|---|
  | 1 | `tooling/build-checks.mjs:7333` | comment, "the six recordings' literal" |
  | 2 | `tooling/build-checks.mjs:7355` | case 30's failure message, "the six recordings carry 7efdde37" |
  | 3 | `tooling/build-checks.mjs:7972` | comment, "the header's own 'six recordings'" |
  | 4 | `tooling/build-checks.mjs:7973` | the assertion — `=== 6` |
  | 5 | `tooling/build-checks.mjs:7974` | failure message, "not the six discovery-postures.mjs's header states" |
  | 6 | `tooling/build-checks.mjs:8196` | group 30's summary string, "the six recordings' literal" |
  | 7 | `portal/lib/discovery-postures.mjs:203` | header, "stamped on six recordings" |
  | 8 | `.claude/references/gates.md:49` | group 30's write-up, "pinned to the six recordings' literal" |

- **IMPLEMENT — a conditional ninth site, if the run used look-it-up or park.** The transport stamps an
  `affordanceFingerprint` on any turn where `fetching || park` (`discovery-transport.mjs:256`). Case
  32.7's comment states *"No committed package carries an `affordanceFingerprint`: the surface is new and
  nothing has run under it"*, and group 32's summary repeats it. Its **assertion** loops three hardcoded
  slugs (`instrument-loans-1`, `graded-opus-a`, `partner-audit-1`) so it stays green — which is exactly
  what makes the prose go quietly false. Since T7 plans lookups, expect to correct both strings.
- **GOTCHA — `discovery/README.md:739` is NOT one of them.** It says *"byte-stable across all six
  recordings"* about the **six graded recordings** (`graded-think-a/b/c`, `graded-opus-a/b/c`), which is
  a different six and does not move. Read each hit's context before editing it. Memory
  `gate-prose-has-three-copies`, and the reason #393 found eight sites where its plan named three.
- **GOTCHA — case 32.7 is NOT one of them either.** It iterates a hardcoded three-slug list (read at
  `build-checks.mjs:9031`), not every package, so a seventh `think` carrier does not move its
  fingerprint assertion. Only its `affordanceFingerprint` prose is at risk, per the task above.
- **GOTCHA**: `allergen-matrix-1` carries the **older** `df6fbc35` stamp and `spine-meridian-1` carries
  none, so neither counts. Today's carriers are `bracket-trace-1`, `bracket-trace-2`, `graded-think-a`,
  `instrument-loans-1`, `later-not-never-1` (think) + `graded-opus-a` (think-opus) = **6** (observed).
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 34 groups pass`
- **REDDENS**: leave site 4 at `=== 6`. Expect
  `30.46: 7 recording(s) carry Think's two stamps, not the six discovery-postures.mjs's header states — think: bracket-trace-1 (12 turns), …, faster-payment (22 turns) · think-opus: graded-opus-a (65 turns). Update the header in the same edit`.
- **SATISFIES**: AC #1 (the package lands green)
- **REGENERATES**: none

### T12 · WIDEN case 32.6 — expect this to fire

- **IMPLEMENT**: `tooling/build-checks.mjs:9026-9027`'s `sweptExchanges === 0 && sweptOffScript === 0`
  goes red as soon as run 1 carries a lookup (`ex.lookups`), a settled off-script exchange
  (`ex.settled`), or a `record_decision` with `off_script: true`. **T7 plans at least the lookups**, so
  treat this as expected work rather than a contingency. The failure message says what to do: *"read the
  numbers in this line and widen the assertions to match rather than deleting them."* Widen to the
  observed numbers; do not delete.
- **IMPLEMENT**: update group 32's summary string too — it prints the swept counts **and** the sentence
  *"the sweep is VACUOUS at those numbers"*. Once lookups land, the sweep stops being vacuous and that
  clause must say so.
- **GOTCHA**: `sweptPackages >= 7` is a floor and run 1 raises the actual to 10. Leave the floor alone.
- **GOTCHA**: `ex.unfiled.length === 0` is asserted **per package** at `:9024` and is a real correctness
  claim, not a corpus tally — every off-script exchange must have filed something (MVP 9). If that one is
  red, the run has an unrecorded side channel and it is a finding, not a number to widen.
- **VALIDATE**: `node tooling/build-checks.mjs 2>&1 | tail -2` → `build ✓  all 34 groups pass`
- **REDDENS**: the run itself is the mutation — before this task, the gate is red naming the observed
  counts. Paste that failure line into the report as the receipt that the widening was earned. If the
  gate is somehow already green, the run filed no lookup and **AC #5 is at risk** — check T9 before
  skipping this task.
- **SATISFIES**: AC #1, AC #5
- **REGENERATES**: none

### T13 · UPDATE `discovery/README.md` and WRITE the report

- **IMPLEMENT**: `discovery/README.md` §Files gains a `faster-payment/` row naming what it is (the
  SCORED run — the first faceted package, regulated preset, 22 questions, sealed pre-registration). A new
  `## The Faster Payment run (faster-payment)` section goes after `## The later, not never run`, carrying
  the settings, the two readings, the cost figures and anything the sitting scarred.
- **IMPLEMENT**: `discovery/README.md` §The read fence gains the run-1-shaped probe's observation
  beside #287's, with its own date, nonce, cost and verdict.
- **IMPLEMENT**: `.claude/reports/discovery-faster-payment-run-291-report.md` — the verdict per AC,
  the "What ran" table, the two readings, the cost read with the warm/cold split, deviations, and a
  **Not run** section for anything in the paid/owner-only table that did not happen.
- **PATTERN**: `.claude/reports/discovery-later-not-never-run-393-report.md` — section for section.
- **GOTCHA**: the report is the artefact. Chat gets the verdict, the path and the next command.
- **VALIDATE**: `node tooling/build-checks.mjs && node tooling/drift-check.mjs && node tooling/token-lint.mjs && node agent-layer/gen-loc-summary.mjs --check`
- **SATISFIES**: all
- **REGENERATES**: none — verified: no `.md`/`.jsonl` under `discovery/` or `docs/` matches a
  `gen-loc-summary` group regex (observed at `agent-layer/gen-loc-summary.mjs:22-27`). Run `--check`
  anyway as the belt.

---

## TESTING STRATEGY

There is no test suite, no linter and no type-check in this repo, and the CLAUDE.md rule is not to hunt
for one. "Done" means the gates ran and the surface was exercised.

### Gates (unit-equivalent)

`node tooling/build-checks.mjs` — 34 pure groups. The ones this ticket moves: **23** (the fence
predicate over run 1's shape), **30.46** (the carrier count), **32.6** (the corpus sweep), **32.7**
(recorded stamps read off the packages), **31** (the projection over every committed `prd.md`).

### Integration-equivalent

`cd portal && node lib/discovery-transport.mjs --preflight` — 8 rows, zero tokens, proves the op
transport end to end without the SDK spending anything.
`--probe-fence-run-1` — the paid three-turn observation that the gate explicitly cannot reach
(`gates.md:49`: *"whether a fence DENY actually stops a call at either site … the fence probe below
observes each site holding alone"*).

### Edge cases

- **The run goes off-script.** 32.6 turns red by design. T12.
- **The run parks four questions in a row.** `notAForm.tripped` is true and AC #6 is **not met**. Report
  it; do not re-run.
- **Credit runs out mid-sitting.** Duplicate answer lines and error text in the transcript are permanent
  and unedited. T7's GOTCHA.
- **A checkable domain fact filed as `assumption`.** AC #5 failure, reported as a failure.
- **Independent reach under 4/4.** A finding for #293. Not a re-run.

### Proving the checks

Two tasks add checks, and each carries its reddening mutation above: T2 (widen `reads` to admit a key →
`FAILED`) and T3 (flip `deny` to `allow` → case 23 red). T11's is the omission itself. Run each mutation
before trusting the green — memory `check-that-cannot-fail`: every #137 defect survived a green gate the
same way, by skipping the thing it tested.

---

## VALIDATION COMMANDS

### Level 1: Syntax & style

```
node tooling/drift-check.mjs        # includes node --check over every tracked .mjs
```

**GOTCHA**: memory `drift-check-syntax-checks-parked-mjs` — `discovery/prd-projection.mjs.bak2` is an
untracked `.mjs` in this working tree (observed). **Never stage it**; stage by explicit path.

### Level 2: Gates

```
node tooling/build-checks.mjs                 # -> build ✓  all 34 groups pass
node tooling/token-lint.mjs
node agent-layer/gen-loc-summary.mjs --check  # -> loc summary ✓  3 groups — no drift
```

### Level 3: The transport

```
cd portal && node lib/discovery-transport.mjs --preflight     # -> pre-flight ✓  all 8 rows pass, zero tokens
```

### Level 4: Manual

Portal smoke on a private port: `/api/health` (`bootSha == headSha`), `/api/discovery/config`
(regulated preset composes 22). Stop by PID.

### Level 5: The projection

```
node discovery/prd-projection.mjs faster-payment
```

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| T2's `--probe-fence-run-1` | ~$0.40 (observed: #287's equivalent was $0.398) | **yes** — precondition 3 | — |
| T3c's `--probe-affordance` | ~$0.05–0.20 (the probe's own header states it) | **yes** — AC #5's mechanism, and it must run **before** the sitting | — |
| T6 the sealed pre-registration | the owner's own hand | **yes** — precondition 2, and an agent writing it voids AC #3 | — |
| T7 the 22-turn sitting | ~$1.39 warm / ~$1.85 at #393's realised rate (derived: 22 × $0.063 and 22 × $0.0843) | **yes** — every AC | — |
| T10's reading of `_portfolio/decisions.json` | free, but **after the run only** | yes — AC #2 | — |

Total expected: **$1.85–2.45**. Confirm Console spend headroom before T7 (memory
`api-usage-limit-until-2026-10-01`: the "specified API usage limits" 400 is the owner's own Console spend
limit, not a tier cap).

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — the run completes in one sitting; `discovery/faster-payment/` is committed with four
      files (`run.json`, `answers.jsonl`, `transcript.jsonl`, `prd.md`), provenance `fictional`, in-repo
      per the provenance branch.
- [ ] **AC #2** — Independent reach: 4/4 of `m-005`…`m-008` trace to a business or stakeholder
      requirement the run produced, and ≥1 run kill criterion matches a published `would_measure`.
      Post-hoc, against `_portfolio/decisions.json`.
- [ ] **AC #3** — Marginal reach **reported**, not passed: the diff of the run's parents against the
      committed sealed file.
- [ ] **AC #4** — completion reported **with** coverage of the twelve-question opening set, read off
      `runMetrics.coverage`.
- [ ] **AC #5** — auditability over the package: every decision has an evidence link and a wrong-if;
      every evidence row has a provenance label; every checkable domain claim carries a
      `secondary-source` URL. A checkable fact filed as an assumption is reported as a **failure**.
- [ ] **AC #6** — not-a-form: `runMetrics.notAForm.tripped` is false (`longest <= 3`).
- [ ] **AC #7** — the transition note is **n/a with a reason, recorded**: `replacesAProcess: false` in
      `run.json` plus the reason in the report (D1). The projection's `## Transition note` section is
      reported **beside** it as a separate observation, whatever it renders.
- [ ] **AC #8** — turns, tokens, elapsed time and per-turn latency reported, with the warm/cold cache
      split.
- [ ] Preconditions 1–4 executed **in order**, each provable from git history or a committed receipt.
- [ ] `build-checks` 34 groups ✓ · `drift-check` ✓ · `token-lint` ✓ · `gen-loc-summary --check` ✓.
- [ ] No shipped page touched; no VR baseline regenerated.

## COMPLETION CHECKLIST

- [ ] Segment A committed before a penny was spent on the sitting
- [ ] `node tooling/run-1-ready.mjs` exits 0 immediately before the drawer opens
- [ ] Fence probe printed `BOTH_SITES_HOLD`; stdout and trace committed
- [ ] Affordance probe observed a `file_evidence` row with a URL and `secondary-source`; stdout committed
- [ ] Both reddening mutations run and observed red, then reverted
- [ ] Sealed file's commit timestamp earlier than `run.json`'s `startedAt`
- [ ] 22 of 22 answered; session closed with `endedAt` set
- [ ] Eight count sites moved 6 → 7; `discovery/README.md:739` and case 32.7's loop left alone
- [ ] 32.7's `affordanceFingerprint` prose corrected if the run used look-it-up or park
- [ ] All four gates green
- [ ] Report written with a **Not run** section
- [ ] PR body carries `Closes #291` (memory `prs-dont-auto-close-tickets` — the title does not close it)

---

## DECISIONS, ASSUMPTIONS AND FAILURE MODES

### D1 — AC #7 reads the facet, not the rendered section. Both get reported.

"Transition note" names two different things in this codebase, and conflating them is what made AC #7
look unreachable.

| | MVP 10's transition note | The projection's `## Transition note` |
|---|---|---|
| What it is | the pack's seventh artefact: *required when the product changes how an organisation works, markable n/a with a reason otherwise* | a PRD section rendering decisions filed at the `transition` **rung** of the BABOK ladder |
| Where the answer comes from | the `replacesAProcess` facet, ticked at intake | the agent's per-decision `level` choice |
| Run 1's value | **false** — a new consumer flow replacing no process | whatever the agent filed |
| Source | `docs/epics/discovery-question-selection.architecture.md:53-56` | `discovery/README.md:413`, `prd-projection.mjs:291` |

The architecture doc is explicit: *"MVP 10 makes the transition note 'required when the product changes
how an organisation works, and markable n/a with a reason otherwise', and nothing in the session asks.
That the facet vector supplies a rule the PRD already wrote is the evidence this decomposition is the
product's own."* **AC #7 therefore passes on `replacesAProcess: false` plus the report's reason.**

The rendered section is reported beside it as an observation, because it will probably be populated:

| Package | business | stakeholder | solution | transition | `## Transition note` renders |
|---|---|---|---|---|---|
| `later-not-never-1` | 4 | 5 | 13 | **8** | a decision (`s2-riskiest-assumption`) |
| `allergen-matrix-1` | 5 | 4 | 10 | **11** | a decision (`s2-riskiest-assumption`) |

Both from the same question, and that question **is** in run 1's 22. If run 1 does the same, the
finding is that the `transition` rung is being used for "what has to be true and what is riskiest",
which is a business-level claim. That routes to #293. Tightening it means editing the posture prompt,
which moves Think's fingerprint and stales six recordings — a separate ticket, by construction.

### D2 — AC #2 is reachable; the level distribution says so.

AC #2 needs four parents at business or stakeholder level, and nothing guaranteed the agent files there.
Observed: `later-not-never-1` 9 of 30 at those two rungs, `allergen-matrix-1` 9 of 30,
`instrument-loans-1` 4 of 12, `graded-think-a` 9 of 18. Four is comfortably inside that.

### Failure modes and what to do

| If | Then |
|---|---|
| `run-1-ready.mjs` is red | Do not open the drawer. It names the precondition; fix that one. |
| `--probe-affordance` reports `NO_FETCH_OBSERVED` | AC #5's URL route is unproven. **Stop and tell the owner before the sitting** — it changes what the $1.90 can buy. |
| Credit runs out mid-sitting | Fix the balance, **resume the same slug** (`openSession` returns `created: false` for an existing root and the cursor is derived from the last closer). Duplicate answer lines and error text stay unedited — they are the record. |
| A turn is refused by the fence | It lands as a `denied` line with its `via`. Carry on; report it. |
| `notAForm.tripped` is true | AC #6 not met. Report it. Not a re-run. |
| Independent reach under 4/4 | Report the number and which of the four missed. Route to #293. **Not a re-run** — that is the cobra the sealed file guards. |
| The run is mechanically broken (agent supplies content, a closer never files, a fence leak) | *That* is the honesty contract's re-run case. The package is uncommitted until the PR: delete `discovery/faster-payment/`, tighten the posture prompt in its own ticket, re-run the slug. |
| 32.6 red after the run | Expected if lookups landed. T12. |
| 32.6's per-package `ex.unfiled.length === 0` red | Not a number to widen — an off-script exchange filed nothing, which is an MVP 9 violation and a finding. |

### Assumptions

- **A1** — `think` on `claude-sonnet-5`, matching both committed full-depth runs. `think-opus` would cost
  4–5× and put run 1 on a stamp no full-depth package carries.
- **A2** — 22 questions, not "~30". MVP 5 says *"~30, selected"*; the regulated preset composes
  12 + 6 + 4 = 22 (observed). Do not add facets to reach 30 — the vector describes the product.
- **A3 — "denials landing in `transcript.jsonl`" (precondition 3)** means the probe's temp-root
  transcript, committed under `.claude/reports/`, exactly as #287's was. A real run advertises `tools: []`
  (architecture §Boundaries), so the agent can never attempt a `Read` and no denial can ever reach
  `discovery/faster-payment/transcript.jsonl`. Stated so a reviewer does not go looking for them there.
- **A4 — the sealed file's location diverges from the architecture doc, deliberately.** The doc and
  build-checks case 23 both name `<JOBS_DIR>/_portfolio/pre-registration.sealed.md`; the jobs folder is
  not a git repo (observed), so "committed" is unsatisfiable there. T3 keeps the old assertion **and**
  adds the real path, so neither loses its pin. The architecture doc's sentence is now one location out
  of date — fold the correction into #293.
- **A5** — the PRD's 2026-09-02 amendment and the architecture doc's sub-decision link are
  **uncommitted in this working tree** (§Pre-flight P0). D1 rests on
  `discovery-question-selection.architecture.md`, which **is** committed. Commit the two amendments with
  this ticket or confirm another session owns them.
- **Q2 — "denials landing in `transcript.jsonl`" (precondition 3).** A real run advertises `tools: []`
  (architecture §Boundaries), so the agent can never attempt a `Read` and **no denial can ever reach
  `discovery/faster-payment/transcript.jsonl`**. **Assumption:** the precondition is satisfied by the
  probe's temp-root transcript, committed under `.claude/reports/`, exactly as #287's was. Does not
  block; stated so a reviewer does not go looking for denied lines in the run's own transcript.
- **Q3 — the sealed file's location diverges from the architecture doc.** The doc and build-checks case
  23 both name `<JOBS_DIR>/_portfolio/pre-registration.sealed.md`. The jobs folder is **not a git repo**
  (observed), so "committed" is unsatisfiable there. The owner chose
  `docs/epics/fixtures/faster-payment-pre-registration.sealed.md`. The fence denies it (observed). T3
  keeps the old assertion **and** adds the new one, so neither location loses its pin — but the
  architecture doc's §Boundaries sentence is now one location out of date, and #293 should fold that
  correction in.
- **Assumption** — `think` on `claude-sonnet-5`, matching both committed full-depth runs. `think-opus`
  would cost 4–5× and would put run 1 on a stamp no full-depth package carries.
- **Assumption** — 22 questions, not "~30". The PRD's MVP 5 says *"~30, selected"*; the regulated preset
  composes 12 + 6 + 4 = 22 (observed). Do not add facets to reach 30 — the vector is the product's
  description, not a target.

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

**P0 — the tree is dirty at plan time.** `agent-layer/gen-decisions.mjs`,
`docs/epics/discovery-partner.prd.md` and `docs/epics/discovery-partner.architecture.md` all carry
uncommitted edits, and `discovery/prd-projection.mjs.bak2` plus `portal/app.js` are untracked. The PRD's
2026-09-02 amendment (facets replacing the four buckets) and the architecture's sub-decision link are
**uncommitted** — cited here as such. `HEAD == origin/main == 7c50cba` (observed). **Stage by explicit
path** (memory `shared-worktree-parallel-sessions`), and never stage the `.bak2`.

**P1 — every VALIDATE over existing code was driven, not read.**

| Command | Observed |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · token-css · … · group-count` |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` |
| `selectDepth('full-discovery', PRESETS.regulated.facets).length` | **22** |
| `facetPlan(regulated)` | `{declared:true, fired:['regulated'], fits:['regulated'], overflow:[], count:22, budget:31}` |
| `discoveryConfig().facetPlans['01000']` | same, 22 |
| `assertRunSlug('faster-payment')` | no throw |
| `resolveRunRoot({provenance:'fictional', slug:'faster-payment'})` | `<repo>/discovery/faster-payment` |
| `discoveryConfig().hasToken` | `false` — the CLI-login fallback, as the architecture doc records |

**P2 — the fence resolution that would have silently voided precondition 3.** `allowSetFor` admits the
package root **and everything under it**. A sealed file committed inside `discovery/faster-payment/`
returns `{allow: true}` — precondition 3 would have been unsatisfiable by construction. Driven over the
real predicate:

```
false  ./docs/epics/fixtures/faster-payment-pre-registration.sealed.md
false  ./docs/epics/fixtures/faster-payment-input.md
false  <JOBS_DIR>/_portfolio/decisions.json
true   ./discovery/faster-payment/sealed-pre-registration.md    ← the trap
true   ./discovery/faster-payment/answers.jsonl
true   ./discovery/bank.mjs
```

Both chosen paths deny. The `-evil` sibling case (`discovery/faster-payment-sealed.md` → denied) shows
the entry+sep rule is doing the work, not a string prefix.

**P3 — the landed-claims check.** Everything the plan says exists was grepped, and so was everything it
says is missing.
*Exists*: `probeFence` (run-2 shaped, `discovery-transport.mjs:600`), case 23's run-1 arithmetic
(`build-checks.mjs:6923-6924`), the `transition` SECTIONS row + `TRANSITION_NA`
(`prd-projection.mjs:185,291`), `runMetrics` with `coverage`/`notAForm`/`askedWhatMattered`
(`discovery.mjs:689-720`), the regulated preset and its 6-id module (`bank.mjs:992,1047`), the drawer's
preset buttons and five checkboxes (`portal.js:908-916`).
*Missing*: no `faster-payment` anywhere under `discovery/` or `<JOBS_DIR>/_discovery/`; no
`faster-payment-input.md`; no sealed file; no `--probe-fence-run-1` flag; no committed package with a
non-null `facets`.

**P4 — the cascade was counted, and one false site was found.** Nine tree hits for "six recordings".
Eight are the carrier count. The ninth, `discovery/README.md:739`, is about the **six graded
recordings** and does not move. This is exactly the trap #393's report names, one step further: grep the
phrase, grep the number beside the noun, **then read the context**.

**P5 — the advisor's loc-summary cascade does not apply, and this corrects it.** `gen-loc-summary`'s
three group regexes are `system/(wc/)?*.{css,mjs,js}`, `(root|proto/)*.html` and `agent-layer/*.mjs`
(read at `agent-layer/gen-loc-summary.mjs:22-27`). Nothing this ticket adds matches one. Memory
`loc-summary-baseline-cascade` is about `system/` files and does not fire here. `--check` still runs as
the belt, and `loc-summary-counts-tracked-only` still holds: `--check` before staging reads the index,
so run it **after** `git add`.

**P6 — the level distribution, checked before the money (advisor's F1).** AC #2 and AC #7 both depend on
which rung the agent files at, and no plan had ever looked. One command per package:

```
grep -o '"level":"[a-z]*"' discovery/<slug>/transcript.jsonl | sort | uniq -c
```

Result: AC #2 is comfortably reachable (Q4) and AC #7 is probably not (Q1). Both moved into Open
Questions rather than into T9's post-hoc reading, because one of them may be worth resolving before the
sitting. This is the single highest-value thing the pre-flight found.

**P7 — case 32.6 counts lookups, so T12 is expected rather than conditional (advisor's F2).** Its body
sums `ex.settled + ex.unfiled + ex.lookups`. AC #5's `secondary-source` URLs can only be filed by the
look-it-up affordance during a turn, so satisfying AC #5 necessarily turns the corpus tally red. T7
gained the operator instruction; T12 changed from "only if" to "expect this". Without this, AC #5's
mechanism appeared nowhere before T10 — which runs after the sitting is unrepeatable.

**P8 — case 32.7 read, and it does not move (advisor's F4).** It iterates a hardcoded three-slug list
(`build-checks.mjs:9031`), so a seventh `think` carrier leaves its fingerprint assertion alone and T11's
table stays at eight. Its *second* claim does move, conditionally: the transport stamps an
`affordanceFingerprint` whenever `fetching || park` (`discovery-transport.mjs:256`), and 32.7's comment
plus group 32's summary both say no committed package carries one. The assertion behind that claim only
covers three slugs, so it stays green while the prose goes false — added to T11 as a conditional ninth
site.

**P9 — `build-checks` before the paid probe (advisor's F3).** Group 30's transport pins are scoped to the
real turn's own `query()` block because `--probe-fence` already carries a second `cwd: root`. T2 adds a
third code path through that function, which is the shape that breaks a scoped pin, so T2's first
VALIDATE is now the free gate.

**P11 — AC #7 resolved against a committed source, not left open.** The first draft had AC #7 as a
likely failure. It is not: `docs/epics/discovery-question-selection.architecture.md:53-56` states that
the `replacesAProcess` facet **is** MVP 10's transition question — *"nothing in the session asks"*, and
the facet supplies *"a rule the PRD already wrote"*. The projection's `## Transition note` section is a
different artefact keyed on the BABOK rung. Two things sharing one name; D1 separates them and both get
reported. This was found by reading the sub-decision doc the epic's architecture header links, which the
first pass had skimmed.

**P12 — every AC now has a mechanical route, which is what the confidence rests on.** AC #1 `run.json`
+ four files · AC #2 `auditTraceability` + a named `seq` per published decision · AC #3 a diff against
a file `run-1-ready.mjs` proves exists and is tracked · AC #4 `runMetrics.coverage` · AC #5 `ledgerView`
plus `--probe-affordance` proving the URL route works **before** the sitting · AC #6
`runMetrics.notAForm.tripped` · AC #7 `run.json.facets.replacesAProcess` · AC #8 `run.json.turnStats`.
None is a judgement call about whether something "counts".

**P10 — traps carried in from `.claude/references/` and session memory**, each written into the task that
touches the file: `portal-smoke-port-scoped-kill` (T5), `stale-serve-wrong-tree` (T5),
`sdk-error-result-wears-success` (T7), `discovery-run-cache-ttl-cost` (T7),
`discovery-answers-honesty-owner-writes` + `honesty-contract-mirror-direction` (T6, T7),
`api-usage-limit-until-2026-10-01` (T7), `gate-prose-has-three-copies` (T11),
`drift-check-syntax-checks-parked-mjs` (Level 1), `check-that-cannot-fail` (Proving the checks),
`prs-dont-auto-close-tickets` (checklist), `copy-never-indented` (T1),
`visual-regression-baseline-trap` (explicitly not applicable — no shipped page).

### The cost arithmetic, shown

#393: $2.6126 over 31 turns = **$0.0843/turn** realised. Split by interval before the turn: 25 turns
under 5 minutes at **$0.0632** mean, 5 turns at 5 minutes or more at **$0.1844** mean. The gap is the
prompt cache's TTL — a turn after a long pause re-pays for the whole system prompt and ledger.

Run 1 at 22 turns:

- all warm: 22 × $0.0632 = **$1.39**
- at #393's blended rate: 22 × $0.0843 = **$1.85**
- plus the probe's three turns: **~$0.40**

So **$1.8–2.3**, and the whole spread is answer pace. Drafting the 22 answers before opening the drawer
is worth about $0.46 on this run — more than the probe costs.

### Why the marginal-reach row is the one that matters

The owner wrote `m-005`…`m-008` and the owner answers the bank. Independent reach can therefore be
inflated by memory alone: reaching 4/4 might mean the bank works, or might mean the answerer knows the
key. Nothing in the design can separate those, which is why the epic pairs it with a row that memory
cannot touch — the sealed file is the owner's **unaided** answer, so anything the run reached beyond it
is attributable to the bank and to nothing else. A 4/4 with zero marginal reach is a much weaker result
than a 3/4 with a real one, and the report should say so in those terms rather than leading with the
score.

### Rejected alternatives

- **Run it unfaceted at 31 questions**, matching `later-not-never-1` and keeping the comparison clean.
  Rejected: the ticket title says *regulated branch*, and the regulated module is the six questions
  (audit trail, permission model, where data lives, accountable-when-wrong, edge-cases-or-refusals,
  process-as-it-runs) most likely to produce the parents `m-005`…`m-008` serve. A regulated payments
  product run without the regulated module would be a worse test of the same bank.
- **Score the run against all 33 published decisions.** Rejected by the epic itself: only four belong to
  `faster-payment`, they are all solution-level, and scoring a discovery run on a layer it does not
  produce grades the wrong thing.
- **Write the sealed file as an agent and have the owner edit it.** Rejected — an edited draft is still
  anchored on the draft, and the marginal-reach row measures exactly that anchor.

## CONFIDENCE

**10/10 for Segments A and C.** Every task's VALIDATE was driven against the real tree, every citation
resolved, every AC has a mechanical route (P12), the fence trap that would have voided precondition 3
was found and is now gated by `run-1-ready.mjs`, and the eight-site cascade was counted with its two
false siblings (`README.md:739`, case 32.7's loop) excluded by reading their context.

**Segment B is not a one-pass proposition and no plan can make it one** — it is a live session whose
output is the deliverable, and its *content* is the owner's. What this plan controls is that nothing
mechanical fails inside it: preconditions asserted by one command, both paid probes spent before the
sitting rather than after, the look-it-up route proven to file a URL, resume defined for the one failure
that has already happened once, and every disappointing-but-honest outcome routed to a report row
instead of a re-run.

## AMENDMENTS

- 2026-09-13 — three advisor findings folded in and one of mine. Added `tooling/run-1-ready.mjs` (T3b)
  and the `--probe-affordance` observation (T3c) to Segment A; `build-checks` moved ahead of the paid
  fence probe in T2; T12 changed from conditional to expected because case 32.6 counts lookups and AC #5
  needs them; T11 gained a conditional ninth prose site (32.7's `affordanceFingerprint` claim) and two
  explicit non-sites. AC #7 resolved via `discovery-question-selection.architecture.md:53-56` rather than
  left open. Confidence 9 → 10 on the mechanical halves.

- 2026-09-13 (implementation, Segment A) — four plan errors and forced changes, logged so the next plan
  does not repeat them.
  1. **T3b's `PRESETS.regulated.facets` does not exist.** `discovery/bank.mjs:1046` exports `PRESETS` as
     a frozen ARRAY of `{id, label, facets}`. The right expression is
     `PRESETS.find((p) => p.id === 'regulated').facets`. Implemented that way.
  2. **T2's cost table was short by one probe.** Its REDDENS is a second paid three-turn run, which
     §Paid and owner-only never counts. Put to the owner, who chose a free predicate-level redden
     (`allowsPath` + `fenceDecision` over a widened `reads`); the probe's own verdict arithmetic is
     recorded as unreddened with that reason.
  3. **`probeFence` was already broken before this ticket touched it, for a reason no plan could have
     read off the source.** `discovery/bank.mjs` has passed the Read tool's 25,000-token cap, so the
     bank positive control errors on SIZE. Two paid `FAILED` runs before the fix; both committed.
     `held`/`leaked`/`controls` now read every Read attempt and the prompt bounds every read with
     `limit: 5`. Consequence the plan could not know: **#287's committed run-2 receipt is no longer
     reproducible** and needs its own ticket.
  4. **T13's §The read fence edit was pulled forward into Segment A**, because the probe ran in Segment
     A and item 3 is a finding about a committed artefact. T13's other README work is untouched.
