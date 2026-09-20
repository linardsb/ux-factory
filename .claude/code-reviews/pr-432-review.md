# PR #432 review — the grid retired: a free substrate, canvas-ops.mjs, MVP 14's spine (#302)

**Head** `f544b0a` · **Base** `main` @ `287445e18cb34333ad8fb8580fe8ec4e55856e77` · **Round** 1 (no prior report — the guarantees pass has no base to compare against) · **State** OPEN · **mergeStateStatus** CLEAN, base unmoved

**Recommendation: request changes.** 1 critical, 3 high, 8 medium, 8 low.

**Provenance.** This review ran the gates itself and re-derived the figures below. Deep file analysis
was dispatched to a second reviewer in a clean context; findings that came from it and that I then
re-derived myself are unmarked, and findings I am **carrying without independent verification** are
marked **†**. Two sub-measurements inside otherwise-verified findings are marked the same way.


Every gate in the repo is green on this tree and every one of the four blocking findings survived
it. That is not an argument against the gates — it is the same observation the PR itself makes about
its own six product defects, arriving one layer further out. Three of the four are invisible for a
structural reason, not an oversight: a selection outline is not in an at-rest capture, a fixture
hands the pure function a shape the page never produces, and a scroll clamp only bites once the
reader has panned.

The coordinate swap itself is well executed. See **What is good** at the foot.

---

## Critical

### F1 · a stray `*/` deletes the selection outline — `/factory` gives no feedback when you select something
`system/studio.css:236`

Line 236 closes the comment (`holds them to an exact budget. */`); lines 238-239 are then bare CSS
prose ending in a second `*/`. CSS error recovery consumes tokens until the next `{…}` block, so the
next qualified rule is swallowed with the garbage.

**Observed — the sheet parsed in Chromium, head against base, same probe:**

```
BASE 287445e | 334 rules | .stx-slot.is-selected present: true
HEAD f544b0a | 232 rules | .stx-slot.is-selected present: false
```

`.stx-slot.is-selected { outline: 2px dashed var(--color-accent); outline-offset: 2px; }` is gone.
`.stx-slot.is-selected.is-picked { outline-style: solid; }` on the next line survives, so a node that
is selected *and* picked still gets an outline (initial width and `currentColor`) while a merely
selected one gets nothing at all. Marquee select and Shift-click — #217's core affordance — produce
no visible feedback.

No gate can see it: the outline is not a state any at-rest capture holds, so the re-baselined pixel
gate (`6a69f3f`) is structurally blind to it, and the driver asserts selection through
`data-stx-selected` rather than through a computed style.

**Fix:** delete the `*/` on line 236 so 238-239 stay inside the comment.
**And close the class:** one `studio-journey` row reading `getComputedStyle(slot).outlineStyle` after
a marquee. Without it the next comment edit does this again silently.

---

## High

### F2 · three of the eight new align verbs are wrong on every node they can act on
`system/studio-verbs.mjs:786` · reading `boxOf` at `:363` and `alignMoves`'s `h()` at `:193`

The handler selects `.stx-slot[data-stx-selected]` — board wrappers only; frames are deliberately
unselectable. A board wrapper never carries `--h`, which the module's own comment at `:377` states
("a board wrapper does not, and writing `h: 0` for it would be claiming a property it has not").
`boxOf` therefore returns `h: null` for **100% of possible inputs**, and `alignMoves`'s
`h = (b) => Number.isFinite(Number(b.h)) ? Number(b.h) : 0` coerces every one to zero.

Consequences, from the arithmetic at `:224`, `:240` and `:241`:

- `align-bottom` (`want.y = target - h(b)`) aligns **tops** to the bottom-most node's **top**
- `align-middle` aligns **tops** to the mid-line
- `distribute-v` equalises **top spacing**, not gaps

