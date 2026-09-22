# Implementation Report — `list` through the chain (#303)

**Plan**: `.claude/plans/list-primitive-through-the-chain-303.md`
**Branch**: `feat/list-primitive-303` (cut from `origin/main`)
**Base**: `8b318a0` → `8b318a0` (unmoved; `git merge origin/main` → `Already up to date`, and
`git merge-base --is-ancestor origin/main HEAD` true — every figure below was measured on the tree
under review)
**Commit**: see `git log -1` on `feat/list-primitive-303` (amended twice after the first write of this
report — once to fold in the six baselines, once to fold in this report; the SHA is deliberately not
quoted here, because a quoted SHA in a file that is itself part of the commit can never be right)
**Status**: COMPLETE

## Summary

`list` is through the chain: a spec, a `ds-list` block in `components.css`, a `"list"` template in
`agentic-renderer.mjs`, a place in `stack.children` and in `CATALOG_COMPONENTS`, five regenerators
run, seven new group-3 cases, the wrapper histogram moved 3/20 → 3/21, and a new `catalog-journey`
case that observes the divider claim in computed style on three engines. It is the second committed
spec to declare `childrenCardinality: "many"` and the first whose allowed-children list is a single
name. `list-row` is untouched: 0 removed lines naming it in either `components.css` or
`agentic-renderer.mjs`, and `system/specs/list-row.md` has an empty diff.

The `/components` page now carries 24 sections. `system/loc-summary.json`'s **runtime** digit moved
31900 → 32000, so the three `approach-*.png` baselines cascaded with the three `components-*.png`
ones — six regenerated PNGs, not the plan's three.

## Tasks completed

| # | Task | File | Action |
|---|---|---|---|
| 1 | the ComponentSpec | `system/specs/list.md` | CREATE |
| 2 | the `ds-list` block | `system/components.css` | UPDATE (appended after `ds-text`) |
| 3 | the `"list"` template + two prose counts | `system/agentic-renderer.mjs` | UPDATE |
| 4 | `children` gains `"list"` + the Usage sentence | `system/specs/stack.md` | UPDATE |
| 5 | `CATALOG_COMPONENTS` gains `"list"` | `system/palette.mjs` | UPDATE |
| 6 | the five regenerators | `handoff/verdant/{pack,vocabulary,pack.bundle}.json`, `llms.txt`, `system/system-graph.json` | REGENERATE |
| 7 | the histogram 3/20 → 3/21 + four stale copies + the history | `tooling/build-checks.mjs`, `.claude/references/gates.md` | UPDATE |
| 8 | group 3's seven `#303` cases + the summary string | `tooling/build-checks.mjs` | UPDATE |
| 9 | group 18 picks up the empty-case example | — | VERIFY (read) |
| 10 | `catalog-journey all` | — | RUN |
| 10b | the divider-ownership case `[12]` | `tooling/catalog-journey.mjs` | UPDATE |
| 11 | `/components` baselines ×3 | `tooling/visual-regression/baselines/components-*.png` | REGENERATE |
| 12 | the loc-summary cascade — it FIRED | `system/loc-summary.json` + `approach-*.png` ×3 | REGENERATE |
| 13 | CLAUDE.md's `specs/` row | — | VERIFY: line 71 carries no count, no edit (as predicted) |

## Tests added

No test suite exists in this repo (CLAUDE.md § Ground rules, Testing). The gate stack is the test
strategy. Added:

**`tooling/build-checks.mjs` group 3 — seven cases (12 assertions)**
1. the projected key by name, the allowed list exactly `["list-row"]`, and `list-row` proven NOT to
   have gained the key
2. a `list` + three `list-row`s validates against the real vocabulary
3. the cardinality-removed mutation refuses the same three by count
4. a non-`list-row` child refused by INDEX and by NAME, asserted on the message
5. both branches rendered under the DOM stub — the empty copy proven a BRANCH (no `.ds-list-empty`
   element at all when rows are present), the absent header proven to emit no element, the element
   COUNT pinned in both branches (4 and 2), and the root's class asserted
