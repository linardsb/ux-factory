# Implementation Report — `import/` — the IR, the Brilliant converter and the deterministic matcher

**Plan**: `.claude/plans/import-ir-brilliant-recognise-304.md`   **Branch**: `feature/import-ir-brilliant-recognise-304`
**Base**: `d04faac` (origin/main at start; local HEAD `df094f5` was #303 pre-squash, byte-identical tree — `git diff --stat df094f5 d04faac` empty) → `HEAD` of the branch (commit amended in place; the tree the figures below were measured on is the committed one — `git log --oneline -1` for the current SHA)   **Status**: COMPLETE

## Summary
Three Node-only modules under a new top-level `import/` take a Brilliant blueprint read, turn it into a typed
IR, and score every node against `handoff/verdant/vocabulary.json` with four named signal predicates, an
explicit `stack` fallback and an explicit "not covered" floor. Everything read and not carried becomes a drop
row in one of E1's three classes. `build-checks` group 40 (**17 cases** after PR #448's review round) drives the
whole chain over spike C's two committed reads and asserts the same answer every run; **25 mutations** were
driven to prove each case can fail — the 23 table rows below, `9a–c` being three — plus **seven more** in the
review round (§Review round). No portal, no agent, no network, no token spend.

## Tasks completed
- the IR → `import/ir.mjs` (CREATE) — kinds, `tok`, `DROP_CLASS_OF` (the E1 fold), `drop`, `node`, `root`, `checkIr`, `walk`
- the converter → `import/brilliant.mjs` (CREATE) — S2's layout branch lifted verbatim + the indentation tree parser and the atom grammar
- the matcher → `import/recognise.mjs` (CREATE) — `THRESHOLD`, `STRUCTURAL_FALLBACK`, `TYPE_ROLE_PX`, `PROP_SOURCES`, `SIGNALS`, `scoreNode`, `recognise`, `BUILDERS`, `build`
- fixtures → `import/fixtures/` (CREATE) — two blueprint reads copied byte-for-byte, the frozen S2 baseline, the generated expected verdict
- the gate → `tooling/build-checks.mjs` (UPDATE) — group 40, 15 cases at the first round, **17** after PR #448
- the regen chain → `import/regen-expected.mjs` (CREATE) + one clause on CLAUDE.md's **New component spec** bullet
- the group count → `tooling/build-checks.mjs` · `CLAUDE.md` ×2 · `.claude/references/gates.md` (UPDATE) — four claims, 39 → 40
- the docs → `CLAUDE.md` map + a "Where new code goes" bullet, `gates.md` group 40 paragraph (UPDATE)

## Tests added
No suite — CLAUDE.md § Ground rules. The gate is the test. `build-checks` group 40, cases 40.1–40.17:
determinism against the committed verdict, with the "Status chip" named by path beside the other three answers ·
the lift · the floor vs the fallback · the size-axis refusal, plus WHICH names survive `build()` on these two
reads and which are recognised-but-refused · all three E1 classes + the `DROP_CLASS_OF` census · built
compositions through the real `validateComposition` + D5's absorption per TEXT, with the props' CONTENT asserted
against the fixture's own words · the import graph · `genLocSummary({check:true})` · nine tables frozen by
mutation · mode/grain · `args()`' boundary (synthetic) · the `list` builder, direct AND through `build()`
(synthetic) · R3 over all 24 entries (synthetic) · R2 (`stack` in no candidates list) · the three tie-break
rungs (synthetic) · the atom order (synthetic, 40.16) · the parse boundary (synthetic, 40.17).

## Proving the checks
**24 of the 25 re-driven, 24 reddened, 0 silent passes** — the battery re-driven at the final HEAD by a scripted
runner, because rows 1–16 were first measured before the tie-break and the F1/F2 fixes landed and would
otherwise have been inherited figures. Positive control between every row and again after the last:
`build ✓ all 40 groups pass` (observed).

**The runner lied on its first pass and was fixed before any of it was believed.** `tooling/build-checks.mjs`
writes every failure through `console.error`; the harness captured stdout only, so a red run produced nothing
it could parse and all 24 rows recorded as "crash", while a green run's `all 40 groups pass` (stdout) matched
normally. Proven on a known-bad input before being trusted a second time: at `THRESHOLD = 0` the failures are
on stderr (`True`) and not on stdout (`False`); on a green run stderr is 0 bytes. The per-mutation runs done by
hand earlier in the session all used `2>&1` and were unaffected, which is why the messages below stand.

