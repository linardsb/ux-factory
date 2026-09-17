# Implementation Report — the composition grammar grows once (`childrenCardinality: "many"`)

**Plan**: `.claude/plans/canvas-grammar-children-many.md`
**Branch**: `feature/canvas-grammar-children-many-298`
**Base**: `d3cc161` → `d3cc161` (re-fetched at report time; `origin/main` did not move, so no merge was needed)
**Status**: COMPLETE

## Summary

`validateComposition` now honours a per-entry children cardinality: a vocabulary entry that declares
`childrenCardinality: "many"` takes any number of children, and every other entry keeps the single-child
rule unchanged. One optional spec-head key rides the existing spec → parser → vocabulary → validator chain
with no new file, no new module and no renderer template. `vocabulary.json`'s grammar block gains
`composition.version: 2` and a reworded `childrenRule`. **No spec declares `many` in this PR** — `stack`
and `list` are #301 and #305; this is the grammar they land on.

## Tasks completed

| # | Task | File | Action |
|---|---|---|---|
| 0 | Branch off a clean `main`, #292's dirty file stashed by explicit path | — | — |
| 1 | The head key documented in the format spec | `.claude/references/kb-format.md` | UPDATE |
| 2 | `parseComponentSpec` refuses a bad cardinality and a cardinality on a leaf | `agent-layer/lib.mjs` | UPDATE |
| 3 | `validateComposition` honours the cardinality; every refusal names the index | `system/agentic-renderer.mjs` | UPDATE |
| 4 | Conditional projection · reworded `childrenRule` · `version: 2` | `agent-layer/gen-vocabulary.mjs` | UPDATE |
| 5 | Group 3 — the cardinality grammar + its mutation, the ✓ line, the header index | `tooling/build-checks.mjs` | UPDATE |
| 6 | Group 18C — the two parser refusals + the `many` happy case | `tooling/build-checks.mjs` | UPDATE |
| 7 | The groups-1–7 sentence made true again | `.claude/references/gates.md` | UPDATE |
| 8 | Four regenerators run; the `handoff/` diff read | `handoff/verdant/{vocabulary,pack.bundle}.json` | REGENERATE |
| 9 | Stage → `loc-summary` → the VR decision by arithmetic | `system/loc-summary.json` (unchanged) | CHECK |
| 10 | The gates | — | RUN |
| 11 | The real orchestrated build from the jobs folder | — | RUN |
| 12 | The hand-off posted on #301 | [issuecomment-5715827316](https://github.com/linardsb/ux-factory/issues/301#issuecomment-5715827316) + [correction](https://github.com/linardsb/ux-factory/issues/301#issuecomment-5715863907) | POST |
| 13 | #292's stash restored to #292's branch | worktree `../wt-292-restore` | RESTORE (see Deviations) |

Ten staged paths, exactly the plan's set — no `git add -A` anywhere.

## Tests added

No test suite exists in this repo and none was invented (CLAUDE.md §Ground rules). "Tested" = the gate that
owns the surface ran and was watched failing.

**`tooling/build-checks.mjs` group 3 — the cardinality grammar** (5 new `ok()` assertions), driven straight
through `validateComposition` over a synthetic entry, because no committed spec declares `many` yet:

- three children accepted under a synthetic `many` entry — PASS
- two children refused under the real `card` — PASS
- the refusal names `children[1]` — PASS
- the refusal says `at most one child (got 2)` — PASS
- a bad child at index 2 named at index 2 — PASS
- **the mutation**: the same three children under an entry differing only in the cardinality must be
  refused — PASS

**`tooling/build-checks.mjs` group 18C — the parser** (2 refusals + 2 positive assertions), over real
tmpdir spec fixtures:

- `childrenCardinality: "lots"` refused, naming its spec path and its reason — PASS
- `childrenCardinality: "many"` on an entry with no allowed children refused — PASS
- a spec with no `childrenCardinality` parses as `undefined` — PASS
- `"many"` beside a non-empty `children` list survives parsing — PASS

The ✓ line moved from `6 NEW refusals` to `8 NEW refusals` on its own — `parserRefusals` is derived from
the array, so no count was retyped.

## Proving the checks

Every row observed. Restores verified byte-identical against the index (`git diff --stat` empty).

