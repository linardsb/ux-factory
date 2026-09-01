# PR #344 review — subagent warmup calls no longer recorded as the agent's refusals (#343)

**Head** 7017025 · **Base** main @ `6ae6939037f4a7d6903d95cb780b786905be71db` · round 1 · 2026-08-31

**Verdict: APPROVE** — no critical/high findings, all gates green, the fix matches the ticket's
intent, every deviation (D1–D6) is documented in the report. Two findings below for triage
(`piv-fix-review-findings`); neither blocks merge on its own.

## Findings

### F1 (medium) — `PostToolUseFailure` can silently drop a genuine discovery-agent refusal

`portal/lib/discovery.mjs:253-257`

The PreToolUse branch is safe by construction: `allowsToolName` runs first, so the main-session
model (advertised only the four op tools) can never reach its record branch — only warmup calls
can, and suppressing those is the fix.

`PostToolUseFailure` has no such precheck. It records gated **only** by `mainSession()`, and it is
the record point for the run's *legitimate* `denied` lines — applier refusals on the four allowed
op tools (PF5/PF7's shape, the in-turn parent corrections that group 32 counts from denied lines).
If such a refusal lands while a warmup bracket is open (`subagents.size > 0`), the receipt is
dropped permanently and silently — no line, no stderr. The window is real: on the fixture the
warmup sidechains were still in flight ~7s after CLI start (opened 11:21:27, their denials stamped
11:21:34), which is inside an early turn's working time. The closing comment's "under `tools: []`
the main session has nothing to suppress" is true for PreToolUse only; this hook is exactly what
the main session *does* have to suppress.

**Fix (either):** gate this hook's `record()` by `allowsToolName(input.tool_name)` — a genuine
discovery-agent refusal is always on an op tool, a warmup failure never is (a CLI-builtin warmup
agent has no business calling the private in-process `mcp__discovery__*` server); or, minimally,
write a stderr breadcrumb when a denial is suppressed, so a violated ordering assumption is
observable rather than invisible. The stronger form also removes this hook's dependency on the
unobserved SubagentStart-before-first-PreToolUse ordering (the report's own stated residual risk).

### F2 (low) — stale cross-file fact left by the move

`portal/lib/discovery-postures.mjs:179-180` — "the fence's deny text (denyReason, the
**transport's**)" — `denyReason` moved to `discovery.mjs` in this PR. One-word fix:
"the transport's" → "discovery.mjs's". The file is otherwise correctly untouched (fingerprint
surface), and this comment is outside the hash.

## Validation (all observed, this machine, 2026-08-31)

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓  all 32 groups pass`, exit 0 |
| `node tooling/drift-check.mjs` | ✓ all twelve stations |
| `cd portal && node lib/discovery-transport.mjs --preflight` | `pre-flight ✓  all 8 rows pass, zero tokens` |
| Mutation test (reviewer-run) | guard `if (mainSession())` removed in a throwaway worktree → group 30 red with **exactly the 7 case-20 failures the report quotes**, first at "inside the bracket (disk 3, heard 3)"; worktree discarded |

## Numbers pass — every load-bearing figure re-observed

- 7 exact `CLAUDE_CODE_REMOTE` uses in cli.js (`grep -o`, suffixed variants excluded) ✓
- Fixture t12: 3 denied lines — Bash `pwd`, Bash `ls -la …`, Glob `**/*.{ts,js,json,md}` — all
  stamped `11:21:34.745Z` ✓; transcript unedited (honesty contract) ✓
- 72 `agent-*.jsonl` sidechains in the fixture's project dir, every one opening with `"Warmup"`;
  4 carry a `tool_use` ✓ ("1 in 6" for Explore is derived, labelled as such)
- Main session's only `tool_use` name: `mcp__discovery__record_decision` ×12 ✓
- Probe project dir (`…discovery-probe-PeP5kJ`): 3 sidechains, each `user Warmup` at 15:33:40.33x,
  `tool_use=0` — the PR body's caveat is exactly right ✓
- Probe cost/turns/fingerprint: from the paid run's output, not re-observable; fingerprint
  `df6fbc35` independently confirmed unchanged by group 32's green run ✓

## What's good

- The premise correction is model verification work: the ticket's step 1 mechanism was proven
  absent from the installed SDK before being replaced, with the evidence cited to cli.js symbols.
- Case 20 runs the real hook functions against the real writer over a temp root, asserts the exact
  registered-event key set (pinning `PostToolUse` absent), and checks disk + listener after every
  step — and the mutation test proves it can fail.
- The report's caveat section states precisely what the paid probe did not observe instead of
  letting a green run overclaim. Step 2 dropped by the ticket's own rule, with the six extra flag
  effects enumerated.
- Import hygiene clean: no stale `deniedLine`/`toolNameFor` imports, no dangling references to the
  old transport-local fence (reviewer-agent grep).

## Recommendation

Merge after triaging F1 — the strong form is a two-line change plus one case-20 assertion; F2 is a
one-word comment fix that can ride along. Neither invalidates anything shipped in this PR.
