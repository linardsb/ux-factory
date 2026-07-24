# Feature: v3 built-screen peak (beat 3) — assembles under answers + brand, adjustable live

The following plan should be complete, but it's important that you validate documentation and codebase
patterns and task sanity before you start implementing. Pay special attention to naming of existing utils,
types, and models — import from the right files (`readRecord` from `pack-derived.mjs`, `derive` from
`derive.mjs`, `renderComposition`/`validateComposition` from `agentic-renderer.mjs`, `createBus` from
`action-bus.mjs`, `registerBeat` from `spine.mjs`, `trackFactoryDriven` pattern in `analytics.mjs`).

> ⛔ **READ PHASE 0 FIRST.** Two calls must be confirmed by the owner before implementation starts: (1) the
> honesty framing of a hand-authored example composition, and (2) whether the peak reflects the visitor's
> live density/frequency answers or only brand+ethics. Both change the work. Do not skip.

## Feature Description

Beat 3 of the v3 home spine — **the emotional peak, visually singular** (the one dark band). Today the
`#beat-peak` region (`index.html:165-219`) is a **static still**: a hand-authored Verdant screen with two
faux tiles, two faux "Pass AA" rows, and a `<details>` ethics gate, honestly captioned *"An illustrative
still. The live build measures each pair with the real contrast engine and shows the receipts."* (#71 built
it; the inline comment reads *"#75 makes it assemble."*)

This ticket **makes it live**: when the reader reaches the beat, a Verdant product screen **assembles**
(skeleton-to-content) built by the **real declarative renderer**, **re-skinned to the visitor's brand**,
with **WCAG receipts drawn from the real `derive()` contrast pairs**, the **Manipulation-Matrix ethics gate**
as the one guess-then-reveal, and — the owner-chosen upgrade (Option B, 2026-07-24) — the reader can
**adjust the assembled screen live and watch the renderer refuse anything out of vocabulary**. No view-time
LLM. Everything wraps `try/catch` → the committed static still. `/factory/built` fires once on arrival.

## User Story

As a **hiring manager scanning the site as a work sample**,
I want to **watch a real product screen assemble under my brand, see its accessibility measured live, and
then touch it and watch the design system enforce its own contract**,
So that **I experience senior UX-engineering judgment being performed on my own inputs, instead of reading a
claim about it — the difference between watching a demo and test-driving the system.**

## Problem Statement

The v3 spine's peak is currently a static still. The site's thesis is *verifiable* senior skill, and the
market treats the site itself as a graded work sample (v3 PRD §2). A still asks the reader to imagine the
capability; it doesn't perform it. The peak is the moment designed to *perform* it — and it's inert.

## Solution Statement

Register `#beat-peak` on the existing `spine.mjs` beat seam (`activateOn:'visible'`). On arrival, a new
hand-written module `system/peak.mjs` runs the **real** `derive()` on the visitor's brand + answers, builds a
committed Verdant **example composition** through `renderComposition()` into a detached mount, animates it in
(skeleton-to-content), swaps it over the static still (**build-then-swap** — the still is never destroyed
until the live build succeeds), draws the real WCAG receipts from `derive().checks`, reveals the
Manipulation-Matrix quadrant from `derive().ethics.quadrant`, and exposes a **restrained** adjust-live surface
(one clean positive adjustment + the out-of-vocabulary refusal probe) reusing the proven
`agentic-study.mjs` pattern. `analytics.mjs` gains `trackFactoryBuilt()` (its own fire-once guard). The new
`motion-skeleton-to-content` token enters `tokens.source.json` (both groups) and runs the full regen chain.

The **disciplined** adjust-live is load-bearing: per v3 PRD §2, *"interactive toys with no functional tie to
a real capability read as decoration and count against the candidate"* (the owner's own v2 verdict:
*"weird colour selectors, for what"*). The adjustment is tied to a real capability — the renderer's
vocabulary validation — and its **refusal** (naming the exact offending path) IS the thesis, not a gimmick.

## Out of Scope / Non-Goals

- **Not included: per-employer agent-composed prototypes.** The composition is a **committed example**, not
  generated per visitor. Agent-composed, per-employer views are epic **#86** (upgrades this peak later by
  swapping the composition *source*, not this render/adjust machinery). Do **not** build or call a live LLM.
- **Not included: a real Verdant `record-composition` run.** Parameterizing `record-composition.mjs` off
  Fieldwork is **#88** (gated, deferred). Authoring a real Verdant agent-composed view here would be scope
  creep into #88. Stay out — this ticket uses a hand-authored example (see Phase 0 honesty gate).
- **Not included: the Fieldwork compositions.** The issue body names `proto/compositions/*` (all Fieldwork),
  but the home is **Verdant-only** (the skeleton, the intake, and `spine.mjs` `CANNED_AXES` all agree). The
  peak is a **Verdant** screen. The Fieldwork compositions stay the `/agentic-ui-study` page's domain.
