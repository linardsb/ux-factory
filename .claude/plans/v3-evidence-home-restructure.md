# Feature: P3a — Evidence home restructure (factory.html)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing. Pay special attention to naming of existing mounts, tokens, and modules — import from the right files, preserve the exact ids the engine modules read.

## Feature Description

Re-home the portfolio's evidence archive one disclosure deep behind the v3 spine. In v3, `index.html` (the spine) now owns the live product-demo (hero → intake → your-brand → peak → close). `factory.html` sheds the duplicated live wizard and becomes the **evidence home** — the deep layer a hiring panel's technical reader opens to verify the claims: real agent-run **traces**, the **round-trip** fidelity diff (which carries the committed WCAG pairs), the measured **system graph**, plus links out to the **annotated source** and the **agentic study**. Presented as a **tabbed evidence viewer** (a sliding tab strip using a new `tab-glide` motion token), reworked to the v3 craft bar — not v2 styling behind new doors. The ticket also absorbs two salvaged fixes from the closed #69 overhaul: the study-preview stacking bug (`agentic-ui-study.html`) and `handoff.html`'s missing site chrome.

## User Story

As a **hiring manager / technical panel member evaluating a senior UX-engineer**,
I want to **open one deep page and verify every claim the demo made — the real agent runs, the measured fidelity, the token graph — presented as cleanly as the demo itself**,
So that **I can confirm the work is genuinely senior and honest, not a decorated archive I have to decode (the v1/v2 failure).**

## Problem Statement

The v3 spine moved the live demo to Home (`index.html`). `factory.html` still carries a full duplicate of that live wizard (intake + generation stations, ethics gate, scenario toggle) *plus* the evidence layers, all in v2 styling behind a sticky station rail. Left as-is it would be (a) a redundant second live demo, violating D6/D8, and (b) exactly the "v2 styling behind new doors" the ticket forbids. The evidence — traces, round-trip diff, system graph — is currently buried inside closed `<details>` at the bottom of a long scroll, reading as an archive rather than a verify surface.

## Solution Statement

Rebuild `factory.html` as a purpose-built **evidence home**: drop the live wizard and its scripts, elevate the three committed-replay evidence engines (trace player, round-trip diff, system graph) into a **tabbed evidence viewer** with a `tab-glide`-animated active indicator, keep prototypes + handoff as minimal sections until #80 relocates them to Work, and surface annotated-source + the study as outbound links. Every engine mount id and every inbound `#anchor` is accounted for in an explicit **disposition table** (lives-here / re-homed-to-spine / retired-non-silently / #80's), so "every mount still resolves" is verified, not hand-waved. Add the `tab-glide` motion token (spring-derived) and consume it. Absorb the two #69 fixes on their own pages.

## Out of Scope / Non-Goals

- **Not building Work (#80).** Prototypes + handoff stay minimally on factory this ticket; #80 relocates them to the Work proof index. Don't restructure `work.html`.
- **Not moving annotated-source off approach.html.** It's named in the evidence list but physically lives on `approach.html` (#80's file). This ticket **links** to it; the physical move is coordinated with #80.
- **Not rebuilding the study or the round-trip pages.** `agentic-ui-study.html`, `roundtrip.html`, `handoff.html` keep their URLs (architecture: "deep pages keep URLs"). This ticket only *links* the study/round-trip and only *fixes* the two #69 defects on study/handoff.
- **Not adding a live derive engine for "WCAG tables."** WCAG evidence = the committed round-trip pairs (`derivation-roundtrip.mjs`). No second live `derive()` run — that would drag the engine back in and break VR-stability.
- **Not adding icon-morph / skeleton-to-content tokens.** Those two of the three planned motion tokens belong to #72/#75. Only `tab-glide` lands here (with its consumer).
- **Not re-adding factory to the top nav.** Nav shrink to Home · Approach · Work + Contact CTA is already done by #71 (`client.neutral.config.js`). This ticket verifies, doesn't change it.
- **Not adding handoff.html / agentic-ui-study.html to the VR gate.** They aren't gated today; keeping them ungated is not this ticket's call. Real-browser eyeball instead.

## Feature Metadata

