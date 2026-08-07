# Feature: Studio gates — INP instrumentation, throttled-drag frame check, driver growth, the a11y audit (#213)

The following plan should be complete, but validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, seams and selectors. Import from the right files.

## Feature Description

Ticket #213 is the studio's measurement gate: the guardrails the epic's hypothesis is falsified by
(PRD WRONG-if: INP > 200 ms, dropped-frame drag, a keyboard path failing for any canvas verb). It
folds the closed-NOT_PLANNED #177 (INP instrumentation + budget check), re-targeted at the studio.

**Scope reality check — read this before anything else.** The ticket text was written at slicing
time (2026-08-03), before Studio 1–9 landed. Since then, #204/#205/#206/#207/#209/#210 + the review
tickets (#229–#232, #236, #237, #240, #241) each landed their gate coverage incrementally, so most
of the ticket's journey-driver and vt-verify bullets are **already satisfied**:

- `tooling/studio-journey.mjs` exists (2732 lines, cross-engine): replay plays · take-over hands
  over · every move verb by keyboard incl. ⌘/Ctrl+Z undo (line 725) · SC 2.5.7's click-move-click
  completed (#229) · share round-trips with arrangement (keepPass) · the export downloads and
  parses in a browser (keepPass) · reduced motion (three sections) · announcements counted per
  path · refusals to the live region.
- `tooling/vt-verify.mjs` already covers the studio with honest expected counts: the canvas names
  NOTHING (zero asserted at load, after verbs, under reduced motion — lines 279–383), /factory's
  boot count is read AFTER the whole 14 s replay and sampled DURING playback (lines 385–447), and
  the #207 compile crossfade is proven to open zero transitions with the movement proven first.

**What is genuinely left — this plan's whole scope:**

1. **INP instrumentation** — nothing anywhere measures INP (`grep PerformanceObserver` across
   tooling/ + system/ is empty). Greenfield: an injected observer + a perf pass in studio-journey,
   budget asserted per interaction per engine.
2. **Dropped-frame drag under CDP throttling** — greenfield, chromium-only by tool definition.
3. **The dock mid-flow** — studio-journey never touches the dock (2 grep hits, both incidental
   comments). factory.html carries `dock.mjs` (line 462) like every shipped page.
4. **Keyboard activation of the zoom verbs** — [2] drives Zoom in/out/Fit/Reset by CLICK only;
   AC #5 wants every verb exercised BY KEYBOARD with its announcement asserted.
5. **vt-verify post-interaction sampling for #210's keep rail + the take-over** — the existing
   factory block samples load/replay/compile; the keep-rail clicks and the handover are
   interactions added after that block was written and are never sampled.
6. **The recorded WCAG 2.5.7 audit, the broken-verb red-run proof (AC #1), coverage-bounds
   logging (AC #7), CLAUDE.md rows** — process artifacts.

## User Story

As the portfolio owner shipping the studio as a work sample
I want the responsiveness and accessibility guardrails measured and asserted, not assumed
So that a moved guardrail (INP > 200 ms, janky drag, a dead keyboard path) fails a gate loudly
instead of silently falsifying the epic's hypothesis in front of an evaluator.

## Problem Statement

The studio's PRD names three WRONG-if guardrails, and today none of them is measured: no INP
number exists for any studio interaction on any engine, drag smoothness has never been sampled
under a base-spec CPU profile, and while keyboard paths exist and are driven, no recorded audit
maps every canvas verb against SC 2.5.7 / 2.2.2 so a gap has nowhere to show up.

## Solution Statement

Grow `tooling/studio-journey.mjs` (the ticket's named home for the assertions) with a `perfPass`:
an injected `PerformanceObserver('event')` (all three engines support it with `interactionId` —
probed 2026-08-07, see NOTES) measures each named studio interaction and asserts the ≤ 200 ms
budget per engine; a chromium-only CDP-throttled drag samples rAF gaps + long-animation-frames and
asserts the no-dropped-frame budget. Add the dock-mid-flow case and the keyboard-activation sweep
for the zoom verbs. Extend vt-verify's factory block to sample after the keep-rail and take-over
interactions. Record the WCAG audit + measurements + the deliberate red run in the ticket report.

## Out of Scope / Non-Goals

- **No shipped-page changes at all.** The observer is driver-injected via `addInitScript`; no
  "observer hooks" land in system/ or any page (#177's phrasing predates this design). Zero-dep
  shipped pages stay untouched; no VR baseline churn; no param-manifest entries; loc-summary does
  not count tooling/ (GROUPS at `agent-layer/gen-loc-summary.mjs:22-26`) so no regen cascade.
- **Not re-building what #204–#210 already gate**: the journey driver's existing passes and
  vt-verify's existing studio blocks are audited and cited, not rewritten.
- **No flow-navigation coverage** — #212 (Studio 10, open) adds those verbs; the driver grows then.
- **No generic axe-style scan.** The zero-violations metric is scoped to the ticket's named
  criteria: SC 2.5.7 (dragging alternative), SC 2.1.1 (keyboard), SC 2.2.2 (pause controls).
- **No CI registration.** Operator-run like build-journey/vt-verify/proto-journey — three engine
  downloads per PR buys less than it costs (#138's call, restated in studio-journey's header).
- **Not changing** `system/studio-verbs.mjs`/`studio-canvas.mjs` behavior — unless the audit finds
  a real SC violation, in which case fix-or-ticket per AC #6 (see Task 8).

## Feature Metadata

**Feature Type**: Enhancement (gates/tooling)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `tooling/studio-journey.mjs`, `tooling/vt-verify.mjs`, new
`tooling/inp-observer.mjs`, `CLAUDE.md`, `.claude/reports/`
**Dependencies**: none new — Playwright resolved out of `tooling/visual-regression/node_modules`
(never a repo dep; hard rule restated in the ticket)

## Related Work

**Implements**: [#213](https://github.com/linardsb/ux-factory/issues/213) — PR body must carry
`Closes #213`.   ·   **Epic**: #202, `docs/epics/prototype-studio.architecture.md` §Other eng-lead
calls → "Gates the studio builds, not just obeys" (verbatim source; inherited, not re-decided) +
`prototype-studio.prd.md` §10, Success metrics *Responsiveness* + *Accessibility*.

**Back-references** (plans whose seams this drives):

- `.claude/plans/studio-canvas-manipulation-205.md` — the verbs + announcement discipline audited here
- `.claude/plans/studio-replay-driver-takeover-209.md` — the transport + take-over the perf pass measures
- `.claude/plans/studio-single-file-export-keep-rail-210.md` — the keep-rail interactions vt-verify gains
- Ticket #177 (closed NOT_PLANNED, epic #164) — the folded INP scope; its "small observer hooks
  where needed" is superseded by driver-injection (see Out of Scope)

**Forward-references**:

- #212 (flows) and #215 (catalog) will grow the driver and the perf interaction list — expected;
  drivers grow (ticket's own words).

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `tooling/studio-journey.mjs` (lines 1–103: header, engine loop, `snapshot`, `viaSeam`, `btn`
  helpers; 256–345: sections [1]–[3] incl. zoom-by-click and fit's announcement assertion; 624–674:
  announcements counted per path; 1118–1179: reduced-motion context idiom; 1180–1215: factoryPass
  entry + the settled-first rule; 1345–1420: replayPass — `watch`, `settled`, `replayState`
  helpers, the take-over + transport cases; 2126–2170: keepPass — `acceptDownloads`, tiers-as-
  client-rects; 2680–2732: the engine runner + the giant honest summary line you must extend)
  — Why: this is the file being grown; every new pass must follow its idioms (own context per
  pass, `t(label, cond, detail)` assertions, page-error watchers, resulting-DOM phrasing).
- `tooling/vt-verify.mjs` (lines 30–45: run lines + BASE; 94–140: SURFACES with `boot:` counts;
  279–383: the studio canvas block; 385–447: the factory/compile block this ticket extends — note
  `read(p)` returns HOOK's counter, and the "movement proven first" comments) — Why: the extension
  must reuse `HOOK`, `read`, and the proven-movement discipline verbatim.
- `tooling/build-journey.mjs` (lines 500–515 + 1100–1150: the dock-mid-flow template — `?b=`
  surviving `#appearance` open/close, the dock inside a flip window) — Why: the named template for
  the studio's dock-mid-flow case.
- `system/studio-canvas.mjs` (lines 91–95: `live`/`getCanvas` seam; 121: `.stx-zoom-level` is
  `aria-live="polite"`; 128–137: the canvas's own `.stx-live` announcer + `say()`; 337–341: the
  handle exposes the announcer so #205's mover shares ONE region) — Why: the keyboard sweep asserts
  these two aria-live surfaces; do not invent a third.
- `system/studio-verbs.mjs` (header lines 1–50: which SC each path satisfies — the audit table's
  ground truth; line 363: refusals go to the live region) — Why: the WCAG audit quotes this
  header's claims and proves each one.
- `system/replay-driver.mjs` (lines 564–590: `announceBeat` + the polite-region one-sentence rule;
  the transport is keyboard-driven and already asserted in replayPass) — Why: SC 2.2.2 evidence.
- `tooling/proto-journey.mjs` (lines 196–310: per-section structure, the vacuous-check lesson at
  289–304) — Why: the "prove the check can fail" discipline every new assertion follows.
- `agent-layer/gen-loc-summary.mjs` (lines 22–26: GROUPS — tooling/ is not counted) — Why: proves
  no loc-summary/baseline cascade; cite in the PR body.
- `factory.html` (line 44: pack-boot; 462: dock.mjs) — Why: the dock-mid-flow case's subject.

### New Files to Create

- `tooling/inp-observer.mjs` — the INP helper: the injected observer source + pure `summarize()`
  and `violations()` functions (driver-side, engine-agnostic).
- `.claude/reports/studio-gates-213-report.md` — measurements, the WCAG audit table, the red-run
  proof, the bounds table (written at the END of implementation; the piv report).
- `.claude/plans/studio-gates-inp-vt-a11y-213.md` — this plan (commit with the PR; repo rule).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Event Timing API — PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming)
  - Sections: `duration` semantics (start → next paint, rounded to 8 ms), `interactionId`
    (non-zero only for discrete interactions), `durationThreshold` (16 ms floor).
  - Why: the observer's grouping key and the "no entry = under 16 ms" pass rule both come from here.
- [web.dev — INP](https://web.dev/articles/inp#whats_in_an_interaction)
  - Section: what counts as one interaction (all events sharing an interactionId; latency = max).
  - Why: the summarize() rule — per-interaction latency is the MAX duration in the group.
- [Long Animation Frames API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming)
  - Why: the chromium drag check's second net; ≥ 50 ms is the entry threshold. Chromium-only
    (probe-confirmed), which is fine — the CDP throttle is chromium-only anyway.
- [CDP Emulation.setCPUThrottlingRate](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setCPUThrottlingRate)
  - Why: the base-spec-laptop profile. Precedent in memory `cross-engine-motion-verify`: the #72
    spike used 4× and recorded worst frame 33 ms @4× / 50 ms @6× as its pass; bootstrap frames
    (site.js/dock.mjs chrome injection, 150–266 ms) must be excluded from the measured window.

### Patterns to Follow

**Assertion helper** (studio-journey throughout):
```js
t("label phrased as resulting DOM", condition, detailStringShownOnRed);
```
Every claim is phrased as resulting DOM / a resulting number, never "an event fired".

**Own context per pass, watched pages** (replayPass lines 1345–1365):
```js
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const watch = (p, tag) => {
  p.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error") errors.push(`${tag} console: ${m.text()}`); });
};
```

**Settled-first** (every /factory pass since #209): wait `[data-replay="settled"]` (30 s — 14 s is
playback, governed by replay-driver's PLAYBACK_MS) before touching a slot.

**vt-verify's counter**: `addInitScript(HOOK)` before evaluation, `read(p)` for calls, movement
proven first ("zero transitions" is trivially true of a page where nothing happened).

**Prove the gate can fail** (memory `check-that-cannot-fail`): every new comparator gets a
synthetic-mutation control in the same pass; AC #1's break-a-verb run is the whole-driver version.

**Honest summary line**: studio-journey ends in one giant `·`-separated sentence naming everything
it proved (line 2731). Extend it — a pass that isn't named there doesn't exist to the operator.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 2 depends on Phase 1 (imports the helper). Phases 3, 4 and 5 are
**independent of Phase 2 and of each other** — parallelizable, though the file-churn overlap in
studio-journey.mjs (Phases 2, 3) makes sequential simplest. Phase 6 depends on all of them.

### Phase 1: The INP helper

`tooling/inp-observer.mjs` — the observer source injected into pages + the pure summarize half the
driver asserts with. Pure functions so the self-test control can drive them synthetically.

### Phase 2: perfPass in studio-journey — INP budget + throttled drag

**Depends on:** Phase 1

The measurement pass: named interactions on the settled /factory, per-engine budget assertion,
bounded logged retry, the chromium CDP drag check, the self-test control.

### Phase 3: Driver growth — dock mid-flow + the keyboard zoom sweep

**Independent of:** Phase 2

The two functional gaps in the existing journey: the dock driven mid-replay, and the four zoom
verbs activated from the keyboard with their aria-live surface asserted.

### Phase 4: vt-verify — sample after the keep rail and the take-over

**Independent of:** Phases 2–3

Extend the existing factory block: after a take-over and after the keep-rail copy + export clicks,
calls stay 0 and zero pseudos run — movement proven first.

### Phase 5: The WCAG audit

**Independent of:** Phases 2–4 (it audits shipped behavior, not new code)

The recorded SC 2.5.7 / 2.1.1 / 2.2.2 table; anything failing is fixed or ticketed.

### Phase 6: Validation, the red-run proof, docs, report

**Depends on:** all above. Full three-engine runs, AC #1's deliberate red, CLAUDE.md rows, report.

---

## STEP-BY-STEP TASKS

### Task 0: BRANCH

- **IMPLEMENT**: `git checkout main && git pull && git checkout -b feat/213-studio-gates`.
- **GOTCHA**: this session's worktree may sit on another epic's branch (memory
  `shared-worktree-parallel-sessions`) — verify `git branch --show-current` before every commit;
  stage by explicit path.
- **VALIDATE**: `git branch --show-current` → `feat/213-studio-gates`

### Task 1: CREATE `tooling/inp-observer.mjs`

- **IMPLEMENT**: three exports, no imports, ~80 lines.
  - `OBSERVER_INIT` — a string of page-side JS for `context.addInitScript()`. Installs, before any
    page script runs:
    ```js
    window.__studioINP = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__studioINP.push({
        name: e.name, duration: e.duration, interactionId: e.interactionId,
        startTime: e.startTime, processingEnd: e.processingEnd,
      });
    }).observe({ type: "event", durationThreshold: 16, buffered: true });
    ```
    Header comment must state why a `window.__` global is acceptable HERE: it is driver-injected
    instrumentation that never ships — the never-a-window-global rule (proto-journey's header) is
    about PRODUCT seams, and there is no product module to export from.
  - `summarize(entries)` — pure: drop `interactionId === 0` rows (hover/scroll noise — not
    interactions), group by `interactionId`, per-group latency = **max** `duration` (web.dev's
    INP rule). Returns `[{ interactionId, latency, events: [names] }]` sorted by startTime.
  - `violations(interactions, budgetMs)` — pure: the comparator the driver asserts with; returns
    the over-budget subset.
- **PATTERN**: header style = what/why plain header (helper module, CLAUDE.md ground rule); pure
  functions so they can be driven synthetically (build-checks' discipline, though no CI group is
  added — the self-test lives in perfPass, Task 3).
- **GOTCHA**: `durationThreshold` floor is 16 — an interaction faster than that yields NO entry.
  That is a PASS, but it must be distinguishable from a dead observer (Task 2's sanity case).
- **VALIDATE**: `node -e "import('./tooling/inp-observer.mjs').then(m => { const s = m.summarize([{interactionId:7,duration:24},{interactionId:7,duration:208},{interactionId:0,duration:999}]); console.assert(s.length===1 && s[0].latency===208, JSON.stringify(s)); console.assert(m.violations(s,200).length===1); console.assert(m.violations(m.summarize([{interactionId:8,duration:24}]),200).length===0); console.log('inp-observer ✓'); })"`
- **SATISFIES**: AC #2 (the measurement machinery)

### Task 2: ADD `perfPass` — the INP half — to `tooling/studio-journey.mjs`

- **IMPLEMENT**: new `async function perfPass(browser, engineName, t, errors)` called from
  `journey()` after the existing passes; own context with
  `await ctx.addInitScript(OBSERVER_INIT)` (import `OBSERVER_INIT`, `summarize`, `violations` at
  the top of the file beside the studio-canvas import).
  1. **Calibration first — the observer proven alive with a forced-slow click.** On a throwaway
     page in the same context (so it inherits the init script), add a driver-side capture-phase
     click listener that busy-waits ~35 ms, click once, flush, and assert one entry with a
     non-zero `interactionId` arrived; on red name the engine. Probe-verified 2026-08-07: this
     yields entries on all three engines (see NOTES). Do NOT sanity-check with a bare click on
     the real page — a healthy fast page yields NO entry (everything under the 16 ms floor), so
     that design fails green pages; the probe caught exactly this. The throwaway page is closed
     before measurement so the slow listener never pollutes a real row. This is what stops a
     silently-dead observer from turning every budget assertion vacuous-green (proto-journey
     lines 289–304's lesson), without the fast-page false red.
  2. **The interaction table** — a `const INTERACTIONS = [{ label, act }]` list, each `act(page)`
     one discrete scripted interaction on the settled /factory:
     `zoom-in click` · `fit click` · `reset click` · `slot pointer-drag` (down→4 moves→up on a
     `.stx-grab` handle to an adjacent free cell) · `keyboard grab (Enter)` · `keyboard arrow
     step` · `keyboard drop (Enter)` · `undo ⌘/Ctrl+Z` · `redo` · `panel tab arrow` (#206 tab
     list) · `compile click` · `revert click` · `keep copy-link click` · `export click`
     (`acceptDownloads: true` on the context — keepPass line 2127's idiom).
     Plus, on a SECOND fresh page mid-replay: `take-over pointerdown` and `transport pause (key)`
     — parked at a known beat with the seek control, never slept to (replayPass's rule).
  3. **Measurement protocol per row**: record `window.__studioINP.length` before, run `act`, then
     flush — `await page.evaluate(() => new Promise(r => requestAnimationFrame(() =>
     requestAnimationFrame(r))))` + `waitForTimeout(150)` (entries are delivered after
     presentation) — then read the delta, `summarize`, and take the max latency among the new
     interactions. No new entry after a completed act = "< 16 ms (below observer floor)" — printed
     as such and PASSES. **This is the COMMON case, not an edge case** (probe-verified: on this
     machine the studio's zoom click completes under 16 ms on all three engines), and it is a
     sound pass: the observer delivers every entry ≥ 16 ms, so no entry ⇒ latency < 16 ≤ 200 —
     and the calibration step already proved the delivery pipeline alive, so the inference cannot
     be satisfied by a dead observer.
  4. **The budget, asserted**: `t(\`INP · ${label} ≤ 200 ms\`, latency <= 200, \`${latency} ms\`)`
     per row. **Bounded retry, logged**: one over-budget row is re-measured ONCE on a fresh
     settled page; both numbers printed (`retried: 312 ms → 74 ms`); red only if still over.
     The retry rule is printed in the pass's output — silent tolerance is AC #7's named sin.
  5. **Reported per engine**: after the rows, `console.log` a compact table
     (`label · ms · entry-count`) under the engine's banner — this is the report's data source.
  6. **The self-test control** (memory `check-that-cannot-fail`): feed
     `violations(summarize([{interactionId: 1, duration: 250}]), 200)` and assert it flags — the
     comparator proven able to go red in the same pass that relies on it.
- **PATTERN**: pass structure = replayPass (own ctx, `watch`, `settled` helper); assertion
  phrasing = resulting numbers with the measured ms as the red detail.
- **IMPORTS**: `import { OBSERVER_INIT, summarize, violations } from "./inp-observer.mjs";`
- **GOTCHA**: (a) group by non-zero `interactionId`, never by event name — probe-verified on all
  three engines: pointerdown/pointerup/click share one id, keydown/keypress share another, and
  the mouse-alias events (mousedown/mouseup) plus hover noise carry id 0 by spec — dropping the
  zero-id rows is correct, not lossy. (b) **Never read via
  `performance.getEntriesByType("event")`** — probe-verified EMPTY on all three engines even
  while the observer receives entries; only a PerformanceObserver sees event timing. (c) The
  keyboard-move rows run against a page where the visitor already took over — take-over first,
  or the transport swallows the keys. (d) Do not reuse a page across the compile row and the
  drag rows without `revert` — compiled tiles change what a drag drags. (e) Durations are 8 ms
  granular (probe: 48/40/32/16) — never assert exact values, only the budget.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs & node tooling/studio-journey.mjs chromium`
  → the perf table prints, all INP rows green, self-test control green.
- **SATISFIES**: AC #2 (measured per interaction, reported per engine, budget asserted), AC #7

### Task 3: ADD the throttled-drag frame check to `perfPass` (chromium only)

- **IMPLEMENT**: guarded `if (engineName === "chromium")`. Fresh settled page, then:
  1. `const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });`
     — 4× is the base-spec-laptop proxy with recorded precedent (#72 spike: worst frame 33 ms @4×
     was its green; memory `cross-engine-motion-verify`).
  2. **Idle baseline**: page-side rAF sampler for ~60 frames AFTER settle + 500 ms rest → median
     interval `I`. Excludes the 150–266 ms bootstrap frames the memory warns about.
  3. **Instrumented drag**: install a rAF-timestamp recorder + a
     `PerformanceObserver('long-animation-frame')` (buffered off — window-scoped), then script a
     real pointer drag: down on a `.stx-grab`, ~40 `mouse.move` steps over ~800 ms, up on a free
     cell. Record the drag's start/end `performance.now()` page-side.
  4. **Assert**: (a) worst rAF gap inside the drag window ≤ 50 ms — anchored on TWO measurements:
     the #72 spike (worst frame 33 ms @4× was its green) and this ticket's own planning probe
     (2026-08-07, this machine, the harness's ~31-component stage @4×: idle median 16.7 ms, drag
     p95 16.7 ms, max 16.8 ms, zero gaps over 33 ms — see NOTES). The threshold carries ~3×
     headroom over the measured healthy state while sitting far below the failure it exists to
     catch (sustained 100 ms+ jank); (b) zero long-animation-frame entries (≥ 50 ms by
     definition) overlapping the drag window. Print the full gap histogram (p50/p95/max + count
     > 33 ms) either way.
  5. **State the bounds** (AC #7): print that the frame check ran on chromium only (CDP is
     chromium-only by definition; firefox/webkit lack LoAF — probe-confirmed) and print both
     thresholds beside the numbers.
  6. `Emulation.setCPUThrottlingRate { rate: 1 }` restore before the pass ends (the context is
     closed anyway, but the restore is cheap and explicit).
- **PATTERN**: the memory's spike shape (CDP throttle + rAF gap sampling, bootstrap isolated);
  drag mechanics = the existing pointer-drag cases (~line 890 "a clean drop must STICK").
- **GOTCHA**: the drag must END on a reachable, FREE cell — at this viewport column 9 sits outside
  the 1440 px window (studio-journey's two-constraints rule, header of #209's half). Drop back to
  the origin cell's neighbour and undo afterwards so later passes see the committed board.
- **VALIDATE**: `node tooling/studio-journey.mjs chromium` → histogram prints, both frame
  assertions green.
- **SATISFIES**: AC #3, AC #7

### Task 4: ADD the dock-mid-flow case to `factoryPass` in `tooling/studio-journey.mjs`

- **IMPLEMENT**: on a fresh page, mid-replay (BEFORE settled): open the appearance dock (navigate
  to `#appearance` — the hash-routed disclosure), switch the pack to saulera via the dock's
  control, Escape to close. Assert:
  (a) the head's one `tokens.<pack>.css` line now points at saulera (pack-boot's contract);
  (b) the replay CONTINUES to `[data-replay="settled"]` and the settled board matches the
  committed board's labels (fetch `/replay/build-fieldwork-dispatch.board.json` page-side —
  replayPass case 1's idiom, reuse its shape);
  (c) **the dock interaction did NOT count as take-over** — `getReplay().tookOver === false` and
  the `/factory/took-over` route did not fire (the take-over discriminator is canvas-scoped; a
  pack switch is chrome, and this is the assertion that keeps it that way);
  (d) after settle, one move verb still works and announces (the dock left the canvas alive).
- **PATTERN**: `tooling/build-journey.mjs` lines 500–515 + 1100–1150 (the named template — dock
  open/close asserted around a flow); take-over-negative phrasing = replayPass's "Tab and the
  driver's own transport correctly NOT counting as take-over".
- **GOTCHA**: pack-boot restores a persisted pack from localStorage pre-paint — use a fresh
  context so the assertion starts from neutral; and clear the persisted choice at the end (or
  close the context) so later passes aren't skinned saulera.
- **VALIDATE**: `node tooling/studio-journey.mjs chromium` → the four dock assertions green.
- **SATISFIES**: the ticket's journey bullet ("the dock mid-flow")

### Task 5: ADD the keyboard zoom sweep to section [2] (or a sibling section) in `tooling/studio-journey.mjs`

- **IMPLEMENT**: drive each of Zoom in · Zoom out · Fit · Reset by KEYBOARD — `focus()` the button
  then `keyboard.press("Enter")` — and assert after each:
  (a) the verb happened (data-zoom / readout moved, reusing `snapshot()`);
  (b) the aria-live surface reflects it — the `.stx-zoom-level` readout is `aria-live="polite"`
  (studio-canvas.mjs:121) and Fit additionally announces via `.stx-live` ("Zoom N percent" —
  already asserted for the click path at line 299). Assert what the module actually writes; do
  NOT invent announcements the module doesn't make — if a verb's only live surface is the
  readout, asserting the readout IS the announcement assertion.
- **PATTERN**: section [2]'s own assertions; `btn(page, name)` helper (line 103).
- **GOTCHA**: reset zoom to REST at the end (section [2] does the same) so later sections' fit
  arithmetic is untouched. Run this sweep on the harness page (`/studio.html`) where section [2]
  lives — same claim, no 14 s replay tax.
- **VALIDATE**: `node tooling/studio-journey.mjs chromium` → four keyboard-activation assertions
  green.
- **SATISFIES**: AC #5 (the last verbs not yet exercised by keyboard)

### Task 6: UPDATE `tooling/studio-journey.mjs` — the honest summary line + bounds log

- **IMPLEMENT**: extend the final `·`-separated summary sentence (line 2731) with the new proofs:
  the INP budget per engine, the throttled drag histogram, the dock mid-flow, the keyboard zoom
  sweep. Add one `console.log` block near the runner that states EVERY bound the driver carries
  (frame check chromium-only · INP retry-once rule · durationThreshold 16 floor · interaction list
  is enumerated, not exhaustive of future verbs) — AC #7's "silent truncation reads as covered
  everything".
- **PATTERN**: the existing summary line's register.
- **VALIDATE**: `node tooling/studio-journey.mjs chromium 2>&1 | tail -5` → the extended summary
  prints.
- **SATISFIES**: AC #7

### Task 7: UPDATE `tooling/vt-verify.mjs` — sample after the keep rail and the take-over

- **IMPLEMENT**: inside the existing `#207` factory block (non-reduced branch, after the compile
  assertions, same page or a sibling page in the same loop): with HOOK already installed,
  (a) take over (one canvas pointerdown mid-replay on a fresh hooked page — or reuse the settled
  page and drive one move verb), then `read()` → calls still 0, zero running pseudos;
  (b) click the keep rail's copy-link (movement proven first: the URL genuinely carries `?b=`)
  and the export (movement: a download event fired — context needs `acceptDownloads: true`),
  then `read()` → calls still 0, zero pseudos.
  Comment states what this closes: the keep-rail interactions postdate the block and were never
  sampled; "zero at rest said nothing about a chain that runs afterwards" (the block's own words,
  extended to interactions).
- **PATTERN**: the factory block's exact idiom (lines 385–447): HOOK via addInitScript, `read`,
  movement-proven-first, its `t` labels' register.
- **GOTCHA**: the studio names NOTHING for view transitions (deliberate — #171's lesson), so the
  honest expected count is ZERO everywhere here; a named-group MISSING check has no studio groups
  to check — that half of AC #4 is satisfied by the /build entries that already do it, and the
  report says so rather than inventing studio groups to name.
- **VALIDATE**: `node tooling/visual-regression/serve.mjs & node tooling/vt-verify.mjs chromium`
  → new assertions green; then `all`.
- **SATISFIES**: AC #4

### Task 8: The WCAG audit — record, and fix-or-ticket anything red

- **IMPLEMENT**: a table in the report (Task 10) enumerating every canvas verb × its paths, each
  cell citing the driver assertion that proves it:
  rows = move (pointer drag · click-move-click SC 2.5.7 · keyboard SC 2.1.1) · undo · redo ·
  zoom ×4 · pan (scroll/Tab) · compile · revert · transport pause/resume/step/seek (SC 2.2.2) ·
  keep copy · export · take-over;
  columns = pointer path · single-pointer path · keyboard path · announcement asserted at ·
  driver line.
  The verbs' header (studio-verbs.mjs:1–50) records which SC each path satisfies — the audit
  QUOTES those claims and points at the assertion that proves each. SC 2.2.2: the replay is
  auto-moving content; pause/step/seek exist, are keyboard-driven and announced (replayPass) —
  cite it. Any cell with no proof: fix it in this PR if it's a driver gap, or open a ticket if
  it's a product gap, and record which (AC #6's fix-or-ticket clause).
- **PATTERN**: #177's "copy audit table committed in the report" precedent.
- **VALIDATE**: every table cell names a `tooling/studio-journey.mjs` line that exists (spot-check
  three with `sed -n`).
- **SATISFIES**: AC #6, and the epic's Accessibility success-metric row

### Task 9: The red-run proof (AC #1) — break a verb, watch red, restore

- **IMPLEMENT**: temporarily invert one real condition in `system/studio-verbs.mjs` (e.g. make the
  keyboard drop commit the PICKED-UP slot instead of the stepped one — the class of bug the driver
  exists for), run `node tooling/studio-journey.mjs chromium`, capture the named red assertion(s)
  into the report, `git checkout -- system/studio-verbs.mjs`, re-run green. ALSO capture one INP
  red: lower the budget constant to 1 ms for one run (or use the self-test control's output) and
  record the named failure. Both transcripts (trimmed) go in the report.
- **PATTERN**: memory `check-that-cannot-fail` — mutate the source, run the function.
- **GOTCHA**: verify `git status` is clean after the restore — nothing of the mutation may reach
  the commit.
- **VALIDATE**: `git diff --stat system/` → empty; report carries both red transcripts.
- **SATISFIES**: AC #1

### Task 10: CREATE `.claude/reports/studio-gates-213-report.md` + UPDATE `CLAUDE.md`

- **IMPLEMENT**:
  - Report: per-engine INP table (every interaction · ms · pass/floor/retried) · the chromium
    frame histogram + thresholds · the WCAG audit table (Task 8) · the two red-run transcripts
    (Task 9) · the bounds table (Task 6's list, restated) · the scope-reality note (which ticket
    bullets were pre-satisfied by #204–#210 and where).
  - CLAUDE.md: extend the `tooling/studio-journey.mjs` row with #213's sentence — the INP ≤ 200 ms
    budget asserted per interaction per engine via a driver-injected PerformanceObserver (helper:
    `tooling/inp-observer.mjs` — never shipped), the 4×-CDP-throttled drag frame check
    (chromium-only, stated), the dock mid-flow with its not-a-take-over assertion, and the
    keyboard zoom sweep. Extend the `tooling/vt-verify.mjs` row with one clause: the factory block
    now samples after the take-over and the keep-rail clicks. Match the rows' existing density; no
    new top-level row except if the INP helper warrants its own line (it doesn't — it lives inside
    the studio-journey sentence).
- **PATTERN**: report register = `.claude/reports/view-transitions-sitewide-172-report.md`;
  CLAUDE.md rows = the surrounding tooling rows' voice.
- **VALIDATE**: `node tooling/build-checks.mjs` (must stay green — nothing pure changed) and read
  the CLAUDE.md diff for row-register fit.
- **SATISFIES**: AC #6 (recorded), ticket's "docs rows in CLAUDE.md"

---

## TESTING STRATEGY

There is no unit-test suite (repo rule: "run the surface you touched"). The deliverable IS the
test layer, so the strategy is: prove the new gates can fail (Task 2's self-test control, Task 9's
mutation runs), then prove they pass on all three engines.

### Edge Cases

- An interaction under 16 ms produces no entry → printed as below-floor PASS. This is the common
  case (probe-verified), and it is made non-vacuous by the forced-slow calibration click (Task 2
  step 1), which proves the delivery pipeline alive on every engine before any row is trusted.
- The calibration page's busy-wait listener must never reach a measured page → throwaway page,
  closed before measurement.
- The dock case must not poison later passes: fresh context, persisted pack cleared.
- The throttled drag must not leave the board moved: undo after, or drag back.
- An over-budget INP on a loaded operator machine → one logged retry on a fresh page, never a
  silent one.

---

## VALIDATION COMMANDS

### Level 1: Syntax

- `node --check tooling/inp-observer.mjs && node --check tooling/studio-journey.mjs && node --check tooling/vt-verify.mjs`

### Level 2: Pure helper

- The Task 1 `node -e` one-liner (summarize + violations, both directions).

### Level 3: The drivers, per engine then all

- `node tooling/visual-regression/serve.mjs &` (repo root on 127.0.0.1:4757)
- `node tooling/studio-journey.mjs chromium` → then `firefox`, `webkit`, then `all`
- `node tooling/vt-verify.mjs all`
- `node tooling/build-checks.mjs` (unchanged, must stay green — proves nothing pure regressed)

### Level 4: Manual validation

- Read the printed per-engine INP tables — numbers plausible (single-digit-to-low-tens ms for
  clicks, compile the largest), no row silently absent from the table.
- The red-run proofs (Task 9): both reds observed with named assertions, working tree clean after.

### Level 5: The flake discriminator

- If any engine goes red on a re-run with no diff: memory `build-journey-failure-vs-flake` —
  stash and run HEAD to tell a flake signature from a regression before touching thresholds.

---

## ACCEPTANCE CRITERIA

- [ ] AC #1 — driver green on chromium + firefox + webkit; the broken-verb red run recorded in the
      report with the named assertion, tree restored.
- [ ] AC #2 — INP measured per named interaction, reported per engine, ≤ 200 ms ASSERTED (a red is
      a failed run, not a printed number).
- [ ] AC #3 — the drag checked for dropped frames under 4× CDP throttle (worst gap ≤ 50 ms, zero
      LoAF in the drag window), histogram printed.
- [ ] AC #4 — vt-verify's studio coverage extended to the take-over + keep-rail interactions with
      honest zero counts, movement proven first; the named-group MISSING property noted as owned
      by the /build entries (the studio deliberately names nothing).
- [ ] AC #5 — every canvas verb keyboard-exercised (zoom ×4 were the gap) with its live surface
      asserted.
- [ ] AC #6 — the WCAG 2.5.7/2.1.1/2.2.2 audit table in the report, every cell citing its proving
      assertion; failures fixed or ticketed.
- [ ] AC #7 — every bound printed by the driver itself (chromium-only frame check, retry rule,
      observer floor, enumerated interaction list) and restated in the report.
- [ ] No shipped file changed (unless Task 8 found a product a11y gap — then that change carries
      its own cascade: VR baselines etc., see memory `visual-regression-baseline-trap`).
- [ ] PR body carries `Closes #213`; plan + report + review artifacts committed in the same PR.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each task's validation ran at the time.
- [ ] `node tooling/studio-journey.mjs all` green (three engines).
- [ ] `node tooling/vt-verify.mjs all` green.
- [ ] `node tooling/build-checks.mjs` green.
- [ ] `git status` clean of Task 9's mutations; branch is `feat/213-studio-gates`.
- [ ] Report + CLAUDE.md rows written; summary line extended.

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **RESOLVED — frame-budget thresholds (worst gap ≤ 50 ms @4×, zero LoAF ≥ 50 ms).** Now backed
   by two measurements: the #72 spike (33 ms worst @4× green) and this ticket's planning probe
   (drag max 16.8 ms @4× on the harness stage — NOTES). ~3× headroom over healthy, far below the
   100 ms+ jank it exists to catch. The histogram prints either way, so tightening later is one
   constant with data in hand. /factory's settled board (4 places) is LIGHTER than the probed
   31-component harness, so the probe bounds the heavier case.
2. **Perf pass default-on** (vs a `--perf` flag) — default-on, because the ticket says "asserted,
   not printed"; the bounded logged retry is the flake valve, and the probe showed the common
   case passes at the observer floor (no timing sensitivity at all for most rows). If routine
   runs still prove noisy, gating later is a two-line change.
3. **RESOLVED — scripted input generates event-timing entries.** Verified end-to-end on the real
   studio surface (probe 3, NOTES): all three engines emit entries with correct non-zero
   `interactionId` grouping once an interaction crosses the 16 ms floor. The residual "engine
   emits nothing" risk is retired; the calibration click keeps it retired against future engine
   bumps.
4. **Assumption:** #212 (flows) has not landed when this implements — the interaction list
   excludes flow verbs. If #212 lands first, add its verbs to INTERACTIONS (the list is the
   designed extension point).

## NOTES (open canvas)

**Probe 1 — API presence (2026-08-07, this machine, the VR-pinned Playwright):**

```
chromium {hasEvent:true, hasFirstInput:true, hasLoAF:true,  interactionId:true}
firefox  {hasEvent:true, hasFirstInput:true, hasLoAF:false, interactionId:true}
webkit   {hasEvent:true, hasFirstInput:true, hasLoAF:false, interactionId:true}
```

This kills the fallback-proxy design a pre-research plan would have carried (double-rAF timing for
engines without Event Timing) — not needed. LoAF absent outside chromium is irrelevant: it is only
used inside the CDP-throttled check, which is chromium-only by definition.

**Probe 2 — scripted input on the real surface (/studio.html, observer injected, zoom click +
Tab):** chromium emitted entries with two non-zero ids (plus id-0 hover noise); firefox emitted
ZERO entries; webkit only the keydown. **Probe 3 resolved the ambiguity**: with a driver-injected
35 ms busy-wait listener forcing interactions past the floor, BOTH firefox and webkit emitted
full, correctly-grouped entry sets:

```
firefox  pointerdown:48#2368 pointerup:40#2368 click:40#2368 · keydown:32#2375 keypress:40#2375 (mouse* at #0)
webkit   pointerdown:48#2536 pointerup:48#2536 click:48#2536 · keydown:40#2543 keyup:16#2543 (mouse*/hover at #0)
```

Three design consequences, all folded into Task 2: (1) the empty firefox result was a FAST page,
not a broken engine — so "no entry = below-floor pass" is the common case and the sanity check
must use a forced-slow calibration click, never a bare click (a bare-click sanity check fails
healthy pages — the probe caught this design bug before it shipped); (2) grouping by non-zero
`interactionId` is verified correct on all three engines (mouse-alias events carry 0 by spec);
(3) `performance.getEntriesByType("event")` returned EMPTY on all three engines while the
observer received entries — only an observer sees event timing, never the timeline.

**Probe 4 — the CDP-throttled drag (chromium, /studio.html's 31-component stage, rate 4, 40-step
scripted drag):**

```
idleMedian 16.7ms · frames 82 · p50 16.7 · p95 16.7 · max 16.8 · over33 0 · over50 0
```

`Emulation.setCPUThrottlingRate` works through `ctx.newCDPSession(page)` exactly as planned, the
rAF sampler shape is proven, and the 50 ms threshold carries ~3× headroom over the measured
healthy worst on a stage HEAVIER than /factory's settled 4-place board.

**Why the observer is driver-injected, not shipped:** #177's old phrasing ("small observer hooks
where needed") predates the studio. Shipping an observer would put measurement code on zero-dep
pages for a gate only the operator runs — `addInitScript` gives the identical measurement with
zero shipped bytes, and keeps the VR baselines untouched. This is the plan's one deliberate
divergence from the folded ticket's letter, in service of its intent.

**Why perfPass lives in studio-journey rather than a new tooling file:** the ticket names the
journey driver as the home ("asserted in a studio journey driver"), the pass reuses the file's
context/watch/settled idioms, and a fifth operator-run driver would need its own serve
choreography and CLAUDE.md row for no added power. The helper (`inp-observer.mjs`) is separate
only because its pure half must be drivable synthetically for the self-test control.

**Alternatives weighed:**
- *web-vitals library for INP* — rejected: a dependency, and the repo's zero-dep rule for tooling
  ("stays zero-dep Node ESM where possible"); the raw observer is ~15 lines.
- *Asserting INP as one page-wide max* (true INP is the worst interaction over a visit) — rejected
  for the gate: per-interaction assertion names the offending verb on red (#177's AC 1 wanted
  "failures name the widget + measured ms"); the page-wide max is derivable from the table.
- *A build-checks group for the helper* — rejected: the self-test control inside perfPass proves
  the comparator can fail where it is used; a CI group would import a tooling file into the pure
  gate for no CI-reachable claim.

**Sizing:** inp-observer ~80 · perfPass ~250–330 (INP + throttle) · dock case ~60 · zoom sweep
~40 · vt-verify ~40 · summary/bounds ~20 · report ~150. Comfortably inside the ticket's
~800–1000 estimate even with the driver pre-existing.

**De-risking record (planning phase, 2026-08-07) — confidence 9.5/10.** Every mechanism this plan
introduces was executed for real before the plan was finalized: the observer init script, the
flush protocol, the interactionId grouping, the calibration technique, `newCDPSession` +
`setCPUThrottlingRate`, and the rAF gap sampler all ran green against the real studio surface on
all applicable engines (probes 1–4 above). What remains unexecuted is composition, not mechanism:
wiring the probed pieces into the driver's existing idioms (cited by line), the vt-verify block
extension (an idiom repeat), and the audit/report writing. The residual half-point: /factory's
full interaction table (16 rows × 3 engines × the 14 s replay) has more surface area for an
ordering mistake than any probe covers — mitigated by the per-task validation commands running
chromium-first after each task, and by the flake discriminator (memory
`build-journey-failure-vs-flake`) if a threshold ever reds on a loaded machine.

## AMENDMENTS

<!-- append-only; newest at the bottom -->
