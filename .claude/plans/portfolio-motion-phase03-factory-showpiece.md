# Feature: Portfolio Motion — Phase 3: Make the Factory Page *Perform*

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing. Pay special attention to naming
of existing tokens, classes, and module exports — import from the right files, use the shipped
token names (not the parent plan's proposed ones).

> Phase 3 of `.claude/plans/portfolio-ux-uplift.md`. Phases 0–2 are shipped
> (`feature/portfolio-motion-phase01` + `…-phase02`). This is the highest-differentiation phase:
> the factory page is the site's flagship proof, and Phase 3 makes its core moment — the live
> re-skin — visibly *happen*, plus adds pausable trace playback, wizard entrance choreography,
> and animated disclosure. **All motion, zero at-rest change** (see the VR-churn contract below).

## Feature Description

Add presentation-only motion to `factory.html` and its two view-time modules
(`system/factory-intake.mjs`, `system/trace-player.mjs`) so the flagship "watch it re-skin"
proof becomes a memorable beat instead of a hard cut, and the trace/wizard/checks read as
high-craft interactions. **No derived value, trace datum, or copy changes** — it's the real
derivation and the real curated run, just made visible. Four moves:

1. **Animated re-skin** — when the derivation engine applies derived tokens to `#reskin-preview`,
   the sample's colours *interpolate* to the new palette instead of snapping (a "derive → apply"
   beat), most striking on the Verdant→Fieldwork scenario toggle (green → alert-orange).
2. **Trace-player Play mode** — an optional, pausable auto-advance (WCAG 2.2.2), a progress fill
   spanning the four PIV acts, and step cards entering with a gentle fade+rise.
3. **Wizard step choreography** — each wizard step enters (fade+rise), the ethics-quadrant
   selection gets a spring pop, and the WCAG check rows reveal in a stagger.
4. **Animated disclosure** *(optional, lowest priority)* — the trace-response `<details>` expand
   instead of snapping; handoff-viewer panel crossfade.

## User Story

As a **hiring manager / senior engineer evaluating this UX-engineering portfolio**
I want to **watch the factory's core proof (the live re-skin, the real agent trace) actually move
with the same craft the site claims to teach**
So that **the interaction quality on the page corroborates the seniority the page asserts — the
portfolio IS the case study.**

## Problem Statement

