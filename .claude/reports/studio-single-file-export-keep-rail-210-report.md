# Implementation Report — Studio 8: the single-file export, the keep rail, and the two win-metric routes

**Plan**: `.claude/plans/studio-single-file-export-keep-rail-210.md`
**Branch**: `feature/studio-single-file-export-keep-rail-210` (branched from `origin/main` @ `f55cfb2`)
**Status**: COMPLETE

## Summary

/factory now lets the visitor leave with what they watched get built. A new `system/studio-export.mjs`
assembles a runnable single-file HTML document in the browser from four live sources — the token
contract, the live pack and `components.css` inlined, `renderComposition`'s own output serialized, and
the arrangement as CSS grid line placement — and a new `system/studio-keep.mjs` mounts a three-tier
rail that imports rather than forks every /build artifact generator. `?b=` now restores on /factory,
which makes `studio.mjs`'s recorded-but-never-run **declined driver mount** reachable for the first
time. Two virtual routes join `system/analytics.mjs`, each fired from its own success path.

Spike 3's verdict was **faithful**, and running it caught a real defect in the plan's own `@import`
strip before a line of the exporter was written.

## Tasks completed

| Plan task | Landed in |
|---|---|
| 1 · Spike 3 | `.claude/reports/studio-export-keep-rail-210-spike3.md` (CREATE) |
| 2 · the two virtual routes | `system/analytics.mjs` (UPDATE) |
| 3 · group 10's uniqueness case | `tooling/build-checks.mjs` (UPDATE) |
| 4 · the exporter's pure layer | `system/studio-export.mjs` (CREATE) |
| 5 · the compile beat's `composed()` seam | `system/studio-compile.mjs` (UPDATE) |
| 6 · the studio's rail | `system/studio-keep.mjs` (CREATE), `system/build-keep.mjs` (UPDATE) |
| 7 · markup + styles | `factory.html`, `system/studio.css` (UPDATE) |
| 8 · mount off `publishBoard` | `system/studio.mjs` (UPDATE) |
| 9 · `?b=` restore | `system/studio.mjs` (UPDATE) |
| 10 · the declined mount | `system/replay-driver.mjs`, `system/studio.mjs` (UPDATE) |
| 11 · group 6 grows | `tooling/build-checks.mjs` (UPDATE) |
| 12 · group 10 grows | `tooling/build-checks.mjs` (UPDATE) |
| 13 · group 17 | `tooling/build-checks.mjs` (UPDATE) — `all 17 groups pass` |
| 14 · the journey's #210 half | `tooling/studio-journey.mjs` (UPDATE) — 31 new assertions |
| 15 · param cascade | `system/param-manifest.json`, `system/param-count.json` (96 → 102) |
| 16 · loc cascade | `system/loc-summary.json` (107 → 109 files) + approach's two baselines |
| 17 · factory's two baselines | `tooling/visual-regression/baselines/` |
| 18 · the PR | `Closes #210` |

## Tests added

**`tooling/build-checks.mjs` — group 17 is new (16 → 17 groups)** and drives `studio-export.mjs`
under Node over the **real committed stylesheets**: the contract, `components.css`, and each of the
four packs read out of `dock.mjs`'s own `PACK_RE` allowlist rather than hand-typed.

- the zero-request claim asserted on the OUTPUT (no `@import`, `url(`, `<script`, `fetch`, `history`,
  `import`), comment-decommented first, because prose mentioning an at-rule makes no request;
- **the strip's other direction, structurally**: comment markers preserved, brace counts preserved,
  `:root` count preserved, and saulera's `--color-amber` still declared;
- the arrangement as grid line placement, out of source order, with an off-grid slot **dropped**
  rather than clamped;
- the placement table generated from the imported `MAX_COLS`×`MAX_ROWS`, exhaustively and in both
  directions;
- both honesty branches by **identity** against `build-keep.mjs`'s exported constants — including the
  negative half;
- truncation stated and agreeing in number; totality over 10 junk inputs; byte-identical across two
  runs; and the group **states the boundary** it cannot reach.

**Group 6 (`artifacts`)** grew to drive `exportHtml` over the same hostile fixtures the SVG templates
face — the hostile label escaped exactly once in all three of its uses, the renderer's serialized
output **not** re-escaped, no `vetTokens`-rejected value emitted, `<style>` and five element pairs
balanced, an astral title carried whole, and a wholly-rejected token map leaving an empty `:root`.

**Group 10 (`analytics`)** grew three cases: the two new routes on a /factory URL carrying a real
`?b=`, the rail's two adjacent buttons overlapping in both orderings, and **every one of the 11
trackers DRIVEN with its pushed path proven pairwise distinct**.

