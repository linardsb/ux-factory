# Feature: /build View Transition morphs + inspect mount + copy cut (ticket #171 — the VT × VR spike)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, tokens and ids. Import from the right files. All line numbers cite origin/main at `0224953`.

## Feature Description

/build — the strongest tool page — gets same-document `startViewTransition` morphs on its three key
state-change families (wizard step progression, breadboard edit verbs, board→rendered-pattern),
an inspect-engine mount over its surfaces, and a dual-register copy cut on build.html's static
sections. All open risks were resolved with evidence at planning time (see NOTES §De-risk pass).
This ticket is ALSO the epic's mandated spike: it must answer, empirically, whether
`startViewTransition` interacts safely with the VR gate's `animations:'disabled'` capture — the
finding gates #172's site-wide rollout and is recorded in the execution report.

## User Story

As a hiring manager reading /build in a 90-second pass
I want state changes to morph under my cursor, any rendered component to explain itself on hover, and every section to open in plain English
So that the page feels like the working prototyping tool it claims to be, verifiable rather than asserted.

## Problem Statement

/build deliberately has "no entrance animations anywhere" (build.html:574–577) because the board
rebuilds on every edit — so every state change today is a hard cut. Its rendered `ds-*` primitives
are in `inspect-data.json` (added by #184) but nothing on the page is instrumented and inspect.mjs
isn't loaded. Several sections open with unexplained specialist terms (DTCG, Hooked, Shape Up,
Appetite, vocabulary-validated), and the hero stamp says "the four acts" on a six-act page.

## Solution Statement

A tiny shared `system/morph.mjs` helper (feature-detect + reduced-motion off-ramp + cross-module
re-entrancy guard) wraps exactly three interaction-driven mutation families, mirroring the proven
dock.mjs/spine.mjs idiom. Scoped `view-transition-name`s / `view-transition-class` (at-rest
render-inert) turn the default root crossfade into element-level morphs with spring easing on the
group animations. Inspect mounts land as static `data-inspect` ids on components genuinely styled
by existing consumer blocks, plus JS-applied ids on the late-rendered pattern primitives, wired
through a new `refreshInspect()` re-scan API in inspect.mjs. The copy cut touches build.html's
static leads only. The VR spike runs as a two-stage proof (copy-cut baselines first, then VT added
with a plain `npx playwright test` — green = VT adds zero pixels).

## Out of Scope / Non-Goals

- **Not touching `system/build-keep.mjs` at all** (de-risk decision): the keep tiers already have their own #138-hardened `@starting-style` rise-in (build.html:539–553) whose non-re-entrance depends on `hidden` re-assignment not being a display change, and the `[hidden]` guard must win instantly on exit. Wrapping the bare↔non-bare flip in a VT is the only place a live-capture crossfade could fight that entrance, and the keep rail is not one of the ticket's three AC morph families. The ticket's files-touched line ("build-keep.mjs (transition wrappers only)") was an estimate; zero wrappers is the safe reading. The keep rail still participates visually when a board commit's transition captures its synchronous update — without any code change here.
- **Not touching** `system/analytics.mjs`'s flipTo/restore machinery (PR #162, collision-sensitive) — `trackBuildPattern()` stays the LAST line of `renderPattern`, after the DOM insert.
- **Not wrapping renames in VT**: `renamePlace`/`renameAffordance` deliberately skip `render()` to protect the caret (breadboard.mjs:265–267) — nothing to morph, and per-keystroke snapshots are exactly what the module refuses. Same for pattern re-renders whose identity didn't change (keystroke publishes render instantly).
- **Not modifying** `system/agentic-renderer.mjs` (shared, vocabulary-validated) — pattern-render tags its own output after `renderComposition`.
- **No inspect entries for bx- bespoke surfaces** (wizard cards, board places): inspect-data is generated from system-graph consumer blocks (components.css); bx- styles live in build.html's `<style>` and aren't graph consumers. Inventing entries would break the honesty contract. "Inspect mount over /build's surfaces" = the chrome (already auto-tagged by site.js), the stage's real `.card`/`.btn` components, the hero, and the rendered `ds-*` primitives.
- **Not cutting JS-generated copy** (wizard prompts, verdict strings, `streamNote`, `specMarkdown`) — `streamNote`/`specMarkdown` are asserted verbatim by tooling/build-checks.mjs; the ticket scopes the cut to build.html.
- **Not rolling VT out beyond /build** — that's #172, gated on this spike's findings.
- **Cross-document VT untouched** (portfolio.css:43–70 already handles page navigation).

## Feature Metadata

**Feature Type**: Enhancement (+ spike)
**Estimated Complexity**: Medium-High (three interacting concerns × two fragile gates; all planning-time risks resolved with evidence — see NOTES §De-risk pass)
**Primary Systems Affected**: /build chain (build.html, build-questions.mjs, breadboard.mjs, pattern-render.mjs), inspect.mjs, param-manifest, VR baselines (build-keep.mjs deliberately untouched)
**Dependencies**: none new — native View Transitions API (Chrome 111+/Safari 18+/Firefox 144+, Baseline Newly available)

## Related Work

