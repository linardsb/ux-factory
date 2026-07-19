# PR #37 Review — Factory page: five-station shell + live intake wizard (#10, slices 10.1–10.2)

**Branch**: `feature/factory-shell` → `main` · **State**: OPEN · +2802 / −157 · 13 files
**Recommendation**: 🔧 **Request changes** — on **three accessibility gaps only**. No correctness, security,
XSS, honesty-contract, view-time-safety, or token-discipline blockers; all runnable CI gates green; intent
matched. But this is the one page whose stated job is demonstrating UX craft, and its Station-2 narrative
*advertises* "the WCAG contrast checks shown" — while the wizard wrapping those checks drops keyboard focus on
every step and ships two unnamed form controls. That's the UI undercutting the exact competency it showcases, on
a solo repo where a deferred "follow-up" tends to mean never. The fixes are ~10 minutes and fully specified
below (two are one-line `aria-label` additions). Fold them in, then this is a clean approve.

---

## Summary

The real review surface is three files — `system/factory-intake.mjs` (NEW, 270 lines), `factory.html`
(+246 / −61), and `tooling/visual-regression/visual.spec.mjs` (+15 / −2). The remaining ~2400 lines are
docs/plans/review-records. Slice 10.2 makes Stations 1 + 2 genuinely run: a stepped 4-question wizard drives the
real derivation engine (`system/derive.mjs`) and applies `result.tokens` as inline custom properties **scoped to
`#reskin-preview`** (chrome + wizard untouched), plus a 4-beat narrative rendered from the engine's own output.
Approach B: `derive()` behind try/catch → reverts to the committed neutral pack on any throw.

The implementation is correct, honest, and well-scoped. Fresh-eyes deep pass (via the `code-reviewer` agent)
found **no** correctness bugs, **no** XSS/injection, **no** honesty-contract or view-time-safety violations, and
**no** token-discipline violation beyond one Low literal. The five documented deviations all check out against
the actual code — nothing undocumented is hiding under a documented label.

## Validation

| Check | Result |
|-------|--------|
| `node --check system/factory-intake.mjs` | ✅ parse OK |
| `node -e "import('./system/factory-intake.mjs')"` | ✅ imports clean — inert under Node (DOM behind `typeof document` guard); top-level fail-fast enum/default asserts pass |
| **token-lint** | ✅ 47 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| **drift-check** | ✅ syntax · token-css · handoff · scenarios · traces |
| **visual-regression** (Docker) | ✅ *per report* — 16/16 pass vs committed baselines; twice-regenerate byte-identical (neutral + saulera); only the 2 factory PNGs changed. Not re-run in this review (needs Docker); relied on the documented run. |
| Live browser harness (Playwright, per report) | ✅ 22 functional checks: scoped re-skin, density re-scales, WCAG all-pass at defaults, `monthly` flips verdict + gates a habit mechanic, `trackFactoryDriven()` fires exactly once (never on auto-render), fallback reverts to neutral, zero JS exceptions |

## Issues by severity

**Critical: 0 · High: 0 · Medium: 3 (all a11y) · Low: 3**

### Medium — accessibility (the requested changes — the verdict is gated on these three)

1. **Focus is dropped to `<body>` on every wizard Back/Next.** `system/factory-intake.mjs:199`
   (`wizardMount.replaceChildren(card)` in `renderWizard`, called from the button handlers at :185/:191-194)
   destroys the DOM node holding focus (the button just clicked) without moving focus to the new card. A keyboard
   / screen-reader user loses their place and must re-navigate from the top on every step. Ironic on a
   craft-demonstration page.
   **Fix:** give the new `h3.fw-prompt` a stable id + `tabindex="-1"` and `.focus()` it — but **only on Back/Next
   navigation, not on the initial `renderWizard()` from `init()`** (unconditional focus would steal
   focus/scroll on page load). Gate with a `{ focusOnRender: true }` flag passed only from the button handlers.

2. **`role="radiogroup"` has no accessible name.** `system/factory-intake.mjs:155-156`. Individual radios are
   fine (each in its own `<label>`), but the group is unnamed, so a screen-reader user hears an unnamed radio
   group rather than the prompt.
   **Fix:** `group.setAttribute("aria-label", w.prompt)` — or id the prompt `h3` and use `aria-labelledby`.

