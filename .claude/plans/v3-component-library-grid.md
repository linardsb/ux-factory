# Feature: v3 — Component library grid (live cards) (#79, epic #70 · P3b)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing organisms and tokens. The v3 band vocabulary already exists (#71) and Work is now the proof index (#80) — reuse both verbatim, do not invent parallel classes. Mirror `work.html`'s existing bands and its inline-style precedent (`work.html:19–48`). Mirror `system/wc/demo.html` for how the `vd-*` custom elements mount.

## Feature Description

Present the shipped component library as a **live grid** on `work.html`: one card per real component, each demoing the *actual* shipped component (`vd-*` custom-element wrappers, the `ds-metric-tile` library primitive, and `components.css` primitives) with hover and press interactions. This is the PRD §6.2 "component library presented as a live grid (the Kinetics *presentation model* on our real components)" — we replicate the presentation model (a grid of interactive one-thing cards), never Kinetics' code or motion (no license); all motion is re-derived from this repo's committed spring tokens.

The grid becomes a new `#library` band in `work.html`, slotted into the proof-index narrative between the prototype embeds (`#screens`) and the handoff pack (`#handoff`): *the prototypes you just ran are built from these components — here they are, live and interactive — and here's the pack an engineer receives for them.* #80 deliberately left this hook: "Leave a clean proof-index structure #79 can extend; do not add live hover/press component cards here."

## User Story

As a hiring manager or design-engineer evaluating this portfolio,
I want to touch the candidate's real UI components — hover them, press them, see their states — in one grid,
So that I can judge the craft (custom interactions, reasoned motion, obsessive states, real accessibility) on the actual shipped components rather than reading claims or screenshots.

## Problem Statement