**Feature Type**: Refactor (restructure) + 2 bug fixes
**Estimated Complexity**: Medium-High (~700–1,200 LOC incl. baseline; large surgical CSS/HTML removal + one new token + a small tab controller)
**Primary Systems Affected**: `factory.html` (restructure), `agentic-ui-study.html` (#69 fix), `handoff.html` (#69 fix), `system/tokens.source.json` (+`tab-glide`, regen chain), `tooling/visual-regression/visual.spec.mjs` (factory wait handles), factory VR baselines (both packs).
**Dependencies**: none external. Depends on #71 (done — nav + spine region contract) and mirrors the settled spine (#72/#73).

## Related Work

**Implements**: [#78 — P3a Evidence home restructure](https://github.com/linardsb/ux-factory/issues/78)   ·   **Epic**: [#70 — portfolio v3](https://github.com/linardsb/ux-factory/issues/70) · architecture `docs/epics/portfolio-v3-experience.architecture.md` (Evidence re-homing = (b) re-home everything, nothing floats; deep pages keep URLs)

**Back-references** (inherits decisions from):

- `docs/epics/portfolio-v3-experience.prd.md` §6.1 beat 5 (D8) — evidence layers re-homed one disclosure deep, nothing floats/orphaned.
- `docs/epics/portfolio-v3-experience.architecture.md` — "re-hosting is safe (getElementById mounts), verified list in the v2 handover"; VR non-blocking on `feature/v3-*` (D11).
- `.claude/plans/ux-overhaul-handover.md` line 41 — **the authoritative engine-mount handover list**; §"Known gaps" — the two #69 fixes (study preview stacking, handoff chrome) + tab-glide specced-not-built.
- `index.html` (the settled spine, #71/#72/#73) — the band/beat-numeral/row-list craft vocabulary to mirror; hosts the re-homed live-demo mounts.

**Forward-references**:

- #80 (P3c) — relocates prototypes + handoff from factory to Work; coordinates the annotated-source home. (append follow-up notes here)
- #82 (P4) — full generator + baseline regen, VR re-block at final merge.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ THESE BEFORE IMPLEMENTING

- `factory.html` (whole file, 699 LOC) — Why: the restructure target. Current structure: page-hero → `.factory-rail` (sticky station rail) → `.factory-stage` grid (`#intake` wizard + `#generation` live re-skin/WCAG/ethics) → `#round-trip` → `#prototypes` → `#handoff` → `#agents` (trace player) → `#shape` (system graph) → CTA. Inline `<style>` lines 26-315 (much of it wizard/rail/ethics — to be removed). Inline scripts lines 604-697 (hash-opens-details, rail scroll-spy, trace mount, graph mount).
- `index.html` (whole file, 315 LOC) — Why: the settled v3 spine. **Mirror its craft vocabulary**: `.band` / `.band--dark`, `.beat-head` + `.beat-numeral` + `.beat-kicker` + `.beat-title` + `.beat-lead`, `.row-list` (lines 80-303). Confirms which live-demo mounts are re-homed here (`#factory-wizard` L100, `#reskin-preview` L108, `#factory-narrative` L136, `#fw-scenario-notice` L95 — **only these 4**).
- `.claude/plans/ux-overhaul-handover.md` line 41 — Why: **the handover mount list** the acceptance regression-checks against: `#factory-wizard #reskin-preview #factory-narrative #scenario-toggle #ethics-gate #fw-scenario-notice #handoff-note #factory-summary #agents-player #roundtrip-diff #system-graph` + `.factory-embed-figure[data-scenario]` pair.
- `system/factory-intake.mjs` (lines 213-223 mount reads; line 675 auto-init guard) — Why: this module reads `#factory-wizard #reskin-preview #factory-narrative #scenario-toggle #ethics-gate #fw-scenario-notice #handoff-note #factory-summary`. **Line 675 auto-inits `initIntake()` unless `#factory-wizard[data-intake="external"]` exists** — so leaving this script tag on factory *after* removing the wizard fires it against null mounts. **This script MUST be removed from factory.html.**
- `system/derivation-roundtrip.mjs` (line 288 `#roundtrip-diff`, line 296 `#roundtrip-player` null-guarded) — Why: renders the round-trip tab's diff (ΔE · human gate · verdict · **12 WCAG pairs** = the "WCAG tables"). Stays on factory. Sets `data-diff="ready"` on `#roundtrip-diff` (VR wait handle).
- `system/system-graph.mjs` (mounts `#system-graph`, sets `data-graph="ready"`) — Why: the graph tab. Stays. Emits `.sg-*` classes (styled in factory's inline `<style>` L299-314).
- `system/trace-player.mjs` (`parseTrace`, `renderTracePlayer`) — Why: the traces tab. Mounted by factory's inline module (L650-672) onto `#agents-player`, sets `data-trace="ready"`. Stays.
- `tooling/visual-regression/visual.spec.mjs` (line 41, the factory entry) — Why: **must be updated.** Current `waitReady` includes `#reskin-preview[data-reskin]` (set by the wizard being removed) — that handle will hang forever. Also has `mask: '.factory-embed-figure:not([hidden]) .factory-embed'`.
- `system/client.neutral.config.js` (lines 22-31) — Why: confirms nav is **already** the final v3 IA (Factory dropped, footer keeps `/factory`). No change needed; verify only.
- `agentic-ui-study.html` (line 47, `.study-preview--insight-panel`) — Why: **#69 fix 1.** `display:flex; flex-direction:column; gap; max-width:320px` → tiles stack in a narrow column inside the full-width dashed frame (JSON column was removed in #69's commit a347bfc). Fix mirrors `.study-preview--summary-strip` (L45-46: flex-wrap + children `flex:1 1 0; min-width`).
- `system/agentic-study.mjs` (lines 118-121) — Why: confirms `previewMount.className = study-preview--${picked.slot}`; the `insight-panel` slot renders composition tiles (e.g. `proto/compositions/operational-state.json`). The fix must let those tiles use the frame width.
- `handoff.html` (lines 1-137: head + `<body>` at 137, no site.js/config/data-page) — Why: **#69 fix 2.** No site chrome. Mirror `roundtrip.html` L88 (`<body data-page=…>`) + L183-184 (`client.neutral.config.js` then `site.js`, in that order).
- `roundtrip.html` (line 88 `<body data-page="factory">`, lines 183-184 chrome scripts) — Why: the correct chrome-clone pattern to mirror for handoff; also holds the one inbound hash link `href="/factory#round-trip"` (L176) — the anchor to preserve.

### New Files to Create

- **None required.** The tab controller is a small inline `<script>` in `factory.html` (replacing the removed rail scroll-spy inline script — matches the page's established inline-view-glue pattern; keeps surface minimal per Simplicity First). *(Alternative, if preferred for reuse: `system/evidence-tabs.mjs` beside `site.js`. Not recommended — factory-only, ~60 lines, and the page already uses inline scripts for its scroll-spy/hash helpers.)*

### Patterns to Follow

**Craft vocabulary (mirror `index.html`):** band chapters, oversized `.beat-numeral`, `.beat-head`/`.beat-kicker`/`.beat-title`/`.beat-lead`. The evidence home is one band-chaptered page whose centerpiece band holds the tabbed viewer.

**Token-only CSS (hard rule):** every colour/space/radius/type via `var(--…)`; grid/%/fixed sizes are structural literals (factory's existing `<style>` header states this justification — page-unique layout, not promoted to components.css). No brand values, no literals for themed properties.

**Motion tokens (mirror commit c7cf564 / the 5 spring tokens):** new token enters **both groups** of `system/tokens.source.json`, then the full regen chain. Motion lives inside `@media (prefers-reduced-motion: no-preference)` with **rest == final** (the pill's resting position under the active tab is its at-rest/VR state). Reduced-motion → instant.

**Honesty + accessibility:** tabs degrade with no JS to **all panels visible** (progressive enhancement — evidence is never hidden without JS). Capability chips / fictional labels stay visible at rest, outside disclosures. Keyboard: proper `role="tablist"`/`role="tab"`/`aria-selected`/arrow-key nav; the active indicator is not the only signal (aria-selected + text weight too).

**VR-stability:** engine mounts sit inside tab panels that are `hidden`/`display:none` when inactive but **still attached** — the async modules fetch + set `data-*="ready"` regardless of visibility, and the gate waits on `state:'attached'`. The baseline captures the **default (Traces) tab**; other panels hidden. `min-width:0` on any wide grid/flex child (the graph SVG scroll wrapper `.sg-scroll` already has it — keep; add to any new wide code/tab child).

---

## IMPLEMENTATION PLAN

### Phase 1: Mount disposition + VR wait-handle audit (do this FIRST — it IS the acceptance test)

**The core deliverable.** Before writing markup, produce the disposition table below and treat it as the spec. Every id in the handover list (line 41) + every current `#anchor` on factory gets a verdict. "Silent break = dead evidence" — retiring a mount whose feature moved is fine **only** if nothing reads it unguarded on a running page *and* it's recorded here + in the PR note.

| id / selector | Reader module | v3 disposition | Verified where |
| --- | --- | --- | --- |
| `#factory-wizard` | factory-intake | **re-homed to spine** | `index.html:100` (`data-intake="external"`) |
| `#reskin-preview` | factory-intake | **re-homed to spine** | `index.html:108` |
| `#factory-narrative` | factory-intake | **re-homed to spine** | `index.html:136` |
| `#fw-scenario-notice` | factory-intake | **re-homed to spine** | `index.html:95` |
| `#scenario-toggle` | factory-intake | **retired (non-silent)** — spine intake is Verdant-only, no toggle; factory-intake not loaded on factory | disposition table + PR note |
| `#ethics-gate` | factory-intake | **retired (non-silent)** — peak ethics is #75's `.peak-ethics` on the spine; factory-intake not loaded | table + PR note |
| `#factory-summary` | factory-intake | **retired (non-silent)** — the 4-cell live strip belonged to the live demo; factory-intake not loaded | table + PR note |
| `#handoff-note` | factory-intake (sets text) | **kept as static prose** on factory's handoff section (no module writes it now); id retained | factory.html handoff section |
| `#agents-player` | trace-player (inline) | **lives on factory** — Traces tab | factory.html |
| `#roundtrip-diff` | derivation-roundtrip | **lives on factory** — Round-trip tab (carries WCAG pairs) | factory.html (+ also on roundtrip.html) |
| `#system-graph` | system-graph | **lives on factory** — Graph tab | factory.html |
| `.factory-embed-figure[data-scenario]` pair | (was factory-intake toggle) | **kept minimally** on factory's prototypes section until #80 | factory.html |
| `#intake` (anchor) | — | **retired (non-silent)** — live demo is spine `#beat-intake`; no inbound links | grep confirms only bare `/factory` + `/factory#round-trip` inbound |
| `#generation` (anchor) | — | **retired (non-silent)** — as above | grep |
| `#round-trip` (anchor) | — | **preserved** — becomes the Round-trip tab panel id; the one live inbound hash link (`roundtrip.html:176`) | must activate its tab on hash |
| `#shape` (anchor) | — | **preserved** — Graph tab panel id | — |
| `#agents` (anchor) | — | **preserved** — Traces tab panel id | — |
| `#prototypes` (anchor) | — | **kept** — prototypes section retained | — |
| `#handoff` (anchor) | — | **kept** — handoff section retained | — |

**Tasks:**
- Confirm the table against the live files (grep each id). If any retired id is read *unguarded* by a module that still loads on a running page, it is NOT safe to retire — re-home or keep it instead.
- Decide the tabbed viewer's three panels carry ids `#agents` (Traces, default), `#round-trip` (Round-trip), `#shape` (Graph) — preserving the handover anchors as tab-panel ids.

### Phase 2: The `tab-glide` motion token + regen chain

**Depends on:** nothing (can run first). **Independent of:** Phase 3 markup until the token is consumed.

**Tasks:**
- Add `--motion-tab-glide` to **both groups** of `system/tokens.source.json` (mirror how the 5 spring tokens sit in both). It's a duration (spring-derived, ~240–280ms — final value a craft call under the `portfolio-design` skill), consumed with an existing spring ease (`--motion-ease-settle`).
- Run the regen chain (see VALIDATION). The token MUST be consumed by the tab pill or `token-lint` fails as orphan — that IS the "else not added" enforcement.

### Phase 3: factory.html restructure — the evidence home

**Depends on:** Phase 1 (the disposition table) + Phase 2 (the token, for the pill CSS).

**Tasks:**
- **Rewrite the hero** to evidence framing (humanizer rules, no em-dashes/aphorisms): the page is where you verify the demo's claims — real runs, measured numbers, the token graph. Drop the "four answers" demo copy.
- **Remove** the live-demo scaffolding: `.factory-rail` + its scroll-spy inline script; the `.factory-stage` grid with `#intake`/`#generation`; `#reskin-preview`, `#factory-summary`, `#ethics-gate`, `#scenario-toggle`, `#factory-narrative`, `#fw-scenario-notice`; and all their CSS (fw-*, factory-rail, factory-stage, ethics/matrix/toggle/reveal, checks) from the inline `<style>`.
- **Remove** `<script type="module" src="/system/factory-intake.mjs">` (critical — the L675 guard else fires on null).
- **Build the tabbed evidence viewer** (mirror the spine's band vocabulary) — one centerpiece band with a `role="tablist"` (Traces · Round-trip · Graph), a `tab-glide`-animated active pill, and three `role="tabpanel"` panels carrying `#agents` / `#round-trip` / `#shape`, each wrapping the existing engine mount (`#agents-player`, `#roundtrip-diff`, `#system-graph`) + its honest label/capability chip. Keep the round-trip "full exhibit → /roundtrip" link. Default tab = Traces.
- **Tab controller** (inline `<script>`, replacing the removed rail scroll-spy): wire tab click + arrow-key nav + `aria-selected`; hide inactive panels only when JS runs (no-JS = all visible); position the pill under the active tab; on load + `hashchange`, if `location.hash` matches a panel id (`#round-trip`/`#shape`/`#agents`) activate that tab (preserves the `/factory#round-trip` inbound). Adapt the existing hash-opens-details helper into hash-activates-tab (keep details-open for any remaining nested disclosures).
- **Keep minimally** (until #80): the `#prototypes` section (both `.factory-embed-figure` iframes — with the scenario toggle gone, either show both or keep Verdant visible + link Fieldwork; recommend showing both, lightly re-crafted) and the `#handoff` section (static `#handoff-note` prose + the two handoff buttons).
- **Surface as outbound links** (not embeds): the annotated source (`/approach`) and the agentic study (`/agentic-ui-study`) — a `.row-list` of "verify further" pointers, matching the spine's verify row-list idiom.
- Keep the trace + graph inline mount modules (L650-697) and the tokens/components CSS links, `site.js`, `portfolio.js`, `analytics.mjs`, `dock.mjs`, `derivation-roundtrip.mjs`.
- Run `references/CHECKLIST.md` (portfolio-design skill); `min-width:0` on wide grid/flex children (graph SVG, any code block).

### Phase 4: The two #69 fixes (independent pages)

**Independent of:** Phases 1-3 (different files). Can run in parallel.

**Tasks:**
- **`agentic-ui-study.html:47`** — fix `.study-preview--insight-panel`: replace `flex-direction:column; max-width:320px` with a wrapping layout mirroring `.study-preview--summary-strip` (flex-wrap + children `flex:1 1 <~220px>; min-width`), so insight-panel tiles fill the dashed frame instead of stacking in a narrow column. Verify visually against the insight-panel composition.
- **`handoff.html`** — add site chrome: set `<body data-page="work">` (handoff belongs to the Work/proof index in v3 IA; unmatched-but-harmless if you prefer none), and before `</body>` add `<script src="/system/client.neutral.config.js"></script>` then `<script src="/system/site.js"></script>` (config BEFORE site.js — hard order), mirroring `roundtrip.html:183-184`. site.js prepends header + appends footer (no slots present).

### Phase 5: VR spec + baseline regen

**Depends on:** Phase 3 (factory markup final).

**Tasks:**
- **Update `visual.spec.mjs` line 41** (factory entry): remove `#reskin-preview[data-reskin]` from `waitReady` (wizard gone → handle would hang). Keep `#agents-player[data-trace="ready"]`, `#roundtrip-diff[data-diff="ready"]`, `#system-graph[data-graph="ready"]` (all still fire inside hidden tab panels — attached). Keep the `.factory-embed-figure` `mask` (prototypes retained). If both proto figures are shown, the `:not([hidden])` mask still covers both.
- Regen the factory baseline (both packs): `cd tooling/visual-regression && npm run update:docker` (needs Docker). `rm` the factory PNGs first if the change is sub-perceptual (it won't be — large restructure). VR is non-blocking on `feature/v3-*` (D11) but regen keeps #82's re-block clean.
- handoff.html + agentic-ui-study.html are **not** VR-gated — no baseline; real-browser eyeball only.

---

## STEP-BY-STEP TASKS

### 1. AUDIT: build the mount disposition table

- **IMPLEMENT**: Grep each handover-list id + each current factory `#anchor`; fill the Phase-1 table; confirm every "retired" id has no unguarded reader on a running page.
- **PATTERN**: handover list `.claude/plans/ux-overhaul-handover.md:41`; spine mounts `index.html:95,100,108,136`.
- **VALIDATE**: `grep -rn 'getElementById\|href="/factory' system/*.mjs *.html` — every kept/re-homed id resolves on some page; every retired id has zero unguarded readers.
- **SATISFIES**: AC "every prior `#` anchor + engine mount id still resolves."

### 2. ADD `--motion-tab-glide` to tokens.source.json

- **IMPLEMENT**: Add the token to both groups; value a spring-derived duration (~240–280ms).
- **PATTERN**: the 5 spring tokens (commit c7cf564) — both groups, regen.
- **GOTCHA**: must be consumed (task 5) or `token-lint` fails as orphan.
- **VALIDATE**: `node agent-layer/gen-token-css.mjs && grep -c 'motion-tab-glide' system/tokens.contract.css system/tokens.neutral.css`
- **SATISFIES**: AC "tab-glide added and consumed if used."

### 3. REGEN the token chain

- **IMPLEMENT**: run gen-token-css → gen-handoff → gen-pack-bundle → gen-system-graph.
- **VALIDATE**: `node agent-layer/gen-token-css.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs && node agent-layer/gen-system-graph.mjs && node tooling/drift-check.mjs`
- **GOTCHA**: skip gen-handoff/gen-pack-bundle and CI `verify` drift-check goes red (blocking, gates main).
- **SATISFIES**: AC "(+ regen)".

### 4. REWRITE factory.html hero + REMOVE live-demo scaffolding & CSS

- **IMPLEMENT**: evidence-framed hero copy; delete rail + `.factory-stage` grid + `#intake`/`#generation` + reskin/summary/ethics/toggle/narrative/scenario-notice nodes and their inline CSS; delete the rail scroll-spy inline script.
- **PATTERN**: spine band vocabulary `index.html:80-260`.
- **GOTCHA**: humanizer rules (no em-dashes/aphorisms in visible copy); calm-colour rule.
- **VALIDATE**: serve + load `/factory.html`, no console errors, no orphaned wizard markup.
- **SATISFIES**: AC "presents every evidence layer to the v3 craft bar"; "not v2 styling behind new doors."

### 5. REMOVE factory-intake.mjs script + BUILD the tabbed viewer + pill (consumes tab-glide)

- **IMPLEMENT**: delete the `factory-intake.mjs` `<script>`; build `role=tablist` + 3 tabpanels (`#agents`/`#round-trip`/`#shape`) wrapping `#agents-player`/`#roundtrip-diff`/`#system-graph`; pill CSS uses `transition: transform var(--motion-tab-glide) var(--motion-ease-settle)` inside `prefers-reduced-motion: no-preference`.
- **PATTERN**: motion discipline `factory.html:244-297` (rest==final, reduced-motion instant).
- **GOTCHA**: `factory-intake.mjs:675` auto-inits on null if left in; pill rest position under default tab == VR state; panels `display:none` when inactive but stay attached (mounts still fetch + set `data-*=ready`).
- **VALIDATE**: serve; click each tab (pill glides), keyboard arrows switch, reduced-motion instant; DevTools: all three mounts have `data-*="ready"`.
- **SATISFIES**: AC "tab-glide consumed"; "every mount resolves."

### 6. TAB controller inline script + hash activation

- **IMPLEMENT**: inline `<script>` (replaces rail scroll-spy): tab click/arrow nav, `aria-selected`, hide inactive panels only under JS, pill positioning, activate-tab-from-hash on load + `hashchange`.
- **PATTERN**: the existing hash-opens-details helper `factory.html:604-616` — adapt to hash-activates-tab.
- **GOTCHA**: no-JS must leave all panels visible (evidence never hidden without JS); `/factory#round-trip` must activate the Round-trip tab.
- **VALIDATE**: load `/factory.html#round-trip` → Round-trip tab active + scrolled into view; disable JS → all panels visible.
- **SATISFIES**: AC "every `#` anchor still resolves" (the one inbound hash link).

### 7. KEEP prototypes + handoff sections minimally; ADD outbound verify links

- **IMPLEMENT**: retain `#prototypes` (both embed figures, lightly re-crafted) + `#handoff` (static `#handoff-note` + buttons); add a `.row-list` linking annotated source (`/approach`) + the study (`/agentic-ui-study`).
- **PATTERN**: spine verify row-list `index.html:255-301`.
- **GOTCHA**: don't build Work (#80's job); note the handoff/proto relocation is #80's in the PR.
- **VALIDATE**: links resolve; `.factory-embed-figure[data-scenario]` pair present.
- **SATISFIES**: AC "no orphaned/floating surfaces" (nothing lives nowhere in the interim).

### 8. FIX #69/1 — study insight-panel stacking (`agentic-ui-study.html:47`)

- **IMPLEMENT**: replace `flex-direction:column; max-width:320px` with wrap layout mirroring `.study-preview--summary-strip`.
- **PATTERN**: `agentic-ui-study.html:45-46`.
- **VALIDATE**: serve `/agentic-ui-study.html`, insight-panel tiles fill the dashed frame (no narrow column). Real-browser eyeball.
- **SATISFIES**: AC "study-preview tiles no longer stack in a narrow column."

### 9. FIX #69/2 — handoff.html site chrome

- **IMPLEMENT**: `<body data-page="work">`; add config + site.js before `</body>` (config first).
- **PATTERN**: `roundtrip.html:88,183-184`.
- **VALIDATE**: serve `/handoff.html`, header + footer render; nav + footer correct.
- **SATISFIES**: AC "handoff.html carries site chrome."

### 10. UPDATE visual.spec.mjs + REGEN factory baseline

- **IMPLEMENT**: drop `#reskin-preview[data-reskin]` from factory `waitReady`; keep the other three + the mask. `cd tooling/visual-regression && npm run update:docker`.
- **PATTERN**: `visual.spec.mjs:41`.
- **GOTCHA**: stale wait handle hangs the gate; Docker required; `rm` PNGs if sub-perceptual.
- **VALIDATE**: `git status` shows updated `factory-neutral.png` + `factory-saulera.png`; spec has no `data-reskin`.
- **SATISFIES**: AC "real Safari/Chrome grid check" + clean #82 re-block.

### 11. FINAL: full generator sweep + clean tree

- **IMPLEMENT**: rerun all `agent-layer/gen-*.mjs`; `git status` clean.
- **VALIDATE**: `node tooling/drift-check.mjs && node tooling/token-lint.mjs` → green; `git status` clean.
- **SATISFIES**: COMPLETION checklist.

---

## TESTING STRATEGY

No unit/integration suite in this repo (CLAUDE.md: "run the surface you touched"). Validation = generators print their lines + pages render + drift/lint green + cross-browser eyeball.

### "Unit"-level (generators)
- `node agent-layer/gen-token-css.mjs` / `gen-handoff.mjs` / `gen-pack-bundle.mjs` / `gen-system-graph.mjs` each print their `✓`.
- `node tooling/drift-check.mjs` + `node tooling/token-lint.mjs` green (tab-glide consumed, not orphan).

### "Integration"-level (rendered surfaces)
- `/factory.html`: tabs switch (mouse + keyboard), pill glides, all three engine mounts reach `data-*="ready"`, `#round-trip` deep-link activates the tab, no-JS shows all panels, reduced-motion instant.
- `/agentic-ui-study.html` + `/handoff.html`: the two fixes render.

### Edge Cases
- **No-JS**: all evidence panels visible (progressive enhancement).
- **`prefers-reduced-motion`**: pill snaps instantly; no entrance churn.
- **`/factory#round-trip`** inbound (from roundtrip.html): Round-trip tab active + scrolled clear of any sticky chrome.
- **Blocked/slow module**: a failed trace/graph/diff fetch shows its error card (honesty — the VR handle only sets on success, so a real failure fails loud).
- **VR default tab**: baseline captures Traces active with the other two panels hidden-but-attached.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style / token discipline
```
node tooling/token-lint.mjs
```

### Level 2: Generators + drift
```
node agent-layer/gen-token-css.mjs && node agent-layer/gen-handoff.mjs && node agent-layer/gen-pack-bundle.mjs && node agent-layer/gen-system-graph.mjs && node tooling/drift-check.mjs
```

### Level 3: Rendered surfaces
```
npx serve .    # then load /factory.html, /factory.html#round-trip, /agentic-ui-study.html, /handoff.html
```
Cross-browser (memory: cross-engine-motion-verify) — real Safari + Chrome: tab glide, grid at wide code/graph blocks (min-width:0), no dropped frames.

### Level 4: Manual
- Tabs: click + arrow keys + `aria-selected`; pill under active tab; reduced-motion instant; no-JS all-visible.
- `git status` clean after all generators.

### Level 5: VR (non-blocking on this branch)
```
cd tooling/visual-regression && npm run update:docker
```
Only `factory-neutral.png` + `factory-saulera.png` should change. Confirm no `#reskin-preview[data-reskin]` remains in the spec.

---

## ACCEPTANCE CRITERIA

- [ ] `factory.html` presents every evidence layer (traces · round-trip diff/WCAG pairs · system graph · annotated-source & study links) to the v3 craft bar — tabbed viewer, band vocabulary, not v2 styling behind new doors.
- [ ] Every prior `#` anchor + engine mount id resolves per the disposition table; the one inbound hash link (`/factory#round-trip`) activates its tab. Retirements are non-silent (table + PR note).
- [ ] Nav reflects the final v3 IA (verified: already set by #71); no orphaned/floating surfaces.
- [ ] `tab-glide` token added to both groups, consumed by the pill, regen chain run; `token-lint` green.
- [ ] #69 fix 1: study insight-panel tiles no longer stack in a narrow column.
- [ ] #69 fix 2: `handoff.html` carries site chrome (header + footer).
- [ ] Craft bar §6.4 self-audit; real Safari/Chrome grid check (min-width:0 on wide children).
- [ ] `visual.spec.mjs` factory wait handles updated; factory baselines regenerated (both packs); `drift-check` + `token-lint` green; `git status` clean.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order; each validation passed.
- [ ] Disposition table filled + verified; retirements recorded in the PR body.
- [ ] `factory-intake.mjs` script removed from factory.html (L675 guard can't misfire).
- [ ] Full generator sweep clean (`git status` clean).
- [ ] Cross-browser eyeball (Safari + Chrome) done; no grid blowout.
- [ ] Branch `feature/v3-evidence-home`; VR baselines regen'd in-PR.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Assumptions:**
- The evidence home = **tabbed viewer** (owner-chosen) → `tab-glide` is used and therefore added. If the redesign ends up not using tabs, the token is not added (token-lint enforces).
- Prototypes + handoff **stay minimally on factory** until #80 (owner-chosen), to avoid a "lives nowhere" gap. #80 relocates them to Work.
- "WCAG tables" = the committed round-trip WCAG pairs (`derivation-roundtrip.mjs`), **not** a new live derive.
- annotated-source is **linked** (stays on approach.html, #80's file), not physically moved this ticket.
- `handoff.html` uses `data-page="work"` — harmless if it matches no active nav item; swap to none if the highlight is unwanted.

**Questions (defaults chosen; escalate only if the owner disagrees):**
- With the scenario toggle retired, should the Prototypes section show **both** proto iframes or Verdant-only + a Fieldwork link? Default: show both (simplest; no toggle needed).
- Is the tab controller acceptable as an inline script, or should it be `system/evidence-tabs.mjs`? Default: inline (matches the page's existing scroll-spy/hash inline-script pattern, minimal surface).

## NOTES (open canvas)

**Why shed the wizard (not keep it):** PRD §6.1 beat 5 + architecture ("re-home everything, nothing floats") settle that the spine owns beats 2–3; a second live wizard on factory would be the exact "v2 styling behind new doors" the ticket forbids, and would double-load `factory-intake.mjs`. The advisor confirmed this is the plain reading; "preserve every anchor" is a guardrail against *silent* breaks, not a mandate to keep dead demo mounts. Interpretation A (pure evidence home) chosen.

**The one factual trap that shaped the plan:** only **4** of the 8 live-demo mounts are actually re-homed on the spine (`#factory-wizard`, `#reskin-preview`, `#factory-narrative`, `#fw-scenario-notice`). `#scenario-toggle`, `#ethics-gate`, `#factory-summary` are **not** anywhere on the spine — so "resolves site-wide" does not cover them; they are *retired non-silently* (their feature moved / changed shape). This is why the disposition table is Phase 1 and the acceptance test, not an afterthought.

**VR reasoning:** tabs hide inactive panels under JS, but the async engine modules fetch on module-load regardless of visibility and set `data-*="ready"` on attached (hidden) nodes — the gate waits on `state:'attached'`, and `toHaveScreenshot` disables animations + captures the default (Traces) tab. So the tabbed viewer is VR-stable as long as the wait handles are corrected (drop `data-reskin`). Only factory is gated; handoff/study aren't, so their fixes need eyeball not baselines.

**Inbound-link surface is tiny:** site-wide, the only hash deep-link into factory is `roundtrip.html:176 → /factory#round-trip`. `work.html`, `index.html`, `instance.html` all link bare `/factory`. So "preserve every anchor" reduces in practice to: keep `#round-trip` working (as a tab) and record the retirements.

## AMENDMENTS

- (none — created 2026-07-24)
