# PR #322 review — spike(280): op transport, the in-process SDK tool wins

**Head** 7f664f6 · **Base** main @ `817ea9fb931bef1032873d6d4a02e161f5fd9134` · **Round** 1 · 2026-08-28
**Recommendation: Approve** (posted as a comment — the reviewer cannot formally approve the author's own PR). No Critical or High findings. Two Medium prose-accuracy fixes are worth a commit before merge; the verdict itself stands.

## Summary

The spike answers its question with observed output, the shipped script is byte-identical to the plan's Task 2 block, every gate is green on re-run, and the dependency change is exactly the declared peer. What needs tightening is wording in the write-ups: two claims read stronger than what the run observed (the fence, the CLI version), and a handful of citations point at the wrong line or file. Nothing changes the branch taken.

## Validation (all observed in `../ux-factory-wt-280` at 7f664f6)

| Gate | Result |
|---|---|
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay (7.8 s) |
| `node tooling/build-checks.mjs` | ✓ all 27 groups pass |
| `node --check spike-1-op-transport.mjs` | ok |
| `spike-1-op-transport.mjs --preflight` (zero tokens, re-run) | P1–P6 all `true` |
| `cd portal && npm ls zod @anthropic-ai/claude-agent-sdk` | `zod@4.4.3` direct + deduped under `@anthropic-ai/claude-agent-sdk@0.1.77` |
| `PORT=4799 node portal/server.mjs` → `/api/health` | `{"ok":true,"hasToken":false,…,"cards":8}` |
| CI at 7f664f6 | `verify` SUCCESS · `visual` SUCCESS (mergeState UNSTABLE has no failing status behind it; `main` is unprotected) |
| Scope | no file under `system/`, `agent-layer/`, `discovery/`, `tooling/`, `traces/`, `replay/` in the diff |
| Script vs plan | `spike-1-op-transport.mjs` diffed against plan lines 276–475: zero diff |
| Lock diff | root `dependencies` entry + removal of `"peer": true` on the existing zod entry; no SDK bump, no new transitive |

## The numbers pass

| Figure | Where claimed | Provenance |
|---|---|---|
| `num_turns` 4 · `duration_ms` 12243 · `total_cost_usd` 0.09224315 | PR body, README, verdict | observed — `run-1.txt:17`, `:30-32` |
| `works: true`, B1–B7 true, I1 yes | PR body, README | observed — `run-1.txt:21`, `:237-246` |
| P1–P6 true | PR body, README | observed — `preflight.txt:4`; re-observed by the reviewer |
| `elapsedMs` 14188 | README | observed — `run-1.txt:27` |
| SDK 0.1.77 · zod 4.4.3 · node v20.20.2 | README, verdict | observed — `run-1.txt:22-26` |
| spike C `$0.16` / 7.8 s | README:69 | observed — `design-import-spike-c/12-sdk-reach-output.txt:6` (0.164), its README:14 |
| #203 dry run `$0.45` | README:69 | observed — `studio-replay-recorder-203-report.md:145` (0.447) |
| gate "13 s, exit 0, 15:22:47Z at 7f664f6" | PR body | commit is 15:20:57Z; the gate ran two minutes after it — consistent |
| `CLAUDE.md:150,153` exactly | PR body | observed — the two diff hunks |
| **CLI 2.1.245** | README:23, :98 | **not observed by the run** — see F2 |
| **pid 85297 in the pre-flight** | README:42 | **wrong file** — see F3 |

## Findings

### Medium

**F1 — the fence claim: consultation was shown, enforcement was not.**
`README.md:14` (Q3 "Both, on every call"), `discovery-spike-1-verdict-280.md:62-64` ("neither half is redundant"), the PR body ("so #287's two-place fence does not rest on the hook alone") and the posted #279 comment. B4/B5 record that `canUseTool` and `PreToolUse` were *consulted* for the MCP call — all three calls were the one allowed tool (`run-1.txt:204-215`), so neither half's deny branch ever executed (`spike-1-op-transport.mjs:144`, `:150`). Whether a `deny` from either half actually blocks an MCP call is unobserved; #203's spike saw real denials, but for built-in tools. A #287 planner reading "does not rest on the hook alone" could take canUseTool's deny as load-bearing for MCP tools. Fix: one caveat sentence in README Q3 and the verdict's "Both fence halves" bullet ("consulted on the allow path; no deny branch was exercised — #287 must not read a blocked MCP call as shown"), and patch the #279 comment (`gh api -X PATCH repos/linardsb/ux-factory/issues/comments/5454315848 -f body=@…`). No re-run needed; #284's first fenced run will exercise deny for free.

**F2 — "Claude Code CLI 2.1.245 on this Mac" names a binary the run did not use.**
`README.md:23`, `:98` ("one CLI version (2.1.245)"). The figure is not in `preflight.txt` or `run-1.txt` (the script's `versions` captures only sdk/zod/node, `spike-1-op-transport.mjs:37`) and the README's own rule is "every number below is copied … nothing is typed from memory". `query()` sets no `pathToClaudeCodeExecutable`, so it ran the SDK-bundled `cli.js`, which reports **2.0.77** (observed: `node portal/node_modules/@anthropic-ai/claude-agent-sdk/cli.js --version`); 2.1.245 is the global `claude`. As written, the bound on the verdict names the wrong version. Fix: replace both mentions with "the SDK-bundled CLI 2.0.77 (`cli.js --version`)" and drop the "on this Mac" framing, or log it from the script on the next run.

### Low

**F3 — two citations point at the wrong evidence.** `README.md:42` (P2 row) cites pid 85297 against `preflight.txt:48-55, :91-108`; `preflight.txt` records pid **85255** (`:109`, `:117`) — 85297 is the run file's embedded pre-flight. `README.md:12` cites `run-1.txt:7,11` for the pid; those lines are handler log lines without a pid (it is at `:144` and `:188`). The in-process claim holds in each file on its own; the citations do not.

**F4 — which rows gate `works` is stated only in the plan.** `spike-1-op-transport.mjs:189-191` gates on P1–P5 + B1/B2/B3/B7; P6, B4, B5, B6 are informative. The rationale (Q4: either answer is acceptable) is in the plan's NOTES, not in the README, the verdict or the #279 comment that #284/#287 read. All 13 rows were true this run so nothing is hidden, but one sentence under "The bar" would stop a future reader assuming a red B4 flips the verdict.

**F5 — P1 tests cardinality, not values.** `spike-1-op-transport.mjs:101` checks `enum.length === 4` and `required.length === 3`, never the members. A schema advertising four wrong enum values would pass P1. Matters because the pre-flight is the stated tripwire for a future SDK bump (README:98-100). Fix: compare the arrays to `LEVELS` and `['question_id','answer_ref','level']`.

**F6 — the retired claim survives in two live doc lines.** `docs/epics/canvas-design-import.architecture.md:93` still reads "`zod` only if #280's verdict is the in-process tool" (decided at line 195 of the same file, edited by this PR); `docs/epics/generative-prototyper.architecture.md:52` states "the portal's sole dependency `@anthropic-ai/claude-agent-sdk`" as a live fact. `discovery-partner.architecture.md:102` quotes the old wording as the thing amended — that reads as history and is fine.

### For the owner

**Q1 — `CLAUDE.md:150` and `:153` now both carry the zod scope clause.** Documented deviation (plan Task 7, flagged in the verdict), so not a finding — but it is the "second copy that silently drifts" pattern the Ground rules warn against two bullets up. Recommendation: keep the scope on line 150 (the dependency rule) and reduce 153 to "no schema library for validation … (the one `zod` import is the SDK's tool-schema adapter — see the dependency rule)". Either wording is acceptable; pick one owner.

## What is done well

- The pre-flight/run split: the deterministic half re-observes the cross-copy zod mechanism on every invocation at zero tokens, and the run proves only what the pre-flight cannot. This is the right answer to the "check that cannot fail" class.
- Evidence citations are line-precise and, F3 aside, all resolve; the committed outputs are consistent with the shipped script line by line (including the absent `handler:` line between `run-1.txt:14` and `:15`, which is the empirical form of "schema layer before handler").
- Script equals plan verbatim; the dependency amendment is exactly the plan's Task 6/7/8; "not done, by design" is accurate against the diff.
- Q1 and Q4 surfaced honestly rather than resolved silently.

## Recommendation

**Approve.** F1 and F2 are five-minute prose fixes and the #279 comment patch; do them in this PR so the verdict #284/#287 inherit is exactly what was observed. F3–F6 at the author's discretion. Q1 is the owner's call at merge.
