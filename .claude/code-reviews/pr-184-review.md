# PR #184 Review — Wave 1: home inspect mounts + scrub row + dual-register copy (#169)

**Verdict: REQUEST CHANGES** — one High accessibility/correctness issue introduced by the new nested `data-inspect` mounts; everything else is clean and the validation story is exemplary. Fix H1 (small, contained in `inspect.mjs` or the markup) and this is an approve.

Reviewed with fresh eyes in the `ux-factory-wt-169` worktree (branch in sync with origin). Deep pass dispatched to the code-reviewer agent; the decisive finding re-verified by hand against `system/inspect.mjs` and the diff. The three regenerated JSON artifacts were re-run against their generators — byte-identical, honesty contract intact.

## Issues

### High

**H1 — Nested `data-inspect` mounts: keyboard focus opens the wrong bubble** — `index.html:112–125` (card #3 + its two buttons) and `index.html` hero (`data-inspect="page-hero"` section containing both `data-inspect="buttons"` CTAs); root cause visible at `system/inspect.mjs:189`.

`inspect.mjs` wires an independent `focusin` listener on every `[data-inspect]` target, and `focusin` bubbles. This PR introduces the first nested mounts: the two sample buttons sit inside a `data-inspect="cards"` article, and the two hero CTAs sit inside the new `data-inspect="page-hero"` section. Tab to "Primary" (or "Start the brief"): the button's own listener opens the Buttons bubble, then the same event bubbles to the ancestor, whose listener synchronously overwrites `focusTrigger`, the bubble content and `aria-describedby` with the ancestor's entry. A keyboard/AT user focused on a button is described the card/hero instead — wrong content on focus, on the very surface whose purpose is to demonstrate WCAG-literate craft (the bubble itself cites 1.4.13). Hover is unaffected (`mouseenter` doesn't bubble), which is why the 36-assertion functional pass — hover + toggle driven — didn't catch it; none of the assertions tab onto a nested mount.

Fix (pick one):
- In `inspect.mjs`'s `focusin` handler, ignore bubbled events from a nested mount: `if (e.target.closest("[data-inspect]") !== t) return;` (and symmetrically guard `focusout`). Engine-level, covers all future nesting.
- Or markup-level: drop `data-inspect="buttons"` from the two hero CTAs and the two sample buttons, or restructure so mounts never nest — but that loses the buttons entry on exactly the elements it documents, so the engine guard is the better fix.

Add one tab-onto-nested-button assertion to the cross-engine script so the regression class stays covered.

### Low

**L1 — Stale rAF can flash a prior drag's value into a new drag** — `system/scrub.mjs` (`pointerdown`). A pending `requestAnimationFrame` scheduled by the previous drag isn't cancelled when a new drag starts (only `destroy()` cancels it), so a sub-frame drag-release-drag can momentarily apply the old value. Fix: `if (raf) { cancelAnimationFrame(raf); raf = 0; }` at the top of `pointerdown`.

**L2 — Hue scrub doesn't wrap at the 0/360 seam** — `system/scrub.mjs` (`clamp`). ArrowRight at 360 stops instead of continuing to 2°, unlike a circular hue control. Defensible as a plain bounded slider (aria-valuemin/max are honest about it), but it's not among the documented deviations — either wrap it or note the choice.

## Validation

| Check | Result |
|---|---|
| `gen-inspect-data --check` | ✓ 14 components, no drift |
| `gen-param-count --check` | ✓ 66 controls, no drift |
| `gen-loc-summary --check` | ✓ 3 groups, no drift |
| `tooling/drift-check.mjs` | ✓ all 11 groups |
| `tooling/build-checks.mjs` | ✓ all 10 groups |
| Regen honesty spot-check | ✓ committed JSON byte-identical to fresh generator runs |
| Cross-engine 36/36, VR 20/20 + two-stage @property proof | Author-run per report; method sound, not re-run here (Docker VR). Note: the functional pass has the H1 blind spot above. |

## What's good

- The **two-stage @property proof** (registration commit gated against pre-registration baselines, machine-proving the registrations render-invisible) is a genuinely rigorous way to land a change class that VR tolerance would otherwise swallow — worth reusing.
- The `@property` pre-flight was done properly and then **extended beyond the plan** (tokens.plusui.css, pack-import's verbatim strings) — the `<length-percentage>` widening is the correct grammar, and initial-values match every pack.
- `scrub.mjs` is a solid ARIA-slider implementation: role/valuemin/max/now/text, Home/End, focus-time re-read from live computed style (so the wizard-overwrite edge genuinely works), reduced-motion snap, and the "handles cache nothing" header claim checks out.
- The wizard×scrub last-writer-wins interplay was reasoned through correctly (derive() negotiates only l/c, never hue; `activateOn:'load'` ordering verified) — no race despite appearances.
- All five documented deviations are real deviations with real justifications; the report's "issues encountered" section (wrong-tree port collision caught and re-run) is the honesty contract working.
- Param-manifest backfills the #166 inspect-toggle gap rather than quietly skipping it.

## Recommendation

**Request changes** on H1 (High). L1/L2 are take-or-log. After the fix: re-run the cross-engine script with the added nested-focus assertion; no baseline churn expected (bubble content is transient, VR captures at rest). Commit this review + the fixes on the PR branch per repo convention.
