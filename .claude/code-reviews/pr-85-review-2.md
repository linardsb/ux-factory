# PR #85 Re-review — v3 hero choreography + live `derive()` re-skin + beat-orchestration seam (#72)

**Branch:** `feature/v3-hero` · **HEAD:** `f63d051` · **Base:** `main` · **Reviewer:** piv-review-pr (fresh context)
**This is a re-review** of the fix commit `f63d051`, which was pushed to resolve the first review's findings (`pr-85-review.md`, against `7131975`). The first pass — code-reviewer-agent-backed — approved the `spine.mjs` code on its own (0 Critical · 0 High) and requested changes only for two non-code blockers + 3 Low. I re-verified every claimed fix independently and empirically.

## Recommendation: ✅ Approve

Both blockers are resolved, the two trivial Lows are fixed, the Medium is defensibly deferred, and the code was already merge-quality. All local blocking gates are green at `f63d051` in a clean worktree, and — critically — the CI **workflow run now passes** (`conclusion: success`) on the PR HEAD. Nothing critical/high remains. A human makes the final merge call.

*(Posted as a comment, not a formal GitHub approval: this is a self-authored PR — GitHub disallows approving your own PR on a solo repo. The verdict is Approve.)*

---

## The prior review's two blockers — both resolved

### Blocker 1 — red CI `visual` gate (was: "blocking by repo convention") → RESOLVED via the D11 VR-freeze

