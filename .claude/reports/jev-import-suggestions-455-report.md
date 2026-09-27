# Implementation Report — Jev suggestions for design-import nodes the matcher cannot name (#455)

**Plan**: `.claude/plans/jev-import-suggestions-455.md`   **Branch**: `feat/jev-import-suggest-455` (worktree `wt-plan-455`)   **Base**: `f4f5229` → `f4f5229` (`origin/main` did not move; checked with `git fetch` before the report)   **Status**: COMPLETE (the owner's labels are tracked in #471; see Not run)

## Summary
When the matcher cannot name a node (`via` is `floor` or `structural-fallback`), `portal/lib/import-suggest.mjs` asks Jev one Choice question about it. There is one node per request and at most 4 requests in flight. The top 3 go into a new optional `suggestions` field of the import record, beside the verdict. The routes turn it on and the canvas journey turns it off. It fails open to `[]` with the reason in the transcript. A mapping edit carries the list forward. The canvas editor shows the top 3 per unnamed row, with a Use button for any slug that has a builder. One real run over both spike C reads is committed (8 nodes). Build-checks group 46 replays it, and every one of its sections was shown to fail under mutation.

## Tasks completed
- Task 1 → `portal/lib/import-suggest.mjs` (CREATE): 14 exports, header states 8 invariants and the smoke's observed size
- Task 2 → `import/report.mjs` (UPDATE): optional `suggestions` in `buildRecord`, `checkSuggestions` in `checkRecord`, and the "Machine suggestions (Jev, unratified)" projection
- Task 3 → `portal/lib/import-run.mjs` (UPDATE): `recordFor` passes `suggestions`; `runImport` takes `suggester` (default none) and writes a `suggest` transcript line; `editMapping` carries `prior.suggestions`
- Task 4 → `portal/server.mjs` (UPDATE): `suggesterFor(prov)` gated on `UXF_IMPORT_SUGGEST !== 'off'` and `SUGGEST_PROVENANCES`; both routes pass it
- Task 5 → `tooling/canvas-journey.mjs` (UPDATE): `UXF_IMPORT_SUGGEST: "off"` on both spawns, plus a new I2 assertion
- Task 6/8 → `tooling/import-suggest.mjs` (CREATE): FREE, `--smoke`, `--run`, `--labels-template`, `--report`; exports `checkLabels`
- Task 7 → smoke run (paid); figures written into the module header
- Task 8 → `tooling/import-suggest/spike-c-run.json` and `tooling/import-suggest/labels.json` (GENERATED, committed)
- Task 9 → `portal/public/canvas-import.mjs` (UPDATE): `suggestionHint` and the status line; no CSS change
- Task 10 → the portal walk (paid), below
- Task 11 → `tooling/build-checks.mjs` (UPDATE): group 46, 13 sections; summary line now "all 46 groups pass"
- Task 12 → `.claude/references/gates.md` (UPDATE): "46 pure groups" and the Group 46 entry
- Task 13 → issue **#471** opened ("Owner labels for #455's spike C suggestions (8 nodes)", label `Jev`). The PR is the `piv-create-pr` step.
- `CLAUDE.md` (UPDATE; plan error 2): group count 45 → 46 in both places, plus two map lines

## Tests added
Build-checks group 46 `import suggest`, sections 46.1–46.13 (listed in the plan and in `gates.md`). `node tooling/build-checks.mjs` → `build ✓  all 46 groups pass` (observed).

## Jev's top 3 per unnamed node (AC #2, from the committed run; observed)
| read | path | layer | top 3 | confidence |
|---|---|---|---|---|
| instance | `ir.children[0].children[0]` | Avatar | avatar 0.96, icon 0.02, none 0.02 | 0.96 |
| instance | `ir.children[0].children[1]` | Text block | text 0.25, list-row 0.21, none 0.17 | 0.21 |
| master | `ir.children[0].children[0]` | Frame 1 | list-row 0.66, none 0.12, stack 0.08 | 0.63 |
| master | `ir.children[0].children[0].children[0]` | Avatar | avatar 0.95, icon 0.03, none 0.02 | 0.95 |
| master | `ir.children[0].children[0].children[1]` | Text block | text 0.25, stack 0.18, list-row 0.17 | 0.21 |
| master | `ir.children[0].children[1]` | Frame 2 | list-row 0.71, none 0.09, avatar 0.06 | 0.69 |
| master | `ir.children[0].children[1].children[0]` | Avatar | avatar 0.95, icon 0.03, none 0.02 | 0.95 |
| master | `ir.children[0].children[1].children[1]` | Text block | text 0.33, list-row 0.2, stack 0.15 | 0.3 |

`none` is never the top pick. It is the second pick on both master frames. The owner's labels and the agreement figures belong to #471.

## Proving the checks
Driven by the scratch harness `mutate.py`. Each row applies one mutation, runs `node tooling/build-checks.mjs`, records the named failure, and restores the file. All observed.

| Mutation | Named failure (observed) | Positive control |
|---|---|---|
| 46.1: `import "./import-run.mjs";` added to import-suggest.mjs | `46.1: import-suggest.mjs imports ["./jev.mjs","../../import/ir.mjs","./import-run.mjs"] beyond […]` | the unmutated module imports and passes |
| 46.2: `"scored"` added to `SUGGEST_VIA` | `46.2: unnamedPaths over the instance answered 8 paths […]` | all-scored verdict → 0 calls |
| 46.3: `style: n.style` added after the `stateKeys` filter (plan error 4) | `46.3: nodeState(ir.children[0].children[0]) carries style (instance)` plus a colour-leak line | the text block's state holds exactly its two texts and `dir` |
| 46.4: `stack` filtered out in `criteriaFrom` | `46.4: stack is missing from the options` | options equal vocabulary order + `none` |
| 46.5: `TEMPLATE.question` reworded | `46.5: TEMPLATE changed since spike-c-run.json was recorded — re-run` | the committed answers reparse to the committed suggestions |
| 46.6: the "not an option sent" test removed | `46.6: an answer naming avatr was accepted` | the unbroken committed answer parses first |
| 46.7: waves collapsed into one `Promise.all` | `46.7: a failing first wave made 6 calls, expected 4` | the replay makes 6 calls and 6 suggestions |
| 46.8: `recordFor` writes `top[0]` into `mapping.parts` | `46.8: the record's mapping differs with suggestions` | no-suggester record gives `[]` and a transcript line `ran: false` |
| 46.9: `checkRecord`'s scored-node refusal disabled | `46.9: a suggestion on the scored status chip was accepted` | the replayed record passes; ragged-table control fires first |
| 46.10: `suggestions: prior.suggestions` removed from `editMapping` | `46.10: an edit dropped the suggestions` | the edit writes `map: stack`, `via: mapping` |
| 46.11: `checkLabels`'s slug check disabled | `46.11: label avatr at spike-c-instance ir.children[0].children[0] is not a slug — was accepted` | an in-memory signed copy with every label `none` passes |
| 46.12: `suggester:` removed from the drop route | `46.12: /api/canvas/import/drop does not pass suggester` | none; this is a source pin by design (server.mjs cannot be imported in CI) |
| 46.12: `UXF_IMPORT_SUGGEST: "off"` removed from the journey's first spawn | `46.12: canvas-journey.mjs sets UXF_IMPORT_SUGGEST: "off" 1 times — both portal spawns, or the journey spends a real call per drop` | the journey's I2 step observed `ran: false` on all three engines |
| 46.13: the group's `pkgCopy` pointed at the committed package | `46.13: the group moved a tracked path — git status … went from …` | `discovery/faster-payment` restored with `git checkout` + `git clean`; `git status -- discovery` empty afterwards |

What the mutation runs uncovered: the first 46.2 and 46.4 runs exited 1 without printing their own failures. 46.9's break cases indexed `suggestions[0]` and crashed when the mutated replay had failed open. 46.9 now asserts 2 suggestions by name and skips its break cases otherwise. After that change both mutations redden by name (the rows above).

Drivers proven before use:
- **Walk driver**: run against a portal with `UXF_IMPORT_SUGGEST=off`. It reported "Machine suggestions: none on this record", found no Use buttons and exited 2. The records landed under the scratch `JOBS_DIR`, and `curl` of `/canvas-import.mjs` returned the worktree's new marker.
- **Paid CLI modes**: `env -u TYPESAFE_API_KEY` on `--smoke` and `--run` exited 1 with "TYPESAFE_API_KEY is not set" and wrote nothing (`tooling/import-suggest/` did not exist).

## Validation results
- Level 1 `node --check` over the 7 files: no output (observed)
- Level 2 `node tooling/build-checks.mjs`: `build ✓  all 46 groups pass` (observed; 42 `import-record` and 43 `import run` unchanged ✓)
- `node agent-layer/gen-loc-summary.mjs --check`, after staging: `loc summary ✓  3 groups — no drift` (observed)
- `node tooling/drift-check.mjs`: `drift-check ✓  syntax · … · group-count` (observed, after the `CLAUDE.md` count fix and `npm ci` in `tooling/style-dictionary`)
- Level 3 `node tooling/canvas-journey.mjs all`: exit 0; chromium 70 passed, firefox 69 passed, webkit 69 passed, 0 failed (chromium's extra step is the pre-existing chromium-only `5b · FORCED fallback (chromium, CSS.supports stubbed)`, found by diffing the legs' ✓ lines); the new I2 "suggestions are off on the journey" step ✓ on each engine (observed)
- Task 1 VALIDATE: `14` exports, names as planned (observed)
- Task 6 FREE mode: instance 2 unnamed, master 6, 27 options, ≈ 16.8k estimated tokens per question, no leak flag (observed)
- Task 7 smoke: `input_tokens 7092`, 454 ms, `avatar 0.96, icon 0.03, none 0.01` (observed; this answer is never scored)
- Task 8 `--run`: 8 requests, each with one question; `input_tokens` 7,092–7,149 each (≤ 38,875); 271–422 ms; instance usage 14,232 in / 464 out; master 42,759 in / 1,394 out (observed). `--labels-template` wrote 8 rows; `--report` printed "the owner has not labelled" and exit 0 (observed)
- Task 10 portal walk (`provenance=real`, scratch `JOBS_DIR`, private port, killed by PID), all observed:
  - status line: `Machine suggestions (Jev, unratified): 2 node(s)`
  - avatar row: `avatar 0.96 — no builder yet · Use icon (0.02) · none 0.02`
  - text block row: `Use text (0.27) · Use stack (0.20) · none 0.18`
  - clicked `Use text` on `ir.children[0].children[1]`: HTTP 200; `mapping.json` `parts[…] = {"map":"text"}`; verdict `via: mapping`; the select reads `text`; `imports/i1.json`'s `suggestions` byte-equal before and after; no page errors
  - `git status -- discovery` in the worktree: empty
- Spend (derived at $0.042/M input, UNVERIFIED price): smoke 7,092 + run 56,991 + walk 14,232 = 78,315 input tokens ≈ $0.0033

## Not run
- **The owner's 8 labels and the `--report` agreement figures**: the owner's to do (honesty contract). Tracked in #471.

## Deviations from the plan
- 46.3's REDDENS mutation adds `style` after the `stateKeys` filter, because the plan's form cannot redden this implementation (plan error 4).
- 46.11's REDDENS is applied as a source mutation (disabling `checkLabels`' slug test). The plan's in-memory `avatr` copy is kept as the refusal case, so both are proven.
- `CLAUDE.md` edited: the group count in two places, plus two map lines (plan error 2; `drift-check` requires the count).
- Task 10's VALIDATE asks for the walk's reads "with the screenshot". The reads are pasted above. The screenshot was taken and inspected (the status line, both hint rows, and the `text` select after the click) but is not committed: no report in `.claude/reports/` commits an image, and the observed reads carry the same facts.

