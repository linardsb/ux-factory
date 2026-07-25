# PR #85 Review — v3 hero choreography + live `derive()` re-skin + beat-orchestration seam (#72)

**Branch:** `feature/v3-hero` · **HEAD:** `7131975` · **Base:** `main` · **Reviewer:** piv-review-pr (fresh context + code-reviewer agent)

## Recommendation: 🟠 Request changes — *the code is fine; resolve the red VR gate + the PR-body claim first*

The `spine.mjs` code is merge-quality — I would approve it on its own (0 Critical, 0 High between two independent passes). **But the CI `visual` gate is red**, and the PR body's validation section is contradicted by CI. Neither is a defect in this PR's code.

To be precise about the mechanics: `gh pr view` reports `mergeable: MERGEABLE`, `mergeStateStatus: UNSTABLE` — the `visual` check is **not a required status check** (no branch protection on this solo repo), so **GitHub will not hard-block the merge**. This is blocked by the repo's *convention* (D11's VR freeze isn't implemented, so a red VR gate is treated as must-fix — the plan says so). The merge call is therefore yours — but merging while the gate is flaky-red **ships the flake to `main`**, so the right move is to get it green first. Details below.

---

## The blocker: CI `visual` (VR) gate is failing — and the PR body says it passes

CI run [`29994726950`](https://github.com/linardsb/ux-factory/actions/runs/29994726950) ran against the **exact PR HEAD `7131975`**:

| CI job | Result |
|---|---|
| `verify` (drift-check + token-lint) | ✅ pass |
| `visual` (VR gate — **blocking on this branch**, D11 freeze not implemented) | ❌ **fail** |

The PR body claims *"VR (Docker / Linux baselines): 18/18 pass."* CI disagrees.

**Root cause — non-determinism rooted in pre-existing VR-harness fragility that #72 doesn't touch:**
- 1st run failed on `approach · neutral`; I re-ran the failed job and it failed again on **`approach · saulera`** — same page, **different pack each run**, identical signature: *"Failed to take two consecutive stable screenshots"* (~833/822 then ~841/835 px, ratio 0.01). Same test failing on a *different pack each run* is the definitive signature of non-determinism (a flake), not a deterministic regression.
- Mechanism: `approach.html` animates its loc numbers with `countUpOnVisible()` (`system/motion.mjs`, rAF-based). Playwright's `animations:'disabled'` does **not** freeze `requestAnimationFrame`, and the gate's `reducedMotion:'reduce'` is an empirical no-op (captures under no-preference — repo memory `vr-gate-captures-no-preference`), so the count-up runs live during capture and races the 5 s stabilization window. `retries` is unset (**0**) in `playwright.config.mjs`, so one lost race = red. This fragility is pre-existing — `#72` touches neither `approach.html`, `motion.mjs`, nor `playwright.config.mjs`; it only changed the loc *numbers* (9,100→9,200; 36→37, same glyph count → no effect on count-up timing) and regenerated the `approach` baselines. The plan itself already flagged a VR-infra follow-up (D11 / #82).
- **Observed, not explained:** `approach` is mostly-green on `main` but failed **2/2** on this branch. I have no mechanism by which #72 would raise the flake *rate* (the number change can't alter count-up timing), and it doesn't change the verdict (the gate is red either way and the fix is identical) — noting it for honesty, not asserting #72 is causally clean on frequency.

**Why "just re-run until green" is not sufficient:** it failed on two consecutive CI runs. The count-up race is hitting often on GitHub's runners, so the gate needs an actual stabilization fix, not luck.

### Required to merge
1. **Stabilize the blocking VR gate.** Minimal: add `retries: 2` to `tooling/visual-regression/playwright.config.mjs`. Better: make the loc count-up render its final value under the gate (respect the reduced-motion emulation, or a gate flag) so `approach` is deterministic. Fold into this PR (it already edits the VR surface) **or** land a tiny infra PR (#82) first. Either way the `visual` check must be green before merge.
2. **Correct the PR body.** "VR 18/18 pass" is contradicted by CI. State the flake honestly per the repo's honesty contract.

---

## Validation (independently verified, not taken from the report)

| Check | Result | How verified |
|---|---|---|
| `node --check system/spine.mjs` | ✅ | run |
| Node-import safety | ✅ | `import()` → `function function`; self-boot no-ops without DOM |
| `derive(CANNED_AXES)` | ✅ | accent `#2f7a4d` (= verdant pack), **12/12 WCAG pairs AA**, 21 `color-*` flushed |
| `token-lint` | ✅ | 61 tokens · 0 undeclared · 0 orphan · DTCG valid |
| `gen-loc-summary --check` | ✅ | no drift (37 files / 9,200 lines is real generator output) |
| `drift-check` (clean worktree @ `7131975`) | ✅ | all 8 steps green |
| CI `verify` | ✅ | pass |
| CI `visual` (blocking) | ❌ | see blocker above |

*Working-tree note:* running `drift-check` in the main tree false-reds on `system-graph` because a **parallel session's uncommitted `components.css` edit (−49 lines)** contaminates the tree. Proven not-#72 by re-running in a clean detached worktree at `7131975` (fully green). The parallel session's edits (`approach.html`, `components.css`, `work.html`) were never staged, stashed, or touched.

---

## Code issues by severity (spine.mjs + wiring)

### Medium
**1. dock ↔ spine coordination gap during a beat's hold.** `system/spine.mjs:121-140` vs `system/dock.mjs:49-66`. Spine applies the canned brand as **inline** `:root` custom props, which beat an external stylesheet in the cascade. If a reader switches packs via the dock while the hero is holding (`HOLD_MS = 1200`, plus crossfades), the dock's `<link>` swap happens correctly underneath but the paint stays on Verdant until spine's own revert fires (~1.2–3 s later). **Self-healing** (localStorage + link href are correct throughout; only the paint is briefly stale) → Medium, not higher. Matters more once #73/#75/#77 add beats touching the same chrome. *Fix (pick one):* (a) a comment near `heroBeat`/`applyPack` documenting the accepted trade-off, or (b) have `applyPack` clear `:root` inline `--color-*` overrides before swapping the link so a user-initiated pack change always wins immediately. **A document-or-defer decision, not a required code change.**

### Low
**2. Stale comment now contradicts this commit.** `index.html:47-48`: *"system/spine.mjs does NOT exist yet — #72 adds it… Do not reference it here."* This PR **is** #72 and adds both the file and the `<script>` tag. *Fix:* update/delete that sentence (e.g. "system/spine.mjs — added by #72; the beat-orchestration seam + Beat 1").

**3. VR wall-clock cost (accepted).** `tooling/visual-regression/visual.spec.mjs:22`. The `waitReady` correctly kills the race but makes each `index` capture block for real `HOLD_MS` + assembly-settle + crossfades (~+2.5–3 s/pack). Inherent to the design; nothing to fix now — track as beats compound.

**4. Report cites a stale commit hash.** `.claude/reports/v3-hero-choreography-report.md` references `16d0f52`; the PR HEAD is `7131975` (commit likely recreated during the clean-worktree procedure). Harmless, worth a one-line correction.

---

## What's good

- **`heroBeat` correctness is verified, not assumed.** Both passes traced every path (reduced-motion early-return, happy path, `derive()` throw, mid-crossfade throw): the `finally` revert always runs *before* `data-spine="ready"` with no `await` between, `removeProperty` is idempotent against partial application, and there is **no path where `ready` is set while `:root` is still branded**. No stuck-branded rest≠final state.
- **`assemblySettled` is bounded** — quiesce-debounce + safety cap funnel through one guarded `finish()`; listener always removed; the infinite pill `breathe` never fires `animationend` so it structurally can't block quiescence (scoped correctly, not accidentally safe).
- **VR determinism holds by construction.** `waitReady:'#beat-hero[data-spine="ready"]'` is set only after the revert crossfade's `.finished`; Playwright applies `animations:'disabled'` at capture time, not during `waitFor`, so the real ~2.5 s sequence runs and the capture lands on the reverted committed pack. Corroborated by `index-{neutral,saulera}` being byte-identical in the report's Docker run.
- **Honesty contract upheld.** `CANNED_AXES` matches `scenarios/verdant/intake.defaults.json` exactly (real, previously-validated `derive()` input — the one that produced the shipped `tokens.verdant.css`); real engine at view time; `color-*`-only filter; `removeProperty`→active-pack revert (verified reverts to saulera amber, not hard-coded neutral).
- **Idioms mirrored faithfully:** `crossfade()` matches `dock.mjs`'s `startViewTransition && !reduce` guard; error handling bifurcated correctly (plain path-naming `Error` for misuse, caught+logged for view-time failures, per `action-bus.mjs`/`factory-intake.mjs` precedent); Node-import guard precedes every DOM touch; feature-file header cites the governing epic/ticket/PRD.
- **Documented plan deviations are all sound** (verdant axes, quiesce-debounce, guaranteed revert, plain-JS timing consts, force-regen of approach baselines) — intentional decisions, not findings.

---

## Summary

- **Code:** 0 Critical · 0 High · 1 Medium · 3 Low. Genuinely well-built and unusually well-verified.
- **Blocker:** the **CI `visual` gate is flaky-red** on the PR HEAD (non-deterministic `approach` count-up race, pre-existing `retries:0` fragility #72 doesn't touch), and the PR body overclaims VR status. The code is not at fault; GitHub won't hard-block (UNSTABLE, not a required check), but repo convention says green-VR-before-merge — merging red ships the flake to `main`.
- **Path to green:** stabilize the VR gate (add `retries`, or freeze the loc count-up under the gate) + correct the PR body. Optionally clean the `index.html:47-48` comment and the report hash, and decide on the dock/spine Medium.

*Fresh-eyes review by piv-review-pr + the `code-reviewer` agent. A human makes the final merge call.*
