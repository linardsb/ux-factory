# PR #83 review — feat: v3 static spine skeleton + band organisms + region contract (#71)

**Branch**: `feature/v3-spine-skeleton` → `main` · **Head**: `0750d3d` · **State**: OPEN
**Verdict**: ✅ **Approve (advisory)** — 0 Critical · 0 High · **1 Medium** · 0 Low. Validation green, matches intent.

> Solo repo: `/piv-review-pr` can't formally `--approve` the author's own PR, so this verdict is posted as a review **comment**. A human makes the merge call.

> **Update (fixed):** the 1 Medium below was folded in via `piv-fix-review-findings` — commit `9031514` (`.peak-ethics summary` now `display:flex`+`min-height:44px`; `index-neutral`/`index-saulera` baselines regenerated; drift-check + token-lint green). The carried-forward real Safari/Chrome eyeball remains a human pre-merge task.

## Summary
First ticket of the v3 portfolio epic (#70). Rebuilds `index.html` into the five-beat static product-demo spine (hero + five band-chaptered `#beat-*`/`#verify` sections), authors the token-only CSS organisms it wears in `system/portfolio.css` (`.band`/`.band--dark`, `.beat-numeral`, `.row-list`, `.close-card`, a `.btn-arrow` refinement), and shrinks the top nav (drops Factory). Static / at-rest only — no live JS; the at-rest state is both the no-JS/reduced-motion first paint and the VR baseline (`rest == final`). The committed mount-id region contract is the coordination artifact tickets #72–#77 fill as disjoint regions.

The four deviations in `.claude/reports/v3-spine-skeleton-report.md` are documented intentional decisions, not issues. I independently verified the load-bearing one (below).

## Issues by severity

### 🟡 Medium — undersized hit area on the peak-beat ethics disclosure
`system/portfolio.css` (`.peak-ethics summary`, ~L1173) · element at `index.html:168`

The `<summary>` toggle ships with `cursor: pointer` + `font-size: var(--type-body)` (16px) and **no padding, no `min-height`, no `display:flex`**. With `line-height ~1.5`, the effective clickable box is a single ~24px line on the common case where the text doesn't wrap (the 1fr peak-side column at ≥900px, and full-width when the stage collapses <900px). That meets CRAFT's "≥24px minimum anywhere" floor but **fails "≥44×44px on touch"** (`references/CRAFT.md:45`). It's also the *only* `<summary>` in the codebase without the fix its two siblings both apply: `.cs-acc summary` (`portfolio.css:417`, `padding:16px 18px` + flex) and `.lp-faq .faq-item summary` (`components.css:881`, `padding:24px 28px` + flex) — both comfortably clear 44px.

**Severity rationale**: touch-target a11y gap + inconsistent with the codebase's own established pattern for the identical element. Not blocking (one-line fix; the disclosure is keyboard-operable and works no-JS).

**Fix** (matches the `min-height:44px` idiom already used by `.row-item` in this same block):
```css
.peak-ethics summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  min-height: 44px;
  font-family: var(--font-display);
  font-size: var(--type-body);
  color: var(--color-fg-on-inverse-strong);
  list-style: none;
}
```
⚠️ This changes the peak beat's at-rest height, so it will churn `index-neutral` + `index-saulera` — regenerate those two baselines (`cd tooling/visual-regression && npm run update:docker`) in the same change to keep CI green.

## Carried forward (author's own documented pending item — not a code defect)
**Real Safari + real Chrome eyeball before merge** (report deviation #4). Verified only in Playwright/Chromium (headless). Layout uses `min-width:0` on every wide grid/flex child, so the recorded single-engine VR blindspot (real Safari/Chrome grid blowout the bundled Chromium missed) is pre-handled — but a human should still open `/` in both real engines at the #82 milestone.

## Validation

| Gate | Result |
|------|--------|
| `node tooling/token-lint.mjs` | ✅ 61 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✅ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ 3 groups — no drift |
| VR (report) | ✅ 18/18 pass; 14 baselines regenerated under Docker |
| Every `var(--…)` in the new CSS declared in `tokens.contract.css` | ✅ all 40 referenced tokens exist (token-lint doesn't check portfolio.css for *undeclared*, so verified by hand) |
| Routes/anchors resolve | ✅ `/factory` `/roundtrip` `/agentic-ui-study` `/approach` `/work` `/contact` `/handoff.html` + all `#beat-*` |

## What's good
- **Token discipline is clean.** Zero raw colour literals in the new block; all 40 `var(--…)` references resolve to real contract declarations. Structural px/grid/% only, per the file's stated licence.
- **Scope is exactly as described** — only `index.html`, `portfolio.css` (one selector-list line + one tail block), `client.neutral.config.js`, generated `loc-summary.json`, VR baselines. `components.css` untouched, no new tokens, superseded home-only classes left in place.
- **Honesty contract handled well.** No `.capability.live` chips on any placeholder. The peak beat tags "Fictional product," states "An illustrative still," and hedges the ethics gate ("The live build runs it on your screen"). No fabricated contrast decimals.
- **`rest == final` verified.** No new `@keyframes`/`animation` — only hover/focus `transition`s. The global `.btn-arrow` refinement changes only the transition curve + hover distance; at rest it stays `translateX(0)`, so no baseline churn beyond the nav (independently confirmed against the base rule).
- **Deviation crux verified independently**: grepped every non-index captured page (approach/factory/roundtrip/work/contact/404) — no new organism class (including a bare `.band`) appears anywhere but `index.html`, so the 13 non-index baseline regens are genuinely pure nav-churn from the config shrink.
- **Accessibility craft strong**: decorative elements `aria-hidden` (`brand-swatch`, `peak-screen-dot`, `row-item-arrow`), native `<details>` disclosure, clean h1 → five h2 hierarchy, global `:focus-visible` outline + a dark-band override for the summary, `min-width:0` on every wide flex/grid child. (The one gap is the Medium above.)
- **Region-contract comment is a genuine interface** — a fresh #73 session could place the wizard from it alone. Empty `.pill`/`.meta` hero spans are the established grammar reused verbatim from every other page.

## Recommendation
**Approve (advisory) — merge-ready as-is.** No Critical/High issues; all validation green; the rebuild matches the ticket's intent and the honesty/token/rest==final contracts. The one Medium (peak-ethics hit area) is a non-blocking a11y polish and is **acceptable as a fast-follow** — it doesn't gate this merge. Whenever it's fixed (here or in a follow-up), regenerate the 2 `index` baselines in the same change and re-run `drift-check`/`token-lint`, since `min-height:44px` grows the peak beat. Also do the real-browser (Safari + Chrome) eyeball before the #82 merge milestone. If you'd rather fold the fix in now: `piv-fix-review-findings` on this report.
