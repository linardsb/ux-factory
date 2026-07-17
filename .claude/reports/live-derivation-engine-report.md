# Implementation Report — Live derivation engine (epic #1, ticket #3)

**Plan**: `.claude/plans/live-derivation-engine.md`   **Branch**: `feature/live-derivation-engine`   **Status**: COMPLETE

## Summary

Built the view-time deterministic derivation engine (architecture approach B): four DOM-free, zero-dep ES modules beside `system/site.js` that turn bounded intake answers (brand color · density · Hooked reward type · frequency) into a complete 46-token value set with WCAG AA checks, component-pattern selection, and an ethics-gate verdict — plus a bare browser harness and a Node spike runner. Spike 2 (folded into this ticket) ran over 8 brand colors × 11 declared WCAG pairs: **88/88 pass AA (100%), decision rule met → full live derivation**, recorded on [issue #3](https://github.com/linardsb/ux-factory/issues/3#issuecomment-5003376019). Hand-written OKLCH math (Ottosson matrices, verified against source) — no culori fallback needed.

## Tasks completed

- Color-space math (hex ↔ sRGB ↔ OKLab ↔ OKLCH, gamut clamp) → `system/oklch.mjs` (CREATE)
- WCAG luminance / contrast / pair checker → `system/wcag.mjs` (CREATE)
- Versioned ruleset artifact v1.0.0 (palette recipe, scales, patterns, ethics, pairs, statics) → `system/derive.rules.mjs` (CREATE)
- Engine orchestrator with honesty `notes` → `system/derive.mjs` (CREATE)
- Bare live harness (controls → derive → inline custom properties on `<html>`) → `derive.html` (CREATE)
- Spike 2 runner (anchors · completeness · 8-color matrix · decision rule, exit-coded) → `tooling/spike-palette.mjs` (CREATE)
- Spike outcome posted to issue #3 before close (ticket-mandated gate) → [comment](https://github.com/linardsb/ux-factory/issues/3#issuecomment-5003376019)
- Architecture-map line for the engine → `CLAUDE.md` (UPDATE, one entry)
- Recipe-tuning + stylesheet amendments appended → `.claude/plans/live-derivation-engine.md` (UPDATE)

## Tests added

No test suite by project design ("no suite, no linter" — CLAUDE.md). Executable verification lives in `tooling/spike-palette.mjs` (committed, rerunnable, exit-coded):
- **Stage 1 — math anchors**: OKLab reference values (red L 0.6280/a 0.2249/b 0.1258; white 1,0,0), 6 hex round-trips, gamut-clamp containment, WCAG boundary pairs (21.0; #767676 passes 4.54 vs #777777 fails 4.48). ✓
- **Stage 2 — completeness**: emitted 46 tokens ⊇ 46 DTCG contract leaves (guards future contract growth). ✓
- **Stage 3/4 — spike matrix + decision rule**: 88/88 AA. ✓

## Validation results

- Syntax: `node --check` on all 5 new .mjs files — pass.
- Unit one-liners (per plan): oklch anchors, wcag anchors, ruleset deep-frozen/versioned, derive happy path (46 tokens, 11/11 AA, zero notes on the control blue), hostile-yellow negotiation (3 notes, 11/11 AA), gating, matrix quadrant, throw paths — all pass.
- Integration: `node tooling/spike-palette.mjs` exit 0, 100%. `node agent-layer/gen-token-css.mjs --check` — no drift (token pipeline untouched).
- Manual (real browser, Chrome via agent-browser): `derive.html` loads with **zero console errors**; live re-skin on every control; browser-computed accent for `#ffd400` is `#846d00` and for `#e11d48` is `#dd1645` — **byte-identical to the Node runs** (same modules, no parallel code paths); notes narrate negotiations with values; pattern gating renders "rejected: frequency-filter"; Reset restores the neutral pack; the dark inverse band re-skins. `index.html` regression-checked: renders neutral (`#2563eb`), no console errors.

## Deviations from the plan

All recorded as plan AMENDMENTS (dated 2026-07-17); the substantive one was requested ("address all to fix from 8.5/10 to 10/10") and done *before* the spike, not as patching after it:

1. **Palette recipe tuned from first-principles math** — plan values could not clear their own pairs: `fg-muted` l 0.55→0.51 (0.55 yields ~4.38:1 on the surface; even the hand-set neutral pack fails that pair at ~4.34), `bg-surface` 0.965→0.97, and the static accent clamp replaced with clamp + **adaptive contrast floor** (darken until ≥4.5:1 vs the derived surface — one rule that also secures accent-on-white and white-on-accent). This is why the spike hit 100% rather than hovering at the 95% line.
2. **`accent/bg-inverse` pair dropped (11 pairs, not 12)** — mathematically unsatisfiable for a single accent token (needs luminance ≤0.183 and ≥0.141 at once); components never set accent text on dark. Exclusion documented in the ruleset itself.
3. **`derive.html` loads `portfolio.css`** (plan said skip): the hero/card-kicker/`.hl` classes it uses are styled there; matches `index.html`'s shipped stylesheet order.
4. Cosmetic: engine emits 46 tokens (the plan's prose said "40+"; 46 is the actual contract count — stage-2 check is exact).

## Issues encountered

- Branch state: session started on `feature/scenario-packages-worker-mock-api` (ticket #4's pointer, 0 commits ahead of main) — created `feature/live-derivation-engine` from the same tip instead, so the tickets don't share a PR. Pre-existing uncommitted `README.md` edit (1 line, not mine) left unstaged; `tooling/` contains unrelated untracked `mcp/` scripts — only `tooling/spike-palette.mjs` should be staged.
- agent-browser evals share one global scope: a redeclared `const` in a second eval throws a SyntaxError that output-redirects can hide (one interaction silently no-oped; caught by reading back computed styles, re-run cleanly).

## Ready for the next step

All plan acceptance criteria met; spike outcome recorded on the issue. Next: `piv-commit` (stage the 6 new files + `CLAUDE.md` + plan + this report; body includes `Closes #3`), then `piv-create-pr`, then `piv-review-pr`.
