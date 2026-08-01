# Implementation Report — View Transitions site-wide: the remaining state morphs (#172)

**Plan**: `.claude/plans/view-transitions-sitewide-172.md`  **Branch**: `feature/view-transitions-172`  **Status**: COMPLETE

## Summary

The four remaining JS-driven state swaps on shipped pages now morph through a view transition where
the engine and the reader allow it: the shared intake wizard's Back/Next (home + instance), the
agentic study's four adjust verbs and its question tabs (both mounts), the trace player's stepping,
and home's re-skin fallback. Three of the four import `system/morph.mjs` — the wrapper #171 landed,
never a fork; `trace-player.mjs` replicates it in six lines because its header contract forbids
imports. No `view-transition-name` is written anywhere, so this ticket ships the default root
crossfade only.

**No baseline was regenerated.** AC2's literal check — `git diff --stat origin/main --
tooling/visual-regression` — is empty. The plan predicted a loc-summary rounding flip forcing an
approach ×2 recapture; re-measured against post-#171 `origin/main`, it does not happen (§Task 6).

## Entry gate — what #171 changed about this plan

Run against #171 **as merged** (PR #189, merge `ee2d733`; read at `5c1865c`, which includes the
PR-review follow-ups — the pre-review tip described the audit tool differently). Six amendments are
written into the plan's AMENDMENTS section; the two that changed the code:

- **The helper is shared, not per-file.** The plan's "No new shared module / replicate per file"
  is reversed — following it literally would have created duplicate helpers beside the committed one.
- **#171 deviation 3 is a hazard class, not a /build quirk.** `morph()` runs its callback a frame
  late, so a newer state painted synchronously in that gap gets overwritten by the older captured
  closure. Discipline adopted throughout: **state mutates synchronously outside the callback, only
  the paint goes inside, and the paint reads live state.** `pick(entry, tab)` was the one real
  exposure here (it closed over its arguments) and was split accordingly.

## Tasks completed

| Task | File | |
|---|---|---|
| wizard Back/Next morph (home + instance, one shared module) | `system/factory-intake.mjs` | UPDATE |
| four adjust verbs + question tabs; `pick` split for frame-gap safety | `system/agentic-study.mjs` | UPDATE |
| stepping + `revealAll`, inlined helper, initial-mount exclusion | `system/trace-player.mjs` | UPDATE |
| re-skin fallback only (the claimed path is the dock's transition) | `system/brand-import.mjs` | UPDATE |
| site-wide section: 5 surfaces × 5 assertions, 3 engines | `tooling/vt-verify.mjs` | UPDATE |
| narrowed a now-false invariant + recorded the site-wide extension | `CLAUDE.md` | UPDATE |
| grand-total line count (runtime group unmoved) | `system/loc-summary.json` | UPDATE |
| dock pack switch | `system/dock.mjs` | **VERIFIED, no change** |
| handoff-viewer | `system/handoff-viewer.mjs` | **no-op, no change** |

**Untouchables untouched:** `git diff` shows no hunks in `system/analytics.mjs` or
`system/pack-boot.js`.

### The two no-op findings

- **`dock.mjs` was already fully wrapped** and needed nothing: support guard (`:261`), reduce check
  (`:256`), both handles swallowed (`:266-267`), and the derived/imported inline-props re-read
  *inside* `swap()` (`:240-244`) — the guard the `derived-pack-inline-vs-stylesheet` memory demands.
  It must **not** be refactored onto `morph.mjs` despite the near-identical shape: its fallback is
  `Promise.resolve(swap()).catch(…)`, which absorbs a throwing swap, where `morph.mjs`'s
  `mutate(); return Promise.resolve()` lets the throw propagate. Different error semantics, so the
  "duplication" is real and deliberate.
- **`handoff-viewer.mjs` has no navigation to wrap.** It renders once per page load
  (`handoff.html:196`) with no post-render state machine. Its only post-render mutation is the
  copy-button label flip — a two-word text swap, not worth a page crossfade. Confirmed at planning,
  re-confirmed against the current file. The ticket's file list over-estimated.

## Tests added

**`tooling/vt-verify.mjs` — extended from /build-only to site-wide.** #171's /build block is
untouched and still passes. Five new surfaces — home wizard step · **instance wizard step** · study
question tab · study remove-a-tile · trace step — each asserting five things per engine: load opens
the expected number of transitions, the reader's verb opens exactly one, the surface actually
changed, reduced motion opens none, and reduced motion reaches the identical end state.

The "surface actually changed" assertion is not padding — see mutation B below, where the end state
stayed green with the morph removed. `calls === 1` and "the state moved" are each insufficient alone.

**Green on chromium 149.0.7827.55, firefox 151.0, webkit 26.5 — 36 assertions per engine, 108 total,
0 failures.** That is #171's 11 for /build plus this ticket's 25 (5 surfaces × 5).

Both wizard mounts are covered, and they are genuinely different paths: home configures three axes
through `HOME_AXES` (`1 / 3`), instance goes through `instance.mjs`'s `initIntake(config)` seam with
the full set (`1 / 4`). Their load counts differ too, and both were measured rather than assumed —
home 2, instance 0 (no spine `heroBeat` on that page).

**Mutation-tested** (the "check that cannot fail" rule — every new check made to fail on purpose):

| Mutation | Result |
|---|---|
| trace-player's initial-mount exclusion removed (`live` starts `true`) | ✗ fires — trace load opens 1, not 0 |
| home wizard's `Next` unwrapped | ✗ fires — verb opens 0; **the end-state check stayed green**, which is why both exist |
| trace-player's reduced-motion off-ramp dropped | ✗ fires — reduced motion opens 1 |

## Validation results

| Gate | Result |
|---|---|
| `node --check` × 4 modules | ✓ |
| Node dynamic-import × 5 modules (build-checks contract) | ✓ all import clean |
| `node tooling/build-checks.mjs` | ✓ all 10 groups |
| `node tooling/drift-check.mjs` | ✓ all 11 checks |
| `node tooling/validate-trace.mjs` | ✓ 6 traces — `parseTrace`'s Node path intact |
| `node agent-layer/gen-loc-summary.mjs --check` (staged) | ✓ no drift |
| `node tooling/vt-verify.mjs all` | ✓ 3 engines |
| AC2 literal — `git diff --stat origin/main -- tooling/visual-regression` | ✓ **empty** |

## Deviations from the plan

1. **Import the shared `morph.mjs` rather than replicate per file** (3 of 4 sites) — entry-gate
   finding; the plan's own escape hatch. `trace-player.mjs` still inlines it, per its header contract.
2. **`pick(entry, tab)` gained an `animate` parameter and a `paint()` split.** The plan said to wrap
   at the listener so the mount call stays instant. That alone would have shipped #171's deviation-3
   bug: two tabs clicked a frame apart would revert to the older question. State + `aria-selected`
   now flip synchronously; only `paint()` — which reads live `picked`/`working` — is wrapped.
3. **The adjust verbs wrap only the render pair**, not the mutation + renders as the plan wrote it.
   A view transition snapshots the DOM, so moving pure data into the callback buys nothing, and it
   would have pushed `bus.emit` a frame late — reordering the bus log against the mutation whose
   ordering the file's own line-149 comment pins.
4. **`tooling/vt-verify.mjs` extended instead of a scratchpad throwaway** (plan Task 7). It is
   committed, repeatable, and #171's header already names #172 as the ticket that must preserve the
   boot-zero property. Costs no baseline churn — `tooling/` is not counted by `gen-loc-summary`.
5. **`vt-stack-audit` deliberately not adopted, so #190 is not a blocker.** Both hazards it checks
   arise only from `view-transition-name`. This ticket writes none, so there is nothing to audit.
   Flagged because `CLAUDE.md`:84 currently reads as if #172 must run it — see Issues.
6. **No approach baseline recapture** (plan Phase 3 predicted one) — the rounding flip does not
   occur. See Task 6 below.
7. **`CLAUDE.md`:83 narrowed** (not in the plan). This ticket measured that its "boot opens ZERO
   transitions … #172 must preserve it site-wide" is false off /build, so the sentence was corrected
   rather than left standing with a `vt-verify` that contradicts it.

## Issues encountered

- **`CLAUDE.md`:83 states a property that is not true site-wide.** "boot opens ZERO transitions …
  #172 must preserve it site-wide" holds on /build, but `spine.mjs`:147,149 already ran home's hero
  re-skin *and* its revert through `crossfade()` → `startViewTransition` at load (#72), before this
  ticket. Measured: home opens exactly **2** at load, all three engines. The pixel gate is safe
  there for a different reason — `heroBeat` sets `data-spine="ready"` only after the revert and the
  gate waits on that handle. `vt-verify` now encodes this as an expected count *with its reason*
  rather than asserting a zero that was never there. **Fixed in this PR:** the clause is narrowed to
  /build and the entry now records the site-wide extension plus home's two and why they are safe.
  A known-false invariant in the rules file every session loads is worth one clause of another
  ticket's text — and the measurement that disproves it is this ticket's.
- **`drift-check` fails in a fresh worktree** with `ERR_MODULE_NOT_FOUND: style-dictionary` — a
  missing dependency, not drift. `cd tooling/style-dictionary && npm install` first.
- **`gen-loc-summary --check` before staging is a false green** (it reads git-tracked content).
  Staged first, then re-checked.
- **The `active` flag is now shared between /build and these surfaces**, since three of the four
  import the one module. Benign here: no #172 wrap site can be re-entered from inside another's
  update callback (they are separate pages, and the study's `bus.emit` → listener path appends to a
  log, it does not re-enter a wrapped verb). `trace-player`'s inlined copy has its own flag by
  construction, and its per-player scope is noted at the definition.

## Task 6 — the loc measurement, in full

The plan measured 5 lines of headroom pre-#171 and called the flip "near-certain". Re-measured on
post-#171 `origin/main`: runtime group **19,192 exact → 19,200 rounded**, boundary at **19,250**
(`round100 = Math.round(n/100)*100`), so **58 lines of headroom**. This ticket adds **49 net lines**
(69 insertions − 20 deletions), landing at 19,241 — still 19,200.

Only the grand total moved, 26,700 → 26,800. `approach.html`:241 selects the `runtime` group and
renders `runtime.files` (`:246`) and `runtime.linesApprox` (`:248`); it never reads `total`.
Verified in the markup rather than taken from memory. So the rendered numbers are byte-identical and
**no baseline churns** — consistent with the `loc-summary-counts-tracked-only` memory ("grand-total
flips fail verify but don't churn approach baselines").

## Acceptance criteria

- [x] **AC1** — every listed surface morphs where supported, instant-swaps elsewhere, obeys
      reduced-motion. Proven per engine by `vt-verify`, not by eye: wizard on **both** mounts (home
      `1 / 3`, instance `1 / 4`), study tab + remove on the shared surface, trace stepping. The dock
      was already wrapped (verified, unchanged) and handoff-viewer has nothing to wrap. The one
      surface without an automated assertion is `brand-import`'s fallback leg — see the closing
      section, which says so rather than claiming coverage it does not have.
- [x] **AC2** — zero baseline regeneration, literally: the VR diff against `origin/main` is empty.
      Structurally safe because every wrap is interaction-triggered and the two load-time
      transitions on home are the spine's, settled before the handle the gate waits on.
- [x] **AC3** — dock persistence verified unchanged (no edit); wizard flow, study adjustments and
      trace stepping each assert their end state in `vt-verify`, and reduced motion reaches the
      identical end state on all three engines.
- [x] **AC4** — chromium / firefox / webkit functional pass.
- [x] Untouchables untouched (`analytics.mjs`, `pack-boot.js`).
- [ ] Plan + report + review in the PR; `Closes #172` in the body — pending `piv-create-pr`.

## Not covered by an automated assertion

**`brand-import.mjs`'s fallback leg is verified by hand, not by `vt-verify`.** It runs only when the
dock does not claim the request *or* `sessionStorage` refuses the write — a private-browsing state no
Playwright context reproduces faithfully. Asserting it from a context that never took that path would
be a check that cannot fail, so the driver omits it and this line says so instead. The wrap itself is
three lines and shares the shape proven on the other four surfaces.
