# Implementation Report — S2: Blueprint auto-layout → `stack`

**Plan**: `.claude/plans/canvas-spike-s2-blueprint-stack-299.md`
**Branch**: `feature/canvas-spike-s2-blueprint-stack-299`
**Base**: `2e6aabd` → `2e6aabd` (`origin/main` unchanged across the run; re-fetched at 16:26, no merge needed)
**Status**: COMPLETE — except AC #3, which is the owner's call to post (see **Not run**)

## Summary

Wrote the Brilliant→IR converter's layout branch as a pure, import-free ESM module and ran it over both
committed blueprint reads. Every spacing role the contract carries maps by role — 20 of 24 values on the
master, 5 of 7 on the instance — but 6 values could not map at all (all `$spacing.none`) and one literal
the prop set cannot carry appeared (`s(360,hug)` on two component roots). **The decision rule's second leg
fired**, and its instruction is carried out: the token the contract lacks is named exactly
(`--spacing-none: 0`), every unmappable value is dropped visibly, and no `tokens.source.json` edit was
made. T3 should still proceed as written, but as this spike's judgement with a condition — `ds-stack`'s
CSS block must declare no default `gap` and no default `padding` — not as leg 1's automatic consequence.
Q2b is neither settled nor reopened by this run, and the README says so explicitly rather than inheriting
leg 1's "stays closed".

## Tasks completed

- create the spike directory + read the inputs in full → `.claude/plans/canvas-spike-s2/raw/` (CREATE)
- the layout branch → `.claude/plans/canvas-spike-s2/layout-branch.txt` (CREATE)
- the driver → `.claude/plans/canvas-spike-s2/driver.txt` (CREATE)
- the control battery (`--controls`) → same file (UPDATE)
- run over both fixtures → `raw/instance.txt`, `raw/master.txt` (CREATE)
- cross-check every mapping row against `04-htmlflex.html` → the README's three-shape section (CREATE)
- the verdict → `.claude/plans/canvas-spike-s2/README.md` (CREATE)
- `raw/controls.txt` + `raw/mutations.source.txt` (CREATE)
- plan AMENDMENTS → `.claude/plans/canvas-spike-s2-blueprint-stack-299.md` (UPDATE)

## Tests added

No framework — the control battery is the test suite (CLAUDE.md §Ground rules: no suite, no linter).
`node driver.mjs --controls`: **6 controls + 5 positive controls, all PASS, exit 0** (observed,
`raw/controls.txt` half 1).

| id | asserts |
|---|---|
| C1 | an unmapped role (`13:$spacing.snug`) lands in `drops[]` with `slot === "gap"` |
| C2 | `$spacing.none` produces a drop record **and** `layout.pad === null` — the discriminating check |
| C3 | `12:$spacing.md` → `--spacing-md`, 16px, distance **4** (contract − source) |
| C4 | `split(args(line,"al"))` returns 4 args and `parseAl(...).pad` returns 4 entries |
| C5 | `24:$spacing.md` maps by **role** to `--spacing-md` at −8px, not by value to `--spacing-lg` |
| C6 | `s(fill,hug:100)` → `size.h === "hug"` plus one `qualifier-dropped` row carrying `value: 100` |
| PC1 | a mappable role gives 0 drops and 1 emitted row |
| PC2 | a fully mappable node emits four pad sides and both align axes, 0 drops |
| PC3 | the axis swap: the same `x(c),y(s)` gives `{main:center,cross:start}` under `h` and the reverse under `v` |
| PC4 | an unterminated `al(` throws a plain `Error` naming the line |
| PC5 | `args()` does not match the `g(` inside `svg(` |

## Proving the checks

Every mutation applied by `raw/mutations.source.txt` (a scratchpad harness: mutate → re-run → restore). Its
own control is that it prints `MUTATION DID NOT APPLY` for a no-op replacement — `grep -c` → **0**, so all
six landed. Both halves are in `raw/controls.txt` verbatim.