Measured on a real page with two wrappers of rendered height 48 and 198: `ui.align-bottom` left them
at bottom 88 and 238, tops both at y=40. **†** (the measurement is carried; the chain above it —
selector, `boxOf`, `h()`, the three arithmetic lines and the fixture — I read myself.)

**Why nothing went red.** `build-checks.mjs:3019`'s `BX` fixture hands every box an explicit `h`
(40/60/40), so `alignMoves` is never driven on the shape the page produces. This is the repo's own
"the check that cannot fail", in a group added by this PR.

**Fix:** measure at the geometric read, the way `studio-select.mjs`'s hit-test `boxOf` already does
after P3 — `{ id: idOf(n), ...b, h: b.h ?? n.offsetHeight }` at `:786`. Leave `snapshot()`'s `boxOf`
alone; the two questions are genuinely different. Then add a `BX` case with `h: null` — that fixture
shape is what would have caught it.

**Same root cause, same line:** `renderGuides` (`:459`) feeds the same `boxOf` output to `guidesFor`,
so on the Y axis a board wrapper contributes only its top edge and the centre/bottom guides that
function's own comment promises never fire for one.

### F3 · the zoom anchor drifts once the reader has panned
`system/studio-canvas.mjs:398`

`setZoom` calls `queueScale()` — rAF-deferred (`:370-375`) — and then writes `scroll.scrollLeft` and
`scrollTop` on the two lines below it, with the comment *"the browser clamps both to the new range"*.
But the scroll range comes from `--stx-extent-w/h`, which `.stx-sizer` reads (`studio.css:70-74`) and
which `setScale` writes **inside `flushScale`**. At the moment of the scroll assignment the sizer
still holds the **old, smaller** extent, so the browser clamps against the old maximum, and nothing
re-applies the target after the rAF. The comment was true on `main`, where `data-zoom` was written
synchronously.

**Derived from the code, for scale 1 → 1.25 at `scrollLeft` 1500, anchor x=800, `clientWidth` 1000:**

```
cx = (1500 + 800) / 1            = 2300
wanted scrollLeft = 2300 × 1.25 − 800  = 2075
old max = 2816 × 1 − 1000              = 1816   ← clamps here
drift = 2075 − 1816 = 259 screen px  (= 207 stage px)
```

Measured at the same numbers **†**. The arithmetic above is mine, off the real constants:
`setScale` (`:164-171`) writes `--stx-extent-w: ${STAGE_W * scale}px`, so the extent really is
scale-dependent and the deferred write really does leave the old maximum in place. Affects both zoom
buttons and ⌘/Ctrl-wheel, and grows
with how far right or down the reader has panned. AC #3's "⌘-wheel zooms to the cursor" is
unasserted: `studio-journey.mjs:685` asserts the wheel *does* zoom and nothing asserts **where**.

**Fix:** flush before the scroll write — `if (scaleFrame) cancelAnimationFrame(scaleFrame);
flushScale();` in place of `queueScale()`. Drift goes to 0.

**State the trade rather than discovering it later.** That undoes the rAF coalescing on the zoom
path, and the header cites S1's measurement that a per-event write is what costs a pinch. Deferring
the scale while writing extents synchronously is *not* an escape — it desyncs scale from extent for a
frame, the exact thing "one write path, one fact" exists to prevent. Re-applying the scroll target at
the end of `flushScale` keeps both properties and is worth considering against the flush. **Re-run
the pinch measurement either way**; do not adopt a fix here on reasoning alone.

### F4 · shipped copy still claims the link carries the arrangement — the honesty contract, marked hard
`system/studio-keep.mjs:112-114`

`SHARE_NOTE`, rendered on `/factory`'s keep rail:

> "The whole build travels in the link itself: the board, the design values, and — because this page
> has a canvas and the builder does not — where each block sits on it."

`g` is retired; where each block sits no longer travels. The PR removed `NO_ARRANGEMENT`, both aria
variants and the button label — `param-manifest.json:96`'s new note records the label change
explicitly — and left the paragraph making the same claim. CLAUDE.md: *capability indicators state
exactly what runs vs. what's plan-gated*, hard.

