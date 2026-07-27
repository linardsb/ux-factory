# Implementation Report — /build slice 1c: pattern render + keep rail + share link

**Plan**: `.claude/plans/build-pattern-render-keep-rail.md`
**Branch**: `feature/build-pattern-render-137` (from `origin/main` @ `3a2a8d3`)
**Status**: COMPLETE

## Summary

/build's fourth and fifth beats ship. Committed rules in `system/pattern-rules.mjs` read the ten
answers and the edited breadboard and name one of five patterns; the two that have components in
this library assemble through the EXISTING vocabulary-validated `renderComposition`, in the same
`{name, props, children}` format and against the same generated vocabulary the build-time agent runs
use. The other three get a designed card that names the pattern, says which components it would
need, and puts the visitor's breadboard beside it — never a mock-up. A keep rail hands back an SVG
build card, `breadboard.svg`, `breadboard.json`, a `pattern-spec.md` mini-handoff and Act 0's
`tokens.<slug>.css`, all generated in the browser, plus a share link that rebuilds the entire build
(answers, board, edited flag and imported token values) in a colleague's browser with no server and
nothing stored.

## Tasks completed

| Task | File | |
|---|---|---|
| the seam: `pack` field, `restoreBuild()`, exported `SUMMARY_TERM` + `QUADRANT_MEANINGS` | `system/build-questions.mjs` | UPDATE |
| publish the pack, dress every `[data-build-stage]`, adopt a restore, seed at mount, vet INSIDE `applyToStage` | `system/build-import.mjs` | UPDATE |
| adopt a restored board, exported `LABEL_MAX`/`MAX_PLACES`/`MAX_AFFORDANCES`, `maxlength` on both rename inputs (#144 finding 13) | `system/breadboard.mjs` | UPDATE |
| the five committed DEFINITIONS-ONLY rules + slot derivations | `system/pattern-rules.mjs` | CREATE |
| `compose()` + the four render states (rendered · out-of-library · empty · refusal) | `system/pattern-render.mjs` | CREATE |
| pure SVG string builders: `cardSvg` + `boardSvg` | `system/build-card.mjs` | CREATE |
| the pure codec: `encodeBuild` / `decodeBuild` / `shareUrl` | `system/build-share.mjs` | CREATE |
| the rail, four downloads, the share control, the `?b=` boot restore | `system/build-keep.mjs` | CREATE |
| `stripHash()` keeps `location.search` | `system/dock.mjs` | UPDATE |
| Act 4 + Act 5 sections, the keep-rail move, page-unique CSS, hero + capability copy | `build.html` | UPDATE |
| the committed unit gate, 7 groups | `tooling/build-checks.mjs` | CREATE |
| regenerated: `runtime.files 51 → 56`, `linesApprox 15,300 → 16,900` | `system/loc-summary.json` | UPDATE |
| regenerated (see deviations) | `tooling/visual-regression/baselines/approach-{neutral,saulera}.png` | UPDATE |

## Tests added

`tooling/build-checks.mjs` — committed, zero-dep, one ✓ line per group, exit 1 on any failure:

1. **pattern ids** — four shapes → four patterns · the hub override fires on a hand-built hub · it
   provably CANNOT fire on any drafted board (all 8 shape × appetite drafts asserted) · two empty
   cases.
2. **slots** — every tile value is the counted affordance total as a string · `warn` on a
   zero-affordance place · the queue comes from the busiest place, value = target label or
   `"acts here"` · `SLOT_MAX` · out-of-library derives nothing.
3. **composition** — both in-library compositions pass `validateComposition` against the REAL
   `handoff/verdant/vocabulary.json` read from disk. This is the check that catches a vocabulary
   regeneration breaking the builder.
4. **codec** — round-trip through the deflate AND the uncompressed branch; the restored state
   recomputes to the pattern the sender saw (the payload carries no pattern id).
5. **tamper** — 14 hand-built hostile payloads, each rejecting the WHOLE payload, plus the
   `LABEL_MAX` boundary either side, a truncated payload, an over-length param, a non-string param,
   and a decompression bomb.
6. **SVG** — 6 templates scanned for well-formedness (balanced elements + entity check), hostile
   token values fall back to committed literals rather than reaching an attribute, a hostile place
   label appears escaped exactly once.
7. **vetting** — `system/build-import.mjs` read as text: exactly one `.setProperty(` call, and
   `applyToStage` still vets its own argument.

**Headless full journey** (scratch, not committed — `scratchpad/journey.mjs`): 37 assertions across
12 groups. Five settled-state handles · dashboard renders `ds-metric-tile`s · the REAL shaping
wizard driven to `worklist` renders `ds-list-row`s · `stream` lands on the honest card with no fake
components · a board edit re-renders the stage · the share link opened in a FRESH browser context
deep-equals the sent state · `?b=` and home's `?brand=` both survive opening and closing
`#appearance` · all four downloads produce non-empty files and `pattern-spec.md` carries the method
terms, both gates, the rule verbatim, the components used and the two-claims paragraph · a tampered
link applies zero styles, says so once and scrubs the param · a hostile label cannot escape the
downloaded SVG · restore order independence with `build-keep.mjs`'s tag moved to the top · zero
console errors.

## Validation results

| Level | Command | Result |
|---|---|---|
| L1 | `node --check` × 10 modules | ✓ all |
| L1 | `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan |
| L2 | `node tooling/build-checks.mjs` | ✓ all 7 groups, exit 0 |
| L3 | `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| L3 | `node tooling/drift-check.mjs` | ✓ 8 checks |
| L4 | headless journey (Chromium over `python3 -m http.server`) | ✓ 37/37 |
| L4 | eyeball pass at 1440 and 420, neutral + a derived pack | ✓ |
| L5 | `npm run update:docker` in a clean worktree | ✓ 18 passed; only the two `approach-*` baselines changed |

## Deviations from the plan

Nine, all deliberate.

1. **`data-build-stage` was added to `#build-stage` in Phase 1, not Phase 2.** The plan buried it in
   the pattern-render task, but Phase 1 rewrote `applyToStage` to iterate
   `[data-build-stage]` — so between the two phases Act 0's stage would have been dressed by
   nothing. Moved forward; the regression never existed on the branch.

2. **The codec rejects on zero-rejected AND zero-skipped tokens.** The plan's wire table said "zero
   `rejected`". `vetTokens` sorts an off-family KEY (`--evil`, and a JSON-parsed `__proto__`) into
   `skipped`, not `rejected` — so zero-rejected alone would have accepted both, and the plan's own
   tamper battery asserts they must reject. Requiring zero of both is what makes "the decoded map is
   exactly the map that was sent" true. Written into the wire-shape comment so it cannot drift back.

3. **`decodeBuild` returns `{ state, reason }`, not `state | null`.** The plan asked for both a null
   return and a reason string, which one return value cannot carry. `state` is null on any failure
   and `reason` names what failed; the rail prints it once.

4. **The SVG colour roles map to tokens that exist.** The plan named `--color-surface` and
   `--color-surface-subtle`; this contract has `--color-bg` and `--color-bg-surface`. Roles bound to
   the real names, fallbacks read from `tokens.neutral.css`'s resolved values.

5. **`boardSvg` computes its own natural height instead of the plan's fixed `height / (places - 1)`
   with a 72px floor.** That formula overflows a nested slot at five or six places (5 × 72 = 360 into
   232), and a nested `<svg>` clips. It now emits its natural height in its own viewBox and the
   caller scales it with `preserveAspectRatio`, which is the same "computed from the model, never
   measured from the DOM" discipline without the clipping.

6. **Card bodies are centred in the content area, and one row is centred across it too.** The plan
   pinned rows at `y = 64 / 200`; three tiles or three rows then sat against the header with ~140px
   of void beneath, and three of the six slot counts land there. Geometry, gutters and character
   budgets are otherwise exactly as pinned. Chip labels are 12px rather than the plan's 11px —
   `CRAFT.md` puts the floor at 12.

7. **The invariant is grepped as `.setProperty(`, not `setProperty`.** The bare word appears in the
   module header that explains the invariant, so a bare-word grep returns 3. The call form returns
   exactly 1 and is the real invariant (one call site). The completion-checklist command is therefore
   `grep -n "setProperty(" system/build-import.mjs`.

8. **`build-keep.mjs` creates its own `[data-keep-*]` nodes rather than reading them from
   `build.html`.** One owner per node still holds — build-import's two keep nodes moved verbatim and
   are untouched — and creating them in JS is what gives the section a correct no-JS state (the
   committed fallback copy stays until the module replaces it). `boardSvg`'s `<title>` summarises the
   board instead of repeating the entry place's label, so a visitor label appears exactly once in the
   file, which is what makes check 6's "escaped exactly once" unambiguous.

9. **No em dashes in the new visible copy.** `portfolio-design`'s copy rules ban them, and a parallel
   session is mid-sweep removing them from five other pages. Applied to new strings only;
   pre-existing shipped copy in `build-import.mjs` was left alone (surgical-changes rule, and it is
   the other sweep's scope).

## Issues encountered

- **The VR run had to happen in a clean worktree.** The shared working directory carries another
  session's uncommitted copy edits to `derive/index/instance/roundtrip/trace.html`. Running
  `update:docker` in place baked those into four baselines (`index-*`, `roundtrip-*`) that match no
  committed markup. Reverted, then re-run in a detached worktree at `9633d2b`. Only the two
  `approach-*` baselines moved. Worth adding to the shared-worktree memory: **the visual gate reads
  the working tree, so it must be run from a clean checkout, not from the shared directory.**

- **The approach baselines moved by LESS than `maxDiffPixels: 100`**, so a clean run passed without
  regenerating them — the plan's "certain churn" was right about the numbers (`51 → 56`,
  `15,300 → 16,900`, both rendered on approach.html) and wrong about the consequence. Regenerated
  deliberately anyway: a committed baseline that renders numbers the repo no longer holds, inside a
  tolerance that happens to cover it, goes red on the next small change to that section for reasons
  nobody will connect to this ticket.

- **The plan's order-independence assertion proves less than it claims.** `decodeBuild` is `async`,
  so the restore always publishes after every module body has evaluated; moving `build-keep.mjs`'s
  script tag cannot fail. The seed-at-mount design is still right (it is what makes the claim true
  rather than incidental), and the assertion is in the journey — but it is a regression guard, not
  evidence.

- **The vocabulary fetch is lazy behind an `IntersectionObserver`** (`rootMargin: 800px`), per the
  plan's "the page must not pay for it before the reader reaches Act 4". Consequence for #138:
  `[data-pattern-stage="ready"]` is set only after the section is near the viewport, so its VR
  baseline needs `waitVisible`, not `waitReady` (memory: vr-visible-beats-need-post-resize-wait).

## Found after this report was first written (fixed in `f5550c2`)

**A shared design printed "No design imported yet" beside a stage visibly wearing it.**
`build-import.adoptPack()` applied the restored tokens but never touched
`[data-build-keep-empty]`, which starts visible in the markup. Caught by review, not by the journey —
because the journey only ever shared a build with **no** imported pack, so the whole
restore-with-a-design path was unexercised on the page. The unit gate covered the codec with a pack;
the page never saw one.

That is the finding-12 class the plan legislated against in the other direction: a sentence true
about one thing, read as a claim about everything. `clearKeep()` now takes its message and captures
the markup's own sentence as its default; `adoptPack` states the true thing (the values travelled,
the stylesheet could not — `emitPackCss` needs the engine's full mapped values and the export they
came from, and neither is in a URL). The journey now derives a palette before sharing and asserts
both stages, the token round-trip and the row's copy: **43 assertions, up from 37.**

The testing lesson, worth more than the bug: **the happy path was tested with the one input that
skipped the feature under test.**

Also documented while fixing it: the codec deliberately carries no `pack.label` and no `pack.note`.
Those describe the SENDER's browser, and replaying them would have the receiving page state, at rest,
that it read a file it never saw. Token values and slug travel; provenance does not. Stated in
`build-share.mjs`'s header so a reviewer reads it as a decision rather than an omission.

## Explicitly not done (per the plan's scope)

- Slice 1d (#138): linking /build from home's close beat and work.html, the /build VR baselines, the
  cross-engine Firefox/WebKit pass, the CLAUDE.md architecture-map entry.
- Slice 2 (#139): the feed, onboarding and settings templates. Slice 3 (#140): the operator path.
- Issue #144 findings 7, 8, 9, 10, 12. Finding **13** (rename `maxlength`) closed here.
- No new component spec was needed — `metric-tile` and `list-row` carry both patterns, so no
  `gen-handoff` / `gen-vocabulary` / `gen-pack-bundle` regeneration (assumption A1 holds).
