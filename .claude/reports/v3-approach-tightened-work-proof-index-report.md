# Implementation Report — v3 Approach tightened + Work as proof index (#80)

**Plan**: `.claude/plans/v3-approach-tightened-work-proof-index.md`
**Branch**: `feature/v3-approach-work`
**Status**: COMPLETE

## Summary

Migrated the two supporting IA pages to the #71 band vocabulary at the `factory.html` supporting-page bar, closing the epic's "Approach page vs spine-section" open question with the D6 default (tight page). `approach.html` is now a tight method page (hero → method → in practice → sources), with the Loop / What-you-get / Principles sections dropped. `work.html` is rebuilt as the proof index (two runnable-demo cards → the two relocated proto embeds → the relocated handoff pack → a `.row-list` of further proof). `factory.html` gave up the `#prototypes` and `#handoff` sections it parked "until #80" and its now-unused embed styles; the iframe VR mask travelled with the embeds from `factory` to `work`.

## Tasks completed

- Branch `feature/v3-approach-work` created off the #78 tip (inherits band CSS + evidence-home form; carried the uncommitted `.closing` deletions) → git
- Approach: hero CTA `#layers`→`#method`; Method/Case/Sources converted `.section`→`.band` + `.beat-head`; `#loop`/`#value`/`#practice` deleted; inline `<style>` with `scroll-padding-top` added; light `.section` + `.hero-cta-row` close added → `approach.html` (UPDATE)
- Work: inline `<style>` (relocated `.factory-embed*` rules + scroll-padding); title/description rewritten; body rebuilt to `.page-hero` → band `#run` (2 cards) → band `#screens` (2 embeds) → band `#handoff` → band `#more` (`.row-list`) → light close → `work.html` (UPDATE / full rewrite)
- Factory: `#prototypes` + `#handoff` sections removed; `.factory-embed*` styles removed (`.factory-actions` kept — the round-trip panel uses it); `scroll-margin-top` rule trimmed; head comment updated; two rows added to `#verify-further` (`/work#screens`, `/work#handoff`) → `factory.html` (UPDATE)
- VR: iframe mask moved `factory`→`work`; explanatory comment relocated → `tooling/visual-regression/visual.spec.mjs` (UPDATE)
- `.closing` CSS removed (already in working tree, carried onto branch) → `system/components.css` (UPDATE)
- Generated artifacts regenerated (drift): `system/loc-summary.json`, `system/system-graph.json`
- Open question closed → `docs/epics/portfolio-v3-experience.architecture.md` (UPDATE)
- VR baselines regenerated via Docker (see Validation)

## Tests added

No unit/integration suite exists (project convention). Verification = drift/lint gates + headless render + reflow + VR milestone regen (below).

## Validation results

- **`node tooling/drift-check.mjs`** → ✓ (syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces)
- **`node tooling/token-lint.mjs`** → ✓ (62 contract tokens · 0 undeclared · 0 orphan · DTCG valid)
- **`node agent-layer/gen-annotated-source.mjs --check`** → ✓ (2 snippets — no drift; snippet extraction is marker-based, unaffected by the `.closing` line shift)
- **`node agent-layer/gen-loc-summary.mjs --check`** (after staging sources) → drift → regenerated → ✓ no drift
- **`node agent-layer/gen-system-graph.mjs`** → regenerated (295 edges; `.closing` was a token consumer, so its removal changed the measured graph) → drift-check ✓
- **Headless render (Chromium, hermetic :4757, Worker blocked)** → approach/work/factory all 0 real console errors; approach `#asrc[data-asrc="ready"]` fires + `#loc-proof` renders ("…38 files, about 9,300 lines…"); work shows 2 iframes + 3 row-items; factory has no `#prototypes`/`#handoff`, `#verify-further` links onward to `/work#screens` + `/work#handoff`.
- **Reflow @360px** → no horizontal page scroll on any of the three pages.
- **VR baselines (`npm run update:docker`)** → 18/18 passed; exactly the 6 expected baselines regenerated (`approach`, `factory`, `work` × `neutral` + `saulera`), no other PNG touched. `git status` confirms only those 6 PNGs + the 8 tracked source/generated files changed.

