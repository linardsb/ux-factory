# PR #458 review — fix(import): icon glyph box from measured geometry (#456)

**Head** c13c87610604d323ac9c09e5275cbacbcf50c392 · **Base** main @ `60d5698e7770e1c90de79e550e951a440a55e8d2`

**Recommendation: approve.** No critical, high or medium findings. Two low findings, both optional.

## Summary

`import/recognise.mjs` now reads the icon's glyph box (`md|lg|xl` = 16/24/32px) from the drawing's measured size: the long axis, both axes measured, the smallest step that contains it, no tolerance. `BUILDERS.icon` lands in the same change, and `propsFor`'s literal-size refusal is scoped to `{fill, hug}` size enums so an icon does not file the converter's size rows twice. The Chevron (8.73 × 16) now reads `icon` at `md` and builds. The rule is argued in R4 without reference to the score, and 40.18 asserts the shape of the sum rather than 0.5. This meets all three deliverables in #456.

Implementation report: `.claude/reports/icon-glyph-box-456-report.md` (no plan; the report says the issue body served as one). No undocumented deviations found.

## Issues

### Low

**F1 · `import/recognise.mjs:206-211` — a zero or negative measurement reads `md`.** `glyphBox()` accepts any finite number, so a degenerate export (`w: 0, h: 0`, or a negative axis) reads as a covered `md` icon instead of not covered. R4's "smallest containing step" rule technically covers it (every box contains 0), and no real Brilliant export is known to produce it. Fix, if wanted: `if (!(s.w > 0 && s.h > 0)) return null;` plus one 40.18 boundary row; or one sentence in R4 saying zero is deliberately `md`.

**F2 · `import/recognise.mjs:207` — `layout.size ?? style.size` depends on an invariant in another file.** If a node ever carried a non-numeric `layout.size` beside a numeric `style.size`, the measurement would be ignored and the box left unread. It cannot happen today: `brilliant.mjs`'s `sawSize` guard makes the two mutually exclusive per node. The header's habit elsewhere is to cite the guarding invariant at the point that depends on it; a one-line comment would do.

## Validation

| Check | Result | Provenance |
| --- | --- | --- |
| `node tooling/build-checks.mjs` | all 42 groups pass | observed, PR head in a clean worktree (after `npm ci` in `tooling/icons`; group 41 fails without it, an environment gap, not the PR) |
| `node tooling/drift-check.mjs` | ✓ | observed (after `npm ci` in `tooling/style-dictionary`) |
| `node tooling/token-lint.mjs` | ✓ 63 tokens, 0 orphan | observed |
| Regen determinism: `node import/regen-expected.mjs` + `node tooling/regen-import-records.mjs` | no diff against the committed fixtures | observed |
| Mutation: `propsFor` size refusal restored to any `size` prop | red at 40.18, "recorded [literal-size@size.w, literal-size@size.h] — expected no rows" | observed; matches the report's last mutation row |
| CI: verify · visual · codeql · CodeQL · audit · gates-green | all pass | observed (`gh pr checks 458`) |

## Numbers pass

- "all 42 groups pass": observed, reproduced here.
- "Eight source mutations each redden a named case": one of eight reproduced (above). The per-mutation failure counts in the report ("8 failures", "12 failures") were not re-run; they do not feed any later decision.
- "8.73 × 16 → md", "0.5 with no weight moved": the regenerated fixtures are byte-identical on regeneration, and the report's sum is kind-fit 0.25 + prop-fit 0.25 × 2/2 under unchanged weights (derived, consistent with R4).
- "GLYPH_BOX_PX pinned to --spacing-md/lg/xl": 40.9 reads the values from `system/tokens.source.json`'s contract spacing, not from the table itself; the contract CSS carries 16/24/32 at lines 57-59 (observed).

Guarantees pass: first review round, no prior base SHA, skipped.

## What is good

- The `propsFor` scoping is safe: `avatar` also has a non-`{fill,hug}` `size` enum but has no builder, so no other built entry's drop rows change, and the converter's `sizeDrops` already records every numeric axis.
- The mutation table found a check that could not fail (the size-refusal mutation stayed green) and added the assertion that closes it.
- Stale prose was swept in all three places a group's prose lives (R4, both `group()` strings, `gates.md`); no remaining "Chevron NOT COVERED" or "no builder for icon" claims.
- The box gate keys on the entry's declared enum, not its slug, and 40.18 proves exactly one entry takes the branch.