3. **The color input's accessible name is its hex value, not its purpose.** `system/factory-intake.mjs:140-153`.
   `<input type="color">` is wrapped in a `<label>` alongside `valueSpan` (the live hex readout), so its computed
   accessible name resolves to `#2f7a4d`, not "Brand colour".
   **Fix:** add `aria-label="Brand colour"` (or `aria-labelledby` to the prompt heading) on the `<input>`.

### Low

4. **Token-discipline: a literal type size where a token exists.** `factory.html:44` —
   `.factory-embed-cap { font-size: 13.5px; … }` uses a literal instead of `var(--type-caption)`, which is used
   by `.fw-checks` / `.fw-beat-sub` / `.fw-raw-pointer` in the same block, and contradicts the block's own header
   comment ("type via `var(--…)`"). Introduced in the 10.1 shell block, not the 10.2 wizard. Appears to be a
   hand-tuned caption size, not a brand value.
   **Fix:** use `var(--type-caption)` if acceptable, or add a one-line comment noting the measured divergence.

5. **Informational (not a defect): the try/catch is narrower than "derive() on any throw" reads.**
   `system/factory-intake.mjs:105-119` — the `try` wraps only `derive()`; the property-apply loop,
   `dataset.reskin`, and `renderNarrative(result)` run unguarded after. Safe by construction today (engine
   guarantees `result`'s shape when it doesn't throw; `setProperty` doesn't throw on well-formed strings; the
   file's own comment scopes the guarantee to the derivation step). No fix required.

6. **Optional: dragging the color picker re-derives + rebuilds the narrative on every `input` event.**
   `system/factory-intake.mjs:146-149`. `derive()` is cheap (closed-form OKLCH + a few loop iterations) and
   `#factory-narrative` is not `aria-live`, so no correctness/a11y impact. YAGNI — do not debounce without
   profiled jank.

## What's good

- **XSS surface verified clean by tracing every sink, not skimming.** `table.innerHTML` (:220-228),
  `notes.innerHTML` (:232-234), `plist.innerHTML` (:251-253): every interpolated value is either a hardcoded
  `RULESET` string or an algorithmically-derived `#rrggbb` hex, each through `esc()`. The `wcagPairs` list
  excludes the `color-mix()` dynamic tokens, so no CSS-function string can reach the `style="background:…"`
  sink. `answers.brandColor`'s only DOM use is `textContent` (safe).
- **View-time-safe holds under inspection.** Checked `oklch.mjs` for the achromatic-brand NaN risk (hue pinned to
  `0`, "never NaN"; channels clamped before hex) — a pathological color yields a different-but-legitimate value,
  never a malformed token. In the bounded UI `derive()` cannot actually throw (color input → `#rrggbb`; radio
  values live from `RULESET` keys), so the try/catch is a guarantee, not a live path.
- **Fail-fast module load** (:78-81): enum non-emptiness + default-membership against `RULESET` at import time —
  a future ruleset rename breaks loudly at load, not silently on stage.
- **Honesty invariant intact:** `class="capability"` (In build) = 1 (Station 5 header only); the 5th
  `capability live` is the pre-existing Station-5 raw-replay sub-link (documented deviation #3). Fictional-scenario
  label present on the non-iframe Station-1 surface.
- **Visual-regression `mask`/`waitReady` correctly ordered.** `run()` sets tokens + renders the narrative
  synchronously *before* `dataset.reskin = "ready"` (:114-118), so the `#reskin-preview[data-reskin]` wait can't
  race the capture; `mask` (iframes) and `waitReady` (`#reskin-preview`) target disjoint elements, so the mask
  doesn't hide what the wait guards.

## Recommendation

**Request changes — items #1–#3 only.** The code is correct, safe, honest, and validated; the engineering is
strong and the five documented deviations all check out. The single reason this isn't a straight approve is that
three trivial a11y gaps (focus management on step change, an unnamed radiogroup, a color input named by its hex
value) land directly on this page's own thesis — it exists to demonstrate UX craft and it narrates its WCAG
checks out loud. On a solo repo, "recommended follow-up" reliably means never, so the honest gate is to fix them
now rather than defer. All three are small, specified DOM/attribute additions (est. ~10 min total). #4 is
optional polish; #5/#6 need no action.

**Next step:** `piv-fix-review-findings` on this report (fix #1–#3, re-run token-lint + drift-check + the Docker
visual suite since factory.html/the module change), then re-post as approve.

_Reviewed with fresh eyes (clean context + `code-reviewer` agent). Formal review state can't be set by the PR
author on a solo repo, so this verdict is posted as a review comment; a human makes the final merge call._