| # | mutation | case that went red | observed message (head) |
|---|---|---|---|
| 13 | drop the `component.name` fallback from `name-match` | 40.1 ×5 | `ir.children[0] (the person row) reads null via floor` · `the person row's name-match hit reads undefined — it must read "component.name"` |
| 1 | edit one `"name"` in the committed expected JSON | 40.1 | `the committed verdict and the run disagree` |
| 2 | `SPACING["spacing-md"]` 16 → 12 | 40.2 ×2 | `the lifted layout branch disagrees with …baseline.txt on: Frame 1` |
| 3 | `THRESHOLD` → 0 | 40.1/40.3/40.4 ×30 | `"Text block" reads "text" via scored — D2's rule says …` |
| 4 | `build` passes `size.w` through as a width | 40.4 ×3 | `a built composition carries a numeric size: …(360)` + the renderer refusing `expected string, got number` |
| 5 | delete `unread-al-arg` from `DROP_CLASS_OF` | 40.5 | `import/ calls drop({ kind: "unread-al-arg" }) and DROP_CLASS_OF has no entry for it` |
| 5b | `"no-token"` → an invented class | 40.5 | `DROP_CLASS_OF["no-token"] is "invented-class", which is not one of E1's three classes` |
| 6 | give the `text` builder a prop not in its entry | 40.6 ×14 | `"weight" is not a prop of text (allowed: role \| content)` |
| 7 | add `node:fs` **and** a `system/` side-effect import to `recognise.mjs` | 40.7 | `import/ reaches outside itself: recognise.mjs → ../system/agentic-renderer.mjs` — and **not** `node:fs` |
| 8 | `git add system/probe.mjs` | 40.8 | `gen-loc-summary reports drift (system/loc-summary.json)` |
| 9a–c | `Object.freeze` removed from `SIGNALS` / `KINDS` / `DROP_CLASS_OF` | 40.9 | `recognise.SIGNALS is not frozen — a mutation landed` (and each of the others by name) |
| 10 | `root()` stops checking `MODES` | 40.10 | `root() accepted mode 3 — the honesty fork has two values` |
| 11 | remove `args()`' boundary test | 40.11 | `args() resolved g( to "icon:caret-right" — a bare indexOf("g(") matches the g( INSIDE svg(icon:…)` |
| 12 | `list` builder emits the rows without their wrapper | 40.12 ×2 | `the list builder emitted {"children":[{"name":"list-row"…` |
| 14 | `name-match` 0.45 → 0.5 | 40.1/40.13 ×26 | `a node named "avatar" and carrying NOTHING ELSE scores 0.5 against avatar, at or above 0.5` |
| 15 | put `stack` back in the scored set | 40.14 ×4 | `"stack" appears in a candidates list at ir.children[0], …` |
| 16 | make the structural fallback unconditional | 40.3 ×12 | `"Chevron" reached the structural fallback` (named failures, **no crash** — see PE9) |
| 17 | strip the `ds-` tie-break rung | 40.15 | `a text node whose name matches no slug reads "demo-notice"` |
| 18 | ungate the specificity rung | 40.15 | same |
| 19 | drop the specificity rung entirely | 40.12/40.15 ×3 | `a row a designer named "List row" reads "list"` |
| 20 | a NEW `import/probe.mjs` importing `../portal/lib/env.mjs` | 40.7 | `import/ reaches outside itself: probe.mjs → ../portal/lib/env.mjs` |
| 21 | a NEW `import/probe.mjs` calling `drop({kind:"smuggled-kind"})` | 40.5 | `import/ calls drop({ kind: "smuggled-kind" }) and DROP_CLASS_OF has no entry for it` |
| 22 | edit a `"score"` in the committed expected JSON | 40.1 + `regen-expected --check` | `expected verdict ✗  drift: …` and the gate naming the regenerator |

Row counts at the final HEAD (failures per mutation): 13→5 · 1→1 · 2→2 · 3→30 · 4→3 · 5→1 · 5b→2 · 6→14 · 7→1 · 9a/9b/9c→1 each · 10→1 · 11→1 · 12→2 · 14→26 · 15→4 · 16→12 · 17→2 · 18→2 · 19→3 · 20→1 · 21→1 · 22→1.
**#8 is the one row with no final-HEAD count, deliberately**: it mutates by `git add system/probe.mjs`, so the
scripted runner would have written to the shared git index of a working directory sibling sessions use. It was
driven by hand once, at the row's own message above, and left out of the re-driven set rather than re-run
inside a loop that could not clean up after itself. So "every row re-derived at this head" is 24 of 25, and
this is the 25th.

