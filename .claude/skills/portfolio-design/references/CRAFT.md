# CRAFT — numeric rules for every surface

Synthesized from Dammyjay93/interface-design (craft), vercel-labs/web-interface-guidelines (hue/radius details), and this repo's own token system. Where a number here conflicts with a committed token, the token wins — propose a token change instead of hard-coding.

## Typography

- **Scale from a ratio, then step it.** Dense/calm UI: ~1.2 (minor third); marketing-scale surfaces: ~1.25. Example at 14px base, 1.25: caption 11 · body 14 · h4 16 · h3 18 · h2 22 · h1 28 · display 44+. Our scale lives in the type tokens — extend the ramp through `tokens.source.json`, never with a one-off px.
- **Display type is the personality carrier.** The I1 hero treatment wants display at enormous scale with tightened tracking (floor: -0.04em). Balance multi-line headings (`text-wrap: balance`).
- **Body measure 65–75ch.** Never a full-width paragraph.
- **Emphasis = weight or size.** Never gradient text, never colour-only emphasis.
- **Body text ≥14px, prefer 16px.** Nothing visible below 12px, including captions and code annotations.

## Spacing & layout

- **4px grid** (repo standard). Section rhythm: spacing between sections must be visibly larger than spacing within them — the chapter pacing (Q4) is built from whitespace steps, not dividers.
- **Nested radii: child ≤ parent, concentric.** Pick radii from tokens; no uniform rounding of everything (slop tell).
- **Hairlines for structure only when they encode grouping** the whitespace can't; prefer whitespace first.
- **Grid/flex items holding wide content (code, tables, URLs) get `min-width: 0`** and their own `overflow-x: auto` container — recorded Safari/Chrome blowout trap (PR #54).

## Colour (60/30/10, through tokens)

- **~60% dominant neutral surface, ~30% secondary tone, ≤10% accent.** One accent used with intention beats five without thought. Our accent budget: the one blue on chrome; the visitor's derived brand on stage (D5/D5b).
- **Every colour traces to a semantic token** (foreground, surface, border, accent, semantic states). No raw hex in components — ever.
- **Contrast: body/placeholder text ≥4.5:1, large text ≥3:1, UI components/borders-that-matter ≥3:1.** The derive engine negotiates this for brand-derived palettes; hand-authored chrome must hold it too.
- **On coloured/dark surfaces, tint secondary text and borders toward the surface hue** — never drop to a flat gray that fights the surface.
- **Dark bands (I2):** near-black monochrome, not tinted; typographic specificity is what keeps them from reading as the generic "dark + accent" cluster.

## Motion (token-bound spring vocabulary)

Existing tokens: `motion-bounce` 300ms · `motion-count` 900ms · `motion-ease-bounce` (~13% overshoot spring, TOUCH ONLY) · `motion-ease-settle` (critically damped). New motions (icon-morph, skeleton-to-content, tab pill glide) get new tokens re-derived from spring physics — values inspired by Kinetics but never copied (no license).

- **Character rule:** spring (~2%) for entrances · bounce only on things you touch · settle for things that arrive. Bounce NEVER fires on page load.
- **Ease-out for everything entering or interactive; never ease-in** — ease-in delays the first frame, the one the user is watching. Reference curve if a token doesn't exist yet: cubic-bezier(0.23, 1, 0.32, 1), then tokenize it.
- **Durations:** micro-interactions 150–300ms; larger transitions 300–500ms; longer only for the one authored moment. Counters use `motion-count`.
- **One authored moment per page** (the signature), not scattered effects and not the same entrance on every section.
- **Compositor props only:** animate `transform` and `opacity`. Never `transition: all` — list properties explicitly.
- **Every animation ends at the true at-rest state**; entrances run only under `prefers-reduced-motion: no-preference`; reduced motion renders final states instantly.
- **Count-ups write the exact measured string as the last frame** (real text node, honesty contract). Never a counter that shows 0 until JS runs — the acmeminds "0+ Years" failure is the canonical counterexample.
- **Never attach entrance animations to nodes rebuilt on every input tick** (colour drag) — they restart-and-blank. Gate behind a discrete-render class (recorded trap, PR #55).

## Interactive states (all six, every component)

Design hover · focus-visible · active · disabled · loading · error/empty for every interactive component before calling it done. Also: real content, working controls, responsive composition to 360px.

- **Hit areas:** effective target ≥44×44px on touch, ≥24px minimum anywhere; if the visible control is smaller, extend with a pseudo-element.
- **Press feedback:** the squish vocabulary (`:active` scale, release through bounce) on everything pressable.
- **Hover must add contrast or motion, never remove information.** No hover-only content (touch/AT honesty — recorded decision).
- **Skeletons/loading:** skeleton-to-content is a designed motion, not a library default; empty states invite the next action in the interface's voice.
