# Implementation Report — v3 component library grid (live cards) (#79, epic #70 · P3b)

**Plan**: `.claude/plans/v3-component-library-grid.md`
**Branch**: `feature/v3-library-grid` (worktree `../ux-factory-wt-79`, branched off `origin/main` @ 67b7ab2)
**Status**: COMPLETE

## Summary

`work.html` gains one `#library` band between `#screens` and `#handoff`: a responsive grid of six
cards, each mounting a real shipped component rather than a picture of one. Three are the `vd-*`
custom-element wrappers (mounted exactly as `system/wc/demo.html` mounts them), three are
`components.css` primitives (`ds-metric-tile`, the `.btn` family, `.vd-primary-button`). Cards lift
on hover and on keyboard focus; pressable specimens squish and release through the committed
`motion-bounce`/`motion-ease-bounce` spring. All CSS is inline in `work.html`'s existing `<style>`
block and uses only existing tokens, so no token, generator, or shared-stylesheet file is touched.
Authored code is `work.html`-only; the two `work` VR baselines are regenerated.

## Tasks completed

- Phase 1 — confirmed mount contracts (`vd-plant-card`, `vd-care-task-row`, `vd-status-chip` are
  attribute-driven with no rAF/timers → static at rest, so Q3/Q4's default path holds and
  `visual.spec.mjs` stays untouched). Confirmed `--shadow-md` is the token `.card-link:hover` uses,
  so the lift needs no hand-authored shadow.
- `#library` band markup (6 cards, verbatim attribute/class vocabulary) → `work.html` (UPDATE)
- Wrapper-mount module + `data-lib="ready"` handle + anchor-navigation guard → `work.html` (UPDATE)
- `.lib-grid` / `.lib-card` / `.lib-demo` / `.lib-press` CSS + six states → `work.html` (UPDATE)
- `#library` added to the `scroll-margin-top: 96px` rule → `work.html` (UPDATE)
- `tooling/visual-regression/baselines/work-neutral.png` + `work-saulera.png` (REGENERATED)
- `system/loc-summary.json` (REGENERATED — generated cascade, see Deviations 8)
- `tooling/visual-regression/visual.spec.mjs` — **not edited** (default path, as planned)

## Tests added

No test framework exists in this repo (CLAUDE.md: "Done = run the surface you touched"). Validation
was surface-driven, via a throwaway Playwright script in the session scratchpad (not committed):

| assertion | chromium | firefox | webkit |
|---|---|---|---|
| `[data-lib="ready"]` set | ✓ | ✓ | ✓ |
| 6 cards render | ✓ | ✓ | ✓ |
| every `vd-*` has a populated shadow root | ✓ | ✓ | ✓ |
| zero `:not(:defined)` elements after load | ✓ | ✓ | ✓ |
| plant-card press fires one `vd-select`, URL unchanged | ✓ | ✓ | ✓ |
| care-task-row click flips `aria-checked` to `true` | ✓ | ✓ | ✓ |
| disabled `.vd-primary-button` reports disabled | ✓ | ✓ | ✓ |
| 360px: no horizontal page scroll, one column | ✓ | ✓ | ✓ |
| no console errors from the band | ✓ | ✓ | ✓ |

(The proto-iframe `:8787` connection errors are the recorded expected fixture-degradation of a
static serve with no mock Worker, filtered explicitly rather than ignored.)

A second script covered the keyboard path and the upgrade fallback:

| assertion | chromium | firefox | webkit |
|---|---|---|---|
| 8 tab stops in the band, in DOM order | ✓ | ✓ | 6 — see below |
| `vd-care-task-row` and all four buttons reachable | ✓ | ✓ | ✓ |
| disabled `.vd-primary-button` is skipped by Tab | ✓ | ✓ | ✓ |
| `vd-status-chip` takes no tab stop (per its spec) | ✓ | ✓ | ✓ |
| Space on a focused task row flips `aria-checked` | ✓ | ✓ | ✓ |
| shadow focus ring (2px outline at 2px offset) clears the stage padding at 400px | ✓ | ✓ | ✓ |

