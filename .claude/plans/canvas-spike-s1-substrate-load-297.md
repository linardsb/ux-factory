# Feature: S1 — the free-position substrate under load

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A **throwaway measurement harness** and its Playwright driver, run once, to answer one question before
the canvas swap PR is written: does a free-position DOM stage — continuous `--sx-scale`, ~30 frames
positioned by `--x/--y` + `transform: translate`, each a real token-skinned composition, with an SVG
arrow overlay whose geometry is derived on every move — hold **INP ≤ 200 ms and no dropped frames
during drag** on Chromium, Firefox and WebKit?

Nothing ships. The deliverable is a README with numbers, and a verdict comment on epic #295 that names
which branch of the decision rule was taken.

## User Story

As **the owner about to write a one-way swap PR**
I want **the substrate's performance answer measured before the grid is deleted**
So that **T2/T4/T5 either land as written, or land with arrow-deferral as a required part, or the swap
is not written at all — decided on numbers instead of on hope**.

## Problem Statement

The swap PR (`canvas-swap-pr-brief.md`) deletes the grid substrate and rewrites seven build-checks
groups in one PR, because the door is one-way and half-open is red. Its three new properties —
continuous scale (T2), translate-positioned nodes (T4), derived arrow geometry (T5) — were never
measured. #204's grid pass measured `data-col`/`data-row` with a **five-step zoom table**; none of the
three new things existed then. If the DOM stage cannot hold ~30 free-positioned frames, that reopens
T1 (the whole substrate choice), and the cheapest moment to learn it is before the grid is gone.

## Solution Statement

A half-day experiment, sequenced so it can be cut back rather than extended:

1. A harness page `.claude/plans/canvas-spike-s1/harness.html` (tracked; inline `<script type="module">`)
   that builds the free-position stage out of the **real** `system/agentic-renderer.mjs`,
   `system/action-bus.mjs`, `handoff/verdant/vocabulary.json` (validate + render) and
   `handoff/verdant/pack.json` (the committed `example` props). Configuration by query string.
2. A Playwright driver (authored and run from the scratchpad as `.mjs`, **parked in the repo as
   `driver.txt`**) that injects `tooling/inp-observer.mjs`'s `OBSERVER_INIT`, scripts the four
   gestures, and prints a table per engine per configuration.
3. Three configurations — (a) bare · (b) + `content-visibility: auto` + `contain-intrinsic-size` ·
   (c) + arrow redraw deferred to one rAF per gesture and to `scrollend` on pan — **each with a
   positive control proving the configuration is actually in effect**.
4. A README in spike C's shape, and the verdict posted to epic #295.

## Out of Scope / Non-Goals

- **Not included:** any real substrate code. Nothing under `system/`, `tooling/`, `agent-layer/` or
  `handoff/` is added, edited or deleted. The harness only *reads* those modules over HTTP.
- **Not included:** a gate. No build-checks group, no journey-driver change, no CI registration. The
  driver is run by hand, once, and its numbers go in the README.
- **Not changing:** `tooling/studio-journey.mjs`'s existing INP gate. It keeps running against the
  shipped `/factory`; it is rewritten in the swap PR, not here.
- **Not included:** announcements, keyboard paths, focus management, undo, selection, marquee
  *semantics*. A marquee-drag here is five frames moving together — the cheapest way to make a drag
  five times heavier — not #217's selection contract.
- **Not included:** auto-arrange (T5's rank layout), arrow *binding* rules (Excalidraw's shape), or
  any op grammar. Arrows here are geometry under load, nothing more.
- **Not deciding:** T1's verdict. The spike only reports the branch; reopening T1 goes to the owner.

## Feature Metadata

**Feature Type**: Spike (throwaway experiment with a decision rule)
**Estimated Complexity**: Medium — the code is simple and disposable; the *measurement discipline* is
where it goes wrong.
**Primary Systems Affected**: none (read-only consumers: `system/agentic-renderer.mjs`,
`system/action-bus.mjs`, `handoff/verdant/{vocabulary,pack}.json`, `tooling/inp-observer.mjs`,
`tooling/visual-regression/serve.mjs`)
**Dependencies**: Playwright, resolved from `tooling/visual-regression/node_modules` (already
installed; all three engines present — observed below). Never becomes a repo dependency.

## Related Work