| control | mutation applied | the case that went red (observed) | positive control |
|---|---|---|---|
| C1 | delete the `drops.push` branch in `toStack`'s spacing helper | `C1 FAIL — expected 1 drop, got 0 :: slot=undefined` | PC1 PASS |
| C2 | the same deletion scoped to the pad path | `C2 FAIL — $spacing.none drops=0 (expected 1)` — `layout.pad` stays `null`, so the IR is byte-identical to the correct one and **only the drop record distinguishes them** | PC2 PASS |
| C3 | hardcode `distance: 0` in `mapSpacing` | `C3 FAIL — expected distance 4, got 0` (C5 collateral: `expected -8, got 0`) | C3's own green row: `12:$spacing.md` → 16px, +4px |
| C4 | `split(s)` → `s.split(",")` | `C4 FAIL — expected 4 al args, got 7 :: parseAl threw: unterminated pad(` (PC2 collateral) | the real 4-value `pad()` parses to 4 on every fixture node |
| C5 | role lookup → nearest-value search over `SPACING` | `C5 FAIL — expected --spacing-md, got --spacing-lg`; collateral `C1`, `C2`, `C3` red, and `C2`'s `layout.pad` becomes `[--spacing-xs ×4]` — **by-value invents 4px of padding where the designer set 0 and reports 0 drops** | by-role on `24:$spacing.md` gives `--spacing-md` at −8px; the sign self-checks |
| C6 | `parseSize` keeps the raw `hug:100` on the axis | `C6 FAIL — size.h="hug:100" (expected "hug") :: qualifier drops=0 (expected 1)` | `s(fill,hug:100)` → `"hug"` + one recorded qualifier |

**Driver-honesty check** (memory `check-that-cannot-fail`, and "a driver can lie"): the parser's own count
line is cross-checked against an **independent** `grep -o '\$spacing\.[a-z]*' | sort | uniq -c` over the
same file, derived without the branch. Both agree exactly — instance `7 values / 5 mapped / 2 unmapped`
against `none 2 · sm 2 · xs 3`; master `24 / 20 / 4` against `md 6 · none 4 · sm 8 · xs 6` (observed).

## Validation results

| level | command | result |
|---|---|---|
| 1 | `node --check "$SCRATCH/layout-branch.mjs" && node --check "$SCRATCH/driver.mjs"` | **exit 0**, no output (observed) |
| 2 | `node "$SCRATCH/driver.mjs" --controls` | **ALL GREEN**, exit 0 — 6 + 5 (observed) |
| 2 | each REDDENS mutation applied, re-run, reverted | each control's own named case **FAIL** (observed, table above) |
| 3 | `node "$SCRATCH/driver.mjs" .../03-blueprint.txt` | `2 nodes . 7 spacing values . 5 mapped . 2 unmapped` (observed) |
| 3 | `node "$SCRATCH/driver.mjs" .../03c-master-blueprint.txt` | `6 nodes . 24 spacing values . 20 mapped . 4 unmapped`; `drops by kind: literal-size=2 . no-token=4` (observed) |
| 3 | `grep -c 'al:' raw/instance.txt` / `raw/master.txt` | **2** / **6** — both match the plan's GOTCHA 2 (observed) |
| 4 | manual cross-check against `04-htmlflex.html` | all three `al()` shapes confirmed whole, including the two absences (no `padding` on the text block, no `gap` on the chip) and the missing `justify-content` on the root (observed) |
| 5 | `node tooling/drift-check.mjs` | **`drift-check ✓`, exit 0, 8.0 s** (observed; the plan's P6 baseline recorded 23.0 s on a different run — both green) |
| 5 | `git diff --stat -- system/ agent-layer/ tooling/ handoff/` | **empty** (observed) |
| — | `grep -c '^## ' README.md` | **10** (≥ 6 required, observed) |
| — | the ≥2-occurrence provenance loop over `instance`/`master`/`controls` | **no output** = every `raw/` file is cited in a data row, not only in the Files table (observed) |

Key derived figures, with their arithmetic:

- **20 of 24 master values mapped** = 6 `md` + 8 `sm` + 6 `xs`; **4 unmapped** = 4 `none`. Derived from
  `raw/master.txt`, matching the independent grep.
- **6 of 20 mapped master values shift by +4px** = the six `$spacing.md` (12 → 16). The other 14 are +0px
  (`sm` 8→8, `xs` 4→4). Derived.
- **0 of 5 instance values shift** — the instance read contains no `$spacing.md` at all (observed; this is
  the read-path finding, not a parser artefact).

## Not run

- **AC #3 — posting the S2 verdict comment on epic #295.** Outward-facing, and the plan's paid/owner-only
  table requires the owner's confirmation first (GOTCHA 2). Not run pending that confirmation; it does not
  block the PR, which merges on the README. Tracker: **owner's call** — a follow-up issue should be opened
  if it is deferred rather than posted.
- **`build-checks`, the five journey drivers, the pixel gate, `vt-verify`.** Not run, and **not skipped for
  time**: this ticket touches no `system/` file, no shipped page and no generated artifact, so none of them
  can reach it (`.claude/references/gates.md`). `node tooling/drift-check.mjs` is the gate that can, and it
  is green.
- **`gen-loc-summary` / `gen-param-count` regeneration.** REGENERATES is `none` on every task:
  `.claude/plans/` matches none of `gen-loc-summary.mjs:22-26`'s three group regexes (verified by reading
  them; the green drift-check independently confirms no drift).

