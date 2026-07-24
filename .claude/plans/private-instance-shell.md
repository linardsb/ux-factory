# Feature: Private-instance shell — Factory-station variant (real-brand labeling + pre-seeded wizard + embedded trace)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, anchors and config shapes. Import from the right files.

## Feature Description

The private-instance shell is the page a hiring manager opens on an unlisted link: the factory
demonstrated on *their* company's publicly stated product vision. This ticket builds the **generic,
config-driven shell in this repo** — nothing company-real is ever committed (the repo is public by
design). The shell is a new shipped page (`instance.html`) plus a view-time config module
(`system/instance.mjs`) that together render, from a scenario package:

1. **Real-brand honesty labeling (hard):** the instance states plainly it is speculative work based
   on the company's public statements, sources linked, not affiliated/endorsed; traces stay labeled
   "real run, curated".
2. **Pre-seeded wizard:** the *existing shared* wizard (`system/factory-intake.mjs`) configured —
   never forked — from the compiled package's `intake.defaults.json`: pre-seed from `axes`, bounds
   from the engine's own `RULESET` enums, the company's curated answers + reasoning shown, and
   reader overrides re-deriving live through `system/derive.mjs`.
3. **Embedded derivation trace:** the recorded pack-seed derivation replayed via
   `system/trace-player.mjs` — the "agent proposes your design language from your own product; the
   human gate decides" headline exhibit.
4. **Slots/links** for the per-application hand-crafted prototype screen and handoff pack —
   config-driven links with honest placeholders when absent (that content is jobs-folder work,
   not this ticket).

The committed demo renders from a new **fictional test package** (`scenarios/northwind/`) that
exercises the real-provenance labeling path.

## User Story

As a hiring manager opening an unlisted private link
I want to watch the factory pipeline run on my company's own stated product vision — pre-seeded intake with the reasoning, a live re-derivable design system, and the recorded agent run that proposed it
So that "this person could do this for us" becomes an observation, not an inference.

(Secondary, this ticket's committed artifact: as a *technical reviewer of the public repo*, I can open `/instance.html` and inspect the generic shell running on a clearly-labeled fictional subject.)

## Problem Statement

Epic #38 built the supply side: #39 compiles a company brief into a scenario package (with
real-provenance labeling), #40 records the pack-seed derivation trace, #42 ships the public
fidelity evidence. What's missing is the *demand* side — the page a real instance actually serves.
Without it, #44 (per-company build + unlisted deploy) has nothing to deploy, and the compiled
package shape has no consumer that renders its provenance labels, curated intake, and trace.

## Solution Statement

Add a config-driven shell page that consumes the package shape #39 pinned, by:
- **Opening a config seam in the shared wizard** (`factory-intake.mjs`): export `initIntake(config)`
  with the current inlined two-scenario behavior as the default; an explicit opt-out marker on the
  wizard mount lets a page supply its own scenario config. factory.html behavior is byte-identical.
- **A new `system/instance.mjs`** that fetches the configured package's `intake.defaults.json` +
  `copy.json`, renders the honesty surfaces (speculative notice + sources; fictional notice when
  present), renders the company's 8 curated answers with reasoning, maps `axes` → the wizard's
  scenario-config shape and calls `initIntake`, mounts the trace player on the configured trace,
  and renders the prototype/handoff link slots.
- **A new `instance.html`** — a designed Factory-station-variant page (site chrome, station layout
  derived from factory.html) holding the anchors, the ported wizard/trace CSS, and one inline
  `window.INSTANCE_CONFIG` line that #44's build can rewrite per company.
- **A hand-authored fictional test package** `scenarios/northwind/` (`fictional: true` +
  `fictionalNotice`, per the validator) that *additionally* carries `speculativeNotice` + `sources`
  as free-form copy keys, so the committed demo exercises the real-provenance rendering path while
  staying honestly labeled fictional. (The compiler's privacy guard rightly refuses a
  `fictional: false` package in-repo — hand-authoring a package is the verdant/fieldwork precedent;
  the never-hand-write rule covers agent output (traces/compositions), not authored content.)

## Out of Scope / Non-Goals

