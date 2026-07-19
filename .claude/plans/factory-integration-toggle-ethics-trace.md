# Feature: Factory integration — scenario toggle · ethics guess-then-reveal · trace station (ticket 10.3, closes #10)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **Third and final slice of GitHub issue #10** (Factory page). 10.1 stood up the five-station shell
> (Prototypes + Handoff live). 10.2 made Stations 1 + 2 run (the 4-axis wizard drives the live re-skin
> + staged narrative, Verdant inlined). **This slice (10.3) is the integration pass that CLOSES #10**:
> the Verdant⇄Fieldwork scenario toggle across the pipeline, the ethics guess-then-reveal on the
> Manipulation Matrix, the trace player mounted at Station 5, and the cross-cutting sweep (legibility
> nuggets · check-termination · honesty-surface sweep · fire-once analytics · deep links).
>
> **The engine, the player, and the wizard are all proven canon — do not rebuild them.** `derive()`
> already returns `ethics.quadrant` when the two matrix booleans are supplied; `trace-player.mjs`
> already renders a committed trace; `factory-intake.mjs` already runs the wizard + re-skin + narrative
> for Verdant. This slice *extends* that module with a second scenario + the ethics moment, and mounts
> the existing player. Read `factory-intake.mjs`, `derive.mjs`, `derive.rules.mjs`, and `trace.html`
> before writing a line.

## Feature Description

Turn the single-scenario Factory page into the two-scenario, fully-performed pipeline the PRD's MVP
spine requires. Three genuinely-new pieces plus a sweep:

1. **Scenario toggle (Verdant ⇄ Fieldwork).** One control switches the active scenario. Stations 1–3
   swap their content live: the wizard re-seeds to the new scenario's defaults + reasoning, the
   fictional-scenario label swaps, the derivation engine re-skins the sample from the new axes (green /
   comfortable / `self` / `daily` → orange / compact / `hunt` / `monthly`), the staged narrative +
   **ethics verdict differ** (Verdant "Habit-forming candidate" · Fieldwork "Utility — habit mechanics
   rejected"), and Station 3 shows the active scenario's prototype. Stations 4–5 **respond honestly**:
   their capability indicators state that the real handoff pack and the real trace exist for Verdant and
   are in build for Fieldwork — the honesty surface doing exactly its job (see the load-bearing reframe
   in NOTES).

2. **Ethics guess-then-reveal (the Manipulation Matrix, run out loud).** The platform's one interactive
   guess-then-reveal moment. The reader *places the product on the 2×2 first* — answering "does it
   materially improve users' lives?" and "would you use it yourself?" — which the engine turns into a
   quadrant (facilitator / peddler / entertainer / dealer). Then the scenario's authored verdict reveals
   *beside* the reader's placement: **compare notes, never grading** — no score, no "correct!", no red X.

3. **Trace player mounted at Station 5.** Replace the "In build" badge + link-out with the real trace
   player, replaying the committed `demo-notice` run (a real, curated Agent SDK run) inline in the four
   PIV acts. Flip the badge to "Runs now". (Whether to *also record a new bespoke pipeline trace* is the
   plan's headline decision — see Phase 5 + OPEN QUESTIONS.)

4. **Cross-cutting sweep.** Legibility nuggets woven into the new copy (voice contract, zero pedagogy
   callouts); every station check-terminated; the three honesty surfaces verified present and truthful
   under both scenarios; `trackFactoryDriven()` confirmed to fire once across *any* drive; station deep
   links intact.

Everything stays **view-time-safe (approach B)** and **synchronous** — the second scenario's config is
*inlined* (not fetched), like Verdant's, so the re-skin settles before any screenshot and there is no
config-load failure state to design. Nothing runs a live LLM at view time; the trace is a replayed file.

## User Story

As a **hiring manager / technical reader** on `/factory`,
I want to **flip between two fictional products and watch the same method produce two different design
systems — and, critically, two different ethics verdicts — then place a product on the Manipulation
Matrix myself and compare my call to the maker's**,
So that **I can verify the pipeline is a real method (not a Verdant-shaped demo), see that its ethics
gate can rule *against* engagement, and judge the maker's design judgement against my own**.

## Problem Statement

After 10.2 the Factory page performs Stations 1–2 for **Verdant only**. Three things the PRD's MVP spine
requires are still missing, and #10 cannot close without them:

- **No toggle.** The single scenario can't prove the pipeline is a *method*. The most persuasive proof —
  the ethics gate ruling *the other way* for a B2B monthly tool — is invisible.
- **No ethics interaction.** The narrative shows the frequency verdict as static text; the PRD's "one
  guess-then-reveal moment" (place it on the Manipulation Matrix, then compare notes) doesn't exist.
- **Station 5 is still a stub.** It carries an "In build" badge and links out to `/trace`; the trace
  player is never mounted on the flagship page, so "agents visible" — the fifth station — is unperformed.

## Solution Statement

Extend the one view-time module `system/factory-intake.mjs` (hand-written canon) to own the whole
Station-1/2 pipeline for **two inlined scenarios** and the ethics moment; mount the existing
`system/trace-player.mjs` at Station 5 via a small inline module in `factory.html` (mirroring
`trace.html`); and rewrite `factory.html`'s stations to carry the toggle, the honest per-scenario
capability copy, and the ported trace-player CSS.

- **Toggle & second scenario:** add a `SCENARIOS` map to the module — `verdant` (the existing config)
  and `fieldwork` (new: axes `#B4530A` / compact / `hunt` / `monthly`, distilled wizard reasoning, the
  `ethicsReveal` narrative). A toggle control calls `setScenario(slug)`, which re-seeds `answers` to
  that scenario's defaults, resets the wizard to step 0 and the ethics gate to un-placed, re-runs
  `derive()`, and updates the per-scenario surfaces (fictional label, Station-3 proto, Stations-4/5
  honest copy). `scenarios/index.json` is the source of the two slugs; the per-scenario *copy* is inlined
  (the scenario `copy.json` / `intake.defaults.json` files stay the durable authoring record).
- **Ethics guess-then-reveal:** the always-visible frequency `verdict` (Beat 4, toggle-live — **this is
  the AC3 swap**, present in every `derive()` result whether or not booleans are set) stays exactly as
  10.2 renders it; **added after it** is a dedicated interactive beat. The reader picks the two booleans
  (their placement) → `derive({...answers, improvesLives, wouldUseIt})` yields *their* `ethics.quadrant`;
  a Reveal action shows the scenario's authored `ethicsReveal.narrative` beside the reader's placement, in
  the compare-notes register. The new beat touches **only** `quadrant`, never the frequency verdict. The
  reader's guess is **never prefilled** from the scenario booleans.
- **Trace station:** an inline `<script type="module">` in `factory.html` fetches `/traces/demo-notice.jsonl`,
  `parseTrace` → `renderTracePlayer` into `#agents-player`, then sets a readiness attribute for the
  visual gate. The player mounts **once** and never re-renders on toggle (so no `destroy()` is needed).
  Station 5's badge flips to "Runs now"; its copy stays scenario-neutral and honest (the demo-notice run
  is a real spec-authoring task, not a per-scenario generation run — stated plainly).
- **View-time-safe:** every engine call stays behind the existing try/catch → neutral-pack fallback.
- **CI gate:** the factory visual-regression entry gains a trace-ready wait; the two baselines regenerate
  through the updated spec (default scenario pinned to Verdant so the baseline is deterministic).

## Out of Scope / Non-Goals

- **Not building a Fieldwork handoff pack** (`handoff/fieldwork/`). It doesn't exist; building it is a
  generator run far outside this slice's ~300–450-line budget. Station 4 keeps Verdant's *real* pack
  always reachable and states Fieldwork's is in build. (Verdant pack = `handoff/verdant/`, on `main`.)
- **Not recording a Fieldwork-specific generation trace as a hard requirement.** Whether to record *any*
  new trace is the Phase-5 decision; even if taken, it is one keepable-artifact run, not a per-scenario
  pair. Station 5 shows the real `demo-notice` run regardless.
- **Not adding a fetch path for scenario config.** The 10.2 module note anticipated "the toggle slice
  introduces the fetch path" — that was a guess with less information. Inlining both scenarios is decided
  here (stage-safety + screenshot determinism; see NOTES "Why inline, again").
- **Not touching the engine.** `derive.mjs`, `derive.rules.mjs`, `oklch.mjs`, `wcag.mjs` are frozen
  canon — consume `ethics.quadrant`, don't add to it. **No new token**, **no generator run**, **no
  components.css / portfolio.css edit** (page-scoped `<style>` only, per 10.1/10.2).
- **Not changing** the two proto pages, `system/trace-player.mjs`, `system/analytics.mjs`,
  `scenario-data.mjs`, the nav config, or `index.html`'s "In build" home card (epic Step 3 relights
  entry points once the whole pipeline lands).
