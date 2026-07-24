# Feature: v3 intake — stakeholder-worded rewrite (ticket #73)

The following plan is complete, but validate documentation, codebase patterns, and task sanity before implementing. Pay special attention to naming of existing utils/consts (`SCENARIOS`, `ENUM`, `LABELS`, `initIntake`, `registerBeat`) and import from the right files.

> **Provenance:** decisions locked with the owner in a 2026-07-23 planning session and posted to issue #73 as a comment. This plan is self-contained (No-Prior-Knowledge test) so a fresh `/piv-implement` session can execute it after a `/clear`.

## Feature Description

Rewrite the Factory intake wizard from four raw engine-parameter questions into **three stakeholder-worded questions** (Hooked-workbook / PRD §6 D4), each answered by picking a **recommended option** (never free text), each **visibly changing the generation stage**, with the engine parameters (`density`, `rewardType`, `frequency`) **derived behind the scenes** and shown only as output. Home (`index.html`, `#beat-intake`) is pinned to **Verdant only**. The shared wizard (`system/factory-intake.mjs`, consumed by `factory.html` + `instance.html` via the `initIntake(config)` seam) is **configured, never forked**.

## User Story

As a **hiring manager landing on the home page**,
I want to **brief a product in plain product language and watch each answer visibly reshape the generated design system**,
So that **I experience this candidate's judgment (accessible palette, density, ethics gate) instead of decoding raw engine settings** — the RC4 failure ("the wizard reads as weird colour selectors").

## Problem Statement

The shipped wizard asks the four *rawest engine inputs* (brand colour, density, reward type, frequency) — engine parameters, not the stakeholder conversation the Hooked workbook models. Each answer's consequence is under-dramatized and nothing frames it as a real product brief. This is the epic's RC4 root cause.

## Solution Statement

