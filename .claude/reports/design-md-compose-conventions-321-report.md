# Implementation Report — `system/DESIGN.md`, the compose agent's composition conventions (#321)

**Plan**: `.claude/plans/design-md-compose-conventions-321.md`   **Branch**: `feat/design-md-321` (worktree `../wt-321`)
**Base**: `4b59c64` → `b449bb4` (origin/main unchanged at `4b59c64` at report time; `git log HEAD..origin/main` empty)
**Status**: COMPLETE for the code, the content and the runs; Task 5.3's outward records (issue comments, #420 follow-up, PR) not yet made.

## Summary

`portal/lib/canvas-session.mjs` now reads `system/DESIGN.md` on every compose turn, before the turn's first line, refuses
it whole on any `parseDesign` problem, puts it in the system prompt under `## Conventions` between the vocabulary and
the PRD, and writes `designVersion`/`designSha` on the stats line. Build-checks group 47 gains 47.20–47.24 and a 47.14
pin. The file's content was drafted by one tool-less SDK call and approved by the owner without edits. Two paid S6
re-runs both read `clean`, and converged on **0 of 4** turns.

## Tasks completed

- 1.1–1.2 `parseDesign`, `REQUIRED_KINDS`, `DESIGN_PATH`, `readDesign`, the `design` argument, the stats fields →
  `portal/lib/canvas-session.mjs` (UPDATE; probe patch applied verbatim, `parseDesign` byte-equal to `parse.mjs.txt`)
- 1.3 47.3 update, 47.20 (early, with throw), 47.21 (eleven rows), 47.22, 47.23, 47.24, the 47.14 pin, the header
  CANNOT REACH line → `tooling/build-checks.mjs` (UPDATE)
- 2.1 drafter → `.claude/plans/design-md-321/draft.txt`, `prompt-1.txt`, `draft-1.jsonl`, `draft-1.md` (CREATE)
- 2.2 → `system/DESIGN.md` (CREATE; draft 1 plus one provenance line, "Approved without edits by the owner on 2026-10-03")
- 3.1 → `.claude/plans/canvas-spike-s6/driver-321.txt` (CREATE, copy of the probe)
- 3.2 → `raw/vocab-context-321.txt`, `raw/run-2/outline-321.txt` (CREATE)
- 4.1 → `raw/run-3/`, `raw/run-4/`, `raw/converge-3-4.txt` (CREATE)
- 4.2 → `.claude/plans/canvas-spike-s6/README.md` (UPDATE: Q4 sentence, Q6 row, per-turn rows, Setup row, Convergence
  section, Not done, Files)
- 5.1 → `docs/epics/canvas-design-import.architecture.md` (§ Stack, ~350, row B5), `CLAUDE.md` map line (UPDATE)
- 5.2 → `.claude/references/gates.md` group 47 paragraph (UPDATE)
- Plan AMENDMENTS → `.claude/plans/design-md-compose-conventions-321.md` (four plan errors, below)

## Tests added

No suite (CLAUDE.md § Testing). Group 47 cases 47.20–47.24 and the 47.14 pin; the driver's selftest at 26 rows.

## Proving the checks

Each mutation applied to the working file with the synthetic fixture as `system/DESIGN.md`, build-checks run, file
restored (`git status` showed only the two intended edits after; scratch script `reddens.mjs`). Positive control for
every row: the unmutated tree, `build ✓  all 51 groups pass`.

| check | mutation | went red with (observed) |
|---|---|---|
| 47.20 | append `` `action-bar` `` to DESIGN.md | `Error: 47.20: system/DESIGN.md has problems ["line 60: unknown part \"action-bar\""] — every compose turn below reads it, so the group stops here` |
| 47.21 row 2 | drop the template-line vocabulary check in `parseDesign` | `47.21 unknown part in a template: no problem names "hero-banner" ([])` |
| 47.21 control | row 9's search string `### error` → `### erorr` | `47.21 required kind missing: mutation did not apply` (+ the dependent "no problem names" line) |
| 47.22 | drop `"## Conventions", "", design, "", ` | `47.22: the system prompt does not carry DESIGN.md between the vocabulary and the PRD, with its version` |
| 47.23 | drop `designSha: design.sha, ` | `47.23: the stats line carries designVersion 1 and designSha undefined, not the committed file's 1 / 88a7afcf121f365b` |
| 47.14 pin | move `readDesign` below the brief line | `47.14: runComposeTurn reads DESIGN.md after the turn's first appended line …` |
| 47.24 | runtime regex `(css|mjs|js)` → `(css|mjs|js|md)` | `47.24: system/DESIGN.md matches loc-summary group(s) ["runtime"] …`; import-chain and ratify also red, as the plan warned |

Driver selftest (scratch copy, `dred.mjs`); positive control `selftest ✓ 26/26`:

| mutation | went red with (observed) |
|---|---|
| restore `\|\| first.name === 'screen-header'` on `firstChildHeading` | `selftest ✗ opens-with-header: expected y/n, got y/y` (25/26) |
| drop `v.turns.every((t) => t.filed === 1) &&` | `selftest ✗ converge-unsafe: expected threw …, got converged: 4/4 · mismatched: none` (25/26) |
| `?` treated as required in `templateOf` | `template-required: expected list, got none` and `template-ambiguous: expected ambiguous (a, b), got none` (24/26) |

The 47.21 rows other than row 2 are each their own mutation with a "mutation did not apply" guard; the control row
above proves that guard fires.

## Validation results

All observed on `b449bb4` unless marked.

