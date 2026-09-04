# PR #369 review — the three postures and the existing-PRD audit mode (#286)

**Head** `9aa9c74933c6b28d4ef9982277d4aa03134177cc` · **Base** `main` @ `985c807877cb6910f21841ef6cadb28df22e0c26` · **Round** 1 (no prior review; base unmoved since the branch was cut, so the guarantees pass does not fire) · **Reviewed** 2026-09-04

## Summary

Recommendation: **approve**. No critical or high findings. Every gate is green locally and in CI, the numbers in the PR body and the report re-derive (one noun is wrong, F1), Think's prompt surface is byte-stable by direct execution, and all seven committed packages resolve to their recorded posture by identity. The PR is honest that its two paid levels are blocked by the API usage limit and owed; the one process point worth a decision before merge is where that debt lives once `Closes #286` fires (F3).

Read in full: `portal/lib/discovery-postures.mjs`, `portal/lib/discovery.mjs`, the diffs of `discovery-transport.mjs`, `server.mjs`, `prd-projection.mjs`, `portal.js`, `index.html`, `build-checks.mjs`, `README.md`, `gates.md`, `CLAUDE.md`, the plan and the report. The code-reviewer agent read the same set plus `discovery/ops.mjs` and `portal.css`; its report is at `.agents/code-reviews/agent-reviews/pr-369-review.md`.

## Issues

### Medium

**F3 (process) — the owed paid observations have no tracker home once #286 closes.** The PR body and the report say the six audit turns, the Create PRD turn, the two `--probe-audit` runs and the QUOTED / PARAPHRASED / AUTHORED read of the wrong-if are blocked until 2026-10-01 and owed. AC #2 and AC #3 are therefore gated but not observed, and D2 (the wrong-if is the document's own) is the one claim in the ticket only a model can confirm. With `Closes #286` in the body, the debt survives only in `.claude/reports/discovery-postures-286-report.md` and a session memory. Fix: open a follow-up issue naming the four owed steps and the re-run protocol (AUTHORED → tighten `AUDIT_WRONG_IF_RULE`, at most three paid attempts), and reference it from the PR body, so #292 cannot record run 2 over an audit prompt whose wrong-if behaviour was never probed. Not a blocker; the owner's call.

### Low

**F1 (numbers, subject) — "24355 bytes" is the character count.** PR body §Validation and the report's Level 4 say the frozen fixture "stored 24355 bytes hashing to `ab6eb0ee…`". Observed: the file is 24560 bytes and 24355 characters; `sessionView().document.chars` is `text.length`, which is what was read. The md5 is over the UTF-8 bytes and matches either way (`ab6eb0ee6cdd3b7802ecfcbe90db2377` from both `md5 -q` on the file and the stored text), so D6's freeze check holds. A reader who checks with `wc -c` gets 24560 and reads the store as having altered the file. Fix: say "24355 characters" in both places; the view's field is already named `chars`.

