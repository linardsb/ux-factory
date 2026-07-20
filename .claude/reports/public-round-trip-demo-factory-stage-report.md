# Implementation Report — Public round-trip demo: Factory derivation stage + honest diff display (#42)

**Plan**: `.claude/plans/public-round-trip-demo-factory-stage.md`
**Branch**: `feature/public-round-trip-demo` (worktree `ux-factory-wt-42`, cut from current `origin/main` `1fb8833`)
**Status**: COMPLETE — `Closes #42`

## Summary
Added the un-numbered **Verdant derivation round-trip** exhibit to `factory.html`, immediately after Station 02. It replays #40's committed evidence at view time: the two vision-input screenshots, the honest proposed-vs-ground-truth diff (accent OKLab ΔE, human gate, verdict, 5 accent-family / 10 neutrals / type / spacing / radius / 12 WCAG pairs), and the real recorded derivation run in the four PIV acts. All numbers render from one committed source (`tooling/round-trip/verdant.diff.json`); the qualitative honesty (fictional notice, caveat, provisional label) is static HTML that survives a JS/fetch failure. A ~4-line focus-scoping fix to `system/trace-player.mjs` makes arrow-key stepping apply only to the focused player, so the round-trip and Station-05 players coexist. No live LLM at view time; the exhibit degrades to honest error cards.

## Tasks completed
- `system/derivation-roundtrip.mjs` (**CREATE**) — `prepareDiff` (pure boundary validation, Node-runnable) + `renderRoundTrip` (textContent-only diff DOM, one data-driven swatch exception) + `errorCard` + self-mounting `init()`; relative import of `parseTrace`/`renderTracePlayer`.
- `system/trace-player.mjs` (**UPDATE**) — keydown listener moved `document` → `root`; root made a focusable, labelled `role=group`; header comment reworded; `destroy()` now removes the root listener.
- `system/portfolio.css` (**UPDATE**) — token-only `rt-*` classes (metric/gate/verdict panels, swatches, diff tables, AA mini-sample, caveat, inputs grid) + `.trace-player:focus-visible`.
- `factory.html` (**UPDATE**) — `<section id="round-trip">` (static framing + `#roundtrip-diff`/`#roundtrip-player` mounts + two input figures + nugget + raw-evidence link); `#round-trip` added to `scroll-margin-top`; module `<script>`; Station-02 discovery link; corrected the trace-mount comment my fix falsified. "Five stations" copy untouched.
- `tooling/visual-regression/visual.spec.mjs` (**UPDATE**) — `factory` `waitReady` extended with `#roundtrip-diff[data-diff="ready"]` + `#roundtrip-player[data-trace="ready"]`.
- `tooling/visual-regression/baselines/factory-{neutral,saulera}.png` (**UPDATE**) — regenerated in Docker; only these two changed.
- `CLAUDE.md` + `docs/epics/per-company-brief.architecture.md` (**UPDATE**) — architecture-map line added; "public round-trip demo stage + diff display" struck from Missing pieces.

## Tests added
No unit suite exists (CLAUDE.md: "run the surface you touched"). Verification performed:
- **Level 1 (syntax)**: `node --check` on both `.mjs` — pass.
- **Level 2 (pure fn)**: `prepareDiff(verdant.diff.json)` → accent ΔE `0.05`, verdict `agent-proposed, human-approved`, correction `#2f7a4d`; throws `verdant.diff.json: missing accent` on `{}`.
- **Node render smoke** (DOM stub): `renderRoundTrip` builds the full exhibit with no runtime error — 46 inline swatch backgrounds, all content assertions, `destroy()` clears the container.
- **Level 4 (real browser, Docker Chromium, 25 checks — all pass)**: exhibit renders (diff+trace ready); ΔE/verdict/gate/neutrals-excluded/12-WCAG shown; static chip carries "provisional" while the JS verdict panel does not; caveat co-equal above the metric; **two-player keyboard independence** (focused player steps, unfocused stays — both directions); **graceful failure** (diff blocked → error card, `data-diff` not set, static caveat survives, trace still mounts); deep-link lands at top=89px; **trace.html** still steps after focus and is inert unfocused; **scenario-toggle isolation** (toggling to Fieldwork fires — Station-1 notice changes — yet the exhibit's fictional notice stays Verdant and the chip stays provisional; the `factory-intake.mjs` handler is id-scoped, not a class sweep); exhibit re-skins under the **saulera** pack (swatches keep Verdant's data-greens — the colours being measured are invariant to the page pack, an honesty requirement).
- **Visual tone (both packs, human-reviewed)**: element screenshots under neutral + saulera confirm calm-colour (ΔE in FG, not celebrated green), the caveat co-equal above the metric, exhaustive data behind collapsed accordions, and the real trace's "Real run, curated for length" label rendered verbatim.
- **Level 3 (token discipline)**: no new colour literals in `portfolio.css`/`components.css` (swatch/sample colours are inline-from-data in JS).