| command | result |
|---|---|
| `node --check` on both edited `.mjs` | clean |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · token-css · … · group-count` |
| `node tooling/token-lint.mjs` | `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node tooling/build-checks.mjs` | `build ✓  all 51 groups pass` |
| Task 1.1 VALIDATE on the fixture | `1 list,detail,form,empty,error 7 []` |
| Task 1.1 VALIDATE on `draft-1.md` | `1 list,detail,form,empty,error,confirm 23 []` |
| driver `--selftest` / `--preflight` | `selftest ✓ 26/26` / `preflight ✓ 7/7` |
| R2 receipt `vc.mjs 4d9adf6 HEAD` | `old a2bfea9494d879de 5549 chars · new 59380758647765a7 5549 chars · lines 168/168 · differing lines [1]` |
| `--reoutline raw/run-2` | 4 frames; kinds form, none, none, none; opens with `screen-header` y ×4; first child heading n ×4 |
| drafter isolation | `jq -sc 'map(.k)'` → `["prompt","init","thinking","text","stats"]`; init `tools: []`, `mcpServers: []`, `skills: []`; no `denied`/`tool_use`; `isError: false`; dry and paid prompt sha16 both `bc4ffb4cffc4245a` |
| run 3 | `verdict: clean · fork picked-one · $0.5162`; designVersion 1, designSha `608f6c393d6ffd39`, auth `subscription`, fingerprint `c903170484396973` |
| run 4 | `verdict: clean · fork picked-one · $0.3966`; same version/sha/auth/fingerprint |
| `--converge run-3 run-4` | `converged: 0/4 · mismatched: turn-1, turn-2, turn-3, fork` |
| system prompt chars | 49 259 observed (`.systemPromptChars`) = 44 203 + 5 038 (DESIGN.md) + 18 (derived) |
| `node tooling/canvas-journey.mjs chromium` | `chromium: 259 passed, 0 failed` |
| portal smoke (free port 65386, killed own PID) | `{"ok":true,…,"headSha":"b449bb4…","stale":false}` |
| leakage grep on the drafter prompt (`run-2\|outline\|faster\|payment\|stripe\|canvas-spike`) | no hits |

**Spend (observed)**: drafter $0.5713; run 3 $0.5162; run 4 $0.3966; total $1.4841. Plan expected $0.64–1.04.

## Not run

- Task 5.3: comments on #321 and #295, the #420 follow-up ticket ("canvas compositions as a judge input + DESIGN.md
  templates as predicates"), the PR with `Closes #321`. Outward-facing; next step (`piv-create-pr`).
- CI verify and CodeQL: run on the PR, not locally.
- Confirming the Stripe talk's source, and a recorded reason for "Open it": owner's hand (plan table), stay open on #321.

## Deviations from the plan

- **`--budget 1.60` for run 4, not `1.30`.** Run 3 cost $0.5162 against the planned $0.28–0.40, leaving $0.503 under
  the cap. The cap is checked before each turn, so it could have cut run 4's fork turn and left the convergence table
  unusable. The owner chose to raise it (O1). Run 4 cost $0.3966; spent across `raw/run-*` is $1.1935.
- **Task 2.1 steps 4 and VALIDATE (plan error)**: `--dry` writes `prompt.txt`, not `prompt-1.txt`, and the transcript's
  first line is `k:"prompt"`, so `head -1 | jq .tools` prints `null`. Checked with `select(.k=="init")` instead, and
  asserted dry and paid prompt hashes equal; `prompt.txt` deleted. Logged under AMENDMENTS.
- **Drafter cost (plan error)**: $0.5713, not ~$0.08. Sonnet output 24 244 tokens (thinking) $0.4510; CLI side calls on
  Haiku 4.5 $0.0142 and Opus 4.5 $0.1061 (`draft-1.jsonl` stats `.modelUsage`). Logged under AMENDMENTS.
- **Task 5.1 VALIDATE (plan error)**: the CLAUDE.md map line sits under `system/` without the prefix, like every map
  line, so the `grep "system/DESIGN.md"` count is 1, not 2 or more. Logged under AMENDMENTS.
- **Task 4.2 VALIDATE**: `grep -c "run-3\|run-4"` counts lines and returns 3; the README's table rows are single long
  lines. Occurrences: 9 (`grep -o … | wc -l`).

## Assumptions carried

- Q2: "drafted with an unbiased agent" read as a tool-less draft the owner edits and approves; the owner approved
  without edits, so the provenance line says so.
- Kind comes from the driver's matcher only, never the agent's own words (the Q6 row reports both where they differ).
- No third run after the 0/4 mismatch (plan stop rule).

## Additions beyond the plan

- The `group()` string for group 47 gains a `CANNOT REACH (#321)` clause. The probe patch added only the positive
  clause; the plan asked for "the matching clause" alongside the header's CANNOT REACH line, and the three-copy rule
  (memory `gate-prose-has-three-copies`) wants all three carrying it.
- README Q6 records two observations beyond the plan's listed fields, both copied from raw files: run 4's replies
  name a template on three turns where run 3's name none, and in 3 of the 5 `none` screens the extra part is a
  `modal-dialog`, which DESIGN.md's States section tells the agent to place hidden in the base screen and which only
  the `confirm` template lists. No recommendation is drawn; the read is the owner's.

## Issues encountered

- Run 4 turn 2's first call was refused by the applier (`composition.children[2].children: must be an array when
  present`) and the corrected call filed (`corrections: 1`, `numTurns: 3`). Classified `clean` by S6's rules.
- The shared checkout was on another session's branch with untracked work; all work was done in worktree `../wt-321`,
  with the plan and probe dir copied in from the shared tree's untracked files.
