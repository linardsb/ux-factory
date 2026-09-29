# PR #484 review — neutral `--color-fg-muted` clears AA on the card surface (#482)

**Head** `0e35b340fe9685e3ba15b5d65e32f72f34a8ce5c` · **Base** main @ `eb84860d0b4474f5872ba5ea3bbba427336a5236` · round 1 (no prior review; base unmoved since the branch point)

**Recommendation: approve.** No critical, high or medium issues. Two low notes, neither blocking.

## Summary

One primitive moves (`neutral.primitives.color-slate` #6b7280 → #69707e), which moves `--color-fg-muted` and
`--color-accent-secondary` together. Every generated and hand-mirrored copy is carried (token CSS, DTCG, css/ios/android,
pack bundle, `build-card.mjs`), and the one baseline that prints resolved hex is regenerated. The two new
assertions (build-checks 43.16, canvas-journey I12) compare the verdict to literals rather than to
`fidelityVerdict(...)`, which is the right call: the derived comparison is what let the defect read as consistent.

## Validation

| Check | Result | Provenance |
|---|---|---|
| `node tooling/drift-check.mjs` | ✅ `drift-check ✓ syntax · token-css · … · group-count` | observed, review worktree at `0e35b34` |
| `node tooling/token-lint.mjs` | ✅ `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` | observed |
| `node tooling/build-checks.mjs` | ✅ `build ✓ all 46 groups pass` | observed |
| Mutation: `color-slate` back to #6b7280 + `gen-token-css`, then build-checks | ✅ red as claimed: `build import run ✗ 2 failure(s)`, both 43.16 lines naming `color-fg-muted on color-bg-surface` at 11/12; tree restored after | observed |
| Contrast figures | ✅ #6b7280: 4.834 on white, 4.398 on #f4f4f5. #69707e: 4.977 on white, 4.528 on #f4f4f5 (`system/wcag.mjs` `contrastRatio`) | observed |
| Portal smoke (free port 64123, own PID killed) | ✅ `/api/health` → `{"ok":true,…,"bootSha":"0e35b34…","stale":false}` | observed |
| CI on the PR head | ✅ CodeQL, audit, codeql, gates-green, verify, visual all pass | observed (`gh pr checks 484`) |
| canvas-journey chromium, VR 33 passed, fresh worst ΔE 1.3688 | not re-run | operator-run figures from the PR body, labelled as such there; CI `visual` covers the pixel gate |

The deep pass ran in this clean review context; the `code-reviewer` agent was not dispatched because its rubric is Python/FastAPI-tuned and fits nothing in this diff.

## Numbers pass

Every figure in the PR body and report was checked for its source run.
- 4.40, 4.53, 4.83 → 4.98, 11/12 → 12/12: re-derived above, match.
- 1.3379 / 29.7584: the committed `measure.json` values, pinned by 43.16's existing re-measure line, which passed.
- 1.3688 and "33 passed": operator-run, stated as operator-run at `e85dea0` with the later commits scoped to
  non-served files. Not re-observed; correctly labelled.
- No derived figure sits under an observed heading.

## Issues

### Low

**F1 — "smallest passing step" holds only inside the search family used.**
`.claude/plans/neutral-fg-muted-aa-482.md:380` states #69707e "is the smallest passing step". Line 36 qualifies
it (per-channel proportional scale), but line 380 does not. An unconstrained search finds #6a7080 (3 channel
units from #6b7280, versus 6) passing at 4.504. #69707e is still the better pick: it keeps the hue and has
more headroom (4.528). Fix: qualify line 380 ("the smallest hue-preserving step"), or leave it; the chosen value
does not change.

**F2 — canvas-journey I12 reads the verdict attribute twice.**
`tooling/canvas-journey.mjs:1177` reads `data-import-fidelity` inline, and `:1178` reads it again into `word`.
Both reads hit the same settled DOM, so the result is the same. Fix: hoist `word` above line 1177 and use it in
both assertions. Polish only.

## Not findings (documented decisions)

- The contract fallback `--color-fg-muted` stays #6b7280, which still fails 4.5 on #f4f4f5. Plan D1, Q1 open for
  the owner (plan D1: the contract is the importer's snap-target set). Not checked here.
- Third prose copy (the canvas-journey success line) updated beyond the plan: documented deviation, and the
  three copies (header, gates.md, success string) now agree with group 43's string.
- VR baseline amended into the code commit: documented. Other pages' baselines were not regenerated and CI `visual`
  passed (observed); that the 2-unit grey shift sits under the gate's tolerance on those pages is derived, not
  observed, since the tolerance can absorb small text-colour changes.
- `measure-live/*.measure.json` still say `red`: verbatim capture, and the README's new paragraph says so.

## What is good

- The assertion is shown to fail (reproduced here), not only to pass.
- The sweep for other copies of the old value is real: the only remaining #6b7280 hits are the contract (D1),
  the verbatim `measure-live` captures, and 43.16's synthetic paints of a drawn subtitle.
- iOS/Android values are correct (0x69/0x70/0x7e → 0.412/0.439/0.494).
- Issue #482's ask is met: 12/12 pairs, smallest hue-preserving darkening, calm-colour constraint held.
