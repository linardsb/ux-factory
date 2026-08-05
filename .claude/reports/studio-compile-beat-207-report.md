# Implementation Report — the compile beat (#207)

**Plan**: `.claude/plans/studio-compile-beat-207.md`   ·   **Branch**: `feature/studio-compile-beat-207`   ·   **Status**: COMPLETE

## Summary

`/factory`'s canvas now performs the epic's hero mechanic. A reader-triggered beat runs the
already-committed pipeline — `patternFor` → `slotsFor` → `compose` → `renderComposition` — as four
announced steps and swaps each fat-marker block for the real token-skinned component its slot calls
for, **in the same wrapper**, so the arrangement, the `data-stx-id`s and the undo history survive it.
"Back to blocks" reverts, which is also what makes "run it twice, get the same DOM" checkable by a
person. On today's board that is 3 places → 3 slots → 3 `metric-tile`s, one per wrapper, measured
rather than assumed.

The new module contributes **no rule**: every rule, the vocabulary, the inspect ids and the honesty
sentences are imported. It is a **crossfade** through `element.animate()` — nothing is named for a
view transition (#171's lesson; the named-group upgrade stays gated behind #190).

## Tasks completed

- 1, 3, 4 · the module → `system/studio-compile.mjs` (CREATE, 415 lines) — pure `compileSteps` +
  `STEPS`, the mount (`mountCompile`), the lazy vocabulary fetch, the three non-rendered cards, the
  positional in-place swap, the crossfade, `revert()`, `destroy()`, the `getCompile()` driver seam.
- 2 · `system/pattern-render.mjs` (UPDATE) — `export` on `INSPECT_IDS`, `OUT_OF_LIBRARY`, `REFUSED`.
- 5 · `system/studio.mjs` (UPDATE) — mounts the beat after the verbs, adds it to the `live` handle,
  and `placeBlock`'s comment now writes the sentence #206 reserved for this ticket.
- 6 · `tooling/build-checks.mjs` (UPDATE) — **group 15**, the compile pipeline as data.
- 7 · `tooling/build-checks.mjs` (UPDATE) — group 7's `MODULES` + summary, no exception argued.
- 8 · `system/studio.css` + `factory.html` (UPDATE) — the compile block, the reduced-motion off-ramp,
  the beat lead and the `<noscript>` sentence.
- 9 · `tooling/studio-journey.mjs` (UPDATE) — `compilePass()`, 16 assertions, + the summary line.
- 10 · `tooling/vt-verify.mjs` (UPDATE) — the `/factory.html` block, both motion preferences.
- 11 · `system/param-manifest.json` + regenerated `system/param-count.json` (/factory 15→16, total 93→94).
- 12 · regenerated `system/loc-summary.json` (runtime 68→69 files, 22,400→23,000 lines) after staging.
- 13 · regenerated the visual-regression baselines from a clean detached worktree.
- 14 · this report, the plan, the PR (`Closes #207`) and the review.

## Tests added

No suite exists in this repo (house rule). The gates:

- **`tooling/build-checks.mjs` group 15** (committed, runs in CI's `verify`): the real drafted board
  asserted against the board rather than against literals; all five patterns' fixtures validated
  against the real generated `handoff/verdant/vocabulary.json` with `composition.length ===
  slots.length` for each (so the swap's positional alignment is gated for all five, not just the one
  the page reaches); determinism by deep-comparing two whole runs with the file's hand-written
  canonical stringify; totality over the nine junk boards group 14 uses plus four junk answer sets;
  the deliberately vacuous `inLibrary: false ⇒ out-of-library` clause guarding AC #6. Its summary
  line states the boundary it cannot reach, as groups 9, 11, 13 and 14 do.
- **`tooling/studio-journey.mjs` `compilePass`** (operator-run, 3 engines): at rest fat-marker blocks
  and **no `vocabulary.json` request made**; the beat swapping every slot to a library primitive with
  every id/col/row unchanged; announcements counted exactly (4 steps + the settled sentence = 5); one
  vocabulary fetch; no `style` attribute after the beat; zero `::view-transition-*` pseudos; the
  reverted stage byte-identical to the at-rest one; a second compile byte-identical to the first;
  **and byte-identical on a fresh page load**; reduced motion reaching the identical end state with
  no crossfade running.
- **`tooling/vt-verify.mjs` `/factory` block** (operator-run, 3 engines): load opens zero
  transitions, the beat is proven to have replaced the blocks **before** anything is asserted about
  transitions, `calls === 0` through the wrapped `startViewTransition`, zero pseudos — repeated in
  full under reduced motion rather than inherited.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 15 groups pass** |
| `node tooling/studio-journey.mjs all` | ✓ chromium 121 / firefox 121 / webkit 121, 0 failed |
| `node tooling/vt-verify.mjs {chromium,firefox,webkit}` | ✓ green on all three |
| `node tooling/drift-check.mjs` | ✓ all 12 passes |
| `node agent-layer/gen-param-count.mjs --check` | ✓ 94 controls, no drift |
| `node agent-layer/gen-loc-summary.mjs --check` (staged) | ✓ no drift |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens, 0 undeclared, 0 orphan |
| the pixel gate, in Docker, against the committed baselines | ✓ 20 passed, clean tree |
| Node-import hygiene | `system/studio.mjs` and `system/studio-compile.mjs` both import clean under Node |
| grep hygiene | no `view-transition-name`, no `morph(`, no markup-from-string sink, no inline-style write in the new module or the new CSS block |

**Mutation duty** — four, each watched go red and restored:

| Mutation | Went red in | Note |
|---|---|---|
| `compose`'s dashboard branch emits `"metric-tiles"` | build-checks **group 15** (7 failures) + group 3 | the vocabulary check is live, not a shape check |
| one `node.style.opacity = "1"` in the crossfade | build-checks **group 7** (`writes === 1` → 2, plus the per-file `ok`) | the zero-inline-styles claim is real |
| the swap wrapped in `document.startViewTransition(…)` | **vt-verify** (`calls=1`, both motion passes) | and the pseudo assertion stayed GREEN — which is exactly why both nets ship |
| `[...frag.children].slice(1)` (a renderer that builds fewer roots) | the **alignment tripwire** → the refusal card, and studio-journey's compile pass | verified by probe: `data-compile-state="refused"`, the refusal message verbatim, **all three fat-marker blocks retained**, nothing on the console |

**Manual pass** (chromium, served tree): keyboard-only compile (focus → Enter) reaches the same
settled state; the live region says four step sentences then the settled one; the grab handles read
"Move Overview / Move Progress / Move Settings" after the swap; under the `saulera` pack the compiled
`metric-tile` re-skins (`rgb(244,244,245)` → `rgb(244,241,234)`) with no literal anywhere; with
Inspect on, a compiled component carries
`data-inspect="ds-metric-tile-cross-scenario-library-primitive"` and its bubble names the spec. The
one 404 seen in the pack-switched probe is `/fonts/fonts.css`, requested by the saulera pack and
pre-existing on the local static server — not this ticket's.

## Deviations from the plan

1. **`OUT_OF_LIBRARY` was split rather than reused whole.** The committed sentence ended "…Your
   breadboard is the artifact, **and it downloads below**", which is false on a canvas with no
   downloads (that is #210). Rather than paraphrasing it into a near-copy — the thing assumption A5
   warns against — the shared claim stays one constant in `pattern-render.mjs` and each surface adds
   its own last sentence ("It downloads below." / "It is on this canvas as you drafted it."). No
   baseline moves: the branch is unreachable on both surfaces today, which is what makes the edit free.
2. **The compiled wrapper is named for the composed LABEL, not the primitive.** The plan said "the
   component's name". Using `"metric-tile"` would give three sibling move handles all reading "Move
   metric-tile", which is an a11y regression from the fat-marker's per-place labels. The label prop
   *is* the place's own label, counted from the board, so it identifies the slot and invents nothing.
   Recorded in the module beside the code.
3. **The beat shares the page's one action bus** rather than making its own — passed down from
   `mountStudio`. The three primitives are non-interactive today, but a component that does emit
   `ui.intent` should reach the consumers everything else on this canvas reaches. The module still
   never emits `ui.move` and never calls `applySlot` (invariant 3).
4. **Announcement count is 5, not 4.** Four step sentences plus the settled one — the settled
   sentence is what tells a screen-reader user the beat finished and what "Back to blocks" now does.
   Asserted exactly, per path, so a future implementer who trims it sees a specific number.
5. **`compileSteps` carries `needs` and `definition`** beyond the fields the plan listed, because the
   out-of-library card renders the "What it would take" sentence from `PATTERNS` and pulling it from
   a second place would be a second answer.
6. **The step readout is on its own line, not a third item in the control row.** The plan put it
   beside the buttons. Measured on the running page, that does not work: `.stx-viewport` is ~2818px
   wide inside a 776px track (see Issues), so the row cannot wrap and a grown readout runs under the
   docked inspector at exactly the width the pixel gate captures. It now starts at the column's own
   left edge, is capped in `ch` (container-independent), and reserves two lines so the stage never
   jumps mid-beat. Verified at 1280 / 900 / 420.
7. **Visible copy carries no em dashes.** The house CHECKLIST bans them; the new beat lead had the
   only one on the page, and the readout's `label — detail` became `label: detail`, matching the
   sentence the live region already speaks.

## Issues encountered

- `git` reported the branch base as #206's feature branch; #206 had been squash-merged to
  `origin/main` as `3a03266`, so #207 was branched from `origin/main` instead.
- The mutation that makes the alignment tripwire fire surfaces in studio-journey as a **timeout**
  (the state settles on `refused`, not `rendered`) rather than as a named ✗. That is a true red, but
  the diagnosis is thin, so the refusal path was additionally verified by direct probe — the result
  is in the mutation table above.
- **Found and deliberately left alone — worth a follow-up ticket.** `.stx-viewport` on `/factory` is
  about 2818px wide inside a 776px grid track at 1280 (the scroller's intrinsic width expands the
  grid item, whose `min-width` is `auto`). Consequences today: the canvas's scroller never actually
  scrolls on this route, and no row inside it can wrap — the existing `#206` zoom row and verb help
  already overflow the column at narrow widths, invisibly, because the inspector paints over them.
  That is #206's surface, and narrowing the column is an at-rest change to the canvas with its own
  baselines and its own gates to argue, so this ticket works with it rather than around it and says
  so in `studio.css`. The likely one-line fix is `.stu-canvas-col { min-width: 0 }`.
- The visual-regression baselines were taken **three times**: once for the initial layout, once after
  the readout was moved, once after the copy pass. `approach`'s two PNGs had to be `rm`'d and
  re-taken — the only change on that page is `loc-summary`'s digits, which is sub-perceptual and
  which `update:docker` therefore skips (recorded trap).
- Group 15's fixture classification was reworded mid-implementation: `queue` is affordance-derived by
  rule but *coincides* with its fixture's place count, so the summary now reports what the fixtures
  **measured** (`slots === places` / `slots !== places`) rather than making a claim about the
  derivations that the data does not support.
