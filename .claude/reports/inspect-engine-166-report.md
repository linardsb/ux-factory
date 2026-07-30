# Implementation Report — Inspect engine (#166)

**Plan**: `.claude/plans/inspect-engine-166.md`   **Branch**: `feature/inspect-engine-166` (dedicated worktree `../ux-factory-wt-166` — the main working dir was on `feature/param-count-167`, the plan's parallel-session guard)   **Status**: COMPLETE

## Summary

Built the Figma-style inspect primitive, engine only: `system/inspect.mjs` (glossary.mjs's 1.4.13 bubble
mechanics upgraded to Popover API + CSS anchor positioning with the fixed-position fallback),
`agent-layer/gen-inspect-data.mjs` + the generated, drift-checked `system/inspect-data.json`
(11 components — the 2 home consumers + all 9 spec-bearing — joining system-graph tokens, spec heads
and hand-authored role lines), `trackToolInspect()` (`/tool/inspect`, simple one-shot shape), and one
proving mount on home's sample-surface Primary button with a static "Inspect this surface" toggle.

## Tasks completed

- Generator → `agent-layer/gen-inspect-data.mjs` (CREATE); artifact `system/inspect-data.json` (CREATE, generated)
- CI gate → `tooling/drift-check.mjs` (UPDATE: `checkInspectData` after `checkSystemGraph`, gate list line)
- Engine → `system/inspect.mjs` (CREATE)
- Analytics → `system/analytics.mjs` (UPDATE: `/tool` section after the `/build` pair)
- Bubble/toggle styles → `system/portfolio.css` (UPDATE, beside `.glossary-bubble`)
- Proving mount → `index.html` (UPDATE: `data-inspect="buttons"`, toggle button, module script tag)
- Cascade → `system/loc-summary.json` regenerated (runtime 56→57 files, 17,600→17,800 lines); VR baselines index ×2 + approach ×2 regenerated via `update:docker` (approach needed the rm-and-force path — sub-perceptual skip, exactly as the plan's decision table predicted); no other baselines churned.

## Tests added

No suite (repo rule). Scripted, in scratchpad (outputs pasted below, scripts not committed):

- **Cross-engine 6-pass** (chromium/firefox/webkit × natural-anchor/forced-fallback via `CSS.supports` stub): bubble visible, in-viewport, adjacent to trigger, token rows present, Esc hides, correct `data-inspect-pos` branch — **6/6 PASS**.
- **AC walkthrough** (chromium): hover path · 4 layers (17 token rows) · honest spec-null line · `/tool/inspect` exactly once across two opens (pushState instrumented) · URL restored · live value refresh on re-open after re-skin · toggle-off inert · persistence both directions across reload · unknown-id loud failure + engine backs off — **11/11 PASS**.
- **Mutation tests (mandatory)**: hand-edited role word → drift-check RED naming the file → regen green; real `states` edit in `system/specs/metric-tile.md` → artifact changed → reverted, no drift. Byte-identical second generator run confirmed.

```
PASS  chromium natural  branch=anchor inViewport=true adjacent=true tokenRows=true escHides=true
PASS  chromium forced-fallback  branch=fallback inViewport=true adjacent=true tokenRows=true escHides=true
PASS  firefox natural  branch=anchor inViewport=true adjacent=true tokenRows=true escHides=true
PASS  firefox forced-fallback  branch=fallback inViewport=true adjacent=true tokenRows=true escHides=true
PASS  webkit natural  branch=anchor inViewport=true adjacent=true tokenRows=true escHides=true
PASS  webkit forced-fallback  branch=fallback inViewport=true adjacent=true tokenRows=true escHides=true
```

## Validation results

- `node --check` both new files ✓; `node -e import('./system/inspect.mjs')` → node-safe ✓
- `node agent-layer/gen-inspect-data.mjs` → `inspect data ✓  11 components · 9 with spec`; `--check` ✓
- `node tooling/drift-check.mjs` → ✓ (all nine gates incl. inspect-data)
- `node tooling/token-lint.mjs` → ✓ 0 undeclared · 0 orphan
- `node tooling/build-checks.mjs` → ✓ all 10 groups
- `npm run update:docker` → 20/20 passed; exactly 4 PNGs churned
- Role lines ran through /no-ai-slop detect (findings: uniform em-dash rhythm across 8/11 lines → fixed, dashes removed, sentence shapes varied; no banned words/puffery found)

## Deviations from the plan

1. **Root CSS hook renamed `data-inspect` → `data-inspect-mode`** (on `<html>` only). The plan's
   `documentElement.dataset.inspect = "on"` made the root element itself match the `[data-inspect]`
   trigger selector, so validation threw `unknown id "on"` on every activation. The CSS affordance
   selector is now `:root[data-inspect-mode="on"] [data-inspect]`. Trigger attribute unchanged.
2. **Fallback position math got a top clamp** (plan said glossary math "verbatim"). This bubble runs
   ~500px tall (17 token rows); glossary's flip-above from a trigger near the viewport top landed at
   y=−427. Now: below if it fits, else above, else clamped to the 8px margin. This is the epic's named
   "fallback legibility" risk, resolved.
3. **Bubble overflow containment added**: `.inspect-tokens` scrolls at `max-height: 32vh` and the
   bubble caps at `calc(100vh - 16px)` — without it the buttons block's 17 wrapped values made an
   1,111px bubble that could not sit in a 720px viewport on any engine.
4. **Anchor CSS gated on `.inspect-bubble[data-inspect-pos="anchor"]`**, not bare `@supports`: with
   only the JS feature-detect stubbed, `position-area` would otherwise apply with no `anchor-name`
   set anywhere — a hybrid neither real branch runs. The CSS now follows the JS's single decision.
5. **Toggle uses `btn-secondary`, not the plan's `btn-ghost`** — no `.btn-ghost` exists in
   components.css. Plus one structural class `.inspect-toggle-row` for spacing (no `.mt-md` utility
   exists either).
6. **Built in a dedicated worktree** — the shared working dir was on `feature/param-count-167`
   (parallel #167 session), the exact case the plan's risk section says to take a worktree for.

## Issues encountered

- Fresh worktree needed `npm ci` in `tooling/style-dictionary` and `tooling/visual-regression` (known).
- Approach baselines needed the plan's rm-and-force path (digit-only change under pixelmatch threshold).
- WebKit occasionally returns a null boundingBox right after the popover opens — test-side retry added;
  not an engine defect (identical manual sequence passes).

## AC status

AC1–AC5 all verified (see tests above). Both epic docs (`docs/epics/prototyping-feel-uplift.prd.md` +
`.architecture.md`) are untracked in this worktree and must be committed in this PR — re-check
`git log --oneline -3 -- docs/epics/prototyping-feel-uplift*` first in case a parallel session landed
them. PR body must carry `Closes #166`.
