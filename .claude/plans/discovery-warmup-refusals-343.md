# Fix: subagent warmup calls recorded as the agent's refusals (#343)

Epic #279 · ticket #343 · branch `fix/343-warmup-refusals` off `origin/main` (PR #342 merged before this
plan was written, so the branch is off `main` directly). Plan written before any code edit.

## The bug

Every discovery turn is a fresh SDK `query()` (`portal/lib/discovery-transport.mjs`) with `tools: []`
and a PreToolUse fence hook that denies any tool outside the four op tools and writes a `denied` line
into `transcript.jsonl`. On every CLI start Claude Code pre-warms its built-in Explore, Plan and Bash
agents with a "Warmup" prompt (`cli.js` `p$9`, gated only by `CLAUDE_CODE_REMOTE === "true"`); Explore
runs `pwd` / `ls` / `find` / Glob on the cwd. Those calls hit the fence and were recorded as the
discovery agent's refusals: 3 on `discovery/instrument-loans-1` t12, 15 on `allergen-matrix-1`
(untracked), 17 on the jobs-folder run.

**Observed for the fixture (2026-08-31):** three `agent-*.jsonl` sidechains opened at 11:21:27.05 (the
three warmup agents); `agent-aec09c5.jsonl` carries 3 `tool_use`; the transcript's three `denied` lines
land at 11:21:34.745; the main session file (`sessionId` in `run.json`) has no line in that second and
its only `tool_use` name is `mcp__discovery__record_decision` (×12). The warmup Bash results in the
sidechains carry **our** `denyReason` text as `is_error: true` — the fence is what denies them.

## Premise correction — the ticket's step 1 cannot be built as written

The ticket says the hook input's `transcript_path` names a sidechain by an `agent-` basename. In the
installed SDK (0.1.77, bundled CLI 2.0.77) it does not: `executePreToolHooks` (`AM0`) builds its input
as `{...WE(permissionMode), tool_name, tool_input, tool_use_id}` and `WE(A, Q)` sets
`transcript_path: Es(Q ?? q0())` — `q0()` is the global session id, shared by every sidechain (their
files carry the main `sessionId`). `lk(agentId)` → `agent-<id>.jsonl` enters a hook input in exactly
one place: `SubagentStop`'s `agent_transcript_path`. The `hook_callback` control request forwards the
input unchanged. So `session_id`, `transcript_path` and `cwd` are the MAIN session's for a warmup call
too; nothing on a PreToolUse input identifies the caller.

What does identify it: the `SubagentStart` hook (`MO0(agentId, agentType)`) is awaited inside the Agent
tool's `call` before the sub-loop runs, and the warmup calls that same tool (`Ts.call`); `SubagentStop`
fires with `agent_id` at the end. `eG7` merges SDK-registered hooks (`RuA()`) before it consults app
state, so both are delivered with no `toolUseContext`. **The fix brackets denials between them.**

## Step 2 (CLAUDE_CODE_REMOTE) — dropped

`cli.js` has 7 exact uses. Beyond `p$9`, the flag: flips the telemetry field `isClaudeCodeRemote`;
alters an auth-source check (`!G0(process.env.CLAUDE_CODE_REMOTE)` on the `ANTHROPIC_API_KEY` /
`apiKeyHelper` branch); disables `EnterPlanMode` and `ExitPlanMode`; enables `bash_progress` events;
sets `NODE_OPTIONS --max-old-space-size=8192`. The ticket's rule is explicit: any effect beyond the
warmup drops the step. Dropped.

## Tasks

1. **`portal/lib/discovery.mjs`** — move `denyReason` and `fenceHooks` here (SDK-free, plain objects
   and async functions in the SDK's `hooks` shape). Add `SubagentStart` (add `agent_id` to a set) and
   `SubagentStop` (delete it); PreToolUse and PostToolUseFailure record a `denied` line only while the
   set is empty, and PreToolUse denies either way. Correct the BOUNDED CLAIM above `allowsToolName`
   (the same false "nothing left to deny" sentence). → verify: `node --check`, group 30 green.
2. **`portal/lib/discovery-transport.mjs`** — import both; delete the local fence section (its BOUNDED
   CLAIM with it) and leave a pointer; `probeParenting` reads the on-disk transcript's `denied` tools
   before the root is deleted and the CLI prints the count, so the paid check is observable.
   → verify: `--preflight` 8 rows.
3. **`tooling/build-checks.mjs` group 30, case 20** — run the four hook functions in the CLI's order
   over a temp root: main-session denial recorded once with `denyReason`'s text; three agents start;
   Bash, Glob and a PostToolUseFailure inside are denied and unrecorded; two stops of three leave the
   bracket open (a set); the last stop records again; an applier refusal verbatim; every op tool
   passes; junk bracket events harmless; `PostToolUse` pinned absent. Correct 30.14's comment.
   **Mutate first:** land the move with the guard ABSENT, run the gate, record the red; then add the
   guard. → verify: red run captured in the report, then all 32 green.
4. **`discovery/README.md`** — define a `denied` line as the discovery agent's own call refused in the
   main session; state what is not one (the warmup) and that packages recorded before #343 carry those
   lines (`instrument-loans-1` t12 ×3); no transcript is edited. → verify: read back.
5. Report `.claude/reports/discovery-warmup-refusals-343-report.md`; commit (explicit paths only —
   the tree holds another session's untracked files); PR with `Closes #343`.

## Verification

- `node tooling/build-checks.mjs` — 32 groups green (observed output in the report).
- `node tooling/drift-check.mjs` — CI verify's step; nothing generated is touched, `loc-summary`
  counts shipped groups only (#341's portal/tooling edits did not move it).
- `cd portal && node lib/discovery-transport.mjs --preflight` — 8 rows.
- `cd portal && node lib/discovery-transport.mjs --probe-parenting` — ONE paid turn (~$0.10):
  `PARENTED`, `denied lines on the temp root's transcript: 0`, no Bash or Glob named.

## Not touched

`portal/lib/discovery-postures.mjs` — fingerprinted prompt surface; an edit forces a ~$0.60 re-record
of `instrument-loans-1`. The fence's deny text is outside the hash (README §The fingerprint tripwire)
and it does not change anyway. No `transcript.jsonl`, `answers.jsonl` or `run.json` is edited.

## Risks

- R1 If the CLI fires a warmup agent's first PreToolUse before its `SubagentStart` reaches the SDK,
  a line would still land. From source the start hook is awaited before the sub-loop; the probe is
  the run-time observation, once.
- R2 A `SubagentStop` that never fires leaves the set non-empty for the rest of THAT turn's query()
  only (the state is per `fenceHooks` call); under `tools: []` the main session has nothing to
  suppress.
- R3 A later SDK could add `agent_id` to PreToolUse inputs; the bracket keeps working, and the
  transport's header caveat about newer SDKs already covers the re-observation.
