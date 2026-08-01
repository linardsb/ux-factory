# Feature: View Transitions site-wide — remaining state morphs (#172)

The following plan should be complete, but validate documentation and codebase patterns and task
sanity before you start implementing. Pay special attention to naming of existing utils and the
per-file import constraints (trace-player.mjs must stay import-free).

> **ENTRY GATE — do this before Task 1.** This ticket depends on #171 (the View-Transitions × VR
> spike). At planning time (2026-07-31) #171 was **unstarted** — no branch, no PR, no report. Before
> implementing:
> 1. `gh pr list --search "171" --state merged` + read `.claude/reports/*171*` / the #171 PR body.
> 2. Extract: (a) the exact guard/off-ramp helper shape #171 landed (if it made a shared helper or a
>    different idiom than `spine.mjs:190`, mirror THAT); (b) the spike verdict on
>    `startViewTransition` × the VR gate's `animations:'disabled'` capture; (c) any mitigation.
> 3. If the spike found VR interference, inherit its mitigation verbatim and amend this plan
>    (AMENDMENTS section) before coding. If #171 is still unmerged, STOP — this ticket waits.

## Feature Description

Wrap the remaining JS-driven state swaps on shipped pages in same-document
`document.startViewTransition` so discrete state changes morph (crossfade) instead of snapping, in
engines that support it (Chrome 111+/Safari 18+/Firefox 144+), with an instant-swap fallback
elsewhere and a `prefers-reduced-motion` off-ramp. Every wrapper is mechanical — mutation → wrapped
mutation — with **zero behaviour change and zero at-rest change** (AC2: VR gate green with zero
baseline regeneration).

## User Story

As a hiring manager reading the portfolio,
I want state changes (wizard steps, trace stepping, study adjustments) to morph smoothly like a
real prototyping tool,
So that the site *feels* like the tool it describes rather than a document that snaps between
states.

## Problem Statement

Epic #164's thesis: the site claims to be a working tool but most state swaps snap. #171 proves the
morph pattern on /build; the other interactive surfaces (wizard, study, trace player) still snap.

## Solution Statement

Roll the #171-proven guard pattern out to the listed surfaces via thin per-call-site wrappers
mirroring the existing house idiom (`system/spine.mjs:190-196` `crossfade()` and
`system/dock.mjs:254-267`). All wrapped mutations are **user-interaction-triggered only** (click /
change / keydown), so the VR gate — which captures at-rest pages without interacting — never sees a
transition, which is what guarantees AC2 structurally.

## Out of Scope / Non-Goals

