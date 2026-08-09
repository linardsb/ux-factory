# Feature: Studio #213 follow-up — wire the INP rows to the calibration verdict, route the gate through violations(), reword vt-verify's reduced-motion sentence

The following plan should be complete, but validate the line anchors against the working tree before
editing — this repo moves fast and the PR #247 review's anchors had already drifted ~150 lines by
planning time. Every anchor below was re-verified against `main` at `ca262b4` (2026-08-08).

## Feature Description

PR #247 (ticket #213, the studio's measurement gate) merged with an approve-with-comments review
leaving three Medium and one Low finding, all inside the same ~40 lines of `perfPass` in
`tooling/studio-journey.mjs` plus one summary sentence in `tooling/vt-verify.mjs`. This ticket
discharges all four:

1. **Medium — dead-pipeline vacuity.** The per-row INP assertion is `(m.latency ?? 0) <= BUDGET_MS`,
   so a `null` latency (no Event Timing entry) passes unconditionally. The calibration click does
   fail the run when delivery is dead, but the 16 row assertions it exists to protect never consume
   its result: on an engine whose delivery broke, all 16 rows print green beside the single
   calibration red. Fix: keep the calibration verdict in scope (`alive`) and make each row's null
   branch assert it.
2. **Medium — `violations()` never runs in the real gate.** The retry filter and the row assertion
   re-implement the budget comparison inline in two different null idioms
   (`m.latency !== null && m.latency > BUDGET_MS` vs `(m.latency ?? 0) <= BUDGET_MS`); the imported
   helper's only call site is its own self-test control, fed a synthetic entry. The #213 plan
   declined a build-checks group on the premise that the self-test proves the comparator can fail
   *where it is used* — as shipped, that premise doesn't hold. Fix: route both the retry filter and
   the row verdicts through `violations()`.
3. **Medium — vt-verify's summary overclaims.** The #213 take-over and keep-rail samples sit
   entirely inside `if (!reduced)`, but the green summary sentence's tail claims they were sampled
   "under reduced motion too, in every one". One-sentence reword.
