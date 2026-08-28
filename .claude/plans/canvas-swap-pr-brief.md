# The swap PR — the one-way door, briefed

> Status: pre-ticket brief, 2026-08-28. Altitude: the scope, preconditions, order of operations and
> definition of done for the ONE PR that retires the grid. It is the input to that ticket's
> `piv-plan-implementation` pass after slicing, not the plan. Architecture:
> `docs/epics/canvas-design-import.architecture.md` § Other eng-lead calls (the deletion table) and
> § For slicing ("sequence the substrate before the width").

## Why one PR

The grid is four CSS families mirrored across ten build-checks groups and twelve files (observed,
2026-08-28). Half of it removed is a red build with no green path back, and a canvas that is partly
slots and partly free positions has no announceable unit, no codec rule and no gate. So the deletion,
the seven-group rewrite, the codec bump and the first spine that proves the new substrate land together,
and the door closes once. Everything two-way (primitives, groups, import, the agent) comes after.

## Preconditions (all must be true before the plan is written)

1. **S1's verdict is posted** and names its branch (`canvas-spike-s1-substrate-load.md`). No verdict, no
   plan.
2. **The Plus UI PR is merged** (`canvas-plusui-removal.md`), so this diff is the grid alone.
3. **The grammar change is merged** (`canvas-grammar-children-many.md`) and **`stack` + `text` have gone
   through the chain** as ordinary catalog components. MVP 14's spine places a `stack` holding a `text`,
   a `text-field` and a `primary-button`; if the primitives are not there the spine cannot be built.
   Recommendation to the slice: three tickets ahead of this one, all two-way.
4. **#281's package folder exists, or this PR writes the `build/` section of `discovery/README.md`
   itself** (the architecture's open-question rule).

## Scope

**Delete** (the table in the architecture doc is the source; restated as a checklist):

- `studio-canvas.mjs`: `MAX_COLS`, `MAX_ROWS`, `ZOOM_LEVELS` as the zoom source, `clampSlot`,
  `clampSpan`, `footprint`, `fits`, `fitLevel`, `MIN_SPAN`; `studio.css`: the four families'
  `data-col`/`data-row`/span tables and the five-entry zoom table; `studio-verbs.mjs`: `stepSlot`,
  `hitSlot`, `groupOccupancy`, `groupDelta`, `groupStep`, cell-based `guidesFor`; every `MAX_COLS` /
  `MAX_ROWS` import in `studio-select`, `studio-frames`, `studio-layers`, `studio-minimap`,
  `studio.mjs`, `replay-driver.mjs`, `studio.html`, `studio-journey.mjs`, `build-share.mjs`.
- `build-share.mjs`: the `g` field, its `length === b.p.length` rule, the coordinate tamper family in
  group 5, the arrangement cases in group 4.
- `studio.css`'s `GRID_FAMILIES` tripwire in group 12, replaced (below).

**Add / rewrite:**

- Two write helpers, `setPos(el, x, y, w)` and `setScale(stage, s)`, the only inline-style writers in
  the studio modules; group 7's `writes === 1` re-pinned to the named sites (`applyToStage`, `setPos`,
  `setScale`) and asserting nothing else writes.
- Continuous zoom: `fit()` fits exactly; ⌘-wheel zooms to the cursor; the scroll extent is sized from
  stage × scale in the same write path; the stepped table survives as the keyboard's path.
- Free positioning of every node class through `setPos`; the tripwire becomes "positioned only through
  `setPos`".
- Rank layout (BFS from the entry frame, one column per rank) for `arrangeBoard` and the replay driver;
  `/factory` lays every committed projection out with it.
- Nudge by a spacing token; snap-to-neighbour guides; multi-select move; align/distribute (left · centre
  · right · top · middle · bottom · distribute h/v); each with a keyboard path and a reading-order
  announcement ("moved to 3 of 7", plus the nudge offset).
