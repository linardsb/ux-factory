# Feature: v3 static spine skeleton + band system (ticket #71 · P1a)

The following plan should be complete, but it's important that you validate documentation, codebase
patterns, and task sanity before you start implementing. Pay special attention to naming of existing
tokens, classes, and organism grammar — reuse the shipped names, import/extend from the right files.

**Build this ticket under the house `portfolio-design` skill** (`.claude/skills/portfolio-design/`).
Read `references/CRAFT.md` before writing any CSS; run `references/CHECKLIST.md` before committing.

## Feature Description

Rebuild `index.html` as the **five-beat static product-demo spine** (PRD D6: Home becomes the demo) and
author the token-only CSS organisms it wears (`.band` / `.band--dark`, `.beat-numeral`, `.row-list`,
`.close-card`, a `.btn-arrow` I7 refinement). This is the **static, at-rest layer only** — no live JS
(that ships in #72–#77). The at-rest end state **IS** the reduced-motion / no-JS first paint **AND** the
VR-stable baseline (`rest == final`): #72's hero choreography animates *to* this state and never changes it.

The single most load-bearing deliverable is the **mount-id region contract**: five committed `<section>`
ids + honest static placeholders that let the parallel Wave-2/3 tickets (#72 hero, #73 intake, #74
your-brand, #75 peak, #77 close) fill **disjoint** regions with zero coordination beyond this file.

## User Story

As a hiring manager landing on the portfolio for the first time,
I want the home page to read at rest as a clear, chaptered product demo (what this person does, in plain
outcome language, paced as acts) that is visually complete with no JS,
So that within the first scan I understand the offer — and the interactive beats have a stable, honest
scaffold to come alive in later tickets without a blank or mid-animation flash.

## Problem Statement

The current `index.html` (149 lines) is a bento-grid landing organized around the factory's anatomy
(cards linking to Factory/Approach/Work). PRD §1 records that this framing — the archive, not the demo —
is the root cause both prior versions failed the owner's read. v3 reframes Home as the demo spine, but
the interactive beats (hero choreography, live intake, your-brand, the peak, the close) are large and are
built in parallel by separate tickets. Without a committed static scaffold + a strict region contract
first, those parallel tickets would collide on the same file and the page would ship with blank or
half-animated regions at rest (VR churn + honesty failure).

## Solution Statement

One surgical rebuild of `index.html` into five band-chaptered `<section>` beats, each with a stable
`#beat-*` id and a complete, honest static placeholder, plus a small set of new token-only organisms in
`system/portfolio.css` and a nav shrink in `system/client.neutral.config.js`. No live JS, no new tokens,
no `components.css` edits, no new engines. The `loc-summary.json` regen is run-and-committed; the
`index`+`approach` VR baselines are regenerated via Docker at this phase milestone (D11). `main` is
unprotected, so these are correctness signals kept green by discipline, not merge gates.

## Out of Scope / Non-Goals

- **Not included: any live/JS behaviour.** No `spine.mjs`, no choreography, no re-skin, no wizard, no
  brand input, no composition render, no shareable state. #71 ships static HTML/CSS only. (Deferred:
  #72 hero+spine.mjs seam · #73 intake · #74 your-brand+persistence · #75 peak · #77 close.)
- **Not included: new design tokens.** A new token drags in the full `gen-token-css` + `gen-handoff` +
  `gen-pack-bundle` chain — that's #72's budget. Use the existing ramp only. (If the I4 numeral genuinely
  needs to exceed `--type-display` = clamp(40px,6vw,76px), still do NOT hard-code a px — flag it; #72 owns
  new motion/scale tokens.)
- **Not editing `system/components.css`.** New organisms live in `portfolio.css`. Editing `components.css`
  would trip three regen cascades (system-graph.json, annotated-source.json) and token-lint's UNDECLARED
  check, and would churn every other page. See NOTES → "Why portfolio.css, not components.css".
- **Not refactoring the existing band organisms** (`.feature-band`, `.section`, `.closing`,
  `.section-label`). `.band`/`.band--dark` is a NEW spine-scoped organism; the old ones stay for the other
  pages until P3 harmonizes. See NOTES → "`.band` vs `.feature-band`".
- **Not deleting the now-superseded home-only CSS** (`.bento`, `.mini-q`, `.mini-packs`, `.verify-glyph`,
  `.verify-proof`, `.bento-strip`). Leave them (deleting risks orphaning a contract token → token-lint red,
  and is extra churn); mark as a P3 cleanup candidate. See NOTES.
- **Not rebuilding factory.html / approach.html / work.html.** Those are #78/#80. #71 only shrinks the nav
  and links to them; every route must still resolve.
- **Not touching the honesty substrate** (capability chips semantics, fictional/real labels).

## Feature Metadata

**Feature Type**: Enhancement (surgical page rebuild + new CSS organisms)
**Estimated Complexity**: Medium (large-ish diff, but no logic; craft + the region contract are the risk)
**Primary Systems Affected**: `index.html`, `system/portfolio.css`, `system/client.neutral.config.js`;
generated `system/loc-summary.json`; VR baselines (`index`, `approach`).
**Dependencies**: none (first ticket of epic #70). Docker + Playwright v1.61.1 for VR baseline regen
(available; used at this milestone).

## Related Work

**Implements**: [#71 P1a](https://github.com/linardsb/ux-factory/issues/71) · **Epic**:
[#70 portfolio v3](https://github.com/linardsb/ux-factory/issues/70)

**Governing docs (inherited decisions — do NOT re-decide):**
- `docs/epics/portfolio-v3-experience.prd.md` — §6.1 the five-beat spine, D6 (Home is the demo), D8
  (nothing floats/orphaned), amendments (§8).
- `docs/epics/portfolio-v3-experience.architecture.md` — "Spine hosting = (b) index.html rebuilt",
  "New CSS organisms in portfolio.css, token-only", D11 VR strategy, build phases.
- `.claude/plans/ux-overhaul-v3-prd-research.md` — §2 the Q1–Q6 feel bar + the I1–I7 pattern vocabulary
  (lines 61–75: exact I2/I3/I4/I6/I7 → organism mapping); §4b locked decisions (D1–D11, 2026-07-22).
- `.claude/skills/portfolio-design/` — SKILL.md (direction/anti-slop), references/CRAFT.md (numbers),
  references/CHECKLIST.md (MUST/SHOULD/NEVER + recorded traps). **The build runs under this skill.**

**Back-references**: none (epic's first ticket).

**Forward-references** (the region contract this ticket commits is the coordination artifact these consume):
- `#72` fills `#beat-hero` (adds `spine.mjs` — the beat-orchestration seam — + choreography + one re-skin).
- `#73` fills `#beat-intake` · `#74` fills `#beat-brand` · `#75` fills `#beat-peak` · `#77` fills `#beat-close`.
- `#78` (evidence home) / `#79` (library grid) / `#80` (approach/work) rebuild the surfaces `#verify` links to.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `index.html` (all 149 lines) — the page being rebuilt. Note the exact `<head>` (stylesheet order,
  `robots noindex`, pack-boot script) and the trailing `<script>` block (lines 143–147:
  `client.neutral.config.js` → `site.js` → `portfolio.js` → `analytics.mjs` (module) → `dock.mjs`
  (module)). **Preserve this head + script block verbatim** — do NOT add `spine.mjs` (it doesn't exist
  until #72). `<body data-page="home">` marks the active nav item.
- `system/portfolio.css` (975 lines) — where the new organisms go. Study the existing grammar to match it:
  `.bento` (206–230), `.mini-q` (233–270), `.capability` / `.capability.live` (597–614, the honesty chip),
  the `.page-hero .hl` draw-in (105–116, double-gated, rest==final), the hero atmosphere `::before`
  (123–130), the dark-band grain `.feature-band::after` (139–148). Header comment (1–7) states the
  token-only + noted-exceptions rule.
- `system/components.css` — the BASE organisms your new ones sit beside (do NOT edit): `.container` (130),
  `.section` / `.section-sm` (137–140), `.btn` family + **existing `.btn-arrow::after`** (155–232),
  `.section-label` + `.num`/`.line` (640–662), `.page-hero` + hero cascade (923–1008), `.section-split`
  (1081–1098), `.feature-band` / `.feature-headline` / `.feature-grid` / `.feature-item` (1386–1426),
  `.closing` / `.closing-inner` / `.closing .disc` (1430–1475).
- `system/tokens.contract.css` (all 101 lines) — the ONLY tokens you may reference. Note especially the
  type ramp (93–100: `--type-display` clamp(40,6vw,76) · `--type-h1` · `--type-h2` · `--type-h3` 20 ·
  `--type-lead` · `--type-body` 16 · `--type-caption` 13 · `--type-eyebrow` 12), spacing (55–62), the
  inverse/on-dark colour set (39–47: `--color-bg-inverse`, `--color-fg-on-inverse[-strong/-muted/-soft]`,
  `--color-inverse-line`, `--color-accent-on-inverse`, `--color-on-dark-border`), radius (65–67).
- `system/site.js` (all) — injects header/footer from `window.CLIENT_CONFIG`. The active nav item is keyed
  by `data-page` vs each nav item's `key`. You change the config, not this file.
- `system/client.neutral.config.js` (all 60 lines) — `nav[]` (22–27) + `cta` (29) + `footer.columns` — the
  nav shrink edits `nav[]` here (see Open Questions for the exact shrink).
- `system/portfolio.js` (all 87 lines) — operates on generic selectors (`main`, `.site-header`,
  `a.fig-zoom`); injects skip-link + back-to-top + header scroll state. The rebuilt page must keep a
  `<main>` and the injected header (it does). No `.fig-zoom` on Home → lightbox no-ops. **No changes needed;
  just don't break the `<main>` wrapper.**
- `system/dock.mjs` — the pack switcher + left scroll ruler (the "wear it" control; #76 redesigns it). It
  places one ruler tick per `main > section`. Five beats = five ticks. Keep `dock.mjs` in the script block.
- `tooling/token-lint.mjs` (all) — the second correctness check (red-signal; `main` is unprotected so it
  doesn't gate a merge, but keep it green). `checkUndeclared` scans **components.css only**
  (irrelevant here). `checkOrphans` (68–86) scans a consumer set that **includes `system/portfolio.css` +
  all root `*.html`** — so a token orphans only if NOTHING references it. Rebuilding `index.html` can drop a
  token's last consumer → orphan → red (see GOTCHA on the index task).
- `agent-layer/gen-loc-summary.mjs` (all) — the blocking drift artifact. Counts tracked files by group from
  the **committed index blob** (`git show :<path>`, line 45) — so you MUST `git add` before regen. `index.html`
  is in group `pages`; `portfolio.css` is in group `runtime`. Rounded to nearest 100.
- `tooling/drift-check.mjs` (line 58–63) — runs `genLocSummary({check:true})`; loc-summary drift is BLOCKING.
- `tooling/visual-regression/visual.spec.mjs` (16–43) — the VR PAGES set; `index` is captured at 1280px width,
  full page height, under neutral + saulera. IA pages wait only on `.site-header`/`.site-footer`. `approach`
  renders the loc-summary numbers (see the loc cascade).
- `.github/workflows/verify.yml` — TWO jobs: `verify` (drift-check + token-lint) and `visual` (Playwright),
  run on every PR + push-to-main. **`main` is unprotected (verified 2026-07-22) → none are required checks**,
  so they are correctness signals, not merge gates. #71 does NOT edit this file (NOTES → CI posture).

### New Files to Create

- **None.** #71 only edits `index.html`, `system/portfolio.css`, `system/client.neutral.config.js`,
  (regenerated) `system/loc-summary.json`, and the VR baseline PNGs (`index` + `approach`).

### Relevant Documentation

- `.claude/skills/portfolio-design/references/CRAFT.md` — type scale/measure (65–75ch body, display
  personality carrier, floor -0.04em tracking), 4px spacing rhythm + "section gaps > within-section gaps",
  60/30/10 through tokens, `min-width:0` on wide grid/flex children, motion (compositor-only, ease-out,
  rest==final), all-six-states, ≥44px hit areas.
- `.claude/skills/portfolio-design/references/CHECKLIST.md` — the MUST/SHOULD/NEVER gate; the "VR gate
  (v3-branch mode)" section; the honesty & copy MUSTs; the token & pipeline discipline block.
- Research doc lines **69–75** — the exact I-pattern → organism intent:
  I2 light/dark band rhythm (zero colour spend) → `.band`/`.band--dark`; I3 row-list + circular arrow
  affordance → `.row-list`; I4 oversized numerals on dark cards, numbering must encode a REAL sequence
  (our pipeline is ordered) → `.beat-numeral`; I6 single-card close → `.close-card`; I7 one pill-button
  system + token-driven arrow-glyph motion → `.btn-arrow` refinement.

### Patterns to Follow

**Token discipline (portfolio.css norm):** colour / spacing / radius / type / motion via `var(--…)` only.
Structural literals (grid template values, `1px`/`2px` hairlines, px widths, flex numbers, percentages) are
allowed — the file already does this throughout (e.g. `.bento` grid, `.dock` px offsets). No raw hex, no raw
colour, ever. Mirror the exact idiom of `.bento` (206–230) and `.cs-meta` (338–342).

**Dark-surface grammar (for `.band--dark`):** mirror `.feature-band` (components.css 1386–1426):
`background: var(--color-bg-inverse)`, text `var(--color-fg-on-inverse)`, hairlines `var(--color-inverse-line)`,
numeral/eyebrow accent `var(--color-accent-on-inverse)`, borders `var(--color-on-dark-border)`. CRAFT.md:
near-black monochrome, NOT tinted; typographic specificity is what keeps it off the "dark + one accent" slop
cluster. Reuse the existing `.feature-band::after` grain treatment idea if a dark band wants texture.

**Section-label / numeral grammar:** the eyebrow label idiom is `.section-label` with `.num` (mono, tabular)
+ `.line` (components.css 640–662). The I4 `.beat-numeral` is the oversized sibling — mono, tabular-nums,
`--type-display` or `--type-h1` scale, `--color-fg` on light / `--color-accent-on-inverse` on dark.

**Button grammar (I7):** the base `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-arrow` already exist
(components.css 155–232) with the press-squish + `.btn-arrow::after { content:"→" } :hover { translateX(4px) }`.
The I7 "extension" is a portfolio.css *refinement* of the arrow motion (e.g. move the arrow curve onto a
token / add a subtle circular-arrow affordance consistent with I3's row arrows) — compositor-only, token-bound.
Keep it a small enhancement; do NOT reimplement the button system.

**Honesty chip:** `.capability` / `.capability.live` (portfolio.css 597–614) — TEXT states status; `.live`
only recolors. **Placeholders for not-yet-live beats carry NO `.live` chip** (see Task 3 honesty rule).

**Reveal-on-scroll idiom (if reused):** the double-gated `@supports (animation-timeline: view()) and
@media (prefers-reduced-motion: no-preference)` pattern (components.css 664–678, portfolio.css 109–116) —
rest state fully visible, zero VR churn. #71 adds NO new animation, but if a beat reuses an existing
scroll-reveal class, it must stay rest==final.

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 1 (organisms) and Phase 2 (index rebuild) are tightly coupled — author the
organism CSS and the markup that consumes it together, iterating in a real browser. Phase 3 (nav) is
independent. Phase 4 (regen + gates + VR) is the terminal, must-run phase.

### Phase 1: The token-only organisms (`system/portfolio.css`)

Add a clearly-headed `/* ---------- v3 spine organisms (#71) ---------- */` block. Author, token-only:
- `.band` / `.band--dark` — full-bleed I2 chapter bands (light default; dark = the `.feature-band`
  inverse recipe). A band wraps a beat; alternation gives value contrast at zero colour spend.
- `.beat-numeral` — I4 oversized ordinal (01–05), mono/tabular, anchoring each beat.
- `.row-list` — I3 one-item-per-row list with hairline dividers + a circular arrow affordance per row,
  obviously clickable (used by `#verify`; reusable later for Work proof index). All six states on the row.
- `.close-card` — I6 single floating card for the beat-4 close (one sentence, one action).
- `.btn-arrow` I7 refinement — token-driven arrow-glyph hover motion (small enhancement over the base).
- Responsive to 360px; `min-width:0` on any grid/flex child that could hold wide content.

### Phase 2: Rebuild `index.html` into the five-beat spine

**Depends on:** Phase 1 (the markup consumes the organisms).

- Preserve the `<head>` and the trailing script block verbatim (no `spine.mjs`).
- At the top of `<main>`, commit the **mount-id region contract** as a self-sufficient HTML comment (Task 2).
- Five `<section>` beats, band-chaptered, numeral-anchored, each with a stable `#beat-*` id and a complete,
  honest static placeholder (Task 3). Beat 5 = `#verify` static evidence row-list.
- Height budget: whole spine ≤ ~7,500px at rest (1280px width); each beat ≈ one viewport of core content.

### Phase 3: Nav shrink (`system/client.neutral.config.js`)

**Independent of:** Phases 1–2.
- Shrink `nav[]` to the v3 IA (default recommendation: Home · Approach · Work + the Contact CTA; Factory
  drops from top-nav, reachable from `#verify` + the footer). Keep the footer columns complete. Every route
  still resolves. See Open Questions — confirm the shrink at plan review; it's a one-line, reversible change.

### Phase 4: Regen, gates, and VR (terminal — must run)

**Depends on:** Phases 1–3 committed-staged. **Precondition fact (verified 2026-07-22):** `main` is
**unprotected** — no required status checks, so nothing CI-*blocks* a merge; drift-check / token-lint /
visual are correctness signals kept green by discipline. **Docker is available**, so baselines are
regenerated in-ticket (no `verify.yml` edit, no integration branch — see NOTES).
- `git add` the changed files → regen `loc-summary.json` → confirm `drift-check` + `token-lint` green.
- Regen `index` + `approach` VR baselines via Docker so `main`'s CI stays green (this is D11's
  "baselines regenerated at phase milestones").
- Real Safari + real Chrome eyeball; §6.4 self-audit.

---

## STEP-BY-STEP TASKS

Execute in order. Branch first: `git checkout main && git pull && git checkout -b feature/v3-spine-skeleton`.

### 1 · PLAN-BEFORE-CODE (portfolio-design two-pass) — no file yet

- **IMPLEMENT**: Read `references/CRAFT.md` fully. Write a one-paragraph layout concept + a tiny ASCII
  wireframe of the five beats (band light/dark rhythm, numeral placement, the signature moment), name the
  60/30/10 token roles, then apply the skill's critique: "would I produce this for any similar brief?" Revise
  before building. The signature boldness is spent on ONE beat (the peak placeholder) — everything else quiet.
- **PATTERN**: SKILL.md "Two-pass process" + "The feel bar (Q1–Q6)".
- **VALIDATE**: you can state, in one sentence each, what makes this NOT a generic AI landing (anti-slop) and
  which beat carries the signature.
- **SATISFIES**: craft bar §6.4 (AC: Cadence 6/6, feel bar Q1–Q6).

### 2 · UPDATE `index.html` — commit the mount-id region contract (self-sufficient comment)

- **IMPLEMENT**: At the very top of `<main>`, paste a comment block a fresh session can act on with zero
  other context. Use these EXACT ids (later tickets conform to them; they are the coordination artifact):

  ```html
  <!-- ============================================================================
       v3 spine — region contract (ticket #71). Home IS the product-demo (PRD D6).
       Five band-chaptered <section> beats. Each #beat-* section is owned INTERNALLY
       by a later ticket, which fills it as a DISJOINT region (parallel-safe). This
       file ships the STATIC, at-rest state only: it is the reduced-motion / no-JS
       first paint AND the VR baseline. rest == final — later beats animate TO these
       states and must not change them.

         #beat-hero    Beat 1 · instant proof.   Owner #72 — adds system/spine.mjs
                       (the beat-orchestration seam) + build-in choreography + ONE
                       real derive() re-skin via :root custom properties.
         #beat-intake  Beat 2a · you brief it.   Owner #73 — mounts the rewritten
                       stakeholder wizard (shared factory-intake.mjs via initIntake).
                       NB: the wizard's existing mount convention is id="intake"
                       (factory.html); #73 may nest #intake inside #beat-intake.
         #beat-brand   Beat 2b · your brand.     Owner #74 — bounded brand-colour
                       input + derived-pack persistence (pack-derived.mjs + pack-boot).
         #beat-peak    Beat 3 · the peak.        Owner #75 — a committed proto/
                       composition assembles under the answers/brand + WCAG receipts
                       + the Manipulation-Matrix ethics gate. The signature moment.
         #beat-close   Beat 4 · you keep it.     Owner #77 — handoff link + shareable
                       URL-state + the contact close.
         #verify       Beat 5 · verify.          STATIC evidence index (row-list) to
                       factory / roundtrip / study / approach / work. No JS mount.

       system/spine.mjs does NOT exist yet — #72 adds it and its <script> tag. Do not
       reference it here. Honesty: a placeholder must not claim a live capability it
       does not yet perform (no `.capability.live` chip until the beat is wired).
       ============================================================================ -->
  ```
- **PATTERN**: mirror the header-comment density already used across the repo (e.g. portfolio.css 179–183).
- **GOTCHA**: the ids must be stable and disjoint — renaming them later breaks the parallel tickets. Treat
  this comment as an interface, not a note.
- **VALIDATE**: apply the advisor's test — could a fresh session planning #73 place the wizard in the right
  region from this comment alone? If not, tighten it.
- **SATISFIES**: AC "mount ids + static placeholders exist and are documented for hero·intake·your-brand·peak·close".

### 3 · UPDATE `index.html` — the five static beats

- **IMPLEMENT**: Author five `<section>` beats consuming the Phase-1 organisms:
  1. `#beat-hero` — reuse `.page-hero` grammar (its existing load cascade is rest==final, already
     baseline-safe). Billboard headline: verb-first, states the **reader's outcome** in plain words (NOT the
     mechanism, NOT "a factory"); one-line sub; primary + secondary CTA (`.btn .btn-primary .btn-arrow` into
     the demo / `.btn .btn-secondary` to approach). This static hero is the final state #72 animates to.
  2. `#beat-intake` — a designed static preview of the stakeholder brief: show the first question with its
     recommended default + one-line reasoning as plain HTML (fuller `.mini-q` energy), framed "brief it in
     four questions". NO live chip. #73 replaces the interior with the live wizard.
  3. `#beat-brand` — a static "try it with your brand" affordance: a labeled colour field/swatch shown at
     rest as an empty-state invitation ("enter a brand colour"), honestly not-yet-live. #74 wires it.
  4. `#beat-peak` — **the signature beat.** A static representation of the built screen: a sample composed
     product screen (markup or a committed still) with a couple of static WCAG receipt rows and the ethics
     gate framed as the guess-then-reveal — presented as "this is what it builds," never asserting it just
     ran live. #75 makes it assemble.
  5. `#beat-close` (`.close-card`, I6) + then `#verify` (`.row-list`, I3): the close = one sentence
     ("this is what I'd do for your team in week one") + the real Contact action (works statically) + a
     handoff-pack link. `#verify` = a scannable arrow row-list linking to the evidence surfaces (factory,
     roundtrip, study, approach, work) — "verify if you want," one disclosure deep (D8).
  - Alternate `.band` / `.band--dark` for I2 chapter rhythm; anchor each beat with `.beat-numeral` 01–05.
- **PATTERN**: hero = `.page-hero` (components.css 923–1008); dark band = `.feature-band` recipe; close =
  `.closing`/`.close-card`; honesty chip idiom = `.capability` (portfolio.css 597–614).
- **GOTCHA (honesty, hard)**: placeholders for #73/#74/#75/#77 must NOT carry a `.capability.live` "Runs now"
  chip or copy asserting a live capability the static page doesn't perform — the chip lands with each beat's
  own ticket. Frame placeholders as designed previews / empty-state invitations. Copy gets a humanizer pass
  (no em/en dashes, no "not X but Y", active voice, plain words — CHECKLIST honesty & copy).
- **GOTCHA (token-lint orphan)**: after this rebuild, `node tooling/token-lint.mjs` must stay green. If the
  new markup drops the last consumer of a contract token (unlikely — the CSS files still reference their
  tokens — but possible if you also remove a CSS rule), re-reference it or remove it from
  `tokens.source.json` + regen. Do NOT delete the superseded `.bento`/`.mini-q`/… rules in this ticket
  (keeps their tokens non-orphan; P3 cleanup).
- **VALIDATE**: `npx serve .` → load `/` under the neutral pack with **JS disabled**: all five beats render,
  complete, no blank/mid-animation regions, visually final. Then measure at 1280px:
  `document.documentElement.scrollHeight` ≤ ~7500.
- **SATISFIES**: AC "renders all five beats with no JS, at-rest complete & visually final"; "height budget
  ≤ ~7,500px"; the honesty contract.

### 4 · UPDATE `system/portfolio.css` — the v3 spine organisms

- **IMPLEMENT**: Add the headed block with `.band` / `.band--dark`, `.beat-numeral`, `.row-list` (+ its
  circular arrow affordance + all six interactive states + focus-visible), `.close-card`, and the `.btn-arrow`
  I7 refinement. Token-only (colour/space/radius/type/motion via `var(--…)`; structural px/grid/percent per
  file norm). Responsive to 360px; `min-width:0` on wide grid/flex children.
- **PATTERN**: `.bento` (206–230) for grid idiom; `.feature-band` recipe for `.band--dark`; `.section-label
  .num` (651–656) for numeral mono/tabular; existing `.btn-arrow` (components.css 226–232) for the base.
- **GOTCHA (no new tokens)**: use the existing type ramp for `.beat-numeral`; `--type-display` maxes at 76px.
  Do NOT add a token or hard-code a bigger px. Do NOT edit `components.css`.
- **GOTCHA (rest==final)**: add NO entrance animation that changes the at-rest state. Any reveal reuse must be
  double-gated (`@supports (animation-timeline: view())` + `no-preference`) with a fully-visible rest state.
- **VALIDATE**: `node tooling/token-lint.mjs` → ✓ (0 undeclared · 0 orphan · DTCG valid). Render under both
  neutral and saulera packs (swap the one `tokens.neutral.css` line locally) — organisms re-skin identically.
- **SATISFIES**: AC "new organisms are token-only and render correctly (token-lint green)"; Q5 system consistency.

### 5 · UPDATE `system/client.neutral.config.js` — nav shrink

- **IMPLEMENT**: Edit `nav[]` (lines 22–27) to the v3 IA. Default (confirm at review, see Open Questions):
  `Home` (`/`, key `home`), `Approach` (`/approach`, key `approach`), `Work` (`/work`, key `work`); keep the
  `cta` Contact. Drop the `Factory` nav item (reachable from `#verify` + the footer). Leave `footer.columns`
  complete (the footer stays the full site index). Do NOT touch `site.js`.
- **PATTERN**: the existing `nav[]` array shape; `key` must match a page's `data-page` for the active state.
- **GOTCHA**: every dropped-from-nav route must still resolve — `/factory` still exists and is linked from
  `#verify`. Home keeps `data-page="home"` so the active item resolves.
- **VALIDATE**: `npx serve .` → header shows the shrunk nav on every page; `/factory` still loads from the
  `#verify` link and the footer.
- **SATISFIES**: AC "nav shrunk to the v3 IA; every target route still resolves".

### 6 · REGEN `system/loc-summary.json` — the drift artifact (run-and-commit)

- **IMPLEMENT**: `git add index.html system/portfolio.css system/client.neutral.config.js` (stage by explicit
  path — shared worktree), THEN `node agent-layer/gen-loc-summary.mjs`. Commit whatever diff it produces
  (index.html is in group `pages`, portfolio.css in `runtime`; the +lines will likely tick the rounded
  buckets). Do NOT predict the numbers — run it and commit the result.
- **PATTERN**: memory "loc-summary counts tracked only" + "regen loc AFTER git add" — it reads `git show :<path>`
  (the staged blob), so unstaged edits are invisible.
- **GOTCHA**: if you regen BEFORE staging, it reads the old committed blob and misses your change → CI
  (clean checkout) then goes red. Stage first, always.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → "loc summary ✓ … no drift";
  `node tooling/drift-check.mjs` → ✓ (syntax · token-css · annotated-source · loc-summary · system-graph ·
  handoff · scenarios · traces).
- **SATISFIES**: keeps drift-check green (the only drift surface #71 touches; kept green by discipline).

### 7 · REGEN VR baselines (Docker) + real-browser eyeball

- **IMPLEMENT**: Docker is available → `cd tooling/visual-regression && npm run update:docker`; commit the
  changed `index-neutral.png` / `index-saulera.png` AND `approach-neutral.png` / `approach-saulera.png` (the
  approach baselines churn because `approach.html` renders the loc-summary numbers, which just moved in
  Task 6). If the loc numbers did NOT move, only the `index` PNGs change (`rm` a PNG to force a
  sub-perceptual rewrite). Then eyeball `/` in **real Safari AND real Chrome** on a fresh `npx serve` port.
- **PATTERN**: memory "visual-regression baseline trap" + "VR update skips sub-perceptual" + "VR gate
  single-engine blindspot" (add `min-width:0` to any wide grid/flex child).
- **GOTCHA**: committed baselines are Linux/Chromium — a macOS local Playwright run mismatches; ONLY the
  Docker path produces valid baselines. Don't commit a macOS-rendered PNG. (No `verify.yml` edit and no
  integration branch — `main` is unprotected, so regen-per-ticket keeps its CI green; see NOTES.)
- **VALIDATE**: `main`'s post-merge CI `visual` job stays green; real-browser eyeball shows no dropped frames
  on hover/press, no cross-engine layout blowout, responsive to 360px, no horizontal page scroll.
- **SATISFIES**: AC "real Safari/Chrome eyeball — not only the single-engine VR gate"; D11 "baselines
  regenerated at phase milestones".

### 8 · Final self-audit + commit

- **IMPLEMENT**: Run `references/CHECKLIST.md` end to end (accessibility MUSTs, motion correctness,
  layout/cross-browser, honesty & copy, token & pipeline). Commit on `feature/v3-spine-skeleton`, staged by
  explicit path, message e.g. `feat: v3 static spine skeleton + band organisms + region contract (#71,
  portfolio-v3-experience §6.1 D6/D8)`. Then `/piv-create-pr`; review in a fresh session (`/piv-review-pr`);
  solo repo → verdict via `gh pr review --comment`.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs` both ✓; page renders under
  neutral; CHECKLIST has no MUST failure.
- **SATISFIES**: the completion checklist; "Closes PRD open question: hero at-rest contract".

---

## TESTING STRATEGY

No unit/integration suite exists (repo rule: "run the surface you touched"). Validation is behavioural +
the two correctness checks (drift-check, token-lint) + VR.

### Unit / Integration Tests
- None. Do not invent a suite.

### The gates (must pass)
- `node tooling/drift-check.mjs` — ✓ (loc-summary regenerated & committed).
- `node tooling/token-lint.mjs` — ✓ (0 undeclared · 0 orphan · DTCG valid).

### Manual / behavioural (the real test)
- `npx serve .` (fresh port each iteration — caching is aggressive) → `/`:
  - **JS disabled**: all five beats render, at-rest complete, visually final, no blank/mid-animation.
  - Height ≤ ~7,500px at 1280px width.
  - Nav shrunk; `/factory` still resolves from `#verify` + footer; active nav item correct.
  - Swap `tokens.neutral.css` → `tokens.saulera.css` locally: organisms re-skin identically.
  - Real Safari AND real Chrome: no dropped frames, no blowout, responsive to 360px, no horizontal scroll.
- Honesty: no placeholder claims a live capability; no `.capability.live` chip on not-yet-wired beats.

### Edge Cases
- Reduced motion (`prefers-reduced-motion: reduce`): identical at-rest state, no entrance runs.
- No-JS / pack-boot no-op: neutral pack renders the complete spine.
- 360px width: bands, numerals, row-list, close-card all reflow without overflow.
- Keyboard: full tab path through hero CTAs, `#verify` row-list, close action; visible `:focus-visible`.

---

## VALIDATION COMMANDS

### Level 1 — Syntax & Style
- `node tooling/token-lint.mjs` → token-lint ✓ (correctness check 2).

### Level 2 — Drift (correctness check 1)
- `git add index.html system/portfolio.css system/client.neutral.config.js`
- `node agent-layer/gen-loc-summary.mjs && node agent-layer/gen-loc-summary.mjs --check` → "loc summary ✓ … no drift"
- `node tooling/drift-check.mjs` → drift-check ✓

### Level 3 — VR (regen at this milestone; Docker available)
- `cd tooling/visual-regression && npm run update:docker` → commit changed index + approach PNGs.

### Level 4 — Manual
- `npx serve .` → `/` under neutral (JS on AND off), then saulera; real Safari + real Chrome; 360px; keyboard path.

### Level 5 — Optional
- `references/CHECKLIST.md` full pass (the correctness gate).

---

## ACCEPTANCE CRITERIA

- [ ] `index.html` renders all five beats under the neutral pack with **no JS**; at-rest state complete
      (no blank / mid-animation), visually final (`rest == final`).
- [ ] Nav shrunk to the v3 IA; every target route still resolves (incl. `/factory` via `#verify` + footer).
- [ ] New organisms (`.band`/`.band--dark`, `.beat-numeral`, `.row-list`, `.close-card`, `.btn-arrow` I7)
      are token-only and render correctly — `node tooling/token-lint.mjs` ✓ (0 orphan).
- [ ] Mount ids + honest static placeholders exist and are documented (self-sufficient comment) for
      hero · intake · your-brand · peak · close; `#verify` static evidence row-list present.
- [ ] Height budget: spine ≤ ~7,500px at rest (1280px); each beat ≈ one viewport of core content.
- [ ] `node tooling/drift-check.mjs` ✓ (`loc-summary.json` regenerated after `git add` and committed).
- [ ] No `components.css` edit; no new token; no `spine.mjs`/live JS; honesty contract intact (no false
      capability chip on placeholders).
- [ ] Craft bar §6.4 self-audit: Cadence 6/6 · feel bar Q1–Q6 · real Safari **and** real Chrome eyeball.
- [ ] Closes PRD open question: hero at-rest contract (the exact final state VR captures + the no-JS /
      reduced-motion first paint) — recorded in the PR body.
- [ ] `drift-check` + `token-lint` green; `index` + `approach` VR baselines regenerated (Docker) so `main`'s
      CI stays green after merge.

---

## COMPLETION CHECKLIST

- [ ] Branch `feature/v3-spine-skeleton` off fresh `main`.
- [ ] Region-contract comment committed with the exact `#beat-*` / `#verify` ids.
- [ ] Five static beats render complete with no JS; height ≤ ~7,500px.
- [ ] Organisms token-only; token-lint ✓; re-skin verified under saulera.
- [ ] Nav shrunk; all routes resolve.
- [ ] `loc-summary.json` regenerated AFTER `git add` and committed; drift-check ✓.
- [ ] VR baselines (index + approach) regenerated under Docker; `main`'s CI green after merge.
- [ ] Real Safari + real Chrome eyeball; CHECKLIST no MUST failure.
- [ ] Atomic commit (staged by explicit path); `/piv-create-pr`; reviewed in a fresh session.

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **Nav shrink — exact top-nav (confirm at review).** *Default:* Home · Approach · Work + Contact CTA; drop
   Factory from top-nav (reachable via `#verify` + footer). *Basis:* D6 ("Factory becomes the evidence
   layer"), D8 ("delisted from nav" allowed). One-line, reversible; #78/#80 may re-add Factory when the
   evidence home is rebuilt. If you'd rather keep Factory in nav for now, say so and I'll keep all four.
2. **Beat-4 `#beat-close` handoff link target.** Assumption: link to the existing `/handoff.html` (or the
   pack bundle) as the static takeaway; #77 adds the shareable URL-state. Confirm the static link target.
3. **`#beat-peak` static still — markup vs committed image.** Assumption: hand-authored token-only markup
   echoing a committed `proto/composition` (no new asset), so it re-skins with the pack. #75 makes it live.

**Resolved during planning (verified 2026-07-22):**
- *v3 CI/VR posture + branch model (was two open questions).* `main` is **unprotected** (no required checks
  → nothing CI-*blocks* a merge) and **Docker is available**. So: no `verify.yml` `continue-on-error` edit,
  no long-lived integration branch — each `feature/v3-*` ticket regenerates its changed baselines via Docker
  and merges to main, keeping main's CI green and *satisfying* D11's "regen at phase milestones." #82's "full
  regen + VR re-block" then means a comprehensive baseline regen and (optionally) turning on branch
  protection. Honors D11's intent (don't let VR churn slow the overhaul) without suspending a non-gating gate.

**Assumptions baked in:** no new tokens; organisms in portfolio.css only; existing hero cascade (rest==final)
reused for `#beat-hero`; superseded home-only CSS kept (P3 cleanup); `spine.mjs`/live JS strictly deferred.

## NOTES (open canvas)

**Why `portfolio.css`, not `components.css` (load-bearing simplification).** Putting the organisms in
`portfolio.css` sidesteps THREE regen cascades at once: (a) `system-graph.json` keys off `components.css`
consumer blocks; (b) `annotated-source.json` keys off specific line ranges in `components.css`/`derive.mjs`;
(c) token-lint's UNDECLARED check scans `components.css` only. It also avoids churning every other page that
already consumes `components.css`. This is why the architecture doc says "new CSS organisms in portfolio.css,
token-only" — it's a correctness decision, not a filing preference. A future session must not "helpfully"
move a `.band` rule into `components.css`.

**`.band` vs the existing `.feature-band` / `.section` / `.closing` (explicit decision, not drift).**
`.band` / `.band--dark` is a NEW spine-scoped organism. Do NOT refactor `.feature-band`/`.section`/`.closing`
(they live in `components.css` → the cascades above + churn on approach/work/contact/etc.). Consequence: Home
moves to `.band`; the other pages keep `.feature-band` until P3 (#78/#80) harmonizes the whole site. Q5
(system consistency) is graded across the site, so this temporary two-grammar state is a conscious,
time-boxed tradeoff — recorded here so it reads as authored.

**CI posture: nothing gates a merge; keep it green by discipline (verified 2026-07-22).** `main` is
**unprotected** — no required status checks — so drift-check / token-lint / visual run on the PR and on
push-to-main but do NOT block a merge. Treat them as correctness signals. The two #71 can turn red are
**drift-check** (→ `loc-summary.json`, Task 6) and **token-lint** (→ no orphaned contract token, Task 3/4
GOTCHAs); `visual` goes red until baselines are regenerated (Task 7 — Docker is available). Everything else
(`token-css`, `annotated-source`, `system-graph`, `handoff`, `scenarios`, `traces`) is untouched by #71. No
`verify.yml` edit and no integration branch — because nothing blocks and Docker is present, regen-per-ticket
is the simplest honest posture (Open Questions → "Resolved during planning"). State the green status in the PR body.

**The loc-summary cascade (why Task 6 + the approach baseline).** `index.html` (group `pages`) and
`portfolio.css` (group `runtime`) both grow materially; `gen-loc-summary` reads the staged blob and rounds to
the nearest 100, so the buckets will likely tick. `approach.html` renders those numbers (`.loc-proof`), so
its VR baseline churns with them — regen approach's PNGs alongside index's in Task 7. The ticket's file list
under-specifies this; it's the #1 correctness risk. Run-and-commit, don't predict.

**Honesty at the phasing seam.** The static skeleton scaffolds interactive beats that don't run until
#73/#75/#77. A placeholder must not carry a "Runs now" chip or copy asserting a live capability the static
page doesn't perform — the chip goes in when the beat goes live. The branch is not deployed until the beats
are live (it merges at the #82 milestone), but keep placeholder copy honest intra-branch regardless.

**Mount-id contract = the real product of #71.** #72/#73/#74/#75/#77 are planned just-in-time and run in
parallel waves; #71's committed ids are the SOLE coordination artifact — later tickets conform to it, it does
not conform to them. Name exact ids; make the in-file comment self-sufficient.

## AMENDMENTS

<!-- append-only; newest at the bottom; empty at creation -->
