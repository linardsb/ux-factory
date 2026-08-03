# Implementation report — #174 Wave 3: Approach uplift

Plan: [.claude/plans/approach-uplift-174.md](../plans/approach-uplift-174.md) · Branch: `feature/approach-uplift-174`
Executed 2026-08-03. Tasks 1–7 were implemented in an earlier session of this branch; this report
covers their completion (Tasks 8–13) and the deviations met along the way.

## What shipped

- **Two scrub handles on the derive probe** (`system/derive-probe.mjs` + `system/scrub.mjs`'s
  widened return): brand hue + brand lightness, reusing home's `.stage-scrub-handle` recipe —
  one focus ring and one keyboard model across both surfaces. The `@property`-registered
  `--asrc-probe-accent` makes the swatch glide (reduced-motion: snap).
- **Inspect mount on /approach** (annotated-source components + toggle below `#asrc`), plus the
  `system/inspect.mjs` `ownEvent` fix: a focused glossary `<dfn>` nested inside an inspect mount
  no longer opens two tooltips on one rect.
- **Dual-register copy cut ×4 sites + glossary TERMS additions.**
- **Three `param-manifest.json` entries** → total 75 → **78**; loc runtime 19,300 → **19,400**
  (files stay 61 — no new source file).

## Task-by-task evidence

- **Task 8–9:** staged by explicit path, regenerated in plan order; `drift-check` (11 groups),
  `token-lint`, `build-checks` (10 groups) all green post-regen.
- **Task 10 (flow-through proof):** observed on the running page (headless chromium, settled
  countUp reads): **78** → throwaway manifest entry + regen → **79** → revert + regen → **78**,
  `param-manifest.json`/`param-count.json` byte-identical to the index afterwards.
- **Task 11 (two-stage @property proof):** stage one (everything that paints) committed →
  `rm` both approach PNGs → `update:docker`: 20/20 passed, **exactly two PNGs churned**.
  Eyeballed both new baselines against the plan's deterministic table — all pass on both packs:
  hue **136°**, lightness **79%**, swatch/accent **#417e0f**, contrast line "4.57:1 — AA needs
  ≥ 4.5:1 · pass", param line **78**, loc line **61 files / 19,400**, inspect toggle present.
  Stage two (the `@property` + reduced-motion transition only) committed → plain (non-update)
  Docker pixel run against stage one's baselines: result recorded in the PR (green = the
  registration is render-invisible across all 20 shots).
- **Task 12 (cross-engine):** **21/21 green** on chromium 149.0.7827.55, firefox 151.0,
  webkit 26.5 (scratch Playwright driver): drag both handles → derived output changes;
  ArrowRight steps hue by exactly 2 / lightness by 1 via `aria-valuenow`; inspect toggle
  reports pressed; #174's `decision-card-organism` bubble opens on hover, legible, **anchor
  branch on all three engines** (firefox 151 has anchor positioning now — the plan's
  firefox-fallback note is moot, and the fallback branch therefore went unexercised by this run);
  reduced-motion drag still moves values (snap). Two measurement traps the first run hit, for
  the next driver author: the arrow-step "before" read must come AFTER focus settles (focusin
  re-reads the live hex-quantized brand — a pre-focus read measures that honest re-read as a
  double-step), and bubble checks must hover, not `.focus()` (mounts carry no tabindex).
  **The sweep surfaced two real inspect-engine findings, filed with evidence:** #196 (the header
  chrome mount misses hover-opens on its left half / nav links, engine-dependent — all 12 other
  /approach mounts open cleanly) and #197 (webkit's anchor branch doesn't flip/clamp a tall
  bubble into the viewport; chromium clamps the same bubble to fit exactly). Both are #166-era
  engine/chrome surfaces, not this ticket's code.

## Deviations from the plan

1. **Merged `origin/main` mid-ticket** (the plan's Task-9 gotcha anticipated it): PR #192 landed
   under this branch (loc 19,300 + fresh approach baselines), so the merge came before the regens
   and this ticket's numbers build on main's.
2. **`system/inspect.mjs` added to the staged set** — the plan's explicit-path list predates the
   glossary-collision fix made during Tasks 4–5; omitting it would have split the fix from the
   mounts that need it.
3. **Task 11 ran in the main working dir post-commit**, not a detached worktree: the tree was
   tracked-clean except two non-painting markdown edits (studio-PRD back-links), and the untracked
   plan/docs render on no page. Equivalent capture, one less moving part.
4. **Task 10 executed headlessly** (Playwright reads of the settled number) rather than a manual
   browser walk — same observations, recorded above.

## Discovery worth its own line

The plan's collision warning aimed at #173 sharing this working dir; reality was the reverse —
**#173 and #176 live in their own worktrees with real commits** (4 and 1 respectively) and were
wrongly fold-closed during the day's tracker cleanup on a "zero implementation" read of this shared
dir alone. Both were reopened to ship as #164 waves; their closing notes carry corrections and a
sequencing warning (this ticket, #173 and #176 all move the param/loc numbers and the approach or
proto baselines — whichever merges later re-runs the regens + `update:docker` on the merged tree).
