# Implementation Report — /build slice 2: the full pattern library

**Plan**: `.claude/plans/build-full-pattern-library.md`
**Branch**: `feature/build-full-pattern-library`
**Ticket**: #139 (epic #134) — PR body must carry `Closes #139`
**Status**: COMPLETE

## Summary

All five /build patterns now render. Onboarding · feed · settings were landing on the honest "not in
the library yet" card; they are now real assemblies built the same way dashboard and queue are —
slots **counted** from the visitor's breadboard, composed into `{name, props, children}`, and passed
through the site's own vocabulary-validated `agentic-renderer`. One new library primitive earns its
place (`sequence-step`, because a position in a sequence is a countable fact nothing else can
express); feed and settings reuse `list-row`, whose contract their derived slot already matched.

Along the way the ticket fixes **a bug that was live on `main`**: an in-library pattern with an empty
slot array downloaded an SVG (and a `pattern-spec.md`) asserting the pattern was "not in the
library" — reachable in two clicks. Both media now split "nothing to arrange" from "not in the
library" into distinct bodies, and both splits have a named regression that was proved able to fail.

## Tasks completed

| # | Task | File | |
|---|---|---|---|
| 1 | the third `ds-` primitive's ComponentSpec | `system/specs/sequence-step.md` | CREATE |
| 2 | token-only `.ds-sequence-step` block | `system/components.css` | UPDATE |
| 3 | `sequence-step` template + `hasTemplate` seam | `system/agentic-renderer.mjs` | UPDATE |
| 4 | pack regen (vocabulary · pack · bundle) | `handoff/verdant/*` | GENERATED |
| 5 | the `inLibrary` flip + the guardrail rationale | `system/pattern-rules.mjs` | UPDATE |
| 6 | three `slotsFor` branches + `affordanceCount` + the `SLOT_MAX` amendment | `system/pattern-rules.mjs` | UPDATE |
| 7 | three `compose` branches + `streamNote` | `system/pattern-render.mjs` | UPDATE |
| 8 | the four-way card split + `stepsBody` + `queueBody`→`rowsBody` | `system/build-card.mjs` | UPDATE |
| 9 | the null-`needs` split + `specMarkdown` export | `system/build-keep.mjs` | UPDATE |
| 10 | copy repairs + per-pattern arrangement CSS | `build.html` | UPDATE |
| 11 | roster assertions → invariants, + the page-copy guard | `tooling/build-checks.mjs` | UPDATE |
| 12 | four new/rewritten cross-engine checks | `tooling/build-journey.mjs` | UPDATE |
| 13 | motion pass (the two controls that still snapped) | `build.html` | UPDATE |
| 14 | generated cascade + architecture-map touch-up | `system/system-graph.json`, `system/loc-summary.json`, `CLAUDE.md` | UPDATE |

## Tests added

No suite exists (CLAUDE.md) — the gates are the tests, and both are committed.

**`tooling/build-checks.mjs`** — groups 1, 2, 3 and 6 rewritten from roster-shaped to invariant-shaped:

- **1** `inLibrary ⇒ needs === null` derived from `PATTERNS` itself, plus a deliberately vacuous
  `inLibrary: false ⇒ needs` clause kept as pattern six's contract; **plus a `build.html` string
  guard** on the three phrases the flip falsified (AC6 becomes a criterion, not a hope).
- **2** structural invariant over all five (non-empty array, every value a string) + per-pattern
  proofs: onboarding's `1..n` against a drawn `total` and its absent-`detail` case; feed's
  whole-board read (each `meta` names its OWN place, and >1 distinct place appears); settings'
  entry-place read with no `meta`; the cap on a `MAX_PLACES × MAX_AFFORDANCES` board; and the
  feed's truncation sentence.
- **3** driven off `PATTERNS` with component names **derived from what `compose` emits**, plus the
  renderer/vocabulary drift guard via the new `hasTemplate`.
- **6** (renamed `svg` → `artifacts`) one card per pattern, the `not in the library` regression
  across every pattern × {full board, no-affordance board} in **both** the SVG and the downloaded
  markdown, and the astral sweep extended to the step body's budgets.

**`tooling/build-journey.mjs`** — check [4] rewritten (feed renders, and states shown-of-counted read
from the running page); [4b] the sequence-step ordinals asserted against the DOM's own count; [4c] a
share round-trip over a `steps` build; [4d] a hub built **through the real editor** (the only route
to the fifth pattern); and the `pattern-spec.md` download asserted to interpolate no `null`.

### Mutation sweep — 13/13 caught

The plan says never to cut this, and the `check-that-cannot-fail` memory is why. Each mutation was
applied to the shipped source, the gate run, the source restored:

| mutation | caught by |
|---|---|
| `feed.inLibrary` flipped back to `false` | group 1 + group 6 |
| `build.html` copy reverted to "Two of the five" | group 1 page-copy guard |
| onboarding `total` off by one | group 2 |
| onboarding `detail` becomes `""` instead of absent | group 2 |
| onboarding `position` becomes a number | group 2 string invariant |
| feed reads one place instead of the whole board | group 2 (`meta` + distinct-place) |
| feed's `SLOT_MAX` cap removed | group 2 |
| settings branch deleted | group 2 |
| settings grows a redundant `meta` | group 2 |
| `sequence-step` template removed | group 3 `hasTemplate` |
| **the card's empty-slot body reverted (the live bug)** | group 6 |
| **build-keep's null-`needs` split reverted (the live bug)** | group 6 |
| the feed's note stops naming the total | group 2 |

## Validation results

