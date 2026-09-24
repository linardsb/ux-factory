# #456 — icon glyph box from measured geometry (import)

Epic #295. Branch `fix/icon-glyph-box-456`. No separate plan: the issue body named the three deliverables and the rule's three open questions (axis, tolerance, non-square box), and the rule is stated in `import/recognise.mjs` R4.

## The rule (R4, `import/recognise.mjs`)

- **Long axis, both axes measured.** The box is square and the drawing sits inside it. The short side is the glyph's own proportion. One unmeasured axis (`hug`) means no read.
- **Smallest containing step, not nearest.** A smaller box clips the drawing. This differs from type's nearest-value rule on purpose.
- **No tolerance past the read's precision.** 16.01 → `lg`. Over 32 → no step, not covered.
- **Stated limit.** A small glyph drawn in a larger box reads the smaller box (#311's mapping editor).

Result: the Chevron (8.73 × 16) reads `icon` at `md`, scored 0.5. That is kind-fit plus prop-fit on `name+size`. No weight moved. The same 0.5 landing already existed for an unnamed text node against `text` (tie-break rung 2, since #304).

## Changes

- `import/recognise.mjs`: R4 rewritten, `GLYPH_BOX_PX` (frozen, pinned to `--spacing-md/lg/xl`), `glyphBox()`, the box branch in `fillProp` (above the generic enum branch), `BUILDERS.icon`. `propsFor`'s `{fill, hug}` refusal is now scoped to a `{fill, hug}` enum. Before, it would have filed the converter's two `literal-size` rows a second time on `icon`.
- `tooling/build-checks.mjs`:
  - 40.3's floor subject moved to the avatar disc, the committed floor node in both reads, and the Chevron is asserted covered.
  - 40.4's emitted set is now `icon, stack, text`, and the refused set is unchanged.
  - 40.9 adds `GLYPH_BOX_PX` to the frozen tables and pins it to the contract.
  - 40.18 is rewritten: sum shape, the built output, no build drops, the name-field mutation, and eight box boundaries.
  - 42.5's both-flipped mutation now finds the avatar disc's floor row by kind on both sides. Before, it took the Chevron's last drop, which no longer exists.
  - The prose for groups 40 and 42 is updated.
- `.claude/references/gates.md`: groups 40 and 42 updated to match.
- Regenerated: `import/fixtures/spike-c-instance.expected.json`, `import/fixtures/records/*`. Every change is at the Chevron: its verdict, the removed floor row, and the list-row absorption row now saying "read as icon".

## Validation (observed)

- `node tooling/build-checks.mjs`: all 42 groups pass (baseline on unmodified main was also 42/42).
- `node tooling/drift-check.mjs` ✓ (run against the staged index).
- `node tooling/token-lint.mjs` ✓.

## Mutations run against `import/recognise.mjs` (each reverted)

| Mutation | Result |
| --- | --- |
| nearest step instead of smallest containing | red: 40.18 (16.01, 10×19) |
| 0.5px tolerance | red: 40.18 (16.01) |
| read the box from one numeric axis | red: 40.18 (`hug` × 16) |
| short axis instead of long | red: 40.18 (16.01×4, 10×19) |
| remove `BUILDERS.icon` | red: 40.4 both sets, 40.18 built output (8 failures) |
| box branch returns null | red: 40.18 name-field and five boundary rows, 42.6 records drift (12 failures) |
| drop `node.kind === "icon"` from the box gate | red: 40.1 expected verdict, 42.6 records drift |
| `propsFor` size refusal back on any `size` prop | red after 40.18's no-build-drops assertion was added. It stayed green before that; this mutation is why the assertion exists |

## Not done

- The converter's `literal-size` reason text ("a size prop of {fill,hug} cannot carry it") is its wording for every numeric axis. R4 notes this, and the converter is untouched.
- Pixel gate not run. No shipped page or baseline is touched.