## Assumptions carried
- Task 10 step 5: clicked the `text` builder slug on the text block, the plan's "a builder slug" (it expected `stack` or `list-row`; Jev ranked `text` first on the walk).
- `SUGGEST_TIMEOUT_MS` stays 15 s: the observed 454 ms is under the plan's 3 s rule.

## Additions beyond the plan
- `parseAnswer(answer, options, at = "answer")`: an optional third argument so an error names the question (`answers.n1.probabilities.avatr …`), the message form the plan asks for.
- 46.1 asserts the module exports no threshold-named constant (AC "no threshold constant exists", driven rather than only read).
- 46.5 asserts the run file's `note` equals the CLI's `NOTE`, so the note cannot drift from the CLI. It is a narrower clause than the gate's, and deliberately so: the note names what the RUN cannot show (whether the ranking is right, the live API today). The canvas page and the route wiring are limits of the GATE, stated in `gates.md` and the `group()` string, which agree. The note is pinned by 46.5 and a re-run is barred (R10), so it is left as recorded. 46.6 asserts an answer missing one option still parses (R6).
- 46.9 asserts the replayed record has 2 suggestions before its break cases (see Proving the checks).
- The CLI exports `READS`, `RUN_FILE`, `LABELS_FILE`, `MAX_ACCEPTED`, `NOTE`, `templateSha` and `fixtureName` so group 46 reads one copy. `--run` refuses to write if any response lacks `usage.input_tokens` or exceeds the limit. FREE mode flags an id or colour in a state.

## Issues encountered
- Jev's scores are not stable from run to run. The walk's live answer for the instance text block (`text 0.27, stack 0.20, none 0.18`) differs from the committed run's (`text 0.25, list-row 0.21, none 0.17`), and the avatar's confidence moved from 0.96 to 0.95. The committed run is the record. Nothing depends on a live score.
- The fresh worktree needed `npm ci` in `tooling/icons`, `portal` and `tooling/style-dictionary` (plan error 5).