- **Not included: beat 4 (the close) / pack control / evidence surfaces.** Those are #77 / #76 / #78-#81.
- **Not changing: the shared wizard's behaviour on `factory.html` / `instance.html`.** If the live-answers
  seam is added (Phase 0 decision #2), it is **additive and optional** — those pages pass no callback and are
  byte-unaffected. Regression-verify both still initialise.
- **Not building: a full control panel.** The peak stays visually singular — one positive adjustment + the
  refusal, NOT the full `agentic-study` control grid.

## Feature Metadata

**Feature Type**: New Capability (view-time behaviour on a shipped page)
**Estimated Complexity**: High (~700–1,200 LOC per the issue; the adjust-live surface + honesty framing add care, not research — the substrate is proven)
**Primary Systems Affected**: `system/peak.mjs` (new) · `index.html` (#beat-peak region + script list) · `system/analytics.mjs` · `system/portfolio.css` · `system/tokens.source.json` + full regen chain · (optional, decision #2) `system/factory-intake.mjs` + `system/intake-beat.mjs`
**Dependencies**: none new. Reuses `derive.mjs`, `agentic-renderer.mjs`, `action-bus.mjs`, `spine.mjs`, `pack-derived.mjs`, `wcag.mjs` (via derive), the generated `handoff/verdant/vocabulary.json`.

## Related Work

**Implements**: [#75 — P2c · The built-screen peak (beat 3)](https://github.com/linardsb/ux-factory/issues/75) — `Closes #75`
**Epic**: [#70 — portfolio v3](https://github.com/linardsb/ux-factory/issues/70), phase P2 · Architecture: `docs/epics/portfolio-v3-experience.architecture.md`

**Back-references** (inherits decisions from):

- `.claude/plans/v3-spine-skeleton.md` (#71) — Why: built the `#beat-peak` static still + the honest "this is what it builds" framing this ticket makes live; the region contract.
- `.claude/plans/v3-hero-choreography.md` (#72) — Why: established `spine.mjs` (the beat seam this plugs into) + the scoped-re-skin + fail-closed patterns to mirror.
- `.claude/plans/v3-your-brand-input-derived-pack-persistence.md` (#74) — Why: `pack-derived.mjs`'s `readRecord()` is how the peak reads the visitor's brand; the inline-`:root` re-skin coexistence rules.
- `.claude/plans/v3-intake-stakeholder-rewrite.md` (#73) — Why: `intake-beat.mjs` mounts the Verdant-only 3-axis wizard; the comment *"the Manipulation Matrix is #75's"* hands the ethics gate here.
- Memory `ticket-75-scope-decision.md` — the Option-B scope decision (2026-07-24) and its discipline caveat.

**Forward-references**:

- Epic **#86** (#88 → #89 → #90) — the generative prototyper; upgrades this peak's composition *source* to per-employer agent-composed later. Author the example composition so it is trivially swappable (a `{name,props,children}[]` the renderer already accepts).
- #82 (P4) — removes the VR freeze + full baseline regen at final merge; inherits this peak's at-rest state.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING!

- `system/agentic-study.mjs` (whole file, 220 lines) — **the template for the adjust-live surface.** Mirror:
  `renderStudy(container,{vocab,entries,bus})→{destroy()}` shape; `clone` (`:23`), `renderPreview` build-and-
  swap (`:118-130`), the **boundary probe** (`:135-145`, non-destructive, `setRefusal` verbatim), `setTone`/
  `removeTile`/`moveTile` (`:147-163`, each: mutate working copy → `bus.emit` a `ui.intent` → re-render), the
  `el()` DOM-builder (`:25-35`, never `innerHTML` from data), `destroy()` cleanup (`:219`). Take the *pattern*,
  build a **restrained** peak-specific surface — not a copy of the full control grid.
- `system/agentic-renderer.mjs` (350 lines) — `validateComposition(vocab, composition, path?)` (`:31`, pure,
  throws naming the path) + `renderComposition(vocab, composition, bus, path?)` (`:334`, validates then builds).
  Verdant `TEMPLATES`: `stat-tile` (`:223`), `plant-card` (`:250`), `care-task-row` (`:271`), `screen-header`
  (`:297`), `metric-tile` (`:321`), `status-chip`, `primary-button`. **The example composition must validate
  against `vocabulary.json`, not against these templates** — read the vocab (below) for the exact prop/enum shapes.
- `system/action-bus.mjs` (83 lines) — `createBus()→{emit,on}` (`:37`). Contract in the header: `ui.*`=UI→agent,
  `source∈{pointer,keyboard,agent,voice}`, `emit` validates + throws (`:52`). `on("*")` is the log tap. Node-safe.
- `system/spine.mjs` (180 lines) — `registerBeat(id, {effect, analytics, activateOn})` (`:35`). The peak seam is
  already documented at `:30` (*"#75 passes trackFactoryBuilt"*). `activate()` (`:83`) runs `effect` then
  `analytics`, **each fail-closed** (a thrown effect logs + leaves committed state). `heroBeat` (`:121`) is the
  reference effect (scoped re-skin, `assemblySettled`, `crossfade`, `finally` cleanup). `CANNED_AXES` (`:109`,
  `brandColor:"#2f7a4d"`) is the canned Verdant fallback brand. Registers on import (singleton registry).
- `system/analytics.mjs` (49 lines) — `trackFactoryDriven()` (`:41`): fire-once (`fired`, `:37`), `pushState`
  virtual route (`:45`) + delayed `replaceState` restore (`:48`). `VIRTUAL_EVENT_PATH` (`:26`). Injection is
  fail-closed on empty token (`:29`). **GOTCHA: `fired` is module-shared — add a SEPARATE `builtFired`.**
- `system/derive.mjs` (180 lines) — `derive(input)` (`:45`). Return (`:171`):
  `{ input, rulesetVersion, tokens, notes, checks, patterns, ethics }`. `tokens` = full `color-*`/`spacing-*`/
  `type-*` set. `checks` = the WCAG receipts. `ethics.quadrant` (`:138-140`) present **only** when
  `improvesLives` AND `wouldUseIt` are booleans — that's the guess-then-reveal input.
- `system/derive.rules.mjs` (223 lines) — `ethics.matrix[improvesLives][wouldUseIt]` (`:154`) →
  `facilitator|peddler|entertainer|dealer`. `ethics.verdicts` (`:149`). `wcagPairs` (`:181`, the 12 receipts).
- `system/wcag.mjs` (`checkPairs`, `:26`) — each check = `{ fg, bg, min, usage, fgValue, bgValue, ratio, pass }`.
  Render `usage` (label) · `ratio` · `pass` as the receipt rows.
- `system/pack-derived.mjs` (origin/main only — NOT on the current branch; read via `git show origin/main:system/pack-derived.mjs` or on the fresh branch) — `readRecord()` → `{ v, source:"derived", label, ts, brandColor, tokens }` or `null`. **`readRecord()?.brandColor`** = the visitor's entered hex; `?.tokens` = the derived `--color-*` map; `?.label` = the honest brand label. `RECORD_KEY="factory-pack-derived"`.
- `system/intake-beat.mjs` (33 lines) — `registerBeat("beat-intake", {effect: initIntake({verdant, askedAxes:["density","rewardType","frequency"]}), activateOn:"load"})`. `HOME_AXES`. Comment (`:4`): *"Brand is #74's beat; the Manipulation Matrix is #75's."* If decision #2 = live answers, this file caches + re-exports them.
- `system/factory-intake.mjs` — `initIntake(config)` (`:211`); `answers` is **internal** (`:226`), no accessor today; re-skin is **scoped to `previewRoot`** not `:root` (`:248-252`) — mirror this scoping for the peak stage. Ethics quadrant precedent (`:620`): `derive({...answers, improvesLives, wouldUseIt}).ethics.quadrant`. If decision #2 = live answers, add an **additive optional** `onAnswers` callback here.
- `index.html` — `#beat-peak` region `:165-219` (`.peak-stage :175`, `.peak-screen :176`, `.peak-screen-title "Verdant" :178`, `.peak-screen-tiles :181`, `.peak-side :192`, `.peak-tag "Fictional product" :193`, `.wcag-row :194-201`, `.peak-note :202`, `.peak-ethics <details> :206`). **Beat title `:172`: "A screen, composed from your brief and brand."** (copy-audit target — see Phase 0). Module script list `:307-313` (on origin/main `:322-329`, which also loads `pack-derived.mjs`). Region contract comment `:37-40`.
- `agentic-ui-study.html` (`:145-238`) — the wiring to mirror: `import { renderStudy }`, `import { createBus }`; `fetch("/handoff/verdant/vocabulary.json")` (`:217`) for vocab; `const bus = createBus(); renderStudy(el,{vocab,entries,bus})` (`:237-238`).
- `system/tokens.source.json` — `motion` group: **contract** `:65-79`, **neutral** `:141-155`. Naming precedent: `motion-tab-glide` (`:79`/`:155`, added by #78, *"paired with motion-ease-settle"*). Add `motion-skeleton-to-content` to **both**.
- `.github/workflows/verify.yml` — blocking: `drift-check` (`:37`) + `token-lint` (`:39`). `visual` job is **`continue-on-error` on `feature/v3-*`** (`:48`) — the VR freeze (D11).

### New Files to Create

- `system/peak.mjs` — the beat-3 module (hand-written canon). Reads brand + answers, runs `derive()`, builds
  the example composition, assembles it (build-then-swap + skeleton-to-content), draws WCAG receipts, runs the
  ethics guess-then-reveal, exposes the restrained adjust-live, registers on the spine, passes `trackFactoryBuilt`.
  Holds the inline **hand-authored example composition** const with the honesty comment (see Phase 0 / Task 3).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `docs/epics/portfolio-v3-experience.architecture.md` — §"Analytics" (`/factory/built`, one virtual route, fail-closed like `/factory/driven`); §Boundaries "Nothing fails on stage"; "Reduced motion / no-JS: first paint IS the final assembled state"; "VR mode (D11)".
- `docs/epics/generative-prototyper.prd.md` §8 + `.architecture.md` — the two honesty regimes; why the floor (committed composition) is legitimate and forward-compatible; the "no view-time LLM" hard constraint.
- `.claude/skills/portfolio-design/references/CRAFT.md` + `CHECKLIST.md` — read `CRAFT.md` before writing CSS; run `CHECKLIST.md` before committing (the §6.4 craft bar).
- CLAUDE.md — the **honesty contract** (hard): "Never hand-write anything presented as agent output." (Phase 0 gate turns on this.)

### Patterns to Follow

**View-time module header** (cite the governing doc; CLAUDE.md convention). Open `peak.mjs` like `spine.mjs`/
`pack-derived.mjs`: what it is · why · the honesty note · Node-import-safety line.

**Fail-closed effect** (from `spine.mjs:83-99` + `factory-intake.mjs:259` `fallback`): the effect runs inside the
spine's `try/catch`, but **also** guard internally so a partial build never wrecks the still —

```js
// Build-then-swap: never destroy the static still until the live tree is proven.
async function peakEffect({ el, reduce }) {
  const staticStill = el.querySelector(".peak-screen");       // the #71 still — keep until success
  let liveTree;
  try {
    liveTree = buildLiveScreen(vocab, EXAMPLE_COMPOSITION, bus, derived); // detached; validates first (throws → catch)
  } catch (err) {
    console.error("peak: live build refused — static still retained", err); // still intact, nothing swapped
    return;
  }
  swapIn(staticStill, liveTree, reduce);   // reduce ⇒ instant; else skeleton-to-content reveal
}
```

**Scoped re-skin** (from `factory-intake.mjs:248-252`, NOT `:root`): apply `derive().tokens` `color-*` as inline
custom properties on the **peak-stage element only**, so the peak wears the brand without fighting the dock's
committed-pack line-swap or the hero's `:root` revert. Clear on teardown.

**Bus-routed adjustment** (from `agentic-study.mjs:147-163`): every adjustment mutates a **deep-cloned working
copy** (never the committed const), emits a `ui.intent` on the bus (`source:"pointer"|"keyboard"`), then
re-validates + re-renders. The probe (`:135-145`) validates a hypothetical **without** mutating, and shows the
verbatim refusal.

**Naming**: files/modules kebab or existing convention (`peak.mjs`); tokens `motion-skeleton-to-content` (matches
`motion-tab-glide`, NOT bare `skeleton-to-content`); CSS classes extend the existing `.peak-*` family (`.peak-stage`,
`.peak-screen`, …) — token-only, **no literals** (a brand value in CSS is a bug; `portfolio.css` is the home surface).

**Error voice**: plain `Error` naming the offending thing (repo convention) — but the peak never throws to the
reader; it degrades to the still.

---

## IMPLEMENTATION PLAN

### Phase 0 — Pre-implementation gates (BLOCKING — resolve with the owner before any code)

**Independent of all later phases; both MUST be settled first.**

**Gate #1 — honesty of the example composition (load-bearing; can invalidate the approach).**
The beat title reads *"A screen, **composed** from your brief and brand"* and this ticket makes that "live." A
technical recruiter inspecting the repo (the site's explicit thesis: *"the repo itself is inspectable proof"*)
who finds a **hand-authored** JSON behind a *"composed by the agent"* frame is exactly the dishonesty the site
exists to disprove. Two-part gate:
- **(a)** Owner confirms a **committed, hand-authored Verdant example composition** (not in `proto/compositions/`,
  not paired with a trace, never labeled "real run"/"the agent proposed this") is acceptable for the public floor.
- **(b)** **Copy-audit task**: every string on the peak must be true of a committed example. The honest frame that
  works (recommended): *"A real screen, built from the same design system, wearing your brand — its accessibility
  measured live, and it enforces its own contract when you adjust it. On a private instance a build-time agent
  composes this per-employer; here it's a committed example."* Rewrite `.beat-title`/`.peak-note`/`.peak-tag` copy
  to match; keep the "Fictional product" tag. This forward-references #86 truthfully.

**Gate #2 — live answers vs. brand-only (AC faithfulness).**
The AC says "parameterized by **answers**/brand"; the beat says "from your **brief**." `density` visibly changes
the rendered screen (spacing/type scale); `frequency` drives the ethics verdict. Brand-only partially fails that.
- **Recommended:** add an **additive, optional** `onAnswers(answers)` callback to `initIntake` (fired in
  `run()`/`setAnswer`/`setScenario`); `intake-beat.mjs` caches the latest + exports `getHomeAnswers()`; `peak.mjs`
  reads it (fallback `DEFAULT_AXES`). This is "configure," not "fork" — `factory.html`/`instance.html` pass no
  callback and are byte-unaffected (regression-verify).
- **Alternative (owner-acknowledged AC reduction):** peak reads brand + owns the ethics pair; the 3 axes come from
  the Verdant defaults. Simpler, touches no shared file — but the peak won't reflect a changed density/frequency.

**Gate #3 — the ethics gate's interaction semantics (honesty-connected).**
"Guess-then-reveal" has two readings, and the choice changes both the beat and the copy:
- **(a) Guess a canonical verdict about Verdant (recommended).** There is one honest read of Verdant on the
  matrix — its `improvesLives`/`wouldUseIt` pair (a plant-care app that helps and whose maker would use it →
  `facilitator`). The reader **guesses**, then the reveal **confirms/corrects** with the reasoning ("you guessed
  peddler; the honest read is *facilitator* — it improves the user's life AND the maker would use it"). This
  matches the skeleton copy (*"Does this screen manipulate the user? Reveal the check"*, `index.html:207`) and the
  word "guess-then-reveal." **Needs the owner to assert Verdant's canonical pair** (a small honesty call for a
  fictional product; both `true` → `facilitator` is the obvious read).
- **(b) Reader classifies (weaker).** The reader picks the two booleans and the matrix names *their* quadrant —
  pure classification, nothing revealed *about the screen*. This makes the existing `.peak-ethics` copy misleading
  and must be rewritten, and there is no real "guess."

→ **RESOLVED with owner (2026-07-24) — all three gates closed:**
- **Gate #1 = YES** — hand-authored committed **Verdant** example composition, honestly framed as a committed
  example (not agent output); copy-audit (1b) required.
- **Gate #2 = live-answers seam (recommended)** — the peak reflects the visitor's density/frequency via the
  additive `onAnswers` callback; `factory.html`/`instance.html` regression-checked.
- **Gate #3 = (a)** — guess-then-reveal with Verdant's **canonical verdict = `facilitator`** (improvesLives=true,
  wouldUseIt=true). **PLUS a naming call:** the engine (`derive.rules.mjs`) **keeps Eyal's canonical quadrant
  names unchanged** (versioned truth, also shown on factory/instance); the **peak UI maps each to a plain label +
  gloss**, canonical term demoted to a small tag (the #57 humanize-the-label precedent). Scope: **peak only** for
  #75 — factory/instance keeping the raw term is acceptable (deep audience); a shared label map for them is an
  **optional follow-up**, not part of #75.

  **The peak quadrant label map** (`QUADRANT_LABELS` in `peak.mjs`; wording tweakable at implementation):
  | engine value | plain label | gloss |
  |---|---|---|
  | `facilitator` | **Genuinely useful** | helps people, and its maker would use it too *(Verdant's read)* |
  | `peddler` | **Preachy** | sold as "good for you," but the maker wouldn't use it |
  | `entertainer` | **Just entertainment** | enjoyable, but doesn't improve lives |
  | `dealer` | **Exploitative** | hooks people without helping them |

### Phase 1 — Foundation (branch, token, validated example composition)

**Depends on:** Phase 0.

**Tasks:** cut the branch from the correct base; add the motion token + run the regen chain green; author the
example composition against the vocabulary and prove it validates under Node **before** any UI wiring.

### Phase 2 — Core Implementation (`system/peak.mjs` + analytics)

**Depends on:** Phase 1 (needs the token consumed in CSS + a validated composition).

**Tasks:** the peak module — read inputs, derive, build-then-swap assembly, WCAG receipts, ethics guess-then-reveal,
restrained adjust-live (one positive + refusal); `trackFactoryBuilt()` with its own guard.

### Phase 3 — Integration (index.html, CSS, spine registration, optional intake seam)

**Depends on:** Phase 2.

**Tasks:** register the beat (`activateOn:'visible'`, `analytics:trackFactoryBuilt`); load `peak.mjs` in the script
list; rewrite the `#beat-peak` region (mount ids + Gate-#1(b) copy); `portfolio.css` organisms consuming the token;
(decision #2) the `onAnswers` seam + `getHomeAnswers()`.

### Phase 4 — Testing & Validation

**Depends on:** Phase 3.

**Tasks:** `node --check`; drift-check; token-lint; render under neutral + a brand; reduced-motion/no-JS; cross-engine
functional (Chromium/Firefox/WebKit); `instance.html`/`factory.html` regression; VR best-effort (frozen).

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute in order, top to bottom. Each task is atomic and independently testable.

### 0 · GATE — resolve Phase 0 with the owner

- **IMPLEMENT**: Get explicit answers to Gate #1(a)+(b) and Gate #2. Do not write code until both are recorded.
- **GOTCHA**: Gate #1 is not a formality — a "no" means rethinking whether the peak renders a composition at all.
- **VALIDATE**: both decisions written into this plan's AMENDMENTS with the date.
- **SATISFIES**: honesty contract (hard); AC "no generation, no view-time LLM" framing.

### 1 · SETUP — branch from origin/main

- **IMPLEMENT**: `git fetch origin` then `git checkout -b feature/v3-peak origin/main`. Confirm the base carries
  #73 + #74: `test -f system/pack-derived.mjs` and `grep -q "beat-intake" system/intake-beat.mjs`.
- **GOTCHA**: The **current** branch (`feature/v3-evidence-home`) LACKS `pack-derived.mjs` (#74); **local `main` is
  stale**. Only `origin/main` has #71–#74 (+#78). Cutting from the wrong base = no `readRecord()`, broken peak.
  Also: cut from a clean tree — do **not** drag the current branch's uncommitted `approach.html`/`components.css`/
  `work.html` edits (memory: shared-worktree hazard — stage by explicit path).
- **VALIDATE**: `git log --oneline -3` shows the #74 merge in history; `node -e "import('./system/pack-derived.mjs').then(m=>console.log(typeof m.readRecord))"` prints `function`.
- **SATISFIES**: dependency correctness (#75 depends on #73 + #74).

### 2 · UPDATE `system/tokens.source.json` — add `motion-skeleton-to-content` (both groups) + regen

- **IMPLEMENT**: Add `"motion-skeleton-to-content"` to the `motion` group in **both** the contract block
  (`:65-79`) and the neutral block (`:141-155`), `"$type":"duration"`, value in the entrance family (e.g. the
  same order as `motion-slow` 480ms — a settle-paced reveal; pair conceptually with `motion-ease-settle` like
  `motion-tab-glide` does), `$description` naming the peak assembly. Then run the **full regen chain**.
- **PATTERN**: `motion-tab-glide` (`:79`) — the most recent motion-token precedent (#78).
- **IMPORTS**: n/a (data).
- **GOTCHA**: A token in `tokens.source.json` but **not consumed** in CSS fails `token-lint` (orphan). It is
  consumed in Task 9 (CSS) — if you validate token-lint before Task 9, expect the orphan failure until then.
  A `tokens.source.json` change needs `gen-handoff` + `gen-pack-bundle` too, not just `gen-token-css`, or
  `drift-check` goes **red** (blocking) — memory `token-change-regen-handoff-pack`.
- **VALIDATE**: `node agent-layer/gen-token-css.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs` each print `✓`; then `node tooling/drift-check.mjs` clean. (`token-lint` deferred to Task 12.)
- **SATISFIES**: AC "`skeleton-to-content` added and consumed + regen chain run."

### 3 · CREATE the example composition (inline in `system/peak.mjs`) + prove it validates under Node

- **IMPLEMENT**: Author a small Verdant `{name,props,children}[]` (a `screen-header` + 2 `stat-tile` + 1–2
  `plant-card`/`care-task-row`) echoing the still (`3 plants need water`, `12 healthy today`). Put it as an
  **inline `const EXAMPLE_COMPOSITION`** with the honesty comment: `// Hand-authored EXAMPLE — NOT an agent run
  (those live in proto/compositions/ with paired traces). Demonstrates the renderer + vocabulary contract;
  epic #86 replaces this with a real per-employer agent-composed view.`
- **PATTERN**: composition shape = the entries in `proto/compositions/*.json`; the render call = `agentic-ui-study.html:227`.
- **IMPORTS**: none yet (data + a throwaway Node check).
- **GOTCHA**: `validateComposition` checks against **`vocabulary.json`**, not the renderer's `TEMPLATES`. Read
  `handoff/verdant/vocabulary.json` for the **exact** props/enums/required/children each component declares, and
  match them precisely — a single out-of-vocab prop or missing required prop makes the render path **refuse** and
  the peak silently falls to the still (**wow gone**). `plant-card.photoUrl` must be a **same-origin** path or
  omitted (`agentic-renderer.mjs:192` `safePhotoUrl`) — omit it (monogram fallback) to stay safe.
- **VALIDATE**: a Node one-liner before any UI wiring:
  `node -e "const v=require('fs');import('./system/agentic-renderer.mjs').then(async m=>{const vocab=JSON.parse(v.readFileSync('handoff/verdant/vocabulary.json'));const comp=/* paste EXAMPLE_COMPOSITION */;m.validateComposition(vocab,comp);console.log('composition valid')})"` prints `composition valid` (or throws naming the exact offending path — fix the props until clean).
- **SATISFIES**: AC "re-renders a committed composition"; protects one-pass (advisor #3).

### 4 · CREATE `system/peak.mjs` — inputs + `derive()` (no DOM yet)

- **IMPLEMENT**: Module header (governing-doc + honesty note + Node-safety line). Import `derive` from `./derive.mjs`,
  `readRecord` from `./pack-derived.mjs`, `getHomeAnswers` from `./intake-beat.mjs` (decision #2; else use
  `DEFAULT_AXES`). Compute the derive input: `brandColor = readRecord()?.brandColor ?? "#2f7a4d"` (canned Verdant
  fallback, `spine.mjs:109`); axes = `getHomeAnswers() ?? {density:"comfortable",rewardType:"self",frequency:"daily"}`.
  Expose a pure `computeDerived(ethicsPair)` → `derive({ brandColor, ...axes, ...ethicsPair })`.
- **IMPORTS**: `import { derive } from "./derive.mjs"; import { readRecord } from "./pack-derived.mjs";` (+ `getHomeAnswers`).
- **GOTCHA**: `derive()` **throws** on a bad hex — wrap in try/catch and fall back to the still (never surface).
  `ethics.quadrant` only exists when BOTH `improvesLives` and `wouldUseIt` are booleans — pass them only at reveal.
- **VALIDATE**: `node --check system/peak.mjs`; a temporary `node -e` importing `computeDerived({improvesLives:true,wouldUseIt:true})` logs `.ethics.quadrant === "facilitator"` and `.checks.length === 12`.
- **SATISFIES**: AC "WCAG receipts from real derive() pairs"; "ethics gate reveals the Manipulation-Matrix verdict."

### 5 · ADD to `system/peak.mjs` — build-then-swap assembly (skeleton-to-content)

- **IMPLEMENT**: `buildLiveScreen(vocab, comp, bus, derived)` builds a **detached** `.peak-screen` via
  `renderComposition(vocab, comp, bus)` (validates first), applies `derived.tokens` `color-*` as inline props on
  the detached stage scope. `swapIn(still, live, reduce)`: if `reduce` → replace instantly; else add a
  `discrete-render` gate class and run the `motion-skeleton-to-content` reveal, then replace. **Never remove the
  still until `live` is built.**
- **PATTERN**: `spine.mjs:121` `heroBeat` (scoped apply + `finally` cleanup); `agentic-study.mjs:118-130` `renderPreview` (build → append → on throw keep last-good).
- **IMPORTS**: `import { renderComposition } from "./agentic-renderer.mjs";`
- **GOTCHA**: Load `vocab` by `fetch("/handoff/verdant/vocabulary.json")` (mirror `agentic-ui-study.html:217`) —
  a fetch failure must degrade to the still, not throw. The re-skin is **scoped to the peak stage**, NOT `:root`
  (don't fight the dock/hero). Entrance animation gated behind `discrete-render` (a class), **not** just
  `prefers-reduced-motion` — memory `entrance-anim-on-continuous-rebuild` + `vr-gate-captures-no-preference`.
- **VALIDATE**: render `index.html` under `npx serve .`; scroll to the peak → the Verdant screen assembles; throttle/break the vocab fetch → the static still remains, no blank mount, one console error.
- **SATISFIES**: AC "built screen re-renders a committed composition parameterized by answers/brand"; "nothing fails on stage."

### 6 · ADD to `system/peak.mjs` — WCAG receipts draw-in

- **IMPLEMENT**: Render the real receipts into `.peak-side` from `derived.checks`: one row per check (or a curated
  subset for the singular peak), each showing `usage` + `ratio:1` + a pass state driven by `check.pass`. Replace
  the two faux `.wcag-row`s. Draw them in on assembly (staggered, `discrete-render`-gated).
- **PATTERN**: `wcag.mjs:26` check shape; `factory-intake.mjs` renderNarrative WCAG table (the same `checks` consumer).
- **GOTCHA**: `check.pass` is a real boolean — if the derived brand ever fails a pair, show it **failing honestly**
  (the engine shows the gate working, not hiding rejects — `derive.rules.mjs` ethos). Don't hard-code "Pass AA."
- **VALIDATE**: with a brand entered (#beat-brand), the receipts show real ratios matching `derive(brand).checks`; with a deliberately low-contrast brand a pair reads fail, not pass.
- **SATISFIES**: AC "WCAG receipts draw in from real derive() contrast pairs."

### 7 · ADD to `system/peak.mjs` — the Manipulation-Matrix ethics gate (guess-then-reveal)

- **IMPLEMENT**: Replace the static `<details>` with the interactive gate (Gate #3a). The reader **guesses**
  Verdant's quadrant (four choices, shown as the PLAIN labels), then Reveal computes the **canonical** verdict —
  `computeDerived({improvesLives:true, wouldUseIt:true}).ethics.quadrant` → `"facilitator"` — and **confirms or
  corrects** the guess with the reasoning line. Map the engine value to the reader-facing text via a
  `QUADRANT_LABELS` const in `peak.mjs`: `{ facilitator:{label:"Genuinely useful", gloss:"…"}, peddler:{…},
  entertainer:{…}, dealer:{…} }` (Gate #3 table). The engine value stays a small tag ("Eyal calls this the
  *facilitator* quadrant"); the plain label leads.
- **PATTERN**: `factory-intake.mjs:620` (`derive({...answers, improvesLives, wouldUseIt}).ethics.quadrant`) — the
  exact same computation; `derive.rules.mjs:154` matrix. Humanize-at-presentation precedent: #57 L2 (raw keys →
  reader labels in the round-trip exhibit).
- **IMPORTS**: none new (reuses `computeDerived` from Task 4).
- **GOTCHA**: **Do NOT rename the engine values in `derive.rules.mjs`** — that's a versioned artifact also shown on
  factory/instance (owner decision: engine keeps canonical, UI humanizes; peak-only for #75). The mapping is
  presentation-only in `peak.mjs`. The reader's guess is never prefilled from the scenario (`factory-intake.mjs:228`);
  keep the gate a `<details>`/disclosure so no-JS shows the honest static shape.
- **VALIDATE**: guessing then revealing shows **"Genuinely useful"** for Verdant (engine `facilitator`), with the
  canonical tag present; a Node check confirms `computeDerived({improvesLives:true,wouldUseIt:true}).ethics.quadrant === "facilitator"` and each `QUADRANT_LABELS` key maps to a plain label.
- **SATISFIES**: AC "the ethics gate reveals the Manipulation-Matrix verdict as guess-then-reveal"; Gate #3 naming.

### 8 · ADD to `system/peak.mjs` — the restrained adjust-live (one positive + the refusal)

- **IMPLEMENT**: A minimal adjust surface on the assembled screen: **one clean positive adjustment** (e.g. toggle
  a stat-tile's emphasis / a care-task-row's state — a valid in-vocabulary change that re-validates + re-renders +
  emits a `ui.intent`), AND the **out-of-vocabulary refusal probe** (`agentic-study.mjs:135-145`): attempt an
  invalid change, `validateComposition` throws, show the verbatim path-naming message. The **contrast** (obeys the
  valid, refuses the invalid) is the thesis and the wow. Adjust a **deep-cloned working copy**, never the const.
  Optional: a small "messages on the bus" disclosure (the log tap, `on("*")`) for the deep-diver.
- **PATTERN**: `agentic-study.mjs` — `clone` (`:23`), `setTone`/probe (`:147`,`:135`), `setRefusal` (`:110`), the
  `el()` builder (`:25`, never `innerHTML` from data). **Restrained** — NOT the full control grid.
- **IMPORTS**: `import { createBus } from "./action-bus.mjs";` (+ `validateComposition` from the renderer for the probe).
- **GOTCHA**: Keep it ONE positive affordance so the peak stays visually singular (v3 PRD: novelty budget on the
  hero moments only). "Refusal-only" collapses the thesis into "a thing that says no" — you need the positive too
  (advisor #5). Agent-supplied strings render via `textContent` only (injection-safe).
- **VALIDATE**: the valid adjustment re-renders the screen + logs a `ui.intent`; the probe shows a refusal naming the exact path (e.g. `...props.tone: "urgent" is not in enum [...]`), without mutating the screen.
- **SATISFIES**: the Option-B upgrade (reader steer/adjust); v3 PRD §2 "tied to a real capability."

### 9 · UPDATE `system/analytics.mjs` — `trackFactoryBuilt()` with its own guard

- **IMPLEMENT**: Add `export function trackFactoryBuilt()` mirroring `trackFactoryDriven` (`:41`) but with a
  **separate** `let builtFired = false;` guard and `const BUILT_EVENT_PATH = "/factory/built";`.
- **PATTERN**: `analytics.mjs:41-49`.
- **GOTCHA**: **Do NOT reuse the module-level `fired`** (`:37`) — that's `trackFactoryDriven`'s; sharing it means
  whichever fires first suppresses the other. Two independent fire-once flags.
- **VALIDATE**: `node -e "import('./system/analytics.mjs').then(m=>console.log(typeof m.trackFactoryBuilt))"` → `function`; in-browser, reaching the peak flips the URL to `/factory/built` once then restores; a second scroll-in does not re-fire.
- **SATISFIES**: AC "/factory/built fires once on the beat (fail-closed like /factory/driven)"; closes the PRD open question (analytics for spine completion).

### 10 · ADD to `system/peak.mjs` — register the beat + orchestrate

- **IMPLEMENT**: At module bottom (behind the spine's DOM-safe seam): `registerBeat("beat-peak", { effect:
  peakEffect, analytics: trackFactoryBuilt, activateOn: "visible" });`. `peakEffect({el, reduce})` orchestrates
  Tasks 5–8 (assemble → receipts → ethics → adjust), all inside try/catch → still.
- **PATTERN**: `intake-beat.mjs` (a beat module importing `registerBeat`); `spine.mjs:180` (the hero's own registration).
- **IMPORTS**: `import { registerBeat } from "./spine.mjs";` `import { trackFactoryBuilt } from "./analytics.mjs";`
- **GOTCHA**: **`activateOn:'visible'` is required** — the PRD success metric is "visitors who **reach** the built
  screen." `'load'` would fire `/factory/built` for everyone (metric meaningless). The spine's `activate()` already
  fires `analytics` once **after** `effect` and guards both (`spine.mjs:94`) — plus `trackFactoryBuilt`'s own guard.
  Node-import-safe: `registerBeat` no-ops with no DOM (`spine.mjs:39`).
- **VALIDATE**: `node --check system/peak.mjs`; `node -e "import('./system/peak.mjs')"` imports clean (no DOM → seam inert).
- **SATISFIES**: AC "registers as a beat on spine.mjs's seam … assembles when the orchestrator activates the beat."

### 11 · UPDATE `index.html` — script tag, mount ids, honest copy

- **IMPLEMENT**: Add `<script type="module" src="/system/peak.mjs"></script>` after `intake-beat.mjs`/
  `pack-derived.mjs` in the script list. In `#beat-peak`: add the mount ids/hooks `peak.mjs` queries (the
  `.peak-stage`/`.peak-screen`/`.peak-side`/ethics nodes); apply **Gate #1(b) copy** to `.beat-title`,
  `.peak-note`, `.peak-tag`. Keep the static still as the **no-JS/at-rest final state** (progressive enhancement).
- **PATTERN**: `index.html:307-313` (origin/main `:322-329`) script list; existing `#beat-peak` markup `:165-219`.
- **GOTCHA**: Load order — `peak.mjs` imports `spine.mjs` (shared singleton) and `intake-beat.mjs`
  (`getHomeAnswers`); ES module imports resolve regardless of tag order, but keep it after those for readability.
  The still must remain valid + honest with JS off (memory: reduced-motion/no-JS first paint = final state).
- **VALIDATE**: `npx serve .` → with JS on, the peak assembles + is adjustable; with JS disabled, the honest still shows with corrected copy.
- **SATISFIES**: AC "registers as a beat"; honesty (Gate #1).

### 12 · UPDATE `system/portfolio.css` — peak organisms (consume the motion token)

- **IMPLEMENT**: Extend the `.peak-*` family for: the assembling composition (skeleton → content using
  `var(--motion-skeleton-to-content)` + `var(--motion-ease-settle)`), the receipt rows draw-in, the adjust
  controls, the refusal panel, the ethics reveal. **Token-only**, gate entrance behind `.discrete-render`.
- **PATTERN**: existing `.peak-stage`/`.peak-screen`/`.wcag-row` styles (#71) in `portfolio.css`; the motion idioms
  in `system/motion.mjs`/existing entrance CSS. Read `portfolio-design` `references/CRAFT.md` first.
- **GOTCHA**: A literal or brand value in CSS is a bug (token discipline). The `motion-skeleton-to-content` token
  MUST be referenced here or `token-lint` fails (orphan) — this task is what "consumes" it.
- **VALIDATE**: `node tooling/token-lint.mjs` clean (token now declared **and** consumed); `node tooling/drift-check.mjs` clean; eyeball the assembly at 60fps.
- **SATISFIES**: AC "`skeleton-to-content` added **and consumed** (no unused-token lint fail)"; §6.4 craft bar.

### 13 · (Decision #2 = recommended) ADD the `onAnswers` seam — `factory-intake.mjs` + `intake-beat.mjs`

- **IMPLEMENT**: `initIntake` gains an **optional** `onAnswers` config param; call `onAnswers?.({...answers})` in
  `run()`/`setAnswer`/`setScenario`. `intake-beat.mjs` passes `onAnswers: a => { latest = a; }` and adds
  `export function getHomeAnswers(){ return latest; }`.
- **PATTERN**: `factory-intake.mjs:211` config destructure; `:272`/`:279` change sites; `intake-beat.mjs:24` the call.
- **GOTCHA**: **Additive only** — `factory.html`/`instance.html` pass no `onAnswers`, so behaviour is byte-identical
  (the shared wizard is "configured, never forked"). If Gate #2 = alternative, SKIP this task and use `DEFAULT_AXES`.
- **VALIDATE**: home peak reflects a changed density (spacing/type scale visibly shifts); `factory.html` + `instance.html` still initialise the wizard (open both; no console error) — the seam-unforked regression check.
- **SATISFIES**: AC "parameterized by answers/brand" (full, not brand-only).

### 14 · VALIDATE — full pass (see VALIDATION COMMANDS)

- **IMPLEMENT**: Run every level. Fix until green.
- **VALIDATE**: all commands below pass; cross-engine functional check done; VR posture documented.
- **SATISFIES**: COMPLETION CHECKLIST.

---

## TESTING STRATEGY

This repo has **no unit/integration test suite** (CLAUDE.md: "Testing: no suite, no linter, no type-check — don't
hunt for or invent one. 'Done' = run the surface you touched."). "Tests" here = **run the surfaces + the drift/lint
gates + a cross-engine functional check.**

### Unit-equivalent (Node checks)
- `node --check system/peak.mjs` (+ `analytics.mjs`) parses.
- `validateComposition(vocab, EXAMPLE_COMPOSITION)` passes under Node (Task 3) — the composition is authored correctly.
- `computeDerived({improvesLives,wouldUseIt})` returns `.ethics.quadrant` + 12 `.checks` (Task 4).
- `trackFactoryBuilt` exported; imports of `peak.mjs`/`analytics.mjs` are Node-clean (no DOM access at import).

### Integration-equivalent (the running surface)
- `npx serve .` → home renders under neutral; scroll to `#beat-peak`: assembles, receipts draw, ethics reveals,
  adjust works, refusal fires. `/factory/built` flips once.
- Enter a brand at `#beat-brand` → the peak wears it; the receipts show that brand's real ratios.
- `factory.html` + `instance.html` still initialise the shared wizard (decision #2 regression).

### Edge Cases (must test)
- **Brand not entered** → canned Verdant `#2f7a4d`, peak still assembles.
- **`derive()`/vocab fetch fails** → static still retained, one console error, nothing blank (fail-closed).
- **Reduced motion** (`prefers-reduced-motion: reduce`) → the assembled state renders **instantly**, no skeleton anim; rest == final.
- **No-JS** → the honest static still with Gate-#1(b) copy.
- **Low-contrast brand** → a WCAG receipt reads **fail** honestly (not a hard-coded pass).
- **Probe** → refusal names the exact path; the working screen is unchanged.
- **Beat re-enters view** → `/factory/built` does not re-fire; assembly does not double-run (spine once-guard + own guard).

## VALIDATION COMMANDS

Execute every command; zero regressions.

### Level 1: Syntax & parse
```
node --check system/peak.mjs
node -e "import('./system/peak.mjs')"            # Node-safe import (seam inert, no DOM)
node -e "import('./system/analytics.mjs').then(m=>console.log(typeof m.trackFactoryBuilt))"   # → function
```

### Level 2: Generators + gates (BLOCKING on CI)
```
node agent-layer/gen-token-css.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs
node tooling/drift-check.mjs        # clean — the token chain fully regenerated
node tooling/token-lint.mjs         # clean — motion-skeleton-to-content declared AND consumed
```

### Level 3: Composition validity (protects the wow)
```
# EXAMPLE_COMPOSITION validates against the vocabulary (Task 3 one-liner) → "composition valid"
```

### Level 4: Manual / running surface
```
npx serve .        # → http://localhost:3000 (or as printed)
# Home under neutral: scroll to #beat-peak → assembles; receipts draw; ethics guess-then-reveal;
# adjust one tile (re-renders); probe (refuses, names path); /factory/built flips URL once then restores.
# Enter a brand at #beat-brand → peak wears it, receipts show real ratios.
# Toggle prefers-reduced-motion → instant final state. Disable JS → honest still.
# Open factory.html + instance.html → wizard still initialises (decision #2 regression).
```

### Level 5: Cross-engine functional (the VR gate is single-engine; memory `cross-engine-motion-verify`)
```
# Drive the peak assembly + adjust under Chromium + Firefox + WebKit via local Playwright
# (webkit == Safari; serve .mjs as text/javascript). No dropped frames, no cross-engine layout break.
# Perf: Chromium CDP CPU throttle on the assembly (§6.4 craft bar: solid 60fps or simplify).
```

### VR posture (documented, not blocking here)
```
# The visual job is continue-on-error on feature/v3-* (verify.yml:48) — the D11 freeze. index.html at-rest
# changes ⇒ the index baseline drifts, but the check won't block. Design rest==final; regen best-effort:
cd tooling/visual-regression && npm run update:docker   # (frozen; full regen + re-block is #82's job)
```

## ACCEPTANCE CRITERIA (from issue #75)

- [ ] The built screen re-renders a **committed** Verdant example composition parameterized by answers/brand; **no generation, no view-time LLM.**
- [ ] WCAG receipts draw in from real `derive()` contrast pairs.
- [ ] The ethics gate reveals the Manipulation-Matrix verdict as **guess-then-reveal**.
- [ ] The reader can **adjust the assembled screen live** and watch the renderer **refuse** out-of-vocabulary changes (Option-B upgrade), tied to the real vocabulary-validation capability (not a toy).
- [ ] `/factory/built` fires **once** on the beat (fail-closed like `/factory/driven`, own guard).
- [ ] Everything wraps `try/catch` → committed static-still fallback; **nothing fails on stage.**
- [ ] The peak **registers as a beat on `spine.mjs`'s seam** (`activateOn:'visible'`) — assembles on activation, not a private trigger.
- [ ] `motion-skeleton-to-content` added (both groups) **and consumed** (no orphan-token lint fail) + full regen chain run (`drift-check` clean).
- [ ] Honesty: no string implies live/agent composition; the example is honestly labeled; "Fictional product" intact (Gate #1).
- [ ] Reduced-motion / no-JS first paint IS the final assembled state.
- [ ] `factory.html` + `instance.html` still initialise the shared wizard (decision #2, if the seam is added).
- [ ] Closes the PRD open question: analytics events for spine completion.

## COMPLETION CHECKLIST

- [ ] Phase 0 gates recorded in AMENDMENTS before code.
- [ ] All tasks completed in order; each task's VALIDATE passed immediately.
- [ ] Level 1–5 validation commands pass; `drift-check` + `token-lint` clean (the blocking gates).
- [ ] Composition validated against `vocabulary.json` under Node before UI wiring.
- [ ] Cross-engine functional check done (Chromium/Firefox/WebKit); assembly holds 60fps under throttle.
- [ ] Manual: peak assembles, receipts real, ethics reveals, adjust + refusal work, `/factory/built` once.
- [ ] Fail-closed verified (broken vocab/derive → still retained).
- [ ] Honesty copy-audit done (Gate #1(b)).
- [ ] `factory.html`/`instance.html` regression clean (if decision #2 seam added).
- [ ] `portfolio-design` `CHECKLIST.md` run (§6.4 craft bar).
- [ ] Commit (`feat: v3 built-screen peak … (#75)`) → PR → review; note the VR-freeze posture in the PR body.

## OPEN QUESTIONS / ASSUMPTIONS

**Phase 0 gates — ALL RESOLVED with owner 2026-07-24 (see AMENDMENTS):**
1. **Gate #1 = YES** — committed hand-authored Verdant example, honestly framed; copy-audit (1b) still a build task.
2. **Gate #2 = live-answers seam** (recommended) — additive `onAnswers` on the shared wizard; regression-check factory/instance.
3. **Gate #3 = (a)** — guess-then-reveal, Verdant canonical = `facilitator`; **engine keeps Eyal names, peak UI maps to plain labels** (`QUADRANT_LABELS`), peak-only.

**Non-blocking (settle at implementation):**
- Exact wording of the four plain quadrant labels (proposed in the Gate #3 table — tweak during Task 7/12).
- Whether factory/instance later adopt the shared plain-label map (optional follow-up, not #75).

**Non-blocking assumptions:**
- The peak subject is **Verdant** (skeleton + intake + `CANNED_AXES` agree; the issue's Fieldwork-composition reference is superseded). If the owner actually wants the Fieldwork compositions shown, that's a different, subject-incoherent design — flag before proceeding.
- `motion-skeleton-to-content` is a **duration** paced with the entrance family (`~motion-slow`), paired with `motion-ease-settle`. Tune the value during Task 12 against the assembly feel.
- The example composition lives **inline in `peak.mjs`** (honesty comment travels with the data) rather than a separate JSON — most inspectable. If the owner prefers a committed file, put it at `system/peak.view.json` (NOT `proto/compositions/`).
- `handoff/verdant/vocabulary.json` declares `screen-header`/`stat-tile`/`plant-card`/`care-task-row` with props matching the renderer templates. **Verify in Task 3** (if a needed prop/enum is absent, either simplify the composition or regen `node agent-layer/gen-vocabulary.mjs` — but do NOT add a new component; that's out of scope).

## NOTES (open canvas)

**Why this is the honest floor, not throwaway.** Epic #86's own architecture calls the pure-composition path
*"the honest floor every build can fall back to"* and frames fidelity as a ladder. This peak IS that floor made
public. When #86 lands, `peakEffect` keeps its render/adjust/receipt/analytics machinery unchanged; only the
**source** of `EXAMPLE_COMPOSITION` changes (committed → per-employer agent-composed on the private instance).
Authoring the example as a plain `{name,props,children}[]` the renderer already accepts makes that swap trivial.

**The Verdant/Fieldwork tangle, resolved.** The issue body says "re-render `proto/compositions/*`" (all Fieldwork).
But every other signal is Verdant: the still (`index.html:178`, "3 plants need water"), `intake-beat.mjs`
(Verdant-only), `spine.mjs` `CANNED_AXES` (the plant-care product). Showing a Fieldwork dispatch dashboard "under
the visitor's [Verdant] answers" is incoherent. A real Verdant `record-composition` run would be honest but is
**#88-gated** (parameterizing the Fieldwork-hardwired runner). So the floor = a **committed Verdant example**,
honestly framed (Gate #1). This is the only path that is Verdant-coherent, honesty-clean, and un-gated.

**Why the refusal is the anti-toy.** `agentic-study.mjs`'s header states the thesis: *"the design system from
Exhibit 1 is what makes agentic UI safe in Exhibit 2 … the refusal is a PRIMARY designed affordance, not an edge
case."* On the peak, one **valid** adjustment that obeys + one **invalid** attempt that's refused (naming the path)
demonstrates a real senior capability (a governed, contract-enforcing system) — the opposite of the v2 "colour
selectors, for what" toy. Keep BOTH halves; refusal-only is just "a thing that says no."

**VR is de-risked by the D11 freeze.** `verify.yml:48` makes the visual job non-blocking on `feature/v3-*`. So the
index-baseline drift from making the peak live won't block the PR. Still design rest==final and gate entrance anims
behind `.discrete-render` (not just reduced-motion) — memories `vr-gate-captures-no-preference` +
`entrance-anim-on-continuous-rebuild`. Full regen + VR re-block is #82's explicit job; hand the peak's at-rest
state to it clean.

**Risk register.** (1) Composition fails vocab validation → silent fallback → **wow gone**: mitigated by Task 3's
Node validation before wiring. (2) Reusing `analytics.fired` → one event suppresses the other: mitigated by the
separate `builtFired` guard. (3) Touching the shared wizard for live answers → instance/factory regression:
mitigated by the additive-only seam + the regression check (or skip via Gate #2 alternative). (4) The peak becomes
a busy control panel → loses "singular": mitigated by the one-affordance discipline. (5) Wrong branch base → no
`readRecord()`: mitigated by Task 1's base check.

## AMENDMENTS

- 2026-07-24 — Plan created. Scope = Option B (floor + disciplined adjust-live), owner-decided 2026-07-24 (memory `ticket-75-scope-decision`). Phase 0 gates (honesty framing + live-answers + ethics semantics) flagged as blocking, pending owner confirmation.
- 2026-07-24 — **All Phase 0 gates resolved with owner.** Gate #1 = YES (committed hand-authored Verdant example, honestly framed, copy-audit required). Gate #2 = live-answers seam (additive `onAnswers` on the shared wizard; regression-check factory/instance). Gate #3 = (a) guess-then-reveal, Verdant canonical verdict = `facilitator`; **naming**: engine (`derive.rules.mjs`) keeps Eyal's canonical quadrant names; the peak UI maps each to a plain label + gloss (`QUADRANT_LABELS`), canonical term demoted to a tag — **peak only** for #75, factory/instance unchanged (shared map = optional follow-up). Plan now execution-ready.
