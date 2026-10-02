# PR #502 review — re-record a linked decision from the drawer (#498)

**Head** 4c8d34f · **Base** main @ `1c6af29922a09bbe16723026b0a650c9a522dc85` · round 1 (no prior report, so the guarantees pass does not apply) · reviewed in a clean worktree at the head, with `origin/main` as an ancestor.

## Summary

The PR adds a revisit turn (`r1`, `r2`, …). It lets the owner re-record one banked decision on a finished, real-provenance run without reopening the run. It also adds an env seam that swaps in a scripted $0 fake for the canvas-journey. The core design holds:
- the guards run under the lock and before the append
- revisit turns are excluded from the cursor
- `fileOp` is the only filing path
- the fake's temp-root guard is sound

There are **no critical or high findings**. One medium finding is worth fixing **before the owner's paid revisit turn**, because that turn is the first time a real model drives this path. The PR correctly leaves #498 open with `Refs`, and the body contains no closing keyword.

## Issues

### Medium

**F1 — a revisit can supersede a different question, and the drawer does not say so.**
`portal/lib/discovery.mjs:375` (`fileOp`) · `discovery/ops.mjs:437` · `portal/public/portal.js:1521`
- The applier never checks that `record_decision`'s `question_id` (which question the decision answers) matches the question the revisit was opened for. It does not check that `answer_ref` (which answer line it cites) belongs to that question either.
- Failure scenario: on turn `r1` for q7, the model files `record_decision` for q9.
  - The applier records it as a supersede of q9's current decision.
  - The canvas then flags every frame pinned to q9.
  - The drawer's settled line looks only for a supersede of seq 7, so it prints "Nothing superseded seq 7 — the agent filed a decision on r1". It never names the unrelated q9 supersede.
- The interview path has the same gap. On an open run, though, nothing is pinned to the decision yet. On a finished run, frames are pinned, so the cost is new to this PR.
- Fix, pick one:
  - (a) Pass the revisited `questionId` into `fileOp`'s context. On an `rN` turn, refuse any `record_decision`, `flag_weak_answer` or `open_question` whose `question_id` differs, and name both ids in the refusal. The transport already turns an applier refusal into an `isError` result.
  - (b) If (a) is out of scope, have `settledLine` list every supersede made on turn `rN`.
  - Either way, add a 30.6x case that files the wrong question through `fileOp` on an `r` turn.

### Low

**F2 — the fake refuses only after the answer is appended.**
`portal/lib/discovery.mjs:1209` then `:1215`
- `appendAnswer` runs before `loadTransport()`, so `assertRoot` in `tooling/fake-discovery-agent.mjs:45` throws after the verbatim answer line is already in `answers.jsonl`.
- Failure scenario: `UXF_DISCOVERY_TRANSPORT` is left exported in a shell, and an owner then answers a real jobs-folder package. Each answer lands in `answers.jsonl` and the fake refuses each one. The ledger is untouched, but the answers file now holds lines with no judged turn.
- This is the same shape as any transport failure, such as a credit stop. The boot log names the override (`portal/server.mjs`). That is why this is Low.
- Fix: when the seam is set, refuse a non-temp root in `runTurn` before the append.

**F3 — a revisit that fails reuses its `rN` for the next question.**
`portal/lib/discovery.mjs:754` (`revisitView`)
- `rN` counts only closed revisit turns. A revisit of q7 that files nothing therefore leaves `r1` open. The next revisit, even of q9, appends a second answer line to `r1`.
- The comment documents the reuse. It does not document that one turn id can then carry answers to two different questions, and the transcript does not show it plainly.
- Fix: count `r` answer lines instead of closed `r` turns. Otherwise, document the two-question case and accept it.

**F4 — the revisit mode reads provenance from the form, not the loaded session.**
`portal/public/portal.js` (`renderPackageView`, `discoveryEls().provenance`)
- This is cosmetic, because `assertRevisit` on the server is the real rule. Reading provenance from the session removes a way for the page and the server to disagree.