- **Not included:** the per-company build + unlisted deploy flow (ticket #44); anything run from the jobs folder.
- **Not included:** any real company content, screenshots, or tokens — the privacy boundary is hard.
- **Not included:** a hand-crafted prototype screen or handoff pack for Northwind — the shell renders honest placeholders (per-application content, jobs folder).
- **Not changing:** `factory.html` (zero edits — its VR baselines must pass untouched; #42's surfaces live there).
- **Not changing:** `agent-layer/gen-company-package.mjs`, `agent-layer/lib.mjs` (parsers), the brief record format, or `scenarios/validate.mjs` — the package shape is #39's decided contract, consumed as-is.
- **Not adding:** `instance.html` to the visual-regression `PAGES` list (precedent: `/agentic-ui-study.html`, the other designed non-IA page, is not covered either; its content is fetch-driven). Flag as possible follow-up, don't do it here.
- **Not adding:** a nav entry — the shell is deep-link-only (the five-page IA framing is an architecture-level decision; contact.html precedent shows a page can live off-nav).
- **Not adding:** pack-boot.js / dock.mjs to the new page — a private instance pins its pack; reader re-skin of the chrome is a public-site affordance (deliberate, documented in the page header).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High (~600–1000 lines across page + module + package + CSS, plus a behavior-preserving refactor of a live module)
**Primary Systems Affected**: `system/factory-intake.mjs` (seam), new `system/instance.mjs`, new `instance.html`, `scenarios/` (new package + registry), `worker/fixtures.mjs`, `system/loc-summary.json` (regen), VR approach baselines (regen)
**Dependencies**: none new (vanilla constraint holds; view-time fetches committed files only)

## Related Work

**Implements**: [linardsb/ux-factory#43](https://github.com/linardsb/ux-factory/issues/43)   ·   **Epic**: #38 — `docs/epics/per-company-brief.architecture.md` (its §Recommended approach, §Boundaries, §Other decisions are inherited, not re-decided)

**Back-references** (decisions this builds on):

- PR #46/#48 (#39) — `agent-layer/gen-company-package.mjs` + `parseCompanyBrief`: the compiled package shape + provenance labeling + privacy guard this shell consumes and must not weaken.
- PR #49 (#40) — `traces/pack-seed-verdant.jsonl`: the committed real derivation trace used as the test embed.
- PR #53 (#42) — `system/derivation-roundtrip.mjs`: the exhibit-module pattern (pure prepare + render + self-mounting init + `data-*="ready"` VR handle + errorCard degradation) this module mirrors.
- Ticket #10 (slice 10.2/10.3) — `system/factory-intake.mjs`: the shared wizard whose config seam this opens.

**Forward-references**:

- #44 — per-company build + unlisted deploy: rewrites `window.INSTANCE_CONFIG` + ships a company package + pack beside this shell.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `system/factory-intake.mjs` (all 608 lines) — Why: the module being refactored. Load-bearing details: inlined `SCENARIOS` map shape (lines 47–118: `{label, fictionalNotice, wizard:[{axis,prompt,reasoning}], defaults, makerMatrix, ethicsReveal}`), `ENUM`/`LABELS` from `RULESET` (123–132), fail-fast enum validation (155–160), `init()` anchor lookups + optional-anchor guards (186–196), `guardArrows` trace-player collision guard (177–182), `renderScenarioChrome`'s factory-only surfaces (300–313), auto-init (`608`).
- `factory.html` — Why: the station layout to derive the variant from. Head boilerplate (1–23), page-scoped CSS: `.fw-*` wizard/narrative/ethics families (~58–172), `trace-*` block "ported verbatim from trace.html" (~174–220), station heading pattern `section-label`/`num`/`capability` (346), honesty-notice idiom `.fw-scenario` (352–356), `#intake` station + `#factory-wizard` mount (344–378), `#generation` station: `#reskin-preview` static component sample + `#factory-narrative` + `#ethics-gate` (381–436), bottom script order (639–645), trace-player mount script with errorCard + `data-trace="ready"` (647–675).
- `system/trace-player.mjs` — Why: embed API. `parseTrace(jsonlText)` (line 28, pure, throws naming line numbers), `renderTracePlayer(container, trace)` (98–223, returns `{next,prev,reveal,revealAll,destroy}`), injects no CSS (host page styles `trace-*`), per-player scoped arrow keys (safe to co-exist with the wizard via `guardArrows`), renders `meta.label` verbatim (honesty surface #2).
- `system/derivation-roundtrip.mjs` — Why: the module pattern to mirror. Pure `prepareDiff` (19–40), `renderRoundTrip` (109–253), self-mounting `init()` inert without its mounts (284–303), independent fetches, `mount.dataset.* = "ready"` only on success (290, 298), `errorCard` (269–278), `rt-*` class prefix convention, color-as-data exception comment (10–11).
- `agent-layer/gen-company-package.mjs` — Why: the compiled package shape being consumed. `QUESTION_CANON` structural fields (53–70 — the 8 ids/stages/bounds the test package must match), copy.json provenance branches (116–129: `speculativeNotice`+`sources` vs `fictionalNotice`), privacy guard (35–47, 81–86 — must NOT be weakened or worked around).
- `scenarios/validate.mjs` — Why: the contract the test package must pass. `checkIntake` (74–101: 8 fixed ids, axes vocab, optional matrix booleans), `checkCopy` provenance branches (103–126 — fictional:true requires `fictionalNotice` matching `/fiction/i`; extra keys are unchecked), `checkFixtures` (128–193: screens↔fixtures backing, unique ids, `<thing>Id` refs, calendar dates), verdict-differ (309–311), `COHERENCE` keyed by slug (198–259 — `northwind` has no profile → generic checks only).
- `scenarios/README.md` — Why: package format + provenance doc (esp. lines 14–26 Provenance, 93–101 copy.json contract) — gets a small demo-package convention note.
- `scenarios/verdant/intake.defaults.json` + `scenarios/verdant/copy.json` — Why: the reference package instances (question/axes shapes; copy fields).
- `agent-layer/fixtures/northwind-real/brief.md` + `agent-layer/fixtures/northwind-real/fixtures/items.json` — Why: the #39 test fixture whose *content* (name, intake pairs, axes, ethics narrative, items data) the test package adapts. Note its header: it exists to exercise the real-provenance path — same job, package form.
- `traces/pack-seed-verdant.jsonl` — Why: the test embed. Meta line: `label: "Real run, curated for length"`, task "Derive a Verdant pack seed from product screenshots (proposal — human-gated)" — the station copy should frame exactly this.
- `traces/README.md` — Why: honesty rules for anything the page claims about traces (labels are fixed strings; never restate them loosely).
- `system/scenario-data.mjs` — Why: fetch conventions (root-absolute paths, worker→static degrade); instance.mjs fetches package files directly by static path (no worker dependency for intake/copy).
- `index.html` (head, 1–18; bottom scripts 110–114) — Why: canonical shipped-page head boilerplate + script order.
- `system/site.js` — Why: chrome injection contract. Reads `window.CLIENT_CONFIG`; `data-page` on body matched to `nav[].key` for the active state (no match = no active item — contact precedent); config script must load before site.js.
- `worker/fixtures.mjs` — Why: the 3-import + 1-entry registration pattern for a new scenario (comment lines 4–5).
- `tooling/visual-regression/visual.spec.mjs` (PAGES, 15–37) + `tooling/visual-regression/package.json` (update:docker) — Why: confirm instance.html stays OUT of PAGES; baseline-regen procedure for the approach cascade.
- `agent-layer/gen-loc-summary.mjs` (GROUPS regex, 22–26) + `approach.html:384–386` — Why: new `system/*.mjs` + root `.html` both change `loc-summary.json`; approach.html renders the runtime group's file count → its two baselines must be regenerated.
- `tooling/drift-check.mjs` (105–115) — Why: the CI gate order this PR must satisfy (syntax → token-css → annotated-source → loc-summary → system-graph → handoff → scenarios → traces).

### New Files to Create

- `instance.html` — the private-instance shell page (designed Factory-station variant; demo-configured to Northwind).
- `system/instance.mjs` — view-time config module: package fetch → notices + curated intake + wizard config → `initIntake`; trace mount; link slots.
- `scenarios/northwind/brief.md` — fictional brief, package form (head + 5 prose sections).
- `scenarios/northwind/intake.defaults.json` — 8 canon questions with Northwind's (default, reasoning) pairs + axes (no matrix booleans).
- `scenarios/northwind/copy.json` — `fictionalNotice` + `tagline` + `ethicsReveal` + **`speculativeNotice` + `sources`** (the real-provenance surface, free-form keys on a fictional package).
- `scenarios/northwind/proto.config.json` — one screen (`stock-overview`, collections `["items"]`), empty slots.
- `scenarios/northwind/fixtures/items.json` — adapted from `agent-layer/fixtures/northwind-real/fixtures/items.json` (unique ids, valid dates, no `<thing>Id` refs).

### Files to Update

- `system/factory-intake.mjs` — the config seam (behavior-preserving; see Phase 1).
- `scenarios/index.json` — register `{ "slug": "northwind", "name": "Northwind", "label": "Wholesale inventory · demo instance" }`.
- `worker/fixtures.mjs` — one import + one `FIXTURES.northwind` entry.
- `scenarios/README.md` — short note under Provenance: a fictional demo package MAY carry `speculativeNotice`+`sources` as extra keys to exercise the real-provenance rendering path; the fictional notice still renders above it.
- `system/loc-summary.json` — REGENERATED (never hand-edited).
- `tooling/visual-regression/baselines/approach-*.png` (2 files) — REGENERATED via docker (runtime file count renders on approach.html).
- `CLAUDE.md` — architecture map: one line for `instance.mjs` beside the other view-time modules; extend the root-pages line with `instance.html`.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `docs/epics/per-company-brief.architecture.md`
  - §Recommended approach (private layer + bounded steering — liveness option (b) is decided), §Key decisions → Boundaries & contracts (privacy boundary · honesty labeling · no public upload surface), §Other ("the wizard is shared, not forked"), §Open questions (the screenshots-in-trace default-yes call this ticket records).
- GitHub issue #43 (scope + AC) and epic issue #38 (same content as the architecture doc).
- `.claude/references/frontend-component-best-practices.md` — UI work is in scope per CLAUDE.md's on-demand rule.
- `traces/README.md` — the honesty label strings are contractual.

### Patterns to Follow

**Exhibit module shape** (from `derivation-roundtrip.mjs`): pure prepare/validate function (Node-runnable, no DOM) + render function + self-mounting `init()` that is inert when its anchors are absent, `if (typeof document !== "undefined") init();` at the bottom so Node `import()` parse-checks never touch the DOM.

**Fetch + readiness + degradation** (from `factory.html:653–675` / `derivation-roundtrip.mjs:284–303`):
```js
fetch(path)
  .then((res) => { if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`); return res.text(); })
  .then((text) => { renderTracePlayer(mount, parseTrace(text)); mount.dataset.trace = "ready"; })
  .catch((err) => errorCard(mount, `Could not load ${path} — ${err.message}`));
```
`data-*="ready"` is set ONLY on success; failures render an honest `card trace-error-card` with an `h3` + muted message.

**DOM building**: `el(tag, className, text)` helper + `textContent` for all data-derived strings; `innerHTML` only for markup assembled from `esc()`-escaped values (factory-intake.mjs:35, 163–168). Hex/colour values reach the DOM only via `.style` properties (colour-as-data exception, derivation-roundtrip.mjs:10–11).

**Honesty notice idiom** (factory.html:352–356):
```html
<p class="fw-scenario">
  <strong class="fw-scenario-tag">Fictional scenario</strong>
  <span>…notice text…</span>
</p>
```

**Station heading** (factory.html:346): `<h2 class="section-label"><span class="num">01</span><span>Name <span class="capability live">Runs now</span></span><span class="line"></span></h2>`. Capability badges state exactly what runs (honesty surface #3).

**Page-scoped CSS**: page-unique styling lives in the page's own inline `<style>`, tokens only, with a "ported verbatim from factory.html:N–M" comment on copied blocks (factory.html did exactly this with trace.html's `trace-*` block). New shell-specific classes use a fresh `pi-` prefix.

**Errors**: throw plain `Error` naming the offending path/field; feature files open with a header citing the governing doc.

**Naming**: kebab-case files, `camelCase` exports, `gen<Name>`-style only for generators (not applicable here).

---

## IMPLEMENTATION PLAN

### Phase 1: Wizard config seam (factory-intake.mjs — behavior-preserving)

**Independent of:** Phase 2 (parallel candidates).

Open the seam the ticket names without changing factory.html's rendering by one pixel.

**Tasks:**
- Extract the module-level fail-fast enum check (155–160) into `assertScenarioConfig(scenarios)`; keep calling it at module load on the inlined `SCENARIOS` (preserves the load-time failure) and call it again inside `initIntake` on whatever config arrives.
- Rename `init()` → `initIntake(config = { scenarios: SCENARIOS, defaultScenario: DEFAULT_SCENARIO })` and export it. Inside, replace every `SCENARIOS` / `DEFAULT_SCENARIO` reference with `config.scenarios` / `config.defaultScenario` (sites: `active` seed, `setScenario` guard + reseed, `renderToggle` loop, `renderScenarioChrome`, `renderWizard`, `renderEthics`/`renderReveal`).
- Auto-init guard: `if (typeof document !== "undefined" && !document.querySelector('#factory-wizard[data-intake="external"]')) initIntake();` — factory.html has no marker → identical behavior; instance.html marks its mount and calls `initIntake` itself.
- All optional anchors (`#scenario-toggle`, `#ethics-gate`, `#fw-scenario-notice`, `#handoff-note`, `.factory-embed-figure[data-scenario]`) already no-op when absent — the shell simply omits the factory-only ones. Do not touch `renderScenarioChrome`'s factory copy.

### Phase 2: Fictional test package (scenarios/northwind/)

**Independent of:** Phase 1.

**Tasks:**
- Author the five package files (shapes in New Files above), adapting content from `agent-layer/fixtures/northwind-real/` — `fictional: true`, `today: "2026-07-19"` (fixture dates already cohere with it), axes without matrix booleans (exercises the `makerMatrix: null` → "Not placed / the frequency filter already decided" reveal path), verdict `utility` (verdict-differ set stays ≥2 with verdant's `habit-justified`).
- `copy.json` honesty pair, wording is load-bearing:
  - `fictionalNotice`: "Northwind is a fictional company, invented to demonstrate this private-instance shell. No real company, users, or data are involved — the label below is rendered exactly as a real instance renders it."
  - `speculativeNotice`: "Speculative work based on Northwind's public statements. Sources linked below. Not affiliated with or endorsed by Northwind." + `sources`: the two example.com URLs from the #39 fixture.
- Register: `scenarios/index.json` entry + `worker/fixtures.mjs` import/entry.
- Document the convention in `scenarios/README.md` (§Provenance, 2–3 sentences).

### Phase 3: Shell page + config module

**Depends on:** Phases 1 and 2.

**Tasks:**
- `system/instance.mjs` (see Task 5 for the full contract): fetch package → render notices, curated intake, link slots; build wizard scenario config → `initIntake`; mount trace player.
- `instance.html`: head boilerplate (no pack-boot — deliberate, commented), inline `<style>` porting the needed `fw-*` + `trace-*` blocks + new `pi-*` rules, hero, stations (labeling → curated intake → wizard → generated result → trace → prototype/handoff slots), `window.INSTANCE_CONFIG`, bottom scripts.

### Phase 4: Generated artifacts + gates

**Depends on:** Phase 3 (loc-summary counts the new files).

**Tasks:**
- `node agent-layer/gen-loc-summary.mjs` (drift gate); delete + regenerate the two approach baselines via `npm run update:docker` (the runtime files count renders on approach.html; update:docker skips sub-perceptual diffs — `rm` the PNGs first).
- Full local gate run: `node tooling/drift-check.mjs` + `node tooling/token-lint.mjs` + docker VR (factory/index/work/contact/404/proto baselines must pass UNCHANGED — this is the proof the Phase-1 refactor is behavior-preserving).
- CLAUDE.md architecture-map lines.

### Phase 5: Manual validation + record the screenshots call

**Tasks:**
- Serve + walk the AC checklist (Level 4 below) on both `/instance.html` and `/factory.html`.
- The epic's open question — company product screenshots in the replayed trace — is decided **default yes on an unlisted link**; record it in the `instance.html` header comment and `system/instance.mjs` header (the shell replays the curated trace verbatim, including screenshot references; today's player renders text steps, so the call is recorded for #44-era instances).

---

## STEP-BY-STEP TASKS

### 1. UPDATE `system/factory-intake.mjs` — extract `assertScenarioConfig`

- **IMPLEMENT**: Move the loop at lines 155–160 into `function assertScenarioConfig(scenarios)` (same checks, same error messages, parameterized over `scenarios`); call it immediately at module level with the inlined `SCENARIOS`.
- **PATTERN**: fail-fast-at-load comment block stays (factory-intake.mjs:153–154).
- **GOTCHA**: don't name it `validateScenarios` — that name is `scenarios/validate.mjs`'s export; avoid grep confusion.
- **VALIDATE**: `node --check system/factory-intake.mjs && node -e "import('./system/factory-intake.mjs').then(()=>console.log('import ok'))"`
- **SATISFIES**: AC "wizard configured, never forked" (groundwork).

### 2. UPDATE `system/factory-intake.mjs` — export `initIntake(config)` + auto-init guard

- **IMPLEMENT**: as Phase 1 above. Signature: `export function initIntake({ scenarios = SCENARIOS, defaultScenario = DEFAULT_SCENARIO } = {})`; first line `assertScenarioConfig(scenarios)`. Replace internal `SCENARIOS[...]`/`DEFAULT_SCENARIO` references (grep for both — every hit inside the old `init` body switches to the config values; the module-level `SCENARIOS` literal itself is unchanged). Auto-init: `if (typeof document !== "undefined" && !document.querySelector('#factory-wizard[data-intake="external"]')) initIntake();`
- **PATTERN**: header comment gains 2–3 lines naming the seam + ticket #43 (feature files cite their governing doc).
- **GOTCHA (1)**: `Object.keys(config.scenarios)` drives `renderToggle` — a single-scenario config renders a one-option toggle, so the shell page must simply omit the `#scenario-toggle` anchor (already guarded, line 266). Don't add single-scenario special-casing.
- **GOTCHA (2)**: `import`ing this module executes the auto-init line — the guard is what stops the default config from mounting on instance.html before `instance.mjs` calls `initIntake` with its own. The marker must be ON the mount in static HTML, not added by JS later.
- **VALIDATE**: `node --check system/factory-intake.mjs`; then serve and load `/factory.html` — wizard, toggle, ethics matrix, narrative all behave exactly as before (both scenarios).
- **SATISFIES**: AC "wizard pre-seeded … overrides re-derive live" (seam); §Other "the wizard is shared, not forked".

### 3. CREATE `scenarios/northwind/` (five files)

- **IMPLEMENT**: as Phase 2 above. `intake.defaults.json` questions must carry the exact structural fields from `QUESTION_CANON` (`gen-company-package.mjs:53–70`): same 8 ids, stages, `question` strings, `bounds` (`target-behavior` → the 5 frequency values; `friction` → the 6 friction values; others `null`), `asked` flags — only `default`/`reasoning` are Northwind's (from the #39 fixture's `intake` block). `axes`: `{ "brandColor": "#0A5C6B", "density": "compact", "rewardType": "hunt", "frequency": "monthly" }` (no booleans). `brief.md`: json head (`slug: "northwind"`, `fictional: true`, name/domain/oneLiner/today from the fixture) + the 5 prose sections adapted (state in §Product that this is the demo subject for the private-instance shell).
- **PATTERN**: mirror `scenarios/verdant/` file-by-file; fixtures adapted from `agent-layer/fixtures/northwind-real/fixtures/items.json`.
- **GOTCHA**: slug is `northwind` (not `northwind-real`) — directory must match head slug; no `COHERENCE` profile exists for it (generic checks only, fine). Field `updatedOn` dates must be real calendar dates ≤ today-ish (validator checks calendar validity only).
- **VALIDATE**: `node scenarios/validate.mjs scenarios/northwind` (by-path) — one ✓ line.
- **SATISFIES**: AC "renders from a fictional test package exercising the real-provenance labeling path (#39's format)".

### 4. UPDATE `scenarios/index.json` + `worker/fixtures.mjs` + `scenarios/README.md`

- **IMPLEMENT**: registry entry (slug/name/label); `import northwindItems from "../scenarios/northwind/fixtures/items.json" with { type: "json" };` + `northwind: { items: northwindItems }` in `FIXTURES`; README §Provenance note (demo-package extra-keys convention).
- **PATTERN**: worker/fixtures.mjs comment lines 4–5 ("data registration, not engine logic").
- **GOTCHA**: registering makes `checkScenarios()` (CI drift-check) validate the package on every PR — that's the point. Verdict-differ passes (set: habit-justified, utility).
- **VALIDATE**: `node scenarios/validate.mjs` (registry mode) — three ✓ lines + "verdicts differ"; `cd worker && npx wrangler dev` boots and `GET /api/northwind/items` answers (optional smoke; static fallback covers the page regardless).
- **SATISFIES**: AC1 (package is CI-validated, loadable).

### 5. CREATE `system/instance.mjs`

- **IMPLEMENT**: hand-written canon module, header citing `per-company-brief.architecture.md §Recommended approach (private layer + bounded steering) + §Boundaries (honesty labeling · privacy · no public upload surface); epic #38 ticket #43` and **recording the screenshots call** (default yes on an unlisted link — the curated trace is replayed verbatim). Contract:
  - Reads `window.INSTANCE_CONFIG = { package, name, trace: { path }, links: { prototype, handoff } }` (package = root-absolute dir, no trailing slash). Missing/malformed config → errorCard in `#instance-notices`, nothing else mounts.
  - `init()` behind `typeof document` guard; inert unless `#instance-notices` exists.
  - Fetch `${package}/intake.defaults.json` + `${package}/copy.json` (`Promise.all`); on failure → errorCard; on success set `document.body.dataset.instance = "ready"` after all synchronous rendering below.
  - **Notices** (`#instance-notices`): if `copy.fictionalNotice` → render the `.fw-scenario` idiom (tag "Fictional scenario"). If `copy.speculativeNotice` → render a second block (tag "Speculative work") + a `sources` link list (each via `createElement("a")`, `textContent` = URL, `rel="noopener noreferrer"`, `target="_blank"`; **scheme-guard**: `new URL(s)` in try/catch, only `http:`/`https:` become links, anything else renders as plain text). Order: fictional first, speculative below — on a real instance only the speculative block exists.
  - **Curated intake** (`#instance-intake`): for each of the 8 questions render a `.cs-acc`-style `<details>` (summary = question; body = `default` paragraph + muted `reasoning` paragraph, all `textContent`). This is the "company's curated answers shown with their reasoning" surface in full.
  - **Wizard config**: validate the 4 axes exist; build `{ [slug]: { label: name, fictionalNotice: copy.fictionalNotice ?? "", wizard: WIZARD_STEPS(name, intake), defaults: { brandColor, density, rewardType, frequency } from axes, makerMatrix: (both booleans present in axes) ? { improvesLives, wouldUseIt } : null, ethicsReveal: copy.ethicsReveal } }` → `initIntake({ scenarios, defaultScenario: slug })`. `WIZARD_STEPS` reuses the four scenario-independent prompts verbatim from factory-intake; per-axis reasoning: `frequency` ← the `target-behavior` question's `reasoning` (its `bounds` literally are the frequency enum — the one direct semantic mapping); `brandColor` ← "`${name}`'s curated brand colour. Override it — the engine keeps your hue and negotiates only lightness, down to the WCAG contrast floor."; `density`/`rewardType` ← "Curated in `${name}`'s brief — override it and the engine re-derives live. The full curated intake above records the reasoning."
  - **Trace mount** (`#instance-player`): the factory.html:653–675 idiom verbatim (fetch → `parseTrace` → `renderTracePlayer` → `dataset.trace = "ready"` → errorCard), path from config.
  - **Link slots** (`#instance-links`): two cards (prototype screen / handoff pack). A non-null href renders a link; null renders the honest placeholder: "Authored per application — not part of this demo instance." No capability badge claims anything that doesn't run.
- **PATTERN**: `derivation-roundtrip.mjs` module shape; `el()`/`esc()` helpers copied per convention (each module carries its own — see factory-intake.mjs:35 note "verbatim from derive.html:165").
- **IMPORTS**: `import { initIntake } from "./factory-intake.mjs";` `import { parseTrace, renderTracePlayer } from "./trace-player.mjs";` (relative — Node-parse-safe, matches derivation-roundtrip.mjs:13).
- **GOTCHA (1)**: importing factory-intake.mjs fires its guarded auto-init — instance.html's mount marker (Task 6) is what makes it stand down.
- **GOTCHA (2)**: package JSON is committed content but is treated as untrusted at the DOM boundary (repo convention) — textContent everywhere, no innerHTML from package strings.
- **GOTCHA (3)**: do not fetch `brief.md` (no markdown parsing at view time — scenarios/README.md:44–45); everything rendered comes from the two JSON files + config.
- **VALIDATE**: `node --check system/instance.mjs && node -e "import('./system/instance.mjs').then(()=>console.log('import ok'))"`
- **SATISFIES**: AC1 (labels, pre-seeded wizard + reasoning, live re-derive, trace replay), AC2 (no live LLM — committed files only), AC3 (call recorded).

### 6. CREATE `instance.html`

- **IMPLEMENT**:
  - Head: index.html:1–18 boilerplate; title `Private instance · Northwind — demo · Linards Berzins`; description naming it a demo of the private-instance shell; `noindex` meta; the 4 CSS links; **no pack-boot.js** + comment stating why (instance pins its pack; #44 swaps the tokens line per company).
  - Header comment: governing doc + ticket + the screenshots default-yes call + "generic shell — #44 rewrites INSTANCE_CONFIG per company; nothing company-real is ever committed here".
  - Inline `<style>`: port from factory.html with "ported verbatim from factory.html:N–M" comments — the `fw-*` wizard/card/radios/color/checks/beat/notes/patterns/verdict families, `fw-ethics/matrix/quadrant/reveal`, `fw-scenario` notice, and the `trace-*` block (174–220). Add `pi-*` rules: `pi-sources` (link list), `pi-intake` grid, `pi-links` cards. Tokens only — a literal is a bug.
  - Body `data-page="instance"`: `page-hero` (h1 "Private instance — the factory on a stated product vision", hero-sub explaining what a hiring manager is looking at, span filled with the company name by JS optional); then sections:
    1. `#labeling` — `<div id="instance-notices">` (JS-rendered honesty surfaces; static muted "Loading…" seed).
    2. `#curated-intake` — station heading (num 01, no capability badge needed) + `<div id="instance-intake">`.
    3. `#wizard` — station heading (num 02 + `capability live` "Runs now") + `<div id="factory-wizard" data-intake="external"><p class="fw-loading muted">Loading…</p></div>`.
    4. `#generated` — station heading (num 03 + "Runs now") + `#reskin-preview` with the static real-component sample markup adapted from factory.html's `#generation` (copy the sample block; trim if oversized but keep real components: buttons, card, stat tiles) + `<div id="factory-narrative">` + `<div id="ethics-gate">`.
    5. `#derivation-trace` — station heading (num 04 + capability wording matching factory Station 5's register) + framing copy: this is the recorded run in which the agent proposed the pack from product screenshots and the human gate decided (labels: exactly "Real run, curated for length" comes from the player itself) + `<div id="instance-player"></div>`.
    6. `#materials` — station heading (num 05) + `<div id="instance-links">`.
  - Before the module scripts: `<script>window.INSTANCE_CONFIG = { package: "/scenarios/northwind", name: "Northwind", trace: { path: "/traces/pack-seed-verdant.jsonl" }, links: { prototype: null, handoff: null } };</script>` + one comment line: #44's build rewrites this object (and the demo trace is Verdant's — labeled in the station copy: the demo embeds the committed Verdant derivation run).
  - Bottom scripts, exact order: `client.neutral.config.js` → `site.js` → `portfolio.js` → `<script type="module" src="/system/analytics.mjs">` → `<script type="module" src="/system/instance.mjs">` (no dock.mjs, no separate factory-intake tag — instance.mjs imports it).
- **PATTERN**: factory.html skeleton + station idiom; agentic-ui-study precedent for a designed non-IA, non-nav page with site chrome.
- **GOTCHA (1)**: the demo trace is `pack-seed-verdant.jsonl` while the package is Northwind — the station copy must say so honestly (one sentence: "This demo instance embeds the committed Verdant derivation run; a real instance embeds the run recorded on the company's own product." — capability indicator discipline).
- **GOTCHA (2)**: `#reskin-preview` inline-props re-skin is scoped to that container (factory-intake run(), line 222–225) — the sample must live INSIDE `#reskin-preview` exactly as on factory.html.
- **GOTCHA (3)**: `guardArrows` is attached by `initIntake` to the wizard/ethics mounts — no extra wiring needed for trace-player arrow-key coexistence.
- **VALIDATE**: `npx serve .` → `http://localhost:3000/instance.html` renders: chrome injected, both notices + sources, 8 curated answers, wizard seeded `#0A5C6B`/compact/hunt/monthly, colour drag re-derives narrative + WCAG table live, ethics reveal shows "Not placed" maker path, trace replays with "Real run, curated for length", link slots show placeholders. Console clean.
- **SATISFIES**: AC1, AC2 (vanilla, no upload surface — page has no input that leaves the browser), AC3.

### 7. UPDATE `CLAUDE.md` — architecture map

- **IMPLEMENT**: add `instance.mjs` line under `system/` ("view-time private-instance shell config (hand-written canon): package → notices + curated intake + wizard config + trace embed; driven by instance.html — the Factory-station variant a real application deploys unlisted (epic #38 ticket #43)") and extend the root-pages line to mention `instance.html`.
- **VALIDATE**: read the diff — map stays truthful, no bloat.
- **SATISFIES**: repo convention (map documents shipped modules).

### 8. REGENERATE `system/loc-summary.json` + approach baselines

- **IMPLEMENT**: `node agent-layer/gen-loc-summary.mjs` (new runtime file + new page change the counts). Then `rm tooling/visual-regression/baselines/approach-neutral*.png tooling/visual-regression/baselines/approach-saulera*.png` (exact names: `ls tooling/visual-regression/baselines/ | grep approach`) and `cd tooling/visual-regression && npm run update:docker`.
- **GOTCHA**: update:docker skips baselines whose only diff is sub-perceptual — the `rm` forces the rewrite (memory: vr-update-skips-subperceptual). Commit the trace/scenario/system files FIRST or at least `git add` them: `gen-loc-summary` counts committed index blobs, not the working tree (PR #59).
- **VALIDATE**: `node tooling/drift-check.mjs` — all ✓; the docker VR run: approach baselines regenerated, **every other baseline passes unchanged** (factory especially — the Phase-1 refactor proof).
- **SATISFIES**: CI gates green; no regressions.

### 9. Full gate pass + manual walkthrough

- **IMPLEMENT**: run everything in VALIDATION COMMANDS below; walk Level 4 on both pages.
- **VALIDATE**: see below.
- **SATISFIES**: Completion checklist.

---

## TESTING STRATEGY

No test suite exists (project rule: "run the surface you touched" — don't invent one). Verification is: the gate scripts (drift-check, token-lint, scenario validator, VR docker) + manual walkthroughs of the two affected pages + Node parse/import checks of the two modules.

### Edge Cases (must be exercised manually)

- Package fetch failure (rename `scenarios/northwind/copy.json` locally, reload): errorCard renders, no ready attr, trace still mounts (independent fetches), console names the path.
- Trace fetch failure (bad path in INSTANCE_CONFIG): trace errorCard, wizard unaffected.
- `INSTANCE_CONFIG` absent: page renders static shell + one honest error, no throws.
- factory.html both scenarios: toggle, wizard steps, colour drag, ethics place+reveal, trace stepping — identical to pre-refactor.
- Single-scenario wizard: no toggle rendered (anchor absent), Back/Next focus management still works, arrow keys inside radios don't step the trace player.
- Northwind reveal: reader places a quadrant → left column computed by real `derive()`; right column "Not placed" + frequency-filter line (makerMatrix null path).

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```
node --check system/factory-intake.mjs
node --check system/instance.mjs
node -e "Promise.all([import('./system/factory-intake.mjs'),import('./system/instance.mjs')]).then(()=>console.log('imports ok'))"
```

### Level 2: Content gates
```
node scenarios/validate.mjs                 # 3 packages ✓ + verdicts differ
node agent-layer/gen-loc-summary.mjs        # regen, then:
node tooling/drift-check.mjs                # syntax→tokens→asrc→loc→graph→handoff→scenarios→traces, all ✓
node tooling/token-lint.mjs
```

### Level 3: Visual regression (docker — local macOS runs false-fail on Linux baselines)
```
cd tooling/visual-regression && npm run update:docker   # after rm'ing the two approach baselines
# then a plain docker test run must pass with ONLY the approach baselines changed
```

### Level 4: Manual validation
```
npx serve .   # then walk /instance.html and /factory.html per Testing Strategy above
```
AC checklist on /instance.html: honest labels present (fictional + speculative + sources) · wizard pre-seeded with reasoning shown · overrides re-derive live · embedded trace replays with its committed label · no network calls beyond same-origin committed files (DevTools Network tab) · no input leaves the browser.

### Level 5: Optional
```
cd worker && npx wrangler dev   # GET http://127.0.0.1:8787/api/northwind/items → 200
open scenarios/check.html via serve — northwind row appears, collections answer (static or worker)
```

---

## ACCEPTANCE CRITERIA

- [ ] `/instance.html` renders from `scenarios/northwind/` — a fictional test package exercising the real-provenance labeling path (#39's shape): fictional notice + speculative notice + sources all present. (AC1)
- [ ] Wizard is the shared `factory-intake.mjs`, configured not forked: pre-seeded from `axes`, bounds from `RULESET`, curated answers + reasoning visible, overrides re-derive live through `derive.mjs`. (AC1)
- [ ] `traces/pack-seed-verdant.jsonl` replays in the embedded player, label "Real run, curated for length" rendered by the player, station copy honestly noting the demo embeds Verdant's run. (AC1)
- [ ] No live LLM at view time; vanilla constraint holds (no framework/bundler/deps); no public upload surface. (AC2)
- [ ] The screenshots-in-replayed-trace call (default yes on an unlisted link) is recorded in the page + module headers. (AC3)
- [ ] Prototype/handoff slots render config links or honest placeholders.
- [ ] `factory.html` rendering is unchanged (VR baselines pass untouched).
- [ ] All Level 1–3 commands pass; CI (drift-check + token-lint + VR) green.
- [ ] CLAUDE.md map + scenarios/README.md updated; loc-summary + two approach baselines regenerated in the same PR.

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (1–9)
- [ ] Each task's VALIDATE ran clean immediately after the task
- [ ] Both pages manually walked, edge cases exercised
- [ ] Only intended baselines changed (2× approach)
- [ ] Commit message cites the ticket (`… (epic #38, #43)`); PR body links `Closes #43`
- [ ] Branch: `feature/private-instance-shell` off current `main` (shared-worktree rule: verify branch right before committing, stage by explicit path)

---

## OPEN QUESTIONS / ASSUMPTIONS

1. **Demo package carries `speculativeNotice`+`sources` as extra keys on a `fictional: true` package** (validator ignores extras; compiler can't emit this combination; hand-authoring packages is the verdant/fieldwork precedent). The alternative — committing a `fictional: false` package — is forbidden by the privacy boundary and README. *Assumption made; flagged because it adds a documented convention to scenarios/README.md.*
2. **Per-axis wizard reasoning mapping** (frequency ← target-behavior.reasoning; other three get formula lines pointing at the curated-intake section): the compiled package carries reasoning per *question*, not per *axis* — this is the honest bridge without changing #39's format. If the owner prefers extending the brief head with per-axis reasoning instead, that's a #39-format amendment — out of scope here, easy follow-up.
3. **Page name/route `instance.html`**: the epic leaves private-instance route naming to spike 2 (#44). The in-repo template name is not that decision; #44 can rename/copy at build time.
4. **No VR coverage for the new page** (matches `/agentic-ui-study` precedent; fetch-driven content). If wanted later: add a PAGES entry waiting on `body[data-instance="ready"]` + `[data-trace="ready"]`.
5. **Analytics on the demo instance**: included (parity with shipped pages; `trackFactoryDriven` fires on first wizard drive — it IS the factory being driven). Trivial to drop if the owner disagrees.

## NOTES (open canvas)

**Why the seam is a marker + exported init, not a second wizard**: the epic's §Other pins "the wizard is shared, not forked." The only fork-free options were (a) parameterized init with a stand-down marker, (b) a `window.*` config global read by the wizard itself. (b) couples the shared module to a page-specific global and makes load order fragile; (a) keeps factory.html's path literally untouched (no marker → today's code path) and makes the shell's takeover explicit in its own markup. The auto-init guard is one `querySelector` — behavior-preserving by construction, and the docker VR run proves it.

**Why the wizard config is built in instance.mjs, not fetched by factory-intake**: factory-intake deliberately inlines its scenarios (10.2's call — fetch-failure and VR-race modes). The shell page IS fetch-driven (it's not in the VR set and degrades honestly per surface), so the fetch lives in instance.mjs and factory-intake stays synchronous and fetch-free.

**Honesty audit of the demo surface** (the sweep renderScenarioChrome's comment mandates — "no surface may claim an artifact that doesn't exist"):
- fictional notice: present, first, names the demo purpose.
- speculative notice: rendered exactly as a real instance would, directly under the fictional label; sources are visibly example.com.
- trace station: player renders the committed label; copy states the demo embeds *Verdant's* run, not Northwind's.
- capability badges: "Runs now" only on the wizard + generated-result stations (derive() genuinely runs); trace station uses the replay register; link slots claim nothing.

**Rejected: registering the demo package out-of-registry** (validate-by-path only): CI would never validate it; extending drift-check for one package is heavier than registering. Registering costs 1 index entry + 2 worker lines and buys per-PR validation + check.html coverage. Verdict-differ unaffected.

**Rejected: promoting `fw-*`/`trace-*` CSS to portfolio.css**: touching shared CSS risks the six IA baselines for zero functional gain; the repo's own precedent (factory.html porting trace.html's block verbatim, with a comment) is duplication-with-provenance. Promotion becomes attractive when #44 stamps many instances — note for that ticket.

**Sizing sanity vs the ticket's ~600–1000 estimate**: instance.html ~350–450 (markup + ported CSS), instance.mjs ~250–320, package ~250, factory-intake delta ~±30 — inside the band.

## AMENDMENTS

<!-- Append-only after first approval/execution. -->