## Deviations from the plan

1. **Factory card repointed `/factory` → `/` and reworded (honesty fix).** The plan said keep the two live-demo cards verbatim (`work.html:42–65`). But #78 moved the drivable intake off `factory.html` (now the evidence home, whose own hero says "the home page builds a design system… this page holds the receipts") onto the home spine (`index.html#beat-intake`, "Start the brief"). The card's claim "you drive the intake yourself → /factory" was therefore false after #78, and `/factory` is *also* a row in the new `#more` proof index — so keeping it verbatim would ship a broken capability claim **and** double-home `/factory`. The card now points to `/` with copy matching the home spine. Card 2 (agentic study) was honest and left unchanged. This serves the plan's intent ("run the proof") better than its literal instruction; the destination was determined by where intake runs, not preference, so it was not an owner question. Scope held to this one card — no other link destinations were audited.

2. **`system-graph.json` regenerated (unanticipated cascade).** The plan named `loc-summary.json` + `annotated-source.json` as the only generated-file touchpoints and stated the `tokens.source.json` cascade was avoided. But `.closing` referenced tokens (`--color-bg-surface`, `--color-border`, `--color-accent`), so it was a consumer block in the measured token↔consumer graph; removing it drifted `system-graph.json`, which `drift-check` (blocking CI) caught. Regenerated — no token/module change, just the measured graph reflecting one fewer consumer.

3. **Approach's rendered LoC number *did* shift (9,400 → 9,300).** The plan assumed Approach's rendered runtime numbers were unaffected because the edits were "HTML only." But the `.closing` deletion is in `system/components.css`, which is in the **runtime** group that Approach renders — so its `linesApprox` dropped a rounding tier. This means the approach baselines churn at rest (not just work/factory). It is covered by the planned 6-baseline regen (approach was already in the set), so no extra action beyond noting the assumption was slightly off.

## Post-implementation: merged `origin/main` before opening the PR

The branch was based on the #78 tip (`eb23cf7`), but `origin/main` had advanced 11 commits since (notably **#74 your-brand input + derived-pack persistence**, which added `system/pack-derived.mjs`, and a `loc-summary` regen). A trial merge conflicted on `system/loc-summary.json` + the two `approach-*` baselines (both sides had regenerated them). Rather than hand a reviewer a non-mergeable PR, `origin/main` was merged into the branch and the conflicts resolved **by regeneration on the clean merged tree** (never hand-edited):

- `loc-summary.json` regenerated → runtime group is now **39 files / ~9,700 lines** (the pre-merge 38/9,300 plus #74's `pack-derived.mjs`); approach renders the merged number.
- `system-graph.json` + `annotated-source.json` regenerated; `drift-check` + `token-lint` green on the merged tree.
- Render + 360px checks re-run on the merged tree (shared `portfolio.css` came from #74) → all three pages 0 real console errors, no horizontal overflow.
- **All six** VR baselines regenerated against the merged tree (not just the two that conflicted — #74's `portfolio.css` is shared, so work/factory could shift too).

Net effect: the PR's three-dot diff stays scoped to this ticket, and the merge result is CI-green. The baseline/artifact diffs now also absorb the #74 merge.

## Issues encountered

- The static-serve headless render of `work.html` logs 6 raw console errors — all aborted requests to the absent mock Worker (`:8787`); this is the expected fixture-degradation path (the proto iframes fall back to committed static fixtures), not a regression. Filtered; 0 real errors.
- **Not done in this environment:** a real Safari + Chrome eyeball (CHECKLIST MUST). Chromium headless + 360px reflow were run and pass; the real-engine eyeball and a humanizer pass on the new prose are the remaining manual craft checks before merge.