**`tooling/studio-journey.mjs`** — a new `keepPass`, 31 assertions, cross-engine.

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ **all 17 groups pass** |
| `node tooling/drift-check.mjs` | ✓ clean (12 passes) |
| `node tooling/token-lint.mjs` | ✓ |
| `node tooling/vt-verify.mjs` | ✓ — /factory's boot, replay and compile still open **zero** transitions on all three engines |
| `node tooling/studio-journey.mjs chromium` | ✓ **242 passed, 0 failed** (211 before this ticket) |
| `node tooling/studio-journey.mjs all` | ✓ **242 passed, 0 failed on chromium, firefox AND webkit** |
| `node tooling/build-journey.mjs all` | ✓ chromium 157/157, firefox 157/157; webkit intermittent — see *Issues* |
| Cold `file://` open of a REAL shipped export | ✓ chromium, firefox, webkit — 4 cells, correct pack, **zero requests beyond the document**, zero errors |
| An IMPORTED pack, driven end to end | ✓ a DTCG token export dropped on Act 0 → the export's inline block carries the visitor's own contrast-negotiated accent (`#6425d0`, from their violet ramp) and its provenance reads *Wearing: your imported design, "tokens-fixture.json"* followed by the two-claims paragraph |
| `npm run update:docker` | ✓ 20 passed; **4 baselines regenerated** (approach ×2 for the loc/param numbers, factory ×2 for the rail), from a clean detached worktree under `/Users` |

### Every new check proven able to fail

Each mutation was applied to the shipped source, the gate run, and the source reverted.

| Mutation | Result |
|---|---|
| `FACTORY_EXPORTED_PATH` → `/factory/shared` | group 10 red, naming **both** trackers |
| `exportHtml`'s `<title>` unescaped | group 6 red ×2 |
| `esc`'s `&` replacement deleted | group 6 red (this is **why** the ampersand has its own case — `HOSTILE_LABEL` carries no `&`, so this mutation left every other assertion green) |
| `vetTokens` bypassed in `exportHtml` | group 6 red ×3, naming each leaked value |
| the `@import` strip removed entirely | group 17 red **on committed bytes, no fixture mutation** — `tokens.saulera.css:19` |
| the strip replaced with the plan's `/@import[^;]*;/g` | group 17 red ×3 per pack (comment marker removed, brace count changed, `:root` lost) |
| `TWO_CLAIMS` always emitted | group 17 red on the negative branch |

## Deviations from the plan

1. **The `@import` strip is a comment-aware scanner, not the plan's regex.** Spike 3 measured that
   `/@import[^;]*;/g` matches the word inside `tokens.saulera.css`'s own header comment and consumes
   to the real at-rule's semicolon three lines later, taking the closing `*/` with it — the comment
   then swallows `:root {` and the whole saulera pack drops out. 449 sheet rules → 447,
   `--color-amber` empty, the accent falling back to the contract's. Silently, under a pack the dock
   offers to every reader.

2. **The rail is mounted by `studio.mjs`, not by its own `<script type="module">` tag** (plan Task 7).
   `mountStudioKeep`'s five handles — the board, the arrangement, the beat, the canvas — are all the
   orchestrator's, so a self-booting tag would have to reach them through `getStudio()` and would race
   the `?b=` branch Task 9 introduces. Same call the file already makes for the canvas, the verbs, the
   beat and the driver. `studio.mjs`'s `finally` marks the handle `"unavailable"` on the two early
   returns the rail never reaches, so a gate fails loudly rather than hanging.

3. **`mountStudio` was split into a sync core plus a thin branching wrapper.** The plan required three
   things that only reconcile one way: the handle set in a `finally` on every path, not set before the
   restore settles, and the no-`?b=` path synchronous. Reading `SHARE_PARAM` before anything can await
   and calling the unchanged core from either branch satisfies all three. Measured: `data-studio`
   resolves at **28 ms** on a plain load.