**Fix:** drop the middle clause and its em-dashed aside.

---

## Medium

### F5 · the applier is not pure — it aliases the op's params into the returned document
`system/canvas-ops.mjs:168, 192, 216`

`clone(doc)` protects the input document. `screen.compose` stores `p.composition`, `state.add` stores
`p.override` and `connect` stores `p.from`/`p.to` **by reference**.

**Observed, run against the shipped module:**

```
doc.arrows[0].from === op.params.from          →  true
doc.arrows[0].from.frameId = "MUTATED"
op.params.from                                  →  {"frameId":"MUTATED"}
```

A caller that edits the returned document silently rewrites the op record it was built from — which
is what a canvas surface editing a loaded build will do. The header's claim is "a clone so the
applier never mutates its argument"; that is half the property the name implies, and group 35's
purity case ("purity proven by mutating the input and by mutating the return") tests the document,
not the params.

**Fix:** `structuredClone(op)` at the top of `applyOp`.

### F6 · the arrow overlay ships with no consumer and no coverage of any kind, and the PR body omits it
`system/studio-canvas.mjs:192, 693, 704`

- `arrowPath` is pure, exported and total. `tooling/build-checks.mjs:221` imports `setPos`,
  `setScale` and six constants from that module and **not** `arrowPath` — no group covers it.
  Group 12 drives `setPos` over 11 hostile inputs and `setScale` over 8, and skips this one.
- `tooling/studio-journey.mjs` names `.stx-arrows` once (`:263`, a stray-style sweep) and asserts
  nothing about arrow geometry.
- **`setArrows` has no caller anywhere in the repo** — a tree-wide grep returns only its definition
  (`:693`) and its entry on the returned handle (`:704`). Nothing draws an arrow on any page, so the
  pixel gate cannot see one either.

So an SVG layer, a marker def, a MutationObserver, a rAF coalescer, `arrowPath` and `setArrows` ship
with zero coverage and zero consumers. The report's H9 and its Resume order say one running-page
assertion is owed; the PR body's **Still outstanding** lists Level 5 only. The cheap half is missing
too: `arrowPath` is pure, total and trivially drivable (clip on each axis, the back-edge case its own
header names, the overlap→`null` case, junk).

**Fix:** add the `arrowPath` cases to group 12, and say in the PR body that the overlay has no
consumer until #306.

### F7 · "would have passed the pixel gate" is not observed, and is false for P1 and P2
PR body, the preamble to the six-defect table

Which run produced it? None. The pixel gate ran once, in Phase 9, on the **fixed** tree. The report's
own Phase 9 table says `factory-{neutral,saulera}.png` were rewritten **because of P1 + P2**, and
that only the `approach` pair had to be forced past `maxDiffPixels: 100` — so the `/factory` delta
cleared the threshold on its own. A gate run on the P1-carrying tree against the then-committed
baselines would have been **red**: 31 slots as a ~2,800px column against a grid capture is not a
100-pixel difference.

What is true is stronger and worth saying instead: the gate would have been **re-baselined** and gone
green on a wrong layout forever — the trap this repo already has written down.

This matters because the sentence after it, *"No DOM-free gate can reach any of them"*, is the epic's
argument for the journey-driver layer, and the pixel gate is not DOM-free. A later ticket could
de-scope pixel work on the strength of a claim that is false for two of the six.

### F8 · stale comments in files this PR rewrote, several naming gates that no longer exist
CLAUDE.md: *"Invariants live in the file that owns them… That header is the specification."*