| # | Mutation applied | Case that went red | Positive control |
|---|---|---|---|
| M1 | dropped `entry.childrenCardinality !== "many" &&` from the guard (`agentic-renderer.mjs`) | `build composition ✗ 2 failure(s)` — `a "many" entry refused three children: composition[0].children[1]: syn-container allows at most one child (got 3)` | restored → `build ✓ all 34 groups pass` |
| M2 | deleted the too-many guard entirely | `build composition ✗ 4 failure(s)` — `a single-child entry accepted two children — the cardinality is not honoured` | restored → `build ✓ all 34 groups pass` |
| M3 | deleted the whole `childrenCardinality` block from `lib.mjs` | `build docs chain ✗ 6 failure(s)` — `parseComponentSpec accepted a childrenCardinality that is not "many" — the refusal cannot fire`, plus its path and reason assertions, on both refusals | restored → `build ✓ all 34 groups pass` |
| M4a | `"childrenCardinality": "many"` temporarily declared on `system/specs/card.md` (non-empty `children`), then `gen-vocabulary` re-run | n/a — this is the **positive control on the projection itself**: `card.childrenCardinality === "many"` in the regenerated `vocabulary.json`, `entries carrying the key: 1` | the projection is **correct**, not merely uncovered |
| M4b | with M4a's spec still declaring the key, the projected key renamed to `childrenCardinalityTYPO` | **nothing went red** — `card.childrenCardinality` became `undefined`, `card.childrenCardinalityTYPO` became `"many"`, and `build ✓ all 34 groups pass` | both restored; `git diff --stat` on `system/specs/card.md`, `gen-vocabulary.mjs` and `handoff/` all empty |

**M4 is the honest one, and it took two passes to become honest.** The first attempt renamed the projected
key with **no spec declaring it** — which is vacuous: the conditional's truthy branch never executes, so the
edited string is dead code and a green run cannot distinguish "no gate covers the projection" from "no input
reaches the projection." That is the repo's own [[check-that-cannot-fail]] shape, caught in review before
this report shipped.

M4a/M4b above is the discriminating version, and it separates the two claims cleanly:

- **The projection works.** Declared on a real spec, the key lands in `vocabulary.json` under the right
  name, on exactly the one entry that declares it (M4a). A3/R4's boundary is about *coverage*, not
  *correctness* — this PR does not ship a broken projection.
- **No gate covers the projected key's NAME.** With a real input reaching it, a typo lands silently and all
  34 groups stay green (M4b).

That second sentence is the boundary now stated in group 3's own ✓ line, in `gates.md`, and in the hand-off
posted on #301.

The pre-existing positive controls that would catch a broken harness both held throughout: group 3's
real-vocabulary template loop and group 18C's `ok-thing`/`bare-thing` fixtures.

**Driver honesty.** My first regression probe (committed compositions + pack examples) failed with
`composition[0]: expected a node…`. That was **my probe**, not the code: it fed `proto/compositions/index.json`,
which is the manifest, not a composition. The probe was fixed and then re-run with a known-bad input FIRST
(`card` with a `nonsense` prop → correctly refused) before its pass was trusted.

## Validation results

Every figure names the command that produced it. All **observed** unless marked.

### Level 1 — syntax

```
node --check system/agentic-renderer.mjs      ok
node --check agent-layer/lib.mjs              ok
node --check agent-layer/gen-vocabulary.mjs   ok
node --check tooling/build-checks.mjs         ok
node tooling/token-lint.mjs                   token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid
```

### Level 2 — build-checks

```
node tooling/build-checks.mjs                 build ✓  all 34 groups pass
```

Group 3's ✓ line carries the new clause; group 18's reads `parseComponentSpec's 8 NEW refusals` with both
new `why` strings in the derived names list. No 35th group was added (`checkGroupCount` green).

### Level 3 — integration

```
node tooling/drift-check.mjs                  drift-check ✓  syntax · token-css · annotated-source ·
                                              loc-summary · param-count · system-graph · inspect-data ·
                                              inspect-mounts · handoff · scenarios · traces · replay · group-count
```

**Read this one carefully.** Pre-commit, `drift-check` reports `drift ✗ handoff/ drift after regeneration
— commit the regenerated pack`. That is the staged-but-uncommitted state, not real drift: `checkHandoff`
(`tooling/drift-check.mjs:127`) reads `git status --porcelain -- handoff/`, which lists staged changes, and
the working-tree-vs-index diff was **empty** (so the regeneration is deterministic). The green line above
was observed on a throwaway commit which was then `git reset --soft`-ed away; the state is byte-identical
to before. It goes green for real at `piv-commit`.

**`handoff/` diff — exactly as the plan predicted:**

```
git diff --stat handoff/ system/system-graph.json
 handoff/verdant/pack.bundle.json | 2 +-
 handoff/verdant/vocabulary.json  | 3 ++-
```

