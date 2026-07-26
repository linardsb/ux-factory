# Feature: public drop-to-re-skin — a reader drops their design tokens and the portfolio wears them

The following plan should be complete, but it is important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and modules. Import from the right files.
**This ticket's central risk is not new code — it is a refactor of four files that changed in five
PRs over two days (#118, #120, #124, #126, #128, #131).** Rebase on `origin/main` before you start,
and treat CLI byte-parity as a hard gate, not an assertion.

Ticket: **#130** · owner ask 2026-07-26: *"we need to add the import to the main portfolio."*

---

## Feature Description

A hiring manager opens the portfolio, drops their design system's **JSON token export** on the
home page, and the whole site re-skins to their tokens — colour, spacing, radius, type ramp and
shadows — live in the browser, with the mapping report and the WCAG receipts shown, and the pack
(`tokens.<slug>.css`) downloadable. Nothing is uploaded; there is no server on the shipped site.

This is the reader-facing half of #116. #116 gave the *operator* a drop zone in the portal that
writes `system/tokens.<slug>.css` to disk. This gives the *reader* the same engine with a download
instead of a disk write, and turns the platform's core claim from "watch my demo re-skin" into
"watch it wear **ours**". The #116 plan §6 scoped this out and named it *"the platform's thesis made
literal."*

**Input is JSON only.** DTCG (`$value`/`$type`), Tokens Studio (`{value,type}`), a plugin variables
dump (`collections → modes → variables`), a raw REST variables envelope, or any nested name→value
JSON. Not a `.fig` binary. **No URL field** — see Constraints below; this is measured, not a
preference.

## User Story

As a **hiring manager evaluating a senior UX-engineer candidate**
I want to **drop my own design system's token export onto their portfolio and watch the site wear it**
So that **I can verify the token contract is genuinely brand-agnostic on my own design work, in
seconds, instead of trusting a claim about it.**

## Problem Statement

The site proves brand-agnosticism against packs this repo controls: `neutral` and `verdant` are
generated here, `saulera` is hand-authored here. `plusui` is the one exception — someone else's
Figma file — and it exists precisely because a contract that only ever wears its author's own packs
proves nothing. But even `plusui` is *committed*: the reader watches a pack the author chose,
imported at authoring time, on the author's terms.

A reader cannot currently test the claim with a design the author has never seen. The engine that
would let them (`runPull` in `tooling/figma/figma-pull.mjs`) is Node-only: it reads from disk,
writes to disk, logs to stdout, and its pure mapping core is entangled with `node:fs` across four
files. Shipped pages are vanilla with no build step, so "just import it" is not available.

## Solution Statement

1. **Extract the mapping engine once**, into a view-time-safe `system/pack-import.mjs` with zero
   Node imports. The four Node files (`figma-pull.mjs`, `figma-read.mjs`, `gen-pack-css.mjs`,
   `gen-token-css.mjs`) keep only their disk/network/CLI halves and import the core. **One engine,
   never a fork** — a second copy of contrast negotiation would rot, and the honesty contract
   cannot tolerate the CLI and the browser disagreeing about what a design maps to.
2. **A drop zone inside home's beat 02 ("Your brand")**, beside the existing colour picker. It reads
   the file in the browser, runs the real engine, and renders a summary + a `<details>` disclosure
   holding the full mapping and WCAG tables.
3. **"Wear it" is an explicit click**, after the report. It stores the vetted token map in
   `sessionStorage` and mounts a `<style>` rule; `system/pack-boot.js` re-emits it pre-paint on every
   page, so the pack follows the reader for the visit.
4. **"Download" emits `tokens.<slug>.css` as a Blob** — byte-identical to what the CLI writes,
   header and all (ramps leaned on, rungs synthesised, every contrast negotiation, everything
   auto-filled from this repo's defaults, every WCAG pair still failing).
5. **The appearance dock gains a fifth mode**, so the reader can switch between their design, the
   committed packs and "your brand" and compare — which is the affordance that makes the proof land.

## Out of Scope / Non-Goals

Confirmed with the owner 2026-07-26:

- **Not included: a URL / Figma-API field.** Measured and closed in the #116 plan §2 — Variables
  REST is Enterprise-only, `GET /files/:key/styles` answers `[]` off Enterprise, `FIGMA_TOKEN` is
  server-side, budget ~6 file reads/month. A URL box would be an affordance that fails on most real
  designs, which is the exact overclaim the honesty contract forbids. **Do not add one.**
- **Not included: `instance.html`.** A private per-company instance PINS its pack — that is the
  guarantee #43/#44 were built around, and `instance.html` deliberately opts out of the dock for
  this reason (its head comment records why). Explicitly reconfirmed by the owner. Do not add a drop
  zone there. (A follow-up ticket may revisit it; this one does not.)
- **Not included: fonts and components.** Engine-level, by design (handover §B G3/G4), not a gap
  this ticket closes. The report says so out loud.
- **Not included: an imported pack in a share link (#77).** `share-state.mjs` carries `brandColor` +
  `name`; 64 contract tokens will not fit a URL. The close card's share behaviour is unchanged.
- **Not included: a download in the portal drawer.** #116's drawer keeps writing to disk. Owner
  confirmed.
- **Not changing: the CLI.** `tooling/figma/figma-pull.mjs` output must stay **byte-identical** and
  every refusal message must stay **verbatim**. Same for `portal/lib/figma.mjs` and the portal
  drawer's behaviour.
- **Not changing: `tokens.plusui.css`.** Issue #129 is open against it. Do not touch it; if the
  extraction changes its bytes, the extraction is wrong.
- **Not included: a Web Worker.** Owner chose the pending-state route (Task 15). Do not add one.

## Feature Metadata

**Feature Type**: New Capability (+ a substantial Refactor underneath it)
**Estimated Complexity**: **High** — a four-file extraction under a byte-parity gate, a change to
the VR-critical `pack-boot.js`, a fifth mode across the dock's four branch points, and a VR baseline
cascade.
**Primary Systems Affected**: `system/` (new engine + new record + new beat UI + `pack-boot.js` +
`dock.mjs` + `pack-derived.mjs` + `spine.mjs` + `portfolio.css`), `index.html`,
`tooling/figma/`, `agent-layer/`, the committed VR baselines.
**Dependencies**: none new. Zero runtime deps (hard constraint). The engine's only imports are
`system/oklch.mjs`, `system/wcag.mjs`, `system/derive.rules.mjs` — all already view-time-safe.

## Related Work

**Implements**: [#130](https://github.com/linardsb/ux-factory/issues/130) — the PR body MUST carry
`Closes #130` (CLAUDE.md: a title mentioning `(#130)` closes nothing).
**Epic**: none directly; governed by `docs/epics/ai-first-ux-factory.prd.md` (honesty contract,
vanilla constraint) and `docs/epics/portfolio-v3-experience.prd.md` §6.1 beat 2b (the brand beat).

**Back-references** (plans this builds on and inherits decisions from):

- `.claude/plans/figma-drop-portal-ui.md` — **read §2, §6, §7 before starting.** §2's four measured
  constraints are closed decisions; §6 is this ticket's own scoping paragraph; §7 is the honesty
  checklist this ticket inherits wholesale.
- `.claude/plans/figma-drop-portal-ui-implementation.md` — the portal drawer's task-level plan; the
  slug guard, the candidate-swatch refusal UI and the report tables are all modelled here.
- `.claude/plans/figma-any-design-handover.md` §A — owner decisions that **must not be reopened**
  (the refusal stays a refusal; components never import).
- `.claude/plans/figma-import-scales-and-dock.md` — the scale import (families, rank, all-or-nothing)
  and the `plusui` dock row.
- `.claude/plans/v3-your-brand-input-derived-pack-persistence.md` — the `:root` apply path, the
  record contract, `pack-boot.js`'s allowlist. **The direct model for everything in Phase 3.**
- `.claude/plans/shared-link-brand-restore.md` (#108) — the displaced-record machinery and the
  dock/beat arbitration scars (#102/#103).

**Forward-references**: (none yet)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

**The engine being extracted (read all four in full — this is the refactor's surface):**

- `tooling/figma/figma-pull.mjs` (all 770 lines) — Why: the whole mapping engine. Lines 71–91
  `ROLES`, 103–163 `SCALE_ROLES`/`FAMILY_*`/`classifyDimension`, 166–234 shadows + `collectScales`,
  240–331 `formatScale`/`fillScales`, 335–386 `toRamps`/`deriveRamps`, 428–483
  `nearestRung`/`classifyRamps`/`pickRamps`, 486–510 `negotiate`, 512–758 `runPull`. **Lines 675–714
  are the pack header `label`** — the download must carry it verbatim.
- `tooling/figma/figma-read.mjs` (lines 49–52 `rgbaToHex`, 125–137 `entriesFromVariables`, 158–226
  `pluginShadow`/`leafEntry`/`entriesFromExport`) — Why: the export parsers. Everything else in the
  file is `node:fs`/`fetch`/cache and stays put. **Note line 194's `console.log`** — the core must be
  silent; that message becomes returned data.
- `agent-layer/gen-pack-css.mjs` (all 181 lines; esp. 38–58 `loadContract`, 68–90 `emitPack`,
  95–145 `genPackCss`) — Why: the pack emitter + the contract completion/auto-fill logic. Only the
  `readFileSync`/`writeFileSync` halves are Node.
- `agent-layer/gen-token-css.mjs` (lines 64–69 `cssValue`, and `aliasPath` above it) — Why: pure
  functions trapped in a `node:fs`-importing module. Needed for auto-filled aliases and font stacks.

**The apply path (the model for Phase 3 — read all three in full):**

- `system/pack-derived.mjs` (all 497 lines; esp. 79–80 the allowlist regexes, 126–151
  `applyToRoot`/`clearRoot`/`derivedOnRoot`, 157–221 the record read/write, 223–258 `wear`/`unwear`,
  291–442 `wireBeatBrand`) — Why: **this is the pattern to mirror**, and the file the new record
  module is a sibling of.
- `system/pack-boot.js` (all 38 lines) — Why: pre-paint restore. **VR-critical**: its guaranteed
  no-op with empty storage is what `tooling/visual-regression/visual.spec.mjs` relies on. Lines
  32–37 are the allowlist the new branch mirrors in shape.
- `system/dock.mjs` (all 425 lines; esp. 31–41 `PACKS`/`PACK_RE`, 91–94 `groundTruth`, 138–167
  `renderPacks`/`syncChecked`, 169–246 `selectPack`, 334–357 the copy handler) — Why: the four
  branch points a fifth mode touches. #102/#103 are the scar tissue for what happens when they
  disagree.

**The host surface:**

- `index.html` lines 140–182 (`#beat-brand`) — Why: the exact markup the drop zone joins, and the
  at-rest state the VR baseline captures. Lines 370–382 — the module script tags.
- `system/portfolio.css` lines 1260–1345 (`.brand-input` … `.brand-label`) — Why: the styling
  idiom the drop zone matches (grid, `--spacing-*`, `min-width: 0`).
- `system/spine.mjs` lines 30–34 `isWearingDerived()` — Why: the hero's canned re-skin must also
  stand down for an imported pack, or it overwrites it on home.
- `system/wcag-receipts.mjs` (all 69 lines) — Why: the existing receipt presentation and its `el()`
  builder idiom (never `innerHTML` from data).

**The reference implementation of the same UI, in a place that already works:**

- `portal/public/portal.js` lines 135–330 — Why: the drop zone, the client-side pre-checks, the
  candidate-swatch refusal, `renderScales`, `renderReport`. **Reuse the copy verbatim where it
  fits** — it was reviewed and shipped in PR #124. Note it uses `innerHTML` with an `esc()` helper;
  the shipped-page modules use a DOM `el()` builder instead (`dock.mjs:46`, `wcag-receipts.mjs:33`)
  — **follow the shipped-page idiom, not the portal's.**
- `portal/lib/figma.mjs` lines 25–34 — Why: the slug guard (`SLUG_RE`, `RESERVED`) to adapt.

**The gates:**

- `tooling/drift-check.mjs` lines 26–72 — Why: `node --check` on every tracked `.mjs`, plus
  token-css / annotated-source / loc-summary / system-graph regeneration checks.
- `agent-layer/gen-loc-summary.mjs` line 23 — Why: `/^system\/(wc\/)?[^/]+\.(css|mjs|js)$/` is the
  runtime group. Three new `system/*.mjs` files move it, `approach.html` renders it, and its two VR
  baselines churn.
- `.github/workflows/verify.yml` — Why: `continue-on-error` keys on `feature/v3-*`. **Name this
  branch `feature/public-drop-reskin` (NOT `feature/v3-*`) and the visual gate BLOCKS** — baselines
  must be regenerated in this PR.
- `tooling/visual-regression/visual.spec.mjs` lines 15–60 — Why: which pages/packs are captured and
  the `waitReady` handles.

### New Files to Create

- `system/pack-import.mjs` — **the engine.** View-time-safe, zero Node imports, zero `console`. Holds
  everything moved out of the four Node files, plus the one new orchestrator `mapPack()`.
- `system/pack-imported.mjs` — the imported-pack record: `sessionStorage` read/write, the per-entry
  validator, `applyImported()` / `clearImported()` / `importedOnPage()`, `wearImported()` /
  `unwearImported()`. The sibling of `pack-derived.mjs`, same shape.
- `system/brand-import.mjs` — the beat UI: drop zone, file pre-checks, the pending state, the report
  (summary + `<details>`), the candidate-swatch refusal, "Wear it", "Download".
- `tooling/figma/fixtures/ambiguous-brand.json` — a synthetic export with **two** saturated
  non-state ramps, so the refusal path is testable with no network and no real design. (No existing
  fixture triggers it — verified.)

### Files to Modify

- `tooling/figma/figma-pull.mjs` — becomes disk + network + CLI + `readMap` + `console.log` only.
- `tooling/figma/figma-read.mjs` — re-exports `entriesFromExport` / `rgbaToHex` from the core.
- `agent-layer/gen-pack-css.mjs` — keeps `loadContract`'s `readFileSync` shell + `genPackCss`'s
  `writeFileSync`; the parse/emit halves come from the core.
- `agent-layer/gen-token-css.mjs` — `cssValue` / `aliasPath` move to the core; re-export for its own
  callers.
- `system/pack-boot.js` — a new **sessionStorage-first** imported branch, ahead of the existing
  localStorage path.
- `system/dock.mjs` — the fifth mode across `groundTruth` / `renderPacks` / `selectPack` / copy.
- `system/pack-derived.mjs` — `syncFromRoot` yields when an imported pack is worn.
- `system/spine.mjs` — `isWearingDerived()` also stands down for an imported pack.
- `index.html` — the drop-zone markup in `#beat-brand`, plus the module script tag.
- `system/portfolio.css` — drop zone, pending state, report, swatches, `<details>`.
- `docs/figma-runbook.md` — one paragraph: the public reader path exists and what it does not do.
- `system/loc-summary.json` (**regenerated**), `tooling/visual-regression/**/*.png`
  (**regenerated** — see Phase 5).

### Relevant Documentation

- [DTCG format spec — composite types](https://tr.designtokens.org/format/#composite-types)
  · Why: the `$value`/`$type` shape `entriesFromExport` walks, and the shadow composite
  `collectScales` reads. Read only if a parser change is needed — it should not be.
- [MDN — `URL.createObjectURL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
  · Why: the Blob download. **Gotcha: call `URL.revokeObjectURL()` after the click**, or every
  download leaks the pack for the page's lifetime.
- [MDN — `File.text()`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/text)
  · Why: the read. Returns a Promise; the `await` yields, but `JSON.parse` after it does **not** —
  this is why Task 15's explicit frame yield exists.
- [MDN — HTML drag and drop: `DataTransfer.files`](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files)
  · Why: the drop handler. **Gotcha: `dragover` MUST call `preventDefault()`** or `drop` never
  fires. Mirrors `portal.js:148`.
- [MDN — `sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
  · Why: per-tab, survives same-tab navigation, gone on tab close — exactly the chosen lifecycle.
  **Gotcha: throws in some privacy modes; every access is `try/catch`, mirroring `dock.mjs:82`.**
- [WCAG 2.2 SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  · Why: the thresholds `RULESET.wcagPairs` encodes. Do not restate them — import them.
- [APG — Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
  · Why: the report's `<details>` and the drop zone's status region. Native `<details>` needs no
  ARIA; the live status does (`role="status"`).

### Patterns to Follow

**Element construction — never `innerHTML` from data.** Every shipped-page module builds DOM so that
engine- and visitor-supplied strings stay inert text. Copy this helper (it is deliberately duplicated
across modules — see `wcag-receipts.mjs:31`'s header for why a 10-line private helper beats a shared
dependency):

```js
// system/dock.mjs:46
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "text") node.textContent = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null) node.appendChild(c);
  return node;
}
```

**A third-party hex on its way into a style attribute is proved first** (`portal.js:140`):

```js
const swatchStyle = (hex) => (/^#[0-9a-f]{6}$/i.test(hex) ? `background:${hex}` : '');
```

**Storage access is always `try/catch`** — private mode degrades to session-only, never throws
(`dock.mjs:82`, `pack-derived.mjs:167`):

```js
const readSelector = () => { try { return localStorage.getItem(SELECTOR_KEY); } catch { return null; } };
```

**Node-import safety** — a `system/` module must import cleanly under `node --check` and a Node
harness. DOM/storage references live **inside function bodies only**, and any self-boot sits behind a
guard at the very bottom (`pack-derived.mjs:17`, `:497`):

```js
if (typeof document !== "undefined") wireDropZone();
```

**Errors: plain `Error`s naming the offending thing; no taxonomy, no wrapping** (`agent-layer/lib.mjs`,
`portal/lib/figma.mjs:30`):

```js
throw new Error(`figma import: "${slug}" is not a usable pack slug — lowercase letters, digits and hyphens only, 1–40 characters`);
```

**A refusal carries DATA, not only prose** (`figma-pull.mjs:466–479`) — the CLI message stays byte-
identical and a property is added, so a UI can ask the question in a medium that can answer it.

**File headers**: a feature/entry-point file opens with a header citing its governing doc; a helper
module gets a plain what/why header. All four new files follow suit (cite `#130` and this plan).

**Honest copy** (humanizer rules already applied across this repo): active voice, plain words, no em
dashes in UI strings, no promotional adjectives. Mirror `pack-derived.mjs:268–279`.

---

## IMPLEMENTATION PLAN

### Phase 1: Extract the engine (no behaviour change)

The whole phase must be **provably invisible**: the CLI, the portal and every committed pack come out
byte-identical. Capture parity baselines *first*, then move code, then diff.

**Tasks:** capture baselines · create `system/pack-import.mjs` · move the pure core in four passes,
diffing after each · rewire the four Node files to import it · prove parity.

### Phase 2: The browser orchestrator

**Depends on:** Phase 1.

Add `mapPack()` to the core — everything `runPull` does between "here are the entries" and "write the
file", with the contract passed in rather than read from disk, and the header's `Regenerate:` line
supplied by the caller. `runPull` is then re-expressed in terms of it, which is the parity proof.

### Phase 3: The imported-pack record and the apply path

**Depends on:** Phase 2 (needs `mapPack`'s output shape).
**Independent of:** Phase 4 — the record module and the beat UI can be built in parallel worktrees
once the record's shape is fixed by Task 10.

`system/pack-imported.mjs`, the `pack-boot.js` branch, the `spine.mjs` stand-down, and the dock's
fifth mode.

### Phase 4: The beat surface

**Depends on:** Phase 2 (the engine) and Task 10 (the record shape).

`index.html` markup, `system/brand-import.mjs`, `system/portfolio.css`.

### Phase 5: Gates, baselines and docs

**Depends on:** everything above. Do this last and do not skip it — the visual gate **blocks** on
this branch.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Each task is atomic and independently verifiable.

> **Task 0 — before anything else.** `git fetch origin && git checkout -b feature/public-drop-reskin
> origin/main`. Do **not** name the branch `feature/v3-*`: `verify.yml`'s `continue-on-error` keys on
> that prefix and you would silently lose the visual gate. Memory note *shared worktree, parallel
> sessions*: this repo's working dir is shared, so if the tree is dirty with another ticket's work,
> build in a worktree (`git worktree add ../ux-factory-wt-130 origin/main`) and copy this plan in so
> plan + report + review ship in the same PR (CLAUDE.md, hard).

---

### CREATE the parity baselines (scratchpad, not committed)

- **IMPLEMENT**: capture the exact current output of every reproducible engine path, so Phase 1 can
  be proved rather than asserted. The `plusui` export is gitignored, so the three committed fixtures
  are the reproducible corpus.
- **PATTERN**: the fixture round-trips in `.claude/plans/figma-import-scales-and-dock.md`.
- **GOTCHA**: `--out` keeps a fixture run out of `system/`, which `gen-loc-summary` counts as shipped
  source. Always pass it.
- **VALIDATE**:
  ```bash
  SP=/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/*/scratchpad
  mkdir -p "$SP/parity-before"
  for f in scales-dtcg scales-partial scales-tokens-studio; do
    node tooling/figma/figma-pull.mjs --slug fixt --from tooling/figma/fixtures/$f.json \
      --out "$SP/parity-before/$f.css" > "$SP/parity-before/$f.out" 2>&1
  done
  node tooling/figma/figma-pull.mjs --slug fixt --from tooling/figma/fixtures/scales-partial.json \
    --map tooling/figma/maps/fixture-scales.json --out "$SP/parity-before/map.css" > "$SP/parity-before/map.out" 2>&1
  node tooling/figma/figma-pull.mjs --slug fixt --from tooling/figma/fixtures/scales-partial.json \
    --map tooling/figma/maps/fixture-missing.json --out "$SP/parity-before/miss.css" > "$SP/parity-before/miss.out" 2>&1 || true
  ls -l "$SP/parity-before"
  ```
  Reference (measured 2026-07-26): `scales-dtcg` → 97-line pack, 64 tokens, 38 roles mapped, 26
  auto-filled, 12/12 WCAG pass, 1 negotiation (`color-fg-muted gray/400 → gray/600`).
- **SATISFIES**: AC #7.

### CREATE `tooling/figma/fixtures/ambiguous-brand.json`

- **IMPLEMENT**: a synthetic DTCG export with one grey ramp (≥5 rungs, chroma ≤ 0.03) and **two**
  saturated non-state ramps of ≥5 rungs each with names outside `STATE_RAMP` (e.g. `indigo`,
  `teal`). Header `$description` states it is SYNTHETIC and names its purpose, exactly as
  `scales-dtcg.json` does.
- **PATTERN**: `tooling/figma/fixtures/scales-dtcg.json` (its `$description` line is the model).
- **GOTCHA**: `pickRamps` filters `usable = rungs >= 5` *before* counting candidates
  (`figma-pull.mjs:451`), and `STATE_RAMP` (`:436`) excludes red/green/yellow/orange/amber/lime/
  success/error/warning/danger/info/destructive/positive/negative/neutral/grey/gray. Pick two hues
  outside that list or the fixture will not refuse.
- **VALIDATE**:
  ```bash
  node tooling/figma/figma-pull.mjs --slug fixt --from tooling/figma/fixtures/ambiguous-brand.json --out /dev/null
  # MUST exit 1 with: "figma-pull: 2 ramps could be the brand colour, so this file has no single one to detect"
  node -e 'import("./tooling/figma/figma-pull.mjs").then(async m => {
    try { await m.runPull({ slug: "fixt", from: "tooling/figma/fixtures/ambiguous-brand.json", out: "/dev/null" }); }
    catch (e) { console.log("candidates:", JSON.stringify(e.candidates)); }
  })'
  # MUST print two entries, each with hue / chroma / rungs / swatch
  ```
- **SATISFIES**: AC #5, AC #7.

### CREATE `system/pack-import.mjs` — pass 1: the export parsers

- **IMPLEMENT**: create the module with its governing header (cite `#130` + this plan + the
  "one engine, never a fork" rule). **Move** from `tooling/figma/figma-read.mjs`: `rgbaToHex`,
  `entriesFromVariables`, `HEX`, `expandHex`, `pluginShadow`, `leafEntry`, `entriesFromExport`.
  Keep every explanatory comment verbatim — they carry measured facts (the Enterprise gate, the
  first-layer shadow truncation, why arrays are skipped).
- **IMPLEMENT (the one behaviour change)**: `entriesFromExport` currently `console.log`s the
  multi-mode note at line 194. The core must be **silent**. Change the signature to return
  `{ entries, notes }` where `notes` is an array of strings, and have `figma-read.mjs` print them.
  ```js
  // core
  export function entriesFromExport(json) { /* … */ return { entries, notes }; }
  // figma-read.mjs
  const { entries, notes } = entriesFromExport(JSON.parse(readFileSync(path, "utf8")));
  for (const n of notes) console.log(`  ${n}`);
  ```
- **IMPORTS**: none (leaf module so far).
- **GOTCHA**: `figma-read.mjs` must **re-export** `entriesFromExport` and `rgbaToHex` — but its
  `entriesFromExport` is now the note-printing wrapper, not a bare re-export.
- **GOTCHA — the fixtures CANNOT catch this one.** The whole Task-0 corpus runs `--from`, i.e. the
  export path. `readFigma`'s **API branch** builds entries via `entriesFromStyles`, not
  `entriesFromExport`, and additionally returns `pages` / `fileKey` / `gate`. Changing
  `entriesFromExport`'s return from an array to `{ entries, notes }` can break the API branch's call
  site with nothing in the corpus noticing — and `--offline` cannot cover it either, because the
  `.raw/` cache is gitignored and lives only in the `wt-figma` worktree. **Hand-verify both call
  sites** in `figma-read.mjs` (the `from` short-circuit at ~:325 and the endpoint dispatch at ~:371)
  destructure correctly, by reading them.
- **GOTCHA**: `figma-parity.mjs` imports only `ROOT`/`readFigma`/`readFlags` — but it *consumes*
  whatever `readFigma` returns, and this pass edits `readFigma`'s body. `node --check` it too; it is
  free.
- **VALIDATE**:
  ```bash
  node --check system/pack-import.mjs
  node --check tooling/figma/figma-read.mjs
  node --check tooling/figma/figma-parity.mjs
  grep -n "entriesFromExport\|entriesFromStyles" tooling/figma/figma-read.mjs   # read BOTH call sites
  grep -rn "entriesFromExport\|rgbaToHex" --include="*.mjs" agent-layer portal tooling system
  # then re-run the Task-0 corpus and diff:
  for f in scales-dtcg scales-partial scales-tokens-studio; do
    node tooling/figma/figma-pull.mjs --slug fixt --from tooling/figma/fixtures/$f.json --out "$SP/after-$f.css" >/dev/null
    diff "$SP/parity-before/$f.css" "$SP/after-$f.css" && echo "$f BYTE-IDENTICAL"
  done
  ```
- **SATISFIES**: AC #7.

### UPDATE `system/pack-import.mjs` — pass 2: the mapping core

- **IMPLEMENT**: **move** from `tooling/figma/figma-pull.mjs`, keeping all comments verbatim:
  `ROLES`, `SCALE_ROLES`, `FAMILY_ORDER`, `FAMILY_LABEL`, `FAMILY_RULE`, `scaleRole`,
  `FAMILY_KEYWORDS`, `isNotASize`, `classifyDimension`, `TS_SHADOW_PART`, `px`, `numOf`,
  `composeShadow`, `collectScales`, `CLAMP`, `formatScale`, `fillScales`, `toRamps`, `deriveRamps`,
  `nearestRung`, `NEUTRAL_MAX_CHROMA`, `STATE_RAMP`, `classifyRamps`, `pickRamps`, `pairsFor`,
  `negotiate`.
- **IMPORTS**: `import { hexToOklch } from "./oklch.mjs";` · `import { checkPairs } from "./wcag.mjs";`
  · `import { RULESET } from "./derive.rules.mjs";` — all three already view-time-safe.
- **GOTCHA**: `pickRamps` at line 542 has a `console.log` of the detected ramps **inside `runPull`,
  not inside `pickRamps`** — check before moving; the detected-ramps log stays in `figma-pull.mjs`.
  `negotiate` mutates `values` and `placed` in place — keep that, `runPull` depends on it.
- **GOTCHA**: `figma-pull.mjs` must keep re-exporting `classifyDimension`, `collectScales`,
  `fillScales`, `toRamps`, `deriveRamps`, `classifyRamps` if anything imports them. Grep first.
- **VALIDATE**: `node --check system/pack-import.mjs && node tooling/drift-check.mjs`, then re-run
  the full Task-0 corpus and `diff` every `.css` **and** every `.out` — byte-identical, including
  stdout ordering.
- **SATISFIES**: AC #7.

### UPDATE `system/pack-import.mjs` — pass 3: the contract + the emitter

- **IMPLEMENT**: move `cssValue` and `aliasPath` out of `agent-layer/gen-token-css.mjs` into the
  core; `gen-token-css.mjs` imports and re-exports them so its own callers are untouched. Split
  `loadContract` (`gen-pack-css.mjs:38`) into `parseContract(srcObject)` in the core (the whole body
  after the `JSON.parse`) and a two-line `loadContract(path)` shell in `gen-pack-css.mjs` that reads
  the file and delegates. Move `emitPack` and the validate/auto-fill body of `genPackCss` into the
  core as `emitPackCss(input, { slug, note, contract })` returning `{ tokenCount, filled, values, css }`;
  `genPackCss` keeps `loadContract` + `writeFileSync` and delegates.
- **PATTERN**: `gen-pack-css.mjs:95–145` — the shape is preserved exactly, only the file I/O splits off.
- **GOTCHA**: the `emitPack` header string at `gen-pack-css.mjs:70–78` is part of every committed
  pack's bytes. **Do not reflow it, do not change a space.** `system/tokens.verdant.css`,
  `system/tokens.plusui.css` and the handoff pack all carry it.
- **GOTCHA**: this makes `agent-layer/gen-token-css.mjs` import from `system/`. That direction
  already exists (`figma-pull.mjs` → `system/derive.rules.mjs`; `gen-pack-css.mjs` lazily imports
  `system/derive.mjs`), so it is established, but confirm no cycle: `pack-import.mjs` must import
  **nothing** from `agent-layer/`.
- **VALIDATE**:
  ```bash
  node tooling/drift-check.mjs        # regenerates tokens.contract.css + tokens.neutral.css; must be ✓
  node tooling/token-lint.mjs
  node agent-layer/gen-pack-css.mjs --verdant && git diff --stat system/tokens.verdant.css   # MUST be empty
  git diff --stat system/tokens.plusui.css                                                    # MUST be empty
  ```
- **SATISFIES**: AC #7.

### UPDATE `system/pack-import.mjs` — pass 4: the header builder

- **IMPLEMENT**: move the ~40-line pack header `label` (`figma-pull.mjs:675–714`) into the core as
  `buildPackNote({ fileName, sourceKey, regenerate, usedRamps, derived, derivedUsed, mappedTokens, mapPath, scale, scaleSource, scaleOffered, collapsed, checks, failures, stepped, values })`.
  The **`Regenerate:` line is a caller-supplied string**, because the CLI's regenerate command and a
  browser drop's provenance are different true statements.
- **GOTCHA**: this is the single most parity-sensitive move in the ticket — every committed pack's
  header came out of this function. Move it whole; do not "tidy" the string concatenation. The
  browser passes a regenerate line such as:
  `Imported in a browser from "acme-tokens.json" on the public site. No file was uploaded; the mapping ran locally. Reproduce with: node tooling/figma/figma-pull.mjs --slug acme --from <your export> --neutral gray --accent indigo`
- **VALIDATE**: re-run the whole Task-0 corpus; `diff` every `.css` and `.out`. **Any difference at
  all fails this task.**
- **SATISFIES**: AC #7.

### ADD `mapPack()` to `system/pack-import.mjs`

- **IMPLEMENT**: the browser-callable orchestrator — everything `runPull` does between the entries
  and the write:
  ```js
  // mapPack({ entries, contract, slug, accent, neutral, pinned, pinnedScales, fileName, sourceKey, regenerate })
  //   → { values, css, checks, failures, stepped, placed, available, derivedUsed, collapsed,
  //       filled, tokenCount, note, scales, picked: { neutral, accent }, notes }
  // Throws exactly as runPull does. An ambiguous-brand refusal carries `err.candidates`.
  ```
  Then **re-express `runPull` in terms of it**: `runPull` reads (network/disk), loads the contract
  from disk, parses `--map`, calls `mapPack`, writes the file, and logs. That re-expression is the
  parity proof — if the CLI still emits identical bytes through `mapPack`, the browser will too.
- **PATTERN**: `runPull` (`figma-pull.mjs:512–758`) — the body is being split, not rewritten.
- **GOTCHA**: `runPull`'s `fromLabel`/`sourceKey` logic (`:665–673`) is path-relativisation and stays
  in `figma-pull.mjs`; `mapPack` just receives `sourceKey`.
- **GOTCHA**: `mapPack` must not touch `process`, `console`, `window` or `document`. Anything it
  wants to say goes in the returned `notes` array.
- **VALIDATE**: full Task-0 corpus diff again, plus:
  ```bash
  node -e 'Promise.all([import("./system/pack-import.mjs"), import("node:fs")]).then(([m, fs]) => {
    const { entries } = m.entriesFromExport(JSON.parse(fs.readFileSync("tooling/figma/fixtures/scales-dtcg.json","utf8")));
    const contract = m.parseContract(JSON.parse(fs.readFileSync("system/tokens.source.json","utf8")));
    const r = m.mapPack({ entries, contract, slug: "fixt", fileName: "scales-dtcg.json", sourceKey: "scales-dtcg.json", regenerate: "test" });
    console.log(r.tokenCount, r.placed.length, r.filled.length, r.checks.length, r.failures.length);
  })'
  # MUST print: 64 38 26 12 0
  ```
- **SATISFIES**: AC #1, AC #7.

### UPDATE `portal/lib/figma.mjs` + the portal drawer — prove nothing moved

- **IMPLEMENT**: nothing, unless a rewire broke an import. This task exists to *check*.
- **VALIDATE**:
  ```bash
  cd portal && npm start &   # then, in another shell:
  curl -s localhost:4747/api/health
  # drop tooling/figma/fixtures/scales-dtcg.json in the drawer at localhost:4747 with slug "fixt2",
  # confirm the report renders and system/tokens.fixt2.css is written; then:
  rm -f system/tokens.fixt2.css tooling/figma/exports/fixt2.json
  # drop ambiguous-brand.json → candidate swatches render → click one → pack written. Clean up again.
  ```
- **GOTCHA**: **delete the throwaway packs and exports.** `system/tokens.fixt2.css` would be counted
  by `gen-loc-summary` and would fail `verify`. This bit #116 too — it is in its AC list.
- **SATISFIES**: AC #7.

### DEFINE the imported-pack record shape (design task — write it into the module header first)

- **IMPLEMENT**: fix the contract before two phases build against it.
  ```js
  // sessionStorage["factory-pack-imported"] =
  // { v: 1, source: "imported", slug: "acme", label: "Acme", fileName: "acme-tokens.json",
  //   ts: 1753500000000,
  //   tokens: { "--color-accent": "#4f46e5", "--spacing-md": "16px",
  //             "--type-h1": "clamp(28px, 4vw, 44px)", "--shadow-md": "0px 4px 8px #00000014" },
  //   note:   "<the pack header, verbatim — what the download carries>",
  //   report: { placed, scales, checks, failures, derivedUsed, collapsed, filled, rejected } }
  ```
- **KEY DECISIONS, and why** (put these in the module header — a future reader will ask):
  1. **`sessionStorage`, not `localStorage`** (owner call). Per-tab, survives same-tab navigation,
     gone on tab close.
  2. **The imported record does NOT use the `factory-pack` selector.** `pack-boot.js` checks
     `sessionStorage` **first** and returns; only if there is no imported record does it fall through
     to the existing localStorage path. Consequences, all good: a new tab is a guaranteed no-op (VR
     safe); the reader's committed/derived pick is *shadowed*, never destroyed; and un-wearing the
     import restores their previous pack for free.
  3. **Therefore #108's `preserveDisplacedRecord` / `restoreDisplacedRecord` machinery is NOT
     used and NOT extended.** The owner's "the import replaces it, one worn thing at a time" is
     satisfied by shadowing, and "restore what I had" is satisfied by the dock rows themselves —
     which is strictly better than a special restore button over a record that was never displaced.
     **Flag this in the PR body as an intentional simplification of the chosen option.**
  4. **`tokens` holds only entries that passed the validator**, and `report.rejected` names any that
     did not. Validation happens **once, at build time**, so the record can never carry something the
     pre-paint boot would silently drop — and the beat can report it honestly.
  5. **`css` is NOT stored.** The download re-emits from `tokens` + `note` + the contract (already
     fetched on the drop page). One source of truth; nothing that reaches the DOM as CSS is ever
     read back out of storage as CSS.
- **VALIDATE**: the header comment exists and the two consumers (Tasks 11 and 16) agree on it.
- **SATISFIES**: AC #2, AC #3, AC #8.

### CREATE `system/pack-imported.mjs`

- **IMPLEMENT**: the record module, mirroring `pack-derived.mjs`'s shape:
  ```js
  export const IMPORTED_KEY = "factory-pack-imported";
  export const IMPORTED_VERSION = 1;
  export const STYLE_ID = "factory-pack-imported-style";

  // The per-entry allowlist. MIRRORED IN SHAPE in pack-boot.js (a classic script cannot import this
  // module, so the two predicates are kept identical by hand — the same arrangement pack-derived.mjs
  // and pack-boot.js already have for the derived record).
  // The value charset is MEASURED, not guessed: the 64 contract token values use only
  // " #%(),-.0123456789" + letters (verified 2026-07-26). Imported values add nothing outside it
  // except the design's own shadow colour strings, which composeShadow passes through verbatim —
  // which is exactly why this check exists. Everything that could break out of a declaration is
  // excluded: ; { } @ \ < > : ' " * / &.
  const KEY_NAME  = /^--[a-z0-9-]{1,40}$/;
  const VALUE_OK  = /^[a-zA-Z0-9 #%(),.+-]{1,120}$/;

  export function vetTokens(map)        // → { tokens, rejected: [{ key, value, why }] }
  export function buildImportedRecord({ slug, label, fileName, values, note, report })
  export function readImported()        // sessionStorage → validated record | null
  export function writeImported(rec)    // + emit IMPORT_CHANGE_EVENT
  export function clearImported()       // remove record + remove the <style> + emit
  export function applyImported(rec)    // build ":root{…}" from rec.tokens → <style id=STYLE_ID> in <head>
  export function removeImportedStyle()
  export function importedOnPage(rec)   // ground truth: the style element exists and its ts matches
  export const IMPORT_CHANGE_EVENT = "factory-import-change";
  ```
- **PATTERN**: `pack-derived.mjs:79–80` (the mirrored allowlist + its comment), `:132–151`
  (apply/clear/groundTruth), `:157–188` (read/write), `:53` (the same-tab change event —
  `storage` events do not fire in the same tab, so this CustomEvent is the only way the dock hears
  about a write).
- **IMPLEMENT — `applyImported`**: build the rule text from the **vetted** entries and set it via
  `textContent`, never `innerHTML`; stamp `data-ts` so `importedOnPage` has ground truth:
  ```js
  const rule = ":root {\n" + Object.entries(rec.tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n") + "\n}\n";
  let style = document.getElementById(STYLE_ID);
  if (!style) { style = document.createElement("style"); style.id = STYLE_ID; document.head.appendChild(style); }
  style.dataset.ts = String(rec.ts);
  style.textContent = rule;
  ```
- **GOTCHA**: append to `document.head` **last**, so the rule wins over `tokens.<pack>.css` on equal
  specificity. It does **not** beat the derived pack's inline `:root` props — which is correct and
  intentional: `selectPack` clears those before wearing an imported pack (see Task 13).
- **GOTCHA**: Node-import-safe. `document`/`sessionStorage` only inside function bodies; **no
  self-boot at all** in this module (unlike `pack-derived.mjs`, which does self-boot — that file's
  ungoverned module tail is exactly the hazard `wcag-receipts.mjs`'s header warns about).
- **VALIDATE**:
  ```bash
  node --check system/pack-imported.mjs
  node -e 'import("./system/pack-imported.mjs").then(m => {
    const bad = { "--color-accent": "#4f46e5", "--x": "red;} body{display:none",
                  "--spacing-md": "16px", "--u": "url(http://evil/x)", "--type-h1": "clamp(28px, 4vw, 44px)" };
    console.log(JSON.stringify(m.vetTokens(bad), null, 1));
  })'
  # MUST keep --color-accent / --spacing-md / --type-h1 and REJECT the other two, naming each.
  ```
- **SATISFIES**: AC #2, AC #8.

### UPDATE `system/pack-boot.js`

- **IMPLEMENT**: a new branch **before** the existing localStorage read:
  ```js
  // An IMPORTED pack (#130) is session-scoped and takes precedence: sessionStorage is per-tab, so a
  // new tab falls straight through to the localStorage path below and the guaranteed no-op default
  // is preserved (VR-critical). Validated PER ENTRY, mirroring pack-imported.mjs's vetTokens — a
  // stored entry that would not pass there is dropped here rather than reaching the DOM.
  var raw;
  try { raw = sessionStorage.getItem("factory-pack-imported"); } catch (e) { raw = null; }
  if (raw) {
    var rec = null;
    try { rec = JSON.parse(raw); } catch (e) { rec = null; }
    if (rec && rec.v === 1 && rec.source === "imported" && rec.tokens) {
      var NAME = /^--[a-z0-9-]{1,40}$/, VAL = /^[a-zA-Z0-9 #%(),.+-]{1,120}$/;
      var out = [], ks = Object.keys(rec.tokens);
      for (var i = 0; i < ks.length; i++) {
        var k = ks[i], v = rec.tokens[k];
        if (NAME.test(k) && typeof v === "string" && VAL.test(v)) out.push("  " + k + ": " + v + ";");
      }
      if (out.length) {
        var st = document.createElement("style");
        st.id = "factory-pack-imported-style";
        st.setAttribute("data-ts", String(rec.ts));
        st.textContent = ":root {\n" + out.join("\n") + "\n}\n";
        document.head.appendChild(st);
        return;   // an imported pack shadows the committed/derived pick; it is never blended with it
      }
    }
  }
  ```
- **PATTERN**: `pack-boot.js:24–37` — same structure, same defensive posture, same style.
- **GOTCHA**: **this file is VR-critical.** Every early return must survive: with empty storage the
  script is still a guaranteed no-op, which `visual.spec.mjs` relies on (its pack swap keys on the
  literal `tokens.neutral.css` URL and VR contexts have no storage). Confirm by running the visual
  gate before and after this task — the baseline must not move at all from this change alone.
- **GOTCHA**: classic script, not a module. No `const`/`let`/arrow functions/template literals —
  match the existing `var` + string-concat style exactly.
- **GOTCHA**: update the file's header comment. It currently documents two paths; it now documents
  three, and must say why the imported one reads a *different storage* and returns first.
- **VALIDATE**:
  ```bash
  node --check system/pack-boot.js
  # Head-order proof — the cascade assumption, checked rather than reasoned (Assumption #4).
  # The pack-boot.js tag MUST be the LAST element in <head> on every page that loads it, or the
  # appended <style> loses to a stylesheet parsed after it and the pack half-applies on that page.
  for f in index.html approach.html factory.html work.html contact.html 404.html roundtrip.html; do
    echo "=== $f ==="; awk '/<head>/,/<\/head>/' $f | grep -n 'rel="stylesheet"\|pack-boot'
  done
  # Measured 2026-07-26: all seven have pack-boot.js last. If a page ever does not, fix THAT page.

  npx serve . &   # then in a browser at localhost:3000:
  #  sessionStorage.setItem('factory-pack-imported', JSON.stringify({v:1,source:"imported",ts:1,tokens:{"--color-accent":"#c2410c"}}))
  #  reload → accent is orange, <style id="factory-pack-imported-style"> is the LAST element in <head>
  #  REPEAT ON ALL SEVEN PAGES — sessionStorage is same-origin, so navigating between them is enough
  #  open a NEW TAB on the same page → neutral, no style element (session scope proven)
  cd tooling/visual-regression && npm run test:docker    # MUST still pass with zero baseline change
  ```
- **SATISFIES**: AC #3, AC #8.

### UPDATE `system/spine.mjs` — the hero stands down

- **IMPLEMENT**: `isWearingDerived()` (line 32) also returns true when an imported pack is present,
  or the hero's ~1.2s canned re-skin overwrites the reader's design and then strips it on revert.
  Rename to `isWearingVisitorPack()` and add the sessionStorage check; keep both reads
  `try/catch`-wrapped and storage-safe for Node.
- **PATTERN**: `spine.mjs:32–34`.
- **GOTCHA**: memory *hero re-skin screenshot trap* — the hero holds its canned re-skin ~2.4s after
  load. Any manual verification of a below-fold brand must wait it out.
- **GOTCHA**: memory *spine analytics slot fires regardless* — do not attach the new condition to the
  analytics slot; it is a guard on the effect.
- **VALIDATE**: with an imported record in sessionStorage, load `/index.html` and confirm the hero
  never flashes the canned green and `#beat-hero[data-spine="ready"]` still lands (the VR gate hangs
  forever if it does not).
- **SATISFIES**: AC #3.

### UPDATE `system/dock.mjs` — the fifth mode

- **IMPLEMENT**, at all four branch points:
  1. `groundTruth()` — check imported **first**: `readImported()` and `importedOnPage(rec)` → return
     `IMPORTED_ID`; else the existing derived/committed logic.
  2. `renderPacks()` — append a row when an imported record exists:
     `{ id: "imported", name: rec.label, note: "their design work, imported in your browser" }`.
     The label is visitor-supplied — `textContent` only, exactly as the derived row's note already is.
  3. `selectPack(target)` — an `imported` branch. Rules, in order: `clearRoot(derivedRec.tokens)`
     first (rule 1 — inline props outrank a `<style>` and would ghost); point the pack link at
     **neutral** (rule 2 — an imported pack is complete, so the base is irrelevant, and neutral is the
     honest one); `applyImported(rec)` **inside** the view-transition callback (rule 3). Selecting a
     **different** target while imported is worn calls `removeImportedStyle()` + `clearImported()`
     (or leaves the record and only removes the style — see Open Question #2).
  4. the copy handler — a third branch emitting `:root{…}` from `rec.tokens` with an honest header,
     mirroring `dock.mjs:343–346`:
     ```
     /* <label> — imported in your browser from <fileName>, mapped onto this repo's token contract.
        Their design work, not this repo's. Colour, spacing, radius, type and shadows; components and fonts never import. */
     ```
  5. subscribe to `IMPORT_CHANGE_EVENT` alongside `BRAND_CHANGE_EVENT`, with the same `selfEmit`
     re-entrancy guard.
- **PATTERN**: `dock.mjs:169–246` — read the three numbered rules in that comment block before
  writing a line; they are the distilled result of #102 and #103.
- **GOTCHA**: `PACK_RE` and `activePack()` must stay untouched — an imported pack is not a `<link>`
  href and must never be matched by that regex.
- **GOTCHA**: `syncChecked()`'s fallback is `inputs.find(i => i.value === "neutral")`. That still
  works when the imported row disappears (tab restored, record gone).
- **VALIDATE**: with a real import worn, open `/#appearance` on `/approach.html`: the imported row
  is checked; switching to `saulera` restores the sheet and drops the `<style>`; switching back
  re-applies it; "Copy tokens" pastes the imported `:root{}`; "Reset to neutral" clears everything.
- **SATISFIES**: AC #4, AC #6.

### UPDATE `system/pack-derived.mjs` — yield to an imported pack

- **IMPLEMENT**: `syncFromRoot()` (line 317) must not claim a colour is on the stage when an imported
  pack is what the page is wearing. Read the imported record; if one is worn, take the `else` branch
  (`setLabel(label, "empty", emptyLabel())`, `current = null`, toggle unchecked). Subscribe to
  `IMPORT_CHANGE_EVENT` as well as `PACK_CHANGE_EVENT`.
- **PATTERN**: the invariant stated at `pack-derived.mjs:311–316` — *"the beat's shown state ALWAYS
  matches `:root`"*. This is the same bug class as #103; honour the invariant, do not add a flag.
- **GOTCHA**: **surgical.** Do not restructure `wireBeatBrand`. The colour input keeps working
  exactly as it does; entering a colour after an import simply supersedes it (which flows naturally
  from `selectPack("derived")`, which removes the imported style).
- **GOTCHA**: importing `pack-imported.mjs` here creates `dock.mjs → pack-derived.mjs →
  pack-imported.mjs`. `pack-imported.mjs` must import **nothing** back, or the cycle bites at the
  self-boot at `pack-derived.mjs:497` (see the ordering note at `:449–457` for how load-bearing this
  graph already is).
- **VALIDATE**: enter a colour, wear it, then import a design → the beat's label stops claiming the
  colour is on stage. Then pick "your brand" in the dock → the colour is back, label correct.
- **SATISFIES**: AC #4.

### UPDATE `index.html` — the drop zone markup

- **IMPLEMENT**: inside `#beat-brand`'s `.brand-input`, after `.brand-actions`, a new block. **At
  rest it holds the drop zone and nothing else** — no report, no tables, no `<details>` — so the VR
  baseline stays close to today's and `rest == final` holds.
  ```html
  <!-- #130 · public drop-to-re-skin. system/brand-import.mjs reads a dropped JSON token export in
       the browser, runs the REAL mapping engine (system/pack-import.mjs — the same one the CLI and
       the portal run), and renders the mapping report + WCAG receipts below. The file is never
       uploaded: the shipped site has no server. This block is the no-JS / fail-closed state — with
       JS off it is inert copy naming what the feature does, never a control that does nothing. -->
  <div class="brand-import" data-import>
    <p class="brand-import-or">or</p>
    <label class="brand-drop" data-import-drop>
      <input type="file" accept="application/json,.json" class="brand-drop-input" data-import-file />
      <span class="brand-drop-title">Drop your design tokens</span>
      <span class="brand-drop-formats">A DTCG or Tokens Studio export, a Figma variables dump, or any nested JSON of names and values.</span>
      <span class="brand-drop-privacy">Read here in your browser. Never uploaded.</span>
    </label>
    <p class="brand-import-status" data-import-status role="status" data-state="idle"></p>
    <div class="brand-import-report" data-import-report hidden></div>
  </div>
  ```
  And the script tag beside the others (line 377ff): `<script type="module" src="/system/brand-import.mjs"></script>`.
- **PATTERN**: `index.html:158–181` — the `.brand-input` block's markup idiom and comment style.
- **GOTCHA**: memory *overflow-clip breaks sticky* — `body { overflow-x: clip }` on shipped pages
  makes `position: sticky` a no-op for every descendant. Do not pin the report.
- **GOTCHA**: `role="status"` on the status paragraph so a screen reader hears the outcome. Do **not**
  put `aria-live` on the report container — the tables would be read in full on every change.
- **VALIDATE**: `npx serve .` and load `/index.html` with JS disabled — the block reads as honest
  static copy, nothing looks broken or clickable-but-dead.
- **SATISFIES**: AC #1, AC #9.

### CREATE `system/brand-import.mjs` — the beat surface

- **IMPLEMENT**, in this order inside one module:
  1. **Mount + guard.** `document.querySelector("[data-import]")` → return if absent (every other page
     imports nothing and stays inert). Self-boot behind `if (typeof document !== "undefined")` at the
     bottom.
  2. **Pre-checks**, ported from `portal.js:158–180` **with the copy reused verbatim where it fits**:
     `.json` extension, `MAX_EXPORT_BYTES` (32 MB, matching `portal/lib/figma.mjs:18` — three files
     now mirror this number; say so in a comment in all three).
  3. **The pending state (Task 15's answer).** Set the status text and **yield a frame** before the
     parse, so the reader always sees the work start:
     ```js
     status(`Reading ${file.name} · ${mb(file.size)}…`);
     await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
     const json = JSON.parse(await file.text());   // main thread busy from here
     ```
     Two nested rAFs, not one — one rAF fires *before* paint.
  4. **Contract fetch**, lazily and once: `fetch("/system/tokens.source.json")` → `parseContract`.
     Never at module load; home must not pay 19.6 KB for a feature most readers never touch.
  5. **Run the engine**: `mapPack({ entries, contract, slug, accent, neutral, fileName, sourceKey: file.name, regenerate })`.
  6. **Slug + label**: the label comes from the beat's existing `[data-brand-name]` field
     (owner call — one field, two jobs), falling back to the file name with `.json` stripped. Slug =
     the label lowercased, non-`[a-z0-9-]` collapsed to `-`, trimmed, capped at 40, defaulting to
     `imported` if empty. **`RESERVED` becomes a rename, not a refusal** — a Blob download has no
     filesystem to protect, so `neutral` → `neutral-import`. Say so in a comment.
  7. **The report**: a summary line, then `<details>` holding the full tables. Build with `el()`,
     never `innerHTML`.
     - Summary: `22 colours · spacing ✓ · type ramp ✗ · 11/12 WCAG pairs pass`
     - `<details><summary>Show every token and where it came from</summary>` → the mapped table
       (token · swatch+value · source), the scale tables per family, the full 12-row WCAG table.
     - **The limits lead, not trail** — from `renderScales` (`portal.js:255–286`) plus this ticket's
       own: families that fell short and stayed on this repo's defaults; unclassified names;
       `report.rejected` entries the validator dropped; and the standing "components and fonts never
       import, by design".
  8. **The refusal**: `err.candidates` → swatch buttons (`portal.js:219–248`), each re-running
     `mapPack` with that hue as `accent`. Copy reused: *"The importer won't pick a brand colour for
     you. Choose the ramp it should use as the accent:"*. A refusal with **no** candidates renders
     verbatim with **no affordance** — inventing a control there would be an overclaim
     (`portal.js:214–217` says exactly this).
  9. **"Wear it"** (owner call: report first, wear on an explicit click) → `vetTokens` →
     `buildImportedRecord` → `writeImported` → dispatch `PACK_REQUEST_EVENT` with
     `{ target: "imported" }` so **the dock owns the transition** (`pack-derived.mjs:308` is the
     idiom). If nothing claims it (no dock — but the dock is on every IA page, so this is the
     defensive path), `applyImported` directly.
  10. **"Download"** → re-emit via `emitPackCss(values, { slug, note, contract })` → `Blob` →
      `URL.createObjectURL` → an `<a download="tokens.<slug>.css">` clicked programmatically →
      **`URL.revokeObjectURL` in the next tick**.
  11. **The honesty statement**, rendered above the report (owner call — both the beat and the dock
      row carry it):
      > *"Your file was read here in your browser and never uploaded. What came out is your design
      > work, mapped onto this repo's token contract. It is not authored by me, and it is not your
      > official design system — it is your values on this system's roles."*
  12. **Analytics**: one event on a successful import, fired from the **success path** —
      `analytics.mjs`'s helper, never a spine slot (memory: *spine analytics slot fires regardless*).
- **PATTERN**: `system/agentic-study.mjs` and `system/handoff-viewer.mjs` are the closest shipped
  "engine output → designed surface" modules; `dock.mjs:46` is the `el()` builder.
- **GOTCHA**: `dragover` **must** `preventDefault()` or `drop` never fires (`portal.js:148`).
- **GOTCHA**: memory *entrance anim on continuous rebuild* — if the report gets a CSS entrance
  animation, gate it behind a discrete-render class, not just `prefers-reduced-motion`, or a re-run
  restarts and blanks it.
- **GOTCHA**: memory *VR gate captures no-preference* — the gate captures under **no**-preference
  with `animations: 'disabled'`. A control gated only by `matchMedia('reduce')` will churn the
  baseline. At rest, this block must be static.
- **VALIDATE**:
  ```bash
  npx serve .
  # 1. drop tooling/figma/fixtures/scales-dtcg.json → summary reads 38 mapped · 26 auto-filled ·
  #    12/12 WCAG; <details> holds all three tables; "Wear it" re-skins the page (type + spacing
  #    visibly change, not only colour)
  # 2. navigate to /approach.html → still wearing it; the dock's imported row is checked
  # 3. "Download" → tokens.<slug>.css; diff it against the CLI's output for the same fixture:
  #    node tooling/figma/figma-pull.mjs --slug <slug> --from tooling/figma/fixtures/scales-dtcg.json --out /tmp/cli.css
  #    the :root blocks MUST match; only the Regenerate: line differs (by design)
  # 4. drop ambiguous-brand.json → two swatches → click one → the report renders
  # 5. drop a .txt, a 40 MB file, and a malformed .json → three distinct honest refusals
  # 6. close the tab, reopen → neutral (session scope)
  ```
- **SATISFIES**: AC #1, AC #2, AC #5, AC #6, AC #9, AC #10.

### UPDATE `system/portfolio.css`

- **IMPLEMENT**: `.brand-import`, `.brand-import-or`, `.brand-drop` (+ `.is-over`),
  `.brand-drop-input` (visually hidden but focusable), `.brand-import-status[data-state]`,
  `.brand-import-report`, the swatch grid, the table wrapper, the `<details>`.
- **PATTERN**: `system/portfolio.css:1260–1345`. Token-only — **a literal or brand value in the CSS
  is a bug** (CLAUDE.md, hard).
- **GOTCHA**: memory *VR gate single-engine blindspot* — the gate's bundled Chromium missed a real
  Safari/Chrome-stable grid blowout. **Put `min-width: 0` on any grid/flex item holding a wide table
  or code string**, and wrap the tables in an `overflow-x: auto` container.
- **GOTCHA**: the drop zone must have a visible focus ring and be operable from the keyboard — it is a
  `<label>` wrapping a real `<input type="file">`, so `:focus-within` is the hook.
- **GOTCHA**: memory *cross-engine motion verify* — check the layout in real Chromium, Firefox **and**
  WebKit locally (Playwright's webkit ≈ Safari; serve over http so `.mjs` gets the right MIME type).
- **VALIDATE**: `npx serve .` at 1440px, 1024px and 390px; the report never overflows the page
  horizontally; the drop zone is reachable and operable by keyboard alone.
- **SATISFIES**: AC #9.

### UPDATE `docs/figma-runbook.md`

- **IMPLEMENT**: one short section — a reader can now drop a JSON token export on the public home
  page and get a downloadable pack; it runs the same engine; it writes nothing and uploads nothing;
  it is not an operator path (the portal still is), and it does not import components or fonts.
- **PATTERN**: the runbook's existing §A portal-first / CLI-beneath structure.
- **GOTCHA**: do not claim the URL path works. It does not, on any plan below Enterprise.
- **SATISFIES**: AC #10.

### REGENERATE the artifacts and the baselines

- **IMPLEMENT**, in this exact order:
  ```bash
  node agent-layer/gen-loc-summary.mjs          # 3 new system/*.mjs → the runtime group moves
  # annotated-source: grepped 2026-07-26 and its only citation is derive.rules.mjs, but the spec is
  # regenerated from gen-annotated-source.mjs — re-grep AFTER the move; a stale citation fails
  # drift-check, which blocks main.
  grep -n "figma-pull\|figma-read\|gen-pack-css\|gen-token-css\|cssValue\|entriesFromExport" agent-layer/gen-annotated-source.mjs
  node agent-layer/gen-annotated-source.mjs
  node agent-layer/gen-system-graph.mjs
  node agent-layer/gen-handoff.mjs              # a token change needs this too (memory: token change → regen handoff pack)
  node tooling/drift-check.mjs                  # MUST be ✓
  node tooling/token-lint.mjs                   # MUST be ✓
  cd tooling/visual-regression && npm run update:docker
  ```
- **GOTCHA**: memory *loc-summary baseline cascade* — the runtime group moves from **45 files /
  11 900 lines** to roughly **48 / 12 900** (the extraction imports ~450 lines from `tooling/` into
  `system/`, plus ~500 lines of new UI/record code). `approach.html` renders those numbers, so
  **both approach baselines churn** — that is expected, not a regression.
- **GOTCHA**: memory *loc-summary counts tracked only* — `gen-loc-summary` reads `git ls-files`, so
  `--check` before staging is a false "no drift". **`git add` first, then regenerate, then check.**
- **GOTCHA**: memory *VR update skips sub-perceptual* — `update:docker` will not rewrite a baseline
  whose only change is below pixelmatch's per-pixel threshold. If a baseline you expect to move does
  not, `rm` the PNG and re-run.
- **GOTCHA**: memory *VR gate approach countUp flake* — an approach "two consecutive stable
  screenshots" failure is the live `countUp` rAF racing `retries: 0`, not a regression. It fails a
  *different pack* each run. Re-run before investigating.
- **GOTCHA**: memory *drift-check mid-merge false positive* — if you merged `origin/main` and have
  not committed the merge, `drift-check` misreads staged merge changes as drift. Complete the merge,
  then re-run on a clean tree. Generated-file conflicts (`loc-summary.json`) are resolved by
  **regeneration**, never by hand-editing.
- **GOTCHA**: memory *local agent + visual gate notes* — a local macOS run showing "16 failed" is a
  platform artefact (the baselines are Linux). Trust `npm run test:docker`, and trust
  `gh pr checks` over a local pass.
- **VALIDATE**: `git status` shows exactly the expected regenerated files; `cd tooling/visual-regression
  && npm run test:docker` is green; `node tooling/drift-check.mjs` is ✓.
- **SATISFIES**: AC #11.

### VERIFY the whole surface, then open the PR

- **IMPLEMENT**: run the full validation ladder below, write
  `.claude/reports/public-drop-to-reskin-report.md`, and commit **plan + report in the same PR**
  (CLAUDE.md, hard — four of PRs #97–#100's artifacts were written and then lost in worktrees).
- **GOTCHA**: the PR body **MUST** carry `Closes #130`. A title mentioning `(#130)` closes nothing —
  #78 sat open for a day and cost a wasted planning pass.
- **GOTCHA**: memory *owner merges fast* — check `gh pr view --json commits` before building anything
  on top of this.
- **SATISFIES**: every AC.

---

## TESTING STRATEGY

This repo has **no test suite, no linter and no type-checker** — do not hunt for one or invent one
(CLAUDE.md). "Done" means *run the surface you touched*. What that means here:

### Engine parity (the substitute for unit tests)

The three committed fixtures plus the new ambiguous one, each run before and after every extraction
pass, `diff`ed on **both** the emitted `.css` and captured stdout. Plus `--map` on both map fixtures
(one that resolves, one that throws). Byte-identical or the pass is wrong.

### Cross-surface equivalence

The same fixture through **three** paths must produce the same `:root` block:
1. CLI: `node tooling/figma/figma-pull.mjs --from … --out …`
2. Portal: drop it in the drawer at `localhost:4747`
3. Browser: drop it in `#beat-brand` and hit Download

Only the header's `Regenerate:` line may differ, and only because each states a different true
provenance.

### Integration (manual, in a real browser)

The Task 16 checklist, run in Chromium **and** WebKit (memory: *cross-engine motion verify*; the VR
gate's single engine has already missed a real Safari layout break).

### Edge cases that must be exercised

- A `.txt`, a `.fig`, a 40 MB file, malformed JSON, valid JSON that is an array, valid JSON with no
  colours at all → five distinct honest refusals, none of them a stack trace.
- A design with **no** grey ramp → the `--neutral` refusal, rendered verbatim with no affordance.
- A design with **two** brand candidates → swatches; clicking one completes.
- A design whose scale families all fall short → colours import, scale says so.
- A shadow whose colour string contains `;` or `}` → `vetTokens` rejects it and the report **names
  it**. Construct this by hand; it is the one input the validator exists for.
- Private-browsing mode (sessionStorage throws) → the drop still works on the page, wearing degrades
  to this-page-only, nothing throws.
- A reader who has "your brand" worn, then imports → the beat label stops claiming the colour;
  picking "your brand" in the dock brings it back.
- A new tab → neutral, guaranteed.
- JS disabled → the block reads as honest static copy.

---

## VALIDATION COMMANDS

Execute every one. Zero regressions.

### Level 1: Syntax & generated-artifact drift

```bash
node tooling/drift-check.mjs      # node --check on every tracked .mjs + 5 regeneration checks
node tooling/token-lint.mjs
node agent-layer/gen-loc-summary.mjs --check    # AFTER git add — it reads git ls-files
```

### Level 2: Engine parity

```bash
for f in scales-dtcg scales-partial scales-tokens-studio ambiguous-brand; do
  node tooling/figma/figma-pull.mjs --slug fixt --from tooling/figma/fixtures/$f.json \
    --out "$SP/after/$f.css" > "$SP/after/$f.out" 2>&1
  diff "$SP/parity-before/$f.css" "$SP/after/$f.css"
  diff "$SP/parity-before/$f.out" "$SP/after/$f.out"
done
node agent-layer/gen-pack-css.mjs --verdant
git diff --stat system/tokens.verdant.css system/tokens.plusui.css system/tokens.contract.css system/tokens.neutral.css
# ALL of the above must be empty.
```

### Level 3: The portal still works

```bash
cd portal && npm install && npm start          # → http://localhost:4747
curl -s localhost:4747/api/health
# drop scales-dtcg.json (slug fixt2) → pack written; drop ambiguous-brand.json → swatches → click → written
rm -f system/tokens.fixt2.css tooling/figma/exports/fixt2.json    # DELETE THE THROWAWAYS
```

### Level 4: The shipped surface

```bash
npx serve .                                     # repo root
# run the Task 16 checklist in Chromium AND WebKit
```

### Level 5: The blocking CI gates

```bash
cd tooling/visual-regression && npm ci && npm run test:docker
# after intentional baseline changes:  npm run update:docker
gh pr checks    # local green ≠ CI green (memory: VR gate approach countUp flake)
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC #1** — Dropping a JSON token export on home's beat 02 runs the real engine in the browser
      and renders a mapping report. No server call, no upload.
- [ ] **AC #2** — The import carries **colour and scale**: spacing, radius, the type ramp and shadows,
      all-or-nothing per family exactly as the CLI does. Wearing it visibly changes typography and
      rhythm, not only colour.
- [ ] **AC #3** — "Wear it" carries the pack to every page **for the visit** (`sessionStorage`,
      re-emitted pre-paint by `pack-boot.js`), and a new tab returns to the reader's prior pack.
- [ ] **AC #4** — The appearance dock offers the imported pack as a row labelled with the reader's
      name for it plus *"their design work, imported in your browser"*, and switching between it, the
      committed packs and "your brand" works in both directions with no ghosting.
- [ ] **AC #5** — An ambiguous file renders candidate ramp swatches; clicking one completes the
      import. **Nothing is guessed.** A refusal with no candidates renders verbatim with no
      affordance.
- [ ] **AC #6** — "Download" emits `tokens.<slug>.css` whose `:root` block is byte-identical to the
      CLI's for the same input, carrying the full header (ramps used, rungs synthesised, every
      negotiation, everything auto-filled, every WCAG pair still failing).
- [ ] **AC #7** — **CLI and portal behaviour unchanged**: all four fixtures regenerate byte-identically
      on stdout and on disk, every refusal message is verbatim, and
      `tokens.plusui.css` / `tokens.verdant.css` / `tokens.contract.css` / `tokens.neutral.css` show
      no diff.
- [ ] **AC #8** — `pack-boot.js` stays a **guaranteed no-op** with empty storage, and applies only
      entries passing the mirrored name+value allowlist. A record entry that would break out of a CSS
      declaration is dropped at build time and **named in the report**.
- [ ] **AC #9** — The at-rest page is static and honest: with JS disabled the block is inert copy,
      never a dead control. The report is keyboard-operable, has a `role="status"` outcome, and never
      scrolls the page horizontally at 390px.
- [ ] **AC #10** — Honesty: the beat states the file is read locally and never uploaded, and that the
      output is the reader's design work mapped onto this repo's contract; the report leads with what
      did **not** import (short families, unclassified names, rejected values, components, fonts) and
      any WCAG pair still failing; the dock row repeats the attribution.
- [ ] **AC #11** — `node tooling/drift-check.mjs` ✓, `node tooling/token-lint.mjs` ✓,
      `node agent-layer/gen-loc-summary.mjs --check` ✓, the visual gate green against **regenerated**
      baselines, and no throwaway packs or exports left in the tree.

---

## COMPLETION CHECKLIST

- [ ] Branch is `feature/public-drop-reskin` (NOT `feature/v3-*` — the visual gate must block)
- [ ] All tasks completed in order; each task's `VALIDATE` passed immediately
- [ ] Parity diffs captured before Phase 1 and clean after every extraction pass
- [ ] All five validation levels executed
- [ ] Throwaway packs / exports deleted (`system/tokens.fixt*.css`, `tooling/figma/exports/fixt*.json`)
- [ ] `loc-summary.json` regenerated **after** `git add`; approach + index baselines regenerated
- [ ] Manual browser checks done in Chromium **and** WebKit
- [ ] `.claude/plans/public-drop-to-reskin.md` + `.claude/reports/public-drop-to-reskin-report.md`
      committed in this PR
- [ ] PR body carries **`Closes #130`**

---

## OPEN QUESTIONS / ASSUMPTIONS

**Decided with the owner on 2026-07-26** (do not reopen): persistence follows the reader
(session-scoped); payload is colours **and** scale; placement is home beat 02; download is one `.css`;
apply is a `<style>` element built from a per-entry-vetted token map; an import supersedes "your
brand"; the dock row is session-scoped; naming reuses the beat's existing company-name field; the
honesty statement appears in the beat **and** on the dock row; the extraction unifies all four Node
files; the 32 MB cap is kept with a pending state; `instance.html` stays out; the drop-zone copy
names the formats rather than leading with Figma.

**Assumptions this plan makes:**

1. **`sessionStorage` is available pre-paint in `pack-boot.js`.** It is (synchronous, same API as
   `localStorage`), and every access is `try/catch`-wrapped for privacy modes.
2. **`/system/tokens.source.json` is served by Cloudflare Pages.** It is committed and inside
   `system/`, so it is. Verified against the deploy model ("Pages serves the repo as-is").
3. **The engine's pure core has no hidden `process`/`console` dependency** beyond the two identified
   (`entriesFromExport`'s multi-mode log, `runPull`'s reporting). Pass 2's `node --check` plus a
   `grep -n "console\.\|process\." system/pack-import.mjs` returning nothing is the proof.
4. **The `<style>` element beats the pack `<link>` — MEASURED, not reasoned.** Both are
   equal-specificity `:root` rules, so the later one in document order wins. Do **not** reason from
   "the script appends to `<head>`": `pack-boot.js` is a *parser-blocking classic script*, so at the
   moment it runs, only the elements **above its own tag** exist. A stylesheet linked *below* that
   tag would parse afterwards and beat the appended rule.
   **Measured 2026-07-26 across all seven pages that load it** — `index.html`, `approach.html`,
   `factory.html`, `work.html`, `contact.html`, `404.html`, `roundtrip.html` — the `pack-boot.js`
   tag is the **last element in `<head>` on every one**, immediately after the same four stylesheets
   (`tokens.contract` · `tokens.neutral` · `components` · `portfolio`). `instance.html` and the two
   proto pages load no `pack-boot.js` at all and are unaffected.
   **This is a fact about today's markup, not a guarantee.** A future page that adds a stylesheet
   below the `pack-boot.js` tag would silently half-apply an imported pack on that page only. Two
   mitigations, both cheap, both required:
   - `applyImported()` (the module path, Task 11) re-appends the `<style>` at the end of `<head>`
     rather than assuming its existing position, so it always lands last at call time.
   - Task 12 re-verifies the head order on **all seven pages** empirically, not just `index.html`,
     and the `pack-boot.js` header comment records the dependency so the next person adding a
     stylesheet sees it.

**Genuinely open — decide during implementation and record the answer in the report:**

1. **Does un-wearing an imported pack forget it, or keep the row?** `pack-derived.mjs:182–188` set the
   precedent that reset **keeps** the record so the row stays on offer. Recommend matching it: keep
   the record, remove the `<style>`. Task 13 branch 3 currently allows either.
2. **Should a second drop replace the first, or should both rows persist?** One record key implies
   replace, which matches "one worn thing at a time". Recommend replace; note it in the beat copy so
   a reader comparing two design systems is not surprised.
3. **How big does the runtime group actually get?** Estimated 45→48 files, 11 900→12 900 lines. If the
   extraction lands materially larger, `approach.html`'s claim is still generated (never
   hand-written), so nothing is dishonest — but the baseline churn is bigger than budgeted.

**Would change the plan if answered differently:**

- If the owner later wants the imported pack to survive a browser restart, swap `sessionStorage` for
  `localStorage` and add an `"imported"` value to the `factory-pack` selector. That would reintroduce
  the stale-selector problem (a selector naming a record a new tab cannot see), so it needs the
  #108-style displacement machinery this plan deliberately avoids. Non-trivial; a follow-up ticket.

---

## NOTES (open canvas)

### Why the extraction is the ticket

It is tempting to read #130 as "add a drop zone to the home page". It is not. The drop zone is
maybe 350 lines of straightforward UI. The ticket is a **four-file refactor of the repo's most
actively-changing subsystem** — `tooling/figma/` shipped in PRs #111, #112, #115, #118, #120, #124,
#126, #128 and #131, several of them in the last 48 hours — performed under a byte-parity gate,
because the honesty contract cannot survive a browser that maps a design differently from the CLI
that produced the committed `plusui` pack.

Budget accordingly. Phase 1 is the risk; Phases 3–4 are the visible work.

### The dependency graph after the change

```
system/oklch.mjs ─┐
system/wcag.mjs  ─┼─→ system/pack-import.mjs ──┬─→ system/brand-import.mjs   (the beat)
system/derive.rules.mjs ─┘        ▲            └─→ (browser: fetch tokens.source.json)
                                  │
        ┌─────────────────────────┼──────────────────────┐
        │                         │                      │
tooling/figma/figma-read.mjs  tooling/figma/figma-pull.mjs   agent-layer/gen-pack-css.mjs
   (fetch, cache, budget, fs)   (CLI, --map, disk, logs)        (readFileSync/writeFileSync)
                                                                     ▲
                                                        agent-layer/gen-token-css.mjs
                                                          (re-exports cssValue/aliasPath)

system/pack-imported.mjs ──→ (record + <style>)     system/pack-boot.js  (classic, mirrors the validator by hand)
        ▲                                                    ▲
   system/dock.mjs ──→ system/pack-derived.mjs ──────────────┘ (shape-mirrored, never imported)
```

`pack-import.mjs` imports **nothing** from `agent-layer/` or `tooling/`. That is the invariant that
makes it view-time-safe, and the one thing a reviewer should check first.

### Why shadowing beats displacing

The owner picked "the import replaces it (one worn thing at a time)" with a mock-up showing a
`#108`-style restore button. This plan achieves the same *visible* behaviour by a cheaper route:
the imported record lives in `sessionStorage` and `pack-boot.js` checks it **first**, so a worn
import shadows the reader's committed/derived pick rather than overwriting it. Nothing is destroyed,
so nothing needs preserving, so nothing needs restoring — the dock rows are the restore affordance.

Two things fall out for free: a new tab is a guaranteed no-op (which is precisely what
`visual.spec.mjs` needs from `pack-boot.js`), and there is no stale-selector state where
`localStorage` claims `"imported"` over a record this tab cannot see.

**This is a deviation from the mock-up the owner clicked, in the direction of less machinery. Flag it
explicitly in the PR body** so it is an accepted simplification and not an unnoticed drift.

### The validator, and why it is measured

The 64 contract token values use exactly this charset (measured 2026-07-26):

```
 #%(),-.0123456789BFIMRSUabcdefghiklmnoprstuvwxy
```

No `;`, `{`, `}`, `@`, `\`, `<`, `>`, `:`, `/`, `*`, `'`, `"`. Imported values stay inside it —
`clamp(28px, 4vw, 44px)`, `0px 4px 8px #00000014`, `16px` — with **one** exception:
`composeShadow` (`figma-pull.mjs:180`) passes the design's shadow colour string through verbatim, as
any non-empty trimmed string. That is the whole reason a per-entry validator exists rather than a
type check. `/^[a-zA-Z0-9 #%(),.+-]{1,120}$/` admits every legitimate value and nothing that can
close a declaration.

Validating at **build** time (in `pack-imported.mjs`) rather than only at boot is what makes this
honest: a rejected value is reported to the reader as *"3 values your design offered could not be
applied safely"*, instead of vanishing silently between two page loads.

### Alternatives weighed and rejected

| Option | Why not |
|---|---|
| Inline `:root` custom properties (the derived-pack mechanism, generalised) | Owner preferred a `<style>` layer; and 64 `setProperty` calls at pre-paint on every navigation is worse than one rule. |
| Store the emitted CSS text and inject it | One opaque blob is a weaker thing to validate than 64 vetted pairs. Owner agreed on the reconciliation. |
| Duplicate the mapping core for the browser | Forbidden by CLAUDE.md and fatal to the honesty contract — the browser and the CLI would drift on contrast negotiation. |
| A Web Worker for the parse | Rejected by the owner; a second execution context, a message contract and a fallback path for an edge case. |
| Its own `/wear.html` page | Zero VR churn, but a hiring manager on the 90-second path never reaches it — which is most of the ticket's value. |
| A drop zone in the dock | The rail is hidden below 1100px, so the feature would not exist on phones, and drag-and-drop does not exist on touch at all. |

### Sequencing and parallelism

Phases 3 and 4 are genuinely independent once Task 10 fixes the record shape, and each is a
disjoint file set (`pack-imported.mjs` + `pack-boot.js` + `dock.mjs` + `spine.mjs` vs
`brand-import.mjs` + `index.html` + `portfolio.css`). They are a real candidate for two parallel
worktrees. Phases 1, 2 and 5 are strictly sequential and must not be split.

### Rollout risk

The one change that could break a page unrelated to this feature is `pack-boot.js`. It runs
parser-blocking on all six IA pages plus roundtrip. Verify it in isolation (Task 12) before anything
else touches it, and treat any baseline movement from that task alone as a defect, not an expected
churn.

---

## AMENDMENTS

<!-- Append-only. Newest at the bottom. Leave empty at creation. -->
