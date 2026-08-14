# Implementation Report — Studio 17: protos as device frames on the canvas (#219)

**Plan**: `.claude/plans/studio-protos-as-frames-219.md`
**Branch**: `feature/studio-protos-frames-219`
**Status**: COMPLETE

## Summary

Both shipped prototypes — Verdant's phone screen and Fieldwork's dispatch board — now sit on the
`/factory` canvas as real `<iframe>`s of the existing proto pages, arranged by the same
`data-col`/`data-row` grammar as everything else, moved by the same handle and the same `ui.move`
verb, and **resized** by a new `ui.resize` verb with a pointer path, a keyboard path, a live-region
announcement and a place in the one undo history. No file under `proto/` was touched, and
`system/device-frame.mjs` is byte-identical — the `window.self === window.top` guards those pages
already carry (#175, #176) are what make AC #2 true for free, and `framesPass` asserts it on each
frame's own `contentDocument` rather than assuming it.

Frames are a **fourth grid family** (`.stx-frame`), not a fifth `.stx-slot`: the four shipped
mechanisms that mean *board wrapper* by that class — the compile beat's two tripwires,
`arrangementNow()` and `adoptBoard`'s removal loop — are unchanged, and no `:not([data-stx-frame])`
appears anywhere in the diff.

## Tasks completed

| Task | Where |
|---|---|
| 1–2 · branch from fresh `main`, measure the baseline | `feature/studio-protos-frames-219` off `f7a04bb`; 23 groups, 4 `.stx-slot`, both drift checks clean |
| 3 · the pure span layer | `system/studio-canvas.mjs` (UPDATE) — `MIN_SPAN` · `FRAME_CLASS` · `MOVABLE` · `clampSpan` · `footprint` · `fits` |
| 4 · the `.stx-frame` family | `system/studio.css` (UPDATE) — 12 + 8 position rules on the `-start` longhands, 12 + 8 span rules, the height off `--stx-frame-unit`, `.stx-resize` at 24×24, the reduced-motion off-ramp |
| 5 · `place()` learns `kind: "frame"` | `system/studio-canvas.mjs` (UPDATE) — one branch, the widened idempotency test, `armMoveHandles`'s second id |
| 6 · the frames module | `system/studio-frames.mjs` (CREATE) — `FRAMES` · `packHref`/`packLink` · `anchorFrame` · `mountStudioFrames` · `getFrames` |
| 7 · mounted last | `system/studio.mjs` (UPDATE) |
| 8 · the pack re-point | `system/catalog.mjs` (UPDATE) — `watchPackSwap(root, onSwap = resolveTokenValues)`, plus the observer returned |
| 9–11 · scope, occupancy, the consumer, the gesture | `system/studio-verbs.mjs` (UPDATE); `system/studio-select.mjs` (UPDATE) — `carrying` widened, `chosenNodes` deliberately not |
| 12 · the page | `factory.html` (UPDATE) — the mount hook + one lead paragraph |
| 13 · the manifest | `system/param-manifest.json`, `system/param-count.json` — `/factory` 43 → 44, site-wide 117 → 118 |
| 14 · the non-regressions | proven below |
| 15–16 · the pure gates | `tooling/build-checks.mjs` — group 7's `MODULES`, group 12's fourth family + span mirrors, **new group 24** |
| 17–18 · the running-page gate | `tooling/studio-journey.mjs` — `framesPass`, `EXPECTED_NOISE`, `mainOnly` |
| 19 · the pixel gate | `tooling/visual-regression/visual.spec.mjs`; `system/loc-summary.json` regenerated |
| 20 · baselines | four PNGs, regenerated last from a clean detached worktree |
| 21 · the map | `CLAUDE.md` |

## Tests added

**build-checks group 24 — `frames`** (`system/studio-frames.mjs`'s pure layer): `FRAMES` frozen at
both levels *by mutation*; every `src` and `standalone` a real committed file, with the
`/proto/nope.html` mutation that decides whether that check can fail; every caption proven to carry
the site-pack sentence; each `anchor` pinned as a real id in the committed proto HTML and neither
url allowed a fragment; both footprints on the grid by `clampSpan`'s own definition, disjoint cell
by cell through `footprint()`, and clear of row 1 with `arrangeBoard` named as the reason;
`packHref` over a stub document — the contract-line trap, null rather than a throw, totality over 6
junk documents, and an unshipped pack name still matched. Closes with the boundary sentence naming
what `framesPass` owns.

**build-checks group 12** gained the fourth family, both span mirrors exhaustively and in both
directions, the "each row-span rule declares its index twice" pin, the grid-**shorthand** trap
(a `grid-column: N` rule would silently reset the span), and `--stx-frame-unit` pinned against the
at-rest `--stx-slot-h` — read out of the `.stx-viewport` block rather than by first match, because
the sheet declares that variable twice.

**build-checks group 7** gained `studio-frames.mjs`. That is not bookkeeping: `writes === 1` is the
entire reason resize is a grid span rather than #176's px `--frame-w`, so leaving the module off the
list would have been the "check that skipped the thing it tested" failure this repo has a memory
about.

**build-checks group 13** was *not* given new cases before the existing ones were re-run unchanged —
that run is the behaviour-preservation proof for the span widening, and it was green first.

**`tooling/studio-journey.mjs` — `framesPass`** (8 sections): both frames rendered at their declared
footprints with both handles armed and describing themselves through a resolving IDREF; **AC #2 on
each frame's own `contentDocument`** (no nested dock, inspect toggle, palette or standalone device
frame) behind a positive control that the page actually loaded; the dock's mid-visit swap
re-pointing the frame's own pack line while still not counting as a take-over; **three-source resize
parity** compared on the resulting `data-span-*` with the agent leg on a fresh page and
announcements counted per path (pointer 1 at the drop, keyboard N + 2 including a blocked press);
Undo restoring the span and naming it *as a size*; the **mixed move · resize · move** sequence walked
back by three Undos in order; ⌘/Ctrl+A leaving both frames unselected (D6's line); a frame stepping
clear of the other frame's *whole footprint*; and a compile and a redraft both leaving the frames
standing at an unchanged height.

## Validation results

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ **24 groups pass** (was 23) |
| `node agent-layer/gen-param-count.mjs --check` | ✅ 118 controls, no drift |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ 3 groups, no drift |
| `node tooling/studio-journey.mjs all` | see below |
| `node tooling/catalog-journey.mjs chromium` | ✅ 33 passed, 0 failed — mount 1 unaffected by the `watchPackSwap` widening |
| `node tooling/vt-verify.mjs all` | see below |
| `npm run test:docker` | see below |

**Mutations proven to go red, then reverted:** deleting `.stx-frame[data-span-col="7"]` (group 12,
named index 7); pointing a descriptor at `/proto/nope.html` (group 24); renaming an `anchor` (group
24, named the id and the file).

## Non-regressions (Task 14)

1. **No proto file touched** — `git diff --stat origin/main -- proto/ system/device-frame.mjs` is
   empty.
2. **`.stx-slot` still means board wrapper** — `studio-compile.mjs:413`, `:514`, `studio.mjs:543`
   (`arrangementNow`) and `studio.mjs:641` (`adoptBoard`) all still query `".stx-slot"` verbatim, and
   no `:not([data-stx-frame])` exists anywhere. The design bought what it was chosen for.
3. **Compile survives the frames** — `framesPass` section 8 compiles a canvas holding two frames:
   one screen per board wrapper, no refusal card, the frames untouched, and *the same height* in both
   states (D4's claim, measured rather than argued).
4. **The share link still round-trips** — `keepPass` is unchanged and green; frames are deliberately
   not in `arrangementNow()`'s `g`, so `sent.length === arranged.length` still holds.

## Deviations from the plan

1. **`mountStudioFrames` takes no `bus`.** The plan's signature was
   `mountStudioFrames(canvas, { bus, root })`. The module emits nothing — every action on a frame is
   `studio-verbs.mjs`'s — so a bus handle would be a parameter with no call site. Recorded in the
   module header as call 7.
2. **`watchPackSwap` also returns its `MutationObserver`** (the plan said "signature only"). Both
   existing mounts ignore it; `studio-frames.mjs` does not, because `studio.mjs`'s `destroy()` tears
   the studio down mid-visit in the journey driver and an observer left watching the head link would
   go on re-pointing frames that no longer exist. One line, no behaviour change for mounts 1 and 2.
3. **The footprints are 2×2 at (1,3) and 3×2 at (3,3), not the plan's 2×5 and 4×4.** The plan asked
   for this decision to be made in a real browser (Assumption 3) and it was, twice. The binding
   constraint is not the one the plan predicted: with frames at rows 2–4 the canvas has **exactly one
   pointer-reachable free cell** left, which quietly contradicts the page's own "a canvas you can
   move" — and `studio-journey`'s existing #217 marquee and group-move fixtures failed for precisely
   that reason. Rows 3–4 leave row 2, directly under the board, free.
4. **Each frame opens at its prototype through an `anchor`, not at the proto page's lede.** Not in
   the plan. Both pages open with ~250px of notice, title, paragraph and badge, which fills a 296px
   device frame and pushes the product out of sight. `anchor` is an id both pages already carry; no
   proto file is edited. The obvious implementation — a `src` fragment — was **measured and
   rejected**: it scrolls every ancestor scroll container, leaving the canvas at `scrollTop` 313 at
   rest, which breaks `studio-canvas.mjs`'s "scale 1, scrolled to 0,0" contract and makes the pixel
   baseline depend on when a lazy frame happened to load. `contentWindow.scrollTo` touches nothing
   outside the frame, and it waits for the embedded page's own settle handle rather than for `load`,
   because the lede above the anchor grows when the notice text lands.
5. **`studio-journey.mjs` gained an `EXPECTED_NOISE` filter and `mainOnly` scoping.** Not in the
   plan, and both are a real weakening/narrowing of a shipped gate, so they are called out here
   rather than buried. Embedding the proto pages puts two more documents inside `/factory`, and
   Playwright reports a sub-frame's console messages *and* routes its requests through the embedding
   page's handlers. Two consequences: the proto pages' designed Worker fallback logged refused
   connections on every `/factory` page (filter copied verbatim from `proto-journey.mjs:70`, and the
   `/studio.html` opener deliberately keeps the stricter no-filter contract), and Fieldwork fetches
   the same `handoff/verdant/vocabulary.json` the compile beat lazily fetches — which broke the
   beat's lazy-fetch assertion and let `#237`'s 503 fixture serve its one failure to the frame
   instead of to the beat. `mainOnly` scopes five request logs and two route fixtures to the
   document under test.
6. **`hitSlot` was not made span-aware** (the plan's Files-to-Update table promised it). A resize
   treats the hit cell as the desired bottom-right corner and a move maps a point to a new top-left
   with the footprint tested downstream by `fits`, so there is nothing for `hitSlot` to know. No
   group 13 cases were written for it.
7. **The resize preview falls back per axis.** A pointer drag moves both axes at once, so an
   all-or-nothing fit test refuses the growth the frame *does* have room for whenever the other axis
   is blocked — on the shipped canvas that is the commonest gesture on the commonest frame. The
   keyboard path is unaffected by construction (one arrow changes one axis, so both fallbacks
   collapse to the current span and the press is announced as blocked).
8. **Three shipped `#217` fixtures in `studio-journey.mjs` moved.** These are the changes most likely
   to be read as weakening a gate, so each is argued rather than listed. The frames are real canvas
   content, and a fixture that assumed a cell was empty has to move when the page fills it —
   `selectPass`'s own `reachable()` guard exists for exactly this and threw with the right message.
   · **The alignment guides' peer set widened to the MOVABLE families.** `renderGuides` includes a
   frame and is *right* to: a device frame is on the grid, so a block sharing its column really is
   aligned with something. Left narrow, the driver's predicate called an honest guide a lie. The
   mutation that forces a guide onto a provably empty column is untouched and still goes red.
   · **The mid-carry Shift-drag moved from rows 3–4 to row 2.** Started on a frame it pressed *inside*
   the iframe, taking focus with it, so the Escape that follows never reached the page under test —
   the assertion would have been vacuous, not merely relocated.
   · **The quick group drag goes one row instead of two.** Rows 3–4 are the frames, and an occupied
   cell is not enterable, so a two-row drag would have been asserting the collision rule rather than
   the stale-rAF-frame flush it exists for. One row still crosses a cell boundary, which is all that
   bug needs.
9. **`perfPass`'s throttled frame check waits for both proto pages to settle before throttling.** Two
   page boots under a 4× CPU throttle put one 61 ms long-animation-frame inside the measured drag
   window. That is not a drag-smoothness regression, it is bootstrap work inside a window the check
   already excludes bootstrap from — the 500 ms rest above it makes the identical argument for
   `site.js`/`dock.mjs`'s chrome injection. Waited for on each frame's own settle handle, never slept
   past, and swallowed on timeout because whether the frames load at all is `framesPass`'s assertion.
10. **`framesPass`'s AC #2 asserts the ⌘K palette's at-rest CHROME is absent, not the palette layer.**
   The first version asserted the layer absent and went red — correctly. `proto/verdant.html:191-202`
   records the opposite call in its own words: *"A reader who deliberately drives the ⌘K palette
   inside the frame still gets the layer — the rule is about at-rest chrome, not consent."* So the
   assertion now forbids a visible hint or an open dialog, and separately asserts the layer is
   **present** — the proto pages' recorded decision, gated rather than accidentally reversed.
11. **`EXPECTED_NOISE` gained firefox's wording, and five existing chromium-only resource-error
   exemptions gained the shared filter.** Firefox reports the same refused Worker as
   *"Cross-Origin Request Blocked … CORS request did not succeed"* and names the Worker's origin;
   the five listeners that already exempted chromium's `"Failed to load resource"` had no equivalent.
   Found by running firefox, not by reasoning about it.
12. **`framesPass`'s pointer drag derives its delta from the resolved grid** rather than the 170 px
   that worked on chromium. On firefox that constant crossed no row boundary, so the resize did
   nothing and the row read as a bug in the module rather than in the fixture — `selectPass`'s own
   recorded discipline, applied one engine late.

## Issues encountered

- **The plan's Task 11 branch table was not exhaustive.** `stage` pointerdown resolves its subject
  two lines *before* the handle test the table widened (`closest(".stx-slot")`), so a press on a
  frame returned early and the resize handle did nothing — the symptom the table warned about,
  arriving from a line it did not list. Two more sites had the same shape: the `scroll` sticky-drop
  guard and the keydown pick-up's `handle.closest(".stx-slot")`. Three further kind-aware fixes the
  table did not name were needed for a resize to work at all: `restore()`'s early-`continue` skipped
  every pure resize (Undo reported "Nothing to undo" while the span stayed wrong), `drop()`'s
  "did anything change" test read slots only, and pointerup's `still` test did the same — which made
  every resize *drag* read as a click and go sticky instead of committing.
- **`pickUp`'s selection query must stay `.stx-slot`-scoped** while `slots()` widens. That is D6, and
  it is what stops a marquee marking a frame that a group move would then silently drop.
- One journey run failed spuriously because I edited a served module while the driver was running
  (`catalog.mjs` was briefly unparseable, so `studio.mjs`'s module graph failed and
  `[data-studio="ready"]` never resolved). Re-run on a consistent tree: 435 passed, 0 failed.

## Follow-up logged

- **A dropped or derived brand does not reach the frames.** Custom properties do not cross a document
  boundary, so the frames wear the reader's *committed* pack while the canvas around them wears the
  dropped one. Stated to the reader in every frame caption and in `factory.html`'s lead copy. Not
  solved here by owner decision (2026-08-14): copying the vetted token map into the frame document
  would make the one-application-point vetting invariant `writes === 1` become 2.
- **`groupOccupancy` is the one function in the group family this ticket does not widen**, named in
  both `studio-verbs.mjs`'s and `studio-frames.mjs`'s headers as the remaining piece. Nothing calls it
  with a spanning member while frames stay out of the selection; the day a later ticket widens the
  selection layer and forgets it, the failure is a group move that lets a frame overlap a peer —
  silent, with no gate watching.