Rebuild the wizard's asked set as **three stakeholder questions** whose bounded options map to the existing engine enums, keeping the derivation engine (`derive.mjs` / `derive.rules.mjs`) **unchanged**. The prompt + option labels carry the stakeholder framing; the engine term appears only as derived output in the narrative. Brand colour moves out of the intake (it is #74's `#beat-brand`); `derive()` is seeded with Verdant's default `#2F7A4D` until #74 overrides it. Mount the shared wizard in `#beat-intake` via `spine.mjs`'s `registerBeat` seam, Verdant-only, no scenario toggle, no ethics Matrix (that is #75's peak).

## Out of Scope / Non-Goals

- **Not** the brand-colour input or its site-wide persistence — that is **#74** (`#beat-brand`, `pack-derived.mjs`). #73 only seeds a default brand.
- **Not** the Manipulation-Matrix guess-then-reveal — that is **#75** (the peak, `#beat-peak`). #73 keeps only the live `frequency → verdict` line.
- **Not** the agent-composed *adjustable* prototype — deferred to **#75** / new epic **#86**. #73's live stage is the existing `#reskin-preview` model.
- **Not** a restructure of `factory.html` — that is **#78**. #73 only touches `factory.html`'s wizard indirectly (shared wording) and must not regress it.
- **Not changing** `derive.mjs` / `derive.rules.mjs` — the engine and its enums stay as-is.
- **Not** adding a third scenario, a framework, a build step, or any view-time LLM.

## Feature Metadata

**Feature Type**: Enhancement (rewrite of an existing surface)
**Estimated Complexity**: Medium (~600–1,000 LOC; the risk is the shared seam, not the logic)
**Primary Systems Affected**: `system/factory-intake.mjs` (shared wizard), `index.html` (`#beat-intake` mount), `system/instance.mjs` (regression), VR baseline for `index`
**Dependencies**: #71 (mount) + #72 (`spine.mjs` beat seam) — both merged. Engine (`derive.mjs`) unchanged.

## Related Work

**Implements**: [#73](https://github.com/linardsb/ux-factory/issues/73) · **Epic**: [#70](https://github.com/linardsb/ux-factory/issues/70) — `docs/epics/portfolio-v3-experience.architecture.md` ("Wizard rewrite = (b) rewrite inside factory-intake.mjs behind the seam")

**Back-references** (decisions inherited):
- `docs/epics/portfolio-v3-experience.prd.md` §6.1 beat 2 (D4) + §9 (the open question this ticket closes)
- `.claude/plans/ux-overhaul-v3-prd-research.md` — D4 locked ("4–5 asked, default+reasoning, every answer visibly changes the stage, engine params derived behind the scenes, ethics gate stays the guess-then-reveal beat")
- `.claude/skills/portfolio-design/` — craft bar (§6.4) for the surface

**Forward-references**:
- #74 (your-brand input) — provides the brand colour #73 seeds
- #75 (the peak) — consumes the intake answers; owns the Manipulation Matrix; upgraded to agent-composed adjustable prototype (see #86)
- #86 (new epic — build-time generative prototyper) — the deferred big vision

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `system/factory-intake.mjs` (whole file, 659 LOC) — **the file being rewritten.** Key regions:
  - `57–128` `SCENARIOS` map — `verdant` + `fieldwork`; each `wizard:[{axis,prompt,reasoning}]` (currently 4 axes incl. `brandColor`), `defaults`, `makerMatrix`, `ethicsReveal`. **Reword the prompts + reasoning to stakeholder language here.**
  - `129` `DEFAULT_SCENARIO = "verdant"`.
  - `133–137` `ENUM` (option VALUES pulled live from `RULESET` — do not hardcode).
  - `138–142` `LABELS` (display text per enum value) — **richen these to stakeholder option wording.**
  - `168–176` `assertScenarioConfig` — fail-fast; keep it green.
  - `204–654` `initIntake({scenarios, defaultScenario})` — the seam. `run()`/`setAnswer()` (230–269) = the live re-skin; `renderWizard`/`renderControl` (336–413) = the wizard UI; `renderNarrative` (425–488) = the derived-output beats (density→scales, reward→patterns, frequency→verdict); `renderEthics` (517–594) = the Matrix (**must NOT mount on home**); auto-init guard `659`.
- `system/derive.rules.mjs` — the enums the options map to: `scales` (`89–93` → `density`: compact/comfortable/spacious), `patterns` (`116–137` → `rewardType`: tribe/hunt/self), `ethics.frequencyFilter` (`148` → `frequency`: multiple-daily/daily/weekly/monthly/rarely). **Read but do not edit.**
- `system/spine.mjs` (`35–48` `registerBeat`) — the beat seam: `registerBeat(id, { effect, analytics, activateOn })`; `effect(ctx)` runs once (fail-closed). **Register `beat-intake` here or in a small sibling module.**
- `system/instance.mjs` (`110–116` `renderCuratedIntake`, `118–133` `wizardSteps`, `134–153` `mountWizard`, call at `152` `initIntake({scenarios:{[slug]:scenario}, defaultScenario:slug})`) — **the regression path.** `wizardSteps` copies SCENARIOS wording → must be updated to the new stakeholder wording (or made to reference it).
- `index.html` (`74–100` `#beat-intake` static `.brief-card` to replace with the wizard mount; `13–17` + `268–273` stylesheet/script set — same as `factory.html`, loads `spine.mjs`). Copy to fix: `80` "four questions", `88` "Question 1 of 4".
- `factory.html` (`353–377` intake mount incl. `#factory-wizard` with **no** `data-intake` → auto-inits; `379–446` `#reskin-preview`/`#factory-summary`/`#factory-narrative`/`#ethics-gate`) — **regression only**; keeps both scenarios + brand.
- `instance.html` (`303–319` `#factory-wizard data-intake="external"`) — the external-mount marker pattern to mirror on home.
- `scenarios/verdant/intake.defaults.json` — the authoring record (8 questions with `default`/`reasoning`/`bounds`/`asked`; `axes`). **Draft the final wording from the `default`/`reasoning` prose here.**

### New Files to Create

- Optional: `system/intake-beat.mjs` — a tiny module that `import { registerBeat } from './spine.mjs'` + `import { initIntake } from './factory-intake.mjs'` and registers `beat-intake` with the Verdant-only config. (Alternative: add the registration inside `spine.mjs`. Prefer the sibling module — keeps `spine.mjs` as pure seam+hero.) If created, it is a **new tracked source file → loc-summary + approach-baseline cascade** (regen after `git add`).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- `.claude/skills/portfolio-design/references/CRAFT.md` + `CHECKLIST.md` — the craft bar. Load before writing CSS. Key: type ratio ~1.2–1.25; 4px grid; 60/30/10 (accent budget = one blue + the derived brand on stage); ease-out only, `cubic-bezier(0.23,1,0.32,1)`, never `transition:all`, compositor props only; all six interactive states; hit target ≥44px touch; `:focus-visible` visible; pass/fail keep their word (never colour-only); reduced motion = final state instantly.
- `docs/epics/portfolio-v3-experience.architecture.md` — the wizard-rewrite + seam decision.

### Patterns to Follow

**Stakeholder-option mapping (the core pattern):** the option's *value* stays the engine enum member; only the *label* becomes stakeholder language. This is already how `renderControl` radios work (`value = ENUM member`, `label = LABELS[axis][value]`). So the change is **wording, not structure** — reword `LABELS` + `SCENARIOS.wizard[].prompt`/`.reasoning`; the derived engine term shows only in `renderNarrative`.

**Shared-seam config (do not fork):** the home mount is marked `data-intake="external"` (like `instance.html:315`) to stand down auto-init; a beat effect calls `initIntake(config)`. To drop `brandColor` from the home wizard without forking, extend the config with an optional asked-set filter (e.g. `initIntake({ scenarios, defaultScenario, askedAxes })`, default = all axes) — `factory.html`/`instance` keep the default. This is the "configured, not forked" contract.

**DOM + a11y idioms (mirror existing):** structural nodes via `el(tag,class,text)` (textContent); assembled strings via `esc()`; radiogroup named by the prompt (`aria-labelledby="fw-prompt"`); `guardArrows` on control containers; focus moves to the new step's heading on Back/Next. All present in `factory-intake.mjs` — reuse verbatim.

**Derived-output display:** after each answer, `renderNarrative` shows the engine term as *output* — beat 02 density→scales, beat 03 reward→patterns, beat 04 frequency→verdict. Add the derived label explicitly (e.g. "→ density: comfortable") so the reader sees the translation stakeholder-answer → engine-param.

---

## DRAFT — the three stakeholder questions (Verdant) — CLOSES THE PRD OPEN QUESTION

Owner to react to wording; mapping + count are locked. Drafted from `scenarios/verdant/intake.defaults.json` + the current `SCENARIOS.verdant` reasoning.

**Q1 → `density`** — *"What kind of product is it, and how do people use it?"*
| Option label (stakeholder) | maps to |
| --- | --- |
| Calm — browsed at home, no time pressure | `comfortable` ← **recommended** |
| Fast — used under time pressure | `compact` |
| Roomy — lots of detail to lay out | `spacious` |
*Reasoning (recommended):* "A plant-care overview is browsed calmly at home, not scanned under pressure, so it can breathe — a comfortable spacing and type scale."

**Q2 → `rewardType`** — *"Who is it for, and what brings them back?"*
| Option label (stakeholder) | maps to |
| --- | --- |
| To make their own progress visible | `self` ← **recommended** |
| To find or track something | `hunt` |
| For other people — community, social proof | `tribe` |
*Reasoning (recommended):* "Verdant's reward is mastery made visible — plants kept alive, overdue tasks trending to zero. That is a 'self' reward, so the engine picks progress-stat patterns."

**Q3 → `frequency`** — *"How often would someone realistically do the core thing?"*
| Option label (stakeholder) | maps to |
| --- | --- |
| Several times a day | `multiple-daily` |
| About daily | `daily` ← **recommended** |
| Weekly | `weekly` |
| Monthly | `monthly` |
| Rarely | `rarely` |
*Reasoning (recommended):* "Per-plant care is weekly, but the aggregate check-in is near-daily — inside the habit zone (weekly or better), so a designed habit loop is legitimate here. Below weekly, the engine rules habit mechanics out."

The live `frequency → verdict` line (Verdant default `daily` → "habit-forming candidate") is the intake's whole ethics presence on home; it flips if the reader picks `monthly`/`rarely`.

---

## IMPLEMENTATION PLAN

### Phase 1: Resolve the shared seam (design, no visible change)
Decide + implement how the home asks 3 axes while `factory.html`/`instance` keep 4, **without forking** — recommended: an optional `askedAxes` (or `wizard`-filter) parameter on `initIntake`, defaulting to all axes. Reword `SCENARIOS.wizard` prompts/reasoning + `LABELS` to the stakeholder set (shared → all hosts benefit). Update `instance.mjs` `wizardSteps` to the new wording. Keep `assertScenarioConfig` green.

### Phase 2: Home mount + beat wiring
**Depends on:** Phase 1. Replace `index.html` `#beat-intake` static `.brief-card` with the wizard anchors: `#factory-wizard[data-intake="external"]`, `#reskin-preview`, `#factory-narrative`, `#factory-summary` (optional). **No** `#scenario-toggle`, **no** `#ethics-gate`. Register `beat-intake` (sibling module or `spine.mjs`) whose effect calls `initIntake({ scenarios:{ verdant }, defaultScenario:'verdant', askedAxes:['density','rewardType','frequency'] })`. Update copy "four questions"→"three", "Question 1 of 4"→"Question 1 of 3". Style the wizard to sit inside the `.band` beat (craft bar).

### Phase 3: Regression + verification
**Depends on:** Phase 2. Verify `factory.html` auto-init (4 axes, both scenarios, toggle, ethics) still works; verify `instance.html` `initIntake(config)` still mounts (single scenario, no toggle). Regen `index` VR baseline. Write the resolved cut + wording back to PRD/epic §9. Regen loc-summary + approach baselines **iff** a new tracked file was added.

---

## STEP-BY-STEP TASKS

### UPDATE `system/factory-intake.mjs` — stakeholder wording
- **IMPLEMENT**: reword `SCENARIOS.verdant.wizard` + `SCENARIOS.fieldwork.wizard` prompts/reasoning to the stakeholder set (drop `brandColor` from the array OR keep it and rely on `askedAxes` to filter — see next task); reword `LABELS.density/rewardType/frequency` to the stakeholder option text (Q1–Q3 draft above; Fieldwork keeps its own reasoning prose).
- **PATTERN**: `factory-intake.mjs:57–142`.
- **GOTCHA**: option VALUES must stay the exact `ENUM` members (from `RULESET`) — only labels change, or `assertScenarioConfig`/`derive()` breaks.
- **VALIDATE**: `node -e "import('./system/factory-intake.mjs')"` parses without touching the DOM (auto-init is DOM-guarded).
- **SATISFIES**: AC "new stakeholder-worded questions, default + reasoning; raw engine params never surfaced."

### UPDATE `system/factory-intake.mjs` — `askedAxes` config (no fork)
- **IMPLEMENT**: add optional `askedAxes` to `initIntake({...})`; when present, `renderWizard` iterates only those axes (default = the scenario's full wizard). Home passes `['density','rewardType','frequency']`.
- **PATTERN**: `initIntake` signature `204`; `renderWizard` step model `377–413`.
- **GOTCHA**: `derive()` still needs a `brandColor` in `answers` — seed from `scenarios.verdant.defaults.brandColor` (`#2F7A4D`) even when brand is not asked.
- **VALIDATE**: parse check above + a page render (Phase 3).
- **SATISFIES**: AC "wizard shared, unforked (regression)."

### UPDATE `system/instance.mjs` — match the new wording
- **IMPLEMENT**: update `wizardSteps` (118–133) so its prompts/reasoning match the reworded shared set (or reference `SCENARIOS` wording). Keep the `initIntake({scenarios,defaultScenario})` call at `152` and the `data-intake="external"` marker.
- **PATTERN**: `instance.mjs:118–153`.
- **GOTCHA**: the shell is single-scenario (no `#scenario-toggle`) — the toggle render already no-ops; do not regress that.
- **VALIDATE**: load `instance.html` under a static server → wizard mounts, re-skins on change (Phase 3).
- **SATISFIES**: AC "`instance.html` `initIntake(config)` still works."

### UPDATE `index.html` — mount + copy
- **IMPLEMENT**: replace `#beat-intake` `.brief-card` (`87–98`) with the wizard anchors (`#factory-wizard[data-intake="external"]`, `#reskin-preview`, `#factory-narrative`, `#factory-summary`); fix copy `80`/`88` to "three"/"Question 1 of 3".
- **PATTERN**: mount anchors from `factory.html:357–440`; external marker from `instance.html:315`.
- **GOTCHA**: **no** `#scenario-toggle`, **no** `#ethics-gate` on home. `#reskin-preview` must hold the sample components (copy the neutral sample from `factory.html:389–418`) — the engine writes derived tokens onto it.
- **VALIDATE**: `npx serve .` → open `/` → wizard renders, each answer re-skins the preview + updates the narrative.
- **SATISFIES**: AC "each answer produces a visible stage change."

### CREATE `system/intake-beat.mjs` (or add to `spine.mjs`) — register the beat
- **IMPLEMENT**: `registerBeat('beat-intake', { effect: () => initIntake({ scenarios:{ verdant: SCENARIOS.verdant }, defaultScenario:'verdant', askedAxes:[...] }), activateOn:'visible' })`. Add `<script type="module" src="/system/intake-beat.mjs">` to `index.html` (after `spine.mjs`).
- **PATTERN**: `spine.mjs:180` (hero dogfoods the seam); `instance.mjs:152` (config call).
- **GOTCHA**: `activateOn:'visible'` defers mount to scroll — confirm the wizard renders before the VR snapshot; if flaky, use `'load'`. VR captures at-rest under no-preference (`v3-vr-freeze` is non-blocking on the branch, but rest must == final).
- **VALIDATE**: real Chromium + Firefox + WebKit functional check (memory: `cross-engine-motion-verify`).
- **SATISFIES**: AC "stage-steering plugs into `spine.mjs`'s beat seam."

### UPDATE `docs/epics/portfolio-v3-experience.prd.md` §9 — write-back
- **IMPLEMENT**: mark the intake open question resolved: 3 asked (density/reward/frequency stakeholder-worded), brand → #74, Matrix → #75, Verdant-only home; record the wording.
- **VALIDATE**: `grep -n "Intake final cut" docs/epics/portfolio-v3-experience.prd.md`.
- **SATISFIES**: AC "Closes PRD open question."

### REGEN VR baseline + (conditional) loc-summary
- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker` (Docker/Playwright) → commit the changed `index-neutral.png` / `index-saulera.png`. **If** `intake-beat.mjs` was added as a tracked file: `git add` it, then `node agent-layer/gen-loc-summary.mjs` + regen the two `approach` baselines.
- **GOTCHA**: local macOS run mismatches Linux baselines — only the Docker path is valid. `rm` the PNG to force a sub-perceptual rewrite.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs` (both blocking on the branch).
- **SATISFIES**: AC "craft bar §6.4; honesty (fictional-scenario labels intact)."

---

## TESTING STRATEGY

No unit/integration suite (repo convention). Validation = **run the surface you touched**.

### Manual / functional
- `npx serve .` → `/`: wizard mounts in `#beat-intake`; each of the 3 answers re-skins the preview and/or updates the narrative; the frequency→verdict line flips on `monthly`/`rarely`; no scenario toggle; no Matrix; copy reads "three".
- `/factory`: 4-axis wizard, both scenarios, toggle, ethics Matrix — **unchanged**.
- `/instance.html`: single-scenario wizard mounts via `initIntake(config)`; re-skins on change.
- **Cross-engine** (memory `cross-engine-motion-verify`): Chromium + Firefox + WebKit via Playwright, `python3 -m http.server`.

### Edge cases
- `derive()` throw path (unreachable via bounded UI) still shows the honest fallback note.
- Reduced motion: wizard renders final state instantly (no entrance stagger on continuous change — `run(false)` path).
- Keyboard: Back/Next move focus to the step heading; `←/→` navigate radios without the trace player hijacking them.

---

## VALIDATION COMMANDS

### Level 1 — parse / drift / lint (blocking)
- `node -e "import('./system/factory-intake.mjs')"` — parses, no DOM touch
- `node tooling/drift-check.mjs`
- `node tooling/token-lint.mjs`

### Level 2 — surface renders
- `npx serve .` then load `/`, `/factory`, `/instance.html` (per Testing Strategy)

### Level 3 — visual regression
- `cd tooling/visual-regression && npm run update:docker` (regen `index` baselines in-PR)

---

## ACCEPTANCE CRITERIA (from #73)

- [ ] Wizard renders the new stakeholder-worded questions, each with default + reasoning; raw engine params never surfaced as the question.
- [ ] Each answer produces a visible stage change (preview reflow and/or narrative beat).
- [ ] `factory.html` auto-init AND `instance.html` `initIntake(config)` both still work (seam unforked — regression).
- [ ] Home is Verdant-only; no scenario toggle; no Manipulation Matrix (only the frequency→verdict line).
- [ ] Craft bar §6.4; honesty (fictional-scenario labels intact).
- [ ] `index` VR baseline regenerated in-PR; drift-check + token-lint green.
- [ ] PRD/epic §9 open question written back as resolved.

## COMPLETION CHECKLIST

- [ ] Shared-seam approach chosen + implemented without forking
- [ ] Stakeholder wording (Q1–Q3) confirmed with owner, applied to `SCENARIOS` + `LABELS`
- [ ] `index.html` mount + copy; beat registered; `instance.mjs` wording reconciled
- [ ] All three surfaces render; cross-engine checked
- [ ] Baselines regen; drift-check + token-lint green; §9 written back

## OPEN QUESTIONS / ASSUMPTIONS

- **Wording:** the Q1–Q3 draft above needs the owner's react-pass (taste), then apply. Mapping + count are locked.
- **Shared-seam mechanism:** `askedAxes` config vs. per-host wizard arrays — recommended `askedAxes` (least divergence). Confirm at implement time by reading `initIntake` + `instance.mjs` `wizardSteps` together.
- **`activateOn`:** `'visible'` (lazy, cheaper) vs `'load'` (VR-safe). Default `'visible'`; fall back to `'load'` if the VR snapshot races the mount.
- **Assumption:** reward/frequency answers change the **narrative** (patterns / verdict), not the preview tokens (only density + brand change tokens). This satisfies "visible stage change" across the generation area. Optional enhancement (defer): have `#reskin-preview` swap sample components by selected pattern so reward visibly reflows the preview too — likely #75 territory.
- **Assumption:** `factory.html` keeps brand-in-wizard (4 axes) — if the shared rewording removes `brandColor` from `SCENARIOS.wizard` entirely, `factory.html` loses its brand question; the `askedAxes` approach avoids this by keeping `brandColor` in the array and filtering per host.

## NOTES (open canvas)

The engine is fixed on `brandColor · density · rewardType · frequency` (+ `improvesLives`/`wouldUseIt` for the Matrix). The whole D4 rewrite is therefore a **wording + asked-set** change, not an engine change — the discriminating rule (owner-confirmed): *a question is askable only if bounded (an enum); it steers the stage only if that enum maps to an engine axis.* Home asks the three non-brand axes; brand is #74; the Matrix is #75.

**Rot-safe handoff:** decisions also live in issue #73 (comment, 2026-07-23) and memory `generative-prototyper-epic-direction` / `v3-overhaul-direction`. Epic #86 holds the deferred build-time generative-prototyper vision that upgrades #75.

## AMENDMENTS

- (none — created 2026-07-23)