**Two mutations initially did NOT redden and both exposed a real gate defect, fixed before the battery was
trusted** (PE2 and PE9 in the plan's AMENDMENTS): #5 left the gate fully green, and #9/#16 killed the process
with a raw stack trace instead of naming a failure. Both were then re-driven and are the rows above.

## Review round — PR #448

Thirteen findings, all thirteen actioned (`.claude/code-reviews/pr-448-review.md`). Four were behaviour, four
were the gate not being able to see a break, five were prose or a unit.

**Behaviour.** `recognise.mjs` now tracks WHICH text each prop consumed, by index, so a child that lands some of
its texts drops the rest instead of being skipped whole — a label + subtitle + footnote row lost its footnote
with no drop row and a clean count line (F10). `brilliant.mjs` decides a size's home by whether the line HAS an
`al()` rather than by which atom came first, so one source atom is one drop row in either order (F3), and the
provenance header is skipped by being the first *content* line rather than split index 0, after a leading blank
line put the literal `"lookup"` into `source.ids` (F13). `regen-expected.mjs` reports `Buffer.byteLength` — the
observed figure was 22 short on this artifact, `52900` against `wc -c`'s `52922` (F8) — and treats an absent
artifact as a write rather than an `ENOENT` from the script whose job is to create it (F9).

**The gate.** Group 40 gained two cases and four assertions, and the point of each is that the thing it names
could break silently before it existed: `build()` over a `list` verdict, because everything asserting the list
builder called `BUILDERS.list` directly and a `build()` that threw on every list verdict left all 40 groups
passing (F6); the person row's prop CONTENT against the fixture's own words, because moving `PROP_SOURCES.meta`
to `"chip-text"` passed all 40 groups (F11); the "Status chip" named by path, because losing that recognition
failed only as the stale-baseline message, which invites a regeneration (F2); and which names survive `build()`
on these two reads, because only `stack` and `text` do and every claim resting on that sweep is scoped to them
(F12). Cases 40.16 and 40.17 cover F3's atom order and F13's parse boundary.

**Prose.** The R2 justification was stated **backwards** in the gate's own failure message and in
`recognise.mjs`'s header: re-derived here, `stack` scores 0.6 on the committed chip against `status-chip`'s
0.575, so the chip **loses** by 0.025 and the exclusion is what saves the ticket's own recognition — read as
written, that sentence argued *for* removing R2 at the moment a reader is considering it (F1). `BUILDERS.list`'s
header claimed rows that `build()` discards; the refusal stands and the header now says so, which was the
owner's call between the two (F6). `gates.md`'s Group 40 paragraph was fused with Group 34's entry for want of a
blank line (F4), and both prose surfaces undercounted the synthetic cases and never named the tie-break (F5).

**Seven mutations, seven reddened by name**, each with `build ✓ all 40 groups pass` as the positive control
immediately before it and the file restored by `cmp`-verified copy after:

| # | mutation | case | first failure line |
|---|---|---|---|
| R1 | absorption back to the per-child skip | 40.6 | `a text the row could not absorb produced 0 drop rows` |
| R2 | `PROP_SOURCES.meta` `"second-text"` → `"chip-text"` | 40.6 | `the person row's props read {…"meta":"On call"…}` |
| R3 | `status-chip` skipped as a candidate | 40.1 ×3 | `("Status chip") reads "stack" via structural-fallback` |
| R4 | `build()` throws on any `list` verdict | 40.12 ×3 | `build() over the SYNTHETIC list verdict threw instead of answering` |
| R5 | `sawSize` back to `false` | 40.16 ×2 | `ONE source atom produced 2 literal-size rows in s-then-al order` |
| R6 | header skip back to `i === 0` | 40.17 | `a blank line before the provenance header changed source.ids to [lookup, …]` |
| R7 | depth message back to unconditional | 40.17 | `an indented FIRST content line was accepted, or refused without naming depth 0` |

The committed expected verdict does **not** move under any of the four behaviour fixes:
`node import/regen-expected.mjs --check` is clean at this head (observed), which is the point — F10 and F3 are
both latent on these two reads and go live at #307's converter.

## Validation results
| command | result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 40 groups pass` (observed) |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · … · group-count` (observed) |
| `git add import/ && node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` (observed, **after** staging — `git status --short import/` showed all 7 files `A`) |
| `node -e "import('./import/recognise.mjs')"` | `recognise imports clean` (observed) |
| **CI shape**: the gate in a detached worktree with **no `portal/node_modules` at all** | `node_modules: ABSENT` · `recognise imports clean` · `build ✓  all 40 groups pass` (observed) |
| `diff` of the three fixtures against their sources | `fixtures identical` (observed) |
| Level 4 manual read, both fixtures | read by eye: person row → `list-row`, container → `stack` (fallback), labels → `text` by role, Chevron → `not covered`, every drop carrying an E1 class |

The committed `spike-c-instance.expected.json` was generated by the committed code and **read before
committing** — every `via` value, every `covered`, every named answer, and the root's `mode`/`grain`/`source`.

## Not run
- **`mv portal/node_modules portal/node_modules.off` (the plan's AC #2 control).** A sibling session's portal
  was live (`ps` → PID 61843, `node server.mjs`), and moving its dependencies would have broken a possibly
  paid recorder run ([[portal-smoke-port-scoped-kill]]'s sibling hazard). Substituted with a **strictly
  stronger** control: the whole gate run from a detached worktree that has no `portal/node_modules` at all —
  the exact CI shape, which also proves every file the gate needs is tracked. Green (above).
  In that worktree `drift-check` reports `Style Dictionary build failed — node_modules is missing`; that is
  `tooling/style-dictionary/`'s own dependency, unrelated to this ticket, and `drift-check` is green in the
  primary tree.
- **Level 5 (journey drivers, pixel gate, morph gates).** Out of reach by construction — nothing on a shipped
  page, in `system/`, in a token, in a live control or in a baseline changed. Not a skip; there is no surface.
- **Paid steps.** None exist on this path; the first is #311's recorded import.

## Deviations from the plan
All nine plan errors are logged in the plan's own AMENDMENTS with the date; summarised here by consequence.

- **`child-fit` fires only on ≥ 1 recognised child** *(plan error PE1)*. As specified it is vacuously true of a
  childless node, which put every name-only match at 0.55 and made case 13 **unsatisfiable**. Fixed by
  definition, never by weight. Hand-trace row "Text 1" moves 1.05 → 0.95; no verdict changes.
- **Case 40.5 gained a source census** *(PE2)*. The specified check cannot catch a deleted `DROP_CLASS_OF`
  entry — measured: the gate stayed fully green.
- **Case 40.12 asserts the recognition and the honest refusal, not a validating `list`** *(PE3)*. `list.empty`
  is required and no design read carries empty-state copy; a passing version would have required the gate to
  invent the designer's words.
- **`prop-fit` over an entry with zero required props returns 0, not `0/0`** — unreachable on today's
  vocabulary (all 24 entries have ≥ 1 required prop, observed) but defined rather than left as NaN, which
  would poison the candidate sort and serialise as `null` into the committed file.
- **`convert` derives `ids` and `bound` instead of accepting them** *(PE6)*. Fixture 2 is genuinely
  `bound: false`; the plan's `bound = true` default would have misreported provenance.
- **`override(#tag)` has no reader.** Neither fixture contains one (`expandInstances:true` returns derived
  children, not overrides), so a reader would ship untested inside an AC-bearing module — the exact objection
  the plan raises about the `list` builder. The atom falls to the `unread-atom` scope line, which is the honest
  record; `component.overrides` is not populated. **#307/#310 own it.**
- **Case 40.7's specifier regex covers three forms** *(PE8)*, including the side-effect `import "x"` — the
  shape of the plan's own reddens #7 mutation, which a `from`-only regex misses.
- **Case 40.9's freeze probe undoes itself and every constructive call routes through `fold()`** *(PE9)*.
- Two plan claims about which node exercises which edge are wrong and are corrected in AMENDMENTS (PE4:
  fixture 2's "Frame 1" cannot score `list-row`; PE5: `align.main` never reaches a `stack` verdict in either
  fixture). Neither changes an AC; D1's gap is exercised by the asymmetric pad instead.

## Assumptions carried
Plan-sanctioned, not deviations. The verdict is **per node**, not a consumed subtree. The vocabulary is an
**argument**. Type maps by **nearest value**, spacing by **role**. `display` and `heading` compare at their
clamp **minima** (40, 24). Q2's reading is carried: `mode` and `grain` are two fields. Q1's correction stands —
the ticket's "Polaris/Badge from spike B" names an artefact that does not exist; spike B **rejected** Badge
because `status-chip` already covered it. The recognition-hit case is spike C's own "Status chip" node, used here.

## Additions beyond the plan
- **A three-rung tie-break in `recognise`, with case 40.15 and mutations 17–19.** The plan's "score desc, then
  slug asc" resolves two **real** ties to the wrong entry, both found by driving the code: a row a designer
  names "List row" ties `list` and `list-row` at 0.7 (word containment), and a text node whose name matches
  nothing ties `text` and `demo-notice` at exactly 0.5. The rungs are (1) more of the source's name explained,
  **gated on `name-match` having fired**; (2) a library-generic `ds-` primitive before a `vd-`/`fw-` scenario
  component — this repo's own convention, stated in the specs' Usage prose; (3) slug asc. Each rung is driven
  by its own mutation. No committed verdict changes; only candidate order moved.
- **`stackShape` refuses a node with no layout by name** rather than reading `null.gap` — what an unconditional
  fallback produces, and a TypeError there kills a gate run before a named failure speaks.
- **`fold()` in group 40**, group 35's pattern, for the same reason.
- **`prop-shape` drop kind** (PE7) and **`id` / `position` on the IR node** — the blueprint gives both, #307's
  record needs to point back at the element it read, and the plan's own atom-reader list requires `p(x,y)` to
  be read and recorded.
- **`atomise` / `splitQ` / `bracket` / `readColour`** — the line grammar the plan's atom-reader list implies.
  `splitQ` is quote-aware because S2's `split()` tracks parens only and would shatter a `t("name, with comma")`.
- **The two `import/` sweeps read the DIRECTORY, not three filenames.** As first written, case 40.7 and the
  drop-kind census hardcoded `ir.mjs`/`brilliant.mjs`/`recognise.mjs`, so #307's `snap-rules.mjs` and #310's
  `figma.mjs` would have been skipped in silence while the group's detail line still claimed the whole graph —
  the inverse of group 35's "a verb with no fixture fails BY NAME". Both loops now sweep `import/*.mjs` with a
  guard that the sweep still finds the three known modules. Driven twice: a scratch `import/probe.mjs`
  importing `../portal/lib/env.mjs` is named, and one calling `drop({kind:"smuggled-kind"})` is named.
- **`import/regen-expected.mjs`** — the committed verdict was a generated artifact with no generator and no
  documented regen chain, produced by an inline `node -e` that exists nowhere in the repo. It carries a
  `candidates` list per node, so it is a function of the **whole vocabulary**: #305's `icon` entry or either of
  G24's two remaining primitives reds case 40.1 on a ticket that never touched `import/` — the
  [[token-change-regen-handoff-pack]] shape. Now a ~15-line standalone generator in `agent-layer`'s voice
  (`--check` mode, named in the gate's own failure message) plus one clause on CLAUDE.md's **New component
  spec** bullet. Verified: running it on the clean tree rewrites nothing (`git diff` empty), so the script's
  canonical form and the committed bytes agree.
- **`sizeDrops()` extracted from the lifted `toStack`** so the same rows fire for a node with no `al()`.
  Stated in the module header; case 40.2 compares `layout` and is unaffected.

## Issues encountered
- **Two observed behaviours worth the reviewer's eye, neither affecting an AC.**
  **(a) The Avatar reads `not covered`.** `avatar` **is** in the vocabulary and the node is named "Avatar", but
  a name alone scores 0.45 against a threshold of 0.5 (R3/D3) and a `c s(32,32)` circle corroborates on
  nothing — no layout, no text, no children. It is the honest output of the rule the plan argued for, it is
  consistent with D5 dropping the disc, and #305's `icon` work is the natural place to revisit it.
  **(b) `demo-notice` scores exactly `THRESHOLD` on any text node**, losing to `text` only on the tie-break's
  second rung. Before that rung existed, every unnamed text node read `demo-notice` — a fictional demo's
  honesty chrome. Fixed and gated (40.15), but the margin is zero, so it is the first thing #311's real source
  should be checked against.
- **D1's escalation trigger is not yet met.** The drop lists are dominated by `literal-size` and
  `qualifier-dropped`, not by `pad`/`align`, so `stack`'s prop set stays as merged.
- **A driver bug cost one full battery pass** (details under Proving the checks). It is the failure mode this
  repo's own skill warns about — nine prior runs cleared code on a false pass from a driver bug — and the
  lesson is the same one the gate itself encodes: prove the instrument on a known-bad input *before* reading
  anything it says. The first pass reported 24/24 "crash"; the correct reading is 24/24 reddened.
- The tree is shared and `git checkout --` restores from the **index**, which twice reverted work made after a
  `git add`/commit. Staged after every patch from then on; the final tree is committed and verified.