**F2 (numbers, label) — the cost range does not follow from the arithmetic shown.** Report §Validation: "Expected cost ~$0.5–1.0 (derived from Run 0's $0.03–0.07 per turn × 9 turns plus the cached document)". The shown arithmetic gives $0.27–0.63; the document's share is unquantified. Either label it `expected` and drop "derived", or add the document's estimate (about 6–7k system-prompt tokens per the plan's cost note) so the range is derivable.

**F4 (test strength) — case 16's guard floor is loose.** `tooling/build-checks.mjs` case 16 asserts `guardAt.length >= 9`; the body has 17 regex hits before `mkdirSync` (derived by counting the `bad(` / `resolvePosture(` / `selectDepth(` / `declareFacets(` / `assertRunSlug(` / `assertProvenanceRoot(` / `allowSetFor(` calls in `openSession`). A regression that dropped up to eight guards would pass. The order pin (`every guard before mkdirSync`) is exhaustive and unaffected, and case 16 also drives every refusal by name, so this is a floor to raise when the case is next touched, not a gap in coverage today.

### Documented deviations honoured, not findings

- The vocabulary block, the tail and the guards as one module-private helper each for the two new builders (`sharedVocabulary`, `sharedTail`, `commonGuards`, `interviewHead`) rather than two literal copies. Observed: the block from "The op vocabulary" to "person's mouth." and the block from "The ladder a decision" through `PARENT_RULE` are byte-identical substrings of Think's, Grill's, Create PRD's and the audit's system prompts.
- A resume of an `existing-prd` session still requires a document in the body and ignores it. The plan's guard order puts every refusal before `mkdirSync` and the resume read after it, so this is by construction; the report names #288's package view as the home for a resume that asks for nothing. Consequence worth knowing: a `documentPath` file moved after session start blocks the drawer's "Start or resume" on an otherwise intact package.
- `documentPath` resolved against `REPO_DIR` and accepted outside the repo, as `reads` is. The route comment and the plan both state it as the operator's trust boundary; the portal is loopback-only behind the origin guard.
- Six `prd.md` files compared, not seven. `spine-meridian-1` has never had one (observed).

## Validation

| Gate | Result | Provenance |
|---|---|---|
| `node tooling/build-checks.mjs` | `build ✓ all 34 groups pass`, exit 0 | observed, this tree |
| `node tooling/drift-check.mjs` | `drift-check ✓` (12 checks), exit 0 | observed |
| `node tooling/token-lint.mjs` | `63 contract tokens · 0 undeclared · 0 orphan · DTCG valid`, exit 0 | observed |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓ all 8 rows pass, zero tokens`, exit 0 | observed |
| `node --check` on the seven source files | all ok | observed |
| CI `verify` · `visual` | both pass (run 33863633175) | observed, `gh pr checks` |
| Think's stamps | `7efdde37441fbd2591ba4a7dfeecdb6b` · `cadb38117a2660c036d87e32323a8745` reproduce | observed, direct import |
| Seven committed packages | every `run.json` resolves through `resolvePosture({ posture, model })` to the posture object by identity; stamps: four carry `7efdde37`, `graded-opus-a` carries `cadb3811`, `allergen-matrix-1` carries `df6fbc35` (pre-#347, not gate-compared), `spine-meridian-1` none | observed |
| Six committed `prd.md` | byte-identical via `--stdout \| diff -q` | observed |
| Mutation 6 (fingerprint join reordered) in a throwaway worktree | red by name: 30.30 `Think's stamps are 5ad55180 / 56ccf78d`, 32.2a `the Think prompt surface changed`, 33.15 twice; restored, worktree removed | observed |
| Mutation 2 (document text into the audit turn prompt) | red by name: 30.32 `the document text reached the TURN prompt`; restored | observed |
| Task 17 comments on #288 and #292 | posted 2026-09-04T10:31Z naming PR #369 | observed |
| The six audit turns, the Create PRD turn, `--probe-audit` × 2 | **not run** (API usage limit until 2026-10-01); the PR says so | not observed, owed (F3) |

`13 files changed, 1728 insertions(+), 93 deletions(-)` matches `git diff --stat origin/main..HEAD` (observed). The report's nine-row mutation table: two rows re-observed above, seven taken as the author's observation.

## What is good

- Think's surface is proven unchanged three ways: the literal pinned in 30.30, the recordings compared live in groups 32 and 33, and the copied blocks byte-identical rather than shared. The mutation that reorders the join takes all three red together, which is the tripwire the ticket leans on, and it fires.
- The audit is answer-by-reference applied unchanged: one server-written `kind: "document"` line, every verdict one of the four existing verbs, no fifth verb, no read tool, `MAIN_TOOLS` still `[]`. The applier is kind-agnostic (the agent confirmed `applyOp` never reads `kind`), so nothing in `discovery/ops.mjs` moved.
- Every new refusal is named and driven: nine `openSession` shapes in case 16, the tables both ways in 30.33, the wrong answer kind refused in both directions in 30.32, and the audit cursor proven never to hold against a blank-idea positive control on the same transcript.
- `resolvePosture` returns the posture by identity on its own model, so a pre-#286 package stamps exactly what it was recorded under; the override path recomputes over both of Grill's templates, and 30.32 proves the audit template is inside the stamp by moving each template alone.
- The projection renders the document by kind, never by length, and 31.14 proves the same text as a banked answer still blockquotes.
- The PR body separates observed from blocked and says what is owed and under which protocol.

## Recommendation

Approve. Fix F1 and F2 in the report and PR body (wording only), open the follow-up issue for F3 before or at merge, leave F4 for the next case 16 edit. The review file is written but not committed; it belongs on this branch with the plan and the report.
