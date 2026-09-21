# #431 report — the containers-one-deeper walk

**Branch** `feat/gate-containers-one-deeper-431` off `main` @ `4550925`. One file of gate code, one
line of `gates.md`. No shipped file changes.

## What the walk found on the committed vocabulary (observed)

Two nested pairs: `stack > card > metric-tile` and `stack > stack > text`. Both leaves' markers
survive. The first is new coverage — case 5 only ever rendered `stack > stack`.

## Gates

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 36 groups pass |
| built-in control (copy with `card.children + "stack"`) | ✅ reports `card > stack > ghost-button` dropped — the leaf is the first non-container in `stack.children`, which is `ghost-button`, not `text`; the first draft matched on `text` and the control read `undefined`, so it was corrected to match the pair, not the leaf |
| hand mutation — `renderChild`'s `child.children ?? []` → `[]` | ❌ `composition 1 failure(s)`: `stack > card > metric-tile: the leaf's text did not survive` (case 5 red beside it) → restored ✅ |

## What this does not claim

Whether the grandchild LOOKS right is `catalog-journey`'s and the pixel gate's. The walk renders
under the DOM stub and reads text; a template that keeps the text but breaks the frame is not its
finding.
