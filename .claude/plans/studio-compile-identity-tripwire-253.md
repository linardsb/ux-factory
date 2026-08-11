# Feature: studio compile beat — identity tripwire for the mid-"compiling" redraft (#253)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

`applySwap` (system/studio-compile.mjs:401-440) guards a compile beat's swap with a **count-only**
tripwire: `wrappers.length !== screens.length` throws the loud refusal. But a method-card redraft
inside the beat's ~2 s "compiling" window (`adoptBoard`, system/studio.mjs:597-624) removes every
wrapper and places new ones for the drafted board. When the drafted board's place count **equals**
the old board's — plausible, since most `draftBoard` outputs land at 3–4 places — the counts agree
and the OLD board's compiled screens are silently swapped onto the NEW board's wrappers:
mislabeled content, `wireFlow` wired to stale screens, no refusal.

This ticket upgrades the tripwire from *count* to *identity*: `compile()` snapshots the stage's
wrapper **elements** at the moment it reads the board, and `applySwap` refuses — through the exact
refusal path the count mismatch already uses — whenever the wrappers on the stage are no longer
the ones the screens were compiled for. The same-count collision becomes the same loud refusal,
recoverable via "Back to blocks", and `adoptBoard`'s overclaiming comment (PR #252 review, M1)
becomes true instead of merely corrected.

## User Story

As a studio visitor who answers a method card while the compile beat is mid-"compiling"
I want the in-flight compile to refuse loudly instead of silently dressing my new board in the old board's screens
So that the canvas never shows mislabeled content wired to a board I already set aside, and "Back to blocks" always recovers a truthful stage.

## Problem Statement

A sub-2 s race window exists between `compile()` reading the board and `applySwap` writing the
stage. `adoptBoard` handles the settled states (it reverts a compiled stage before clearing) and
deliberately leaves the mid-"compiling" case to the beat's own tripwire — but that tripwire only
compares counts, so a same-count redraft corrupts the stage silently. Disclosed in the #214
report's "Issues encountered", confirmed as finding M1 in `.claude/code-reviews/pr-252-review.md`.

## Solution Statement

An **element-identity snapshot** inside `mountCompile`:

1. `compile()` captures `stageAtCompile = [...stage.querySelectorAll(".stx-slot")]` in the same
   synchronous block that reads the board (studio-compile.mjs:483) — the wrappers and the board it
   compiles are one consistent picture, no await between them.
2. `applySwap` checks identity **first**, before the count tripwire: if the current wrappers are
   not the same elements in the same order, throw a fixed-string Error. The existing catch in
   `compile()` (:517-524) renders it as the refusal card and settles `"refused"` — no new UI, no
   new state.
3. `settle()` nulls the snapshot so detached wrappers (removed by `adoptBoard`) are not pinned for
   the life of the page.
4. Comments updated: `adoptBoard`'s mid-"compiling" paragraph (studio.mjs:606-609) and
   studio-compile.mjs's header tripwire paragraph (:44-50) now describe an identity tripwire.

**Why identity, not the ticket sketch's literal "generation stamp on wrappers":** the ticket names
"identity/generation" as alternatives. Element identity IS the stamp — the wrapper reference —
and it wins on three counts: (a) no counter reaches a DOM attribute (studio-compile.mjs header
call 4: determinism is a requirement — no counter in an attribute or string, and the settled
canvas is a pixel baseline); (b) **zero new seams** — `adoptBoard` and `mountCompile`'s options
object are untouched, the whole fix lives inside studio-compile.mjs; (c) it guards **any**
unforeseen wrapper churn, not just `adoptBoard`'s — e.g. the driver's post-settle `seekTo`
(replay-driver.mjs:698-716) also removes and re-mints every wrapper, and a seek-back-then-forward
inside the compile window currently produces the same silent swap; a generation counter bumped
only by `adoptBoard` would miss it.

## Out of Scope / Non-Goals

- **Not aborting the beat early.** The refusal fires at the render step (where `applySwap` runs),
  same as the count tripwire today — not per-step. Steps 1–3's announcements still describe the
  old board for up to ~1.7 s after a redraft; that window ends in the loud refusal. An early-exit
  staleness check after each `wait()` was considered and rejected: it duplicates the check, adds
  branches the journey must cover, and the ticket asks only that the swap refuse.
