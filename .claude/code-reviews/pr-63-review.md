# PR #63 review — polish: four deferred low-severity items (#57 L1/L2/L3, #32 L4)

**Verdict: APPROVE** (posted as comment — solo repo, author can't formally self-approve). No Critical, High, or Medium issues. All four changes are surgical, match their spec, and every load-bearing claim in the PR body was independently verified by a fresh-context code-reviewer agent.

## Validation

| Check | Result |
|-------|--------|
| `node tooling/token-lint.mjs` | ✓ 57 contract tokens · 0 undeclared · 0 orphan · DTCG valid — **identical output on `main` and this branch** (stripComments is zero-behavior-change today, verified in a clean worktree) |
| VR gate (`update:docker`) | 16/16 pass, no baseline PNG rewritten — correct: both `checksRow` mounts are inside collapsed `<details>` (zero rendered pixels at rest), and `trace.html` is not in the VR shot list (confirmed against `visual.spec.mjs` + committed baselines) |
| Manual render | trace.html copy + factory.html #round-trip labels eyeballed under neutral pack; expanded accordions show "✓ Monotonic ✓ Body in range ✓ Ratios in band" / "✓ Monotonic ✓ Multiples of 4" |
| `humanizeCheck` vs real key universe | Verified in Node against `tooling/round-trip/verdant.diff.json`: monotonic → "Monotonic", bodyInRange → "Body in range", ratiosInBand → "Ratios in band", multiplesOf4 → "Multiples of 4" |
| `rt-acc` dead-code claim | Re-verified: only grep hit is the unrelated `.rt-accordions` (portfolio.css:747); no rule ever targeted `rt-acc` |

## What's good

- The trace.html copy claim is technically accurate, not just plausible: `trace-player.mjs` sets `root.tabIndex = 0` and binds `keydown` on `root`, so click-or-tab-into genuinely gates arrow stepping — the new clause matches the code word for word.
- `stripComments` was checked against the contract CSS's actual comment shapes (header blocks + inline trailing comments); the non-greedy regex can't merge two token lines in a way that breaks the line-anchored declaration match.
- Comment style in both touched `.mjs` files matches the files' existing convention.

## Issues

### Critical / High / Medium
None.

### Low (non-blocking)

1. **Casing divergence between sibling check-mark rows** — `humanizeCheck` (derivation-roundtrip.mjs:264) produces sentence-case ("Body in range") while the verdict panel's `.rt-mark` labels (:152-154) are lowercase ("accent within"). Both render through the same `verdictMark()`. Intentional: sentence-case is what the L2 spec asked for, and the two label sets never sit adjacent (verdict panel vs collapsed accordion body). No change needed unless literal parity is wanted later.
2. **`humanizeCheck` inert edge cases** — consecutive-capital acronyms ("WCAGCompliant" → "Wcagcompliant") and digit-then-uppercase ("step2Valid" → "Step 2valid") would mis-render. No such key exists in the sole producer (`tooling/diff-pack-seed.mjs`, untouched). Deferred per YAGNI; if a real key ever exercises this, a small `{key: label}` override map is the fix, not a smarter regex.

## Recommendation

Merge. After merge **#57 is fully closed**; of #32 only **L3 remains** (handled separately).