## Deviations from the plan

- **D1 `(plan error, A3)` — `drops[]` carries three kinds, not two.** The plan specifies
  `"no-token" | "qualifier-dropped"`. `s(360,hug)` on master lines 3 and 11 has no `ref` and no token to
  look for, so a third kind `literal-size` was added and is printed by the run. Without it, AC #1's "every
  literal that could not map" would rest on README prose rather than on the run's own output.
- **D2 `(plan error, A4)` — C4 asserts the argument count separately.** The plan's REDDENS mutation makes
  `parseAl` throw before it can report a count, so a control reading only `parseAl`'s return would crash
  instead of printing the predicted line. C4 now asserts `split(args(line,"al")).length` first, and every
  control is wrapped so a throw reports as a FAIL rather than killing the other ten. The plan's predicted
  `expected 4 al args, got 7` is exactly what the mutation prints.
- **D3 `(plan error, A5)` — `args()` gained a boundary test.** The plan's verbatim `indexOf(head + "(")`
  matches the `g(` inside `svg(icon:caret-right)`, which is on four fixture lines. `args()` now requires
  start-of-string, space, tab, comma or `(` before the head; PC5 asserts it.
- **D4 — a drop is recorded once per source ATOM, not per expanded pad side.** Consequence of plan error
  A1 (the 1-value `pad()` form is in the read, which the plan says it is not). Recording four drops for one
  `pad(0:$spacing.none)` would have made the unmapped count contradict the plan's own P2 grep. The IR still
  expands to four sides.
- **D5 — `distance` prints always-signed, `+0px` rather than `0px`.** The plan's example shows `0px`; its
  stated reason is that a computed zero and a never-computed value must not look alike. An always-signed
  number against `--` for absent is the stronger reading of the same requirement.
- **D6 — the README's Not-done bullet about `pad()` arity was rewritten** rather than copied from the plan,
  because the plan's version is false for the 1-value form (A1). It now records that the 1-value expansion
  rule is asserted from CSS convention and **unconfirmed by this fixture**, whose only 1-value pad is zero.

## Assumptions carried

- **A1 from the plan — both fixtures are in scope**, `03-blueprint.txt` primary. Taken as the plan
  sanctions, and the discrepancy is reported as a read-path finding for #304 rather than as a fixture bug.
- **A2 — the branch was not pre-decided.** The verdict follows the run; the pre-flight facts were treated
  as inputs. No pre-flight expectation was contradicted by the run.
- **Q1 is answered with its condition, not resolved for all time** — the plan's stated preference. The
  README names two tripwires that would flip it.
- **The `align` slot's `{main, cross}` shape is the spike's call**, as the plan specifies, and is written
  down in the branch's header because the architecture names the slot but not its contents.
- **`s`/`e` → `start`/`end` implemented and marked untested**; `space-between` is in the IR value set with
  no implementation and no known source letter, and is named as such in Not done.

## Additions beyond the plan

- **C6 and PC1–PC5** — the plan names five controls. C6 exists because plan error A2 means no fixture node
  exercises `hug:N`, so without it that mapping would be a specified-but-unexercised pass, which the plan's
  own GOTCHA 2 forbids. PC1–PC5 are the positive controls the skill requires one of per check.
- **`raw/mutations.source.txt`** — the mutation harness, saved for reproducibility, following S1's
  `.source.txt` precedent for probe sources.
- **`nodeName(line)`** — a small export used only for the driver's row headings, documented as not part of
  the IR.

## Issues encountered

- The plan's pre-flight figures (P1–P4, P7–P10) were all re-verified before implementation and **all
  held**: `al()` counts 2/6, the spacing grep counts, `$spacing.md` = 12 vs contract 16, no `spacing-none`
  or `radius-full` anywhere, `import/` absent, and all three `04-htmlflex.html` anchors. The four plan
  errors above are in the plan's *task specifications*, not in its pre-flight.
- `git status --short` carries five pre-existing untracked files from other sessions
  (`__*.txt`, `__mock_discoveries.md`, `__run0_discovery_worksheet.md`,
  `.claude/plans/proposals-from-a-discovery-package-ticket.md`) plus a `.html` render of this plan. None
  are this ticket's; staging was by explicit path.
