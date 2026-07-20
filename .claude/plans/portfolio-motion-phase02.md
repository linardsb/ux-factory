# Feature: Portfolio Motion — Phase 2 (Life on every page: reveals + micro-interactions)

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing. Pay special attention to the
EXACT token names (`--motion-fast/base/ambient/ease` already exist; this phase ADDS four more)
and to the one gotcha that protects all 16 visual-regression baselines (see the bold callout in
Patterns).

## Feature Description

Bring restrained, platform-native motion to the shipped IA pages so the portfolio reads as
"high-craft and alive" instead of "austere and inert" — without a framework, a build step, a
runtime dependency, or a single hand-written literal that breaks token discipline. Five moves:
(1) a hero entrance cascade, (2) an accent-underline draw-in on hero `.hl` highlights, (3)
scroll-driven section reveals, (4) real hover response + reveal-on-scroll for the destination
cards, and (5) a distinguishing monochrome micro-glyph + hover reveal for the three home "ways to
verify" cards. Every animation is compositor-safe (`transform`/`opacity`/`background-size` only),
gated so it is inert under `prefers-reduced-motion: reduce`, and driven by motion tokens a company
pack can retune.

## User Story

As a **hiring manager / senior engineer evaluating a UX-engineering portfolio**
I want to **feel considered, high-craft interaction quality on the portfolio itself**
So that **the interaction quality corroborates the seniority the copy claims — the portfolio IS the case study.**

## Problem Statement

The site is credible but motionless (audit in `portfolio-ux-uplift.md` §Diagnosis). Phases 0–1
added the motion-token seam and app-like navigation, but **individual pages still paint all at
once**: no entrance choreography, section labels sit static, and the destination cards on Home and
Work never respond because they are plain `<article class="card">`, not `.card-link` — so the lift
transition that already exists in `components.css:530` can't fire on the pages that matter most.
The three "ways to verify" cards — the emotional core of the pitch — read as a flat spec sheet.

## Solution Statement