**F5 — one `fresh` site is not pinned.**
`portal/lib/discovery-transport.mjs:207`
- 30.62 (`tooling/build-checks.mjs:9412`) pins the `resume` expression and the `recordSessionId` guard. It does not pin `sessionId = fresh ? null : …`.
- Failure scenario: someone drops the ternary. A real revisit whose init message never arrives would then record the interview's session id on its `turnStats` entry.
- The impact is reporting only. Add the line to 30.62's source read.

**Note.** The reviewer agent's first draft claimed that the `fresh` handling had no gate at all. That is wrong, because 30.62 covers it. F5 is the part of that claim that holds.

## Validation (observed at 4c8d34f, this review)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 51 groups pass, after `npm ci` in `tooling/icons`. The first run failed 41.7 because this new worktree had no `node_modules`. That failure is environmental, not from this PR. |
| `node tooling/drift-check.mjs` | ✅ every leg, after `npm ci` in `tooling/style-dictionary`. The first run failed for the same environmental reason. |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan |
| `node portal/lib/discovery-transport.mjs --preflight` | ✅ all 8 rows pass, zero tokens |
| `node tooling/canvas-journey.mjs chromium` | ✅ 234 passed, 0 failed. Pass B's eight B2 checks are green, including "filed record_decision on r1 superseding 7" and "f1 shows Decision 7 changed since linked". The first run failed 3 I12 checks because `tooling/visual-regression` had no `node_modules`. That pass is untouched by this PR. |
| CI (`gh pr checks 502`) | ✅ verify · visual · audit · codeql · CodeQL · gates-green |

Not re-run: the Firefox and WebKit journey legs, and the 23 + 2 mutations.

## Numbers pass

Every figure in the PR body was re-observed or traced to a run:
- **51 groups, 63 tokens, pre-flight 8 rows, chromium 234/0:** re-observed at this head.
- **Firefox 233/0 and WebKit 233/0:** observed by the author at `2fc425d`. The body says the two later commits touch only `tooling/build-checks.mjs` and `.claude/` docs. `git show --stat 7efa3fa 36f2aef 4c8d34f` confirms this, and the journey reads neither, so the figures carry over.
- **"23 build-checks mutations":** the report's table has 23 `M` rows (counted). I did not re-run them.
- **The "four Claude Code sessions … Credit balance is too low" observation:** labelled observed, and the cause it names matches the guard it motivated (`seamRead.intact` gating 30.60).

No derived figure is presented as observed.

## What is done well

- **The ordering inside `runTurn`:** the guards come first, then the append, then the single dynamic import. The comments at `discovery.mjs:1150` state this ordering, and 30.60 asserts that a refusal leaves the answer and transcript counts unchanged.
- **The revisit excludes itself from the cursor:** `closersOf` at `discovery.mjs:658` does this. 30.59 has a positive control: the same closer on `t25` does move the cursor.
- **`assertRevisit` is keyed on the request's slug and provenance, not `run.json`'s.** It refuses fictional packages, so committed evidence cannot be appended to.
- **The fake's `assertRoot` realpaths both sides and anchors on `tmp + sep`.** This refuses `/tmpfoo`, the repo and symlinks into the repo.
- **The seam cannot be reached from HTTP.** The route passes `body.revisit === true`, never a spread, and the boot log names an override.
- **The client escapes server data.** It uses `esc()` on every interpolated value and `textContent` for question text.
- **Gating 30.60 on `seamRead.intact` has a real cause behind it.** A mutation without it spent a real SDK start, and the plan's AMENDMENTS log records this.

## Recommendation

**Approve (no blocking findings), posted as a comment.** This is a solo repo, so the author cannot formally approve their own PR.

Fix F1 before the owner's paid revisit turn. If the model files against another question, that turn is where it would happen, and the drawer would report it wrongly. F2 to F5 can be fixed later.