6. the divider rules asserted on the sheet, with `list-row`'s own bare rule asserted UNCHANGED as
   the inverse control

**`tooling/catalog-journey.mjs` case `[12]` — seven assertions × three engines**
Computed style off three in-list rows plus a loose row rendered in the SAME document under the SAME
pack: first row `border-top-width: 0px`, rows 2–3 `1px`, in-list radius `0px`, the loose row still
`1px` / non-zero radius (the control), no `.ds-list-empty` on the rows branch, and the header above
the rows.

**Results**: `build ✓ all 39 groups pass`; `catalog-journey ✓ all assertions passed on chromium,
firefox, webkit` — chromium 40 passed / 0 failed, firefox 39/0, webkit 39/0 (the one-assertion
difference is the pre-existing chromium-only CDP listener count in case [11], not a skipped leg).

## Proving the checks

Every mutation below was applied, run, observed red by its own message, and reverted. A control run
followed each revert.

**Runner instrumentation, and why it was needed.** `ok()` accumulates into `failed` and `group()`
prints at the end of the block — so an uncaught throw in a LATER case discards the earlier failures
and prints nothing at all. Cases 2–4 leave case 5's `renderComposition(VOCAB, LIST_303, null)`
throwing on a broken cardinality, which swallowed the named messages. `ok()` was therefore
temporarily given one line — `if (process.env.OK_TRACE) console.error('REDDENED: ' + message)` —
which changes no assertion, only when a failure is printed. It was reverted before the commit
(`grep -c OK_TRACE tooling/build-checks.mjs` → `0`, observed) and the positive control was run with
it in place: `OK_TRACE=1 node tooling/build-checks.mjs` on the unmutated tree printed **0**
`REDDENED:` lines.

| # | Mutation | Case that went red — observed message |
|---|---|---|
| M1 | the plan's own: misspell the projected key for EVERY spec (`gen-vocabulary.mjs:82` → `childrenCardinallity`) | **not case 1** — aborts at #301's case: `Error: composition.children: stack allows at most one child (got 2)` at `build-checks.mjs:933`. Recorded as a plan imprecision, not a check failure |
| M1b | the same misspelling scoped to `list` only | `list's vocabulary entry does not carry childrenCardinality: "many" (got undefined)` (+ cases 2 and 4 as collateral) |
| M2 | delete `childrenCardinality` from `system/specs/list.md`, regen vocabulary | `a list holding three list-rows was refused — composition[0].children: list allows at most one child (got 3)` |
| M3 | add `"card"` to `list.children`, regen vocabulary | `list's allowed children are not exactly ["list-row"] — got ["card","list-row"]` **and** `a non-list-row child was not refused by index AND name — got: null` |
| M4 | remove the `kids.length === 0` guard from the template | `a list holding rows rendered its empty copy anyway — the empty case must be a BRANCH, not a hidden child`; `a list holding rows still emitted a .ds-list-empty element`; `the rows branch emitted 5 elements, not 4` |
| M5 | delete the `props.header != null` guard | `an absent header emitted a .ds-list-header element anyway — absence must express itself as no element` |
| M6 | delete `.ds-list > .ds-list-row + .ds-list-row { border-top-width: 1px; }` | `the ds-list block draws no divider between adjacent rows — the dividers are the container's` |
| M7 | delete `border`/`border-radius` from the bare `.ds-list-row {` rule | `list-row's own block lost its border or radius — a row outside a list must still be a card` |
| M8 | delete `.ds-list > .ds-list-row { border-width: 0; … }` | `the ds-list block does not zero the row's border-width — rows inside a list are still cards` |
| M9 | remove `"list"` from `CATALOG_COMPONENTS` | group 21: `palette.mjs CATALOG_COMPONENTS has drifted from the generated vocabulary` |
| M10 | `"example": { "header": 7, … }` | `gen-vocabulary.mjs` throws naming the path: `system/specs/list.md: head "example" does not render — list.example.props.header: expected string, got number` |
| M11 | the histogram — **fired on its own**, before Task 7 was written | `the wrapper histogram moved — 3 with / 21 without (pinned 3/20; see the tripwire note above)`, `build ✗ 1 failure(s)`, exit 1 |