Extend the motion token contract with the four values Phase 2 needs (`--motion-slow`,
`--motion-ease-spring`, `--motion-rise`, `--motion-stagger`) — a zero-visual-change foundation that
also fulfils the neutral pack's already-committed but never-delivered promise of "one baked spring
for emphasis." Then implement the five moves as reusable, token-only CSS in
`system/portfolio.css` + `system/components.css`, plus a surgical HTML change on Home/Work (6 cards
become full-card links) and Home (3 cards gain a monochrome glyph). Four of the five moves are
**baseline-churn-free by construction** (reveals are inert under the VR gate's `reducedMotion:
'reduce'`; the lift is hover-only; the underline keeps its border at rest). **Only move 5 changes
at-rest rendering** → one deliberate, reviewable 16-baseline regen in the same PR.

## Out of Scope / Non-Goals

- **Not included: saulera's own motion character.** The new tokens land in the *contract* group so
  saulera inherits sensible defaults; authoring a distinct saulera pace/spring is a later pack
  decision (`portfolio-ux-uplift.md` Phase 0 non-goal). Do not edit `tokens.saulera.css`.
- **Not included: the factory page's showpiece motion** (animated re-skin, trace-player Play mode,
  wizard step transitions) — that's Phase 3. Phase 2 touches factory.html only insofar as the
  site-wide hero cascade auto-applies to its `.page-hero` intro (and must NOT choreograph its
  embedded wizard — see Gotcha).
- **Not included: View Transitions / prefetch / header-scroll changes** — those shipped in Phase 1
  and were partly tuned back in `a0f8e0c` (static active underline, no nav morph). Leave the
  Phase-1 `@view-transition` block and `portfolio.js` scroll state exactly as they are.
- **Not changing:** approach.html's four "method" cards (§02) — they have no destination link, so
  they are NOT made into `.card-link` and get no lift. They may receive the shared grid-reveal
  only (opt-in class), nothing more.
- **Not adding:** any new runtime JS on shipped pages. Every move in this phase is pure CSS. Do not
  add scroll listeners or IntersectionObservers — `animation-timeline: view()` replaces them.
- **Not applying move 5 (glyph/reveal) to Work's three cards by default** — see Open Questions.

## Feature Metadata

**Feature Type**: Enhancement (motion layer on existing pages)
**Estimated Complexity**: Medium (Medium–Large per the source plan; the token discipline + VR
staging is the care factor, not the CSS volume)
**Primary Systems Affected**: `system/portfolio.css`, `system/components.css`,
`system/tokens.source.json` (+ generated `tokens.contract.css` / `tokens.neutral.css`),
`index.html`, `work.html`, `tooling/visual-regression/baselines/*` (move 5 only)
**Dependencies**: None new at runtime. **Docker required** to regenerate VR baselines
(`npm run update:docker`) — local macOS baselines are invalid (platform AA; see memory
"Visual-regression baseline trap" / "Local agent + visual gate notes").

## Related Work

**Implements**: Phase 2 of `.claude/plans/portfolio-ux-uplift.md` (lines 100–125) — the governing
"epic" plan. Its §"Sequencing & guardrails" (lines 221–232) are **inherited decisions**, not
re-opened here:
- Every animation inside `@media (prefers-reduced-motion: no-preference)` or the global kill-switch.
- Only `transform`/`opacity`/`background-*` animate (compositor-safe); no layout properties.
- Motion values come from tokens — a literal `ms` in `components.css` is a bug.
- Reusable motion utilities land in `components.css`/`portfolio.css`; factory-only choreography
  stays inline (N/A this phase — no factory-specific motion here).

**Back-references**:
- `.claude/plans/portfolio-ux-uplift.md` — Why: the five-phase parent plan; Phase 0 (motion
  tokens) and Phase 1 (nav) are its prerequisites, both landed on this branch.

**Forward-references**:
- (none yet — Phase 3 "make the factory page perform" will get its own plan.)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `.claude/plans/portfolio-ux-uplift.md` (lines 100–125, 221–232) — Why: the parent plan's Phase 2
  spec + the inherited guardrails. Source of truth for intent.
- `system/tokens.source.json` (contract motion group ~lines 63–69; neutral motion group ~lines
  129–135) — Why: DTCG source of truth; the four new tokens are added here, in BOTH groups, then
  the CSS is regenerated. Note the neutral group's `$description` already says "one baked spring
  for emphasis" — this phase finally delivers it.
- `system/tokens.contract.css` (lines 73–76) — Why: the GENERATED fallback layer; confirms the
  live token names are `--motion-fast:160ms · --motion-base:200ms · --motion-ambient:3s ·
  --motion-ease:ease`. Do not hand-edit — regenerate via the generator.
- `system/portfolio.css` — Why: primary edit target. The reduced-motion kill-switch is at
  **lines 16–23**; `.hl` at **79–83**; the `.to-top` reduced-motion opt-out pattern at **404–406**
  is the local idiom to mirror. Loads LAST, so its rules win.
- `system/components.css` — Why: primary edit target. `.card` (lift transition) at **522–534**;
  `.card-link` at **529–534**; `.section-label`/`.num`/`.line` at **633–654**; `.page-hero` +
  `.hero-eyebrow`/`.pill`/`h1`/`.hero-sub`/`.hero-cta-row` at **883–950**; the existing `breathe`
  keyframe at **907–910** (the only pre-existing keyframe — mirror its style).
- `index.html` (hero lines 21–41; "Three ways to verify" grid lines 43–84) — Why: the hero cascade
  target + the three cards that get move 4 (link) AND move 5 (glyph/reveal). Cards are
  `<article class="card">` with `.card-foot > a` at lines 56/68/79.
- `work.html` (hero lines 21–35; "Exhibits" grid lines 37–80) — Why: the other three destination
  cards for move 4. Same `<article class="card">` + `.card-foot > a` (lines 50/63/75).
- `approach.html` (7 `<section class="section" id=…>` blocks, each opening with `.section-label`) —
  Why: highest-impact surface for move 3 (scroll reveals). The four "method" cards (lines 69–125)
  are the ones to LEAVE non-linked.
- `factory.html` (hero lines 217–235) — Why: its `.page-hero` contains `nav.cs-jump` + the embedded
  wizard after `.hero-sub`; the cascade selector must be the scoped `:is(...)` list, never a
  wildcard, so it can't reparent/animate the wizard (see Gotcha).
- `system/portfolio.js` (lines 26, 31–43) — Why: the `reduceMotion = matchMedia(...)` + header
  scroll idiom. Confirms no JS is needed this phase; do NOT add any.
- `tooling/visual-regression/playwright.config.mjs` (lines 12–19) — Why: proves the gate runs
  `colorScheme:'light'`, **`reducedMotion:'reduce'`**, `animations:'disabled'`,
  `maxDiffPixels:100`. The `reduce` emulation is what makes gated reveals invisible to the gate.
- `tooling/visual-regression/visual.spec.mjs` (lines 15–34, 49–99) — Why: the 8 pages × 2 packs =
  16 baselines; full-page single-frame capture at a viewport resized to content height. Confirms
  move 5's at-rest change churns `index-{neutral,saulera}.png` (+ work if parity chosen).
- `agent-layer/gen-token-css.mjs` (lines 5–6, 153–160) — Why: `node agent-layer/gen-token-css.mjs`
  regenerates both CSS layers from source; `--check` drift-verifies (exit 1 on drift).

### New Files to Create

- **None.** Every change is an edit to an existing CSS/HTML/JSON file. (Two small inline SVG glyphs
  are added into `index.html`; no new asset files.)

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [MDN: `animation-timeline: view()`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/view)
  — scroll-driven reveals; note it needs the `@supports` guard (Firefox lacks it unflagged).
- [MDN: `animation-range`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-range) —
  the `entry`/`cover` keywords used to stagger card reveals across a scroll range.
- [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
  — the `no-preference` query that gates every new animation (mandatory).
- [MDN: `linear()` easing](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear)
  — the baked-spring easing function. Keep overshoot ≤ ~2% (calm-colour → calm-motion constraint).
- [Kevin Grajeda's linear() spring generator](https://www.kevinjgraham... ) *(or any linear-easing
  generator)* — Why: to regenerate `--motion-ease-spring` if the starter value below is retuned.
  Target damping ratio ~0.7–0.8, mass ~1, stiffness modest → subtle single overshoot.

### Patterns to Follow

**Token naming (match the EXISTING short scheme, not the parent plan's draft names):** live tokens
are `--motion-fast`, `--motion-base`, `--motion-ambient`, `--motion-ease`. New siblings therefore
are `--motion-slow`, `--motion-ease-spring`, `--motion-rise`, `--motion-stagger` — NOT
`--motion-duration-slow`/`--motion-ease-standard` (those were the parent plan's pre-implementation
draft and were never used).

**No motion literals (inherited guardrail):** durations, easings, AND stagger intervals come from
tokens. Compose delays with `calc()`:
```css
.page-hero > .container > :nth-child(2) { animation-delay: calc(var(--motion-stagger) * 1); }
```
Scroll-*range* percentages (`entry 8%`) are geometry, not pace — those stay inline literals.

**Reduced-motion opt-out idiom** already in the repo (`portfolio.css:404–406`): wrap the *active*
animation in `@media (prefers-reduced-motion: no-preference)`; the global kill-switch
(`portfolio.css:16–23`) is the backstop for anything time-based.

**Keyframe house style:** mirror the existing `breathe` keyframe (`components.css:907`) — lowercase,
hyphenated names (`hero-rise`, `hl-draw`, `label-line`, `card-rise`), `transform`/`opacity` only.

> ### ⚠️ THE ONE GOTCHA THAT PROTECTS ALL 16 BASELINES
> **The hidden start state (`opacity:0`, `transform: translateY(...)`, `background-size: 0 …`,
> `scaleX(0)`) MUST live ONLY inside `@media (prefers-reduced-motion: no-preference)` (and, for
> scroll reveals, also inside `@supports (animation-timeline: view())`).** The element's BASE rule
> must render fully visible / at its current appearance. If any hidden start state leaks into a base
> rule, then under the VR gate's `reducedMotion:'reduce'` every affected element stays hidden →
> blank/wrong content → **all 16 baselines corrupt**. Every task below is written so the base state
> is the current, visible state and only the gated block introduces the "from" state. Verify this
> per task by toggling reduced-motion in DevTools: the page must look identical to today.

**Move-4 anchor-nesting rule:** a `.card-link` is an `<a>`. The current cards contain an `<a>` in
`.card-foot`. You cannot nest `<a>` in `<a>`. So: promote the destination onto the card wrapper and
demote the foot link to a `<span class="card-foot-link">` (pure affordance, keeps the `→`). The
whole card is then one link, one tab stop — an accessibility improvement, not just visual.

**Move-5 selector hook:** add a real class (`class="grid grid-3 mt-xl verify-grid"`) to Home's
"Three ways to verify" grid (`index.html:46`). Style against `.verify-grid`, never against a
positional selector like `[data-page=home] .section:first-of-type`.

---

## IMPLEMENTATION PLAN

Phases run top-to-bottom. Phase 1 (tokens) is a hard prerequisite for all others (they consume the
new tokens). Phases 2A–2D are **churn-free** and mutually independent (any order / parallelable).
Phase 3 (move 5) is the **only** at-rest change and MUST be verified/committed last so its baseline
regen is isolated and reviewable.

### Phase 1: Foundation — extend the motion token contract

**Depends on:** nothing. **Blocks:** every later phase.

Add four tokens to `system/tokens.source.json` in BOTH the contract motion group (~line 68, the
one that guarantees saulera inheritance via the fallback layer) and the neutral motion group
(~line 134, to keep the two groups mirrored as they are today), then regenerate the CSS. Zero
elements consume them yet → **zero visual change → zero baseline churn.**

**Tasks:**
- Add `--motion-slow` (`480ms`), `--motion-ease-spring` (baked `linear()`, ≤2% overshoot),
  `--motion-rise` (`20px`), `--motion-stagger` (`70ms`).
- Regenerate: `node agent-layer/gen-token-css.mjs`; drift-check: `--check`.
- Confirm saulera still renders identically (it defines no motion tokens → inherits the contract
  fallbacks).

### Phase 2A: Hero entrance cascade (move 1)

**Independent of:** 2B/2C/2D. Pure CSS in `components.css` (or `portfolio.css`).

Stagger the hero intro on load: `.hero-eyebrow → h1 → .hero-sub → .hero-cta-row (→ .cs-jump)`
fade + rise, spring easing, gated. Scoped `:is(...)` selector so it never wraps factory's wizard.

### Phase 2B: `.hl` accent-underline draw-in (move 2)

**Independent of:** 2A/2C/2D. Pure CSS in `portfolio.css`.

Keep `.hl`'s `border-bottom` as the rest state (→ zero churn on all 14 instances). Under
`no-preference`, scope `.page-hero .hl` only: make the border transparent and draw a gradient
underline in via `background-size`, delayed so it lands after the h1 rises.

### Phase 2C: Scroll reveals on section labels + card grids (moves 3 + 4-reveal)

**Independent of:** 2A/2B. Pure CSS in `components.css`.

Under `@supports (animation-timeline: view())` AND `@media (no-preference)`: the `.section-label`
`.num` fades+rises and the `.line` hairline draws across (scaleX, not width) as each section enters;
opt-in `.stagger` grids reveal their children with a per-column scroll-stagger. Base state = today.

### Phase 2D: Cards respond — full-card links + spring lift (move 4)

**Depends on:** Phase 1 (spring token). **Independent of:** 2A/2B/2C.

Convert the 6 destination cards (3 Home + 3 Work) to `<a class="card card-link">`; demote their
foot `<a>` to `<span>`. Retune the `.card` lift transition easing to the spring. Hover-only → no
churn. (Add the `.stagger` class from 2C to these grids so they also reveal on scroll.)

### Phase 3: Differentiate the three Home cards (move 5) — THE at-rest change

**Depends on:** 2D (cards are links by now) + 2C (`.stagger` reveal). **Do LAST.**

Add a monochrome micro-glyph per Home verify-card (flow / swatch-swap / lens) + a hover-revealed
true one-line proof. This changes at-rest rendering → regenerate `index-{neutral,saulera}.png`
(and work-* only if parity is chosen). Isolate this as the final commit so the baseline diff is
reviewable.

### Phase 4: Staged visual-regression verification

**Depends on:** all above. See VALIDATION COMMANDS §Level 3 for the exact two-stage sequence
(green after 2A–2D = proof of zero churn; targeted regen after Phase 3).

---

## STEP-BY-STEP TASKS

Execute in order. Each task names its validation. `VALIDATE` commands are non-interactive.

### UPDATE `system/tokens.source.json` — add four motion tokens (contract + neutral groups)

- **IMPLEMENT**: In the **contract** motion group (after the `motion-ease` line, ~line 68), append:
  ```jsonc
  "motion-ease":        { "$value": "ease",  "$type": "easing",   "$description": "default curve" },
  "motion-slow":        { "$value": "480ms", "$type": "duration", "$description": "entrances + reveals — hero cascade, underline draw, section labels" },
  "motion-stagger":     { "$value": "70ms",  "$type": "duration", "$description": "step between staggered children (compose delays with calc)" },
  "motion-rise":        { "$value": "20px",  "$type": "dimension","$description": "reveal translate offset — how far elements travel in" },
  "motion-ease-spring": { "$value": "linear(0, 0.004, 0.016, 0.035, 0.062, 0.096, 0.138, 0.187, 0.242, 0.304, 0.371, 0.443, 0.519, 0.598, 0.68, 0.763, 0.846, 0.918, 0.973, 1.007, 1.019, 1.016, 1.007, 1.001, 1)", "$type": "easing", "$description": "baked spring — subtle single overshoot (~1.9%) for emphasis" }
  ```
  Then add the SAME four to the **neutral** motion group (~line 134) so the two groups stay mirrored
  (as all four existing tokens already are). Add a trailing comma to the existing `motion-ease` line
  in both groups.
- **PATTERN / $type is DOCUMENTATION-ONLY (verified in `gen-token-css.mjs`)**: the generator's
  `emitCss`→`cssValue` (lines 110–131, 64–69) reads ONLY `$value` and `$description` — `$type` is
  never consumed, so it cannot throw and does not affect output. Any `$type` is safe; the values
  above just stay consistent with the existing tokens (`"easing"`/`"duration"`). `$value` is emitted
  verbatim via `String($value)` — a comma-laden `linear(…)` string passes through UNTOUCHED (only
  `{alias}` → `var(--leaf)` and arrays → font-stacks are transformed). Aliases are forbidden in the
  contract group (loadSource line 49), but these are all literals, so that's fine. The duplicate-leaf
  guard (line 45) is per-group, so adding the same four names to BOTH groups is allowed (verified: 0
  pre-existing).
- **IMPORTS**: n/a (JSON).
- **GOTCHA**: (1) The `linear()` value is valid as-is — the ~1.9% overshoot is an **aesthetic** knob
  (calm constraint), NOT a correctness risk; if it reads bouncy anywhere, pull the >1.0 samples
  toward 1.0. (2) **Expected whitespace churn:** `motion-ease-spring` (17 chars) is longer than any
  existing motion token, so regeneration re-pads the whole motion block — `git diff` on
  `tokens.contract.css`/`tokens.neutral.css` will show the existing 4 motion lines changing
  (alignment only). That is correct generated output; `--check` still passes.
- **VALIDATE**: `node agent-layer/gen-token-css.mjs && node agent-layer/gen-token-css.mjs --check`
  (regenerates both CSS layers, then confirms no drift — exit 0). Then
  `grep -c 'motion-slow\|motion-ease-spring\|motion-rise\|motion-stagger' system/tokens.contract.css`
  → expect `4`.
- **SATISFIES**: Foundation for AC #1; unblocks moves 1/2/3/4.

### UPDATE `system/tokens.contract.css` + `system/tokens.neutral.css` — verify generated output

- **IMPLEMENT**: Do not hand-edit — these are generated. Just confirm the previous task wrote the
  four new custom properties into both files with the values above.
- **GOTCHA**: If these files show as manually edited in `git diff` beyond the four new lines each,
  you edited the wrong layer — revert and regenerate from source.
- **VALIDATE**: `git diff --stat system/tokens.contract.css system/tokens.neutral.css` shows only
  additions; `npx serve .` → open `/index.html`, DevTools computed styles on `:root` list the four
  new vars. **No page pixel changes** (nothing consumes them yet).
- **SATISFIES**: AC #1.

### ADD hero entrance cascade to `system/components.css` (move 1)

- **IMPLEMENT**: After the `.hero-cta-row` rule (`components.css:945–950`), add:
  ```css
  /* Hero entrance cascade — the intro stack rises in on load (Phase 2, move 1).
     Scoped :is() list, NOT a wildcard: an animating transform makes the element a
     containing block + stacking context, which would reparent factory's sticky wizard. */
  @media (prefers-reduced-motion: no-preference) {
    .page-hero > .container > :is(.hero-eyebrow, h1, .hero-sub, .hero-cta-row, .cs-jump) {
      animation: hero-rise var(--motion-slow) var(--motion-ease-spring) both;
    }
    /* child 1 keeps the default 0 delay — no rule (a literal `0ms` would trip the no-literals grep) */
    .page-hero > .container > :nth-child(2) { animation-delay: calc(var(--motion-stagger) * 1); }
    .page-hero > .container > :nth-child(3) { animation-delay: calc(var(--motion-stagger) * 2); }
    .page-hero > .container > :nth-child(4) { animation-delay: calc(var(--motion-stagger) * 3); }
    .page-hero > .container > :nth-child(n+5) { animation-delay: calc(var(--motion-stagger) * 4); }
  }
  @keyframes hero-rise {
    from { opacity: 0; transform: translateY(var(--motion-rise)); }
    to   { opacity: 1; transform: none; }
  }
  ```
- **PATTERN**: keyframe style mirrors `breathe` (`components.css:907`). Delay-via-`calc(stagger)`
  honors the no-literals guardrail.
- **GOTCHA**: (1) **THE ONE GOTCHA** — `opacity:0`/`translateY` live only in the gated block; the
  base `.hero-eyebrow`/`h1`/`.hero-sub` rules stay visible. (2) The `:nth-child` delays sit on the
  container's direct children generically; the `:is(...)` list restricts WHICH ones animate, but
  the nth-child index counts ALL direct children — verify each hero's child order matches
  eyebrow(1)→h1(2)→sub(3)→cta/cs-jump(4). On index/approach/work/contact/404 this holds; on factory
  child 4 is `nav.cs-jump` and any deeper wizard children fall into `n+5` (settle last, harmless).
  (3) Do NOT let the cascade wrap `.hero-grid`/`.hero-side` (unused on shipped pages, but if a hero
  uses them, add them to the `:is()` list rather than relying on the wildcard).
- **VALIDATE**: `npx serve .` → `/index.html`, `/approach.html`, `/work.html`, `/factory.html`,
  `/contact.html` — hero stack rises in once on load; factory's wizard is NOT choreographed and its
  sticky/interactive bits behave. Toggle DevTools "Emulate prefers-reduced-motion: reduce" → hero
  appears instantly, identical to today (the gotcha check).
- **SATISFIES**: AC #2.

### ADD `.hl` underline draw-in to `system/portfolio.css` (move 2)

- **IMPLEMENT**: Leave the existing `.hl` rule (`portfolio.css:79–83`) UNCHANGED as the rest state.
  Immediately after it, add:
  ```css
  /* Accent-underline draw-in — hero highlights only, drawn after the h1 lands (Phase 2, move 2).
     Rest state keeps the border-bottom (above) → zero baseline churn on all 14 .hl instances,
     since the VR gate captures under prefers-reduced-motion: reduce. */
  @media (prefers-reduced-motion: no-preference) {
    .page-hero .hl {
      border-bottom-color: transparent;
      background: linear-gradient(var(--color-accent), var(--color-accent)) 0 calc(100% + 0.12em) / 0% 0.12em no-repeat;
      animation: hl-draw var(--motion-slow) var(--motion-ease-spring) var(--motion-slow) forwards;
    }
  }
  @keyframes hl-draw { to { background-size: 100% 0.12em; } }
  ```
- **PATTERN**: token-only; the `var(--motion-slow)` in the delay slot makes the draw start ≈ when
  the h1 (delay `stagger*1` + duration `slow`) has settled — reuses a token, no literal.
- **GOTCHA**: Scope is `.page-hero .hl` ONLY. Do NOT target bare `.hl` — approach.html has 6 `.hl`
  in body prose (lines 47/134/194/214/279 etc.); those must keep the static border and never draw.
  The gradient's `0.12em` matches the border thickness. Note the background paints in the padding-box
  while the border sits just below it, so the `background-position` is nudged to `calc(100% + 0.12em)`
  to land the drawn underline on the same line as the rest border. There is no per-user jump (each
  user sees only one state — motion users the gradient, reduced-motion + the VR gate the border), but
  eyeball the drawn end state against the static border on one hero and fine-tune the offset if needed.
- **VALIDATE**: `/index.html` (2 `.hl`), `/approach.html` (hero `.hl` draws; the 6 body `.hl` stay
  static) — the hero underline sweeps L→R after the title lands. Reduced-motion emulate → solid
  border, no gradient, identical to today.
- **SATISFIES**: AC #3.

### ADD section-label + grid scroll reveals to `system/components.css` (moves 3 + 4-reveal)

- **IMPLEMENT**: After the `.section-label` block (`components.css:633–654`), add:
  ```css
  /* Scroll-driven reveals — section labels + opt-in card grids (Phase 2, moves 3 + 4).
     Double-gated: no-preference AND @supports. Outside these, content is fully visible
     (Firefox / reduced-motion / the VR gate all see the at-rest state) → zero churn. */
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .section-label .num {
        animation: label-num var(--motion-slow) var(--motion-ease-spring) both;
        animation-timeline: view();
        animation-range: entry 0% cover 18%;
      }
      .section-label .line {
        transform-origin: left center;
        animation: label-line var(--motion-slow) var(--motion-ease-spring) both;
        animation-timeline: view();
        animation-range: entry 0% cover 22%;
      }
      /* Opt-in staggered grid reveal (add class="… stagger" on the grid) */
      .stagger > * {
        animation: card-rise var(--motion-slow) var(--motion-ease-spring) both;
        animation-timeline: view();
        animation-range: entry 2% cover 26%;
      }
      .stagger > :nth-child(3n+2) { animation-range: entry 6% cover 30%; }
      .stagger > :nth-child(3n+3) { animation-range: entry 10% cover 34%; }
    }
  }
  @keyframes label-num  { from { opacity: 0; transform: translateY(calc(var(--motion-rise) / 2)); } to { opacity: 1; transform: none; } }
  @keyframes label-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes card-rise  { from { opacity: 0; translate: 0 var(--motion-rise); } to { opacity: 1; translate: 0 0; } }
  ```
  Then add `stagger` to the class list of the card grids to reveal: `index.html:46`
  (`grid grid-3 mt-xl` → also gets `verify-grid` in Phase 3), `work.html:40`, and
  approach.html's method grid `approach.html:68` (`grid grid-2 mt-2xl stagger`).
- **PATTERN**: `.line` animates `scaleX` (compositor-safe), NOT `width`/`flex` — the existing
  `.line { flex:1; height:1px }` provides the box; the transform scales it.
- **GOTCHA**: (1) **THE ONE GOTCHA** — the `scaleX(0)` / `opacity:0` starts are inside the
  `@supports`+`@media` block only; base `.line` stays full-width, base `.num` visible. (2)
  `.section-label` is shared with index's dark feature-band (`components.css:1332–1334`) — the
  reveal applies there too and is fine (still gated/off at capture). (3) Use `entry`/`cover` ranges,
  not time; per-column stagger via `:nth-child(3n+…)` works for 3-col grids and degrades acceptably
  for the 2-col method grid. (4) **`card-rise` animates the independent `translate` property, NOT
  `transform`** — the 6 Home/Work cards ALSO get the `.card-link:hover` `transform: translateY(-2px)`
  lift (move 4), and a `fill:both` animation on the *same* property overrides the hover transition,
  permanently killing the lift once a card has revealed (a bug invisible to reduced-motion emulation
  AND to the VR gate, which never hovers). `translate` composes with `transform`; its support is a
  superset of `view()`, so the `@supports` gate already covers it. Verify on ONE card (scroll it
  fully in, THEN hover — it must still lift) before propagating.
- **VALIDATE**: `/approach.html` — scroll down; each of the 7 section numerals rises and its
  hairline draws across as the section enters; method cards stagger in. Firefox (no `view()`):
  everything visible, static. Reduced-motion emulate (Chromium): everything visible, static,
  identical to today.
- **SATISFIES**: AC #4, AC #5.

### UPDATE `system/components.css` — retune the card lift to spring (move 4)

- **IMPLEMENT**: In the `.card` transition (`components.css:527`), swap the easing on the
  transform/shadow/border transition from `var(--motion-ease)` to `var(--motion-ease-spring)` (keep
  `var(--motion-base)` duration). Leave `.card-link:hover` (`529–534`) values as-is (the −2px lift +
  `--shadow-md` + `--color-border-strong`).
- **PATTERN**: hover transition, not a keyframe — no gating needed (the global kill-switch zeroes
  transition-duration under reduce; `portfolio.css:21`).
- **GOTCHA**: This easing change touches every `.card` hover site-wide (lp-proof, decision-card,
  etc.) — all hover-only, all invisible to the VR gate. Acceptable and intended (consistent lift
  character). Do not add a spring to `border-color` alone if it looks like a colour wobble — if the
  overshoot reads oddly on colour, scope the spring to `transform`/`box-shadow` and keep
  `border-color` on `--motion-ease`.
- **VALIDATE**: hover any `.card-link` on `/work.html` after the next task — the lift has a subtle
  spring settle, not a linear ease. VR unaffected (no hover at capture).
- **SATISFIES**: AC #6.

### UPDATE `index.html` — 3 verify cards become full-card links (move 4)

- **IMPLEMENT**: For each of the three `<article class="card">` in the "Three ways to verify" grid
  (lines 47/59/71):
  1. Change `<article class="card">` → `<a class="card card-link" href="{foot href}">` and its
     closing `</article>` → `</a>`. Hrefs: card 1 `/factory`, card 2 `/approach#case`, card 3
     `/work` (take each from its current `.card-foot > a` at lines 56/68/79).
  2. Change the foot `<div class="card-foot"><a href="…">See the factory →</a></div>` →
     `<div class="card-foot"><span class="card-foot-link">See the factory →</span></div>` (drop the
     inner href — the card carries it now).