**Implements**: [#297](https://github.com/linardsb/ux-factory/issues/297) · **Epic**:
[#295](https://github.com/linardsb/ux-factory/issues/295), `docs/epics/canvas-design-import.architecture.md`
§ Stack (T1, T2, T4, T5, T7) and § Spikes (S1)

**Back-references**:

- `.claude/plans/canvas-spike-s1-substrate-load.md` — the **pre-slice spike design**. Its Question,
  Shape, Decision rule, Output and Not-in-scope are inherited verbatim; this plan is its executable
  form. Two of its literals are corrected in pre-flight (see NOTES P1, P2). **Leave that file alone.**
- `.claude/plans/studio-canvas-stage-204.md` — spike 2, the grid substrate's own load pass, folded
  into #204 Task 1. The precedent this spike extends.
- `.claude/plans/canvas-swap-pr-brief.md` — the PR this gates. Not written until S1's verdict exists.
- `.claude/plans/canvas-pre-slice-sequence.md` — where S1 sits in the pre-slice order.
- `.claude/plans/design-import-spike-c/README.md` — **the README shape this one copies**: Verdicts
  table first, then Setup, Timings, the numbers, Caveats, What was not done.

**Forward-references**:

- (none yet — `canvas-swap-pr-brief.md` gains one when it is planned against this verdict)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.claude/plans/canvas-spike-s1-substrate-load.md` (all 68 lines) — Why: the spike design. The
  Question, the three configurations, the four gestures, the decision rule and the Output section are
  not re-decided here.
- `tooling/inp-observer.mjs` (all 54 lines) — Why: the **whole** measurement contract. Its header
  carries the three facts that decide the matrix below: the 16 ms `durationThreshold` floor; one
  interaction = every entry sharing a **non-zero** `interactionId`, latency = the MAX in the group;
  **id-0 rows are dropped by spec**. Import `OBSERVER_INIT`, `summarize`, `violations` — never
  re-implement them (`studio-journey.mjs:6254` states why).
- `tooling/studio-journey.mjs:5945–5980` (`perfPass` head, the context + calibration click) — Why:
  the exact setup to MIRROR — `ctx.addInitScript(OBSERVER_INIT)`, the `flush` double-rAF + 150 ms,
  `entriesFrom`/`count`, and the forced-slow calibration click that makes an empty INP row a pass
  instead of a dead pipeline.
- `tooling/studio-journey.mjs:6305–6405` (the throttled-drag leg) — Why: the rAF-gap + LoAF sampler
  and its **thresholds, inherited verbatim**: worst rAF gap ≤ 50 ms, zero LoAF (≥ 50 ms) in the drag
  window; idle-baseline first; `t0`/`t1` window filter; movement proven before "no dropped frames"
  is believed (`:6399`). Also the 500 ms settle-before-sampling rule.
- `tooling/studio-journey.mjs:33–44` — Why: the Playwright resolution idiom, copied exactly
  (`createRequire(`${VRDIR}${path.sep}`)` → `require("@playwright/test")`), plus the `BASE` env
  override.
- `system/studio.css:62–91` (`.stx-sizer` + `.stx-stage`) — Why: **the stage arithmetic to mirror,
  not re-derive.** A scaled child's contribution to scrollable overflow is right/bottom only and
  inconsistent across engines, so the sizer declares the extent explicitly and the stage is taken
  **out of flow** (`position:absolute`) inside it, `transform-origin: 0 0`. The free-position version
  changes only what the extent is computed from (content bounding box, not cols×slot).
- `system/studio.css:20–42` — Why: the real numbers. `--stx-slot-w: 220px`, `--stx-slot-h: 140px`,
  `--stx-gap: var(--spacing-md, 16px)`, and the five-step `data-zoom` → `--stx-scale` table this
  spike replaces with a continuous value.
- `system/agentic-renderer.mjs:1–30` and `:540–563` — Why: the two exports and their signatures —
  `validateComposition(vocab, composition, path?)` (pure, throws naming the path) and
  `renderComposition(vocab, composition, bus, path?)`. The vocabulary is **passed as an argument, not
  fetched** — the caller owns loading.
- `system/action-bus.mjs:41` — Why: `createBus()` is the only export the harness needs;
  `renderComposition` requires a real bus.
- `handoff/verdant/pack.json` — Why: **`components` is an ARRAY of 20 entries**, each
  `{component, status, class, contract, props, tokens, states, children, example, sections}`. This is
  where the committed `example` props live. (`system/catalog.mjs:303` reads `component.example` from
  exactly this.)
- `handoff/verdant/vocabulary.json` — Why: `components` is an **object** keyed by name, and it has
  **no `example` key on any entry** (observed). It is the validate/render input only. Its
  `composition.childrenRule` is the constraint the harness's frames must obey: *"a node may carry at
  most one child, only when its vocabulary entry lists allowed children"* — so a 3–4 part frame is an
  **array of root nodes**, not a nested tree.
- `tooling/visual-regression/serve.mjs` (all 40 lines) — Why: the static server. Roots the repo root,
  serves `.mjs` as `text/javascript`, honours `PORT`, and reaches `.claude/plans/…` (all three
  observed in pre-flight P3). Python's `http.server` is not needed.
- `system/catalog.mjs:558–578` — Why: the load pattern for the same artifacts (`pack.json`,
  `vocabulary.json`), and the proof that rendering from `example` props works in a browser.

### New Files to Create

- `.claude/plans/canvas-spike-s1/harness.html` — the throwaway free-position stage. Tracked. Inline
  `<script type="module">`; **no `.mjs` beside it** (AC #3).
- `.claude/plans/canvas-spike-s1/driver.txt` — the Playwright driver's source, **parked as `.txt`**
  per the ticket. Authored and run from the scratchpad as `.mjs`; the final copy is parked here.
- `.claude/plans/canvas-spike-s1/README.md` — **the deliverable** (AC #1), in spike C's shape.
- `.claude/plans/canvas-spike-s1/raw/` — the driver's verbatim stdout per run, one `.txt` per engine
  leg, so every number in the README is traceable (spike C's numbered-files discipline).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [web.dev — Interaction to Next Paint (INP)](https://web.dev/articles/inp#what-is-a-good-inp-score)
  - Specific section: what counts as an interaction, and the 200 ms "good" threshold.
  - Why: the budget's provenance, and the definition `summarize()` implements.
- [MDN — PerformanceEventTiming.interactionId](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId)
  - Specific section: "a value of 0 … the event was not generated by a user interaction" — only
    pointer and keyboard events get a non-zero id.
  - Why: **this is why wheel-zoom and pan have no INP row at all.** See the matrix below.
- [MDN — `content-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility#skipping_rendering_work_with_content-visibility)
  - Specific section: `contain-intrinsic-size` and why `auto` without it collapses layout.
  - Why: configuration (b) is a no-op without a concrete `contain-intrinsic-size`, and a no-op that
    "passes" is the failure mode this plan's positive control exists to catch.
- [MDN — `scrollend` event](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event)
  - Why: configuration (c)'s pan half. T7 adopts it; check it fires on all three engines here rather
    than in the swap PR.
- [MDN — `vector-effect: non-scaling-stroke`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/vector-effect)
  - Why: the arrow overlay sits **inside** the scaled stage (stage coordinates, no rescale maths), so
    its strokes would scale with it.
- [Chrome DevTools Protocol — `Emulation.setCPUThrottlingRate`](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setCPUThrottlingRate)
  - Why: the 4× base-spec proxy. Chromium-only by definition — state it, don't imply it.

### Patterns to Follow

**Playwright resolution** (`tooling/studio-journey.mjs:33–44`, copied verbatim):

```js
import { createRequire } from "node:module";
import path from "node:path";
const VRDIR = "/Users/Berzins/Desktop/Linards_current/ux-factory/tooling/visual-regression";
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");
const BASE = process.env.BASE || "http://127.0.0.1:4759";
```

**The observer, injected before any page module evaluates** (`studio-journey.mjs:5954–5955`):

```js
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(OBSERVER_INIT);
```

**Flush before reading — probe-verified, not optional** (`studio-journey.mjs:5946–5951`):

```js
const flush = async (p) => {
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.waitForTimeout(150);
};
const entriesFrom = (p, from) => p.evaluate((i) => window.__studioINP.slice(i), from);
```

**The rAF-gap sampler** (`studio-journey.mjs:6352–6392`) — the cross-engine dropped-frame metric.
Idle baseline first, window-scoped LoAF observer with `buffered` OFF, then filter frames to `[t0, t1]`:

```js
const inWindow = sampled.frames.filter((v) => v >= t0 && v <= t1);
const gaps = inWindow.slice(1).map((v, i) => v - inWindow[i]).sort((a, b) => a - b);
const worst = gaps[gaps.length - 1] ?? 0;   // threshold: ≤ 50 ms
```

**Movement proven before "no dropped frames" is believed** (`studio-journey.mjs:6398–6400`) — the
single most important line to copy:

```js
// "no dropped frames" is trivially true of a drag that never engaged.
t("the drag genuinely moved the frame — the sampled window holds a real gesture", movedX !== startX, …);
```

**The stage arithmetic** (`system/studio.css:62–91`), adapted to free positioning:

```css
.sx-sizer { position: relative;
            width:  calc(var(--sx-content-w) * var(--sx-scale));
            height: calc(var(--sx-content-h) * var(--sx-scale)); }
.sx-stage { position: absolute; top: 0; left: 0;
            width: var(--sx-content-w); height: var(--sx-content-h);
            transform: scale(var(--sx-scale)); transform-origin: 0 0; }
.sx-frame { position: absolute; top: 0; left: 0;
            transform: translate(var(--x), var(--y)); width: var(--sx-frame-w); }
```

**Naming:** the harness is a throwaway, so it uses its own `sx-` / `--sx-*` prefix. It deliberately
does **not** reuse `stx-` — same-prefix classes would make a future grep for the real substrate return
spike code, and `system/studio.css` is not loaded here anyway.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. The ordering here is not cosmetic: it is what makes the ticket's **two-hour
cut rule** executable. Phase 1 produces one real number end to end on one engine with two frames; every
later phase adds one dimension. If the harness is not measuring at the two-hour mark, you stop at
whatever phase completed and write the README with what you have — never extend the box.

### Phase 1: One number, end to end

Two frames, one arrow, one drag, chromium, configuration (a). The point is the *pipeline*: server →
harness → real renderer → injected observer → a grouped INP entry with a non-zero `interactionId`.

**Tasks:** serve; harness skeleton; two real compositions; one arrow; drag; driver; calibration click;
one printed INP row.

### Phase 2: The load — ~30 frames, ~30 arrows

**Depends on:** Phase 1 (the pipeline must be proven before scale is added, or a zero is ambiguous).

Scale to ~30 frames from the 20 committed examples, 3–4 parts each, ~30 arrows re-routed on every
pointermove. Record the DOM node count. Run configuration (a) on chromium: the first real answer.

### Phase 3: Configurations (b) and (c), each with its positive control

**Depends on:** Phase 2.
**Independent of:** Phase 4's other engines — but do **not** parallelise them; run (a)/(b)/(c) on
chromium first, so the full three-engine matrix runs only over configurations that are proven to be in
effect.

This is where the decision rule breaks silently. If (a) fails and (b) "passes" because
`content-visibility` never culled anything, the swap PR ships on noise.

### Phase 4: The full matrix — three engines × four gestures × the configurations that matter

**Depends on:** Phase 3.

Firefox and WebKit unthrottled (read as the **engine-difference** signal, never the hardware signal);
chromium additionally under CDP 4× CPU throttle as the base-spec proxy.

### Phase 5: The write-up and the verdict

**Depends on:** Phase 4 (or on whatever the cut rule stopped at).

README in spike C's shape; the verdict line and the branch taken posted to epic #295 **before #302 is
planned**.

---

### The measurement matrix — read this before writing the driver

`summarize()` drops every entry with a falsy `interactionId` (`tooling/inp-observer.mjs:38`), and per
the Event Timing spec only pointer and keyboard events carry a non-zero one. **Two of the four gestures
therefore yield zero INP rows on all three engines, and that is correct, not a broken harness.**

| gesture | INP (×3 engines) | rAF-gap (×3 engines) | LoAF + 4× CPU (chromium) |
|---|---|---|---|
| drag one frame @ scale 1.0 | **yes** | yes | yes |
| drag one frame @ scale 0.5 | **yes** | yes | yes |
| marquee-drag five frames | **yes** | yes | yes |
| ⌘-wheel zoom 0.25 → 2 → 0.25 | **n/a by spec** (wheel has no `interactionId`) | yes | yes |
| pan the full extent | **n/a by spec** (scroll is not an interaction) | yes | yes |

The **rAF-gap sampler is the portable cross-engine metric** and is what "zero dropped frames" is
measured with everywhere. The decision rule's budget clause — "INP ≤ 200 ms **and zero dropped frames
during drag**" — is already scoped to drags, so zoom and pan get recorded numbers and a caveat line,
not a gate cell. This needs no reopening with the owner; it is what the rule already says.

Print `n/a (no interactionId by spec — wheel/scroll)` in those cells. **Never print `0 ms`** — a
reader cannot tell that from a fast interaction, and the whole spike is a number somebody trusts later.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

- **CREATE / UPDATE / ADD / REMOVE / REFACTOR / MIRROR** as usual.

---

### CREATE the working directories

- **IMPLEMENT**: `mkdir -p .claude/plans/canvas-spike-s1/raw` in the repo, and a scratch dir for the
  runnable driver: `$SCRATCH=/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/6c1721a4-8d8d-4cfb-9541-9fcf289e2ab4/scratchpad/s1`.
- **PATTERN**: `.claude/plans/design-import-spike-c/` — a spike dir holding numbered raw outputs plus
  one `README.md`.
- **GOTCHA**: the driver is authored at `$SCRATCH/driver.mjs` and **run from there**. It is copied to
  `.claude/plans/canvas-spike-s1/driver.txt` at the end. You cannot `node driver.txt` — Node refuses a
  non-`.mjs`/`.js` extension as a module entry; parking it as `.txt` is a *storage* decision, not a run
  path. (Ticket: "driver script parked as `.txt`".)
- **VALIDATE**: `ls -d .claude/plans/canvas-spike-s1/raw "$SCRATCH"`
- **REDDENS**: n/a (no check added).
- **SATISFIES**: AC #1, AC #3.
- **REGENERATES**: none. `agent-layer/gen-loc-summary.mjs`'s three groups are
  `^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$`, `^agent-layer/[^/]+\.mjs$`
  (observed at `:22–26`), and the grand totals are summed **from group members only** (`:37–48`).
  Nothing under `.claude/plans/` matches any of them. No VR baselines (no shipped page changes), no
  `param-count` (no live control on a shipped page), no `gen-handoff` (no token change).

---

### START the static server on a non-default port

- **IMPLEMENT**: `PORT=4759 node tooling/visual-regression/serve.mjs &`, then **curl-verify** one file
  before trusting it.
- **PATTERN**: `tooling/visual-regression/serve.mjs:11` — `const PORT = Number(process.env.PORT || 4757)`.
- **GOTCHA**: memory `stale-serve-wrong-tree` — parallel sessions hold 4757 for days serving **their**
  tree. Never use the default port for this spike, and never trust a 200 without checking the bytes.
- **GOTCHA**: kill it by **port**, never by pattern — memory `portal-smoke-port-scoped-kill`.
  `lsof -ti:4759 | xargs -r kill`. A `pkill -f 'node ... serve'` takes down a sibling session's gate.
- **VALIDATE** (observed in pre-flight, re-run before each leg):
  ```
  curl -sI http://127.0.0.1:4759/system/agentic-renderer.mjs | head -2
  # → HTTP/1.1 200 OK / content-type: text/javascript
  curl -sI http://127.0.0.1:4759/handoff/verdant/pack.json | head -2
  # → HTTP/1.1 200 OK / content-type: application/json
  curl -s http://127.0.0.1:4759/.claude/plans/canvas-spike-s1/harness.html | head -1
  # → <!doctype html>   (proves it is serving THIS tree, not a stale one)
  ```
- **REDDENS**: n/a.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

---

### CREATE `.claude/plans/canvas-spike-s1/harness.html` — the stage skeleton (Phase 1)

- **IMPLEMENT**: one file, one inline `<script type="module">`. Head links
  `/system/tokens.contract.css`, `/system/tokens.neutral.css`, `/system/components.css` — the real
  three-layer contract, so the frames are genuinely token-skinned. **Do not** link
  `/system/studio.css`: it carries the grid substrate this spike replaces. All stage CSS is a
  `<style>` block in this file, `sx-` prefixed.
  Query string is the whole configuration surface:
  `?cfg=a|b|c` (default `a`) · `?frames=<n>` (default `30`) · `?scale=<f>` (default `1`).
  Set `data-cfg` on `<html>` from the query so CSS can branch and the driver can read it back.
- **PATTERN**: `system/studio.css:62–91` for the sizer/stage split, mirrored exactly (see Patterns
  above). `transform-origin: 0 0` and `position: absolute` on the stage are both load-bearing: a
  scaled child's overflow contribution is right/bottom only and inconsistent across engines, which is
  precisely why the sizer declares the extent.
- **IMPORTS**: none yet — Phase 1 skeleton only. Frames arrive in the next task.
- **GOTCHA**: `--x`/`--y` must be **registered or unit-carrying**. `transform: translate(var(--x), var(--y))`
  needs lengths; write them as `"320px"`, not `320`. (No `@property` — that would make the spike measure
  a registered-custom-property animation path the swap PR has not decided on.)
- **GOTCHA**: give `.sx-scroll` a fixed height (`min(70vh, 640px)`, as `studio.css:55` does) or "pan
  the full extent" has nothing to pan inside.
- **VALIDATE** (expected — the file is being created):
  ```
  curl -s http://127.0.0.1:4759/.claude/plans/canvas-spike-s1/harness.html | grep -c 'type="module"'   # 1
  node -e 'const s=require("fs").readFileSync(".claude/plans/canvas-spike-s1/harness.html","utf8");
    if (/src=["'"'"'][^"'"'"']*\.mjs/.test(s)) throw new Error("AC #3: the harness must not load a sibling .mjs");
    console.log("AC #3 ok")'
  ```
- **REDDENS**: add `<script src="./helper.mjs">` to the harness → the `node -e` above throws
  `AC #3: the harness must not load a sibling .mjs`.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

---

### ADD the real compositions to the harness (Phase 1 → 2)

- **IMPLEMENT**: in the inline module —
  ```js
  import { renderComposition } from "/system/agentic-renderer.mjs";
  import { createBus }         from "/system/action-bus.mjs";
  const [vocab, pack] = await Promise.all([
    fetch("/handoff/verdant/vocabulary.json").then((r) => r.json()),
    fetch("/handoff/verdant/pack.json").then((r) => r.json()),
  ]);
  const EXAMPLES = new Map(pack.components.map((c) => [c.component, c.example]));
  const bus = createBus();
  ```
  Build each frame as an **array of 3–4 root nodes** drawn deterministically (index modulo) from the
  20 committed examples — e.g. `[{name:"screen-header",props:EXAMPLES.get("screen-header")},
  {name:"metric-tile",…}, {name:"list-row",…}, {name:"primary-button",…}]` — then
  `frameEl.append(renderComposition(vocab, comp, bus))`. Start at 2 frames (Phase 1), then `?frames=30`.
- **PATTERN**: `system/catalog.mjs:303–305` reads `component.example` from exactly these entries and
  `:472` renders from it; `:573–575` loads `pack.json` + `vocabulary.json` the same way.
- **GOTCHA — the plan and the ticket are both wrong on this one.** They say the examples come from
  `handoff/verdant/vocabulary.json`. **They do not.** Observed: `vocabulary.json`'s `components` is an
  object keyed by name with **zero** entries carrying `example`; `pack.json`'s `components` is an
  **array** of 20 `{component, …, example}` entries, all 20 carrying one. You need **both** files —
  `vocabulary.json` for validate/render, `pack.json` for the props.
- **GOTCHA**: `vocabulary.json`'s `composition.childrenRule` — *"a node may carry at most one child,
  only when its vocabulary entry lists allowed children"*. Only `card` (`metric-tile|list-row|sequence-step`),
  `care-task-row` (`status-chip`), `empty-state` (`ghost-button`) and `plant-card` (`status-chip`)
  accept any child, and never more than one. **A 3–4 part frame is an array of roots, not a tree** —
  nest and `validateComposition` throws.
- **GOTCHA**: `chipRule` — `plant-card` and `care-task-row` already render their own `status-chip`.
  Don't add one; an explicit child's `value` must equal the parent's `status` or it throws.
- **GOTCHA**: `renderComposition(vocab, composition, bus)` takes the bus as the **third** argument and
  requires a real one. `createBus()` is `system/action-bus.mjs`'s only export (`:41`).
- **VALIDATE** (expected): open the harness in a real browser and check the console is clean, then
  ```
  # in the driver, page-side:
  document.querySelectorAll(".sx-frame").length                 # → 30
  document.querySelectorAll(".sx-scroll *").length              # the node count for the README
  document.querySelectorAll("[style]").length                   # (informational — arrows aside, ~0)
  ```
  Print the count **next to both Lighthouse thresholds**, never bare:
  `stage nodes: 757 · Lighthouse warns > 800 · fails > 1400 · under the warning, 43 to spare`.
- **GOTCHA — R5: the node count is marginal at this size, so it is a signal.** Derived from the real
  templates (full table in § Key risks R5): a 4-part frame is **~24 elements** — `screen-header` **7**
  with `showSettings` (`:298–317` plus `GLYPHS.settings` `:165`, which is `icon(circle, circle)` = 3
  nodes, not 1), `metric-tile` 6 (`:322–331`), `list-row` up to 9 (`:334–347`), a button 1–2, plus the
  wrapper. 30 frames ≈ 720, plus arrows and stage chrome ≈ **~755** — about **45 nodes of headroom**
  under the 800 warning. One more part per frame, or 33 frames, crosses it. If the **observed** count
  lands above 800, that is a T1 finding in its own right and goes in the README as one, **regardless of
  what the INP numbers say**: a substrate that warns at its demo size will not hold a real flow.
- **REDDENS**: nest a second child under `card` → `validateComposition` throws
  `composition[i].children: …` naming the path, and the harness renders nothing (proves the real
  validator is in the path, not a stub).
- **SATISFIES**: AC #1 (stage node count).
- **REGENERATES**: none.

---

### ADD the SVG arrow overlay with derived geometry (Phase 1 → 2)

- **IMPLEMENT**: one `<svg class="sx-arrows">` **inside** `.sx-stage`, absolutely positioned, covering
  the content box, `pointer-events: none`. ~30 `<path>`s, each binding frame *i* to frame *i+1*, each
  with `vector-effect="non-scaling-stroke"`. Geometry recomputed from the frames' `--x`/`--y` **on
  every `pointermove` during a drag** — that is the T5 property under test. Read positions from the
  model (the `--x`/`--y` values the harness owns), **never** `getBoundingClientRect()` per arrow per
  move: 30 rects per move is a forced layout thrash that measures the harness, not the substrate.
- **PATTERN**: stage-coordinate overlay — because the SVG is inside the scaled stage, its coordinates
  are stage coordinates and scale for free; only stroke width needs `non-scaling-stroke`.
- **GOTCHA**: instrument the redraw — `window.__arrowRedraws` incremented in the redraw function. It
  is configuration (c)'s positive control and costs one line.
- **GOTCHA**: use `getCoalescedEvents()` if you want T7's drag path, but **measure (a) without it
  first**. Adding it silently is a fourth variable the decision rule cannot name.
- **VALIDATE** (expected):
  ```
  document.querySelectorAll(".sx-arrows path").length                 # → ~30
  # drag once, then:
  window.__arrowRedraws                                               # cfg=a: N (one per pointermove)
  ```
- **REDDENS**: pin the arrow geometry to a constant (ignore `--x`/`--y`) → the paths stop moving with
  the frame under drag, visible in a screenshot and in a `d`-attribute equality check before/after.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

---

### CREATE `$SCRATCH/driver.mjs` — engines, observer, calibration (Phase 1)

- **IMPLEMENT**: `node $SCRATCH/driver.mjs [chromium|firefox|webkit|all] [a|b|c]`. Per engine: a
  context at `{ width: 1440, height: 1000 }`, `ctx.addInitScript(OBSERVER_INIT)`, then the
  **calibration click** on a throwaway page in the same context before any measurement page opens.
- **PATTERN**: `tooling/studio-journey.mjs:5953–5978` — copy the calibration block's shape: a
  capture-phase listener that busy-waits ~35 ms (past the 16 ms floor), `preventDefault`, click,
  `flush`, `summarize`, assert `calSeen.length >= 1 && calSeen.every(g => g.interactionId > 0)`, close
  the page.
- **IMPORTS**:
  ```js
  import { OBSERVER_INIT, summarize, violations } from "/Users/Berzins/Desktop/Linards_current/ux-factory/tooling/inp-observer.mjs";
  ```
  (absolute path — the driver lives outside the repo while it runs).
- **GOTCHA**: Playwright resolves from `tooling/visual-regression/node_modules`, **not** `~/node_modules`.
  Both exist on this machine (observed), but the VR copy is the version CI's `visual` job pins
  (`@playwright/test` 1.61.1), which is what makes these numbers comparable to the studio gate's. Memory
  `cross-engine-motion-verify` records the `~/node_modules` route from a different context — this
  supersedes it **for this spike**, and the README says so.
- **GOTCHA**: the calibration page must be closed before the first measurement page opens, or its
  forced-slow listener pollutes a real row (`studio-journey.mjs:5949` comment).
- **GOTCHA**: `durationThreshold` floors at 16 ms — a faster interaction yields **no entry**, which is
  a pass. Print it as `< 16 ms`, never `0`. The calibration click is the only thing that makes that
  reading sound.
- **VALIDATE** (observed — the three engines are present):
  ```
  node -e "const {createRequire}=require('node:module'),p=require('node:path'),fs=require('node:fs');
    const r=createRequire(p.join(process.cwd(),'tooling','visual-regression')+p.sep);
    const pw=r('@playwright/test');
    for(const e of ['chromium','firefox','webkit'])
      console.log(e, fs.existsSync(pw[e].executablePath())?'OK':'MISSING');"
  # observed 2026-09-15 → chromium OK · firefox OK · webkit OK
  ```
- **REDDENS**: remove `ctx.addInitScript(OBSERVER_INIT)` → the calibration assertion fails on every
  engine with `[]`, and the run stops rather than printing a page of flattering `< 16 ms` rows.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

---

### ADD the drag gestures and the INP rows (Phase 1 → 2)

- **IMPLEMENT**: three INP-bearing rows — drag one frame @ `?scale=1`, drag one frame @ `?scale=0.5`,
  marquee-drag five. Per row: entry count **before**, act, `flush`, read the delta, `summarize`, take
  the MAX latency. Assert with the imported `violations(rows, 200)`.
- **PATTERN**: `tooling/studio-journey.mjs:6205–6260` — the per-row before/act/flush/delta loop and
  `overLabels` consuming the imported `violations()`. `:6254` states why an inline re-implementation is
  the bug class to avoid; do not re-implement it here either.
- **GOTCHA**: a drag of ~40 steps over ~800 ms with `waitForTimeout(15)` between moves is the shape
  `studio-journey.mjs:6371–6377` uses. Fewer, faster moves make the gesture look cheap.
- **GOTCHA**: `@scale=0.5` is a **separate page load** with a different query string, not a zoom
  applied mid-run — otherwise the wheel-zoom's own cost lands inside the drag's row.
- **GOTCHA**: prove movement before believing any "no dropped frames" claim
  (`studio-journey.mjs:6398`). Read the frame's `--x` before and after; if it did not change, the row
  is void, not green.
- **VALIDATE** (expected): the driver prints, per engine, one row per gesture:
  `drag@1.0 · 34.0 ms` / `drag@0.5 · < 16 ms` / `marquee×5 · 61.0 ms`, and a comparator self-test:
  `violations(summarize([{interactionId:1,duration:250}]), 200).length === 1`.
- **REDDENS**: the comparator self-test above **is** the reddening control — copied from
  `studio-journey.mjs:6299`. Change the budget to 300 and it returns `[]`, failing the self-test.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

---

### ADD the rAF-gap sampler for all four gestures on all three engines (Phase 2)

- **IMPLEMENT**: wrap each gesture in the idle-baseline → instrumented-window → filter-to-`[t0,t1]`
  sampler. Report per gesture: idle median, frame count, p50, p95, max gap, count `> 33 ms`. **This is
  the metric that answers "zero dropped frames" on Firefox and WebKit**, where INP says nothing about
  zoom and pan.
- **PATTERN**: `tooling/studio-journey.mjs:6338–6392`, copied. Thresholds inherited **verbatim**:
  worst rAF gap ≤ 50 ms; zero LoAF (≥ 50 ms) in the window. Using #204's own thresholds is what makes
  this verdict comparable to the grid pass's.
- **GOTCHA**: `PerformanceObserver({type:"long-animation-frame"})` is **chromium-only**. Guard it and
  say so in the README — `studio-journey.mjs:6395` states it in exactly those words. On Firefox and
  WebKit, rAF gaps are the whole frame story.
- **GOTCHA**: settle before sampling. `studio-journey.mjs:6333` waits 500 ms after load because the
  bootstrap frames must never enter a measured window. This harness has 30 compositions to render at
  load, so wait for a `data-ready` attribute the harness sets after the last frame mounts, **then**
  500 ms.
- **GOTCHA**: `buffered` stays **off** on the LoAF observer — only what runs during the gesture counts.
- **VALIDATE** (expected): per gesture per engine,
  `idle median 16.7 ms · 48 drag frames over 812 ms · p50 16.8 · p95 24.1 · max 31.0 · >33 ms: 0 · LoAF: 0`
- **REDDENS**: inject `while (performance.now() - t < 120) {}` into the arrow-redraw path → `max`
  climbs past 50 ms and the `>33 ms` count goes non-zero. **Run this once before trusting a green** —
  a sampler that never sees a bad frame has not been shown to be able to.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

---

### ADD configuration (b) — `content-visibility`, **with its positive control** (Phase 3)

- **IMPLEMENT**: under `[data-cfg="b"]`, `.sx-frame { content-visibility: auto; contain-intrinsic-size: <w>px <h>px; }`
  where `<w> <h>` are the **measured** frame box at scale 1 — read them off a real frame in
  configuration (a) and write the numbers in; do not guess.
- **PATTERN**: architecture § Stack T1 — "`content-visibility: auto` + `contain-intrinsic-size` on
  off-viewport frames as the first mitigation".
- **GOTCHA — this is the task most likely to produce a wrong verdict.** `content-visibility: auto`
  **without a concrete `contain-intrinsic-size` is effectively a no-op for this purpose**, and a no-op
  that "passes" sends the swap PR out on noise. Memory `check-that-cannot-fail`: every defect of this
  class survived a green check the same way — the check skipped the thing it tested.
- **POSITIVE CONTROL (required before any (b) number is recorded)** — **one page load, one frame,
  before and after**. Pick a frame while it is on-screen, read its rendered height, scroll it far
  off-viewport, read it again. Under (b) the second reading must collapse to the
  `contain-intrinsic-size` height; equal readings mean the cull never engaged.
  ```js
  const frameH = (p, i) => p.evaluate((n) =>
    document.querySelectorAll(".sx-frame")[n].getBoundingClientRect().height, i);
  const onscreen = await frameH(page, 0);            // cfg=b, frame 0 in view
  await scrollFarPast(page, 0);                      // frame 0 now well outside the scroller
  const offscreen = await frameH(page, 0);
  // offscreen must equal the declared contain-intrinsic-size height, and differ from `onscreen`.
  ```
- **GOTCHA**: do **not** compare `cfg=a` against `cfg=b` as two page loads. Two loads can differ in
  scroll position, so an unequal height is weaker evidence than it looks — it can be produced by the
  scroll alone. The same frame, one load, before and after, isolates the cull to the thing under test.
- **VALIDATE** (expected): `frame 0 · on-screen 412.0 px · off-viewport 280.0 px (intrinsic)` — the two
  printed side by side, with the assertion `offscreen !== onscreen`.
- **REDDENS**: drop `contain-intrinsic-size` from the (b) rule → the two heights become equal and the
  control fails, refusing to record a (b) number.
- **SATISFIES**: AC #1 (per-configuration numbers).
- **REGENERATES**: none.

---

### ADD configuration (c) — deferred arrow redraw, **with its positive control** (Phase 3)

- **IMPLEMENT**: under `?cfg=c`, coalesce arrow redraws to **one `requestAnimationFrame` per gesture
  tick** (a pending-flag rAF, not a redraw per `pointermove`), and defer pan redraws to `scrollend`.
- **PATTERN**: architecture § Stack T7 — `scrollend` for minimap sync is already an adopted platform
  feature; this is the same call applied to arrows.
- **GOTCHA**: `scrollend` support — check it fires on all three engines in this run and record the
  answer. If an engine never fires it, (c)'s pan half is not implementable there as written, and the
  README says so rather than reporting (c) as passing.
- **POSITIVE CONTROL (required before any (c) number is recorded)**: `window.__arrowRedraws` across
  one drag. Under (a) it is ≈ the pointermove count (tens); under (c) it must be ≈ the frame count and
  strictly lower. Equal counts ⇒ the deferral never engaged.
- **VALIDATE** (expected): `cfg=a redraws 41 · cfg=c redraws 14` — printed, with the assertion
  `cfg_c_redraws < cfg_a_redraws`.
- **REDDENS**: remove the pending-flag guard from the rAF path → the counts converge and the control
  fails, refusing to record a (c) number.
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

---

### RUN the full matrix (Phase 4)

- **IMPLEMENT**: three engines × the configurations Phase 3 proved are in effect × the five gesture
  rows, plus the chromium 4×-throttled leg. Tee every run's stdout into
  `.claude/plans/canvas-spike-s1/raw/<engine>-<cfg>[-throttled].txt`.
- **PATTERN**: `tooling/studio-journey.mjs:6335–6336` — `await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", {rate: 4})`,
  and **reset to `rate: 1`** afterwards (`:6386`).
- **GOTCHA**: Firefox and WebKit are **unthrottled by necessity** (no CDP). Their numbers are the
  engine-difference signal, never the hardware signal — the pre-slice plan says this and the README
  repeats it as a caveat. Do not compare a throttled chromium number to an unthrottled WebKit one and
  call it an engine finding.
- **GOTCHA**: this Mac is not base-spec. The 4× CDP throttle is a **proxy**, and that goes in Caveats
  in those words.
- **GOTCHA**: kill the server by port when done — `lsof -ti:4759 | xargs -r kill`. Never `pkill -f`
  (memory `portal-smoke-port-scoped-kill`).
- **VALIDATE** (expected): `ls .claude/plans/canvas-spike-s1/raw/` lists one file per leg run, and
  each ends with a printed summary table.
- **REDDENS**: n/a (an execution task).
- **SATISFIES**: AC #1.
- **REGENERATES**: none.

---

### COPY the driver into the repo as `driver.txt` (Phase 5)

- **IMPLEMENT**: `cp "$SCRATCH/driver.mjs" .claude/plans/canvas-spike-s1/driver.txt`, and add a
  one-line header comment inside it naming how it was run.
- **GOTCHA**: `.txt` is the ticket's call. A tracked `.mjs` would also pass CI — `tooling/drift-check.mjs:29`
  runs `node --check` over every tracked `.mjs`, which resolves nothing and would accept a complete
  driver (`.claude/plans/design-import-spike-{a,c}/*.mjs` are tracked and green on exactly that basis).
  Follow the ticket anyway; NOTES records the precedent not taken.
- **VALIDATE**:
  ```
  find .claude/plans/canvas-spike-s1 -name '*.mjs' | wc -l          # → 0   (AC #3)
  cp .claude/plans/canvas-spike-s1/driver.txt "$SCRATCH/check.mjs" && node --check "$SCRATCH/check.mjs"
  ```
- **GOTCHA**: do not syntax-check the `.txt` directly, and do not rely on process substitution.
  Measured on this machine's Node **v20.20.2** (pre-flight P9):
  `node --check some.txt` → **exit 1**, `ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".txt"`.
  `node --check <(cat some.txt)` → **exit 0** — it passes, because Node detects module syntax on the
  extensionless `/dev/fd/N` input. So the process-substitution form is not *broken* here; it is
  load-bearing on a Node-version heuristic and on a bash/zsh-only shell feature, and it would start
  failing silently on a Node that changed that default. Copy to a real `.mjs` first, as above — one
  extra line, no heuristic. (Belt-and-braces anyway: the driver was just *run*, which is stronger
  evidence than a parse.)
- **GOTCHA**: use `find … | wc -l`, not `git ls-files -o … | grep -c`. `grep -c` returns 0 both when
  the directory is clean and when it does not exist, and exits **1** on zero matches — under `set -e`
  that line fails on success.
- **REDDENS**: leave a `.mjs` in the spike dir → `find … | wc -l` returns ≥ 1, failing AC #3.
- **SATISFIES**: AC #3.
- **REGENERATES**: none.

---

### CREATE `.claude/plans/canvas-spike-s1/README.md` — the deliverable (Phase 5)

- **IMPLEMENT**: spike C's section order, exactly: **Verdicts** table first (one row per decision-rule
  branch, each with its evidence file) · **Setup** · **Timings** (wall-clock per step, the way
  `design-import-spike-c/timings.txt` feeds spike C's table) · **The numbers** (INP per gesture per
  engine per configuration; rAF-gap per gesture per engine; LoAF + throttled chromium; stage DOM node
  count) · **Caveats and bounds** · **What was not done**.
  The verdict is **one line, naming its branch**, at the top.
- **PATTERN**: `.claude/plans/design-import-spike-c/README.md:1–40` — header line states "Real run,
  <date>, <start>–<end>", then the Verdicts table with an Evidence column pointing at raw files, then
  the one-line decision-rule outcome in italics.
- **GOTCHA — the honesty contract applies to a spike's numbers.** Every number is observed or it is
  labelled. A gesture that was cut by the two-hour rule goes in **What was not done**, named, not
  quietly absent.
- **GOTCHA**: the n/a cells. Write `n/a — wheel/scroll carry no interactionId (Event Timing spec)`,
  never `0 ms`.
- **GOTCHA**: required caveats, all three — this Mac is not base-spec · the CDP 4× throttle is a proxy
  and chromium-only · Firefox/WebKit are unthrottled, so their numbers are the engine signal not the
  hardware signal. Plus: LoAF is chromium-only by definition.
- **GOTCHA — R4: bound the claim, as a list.** The verdict sentence is scoped to **T2/T4/T5** in those
  words. Caveats carries a named list of what the real stage has that this harness does **not**:
  selection model, alignment guides, live-region announcements, undo stack, keyboard verbs, minimap,
  layers list — several of which do work on `pointermove`. Without that list the swap PR cannot make
  the "each new operation is strictly lighter than what was measured" argument that
  `studio-journey.mjs:6051–6055` makes for #217's verbs against spike 2. A green S1 licenses
  "the three new properties hold", never "the canvas will be fast".
- **GOTCHA — R5**: print the observed stage node count **beside both thresholds** (warns > 800, fails
  > 1400) and state which side it falls on. A bare "~700 nodes" reads as reassuring when it is
  marginal. Above 800 is a T1 finding reported as one, whatever the INP numbers say.
- **GOTCHA — R6: a split verdict takes the branch of its worst engine.** Do not invent a fourth
  branch for a two-of-three result. The rule's third branch already says *"drops under (c) on **any**
  engine"*, and WebKit is a gated engine in this repo (architecture § Stack T7 adopts `moveBefore()`
  and `scheduler.yield()` as enhancements *"because WebKit is a gated engine"*). The verdict line
  names the deciding engine: *"holds on chromium and firefox; drops on webkit under (c) → branch 3"*.