- `system/canvas-ops.mjs` with the six ops the spine needs (`screen.compose`, `screen.set`,
  `state.add`, `frame.size`, `connect`, `disconnect`), the applier, `resolve`, `missingStates`, and its
  build-checks group (every op has `PARAMS` + a case; malformed throws; a dangling override is flagged;
  ids are deterministic).
- The SVG arrow overlay (Excalidraw binding shape, geometry derived).
- The renderer's optional `id` node key → `data-part`.
- Codec `v: 3`; a `v: 2` payload carrying `g` refused as "made with an older version".
- Groups 12, 13, 14, 22, 24, 26, 27 rewritten against the new helpers; their non-grid assertions kept.
- `tooling/studio-journey.mjs` and `vt-verify.mjs`: coordinate assertions by selector become position
  assertions by custom property.
- **The spine (MVP 14):** one frame at a free position holding a `stack` with a `text`, a `text-field`
  and a `primary-button`; a second frame as its error state stored as an override on the first; the dock's
  one-click pack switch on both; an arrow from the button to the error frame with `trigger: click`; saved
  to `discovery/<slug>/build/` (`ops.jsonl` + `canvas.json`), reloaded, and replayed on `/factory` through
  the rank layout.
- Verdant enters the pixel gate's `PACKS` in this PR (G14), since `/factory` regenerates here anyway.
- `param-manifest.json` entries for the new live controls under `/factory` + `gen-param-count`.

## T10 — the compressed codec, deferred here on purpose

T10 named `CompressionStream('deflate-raw')` for a codec v3 before any lz-string. It was written when
positions were expected to ride in the URL. With `g` deleted, the URL carries answers and the board only,
which is what v1 carried, so the size pressure T10 answers does not exist. This PR bumps the version and
deletes the field; it does **not** change the encoding. Revisit T10 only if a later field pushes a real
link toward Cloudflare's 16 KB ceiling — and then as its own ticket, with the codec header stating that
the tamper battery is integrity detection, not anti-forgery.

## Order of operations inside the PR

1. Branch from a `main` that has S1, Plus UI, the grammar change and the two primitives merged.
2. Delete first, watch the seven groups go red, then rewrite them against the new helpers — the "check
   that cannot fail" discipline: every rewritten assertion is seen failing on the deleted symbol before
   it passes on the new one.
3. The substrate (helpers, zoom, positioning, arrows, rank layout), then `canvas-ops.mjs` and its
   group, then the verbs and their announcements, then the spine.
4. Generators: `gen-loc-summary` (new `system/*.mjs` files), `gen-param-count`, `gen-handoff` if a
   token moved (S2 says whether).
5. Journeys ×3: `studio-journey all` (rewritten), `instance-journey` on a built dir, `catalog-journey`.
6. Baselines last, from a clean detached worktree: factory ×3 (neutral · saulera · verdant), approach
   ×2, and every page's verdant baseline (`canvas-baseline-cascade.md`).
7. The `discovery/README.md` `build/` section, if #281 has not written the folder's README.

## Definition of done (half-open is red)

- `git grep -n "data-col\|data-row\|MAX_COLS\|MAX_ROWS\|clampSlot\|stepSlot\|ZOOM_LEVELS"` over
  `system/ tooling/ *.html` returns nothing but history.
- `node tooling/build-checks.mjs`: all groups green, the seven rewritten ones each proven able to fail.
- The three journey drivers green on three engines; the INP gate green on the new substrate.
- Every committed `replay/*.json` plays on `/factory` under the rank layout with no projection edited.
- The spine's run package reloads byte-identically and the `ops.jsonl` ↔ `canvas.json` gate passes.
- `gh pr checks` green: `verify` (drift + token lint + loc), `visual`.
- CLAUDE.md's index rows for `studio-canvas.mjs`, `studio-verbs.mjs`, `build-share.mjs` say what the
  files now are; the "portal UI = a hash route" rule is not touched here (that is `canvas.html`'s PR).

## Concurrency

Nothing else regenerates `/factory`'s baselines while this PR is open, and nothing else adds an op to
`canvas-ops.mjs` (the two rules in the architecture's § For slicing).
