# #449 — the importer reads `icon.name`

Epic #295. Branched from `origin/main` at `cc445e1` (PR #450's squash).

## What the ticket asked, and what the answer turned out to be

The ticket's scope was "an `icon`-kind node reaching the `icon` vocabulary entry — the principle
argued first, then the weights chosen to serve it", and it named the trap: a `kind-fit` branch at
0.25 plus a structural fill at 0.25 sum to exactly `THRESHOLD`, which is a pair of weights fitted
backwards from a wanted answer.

**That arithmetic does not hold, and measuring it is what decided the ticket.** `prop-fit` scores
`filled.length / req.length`, and `icon` has TWO required props — `name` (string) and `size`
(`md|lg|xl`). Filling only `name` is `0.25 × 1/2 = 0.125`, plus `kind-fit` 0.25 = **0.375**. The
principled change lands short of the bar on its own, so there was never a backwards-fitted pair to
avoid. The Chevron is now recognised and **still reads NOT COVERED** — which the ACs explicitly
allow ("state whatever the new answer is") and which is R1 working rather than failing.

## The principle (R4, in `import/recognise.mjs`'s header)

`svg(icon:caret-right)` is not a drawing the matcher has to interpret — it is the design tool
NAMING A PART OUT OF A LIBRARY, the same act as `inst()`'s master name, which `nameOf()` already
prefers over the layer name. The converter routed one into `component.name`, where `name-match`
reads it, and the other into `icon.name`, where nothing did. **That asymmetry was the defect**, and
the fix is to read the slot, not to invent a weight.

`icon.size` is **not** filled, and that is the rule rather than a gap: the box is 16/24/32px and the
drawing is 8.73 × 16, so reading 16 → `md` is #307's snap step. The type-role mapping is not the
precedent that would license it, and the difference is checkable — `["text","size"]` is one of
`ir.mjs`'s `TOKEN_SLOTS`, so a type step arrives BOUND with a `ref` and only the taxonomy differs,
while `style.size` is raw measured geometry with no ref at all.

Both branches key on **the entry DECLARING A GLYPH BOX** (a required enum of exactly `md|lg|xl`),
never on the slug `"icon"` — the same move `kind-fit`'s text branch makes when it reads
`PROP_SOURCES` rather than the word "text". The fill is gated on the entry as well as on the node
because `name` is three different questions in this vocabulary: `avatar.name` is a person's,
`plant-card.name` is a plant's, both words a designer drew and both still first-text.

## Changed

- `import/recognise.mjs` — R4 in the header; `GLYPH_BOX_ENUM` + `declaresGlyphBox`; the structural
  glyph fill (third resolution, before the `PROP_SOURCES` table); the `kind-fit` icon branch at the
  existing 0.25; `fillProp` takes `entry`; the stale comment saying "#449 is the ticket that changes
  it" rewritten. Eight effective lines of code.
- `import/fixtures/spike-c-instance.expected.json` — regenerated. The whole diff is the Chevron
  node: `candidates: []` → one `icon` candidate at 0.375, `score` 0 → 0.375, two named hits, and the
  floor drop's reason now carries `(best: icon at 0.375)`.
- `tooling/build-checks.mjs` — 40.3's note + two messages, 40.4's note + two messages, the
  `group()` prose, and **new case 40.18**.
- `.claude/references/gates.md` — group 40's entry: four invariants not three, eight synthetic cases
  not seven, and the snap boundary added to what the group cannot reach.

## Case 40.18, and the mutations that prove it can fail

Five assertions on hand-built icon nodes (both committed reads draw the same one chevron, so reading
these off case 40.1's answer would prove them for one drawing). What is pinned is the SHAPE of the
sum — the name fills, the box does not — never `0.375`.

| Mutation | Result (observed) |
|---|---|
| delete the glyph fill | ✅ red — `prop-fit read null with a glyph name and null without one` |
| ungate the fill (drop the entry check) | ✅ red — `scored [icon@0.375, avatar@0.25, plant-card@0.125] — expected \`icon\` alone` |
| snap the box (16 → `md`) | ✅ red, 7 failures — `the node totals 0.5`, the Chevron reads `"icon" via scored`, and it joins the refused set |

The third is the ticket's own trap, measured: filling the box lands the sum on `THRESHOLD` exactly
and covers the Chevron. The gate now refuses that by name.

## One cross-ticket consequence, written down at both ends

There is no `BUILDERS.icon`, deliberately — under an uncovered verdict `build()` returns at its
first line and a builder could not be driven. The day #307's snap makes the box fillable, the
Chevron reads covered and falls into `build()`'s `!builder` branch, which puts `icon` in the
recognised-but-refused set and reds 40.4's whole-set compare. That is the right failure; #307 owes
`BUILDERS.icon` in the same change. Recorded in R4's closing paragraph and in 40.4's note beside the
compare that would go red, so it reads as a known consequence rather than as a surprise.

Also worth stating plainly: `prop-fit`'s `field` on the Chevron reads `"name"` and does not
distinguish the glyph slot from `first-text`. A reader of `expected.json` alone cannot tell where
the value came from — case 40.18 proves it by mutation, so that guarantee is held one file away.
Widening `prop-fit`'s field shape is a wider edit than this ticket needs.

## Gates (observed)

- `node tooling/build-checks.mjs` → **all 41 groups pass**
- `node tooling/drift-check.mjs` → ✓ (14 legs)
- `node tooling/token-lint.mjs` → ✓ 63 contract tokens · 0 undeclared · 0 orphan
- `node import/regen-expected.mjs --check` → ✓ 55884 bytes

No visual-regression regen and no `loc-summary` regen: no shipped page, CSS or runtime module
changed, and group 40.8 asserts `import/` matches no `loc-summary` group.

## AC status

1. ✅ The reason an `icon`-kind node scores is R4 in the header, argued before the numbers, and the
   weight is the existing 0.25 rather than a new one.
2. ✅ `node.icon.name` is read — by `fillProp`'s third structural resolution, asserted by mutation in
   40.18.
3. ✅ `regen-expected.mjs` re-run and the diff read (Chevron node only); group 40's prose updated in
   both copies (the `group()` string and `gates.md`) to state the new answer.
