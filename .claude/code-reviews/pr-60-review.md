# PR #60 Review — appearance dock + pack switcher + scroll ruler

**Branch**: `feature/portfolio-phase05-dock` → `main` · **Commit**: `a3d9df6` · **State**: OPEN
**Plan**: `.claude/plans/portfolio-motion-phase05-utility-dock.md` §Phase A
**Report**: `.claude/reports/portfolio-motion-phase05-utility-dock-report.md`
**Reviewed against**: the pinned worktree at `a3d9df6` (the main working dir was mid-review being cycled through the phase-5 branches by a parallel session; the diff is `gh pr diff 60`, the tree is the isolated `dock-review` worktree — both authoritative for this PR).

## Recommendation: **APPROVE** (non-blocking Lows only)

No critical / high / medium issues. Validation is green, the load-bearing VR-safety invariant holds, security (href allowlisting) is correct, and the change matches the plan's intent. Two Low advisories and two human/CI follow-ups below — none block merge.

> **On the process**: an independent `code-reviewer` agent ran a second, fresh-eyes pass over the pinned tree; its run was twice cut short by a transient API error, but its own recorded conclusion was that it had empirically verified findings on exactly the two hardest questions below (the stacking-context/containing-block behaviour and the focus management) and was moving to *confirm* — not escalate — their severities. It surfaced nothing more severe. That converges with this review's two Lows. Verdict carried by: this pass + green CI + an advisor cross-check.