- **PATTERN**: `a { color: inherit; text-decoration: none }` (`components.css:38`) means the `<a>`
  card renders identically to the `<article>` at rest → no churn.
- **GOTCHA**: (1) No nested `<a>` — the foot link MUST become a `<span>`. (2) **The swap is
  pixel-identical, nothing to preserve (verified):** `.card-foot` sets only margin/font
  (`portfolio.css:107–112`); there is NO `.card-foot a` rule and NO bare `a:hover` (every `a:hover`
  is scoped to nav/footer/lp-/cs-jump). So the foot `<a>` today inherits `--color-fg` with zero hover
  state — the `<span class="card-foot-link">` inherits identically and needs NO new CSS (the whole
  `.card-link` supplies `cursor:pointer`). Do not add a speculative colour rule. (3) Keep the
  `.card-body` wrapper and the `.capability` chips unchanged. (4) OPTIONAL polish (not required, not
  churn-affecting): `.card-link:hover .card-foot-link { color: var(--color-accent); }` to give the
  `→` accent feedback on card hover — Active-Grid-friendly, but hover-only so VR-invisible.
- **VALIDATE**: `/index.html` — whole card is clickable + one tab stop; hover lifts with spring;
  keyboard focus shows the card focus ring. `git diff index.html` shows only the wrapper/foot
  changes. Reduced-motion emulate → at-rest identical to today (critical: this must be churn-free).