Two files, no third. `system/system-graph.json` unchanged. `pack.json` unchanged. The `vocabulary.json`
diff is exactly the `version: 2` line plus the `childrenRule` pair; the `components` block is
**byte-identical** to `HEAD` (derived: `JSON.stringify(before.components) === JSON.stringify(after.components)`
→ `true`), which is what proves the projection stayed conditional (R6 closed).

Regenerator ✓ lines: `handoff pack ✓ 21 specs`, `vocabulary ✓ 21 components`, `pack bundle ✓ 16 files`,
`system graph ✓ 63 tokens · 44 consumers · 509 edges`.

### Level 3 — the line cascade (task 9)

`system/loc-summary.json` — **unchanged**; `node agent-layer/gen-loc-summary.mjs --check` → `loc summary ✓
3 groups — no drift`. Measured after `git add`, because `genLocSummary` reads the git index.

| group | on `d3cc161` (before) | after this PR | rounded | files |
|---|---|---|---|---|
| runtime | 30,580 | **30,585** | 30600 → 30600 | 76 → 76 |
| pages | 5,244 | 5,244 | 5200 → 5200 | 17 → 17 |
| generators | 2,667 | 2,688 | 2700 → 2700 | 20 → 20 |
| **total** | 38,491 | 38,517 | 38500 → 38500 | 113 → 113 |

**VR decision: no baseline regeneration.** The runtime group's *rounded* figure (30600) and *file count*
(76) are both unchanged, and those are the two numbers `approach.html:272-279` renders. Decided by this
arithmetic, explicitly not by a green pixel run (R13). The `pages` group — which the plan never
mentioned, and which had only **5** lines of headroom — was checked empirically after staging the new
`.claude/plans/*.html`: it did not enter the group, and its figure did not move.

### Level 4 — manual / operator-run

```
PORT=4791 node tooling/visual-regression/serve.mjs &     (private port; killed by PID 27972 afterwards)
curl http://127.0.0.1:4791/handoff/verdant/vocabulary.json | head -8
    → "version": 2                    ← the stale-serve guard (R8): this is MY tree
BASE=http://127.0.0.1:4791 node tooling/catalog-journey.mjs all
    → catalog-journey ✓  all assertions passed on chromium, firefox, webkit
      chromium: 33 passed, 0 failed · firefox: 32 passed, 0 failed · webkit: 32 passed, 0 failed
      (chromium carries one extra assertion — the CDP listener count, which the driver states is chromium-only)
```

**AC #3, mechanically rather than by eye.** `/components` was driven headless under **both** packs and its
rendered `Children:` lines extracted, then diffed against the lines `main`'s committed vocabulary produces
through `catalog.mjs:429-430`'s rule:

```
neutral  = saulera = ["Children: ghost-button",
                      "Children: metric-tile · list-row · sequence-step",
                      "Children: status-chip",
                      "Children: status-chip"]
identical to HEAD (main): true
```

So: no visual change on `/components`, with evidence rather than a hope. The structural reason holds too —
`catalog.mjs` is untouched and the `components` block is byte-identical.

### Level 4 — the real orchestrated build (task 11)

```
cd "../Linards jobs folder" && node ../ux-factory/agent-layer/build.mjs _factory/kb/decisions/ba.md
  decisions.json  ✓  14 decisions          token css  ✓  63 contract + 71 pack tokens
  tokens.json     ✓  48 contract + 64 pack  sd tokens ✓  css + ios + android
  handoff pack    ✓  21 specs               vocabulary ✓  21 components
  pack bundle     ✓  16 files               replay     ✓  2 run(s) → 43 ops
  llms.txt        ✓  0 prototypes           _headers   ✓  noindex=true
  json-ld         ✓  Person ×8              DESIGN.md  ✓  served at site root
```

Back in the repo: `git status --short -- system agent-layer tooling handoff replay` shows only the staged
paths and **no unstaged change** — the real build re-emitted task 8's artifacts byte-identically.

**The out-of-repo writes (P10/R12) are accounted for.** The jobs folder is not a git repo, so the four
per-company targets were SHA-256'd before and after:

| file | before | after | |
|---|---|---|---|
| `BA/portfolio/decisions.json` | `13a89e4f…` | `13a89e4f…` | no-op |
| `BA/portfolio/llms.txt` | `379a9305…` | `379a9305…` | no-op |
| `BA/portfolio/_headers` | `cde22d05…` | `cde22d05…` | no-op |
| `BA/portfolio/tokens.css` | absent | absent | not written for this ledger |

