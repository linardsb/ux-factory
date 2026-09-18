# Feature: S3 — the wrong-but-green detector (ΔE-MIN against a foreign render)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Spike A imported Shopify Polaris v7's public token export and shipped a pack that was **formally
green and visibly wrong**: `--color-fg: #0c3b2f` — Polaris's `color-text-success-strong`, a dark
green — placed on the body-text role, while all twelve declared WCAG pairs passed. The import report
has no dimension that can say so.

This spike builds the missing organ as a throwaway and measures whether it works: **per-pixel
CIEDE2000 ΔE in CIELAB, aggregated per region** (email-hub's E4, `visual_scorer.py:104`), computed
between a foreign tool's own rendering of an element and this repo's rendering of the same element
under a role map. Two role maps are rendered: a **faithful** one (the source's own literals on the
mapped roles) to measure the cross-renderer noise **floor**, and spike A run 3's **real pack** to
measure the **signal**. The verdict is the margin between them, read against a predicate committed
before any number is measured.

Nothing ships. The deliverable is a verdict document, a committed fixture pair a future gate can
read, and the parked scripts that produced them.

## User Story

As the owner of the factory's import half
I want a detector that scores a mapping the eye calls wrong as wrong, even when every formal check is green
So that #307's `fidelity {deltaEMin, wcag, verdict}` block is built on a measurement that fires, and the
PRD's "honest fidelity" metric is not satisfied by measuring nothing.

## Problem Statement

The PRD's Honest-fidelity success metric (`docs/epics/canvas-design-import.prd.md:179`) names one
falsifiable test: *"one deliberately wrong mapping (spike A run 3's green body text) must read red"*.
No code in this repo can compute that. `system/wcag.mjs` checks contrast, which run 3 passes 12/12;
`system/derivation-roundtrip.mjs` renders a committed diff, which is #40's precedent but not a metric.
Without a detector, #307's fidelity block either ships empty — and E4's named self-deceiving shape,
`sum(scores)/max(len,1)`, scores **1.0 exactly when nothing was measured** — or does not ship.

## Solution Statement

One fixture, five renders, one pure-Node comparison, one pre-committed predicate.

- **The element** is spike C's committed fixture, instance `1db1b29957b949ca` "Spike List Row"
  (`.claude/plans/design-import-spike-c/`), read from Brilliant on 2026-08-27 in four formats. Its
  `06.svg` export carries Brilliant's own text positions and three embedded Manrope `@font-face`
  blocks, so rasterising it in Chromium reproduces **Brilliant's** rendering, not this repo's.
- **The reference** is that raster.
- **The candidate** is a hand-authored DOM built from `03c-master-blueprint.txt`, whose colours are
  `var(--color-*)` references under a role map, rendered twice: once under a faithful pack, once
  under `.claude/plans/design-import-spike-a/tokens.polaris.spike.css` — spike A run 3's real output.
- **The comparison** decodes the committed PNGs in Node with zero dependencies (`node:zlib` +
  a PNG unfilter), computes CIEDE2000 per pixel, and walks a **six-rung** pre-declared aggregation
  ladder at three region granularities.
- **The verdict** is read off rung 1 (E4 verbatim) and, if that is green, off the first rung of the
  ladder that separates signal from floor. Which rung that is, is #307's answer.

**The floor was measured during planning, and it changed the design.** E4's own aggregation is a
per-pixel mean, and the obvious fix for its dilution — masking to the glyph pixels — turns out to have
a floor of **20.52 ΔE**, larger than the 18.22 the defect itself is worth: two renderers disagree about
*where* a glyph's edge falls far more than this mapping disagrees about what colour it is. The ladder
therefore ends in a rung that compares the **average colour of the ink** rather than ink pixel by
pixel, whose floor is **0.003–0.872** on chromium and **≤ 2.689** across three engines. The failing
rung is kept in the ladder so the spike reports it, and #307 does not reach for it. Full account: R1.

## Out of Scope / Non-Goals

- **Not included: a `build-checks` group.** AC #2 asks only that the fixture pair be *committed so the
  future gate can read it*. The gate is #307's ticket, and `build-checks` group numbers are claimed in
  merge order (architecture § Concurrency) — claiming one here would collide.
- **Not included: `imports/<id>.json`, the import record, or any part of the fidelity block.** #307.
- **Not included: geometry, type or spacing fidelity.** The primary map moves **colour roles only**
  and holds the source's own geometry fixed across both renders, because wrong-but-green is a colour
  defect and a geometry-inclusive map would let layout error masquerade as colour error. A secondary
  map (M2, below) adds two large-area colour roles and is reported as a second row, not the verdict.
- **Not included: a second source, a Figma file, or a live Brilliant session.** The fixture is already
  on disk and committed. Brilliant desktop's `export(png, outputPath)` is an owner-only upgrade probe
  (see the paid table), not a dependency.
- **Not changing:** `system/`, `tooling/`, `handoff/`, `agent-layer/`, any shipped page, any gate.
  Every file this ticket writes lives under `.claude/plans/canvas-spike-s3/`.
- **Not included: a vision loop.** E8 retired email-hub's `visual_verify.py`; R8 refuses one here.

## Feature Metadata

**Feature Type**: Spike (throwaway measurement + verdict)
**Estimated Complexity**: Medium — the mechanics and the metric are both de-risked (NOTES § pre-flight, 25 rows; all four risks measured or structurally closed). The judgement left is the predicate's reading and the write-up
**Primary Systems Affected**: none shipped. `.claude/plans/canvas-spike-s3/` only
**Dependencies**: Playwright at `tooling/visual-regression/node_modules` (capture only) · `~/Desktop/email-hub/.venv/bin/python` with `skimage` 0.26.0 (the CIEDE2000 oracle, control C1 only) · `node:zlib` (comparison)

## Related Work

**Implements**: [#300](https://github.com/linardsb/ux-factory/issues/300) · **Epic**: [#295](https://github.com/linardsb/ux-factory/issues/295), `docs/epics/canvas-design-import.architecture.md` § Spikes item 3 (lines 308–313) and § Data model (lines 161–163)

**Back-references**:

- `.claude/plans/design-import-epic-prd-handoff.md` §9.1 — spike A's three runs and its finding 5, "Wrong-but-green has no detector". The defect this spike detects.
- `.claude/plans/design-import-spike-c/README.md` — the fixture, the four read formats, and caveat 1 ("07.png was not persisted; the web editor returns PNG inline only"), which is why the reference is an SVG raster.
- `.claude/plans/canvas-import-prd-briefing.md:995` — E4, the metric's source, with its aggregation rule and its named self-deceiving shape.
- `.claude/plans/canvas-spike-s1/README.md` · `.claude/plans/canvas-spike-s2/README.md` — the spike deliverable shape (Verdicts · Setup · Timings · the numbers · the decision and its condition · Proving the checks · Not done · Files) and S1's Playwright resolution pattern.

**Forward-references**:

- (none yet — #307 consumes this verdict)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.claude/plans/design-import-spike-c/03c-master-blueprint.txt` (all 12 lines) — Why: the fixture's
  complete structure and every colour role with its literal. The candidate DOM is authored from this
  file, not from `04-htmlflex.html`. Note `s(hug:100,hug:100)` on "Text 3" and `s(fill,hug:100)` on
  "Text 1"/"Text 2": **`hug:100` means a 100 px box**, and the htmlFlex export drops it.
- `.claude/plans/design-import-spike-c/04-htmlflex.html` (the whole file, 12 lines) — Why: Brilliant's
  own flex translation. Use it to cross-check the candidate's box model (`gap: 12px`,
  `padding: 8px 12px`, `flex: 1 0 0`, `border-radius: 6px`, the `box-shadow` hairline pair, the
  chevron `<svg>` path verbatim). Do **not** render it as the candidate — it drops `hug:100`.
- `.claude/plans/design-import-spike-c/06.svg` (383 KB; read the head and `grep` it, do not `cat` it) —
  Why: the reference. Three `@font-face{...}` blocks carry Manrope 400/500/600 as base64 TTF; three
  `<text>` nodes carry Brilliant's own positions and fills.
- `.claude/plans/design-import-spike-a/tokens.polaris.spike.css` (lines 1–12 header, 17–18 the two
  defect tokens) — Why: run 3's real pack. `--color-fg: #0c3b2f` (line 17),
  `--color-fg-muted: #20828d` (line 18). Its header states 12/12 WCAG and three contrast negotiations.
- `system/wcag.mjs:26` `checkPairs(tokens, pairs)` — Why: the WCAG half of the verdict, run over both
  packs. Throws by name if a pair token is not `#rrggbb`.
- `system/derive.rules.mjs:181-193` `RULESET.wcagPairs` — Why: the twelve pairs, the same list
  `derive()` is held to. Pairs 1 and 3 are `color-fg` on `color-bg` / `color-bg-surface`.
- `system/oklch.mjs:14` `hexToRgb`, `:37` `rgbToOklab` — Why: control C6's second metric.
  **Convention: `{r,g,b}` are gamma-encoded sRGB in `[0,1]`** (`oklch.mjs:11`), so the decoder's
  0–255 bytes divide by 255 before entering.
- `.claude/plans/canvas-spike-s1/driver.txt` (lines 14–24) — Why: the Playwright resolution pattern to
  mirror verbatim: `createRequire` against `tooling/visual-regression${path.sep}`, then
  `require("@playwright/test")`.
- `tooling/drift-check.mjs:29,38` — Why: **every tracked `.mjs` gets `node --check`**, which is why
  the ticket says park the scripts as `.txt`.
- `agent-layer/gen-loc-summary.mjs:22-25` — Why: the three group regexes. None matches `.claude/**`,
  so this ticket moves no generated output. Prove it, don't assume it.
- `~/Desktop/email-hub/app/design_sync/visual_scorer.py:104` `_color_similarity`, `:115` the score
  formula, `:212` the MIN aggregation, `:41` `_DELTA_E_MAX = 100.0` — Why: E4 verbatim. Rung 1 of the
  ladder must reproduce this exactly, including the `/100` normalisation.

### New Files to Create

```
.claude/plans/canvas-spike-s3-wrong-but-green-300.md   this plan (committed FIRST — see Task 2)
.claude/plans/canvas-spike-s3-wrong-but-green-300.html the build brief
.claude/plans/canvas-spike-s3/
  README.md                the verdict document — AC #1
  mapping.json             the role map, the drop list in E1's three classes, the two packs
  capture.txt              PARKED: the Playwright capture driver (reference + four candidates + boxes)
  compare.txt              PARKED: the pure-Node, zero-dep comparison — the shape #307's gate inherits
  controls.txt             PARKED: the control battery and its mutation harness
  fixture/
    ref.png                Brilliant's 06.svg rasterised, 361x221, DSF 1 — the reference
    m1-faithful.png        map M1 under the faithful pack — the FLOOR render
    m1-wrong.png           map M1 under tokens.polaris.spike.css — the SIGNAL render  } the fixture pair
    m2-faithful.png        map M2 under the faithful pack
    m2-wrong.png           map M2 under tokens.polaris.spike.css
    m1-faithful-firefox.png   the FAITHFUL render only, for R3's platform envelope (Task 5a)
    m1-faithful-webkit.png    ditto — the verdict pair stays chromium
    regions.json           per-part rectangles in the shared 361x221 space, from the DOM
    harness-m1-faithful.html.txt   PARKED: all four harness pages, one per rendered variant
    harness-m1-wrong.html.txt      (the :root block is the only difference — what C8 exists to catch)
    harness-m2-faithful.html.txt
    harness-m2-wrong.html.txt
  raw/
    capture.txt            capture driver stdout, verbatim
    deltae.txt             comparison stdout, verbatim — the numbers
    controls.txt           the control battery, pristine half and mutated half
    engines.txt            the three-engine floor table — R3's envelope from this run's own data
    oracle.txt             the skimage CIEDE2000 cross-check, verbatim
    wcag.txt               checkPairs over both packs, verbatim
    timings.txt            date +%T stamps per step
```

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [CIEDE2000 — Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference Formula"](http://www2.ece.rochester.edu/~gsharma/ciede2000/)
  - Specific section: the formula's §2, and the supplementary test data
  - Why: the implementation's hue-rotation term `R_T` and the `h'` averaging rule are the two places a
    port silently goes wrong. **You do not need the paper's 34 test vectors** — control C1 uses
    `skimage.color.deltaE_ciede2000` as the oracle instead, which is the *same function E4 calls*.
- [scikit-image `deltaE_ciede2000`](https://scikit-image.org/docs/stable/api/skimage.color.html#skimage.color.deltaE_ciede2000)
  - Specific section: the note that its `kL` default is 1 (graphic-arts), not 2 (textiles)
  - Why: C1's cross-check must call it with the same weights the port uses. `rgb2lab` assumes D65 and
    sRGB, which is what Chromium writes into a PNG with no colour profile.
- [PNG spec, §9 Filtering](https://www.w3.org/TR/png-3/#9Filters)
  - Specific section: the five filter types and the Paeth predictor
  - Why: the decoder. Playwright writes bit depth 8, **colour type 2** (RGB, no alpha), non-interlaced
    — observed, see NOTES § pre-flight.

### Patterns to Follow

**Spike deliverable shape** — mirror `.claude/plans/canvas-spike-s2/README.md`'s section order exactly:
`# S3 — <name>` · a branch/scope header line · `## Verdicts` (a `| Q | Verdict | Evidence |` table) ·
`## Setup` · `## Timings` · the numbers · `## The decision, and its condition` ·
`## Proving the checks` (a `| control | mutation | what went red | positive control |` table) ·
`## Not done` · `## Files`.

**Parked scripts** — a `.txt` extension, a header comment naming what it is and how to run it. From
`.claude/plans/canvas-spike-s1/driver.txt:1-24`:

```js
// ... what this is, and the run line:
//   node driver.mjs [chromium|firefox|webkit|all] [a|b|c] [--throttle] ...
import { createRequire } from "node:module";
import path from "node:path";
// Playwright resolves from the MAIN TREE's tooling/visual-regression/node_modules — the CI-pinned
// gate's. A fresh worktree has no node_modules of its own (memory `local-agent-visual-gate-notes`)
const require = createRequire(`${VRDIR}${path.sep}`);
const pw = require("@playwright/test");
```

Run a parked script by copying it to a `.mjs` in the scratchpad, not by renaming it in the tree.

**Errors** — plain `Error`s whose message names the offending path or field, thrown at the boundary
(`system/wcag.mjs:30`, `system/oklch.mjs:16`). The decoder throws on any PNG shape it does not
handle, naming the chunk and the value: `png: <file>: colour type 6 unsupported (expected 2)`.

**Honesty** — every number in the README is observed and traceable to a file in `raw/`. Anything
derived says so and shows the arithmetic. Anything not run goes in `## Not done` with the reason.

---

## IMPLEMENTATION PLAN

### Phase 1: The predicate, committed before it can be tuned

The one phase that must not be reordered. The verdict rule and the aggregation ladder are written
into the plan and **committed to git** before a single fixture pixel is compared, so the repository's
own history shows the rule was not chosen after the numbers.

**Tasks:** branch off `origin/main`; commit this plan.

### Phase 2: The fixture

**Depends on:** Phase 1 (only for the branch).

Author the role map and the candidate DOM from the blueprint, capture five PNGs and the region
rectangles, commit them.

### Phase 3: The metric, proven before it is trusted

**Independent of:** Phase 2 — the comparison module and its whole control battery are synthetic and
read no fixture. The two phases can run in either order or in parallel.

Write the decoder and the CIEDE2000 port; prove both against an independent oracle and a mutation
battery, each control observed green **and** red.

### Phase 4: The measurement

**Depends on:** Phase 2 and Phase 3.

Run the comparison over the committed fixture, at three granularities, down the pre-declared ladder.
Run `checkPairs` over both packs. Nothing is interpreted yet — the raw stdout lands in `raw/`.

### Phase 5: The verdict and the hand-off

**Depends on:** Phase 4.

Write the README, read the predicate against the numbers, commit, open the PR, post the epic comment.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

Use information-dense keywords for clarity:

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase

---

### 1. CREATE the branch, off `origin/main`

- **IMPLEMENT**: `git fetch origin && git switch -c feature/canvas-spike-s3-wrong-but-green-300 origin/main`
- **PATTERN**: S1 `feature/canvas-spike-s1-substrate-load-297`, S2 `feature/canvas-spike-s2-blueprint-stack-299`.
- **GOTCHA**: The session may open on `feature/canvas-spike-s2-blueprint-stack-299`, whose commits
  are **not** on `main` (observed: `origin/main` is `2e6aabd`, four S2 commits sit above it). #300's
  `Depends on` is `none`; branching off S2 would drag its diff into this PR. Branch off `origin/main`.
- **GOTCHA**: Parallel sessions share this working directory (memory `shared-worktree-parallel-sessions`).
  Verify the branch immediately before every commit and stage by explicit path, never `git add -A`.
- **VALIDATE**: `git rev-parse --abbrev-ref HEAD && git merge-base --is-ancestor origin/main HEAD && echo "off main ✓" && git status --short | grep -c '^ M'` → `feature/canvas-spike-s3-wrong-but-green-300`, `off main ✓`, `0` *(expected — the branch does not exist until this task runs; `origin/main` = `2e6aabd` is observed)*
- **SATISFIES**: precondition for all ACs
- **REGENERATES**: none

### 1a. CREATE a dedicated worktree — the structural close on R4

- **IMPLEMENT**: `git worktree add ~/Desktop/Linards_current/wt-s3-300 feature/canvas-spike-s3-wrong-but-green-300`,
  then do every remaining task inside it. `MAIN=/Users/Berzins/Desktop/Linards_current/ux-factory`
  stays the path the scripts resolve Playwright and the spike-c fixtures from.
- **PATTERN**: `.claude/plans/canvas-spike-s1/driver.txt:17-23` — Playwright is resolved from the
  **main** tree's `tooling/visual-regression/node_modules` by absolute path, so a worktree needs no
  `npm ci` of its own.
- **GOTCHA**: This is R4's mitigation and it replaces "be careful with `git add`". The shared tree
  carries six unrelated untracked files; in a worktree they are simply not present.
- **GOTCHA**: Put the worktree under `/Users`, never `/private/tmp` — Docker file sharing does not
  reach the latter (memory `vr-gate-reads-working-tree`). Nothing in this ticket runs under Docker;
  the convention is kept so a later baseline regen in the same tree does not surprise anyone.
- **GOTCHA**: Remove it when the PR merges — `git worktree remove ~/Desktop/Linards_current/wt-s3-300`.
  The repo already carries two stale worktrees (`wt-292-restore`, `wt-spike-b`); do not add a third.
- **VALIDATE**: `git -C ~/Desktop/Linards_current/wt-s3-300 rev-parse --abbrev-ref HEAD && git -C ~/Desktop/Linards_current/wt-s3-300 status --short | wc -l` → the branch name, `0` *(expected)*
- **SATISFIES**: R4; precondition for every later task
- **REGENERATES**: none

### 2. CREATE the spike directory and commit **this plan** before any measurement

- **IMPLEMENT**: `mkdir -p .claude/plans/canvas-spike-s3/{fixture,raw}`; commit this plan file alone,
  message `spike(canvas): S3 — the plan, and the predicate it commits to before any pixel (#300)`.
- **PATTERN**: CLAUDE.md § Git — "A ticket's plan, report and review belong in the same PR". Here the
  plan lands in its **own first commit** so the timestamp ordering is evidence.
- **GOTCHA**: `git add .claude/plans/canvas-spike-s3-wrong-but-green-300.md` by explicit path. The
  working tree carries six unrelated untracked files (`__mock_discoveries.md`, two `.txt` transcripts,
  `__run0_discovery_worksheet.md`, S2's `.html`, `proposals-from-a-discovery-package-ticket.md`) that
  must not enter this commit.
- **VALIDATE**: `git log --oneline -1 && git show --stat HEAD | tail -3` → one file, the plan
- **SATISFIES**: the honesty half of AC #1 (the predicate is pre-committed)
- **REGENERATES**: none

### 3. CREATE `.claude/plans/canvas-spike-s3/mapping.json` — the role map and the drop list

- **IMPLEMENT**: A JSON object with three keys.
  - `map`: the roles that map, source role → contract token, with the source literal:
    ```json
    "M1": { "color.text.primary":  { "token": "--color-fg",       "sourceValue": "#454545" },
            "color.text.secondary":{ "token": "--color-fg-muted", "sourceValue": "#575757" } },
    "M2": { "...M1...",
            "color.surface":         { "token": "--color-bg-surface", "sourceValue": "#F8F8F8" },
            "color.outline.variant": { "token": "--color-border",     "sourceValue": "#E1E1E1" } }
    ```
  - `drops`: every source role not in the map, in E1's three classes (`never-read` ·
    `read-then-dropped` · `read-but-never-emitted`), with the literal it renders at in **both**
    candidates. Under M1 that is `color.surface` #F8F8F8, `color.outline.variant` #E1E1E1,
    `color.primary.container` #F2F5FA, `color.success.container` #F1F7F2, `color.success` #00C950,
    `color.text.disabled` #C6C6C6 — all `read-but-never-emitted` (the contract has no success,
    container or disabled role).
  - `packs`: `faithful` = the source literals on the mapped tokens; `wrong` = the values
    `tokens.polaris.spike.css` emits for the same tokens, **copied from that file, not retyped**.
- **PATTERN**: E1's three classes, `.claude/plans/canvas-import-prd-briefing.md:989-992`.
- **GOTCHA**: The drops are the fixture's **control regions**. Under M1 they render identically in
  both candidates, so avatar / chip / chevron must score at the floor in both — if one of them moves,
  the harness has a bug, not the mapping. Say this in the README.
- **GOTCHA**: Hex case. `06.svg` writes lowercase (`fill="#575757"`, `fill="#00c950"`), the blueprint
  writes uppercase (`#575757`, `#00C950`), `tokens.polaris.spike.css` writes lowercase. CSS does not
  care; `system/oklch.mjs:15`'s regex accepts both; string comparisons in the controls must
  `.toLowerCase()` first.
- **VALIDATE**: `node -e "const m=require('./.claude/plans/canvas-spike-s3/mapping.json'); const t=Object.keys(m.map.M1).length, d=m.drops.length; console.log('M1 roles',t,'drops',d,'total',t+d); if(t+d!==8) throw new Error('the fixture has 8 colour roles, got '+(t+d))"` → `M1 roles 2 drops 6 total 8` *(expected)*
- **REDDENS**: delete one entry from `drops` → the assertion throws `the fixture has 8 colour roles, got 7`.
  The eight are the roles the **active** state renders, counted from `03c-master-blueprint.txt`
  **lines 3–10** (the `variant(state(active))` subtree):
  `sed -n '3,10p' .claude/plans/design-import-spike-c/03c-master-blueprint.txt | grep -o 'tok(color[a-z.-]*' | sort -u | wc -l` → **8** (observed).
  Do **not** grep the whole file: the master carries both variants, and the `away` lane adds
  `color.warning.container` and `color.on-warning`, giving **10** — two roles the exported instance
  `1db1b29957b949ca` (which is `at(state(active))`) never renders. The instance's own blueprint
  `03-blueprint.txt` shows only **6**, because `color.surface` and `color.outline.variant` live on the
  master's variant node rather than on the derived children.
- **SATISFIES**: AC #1 (the mapping the README reports), AC #2
- **REGENERATES**: none

### 4. CREATE `.claude/plans/canvas-spike-s3/capture.txt` — the Playwright capture driver

- **IMPLEMENT**: One parked ES module, run as `node capture.mjs` from the scratchpad. Five steps:
  1. Read `06.svg`; extract the three `@font-face{...}` blocks with `/@font-face\{[^}]*\}/g`.
  2. Rasterise the reference: a page with `html,body{margin:0;padding:0;background:#fff}` plus the
     SVG inlined; `await page.evaluate(() => document.fonts.ready)`; `(await page.$("svg")).screenshot({ path: "ref.png" })`.
  3. Build the candidate harness from `mapping.json` + the blueprint — one HTML string parameterised
     by `(mapVariant, packVars)`. Write **all four** rendered variants to
     `fixture/harness-<m1|m2>-<faithful|wrong>.html.txt`, not one "representative" file: the `:root`
     block is the only thing that differs between them, and it is the one thing C8 exists to catch.
  4. Render four candidates (M1/M2 × faithful/wrong); screenshot `.root` to the four PNGs.
  5. Read `boundingBox()` for every `[data-part]` in the M1-faithful render, subtract the root's
     origin, round to integers, and write `fixture/regions.json`. Every node in the candidate carries
     `data-part`: `row`, `avatar`, `text-block`, `title`, `subtitle`, `chip`, `chip-text`, `chevron`.
     **The eight boxes this produces are already observed** (pre-flight row 21), so they are a check on
     the harness rather than an unknown:

     ```
     row        0,0   360x220      title      56,8    143x100
     avatar     12,94  32x32       subtitle   56,112  143x100
     text-block 56,8  143x204      chip      211,56   116x108
     chip-text 219,60 100x100      chevron   339,102    9x16
     ```
- **PATTERN**: `.claude/plans/canvas-spike-s1/driver.txt:14-24` for Playwright resolution —
  `createRequire(\`${VRDIR}${path.sep}\`)` then `require("@playwright/test")`.
- **IMPORTS**: `node:module` `createRequire` · `node:path` · `node:fs` `readFileSync, writeFileSync` ·
  `@playwright/test` `{ chromium }`
- **GOTCHA — the fonts are the whole experiment.** Manrope is not installed on this machine. Without
  the SVG's three embedded `@font-face` blocks in the candidate's `<style>`, Chromium falls back to
  `system-ui` and every text pixel differs, drowning the signal. Inject them verbatim.
- **GOTCHA — `hug:100` is a 100 px box.** `03c-master-blueprint.txt:6,7` give the two text nodes
  `s(fill,hug:100)` and `:9` gives "Text 3" `s(hug:100,hug:100)`. The candidate needs
  `.t1,.t2{height:100px}` and `.t3{width:100px;height:100px}`. Omitting the chip's pair renders it as
  a small pill where Brilliant renders a ~116x108 circle (`rd(9999)` over a 100 px box) — **measured:
  that one omission raises the whole-image floor from 4.37% of pixels differing to 15.31%**.
  `04-htmlflex.html` drops `hug:100` entirely — this is spike C's noted fixture geometry flaw, and it
  is why the candidate is authored from the blueprint and not from the htmlFlex export.
- **GOTCHA**: `deviceScaleFactor: 1` explicitly. A retina default would write a 722x442 PNG and
  nothing would align.
- **GOTCHA**: The viewport must exceed the element (400x260 for a 361x221 element) or the screenshot
  clips.
- **VALIDATE**: `node capture.mjs && node -e "const{readFileSync}=require('fs');for(const f of ['ref','m1-faithful','m1-wrong','m2-faithful','m2-wrong']){const p=readFileSync('fixture/'+f+'.png');console.log(f,p.readUInt32BE(16)+'x'+p.readUInt32BE(20),'depth',p[24],'ct',p[25],'interlace',p[28]);}"` → five lines, each `361x221 depth 8 ct 2 interlace 0` *(expected — the reference's shape is observed, see NOTES)*
- **REDDENS**: remove the `@font-face` injection → the floor's whole-image differing-pixel share jumps from ~4% to >15% and the title region's mean rises above the subtitle's signal. Remove `deviceScaleFactor: 1` → the PNG reads `722x442` and the validate line fails on the dimension.
- **SATISFIES**: AC #2
- **REGENERATES**: none

### 5. RUN the capture; commit the fixture

- **IMPLEMENT**: Run Task 4's driver; copy the five PNGs, `regions.json`, `harness.html.txt` into
  `fixture/` and the stdout into `raw/capture.txt`. Commit.
- **GOTCHA**: The reference and the candidates must be captured in the **same** browser launch. A
  second launch can pick up a different font-rendering state.
- **VALIDATE**: `node -e "const r=require('./.claude/plans/canvas-spike-s3/fixture/regions.json'); const names=r.map(x=>x.name).sort(); console.log(names.join(',')); const bad=r.filter(x=>x.x<0||x.y<0||x.x+x.w>361||x.y+x.h>221); if(bad.length) throw new Error('region outside the frame: '+JSON.stringify(bad))"` → the part names, no throw *(expected)*
- **REDDENS**: subtract the root's origin twice → every `x`/`y` goes negative and the check throws
  `region outside the frame: [...]`. Its positive control is that the names printed are the six the
  fixture has (`row`, `avatar`, `title`, `subtitle`, `chip`, `chip-text`, `chevron`) — a `regions.json`
  of length 0 also passes the bounds test vacuously, so assert the count too.
- **SATISFIES**: AC #2
- **REGENERATES**: none

### 5a. RUN the faithful capture on **all three engines** — R3's envelope, from the run's own data

- **IMPLEMENT**: Re-run the capture with `firefox` and `webkit` for the **M1-faithful** render only,
  writing `fixture/m1-faithful-firefox.png` and `-webkit.png`. The verdict pair stays chromium; these
  two exist so the README's platform envelope is measured by this run rather than quoted from the
  plan.
- **GOTCHA**: Only the faithful render is captured on the extra engines. Capturing the wrong render
  three ways would invite reading a verdict off whichever engine separates best — the shopping bias
  the whole predicate exists to prevent.
- **GOTCHA**: All three must come out `361x221`. WebKit writes a visibly larger PNG (**9,600 bytes vs
  chromium's 7,308**, observed) at the same dimensions — heavier anti-aliasing, not a different size.
- **VALIDATE**: `node compare.mjs --engines` → a three-row table, worst rung-6 floor across engines.
  *(Expected ≈ **2.689**, WebKit `subtitle`; observed in pre-flight row 23. A materially different
  number means the harness changed, not the engines.)*
- **REDDENS**: capture the extra engines at the default `deviceScaleFactor` → WebKit writes `722x442`
  and the decoder throws on the dimension mismatch before any number is produced.
- **SATISFIES**: R3, and the README's platform section
- **REGENERATES**: none

### 6. CREATE `compare.txt` part 1 — the zero-dependency PNG decoder

- **IMPLEMENT**: `decodePng(file) -> { w, h, data /* Buffer, w*h*3 */ }`. Walk the chunk list from
  byte 8 (`readUInt32BE` length, 4-byte type, data, 4-byte CRC); read `IHDR`; concatenate every
  `IDAT`; `zlib.inflateSync`; unfilter `h` rows of `1 + w*3` bytes with filter types 0–4 (None, Sub,
  Up, Average, Paeth). Ignore `pHYs`, `tEXt`, `iCCP`, `sRGB`, `gAMA`. Throw by name on bit depth != 8,
  colour type != 2, `interlace != 0`, or a compression/filter method != 0.
- **PATTERN**: boundary validation that throws naming the offending path — `system/wcag.mjs:30`.
- **IMPORTS**: `node:zlib`, `node:fs`
- **GOTCHA**: PNG is written in **multiple** IDAT chunks (observed on a 361x221 Playwright shot:
  `IDAT:4096 IDAT:3142 IDAT:6`). Inflating only the first gives a truncated image and a silently
  wrong answer — concatenate first, inflate once.
- **GOTCHA**: The Sub/Average/Paeth predictors read the *already unfiltered* bytes of the current row,
  not the raw ones. Write into the output buffer and read neighbours back out of it.
- **VALIDATE**: `node -e "..."` asserting `h * (1 + w*3) === inflated.length` on `fixture/ref.png` →
  `239564 === 239564` (**observed**: 221 x 1084 = 239,564)
- **REDDENS**: replace the Paeth branch with `v += a` → the arithmetic identity still holds (it is a
  length check, not a content check) but control C2 (Task 8) goes red on pixel content. **Both checks
  are needed; neither alone is sufficient** — the length check cannot see a wrong predictor, and
  that is the class of check this repo has been burned by (memory `check-that-cannot-fail`).
- **SATISFIES**: AC #1, and the shape #307's gate inherits
- **REGENERATES**: none

### 7. CREATE `compare.txt` part 2 — CIEDE2000 and the aggregation ladder

- **IMPLEMENT**:
  - `rgbToLab([r,g,b] 0..255)` — sRGB → linear → XYZ (D65) → CIELAB. Reuse `srgbToLinear` from
    `system/oklch.mjs:33` by import rather than a second copy.
  - `ciede2000(lab1, lab2, {kL:1, kC:1, kH:1})` — the full formula including `R_T`.
  - `blur(rgb, sigma)` — a separable Gaussian applied **per channel** (no cross-channel bleed), σ fixed
    at **1.5** for rung 4. Hand-written; there is no `scipy` here and no dependency may be added.
  - `regionStats(...)` returning **all six rungs at once**:
    `{ mean, p95, p99, max, blurMean, inkMean, inkColourDeltaE, fracOverJnd, fracOver5, n, inkN, modalHex, modalFrac }`.
  - `inkMask(region)` — a region's ink is the pixels whose ΔE from **that region's own modal colour**
    exceeds 2.3. Rung 5 masks the **reference** and applies the mask to both. Rung 6 masks **each image
    by its own modal**, averages the ink colour inside each, and takes CIEDE2000 between the two
    averages — which is what makes it registration-invariant.
  - **The region-size rule (R2), fixed before the run:** a region under **256 px** of area is computed
    and printed but **excluded from the aggregation that decides a rung**, and named in an
    `excluded:` line. Mirrors `visual_scorer.py:32`'s `_MIN_SECTION_HEIGHT_PX = 8`. On this fixture it
    removes exactly one region, `chevron` (144 px); the next smallest is `avatar` at 1,024 px.
  - **The mask-degenerate rule (F4):** a region whose `inkN/n` exceeds **0.5** is printed with its
    `modalHex` and `modalFrac` and marked `mask-degenerate: reported, not scored`. It may never be the
    worst region that decides a rung.
  - `aggregate(regions, rung)` — rung 1 returns E4 verbatim: per region `score = 1 - mean/100`, and
    the overall is `MIN(scores)`. **`if (regions.length === 0) throw new Error("fidelity: no region was measured — an empty measurement is missing, never a pass")`.**
- **PATTERN**: `visual_scorer.py:115` for rung 1's exact formula and `:41` for `_DELTA_E_MAX = 100.0`.
- **GOTCHA — do not write `sum/max(len,1)`.** That is E4's named self-deceiving shape: it returns 1.0
  exactly when nothing was measured. It is the architecture's stated refusal (`architecture.md:163`)
  and control C5 exists to prove the refusal fires.
- **GOTCHA**: `system/oklch.mjs:11` — `{r,g,b}` are in `[0,1]`, not `[0,255]`. Divide the decoder's
  bytes by 255.
- **GOTCHA**: CIEDE2000's `h'` mean has a branch for `|h1'-h2'| > 180°` and another for `C1'C2' == 0`.
  Both are easy to omit and both produce plausible-looking numbers. C1 is what catches it.
- **GOTCHA — σ is not a parameter to sweep.** 1.5 was chosen in pre-flight from a four-point sweep
  (σ = 0 / 1.0 / 1.5 / 2.0 gave title floors 1.309 / 0.60 / 0.41 / 0.33) and fixed **before the signal
  exists**. Do not re-sweep it against the verdict pair; that turns the rung into a tuned parameter.
- **VALIDATE**: `node -e "…"` printing ΔE for four known pairs → `#454545/#0c3b2f 18.2154` ·
  `#575757/#20828d 23.1670` · `#f8f8f8/#ffffff 1.4004` · `#000000/#ffffff 100.0000`
  (**observed** from the skimage oracle; tolerance 1e-3)
- **REDDENS**: drop the `R_T` rotation term → `#000000/#ffffff` still reads 100.0 and
  `#454545/#0c3b2f` barely moves, but a blue-region pair diverges from the oracle by >1 — which is
  exactly why C1 samples random pairs and not just these four.
- **SATISFIES**: AC #1
- **REGENERATES**: none

### 8. CREATE `controls.txt` — eleven controls, each observed green **and** red

- **IMPLEMENT**: A battery of **eleven** controls run in two halves, mirroring `.claude/plans/canvas-spike-s2/README.md`
  § Proving the checks: half 1 pristine, half 2 applies each mutation by source replacement, re-runs,
  restores. The harness prints `MUTATION DID NOT APPLY` for a no-op replacement, and
  `grep -c "DID NOT APPLY" raw/controls.txt` must be **0**.

  | control | what it proves | mutation |
  |---|---|---|
  | **C1** | the CIEDE2000 port equals `skimage.color.deltaE_ciede2000` over 500 pseudo-random sRGB pairs (fixed seed), max abs diff < 1e-3 | delete the `R_T` term |
  | **C2** | the decoder is correct on content, not just on length: render a canvas of known flat colours, screenshot, decode, compare every block to its known hex | replace the Paeth branch with `v += a` |
  | **C3** | identity — `ref.png` against itself is ΔE 0 and score 1.0 under **every** rung and **every** granularity | offset the candidate region slice by one row |
  | **C4a** | a known swap measures right, **exactly** — on a *synthetic* region of one solid colour (no anti-aliasing), recolour it and assert the ink-masked mean **equals** that pair's ΔE to 1e-9 | halve the ink threshold; the mask admits the region's border and the mean falls |
  | **C4b** | the same swap on the **real** region is a **bound, not an identity** — `0.5 x pairΔE <= inkMean <= pairΔE` | recolour only half the glyph pixels; `inkMean` drops through the lower bound |
  | **C5** | **an empty measurement is missing, never a pass** — zero regions must throw, naming the failure | restore `sum/max(len,1)`; it prints `1.0` |
  | **C6** | metric agreement — Oklab ΔE (`system/oklch.mjs:37`) ranks the same worst region as CIEDE2000 | (no mutation; a disagreement stops the run and is reported, not worked around) |
  | **C7** | the regions land on the right content — in `ref.png` the `avatar` region's modal colour is `#f2f5fa` and the `chip` region's is `#f1f7f2` | shift every box by 20 px; both modal colours change |
  | **C8** | **the harness measured what it claims to.** Under M1 the six dropped roles render at the *same literal* in both candidates, so `avatar`, `chip`, `chip-text` and `chevron` are byte-identical between `m1-faithful.png` and `m1-wrong.png`: `worst(FLOOR, those)` and `worst(SIGNAL, those)` must agree to 1e-9 | point the "wrong" render's `:root` block at the faithful values. **C8 stays green** — the drops were never going to move — while the two mapped regions collapse to the floor and rung 1's signal vanishes. That is the point: C8 catches a wrong pack link, a stale PNG or a mis-parameterised harness, and it is a different failure from anything C1–C7 reaches |
  | **C9** | **rung 6 is registration-invariant, which is the whole reason it is in the ladder** — shift the candidate region by one pixel in x and one in y; `inkColourDeltaE` must move by < 0.5 while rung 5's `inkMean` moves by > 5 | make rung 6 compare *per-pixel* ink instead of the two ink **averages**; the one-pixel shift now moves it like rung 5 and the invariance is gone |
  | **C10** | **rung 6's own limitation is stated, not hidden** — under **M2** the surface role moves `#f8f8f8 → #ffffff`, so each image's modal colour moves and the ink blends shift with it. Assert that M2's rung-6 floor is measurably worse than M1's, and report both | hold the modal fixed to M1's value instead of reading each image's own; the M2 floor collapses and the limitation becomes invisible |

- **PATTERN**: S2's control table and its `MUTATION DID NOT APPLY` guard.
- **IMPORTS**: C1 shells out to `~/Desktop/email-hub/.venv/bin/python` via `node:child_process`
  `execFileSync`; the pairs and the JS results go over stdin as JSON.
- **GOTCHA**: C1's oracle must be called with the same weighting the port uses. `skimage`'s
  `deltaE_ciede2000` defaults to `kL=1` — graphic arts, not textiles. If the port hard-codes `kL=2`
  the two disagree by a constant factor on the lightness axis only, which looks like a rounding
  problem and is not.
- **GOTCHA**: `~/Desktop/email-hub/.venv/bin/python` is the only interpreter here with `skimage`
  (**observed**: system `python3` raises `ModuleNotFoundError: No module named 'skimage'`; the venv
  reports 0.26.0). If it has gone, C1 falls back to Sharma's published test data and the README says
  which oracle was used.
- **GOTCHA**: C2 cannot use `ref.png` — its correctness is what is in question. Generate the control
  image in the page from known values.
- **GOTCHA — C4 is two controls because only one of them can be exact.** The ink mask selects pixels by
  ΔE-from-modal > 2.3, which admits partially-covered anti-aliased pixels beside solid glyph cores. An
  in-memory recolour maps `#454545 → X` only where the pixel was *exactly* `#454545`; the AA pixels were
  blends and become different blends at a smaller ΔE. So the real region's ink mean lands **below** the
  pair's ΔE by a coverage-weighted amount nothing can predict to 1e-3. C4a gets the identity on solid
  synthetic input; C4b states a bound on the fixture. **Do not "fix" a failing identity by loosening its
  tolerance** — that is how a tolerance stops meaning anything.
- **GOTCHA — two regions have no stable mode, and rung 4's mask depends on one.** The chevron is
  9x16 = 144 px and is nearly all glyph or AA, so its modal colour may *be* ink and the mask inverts.
  The chip region holds a rounded fill over the row surface — two large flat populations, and the mode
  picks one arbitrarily. Report the mask per region with its `inkN`, its `n` and its modal hex, and mark
  any region whose `inkN/n` exceeds 0.5 as **mask-degenerate: reported, not scored**. A degenerate
  region must never be the worst region that decides a rung.
- **VALIDATE**: `node controls.mjs | tee raw/controls.txt; grep -c "DID NOT APPLY" raw/controls.txt` → `0`, and every control printing `PASS` in half 1 and its own named `FAIL` in half 2
- **REDDENS**: each row's mutation column above is the reddening mutation, and its observed failure
  message goes in the README's table.
- **SATISFIES**: AC #1 (Proving the checks)
- **REGENERATES**: none

### 9. RUN the comparison over the fixture; record verbatim

- **IMPLEMENT**: `node compare.mjs > raw/deltae.txt`. Three granularities x **six** rungs x two pairs
  (floor = `ref` vs `m1-faithful`, signal = `ref` vs `m1-wrong`) plus the M2 pair as a second block.
  Granularities:
  - **(a) whole image** — one region, 361x221.
  - **(b) E4's y-bands** — **five** equal-height horizontal strips. E4 derives bands from an email's
    vertical sections; a list row has none, so any band count is arbitrary. **Five, fixed here before the
    run and arbitrary by admission** — do not try three and seven and keep the better one. That
    y-bands misfit a horizontal component is the finding; the number is not a parameter.
  - **(c) per-part boxes** — `fixture/regions.json`. This is the granularity the production path has,
    because the IR is a node tree (`architecture.md:167-171`).
- **GOTCHA**: The comparison must read only the **committed** PNGs, never re-render. That is what
  makes it the shape #307's `build-checks` group inherits — a pure Node gate with no browser.
- **VALIDATE**: `node compare.mjs --self fixture/ref.png` → every rung 0 / score 1.0000 (this is C3
  run against the real fixture, not synthetic input)
- **REDDENS**: offset the second image's row index by one inside the region reader → `--self` stops
  reading 0 and reports a non-zero ΔE on every text region. This is the check that catches a region
  reader that silently mis-slices, which no other validation in the plan can see.
- **SATISFIES**: AC #1
- **REGENERATES**: none

### 10. RUN `checkPairs` over both packs; record verbatim

- **IMPLEMENT**: A short script importing `checkPairs` from `system/wcag.mjs` and `RULESET` from
  `system/derive.rules.mjs`, parsing the `--token: value;` pairs out of each pack, printing the
  twelve rows and the pass count for **both** the faithful pack and `tokens.polaris.spike.css`.
  Output to `raw/wcag.txt`.
- **GOTCHA**: `checkPairs` throws if a pair token is not `#rrggbb` (`wcag.mjs:30`). The faithful pack
  maps only two roles, so it must be built by **overlaying** its two values onto
  `system/tokens.neutral.css`'s full token map — a two-token object alone throws on pair 5.
- **VALIDATE**: `node wcag-probe.mjs | tail -2` → `polaris (run 3): 12/12 pass` (**observed this
  session**: `color-fg #0c3b2f` on `#ffffff` = 12.48:1 pass; `color-fg-muted #20828d` on `#ffffff`
  = 4.53:1 pass)
- **REDDENS**: change `--color-fg` to `#20828d` in a copy of the pack → pair 1 reads 4.53 and still
  passes; change it to `#cccccc` → pair 1 fails at 1.61 and the count reads 11/12. The first half is
  the point: **the pack's formal check cannot distinguish a right colour from a wrong one.**
- **SATISFIES**: AC #1 (the "12/12 WCAG stays green" half of the question)
- **REGENERATES**: none

### 11. CREATE `.claude/plans/canvas-spike-s3/README.md` — the verdict document

- **IMPLEMENT**: The S2 section order. Specifically:
  - A header line: the branch, the date, and one sentence of scope.
  - `## Verdicts` — a table answering **Q1** (does rung 1, E4 verbatim, read red?), **Q2** (does any
    rung separate signal from floor, and which?), **Q3** (does WCAG stay 12/12?), each with its
    `raw/` evidence file.
  - `## Setup` — the fixture's provenance, and **two named deviations, stated not smuggled**:
    (1) the reference is `06.svg` rasterised in Chromium, **not** Brilliant's `export(png)`, because
    spike C's caveat 1 records that the web editor returns PNG inline only and persists nothing;
    (2) the element is spike C's Brilliant fixture, **not** a Polaris artefact — the spike reproduces
    spike A's *defect class* by rendering the real `tokens.polaris.spike.css` values on this element's
    roles.
  - `## Timings`.
  - The numbers: the 3x5x2 table, plus the drop-region control row.
  - `## The decision, and its condition` — the predicate **copied verbatim from this plan** (it is
    already in git from Task 2), then the reading.
  - `## Proving the checks` — the eleven controls, each with its mutation and its observed red message.
  - `## The floor, and why it decides the metric` — R1 in the run's own numbers: rung 5's failure,
    the blur sweep, and rung 6. This section is the spike's most transferable finding and #307's
    actual input.
  - `## Platform` — the three-engine table and the worst rung-6 floor as a number, with a sentence on
    whether it can close the observed margin.
  - `## Not done`.
  - `## Files`.
- **GOTCHA — platform.** Every number is macOS Chromium. A margin measured here is not a Linux CI
  threshold (memory `local-agent-visual-gate-notes`: the visual gate's baselines are Linux, and a
  local macOS run fails 16 for platform reasons alone). The README must say **#307 re-measures on
  Linux before pinning a threshold**, and must state whether the observed margin is wide enough that
  platform variance plausibly cannot close it.
- **GOTCHA — the epic's stated fallback is a no-op.** `architecture.md:312-313` says "green → try
  per-section MIN before dropping it". Per-section MIN **is** E4's specified aggregation
  (`visual_scorer.py:212`), so as written the fallback re-runs rung 1. Name this in the README and in
  the epic comment; the real fallback space is *within*-region (rungs 2–5), not across regions.
- **GOTCHA**: Copy is never indented and never blockquoted (memory `copy-never-indented`) — the epic
  comment body in particular.
- **VALIDATE**: `grep -c "^## " .claude/plans/canvas-spike-s3/README.md` → `10`; and
  `awk '/^## The decision/,/^## Proving/' README.md | grep -c "2.3"` → ≥1 (the predicate's JND is present)
- **REDDENS**: drop the `## Timings` section → the header count reads `9`. The count is the weak half of
  this check; the load-bearing half is the `2.3` grep, which reddens if the predicate is paraphrased
  instead of copied — the one failure mode that would let the rule drift after the numbers.
- **SATISFIES**: AC #1
- **REGENERATES**: none

### 12. VERIFY no generated output moved

- **IMPLEMENT**: Stage everything, then run the drift gates.
- **GOTCHA**: `gen-loc-summary --check` reads **git-tracked content**, so running it before staging is
  a false "no drift" (memory `loc-summary-counts-tracked-only`). Stage first, then check.
- **VALIDATE**:
  `git add .claude/plans/canvas-spike-s3 .claude/plans/canvas-spike-s3-wrong-but-green-300.*` then
  `node agent-layer/gen-loc-summary.mjs --check && node agent-layer/gen-param-count.mjs --check && node tooling/build-checks.mjs | tail -1`
  → `loc summary ✓  3 groups — no drift` · `param count ✓  120 controls — no drift` ·
  `build ✓  all 34 groups pass` (**all three observed on the clean tree this session**).
  *(Expected `no drift` for this ticket's files: `gen-loc-summary.mjs:22-25`'s three regexes are
  `^system/(wc/)?[^/]+\.(css|mjs|js)$`, `^(?:[^/]+|proto/[^/]+)\.html$` and
  `^agent-layer/[^/]+\.mjs$` — none can match a path under `.claude/`.)*
- **REDDENS**: this task asserts an absence, so its positive control is mandatory — **and a small edit
  is not one.** `gen-loc-summary` rounds every count to the nearest 100 (`gen-loc-summary.mjs:5-6`), so
  appending a line, or even a short file, leaves the artifact byte-identical and the `--check` green for
  the wrong reason. The control that actually fires, **driven this session**:
  ```
  python3 -c "print('\n'.join('// probe line %d'%i for i in range(200)))" > system/__probe_s3.mjs
  git add system/__probe_s3.mjs && node agent-layer/gen-loc-summary.mjs --check
  #  → loc summary ✗  drift from tracked source: system/loc-summary.json — regenerate with: …   (exit 1)
  git rm --cached -q system/__probe_s3.mjs && rm system/__probe_s3.mjs
  ```
  200 lines clears the rounding; `git add` is required because the generator reads **tracked** content
  (memory `loc-summary-counts-tracked-only`). Revert immediately — this working tree is shared with
  parallel sessions.
- **SATISFIES**: no-regression
- **REGENERATES**: none — proven, not assumed

### 13. COMMIT and open the PR

- **IMPLEMENT**: One commit for the fixture, one for the scripts + raw, one for the README, matching
  S2's per-artefact commit rhythm. Then `gh pr create` with a body carrying **`Closes #300`**.
- **PATTERN**: CLAUDE.md § Git — message = what + doc reference, e.g.
  `spike(canvas): S3 — ΔE-MIN against a foreign render, verdict on the committed fixture (#300)`.
- **GOTCHA**: A PR **title** mentioning `(#300)` closes nothing (memory `prs-dont-auto-close-tickets`).
  The trailer goes in the **body**.
- **GOTCHA**: CI's CodeQL gate has two legs and leg 2 reads `refs/heads/main`; an alert `main` already
  carries reds every open PR (memory `codeql-leg2-blocks-its-own-fix`). If leg 2 is red and leg 1 is
  green, that is not this PR's defect.
- **VALIDATE**: `gh pr view --json body --jq '.body' | grep -c "Closes #300"` → `1`
- **REDDENS**: put `Closes #300` in the title instead of the body → the grep reads `0`. That is the exact
  mistake memory `prs-dont-auto-close-tickets` records costing a planning pass.
- **SATISFIES**: AC #1, AC #2
- **REGENERATES**: none

### 14. POST the verdict as a comment on epic #295

- **IMPLEMENT**: `gh issue comment 295 --body-file <path>`. The comment: the question, the branch
  taken under the decision rule, the numbers that decided it, the rung #307 should build on, the two
  named deviations, and the platform caveat. Mirror the S1/S2 comment shape.
- **GOTCHA — outward-facing.** Show the owner the comment body and get a yes before posting. S2 posted
  AC #3 as its own commit after the review (`5abfdf5`), so a follow-up commit is the established
  rhythm if the body changes.
- **GOTCHA**: The decision rule has two legs and they are not symmetric. Red → "the detector exists".
  Green → "the aggregation is wrong, not the idea". A **"green on rung 1, red on rung N"** reading is
  neither leg as written; report it as what it is and say which leg it is closer to, rather than
  rounding it to a leg.
- **VALIDATE**: `gh issue view 295 --json comments --jq '.comments[-1].body' | head -5` → the S3 verdict
- **SATISFIES**: AC #3
- **REGENERATES**: none

---

## TESTING STRATEGY

There is no suite and no linter in this repo (CLAUDE.md § Ground rules). "Done" means the surfaces
touched were run. This ticket touches no shipped surface, so its gates are its own control battery
plus the repo's drift gates.

### Unit Tests

None. The control battery (Task 8) is the test layer: eleven controls, each run pristine and mutated,
with both halves committed verbatim in `raw/controls.txt`.

### Integration Tests

`node compare.mjs` over the committed fixture, and `node compare.mjs --self fixture/ref.png` as the
identity run. Both outputs committed.

### Edge Cases

- **Zero regions** — must throw, never score. C5.
- **A region smaller than the ink threshold can resolve** — the chevron is 9x16 = 144 px and read a
  31% differing-pixel share at the floor (**observed** in the pre-flight, whole-image scale). A region
  that small has almost no background to dilute it, so it can dominate a MIN aggregation for reasons
  unrelated to the mapping. Report it; do not exclude it silently.
- **A colour change below the JND** — `#f8f8f8` → `#ffffff` is **ΔE 1.40** (observed). Under M2 the
  surface role moves and a human cannot see it. The detector must not call that red, and the README
  should say so: it is evidence the metric is perceptual rather than merely different.
- **Both images identical** — score 1.0 and that is correct, which is exactly why "1.0" must be
  distinguishable from "nothing measured". C5.

### Proving the checks

Every check this plan adds carries the mutation that reddens it (its REDDENS field) and one positive
control — an input that must make it fire, run before you trust a green. A check that passes because
it never reached the thing it tested is this repo's largest class of process review finding, by a wide
margin (59 of 229).

Two here deserve naming because a green is cheap and meaningless:

- **Task 6's length identity** (`h*(1+w*3) === inflated.length`) is green under a broken Paeth
  predictor. C2 is the check that can fail.
- **Task 12's `--check`** is green on any tree that does not touch `system/`. Its positive control —
  append a blank line to `system/dock.mjs`, re-run, see drift, revert — is mandatory.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
node tooling/drift-check.mjs          # includes `node --check` over every tracked .mjs
```
The spike's scripts are parked as `.txt` and are deliberately **not** in that set
(`tooling/drift-check.mjs:29`). Syntax-check them by hand after copying to the scratchpad:
```bash
for f in capture compare controls; do cp .claude/plans/canvas-spike-s3/$f.txt /tmp/$f.mjs && node --check /tmp/$f.mjs && echo "$f ✓"; done
```

### Level 2: Unit Tests

```bash
node controls.mjs | tee .claude/plans/canvas-spike-s3/raw/controls.txt
grep -c "DID NOT APPLY" .claude/plans/canvas-spike-s3/raw/controls.txt   # must be 0
```

### Level 3: Integration Tests

```bash
node compare.mjs --self .claude/plans/canvas-spike-s3/fixture/ref.png    # every rung 0, score 1.0000
node compare.mjs | tee .claude/plans/canvas-spike-s3/raw/deltae.txt
node wcag-probe.mjs | tee .claude/plans/canvas-spike-s3/raw/wcag.txt
```

### Level 4: Manual Validation

Open `fixture/ref.png` and `fixture/m1-wrong.png` side by side. The body text must be visibly green in
the second and near-black in the first, and nothing else may have moved. If anything else moved, the
harness is measuring the harness.

### Level 5: Additional Validation (Optional)

```bash
node tooling/build-checks.mjs                       # the repo's main gate; must stay green
node agent-layer/gen-loc-summary.mjs --check        # after staging
node agent-layer/gen-param-count.mjs --check
```

### Paid and owner-only steps

| Step | Cost (expected) | Blocks the PR? | If not run: tracker |
|---|---|---|---|
| Brilliant **desktop** `export(png, outputPath)` of `1db1b29957b949ca`, to replace the SVG raster with a true PNG export | owner's hand — the desktop app must be running and `init`-bound; ~5 min, no API spend | **no** — the SVG raster is Brilliant's own geometry and fonts, and the deviation is named in the README | README § Not done + one line in the epic comment; #307 decides whether it wants the upgrade |
| Posting the verdict to epic #295 (AC #3) | owner's nod — outward-facing | yes, for AC #3 only | if the owner has not replied, commit the body as `raw/epic-comment.md` and post in a follow-up commit, the S2 rhythm (`5abfdf5`) |
| `~/Desktop/email-hub/.venv` reachability for C1's oracle | none | no | if the venv has gone, C1 falls back to Sharma's published test data and the README names which oracle was used |

No step in this ticket spends API tokens or runs an agent.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** `.claude/plans/canvas-spike-s3/README.md` records: the fixture pair (source PNG +
      rendered mapping), the ΔE numbers **per region**, WCAG **per pair**, the aggregation(s) tried,
      the verdict, and the branch. *(ticket AC #1)*
- [ ] **AC2** The comparison scripts are parked as `.txt`, and the fixture pair is committed under the
      spike dir in a form a pure-Node gate can read. *(ticket AC #2)*
- [ ] **AC3** The verdict is posted as a comment on epic #295. *(ticket AC #3)*
- [ ] **AC4** The predicate was committed to git **before** the first fixture number was measured, and
      the commit order proves it.
- [ ] **AC5** **Eleven** controls (C1, C2, C3, C4a, C4b, C5, C6, C7, C8, C9, C10), each observed green **and** red, both halves verbatim in `raw/controls.txt`. C6 is the one with no mutation: a disagreement between the two metrics stops the run and is reported.
- [ ] **AC6** The CIEDE2000 port agrees with `skimage.color.deltaE_ciede2000` to < 1e-3 over 500
      pseudo-random pairs, with the mutated half showing the disagreement the oracle catches.
- [ ] **AC7** An empty measurement throws, naming the failure; the self-deceiving `sum/max(len,1)`
      shape is present only in C5's mutation half.
- [ ] **AC8** No generated output moved, **proven** by a staged `--check` plus its positive control,
      not asserted.
- [ ] **AC11** All **six** rungs are reported at all three granularities for both pairs, including
      rung 5 with its failure visible — the ladder is reported whole, not truncated at the rung that
      worked.
- [ ] **AC12** The region-size rule (256 px) and the mask-degenerate rule (`inkN/n > 0.5`) are applied,
      and every excluded or degenerate region is named with its numbers rather than silently dropped.
- [ ] **AC13** The platform envelope is a **number** in the README — the worst rung-6 floor across
      chromium, firefox and webkit — not a caveat, with the statement of whether it can close the
      observed margin.
- [ ] **AC14** The work was done in a dedicated worktree, and the worktree is removed after merge.
- [ ] **AC9** `node tooling/build-checks.mjs` green; `node tooling/drift-check.mjs` green.
- [ ] **AC10** The PR body carries `Closes #300`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Control battery green in half 1, each control named-red in half 2 (C6 excepted — reported, not mutated)
- [ ] The identity run reads 1.0000 under every rung
- [ ] Manual side-by-side confirms only the text colour moved
- [ ] Acceptance criteria all met
- [ ] Two named deviations stated in the README, not smuggled
- [ ] The epic comment shown to the owner before posting

---

## OPEN QUESTIONS / ASSUMPTIONS

**Q1 — the epic's green-fallback is a no-op as written.** `architecture.md:312-313` says
"green → the aggregation is wrong, not the idea; try per-section MIN before dropping it". Per-section
MIN **is** E4's specified aggregation (`visual_scorer.py:212`). Following the fallback literally
re-runs rung 1 and gets the same answer. **Assumption this plan makes:** the intent was "try a
different aggregation", and the real space is *within*-region (p95, p99, ink-masked mean, fraction
over JND), not across regions. The ladder is walked in a pre-declared order so the choice is not made
after the numbers. **Flagged to the epic in Task 14 rather than silently reinterpreted.**

**Q2 — is a Brilliant fixture a fair stand-in for a Polaris one?** The ticket names "spike A run 3's
green-body-text mapping"; that mapping was produced against Polaris, and there is no Brilliant element
that is Polaris. **Assumption:** the spike reproduces the *defect class* by placing run 3's real
emitted values (`#0c3b2f`, `#20828d` — read from `tokens.polaris.spike.css`, not invented) onto this
element's roles. The values are spike A's; the element is spike C's. Both stated in the README.
If the owner wants the literal Polaris artefact instead, the Polaris source JSONs are **not on disk**
(`polaris-json/` lived in `wt-spike-b`'s scratchpad and is gone — observed) and would need re-fetching
from jsdelivr, which changes the shape of the ticket.

**Q3 — how much of the floor is text *shaping* rather than colour? ANSWERED IN PRE-FLIGHT: almost all
of it, on the ink.** The reference draws text as SVG `<text>` at Brilliant's own advance positions; the
candidate lets Chromium shape it. Measured: the per-pixel floor on glyph pixels is **20.52 ΔE** on the
title — larger than the colour signal itself. Per-pixel comparison of text across two shapers is
unsound at this scale, and that is R1's whole content. The resolution is rung 6, which compares ink
*colour* rather than ink *pixels*, with a measured floor of 0.003–0.872. **No re-alignment pass is
attempted**: aligning two shapers is a research problem, and it is not what "is this colour right"
needs.

**Q4 — which region granularity does #307 inherit?** This plan measures all three and recommends one.
The recommendation is (c), per-part, because the IR is a node tree. Confirmed only by the numbers.

**A1 — no `build-checks` group in this ticket.** Group numbers are claimed in merge order; #307 claims
one. This ticket commits the fixture the group will read, and nothing more.

**A2 — colour roles only in the primary map.** Stated as a scope choice in Out of Scope, reported as a
second row via M2, and defended in the README.

---

## NOTES (open canvas)

### Pre-flight — what was run this session, and what it changed

Everything below is **observed** in this planning session unless marked derived.

| # | ran | said | changed in the plan |
|---|---|---|---|
| 1 | `gh issue view 300` / `295`; `sed` over `canvas-design-import.architecture.md` §§ Data model, Spikes | S3's decision rule, the import record's `fidelity` block, the "empty measurement is missing" refusal | the plan's spine and Out of Scope |
| 2 | `sed -n '975,1030p' .claude/plans/canvas-import-prd-briefing.md` | **E4 in full**: CIEDE2000 in CIELAB, MIN across sections never mean, origin correction, resize-to-reference, and `sum(scores)/max(len,1)` as the shape to avoid | rung 1 is E4 verbatim; C5 exists |
| 3 | read `~/Desktop/email-hub/app/design_sync/visual_scorer.py` | `_DELTA_E_MAX = 100.0` (`:41`), `score = 1 - mean/100` (`:115`), `overall = min(...)` (`:212`) | Task 7's exact formula, and Q1 — **per-section MIN is already E4**, so the epic's fallback is a no-op |
| 4 | `grep` `tokens.polaris.spike.css` | `--color-fg: #0c3b2f` (line 17), `--color-fg-muted: #20828d` (line 18); header claims 12/12 WCAG and three negotiations | the wrong pack is real and on disk; no re-run of spike A needed |
| 5 | `checkPairs(polarisTokens, RULESET.wcagPairs)` | **12/12 pass**; pair 1 `#0c3b2f` on `#ffffff` = **12.48:1**, pair 2 `#20828d` on `#ffffff` = **4.53:1** | Task 10's expected output is observed, not assumed |
| 6 | `find` for `polaris-v7.export.json` / `polaris-json/` | **absent** — only the derived pack CSS and `merge-polaris.mjs` survive; `wt-spike-b` exists but holds no spike-a dir | Q2: the literal-Polaris route is not available cheaply |
| 7 | `ls tooling/visual-regression/node_modules` and `~/node_modules` | Playwright present in both; no `pngjs`, no `pixelmatch` anywhere | the decoder must be hand-written; Task 6 |
| 8 | `python3 -c "import skimage"` vs `~/Desktop/email-hub/.venv/bin/python` | system: `ModuleNotFoundError`; venv: **skimage 0.26.0** | C1's oracle is the venv, named explicitly |
| 9 | rasterised `06.svg` in Chromium, DSF 1 | element box **exactly 361x221**; PNG **IHDR depth 8, colour type 2, interlace 0**, chunks `IDAT:4096 IDAT:3142 IDAT:6`; `zlib.inflateSync` → **239,564** bytes = 221 x (1 + 361x3) | Task 4's capture shape and Task 6's arithmetic identity are observed, not guessed; **multiple IDATs** became a GOTCHA |
| 10 | rendered `04-htmlflex.html` with the SVG's three `@font-face` blocks, compared to the reference | mean abs RGB diff 12.90, **16.30%** of pixels differing >12 | the htmlFlex export is **not** usable as the candidate |
| 11 | rebuilt the candidate from `03c-master-blueprint.txt` with `hug:100` on the two text nodes | **15.31%** — still bad; the visual diff showed the **status chip** rendered as a small pill where Brilliant renders a ~116x108 circle | `hug:100` applies to the chip's text too |
| 12 | added `.t3{width:100px;height:100px}` | **4.37%**, mean 4.73; per region: title mean 7.22 / p95 **0** / 3.5% differing · subtitle 3.43 / p95 **0** / 2.5% · avatar 0.46 / 0.0% · chip 2.44 / 2.0% · chevron 25.71 / **31.3%** | the floor is sparse and glyph-edge only → rungs 2–5 are the interesting ones; the chevron became an Edge Case |
| 13 | `skimage.deltaE_ciede2000` on the four pairs | `#454545/#0c3b2f` **18.2154** · `#575757/#20828d` **23.1670** · `#f8f8f8/#ffffff` **1.4004** · `#000/#fff` **100.0** exactly | Task 7's expected values; and `#f8f8f8→#ffffff` below the JND became an Edge Case |
| 14 | `grep -n ... tooling/drift-check.mjs`, `agent-layer/gen-loc-summary.mjs` | `node --check` over every tracked `.mjs` (`:29`); the three loc groups are `system/`, root+`proto/` html, `agent-layer/` | scripts park as `.txt`; REGENERATES is `none` **by regex**, and Task 12 proves it rather than asserting it |
| 15 | `git ls-tree origin/main -- .claude/plans/design-import-spike-{a,c}` | every fixture file is on `origin/main`; `origin/main` is `2e6aabd`, four S2 commits above it on the current branch | Task 1's "branch off `origin/main`" GOTCHA |
| 16 | `grep -o 'tok(color[a-z.-]*' 03c-master-blueprint.txt \| sort -u` over the whole file, then over lines 3–10 | whole file **10** roles; the `variant(state(active))` subtree **8**; the instance's own blueprint **6** | Task 3's count is 8 and its derivation is scoped to the active lane — a whole-file grep would have put a wrong literal in the plan |
| 17 | `node tooling/build-checks.mjs` | **all 34 groups pass** on `origin/main` + the S2 branch | the baseline this ticket must not move; Task 12's gate has a known-green starting point |
| 18 | `gen-loc-summary --check`, `gen-param-count --check` on the clean tree | `3 groups — no drift` · `120 controls — no drift` | Task 12's expected output is observed |
| 19 | the loc-summary **positive control**: a 200-line `system/__probe_s3.mjs`, staged, then `--check` | `loc summary ✗  drift from tracked source: system/loc-summary.json` (exit 1); reverted | **the plan's first draft named the wrong control** — the counts round to the nearest 100 (`gen-loc-summary.mjs:5-6`), so appending a line to `system/dock.mjs` would have stayed green and the REDDENS would have been a check that cannot fail |
| 20 | `grep -o 'data-width="[0-9.]*"' 06.svg \| sort \| uniq -c` | `2 data-width="143.27"` — the **same** value on both text nodes, none on the chip's | the derived prediction stopped citing it as the title's own glyph width; both coverage figures marked order-of-magnitude |
| 21 | rebuilt the candidate with `data-part` on every node and read `boundingBox()` for each | eight boxes: `row 0,0 360x220` · `avatar 12,94 32x32` · `text-block 56,8 143x204` · `title 56,8 143x100` · `subtitle 56,112 143x100` · `chip 211,56 116x108` · `chip-text 219,60 100x100` · `chevron 339,102 9x16` | the region table is in Task 4 as a harness check; the title box is **143** wide, not the 292 an earlier draft assumed, which halved the region and doubled the predicted coverage |
| 22 | **the floor in real CIEDE2000**, all six rungs x fourteen regions (`ref.png` vs the faithful render, chromium, via the skimage oracle) | rung 1 title **1.309** · p95 **3.346** · p99 **43.99** · **ink-masked mean 20.52** · ink fraction **4.7%** · modal `#f8f8f8` at 95% | **R1 FIRED.** The ink-masked floor (20.52) exceeds the signal's own ink ΔE (18.22) — the first draft's rung 4 would have scored the wrong map as *better* than a faithful one. Cause: glyph misregistration between an SVG `<text>` and Chromium's shaper |
| 23 | two mitigations driven **against the floor only**: a Gaussian blur sweep (σ = 0/1.0/1.5/2.0) and a registration-invariant **ink-colour ΔE** | blur σ=1.5 → title floor **0.41**; ink-colour ΔE → title **0.003**, subtitle **0.872**, chip-text **0.283**; both images' mean title ink colour is `#777777` | the ladder gained rungs 4 (blur, σ pinned at 1.5) and 6 (ink-colour ΔE), and **kept rung 5 so the spike reports its failure**; the whole R1 section is now a measurement |
| 24 | the faithful capture re-run on **firefox** and **webkit** and re-scored | worst rung-6 floor across three engines **2.689** (WebKit `subtitle`); WebKit's PNG is 9,600 bytes against chromium's 7,308 at identical `361x221` | **R3 bounded**: 2.689 against an 18–23 signal is a 7–9x margin. Rung 6's absolute threshold was raised from 2.3 to **5.0**, because 2.3 sits inside WebKit's noise. Task 5a captures all three so the README's table is the run's own |
| 25 | the chevron's floor statistics | 144 px, modal share **59.0%**, ink fraction **29.9%**, rung-1 mean **1.924** — the second worst region, for geometric reasons | **R2 closed**: a 256 px area floor, declared before the run, excluding exactly one region on this fixture; and the mask-degenerate rule's 0.5 threshold confirmed untripped here (worst: `yband3` at 41.1%) |

**What the pre-flight changed, in one line:** the candidate is authored from the blueprint (not the
htmlFlex export), the chip's `hug:100` is load-bearing, **the first draft's chosen aggregation was
measured and found to be the worst of six** — and replaced by one whose floor was measured on three
engines before any signal existed. Every expected number in the task list is a measurement, not a
recollection.

**On the honesty of measuring the floor during planning.** The floor is a property of the *harness* —
how much two renderers disagree about a picture they both draw correctly. The signal is a property of
the *mapping*. Measuring the first to choose an aggregation, then fixing that choice in git before
measuring the second, is the opposite of shopping: it is what makes the pre-committed predicate mean
something. **No render of `tokens.polaris.spike.css` was made during planning**, and the verdict is
unmeasured at the moment this plan is committed.

### The predicate — committed before any fixture number is measured

Let `worst(P, g, r)` be the worst region of pair `P` at granularity `g` under rung `r`, where "worst"
means the largest ΔE statistic (equivalently the smallest E4 score — the same ordering, **not** the same
number).

**Units, stated so the predicate has one reading.** Rung 1 reports **both** figures per region:
`score = 1 - mean/100` (E4's own output) and `meanΔE = (1 - score) x 100`. **Every threshold and every
margin below is evaluated on the ΔE figure, never on the score.** Ratios of scores near 1.0 carry no
information — `0.9964 / 0.9990 = 0.997`, which can never reach 2x however wrong the mapping is.

- `FLOOR = (ref, m1-faithful)`
- `SIGNAL = (ref, m1-wrong)`

**Rung 1 is the verdict rung.** It is E4 verbatim: per-region mean ΔE → `score = 1 - mean/100` →
overall `MIN(scores)`, at granularity **(c)**, per-part.

> **RED** iff `meanΔE(SIGNAL, c, 1) >= 2.3` **and** `meanΔE(SIGNAL, c, 1) >= 2 x meanΔE(FLOOR, c, 1)`,
> where `meanΔE(P, c, 1)` is the worst per-part region's mean ΔE — i.e. `(1 - MIN(scores)) x 100`.

2.3 is the CIEDE2000 just-noticeable difference — a human would see it. The 2x is a stated margin
choice, not a published one.

**The same two conditions apply at every rung, with one absolute threshold raised by measurement.**
At rungs 2–6 the JND condition reads `>= 2.3` **except at rung 6, where it reads `>= 5.0`** — twice
the worst floor any of the three engines produced (**2.689**, WebKit, `subtitle`; the cross-engine
table is in R3). At rung 6 the 2.3 threshold sits *inside* the engine noise, so on its own it would
pass a faithful map rendered in WebKit. The **margin** condition is what carries rung 6, and the
absolute condition is set above the measured noise rather than at the textbook JND.

**If rung 1 is green**, the ladder is walked in this fixed order and the **first** rung meeting the
same two conditions is named as #307's recommended aggregation.

**The floor column below is measured, the signal column is arithmetic.** The floor is the real
`ref.png` vs `m1-faithful` comparison on chromium, worst of `title` / `subtitle` / `chip-text`, run
during pre-flight (`floor-stats.json`, rows 21–23 of the pre-flight table). The signal column is the
ink pair's own ΔE — `#454545 → #0c3b2f` = **18.22**, `#575757 → #20828d` = **23.17**, both observed
from the skimage oracle — and is **not** a prediction of what the rung will report.

| rung | statistic | measured floor | reading |
|---|---|---|---|
| 1 | region **mean** ΔE — **E4 verbatim** | **1.309** | diluted: a mean over a region that is ~95% paper |
| 2 | region **p95** of ΔE | **3.346** | the cheapest step away from dilution |
| 3 | region **p99** of ΔE | **43.99** | dead on arrival — the floor alone exceeds the signal's ink ΔE |
| 4 | **blurred** region mean, Gaussian σ = 1.5 per channel | **0.41** | E4's own `blur_sigma` knob (`visual_scorer.py:151`), defaulted to 0 there. Kills misregistration; still diluted |
| 5 | **ink-masked per-pixel mean** — mean ΔE over pixels whose ΔE from the region's modal reference colour exceeds 2.3 | **20.52** | **destroyed by misregistration** — see R1. Kept in the ladder *because the spike must show it failing*, so #307 does not reach for the obvious fix |
| 6 | **ink-colour ΔE** — mask each image to its own ink by its own modal, average the ink colour within each, and take CIEDE2000 between the two averages | **0.872** | registration-invariant and colour-sensitive: the only rung whose floor leaves room for an 18-point signal |

`max` is deliberately **absent** from the ladder: the pre-flight measured a single-pixel max of 57.33
ΔE in a region whose p95 was 3.35. A one-pixel statistic is not a detector.

**Rungs 4 and 6 were added after the floor was measured and before any signal was.** That is recorded
here rather than quietly done: the floor is a property of the *harness*, not of the mapping, and the
first draft of this ladder had rung 5 as its answer — which the measurement then showed to be the
worst rung of the six. The verdict — whether the wrong map separates from the floor — is still
unmeasured at the time this plan is committed.

The verdict is then reported as **"green on rung 1, red on rung N"**, which is neither leg of the
decision rule as written. That reading is reported as itself.

**If no rung fires**, the verdict is green, and per the ticket the fidelity block ships
`verdict: unmeasured`, with the architecture's refusal intact: an empty measurement scores as
**missing**, never as pass.

### The derived prediction, stated before the run so a surprise is visible

This is **derived arithmetic, not a measurement**, and it is written down so that a divergence is
evidence rather than a shrug.

The title region is **143 x 100 = 14,300 px** (measured, not estimated — the box came back from
`boundingBox()` in pre-flight row 21; the earlier draft said 292 wide and was wrong). Its **ink
fraction is 4.7%**, measured directly from the reference by the same mask rung 5 and 6 use. The ink's
ΔE under the wrong map is **18.22** (observed). So:

```
region mean ΔE  ≈  0.047 x 18.22  ≈  0.86
E4 score        =  1 - 0.86/100   ≈  0.9914
```

0.86 is well below the 2.3 JND **and below rung 1's own measured floor of 1.309**, so **rung 1 is
predicted GREEN** — not because the mapping is right, but because the region is ~95% paper and the
mean divides the error by it. The subtitle predicts `0.046 x 23.17 ≈ 1.07`, the same order.

**Rung 5 is predicted to fail in the other direction**: its floor is 20.52 on `title`, larger than the
signal's own ink ΔE. **Rung 6 is predicted to separate cleanly** — a floor of 0.003–0.872 on chromium
and ≤ 2.689 across three engines, against 18.22 and 23.17.

`06.svg` carries `data-width="143.27"` on both text nodes and on neither the chip's (observed:
`grep -o 'data-width="[0-9.]*"' 06.svg | sort | uniq -c` → `2 data-width="143.27"`). Pre-flight row 21
then measured the text block at **143 px wide**, so that attribute is the block's shared layout width,
not a per-string glyph measurement. It is not used as one anywhere in this plan.

If the observed numbers contradict any of this, the harness is suspect before the metric is.

### Why the floor exists at all, and why it is the point

A same-renderer comparison — the repo's render under a right map against the repo's render under a
wrong map — would prove only that CIEDE2000 notices a colour change. That is true by construction and
worth nothing. The question #307 needs answered is whether the signal survives the noise of comparing
**a foreign tool's rendering** to **this repo's**: different text shaping, different anti-aliasing,
different sub-pixel geometry. That noise is the floor, and the verdict is the margin above it.

### Alternatives weighed and rejected

| option | rejected because |
|---|---|
| Compute ΔE in the browser page and skip the Node decoder | #307's gate is a `build-checks` group with no browser. Computing it in-page leaves the gate's actual path unproven and means doing the work twice. |
| Use `04-htmlflex.html` as the candidate | It drops `hug:100`, so its geometry disagrees with Brilliant's own render. Measured: 16.30% of pixels differing at the floor, against 4.37% for a blueprint-authored candidate. |
| Use the repo's real `pack-import.mjs` to generate the faithful pack | The faithful pack is a *ceiling*, not an importer output — its job is to isolate the noise floor. Running the real engine would reintroduce its own mapping defects into the floor and confound the measurement. |
| Rasterise the SVG with a library | No dependency is available and none may be added. Chromium already rasterises it correctly at its natural box (observed: exactly 361x221). |
| Validate CIEDE2000 against recalled Sharma test vectors | 34 rows of recalled numbers is a confident-garbage risk. `skimage`'s implementation is on this machine and is the same function E4 calls — a strictly better oracle. |
| Add the `build-checks` group in this ticket | Group numbers are claimed in merge order (architecture § Concurrency); #307 claims one. |

### Risks — all four measured or structurally closed during pre-flight

Every risk below was a hypothesis when this plan was first drafted. Each was then driven. **R1 fired.**

#### R1 — the floor swamps the signal on the ink mask. **FIRED. Mitigated, and the mitigation measured.**

The first draft's answer to dilution was rung 5, an ink-masked per-pixel mean. Driving it against the
real fixture (`ref.png` vs the faithful render, chromium) gave an ink-masked floor of **20.52** on
`title` and **14.15** on `subtitle` — **larger than the signal's own ink ΔE of 18.22**. Rung 5 would
have scored the wrong mapping as *better* than a faithful one.

**Cause**: glyph misregistration. The reference draws text as SVG `<text>` at Brilliant's own advance
positions; the candidate lets Chromium shape it. Sub-pixel offsets mean an ink pixel in one image is a
paper pixel in the other, and the ink mask selects exactly those pixels. Per-pixel comparison of text
across two shapers is unsound at this scale.

**Two mitigations were then driven, both against the floor only** (the signal is still unmeasured):

| mitigation | title floor | subtitle floor | chip-text floor |
|---|---|---|---|
| none (rung 5, ink-masked per-pixel mean) | 20.52 | 14.15 | 2.30 |
| Gaussian blur σ = 1.0, region mean | 0.60 | 0.19 | 0.15 |
| Gaussian blur σ = 1.5, region mean | **0.41** | 0.09 | 0.11 |
| Gaussian blur σ = 2.0, region mean | 0.33 | 0.06 | 0.09 |
| **ink-colour ΔE** (rung 6) | **0.003** | **0.872** | 0.283 |

Blur (rung 4) fixes misregistration but not dilution — it is still a mean over ~95% paper. **Ink-colour
ΔE fixes both**: it masks to ink, so the paper cannot dilute, and it compares the *average ink colour*
rather than pixel positions, so a sub-pixel shift moves nothing. The mean ink colour of the title
region is `#777777` in both images (**ΔE 0.003**, observed) — a mid-grey because AA blends glyph into
paper, and the same blend on both sides.

**Rung 6 is in the ladder as a result, and rung 5 is kept in it so the spike reports its failure.**
σ = 1.5 is fixed for rung 4 now, before the run, and is not a parameter to sweep at run time.

#### R2 — a tiny region dominates a MIN aggregation for geometric reasons. **Closed by a pre-declared rule.**

Observed at the floor: `chevron` is 9x16 = **144 px**, with a modal-colour share of **59.0%** and an
ink fraction of **29.9%** — nearly all of it is glyph or anti-aliasing. Its rung-1 floor mean is
**1.924**, the second worst of any region, for reasons that have nothing to do with colour.

**The rule, fixed before the run:** a region whose area is **below 256 px** (16x16) is **reported but
excluded from the aggregation that decides a rung**, and every excluded region is listed by name with
its numbers. This mirrors E4's own `_MIN_SECTION_HEIGHT_PX = 8` (`visual_scorer.py:32`). On this
fixture the rule excludes exactly one region, `chevron`; every other region is ≥ 1,024 px (observed
region table in the pre-flight). **The number is declared here, not chosen after seeing which regions
it removes.**

Separately, the **mask-degenerate** rule (F4): a region whose `inkN/n` exceeds **0.5** is reported,
not scored. Observed worst on this fixture: `yband3` at **41.1%** and `chevron` at 29.9% — neither
trips it, so the rule is defensive here. It is kept because #304's differently drawn source may not be.

#### R3 — a macOS-measured margin is not a Linux CI threshold. **Bounded by a three-engine run.**

The floor was captured on all three Playwright engines (the same element, the same fonts, the same
DSF 1), and the spread between them is a usable proxy for the platform variance #307 will meet:

| engine | title rung 1 | title rung 6 | subtitle rung 1 | subtitle rung 6 | chip-text rung 6 |
|---|---|---|---|---|---|
| chromium | 1.309 | 0.003 | 0.697 | 0.872 | 0.283 |
| firefox  | 0.570 | 0.408 | 0.697 | 0.872 | 0.691 |
| webkit   | 1.402 | **2.209** | 0.845 | **2.689** | 0.876 |

**Worst rung-6 floor across three engines: 2.689.** Against an 18–23 ΔE ink signal that is a **7x to
9x** margin, so platform variance of this magnitude cannot close the gap. Two consequences, both
already in the plan: rung 6's absolute threshold is set at **5.0**, not the textbook 2.3, because 2.3
sits inside WebKit's noise; and the README states the envelope as a number rather than as a caveat.
#307 still re-measures on Linux before pinning — this bounds the risk, it does not remove the step.

**Task 5a captures all three engines** so the README carries this table from the run's own data rather
than from the plan's pre-flight.

#### R4 — parallel sessions share this working tree. **Closed structurally, not by care.**

Rather than "stage by explicit path and be careful", **Task 1a moves the whole ticket into a dedicated
git worktree**. Nothing this ticket writes can then collide with a sibling session's staging area, and
the six unrelated untracked files in the shared tree cannot enter a commit by accident. The worktree
needs no `npm ci`: Playwright resolves from the **main** tree's
`tooling/visual-regression/node_modules` by absolute path, which is why S1's driver does it that way
(`.claude/plans/canvas-spike-s1/driver.txt:17-23`, and memory `local-agent-visual-gate-notes`).

Residual: the worktree must live under `/Users`, not `/private/tmp`, if anything Docker-shared ever
reads it (memory `vr-gate-reads-working-tree`). Nothing here does, but the path convention is kept.

## AMENDMENTS

<!-- append-only; newest at the bottom -->

### 2026-09-17 — implementation pre-flight, three plan errors

**E1 — Task 4's candidate text strings are the MASTER's, and the reference renders the INSTANCE's.**
`03c-master-blueprint.txt:9` gives "Text 3" the string `"Active"`. The reference `06.svg` is the
export of instance `1db1b29957b949ca`, whose own blueprint (`03-blueprint.txt:9`) and htmlFlex export
(`04-htmlflex.html:9`) both carry `"On call"` — the instance overrides the master's string. Authoring
the candidate with "Active" would make `chip-text` — one of the three regions the whole floor table is
read from — pure shaping noise, and would corrupt rung 6's floor silently.
**Resolution:** the candidate takes its geometry, sizing and colour roles from
`03c-master-blueprint.txt` lines 3–10 as the plan says, and its three text strings from
`03-blueprint.txt`: `"Amara Okafor"` · `"Last seen 2 min ago"` · `"On call"`. The other two strings are
identical in both files; only the chip's differs. Nothing else about the plan changes — the colour
roles, the literals, the `hug:100` boxes and the region table are all unaffected.

**E2 — Task 1a's worktree cannot contain the plan Task 2 commits.** This plan file was untracked in the
shared working tree, so a worktree created from a fresh branch does not have it, and Task 2 ("commit
this plan") has nothing to commit. Tasks 1 and 1a are therefore merged into one command —
`git worktree add <dir> -b <branch> origin/main` — followed by copying both
`canvas-spike-s3-wrong-but-green-300.{md,html}` into the worktree before Task 2. This also avoids
`git switch -c` moving the shared tree's HEAD off `feature/canvas-spike-s2-blueprint-stack-299`, which
a sibling session may be live on.

**E3 — `origin/main` moved.** The plan's Task 1 GOTCHA and pre-flight row 15 record `origin/main` as
`2e6aabd` with four S2 commits above it. S2 merged as PR #428 and `origin/main` is now **`6687f8e`**,
which already contains those commits. The branch is cut from `6687f8e`. No task content changes; the
sha in the report is the one that matters.

**E4 — Task 3's drop classification puts all six drops in one class; two belong in another.** The plan
says the six M1 drops are all `read-but-never-emitted` "(the contract has no success, container or
disabled role)". True of four of them. `color.surface` and `color.outline.variant` DO have contract
homes — `--color-bg-surface` and `--color-border`, both present in `system/tokens.contract.css`
(observed) and both mapped under M2. Under M1 they are **`read-then-dropped`**: a scope choice, not an
absence. `mapping.json` classifies them that way and records the contract home and the reason.

**E5 — C4b's bound assumes an ink coverage that was never measured.** The plan asserts
`0.5 x pairΔE <= inkMean <= pairΔE` on the real region. That lower leg holds only if the solid glyph
core is at least half the ink mask. Measured on `title`: the core is **236 px of a 672 px mask, 35.1%**,
and `inkMean` reads **6.3971** against a lower leg of 9.1077 — the control fails in half 1 as written.
The plan's own GOTCHA names the coverage term ("a coverage-weighted amount nothing can predict") and its
neighbouring warning forbids fixing a failing check by loosening a tolerance. The resolution does the
opposite of loosening: since an exact-match recolour leaves every anti-aliased ink pixel at ΔE exactly 0,
`inkMean === (coreN/inkN) x pairΔE` holds as an **identity to 1e-9** (observed: 6.397057509 vs
6.397057509, |diff| 3.1e-15 at the mutated coverage). C4b asserts that identity plus the plan's upper
leg. Its reddening mutation becomes a source change — dilute the ink mean over the whole region — and
the plan's mutation is kept as the positive control that the coverage term is measured per run.

**E6 — C10's mutation targets a mechanism that is not operating.** The plan mutates rung 6 by "holding
the modal fixed to M1's value instead of reading each image's own", expecting the M2 penalty to collapse.
Driven: it is a **semantic no-op**. Three of the four ink-unchanged regions have their own fill as the
region mode (`avatar` #f2f5fa, `chip` and `chip-text` #f1f7f2), not the paper, so holding the mode fixed
changes nothing; on the fourth (`chevron`, whose mode really does move #f8f8f8 → #ffffff) the penalty
survives the mutation anyway. The mechanism producing the M2 penalty is the **anti-aliased edge blending
unchanged ink against a moved paper**, not modal divergence. The mutation that does destroy the control
is a **core-only ink mask** (threshold 2.3 → 20), which excludes the AA edge and collapses the penalties
to +0.0000 / −0.0738 / −0.0738 / +0.0000 — M2 then reads *better* than M1 and the limitation is
invisible. Both readings are in `raw/controls.txt`; C10's half-1 assertion is unchanged in substance and
now spans all four regions rather than the avatar alone.

**E7 — three small numbers in the plan the run did not reproduce.** (a) Task 10's REDDENS predicts
`--color-fg: #cccccc` gives 11/12; observed **10/12**, because `color-fg` appears in two of the twelve
pairs. (b) Task 5's VALIDATE lists seven part names and calls them "six"; the fixture has **eight**
`data-part` nodes and the count is asserted at 8. (c) Task 6 specifies the decoder throw on
`colour type != 2`; Chromium writes ct 2 but **Firefox and WebKit write ct 6 (RGBA)** for the same
screenshot, which made Task 5a's own validation unreachable as specified. The decoder accepts 2 and 6
and asserts every alpha byte is 255, throwing by name otherwise.

### 2026-09-18 — PR #429 review, four plan claims

These are corrections to claims in the body above, appended rather than rewritten: this plan's value is
that it was committed at `65815a3` before any pixel was measured, and editing the pre-commitment to match
what the measurement said is the exact move the pre-commitment exists to prevent. E1–E7 follow the same
rule. **No rule, threshold or predicate moves here** — `MIN_AREA` is still 256, and the reading is still
rung 1 GREEN, first firing rung 2.

**E8 — the 256 px region-size rule is THIS SPIKE'S OWN, not E4's, and its sensitivity was not stated.**
`:488` and `:1102` both say the rule "mirrors `visual_scorer.py:32`'s `_MIN_SECTION_HEIGHT_PX = 8`". It
does not. E4's rule is a minimum section **height** of 8 px; this is a minimum **area** of 256 px, at a
per-part granularity E4 has no equivalent of. `chevron` is 9x16 — it **passes** E4's rule (height 16 >= 8)
and **fails** this one (area 144 < 256). The rule is genuinely pre-committed and the reason `:1094-1102`
gives for it is sound (a region that is nearly all glyph has no paper to dilute it); what is wrong is the
claim of descent, and the missing sensitivity.
**Measured** (`MIN_AREA = 0`, nothing else changed; the mutation is observable — the `excluded:` line
stops naming `chevron` and `scored=` goes 7 → 8): at granularity (c), `chevron`'s floor p95 of **8.3125**
becomes rung 2's floor, the margin condition fails (12.5861 < 16.6249) and **the first firing rung is 6,
not 2**. Rung 1 reads GREEN under both, so Q1 is unaffected; granularities (a) and (b) are unaffected
because no region there is under 256 px. The README's § The decision now carries this, because (c) is the
granularity Q4 recommends #307 inherit.

**E9 — `chevron` is the WORST region of the fourteen, not the second worst.** `:931` and `:1098` both
call its rung-1 floor mean of 1.924 "the second worst of any region". Ranked over all fourteen the run
measures (1 whole + 5 ybands + 8 parts), 1.9239 is the **largest**; `title`'s 1.3089 is second. It
strengthens the case for R2 rather than weakening it — the rule removes the single worst-scoring region
from a MIN aggregation — and it changes no verdict, since `chevron` is excluded either way.

**E10 — the epic citation is off by one.** `:638` and `:862` cite `architecture.md:312-313` for "green →
try per-section MIN before dropping it". In `docs/epics/canvas-design-import.architecture.md` the Decision
rule sentence is at **`:313-314`** (`:312` is the Spike line). Checked at both `6687f8e` and the plan's
originally-cited `2e6aabd`, so this is not base drift.

**E11 — three stale worktrees, not two.** `:311` names `wt-292-restore` and `wt-spike-b`. `git worktree
list` also carries `ux-factory-wt-12` on `feature/portability-proofs`, whose ticket landed on main in
July. The instruction the sentence carries — do not add another — stands; the count did not.