The component library is currently only visible as **static evidence**: the handoff-pack viewer (specs/docs/vocabulary side by side) and the `system/wc/demo.html` sandbox (not in the shipped IA). A design-engineer evaluator — for whom the site itself is the work sample (PRD §2, Cadence rubric) — never gets to *touch* the components. The Kinetics presentation model (one interactive card per component) is the market-standard way to show a component library as a live, judgeable artifact, and it is absent. Work is a proof index with a clean slot for it (#80) but no live grid yet.

## Solution Statement

Add one token-only `#library` band to `work.html`. It renders a responsive grid of ~6 cards, each showcasing a real component:

- Three `vd-*` custom-element wrappers mounted exactly as `wc/demo.html` mounts them (a module `<script>` importing the wrappers; `vd-status-chip` registers transitively).
- The `ds-metric-tile` library primitive (token-only markup, `.ds-metric-tile` class from `components.css`).
- Two `components.css` primitives that carry their own press/hover vocabulary (the `.btn` family; the `.capability` chip / `.card`).

Each card demos **hover** (the card lifts) and **press** (the contained control squishes and releases through the bounce spring). All six interactive states are handled (default · hover · focus-visible · active/press · disabled where applicable · empty/upgrade-fallback). Motion uses existing tokens only — `motion-fast` for hover, `motion-ease-bounce`/`motion-bounce` for the press squish-release, the existing reveal/stagger for entrance — so **no `tokens.source.json` edit and no token-regen cascade**. The card CSS lives **inline in `work.html`'s `<style>` block** (the #80 precedent — single-page layout, not a reused organism), which also keeps #79 off the shared `system/portfolio.css` file (parallel-safety — see Open Questions). The only other touched files are the VR spec (one localized wait added to the `work` entry) and the two `work` baselines (regenerated).

## Out of Scope / Non-Goals

- **Not editing `system/portfolio.css`.** Recommended: card CSS inline in `work.html` for parallel-safety (Open Questions Q1). Issue #79 names portfolio.css as the seam; that issue predates #80 landing the inline precedent.
- **Not adding any new token** (motion, colour, or otherwise). Reuse `motion-fast`, `motion-bounce`, `motion-ease-bounce`, `motion-ease-settle`, existing reveal keyframes. This deliberately avoids the `tokens.source.json` → `gen-token-css` + `gen-handoff` + `gen-system-graph` + `loc-summary` regen cascade — and avoids colliding with #76, which may touch tokens.
- **Not rebuilding, restyling, or re-speccing any component.** The cards *mount* the shipped components as-is. No edits to `system/components.css`, `system/wc/*.mjs`, `system/specs/*`, or the proto components.
- **Not showcasing `fw-*` proto components.** They are scenario-canvas organisms coupled to Fieldwork's page/data context and don't mount cleanly standalone in a card. Keep the set to `vd-*` + `ds-metric-tile` + `components.css` primitives (the issue's "or" — a curated subset satisfies "our real components"). If a fw- card is wanted later, it's a follow-up.
- **Not touching the spine (`index.html`), the dock (`dock.mjs`/pack control), or the instance (`instance.html`/`build-instance.mjs`).** These are the live seams of the parallel tickets #75, #76, #89, #81 — #79 must not touch them.
- **Not adding the grid to any page other than `work.html`.** factory.html was the alternative host; architecture line 68 defaults to `work.html` and P3a has settled.
- **Not editing `tooling/visual-regression/visual.spec.mjs` by default.** The custom-element upgrade is a one-shot that completes in milliseconds and is then static, so Playwright's built-in "two consecutive stable screenshots" stabilization waits it out on its own — no explicit wait needed (unlike `approach`'s *continuous* countUp rAF, which never self-stabilizes; that's the `vr-gate-approach-countup-flake` case, and it does not apply here). Adding a wait here would touch a **shared** file that #75 likely edits (the `index` entry), re-opening the same contamination vector the inline-CSS choice closed. **Only** add the wait if Phase 1 finds a *continuous* at-rest animation in a wrapper (see Q3). Default: no VR-spec edit.
- **Not adding a new page to the VR `PAGES` set.** `work` already exists; nothing about the entry changes on the default path.

## Feature Metadata

**Feature Type**: New Capability (a live, interactive component-library surface)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `work.html` (new `#library` band + inline card CSS + wrapper-mount module) and `tooling/visual-regression/baselines/work-neutral.png` + `work-saulera.png` (regenerated — per-page files no other session touches). **No `visual.spec.mjs` edit on the default path** (see Non-Goals + Q3). Net: `work.html`-only for authored code.
**Dependencies**: #71 (band vocabulary — merged) · #80 (Work as proof index + inline-style precedent — merged, this branch's history) · the shipped `vd-*` wrappers + `ds-metric-tile` (exist). No external libraries.

## Related Work

**Implements**: [#79](https://github.com/linardsb/ux-factory/issues/79) — P3b · Component library grid (live cards) · **Epic**: [#70](https://github.com/linardsb/ux-factory/issues/70), architecture `docs/epics/portfolio-v3-experience.architecture.md`.

**Back-references** (inherits decisions from):

- `docs/epics/portfolio-v3-experience.architecture.md` (line 68) — Why: sets `work.html` as the default library-grid host, "revisit after P3a settles" (P3a/#78 has merged, so `work.html` stands). Lines 44–54: P3 phase scope + the "library-grid card organism with press/hover demos" build-list entry.
- `.claude/plans/v3-approach-tightened-work-proof-index.md` (#80) — Why: rebuilt `work.html` as the proof index; its Non-Goals explicitly reserve the live grid for #79 and its Forward-references name #79 as "extends `work.html` with the live component grid, after this settles." Source of the inline-style precedent and the band vocabulary in use on this page.
- `.claude/plans/v3-spine-skeleton.md` (#71) — Why: defines `.band` / `.beat-head` / `.beat-kicker` / `.beat-title` / `.beat-lead` — the vocabulary the new band reuses.
- `docs/epics/portfolio-v3-experience.prd.md` §6.2 (the live grid), §6.3 (scope-hammer: this is the 2nd cut — keep cleanly separable), §6.4 (craft bar).

**Forward-references**:

- #82 (P4) — full baseline regen + VR re-block at final merge.
- Possible follow-up: promote the card organism to `system/portfolio.css` if #81 (instance spine) wants to reuse it (Open Questions Q1).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `work.html` (whole file, esp. lines 19–48 the inline `<style>` block, 69–207 the existing bands, 220–224 the script tags) — Why: the host. You **add one `<section class="band" id="library">`** between `#screens` (ends line 148) and `#handoff` (starts line 150), add the card CSS to the existing `<style>` block, and add a wrapper-mount `<script type="module">` near the closing scripts. Mirror the exact band structure (`.container` > `.beat-head` > `.beat-head-text` > `.beat-kicker` + `.beat-title`, then `.beat-lead`, then the grid). Note the page already loads `pack-boot.js`, `components.css`, `portfolio.css`, `dock.mjs`.
- `system/wc/demo.html` (lines 60–128) — Why: the **canonical mount pattern** for the `vd-*` wrappers — the exact element markup with attributes (`vd-plant-card name= species= status=`, `vd-status-chip value= label=`, `vd-care-task-row task-id= action= plant-name= status= [checked]`) and the closing `<script type="module">` that does `import "/system/wc/vd-plant-card.mjs"` + `import "/system/wc/vd-care-task-row.mjs"` (status-chip registers transitively; the double import is a guarded no-op). Copy the attribute vocabulary verbatim — do not invent attribute names.
- `system/wc/vd-plant-card.mjs`, `vd-care-task-row.mjs`, `vd-status-chip.mjs` — Why: confirm the observed attributes, the shadow-DOM structure, and that shadow CSS reads **only spec-head tokens** (so the elements re-skin under the pack switcher automatically — a feature to lean into, and the reason the `work-saulera` baseline will show them in saulera colours). Confirm they render a **static, attribute-driven** end state (no rAF/timers) → VR-stable at rest.
- `system/components.css` (lines 1470–1500 the `.ds-metric-tile` block; the `.btn` / `.btn-primary` / `.btn-secondary` blocks; the `.capability` / `.capability.live` block) — Why: the token-only primitives you mount directly with markup + class. `ds-metric-tile` renders `{ label, value, unit?, tone? }` where `tone ∈ neutral|warn|critical`; it "displays, does not judge." Read the exact class names and required child structure before writing markup.
- `system/portfolio.css` (lines 141–195 the `.card` / `.card-link` / `.card-kicker` / `.card-foot` organisms; 598–620 `.capability`; 997–1043 `.band` / `.beat-*`; the `@keyframes` for reveals) — Why: **READ to mirror, DO NOT edit.** The new inline card CSS should visually rhyme with `.card` (radius/border/padding/lift) without redeclaring it. Confirms `.beat-numeral` is spine-only (supporting-page bands omit it).
- `system/tokens.source.json` (lines 65–79 the motion group) — Why: the motion tokens you reuse. Key: `motion-fast` 160ms (hover), `motion-bounce` 300ms + `motion-ease-bounce` (~13% overshoot, **"things you touch, never entrances"** — the press squish-release), `motion-ease-settle` (things that arrive), `motion-ease-spring` (~2% entrance). **READ, do not edit.**
- `system/motion.mjs` — Why: `still()` (the reduced-motion + capability guard) and the `countUp`/`countUpOnVisible` helpers, in case a metric-tile card wants a measured value revealed honestly (optional — a static string is fine and simpler).
- `.claude/skills/portfolio-design/references/CRAFT.md` — Why: numeric craft rules. Especially Motion (character rule: bounce only on touch, settle on arrive, spring on entrance; ease-out never ease-in; compositor props only, never `transition: all`; entrances only under `no-preference`, end at true rest; never entrance-animate nodes rebuilt each input tick), Interactive states (all six; hit area ≥44×44 touch / ≥24 min; press squish; hover adds never removes info; no hover-only content), Spacing (`min-width:0` + own `overflow-x:auto` on grid items with wide content — the PR #54 blowout trap), Colour (every colour a token).
- `.claude/skills/portfolio-design/references/CHECKLIST.md` — Why: the MUST/SHOULD/NEVER gate to run before committing.
- `docs/epics/portfolio-v3-experience.architecture.md` (line 68 host decision; lines 44–54 P3 scope; the D11 VR-freeze section) — Why: host confirmation; VR is frozen non-blocking on `feature/v3-*` branches (regen at milestones, #82 re-blocks).

### New Files to Create

- None. All work edits `work.html` + the VR spec + regenerated baselines. (This plan file is the only new authored artifact.)

### Relevant Documentation

- `system/specs/metric-tile.md` — the `ds-metric-tile` contract (props, tones, "displays not judges"). Read before writing metric-tile markup.
- `system/wc/README.md` — the wrapper conventions (spec-first, shadow CSS reads only spec-head tokens).

### Patterns to Follow

**Supporting-page band** (from `work.html:150–167`, no numeral):

```html
<section class="band" id="library">
  <div class="container">
    <div class="beat-head">
      <div class="beat-head-text">
        <p class="beat-kicker">The components</p>
        <h2 class="beat-title">The library, live. Touch anything.</h2>
      </div>
    </div>
    <p class="beat-lead">
      Every prototype above is built from these. They render from the same token
      contract as this page — switch the pack and they re-skin with it.
    </p>
    <ul class="lib-grid stagger" data-lib>
      <!-- one <li class="lib-card"> per component -->
    </ul>
  </div>
</section>
```

**vd- wrapper mount** (from `wc/demo.html:124–128`) — a module script; status-chip is transitive:

```html
<script type="module">
  import "/system/wc/vd-plant-card.mjs";
  import "/system/wc/vd-care-task-row.mjs";
  // vd-status-chip registers transitively — both parents import it; the guard makes the double import a no-op.
  Promise.all([
    customElements.whenDefined("vd-plant-card"),
    customElements.whenDefined("vd-care-task-row"),
    customElements.whenDefined("vd-status-chip"),
  ]).then(() => document.querySelector("[data-lib]")?.setAttribute("data-lib", "ready"));
</script>
```

**Press squish (token-bound, touch-only bounce)** — the one motion signature of this band, on the pressable control inside each card:

```css
/* hover: card lifts (compositor props, listed explicitly, micro duration).
   For the lift's shadow: use the SAME mechanism .card/.card-link already use
   (mirror system/portfolio.css:141–195 — grep its box-shadow / shadow token in
   Phase 1). Do NOT invent a shadow value or ship an rgb()/hex literal — the AC
   forbids raw colour. If no shadow token exists, lift with transform alone. */
.lib-card { transition: transform var(--motion-fast) var(--motion-ease), box-shadow var(--motion-fast) var(--motion-ease); }
.lib-card:hover { transform: translateY(-4px); /* + the same shadow token .card-link uses on hover, if any */ }
/* press: squish in on :active, release through the touch bounce */
.lib-press:active { transform: scale(0.96); transition: transform var(--motion-fast) var(--motion-ease); }
.lib-press { transition: transform var(--motion-bounce) var(--motion-ease-bounce); }
/* focus honesty: a visible ring that never hides under sticky chrome */
.lib-press:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
```

**Entrance (spring, gated, ends at rest)** — reuse the page's existing `.stagger` reveal. `.stagger` is **already live on `work.html:81`** (the `#run` band) with a passing committed baseline, so it is proven VR-safe to reuse verbatim on the `.lib-grid` — no new entrance, no new guard needed. Entrances run only under `prefers-reduced-motion: no-preference`; the at-rest final state is what VR captures.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 4 (VR) **depends on** Phases 1–3 being visually final (at-rest markup frozen). Independent of the parallel tickets #75/#76/#89 by construction (touches only `work.html` + the `work` VR entry/baselines).

### Phase 1: Curate the component set + confirm mount contracts

**Tasks:**

- Read the three `vd-*` wrapper sources + `demo.html` to lock the exact attribute vocabulary and confirm static-at-rest rendering.
- Read `ds-metric-tile` + `.btn` + `.capability` in `components.css` to lock markup/classes.
- **Grep the shadow token used for card lift** (`grep -nE "box-shadow|--shadow|--elevation" system/portfolio.css` on the `.card`/`.card-link` blocks) so the `.lib-card` hover reuses the real token — NOT a hand-authored `rgb()`/hex literal (AC forbids raw colour). If no shadow token exists, lift with `transform` alone.
- **Confirm each `vd-*` wrapper is static at rest** (no rAF/setInterval/idle animation) — this is what lets Phase 4 skip the `visual.spec.mjs` wait (Q3). If any has a continuous animation, note it and gate it behind reduced-motion (or add the wait).
- Fix the final card list (recommended six): (1) `vd-plant-card`, (2) `vd-status-chip` (its ok/due/overdue states shown together), (3) `vd-care-task-row` (checkable — the press demo), (4) `ds-metric-tile` (the cross-scenario primitive, shown across its tones), (5) `.btn` family (primary + secondary, the squish vocabulary), (6) `.capability` chip (`live`/plan-gated states). Each card = a component name/kicker + one or a few live instances + an interaction.

### Phase 2: Build the `#library` band markup in `work.html`

**Depends on:** Phase 1 (the confirmed attribute/class vocabulary).

**Tasks:**

- Insert the `<section class="band" id="library">` between `#screens` and `#handoff`.
- Author the `.lib-grid` > `.lib-card` markup for each curated component, using verbatim attribute/class vocabulary. Each card: a `.lib-card-kicker` (the real component name, recognition-over-recall), the live demo mount, and (where the demo isn't self-evident) a one-line honest caption of what runs.
- Add the wrapper-mount `<script type="module">` (with the `data-lib="ready"` flag) near the existing end-of-body scripts.
- Add `#library { scroll-margin-top: 96px; }` beside the existing `#screens, #handoff` rule (deep-link/keyboard-focus lands below the sticky header).

### Phase 3: Inline card CSS + all six interactive states

**Depends on:** Phase 2 (markup exists to style).

**Tasks:**

- Add `.lib-grid` (responsive `grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr))` or similar; gap from spacing tokens; `list-style:none; margin:0; padding:0`) and `.lib-card` (token bg/border/radius/padding, rhyming with `.card`) to `work.html`'s `<style>` block.
- `min-width: 0` on `.lib-card` (and any inner wide-content wrapper) — the PR #54 grid-blowout trap.
- Implement the six states: default · hover (lift, `motion-fast`) · focus-visible (ring, offset, never under chrome) · active/press (squish → `motion-ease-bounce`/`motion-bounce` release on `.lib-press` controls) · disabled (where a demoed control has one) · **empty/upgrade-fallback** (an `:not([data-lib="ready"])` or `:defined`-based fallback so a card reads sensibly if a custom element never upgrades — e.g. a token-styled placeholder, never a blank box).
- Verify colour: every value a token; contrast ≥4.5:1 body / ≥3:1 UI-borders; 60/30/10 (accent budget = the one blue + the demoed components' own tokens). No raw hex.
- Motion discipline: compositor props only, explicit property lists, no `transition: all`; entrances gated under `no-preference` ending at true rest; bounce fires only on touch/press, never on load.

### Phase 4: VR baselines + cross-engine check

**Depends on:** Phases 1–3 (at-rest markup final).

**Tasks:**

- **No `visual.spec.mjs` edit** (default path — see Non-Goals). The `data-lib="ready"` flag still helps as a live-surface / devtools signal, but the VR run relies on Playwright's built-in screenshot stabilization for the one-shot upgrade. (Only if Phase 1 finds a continuous at-rest wrapper animation: add a `#library[data-lib="ready"]` wait to the `work` entry, keeping the existing embed mask — and then coordinate the shared-file edit per Q3.)
- **First confirm the VR tree is readable/writable in the impl environment** (this planning session hit intermittent `EPERM`/`com.apple.provenance` locks on `system/` + `tooling/` files — likely a concurrent parallel session). If the VR tree is locked at implementation time, surface it before committing to the regen rather than discovering it at commit.
- Regenerate the `work` baselines (neutral + saulera): `cd tooling/visual-regression && npm run update:docker`. If a baseline's only diff is sub-perceptual it may not rewrite — `rm` the PNG to force it (recorded trap).
- Cross-engine functional check (the Chromium-only VR gate misses real Safari/Chrome grid blowouts): serve the repo and eyeball `work.html`'s `#library` band in real Chrome + Safari + Firefox — grid does not blow out, hover/press/focus feel right, elements re-skin under the dock pack switcher.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom.

### READ system/wc/vd-plant-card.mjs, vd-care-task-row.mjs, vd-status-chip.mjs, system/wc/demo.html

- **IMPLEMENT**: Confirm the observed attributes for each element, that they render static at rest (no rAF/timers), and the module import + transitive-registration pattern.
- **PATTERN**: `system/wc/demo.html:60–128`.
- **GOTCHA**: Shadow CSS reads only spec-head tokens — do NOT try to style inside the shadow root from `work.html`; the elements re-skin via the token contract on their own.
- **VALIDATE**: `grep -nE "observedAttributes|customElements.define" system/wc/vd-*.mjs` shows each element's attribute list + a guarded define.
- **SATISFIES**: AC "each card demos a real component with the correct vocabulary."

### READ system/components.css (.ds-metric-tile, .btn*, .capability), system/specs/metric-tile.md

- **IMPLEMENT**: Lock the token-only markup for `ds-metric-tile` (`{label,value,unit?,tone?}`, tone ∈ neutral|warn|critical), `.btn`/`.btn-primary`/`.btn-secondary`, `.capability`/`.capability.live`.
- **PATTERN**: `system/components.css:1470–1500`.
- **GOTCHA**: metric-tile "displays, does not judge" — tone is emphasis, never a verdict the label doesn't state. Value is a string.
- **VALIDATE**: `grep -nE "\.ds-metric-tile|\.ds-metric-" system/components.css` confirms the child class names.
- **SATISFIES**: AC "token-only card organism; real components."

### UPDATE work.html — add the `#library` band markup

- **IMPLEMENT**: Insert `<section class="band" id="library">` (kicker + title + lead + `<ul class="lib-grid stagger" data-lib>`) between `#screens` (line 148) and `#handoff` (line 150). One `<li class="lib-card">` per curated component with verbatim attribute/class vocabulary and an honest per-card label. Add `.lib-press` to the pressable control in each card.
- **PATTERN**: band structure `work.html:150–167`; card kicker/foot rhyme with `work.html:82–105`.
- **IMPORTS**: none in markup; the wrapper module import is a separate task.
- **GOTCHA**: Do NOT add `.beat-numeral` (spine-only). Keep the `.beat-lead` measure ≤ ~60–75ch. Copy vd- attributes exactly from demo.html.
- **VALIDATE**: `grep -nE "id=\"library\"|lib-grid|lib-card|vd-plant-card|ds-metric-tile" work.html` shows the band + every card.
- **SATISFIES**: AC "a grid of cards, each demoing a real component."

### ADD work.html — wrapper-mount module + `data-lib=ready` flag

- **IMPLEMENT**: Add `<script type="module">` near the end-of-body scripts importing `vd-plant-card.mjs` + `vd-care-task-row.mjs`, then `Promise.all(whenDefined…).then(set data-lib="ready")`.
- **PATTERN**: `wc/demo.html:124–128` + the ready-flag idiom (mirrors `approach`'s `#asrc[data-asrc="ready"]`).
- **GOTCHA**: Module scripts are deferred — fine. status-chip must NOT be imported directly (transitive; the guard makes a direct import harmless but the demo pattern omits it).
- **VALIDATE**: Serve the repo (`npx serve .`), open `/work.html`, confirm no console errors and the `vd-*` elements render; `document.querySelector('[data-lib]').dataset.lib === 'ready'` in devtools.
- **SATISFIES**: AC "hover + press interactions on real components" (elements must upgrade) + VR readiness.

### ADD work.html `<style>` — `.lib-grid` + `.lib-card` + six states

- **IMPLEMENT**: Grid (`auto-fill minmax`, token gap), card (token bg/border/radius/padding, `min-width:0`), and default/hover/focus-visible/active/disabled/empty-fallback states per the Patterns block. Hover = `motion-fast` lift; press = `motion-ease-bounce`/`motion-bounce` squish-release on `.lib-press`.
- **PATTERN**: the "Press squish" CSS block above; visual rhyme with `system/portfolio.css:141–195` (read, don't edit).
- **GOTCHA**: `transition:` must list properties (`transform`, `box-shadow`) — never `all`. Bounce never on load. Every colour/shadow is a token; if no shadow token exists, lift with `transform` alone — do NOT hand-author an `rgb()`/hex shadow. Entrance under `no-preference` only, ending at rest.
- **VALIDATE**: `grep -nE "\.lib-grid|\.lib-card|:hover|:active|:focus-visible|min-width: 0|transition:" work.html` shows all states and no `transition: all`.
- **SATISFIES**: AC "empty/hover/press/focus states obsessively handled (Cadence rubric)" + "motion re-derived from our tokens."

### UPDATE work.html — `#library` scroll-margin

- **IMPLEMENT**: Add `#library` to the existing `#screens, #handoff { scroll-margin-top: 96px; }` rule (or a sibling rule).
- **PATTERN**: `work.html:30`.
- **VALIDATE**: `grep -n "scroll-margin-top" work.html` includes `#library`.
- **SATISFIES**: accessibility — deep-linked/focused band never hidden under the sticky header.

### (CONDITIONAL — skip by default) tooling/visual-regression/visual.spec.mjs

- **IMPLEMENT**: **Skip this task** unless Phase 1 found a *continuous* at-rest animation in a `vd-*` wrapper. Default: no edit — Playwright's two-stable-screenshots stabilization handles the one-shot upgrade. If needed: add a `#library[data-lib="ready"]` wait to the `work` entry only, keeping the existing embed mask.
- **PATTERN**: the `approach` entry's `#asrc[data-asrc="ready"]` wait (per #80 plan). Open the file first — it was `EPERM`/provenance-locked in this planning shell; confirm you can read it and the exact object key before editing.
- **GOTCHA**: This is a **shared** file #75 likely edits (the `index` entry); in a shared working dir, `git add` stages its whole content including #75's uncommitted work. This is the very contamination vector the inline-CSS choice avoided — only pay it if genuinely required, and if so coordinate merge order with #75.
- **VALIDATE**: default path — `git status` shows `visual.spec.mjs` **unchanged**.
- **SATISFIES**: parallel-safety (work.html-only) by *not* editing this file.

### REGEN tooling/visual-regression/baselines/work-neutral.png + work-saulera.png

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker` (Linux baselines — local macOS render differs, so Docker is mandatory). If a PNG doesn't rewrite and you expected it to, `rm` it and re-run.
- **PATTERN**: visual-regression-baseline-trap + vr-update-skips-subperceptual memories.
- **GOTCHA**: The saulera baseline will show the `vd-*` elements + tiles in saulera colours (they re-skin via the contract) — that's correct, not a regression. VR is frozen non-blocking on this branch (D11); regen anyway so #82's re-block is clean.
- **VALIDATE**: `git status` shows exactly `work-neutral.png` + `work-saulera.png` changed under `baselines/` (no other page's baseline moved).
- **SATISFIES**: AC "host VR baseline updated."

### VALIDATE — cross-engine + checklist

- **IMPLEMENT**: Serve the repo; eyeball `/work.html` `#library` in real Chrome + Safari + Firefox (Playwright webkit = Safari; python serves `.mjs` as text/javascript — cross-engine-motion-verify memory). Run `.claude/skills/portfolio-design/references/CHECKLIST.md`. Humanizer pass on the band copy.
- **GOTCHA**: The Chromium-only VR gate missed a real grid blowout before (PR #54) — the `min-width:0` + real-browser eyeball is the guard, not the gate.
- **VALIDATE**: No dropped frames on hover/press; grid holds at 360px; focus rings visible and never under chrome; pack switcher re-skins the cards.
- **SATISFIES**: craft bar §6.4 (Cadence 6/6, Vercel DE interaction QA).

---

## TESTING STRATEGY

No unit-test suite exists (CLAUDE.md: "Done = run the surface you touched"). Validation is surface-driven.

### Unit Tests
- N/A (vanilla shipped page, no test framework). Do not invent one.

### Integration / surface tests
- The page renders under the neutral pack with no console errors; `vd-*` elements upgrade (`[data-lib="ready"]`).
- The dock pack switcher (neutral ↔ saulera ↔ verdant) re-skins the library cards.
- The Docker VR run passes for `work` after baseline regen (or is non-blocking under D11 but visually correct).

### Edge Cases
- **Custom element never upgrades** (module blocked/errors): the empty/`:not(:defined)` fallback renders a sensible token-styled placeholder, not a blank card.
- **Reduced motion**: no entrance animation; at-rest final state shown instantly; hover/press still give a discrete (non-animated) affordance.
- **360px width**: grid collapses to one column, no horizontal page scroll (cards `min-width:0`).
- **Keyboard**: every pressable card control is tabbable, focus-visible ring shows above the sticky header.
- **Touch**: hit areas ≥44×44; no hover-only information.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `grep -nE "transition: all|#[0-9a-fA-F]{3,6}|rgba?\(" work.html` → **no new matches** in the added CSS (no `transition:all`, no raw hex, **and no `rgb()`/`rgba()` literal** — the hex-only check has a hole exactly where a speculative shadow fallback would sit, so catch `rgb(` too). Every colour/shadow must be a token.
- `node -e "1"` (sanity; no lint/type tooling in this repo — do not hunt for one).

### Level 2: Structure
- `grep -nE "id=\"library\"|lib-grid|lib-card|data-lib" work.html` → band, grid, cards, ready-flag present.
- `grep -nE "vd-plant-card|vd-care-task-row|ds-metric-tile" work.html` → the curated real components mounted.

### Level 3: Live surface
- `npx serve .` → open `http://localhost:3000/work.html`: no console errors; `vd-*` render; `document.querySelector('[data-lib]').dataset.lib==='ready'`.
- Toggle the dock pack → cards re-skin.

### Level 4: Visual regression
- `cd tooling/visual-regression && npm run update:docker` → `work-neutral.png` + `work-saulera.png` regenerate; `git status` shows only those two baselines changed.
- `gh pr checks` after push (local Docker pass ≠ CI green — vr-gate-approach-countup-flake memory).

### Level 5: Cross-engine (the gate's blindspot)
- Real Chrome + Safari + Firefox eyeball of `#library` (grid, hover/press/focus, re-skin). Run `.claude/skills/portfolio-design/references/CHECKLIST.md`.

---

## ACCEPTANCE CRITERIA

- [ ] A grid of cards on `work.html`, each demoing a real component (`vd-*` wrappers / `ds-metric-tile` / `components.css` primitives) with hover + press interactions. (issue AC 1)
- [ ] Motion re-derived from this repo's tokens (`motion-fast`, `motion-bounce`, `motion-ease-bounce`), no Kinetics copy, no new token. (issue AC 2)
- [ ] Card organism is token-only; default/hover/press/focus/empty(upgrade-fallback)/disabled states handled (Cadence rubric). (issue AC 3)
- [ ] Craft bar §6.4: Cadence 6/6 self-audit, Vercel DE interaction QA (no dropped frames, real Safari+Chrome+Firefox check), `min-width:0` on grid children. (issue AC 4)
- [ ] `#library` deep-link/focus lands below the sticky header (`scroll-margin-top`).
- [ ] `work-neutral` + `work-saulera` baselines regenerated; no other page's baseline moved; `visual.spec.mjs` **unchanged** (default path).
- [ ] No edits to `index.html`, `system/dock.mjs`, `instance.html`, `build-instance.mjs`, `system/portfolio.css`, `system/components.css`, `system/wc/*`, `system/specs/*`, `tokens.source.json`, or `tooling/visual-regression/visual.spec.mjs` (parallel-safety + non-goals) — authored code is `work.html`-only.
- [ ] Copy passes the humanizer rules; every colour is a token; no `transition: all`, no raw hex.
- [ ] No regressions: other `work.html` bands render unchanged; the page boots with no console errors under the neutral pack.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each validated immediately.
- [ ] Live surface confirmed (elements upgrade, pack switcher re-skins).
- [ ] Docker VR baselines regenerated (neutral + saulera), only `work` moved.
- [ ] Cross-engine eyeball passed (Chrome/Safari/Firefox), CHECKLIST run.
- [ ] Acceptance criteria all met.
- [ ] Only `work.html` + the two `work` baselines changed (default path — `visual.spec.mjs` untouched) — verified via `git status` before commit.
- [ ] Branch `feature/v3-library-grid`; verify branch right before staging (shared worktree); commit references `#79`.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — Card CSS location: inline in `work.html` (recommended) vs `system/portfolio.css` (issue seam).**
The issue names `system/portfolio.css` (+card organism). This plan **recommends inline in `work.html`'s `<style>` block instead**, for two reasons: (a) **parallel-safety** — the parallel tickets #76 (pack control; the dock keyframes `dock-panel-in`/`ruler-fill` live in portfolio.css) and possibly #75 edit portfolio.css, and these sessions share one working directory, so `git add system/portfolio.css` would stage their uncommitted work; (b) **precedent** — #80 landed the exact inline justification on this same page ("single-page layout, not a reused organism → deliberately inline", `work.html:19–48`), and the grid lives only on `work.html`. The issue predates #80's inline precedent. **If** the card organism is wanted in `portfolio.css` for #81 (instance spine) to reuse, that's a deliberate override — flag to the owner before choosing, and if chosen, sequence #79 to commit its portfolio.css change in isolation (temp worktree / after #76 lands) to avoid cross-contamination. **Default for this plan: inline.**

**Q2 — Component set (6 recommended).** Assumes `vd-plant-card`, `vd-status-chip`, `vd-care-task-row`, `ds-metric-tile`, `.btn` family, `.capability` chip. If the owner wants a different or larger set (e.g. include `stat-tile`, `screen-header`, `primary-button` spec'd components), it's additive markup — no structural change. `fw-*` proto components are excluded (don't mount standalone cleanly); revisit as a follow-up if wanted.

**Q3 — VR spec edit is dropped by default (resolved).** Earlier drafting modeled a `#library[data-lib="ready"]` wait on `approach`'s `#asrc[data-asrc="ready"]`. On reflection those cases differ: approach's countUp is a **continuous** rAF that never self-stabilizes (the `vr-gate-approach-countup-flake` reason for its wait); a custom-element upgrade is a **one-shot** that Playwright's built-in two-stable-screenshots stabilization already waits out. So the wait buys nothing and would touch a **shared** file #75 likely edits (its `index` entry) — re-opening the exact contamination vector the inline-CSS choice closed. **Default: no `visual.spec.mjs` edit.** The one condition to revisit: Phase 1 finds a *continuous* at-rest animation in a wrapper — Q4 assumes there is none; confirm it. (Also: the file was `EPERM`-locked in this planning shell — an unread, unnecessary edit is doubly worth avoiding.)

**Q4 — Assumption: `vd-*` elements are static at rest.** The plan assumes attribute-driven render with no rAF/timers (→ VR-stable). Confirmed by reading the wrappers in Phase 1; if any has an idle animation, gate it behind reduced-motion so the at-rest baseline is stable (vr-gate-captures-no-preference memory).

## NOTES (open canvas)

**Why this ticket is the safe parallel pick.** The user needs one runnable alongside #75 (built-screen peak → `index.html` + `spine.mjs`), #76 (pack control → `dock.mjs` + portfolio.css dock CSS), and #89 (instance floor → `build-instance.mjs` + `instance.html`). Of the open tickets: #77 collides with #75 on `index.html`/`spine.mjs`; #81 collides with #89 on `instance.html`; #82 is the final integration. **#79, scoped to `work.html` only (Q1 inline decision), collides with none of them** — that scoping is the whole point of the inline-CSS choice.

**Narrative placement.** `#run` (drive the demos) → `#screens` (the prototypes) → **`#library` (the components those prototypes are made of, live)** → `#handoff` (the pack an engineer receives for them) → `#more`. The grid earns its place: it's the bridge from "here's what it does" to "here's what an engineer gets."

**Re-skin is a free demo.** Because the `vd-*` shadow CSS and `ds-metric-tile` read only the token contract, the library cards re-skin under the dock's pack switcher with zero extra code — the same one-line-CSS re-skin claim the whole site makes, now demonstrated on interactive components the reader is touching. Lean into it in the band lead copy ("switch the pack and they re-skin with it").

**The one authored moment.** CRAFT says one motion signature per surface. On this band it's the **press squish-release** (`motion-ease-bounce`) — the "things you touch" spring. Hover lift stays a quiet `motion-fast`; entrance stays the page's existing reveal. Don't scatter three springs; make the press the memorable one.

**Kinetics honesty.** We take the *presentation model* (one interactive card per component) — a well-known pattern, not copyrightable — and nothing else. All motion values come from our committed tokens. State this reasoning in the PR body so the "not copied from Kinetics (no license)" repo trap is visibly honored.

## AMENDMENTS

- (none — created 2026-07-24)