The factory page states the site's strongest claim ("a brief becomes an accessible design system,
performed in the open") but presents it inertly: the live re-skin swaps token custom properties
**instantly** (a hard cut — the proof doesn't visibly *happen*), the trace player only steps on
click, the wizard snaps between steps, and the WCAG checks — the literal substance — appear
without ceremony. For a UX-engineer audience, motionless craft on the flagship page undercuts the
claim it's making.

## Solution Statement

Layer compositor-safe, token-driven motion onto the existing surfaces using **only the idioms
Phases 0–2 already established**: `@media (prefers-reduced-motion: no-preference)`-gated keyframe
entrances whose rest state equals their final state (the `hl-draw` idiom, `portfolio.css:85-96`),
the `grid-template-rows: 0fr→1fr` disclosure trick (`.verify-proof`, `portfolio.css:140-154`), the
existing motion tokens (`--motion-fast/base/slow/stagger/rise/ease/ease-spring`), and the JS
`matchMedia('(prefers-reduced-motion: reduce)')` guard (`portfolio.js:26`). The re-skin extends a
transition **already live in this exact spot** (`.btn` transitions its fill on token swap today —
`components.css:164`) to the surrounding surfaces. New at-rest controls (Play button, progress
fill) are **rendered only under `no-preference`** — a UX decision (reduced-motion users get no
auto-advance; they keep Next/Prev) that, as a side effect, keeps them absent from the
reduced-motion VR capture → **zero baseline churn**.

## Out of Scope / Non-Goals

- **Not** touching any derived value, WCAG result, trace datum, ethics verdict, or page copy
  (honesty contract — presentation-only).
- **Not** adding any new design token → **no `gen-token-css.mjs` / `gen-handoff.mjs` regen.**
  Phase 3 consumes the existing `motion` token group only. (Contrast Phase 0, which added them.)
- **Not** creating any new file — this is an **all-edits** plan (4 files: `factory.html`,
  `system/factory-intake.mjs`, `system/trace-player.mjs`, `trace.html`; +2 optional for item 4).
- **Not** using `document.startViewTransition()` for the re-skin (rejected — see Notes).
- **Not** promoting any factory-only choreography to `components.css`/`portfolio.css` —
  factory-page choreography stays inline in `factory.html` per the parent plan's promotion rule
  (§Sequencing). Only genuinely reused motion utilities would be promoted; none here are.
- **Not** re-recording or editing traces/compositions. The trace file is untouched.
- **Not** animating layout properties — only `transform`/`opacity`/`background-*`/`color`/
  `border-color`/`block-size` (compositor-safe / disclosure-only).
- **Deferred within item 4:** if native `<details>` animation proves fiddly cross-browser, ship
  it `@supports`-gated (degrades to today's snap) or cut it — it's the lowest-value move.

## Feature Metadata

**Feature Type**: Enhancement (presentation layer)
**Estimated Complexity**: Medium (Large surface area, but every move mirrors a shipped idiom; the
risk is concentration, not novelty)
**Primary Systems Affected**: `factory.html` (inline `<style>` + no structural HTML change),
`system/factory-intake.mjs` (re-skin + wizard render paths), `system/trace-player.mjs` (Play
mode), `trace.html` (mirror the new trace CSS — **do not forget this**)
**Dependencies**: None new. Uses existing motion tokens + platform CSS
(`@media prefers-reduced-motion`, keyframes, `grid-template-rows`, optionally `@starting-style`/
`::details-content`+`interpolate-size` behind `@supports`).

## Related Work

**Implements**: Phase 3 of `.claude/plans/portfolio-ux-uplift.md` (lines 127-149).
**Epic**: `docs/epics/ai-first-ux-factory.*` (factory page = epic #1 ticket #10). No epic
engineering decision is reopened; Phase 3 is a presentation layer over shipped surfaces.

**Back-references** (inherits decisions from):

- `.claude/plans/portfolio-ux-uplift.md` — Phase 0 (motion tokens), Phase 2 (the
  `no-preference`-gated keyframe-entrance idiom + the `grid-rows` disclosure trick this phase
  reuses wholesale). Same VR-churn contract and calm-colour constraint.

**Forward-references**:

- Phase 4 (visual richness) — separate PR, deliberate baseline regen. Not blocked by this.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `system/factory-intake.mjs` **(lines 211-256)** — `run()` applies derived tokens to
  `previewRoot` via `previewRoot.style.setProperty("--"+k, v)` (line 222) and sets
  `previewRoot.dataset.reskin = "ready"` (224); `setScenario()` (244-256) is the big Verdant→
  Fieldwork swap. **This is where item 1's `.is-animated` flag is armed (one frame after the
  first `run()`).**
- `system/factory-intake.mjs` **(lines 349-385)** — `renderWizard()`; `replaceChildren(card)` at
  379 creates a fresh `.fw-card` each step → a CSS keyframe on `.fw-card` re-runs per step with
  **no JS change** (item 3, wizard entry). Note `focusOnRender` focus handling (384) — don't break it.
- `system/factory-intake.mjs` **(lines 397-452)** — `renderNarrative()`; the WCAG checks table is
  built via `table.innerHTML` from `result.checks.map(...)` (405-414). Item 3's row stagger adds
  `style="--i:${idx}"` inside this map (only JS change in renderNarrative).
- `system/factory-intake.mjs` **(lines 482-495)** — `selectCell()`; toggles `.is-selected` +
  `aria-pressed` on the ethics quadrant button (487). Item 3's spring pop is CSS on
  `.fw-quadrant.is-selected` — **interaction-fired, no JS change.**
- `system/trace-player.mjs` **(lines 97-179)** — `renderTracePlayer()`; controls built 117-124
  (`btnPrev/btnNext/btnAll` use `.btn .btn-secondary/.btn-primary`), `apply(scroll)`/`next`/`prev`/
  `reveal`/`revealAll` 154-165, `scrollIntoView({block:'center', behavior:'smooth'})` at 160,
  `onKey`+`destroy` 170-178, `reveal(0,false)` at 177. **Play mode is added here; timer must be
  cleaned up in `destroy()`.**
- `factory.html` **(lines 24-217)** — the page-inline `<style>`. ALL factory choreography goes
  here. Key anchors: `#reskin-preview` (96-104), `.fw-card` (75-78), `.fw-checks` (115-119),
  `.fw-quadrant`/`.is-selected` (148-157), `.trace-controls` (181), `.trace-progress` (182),
  `.trace-step`/`-hidden`/`-current` (191-193), `.trace-response` (`<details>`) (210-215).
- `factory.html` **(lines 294-324)** — `#reskin-preview` markup: `.card` (plain, non-interactive),
  `.btn-primary`/`.btn-secondary`, `.feature-band`/`.feature-item`/`.fw-preview-pad`. These are the
  surfaces item 1's transition must cover. **The preview cards are `.card` NOT `.card-link`** → no
  hover-lift to clobber (de-risks the scoped-transition selector).
- `trace.html` **(lines 22-54, 91-116)** — its OWN copy of the `.trace-*` styles + the player
  mount. **New trace classes (progress fill, step-entrance keyframe) must be added here too.** Not
  VR-gated (confirmed absent from the PAGES list) → visual correctness only, no baseline concern.
- `system/portfolio.css` **(lines 16-23)** — the reduced-motion kill-switch (global `!important`
  zeroing). **(lines 85-96)** — `hl-draw`: the canonical "motion-only, no-churn, `no-preference`-
  gated keyframe entrance" idiom to mirror for every render-fired entrance. **(lines 140-154)** —
  `.verify-proof`: the `grid-template-rows: 0fr→1fr` disclosure trick (mirror for item 4; note the
  child needs `overflow:hidden; min-height:0`). **(lines 66-71, 127-131)** — the "at-rest change
  is called out in a comment with its baseline impact" convention.
- `system/portfolio.js` **(line 26)** — `var reduceMotion = window.matchMedia("(prefers-reduced-
  motion: reduce)")`, checked via `reduceMotion.matches`. Mirror this in `trace-player.mjs` (ESM
  style: `const reduceMotion = matchMedia(...)`).
- `system/components.css` **(line 164)** — `.btn { transition: background-color …, color …,
  transform … }`; **(line 527)** — `.card { transition: transform …, box-shadow …, border-color … }`.
  These show what already transitions (buttons: fill+text; cards: border only) → tells item 1
  exactly which surfaces still snap and need the added transition.
- `system/tokens.neutral.css` **(lines 60-67)** — the shipped motion tokens (see below).
- `tooling/visual-regression/visual.spec.mjs` **(line 28)** — factory capture: `waitReady:
  ['#reskin-preview[data-reskin]', '#agents-player[data-trace="ready"]']`, mask targets only the
  iframe embeds (`:not([hidden]) .factory-embed`) — the wizard/preview/trace are NOT masked (they
  are what's guarded). **(lines 84-99)** — normalization + single-frame integer-viewport capture.
- `tooling/visual-regression/playwright.config.mjs` **(lines 12-21)** — `colorScheme:'light'`,
  **`reducedMotion:'reduce'`**, **`toHaveScreenshot: { animations:'disabled', maxDiffPixels:100 }`**.
  This is the whole churn contract: gated motion is invisible + finite animations frozen to end
  state at capture.

### New Files to Create

**None.** This is an all-edits plan. (Item 4's optional handoff-viewer crossfade edits
`system/handoff-viewer.mjs` + `handoff.html` — still edits, not new files. handoff.html is not
VR-gated.)

### The shipped motion tokens (use these EXACT names — the parent-plan draft names are stale)

```
--motion-fast:        160ms   /* micro feedback — hovers, colour/opacity */
--motion-base:        200ms   /* structural — lifts, slides, panels, crossfade */
--motion-slow:        480ms   /* entrances + reveals — the re-skin beat, step entries */
--motion-stagger:     70ms    /* step between staggered children (compose via calc) */
--motion-rise:        20px    /* reveal translate offset */
--motion-ease:        ease
--motion-ease-spring: linear(…)   /* baked spring, ~1.9% single overshoot — for the pop */
```

> ⚠️ The input text (written against the Phase 0 *proposal*) says `var(--motion-duration-slow)`.
> The **shipped** token is `var(--motion-slow)` (likewise `--motion-fast`/`--motion-base`, not
> `-duration-`). Using the draft name is a silent no-op bug. See Open Questions.

### Patterns to Follow

**Motion-only, no-churn entrance (mirror `hl-draw`, portfolio.css:89-96):** put BOTH the
initial hidden state and the animation *inside* `@media (prefers-reduced-motion: no-preference)`,
so at rest / under reduced motion the element is fully at its final state. Use `forwards`/`both`
fill so the end state holds.

```css
@media (prefers-reduced-motion: no-preference) {
  .fw-card { animation: fw-step-in var(--motion-slow) var(--motion-ease-spring) both; }
}
@keyframes fw-step-in {
  from { opacity: 0; transform: translateY(var(--motion-rise)); }
  to   { opacity: 1; transform: none; }
}
```

**Disclosure trick (mirror `.verify-proof`, portfolio.css:140-154):** animate
`grid-template-rows: 0fr → 1fr` with the collapsing child `overflow:hidden; min-height:0`.

**JS reduced-motion gate (mirror portfolio.js:26):** `const reduceMotion = matchMedia("(prefers-
reduced-motion: reduce)"); if (!reduceMotion.matches) { /* render Play controls */ }`.

**At-rest change convention (portfolio.css:127-131):** if a change alters the reduced-motion
capture, say so in a CSS comment naming the affected baselines — but the goal here is zero such
changes.

---

## IMPLEMENTATION PLAN

Phases below are **mostly independent** (item 1 / item 2 / item 3 / item 4 touch different modules
and different regions of `factory.html`'s `<style>`). They are **NOT** parallel-worktree
candidates, though, because all four edit the single `factory.html` inline `<style>` block — a
worktree split would collide there. Do them **sequentially in one branch**, validating each with
the shared VR suite at the end. Recommended order: **0 (pre-flight) → 1 → 2 → 3 → 4**, front-
loading the highest-value, lowest-risk move (re-skin) and ending on the optional one.

### Phase 0: Pre-flight — retire the load-bearing technical risk (30 seconds, do first)

**Confirms** the custom-property→transition mechanism in this exact page before any building.

**Tasks:**

- Serve the repo (`npx serve .`), open `/factory.html`, and **change the brand-colour picker**
  (Station 1, question 1 — pick a starkly different colour) while watching `#reskin-preview`. The
  **buttons' fill should glide** (~200ms — they already transition, `components.css:164`) while the
  **card surfaces / dark band snap** (no transition yet). Seeing the split confirms item 1 is
  simply "extend the glide the buttons already have to the other surfaces" — not a hypothesis.
  **Use the brand-colour picker, NOT a density/reward/frequency radio** — those change *scale/
  pattern/ethics* tokens, not *colour* tokens, so they trigger no colour transition (a false
  negative). The picker changes only colours (no reflow) → the glide-vs-snap split is unambiguous.
  If even the buttons snap, stop and re-verify the colour token names the engine emits vs. what
  `.btn` consumes before proceeding.

### Phase 1: Animated re-skin (item 1 — single biggest win)

**Depends on:** Phase 0 (mechanism confirmed).

Make the whole `#reskin-preview` subtree interpolate its token-driven colours on re-skin, gated so
the first settle and the reduced-motion capture are instant.

**Tasks:**

- Add, in `factory.html`'s `<style>`, a `no-preference`-gated transition covering
  `background-color, color, border-color` (using `--motion-slow var(--motion-ease)`) on the
  preview's **structural surfaces + cards + text**, scoped so it does **not** clobber `.btn` /
  `.card-link` hover transitions (buttons already glide via their own transition; the preview
  cards are plain `.card` with no hover-lift).
- Gate the transition behind an `.is-animated` class on `#reskin-preview` so the **first settle is
  instant** (no load-flash; belt-and-suspenders for VR): in `factory-intake.mjs`, after the
  initial `run()` in `init()`, add `requestAnimationFrame(() => previewRoot.classList.add("is-
  animated"))`. Every subsequent re-skin (answer change, scenario toggle) then animates.
- Verify the **colour-picker drag** specifically (see Open Questions — contingency ready).

### Phase 2: Trace-player Play mode (item 2)

**Independent of:** Phase 1 (different module).

Add optional, pausable auto-advance + a progress fill across the four acts + step-card entrances —
all **only under `no-preference`** (reduced-motion users keep Next/Prev; capture is unaffected).

**Tasks:**

- In `trace-player.mjs`: add a `matchMedia` reduced-motion gate; when `!reduceMotion.matches`,
  render a Play/Pause toggle (`.btn .btn-secondary` — no new CSS) and a progress-fill element into
  `.trace-controls`. Autoplay = a timer calling `next()`; **never auto-starts** (WCAG 2.2.2 is
  satisfied trivially — user-initiated), pauses on Pause, on manual Prev/Next, and at the last
  step. Set the fill width in `apply()` = `(current+1)/cards.length`. Clean the timer up in
  `destroy()`.
- Autoplay scroll: use `scrollIntoView({ block: 'nearest' })` (don't yank a card already on
  screen); leave manual `next/prev`'s existing `block:'center'` alone.
- Add the step-entrance: a `no-preference` keyframe on `.trace-step:not(.trace-step-hidden)` (a
  `display:none`→`block` reveal replays the keyframe) — fade+rise, in **both** `factory.html` and
  `trace.html` style blocks.
- Add the progress-fill classes (`.trace-progress-track`/`-fill`) to **both** style blocks.

### Phase 3: Wizard + checks + ethics choreography (item 3)

**Independent of:** Phases 1-2 (CSS-only + one tiny `renderNarrative` edit).

**Tasks:**

- Wizard step entry: `no-preference` keyframe on `.fw-card` (fires per step automatically —
  `replaceChildren` makes a fresh node; **no JS change**). Note this is **enter-only**, not a true
  crossfade (documented deviation — the old card is removed, not faded out).
- Ethics-quadrant pop: `no-preference` keyframe on `.fw-quadrant.is-selected` using
  `--motion-ease-spring` (interaction-fired → never at capture → no churn; **no JS change**).
- WCAG rows stagger: add `style="--i:${idx}"` to the row template in `renderNarrative` (the
  `result.checks.map` at factory-intake.mjs:407-413), then a `no-preference` keyframe on
  `.fw-checks tbody tr` with `animation-delay: calc(var(--i) * var(--motion-stagger))`.

### Phase 4: Animated disclosure (item 4 — OPTIONAL, lowest priority, cuttable)

**Independent of:** Phases 1-3.

**Tasks:**

- `.trace-response` `<details>` expand: `@media no-preference` + `@supports (interpolate-size:
  allow-keywords)` on `::details-content` (`block-size: 0 → auto`), in **both** style blocks →
  degrades to today's instant snap everywhere unsupported/reduced-motion. If this proves fiddly,
  **cut it**.
- *(optional)* handoff-viewer panel crossfade in `system/handoff-viewer.mjs` / `handoff.html`
  (not VR-gated). Lowest value; cut freely.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic; validate immediately.

### 0. VERIFY mechanism — pre-flight (`factory.html` in a browser)

- **IMPLEMENT**: Serve repo, open `/factory.html`, **change the brand-colour picker** (Station 1,
  Q1), watch `#reskin-preview`. NOT a density/reward/frequency radio — those change non-colour
  tokens and won't exercise the colour transition.
- **VALIDATE**: `npx serve .` then load `http://localhost:3000/factory.html`; picking a new brand
  colour → buttons' fill glides (~200ms, existing `.btn` transition) while card surfaces/dark band
  snap (the split you're about to close). No reflow (colour-only change) → clean signal.
- **SATISFIES**: Retires the item-1 mechanism risk before any code.

### 1. UPDATE `system/factory-intake.mjs` — arm `.is-animated` after first settle

- **IMPLEMENT**: In `init()`, after the initial `run()` call (line 591), add
  `requestAnimationFrame(() => previewRoot.classList.add("is-animated"));`.
- **PATTERN**: One-frame-later class arming so the first paint is transition-free (mirrors the
  intent of the VR-safe "rest == final" idiom; here enforced in JS).
- **IMPORTS**: none.
- **GOTCHA**: Do NOT gate on `dataset.reskin` (it's `"ready"` after the *first* run too, so it
  wouldn't suppress the first transition). The rAF is the suppression. Keep `previewRoot`'s
  existing `dataset.reskin` writes untouched — the VR gate waits on `[data-reskin]`.
- **VALIDATE**: reload `/factory.html`; the preview must NOT flash-transition on load, but a
  **brand-colour change** (or scenario toggle) now animates.
- **SATISFIES**: AC #1, AC #7 (no load-flash / VR-safe first paint).

### 2. UPDATE `factory.html` `<style>` — re-skin transition (scoped, `no-preference`-gated)

- **IMPLEMENT**: Add near the `#reskin-preview` rules (after line 104):
  ```css
  @media (prefers-reduced-motion: no-preference) {
    #reskin-preview.is-animated .card,
    #reskin-preview.is-animated .card-body,
    #reskin-preview.is-animated .card-kicker,
    #reskin-preview.is-animated .feature-band,
    #reskin-preview.is-animated .feature-item,
    #reskin-preview.is-animated .fw-preview-pad,
    #reskin-preview.is-animated .feature-headline,
    #reskin-preview.is-animated h3,
    #reskin-preview.is-animated p {
      transition: background-color var(--motion-slow) var(--motion-ease),
                  color var(--motion-slow) var(--motion-ease),
                  border-color var(--motion-slow) var(--motion-ease);
    }
  }
  ```
  (Refine the selector list against the actual preview markup at factory.html:294-324; the
  principle: cover surfaces + text, exclude `.btn` so its own hover-transform transition survives.)
- **PATTERN**: `.btn` already does exactly this on fill (`components.css:164`); this extends it.
- **GOTCHA**: Do NOT use a broad `#reskin-preview *` with the `transition` shorthand — its
  specificity `(1,0,0)` beats `.btn` `(0,1,0)` and would drop the button hover-transform. Scope to
  named surfaces. Only `transform`/`opacity`/`background`/`color`/`border-color` — never layout.
- **VALIDATE**: reload; **change the brand colour** → card surfaces + dark band now glide with the
  buttons (was: buttons glided, surfaces snapped). Toggle Verdant→Fieldwork → the whole sample
  flows green→orange. (Density/reward/frequency radios reflow scales/patterns — no colour glide, by
  design.)
- **SATISFIES**: AC #1.

### 3. VERIFY colour-drag feel (`factory.html`, brand-colour control)

- **IMPLEMENT**: Drag the brand-colour picker; judge whether the ~480ms chase reads as intentional
  or laggy.
- **GOTCHA**: The colour `<input type=color>` fires `input` continuously → `run()` repeatedly →
  the palette chases by up to `--motion-slow`. If laggy, apply the contingency (Task 3a).
- **VALIDATE**: subjective + cross-browser (Chrome/Safari/Firefox).
- **SATISFIES**: AC #1, AC #8.

### 3a. (CONTINGENCY, only if Task 3 reads laggy) — suppress transition during colour-drag

- **IMPLEMENT**: In the brand-colour control's `input` handler (factory-intake.mjs:319-322),
  `previewRoot.classList.remove("is-animated")`; re-add it on the color input's `change` event via
  `requestAnimationFrame`. Discrete palette changes (the brand-colour `change` commit + the
  scenario toggle) keep the slow beat; only the live drag is instant. **Alternative:** swap
  `--motion-slow` → `--motion-base` in Task 2.
- **VALIDATE**: the live colour drag is now instant; the brand-colour commit (release) + scenario
  toggle still animate the slow beat.
- **SATISFIES**: AC #8.

### 4. UPDATE `system/trace-player.mjs` — Play mode (gated), progress fill, timer cleanup

- **IMPLEMENT**:
  - Near the top of `renderTracePlayer`, `const reduceMotion = matchMedia("(prefers-reduced-
    motion: reduce)");` and `let timer = null;`.
  - After building `controls` (line 122), if `!reduceMotion.matches`: create `btnPlay`
    (`el('button','btn btn-secondary','▶ Play')`) and a progress track/fill
    (`el('span','trace-progress-track')` containing `el('span','trace-progress-fill')`); append
    both to `controls`. Wire Play to start `timer = setInterval(() => { if (current >=
    cards.length-1) stop(); else next(); }, 1400)` (or use recursive `setTimeout`); Pause/`stop()`
    clears it and relabels the button. Have `prev`/`next`/manual clicks call `stop()` first.
  - In `apply()` (154-161), if a fill element exists set
    `fill.style.width = ((current+1)/cards.length*100)+"%"`.
  - In autoplay's step, use `scrollIntoView({ block: 'nearest' })` (add a param to `apply` or a
    dedicated path) so a visible card isn't yanked; leave manual stepping's `block:'center'`.
  - In `destroy()` (175) add `if (timer) clearInterval(timer)` before removing the listener.
  - Return `stop`/`play` on the controls object if useful (optional).
- **PATTERN**: reduced-motion JS gate mirrors `portfolio.js:26`; controls reuse `.btn` classes.
- **IMPORTS**: none (matchMedia is global; guarded — the module already self-inits behind
  `typeof document !== "undefined"`, so Node parse-check is safe since `renderTracePlayer` isn't
  called under Node).
- **GOTCHA**: Never auto-start (WCAG 2.2.2 + VR determinism). The Play affordance must be
  `no-preference`-only so it's absent from the reduced-motion capture. `factory.html` mounts the
  player once and never calls `destroy()` — fine, but the timer must still stop at the last step
  and on manual interaction so it doesn't run forever.
- **VALIDATE**: `/trace.html` and `/factory.html` #agents — Play auto-advances, Pause stops,
  Prev/Next stops autoplay, progress fill tracks position; with OS reduced-motion ON the Play
  button + fill are ABSENT and Next/Prev still work.
- **SATISFIES**: AC #2, AC #7.

### 5. UPDATE `factory.html` + `trace.html` `<style>` — trace step-entrance + progress-fill CSS

- **IMPLEMENT** (in BOTH files' `<style>` blocks — factory.html ~line 193 area; trace.html ~line
  45 area):
  ```css
  .trace-progress-track { flex: 1 1 120px; height: 3px; background: var(--color-border);
    border-radius: var(--radius-sm); overflow: hidden; }
  .trace-progress-fill { display: block; height: 100%; width: 0; background: var(--color-accent);
    transition: width var(--motion-base) var(--motion-ease); }
  @media (prefers-reduced-motion: no-preference) {
    .trace-step:not(.trace-step-hidden) { animation: trace-step-in var(--motion-base) var(--motion-ease-spring) both; }
  }
  @keyframes trace-step-in { from { opacity: 0; transform: translateY(var(--motion-rise)); } to { opacity: 1; transform: none; } }
  ```
- **PATTERN**: `hl-draw` gating idiom; the progress-fill classes only render under `no-preference`
  (JS in Task 4) so they never appear at capture.
- **GOTCHA**: **Do not forget `trace.html`** (the advisor's top catch — the player injects no
  `<style>`; each host styles its own copy). trace.html is not VR-gated → no baseline risk, but an
  unstyled progress bar there is a visible bug.
- **VALIDATE**: both pages; step cards fade+rise on reveal (no-preference), snap under reduced
  motion; progress fill styled correctly.
- **SATISFIES**: AC #2.

### 6. UPDATE `factory.html` `<style>` — wizard step entry + ethics pop

- **IMPLEMENT**:
  ```css
  @media (prefers-reduced-motion: no-preference) {
    .fw-card { animation: fw-step-in var(--motion-slow) var(--motion-ease-spring) both; }
    .fw-quadrant.is-selected { animation: fw-pop var(--motion-base) var(--motion-ease-spring); }
  }
  @keyframes fw-step-in { from { opacity: 0; transform: translateY(var(--motion-rise)); } to { opacity: 1; transform: none; } }
  @keyframes fw-pop { 0% { transform: scale(1); } 40% { transform: scale(1.04); } 100% { transform: scale(1); } }
  ```
- **PATTERN**: keyframe entrance (`hl-draw`); `--motion-ease-spring` for the pop.
- **GOTCHA**: `.fw-card` animates per step because `renderWizard` recreates the node — no JS
  needed. The ethics pop fires on `.is-selected` toggle (interaction) → never at capture. Keep the
  `.fw-quadrant.is-selected` **box-shadow** rule (factory.html:155) intact — the pop is additive.
- **VALIDATE**: step Next/Back → card fades+rises in; select a quadrant → subtle spring pop; both
  instant under reduced motion.
- **SATISFIES**: AC #3.

### 7. UPDATE `system/factory-intake.mjs` — WCAG row stagger index

- **IMPLEMENT**: In `renderNarrative`'s checks table (line 407-413), add `style="--i:${i}"` to
  each `<tr>` (the `.map((c) => ...)` gains its index: `.map((c, i) => ...)`).
- **PATTERN**: per-child `--i` + `calc()` delay is the standard stagger; mirrors the parent plan's
  "staggered children (compose delays with calc)" note on `--motion-stagger`.
- **GOTCHA**: The row markup is built with `esc()`'d interpolation — keep the escaping; `--i` is a
  numeric index (safe). Don't disturb the existing `<td>` structure the WCAG assertions rely on.
- **VALIDATE**: change an answer → the check rows cascade in (no-preference); appear all-at-once,
  final state, under reduced motion.
- **SATISFIES**: AC #3.

### 8. UPDATE `factory.html` `<style>` — WCAG row stagger keyframe

- **IMPLEMENT**:
  ```css
  @media (prefers-reduced-motion: no-preference) {
    .fw-checks tbody tr { animation: fw-row-in var(--motion-base) var(--motion-ease) both;
      animation-delay: calc(var(--i, 0) * var(--motion-stagger)); }
  }
  @keyframes fw-row-in { from { opacity: 0; transform: translateY(calc(var(--motion-rise) / 2)); } to { opacity: 1; transform: none; } }
  ```
- **GOTCHA**: `var(--i, 0)` fallback so rows without the index still render. Rest state (reduced
  motion) = normal table → identical to today → no churn.
- **VALIDATE**: as Task 7.
- **SATISFIES**: AC #3.

### 9. (OPTIONAL) UPDATE `factory.html` + `trace.html` `<style>` — `<details>` disclosure

- **IMPLEMENT** (both files):
  ```css
  @media (prefers-reduced-motion: no-preference) {
    @supports (interpolate-size: allow-keywords) {
      .trace-response { interpolate-size: allow-keywords; } /* REQUIRED — enables the 0↔auto interpolation (inherited to ::details-content) */
      .trace-response::details-content { block-size: 0; overflow: hidden;
        transition: block-size var(--motion-base) var(--motion-ease), content-visibility var(--motion-base) allow-discrete; }
      .trace-response[open]::details-content { block-size: auto; }
    }
  }
  ```
- **GOTCHA**: `::details-content` + `interpolate-size` is Chromium-recent; everywhere else the
  `@supports` fails → today's snap (fine). Closed state is unchanged → no churn. If flaky, cut.
- **VALIDATE**: open a trace-response in Chromium → smooth expand; other browsers → snap (no
  regression).
- **SATISFIES**: AC #4 (optional).

### 10. VALIDATE — full cross-browser + VR suite (see Validation Commands)

- **SATISFIES**: AC #5, #6, #7.

---

## TESTING STRATEGY

No unit test suite exists (project convention: "run the surface you touched"). Testing is
**manual browser walk-throughs + the visual-regression gate**.

### "Unit"-level (surface smoke)

- `node --check system/factory-intake.mjs` and `node --check system/trace-player.mjs` — parse-
  clean (the modules self-init only behind `typeof document !== "undefined"`).
- `node --input-type=module -e "import('./system/trace-player.mjs')"` — must not touch the DOM
  (the module guard holds).

### Integration (manual, the plan's own verify step)

Run the intake wizard **end-to-end** and replay a trace in **Chrome + Safari + Firefox**:

- Re-skin animates on **brand-colour change** + on the Verdant→Fieldwork toggle (the two palette
  levers; density/reward/frequency radios reflow non-colour tokens, no glide by design);
  colour-drag acceptable.
- Trace Play auto-advances, Pause/manual stops it, progress fill tracks; step cards enter.
- Wizard steps enter; ethics quadrant pops on select; WCAG rows stagger.
- **Reduced-motion pass** (OS setting ON, or DevTools "Emulate prefers-reduced-motion: reduce"):
  everything resolves to final state instantly; Play button + progress fill are ABSENT; Next/Prev
  still work; nothing is stuck invisible.

### Edge cases

- Colour-picker continuous drag (lag). · Rapid answer / brand-colour changes mid-transition (no
  stuck state). ·
  Scenario toggle mid-autoplay on trace (autoplay independent of wizard). · Play to last step
  (timer stops). · `destroy()` on trace.html re-render (no stacked timer/listener). · A
  derivation `fallback()` path (transition must not strand a half-colour — `fallback` clears props;
  transitions to the neutral inherit, fine). · Firefox (no `@supports interpolate-size` → snap).

---

## VALIDATION COMMANDS

### Level 1: Syntax

```bash
node --check system/factory-intake.mjs
node --check system/trace-player.mjs
```

### Level 2: Module DOM-safety

```bash
node --input-type=module -e "import('./system/trace-player.mjs').then(()=>console.log('ok'))"
```

### Level 3: Live surface

```bash
npx serve .          # then open /factory.html and /trace.html; run the Integration walk-through
```

### Level 4: Visual-regression gate (the churn verdict)

```bash
cd tooling/visual-regression && npm run update:docker   # ⚠️ REGEN — only if a churn is intended
# Preferred: run the CHECK (not update) first to prove zero churn:
cd tooling/visual-regression && npm test                # or the repo's docker check script
```

> Expected result: **green with NO baseline change** (factory-neutral + factory-saulera unchanged),
> because every entrance is `no-preference`-gated and the new controls are reduced-motion-gated.
> If it's red on factory: either an entrance leaked its hidden state into the reduced-motion
> capture (rest ≠ final — fix the gating) or a new control rendered under reduced motion (fix the
> JS gate). Only regen (`update:docker`) if you've **intentionally** accepted an at-rest change —
> per memory `visual-regression-baseline-trap`, regen runs in the SAME PR as the change.
> Note (memory `local-agent-visual-gate-notes`): the gate is Linux-baseline; a local macOS run
> failing on AA is platform, not regression — trust the docker run.

### Level 5: Honesty-contract spot check

- Diff the trace JSONL and the derived values shown: **unchanged**. Presentation-only.

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — Re-skin: changing an answer / toggling scenario visibly interpolates the
      `#reskin-preview` palette (not a hard cut); first page paint does NOT flash-transition.
- [ ] **AC #2** — Trace Play mode: pausable auto-advance (never auto-starts), progress fill spans
      the four acts, step cards enter; present in `factory.html` #agents AND `trace.html`.
- [ ] **AC #3** — Wizard steps enter, ethics quadrant pops on select, WCAG rows stagger.
- [ ] **AC #4** *(optional)* — `<details>` expand animates where supported, snaps elsewhere.
- [ ] **AC #5** — Works in Chrome + Safari + Firefox (Firefox degrades gracefully, nothing broken).
- [ ] **AC #6** — Reduced-motion: all motion resolves to final state instantly; Play controls
      absent; nothing stuck invisible; keyboard stepping intact.
- [ ] **AC #7** — VR suite green with **zero baseline change** (or, if a change is deliberate, its
      regen is committed in the same PR with a comment naming the affected baselines).
- [ ] **AC #8** — Colour-picker drag reads acceptably (contingency applied if needed).
- [ ] **AC #9** — Honesty contract intact: no derived value, trace datum, or copy changed.
- [ ] **AC #10** — No new tokens, no new files, no generator regen; only `transform`/`opacity`/
      `background`/`color`/`border`/`block-size` animate.

## COMPLETION CHECKLIST

- [ ] Pre-flight (Task 0) confirmed the transition mechanism.
- [ ] `.is-animated` armed one frame after first `run()` (no load-flash).
- [ ] Re-skin transition scoped (no `.btn`/`.card-link` hover clobber).
- [ ] Play mode: gated, never auto-starts, timer cleaned in `destroy()`, `block:'nearest'` on
      autoplay scroll.
- [ ] New trace CSS added to **both** `factory.html` and `trace.html`.
- [ ] Wizard/ethics/rows choreography in place; row `--i` index added in `renderNarrative`.
- [ ] All entrances inside `@media (prefers-reduced-motion: no-preference)` with rest == final.
- [ ] `node --check` clean on both modules; module DOM-safe under Node.
- [ ] Cross-browser walk-through done (Chrome/Safari/Firefox) + reduced-motion pass.
- [ ] VR suite green, zero baseline change (or intentional regen committed same PR).
- [ ] Shipped token names used (`--motion-slow`, not `--motion-duration-slow`).
- [ ] One atomic commit, message references Phase 3 + the parent plan.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions:**

1. **The custom-property→transition mechanism works in all three browsers.** Grounded, not
   guessed: `.btn` already transitions its fill on token swap in this exact preview today
   (`components.css:164`). Task 0 confirms it live before building. (Well-established platform
   behaviour: a standard property referencing a changed unregistered custom property re-computes
   and transitions.)
2. **The VR gate stays configured with `reducedMotion:'reduce'` + `animations:'disabled'`**
   (playwright.config.mjs:15,21). The zero-churn contract depends on this; it's shipped and not
   changed by this phase.
3. **`trace.html` is not VR-gated** (confirmed absent from `visual.spec.mjs` PAGES) → its trace-CSS
   edits carry no baseline risk, only visual-correctness responsibility.

**Deviations from the literal input (intentional, not drift):**

- **Token name:** input's `var(--motion-duration-slow)` → shipped `var(--motion-slow)` (the input
  was written against the Phase 0 proposal; Phase 0 shipped shorter names). Same for `-fast`/`-base`.
- **`@starting-style` → keyframe-entrance idiom.** The repo has NO `@starting-style` precedent but
  a strong keyframe-entrance precedent (`hl-draw`). Using keyframes keeps one idiom and avoids
  introducing `allow-discrete`/`@starting-style` for the render-fired entrances. **Consequence:**
  wizard step change is **enter-only, not a true crossfade** — the outgoing card is removed by
  `replaceChildren`, so there's no simultaneous fade-out. If a genuine crossfade is wanted, that's
  a larger change (keep the old card in the DOM during a transition) — flag before expanding scope.
- **`startViewTransition()` rejected for the re-skin** (input offered it as an alternative) — see
  Notes for why.

**Questions that would change the plan if answered differently:**

- **Q1 — Is the ~480ms colour-drag chase acceptable, or should the live drag be instant?** Default:
  ship `--motion-slow` and verify (Task 3); apply the drag-suppression contingency (Task 3a) if it
  reads laggy. This is the one genuinely subjective call.
- **Q2 — Autoplay interval (1400ms default) and whether autoplay should scroll at all.** Default:
  1400ms, `block:'nearest'` (scroll only when off-screen). Easy to tune.
- **Q3 — Is item 4 (`<details>`/handoff crossfade) worth shipping this PR?** Default: ship the
  `@supports`-gated `<details>` (near-zero risk), cut the handoff crossfade if time-boxed.

## NOTES (open canvas)

**Why NOT `document.startViewTransition()` for the re-skin.** Three reasons: (1) the brand-colour
`<input type=color>` fires `input` continuously during a drag → each would kick a separate View
Transition, producing a snapshot storm / skipped transitions (janky), whereas a CSS transition
just re-targets the same interpolation smoothly. (2) `startViewTransition` captures the **whole
viewport** by default; scoping it to only `#reskin-preview` needs `view-transition-name`
plumbing and still conflicts with the page-level `@view-transition` navigation already shipped
(`portfolio.css:43`). (3) The CSS-transition approach degrades to an instant swap with zero code
on unsupported browsers and under reduced motion, and it's the approach the parent plan leads with.
The View-Transition tool is right for the cross-*page* nav (already shipped Phase 1); wrong for an
in-place colour interpolation driven by a continuous input.

**The whole zero-churn argument, in one line.** VR captures under `prefers-reduced-motion: reduce`
+ `animations:'disabled'`. So: (a) every entrance lives inside `@media no-preference` with rest
state == final state → invisible at capture; (b) finite keyframes that *did* run would be frozen
to end state anyway; (c) the only NEW at-rest elements (Play button, progress fill) render only
under `no-preference` in JS → absent at capture. Net: nothing new paints in the reduced-motion
screenshot. The re-skin transition is doubly safe — reduced-motion zeroes it AND `.is-animated` is
armed a frame late so even the first settle is instant. If the suite still reddens, the diff tells
you which gate leaked.

**Why the Play-controls gate is UX-first, not a VR dodge.** Reduced-motion users don't want
auto-advancing content (that's the whole point of the preference); giving them Next/Prev + the
text progress and withholding autoplay is the *correct* design. That it also keeps the capture
clean is a happy side effect, not the justification. (If product ever wants the Play button visible
for reduced-motion users too, then it becomes an at-rest change → deliberate baseline regen, and
autoplay itself must still respect reduced motion by not moving.)

**Duplication note.** The `.trace-*` CSS is deliberately duplicated between `factory.html` and
`trace.html` (the player injects no `<style>`; each host styles its own copy — established
convention). Phase 3 honors it: new trace classes go in both. Not a candidate for promotion (the
player has exactly two hosts and the convention is intentional).

**Effort / shape.** All-edits across 4 files (6 with optional item 4). No new files, no new tokens,
no generator runs, no kb/spec changes. The risk is breadth, not depth — every move mirrors a
shipped idiom, so review each against its pattern reference.

## AMENDMENTS

<!-- Append-only after first execution. Newest at the bottom. -->

- (none yet)
