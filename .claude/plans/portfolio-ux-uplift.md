# Portfolio UX Uplift — Motion & Excitement Plan

> Status: phases 0–1 implemented on `feature/portfolio-motion-phase01` (2026-07-19);
> phases 2–4 proposed. Research-backed plan to take the shipped IA pages from
> "austere and inert" to "high-craft and alive" without breaking any repo constraint
> (vanilla pages, token-only components, honesty contract, visual-regression gate).
>
> User constraint (2026-07-19): colours must stay calm — nothing flashy, nothing that
> tires the eyes. Excitement comes from motion and craft, not from louder colour.

## Diagnosis (from the code audit)

The site's aesthetic is credible but motionless. The complete motion inventory today:
one pulsing 8px dot (`breathe` keyframe), hover transitions on buttons/nav/linked cards,
and the hamburger morph. Concretely:

- **No motion tokens.** Every duration/easing is a hard-coded literal in `components.css`.
  Motion is not part of the design contract, so it can't be themed like color/space/type.
- **No entrance, reveal, or page-transition motion anywhere.** Pages paint all-at-once;
  navigation is a hard full reload.
- **Most cards don't respond to hover** — home/work cards are plain `.card`, not `.card-link`,
  so the existing lift transition never fires on the pages that matter most.
- **The flagship moment is a hard cut.** The factory's live re-skin (`factory-intake.mjs`)
  swaps token custom properties instantly — the site's core proof ("watch it re-skin")
  doesn't visibly *happen*.
- Header never reacts to scroll; active-nav underline is static; accordions snap open.

## Thesis (why this plan is on-brand, not decoration)

Three findings converge:

1. **The portfolio IS the case study.** Recruiter research is unanimous: for UX-engineer
   roles, interaction quality on the portfolio itself is the strongest craft signal —
   sloppy micro-interactions undercut every claim on the site.
2. **2026's "correct" motion stack is platform-native.** Scroll-driven animations,
   cross-document View Transitions, `@starting-style`, `linear()` spring easing — all
   pure CSS, zero dependencies. Using a 40kb animation library for a fade-in now reads
   as a junior tell. This repo's "vanilla, no build" constraint is an *advantage*: the
   implementation itself demonstrates platform literacy.
3. **Motion should join the token contract.** The uxdesign.cc 2026 trends piece names
   "Machine Experience design" — semantic tokens, agent-legible components — which is
   this repo's existing thesis. Extending `tokens.source.json` with a motion group means
   a company pack can re-skin *how the site moves*, not just how it looks. That is a
   genuinely novel exhibit no template portfolio has.

Anti-trends to stay away from (research consensus): scroll-jacking, multi-layer parallax,
autoplay video, splash/loader theatre, blur-everything glassmorphism, decoration-only
hover. The plan below uses none of them.

## Browser-support verdicts used below

| Feature | Verdict | Fallback |
|---|---|---|
| `@view-transition` (cross-doc MPA) | ENHANCE — Chrome 126+, Safari 18.2+; Firefox = normal nav | silent no-op |
| `animation-timeline: view()/scroll()` | ENHANCE — Chrome 115+, Safari 26; Firefox flag | `@supports` wrap, content visible by default |
| `@starting-style` + `allow-discrete` | SAFE (popover-close in Safari: instant) | instant show/hide |
| `position: sticky` + scroll-snap | SAFE | none needed |
| `linear()` spring easing | SAFE | default curve |
| Speculation Rules prefetch | ENHANCE — Chromium; others ignore the block | silently ignored |
| `text-wrap: balance` / `clamp()` | SAFE (already in use) | — |
| `prefers-reduced-motion` | MANDATORY — global kill-switch already exists (`portfolio.css:16-23`) | — |

## The plan — five phases, each an independently shippable PR

### Phase 0 — Motion joins the token contract (foundation, do first)

Add a `motion` group to `system/tokens.source.json` (contract + neutral values), regenerate
via `node agent-layer/gen-token-css.mjs`:

- Durations: `--motion-duration-fast` 160ms · `-base` 240ms · `-slow` 480ms
- Easings: `--motion-ease-standard` (cubic-bezier), `--motion-ease-spring`
  (baked `linear()` spring curve), `--motion-ease-exit`
