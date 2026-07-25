# Code Review — PR #55 · Portfolio motion phase 3

**Reviewed:** `factory.html`, `trace.html`, `system/factory-intake.mjs`, `system/trace-player.mjs` (the 4 code files; the 2 `.png` baselines are binary, the 2 `.claude/*.md` are docs).
**Rubric:** this repo's `CLAUDE.md` (vanilla JS/CSS, token discipline, honesty contract, view-time DOM-safety) — not Python defaults.
**Method:** fresh-eyes pass via the `code-reviewer` agent, which read each file in full and **empirically verified** the one behavioural finding with a headless-browser probe rather than static reading alone.

## Recommendation: **Request changes (advisory)** — 1 Medium worth fixing before merge

No Critical/High issues; every core mechanism (timer lifecycle, reduced-motion gating, `.btn` specificity, honesty contract) verified clean. The Medium is a real, reproducible visual defect on the page's **flagship interaction**, cheap to fix — worth closing before merge rather than shipping as debt. The Low is optional. _(Solo repo: GitHub blocks a self-`--approve`/`--request-changes`, so this posts as a comment; the human makes the merge call.)_

## Issues

### 🟡 MEDIUM — WCAG contrast table blanks out while dragging the brand-colour picker
**`factory.html:271` (`.fw-checks tbody tr` → `fw-row-in`) × `system/factory-intake.mjs` `run()`→`renderNarrative()` (211–241, 397–452); trigger is the pre-existing colour `input` handler at 319–322.**

The colour `<input type="color">` fires `input` continuously during a drag → `setAnswer` → `run()` → `renderNarrative()` → `narrativeRoot.replaceChildren(frag)` rebuilds the whole 12-row `.fw-checks tbody` every tick. This PR newly attaches `animation: fw-row-in … both` with `animation-delay: calc(var(--i,0) * var(--motion-stagger))` (70ms × row) to those rows; a CSS animation **restarts** on each freshly-created element. Row 11 needs `11×70ms + 200ms ≈ 970ms` to settle, but drag `input` events fire every 16–50ms — so later rows never reach `opacity: 1` and the table stays blank during the drag.

**Verified empirically** (12 `input` events 40ms apart on the picker, sampling `getComputedStyle(row).opacity`): rows 2–12 sat at `0.00` for the entire simulated drag, resolving to `1.00` only ~1s after input stopped. Directly undercuts Station 2's own pitch ("re-skin the sample below live — with the WCAG contrast checks shown").

**Severity rationale:** presentation-only (no derived value/trace/copy affected — confirmed), transient, self-heals ~1s after release, and **zero effect under reduced motion** (the animation isn't attached there). Not a data/crash bug — but a guaranteed visual defect on the exact interaction the page showcases.

**Fix (do NOT over-correct):** gate the row-entrance trigger to *discrete* renders (initial mount / wizard step change / scenario toggle) rather than every same-step value refresh — e.g. thread an `animate` flag from `run()`/`setScenario()` into `renderNarrative()` and add the keyframe via a class only then; or debounce **just the `renderNarrative()` call** (~150–250ms). **Leave `#reskin-preview`'s Item-1 token application as-is** — its CSS `transition` retargets smoothly and has no restart problem; debouncing all of `run()` or switching the input to `change` would make the live preview laggy, against the module's "always live" intent. (This is the same continuous-colour-input root cause noted for AC #8 — worth handling together.)

### 🟢 LOW — `revealAll()` sets the progress fill to 100% unconditionally
**`system/trace-player.mjs:169` vs `:176`.**

`revealAll()` does `fill.style.width = '100%'` without the `cards.length === 0` guard that `apply()` has (`cards.length ? … : 0`). A zero-step trace (permitted by `parseTrace`) would show a full bar next to "0 / 0". Negligible — every committed trace has steps — one-line fix if ever touched: `fill.style.width = cards.length ? '100%' : '0%';`.

## Validation

| Check | Result |
|---|---|
| `node --check system/factory-intake.mjs` | ✅ parse-clean |
| `node --check system/trace-player.mjs` | ✅ parse-clean |
| `import()` under Node (DOM-safety) | ✅ no DOM touched at import |
| Visual-regression gate (Linux/Docker, full 16-shot) | ✅ 16/16 green (commit `8e002d9`); only the 2 factory baselines deliberately regenerated |
| Interactive behaviour harness (Chromium, 20 checks) | ✅ 20/20 |

## What's good (verified clean)

- **Autoplay timer lifecycle** — cleaned on every path: `stop()` before every manual nav (Next/Prev/Show-all/keyboard), self-stop at the last card, and `destroy()`. No leak, no double-run (`if (timer || !btnPlay) return` in `play()`). `factory.html` mounts once and never calls `destroy()` — safe, because the timer still stops at the last step + on manual nav.
- **`matchMedia` gating** — one `if (!reduceMotion.matches)` block gates both `btnPlay` and the fill together; no path renders them under reduced motion; `matchMedia` is not called at import (Node-safe).
- **`.btn` not clobbered** — the re-skin transition is an explicit selector list (not `#reskin-preview *`), so it can't outrank `.btn`'s own transition; no listed selector matches `<a class="btn">`.
- **Token discipline** — no colour literals introduced; every new rule uses existing `var(--motion-*)`/`var(--color-*)` tokens.
- **Reduced-motion rest state** — every new keyframe (`trace-step-in`, `fw-step-in`, `fw-pop`, `fw-row-in`) is `no-preference`-gated with rest == final; nothing stuck invisible under reduce.
- **Comment balance** — programmatically confirmed `/* */` pairs balance in both `<style>` blocks; the previously-fixed stray-`*/` bug is gone.
- **`apply(scroll, block)` refactor** — defaulted param preserves original stepping; only the Play timer opts into `'nearest'`.
- **`esc()` escaping intact** — the only new interpolation `${i}` is a numeric array index, not user input.
- **`requestAnimationFrame` arm** — `previewRoot` guaranteed non-null (early-return guard); timing avoids a load-flash.
- **Honesty contract** — line-by-line confirmed no derived value, trace datum, ethics verdict, or copy changed — CSS + Play-control UI only.
- **a11y** — the new `stop()` in `onKey` doesn't interfere with `guardArrows()` (separate DOM layer); Play↔Pause `textContent` swap is the standard accessible pattern.

---
_Agentic review gate. A human reviews the code + this review and merges. Natural next step for the Medium: `piv-fix-review-findings`._
