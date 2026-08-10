# Feature: studio compiled screens fit their slots (#251)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **Anchor provenance:** every `file:line` below was read on 2026-08-10 in a worktree carrying
> **#214's uncommitted work** (branch `feature/studio-214-method-cards-hook-loop`, tip == main
> 793a270, dirty: `studio.mjs`, `studio.css`, `studio-compile.mjs`, `build-checks.mjs`,
> `factory.html`, …). That makes the anchors closer to the post-#214 tree than to today's main.
> **Implement this ticket AFTER #214 lands**, from a clean checkout, and re-verify each anchor
> before editing (see SEQUENCING in OPEN QUESTIONS).

## Feature Description

After **Compile the board** on /factory, each flow screen renders into the same 220×140 grid slot its
fat-marker block occupied. Measured on the real page (this plan's session — full table in NOTES):
every `.stf-screen` holds 258–426px of content inside a 140px viewport behind an `overflow-y: auto`
scroller with no visible affordance (macOS overlay scrollbars are invisible at rest) — tiles and nav
buttons are guillotined mid-element and the epic's payoff moment reads as a rendering bug.
Separately, `ds-list-row`'s `.ds-row-reading` refuses to shrink (`flex: 0 0 auto`), so Job Detail's
row value ("Reassignment Confirmation") pushes the screen to scrollWidth 232 in a 220px box — an
outright defect in a shipped library primitive that had never been composed into a narrow container
(the PR #54 grid-blowout family).

**The decision the ticket asks for, made here (flag before implementing if you disagree — see OPEN
QUESTIONS):** the compiled state gets **taller slots**, delivered as a CSS-variable override under the
attribute the compile beat already writes — `.stx-viewport[data-compile-state="rendered"]` sets
`--stx-slot-h: 480px`, which holds the committed replay board's tallest screen (measured worst:
**429px**, webkit, with the list-row fix applied) with ≥51px headroom on all three engines. 220×480
is phone aspect ratio, so compiled screens read as product screens — a step toward #219's
device-frame presentation without pulling any of its machinery forward. The internal scroller stays
as the bounded fallback for oversize `?b=`-restored boards and gets a visible, token-styled
scrollbar. Independent of that decision, `ds-list-row` gets narrow-container behavior in
`components.css` (shrink + wrap, never value truncation) — measured to eliminate the horizontal
overflow on every engine.

Rejected alternatives (ticket options 2 and 3) — see NOTES for the full argument:
- **"compile fits/zooms"**: zoom scales the slot AND its content together, so the 3:1
  content-to-viewport ratio inside a slot is invariant under zoom — it cannot fix overflow. And
  fitting the whole 12×8 canvas after any slot growth floors at the 0.5 level, where body text
  renders ~7px. Zoom is not the axis this bug lives on.
- **"#219's device-frame treatment"**: #219 is protos-as-iframes on the canvas (wave 7, depends on
  #205/#206) — a different mechanism for a different content type. Pulling bezel chrome into a bug
  fix is scope creep; the taller phone-proportioned slot gets the presentation most of the way there
  and leaves the bezel design to #219/#223's re-judge.

## User Story

As a hiring manager watching /factory's compile beat
I want the compiled screens to show their whole content, sanely presented
So that the epic's payoff moment reads as a working product flow instead of a rendering bug

## Problem Statement

Three defects, one root presentation decision:
1. **Vertical:** 2–3× content overflow behind an affordance-less internal scroller in every compiled
   screen — nav buttons below the fold, elements guillotined at the slot edge.
2. **Horizontal (defect):** `ds-list-row`'s reading cannot shrink, so a long value forces a 220px
   screen to 232px scrollWidth — +12px of content past the screen's right edge.
3. **Minor:** a row label ("Reassign job to different tech") clips bare, without an ellipsis.

Every gate stayed green because the pixel gate never interacts (only the pre-compile canvas is a
baseline), studio-journey asserts structure and reachability-by-scroll (both true), and build-checks
groups 12/19 are DOM-free.

## Solution Statement

1. **Compiled slots grow tall enough to hold the committed flow whole.** One CSS rule in
   `system/studio.css`: `.stx-viewport[data-compile-state="rendered"] { --stx-slot-h: 480px; }`.
   The beat already writes that attribute on settle and removes its effect on revert
   (`studio-compile.mjs` setState/revert), the sizer and the grid template both consume the
   variable, the verbs re-measure geometry per gesture (`readGeom()` at pick-up), and `fit()`
   measures at call time. Revert shrinks back automatically; the revert byte-identical assertion
   (journey :2352) is untouched because the stage HTML never changes.
2. **`ds-list-row` learns narrow containers** in `system/components.css`: `.ds-row-reading` becomes
   shrinkable (`flex: 0 1 auto; min-width: 0`) and `.ds-row-value` wraps under constraint
   (`min-width: 0; overflow-wrap: anywhere`). Wrap, not ellipsis: truncating the VALUE loses the one
   fact the row exists to state, and both properties are provably inert in wide containers (shrink
   and wrap fire only under constraint), which is what keeps every existing consumer pixel-identical.
   Measured: scrollWidth 232 → 220 on Job Detail; its content height 285 → 310 (the value wraps to a
   second line — inside 480's headroom).
3. **The scroller that remains gets an affordance**: token-styled thin scrollbar on `.stf-screen`
   (`scrollbar-width`/`scrollbar-color` + `::-webkit-scrollbar` fallback). It paints only when a
   board actually overflows — i.e. never for the committed replay board after fix 1, only for
   oversize `?b=`-restored boards.
4. **A live carry cannot span the swap.** The one hole the growth would open — a sticky
   (click-carry) or keyboard carry surviving the Compile click with gesture geometry cached from the
   140px grid — is closed at the root: the orchestrator cancels any live gesture when the beat's
   content actually swaps (`onState` fires "rendered") or reverts ("blocks"). This also fixes the
   pre-existing incoherence of carrying a fat-marker block whose content morphs into a screen
   mid-carry. ~4 lines: `studio-verbs.mjs` exposes its existing `cancel()` closure on the handle;
   `studio.mjs`'s existing `onState` callback calls it for exactly those two states.
5. **The gate learns to see this class of bug**: studio-journey's flowPass asserts, per compiled
   screen of the committed board, `scrollHeight <= clientHeight` and `scrollWidth <= clientWidth` —
   written FIRST and run red against the unfixed tree (verified reproducible in this session:
   426/140 vertical, 232/220 horizontal on chromium) — plus a carry-across-compile case for fix 4.

## Out of Scope / Non-Goals

- Not included: device-frame/bezel chrome around compiled screens (defer to #219, and the
  product-grade re-judge at #223).
- Not included: the occupied-cell drop refusal's invisible snap-back (same blind-spot family — the
  ticket logs it for #217).
- Not changing: pre-compile slot geometry (220×140), `MAX_COLS`/`MAX_ROWS`, the zoom table, or any
  build-checks group 12 pin — the compiled override is a new CSS-only seam, not a cap change.
- Not changing: `.stx-slot { overflow: hidden }` (the blocks state needs it), arrangement grammar,
  the bus contract, the replay driver, `studio-flow.mjs`, `studio-compile.mjs`, `action-bus.mjs`.
  The whole JS surface is: one exposed existing closure in `studio-verbs.mjs` + a two-state guard in
  `studio.mjs`'s existing `onState` callback. No new bus verb, no new consumer, no new emitter.
- Not changing: `agentic-renderer.mjs` templates or any spec — no vocabulary/handoff regen.
- Not adding: `ui.navigate`, mode UI, or any new manipulable control (no `param-manifest.json` entry).

## Feature Metadata

**Feature Type**: Bug Fix (with one deliberate presentation decision)
**Estimated Complexity**: Medium — small diffs, but cross-engine verification + gate discipline
**Primary Systems Affected**: `system/studio.css`, `system/components.css`,
`system/studio-verbs.mjs` (one exposed closure), `system/studio.mjs` (onState guard),
`tooling/studio-journey.mjs`
**Dependencies**: none new (Playwright already vendored in `tooling/visual-regression/node_modules`)

## Related Work

**Implements**: https://github.com/linardsb/ux-factory/issues/251 · **Epic**: #202 —
`docs/epics/prototype-studio.architecture.md` (inherited: one-board model, zero-inline-styles/group 7,
no view-transition naming, determinism of the settled canvas, bus discipline — none touched here)

**Back-references** (plans this builds on or amends):

- `.claude/plans/studio-flows-places-screens-212.md` — Why: #212 made the "A SCREEN SCROLLS INSIDE
  ITS WRAPPER" call this ticket amends (scroll becomes the bounded fallback, not the primary
  presentation).
- `.claude/plans/studio-canvas-stage-204.md` — Why: owns the slot-variable scheme and the
  attributes-only discipline the fix rides on.
- `.claude/plans/studio-compile-beat-207.md` — Why: owns `data-compile-state`, the attribute the
  override keys on.
- `.claude/plans/studio-method-cards-hook-loop-214.md` — Why: #214 is mid-flight in the same
  worktree and touches `studio.mjs`/`studio.css`/`studio-compile.mjs`; this ticket lands after it.

**Forward-references**:

- #219 (protos as device frames) — the bezel presentation this fix deliberately does not pull forward.
- #217 (full canvas affordances) — carries the related refusal-visibility blind spot; if it reworks
  gestures (multi-select), the cancel-on-swap wiring is the seam it inherits.
- #223 (epic close) — the owner re-judges the product-grade bar there (memory:
  `factory-mid-epic-owner-verdict`).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/studio.css` (lines 19–38 viewport vars + zoom table; 89–117 slot rules; 434–475 the flow
  screens block — **the block to change**; 358–432 compile chrome; 322–356 `.stu-place`) — Why: the
  variable scope, the state-attribute idiom ("the module writes an attribute and this sheet decides
  what it means", :429–432), and the #212 header comment that must be rewritten honestly.
- `system/studio-compile.mjs` (lines 270–311 setState → `viewport[data-compile-state]`; 401–440
  applySwap; 463–469 settle — **note `onState` fires only from settle**, so "compiling" and the
  mount's initial "blocks" never reach it; 526 settle("rendered"); 536–554 revert →
  settle("blocks")) — Why: proves the attribute flips in the same task as the swap (no intermediate
  guillotined frame) and exactly when the cancel guard fires. **Do not edit.**
- `system/studio.mjs` (lines 85–99 arrangeBoard — places arrange along **row 1**; the mount region
  around :395–470: `const verbs = mountCanvasVerbs(canvas, { bus })` and the `mountCompile(...,
  onState: () => syncInspect())` call — **the onState wiring point**; on main it is :424, on the
  #214 tree it also passes `getAnswers`) — Why: the orchestrator already holds both handles; wiring
  them is its established job (it already blocks compile during replay via `setEnabled`).
- `system/studio-verbs.mjs` (lines 460–500 pickUp/clearGesture; **531–537 the `cancel()` closure to
  expose**; 539–567 readGeom + pointToSlot — geometry is read once per gesture at pick-up, which is
  both why grown slots need no verbs change for fresh gestures AND why a carry spanning the growth
  must die; 594–601 the sticky drop branch; 686–725 the keyboard carry; **763–777 `handleObj`, where
  `cancel` joins `snapshot`/`history`**) — Why: the fix-4 surface.
- `system/components.css` (lines 1527–1621, the `ds-list-row` block) — Why: `.ds-row-reading`'s
  `flex: 0 0 auto` (:1572) is the horizontal defect; `.ds-row-text`/`.ds-row-name` already carry the
  min-width-0 + ellipsis idiom to mirror (:1548–1560).
- `system/agentic-renderer.mjs` (lines 334–342) — Why: the list-row template — which prop lands in
  which class (label→`.ds-row-name`, value→`.ds-row-value`).
- `system/studio-canvas.mjs` (lines 38–73 caps/fitLevel; 151–187 setZoom/fit/reset) — Why: fit
  measures at call time; nothing caches slot size.
- `system/studio-flow.mjs` (lines 73–100 renderScreen) — Why: what a screen's DOM is (heading + note +
  composition + `.stf-nav`). **Do not edit.**
- `tooling/studio-journey.mjs` (lines 2280–2398 flowPass — **where the new assertions go**, after
  `compileNow(p)` at :2321; 2091–2270 compilePass; the #229 sticky click-carry case — the idiom for
  Task 5's case; 289–311 the fit check that already injects a `--stx-slot-w/h` override stylesheet —
  precedent that the variables are a legitimate seam) — Why: the fix's own gate.
- `tooling/build-checks.mjs` (lines 2063–2110, group 12) — Why: verify the pins — `--stx-cols`,
  `--stx-rows`, the `[data-zoom]` table, the per-index slot rules. Slot **dimensions** are not
  pinned; the override selector `[data-compile-state="rendered"]` matches none of group 12's
  regexes. No build-checks change needed.
- `tooling/vt-verify.mjs` (lines 388–457, the factory compile sample) — Why: it clicks Compile and
  asserts the crossfade opens ZERO view transitions; a CSS variable flip is layout, not a
  transition, but run it to prove that.
- `tooling/visual-regression/visual.spec.mjs` (line 77–84, the factory entry) — Why: confirms the
  pixel gate waits for the settled replay and never interacts — compiled state is in no baseline.
- `replay/build-fieldwork-dispatch.board.json` — Why: the committed board (4 places / 7 affordances /
  7 connections) the journey's assertions run against; the flow is Today Overview → At-Risk Queue →
  Job Detail → Reassignment Confirmation.

### New Files to Create

- none. (Plan/report/review artifacts per repo convention: this file,
  `.claude/reports/…`, `.claude/code-reviews/pr-<N>-review.md` — same PR.)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- GitHub issue #251 — the decision framing and the "why the gates never saw it" analysis (its
  measured numbers are independently reproduced in NOTES below).
- `docs/epics/prototype-studio.architecture.md` §Key decisions — the studio's standing constraints
  (zero inline styles, attributes-only arrangement, no view-transition names).
- Epic #202 PRD §2 (the compile beat is the hero mechanic) and §3 (product out = a connected flow) —
  why this presentation matters enough to fix as a decision, not a patch.
- MDN `scrollbar-width`/`scrollbar-color` + `::-webkit-scrollbar` — Safari needs the webkit
  fallback (`scrollbar-color` is unsupported there); Chromium ≥121 prefers the standard properties
  when both are present. No section anchors needed — the four rules in Task 4 are the whole usage.

### Patterns to Follow

**The state-attribute → sheet idiom** (studio.css:429–432): the module writes
`data-compile-state` and the sheet decides what it means. The override is exactly this pattern:

```css
.stx-viewport[data-compile-state="compiling"] .stu-compile-step { color: var(--color-fg); }
```

**The narrow-container idiom already inside the same block** (components.css:1548–1552):

```css
.ds-row-text {
  /* … */
  flex: 1 1 14ch;
  min-width: 0;
}
```

**The seam idiom for Task 5**: `handleObj` already exposes internals for exactly this kind of
composition (`history`, `snapshot`, the `gesture` getter — studio-verbs.mjs:763–777), and the
orchestrator already coordinates the two modules through seams (`setEnabled` blocking compile during
the replay, PR #240 finding 1). `cancel` on the handle is the same shape.

**Comment style**: every non-obvious rule in studio.css carries a WHY paragraph citing its ticket
(#204/#207/#212 headers). The new rules cite #251 and say what they amend.

**The check-can-fail discipline** (memory `check-that-cannot-fail`, repeated in the epic): write the
journey assertion first, watch it fail on the unfixed tree, then fix.

**Token discipline**: `--color-border-strong` exists in the contract (tokens.contract.css:27) and is
already consumed by components.css (:1459). No literal colours in either sheet.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 1 (the failing gate) deliberately precedes the fixes.

### Phase 1: The gate that can fail

Add the presentation assertions to studio-journey's flowPass and run them RED against the current
tree — this is the regression test #251 says was structurally missing. (Reproduced in this plan's
session: 426/140 vertical, 232/220 horizontal — the red is guaranteed, not hoped for.)

### Phase 2: The fixes

**Depends on:** Phase 1 (the red run is the before-proof)

`components.css` list-row narrow-container behavior; `studio.css` compiled-state slot growth +
scrollbar affordance + honest comment rewrite; the carry-across-swap cancel (verbs seam +
orchestrator guard) with its own red-first journey case.

### Phase 3: Cross-engine verification + cascades

Journey on all three engines (confirm the measured 480 verdict), the regen cascade (loc-summary;
system-graph `--check`), and the zero-churn VR proof.

### Phase 4: Full validation

build-checks, studio-journey all, vt-verify factory samples, manual overflow-board check.

---

## STEP-BY-STEP TASKS

### Task 1 — UPDATE `tooling/studio-journey.mjs`: the #251 fit assertions, written first

- **IMPLEMENT**: in `flowPass`, immediately after the first `await compileNow(p);` (:2321) and the
  existing screen/nav-count assertions, measure every compiled screen and assert both axes:

  ```js
  // #251 · presentation, not just reachability: the committed flow FITS its compiled slots. The
  // pixel gate never interacts and groups 12/19 are DOM-free, so this is the only gate that can
  // see a screen guillotined behind its own scroller. Both bounds printed on every run.
  const boxes = await p.evaluate(() =>
    [...document.querySelectorAll("[data-studio-canvas] .stx-slot > .stf-screen")].map((s) => ({
      label: s.querySelector(".stf-screen-name")?.textContent ?? "?",
      sh: s.scrollHeight, ch: s.clientHeight, sw: s.scrollWidth, cw: s.clientWidth,
    })));
  t("#251 · every compiled screen of the committed board shows its whole content — no internal vertical scroll",
    boxes.length > 0 && boxes.every((b) => b.sh <= b.ch),
    boxes.map((b) => `${b.label}: ${b.sh}/${b.ch}v`).join(" · "));
  t("#251 · no compiled screen scrolls horizontally — the list-row value stays inside the screen",
    boxes.length > 0 && boxes.every((b) => b.sw <= b.cw),
    boxes.map((b) => `${b.label}: ${b.sw}/${b.cw}h`).join(" · "));
  ```

- **PATTERN**: `tooling/studio-journey.mjs:2322–2327` (evaluate → count → `t(...)` with the numbers
  in the detail string); the `boxes.length > 0` guard follows the "no vacuous green" rule.
- **GOTCHA**: measure `.stx-slot > .stf-screen` (the scroller), not the wrapper — the wrapper's
  `overflow: hidden` would report no overflow. `scrollHeight`/`clientHeight` are integers per spec;
  no epsilon needed.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs chromium` → **both new rows MUST FAIL** on the unfixed tree
  (expected, from this session's control run: Today Overview 426/140, At-Risk Queue 258/140,
  Job Detail 285/140 + 232/220 horizontal, Reassignment Confirmation 270/140). Everything else
  stays green.
- **SATISFIES**: the ticket's "why the gates never saw it" — the missing regression coverage.

### Task 2 — UPDATE `system/components.css`: `ds-list-row` learns narrow containers

- **IMPLEMENT**: in the `ds-list-row` block (:1527–1621), amend two rules:

  ```css
  .ds-row-reading {
    display: inline-flex;
    align-items: baseline;
    gap: var(--spacing-xs);
    /* 0 1 auto, not 0 0 auto (#251): in a narrow container — the studio's 220px compiled screens
       were the first — a reading that cannot shrink pushes the row past its box (+12px measured,
       the PR #54 blowout family). Shrink fires only under constraint, so wide consumers
       (Fieldwork's slots, the study, /build's patterns) lay out identically to before. */
    flex: 0 1 auto;
    min-width: 0;
  }
  .ds-row-value {
    font-size: var(--type-body);
    font-weight: 600;
    color: var(--color-fg);
    /* Wrap under constraint, never truncate (#251): the value is the fact the row exists to state,
       so an ellipsis here loses data where a second line only costs height — which the compiled
       slot now has. Inert in wide containers, same argument as the shrink above. */
    min-width: 0;
    overflow-wrap: anywhere;
  }
  ```

- **PATTERN**: `.ds-row-text` (:1548–1552) — the same block already argues shrink-with-min-width-0
  in a comment; match its voice.
- **GOTCHA**: do NOT add `white-space: nowrap` / `text-overflow: ellipsis` to the value (loses the
  fact, and converts wide-container wrapping behavior — a real at-rest risk). Do not touch
  `.ds-row-status` (`nowrap` pill is by design) or `.ds-row-name`/`.ds-row-meta` (already
  ellipsize). No token additions → no `gen-token-css`/`gen-handoff` run. Structural props reference
  no `var()` → `system-graph.json` unchanged (Task 7 proves it).
- **VALIDATE**: `node tooling/studio-journey.mjs chromium` → the horizontal row (`#251 · no compiled
  screen scrolls horizontally`) goes green (measured in this session: Job Detail 232 → 220 with
  exactly these two rules injected); the vertical row still red.
- **SATISFIES**: ticket defect 2.

### Task 3 — VERIFY the minor label clip (ticket defect 3) on the running page

- **IMPLEMENT**: with the server up, open `http://127.0.0.1:4757/factory.html`, wait for the
  replay to settle, Compile, and inspect the "Reassign job to different tech" row (At-Risk Queue /
  Job Detail screens). Expected: the clip was a symptom of defect 2 (the row forced past 220px gets
  cut by the ancestor's clip before `.ds-row-name`'s own ellipsis can act) and is gone after Task 2.
  If any element still bare-clips, give THAT element the block's existing ellipsis idiom
  (`min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — for a label,
  where truncation is acceptable) — candidates in likely order: `.ds-row-name`'s flex chain,
  `.stf-go-label`.
- **VALIDATE**: eyeball on the served page + the journey's horizontal row stays green.
- **SATISFIES**: ticket defect 3.

### Task 4 — UPDATE `system/studio.css`: compiled slots grow; the fallback scroller gets an affordance

- **IMPLEMENT**: in the "the flow's screens (#212)" block (:434–475):

  1. **Rewrite the block header's scroll paragraph honestly** — "A SCREEN SCROLLS INSIDE ITS
     WRAPPER" becomes the amended story: in the compiled state the slot grows so the committed
     flow fits WHOLE (#251 — a 3:1 content-to-viewport ratio behind an invisible overlay scrollbar
     read as a rendering bug at the epic's payoff moment); `overflow-y: auto` stays as the bounded
     fallback for oversize restored boards, now with a visible scrollbar. Keep the existing
     sentences about Tab's scroll-into-view and the components-not-styled-here rule.

  2. **The override**, keyed on the attribute the beat already writes:

     ```css
     /* THE COMPILED STATE GROWS THE SLOT (#251). data-compile-state is studio-compile.mjs's
        attribute (the data-zoom discipline: the module writes an attribute, this sheet decides
        what it means), and "rendered" is the ONE state whose slots hold screens rather than
        fat-marker blocks — empty/out-of-library/refused all keep the blocks, and keep 140px.
        480px is MEASURED, not chosen: with the list-row fix in, the committed replay board's
        tallest screen is 426/428/429px on chromium/firefox/webkit (2026-08-10), so 480 clears the
        worst engine by 51px — and 220×480 is phone aspect, so the screens read as product
        screens, the presentation #219's device frames later formalise. The sizer and the grid
        template consume the same variable, so the scroll range, the hit-test (measured per
        gesture, studio-verbs.mjs) and fit() (measured per call) all follow. Revert restores
        "blocks" and the geometry snaps back — no JS knows about this rule, which is the point.
        The one carry that could span this growth is cancelled at the swap (studio.mjs's onState
        guard, #251), so no gesture's cached geometry ever meets the grown tracks. */
     .stx-viewport[data-compile-state="rendered"] { --stx-slot-h: 480px; }
     ```

  3. **The affordance**, on the screen scroller:

     ```css
     /* The scroller that remains is the FALLBACK, and it must look like one (#251): a ?b=-restored
        board can outgrow even the compiled slot, and macOS overlay scrollbars are invisible at
        rest — which is how 2/3 of every screen sat behind a scroller nothing announced. Standard
        properties for Firefox/Chromium; the ::-webkit-* fallback is Safari's, whose custom
        scrollbars paint whenever content overflows. Tokens only. */
     .stf-screen { scrollbar-width: thin; scrollbar-color: var(--color-border-strong) transparent; }
     .stf-screen::-webkit-scrollbar { width: 8px; }
     .stf-screen::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: var(--radius-sm); }
     .stf-screen::-webkit-scrollbar-track { background: transparent; }
     ```

- **PATTERN**: the `[data-compile-state="compiling"]` rule at :432 (state attribute → sheet
  meaning); `.stu-shell .stx-scroll`'s pinned-height comment (:253–260) for the register of a
  measured geometry decision.
- **GOTCHA**: the rule must sit on `.stx-viewport[data-compile-state="rendered"]` — the variable's
  scope is the viewport (:20), and the attribute lives there (studio-compile.mjs setState). Do NOT
  touch `--stx-slot-w` (the horizontal defect is Task 2's, and widening moves every column's x —
  churn with no payoff). Do NOT name anything for a view transition. No `transition` on the
  variable (the sheet's own no-transition-on-scale rule, :180).
- **VALIDATE**: `node tooling/studio-journey.mjs chromium` → both #251 rows green (this session
  measured all four screens fitting at 480 on all three engines), and every pre-existing
  compile/flow/replay assertion green — notably "revert after navigating returns the fat-marker
  stage byte-identically" (the override is attribute-keyed CSS; the stage HTML never changes).
- **SATISFIES**: ticket defect 1 + the ticket's "decision, not a patch".

### Task 5 — UPDATE `system/studio-verbs.mjs` + `system/studio.mjs`: a live carry dies at the swap

- **IMPLEMENT**, case first (check-can-fail):

  1. **The journey case** (flowPass, fresh page — mirror the #229 sticky idiom): open /factory,
     wait settled, click the first wrapper's `.stx-grab` without moving (pointer down+up on the
     handle → sticky carry; wait for the pick-up announcement). Click "Compile the board", wait
     `data-compile-state === "rendered"`. Assert through the module seam
     (`import("/system/studio-verbs.mjs")` in page context → `getVerbs()`): the gesture is null,
     no `.is-picked` remains on the stage, and the wrapper sits at its origin `data-col`/`data-row`.

     ```js
     // #251 · a carry cannot span the swap: the compiled state grows the tracks, and a gesture's
     // geometry is cached at pick-up — so a sticky or keyboard carry surviving the Compile click
     // would place drops against 140px rows on a 480px grid (and would be carrying a block whose
     // content just became a screen). The orchestrator cancels it when onState says the content
     // actually swapped. This case is the discriminator: without the guard the gesture survives.
     ```

     Run `node tooling/studio-journey.mjs chromium` → the case is **RED** (today the gesture
     survives the compile).

  2. **`system/studio-verbs.mjs`**: expose the existing closure on the handle — in `handleObj`
     (:763–777), add `cancel,` beside `snapshot` with a one-line comment: the orchestrator's
     carry-across-swap guard (#251); calling it with no live gesture is already a silent no-op
     (:531 `if (!gesture) return;`).

  3. **`system/studio.mjs`**: the `onState` callback passed to `mountCompile` (on main:
     `onState: () => syncInspect()`) becomes:

     ```js
     onState: (next) => {
       // #251: the swap ("rendered") and its revert ("blocks") replace every wrapper's content —
       // a carry started over the old content is void, and its cached pick-up geometry predates
       // the compiled state's grown tracks. The other terminal states (empty, out-of-library,
       // refused, unavailable) leave the blocks untouched and cancel nothing. cancel() no-ops
       // without a live gesture, which is every ordinary compile.
       if (next === "rendered" || next === "blocks") verbs.cancel();
       syncInspect();
     },
     ```

     Note `onState` fires only from `settle()` — never for "compiling" and never at mount — so the
     guard cannot fire mid-gesture-and-mid-beat, only at the settled swap.

- **PATTERN**: `handleObj`'s existing seam exposure (studio-verbs.mjs:763–777); the orchestrator
  already coordinating the modules (`setEnabled` during replay, PR #240 finding 1; `getBoard`/
  `getAnswers` seams).
- **GOTCHA**: the cancel announcement lands in the live region in the same task as settle's
  sentence, and a polite region speaks only the final write — so when a carry WAS live, the reader
  hears "Cancelled, X back in column …" instead of the compile sentence. That is the right
  priority for that reader (their carry vanishing is the salient event) and it is a recorded
  trade, not an accident. Do NOT try to fix the ordering by making cancel bypass `canvas.say`.
  Also: this closes the carry hole for BOTH input families (sticky pointer and keyboard carry) —
  do not add a per-move `readGeom()` anywhere; a layout read in the move handler is spike 2's
  measured pessimistic case.
- **VALIDATE**: `node tooling/studio-journey.mjs chromium` → the Task 5 case green, the #229
  sticky case and the three-source parity proofs still green (the guard fires only at settle, and
  no existing case carries across a compile).
- **SATISFIES**: Solution point 4 — the one new edge the growth would otherwise open, closed at
  the root instead of recorded as accepted.

### Task 6 — RUN the journey on all three engines

- **IMPLEMENT**: `node tooling/studio-journey.mjs all`. Expected from this session's measurements:
  worst screen 426 (chromium) / 428 (firefox) / 429 (webkit) — all inside 480 with ≥51px headroom,
  no horizontal overflow anywhere. If an engine disagrees with its measured number by more than the
  headroom (it should not — same engines, same committed board), stop and diff what changed on the
  tree since 2026-08-10 rather than bumping the value blind.
- **VALIDATE**: `node tooling/studio-journey.mjs all` → green ×3, INP rows included (the compile
  interaction now reflows a larger grid; the existing ≤200ms budget rows are the gate).
- **SATISFIES**: the epic's cross-engine discipline (memory `cross-engine-motion-verify`).

### Task 7 — RUN the regen cascade and prove the graph/loc story

- **IMPLEMENT**:
  1. `node agent-layer/gen-system-graph.mjs --check` — expect **no drift**: the components.css
     additions reference no tokens, so consumer bindings are unchanged. If it reports drift, stop
     and look — something else moved.
  2. `node agent-layer/gen-loc-summary.mjs` then `git diff system/loc-summary.json` — the edits add
     ~45 lines across two sheets, ~5 in two modules and ~40 in tooling; lines round to the nearest
     100, so a rounded group MAY flip. If the **runtime group** approach.html renders flips,
     regenerate both approach baselines in the same PR (memory `loc-summary-baseline-cascade`); if
     only the grand total flips, committing the regenerated JSON is enough (memory
     `loc-summary-counts-tracked-only`).
- **VALIDATE**: `node agent-layer/gen-system-graph.mjs --check` exits clean;
  `git status` shows loc-summary.json regenerated (or provably unchanged).
- **SATISFIES**: the epic's standing per-ticket cascades.

### Task 8 — PROVE zero VR churn (the at-rest claim, not assumed)

- **IMPLEMENT**: from a clean detached worktree under `/Users` (memory
  `vr-gate-reads-working-tree`) with the branch's changes: `cd tooling/visual-regression &&
  npm run update:docker`, then `git status` on the baselines. Expected: **zero PNGs change** —
  compiled state is post-interaction (factory's VR entry never interacts, visual.spec.mjs:77–84),
  and the list-row change is inert in wide containers. Committed list-rows at rest exist only in
  northwind compositions (instance/study — off the VR page set); /build's at-rest default board
  names dashboard (metric tiles, no list-rows).
- **GOTCHA**: if a baseline DOES churn, do not shrug it through — it means an at-rest surface
  renders list-rows narrower than reasoned. Identify the page, eyeball the diff, and either
  regenerate that baseline in this PR (if the change is the fix working) or revisit Task 2.
  Remember `update:docker` skips sub-perceptual diffs (memory `vr-update-skips-subperceptual`) — a
  no-op run is the expected proof here, not a trap.
- **VALIDATE**: `git status tooling/visual-regression/baselines` → clean.
- **SATISFIES**: the ticket's "VR impact: none" claim, verified rather than trusted.

### Task 9 — RUN the full validation battery + the overflow-board manual check

- **IMPLEMENT**: the commands in VALIDATION COMMANDS below, plus: build a deliberately fat board on
  /build (many affordances on one place), copy the share link, open `/factory.html?b=…` — the
  restored board compiles with screens that overflow even 480px; confirm the styled scrollbar is
  VISIBLE on the overflowing screen (chromium + webkit at minimum), and that wheel/Tab still reach
  everything (the ticket verified reachability was never broken — keep it that way).
- **VALIDATE**: all commands exit 0 / print their ✓ lines.
- **SATISFIES**: "Done = run the surface you touched".

---

## TESTING STRATEGY

No unit-test suite exists and none is invented (repo convention). The layers:

### Gate additions (this PR)

- studio-journey flowPass: the two #251 fit rows (vertical + horizontal, every compiled screen of
  the committed board) and the carry-across-compile cancel case — each written first and observed
  red on the unfixed tree; those red runs are the mutation proof for these checks.

### Existing gates re-run (regression net)

- `node tooling/build-checks.mjs` — 19 groups, pure; group 12 proves the caps/zoom mirror is
  untouched, group 19 the flow rules, group 7 that no module gained an inline-style write, group 13
  the verbs' pure layer (untouched — `cancel` is mount-layer).
- `node tooling/studio-journey.mjs all` — the full canvas/compile/flow/replay battery ×3 engines,
  including the revert byte-identical assertion, the #229 sticky case, the INP rows, and the
  three-source parity proofs.
- `node tooling/vt-verify.mjs` — the factory samples: compile's crossfade still opens zero view
  transitions (a CSS variable flip is layout, not a transition), reduced-motion branch included.

### Edge Cases

- **Compile at zoom ≠ 1**: the override feeds the same `calc()` the scale multiplies — composes by
  construction; spot-check manually at 2× (screen renders 960px tall, canvas scrolls, no clipping).
- **Carry (sticky or keyboard) spanning the compile or the revert**: cancelled at the swap — Task
  5's case is the gate. A fresh gesture after the swap reads fresh geometry (readGeom at pick-up).
- **Compile → move a screen → revert**: undo history and announcements untouched (the swap never
  touches slots; geometry is per-gesture); covered by existing journey rows + one manual pass.
- **Reduced motion**: no new animation/transition introduced; the existing reduced-motion flow row
  stays green.
- **Oversize `?b=` board**: the fallback scroller + visible affordance (manual, Task 9).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

No linter exists. `git diff` review: token discipline (no literal colours), comment register,
no `view-transition-name`, no inline styles, no new bus verb.

### Level 2: Pure checks (CI-equivalent)

```
node tooling/build-checks.mjs
node agent-layer/gen-system-graph.mjs --check
node agent-layer/gen-loc-summary.mjs && git diff --stat system/loc-summary.json
```

### Level 3: Cross-engine drivers (operator-run)

```
node tooling/visual-regression/serve.mjs &
node tooling/studio-journey.mjs all
node tooling/vt-verify.mjs
```

### Level 4: Manual Validation

- Serve, open /factory, let the replay settle, Compile: four screens fully visible in one row,
  phone-proportioned, nav buttons on-screen, no guillotined element, no horizontal scrollbar
  anywhere; navigate p1→p2→p3→p4 by the nav buttons; Back to blocks restores the sketch.
- The `?b=` fat-board overflow check (Task 9) — scrollbar visible where scroll exists.
- Real-browser eyeball (memory `vr-gate-single-engine-blindspot`): Safari + Chrome stable, not just
  the vendored engines.

### Level 5: VR zero-churn proof

```
cd tooling/visual-regression && npm run update:docker   # from a clean detached worktree under /Users
git status baselines                                     # expect: clean
```

---

## ACCEPTANCE CRITERIA

- [ ] After Compile on the committed replay board, every `.stf-screen` satisfies
      `scrollHeight <= clientHeight` and `scrollWidth <= clientWidth` on chromium, firefox and
      webkit — asserted by the two new journey rows, which demonstrably fail pre-fix (426/140 and
      232/220 reproduced in this plan's session).
- [ ] `ds-list-row`'s value never extends past a 220px container; wide-container consumers
      (Fieldwork slots, study, /build patterns, instance) render pixel-identically (VR zero-churn +
      eyeball).
- [ ] No label bare-clips on a compiled screen (ellipsis or wrap, never a cut).
- [ ] A screen that genuinely overflows (oversize `?b=` board) shows a visible, token-styled
      scrollbar; wheel and Tab reachability unchanged.
- [ ] A live carry — sticky pointer or keyboard — is cancelled when the swap lands or reverts,
      node restored to origin, announced; asserted by Task 5's journey case, red without the guard.
- [ ] Revert returns the fat-marker stage byte-identically (existing row stays green); pre-compile
      geometry is untouched (220×140, caps, zoom table — group 12 green).
- [ ] JS surface is exactly: `cancel` exposed on the verbs handle + the two-state guard in
      studio.mjs's onState. Zero inline styles; nothing named for a view transition; no new bus
      verb or consumer; no new manipulable control (param-manifest untouched).
- [ ] vt-verify factory samples green (compile opens zero transitions, reduced motion included);
      INP rows stay ≤ 200ms.
- [ ] VR baselines: zero churn proven by an update:docker no-op (or the churn explained and
      regenerated deliberately in this PR).
- [ ] loc-summary regenerated; approach baselines regenerated only if the runtime group flipped.
- [ ] PR body carries `Closes #251`; plan + report + review committed in the same PR.

---

## COMPLETION CHECKLIST

- [ ] #214 landed on main first; anchors re-verified on the clean post-#214 tree
- [ ] Journey assertions (Tasks 1 and 5) written FIRST and observed red on the unfixed tree
- [ ] All tasks completed in order, each validation passing immediately
- [ ] `node tooling/build-checks.mjs` — 19 groups green
- [ ] `node tooling/studio-journey.mjs all` — green ×3 engines
- [ ] `node tooling/vt-verify.mjs` — green
- [ ] VR zero-churn proven (or deliberate regen committed)
- [ ] Manual pass on /factory + the `?b=` overflow board + real Safari/Chrome
- [ ] Comment rewrite in studio.css tells the amended scroll story honestly
- [ ] Branch hygiene: this worktree currently holds **#214's uncommitted work** — #251 gets its own
      branch off post-#214 main; verify the branch immediately before committing and stage by
      explicit path, never `git add -A` (memory `shared-worktree-parallel-sessions`)

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **The decision itself (owner-facing, the one thing to veto):** this plan resolves the ticket's
   three-way choice as *taller compiled slots via the state-attribute CSS seam*, explicitly NOT
   pulling #219's device-frame treatment forward and NOT using zoom. If the owner wants bezel
   chrome NOW (the `factory-mid-epic-owner-verdict` memory says product-grade look matters), that
   is #219 scope layered on top of this fix — this fix is prerequisite either way, since a bezel
   around an overflowing screen is still an overflowing screen.
2. **SEQUENCING (resolved as a constraint):** #214 is mid-flight, uncommitted, in this same
   worktree, touching `studio.mjs` / `studio.css` / `studio-compile.mjs` / `factory.html` — three
   of this plan's five files. #251 implements AFTER #214 merges. The onState wiring point exists on
   both trees (main :424; #214 adds `getAnswers` beside it); if #214 changed the flow screens'
   content, re-run the Task 6 measurement expectation against its tree (the journey rows are the
   gate either way). Factory baselines: #214 regenerates them; #251 changes nothing at rest, so no
   collision — but if a regen IS somehow needed (Task 8 churn), merge main and re-run
   `update:docker` per the epic's baseline-collision rule.
3. ~~The height value~~ **Resolved by measurement (2026-08-10):** worst compiled screen with the
   list-row fix applied is 426/428/429px (chromium/firefox/webkit) → 480px pinned with ≥51px
   headroom. The journey rows re-prove it on every run; Task 6 says what to do if the tree moves.
4. **Assumption:** `?b=`-restored boards on /factory can overflow even 480px (bounded by per-place
   slot caps + connection counts) — hence the fallback scroller keeps existing. If measurement
   shows the caps make overflow impossible, the affordance CSS is still harmless (paints nothing
   without overflow).
5. **Assumption:** defect 3 (bare label clip) is a symptom of defect 2 and disappears with it;
   Task 3 verifies on the page and has instructions if not.
6. **Width stays 220px in compiled state.** Values now wrap instead of truncating, so nothing is
   lost; widening moves every column and buys little. If the owner finds 220 too cramped at the
   #223 re-judge, widening is the same one-line seam (`--stx-slot-w` under the same selector).

## NOTES (open canvas)

### Measured evidence (2026-08-10, this plan's session)

Method: the VR static server + the vendored Playwright (`tooling/visual-regression/node_modules`,
the journey's own resolution idiom), viewport 1440×1000 (flowPass's), `/factory.html` settled →
Compile → `data-compile-state === "rendered"`; the candidate fixes injected via `addStyleTag` — the
same stylesheet-override seam the journey's fit check already uses (:311). Tree: main 793a270 +
#214's uncommitted work. Scripts kept in the session scratchpad (`measure-251.mjs`,
`measure-251-prefix.mjs`); re-run them if the tree moves.

**Control (no fixes), chromium — the red the Task 1 rows are guaranteed to show:**

| screen | content (sh/ch) | horizontal (sw/cw) |
|---|---|---|
| Today Overview | 426 / 140 | 220 / 220 |
| At-Risk Queue | 258 / 140 | 220 / 220 |
| Job Detail | 285 / 140 | **232 / 220** |
| Reassignment Confirmation | 270 / 140 | 220 / 220 |

**With the Task 2 list-row fix injected — content heights at 220px width, per engine:**

| screen | chromium | firefox | webkit |
|---|---|---|---|
| Today Overview | 426 | 428 | 429 |
| At-Risk Queue | 258 | 274 | 274 |
| Job Detail | 310 | 316 | 315 |
| Reassignment Confirmation | 270 | 274 | 274 |

Job Detail grows 285 → 310: the long value wraps to a second line instead of overflowing — the
wrap trade made explicit and inside the headroom. scrollWidth == 220 on every screen, every engine
(the horizontal defect is dead). **With `--stx-slot-h: 480px` additionally injected: every screen
fits (sh == ch == 480, stretch) on all three engines.** Worst content 429 → 51px headroom.

### Why zoom can't fix this (the full argument)

Overflow is a ratio between a slot's content height and the slot's box, both of which live in the
stage's unscaled coordinate space; `--stx-scale` multiplies the rendered size of both identically,
so no zoom level changes what fraction of a screen is visible inside its slot. The other reading —
"zoom the canvas out so *bigger slots* still fit the viewport" — collides with the discrete table:
after any meaningful growth, `fit()` (which fits the WHOLE 12×8 canvas by design, studio.css:59–69)
snaps to 0.5, where `--type-body` renders ~7–8px. The fix has to change the slot, not the lens.

### Why the override is safe against every consumer of geometry (verified in source, not assumed)

- the sizer (studio.css:67–68) and grid template (:76,:83) consume `var(--stx-slot-h)` → scroll
  range and layout stay consistent automatically;
- the pointer hit-test reads `getComputedStyle(stage).gridTemplateRows` **per gesture** at pick-up
  (studio-verbs.mjs:544–553) — used values, so the grown tracks are what a fresh gesture sees; the
  one gesture that could span the growth is cancelled at the swap (Task 5);
- `fit()` measures `stage.offsetWidth/Height` per call (studio-canvas.mjs:169–171);
- group 12 pins `--stx-cols`, `--stx-rows`, `[data-zoom]` rules and per-index slot rules
  (build-checks:2072–2110) — none of its regexes match the new selector, and slot dimensions were
  never pinned because no JS export mirrors them;
- the journey's fit check already injects its own `--stx-slot-w/h` override stylesheet
  (studio-journey.mjs:311) — precedent that the variables are the sanctioned override seam;
- determinism: the settled (pre-compile) canvas is the pixel baseline; compiled state appears in no
  baseline (visual.spec.mjs factory entry interacts with nothing).

### The carry-across-swap fix: why cancel, and why not the alternatives

A sticky click-carry survives a Compile click (the sticky drop handler is scroller-scoped,
studio-verbs.mjs:630–633, and the compile row sits outside the scroller); a keyboard carry survives
it the same way. Both hold `gesture.geom` cached at pick-up, so after the growth their previews and
drops resolve against 140px tracks on a 480px grid. Alternatives weighed:

- **Re-read geom at the sticky drop click** — rejected: fixes only the final click on one input
  family; mid-carry previews stay wrong, keyboard carries stay wrong entirely.
- **Re-read geom per pointermove** — rejected: a `getComputedStyle` in the move handler is spike
  2's measured pessimistic case; the rAF throttle does not excuse it.
- **Cancel at the swap** — chosen: one exposed existing closure + a two-state guard at the seam the
  orchestrator already owns; covers both input families; also resolves the pre-existing
  incoherence (pre-#251, a carried block's CONTENT silently morphed into a screen mid-carry — the
  gesture survived but the thing being carried was no longer the thing picked up). `cancel()` is
  already total (`if (!gesture) return`), so ordinary compiles pay nothing. The live-region
  coalescing trade (cancel's sentence wins over settle's when a carry was live) is recorded in
  Task 5's GOTCHA.

### Consumers of `ds-list-row` surveyed (for the components.css change)

Fieldwork proto slots (committed root compositions — metric tiles + insight panel; list-rows only
via northwind), `/agentic-ui-study` + `instance.html` (northwind's `sku-attention-list` — wide
containers, off the VR set), `/build` Act 4 (queue/feed/settings patterns — wide `.bx-pat-slots`;
at-rest default board names dashboard, so no at-rest list-rows in the /build baseline), the
studio's compiled screens (the narrow container this fix serves), and `studio-export.mjs`'s
single-file export, which inlines the real components.css (:271) — the fix propagates there
automatically, no export change.

### Why wrap beats ellipsis for the value

The row's value is data ("Reassignment Confirmation" is where the affordance leads); an ellipsis
hides exactly the fact the screen exists to show, in the epic whose honesty contract is the
differentiator. Labels (`.ds-row-name`) keep their ellipsis — identity is recoverable from context;
data is not. The cost — Job Detail +25px — is measured above and inside the headroom.

### INP

The compile interaction now also grows 96 grid tracks' worth of layout. The existing #213 rows
already measure the compile click per engine with the ≤200ms budget; a full-grid reflow of ~31
wrappers is well inside it, and the gate — not this note — is the proof.

## AMENDMENTS

- 2026-08-10 — risks addressed before approval: (1) the 480px value pinned by real three-engine
  measurement (worst 429, webkit) instead of deferred to implementation; pre-fix control run
  confirms the red-first journey rows fail on today's tree; (2) the sticky/keyboard
  carry-across-compile edge upgraded from "recorded, accepted" to a root fix — cancel-on-swap via
  the verbs' exposed `cancel()` + studio.mjs's onState guard (Task 5), with its own red-first
  journey case; (3) sequencing constraint added — #214 is uncommitted in this worktree and touches
  three of the plan's files, so #251 implements after #214 lands and re-verifies anchors.
