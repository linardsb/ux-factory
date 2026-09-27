# PR #463 review: Jev guard on the discovery answer box (#454)

**Head** 5b5ac1808f163fa53a6b0d29af8b31c0fdb80e06 · **Base** main @ `ce7437800a750529bce7b77a5c46588615509b56` · Round 1 (no prior review, so the guarantees pass does not apply)

**Recommendation: approve-grade, posted as a comment** (self-authored PR, so `--approve` is not available). There are no critical or high findings. Two medium findings are gate gaps, not present defects: each was confirmed by a mutation that group 44 does not catch. The third medium finding is an owner decision about the aside half. Fixing F1 and F2 before merge is cheap and recommended.

## Summary

The guard asks Jev two yes/no questions before an answer is submitted. If the answer reads like a look-up or an aside, the person chooses where it goes. Any failure submits as before.

The PR also fixes #289: every drawer look-up and aside threw in the prompt builder. `questionForTurn` fixes that, and group 30.58 pins it. `postDiscoveryTurn` no longer reports a failed turn as settled.

The code matches the stated intent:
- Fail-open is real: one `try` wraps both the call and `decide()`.
- The route sits behind the CSRF origin guard.
- `.portal-guard` sets no `display`, so the `hidden` attribute holds; `portal.css:61` also backs it.
- `questionForTurn` cannot receive `undefined`, because `runTurn` refuses `cursor.done` first (`discovery.mjs:1123`).

## Issues

### Medium

**F1: build-checks 44.4's "aside-disabled case" never runs** (`tooling/build-checks.mjs:14056`)
- **Problem:** The case is inside `if (G.T_ASIDE === null)`, and `T_ASIDE` is `0.35`, so the branch is dead in CI. Yet `gates.md` (group 44 entry) and the group's own string both claim it is covered.
- **Mutation (observed):** I removed `aside !== null &&` from `decide()` (`discovery-guard.mjs:96`) and group 44 stayed green. That edit makes a disabled aside compare `noul >= null`, which is always true, so every non-look-up answer would be flagged as an aside.
- **Fix:** Drive `decide(i.answers, { lookUp: G.T_LOOK_UP, aside: null })` over the committed items unconditionally. It needs real responses, not the shipped threshold.

**F2: `checkAnswer`'s success path is reached by no case** (`portal/lib/discovery-guard.mjs:117`)
- **Problem:** 44.5 and 44.6 inject only failing `ask`s, and 44.3 and 44.4 call `decide` directly. The object `checkAnswer` returns when Jev answers is therefore never produced.
- **Mutation (observed):** I changed `decide(r.answers)` to `decide(r)` and all 44 groups passed. In the live drawer, that edit would make every call throw, fail open, and never prompt. The guard would be switched off with nothing reporting it.
- **Fix:** Add one case that hands a committed `eval-run.json` item's `{ model: RUN.model, answers }` verbatim to an `ask` stub, then asserts:
  - `verdict === decide(item.answers)`
  - `failOpen === null`
  - `lookUp` and `aside` equal the item's scores

  This replays recorded data rather than fabricating a `noul`. Amend the honesty-rule sentence in the group and in `gates.md` to allow a verbatim replay of a committed response.
- **Scope note:** This is not listed among group 44's "cannot reach" clauses, so it is a gap, not a declared limit.

**F3: the aside question has no verified hits and four known misfires** (`portal/lib/discovery-guard.mjs:43-45`, PR body "Numbers")
- **What the committed run flags (observed from `eval-run.json`):** exactly four negatives, graded-opus-a a13, a22 and a65, and later-not-never-1 a24.
- **What those four are (read by eye):** each is an on-topic answer to its own question.
  - a13 explains why the Kano pair cannot be answered yet.
  - a22 answers rabbit-holes.
  - a65 answers the Sean Ellis question.
  - a24 is the press release that `s4-press-release` asked for.