`f63d051` adds to `.github/workflows/verify.yml` (`visual` job):
```yaml
continue-on-error: ${{ startsWith(github.head_ref, 'feature/v3-') }}
```
This is the D11 VR-freeze the epic architecture called for but that was never wired in. **Verified empirically against the PR HEAD** (CI run [`30005949284`](https://github.com/linardsb/ux-factory/actions/runs/30005949284), `headSha f63d051`):

| Signal | Value | Meaning |
|---|---|---|
| Workflow **run** conclusion | ✅ `success` | the freeze took effect — `visual`'s failure no longer fails the run |
| `verify` job | ✅ `success` | drift-check + token-lint still block (correctly untouched) |
| `visual` job | ❌ `failure` | still **runs and reports** (D11's intent: regressions stay visible) |
| `mergeStateStatus` | `UNSTABLE` (not `BLOCKED`) | PR is mergeable |

Semantics are correct on every path:
- **This PR (`feature/v3-hero` → main):** `startsWith('feature/v3-hero','feature/v3-')` = `true` → `continue-on-error: true` → run passes. ✓
- **Push to `main` (post-merge):** `pull_request` didn't fire; `github.head_ref` is empty → `startsWith('','feature/v3-')` = `false` → **VR blocks on main as normal.** ✓ (main is never frozen.)
- **Any non-v3 PR branch:** head_ref doesn't match → `false` → blocks. ✓

**One expectation-setting note (not a defect):** job-level `continue-on-error` prevents the *workflow run* from failing, but the *per-job* `visual` check still displays its true `failure` conclusion — so `gh pr checks` / the PR checks UI will still show a red ✗ on `visual`. That is standard GitHub behavior and exactly matches D11's "the gate still RUNS and reports." The merge is gated by the overall run (green) + the absence of branch protection, so the red per-job X is informational, not blocking. `#82` removes this line and full-regens baselines + re-blocks VR at the final v3 merge (documented in the workflow comment and the commit body).

**Decisive check — *what* the frozen `visual` failure actually contains (verified on the PR-HEAD run, not inherited from the prior review's different run):** the freeze's whole justification is "the red is a benign flake on a page #72 doesn't touch." That only holds if the failure is NOT an `index-*` capture — an `index` failure would mean the hero re-skin isn't reverting before capture in CI, i.e. a real #72 regression the freeze would then silently mask. Pulled the per-snapshot results from run `30005949284` (`f63d051`):

- **17 passed · 1 failed.** The **only** failure is **`approach · saulera`** — `approach-saulera.png`, *"Failed to take two consecutive stable screenshots"* (the count-up race signature).
- **`index · neutral` ✓ (4.2 s) and `index · saulera` ✓ (4.5 s) both PASS** — byte-stable against the committed baselines. The ~4 s durations are consistent with the full assembly-settle → flush → 1.2 s hold → revert → `waitReady` sequence running for real, then the capture landing on the reverted committed pack. **#72's core correctness property (clean revert before capture) holds in CI; the freeze masks no #72 regression.**
- The flake hit **`approach · saulera`** here vs. **`approach · neutral` then `approach · saulera`** in the prior review's run — a *different pack across runs*, the definitive signature of non-determinism (a flake), not a deterministic regression. Reconfirmed on the current HEAD, independently of the author's local "18/18" claim (repo memory `vr-gate-approach-countup-flake`: "local Docker pass ≠ CI green").

### Blocker 2 — PR body overclaimed "VR 18/18 pass" → RESOLVED

The PR body's Validation section now states honestly that CI's `visual` gate flakes red on a **pre-existing** non-deterministic `approach.html` count-up race (rAF loc-number count-up vs. Playwright `retries:0`, captured under no-preference), that #72 touches neither `approach.html`/`motion.mjs`/`playwright.config.mjs`, and that the branch now carries the planned VR freeze. This matches the honesty contract and my own read of the flake (consistent with repo memory `vr-gate-approach-countup-flake`).

## The prior Low/Medium findings

| # | Finding | Status | Verified |
|---|---|---|---|
| Low 1 | Stale `index.html` comment "spine.mjs does NOT exist yet" | ✅ **Fixed** | Diff now reads "spine.mjs is present (#72…)"; keeps the placeholder-honesty rule for still-unwired beats; net-zero line change (loc-summary stays valid — drift-check green) |
| Low 3 | Stale report hash `16d0f52` | ✅ **Fixed** | Now `7131975` in both report references |
| Medium | dock↔spine paint-staleness during the hero hold | ⏸ **Deferred (accepted)** | Self-healing (localStorage + link href stay correct; only paint is briefly stale). The first review itself labeled it *"document-or-defer, not a required code change"* and *"matters more once #73/#75/#77 touch the same chrome."* Deferring to those tickets, where the coordination fix belongs, is sound. |
| Low 2 | VR wall-clock (+~2.5–3 s/`index` capture from `waitReady`) | ⏸ **Noted** | Inherent to the design; nothing to change now |

## Independent verification (this pass, at `f63d051`)

Run in a **clean detached worktree** at `f63d051` (the main tree carries a parallel session's uncommitted `components.css`/`approach.html`/`work.html` edits that false-red `drift-check`'s system-graph step — those edits are **not** part of PR #85 and were never staged, stashed, or touched):

| Check | Result |
|---|---|
| `node --check system/spine.mjs` | ✅ |
| Node-import safety (`import()` self-boot no-ops without DOM) | ✅ `function function` |
| `node tooling/drift-check.mjs` | ✅ all steps: syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✅ 61 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| CI `verify` (drift + token-lint) | ✅ pass |
| CI `visual` | ❌ per-job fail (frozen — run passes; see Blocker 1) |

I also re-traced the core `spine.mjs` correctness the first review flagged as verified, and concur:
- **`heroBeat` has no stuck-branded state.** The `finally` force-removes any still-applied `color-*` props and sets `data-spine="ready"` on every path (reduced-motion early-return, happy path, `derive()` throw, mid-crossfade throw). `ready` is only reached after the revert; `removeProperty` is idempotent against partial application.
- **`assemblySettled` is bounded** — the infinite pill `breathe` never fires `animationend` so it can't block quiescence; the safety cap guarantees resolution (`ready` can't hang).
- **VR determinism holds by construction** — `waitReady:'#beat-hero[data-spine="ready"]'` resolves only after the revert crossfade's `.finished`; `animations:'disabled'` applies at capture, not during `waitFor`, so the real sequence runs and the capture lands on the reverted committed pack.
- **Idioms faithful** — `crossfade()` mirrors `dock.mjs`'s `startViewTransition && !reduce` guard; error handling bifurcated correctly (plain path-naming `Error` for misuse, caught+logged for view-time failure); `CANNED_AXES` = `scenarios/verdant/intake.defaults.json` (a real, previously-validated engine input).

## What's good

- The fix commit is **surgical and honest**: 6 lines of well-commented CI config + a comment correction + a hash correction — every changed line traces to a review finding. No scope creep into the (already-approved) `spine.mjs`.
- Pulling the D11 freeze forward from `#82` is a defensible response to the blocker: it's the architecture's sanctioned mechanism, correctly scoped to `feature/v3-*` only, leaves `main` blocking, and unblocks the whole v3 track (#73/#75/#77 churn baselines identically). The forward-cleanup obligation is explicitly parked on `#82` in both the workflow comment and the commit body.
- The deferred Medium and noted Lows are dispositioned exactly as the first review recommended.

## Summary

- **Delta reviewed (`f63d051`):** 0 Critical · 0 High · 0 new Medium · 0 new Low.
- **Prior blockers:** both resolved and empirically confirmed (CI run passes on HEAD; PR body honest).
- **Prior Lows:** 2 fixed, 1 noted; **prior Medium:** deferred with justification.
- **Path:** ready to merge. The per-job `visual` red ✗ is expected/frozen, not a defect; `#82` re-blocks VR + regens baselines at the final v3 merge.

*Fresh-eyes re-review by piv-review-pr. A human makes the final merge call.*
