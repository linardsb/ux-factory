# Implementation Report — the park view, a blind borderline re-audit, and a labelled read (#506)

**Plan**: `.claude/plans/discovery-park-scorer-506.md`   **Branch**: `feat/506-park-scorer` (worktree `../ux-factory-wt-506`)
**Base**: `d5c7536` at start → `d5c7536` at report (`git fetch` then `git rev-parse --short origin/main`; main did not move, so no merge was needed)   **Status**: COMPLETE

## Summary
`tooling/discovery-score.mjs` gains `--park <slug>`: a pure `parkView` that sorts the two graded packages' park misses
into three classes, each row carrying the agent's own reason, crossed against a new blind borderline set. The set came
from five no-tool `fable` subagents and is committed verbatim as `docs/epics/fixtures/graded-answers/borderline.json`,
with a `haiku` cross-check that was not committed. Group 33 gains case 33.16. The README's unsourced "7–8" claim is
corrected. The deliverable `.claude/reports/discovery-park-506.md` freezes the counts, the overlap and the cost table, and
carries the session read. That read names one change, to `systemFor`, at $7.55, and rests on a blind hand-off
classification of the 18 run-`a` K2 answers.

## Tasks completed
- T1 audit prompt: five 13-question batch files in the session scratchpad, not the repo.
- T2 auditors: 5 × fable (committed) and 5 × haiku (cross-check), all on the first attempt → `docs/epics/fixtures/graded-answers/borderline.json` (CREATE)
- T3–T5 `BORDERLINE_PATH`, `BORDERLINE_VERDICTS`, `checkBorderline`, `readBorderline`, `PARK_CLASSES`, `parkView`, `printPark`, `--park`, the header usage line and the `USAGE` string → `tooling/discovery-score.mjs` (UPDATE)
- T7 case 33.16 and the import list → `tooling/build-checks.mjs` (UPDATE)
- T8 the three prose copies → `tooling/build-checks.mjs` (header comment and group string) and `.claude/references/gates.md:55` (UPDATE)
- T9 → `discovery/README.md` (UPDATE)
- T10 → `.claude/reports/discovery-park-506.md` (CREATE)

## Tests added
Case 33.16 in `tooling/build-checks.mjs`, with four parts:
- (a) A synthetic six-turn package covering every class, a K2 non-park miss and two matches. Checks: classes by ref,
  parks/precision/recall, `why` read from the closing op, band set on K2 rows only, and the K2 miss bands.
- (b) Eight `checkBorderline` refusals plus a 65-entry positive control.
- (c) The committed `borderline.json` is required and must validate.
- (d) On every present graded package, the re-sum invariant: `b + b′ + K3-parked` equals the transcript's banked
  `open_question` count, and `a + K3-parked` equals the K3 turns.

Plus pins on the `PARK_CLASSES` keys and labels and on `BORDERLINE_VERDICTS`. Result: `graded fixture ✓`,
`build ✓  all 51 groups pass` (observed).

## Proving the checks
| Mutation | Case that went red (observed message) | Positive control |
|---|---|---|
| M1 `bPrime` kind `"K1"` → `"K9"` | (a) `classes.bPrime must be [a2]… got []`; (d) `graded-think-a's park classes re-sum to 8 + 0 + 26 = 34, not the transcript's 38`, and the same on `graded-opus-a`: `34, not … 37`. These match the plan's derived 34 ≠ 38 and 34 ≠ 37 | (d) green on both real packages before the mutation |
| M2 band set when `r.kind !== "K3"` | (a) `band is K2-only — want borderline on a3 and null on a2 and a5, got borderline · clean · null` | (a) green unmutated |
| M3 `checkBorderline` accepts any verdict | (b) `checkBorderline must refuse a verdict "thin" — got no throw` | (b) the 65-entry set validates, `.size === 65` |
| M4 `borderline.json` moved aside | (c) `docs/epics/fixtures/graded-answers/borderline.json is required…` | (c) green with the file present |

Each mutation was applied with `sed`, run with `node tooling/build-checks.mjs` (exit 1 each), and restored from a
backup copy. Both files were `cmp`-checked against their backups afterwards: `RESTORED`. The M1 run also reddens the
band assertion as a side effect, because `bPrime[0]` is undefined.

The driver was proved before its evidence was trusted. `audit-check.cjs`, the scratch script that extracts each
auditor's reply and counts tool calls, was checked on the pilot: the prompt it extracted had the same length as the
batch file (17149 = 17149) and was byte-equal to it. It was not run against a planted tool call.