- **Not adding** `improvesLives`/`wouldUseIt` to Fieldwork's `intake.defaults.json` axes. Fieldwork
  omits them *by design* — "the honest verdict needs no matrix." Preserve that asymmetry; it is the
  pedagogy (see the ethics-reveal handling for the no-quadrant scenario, Task 6).
- **Not the voice-contract copy-polish pass as a separate deliverable (7.5).** New copy must be honest
  and follow the teach discipline, but don't gold-plate; final voice polish is its own later pass.
- **No build step, framework, bundler, or view-time LLM call** (hard constraint).

## Feature Metadata

**Feature Type**: New Capability (scenario toggle + ethics interaction + trace station) · Integration
(closes #10).
**Estimated Complexity**: Medium–High. Ticket estimate ~300–450 lines; **realistic ~550–750** with the
Fieldwork config, the toggle wiring across five stations, the ethics widget, the trace mount + ~45 lines
of ported CSS, and the copy. Bigger than 10.2 (which itself ran ~650). If Phase 5 (record a new trace) is
taken, add a separable runner edit + a real agent run. **Flag if it balloons past ~800 (excluding CSS).**
**Primary Systems Affected**: `system/factory-intake.mjs` (extend) · `factory.html` (Stations 1–5 +
toggle + trace mount + CSS) · `tooling/visual-regression/visual.spec.mjs` (trace-ready wait) + two
regenerated baselines. **If Phase 5:** `portal/record-trace.mjs` (new TASK+SLUG) + a new `traces/<slug>.{raw.,}jsonl` pair + a committed keepable artifact.
**Dependencies**: none new. Consumes proven canon: `derive.mjs` + `derive.rules.mjs` (#3),
`trace-player.mjs` (#5), `scenarios/*/` copy + fixtures (#4), `analytics.mjs` (#6). All on `main`.

## Related Work

**Implements**: ticket **10.3** — third/final slice of GitHub issue **#10** (Factory page) · **Epic**: #1
(`docs/epics/ai-first-ux-factory.architecture.md` §Recommended approach = approach B; §IA Factory =
flagship; §Data model Trace). **Closes #10 on merge** (commit + PR message: `Closes #10`).

**Back-references** (plans this builds on / inherits decisions from):

- `.claude/plans/factory-intake-wizard-reskin.md` — Why: 10.2 built the module this slice extends (the
  inlined-config pattern, the `[data-reskin]` readiness gate, the fire-once `driven` guard, the staged
  narrative). Its forward-reference named this slice: "10.3 — scenario toggle + the ethics
  guess-then-reveal (5.7)". **Its inline-not-fetch reasoning is re-affirmed and extended here.**
- `.claude/plans/factory-shell-cheap-stations.md` — Why: 10.1 built the shell, the `.capability`/`.capability.live`
  badge idiom (the honesty surface #3 this sweep audits), the page-scoped `<style>` precedent, the
  `scroll-margin-top:90px` deep-link idiom, and the iframe mask + fixed heights the toggle must not break.
- `.claude/plans/trace-recorder-player.md` + `.claude/plans/recorder-hardening.md` — Why: built the
  player + recorder + the Trace format + honesty contract this slice mounts and (optionally) records into.
- `.claude/plans/live-derivation-engine.md` — Why: built `derive()` incl. the `ethics.matrix` quadrant
  this slice's guess-then-reveal drives; `derive.html` is the apply/WCAG-render reference.

**Forward-references** (append as follow-ups get created):

- (epic Step 3) relight the entry points (Home card, deploy) once the whole pipeline is live.
- (7.5) voice-contract copy-polish pass across all station copy.
- (#13) agentic-UI study fills Fieldwork's two agentic slots.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/factory-intake.mjs` (whole file, 285 lines) — Why: **the module to extend.** Note the current
  shape: `WIZARD`/`DEFAULTS`/`ENUM`/`LABELS`/`esc()` at top; `init()` self-init behind a `document` guard
  finding `#factory-wizard`/`#reskin-preview`/`#factory-narrative`; `run()` (derive → apply tokens →
  `[data-reskin]` → `renderNarrative`); `fallback()`; `setAnswer()` (fires `trackFactoryDriven` once via
  the `driven` guard); `renderWizard()` (stepped, a11y focus handling); `renderNarrative()` (4 beats,
  Beat 4 = `result.ethics.verdict` text — **this is the seam the guess-then-reveal replaces/extends**).
  The Verdant config here becomes `SCENARIOS.verdant`.
- `system/derive.mjs` (lines 22–41 `validate`, 126–141 ethics, 171–179 return) — Why: the ethics contract.
  `validate` accepts optional `improvesLives`/`wouldUseIt` (must be boolean **when given**, line 37–39).
  `ethics` (134–141): `verdict` from the frequency filter alone; `quadrant` **only when both booleans are
  boolean** (`ruleset.ethics.matrix[improvesLives][wouldUseIt]`). Passing the two booleans is all the
  guess-then-reveal needs — no engine change.
- `system/derive.rules.mjs` (lines 147–158 `ethics`) — Why: the matrix + verdicts, the single source of
  truth for the reveal. `matrix.true.true="facilitator"`, `.true.false="peddler"`,
  `.false.true="entertainer"`, `.false.false="dealer"`; `verdicts.pass`/`.fail` text. Quadrant *meanings*
  (facilitator = the goal; peddler = overselling; entertainer = fine in moderation; dealer = don't) come
  from `__UX_UI_Research.md` §Layer B — author them into the widget's labels (≤ ~15 words each, teach
  discipline).
- `trace.html` (lines 22–68 the `.trace-*` CSS; 90–118 the mount script) — Why: **the Station-5 mount
  template to mirror.** Port the ~45 lines of token-only `.trace-*` CSS into `factory.html`'s `<style>`
  (the player injects none; the page styles what it emits). Replicate the fetch→`parseTrace`→
  `renderTracePlayer` sequence and the `errorCard()` helper. Loads the **curated** `/traces/<slug>.jsonl`.
- `system/trace-player.mjs` (lines 27–46 `parseTrace`, 97–178 `renderTracePlayer` incl. the returned
  `{next,prev,reveal,revealAll,destroy}`) — Why: the API to call. **`destroy()` removes a document-level
  keydown listener** — only needed before re-render/remove. Mount once, never re-render on toggle → no
  `destroy()` (see NOTES + the reframe). Renders `meta.label` verbatim (honesty surface #2).
- `scenarios/verdant/copy.json` + `scenarios/fieldwork/copy.json` — Why: the authoring source for the
  inlined per-scenario copy. Consume: `fictionalNotice` (Station-1 label), `ethicsReveal.{verdict,narrative}`
  (the reveal), `tagline` (optional intro). **Do not** consume `stations.handoff`/`stations.agents`
  verbatim under the toggle — both over-claim per-scenario packs/traces that don't exist (see the sweep,
  Task 9). `prototype.*` is the proto pages' concern, not the factory's.
- `scenarios/verdant/intake.defaults.json` + `scenarios/fieldwork/intake.defaults.json` (`axes` +
  `questions[].reasoning`) — Why: the durable source of each scenario's four axes and the per-axis
  reasoning to distil into the inlined `WIZARD` config. Verdant axes carry `improvesLives:true`/`wouldUseIt:true`
  (the *author's* matrix position — part of the reveal, NOT the reader's start state). Fieldwork axes
  omit them by design (line 76–81); its `target-behavior.reasoning` (line 35) and `ethics-gate.default`
  (line 70) are the "needs no matrix" copy source.
- `scenarios/index.json` — Why: the two toggle slugs (`verdant`, `fieldwork`) + labels. The toggle
  control's option set. (`api.*` bases are the proto loader's concern, not the toggle's.)
- `factory.html` (whole file, 309 lines) — Why: the page to edit. **Keep** `<head>` (title, `noindex`,
  the four stylesheet links, the existing page-scoped `<style>`) and the four bottom `<script>`s. Station
  1 = lines 147–164 (add the toggle + swap the fictional label per scenario); Station 2 = 166–216 (the
  narrative host `#factory-narrative` gains the ethics widget); Station 3 = 218–251 (currently BOTH protos
  — the toggle shows the active one); Station 4 = 253–267 (add honest per-scenario capability copy);
  Station 5 = 269–290 (**replace the `.lineup` link-out with the mounted player** + flip the badge).
- `tooling/visual-regression/visual.spec.mjs` (lines 15–31 `PAGES`, 46–93 the test body incl. the
  `mask`/`waitReady` handling at 25, 66, 91) — Why: the factory entry already has
  `mask:'iframe.factory-embed'` + `waitReady:'#reskin-preview[data-reskin]'`. Add a **trace-ready** wait
  (the player mounts async) so the capture can't race it. Mirror the existing optional-field pattern.
- `traces/demo-notice.jsonl` (curated, 25 lines) + `traces/README.md` — Why: the committed real run the
  player replays, and the format/honesty contract. `meta.label` = "Real run, curated for length".
- `portal/record-trace.mjs` (lines 23 `SLUG`, 74–92 `TASK`, 104–113 the fence, 183–203 guards + argv) —
  Why: **only if Phase 5 is taken.** No slug/task CLI selector — a new trace = edit the `SLUG`+`TASK`
  consts (sanctioned: the runner IS the record; honesty forbids editing *content*, not the runner). New
  SLUG → `demo-notice` untouched, no `--force`. Fence: Bash limited to `node …` only, writes confined to
  the repo → the validate gate must be a `node` command and the artifact must be a keepable committed file.

### New Files to Create

- **None required for the core** (Phases 1–4, 6–7): all edits land in `system/factory-intake.mjs`,
  `factory.html`, and `visual.spec.mjs`.
- **Only if Phase 5 (record a new trace) is taken:** a new `traces/<slug>.raw.jsonl` + `traces/<slug>.jsonl`
  pair (produced by the recorder + curator, **never hand-written**) and the keepable artifact that run
  authors (e.g. a `system/specs/<component>.md`). Decide the slug/artifact at Phase 5 (see OPEN QUESTIONS).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- Nir Eyal, Manipulation Matrix (facilitator / peddler / entertainer / dealer) — `__UX_UI_Research.md`
  §Layer B (`:53–71`) and §10 (`:264–287`, the voice contract + "comparing notes, never grading").
  - Why: the four quadrant *meanings* and the compare-notes register the reveal must obey — no score, no
    "correct!", no red X. This is the governing discipline for the whole ethics interaction's tone.
- PRD §6 / §6.1 — `docs/epics/ai-first-ux-factory.prd.md` (`:57–89`).
  - Why: "the ethics gate doubles as the platform's one guess-then-reveal interactive moment" (`:88`);
    the legibility layer + hard subtlety bar (`:69`, "no callouts, badges … success reads as unusual
    clarity"). Every new string is held to this.
- CSS custom-property inheritance — https://developer.mozilla.org/en-US/docs/Web/CSS/--*#inheritance
  - Why: the re-skin stays scoped to `#reskin-preview` (props on the container inherit only to the
    sample); the toggle just changes which token values are set there. The chrome/wizard never re-skin.
- Playwright `toHaveScreenshot` stability + waiting — https://playwright.dev/docs/test-snapshots
  - Why: the async trace mount can race the capture (same failure `[data-reskin]` fixed in 10.2). A
    trace-ready wait makes the factory capture deterministic *by construction*.

### Patterns to Follow

**Per-scenario config as an inlined map (extends 10.2's inlined `WIZARD`):**

```js
// SCENARIOS[slug] = { label, fictionalNotice, wizard:[{axis,prompt,reasoning}], defaults, ethicsReveal }
// verdant = today's inlined config, verbatim; fieldwork = new (copy distilled from its intake.defaults +
// copy.json). ENUM/LABELS are scenario-independent (they come from RULESET) — keep them module-level.
const SCENARIOS = {
  verdant:   { label: "Verdant · plant care",        defaults: { brandColor:"#2F7A4D", density:"comfortable", rewardType:"self", frequency:"daily"   }, /* wizard, fictionalNotice, ethicsReveal */ },
  fieldwork: { label: "Fieldwork · dispatch (B2B)",   defaults: { brandColor:"#B4530A", density:"compact",     rewardType:"hunt", frequency:"monthly" }, /* … */ },
};
const DEFAULT_SCENARIO = "verdant"; // pins the visual-regression baseline
```

**Toggle control — plain radios/buttons, re-seed on change (no fetch, synchronous):**

```js
function setScenario(slug) {
  active = slug;
  const s = SCENARIOS[slug];
  answers = { ...s.defaults };      // matrix booleans intentionally NOT seeded (reader places them)
  step = 0; ethicsPlacement = null; // reset wizard + un-place the ethics guess
  markDriven();                     // toggling IS a drive → fire-once analytics
  renderScenarioChrome(s);          // fictional label, Station-3 proto, Stations-4/5 honest copy
  renderWizard(); run();            // re-skin + narrative + ethics beat for the new scenario
}
```

**Guess-then-reveal — reader places first, engine reveals beside (never prefilled, never graded):**

```js
// The reader's two booleans are THEIR placement; run derive with them to compute their quadrant.
function reveal() {
  const guess = derive({ ...answers, improvesLives, wouldUseIt }); // reader's placement → their quadrant
  const yourQuadrant = guess.ethics.quadrant;                      // facilitator | peddler | entertainer | dealer
  // "Compare notes": show yourQuadrant beside the scenario's authored verdict — NO right/wrong.
  renderReveal(yourQuadrant, SCENARIOS[active].ethicsReveal, guess.ethics.verdict);
}
// If the active scenario's own axes omit the booleans (Fieldwork), the reveal explains the frequency
// filter already decided (utility) — "needs no matrix" — rather than asserting a scenario quadrant.
```

**Trace mount — mirror trace.html, mount once, signal readiness (Station 5):**

```js
import { parseTrace, renderTracePlayer } from "/system/trace-player.mjs";
const mount = document.getElementById("agents-player");
fetch("/traces/demo-notice.jsonl")
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
  .then(t => { renderTracePlayer(mount, parseTrace(t)); mount.dataset.trace = "ready"; }) // readiness for the gate
  .catch(err => errorCard(mount, `Could not load the trace — ${err.message}`)); // honest failure card
```

**Capability badge — the honesty surface #3 idiom (verbatim, `index.html`/`factory.html`):**

```html
<!-- live -->  <span class="capability live">Runs now</span>
<!-- deferred --> <span class="capability">In build</span>
```

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 0 gates all. Phases 1→2→3 are the module substance (2 depends on 1's
`SCENARIOS`; 3 depends on 1's answer state). Phase 4 (trace mount) is **independent of 1–3** — pure
front-end, could be authored in parallel. Phase 5 (record a new trace) is **optional + separable** (the
plan's headline decision — see OPEN QUESTIONS). Phase 6 (sweep) depends on 1–4. Phase 7 (CI gate) depends
on all included phases being final.

### Phase 0: Foundation — branch

**Tasks:** Branch fresh from `origin/main` (10.1+10.2 are merged there). Confirm the engine returns a
quadrant for two booleans and the player loads the demo-notice trace.

### Phase 1: Second scenario — inline the Fieldwork config

**Tasks:** Refactor the module's top-level Verdant constants into a `SCENARIOS` map; add the Fieldwork
entry (axes, distilled wizard reasoning, `fictionalNotice`, `ethicsReveal`). Keep `ENUM`/`LABELS`/`esc`
module-level. Add the fail-fast asserts per scenario.

### Phase 2: Scenario toggle — swap the pipeline

**Depends on:** Phase 1.

**Tasks:** Add the toggle control + `setScenario(slug)` (re-seed, reset, re-render). Wire the
per-scenario chrome: fictional label (Station 1), active-proto (Station 3), honest capability copy
(Stations 4–5). Default scenario = Verdant.

### Phase 3: Ethics guess-then-reveal — the Manipulation Matrix, run out loud

**Depends on:** Phase 1 (answer state). **Independent of:** Phase 2's toggle chrome (both consume the
same module state; land together).

**Tasks:** Render the ethics beat: a 2×2 placement control (the two booleans) + a Reveal action →
compare-notes panel. Handle the no-quadrant scenario (Fieldwork) honestly. Never prefill the guess.

### Phase 4: Trace station — mount the player at Station 5

**Independent of:** Phases 1–3.

**Tasks:** Port the `.trace-*` CSS into `factory.html`; add the `#agents-player` mount + inline module
(mirror `trace.html`); flip the badge to "Runs now"; write scenario-neutral honest Station-5 copy.

### Phase 5: (OPTIONAL — headline decision) Record one real pipeline trace

**Separable.** Only if the user greenlights it at review (see OPEN QUESTIONS D1). Edit `record-trace.mjs`
(new `SLUG`+`TASK` producing a keepable committed artifact via a node-only validate gate) → record for
real → curate → validate. Then point Station 5 at the new slug (and, if it is Fieldwork-flavored, let the
toggle swap the trace slug honestly).

### Phase 6: Cross-cutting sweep

**Depends on:** Phases 1–4 (+5 if taken).

**Tasks:** Legibility-nugget copy pass (voice contract, no callouts); every station check-terminated;
the three-honesty-surface sweep under both scenarios; confirm `trackFactoryDriven` fires once across any
drive; confirm deep links.

### Phase 7: Testing & Validation — keep all three gates green

**Depends on:** all included phases.

**Tasks:** Add the trace-ready wait to `visual.spec.mjs`; regenerate the two factory baselines via Docker;
twice-regenerate diff for determinism; token-lint + drift-check; manual walkthrough (both scenarios, the
ethics reveal, fallback, fire-once).

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — SETUP: branch + confirm the canon this slice consumes

- **IMPLEMENT**: `git fetch origin`; `git checkout -b feature/factory-integration origin/main`.
- **VALIDATE**:
  `git rev-parse --abbrev-ref HEAD` → `feature/factory-integration`;
  engine quadrant works —
  `node -e "import('./system/derive.mjs').then(m=>console.log(m.derive({brandColor:'#2F7A4D',density:'comfortable',rewardType:'self',frequency:'daily',improvesLives:true,wouldUseIt:true}).ethics))"`
  → prints `{ frequency:'daily', passesFrequencyFilter:true, verdict:'Habit-forming candidate …', quadrant:'facilitator' }`;
  and Fieldwork (no booleans) →
  `node -e "import('./system/derive.mjs').then(m=>console.log(m.derive({brandColor:'#B4530A',density:'compact',rewardType:'hunt',frequency:'monthly'}).ethics))"`
  → `verdict:'Utility …'`, **no `quadrant`** key. Confirm `test -f traces/demo-notice.jsonl && test -f handoff/verdant/pack.bundle.json && echo OK`.
- **SATISFIES**: precondition for all ACs (verifies the "verdicts differ" + "no-matrix" facts the plan relies on).

### Task 1 — REFACTOR `factory-intake.mjs`: Verdant constants → a `SCENARIOS` map

- **IMPLEMENT**: Wrap today's `WIZARD` + `DEFAULTS` (+ the fictional-label text + a new `ethicsReveal`
  field) into `SCENARIOS.verdant`, **verbatim** for Verdant so its behaviour is byte-unchanged. Add
  `const DEFAULT_SCENARIO = "verdant"`. Keep `ENUM`, `LABELS`, `esc`, and the DOM helper `el()`
  module-level (scenario-independent). Populate `SCENARIOS.verdant.ethicsReveal` from
  `scenarios/verdant/copy.json` (`verdict:"habit-justified"`, the `narrative` paragraph).
- **PATTERN**: 10.2's inlined-config style (module header cites the inline-not-fetch rationale).
- **GOTCHA**: The Verdant `defaults` must **still omit** `improvesLives`/`wouldUseIt` — those are the
  reader's to place (Task 6), not seeded. Verdant's authored `true/true` lives in `ethicsReveal` copy, not
  in `defaults`.
- **VALIDATE**: `node -e "import('./system/factory-intake.mjs').then(()=>console.log('ok')).catch(e=>{console.error(e.message);process.exit(1)})"` (module still parses under Node; DOM code stays behind the `document` guard). Manual: `/factory` under Verdant looks identical to pre-change.
- **SATISFIES**: AC1 (structural precondition).

### Task 2 — ADD `SCENARIOS.fieldwork`: axes, wizard reasoning, fictional label, ethics reveal

- **IMPLEMENT**: New entry with `defaults = { brandColor:"#B4530A", density:"compact", rewardType:"hunt", frequency:"monthly" }`
  (from `scenarios/fieldwork/intake.defaults.json` axes). `wizard` = 4 `{axis,prompt,reasoning}` entries,
  reasoning **distilled from that file** (≤ ~30 words each, teach discipline): brand (author honest-to-Fieldwork's
  orange), density=compact (from `friction.reasoning` line 53 — "time under pressure … a board that acts
  from the overview"), rewardType=hunt (from the problem/dispatch framing), frequency=monthly (from
  `target-behavior.reasoning` line 35 — "below the habit zone … a designed habit loop has nothing
  legitimate to attach to"). `fictionalNotice` from `fieldwork/copy.json:2`. `ethicsReveal` from
  `fieldwork/copy.json:4–7` (`verdict:"utility"`, the `narrative`).
- **PATTERN**: `SCENARIOS.verdant` shape from Task 1.
- **GOTCHA**: Fieldwork `defaults` **omit** the two booleans (design: "needs no matrix"). The prompts are
  the *reader-facing* questions; the reasoning is the recommended-default rationale (same contract as
  Verdant). Every `defaults[axis]` must be a member of its `ENUM[axis]` — the existing fail-fast assert
  loop must run per scenario (extend it to iterate `Object.values(SCENARIOS)`).
- **VALIDATE**: extend the top-of-module assert to loop scenarios; `node -e "import('./system/factory-intake.mjs')…"` still parses. Manual comes in Task 5.
- **SATISFIES**: AC1, AC2.

### Task 3 — ADD the toggle control + `setScenario(slug)` (state re-seed)

- **IMPLEMENT**: In `init()`, after resolving the anchors, add a toggle mount (`#scenario-toggle`, static
  in HTML — Task 8). Render a labelled control: two options (from `SCENARIOS` keys / `scenarios/index.json`
  labels), `active` checked. On change → `setScenario(slug)`: set `active`, `answers = { ...SCENARIOS[slug].defaults }`,
  `step = 0`, `ethicsPlacement = null` (reset the guess), call `markDriven()` (fire-once), then
  `renderScenarioChrome()` + `renderWizard()` + `run()`. Seed `active = DEFAULT_SCENARIO`.
- **PATTERN**: the wizard's radio-group builder (`renderControl`) for the control widget; reuse `.btn` or
  a small `.fw-toggle` styled group.
- **GOTCHA**: Toggling counts as a **drive** → it must go through the same fire-once path as a wizard
  change (advisor blind spot #4: fire once on the *first of any* drive — wizard change, toggle, or ethics
  placement — not once per type). Refactor the 10.2 inline `if(!driven){…}` into a shared `markDriven()`
  and call it from `setAnswer`, `setScenario`, and the ethics placement handler.
- **VALIDATE**: `grep -c "markDriven" system/factory-intake.mjs` → ≥3 (setAnswer, setScenario, ethics).
  Manual (after Task 8): toggling swaps the wizard defaults + re-skin; the analytics event still fires
  exactly once total (temporary `console.log` in `markDriven`).
- **SATISFIES**: AC1, AC6.

### Task 4 — ADD `renderScenarioChrome(scenario)`: the per-scenario surfaces outside the wizard

- **IMPLEMENT**: One function updating the non-wizard per-scenario DOM on scenario change:
  - **Station 1 fictional label** (`#fw-scenario`): set its text to the active `fictionalNotice`
    (honesty surface #1 swaps per scenario — `scenarios/README.md` makes this validator-enforced for the
    protos; the factory's own label must be equally truthful).
  - **Station 3 active proto**: show only the active scenario's `.factory-embed-figure` (Verdant phone /
    Fieldwork board), hide the other (`hidden` attribute). The visual `mask` selector still matches the
    shown iframe. Keep both figures in the static HTML; the toggle just flips visibility.
  - **Station 4 handoff copy** (`#handoff-note`): Verdant → the real-pack copy + the badge stays "Runs
    now" + the real download link. Fieldwork → honest note "Fieldwork's handoff pack is in build; the
    real pack below is Verdant's" and the pack links **still point at Verdant's real pack** (always
    reachable). Do NOT fabricate a Fieldwork pack link.
  - **Station 5 agents copy** (`#agents-note`): scenario-neutral honest line (the demo-notice run is a
    real spec-authoring task, not a per-scenario generation run) — see Task 7. If Phase 5 recorded a
    Fieldwork trace, the toggle may swap the *note* accordingly; otherwise it is scenario-neutral.
- **PATTERN**: `textContent` swaps (trace-player convention — untrusted-value discipline even for authored
  copy); the `.capability`/`.capability.live` badge idiom for the honesty state.
- **GOTCHA**: This is the **honesty-surface sweep made mechanical** (Task 9 audits it). Under Fieldwork,
  no station may claim a Fieldwork pack/trace exists. The reframe (NOTES) is load-bearing: "swaps all five
  stations" = all five *respond*; Stations 4–5 respond by telling the truth via the capability indicator,
  with Verdant's real exhibits always visible.
- **VALIDATE**: manual — toggle to Fieldwork: Station-1 label reads the Fieldwork notice; only the
  Fieldwork board shows at Station 3; Station-4 note states the pack is in build (Verdant pack still
  linked); Station-5 badge is "Runs now" (the player is scenario-neutral). No station over-claims.
- **SATISFIES**: AC1, AC5 (honesty).

### Task 5 — VERIFY the toggle re-skins Stations 1–2 (engine swap, no new code)

- **IMPLEMENT**: No new code — this task confirms the existing `run()` + `renderNarrative()` already
  produce a *different* system for Fieldwork because `answers` changed. Confirm: palette flips green→orange,
  density comfortable→compact (spacing/type beat), patterns `self`→`hunt`, and **the ethics verdict text
  flips** "Habit-forming candidate" → "Utility — habit mechanics rejected". This is the ticket's
  load-bearing "verdicts differ" swap.
- **PATTERN**: existing `renderNarrative` beats 1–4.
- **GOTCHA**: Beat 4 (frequency→verdict) shows `result.ethics.verdict` text and **must stay
  always-visible and toggle-live** — that flipping verdict IS the AC3 / Done-criterion swap, and it needs
  **no interaction** (the frequency verdict is present in every `derive()` result, booleans or not). Task 6
  **adds** the matrix guess-then-reveal as a *separate* beat that touches only `ethics.quadrant`; do **NOT**
  gate the frequency verdict behind the reveal — that would hide the swap from a tester who toggles without
  revealing, and regress 10.2 (where Beat 4 renders the verdict unconditionally on every answer change).
- **VALIDATE**: manual — toggle Verdant⇄Fieldwork: the sample re-skins and the verdict text differs.
  `derive()` outputs already differ (proven in Task 0).
- **SATISFIES**: AC1, AC3 (verdicts differ).

### Task 6 — ADD the ethics guess-then-reveal (Manipulation Matrix beat)

- **IMPLEMENT**: **Keep Beat 4's always-visible frequency verdict** (Task 5) and **add** an interactive
  ethics beat *after* it, rendered into `#factory-narrative` (or a dedicated `#ethics-gate` sub-container).
  The new beat touches only `ethics.quadrant`, never the frequency verdict:
  - **Place (the guess) — PINNED DESIGN (no design decisions left):** render the Manipulation Matrix as a
    visible **2×2 grid** — the PRD's "placed on the Manipulation Matrix, out loud" makes the grid *the*
    interaction, not an optional extra. Row axis = "Does it materially improve users' lives?" (yes / no);
    column axis = "Would you use it yourself?" (yes / no); the four cells carry the quadrant names
    (facilitator / peddler / entertainer / dealer). The reader sets `improvesLives`/`wouldUseIt` by
    clicking a cell (implement as four cells acting as one radio set, or two paired yes/no radios that
    light the matching cell — either is fine, the cell is the source of truth). **No cell preselected**
    (blind spot #1: the reader must place it; the scenario's own booleans are NOT prefilled). The picked
    cell gets an accent outline **plus** a ✓/text marker (never colour-only — WCAG).
  - **Reveal (compare notes) — PINNED DESIGN:** a Reveal button, enabled only once a cell is picked. On
    click → `derive({ ...answers, improvesLives, wouldUseIt })` → the reader's `ethics.quadrant`; render a
    **two-column compare-notes panel**: **left** = *"Where you placed it: `<Quadrant>` — `<meaning>`"*
    (meaning lifted **verbatim** from the table below); **right** = *"The maker's verdict:"* + the active
    scenario's `ethicsReveal.narrative`. The frequency verdict already shows always-visible in Beat 4 —
    do **not** duplicate it here. **No score, no correct/incorrect, no red X, no "you guessed right"**
    (voice contract, hard) — the two columns simply sit side by side, two professionals' judgments.
  - **Quadrant meanings — lift VERBATIM (do NOT invent; source `__UX_UI_Research.md` §Layer B :65–68):**
    `facilitator` → "improves life ✓ / you'd use it ✓ — the goal."
    `peddler` → "improves life ✓ / you wouldn't use it ✗ — warning: you may be overselling."
    `entertainer` → "improves life ✗ / you'd use it ✓ — fine in moderation."
    `dealer` → "improves life ✗ / you wouldn't use it ✗ — exploitation. Don't."
  - **No-quadrant scenario handling:** the *scenario's* own verdict is frequency-driven regardless. For
    Fieldwork (whose axes omit the booleans by design), the maker's-verdict side leads with "the frequency
    filter already failed — the honest verdict needs no matrix: utility" (its authored narrative). The
    reader still gets *their* quadrant from *their* placement; the lesson is that the maker didn't need
    the matrix here. Do NOT add booleans to Fieldwork to force a scenario quadrant.
  - Reset the placement to un-placed on scenario toggle (Task 3 sets `ethicsPlacement = null`).
  - Placing the product (first boolean set) counts as a **drive** → `markDriven()`.
- **PATTERN**: `renderControl`'s radio builder for the two yes/no controls; `esc()` for any interpolated
  copy; build nodes with `createElement`/`textContent`.
- **GOTCHA**: The reveal is view-time-safe like the rest — the `derive()` call is behind the module's
  try/catch discipline (or reuse `run()`'s result and only recompute the quadrant). Keep the widget
  reduced-motion-safe (no reveal animation, or respect `prefers-reduced-motion`). Quadrant *meanings* are
  authored labels (from `__UX_UI_Research.md` §Layer B), NOT invented — cite them in a code comment.
- **VALIDATE**: manual — under Verdant, place "improves ✓ / would use ✓" → Reveal shows "facilitator"
  beside the habit-justified narrative; place "✗/✗" → "dealer" beside the *same* maker narrative (the
  maker's verdict doesn't change with the reader's guess — compare notes, not grading). Under Fieldwork,
  the maker's side leads "needs no matrix → utility". No "correct/incorrect" text anywhere.
  `grep -iE "correct|wrong|score|✓ *correct" system/factory-intake.mjs` → no grading language.
- **SATISFIES**: AC4 (the guess-then-reveal), AC3.

### Task 7 — UPDATE `factory.html`: mount the trace player at Station 5

- **IMPLEMENT**:
  - Replace the Station-5 `.lineup` link-out (lines 279–288) with a mount: an `#agents-note` scenario-
    neutral honest paragraph + `<div id="agents-player"></div>`. Flip the badge (line 272)
    `<span class="capability">In build</span>` → `<span class="capability live">Runs now</span>`.
  - Honest Station-5 copy (surface #2): "A real Claude Agent SDK run from this factory, recorded step by
    step and replayed in the four PIV acts — plan · gate · implement · validate. This run authored a
    ComponentSpec; per-scenario generation traces are in build. Nothing runs live here; the page replays a
    committed file." (Adjust if Phase 5 recorded a generation trace.)
  - Add the inline mount `<script type="module">` (mirror `trace.html:90–118`): fetch
    `/traces/demo-notice.jsonl` → `parseTrace` → `renderTracePlayer(mount, …)` → set
    `mount.dataset.trace = "ready"`; on failure call an `errorCard(mount, msg)` helper. Mount **once**;
    **do not** re-render on toggle → **no `destroy()` needed** (advisor blind spot #3).
  - Port `trace.html`'s ~45 lines of `.trace-*` CSS (lines 22–68) into `factory.html`'s page-scoped
    `<style>`, verbatim, token-only. Open with the same justifying comment as the existing block.
- **PATTERN**: `trace.html` mount script + CSS; the `.capability.live` idiom.
- **GOTCHA**: Load the **curated** `/traces/demo-notice.jsonl` (not `.raw`). The player's stepping adds a
  document-level keydown listener — fine for a one-time mount. Keep the mount script AFTER the four chrome
  scripts + `factory-intake.mjs`. The `[data-trace="ready"]` attribute is the visual gate's wait handle
  (Task 11).
- **VALIDATE**: manual — Station 5 renders the four PIV act headers + step-1 card; Next/Prev (and ← →)
  step; the honesty label "Real run, curated for length" shows verbatim. `grep -c "capability live" factory.html`
  → **5** (all five stations now live); `grep -c 'class="capability"' factory.html` → **0**;
  `grep -c "agents-player" factory.html` → 1. **Verify the *semantic*, not just the count:** each of the
  five *station headers* carries `capability live`, and Station 5 no longer carries a separate raw-replay
  "Runs now" badge inside a lineup (the count of 5 holds only because flipping Station 5's header +1
  offsets removing that inner badge −1 — the count being right does not by itself prove the structure is).
- **SATISFIES**: AC5 (Station 5 mounted, honesty surface #2), AC7.

### Task 8 — UPDATE `factory.html`: toggle control, per-scenario anchors, Station-3 both-figures, ethics host, page CSS

- **IMPLEMENT**:
  - **Toggle**: add `<div id="scenario-toggle">` in the hero or atop Station 1 (a labelled scenario
    switch; the module renders the control into it). Include a static honest fallback (e.g. "Scenario:
    Verdant") the module replaces on mount.
  - **Station 1**: give the fictional label `id="fw-scenario"` so `renderScenarioChrome` can swap it.
  - **Station 3**: keep BOTH `.factory-embed-figure`s but ensure each is individually addressable
    (`data-scenario="verdant"|"fieldwork"`) so the toggle can show one and `hidden` the other. Default:
    Verdant visible, Fieldwork hidden.
  - **Station 4**: add `id="handoff-note"` to the copy the toggle updates; keep the real Verdant pack
    links.
  - **Station 5**: `#agents-note` + `#agents-player` (Task 7).
  - **Ethics host**: ensure `#factory-narrative` (or a nested `#ethics-gate`) exists for Task 6's render.
  - **Page CSS**: extend the existing `<style>` with token-only classes for the toggle (`.fw-toggle*`),
    the ethics 2×2 grid + reveal panel (`.fw-ethics*`, `.fw-quadrant*`, `.fw-reveal*`), plus the ported
    `.trace-*` block (Task 7). Colour/space/radius/type via `var(--…)`; grid/flex/px are structural
    literals — same justifying comment as the existing block.
- **PATTERN**: 10.2's page-scoped `<style>` + justifying comment; `hidden` attribute for show/hide.
- **GOTCHA**: **No new token, no components.css/portfolio.css edit** (page-scoped `<style>` reading
  existing tokens only — token-lint doesn't scan HTML `<style>`; inline `var()` refs only add
  orphan-consumers). The Station-3 default-visible figure must be **Verdant** (pins the baseline). Keep the
  sample surface + both proto iframes static in HTML (graceful if the module is slow/blocked).
- **VALIDATE**: `node tooling/token-lint.mjs` → `✓ … 0 undeclared · 0 orphan`; `grep -c "scenario-toggle" factory.html` → 1;
  `grep -c 'data-scenario' factory.html` → ≥2.
- **SATISFIES**: AC1, AC5, AC7.

### Task 9 — SWEEP: the three honesty surfaces, truthful under both scenarios

- **IMPLEMENT**: Audit (and fix) that under **both** scenarios:
  1. **Fictional labels (surface #1):** Station 1's label + both proto iframes carry a truthful
     fictional notice for the active scenario. Nothing implies a real company/user/data.
  2. **Trace label (surface #2):** Station 5 renders `meta.label` "Real run, curated for length"
     verbatim, and the surrounding copy does not claim the run is a per-scenario generation trace (it is a
     spec-authoring run) unless Phase 5 recorded one.
  3. **Capability indicators (surface #3):** every station badge states exactly what runs for the active
     scenario. Stations 1–3 = "Runs now" both scenarios. Station 4 = "Runs now" (Verdant pack real) with a
     Fieldwork "pack in build" note. Station 5 = "Runs now" (real trace, scenario-neutral).
- **PATTERN**: the `.capability` idiom; `scenarios/README.md` fictional-label rule.
- **GOTCHA**: This sweep is where the "toggle swaps all five stations" Done criterion meets the honesty
  contract (hard). Do **not** resolve the tension by hiding Verdant's real pack/trace behind a Fieldwork
  placeholder — keep the real exhibits reachable and label the gap. Do **not** consume `copy.json`'s
  `stations.handoff`/`stations.agents` verbatim (they over-claim per-scenario artifacts).
- **VALIDATE**: manual checklist (Level 4). `grep -i "produced fieldwork" factory.html` → none (no
  over-claim); `grep -c "in build" factory.html` → ≥1 (the honest Fieldwork pack note).
- **SATISFIES**: AC5.

### Task 10 — SWEEP: legibility nuggets · check-termination · deep links · fire-once

- **IMPLEMENT**:
  - **Legibility nuggets:** hold every new string (Fieldwork wizard reasoning, toggle label, ethics
    prompts + quadrant meanings + reveal framing) to the voice contract — phenomenon first / framework
    last; first-person testimony not second-person prescription; compare-notes not grading; ≤ ~30-word
    nuggets at the point of decision; **zero callouts/badges/"did you know"**. The `derive()` `notes`
    already carry the generation-station teaching (10.2) — extend the same register; add no lesson boxes.
  - **Check-termination:** confirm each station ends in a visible validation moment (TODO 5.3): Station 1
    → the wizard's Review jump; Station 2 → the WCAG table + the ethics reveal; Station 3 → each proto's
    source indicator; Station 4 → the inspect/download actions; Station 5 → the trace's result line +
    "Real run, curated" label. Add a one-line closing cue only where a station lacks one.
  - **Deep links:** confirm the five `#intake/#generation/#prototypes/#handoff/#agents` ids + the hero
    chip strip still resolve below the sticky header (90px margin) — the trace player and toggle must not
    break them.
  - **Fire-once:** confirm `markDriven()` fires `trackFactoryDriven()` exactly once across the first of
    any drive (wizard change / toggle / ethics placement).
- **PATTERN**: PRD §6 subtlety bar; `__UX_UI_Research.md` §10 voice contract; 10.2's fire-once guard.
- **GOTCHA**: "the moment teaching is visible as a feature, it has failed" — if a string reads like a
  lesson, cut it. Deep links are pure anchors (no router); don't add smooth-scroll (reduced-motion).
- **VALIDATE**: manual — read every new string against the voice contract; each station check-terminates;
  `/factory#agents` cold-loads onto Station 5; the event fires exactly once.
- **SATISFIES**: AC4, AC6, AC7.

### Task 11 — UPDATE `visual.spec.mjs`: trace-ready wait + regenerate baselines

- **IMPLEMENT**: On the `factory` entry in `PAGES`, keep `mask:'iframe.factory-embed'` and
  `waitReady:'#reskin-preview[data-reskin]'`; add a trace-ready wait (e.g. a second wait selector or extend
  the wait to also require `#agents-player[data-trace="ready"]`). Ensure the **default scenario (Verdant)**
  is what renders on cold load (baseline determinism). The ethics gate renders un-placed/un-revealed by
  default (deterministic — the reveal is not in the baseline). Regenerate the two factory baselines via
  the committed Docker path: `npm run update:docker`. **Prove determinism:** regenerate a second time and
  diff — byte-identical.
- **PATTERN**: the existing per-page optional-field pattern (`mask`, `waitReady`); 10.1/10.2 regen steps.
- **GOTCHA**: The trace player mounts async (fetch) → **must** be waited on or the capture races it (same
  class of bug `[data-reskin]` fixed in 10.2). `npm run update:docker` (Linux PNGs) is the ONLY correct
  regen — a bare macOS `--update-snapshots` fails CI. `git status --porcelain baselines/` should show
  ONLY the two factory PNGs; any other drift = the shared shell shifted (investigate). Docker must be
  running.
- **VALIDATE**: two consecutive `update:docker` runs → identical bytes; `git status --porcelain tooling/visual-regression/baselines/`
  → only `factory-neutral.png` + `factory-saulera.png`; `cd tooling/visual-regression && npm ci && npm test` → all pass.
- **SATISFIES**: AC8.

### Task 12 — (OPTIONAL, only if D1 = record) Record + wire a real pipeline trace

- **IMPLEMENT** *(execute only if the user greenlit Phase 5 at review)*:
  - Edit `portal/record-trace.mjs`: set a new `SLUG` (e.g. a Fieldwork component spec slug) and a new
    `TASK` whose **implement phase writes a keepable committed artifact** (e.g. `system/specs/<component>.md`)
    and whose **validate gate is a `node …` command** (the fence denies `npm`/`npx`). Keep the PIV-marker
    system-prompt contract.
  - Run for real: `node portal/record-trace.mjs --dry` (smoke), then `node portal/record-trace.mjs`
    (needs the CLI login or a `portal/.env` token; ~$0.45/run, may need iterations for clean PIV phases).
  - Curate: `node tooling/curate-trace.mjs traces/<slug>.raw.jsonl traces/<slug>.jsonl`. **Re-curate after
    any re-run** (the validator pairs raw↔curated by `sessionId`). Validate:
    `node tooling/validate-trace.mjs` → one ✓ per file.
  - Commit the keepable artifact **and** both JSONL files. Point Station 5 (Task 7) at the new slug —
    **the player still mounts ONCE** (the new trace becomes the single mounted, scenario-neutral run).
    Do **NOT** toggle-swap the *player* itself (re-rendering re-stacks its document-level keydown listener
    — the "no `destroy()`" invariant depends on a single mount). The toggle may swap only the Station-5
    *note text* (`textContent`), never the mounted player. Update Station-5 copy to match what the run
    actually did (honesty — no over-claim).
- **PATTERN**: `traces/README.md` workflow; `demo-notice` as the shape reference.
- **GOTCHA**: **Never hand-write or hand-edit trace content** (honesty contract, hard) — a bad run is
  fixed by a tighter prompt + re-run, never an edit. The artifact the run writes MUST exist in the repo
  (validate-trace checks `existsSync`) — pick a task that produces a file the repo genuinely wants, and
  **confirm it does not trigger a generator/drift cascade or leave an orphan before committing** (e.g. a
  Fieldwork ComponentSpec has no `handoff/fieldwork/` home and the wc wrappers are Verdant — it could
  cascade through `gen-handoff` or orphan; if so, pick a cleaner keepable artifact). If the run can't
  produce clean PIV phases in a couple of tries, **defer** to mount-on-demo-notice (Task 7) and record the
  deferral honestly.
- **VALIDATE**: `node tooling/validate-trace.mjs` → all ✓; the new artifact exists + is committed; Station
  5 renders the new trace with a truthful label.
- **SATISFIES**: AC5 (strengthens Station 5 to a genuine pipeline trace).

---

## TESTING STRATEGY

No unit/integration suite exists (CLAUDE.md: "no suite, no linter, no type-check — don't hunt for or
invent one"). "Done" = **run the surface you touched** + the three CI gates green.

### Unit Tests
- None. `derive()` (incl. the ethics quadrant) and `parseTrace`/`renderTracePlayer` are proven canon;
  this slice adds view-time wiring around them.

### Integration Tests (the CI gates — these ARE the acceptance gate)
- **token-lint**: `node tooling/token-lint.mjs` → `✓` (HTML `<style>` isn't scanned; no token added).
- **drift-check**: `node tooling/drift-check.mjs` → `✓` (no generated artifact/spec touched — unless
  Phase 5 authored a spec, in which case regenerate the pack + re-run drift-check per the spec workflow).
- **validate-trace**: `node tooling/validate-trace.mjs` → all ✓ (guards the existing demo-notice trace;
  and any Phase-5 trace).
- **visual-regression**: `cd tooling/visual-regression && npm test` → all green after the two factory
  baselines regenerate through the trace-ready-gated spec.

### Edge Cases
- **Toggle mid-wizard**: switching scenario at step 3 resets to step 0 with the new defaults + un-placed
  ethics; no stale state from the prior scenario.
- **Ethics reveal before placing**: the Reveal action is disabled until both booleans are set (no reveal
  of an empty guess).
- **Fieldwork no-quadrant**: the reveal explains "needs no matrix → utility" (the maker didn't place it);
  the reader still gets their own quadrant. No crash, no invented Fieldwork quadrant.
- **`derive()` throw (fallback)**: unreachable via bounded inputs; forced → preview reverts to the neutral
  pack, honest note, badge stays honest (the sample surface is static HTML).
- **Trace fetch fails**: `errorCard` names the failed path; Station-5 badge should degrade honestly if the
  player can't mount (the mount script sets `[data-trace]` only on success — the gate waits, so a real CI
  failure surfaces rather than a false-green).
- **saulera pack**: the preview stays the active scenario's derived palette (inline props outrank the
  pack); both factory baselines regenerate; only chrome differs between the two.
- **Reduced motion**: no reveal/transition animation added; anchor jumps stay instant.
- **Fire-once**: exactly one `/factory/driven` virtual pageview across any first drive.
- **Deep link `/factory#agents`** cold load: lands on Station 5 below the sticky header; player mounts.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style
- Module parses under Node:
  `node -e "import('./system/factory-intake.mjs').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"`.
- Sanity greps:
  `grep -c "capability live" factory.html` → `5`;
  `grep -c 'class="capability"' factory.html` → `0`;
  `grep -c "agents-player" factory.html` → `1`;
  `grep -c "scenario-toggle" factory.html` → `1`;
  `grep -ciE "correct!|you're right|wrong answer|score" system/factory-intake.mjs factory.html` → `0` (no grading).

### Level 2: Token + drift + trace gates
- `node tooling/token-lint.mjs` → `✓ … 0 undeclared · 0 orphan · DTCG valid`
- `node tooling/drift-check.mjs` → `✓`
- `node tooling/validate-trace.mjs` → one `✓` per `traces/*.jsonl`

### Level 3: Visual-regression gate
- `cd tooling/visual-regression && npm run update:docker` (twice; diff → identical bytes)
- `cd tooling/visual-regression && npm ci && npm test` → all pass
- `git status --porcelain tooling/visual-regression/baselines/` → only the two factory PNGs

### Level 4: Manual Validation (serve the repo: `npx serve .` → `http://localhost:3000/factory`)
- [ ] Page renders under neutral; chrome injected; Factory nav active; **no console errors**.
- [ ] Default scenario = **Verdant**: green palette, comfortable, `self`, verdict "Habit-forming candidate".
- [ ] **Toggle → Fieldwork**: palette flips **orange**, compact, `hunt`; verdict flips to **"Utility —
      habit mechanics rejected"**; Station-1 fictional label swaps; only the **Fieldwork board** shows at
      Station 3; Station-4 note says the Fieldwork pack is in build (Verdant pack still linked);
      Station-5 badge "Runs now".
- [ ] **Ethics guess-then-reveal**: nothing preselected; place "improves ✓ / would use ✓" → Reveal shows
      **facilitator** beside the maker's habit-justified narrative; place "✗/✗" → **dealer** beside the
      *same* maker narrative (no grading). Under Fieldwork, the maker's side leads "needs no matrix →
      utility".
- [ ] **Station 5**: the demo-notice run replays in four PIV acts; "Real run, curated for length" shows
      verbatim; Next/Prev + ← → step; Show all works.
- [ ] **Fire-once**: the first drive (toggle OR wizard change OR ethics placement) fires
      `trackFactoryDriven` exactly once (temporary `console.log` in `markDriven`); subsequent drives don't.
- [ ] **Deep links**: `/factory#agents`, `/factory#generation` cold-load onto the right station below the
      header; hero chips scroll correctly.
- [ ] **Honesty sweep**: no station over-claims under either scenario; all three surfaces present.

### Level 5: Additional Validation (Optional)
- Deploy preview not required (deploy = epic Step 3). The CI PR checks (drift-check · token-lint ·
  validate-trace · visual-regression) are the gate.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** — A Verdant⇄Fieldwork toggle swaps the pipeline: Stations 1–3 change content live (wizard
      defaults + reasoning, fictional label, re-skin, narrative, active proto); Stations 4–5 respond
      honestly via their capability indicators. Default scenario = Verdant.
- [ ] **AC2** — The Fieldwork scenario's four axes + wizard reasoning are inlined (distilled from
      `scenarios/fieldwork/*`), with the fail-fast default-membership assert running per scenario.
- [ ] **AC3** — The two ethics **verdicts differ**: Verdant "Habit-forming candidate", Fieldwork "Utility
      — habit mechanics rejected" — driven live by `derive()` from the swapped frequency axis.
- [ ] **AC4** — The ethics **guess-then-reveal** works: the reader places the product on the Manipulation
      Matrix (two booleans, never prefilled) → their quadrant; a Reveal shows the maker's authored verdict
      beside it in the **compare-notes register (no score, no correct/incorrect)**. Fieldwork's no-quadrant
      case is handled honestly ("needs no matrix → utility"). Zero pedagogy callouts.
- [ ] **AC5** — The trace player is **mounted at Station 5** on the real `demo-notice` run (or a Phase-5
      trace), replayed in the four PIV acts with "Real run, curated for length" verbatim; badge = "Runs
      now". All three honesty surfaces present and truthful under **both** scenarios (no over-claim).
- [ ] **AC6** — `trackFactoryDriven()` fires **exactly once**, on the first of any drive (wizard change /
      toggle / ethics placement), never on the initial auto-render.
- [ ] **AC7** — Every station is check-terminated; new copy meets the voice contract (no callouts/badges);
      station deep links resolve below the sticky header.
- [ ] **AC8** — All CI gates green: drift-check · token-lint · validate-trace · visual-regression (factory
      baselines regenerated via Docker through the trace-ready-gated spec; twice-regenerate diff proves
      determinism).
- [ ] **AC9 (Closes #10)** — With AC1–AC8 met, the ticket's Done-when holds: "toggle swaps all five
      stations (verdicts differ), event fires, all three honesty surfaces present." The PR message carries
      `Closes #10`.

---

## COMPLETION CHECKLIST

- [ ] All included tasks completed in order (0 → 11; 12 only if D1 = record).
- [ ] Each task validation passed immediately.
- [ ] token-lint + drift-check + validate-trace pass locally.
- [ ] Visual-regression green with **only** the two factory baselines changed; twice-regenerate diff
      byte-identical.
- [ ] Manual walkthrough (Level 4) all boxes ticked, both scenarios, incl. the ethics reveal + fire-once.
- [ ] No new token, no components.css/portfolio.css change, no generator run (unless Phase 5 authored a
      spec → pack regenerated + drift-check re-run), no view-time LLM, no build step.
- [ ] No trace content hand-written/hand-edited (honesty contract).
- [ ] Committed on `feature/factory-integration`; PR message references `Closes #10` (e.g. "feat: Factory
      integration — scenario toggle + ethics guess-then-reveal + trace station, closes the five-station
      pipeline (#10, slice 10.3)").

---

## OPEN QUESTIONS / ASSUMPTIONS

**D1 (HEADLINE DECISION) — record a new bespoke pipeline trace, or mount on the existing `demo-notice`
run?** The ticket says "record one real pipeline trace." Two honest paths (the mount work is identical
either way):
- **(A) Mount on `demo-notice`** (Tasks 7, Phase 4). Real, curated, validates green **today**; pure
  front-end. It's a spec-authoring run (not a per-scenario generation narrative) and pre-#25 (no
  redaction/fence governance story). **This is the guaranteed core deliverable.**
- **(B) Also record a new trace** (Task 12, Phase 5). Richer — auto-stamps `meta.redaction`, can showcase
  a real fence denial, and can be Fieldwork-flavored so Station 5 honestly swaps under the toggle. Costs:
  edit the runner (new TASK+SLUG), a task with a **keepable committed artifact** + a **node-only validate
  gate**, ~$0.45×N iterations, and the risk the model needs several runs for clean PIV phases.
  **Recommendation: ship (A) as the core; take (B) as a separable follow-on if you want the genuine
  generation trace and are OK with the cost.** *Confirm at plan review before Phase 5.* (If (B), also
  decide the exact keepable artifact — a currently-missing Fieldwork ComponentSpec is thematically ideal
  but may **cascade** (no `handoff/fieldwork/` home; the wc wrappers are Verdant) or **orphan** — confirm
  it doesn't before committing, or pick a cleaner keepable file. Either way the player still **mounts
  once**: a Phase-5 trace *replaces* demo-notice as the single mounted run, it is not a toggle-swapped
  player.)

**D2 — Stations 4–5 under the toggle: RESOLVED (not asking).** Per the honesty reframe (NOTES): keep
Verdant's **real** pack + trace always visible; Stations 4–5 respond to the toggle by stating Fieldwork's
are in build via the capability indicator. Building a Fieldwork pack/trace is out of the ~300–450-line
budget and would be a generator/agent run, not this slice.

**D3 — Inline vs fetch per-scenario config: RESOLVED (inline both).** Stage-safety (a fetch failure =
"Runs now" over a broken wizard) + screenshot determinism decide it under the honesty contract. 10.2's
"toggle slice introduces the fetch path" forward-reference was a guess with less info; there are exactly
two scenarios. `copy.json`/`intake.defaults.json` stay the durable authoring record; the module inlines a
distilled copy (accepted duplication, same call 10.2 made for Verdant).

**D4 — Station 3 under the toggle: RESOLVED (show the active scenario's proto).** "Toggle swaps" means one
proto at a time; both figures stay in the HTML, the toggle flips visibility. The `mask` selector still
matches the visible iframe.

**Assumptions:**
1. The reader's matrix placement drives *their* quadrant; the scenario's authored `ethicsReveal.narrative`
   is the fixed "maker's verdict" partner (it does not change with the reader's guess — that's the
   compare-notes design). Verdant's `improvesLives/wouldUseIt=true` are the maker's position (in the
   narrative), never the reader's start state.
2. Inlining keeps the on-load + on-toggle apply synchronous, so the `[data-reskin]` + trace-ready gates
   make the screenshot deterministic by construction.
3. `demo-notice` mounted at Station 5 satisfies "agents visible" + honesty surface #2 for closing #10;
   a bespoke generation trace (D1-B) is an enhancement, not a blocker.

---

## NOTES (open canvas)

**The load-bearing reframe: read "swaps all five stations" through the honesty contract.** The ticket's
"(verdicts differ)" parenthetical + the PRD's "the ethics gate is the one guess-then-reveal moment" pin
the *load-bearing* swap to Stations 1–2 (axes → generation → verdict). The ~300–450-line budget
corroborates: a Fieldwork handoff pack is a generator run and a Fieldwork trace is a recorded agent run —
both far outside this slice. So "swaps all five stations" = all five *respond* to the toggle; Stations 4–5
respond by honestly stating "Fieldwork's pack/trace: in build" via the capability indicator, with
Verdant's real exhibits always reachable. That is not a reluctant compromise — it's the honesty surface
doing exactly its job, and the only reading consistent with a HARD honesty constraint. A technical reader
should always be able to reach the *real* pack and the *real* trace; the toggle labels the gap, it doesn't
hide the real thing behind a placeholder.

**Why inline, again (re-affirming 10.2 with more information).** A config *fetch* on toggle would
reintroduce exactly the two failure modes 10.2 inlined to avoid, now under the toggle: (1) a fetch failure
would leave a "Runs now" badge over a non-rendering wizard — a dishonest state on the one page whose whole
contract is honesty; (2) a module that repaints after an async fetch can race the visual-regression
capture. With exactly two known scenarios, "flexibility to load arbitrary scenarios" is speculative
generality (CLAUDE.md: "no flexibility that wasn't requested"). Inline both; keep `copy.json` as the record.

**The ethics interaction is the platform's thesis in miniature.** The whole portfolio argues the method is
real. The single most persuasive proof is the *same gate ruling the other way*: a B2B monthly tool where
the honest answer is "there is no habit worth designing for." Fieldwork's `monthly` frequency → the
utility verdict → habit mechanics rejected is that proof, and the guess-then-reveal makes the reader feel
it (place it themselves, then see the maker refuse to habit-design). Preserve Fieldwork's deliberate
absence of the matrix booleans — "needs no matrix" is the lesson, not a gap to fill.

**Data-flow (one scenario):**
`toggle/wizard/ethics change → markDriven() (once) → answers updated → run() → try derive(answers) →
apply tokens to #reskin-preview [data-reskin=ready] + renderNarrative + ethics beat`. The ethics reveal
recomputes only the quadrant from the reader's two booleans; the frequency verdict + palette come from the
scenario axes. Everything synchronous after the deferred module load; no network at view time; the trace
player replays a committed file. `renderScenarioChrome` updates the non-wizard surfaces (label, proto,
Stations 4–5 copy). The trace player mounts once, independent of all of this.

**Line-budget realism (not a correctness risk).** This is bigger than 10.2. Rough split (excl. ported
CSS): Fieldwork config + asserts ~60; toggle + `setScenario` + `renderScenarioChrome` ~90; ethics
guess-then-reveal ~120; trace mount script + Station-5 copy ~30; `factory.html` station edits ~80; page
CSS ~90. ~470 module/HTML + ~45 ported CSS → realistic ~550–650 for the core (Phase 5 excluded). **Budget
overrun threatens nothing but tidiness** — every AC is met by correct behaviour, not by a line count.
Concrete pre-planned trims if it passes ~800 (excl. CSS): (1) the ethics reveal reuses `renderNarrative`'s
`beat()` helper + the same `el()`/`esc()` builders as the WCAG table — one shared render path, not a
second; (2) `renderScenarioChrome` is plain `textContent`/`hidden` swaps, no new render machinery;
(3) the two scenario configs are data, not code. Separating Phase 5 keeps the core bounded — deliberate.

**Sequencing / coupling risks (low).** (1) The visual `mask` selector `iframe.factory-embed` must keep
matching the *visible* proto after the toggle hides one — it does (the selector matches by class, `hidden`
elements are still masked; the shown one is what matters). (2) The trace-ready attribute name
(`[data-trace="ready"]`) couples `factory.html`'s mount script to `visual.spec.mjs`'s wait — keep them in
sync. (3) The fire-once refactor to `markDriven()` must be called from all three drive sites — a missed
site = the event never fires from that path (grep-checked in Task 3/10).

**Advisor blind spots folded in:** (1) never prefill the reader's matrix guess; (2) trace-ready wait for
the async mount (screenshot determinism); (3) no `destroy()` — the player mounts once, never re-rendered on
toggle; (4) `markDriven()` fires once across *any* drive type; (5) line-budget realism + each station's
check-termination mapped to an AC.

**Confidence for one-pass success: 9.5/10 — for the core (Phases 0–4, 6–7).** Earned, not asserted: the
core is deterministic front-end wiring over **proven canon** — `derive()` (incl. the `ethics.quadrant`
this slice drives, verified live in Task 0), `trace-player.mjs` (mounted exactly as `trace.html` proves),
and the 10.2 wizard/re-skin module this extends. The three idiom systems (capability badges, page-scoped
`<style>`, `[data-reskin]`/mask visual gate) are established. The one genuinely-novel interaction — the
ethics guess-then-reveal — is now **pinned to an unambiguous design with verbatim copy**, so no design
decision is left to the implementer. The two engine-conflation contradictions the advisor caught are
fixed. Residual 0.5 (why not 10): the ethics-widget CSS polish and the realistic line budget are **craft,
not correctness** — no AC depends on either. **Phase 5 (record a new bespoke trace) is deliberately
EXCLUDED from this score**: it is user-gated + separable, and a real agent run's phase-marker cleanliness
can need iterations (recorder-hardening report: 3 runs for the dry task) — that inherent uncertainty is
quarantined out of the one-pass core, which ships fully on the guaranteed mount-on-`demo-notice` path.

## AMENDMENTS

<!-- Append-only; newest at the bottom. Empty at creation. -->

- 2026-07-19 — **Risk-retirement pass (plan → execution-ready, 8.5 → 9.5).** Retired the three residual
  risks that had held the core at 8.5: (1) **Pinned the ethics-widget design** (Task 6) — the Manipulation
  Matrix renders as a visible 2×2 grid, reader picks a cell (no preselection), Reveal → a two-column
  compare-notes panel; removed the "optionally"/design-open language so nothing is left to invent.
  (2) **Lifted the four quadrant meanings verbatim** from `__UX_UI_Research.md` §Layer B (:65–68) into
  Task 6 — no copy invented. (3) **Firmed the line-budget mitigation** (named the shared render helpers;
  recorded that overrun is tidiness, not correctness). (4) **Scoped the 9.5 to the deterministic core**
  (Phases 0–4, 6–7) and explicitly quarantined Phase 5's run-iteration uncertainty out of it, since the
  core ships fully on the guaranteed `demo-notice` mount. No scope or approach change — the reframe, the
  inline-config call, and the honesty handling of Stations 4–5 all stand.