- **What was never shown:**
  - No labelled aside exists, so aside recall is unmeasured.
  - The aside path was not walked live (the PR's own "Not run").
- **Consequence:** The PR body's "combined prompt rate 4/160" is correct arithmetic, but it does not say that all four prompts are false.
- **Why this does not block:** The harm is capped at one extra click ("Send as my answer") on about 2.5% of answers (4/160, derived), and every failure fails open.
- **Owner call:** Ship with `T_ASIDE = 0.35`, or set it to `null` until labelled asides exist. If it ships, add one sentence to the header and the PR body saying the four aside prompts are all misfires.

### Low

**F4: "pre-registered" and "never tuned" now need a qualifier**
- **Where:** `discovery-guard.mjs:29-30` and PR body line 14.
- **Problem:** D3 was amended after run 1's scores were visible. The amendment is documented and owner-made, so it is not itself a finding, but the bare "pre-registered" label no longer holds.
- **Fix:** "pre-registered, amended once by the owner after run 1 (O1)".

**F5: two absolute claims are wider than what was checked**
- **Where:** `discovery-guard.mjs:32` and the PR body's "Gates" line.
- **The header claim:** that group 44 "recomputes every number below". 44.3 recomputes recall, false-prompt, prompt rate and aside false-prompt. It does not recompute the gap figures (0.27, 0.95, 0.61), the named aside refs, or the latency p50, p95 and over-1500 figures. Narrow the sentence or extend 44.3.
- **The PR body claim:** "Every new check was observed failing under its planted fault." The report is honest about two limits the PR body omits:
  - 44.3 cannot see `>=` → `>` against run 2, because no score sits on either threshold (observed: 0).
  - 44.7 cannot see edits to untracked files.
- **Fix:** Add one clause to the PR body. The first limit is a seam problem: fakes may only fail, so no fixture can put a score on the boundary.

**F6: the eval's fallback rule hardcodes 3** (`tooling/jev-guard-eval.mjs:139`)
- **Problem:** The code uses `recallAt(t) >= 3` while the header (line 32) states "recall ≥ 3/4". The two agree only while there are four positives. A fifth label would make them diverge silently.
- **Fix:** `Math.ceil(0.75 * pos.length)`, or state the rule as an absolute count.

**F7: "Send as a look-up" overwrites an off-script draft** (`portal/public/portal.js:1499`)
- **Problem:** Whatever the person had typed in `#discovery-offscript` is replaced with no notice.
- **Why Low:** The case is narrow, and the owner's keep-the-answer-box decision covers the other box, not this one.
- **Fix:** Either refuse and say so, or accept the loss and write down that it is intended.

**F8: "`T_ASIDE === null` alone would disable the aside question" is only half true** (`discovery-guard.mjs:33-34, 94`)
- **What `null` actually does:** It stops `decide()` from acting on the aside score. The aside question is still sent to Jev.
- **Why it matters:** `decide()` still requires `aside.noul`. A later edit that stops sending the question when it is disabled would therefore throw on every call and fail everything open without any error.
- **Fix:** Either make the check conditional on `aside !== null`, or reword the header.

**F9: a non-string `text` is refused as "empty"** (`discovery-guard.mjs:112`)
- **Observed:** A route probe with `"text": 42` answered `an empty answer has nothing to check`.
- **Fix:** Name the type in the message.

### Checked, not findings
- **The `failOpen` string reaches the browser.** It can carry up to 200 characters of TypeSafe's error body, and `guardVerdict` never reads it. The key is never echoed, and the portal binds to 127.0.0.1 only.
- **Guard clicks while a turn is running.** `hideGuardChoice()` runs synchronously before `running` is set, and the controls are disabled. No reachable state was lost.
- **`#discovery-answer` stuck disabled after a check.** It is recomputed from `answerable` (`portal.js:1031`).
- **Callers of `postDiscoveryTurn`'s new boolean.** Only the guard's click handler reads it. The park, look-up and aside listeners ignore it.

## Numbers pass

| Figure (PR body / report) | Provenance | Check |
|---|---|---|
| 4 positives, 160 deduplicated negatives | observed | 257 banked lines across `discovery/*/answers.jsonl` give 164 distinct texts, and 164 − 4 = 160. `eval-run.json` has no duplicate sha or ref. |
| look-up recall 4/4, false-prompt 0/160 at 0.6 | observed | recomputed from `eval-run.json`: positives 0.95, 0.97, 0.95, 0.97, and the highest negative 0.27 |
| combined prompt 4/160 at 0.35, aside refs a13, a22, a65, a24 | observed | recomputed; the aside scores are 0.54, 0.62, 0.69 and 0.36. See F3 on what these four are. |
| gap midpoint 0.61 | derived | (0.27 + 0.95) / 2 = 0.61, and 0.6 is the nearest grid point |
| latency p50 250 ms, p95 295 ms, 0 over 1500 ms | observed | recomputed from `items[].ms` (max 580) |
| 117,950 input tokens | observed | summed from `items[].usage` |
| ≈ $0.005 per run | derived at an unverified price | the report already labels it this way |
| no score sits on either threshold | observed | 0 items |
| guard shown in 818 ms, $0.308, 4 `file_evidence` rows, AC #4 at 71 ms, $0.047 | report-attested, not re-run | These come from a throwaway walk package that was deleted, so there is no committed artifact. Plausible; not re-verified here. |
| "Every new check was observed failing" | partially | See F5. |

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓ all 44 groups pass` (observed) |
| `node tooling/drift-check.mjs` | ✓ on all 14 legs (observed) |
| `node tooling/token-lint.mjs` | ✓ 63 contract tokens, 0 orphans (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift (observed) |
| Portal smoke (OS-assigned port, own PID killed) | `/api/health` → `{"ok":true,…}` (observed) |
| `POST /api/discovery/check-answer` with no key | 200 `{"verdict":"answer",…,"failOpen":"jev: TYPESAFE_API_KEY is not set…"}` (observed) |
| the same route: bad slug, array slug, non-string text | 500 with each refused by name (observed) |
| the same route from a cross origin | 403 (observed) |
| CI on the PR head | verify, visual, codeql, CodeQL, audit and gates-green all pass (observed via `gh pr checks`) |

The first local run was red on the `icons` group and on drift's gen-icons and style-dictionary legs. That was a fresh-worktree environment gap: `tooling/icons` and `tooling/style-dictionary` had no `node_modules`. `npm ci` in each cleared it, and CI installs them itself. It is not a PR defect.

No paid API was called in this review.

## What is done well
- **The group's rule for fakes:** injected fakes may only fail. The thresholds are bound to committed real responses by sha, model and item text. This is the right discipline, and F2's fix keeps it by replaying rather than fabricating.
- **The #289 fix:** folding it in was right. The guard would otherwise send people to a path that has never worked, and the report says clearly how the plan missed it.
- **`postDiscoveryTurn`'s `failed` flag:** it removes a silent-success report from all four turn controls.
- **The report's mutation table:** it states its own blind spots (44.3's boundary, 44.7's untracked files) instead of hiding them.