> Posted as a `--comment` review (solo repo; the author can't formally `--approve` their own PR).

## Validation

| Gate | Result | Notes |
|------|--------|-------|
| **CI `verify` job** | ✅ **PASS** | drift-check + token-lint, green on the PR (run `29774909889`, 13s) |
| **CI `visual` job** | ✅ **PASS** | full Playwright VR gate green on the PR (run `29774909889`, 41s) — the 12 regenerated baselines reproduce in the pinned container, so the ruler-fill capture is deterministic |
| `node tooling/drift-check.mjs` (local) | ✓ | Full pass on PR A's tree: `sd tokens ✓ (css·ios·android)` · syntax · token-css · annotated-source · loc-summary · handoff · scenarios · traces. (In the fresh review worktree it errors only on missing `tooling/style-dictionary/node_modules` — an env gap, not a code defect; CI `verify` above is the authority.) |
| `node tooling/token-lint.mjs` (local) | ✓ | 57 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node --check system/dock.mjs` · `pack-boot.js` | ✓ | both parse |
| VR baselines | ✓ set | exactly **12** IA PNGs changed (index/approach/factory/work/contact/404 × neutral+saulera), **0** proto PNGs — confirmed from PR file metadata, and the `visual` job above confirms they match CI. |

`mergeStateStatus: CLEAN` · `mergeable: MERGEABLE` · no review yet (this is it).

## What's done well

- **VR no-op invariant is correct** (the load-bearing one). `pack-boot.js` reads `factory-pack` in try/catch and returns unless the value is exactly `"saulera"` or `"verdant"`; with the empty localStorage every VR context has, it's a guaranteed no-op, and the page markup keeps `tokens.neutral.css` — so the harness's URL interception (`visual.spec.mjs:58`) is untouched. This is the subtle thing most likely to break, and it's right.
- **Security**: pack values are hard-allowlisted before any href interpolation in *both* the classic booter (`pack-boot.js:12`) and the module (`dock.mjs` `applyPack` / `PACK_IDS.includes`), so storage/hash content never reaches an `href` uninspected.
- **Honesty**: "Copy tokens" fetches the *current* head href, so the paste is the literal committed pack CSS; the panel notes and caption describe each pack accurately; the "DTCG source →" link target (`handoff/verdant/tokens.dtcg.json`) exists (no dead link). All three switch targets exist.
- **No `innerHTML`**; `el()` + `textContent` + `createElementNS` throughout. Guards for every crash path (missing pack link, no `<main>`, <3 sections → no ruler, clipboard rejection → "Copy failed", localStorage throw → session-only).
- **Motion discipline**: the panel entrance is a keyframe on the *discrete* `.is-open` toggle, so the reduced-motion kill-switch makes open/close truly instant and there's no continuous-rebuild restart-blank (the PR-#55 trap). The ruler fill is `@supports`-gated with a ticks-only fallback.
- **loc-summary cascade handled**: new tracked files → `loc-summary.json` regenerated (drift-check green) and the two approach baselines re-captured in-PR, exactly the documented cascade.
- Documented deviations (7) are all reasonable and correctly disclosed in the report.

## Findings

### Low 1 — Panel `z-index: 95` is inert vs page chrome; the ladder comment is factually wrong
`system/portfolio.css:790-791` (comment) · `:800` (`.dock`) · `:829` (`.dock-panel`)

`.dock` sets `transform: translateY(-50%)`. A non-`none` transform (a) creates a stacking context on its own and (b) makes `.dock` the **containing block** for its `position: fixed` descendants. `.dock-panel` is a child of `.dock`, so its `z-index: 95` is scoped *inside* `.dock` and is **inert relative to page chrome** — the panel can never actually paint above the sticky header (`z 50`), `.glossary-bubble` (`z 90`), or `.skip-link` (`z 100`). Removing/raising `.dock`'s own `z-index` would *not* free it — the `transform` alone traps it.

The comment claims the ladder is "header 50 · to-top 90 · skip-link 100 → … open panel 95 (over to-top, under skip-link)", but the real `.to-top` is `z-index: 40` (`portfolio.css:483`) and the `z-index: 90` element is `.glossary-bubble` (`portfolio.css:681`) — so the stated reasoning is doubly inaccurate.

**Consequence today: none.** The panel renders correctly because `.dock` and the panel are both viewport-centered, so positioning "relative to the 40×40 dock box" and "relative to the viewport" coincide (confirmed in-browser per the report). The only scenario where the inert z-index could ever bite is a ≥1100px-wide but very short (<~450px tall) window, where the vertically-centered panel's top edge would slide under the sticky header and be clipped — extreme and cosmetic.

**Fix**: correct the comment to describe the real ladder; optionally drop the dead `z-index: 95` from `.dock-panel` (or make the panel a `<body>` sibling of `.dock`) so the stated intent is actually achievable if geometry ever changes. Non-blocking.

### Low 2 — `setOpen(false)` refocuses the trigger on *every* close path
`system/dock.mjs:141` (inside `setOpen`, `dock.mjs:133-143`)

`toggle.focus()` fires on every transition to closed — including outside-click close and *any* `hashchange` to a non-`#appearance` value while the panel is open. So if the reader activates an in-page anchor or skip-link while the panel happens to be open, the resulting `hashchange → sync → setOpen(false)` yanks focus to the dock toggle instead of the anchor's target. Returning focus to the trigger is correct for a keyboard/Escape-initiated close (APG), but not for a pointer/navigation-initiated one.

**Consequence**: minor focus-management surprise in a rare interleaving; not a functional break.

**Fix**: refocus the trigger only when the close was keyboard/Escape/toggle-initiated, or gate it on `dock.contains(document.activeElement)` (i.e. only pull focus back if it's currently inside the panel). Non-blocking.

## Follow-ups (not defects — surfaced for the human)

- **Ruler-fill baseline — confirmed green.** The scroll-driven `.ruler-fill` capture under `animations:'disabled'` was the one reproducibility risk; the CI `visual` job has already re-captured and matched all 12 baselines, so it is deterministic in the pinned container. Resolved — no action.
- **Safari eyeball is pending** (report Issues). It's a *flagged human step*, not an open defect — the VR gate is single-engine (Chromium), a known blindspot. Please eyeball `/` and the open dock panel in real Safari before merging.
- **Stacked PRs**: PR C (`feature/system-graph`) is stacked on this branch and PR B (`feature/handoff-copy-prompt`) is independent — merge this (A) first, per the report.

## Acceptance criteria (PR A: #1–#5)

All satisfied on inspection: pack switch on all six IA pages via the single head-link swap, persisted + deep-linkable + keyboard/Escape/focus (#1); VR markup keeps `tokens.neutral.css`, exactly 12 PNGs, CI pending (#2); Copy-tokens verbatim + "Copy failed" path (#3); ruler ticks per `main > section` ≥3, scroll-fill/ticks-only/absent <1100px/aria-hidden (#4); monochrome token-only panel, no new tokens, no `tokens.source.json`/`components.css` change (#5). (#6–#9 belong to PRs B/C.)

---
*Agentic gate — a human reviews the code + this review and merges.*