**`catalog-journey` case [12], proven on chromium against the running page:**

| # | Mutation | Observed |
|---|---|---|
| D1 | delete `.ds-list > .ds-list-row { border-width: 0; border-radius: 0; }` | `✗ the FIRST row has no top border — got 1px`; `✗ a row inside a list is square — got 8px`. `chromium: 38 passed, 2 failed` |
| D2 | delete `border: 1px solid …` + `border-radius` from `.ds-list-row {` | **the CONTROL failed**: `✗ a row OUTSIDE a list still has its own border and radius (the control) — got 0px / 0px`, and `✗ rows 2 and 3 carry the 1px divider — got 0px / 0px`. `chromium: 38 passed, 2 failed` |

D2 is the mutation that proves D1's three assertions are not green merely because the border was
removed everywhere. It also surfaced a real coupling worth recording: `border-top-width: 1px` on the
divider computes to `0px` when `list-row`'s shorthand is gone, because the shorthand is what supplies
`border-style: solid`. The divider depends on `list-row`'s own `border-style`, which is exactly what
case 6's inverse control now holds in place.

Revert control after both: `chromium: 40 passed, 0 failed`, `catalog-journey ✓`.

**The driver was proven able to fail before its result was trusted** — D1 and D2 are that proof, run
through the same driver, on the same page, at the same port.

**Positive control for the whole group-3 addition**: `build ✓ all 39 groups pass` on the pre-change
tree (observed at pre-flight), so a red afterwards is this change's.

## Validation results

Every figure below is **observed** unless marked otherwise.

### Level 1 — syntax and contract
```
node --check system/agentic-renderer.mjs · system/palette.mjs ·
             tooling/build-checks.mjs · tooling/catalog-journey.mjs   → all clean
node tooling/token-lint.mjs
  → token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
```
Token reconcile — the `ds-list` block's distinct `var()` uses against the spec's `tokens` array:
`9 ["--color-bg-surface","--color-border","--color-fg-muted","--radius-md","--spacing-lg","--spacing-md","--spacing-sm","--type-body","--type-eyebrow"]`, identical to the head, 1:1.

### Level 2 — the pure gate
```
node tooling/build-checks.mjs   → build ✓  all 39 groups pass
```

### Level 3 — generators and drift
```
node agent-layer/gen-handoff.mjs       → handoff pack ✓  24 specs + 3 token targets + 3 wc wrappers
node agent-layer/gen-vocabulary.mjs    → vocabulary ✓  24 components
node agent-layer/gen-pack-bundle.mjs   → pack bundle ✓  16 files
node agent-layer/gen-pack-index.mjs    → pack index ✓  17 files (llms.txt)
node agent-layer/gen-system-graph.mjs  → system graph ✓  63 tokens · 47 consumers · 541 edges
node agent-layer/gen-loc-summary.mjs --check   → loc summary ✓  3 groups — no drift
node agent-layer/gen-param-count.mjs --check   → param count ✓  121 controls — no drift
node tooling/drift-check.mjs
  → drift-check ✓  syntax · token-css · annotated-source · loc-summary · param-count ·
      system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count
```
`git diff --stat handoff/ system/system-graph.json` after the chain touched exactly the five expected
files and nothing else.

Vocabulary shape: `components: 24` / `list.childrenCardinality: "many"` / `list.children:
["list-row"]` / `list-row has the key: false`.

Group 18 (Task 9): `validateExamples: {"checked":24}` and `pack examples: 24` — equal and each one
higher than the pre-change 23; `list example: {"header":"Short this week","empty":"No shortfalls — every SKU is covered."}`.

**One drift-check false positive, recorded**: run with the changes staged but uncommitted it reported
`drift ✗ handoff/ drift after regeneration` listing the four `M ` handoff paths. It reads
`git status --short`, so staged-not-committed reads as drift — the same shape as the recorded
*drift-check mid-merge false positive* trap. Green on the committed tree.

