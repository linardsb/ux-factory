# Implementation Report — Jev guard on the discovery answer box (#454)

**Plan**: `.claude/plans/jev-answer-box-guard-454.md`   **Branch**: `feature/jev-answer-box-guard-454` (worktree `../wt-454`)   **Base**: `ce74378` → `ce74378` (origin/main unmoved at report time; re-fetched)   **Status**: COMPLETE

## Summary
Before an answer is submitted, the discovery drawer asks Jev (TypeSafe's System One classifier, `jev-1.13.0`) two yes/no questions: is this a look-up, and is it about something other than the question. If the answer reads like either, the person chooses whether to send it off-script or as their answer. Any failure submits exactly as before. The thresholds come from a committed real eval (`T_LOOK_UP = 0.6`, `T_ASIDE = 0.35`), and build-checks group 44 recomputes every stated number from it. The first AC #3 walk found that the drawer's look-up and aside turns had **never worked**: a #289 bug made every off-script turn throw after writing its answer line, and the drawer then reported success. Both are fixed here, because without them the guard would route people into a dead path.

## Tasks completed
- Task 1 → `portal/lib/jev.mjs` (CREATE)
- Task 2 → `portal/lib/discovery-guard.mjs` (CREATE)
- Task 3 → `portal/server.mjs` (UPDATE): the `/api/discovery/check-answer` route
- Task 4 → `portal/public/index.html` (UPDATE): `#discovery-guard`
- Task 5 → `portal/public/portal.js` (UPDATE): the guard in the submit path
- Task 6 → `portal/public/portal.css` (UPDATE): `.portal-guard`
- Task 7 → `tooling/jev-guard/labels.json`, `tooling/jev-guard-eval.mjs` (CREATE)
- Task 8 → `tooling/jev-guard/eval-run.json` (GENERATED), thresholds plus the header paragraph
- Task 9 → `tooling/build-checks.mjs` group 44
- Task 10 → `CLAUDE.md`, `.claude/references/gates.md`, the ✓ line
- Task 11 → portal smoke, the route, and the AC #3 and AC #4 walks. The probe package was deleted, never staged.
- Beyond the plan (see Deviations): `portal/lib/discovery.mjs` `questionForTurn` (#289 fix) plus build-checks 30.58; `postDiscoveryTurn`'s `failed` flag.

## The eval (observed, `node tooling/jev-guard-eval.mjs`)
- **Pre-check:** one route-shaped call on a3 returned `{"model":"jev-1.13.0","answers":{"look_up":{"noul":0.95},"aside":{"noul":0.06}},…}` in 444 ms.
- **Run 1, under the original D3:**
  - Recall was 4/4 at every grid T, and the look_up false-prompt counts fell 15, 7, 2, 2, 1, then 0/160 from T 0.35 upward.
  - The rule chose T_LOOK_UP 0.90, the grid's top.
  - Positives scored 0.95–0.97. The top negative scored 0.31.
- **Owner decision O1:**
  - Amend D3 so that when the sets separate, the threshold is the grid T nearest the gap's midpoint.
  - The original rule still applies when they overlap.
  - Logged in the plan's AMENDMENTS and in the eval header.
  - The eval was re-run. `eval-run.json` was never edited.
- **Run 2, the committed one:**
  - `rule: separated sets (highest negative 0.27, lowest positive 0.95): the grid T nearest the gap's midpoint 0.610, recall 4/4, false-prompt 0/160 ≤ 3; aside = lowest T with combined prompt count ≤ 4/160`.
  - `summary: recall 4/4 · look_up false-prompt 0/160 · combined prompt 4/160 · aside false-prompt 4/160 · latency p50 250 ms, p95 295 ms, over 1500 ms 0`.
  - The four aside prompts are graded-opus-a a13, a22 and a65, and later-not-never-1 a24.
  - 0 retries. 117,950 input tokens, ≈ $0.005 per run at the **unverified** $0.042/M price (derived).
- **Jev is not bit-stable across runs:**
  - The top negative moved 0.31 → 0.27 between the two runs.
  - The fourth aside prompt changed from graded-opus-a a31 to later-not-never-1 a24.
  - The module header says so.

## Tests added
- **Group 44**, cases 44.1–44.7, in `tooling/build-checks.mjs`.
- **Group 30, case 30.58:** `questionForTurn`, driven for both turn shapes, plus a source pin that `runTurn` calls it.
- `node tooling/build-checks.mjs` → `build ✓  all 44 groups pass` (observed, final tree).

## Proving the checks
Each mutation was applied, `node tooling/build-checks.mjs` was run, and the file was restored (observed).

| Case | Mutation | Went red with | Positive control |
|---|---|---|---|
| 44.1 | `import 'zod';` in `discovery-guard.mjs` | `44.1: discovery-guard.mjs imports ["zod"] beyond […]` and `44.1: … imports zod or the Agent SDK …` | untouched green |
| 44.2 | one word of `QUESTIONS.look_up.instructions` | `44.2: QUESTIONS changed since eval-run.json was recorded (sha e7ef760b994d≠a3b6c46b4795) — re-run …` | untouched green |
| 44.3 | `T_LOOK_UP` 0.9 → 0.85 (against run 1) | `44.3: T_LOOK_UP 0.85 ≠ the recorded threshold 0.9` | untouched green |
| 44.3 | `>=` → `>` in `decide` (against run 1) | `44.3: promptRate recomputes to 3, eval-run.json states 4`. It moved only because run 1's a31 scored exactly 0.35. **Against the committed run 2, no score sits on 0.6 or 0.35 (observed: 0 and 0), so 44.3 cannot see this mutation today.** | — |
| 44.4 | `decide` returns `'answer'` unconditionally | `44.4: no committed positive decides "look-up" at T`, plus four 44.3 lines | untouched green |
| 44.5 | `checkAnswer`'s `catch` → `finally {}` | `44.5: checkAnswer threw on a missing key instead of failing open …`, plus 429, timeout and model mismatch | five fail-open cases green |
| 44.6 | existing-prd check moved after an `ask` call | `44.6: an existing-prd audit reached Jev (1 call)` and `44.6: a valid call reached ask 2 time(s) …` | a valid call reaches `ask` exactly once |
| 44.7 | group writes `discovery/faster-payment/zz-454-mutation.txt` | `44.7: the group moved a tracked path — …?? discovery/faster-payment/zz-454-mutation.txt…` | untouched green |
| 44.7 (limit) | appending to the then-untracked `labels.json` | **did not redden**: porcelain collapses edits to untracked files. It sees new and tracked paths, which covers every run-package file. | — |
| 30.58 | pre-fix expression `questionById(questionId)` in `questionForTurn` | `30.58: an off-script turn's prompt question is null — it must be the bank entry of the question on the table …` | the banked leg green |
| 30.58 | `runTurn` back to `question: questionById(questionId)` | `30.58: runTurn does not build its prompt question through questionForTurn …` | as above |
| drift-check group-count | docs at 43, build-checks at 44 | `group-count drift: CLAUDE.md (architecture map): says 43 groups, build-checks defines 44; …` | green after the update |

**The walk driver was proven first.** Against the unfixed portal (free: the throw comes before the SDK), `walk.cjs lookup` exited 1 with `WALK FAILED: no search evidence …; transcript.jsonl is empty — the agent turn never ran; turnStats has 0 entries …`. An earlier version of the driver passed that same failed turn, because it read the status line instead of the disk.

## Validation results
- `node --check` on every new and edited `.mjs`/`.js` file: clean (observed).
- `node tooling/build-checks.mjs` → `build ✓  all 44 groups pass` (observed).
- `node tooling/drift-check.mjs` → `drift-check ✓ syntax · … · group-count` (observed; re-run after staging at commit).
- Portal smoke (OS-assigned port, own PID killed): `/api/health` → `{"ok":true,…}`, and served `/portal.js` carries `guardVerdict` and `let failed = false` (observed).
- Route: `partner-audit-1` → 500 `discovery-guard: an existing-prd audit has no answer box…`. With no key → 200 `{"verdict":"answer",…,"failOpen":"jev: TYPESAFE_API_KEY is not set in portal/.env"}` (observed).
- **AC #3** (headless Chromium via Playwright, throwaway fictional package `jev-guard-probe-454`, Think), observed:
  - a3's text pasted and submitted. The guard appeared after 818 ms with "This reads like a look-up. …", and focus was on "Send as a look-up".
  - Clicked. `answers.jsonl` a1 was `"kind":"off-script","intent":"look-up"`. `transcript.jsonl` held 4 `file_evidence` ops with `provenance` `secondary-source` and URLs: wearepay.uk CoP, wearepay.uk CoP FAQs, psr.org.uk CoP, trustpair.com.
  - Status read "Looked it up — 4 evidence row(s) on this turn. … Your answer box still holds that text …", and the answer box still held the text.
  - turnStats: 7 SDK turns, 34.9 s, **$0.308**.
- **AC #4** (key line commented out, `TYPESAFE_API_KEY` unset in the shell, portal restarted), observed:
  - An ordinary answer went to "Judging…" in 71 ms with the guard hidden.
  - A banked answer line was recorded and turnStats grew (**$0.047**).
  - Status: "Turn recorded. The next question is below."
  - The key was restored afterwards.
- **Drawer on a failed turn** (new `portal.js`, old server), observed: the status read `discovery-postures: a question entry is required`, with no settled line and no trim line.
- The probe package was deleted after both walks. `git status --porcelain -- discovery` was empty (observed).

## Not run
| Step | Why | Tracker |
|---|---|---|
| The aside path in the drawer ("Send as something else") | not walked. It shares the #289 fix and `offScriptControl`, but a live aside turn is unobserved | owner's call |
| The double-Enter block and hide-on-input in a browser | reviewed by reading only | owner's call |
| drift-check syntax leg and loc `--check` over the new files | both read tracked files only. Re-run after staging, at commit | this branch's commit |

## Deviations from the plan
- **#289 fix folded in** (plan error, `portal/lib/discovery.mjs`). The plan's pre-flight cleared AC #3 by reading the transport's fetch fence and never checked `runTurn`'s question argument. An off-script turn has no `questionId`, so `questionById(undefined)` → `buildThinkTurn` threw "a question entry is required" after the answer line had been appended. Zero committed off-script lines in any package would have shown it. Fix: `questionForTurn`, which looks up the question on the table by id. `question_id: null` on the answer line is unchanged.
- **`postDiscoveryTurn` reports a failed turn as failed** (`portal/public/portal.js`). An SSE `error` event does not throw, so the drawer ran `settledLine` over it and cleared both boxes. It now keeps the error as the status, keeps the boxes, and resolves `false`. This changes all four turn controls, for the better. The guard's trim line is conditional on `true`.
- **D3 amended by the owner (O1)** after the first eval (above). The committed thresholds come from the amended rule.
- 44.5 injects `key: 'k'` in every non-missing-key case and asserts one fetch (plan error; AMENDMENTS).
- 44.4 drives `decide({})` with an explicit threshold so it reaches the missing-noul refusal (plan error; AMENDMENTS).

## Assumptions carried
- A3 (client cap 2.5 s, server cap 1.5 s) as written. The measured p95 of 295 ms puts no submit near either cap.
- 44.5's fifth failing `ask`, "a response with no answers", uses the honesty rule's allowance for a missing field.
- The work was done in a worktree, because the primary checkout was on another branch with other sessions' files dirty.
- A single commit, with the #289 fix named in the message and in the PR body. Splitting the interleaved `portal.js` and `build-checks.mjs` hunks non-interactively was not worth the risk.

## Additions beyond the plan
- The eval prints its census before the first call, and records each item's `ms` from its successful attempt with a `retries` count.

## Issues encountered
- A `git checkout` during a mutation reverted my own uncommitted group-44 insert. It was re-applied from the scratchpad and re-verified.
- **Left for a follow-up:** `runTurn` appends the answer line before the prompt builds (disk-first by design), so a prompt-build failure leaves an answer line for a turn that never ran. This is how the #289 bug stayed silent.
- Paid spend this ticket (observed from turnStats and eval tokens): $0.308 + $0.047 in agent turns, plus about $0.01 in Jev across two eval runs and probes (derived, unverified price).