4. **Low — a retried row clearing as "below floor".** A row that first measured over budget and
   whose retry yields no entry passes via the `?? 0` idiom. Treat that combination as
   inconclusive-red (falls out of fix 2's restructuring).

## User Story

As the operator running the studio's measurement gate
I want a dead Event Timing pipeline to produce 16 named reds instead of 16 vacuous greens, and the
budget comparator to be the same single function everywhere it decides anything
So that the gate's green is trustworthy — the exact property (memory `check-that-cannot-fail`) this
repo's gates exist to have.

## Problem Statement

The measurement gate's decision logic has three seams where a green can be a lie: a null latency
passes without consulting the calibration that makes null meaningful, the comparator under self-test
is not the comparator in the gate, and a retry that yields nothing clears a row that had measured
over budget. Separately, vt-verify's summary sentence claims reduced-motion coverage for two samples
the code path cannot reach with `reduced === true`.

## Solution Statement

All inside `perfPass` plus one sentence: capture the calibration verdict as `const alive`, make it
the null branch's verdict; introduce a tiny local `overLabels()` that maps `measured` rows through
the imported `violations()` and use it for BOTH the retry filter and the row verdicts (deleting both
inline comparisons); make `null latency + retried` a named inconclusive-red on the assertion path
AND on both print paths (the review praised "both numbers print on every path" — preserve it);
reword vt-verify's summary tail so the reduced-motion claim scopes to what the reduced pass actually
covers. Zero behavioural change on a healthy engine; 16 honest reds on a dead one.

## Out of Scope / Non-Goals

- **Not adding** a build-checks group for `inp-observer.mjs`'s helpers — the #213 plan declined it;
  fix 2 restores the declined premise instead (the self-test now guards the comparator the gate uses).
- **Not changing** `BUDGET_MS`, the 16 ms floor, the flush timing, the row list, the retry's
  run-the-whole-sequence design, or the throttled-drag half — the findings are about decision
  logic and wording only.
- **Not extending** vt-verify's reduced-motion pass to actually cover the take-over/keep-rail
  samples. The review explicitly calls skipping them "a reasonable call — the sentence just has to
  say so". Making the sentence honest is the fix; new coverage would be a new ticket.
- **Not touching** any shipped page or `system/` module — verified: no VR baseline regen, no
  loc-summary regen (`agent-layer/gen-loc-summary.mjs:22-26`'s GROUPS never match `tooling/`), no
  param-manifest entry.
- **Not renaming** the row assertions — the red-run proof and future greps depend on the stable
  `INP · <label> ≤ 200 ms` names.

## Feature Metadata

**Feature Type**: Bug Fix (review-finding follow-up)
**Estimated Complexity**: Low
**Primary Systems Affected**: `tooling/studio-journey.mjs` (perfPass only), `tooling/vt-verify.mjs`
(summary sentence + one comment)
**Dependencies**: none new — Playwright resolved out of `tooling/visual-regression/node_modules` as
always

## Related Work

**Implements**: [#249](https://github.com/linardsb/ux-factory/issues/249) · **Epic**: #202
(Prototype Studio) — `docs/epics/prototype-studio.architecture.md`. Epic-level calls (the gate is
operator-run not CI, the observer is driver-injected and nothing ships, the 200 ms budget is the
PRD's WRONG-if guardrail) are inherited, not re-decided.

**Back-references**:

- `.claude/code-reviews/pr-247-review.md` — the four findings verbatim, with the reviewer's own fix
  sketches this plan follows
- `.claude/reports/studio-gates-213-report.md` — the #213 red-run shapes (its BUDGET_MS=1 run shows
  the exact `retried: … → < 16 ms (below floor)` line fix 4 makes honest)
- `.claude/plans/studio-gates-213*.md` (if present) — the plan whose "self-test proves the
  comparator where it is used" premise fix 2 restores

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `tooling/inp-observer.mjs` (whole file, 55 lines) — Why: `summarize()` and `violations()` are the
  two pure helpers; `violations()` (lines 53-55) filters `i.latency > budgetMs`, and `null > 200`
  is `false`, so routing rows with null latency through it is exactly equivalent to the current
  `m.latency !== null && m.latency > BUDGET_MS` filter. Do NOT pre-coalesce null to 0 — that is the
  precise `?? 0` idiom being removed.
- `tooling/studio-journey.mjs:40` — Why: the import line (`OBSERVER_INIT, summarize, violations`)
  already exists; no import change needed.
- `tooling/studio-journey.mjs:234` — Why: the `t(name, cond, extra = "")` assertion helper's shape.
- `tooling/studio-journey.mjs:3003-3058` — Why: perfPass's header comment + the calibration block.
  `calSeen` (line 3055) and its assertion (3056-3057) are where `alive` gets captured; the
  calibration page closes at 3058 but `calSeen` stays in perfPass scope for the whole engine run.
- `tooling/studio-journey.mjs:3067-3144` — Why: ROWS_FACTORY (14 rows) + ROWS_MIDREPLAY (2 rows) —
  the 16 rows the red-run proof must count.
- `tooling/studio-journey.mjs:3146-3217` — Why: the ~40 lines all four findings live in — the
  runSequence doc comment (3146-3148, "latency null = … a pass" needs its caveat), the retry block
  (3188-3205: comment 3188-3190, filter 3191-3192, print 3202, write-back 3203), the table print
  (3209-3213), the row assertions (3214-3217).
- `tooling/studio-journey.mjs:3219-3223` — Why: the self-test control — KEEP it; after fix 2 it is
  no longer the helper's only call site, which is the point.
- `tooling/vt-verify.mjs:400-527` — Why: the `for (const reduced of [false, true])` factory loop.
  What actually runs under `reduced === true`: the compile beat only (its movement re-proven at
  448-462). What does NOT: the load/replay boot assertion (:424), the mid-playback sample
  (:428-446), the #213 take-over + keep-rail samples (:480-517). The reword must scope the claim to
  exactly this.
- `.claude/code-reviews/pr-247-review.md` — Why: the findings' full text and the validation table to
  match.

### New Files to Create

- (none — plus the standard PIV artifacts: this plan, `.claude/reports/` execution report, review
  file, all committed in the same PR per CLAUDE.md's git rule)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `tooling/inp-observer.mjs` header comment — the Event Timing semantics (16 ms floor, no entry ⇒
  latency < 16 IF delivery is proven alive) — this is the invariant fix 1 wires into the rows.
- Memory `check-that-cannot-fail` — "run the comparator, don't grep it"; the red-run proof is this
  ticket's application of it.
- Memory `build-journey-failure-vs-flake` — a matching flake signature can still be a real
  regression; stash and re-run HEAD to tell them apart.
- PR #247 review "Validation" section — the EADDRINUSE port-collision precedent: a first webkit red
  may be a dead static server, not code; re-run against a fresh server on an owned port.

### Patterns to Follow

**Assertion naming:** keep `INP · ${label} ≤ ${BUDGET_MS} ms` verbatim — the ticket's acceptance
("16 named reds") and future greps key on it.

**Honest reporting on every path** (the review's praise — preserve): every latency path prints both
numbers; the new inconclusive state must print as itself in the retry line, the table AND the
assertion detail, never as "< 16 ms (below floor)".

**Comment style:** perfPass narrates *why* each guard exists (see 3010-3017, 3188-3190). The edits
carry the same register — one sentence on why null now consults `alive`, one on why a null retry is
inconclusive rather than a pass.

**Surgical changes:** nothing outside perfPass and the vt-verify sentence/comment moves.

---

## IMPLEMENTATION PLAN

### Phase 1: perfPass decision logic (fixes 1, 2, 4)

All in `tooling/studio-journey.mjs`, one coherent edit — the three findings share the same lines,
which is why the ticket bundles them.

### Phase 2: vt-verify sentence (fix 3)

**Independent of:** Phase 1 — different file, different gate; can run in either order (same session,
same branch — not worth a parallel worktree for one sentence).

### Phase 3: Validation & red-run proof

**Depends on:** Phases 1-2.

---

## STEP-BY-STEP TASKS

### UPDATE tooling/studio-journey.mjs — capture the calibration verdict as `alive` (fix 1, part 1)

- **IMPLEMENT**: at lines 3055-3057, hoist the verdict out of the assertion so the assertion and the
  consumed value cannot diverge:

  ```js
  const calSeen = summarize(await entriesFrom(cal, 0));
  // The verdict the 16 rows below consume: a null latency is only a pass while THIS is true.
  const alive = calSeen.length >= 1 && calSeen.every((g) => g.interactionId > 0);
  t(`INP · the observer pipeline is ALIVE on ${engineName} — a forced-slow click yields a grouped entry`,
    alive, JSON.stringify(calSeen));
  ```
- **PATTERN**: existing assertion at 3056-3057 — same name, same extra; only the condition moves
  into a named const.
- **GOTCHA**: `alive` must be declared with `const` in perfPass's top-level scope (it is — the
  calibration block isn't nested), because the row loop ~160 lines later reads it.
- **VALIDATE**: `node --check tooling/studio-journey.mjs`
- **SATISFIES**: finding 1 (foundation)

### UPDATE tooling/studio-journey.mjs — route the retry filter through violations() (fix 2, part 1)

- **IMPLEMENT**: replace the inline filter at 3191-3192 with a tiny local helper used by both
  decision paths (this is the "one place to fix" the review asks for):

  ```js
  // The ONE comparator (PR #247 review, finding 2): both the retry filter and the row verdicts
  // below consume the imported violations() — an inline re-implementation here is the bug class
  // the self-test control exists to catch and could not see.
  const overLabels = (obj) => violations(
    Object.entries(obj).map(([label, m]) => ({ label, latency: m.latency })), BUDGET_MS,
  ).map((v) => v.label);
  const over = overLabels(measured);
  ```
- **PATTERN**: `violations()` at `tooling/inp-observer.mjs:53-55` — it reads only `.latency`;
  passing `{label, latency}` rows is exactly the summarize()-row shape it was written against.
- **GOTCHA**: `null > BUDGET_MS` is `false`, so null-latency rows are excluded by `violations()`
  itself — do NOT add a null guard or a `?? 0`; either would re-create an inline null idiom.
- **VALIDATE**: `node --check tooling/studio-journey.mjs`
- **SATISFIES**: finding 2

### UPDATE tooling/studio-journey.mjs — the retry print names the inconclusive case (fix 4, part 1)

- **IMPLEMENT**: at line 3202, a retry landing on null is no longer printed as a pass:

  ```js
  console.log(`    retried: ${label} ${measured[label].latency} ms → ${re.latency === null ? "no entry (inconclusive)" : `${re.latency} ms`}`);
  ```

  and update the retry-rule comment (3188-3190) — "Red only if still over" becomes "Red if still
  over — or if the retry yields no entry for a row that measured over: calibration proves the floor
  is real for a FIRST null, but a null that follows an over-budget measure is inconclusive, not a
  clearance."
- **PATTERN**: the printed-rule discipline at 3188-3190 (AC #7: silent tolerance is the named sin —
  the rule and the print change together).
- **VALIDATE**: `node --check tooling/studio-journey.mjs`
- **SATISFIES**: finding 4

### UPDATE tooling/studio-journey.mjs — the table print distinguishes the retried-null row (fix 4, part 2)

- **IMPLEMENT**: at line 3211, the null case forks on `m.retried`:

  ```js
  const ms = m.latency === null
    ? (m.retried ? "no entry after retry (inconclusive)" : "< 16 ms (below observer floor)")
    : `${m.latency} ms`;
  ```
- **GOTCHA**: `m.retried` is always a number > BUDGET_MS when present (the filter only admits
  over-budget rows, so it can never be 0) — truthiness is safe and matches line 3212's existing
  `m.retried ?` idiom.
- **VALIDATE**: `node --check tooling/studio-journey.mjs`
- **SATISFIES**: finding 4 (honest reporting on every path)

### UPDATE tooling/studio-journey.mjs — the row verdicts consume alive + violations() (fixes 1, 2, 4 — the load-bearing edit)

- **IMPLEMENT**: replace the assertion loop at 3214-3217 with the three-way verdict. No inline
  budget comparison may remain:

  ```js
  const stillOver = new Set(overLabels(measured));
  for (const [label, m] of Object.entries(measured)) {
    // null + never retried → a floor pass ONLY while calibration proved delivery (finding 1);
    // null + retried      → the row measured over and the retry proved nothing (finding 4);
    // a number            → the imported comparator decides, same as the retry filter (finding 2).
    const pass = m.latency === null ? (alive && !m.retried) : !stillOver.has(label);
    const detail = m.latency === null
      ? (m.retried
        ? `inconclusive — first measured ${m.retried} ms over budget, the retry yielded no entry`
        : `no entry (< 16 ms floor) · calibration ${alive ? "alive" : "DEAD — nothing was delivered this run"}`)
      : `${m.latency} ms${m.retried ? ` (retried from ${m.retried} ms)` : ""}`;
    t(`INP · ${label} ≤ ${BUDGET_MS} ms`, pass, detail);
  }
  ```
- **PATTERN**: assertion name unchanged from 3215; detail strings extend 3216's existing shape.
- **GOTCHA**: `stillOver` is computed AFTER the retry merge (3203 rewrote `measured[label]`), so it
  reflects post-retry latencies — that is what makes "red only if still over" hold for the numeric
  branch. Don't hoist it above the retry block.
- **VALIDATE**: `node --check tooling/studio-journey.mjs`
- **SATISFIES**: findings 1, 2, 4

### UPDATE tooling/studio-journey.mjs — the two doc comments state the new wiring

- **IMPLEMENT**: (a) runSequence's doc (3146-3148): "latency null = no entry = below the 16 ms
  floor (a pass — see the header)" gains the caveat "— a pass the row assertions grant only against
  the calibration verdict, never outright". (b) perfPass's header (3010-3017): after "no calibration
  at all lets a silently-dead observer turn every budget row vacuous-green", add one sentence: "The
  rows CONSUME that verdict (PR #247 review): a dead pipeline is sixteen named reds, not one."
- **PATTERN**: the header's narrated-why register (3010-3017).
- **VALIDATE**: `node --check tooling/studio-journey.mjs`
- **SATISFIES**: findings 1, 4 (the printed/recorded rule matches the code)

### UPDATE tooling/vt-verify.mjs — scope the reduced-motion claim (fix 3)

- **IMPLEMENT**: reword line 527's tail. Current tail (after the compile-beat clause):

  > `…and (#213) its take-over handover and #210 keep-rail copy + export clicks — the interactions the earlier samples predate — sampled the same way with movement proven first: under reduced motion too, in every one (${toRun.join(", ")})`

  Replace with (keeping "in every one (engines)" — that claim is true; only the reduced-motion
  scope moves):

  > `…its #207 compile beat, whose crossfade opens no transition at all — that one under reduced motion too — and (#213) its take-over handover and #210 keep-rail copy + export clicks — the interactions the earlier samples predate — sampled the same way with movement proven first, full motion only by design, in every one (${toRun.join(", ")})`

  Also add one comment line above the guard at :480:
  `// Skipped under reduced motion BY DESIGN (PR #247 review, finding 3) — the summary sentence says so.`
- **GOTCHA**: "in every one" refers to the ENGINES in the trailing parenthetical, not the samples —
  don't delete it, or the sentence loses its true cross-engine claim. And don't overclaim in the
  new direction either: the mid-playback sample (:428) and the boot assertion (:424) are also
  not-reduced (they predate #213 — the review notes the pattern "partially predates this PR"), so
  the reword must not imply reduced coverage extends to anything beyond the compile beat within the
  factory block.
- **VALIDATE**: `node --check tooling/vt-verify.mjs`
- **SATISFIES**: finding 3

### RUN the full validation ladder (see VALIDATION COMMANDS)

- **IMPLEMENT**: branch first (work is on `main` per repo convention, but PR flow needs a branch —
  follow the standard ticket flow: branch `213-followup-249` or similar, PR body carries
  `Closes #249`), then run every level below and capture the dead-pipeline red run's output for the
  report.
- **VALIDATE**: all commands below
- **SATISFIES**: the ticket's stated validation clause

---

## TESTING STRATEGY

No test suite in this repo — "done" = run the surface you touched. The touched surfaces are two
operator gates, so the gates themselves are the tests, plus one mutation run each way per memory
`check-that-cannot-fail`:

### The healthy runs (zero behavioural change claim)

`studio-journey` all three engines green, `vt-verify` all three engines green. On a healthy engine
every verdict is identical to before the change: null+alive passes, numbers ≤ 200 pass, the retry
clears a row that re-measures under budget.

### The red runs (the fix is the point — prove each can fail)

1. **Dead pipeline (fix 1):** temporarily break delivery in `tooling/inp-observer.mjs`'s
   OBSERVER_INIT — change `type: "event"` to `type: "mark"` (observer installs, receives nothing).
   Run `node tooling/studio-journey.mjs chromium`. Expect in the INP section: the calibration
   assertion red AND all 16 rows red with the `calibration DEAD` detail — 17 named reds, zero
   vacuous greens. Revert the mutation. (Before the fix, this exact mutation yields 1 red + 16
   greens — the finding.)
2. **Inconclusive retry (fix 4):** temporarily set `BUDGET_MS = 1` (line 3019), run chromium. Every
   row with an entry flags and retries; any row whose retry floors out (the #213 report's own
   BUDGET_MS=1 run showed `retried: keyboard arrow step 24 ms → < 16 ms (below floor)`) must now
   print `no entry (inconclusive)` in the retry line and go red with the inconclusive detail.
   Revert. (If no retry happens to floor out on the run, re-run once — the report's runs show this
   shape reliably on fast rows.)
3. **Comparator visible in the gate (fix 2):** optional spot-proof — with BUDGET_MS=1 still set, the
   reds now flow through `violations()`; no separate mutation needed beyond the standing self-test.

### Edge Cases

- A row that is null on FIRST measure and never retried: still a pass (alive) — unchanged.
- A row over budget whose retry measures a NUMBER under budget: still clears, `retried from` prints —
  unchanged.
- webkit's `Meta+z` vs `Control+z` row and the chromium-only throttled-drag half: untouched; confirm
  the three engines' pass counts match the #247 review's table shape (286/282/282 ± the environment).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node --check tooling/studio-journey.mjs && node --check tooling/vt-verify.mjs && node --check tooling/inp-observer.mjs
```

### Level 2: Pure helpers (the #213 plan's own one-liner, still true)

```bash
node -e 'import("./tooling/inp-observer.mjs").then(m => { const s = m.summarize([{interactionId:1,duration:250},{interactionId:1,duration:30}]); console.log(JSON.stringify(s), JSON.stringify(m.violations(s,200)), JSON.stringify(m.violations(s,300))); })'
# expect: one grouped interaction latency 250 · flagged at budget 200 · empty at budget 300
```

### Level 3: Regression sanity

```bash
node tooling/build-checks.mjs   # all 19 groups ✓ — nothing here touches them; a red means an environment problem
```

### Level 4: The gates themselves (the ticket's stated validation)

```bash
node tooling/visual-regression/serve.mjs &   # fresh server, own port — the #247 EADDRINUSE lesson
node tooling/studio-journey.mjs all          # green on chromium + firefox + webkit
node tooling/vt-verify.mjs                   # green, all three engines, with the reworded sentence printing
```

### Level 5: The red-run proofs (capture output for the report, then revert the mutations)

```bash
# 1 · dead pipeline → 17 named reds (1 calibration + 16 rows), chromium is enough
#     (edit inp-observer.mjs OBSERVER_INIT type:"event" → type:"mark" first)
node tooling/studio-journey.mjs chromium
# 2 · BUDGET_MS=1 → the inconclusive-retry shape prints and goes red
node tooling/studio-journey.mjs chromium
git diff tooling/  # afterwards: must show ONLY the intended fixes, no leftover mutation
```

---

## ACCEPTANCE CRITERIA

- [ ] With delivery dead (OBSERVER_INIT mutated), the INP section yields 16 named row reds plus the
      calibration red — no vacuous green rows (finding 1).
- [ ] `violations()` is consumed by BOTH the retry filter and the row verdicts; no inline
      `> BUDGET_MS` / `?? 0` budget comparison remains anywhere in perfPass outside the helper
      (finding 2 — grep check: `grep -n "BUDGET_MS" tooling/studio-journey.mjs` shows only the
      const, `overLabels`, prints/labels, and the self-test).
- [ ] A row that measured over budget and whose retry yields no entry is red with an
      "inconclusive" detail, and prints as inconclusive in the retry line and the table (finding 4).
- [ ] vt-verify's summary no longer claims reduced-motion coverage for the take-over/keep-rail
      samples; the cross-engine "in every one" claim survives (finding 3).
- [ ] `node tooling/studio-journey.mjs all` green on all three engines (healthy behaviour unchanged).
- [ ] `node tooling/vt-verify.mjs` green on all three engines.
- [ ] `node tooling/build-checks.mjs` all 19 groups ✓.
- [ ] Both mutations reverted; `git diff` shows only the intended edits.
- [ ] PR body carries `Closes #249`; plan + report (+ review when it exists) committed in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's `node --check` passed immediately
- [ ] All five validation levels executed successfully
- [ ] Red-run outputs captured verbatim into the execution report
- [ ] Acceptance criteria all met
- [ ] No file outside `tooling/studio-journey.mjs` + `tooling/vt-verify.mjs` (+ `.claude/` artifacts) changed

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption — fix 4's scope:** inconclusive-red applies ONLY to `null latency + retried`; a
  first-measurement null stays a floor-pass gated on `alive`. This is exactly the review's framing
  ("calibration proved delivery, so no-entry legitimately means < 16 ms" for first measures).
- **Assumption — no CLAUDE.md edit:** the studio-journey CLAUDE.md row's claims stay true (they
  become *more* true — "no calibration lets a dead observer turn every row vacuous-green" now has
  the rows consuming the verdict). If the implementer disagrees, the edit is one clause, not a
  rewrite.
- **Assumption — the reword keeps vt-verify's single-sentence narrative style** rather than
  restructuring the summary into per-sample lines; the review asks for "one-sentence rewording".
- **Flake handling:** a webkit or vt-verify red on first run may be the #247-documented
  server-collision infrastructure failure — re-run against a fresh server before treating it as a
  regression (memory `build-journey-failure-vs-flake`).

## NOTES (open canvas)

**Why `overLabels` over per-row `violations([m])` calls:** both satisfy "route through the helper";
the Set version calls `violations()` once per decision point with the full labeled row set, which
mirrors the helper's actual contract (a set in → the violating subset out) instead of degenerating
it into a scalar comparator. It also keeps the retry filter and the assertion loop visibly the same
computation, which is the finding's real complaint.

**Why the null branch never touches the budget:** after the restructure, a null latency asserts
`alive && !m.retried` — a delivery claim and a retry-history claim, not a budget claim. So "no
inline budget comparison remains" is achievable literally, not just in spirit; the grep-check AC
encodes that.

**Row count arithmetic for the red run:** ROWS_FACTORY = zoom-in, fit, reset, slot pointer-drag,
keyboard grab, keyboard arrow step, keyboard drop, undo, redo, panel tab arrow, compile, revert,
keep copy-link, export (14) + ROWS_MIDREPLAY = transport pause, take-over pointerdown (2) = 16.

**Rejected alternative for fix 3:** running the take-over/keep-rail samples under reduced motion
for real. Rejected because the review explicitly blesses the skip, the reduced context would need
its own settled-replay wait (~30 s more per engine), and the samples prove *movement* (a download
event, a `?b=` URL) whose motion story is nil — the compile beat is the reduced pass's real subject.

**What NOT to learn from the review's line numbers:** the review anchors (3039, 3062, 3068) are
against the PR-head tree; current anchors are 3191-3192, 3215, 3221. Re-verify with
`grep -n "?? 0\|latency !== null\|const control = violations" tooling/studio-journey.mjs` before
editing if anything else lands on main first.

## AMENDMENTS

(none yet)