| Site | Says | Actually |
|---|---|---|
| `system/studio.css:317` · `system/studio-frames.mjs:25` | "build-checks group 12's `GRID_FAMILIES`" | `GRID_FAMILIES` has **zero hits** in `tooling/build-checks.mjs` |
| `system/studio.css:313-314` | "frames: the FOURTH grid family" · "A frame is on the grid" | nothing is on a grid |
| `system/studio.css:328-331` | the `grid-column: N` shorthand block | orphaned — the rules it documents were deleted, blank lines left behind |
| `system/studio.css:335-337` | "Each row-span rule declares its own index TWICE… Group 12 asserts the pair agrees" | no span rules; group 12 asserts no pair |
| `system/studio.css:252-253` | "`.stx-slot` is position: relative (:124), so it paints in the positioned phase above this static grid item" | P1's own fix deleted that declaration — and this is the stated reason `.stx-guide` is left at `z-index: auto` |
| `system/studio.css:486` | "a resize is an attribute flip the grid resolves" | a resize is a `--w`/`--h` write |
| `tooling/studio-journey.mjs:12-14` | "asserts no `style` attribute exists on any of them" | asserts a seven-property `STYLE_ALLOWED` (`:207`) through `strayStyles` (`:212`) — AC #8's own narrowing |
| `tooling/studio-journey.mjs:15-19` | `fitLevel` · "the next level up does NOT fit" | `fitLevel` appears nowhere in the file but that comment |

The rest of the retired-name sweep is genuinely clean — AC #1's seven-symbol grep re-derived at **0**
over `system/`, `tooling/` and every `*.html`, and the historical framing elsewhere in `studio.css`
("the retired grid's…", "Until then they were…") is correct and worth keeping. These eight are the
ones written in the present tense about a live mechanism.

### F8b · the driver's own green-run summary line still asserts the retired `g` field, three times
`tooling/studio-journey.mjs:7002` (and the comments at `:3296`, `:3347`)

This is the `studio-journey ✓` string — printed at the end of **every** passing run, and the thing an
operator reads to decide what green means. On this tree it says:

> "the copy click leaving a REAL pathname carrying a `?b=` that decodes back to this board **WITH ITS
> ARRANGEMENT** — the one thing /build's rail cannot express, and the field the codec drops silently"

> "the arrangement moved OFF the default row-1 layout before the copy, which is what turns the
> sender's-coordinates assertion into **the g-restore's only running-page proof** rather than a claim
> both branches satisfy"

> "so the copied link **now CARRIES the arrangement**, labelled as carrying it"

`g` is deleted, there is no g-restore row any more, and "the default row-1 layout" is the retired rank
rule. P5 retired the two *assertions* and left the paragraph that describes them — the same split as
F4, on the gate's own reporting surface rather than on the page. It printed verbatim at the foot of my
own green run.

The report's H7 names this exact failure mode: *"a group line in this file is prose a reader trusts,
and writing it from the plan rather than from the code is how the repo's largest class of process
finding gets in through a door no gate watches."*

**Fix:** rewrite the three clauses to say what is asserted now — the link decodes to the same board and
carries no arrangement key — the way P5's retired rows already do.

### F9 † · `DRAG_SLOP` is compared in stage units, not screen pixels
`system/studio-select.mjs:559,563`

`pointOnStage` has already divided by the scale, so the effective screen threshold is `4 × scale`. At
scale 0.1 that is 0.4 screen px: a hand tremor on a Shift-click crosses it, `paintMarquee` flips
`m.dragged`, and `marqueeRange` **replaces** the selection instead of adding to it — the reader
silently loses the set they were building. At scale 4 it is 16 screen px, swallowing a deliberate
small marquee.

**Fix:** compare the client-space delta, or divide the slop by `canvas.scale`.

### F10 † · `replay-driver.mjs`'s header now contradicts its own new code
`system/replay-driver.mjs:19` vs `:526`