- **SATISFIES**: AC #6.

### UPDATE `work.html` — 3 exhibit cards become full-card links (move 4)

- **IMPLEMENT**: Same transformation as index, on lines 41/53/66. Hrefs from the foot links
  (lines 50/63/75): `/factory`, `/agentic-ui-study`, `/approach#case`. Foot `<a>` → `<span
  class="card-foot-link">`. Add `stagger` to the grid at line 40.
- **PATTERN / GOTCHA / VALIDATE**: identical to the index task. `/work.html` cards lift + reveal on
  scroll; at-rest unchanged.
- **SATISFIES**: AC #6.

### UPDATE `index.html` + `system/portfolio.css` — Home verify-card glyph + reveal (move 5) — DO LAST

- **IMPLEMENT**:
  1. Add the hook class: `index.html:46` grid → `class="grid grid-3 mt-xl stagger verify-grid"`.
  2. Into each verify card, as the FIRST child of `.card-body` (before `.card-kicker`), inject a
     monochrome inline SVG glyph wrapped in `<span class="verify-glyph" aria-hidden="true">…</span>`:
     - Card 1 (factory): a 3-node flow glyph (`●—●—●` / arrowed) — "pipeline".
     - Card 2 (system): two overlapping token squares swapping — "re-skin swatch".
     - Card 3 (work): a lens/magnifier over a grid — "inspect".
     Keep each ~28–32px, `stroke: currentColor` / `fill: none` or a single muted fill — NO new hue.
  3. Add a hover-revealed proof line as the LAST child of `.card-body`, immediately before
     `.card-foot`: `<p class="verify-proof"><span>{true one-liner}</span></p>` — the inner `<span>`
     is the clip child the `0fr→1fr` reveal needs (see step 4). Copy is a build-time detail (Open
     Questions) — it MUST be literally true (honesty contract). Suggested, verify before shipping:
     card 1 "5 stations · 1 live today", card 2 "1 file swaps every token", card 3 "2 prototypes ·
     1 agentic study".
  4. In `portfolio.css`, add the decided `.verify-grid` styles (concrete pattern — copy, then tune):
     ```css
     .verify-glyph { display: block; width: 32px; height: 32px; margin-bottom: var(--spacing-md);
                     color: var(--color-fg-muted); }
     .verify-glyph svg { width: 100%; height: 100%; display: block; }
     /* Proof line: collapsed at rest (0fr) so the baseline shows ONLY the glyph; surfaced on
        card hover/focus. The grid 0fr→1fr trick needs the inner <span> as the overflow-clipped
        child. transform/opacity/grid-rows only — no layout-thrash property. */
     .verify-proof { margin: 0; display: grid; grid-template-rows: 0fr; opacity: 0;
                     transition: grid-template-rows var(--motion-base) var(--motion-ease-spring),
                                 opacity var(--motion-fast) var(--motion-ease);
                     font-family: var(--font-display); font-size: 13px; letter-spacing: 0.04em;
                     color: var(--color-fg-muted); }
     .verify-proof > span { overflow: hidden; min-height: 0; }
     .card-link:hover .verify-proof,
     .card-link:focus-visible .verify-proof { grid-template-rows: 1fr; opacity: 1; }
     ```
     The glyph may also emphasize on hover (`transform` only). Under `reduce` the global kill-switch
     zeroes the transition; at rest it's collapsed regardless, so VR (which never hovers) sees the
     glyph only.
     - **Active-Grid rule (from the parent plan):** hover SURFACES content (the proof line), it does
       not merely move the card. Satisfied by the reveal above.