### Level 4 — the running page
```
PORT=4791 node tooling/visual-regression/serve.mjs &     # a PRIVATE port; killed by port, never pkill
curl -s localhost:4791/system/components.css | grep -c ds-list-empty   → 1   (the serve is MY tree)
curl localhost:4791/handoff/verdant/vocabulary.json → 24 components, has list: true
BASE=http://127.0.0.1:4791 node tooling/catalog-journey.mjs all
  → chromium: 40 passed, 0 failed
  → firefox:  39 passed, 0 failed
  → webkit:   39 passed, 0 failed
  → catalog-journey ✓  all assertions passed on chromium, firefox, webkit
```
Case `[1]` reported `count line renders the artifact's 24`, `24 sections rendered`, `24 index chips`.
Case `[7]` reported `vd tab on exactly 3 (counted from the fetched pack)` and `the honest absence note
on the other 21`. All seven `[12]` assertions passed on **each** of the three engines (counted
separately, not inferred from a total).

**The human read the plan asks for.** Both branches were rendered in chromium at 560px and read off
the screenshot rather than described from the code.
- *rows branch* (one `critical`, one `warn`, one neutral): reads as **one list**, not a pile of
  cards. The hairlines sit BETWEEN rows with none after the last. The critical row's accent fill runs
  edge to edge and is clipped by the container's radius. The header sits above all of it. All four of
  the plan's by-eye criteria hold.
- *empty branch* (what the pixel gate captures): the header rule, then the empty sentence centred in
  the reading position the rows would have taken, inside one frame — no second dashed box.

### The portal smoke

Required on every PR by an explicit owner instruction (2026-09-03), including docs-only ones.
```
cd portal && PORT=4749 node server.mjs &      # a PRIVATE port; killed by port, never pkill
curl http://127.0.0.1:4749/api/health
  → HTTP 200 {"ok":true,"hasToken":false,"cards":9,
      "bootSha":"bdfee0a…","headSha":"bdfee0a…","stale":false}
```
Boot SHA equals head SHA and `stale` is false, so the portal is serving this tree.

### Level 5 — the pixel gate
Run from a **clean detached worktree at `HEAD` under `/Users`** (`/Users/Berzins/wt-vr-303`, removed
afterwards), not from this shared tree, and not from `/private/tmp` which Docker does not share.
Six baselines were `rm`'d first, because `update:docker` silently keeps a stale digit on an edit.
```
docker 29.2.1;  npm run update:docker   → 33 passed (1.1m), exit 0
git status --short tooling/visual-regression/baselines/
  → exactly 6 modified: approach-{neutral,saulera,verdant}.png
                        components-{neutral,saulera,verdant}.png
```
Nothing else moved, which was the "stop — something leaked" tripwire. The regenerated approach
baselines were checked rather than assumed: the live `approach.html` renders `32,000` (observed
through the driver), matching the regenerated `loc-summary.json`.

### R4 — `list` is composable, OBSERVED not inferred

The plan's whole reason for widening `stack.children` is that it creates the `stack > list > list-row`
pair in group 3's `deepPairs` walk. `3 parent > child > leaf pairs` in the summary is consistent with
the pair landing (2→3) *and* with it not landing (3→3), so the walk was enumerated on both trees with
its own `isContainer` predicate read out of the source:

```
origin/main  → 2 pairs: stack > card > metric-tile · stack > stack > ghost-button
HEAD         → 3 pairs: stack > card > metric-tile · stack > list > list-row · stack > stack > ghost-button
```

The new pair is exactly the predicted one, and the walk asserts each pair's leaf marker survived
(`build ✓`), so `list` renders its grandchild through `renderChild` rather than dropping it. R4 closed
on an observation, not on `stack.children` having eleven names.

