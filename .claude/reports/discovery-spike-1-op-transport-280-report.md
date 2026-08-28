# Implementation Report — Spike 1: op transport (#280)

**Plan**: `.claude/plans/discovery-spike-1-op-transport-280.md`
**Branch**: `spike/280-op-transport` (worktree `../ux-factory-wt-280`, cut from `origin/main` at 817ea9f)
**Status**: COMPLETE

## Summary
Built one throwaway script carrying an in-process MCP server with a single stub tool
(`record_stub(question_id, answer_ref, level)`), ran its zero-token pre-flight (the bundled `McpServer`'s
own handlers called directly) and then one real `query()` run. **Verdict: the in-process tool works end
to end at SDK 0.1.77, first run** — `works: true`, P1–P6 and B1–B7 all true, I1 yes, $0.092, 12.2 s
(`run-1.txt`). The decision rule's tool branch was taken: `zod` declared in `portal/package.json`,
CLAUDE.md's dependency line (and, scoped, its "no schema library" line) amended, both architecture docs
pointed at the verdict, and the verdict posted on epic #279
(https://github.com/linardsb/ux-factory/issues/279#issuecomment-5454315848).

## Tasks completed
- Task 1 worktree + branch + `npm ci` → `../ux-factory-wt-280` on `spike/280-op-transport` (CREATE)
- Task 2 the spike script → `.claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs` (CREATE, 200 lines, `node --check` clean)
- Task 3 pre-flight + one run → `.claude/plans/discovery-spike-1-op-transport/preflight.txt`, `run-1.txt` (CREATE, verbatim output; no `run-2.txt` — none needed)
- Task 4 write-up → `.claude/plans/discovery-spike-1-op-transport/README.md` (CREATE)
- Task 5 decision → tool branch (rows P1–P5 + B1/B2/B3/B7 all true; the peer read as acceptable per the plan's A3)
- Task 6 dependency → `portal/package.json`, `portal/package-lock.json` (UPDATE: `zod@^4.4.3` as a direct dep; the lock moves the entry from `peer` to root deps; SDK stays 0.1.77)
- Task 7 → `CLAUDE.md` lines 150 and 153 (UPDATE, one sentence each)
- Task 8 → `docs/epics/discovery-partner.architecture.md` lines 105 and 334, `docs/epics/canvas-design-import.architecture.md` line 196 (UPDATE, one sentence each)
- Task 10 verdict → `.claude/reports/discovery-spike-1-verdict-280.md` (CREATE) and posted on #279
- Task 11 this report (CREATE)
- Task 12 gates + scope assertion (below)
- Task 13 commit + PR: next (`piv-commit` → `piv-create-pr`, body carries `Closes #280`)
- The plan file itself is staged on this branch (it was untracked in the main checkout).

## Tests added
No suite (CLAUDE.md). The spike's two stages are the test:
- Pre-flight (`--preflight`, zero tokens): P1 schema shape · P2 filed in this pid · P3 JSON null · P4 handler `isError` on a bad ref · P5 schema refusal before the handler · P6 missing field refused → all `true`, exit 0 (`preflight.txt:4`, `:134-139`).
- Run (one `query()`): B1 tool visible + server connected · B2 handler in this pid resolved `a1` · B3 refusal reached and quoted by the agent · B4 `canUseTool` consulted (3/3) · B5 `PreToolUse` fired (3/3) · B6 no built-ins under `tools: []` · B7 `success` → all `true`; I1 `yes`; `works: true`, exit 0 (`run-1.txt:21`, `:237-246`).

## Validation results
- `node --check .claude/plans/discovery-spike-1-op-transport/spike-1-op-transport.mjs` → pass.
- `node tooling/drift-check.mjs` (after staging) → ✓ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay. First attempt failed at the Style Dictionary step because the fresh worktree had no `tooling/style-dictionary/node_modules` (environment, not drift); `npm ci` there, then green.
- `node tooling/build-checks.mjs` → all 27 groups pass.
- `cd portal && npm ls zod @anthropic-ai/claude-agent-sdk` → `zod@4.4.3` direct + deduped under the SDK, SDK 0.1.77; `node server.mjs` boots and `/api/health` answers `{"ok":true,…,"cards":8}`.
- `grep -n zod CLAUDE.md` → exactly two hits, lines 150 and 153.
- Scope assertion → `scope ok` (nothing under `system/`, `agent-layer/`, `discovery/`, `tooling/`, `traces/`, `replay/` in the staged diff).
- `gh issue view 279 --json comments --jq '.comments[-1].body' | head -3` → the verdict heading.

## Deviations from the plan
- **No fallback fired.** The plan anticipated one deviation (a `tools: []` or schema fallback). Neither was needed: `tools: []` was honoured (B6) and the schema half was green in the pre-flight. Recorded so the reviewer does not look for one.
- **Worktree cut from `origin/main`, not from the checkout's branch.** The main checkout was on `feature/discovery-bank-282` (another ticket's branch, with its untracked `discovery/` work in the tree), so the plan's Task 1 worktree was the right isolation; the untracked plan file was copied into the worktree so it rides in this PR.
- **Two findings beyond the bar, carried into the verdict for #284/#287:** (a) handler refusals and schema-layer refusals both surface on `PostToolUseFailure`, not `PostToolUse` — a transcript recorder must listen on both; (b) `canUseTool` *is* consulted for an MCP tool absent from `allowedTools` (Q4 answered: consulted), so #287's two-place fence is not resting on the hook alone.
- **Q1 (CLAUDE.md:153)** amended with a scoped exception as the plan proposed; flagged in the verdict for the owner to confirm at review.

## Issues encountered
- `drift-check` needs `tooling/style-dictionary/node_modules` in a fresh worktree — the same gap memory `local-agent-visual-gate-notes` records for `portal/` and `visual-regression/`. Not a code change.
