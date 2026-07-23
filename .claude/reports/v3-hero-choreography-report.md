# Implementation Report — v3 hero choreography + one real re-skin beat (#72)

**Plan**: `.claude/plans/v3-hero-choreography.md`   **Branch**: `feature/v3-hero` (off `feature/v3-spine-skeleton` tip; #71 unmerged)   **Status**: COMPLETE

## Summary

Added `system/spine.mjs` — the v3 spine's beat-orchestration **seam** (`registerBeat`/`getBeat` + a shared `IntersectionObserver` activator, once-guarded, effect and analytics each fail-closed) **and** Beat 1, the hero re-skin. After the inherited CSS entrance cascade settles, the real `derive.mjs` engine runs on the committed Verdant brand and the `color-*` subset flushes across the whole page (`:root`) through a guarded `startViewTransition` crossfade (the `dock.mjs applyPack` idiom), holds ~1.2s, then reverts to the active pack via `removeProperty`. The hero dogfoods the seam (`activateOn: 'load'`); #73/#75/#77 register through the same API. `rest == final`: reduced-motion and no-JS render #71's neutral hero with no re-skin, and the VR capture is pinned to the reverted state by a `data-spine="ready"` handle.

Everything is committed atomically as `7131975`. No new dependency, no new token, vanilla only.

## Tasks completed

- Task 1 · perf spike (headless, 4×/6× CPU throttle) → recorded below
- Task 2 · the seam → `system/spine.mjs` (CREATE) — `registerBeat`/`getBeat`/observer/`activate`
- Task 3 · the hero beat → `system/spine.mjs` (same file) — `heroBeat`/`assemblySettled`/`hold`/`crossfade` + `derive` import
- Task 4 · wire the module → `index.html` (UPDATE) — one `<script type="module" src="/system/spine.mjs">`
- Task 5 · deterministic capture → `tooling/visual-regression/visual.spec.mjs` (UPDATE) — `waitReady: '#beat-hero[data-spine="ready"]'` on `index`
- Task 6 · new motion token → **not triggered** (composed with plain JS timing consts; no CSS token added — Task 6's default path)
- Task 7 · `system/loc-summary.json` (UPDATE) — regenerated after `git add`; runtime 36→37 files, 9,100→9,200 lines
- Task 8 · VR baselines — the two `approach.html` baselines regenerated (Docker); `index` baselines verified stable
- Task 9 · manual/behavioural validation → below

## Tests added

No unit suite in this repo (CLAUDE.md: "run the surface you touched"). Verified behaviourally with a throwaway Playwright harness (headless Chromium, the visual-regression install; not committed):

- **A · normal load** — branded green `#2f7a4d` flushes onto `:root`, then reverts; at `ready` inline `--color-accent` is `""` and the computed accent is back to committed neutral `#2563eb`. PASS
- **B · reduced motion** — no flush ever; `data-spine="ready"` set; final state instant. PASS
- **C · seam smoke test** (the paths the hero does NOT exercise, that #75 depends on) — a `'visible'` beat is inert out-of-view, activates once on scroll, analytics fires once, once-guard holds on re-scroll. PASS
- **D · spike** — see below.
- **E · no-JS** — static neutral hero renders, no `data-spine` attribute, CTA link resolves, zero page errors. PASS
- **F · pack interplay** — under the saulera pack (set via pack-boot `localStorage`), the green flushes then reverts to **saulera's amber `#F59E0B`**, not neutral's blue — `removeProperty` lands on the active pack. PASS
- **G · seam fail-safe** — an effect that throws is swallowed at `activate` (analytics still fires once, beat marked activated, no unhandled page error). "Nothing fails on stage." PASS

**Cross-engine matrix** — A/B/C/E/F/G re-run under all three real engines (headless): **Chromium ✓ · Firefox ✓ · WebKit (Safari's engine) ✓** — no hang, no module-load/MIME failure, no layout break, correct flush→revert and saulera revert in every engine. WebKit and Firefox both support `startViewTransition` (crossfade); the snap fallback stays code-covered by the guard. Only *perceptual* smoothness is left for a human/owner eye.

## Validation results

- **Spike (Task 1 acceptance criterion)** — headless Chromium, CDP `Emulation.setCPUThrottlingRate`, measuring main-thread rAF frame gaps in the **re-skin window** (flush → hold → revert), isolated from page bootstrap:
  - **4× throttle (realistic mid-tier):** median 16.7ms (60fps), p95 33.4ms, **worst frame 33ms, zero frames >50ms.**
  - **6× throttle (severe):** median 16.7ms, p95 33.4ms, **worst frame 50ms** (single frame at flush kickoff: `derive()` + 21 `setProperty` + whole-page VT snapshot), **zero long tasks (>50ms).**
  - Bootstrap long frames (150–266ms) are pre-existing `site.js`/`dock.mjs` chrome injection, not #72's code. The VT crossfade itself is compositor-driven. **Verdict: 60fps at realistic throttle, graceful bounded degradation at 6×; no simplification needed.** Mechanism is production-proven (`dock.mjs applyPack` ships the identical whole-page guarded VT).
- **Blocking gates** (run in a clean temp worktree — see Issues): `node tooling/drift-check.mjs` → ✓ all 8 steps (syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces); `node tooling/token-lint.mjs` → ✓ 61 contract tokens · 0 undeclared · 0 orphan · DTCG valid.
- **Level 1 syntax** — `node --check system/spine.mjs` ✓; Node-import safety `import(...) → function function` (self-boot no-ops without a DOM) ✓.
- **VR (Docker, Linux baselines)** — `npm run update:docker` → 18/18 pass; only `approach-neutral.png` + `approach-saulera.png` changed (the loc number); `index-neutral/saulera` byte-identical (rest==final holds; the transient re-skin reverts before capture). A clean non-update Docker run passes 18/18 against the regenerated baselines.
- **CANNED_BRAND** — `derive({brandColor:'#2f7a4d', density:'comfortable', rewardType:'self', frequency:'daily'})` throws nothing; all WCAG pairs pass AA; accent → `#2f7a4d` (matches the committed verdant pack).

## Deviations from the plan

1. **CANNED_BRAND axes = the real Verdant scenario axes** (`#2f7a4d` / comfortable / self / daily, from `scenarios/verdant/intake.defaults.json`) rather than the plan sketch's placeholder `comfortable/hunt/weekly`. The spine's running fictional product IS Verdant (plant-care), so the real scenario axes make the hero a truthful preview and yield the same accent as the committed `verdant` pack. `color-*` output depends only on `brandColor`, so the other axes don't change the visual (verified). More honest + consistent; advisor-endorsed.
2. **`assemblySettled` uses a quiesce-debounce**, resolving 120ms after the *last* `animationend` to bubble from the hero (capped at a 1200ms safety), instead of the plan's literal "animationend of the last container child." The literal last child (`.hero-cta-row`) ends ~690ms — mid-`hl-draw` (~960ms); the debounce waits for the **complete** cascade so the re-skin cleanly follows the whole assembly. Hero-local, not part of the seam contract. The safety cap guarantees resolution (`ready` can never hang) and the listener is removed on finish. Advisor-endorsed.
3. **Guaranteed revert** — `heroBeat` tracks the applied entries and force-removes them in a `finally`, so the committed pack is restored even if `hold`/revert somehow throws (no "stuck-branded" rest≠final bug). A small robustness addition beyond the plan sketch, per advisor.
4. **Committed during implement** — the atomic commit + VR baseline regen happened here (Phase 4) rather than deferring to `piv-commit`, because the shared worktree carried an unrelated parallel session's uncommitted edits; committing my explicit paths first was required to spin a **clean** temp worktree for an uncontaminated Docker baseline regen. `piv-commit` is therefore already satisfied.
5. **`HOLD_MS` / `ASSEMBLY_*` are plain JS constants**, not CSS tokens (mirrors `analytics.mjs` `RESTORE_DELAY_MS`) — JS-sequencing values, not animation tokens, so Task 6's token pipeline stays untriggered by design.
6. **`approach` baselines force-regenerated** — the loc digit change (36→37, 9,100→9,200) was below `maxDiffPixels:100`, so `update:docker` skipped the rewrite (the `vr-update-skips-subperceptual` trap); I `rm`'d the two PNGs and re-ran to capture the truthful 9,200 render.

## Issues encountered

- **Shared-worktree contamination (handled).** The working tree carried a parallel session's uncommitted deletions (`approach.html −15`, `system/components.css −49`, `work.html −14`). These are not #72's. Two consequences, both handled: (a) local `drift-check` was red on `system-graph` (which reads the working-tree `components.css`) — proven 100% theirs by momentarily restoring `components.css` to HEAD (drift-check went fully green); (b) `update:docker` renders the working tree, so regenerating baselines in-place would have baked in their deletions. Both were avoided by staging **only my explicit paths**, committing, then validating gates + regenerating VR baselines in a **clean detached temp worktree** at my commit, and copying just the two changed PNGs back. The parallel session's changes were never staged, stashed, or otherwise touched (verified intact after).
- **Fresh-worktree deps.** The temp worktree needed `npm install` in `tooling/style-dictionary` for the `drift-check` token-css step; the Docker VR run does its own `npm ci` inside the container, so the host needed nothing further.

## Remaining — perceptual sign-off only (flagged, per honesty contract)

- **Functional cross-engine coverage is done** (Chromium + Firefox + WebKit, headless — matrix above). What is NOT done: a human/owner look at *perceptual* smoothness — is the whole-page crossfade buttery on real hardware, does the branded hold feel right. That is genuinely a human/owner call and is legitimately deferrable to review. (Older WebKit/Safari without View-Transition support would snap instead of crossfade — code-covered and acceptable by design; current WebKit crossfades.)

## Acceptance criteria

- [x] Hero animates from a designed start to #71's exact final state; `index` VR baseline stable (byte-identical).
- [x] `spine.mjs` exposes a documented seam (`registerBeat`/`getBeat`/observer) that #73/#75/#77 can consume; the hero registers through it.
- [x] Re-skin applies a real derived pack (`derive.mjs` on the committed Verdant brand) across `:root`, `color-*` only, then reverts to the active pack.
- [x] Every live moment wraps `try/catch` and falls back to the committed pack; nothing fails on stage (checks B/G).
- [x] Reduced-motion and no-JS render the neutral hero with no re-skin (checks B/E).
- [x] 60fps under throttle (4×) / bounded transient at 6×; spike outcome recorded above and in the PR.
- [x] Craft bar green; functional coverage across **Chromium + Firefox + WebKit** (headless matrix) — perceptual smoothness left for owner sign-off (see above).
- [x] `loc-summary.json` regenerated after `git add`; two `approach.html` baselines regenerated; drift-check + token-lint green.
- [x] No new motion token added.

## Ready for the next step

Work is committed atomically as `7131975` on `feature/v3-hero`. Next: `piv-create-pr` (this report fills the PR body; the PR closes #72 and should carry the spike outcome + the Chromium/Firefox/WebKit functional matrix, noting perceptual smoothness is left for owner sign-off), then `piv-review-pr`.