### AC5 — `list-row` is unchanged
```
git diff --stat origin/main..HEAD -- system/specs/list-row.md                              → 0 lines
git diff -U0 … system/components.css | grep '^-' | grep -c 'ds-list-row\|ds-row-'          → 0
git diff -U0 … system/agentic-renderer.mjs | grep '^-' | grep -c 'list-row'                → 0
```
The renderer's only two removed lines are the `twenty-three` → `twenty-four` prose counts.

## Not run

- **`build-journey`, `proto-journey`, `studio-journey`, `instance-journey`, `vt-verify`,
  `vt-stack-audit`** — not in the plan and not reachable by this change: `list` appears on no shipped
  page but `/components`, every selector in the new block is scoped under `.ds-list`, and no `/build`
  pattern, proto page, studio surface or view transition names it. Tracker: none needed.
- **The `warn`/`critical` divider COLOUR (D5)** — asserted by eye above and stated in the spec's
  States section; no gate reaches it, because the `/components` playground renders `{name, props}`
  with no children so the pixel gate only ever screenshots the empty branch. Named as a standing gap
  in the group-3 summary string. Tracker: owner's call.
- **`.claude/references/gates.md:13`** — the plan named it as a prose copy carrying a number this
  change moves. Read: it carries **no** component count and **no** pair count (the `23`s in that file
  are group numbers), and its sentence about `#301`'s regenerated vocabulary being the first proof of
  the projected key is a historical claim that stays true. No edit. Recorded here because a named
  citation that turns out to need nothing should say so, not go silent.
- **Whether the page *reads* as a list** — a human judgement. I rendered it and read the screenshot;
  the owner's own eye is the final word. Tracker: owner's call.

## Deviations from the plan

1. **`git add -A` → an explicit-path `git add`** *(plan error, logged as AMENDMENT A1)*. Task 12's
   VALIDATE and Level 3 both say `git add -A`. This tree carries eight untracked paths and one
   modified file belonging to other sessions. `gen-loc-summary` reads `git show :<path>`, so only
   this change's paths need staging. Nothing of anyone else's was staged or committed —
   `.claude/skills/piv-fix-review-findings/SKILL.md` is still dirty and untouched.
2. **The histogram's stale copies are FOUR, not three, and `:4919` is not one of them** *(plan error,
   logged as AMENDMENT A3)*. `build-checks.mjs:4920–4925` is a HISTORICAL chain
   (`3/7 → 3/17 → 3/18 → 3/20`) that must be EXTENDED, and it was — one sentence in its established
   form. The stale current-state claims are `build-checks.mjs:94` (`3/18`), `:4944` (the live
   literal, `3/20`), `gates.md:112` (`3/17`) and **`gates.md:33`** (`3/17`), which the plan missed.
   All four now read `3/21`.
3. **Case `[12]` guards its stage** *(hardening, logged as AMENDMENT A4)*. The plan's
   `page.evaluate` dereferences `#list .cat-stage` unguarded; a null stage would throw and abort that
   engine's whole leg, which reads as "stopped here" rather than as coverage. It returns
   `{ error: … }` instead, asserted through `t()`.
4. **M1 as the plan writes it does not redden case 1** — it breaks the projected key for every spec,
   so the run aborts at #301's stack case before reaching `list`. A `list`-scoped variant (M1b) was
   used to isolate the case. The plan's mutation still reddens the gate; it just does not name this
   case.
5. **Six baselines, not three.** The plan calls Task 12 conditional. The condition FIRED: the runtime
   group's `linesApprox` moved 31900 → 32000, and `approach.html` renders the runtime group, so the
   three `approach-*.png` cascaded with the three `components-*.png`.
6. **A temporary one-line `ok()` instrumentation** was needed to observe the named messages, for the
   reason given under *Proving the checks*. Reverted before the commit; verified absent.

## Assumptions carried

Plan-sanctioned options honoured, **not** deviations:

- **D1 — `empty` is required.** Kept, with the reasoning argued in the spec's Usage section.
- **D2 — the container claims no ARIA role.** Kept and argued explicitly in the spec's Accessibility
  section, including the instruction not to "fix" it here. `list-row` gaining `role="listitem"` under
  an owning list is its own ticket. This is the one thing a reviewer might reasonably call
  under-built, and it is flagged rather than hidden.
