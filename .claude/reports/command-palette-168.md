# Implementation Report — ⌘K command palette (#168)

**Plan**: `.claude/plans/command-palette-168.md`   **Branch**: `feature/command-palette-168`   **Status**: COMPLETE

## Summary

A site-wide command palette (`system/palette.mjs`, ~260 lines, hand-written canon) on all 10
shipped pages: native `<dialog>` + `showModal()`, fuzzy type-to-filter over a static command
list (navigate pages + exhibits, toggle inspect, start a build, copy tokens, download the pack),
spring + `@starting-style` entrance with a scoped reduced-motion off-ramp. The chrome ⌘K hint
ships hidden in `site.js` and is revealed + wired by `palette.mjs`, so `instance.html` and
per-company builds never show a dead button. One new analytics milestone `/tool/palette`, fired
once from the open success path. No pack-switch command (owner decision, epic round 4).

## Tasks completed

- getInspect accessor → `system/inspect.mjs` (UPDATE, one line)
- the palette module → `system/palette.mjs` (CREATE)
- `trackToolPalette()` → `system/analytics.mjs` (UPDATE, mirrors `trackToolInspect`)
- hidden ⌘K hint in the header template → `system/site.js` (UPDATE)
- `.cmdk` dialog styles, token-only → `system/components.css` (UPDATE)
- `.nav-palette-hint` chrome styles → `system/portfolio.css` (UPDATE)
- `<script type="module" src="/system/palette.mjs">` → all 10 shipped pages (UPDATE; **not** instance.html)
- 3 chrome entries → `system/param-manifest.json` + regen: `param-count.json` (65 controls),
  `loc-summary.json`, `system-graph.json` (29 consumers — `.cmdk` is a new components.css
  consumer block), handoff pack + bundle re-run (byte-identical, see deviations)
- cross-engine journey script → scratchpad `palette-journey.mjs` (NOT committed, #166 precedent)
- VR baselines ×16 regenerated via `update:docker` from a clean `/Users` worktree

## Tests added

No suite exists (CLAUDE.md). The scratchpad cross-engine journey asserts, per engine
(chromium 1.61.1 · firefox · webkit):

- all 10 pages: Ctrl-K opens, input holds focus, filter narrows, focus trapped (page inert),
  Escape closes, focus returned to invoker, reopen resets query + selection
- ⌘K (`Meta+k`) opens too
- presence gating: no inspect command on contact (zero mounts), no copy-tokens on protos
  (no dock), no "Go to Contact" on contact, "Download the pack" everywhere, no hint on protos
- hint: visible on approach, click opens, Escape returns focus to the hint
  (chromium/firefox; WebKit's documented macOS no-focus-on-click convention → body,
  asserted per engine, not skipped), keyboard-activatable (focus + Enter)
- instance.html: no dialog, hint hidden with `display:none` computed
- toggle inspect on home: label state-aware at each open, Enter flips
  `data-inspect-mode` on → off live, palette closes after running
- analytics both directions: two opens → exactly one `/tool/palette` pushState; keys without
  an open → zero
- dock collision: `#appearance` open → ⌘K → Escape closes the palette, dock STILL open
- navigation: contact → "Factory: system shape" lands on `/factory#shape`; work → "Work:
  handoff pack" stays on-page, sets `#handoff`, closes; ArrowDown moves the active option;
  `aria-activedescendant` tracks it
- edges: no-match empty state + inert Enter, rapid ⌘K toggling (InvalidStateError guard),
  ⌘K from inside a page input, reduced-motion open/close

**Result: chromium 105/105 · firefox 105/105 · webkit 105/105.**

Extra hand checks: saulera pack re-skins the open palette with zero CSS edits (surface/border
change, radius → 0); at 600px the hint is hidden, Ctrl-K still opens, dialog fits (541px).

## Validation results

- `node -e import('./system/palette.mjs')` etc. — all three modules Node-import safe ✓
- `node tooling/token-lint.mjs` — 64 contract tokens · 0 undeclared · 0 orphan ✓
- `node tooling/build-checks.mjs` — all 10 groups ✓
- `node tooling/drift-check.mjs` — green on the staged tree ✓
- cross-engine journey — 3 × 105/105 ✓
- VR `update:docker` — 20/20 passed in the clean `/Users` worktree; exactly the 16 chrome baselines regenerated, proto ×4 byte-identical (the palette leaked no at-rest pixels); ⌘K chip visually confirmed in the new `contact-neutral.png` header crop

## Deviations from the plan

1. **Hint markup position**: placed after `.nav-panel` (last in `.nav-row`) rather than the
   plan's "between `.nav-toggle` and `.nav-panel`" — with `.nav-panel { display: contents }`
   the row's flex items are laid out flat, and last-child puts the hint visually right AND
   keeps DOM/tab order identical to visual order (no CSS `order` hack, no WCAG 2.4.3 wrinkle).
2. **`gen-handoff`/`gen-pack-bundle` were a no-op**: the pack does NOT ship `components.css`
   (specs + contracts + token targets + wc wrappers only), so the plan's "components.css ships
   in the pack" premise was wrong. Both generators were still run; outputs byte-identical.
3. **`gen-system-graph.mjs` added to the cascade** (plan omitted it): the `.cmdk` block is a
   new components.css consumer, and drift-check red-flagged the stale graph.
4. **Command list built lazily at first open** (plan said "at mount"): same static-once
   semantics, but guarantees the dock exists when the `.dock-copy` presence gate is evaluated.
5. **Journey script interaction style**: keyboard events + `evaluate`, URL assertions after
   palette navigations, fresh page per scenario — because a page-initiated navigation triggers
   the site's cross-document view transition, after which Playwright's click-actionability
   ("stable") checks hang in that tab. **Pre-existing on main**: a plain `work.html →
   /roundtrip` link click reproduces it with no palette involved; `build-journey.mjs` only ever
   clicks after a fresh `goto`. Driver-environment quirk, not a user-facing defect.

## Issues encountered

- The journey initially failed 13 assertions; all were test-side: a too-strict focus-trap
  assertion (the input is the dialog's only focusable — modal inertness is the real guarantee),
  and assertions racing the 50 ms `/tool/palette` restore window (`RESTORE_DELAY_MS`). A script
  presses Enter faster than any human; the same theoretical collision window the four /factory
  trackers accept (#149) is what the assertions were seeing. Journey now settles 80 ms past it.
- One latent, accepted corner (worth a reviewer's eye): a same-page hash command executed
  INSIDE the 50 ms restore window would have its new hash eaten by the tracker's
  `replaceState` restore (real URL snapshotted at fire time, pre-hash). Reaching it needs
  open → type → Enter in under 50 ms on the visit's FIRST open — not human-reachable; the plan
  pins the simple `trackFactoryBuilt` shape and forbids flipTo here (§Analytics milestones).
- Mid-session, `system/portfolio.css` silently reverted to HEAD (shared worktree, parallel
  session — the known memory). Re-applied, loc-summary re-regenerated on the corrected staged
  tree, drift-check re-run green.

## Cross-engine summary (verbatim)

```
━━━ chromium ━━━  105 passed · 0 failed
━━━ firefox  ━━━  105 passed · 0 failed
━━━ webkit   ━━━  105 passed · 0 failed
```
