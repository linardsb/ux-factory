# Code Review — PR #261 · IA re-points at the studio (#216)

**Branch**: `feature/studio-ia-re-point-home-gate-216` → `main` · 45 files, +1,891 / −1,240
**Verdict**: **Changes requested** — 1 Medium (a confirmed regression), 4 Low. No Critical, no High.

Posted as a comment rather than a formal `--request-changes`: GitHub refuses both approve and
request-changes on your own PR in a solo repo, so the review body carries the verdict.

## Summary

The IA surgery itself is sound. Every load-bearing hook survives, the deletions were audited rather
than assumed, and the checks that were added were shown able to fail. One real regression slipped
through, and it is invisible to every gate this PR runs — which is exactly why it is worth blocking on.

## Medium

### M1 · The live re-skin proof's colour crossfade is dead — colours now snap
`system/portfolio.css:1086-1098` (the re-scoped `#beat-brand #reskin-preview.is-animated` block)

Task 6 correctly re-scoped this block from `#beat-intake` to `#beat-brand`, but **nothing adds the
`is-animated` class any more**. The only code in the repo that ever did is
`system/factory-intake.mjs:705`, inside `initIntake()`, which early-returns at `:240` unless
`#factory-wizard`, `#reskin-preview` *and* `#factory-narrative` all exist. This PR deleted two of
those three ids, and deleted `intake-beat.mjs` — home's only caller of `initIntake()`.

**This is a regression, not a pre-existing gap.** On `main`, `index.html` carried the wizard,
narrative and `intake-beat.mjs`, so the class was armed and the crossfade ran.

Confirmed on the running page, not by reading:

| state | `#reskin-preview.className` | `.card` transition-property | duration |
|---|---|---|---|
| at rest | `""` | `transform, box-shadow, border-color` | 0.2s |
| **after a real `[data-brand-color]` change** | `""` | `transform, box-shadow, border-color` | 0.2s |
| `.is-animated` forced on manually | `is-animated` | **`background-color, color, border-color`** | **0.48s** |

`factory-intake.mjs` is not even requested on home any more (verified by network log). So
`background-color` and `color` — the two properties that actually carry the derived brand — have
**zero** transition coverage; the 0.2s row is `components.css:534`'s hover rule, which does not
cover them. PR #55's 0.48s "no restart-and-blank" crossfade simply never fires.

**Why no gate caught it**: the pixel gate captures at rest with `animations: 'disabled'`, so
rest == final either way; `vt-verify`'s home row is boot-count-only by design since Task 17; and
none of the four driver proofs assert on this class. A dead CSS block is invisible to all of them.

**It matters because of what the section claims.** The heading is *"Change one value. The whole
system follows."* The crossfade is what makes "follows" legible; snapping undercuts the one
interactive claim the compressed home page still makes.

**Fix — either is one edit, and neither needs a baseline regen** (the gate never captures a live
transition):
1. **Re-arm it** (preferred). One `requestAnimationFrame(() => el.classList.add("is-animated"))`
   in the module that already owns this section — `system/pack-derived.mjs:296` resolves
   `#beat-brand` and is on home's script list. Keep the rAF: PR #55's point was arming *one frame
   after mount* so the first paint does not animate.
2. **Delete the block** with its stale comment, if the motion is judged not worth the wiring.

What is not acceptable is the current state: a committed block that reads as if it works, plus a
comment describing it as live.

## Low — comment hygiene (4 sites, one root cause)

The implementation's own citation sweep caught comments naming deleted *files*; these describe
deleted *behaviour* without using any of those literal strings. All comment-only, no regen needed.

1. `system/portfolio.css:1082-1085` — "the wizard card + WCAG rows enter on DISCRETE renders only…
   (PR #55)" describes `.fw-card` / `.fw-checks.fw-animate` rules **deleted a few lines below** by
   this same diff. (Resolve together with M1 — same block.)
2. `system/portfolio.css:1077` — `/* the wizard's "Review" jump clears the sticky header */`. Home's
   wizard is gone. Keep the `scroll-margin-top` declaration (still useful for anchor navigation);
   fix the reason.
3. `system/portfolio.css:972-974` — "The affordance renders only at the widths where the control it
   opens exists" describes `.wear-cue`, deleted by this PR. Only `.wear-intro` survives, for
   `instance.html`.
4. `system/components.css:2396-2397` — "the same fix `.close-tokens .btn-ghost` takes in
   portfolio.css". `.close-tokens` was deleted by Task 6's widened prune.

## Validation

| Gate | Result |
|---|---|
| `build-checks` | ✓ 21/21 groups |
| `drift-check` · `token-lint` | ✓ clean · 64 tokens, 0 undeclared, 0 orphan |
| `gen-loc-summary --check` / `gen-param-count --check` | ✓ no drift |
| CI `verify` / `visual` | ✓ / ✓ |
| `vt-verify chromium` | ✓ full pass |
| node-import safety (`analytics`, `scrub`, `palette`) | ✓ |
| baselines changed | ✓ exactly 18, the 4 unchanged being the two chrome-free protos |

**Two checks run beyond the diff**, targeting what a deletion-heavy PR can break silently:

- **`instance.html` computed styles are byte-identical between `main` and this PR** across all 18
  shared selectors (`.close-*`, `.peak-*`, `.intake-*`, `#reskin-preview`, `.fw-*`). That page is
  deep-link-only and outside the VR page set, so a bad CSS prune there would have been caught by
  nothing. This is the strongest evidence in the review that Task 6's widened deletion was safe.
- All 7 non-VR-guarded pages (`instance`, `studio`, `handoff`, `agentic-ui-study`, `trace`,
  `agentic`, `derive`) render 200 with no page errors and no zero-boxed shared elements.

`docs/epics/` does not contradict the change: `prototype-studio.prd.md:88` specifies exactly this
("Home compresses to a short gate (billboard + live re-skin proof → studio)").

## What's genuinely well done

- **Every silently-failing hook survives**, verified three ways (source, live DOM, and against the
  untouched consumers `pack-derived.mjs` / `brand-import.mjs` / `inspect.mjs`). This was the
  plan's own headline risk and it was handled.
- **The deletions were audited, not assumed.** The `close-*` prune went 9 classes beyond the plan's
  scope and each was checked against every `.html` and `system/*.mjs`; an independent re-derivation
  produced the same set.
- **`scrub.mjs`'s `brandHex()` change is correct and correctly bounded** — node-import-safe inside
  the `typeof document` guard, and unreachable on `approach.html` (the mount returns at its
  `[data-stage-scrub]` guard before `brandHex` is ever evaluated).
- **`vt-verify`'s `if (!s.act)` guard leaks nothing** and correctly skips the reduced-motion block
  that would have called the undefined `act` — confirmed by a real chromium run.
- **Three checks were proven able to fail**, not merely to pass: the handle glyph (child-node
  mutation), the tracker pin (rename mutation), and the brand read (hidden-control mutation
  inverting the L/C verdict). That is the repo's `check-that-cannot-fail` standard, met.

## Not re-litigated

The report's documented deviations are intentional decisions and were not treated as findings: the
pre-existing `/handoff` 404, the footer's IA-only index caveat, `vt-verify`'s stated coverage loss,
home's shrunken JS-off floor, the owner-chosen h1, and D2 (Home leaving the nav).

## Recommendation

**Fix M1 before merge** — it is a one-line re-arm or a block deletion, and it is a live regression in
the page this ticket exists to build. Fold the four Lows in at the same time; L1 lives in the same
block as M1. Then re-run `build-checks` + `token-lint`; no baseline regen is required, because the
pixel gate never captures a live transition in either resolution.