Line 19 was edited **in this PR** to read "never writes a position on an existing wrapper".
`relayout()` at `:526` — P2's fix — writes a position on every existing wrapper via `setPos`,
bypassing the bus and the history. Concrete consequence: a reader who takes over mid-replay and drags
a block has it silently repositioned by the next `connect` op, with no history entry, so Undo
restores the pre-drag snapshot and the manual placement is lost with no announcement. That is the
"second mover" the header exists to forbid.

**Fix:** state the exception in the header (a layout correction, not a move; does not enter history;
name the take-over consequence), or gate `relayout()` off once `trackFactoryTookOver` has fired.

### F11 † · `readingOrder`'s band is fixed bucketing, and its fixture passes vacuously
`system/studio-verbs.mjs:169`

The comment promises "nodes whose tops sit within one node of each other read as a row".
`Math.floor(y / ROW_BAND)` is a fixed 140px grid: y=130 and y=150 land in different rows while y=0
and y=139 share one. The gate's fixture (y=0 vs y=20) sits inside one bucket, so it passes for the
wrong reason.

The **comment** is probably the thing to change — fixed bucketing is deterministic and fine for an
ordinal in a live-region sentence, and a true relative band needs a clustering pass nobody asked for.
Either way it should not stay as-is, and the fixture should straddle a boundary.

### F12 · two new modules with no runtime consumer are counted as view-time code
`system/canvas-ops.mjs:22-26` · `system/loc-summary.json`

The header justifies putting the file in `system/` — and therefore in the count `approach.html`
renders — with "because a SHIPPED PAGE loads it". No page does: the only importers are
`tooling/build-checks.mjs` and comments. `canvas-store.mjs`'s own header says "NO ROUTE IN THIS PR —
that is #306's live page". The regenerated `loc-summary.json` adds ~700 lines to the group
`approach.html` labels *"design system (system/ — tokens, components, **view-time modules**)"*.

**Fix:** correct the header's stated reason to "#306 will load it", and decide whether a module with
no runtime consumer counts against the rendered total before #306 lands.

---

## Low

- **F13 · `system/action-bus.mjs:46`** restates another file's guarantee, wrongly: *"A v2 share link
  carrying the old shapes is refused by `system/build-share.mjs` BY NAME."* A v2 link is refused at
  the **version** check (`build-share.mjs:302`) with `"this link is format v2; this builder reads v1
  and v3"`; the by-name `g` refusal (`:311`) can only fire on a v1 or v3 payload. `build-share.mjs`'s
  own comment at `:306-309` and the report's Task 1.5 table (row M3) both say this correctly. One
  guarantee, two copies, and the copy is the wrong one.
- **F14 · `system/device-presets.mjs:18`** — "1440 the desktop width this site's own pixel gate
  captures at." The gate captures at **1280** (`visual.spec.mjs:203,209,242`); 1440 appears nowhere
  under `tooling/visual-regression/`. The preset is fine; the reason given for it is not.
- **F15 · PR body: "Six product defects the driver migration found."** Five. **P5** is a stale
  assertion in `tooling/studio-journey.mjs` keepPass — the report's own table names the file. The
  section immediately below already counts a fixture defect separately.
- **F16 · PR body's P4 row reads as fully fixed.** `system/studio-verbs.mjs:1173-1176` records that
  members still deform at the edge, so #217 AC #2 "the selection keeps its shape" stays false for a
  group drag whose *non-anchor* member reaches the edge. The module header is honest here; the PR
  body is the surface that is not.
- **F17 † · dead code this PR created.** `system/studio-verbs.mjs:1360-1361` — `const g = pickUp(...)`
  is bound to nothing since `526e92c` removed the line beneath it, and the `return;` under it is
  mis-indented. `system/studio.mjs:305` — `renderSummary`'s `arranged` parameter is unused now that
  the truncation notice is gone (D9), and both call sites still pass it. `system/studio.css:272-273`
  and `:360` — `align-self` / `justify-self` are inert on `position: absolute` children of a plain
  block stage, and `:342`'s comment still cites `align-self` as half the reason the device keeps its
  size when only the explicit `height` does that now.
