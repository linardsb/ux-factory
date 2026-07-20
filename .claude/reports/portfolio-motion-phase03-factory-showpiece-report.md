# Implementation Report — Portfolio Motion Phase 3: Make the Factory Page *Perform*

**Plan**: `.claude/plans/portfolio-motion-phase03-factory-showpiece.md`
**Branch**: `feature/portfolio-motion-phase03-factory-showpiece` (built in an isolated git worktree — see Issues)
**Status**: COMPLETE

## Summary

Layered presentation-only motion onto the flagship Factory page and the two view-time modules it
drives, using only the idioms Phases 0–2 established. Four moves shipped: (1) the live re-skin now
**interpolates** `#reskin-preview`'s token-driven colours instead of snapping; (2) the trace player
gained an optional, pausable **Play mode** with a progress fill spanning the four PIV acts and a
fade+rise on each step card; (3) wizard steps, the ethics-quadrant selection, and the WCAG check
rows now enter with choreography; (4) the trace-response `<details>` expand animates where the
platform supports it. No derived value, trace datum, ethics verdict, or page copy changed — it is
the real derivation and the real curated run, made visible. All motion is
`prefers-reduced-motion: no-preference`-gated with rest state == final state, and every new at-rest
control is reduced-motion-gated in JS.

**One decision was escalated to the user** (VR zero-churn proved unmeetable for the Play controls —
see Deviation 5) and resolved as *keep the feature + regen two factory baselines*.

## Tasks completed

- Task 1 — arm `.is-animated` one frame after first settle → `system/factory-intake.mjs` (UPDATE)
- Task 2 — re-skin transition (scoped, `no-preference`-gated) → `factory.html` `<style>` (UPDATE)
- Task 4 — Play mode: reduced-motion gate, Play/Pause toggle, progress fill, autoplay timer,
  `apply(scroll, block)`, `stop()` on all manual nav, `clearInterval` in `destroy()` →
  `system/trace-player.mjs` (UPDATE)
- Task 5 — trace step-entrance keyframe + progress-fill classes → **both** `factory.html` and
  `trace.html` `<style>` (UPDATE ×2)
- Task 6 — wizard `.fw-card` entry + `.fw-quadrant.is-selected` pop keyframes → `factory.html` (UPDATE)
- Task 7 — WCAG row `--i` stagger index (`.map((c, i) => … style="--i:${i}"`) → `factory-intake.mjs` (UPDATE)
- Task 8 — WCAG row stagger keyframe (`fw-row-in`, `calc(var(--i,0) * --motion-stagger)`) → `factory.html` (UPDATE)
- Task 9 (optional) — `@supports`-gated `<details>` disclosure → **both** `factory.html` + `trace.html` (UPDATE ×2)

