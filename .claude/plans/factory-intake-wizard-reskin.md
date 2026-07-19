# Feature: Factory intake wizard → live re-skin (engine core, ticket 10.2)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **Second slice of GitHub issue #10** (Factory page). 10.1 (merged, this branch) stood up the
> five-station shell with the two *cheap* stations live (Prototypes, Handoff) and the three
> *expensive* stations as honest "In build" stubs. **This slice (10.2) makes Stations 1 + 2 genuinely
> run**: the guided intake wizard drives the real derivation engine and re-skins a sample preview live
> in the browser, with the staged "how it's generated" narrative + WCAG checks rendered from the same
> engine output. Deferred to later 10.x slices: the scenario toggle, the ethics guess-then-reveal
> (5.7), and the Station-5 trace-player mount.
>
> **Engine is proven — do not rebuild it.** `derive.html` already wires `derive()` end to end; this
> slice wraps that proven mechanism in the wizard UX + the staged narrative, scoped to a preview
> container. Read `derive.html` before writing a line.

## Feature Description

Replace Station 1's ("Intake") and Station 2's ("Design-system generation") static "In build" copy in
`factory.html` with a working, one-decision-at-a-time **guided wizard** that steers the real,
view-time **derivation engine** (`system/derive.mjs`). The reader answers 4 bounded questions — brand
colour · density · reward type · behaviour frequency — each carrying a **recommended default and its
reasoning**; their answers re-skin a **sample component preview live** (inline custom properties on the
preview container outrank the contract + pack layers — the same mechanism `derive.html` demonstrates),
and drive a **staged "how it's generated" narrative** (brand→accessible palette + **WCAG checks shown
passing** · density→scales · reward→patterns · frequency→ethics verdict) rendered from the engine's own
output. The moment is **view-time-safe** (approach B): the engine runs synchronously behind a
try/catch, falling back to the committed neutral pack on any throw — nothing can fail on stage while a
hiring manager watches.

## User Story

As a **hiring manager / technical reader** on `/factory#intake`,
I want to **answer a short guided questionnaire and watch my answers turn into an accessible design
system in front of me — palette, type, spacing, patterns, and a passing WCAG check**,
So that **I can verify the "one line re-skins the whole system" claim by driving it myself, and see
that the accessibility math is real, not decorative**.

## Problem Statement

After 10.1, Stations 1 and 2 are honest stubs: they *describe* the wizard and the live re-skin and link
the raw `/derive` harness, but nothing on the flagship page actually performs them. The engine exists
and runs (`system/derive.mjs`, proven at `/derive`), but the reader can only see it as an internal
harness — not as the designed, guided moment the PRD's MVP spine (§6.1) requires. The flagship page's
central claim ("the pipeline performed in front of you") is unmet at its two most load-bearing
stations.

## Solution Statement

Author one new view-time ES module — `system/factory-intake.mjs` (hand-written canon, beside
`system/site.js`) — that self-initializes on the Factory page, renders a stepped 4-question wizard into
Station 1, and on every answer change runs `derive()` and (a) applies `result.tokens` as inline custom
properties **scoped to a Station-2 preview container** (not `<html>`), re-skinning a sample surface of
**real components**, and (b) renders the staged narrative + WCAG table from `result.checks` /
`result.notes` / `result.patterns` / `result.ethics`. The wizard config (question prompt + reasoning
per axis) is **inlined as a constant** in the module for this Verdant-only slice — synchronous, no
fetch, so the on-load render settles before any screenshot and there is no config-load failure state to
design. Option enums come from the frozen `RULESET` (single source of truth); option labels live in the
module. The engine call is wrapped in try/catch → on throw, the preview's inline props are cleared
(reverting to the neutral pack) and an honest note shows — the "can't fail on stage" guarantee. The
first user-initiated change fires `trackFactoryDriven()` once. Stations 1 + 2 flip their capability
badge to `.capability live` "Runs now". The visual-regression gate gets a deterministic readiness gate
(`[data-reskin]`) and the two factory baselines are regenerated.

## Out of Scope / Non-Goals

This slice is **the wizard + the live re-skin + the staged narrative for Verdant only**. Everything
below is a *later* 10.x slice — do not build it here, and do not let station copy imply it:

- **Not included: the scenario toggle** (Verdant ⇄ Fieldwork swapping all five stations). This slice
  renders **Verdant only**. The toggle slice introduces per-scenario config loading (and, at that
  point, the config-fetch path + its failure state).
- **Not included: the ethics guess-then-reveal / Manipulation Matrix (5.7).** The wizard does **not**
  ask `improvesLives` / `wouldUseIt`. The staged narrative shows the frequency→verdict beat
  (`result.ethics.verdict`, which derives from frequency alone) — but **not** the interactive
  "place-it-on-the-matrix-first" reveal, and not the matrix quadrant.
- **Not included: the Station-5 trace-player mount** nor recording a real generation-pipeline trace —
  Station 5 stays "In build", still linking `/trace`.