- **Not changing what `adoptBoard` does** — no revert-mid-compiling, no queuing the redraft until
  the beat settles, no disabling the cards during "compiling". The band staying live mid-beat is
  the existing design; the tripwire is the guard.
- **Not touching** `system/studio-method.mjs`, `replay-driver.mjs`, `pattern-render.mjs`,
  `studio-flow.mjs`, the pure layer (`compileSteps`), or build-checks group 15 code (the group's
  boundary statement already delegates "the tripwire refusal" to studio-journey — the wording
  stays true with two tripwires behind it).
- **Not asserting** the undo-after-redraft dead-wrapper-ids behavior (#214 report, accepted).
- **No pixel-baseline regen** — the refused state is reachable only through interaction, and the
  gate never interacts; at-rest DOM is unchanged.
- **No `param-manifest.json` entry** — no new control; the refusal card is an existing surface in
  a new circumstance.

## Feature Metadata

**Feature Type**: Bug Fix
**Estimated Complexity**: Low (the fix) / Medium (the journey proof)
**Primary Systems Affected**: `system/studio-compile.mjs` (fix), `system/studio.mjs` (comment),
`tooling/studio-journey.mjs` (methodPass extension)
**Dependencies**: none new — vanilla page rules hold; Playwright resolved from
`tooling/visual-regression/node_modules` as the journey already does

## Related Work

**Implements**: [#253](https://github.com/linardsb/ux-factory/issues/253) ·
**Epic**: #202 — `docs/epics/prototype-studio.architecture.md` (inherited: import-never-fork,
one-mover invariant, determinism-as-requirement, refusals-never-throw-to-console; nothing here
reopens any of them)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/studio-compile-beat-207.md` — the beat, the count tripwire's origin, the refusal path
- `.claude/plans/studio-method-cards-hook-loop-214.md` — `adoptBoard`, the redraft, the disclosed boundary this closes
- `.claude/code-reviews/pr-252-review.md` finding M1 — the confirming analysis
- `.claude/reports/studio-method-cards-hook-loop-214-report.md` §Issues encountered — the disclosure

**Forward-references**:

- (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/studio-compile.mjs` (lines 38-50 header; 378-440 `applySwap` + stash; 442-528 `compile()`,
  the wait/liveness discipline, the catch that renders the refusal; 463-469 `settle()`) — Why: the
  fix lives here; the snapshot must sit in `compile()`'s synchronous head (:477-484, before the
  first await) and the check at the top of `applySwap`.
- `system/studio.mjs` (lines 597-624 `adoptBoard`; 522-548 `publishBoard`) — Why: the race's other
  half; the comment at :606-609 is M1's overclaim and must be rewritten to the now-true sentence.
- `system/studio-method.mjs` (lines 254-263 `redraft`, 307-328 the BUILD_CHANGE listener) — Why:
  the trigger path (radio change → `setAnswers` → listener → `redraft` → `adoptBoard`, all
  synchronous). Read-only; do not edit.