All Phase-3 CSS is grouped into one clearly-delimited, pattern-cited block at the end of each
`<style>` (Deviation 2). No new files, no new tokens, no generator regen (AC #10).

## Tests added

No unit-test suite exists (project convention: "run the surface you touched"). Verification was
**a scripted Playwright behaviour harness** (temporary, deleted after use) + **the Docker/Linux
visual-regression gate**. The harness drove `/factory` in two media contexts and asserted concrete
facts (computed styles, DOM presence, step advancement, console errors) rather than eyeballing motion.

**Interactive harness — 20/20 checks PASS** (Chromium, against the built worktree source):
- AC1: `.feature-band` transition wired (`background-color, color, border-color`); `.is-animated`
  armed after first settle; scenario toggle re-skins the dark band (`rgb(24,34,27) → rgb(39,29,23)`).
- AC2: Play present under no-preference; relabels to Pause; autoplay advances (1/23→2/23); fill
  width tracks (8.7%); Pause stops; manual Next stops autoplay.
- AC3: wizard Next advances the prompt; ethics quadrant sets `aria-pressed` + `.is-selected`; every
  WCAG row carries a `--i` index (12 rows). Keyframe wiring confirmed: `.fw-card→fw-step-in`,
  `.fw-checks tr→fw-row-in`, `.trace-step→trace-step-in`, `.fw-quadrant.is-selected→fw-pop`.
- AC6 (reduced-motion): `matchMedia` reports reduce; **Play button + progress fill ABSENT**;
  Next ▶ still advances; nothing stuck invisible (step/card/row all `opacity: 1`).
- No unexpected console errors (the only errors are the by-design proto-iframe API fallbacks).

## Validation results

- **Syntax**: `node --check system/factory-intake.mjs` ✓ · `node --check system/trace-player.mjs` ✓
- **Module DOM-safety**: `import('./system/trace-player.mjs')` under Node ✓ (no `matchMedia` at import)
- **Live surface**: `/factory` + `/trace` render; interactive harness 20/20 ✓
- **Visual-regression gate (Docker/Linux, the churn verdict)**:
  - Pristine origin/main factory render == committed baseline (noise floor confirmed) ✓
  - My source vs **regenerated** factory baselines → **2 passed (green)** ✓
  - Full 16-shot suite → see COMPLETION note (other 14 baselines untouched; only `factory-neutral`
    + `factory-saulera` regenerated, by design).
- **Honesty spot check**: no derived value / trace JSONL / copy changed — diff is presentation CSS +
  the Play control UI only (AC #9) ✓

## Deviations from the plan

1. **Shipped token names** (planned): used `var(--motion-slow)` / `--motion-base` / `--motion-fast`,
   not the input's stale `--motion-duration-*`. Confirmed against `tokens.neutral.css:60-67`.
2. **CSS organization** (intentional): grouped all Phase-3 motion into ONE labeled block at the end
   of each `<style>` (each item citing its pattern reference), rather than scattering additions per
   the plan's per-task line refs. Rationale: it makes the zero-churn contract auditable in one place
   — a reviewer can confirm *every* entrance is `no-preference`-gated by scanning a single block.
3. **Task 2 selector refinement** (invited by the plan's "refine against the actual markup"): added
   `h4` (used by `.feature-item h4`), `.amber` (the literal "Accent as text" demo —
   `derive.rules.mjs:187` names it a checked accent pair), and the root `#reskin-preview.is-animated`
   itself (its `background: var(--color-bg)`). All are colour-driven surfaces in the real preview
   markup; none match `<a class="btn">`, so the button hover-transform is preserved.
4. **Item 4 scope** (plan's Q3 default): shipped the `@supports`-gated `<details>` expand; **cut**
   the handoff-viewer crossfade.
5. **⚠ VR zero-churn proved UNMEETABLE for the Play controls → user-approved baseline regen.**
   The plan's hard constraint was "all motion, zero at-rest change," premised (assumption #2) on the
   VR gate capturing under reduced-motion. **That premise is factually wrong.** I proved, under the
   real `playwright.config.mjs`, that `matchMedia('(prefers-reduced-motion: reduce)').matches` is
   `false` and CSS resolves the `no-preference` branch — i.e. the gate captures the page as a
   *no-preference* user sees it. What actually delivers the repo's zero-churn is
   `toHaveScreenshot({ animations: 'disabled' })` (freeze-to-final) **+ rest == final**, not
   reduced-motion emulation. Consequences:
   - Items 1, 3, 4 and every keyframe entrance are **clean** (frozen to their final state → zero
     churn), which is why 14 pages + factory's non-control regions pass untouched.
   - The **Play button + progress fill** are the only *new at-rest DOM* elements; being visible to a
     no-preference user, they legitimately appear in the capture and shift the two factory baselines
     by ~450px (localized to the controls row; the raw full-page diff also shows ~4k px of
     *anti-aliasing* on the hero/footer that Playwright's AA-aware pixelmatch **ignores** — the gate
     flagged only the 429/475 px controls region).
   - Real reduced-motion users are unaffected: verified via `newContext({reducedMotion:'reduce'})`
     that `matches` is `true` and no Play control renders — the UX decision works in reality.
   - Per stop-and-flag on an unmeetable hard constraint, I escalated to the user (`AskUserQuestion`).
     **User chose: keep Play + regen the two factory baselines** (AC #7 explicitly provides for a
     deliberate, same-PR regen). Regenerated `factory-neutral.png` + `factory-saulera.png` via the
     Linux/Docker path; a subsequent gate run is **green**. Per the advisor, I did **not** attempt to
     "fix" the config's reduced-motion no-op — doing so would flip every `no-preference` entrance from
     frozen-to-final to reduce-static and churn ~12 baselines (e.g. `hl-draw` renders a different box
     under reduce). Assumption #2 is a **pre-existing gate hole**, reported but out of scope for a
     motion PR.

## Issues encountered

- **CSS comment `*/` bug (found + fixed during validation).** My Item-1 comment contained
  `color-bg*/color-fg*` — the `*/` **prematurely closed the CSS comment**, and the trailing garbage
  silently dropped the entire re-skin `@media` block (so the dark band would have *snapped*, not
  glided). Caught by the interactive harness (`.feature-band` computed `transitionProperty: "all"`),
  root-caused, and fixed (comment rewritten without `*/`). Re-verified: transition now lands and all
  four keyframes wire up. This changes **no** captured pixels (transitions are frozen at capture), so
  it does not affect the baseline.
- **Shared working directory / branch switch → isolated in a worktree.** A parallel session building
  an unrelated "annotated-source glossary" feature shares this working directory and, mid-session,
  **switched the shared tree's branch** to its own (`feature/annotated-source-glossary`) and committed,
  leaving my Phase-3 edits stranded on the wrong branch — and my first (shared-tree) baseline regen
  ran against its in-flight `portfolio.css`, producing a polluted diff. Per memory
  `shared-worktree-parallel-sessions`, I recovered by creating a **temp git worktree**
  (`ux-factory-wt-phase03`) on my own branch off `origin/main`, replaying only my 4-file patch there
  (zero parallel content — verified `approach.html`/`portfolio.css` are pristine origin/main), and
  doing the clean regen + all final validation in that worktree. **This is where the work lives for
  `piv-commit`.** Stage by explicit path — do NOT sweep the parallel session's files.

## Items needing the user's eyes (cannot verify headlessly)

- **AC #5 — Safari + Firefox.** Only Chromium was driven (headless). Firefox lacks
  `@supports (interpolate-size)` → the `<details>` degrades to today's snap (by design); nothing else
  should differ, but cross-browser confirmation is the user's call.
- **AC #8 — colour-picker drag feel.** The transition mechanism is verified wired, but whether the
  ~480ms chase during a continuous colour drag reads as intentional or laggy is the one genuinely
  subjective call. Shipped the plan's default (`--motion-slow`); the drag-suppression contingency
  (Task 3a) is **not** applied. If it reads laggy, applying 3a (or dropping to `--motion-base`) is a
  small, localized follow-up.
- **AC #4 — `<details>` expand animation.** Wired + `@supports`-gated; the smooth-expand is
  Chromium-recent and best confirmed by eye.

### Ready for the next step

All planned tasks are implemented and validated; the VR gate is green with the two deliberately
regenerated factory baselines. The work is isolated in the `ux-factory-wt-phase03` worktree on
`feature/portfolio-motion-phase03-factory-showpiece`. Next: `piv-commit` (stage the 4 code files +
the 2 regenerated baselines + this report + the plan doc **by explicit path**; a commit message
naming the deliberate baseline regen and its affected baselines), then `piv-create-pr` → `piv-review-pr`.