## Validation results
| Command | Result |
|---|---|
| `node --check tooling/discovery-score.mjs && node --check tooling/build-checks.mjs` | OK (observed) |
| `node tooling/discovery-score.mjs --selftest` / `--check-draw` / `--check-key` | `selftest ✓` · `draw ✓ 65 questions × 3 runs` · `key ✓ 195 answers` (observed) |
| `--slug graded-think-a --run a` | K1 `14 1 4 0 0`, K2 `2 8 8 0 0`, K3 `0 2 26 0 0` (observed, equals T6) |
| `--slug graded-opus-a --run a` | K1 `14 2 3 0 0`, K2 `0 11 7 0 0`, K3 `0 1 27 0 0` (observed, equals T6) |
| `--park graded-think-a` | `claude-sonnet-5`, parks 38, precision 26/38 (68%), recall 26/28 (93%); a: a18 a46; b: a14 a17 a31 a32 a42 a44 a52 a61; b′: a27 a28 a34 a58 (observed, equals T5) |
| `--park graded-opus-a` | `claude-opus-5`, parks 37, precision 27/37 (73%), recall 27/28 (96%); a: a18; b: a14 a17 a31 a42 a44 a51 a52; b′: a27 a28 a35 (observed, equals T5) |
| determinism: `diff <(--park graded-think-a) <(--park graded-think-a)` | empty (`DETERMINISTIC`), `git status --porcelain` unchanged (observed) |
| refusals: `--park` / `--park nosuchslug-a` / `--park graded-think` | exit 1 with usage / `no run.json at …` / `--park reads the draw column from the slug's -a/-b/-c suffix…` (observed) |
| T3: `checkBorderline(readBorderline(), ids).size` | `65` (observed) |
| assembled-file check | `65 65 [ 'borderline', 'carries', 'clean' ]`; entries deep-equal to the concatenated raw replies: `true` (observed) |
| `node tooling/build-checks.mjs` | `build ✓  all 51 groups pass`, `graded fixture ✓` (observed, final tree) |
| `node agent-layer/gen-loc-summary.mjs --check` | `3 groups — no drift` (observed) |
| `node tooling/drift-check.mjs` | `drift-check ✓ syntax · token-css · … · group-count` (observed, after `npm ci` in `tooling/style-dictionary`) |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| `grep -n "park view" tooling/build-checks.mjs .claude/references/gates.md` | 3 prose hits (header :10401, group string :10896, gates.md:55) plus the 33.16 message (observed) |
| `grep -n "7–8" discovery/README.md` | no hits (observed) |
| portal smoke (piv-validate L5) | `PORT=<OS-assigned 53247> node server.mjs` → `/api/health` `{"ok":true,…}`; only that PID killed (observed) |

## Not run
- **The owner's acceptance of the session read**: owner's call at review (A2). #508 picks it up.
- **The pixel gate and the journey drivers**: no shipped page changed, so they do not apply.

## Deviations from the plan
- **T2 cross-check restore (plan error).** The plan says to restore with `git checkout -- …borderline.json`, but the
  file is untracked until commit, so `git checkout` cannot restore it. Restored from a byte-copy backup instead, then
  `cmp`-checked.
- **T7/T10 line citations (plan error, expected drift).** The 30.46/30.32 literals the plan cites at
  :8334/:8949–8953/:16269/:8409 sit at :8335/:8950–8954/:16366/:8410 on this tree. The import list grew one line, and
  33.16 adds 97 lines above :16366. The report's table uses this tree's numbers and says so.
- **T9 README wording.** The plan's VALIDATE wants zero "7–8" hits, so the correction describes the old claim without
  quoting the digits.
- **T8 header copy.** The new header paragraph reads "Case 33.16 is the park view (#506)". The case-sensitive grep
  needs the phrase lowercase, so it is not "THE PARK VIEW".

## Assumptions carried
- A3: the draw column comes from the slug suffix.
- A5: "per model" means one `--park` per slug.
- `printPark`'s model label comes from `run.json`'s `model` field, with `posture` as a fallback.
- An unparseable band (for example a missing id) throws through `bad()`. This is reachable only by misuse, because
  `checkBorderline` runs first.

## Additions beyond the plan
- **Extra pins in 33.16.** A `BORDERLINE_VERDICTS` exact-list pin beside the `PARK_CLASSES` pin. It cost one line and
  catches a fourth verdict by name.
- **A `USAGE` constant in the scorer.** It replaces the inline usage string, so `--park`'s missing-slug refusal and the
  fallback print the same text.
- **The context-leak finding (recorded, not fixed).** Every subagent's auto-loaded instructions carry the
  `MEMORY.md` index line "#348 counted 11 borderline K2s…". The report's blindness receipt names it, and so do the
  read's limitations. `MEMORY.md` was not edited. This leak check was added at the advisor's suggestion; the plan's
  receipt counted tool calls only.
- **A blind hand-off classifier for the read.** The advisor pointed out that the read's colleague-hand-off split was
  drawn after seeing the filings. One more no-tool `fable` subagent classified the 18 run-`a` K2 answers with no
  filings shown. My prediction was written down first, and the classifier matched it on all 18 (observed: the
  receipt passed with 0 tool calls and a byte-equal prompt). Its verdicts and preamble are in the deliverable; they are
  not committed as a fixture.
- **The read's boundary paragraph was rewritten after the advisor review.** The first draft cited the borderline audit
  ("6 of 8 clean") as proof that the parks were off the not-known boundary. The audit prompt cannot support that:
  "clean" means the slot is empty, and it has no not-known option for an empty hand-off. The paragraph now says what
  the audit measured, and the outcome rests on the two patterns and the rule's wording.
- **A prompt-integrity check per auditor.** The first user message was compared with its batch file, and every reply
  was extracted by script from the transcript, never retyped.

## Issues encountered
- A fresh worktree needs `npm ci` in `tooling/icons`, `tooling/style-dictionary` and `portal/` before build-checks,
  drift-check and the smoke will run. All three were done; it is an environment gap, not a code issue.
- The first refusal loop used `$a` unquoted under zsh, which does not word-split, so two refusal cases ran with one
  fused argument and printed the usage message. This was a driver error. Both cases were re-run with separate arguments
  and their real messages were observed.
- All five haiku replies came wrapped in a ```json fence. It was stripped mechanically (`sed '1d;$d'`) and recorded in
  the receipt table.
