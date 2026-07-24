# Implementation Report — P3a Evidence home restructure (factory.html)

**Plan**: `.claude/plans/v3-evidence-home-restructure.md`   **Branch**: `feature/v3-evidence-home`   **Status**: COMPLETE

## Summary
Rebuilt `factory.html` as the v3 **evidence home**: dropped the duplicated live-demo wizard (now owned by the spine, `index.html`) and its scripts, and elevated the three committed-replay evidence engines — the recorded agent-run **traces**, the **round-trip** fidelity diff (which carries the 12 WCAG contrast pairs), and the measured **system graph** — into a tabbed evidence viewer with a spring-derived sliding pill (new `--motion-tab-glide` token). Prototypes + handoff stay minimally until #80; annotated-source and the agentic study are surfaced as outbound links. Also absorbed the two salvaged #69 fixes on their own pages (study insight-panel stacking, handoff.html missing site chrome).

## Tasks completed
- **Phase 1 · disposition audit** → grep-verified every handover-list id + inbound `/factory#` link. All three retired ids (`#scenario-toggle`, `#ethics-gate`, `#factory-summary`) plus `#handoff-note`/`.factory-embed-figure` are read **only** inside `factory-intake.mjs`'s `initIntake()` (guarded by a `#factory-wizard` null-return) and `instance.mjs` (different page). Removing the `factory-intake.mjs` script tag leaves zero unguarded readers on factory. Sole inbound hash link site-wide: `roundtrip.html:176 → /factory#round-trip`.
- **Phase 2 · token** → added `--motion-tab-glide` (260ms, duration) to **both** groups of `system/tokens.source.json` → `system/tokens.source.json` (UPDATE); regen chain: `gen-token-css` → `gen-handoff` → `gen-pack-bundle` → `gen-system-graph`.
- **Phase 3 · restructure** → `factory.html` (rewrite, ~700→~490 LOC): evidence-framed hero + `<title>`/`<meta>`/header-comment rewritten; removed rail + `.factory-stage` grid + all wizard/ethics/toggle nodes and their CSS; removed the `factory-intake.mjs` script; built `role="tablist"` (Traces·Round-trip·Graph) + a transform-only pill + three `role="tabpanel"`s carrying `#agents`/`#round-trip`/`#shape`; inline tab controller (click + APG arrow-key nav + hash activation, replacing both old inline scripts); kept prototypes (both figures) + handoff minimally; added a `verify-further` row-list.
- **Phase 4 · #69 fixes** → `agentic-ui-study.html` (UPDATE): `.study-preview--insight-panel` now `flex-wrap` + children `flex:1 1 220px; min-width:200px` (was `flex-direction:column; max-width:320px`). `handoff.html` (UPDATE): `<body data-page="work">` + `client.neutral.config.js` then `site.js` before `</body>`.
- **Phase 5 · VR + sweep** → `tooling/visual-regression/visual.spec.mjs` (UPDATE): dropped stale `#reskin-preview[data-reskin]` from the factory `waitReady` + rewrote the now-false comment. Regenerated both factory baselines via `npm run update:docker`. Regenerated `loc-summary.json` after staging (tracked-content trap).

## Tests added
No unit suite in this repo (CLAUDE.md: "run the surface you touched"). Verification driven with Playwright against a static server, in **Chromium and WebKit** (Safari engine):