## Validation results
- Level 1 syntax: **PASS** (2/2)
- Level 2 pure function: **PASS**
- Node render smoke: **PASS** (19/19 assertions)
- Level 4 browser edge cases: **PASS** (25/25 — incl. scenario-toggle isolation + both-packs render)
- Level 5 visual-regression: **PASS** — `npm run update:docker` → 16/16 tests green; **only** `factory-neutral.png` + `factory-saulera.png` regenerated (renders under both packs).
- Portal boot (Level 3 optional): **skipped** — the portal is untouched (no portal file changed; `trace-player.mjs`'s exports/behaviour are unchanged apart from keydown scope), so per CLAUDE.md this is not a surface touched.

## Deviations from the plan
1. **Base = current `origin/main` (`1fb8833`), not the plan's `5b2a768`.** PR #52 (portfolio motion phase 2) merged after the plan was written. Branching off latest main makes this PR clean-merging. The only #42-touched file #52 changed is `portfolio.css` (+93 motion lines) — its line anchors were re-derived; `factory.html`, `trace-player.mjs`, `visual.spec.mjs`, and the pattern sources are byte-identical across the two SHAs. This is the plan's intent ("latest main").
2. **Dedicated worktree (`ux-factory-wt-42`), not `git switch` in the shared dir** — the shared working dir held uncommitted parallel-session (motion) work that must not be disturbed; matches the repo's worktree convention.
3. **Input PNGs eager-loaded (no `loading="lazy"`)** — so `page.goto(...,{waitUntil:'load'})` covers them deterministically in the VR gate, resolving the plan's Open Question #3 (input-screenshot flakiness) without a mask or extra ready handle.
4. **Motion (from #52) required no work** — confirmed the VR gate captures under `reducedMotion:'reduce'` (playwright.config.mjs) and all #52 entrance motion is `no-preference`-gated with rest-state = pre-animation; the new section is a plain `.section` like every station, so the baseline shows only the new content.
5. **`.rt-excluded` (neutrals) uses muted opacity, not strikethrough** — the plan said "mirror `.gated`" (strikethrough), but strikethrough on data rows reads as "deleted/failed"; muted better conveys "reported, excluded from the verdict." The plan's "muted / de-emphasized" wording licenses this.
6. **WCAG rows show a live `fg-on-bg` mini-sample** (from the proposed-palette token→hex map) instead of two separate swatches — more faithfully visualizes the actual contrast; pass/fail is still carried by the "✓ pass" text, never colour alone.
7. **Added the optional `notProposed` accordion** (plan flagged it optional; simple 10-item list, squarely shown-not-asserted). Skipped the `groundTruth.axes` accordion to hold scope.
8. **Fixed `factory.html:431` comment** — the trace-player keydown-scoping change falsified its "document-level listener would stack" justification (advisor guidance; within the surgical-changes rule since my own change caused it).
9. **Added one Station-02 inline discovery link** — the plan's sanctioned alternative to a `.cs-jump` nav chip, since the exhibit is deliberately un-numbered and not in the nav.

## Issues encountered
- The base moved from `5b2a768` → `1fb8833` mid-session (PR #52 merged during `git fetch`). Handled by re-validating every line/API/artifact reference against the true current-main blobs before writing (the "confidence 9.5" pre-flight). No blockers.
- Nothing under `traces/` or `tooling/round-trip/` was regenerated or hand-edited — the honesty contract's view-time-consumption-only rule held (git status confirms).
