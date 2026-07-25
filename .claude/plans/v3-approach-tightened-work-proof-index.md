# Feature: v3 — Approach tightened + Work as proof index (#80, epic #70 · P3c)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing organisms and tokens. The v3 band vocabulary already exists (#71) — reuse it verbatim, do not invent parallel classes. Mirror the sibling `factory.html` (#78), which is the reference for a *supporting* page wearing the vocabulary.

## Feature Description

Reshape the two supporting IA pages to the v3 band/organism vocabulary and craft bar, closing the epic's "Approach page vs spine-section" open question with the D6 default (a tight page, not a spine section):

- **`approach.html`** (currently 314 LOC, 6 sections) → a **tight method page**: hero → the method → in practice (the case study) → sources. The Loop, What-you-get, and Principles sections are dropped (accretion removed). Owner-confirmed "Tight" option.
- **`work.html`** (currently 89 LOC, 3 cards) → the **proof index**: the runnable demos (the two live-demo cards + the two relocated proto embeds), the relocated handoff-pack section, and a `.row-list` index of the remaining artifacts. Owner-confirmed "Relocate + index" option.
- **`factory.html`** (#78 evidence home) → gives up the `#prototypes` embeds and `#handoff` section it parked "until #80 relocates them to Work," and its now-unused embed styles.

Both public-facing pages then read as chapters of the same product-demo the spine (`index.html`) opened, at the same craft bar (§6.4).

## User Story

As a hiring manager or panel member scanning a design-engineer's portfolio,
I want the Approach and Work pages to read as tight, purposeful chapters of the same demo I met on the home page,
So that I can judge the method and run the proof without wading through repeated or soft filler.

## Problem Statement

The two supporting pages still wear the v2 vocabulary (`.section` / `.section-label` / `.headline`) while the spine and evidence home now speak in bands (`.band` / `.beat-head` / `.beat-title` / `.beat-lead` / `.row-list`). Approach has grown by accretion to six sections, several of which restate each other (Method vs Loop; Principles vs Method). Work is a thin three-card page, and the runnable prototypes + handoff pack are temporarily double-homed on `factory.html`. The epic's "Approach page vs spine-section" open question is still open.

## Solution Statement

Convert both pages to the #71 band vocabulary, mirroring `factory.html`'s established supporting-page pattern (a `.page-hero` at the top, `.band` + `.beat-head` chapters below, no oversized numerals — numerals are the spine's ordered-pipeline device). Tighten Approach to hero → method → case study → sources. Rebuild Work as the proof index and relocate the two proto embeds + the handoff section out of `factory.html` into it. Update the VR spec so the iframe mask travels with the embeds, regenerate the affected baselines and generated artifacts, and record the D6 decision as closed in the epic/architecture doc.

## Out of Scope / Non-Goals

- **Not building the component-library grid.** That is ticket #79 (P3b), whose default host is `work.html` but which is planned *after* this ticket and "host-coordinates with #78/#80." Leave a clean proof-index structure #79 can extend; do not add live hover/press component cards here.
- **Not touching the spine** (`index.html`) or the intake/peak/close beats.
- **Not adding new tokens or new view-time modules.** Everything reuses existing organisms and tokens; the relocated embeds are static iframes needing no JS. (This deliberately avoids the `tokens.source.json` → `gen-token-css` + `gen-handoff` + `system-graph` cascade.)
- **Not re-writing the case-study exhibit logic.** The `#asrc` annotated-source + LoC + derive-probe block and its inline module move as-is; only its wrapping section changes.
- **Not changing the derive engine, `components.css` components, or any generator logic** — the only `components.css` edit is deleting the now-dead `.closing` block.

## Feature Metadata

**Feature Type**: Refactor (vocabulary migration) + Enhancement (Work gains substance) + content tightening
**Estimated Complexity**: Medium
**Primary Systems Affected**: `approach.html`, `work.html`, `factory.html`, `system/components.css` (dead-CSS removal), `tooling/visual-regression/visual.spec.mjs`, VR baselines, `system/loc-summary.json`, `system/annotated-source.json` (drift), the architecture doc.
**Dependencies**: #71 (band CSS — merged in this branch's history) · #78 (factory.html evidence-home form — this branch is that work). No external libraries.

## Related Work

**Implements**: [#80](https://github.com/linardsb/ux-factory/issues/80) — P3c · Approach tightened + Work as proof index · **Epic**: [#70](https://github.com/linardsb/ux-factory/issues/70), architecture `docs/epics/portfolio-v3-experience.architecture.md`.

**Back-references** (inherits decisions from):

- `docs/epics/portfolio-v3-experience.architecture.md` — Why: band organisms, supporting-page pattern, D11 VR strategy, closes the "Approach page vs spine-section" open Q (line 65).
- `.claude/plans/v3-spine-skeleton.md` (#71) — Why: defines `.band` / `.beat-head` / `.row-list` / `.close-card` — the vocabulary this ticket applies. The CSS comment on `.row-list` (`system/portfolio.css:1273`) states it is "reusable for the Work proof index later" — that later is this ticket.
- `.claude/reports/v3-evidence-home-restructure-report.md` (#78) — Why: `factory.html` is the sibling template and the source of the relocated `#prototypes` + `#handoff` sections.

**Forward-references**:

- #79 (P3b library grid) — extends `work.html` with the live component grid, after this settles.
- #82 (P4) — full baseline regen + VR re-block at final merge.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `index.html` (whole file, esp. lines 80–303) — Why: the **canonical band vocabulary in use** — `.band` / `.band--dark`, `.beat-head` > `.beat-numeral` + `.beat-head-text` > `.beat-kicker` + `.beat-title`, `.beat-lead`, `.close-card`, and the `#verify` `.row-list` / `.row-item` block you will mirror for Work's index.
- `factory.html` (lines 206–410, and the `<style>` block lines 28–201) — Why: the **supporting-page reference** — `.page-hero` at top then `.band` chapters *without* numerals; the `#prototypes` (lines 308–347) and `#handoff` (lines 349–367) sections you relocate; the `.factory-embed*` inline styles (lines 101–113) you move; the `#verify-further` `.row-list` (lines 369–398) you extend; the `.ev-viewer, #prototypes, #handoff { scroll-margin-top }` rule you trim.
- `approach.html` (whole file) — Why: the page you tighten. Keep the `<head>`, `.page-hero`, the Method section's 4 `.card`s (lines 47–94), the entire `#case` block incl. `#asrc` + `#loc-proof` + the inline `<script type="module">` (lines 152–312), and the Sources grid (lines 217–242). Drop `#loop` (98–133), `#value` (135–150), `#practice` (244–265). The `.closing` band (already deleted in the working tree).
- `work.html` (whole file) — Why: rebuilt. Keep the two live-demo cards (factory, agentic study, lines 42–65); the case-study card (66–76) becomes a row in the index.
- `system/portfolio.css` (lines 985–1331) — Why: the full band/organism CSS. **Read it — do not re-declare any of these classes.** Confirms numerals (`.beat-numeral`) are spine-only and `.row-list` is intended for Work.
- `system/components.css` (the `.closing` block — already removed in the working tree diff) — Why: the only `components.css` change is this dead-CSS removal; grep confirms no page uses `class="closing"` after it.
- `tooling/visual-regression/visual.spec.mjs` (lines 16–46) — Why: the `PAGES` array. `factory` carries `mask: '.factory-embed-figure:not([hidden]) .factory-embed'`; `approach` waits on `#asrc[data-asrc="ready"]`; `work` currently has no mask/wait. The mask must move from `factory` to `work` with the embeds.
- `system/loc-summary.json` — Why: `approach.html` renders the **runtime** group's numbers (unaffected by these HTML edits), but the **pages** group + total will shift; CI `drift-check` fails if `loc-summary.json` is stale.
- `.claude/skills/portfolio-design/references/CHECKLIST.md` — Why: the MUST/SHOULD/NEVER gate — run it before committing. Especially: real Safari+Chrome eyeball, humanizer copy pass, `min-width:0` on grid items with wide content, focus never under sticky chrome.
- `docs/epics/portfolio-v3-experience.architecture.md` (line 65, 44–50) — Why: the open question to close; the P3 phase description ("Approach tightened, Work as proof index").

### New Files to Create

- None. All work edits existing files. (The plan file itself is the only new artifact, already created.)

### Relevant Documentation

- `.claude/skills/portfolio-design/references/CRAFT.md` — numeric craft rules (type ratios, easing, 60/30/10, spacing) — read before writing any CSS/inline style.
- `docs/epics/portfolio-v3-experience.prd.md` §6.2 (full sweep) + §6.4 (craft bar) — the intent and the acceptance bar.

### Patterns to Follow

**Supporting-page band structure** (from `factory.html:206–232`) — a `.page-hero` then `.band`s whose head omits the numeral:

```html
<section class="band" id="method">
  <div class="container">
    <div class="beat-head">
      <div class="beat-head-text">
        <p class="beat-kicker">The method</p>
        <h2 class="beat-title">Four habits, run as one loop.</h2>
      </div>
    </div>
    <p class="beat-lead">One-sentence lead in the beat-lead measure (max 60ch).</p>
    <!-- existing content grid unchanged below -->
  </div>
</section>
```

**Proof-index row** (from `index.html:255–264` / `factory.html:377–387`) — the whole row is one ≥44px link:

```html
<ul class="row-list">
  <li>
    <a class="row-item" href="/roundtrip">
      <span class="row-item-text">
        <span class="row-item-title">The round-trip check</span>
        <span class="row-item-desc">Screenshots turned back into tokens, with the fidelity diff</span>
      </span>
      <span class="row-item-arrow" aria-hidden="true">→</span>
    </a>
  </li>
</ul>
```

**Relocated embed** (verbatim from `factory.html:322–331`) — keep the `data-scenario`, `loading="lazy"`, `.factory-embed-phone`/`-board` height classes, and the honest fallback caption.

**Honesty & copy:** every visible string passes the humanizer rules (no em/en dashes, no "not X but Y", active voice, jargon defined once). Fictional labels stay visible at rest. Capability chips (`.capability.live`) only where the thing genuinely runs.

---

## IMPLEMENTATION PLAN

### Phase 0: Branch setup

**Tasks:**

- The v3 band vocabulary (#71), hero (#72), intake (#73), and evidence home (#78) are all in this branch's history. Branch #80 off the current tip so it inherits `factory.html`'s #78 form and the band CSS. The working tree already carries the start of this work (the `.closing` deletions in `approach.html` / `work.html` / `system/components.css`) — an uncommitted checkout carries them onto the new branch.
- `git checkout -b feature/v3-approach-work` (uncommitted `.closing` edits follow the checkout).

### Phase 1: Approach — tighten to a method page

**Depends on:** Phase 0.

**Tasks:**

- Rename the Method section anchor `#layers` → `#method`; update the hero CTA `href="#layers"` → `#method`. Keep `#case` and `#sources` ids exactly (both are link targets — `#case` is linked from `work.html`).
- Convert Method, In-practice (case study), and Sources from `.section`/`.section-label`(+`.headline`/`.section-split`) to `.band` + `.beat-head` (kicker = old label text, title = old headline) + optional `.beat-lead`. Content grids below the head (the 4 `.card`s; the 4 `.decision-card`s + `#asrc` + `#loc-proof`; the Sources `.grid grid-2`) stay as-is.
- Delete the `#loop`, `#value`, and `#practice` sections entirely. The heavy `.closing` disc band is already deleted — **replace it with factory's light close**: a `<section class="section">` + `.hero-cta-row` (How I work is redundant here → use *See the demos* `/work` + *Get in touch* `/contact`), so the page still funnels to contact. This mirrors `factory.html`'s tail (lines 400–408) and satisfies the Q6 "confident close" craft bar — dropping the disc band is the tightening; dropping the CTA entirely is not.
- Ensure deep-link targets clear the sticky header: add `html { scroll-padding-top: 96px; }` (and `scroll-margin-top` on the jump targets if the global rule isn't already present) so `#method`/`#case`/`#sources` don't land under the header (CHECKLIST: focus never under sticky chrome).
- Preserve the case-study `#asrc` block and its inline `<script type="module">` and all bottom scripts unchanged — the VR gate waits on `#asrc[data-asrc="ready"]` and `initGlossary` throws on an unknown `data-term`.

### Phase 2: Work — rebuild as the proof index

**Depends on:** Phase 0. **Independent of:** Phase 1 (different file — parallelizable).

**Tasks:**

- Add a page-unique inline `<style>` block to `work.html` holding the relocated `.factory-embeds` / `.factory-embed-figure` / `.factory-embed` / `.factory-embed-phone` / `.factory-embed-board` / `.factory-embed-cap` rules (copied verbatim from `factory.html:101–113`), plus `html { scroll-padding-top: 96px; }` and `#screens, #handoff { scroll-margin-top: 96px; }` so the deep links from `factory.html`'s `#verify-further` (→ `/work#screens`, `/work#handoff`) don't land under the sticky header (CHECKLIST).
- Update the `<title>`/`<meta name="description">` to describe a proof index.
- Build the body: `.page-hero` → BAND "Run it" (the two live-demo cards) → BAND "The screens" (`#screens`, the two relocated proto embeds with their captions) → BAND "The handoff pack" (`#handoff`, relocated) → BAND "More proof" (`.row-list` linking `/roundtrip`, `/factory`, `/approach#case`, and any remaining artifact) → a light close: `<section class="section">` + `.hero-cta-row` → *Get in touch* `/contact` (mirrors factory's tail; Q6 confident close).
- Keep the existing bottom scripts (`site.js`, `portfolio.js`, `analytics.mjs`, `dock.mjs`). No new module.

### Phase 3: Factory — give up the relocated sections

**Depends on:** Phase 2 (the embeds must exist on Work before they leave Factory, so the demos are never unreachable).

**Tasks:**

- Remove the `#prototypes` section (`factory.html:308–347`) and the `#handoff` section (349–367).
- Remove the now-unused `.factory-embed*` inline styles (101–113) and drop `#prototypes, #handoff` from the `scroll-margin-top` rule (line ~34).
- Update the head comment (lines 14–21) that says the prototypes/handoff are "kept minimally here until #80 relocates them" — they are relocated now.
- Add rows to `factory.html`'s `#verify-further` `.row-list` pointing to Work's screens + handoff, so the evidence home still reaches them.

### Phase 4: Pipeline artifacts, VR, and the closed decision

**Depends on:** Phases 1–3.

**Tasks:**

- **VR spec:** in `visual.spec.mjs`, remove `mask` from the `factory` entry (embeds gone) and add `mask: '.factory-embed-figure:not([hidden]) .factory-embed'` to the `work` entry (embeds now there). `work` stays `kind:'ia'`, no `waitReady` (the iframe content is masked; site chrome is waited).
- **Dead-CSS drift:** removing `.closing` from `components.css` moves lines → `node agent-layer/gen-annotated-source.mjs --check`; regenerate if it reports drift (the extractor is drift-checked in CI).
- **LoC:** `git add -A` the touched source, then `node agent-layer/gen-loc-summary.mjs --check`; regenerate if the pages group/total crossed a rounding boundary. (Approach's rendered *runtime* numbers are unaffected, so the approach baselines don't churn from LoC — but CI `verify` fails on a stale total.)
- **Baselines:** `cd tooling/visual-regression && npm run update:docker` (Docker required, Linux/Chromium). Regenerates `approach-*`, `work-*`, `factory-*` (neutral + saulera) = 6 PNGs. VR is non-blocking on `feature/v3-*` (D11); this is the phase-milestone regen.
- **Close the decision:** tick the "Approach page vs spine-section" open question in `docs/epics/portfolio-v3-experience.architecture.md` (line 65) — resolved: tight page (D6 default held).

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently checkable.

### UPDATE branch — create `feature/v3-approach-work`

- **IMPLEMENT**: Verify current branch tip contains #71+#78 (`git log --oneline | grep -E '#71|#78'`), then `git checkout -b feature/v3-approach-work`. The uncommitted `.closing` deletions carry over.
- **GOTCHA**: Shared worktree / parallel sessions — verify the branch right before committing; stage by explicit path.
- **VALIDATE**: `git branch --show-current` prints `feature/v3-approach-work`; `git status` still shows the three modified files.
- **SATISFIES**: setup for all AC.

### UPDATE approach.html — convert Method section to a band

- **IMPLEMENT**: Wrap the four habit `.card`s in `<section class="band" id="method">`; replace `.section-label` with `.beat-head`>`.beat-head-text`>(`.beat-kicker`"The method" + `.beat-title`"Four habits, run as one loop."); move the `.lead` intro into a `.beat-lead`. Keep the `.grid grid-2 mt-2xl stagger` of 4 cards and their `data-term`s.
- **PATTERN**: `factory.html:226–232`; `index.html:80–92`.
- **GOTCHA**: keep `data-term="activation"`/`"retention"` in the "Prove it" card — `initGlossary` throws on removal.
- **VALIDATE**: render `/approach`, Method chapter shows band styling, no console error.
- **SATISFIES**: AC #1 (tight method page), AC #2 (v3 vocabulary).

### UPDATE approach.html — convert the case study to a band, preserve `#asrc`

- **IMPLEMENT**: Change `<section class="section" id="case">` → `<section class="band" id="case">`; convert its `.section-label`+`.section-split`/`.headline` to a `.beat-head` (kicker "In practice" + title "This site re-skins itself from one line of CSS.") + `.beat-lead`. Leave the `.grid` of `.decision-card`s, the `#asrc` block, `#loc-proof`, and the inline `<script type="module">` byte-for-byte unchanged.
- **PATTERN**: same band head; exhibit logic untouched.
- **GOTCHA**: `#case` id MUST stay (linked from `work.html` and the hero). Do not rename. VR waits on `#asrc[data-asrc="ready"]`.
- **VALIDATE**: `/approach` — the annotated-source panels and the "…N files, about N lines…" line render; `document.querySelector('#asrc').dataset.asrc === 'ready'` in console.
- **SATISFIES**: AC #1, #2; preserves VR anchor.

### UPDATE approach.html — convert Sources to a band; delete Loop/What-you-get/Principles; add light close; fix anchors

- **IMPLEMENT**: `<section class="band" id="sources">` with `.beat-head` (kicker "Sources" + title "I learn from the primary sources.") over the existing `.grid grid-2`. Delete the `#loop`, `#value`, `#practice` sections. Change the hero CTA `href="#layers"` → `#method`. Add a light close after Sources: `<section class="section">` + `.hero-cta-row` → *See the demos* `/work` + *Get in touch* `/contact` (factory's tail idiom, not the disc band). Add `html { scroll-padding-top: 96px; }` for the `#method`/`#case`/`#sources` jump targets.
- **PATTERN**: close mirrors `factory.html:400–408`.
- **GOTCHA**: `#loop`/`#value`/`#practice` have no inbound links (verified) — safe to delete. Use the light `.section` close, never the removed `.closing` disc band.
- **VALIDATE**: `/approach` has hero + 3 bands (method, case, sources) + a light CTA close; grep for `id="loop"`/`id="value"`/`id="practice"` → none; the hero "The method" button and the close CTAs scroll/navigate correctly, targets clear the header.
- **SATISFIES**: AC #1 (no accretion), AC #3 (closes the decision), AC #confident-close.

### UPDATE work.html — add relocated embed styles + rebuild as proof index

- **IMPLEMENT**: Add an inline `<style>` with the `.factory-embed*` rules from `factory.html:101–113`. Rebuild `<main>`: `.page-hero` (retitle to the proof-index framing) → `<section class="band" id="run">` with the two live-demo cards (factory, agentic study) → `<section class="band" id="screens">` with the two relocated `.factory-embed-figure` iframes + captions → `<section class="band" id="handoff">` (relocated handoff copy + link) → `<section class="band" id="more">` with a `.row-list` to `/roundtrip`, `/factory`, `/approach#case`.
- **PATTERN**: cards `work.html:42–65`; embeds `factory.html:321–346`; handoff `factory.html:349–367`; row-list `index.html:255–301`.
- **GOTCHA**: keep `min-width:0` behavior — `.factory-embed-figure` is `flex`; the iframes have fixed heights so no blowout, but verify at 360px. Capability chip `.capability.live` only on cards that genuinely run.
- **VALIDATE**: `/work` renders 4 bands; both iframes load (or show their static fallback); no horizontal scroll at 360px.
- **SATISFIES**: AC #1 (proof index), AC #2.

### UPDATE factory.html — remove the relocated sections + their styles

- **IMPLEMENT**: Delete `#prototypes` (308–347) and `#handoff` (349–367). Remove `.factory-embed*` inline styles (101–113). Trim `#prototypes, #handoff` from the `scroll-margin-top` rule. Update the head comment (14–21). Add two rows to `#verify-further`'s `.row-list` → `/work#screens` and `/work#handoff`.
- **GOTCHA**: keep `factory.html`'s three evidence engines + their `data-*="ready"` handles intact — VR waits on all three.
- **VALIDATE**: `/factory` — no `#prototypes`/`#handoff` sections, the tabbed viewer + `#verify-further` still render, new rows link to Work.
- **SATISFIES**: AC #1 (single home for the demos), no double-homing.

### UPDATE tooling/visual-regression/visual.spec.mjs — move the iframe mask

- **IMPLEMENT**: Remove `mask: '.factory-embed-figure:not([hidden]) .factory-embed'` from the `factory` PAGES entry; add the same `mask` to the `work` entry. Update the neighboring comment.
- **PATTERN**: existing `factory` entry (line 39).
- **GOTCHA**: without the mask on `work`, the async iframe content races the capture and churns the baseline every run.
- **VALIDATE**: spec parses (`node -c` not applicable — it's ESM test; confirm via the baseline run below).
- **SATISFIES**: AC — deterministic baselines.

### UPDATE system/components.css — confirm `.closing` removal; regen annotated-source if drifted

- **IMPLEMENT**: Confirm the `.closing` block is gone (working tree already removed it). Run `node agent-layer/gen-annotated-source.mjs --check`; if it reports drift, run without `--check` to regenerate `system/annotated-source.json`.
- **GOTCHA**: "moving lines in components.css ⇒ regen annotated-source.json" (CHECKLIST). Removing `.closing` shifts every line below it.
- **VALIDATE**: `node tooling/drift-check.mjs` passes for annotated-source.
- **SATISFIES**: AC — CI `verify` green.

### UPDATE system/loc-summary.json — regen if the pages total drifted

- **IMPLEMENT**: `git add -A` the touched source files, then `node agent-layer/gen-loc-summary.mjs --check`; regenerate if drift is reported.
- **GOTCHA**: gen-loc counts **tracked** content — `git add` first or `--check` gives a false "no drift." Approach renders only the runtime group, so its baselines don't churn from this; but the pages/total churns CI.
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → "no drift".
- **SATISFIES**: AC — CI `verify` green.

### UPDATE docs/epics/portfolio-v3-experience.architecture.md — close the open question

- **IMPLEMENT**: Mark the "Approach page vs spine-section" open question (line 65) resolved: tight page (D6 default held, revisited in P3 and confirmed).
- **VALIDATE**: the line reads as closed.
- **SATISFIES**: AC #3.

### REGEN VR baselines

- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker`. Confirm `approach-{neutral,saulera}`, `work-{neutral,saulera}`, `factory-{neutral,saulera}` were rewritten. If a page's only change is sub-perceptual, `rm` its PNG and re-run to force.
- **GOTCHA**: Docker required; baselines are Linux/Chromium (a local macOS Playwright run reports platform diffs, not regressions). VR is non-blocking on this branch (D11) but the milestone regen keeps the branch honest.
- **VALIDATE**: `git status` shows exactly the 6 baseline PNGs changed under `tooling/visual-regression/baselines/`.
- **SATISFIES**: AC — baselines current for the milestone.

---

## TESTING STRATEGY

No unit/integration suite exists (project convention). "Done" = run the surfaces you touched + the drift/lint gates + the VR milestone regen + a real cross-engine eyeball.

### Level 1: Syntax & drift gates

- `node tooling/drift-check.mjs` (blocking CI gate — loc-summary, annotated-source, system-graph, pack).
- `node tooling/token-lint.mjs` (no orphaned/literal tokens).

### Level 2: Generated-artifact currency

- `node agent-layer/gen-annotated-source.mjs --check`
- `node agent-layer/gen-loc-summary.mjs --check` (after `git add`)

### Level 3: Render / integration

- `npx serve .` → open `/approach`, `/work`, `/factory`. Zero console errors. On `/approach`: `#asrc` panels + LoC line render (`data-asrc="ready"`). On `/work`: both iframes load or show their static fallback; the row-list links resolve. On `/factory`: viewer + `#verify-further` render, no `#prototypes`/`#handoff`.

### Level 4: Manual / craft (CHECKLIST.md)

- Real **Safari + Chrome** eyeball of both pages (VR gate's Chromium misses real-engine blowouts).
- Responsive to **360px**, no horizontal page scroll.
- Keyboard path through every `.row-item` and CTA; visible `:focus-visible`; focus never under the sticky header.
- Humanizer pass on every reworded string.
- Cadence rubric 6/6 self-audit per the CHECKLIST final section.

### Level 5: VR milestone

- `cd tooling/visual-regression && npm run update:docker` regenerates the 6 baselines.

### Edge Cases

- Worker down → Work's embedded proto pages fall back to committed static fixtures (the caption states which). Verify the fallback still reads honestly.
- Reduced motion → both pages are at-rest already (no page-level entrance animation added); the `.btn-arrow`/`.row-item` hover motion is hover-only, so rest == final.
- saulera pack → both pages re-skin cleanly (token-only, no literals introduced except the licensed structural px in the embed styles).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```
node tooling/drift-check.mjs
node tooling/token-lint.mjs
```
### Level 2: Artifact currency
```
node agent-layer/gen-annotated-source.mjs --check
git add -A && node agent-layer/gen-loc-summary.mjs --check
```
### Level 3: Render
```
npx serve .   # open /approach /work /factory, check console + #asrc + iframes
```
### Level 4: Manual
Safari + Chrome eyeball · 360px reflow · keyboard · humanizer · Cadence 6/6.
### Level 5: VR
```
cd tooling/visual-regression && npm run update:docker
```

---

## ACCEPTANCE CRITERIA

- [ ] `approach.html` is a tight method page: hero → method → in practice (case study) → sources; Loop/What-you-get/Principles removed. (AC #1)
- [ ] `work.html` is a clean proof index: the runnable demos (cards + relocated embeds) + handoff pack + a `.row-list` of artifacts. (AC #1)
- [ ] Both pages wear the v3 band vocabulary (`.band`/`.beat-head`/`.beat-title`/`.beat-lead`/`.row-list`); the craft bar §6.4 passes. (AC #2)
- [ ] The proto embeds + handoff section are relocated from `factory.html` to `work.html`; nothing is double-homed or unreachable; `factory.html` links onward to them. (AC #1)
- [ ] The "Approach page vs spine-section" open question is closed in the architecture doc. (AC #3)
- [ ] `#case` id preserved (external link from Work); `#asrc[data-asrc="ready"]` still fires (VR anchor).
- [ ] Both pages keep a **confident close** — a light `.section` + `.hero-cta-row` funnelling to `/contact` (factory's tail idiom, not the removed `.closing` disc band); Q6 craft bar passes. (AC #confident-close)
- [ ] Deep-link targets (`#method`/`#case`/`#sources` on Approach; `#screens`/`#handoff` on Work) clear the sticky header via `scroll-padding-top`.
- [ ] `visual.spec.mjs` mask moved from `factory` to `work`; the 6 baselines regenerated.
- [ ] `drift-check`, `token-lint`, `gen-annotated-source --check`, `gen-loc-summary --check` all clean.
- [ ] No new tokens, no new modules, no `components.css` change beyond the `.closing` removal.
- [ ] Humanizer + accessibility CHECKLIST pass; no console errors on any of the three pages.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order, each validated at the step.
- [ ] All validation commands pass (Levels 1–5).
- [ ] Real Safari + Chrome + 360px eyeball done.
- [ ] Baselines regenerated (exactly the 6 expected PNGs changed).
- [ ] Architecture open question closed.
- [ ] Acceptance criteria all met.

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Assumption — numerals off on supporting pages.** Approach/Work bands use `.beat-head` *without* `.beat-numeral`, matching `factory.html`. Numerals (I4) are the spine's ordered-pipeline device; Approach's "four habits run as one loop" is not a strict sequence. If the owner wants numerals back, it's a one-span-per-band addition.
- **Assumption — branch base.** #80 branches off the current tip (which contains #71+#78). If the team instead rebases v3 tickets onto a shared integration branch, adapt Phase 0 accordingly; the file edits are unaffected.
- **Assumption — `.closing` removal kept.** The working tree already deleted it and no page uses it; removal serves "no accretion" at the cost of the annotated-source line-drift regen. If the team prefers zero generated-file churn this ticket, restore the `.closing` CSS instead (dead but harmless) — but that contradicts the tightening intent.
- **Decision — swap heavy close for a light close, don't drop it.** The working-tree deletion removed the heavy `.closing` disc band from both pages. Rather than leave the pages with no CTA (Approach would end on Sources, Work on a link list — both risk failing the Q6 "confident close" bar), each page keeps a **light** close: factory's tail idiom (`.section` + `.hero-cta-row` → `/contact`). The confirmed owner previews ended structurally at Sources/row-list but were sketches of *tightening*, not a ruling to remove the CTA; the sibling `factory.html` keeps a close despite the site footer. If the owner explicitly wants a hard stop with no CTA, delete the two close `.section`s — a trivial revert.
- **Confirmed with owner (2026-07-24):** Approach → "Tight" (drop Loop/What-you-get/Principles); Work → "Relocate + index" (move embeds + handoff off factory.html, touch factory.html + its baseline).
- **Deferred to #79:** the live component-library grid on Work.

## NOTES (open canvas)

**Why this is low-risk despite touching three shipped pages.** The band vocabulary is fully built and battle-tested on `index.html` + `factory.html`; this ticket is 90% applying it and moving existing blocks, 10% copy tightening. No token, engine, or module changes — the whole `tokens.source.json → gen-token-css → gen-handoff → gen-pack-bundle → system-graph` cascade is deliberately avoided. The only generated-file touchpoints are the two cheap drift regens (annotated-source from the CSS line shift; loc-summary from the pages total) and the VR baselines.

**The one genuine trap** is the iframe mask. `factory.html` masked the embeds so their async content couldn't churn the baseline; the moment those iframes live on `work.html`, `work` needs that mask and `factory` no longer does. Miss this and `work`'s baseline is nondeterministic (flaky VR forever). It's a two-line edit but it's the thing most likely to be forgotten.

**Copy voice.** Approach's retained copy is already humanized; the only new prose is the two/three new `.beat-lead`s and Work's rewritten hero + band heads + row descriptions. Run the humanizer skill on those specifically. Keep the honest fallback caption on the relocated embeds ("The indicator in each frame says which one you are seeing").

**Sequencing.** Phases 1 (approach) and 2 (work) are independent files and could run in parallel. Phase 3 (factory removal) should follow Phase 2 so the demos are never momentarily unreachable. Phase 4 (artifacts/VR) is last and depends on everything.

## AMENDMENTS

- (none yet — created 2026-07-24)