- **NOT touched (ticket-mandated):** `analytics.mjs` flipTo/restore machinery (collision-sensitive,
  PR #162) and `pack-boot.js` (pre-paint, no DOM yet).
- **Dock pack switch: already done.** `dock.mjs:254-267` has carried the full pattern since the v2
  motion phase (commit c7cf564): support guard, reduced-motion check, rejection swallowing
  (`vt.ready.catch` + `vt.finished.catch`), and the derived/imported inline-props re-read *inside*
  `swap()` (dock.mjs:237-242) — which is exactly the guard the `derived-pack-inline-vs-stylesheet`
  memory demands. Task 1 verifies parity with #171's pattern; expect **no code change**.
- **Handoff-viewer "navigation": no eligible swap exists.** `handoff-viewer.mjs` renders once per
  page load (handoff.html:196) and has no post-render state machine — no tabs, no stepping. The
  only post-render mutation is the copy-button label flip (line 249-261), which is a two-word text
  swap not worth a whole-page crossfade. **Document as a no-op in the report; change nothing.**
  (The ticket's file list over-estimated. **Owner confirmed this call 2026-07-31** at planning.)
- **NOT wrapped:** continuous-input paths — `factory-intake.mjs setAnswer()/run()` (fires on every
  colour-drag `input` tick; a VT per tick would thrash — memory `entrance-anim-continuous-rebuild`
  is the same class of trap), and `setScenario()` (rebuilds five regions *with* its own entrance
  animations via `run(true)`; a VT layered over a fresh entrance cascade double-animates — and the
  ticket lists "wizard steps" only. **Owner confirmed the exclusion 2026-07-31** at planning).
- **No `view-transition-name` CSS, no ::view-transition styling.** Default root crossfade only.
  Named-element morphs are #171's territory (/build); adding CSS here risks at-rest churn.
- **No new shared module.** A `system/morph.mjs` would add a file (loc-summary churn) and
  trace-player.mjs is contractually import-free ("No imports, no fetch" header, line 14). The
  helper is ~6 lines; replicate per file, exactly as spine.mjs and dock.mjs already do —
  UNLESS #171 landed a shared helper, in which case import it where imports are already allowed
  and inline it only in trace-player.
- **No param-manifest change.** Wrappers add zero new controls.

## Feature Metadata

**Feature Type**: Enhancement (mechanical motion wrappers)
**Estimated Complexity**: Low-Medium (the code is trivial; the discipline — Node-safety, VR
zero-churn, initial-mount exclusion — is the work)
**Primary Systems Affected**: `system/factory-intake.mjs`, `system/agentic-study.mjs`,
`system/trace-player.mjs`, `system/brand-import.mjs` (fallback path only); verify-only:
`system/dock.mjs`
**Dependencies**: none (native web platform). Depends on ticket #171's merged findings.

## Related Work

**Implements**: linardsb/ux-factory#172 · **Epic**: #164 —
`docs/epics/prototyping-feel-uplift.prd.md` + `.architecture.md` (§Browser-support policy,
§Risks/spikes both bind this ticket)

**Back-references**:
- #171's plan/report (entry gate — the proven pattern + spike verdict)
- `system/spine.mjs:190` crossfade + `system/dock.mjs:251-267` pack-crossfade — the pre-existing
  house idiom these wrappers mirror
- PR #162 review — why analytics flip/restore is untouchable

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `system/spine.mjs` (lines 185-196) — Why: the canonical 6-line `crossfade(mutate)` helper to
  replicate: guard + reduced-motion + `.finished.catch(() => {})`.
- `system/dock.mjs` (lines 226-290) — Why: the richest existing implementation (async update
  callback, `updateCallbackDone`, Firefox `.ready` rejection note at line 260-262). Task 1
  verifies it; do not rewrite it.
- `system/factory-intake.mjs` (lines 414-459 `renderWizard`, 435-448 Back/Next handlers, 267-306
  `run`/`setAnswer` — the do-NOT-wrap paths, 222 the Node-import document guard) — Why: the wizard
  step wrap sites; the focus-restore (`promptEl.focus()` line 458) must stay inside the wrapped
  mutation so focus lands synchronously with the DOM swap.
- `system/agentic-study.mjs` (lines 152-175 the four adjust verbs, 210-224 `pick` + initial
  `pick(entries[0], ...)` at line 224) — Why: wrap sites, and the initial-mount call that must NOT
  be wrapped.
- `system/trace-player.mjs` (lines 177-222: `apply`/`next`/`prev`/`revealAll` + autoplay timer;
  header lines 14-17: the import-free constraint) — Why: step wrap sites; `scrollIntoView` stays
  OUTSIDE the mutation callback; autoplay ticks call the same wrapped `next`-equivalent.
- `system/brand-import.mjs` (lines 264-302 `wearIt`) — Why: home re-skin. The primary path already
  delegates the VT to the dock via `PACK_REQUEST_EVENT` (line 277-282); only the un-claimed /
  storage-refused fallback (lines 288-291) applies directly with no transition.
- `docs/epics/prototyping-feel-uplift.architecture.md` (lines 33-41, 67-92) — Why: browser-support
  policy + the VR constraints + the spike definition this ticket inherits.
- `tooling/build-checks.mjs` (lines 1-20) — Why: the Node-import-safety contract shipped modules
  must keep ("DOM references inside function bodies").

### New Files to Create

- **None.** (Deliberate — see Non-Goals. Report + review artifacts per repo convention:
  `.claude/reports/view-transitions-sitewide-172-report.md`, plan committed in the same PR.)

### Relevant Documentation

- [MDN: Document.startViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)
  — same-document form; the update callback runs synchronously after old-state capture.
- [MDN: ViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition) —
  `finished`/`ready`/`updateCallbackDone` semantics; a skipped transition **rejects** `ready` (and
  on Firefox sometimes `finished`) — both must be `.catch(() => {})`-swallowed or the console fills
  with unhandled rejections (dock.mjs:260-262 documents this from real testing).
- Support floor (architecture doc, decided): Chrome 111 / Safari 18 / Firefox 144. Guard makes
  this moot at runtime.

### Patterns to Follow

**The wrapper helper (replicate per file — spine.mjs:190 verbatim shape):**

```js
// morph(mutate): the #171 guard/off-ramp — witnessed as a view transition where supported and
// motion is allowed; otherwise the mutation runs instantly. Never hangs, never rejects unhandled.
function morph(mutate) {
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof document !== "undefined" && document.startViewTransition && !reduce) {
    const vt = document.startViewTransition(mutate);
    vt.ready.catch(() => {});
    return vt.finished.catch(() => {});
  }
  mutate();
  return Promise.resolve();
}
```

(If #171 landed a different shape/name, use that shape. trace-player.mjs already holds a
`reduceMotion` MediaQueryList at line 115 — reuse it there instead of a fresh `matchMedia` call.)

**Node-import safety:** all five files are Node-import-safe by design (build-checks.mjs:8-10). The
helper touches `document`/`matchMedia` only at call time, and calls only happen from DOM event
handlers — safe. Do not add module-scope `matchMedia`/`document` references.

**Initial-mount exclusion:** never wrap a render that runs at page load (VT at load = flash +
pointless). Wrap at the *event handler* or inside functions that are only ever event-triggered.

**Comment style:** each wrap gets at most a one-line comment citing the ticket, matching the
existing motion comments (`// pack-crossfade: ...` idiom). These files are densely commented; match
that register, don't editorialize.

---

## IMPLEMENTATION PLAN

Phases are sequential except where noted. Phase 2's four file-edits are mutually **independent**
(any order), but small enough that parallel worktrees are overkill — do them top to bottom.

### Phase 0: Entry gate + branch

- Run the ENTRY GATE block at the top of this plan (read #171's landed pattern + spike verdict).
- `git fetch origin && git checkout -b feature/view-transitions-172 origin/main` — the local
  checkout sits on the merged `feature/command-palette-168`; do NOT branch from it. Memory
  `owner-merges-fast-verify-landed`: confirm #171's PR tip is actually in origin/main.

### Phase 1: Verify the two already-covered surfaces (no code)

- dock.mjs pack switch: confirm its guard matches #171's pattern (support check, reduce check,
  rejection swallowing, derived/imported re-read inside `swap`). Record "verified, no change" in
  the report.
- brand-import primary path: confirm `wearIt` → `PACK_REQUEST_EVENT` → dock VT still holds.

### Phase 2: The mechanical wraps

**Independent of each other.** factory-intake wizard steps · agentic-study adjust actions + tab
pick · trace-player steps · brand-import fallback apply. Detail in STEP-BY-STEP TASKS.

### Phase 3: Regenerated-artifact sync — **measured, flip expected**

- **Measured at planning (origin/main d123806, post-#184):** the runtime group counts exactly
  **18,945** lines under the generator's semantics against the **18,950** rounding boundary —
  **5 lines of headroom**. This ticket adds ~40-80 lines, so the rendered 18,900 → 19,000 flip is
  near-certain (and #171 will move the base again before this ticket starts — recompute, don't
  assume; one-liner in Task 6). approach.html renders the runtime number → the flip churns the
  two approach baselines. This is NOT an AC2 violation: it is the epic's standing baseline rule
  ("each ticket regenerates exactly the baselines its at-rest changes churn, in the same PR") and
  has direct precedent — commit 0688793 (#169) did the identical `loc-summary re-sync
  (18100→18200) + approach ×2 recapture`. AC2's "zero regeneration" binds the **morphs** (which
  are interaction-only and structurally invisible to the gate); the loc digit is a measured-size
  side effect, declared in the PR body.

### Phase 4: Testing & validation

- Run every surface touched (repo Testing rule); cross-engine functional pass (AC4); VR gate via
  CI (AC2). Detail in VALIDATION COMMANDS.

---

## STEP-BY-STEP TASKS

### 1. VERIFY `system/dock.mjs` (no edit expected)

- **IMPLEMENT**: Read lines 226-290 against #171's landed pattern. The four ingredients: support
  guard · reduce check · `ready`/`finished` swallowed · inline-props re-read inside the mutation.
- **GOTCHA**: If #171's pattern differs cosmetically (helper name, comment), do NOT churn dock to
  match — surgical changes only. Only edit if #171 found a real defect in this shape.
- **VALIDATE**: `npx serve .` → any IA page → dock → switch neutral↔saulera in Chrome (crossfade)
  and with DevTools reduced-motion emulation (instant). Persistence across reload intact.
- **SATISFIES**: AC1 + AC3 (dock persistence) for the dock surface.

### 2. UPDATE `system/factory-intake.mjs` — wizard Back/Next morph

- **IMPLEMENT**: Add the `morph()` helper (module scope, near `run()`). Wrap the two step-change
  handlers only:
  - line ~439: `back.addEventListener("click", () => { if (step > 0) morph(() => { step -= 1; renderWizard(true); }); });`
  - line ~445-448: in the next handler, the `else` branch becomes
    `morph(() => { step += 1; renderWizard(true); });` — the `last` branch's `scrollIntoView`
    stays unwrapped (it's a scroll, not a DOM swap).
- **PATTERN**: spine.mjs:190 helper shape.
- **GOTCHA**: (a) `promptEl.focus()` (line 458) stays inside `renderWizard`, i.e. inside the
  wrapped mutation — the update callback runs synchronously, focus lands with the swap. (b) Do NOT
  wrap `setAnswer`/`run` (continuous input ticks) or `setScenario` (own entrance cascade) — see
  Non-Goals. (c) The initial `renderWizard()` (no-arg, at mount) is untouched.
- **VALIDATE**: `npx serve .` → home `#intake` beat: step Next/Back — morphs in Chrome, focus lands
  on the new step's heading (tab order proof), progress counter advances; colour-drag on
  instance.html's full wizard still updates live per tick with NO transition thrash. Then
  instance.html's wizard (same module, `initIntake` config path — memory
  `home-wizard-mounts-two-pages`: factory.html has no wizard, skip it).
- **SATISFIES**: AC1 + AC3 (wizard flow unchanged) for the wizard surface, home + instance.

### 3. UPDATE `system/agentic-study.mjs` — adjust actions + question pick morph

- **IMPLEMENT**: Add `morph()` (module scope, after `clone`). Wrap:
  - Inside `setTone`, `removeTile`, `moveTile`, `resetWorking` (lines 152-175): the state mutation
    + `renderPreview(); renderControls();` pair goes inside one `morph(() => { ... })` per
    function. Keep the `bus.emit` OUTSIDE the morph callback (before it) — the bus log is a
    sibling region and emit order must not shift relative to the mutation reading `working[i].name`
    pre-mutation (removeTile/moveTile read `name` BEFORE mutating — preserve that ordering
    exactly; see the line-149 comment).
  - The tab click (line 220): `tab.addEventListener("click", () => morph(() => pick(entry, tab)));`
    — wrapping at the listener, NOT inside `pick`, so the initial `pick(entries[0], ask.firstChild)`
    (line 224) stays instant at mount.
- **PATTERN**: spine.mjs:190; el-builder style already in file.
- **GOTCHA**: `probe()` is untouched — it mutates nothing (hypothetical clone + refusal panel).
  Module must stay DOM-free at top level (header line 17) — helper touches DOM at call time only.
- **VALIDATE**: `npx serve .` → `/agentic-ui-study.html`: tone change / remove / reorder / reset
  each morph and land the right end state; the probe still refuses with the exact path message and
  reverts the select; bus pane logs every intent in order. Then `instance.html` — the second mount
  (instance.mjs prototype slot) behaves identically.
- **SATISFIES**: AC1 + AC3 (study adjustments) for the study surface, both mounts.

### 4. UPDATE `system/trace-player.mjs` — step morph

- **IMPLEMENT**: Inline helper (NO import — header contract, line 14): add `morph(mutate)` reusing
  the existing `reduceMotion` MediaQueryList (line 115) for the reduce check:
  `if (document.startViewTransition && !reduceMotion.matches) { ... }`. Rework `apply(scroll, block)`
  so the class-toggle loop + progress/fill writes run inside `morph()`, and the
  `scrollIntoView` call runs AFTER the mutation callback (immediately after the `morph()` call is
  fine — smooth scroll is async and must not sit inside the snapshot callback):
  ```js
  function apply(scroll, block = 'center') {
    morph(() => { /* class toggles + progress + fill exactly as today */ });
    if (scroll && current >= 0 && cards[current]) cards[current].scrollIntoView({ block, behavior: 'smooth' });
  }
  ```
  `revealAll` (line 190) gets the same treatment (its whole body inside `morph`).
- **PATTERN**: dock.mjs rejection-swallowing; existing `reduceMotion` gate at line 115.
- **GOTCHA**: (a) `reveal(0, false)` runs at mount (line 221) — it reaches `apply` and WOULD
  transition at load. Prevent it: either a `mounted` flag flipped after the initial `reveal`, or
  have `morph` take effect only after first paint — simplest is
  `let live = false; ... reveal(0, false); live = true;` and `morph` falls through to instant when
  `!live`. (b) Autoplay ticks (1400 ms) call the wrapped path — fine; consecutive
  `startViewTransition` calls auto-skip the prior one, and autoplay only exists under
  no-preference. (c) `parseTrace` is untouched (Node consumers).
- **VALIDATE**: `npx serve .` → `factory.html` (trace exhibit; ERR_CONNECTION_REFUSED worker noise
  is expected — memory `headless-render-data-pages-worker-refused`) and `/trace.html`: Next/Prev/
  arrows/Show-all/Play all work, morph per step, no console unhandled rejections; two players on
  factory.html still scope arrows to the focused one. `node tooling/validate-trace.mjs` on a
  committed trace still passes (proves the Node import path).
- **SATISFIES**: AC1 + AC3 for the trace-player surface.

### 5. UPDATE `system/brand-import.mjs` — fallback apply morph (home re-skin)

- **IMPLEMENT**: Add `morph()` (module scope). In `wearIt` (lines 288-291), wrap only the fallback:
  `if (!claimed || !stored) morph(() => { clearInlineTokens(); applyImported(rec); });`
- **GOTCHA**: The primary path is the dock's transition (line 277-282) — do not double-wrap; the
  `status(...)` + `trackFactoryDriven()` lines stay outside the morph (analytics discipline:
  success-path, order preserved).
- **VALIDATE**: home → drop a token JSON (any DTCG export; `handoff/verdant/tokens.json` works) →
  "wear it" crossfades via the dock path; then in a private window (storage blocked) the fallback
  still applies the skin + shows the honest storage notice.
- **SATISFIES**: AC1 for the home re-skin surface (title item).

### 6. RUN `node agent-layer/gen-loc-summary.mjs` + handle the expected rounding flip

- **IMPLEMENT**: First recompute the live margin (the base moves when #171 merges):
  `git ls-tree -r --name-only origin/main | grep -E '^system/(wc/)?[^/]+\.(css|mjs|js)$' | while read f; do git show origin/main:"$f" | awk 'END{print NR}'; done | awk '{s+=$1+1} END {print s}'`
  Then stage the edited .mjs files (gen-loc reads git-TRACKED content — memory
  `loc-summary-counts-tracked-only`), regenerate, `git diff --cached --stat` the JSON. Two
  outcomes, both planned:
  - **Rounded runtime number unchanged** (only exact counts moved within the hundred): commit the
    JSON if it drifted; zero visual change; done.
  - **Rounded runtime number flipped** (expected — see Phase 3): commit the JSON AND recapture the
    two approach baselines in the same PR: clean detached worktree under /Users (NOT /private/tmp
    — Docker file-sharing; memory `vr-gate-reads-working-tree`), `cd tooling/visual-regression &&
    npm run update:docker`. A changed digit can be sub-perceptual to pixelmatch — if the run
    skips the approach PNGs, `rm` them first to force recapture (memory
    `vr-update-skips-subperceptual`). Expect only approach ×2 in the diff; anything else churning
    means a morph leaked into an at-rest frame — STOP and investigate. Known CI flake: approach's
    countUp rAF can fail one pack per run at retries:0 (memory `vr-gate-approach-countup-flake`)
    — a local Docker pass + one CI re-run distinguishes flake from regression.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` on the staged tree exits clean;
  after push, CI `verify` + `visual` both green.
- **SATISFIES**: AC2 (as restated in Phase 3: morphs churn nothing; the declared loc cascade
  follows the epic's baseline rule).

### 7. Cross-engine functional pass (AC4)

- **IMPLEMENT**: Throwaway script in the scratchpad (NOT the repo) driving chromium + firefox +
  webkit, Playwright resolved from `tooling/visual-regression/node_modules` (memory
  `cross-engine-motion-verify`; serve via `npx serve` or python with .mjs→text/javascript). Per
  engine: (a) home wizard Next → assert step counter "2 / 3" + focus on heading; (b) study page
  tone→warn → assert rendered tile tone class; remove → tile count −1; (c) trace.html Next ×3 →
  assert 3 visible cards; (d) same with `reducedMotion: 'reduce'` context → assert end states
  identical AND `document.startViewTransition` uncalled (pre-inject a spy wrapper before click).
  Zero page errors on home (other pages: worker-refusal noise is expected).
- **VALIDATE**: script exits 0 on all three engines.
- **SATISFIES**: AC1 (morph where supported, instant elsewhere, reduced-motion obeyed) + AC4.

### 8. Report + PR

- **IMPLEMENT**: `.claude/reports/view-transitions-sitewide-172-report.md` — including the two
  no-op findings (dock already wrapped since c7cf564; handoff-viewer has no navigation to wrap)
  and the #171 spike-inheritance note. Commit plan + report in the same PR (repo git rule). PR
  body carries `Closes #172`.
- **VALIDATE**: `gh pr view --json body | grep "Closes #172"`.

---

## TESTING STRATEGY

No test suite in this repo (hard rule: don't invent one). "Done" = run the surface you touched.

### Per-surface manual runs (repo Testing rule)
Each task above names its run. Full sweep: home (wizard + drop-to-wear + dock), instance.html
(wizard + study slot), factory.html (trace exhibits), trace.html, agentic-ui-study.html,
handoff.html (regression only — untouched).

### Edge cases
- Reduced-motion ON: every wrapped path swaps instantly, identical end state.
- Unsupported engine (Firefox < 144 / any engine minus the API): guard falls through — spy-check.
- Rapid clicking (wizard Next spam, study reorder spam): consecutive transitions skip cleanly, no
  unhandled rejections in console (the `.catch(() => {})` pairs).
- Trace autoplay running while user clicks Prev: `stop()` still wins; morphs don't queue.
- Hidden tab (`document.hidden`): a skipped transition rejects — swallowed, mutation still applied.
- agentic-study probe: refusal message verbatim, select reverts, `working` unmutated.
- Node imports: `node -e "await import('./system/trace-player.mjs'); await import('./system/agentic-study.mjs'); await import('./system/factory-intake.mjs'); await import('./system/brand-import.mjs')"` — all import clean (build-checks contract).

## VALIDATION COMMANDS

### Level 1: Syntax / Node-import safety
- `node --check system/factory-intake.mjs system/agentic-study.mjs system/trace-player.mjs system/brand-import.mjs` (run per file)
- the Node dynamic-import one-liner above

### Level 2: Repo gates (pure, local)
- `node tooling/build-checks.mjs` — all 10 groups green (regression; none of the five files are in
  its import graph, but the gate is cheap and canonical)
- `node tooling/validate-trace.mjs traces/<any-committed>.curated.jsonl` — parseTrace regression
- `node agent-layer/gen-loc-summary.mjs --check` (after Task 6 staging)

### Level 3: Cross-engine functional (Task 7 script)

### Level 4: Manual validation
- Per-task VALIDATE lines; plus dock persistence: switch pack → reload → pack retained.

### Level 5: CI
- Push → `verify` (drift checks) green; `visual` green with **zero baseline changes in the PR
  diff** (AC2's literal check: `git diff --stat origin/main -- tooling/visual-regression` is empty).

## ACCEPTANCE CRITERIA (from the ticket)

- [ ] AC1 — every listed surface morphs in supporting engines, instant-swaps elsewhere, obeys
      reduced-motion (Tasks 2-5, 7). "Listed" resolved by this plan: wizard (home+instance), study
      (both mounts), trace steps, home re-skin fallback; dock verified pre-existing;
      handoff-viewer documented no-op.
- [ ] AC2 — VR gate green; **zero baseline regeneration attributable to the morphs** (structural:
      interaction-only triggers). The measured loc-summary rounding flip (Phase 3) recaptures
      approach ×2 under the epic's standing baseline rule, declared in the PR body — expect
      exactly those two PNGs in the diff and nothing else.
- [ ] AC3 — dock persistence, wizard flow, study adjustments proven unchanged (per-task runs).
- [ ] AC4 — chromium/firefox/webkit functional pass (Task 7).
- [ ] Untouchables untouched: `git diff` shows no hunks in analytics.mjs / pack-boot.js.
- [ ] Plan + report + review in the PR; `Closes #172` in the body.

## COMPLETION CHECKLIST

- [ ] Entry gate run; #171 pattern + spike verdict inherited (or plan amended)
- [ ] Branch cut from fresh origin/main containing #171's merge
- [ ] Tasks 1-8 in order, each VALIDATE passed immediately
- [ ] All Level 1-5 commands green
- [ ] No console unhandled rejections on any touched surface
- [ ] Report documents the two no-op findings honestly

## OPEN QUESTIONS / ASSUMPTIONS

1. **#171 is unstarted at planning time — the one remaining open item.** The ENTRY GATE forces
   re-verification of its landed pattern + spike verdict before coding. The planning micro-spike
   below already answers the spike's question *for this ticket's surfaces* (interaction-only
   wraps, end states identical, no rejections), so a surprising #171 verdict would narrow, not
   invalidate, this plan.

**Resolved at planning (owner, 2026-07-31):** handoff-viewer documented as a no-op (no navigation
exists to wrap); scenario toggle excluded from the wizard wraps. Both are decisions now, not
questions. The loc-summary rounding question is also closed: measured, flip expected, procedure in
Task 6.

## PLANNING EVIDENCE — micro-spike results (2026-07-31)

Run: `node <scratchpad>/vt-spike.mjs` — chromium + firefox + webkit from
`tooling/visual-regression/node_modules`, each under `reducedMotion: no-preference` AND `reduce`.
A minimal page implementing the exact `morph()` helper from Patterns, driven through the plan's
risky moves. **6/6 PASS:**

| Claim proven | Result |
|---|---|
| `focus()` inside the VT update callback lands (Task 2's wizard pattern) | activeElement = the new step's heading, all engines |
| Reduced-motion off-ramp: end state identical, `startViewTransition` never called | vtCalls=0 under reduce, same end state |
| Rapid successive transitions (next fired before prior settles) | no unhandled rejections, final state correct |
| Mutation inside morph + `scrollIntoView({behavior:'smooth'})` after it | scroll completes, content updated |
| All three bundled Playwright engines SUPPORT the API | supportsVT=true ×3 — AC4 observes real morphs, and the fallback leg is proven via the reduce path + spy |

Implication for the VR question #171 owns: these wraps fire only from user events the gate never
performs, and the spike shows the wrapped mutation's end state is byte-identical either way — the
two facts that make AC2 structural. (The spike script was session-scratchpad-only; Task 7's
cross-engine script re-implements the same shape — a spy-wrapped `document.startViewTransition`,
both `reducedMotion` contexts, end-state + rejection assertions — against the real pages.)

## NOTES (open canvas)

- **Why AC2 is structurally safe:** the VR gate loads pages, resizes, waits for visible-beat
  settlement, screenshots. It never clicks Next/tabs/selects. Every wrap in this plan triggers
  only from a user event, so the captured frames are byte-identical by construction. The only VR
  risk ever was load-time transitions — excluded via the initial-mount rule (study's `pick` at
  line 224, trace-player's `reveal(0, false)` at line 221, wizard's no-arg `renderWizard`).
- **Why per-file helpers, not a shared module:** trace-player's import-free contract; 6 lines per
  file; spine/dock/instance-pack already carry three independent copies — this ticket makes it
  ~6-7 copies, which is the moment a future refactor *could* consolidate, but that's a deliberate
  follow-up (it would touch dock/spine, i.e. non-surgical here).
- **`updateCallbackDone` not needed** on these wraps — nothing downstream awaits the mutation
  (unlike dock's PACK_CHANGE_EVENT ordering); `.finished.catch` suffices.
- Rejected: wrapping `setScenario`, `probe`, handoff copy-button, `setAnswer` — reasons in
  Non-Goals; each is either continuous, non-mutating, or double-animating.
- Estimate: ~60-80 changed lines across 4 files (well under the ticket's ~500 guess — the guess
  assumed dock + handoff-viewer needed real work; they don't).

## AMENDMENTS

- 2026-07-31 — Planning round 2 (pre-approval risk burn-down): (a) measured the loc-summary
  rounding margin on origin/main — 5 lines of headroom, flip near-certain — Task 6 rewritten as a
  two-outcome procedure with the #169/0688793 recapture playbook, AC2 restated accordingly;
  (b) ran a 3-engine × 2-motion-preference micro-spike proving focus-inside-VT, the reduce
  off-ramp, rapid-transition rejection safety, and scroll-after-morph (see PLANNING EVIDENCE);
  (c) owner resolved the two scope questions — handoff-viewer no-op, scenario toggle excluded.
  Confidence raised 9 → 9.5; sole remaining dependency is #171's landing (ENTRY GATE).

- 2026-08-01 — **ENTRY GATE RUN against #171 as merged** (PR #189, merge `ee2d733`, issue #171
  closed; read at the merged tip `5c1865c`, which includes the PR-review follow-ups — the
  pre-review branch tip said something different about the audit tool). Six amendments:

  1. **"No new shared module" is REVERSED.** #171 shipped `system/morph.mjs` (45 lines). The plan's
     "replicate per file" instruction would now create duplicate helpers, so the plan's own escape
     hatch applies: import it in `factory-intake` / `agentic-study` / `brand-import`, and inline a
     copy ONLY in `trace-player.mjs`, whose header contract (line 14) is "No imports, no fetch".
     The landed shape differs from the plan's sketch — it returns `(vt.updateCallbackDone ||
     vt.finished)` and carries a module-scope `active` re-entrancy flag.

  2. **New hazard class the plan never saw — #171 deviation 3.** `morph()` hands the callback to
     `startViewTransition`, which runs it a FRAME LATER; a newer state painted synchronously in
     that gap is then overwritten by the older captured closure. Discipline adopted for every wrap
     here: **state mutates synchronously OUTSIDE the callback; only the paint goes inside, and the
     paint reads live state.** `renderWizard`, `renderPreview`/`renderControls` and `apply` already
     read live module state, so they are idempotent for free. `pick(entry, tab)` was the one real
     exposure — it closed over its arguments — and is split so `paint()` reads live `picked`/
     `working`.

  3. **`vt-stack-audit` is NOT adopted, and #190 is therefore NOT a blocker.** `CLAUDE.md`:84 says
     #172 "needs [it] on every page it touches", and #190 (open) says fix its `/index` +
     `/roundtrip` false positives first. Both hazards it checks — containing-block shift and paint
     order — arise ONLY from `view-transition-name` making an element a stacking context. This
     ticket holds its "default root crossfade, no names" non-goal (owner-confirmed 2026-08-01), so
     there is nothing on any touched page to audit. That non-goal is now load-bearing, not
     cosmetic: it is what keeps #172 clear of the exact regression #171 shipped.

  4. **Task 7 extends `tooling/vt-verify.mjs`** instead of writing a scratchpad throwaway. #171
     committed it (3 engines, spies on `startViewTransition` before any module evaluates), and its
     header already names #172 as the ticket that must preserve the boot-zero property site-wide.
     A committed driver is repeatable evidence; a throwaway is not.

  5. **`CLAUDE.md`:83's "boot opens ZERO transitions … #172 must preserve it site-wide" is not true
     site-wide, and was already not true before this ticket.** `spine.mjs`:147,149 runs the hero
     re-skin AND its revert through `crossfade()` → `startViewTransition` at load on home (#72).
     Measured: home opens exactly **2** at load on all three engines. The pixel gate is safe there
     for a different reason than on /build — `heroBeat` sets `data-spine="ready"` only after the
     revert, and the gate waits on that handle. `vt-verify` encodes this as an EXPECTED COUNT with
     its reason rather than asserting a zero that is not there.

  6. **Task 6's arithmetic re-measured, and the predicted flip did NOT happen.** Post-#171
     `origin/main` sits at 19,192 exact in the runtime group → 19,200 rounded, with the next
     rounding boundary at 19,250 (`round100 = Math.round(n/100)*100`), i.e. 58 lines of headroom —
     not the 5 the plan measured pre-#171. This ticket adds 49 net lines, landing at 19,241, so the
     runtime number stays 19,200. Only the GRAND TOTAL moved (26,700 → 26,800), and `approach.html`
     :241 renders the runtime group's `files`/`linesApprox` only — verified in the markup, not
     assumed from memory. **Zero baseline recapture; AC2 holds literally**, and Phase 3's
     "flip expected / recapture approach ×2" playbook is not exercised.
