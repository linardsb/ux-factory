# Implementation Report — the run package → PRD projection (#290)

**Plan**: `.claude/plans/discovery-prd-projection-290.md`   **Branch**: `feat/290-prd-projection`   **Status**: COMPLETE

## Summary

`discovery/prd-projection.mjs` folds a run package into `prd.md` in the house PRD shape. It is two halves:
a pure `projectPrd({ run, answers, ops })` with no filesystem, clock, network or SDK, and a thin
filesystem shell (`readPackage` / `writePrd` / a CLI) that refuses to overwrite an existing `prd.md`
without `--force`. Eleven sections dispatch off a frozen `SECTIONS` table keyed on two axes — the BABOK
rung for decisions, the op verb for the other three records — so a decision renders exactly once and the
cross-referencing sections name it by `seq`. `build-checks` group 31 drives the pure half over an
in-memory, hand-authored, explicitly-labelled gate fixture whose *records* come from running the real
applier.

## Tasks completed

- 0 pre-flight → `main` at `8b6ee61` (PR #339), no open PRs, group 31 free, `prd-projection` grep empty
- 1–7 the pure core → `discovery/prd-projection.mjs` (CREATE): header · `SECTIONS` · `METRIC_STAGE` ·
  `NON_GOAL_QUESTIONS` · `checkOpLines` · the resolvers · the decision index and supersede read ·
  `renderDecision` · the eleven renderers · `projectPrd`
- 8 the filesystem shell and CLI → same file (`readPackage`, `writePrd`, the `pathToFileURL` guard,
  `<slug>` / `--root` / `--stdout` / `--force`)
- 9–15 the gate → `tooling/build-checks.mjs` (UPDATE): header index entry, the import, group 31 cases
  31.1–31.13, the closing `group("prd projection", …)` line, and `all 30 groups pass` → `31`
- 16 → `discovery/README.md` (UPDATE): the honesty bullet, the Files line, a new `## The PRD projection`
  section, the Workflow command
- 17 → `docs/epics/discovery-partner.architecture.md` (UPDATE): §Open questions' *"Where the PRD
  projection lives"* marked `[x]` with the loc-summary reasoning; §Data model's *"Placement at slicing"*
  replaced with the decided path
- 18 → `CLAUDE.md` (UPDATE): one index clause on the `discovery/` line
- 19–20 manual validation and the commit

## Tests added

No test suite exists in this repo (CLAUDE.md §Ground rules). The unit-equivalent is **`build-checks`
group 31**, thirteen cases over an in-memory fixture:

| Case | What it drives |
|---|---|
| 31.1 | `SECTIONS` frozen at both levels by mutation; exact key set; eleven **distinct** declared `empty` strings |
| 31.2 | `SECTIONS` × `LEVELS` and `SECTIONS` × `OPS`, both directions; `NON_GOAL_QUESTIONS` and `METRIC_STAGE` resolved through the bank |
| 31.3 | positive control: one `## ` heading per row in table order, the honesty header, the placeholder |
| 31.4 | every record's distinguishing claim present, iterated over the records; nothing truncated |
| 31.5 | both flags inline in the record's own block, then **proven read** by blanking `flagged` |
| 31.6 | the hierarchy's rungs, parent seqs, orphan marker and counts line; the supersede read |
| 31.7 | **the vanishing claim** — per-rung deletion vs each row's own `empty`, the empty-ops projection, the transition note both directions |
| 31.8 | `weakAnswer` / `note` / `provenanceNote` absent, with `text` / `attribution` / `label` as the positive control |
| 31.9 | hostile answer text inert; a pipe inside an applier-accepted URL adds no table column |
| 31.10 | byte-identical determinism; every ISO date pinned to `run.json`'s; purity by JSON compare |
| 31.11 | 27 corrupted-ledger refusals (incl. a real `text` and a real `denied` line), all four cross-references refused by KIND with a dangling one of each tolerated, twelve junk inputs, the unresolvable-ref marker |
| 31.12 | five `run.json` fields stripped in turn, `undefined` never on the page, with a positive control |
| 31.13 | **an op param cannot add a section** — a `## ` / `#### ` / `- ` payload in every string-ish param and every `run.json` string field, over all three of CommonMark's line endings, plus the answer half through `blockquote()` |

**The gate was proven able to fail** — four mutations of the module, each reverted:

| Mutation | Result |
|---|---|
| `renderDecision` re-derives the orphan flag instead of reading `flagged` | `prd projection ✗  1 failure` (31.5) |
| `questionLine` leaks the bank's `weakAnswer` | `prd projection ✗  7 failures` (31.8) |
| a `new Date().toISOString()` line added to the page | `prd projection ✗  2 failures` (31.10) |
| Problem renders every decision rather than the business rung | `prd projection ✗  1 failure` (31.7.1) |

After each revert: `build ✓  all 31 groups pass`.

## Validation results

| Command | Result |
|---|---|
| `node --check discovery/prd-projection.mjs` · `node --check tooling/build-checks.mjs` | ✅ clean |
| `node tooling/build-checks.mjs` | ✅ `build prd projection ✓` … `build ✓  all 31 groups pass` |
| `node tooling/drift-check.mjs` (on the **tracked** tree, after `git add`) | ✅ green, **nothing new listed** — the projection adds no drift-checked artifact |
| `node agent-layer/gen-loc-summary.mjs --check` (tracked) | ✅ `loc summary ✓  3 groups — no drift` — the module header's and architecture doc's claim that `discovery/` matches no loc group is **observed**, not inherited |
| `node discovery/prd-projection.mjs spine-meridian-1 --stdout` | ✅ 94 lines, matches the plan's oracle exactly (below) |
| `--stdout \| diff - <(--stdout)` | ✅ empty — deterministic against a real package |
| `node discovery/prd-projection.mjs no-such-slug` | ✅ `prd ✗ …/discovery/no-such-slug/run.json — that is not a run package`, `exit=1` |
| the `mktemp -d` write cycle | ✅ write → refuse → hand-edit → `--force` → `grep -c 'a human edit'` = **0** → diff vs `--stdout` empty |
| `node -e "import('./discovery/ops.mjs')"` · `bank.mjs` | ✅ `ops ✓` · `bank ✓` |
| `cd portal && node -e "import('./lib/discovery.mjs')"` | ✅ `portal graph still loads` |
| `git status --short discovery/spine-meridian-1/` | ✅ empty — no `prd.md` committed into the real package |

**The refusal message** (R13's documentation, read as instructed):

```
prd ✗  prd-projection: <path>/prd.md already exists. It is generated and then HAND-EDITED, so
re-running refuses to overwrite it. Pass --force to regenerate — that DISCARDS every hand edit in the file.
```

### The oracle: `--stdout` against `discovery/spine-meridian-1/`

Every line of the plan's task 19 step 2 prediction holds: Problem · Target user and JTBD · Hypothesis ·
Open questions are `TBD`; Evidence's **table** is `TBD` with its always-line naming seq 1 and seq 3;
Transition note is `**n/a**` with its derived reason; MVP is two decision blocks each carrying
`⚠ orphan` and `⚠ no-evidence`; Weak answers is one block with three `missing[]` bullets; Non-goals
cross-references seq 3 only; Success metrics is an empty stage-7 table plus a two-row kill-criteria
table; the hierarchy counts read `business 0 · stakeholder 0 · solution 2 · transition 0 · orphans 2`.
The transcript's `denied` line was skipped, as required.

<details>
<summary>The full projection (94 lines)</summary>

```markdown
# spine-meridian-1 — PRD, projected from a discovery run

> **Projected, not authored.** Every claim below folds one run package — [`discovery/spine-meridian-1`](./): `run.json`, `answers.jsonl`, and the `op` lines of `transcript.jsonl` — and nothing else. Generated by `discovery/prd-projection.mjs` (epic #279, #290). A claim the ops do not carry cannot appear here. **Edit freely: nothing regenerates this file, and re-running the projection refuses to overwrite it.**

**Run** — `spine-meridian-1` · fictional (Real run — fictional scenario) · entry blank-idea · depth scope-check · branch none · front end portal · model claude-sonnet-5 · posture think · started 2026-08-29T08:25:39.262Z · ended 2026-08-29T08:27:10.122Z · 3 turn(s)

**Ledger** (whole ledger, superseded records included) — 3 op(s): record_decision 2 · flag_weak_answer 1 · open_question 0 · file_evidence 0 · flags: no-evidence 2 · orphan 2

## Problem

_TBD — the run recorded no business-level decision._

## Evidence

_TBD — the run filed no evidence._

Decisions resting on no evidence: seq 1, seq 3.

## Hypothesis

_TBD — the run recorded no business- or stakeholder-level decision to falsify._

## Target user and JTBD

_TBD — the run recorded no stakeholder-level decision._

## MVP

#### seq 1 · `s4-appetite` — solution

> Small batch: two weeks, one designer and one engineer. Away mode is not a redesign of Verdant, it sits inside the plant record and the daily check-in that already exist. The number comes first: if the whole thing does not fit in two weeks we drop the hand-over-to-a-friend half and ship only pause-and-catch-up, where due dates shift by the days away and come back as a single catch-up list. If even that does not fit, the idea is not worth a cycle and we park it.

*Question:* "Is this something worth a quick fix if we can manage? Is it a big idea worth an entire cycle? Would we redesign what we already have to accommodate it?" — Shape Up, Set boundaries, verbatim · OBSERVED (stage 4)
*Wrong if:* The pause-and-catch-up scope alone does not fit within two weeks of one designer and one engineer, but it ships anyway instead of being parked.
*Parent:* none · ⚠ **orphan** — a solution decision naming no stakeholder requirement
*Evidence:* none · ⚠ **no-evidence**

#### seq 3 · `s4-out-of-bounds` — solution

> Out of bounds: no hardware or moisture sensors, ever. No shared accounts for the friend who waters while Rita is away, at most a one-off link that expires when she is back, and no push notifications to that friend. No change to the watering-rhythm model itself, away mode only shifts due dates by the days away and marks them deferred, it does not recompute rhythms from the gap. No calendar sync and no iOS widget. If the friend link turns out to need an account we cut the friend half rather than build accounts.

*Question:* "What are we declaring out of bounds?" — Shape Up's no-gos · OBSERVED (stage 4)
*Wrong if:* Work goes into hardware/moisture sensors, shared accounts, push notifications to the friend, calendar sync, an iOS widget, or recomputing the watering-rhythm model, within this cycle.
*Parent:* none · ⚠ **orphan** — a solution decision naming no stakeholder requirement
*Evidence:* none · ⚠ **no-evidence**

## Success metrics

_No decision was recorded against a stage 7 (Measurement and kill criteria) question._

Every decision's kill criterion, by seq:

| seq | Level | Kill criterion |
|---|---|---|
| 1 | solution | The pause-and-catch-up scope alone does not fit within two weeks of one designer and one engineer, but it ships anyway instead of being parked. |
| 3 | solution | Work goes into hardware/moisture sensors, shared accounts, push notifications to the friend, calendar sync, an iOS widget, or recomputing the watering-rhythm model, within this cycle. |

## Non-goals

- seq 3 — What are we declaring out of bounds? (see MVP)

## Open questions

_TBD — the run parked no question._

## Weak answers

#### seq 2 · `s4-rabbit-holes`

*Question:* "Does this require new technical work we've never done before? Are we making assumptions about how the parts fit together? Are we assuming a design solution exists that we couldn't come up with ourselves? Is there a hard decision we should settle in advance so it doesn't trip up the team?" — Shape Up, Risks and rabbit holes, verbatim · OBSERVED (stage 4)

> Nothing new really. It is mostly shifting reminder dates and a bit of copy, and the team has built reminders before, so I do not expect surprises. Whatever comes up we can sort out as we go.

*Missing:*
- examination of how the parts (reminder dates, catch-up list, hand-over) fit together
- any hard decision named to settle in advance
- acknowledgement or ruling-out of a design solution being assumed

## Transition note

**n/a** — the run recorded no transition-level decision, so no organisational change was elicited. Transition requirements are implementation needs — data migration, training materials, support setup, business continuity (docs/research/requirements-hierarchy.md). Mark this section n/a with a reason, or run the questions that would elicit them.

## Requirement hierarchy

- **business** — 0
- **stakeholder** — 0
- **solution** — 2
  - seq 1 `s4-appetite` — parent: none · ⚠ orphan
  - seq 3 `s4-out-of-bounds` — parent: none · ⚠ orphan
- **transition** — 0

business 0 · stakeholder 0 · solution 2 · transition 0 · orphans 2

Architecture: _TBD — see plan-architecture_
```

</details>

## Risk register walk

| Risk | Closed by | Status |
|---|---|---|
| R1 a claim reaches the PRD that no op carries | case 31.7 (three mutations) | ✅ gated |
| R2 the projection re-derives a flag and drifts | case 31.5 (blank `flagged`) | ✅ gated, **mutation-proven red** |
| R3 a verbatim answer truncated | case 31.4 (every `missing[]` entry + the longest answer) | ✅ gated |
| R4 the bank's rubric or commentary leaks | case 31.8 with its positive control | ✅ gated, **mutation-proven red** |
| R5 a clock creeps in | case 31.10 + task 19 steps 3 and 5 against a REAL package | ✅ gated, **mutation-proven red** |
| R6 `undefined` on the page | case 31.12 (five fields stripped) | ✅ gated |
| R7 a verbatim answer breaks the markdown | case 31.9 | ✅ gated |
| R8 a corrupted or mis-filtered ledger folds silently | case 31.11 (18 refusals incl. `text` + `denied`) | ✅ gated |
| R9 a section silently empties after a bank edit | case 31.2 | ✅ gated |
| R10 a fifth op verb or rung with no renderer | case 31.2, both directions | ✅ gated |
| R11 a bespoke empty state special-cased in the gate | cases 31.1 + 31.7.1 (`empty` is a row field) | ✅ gated |
| R12 an invariant stated in two places | `manual` — task 16's re-read, done | ⚠️ see Issues |
| R13 `prd.md` clobbers a human's edits | `manual` — task 19 step 5, run in full | ✅ run |
| R14 a `prd.md` committed into `spine-meridian-1/` | `manual` — `git status --short` | ✅ clean |
| R15 group 31 already taken, or `main` moved | task 0 pre-flight | ✅ 31 free, branched from the new head |

**Note on the drift run.** `gen-loc-summary` counts `git ls-files`, so a `--check` against an *untracked*
new module is a false "no drift". The two rows above were re-run after `git add discovery/prd-projection.mjs`,
which is the only reading that matches what CI `verify` will do.

## Deviations from the plan

1. **`METRIC_STAGE` is exported and imported into the gate.** The plan's task 9 import line named only
   `checkOpLines, NON_GOAL_QUESTIONS, projectPrd, SECTIONS`, but case 31.2 asserts
   `STAGES.some(s => s.n === METRIC_STAGE)`. The const had to cross the module boundary.
2. **The module imports `STAGES` from `bank.mjs` as well as `questionById`.** The metrics section's
   `empty` string names stage 7 *by its label*; deriving that label from `STAGES` rather than typing
   "Measurement and kill criteria" means a bank relabel propagates instead of silently going stale.
3. **`tbd` / `cell` / `blockquote` are declared above `SECTIONS`, not in task 3's position.** The table's
   `empty` strings call `tbd()` at module evaluation, so a `const` arrow declared later is in its
   temporal dead zone and the module throws on import.
4. **Evidence's `empty` replaces the TABLE only.** Task 6 specifies both an `empty` state *and* an
   always-rendered "Decisions resting on no evidence" line; those are only reconcilable if the declared
   `empty` substitutes for the table rather than for the section. Recorded in the row's own `why`. No
   conflict with case 31.7.1, which loops `ladder` rows.
5. **`renderDecision` tolerates a dangling `parent_id`.** Case 31.7.1 deletes a rung wholesale, which
   leaves the rung below naming a `seq` no longer in the records. A missing parent renders
   `*Parent:* seq N — not in this ledger`; without that, R6's `undefined` assertion would have fired in
   the wrong case.
6. **Case 31.9's table vector is a pipe inside a URL, not inside an answer.** Human text has no route to
   a table cell by construction — `file_evidence`'s `url` is applier-validated `^https?://` and `ref`
   resolves to a *ref string*. The applier only prefix-checks, so `https://…?cols=plot|holder|slot` is
   legal and is the one thing that can reach the Source cell. That is the fixture's vector.
7. **`checkOpLines` runs its op-roster check first**, so a `text` or `denied` line is refused naming its
   `type` rather than falling through to a confusing message about a `seq` it never had.
8. **`renderDecision` carries a catch-all `*Flags:*` line** for any future `FLAGS` member the two
   specific inline markers do not cover, so a fifth flag can never be silently dropped from its record.
9. **Case 31.11 drives 27 refusals, not the plan's eleven-plus-two.** The extra cases are a
   non-integer `seq`, a non-array `flagged`, a string `supersedes`, a non-object line, a non-array
   ledger and the four `supersedes` cross-reference rules added in review round 3 — each a distinct
   branch in `checkOpLines` that would otherwise be unexercised.

## Issues encountered

- **One CLI parsing bug, caught by task 8's own VALIDATE step and fixed.** `argv.find((a, i) => …
  i !== rootAt + 1)` excluded index 0 whenever `--root` was absent (`rootAt` is `-1`, so `rootAt + 1`
  is `0`), which swallowed the slug positional. Guarded on `rootAt !== -1`.
- **R12, honestly**: the "generated then hand-edited, hence outside `drift-check`, hence `--force`" fact
  now appears in both the module header and `discovery/README.md`'s honesty bullet — the plan's task 1
  and task 16 each instruct it. It is the same shape as `ops.mjs`'s existing pair (header invariant 3
  "ABSENT IS REFUSED, EMPTY IS FLAGGED" and README §Refuse versus flag), i.e. the header is the module's
  specification and the README is the format contract for an operator, so I left it as the repo's
  established pattern rather than deviating. Flagging it so a reviewer can decide. The **placement**
  reasoning, the section table and the CLI live in one place each, as R12 requires.
- **Pre-existing.** Three were listed here as "noted, not fixed"; review rounds 2 and 3 closed two of
  them inside this PR — `CLAUDE.md:148` now names group 29's `VALID_FOR` fixture and group 31's
  section home, and `build-checks.mjs:4` now says "Thirty-one groups". **Still open:** group 29's
  internal case comments are numbered `28.x` (9 of them). That one predates this ticket and stays
  out of scope.
- `.claude/plans/discovery-prd-projection-290.html` and four sibling `.html` plan renders are untracked
  in this shared worktree from other sessions. Not staged — this PR stages only the plan's named paths.