- **GOTCHA**: memory `copy-never-indented` — the README is a document, but the epic comment drafted in
  the next task is text the owner may paste. No blockquotes, no leading spaces on it.
- **VALIDATE**:
  ```
  grep -c '^## ' .claude/plans/canvas-spike-s1/README.md                    # ≥ 6 sections
  grep -n 'Verdict\|not done\|Caveat' .claude/plans/canvas-spike-s1/README.md | head
  ```
- **REDDENS**: n/a (a document).
- **SATISFIES**: **AC #1**.
- **REGENERATES**: none.

---

### POST the verdict to epic #295 (Phase 5) — owner-gated

- **IMPLEMENT**: draft the comment body — the one-line verdict, the branch taken, the three headline
  numbers, and a link to the README path. **Show it to the owner and get an explicit go before
  posting.**
- **PATTERN**: the epic already carries one comment; match its register — short, declarative, numbers
  first.
- **GOTCHA**: this is outward-facing on a tracker the owner reads. Posting is the last action of the
  ticket and is not done on your own judgement.
- **GOTCHA**: AC #2 says *before #302 is planned*. If the branch taken is "drops under (c)", the
  comment must say so plainly — that reopens T1 and goes to the owner **before the swap PR is planned**,
  which is the whole reason S1 runs first.
