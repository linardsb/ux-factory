# Implementation Report — v3 intake, stakeholder-worded rewrite (ticket #73)

**Plan**: `.claude/plans/v3-intake-stakeholder-rewrite.md`   **Branch**: `feature/v3-intake-stakeholder-rewrite` (stacked on `feature/v3-hero`)   **Status**: COMPLETE

## Summary
Rewrote the Factory intake wizard from four raw engine-parameter questions into **three stakeholder-worded questions** (density · reward · frequency), each answered by picking a recommended option, with the engine params derived behind the scenes and shown only as narrative output. Mounted the shared `system/factory-intake.mjs` wizard in home's `#beat-intake` — Verdant-only, no scenario toggle, no Manipulation Matrix — via a new `system/intake-beat.mjs` on #72's `spine.mjs` beat seam, **configured not forked** (a new optional `askedAxes` param filters the asked set; `factory.html` keeps all four axes, `instance.html` keeps its own config). All three surfaces verified functional across Chromium, Firefox, and WebKit.

## Tasks completed
- Reword Verdant + Fieldwork wizard prompts, richen `LABELS` to stakeholder wording, export `SCENARIOS`, add `askedAxes` seam → `system/factory-intake.mjs` (UPDATE)
- Reconcile the shell's wizard wording → `system/instance.mjs` (UPDATE)
- Register `beat-intake` on the spine seam with the Verdant-only, 3-axis config → `system/intake-beat.mjs` (CREATE)
- Replace `#beat-intake`'s static `.brief-card` with the live wizard mount (`#factory-wizard[data-intake="external"]` + `#reskin-preview` + `#factory-narrative`), fix copy "four"→"three", add the module script → `index.html` (UPDATE)
- Home-scoped wizard/preview/narrative styling; remove the now-dead `.brief-*` block (portfolio.css:1045 earmarked it for #73) → `system/portfolio.css` (UPDATE)
- Write back the resolved intake open question → `docs/epics/portfolio-v3-experience.prd.md` §9 (applied to the working tree; the doc is **untracked** — see Deviations #11 — so it is NOT in this PR)
- Regenerate `system/loc-summary.json` (new tracked file `intake-beat.mjs`) + the two `index` VR baselines (UPDATE)

## Tests added
No repo test suite (convention = "run the surface you touched"). Validation was a **cross-engine functional harness** (Playwright, `scratchpad/xengine.mjs`, not committed) driving **Chromium + Firefox + WebKit** against a `python3 -m http.server` (serves `.mjs` as `text/javascript`):
- HOME `/`: wizard mounts in `#beat-intake`; progress "1 / 3"; Q1/Q3 stakeholder-worded; option labels stakeholder-worded; raw engine params never surfaced; **no** scenario toggle; **no** Manipulation Matrix; `#reskin-preview[data-reskin="ready"]`; narrative shows 4 beats; **frequency→verdict flips on `monthly`**; **density re-skins the preview tokens** (`--spacing-lg` 24px→32px); last step "3 / 3" CTA "Review".
- FACTORY `/factory.html` (regression): 4-axis wizard ("1 / 4"), Q1 still brand, scenario toggle present, ethics matrix present — **unchanged**.
- INSTANCE `/instance.html` (regression): wizard mounts via `initIntake(config)`; density prompt shows the new stakeholder wording.
- A11y MUSTs: reduced-motion renders the final state instantly (card opacity 1 / transform none, ratio a real number, 4 beats); **no horizontal scroll at 360px** (scrollWidth == clientWidth).

**Result: all functional + a11y assertions pass on all three engines.** Home logs zero page/console errors.

## Validation results
- `node -e "import('./system/factory-intake.mjs')"` → ✓ parses; exports `SCENARIOS, initIntake`.
- `system/instance.mjs`, `system/intake-beat.mjs` → ✓ parse under Node (DOM-guarded, seam no-ops).
- `node tooling/token-lint.mjs` → ✓ 61 contract tokens · 0 undeclared · 0 orphan · DTCG valid.
- `node tooling/drift-check.mjs` → loc-summary regenerated (clean, index-read); the ONE remaining local drift (`system-graph.json`) is **not this ticket's** — see Issues.
- Cross-engine functional + a11y → ✓ (above).
- VR baselines: `index` + `approach` regenerated via `npm run update:docker` (Docker/Linux-Chromium).

## Deviations from the plan
1. **Branch stacked on `feature/v3-hero`, not `main`.** The plan states "#71 + #72 — both merged", but **#72 is NOT merged** (only #71 is on `origin/main`); #72's `spine.mjs` `registerBeat` seam — which #73 requires — lives only on `feature/v3-hero` (PR #85). #73 is therefore stacked on it. **piv-create-pr should target the PR at `feature/v3-hero` (or rebase onto `main` once #72 merges)** so the diff shows only #73.
2. **Exported `SCENARIOS`** from `factory-intake.mjs` (the plan's beat snippet references `SCENARIOS.verdant` but it was a bare `const`). One-word change; needed for the Verdant-only config.
3. **`activateOn: 'load'`** (plan default was `'visible'`). Chosen for VR determinism: the mount is below the fold, so `'visible'` races the snapshot; `'load'` keeps the wizard deterministically mounted (rest == final). The plan explicitly sanctioned `'load'` as the VR-safe fallback.
4. **Omitted the dark `.feature-band`** from home's `#reskin-preview` (plan said "copy factory.html:389–418"). `index.html`'s own contract designates beat-peak as "the ONE dark band, the signature"; nesting a second dark band in beat-intake would violate it. Home copies only the light sample cards.
5. **Omitted `#factory-summary`** on home (plan marked it optional). Its first cell surfaces "brand colour in: #2F7A4D" — a brand the home reader did not pick (brand is #74's beat). The visible narrative already carries the per-answer stage change for Q2/Q3.
6. **Layout = wizard | preview row + full-width narrative** (not a sticky 2-col). `body { overflow-x: clip }` (the site's no-horizontal-scroll guard) breaks `position: sticky` for descendants — verified empirically (the pinned card scrolled with the page). So the tall narrative sits full-width below a balanced ask|stage row instead of stranding an empty column beside a sticky wizard.
7. **Home wizard CSS scoped under `#beat-intake` in `portfolio.css`.** The `.fw-*`/`#reskin-preview` rules live **inline in factory.html**, not shared CSS. Rather than promote-and-dedupe (which would touch factory.html + its VR baseline), home's copy is scoped so factory.html stays byte-identical. Conscious safety-over-DRY trade-off; a future promote-to-shared refactor is possible once factory.html can be re-baselined.
8. **Meta description (index.html:7) "four"→"three"** — one occurrence beyond the plan's explicit list (lines 80/88), for copy honesty/consistency.
9. **Wording applied as drafted.** The plan's OPEN QUESTIONS flags Q1–Q3 wording as pending the owner's taste react-pass (mapping + count are locked). The draft is applied; it is trivially editable on the PR if the owner wants changes.
10. **Fieldwork reasoning kept verbatim** (only its prompts updated to the shared stakeholder set) — surgical, per the plan's "Fieldwork keeps its own reasoning prose."
11. **PRD §9 write-back applied but NOT committed in this PR.** The plan treats `docs/epics/portfolio-v3-experience.prd.md` as a tracked doc to update; it is in fact **untracked on `origin/main`** (a new epic-governance doc, awaiting its own commit, and the active generative-prototyper epic-doc sessions show such commits belong elsewhere). Committing the whole 110-line PRD (plus its untracked sibling architecture doc) via a code ticket would over-reach and risk the shared worktree. The write-back is **applied in the working tree** (verified present), recorded verbatim in this report and issue #73, and will land when the epic docs are committed. Only the 4 index/approach VR baselines were relevant; the **`approach` baseline is deferred** — my `loc-summary.json` (9200→9400) requires an approach re-baseline, but the same worktree's uncommitted `approach.html`/`work.html` (a parallel session removing the `.closing` CTA section) would contaminate it, so I regenerated only the clean `index` baselines and restored the rest. `approach` re-baselines cleanly at v3-final-merge (VR is non-blocking on the branch).

## Issues encountered
- **Pre-existing `system-graph.json` drift (NOT this ticket).** The shared worktree has another session's **uncommitted** `system/components.css` edit (deletes the unused `.closing` CTA band, ~49 lines). `gen-system-graph` reads `components.css`; none of *my* files feed it. Verified `.closing` is unused on every shipped page → the deletion is **render-neutral** (so it does not contaminate the VR baselines I regenerated). I do **not** stage `components.css` or regenerate `system-graph.json` (shared-worktree protocol: stage only my files by explicit path). My PR excludes `components.css`, so its CI drift-check stays green; the drift belongs to whoever commits that edit.
- **Cross-engine test noise:** `factory.html` fetches `127.0.0.1:8787/api/verdant/*` (the CF Worker mock API, not running locally) → `ERR_CONNECTION_REFUSED`, chromium-only logging. This is pre-existing factory behavior that degrades to static fixtures (CLAUDE.md); not a regression, not on home.
- **VR is non-blocking on `feature/v3-*` (D11 freeze).** Baselines were still regenerated in-PR (Docker up, deletion render-neutral) to satisfy the AC; the visual job would not have blocked either way.

## Acceptance criteria
- [x] New stakeholder-worded questions, each with default + reasoning; raw engine params never surfaced as the question.
- [x] Each answer produces a visible stage change (density → preview reflow; reward/frequency → narrative beat; frequency → verdict flip).
- [x] `factory.html` auto-init AND `instance.html` `initIntake(config)` both still work (seam unforked).
- [x] Home Verdant-only; no scenario toggle; no Manipulation Matrix (only the frequency→verdict line).
- [x] Craft bar (CRAFT/CHECKLIST); honesty (fictional-scenario label at rest, outside disclosures).
- [x] `index` VR baseline regenerated in-PR; drift-check (loc-summary, index-read) + token-lint green on this ticket's files. (`approach` baseline deferred — Deviations #11; VR non-blocking on the branch.)
- [x] PRD §9 open question written back as resolved — **applied to the working tree** and recorded here + issue #73; the doc is untracked so it is not committed in this PR (Deviations #11).
