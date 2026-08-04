# Implementation Report — Factory: dual-register copy + inspect mount + pan/zoom system graph

**Plan**: `.claude/plans/factory-copy-inspect-panzoom-173.md`
**Branch**: `feature/factory-uplift-173` (worktree `ux-factory-wt-173`)
**Status**: COMPLETE — implemented by its own session (4 commits, d97d879..102f244), finished by a
second session after the branch went idle (last write 15:43; finishing pass the same evening).

## What shipped (the original session's four commits)

1. **d97d879 — pan/zoom on the system graph.** Bounded window (`.sg-scroll`), drag-to-scroll with
   pointer capture on a native scroller so Tab order and scroll-into-view survive, ⌘/Ctrl-wheel +
   trackpad-pinch zoom anchored at the cursor, explicit Zoom in / Zoom out / Reset buttons with a
   live `aria-live` percentage as the keyboard path, one SVG width write against the unchanged
   viewBox. At rest: scale 1, scroll 0,0 — the hidden-at-capture panel never races the pixel gate.
2. **5652f04 — inspect mounts** over the hero, buttons, and the trace exhibit's own components.
3. **c24c911 — dual-register copy cut + glossary's second page.** Every section opens in plain
   English with the precise term marked `<dfn data-term>`; `initGlossary` runs inside the graph
   mount module so an unknown key aborts before the ready handle and the VR gate fails loud
   (proven in that session by serving with a corrupted key). Three new TERMS; two reused.
4. **102f244 — param-manifest +3 and the regen cascade** (computed against the then-current base).

## The finishing pass

- **Merged `feature/protos-bus-toggles-device-frame-176`** (which carries `origin/main` with
  PRs #192/#195/#198) — this ticket stacks on #176 because both move the param/loc numbers and
  the approach baselines. Conflicts: the two generated counts only; resolved by regeneration.
- **Final numbers: param total 85** (82 + this ticket's 3) · **loc runtime 63 files / 20,100**.
- **CLAUDE.md map lines** for the pan/zoom and glossary-on-factory (the checklist item the
  original session had not reached).
- Gates on the merged tree: `drift-check` 11 groups · `build-checks` 10 groups · `token-lint` —
  all green.

## Acceptance criteria, with evidence

- **AC1 (pan/zoom, three engines): 21/21 green** on chromium 149.0.7827.55 · firefox 151.0 ·
  webkit 26.5 — boot at rest (100%, 0,0); button zoom grows level + rendered width; captured drag
  pans; a synthetic ctrl-wheel (the exact event the handler reads; pinch arrives identically)
  zooms further; both clamps disable their buttons; **reset restores boot geometry exactly**
  (level, scroll, and rendered width all compared against boot readings).
- **AC2 (copy/register):** landed in c24c911; the commit body records the register rules, the
  mark placement (including the deliberate no-mark call on "Go deeper" rows), and the verbatim
  honesty surfaces. The copy-skills pass is that session's claim, recorded as such.
- **AC3 (inspect on factory):** all five mounts — header · page-hero · buttons · cards · footer —
  verified opening with real resolved token values (18–20 populated rows on the chrome mounts).
  Getting a single sweep to show 5/5 took forensics: every apparent failure was traced with
  hidePopover stack-captures to synthetic-pointer geometry (parking inside a trigger, coordinates
  measured mid-glide or below the fold, `hover()`'s own actionability scrolls) interacting with
  the engine's designed scroll-hide and armed-hide timers — never to the engine itself. The
  driver-authoring lessons are recorded in the project memory (`hover-probes-race-smooth-scroll`).
- **AC4 (baselines):** exactly four PNGs regenerated on the merged tree — `factory-*` ×2
  (copy + glossary marks at rest; the graph panel is hidden at capture) and `approach-*` ×2
  (85 controls · 63 files/20,100 lines) — all four `rm`'d first, 20/20 pass, digits verified by
  eye on the approach PNG.
- **AC5 (headless, Worker absent): pass** — 0 page errors, 0 console errors (served statically the
  page degrades without even a refused-connection line — cleaner than the recorded expectation),
  1 trace player at load (the Round-trip tab's player mounts lazily by design), 3 evidence tabs,
  header/footer chrome present.
- **AC6:** manifest +3 (102f244) · post-merge regens (85 / 20,100) · drift-check green · plan +
  report in this PR · body carries `Closes #173`.

## Deviations

1. **Finishing-session split** — the original session idled before CLAUDE.md, the functional
   drivers, the report, and the post-merge regen; this pass completed them.
2. **Stacked merge** rather than plain main (sequencing with #176; whichever PR merges second
   re-runs nothing — this branch already contains #176's result).
3. The AC5 expectation of `ERR_CONNECTION_REFUSED` noise (from the project memory) did not
   reproduce under static serving — zero console errors observed; recorded as the better outcome.
4. The plan's scratch drivers stayed scratch (as specified); their assertions and results are
   recorded here instead.