- Factory tabbed viewer (15 behavioral checks): all three engine mounts reach `data-*="ready"` (inside hidden-but-attached panels); default = Traces with only its panel painted + pill `--ev-i=0`; click swaps panel + `aria-selected` + pill `--ev-i`; ArrowRight/wrap roving-focus nav; deep-link `/factory#round-trip` activates the Round-trip tab; **no-JS → all three panels visible**; reduced-motion → pill instant (site's `0.01ms` kill-switch); no unexpected console errors (proto-iframe Worker-refusals expected under static serve). **All pass.**
- Graph SVG (advisor's 0-width-while-hidden caution): renders 940×1372, **not collapsed**, on reveal in both Chromium and WebKit; round-trip diff content present.
- Responsive @360px: no horizontal page scroll, tablist fits (312px), tab labels not clipped — both engines.
- handoff.html: header + footer chrome inject, `data-page="work"`. study insight-panel: `flex-wrap`, no `max-width` column.
- Factory VR baseline visually inspected (neutral): final v3 nav IA, evidence hero, Traces-default pill, trace player rendered, other panels hidden — VR-correct.

## Validation results
- `node tooling/token-lint.mjs` → **✓ 62 contract tokens · 0 orphan** (pill consumes `--motion-tab-glide`; the linter scans inline HTML styles).
- `node tooling/drift-check.mjs` at my-commit-view (components.css=HEAD, my files staged) → **no `system-graph` drift, no `loc-summary` drift**; only the handoff pack shows as staged-not-yet-committed ("commit the regenerated pack" — resolves at commit, green in CI).
- Cross-engine functional (Chromium + WebKit): **all green**.

## Deviations from the plan
1. **No pipeline numerals on the evidence-home bands** (used `.beat-kicker` + `.beat-title`, dropped `.beat-numeral`). The spine numbers its bands because its pipeline is genuinely ordered; the evidence home is a set of parallel evidence layers, and two of its four bands (prototypes, handoff) are explicit minimal placeholders until #80 — numbering them as equal chapters is the "decorative numbering" the `portfolio-design` skill bans (a hard constraint that overrides the plan's stylistic "mirror the numerals"). The tabbed viewer is the unmistakable centerpiece instead. Advisor-confirmed.
2. **Tab controller is inline** (plan's recommended default), not a `system/evidence-tabs.mjs` module — matches the page's established inline scroll-spy/hash pattern, minimal surface.
3. **Engine mounts sit directly in their tab panels** (no nested `<details>`) — the tab IS the disclosure; cleaner than the old details-in-a-scroll. The hash helper still opens any `<details>` the trace player nests internally.
4. **Prototypes show both figures** (Verdant + Fieldwork), the plan's recommended default now that the scenario toggle is retired. The VR mask `:not([hidden])` covers both.
5. **`scroll-padding-top` trimmed 130px → 96px** (the sticky station rail is gone; header-only). Advisor-noted.
6. **Inter-panel margin scoped to `.ev-panel:not([hidden]) + .ev-panel:not([hidden])`** (not a bare `+`). Under JS exactly one panel is shown, so no `:not([hidden])` pair matches and the active panel takes its top gap from `.ev-panels` alone — otherwise panels 2/3 would carry a 3xl top margin the Traces panel doesn't, jumping the content a spacing tier on tab switch. The margin only fires in the no-JS stacked case, where all panels are visible. Pill alignment verified pixel-exact at all three indices (Δ=0px, pill width == tab width == 221px). Does not affect the Traces-default VR baseline (the `+` selector never targets panel 1).

## Issues encountered
**Shared-worktree contamination (handled, per the shared-worktree convention).** A parallel session has uncommitted edits to `system/components.css` (a 49-line `.closing` block deletion), `approach.html`, and `work.html`. Two generated artifacts read those files:
- `system/system-graph.json` reads `components.css`. My first regen folded in the parallel `.closing` removal (consumers 28→27). Fixed by regenerating the graph against **HEAD** `components.css` (restore → regen → restore parallel copy), so my graph carries **only** the `--motion-tab-glide` node (62 tokens, 28 consumers). Verified drift-clean when `components.css` = HEAD (my branch's actual committed state).
- The Docker VR regen re-rendered `approach` + `work` baselines (parallel visual changes). Reverted those four PNGs to HEAD; kept only `factory-{neutral,saulera}.png`.
- `loc-summary.json` reads `git show :<path>` (staged blobs), so it was regenerated **after** staging my files only — it reflects my factory shrink (pages 3600→3500, total 15000→14800) with everything else at HEAD. The `runtime` group is unchanged, and approach.html renders **only** the runtime group (verified lines 292–299), so **no approach-baseline churn**.

Staged set is exactly my 15 files; the parallel session's three files remain unstaged and untouched.

**Not done (out of scope / environment):** handoff.html + agentic-ui-study.html are not VR-gated (real-browser eyeball only, done). VR is non-blocking on `feature/v3-*` (D11); baselines regenerated to keep #82's re-block clean.

### Ready for the next step
All changes complete and validated. Next: `piv-commit` (the 15 staged files are ready), then `piv-create-pr` — **target base `feature/v3-intake-stakeholder-rewrite`, not `main`** (that branch holds the #71/#72/#73 spine this ticket builds on; targeting main would swallow it). Record the Phase-1 retirements (`#scenario-toggle`, `#ethics-gate`, `#factory-summary`, `#intake`/`#generation` anchors) in the PR body per the disposition table.
