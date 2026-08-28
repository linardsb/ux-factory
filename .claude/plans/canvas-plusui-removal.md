# The Plus UI pack is removed

> Status: pre-ticket plan, 2026-08-28. Altitude: one small PR, its own, **before the canvas epic's first
> slice**. PRD: `docs/epics/canvas-design-import.prd.md` § MVP, "two decisions that ride alongside" (G11,
> owner: "its spacing and design are way out of whack"). Gets a `piv-plan-implementation` pass when picked
> up; this doc fixes the scope and the cascade.

## What goes

The pack imported from someone else's Community Figma file by `tooling/figma/figma-pull.mjs`, and every
switch, allowlist and regex that names it. Footprint, observed 2026-08-28 (`git grep -il plusui`, code
only):

| File | What it carries |
|---|---|
| `system/tokens.plusui.css` | the pack itself (deleted) |
| `system/dock.mjs` | the `PACKS` row and the `PACK_RE` alternation |
| `system/pack-boot.js` | the committed-pack allowlist (`saulera \| verdant \| plusui`) |
| `system/pack-import.mjs` · `pack-imported.mjs` · `pack-derived.mjs` | slug reservations / mentions (one, one, three) |
| `system/brand-import.mjs` · `build-import.mjs` | one mention each on the drop paths |
| `system/studio-frames.mjs` | one mention |
| `portal/lib/figma.mjs` | the `RESERVED` slug set |
| `tooling/studio-journey.mjs` | the pack-href regex the journey asserts against |
| `docs/figma-runbook.md` | the operator steps that produced it |

Plus the memory of it: `git log` keeps the import run; the runbook keeps a one-line note that the pack
was removed on 2026-08-28 and why, so the honesty trail does not end in a dangling reference.

## What stays

The Figma read path (`figma-read.mjs`, `figma-pull.mjs`, `--from`, the cache) — untouched; it is how the
next pack arrives. The `pack-import.mjs` engine — untouched. The dock's derived and imported rows —
untouched. No dock redesign, no allowlist refactor.

## One rule written in, not just removed

G14: **a ported pack, when one lands through the export path, gets its VR baselines and an accessibility
vet in the same PR that adds it.** That rule goes into the pack-import path's own header (the file that
owns the invariant) and into the runbook's "adding a pack" steps, so the next Plus UI cannot land
baseline-less the way this one did.

## The cascade

- Deleting `system/tokens.plusui.css` moves the runtime group in `system/loc-summary.json`
  (`gen-loc-summary.mjs` counts every `system/*.css`), and `approach.html` renders that group at view
  time, so: `node agent-layer/gen-loc-summary.mjs`, then **approach ×2 baselines** regenerated in this PR
  (`canvas-baseline-cascade.md` for the how).
- No dedicated Plus UI baselines exist (observed: `visual.spec.mjs:143` captures neutral + saulera), so
  nothing else in the pixel gate moves.
- `tooling/studio-journey.mjs` regex shrinks; `studio-journey all` re-run (operator gate).

## Verify

`git grep -il plusui -- . ':(exclude).claude' ':(exclude)docs'` returns nothing · `node
tooling/build-checks.mjs` all 27 green · `node tooling/studio-journey.mjs all` green · `node
agent-layer/gen-loc-summary.mjs --check` clean on the committed tree (run after staging: it reads
tracked content) · `gh pr checks` green, including `verify` and `visual`.

## Why its own PR

So the swap PR's diff is the grid and nothing else, and so the epic's first replay under the dock's
one-click switch shows three packs the repo can vouch for (neutral · saulera · verdant), which is G11's
"wears every pack" proof for run 1.
