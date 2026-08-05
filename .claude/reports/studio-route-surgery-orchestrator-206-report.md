# Implementation Report — `/factory` becomes the studio (route surgery, orchestrator, docked inspector)

**Plan**: `.claude/plans/studio-route-surgery-orchestrator-206.md`
**Branch**: `feature/studio-route-surgery-206`
**Ticket**: [#206](https://github.com/linardsb/ux-factory/issues/206) · **Epic**: [#202](https://github.com/linardsb/ux-factory/issues/202)
**Status**: COMPLETE

## Summary

`/factory` stops being a tabbed viewer of three read-only exhibits and becomes the studio surface:
Act 0 (the visitor's token export, or one colour) above, a canvas holding the drafted breadboard as
fat-marker blocks, and a docked inspector beside it whose panel list absorbs all three exhibits,
mounted on activation rather than at load. The work is one new module (`system/studio.mjs`), one page
rewrite, and the gates and generated artifacts that follow from a rewritten page that was already
pixel-gated. Nothing is forked: the canvas is #204, the verbs are #205, the board is
`breadboard.mjs`'s `draftBoard` over `build-questions.mjs`'s store, and Act 0 is `build-import.mjs`
self-booting on markup. `build.html` is not edited at all.

## Tasks completed

| # | Task | Path | |
|---|---|---|---|
| 1 | The orchestrator | `system/studio.mjs` | CREATE |
| 2 | The studio surface + the absorbed exhibits' sheets | `system/studio.css` | UPDATE |
| 3 | The page rewrite | `factory.html` | UPDATE |
| 4 | Group 7 membership + new group 14 + tally | `tooling/build-checks.mjs` | UPDATE |
| 5 | `/factory` controls (+8, three re-scoped) + regen | `system/param-manifest.json`, `param-count.json` | UPDATE |
| 6 | Regen after the final tree | `system/loc-summary.json` | UPDATE |
| 7 | One handle replacing three | `tooling/visual-regression/visual.spec.mjs` | UPDATE |
| 8 | The `/factory` pass | `tooling/studio-journey.mjs` | UPDATE |
| 9 | Four baselines | `tooling/visual-regression/baselines/{factory,approach}-{neutral,saulera}.png` | UPDATE |
| 10 | Drift + untouched surfaces | — | VERIFIED |

Commits: `685c552` (implementation) · `8f7e7ba` (baselines) · `c9a274b` (loc-summary fix) ·
`5ecf294` (approach baselines re-taken).

## Tests added

**`build-checks` group 14 — the orchestrator's pure layer** (`arrangeBoard` · `buildSummary`), driven
over the REAL `draftBoard(DEFAULT_ANSWERS)` rather than a stand-in, plus a `MAX_PLACES` board, an
empty board, nine junk boards and seven junk `(board, answers)` pairs. Group 7 now includes
`system/studio.mjs` with no exception argued. Tally line and the file's header index updated 13 → 14.

**Every group-14 case was shown to fail under a deliberate mutation** before being trusted:

| Mutation to `system/studio.mjs` | Result |
|---|---|
| swap `col` and `row` in `arrangeBoard` | ✗ 4 failures |
| drop the `MAX_COLS` truncation | ✗ 2 failures |
| slice the affordances to 1 | ✗ 2 failures |
| paraphrase `patternFor`'s `reason` | ✗ 2 failures |
| re-count affordances instead of calling `affordanceCount` | ✗ 1 failure |
| remove the `Array.isArray(board.places)` guard (totality) | ✗ 9 failures |
| invent a label for the empty board instead of `null` | ✗ 1 failure |
| add a `.style.setProperty(` | ✗ group 7, 2 failures |
| add an `.innerHTML` | ✗ group 7, 1 failure |

The totality mutation is worth calling out: it first surfaced as an **uncaught TypeError that killed
the whole run before `group()` printed**, so the nine failures the loop had just recorded were never
reported and the operator would have read a stack trace instead of the check that caught it. The
follow-up calls now route through a guarded `arrange()` helper, and the mutation reports properly.

**`studio-journey` `/factory` pass** — 16 new cross-engine assertions on the shipped route: the
drafted board read off the running page through `getStudio()` (not a literal count), a **cold
`/factory#shape` deep-link into a genuinely mounted graph**, all three exhibits asserted as *rendered
content* after activation, the absorbed `.trace-*` stylesheet asserted as *reaching the page*, the
panel list by arrow keys and Home, exactly one panel visible under JS, a keyboard move counted per
keypress, no `style` attribute after a move, and Act 0's readiness handle.

## Validation results

| Gate | Result |
|---|---|
| `node --check` + Node import of `system/studio.mjs` | ✓ exports only, no DOM touched |
| `node tooling/build-checks.mjs` | ✓ **all 14 groups** |
| `node agent-layer/gen-param-count.mjs --check` | ✓ 93 controls, no drift |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| `node tooling/drift-check.mjs` | ✓ all 12 passes |
| `node tooling/token-lint.mjs` | ✓ 64 tokens, 0 undeclared, 0 orphan |
| `node tooling/studio-journey.mjs all` | ✓ **105 passed, 0 failed** × chromium, firefox, webkit |
| `node tooling/build-journey.mjs all` | ✓ **150 passed, 0 failed** × 3 engines (`/build` untouched) |
| `npm run update:docker` | ✓ 4 baselines regenerated, 6 other pages byte-identical; second run reports no further churn |

Manual, in all three engines: `/factory` renders the studio with zero console errors; the token drop
re-skins the canvas column; `/roundtrip.html` still sets both its handles and its back-link lands on
a **mounted** Round-trip panel; the ⌘K "Factory: system shape" command (driven by keyboard, the way
the palette is actually operated) sets the hash and the panel mounts; no horizontal scroll at 360 /
900 / 1280; the shell collapses to one column below 900px.

## Deviations from the plan

1. **`buildSummary` also returns `reason`.** The plan's shape was `{ patternId, patternLabel, places,
   affordances, connections }`, but the SURFACE SPEC requires the pattern's `reason` **verbatim** —
   `pattern-rules.mjs:141-144` is explicit that the sentence *is* the rule, not a description of it.
   Returning it from the pure function is what lets group 14 assert it was carried rather than
   paraphrased (one of the mutations above). Additive, not a change of contract.

2. **Act 0 is built from `portfolio.css`'s `brand-*` block, not from a port of `build.html`'s
   `bx-*` classes.** The plan said "port `build.html:701-796`'s markup subtree". Every *mount
   attribute* in that subtree is ported exactly, and the split lookup scopes are honoured node by
   node — but the `bx-*` wrappers live inside `build.html`'s own `<style>` block and porting them
   would have meant copying a stylesheet between two pages that size their columns differently. The
   inner controls (`.brand-drop`, `.brand-field`, `.brand-color`, `.brand-import-status`,
   `.brand-import-report`) are already in `portfolio.css`, which `/factory` loads, so they are used
   unforked. Only the two-column wrapper (`.stu-import*`) is this page's own.

3. **The `.stu-panel:not([hidden]) + .stu-panel:not([hidden])` rule was dropped.** `.stu-inspector`
   is a grid with its own `gap`, so the no-JS stacked case and the JS single-panel case are already
   spaced by one declaration. The absorbed viewer needed the sibling rule because its panels sat in
   flow. A second spacing source is a second thing to keep in step.

4. **A `<noscript>` was added inside the canvas column.** The plan's no-JS clause says "no control
   that does nothing". With scripting off the canvas column would have rendered a heading and an
   empty box. It could not be a plain placeholder inside `#canvas`, because `initStudioCanvas`
   **appends** its zoom row, scroller and live region rather than replacing the element's contents —
   a placeholder would have survived the mount and sat beside the stage. `<noscript>` says it
   without the JS path paying for a node it immediately has to hide, and points at `/build`.

5. **Two copy fixes past the SURFACE SPEC.** The first hero draft read "The tool, **not** a tour of
   it" — close enough to the humanizer's banned "not X but Y" construction to be worth replacing;
   it is now "This is the studio. **Move something**." (verb-first, I1). And the hero's "the
   evidence … is docked **on the right**" is false at every width below 900px, where the inspector
   sits below the canvas — now "is in the inspector".

6. **`system/studio.mjs` came out at ~370 lines** including the header, inside the plan's 320–380
   estimate. The `studio-inspector.mjs` split the plan rejected stayed rejected.

7. **Sequencing correction inside Task 6.** `loc-summary.json` was regenerated at its planned point
   in the order and then went stale, because Tasks 3, 4 and 8 kept editing tracked source afterwards.
   Caught by the post-commit sweep, not by the mid-task `--check` — which is exactly the
   `loc-summary-counts-tracked-only` trap arriving from the other direction. It cost one extra
   commit and one extra `update:docker` run for the two approach baselines. **The general fix for a
   future ticket: regenerate `loc-summary` as the LAST step before baselines, never at its position
   in the task list.**

## Issues encountered

- **`update:docker` refused to rewrite the approach baselines** the first time. Their only change is
  a handful of digits (85 → 93 controls, 21,700 → 22,400 lines), which is below pixelmatch's
  per-pixel threshold. Forced with `rm` on the two PNGs, per the recorded trap.

- **The plan's shell-geometry note is slightly wrong about the at-rest canvas, and the outcome is
  fine.** It reasoned that "the drafted board's up-to-six blocks along row 1 are partly off-stage so
  the reader has something to pan to". With `DEFAULT_ANSWERS` the board drafts **three** places, and
  all three fit inside the ~776px canvas column at 1280. So nothing is off-stage horizontally, and
  the pinned 640px height leaves roughly 480px of empty stage below row 1. That is still the right
  at-rest state — the grid is 12×8 and the empty space *is* where a reader moves a block to — but it
  is the judgement worth a second look, alongside the plan's own judgement call 4.

- **Judgement call 4, answered: the compare slider is fine in a 22rem rail.** `#roundtrip-diff`
  renders and its `.cmp-handle` operates; it is tight but not cramped, and the panel keeps its
  "full exhibit" link to `/roundtrip` for anyone who wants the width. No layout change made. #218
  revisits this rail and can revisit this with it.

- **#231 and #232 were not hit.** `place()` is called once per block at mount and no block is ever
  re-placed with a new name, so the stale-`aria-label` desync #231 describes never arises here. Both
  stay open and out of scope, as planned.

## For the PR body

Three things a diff-only reader will otherwise flag as defects:

1. **`initGlossary` sits OUTSIDE the `try/finally`** on the one AC that says "every path". Two repo
   rules meet at that line: #173's "an unknown `data-term` key must abort *before* the ready handle
   so the gate fails loud", and this ticket's "the handle is set in a `finally`". Inside the `try`,
   the second destroys the first. Before it, both hold exactly — a throw means the `finally` never
   runs. The `finally` exists for *benign* variation (a missing shell, a missing canvas, a failed
   fetch); a bad glossary key is a broken build, not a variation. The file argues this in prose
   because the next reader's instinct will be to tidy it inward.

2. **The exhibits' `.trace-*` and `.sg-*` style blocks MOVED VERBATIM** from `factory.html`'s
   `<style>` into `system/studio.css` under an `absorbed exhibits (#206)` heading. They were not
   dropped with the tab controller they sat beside. This is the one deletion that would have shipped
   green: `trace-player.mjs` and `system-graph.mjs` inject no `<style>`, and with the exhibits now
   mounted lazily *nothing captures them*, so a completely unstyled trace player passes
   `update:docker`, `build-checks` and `drift-check` alike. `studio-journey`'s new assertion that
   `.trace-player` computes to `display: flex` is the replacement coverage.

3. **The nav/footer label stays "Factory" (D2).** The rename to "Studio" is handed to #216, which
   already rewrites nav and footer and already runs alone — the label lives in
   `client.neutral.config.js` and churns all 16 chrome-bearing baselines. **This PR regenerates
   exactly four baselines: factory ×2, approach ×2. No chrome baseline is touched.**

One more worth stating, since it is a trade rather than a simplification: **the VR gate stops being
a liveness check for `system-graph.json`.** It used to hang on a broken artifact because the graph
mounted at load; the graph is not mounted at capture any more. CI `verify`'s drift-check replaces it
and reads the *artifact* rather than its rendering, and `studio-journey`'s `/factory` pass asserts
the graph actually rendered after activation. Stated so a reviewer can disagree.

## Acceptance criteria

- [x] **AC #1** — `/factory` renders the studio: canvas mounted with the drafted board, inspector
      docked, import act working, all three absorbed exhibits reachable and rendering.
- [x] **AC #2** — the VR spec's `factory` entry is rewritten to the studio's single handle; the three
      at-load handles stop existing; the new one is set in a `finally` on every path.
- [x] **AC #3** — both factory baselines regenerated from a clean detached worktree under `/Users`.
- [x] **AC #4** — `/roundtrip.html` untouched: still renders, still sets both handles, its back-link
      lands on a mounted panel, its baselines unchanged.
- [x] **AC #5** — `/build.html` untouched: `build-journey` 150/150 × 3 engines, share round-trip and
      all six acts driving.
- [x] **AC #6** — `param-manifest.json` grows under the existing `/factory` key (7 → 15, three
      re-scoped as conditional); `gen-param-count` regenerated; drift-check green.
- [x] **AC #7** — the nav-label decision is made and stated: kept as "Factory", rename handed to #216.
- [x] `system/studio.mjs` joins group 7 with no exception argued; group 14 drives its pure layer with
      every case shown to fail under mutation.
- [x] `loc-summary.json` regenerated and both approach baselines regenerated with it.
- [x] `tooling/studio-journey.mjs` gains a `/factory` pass, green on all three engines.
- [x] Zero console errors on the running page; no inline style on any `.stx-slot` after a move.
- [ ] PR body carries `Closes #206` — **for `piv-create-pr`.**

## Ready for the next step

All tasks complete, all validations pass on the clean committed tree. Next: `piv-create-pr` (the PR
body must carry `Closes #206` and the three statements above), then `piv-review-pr`. `gh pr checks`
after pushing — local Docker green is not CI green.