**WebKit finding, fixed in copy.** Safari leaves links out of the tab order unless full keyboard
access is on, so the two `vd-plant-card` anchors are not tab stops there. That is a Safari platform
setting, not a page defect — but the card's caption originally read "Tab to it for its focus ring",
which is untrue in default Safari. The caption now names the condition instead. Everything else in
the band is a `<button>` and is reachable in all three engines.

**Upgrade fallback, exercised.** With `**/system/wc/*.mjs` route-blocked, all 7 custom elements stay
undefined in all three engines and render the dashed token-styled "Component not loaded" placeholder;
the three cards keep their shape and their captions, and the three CSS-primitive cards are unaffected.
Screenshotted and eyeballed rather than only asserted.

Visual eyeball in real Chromium + WebKit at 1280px and 360px, at rest, on hover, and with the pack
swapped to saulera: the grid holds, the lift and border emphasis read, and every specimen re-skins
(the `vd-*` shadow CSS and `ds-metric-tile` take saulera's amber through the token contract with no
extra code).

## Validation results

- **Level 1 (syntax/style)** — PASS. No `transition: all`, no `rgb()`/`rgba()`, no raw hex in the
  added CSS (the only `#` hit in `work.html` is the pre-existing `theme-color` meta). No em dashes
  in visible copy.
- **Level 2 (structure)** — PASS. `id="library"`, `.lib-grid`, 6 × `.lib-card`, `data-lib`, and all
  six component vocabularies present; `#library` in the `scroll-margin-top` rule.
- **Level 3 (live surface)** — PASS, three engines (table above).
- **Level 4 (visual regression)** — PASS. `npm run update:docker` regenerated exactly
  `work-neutral.png` + `work-saulera.png`; 18/18 tests pass. A follow-up clean (non-update) Docker
  run of the **full** 18-test suite passes against the committed baselines, so they are settled,
  not merely rewritten, and no other page's baseline moved.
- **Repo gates** — `node tooling/token-lint.mjs` ✓ (63 contract tokens · 0 undeclared · 0 orphan);
  `node tooling/drift-check.mjs` ✓ (syntax · token-css · annotated-source · loc-summary ·
  system-graph · handoff · scenarios · traces), re-run **after** `git add` — `loc-summary` only
  reports honestly against a current index (recorded trap), and it did flag drift on the first
  staged run. Regenerated and staged; see Deviations 8.

## Deviations from the plan

1. **Card 6 is `.vd-primary-button`, not the `.capability` chip.** AC 3 requires a disabled state;
   `.capability` has no interactive states at all (it is a bare indicator, `portfolio.css:598`) and
   already appears twice on this page in the `#run` cards, so a card for it would be redundant.
   `.vd-primary-button` (`components.css:1718–1737`) is a spec'd component that ships all four of
   hover, active, focus-visible, and disabled, so it carries the disabled state honestly.
2. **Press is on three specimens, not all six.** `system/specs/metric-tile.md` states outright that
   the tile is read-only: *"No role, no tabindex … making a metric tappable is a new component
   decision, not a tone."* Faking a press on it, or on `vd-status-chip`, would contradict the spec
   the handoff pack publishes, and the plan's own Non-Goals forbid re-speccing a component. So the
   *card* hovers and lifts for all six, press and focus live on the three components that own them
   (`vd-plant-card`, `vd-care-task-row`, the `.btn` family), and the two display-only cards say so
   in their caption. This reads as a deliberate difference in the components rather than a gap.
3. **`.lib-press` wraps the specimen; it does not restyle it.** The squish sits on a wrapper `div`,
   so no shipped component's CSS changes. The `.btn` card is deliberately *not* wrapped: the squish
   is already inside `.btn` (`components.css:170–174`), and a second one would compound.
