# PR #406 review — run 2, the pre-grill audit (#292)

**Head** `0e27afb` · **Base** `main` @ `d0e65fa0974762c2ef57259fd163a073376e6980` · **State** OPEN, `mergeStateStatus CLEAN` · **Round** 1 (no prior report, guarantees pass not triggered)

## Summary

A recorded, scored discovery run plus its harness: `discovery/partner-audit-2/` (server-written package), `tooling/run-2-ready.mjs` (six-check pre-run gate), two `build-checks` pins (30.46 Grill-on-Opus, 32.7's fourth row), a pre-registered rubric, probe receipts, and the README and gates.md prose. Every figure in the PR body and the implementation report was re-derived from the committed `run.json` and `transcript.jsonl` in a clean worktree at `0e27afb`; all of them hold. The committed `prd.md` is byte-identical to a fresh projection. The rubric's commit predates `startedAt` by twelve minutes in git history. The itemised 0/8 score was spot-checked against the transcript: the three PARTIAL quotes exist verbatim, and no transcript line carries the nouns the five MISSED findings hinge on.

**Recommendation: approve.** No critical or high issues. Two low doc-accuracy items below, neither blocking.

## Issues

### Low

- **L1** `.claude/references/gates.md` fence-probe entry and `discovery/README.md:1004-1010` — the probe's "run 2's shape" allows the fixture (`reads: [fixture]`, visible in the receipt's allow-set: `run-a, bank, …pre-grill.md`), while the real run-2 allow-set since #286 is `reads: []` with the fixture DENIED (what `run-2-ready` check 3 asserts). The evidence still transfers: the key is not under the fixture path, so a deny on the wider set implies a deny on the narrower one. But the label "run 2's shape" now names a shape run 2 no longer has. Fix: one clause in the gates.md entry saying the probe's shape is the pre-#286 one and strictly wider than the run's own set.
- **L2** `.claude/reports/discovery-pre-grill-audit-run-292-report.md` §Tasks completed, T5 — "13 lines, 3 `PreToolUse.deny`". The trace holds 3 deny events, of which 2 are `PreToolUse.deny` and 1 is `canUseTool.deny` (turn B). Count right, label wrong; nothing downstream reads it.

## The numbers pass

All observed in the worktree at `0e27afb` unless marked derived.

| Claim (PR body / report / README) | Re-derived | Holds |
|---|---|---|
| 23 turns, 23 `turnStats`, all `ok` | 23 / 23 / 23 | yes |
| $1.6152, mean $0.0702 | Σ costUsd 1.6152; /23 = 0.0702 (derived) | yes |
| tokens 110 / 29,450 / 1,911,281 / 65,153 | inputTokens 110 · outputTokens 29,450 · cacheReadTokens 1,911,281 · cacheCreationTokens 65,153 | yes |
| elapsed 656 s | `endedAt − startedAt` = 656,269 ms (derived) | yes |
| latency 7,243 / 16,479 / 31,591 | sorted durationMs min / 12th / max | yes |
| all warm, longest gap 171 s | max(`ts − durationMs` − prev `ts`) = 171 s; 0 gaps > 300 s (derived) | yes |
| one stamp `ba124c3c…` | one distinct `postureFingerprint` | yes |
| 81 transcript lines: 47 text · 32 op · 2 denied | 81 / 47 / 32 / 2 | yes |
| ops 7 decision · 9 evidence · 16 flag · 0 open_question | 7 / 9 / 16 / 0 | yes |
| two `denied`, both `record_decision`, t9 and t17 | yes, both `evidence_refs` naming a future seq | yes |
| t21 `Credit balance is too low` text line, no turnStats | t21 holds 4 lines: text (10:31:35Z) · text · op · text (10:34:2xZ); turnStats has 23 | yes |
| `completion {23,23,true,23}` · `weak.flagged 16` · `notAForm.tripped false` · `askedWhatMattered.modules ["hasModel"]` · tail 1 of 11 | `sessionView` metrics identical | yes |
| `auditTraceability` unbacked 0 of 7, unrooted [14, 26], parenting eligible/missed [] | identical | yes |
| 9 evidence rows, `url: null`, 7 fictional-scenario · 1 assumption · 1 secondary-source | identical | yes |
| wrong-if 7 PARAPHRASED · 0 QUOTED · 0 AUTHORED | receipt totals `{QUOTED:0, PARAPHRASED:7, AUTHORED:0}` | yes |
| the falsifier sentence in seq 4, 8, 19 | present in all three `wrong_if` params (8 and 19 extend it) | yes |
| fixture md5 `ab6eb0ee…`, 24,560 bytes, 24,355 chars | `md5 -q` and `wc -c` on disk; `sessionView().document` | yes |
| rubric `4a74848` at 10:12:06Z, `startedAt` 10:24:03Z | `git log %cI` 11:12:06+01:00; run.json | yes |
| probe costs $0.1926 · $0.1136; ticket spend $1.9214 | receipts; 0.1926 + 0.1136 + 1.6152 = 1.9214 (derived) | yes |
| `prd ✓ 12 sections, 32 ops`; prd.md the projection's bytes | `--stdout` output `cmp` equal to committed `prd.md` | yes |
| model `claude-opus-5`, `existing-prd`, `full-discovery`, `terminal`, `fictional`, `reads []` | run.json | yes |

**The score (AC #2).** Verified against the transcript, not re-scored: seq 20, 22 and 31 `missing[]` entries quoted in the report exist verbatim. Grep over all 81 lines for the MISSED findings' anchor nouns — transition, MVP 7, n/a, CXO, STARS, prefix, existing-prd, "in order", Stage 10, organisation, ~30, thirty, parity, MVP 2 — returns zero hits for every one. The 7 "scoring key" hits and 2 "dogfood" hits were read: none states the level mismatch (finding 1) or that the sole planned run cannot fire the module (finding 4), so both stay PARTIAL by rubric rule 3. Finding 6's seq 31 line names neither MVP 2 nor parity, so the PARTIAL stands and is correctly flagged as the one movable verdict.

**`frontEnd: terminal`** — sanctioned by the plan (`.claude/plans/discovery-pre-grill-audit-run-292.md:454-455`, §The API loop), same routes and server. Not a deviation.

## Validation

Run in a clean detached worktree at `0e27afb` (`/Users/Berzins/Documents/wt-review-406`), with `node_modules` symlinked for `tooling/style-dictionary` and `portal`; the portal smoke ran in the main tree, whose `portal/` is untouched by this PR.

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 34 groups pass` (observed) |
| `node tooling/drift-check.mjs` | `drift-check ✓  syntax · token-css · … · group-count` (observed) |
| `node tooling/token-lint.mjs` | `token-lint ✓  63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | `loc summary ✓  3 groups — no drift` (observed) |
| `node discovery/prd-projection.mjs partner-audit-2 --stdout` vs committed | byte-identical (observed) |
| `node tooling/run-2-ready.mjs --model claude-opus-5` | red on check 5 by design (run.json exists) (observed) |
| portal on `PORT=4799`, `/api/health` | `{"ok":true,…,"bootSha":"0e27afb…","stale":false}` (observed); killed by PID |
| CI on head: CodeQL · audit · codeql · gates-green · verify · visual | all pass (observed via `gh pr checks`) |

Working-tree caveat: the shared tree carries another session's uncommitted edits to `agent-layer/gen-decisions.mjs` and `docs/epics/discovery-partner.{prd,architecture}.md`; none are in this PR and the gates above ran on the committed tree, not on them.

## What is done well

- **Pre-registration is mechanical, not narrated.** `run-2-ready` check 2 refuses on tracked-but-uncommitted and on a working-tree edit to the rubric, and prints both `%cI` and `%aI` so a rebase merge cannot erase the timestamp. Each of the six checks was reddened and the mutation named in the report.
- **The two pins derive their carriers.** 30.46 and 32.7 read the stamp off the packages on disk and resolve the expected value through `resolvePosture`, so a Grill prompt edit fails naming `partner-audit-2 (23 turns)` rather than a typed count that rots.
- **The credit-stop line stays.** The append-only rule was kept under pressure; the README names it as a scar, with the cause and the resume, rather than quietly re-recording.
- **The honesty framing on the score.** "A reading of this pairing, never of the design alone" is carried in the PR body, the README and the report, and the low number is reported as low.

## The code-reviewer agent's pass

Independent of the pass above (fresh context; its report at `.agents/code-reviews/agent-reviews/pr-406-review.md`). It found 0 critical / high / medium. It mutation-tested `run-2-ready` live — an appended byte on the fixture, a changed `MAIN_TOOLS` pin, a bogus `--model` — and each check went red by name; every file was restored byte-identical (`git status` on the touched paths is clean, observed). It recomputed both pinned fingerprints and confirmed the 23 stamped `turnStats`, dense seq 1–32 with monotonic timestamps, and the byte-identical `prd.md`. Its one Low — that the README's "171 s" longest interval did not reproduce — is withdrawn here: the report names its anchor (`ts − durationMs` against the previous `ts`) and that anchor gives exactly 171 s.

## Recommendation

**Approve.** L1 and L2 are documentation-accuracy items that can land in a follow-up or with #293.
