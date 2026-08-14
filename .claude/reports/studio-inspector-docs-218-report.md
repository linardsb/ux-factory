# Implementation Report — Inspector docs: the second mount of the generated catalog (#218)

**Plan**: `.claude/plans/studio-inspector-docs-218.md`
**Branch**: `feature/studio-inspector-docs-218`
**Status**: COMPLETE

## Summary

`/factory`'s docked inspector gained a fifth panel. Click — or simply focus — a component on a
compiled studio canvas and its generated documentation opens beside the work: the live playground,
the API and token tables, the code tabs, the committed spec prose. Nothing about those docs is
re-authored: `system/catalog.mjs`'s `renderComponentDocs` is imported and called with the same
three-artifact `prepareHandoff(pack, vocab, graph)` join `/components` runs, and the only behaviour
the second mount genuinely needed — a heading-level shift — is what that function's `opts` pocket was
reserved for and is now spent on. The `.cat-*` styles moved out of `components.html`'s page `<style>`
into a shared `system/catalog.css` both pages link, so the rules (the `[hidden]` rule the code tabs
depend on included) travel with the renderer rather than with one page.

The two invariants the ticket rests on — the join's arity and the lazy rule — were extracted into
pure functions precisely because they are invisible to every gate this repo already had, and each is
now gated twice: the RULE in CI (build-checks group 23) and the WIRING on a running page
(`studio-journey`'s `docsPass`). Each gate states what the other owns.

## Tasks completed

| Plan task | Outcome |
|---|---|
| 0 · branch | `feature/studio-inspector-docs-218` off `origin/main` (f8a05bd — #217 confirmed merged) |
| 1 · `system/catalog.css` | CREATE — `components.html:32-174`'s block moved verbatim; two of its own comments corrected (the "one page, not a reused organism" sentence and the `[hidden]` one, which now records that the rule travels WITH the renderer) |
| 2 · `.cat-compact` | UPDATE `system/catalog.css` — 13 rules, delimited and commented |
| 3 · `headingTags` + `opts.level` + `watchPackSwap` | UPDATE `system/catalog.mjs` |
| 4 · the docs layer | CREATE `system/studio-docs.mjs` (~300 lines incl. header) |
| 5 · the fifth tab and panel | UPDATE `factory.html` (sheet link, tab, panel, two head-comment paragraphs) |
| 6 · mount and refresh | UPDATE `system/studio.mjs` (`PANELS`, `let docs`, three `docs?.refresh()` calls beside `syncInspect()`, the mount, the `live` handle) |
| 7 · the pure gate | UPDATE `tooling/build-checks.mjs` — **group 23**, not 22 (see Deviations) + group 7's `MODULES` + roster + count |
| 8 · the running-page gate | UPDATE `tooling/studio-journey.mjs` — `docsPass` + the stale-serve guard + the bounds/summary prints |
| 8b · the mutation drill | RUN — see below |
| 9 · param manifest + count | UPDATE — the false "4 panels" label corrected, 4 new `/factory` entries, `113 → 117` |
| 10 · loc-summary | UPDATE — runtime `73 → 75` files / `27,900 → 28,500` lines (the number moved, so approach's baselines churn) |
| 11 · CLAUDE.md | UPDATE — `studio-docs.mjs` + `catalog.css` map entries, `catalog.mjs`/`components.html` extended, build-checks roster `21 → 23`, `studio-journey` line + `docsPass` |
| 11b · the extraction proof | RUN and DELETED — see below |
| 12 · baselines | See "Validation results" |
| 13 · report + PR | this file; `Closes #218` in the PR body |

## Tests added

### `tooling/build-checks.mjs` group 23 — the rules (CI)

- **23.1** index integrity over the real artifacts — one entry per pack component, every key a usable `(class, name)`.
- **23.2** *the load-bearing case*: every pack class asserted to be a class `agentic-renderer.mjs`
  **actually emits** (source-text over its three template forms — `class: "x"`, `` class: `x${…}` ``,
  `` class: `x is-…` ``), plus every component the **committed replay board really compiles** (driven
  through `compileSteps`, not typed) proven to be a doc trigger. Nothing else in this repo asserts
  that the pack and the templates agree — group 21 pins the pack against the *vocabulary*.
- **23.3** two mutations proving 23.2 can fail from both sides: a renamed pack class no longer
  resolves against the renderer; a class collision throws and **names both** components.
- **23.4** `headingTags` exact at 2/4/5, total over 12 junk levels, section always exactly one below
  the name, and the absent-level default pinned so mount 1 stays byte-identical.
- **23.5** `loadDocsModel` driven with a **stub fetch** over the committed files: exactly
  `DOCS_SOURCES` asked for, `shared` asserted field by field against the artifacts, and the third
  argument's fields (token groups, 10 measured consumers) present — **with the graph-omitted
  mutation** that decides whether the assertion can fail at all.
- **23.6** `shouldLoad`'s full 8-row truth table, totality over 8 junk inputs, **a positive control**
  (without it, a function returning `false` unconditionally would pass every negative row), and
  `COMPILED_SELECTOR` pinned against `studio-flow.mjs`'s own `renderScreen` class.
- **the boundary stated**, as groups 9/11/13/16/18/19/22 state theirs.

### `tooling/studio-journey.mjs` `docsPass` — the wiring (×3 engines, operator-run)

Sixteen assertions. The two that no other gate can make:

- **1a** zero requests for all three artifacts before Compile, no trigger on the canvas, and the panel
  stating its precondition.
- **1b** four forced re-renders (revert → compile, twice) adding **zero** requests — the regression
  that would put three requests behind every undo — plus `pack.json`, the one source nothing else on
  the page touches, asserted at exactly 1 across the whole visit.
- **5** the rendered API and token tables compared string for string against `/components` in a
  second page, **live-value column included**, run BEFORE the pack swap with its own note saying why.

Plus: every rendered primitive proven a focusable, described trigger with the count read off the
page; the h4/h5 shift; focus opening the docs **without stealing focus** (the sole detector of
`activate(i, true)`); the code panels read as **computed display**; the pack swap moving live values
with no `var(--…)` among them; the inspect bubble still opening after a revert+recompile replaced
every node; the toggle off-by-default and persisted both ways; and a 500 becoming a **sentence** with
nothing the page itself said reaching the console.

## Validation results

| Command | Result |
|---|---|
| `node -e "import('./system/studio-docs.mjs')…"` | **ok** — 9 exports, Node-import safe |
| `node -e "import('./system/catalog.mjs')…"` · `studio.mjs` | **ok** |
| `node tooling/build-checks.mjs` | **✓ all 23 groups pass** |
| `node tooling/build-checks.mjs` with `portal/node_modules` moved aside | **✓** (SDK-free invariant intact) |
| `node tooling/drift-check.mjs` | **✓** every section |
| `node agent-layer/gen-param-count.mjs --check` · `gen-loc-summary.mjs --check` | **✓** after regen |
| `node tooling/studio-journey.mjs all` | see below |
| `node tooling/catalog-journey.mjs all` | see below |
| `node tooling/build-journey.mjs all` | see below |
| `node tooling/vt-verify.mjs all` | see below |
| Task 11b · computed-style extraction proof | **✓ identical for every sampled property, both routes** — `/components` 26/26 nodes, `/factory` 27/27, across `origin/main` and this branch on two ports. Script deleted (it is a one-time proof, not a gate). |
| Narrow-viewport check (390 px and 1440 px) | **✓** nothing in the panel overflows, the body never scrolls sideways |

### Three EXISTING assertions this ticket legitimately moved

Found by running the driver, not by reading it. All three are in `compilePass`/`teardownPass` and
all three are consequences the ticket owns:

1. **`#207 · the vocabulary was fetched exactly once`** → now **two**, and the assertion says so.
   `studio-compile.mjs` fetches `/handoff/verdant/vocabulary.json` on first compile and
   `studio-docs.mjs`'s join fetches it too. This is deliberate: `loadDocsModel` is the **only** path
   to a docs model (group 23 gates that), and threading the beat's vocabulary in from `studio.mjs`
   would couple two independent surfaces to save one cached request. The claim the assertion owns —
   *the beat does not refetch* — is unchanged, and a third fetch is still red.
2. **`#237 · it really was a second request`** → now **three**, composition stated exactly (the 503,
   the retry, the docs join). The docs join fires only once a screen exists, so it is strictly after
   the retry and never sees the 503.
3. **`#207 · compiling a second time produces a byte-identical stage`** → a real race, now fixed in
   the gate. The decoration waits on a fetch on the FIRST compile and is synchronous on the second,
   so the two snapshots differed by three attributes per node for a page that is entirely correct.
   `compilePass`'s `stageState` now awaits decoration before snapshotting — the same shape of break
   `#209`'s own "SETTLED FIRST" note in that function records, and bounded + swallowed, because
   *whether* decoration happens is `docsPass`'s assertion, not that pass's.

### Task 8b · the mutation drill

Every row run, observed failure text recorded, every mutation reverted, and the full gate set re-run
afterwards.

| # | Mutation | Went red in | It named |
|---|---|---|---|
| 1 | `loadDocsModel` joins with two args | group 23 case 5 (2 failures) | *"the joined rows carry no resolved token groups — the graph argument did not reach prepareHandoff, and the inspector is quietly poorer than /components"* · *"no joined row carries a measured `consumer`…"* |
| 2 | `shouldLoad` returns `true` unconditionally | group 23 case 6 (15 failures) | every false row by its own `{compiled,loaded,loading}` triple, e.g. *"shouldLoad({compiled:false,loaded:false,loading:false}) must be false — fetch only once the stage has compiled, only once, never while a load is in flight"* |
| 3 | `refresh()` calls `ensureModel()` without `shouldLoad` | `docsPass` 1b | the per-url delta |
| 4 | a pack component's `class` renamed | group 23 case 3 (in-group mutation) | *"a renamed pack class still resolved against the renderer — case 23.2's drift detector cannot fail, and metric-tile is what it would have named"* |
| 5 | `inspector.activate(i, true)` | `docsPass` 4 | the stolen `activeElement` |
| 6 | `[hidden]` rule removed from `system/catalog.css` | `docsPass` 6b | the second painted code panel |
| 7 | `COMPILED_SELECTOR` → `".stf-screenX"` | group 23 case 6 | *"COMPILED_SELECTOR is .stf-screenX but renderScreen emits .stf-screen — the studio would never notice it had compiled"* |

### Task 12 · baseline churn

Written down **before** the regen run and diffed against `git status --porcelain` after.

**Expected to change (4)** — `factory-neutral` · `factory-saulera` (the fifth tab is visible at rest;
the panel itself is hidden, since `wireInspector` collapses to panel 0, so the only at-rest change is
one more pill in the wrapping tab row) and `approach-neutral` · `approach-saulera` (approach renders
BOTH numbers that moved: loc-summary's runtime group and the param-count total).

**Expected unchanged (18)** — `components-*` above all, and `build-*`, plus every chrome-bearing page.

## Deviations from the plan

1. **The new build-checks group is 23, not 22.** #217 landed group 22 (the canvas selection) between
   the plan being written and this implementation. Numbering is positional in that file, so mine took
   the next free slot. The roster line for group 22 was added at the same time, since it was missing
   and my entry at 23 would otherwise have left a visible gap.
2. **`headingTags` is gated in group 23, not group 21.** The plan left this a "pick one and say
   which". The function is `catalog.mjs`'s, but it exists only for the second mount, and group 23 is
   the group that owns the second mount.
3. **The docs layer keeps its own `vocabulary.json` fetch.** The plan did not foresee that two of the
   three `DOCS_SOURCES` have other consumers on `/factory`. Two consequences, both taken
   deliberately: `docsPass`'s once-only property is asserted as a **delta** rather than a raw
   per-url count (a raw count would be red on a correct implementation, or vacuous if scoped away),
   with the raw zero-before-Compile half kept as the strong claim and `pack.json` additionally pinned
   at exactly 1; and the two existing absolute-count assertions were restated rather than weakened
   (see above).
4. **`DOCS_EMPTY` was not exported.** The plan's sketch had the empty-state sentence as a module
   constant. It lives in `factory.html`'s markup instead, so it renders with JS off — an exported
   constant nothing read would have been dead code, and a constant the module wrote into the DOM
   would have made the no-JS case blank.
5. **The panel's capability chip is "Generated · one source", not "Generated · the same source as
   /components".** The plan's string overflowed the 22 rem inspector rail (`.capability` is
   `white-space: nowrap`) — caught by the narrow-viewport check, not by any gate. It was the only
   overflowing node on the page at either width.
6. **`docsPass` has 16 assertions, not the plan's 11.** Several plan items split where the halves
   catch different regressions (assertion 1 into 1a/1b, assertion 5 into API / tokens / class).

## Issues encountered

- **The accepted double-open** (Task 4's gotcha) behaves as the plan predicted and was checked by
  hand: `tabindex="0"` makes the three compiled primitives focusable, so `inspect.mjs`'s `focusin`
  path now fires on them and tabbing through a compiled screen opens the inspect bubble AND the docs
  panel. The two do not fight — the bubble is anchored to the canvas node and the panel is in the
  rail — and it reads as one act. Recorded in `studio-docs.mjs`'s header as a decision.
- **Open question 1 resolved as the plan recommended**: the doc triggers are NOT gated behind expert
  mode. AC #1 says "any placed component", unconditionally, and a pointer/keyboard split on a toggle
  would be an a11y defect. Cheap to reverse if the owner disagrees — it changes the decoration path
  and `docsPass` 2–4 and nothing else.
- **Open question 3**: the fifth tab went last, which is what keeps `studio-journey`'s existing
  arrow-key assertions green unedited. One markup move plus one journey assertion if second position
  is preferred.

## Ready for the next step

`piv-commit` → `piv-create-pr` (body carries `Closes #218`) → `piv-review-pr`.