- **PATTERN**: monochrome, token-only. The `grid-template-rows: 0fr→1fr` reveal is the decided
  mechanism (cleaner than `max-height`, no magic number); the `<span>` clip child is required for it.
- **GOTCHA**: (1) This is the **only at-rest change** — the resting card now shows a glyph → it WILL
  churn `index-{neutral,saulera}.png`. That is expected and handled in Phase 4. (2) **DECIDED: the
  proof line is collapsed at rest (`grid-template-rows:0fr`, opacity 0), so the baseline delta is the
  GLYPH ONLY** — the reveal is hover-only and VR never hovers, keeping the baseline diff minimal and
  reviewable. (3) `aria-hidden` on the decorative glyphs; the proof line stays in the a11y tree (it's
  real info, and the collapsed `<span>` keeps its text readable to AT). (4) Keep it calm — one glyph,
  one line, no colour fireworks (monochrome, `--color-fg-muted`).
- **VALIDATE**: `/index.html` neutral + saulera (swap the `<head>` token link locally, or trust the
  VR saulera capture) — three cards now visually distinct; hover/focus surfaces the proof line;
  monochrome holds under both packs. Then Phase 4.
- **SATISFIES**: AC #7.

### VERIFY + regenerate baselines (Phase 4) — see VALIDATION COMMANDS §Level 3

