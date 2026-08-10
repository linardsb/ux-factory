# Feature: Studio 12 — method embodied: on-canvas method cards + the assemblable Hook loop (#214)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils and exports —
import from the right files.

## Feature Description

The ten method questions (Hooked ×7, Shape Up ×3) stop being a stepped wizard the studio links out
to and become **on-canvas method cards** in a method band on /factory: answering a card visibly
redrafts the board on the canvas in the same interaction. The Hook loop (trigger → action → variable
reward → investment) becomes an **assemblable four-node diagram** whose completion — and only its
completion — unlocks the ethics verdict (Manipulation Matrix quadrant + frequency filter), rendered
from the same committed rules /build uses. `/build` keeps its stepped wizard over the same store and
the same share links; nothing forks.

## User Story

As a hiring manager evaluating this portfolio
I want to answer the method's questions on the working surface and watch the artifact change under my answers
So that I experience the method producing the product instead of reading a form about it.

## Problem Statement

The methods are answered ABOUT, not performed IN (epic #202 problem 3). On /factory today the ten
answers exist only as `DEFAULT_ANSWERS` — nothing on the page writes the store on an ordinary visit
(`system/studio.mjs:34-41`), the "This build" panel links out to /build to change them
(`studio.mjs:289-293`), and the ethics verdict exists only on /build's `mountVerdict`. The method is
subject matter, not working surface.

## Solution Statement

A new `system/studio-method.mjs` mounts a **second mount of the existing answer store** — never a
second truth. Cards read `QUESTIONS`/`readBuild()` and write through `setAnswers()` (the existing
`source: "questions"` path); a `BUILD_CHANGE` listener filtering `"questions" | "restore"` (the #193
fix pattern, `build-questions.mjs:565-573`) keeps cards, diagram and verdict live, including on a
`?b=` restore with zero interaction. On an answer change the board is **wholesale redrafted** via
`draftBoard(answers)` and adopted onto the canvas through a new `adoptBoard` seam in `studio.mjs`,
published to the store as `publishBuild({ source: "breadboard", … })` — `breadboard.mjs:206-208`'s
exact idiom. The cards are **driver-gated** exactly like the compile beat (`studio.mjs:497-503`):
inert while the replay autoplays, enabled at settle/take-over via `publishBoard`, never disabled on
the declined (`?b=`) path. Provenance is honest: the notice + "This build" panel state whether the
board is the recorded run's or drafted from your answers.

## Out of Scope / Non-Goals

- **Not changing `/build` at all**: `mountWizard`, `mountVerdict`, build.html's markup and the share
  codec are untouched. The wizard "dies *in the studio*" by the studio no longer linking out for
  answers — not by removing anything from /build (PRD §1's form-mode fallback guarantee).
- **Not changing `QUESTIONS`' shape**: no new question, no renamed id, no new fields. The only
  `build-questions.mjs` edit is one additive frozen export (`HOOK_STAGES`). This is what keeps
  build-checks group 8 proving the same thing by construction (the ticket's blast-radius warning).
- **Not a new bus verb and not editing `action-bus.mjs`**: Hook-diagram assembly is a two-click
  select-then-place model where pointer and keyboard converge natively on `click` —
  `studio-flow.mjs:14-25`'s recorded precedent for rejecting a symmetry-only verb applies verbatim.
- **Not touching the replay artifact, `replay-driver.mjs`, or `board-ops.mjs`**: the replay's board
  is replaced on redraft, never mutated; the driver is never a second author and neither is this.
- **Not a `components.css` component**: cards and diagram are studio chrome. CSS goes in
  `system/studio.css` per #212's recorded planning decision (a `components.css` block becomes a
  `system-graph.json` consumer and churns factory's Graph panel + extra baselines). This overrides
  the ticket's files-touched *estimate*, deliberately — see DECISIONS below.
- **Not undo/redo for the diagram or the cards**: the canvas history stays arrangement-only
  (`studio-verbs.mjs` untouched). After a redraft, stale history entries reference dead wrapper ids
  and undo restores nothing visible — accepted, see NOTES.
- **Not #215's scope**: no catalog, no playground, no ⌘K additions. Do not run this ticket
  concurrently with #215 — both regenerate /factory's baselines.
- **Not the #212-owed flow-nav INP rows**: perfPass gains only #214's own two rows; the flow-nav gap
  stays recorded as owed.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: /factory (studio orchestrator + new method band), `system/build-questions.mjs` (additive export), gates (build-checks, studio-journey, vt-verify), VR baselines
**Dependencies**: none external. #206 (merged, `3a03266`) satisfied; current main `793a270`.

## Related Work

**Implements**: linardsb/ux-factory#214 (PR body must carry `Closes #214`)   ·   **Epic**: #202 — `docs/epics/prototype-studio.architecture.md` §Recommended approach (both surfaces import the same answer store and speak `BUILD_CHANGE`), PRD §6 (verbatim source) + §1 (/build survives as fallback)

**Back-references** (plans this builds on or inherits decisions from):

- `.claude/plans/studio-route-surgery-orchestrator-206.md` — Why: owns the inspector panel-id freeze and the "This build" panel contract this ticket edits the copy of.
- `.claude/plans/studio-flows-places-screens-212.md` — Why: the recorded `components.css`-stays-untouched decision; the no-bus-verb precedent; the VR/param/loc bookkeeping task shapes mirrored here.
- `.claude/plans/studio-gates-inp-vt-a11y-213.md` — Why: perfPass's enumerated INTERACTIONS table is the designed extension point for the two new INP rows.

**Forward-references**:

- (none yet)

---

## DECISIONS CONFIRMED AT PLANNING REVIEW (2026-08-10 — do not re-open at implementation)

1. **Redraft semantics: wholesale, driver-gated.** Cards are disabled while the replay autoplays
   (compile-beat precedent `studio.mjs:497-503`). Once the driver stops for good (settle, take-over,
   declined, or unavailable — i.e. wherever `publishBoard` runs, plus the never-disabled declined
   path), an answer change redrafts the whole board via `draftBoard(answers)` and replaces the canvas
   content. The provenance flip is announced through `canvas.say`, written to `[data-studio-notice]`,
   and stated in the "This build" panel. The run's board comes back on reload. Owner-confirmed.
2. **Placement: method band in the canvas column, OUTSIDE `.stx-scroll`.** Cards stay legible at
   every zoom, never consume the 12×8 grid, never perturb the share codec's `g` arrangement field
   (parallel-indexed to board places, `build-share.mjs`), and never fire the replay's take-over
   discriminator (which listens on `canvas.scroll` only, `replay-driver.mjs:726-779`). Owner-confirmed.
3. **CSS home: `system/studio.css`**, per #212's recorded decision; the ticket's `components.css`
   line is an estimate, overridden.
4. **Store discipline: no fourth write path, no new `source` value.** Cards write via
   `setAnswers()` (`source: "questions"`); the redraft publishes via
   `publishBuild({ source: "breadboard", board, boardIsEdited: false })` (`breadboard.mjs:206-208`'s
   idiom). Method listeners filter `"questions" | "restore"` and ignore `"breadboard"`, which is what
   makes the redraft loop-free: setAnswers → "questions" → redraft → publishBuild("breadboard") →
   ignored.
5. **Hook diagram model: select-then-place, no drag, no bus verb.** Nodes and slots are buttons;
   pointer and keyboard converge natively on `click` (SC 2.5.7 satisfied by construction — no path
   requires a drag). A wrong-stage placement is refused with an announcement, never a throw. The
   drag + `ui.assemble` bus-verb alternative is recorded as rejected in NOTES.
6. **Verdict unlock is UI-local completion state**, not a store field. Content always comes from
   `quadrantFor`/`frequencyVerdictFor`/`QUADRANT_MEANINGS` by import (AC #3). A `?b=` restore
   arrives with a full answer set, so restore renders the diagram assembled and the verdict unlocked
   (resolves the AC#2/AC#5 tension: "unlocks only on completion" — restore IS completion, the
   sender completed it).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING!

- `system/studio.mjs` (whole file, 663 lines — this ticket's most delicate edit) — Why:
  `mountStudioCore` :369-542 is where every seam lands. Specifically: :378-379 (`answers` capture —
  becomes `let`), :400-402 (the own-board placement loop `adoptBoard` reuses), :424 (`mountCompile`
  call — gains `getAnswers`), :426-432 + :473-492 (`buildSummary`/`publishBoard` — redraft adoption
  point, method `setEnabled` wiring), :284-293 (`renderSummary`'s "TWO SOURCES" note — copy goes
  stale, reworded with provenance), :497-503 (the compile disable asymmetry the cards mirror),
  :540 (the `live` handle — gains `method`), :566-600 (`restoreShared` — runs `restoreBuild` BEFORE
  `mountStudioCore`, so the method mount's seed-at-mount already sees restored state).
- `system/build-questions.mjs` (:31-60 BUILD_CHANGE contract; :49-53 three-write-paths rule; :65-73
  in-memory state; :79-90 `quadrantFor`/`frequencyVerdictFor`; :92-94 `readBuild`; :108-113
  `publishBuild` refuses answers; :145-148 `ACTS`; :168-290 `QUESTIONS`; :296-307 `SUMMARY_TERM`;
  :309-322 `QUADRANT_MEANINGS` + the no-third-copy comment; :326-328 `DEFAULT_ANSWERS`; :332-341
  load asserts; :371-374 `setAnswers`; :384-393 `restoreBuild`; :416-516 `mountWizard` — NOT
  touched; :523-576 `mountVerdict` — the #193 filter at :565-573 is the pattern every new listener
  copies) — Why: the store this ticket mounts a second surface of.
- `system/breadboard.mjs` (:38-47 caps; :96-146 `draftBoard` + rule order; :206-208 `publish()` —
  the source:"breadboard" idiom; :683-714 the BUILD_CHANGE listener — the only existing
  answers→redraft code, including the restore-adopts-verbatim branch) — Why: `draftBoard` is
  imported; the listener's redraft/restore split is mirrored.
- `system/studio-compile.mjs` (:237 `mountCompile` destructure; :483 + :578 the
  `getBoard`/`board` ternary — `getAnswers` joins with the identical form; :284-310 the
  blocked/setEnabled machinery the cards' gating mirrors) — Why: minimal additive signature change.
- `system/studio-canvas.mjs` (:95 `getCanvas`; :101 `initStudioCanvas`; :128-137 the ONE live
  region + `say`; :225-241 pan-vs-click seam — irrelevant to a band outside the scroller but read
  it anyway; :307-345 `place()`) — Why: `canvas.say` is the only announcement channel; `place()` is
  what `adoptBoard`'s loop calls.
- `system/replay-driver.mjs` (:726-779 take-over discriminator on `canvas.scroll` — proves band
  interactions can't accidentally take over; :470-473 `[data-replay]` states; :643-657 settle) —
  Why: the ownership window the gating respects; NOT edited.
- `system/studio-keep.mjs` (:285-295 `specState()` reads `readBuild()` live at click time) — Why:
  the keep rail is already reactive to answer changes; `publishBoard` already calls `keep.update()`.
- `system/studio-flow.mjs` (:14-25 the no-bus-verb reasoning) — Why: the precedent decision 5 cites.
- `system/action-bus.mjs` (:6-33 contract) — Why: read to confirm you are NOT editing it.
- `factory.html` (:222-259 `.stu-canvas-col` — where the band's markup lands; :261-349 inspector;
  :459-478 script order — no new tag needed, `studio.mjs` mounts the method module) — Why: markup.
- `system/studio.css` (:186-217 the reduced-motion EXHAUSTIVE literal class list — new classes must
  be appended by hand; :235-301 shell grid; header :5-11 the why-not-components.css rationale) —
  Why: styles + the off-ramp list.
- `system/param-manifest.json` ($description counting rules; the `/build` `input[name="bx-q-*"]`
  entries — the exact granularity the card entries mirror; the `/factory` key's 25 entries) — Why:
  AC #7.
- `tooling/build-checks.mjs` (:1137 group 7 MODULES roster — gains the new file; :1140-1198 group 8
  incl. the rule-3 loop at :1187-1198 — NOT edited, must stay green; group 19 :3723 — the newest
  group, mirror its shape for the new method group; :89 the quadrantFor import precedent) — Why:
  gate additions.
- `tooling/studio-journey.mjs` (:233 `journey()` pass sequence; :1240-1249 where factoryPass/perfPass
  are called — the method pass slots beside them; :3059-3245 perfPass's INTERACTIONS rows + :3368
  the enumerated-not-exhaustive note; the three-source and announcement-counting idioms throughout)
  — Why: the method pass + 2 INP rows.
- `tooling/vt-verify.mjs` (:385-528 the factory block; the #213 post-load interaction samples at
  :481-518) — Why: one new sampled case (card answer + redraft opens zero transitions).
- `tooling/build-journey.mjs` (:214-221 the #193 regression case; :654-665 the dealer-quadrant
  case) — Why: the /build regression surface; run, not edited (unless a share-both-directions case
  is missing — check before adding).
- `portal/lib/builder.mjs` (:40-42 imports; :54-90 the three rules; :77 `QUESTION_INPUTS`) — Why:
  the blast radius you must NOT reach — read to confirm your build-questions edit is invisible to it.

### New Files to Create

- `system/studio-method.mjs` (~450) — the method band: ten cards, the Hook diagram, the verdict,
  the redraft listener. Hand-written canon, header citing PRD §6 / architecture §Recommended
  approach / this plan. Node-import safe (no DOM at module scope; pure layer exported).
- `.claude/reports/studio-method-cards-hook-loop-214-report.md` — execution report, same PR.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/prototype-studio.prd.md` §6 (verbatim source for this ticket) + §1 + §7 ("the
  visitor's own path stays structured (tokens/colour + method cards, committed rules)").
- `docs/epics/prototype-studio.architecture.md` §Recommended approach (:27-48 — one board stays the
  single source of truth; both surfaces import the same store) + Route surgery (:126-133 — manifest
  entries grow under the existing `/factory` key; the studio regenerates factory's baselines).
- `CLAUDE.md` — architecture map (gains a `studio-method.mjs` line), the ground rules, the
  "New live-manipulable control" rule, the VR-baseline memory entries.

### Patterns to Follow

**The #193 listener filter** (every new BUILD_CHANGE consumer copies this, `build-questions.mjs:570-573`):

```js
document.addEventListener(BUILD_CHANGE, (e) => {
  const source = e.detail && e.detail.source;
  if (source === "questions" || source === "restore") render(e.detail.answers);
});
```

**The redraft publish** (`breadboard.mjs:206-208`):

```js
publishBuild({ source: "breadboard", board: structuredClone(board), boardIsEdited: edited });
```

**The gating asymmetry** (`studio.mjs:497-503`): `if (!declined) compile.setEnabled(false);` —
disabled only when the driver will PLAY; re-enabled inside `publishBoard` (:485) on every
stopped-for-good path including `finalBoard == null` (unavailable).

**The dual-form option** (`studio-compile.mjs:483`):
`compileSteps(typeof getBoard === "function" ? getBoard() : board, answers)` — `getAnswers` joins
with the identical ternary.

**`el()` helper**: copied per module, never shared (`studio.mjs:124-136`). Zero inline styles, zero
markup-from-string — the new module joins build-checks group 7's roster with no exception argued.

**Announcements**: fixed sentences through `canvas.say`, refusals to the live region never a throw
(`action-bus.mjs:76-79` would swallow a throw into console.error and trip studio-journey's
no-page-errors contract). No timestamps/counters in anything that settles into the DOM.

**Naming**: new classes `stu-method`, `stu-mcard`, `stu-hook-*`, `stu-verdict-*` (the `.stu-` prefix
is /factory's page vocabulary, `studio.css:220-225`); data hooks `[data-studio-method]`,
`[data-method-card="<id>"]`, `[data-hook-node="<id>"]`, `[data-hook-slot="<n>"]`,
`[data-method-verdict]`.

---

## IMPLEMENTATION PLAN

### Phase 1: Seams (build-questions export, studio-compile getter, studio.mjs surgery)
Foundational; everything else depends on it.

### Phase 2: The method module + markup + styles
**Depends on:** Phase 1 (imports the seams).

### Phase 3: Bookkeeping (manifest, counts, map)
**Depends on:** Phase 2 (selectors must exist).
**Independent of:** Phase 4's gate-code tasks (10-12) — can interleave.

### Phase 4: Gates + baselines + validation
**Depends on:** Phases 1-3.

---

## STEP-BY-STEP TASKS

### Task 1 — Branch setup

- **IMPLEMENT**: from clean `main` at/after `793a270`: `git fetch origin && git diff origin/main --stat`
  (expect empty), then `git checkout -b feature/studio-214-method-cards-hook-loop`.
- **GOTCHA**: shared worktree — verify `git branch --show-current` before EVERY commit; stage by
  explicit path (memory `shared-worktree-parallel-sessions`).
- **VALIDATE**: `git branch --show-current`
- **SATISFIES**: process.

### Task 2 — UPDATE `system/build-questions.mjs`: add `HOOK_STAGES`

- **IMPLEMENT**: one additive frozen export beside `SUMMARY_TERM` (~:296):
  ```js
  // The Hook loop's four stages, in loop order — the assemblable diagram's truth (#214). These are
  // QUESTION ids: the diagram is a projection of four of the ten answers, never a second store.
  export const HOOK_STAGES = Object.freeze(["trigger", "action", "rewardType", "investment"]);
  ```
  Nothing else in this file changes. Extend the load-time asserts (:332-341) with one clause: every
  `HOOK_STAGES` id must exist in `QUESTIONS` with `act === "hooked"` — fail-loud, matching the
  existing assert style.
- **PATTERN**: `SUMMARY_TERM` :296-307 (an exported projection keyed by question id).
- **GOTCHA**: do NOT touch `QUESTIONS`, `ACTS`, `mountWizard`, `mountVerdict`. `portal/lib/builder.mjs`
  imports this module — the addition must be invisible to it (it is: builder imports named exports
  only).
- **VALIDATE**: `node --check system/build-questions.mjs && node -e "import('./system/build-questions.mjs').then(m=>{if(m.HOOK_STAGES.length!==4)throw new Error('bad');console.log('HOOK_STAGES ok')})"` then `node tooling/build-checks.mjs` (group 8 green, untouched).
- **SATISFIES**: AC #2 groundwork, AC #6.

### Task 3 — UPDATE `system/studio-compile.mjs`: `getAnswers` joins the option bag

- **IMPLEMENT**: `:237` destructure gains `getAnswers`; `:483` and `:578` become
  `compileSteps(typeof getBoard === "function" ? getBoard() : board, typeof getAnswers === "function" ? getAnswers() : answers)`.
  Three lines total.
- **PATTERN**: the `getBoard`/`board` dual form already on the same lines — mirror it exactly.
- **GOTCHA**: `mountCompile` has exactly one caller (`studio.mjs:424`, verified by grep) — but
  `compileSteps` is driven by build-checks group 15; its signature does not change.
- **VALIDATE**: `node --check system/studio-compile.mjs && node tooling/build-checks.mjs`
- **SATISFIES**: AC #1 (the compile beat compiles the CURRENT answers after a card change).

### Task 4 — UPDATE `system/studio.mjs`: `let answers`, `adoptBoard`, provenance, method wiring

- **IMPLEMENT**, all inside `mountStudioCore` unless noted:
  1. `:379` `const answers` → `let answers` (same seed).
  2. `:424` pass `getAnswers: () => answers` alongside the existing args to `mountCompile`.
  3. `publishBoard` (:473-492) gains an optional second param `provenance` (default `"run"`),
     stored in a `let boardProvenance = "run"` closure; it also calls `method?.setEnabled(true)`
     beside `compile.setEnabled(true)`.
  4. New closure `adoptBoard(nextBoard, nextAnswers)`: sets `answers = nextAnswers`; removes every
     existing `.stx-slot` from `canvas.stage`; re-runs the :400-402 placement loop over
     `arrangeBoard(nextBoard)`; calls `publishBoard(nextBoard, "drafted")`. It does NOT write the
     store (the method module owns store writes — this file's :34-41 charter survives; note that in
     a comment).
  5. `renderSummary` (:259-294): the closing note becomes provenance-aware. `"run"` keeps the
     two-sources sentence but the link now points at the on-page cards
     (`el("a", { href: "#method", text: "Answer them in the method cards below" })`) instead of
     `/build#act-hooked`; `"drafted"` renders: "This board is drafted from your ten answers by the
     committed rules — the recorded run's board was set aside. Reload to watch the run again."
     Thread `boardProvenance` through the existing call sites (:432, :482).
  6. Mount the method module after the keep rail (:529-534), so it takes a page whose canvas, beat
     and rail exist: `method = mountStudioMethod(root, { canvas, adoptBoard, declined })` (import at
     top; `let method = null` declared beside `keep` :459 so `publishBoard` can reach it). Mirror
     the compile asymmetry: inside `mountStudioMethod`, `declined` (or an unavailable driver) means
     never-disabled — see Task 5.
  7. `live` (:540) gains `method`.
  8. Header: extend the :34-41 paragraph — the store-write exception count stays ONE in this file;
     the method module is the page's answer-writer, and say so.
- **PATTERN**: :400-402 (placement loop), :497-503 (gating asymmetry), :459 (`let keep = null`
  declared-early idiom).
- **GOTCHA (1)**: `publishBoard` re-reads `answers` for `buildSummary` — with `let answers` updated
  by `adoptBoard` BEFORE `publishBoard` runs, settle/take-over paths still see current answers.
- **GOTCHA (1b — HARD CONSTRAINT)**: `method?.setEnabled(true)` inside `publishBoard` must stay
  SYNCHRONOUS — never behind a rAF, setTimeout, or await. `settle()` writes
  `[data-replay="settled"]` BEFORE it calls `onSettle` (`replay-driver.mjs:648` precedes `:655`),
  so the only thing keeping the pixel gate from capturing settled-but-disabled cards is that the
  attribute write and the enablement land in the same synchronous task — no frame can paint
  between them. Defer the enable by one tick and the gate races it.
- **GOTCHA (2)**: `adoptBoard` must clear slots via `wrapper.remove()` on each `.stx-slot`, never
  `stage.innerHTML = ""` (markup-from-string ban is on WRITES; still, `textContent = ""` would also
  nuke the sizer — the sizer and stage are siblings, verify with studio-canvas.mjs:107-134 what
  lives inside `stage` before choosing the clear).
- **GOTCHA (3)**: do NOT emit `ui.move` or call `applySlot` — arrangement of the fresh board is the
  placement loop's row-1 default; the one-mover invariant survives because this is authorship
  (place/remove), not movement, the same line replay-driver.mjs walks.
- **VALIDATE**: `node --check system/studio.mjs && node -e "import('./system/studio.mjs').then(()=>console.log('node-import safe'))"`
- **SATISFIES**: AC #1, AC #5 groundwork.

### Task 5 — CREATE `system/studio-method.mjs`

- **IMPLEMENT**: header (governing docs: PRD §6, architecture §Recommended approach, ticket #214,
  this plan; the decisions: second mount never second truth, driver-gated wholesale redraft,
  no-bus-verb rationale citing studio-flow.mjs:14-25, the #193 filter). Structure:
  - **Pure layer** (top, exported, DOM-free — build-checks' new group drives it):
    - `assembleReducer(placed, stageId, slotIndex)` → `{ placed, accepted, reason }`: accepts only
      when `HOOK_STAGES[slotIndex] === stageId` and the slot is empty; refusal reasons are fixed
      sentences naming the stage and the slot ("Investment is not stage 1 — the loop starts with a
      trigger.").
    - `hookComplete(placed)` → true only when all four slots hold their own stage.
    - `verdictFor(answers)` → `{ quadrant, meaning, frequency }` — thin composition of the IMPORTED
      `quadrantFor`, `QUADRANT_MEANINGS`, `frequencyVerdictFor`; no second copy of any rule (AC #3).
    - `RENDER_SOURCES = Object.freeze(["questions", "restore"])` — the listener filter as data, so
      the check group can pin it.
  - **`mountStudioMethod(root, { canvas, adoptBoard, declined })`** → `{ setEnabled, refresh }`:
    - Renders into `[data-studio-method]`: a heading, the ten cards (grouped under the two `ACTS`
      labels), the Hook diagram, the verdict slot. Each card: `SUMMARY_TERM[q.id]` caption,
      `q.prompt`, a radiogroup of `q.options` (name `stm-q-${q.id}` — NOT `bx-q-*`, which is the
      wizard's namespace), current answer checked from seed.
    - Seed: `const stored = readBuild(); const answers = stored.answers ?? DEFAULT_ANSWERS;` —
      `studio.mjs:378-379`'s exact idiom. If `stored.source === "restore"` and `stored.answers`
      exist: render the diagram assembled and the verdict unlocked (decision 6). The discriminator
      is VERIFIED reliable: `state` carries `source` (`build-questions.mjs:66-73`), `publishState`
      assigns it before dispatch (`:97-103`), `readBuild()` clones the whole state, and
      `restoreShared` awaits decode and calls `restoreBuild` BEFORE `mountStudioCore`
      (`studio.mjs:577-587`) — so at method-mount time on a `?b=` path, `source === "restore"`;
      on a plain load, `source === null`.
    - Card `change` handler: `setAnswers({ [q.id]: value })`, nothing else — the listener does the
      rest (one code path whether the write came from this mount or anywhere).
    - The `BUILD_CHANGE` listener: filter on `RENDER_SOURCES`. On `"questions"`: sync card checks,
      re-render the verdict if unlocked, then `redraft(e.detail.answers)`. On `"restore"`: sync
      cards, assemble the diagram, unlock the verdict — and do NOT redraft (the sender's board is
      already placed; `breadboard.mjs:687-706`'s restore-adopts-verbatim reasoning).
    - `redraft(answers)`: `const board = draftBoard(answers);`
      `adoptBoard(structuredClone(board), answers);`
      `publishBuild({ source: "breadboard", board, boardIsEdited: false });`
      `canvas.say(`Board redrafted from your answers — ${board.places.length} places.`);`
      Also writes the provenance sentence to `[data-studio-notice]` (un-hide it), mirroring
      `restoreShared`'s two-places rule (:589-598).
    - The Hook diagram: four node buttons (labels from `SUMMARY_TERM`) + four slot buttons
      (numbered, named for their expected stage only after filled). Select-then-place: activating a
      node selects it (announced: "Trigger selected. Choose its slot in the loop."), activating a
      slot runs `assembleReducer` — accepted: node moves into slot (announced: "Trigger placed,
      stage 1 of 4."), refused: `canvas.say(reason)`, DOM untouched. On `hookComplete`: announce
      "Hook loop assembled. The ethics verdict is unlocked." and render the verdict.
    - The verdict: locked state is an honest sentence ("Assemble the Hook loop to unlock the ethics
      verdict."); unlocked renders quadrant label + `QUADRANT_MEANINGS[quadrant]` verbatim +
      frequency verdict sentence — re-rendered on later answer changes (the two ethics answers are
      cards too).
    - `setEnabled(on)`: toggles `disabled` on every card input and diagram button + a
      `data-method-state` attr the gates read. Constructor: `if (!declined) setEnabled(false)` —
      the Task 4 wiring re-enables via `publishBoard`.
    - Mount end: set `[data-studio-method="ready"]` (synchronous — no `finally` gymnastics needed,
      but wrap the mount body so a throw still sets it, matching the canvas modules' discipline).
  - `el()` copied per module; zero inline styles; no markup-from-string; Node-import safe (`typeof
    document` guard around nothing at module scope — pure exports only).
- **PATTERN**: `mountVerdict` (`build-questions.mjs:523-576`) for the verdict rendering + filter;
  `bus-toggles.mjs` for per-row refusal discipline; `studio-compile.mjs:284-310` for setEnabled.
- **IMPORTS**: `{ QUESTIONS, ACTS, SUMMARY_TERM, DEFAULT_ANSWERS, HOOK_STAGES, BUILD_CHANGE,
  readBuild, setAnswers, publishBuild, quadrantFor, frequencyVerdictFor, QUADRANT_MEANINGS }` from
  `./build-questions.mjs`; `{ draftBoard }` from `./breadboard.mjs`.
- **GOTCHA (1)**: `publishBuild` THROWS on an answers key (`build-questions.mjs:108-113`) — the
  redraft publish carries only `board`/`boardIsEdited`/`source`.
- **GOTCHA (2)**: every announcement goes through `canvas.say` — never a second live region
  (`studio-canvas.mjs:128-137`).
- **GOTCHA (3)**: fixed sentences only — no counts that drift, no timestamps (VR determinism).
- **GOTCHA (4)**: radios must be real `<input type="radio">` so the native keyboard path (arrows
  within a group) is free — that is AC #1's keyboard story for cards; the diagram's is Tab + Enter
  on buttons.
- **VALIDATE**: `node --check system/studio-method.mjs && node -e "import('./system/studio-method.mjs').then(m=>{const r=m.assembleReducer({},'investment',0);if(r.accepted)throw new Error('reducer accepted wrong stage');console.log('pure layer ok')})"`
- **SATISFIES**: AC #1, #2, #3, #5.

### Task 6 — UPDATE `factory.html`: the method band markup

- **IMPLEMENT**: inside `.stu-canvas-col` after the `[data-studio-canvas]` div (:249): a
  `<section id="method" class="stu-method" data-studio-method aria-label="Method">` with a static
  heading ("The method — answer it here") and one static honest sentence (the cards mount into it;
  the static copy is what no-JS shows). Update the `.stu-canvas-col`'s :223-259 comment block to
  name the new region and its owner module.
- **PATTERN**: the keep rail's markup shape (:360-387) — static shell, `data-*` mount hook, JS fills.
- **GOTCHA**: `id="method"` is the anchor Task 4's renderSummary note targets; keep them in sync.
  No new `<script>` tag — `studio.mjs` imports the module.
- **VALIDATE**: `npx serve . &` → open `http://localhost:3000/factory.html` — band renders, cards
  mount, no console errors (Worker ERR_CONNECTION_REFUSED lines are the documented fixture
  degradation, not errors — memory `headless-render-data-pages-worker-refused`).
- **SATISFIES**: AC #1.

### Task 7 — UPDATE `system/studio.css`: `.stu-method-*` styles + reduced-motion clauses

- **IMPLEMENT**: a `.stu-method` block in the `.stu-*` section: band layout (cards as a wrapping
  grid of compact cards — `repeat(auto-fill, minmax(13rem, 1fr))` keeps ten cards from dwarfing the
  canvas), card / radiogroup / diagram / verdict styles, a `[data-method-state="disabled"]` visual
  (reduced opacity + `cursor: not-allowed` on the band, matching the compile row's disabled look),
  selected-node and filled-slot states as class flips. Diagram buttons ≥ 24×24 (SC 2.5.8 — record
  the target size in a comment beside the size, `studio.css`'s existing convention). If ANY
  transition/animation is used, append every new class to the :186-217 reduced-motion literal list.
- **PATTERN**: the `.stf-*` block (#212's addition) for scale and comment style; tokens only.
- **GOTCHA**: token discipline — no literals beyond structural px for borders/targets, matching the
  file's existing usage; this sheet is NOT a system-graph consumer, that's the point of decision 3.
- **VALIDATE**: visual check in the served page under neutral + one pack (dock switch); then
  `node tooling/build-checks.mjs` (group 12's studio.css mirror pins are about caps/zoom only —
  untouched — but run it).
- **SATISFIES**: AC #1, #2.

### Task 8 — UPDATE `system/param-manifest.json` + regen counts

- **IMPLEMENT**: 12 new `/factory` entries: ten
  `{ "page": "/factory", "selector": "input[name=\"stm-q-<id>\"]", "label": "method card: <short> radiogroup", "note": "disabled until the replay stops (#214)" }`
  (one per question, mirroring /build's granularity), one for the Hook node buttons (per-item verb =
  1 entry, selector `[data-hook-node]`), one for the slot buttons (`[data-hook-slot]`). Then
  `node agent-layer/gen-param-count.mjs`.
- **PATTERN**: the existing `/build` `bx-q-*` entries + the `/factory` `.stx-grab` per-item-verb entry.
- **VALIDATE**: `git diff system/param-count.json` — /factory total +12, site total +12.
- **SATISFIES**: AC #7.

### Task 9 — UPDATE `CLAUDE.md` map + regen loc-summary

- **IMPLEMENT**: a `studio-method.mjs` line in CLAUDE.md's architecture map (one paragraph: what it
  is, the driver-gating, the no-fourth-write-path rule, the #193 filter, where its checks live).
  Stage ALL files first, then `node agent-layer/gen-loc-summary.mjs`.
- **GOTCHA**: loc-summary counts TRACKED content — regen only after everything is staged (memory
  `loc-summary-counts-tracked-only`; #212's report hit exactly this). This changes approach.html's
  rendered numbers → approach baselines regen in Task 14.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` on the staged tree.
- **SATISFIES**: repo convention.

### Task 10 — UPDATE `tooling/build-checks.mjs`: group 7 roster + new group 20 "method"

- **IMPLEMENT**:
  1. Group 7 MODULES roster gains `system/studio-method.mjs` (the standing new-module rule).
  2. New group 20 (mirror group 19's shape): drive the pure layer —
     `HOOK_STAGES` is exactly 4, ⊆ `QUESTIONS` ids, every stage's `act === "hooked"`, order
     `["trigger","action","rewardType","investment"]`; `assembleReducer` truth table (right stage
     right slot accepted; wrong stage refused with a reason naming the stage; occupied slot
     refused; hostile ids refused, DOM-free by construction); `hookComplete` only true at 4/4 —
     including the 3/4 case and a 4/4-with-one-wrong case; `verdictFor(answers)` equals
     `{ quadrantFor(answers), QUADRANT_MEANINGS[...], frequencyVerdictFor(answers) }` **by
     identity on the imported functions' outputs** for all four quadrants and both frequency
     branches; `RENDER_SOURCES` contains `"questions"` AND `"restore"` (the #193 tripwire);
     plus the MUTATION that proves the group can fail: feed `assembleReducer` a synthetic
     stages-array-with-a-shaping-id via its inputs OR assert the build-questions load-assert throws
     on a tampered clone — the group must go red when the coupling breaks (memory
     `check-that-cannot-fail`: run the function, don't grep it).
  3. State the group's boundary in its header, like 9/11/13/16/19 do: the running-page halves
     (announcements, gating, redraft-on-page, restore-without-interaction) are studio-journey's.
- **PATTERN**: group 19 (:3723) for structure; group 13 for the pure-layer split.
- **VALIDATE**: `node tooling/build-checks.mjs` — 20 groups ✓; then temporarily reorder
  `HOOK_STAGES` in a scratch copy and confirm the group goes red (revert).
- **SATISFIES**: AC #2, #3, #6 (group 8 stays green AND unchanged — its rule-3 loop still varies
  the same eight answers because `QUESTIONS`/`QUESTION_INPUTS` are untouched).

### Task 11 — UPDATE `tooling/studio-journey.mjs`: methodPass + 2 INP rows

- **IMPLEMENT**:
  1. A new `methodPass` called beside `factoryPass` (:1240-1249), driving `/factory`:
     - **Gating**: on a fresh page, before settle: card inputs `disabled` and
       `data-method-state="disabled"`; after `[data-replay="settled"]`: enabled.
     - **Card → artifact, pointer** (AC #1): click a `shape` option that changes the entry place;
       assert the canvas's `.stx-slot` labels now equal `draftBoard(answers)`'s place labels —
       computed IN NODE by importing `draftBoard` and the answer set, never hardcoded; assert the
       announcement; assert the notice + "This build" note carry the drafted-provenance sentence;
       assert `getStudio().board` places match.
     - **Card → artifact, keyboard**: focus a different card's radio, ArrowRight + (native radio
       semantics select on arrow) — assert the same class of redraft, from the keyboard.
     - **Hook diagram, pointer**: place all four nodes right; each placement announced (counted
       exactly, per-path, the :3059 discipline); verdict locked BEFORE (assert the locked sentence,
       assert no quadrant text), unlocked AFTER with `QUADRANT_MEANINGS[quadrantFor(answers)]`
       asserted by IDENTITY (import both).
     - **Hook diagram, keyboard**: fresh page (or reset path), assemble via Tab+Enter only.
     - **Refusal**: place a wrong stage — announced with the fixed reason, DOM untouched, NOTHING
       on the console.
     - **The #193 case** (AC #5): build a `?b=` link (encode a full state via `build-share.mjs` in
       node — build-journey's idiom), load `/factory?b=...`, and WITHOUT any interaction assert:
       cards checked to the restored answers, diagram assembled, verdict unlocked with the restored
       quadrant's meaning verbatim.
     - **Cross-restore** (AC #4): after a card-driven redraft, read the keep rail's share link and
       assert `decodeBuild` round-trips the drafted board + answers (the /build direction is
       build-journey's existing coverage).
     - **Take-over discriminator regression**: a card click must NOT flip the replay to took-over
       when the replay already settled — and mid-replay the cards are disabled, so assert a
       pointerdown on a disabled card leaves `[data-replay]` unchanged (the band lives outside
       `canvas.scroll`; this is the assertion that keeps it that way).
  2. perfPass INTERACTIONS gains 2 rows: `method card radio click` and `hook slot place click`,
     both on the settled page, ≤ 200 ms, same calibration-consuming row shape as the existing 16
     (post-#249 form: null latency consumes `alive`, retries go through `violations()`).
- **PATTERN**: flowPass (#212) for pass shape; perfPass :3059-3245 for row shape; the
  announcement-counting and no-console idioms throughout the file.
- **GOTCHA (1)**: pass counts move on all three engines — current baseline **chromium 298 ·
  firefox 294 · webkit 294** (post-#249). Record the new counts in the report; do not chase the
  old numbers.
- **GOTCHA (2)**: the `?b=` case must wait on `[data-studio="ready"]` (the restore path withholds
  it until decode settles, `studio.mjs:639-644`) — NOT on `[data-replay="settled"]`, which the
  declined driver reaches as `"declined"`.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs &` then
  `node tooling/studio-journey.mjs all` — 0 failed ×3 engines, new counts printed. Then ONE red-run
  proof: temporarily break the redraft (e.g. skip `adoptBoard`) and confirm the card→artifact
  assertion goes red naming itself (revert).
- **SATISFIES**: AC #1, #2, #4, #5 + the epic's INP guardrail.

### Task 12 — UPDATE `tooling/vt-verify.mjs`: one new factory sample

- **IMPLEMENT**: in the factory block (after the #213 samples, :481-518's shape): post-settle,
  answer one card and assert ZERO `::view-transition-*` pseudos opened during the redraft (the
  method module uses no morph and names nothing — this pins it). Update the block's summary
  sentence to name the new sample.
- **PATTERN**: the #213 take-over/keep-rail samples — movement proven first, then the zero-count.
- **VALIDATE**: `node tooling/vt-verify.mjs` green ×3 engines with the new sample printing.
- **SATISFIES**: gate rigor (epic scope 10).

### Task 13 — Full validation battery (pre-baseline)

- **IMPLEMENT/VALIDATE**, in order:
  1. `node --check` on every touched `.mjs`.
  2. `node tooling/build-checks.mjs` — 20 groups ✓ (group 8 green-and-same proven by zero diff to
     its code and `QUESTIONS`).
  3. SDK-free proof: `mv portal/node_modules portal/node_modules.off && node tooling/build-checks.mjs; mv portal/node_modules.off portal/node_modules`.
  4. `node tooling/visual-regression/serve.mjs &` →
     `node tooling/studio-journey.mjs all` · `node tooling/build-journey.mjs all` (the /build
     wizard + share regression, AC #4) · `node tooling/vt-verify.mjs` · `node tooling/proto-journey.mjs chromium`
     (protos untouched — one engine as a canary).
  5. Manual: served `/factory` — watch the replay, answer cards, assemble the loop, verdict; check
     the dock mid-flow (saulera); reduced motion (macOS toggle) — assembly + redraft still complete;
     `/build` — wizard unchanged, share a build, open its link on `/factory`, cards populated
     without touching anything.
- **SATISFIES**: AC #4, #6, COMPLETION.

### Task 14 — VR baselines: factory ×2 + approach ×2

- **IMPLEMENT**: commit everything first; from a clean detached worktree under `/Users` (never
  /private/tmp — Docker file sharing): `cd tooling/visual-regression && npm run update:docker`.
  Expect churn: `factory` neutral+saulera (the band + the reworded panel note), `approach`
  neutral+saulera (loc-summary numbers). Commit the PNGs on the branch.
- **GOTCHA**: `update:docker` screenshots the DIRTY tree — hence the clean worktree (memory
  `vr-gate-reads-working-tree`). A sub-perceptual diff may need the PNG `rm`-ed to force the write
  (memory `vr-update-skips-subperceptual`). The gate captures under NO-preference reduced motion —
  the band must be at-rest-identical there (it is: cards enabled-at-settle is not motion-gated).
- **VALIDATE**: `npm run test:docker` (or the repo's gate run) green locally; after push,
  `gh pr checks` — the CI `visual` job is the truth (memory `local-agent-visual-gate-notes`:
  local macOS diffs are platform noise).
- **SATISFIES**: AC #6 (no regressions), gate note.

### Task 15 — Report, commit hygiene, PR

- **IMPLEMENT**: write `.claude/reports/studio-method-cards-hook-loop-214-report.md` (deviations,
  red-run proofs verbatim, the new journey pass counts ×3 engines, INP numbers for the two new
  rows). Commit plan + report in the PR. PR body: summary, validation table, `Closes #214`.
  Branch pushed, PR opened against `main`.
- **GOTCHA**: `Closes #214` in the BODY — a title mention closes nothing (memory
  `prs-dont-auto-close-tickets`).
- **VALIDATE**: `gh pr view --json body | grep -c "Closes #214"` → 1; `gh pr checks` all green.
- **SATISFIES**: process, COMPLETION.

---

## TESTING STRATEGY

No test suite — "run the surface you touched" (CLAUDE.md). The split:

**CI (blocking)**: build-checks (20 groups — the new method group + the untouched group 8 are the
load-bearing pair), drift checks (param-count, loc-summary), the visual job (regenerated baselines).

**Operator-run (recorded in the report)**: studio-journey all ×3 (methodPass + 2 INP rows + every
existing pass), build-journey all ×3 (/build regression), vt-verify ×3 (new factory sample),
proto-journey chromium (canary), the manual walkthrough.

### Edge Cases

- Dead pipeline / vacuous green: the new group's mutation case + the journey red-run proof (break
  the redraft, watch the named red) — memory `check-that-cannot-fail`.
- `?b=` restore with no interaction (the #193 mode): journey case + the `RENDER_SOURCES` pin.
- Wrong-stage placement: refused, announced, DOM untouched, console clean.
- Card interaction mid-replay: disabled — no redraft, no take-over, no second author.
- Unavailable replay artifact (404): `publishBoard(null)` still enables the cards — authoring from
  empty works (Task 4.3 wires `method.setEnabled(true)` on that path too).
- Declined (`?b=`) path: cards never disabled (mirror `studio.mjs:497-503`'s reasoning).
- Reduced motion: assembly + redraft complete with zero animation (CSS literal list + any
  `element.animate` behind `reduceMotion()`).
- The two ethics cards changed AFTER the verdict unlocked: verdict re-renders (it reads answers on
  every `"questions"` event once unlocked).

---

## VALIDATION COMMANDS

### Level 1 — syntax + purity
`node --check system/studio-method.mjs system/studio.mjs system/studio-compile.mjs system/build-questions.mjs tooling/build-checks.mjs tooling/studio-journey.mjs tooling/vt-verify.mjs` (run per file) ·
`node -e "import('./system/studio-method.mjs').then(m=>console.log(Object.keys(m)))"`

### Level 2 — committed gates (CI-shaped)
`node tooling/build-checks.mjs` · the SDK-free `mv portal/node_modules …` form ·
`node agent-layer/gen-param-count.mjs && git diff --exit-code system/param-count.json` (after regen: expect the +12 committed) ·
`node agent-layer/gen-loc-summary.mjs --check`

### Level 3 — cross-engine journeys (operator)
`node tooling/visual-regression/serve.mjs &` then:
`node tooling/studio-journey.mjs all` · `node tooling/build-journey.mjs all` ·
`node tooling/vt-verify.mjs` · `node tooling/proto-journey.mjs chromium`

### Level 4 — manual
Served `/factory`: replay → cards enable at settle → answer → board redrafts + provenance flips →
assemble loop → verdict unlocks → keep-rail share link → open on `/build` → wizard + board restored.
Reverse: `/build` share → `/factory?b=` → cards + verdict populated untouched.

### Level 5 — baselines + CI truth
`npm run update:docker` (clean worktree) → commit PNGs → push → `gh pr checks`.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — Ten method cards on the canvas; answering one visibly updates the artifact beside it in the same interaction (Tasks 4-7, journey card→artifact cases).
- [ ] AC #2 — Hook diagram assembles by pointer AND keyboard; each placement announced; verdict unlocks ONLY on completion (Task 5, group 20, journey diagram cases).
- [ ] AC #3 — Quadrant + frequency verdict read from `quadrantFor`/`frequencyVerdictFor` — no second copy (Task 5 `verdictFor`, group 20 identity assertions).
- [ ] AC #4 — /build wizard still works; share links restore in both directions (build-journey all + journey cross-restore case).
- [ ] AC #5 — `?b=` restore populates cards AND verdict with zero interaction (#193 mode) (seed + `RENDER_SOURCES`, journey case).
- [ ] AC #6 — build-checks group 8 green AND still proving the same thing (zero diff to group 8 and to `QUESTIONS`/`QUESTION_INPUTS`).
- [ ] AC #7 — every card control has a param-manifest entry (+12, counts regenerated).
- [ ] All validation commands pass; baselines regenerated; no regressions.

## COMPLETION CHECKLIST

- [ ] Tasks 1-15 in order, each validation immediately.
- [ ] Red-run proofs recorded verbatim in the report (group 20 mutation + journey redraft break).
- [ ] New journey pass counts ×3 engines recorded against the 298/294/294 baseline.
- [ ] `git branch --show-current` checked before every commit; staged by explicit path.
- [ ] Plan + report + (later) review artifact in the same PR; `Closes #214` in the body.

---

## RISKS VERIFIED AT PLANNING (2026-08-10 — read against `793a270`, all three checked in source)

1. **VR capture vs card enablement — SAFE, via synchronicity, NOT via ordering.** `settle()`
   (`replay-driver.mjs:643-657`) sets `[data-replay="settled"]` at `:648` and only THEN calls
   `onSettle(board)` at `:655` — the attribute write comes FIRST. What makes the capture
   deterministic anyway: the whole `settle()` body is one synchronous task, so the attribute and
   the cards' enablement become observable in the same frame — Playwright's waitReady cannot
   observe a mid-task DOM. The load-bearing consequence is Task 4's GOTCHA 1b: the enable must
   stay synchronous inside `publishBoard`. The running-page proof is Task 11's gating case
   (settled ⇒ enabled), which turns red if anyone ever defers it.
2. **`readBuild().source` restore discriminator — VERIFIED.** `state.source` exists and starts
   `null` (`build-questions.mjs:66-73`); `publishState` assigns the patch's source before
   dispatching (`:97-103`); `readBuild()` structuredClones the whole state; `restoreShared` runs
   `restoreBuild` before `mountStudioCore` (`studio.mjs:577-587`). No fallback needed — Task 5's
   seed logic keys off it as written.
3. **Journey pass-count baseline — VERIFIED.** `.claude/reports/studio-249-inp-gate-review-fixes-report.md:41`
   states **chromium 298/0 · firefox 294/0 · webkit 294/0** verbatim. Task 11 records new counts
   against these; do not chase older tables (286/282/282 is pre-#212/#249 and stale).

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption**: native radio arrow-key semantics satisfy the cards' keyboard path; the diagram's
  Tab+Enter satisfies its. No new roving-tabindex machinery.
- **Flagged, not blocking**: after this ticket, /build's wizard and the studio's cards coexist as
  two mounts. The epic's "the stepped wizard dies" is satisfied *in the studio*; actually removing
  /build is explicitly out of scope (PRD §1).

## NOTES (open canvas)

**Rejected: drag-based Hook assembly + a `ui.assemble` bus verb.** A drag path would diverge
pointer from keyboard and *then* the bus-as-drive-path pattern (studio-verbs) would be the right
shape — but select-then-place converges both inputs on `click` natively, which is exactly
`studio-flow.mjs:14-25`'s recorded reasoning for NOT inventing a verb ("one emitter + one consumer
invented for symmetry"). The three-source proof is likewise not owed: with no bus verb there is no
agent path to prove parity against (flow's precedent). If a future replay ever records method
answers, that's the day the verb and the third source arrive together.

**Rejected: redrafting through the replay driver's reflection.** The driver is a second AUTHOR for
the *committed run's* ops only; feeding it synthetic ops to animate a redraft would fabricate agent
output (honesty contract). The redraft is the visitor's, so it goes through the placement loop, not
the bus's `agent.*` half.

**Rejected: a new `BUILD_CHANGE` source value ("cards"/"method").** The documented enum is
`"questions" | "breadboard" | "import" | "restore"` and every consumer pattern-matches it. Cards ARE
a questions surface; the wizard and the cards being indistinguishable in the event stream is the
"second mount, never a second truth" property stated as data.

**Undo after redraft**: history entries hold dead wrapper ids; undo restores nothing visible. The
alternative (resetting history at redraft) needs a seam `studio-verbs.mjs` doesn't expose, and
adding one is a #205-surface change out of scope. Accepted; the journey does not assert undo across
a redraft; noted for a future ticket if it ever confuses a hallway test.

**Sequencing**: #215 (open) also regenerates factory baselines — do not run concurrently (its own
plan carries the same warning). This ticket's baselines are regenerated LAST (Task 14) to keep the
window small.

**Line-number drift**: all citations are against `main` at `793a270`. If implementation starts
after further merges, re-verify the studio.mjs anchors first (`:378`, `:400`, `:424`, `:473`,
`:497`, `:540`) — the surrounding comments are distinctive enough to re-find.

## AMENDMENTS

- (none yet)