4. **Anchor navigation is suppressed by a listener, not by an `href`.** `vd-plant-card` renders an
   `<a href="#">`; setting `href="#library"` would push a history entry per press on the one page
   whose point is repeated pressing. One delegated `click` listener on the grid calls
   `preventDefault()` instead. The component is untouched: `vd-select` still fires (verified), and
   so do its own `:active` tint and focus ring.
5. **`.lib-demo` is a stage on `--color-bg`, not on the card's surface.** Every one of these
   components fills with `--color-bg-surface`, which is also the card fill: surface-on-surface made
   the disabled button disappear into the card entirely. The stage puts each specimen on the page
   ground, which is where it sits inside the prototypes anyway.
6. **Two small responsive/content adjustments** found by the 360px pass: card and stage padding
   tighten below 520px (nesting was taking ~100px off specimens that truncate rather than wrap), and
   the overdue plant demo uses a short name (`Aloe`) so the wide `OVERDUE` chip does not clip it on
   a phone. `.btn-ghost` was added to the buttons card so it demos the full family.
7. **The plan's `.capability`-set assumption (Q2) and the "add a wait to `visual.spec.mjs`"
   conditional (Q3)** — the Q3 condition never fired (all three wrappers are static at rest), so
   `visual.spec.mjs` is unchanged as planned.
8. **`system/loc-summary.json` is in this commit**, which the plan did not anticipate (its
   `work.html`-only AC covers *authored* code; this is a generated cascade file). `gen-loc-summary`
   counts git-tracked content, so the +270 lines on `work.html` move the `pages` group
   (3500 → 3800) and the grand total (15700 → 15900). Regenerating is not optional: CI `verify` is
   blocking on main. It does **not** churn the `approach` baselines — `approach.html` renders only
   the `runtime` group (`approach.html:237`), which is unchanged — so no third baseline moves.

## Issues encountered

- **Docker file sharing is broken for `~/Desktop` on this machine.** The daemon is colima, whose VM
  lacks macOS permission for the Desktop folder: any bind mount under it fails with
  `operation not permitted` (this affects the main repo dir too, not just the new worktree). Worked
  around by rsyncing the tree to `~/.vr79-tmp`, running `update:docker` there, and copying the two
  regenerated PNGs back — the baselines are genuine Linux/Chromium container output, verified by a
  clean non-update run afterwards. **Worth fixing before #82's full regen**: grant colima access to
  the Desktop folder (System Settings → Privacy & Security → Files and Folders / Full Disk Access),
  or move the repo out of `~/Desktop`.
- **A stranded fix on `feature/v3-approach-work`.** Commit `85b3689` tokenizes
  `.factory-embed-cap { font-size: 13.5px }` → `var(--type-caption)` on `work.html`, but PR #95
  merged before it, so `origin/main` still carries the literal and no open PR carries the fix. Out
  of scope for #79 (pulling it in would muddy a `work.html`-only diff), flagged here for the owner.
- A fresh worktree has no `tooling/style-dictionary/node_modules`, so `drift-check.mjs` fails loudly
  until `npm install` runs there. Ran it; the install is worktree-local and not committed.

## Ready for the next step

All plan tasks are complete and every validation command passes. Changed files: `work.html`,
`system/loc-summary.json`, `tooling/visual-regression/baselines/work-{neutral,saulera}.png`, plus
the plan and this report. Next: `piv-commit`, then `piv-create-pr`, then `piv-review-pr`.

**For the PR body — the Kinetics note:** this takes the *presentation model* (a grid of one
interactive card per component), which is a common way to publish a component library and not
something anyone owns. No code, no motion values, and no easing curves were copied. Every duration
and curve here is a committed token from `system/tokens.source.json` (`motion-fast`,
`motion-bounce`, `motion-ease-bounce`, `motion-ease`), and no new token was added.