- `system/breadboard.mjs` (lines 96-146 `draftBoard`) — Why: the journey computes expected boards
  in Node from these rules (methodPass's stated discipline, studio-journey.mjs:59).
- `tooling/studio-journey.mjs` (lines 66 `VIEWPORT`; 199-230 `countLive`/`liveSeen`; 3069-3318
  `methodPass` — the `park`/`check` helpers, the watch() error contract, the Node-computed
  expectations idiom; 2121-2140 compilePass's `stageState`/`settled`/button locators, the idiom to
  mirror) — Why: the new case extends methodPass and must reuse its helpers and register.
- `system/studio-flow.mjs` (lines 73-95 `renderScreen`) — Why: `.stf-screen` /
  `.stf-screen-name` are the classes the journey reads to tell a compiled screen from a
  fat-marker `stu-place` block.
- `system/replay-driver.mjs` (lines 695-716 `seekTo`) — Why: confirms seek rebuilds wrappers —
  the second churn path the identity check covers; cite it in the tripwire comment.

### New Files to Create

- (none — three edits, no new modules)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `.claude/code-reviews/pr-252-review.md` (finding M1, lines 21-31) — the exact defect statement
  and the two named fix options.
- `.claude/reports/studio-method-cards-hook-loop-214-report.md` (§Issues encountered) — the
  disclosed boundary, including "recoverable via Back to blocks", which the journey must prove.
- `CLAUDE.md` §Ground rules — refusals render as cards, never console errors;
  studio-journey's no-page-errors contract is a real assertion the new case must not trip.

### Patterns to Follow

**The refusal path (reuse, don't add):** `applySwap` throws a plain `Error`; `compile()`'s
existing `catch` (studio-compile.mjs:515-524) calls `renderRefusal(err, result)` and settles
`"refused"` with the fixed sentence. The identity throw rides this path unchanged.

**Fixed strings only:** every string that can land in a settled DOM is a fixed constant (header
call 4). The identity message interpolates nothing:

```js
throw new Error("the canvas was redrafted while this compile was mid-beat — these screens were "
  + "compiled from a board that is no longer on the stage, so the swap cannot apply to it");
```

**Comment register:** block comments in these files argue the constraint, cite the ticket, and
name the file:line they lean on (see the count tripwire's comment at :404-408 for the shape).

**Journey case register:** `t("#253 · <claim>", <boolean>, <detail>)`; expectations computed in
Node from the same committed rules the page runs (`draftBoard`, methodPass:3147); every
interaction parks its target instantly first (smooth-scroll race, methodPass:3075-3082); page
errors and console errors collected by `watch()` fail the run.

---

## IMPLEMENTATION PLAN

### Phase 1: The journey case, red (proof the check can fail)

Write the methodPass case FIRST and run it against unfixed code — it must fail (the beat settles
`"rendered"` with stale screens; the wait for `"refused"` times out). This is the repo's
"mutate the source, run the function" discipline (memory: the-check-that-cannot-fail): a green
gate is only trusted after it has been seen red.

### Phase 2: The fix

**Depends on:** Phase 1 (the red run must be recorded before the fix turns it green)

The snapshot, the check, the release, the three comment updates.

### Phase 3: Validation & drift

Re-run the journey green on chromium, then all three engines; build-checks; loc-summary drift.

---

## STEP-BY-STEP TASKS

### UPDATE `tooling/studio-journey.mjs` — methodPass: the #253 case

- **IMPLEMENT**: a new page block at the end of `methodPass`, after the `p3` block (:3315
  `await p3.close();`) and before `await ctx.close();` (:3317). Sketch (adapt to the file's
  helpers; `VIEWPORT` is `"[data-studio-canvas]"`):

```js
// --- #253 · a same-count redraft mid-"compiling" REFUSES instead of swapping stale screens ----
// The window: compile() reads the board, then walks four ~420 ms steps before applySwap. A card
// answered inside it redrafts the stage (adoptBoard removes every wrapper). Same place count —
// worklist board (3) redrafted to the hunt variant (3) — so the count tripwire cannot see it;
// the identity tripwire must, and the refusal must land through the beat's own card.
const p4 = await ctx.newPage();
watch(p4, "method midcompile");
await p4.goto(`${BASE}/factory.html`, { waitUntil: "load" });
await p4.waitForSelector('[data-replay="settled"]', { timeout: 30000 });
// A drafted 3-place board on the stage, then compile IT (not the run's 4-place board).
await check(p4, 'input[name="stm-q-shape"][value="worklist"]');
// Park the mid-beat card NOW, so the check inside the window needs no scroll.
await park(p4, 'input[name="stm-q-rewardType"][value="hunt"]');
// Compile via a direct DOM click — no actionability scroll away from the parked card.
await p4.$eval(`${VIEWPORT} .stu-compile button`, (b) => b.click());
const midState = await p4.$eval(VIEWPORT, (n) => n.getAttribute("data-compile-state"));
await p4.check('input[name="stm-q-rewardType"][value="hunt"]');   // the mid-beat redraft
const expectedMid = draftBoard({ ...DEFAULT_ANSWERS, shape: "worklist", rewardType: "hunt" })
  .places.map((x) => x.label);   // ["Worklist", "Results", "Settings"] — 3, same count, new middle
await p4.waitForFunction(() => document.querySelector("[data-studio-canvas]")
  .getAttribute("data-compile-state") === "refused", null, { timeout: 20000 });
const after = await p4.evaluate(() => ({
  names: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) => w.getAttribute("data-stx-name")),
  kinds: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) =>
    [...w.children].filter((c) => !c.classList.contains("stx-grab")).map((c) => c.className.split(" ")[0]).join("+")),
  refusal: document.querySelector(".stu-compile-refusal code")?.textContent ?? null,
}));
t("#253 · a same-count redraft mid-compiling lands REFUSED with the identity sentence",
  midState === "compiling" && after.refusal === "<the fixed sentence, verbatim>",
  JSON.stringify({ midState, refusal: after.refusal }));
t("#253 · …and the drafted blocks are on the stage untouched — no stale screen swapped in",
  JSON.stringify(after.names) === JSON.stringify(expectedMid) && after.kinds.every((k) => k === "stu-place"),
  JSON.stringify(after));
// Recovery: the disclosed path. Back to blocks, then a clean compile of the DRAFTED board.
await p4.locator(VIEWPORT).getByRole("button", { name: "Back to blocks", exact: true }).click();
await p4.waitForFunction(() => document.querySelector("[data-studio-canvas]")
  .getAttribute("data-compile-state") === "blocks", null, { timeout: 20000 });
await p4.locator(VIEWPORT).getByRole("button", { name: "Compile the board", exact: true }).click();
await p4.waitForFunction(() => document.querySelector("[data-studio-canvas]")
  .getAttribute("data-compile-state") === "rendered", null, { timeout: 20000 });
const recovered = await p4.evaluate(() => ({
  kinds: [...document.querySelectorAll("[data-studio-canvas] .stx-slot")].map((w) =>
    [...w.children].filter((c) => !c.classList.contains("stx-grab")).map((c) => c.className.split(" ")[0]).join("+")),
  headings: [...document.querySelectorAll("[data-studio-canvas] .stf-screen-name")].map((h) => h.textContent),
}));
t("#253 · …and after Back to blocks a fresh compile renders the DRAFTED board's own screens",
  recovered.kinds.every((k) => k === "stf-screen")
  && JSON.stringify(recovered.headings) === JSON.stringify(expectedMid),
  JSON.stringify(recovered));
await p4.close();
```

- **PATTERN**: methodPass p2/p3 blocks (fresh page per scenario, :3268-3315); Node-computed
  expectations (:3147); compilePass's state-wait idiom (:2136-2138).
- **IMPORTS**: none new — `draftBoard` and `DEFAULT_ANSWERS` are already imported at the top of
  studio-journey.mjs (methodPass uses both). Verify before assuming.
- **GOTCHA 1**: the compile button selector — both beat buttons share `stu-compile-btn`; the
  compile button is the FIRST child of `.stu-compile` (studio-compile.mjs:262). `$eval` with
  `.stu-compile button` takes the first match, which is it. Do NOT use the `compileBtn()` locator
  from compilePass (it lives in that function's scope) — and do not click via a locator here at
  all: locator actionability may scroll away from the parked radio and eat the window.
- **GOTCHA 2**: the `midState === "compiling"` conjunct is the window sanity check — if a slow
  run lets the beat settle before the radio check lands, the case fails with a diagnosable
  detail instead of silently testing the settled-path revert.
- **GOTCHA 3**: use bare `p4.check(...)` (not the `check()` helper) for the mid-beat change —
  the helper's park + 150 ms wait spends ~230 ms of a ~1.7 s window unnecessarily; the target
  was parked one line earlier.
- **GOTCHA 4**: `after.refusal` asserts the fixed sentence **verbatim** — hardcode the same
  string in the journey (the file's idiom for fixed sentences, e.g. :3188). If wording drifts
  during implementation, update both places.
- **VALIDATE** (the RED run — must fail on unfixed code):
  `node tooling/visual-regression/serve.mjs & node tooling/studio-journey.mjs chromium`
  → expect the #253 cases to fail (timeout waiting for `"refused"`). Record the failure output
  for the report. Memory `stale-serve-wrong-tree`: if a serve already holds the port from another
  session, curl-verify an edited file or use the PORT+BASE overrides before trusting the run.
- **SATISFIES**: AC #4 (the check can fail), AC #2/#3 setup

### UPDATE `system/studio-compile.mjs` — the identity tripwire

- **IMPLEMENT**:
  1. Beside `const stash = new Map();` (:388), add the snapshot holder with a comment naming its
     contract:
     ```js
     // The wrappers compile() read the board BESIDE (#253): applySwap refuses when the stage no
     // longer holds these exact elements — adoptBoard's mid-"compiling" redraft and the driver's
     // post-settle seek (replay-driver.mjs:698-716) both remove and re-mint every wrapper, and a
     // same-count rebuild slips the count tripwire below. Element identity is the stamp: no
     // counter reaches an attribute (call 4 above), and no new seam is opened to studio.mjs.
     let stageAtCompile = null;
     ```
  2. In `compile()`, in the synchronous head beside the board read (:483-484, before
     `loadVocabulary`/the first `await`):
     ```js
     stageAtCompile = [...stage.querySelectorAll(".stx-slot")];
     ```
  3. In `applySwap`, after `const wrappers = [...]` (:402) and BEFORE the count tripwire (:409):
     ```js
     if (!stageAtCompile || wrappers.length !== stageAtCompile.length
       || wrappers.some((w, i) => w !== stageAtCompile[i])) {
       throw new Error("the canvas was redrafted while this compile was mid-beat — these screens were "
         + "compiled from a board that is no longer on the stage, so the swap cannot apply to it");
     }
     ```
     Identity first, deliberately: when a redraft changed the count too, both tripwires would
     fire, and the identity sentence is the accurate diagnosis; the count tripwire keeps guarding
     the other defect class (screens that disagree with an untouched stage).
  4. In `settle()` (:463-469), release the snapshot: `stageAtCompile = null;` — after a redraft
     the old wrappers are detached, and pinning them for the life of the page is a leak.
  5. Header update (:44-50): the "What guards the unforeseen is the TRIPWIRE" sentence now names
     both — identity (the stage changed under the beat, #253) and count (screens disagree with
     the stage) — both thrown before anything is stashed, both caught by compile()'s handler.
- **PATTERN**: the count tripwire's own shape (:404-411) — throw before any stash write, fixed
  message, caught at :515-524.
- **IMPORTS**: none.
- **GOTCHA 1**: the throw must stay BEFORE `stash.set(...)` and before `renderScreen` writes
  anything — atomicity is the tripwire's contract (either every screen renders or no wrapper is
  touched). Placing it at the top of `applySwap` preserves this.
- **GOTCHA 2**: do not snapshot inside `composed()` (:577-585) — the keep rail's read path never
  swaps and must not perturb the compile's snapshot.
- **GOTCHA 3**: `element.animate`/no-inline-style rules are untouched; the change writes no DOM.
- **VALIDATE**: `node tooling/build-checks.mjs` (all groups green — the pure layer is untouched,
  this proves the module still parses and group 15 still drives it), then the journey (next task).
- **SATISFIES**: AC #1, AC #2

### UPDATE `system/studio.mjs` — adoptBoard's comment (M1's other half)

- **IMPLEMENT**: rewrite :606-609's paragraph to the now-true statement, e.g.:
  ```
  // nothing to revert mid-"compiling"; a redraft in that window meets the beat's IDENTITY
  // tripwire (#253) — applySwap refuses a swap whose wrappers are no longer the ones its
  // screens were compiled for, same-count collisions included — loudly, via the refusal card.
  ```
- **PATTERN**: the file's comment register (cites ticket, names the mechanism).
- **GOTCHA**: comment-only — no code change in this file; `adoptBoard`'s behavior is deliberately
  untouched (Out of Scope).
- **VALIDATE**: `git diff system/studio.mjs` shows only comment lines changed.
- **SATISFIES**: AC #5

### RUN the full validation matrix

- **IMPLEMENT**: the green runs + drift checks (commands in VALIDATION COMMANDS below).
- **GOTCHA**: memory `local-agent-visual-gate-notes` — a 16-failed local VR run on macOS is
  platform noise, not regression; but no VR run is needed here at all (no at-rest change).
- **VALIDATE**: every command below.
- **SATISFIES**: AC #6, AC #7

---

## TESTING STRATEGY

### Unit Tests

None new in CI. The identity tripwire is mount-half DOM closure code — build-checks group 15
drives the pure layer only and its boundary statement already delegates "the tripwire refusal" to
studio-journey (build-checks.mjs:2844). That delegation stays accurate; no group text change.

### Integration Tests

The methodPass #253 block (three `t()` cases) IS the test, on all three engines. It covers: the
refusal fires (state + verbatim sentence), the stage is untouched (drafted labels, fat-marker
kinds, no `.stf-screen`), and the disclosed recovery path works end to end (Back to blocks →
fresh compile → the drafted board's own screens by heading).

### Edge Cases

- **Same-count collision** (the ticket's core): 3-place worklist board compiled, 3-place hunt
  variant redrafted mid-beat — labels differ at index 1, counts agree. Covered by the new case.
- **Different-count redraft mid-beat**: now meets the identity tripwire first (accurate message)
  instead of the count tripwire (misleading message). Not separately journey-tested — the same
  throw path, and no existing test asserts the count message's wording (verified by grep).
- **No-redraft compile**: the snapshot equals the live wrappers; identity passes; existing
  compilePass cases (byte-identical re-run, across loads, reduced motion) are the regression net.
- **Post-settle seek during a mid-beat compile**: wrappers re-minted → identity refusal (was: a
  silent swap when the seek landed back at the settled beat). Behavior change, strictly more
  honest; noted in the tripwire comment, not journey-tested (compound rare path; the mechanism is
  identical to the tested one).
- **Second redraft after a refusal**: `adoptBoard` sees state `"refused"` → `compile.revert()`
  runs against an empty stash (the throw preceded any `stash.set`) → settles `"blocks"` cleanly.
  Exercised implicitly by the recovery steps.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
node --check system/studio-compile.mjs && node --check system/studio.mjs && node --check tooling/studio-journey.mjs
```

### Level 2: Unit Tests (CI-shaped pure gates)

```bash
node tooling/build-checks.mjs         # all groups green; group 15 unchanged but must still run
```

### Level 3: Integration Tests

```bash
node tooling/visual-regression/serve.mjs &      # verify it serves THIS tree (stale-serve memory)
node tooling/studio-journey.mjs chromium        # red BEFORE the fix (record), green AFTER
node tooling/studio-journey.mjs all             # chromium + firefox + webkit, all green
```

### Level 4: Manual Validation

1. Open `http://127.0.0.1:<port>/factory.html`, wait for the replay to settle.
2. Change the "shape" card to Worklist → board redrafts to 3 places.
3. Press "Compile the board", and within ~1.5 s change "rewardType" to hunt.
4. See: the refusal card ("Refused" eyebrow, the identity sentence in the code block), the
   drafted blocks untouched, the readout's refusal sentence.
5. Press "Back to blocks", then "Compile the board" → 3 screens headed Worklist / Results /
   Settings, navigable.

### Level 5: Drift checks

```bash
git add system/studio-compile.mjs system/studio.mjs tooling/studio-journey.mjs
node agent-layer/gen-loc-summary.mjs   # reads TRACKED content — run after staging (memory)
git status --short system/loc-summary.json   # stage it if the runtime group's rounded count moved
```

If (and only if) `loc-summary.json`'s **runtime** group number changed: approach.html renders it,
so the two approach baselines need `cd tooling/visual-regression && npm run update:docker` in the
same PR (memory `loc-summary-baseline-cascade`). A ~15-line edit against a nearest-100 rounding
almost never flips it — check, don't assume either way.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — A method-card redraft during `"compiling"` with an **equal** place count ends in
      state `"refused"` with the refusal card showing the fixed identity sentence; no stale
      screen reaches the stage (all slots still hold `stu-place` blocks with the drafted labels).
- [ ] AC #2 — The refusal travels the existing path: thrown before anything is stashed, caught by
      `compile()`'s handler, rendered by `renderRefusal`, announced via `settle("refused", …)` —
      no console error, no page error (journey `watch()` stays clean).
- [ ] AC #3 — Recovery works: "Back to blocks" settles `"blocks"`, and a fresh compile renders
      the drafted board's own screens (headings match `draftBoard`'s labels, computed in Node).
- [ ] AC #4 — The new journey cases were seen RED against unfixed code before the fix (recorded
      in the execution report), then green on chromium, firefox and webkit.
- [ ] AC #5 — `adoptBoard`'s mid-"compiling" comment and studio-compile.mjs's header describe the
      identity tripwire truthfully (M1 closed at the source, not just in behavior).
- [ ] AC #6 — Zero regressions: `build-checks` all green; the full `studio-journey all` green,
      including compilePass's byte-identical and across-loads cases (the snapshot must not
      perturb an undisturbed compile).
- [ ] AC #7 — `loc-summary` drift handled per Level 5; no VR baseline churn (no at-rest change);
      no `param-manifest.json` change (no new control).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (journey red → fix → comments → green matrix)
- [ ] Each task validation passed immediately
- [ ] `node tooling/build-checks.mjs` green
- [ ] `node tooling/studio-journey.mjs all` green on all three engines
- [ ] Manual walk (Level 4) confirms the refusal and the recovery by hand
- [ ] Acceptance criteria all met
- [ ] Branch `feature/studio-compile-identity-tripwire-253` off current main; PR body carries
      `Closes #253`; plan + report + review committed in the same PR (repo git rule)

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption:** element identity is an acceptable realization of the ticket's
  "identity/generation stamp" — the ticket names both; identity is chosen for the reasons in the
  Solution Statement. If the owner specifically wants a visible generation number, that would
  need a determinism-rule exception argued; flag before implementing differently.
- **Assumption:** the behavior change on the seek-mid-compile compound path (silent swap →
  refusal) is acceptable and desirable. It is strictly more honest and the mechanism is the same;
  it is documented in the tripwire comment.
- **Assumption:** no existing gate asserts the count tripwire's message wording or that the count
  tripwire fires first (verified by grep across `tooling/` — only states are asserted). If an
  engine run surfaces one, reorder is NOT the fix; update the stale assertion.
- **Timing risk (low):** the journey's mid-beat check must land within ~1.7 s of the compile
  click. The case pre-parks the radio and clicks compile via `$eval` (no scroll), keeping the
  gap under ~300 ms; the `midState === "compiling"` conjunct converts a missed window into a
  diagnosable failure rather than a silent wrong-path test.

## NOTES (open canvas)

**Why not queue/abort the redraft instead?** Three alternatives were weighed:

1. *Abort the in-flight beat from `adoptBoard`* (`compile.abort()` → back to `"blocks"` before
   the clear): nicer end-state (no refusal card to dismiss), but it adds a public seam, a new
   state transition (compiling → blocks without a settle), new announcement rules, and it
   silently discards a beat the visitor started — the refusal is the honest account. The ticket
   explicitly asks for the refusal.
2. *Disable the cards during `"compiling"`*: closes the window by subtraction, but adds gating
   churn (the band's enabled-state matrix is already three-way) and punishes the visitor for a
   sub-2 s implementation detail. Rejected.
3. *Generation counter with an `invalidate()` seam*: works, but adds a seam and misses non-adopt
   churn (seek). Rejected for identity.

**Why the check lives in `applySwap`, not per-step:** the count tripwire set the precedent — the
refusal fires where the swap would happen. A per-step early exit would shorten the stale-
announcements window from ≤1.7 s to ≤420 ms at the cost of a second check site and new journey
branches. If that window ever matters, it is a follow-up ticket, and the identity snapshot built
here is exactly what it would reuse.

**Ordering inside `adoptBoard` (no change needed):** `adoptBoard` runs entirely synchronously
between two of the beat's `wait()` timers, so the beat can never observe a half-cleared stage;
the snapshot comparison is therefore all-or-nothing in practice, but the element-wise `some()`
stays — partial churn from an unforeseen author should refuse too.

**Expected journey count delta:** +3 assertions per engine (the #214 report's baseline table
records 318/314/314 after #214; the report for this ticket should record the new totals).

## AMENDMENTS

- (empty at creation)