The `flagship` hazard the amendment named did **not** materialise: `ba.md` does carry `"flagship":
"approach"`, but the emitted `decisions.json` contained no `flagship` key before the run (observed: `grep -c
flagship` → 0), so #292's stashed line had never been run against this ledger and my run could not strip it.

## Not run

| Step | Why | Tracker |
|---|---|---|
| `node tooling/build-journey.mjs all` | Level 5, explicitly optional in the plan and required by no AC. The group-3 diff needed no running-page confirmation — `catalog-journey` already exercises the same regenerated vocabulary across three engines. | owner's call |
| `cd tooling/visual-regression && npm run update:docker` | Correctly not applicable. Task 9's arithmetic branch chose "no regeneration"; the evidence is in Validation results above. | n/a |
| A live `drift-check ✓` on the *uncommitted* tree | Structurally impossible for any PR that legitimately changes `handoff/` — the gate reads `git status --porcelain`. Observed green on a throwaway commit instead, then soft-reset. | resolves at `piv-commit` |

Nothing else in the plan's VALIDATION COMMANDS was skipped.

## Deviations from the plan

**1. `(plan error)` — the line-budget figures were stale, and R2's expectation inverts.** The plan's P1 and
task 9 were measured on `0e27afb`; `origin/main` had since moved to `d3cc161`. Re-measured:

| group | plan said | observed on `d3cc161` | headroom up |
|---|---|---|---|
| runtime | 77 files / 30,632, **18 up** | **76 files / 30,580** | **69** |
| total | 38,543, **7 up** | **38,491** | **58** |
| pages | not mentioned at all | 17 files / 5,244 | **5** |

So `system/loc-summary.json` was expected **unchanged**, not expected to flip to 38,600 and be committed —
and it *was* unchanged. Logged under AMENDMENTS in the plan with the full table and all four consequences.
Every figure in this report and in the PR body is 76/30,580, because the plan's 77/30,632 does not survive
re-derivation.

**2. `(plan error)` — the expected component count is 21, not 20.** The plan's task 4 and task 11 VALIDATE
both expect `vocabulary ✓ 20 components`; the base moved and it is **21**. No action beyond reading the
right number.

**3. Task 3's block came out net +5 lines, not the plan's net −2** (observed: `git diff --numstat` →
`24 19`). Harmless with 69 lines of runtime headroom: the group landed at 30,585, still rounding to 30600.
The difference is the module-header reword and the "Per child" comment, both of which the plan also asked
for. Checked fail-fast at the end of task 3 exactly as the plan instructed, and again at task 9.