4. **`studio.mjs` now writes the build store, in exactly one place.** The header rule ("reads and never
   writes") is amended rather than broken: it exists so /build's state cannot depend on having visited
   /factory, and a shared link is the opposite case. It also buys the pack for nothing —
   `build-import.mjs` already adopts a `restore`-sourced `BUILD_CHANGE` onto the stage.

5. **The declined path never disables the compile beat, rather than re-enabling it.** #240's first
   constraint. A declined mount reaches none of the three paths that re-enable, so `if (!declined)
   compile.setEnabled(false)` is one state fewer than disable-then-restore.

6. **A `[data-studio-notice]` node was added to `factory.html`.** The plan said a refused link should
   "say why". `canvas.say`'s live region is transient by design and the replay narrates over it within
   a second, so the reason had nowhere to live. Empty and `hidden` unless a `?b=` arrived, so it
   contributes nothing to the pixel baseline — asserted both ways in the journey.

7. **The export truncates at the shorter of composition and canvas, and says so.** Not in the plan.
   `slotsFor` produces more slots than places for `feed` and `settings` (group 16's own measurement),
   and Task 9 made the sender's answers live — so `composition.length > wrappers.length` is reachable.
   Fabricating coordinates for the surplus would have made the provenance block's "arranged here at
   the coordinates you left them at" false. `applySwap`'s `Math.min` line, mirrored.

8. **`build-keep.mjs` gained a second exported constant** (`NO_DESIGN_IMPORTED`) beside `TWO_CLAIMS`.
   The plan named one. The export needs the neutral-pack branch too, because `TWO_CLAIMS` says "the
   TOKEN VALUES above are yours" and /factory at rest has no imported design — printing it there would
   be the one dishonest line in the artifact. `specMarkdown`'s output was proven **byte-identical** on
   both branches against the pre-change file before anything else landed.

9. **The drafted `meta.builtOn` field was dropped** rather than wired. No caller filled it, and a
   determinism claim with an unfilled escape hatch is not one.

10. **`studio-compile.mjs` gained `VOCAB_UNAVAILABLE` as an exported const.** The plan said the rail
    should print "the same sentence `renderUnavailable` already prints"; that sentence was a literal
    inside a mount-local function. Lifting it is what makes "the same" true rather than asserted.

11. **The rail's link is not debounced** (the /build rail's `URL_DEBOUNCE_MS` is not copied). Nothing on
    /factory fires per keystroke — the board changes at settle, at take-over and on a restore.

## Issues encountered

- **Spike 3 was driven headlessly rather than by hand.** A fresh `browser.newContext()` *is* a fresh
  profile, and a `page.on("request")` listener attached before `goto` on the `file://` URL is strictly
  stronger evidence than reading a Network panel after the fact. All six checks answered on all three
  engines and all four packs.
- **Group 17's saulera discriminator had to become structural.** The first version tested for
  `--color-amber` as a substring — and restoring the plan's regex left it green, because the string
  survives; what dies is the `:root {` that made it a declaration. Caught by the mutation sweep, not by
  review.
- **Group 6's ampersand case exists for the same reason.** Deleting `esc`'s `&` replacement left every
  other assertion in the group green.
- **The journey's summary line broke the build once** — a backtick pair inside a template literal.
  Caught by running it.

- **`build-journey` webkit fails two assertions intermittently, and it is PRE-EXISTING.** Check [5b]'s
  no-go case (`newName.fill(putBack)` not committing on webkit, leaving the place named "New place").
  Told apart from a regression the way memory `build-journey-failure-vs-flake` says to, by running the
  control: **`origin/main` in a separate worktree fails the identical two assertions on its second
  run** (pass, then fail), and this branch failed 2 of 4 runs and passed the other 2. Nothing here
  touches `breadboard.mjs`, `build-questions.mjs` or `pattern-rules.mjs`, and /build's one changed
  file (`build-keep.mjs`) has its output proven byte-identical on both branches. Not fixed here — it
  is a real flake in an operator-run driver and deserves its own ticket rather than being folded into
  a ticket about /factory.
- **The two factory baselines were eyeballed**, not trusted to a green update run (memory
  `vr-tolerance-hides-text-changes`): the rail renders its three tiers, the faithful copy branch, and
  the honesty sentence about the recommended answers. Page height 5076 → 6120 px, which is the rail.

- **The imported-pack branch was driven, not only reasoned about.** `packLabelOf` has three pack
  branches and everything else this ticket ran — the spike, the rail check, the journey, group 17 —
  used either no pack or a *derived* one, so `pack.fileName` had never executed. Confirmed twice: by
  reading (`build-import.mjs:440` passes `file.name`, guarded non-empty at `:417`, so a real drop
  always fills it, while the derive path sets it null at `:473`), and by driving a DTCG export onto
  Act 0 and grepping the downloaded file. It reads *Wearing: your imported design,
  "tokens-fixture.json"* and carries the visitor's own negotiated accent inline.
- **One copy fix came out of that pass.** `decodeBuild` defaults a link's pack slug to `"shared"` when
  the payload carries no `s`, so a restored build printed *the design values that travelled in this
  link, "shared"* — quoting a codec default back at the reader as if it were a name they chose. It now
  drops the quoted name in that case. The artifact whose stated purpose is naming whose design work
  this is may not invent an attribution.