- **VALIDATE**: `gh issue view 295 --comments | tail -30` shows the posted verdict.
- **REDDENS**: n/a.
- **SATISFIES**: **AC #2**.
- **REGENERATES**: none.

---

## TESTING STRATEGY

There is no test suite here and none is invented (CLAUDE.md § Ground rules: "no suite, no linter, no
type-check — don't hunt for or invent one"). A spike's equivalent of tests is **controls**: each
measurement apparatus is shown able to produce a failing reading before any passing reading is trusted.

### Unit Tests

None. The two pure functions this spike leans on (`summarize`, `violations`) are already exercised by
`studio-journey.mjs`'s own self-test (`:6299`), and that self-test is **copied into this driver** rather
than assumed.

### Integration Tests

The driver **is** the integration test, run by hand:
- the calibration click proves the observer pipeline is alive on each engine before any row is read;
- the movement assertion proves each drag engaged before its frame numbers are read;
- the (b) and (c) positive controls prove each configuration engaged before its numbers are recorded.

### Edge Cases

| case | what it must do |
|---|---|
| an interaction faster than 16 ms | print `< 16 ms`, counted as a pass — sound **only** because calibration passed |
| wheel-zoom / pan | print `n/a — no interactionId by spec`, never `0 ms` |
| WebKit has no `long-animation-frame` | omit the LoAF column for it and say why; do not print `0` |
| an engine never fires `scrollend` | record it; (c)'s pan half is not implementable there as written |
| a drag that moved nothing | the row is **void**, not green (`studio-journey.mjs:6398`'s rule) |
| `content-visibility` never culls | refuse to record a (b) number; fix the rule, re-run |
| two-hour mark with no measurement | cut to (a) + one drag; everything cut is named in the README |

### Proving the checks

Three controls must actually be **run**, not assumed, before their greens are believed:

1. **Observer alive** — the forced-slow calibration click. Mutation: remove `addInitScript` → `[]` on
   every engine.
2. **Sampler can see a bad frame** — inject a 120 ms busy-wait into the arrow redraw → `max` gap > 50
   ms, `>33 ms` count non-zero. Remove it and re-run.
3. **Comparator can flag** — `violations(summarize([{interactionId:1, duration:250}]), 200).length === 1`.

Plus the two configuration controls, (b)'s collapsed offscreen height and (c)'s redraw count, each of
which **blocks recording that configuration's number**.

Memory `check-that-cannot-fail`: every defect of this class survived a green gate the same way — the
check skipped the thing it tested. Mutate the source; run the function, don't grep it.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
cp .claude/plans/canvas-spike-s1/driver.txt "$SCRATCH/check.mjs" && node --check "$SCRATCH/check.mjs"
find .claude/plans/canvas-spike-s1 -name '*.mjs' | wc -l        # → 0  (AC #3)
```

### Level 2: Unit Tests

None (see Testing Strategy). The comparator self-test runs inside the driver.

### Level 3: Integration Tests

```bash
PORT=4759 node tooling/visual-regression/serve.mjs &
curl -s http://127.0.0.1:4759/.claude/plans/canvas-spike-s1/harness.html | head -1   # this tree, not a stale one
node "$SCRATCH/driver.mjs" chromium a
node "$SCRATCH/driver.mjs" all a
node "$SCRATCH/driver.mjs" all b
node "$SCRATCH/driver.mjs" all c
lsof -ti:4759 | xargs -r kill
```

### Level 4: Manual Validation

Open `http://127.0.0.1:4759/.claude/plans/canvas-spike-s1/harness.html?frames=30&cfg=a` in a real
browser. Thirty token-skinned frames, thirty arrows, a clean console. Drag one; the arrows follow.
⌘-wheel; the stage scales continuously. This is the eyeball pass memory
`vr-gate-single-engine-blindspot` exists to demand — a headless run is not a look.

### Level 5: Additional Validation (Optional)

```bash
node tooling/build-checks.mjs      # expect UNCHANGED — this ticket touches nothing it reads
node tooling/drift-check.mjs       # expect UNCHANGED — no tracked .mjs added, no generated artifact moved
```
Run both once at the end. They are not this ticket's gates; a change in either means something was
touched that should not have been.

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Posting the S1 verdict comment on epic #295 | owner's hand — outward-facing on the tracker; draft it, show it, post on their go | **yes** — it is AC #2 | n/a (it is the ticket) |
| The owner's call **if** the branch is "drops under (c)" | owner's decision — reopens T1 | yes, for #302 | open a T1 re-decision ticket before the swap PR is planned |
| A real base-spec machine re-run | owner's hardware | no | note in README Caveats; not a tracker item |

No token spend. No agent run. No credential this machine lacks.

---

## ACCEPTANCE CRITERIA

Straight from the ticket, plus the controls that make them mean something.

- [ ] **AC #1** — `.claude/plans/canvas-spike-s1/README.md` exists in spike C's shape: verdicts table,
      setup, INP per gesture per engine per configuration, dropped-frame counts, stage node count,
      caveats (this Mac is not base-spec; CDP throttle is a proxy), what was not done.
- [ ] **AC #2** — the verdict line and the branch taken are posted as a comment on epic #295, before
      #302 is planned.
- [ ] **AC #3** — nothing under `system/` moves; the harness is not `.mjs`.
- [ ] Every configuration whose numbers are recorded was **proven in effect** by its positive control.
- [ ] The observer was proven alive on each engine (calibration click) before any INP row was believed.
- [ ] The rAF sampler was proven able to see a bad frame (the injected busy-wait) before any
      zero-dropped-frames claim was believed.
- [ ] Every drag whose frame numbers are recorded was **proven to have moved something**.
- [ ] `n/a by spec` appears in the wheel-zoom and pan INP cells — never `0 ms`.
- [ ] **R4** — the verdict sentence is scoped to T2/T4/T5, and Caveats carries the named list of
      mechanisms the real stage has that this harness does not.
- [ ] **R5** — the observed stage node count is printed beside both Lighthouse thresholds (warns > 800,
      fails > 1400) with the side it falls on stated. Above 800 is reported as a T1 finding.
- [ ] **R6** — if the engines split, the verdict takes the branch of its **worst** engine and names
      that engine. No fourth branch was invented.
- [ ] `git status` is clean under `system/`, `tooling/`, `agent-layer/`, `handoff/`.
- [ ] Anything the two-hour cut rule removed is named in **What was not done**.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] The three apparatus controls **run**, each shown failing under its mutation and passing without it
- [ ] The two configuration controls run, each blocking its own number until green
- [ ] Manual eyeball pass in a real browser (not only headless)
- [ ] `node tooling/build-checks.mjs` and `node tooling/drift-check.mjs` unchanged
- [ ] README written, every number traceable to a file under `raw/`
- [ ] Verdict comment drafted, shown to the owner, posted on their go
- [ ] Acceptance criteria all met, or the unmet ones named in the report's **Not run** section

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions this plan makes** (none blocking; each is stated so a wrong one is visible):

- **A1.** "~30 frames, each a real token-skinned composition of three or four parts" means an array of
  3–4 root nodes per frame drawn from the 20 committed `example` props. The vocabulary's
  `childrenRule` forbids the nested reading, so this is the only shape that validates.
- **A2.** The arrow overlay sits **inside** the scaled stage (stage coordinates, `non-scaling-stroke`).
  The alternative — a screen-coordinate overlay outside the stage — needs per-scale geometry maths and
  is strictly more work per frame, so measuring the cheaper shape first is the honest order. If (a)
  fails, the README notes that the more expensive shape was not measured.
- **A3.** `--x`/`--y` are plain unit-carrying custom properties, not `@property`-registered. Registering
  them would measure a path the swap PR has not decided on.
- **A4.** The five-step zoom table is not exercised. T2 makes zoom continuous and keeps the table only
  as the keyboard's path; this spike measures the continuous half, which is what is new.
- **A5.** Playwright comes from `tooling/visual-regression/node_modules` (the CI-pinned 1.61.1), not
  `~/node_modules`. Both are present; the pinned one makes these numbers comparable to the studio gate's.

**Questions that would change the plan if answered differently:**

- **Q1.** *Resolved, not asked.* The ticket's "zero dropped frames during drag" is already drag-scoped,
  so wheel-zoom and pan having no INP row is the rule's own reading, not a gap. Their rAF-gap numbers
  are recorded and caveated. Flagged here only because a reader of the table will ask.
- **Q2.** If an engine never fires `scrollend`, configuration (c)'s pan half is not implementable there
  as written. The plan records it rather than reporting (c) as passing; whether that changes T7's
  adoption is the swap PR's question, not this spike's.
- **Q3.** If the branch taken is "drops under (c)", T1 reopens. That goes to the owner before #302 is
  planned — it is in the owner-only table above, and it is the only outcome that changes what the epic
  does next. The two-of-three case is **not** an open question: **R6** resolves it here rather than at
  hour five — a split takes the branch of its worst engine.

---

## KEY RISKS & MITIGATIONS

Every risk here is one whose realisation would make the **verdict wrong** — not one that merely makes
the spike slower. A spike that produces a confidently wrong number is worse than a spike that does not
run, because the swap PR is one-way. Each row names the task that owns its mitigation.

### R1 — INP is blind to two of the four gestures *(mitigated)*

`tooling/inp-observer.mjs:38` drops every entry with a falsy `interactionId`, and per the Event Timing
spec wheel and scroll carry `0`. ⌘-wheel zoom and pan therefore yield **zero INP rows on all three
engines** — a reading indistinguishable from a dead observer. Left unmitigated, the driver prints an
empty table for half the gestures and somebody reads it as "fast".

**Mitigation:** the measurement matrix is written out explicitly above; the rAF-gap sampler is the
portable cross-engine dropped-frame metric for those two gestures; the calibration click proves the
pipeline is alive so an empty row is a pass rather than a mystery; and `n/a by spec` is mandated in
place of `0 ms`.
**Owned by:** *ADD the rAF-gap sampler…* and *CREATE `$SCRATCH/driver.mjs`* (the calibration block).

### R2 — a configuration that silently did nothing *(mitigated)*

The failure mode the plan spends the most words on. If (a) fails and (b) "passes" because
`content-visibility: auto` never culled — which is what happens without a concrete
`contain-intrinsic-size` — then the swap PR ships believing a mitigation that does nothing, and the
next thing to notice is a canvas in front of a hiring manager. Same for (c): a deferral that did not
defer reports (a)'s numbers.

**Mitigation:** each configuration carries a positive control that **blocks recording its number** —
(b) the same frame's height on-screen vs off-viewport within one load; (c) `window.__arrowRedraws`
strictly lower than (a)'s. Not a comment saying to be careful.
**Owned by:** *ADD configuration (b)…* and *ADD configuration (c)…*
**Memory:** `check-that-cannot-fail`.

### R3 — a timebox with nothing to cut back to *(mitigated)*

The ticket's cut rule — "not measuring by hour two → cut to (a) and one drag" — is only executable if
a cut-down version already exists. Build thirty frames, three configurations and three engines before
the first measurement and the only available move at hour two is to extend the box, which the ticket
forbids.

**Mitigation:** Phase 1 *is* the cut target — two frames, one arrow, one drag, one engine, one printed
number. Each later phase adds exactly one dimension and is independently a publishable stopping point.
**Owned by:** the phase order itself.

### R4 — the harness is cheaper than the substrate it stands for *(mitigate by bounding the claim)*

**This is the risk most likely to survive a green run.** The harness has no selection model, no
alignment guides, no announcements, no undo stack, no keyboard verbs, no minimap and no layers list.
The real substrate has all of them, and several do work on `pointermove`. A green S1 therefore licenses
"the substrate's *three new properties* hold", never "the canvas will be fast".

**Mitigation:** the verdict sentence is scoped to T2/T4/T5 in those words, and the README's Caveats
names, as a list, every mechanism the real stage has that this harness does not. Precedent for the
inverse argument: `studio-journey.mjs:6051–6055` inherits spike 2's verdict for #217's verbs *only
because* it argues each new operation is strictly lighter than what was measured — the same argument
must be available to the swap PR, and it can only be made against a stated list.
**Owned by:** *CREATE …/README.md* (Caveats) — added below.
**Residual:** real. A mechanism that turns out heavier than the measured drag re-opens the question at
the swap PR, not here. That is the correct place for it.

### R5 — the DOM node count is a live signal at this size, not a formality *(mitigate by pre-computing it)*

T1's ceiling signal is Lighthouse's DOM-size audit (warns above ~800 elements, fails above ~1,400).
Derived from the real templates, a 4-part frame is **~24 elements**:

| part | elements | source |
|---|---|---|
| `screen-header` (with `showSettings`, as the committed example sets it) | **7** — header + lead span + h1 + trail button + `icon()` svg + 2 `circle` | `:298–317`, `GLYPHS.settings` `:165` |
| `metric-tile` | **6** — div + p + label + reading + value + unit | `:322–331` |
| `list-row` | **9** max — div + p + text + name + meta + reading + value + unit + status | `:334–347` |
| `primary-button` | 1–2 | `:240` |
| the frame wrapper | 1 | harness |

So 30 frames ≈ **720**, plus ~30 arrow paths, the overlay `<svg>`, sizer, stage and scroller ≈
**~755 elements** — roughly **45 nodes of headroom** against the 800 warning.

That is a real signal here, not a formality: one more part per frame (+30), or 33 frames instead of 30,
crosses it. A reader of the README needs the number **next to the threshold**, or "~750 nodes" reads as
reassuring when it is marginal.

**Mitigation:** record the observed count beside both Lighthouse thresholds, and state which of them
the harness's ~30 frames sits under. If the observed count lands **above 800**, that is a T1 finding in
its own right and is reported as one — a substrate that warns at its *demo* size will not hold a real
flow — regardless of what the INP numbers say.
**Owned by:** *ADD the real compositions…* (VALIDATE) and *CREATE …/README.md* — both amended below.

### R6 — a split verdict across engines *(mitigate by naming the branch in advance)*

The decision rule's first branch reads "holds on all three engines". What it does **not** spell out is
the two-of-three case, and an implementer at hour five is exactly the person who will invent a fourth
branch to accommodate a nearly-passing WebKit.

**Mitigation, decided here rather than in the moment:** the rule's third branch already says *"drops
under (c) on **any** engine"*. A split is therefore **not** a new branch — it takes the branch of its
worst engine, and the README names that engine in the verdict line. No fourth branch is written.
WebKit is a gated engine in this repo (architecture § Stack T7 adopts `moveBefore()` and
`scheduler.yield()` as enhancements *"because WebKit is a gated engine"*), so a WebKit-only drop is a
drop.
**Owned by:** *CREATE …/README.md* (the verdict line) — added below.

---

## NOTES (open canvas)

### Pre-flight — what was run, what it said, what changed

Run 2026-09-15, against the working tree at `0e27afb` on `feature/discovery-pre-grill-audit-292`.

**P1 — the `example` props are not in `vocabulary.json`.** The ticket and the pre-slice plan both say
the harness renders "~30 compositions from the catalog's committed `example` props" while importing
`handoff/verdant/vocabulary.json`. Observed:

```
node -e "const v=require('./handoff/verdant/vocabulary.json');
  console.log('with example:', Object.keys(v.components).filter(n=>v.components[n].example).length)"
# → with example: 0
node -e "const p=require('./handoff/verdant/pack.json');
  console.log(p.components.length, p.components.filter(c=>c.example).length)"
# → 20 20
```

`vocabulary.json.components` is an **object keyed by name** with no `example` anywhere;
`pack.json.components` is an **array** of 20 entries, all carrying one. `system/catalog.mjs:303` reads
`component.example` off exactly the pack shape, and `:573–575` loads both artifacts. **Changed in the
plan:** the harness loads *both* files, and this is written in as a corrected IMPLEMENT plus a GOTCHA
naming the two sources' shapes.

**P2 — the composition shape is an array, not a tree.** `vocabulary.json`'s `composition.childrenRule`:
*"a node may carry at most one child, only when its vocabulary entry lists allowed children"*. Only four
of twenty components accept a child at all (`card`, `care-task-row`, `empty-state`, `plant-card`), never
more than one, and the `chipRule` forbids a redundant `status-chip`. **Changed in the plan:** "three or
four parts each" is specified as an array of root nodes, with the nesting trap written in as a GOTCHA
and a REDDENS.

**P3 — Python's `http.server` is not needed; `serve.mjs` already does the job.** The pre-slice plan
cites the cross-engine motion-verify precedent (Python serving `.mjs` as `text/javascript`). Observed on
a `PORT=4759` instance of `tooling/visual-regression/serve.mjs`:

```
curl -sI /system/agentic-renderer.mjs                              → 200, content-type: text/javascript
curl -sI /handoff/verdant/pack.json                                → 200, content-type: application/json
curl -sI /.claude/plans/design-import-spike-c/04-htmlflex.html     → 200, content-type: text/html
```

It roots the repo root, has `.mjs` in its MIME map (`:15`), honours `PORT` (`:11`), and reaches
`.claude/plans/…`. **Changed in the plan:** `serve.mjs` on an override port replaces Python, with a
curl-verify step against memory `stale-serve-wrong-tree` and a port-scoped kill against
`portal-smoke-port-scoped-kill`.

**P4 — Playwright: both resolution paths exist; the VR one is chosen.** The pre-slice plan says
"Playwright resolves from `~/node_modules`" (memory `cross-engine-motion-verify`). Observed: both
`~/node_modules/@playwright` and `tooling/visual-regression/node_modules/@playwright` are present, and
from the VR copy all three engines resolve to installed binaries:

```
chromium OK  …/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/…
firefox  OK  …/firefox-1532/firefox/Nightly.app/…
webkit   OK  …/webkit-2311/pw_run.sh
```

**Changed in the plan:** the VR path (`tooling/studio-journey.mjs:33–44`'s idiom, `@playwright/test`
1.61.1 — the version CI's `visual` job pins) is specified, with the reason, and the memory is recorded
as superseded for this spike rather than silently contradicted.

**P5 — REGENERATES is genuinely `none`, verified rather than assumed.** `agent-layer/gen-loc-summary.mjs:22–26`
scopes its three groups to `^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$` and
`^agent-layer/[^/]+\.mjs$`, and `:37–48` sums `totalFiles`/`totalLines` **from group members only** —
so a file under `.claude/plans/` moves no count and no `approach.html` baseline. This matters because
memory `loc-summary-baseline-cascade` says the opposite for tracked *source* files, and a reader could
reasonably apply it here. It does not apply. Checked against the two tracked-file sweeps in
`tooling/build-checks.mjs` as well: `:5416` (`.html` or `system/` → must not name `discovery/bank`) and
`:9439` (`.mjs`/`.html`/`.js` → must not name a graded fixture slug); a spike harness trips neither, and
`.claude/plans/design-import-spike-c/04-htmlflex.html` is already tracked under exactly that sweep.

**P6 — the substrate arithmetic, read rather than recalled.** `system/studio.css:62–91`: `.stx-sizer`
holds the extent as `calc((cols*slot + (cols-1)*gap) * var(--stx-scale))` and `.stx-stage` is
`position:absolute` inside it with `transform: scale(var(--stx-scale))` and `transform-origin: 0 0`.
The sheet's own comment says why: *"a scaled child's contribution to scrollable overflow is right/bottom
only and inconsistent across engines"*. Real numbers: `--stx-slot-w: 220px`, `--stx-slot-h: 140px`,
`--stx-gap: var(--spacing-md, 16px)`. **Changed in the plan:** the free-position CSS is given as a
mirror of that structure with the extent recomputed from a content bounding box, rather than left to be
re-derived — otherwise "pan the full extent" measures nothing.

**P7 — the INP blind spot.** `tooling/inp-observer.mjs:38` — `if (!e || !e.interactionId) continue` —
and the module header's *"id 0 rows are hover/scroll noise and mouse-alias events — not interactions,
dropped by spec"*. Wheel and scroll carry `interactionId: 0`. **Changed in the plan:** the measurement
matrix is written out explicitly, the rAF-gap sampler is specified as the portable cross-engine
dropped-frame metric, and `n/a by spec` is mandated in place of `0 ms`.

**P9 — the two validation commands were driven, and both were rewritten.** Run on Node v20.20.2:

```
node --check some.txt                → exit 1, ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".txt"
node --check <(cat some.txt)         → exit 0   (module syntax detected on /dev/fd/N)
cp some.txt $S/check.mjs && node --check $S/check.mjs   → exit 0, unambiguous
find <dir> -name '*.mjs' | wc -l     → 0, exit 0
git ls-files -o … | grep -c '\.mjs$' → 0, exit 1        ← fails under `set -e` on SUCCESS
```

Two changes: the syntax check copies to a real `.mjs` instead of using process substitution (which
works here but rides a Node heuristic plus a bash/zsh-only shell feature), and AC #3's assertion uses
`find … | wc -l` instead of `git ls-files -o … | grep -c`, which returns 0 both when the directory is
clean and when it does not exist — and exits 1 on a clean result. Worth recording: the first form was
flagged as failing with `Cannot use import statement outside a module`; **it does not on this Node**.
The command was replaced for robustness, not because it was broken, and the plan says so rather than
carrying a mechanism nobody observed.

**P10 — the (b) control was cross-load and is now same-load.** The first draft compared an off-viewport
frame's height between a `cfg=a` load and a `cfg=b` load. Two loads can differ in scroll position, so
an unequal height is also producible by the scroll alone — weaker evidence than it reads as. Rewritten
as one `cfg=b` load, one frame, measured on-screen and then off-viewport, which isolates the cull to
the property under test.

**P8 — the landed/missing check.** `.claude/plans/canvas-spike-s1/` does not exist (`ls` → no such
file), so nothing is half-done. `tooling/inp-observer.mjs`, `tooling/visual-regression/serve.mjs`,
`system/action-bus.mjs:41` (`createBus`), `system/agentic-renderer.mjs:31`/`:547`
(`validateComposition`/`renderComposition`) all exist with the signatures the plan cites — each read
this session, not recalled.

### Why the phase order is the plan's most important decision

The ticket's timebox has a cut rule — "not measuring by hour two → cut to (a) and one drag" — and that
rule is **only executable if a cut-down version already exists**. Building thirty frames, three
configurations and three engines before taking a first measurement leaves nothing to cut *back to*; the
only available move at hour two would be to extend the box, which the ticket forbids. So Phase 1 is
deliberately the cut target itself: two frames, one arrow, one drag, one engine, one printed number.
Every later phase adds exactly one dimension, and each is independently a stopping point with a
publishable README.

### The failure mode this plan spends the most words on

Not "is it slow". It is **"(a) fails, (b) passes, and (b) was never actually in effect"** — because
that outcome sends the swap PR out believing a mitigation that does nothing, and the next thing that
notices is a canvas in front of a hiring manager. `content-visibility: auto` without a concrete
`contain-intrinsic-size` is the specific way it happens. Hence a positive control that **blocks
recording the number**, rather than a comment saying to be careful. Same for (c): a deferral that
didn't defer reports the same numbers as (a), and `__arrowRedraws` is one line that tells them apart.

### Alternatives weighed and rejected

| alternative | why not |
|---|---|
| Build the spike on top of the real `studio.html` | The architecture's S1 sketch says "a throwaway stage over the existing studio.html". Rejected: `system/studio.css` carries the grid substrate and its five-step table, so a free-position stage there measures the two substrates fighting. A standalone harness isolates the three new properties, which is exactly what the ticket scopes. |
| Measure with the real `studio-journey.mjs` extended | It is a gate on a shipped page, 6,439 lines, with its own noise filters and page contracts. Extending it for a throwaway would mean changing a gate — out of scope, and it would then need un-changing. |
| Skip configuration (b), measure (a) and (c) only | The decision rule branches on "(a) **or** (b)" and prefers "whichever passed with less code". Dropping (b) makes that branch unanswerable. |
| Nest compositions to get "three or four parts" | Refused by `childrenRule` — `validateComposition` throws. See P2. |
| `getBoundingClientRect()` per arrow per pointermove | Thirty forced layouts per move measures the harness's own thrash, not the substrate. Read from the `--x`/`--y` model instead. |
| Park the driver as a tracked `.mjs` | It would pass CI: `tooling/drift-check.mjs:29` runs `node --check` per tracked `.mjs`, which resolves no imports, and `design-import-spike-{a,c}/*.mjs` are tracked and green on that basis. The ticket says `.txt`; followed, and the precedent not taken is recorded here. |

### Traps carried in from memory (each written into a task as a GOTCHA)

- `stale-serve-wrong-tree` — a sibling session's `serve.mjs` can hold 4757 for days serving their tree.
  Override the port, curl-verify the bytes.
- `portal-smoke-port-scoped-kill` — never `pkill -f`; PID/port only.
- `check-that-cannot-fail` — every defect of this class survived a green check because the check
  skipped the thing it tested. Three apparatus controls plus two configuration controls, all run.
- `vr-gate-single-engine-blindspot` — a headless pass is not a look. One real-browser eyeball is in
  Level 4.
- `cross-engine-motion-verify` — records `~/node_modules`; superseded here by the CI-pinned VR copy,
  with the reason stated rather than the memory quietly ignored.
- `loc-summary-baseline-cascade` — genuinely does not apply to `.claude/plans/`; verified in P5 rather
  than assumed either way.
- `copy-never-indented` — the epic comment is text the owner may paste. No blockquote, no indent.
- `drift-check-syntax-checks-parked-mjs` — the reason fragments get parked as `.txt`; here the driver
  is a complete module, so the `.txt` call is the ticket's, not CI's.

### Confidence

**9.5/10** for one-pass success. The code is small and disposable, every citation was opened this
session, and the three literals the inherited spike plan got wrong (examples' source, the server, the
Playwright path) are corrected with observed output. The half point is measurement reality: a real
engine may produce a number that needs a judgement call — a WebKit `scrollend` that never fires, or a
Firefox rAF cadence that makes "dropped frame" ambiguous. The plan handles those by **recording and
caveating** rather than by guessing, so they cost a README paragraph, not a re-plan.

## AMENDMENTS

<!-- append-only; newest at the bottom -->

- 2026-09-15 — added **§ Key risks & mitigations** (R1–R6) after the first pass was reported. R1–R3
  were already handled in the tasks and are consolidated there; **R4 (harness fidelity), R5 (the DOM
  node ceiling) and R6 (a split verdict across engines) were new**, each wired into the task that owns
  it plus an acceptance criterion. R5's figure was derived from the real templates and corrected
  mid-edit — `GLYPHS.settings` is `icon(circle, circle)`, three nodes, so `screen-header` with
  `showSettings` is 7 elements not 4, which moves the estimate from ~700 to **~755** and leaves only
  ~45 nodes of headroom under Lighthouse's 800 warning. R6 also closes the two-of-three ambiguity in
  Q3: a split takes the branch of its worst engine, decided here rather than at hour five. Two
  validation commands were replaced after being driven (pre-flight P9) and the (b) positive control
  was changed from cross-load to same-load (P10).

- 2026-09-16 — **implementation pre-flight, three plan errors corrected.**
  **(1)** `$SCRATCH` named another session's id (`6c1721a4-8d8d-4cfb-9541-9fcf289e2ab4`). Substituted
  this session's: `/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/ddaaec7b-7b24-4a57-b13d-9af1a64eb92b/scratchpad/s1`.
  **(2)** The stage node count is specified as `document.querySelectorAll(".sx-scroll *").length`, but
  Lighthouse's DOM-size audit counts the **whole document**. With ~45 nodes of derived headroom (R5)
  a scroller-scoped undercount is exactly what would flip the finding. Corrected to
  `document.querySelectorAll("*").length`, reported beside both thresholds; the scroller-scoped count
  is printed alongside as the stage's own share.
  **(3)** The drag's movement assertion (`movedX !== startX`) is scale-blind: at `?scale=0.5` a
  handler that does not divide the pointer delta by `--sx-scale` still moves the frame, so the row
  reads green on a half-weight gesture. The handler divides by scale, and the assertion checks the
  observed stage delta against the expected one within tolerance rather than mere inequality.
  Also recorded, not a correction: `VRDIR` stays the absolute path into the **main tree** — a fresh
  worktree has no `tooling/visual-regression/node_modules` (memory `local-agent-visual-gate-notes`).
  And `serve.mjs` is run from **this worktree**, since it roots at its own `../..`; the plan's
  curl-verify of `harness.html` is what proves it.
