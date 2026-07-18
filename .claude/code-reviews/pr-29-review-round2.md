# PR #29 Review — Round 2 (post-fix) — feat: on-dark accent contract token

**Verdict: APPROVE** (all three round-1 findings correctly and completely fixed; no new findings)

## Summary

Round 1 requested changes on one High (a sixth accent-as-text-on-dark selector — `.btn-ghost:hover` in dark containers — that falsified the PR's completeness claim), one Medium (stale header version in the honesty artifact), and one Low (dead `onInverse.against` config). Commit `bc44d88` fixes all three. A fresh-context reviewer independently verified each fix, re-derived every claimed number with the repo's own tooling, and swept every dark-background context across `components.css`, `portfolio.css`, `proto.css`, and the `wc/` wrappers for a seventh instance — none exists. With the completeness claim now true and the commentary factually accurate, the honesty-contract concern that blocked round 1 is resolved.

## Round-1 fix verification

| Finding | Fixed? | Evidence |
|---|---|---|
| **H1** (High) — `.btn-ghost:hover` in `.on-dark`/`.case.dark`/`.work-block.dark` rendered plain accent as text | **Yes** | `components.css:203-208` now uses `var(--color-accent-on-inverse)` for both declarations. Independent recomputation via `system/wcag.mjs`: old `#2563eb` on `#1a1a1a` = 3.37:1 (fail), new `#3d7bff` on `#1a1a1a` = **4.54:1 (AA pass)** — both match the claimed numbers exactly. The `derive.rules.mjs` §wcagPairs commentary now accurately records that the PR #15 pass missed this selector and PR #29's review caught it — no overstated claim remains. |
| **M1** (Medium) — header `v1.1.0` vs `version: "1.2.0"` | **Yes** | `derive.rules.mjs:1` now reads v1.2.0, matching the `version` field at line 19. |
| **L1** (Low) — declared-but-unread `onInverse.against` | **Yes** | Field dropped (YAGNI, as round 1 blessed): `onInverse: { min: 4.5, step: 0.01, maxL: 0.98 }`. Grep confirms nothing ever read `.against` off the lighten loop's config — clean removal, no dangling reference. |

## Issues

None. No Critical, High, Medium, or Low findings in the round-2 delta or the re-swept surface.

## Validation

| Check | Result |
|---|---|
| Syntax (`node --check` derive.mjs + derive.rules.mjs) | ✅ pass |
| `gen-token-css.mjs --check` | ✅ 47 contract + 55 pack, no drift |
| `gen-handoff.mjs` + `gen-vocabulary.mjs` re-run vs committed outputs | ✅ byte-for-byte no-op |
| Spike (`tooling/spike-palette.mjs`) | ✅ exit 0 · completeness 47 ⊇ 47 · **96/96 pairs AA (100.0%)** |
| Independent recomputation of the fixed pair (repo's `wcag.mjs`) | ✅ 3.37:1 → 4.54:1, matches all claimed numbers |
| Fresh-eyes sweep for a seventh accent-as-text-on-dark instance (components.css, portfolio.css, proto.css, wc/) | ✅ none found; 3:1 non-text uses (block-num dot, ruled border, focus ring) correctly out of scope |

## What's done well

- **Surgical fix** — exactly the two declarations H1 named; no scope creep into the adjacent, already-correct `.btn-secondary` block.
- **The commentary rewrite upgrades the honesty artifact** rather than just patching it: it now names the selector that slipped, the audit that missed it, and the review that caught it.
- **L1's cleanup verified, not assumed** — the removal was grep-confirmed to leave no dead reference.
- Every number in the fix commit message (4.54:1, 96/96 AA, 47 ⊇ 47) reproduced exactly under independent tooling.

## Recommendation

**Approve.** All round-1 findings resolved, validation fully green, claims and code agree. Ready for the human to merge.

---
*Review round 2: piv-review-pr · validation + code-reviewer agent (fresh context) · solo-repo convention: verdict posted as comment (GitHub blocks formal approve on own PR)*