- **IMPLEMENT**: Run the two-stage VR sequence. Stage 1 (after all churn-free tasks, BEFORE move 5
  is committed) must be GREEN. Stage 2 (after move 5) must fail on `index` (+ `work` iff parity)
  ONLY; inspect the diff images to confirm the delta is exactly the glyph + at-rest card treatment;
  then regenerate via Docker and commit the new PNGs in the same PR.
- **VALIDATE**: commands below.
- **SATISFIES**: AC #8.

---

## TESTING STRATEGY

This repo has **no unit/integration test suite** (CLAUDE.md §Ground rules: "Testing: no suite, no
linter, no type-check — don't hunt for one. 'Done' = run the surface you touched"). Testing here =
the visual-regression gate + manual surface runs.

### Unit Tests
- N/A. The only automated gate is the Playwright VR suite.

### Integration / Visual Tests
- The 16-baseline VR gate (`tooling/visual-regression`) is the regression net. Run it staged (§Level
  3). The token change (Phase 1), reveals (2A/2C), underline (2B), and links+lift (2D) must leave it
  GREEN; only move 5 regenerates baselines.

### Edge Cases (must be checked manually)
- **Reduced-motion** (DevTools emulate `reduce`): every page renders identically to today — no
  hidden-start-state leak. THE critical check for the baseline-safety claim.
- **No `view()` support** (Firefox, or Chromium with the feature off): section content + card grids
  are fully visible and static; nothing stuck invisible.
- **factory.html hero**: the wizard/embeds are NOT swept into the cascade; sticky/interactive bits
  work; `[data-reskin]`/`[data-trace="ready"]` still set (the VR waitReady selectors).
- **Keyboard**: each converted card is one focusable link with a visible focus ring; the proof-line
  reveal also fires on `:focus-visible`/`:focus-within` (not hover-only).
- **saulera pack**: swap the token link — motion + glyph + underline all inherit; monochrome holds
  (no accent explosion under the warm pack).

---

## VALIDATION COMMANDS

### Level 1: Token generation + discipline
```bash
# Regenerate from source, then prove no drift (exit 0):
node agent-layer/gen-token-css.mjs && node agent-layer/gen-token-css.mjs --check
# The four new tokens are present in the generated fallback layer:
grep -c 'motion-slow\|motion-ease-spring\|motion-rise\|motion-stagger' system/tokens.contract.css   # → 4
# No NEW motion literals in the component layers (durations/easings must be tokens). The ONLY expected
# matches are the two PRE-EXISTING `visibility 0ms linear` toggles in .nav-panel (components.css:379,385) —
# a discrete-visibility timing, not a pace literal. This phase must add ZERO new matches:
grep -nE '[0-9]+ms|cubic-bezier|linear\(' system/components.css system/portfolio.css
```

### Level 2: Manual surface run (serve the static shell)
```bash
npx serve .    # repo root → open the pages below in Chromium + Firefox + Safari
```
- `/index.html` `/approach.html` `/work.html` `/factory.html` `/contact.html` `/404.html`
- Check per §Edge Cases: cascade on load, `.hl` draw (hero only), scroll reveals (approach), card
  lift + full-card link, move-5 glyph/reveal on Home.
- DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → **every page must match
  today's static rendering** (the baseline-safety proof).
- **Live-motion + hover regression (catches the `transform`/`translate` conflict):** with reduced
  motion OFF, scroll a Home/Work `.card-link` FULLY into view (let its reveal finish), THEN hover —
  it MUST still lift. If it doesn't, `card-rise` is animating `transform` and its `fill:both` is
  overriding the hover lift (see the scroll-reveal task's Gotcha #4).

### Level 3: Visual-regression — STAGED (the core gate)
```bash
cd tooling/visual-regression && npm ci    # first run only
# STAGE 1 — after Phase 1 + 2A + 2B + 2C + 2D, BEFORE committing move 5:
npm test        # EXPECT: 16/16 GREEN. Green IS the proof that reveals/lift/underline churned nothing.
# If any page fails here, a hidden start state leaked into a base rule (THE GOTCHA) — fix before proceeding.

# STAGE 2 — after move 5 (Phase 3):
npm test        # EXPECT: index-neutral + index-saulera FAIL (+ work-* iff parity chosen); all others GREEN.
# Inspect tooling/visual-regression/test-results/**/diff.png — confirm the ONLY delta is the glyph +
# at-rest card treatment on Home. If any OTHER page/region differs, investigate before regenerating.

# Regenerate the changed baselines (Docker — local macOS baselines are invalid; memory: VR baseline trap):
npm run update:docker
git add tooling/visual-regression/baselines/index-neutral.png tooling/visual-regression/baselines/index-saulera.png
# (+ work-*.png iff parity) — commit in the SAME PR as the code change.
```

### Level 4: Honesty-contract check (move 5 copy)
- Each `.verify-proof` line is literally true against the current site state (capability chips /
  station counts / exhibit counts). Cross-check the numbers against index.html's existing
  `.capability` labels and factory.html's stations before shipping. A false proof line violates the
  honesty contract (CLAUDE.md, hard).

### Level 5: Diff hygiene
```bash
git diff --stat   # expected surface: tokens.source.json, tokens.contract.css, tokens.neutral.css,
                  # components.css, portfolio.css, index.html, work.html, approach.html (+ 2–4 baseline PNGs).
                  # NOTHING in system/site.js, portfolio.js, factory.html, contact.html, 404.html source.
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — Four motion tokens (`--motion-slow`, `--motion-ease-spring`, `--motion-rise`,
      `--motion-stagger`) exist in `tokens.source.json` (both groups) and the generated CSS;
      `gen-token-css.mjs --check` passes; saulera inherits them with no edit to `tokens.saulera.css`.
- [ ] **AC #2** — Hero intro (`.hero-eyebrow → h1 → .hero-sub → cta/cs-jump`) cascades in on load
      with spring easing on index/approach/work/contact/factory; factory's wizard is NOT swept in.
- [ ] **AC #3** — Hero `.hl` highlights draw their accent underline in after the h1 lands;
      approach's body `.hl` stay static; rest state = today's border.
- [ ] **AC #4** — On scroll, each `.section-label` numeral rises and its `.line` hairline draws
      across as the section enters (highest impact on approach.html's 7 sections).
- [ ] **AC #5** — Opt-in `.stagger` card grids reveal their children with a per-column scroll
      stagger.
- [ ] **AC #6** — The 6 destination cards (3 Home + 3 Work) are full-card links (one tab stop each)
      and lift with spring easing on hover/focus; no nested anchors; at-rest rendering unchanged.
- [ ] **AC #7** — The three Home verify-cards each show a distinct monochrome micro-glyph and
      surface a true one-line proof on hover/focus (Active-Grid rule); calm-colour rule holds under
      neutral + saulera.
- [ ] **AC #8** — VR gate: GREEN after all churn-free work; after move 5, only `index-*`
      (+ `work-*` iff parity) regenerate, the diff is confirmed to be exactly the card treatment,
      and the new baselines are committed in the same PR.
- [ ] **AC #9** — Under `prefers-reduced-motion: reduce` and in browsers without `view()`, every
      page renders fully visible and static — no stuck-invisible content, no layout shift.
- [ ] **AC #10** — No new runtime JS on shipped pages; no NEW motion literals in `components.css`/
      `portfolio.css` (durations/easings/stagger via tokens + `calc()`; the pre-existing `.nav-panel`
      `visibility 0ms linear` toggles are the only allowed matches); only compositor-safe properties
      (`transform`/`translate`/`opacity`/`background-size`) animate.

---

## COMPLETION CHECKLIST

- [ ] Phase 1 tokens added + regenerated + drift-checked; no page pixels changed.
- [ ] Moves 1–4 implemented; DevTools reduced-motion shows each page identical to today.
- [ ] STAGE 1 VR run GREEN (16/16) — churn-free proof.
- [ ] Move 5 implemented; glyphs monochrome under both packs; proof lines verified TRUE.
- [ ] STAGE 2 VR run fails only on index-* (+ work-* iff parity); diff inspected + confirmed.
- [ ] Baselines regenerated via `npm run update:docker` and committed in-PR.
- [ ] `git diff --stat` surface matches Level 5 expectation (no stray files).
- [ ] All 10 ACs met.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved by the user (2026-07-20):** Move 5 distinguishing visual = **monochrome micro-glyph**
(bespoke SVG per card) + hover-revealed proof line. (Chosen over numbered-badge and
accent-intensity.)

**Assumptions (proceed unless flagged):**
1. **Move-5 proof-line COPY** — defaults suggested ("5 stations · 1 live today" / "1 file swaps
   every token" / "2 prototypes · 1 agentic study"). These are placeholders; refine to the exact
   true numbers at build time. If unsure of any count, prefer a qualitative true line over a
   fabricated number (honesty contract).
2. **Home-vs-Work parity for move 5** — DEFAULT: **Home only** (per the parent plan's wording "the
   three *home* cards"). Work's three cards get move 4 (link + lift + reveal) but NOT the glyph.
   Applying glyphs to Work too would churn `work-*` baselines as well (still one regen) and cost
   two more bespoke glyphs — flag to the user if visual parity between the two card sets feels
   required. → **Confirm before Phase 3 if in doubt.**
3. **Spring overshoot is an AESTHETIC knob, not a correctness risk** — the starter `linear()` is a
   valid easing regardless of its overshoot (~1.9%); it cannot fail to implement. If the "calm,
   nothing that tires the eyes" constraint reads it as too springy anywhere (the card lift is the
   most visible), pull the >1.0 samples toward 1.0, or use `--motion-ease` for the lift and reserve
   the spring for entrances. A tuning decision at review time — it does not block the build.
4. **`$type` — RESOLVED (not an assumption).** `gen-token-css.mjs` never reads `$type` (only
   `$value`/`$description`); it cannot throw and does not affect output. The `linear()` string is
   emitted verbatim (`String($value)`). Confirmed by reading the generator (lines 64–69, 110–131).

**Question that would change the plan if answered differently:** none blocking — the one design
fork (move-5 direction) is resolved. Parity (#2) only widens the regen by two files; it does not
restructure the plan.

## NOTES (open canvas)

**Confidence for one-pass implementation: 9.5/10.** The design fork is resolved (micro-glyph); every
edit has a file:line target and concrete CSS/JSON; the one bug that would surface at implementation
(the `transform` reveal-vs-lift conflict) is designed around with a validation step that catches it;
and the two former uncertainties are now closed by reading source, not assumed:
- **DTCG `$type`/`linear()` serialization — verified in `gen-token-css.mjs`:** `$type` is never
  read (can't throw), `$value` is emitted verbatim, so the spring token lands correctly and the
  four tokens are safe in both groups (per-group duplicate guard, 0 pre-existing).
- **The foot-link `<a>`→`<span>` swap — verified pixel-identical:** no `.card-foot a` rule and no
  bare `a:hover` exist, so there is nothing to preserve.
- **Cascade `:nth-child` order — verified on all 6 VR pages** (index/approach/work/factory/contact/404).

The residual 0.5 is genuinely open-by-design, not risk: the move-5 glyph *artwork* is bespoke design
work (three SVGs) the plan can't pre-draw, and the spring overshoot + proof-line copy are review-time
tuning knobs, none of which can cause a one-pass *failure*.

**Why four moves are churn-free and one is not — the whole safety argument in one place.**
The VR gate captures under `reducedMotion:'reduce'` (`playwright.config.mjs:16`) and
`animations:'disabled'`. So:
- Move 1 (cascade) & move 3/4-reveal (scroll) are gated behind `no-preference` → under `reduce`
  they don't exist → elements paint at their at-rest (visible) state → **no churn**.
- Move 2 (underline) keeps its `border-bottom` at rest; the gradient only appears under
  `no-preference` → under `reduce` the gate sees the unchanged border → **no churn on all 14**.
- Move 4 (lift + link) is hover-only (transition) and the `<a>` renders like the `<article>` →
  **no churn**.
- Move 5 changes the *resting* card (a glyph is now painted) → **churn, by design** → the single
  deliberate regen.

**Rejected alternative for move 2** (fold the `.hl` restyle into the regen): the advisor's
zero-churn construction (transparent border under `no-preference`, keep border at rest) is strictly
better — it keeps the baseline diff limited to move 5, which matters because this repo's thesis is
*inspectable proof*: a reviewer opening the baseline commit should see exactly the three-card change
and nothing else.

**Why no JS.** The parent plan and Phase 1 already gave us a `matchMedia` reduce check and header
scroll in `portfolio.js`, but Phase 2's reveals are all declarative (`animation-timeline: view()` +
load keyframes). Adding an IntersectionObserver would be redundant, heavier, and would reintroduce a
JS motion path we'd have to reduced-motion-guard by hand. Declarative CSS is both less code and the
stronger platform-literacy signal (parent plan §Thesis).

**factory.html cascade nuance.** Its `.page-hero` holds `nav.cs-jump` + the intake wizard after the
hero-sub. The scoped `:is(.hero-eyebrow, h1, .hero-sub, .hero-cta-row, .cs-jump)` list animates only
the intro; `:nth-child(n+5)` catches any deeper direct children with a single settle-last delay, but
because the animating property is `transform`, DON'T broaden the selector to a wildcard — a
transformed ancestor becomes a containing block for `position:fixed` descendants and a stacking
context, which would visibly snap the wizard when the animation's `both` fill ends. If a future hero
adds `.hero-grid`, extend the `:is()` list, not a wildcard.

**Sequencing rationale.** Phases 2A–2D are independent and safe to build in any order or in
parallel; the discipline that matters is: **do move 5 LAST and commit its baseline regen as its own
reviewable step.** Stage-1-green is not busywork — it is the empirical proof that the gating pattern
held, i.e. that the #1 gotcha was avoided.

## AMENDMENTS

<!-- Append-only. Newest at the bottom. Empty at creation. -->