- **F18 † · two `canvas-ops.mjs` refusals name no value** — `:118` and `:210` say what was required and
  not what arrived, against the repo's "an `Error` whose message names the offending path/value". The
  other fifteen do.
- **F19 · `.claude/references/gates.md`** — groups 35 and 36 are filed **outside** the section
  holding groups 1–34: they sit after `## The security gate` (`:125`) and before `## The morph gates`
  (`:164`) under no parent heading, and are styled `**group 35 ·` against the file's `**Group 30 —`.
- **F20 · `gates.md:168`** still scopes `vt-stack-audit`'s hazard-A false positive to "`/index` and
  `/roundtrip` (2 of the 7 shipped IA pages)". This PR's **H8** measured `/factory` as a third,
  byte-identically on the base tree. Pre-existing and #190's, flagged only because #302 edits this
  file and has the observation in hand.

---

## Open questions for the owner †

1. **`state.add` allows a state of a state** (`canvas-ops.mjs:179` resolves `baseId` to any frame,
   including one that already has a `baseId`). `missingStates` skips those, so they are invisible to
   the floor check. Deliberate, or a refusal by name?
2. **`state.add` allows duplicate `(baseId, stateKey)` pairs** — two `error` siblings on one base,
   which `missingStates`' `Set` absorbs silently.