- **Not changing:** `system/derive.mjs`, `system/derive.rules.mjs`, `system/oklch.mjs`,
  `system/wcag.mjs` (the engine is frozen canon — consume it, don't touch it), `system/components.css`,
  `system/portfolio.css`, `system/tokens.source.json` (**no new token**), any `agent-layer/` generator
  (**no regeneration**), the nav config, the two proto pages / their iframes (Station 3 unchanged), the
  Station-4 handoff links, `index.html`'s "In build" home card (epic Step 3 relights entry points).
- **Not doing the voice-contract copy pass (7.5).** Copy must be honest-to-state and follow the *teach*
  discipline (no pedagogy callouts), but final polished voice is deferred. Do not gold-plate prose.
- **Not adding a build step, framework, bundler, or any view-time LLM call** (hard constraint).

## Feature Metadata

**Feature Type**: New Capability (first genuinely-interactive Factory stations)
**Estimated Complexity**: Medium (one ~300-line view-time module + `factory.html` Station 1/2 rewrite +
page-scoped wizard/preview CSS + a CI-gate readiness gate + baseline regen). Ticket estimate 350–500
lines; realistic total ~500–650 with the staged-narrative rendering — acceptable for "engine core".
**Primary Systems Affected**: `system/factory-intake.mjs` (new) · `factory.html` (Stations 1/2) ·
`tooling/visual-regression/visual.spec.mjs` (readiness gate) + two regenerated baselines.
**Dependencies**: none new. Consumes already-shipped canon: `system/derive.mjs` + `derive.rules.mjs`
(#3), `system/analytics.mjs` `trackFactoryDriven` (#6). All on this branch.

## Related Work

**Implements**: ticket **10.2** — second slice of GitHub issue **#10** (Factory page) · **Epic**: #1
(`docs/epics/ai-first-ux-factory.architecture.md` §Recommended approach = approach B; §IA Factory =
flagship). Record the finalized intake cut in **issue #10** on completion (Task 1).

**Back-references** (plans this builds on / inherits decisions from):

- `.claude/plans/factory-shell-cheap-stations.md` — Why: 10.1 built the five-station shell, the
  page-scoped `<style>` precedent, the `.capability`/`.capability.live` badge idiom, and the
  `scroll-margin-top:90px` deep-link idiom this slice extends. **The iframe mask + fixed heights it
  added stay untouched.**
- `.claude/plans/live-derivation-engine.md` — Why: built `system/derive.mjs` + `derive.rules.mjs` +
  `derive.html`, the engine + raw harness this slice wraps. The re-skin mechanism (inline custom props
  outrank the pack) is proven there.
- `.claude/plans/site-shell-ia-analytics.md` — Why: built `system/analytics.mjs` +
  `trackFactoryDriven()` (the fire-once virtual-route event) this slice activates.

**Forward-references** (append as follow-ups get created):

- 10.3 — scenario toggle (Verdant ⇄ Fieldwork) + per-scenario config loading (introduces the fetch path
  + its degraded state) + the ethics guess-then-reveal (5.7).
- 10.4 (or later) — Station-5 trace-player mount + a recorded real generation trace.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `derive.html` (whole file, 225 lines) — Why: **the working reference to lift.** Its inline
  `<script type="module">` (lines 160–223) is the exact mechanism this slice wraps: `derive({brandColor,
  density, rewardType, frequency})` → apply `result.tokens` as inline custom properties (line 185:
  `document.documentElement.style.setProperty("--" + k, v)`) → render `result.checks` (WCAG table,
  189–197), `result.notes` (negotiation, 199–201), `result.ethics.verdict` (203), `result.patterns`
  (204–207). **Two deltas for this slice:** (1) apply to a **preview container**, not
  `document.documentElement`; (2) source enums from `RULESET`, not hardcoded `<option>`s. Also copy its
  `esc()` HTML-escape helper (line 165) verbatim — untrusted-value discipline.
- `system/derive.mjs` (lines 22–45, 144–180) — Why: the `derive(rawInput, ruleset=RULESET)` signature +
  return shape `{ input, rulesetVersion, tokens, notes, checks, patterns, ethics }`. `validate()`
  (22–41) **throws** a plain Error naming a bad input — this is why the call needs a try/catch. Note
  the four required inputs and that `improvesLives`/`wouldUseIt` are **optional** (omit them — ethics
  matrix is out of scope; `result.ethics.verdict` still derives from `frequency` alone, line 137).
- `system/derive.rules.mjs` (lines 89–93 `scales`, 116–137 `patterns`, 147–158 `ethics`) — Why: the
  **exact enum values** the wizard must offer, sourced live from `RULESET` so the wizard can never drift
  from the engine: `Object.keys(RULESET.scales)` → `["compact","comfortable","spacious"]`;
  `Object.keys(RULESET.patterns)` → `["tribe","hunt","self"]`;
  `Object.keys(RULESET.ethics.frequencyFilter)` →
  `["multiple-daily","daily","weekly","monthly","rarely"]`. `RULESET` is deep-frozen — read only.
- `factory.html` (whole file, 216 lines) — Why: the page to edit. **Keep** `<head>` (title, `noindex`,
  the four stylesheet links, the existing page-scoped `<style>` for `.factory-embed*`) and the four
  bottom `<script>`s. **Rewrite** Station 1 (`#intake`, lines 81–92) and Station 2 (`#generation`,
  94–123) bodies; **flip** both capability badges to `.capability live`. Stations 3/4/5 unchanged. Add
  the wizard/preview page-scoped CSS to the existing `<style>` block; add
  `<script type="module" src="/system/factory-intake.mjs">` after `analytics.mjs`.
- `scenarios/verdant/intake.defaults.json` (whole file, 84 lines) — Why: the **source of the wizard's
  editorial copy + defaults**. The `axes` block (76–83) gives the four derive defaults
  (`brandColor:"#2F7A4D"`, `density:"comfortable"`, `rewardType:"self"`, `frequency:"daily"`). Per-axis
  reasoning is drawn from the `questions` entries (e.g. `target-behavior.reasoning` line 35 for
  frequency). **The module inlines a distilled Verdant `WIZARD` constant** (see Task 2) — this file is
  the authoring source for that copy, and stays the durable record.
- `system/analytics.mjs` (lines 37–49) — Why: `trackFactoryDriven()` is **fire-once** (guarded by the
  module-level `fired` flag). ES modules are singletons, so importing it here shares that guard. Call
  it on the **first user-initiated answer change**, never on the initial auto-render (else every
  pageview fires it).
- `system/trace-player.mjs` (lines 1–40 for the module-header + no-injected-`<style>` convention) —
  Why: the house pattern for a **view-time canon module that builds DOM and relies on page CSS** (it
  injects no `<style>`; the page styles the classes it emits). `factory-intake.mjs` follows this: build
  elements with `document.createElement` + `textContent` (never `innerHTML` for untrusted values), style
  via classes defined in `factory.html`'s page-scoped `<style>`.
- `tooling/visual-regression/visual.spec.mjs` (the `PAGES` array + the `kind:'ia'` branch + the
  per-pack `toHaveScreenshot` loop) — Why: the factory entry currently carries
  `mask:'iframe.factory-embed'` (10.1). This slice **adds a readiness wait** so the async-loaded module
  has painted the derived preview before capture (see Task 7 + Risk R2). Mirror the existing per-page
  optional-field pattern (`rows`, `mask`).
- `system/components.css` (lines 541–570 `.decision-card`/`.dc-field`) — Why: considered for the wizard
  card; **rejected** (it's a non-interactive `<dl>` for displaying committed decisions, not a form). See
  NOTES. Reuse `.card`, `.btn`/`.btn-primary`/`.btn-secondary`, `.section-label`, `.muted`,
  `.max-prose`, `.grid`/`.grid-2`/`.grid-3`, `.feature-band` for the preview sample surface.

### New Files to Create

- `system/factory-intake.mjs` — the view-time wizard + re-skin + staged-narrative module (hand-written
  canon; self-initializes on the Factory page; ~250–350 lines).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- CSS custom-property inheritance — https://developer.mozilla.org/en-US/docs/Web/CSS/--*#inheritance
  - Why: setting `--color-accent` etc. on the **preview container** cascades to every descendant using
    `var(--color-accent)` — this is *why* scoping the re-skin to a container (not `<html>`) re-skins
    only the sample and leaves the page chrome + wizard untouched.
- Playwright `toHaveScreenshot` auto-retry / stability — https://playwright.dev/docs/test-snapshots
  - Why: the assertion waits until two consecutive frames match, but the `kind:'ia'` branch only
    explicitly waits for header/footer. A module that flips the palette *after* an async module load can
    race that stability window → the readiness gate (Task 7) makes capture deterministic by
    construction, not by luck.
- WCAG SC 1.4.3 (text 4.5:1) / SC 1.4.11 (non-text 3:1) — as already encoded in `derive.rules.mjs`
  `wcagPairs`. Why: the narrative renders `result.checks` honestly (pass **and** FAIL) — a real check
  that *can* fail for a pathological user colour is what proves it isn't decorative.

### Patterns to Follow

**Re-skin apply/clear — scoped to a container (adapted from `derive.html:183–188`, 214–216):**

```js
// apply: inline custom properties on the preview root outrank contract + pack
for (const [k, v] of Object.entries(result.tokens)) {
  previewRoot.style.setProperty("--" + k, v);
}
previewRoot.dataset.reskin = "ready";           // determinism/readiness signal (Task 7)

// fallback (on any derive() throw): clear props → container inherits the neutral pack
for (const k of appliedKeys) previewRoot.style.removeProperty("--" + k);
previewRoot.dataset.reskin = "fallback";
```

**Enums from the ruleset, labels in the module (single source of truth):**

```js
import { RULESET } from "/system/derive.rules.mjs";
const LABELS = {                                 // labels only; VALUES come from RULESET keys
  density:    { compact: "Compact", comfortable: "Comfortable", spacious: "Spacious" },
  rewardType: { tribe: "Tribe — social", hunt: "Hunt — resources / information", self: "Self — mastery / completion" },
  frequency:  { "multiple-daily": "Multiple times a day", daily: "Daily", weekly: "Weekly", monthly: "Monthly", rarely: "Rarely" },
};
const options = (axis) => Object.keys(RULESET[axis === "density" ? "scales" : axis === "rewardType" ? "patterns" : "ethics"] ?? {});
// simpler: hardcode the three key-lists FROM RULESET explicitly (see Task 2) and assert they're non-empty.
```

**Untrusted-value escaping (verbatim from `derive.html:165`) — for any string interpolated into markup:**

```js
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
```

Prefer building nodes with `document.createElement` + `.textContent` (trace-player convention); use
`esc()` only where template-string assembly is genuinely clearer (e.g. the WCAG rows, as `derive.html`
does).

**Capability badge flip (honesty surface #3) — mirror `factory.html`/`index.html`:**

```html
<h2 class="section-label"><span class="num">01</span><span>Intake <span class="capability live">Runs now</span></span><span class="line"></span></h2>
```

**Fire-once analytics on first drive (honesty: no fire on auto-render):**

```js
import { trackFactoryDriven } from "/system/analytics.mjs";
let driven = false;
function onUserChange() { if (!driven) { driven = true; trackFactoryDriven(); } render(); }
```

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 1 (config + module skeleton) gates Phase 2 (wizard UI) and Phase 3
(re-skin + narrative), which are the substance. Phase 4 (page wiring) depends on 2+3. Phase 5 (CI gate
+ validation) depends on all.

### Phase 1: Foundation — the module, its inlined config, and the DOM contract

**Tasks:**

- Create `system/factory-intake.mjs` with its governing-doc header, the inlined Verdant `WIZARD` config
  constant, the `LABELS` map, and the enum lists sourced from `RULESET`.
- Decide + document the fixed element ids the module owns in `factory.html`: `#factory-wizard`
  (Station 1 mount), `#reskin-preview` (Station 2 apply root + sample surface), `#factory-narrative`
  (Station 2 staged beats). Self-init bails quietly if the anchors are absent (module is inert on other
  pages).

### Phase 2: Core Implementation — the guided wizard (one decision at a time)

**Depends on:** Phase 1.

**Tasks:**

- Render a stepped card: progress (`1 / 4`), question prompt, **reasoning** as helper text, the bounded
  input control (styled radio group for density/reward/frequency; native `<input type="color">` for
  brand), Back/Next. Preselect each axis to its Verdant default.
- Maintain answer state `{ brandColor, density, rewardType, frequency }`; changing any control (or
  color input) updates state and triggers a re-render of preview + narrative.

### Phase 3: Core Implementation — live re-skin + staged narrative + WCAG (approach B)

**Depends on:** Phase 1. **Independent of:** Phase 2's stepping UI (both consume the same answer state;
can be authored in parallel, but land together).

**Tasks:**

- `run()`: `try { result = derive(answers) }` → apply `result.tokens` to `#reskin-preview`, set
  `[data-reskin=ready]`; `catch` → clear props, set `[data-reskin=fallback]`, show honest note.
- Render the staged narrative from `result`: brand→palette (**WCAG checks table** from `result.checks`
  + negotiation beats from `result.notes`), density→scales (spacing/type summary from `result.tokens`),
  reward→patterns (`result.patterns`, selected + gated), frequency→verdict
  (`result.ethics.verdict`). No pedagogy callouts — the `notes` copy *is* the teaching.
- Build the sample surface of **real components** inside `#reskin-preview` (card, buttons, a
  `.feature-band` dark band — the inverse group is where bad derivation hides). Static markup in
  `factory.html`; the module only sets the custom props on the container.

### Phase 4: Integration — wire Stations 1 + 2 into `factory.html`

**Depends on:** Phases 2 + 3.

**Tasks:**

- Rewrite Station 1 body → `#factory-wizard` mount + a visible **"Fictional scenario: Verdant"** label +
  honest framing. Rewrite Station 2 body → `#reskin-preview` (sample surface) + `#factory-narrative` +
  a small "see the same engine raw → `/derive`" pointer.
- Flip both badges to `.capability live` "Runs now". Add the page-scoped wizard/preview CSS (token-only)
  to the existing `<style>`. Add the module `<script>`.

### Phase 5: Testing & Validation — keep all three gates green

**Depends on:** Phases 1–4.

**Tasks:**

- Add the readiness wait to the factory entry in `visual.spec.mjs`; regenerate the two factory
  baselines via Docker; **regenerate twice and diff** to prove determinism (Risk R2). Run token-lint +
  drift-check + the full visual suite; manual-verify the wizard, re-skin, fallback, and fire-once.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — SETUP: confirm branch + engine surface

- **IMPLEMENT**: Confirm on `feature/factory-shell` (10.1's branch, this is a follow-on slice on the
  same branch; a fresh `feature/factory-intake-wizard` branch off it is also fine — decide per the
  team's one-branch-per-ticket habit). Confirm the engine + harness exist and run.
- **VALIDATE**: `git rev-parse --abbrev-ref HEAD`; `test -f system/derive.mjs && test -f system/derive.rules.mjs && test -f derive.html && echo OK`;
  `node -e "import('./system/derive.rules.mjs').then(m=>console.log(Object.keys(m.RULESET.scales), Object.keys(m.RULESET.patterns), Object.keys(m.RULESET.ethics.frequencyFilter)))"`
  → prints the three enum lists (the wizard's option values).
- **SATISFIES**: precondition for all ACs.

### Task 1 — DECIDE + RECORD the finalized intake cut

- **IMPLEMENT**: Record the cut in the module header + **issue #10**: **4 asked axes** — brand colour ·
  density · reward type · behaviour frequency (each maps straight to a `derive()` input and visibly
  steers output); the ethics pair (`improvesLives`/`wouldUseIt`) is **deferred to 5.7**; the 8 PRD-§6
  narrative discovery questions are **defaulted silently** (they don't feed `derive()`). This closes the
  PRD's last open question (intake final cut = 3–5 asked). Post the cut as a comment on issue #10:
  `gh issue comment 10 --body "..."`.
- **PATTERN**: `__TODO.md` Step-1 Task 1 (the cut rationale); PRD §6.1 draft-v1 table.
- **GOTCHA**: The wizard cut (4 **mechanical axes**) is a *different* concept from the `asked:true`
  flags on the *narrative* `questions` in `intake.defaults.json` (those flag which discovery prose to
  surface on a future narrative-intake surface — not what the engine consumes). Do **not** conflate
  them. See Open Question OQ1 on whether to also author a machine `wizard` block in
  `intake.defaults.json` this slice (recommended: **defer** to the toggle slice).
- **VALIDATE**: `gh issue view 10 --comments` shows the recorded cut.
- **SATISFIES**: AC1.

### Task 2 — CREATE `system/factory-intake.mjs`: header, config constant, enum/label maps

- **IMPLEMENT**: New module with a feature-file header citing its governing doc (`docs/epics/
  ai-first-ux-factory.architecture.md` §Recommended approach; epic #1, ticket #10 slice 10.2) and a
  what/why line. Define:
  - `WIZARD` — the inlined **Verdant** config: an ordered array of 4 axis entries
    `{ axis, prompt, reasoning }` for `brandColor`, `density`, `rewardType`, `frequency`. Distil the
    `prompt`/`reasoning` from `scenarios/verdant/intake.defaults.json` (e.g. frequency reasoning from
    `target-behavior.reasoning`; author brand/density/reward reasoning honest-to-Verdant, e.g. density:
    "Comfortable — a plant-care overview is browsed calmly, not scanned under load"). Keep each
    reasoning ≤ ~30 words (teach discipline).
  - `DEFAULTS = { brandColor:"#2F7A4D", density:"comfortable", rewardType:"self", frequency:"daily" }`
    (from Verdant `axes`).
  - `ENUM = { density: Object.keys(RULESET.scales), rewardType: Object.keys(RULESET.patterns),
    frequency: Object.keys(RULESET.ethics.frequencyFilter) }` — sourced from `RULESET`, so the wizard
    can never offer an option the engine would reject.
  - `LABELS` — display labels keyed by enum value (see Patterns).
  - `esc()` — verbatim from `derive.html`.
- **IMPORTS**: `import { derive } from "/system/derive.mjs";`
  `import { RULESET } from "/system/derive.rules.mjs";`
  `import { trackFactoryDriven } from "/system/analytics.mjs";`
- **GOTCHA**: Root-absolute import paths (`/system/…`) — the module is served from the deploy root, like
  every other view-time module. `RULESET` is frozen; only *read* it. Assert each `ENUM[axis]` is
  non-empty at module top and that every `DEFAULTS[axis]` is a member of its `ENUM` (fail-fast if the
  ruleset ever drops an option the wizard assumes).
- **VALIDATE**: `node -e "import('./system/factory-intake.mjs').catch(e=>{console.error(e.message);process.exit(1)})"`
  — module parses under Node (DOM code is behind the self-init guard, Task 6, so import alone must not
  throw). *(If any top-level code touches `document`, move it behind the guard.)*
- **SATISFIES**: AC1, AC2.

### Task 3 — ADD the wizard render (stepped, one decision at a time)

- **IMPLEMENT**: In the module, `renderWizard(mount, step)`:
  - Header: `progress` (`${step+1} / ${WIZARD.length}`), the axis `prompt` (as a heading), the
    `reasoning` as muted helper text.
  - Control: for `density`/`rewardType`/`frequency`, a **radio group** — one labelled radio per
    `ENUM[axis]` value (label from `LABELS`), the current answer checked, `name` unique per axis, each
    input `change` → `setAnswer(axis, value)`. For `brandColor`, an `<input type="color">` bound to the
    current value, `input` → `setAnswer("brandColor", value)`.
  - Footer: **Back** (disabled on step 0) and **Next** (label "Next" → "Review" on the last step; both
    just move `step`, since the preview is always live). Buttons reuse `.btn`/`.btn-secondary`.
  - Build with `createElement` + `textContent`/`.checked`/`.value` — no `innerHTML` for the
    reasoning/labels (untrusted-value discipline, even though this copy is authored).
- **PATTERN**: `derive.html` controls strip (49–79) for the widget set; `.btn` classes for buttons.
- **GOTCHA**: The four axes are **all asked** (none silently defaulted at the wizard level — the
  "defaulted silently" questions are the *narrative* ones, absent from the wizard entirely). Preselect
  every axis to its default so a reader can click Next×4 accepting all defaults and still see the full
  Verdant skin — "recommended default, override within bounds".
- **VALIDATE**: manual (after Task 6) — Station 1 shows one question at a time; Back/Next step through
  4; each shows its reasoning; defaults preselected.
- **SATISFIES**: AC2.

### Task 4 — ADD the live re-skin + fallback (approach B, view-time-safe)

- **IMPLEMENT**: `run()` reads the current answers and:
  - `let result; try { result = derive(answers); } catch (err) { return fallback(err); }`
  - Apply: clear any previously-applied keys, then
    `for ([k,v] of Object.entries(result.tokens)) previewRoot.style.setProperty("--"+k, v)`; remember
    `appliedKeys = Object.keys(result.tokens)`; set `previewRoot.dataset.reskin = "ready"`; clear any
    fallback note.
  - `fallback(err)`: `appliedKeys.forEach(k => previewRoot.style.removeProperty("--"+k))`;
    `previewRoot.dataset.reskin = "fallback"`; render an honest inline note ("Live derivation
    unavailable — showing the neutral pack.") + `console.error(err)`. The container then inherits the
    page's committed neutral pack = the neutral fallback.
- **PATTERN**: `derive.html:168–188` (apply) + `214–216` (clear); the try/catch is the addition.
- **GOTCHA**: Apply to **`#reskin-preview`**, not `document.documentElement` — scoping is what keeps the
  chrome + wizard un-re-skinned (custom-property inheritance). Because inputs are bounded (native color
  input ⇒ always valid `#rrggbb`; radios ⇒ always a valid enum), a real throw is essentially
  unreachable — the try/catch is the *guarantee*, not an expected path. Keep the re-skin **instant** (no
  CSS transition on the preview) so it's reduced-motion-safe with zero extra rules.
- **VALIDATE**: manual — changing brand colour re-skins the sample instantly; the page chrome/header do
  **not** change colour. Force the catch: in devtools set an illegal value
  (`document.querySelector('#reskin-preview')` present) via a temporary bad `derive({density:'x',…})`
  call in console → preview reverts to neutral, note shows, no unhandled error.
- **SATISFIES**: AC3, AC5.

### Task 5 — ADD the staged "how it's generated" narrative + WCAG table

- **IMPLEMENT**: `renderNarrative(root, result)` renders four beats into `#factory-narrative`, each a
  small titled block:
  1. **Brand → accessible palette** — the **WCAG checks table** (mirror `derive.html:189–197`: fg/bg
     swatches, pair + usage, ratio, min, pass/**FAIL**), then the negotiation beats from
     `result.notes` (mirror `derive.html:199–201`: `action` · `token` — `why` (`from`→`to`)). This is
     the "checks shown passing" beat.
  2. **Density → scales** — a compact summary of the emitted spacing + type ramp (pull the
     `spacing-*` / `type-*` keys from `result.tokens`); note the modular ratio.
  3. **Reward → patterns** — `result.patterns` (mirror `derive.html:204–207`: name, `why`, components;
     gated ones shown struck-through with their `gatedBy` tag — the gate shown working, not hiding).
  4. **Frequency → verdict** — `result.ethics.verdict` (plain text). **No** matrix quadrant, **no**
     guess-then-reveal (5.7 deferred).
  - Re-render on every answer change (called from `run()` after a successful `derive`).
- **PATTERN**: `derive.html` output panels (135–157) for structure + the render idioms; style via
  page-scoped classes (Task 6), not injected `<style>` (trace-player convention).
- **GOTCHA**: Render checks **honestly** — a pathological user colour can legitimately produce a FAIL
  (the engine hits its `minL` floor); show it as FAIL, don't hide it. That honesty *is* the proof the
  checks are real. Escape every interpolated value with `esc()`. **Zero pedagogy callouts** — no "Did
  you know", badges, or lesson framing; the `notes`/`why` copy carries the teaching (PRD §6 subtlety
  bar).
- **VALIDATE**: manual — all four beats update live; at the Verdant default (`#2F7A4D`, comfortable,
  self, daily) every WCAG row reads **pass**; the verdict reads the habit-candidate line (frequency
  `daily` passes the filter).
- **SATISFIES**: AC3, AC4.

### Task 6 — ADD self-init (mount guard) + fire-once analytics

- **IMPLEMENT**: At module end, self-initialize: find `#factory-wizard`, `#reskin-preview`,
  `#factory-narrative`; if any is absent, **return silently** (module inert off the Factory page). Else:
  seed `answers = { ...DEFAULTS }`, `step = 0`; render wizard + `run()` (initial auto-render — **does
  not** fire analytics). Wire `setAnswer(axis, value)` to: update `answers`, fire `trackFactoryDriven()`
  **once** on the first user change (a `driven` guard), then `run()` + re-render the current step.
- **PATTERN**: `derive.html:222` (`run()` on load) + fire-once pattern in Patterns-to-Follow;
  `trace-player.mjs` inert-if-no-anchor convention.
- **GOTCHA**: Initial `run()` on load must **not** call `trackFactoryDriven()` — only a user-initiated
  change does (else every pageview records a "factory driven" event, corrupting the one custom metric).
  `type="module"` scripts are deferred, so the anchors exist when self-init runs. `trackFactoryDriven`
  is idempotent (its own `fired` guard) — the local `driven` guard is belt-and-suspenders + avoids the
  needless pushState churn.
- **VALIDATE**: manual — load `/factory`: preview shows the Verdant default skin immediately, no
  `/factory/driven` in history yet. Change any answer once → `history` gains the (restored) virtual
  route once; changing again does **not** re-fire (temporarily `console.log` in the guard to confirm
  exactly one fire).
- **SATISFIES**: AC2, AC6.

### Task 7 — UPDATE `factory.html`: Stations 1 + 2, badges, page CSS, module script

- **IMPLEMENT**:
  - **Station 1 (`#intake`)**: replace the descriptive paragraph with: a visible **"Fictional scenario:
    Verdant — a houseplant-care app"** label (honesty surface #1; the protos carry theirs inside the
    iframes, this new surface needs its own), a one-line honest intro, and the `<div id="factory-wizard">`
    mount. Flip the badge: `<span class="capability live">Runs now</span>`.
  - **Station 2 (`#generation`)**: replace the lineup with `<div id="reskin-preview">` containing the
    **static sample surface** (real components: a `.grid.grid-3` of `.card`s incl. an accent-as-text
    card, a primary+secondary button pair, and a `.feature-band` dark band — lift the shape from
    `derive.html:100–133`), then `<div id="factory-narrative">`, then a small muted pointer "the same
    engine, raw → `/derive`". Flip the badge to `.capability live`.
  - **Page CSS**: extend the existing `<style>` with token-only classes for the wizard card (`.fw-*`),
    the radio group, the preview frame, and the narrative beats + WCAG table (colour/space/radius/type
    via `var(--…)`; grid/flex/px are structural literals — same justification comment as the existing
    block). The WCAG `.ok`/`.bad` colours use `var(--color-accent)` / `var(--color-fg)` as
    `derive.html` does (never a literal).
  - **Script**: after the `analytics.mjs` module tag, add
    `<script type="module" src="/system/factory-intake.mjs"></script>`.
- **PATTERN**: 10.1's page-scoped `<style>` block + its justifying comment; `index.html`/`factory.html`
  `.capability.live` idiom; `derive.html` sample-surface markup.
- **GOTCHA**: **No new token, no components.css/portfolio.css edit, no generator run** — page-scoped
  `<style>` reading existing tokens is the sanctioned pattern (10.1; token-lint doesn't scan HTML
  `<style>` and inline `var()` refs only *add* orphan-consumers, never trip UNDECLARED/ORPHAN). Keep
  the `#reskin-preview` sample markup **static in HTML** (so it renders even if the module is slow/blocked
  — graceful) and let the module only set custom props on it.
- **VALIDATE**: `grep -c 'capability live' factory.html` → **4** (Prototypes, Handoff from 10.1 +
  Intake, Generation now); `grep -c 'class="capability"' factory.html` → **1** (Agents only);
  `grep -c 'factory-intake.mjs' factory.html` → 1; `grep -c 'Fictional' factory.html` → ≥1.
- **SATISFIES**: AC1, AC2, AC3, AC7.

### Task 8 — UPDATE `visual.spec.mjs`: make the factory capture deterministic (readiness gate)

- **IMPLEMENT**: Add a readiness wait for the factory page so the async-loaded module has applied the
  derived preview before capture. On the `factory` entry in `PAGES`, add a field (e.g.
  `waitReady: '#reskin-preview[data-reskin]'`); in the test body, before the `toHaveScreenshot` loop (or
  before each capture), `if (p.waitReady) await page.locator(p.waitReady).waitFor()`. Keep the existing
  `mask:'iframe.factory-embed'`. **Do not** mask `#reskin-preview` — the derived palette is exactly what
  this slice should regression-guard.
- **PATTERN**: the existing per-page optional-field pattern (`rows`, `mask`); the `kind:'ia'`
  header/footer wait it sits beside.
- **GOTCHA**: The preview auto-renders the **Verdant default** skin deterministically (fixed inputs ⇒
  fixed `derive()` output). Under **both** packs (neutral + saulera) the preview looks *identical*
  (inline props outrank whichever pack) — expected; only the chrome differs between the two factory
  baselines. `data-reskin` is set to `ready` (or `fallback`) exactly once per load, so the attribute-
  presence wait is race-free.
- **VALIDATE**: covered by Task 9's twice-regenerate diff.
- **SATISFIES**: AC8.

### Task 9 — REGENERATE factory baselines (Docker) + prove determinism + run all gates

- **IMPLEMENT**: From `tooling/visual-regression/`: `npm run update:docker` (Linux PNGs via the
  committed Playwright image — the ONLY correct regen path; a bare `--update-snapshots` on macOS makes
  PNGs that fail CI). Commit the regenerated `baselines/factory-neutral.png` +
  `baselines/factory-saulera.png`. **Prove determinism (Risk R2):** run `update:docker` a **second**
  time into a temp dir (or regen again) and diff the two PNG sets — **byte-identical ⇒ the readiness
  gate works.** If they differ, the module still races capture — tighten the wait (e.g. also
  `waitFor('#factory-narrative')` populated) and repeat. Then confirm the whole suite:
  `npm ci && npm test` → all green.
- **PATTERN**: `tooling/visual-regression/package.json` `update:docker`; 10.1's identical regen step.
- **GOTCHA**: `git status --porcelain baselines/` should list **only** the two factory PNGs — any other
  baseline drift means the shared shell shifted (investigate before committing). Docker must be running.
- **VALIDATE**: `git status --porcelain tooling/visual-regression/baselines/` → only the two factory
  PNGs; two consecutive `update:docker` runs produce identical bytes; `node tooling/token-lint.mjs` →
  `✓`; `node tooling/drift-check.mjs` → `✓`; `cd tooling/visual-regression && npm test` → all pass.
- **SATISFIES**: AC8.

---

## TESTING STRATEGY

No unit/integration suite exists (CLAUDE.md: "no suite, no linter, no type-check — don't hunt for or
invent one"). "Done" = **run the surface you touched** + the three CI gates green.

### Unit Tests

- None. `derive()` itself is already exercised by `derive.html` + `tooling/spike-palette.mjs`; this
  slice adds only view-time wiring around proven canon.

### Integration Tests (the CI gates — these ARE the acceptance gate)

- **token-lint**: `node tooling/token-lint.mjs` → `✓` (HTML `<style>` isn't scanned; the module injects
  no CSS and adds no token — inline `var()` refs only add orphan-consumers).
- **drift-check**: `node tooling/drift-check.mjs` → `✓` (no generated artifact or spec touched).
- **visual-regression**: `cd tooling/visual-regression && npm test` → all green after the two factory
  baselines are regenerated through the readiness-gated spec.

### Edge Cases

- **`derive()` throw (fallback path)**: unreachable via the UI (bounded inputs), but forced in console →
  preview reverts to the committed neutral pack, honest note shows, no unhandled error, badge stays
  honest (see Risk R1).
- **Pathological brand colour** (e.g. a very light yellow): the engine negotiates to its floor; a WCAG
  row may read **FAIL** — the narrative shows it honestly (proves the checks are live).
- **saulera pack**: the preview stays the Verdant-derived palette (inline props outrank the pack) — the
  point of the mechanism; both factory baselines regenerated.
- **Reduced motion**: the re-skin is instant (no transition) — nothing to quiet; confirm no smooth
  transition was added to `#reskin-preview`.
- **Module blocked / slow**: the sample surface is static HTML, so Station 2 still renders real
  components (un-re-skinned, neutral pack); Station 1's wizard mount is empty — see Risk R1 for the
  honest degraded copy.
- **External deep link `/factory#intake`** (cold load): lands on Station 1 below the sticky header
  (90px scroll-margin from 10.1); wizard mounts.
- **Keyboard path**: radios are reachable/operable by keyboard; Back/Next are `<button>`s; focus order
  is DOM order. (Full a11y audit is 8.4, later — but don't regress basic operability.)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

- No linter/formatter. Sanity greps:
  `grep -c 'capability live' factory.html` → `4`; `grep -c 'class="capability"' factory.html` → `1`;
  `grep -c 'factory-intake.mjs' factory.html` → `1`.
- Module parses under Node:
  `node -e "import('./system/factory-intake.mjs').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"`.

### Level 2: Token + drift gates

- `node tooling/token-lint.mjs` → `token-lint ✓ … 0 undeclared · 0 orphan · DTCG valid`
- `node tooling/drift-check.mjs` → `✓`

### Level 3: Visual-regression gate

- `cd tooling/visual-regression && npm run update:docker` (twice; diff the outputs → identical)
- `cd tooling/visual-regression && npm ci && npm test` → all pass
- `git status --porcelain tooling/visual-regression/baselines/` → only `factory-neutral.png` +
  `factory-saulera.png`

### Level 4: Manual Validation

- Serve the repo: `npx serve .` (repo root) → open `http://localhost:3000/factory`.
- [ ] Page renders under the neutral pack; chrome injected; Factory nav active; **no console errors**.
- [ ] Station 1: "Fictional scenario: Verdant" label present; wizard shows **one** question at a time
      with its recommended default preselected + reasoning; Back/Next step through all 4.
- [ ] Station 2: the sample surface shows the **Verdant-derived** skin on load; the narrative's four
      beats render; **every WCAG row reads pass** at the defaults; the verdict is the habit-candidate line.
- [ ] Change **brand colour** → the sample re-skins **instantly**; the page chrome/header do **not**
      change colour (scoping holds). The WCAG table + notes update.
- [ ] Change **frequency** to `monthly` → the verdict flips to the "Utility …" line and habit-mechanic
      patterns show **gated** (struck-through) — the gate shown working.
- [ ] `trackFactoryDriven` fires **exactly once** on the first change (temporary `console.log` in the
      guard), never on load.
- [ ] Fallback: force a `derive()` throw in console → preview reverts to neutral, honest note shows, no
      unhandled error.
- [ ] `http://localhost:3000/factory#intake` in a fresh tab lands on Station 1 below the header.

### Level 5: Additional Validation (Optional)

- Deploy preview not required (deploy = epic Step 3). The CI PR checks (drift-check · token-lint ·
  visual-regression) are the gate.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** — The finalized intake cut (4 asked axes; ethics pair deferred; narrative questions
      defaulted) is recorded in the module header **and** posted to issue #10.
- [ ] **AC2** — Station 1 renders a working **guided wizard**: one decision at a time, each asked axis
      carrying a recommended **default** and its **reasoning**, overrides bounded to the engine's enums,
      Back/Next stepping. Wizard shape matches PRD §6.1.
- [ ] **AC3** — Answering the wizard **re-skins the sample preview live** via the real `derive()` +
      inline-custom-property swap, **scoped to `#reskin-preview`** (page chrome/wizard unaffected).
- [ ] **AC4** — Station 2 renders the staged "how it's generated" narrative from the engine output
      (brand→palette+WCAG · density→scales · reward→patterns · frequency→verdict), with **WCAG checks
      shown** (passing at the defaults), and **no pedagogy callouts**.
- [ ] **AC5** — The re-skin is **view-time-safe**: `derive()` behind a try/catch, falling back to the
      committed neutral pack on any throw — **nothing can fail on stage** (approach B).
- [ ] **AC6** — `trackFactoryDriven()` fires **exactly once**, on the first user-initiated change, never
      on the initial auto-render.
- [ ] **AC7** — Stations 1 + 2 carry `.capability live` "Runs now"; Station 1 carries a visible
      **fictional-scenario** label. Station 5 stays "In build". No station claims to run what it doesn't.
- [ ] **AC8** — All three CI gates green: drift-check · token-lint · visual-regression (factory
      baselines regenerated via Docker through the **readiness-gated** spec; twice-regenerate diff
      proves determinism).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (0 → 9).
- [ ] Each task validation passed immediately.
- [ ] token-lint + drift-check pass locally.
- [ ] Visual-regression suite green with **only** the two factory baselines changed; twice-regenerate
      diff byte-identical.
- [ ] Manual walkthrough (Level 4) all boxes ticked, incl. the fire-once and fallback paths.
- [ ] No new token, no components.css/portfolio.css change, no generator run, no view-time LLM, no build
      step.
- [ ] Intake cut posted to issue #10.
- [ ] Committed on the ticket branch; message references `#10` (e.g. "feat: Factory intake wizard →
      live re-skin — guided 4-axis wizard drives the derivation engine, staged narrative + WCAG,
      view-time-safe (#10, slice 10.2)").

---

## OPEN QUESTIONS / ASSUMPTIONS

**OQ1 — Author a machine `wizard` block in `intake.defaults.json` this slice, or defer to the toggle
slice? (RECOMMENDED: defer.)** `__TODO` Step-1 Task 1 suggests "write the cut back into both
`intake.defaults.json` files." But this slice **inlines** the Verdant config in the module (for
stage-safety — see NOTES "Why inline"), so authoring a parallel machine block now would **duplicate the
editorial copy** with drift risk, and nothing would consume it (the fetch that reads it is a
toggle-slice concern). Recommended: record the cut in the module header + issue #10 (Task 1), and let
the **scenario-toggle slice** author the per-scenario `wizard` blocks *when it builds the fetch that
reads them* (and designs that fetch's failure state). If the team wants the durable machine record now
regardless, author the Verdant block (values sourced from `axes`, not duplicated) and flag Fieldwork's
as authored-but-unvalidated-until-the-toggle-slice — accept the copy duplication. **Confirm before
Task 1.**

**OQ2 — Keep the "raw engine → /derive" pointer on Station 2 now that the designed surface runs?**
Recommended: **keep it**, demoted to a small muted link ("the same engine, raw →"). It's still true and
gives the technical reader something to inspect. Non-blocking.

**Assumptions:**

1. The four mechanical axes (brand/density/reward/frequency) are the right 3–5 cut — they map straight
   to `derive()` and are what visibly steers output (`__TODO` Task 1 says exactly this). The ethics pair
   is the 5.7 moment, correctly deferred.
2. Verdant is the sole scenario this slice renders (no toggle) — matches the ticket's silence on the
   toggle and `__TODO`'s slice split.
3. A synchronous, inlined config makes the on-load apply settle before Playwright's stability window;
   the `[data-reskin]` gate makes this true **by construction** rather than by timing luck (Task 8) —
   verified by the twice-regenerate diff (Task 9). If, surprisingly, the diff is non-identical, the
   fallback is a stricter wait (narrative populated), still no fetch.
4. Firing `trackFactoryDriven()` here is in-scope: this slice is the first with a pipeline to *drive*,
   and the re-skin **is** the drive. (`__TODO` cross-cutting item places the fire "when the reader first
   drives the pipeline (completes intake or triggers the re-skin)".)

---

## NOTES (open canvas)

**Why inline the config, not fetch (the load-bearing architecture call).** The advisor pass flagged two
gaps that both trace to fetch-vs-inline, both under the ticket's hard "can't fail on stage" bar:
(1) a config-fetch failure would leave a **"Runs now" badge over a non-rendering wizard** — a dishonest
state on the one page whose whole contract is honesty; (2) a module that flips the palette *after* an
async fetch/load can **race the visual-regression capture** (the `kind:'ia'` branch waits for
header/footer only), giving a flaky/wrong baseline. Inlining sidesteps both: the apply is synchronous
(settles before capture; no fetch to fail). The only cost is that the Verdant copy lives in the module
rather than a data file — and per "no flexibility that wasn't requested," building the per-scenario
fetch seam a slice *early* is exactly the kind of speculative generality to avoid. The **toggle slice**
is where switching sources is genuinely needed; it introduces the fetch **and** designs the degraded
state + readiness gate the fetch requires. (The `[data-reskin]` gate is added now regardless, cheaply,
because the module load is still async even with an inline config.)

**Why scope the re-skin to a container, not `<html>`.** `derive.html` applies to `documentElement`
because the *whole* harness is the sample. On the Factory page the chrome, the wizard, and Stations 3–5
must **not** re-skin — so the props go on `#reskin-preview` and inherit only to the sample inside it.
This is also why the embedded prototypes (Station 3) are untouched: they're separate iframe documents;
parent custom properties don't cross that boundary (and shouldn't — each proto owns its own skin).

**The `.decision-card` reuse I rejected.** It's a promoted, token-only organism — tempting for the
wizard's "recommended default + reasoning" card. But it's a **non-interactive `<dl>`** (Decision /
Because / Rejected / Would-measure) for *displaying committed decisions to a screen reader and an
agent*, not a form. Forcing radio inputs + a color picker into a definition list would abuse its
semantics. The wizard card is page-scoped `.fw-*` styling instead; `.decision-card` stays for its real
job. (If a later slice wants the wizard card promoted to a reusable organism, that's a components.css +
token-first change, not this slice.)

**Honesty surfaces on this slice.** (1) *fictional labels* — Station 1 gains a visible "Fictional
scenario: Verdant" label (the new non-iframe surface needs its own; the protos carry theirs inside the
iframes). (2) *capability indicators* — Stations 1 + 2 flip to "Runs now" **because they now genuinely
run**; the fallback state (Risk R1) must keep that honest. (3) *"real run, curated" trace labels* —
N/A this slice (Station 5 unchanged).

**Data-flow (Station 1 → Station 2):**
`radio/color change` → `setAnswer(axis,val)` → (first change only) `trackFactoryDriven()` →
`run()` → `try derive(answers)` → apply `result.tokens` to `#reskin-preview` (`[data-reskin=ready]`) +
`renderNarrative(result)`; on throw → clear props (`[data-reskin=fallback]`) + honest note = neutral
pack. Everything is synchronous after the (deferred) module load; no await, no network at view time.

**Risks:**

- **R1 — dishonest degraded state (badge vs render).** If the module fails to mount (JS disabled/blocked,
  a throw before first render), Station 1's wizard mount is empty under a "Runs now" badge. *Mitigation:*
  the `#reskin-preview` **sample surface is static HTML** (renders real components regardless), and the
  self-init is defensive; but if the wizard mount is empty, that badge is briefly dishonest. Cheap fix:
  seed `#factory-wizard` with a static "Loading the intake wizard…" fallback in the HTML that the module
  **replaces** on mount — if the module never runs, the reader sees an honest "loading", not a live
  claim over emptiness. Keep the fallback copy honest-to-state. **Include this static seed in Task 7.**
- **R2 — non-deterministic screenshot.** Addressed by the `[data-reskin]` readiness gate (Task 8) +
  the twice-regenerate byte-diff (Task 9). If the diff is non-identical, escalate the wait; do not
  commit a baseline until two consecutive regens match.
- **R3 — enum drift.** If a future ruleset edit renames/drops a density/reward/frequency key, the
  wizard's `DEFAULTS` membership assert (Task 2) fails **fast** at load rather than silently offering a
  dead option. `ENUM` is read from `RULESET`, so the option *list* can't drift; only a default could.
- **R4 — line budget.** Ticket says 350–500; realistic ~500–650 with the staged-narrative rendering.
  Not a correctness risk; if trimming is wanted, the narrative can share more render helpers with the
  WCAG table. Flag if it balloons past ~700.

**Confidence for one-pass success: 9.5/10.** The engine + re-skin mechanism are proven canon
(`derive.html`), the shell + badge/deep-link idioms are established (10.1), and the two hard gaps
(stage-safety, screenshot determinism) have designed answers. Residuals: the twice-regenerate
determinism check *could* surface a race needing a stricter wait (mitigated, not eliminated), and OQ1
(intake.defaults.json authoring) wants a one-line confirm before Task 1.

## AMENDMENTS

<!-- Append-only; newest at the bottom. Empty at creation. -->