| gate | result |
|---|---|
| `node --check` on every changed `.mjs` | pass |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/build-checks.mjs` | ✓ all 7 groups |
| mutation sweep | 13/13 caught |
| `node agent-layer/gen-handoff.mjs` · `gen-vocabulary` · `gen-pack-bundle` | ✓ 10 specs · 10 components · 16 files |
| `node agent-layer/gen-system-graph.mjs` | ✓ 64 tokens · **29** consumers (28 → 29, exactly one added) · 323 edges |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| `node tooling/drift-check.mjs` | ✓ (green on the clean tree; see Issues) |
| `node tooling/build-journey.mjs all` | ✓ **102 passed · 0 failed** on chromium + firefox + webkit, zero page errors |
| VR baselines | see below |

**Hallway pass**: all five stages screenshotted at 1440 and 390 under neutral — zero console errors
at both widths, all five arrangements read as distinct, and every one collapses to a single column at
390 with no overflow.

## Deviations from the plan

1. **`head.component` is `"sequence-step"`, not `"step"`.** The plan contradicted itself (its "New
   Files to Create" line and Task 1's GOTCHA said `"step"`; Task 1's head JSON said
   `"sequence-step"`). `agent-layer/lib.mjs:77` requires the head to equal the filename stem, and the
   naming decision in §A2 is about the `vocabulary.json` key — so the head JSON is the correct half.

2. **The feed's truncation line is rendered, not static markup.** Task 10 assigned both feed honesty
   lines to `build.html`'s committed prose, but the count is a fact about the visitor's board and
   static markup cannot hold it. It lives in `pattern-render.mjs` as the exported pure `streamNote`,
   rendered beside `COUNTED` in the same register. **Both** facts (order and truncation) are in that
   one sentence rather than split across two surfaces — a static duplicate of the ordering claim
   would be noise on the four patterns it does not describe. Being pure and exported is what lets
   `build-checks` assert the wording instead of asking a browser about it.

3. **The note states shown-of-counted ALWAYS, not only when they differ.** The default `stream` board
   holds 5 affordances, under `SLOT_MAX` — so a sentence that appeared only on truncation would be a
   sentence readers learn to distrust the absence of. "5 of 5" is the same true statement.

4. **`hasTemplate` exported from `agentic-renderer.mjs` (additive).** Task 11's drift guard as written
   would have been a source-grep of `TEMPLATES`, which is exactly the shape `check-that-cannot-fail`
   forbids. A predicate makes it behavioural. `TEMPLATES` itself stays private.

5. **`specMarkdown` exported from `build-keep.mjs`.** Same reason: it moves AC4's markdown half from
   the operator-run journey into the CI-run pure gate, where the mutation sweep can prove it.

6. **Task 11's "`pattern.needs` interpolated outside `renderOutOfLibrary`" check was dropped.** After
   Task 9, `build-keep.mjs` *legitimately* still interpolates `pattern.needs` in its `inLibrary:
   false` branch, so the check as specified would be red on the correct implementation. The real
   invariant — that no in-library pattern can produce the sentence — is asserted by running
   `specMarkdown`, which is strictly stronger. The `build.html` string guard is scoped to that file
   only (`build-card.mjs` retains "is not in the library yet" by design in body 3).

7. **Task 13's motion targets were already done.** The plan named the wizard's Next/Back, the keep
   rail's buttons and the import swatches as lacking press feedback. Three of the four wear `.btn`,
   which already carries the full press-squish (`components.css:168-173`) site-wide. The genuine gaps
   were `.bx-q-radio` — the most-touched control on the page, pressed ten times per build, with an
   instantly-snapping hover — and `.brand-import-swatch`. Both now use the same
   colour-on-fast / transform-through-bounce grammar as `.btn`. No entrances were added, so
   `build.html`'s committed no-entrances claim is still true and needed no rewrite.

8. **A grammar bug found and fixed in passing.** `cardSvg`'s `<desc>` hard-coded "A
   `${label.toLowerCase()}`" — correct for four labels, and "A onboarding" the moment #139 made that
   pattern renderable. The `<desc>` is what a screen reader announces for the whole image. Two board
   titles were reworded to name the pattern ("nothing for the settings pattern to show") rather than
   article it.

9. **Three shared fixtures hoisted in `build-checks.mjs`** (`HUB_BOARD`, `BOARD_FOR`, `FULL_BOARD`,
   `BARE_BOARD`). Four groups now need the same boards; a second copy is a second answer waiting to
   disagree. `BOARD_FOR` also makes a new `PATTERNS` entry fail loudly rather than be skipped.

## Issues encountered

- **The live bug, reproduced and fixed.** `build-card.mjs:203` gated on `pattern && pattern.inLibrary
  && rows.length` with one `else` hard-coding "is not in the library yet". Confirmed on `main` before
  any edit: a two-place board with every affordance removed named `queue`, derived `[]`, and printed
  *"Your breadboard · Queue is not in the library yet"*. `build-keep.mjs:138` had the same shape and
  would have printed *"None. null, …"* after the flip. Both fixed here rather than filed, because
  both are one conditional each inside code this ticket rewrites, on the page whose entire argument
  is that it does not say false things.

- **`drift-check` reports a false positive before the commit.** It compares `handoff/` against
  `HEAD`, so a correctly regenerated pack that is staged-but-uncommitted reads as drift (memory:
  `drift-check-mid-merge-false-positive`). Committed first, then re-run on the clean tree.

- **The shared worktree carries another session's uncommitted edits** to `index.html`,
  `roundtrip.html`, `derive.html`, `instance.html`, `trace.html` (plan §A6). Nothing here touches or
  stages them — every `git add` was by explicit path — and the VR capture was taken from a clean
  detached worktree so none of it could be baked into this ticket's baselines.

- **`build-checks.mjs`'s header comment still says "29 hostile payloads"** where the run reports 32.
  Pre-existing drift in a comment, untouched: this ticket added no tamper cases, and the ✓ line is
  computed from the array.