**Implements**: [#171](https://github.com/linardsb/ux-factory/issues/171) — PR body must carry `Closes #171` · **Epic**: #164, `docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` (§Risks: this ticket IS the VT × VR spike; §Browser-support policy: baseline + progressive extras)

**Back-references**:
- `.claude/plans/home-uplift-169.md` — Why: sibling wave ticket; its Phase-5 regen cascade and two-stage VR proof are mirrored here.
- `.claude/plans/inspect-engine-166.md` / `.claude/plans/spring-motion-foundation-165.md` — Why: the primitives this ticket mounts/applies.

**Forward-references**:
- #172 (View Transitions site-wide) — consumes this spike's findings + the `system/morph.mjs` helper.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/dock.mjs` (lines 253–266) — Why: the house `startViewTransition` idiom to mirror: feature-detect + `matchMedia("(prefers-reduced-motion: reduce)")` bail, `vt.ready.catch(()=>{})`, `vt.finished.catch(()=>{})`, settled = `(vt.updateCallbackDone || vt.finished).catch(()=>{})` (Firefox rejects `.ready` on skip). Also `system/spine.mjs:190–196` (`crossfade(mutate)` shape).
- `system/build-questions.mjs` (lines 439–485 renderStep + :467/:475 Back/Next handlers, :480 `wizardEl.replaceChildren`, :481–484 focus-after-insert rule, :401–409 advanceTo, :494–500 BUILD_CHANGE listener, :95–102 publishState, :551–558 verdict) — Why: the act-progression mutation site. Focus MUST stay after the swap → inside the morph callback.
- `system/breadboard.mjs` (lines 200–217 announce+commit, :221–353 the verbs, :259–314 renames [DO NOT WRAP], :318–331 startConnect/cancelConnect, :545–580 render + applyPendingFocus, :649–694 BUILD_CHANGE listener + mount) — Why: the edit-verb funnel; `applyPendingFocus` runs as render()'s last step and must run inside the callback.
- `system/pattern-render.mjs` (lines 207–242 render + listener, :236 `data-pattern-stage="ready"`, :244–253 IO-gated loadVocab, :182–204 renderPattern with `trackBuildPattern()` last, :104–109 stage-node-persistence comment) — Why: board→pattern mutation site; the discriminator and inspect-refresh hook land here.
- `system/build-keep.mjs` (lines 296–340 update(), :307–310 hidden flips, :539–553 in build.html for the rise-in) — Why: read to CONFIRM it needs no change and to avoid breaking its invariants from the outside; this ticket does not modify it (see Out of Scope).
- `system/build-import.mjs` (lines 104–110 `stages` captured once) — Why: never clone/recreate `[data-build-stage]`/`[data-pattern-stage]` nodes.
- `system/inspect.mjs` (whole file, 276 lines; esp. :182–204 wireTriggers + unknown-id abort, :224–250 setInspect with `if (next === on) return`, :77 global `dismissed`, :265–274 handle) — Why: the re-scan API and the M3 dismissed-flag fix land here.
- `system/inspect-data.json` — Why: the exact ids. /build's primitives are `ds-metric-tile-cross-scenario-library-primitive`, `ds-list-row-cross-scenario-library-primitive`, `ds-sequence-step-cross-scenario-library-primitive` (long system-graph consumer ids, NOT `metric-tile`). An unknown id aborts the whole activation at runtime.
- `index.html` (lines 53, 67, 111, 131, 415) — Why: #184's mount pattern — static `data-inspect`, the `[data-inspect-toggle]` button markup, the script tag.
- `build.html` (lines 574–599 motion block + no-entrance rule, :539–553 keep entrance, :609–637 hero, :651–658 Act 00 lead, :749–758 Act 01, :785–792 Act 02, :814–824 Act 03, :859–872 Act 04, :697–722 stage samples, :932–948 script tags) — Why: copy-cut targets + where the VT CSS and script tag go.
- `system/tokens.contract.css` (lines 75–89) — Why: real token names — `--motion-ease-spring` / `--motion-ease-settle` / `--motion-ease-bounce`, `--motion-base` 200ms, `--motion-slow` 480ms. (Ticket text says "--ease-spring-*"; the shipped names carry the `--motion-` prefix.)
- `portfolio.css` (lines 43–70) — Why: existing `view-transition-name: site-header/page-title/nav-active`, `::view-transition-old/new(root)` durations, and the reduced-motion VT kill (:65–70) that already backstops same-doc transitions.
- `tooling/build-checks.mjs` (header lines 8–10, imports :47–56) — Why: Node-imports build-questions/breadboard/pattern-render/build-keep top-level. **Any top-level `document` reference (including a feature-detect) breaks CI** — detects live inside function bodies.
- `tooling/build-journey.mjs` (lines 92–96 settle, :101–136 checks 1–3, :406–446 dock 250ms sleeps, :640–669 reduced-motion run [16], :671–984 analytics timing [17c/d], :986–995 console cleanliness [18]) — Why: what a morph could break; [18] fails on any unhandled TypeError.
- `tooling/visual-regression/visual.spec.mjs` (lines 54–68 /build spec + waitVisible comment, :128–174 fixpoint loop) + `playwright.config.mjs` (:15 reducedMotion, :21 animations:'disabled') — Why: the spike's subject.
- `tooling/drift-check.mjs` (lines 96–117 checkInspectMounts) — Why: statically resolves every tracked-HTML `data-inspect` id; JS-injected ids escape it (same-commit rule).
- `system/param-manifest.json` ($description + the 28 `/build` entries) — Why: the inspect toggle is a countable control (mirror #184's line-30 entry); VT morphs add no entry (nothing reader-operated).
- `.claude/code-reviews/pr-180-review.md` (lines 84–85) — Why: the M3 latent defect this ticket fixes (Esc-dismissed bubble reshows from an unrelated trigger's hover; fix = `dismissedTrigger` reference, rearm only when `focusTrigger !== dismissedTrigger`).

### New Files to Create

- `system/morph.mjs` — ~35-line hand-written canon helper: `morph(mutate)` → settled Promise. Feature-detect + reduced-motion + module-level `active` re-entrancy guard (cross-module: a breadboard commit's transition must not be skipped by pattern-render's nested call — per spec a nested `startViewTransition` skips the active one). No top-level `document` refs (Node-import-safe). Header cites epic #164 ticket #171 + this plan.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [MDN — Document.startViewTransition()](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) — update-callback semantics (runs async after snapshot; DOM state after callback is the "new" capture; nested call skips the active transition).
- [web.dev — same-document view transitions are Baseline](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available) — Firefox 144 ships `startViewTransition`, `view-transition-name`, `view-transition-class`, `:active-view-transition`; NO view-transition *types* in Firefox — don't use types.
- [Chrome — view transitions 2025 update](https://developer.chrome.com/blog/view-transitions-in-2025) — `view-transition-class` for styling many groups with one rule (Chrome 125/Safari 18.2/Firefox 144; unsupported engines just fall back to default easing — graceful).
- Playwright `animations:'disabled'` (config expect option): stops CSS animations/transitions/Web Animations; finite ones fast-forwarded at screenshot time. Whether it reaches `::view-transition-*` pseudo animations under Playwright 1.61 is UNDOCUMENTED — that is the spike question; do not assume, measure (Phase 6).

### Patterns to Follow

**The VT idiom (dock.mjs:253–266, adapted into morph.mjs):**
```js
// system/morph.mjs — same-document view-transition wrapper (epic #164 ticket #171; …)
let active = false;
export function morph(mutate) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (active || reduce || !document.startViewTransition) { mutate(); return Promise.resolve(); }
  active = true;
  const vt = document.startViewTransition(mutate);
  vt.ready.catch(() => {});                       // Firefox rejects .ready on skip
  vt.finished.catch(() => {}).finally(() => { active = false; });
  return (vt.updateCallbackDone || vt.finished).catch(() => {});
}
```
(All globals referenced inside the function body only — build-checks Node-imports the consumers.)

**Interaction-driven only:** wrappers sit in click/verb handlers, never in mount seeds or the
BUILD_CHANGE restore path — boot must never morph (VR + share-restore both load-time).

**Focus/announce ordering:** everything that today runs after the DOM swap (renderStep's
`promptEl.focus()`, breadboard's `applyPendingFocus`, `announce`) moves INSIDE the morph callback —
the callback runs one frame later and focusing a not-yet-inserted node is a no-op.

**File headers:** match the exact convention, e.g. `// system/morph.mjs — … (epic #164, ticket #171; .claude/plans/build-vt-morphs-171.md).`

**Copy register:** dual-register = 1–2 plain sentences first, precise term kept immediately beside
(see approach.html + #169's rewrites). Every rewritten line passes `/no-ai-slop` + `/humanizer`.

---

## IMPLEMENTATION PLAN

### Phase 1: Branch + morph helper
Branch `feature/build-vt-morphs-171` off fresh `origin/main` (worktree currently sits on stale
`feature/command-palette-168`; shared-worktree memory — verify branch immediately before every commit).
Create `system/morph.mjs`.

### Phase 2: The three morph families
**Depends on:** Phase 1.
Wire `morph()` into build-questions (Next/Back), breadboard (commit + startConnect/cancelConnect/redraft),
pattern-render (identity-change discriminator), build-keep (tier-visibility flip only). Add the
scoped `view-transition-name`/`view-transition-class` CSS + spring easing to build.html's style block.

### Phase 3: Inspect mount
**Independent of:** Phase 2 (parallel-safe; different concerns in mostly different lines).
`refreshInspect()` + M3 fix in inspect.mjs; static mounts + toggle + script tag in build.html;
JS tagging + refresh call in pattern-render; param-manifest entry.

### Phase 4: Copy cut
**Independent of:** Phases 2–3.
Dual-register rewrite of build.html's flagged leads; `/no-ai-slop` + `/humanizer` over every rewritten line.

### Phase 5: Gates + cross-engine functional pass
**Depends on:** Phases 2–4.
build-checks, build-journey all three engines, drift-check, generator regens (param-count, loc-summary).

### Phase 6: VR spike (two-stage) + baseline regen
**Depends on:** Phase 5 (regens must be committed — the gate reads the working tree).
Stage A: regen churned baselines. Stage B: plain `npx playwright test` — green proves the morphs
add zero at-rest pixels. Record the spike verdict for #172.

---

## STEP-BY-STEP TASKS

### CREATE system/morph.mjs

- **IMPLEMENT**: the helper exactly as in Patterns above; export `morph` only. ~35 lines with header + comments explaining the `active` guard (nested `startViewTransition` would SKIP an in-flight transition, so a morph requested inside another's update callback runs instantly instead).
- **GOTCHA**: no top-level `document`/`matchMedia` references — build-checks Node-imports every consumer.
- **VALIDATE**: `node -e "import('./system/morph.mjs').then(m => console.log(typeof m.morph))"` → `function`
- **SATISFIES**: AC #1 (guard + fallback + off-ramp)

### UPDATE system/build-questions.mjs — wrap step progression

- **IMPLEMENT**: `import { morph } from "./morph.mjs";`. In the Back handler (:467) and Next handler (:475), replace `renderStep(true)` with `morph(() => renderStep(true))`. Leave untouched: the mount seed `renderStep(false)`, the BUILD_CHANGE listener's `renderStep(false)` (:499, share-restore), `advanceTo` (scroll+focus, no mutation — the act boundary stays a scroll), `mountVerdict` (re-renders instantly; it repaints on radio change, not on Next).
- **PATTERN**: renderStep already puts focus after `replaceChildren` (:480–484) — by wrapping the whole call, both stay inside the update callback in their existing order.
- **GOTCHA**: `publishState` re-entry is impossible here (Next/Back don't publish), but the answers radio handler must NOT be wrapped — per-answer publishes cascade to pattern/board and are not in the ticket's three families.
- **VALIDATE**: `node tooling/build-checks.mjs` (groups import this module — proves Node-import safety) + manual: `npx serve .`, click Next in Chrome → card morphs, focus lands on the prompt.
- **SATISFIES**: AC #1 family 1, AC #3

### UPDATE system/breadboard.mjs — wrap edit verbs

- **IMPLEMENT**: `import { morph } from "./morph.mjs";`. `commit` (:211–217) becomes:
  ```js
  function commit(message, focus) {
    edited = true;
    pendingFocus = focus;
    morph(() => { render(); publish(); announce(message); });
  }
  ```
  (publish inside the callback → the same transition captures pattern/verdict/keep's synchronous listener mutations; announce inside to keep the render→publish→announce order.) `startConnect` (:318) and `cancelConnect` (:325): wrap their `render()` in `morph(() => render())`. `redraft` (:353): wrap its `render(); publish(); announce(...)` tail the same way as commit.
- **GOTCHA #1**: DO NOT touch `renamePlace`/`renameAffordance` — they skip render() by design (caret protection, :265–267).
- **GOTCHA #2**: DO NOT wrap the BUILD_CHANGE listener paths (:649–681) — restore fires at page load and questions-driven redrafts are cross-module cascades, not board verbs.
- **GOTCHA #3**: `drawLines()` reads `getBoundingClientRect` inside render() — inside the update callback layout is already committed for the new state, so line geometry is correct.
- **GOTCHA #4**: the `[data-bb-live]` region lives OUTSIDE the re-rendered subtree (build.html:837) — announce still works during a transition; verify with VoiceOver or by asserting `liveEl.textContent` in the journey.
- **VALIDATE**: `node tooling/build-checks.mjs` + manual: add/remove a place in Chrome → remaining places slide (not crossfade), focus lands per the verb's contract.
- **SATISFIES**: AC #1 family 2, AC #3

### UPDATE system/pattern-render.mjs — identity-change morph + tracker safety

- **IMPLEMENT**: `import { morph } from "./morph.mjs";`. `render()`'s branch structure (:210–237, verified) yields the identity key directly — compute it right after `pattern`/`composition` are known, one literal per branch taken:
  `"empty"` (both renderEmpty sites) · `` `out:${id}` `` · `"unavailable"` · `` `pat:${id}:${composition.children.length}` `` · `` `ref:${id}` `` (the catch → renderRefusal path).
  Keep a module-level `prevKey = null`. If `prevKey === null` (first render, incl. share-restore boot) or key unchanged (keystroke renames), run the branch directly; else `morph(() => branchCall())`. Set `prevKey = key` after every render. The vocab-loading early `return` (:227) writes no key.
- **PATTERN**: the mutation body is the existing branch dispatch (:210–237); `root.dataset.patternStage = "ready"` (:236) stays at the end of the mutation, inside the callback.
- **GOTCHA #1**: `trackBuildPattern()` must remain the LAST line of `renderPattern` (:198–204), inside the callback — after the DOM insert, exactly as today. Never move it before or outside.
- **GOTCHA #2**: when a board commit already opened a transition, `morph`'s `active` guard makes this render instant *inside that same transition* — correct and required.
- **GOTCHA #3**: never replace the `[data-pattern-stage]` element itself — `build-import.mjs` captured it once (:104–110); only `replaceChildren` inside it (unchanged behaviour).
- **VALIDATE**: `node tooling/build-checks.mjs` (group 3 imports `compose`/`streamNote` from here) + manual: change the shape answer → pattern morphs; type in a place name → pattern updates with NO morph.
- **SATISFIES**: AC #1 family 3, AC #3, AC #5

### DO NOT MODIFY system/build-keep.mjs (decision, not an omission)

- The keep rail gets no wrapper — rationale in Out of Scope. Its update still runs synchronously inside a board commit's morph callback, so tier changes are captured by that same transition for free. Verify while implementing breadboard: empty the board inside Chrome with morphs live → tiers hide cleanly, `[hidden]` wins instantly (journey [1]/[15] assert this too).

### UPDATE build.html — VT names + spring easing CSS

- **IMPLEMENT**: in the existing `<style>` near the motion block (:578–599), add:
  1. `[data-pattern-stage] { view-transition-name: bx-pattern; }`
  2. `@media (prefers-reduced-motion: no-preference) { ::view-transition-group(bx-pattern), ::view-transition-group(bx-q-hooked), ::view-transition-group(bx-q-shaping), ::view-transition-group(*.bb-place) { animation-duration: var(--motion-base); animation-timing-function: var(--motion-ease-settle); } }` — settle on structural moves; optionally `--motion-ease-spring` on `*.bb-place` groups (things you touch may overshoot ~1.9%).
  In JS: renderStep's card gets `card.style.viewTransitionName = "bx-q-" + act` (two wizards coexist in the DOM — duplicate names ABORT the whole transition, so per-act names are mandatory); breadboard's `render()` gives each place `el.style.viewTransitionName = "bb-place-" + place.id` and `el.style.setProperty("view-transition-class", "bb-place")` — place ids verified stable and unique (`"p1"`, `"p2"`, … from `nextId` over the taken-id set, breadboard.mjs:124/:226; removal frees the id only after the element is gone, so no duplicate names can coexist in a snapshot).
- **PATTERN**: portfolio.css:43–70 (existing names + the reduce kill at :65–70 which already blankets these new pseudos — belt and braces with morph()'s off-ramp).
- **GOTCHA**: `view-transition-name`/`-class` have ZERO render effect at rest — this is what makes AC #2 satisfiable. `view-transition-class` unsupported (Safari 18.0–18.1) degrades to default easing, never breaks.
- **VALIDATE**: manual in all three engines (Phase 5 task below); at-rest proof is Phase 6 Stage B.
- **SATISFIES**: AC #1, AC #2, ticket "spring easing" bullet

### UPDATE system/inspect.mjs — refreshInspect() + the M3 dismissed fix

- **IMPLEMENT**:
  1. New function inside `initInspect`'s closure, exposed on the handle and re-exported like `getInspect`: `refreshInspect()` — if `!on` return; abort the current `activation`, `hide()`, then re-run the `mine = (activation = new AbortController()); fetchData().then(...)` block (extract that block into a named inner function `activate()` so `setInspect(true)` and `refreshInspect` share it verbatim).
  2. M3 fix (pr-180-review.md:84–85, still live at :77): replace `let dismissed = false` with `let dismissedTrigger = null`; Esc sets `dismissedTrigger = focusTrigger ?? lastShownTrigger`; `armHide`'s rearm condition becomes `focusTrigger && focusTrigger !== dismissedTrigger`; entering any trigger (`mouseenter`/`focusin`) clears `dismissedTrigger` only when it IS that trigger. Keep the reset on toggle-off.
- **PATTERN**: the existing activation block :240–250; palette.mjs:118's warning — never `initInspect()` unconditionally; `refreshInspect` is precisely the non-destructive alternative.
- **GOTCHA**: keep the unknown-id pre-validation abort (:184–187) — it's the honesty guard; /build only ever injects the three `ds-*` ids that exist in the data.
- **VALIDATE**: `node -e "import('./system/inspect.mjs').then(m => console.log(typeof m.refreshInspect))"` → `function` (Node-import safety); functional proof in the journey task.
- **SATISFIES**: AC #3, ticket "inspect mount" bullet; inherited-defect fix (flag in PR body)

### UPDATE build.html — inspect mounts + toggle + script tag

- **IMPLEMENT**:
  1. `<script type="module" src="/system/inspect.mjs"></script>` before palette's tag (:948) — mirror index.html:415.
  2. Static mounts, only where the id truly styles the element: `data-inspect="page-hero"` on the `.page-hero` section (:606); `data-inspect="cards"` on the two `.card` stage samples (:707, :712); `data-inspect="buttons"` on the `.bx-stage-actions` div's two `.btn`s (one mount on the wrapper is wrong — put it on each button, mirroring index.html:67–68) and on the Derive/Clear `.btn`s (:682, :686).
  3. One toggle button near the Act 04 pattern stage (where inspect pays off): `<button type="button" class="btn btn-secondary inspect-toggle" data-inspect-toggle aria-pressed="false">Inspect this surface</button>` — mirror index.html:131 exactly.
- **GOTCHA**: `tooling/drift-check.mjs` statically resolves every tracked-HTML `data-inspect` id — these five ids all exist in inspect-data.json, so the gate passes without regenerating anything.
- **VALIDATE**: `node tooling/drift-check.mjs` (inspect-mounts gate green)
- **SATISFIES**: AC #3 (drift-check runs in CI verify), ticket "inspect mount" bullet

### UPDATE system/pattern-render.mjs — tag primitives + refresh wiring

- **IMPLEMENT**: in `renderPattern` only, after `renderComposition(...)` inserts (:189) — verified: `renderOutOfLibrary` renders the board SVG + refusal card, no primitives. Class names verified against agentic-renderer.mjs:321/333/350: the renderer emits `ds-metric-tile` / `ds-list-row` / `ds-sequence-step` (a non-neutral tone appends ` is-<tone>`, which these class selectors still match). Tag them:
  ```js
  const INSPECT_IDS = [[".ds-metric-tile", "ds-metric-tile-cross-scenario-library-primitive"],
                       [".ds-list-row", "ds-list-row-cross-scenario-library-primitive"],
                       [".ds-sequence-step", "ds-sequence-step-cross-scenario-library-primitive"]];
  ```
  `for (const [sel, id] of INSPECT_IDS) root.querySelectorAll(sel).forEach(el => el.setAttribute("data-inspect", id));`
  Then, at the very end of `render()` (after the `ready` handle, still inside the mutation): `if (document.documentElement.dataset.inspectMode === "on") import("./inspect.mjs").then(m => m.refreshInspect?.());` (lazy, palette.mjs:118's idiom — zero cost while off).
- **GOTCHA #1**: the ids must be the LONG `ds-*-cross-scenario-library-primitive` forms — a typo aborts the whole activation at runtime and no static gate catches JS-injected ids (same-commit rule, site.js:41–43 precedent). Copy them from inspect-data.json, don't retype.
- **GOTCHA #2**: keep `trackBuildPattern()` last among renderPattern's statements; the tagging loop goes before it or in `render()`'s shared tail.
- **VALIDATE**: journey task below proves the rewire end-to-end.
- **SATISFIES**: AC #3, ticket "inspect mount over … rendered pattern components"

### UPDATE system/param-manifest.json + regen counts

- **IMPLEMENT**: one entry: `{ "page": "/build", "selector": "[data-inspect-toggle]", "label": "inspect-mode toggle", "note": "added by #166, counted here" }` (mirror #184's home entry). VT morphs add no entry (nothing reader-operated). Then `node agent-layer/gen-param-count.mjs` and `node agent-layer/gen-loc-summary.mjs` (morph.mjs is a new tracked runtime file — loc-summary counts tracked content; run AFTER staging the new file, per the loc-summary-counts-tracked-only memory).
- **VALIDATE**: `node agent-layer/gen-param-count.mjs --check && node agent-layer/gen-loc-summary.mjs --check`
- **SATISFIES**: AC #3 (CI verify drift-checks both), ticket "param-manifest entries" bullet

### UPDATE build.html — dual-register copy cut

- **IMPLEMENT**: rewrite these static leads so no section opens with an unexplained specialist term; keep the precise term immediately beside its plain sentence:
  - :609 stamp "The builder · the four acts" → fix the count (six acts, 00–05) — factual bug.
  - :655–658 Act 00 lead — "DTCG" gets a plain lead ("the W3C community format design tools export tokens in — **DTCG**" register).
  - :753–758 Act 01 lead — "Nir Eyal's Hooked model" / "Manipulation Matrix" get one plain sentence first (what the seven questions do for the reader).
  - :789–792 Act 02 lead — "Shape Up" / "Appetite" / "no-go": lead plain ("how big this is allowed to get, as a budget you set rather than an estimate"), keep the terms.
  - :814–815 Act 03 heading area — heading leads with "breadboard"/"affordances"; the lead (:818–824) already defines them, so restructure so the plain sentence comes first, jargon kept beside.
  - :864–872 Act 04 lead — "vocabulary-validated renderer" / "generated component vocabulary" / "ds- primitives" get a plain first sentence.
  - Leave alone: hero-sub (:612–618, already plain-led), caps chips, Act 05 (:899–903, already plain), no-JS fallbacks, all JS-generated strings.
- **PROCESS**: run the `/no-ai-slop` and `/humanizer` skills over every rewritten line before committing (epic rule, AC of every wave ticket).
- **GOTCHA**: every changed at-rest line churns the /build baselines — that's expected and handled in Phase 6; do NOT touch `streamNote`/`specMarkdown` wordings (build-checks asserts them).
- **VALIDATE**: `grep -n "four acts" build.html` → no match; read each act's first rendered sentence aloud — no cold jargon (AC #4).
- **SATISFIES**: AC #4

### UPDATE tooling/build-journey.mjs — one focused inspect/rewire check

- **IMPLEMENT**: a new check (mirror an existing group's shape) on chromium: load /build, `settle()`, click `[data-inspect-toggle]`, assert `documentElement.dataset.inspectMode === "on"`; hover/focus a `.ds-metric-tile[data-inspect]` → assert `#inspect-bubble` becomes visible with token rows; then drive one board edit (re-render), wait for the stage text update, hover a freshly rendered tile → assert the bubble opens again (proves `refreshInspect` re-wired — the check-that-cannot-fail memory: run the function, don't grep it). Toggle off at the end (localStorage cleanliness for later checks).
- **GOTCHA**: run it before the analytics timing checks [17c/d] or in its own context — don't perturb their in-page clocks.
- **VALIDATE**: `node tooling/build-journey.mjs chromium`
- **SATISFIES**: AC #3, AC #1 (functional proof)

### RUN Phase 5 gates + cross-engine pass

- **IMPLEMENT**:
  1. `node tooling/build-checks.mjs` — all 10 groups green (also proves Node-import safety of every wrapper).
  2. `node tooling/build-journey.mjs all` — chromium + firefox + webkit; [16] proves the reduced-motion instant path, [18] proves no engine throws on the feature-detect. Bundled browser versions verified from `tooling/visual-regression/node_modules/playwright-core/browsers.json`: **chromium 149, firefox 151.0, webkit 26.5** — all three support same-document View Transitions (Firefox needs ≥144), so the journey exercises the REAL morph path on every engine, not the fallback.
  3. Manual cross-engine motion verify (memory: cross-engine-motion-verify): `python3 -m http.server` or `npx serve .`, drive Chrome + Firefox ≥144 + Safari (webkit) by hand or via the Playwright resolved from tooling/visual-regression/node_modules — confirm morphs visible in all three, reduced-motion (OS setting) disables, and the dock mid-flow (journey [7]'s 250ms windows) still passes.
- **GOTCHA**: journey [7]'s fixed 250ms sleeps around the dock are the tightest timing — #171 doesn't wrap the dock, but a board morph left running when [7] starts could overlap; if [7] flakes, re-run stashed HEAD first (build-journey-failure-vs-flake memory) before diagnosing.
- **VALIDATE**: all three commands above exit 0.
- **SATISFIES**: AC #1, AC #3

### RUN Phase 6 — VR two-stage spike + baseline regen

- **IMPLEMENT** (mirrors home-uplift-169's proven shape):
  - **Stage A (regen the copy-churned baselines):** commit everything; from a clean detached worktree under /Users (not /private/tmp — Docker file-sharing), `rm tooling/visual-regression/baselines/build-{neutral,saulera}.png` and — because the param-count total and possibly loc-summary's rounded numbers changed — `rm .../approach-{neutral,saulera}.png`; then `cd tooling/visual-regression && npm run update:docker`; verify `git status` shows EXACTLY those 4 PNGs changed (any other churned PNG = an unintended at-rest change — stop and diagnose). Commit the baselines.
  - **Stage B (the spike proof):** same worktree, `npx playwright test` via update:docker's docker line WITHOUT `--update-snapshots` (i.e. a plain gated run). **Green = the morphs + VT names + pseudo-element CSS add zero at-rest pixels under `animations:'disabled'`** — the empirical spike answer. If red on /build only: capture the diff artifacts, and bisect by temporarily commenting the `view-transition-name` CSS vs the JS wrappers to isolate which layer leaks pixels; the pre-authorized fallback is scoping names tighter or dropping the keep-flip wrapper — the wrappers themselves are interaction-driven and cannot run during capture (the gate performs no clicks), so at-rest leakage can only come from the CSS layer.
  - **Record the spike output** in `.claude/reports/build-vt-morphs-171-report.md` AND the PR body, explicitly addressed to #172: (a) whether Stage B was green first try; (b) the mechanism finding — the gate performs zero interactions, so interaction-driven `startViewTransition` never runs during capture; boot-time transitions are the only VR-reachable hazard and #172 must keep its wrappers interaction-driven (dock switch, wizard steps) and never morph on restore/boot; (c) whether Playwright 1.61's `animations:'disabled'` was ever observed engaging with a VT (e.g. if any capture raced one); (d) the approach-baseline cascade observed.
- **GOTCHA**: the gate reads the working tree — commit BEFORE regenerating (vr-gate-reads-working-tree memory). `maxDiffPixels:100` can swallow small copy changes — the `rm`-first step defeats the skip, and eyeball the new /build PNGs to confirm the copy cut actually landed in them (vr-tolerance-hides-text-changes memory). The approach countUp flake (vr-gate-approach-countup-flake memory): an approach "two consecutive stable screenshots" failure is a known local flake, retry before diagnosing.
- **VALIDATE**: Stage B run exits 0; `git status` clean except intended files.
- **SATISFIES**: AC #2, ticket SPIKE OUTPUT bullet

### FINAL — commit discipline + PR

- Verify branch (`git branch --show-current` → `feature/build-vt-morphs-171`) immediately before each commit; stage by explicit path (shared-worktree memory). Atomic commits per phase. PR body carries **`Closes #171`** (a title "(#171)" closes nothing — prs-dont-auto-close-tickets memory), the spike findings section, and the plan/report/review artifacts committed in the same PR.

---

## TESTING STRATEGY

No suite exists (repo rule) — "done" = run the surface you touched, plus the two committed /build gates and the VR gate.

### Unit-level (build-checks)
`node tooling/build-checks.mjs` — groups 1–3/6 exercise pattern-render's pure exports; the run itself proves every touched module still Node-imports (the wrappers add `document` references — they must all live inside function bodies).

### Integration (build-journey, 3 engines)
`node tooling/build-journey.mjs all` — pre-existing checks [1]–[18] cover every morph path's END state (wizard Next [3], board verbs [4d]/[5], share round-trip [6], reduced-motion whole-journey [16], console cleanliness [18] = no feature-detect throws on any engine). Plus the new inspect/rewire check.

### Edge Cases
- Rapid successive board edits: second edit inside the first transition's ~200ms → `active` guard makes it instant, no skip-storm; assert board state correct after a 3-fast-clicks sequence (manual).
- Share-restore boot (`?b=`): no morph fires at load (restore path unwrapped, pattern first-render `prevKey === null` → instant) — journey [6] fresh-context restore covers the end state.
- Keystroke rename while pattern visible: pattern re-renders with NO morph (identity key unchanged) and NO caret loss (rename path untouched) — journey [5] covers.
- Inspect toggled on before the pattern exists (persisted-on + fast scroll): the IO fetch → render → `refreshInspect` wires the late nodes — the new journey check covers.
- Esc-dismiss then hover another trigger (M3): bubble must NOT reshow on the dismissed trigger — manual keyboard pass on /build.
- Empty board (journey [15]): keep tiers hide via untouched build-keep code, inside the board commit's transition; `[hidden]` invariant check [1] still green.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Node-import safety
```
node tooling/build-checks.mjs
node -e "import('./system/morph.mjs').then(m=>console.log('morph:',typeof m.morph))"
node tooling/drift-check.mjs
```

### Level 2: Generators (drift)
```
node agent-layer/gen-param-count.mjs --check
node agent-layer/gen-loc-summary.mjs --check
node agent-layer/gen-inspect-data.mjs --check
```

### Level 3: Integration
```
node tooling/build-journey.mjs all
```

### Level 4: Manual
```
npx serve .    # /build in real Chrome, Firefox ≥144, Safari ≥18:
# morphs on Next/Back, add/remove place, shape-answer change; OS reduced-motion → instant;
# inspect toggle → hover a rendered tile → bubble with live token values; Esc dismiss semantics.
```

### Level 5: VR (the spike)
```
# after committing, from a clean detached worktree under /Users:
rm tooling/visual-regression/baselines/{build,approach}-{neutral,saulera}.png
cd tooling/visual-regression && npm run update:docker        # Stage A
# Stage B: same docker line with '--update-snapshots' removed → must be green
```

---

## ACCEPTANCE CRITERIA

- [ ] AC1 — morphs visible on all three families (wizard steps, board verbs, board→pattern identity change) in Chrome/Safari/Firefox 144+; instant swap under the guard elsewhere; reduced-motion disables (morph() bail + portfolio.css:65–70 kill).
- [ ] AC2 — VR gate green after regenerating only the copy/count-churned baselines (build ×2 + approach ×2); Stage B plain run proves morphs add zero at-rest change.
- [ ] AC3 — `node tooling/build-checks.mjs` all groups green; `node tooling/build-journey.mjs all` green.
- [ ] AC4 — no /build section opens with an unexplained specialist term; every rewritten line passed /no-ai-slop + /humanizer.
- [ ] AC5 — `[data-pattern-stage="ready"]` stays a waitVisible handle (never waitReady); all five waitReady handles untouched.
- [ ] SPIKE — findings recorded in the execution report + PR body, addressed to #172.
- [ ] param-manifest entry + regenerated param-count/loc-summary in the same PR.
- [ ] PR body: `Closes #171`; plan + report + review committed in the PR.

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's validation ran at the time.
- [ ] All Level 1–5 commands green.
- [ ] Cross-engine manual pass done (three real engines).
- [ ] `git status` clean; branch verified before every commit.
- [ ] Spike verdict written for #172.

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption (the one that remains):** "act→act progression" is satisfied by the wizard step-card morphs; the literal act boundary is a `scrollIntoView` (build-questions.mjs:401–409) with no DOM mutation — nothing to morph there. Flagging rather than inventing a scroll-driven transition.
- **Assumption (flagged inherited fix):** folding the M3 `dismissedTrigger` fix into inspect.mjs is in-scope because /build multiplies triggers and PR #180's review said it "must not survive into the first two-trigger page". If the owner prefers a separate PR, drop that task — everything else stands.
- All other planning-time risks were RESOLVED with evidence — see §De-risk pass below; none remain open.

## NOTES (open canvas)

**De-risk pass (2026-07-31, planning time — each former risk closed with evidence):**

1. *Bundled Firefox <144?* — RESOLVED: `tooling/visual-regression/node_modules/playwright-core/browsers.json` pins chromium 149.0.7827.55, **firefox 151.0**, webkit 26.5. All three journey engines run the real morph path.
2. *ds-\* class names an assumption?* — RESOLVED: agentic-renderer.mjs:321/333/350 emit `ds-metric-tile` / `ds-list-row` / `ds-sequence-step` (+ optional ` is-<tone>`); class selectors match regardless of tone. `renderOutOfLibrary` renders no primitives — tagging lives in `renderPattern` only.
3. *Stable ids for `view-transition-name`?* — RESOLVED: places carry stable unique string ids (`"p1"`… via `nextId` over the taken set, breadboard.mjs:124/:226); no duplicate names can coexist in a snapshot.
4. *Keep-rail `@starting-style` × VT double-animation?* — RESOLVED BY DESIGN: build-keep.mjs is untouched (Out of Scope). The only surface where a VT could fight the #138 `[hidden]` instant-exit guard and the rise-in's non-re-entrance is removed from the diff; keep-tier changes are still captured for free inside a board commit's transition (synchronous BUILD_CHANGE dispatch).
5. *Pattern identity key shape underspecified?* — RESOLVED: `render()`'s verified branch structure (:210–237) gives one literal per branch (`empty` / `out:${id}` / `unavailable` / `pat:${id}:${children.length}` / `ref:${id}`); the vocab-loading `return` writes no key.
6. *journey [7] dock 250ms windows* — analysis, not a code risk: #171 leaves the dock alone; a residual build morph overlapping [7] would at worst be skipped by the dock's own `startViewTransition` (spec: new transition skips the in-flight one), which jumps it to its correct end state — [7] asserts end states, so no flake mechanism remains. The build-journey-failure-vs-flake memory still applies if anything red appears.

**Why a shared morph.mjs instead of the inline dock/spine idiom:** BUILD_CHANGE dispatch is
synchronous, so a board commit's update callback runs pattern-render's and build-keep's listeners
inside itself. If each module carried its own inline wrapper, pattern-render's nested
`startViewTransition` would SKIP the in-flight board transition (spec behaviour) and the board
morph would never show on exactly the edits that also change the pattern — the flagship moment.
One module-level `active` flag in a shared helper suppresses the nested call into a plain mutate,
so one coherent transition captures board + pattern + verdict + keep. #172 inherits the helper.

**Why per-family wrappers, not one wrapper at publishState:** the dispatch site would animate
every keystroke rename (publish flows through it) and would morph at boot/restore. Rejected.

**Why the pattern discriminator (prevKey):** pattern-render re-renders on EVERY publish including
per-keystroke renames (:241 unfiltered listener, by design per build.html:576–577). Identity-key
gating gives family 3 its morph exactly when the board names a different pattern/branch/slot-count
— which is the demo-able "the board renamed the pattern and the UI morphed" moment — while
keystrokes stay instant.

**Why the spike answer is expected green:** the VR gate performs zero interactions (load, resize
fixpoint, screenshot), the wrappers are interaction-driven, first-render is always instant, and
`view-transition-name`/`::view-transition-*` CSS is render-inert at rest. The residual empirical
questions Stage B settles: (a) does any at-rest CSS we add leak pixels, (b) does the fixpoint
resize loop ever trip a transition (it shouldn't — resizes don't call morph). This mechanism
analysis is itself the key finding for #172: keep wrappers interaction-driven; never morph on
boot/restore; at-rest CSS must stay pseudo-element-only.

**VT + `use.reducedMotion:'reduce'` in the gate:** memory (vr-gate-captures-no-preference) says
that emulation has been observed as a no-op here — so morph()'s matchMedia bail must NOT be relied
on for VR safety. The design doesn't rely on it: no interaction ⇒ no transition, regardless.

**journey [17c]/[17d] timing races:** untouched by design — no wrapper lands in analytics.mjs or
in any pushState path; the keep-rail wrapper wraps only the visibility flip, not the URL debounce.

## AMENDMENTS

<!-- append-only; newest at bottom -->