- Optional distances: `--motion-rise` (reveal translate offset, e.g. 24px)

Then sweep `components.css`/`portfolio.css` literals (160/180/200/220ms ease) onto the
tokens. Zero visual change → **zero baseline churn**. Company packs can now retune motion
(e.g. saulera slower/warmer) — document this in the pack the same way color is documented.

- Effort: S. Risk: none. Verify: `gen-token-css.mjs --check` passes, pages render identically.

### Phase 1 — Navigation feels like an app (biggest perceived-quality jump per line of code)

1. **Cross-document View Transitions**: `@view-transition { navigation: auto }` +
   `view-transition-name` on the injected header (persists across navigations, everything
   else crossfades under it) and on each page's `h1` (title morphs between pages).
   ~15 lines of CSS, no JS. Firefox degrades to today's behavior.
2. **Speculation Rules prefetch** (`eagerness: moderate`, same-origin pages): subsequent
   navigations become near-instant in Chromium. One declarative `<script type=speculationrules>`
   block injected by `site.js`. Note: prefetch fires real requests — confirm it doesn't
   pollute CF Web Analytics pageviews before enabling (prefetch ≠ pageview in CF WA, but verify).
3. **Header scroll state**: add `.is-scrolled` (tiny `site.js` scroll check or a
   `scroll()`-timeline animation) → slightly stronger border/shadow + optional 4px compaction.
4. **Animated active-nav underline** and nav-link hover underline slide using the new
   motion tokens.

- Effort: M. Baseline risk: none at rest (VT/prefetch don't alter at-rest rendering;
  header at scroll-top is unchanged). Verify: click through all five pages in Chrome
  and Safari — transitions run; Firefox — plain nav, nothing broken.

### Phase 2 — Life on every page (reveals + micro-interactions)

1. **Hero entrance cascade**: `.hero-eyebrow → h1 → .hero-sub → .hero-cta-row` stagger
   (fade + 12–24px rise) on load via plain keyframes with `animation-delay` steps, spring
   easing. Playwright fast-forwards finite animations to their end state, so committed
   baselines are safe.
2. **`.hl` accent underline draw-in** after the h1 lands (animated `background-size` on a
   linear-gradient underline).
3. **Scroll reveals on sections**: `animation-timeline: view()` inside
   `@supports (animation-timeline: view())` AND `@media (prefers-reduced-motion: no-preference)`
   — content stays visible-by-default outside those blocks (no stuck-invisible risk in
   Firefox or for reduced-motion users). Section-label numeral + `.line` hairline "draws"
   across as each section enters. Highest impact on `approach.html` (7 uniform sections).
   *Visual-regression note:* the VR spec must force reduced-motion emulation at capture
   (or the existing kill-switch handles it) so `view()`-gated states never leak into baselines.
4. **Cards respond everywhere**: make home/work cards fully linked (`.card-link`) so the
   existing lift finally fires; retune lift to spring easing; add stagger to grid reveals.
5. **Differentiate the three "ways to verify" home cards**: the emotional core of the pitch
   currently reads as a spec sheet. Give each a small distinguishing visual (numbered
   badge treatment, per-card accent intensity, or a micro-diagram) + hover that *reveals
   information* (Active-Grid rule: hover must surface content, not just move things).
   This is an at-rest change → **regenerate all 16 VR baselines in the same PR**
   (`cd tooling/visual-regression && npm run update:docker`).

- Effort: M–L. Verify: pages under neutral + saulera; reduced-motion emulation shows
  final states instantly; VR suite green.

### Phase 3 — The showpiece: make the factory page *perform* (highest differentiation)

1. **Animated re-skin (single biggest win).** When `factory-intake.mjs` applies derived
   tokens to `#reskin-preview`, transition the custom properties (`transition: background-color,
   color, border-color … var(--motion-duration-slow)` on the preview subtree — colors
   interpolate even when driven by custom-property swaps) or wrap the swap in
   `document.startViewTransition()` where available. A brief "derive → apply" beat
   (tokens visibly cascading in) turns the core proof into a moment people remember
   and share. Honesty contract intact — it's the real derivation, just visible.