**4. `(plan error)` — task 13's recipe is unsafe in this shared worktree, and it misfired.** The plan's
`git switch feature/discovery-pre-grill-audit-292` **aborted** (an untracked file in the shared tree,
`__run0_discovery_worksheet.md`, is tracked on #292's branch and would have been overwritten) — but the
`git stash pop` on the next line still ran, applying #292's `flagship` line to the **#298 branch**, which is
precisely the failure the plan's own gotcha warns about. Recovered, and the recovery is verified:

- the patch was captured, then `git checkout -- agent-layer/gen-decisions.mjs` reverted #298's branch
  (`git status --short` on that path → empty);
- a worktree was added at `../wt-292-restore` on `feature/discovery-pre-grill-audit-292` and the patch
  applied there — `git diff` confirms the single `+    flagship: meta.flagship ?? null,` line is back on
  the branch it belongs to;
- `git stash list` is empty of this session's entry.

**Owner action — and the blocking condition is the worktree existing, not the line needing carrying.**
`../wt-292-restore` holds `feature/discovery-pre-grill-audit-292` checked out, so **the primary tree can no
longer `git switch` to that branch at all** — a sibling session resuming #292 in this checkout will hit
`fatal: ... is already checked out`, caused by this session. The line itself is safe and on the right
branch. To clear it: either continue #292 inside `../wt-292-restore`, or run `git worktree remove
../wt-292-restore` (the uncommitted line is discarded — re-apply it by hand, it is one line:
`flagship: meta.flagship ?? null,` after `role_applied` in `agent-layer/gen-decisions.mjs`) and then switch
the primary tree back to #292 as normal.

**5. Task 12's comment body is a superset of D2's block, and it needed a second comment.** D2's own gotcha
requires the superset: "the key string in it — `childrenCardinality` — must match what task 2 actually
shipped". Three additions: an opening paragraph naming the literal key (because #301's body writes the
shorthand `children: many`), a closing line stating `composition.version: 2`, and a sentence recording that
the projection's blind spot was measured. That last sentence rested on the vacuous first version of M4, so
a [correction comment](https://github.com/linardsb/ux-factory/issues/301#issuecomment-5715863907) was posted
carrying M4a/M4b instead — the claim was right, its evidence was not, and #301's planner needs the version
that discriminates. Nothing else in the first comment changed.

**6. D1's deviation, carried forward as the plan requires.** AC #1's cases live in build-checks group 3
(grammar) and 18C (parser) rather than in `validateExamples`, which cannot carry a `children` array — it
feeds `validateComposition` a node of the shape `{ name, props: head.example }`
(`agent-layer/gen-vocabulary.mjs:41`, re-verified this session). This sentence must appear in the PR body
above the `Closes #298` trailer.

## Assumptions carried

Plan-sanctioned options taken as written — **not** deviations:

- **A1** — the key shipped as `childrenCardinality`, accepting `"many"` and nothing else; absent ≡ one, so
  one has a single spelling.
- **A2** — the version mark is `composition.version: 2`, inside the grammar block it versions.
  Re-confirmed this session: `pack.json` carries no version to bump.
- **A3** — no spec declares `many` in this PR, so the `many` branch is proven only by a synthetic entry, and
  the projection ships unexercised. Stated out loud in group 3's ✓ line rather than left implied — and
  **measured** by M4 rather than assumed.
- **D1** — the gate homes (group 3 + 18C). See Deviations 6 for the sentence the PR body must carry.
- **D2** — `handoff-viewer.mjs:81` and `catalog.mjs:430` deliberately **not** touched; the hand-off made
  durable on #301 instead (task 12).
- The two `children[0]` templates (`agentic-renderer.mjs:389` card, `:401` empty-state) were left alone, as
  were `handoff-viewer.mjs:239`'s fixed three-key render list and `param-manifest.json`.

## Additions beyond the plan

1. **M4, the projection probe.** The plan asserts the conditional projection ships unexercised (A3/R4) and
   marks task 4 `REDDENS: n/a`. I ran the mutation anyway, to test the claim instead of repeating it — and
   then had to run it a second, discriminating way (M4a/M4b) after the first version turned out vacuous.
   Net result: the projection is *correct*, and *uncovered*. Recorded in Proving the checks and in the #301
   hand-off.
2. **AC #3 made mechanical.** The plan's Level 4 asks for "one browser read" of `/components` under both
   packs. A green eyeball is the weakest kind of evidence this repo has a memory about
   ([[vr-tolerance-hides-text-changes]]), so the `Children:` lines were extracted headless under both packs
   and diffed against the lines `main`'s vocabulary produces. Scratch driver only — nothing added to the
   repo.
3. **`tooling/build-checks.mjs` group 18C: "The four refusals" → "The refusals".** The comment said *four*
   above an array of *six* (pre-existing), and this PR's two entries would have made it eight. One word, so
   a count this PR doubles the error in does not ship. No behaviour change — the ✓ line's count is derived
   from the array and always was.
4. **The jobs-folder before/after SHA-256 capture** (task 11), so P10/R12's out-of-repo writes are a
   receipt rather than an expectation.
5. **The known-bad-first step in the regression probe**, after my own driver bug — see Proving the checks.

## Issues encountered

**One, and it is Deviation 4**: the plan's task-13 sequence popped a stash onto the wrong branch because
`git switch` aborted and the next command ran regardless. Fully recovered and verified; the one-command
owner follow-up is written out above. The lesson generalises past this ticket — in this shared worktree,
a `git switch` in a scripted sequence needs its exit status checked before anything that depends on it.

Everything else ran as planned. The risk register closes as follows: **R1** did not fire (69 lines of
headroom, ended 5 used); **R2 inverted** and is recorded as a plan error; **R3** handled by D1, deviation
sentence carried; **R4** accepted, named, and now *measured* (M4); **R5** closed by task 12's receipt;
**R6** closed by task 8's byte-identical `components` block; **R7** held at task 0 but **failed at task 13**
— see Deviation 4; **R8** closed by the `"version": 2` curl; **R9** closed (the ✓ line carries the clause);
**R10–R13** all held as written.

## Ready for the next step

All tasks complete, all validations pass. Ten staged paths, no `git add -A`, no dirty generated path.

Next: `piv-commit`, then `piv-create-pr` (PR body must carry **`Closes #298`** and D1's deviation
sentence), then `piv-review-pr`.