3. **`connect`'s `from`/`to` are not exact** the way the top-level params are: `{ frameId: "f1",
   bogus: 1 }` is accepted and recorded verbatim. Does "an op whose recorded text says more than the
   op that was applied" stop at one level on purpose?
4. **`discovery/faster-payment/build/canvas.json`'s derivation claim is unverifiable.** `$description`
   says positions come from the rank layout; `f2.x` is 472 while the only rank pitch in the repo is
   `NODE_W + NODE_GAP = 236`. The one-off script that wrote the spine is not committed, so nothing can
   regenerate or drift-check the file — against "generators run at authoring time, outputs are
   committed". Not asserting 472 is wrong; asserting nothing can tell.
5. **Was the pinch cost re-measured after the rAF coalescing landed?** F3's fix removes it on the zoom
   path, and the number decides whether the `flushScale` re-apply is worth the extra code.

---

## Validation — all observed on `f544b0a`, this tree

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | **`build ✓  all 36 groups pass`**, exit 0 |
| `node tooling/drift-check.mjs` | **exit 0** — thirteen legs, verbatim as the report lists them |
| `node tooling/token-lint.mjs` | **✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid**, exit 0 |
| `node tooling/studio-journey.mjs chromium` | **`── chromium: 525 passed, 0 failed`**, exit 0 — matches the PR body exactly |
| `gh pr checks 432` | **6/6 pass** — CodeQL · audit · codeql · gates-green · verify · visual |
| `gh pr view --json mergeStateStatus` | **CLEAN**, base still `287445e1` |

**Re-derived rather than taken from the report:**

| Claim | Check |
|---|---|
| AC #1's seven-symbol DoD grep → 0 | **0** over `system/`, `tooling/` and every `*.html` ✓ |
| 33 baseline files, 15 written | **33** in `baselines/`; **15** baseline paths in the PR's file list (11 new verdant + 4 modified) ✓ |
| `param-count` 121, no drift | **121** in `param-count.json`, **121** entries in `param-manifest.json`; the `+1` is `.stx-align`, correct under the manifest's own button-row rule — the nudge is a keyboard mode on `.stx-grab`, already an entry ✓ |
| `loc-summary` runtime 31,500 | **31,500** ✓ (but see F12 on what it now counts) |
| group 36 reproduces `canvas.json` from `ops.jsonl` | ran the six committed ops through the real `applyOps` myself: frames `f1` (w 390, screen `add-payee`) and `f2` (w 390, base `f1`), arrow `a1` f1→f2 — matching `canvas.json`'s ids, widths and refs exactly ✓ |
| the codec's `g` refusal | `SHARE_VERSION 3`, `SHARE_VERSIONS [1,3]`, and the version check precedes the `g` check — confirming the report's M3 row and contradicting F13 ✓ |
| `canvas-store.mjs` imports node built-ins only | `node:fs` and `node:path`, nothing else ✓ |
| `.stx-slot.is-selected` present on base, absent on head | see F1 — the one re-derivation that changed the verdict |

**Caveat on the driver figure.** My `studio-journey chromium` run overlapped with a second process's
source probes, which patched and reverted two files mid-run. Treat 525/0 as corroborating rather than
clean. Its **0 failures is itself the evidence** for F1, F2 and F3 — all three are live on the tree it
drove, and it printed F8b's stale summary verbatim on the way out.

---

## What is good

- **The coordinate chain is right where it is hardest.** `pointOnStage` does rect → scroll offset →
  scale divide in the correct order in both modules, and `grabOffset` is measured in stage units so
  it survives zoom. The resize grab offset is taken from the **corner** and the move offset from the
  **origin** — two different reference points, both correct, and P6 is exactly that distinction.
- **H1 is the best work in the PR.** The FLIP keyframing `transform` would have thrown every node to
  the stage origin on every undo, it was found by *reading* the module during a migration, it was
  measured on three engines before the fix was written, and the rejected alternative (`composite:
  "add"`) is named with its reason. Nothing gates it and the report says so.
- **The six product defects, and how they were found.** Each was confirmed on the running page with a
  standalone probe before anything changed, and P2 and P4 were only reachable because the *rewritten*
  assertion was stronger than the one it replaced. That is the case for the driver layer, made with
  evidence rather than asserted.
- **Group 35's `fold()`** — routing every constructive call so an unguarded throw cannot kill the run
  before a single named failure speaks, found by mutation rather than reasoned about.
- **Group 36's inverse case** — a moved frame must *still pass*, because a position is not derivable
  from ops. A gate that demanded otherwise would re-couple the two files the split exists to separate.
  That case is the one that makes the group correct rather than merely strict.
- **`device-presets.mjs`** — "the names are the contract, not the numbers", and `presetWidth`
  returning `null` rather than a default so the applier's refusal stays reachable.
- **`arrowPath`'s geometry** — clipping on the line of centres (the back-edge case is real, and
  `replay/build-northwind-restock.board.json` carries one), `ta + tb >= 1` as the overlap test, `null`
  rather than a zero-length segment. The overlay's `viewBox="0 0 2816 1232"` at `width/height: 100%`
  inside a 2816×1232 stage is an exact 1:1 mapping. It deserves a gate (F6), not a rewrite.
- **The report's honesty.** The `/studio.html` `vt-stack-audit` pass stated as *vacuous*; H8 proven to
  predate the PR by driving the base tree in a clean worktree on a second port; the `approach`
  baselines forced by `rm` because `maxDiffPixels: 100` would have swallowed the digits; H7 recorded
  as a process failure rather than quietly fixed. F7 above is the one place the PR body is looser than
  the report it summarises.
- **`.claude/plans/canvas-swap-302-reference/`** is labelled correctly — parked as `.txt` per the
  syntax-check rule, and its README says plainly that the shipped modules supersede it.

---

## Suggested order

**Before merge:** F1, F2, F4 are mechanical. F3 needs the pinch number first (question 5), so it is
the one that may want its own commit.

**Worth landing with them, because they are the same class:** the two gate rows under F1 and F2 — a
computed-`outlineStyle` read after a marquee, and an `alignMoves` fixture with `h: null`. Both
defects are invisible today for a reason that will recur.

F6's `arrowPath` cases and the F8/F8b prose sweep are cheap and belong in this PR — F8b especially, since it is the line a human reads to decide a green run means something. Everything else in
Medium and Low is the owner's call to take or defer.
