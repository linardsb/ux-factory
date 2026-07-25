# CHECKLIST — run before committing any UI change

MUST/SHOULD/NEVER format (vercel-labs/web-interface-guidelines lineage, merged with this repo's recorded traps). A MUST failure blocks the commit.

## Accessibility

- MUST: body/placeholder text contrast ≥4.5:1; large text ≥3:1; meaningful UI components ≥3:1.
- MUST: complete keyboard path through every new surface — tab order sane, no trap, arrow-key patterns where the widget implies them.
- MUST: visible `:focus-visible` state on every interactive element; hover/active/focus states INCREASE contrast, never reduce it.
- MUST: honor `prefers-reduced-motion` — final states render instantly; no entrance runs outside `no-preference`.
- MUST: no information carried by hover only or colour only. Pass/fail states keep their word ("PASS"), never glyph/colour alone.
- MUST: counted/animated numbers are real text nodes whose final content is the exact measured string.
- MUST: focus never lands under sticky chrome (`html { scroll-padding-top }` covers deep links and keyboard).
- SHOULD: ARIA sparing and correct (APG patterns); semantic HTML first; `aria-current` for scroll-spy rails.
- NEVER: hover-only reveals, colour-only errors, focus outline removal without replacement.

## Motion correctness

- MUST: animate `transform`/`opacity` only; explicit `transition` property lists.
- MUST: every animation ends at the true at-rest state (the VR gate captures at-rest; rest ≠ final is baseline churn).
- NEVER: `transition: all`. NEVER: ease-in on entrances. NEVER: bounce on page load.
- NEVER: entrance animations on nodes rebuilt every input tick (colour drag) — gate behind a discrete-render class (PR #55 trap).
- SHOULD: `document.startViewTransition` wrapped in feature + reduced-motion guards.

## Layout & cross-browser

- MUST: grid/flex items containing wide content get `min-width: 0`; wide content scrolls in its own `overflow-x: auto` container (PR #54 Safari/Chrome blowout).
- MUST: eyeball every new layout in real Safari AND real Chrome — the VR gate's bundled Chromium misses real-engine blowouts (recorded blindspot).
- MUST: responsive to 360px; no horizontal page scroll ever.
- SHOULD: screenshot iterations served on a fresh port (browser caching trap).

## Honesty & copy

- MUST: fictional labels, "real run, curated" labels, capability chips visible at rest, outside all disclosures, never as headlines.
- MUST: humanizer pass on all visible copy — no em/en dashes, no "not X but Y", no aphorism headlines, no -ing padding, active voice, plain words; jargon either replaced or defined inline once.
- MUST: nothing presented as agent output is hand-written; a weak run is re-run with a tighter prompt, never edited.

## Token & pipeline discipline

- MUST: zero literals in `components.css` — new values enter `tokens.source.json` (both groups) first.
- MUST: after ANY `tokens.source.json` change run BOTH `node agent-layer/gen-token-css.mjs` AND `node agent-layer/gen-handoff.mjs` (plus `gen-pack-bundle.mjs` goes with gen-handoff) or CI drift-check blocks main.
- MUST: `tokens.source.json`/`components.css` change ⇒ regen `system-graph.json`; moving lines in `components.css`/`derive.mjs` ⇒ regen `annotated-source.json`; new tracked files ⇒ regen `loc-summary.json` AFTER `git add` (counts tracked files only).
- MUST: a token consumed only from JS needs the `getPropertyValue("--…")` pattern or token-lint flags it orphaned.
- MUST: local pre-push — `node tooling/drift-check.mjs && node tooling/token-lint.mjs`, then run the surface you touched.

## VR gate (v3-branch mode, per D11)

- During the v3 overhaul the VR job is non-blocking on the overhaul branch; baselines regen at phase milestones and fully at final merge (`cd tooling/visual-regression && npm run update:docker`, Docker required; committed baselines are Linux/Chromium).
- update:docker skips sub-perceptual rewrites — `rm` the PNG to force. At-rest layout/copy changes to any captured page invalidate its baseline.
- The gate captures under NO-PREFERENCE with animations disabled — zero-churn comes from rest == final, not from reduced-motion CSS.

## Final self-audit (per surface, before calling it done)

Cadence rubric 6/6: custom interaction present and purposeful · motion reasoned (curve + duration justified from tokens) · component built from our system, not a pattern library · empty/error/loading states designed · accessibility checks above green · no dropped frames (test a low-end throttle). Then the feel bar: Q1 decisiveness · Q2 instant legibility · Q3 unambiguous tactility · Q4 chapter pacing · Q5 system consistency · Q6 confident close.
