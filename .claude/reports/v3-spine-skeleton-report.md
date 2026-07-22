# Implementation Report — v3 static spine skeleton + band system (#71 · P1a)

**Plan**: `.claude/plans/v3-spine-skeleton.md`   **Branch**: `feature/v3-spine-skeleton`   **Status**: COMPLETE

## Summary
Rebuilt `index.html` from the bento "anatomy" landing into the five-beat static
product-demo spine (PRD D6: Home IS the demo), authored the token-only CSS organisms it
wears in `system/portfolio.css` (`.band`/`.band--dark`, `.beat-numeral`, `.row-list`,
`.close-card`, the I7 `.btn-arrow` refinement), and shrank the top nav to the v3 IA. This
is the static, at-rest layer only — no live JS. The committed mount-id region contract
(six `#beat-*`/`#verify` sections + a self-sufficient comment) is the coordination artifact
the parallel Wave-2/3 tickets (#72–#77) fill as disjoint regions. The at-rest end state is
both the no-JS / reduced-motion first paint and the VR baseline (`rest == final`).

## Tasks completed
- Task 1 · plan-before-code (portfolio-design two-pass; concept + anti-slop + signature stated in-session) → advisor-reviewed before writing.
- Task 2 · region-contract comment (exact `#beat-*`/`#verify` ids, verbatim) → `index.html` (top of `<main>`).
- Task 3 · five static beats (hero billboard · intake preview · brand empty-state · dark peak still · close-card · verify row-list) → `index.html` (UPDATE).
- Task 4 · v3 spine organisms, token-only → `system/portfolio.css` (UPDATE: new headed block + one-line extension of the dark-band grain selector).
- Task 5 · nav shrink to Home · Approach · Work + Contact CTA (Factory dropped from nav) → `system/client.neutral.config.js` (UPDATE).
- Task 6 · `system/loc-summary.json` regenerated after `git add` (staged-blob read) → runtime 8800→9100, pages 3500→3600 (UPDATE).
- Task 7 · VR baselines regenerated under Docker (playwright v1.61.1-jammy) → 14 baselines (UPDATE, see Deviations).
- Task 8 · final self-audit (CHECKLIST) → report written; ready for piv-commit.

## Tests added
None — repo rule is "run the surface you touched," no unit/integration suite (do not invent one).

## Validation results
- `node tooling/token-lint.mjs` → ✓ 61 contract tokens · 0 undeclared · 0 orphan · DTCG valid.
- `node agent-layer/gen-loc-summary.mjs --check` → ✓ no drift (regenerated after `git add`).
- `node tooling/drift-check.mjs` → ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces.
- VR: `cd tooling/visual-regression && npm run update:docker` → 18/18 pass; 14 baselines re-generated (Linux/Chromium).
- Height budget: `scrollHeight` **4436px** (neutral) / **4518px** (saulera) at 1280px — well under the ~7500px ceiling.
- Cross-cut render (Playwright/Chromium): neutral + saulera × 1280px + 360px — **zero horizontal overflow** at either width in both packs; organisms re-skin identically under saulera (calm ground + amber accent + deep-teal peak).
- **No-JS first paint (AC #1, the ticket's thesis)**: rendered with `javaScriptEnabled: false` — `site.js` never runs, so no injected header/footer/dock/ruler; all six beats render complete and visually final with **no blank or mid-animation region** and no JS-only-filled area. The chrome-less first paint reads as the intended chaptered demo.
- Class-collision grep: none of the new organism classes (`beat-*`, `band--dark`, `brief-card`, `brand-try`, `peak-*`, `close-card`, `row-*`, `wcag-*`) appear on any VR-captured page but `index.html` → the 13 non-index baselines are pure nav churn (the greedy `band` match on factory was `feature-band`/`fw-band-inner`/prose only).
- Honesty: 0 `.capability.live` chip elements on placeholders (the only "capability" text is the region-contract comment's own honesty instruction); peak framed as an illustrative still, fictional-product tag visible at rest, no fabricated contrast decimals.
- Colour discipline: 0 raw colour literals in the new `portfolio.css` block (colour is token-only).

## Deviations from the plan
1. **VR: 14 baselines regenerated, not the 4 (index+approach) the plan named.** The nav shrink
   (Task 5) removes the Factory item from the header that `site.js` injects on **every** IA page,
   so all seven IA pages' headers churn at rest (index also rebuilt; approach also moved its
   loc numbers). Regenerated: index · approach · factory · roundtrip · work · contact · 404,
   each × neutral + saulera. The two proto pages have no injected nav and were correctly left
   untouched. This is the correct, in-scope consequence of the nav shrink; the plan's file list
   under-counted it. All 14 are legitimate at-rest changes (spot-checked factory-neutral: only
   the nav differs, page otherwise intact).
2. **Numeral map: hero carries no oversized numeral; the five demo stations carry 01–05.** The
   hero is the I1 billboard cover (one idea stated large — a competing numeral would break
   decisiveness); the oversized I4 numerals count the five things the visitor *does* — brief (01)
   · your brand (02) · **it builds (03, the peak)** · you keep it (04) · verify (05) — a genuinely
   ordered pipeline, satisfying "01–05" exactly and I4's "numbering must encode a real sequence."
   The pasted region comment still labels the *sections* Beat 1/2a/2b/3/4/5 (the ids are the
   coordination contract, not the numerals); peak/close/verify land on 03/04/05 either way.
   Advisor-confirmed before building.
3. **Only the peak is dark, not strict light/dark alternation.** SKILL ("one signature per
   surface") + PRD ("nothing competes with this moment") govern over a literal reading of
   "alternate `.band`/`.band--dark`." Q4 chapter pacing is delivered by whitespace steps + inner
   `bg-surface` cards + the numerals + the single near-black spike (plus the existing dark footer
   bookend), verified by eyeball for monotony across the three leading light beats.
   Advisor-confirmed before building.
4. **Real Safari + real Chrome eyeball is PENDING (headless environment).** Eyeballed in
   Playwright/Chromium at two widths × two packs (renders attached to the session). The recorded
   VR single-engine blindspot means a human should still open `/` in real Safari and Chrome before
   this branch merges at the #82 milestone. Layout uses flex/grid with `min-width:0` on every wide
   child (the known Safari trap is pre-handled).

## Issues encountered
- None blocking. Note: the fixed appearance-dock toggle (`dock.mjs`, `top:50%`, ≥1100px) floats in
  the container's right margin over the peak region in the full-page render; geometry confirms it
  sits clear of the receipts content (dock at x≈1224–1264, content ends ≈1216). Existing chrome on
  every page, captured in every baseline — not introduced by #71.

## PRD open question closed
**Hero at-rest contract.** The exact final state VR captures == the no-JS / reduced-motion first
paint: the `.page-hero` billboard with the `.hl` underline in its rest (solid-border) state, the
five numbered beats complete and visually final. #72's choreography animates *to* this state and
must not change it.