- **D3 — `stack.children` gains `"list"`.** Taken, on the licence `stack.md`'s own prose grants
  ("Widening it is one line here plus a regeneration"). Without it `list` is a component no container
  can hold and #304 has no placement target.
- **D4 — AC #2's three-row half sits in group 3, not group 18.** `validateExamples` feeds an example
  as `{ name, props }` with no `children` array, so a many-children example is unreachable there
  without growing the head schema. #298 and #301 both made the same call. Group 18 still proves the
  **empty**-case example (`checked: 24`, observed).
- **D5 — the divider above a tone row is that row's accent.** Kept and stated in the spec's States
  section. Read by eye; it looks correct.
- **Q1 — `header`, not `title`.** Kept: the spec's own name for the thing, and `title` would collide
  conceptually with `card`/`empty-state`, which title a whole region.
- **AC #3's "the four regenerators" is stale.** Five were run; `gen-pack-index.mjs` (#419) landed
  after the ticket was written and both `build.mjs` and `drift-check.mjs` call it.

## Additions beyond the plan

- **`gates.md:33`'s `3/17`** — a fourth stale copy of the histogram number the plan did not name.
  Corrected in the same pass, on the recorded *Gate prose has three copies* rule.
- **One sentence in the `ds-list` block's `min-width` comment** naming the `overflow: hidden` /
  `position: sticky` interaction, so the trap is recorded where a future row author will hit it
  rather than only in the plan.
- **`.claude/references/gates.md:112` now records the gate this ticket added.** The plan only asked
  for the stale `3/17` there. But a new gate whose existence is not in `gates.md` is a gate the next
  reader will not know to trust — and the group-3 summary string now *points at* `catalog-journey` for
  the divider claim, so `gates.md` was the one place that did not say the driver owns it. The clause
  names case [12], its loose-row control, why it is the only gate that can reach the claim, and what
  it still cannot reach (the tone colours).
- **The group-3 summary string's "cannot reach" clause** was extended to say that the sheet check
  cannot prove the two rules WIN, and to name `catalog-journey` as the place that does. The plan asked
  for the positive half of the summary; this is the honest negative half beside it.

## Issues encountered

1. **`ok()`/`group()` swallow failures behind a later throw.** Not introduced here and not fixed here
   — it is the file's established shape, and #301's cases have it too (M1 demonstrated it). Worth a
   ticket if anyone wants mutation-proving to be cheaper; out of scope for this one.
2. **The divider depends on `list-row`'s `border-style`.** Surfaced by D2: deleting `list-row`'s
   `border` shorthand makes the divider's `border-top-width: 1px` compute to `0px`, because the
   shorthand supplies `border-style: solid`. This is correct behaviour (the container deliberately
   sets width only, so the row's tone `border-color` survives) and case 6's inverse control is what
   holds the dependency in place. Recorded so nobody "simplifies" `.ds-list-row`'s shorthand later.
3. **The branch this session started on (`feat/pack-routing-index-419`) was already merged** as
   `8b318a0` and its content was identical to `origin/main`. `feat/list-primitive-303` was cut from
   `origin/main` instead.
4. **`R7`'s precondition ran clean**: `gh pr list --state open` filtered to PRs touching
   `system/specs/`, `handoff/` or `components.css` returned nothing — no `/components` collision.

## Ready for the next step

All plan tasks complete, every validation command run and green, the commit `89edd1d` sits directly
on `origin/main` at `8b318a0`, and no generated path is dirty.

Next: `piv-create-pr`. The PR body must carry **`Closes #303`** and state: five regenerators not four;
`/components` baselines ×3 **plus** `approach` ×3 because the loc digit moved; the group-18 → group-3
relocation (D4); the `stack.children` widening (D3); the `tooling/catalog-journey.mjs` addition and
why it is not optional; and the deferred ARIA decision (D2).
