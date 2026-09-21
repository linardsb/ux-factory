# #431 — gate: render every container's declared children one level deeper

Follow-up from PR #430's review (F4). A gate, not an edit: `card` and `empty-state` still render
their one child with a hardcoded `[]`, correct today (every declared child is a leaf) and wrong the
day a `children` list widens to a container.

## Tasks

1. `tooling/build-checks.mjs` group 3, case 5c — `deepPairs(vocab)`: for every entry with a
   `children` list, for every listed name that is itself a container, compose parent > child > leaf
   through `renderComposition` with props derived from the vocabulary (required string → marker,
   required enum → first value) and assert the leaf's marker survives. Failures name the path.
   → verify: 36/36; the walk finds ≥ 2 pairs on the committed vocabulary.
2. The control built in: the same walk over a copy whose `card.children` gains `"stack"` must report
   `card > stack > <leaf>` dropped. → verify: the case reads red when `card`'s `[]` would pass.
3. Hand mutation: stack's `child.children ?? []` → `[]`; the walk must go red by name.
4. Group summary string + `gates.md` clause (three copies rule).