2. **Trace player upgrade** (`trace-player.mjs`): optional Play mode (auto-advance with
   per-step reveal, pausable — WCAG 2.2.2 pause control), animated progress fill across
   the four PIV acts, step cards entering with `@starting-style`. Data stays untouched —
   real run, curated; only presentation moves.
3. **Wizard step transitions** in `factory-intake.mjs`: crossfade/slide between steps
   (`@starting-style` entry), ethics-quadrant selection gets a spring pop, WCAG check
   rows reveal sequentially (staggered) — a tiny piece of theatre for the checks that
   *are* the substance.
4. **Accordions/details animate open** (grid-rows `0fr→1fr` trick or `interpolate-size`
   where supported), handoff-viewer panel crossfades.

- Effort: L. Baseline risk: factory page at-rest unchanged if entry states resolve
  instantly under reduced-motion; the VR spec already gates on `data-*` ready attributes.
  Verify: run the intake wizard end-to-end, replay a trace, in Chrome + Safari + Firefox.

### Phase 4 — Visual richness (restrained, token-driven, optional)

1. **Hero atmosphere**: a subtle radial glow behind the hero built from `color-mix` of
   `--color-accent` at VERY low intensity (≤4–6% alpha — barely-there, an off-white tint,
   not a gradient show; token-driven so packs inherit it). Static, not animated — no
   parallax. Hard constraint: calm colours only, nothing that tires the eyes; if in
   doubt, less.
2. **Grain**: one inline `feTurbulence` filter at ~4% opacity on the dark feature band /
   closing band only — breaks the "rendered, not touched" flatness the trend research
   flags. Near-zero bytes.
3. **Header glass refinement**: the header already has `backdrop-filter: blur(8px)` —
   nudge toward the restrained liquid-glass idiom (saturate boost + hairline highlight
   border) on scroll only. No other glass surfaces (blur-everything is the anti-trend).
4. **Type**: lean further into the existing technical/editorial voice — the monospace
   eyebrow/stamp texture is on-trend for engineer-facing portfolios; consider tabular-nums
   monospace for section numerals and metadata rows site-wide.

   All at-rest changes → one deliberate baseline-regen PR.

- Effort: M. Verify: neutral stays austere (this phase must not fight the editorial
  voice), saulera pack shows its own atmosphere, VR regen committed.

### Explicitly deferred / rejected

- **Dark mode via `light-dark()`** — the pack system is the theming mechanism; a dark
  pack is a better fit than a parallel scheme. Revisit as a "dark neutral" pack exhibit.
- **Horizontal scroll sections** — accessibility liability (Roselli), weak fit.
- **Kinetic/variable-font typography** — neutral pack ships system fonts by design;
  a variable display face is a per-pack decision, not a core change.
- **WebGL/3D anything, cursor followers, scroll-jacking, autoplay video, splash screens** — anti-trends.

## Sequencing & guardrails

- Order: 0 → 1 → 2 → 3 → 4. Each phase = one branch/PR, VR suite green before merge.
  Baseline regens (2.5, 4) are deliberate, reviewable commits in the same PR as the change.
- Every new animation sits inside `@media (prefers-reduced-motion: no-preference)` or
  inherits the global kill-switch; JS motion checks `matchMedia` (pattern already in
  `portfolio.js:25`).
- Only `transform`/`opacity`/`background-*` animate (compositor-safe); no layout properties.
- Motion values come from the Phase 0 tokens — a literal `ms` in components.css stays a bug.
- New reusable motion utilities land in `components.css`/`portfolio.css`; factory-page-only
  choreography stays inline in `factory.html` per the existing promotion rule.

## Reference notes (user-supplied)

- uxdesign.cc 2026 trends — "MX design" (semantic tokens, agent-legible UI) validates the
  repo thesis; glassmorphism returns *restrained*; emotionally-aware modes noted but
  skipped as gimmick-risk.
- stateofaidesign.com — numbered-chapter progressive structure (site already does this);
  typography-first weight; metadata-as-credibility.
- cantor8.io — dark enterprise ground + single accent + modular cards; closest analogue
  to the existing feature-band idiom.
- causehouse.co — numbered sections, consistent section rhythm, metaphor-driven identity;
  confirms the site's bones are right — it's the motion layer that's missing.
