# Feature: Public round-trip demo — Factory derivation stage + honest diff display (#42)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing. Pay special attention to naming of existing utils, types, and modules. Import from the right files.

> **Base branch:** cut a fresh branch off **`origin/main`** (`5b2a768`). The current working tree is on `feature/portfolio-motion-phase02`, which is an **unrelated** feature **behind** `origin/main` (it lacks #40's finalized label and #41). Every line number in this plan refers to the **`origin/main`** blob, not the working tree. Start with:
> ```
> git fetch origin && git switch -c feature/public-round-trip-demo origin/main
> ```

## Feature Description

The shipped Factory page (`factory.html`) gains a new **anchored exhibit** — the *Verdant derivation round-trip* — placed immediately after Station 02 (Design-system generation). It replays #40's committed evidence: the factory's screenshot→pack derivation was run end-to-end on screenshots of Verdant's own prototype, the agent's **proposed** pack seed was **human-gated**, and the proposal was measured against the **known** Verdant pack. The reader sees the vision-input screenshots, the honest proposed-vs-ground-truth **diff** (OKLab ΔE on the accent, type/spacing/radius usability, 12 WCAG pairs), the **visible human gate** (agent proposed `#2d6a48` → human corrected to `#2f7a4d`), and the **real recorded derivation run** replayed in the four PIV acts. No live LLM runs at view time — everything is fetched from committed static files and degrades gracefully.

The exhibit is a permanent, inspectable rendering of the derivation-fidelity spike (#40 / architecture §Spikes 1). Its honesty is the whole point: it must present the round-trip as a **controlled, favourable case that proves the pipeline runs and is measured honestly — NOT that derivation is high-fidelity in the wild**, and carry the spike's finalized, **provisional** capability label.

## User Story

As a **hiring manager or senior technical reader** evaluating this UX-engineering portfolio,
I want to **watch the factory's screenshot→pack derivation run on a subject end-to-end and see its output measured honestly against ground truth**,
So that **"this person could derive our design language from our product" becomes an observation I can inspect, with its limits stated plainly, rather than a claim I have to trust.**

## Problem Statement

The per-company brief layer's headline capability — *screenshot → proposed pack seed, human-gated* (#40) — currently exists only as build-time tooling + committed artifacts (`tooling/round-trip/`, `traces/pack-seed-verdant.jsonl`). A public reader has no way to *see* it. The epic's public layer (architecture §Recommended approach) requires the shipped site to demonstrate the generic capability on a **fictional** subject (Verdant), with the fidelity **shown, not asserted**, so there is public proof without any trademark/consent/staleness exposure from a real brand.

## Solution Statement

Add one hand-written ES view module (`system/derivation-roundtrip.mjs`) and one anchored `<section id="round-trip">` on `factory.html`. The module fetches the two committed artifacts (#40's `verdant.diff.json` and `pack-seed-verdant.jsonl`), renders the diff as a calm, honest, progressively-disclosed display (headline metric + caveat co-equal; exhaustive per-token tables behind the existing `.cs-acc` accordions; link to the raw JSON), and mounts the real recorded run in the existing stepped trace player. A ~4-line focus-scoping fix to `system/trace-player.mjs` makes the player's arrow-key stepping apply only to the focused player, so the round-trip's player and Station 05's player coexist without fighting over keyboard events. The honest **framing** (fictional notice, caveat, provisional capability label) is static HTML so it is always visible; the **numbers** are rendered from the single committed source, so there is no duplication/drift.

## Out of Scope / Non-Goals

- **Not re-running the derivation, and not editing any trace/diff/seed.** #42 is pure **view-time consumption** of #40's committed artifacts. Regenerating a trace, editing `verdant.diff.json`, or re-recording is **forbidden** (honesty contract — that is #40's job; a bad artifact is fixed by re-running #40, never by hand-editing).
- **Not the private per-company instance** (#43) — no real-brand content, no pre-seeded-from-brief wizard, no unlisted deploy (#44).
- **Not the brief→package compiler** (#39) or any new scenario package.
- **Not changing the derivation engine, the diff script, or the recorder** (`system/derive.mjs`, `tooling/diff-pack-seed.mjs`, `portal/record-derivation.mjs`) — they are #40's, already committed and green.
- **Not adding a 6th numbered station.** The page's "five stations" identity is preserved (owner decision); the exhibit is un-numbered and deep-linkable by `id` only.
- **Not making the exhibit react to the Station-01 scenario toggle.** It is a fixed Verdant exhibit, independent of `factory-intake.mjs`'s scenario switching.

## Feature Metadata

**Feature Type**: New Capability (public-facing view surface over existing committed evidence)
**Estimated Complexity**: Medium
**Primary Systems Affected**: `factory.html` (shell), a new `system/*.mjs` view module, `system/portfolio.css`, `system/trace-player.mjs` (small a11y/scoping fix), `tooling/visual-regression/` (baseline regen + waitReady)
**Dependencies**: None new. Reuses the Agent-SDK-produced committed artifacts from #40; zero runtime deps on shipped pages (hard constraint).

## Related Work

**Implements**: GitHub issue **#42** — "Public round-trip demo: Factory derivation stage + honest diff display" (`Closes #42`).   ·   **Epic**: **#38** — per-company brief layer; architecture `docs/epics/per-company-brief.architecture.md` (§Recommended approach → *Public layer*; §Spikes 1; §Boundaries → *Honesty labeling* / *Agent proposes, human decides*).

**Back-references** (this builds on / inherits from):

- **#40** (`traces/pack-seed-verdant.jsonl` + `.raw.jsonl`, `tooling/round-trip/verdant.diff.json`, `verdant.seed.json`, `tokens.verdant.css`, `input/verdant-*.png`, `tooling/round-trip/README.md`) — the entire evidence set this stage renders. Merged to `origin/main` via PR #49 + #50. **Read `tooling/round-trip/README.md` first** — it governs how each artifact should be framed.
- **#10** (`factory.html` five-station shell, `system/factory-intake.mjs`) — the station-module + honesty-label + jump-nav conventions this exhibit mirrors.
- **#5** (`system/trace-player.mjs`, `traces/README.md`) — the trace-replay canon this exhibit reuses.
- **#14** (`system/handoff-viewer.mjs`) — the structural model for the new module's pure/DOM two-export split + textContent-only untrusted-content posture.
- **#41** (`.fw-nugget` legibility-nugget register on `factory.html`) — the cited-nugget style the exhibit adds one of.

**Forward-references**:

- `#43` (private-instance shell) will reuse this module + the `pack-seed-verdant` trace as its embedded-derivation test. (none created yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE (on `origin/main`) BEFORE IMPLEMENTING

Read via `git show origin/main:<path>` if still on the stale branch; once you branch off `origin/main`, plain reads are correct.

**The render target (the diff artifact — the single source of truth for all numbers):**
- `tooling/round-trip/verdant.diff.json` (432 lines) — **the object the module renders.** Top-level keys: `spike`, `groundTruth{source,axes{brandColor,density,rewardType,frequency,improvesLives,wouldUseIt},rulesetVersion}`, `accent{token,proposed,truth,deltaE,note,threshold,within}`, `accentFamily[{token,proposed,truth,deltaE,note}]` (5), `neutrals{note,tokens[…]}` (10, **excluded from verdict**), `type{usable,checks{monotonic,bodyInRange,ratiosInBand},ratioBand,ratios,scored[{step,proposed,truth,proposedPx,truthPx,deltaPx}],unscored[{step,proposed,truth,note}]}`, `spacing{usable,checks{monotonic,multiplesOf4},steps[{step,proposed,truth,px}]}`, `radius{usable,steps[{step,proposed,truth,px}]}`, `aa{note,pairs[{fg,bg,min,usage,ratio,pass}]}` (12), `notProposed[…]`, `verdict{label,labelScope,rule,passes{accentWithin,typeUsable,spacingUsable}}`, `seedReview{approved,changedTokens,corrections{color-accent},by,date}`, `caveat`.
- `tooling/round-trip/README.md` (46 lines) — **the honesty framing for the whole exhibit.** Lines 10-16 ("controlled, favourable case… proves the PIPELINE, not high-fidelity derivation"); §36-46 (what the diff measures + why neutrals are excluded). The exhibit copy must echo this register.
- `tooling/round-trip/verdant.seed.json` (48 lines) — line 47 is the `review` block (the human gate: `changedTokens:["color-accent"]`, `corrections:{color-accent:"#2f7a4d"}`, `by`, `date`). The diff measures the agent's **raw** proposal `#2d6a48`; the human corrected to `#2f7a4d`.
- `traces/pack-seed-verdant.jsonl` (16 lines) — **the trace the player replays.** Line 1 `type:"meta"` (`label:"Real run, curated for length"`, `model:"claude-sonnet-5"`, `startedAt:"2026-07-19…"`, `curation{…}`); steps in phases `plan`(6)→`gate`(2)→`implement`(3)→`validate`(3); last line `type:"result"`. Renders as-is through `parseTrace`/`renderTracePlayer`.
- `tooling/round-trip/input/verdant-full.png` + `verdant-plant-overview.png` — the vision-input screenshots to display (fictional Verdant → no copyright concern).
- `system/tokens.verdant.css` — the ground-truth pack (context only; the diff already carries the `truth` values).

**The seams to mirror / integrate with:**
- `factory.html` (459 lines) — the shell. Key lines: CSS links **19-22**; page-scoped `<style>` **24-217**; `scroll-margin-top` rule **29** (`#intake, #generation, #prototypes, #handoff, #agents`); hero stamp "five stations" **226**; hero-sub journey **230-233**; `.cs-jump` nav **234-240**; **fictional-scenario notice pattern 253-257** (`.fw-scenario` + `.fw-scenario-tag`); **legibility-nugget pattern** 259-263 / 270-274 / 404-407 (`.fw-nugget`); Station 02 `#generation` **282-337**; Station 03 `#prototypes` starts **339**; Station 05 honesty copy + `#agents-player` **395-408**; **script tail 423-457**; **the inline trace-mount template 435-457** (fetch → `renderTracePlayer(mount, parseTrace(text))` → `mount.dataset.trace="ready"`, with an `errorCard` fallback). Insert the new section between L337 (`#generation` `</section>`) and L338/339 (Station 3 comment).
- `system/trace-player.mjs` (179 lines) — reuse `parseTrace(jsonlText)→{meta,steps,result}` (**27**) + `renderTracePlayer(container,trace)→{next,prev,reveal,revealAll,destroy}` (**97**). The `root=.trace-player` div (**100**); `onKey` arrows (**170-173**); **the global `document.addEventListener('keydown',onKey)` (174)** and `destroy` (175). The header comment 19-22 documents the "stacks unless destroy()" rule — this is what the focus-scope fix resolves. `fmtDate` renders `meta.startedAt` as a fixed `YYYY-MM-DD` (55) → **deterministic, no VR mask needed.**
- `system/handoff-viewer.mjs` — **the structural model** for the new module: two exports mirroring trace-player's pure/DOM split — `prepareHandoff(pack,vocab)→{…}` PURE/DOM-free (**38**), `renderHandoffViewer(container,model)→{destroy}` (**178/256**); `el(tag,attrs,...children)` DOM builder (**24-34**); header 20-21 "*built element-by-element via textContent — never innerHTML from data*".
- `system/factory-intake.mjs` (594 lines) — the station-module conventions: header + `// Spec:` citation line (**10-11**); self-init-by-`getElementById` with a required-anchor guard (**186-190**) + `if (typeof document !== "undefined") init();` (**594**); loaded as a bare side-effecting `<script type="module">` (factory.html **427**); `guardArrows` bubble-phase keydown guard (**177-182**) — **leave it in place** (belt-and-suspenders after the trace-player fix; do not remove). **Anti-pattern to NOT copy:** its `innerHTML`+`esc()` for `derive()` output (35 / 405-419) is licensed only because engine output is trusted; trace/diff content is untrusted → **textContent only**.
- `derive.html` — **the visual pattern** for the diff: `.swatch` = 12×12 inline-block bordered chip (**41**) rendered with an **inline `style="background:<hex>"`** data attribute (**193**) — the established, correct exception to token-discipline (the hex IS the data being shown, not a design literal); `.checks-table` (**40, 190-195**); `.gated` strike-through / `.gated-tag` for excluded items (**42-43**).
- `system/portfolio.css` (450 lines) — reuse: `.cs-jump` (154-171), **`.cs-acc` accordion** (208-243, details/summary + animated +/- marker + `:focus-visible` outline — use for progressive disclosure), **`.cs-fig` figure + `.lightbox`** (173-206, 247-281 — use for the input screenshots), `.capability`/`.capability.live` chip (395-411, "state never carried by colour alone"). Add the new `rt-*` classes here.
- `tooling/visual-regression/visual.spec.mjs` — the `factory` shot is **line 28**: `{ name:'factory', url:'/factory.html', kind:'ia', mask:'.factory-embed-figure:not([hidden]) .factory-embed', waitReady:['#reskin-preview[data-reskin]', '#agents-player[data-trace="ready"]'] }`. The `waitReady` loop is 70-71. `trace.html` is **not** in the shot list (16-33).

### New Files to Create

- `system/derivation-roundtrip.mjs` — the view module: `prepareDiff(diff)` (pure, validates+normalizes the diff JSON) + `renderRoundTrip(container, model)→{destroy}` (builds the diff DOM, textContent-only) + a self-mounting `init()` that fetches both artifacts, mounts the diff into `#roundtrip-diff` and the trace player into `#roundtrip-player`, sets the `[data-diff="ready"]` / `[data-trace="ready"]` VR handles on success, and degrades to an honest error card on failure. Imports `parseTrace`, `renderTracePlayer` from `./trace-player.mjs` (**relative** sibling import — see the import gotcha below).

### Relevant Documentation

- `docs/epics/per-company-brief.architecture.md` — **§Spikes 1 Outcome (line 66)**: the finalized capability label is **"agent-proposed, human-approved (provisional — pending a clean unrecognized-product number)."** The exhibit's capability chip MUST carry the *provisional* qualifier — the diff JSON's `verdict.label` (`"agent-proposed, human-approved"`) does **not** include it, so the provisional wording is authored copy citing this decision. Also §Recommended approach (Public layer), §Boundaries (Honesty labeling; Agent proposes, human decides).
- `traces/README.md` — the trace format + the honesty labeling convention (curated `label` rendered verbatim). Confirms the player renders committed data only.
- `.claude/references/frontend-component-best-practices.md` — on-demand for the view module.
- Memory (recall): *Calm colour constraint* (no flashy green celebration of ΔE — calm styling, craft over colour); *Five-pillar talk attribution* (nuggets cite Nielsen / Microsoft's Amershi et al. / Google PAIR only — never a talk speaker, no verbatim secondary-source reuse); *Visual-regression baseline trap* (any at-rest change to a shipped page invalidates its baseline — regen in the SAME PR; local gates can't catch it); *Site identity calls* (shipped-page identity uses "Linards Berzins", no diacritics — see Open Questions re: the reviewer name in `seedReview.by`).

### Patterns to Follow

**File header (mirror `factory-intake.mjs:1-11` / `handoff-viewer.mjs`):** open with `// system/derivation-roundtrip.mjs — …hand-written canon (this repo; not generated)` then a dedicated `// Spec:` line citing `docs/epics/per-company-brief.architecture.md` §Recommended approach (public layer) + §Spikes 1 + `epic #38, ticket #42 (closes #42)`, and a one-line view-time-safety guarantee.

**Two-export pure/DOM split (mirror `handoff-viewer.mjs`):**
```js
export function prepareDiff(diff) { /* validate shape, throw naming the offending path; return a render-ready model */ }
export function renderRoundTrip(container, model) { /* build DOM, return { destroy } */ }
```

**DOM building — textContent only, never innerHTML from data (mirror `handoff-viewer.mjs:24-34`):**
```js
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
```
Colour swatches are the ONE data-driven exception (mirror `derive.html:193`): `const sw = el('span','rt-swatch'); sw.style.background = hex; sw.title = hex;` — never build swatches via `innerHTML`.

**Self-mount + graceful fetch (mirror `factory-intake.mjs:594` + `factory.html:435-457`):**
```js
function init() {
  const diffMount = document.getElementById('roundtrip-diff');
  if (!diffMount) return;                 // inert on any page lacking the exhibit
  fetch('/tooling/round-trip/verdant.diff.json')
    .then(r => { if (!r.ok) throw new Error(`… HTTP ${r.status}`); return r.json(); })
    .then(diff => { renderRoundTrip(diffMount, prepareDiff(diff)); diffMount.dataset.diff = 'ready'; })
    .catch(err => errorCard(diffMount, `Could not load the fidelity diff — ${err.message}`));
  const player = document.getElementById('roundtrip-player');
  if (player) fetch('/traces/pack-seed-verdant.jsonl')
    .then(r => { if (!r.ok) throw new Error(`… HTTP ${r.status}`); return r.text(); })
    .then(t => { renderTracePlayer(player, parseTrace(t)); player.dataset.trace = 'ready'; })
    .catch(err => errorCard(player, `Could not load the derivation run — ${err.message}`));
}
if (typeof document !== 'undefined') init();
```
`[data-*="ready"]` is set **only on success** so a real failure fails loud (the VR gate hangs) rather than baking a false-green baseline (this rule is stated verbatim at `factory.html:429-434`).

**Errors (repo convention):** `prepareDiff` validates at the boundary and throws a plain `Error` whose message names the offending field/path (mirror `agent-layer/lib.mjs`, `portal/lib/intake.mjs`). One `errorCard` renders `{error}` gracefully at the mount.

**Token discipline:** new `rt-*` CSS references semantic tokens only (`var(--color-…/--spacing-…/--radius-…/--type-…)`); structural literals (grid/px/%) are allowed exactly as the existing factory `<style>` block and `.cs-*`/`.fw-*` classes do. No brand literal, no flashy colour.

---

## IMPLEMENTATION PLAN

### Phase 1: The view module (diff + trace, self-mounting)

Build `system/derivation-roundtrip.mjs` in isolation and validate its pure `prepareDiff` against the committed `verdant.diff.json` in Node before wiring any HTML. `renderRoundTrip` builds the diff DOM; `init` self-mounts both the diff and (via reused `trace-player.mjs`) the trace.

### Phase 2: The `trace-player.mjs` focus-scoping fix

**Independent of** Phase 1 (can run in parallel). Move the player's keydown listener from `document` to the player `root` and make `root` a focusable, labelled group, so two players on one page never both catch arrows. Re-verify Station 05 still steps by keyboard after focusing the player.

### Phase 3: `factory.html` markup + the `#round-trip` exhibit section

**Depends on:** Phases 1-2 (the mount ids + the module script). Insert the anchored section after Station 02 with static honest framing + the `#roundtrip-diff` / `#roundtrip-player` mounts + the input screenshots + the nugget; add `#round-trip` to `scroll-margin-top`; add the module `<script>`; add the `rt-*` CSS.

### Phase 4: Validation + visual-regression baseline regen

**Depends on:** Phase 3. Serve locally and walk the surface (render, deep-link, both players' keyboard independence, graceful failure). Extend the `factory` `waitReady`, regenerate the two factory baselines in Docker, run the gate. Update the CLAUDE.md architecture-map line.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute in order. Each task is atomic and independently testable.

### CREATE `system/derivation-roundtrip.mjs` — the pure view model
- **IMPLEMENT**: The file header (per Patterns) + `export function prepareDiff(diff)`: validate the diff has the keys this exhibit renders (`accent`, `accentFamily`, `neutrals`, `type`, `spacing`, `radius`, `aa`, `verdict`, `seedReview`, `caveat`), throwing `new Error("verdant.diff.json: missing <key>")` on any absent one; return a render-ready model (pass-through is fine — keep it a thin normalizer, not a transformer).
- **PATTERN**: `system/handoff-viewer.mjs:38` (`prepareHandoff` — pure, DOM-free, Node-runnable).
- **IMPORTS**: none for `prepareDiff`.
- **GOTCHA**: Keep it pure — **no `document`, no fetch** in `prepareDiff` (so it runs under Node for the Level-2 check). Do not "fix up" or recompute any number — the diff is the source of truth; only read it.
- **VALIDATE**: `node --input-type=module -e "import('./system/derivation-roundtrip.mjs').then(async m=>{const d=JSON.parse(await import('node:fs').then(f=>f.readFileSync('tooling/round-trip/verdant.diff.json','utf8')));const model=m.prepareDiff(d);console.log('ok accent ΔE', model.accent.deltaE, '· verdict', model.verdict.label);})"`
- **SATISFIES**: AC #1 (view-time-safe rendering foundation), AC #2 (renders the committed diff).

### ADD `renderRoundTrip(container, model)` to `system/derivation-roundtrip.mjs` — the diff DOM
- **IMPLEMENT**: Build, via `createElement`+`textContent` only, into `container` (which `.textContent=''` first): (1) **the headline metric** — accent `proposed` vs `truth` swatch pair + `ΔE {accent.deltaE}` + "within threshold ({accent.threshold})" stated calmly (no big green tick); (2) **the human gate** — "agent proposed `{seedReview? use accent.proposed}` → human corrected to `{seedReview.corrections['color-accent']}` (approved {seedReview.date})", two swatches; (3) **the verdict panel** — `verdict.label` + `verdict.rule` + the three `passes`, AND render `verdict.labelScope` verbatim (it distinguishes "the tier the capability earns" from "this seed was human-approved" — do **not** collapse them); (4) **progressive disclosure** in `.cs-acc` accordions: "Accent family (5)", "Neutrals — reported, excluded from the verdict (10)" (render `neutrals.note`; style rows `.rt-excluded`/muted), "Type ramp" (scored steps + `unscored` labelled "reported, not scored — viewport artifact" + `type.checks`), "Spacing & radius" (+ `checks`), "WCAG AA — 12 pairs" (fg/bg swatches + `usage` + `ratio`/`min` + pass). Each table via a small `rt-diff-table` builder. Return `{ destroy }` (clears the container).
- **PATTERN**: `derive.html:190-195` (swatch/checks-table), `derive.html:193` (`style="background:<hex>"`), `system/handoff-viewer.mjs:178-256` (container render + `{destroy}`); accordions reuse `.cs-acc` markup (`portfolio.css:208-243`).
- **IMPORTS**: none (self-contained DOM helpers).
- **GOTCHA**: Untrusted-content posture — **never `innerHTML` from `diff` data** (this is real agent-derived output). Swatch colour is the only place a hex string touches the DOM, via `.style.background`, never markup. Keep the visual **calm** (memory: calm-colour): the ΔE is shown and contextualized, not celebrated; the caveat (static HTML, see next task) sits co-equal with the metric, not beneath it.
- **VALIDATE**: (after Phase 3 wiring) visual — see Level 4. Structurally: `node --input-type=module -e "import('./system/derivation-roundtrip.mjs').then(m=>console.log(typeof m.renderRoundTrip))"` prints `function`.
- **SATISFIES**: AC #2 (diff shown, not asserted; verdict + gate + excluded-neutrals all honest).

### ADD `errorCard(mount, message)` + `init()` self-mount to `system/derivation-roundtrip.mjs`
- **IMPLEMENT**: `errorCard` mirrors `factory.html:438-453` (an `article.card` with an `h3` "…unavailable" + a muted `p`). `init()` per the Patterns snippet: guard on `#roundtrip-diff` (inert if absent), fetch `/tooling/round-trip/verdant.diff.json` → `prepareDiff` → `renderRoundTrip` → `dataset.diff="ready"`; fetch `/traces/pack-seed-verdant.jsonl` → `renderTracePlayer(player, parseTrace(text))` → `dataset.trace="ready"`; `errorCard` on either failure. End with `if (typeof document !== "undefined") init();`.
- **PATTERN**: `factory.html:435-457` (fetch/parse/render/ready-gate/errorCard), `factory-intake.mjs:186-190,594` (guard + self-init).
- **IMPORTS**: `import { parseTrace, renderTracePlayer } from "./trace-player.mjs";` — **RELATIVE** sibling import (matches `factory-intake.mjs:28` `import { derive } from "./derive.mjs"`). Do NOT use the absolute `/system/…` form: that only works for factory.html's *inline browser* `<script>`; under Node a leading `/` is a filesystem path, so the absolute form would break the Level-2 validation. Keep the runtime **fetch URLs** root-absolute (`/tooling/round-trip/verdant.diff.json`, `/traces/pack-seed-verdant.jsonl`) — those are browser fetches, and the VR gate's `serve.mjs` roots the repo root so they resolve in-gate too.
- **GOTCHA**: Set `dataset.diff`/`dataset.trace` **only on success**. The two fetches are independent — a diff failure must not block the trace mount and vice-versa. `res.json()` for the diff, `res.text()` for the JSONL.
- **VALIDATE**: syntax — `node --check system/derivation-roundtrip.mjs`.
- **SATISFIES**: AC #1 ("nothing can fail on stage" — graceful degradation; no live LLM).

### UPDATE `system/trace-player.mjs` — scope the keydown listener to the player root
- **IMPLEMENT**: After `const root = el('div','trace-player');` (line 100), make the player a focusable labelled group: `root.tabIndex = 0; root.setAttribute('role','group'); root.setAttribute('aria-label','Trace replay — use arrow keys to step');`. Change the listener target from `document` to `root`: line 174 → `root.addEventListener('keydown', onKey);`; line 175 `destroy` → `root.removeEventListener('keydown', onKey); container.textContent = '';`. Reword the header comment (19-22) to state the listener is now scoped to the player root (only the focused player responds; multiple players coexist), keeping `destroy()` as cleanup hygiene.
- **PATTERN**: existing `renderTracePlayer` (97-179); a11y-focus outline mirrors `.cs-acc summary:focus-visible` (`portfolio.css:231`).
- **IMPORTS**: none.
- **GOTCHA**: `onKey` needs **no** `activeElement` gate — a root-scoped listener only fires when focus is within `root` (its `<button>`s are focusable descendants; `tabindex=0` makes the group itself focusable). Keep `e.preventDefault()` on the arrows (stops page-scroll while focused). **Do NOT remove** `factory-intake.mjs`'s `guardArrows` (177-182) — it is now redundant but harmless (surgical-changes rule). Add a focus-visible rule for the newly-focusable root in `portfolio.css` (next task).
- **VALIDATE**: `node --check system/trace-player.mjs`; then Level-4 keyboard check (below) — arrows step **only** the focused player; Station 05 still steps after you focus it.
- **SATISFIES**: AC #3 (a11y — two players don't fight; keyboard stepping is focus-scoped).

### ADD `rt-*` styles + trace-player focus outline to `system/portfolio.css`
- **IMPLEMENT**: Token-only classes for the exhibit: `.rt-swatch` (≈14×14 inline-block, `border:1px solid var(--color-border)`, `border-radius:var(--radius-sm)`), `.rt-swatch-pair` (flex row), `.rt-metric` (the headline row), `.rt-caveat` (a bordered `var(--color-bg-surface)` panel — visually **co-equal** with `.rt-metric`), `.rt-verdict`, `.rt-gate` (the human-gate callout), `.rt-diff-table` (mirror `derive.html`'s `.checks-table`: full-width, `th` left-aligned muted, cell padding via `var(--spacing-…)`), `.rt-excluded` (muted / de-emphasized rows for neutrals, mirror `.gated`). Plus: `.trace-player:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }`.
- **PATTERN**: `derive.html:40-44` (checks-table/swatch/gated), `portfolio.css:395-411` (`.capability` register), `portfolio.css:231` (focus-visible).
- **GOTCHA**: No brand literals, no flashy colour (memory: calm-colour). "State never carried by colour alone" (`portfolio.css:393`) — pass/within/excluded must read from text/shape, not just a green/grey. Swatch background colour is set inline from data (JS), NOT in this CSS.
- **VALIDATE**: renders under neutral pack (Level 4); no `#RRGGBB`/named-colour literal introduced (`git diff origin/main -- system/portfolio.css | grep -nE "#[0-9a-fA-F]{3,6}|rgb\(" ` returns nothing new).
- **SATISFIES**: AC #3 (renders under the neutral pack; calm/craft styling).

### UPDATE `factory.html` — insert the `#round-trip` exhibit section (static framing + mounts)
- **IMPLEMENT**: Insert a `<section class="section" id="round-trip">` between Station 02's closing `</section>` (~L337) and the Station-3 comment (~L338). Contents, in order: an eyebrow/heading that reads as an **exhibit, not a numbered station** (e.g. `<p class="hero-eyebrow">Fidelity evidence</p>` + `<h2>The derivation round-trip</h2>` — do **not** use a `.num` chip); a **capability chip** `<span class="capability">agent-proposed, human-approved · provisional</span>` with a caption citing the pending clean unrecognized-product number; the **honest headline** (static prose: the factory ran screenshots→pack end-to-end on Verdant's own screens and measured the result — proves the pipeline + honest measurement, **not** high-fidelity derivation in the wild); the **fictional-subject notice** (reuse `.fw-scenario` + `.fw-scenario-tag "Fictional scenario"`, Verdant wording from `factory-intake.mjs:50`); the **caveat panel** `.rt-caveat` (static prose paraphrasing `tooling/round-trip/README.md:10-16` + naming the excluded neutrals); the **vision-input** `.cs-fig` figure(s) wrapping the two `input/verdant-*.png` with a zoom `.lightbox`; a `<div id="roundtrip-diff"><p class="muted">Loading the fidelity diff…</p></div>` mount; a `<div id="roundtrip-player" style="margin-top:var(--spacing-2xl);"></div>` mount preceded by scenario-neutral honesty copy ("A real Claude Agent SDK run… replayed; nothing runs live — a committed file") and one `.fw-nugget` (cite PAIR/Amershi/Nielsen on *showing the diff rather than asserting fidelity* — transparency / "make clear why the system did what it did"); and an **inspect-the-raw-evidence** link to `/tooling/round-trip/verdant.diff.json` (+ the README).
- **PATTERN**: `factory.html:253-257` (fictional notice), `:404-407` (nugget), `:395-402` (scenario-neutral trace copy), `.cs-fig`/`.lightbox` (`portfolio.css:173-206,247-281`), `.hero-eyebrow`/`.capability` reuse.
- **GOTCHA**: The **framing is static HTML** (always visible even if JS/fetch fails); the **numbers are JS-rendered** (single source). Don't hand-copy diff numbers into the static prose (drift risk) — the static prose is qualitative (caveat, provisional label, fictional notice); the quantitative headline (ΔE, swatches, tables) comes from the module. The exhibit is **scenario-independent** — do not wire it to `#scenario-toggle`. Keep the public name "Linards Berzins" (no diacritics) in any authored copy (memory: site identity); the committed trace/seed `by` field is data (see Open Questions).
- **VALIDATE**: Level 4 (serve + `/factory.html#round-trip`).
- **SATISFIES**: AC #2 (honest labels, fictional notice, caveat), AC #3 (deep-linkable by id).

### UPDATE `factory.html` — `scroll-margin-top`, the module `<script>`, and (do NOT) the nav
- **IMPLEMENT**: Add `#round-trip` to the `scroll-margin-top: 90px` selector list (line 29) so the deep link clears the sticky header. Add `<script type="module" src="/system/derivation-roundtrip.mjs"></script>` to the script tail (after `factory-intake.mjs`, ~L427). **Do not** add a `.cs-jump` chip and **do not** touch the "five stations" copy (L7, L14, L226, L230-233) — the exhibit is un-numbered by decision. Optionally add one subtle inline link in Station 02's closing prose: `<a href="#round-trip">…the round-trip →</a>` for discoverability.
- **PATTERN**: `factory.html:29` (scroll-margin), `:426-427` (module script tags).
- **GOTCHA**: If you skip the scroll-margin edit, `/factory.html#round-trip` lands under the fixed header. The module self-mounts — pass it nothing (bare side-effecting script, like `factory-intake.mjs`).
- **VALIDATE**: deep-link scroll lands below the header (Level 4).
- **SATISFIES**: AC #3 (deep-linkable per the shell's routing; five-station identity preserved).

### UPDATE `tooling/visual-regression/visual.spec.mjs` — wait for the new async mounts
- **IMPLEMENT**: Extend the `factory` shot's `waitReady` array (line 28) to `['#reskin-preview[data-reskin]', '#agents-player[data-trace="ready"]', '#roundtrip-diff[data-diff="ready"]', '#roundtrip-player[data-trace="ready"]']`. Do **not** add a mask (the diff, trace, and static input PNGs are deterministic).
- **PATTERN**: the existing entry + the waitReady loop (70-71) + its comment (23-27).
- **GOTCHA**: Without these two handles the gate may screenshot before the diff/trace paint → a flaky or false baseline. The input `<img>`s are static same-origin (deterministic) — no mask; if they ever prove flaky, wrap them so they're covered by a ready handle rather than masking (masking would hide real content). Leave `trace.html` out of scope (not in the shot list).
- **VALIDATE**: `cd tooling/visual-regression && npx playwright test factory` fails *loud* (hangs on waitReady) if a handle is wrong, before you regenerate.
- **SATISFIES**: AC #1/#3 (deterministic capture; the exhibit can't race the gate).

### REGENERATE the factory visual-regression baselines (SAME PR)
- **IMPLEMENT**: `cd tooling/visual-regression && npm run update:docker` — regenerates all baselines in the Linux Docker image; the only ones that should change are `baselines/factory-neutral.png` + `baselines/factory-saulera.png`. Review the diff of those two PNGs to confirm the new exhibit renders under **both** packs and nothing else moved.
- **PATTERN**: memory *Visual-regression baseline trap*; `package.json` `update:docker` script.
- **GOTCHA**: This is a Linux baseline — running Playwright locally on macOS produces platform-different pixels (memory: *local agent + visual gate*); use the Docker script. A fresh worktree needs `npm ci` in `tooling/visual-regression` first. Only `factory-*` baselines should change — if others do, something leaked.
- **VALIDATE**: `cd tooling/visual-regression && npx playwright test` → green (or the CI gate).
- **SATISFIES**: AC #1/#3 (no regression; the shipped page's baseline is truthful).

### UPDATE `CLAUDE.md` architecture map + `docs/epics/per-company-brief.architecture.md`
- **IMPLEMENT**: Add a one-line `system/derivation-roundtrip.mjs` entry to the CLAUDE.md architecture map (in the `system/` block, register format matching neighbours: what it is · what drives it · epic/ticket) and note the round-trip stage on `factory.html`. In the epic architecture doc (`docs/epics/per-company-brief.architecture.md`), strike "public round-trip demo stage + diff display" from `## Missing pieces` (line 56). Note: the `## Tickets` checklist lives in the **GitHub epic #38 issue body**, not this doc file — ticking `#42` there happens via `Closes #42` on the PR, not a doc edit.
- **PATTERN**: existing architecture-map lines (e.g. `handoff-viewer.mjs`, `agentic-study.mjs`); prior "docs: architecture-map lines" commits from #13/#41.
- **GOTCHA**: These are docs — do not let them drift from what shipped. Keep the CLAUDE.md line one sentence (memory/rules stay lean).
- **VALIDATE**: `git diff --stat` shows only the intended doc lines changed.
- **SATISFIES**: housekeeping (keeps the rules file true; not a functional AC).

---

## TESTING STRATEGY

No test suite / linter / type-checker exists (CLAUDE.md: "run the surface you touched"). "Done" = the module's pure function validates in Node, the page renders + behaves under a local server, and the visual-regression gate is green with regenerated factory baselines.

### Unit-ish (Node, pure function)
- `prepareDiff(verdant.diff.json)` returns a model with `accent.deltaE === 0.05`, `verdict.label`, `seedReview.corrections['color-accent'] === '#2f7a4d'` — and **throws naming the field** when given `{}` (feed `m.prepareDiff({})` and confirm the error message names the first missing key).

### Integration (served page)
- `npx serve .` → `http://localhost:3000/factory.html#round-trip`: exhibit renders under the neutral pack; the diff numbers on screen match `verdant.diff.json` (spot-check accent ΔE 0.05, WCAG "12 pairs, all pass", neutrals labelled *excluded*); the trace player steps through plan→gate→implement→validate; the input screenshots open in the lightbox.

### Edge cases
- **Graceful failure:** temporarily rename `tooling/round-trip/verdant.diff.json`, reload → the `#roundtrip-diff` mount shows the honest error card, the static framing (caveat, fictional notice, provisional label) remains, the page does not blank, and the trace still mounts. Restore the file.
- **Two-player keyboard independence (the canon-fix regression):** focus the round-trip player, press →/← → **only** it steps; focus the Station-05 player → only it steps; with neither focused, arrows scroll the page (do not step either). This is the specific behaviour the `trace-player.mjs` change must produce.
- **`trace.html` still steps (other consumer of the changed canon):** `trace.html` is a shipped page on the same player and is **not** in the VR shot list, so no baseline catches a regression. Load `/trace.html?trace=pack-seed-verdant` (or the default `demo-notice`), focus the player, arrow-step → confirm it still works after the keydown-scoping change.
- **Deep link under header:** load `/factory.html#round-trip` cold → the heading sits below the sticky header (scroll-margin applied).
- **Scenario toggle isolation:** switch the Station-01 scenario to Fieldwork → the round-trip exhibit is unchanged (still Verdant).

---

## VALIDATION COMMANDS

Run from repo root unless noted.

### Level 1: Syntax
- `node --check system/derivation-roundtrip.mjs`
- `node --check system/trace-player.mjs`

### Level 2: Unit (pure function)
- `node --input-type=module -e "import('./system/derivation-roundtrip.mjs').then(async m=>{const fs=await import('node:fs');const d=JSON.parse(fs.readFileSync('tooling/round-trip/verdant.diff.json','utf8'));const model=m.prepareDiff(d);if(model.accent.deltaE!==0.05)throw new Error('accent ΔE drift');console.log('✓ prepareDiff ok');try{m.prepareDiff({});throw new Error('should have thrown')}catch(e){console.log('✓ throws on empty:',e.message)}})"`

### Level 3: Portal/site smoke (unchanged surfaces still fine)
- `cd portal && npm start &` then `curl -s localhost:4747/api/health` → `{"ok":true}` (confirms no accidental portal breakage; the portal is untouched but this is the repo's smoke check). Kill after.
- Token discipline: `git diff origin/main -- system/portfolio.css system/components.css | grep -nE "#[0-9a-fA-F]{3,6}|rgb\("` → no new colour literals (swatch colours are inline-from-data in JS, not CSS).

### Level 4: Manual (served page)
- `npx serve .` → walk the Integration + Edge-case scripts above at `/factory.html#round-trip`.

### Level 5: Visual-regression gate
- `cd tooling/visual-regression && npx playwright test factory` (should currently FAIL until baselines regen — proves waitReady wiring first).
- `cd tooling/visual-regression && npm run update:docker` → regenerate; confirm **only** `baselines/factory-neutral.png` + `factory-saulera.png` changed.
- `cd tooling/visual-regression && npx playwright test` → all green.

---

## ACCEPTANCE CRITERIA

From issue #42:

- [ ] **AC1** — A Factory-page stage (view-time-safe, vanilla) replaying the derivation trace **and** rendering the diff; no live LLM at view time; nothing can fail on stage. *(→ `derivation-roundtrip.mjs` fetches committed files only, degrades to error cards; the trace uses the committed player; static framing survives JS failure.)*
- [ ] **AC2** — Honest labels: trace labelled "real run, curated"; the diff **shown, not asserted**; fictional-subject notice present. *(→ player renders `meta.label` verbatim; the diff display shows the ΔE/verdict/gate/excluded-neutrals from the artifact; `.fw-scenario` notice + `.rt-caveat` + provisional capability chip; `verdict.labelScope` vs `seedReview` distinction preserved.)*
- [ ] **AC3** — Renders under the neutral pack; deep-linkable per the shell's station routing; a11y consistent with the shell's bar. *(→ token-only `rt-*` CSS; `#round-trip` id + `scroll-margin-top`; `.cs-acc` accordions + focus-scoped players + native anchors; factory baselines regenerated under neutral + saulera.)*
- [ ] The honesty **crux**: the exhibit reads as "the pipeline runs end-to-end, measured honestly on a **controlled, favourable** case," NOT "derivation is accurate." Caveat co-equal with the metric; capability chip carries the **provisional** qualifier.
- [ ] No regression: Station 05's player still keyboard-steps (after focus); the scenario toggle and the wizard are unaffected; the VR gate is green.

---

## COMPLETION CHECKLIST

- [ ] Branch cut from `origin/main` (not the stale motion branch).
- [ ] `system/derivation-roundtrip.mjs` created; `prepareDiff` pure + validates; `renderRoundTrip` textContent-only; self-mounts + degrades gracefully.
- [ ] `trace-player.mjs` keydown scoped to the player root; root focusable + labelled; header comment updated; `guardArrows` left intact.
- [ ] `factory.html`: `#round-trip` section with static framing + mounts + screenshots + nugget; `scroll-margin-top` includes `#round-trip`; module `<script>` added; "five stations" copy untouched.
- [ ] `portfolio.css`: `rt-*` classes + `.trace-player:focus-visible`; no new colour literals.
- [ ] `visual.spec.mjs` `waitReady` extended (4 selectors); factory baselines regenerated in Docker (only `factory-*` changed); gate green.
- [ ] CLAUDE.md architecture map + epic doc updated.
- [ ] All Level 1-5 validations pass; the two-player keyboard-independence + graceful-failure edge cases verified by hand.
- [ ] Nothing under `traces/` or `tooling/round-trip/` was regenerated or hand-edited (view-time consumption only).

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions:**
1. `/tooling/round-trip/verdant.diff.json` (+ the input PNGs) is served both by Pages **and by the VR gate** — confirmed: `.gitignore` excludes only `tooling/figma/.last-response.json`; CLAUDE.md "deploy = commit the artifacts, Pages serves the repo as-is"; and `tooling/visual-regression/serve.mjs` roots the **repo root** with `.json`/`.png` in its MIME map, so `/tooling/**` and `/traces/**` resolve in-gate (the two new `waitReady` handles will paint, not hang). Fetching from `/tooling/round-trip/` is intentional and on-brand (points readers at the real evidence folder the README frames as "public, inspectable evidence").
2. The exhibit consumes #40's artifacts **as-is**; the accent ΔE 0.05 and all values are frozen. If #40 ever regenerates the diff, only the JS-rendered numbers change (single source) — the static framing is qualitative and won't drift.
3. Placement + trace-replay approach are **decided** (owner, this session): anchored un-numbered `#round-trip` exhibit after Station 02; full inline stepped player + the trace-player focus fix.

**Open questions (low stakes — pick a sensible default, note it):**
- **Reviewer name form.** `seedReview.by` / the trace `meta` carry "Linards Bērziņš" (with diacritics); shipped-page identity is "Linards Berzins" (no diacritics, memory: *Site identity calls*). Default: render the human-gate **action** ("human-approved · one token corrected · 2026-07-19") and omit the name from the authored diff display (the name remains in the inspectable JSON/trace for anyone who looks). The trace player renders `meta` verbatim as committed data (do not alter #40's files).
- **`.cs-jump` chip?** Decision was "no numbered chip." If discoverability proves weak, add a single un-numbered inline link from Station 02 (already suggested) rather than a nav chip — keeps the five-station nav rhythm clean.
- **Input-screenshot flakiness in VR.** Expected fine (static same-origin PNGs, deterministic; `serve.mjs` serves `.png`). If they race the capture, cover them with a ready handle — do **not** mask (masking would hide real exhibit content).
- **Optional accordion: `notProposed` + `groundTruth.axes`.** The diff also carries `notProposed` (10 tokens the agent didn't propose — contract-filled) and `groundTruth.axes` (the Verdant intake that defines ground truth). Neither is AC-required, but "here's what the agent did **not** propose" is squarely in the shown-not-asserted spirit — worth **one** `.cs-acc` line if it reads well; do not let it grow scope beyond that.

## NOTES (open canvas)

**Why static framing + JS numbers (the honesty-robustness split).** The advisor flagged that ΔE 0.05 renders as a green "within ✓" that the eye reads as "accurate" before the caveat corrects it. Two mitigations, both load-bearing: (a) the qualitative honesty — caveat, "controlled favourable case," fictional notice, provisional label — is **static HTML**, so it's visible even if the module never runs; (b) the quantitative headline is **calm** (no celebratory green, ΔE contextualized inline, caveat panel co-equal not subordinate). The exhaustive tables (10 neutrals, 8 spacing, 12 AA pairs, accent family) live behind `.cs-acc` accordions — this simultaneously serves the calm-colour bar, keeps the code proportionate, and puts the full data one click away (with the raw JSON one more click away) in keeping with the repo's inspectable-proof ethos.

**Why the trace-player fix is the right small change, not a workaround.** The current global `document` keydown means arrow keys anywhere on the page step Station 05 — already slightly surprising, and the reason `factory-intake.mjs` needs `guardArrows`. Scoping the listener to the focused player root is the *correct* behaviour for "two independently-steppable players," improves Station 05's a11y (labelled group, focus-scoped keys), and is ~4 lines + one CSS rule. It touches canon, so it carries a Station-05 re-verify + baseline regen — both already required by this ticket.

**The `verdict.label` vs the capability label — do not conflate.** The diff JSON's `verdict.label` is `"agent-proposed, human-approved"` (the fidelity **tier** this measurement earns, per the decision rule — see its own `labelScope`). The architecture §Spikes 1 **capability** label is `"agent-proposed, human-approved (provisional — pending a clean unrecognized-product number)"`. The static capability chip carries the *provisional* wording (authored, cites the architecture); the JS verdict panel shows the raw measured `verdict.label` + `labelScope`. Both are true; showing both, distinctly, is the honest move.

**Parallelization.** Phase 1 (the module) and Phase 2 (the trace-player fix) are independent and can run in separate worktrees / loops; Phase 3 depends on both (it needs the mount ids + the module script + the scoped player). Phase 4 (VR) is last. Given the size (~500-1000 lines, mostly the diff renderer), a single-session sequential run is fine.

**Confidence: 8.5/10** for one-pass success. The render target, the reuse APIs, the honesty framing, the integration points (scroll-margin, waitReady, script tail), and the canon fix are all pinned to exact `origin/main` lines. Residual risk is cosmetic: the exact visual weight/layout of the diff display (a design judgement to iterate against the calm-colour bar under both packs) and confirming the input `<img>`s don't need special VR handling — both surface immediately at Level 4/5 and are cheap to adjust.

## AMENDMENTS

- (none yet — created 2026-07-20)
